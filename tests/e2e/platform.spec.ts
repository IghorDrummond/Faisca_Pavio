import { test, expect, ready, tap, battle, battlePhase, ticks, menuHas, frames } from './fixtures';
import type { Page } from '@playwright/test';

async function canvasRatioOk(page: Page, w: number, h: number): Promise<void> {
  await expect
    .poll(async () => {
      const box = await page.locator('canvas').boundingBox();
      if (!box) return false;
      // FIT com letterbox: proporção 16:9 e dentro da janela
      return Math.abs(box.width / box.height - 16 / 9) < 0.02 && box.width <= w + 1 && box.height <= h + 1 && (Math.abs(box.width - w) < 2 || Math.abs(box.height - h) < 2);
    })
    .toBe(true);
}

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
    await ready(page, 'Title');
    await canvasRatioOk(page, w, h);
    const w2 = Math.round(w * 0.7);
    const h2 = Math.round(h * 0.9);
    await page.setViewportSize({ width: w2, height: h2 });
    await canvasRatioOk(page, w2, h2);
    expect(errs).toEqual([]);
    await ctx.close();
  }
});

test('TEST-39 co-op com teclado dividido: P2 entra, aparece no HUD e se move; P1 inalterado', async ({ page, consoleErrors }) => {
  await page.goto('/?debug=1&boss=cuco&seed=2');
  // o jogo só aceita a entrada do P2 com a luta em andamento (após cartão e introdução)
  await battlePhase(page, 'fight');
  await tap(page, 'Numpad0');
  await page.waitForFunction(() => (window as unknown as { __FP_TEST__: { battle(): { players: { joined: boolean }[] } } }).__FP_TEST__.battle().players[1]!.joined);
  let b = await battle(page);
  expect(b.inputSlots[1]).toMatchObject({ joined: true, profile: 'split2', device: 'keyboard' });
  expect(b.inputSlots[0]!.profile).toBe('split1');
  await ticks(page, 2);
  b = await battle(page);
  expect(b.hudVisible[1]).toBe(true); // HUD do P2 presente
  expect(b.players[1]!.state).not.toBe('out');
  const x0 = b.players[1]!.x;
  const p1x = b.players[0]!.x;
  await page.keyboard.down('ArrowRight');
  await ticks(page, 30);
  await page.keyboard.up('ArrowRight');
  b = await battle(page);
  expect(b.players[1]!.x).toBeGreaterThan(x0 + 100);
  // P1 (lado esquerdo: WASD) não se moveu com as setas
  expect(Math.abs(b.players[0]!.x - p1x)).toBeLessThan(20);
  await page.keyboard.down('KeyD');
  await ticks(page, 24);
  await page.keyboard.up('KeyD');
  b = await battle(page);
  expect(b.players[0]!.x).toBeGreaterThan(p1x + 80);
  expect(consoleErrors).toEqual([]);
});

test('TEST-39b co-op: P2 sai pelo menu de pausa; morte de um mantém a luta; ambos fora = derrota', async ({ page, consoleErrors }) => {
  await page.goto('/?debug=1&boss=cuco&seed=2');
  await battlePhase(page, 'fight');
  await tap(page, 'Numpad0');
  await page.waitForFunction(() => (window as unknown as { __FP_TEST__: { battle(): { players: { joined: boolean }[] } } }).__FP_TEST__.battle().players[1]!.joined);
  // saída do P2 pelo menu de pausa
  await tap(page, 'KeyP');
  await ready(page, 'Pause');
  await menuHas(page, 'Pause', 'Jogador 2 sai');
  for (let i = 1; i <= 3; i++) {
    await tap(page, 'ArrowDown');
    await page.waitForFunction((n) => (window as unknown as { __FP_TEST__: { menu(k: string): { index: number } } }).__FP_TEST__.menu('Pause').index === n, i);
  }
  await tap(page, 'Enter');
  await page.waitForFunction(() => {
    const b = (window as unknown as { __FP_TEST__: { battle(): { paused: boolean; players: { joined: boolean }[]; inputSlots: { profile: string }[] } } }).__FP_TEST__.battle();
    return !b.paused && !b.players[1]!.joined && b.inputSlots[0]!.profile === 'solo';
  });
  // entra de novo; P2 morre sozinho → luta continua (fantasma), P1 vivo
  await tap(page, 'Numpad0');
  await page.waitForFunction(() => (window as unknown as { __FP_TEST__: { battle(): { players: { joined: boolean }[] } } }).__FP_TEST__.battle().players[1]!.joined);
  await page.evaluate(() => {
    const ctl = (window as unknown as { __BATTLE_CTL__: { scene: { sim: { players: { die(h: unknown): void }[] } } } }).__BATTLE_CTL__;
    ctl.scene.sim.players[1]!.die(ctl.scene.sim);
  });
  await ticks(page, 30);
  let b = await battle(page);
  expect(['dead', 'ghost']).toContain(b.players[1]!.state);
  expect(b.result).toBe('none');
  expect(b.phase).toBe('fight');
  // ambos fora → derrota
  await page.evaluate(() => (window as unknown as { __BATTLE_CTL__: { kill: () => void } }).__BATTLE_CTL__.kill());
  await ready(page, 'Defeat', 15_000);
  b = await battle(page);
  expect(b.result).toBe('defeat');
  expect(consoleErrors).toEqual([]);
});

