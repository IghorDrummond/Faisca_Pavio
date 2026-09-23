import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buy, creditCoins, totalCoinsAvailable, totalShopCost } from '../../src/core/economy';
import { finalBossAllowed, recordBossWin } from '../../src/core/progression';
import { computeRank } from '../../src/core/ranking';
import { exportSaveText, importSaveText, migrate, newSave, parseSave, SAVE_SCHEMA } from '../../src/core/save';
import { analogToDirBits, Btn, dirIndexFromXY, InputBuffer } from '../../src/core/input';
import { FixedStepper } from '../../src/core/loop';
import { createBossBattle } from '../../src/core/factory';
import { DIFFICULTIES, RANKING } from '../../src/data/difficulty';
import { SaveStore } from '../../src/platform/storage';
import { sanitizeSettings } from '../../src/services/settings';
import { secToTicks } from '../../src/core/constants';
import { BOSSES } from '../../src/data/bosses';
import { Btn as B } from '../../src/core/input';
import { emptyArena } from '../helpers';

describe('TEST-08 ranking', () => {
  const baseIn = { timeSec: 100, targetTime: 110, hpLeft: 3, parries: 3, cardsUsed: 6, damageTaken: 0, gameSpeed: 1 };
  it('S só no Especialista, sem dano e abaixo do tempo-alvo', () => {
    expect(computeRank({ ...baseIn, difficulty: 'especialista' }, RANKING).grade).toBe('S');
    expect(computeRank({ ...baseIn, difficulty: 'normal' }, RANKING).grade).toBe('A+');
    expect(computeRank({ ...baseIn, difficulty: 'especialista', damageTaken: 1, hpLeft: 2 }, RANKING).grade).not.toBe('S');
    expect(computeRank({ ...baseIn, difficulty: 'especialista', timeSec: 120 }, RANKING).grade).not.toBe('S');
  });
  it('Simples limitado a B; pior caso D; limites de parries e cartas', () => {
    expect(computeRank({ ...baseIn, difficulty: 'simples' }, RANKING).grade).toBe('B');
    expect(computeRank({ timeSec: 999, targetTime: 110, hpLeft: 0, parries: 0, cardsUsed: 0, damageTaken: 5, difficulty: 'normal', gameSpeed: 1 }, RANKING).grade).toBe('D');
    const a = computeRank({ ...baseIn, difficulty: 'normal', parries: 3, cardsUsed: 6 }, RANKING).score;
    const b = computeRank({ ...baseIn, difficulty: 'normal', parries: 30, cardsUsed: 60 }, RANKING).score;
    expect(a).toBe(b);
  });
  it('velocidade reduzida marca o resultado como assistido', () => {
    expect(computeRank({ ...baseIn, difficulty: 'normal', gameSpeed: 0.85 }, RANKING).assisted).toBe(true);
  });
});

describe('TEST-09 economia', () => {
  it('compra com saldo, recusa sem saldo e nunca duplica', () => {
    let s = { ...newSave(0, 'normal', 0), coins: 5 };
    const r1 = buy(s, { kind: 'weapon', id: 'leque' });
    expect(r1.result).toBe('ok');
    s = r1.save;
    expect(s.coins).toBe(1);
    expect(buy(s, { kind: 'weapon', id: 'leque' }).result).toBe('owned');
    expect(buy(s, { kind: 'charm', id: 'cartolaSorte' }).result).toBe('poor');
  });
  it('moedas de fase só são creditadas uma vez (na conclusão)', () => {
    let s = newSave(0, 'normal', 0);
    s = creditCoins(s, ['runngun1:c1', 'runngun1:c2']).save;
    expect(s.coins).toBe(2);
    const again = creditCoins(s, ['runngun1:c1']);
    expect(again.gained).toBe(0);
    expect(again.save.coins).toBe(2);
  });
  it('~85% das moedas compram tudo', () => {
    expect(totalCoinsAvailable() * 0.85).toBeGreaterThanOrEqual(totalShopCost());
  });
  it('Brasa em qualquer dificuldade; chefe final exige Normal+', () => {
    let s = newSave(0, 'simples', 0);
    for (const b of ['cuco', 'agulha', 'gramofone', 'bigorna', 'fuligem']) s = recordBossWin(s, b, 'simples', 'B', 100, 2).save;
    expect(s.embers.length).toBe(5);
    expect(finalBossAllowed(s)).toBe(false);
    for (const b of ['cuco', 'agulha', 'gramofone', 'bigorna', 'fuligem']) s = recordBossWin(s, b, 'normal', 'A', 100, 2).save;
    expect(finalBossAllowed(s)).toBe(true);
    // moedas da primeira vitória só uma vez por chefe
    expect(s.coins).toBe(10);
  });
});

