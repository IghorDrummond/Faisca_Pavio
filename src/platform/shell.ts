import { Logger } from '../services/logger';

/** Estado mínimo anexado ao relatório de erro (preenchido pelas cenas). */
export const ErrorContext: Record<string, string | number | boolean> = {};

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function setBootProgress(fraction: number, msg?: string): void {
  const fill = el<HTMLDivElement>('boot-fill');
  if (fill) fill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  const m = el<HTMLParagraphElement>('boot-msg');
  if (m && msg) m.textContent = msg;
}

export function hideBoot(): void {
  const b = el<HTMLDivElement>('boot');
  if (!b) return;
  b.classList.add('hide');
  window.setTimeout(() => b.remove(), 500);
}

export function buildReport(extra?: string): string {
  const lines = [
    `Faísca & Pavio ${__APP_VERSION__} (${__BUILD_TIME__})`,
    `Navegador: ${navigator.userAgent}`,
    `Tela: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`,
    `Contexto: ${JSON.stringify(ErrorContext)}`,
  ];
  if (extra) lines.push(`Erro: ${extra}`);
  lines.push('--- Logs recentes ---');
  for (const e of Logger.recent().slice(-60)) {
    lines.push(`${new Date(e.t).toISOString()} ${e.level} ${e.source}: ${e.msg}`);
  }
  return lines.join('\n');
}

let fatalShown = false;

/** Tela de erro amigável (HTML, texto via textContent — nunca innerHTML). */
export function showFatal(message: string, detail?: string): void {
  if (fatalShown) return;
  fatalShown = true;
  const f = el<HTMLElement>('fatal');
  const m = el<HTMLParagraphElement>('fatal-msg');
  if (!f || !m) return;
  m.textContent = message;
  f.hidden = false;
  el<HTMLDivElement>('boot')?.remove();
  const report = buildReport(detail);
  el<HTMLButtonElement>('fatal-reload')?.addEventListener('click', () => location.reload());
  el<HTMLButtonElement>('fatal-copy')?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(report).then(
      () => {
        const b = el<HTMLButtonElement>('fatal-copy');
        if (b) b.textContent = 'Relatório copiado!';
      },
      () => undefined,
    );
  });
  el<HTMLButtonElement>('fatal-reload')?.focus();
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => {
    Logger.error('Global', e.message, { file: e.filename, line: e.lineno, stack: (e.error as Error | undefined)?.stack });
    // falhas de recurso não derrubam o jogo; erros de script sim
    if (e.error) showFatal('Aconteceu um erro inesperado. Recarregue a página para continuar.', `${e.message}\n${(e.error as Error).stack ?? ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as Error | string | undefined;
    const msg = r instanceof Error ? r.message : String(r);
    Logger.error('Global', `promessa rejeitada: ${msg}`, r instanceof Error ? r.stack : undefined);
  });
}

/** Aviso de orientação paisagem em telas estreitas. */
export function installOrientationHint(): void {
  const r = el<HTMLDivElement>('rotate');
  if (!r) return;
  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth * 1.1 && Math.min(window.innerWidth, window.innerHeight) < 900;
    r.hidden = !portrait;
  };
  window.addEventListener('resize', update);
  update();
}

/** Bloqueia menu de contexto, seleção e rolagem sobre o jogo. */
export function installPageGuards(game: HTMLElement): void {
  game.addEventListener('contextmenu', (e) => e.preventDefault());
  game.addEventListener('selectstart', (e) => e.preventDefault());
  game.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  game.addEventListener('pointerdown', () => game.focus({ preventScroll: true }));
  window.addEventListener('scroll', () => window.scrollTo(0, 0));
}
