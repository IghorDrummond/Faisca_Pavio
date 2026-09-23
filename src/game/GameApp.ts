import Phaser from 'phaser';
import { WORLD_H, WORLD_W } from '../core/constants';
import { hideBoot, setBootProgress } from '../platform/shell';
import { installLifecycle } from '../platform/lifecycle';
import { Logger } from '../services/logger';
import { SCENES } from './scenes/registry';

let game: Phaser.Game | null = null;

export function getGame(): Phaser.Game | null {
  return game;
}

export function startGame(parent: HTMLElement): void {
  setBootProgress(0.3, 'Aquecendo o projetor…');
  game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: '#0d0906',
    title: 'Faísca & Pavio',
    version: __APP_VERSION__,
    banner: false,
    disableContextMenu: true,
    autoFocus: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    input: { keyboard: false, gamepad: false, mouse: true, touch: true },
    // o áudio é gerido pelo AudioService (contexto criado só após gesto do usuário)
    audio: { noAudio: true },
    fps: { smoothStep: false },
    scene: SCENES,
    callbacks: {
      postBoot: (g) => {
        Logger.info('Game', `Phaser ${Phaser.VERSION} iniciado (${g.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'})`);
        setBootProgress(0.4);
        installLifecycle(g);
      },
    },
  });
  (window as unknown as { __GAME__?: Phaser.Game }).__GAME__ = __DEBUG__ ? game : undefined;
}

export function bootDone(): void {
  hideBoot();
}
