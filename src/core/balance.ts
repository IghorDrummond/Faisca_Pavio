import type { BossDef, WeaponId } from './types';
import { WEAPONS } from '../data/weapons';
import { DIFFICULTIES } from '../data/difficulty';

/** Fração do tempo em que o jogador consegue acertar o chefe (desviando, transições, respiros). */
export const UPTIME = 0.62;
/** Faixa de duração-alvo de uma vitória limpa no Normal (s). */
export const TARGET_RANGE: [number, number] = [90, 180];

export function weaponDps(id: WeaponId): number {
  const w = WEAPONS[id];
  if (w.pattern === 'charge' && w.charge) return w.charge.damage / (w.charge.time + w.charge.recovery);
  const shots = w.pattern === 'spread' ? (w.spreadDeg?.length ?? 1) : 1;
  return (w.damage * shots) / w.fireInterval;
}

export interface BalanceRow {
  boss: string;
  difficulty: string;
  weapon: WeaponId;
  hp: number;
  dps: number;
  seconds: number;
  transitions: number;
}

/** Tempo teórico de vitória (inclui transições de fase e intro). */
export function theoreticalTime(boss: BossDef, weapon: WeaponId, diffId: keyof typeof DIFFICULTIES): BalanceRow {
  const d = DIFFICULTIES[diffId];
  const phases = d.skipLastPhase ? boss.phases.slice(0, -1) : boss.phases;
  const koFrac = d.skipLastPhase ? (boss.phases[boss.phases.length - 1]?.hpStart ?? 0) : 0;
  const hp = boss.hp * d.bossHp * (1 - koFrac);
  const dps = weaponDps(weapon);
  const transitions = phases.slice(1).reduce((a, p) => a + p.transition, 0);
  const seconds = hp / (dps * UPTIME) + transitions + 2.2;
  return { boss: boss.id, difficulty: diffId, weapon, hp: Math.round(hp), dps: Math.round(dps * 10) / 10, seconds: Math.round(seconds), transitions };
}

export function balanceTable(bosses: BossDef[]): BalanceRow[] {
  const rows: BalanceRow[] = [];
  for (const b of bosses) for (const d of Object.keys(DIFFICULTIES) as (keyof typeof DIFFICULTIES)[]) for (const w of Object.keys(WEAPONS) as WeaponId[]) rows.push(theoreticalTime(b, w, d));
  return rows;
}

export function toCsv(rows: BalanceRow[]): string {
  const head = 'chefe;dificuldade;arma;vida;dps;segundos;transicoes';
  return [head, ...rows.map((r) => [r.boss, r.difficulty, r.weapon, r.hp, String(r.dps).replace('.', ','), r.seconds, r.transitions].join(';'))].join('\n');
}
