import Phaser from 'phaser';
import { GAME_TITLE, t } from '../../i18n';
import { InputService } from '../../platform/input';
import { AudioService } from '../../services/audio';
import { SONGS } from '../../data/music';
import { CSS, style, titleStyle } from '../../ui/theme';
import { attachFilm } from '../fx/film';
import type { FilmFilter } from '../fx/FilmFilter';
import { Router } from '../router';

/** Tela de título: protagonistas animados, letreiro e "Pressione qualquer botão" (desbloqueia o áudio). */
export class TitleScene extends Phaser.Scene {
  private film: FilmFilter | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private leaving = false;
  private soundHint!: Phaser.GameObjects.Text;

  constructor() {
    super('Title');
  }

  create(): void {
    this.leaving = false;
    const g = this.add.graphics();
    // cortina de teatro e holofote
    g.fillGradientStyle(0x3a1510, 0x3a1510, 0x1a0806, 0x1a0806, 1);
    g.fillRect(0, 0, 1920, 1080);
    for (let i = 0; i < 16; i++) {
      g.fillStyle(i % 2 ? 0x6e1f18 : 0x5a1812, 1);
      g.fillRect(i * 120, 0, 120, 1080);
    }
    g.fillStyle(0xfff2c0, 0.13);
    g.fillEllipse(960, 760, 1300, 420);
    g.fillStyle(0x2a120c, 1);
    g.fillRect(0, 900, 1920, 180);
    g.fillStyle(0x1c120b, 1);
    g.fillRect(0, 900, 1920, 10);
    const f = this.add.sprite(760, 900, 'players', 'faisca_idle_0').setOrigin(0.5, 208 / 220).setScale(2.2);
    const p = this.add.sprite(1160, 900, 'players', 'pavio_idle_0').setOrigin(0.5, 208 / 220).setScale(2.2).setFlipX(true);
    f.play('faisca_idle');
    p.play('pavio_idle');
    const title = this.add.text(960, 250, GAME_TITLE, titleStyle(150)).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.03, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    this.add.text(960, 380, 'Um espetáculo em quatro atos e uma Chama-Mãe', style(34, CSS.paper, { fontStyle: 'italic', stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5);
    this.prompt = this.add.text(960, 990, t('pressAny'), style(40, CSS.gold, { stroke: CSS.ink, strokeThickness: 8 })).setOrigin(0.5);
    this.tweens.add({ targets: this.prompt, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 });
    this.add.text(1900, 1066, t('version', { v: __APP_VERSION__ }), style(18, CSS.dim)).setOrigin(1, 1);
    this.soundHint = this.add.text(20, 1066, '', style(18, CSS.dim)).setOrigin(0, 1);
    this.film = attachFilm(this);
    this.input.once('pointerdown', () => this.proceed());
    Router.reveal(this);
  }

  private proceed(): void {
    if (this.leaving) return;
    this.leaving = true;
    AudioService.unlock();
    AudioService.play('ui_confirm', { bus: 'voice' });
    const song = SONGS.title;
    if (song) AudioService.playSong(song, 0);
    Router.go(this, 'MainMenu', {}, []);
  }

  override update(_t: number, delta: number): void {
    InputService.poll();
    if (InputService.consumeAny()) this.proceed();
    InputService.endTick();
    this.film?.tick(delta);
    if (!AudioService.unlocked && InputService.lastAnyDevice === 'gamepad') this.soundHint.setText('Som: clique ou aperte uma tecla para ativar o áudio.');
  }
}
