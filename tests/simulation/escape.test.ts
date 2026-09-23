import { describe, expect, it } from 'vitest';
import { analyzeAirAttack, analyzeAttack } from '../../src/core/escape';
import { BOSSES } from '../../src/data/bosses';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../src/data/difficulty';
import { secToTicks } from '../../src/core/constants';
import { createBossBattle } from '../../src/core/factory';

const SEEDS = Number(process.env.ESCAPE_SEEDS ?? 12);

describe('TEST-21 rota de fuga', () => {
  for (const boss of Object.values(BOSSES)) {
    it(`${boss.id}: todo ataque tem rota de fuga em todas as dificuldades (${SEEDS} sementes)`, () => {
      const fails: string[] = [];
      let runs = 0;
      for (const diff of DIFFICULTY_ORDER) {
        const d = DIFFICULTIES[diff];
        const phases = d.skipLastPhase ? boss.phases.slice(0, -1) : boss.phases;
        phases.forEach((ph, pi) => {
          for (const { id } of ph.attacks) {
            const a = boss.attacks.find((x) => x.id === id)!;
            if (a.expertOnly && !d.expertPatterns) continue;
            for (let s = 1; s <= SEEDS; s++) {
              const r = boss.mode === 'air' ? analyzeAirAttack(boss, pi, id, diff, s * 7919) : analyzeAttack(boss, pi, id, diff, s * 7919);
              runs++;
              if (!r.ok) fails.push(`${diff}/${ph.id}/${id}/semente ${s * 7919} (x0=${Math.round(r.startX)}): ${r.reason}`);
            }
          }
        });
      }
      if (fails.length) console.log(fails.slice(0, 30).join('\n'));
      expect(runs).toBeGreaterThan(0);
      expect(fails).toEqual([]);
    });
  }
});

describe('TEST-22 telegraph mínimo', () => {
  for (const boss of Object.values(BOSSES)) {
    it(`${boss.id}: telegraph ≥ mínimo em todas as dificuldades`, () => {
      for (const diff of DIFFICULTY_ORDER) {
        const sim = createBossBattle(boss, { difficulty: diff });
        const b = sim.boss!;
        for (const a of boss.attacks) {
          expect(b.telegraphTicksFor(a)).toBeGreaterThanOrEqual(secToTicks(DIFFICULTIES[diff].minTelegraph));
        }
        // avisos de perigos/projéteis também respeitam o mínimo
        expect(sim.minWarnTicks).toBe(secToTicks(DIFFICULTIES[diff].minTelegraph));
      }
    });
  }
});
