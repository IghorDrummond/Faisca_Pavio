import Phaser from 'phaser';
import { WORLD_H, WORLD_W } from '../core/constants';
import { EventBus } from '../services/eventBus';
import { SettingsService } from '../services/settings';

/**
 * Escala de renderização e limite de devicePixelRatio.
 * O mundo lógico é sempre 1920x1080; a resolução real do canvas é 1920·f x 1080·f e as câmeras
 * recebem zoom f (origem no canto). f = min(pixels físicos disponíveis / 1920, limite de DPR) · escala.
 */
export function renderFactor(): number {
  const s = SettingsService.all;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const w = typeof window !== 'undefined' ? window.innerWidth : WORLD_W;
  const h = typeof window !== 'undefined' ? window.innerHeight : WORLD_H;
  const fit = Math.min(w / WORLD_W, h / WORLD_H) * dpr;
  const natural = Math.max(0.5, Math.min(fit, s.dprCap));
  // nunca abaixo de 50% da resolução lógica; arredonda para evitar tamanhos ímpares
  return Math.max(0.5, Math.round(Math.min(natural, s.dprCap) * s.renderScale * 20) / 20);
}

function fixCamera(scene: Phaser.Scene, f: number): void {
  for (const cam of scene.cameras.cameras) {
    cam.setViewport(0, 0, WORLD_W * f, WORLD_H * f);
    cam.setOrigin(0, 0);
    cam.setZoom(f);
  }
}

let current = 1;

export function applyRenderScale(game: Phaser.Game): void {
  const f = renderFactor();
  if (Math.abs(f - current) < 0.001 && game.scale.width === Math.round(WORLD_W * f)) return;
  current = f;
  game.scale.setGameSize(Math.round(WORLD_W * f), Math.round(WORLD_H * f));
  for (const s of game.scene.getScenes(false)) if (s.sys.settings.status >= Phaser.Scenes.CREATING) fixCamera(s, f);
}

export function installRenderScale(game: Phaser.Game): void {
  for (const s of game.scene.scenes) {
    s.sys.events.on(Phaser.Scenes.Events.CREATE, () => fixCamera(s, current));
  }
  EventBus.on('settings:changed', ({ key }) => {
    if (key === 'renderScale' || key === 'dprCap') applyRenderScale(game);
  });
  window.addEventListener('resize', () => applyRenderScale(game));
  applyRenderScale(game);
}

export function currentRenderFactor(): number {
  return current;
}
