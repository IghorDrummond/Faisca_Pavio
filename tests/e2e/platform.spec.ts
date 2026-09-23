import { test, expect, waitForScene, settle, tap, battle } from './fixtures';

test('TEST-36 redimensionamento e devicePixelRatio sem quebrar o layout', async ({ browser }) => {
  for (const [w, h, dpr] of [
    [1280, 720, 1],
    [1366, 768, 1],
    [2560, 1080, 1],
    [1280, 800, 2],
    [1920, 1080, 1.5],
  ] as [number, number, number][]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('/');
    await waitForScene(page, 'Title');
    const box = await page.locator('canvas').boundingBox();
    expect(box).toBeTruthy();
    // FIT com letterbox: proporção 16:9 e dentro da janela
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.02);
    expect(box!.width).toBeLessThanOrEqual(w + 1);
    expect(box!.height).toBeLessThanOrEqual(h + 1);
    await page.setViewportSize({ width: Math.round(w * 0.7), height: Math.round(h * 0.9) });
    await settle(page, 600);
    const box2 = await page.locator('canvas').boundingBox();
    expect(Math.abs(box2!.width / box2!.height - 16 / 9)).toBeLessThan(0.02);
    expect(errs).toEqual([]);
    await ctx.close();
  }
});

test('TEST-39 co-op com teclado dividido: P2 entra e se move', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=2');
  await waitForScene(page, 'Battle');
  await settle(page, 3500);
  await tap(page, 'Numpad0', 100);
  await settle(page, 400);
  let b = (await battle(page)) as { players: { joined: boolean; x: number }[] };
  expect(b.players[1]!.joined).toBe(true);
  const x0 = b.players[1]!.x;
  const p1x = b.players[0]!.x;
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await settle(page, 200);
  b = (await battle(page)) as { players: { joined: boolean; x: number }[] };
  expect(b.players[1]!.x).toBeGreaterThan(x0 + 100);
  // P1 (lado esquerdo: WASD) não se moveu com as setas
  expect(Math.abs(b.players[0]!.x - p1x)).toBeLessThan(20);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  await settle(page, 200);
  b = (await battle(page)) as { players: { joined: boolean; x: number }[] };
  expect(b.players[0]!.x).toBeGreaterThan(p1x + 80);
});

test('TEST-40 cabeçalhos de segurança e CSP aplicados sem violações', async ({ page, consoleErrors }) => {
  const res = await page.goto('/');
  const h = res!.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).not.toContain('unsafe-eval');
  expect(h['content-security-policy']).not.toContain('unsafe-inline');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['cross-origin-opener-policy']).toBe('same-origin');
  expect(h['permissions-policy']).toContain('gamepad=(self)');
  await page.evaluate(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await waitForScene(page, 'Title');
  await page.mouse.click(640, 360);
  await waitForScene(page, 'MainMenu');
  await settle(page, 1000);
  const v = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  expect(v).toEqual([]);
  expect(consoleErrors.filter((e) => e.includes('Content Security Policy'))).toEqual([]);
});

test('TEST-41 perda de contexto WebGL não derruba o jogo', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('/?debug=1&boss=cuco&seed=1');
  await waitForScene(page, 'Battle');
  await settle(page, 2500);
  const had = await page.evaluate(async () => {
    const c = document.querySelector('canvas')!;
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    await new Promise((r) => setTimeout(r, 800));
    ext.restoreContext();
    await new Promise((r) => setTimeout(r, 1500));
    return true;
  });
  test.skip(!had, 'WEBGL_lose_context indisponível neste motor');
  await waitForScene(page, 'Pause', 5000);
  expect(await page.locator('#fatal').isHidden()).toBe(true);
  expect(errs).toEqual([]);
});

test('TEST-37 PWA: após carregar e baixar os pacotes, abre e joga offline', async ({ page, context, browserName }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await waitForScene(page, 'Title');
  const hasSw = await page.evaluate(() => 'serviceWorker' in navigator);
  test.skip(!hasSw, 'service worker indisponível');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready.then(() => true), null, { timeout: 30_000 });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
  const done = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const sw = navigator.serviceWorker.controller!;
        navigator.serviceWorker.addEventListener('message', (e) => {
          if ((e.data as { type: string }).type === 'downloadDone') resolve(true);
        });
        sw.postMessage({ type: 'downloadAll' });
        setTimeout(() => resolve(false), 120_000);
      }),
  );
  expect(done).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await waitForScene(page, 'Title', 40_000);
  // jogável offline: entra em uma batalha que depende de pacote de ilha
  await page.goto('/?debug=1&boss=gramofone&seed=1').catch(() => undefined);
  await waitForScene(page, 'Battle', 40_000);
  await settle(page, 2000);
  const b = (await battle(page)) as { phase: string };
  expect(['intro', 'fight', 'card']).toContain(b.phase);
  await context.setOffline(false);
  void browserName;
});

test('TEST-42 benchmark: 800 projéteis + pós-processamento', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?debug=1&benchmark=1&duration=20000');
  await page.waitForFunction(() => !!(window as unknown as { __BENCHMARK__?: unknown }).__BENCHMARK__, null, { timeout: 90_000 });
  const r = await page.evaluate(() => (window as unknown as { __BENCHMARK__: Record<string, unknown> }).__BENCHMARK__);
  console.log(`[${test.info().project.name}] benchmark ${JSON.stringify(r)}`);
  expect(Number(r.projectiles)).toBeGreaterThanOrEqual(780);
  expect(Number(r.frames)).toBeGreaterThan(50);
});

test('TEST-32b atalho de pausa e tecla P pelo teclado', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=1');
  await waitForScene(page, 'Battle');
  await settle(page, 3000);
  await tap(page, 'KeyP');
  await waitForScene(page, 'Pause', 5000);
  await tap(page, 'Enter'); // Continuar
  await page.waitForFunction(() => !(window as unknown as { __GAME__: { scene: { isActive(k: string): boolean } } }).__GAME__.scene.isActive('Pause'));
});
