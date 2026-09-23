import { test as base, expect, type Page } from '@playwright/test';

/** Coleta erros e warnings do console e erros de página; falha o teste se houver. */
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

export async function waitForScene(page: Page, key: string, timeout = 30_000): Promise<void> {
  await page.waitForFunction(
    (k) => {
      const g = (window as unknown as { __GAME__?: { scene: { isActive(k: string): boolean } } }).__GAME__;
      return !!g && g.scene.isActive(k);
    },
    key,
    { timeout },
  );
}
