import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

/**
 * Neste ambiente Windows o Firefox do Playwright falha com erro de "configuração lado a lado"
 * quando executado da pasta ms-playwright; uma cópia em outra pasta funciona (ver 09_PENDING_ISSUES).
 * FIREFOX_EXECUTABLE sobrescreve o caminho.
 */
const ffCopy = join(process.env.LOCALAPPDATA ?? '', 'faisca-pw-firefox-1543', 'firefox.exe');
const firefoxExecutable = process.env.FIREFOX_EXECUTABLE ?? (existsSync(ffCopy) ? ffCopy : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    trace: 'off',
  },
  webServer: {
    command: `npx tsx tools/preview-server.ts --dir dist-e2e --port ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        launchOptions: firefoxExecutable ? { executablePath: firefoxExecutable } : {},
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
  ],
});
