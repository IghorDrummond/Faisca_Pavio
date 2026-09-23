import { EventBus } from '../services/eventBus';
import { Logger } from '../services/logger';

let waiting: ServiceWorker | null = null;
let registration: ServiceWorkerRegistration | null = null;

/** Registra o service worker (somente builds de produção/e2e). */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) {
          waiting = reg.waiting;
          EventBus.emit('pwa:update');
        }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              waiting = sw;
              EventBus.emit('pwa:update');
            }
          });
        });
      })
      .catch((e: unknown) => Logger.warn('PWA', 'falha ao registrar service worker', String(e)));
  });
}

export function updateAvailable(): boolean {
  return waiting !== null;
}

/** Aplica a atualização (chamado apenas fora de partidas). */
export function applyUpdate(): void {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage({ type: 'skipWaiting' });
}

/** Baixa todos os pacotes para jogar offline; progresso 0..1. */
export async function downloadAllForOffline(onProgress: (f: number) => void): Promise<boolean> {
  const sw = navigator.serviceWorker?.controller ?? registration?.active;
  if (!sw) return false;
  return new Promise((resolve) => {
    const onMsg = (e: MessageEvent): void => {
      const d = e.data as { type: string; done?: number; total?: number };
      if (d.type === 'downloadProgress' && d.total) onProgress((d.done ?? 0) / d.total);
      if (d.type === 'downloadDone') {
        navigator.serviceWorker.removeEventListener('message', onMsg);
        onProgress(1);
        resolve(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    sw.postMessage({ type: 'downloadAll' });
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', onMsg);
      resolve(false);
    }, 120000);
  });
}
