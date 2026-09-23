/** Primitivas de síntese offline (Float32, mono). Todo som do jogo é gerado aqui — original. */
import { Rng } from '../../src/core/rng';

export const SR = 22050;

export function buf(sec: number): Float32Array {
  return new Float32Array(Math.max(1, Math.round(sec * SR)));
}

export type Wave = 'sine' | 'square' | 'saw' | 'tri' | 'noise';

/** Oscilador com frequência variável no tempo (f(t) em Hz). */
export function osc(out: Float32Array, wave: Wave, freq: (t: number) => number, amp: (t: number) => number, seed = 1, start = 0): Float32Array {
  const r = new Rng(seed);
  let ph = 0;
  const n0 = Math.round(start * SR);
  for (let i = n0; i < out.length; i++) {
    const t = (i - n0) / SR;
    ph += freq(t) / SR;
    const p = ph - Math.floor(ph);
    let v: number;
    switch (wave) {
      case 'sine':
        v = Math.sin(p * Math.PI * 2);
        break;
      case 'square':
        v = p < 0.5 ? 1 : -1;
        break;
      case 'saw':
        v = 2 * p - 1;
        break;
      case 'tri':
        v = 4 * Math.abs(p - 0.5) - 1;
        break;
      default:
        v = r.next() * 2 - 1;
    }
    out[i] = (out[i] ?? 0) + v * amp(t);
  }
  return out;
}

/** Envelope ADSR simples (s). */
export function adsr(a: number, d: number, s: number, r: number, len: number): (t: number) => number {
  return (t) => {
    if (t < a) return t / Math.max(1e-4, a);
    if (t < a + d) return 1 - (1 - s) * ((t - a) / Math.max(1e-4, d));
    if (t < len) return s;
    if (t < len + r) return s * (1 - (t - len) / Math.max(1e-4, r));
    return 0;
  };
}

export function expDecay(k: number, delay = 0): (t: number) => number {
  return (t) => (t < delay ? 0 : Math.exp(-(t - delay) * k));
}

/** Passa-baixa de um polo (freq em Hz, pode variar no tempo). */
export function lowpass(x: Float32Array, cutoff: (t: number) => number): Float32Array {
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const c = cutoff(i / SR);
    const a = 1 - Math.exp((-2 * Math.PI * c) / SR);
    y += a * ((x[i] ?? 0) - y);
    x[i] = y;
  }
  return x;
}

export function highpass(x: Float32Array, cutoff: number): Float32Array {
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = rc / (rc + 1 / SR);
  let py = 0;
  let px = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] ?? 0;
    const y = a * (py + v - px);
    px = v;
    py = y;
    x[i] = y;
  }
  return x;
}

/** Filtro passa-banda ressonante (biquad). */
export function bandpass(x: Float32Array, freq: number, q: number): Float32Array {
  const w = (2 * Math.PI * freq) / SR;
  const alpha = Math.sin(w) / (2 * q);
  const b0 = alpha;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w);
  const a2 = 1 - alpha;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] ?? 0;
    const y = (b0 * v + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = v;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** Soma b em a com ganho e atraso (s). */
export function mix(a: Float32Array, b: Float32Array, gain = 1, at = 0): Float32Array {
  const o = Math.round(at * SR);
  for (let i = 0; i < b.length && i + o < a.length; i++) a[i + o] = (a[i + o] ?? 0) + (b[i] ?? 0) * gain;
  return a;
}

/** Eco curto (sala pequena / mola). */
export function echo(x: Float32Array, delay: number, fb: number, wet: number): Float32Array {
  const d = Math.round(delay * SR);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const back = i >= d ? (y[i - d] ?? 0) : 0;
    y[i] = (x[i] ?? 0) + back * fb;
  }
  for (let i = 0; i < x.length; i++) x[i] = (x[i] ?? 0) * (1 - wet) + (y[i] ?? 0) * wet;
  return x;
}

export function saturate(x: Float32Array, drive: number): Float32Array {
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh((x[i] ?? 0) * drive) / Math.tanh(drive);
  return x;
}

/** Normaliza ao pico e aplica fade-out curto para não estalar. */
export function finish(x: Float32Array, peak = 0.9, fadeMs = 8): Float32Array {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m > 0 ? peak / m : 1;
  const fade = Math.round((fadeMs / 1000) * SR);
  for (let i = 0; i < x.length; i++) {
    let v = (x[i] ?? 0) * g;
    if (i > x.length - fade) v *= (x.length - i) / fade;
    if (i < 32) v *= i / 32;
    x[i] = v;
  }
  return x;
}

/** Codifica WAV PCM 16-bit mono. */
export function wav(x: Float32Array): Buffer {
  const n = x.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round((x[i] ?? 0) * 32767))), 44 + i * 2);
  return b;
}

export const midi = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
