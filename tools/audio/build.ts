/**
 * Efeitos sonoros "cartoon" (apitos, sinos, molas, pratos, madeira, borbulhas) e amostras de
 * instrumentos (piano, contrabaixo, metais, clarinete, bateria de escovas) para o sequenciador.
 * Formato: WAV 22,05 kHz mono (suportado por todos os navegadores-alvo; ffmpeg indisponível — ver DECISOES.md).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SR, adsr, bandpass, buf, echo, expDecay, finish, highpass, lowpass, midi, mix, osc, saturate, wav } from './synth';

export interface AudioOut {
  key: string;
  url: string;
  pack: string;
  bytes: number;
  kind: 'sfx' | 'sample' | 'loop';
}

type Gen = () => Float32Array;

// ---------------------------------------------------------------------------------------------
// blocos de construção

function noiseBurst(sec: number, cutoff: number, k: number, seed: number): Float32Array {
  const b = buf(sec);
  osc(b, 'noise', () => 0, expDecay(k), seed);
  return lowpass(b, () => cutoff);
}

function bell(freq: number, sec: number, k = 3): Float32Array {
  const b = buf(sec);
  // parciais inarmônicos de sino
  for (const [m, a] of [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.9, 0.14]] as [number, number][]) {
    osc(b, 'sine', () => freq * m, (t) => a * Math.exp(-t * k * (1 + m * 0.35)));
  }
  return b;
}

function whistle(f0: number, f1: number, sec: number, vib = 6): Float32Array {
  const b = buf(sec);
  osc(b, 'sine', (t) => f0 + (f1 - f0) * (t / sec) + Math.sin(t * vib * 6.28) * 18, adsr(0.01, 0.05, 0.8, 0.05, sec - 0.06));
  osc(b, 'noise', () => 0, (t) => 0.04 * (1 - t / sec), 9);
  return b;
}

function boing(f: number, sec: number): Float32Array {
  const b = buf(sec);
  osc(b, 'tri', (t) => f * (1 + 0.6 * Math.exp(-t * 10) * Math.sin(t * 60)), expDecay(5));
  return b;
}

function wood(f: number, sec = 0.12): Float32Array {
  const b = buf(sec);
  osc(b, 'sine', () => f, expDecay(40));
  osc(b, 'noise', () => 0, expDecay(90), 3);
  return bandpass(b, f * 1.5, 2);
}

function zap(f0: number, f1: number, sec: number, wave: 'square' | 'saw' = 'square'): Float32Array {
  const b = buf(sec);
  osc(b, wave, (t) => f0 * Math.pow(f1 / f0, t / sec), expDecay(8));
  return lowpass(b, () => 3500);
}

// ---------------------------------------------------------------------------------------------
// SFX

const SFX: Record<string, Gen> = {
  shoot_reta: () => {
    const b = zap(1800, 700, 0.09);
    mix(b, noiseBurst(0.06, 5000, 60, 2), 0.4);
    return b;
  },
  shoot_leque: () => {
    const b = noiseBurst(0.14, 2400, 25, 3);
    mix(b, zap(600, 300, 0.12, 'saw'), 0.4);
    return b;
  },
  shoot_teleguiada: () => whistle(1400, 2200, 0.1, 30),
  shoot_rojao: () => {
    const b = noiseBurst(0.5, 1800, 5, 4);
    mix(b, zap(220, 90, 0.35, 'saw'), 0.6);
    return saturate(b, 2);
  },
  shoot_weak: () => zap(1200, 600, 0.07),
  shoot_plane: () => zap(2000, 900, 0.07),
  bomb_drop: () => whistle(1500, 500, 0.35, 0),
  rojao_charge: () => {
    const b = buf(0.6);
    osc(b, 'square', (t) => 200 + t * 900, (t) => 0.35 * Math.min(1, t * 6));
    return lowpass(b, () => 2000);
  },
  ex: () => {
    const b = zap(900, 120, 0.45, 'saw');
    mix(b, noiseBurst(0.4, 3000, 8, 5), 0.6);
    mix(b, bell(880, 0.5), 0.3);
    return saturate(b, 2.5);
  },
  super_start: () => {
    const b = buf(1.1);
    osc(b, 'saw', (t) => 110 * Math.pow(4, t), (t) => 0.5 * Math.min(1, t * 3) * (t < 0.9 ? 1 : (1.1 - t) * 5));
    mix(b, bell(1320, 1), 0.5, 0.4);
    lowpass(b, (t) => 600 + t * 4000);
    return b;
  },
  beam: () => {
    const b = buf(1.5);
    osc(b, 'saw', (t) => 90 + Math.sin(t * 30) * 8, () => 0.4);
    osc(b, 'noise', () => 0, () => 0.3, 6);
    return lowpass(b, () => 1400);
  },
  hit: () => {
    const b = noiseBurst(0.06, 3000, 50, 7);
    mix(b, wood(900, 0.06), 0.6);
    return b;
  },
  hit_heavy: () => {
    const b = noiseBurst(0.18, 1500, 18, 8);
    mix(b, wood(300, 0.15), 0.8);
    return saturate(b, 2);
  },
  explosion: () => {
    const b = noiseBurst(0.9, 900, 4.5, 9);
    const low = buf(0.9);
    osc(low, 'sine', (t) => 90 * Math.exp(-t * 3) + 35, expDecay(5));
    mix(b, low, 0.9);
    return saturate(b, 2.2);
  },
  jump: () => whistle(500, 1100, 0.14, 0),
  land: () => {
    const b = noiseBurst(0.08, 800, 45, 10);
    return mix(b, wood(180, 0.08), 0.5);
  },
  land_heavy: () => {
    const b = buf(0.5);
    osc(b, 'sine', (t) => 70 * Math.exp(-t * 4) + 30, expDecay(6));
    mix(b, noiseBurst(0.3, 500, 10, 11), 0.6);
    return saturate(b, 2);
  },
  dash: () => {
    const b = noiseBurst(0.22, 3000, 10, 12);
    return bandpass(b, 1800, 0.8);
  },
  parry: () => {
    const b = bell(1568, 0.9, 2.5);
    mix(b, bell(2093, 0.8, 3), 0.6, 0.02);
    mix(b, wood(1400, 0.05), 0.5);
    return b;
  },
  parry_whiff: () => bandpass(noiseBurst(0.12, 5000, 20, 13), 2500, 1.2),
  hurt: () => {
    const b = buf(0.4);
    osc(b, 'square', (t) => 700 - t * 1200 + Math.sin(t * 90) * 60, expDecay(6));
    mix(b, noiseBurst(0.1, 2000, 30, 14), 0.6);
    return lowpass(b, () => 2400);
  },
  death: () => {
    const b = whistle(1200, 180, 0.9, 5);
    mix(b, noiseBurst(0.4, 1500, 6, 15), 0.5, 0.7);
    return b;
  },
  revive: () => {
    const b = buf(0.7);
    for (const [i, m] of [60, 64, 67, 72].entries()) osc(b, 'tri', () => midi(m + 12), (t) => (t > i * 0.08 ? 0.4 * Math.exp(-(t - i * 0.08) * 5) : 0));
    return b;
  },
  meter_card: () => {
    const b = buf(0.25);
    osc(b, 'tri', (t) => (t < 0.08 ? midi(84) : midi(88)), expDecay(9));
    return b;
  },
  coin: () => {
    const b = buf(0.45);
    osc(b, 'square', (t) => (t < 0.07 ? midi(83) : midi(88)), (t) => 0.35 * Math.exp(-t * 6));
    return lowpass(b, () => 5000);
  },
  swap: () => mix(wood(1200, 0.06), wood(1600, 0.06), 0.8, 0.05),
  ui_move: () => wood(1500, 0.05),
  ui_confirm: () => {
    const b = bell(1175, 0.35, 5);
    return mix(b, wood(900, 0.05), 0.5);
  },
  ui_back: () => wood(700, 0.08),
  ui_denied: () => {
    const b = buf(0.25);
    osc(b, 'square', () => 150, adsr(0.005, 0.05, 0.6, 0.05, 0.18));
    return lowpass(b, () => 1500);
  },
  knockout_bell: () => {
    const b = bell(659, 2.2, 1.2);
    mix(b, bell(659, 2, 1.2), 0.8, 0.5);
    mix(b, bell(659, 1.8, 1.2), 0.7, 1.0);
    return b;
  },
  ready: () => {
    // rufar de tambor
    const b = buf(1.3);
    for (let k = 0; k < 26; k++) mix(b, noiseBurst(0.05, 2200, 60, 20 + k), 0.3 + (k / 26) * 0.6, k * 0.045);
    mix(b, noiseBurst(0.5, 6000, 6, 50), 0.6, 1.17);
    return b;
  },
  go: () => {
    const b = buf(0.6);
    for (const m of [60, 64, 67]) osc(b, 'saw', () => midi(m), adsr(0.02, 0.1, 0.7, 0.2, 0.35));
    return lowpass(b, (t) => 800 + t * 3000);
  },
  warn: () => mix(wood(1000, 0.08), wood(1000, 0.08), 0.8, 0.12),
  warn_tick: () => mix(wood(2200, 0.05), wood(1700, 0.05), 0.9, 0.16),
  warn_cuckoo: () => {
    const b = buf(0.5);
    osc(b, 'sine', (t) => (t < 0.2 ? midi(79) : midi(75)), (t) => (t < 0.18 || (t > 0.22 && t < 0.45) ? 0.6 : 0));
    return lowpass(b, () => 3000);
  },
  warn_bell: () => bell(988, 0.7, 3),
  warn_spring: () => boing(260, 0.5),
  warn_horn: () => {
    const b = buf(0.6);
    osc(b, 'saw', () => 220, adsr(0.03, 0.1, 0.8, 0.1, 0.45));
    osc(b, 'saw', () => 223, adsr(0.03, 0.1, 0.8, 0.1, 0.45));
    return lowpass(b, () => 1400);
  },
  warn_scratch: () => {
    const b = noiseBurst(0.35, 4000, 6, 60);
    return bandpass(b, 1200, 3);
  },
  swoosh: () => bandpass(noiseBurst(0.4, 4000, 5, 61), 900, 0.7),
  bounce: () => boing(330, 0.3),
  poof: () => lowpass(noiseBurst(0.35, 1200, 9, 62), () => 1200),
  pop: () => {
    const b = buf(0.1);
    osc(b, 'sine', (t) => 900 - t * 5000, expDecay(40));
    return b;
  },
  lucky: () => {
    const b = buf(0.8);
    for (const [i, m] of [72, 76, 79, 84].entries()) mix(b, bell(midi(m), 0.6, 4), 0.4, i * 0.07);
    return b;
  },
  phase: () => {
    const b = noiseBurst(1.3, 7000, 2.5, 63);
    mix(b, bell(440, 1.2, 2), 0.4);
    return b;
  },
  cheer: () => {
    const b = buf(2);
    osc(b, 'noise', () => 0, (t) => 0.6 * Math.min(1, t * 4) * Math.exp(-t * 0.8), 64);
    return bandpass(b, 1100, 0.6);
  },
  pause_on: () => wood(600, 0.08),
  pause_off: () => wood(1100, 0.08),
  iris: () => bandpass(noiseBurst(0.35, 3000, 6, 65), 600, 1),
  footstep: () => wood(260, 0.05),
  boss_hurt: () => wood(500, 0.05),
  chime: () => bell(1318, 0.6, 3),
  saw: () => {
    const b = buf(0.5);
    osc(b, 'saw', (t) => 320 + Math.sin(t * 50) * 30, () => 0.4);
    return lowpass(b, () => 2400);
  },
  stomp: () => {
    const b = wood(140, 0.2);
    return mix(b, noiseBurst(0.12, 900, 20, 66), 0.6);
  },
  needle: () => mix(wood(1800, 0.05), noiseBurst(0.06, 6000, 50, 67), 0.5),
  steam: () => highpass(noiseBurst(0.6, 8000, 3, 68), 2000),
  anvil: () => {
    const b = bell(1250, 1.1, 3.5);
    mix(b, bell(1830, 0.9, 4), 0.5);
    return mix(b, noiseBurst(0.05, 5000, 60, 69), 0.6);
  },
  snip: () => mix(wood(2500, 0.04), wood(2100, 0.04), 1, 0.06),
  suction: () => {
    const b = buf(1.2);
    osc(b, 'noise', () => 0, (t) => 0.5 * Math.min(1, t * 3), 70);
    return lowpass(b, (t) => 400 + t * 1200);
  },
  enemy_die: () => {
    const b = boing(500, 0.25);
    return mix(b, lowpass(noiseBurst(0.3, 1500, 10, 71), () => 1500), 0.7, 0.05);
  },
  record_skip: () => {
    const b = buf(0.3);
    for (let k = 0; k < 3; k++) mix(b, noiseBurst(0.04, 3000, 70, 72 + k), 0.7, k * 0.08);
    return b;
  },
  defeat: () => {
    const b = buf(1.4);
    for (const [i, m] of [67, 66, 65, 64].entries()) osc(b, 'saw', () => midi(m - 12) * (i === 3 ? 1 + 0 : 1), (t) => (t > i * 0.3 && t < i * 0.3 + (i === 3 ? 0.9 : 0.28) ? 0.35 : 0));
    return lowpass(b, () => 1200);
  },
  vinyl_loop: () => {
    // chiado de vinil sutil (loop 4 s sem emenda: estalos + ruído rosa leve)
    const sec = 4;
    const b = buf(sec);
    osc(b, 'noise', () => 0, () => 0.04, 80);
    lowpass(b, () => 3000);
    highpass(b, 300);
    const r = new (class {
      s = 12345;
      next(): number {
        this.s = (this.s * 1103515245 + 12345) & 0x7fffffff;
        return this.s / 0x7fffffff;
      }
    })();
    for (let k = 0; k < 40; k++) {
      const at = Math.floor(r.next() * (b.length - 200));
      const amp = 0.2 + r.next() * 0.6;
      for (let j = 0; j < 40; j++) b[at + j] = (b[at + j] ?? 0) + amp * Math.exp(-j / 6) * (j % 2 ? -1 : 1);
    }
    return b;
  },
};

/** Pacote de cada SFX (core por padrão). */
const SFX_PACK: Record<string, string> = {};

