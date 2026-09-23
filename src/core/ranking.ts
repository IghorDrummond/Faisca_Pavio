import type { DifficultyId, Grade, RankingTable } from './types';

export interface RankInput {
  timeSec: number;
  targetTime: number;
  hpLeft: number;
  parries: number;
  cardsUsed: number;
  difficulty: DifficultyId;
  damageTaken: number;
  /** velocidade reduzida (acessibilidade) — registrada no ranking */
  gameSpeed: number;
}

export interface RankResult {
  score: number;
  grade: Grade;
  breakdown: { time: number; hp: number; parry: number; super: number; noDamage: number; difficulty: number };
  assisted: boolean;
}

const GRADE_ORDER: Grade[] = ['D', 'C', 'B', 'A', 'A+', 'S'];

export function gradeValue(g: Grade): number {
  return GRADE_ORDER.indexOf(g);
}

export function betterGrade(a: Grade | null, b: Grade | null): Grade | null {
  if (!a) return b;
  if (!b) return a;
  return gradeValue(a) >= gradeValue(b) ? a : b;
}

/** Calcula a nota da batalha a partir da tabela de dados. */
export function computeRank(r: RankInput, table: RankingTable): RankResult {
  // tempo: pontos cheios até o alvo, caindo linearmente até 0 em 2x o alvo
  const tRatio = r.timeSec / Math.max(1, r.targetTime);
  const time = Math.round(table.timePoints * Math.max(0, Math.min(1, 2 - tRatio)));
  const hp = table.hpPoints * Math.max(0, Math.min(3, r.hpLeft));
  const parry = table.parryPoints * Math.min(table.maxParries, Math.max(0, r.parries));
  const sup = table.superPoints * Math.min(table.maxSuperCards, Math.max(0, r.cardsUsed));
  const noDamage = r.damageTaken === 0 ? table.noDamageBonus : 0;
  const difficulty = table.difficultyPoints[r.difficulty];
  const score = time + hp + parry + sup + noDamage + difficulty;
  let grade: Grade = 'D';
  for (const g of table.grades) {
    if (score >= g.min) {
      grade = g.grade;
      break;
    }
  }
  // S só no Especialista, sem dano e abaixo do tempo-alvo
  if (grade === 'S' && !(r.difficulty === 'especialista' && r.damageTaken === 0 && r.timeSec <= r.targetTime)) grade = 'A+';
  const cap = table.maxGradeByDifficulty[r.difficulty];
  if (gradeValue(grade) > gradeValue(cap)) grade = cap;
  return { score, grade, breakdown: { time, hp, parry, super: sup, noDamage, difficulty }, assisted: r.gameSpeed < 1 };
}
