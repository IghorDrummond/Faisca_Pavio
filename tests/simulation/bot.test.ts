import { describe, expect, it } from 'vitest';
import type { BattleSim } from '../../src/core/battle';
import { BotBrain } from '../../src/core/bot';
import { createBossBattle } from '../../src/core/factory';
import { BOSSES } from '../../src/data/bosses';
import { createStage } from '../../src/game/stages';
import '../../src/game/stageRegistry';

const SEEDS = Number(process.env.BOT_SEEDS ?? 10);

/** Roda o bot até vitória/derrota ou limite; retorna ticks e estado. */
function play(sim: BattleSim, maxTicks: number): { result: string; ticks: number; stuckAt: string } {
  const bots = [new BotBrain(), new BotBrain()];
  let t = 0;
  for (; t < maxTicks && sim.result === 'none'; t++) {
    sim.feedInput(0, bots[0]!.decide(sim, 0));
    sim.feedInput(1, bots[1]!.decide(sim, 1));
    sim.step();
    sim.events.clear();
    // estados impossíveis
    for (const p of sim.players) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('posição inválida');
    }
    if (sim.boss && !Number.isFinite(sim.boss.hp)) throw new Error('vida do chefe inválida');
  }
  const b = sim.boss;
  return { result: sim.result, ticks: t, stuckAt: b ? `${b.state}/fase ${b.phaseIndex}/hp ${Math.round(b.hp)}` : `progresso ${Math.round(sim.progress * 100)}%` };
}

describe('TEST-24 bot de simulação vence em modo invencível sem soft-lock', () => {
  for (const boss of Object.values(BOSSES)) {
    it(`${boss.id} (${SEEDS} sementes)`, () => {
      for (let s = 1; s <= SEEDS; s++) {
        const sim = createBossBattle(boss, { seed: s * 101, difficulty: 'normal' });
        sim.invincible = true;
        const r = play(sim, 60 * 60 * 8);
        expect(r.result, `semente ${s * 101}: ${r.stuckAt}`).toBe('victory');
      }
    });
  }
  for (const id of ['tutorial', 'runngun1', 'runngun2', 'challenge1', 'challenge2']) {
    it(`fase ${id}`, () => {
      for (let s = 1; s <= Math.max(2, Math.floor(SEEDS / 3)); s++) {
        const sim = createStage(id, { seed: s * 37, difficulty: 'normal' });
        sim.invincible = true;
        const r = play(sim, 60 * 60 * 8);
        expect(r.result, `${id} semente ${s * 37}: ${r.stuckAt}`).toBe('victory');
      }
    });
  }
  it('co-op: dois bots vencem o Senhor Cuco', () => {
    const sim = createBossBattle(BOSSES.cuco!, { seed: 9, coop: true });
    sim.invincible = true;
    expect(play(sim, 60 * 60 * 8).result).toBe('victory');
  });
});
