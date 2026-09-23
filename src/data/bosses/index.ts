import type { BossDef } from '../../core/types';
import { CUCO } from './cuco';

/** Registro de chefes (ordem do jogo). */
export const BOSSES: Record<string, BossDef> = {
  cuco: CUCO,
};

export const BOSS_ORDER = Object.keys(BOSSES);