test('TEST-40 cabeçalhos de segurança e CSP aplicados sem violações', async ({ page, consoleErrors }) => {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const res = await page.goto('/');
  const h = res!.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).not.toContain('unsafe-eval');
  expect(h['content-security-policy']).not.toContain('unsafe-inline');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['cross-origin-opener-policy']).toBe('same-origin');
  expect(h['permissions-policy']).toContain('gamepad=(self)');
  expect(h['strict-transport-security']).toContain('max-age=');
  await ready(page, 'Title');
  await page.mouse.click(640, 360);
  await ready(page, 'MainMenu');
  await frames(page, 30);
  const v = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  expect(v).toEqual([]);
  expect(consoleErrors.filter((e) => e.includes('Content Security Policy'))).toEqual([]);
});

test('TEST-41 perda de contexto WebGL não derruba o jogo', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('/?debug=1&boss=cuco&seed=1');
  await battlePhase(page, 'fight');
  const had = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    (window as unknown as { __lose: WEBGL_lose_context }).__lose = ext;
    ext.loseContext();
    return true;
  });
  test.skip(!had, 'WEBGL_lose_context indisponível neste motor');
  await page.waitForFunction(() => (window as unknown as { __FP_TEST__: { contextLost(): boolean } }).__FP_TEST__.contextLost());
  await page.evaluate(() => (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext());
  await page.waitForFunction(() => !(window as unknown as { __FP_TEST__: { contextLost(): boolean } }).__FP_TEST__.contextLost());
  await ready(page, 'Pause', 10_000);
  await frames(page, 10);
  expect(await page.locator('#fatal').isHidden()).toBe(true);
  expect(errs).toEqual([]);
});

test('TEST-37 PWA: após carregar e baixar os pacotes, abre e joga offline', async ({ page, context }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await ready(page, 'Title');
  const hasSw = await page.evaluate(() => 'serviceWorker' in navigator);
  test.skip(!hasSw, 'service worker indisponível');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
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
        setTimeout(() => resolve(false), 120_000); // limite de segurança, não sincronização
      }),
  );
  expect(done).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await ready(page, 'Title', 40_000);
  // jogável offline: entra em uma batalha que depende de pacote de ilha
  await page.goto('/?debug=1&boss=gramofone&seed=1').catch(() => undefined);
  await battlePhase(page, 'fight', 60_000);
  const b = await battle(page);
  expect(b.boss?.id).toBe('gramofone');
  await context.setOffline(false);
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

test('TEST-32b pausa pelo teclado: P pausa, Enter no menu de pausa ativa o item focado', async ({ page }) => {
  await page.goto('/?debug=1&boss=cuco&seed=1');
  await battlePhase(page, 'fight');
  await tap(page, 'KeyP');
  await ready(page, 'Pause', 5000);
  // Enter em "Tentar de novo" deve reiniciar (e não apenas retomar)
  await tap(page, 'ArrowDown');
  await page.waitForFunction(() => (window as unknown as { __FP_TEST__: { menu(k: string): { index: number } } }).__FP_TEST__.menu('Pause').index === 1);
  await tap(page, 'Enter');
  await page.waitForFunction(() => {
    const b = (window as unknown as { __FP_TEST__: { battle(): { paused: boolean; retries: number } } }).__FP_TEST__.battle();
    return !b.paused && b.retries === 1;
  });
  await battlePhase(page, 'fight');
  await tap(page, 'KeyP');
  await ready(page, 'Pause', 5000);
  await tap(page, 'Enter'); // Continuar
  await page.waitForFunction(() => !(window as unknown as { __GAME__: { scene: { isActive(k: string): boolean } } }).__GAME__.scene.isActive('Pause'));
});
