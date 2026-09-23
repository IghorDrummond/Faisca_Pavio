import { describe, expect, it } from 'vitest';
import { balanceTable, TARGET_RANGE } from '../../src/core/balance';
import { BOSSES } from '../../src/data/bosses';

describe('TEST-23 balanceamento', () => {
  it('tempo teórico de vitória no Normal com a arma inicial dentro de 90–180 s', () => {
    for (const r of balanceTable(Object.values(BOSSES)).filter((x) => x.difficulty === 'normal' && x.weapon === 'reta')) {
      expect(r.seconds, r.boss).toBeGreaterThanOrEqual(TARGET_RANGE[0]);
      expect(r.seconds, r.boss).toBeLessThanOrEqual(TARGET_RANGE[1]);
    }
  });
  it('nenhuma arma vence em menos da metade do tempo da inicial (sem arma "quebrada")', () => {
    const rows = balanceTable(Object.values(BOSSES)).filter((x) => x.difficulty === 'normal');
    for (const b of Object.keys(BOSSES)) {
      const base = rows.find((r) => r.boss === b && r.weapon === 'reta')!.seconds;
      for (const r of rows.filter((x) => x.boss === b)) expect(r.seconds).toBeGreaterThan(base * 0.6);
    }
  });
});
