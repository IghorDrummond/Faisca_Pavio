import { EventBus } from './eventBus';
import { Logger } from './logger';
import { SettingsService } from './settings';
import { Sequencer } from './sequencer';
import type { SongDef } from '../data/music';

export type Bus = 'music' | 'sfx' | 'voice' | 'ambient';

interface PlayOpts {
  bus?: Bus;
  volume?: number;
  /** variação de pitch (±, fração) — padrão 5% */
  pitchVar?: number;
  rate?: number;
  /** prioridade 0..3 (3 = dano/aviso: nunca cortado) */
  priority?: number;
  loop?: boolean;
  pan?: number;
}

interface Voice {
  key: string;
  src: AudioBufferSourceNode;
  gain: GainNode;
  priority: number;
  start: number;
}

const MAX_VOICES = 28;
const MAX_PER_KEY = 4;

/**
 * Serviço de áudio (Web Audio). O AudioContext só é criado/desbloqueado por um gesto do usuário
 * (política de autoplay); nenhum som tenta tocar antes disso.
 */
class AudioServiceImpl {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses = new Map<Bus, GainNode>();
  private musicFilter!: BiquadFilterNode;
  private raw = new Map<string, ArrayBuffer>();
  private buffers = new Map<string, AudioBuffer>();
  private decoding = new Map<string, Promise<void>>();
  private voices: Voice[] = [];
  private loops = new Map<string, Voice>();
  readonly sequencer = new Sequencer();
  private muffled = false;
  unlocked = false;
  private hiddenSuspended = false;

  constructor() {
    EventBus.on('settings:changed', ({ key }) => {
      if (['master', 'music', 'sfx', 'voice', 'ambient', 'vinyl'].includes(key)) this.applyVolumes();
    });
    EventBus.on('app:pause', ({ reason }) => {
      if (reason === 'hidden') void this.suspendForHidden();
    });
    EventBus.on('app:resume', () => void this.resumeFromHidden());
  }

  /** Chamado dentro de um handler de gesto do usuário (tecla/clique/botão). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio indisponível');
      this.ctx = new Ctx({ latencyHint: 'interactive' });
    } catch (e) {
      Logger.warn('Audio', 'não foi possível criar o AudioContext', String(e));
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    for (const b of ['music', 'sfx', 'voice', 'ambient'] as Bus[]) {
      const g = ctx.createGain();
      this.buses.set(b, g);
    }
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.buses.get('music')!.connect(this.musicFilter);
    this.musicFilter.connect(this.master);
    for (const b of ['sfx', 'voice', 'ambient'] as Bus[]) this.buses.get(b)!.connect(this.master);
    this.applyVolumes();
    void ctx.resume().then(() => {
      this.unlocked = true;
      EventBus.emit('audio:unlocked');
      Logger.info('Audio', `AudioContext ${ctx.state} @ ${ctx.sampleRate} Hz`);
    });
    this.sequencer.attach(ctx, this.buses.get('music')!, (k) => this.buffers.get(k) ?? null);
    for (const k of this.raw.keys()) void this.decode(k);
  }

  get state(): string {
    return this.ctx?.state ?? 'none';
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = SettingsService.all;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, 0.02);
    this.buses.get('music')!.gain.setTargetAtTime(s.music * 0.8, t, 0.02);
    this.buses.get('sfx')!.gain.setTargetAtTime(s.sfx, t, 0.02);
    this.buses.get('voice')!.gain.setTargetAtTime(s.voice, t, 0.02);
    this.buses.get('ambient')!.gain.setTargetAtTime(s.ambient, t, 0.02);
    const vinyl = this.loops.get('vinyl_loop');
    if (vinyl) vinyl.gain.gain.setTargetAtTime(s.vinyl ? 0.35 : 0, t, 0.05);
  }

  /** Registra bytes de áudio já baixados (decodifica quando houver contexto). */
  addRaw(key: string, data: ArrayBuffer): void {
    if (this.buffers.has(key)) return;
    this.raw.set(key, data);
    if (this.ctx) void this.decode(key);
  }

