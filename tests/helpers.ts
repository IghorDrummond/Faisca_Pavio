import type { BattleSim } from '../src/core/battle';
import { BattleSim as Sim } from '../src/core/battle';
import { DIFFICULTIES } from '../src/data/difficulty';
import { DEFAULT_LOADOUT } from '../src/core/factory';

/** Arena vazia (sem chefe) para testar o jogador isoladamente. */
export function emptyArena(opts: { platforms?: { x: number; y: number; w: number }[]; seed?: number } = {}): BattleSim {
  return new Sim({
    mode: 'ground',
    boss: null,
    module: null,
    difficulty: DIFFICULTIES.normal,
    seed: opts.seed ?? 1,
    players: [
      { character: 'faisca', loadout: { ...DEFAULT_LOADOUT, weapons: ['reta', 'rojao'] }, joined: true },
      { character: 'pavio', loadout: DEFAULT_LOADOUT, joined: false },
    ],
    floorY: 900,
    left: 0,
    right: 1920,
    platforms: opts.platforms ?? [],
    spawnX: [900, 800],
    spawnY: 900,
  });
}

/** Roda n ticks com um input constante (bitmask) para o jogador 0. */
export function run(sim: BattleSim, ticks: number, buttons = 0, p2 = 0): void {
  for (let i = 0; i < ticks; i++) {
    sim.feedInput(0, buttons);
    sim.feedInput(1, p2);
    sim.step();
    sim.events.clear();
  }
}

/** Avança até sair da intro. */
export function settle(sim: BattleSim): void {
  run(sim, 40, 0);
}
