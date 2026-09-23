import type Phaser from 'phaser';
import { EventBus } from '../services/eventBus';
import { Logger } from '../services/logger';
import { InputService } from './input';

/**
 * Ciclo de vida da página: pausa automática ao perder foco/ocultar aba/sair da tela cheia,
 * perda e recuperação de contexto WebGL, salvamento em visibilitychange/pagehide.
 */
export const Lifecycle = {
  hidden: false,
  contextLost: false,
  flushCallbacks: [] as (() => void)[],
};

export function onFlush(cb: () => void): () => void {
  Lifecycle.flushCallbacks.push(cb);
  return () => {
    const i = Lifecycle.flushCallbacks.indexOf(cb);
    if (i >= 0) Lifecycle.flushCallbacks.splice(i, 1);
  };
}

function flush(): void {
  for (const cb of [...Lifecycle.flushCallbacks]) {
    try {
      cb();
    } catch (e) {
      Logger.warn('Lifecycle', 'falha em flush', String(e));
    }
  }
}

export function installLifecycle(game: Phaser.Game): void {
  document.addEventListener('visibilitychange', () => {
    Lifecycle.hidden = document.visibilityState === 'hidden';
    if (Lifecycle.hidden) {
      InputService.clearKeys();
      EventBus.emit('app:pause', { reason: 'hidden' });
      flush();
    } else {
      EventBus.emit('app:resume');
    }
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('blur', () => {
    InputService.clearKeys();
    EventBus.emit('app:pause', { reason: 'blur' });
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) EventBus.emit('app:pause', { reason: 'fullscreen' });
  });
  EventBus.on('gamepad:disconnected', () => EventBus.emit('app:pause', { reason: 'gamepad' }));

  const canvas = game.canvas;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    Lifecycle.contextLost = true;
    Logger.warn('Lifecycle', 'contexto WebGL perdido');
    EventBus.emit('app:pause', { reason: 'context' });
    EventBus.emit('webgl:lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    Lifecycle.contextLost = false;
    Logger.info('Lifecycle', 'contexto WebGL restaurado');
    EventBus.emit('webgl:restored');
  });
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label', 'Jogo Faísca e Pavio');
}

/** Fullscreen API — sempre acionada por gesto do usuário. */
export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.getElementById('app')?.requestFullscreen({ navigationUI: 'hide' });
  } catch (e) {
    Logger.warn('Lifecycle', 'tela cheia indisponível', String(e));
  }
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}
