import { Rng } from '../core/rng';
import type { ChordQ, Inst, Layer, SongDef } from '../data/music';

/** Nota compilada: tempo em batidas desde o início do loop. */
export interface NoteEv {
  beat: number;
  dur: number;
  inst: Inst;
  midi: number;
  vel: number;
  layer: Layer;
}

const QUAL: Record<ChordQ, number[]> = {
  maj6: [0, 4, 7, 9],
  maj7: [0, 4, 7, 11],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  m6: [0, 3, 7, 9],
  dim7: [0, 3, 6, 9],
  '9': [0, 4, 10, 14],
};

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** Aplica swing às colcheias fora do tempo. */
function sw(beat: number, swing: number): number {
  const f = beat - Math.floor(beat);
  if (Math.abs(f - 0.5) < 1e-6) return Math.floor(beat) + swing;
  return beat;
}

/**
 * Compila uma faixa em notas (determinístico pela semente). O loop tem `chords.length` compassos.
 * Função pura — testável em Node.
 */
export function compose(song: SongDef): { notes: NoteEv[]; beats: number } {
  const rng = new Rng(song.seed);
  const notes: NoteEv[] = [];
  const bars = song.chords.length;
  const root = song.root;
  const push = (beat: number, dur: number, inst: Inst, midi: number, vel: number, layer: Layer): void => {
    notes.push({ beat: sw(beat, song.swing), dur, inst, midi, vel, layer });
  };

  // motivo melódico de 2 compassos (reutilizado com variações — chamada e resposta)
  const motif: [number, number, number][] = [];
  let t = 0;
  while (t < 8) {
    const d = rng.chance(0.55) ? 0.5 : rng.chance(0.6) ? 1 : 1.5;
    if (rng.chance(0.15)) {
      t += d;
      continue;
    }
    motif.push([t, Math.min(d, 8 - t), rng.int(0, 6)]);
    t += d;
  }

  for (let bar = 0; bar < bars; bar++) {
    const [deg, q] = song.chords[bar]!;
    const next = song.chords[(bar + 1) % bars]!;
    const tones = QUAL[q];
    const b0 = bar * 4;
    const chordRoot = root + deg;
    // --- baixo
    if (song.bass === 'walk') {
      const walk = [0, tones[1]!, tones[2]!, 0];
      for (let k = 0; k < 4; k++) {
        let m = chordRoot - 24 + walk[k]!;
        if (k === 3) m = root + next[0] - 24 + (rng.chance(0.5) ? -1 : 1); // aproximação cromática
        push(b0 + k, 0.9, 'bass', m, k === 0 ? 1 : 0.8, 'bass');
      }
    } else {
      for (let k = 0; k < 4; k += 2) push(b0 + k, 0.8, 'tuba', chordRoot - 24 + (k === 2 ? 7 : 0), 0.9, 'bass');
    }
    // --- piano
    if (song.piano === 'stride') {
      push(b0, 0.5, 'piano', chordRoot - 12, 0.9, 'piano');
      push(b0 + 2, 0.5, 'piano', chordRoot - 12 + 7, 0.85, 'piano');
      for (const k of [1, 3]) for (const tt of tones.slice(1)) push(b0 + k, 0.45, 'piano', chordRoot + tt, 0.55, 'piano');
    } else if (song.piano === 'comp') {
      for (const k of [1.5, 3]) for (const tt of tones) push(b0 + k, 0.4, 'piano', chordRoot + tt, 0.5, 'piano');
    }
    // --- bateria
    for (let k = 0; k < 4; k++) {
      if (song.drums === 'brush') {
        push(b0 + k, 0.9, 'swish', 60, 0.5, 'drums');
        if (k % 2 === 1) push(b0 + k, 0.3, 'snare', 60, 0.45, 'drums');
      } else if (song.drums === 'swing') {
        push(b0 + k, 0.5, 'ride', 60, 0.35, 'drums');
        if (k % 2 === 1) push(b0 + k + 0.5, 0.3, 'ride', 60, 0.25, 'drums');
        if (k % 2 === 1) push(b0 + k, 0.3, 'snare', 60, 0.4, 'drums');
        if (k === 0) push(b0, 0.3, 'kick', 60, 0.5, 'drums');
      } else {
        push(b0 + k, 0.3, k % 2 === 0 ? 'kick' : 'snare', 60, k % 2 === 0 ? 0.6 : 0.5, 'drums');
        push(b0 + k + 0.5, 0.2, 'hihat', 60, 0.2, 'drums');
      }
    }
    // --- percussão extra (intensidade máxima)
    if (bar % 4 === 0) push(b0, 1.5, 'crash', 60, 0.35, 'perc');
    push(b0 + 3.5, 0.2, 'wood', 60, 0.4, 'perc');
  }

  // --- melodia principal: motivo em compassos pares, resposta nos ímpares
  const lead: Inst = song.lead;
  for (let phrase = 0; phrase < bars / 2; phrase++) {
    const bar = phrase * 2;
    const [deg, q] = song.chords[bar]!;
    const tones = QUAL[q];
    const variation = phrase % 2 === 1 ? 2 : 0;
    for (const [bt, d, idx] of motif) {
      const scaleDeg = (idx + variation) % 7;
      // puxa para notas do acorde nos tempos fortes
      let pitch = root + 12 + MAJOR_SCALE[scaleDeg]!;
      if (bt % 2 === 0) {
        const ct = tones[scaleDeg % tones.length]!;
        pitch = root + deg + 12 + ct;
        while (pitch > root + 26) pitch -= 12;
      }
      push(bar * 4 + bt, d * 0.9, lead, pitch, 0.7, 'lead');
    }
  }
  // --- contracanto: notas longas (guias de acorde)
  if (song.counter !== 'none') {
    for (let bar = 0; bar < bars; bar++) {
      const [deg, q] = song.chords[bar]!;
      const tones = QUAL[q];
      push(bar * 4 + 0.5, 1.4, song.counter, root + deg + tones[1]!, 0.45, 'counter');
      push(bar * 4 + 2.5, 1.4, song.counter, root + deg + tones[3 % tones.length]!, 0.4, 'counter');
    }
  }
  notes.sort((a, b) => a.beat - b.beat);
  return { notes, beats: bars * 4 };
}

