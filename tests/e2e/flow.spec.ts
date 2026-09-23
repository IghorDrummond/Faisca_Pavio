import { test, expect, waitForScene, settle, tap, battle } from './fixtures';
import type { Page } from '@playwright/test';

type Fp = { __FP__: { GameState: { save: { stages: Record<string, { done: boolean }>; bosses: Record<string, unknown>; coins: number; map: { x: number; y: number } } | null } } };

async function winBattle(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __BATTLE_CTL__?: unknown }).__BATTLE_CTL__, null, { timeout: 20_000 });
  await settle(page, 2500);
  await page.evaluate(() => (window as unknown as { __BATTLE_CTL__: { win: () => void } }).__BATTLE_CTL__.win());
  await waitForScene(page, 'Result', 30_000);
  await settle(page, 3500);
  await tap(page, 'Enter');
}

test('TEST-32 novo jogo → tutorial → mapa → batalha → vitória → ranking → salvo → recarrega → mantido', async ({ page, consoleErrors }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.evaluate(async () => {
    // começa limpo
    await new Promise<void>((r) => {
      const req = indexedDB.deleteDatabase('faisca-e-pavio');
      req.onsuccess = req.onerror = req.onblocked = () => r();
    });
  });
  await page.reload();
  await waitForScene(page, 'Title');
  await settle(page, 800);
  await tap(page, 'Space');
  await waitForScene(page, 'MainMenu');
  await settle(page, 800);
  await tap(page, 'Enter'); // Começar
  await settle(page, 500);
  await tap(page, 'Enter'); // Espetáculo 1
  await settle(page, 500);
  await tap(page, 'Enter'); // Novo espetáculo
  await settle(page, 500);
  await tap(page, 'Enter'); // Normal (selecionado por padrão)
  await waitForScene(page, 'Battle', 40_000);
  const b = await page.evaluate(() => (window as unknown as { __GAME__: { scene: { getScene(k: string): { params: { id: string } } } } }).__GAME__.scene.getScene('Battle').params.id);
  expect(b).toBe('tutorial');
  await winBattle(page);
  await waitForScene(page, 'WorldMap', 40_000);
  const afterTut = await page.evaluate(() => (window as unknown as Fp).__FP__.GameState.save);
  expect(afterTut?.stages.tutorial?.done).toBe(true);
  expect(afterTut?.coins).toBe(2);
  // entra no Senhor Cuco pelo mapa: caminha até o nó
  await page.evaluate(() => {
    const s = (window as unknown as { __GAME__: { scene: { getScene(k: string): { px: number; py: number } } } }).__GAME__.scene.getScene('WorldMap');
    s.px = 900;
    s.py = 790;
  });
  await settle(page, 400);
  await tap(page, 'Enter'); // abre o cartão do nó
  await settle(page, 500);
  await tap(page, 'Enter'); // Entrar
  await waitForScene(page, 'Battle', 40_000);
  const snap = await battle(page);
  expect(snap).toBeTruthy();
  await winBattle(page);
  await waitForScene(page, 'WorldMap', 40_000);
  // recarrega a página e confirma a persistência
  await page.reload();
  await waitForScene(page, 'Title');
  await settle(page, 800);
  await tap(page, 'Space');
  await waitForScene(page, 'MainMenu');
  await settle(page, 800);
  await tap(page, 'Enter');
  await settle(page, 500);
  await tap(page, 'Enter');
  await settle(page, 500);
  await tap(page, 'Enter'); // Continuar
  await waitForScene(page, 'WorldMap', 40_000);
  const saved = await page.evaluate(() => (window as unknown as Fp).__FP__.GameState.save);
  expect(saved?.bosses.cuco).toBeTruthy();
  expect(saved?.stages.tutorial?.done).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('TEST-33 retry 20 vezes sem crescer objetos ativos nem gerar erros', async ({ page, consoleErrors }) => {
  test.setTimeout(180_000);
  await page.goto('/?debug=1&boss=cuco&seed=3');
  await waitForScene(page, 'Battle');
  await settle(page, 3000);
  const first = (await battle(page)) as { children: number };
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => (window as unknown as { __BATTLE_CTL__: { retry: () => void } }).__BATTLE_CTL__.retry());
    await settle(page, 250);
  }
  const perRetry = (Date.now() - t0) / 20;
  await settle(page, 1500);
  const last = (await battle(page)) as { children: number; retries: number };
  expect(last.retries).toBe(20);
  expect(last.children).toBeLessThanOrEqual(first.children + 2);
  console.log(`[${test.info().project.name}] objetos: ${first.children} → ${last.children}; tempo médio por retry (inclui espera): ${perRetry.toFixed(0)} ms`);
  expect(consoleErrors).toEqual([]);
});

test('TEST-33b derrota mostra progresso e "Tentar de novo" reinicia em < 2 s', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=3');
  await waitForScene(page, 'Battle');
  await settle(page, 3000);
  await page.evaluate(() => (window as unknown as { __BATTLE_CTL__: { kill: () => void } }).__BATTLE_CTL__.kill());
  await waitForScene(page, 'Defeat', 15_000);
  await settle(page, 600);
  const t0 = Date.now();
  await tap(page, 'Enter');
  await page.waitForFunction(() => {
    const b = (window as unknown as { __BATTLE__?: { players: { state: string }[] } }).__BATTLE__;
    return !!b && b.players[0]!.state !== 'dead' && b.players[0]!.state !== 'ghost';
  });
  expect(Date.now() - t0).toBeLessThan(2000);
});

test('TEST-38 exportar e importar save', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page, 'Title');
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
