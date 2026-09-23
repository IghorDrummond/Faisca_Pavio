import type { BossDef } from '../../core/types';
import { CUCO } from './cuco';
import { AGULHA } from './agulha';
import { GRAMOFONE } from './gramofone';
import { BIGORNA } from './bigorna';
import { FULIGEM } from './fuligem';
import { MAESTRO } from './maestro';

/** Registro de chefes (ordem do jogo). */
export const BOSSES: Record<string, BossDef> = {
  cuco: CUCO,
  agulha: AGULHA,
  gramofone: GRAMOFONE,
  bigorna: BIGORNA,
  fuligem: FULIGEM,
  maestro: MAESTRO,
};

export const BOSS_ORDER = Object.keys(BOSSES);