  private decode(key: string): Promise<void> {
    const existing = this.decoding.get(key);
    if (existing) return existing;
    const data = this.raw.get(key);
    if (!data || !this.ctx) return Promise.resolve();
    const p = this.ctx
      .decodeAudioData(data.slice(0))
      .then((b) => {
        this.buffers.set(key, b);
        this.raw.delete(key);
      })
      .catch((e: unknown) => Logger.warn('Audio', `falha ao decodificar ${key}`, String(e)))
      .finally(() => this.decoding.delete(key));
    this.decoding.set(key, p);
    return p;
  }

  async whenDecoded(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.decode(k)));
  }

  has(key: string): boolean {
    return this.buffers.has(key) || this.raw.has(key);
  }

  /** Libera áudios de um pacote (ilhas não usadas). */
  release(keys: string[]): void {
    for (const k of keys) {
      this.buffers.delete(k);
      this.raw.delete(k);
    }
  }

  play(key: string, opts: PlayOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const priority = opts.priority ?? 1;
    // limite por som e global, respeitando prioridade
    const same = this.voices.filter((v) => v.key === key);
    if (same.length >= MAX_PER_KEY) this.stopVoice(same[0]!);
    if (this.voices.length >= MAX_VOICES) {
      const victim = this.voices.filter((v) => v.priority < 3 && v.priority <= priority).sort((a, b) => a.priority - b.priority || a.start - b.start)[0];
      if (!victim) return;
      this.stopVoice(victim);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const pv = opts.pitchVar ?? 0.05;
    src.playbackRate.value = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * pv);
    src.loop = opts.loop ?? false;
    const gain = ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    let node: AudioNode = gain;
    if (opts.pan !== undefined && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(pan);
      node = pan;
    }
    src.connect(gain);
    node.connect(this.buses.get(opts.bus ?? 'sfx')!);
    const v: Voice = { key, src, gain, priority, start: ctx.currentTime };
    this.voices.push(v);
    src.onended = () => {
      const i = this.voices.indexOf(v);
      if (i >= 0) this.voices.splice(i, 1);
      src.disconnect();
      gain.disconnect();
    };
    src.start();
    if (opts.loop) this.loops.set(key, v);
  }

  private stopVoice(v: Voice): void {
    try {
      v.src.stop();
    } catch {
      /* já parado */
    }
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
  }

  stopLoop(key: string): void {
    const v = this.loops.get(key);
    if (v) {
      this.stopVoice(v);
      this.loops.delete(key);
    }
  }

  startVinyl(): void {
    if (this.loops.has('vinyl_loop') || !this.buffers.has('vinyl_loop')) return;
    this.play('vinyl_loop', { bus: 'ambient', loop: true, volume: SettingsService.get('vinyl') ? 0.35 : 0, pitchVar: 0 });
  }

  // ---- música

  playSong(song: SongDef, layer = 0, restart = false): void {
    if (!this.ctx) return;
    this.sequencer.play(song, layer, restart);
  }

  setMusicLayer(layer: number): void {
    this.sequencer.setLayer(layer);
  }

  stopMusic(fade = 0.5): void {
    this.sequencer.stop(fade);
  }

  /** Relógio musical (batidas) derivado de audioContext.currentTime. */
  musicBeat(): number {
    return this.sequencer.beat();
  }

  /** Pausa: abafa a música com passa-baixa. */
  setMuffled(on: boolean): void {
    if (!this.ctx || this.muffled === on) return;
    this.muffled = on;
    this.musicFilter.frequency.setTargetAtTime(on ? 600 : 20000, this.ctx.currentTime, 0.08);
  }

  private async suspendForHidden(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') {
      this.hiddenSuspended = true;
      await this.ctx.suspend();
    }
  }

  private async resumeFromHidden(): Promise<void> {
    if (this.ctx && this.hiddenSuspended) {
      this.hiddenSuspended = false;
      await this.ctx.resume();
    }
  }

  /** Estado para depuração/testes. */
  debugInfo(): { state: string; voices: number; buffers: number } {
    return { state: this.state, voices: this.voices.length, buffers: this.buffers.size };
  }
}

export const AudioService = new AudioServiceImpl();