/** Amostra e nota de referência de cada instrumento. */
export const INSTRUMENTS: Record<Inst, { sample: string; base: number; gain: number; release: number }> = {
  piano: { sample: 'piano_c4', base: 60, gain: 0.55, release: 0.15 },
  bass: { sample: 'bass_c2', base: 36, gain: 0.8, release: 0.08 },
  brass: { sample: 'brass_c4', base: 60, gain: 0.42, release: 0.12 },
  clarinet: { sample: 'clarinet_c4', base: 60, gain: 0.42, release: 0.1 },
  banjo: { sample: 'banjo_c4', base: 60, gain: 0.5, release: 0.1 },
  musicbox: { sample: 'musicbox_c5', base: 72, gain: 0.5, release: 0.4 },
  tuba: { sample: 'tuba_c2', base: 36, gain: 0.75, release: 0.08 },
  kick: { sample: 'kick', base: 60, gain: 0.7, release: 0.05 },
  snare: { sample: 'snare_brush', base: 60, gain: 0.5, release: 0.05 },
  swish: { sample: 'brush_swish', base: 60, gain: 0.4, release: 0.05 },
  hihat: { sample: 'hihat', base: 60, gain: 0.35, release: 0.03 },
  ride: { sample: 'ride', base: 60, gain: 0.3, release: 0.2 },
  wood: { sample: 'woodblock', base: 60, gain: 0.35, release: 0.03 },
  crash: { sample: 'crash', base: 60, gain: 0.3, release: 0.3 },
};
