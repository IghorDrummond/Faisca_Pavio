import Phaser from 'phaser';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { AudioService } from '../../services/audio';
import { COLORS, CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Menu } from '../../ui/Menu';
import type { BattleScene } from './BattleScene';

/** "FIM DA SESSÃO!" com barra de progresso do chefe (marcadores de fase) e retry selecionado por padrão. */
export class DefeatScene extends Phaser.Scene {
  private battle!: BattleScene;
  private menu!: Menu;

  constructor() {
    super('Defeat');
  }

  init(d: { battle: BattleScene }): void {
    this.battle = d.battle;
  }

  create(): void {
    AudioService.play('defeat', { bus: 'voice', priority: 3, pitchVar: 0 });
    this.add.rectangle(960, 540, 1920, 1080, COLORS.ink, 0.5);
    const g = this.add.graphics();
    drawPanel(g, 460, 140, 1000, 800);
    const title = this.add.text(960, 250, t('defeat'), titleStyle(96, CSS.accent)).setOrigin(0.5).setScale(0.4);
    this.tweens.add({ targets: title, scale: 1, duration: 320, ease: 'Back.easeOut' });
    // barra de progresso: quanto faltava
    const sim = this.battle.sim;
    const progress = sim.progress;
    const bar = this.add.graphics();
    const bx = 610;
    const bw = 700;
    const by = 380;
    bar.fillStyle(COLORS.ink, 1);
    bar.fillRoundedRect(bx - 8, by - 8, bw + 16, 56, 16);
    bar.fillStyle(0x6b5a48, 1);
    bar.fillRoundedRect(bx, by, bw, 40, 12);
    const fill = this.add.graphics();
    const marker = this.add.image(bx, by + 20, 'players', `${sim.players[0]?.character ?? 'faisca'}_run_0`).setScale(0.5);
    this.tweens.addCounter({
      from: 0,
      to: progress,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        fill.clear();
        fill.fillStyle(COLORS.accent, 1);
        fill.fillRoundedRect(bx, by, Math.max(16, bw * v), 40, 12);
        marker.x = bx + bw * v;
      },
    });
    for (const mk of sim.boss?.phaseMarkers() ?? []) {
      bar.fillStyle(COLORS.paper, 1);
      bar.fillRect(bx + bw * mk - 3, by - 6, 6, 52);
    }
    bar.fillStyle(COLORS.gold, 1);
    bar.fillCircle(bx + bw + 24, by + 20, 18);
    this.add.text(960, 460, `${Math.round(progress * 100)}%`, style(34, CSS.ink)).setOrigin(0.5);
    const fromMap = this.battle.params.from === 'map';
    this.menu = new Menu(this, 960, 580, [
      { kind: 'button', label: () => t('tryAgain'), onSelect: () => this.battle.retry() },
      { kind: 'button', label: () => t('exitMap'), onSelect: () => this.battle.exitTo('map'), disabled: () => !fromMap },
      { kind: 'button', label: () => t('exitMenu'), onSelect: () => this.battle.exitTo('menu') },
    ], { width: 560, rowH: 86, fontSize: 42 });
  }

  override update(): void {
    InputService.poll();
    this.menu.update();
    InputService.endTick();
  }
}
