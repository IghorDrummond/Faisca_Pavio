import type { BattleSim } from '../core/battle';
import { createBossBattle, DEFAULT_LOADOUT } from '../core/factory';
import type { PlayerLoadout } from '../core/player';
import type { DifficultyId } from '../core/types';
import { BOSSES } from '../data/bosses';
import { SettingsService } from '../services/settings';
import { createStage, STAGE_INFO } from './stages';
import './stageRegistry';

export interface BattleParams {
  kind: 'boss' | 'stage';
  id: string;
  difficulty: DifficultyId;
  coop: boolean;
  seed: number;
  loadout?: PlayerLoadout;
  phase?: number;
  from: 'map' | 'debug' | 'menu';
  autoplay?: boolean;
}

export interface BattleSetup {
  sim: BattleSim;
  bossId: string | null;
  song: string;
  title: string;
  quote: string;
  targetTime: number;
  coins: number;
}

export function buildBattle(p: BattleParams): BattleSetup {
  const loadout = p.loadout ?? DEFAULT_LOADOUT;
  const autoFire: [boolean, boolean] = [SettingsService.get('autoFire1'), SettingsService.get('autoFire2')];
  if (p.kind === 'boss') {
    const def = BOSSES[p.id];
    if (!def) throw new Error(`chefe desconhecido: ${p.id}`);
    const sim = createBossBattle(def, { difficulty: p.difficulty, seed: p.seed, coop: p.coop, loadouts: [loadout, loadout], autoFire });
    return { sim, bossId: p.id, song: p.id, title: '', quote: '', targetTime: def.targetTime, coins: def.coins };
  }
  const st = STAGE_INFO[p.id];
  if (!st) throw new Error(`fase desconhecida: ${p.id}`);
  const sim = createStage(p.id, { difficulty: p.difficulty, seed: p.seed, coop: p.coop, loadouts: [loadout, loadout], autoFire });
  return { sim, bossId: st.bossVisual ?? null, song: st.song, title: st.title, quote: st.quote, targetTime: st.targetTime, coins: 0 };
}
