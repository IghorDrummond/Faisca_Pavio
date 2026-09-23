import { test, expect, waitForScene } from './fixtures';

test('TEST-30 página abre sem erros, passa pela checagem de WebGL e inicia o jogo', async ({ page, consoleErrors }) => {
  await page.goto('/');
  await waitForScene(page, 'Battle');
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const g = (window as unknown as { __GAME__: { renderer: { type: number }; loop: { actualFps: number } } }).__GAME__;
    return { renderer: g.renderer.type, fps: g.loop.actualFps };
  });
  expect(info.renderer).toBe(2); // Phaser.WEBGL
  expect(await page.locator('#fatal').isHidden()).toBe(true);
  console.log(`[${test.info().project.name}] fps=${info.fps.toFixed(1)}`);
  expect(consoleErrors).toEqual([]);
});
