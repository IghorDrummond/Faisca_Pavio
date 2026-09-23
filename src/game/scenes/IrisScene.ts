import Phaser from 'phaser';
import { AudioService } from '../../services/audio';
import { SettingsService } from '../../services/settings';

/** Cena persistente no topo: transição de íris entre telas. */
export class IrisScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  radius = 1400;
  private tween: Phaser.Tweens.Tween | null = null;
  cx = 960;
  cy = 540;
  busy = false;

  constructor() {
    super({ key: 'Iris', active: false });
  }

  create(): void {
    this.g = this.add.graphics();
    this.scene.bringToTop();
    this.draw();
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    if (this.radius >= 1300) return;
    // anel preto espesso cobrindo tudo fora do círculo
    const r = Math.max(0, this.radius);
    g.lineStyle(4200, 0x0d0906, 1);
    g.strokeCircle(this.cx, this.cy, r + 2100);
    if (r < 2) {
      g.fillStyle(0x0d0906, 1);
      g.fillRect(0, 0, 1920, 1080);
    }
  }

  private duration(): number {
    return SettingsService.get('fastTransitions') || SettingsService.get('reduceFlashes') ? 160 : 420;
  }

  close(cb: () => void, x = 960, y = 540): void {
    this.scene.bringToTop();
    this.busy = true;
    this.cx = x;
    this.cy = y;
    this.tween?.stop();
    AudioService.play('iris', { bus: 'voice', volume: 0.4 });
    this.tween = this.tweens.addCounter({
      from: Math.min(this.radius, 1300),
      to: 0,
      duration: this.duration(),
      ease: 'Cubic.easeIn',
      onUpdate: (tw) => {
        this.radius = tw.getValue() ?? 0;
        this.draw();
      },
      onComplete: () => {
        this.radius = 0;
        this.draw();
        cb();
      },
    });
  }

  open(): void {
    this.scene.bringToTop();
    this.cx = 960;
    this.cy = 540;
    this.tween?.stop();
    this.tween = this.tweens.addCounter({
      from: Math.min(this.radius, 1300),
      to: 1400,
      duration: this.duration(),
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        this.radius = tw.getValue() ?? 1400;
        this.draw();
      },
      onComplete: () => {
        this.radius = 1400;
        this.busy = false;
        this.draw();
      },
    });
  }

  /** Fecha instantaneamente (ex.: boot). */
  black(): void {
    this.radius = 0;
    this.draw();
  }
}
