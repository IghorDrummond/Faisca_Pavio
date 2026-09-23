import { test as base, expect, type Page } from '@playwright/test';

/**
 * Fixtures dos testes E2E. Regra da suíte: NENHUMA espera fixa como sincronização — tudo espera por
 * estado observável exposto pela API de teste do jogo (window.__FP_TEST__, só em builds de debug/e2e).
 */

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

export interface BattleSnap {
  phase: string;
  tick: number;
  result: string;
  paused: boolean;
  boss: { id: string; state: string; phase: number; hp: number; maxHp: number } | null;
  players: { joined: boolean; state: string; hp: number; x: number; y: number }[];
  children: number;
  retries: number;
  hudVisible: boolean[];
  inputSlots: { joined: boolean; profile: string; device: string }[];
  params: { kind: string; id: string; difficulty: string };
}

interface TestApi {
  scenes(): string[];
  current(): string;
  ready(key: string): boolean;
  transitioning(): boolean;
  menu(key: string): { index: number; enabled: boolean; labels: string[] } | null;
  battle(): BattleSnap | null;
  objects(): number;
  save(): unknown;
  frame(): number;
  contextLost(): boolean;
}
type W = Window & { __FP_TEST__?: TestApi; __GAME__?: { scene: { isActive(k: string): boolean } } };

/** Espera a cena estar ativa (sem exigir a íris aberta). */
export async function waitForScene(page: Page, key: string, timeout = 40_000): Promise<void> {
  await page.waitForFunction((k) => !!(window as W).__GAME__ && (window as W).__GAME__!.scene.isActive(k), key, { timeout });
}

/** Espera a tela estar pronta para entrada: roteada, íris aberta, sem carregamento. */
export async function ready(page: Page, key: string, timeout = 40_000): Promise<void> {
  await page.waitForFunction((k) => !!(window as W).__FP_TEST__?.ready(k), key, { timeout });
}

export async function isSceneActive(page: Page, key: string): Promise<boolean> {
  return page.evaluate((k) => !!(window as W).__GAME__?.scene.isActive(k), key);
}

/** Espera o jogo renderizar n quadros (progresso observável, não tempo). */
export async function frames(page: Page, n: number): Promise<void> {
  const start = await page.evaluate(() => (window as W).__FP_TEST__!.frame());
  await page.waitForFunction(([s, k]) => (window as W).__FP_TEST__!.frame() >= s + k, [start, n] as const);
}

/** Espera a simulação da batalha avançar n ticks. */
export async function ticks(page: Page, n: number): Promise<void> {
  const start = (await battle(page)).tick;
  await page.waitForFunction(([s, k]) => ((window as W).__FP_TEST__!.battle()?.tick ?? -1) >= s + k, [start, n] as const);
}

/** Toque de tecla (keydown+keyup imediato): o jogo guarda a borda até o próximo tick. */
export async function tap(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

export async function battle(page: Page): Promise<BattleSnap> {
  const b = await page.evaluate(() => (window as W).__FP_TEST__?.battle() ?? null);
  if (!b) throw new Error('nenhuma batalha ativa');
  return b;
}

/** Espera a batalha chegar à fase indicada da cena ('fight' = jogadores podem entrar/agir). */
export async function battlePhase(page: Page, phase: string, timeout = 40_000): Promise<void> {
  await page.waitForFunction((ph) => (window as W).__FP_TEST__?.battle()?.phase === ph, phase, { timeout });
}

export async function menu(page: Page, scene: string): Promise<{ index: number; enabled: boolean; labels: string[] } | null> {
  return page.evaluate((k) => (window as W).__FP_TEST__?.menu(k) ?? null, scene);
}

/** Aperta uma tecla num menu e espera o menu mudar (rótulos ou foco) ou a tela trocar. */
export async function menuPress(page: Page, scene: string, key: string): Promise<void> {
  const before = JSON.stringify(await menu(page, scene));
  await tap(page, key);
  await page.waitForFunction(
    ([k, b]) => {
      const t = (window as W).__FP_TEST__!;
      return !t.ready(k) || JSON.stringify(t.menu(k)) !== b;
    },
    [scene, before] as const,
  );
}

/** Espera o menu da cena mostrar um rótulo (confirma que a navegação chegou à tela certa). */
export async function menuHas(page: Page, scene: string, label: string, timeout = 15_000): Promise<void> {
  await page.waitForFunction(([k, l]) => !!(window as W).__FP_TEST__?.menu(k)?.labels.some((x) => x.includes(l)), [scene, label] as const, { timeout });
}
