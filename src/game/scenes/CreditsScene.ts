import Phaser from 'phaser';
import { SONGS } from '../../data/music';
import { GAME_TITLE, t } from '../../i18n';
import { InputService } from '../../platform/input';
import { AudioService } from '../../services/audio';
import { CSS, COLORS, style, titleStyle } from '../../ui/theme';
import { attachFilm } from '../fx/film';
import type { FilmFilter } from '../fx/FilmFilter';
import { Router } from '../router';

const CARDS: string[][] = [
  [GAME_TITLE],
  ['Um espetáculo original', 'feito com arte, música e efeitos gerados por código'],
  ['Estrelando', 'FAÍSCA, o palito de fósforo', 'PAVIO, a vela teimosa'],
  ['Com participação especial de', 'Senhor Cuco · Madame Agulha · Tio Gramofone', 'Irmãs Bigorna · Comodoro Fuligem', 'e O Maestro de Corda'],
  ['Motor', 'Phaser 4 (licença MIT)'],
  ['Tipografia', 'Limelight e Josefin Sans (SIL Open Font License 1.1)'],
  ['Ferramentas', 'TypeScript · Vite · Vitest · Playwright · resvg · sharp'],
  [t('thanks')],
  [t('the_end')],
];

/** Final: a cidade de Lumiária se ilumina; créditos em cartões de cinema antigo. */
export class CreditsScene extends Phaser.Scene {
  private film: FilmFilter | null = null;
  private idx = 0;
  private card!: Phaser.GameObjects.Container;
  private timer = 0;
  private city!: Phaser.GameObjects.Graphics;
  private lightT = 0;
  private fromMenu = false;

  constructor() {
    super('Credits');
  }

  init(d: { fromMenu?: boolean }): void {
    this.fromMenu = !!d.fromMenu;
    this.idx = 0;
    this.timer = 0;
    this.lightT = this.fromMenu ? 1 : 0;
  }

  create(): void {
    this.add.rectangle(960, 540, 1920, 1080, 0x0d0b14);
    this.city = this.add.graphics();
    this.card = this.add.container(960, 540);
    this.showCard();
    this.film = attachFilm(this);
    const s = SONGS.credits;
    if (s) AudioService.playSong(s, 0, true);
    Router.reveal(this);
  }

  private drawCity(): void {
    const g = this.city;
    g.clear();
    const k = Math.min(1, this.lightT);
    // céu clareando
    const sky = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x0d0b14),
      Phaser.Display.Color.ValueToColor(0x3a2a4a),
      100,
      k * 100,
    );
    g.fillStyle(Phaser.Display.Color.GetColor(sky.r, sky.g, sky.b), 1);
    g.fillRect(0, 0, 1920, 1080);
    // farol com a Chama-Mãe
    g.fillStyle(0x1c120b, 1);
    g.fillRect(900, 380, 120, 540);
    g.fillStyle(0xffe27a, 0.2 + 0.8 * k);
    g.fillCircle(960, 360, 40 + 30 * k);
    g.fillStyle(0xff9b2e, 0.3 + 0.7 * k);
    g.fillTriangle(930, 360, 990, 360, 960, 280 - 20 * k);
    // prédios
    for (let i = 0; i < 18; i++) {
      const x = i * 110 - 20;
      const h = 180 + ((i * 97) % 220);
      g.fillStyle(0x1c120b, 1);
      g.fillRect(x, 1080 - h, 100, h);
      for (let wy = 1080 - h + 20; wy < 1060; wy += 40) {
        for (let wx = x + 14; wx < x + 90; wx += 28) {
          const on = ((i * 13 + wx + wy) % 100) / 100 < k;
          g.fillStyle(on ? 0xffd27a : 0x2a2230, 1);
          g.fillRect(wx, wy, 14, 20);
        }
      }
    }
  }

  private showCard(): void {
    this.card.removeAll(true);
    const lines = CARDS[this.idx] ?? [];
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.85);
    g.fillRoundedRect(-640, -220, 1280, 440, 30);
    g.lineStyle(6, COLORS.gold, 1);
    g.strokeRoundedRect(-610, -190, 1220, 380, 20);
    this.card.add(g);
    lines.forEach((l, i) => {
      const txt = i === 0 && lines.length <= 2 && this.idx === 0 ? this.add.text(0, 0, l, titleStyle(110)) : this.add.text(0, (i - (lines.length - 1) / 2) * 70, l, i === 0 ? titleStyle(52, CSS.gold) : style(40, CSS.paper));
      txt.setOrigin(0.5);
      this.card.add(txt);
    });
    this.card.setAlpha(0);
    this.tweens.add({ targets: this.card, alpha: 1, duration: 500 });
  }

  override update(_t: number, delta: number): void {
    this.film?.tick(delta);
    this.lightT += delta / 9000;
    this.drawCity();
    this.timer += delta;
    InputService.poll();
    const skip = InputService.menu('confirm');
    InputService.endTick();
    if (this.timer > 3200 || skip) {
      this.timer = 0;
      this.idx++;
      if (this.idx >= CARDS.length) {
        AudioService.stopMusic(0.6);
        Router.go(this, this.fromMenu ? 'MainMenu' : 'WorldMap', {}, this.fromMenu ? [] : ['map']);
        this.idx = 0;
        return;
      }
      this.showCard();
    }
  }
}
