import { test, expect, ready, tap, battle, battlePhase, menuHas, menuPress, frames } from './fixtures';
import type { Page } from '@playwright/test';

type Save = { stages: Record<string, { done: boolean }>; bosses: Record<string, unknown>; coins: number; map: { x: number; y: number } } | null;
type T = { __FP_TEST__: { save(): Save; battle(): { phase: string; players: { state: string }[] } | null } };

const save = (page: Page): Promise<Save> => page.evaluate(() => (window as unknown as T).__FP_TEST__.save());

async function winBattle(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __BATTLE_CTL__?: unknown }).__BATTLE_CTL__, null, { timeout: 20_000 });
  await ready(page, 'Battle');
  await page.evaluate(() => (window as unknown as { __BATTLE_CTL__: { win: () => void } }).__BATTLE_CTL__.win());
  await ready(page, 'Result', 30_000); // contagem do ranking terminou
  await tap(page, 'Enter');
}

/** Título → menu → Começar → Espetáculo 1 (menu de slot aberto). */
async function openSlot1(page: Page): Promise<void> {
  await ready(page, 'Title');
  await tap(page, 'Space');
  await ready(page, 'MainMenu');
  await menuHas(page, 'MainMenu', 'Começar');
  await menuPress(page, 'MainMenu', 'Enter'); // Começar → lista de slots
  await menuHas(page, 'MainMenu', 'Espetáculo 1');
  await menuPress(page, 'MainMenu', 'Enter'); // Espetáculo 1
}

/** Coloca o jogador em cima do nó do Senhor Cuco no mapa. */
async function standOnCuco(page: Page): Promise<void> {
  await page.evaluate(() => {
    const s = (window as unknown as { __GAME__: { scene: { getScene(k: string): { px: number; py: number } } } }).__GAME__.scene.getScene('WorldMap');
    s.px = 900;
    s.py = 790;
  });
  await page.waitForFunction(() => {
    const s = (window as unknown as { __GAME__: { scene: { getScene(k: string): { prompt: { text: string } } } } }).__GAME__.scene.getScene('WorldMap');
    return s.prompt.text.includes('Entrar');
  });
}

test('TEST-32 novo jogo → tutorial → mapa → batalha → vitória → ranking → salvo → recarrega → mantido', async ({ page, consoleErrors }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await openSlot1(page);
  await menuHas(page, 'MainMenu', 'Novo espetáculo');
  await menuPress(page, 'MainMenu', 'Enter'); // Novo espetáculo → dificuldade
  await menuHas(page, 'MainMenu', 'Normal');
  await tap(page, 'Enter'); // Normal (selecionado por padrão)
  await ready(page, 'Battle');
  const b = await battle(page);
  expect(b.params.id).toBe('tutorial');
  await winBattle(page);
  await ready(page, 'WorldMap');
  const afterTut = await save(page);
  expect(afterTut?.stages.tutorial?.done).toBe(true);
  expect(afterTut?.coins).toBe(2);
  // entra no Senhor Cuco pelo mapa
  await standOnCuco(page);
  await tap(page, 'Enter'); // abre o cartão do nó
  await menuHas(page, 'WorldMap', 'Entrar — Normal');
  expect((await page.evaluate(() => (window as unknown as { __FP_TEST__: { menu(k: string): { labels: string[] } } }).__FP_TEST__.menu('WorldMap').labels)).some((l) => l.includes('Continuar'))).toBe(false);
  await tap(page, 'Enter'); // Entrar
  await ready(page, 'Battle');
  expect((await battle(page)).params.id).toBe('cuco');
  await winBattle(page);
  await ready(page, 'WorldMap');
  // recarrega a página e confirma a persistência
  await page.reload();
  await openSlot1(page);
  await menuHas(page, 'MainMenu', 'Continuar');
  await tap(page, 'Enter'); // Continuar
  await ready(page, 'WorldMap');
  const saved = await save(page);
  expect(saved?.bosses.cuco).toBeTruthy();
  expect(saved?.stages.tutorial?.done).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('TEST-32c cartão do mapa: toques rápidos e controle (gamepad simulado) entram na batalha', async ({ page, consoleErrors }) => {
  test.setTimeout(180_000);
  // controle padrão simulado: o teste controla os botões por window.__pad
  await page.addInitScript(() => {
    const w = window as unknown as { __pad: { buttons: boolean[]; connected: boolean } };
    w.__pad = { buttons: Array<boolean>(17).fill(false), connected: false };
    const fake = (): unknown => ({
      id: 'Controle simulado (STANDARD GAMEPAD)',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: performance.now(),
      axes: [0, 0, 0, 0],
      buttons: w.__pad.buttons.map((p) => ({ pressed: p, touched: p, value: p ? 1 : 0 })),
    });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => (w.__pad.connected ? [fake(), null, null, null] : [null, null, null, null]) });
  });
  await page.goto('/');
  // save com tutorial concluído
  await ready(page, 'Title');
  await page.evaluate(async () => {
    const fp = (window as unknown as { __FP__: { GameState: { store: { write(s: unknown): Promise<void> } }; save: { newSave(n: number, d: string, t: number): Record<string, unknown> } } }).__FP__;
    const s = fp.save.newSave(0, 'normal', Date.now());
    await fp.GameState.store.write({ ...s, stages: { tutorial: { done: true, best: 'B', bestTime: 10 } } });
  });
  await openSlot1(page);
  await menuHas(page, 'MainMenu', 'Continuar');
  await tap(page, 'Enter');
  await ready(page, 'WorldMap');
  await standOnCuco(page);
  // teclado: toque instantâneo abre o cartão; Esc fecha
  await tap(page, 'Enter');
  await menuHas(page, 'WorldMap', 'Entrar — Normal');
  await tap(page, 'Escape');
  await page.waitForFunction(() => (window as unknown as { __FP_TEST__: { menu(k: string): unknown } }).__FP_TEST__.menu('WorldMap') === null);
  // controle: botão A abre o cartão e A de novo entra na batalha
  const setA = (v: boolean): Promise<void> =>
    page.evaluate((x) => {
      const w = window as unknown as { __pad: { buttons: boolean[]; connected: boolean } };
      w.__pad.connected = true;
      w.__pad.buttons[0] = x;
    }, v);
  await setA(false);
  await frames(page, 3);
  await setA(true);
  await menuHas(page, 'WorldMap', 'Entrar — Normal');
  await setA(false);
  await frames(page, 3);
  await setA(true);
  await ready(page, 'Battle');
  expect((await battle(page)).params.id).toBe('cuco');
  await setA(false);
  expect(consoleErrors).toEqual([]);
});

