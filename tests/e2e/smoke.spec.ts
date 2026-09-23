import { test, expect, waitForScene, settle, tap, isSceneActive } from './fixtures';

test('TEST-30 abre sem erros, passa pela checagem de WebGL e chega ao título', async ({ page, consoleErrors }) => {
  await page.goto('/');
  await waitForScene(page, 'Title');
  const r = await page.evaluate(() => (window as unknown as { __GAME__: { renderer: { type: number } } }).__GAME__.renderer.type);
  expect(r).toBe(2); // Phaser.WEBGL
  expect(await page.locator('#fatal').isHidden()).toBe(true);
  await settle(page, 1000);
  expect(consoleErrors).toEqual([]);
});

test('TEST-30b sem WebGL mostra tela amigável', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // simula navegador sem WebGL
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      if (id.startsWith('webgl')) return null;
      return (orig as (...a: unknown[]) => unknown).call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#fatal')).toBeVisible();
  await expect(page.locator('#fatal-msg')).toContainText('WebGL');
  await ctx.close();
});

test('TEST-31 interação desbloqueia o áudio (AudioContext "running")', async ({ page, consoleErrors }) => {
  await page.goto('/');
  await waitForScene(page, 'Title');
  const before = await page.evaluate(() => (window as unknown as { __FP__: { AudioService: { state: string } } }).__FP__.AudioService.state);
  expect(before).toBe('none'); // nenhum contexto antes do gesto
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => (window as unknown as { __FP__: { AudioService: { state: string } } }).__FP__.AudioService.state === 'running', null, { timeout: 10_000 });
  await waitForScene(page, 'MainMenu');
  expect(consoleErrors).toEqual([]);
});

test('TEST-35 teclas do jogo não rolam a página nem tiram o foco', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=1');
  await waitForScene(page, 'Battle');
  await settle(page, 1500);
  const prevented = await page.evaluate(() => {
    const out: Record<string, boolean> = {};
    for (const code of ['ArrowDown', 'Space', 'ArrowUp', 'Tab', 'PageDown']) {
      const e = new KeyboardEvent('keydown', { code, key: code === 'Space' ? ' ' : code, bubbles: true, cancelable: true });
      window.dispatchEvent(e);
      out[code] = e.defaultPrevented;
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    }
    return out;
  });
  expect(Object.values(prevented).every(Boolean)).toBe(true);
  for (const k of ['ArrowDown', 'Space', 'PageDown', 'End']) await tap(page, k);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0);
});

test('TEST-34 pausa automática ao perder foco e ao ocultar a aba', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=1');
  await waitForScene(page, 'Battle');
  await settle(page, 2500);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await waitForScene(page, 'Pause', 5000);
  await tap(page, 'KeyP');
  await page.waitForFunction(() => !(window as unknown as { __GAME__: { scene: { isActive(k: string): boolean } } }).__GAME__.scene.isActive('Pause'));
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitForScene(page, 'Pause', 5000);
  expect(await isSceneActive(page, 'Pause')).toBe(true);
});
