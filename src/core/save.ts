import type { CharmId, DifficultyId, Grade, SuperId, WeaponId } from './types';
import { V, ValidationError, type Validator } from './validate';

export const SAVE_SCHEMA = 2;
export const MAX_IMPORT_BYTES = 256 * 1024;

export interface BossRecord {
  beaten: Record<DifficultyId, boolean>;
  best: Record<DifficultyId, Grade | null>;
  bestTime: Record<DifficultyId, number | null>;
}

export interface SaveData {
  schema: number;
  slot: number;
  createdAt: number;
  updatedAt: number;
  playTime: number;
  difficulty: DifficultyId;
  coins: number;
  /** ids de moedas já creditadas (fase:índice, mapa:índice, npc:id, boss:id...) */
  coinsCollected: string[];
  owned: { weapons: WeaponId[]; charms: CharmId[]; supers: SuperId[] };
  equip: { weapons: [WeaponId, WeaponId]; superId: SuperId; charm: CharmId | null };
  bosses: Record<string, BossRecord>;
  stages: Record<string, { done: boolean; best: Grade | null; bestTime: number | null }>;
  embers: string[];
  map: { x: number; y: number; island: number };
  flags: string[];
  stats: { deaths: number; retries: number; parries: number; wins: number };
  finished: boolean;
  expertUnlocked: boolean;
}

const DIFF = V.literal<DifficultyId>('simples', 'normal', 'especialista');
const GRADE = V.nullable(V.literal<Grade>('D', 'C', 'B', 'A', 'A+', 'S'));
const WEAPON = V.literal<WeaponId>('reta', 'leque', 'teleguiada', 'rojao');
const CHARM = V.literal<CharmId>('coracaoCera', 'fumacaPalco', 'luvaMagnetica', 'cartolaSorte');
const SUPER = V.literal<SuperId>('chamaMestra', 'pavioLongo', 'braseiroGemeo');
const ID = V.string({ max: 48 });
const perDiff = <T>(v: Validator<T>): Validator<Record<DifficultyId, T>> =>
  V.object({ simples: v, normal: v, especialista: v }) as Validator<Record<DifficultyId, T>>;

const bossRecord: Validator<BossRecord> = V.object({
  beaten: perDiff(V.boolean()),
  best: perDiff(GRADE),
  bestTime: perDiff(V.nullable(V.number({ min: 0, max: 1e6 }))),
}) as Validator<BossRecord>;

export const saveValidator: Validator<SaveData> = V.object({
  schema: V.number({ int: true, min: 1, max: SAVE_SCHEMA }),
  slot: V.number({ int: true, min: 0, max: 2 }),
  createdAt: V.number({ min: 0 }),
  updatedAt: V.number({ min: 0 }),
  playTime: V.number({ min: 0, max: 1e9 }),
  difficulty: DIFF,
  coins: V.number({ int: true, min: 0, max: 999 }),
  coinsCollected: V.array(ID, { max: 200 }),
  owned: V.object({ weapons: V.array(WEAPON, { max: 4 }), charms: V.array(CHARM, { max: 4 }), supers: V.array(SUPER, { max: 3 }) }),
  equip: V.object({
    weapons: ((v, p) => {
      const arr = V.array(WEAPON, { max: 2 })(v, p);
      if (arr.length !== 2) throw new ValidationError(p, 'duas armas esperadas');
      return arr as [WeaponId, WeaponId];
    }) as Validator<[WeaponId, WeaponId]>,
    superId: SUPER,
    charm: V.nullable(CHARM),
  }),
  bosses: V.record(ID, bossRecord, { max: 16 }),
  stages: V.record(ID, V.object({ done: V.boolean(), best: GRADE, bestTime: V.nullable(V.number({ min: 0 })) }), { max: 16 }),
  embers: V.array(ID, { max: 16 }),
  map: V.object({ x: V.number({ min: -10000, max: 10000 }), y: V.number({ min: -10000, max: 10000 }), island: V.number({ int: true, min: 0, max: 3 }) }),
  flags: V.array(ID, { max: 200 }),
  stats: V.object({ deaths: V.number({ min: 0 }), retries: V.number({ min: 0 }), parries: V.number({ min: 0 }), wins: V.number({ min: 0 }) }),
  finished: V.boolean(),
  expertUnlocked: V.boolean(),
}) as Validator<SaveData>;

