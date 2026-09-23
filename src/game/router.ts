import type Phaser from 'phaser';
import { ErrorContext } from '../platform/shell';
import { Logger } from '../services/logger';
import { AssetPackLoader } from './assets';
import type { IrisScene } from './scenes/IrisScene';

const PERSISTENT = new Set(['Iris', 'Boot']);

/**
 * SceneRouter: troca de telas com íris, carregando pacotes sob demanda quando necessário.
 * Nunca deixa tela preta sem feedback: a cena Loading mostra progresso real.
 */
export const Router = {
  current: '',

  go(from: Phaser.Scene, key: string, data: object = {}, packs: string[] = [], at?: { x: number; y: number }): void {
    const game = from.game;
    const iris = game.scene.getScene('Iris') as IrisScene | null;
    const doSwitch = (): void => {
      for (const s of game.scene.getScenes(true)) {
        if (!PERSISTENT.has(s.scene.key)) s.scene.stop();
      }
      const missing = packs.filter((p) => !AssetPackLoader.isLoaded(p));
      Router.current = key;
      ErrorContext.scene = key;
      Logger.info('Router', `→ ${key}${missing.length ? ` (carregando ${missing.join(', ')})` : ''}`);
      if (missing.length) game.scene.start('Loading', { packs: missing, next: key, data });
      else game.scene.start(key, data);
      iris?.scene.bringToTop();
    };
    if (iris && iris.scene.isActive()) iris.close(doSwitch, at?.x, at?.y);
    else doSwitch();
  },

  /** Chamado pela cena de destino quando estiver pronta para ser mostrada. */
  reveal(scene: Phaser.Scene): void {
    const iris = scene.game.scene.getScene('Iris') as IrisScene | null;
    iris?.open();
  },
};
