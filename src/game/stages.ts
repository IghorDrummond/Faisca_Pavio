import type { BattleSim } from '../core/battle';
import type { BattleOptions } from '../core/factory';

/** Informações das fases não-chefe (tutorial, run'n'gun, desafios). Preenchido pelos módulos de fase. */
export interface StageInfo {
  title: string;
  quote: string;
  song: string;
  targetTime: number;
  bossVisual?: string;
  create: (opts: BattleOptions) => BattleSim;
}

export const STAGE_INFO: Record<string, StageInfo> = {};

export function registerStage(id: string, info: StageInfo): void {
  STAGE_INFO[id] = info;
}

export function createStage(id: string, opts: BattleOptions): BattleSim {
  const info = STAGE_INFO[id];
  if (!info) throw new Error(`fase desconhecida: ${id}`);
  return info.create(opts);
}
