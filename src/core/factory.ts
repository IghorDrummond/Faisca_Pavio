import { BattleSim, type BattleConfig, type PlayerConfig, type StageModule } from './battle';
import type { PlayerLoadout } from './player';
import type { BossDef, DifficultyId } from './types';
import { DIFFICULTIES } from '../data/difficulty';

export const DEFAULT_LOADOUT: PlayerLoadout = { weapons: ['reta', 'leque'], superId: 'chamaMestra', charm: null };

export interface BattleOptions {
  difficulty?: DifficultyId;
  seed?: number;
  coop?: boolean;
  loadouts?: [PlayerLoadout, PlayerLoadout?];
  autoFire?: [boolean, boolean];
}

function playerConfigs(opts: BattleOptions): PlayerConfig[] {
  const l0 = opts.loadouts?.[0] ?? DEFAULT_LOADOUT;
  const l1 = opts.loadouts?.[1] ?? l0;
  return [
    { character: 'faisca', loadout: { ...l0, weapons: [...l0.weapons] }, joined: true, autoFire: opts.autoFire?.[0] ?? false },
    { character: 'pavio', loadout: { ...l1, weapons: [...l1.weapons] }, joined: opts.coop === true, autoFire: opts.autoFire?.[1] ?? false },
  ];
}

export function createBossBattle(boss: BossDef, opts: BattleOptions = {}): BattleSim {
  const air = boss.mode === 'air';
  const cfg: BattleConfig = {
    mode: air ? 'plane' : 'ground',
    boss,
    module: null,
    difficulty: DIFFICULTIES[opts.difficulty ?? 'normal'],
    seed: opts.seed ?? 1,
    players: playerConfigs(opts),
    floorY: boss.arena.floorY,
    left: boss.arena.left,
    right: boss.arena.right,
    platforms: boss.arena.platforms,
    spawnX: air ? [300, 300] : [320, 200],
    spawnY: air ? 540 : boss.arena.floorY,
    bpm: boss.bpm ?? 120,
  };
  if (air) cfg.spawnX = [300, 260];
  const sim = new BattleSim(cfg);
  if (air) {
    sim.players.forEach((p, i) => {
      p.y = p.py = 460 + i * 160;
    });
  }
  return sim;
}

export function createStageBattle(
  module: StageModule,
  opts: BattleOptions & { floorY?: number; spawnX?: number; mode?: 'ground' | 'plane'; right?: number },
): BattleSim {
  const cfg: BattleConfig = {
    mode: opts.mode ?? 'ground',
    boss: null,
    module,
    difficulty: DIFFICULTIES[opts.difficulty ?? 'normal'],
    seed: opts.seed ?? 1,
    players: playerConfigs(opts),
    floorY: opts.floorY ?? 900,
    left: 0,
    right: opts.right ?? 1920,
    platforms: [],
    spawnX: [opts.spawnX ?? 240, (opts.spawnX ?? 240) - 110],
    spawnY: opts.floorY ?? 900,
  };
  return new BattleSim(cfg);
}
