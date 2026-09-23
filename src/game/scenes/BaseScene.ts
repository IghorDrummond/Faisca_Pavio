import Phaser from 'phaser';
import { WORLD_H, WORLD_W } from '../../core/constants';
import { InputService } from '../../platform/input';
import { Logger } from '../../services/logger';

/** Base comum: câmera centrada, polling de input nos menus e registro de erros por cena. */
export abstract class BaseScene extends Phaser.Scene {
  protected setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setRoundPixels(false);
  }

  /** Para cenas de menu: lê input uma vez por quadro. */
  protected pollMenuInput(): void {
    InputService.poll();
    InputService.endTick();
  }

  protected log(msg: string, ctx?: unknown): void {
    Logger.info(this.scene.key, msg, ctx);
  }
}