describe('TEST-10 save', () => {
  it('ida e volta no IndexedDB (simulado)', async () => {
    const st = new SaveStore(indexedDB);
    expect(await st.open()).toBe('indexeddb');
    const s = { ...newSave(1, 'normal', 1), coins: 7 };
    await st.write(s);
    const r = await st.load(1);
    expect(r.save?.coins).toBe(7);
  });
  it('corrompido → recupera do backup', async () => {
    const st = new SaveStore(indexedDB);
    await st.open();
    await st.write({ ...newSave(2, 'normal', 1), coins: 3 });
    await st.write({ ...newSave(2, 'normal', 1), coins: 4 });
    await st.writeRawForTest('slot2', { lixo: true });
    const r = await st.load(2);
    expect(r.corrupt).toBe(true);
    expect(r.recovered).toBe(true);
    expect(r.save?.coins).toBe(3);
  });
  it('sem IndexedDB usa memória', async () => {
    const st = new SaveStore(null);
    expect(await st.open()).toBe('memory');
    await st.write(newSave(0, 'normal', 0));
    expect((await st.load(0)).save).not.toBeNull();
  });
  it('migração de schema v1 → atual', () => {
    const v1 = { ...newSave(0, 'normal', 0), schema: 1 } as Record<string, unknown>;
    delete (v1.stats as Record<string, unknown>).wins;
    const m = migrate(v1) as { schema: number };
    expect(m.schema).toBe(SAVE_SCHEMA);
    expect(parseSave(v1).stats.wins).toBe(0);
  });
  it('importação: aceita export válido e rejeita inválidos', () => {
    const s = newSave(0, 'normal', 0);
    expect(importSaveText(exportSaveText(s), 2).slot).toBe(2);
    expect(() => importSaveText('{nao json', 0)).toThrow();
    expect(() => importSaveText('x'.repeat(300 * 1024), 0)).toThrow();
    expect(() => importSaveText(JSON.stringify({ ...s, coins: -5 }), 0)).toThrow();
    expect(() => importSaveText(JSON.stringify({ game: 'outro', data: s }), 0)).toThrow();
    expect(() => importSaveText(JSON.stringify({ ...s, equip: { ...s.equip, weapons: ['rojao', 'reta'] } }), 0)).toThrow();
    expect(() => importSaveText(JSON.stringify({ ...s, bosses: { __proto__: {} } }), 0)).not.toThrow();
  });
});

describe('TEST-11 configurações', () => {
  it('valores inválidos voltam ao padrão', () => {
    const { settings, fixed } = sanitizeSettings({ master: 7, grain: 0.3, lang: 'xx', gameSpeed: 0.5, keys: { solo: 'nada' } });
    expect(settings.master).toBe(0.8);
    expect(settings.grain).toBe(0.3);
    expect(settings.lang).toBe('pt-BR');
    expect(settings.gameSpeed).toBe(1);
    expect(fixed).toEqual(expect.arrayContaining(['master', 'lang', 'gameSpeed', 'keys']));
  });
  it('tecla reservada do navegador é rejeitada', () => {
    const { fixed } = sanitizeSettings({ keys: { solo: { left: ['F5'] } } });
    expect(fixed).toContain('keys');
  });
});

