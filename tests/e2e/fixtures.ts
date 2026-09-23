import { test as base, expect, type Page } from '@playwright/test';

/** Coleta erros e warnings do console e erros de página; testes falham se houver. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      // diagnóstico do driver de GPU do Chromium headless (não é do jogo; ver docs/QA_CHECKLIST.md)
      if (m.text().includes('GL Driver Message')) return;
      if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await use(errors);
  },
});
export { expect };

type W = Window & {
  __GAME__?: { scene: { isActive(k: string): boolean; getScene(k: string): unknown }; loop: { actualFps: number }; renderer: { type: number } };
};

export async function waitForScene(page: Page, key: string, timeout = 40_000): Promise<void> {
  await page.waitForFunction((k) => !!(window as W).__GAME__ && (window as W).__GAME__!.scene.isActive(k), key, { timeout });
}

export async function isSceneActive(page: Page, key: string): Promise<boolean> {
  return page.evaluate((k) => !!(window as W).__GAME__?.scene.isActive(k), key);
}

/** Espera a íris abrir e a cena ficar interativa. */
export async function settle(page: Page, ms = 700): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Aperta uma tecla com tempo suficiente para ser lida por um tick. */
export async function tap(page: Page, key: string, hold = 60): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
}

export async function battle(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => (window as unknown as { __BATTLE__?: Record<string, unknown> }).__BATTLE__ ?? {});
}
