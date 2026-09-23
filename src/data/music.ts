/**
 * Trilhas PLACEHOLDER SUBSTITUÍVEIS: jazz de big band / ragtime gerados proceduralmente.
 * Cada faixa documenta BPM, compassos, pontos de loop e camadas por fase (especificação para compositor
 * em docs/PIPELINE_ASSETS.md). O loop tem exatamente `bars` compassos de 4 tempos (sem emenda).
 */
export type ChordQ = 'maj6' | 'maj7' | '7' | 'm7' | 'm6' | 'dim7' | '9';
export type Inst = 'piano' | 'bass' | 'brass' | 'clarinet' | 'banjo' | 'musicbox' | 'tuba' | 'kick' | 'snare' | 'swish' | 'hihat' | 'ride' | 'wood' | 'crash';
export type Layer = 'bass' | 'piano' | 'drums' | 'lead' | 'counter' | 'perc';

export interface SongDef {
  id: string;
  bpm: number;
  /** posição da colcheia "fora do tempo" (0.5 = reto, 0.66 = swing) */
  swing: number;
  root: number;
  /** [semitons a partir da tônica, qualidade] por compasso */
  chords: [number, ChordQ][];
  bass: 'walk' | 'oompah';
  piano: 'stride' | 'comp' | 'none';
  lead: 'brass' | 'clarinet' | 'musicbox' | 'banjo';
  counter: 'clarinet' | 'brass' | 'banjo' | 'musicbox' | 'none';
  drums: 'brush' | 'swing' | 'march';
  /** camadas ativas por nível de intensidade (fase) */
  levels: Layer[][];
  seed: number;
}

const L: Layer[][] = [
  ['bass', 'piano'],
  ['bass', 'piano', 'drums'],
  ['bass', 'piano', 'drums', 'lead'],
  ['bass', 'piano', 'drums', 'lead', 'counter', 'perc'],
];

// progressões (I = 0). Ex.: ragtime I–VI7–II7–V7
const RAG: [number, ChordQ][] = [[0, 'maj6'], [0, 'maj6'], [9, '7'], [9, '7'], [2, '7'], [2, '7'], [7, '7'], [7, '7']];
const RHYTHM: [number, ChordQ][] = [[0, 'maj6'], [9, 'm7'], [2, 'm7'], [7, '7'], [0, 'maj6'], [9, 'm7'], [2, 'm7'], [7, '7']];
const MINOR: [number, ChordQ][] = [[0, 'm6'], [0, 'm6'], [5, 'm7'], [5, 'm7'], [7, '7'], [8, '7'], [7, '7'], [7, '7']];
const BLUES: [number, ChordQ][] = [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [9, '7'], [2, 'm7'], [7, '7'], [0, '7'], [7, '7']];

export const SONGS: Record<string, SongDef> = {
  title: { id: 'title', bpm: 118, swing: 0.64, root: 58, chords: RHYTHM, bass: 'walk', piano: 'stride', lead: 'clarinet', counter: 'brass', drums: 'brush', levels: [['bass', 'piano', 'drums', 'lead']], seed: 1 },
  map: { id: 'map', bpm: 104, swing: 0.62, root: 60, chords: RAG, bass: 'oompah', piano: 'stride', lead: 'banjo', counter: 'clarinet', drums: 'march', levels: [['bass', 'piano', 'drums', 'lead', 'counter']], seed: 2 },
  shop: { id: 'shop', bpm: 92, swing: 0.6, root: 63, chords: RHYTHM, bass: 'walk', piano: 'comp', lead: 'musicbox', counter: 'none', drums: 'brush', levels: [['bass', 'piano', 'drums', 'lead']], seed: 3 },
  cuco: { id: 'cuco', bpm: 132, swing: 0.62, root: 62, chords: RAG, bass: 'oompah', piano: 'stride', lead: 'clarinet', counter: 'brass', drums: 'march', levels: L, seed: 11 },
  agulha: { id: 'agulha', bpm: 140, swing: 0.64, root: 57, chords: MINOR, bass: 'walk', piano: 'stride', lead: 'clarinet', counter: 'banjo', drums: 'swing', levels: L, seed: 12 },
  gramofone: { id: 'gramofone', bpm: 120, swing: 0.66, root: 60, chords: BLUES, bass: 'walk', piano: 'comp', lead: 'brass', counter: 'clarinet', drums: 'swing', levels: L, seed: 13 },
  bigorna: { id: 'bigorna', bpm: 150, swing: 0.6, root: 55, chords: MINOR, bass: 'oompah', piano: 'stride', lead: 'brass', counter: 'brass', drums: 'march', levels: L, seed: 14 },
  fuligem: { id: 'fuligem', bpm: 138, swing: 0.62, root: 53, chords: RHYTHM, bass: 'walk', piano: 'stride', lead: 'brass', counter: 'clarinet', drums: 'swing', levels: L, seed: 15 },
  maestro: { id: 'maestro', bpm: 144, swing: 0.64, root: 62, chords: MINOR, bass: 'walk', piano: 'stride', lead: 'brass', counter: 'musicbox', drums: 'swing', levels: L, seed: 16 },
  runngun1: { id: 'runngun1', bpm: 146, swing: 0.62, root: 60, chords: RAG, bass: 'oompah', piano: 'stride', lead: 'brass', counter: 'banjo', drums: 'march', levels: [['bass', 'piano', 'drums', 'lead', 'counter']], seed: 21 },
  runngun2: { id: 'runngun2', bpm: 152, swing: 0.6, root: 57, chords: MINOR, bass: 'walk', piano: 'stride', lead: 'clarinet', counter: 'brass', drums: 'swing', levels: [['bass', 'piano', 'drums', 'lead', 'counter']], seed: 22 },
  tutorial: { id: 'tutorial', bpm: 100, swing: 0.62, root: 65, chords: RHYTHM, bass: 'walk', piano: 'comp', lead: 'banjo', counter: 'none', drums: 'brush', levels: [['bass', 'piano', 'drums', 'lead']], seed: 23 },
  credits: { id: 'credits', bpm: 96, swing: 0.64, root: 60, chords: RHYTHM, bass: 'walk', piano: 'stride', lead: 'clarinet', counter: 'brass', drums: 'brush', levels: [['bass', 'piano', 'drums', 'lead', 'counter']], seed: 24 },
  victory: { id: 'victory', bpm: 130, swing: 0.6, root: 60, chords: [[0, 'maj6'], [7, '7'], [0, 'maj6'], [0, 'maj6']], bass: 'oompah', piano: 'stride', lead: 'brass', counter: 'clarinet', drums: 'march', levels: [['bass', 'piano', 'drums', 'lead', 'counter']], seed: 25 },
};
