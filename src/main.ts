import '@fontsource/limelight/latin-400.css';
import '@fontsource/limelight/latin-ext-400.css';
import '@fontsource/josefin-sans/latin-400.css';
import '@fontsource/josefin-sans/latin-700.css';
import '@fontsource/josefin-sans/latin-ext-400.css';
import '@fontsource/josefin-sans/latin-ext-700.css';
import { hasWebGL, installGlobalErrorHandlers, installOrientationHint, installPageGuards, setBootProgress, showFatal } from './platform/shell';
import { Logger } from './services/logger';
import { SettingsService } from './services/settings';
import { InputService } from './platform/input';
import { AudioService } from './services/audio';
import { registerServiceWorker } from './platform/pwa';

async function boot(): Promise<void> {
  installGlobalErrorHandlers();
  installOrientationHint();
  Logger.info('Boot', `Faísca & Pavio ${__APP_VERSION__}`);
  if (!hasWebGL()) {
    showFatal(
      'Este jogo precisa de WebGL, que não está disponível ou está desativado neste navegador. ' +
        'Atualize o navegador, ative a aceleração de hardware nas configurações ou tente outro navegador (Chrome, Edge, Firefox ou Safari recentes).',
      'WebGL indisponível',
    );
    return;
  }
  SettingsService.load();
  registerServiceWorker();
  const gameEl = document.getElementById('game');
  if (!gameEl) throw new Error('#game ausente');
  installPageGuards(gameEl);
  InputService.attach(window);
  // política de autoplay: o AudioContext só nasce dentro de um gesto do usuário (tecla/clique/toque)
  const unlock = (): void => AudioService.unlock();
  window.addEventListener('keydown', unlock, { capture: true });
  window.addEventListener('pointerdown', unlock, { capture: true });
  setBootProgress(0.1, 'Carregando fontes…');
  try {
    await Promise.race([
      Promise.all([document.fonts.load('32px Limelight'), document.fonts.load('700 32px "Josefin Sans"'), document.fonts.load('32px "Josefin Sans"')]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    Logger.warn('Boot', 'fontes não carregaram a tempo');
  }
  setBootProgress(0.2, 'Montando o palco…');
  if (__DEBUG__) {
    // handles para testes E2E (removidos da build de produção)
    const { GameState } = await import('./services/gameState');
    const save = await import('./core/save');
    (window as unknown as Record<string, unknown>).__FP__ = { AudioService, InputService, SettingsService, GameState, save };
  }
  const { startGame } = await import('./game/GameApp');
  startGame(gameEl);
}

void boot().catch((e: unknown) => {
  Logger.error('Boot', 'falha no carregamento', e instanceof Error ? e.stack : String(e));
  showFatal('Não foi possível iniciar o jogo. Verifique a conexão e recarregue a página.', String(e));
});
