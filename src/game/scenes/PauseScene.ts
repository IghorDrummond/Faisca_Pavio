import Phaser from 'phaser';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { COLORS, CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Menu, type MenuItem } from '../../ui/Menu';
import type { BattleScene } from './BattleScene';

/** Pausa: Continuar, Tentar de novo, Opções, Sair para o mapa, Sair para o menu. */
export class PauseScene extends Phaser.Scene {
  private battle!: BattleScene;
  private menu!: Menu;
  private reason = 'user';
  private confirm: Menu | null = null;

  constructor() {
    super('Pause');
  }

  init(d: { battle: BattleScene; reason: string }): void {
    this.battle = d.battle;
    this.reason = d.reason;
    this.confirm = null;
  }

  create(): void {
    this.add.rectangle(960, 540, 1920, 1080, COLORS.ink, 0.55);
    const g = this.add.graphics();
    drawPanel(g, 610, 180, 700, 720);
    this.add.text(960, 260, t('paused'), titleStyle(84)).setOrigin(0.5);
    const why = t(`pausedReason_${this.reason}` as never);
    if (why) this.add.text(960, 330, why, style(24, CSS.dim, { wordWrap: { width: 620 }, align: 'center' })).setOrigin(0.5);
    const fromMap = this.battle.params.from === 'map';
    const items: MenuItem[] = [
      { kind: 'button', label: () => t('resume'), onSelect: () => this.battle.resume() },
      { kind: 'button', label: () => t('tryAgain'), onSelect: () => this.battle.retry() },
      { kind: 'button', label: () => t('options'), onSelect: () => this.openOptions() },
      { kind: 'button', label: () => t('exitMap'), onSelect: () => this.ask('map'), disabled: () => !fromMap },
      { kind: 'button', label: () => t('exitMenu'), onSelect: () => this.ask('menu') },
    ];
    if (this.battle.sim.players[1]?.joined) {
      items.splice(3, 0, {
        kind: 'button',
        label: () => t('p2Leave'),
        onSelect: () => {
          this.battle.leaveP2();
          this.battle.resume();
        },
      });
    }
    this.menu = new Menu(this, 960, items.length > 5 ? 400 : 420, items, { width: 560, rowH: items.length > 5 ? 76 : 84, fontSize: 40 });
    this.menu.onBack = () => this.battle.resume();
  }

  private ask(target: 'map' | 'menu'): void {
    // confirmação para ação destrutiva (progresso da tentativa é perdido)
    this.menu.enabled = false;
    this.menu.setVisible(false);
    const title = this.add.text(960, 460, target === 'map' ? t('exitMap') + '?' : t('exitMenu') + '?', style(40)).setOrigin(0.5);
    this.confirm = new Menu(this, 960, 580, [
      { kind: 'button', label: () => t('no'), onSelect: () => close() },
      { kind: 'button', label: () => t('yes'), onSelect: () => this.battle.exitTo(target) },
    ], { width: 400, rowH: 80 });
    const close = (): void => {
      title.destroy();
      this.confirm?.destroy();
      this.confirm = null;
      this.menu.enabled = true;
      this.menu.setVisible(true);
    };
    this.confirm.onBack = close;
  }

  private openOptions(): void {
    this.menu.enabled = false;
    this.scene.launch('Options', { returnTo: 'Pause' });
    this.scene.bringToTop('Options');
    this.scene.bringToTop('Iris');
    this.scene.pause();
  }

  onOptionsClosed(): void {
    this.menu.enabled = true;
    this.menu.refresh();
  }

  override update(): void {
    InputService.poll();
    if (this.confirm) this.confirm.update();
    else if (this.menu.enabled && InputService.pauseOnly()) this.battle.resume();
    else this.menu.update();
    InputService.endTick();
  }
}
