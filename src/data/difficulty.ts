import type { DifficultyDef, DifficultyId, RankingTable } from '../core/types';

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  simples: {
    id: 'simples',
    projectileSpeed: 0.8,
    telegraph: 1.25,
    bossHp: 1,
    skipLastPhase: true,
    expertPatterns: false,
    minTelegraph: 0.5,
  },
  normal: {
    id: 'normal',
    projectileSpeed: 1,
    telegraph: 1,
    bossHp: 1,
    skipLastPhase: false,
    expertPatterns: false,
    minTelegraph: 0.4,
  },
  especialista: {
    id: 'especialista',
    projectileSpeed: 1.2,
    telegraph: 0.85,
    bossHp: 1.25,
    skipLastPhase: false,
    expertPatterns: true,
    minTelegraph: 0.35,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['simples', 'normal', 'especialista'];

/** Multiplicador de vida dos chefes em co-op. */
export const COOP_BOSS_HP_MULT = 1.5;

/**
 * Regra de progressão: o chefe final exige que todos os chefes tenham sido vencidos
 * no Normal ou superior (Simples concede a Brasa, mas não libera o Teatro).
 */
export const FINAL_BOSS_MIN_DIFFICULTY: DifficultyId = 'normal';

export const RANKING: RankingTable = {
  timePoints: 20,
  hpPoints: 10, // por ponto de vida restante (máx. 3 contados)
  parryPoints: 10,
  maxParries: 3,
  superPoints: 5,
  maxSuperCards: 6,
  noDamageBonus: 10,
  difficultyPoints: { simples: 0, normal: 10, especialista: 20 },
  grades: [
    { grade: 'S', min: 120 },
    { grade: 'A+', min: 100 },
    { grade: 'A', min: 85 },
    { grade: 'B', min: 65 },
    { grade: 'C', min: 45 },
    { grade: 'D', min: 0 },
  ],
  maxGradeByDifficulty: { simples: 'B', normal: 'A+', especialista: 'S' },
};