describe('TEST-12 dificuldade', () => {
  it('multiplicadores e telegraph mínimo', () => {
    expect(DIFFICULTIES.simples.projectileSpeed).toBe(0.8);
    expect(DIFFICULTIES.especialista.projectileSpeed).toBe(1.2);
    expect(DIFFICULTIES.especialista.bossHp).toBe(1.25);
    for (const d of Object.values(DIFFICULTIES)) {
      const sim = createBossBattle(BOSSES.cuco!, { difficulty: d.id });
      for (const a of BOSSES.cuco!.attacks) expect(sim.boss!.telegraphTicksFor(a)).toBeGreaterThanOrEqual(secToTicks(d.minTelegraph));
    }
    expect(DIFFICULTIES.especialista.minTelegraph).toBeGreaterThanOrEqual(0.35);
    const e = createBossBattle(BOSSES.cuco!, { difficulty: 'especialista' });
    const n = createBossBattle(BOSSES.cuco!, { difficulty: 'normal' });
    expect(e.boss!.maxHp).toBe(Math.round(n.boss!.maxHp * 1.25));
  });
  it('co-op dá +50% de vida ao chefe', () => {
    const solo = createBossBattle(BOSSES.cuco!, {});
    const co = createBossBattle(BOSSES.cuco!, { coop: true });
    expect(co.boss!.maxHp).toBe(Math.round(solo.boss!.maxHp * 1.5));
  });
});

describe('TEST-13 input', () => {
  it('buffer expira', () => {
    const b = new InputBuffer(3);
    b.push();
    b.tick();
    b.tick();
    expect(b.active).toBe(true);
    b.tick();
    expect(b.active).toBe(false);
  });
  it('analógico em 8 setores com zona morta', () => {
    expect(analogToDirBits(0.1, 0.1, 0.3)).toBe(0);
    expect(analogToDirBits(1, 0, 0.3)).toBe(Btn.Right);
    expect(analogToDirBits(0.7, -0.7, 0.3)).toBe(Btn.Right | Btn.Up);
    expect(analogToDirBits(0.9, -0.42, 0.3)).toBe(Btn.Right | Btn.Up); // 25° → diagonal
    expect(analogToDirBits(0.95, -0.3, 0.3)).toBe(Btn.Right); // 17,5° → horizontal
    expect(dirIndexFromXY(0, 1)).toBe(2);
  });
  it('toque rápido durante hit stop não se perde', () => {
    const sim = emptyArena();
    for (let i = 0; i < 40; i++) {
      sim.feedInput(0, 0);
      sim.step();
    }
    const p = sim.players[0]!;
    sim.requestHitstop(5);
    sim.feedInput(0, B.Jump);
    sim.step();
    sim.feedInput(0, 0);
    for (let i = 0; i < 6; i++) sim.step();
    expect(p.vy).toBeLessThan(0);
  });
});

describe('TEST-20 física idêntica com render a 30/60/144 Hz', () => {
  function simulate(fps: number): { x: number; minY: number } {
    const sim = emptyArena();
    const st = new FixedStepper();
    const p = sim.players[0]!;
    let t = 0;
    let minY = 9999;
    let ticks = 0;
    // mesmo roteiro de input por tick (independente do quadro)
    while (ticks < 200) {
      t += 1000 / fps;
      const n = st.advance(1000 / fps);
      for (let i = 0; i < n; i++) {
        const k = ticks++;
        const bits = k > 40 && k < 60 ? B.Right | B.Jump : k > 90 && k < 92 ? B.Dash : 0;
        sim.feedInput(0, bits);
        sim.step();
        sim.events.clear();
        minY = Math.min(minY, p.y);
        if (ticks >= 200) break;
      }
    }
    void t;
    return { x: p.x, minY };
  }
  it('altura de pulo e distância de dash iguais', () => {
    const a = simulate(30);
    const b = simulate(60);
    const c = simulate(144);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });
});