test('TEST-33 retry 20 vezes sem crescer objetos ativos nem gerar erros', async ({ page, consoleErrors }) => {
  test.setTimeout(180_000);
  await page.goto('/?debug=1&boss=cuco&seed=3');
  await battlePhase(page, 'fight');
  const first = await battle(page);
  const times: number[] = [];
  for (let i = 0; i < 20; i++) {
    // tempo real do retry: da chamada até o primeiro quadro renderizado depois dela
    times.push(
      await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const t0 = performance.now();
            (window as unknown as { __BATTLE_CTL__: { retry: () => void } }).__BATTLE_CTL__.retry();
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)));
          }),
      ),
    );
    await battlePhase(page, 'intro');
  }
  await battlePhase(page, 'fight');
  const last = await battle(page);
  expect(last.retries).toBe(20);
  expect(last.children).toBeLessThanOrEqual(first.children + 2);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`[${test.info().project.name}] objetos: ${first.children} → ${last.children}; retry médio ${avg.toFixed(1)} ms, máx ${Math.max(...times).toFixed(1)} ms`);
  expect(Math.max(...times)).toBeLessThan(2000);
  expect(consoleErrors).toEqual([]);
});

test('TEST-33b derrota mostra progresso e "Tentar de novo" reinicia em < 2 s', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=3');
  await battlePhase(page, 'fight');
  await page.evaluate(() => (window as unknown as { __BATTLE_CTL__: { kill: () => void } }).__BATTLE_CTL__.kill());
  await ready(page, 'Defeat', 15_000);
  await menuHas(page, 'Defeat', 'Tentar de novo');
  const t0 = Date.now();
  await tap(page, 'Enter');
  await page.waitForFunction(() => {
    const b = (window as unknown as T).__FP_TEST__.battle();
    return !!b && b.players[0]!.state !== 'dead' && b.players[0]!.state !== 'ghost';
  });
  expect(Date.now() - t0).toBeLessThan(2000);
});

test('TEST-38 exportar e importar save', async ({ page }) => {
  await page.goto('/');
  await ready(page, 'Title');
  const ok = await page.evaluate(async () => {
    const fp = (window as unknown as { __FP__: { GameState: { store: { write(s: unknown): Promise<void>; load(n: number): Promise<{ save: { coins: number } | null }> } }; save: { newSave(n: number, d: string, t: number): { coins: number; slot: number }; exportSaveText(s: unknown): string; importSaveText(t: string, n: number): unknown } } }).__FP__;
    const s = { ...fp.save.newSave(0, 'normal', Date.now()), coins: 9 };
    const text = fp.save.exportSaveText(s);
    const imported = fp.save.importSaveText(text, 2);
    await fp.GameState.store.write(imported);
    const back = await fp.GameState.store.load(2);
    let rejected = false;
    try {
      fp.save.importSaveText('{"game":"faisca-e-pavio","data":{"schema":99}}', 1);
    } catch {
      rejected = true;
    }
    return back.save?.coins === 9 && rejected;
  });
  expect(ok).toBe(true);
});
