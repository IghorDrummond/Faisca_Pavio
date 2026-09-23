import type { SaveData, BossRecord } from './save';
import type { DifficultyId, Grade } from './types';
import { betterGrade } from './ranking';
import { FINAL_BOSS_MIN_DIFFICULTY } from '../data/difficulty';

/** Nós do mapa e regras de desbloqueio (centralizadas). */
export interface MapNode {
  id: string;
  kind: 'tutorial' | 'boss' | 'runngun' | 'shop' | 'challenge' | 'final' | 'bridge';
  island: 0 | 1 | 2;
  x: number;
  y: number;
  requires: string[];
}

export const ISLAND1_BOSSES = ['cuco', 'agulha'];
export const ISLAND2_BOSSES = ['gramofone', 'bigorna', 'fuligem'];
export const ALL_BOSSES = [...ISLAND1_BOSSES, ...ISLAND2_BOSSES];
export const STAGES = ['tutorial', 'runngun1', 'runngun2'];

export const MAP_NODES: MapNode[] = [
  { id: 'tutorial', kind: 'tutorial', island: 0, x: 380, y: 760, requires: [] },
  { id: 'shop', kind: 'shop', island: 0, x: 640, y: 560, requires: ['tutorial'] },
  { id: 'cuco', kind: 'boss', island: 0, x: 900, y: 780, requires: ['tutorial'] },
  { id: 'runngun1', kind: 'runngun', island: 0, x: 1120, y: 560, requires: ['tutorial'] },
  { id: 'agulha', kind: 'boss', island: 0, x: 1380, y: 760, requires: ['cuco'] },
  { id: 'challenge1', kind: 'challenge', island: 0, x: 560, y: 900, requires: ['tutorial'] },
  { id: 'bridge', kind: 'bridge', island: 0, x: 1700, y: 640, requires: ['cuco', 'agulha'] },
  { id: 'gramofone', kind: 'boss', island: 1, x: 2250, y: 720, requires: ['bridge'] },
  { id: 'bigorna', kind: 'boss', island: 1, x: 2600, y: 900, requires: ['bridge'] },
  { id: 'runngun2', kind: 'runngun', island: 1, x: 2480, y: 520, requires: ['bridge'] },
  { id: 'fuligem', kind: 'boss', island: 1, x: 2920, y: 600, requires: ['gramofone', 'bigorna'] },
  { id: 'challenge2', kind: 'challenge', island: 1, x: 2140, y: 940, requires: ['bridge'] },
  { id: 'maestro', kind: 'final', island: 2, x: 3300, y: 760, requires: ['embers:5'] },
];

export function bossBeaten(s: SaveData, id: string, minDiff?: DifficultyId): boolean {
  const r = s.bosses[id];
  if (!r) return false;
  if (!minDiff) return Object.values(r.beaten).some(Boolean);
  if (minDiff === 'especialista') return r.beaten.especialista;
  if (minDiff === 'normal') return r.beaten.normal || r.beaten.especialista;
  return Object.values(r.beaten).some(Boolean);
}

export function nodeDone(s: SaveData, id: string): boolean {
  if (id === 'bridge') return bossBeaten(s, 'cuco') && bossBeaten(s, 'agulha');
  if (id === 'shop') return true;
  if (id.startsWith('challenge')) return s.flags.includes(`challenge:${id}`);
  if (ALL_BOSSES.includes(id) || id === 'maestro') return bossBeaten(s, id);
  return !!s.stages[id]?.done;
}

/** Nó disponível? Regras centralizadas (inclui a exigência de Normal para o chefe final). */
export function nodeUnlocked(s: SaveData, node: MapNode): boolean {
  for (const r of node.requires) {
    if (r === 'embers:5') {
      if (s.embers.length < 5) return false;
      continue;
    }
    if (!nodeDone(s, r)) return false;
  }
  return true;
}

/** Chefe final exige todos os chefes vencidos no Normal ou superior. */
export function finalBossAllowed(s: SaveData): boolean {
  return ALL_BOSSES.every((b) => bossBeaten(s, b, FINAL_BOSS_MIN_DIFFICULTY));
}

function emptyRecord(): BossRecord {
  return {
    beaten: { simples: false, normal: false, especialista: false },
    best: { simples: null, normal: null, especialista: null },
    bestTime: { simples: null, normal: null, especialista: null },
  };
}

/** Registra vitória em chefe: Brasa (qualquer dificuldade), melhor nota por dificuldade, moedas de 1ª vitória. */
export function recordBossWin(s: SaveData, bossId: string, diff: DifficultyId, grade: Grade, timeSec: number, firstWinCoins: number): { save: SaveData; newRecord: boolean; ember: boolean; coins: number } {
  const prev = s.bosses[bossId] ?? emptyRecord();
  const best = betterGrade(prev.best[diff], grade);
  const newRecord = best !== prev.best[diff] || (prev.bestTime[diff] ?? Infinity) > timeSec;
  const rec: BossRecord = {
    beaten: { ...prev.beaten, [diff]: true },
    best: { ...prev.best, [diff]: best },
    bestTime: { ...prev.bestTime, [diff]: Math.min(prev.bestTime[diff] ?? Infinity, timeSec) },
  };
  const ember = bossId !== 'maestro' && !s.embers.includes(bossId);
  const coinId = `boss:${bossId}`;
  const coins = s.coinsCollected.includes(coinId) || bossId === 'maestro' ? 0 : firstWinCoins;
  let next: SaveData = {
    ...s,
    bosses: { ...s.bosses, [bossId]: rec },
    embers: ember ? [...s.embers, bossId] : s.embers,
    coins: s.coins + coins,
    coinsCollected: coins ? [...s.coinsCollected, coinId] : s.coinsCollected,
    stats: { ...s.stats, wins: s.stats.wins + 1 },
  };
  if (bossId === 'maestro') next = { ...next, finished: true, expertUnlocked: true };
  return { save: next, newRecord, ember, coins };
}

export function recordStageClear(s: SaveData, stageId: string, grade: Grade, timeSec: number): SaveData {
  const prev = s.stages[stageId] ?? { done: false, best: null, bestTime: null };
  return {
    ...s,
    stages: { ...s.stages, [stageId]: { done: true, best: betterGrade(prev.best, grade), bestTime: Math.min(prev.bestTime ?? Infinity, timeSec) } },
  };
}