// ---------------------------------------------------------------------------------------------
// Amostras de instrumentos (nota de referência indicada no nome)

const SAMPLES: Record<string, Gen> = {
  piano_c4: () => {
    const f = midi(60);
    const b = buf(2.2);
    for (const [h, a] of [[1, 1], [2, 0.45], [3, 0.25], [4, 0.12], [5, 0.06]] as [number, number][]) {
      osc(b, 'sine', () => f * h * (1 + h * 0.0008), (t) => a * Math.exp(-t * (1.6 + h * 0.7)));
    }
    mix(b, noiseBurst(0.02, 4000, 200, 90), 0.15);
    return b;
  },
  bass_c2: () => {
    const f = midi(36);
    const b = buf(1.4);
    osc(b, 'tri', () => f, (t) => Math.exp(-t * 2.8));
    osc(b, 'sine', () => f * 2, (t) => 0.3 * Math.exp(-t * 5));
    mix(b, noiseBurst(0.03, 1500, 120, 91), 0.3);
    return lowpass(b, () => 900);
  },
  brass_c4: () => {
    const f = midi(60);
    const b = buf(1.2);
    osc(b, 'saw', (t) => f * (1 + Math.sin(t * 5.5 * 6.28) * 0.004), adsr(0.04, 0.1, 0.75, 0.15, 0.9));
    osc(b, 'saw', (t) => f * 1.003, adsr(0.05, 0.1, 0.7, 0.15, 0.9));
    return lowpass(b, (t) => 1200 + Math.min(1, t * 8) * 1400);
  },
  clarinet_c4: () => {
    const f = midi(60);
    const b = buf(1.2);
    osc(b, 'square', (t) => f * (1 + Math.sin(t * 5 * 6.28) * 0.005), adsr(0.05, 0.1, 0.8, 0.12, 0.95));
    return lowpass(b, () => 1600);
  },
  banjo_c4: () => {
    const f = midi(60);
    const b = buf(0.9);
    osc(b, 'saw', () => f, (t) => Math.exp(-t * 6));
    osc(b, 'square', () => f * 2, (t) => 0.3 * Math.exp(-t * 9));
    return bandpass(b, 1400, 0.9);
  },
  kick: () => {
    const b = buf(0.35);
    osc(b, 'sine', (t) => 50 + 90 * Math.exp(-t * 30), expDecay(12));
    return b;
  },
  snare_brush: () => bandpass(noiseBurst(0.3, 6000, 12, 92), 2800, 0.5),
  brush_swish: () => {
    const b = buf(0.35);
    osc(b, 'noise', () => 0, (t) => Math.sin((t / 0.35) * Math.PI) * 0.5, 93);
    return bandpass(b, 3500, 0.6);
  },
  hihat: () => highpass(noiseBurst(0.08, 12000, 60, 94), 6000),
  ride: () => {
    const b = bell(3200, 1.1, 4);
    return mix(b, highpass(noiseBurst(0.6, 12000, 6, 95), 5000), 0.4);
  },
  woodblock: () => wood(1400, 0.1),
  crash: () => highpass(noiseBurst(1.6, 11000, 2.2, 96), 3000),
  tuba_c2: () => {
    const f = midi(36);
    const b = buf(0.9);
    osc(b, 'saw', () => f, adsr(0.03, 0.1, 0.8, 0.1, 0.6));
    return lowpass(b, () => 500);
  },
  musicbox_c5: () => bell(midi(72), 1.4, 2),
};

function hashOf(b: Buffer): string {
  return createHash('sha1').update(b).digest('hex').slice(0, 8);
}

export async function buildAudio(outRoot: string): Promise<AudioOut[]> {
  const out: AudioOut[] = [];
  const write = (key: string, pack: string, data: Float32Array, kind: AudioOut['kind']): void => {
    const dir = join(outRoot, pack, 'audio');
    mkdirSync(dir, { recursive: true });
    const w = wav(data);
    const name = `${key}-${hashOf(w)}.wav`;
    writeFileSync(join(dir, name), w);
    out.push({ key, url: `/packs/${pack}/audio/${name}`, pack, bytes: w.length, kind });
  };
  for (const [k, g] of Object.entries(SFX)) {
    const data = k === 'vinyl_loop' ? g() : finish(g(), 0.85);
    write(k, SFX_PACK[k] ?? 'core', data, k.endsWith('_loop') ? 'loop' : 'sfx');
  }
  for (const [k, g] of Object.entries(SAMPLES)) {
    write(k, 'core', finish(g(), 0.8, 20), 'sample');
  }
  void SR;
  void echo;
  return out;
}