export function newSave(slot: number, difficulty: DifficultyId, now: number): SaveData {
  return {
    schema: SAVE_SCHEMA,
    slot,
    createdAt: now,
    updatedAt: now,
    playTime: 0,
    difficulty,
    coins: 0,
    coinsCollected: [],
    owned: { weapons: ['reta'], charms: [], supers: [] },
    equip: { weapons: ['reta', 'reta'], superId: 'chamaMestra', charm: null },
    bosses: {},
    stages: {},
    embers: [],
    map: { x: 300, y: 820, island: 0 },
    flags: [],
    stats: { deaths: 0, retries: 0, parries: 0, wins: 0 },
    finished: false,
    expertUnlocked: false,
  };
}

/**
 * Migrações por versão de schema. v1 → v2: adiciona stats.wins e stages[].bestTime.
 * Cada migração recebe o objeto bruto e devolve o da versão seguinte.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  1: (raw) => {
    const stats = (raw.stats as Record<string, unknown> | undefined) ?? {};
    const stages = (raw.stages as Record<string, Record<string, unknown>> | undefined) ?? {};
    const st2: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(stages)) st2[k] = { ...v, bestTime: v.bestTime ?? null };
    return { ...raw, schema: 2, stats: { deaths: 0, retries: 0, parries: 0, ...stats, wins: stats.wins ?? 0 }, stages: st2 };
  },
};

export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  let obj = raw as Record<string, unknown>;
  let guard = 0;
  while (typeof obj.schema === 'number' && obj.schema < SAVE_SCHEMA && guard++ < 10) {
    const m = MIGRATIONS[obj.schema];
    if (!m) break;
    obj = m(obj);
  }
  return obj;
}

/** Valida (após migrar). Lança ValidationError se inválido. */
export function parseSave(raw: unknown): SaveData {
  const data = saveValidator(migrate(raw), 'save');
  // consistência: equipamento precisa estar possuído
  for (const w of data.equip.weapons) if (!data.owned.weapons.includes(w)) throw new ValidationError('save.equip', 'arma não possuída');
  if (data.equip.charm && !data.owned.charms.includes(data.equip.charm)) throw new ValidationError('save.equip', 'amuleto não possuído');
  return data;
}

/** Importação de arquivo: tamanho, JSON e schema. Nunca usa eval. */
export function importSaveText(text: string, slot: number): SaveData {
  if (text.length > MAX_IMPORT_BYTES) throw new ValidationError('arquivo', 'grande demais');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ValidationError('arquivo', 'não é JSON válido');
  }
  if (typeof raw === 'object' && raw !== null && 'game' in raw) {
    const wrapper = raw as { game: unknown; data: unknown };
    if (wrapper.game !== 'faisca-e-pavio') throw new ValidationError('arquivo', 'não é um save deste jogo');
    raw = wrapper.data;
  }
  const data = parseSave(raw);
  return { ...data, slot };
}

export function exportSaveText(s: SaveData): string {
  return JSON.stringify({ game: 'faisca-e-pavio', exportedAt: new Date().toISOString(), data: s }, null, 2);
}

/** Percentual de progresso exibido no slot. */
export function progressPercent(s: SaveData, bossIds: string[], stageIds: string[]): number {
  const total = bossIds.length + stageIds.length + 1;
  let done = 0;
  for (const b of bossIds) if (s.bosses[b] && Object.values(s.bosses[b]!.beaten).some(Boolean)) done++;
  for (const st of stageIds) if (s.stages[st]?.done) done++;
  if (s.finished) done++;
  return Math.round((done / total) * 100);
}
