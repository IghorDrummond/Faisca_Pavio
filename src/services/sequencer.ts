import type { Layer, SongDef } from '../data/music';
import { INSTRUMENTS, type NoteEv, compose } from './composer';

const LOOKAHEAD = 0.25;
const LAYERS: Layer[] = ['bass', 'piano', 'drums', 'lead', 'counter', 'perc'];

/**
 * Sequenciador com agendamento antecipado (lookahead) no relógio do AudioContext.
 * Camadas sincronizadas iniciam no mesmo tempo; troca de intensidade por crossfade de ganho.
 * O relógio musical (batidas) é derivado de audioContext.currentTime — não do tempo de quadro.
 */
export class Sequencer {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private getBuffer: (k: string) => AudioBuffer | null = () => null;
  private layerGain = new Map<Layer, GainNode>();
  private song: SongDef | null = null;
  private notes: NoteEv[] = [];
  private loopBeats = 16;
  private anchorTime = 0;
  private anchorBeat = 0;
  private tempo = 1;
  private scheduledUntil = 0;
  private cursor = 0;
  private loopIndex = 0;
  private level = 0;
  private playing = false;
  private songGain: GainNode | null = null;
  private cache = new Map<string, { notes: NoteEv[]; beats: number }>();

  attach(ctx: AudioContext, out: GainNode, getBuffer: (k: string) => AudioBuffer | null): void {
    this.ctx = ctx;
    this.out = out;
    this.getBuffer = getBuffer;
  }

  get currentSong(): string | null {
    return this.playing ? (this.song?.id ?? null) : null;
  }

  play(song: SongDef, level: number, restart: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    if (this.playing && this.song?.id === song.id && !restart) {
      this.setLayer(level);
      return;
    }
    this.stop(0.25);
    let c = this.cache.get(song.id);
    if (!c) {
      c = compose(song);
      this.cache.set(song.id, c);
    }
    this.song = song;
    this.notes = c.notes;
    this.loopBeats = c.beats;
    this.tempo = 1;
    this.songGain = ctx.createGain();
    this.songGain.connect(this.out);
    this.layerGain.clear();
    for (const l of LAYERS) {
      const g = ctx.createGain();
      g.connect(this.songGain);
      this.layerGain.set(l, g);
    }
    this.level = -1;
    this.setLayer(level, true);
    this.anchorTime = ctx.currentTime + 0.08;
    this.anchorBeat = 0;
    this.scheduledUntil = 0;
    this.cursor = 0;
    this.loopIndex = 0;
    this.playing = true;
  }

  setLayer(level: number, instant = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.song) return;
    const lv = Math.max(0, Math.min(this.song.levels.length - 1, level));
    if (lv === this.level) return;
    this.level = lv;
    const on = new Set(this.song.levels[lv]);
    for (const [l, g] of this.layerGain) {
      const target = on.has(l) ? 1 : 0;
      if (instant) g.gain.value = target;
      else g.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
    }
  }

  stop(fade: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.songGain) {
      this.playing = false;
      return;
    }
    const g = this.songGain;
    g.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade / 3));
    setTimeout(() => g.disconnect(), fade * 1000 + 400);
    this.songGain = null;
    this.playing = false;
  }

  /** Batida atual (float) a partir do relógio de áudio. */
  beat(): number {
    const ctx = this.ctx;
    if (!ctx || !this.song || !this.playing) return 0;
    const bps = (this.song.bpm / 60) * this.tempo;
    return this.anchorBeat + Math.max(0, ctx.currentTime - this.anchorTime) * bps;
  }

  private timeOfBeat(b: number): number {
    const bps = (this.song!.bpm / 60) * this.tempo;
    return this.anchorTime + (b - this.anchorBeat) / bps;
  }

  /** Muda o andamento mantendo a posição atual. */
  setTempo(mult: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.song) return;
    const b = this.beat();
    this.anchorBeat = b;
    this.anchorTime = ctx.currentTime;
    // notas já agendadas (≤ 0,25 s à frente) permanecem; as próximas usam o novo andamento
    this.tempo = Math.min(1.6, mult);
  }

  tempoUp(mult: number): void {
    this.setTempo(this.tempo * mult);
  }

  /** "Arranhão": pula para frente sem quebrar a grade (disco riscando). */
  skip(beats: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.anchorTime -= beats / ((this.song!.bpm / 60) * this.tempo);
  }

  /** Agenda notas no horizonte de lookahead. Chamado a cada quadro. */
  pump(): void {
    const ctx = this.ctx;
    if (!ctx || !this.playing || !this.song || !this.songGain) return;
    if (ctx.state !== 'running') return;
    const horizon = this.beat() + LOOKAHEAD * (this.song.bpm / 60) * this.tempo;
    let guard = 0;
    while (this.scheduledUntil < horizon && guard++ < 512) {
      const loopStart = this.loopIndex * this.loopBeats;
      const n = this.notes[this.cursor];
      if (!n) {
        this.loopIndex++;
        this.cursor = 0;
        continue;
      }
      const at = loopStart + n.beat;
      if (at > horizon) break;
      if (at >= this.scheduledUntil - 1e-6) this.scheduleNote(n, this.timeOfBeat(at));
      this.scheduledUntil = Math.max(this.scheduledUntil, at);
      this.cursor++;
    }
  }

  private scheduleNote(n: NoteEv, when: number): void {
    const ctx = this.ctx!;
    if (when < ctx.currentTime - 0.02) return;
    const inst = INSTRUMENTS[n.inst];
    const buf = this.getBuffer(inst.sample);
    const dest = this.layerGain.get(n.layer);
    if (!buf || !dest) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (n.midi - inst.base) / 12);
    const g = ctx.createGain();
    const durSec = n.dur / ((this.song!.bpm / 60) * this.tempo);
    const v = inst.gain * n.vel;
    g.gain.setValueAtTime(v, when);
    g.gain.setTargetAtTime(0, when + durSec, inst.release / 3);
    src.connect(g);
    g.connect(dest);
    src.start(Math.max(when, ctx.currentTime));
    src.stop(when + durSec + inst.release * 2 + 0.05);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
  }
}
