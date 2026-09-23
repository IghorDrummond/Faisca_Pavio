import Phaser from 'phaser';
import { buy, owns, priceOf, type ShopItem } from '../../core/economy';
import { SONGS } from '../../data/music';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { AudioService } from '../../services/audio';
import { GameState } from '../../services/gameState';
import { CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Router } from '../router';

const ITEMS: ShopItem[] = [
  { kind: 'weapon', id: 'leque' },
  { kind: 'weapon', id: 'teleguiada' },
  { kind: 'weapon', id: 'rojao' },
  { kind: 'charm', id: 'coracaoCera' },
  { kind: 'charm', id: 'fumacaPalco' },
  { kind: 'charm', id: 'luvaMagnetica' },
  { kind: 'charm', id: 'cartolaSorte' },
];

/** Falas rimadas do Seu Trapo. */
const RHYMES = {
  hello: ['Entre, freguês, sem acanhamento — aqui tem remendo pra todo momento!', 'Chegou visita, que alegria! Tem prenda nova na estantaria!'],
  bought: ['Negócio feito, aperto de mão — leve com carinho, não jogue no chão!', 'Vendido! Que bela escolha, sim senhor — vai brilhar mais que um refletor!'],
  poor: ['Moeda curta, bolso vazio? Volte mais tarde, meu amigo esguio!', 'Sem tostão não sai negócio, volte com mais, meu caro sócio!'],
  owned: ['Isso já é seu, não vendo em dobro — nem mesmo pra um cliente tão sóbrio!'],
  bye: ['Até logo, volte depressa — a loja do Trapo nunca tem pressa!'],
};

function iconOf(it: ShopItem): string {
  return it.kind === 'weapon' ? `icon_w_${it.id}` : `icon_c_${it.id}`;
}

/** Empório do Seu Trapo: prateleira animada, preço, descrição, confirmação e estado "comprado". */
export class ShopScene extends Phaser.Scene {
  private idx = 0;
  private icons: Phaser.GameObjects.Image[] = [];
  private tags: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private speech!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private confirming = false;
  private trapo!: Phaser.GameObjects.Sprite;
  private rhymeIdx = 0;

  constructor() {
    super('Shop');
  }

  create(): void {
    if (!GameState.save) {
      Router.go(this, 'MainMenu');
      return;
    }
    if (this.textures.exists('bg_shop')) this.add.image(0, 0, 'bg_shop').setOrigin(0, 0).setDisplaySize(1920, 1080);
    else this.add.rectangle(960, 540, 1920, 1080, 0x4a3322);
    this.trapo = this.add.sprite(1560, 820, 'shop', 'trapo_idle_0').setOrigin(0.5, 1);
    if (this.anims.exists('trapo_idle')) this.trapo.play('trapo_idle');
    this.add.text(960, 80, t('shopTitle'), titleStyle(70)).setOrigin(0.5);
    // prateleira
    const g = this.add.graphics();
    g.fillStyle(0x1c120b, 1);
    g.fillRect(110, 520, 1180, 26);
    g.fillRect(110, 820, 1180, 26);
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(116, 524, 1168, 18);
    g.fillRect(116, 824, 1168, 18);
    ITEMS.forEach((it, i) => {
      const row = i < 3 ? 0 : 1;
      const col = row === 0 ? i : i - 3;
      const x = row === 0 ? 300 + col * 360 : 220 + col * 280;
      const y = row === 0 ? 430 : 730;
      const icon = this.add.image(x, y, 'ui', iconOf(it)).setScale(1.1);
      this.tweens.add({ targets: icon, y: y - 8, yoyo: true, repeat: -1, duration: 900 + i * 70, ease: 'Sine.easeInOut' });
      const tag = this.add.text(x, y + 88, '', style(26, CSS.ink, { backgroundColor: '#efe2c4', padding: { x: 8, y: 2 } })).setOrigin(0.5);
      icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.idx = i;
        this.refresh();
        this.askBuy();
      });
      icon.on('pointerover', () => {
        this.idx = i;
        this.refresh();
      });
      this.icons.push(icon);
      this.tags.push(tag);
    });
    this.cursor = this.add.graphics();
    const pg = this.add.graphics();
    drawPanel(pg, 110, 880, 1180, 170);
    this.nameText = this.add.text(150, 905, '', style(34, CSS.accent));
    this.descText = this.add.text(150, 955, '', style(26, CSS.ink, { wordWrap: { width: 1100 } }));
    const bubble = this.add.graphics();
    drawPanel(bubble, 1320, 170, 540, 250);
    this.speech = this.add.text(1350, 200, '', style(26, CSS.ink, { wordWrap: { width: 480 }, fontStyle: 'italic' }));
    this.coinsText = this.add.text(40, 30, '', style(30, CSS.paper, { stroke: CSS.ink, strokeThickness: 6 }));
    this.add.text(1880, 1050, 'Voltar: Esc / B', style(22, CSS.paper, { stroke: CSS.ink, strokeThickness: 4 })).setOrigin(1, 1);
    this.say(RHYMES.hello[0]!);
    const song = SONGS.shop;
    if (song) AudioService.playSong(song, 0);
    this.refresh();
    Router.reveal(this);
  }

  private say(line: string): void {
    this.speech.setText(`Seu Trapo: “${line}”`);
    this.tweens.add({ targets: this.trapo, scaleY: 1.06, yoyo: true, duration: 120, repeat: 1 });
  }

  private refresh(): void {
    const s = GameState.save!;
    ITEMS.forEach((it, i) => {
      const own = owns(s, it);
      this.tags[i]!.setText(own ? t('bought') : `◉ ${priceOf(it)}`);
      this.icons[i]!.setAlpha(own ? 0.55 : 1);
    });
    const it = ITEMS[this.idx]!;
    const icon = this.icons[this.idx]!;
    this.cursor.clear();
    this.cursor.lineStyle(6, 0xe8b64c, 1);
    this.cursor.strokeRoundedRect(icon.x - 90, icon.y - 90, 180, 200, 16);
    const nm = it.kind === 'weapon' ? t(`w_${it.id}` as never) : t(`c_${it.id}` as never);
    const ds = it.kind === 'weapon' ? t(`wd_${it.id}` as never) : t(`cd_${it.id}` as never);
    this.nameText.setText(`${nm} — ${owns(s, it) ? t('bought') : t('buy', { n: priceOf(it) })}`);
    this.descText.setText(this.confirming ? `${ds}\n${t('confirm')}? (Confirmar = sim · Voltar = não)` : ds);
    this.coinsText.setText(t('coins', { n: s.coins }));
  }

  private askBuy(): void {
    const s = GameState.save!;
    const it = ITEMS[this.idx]!;
    if (owns(s, it)) {
      this.say(RHYMES.owned[0]!);
      AudioService.play('ui_denied', { bus: 'voice' });
      return;
    }
    if (s.coins < priceOf(it)) {
      this.say(RHYMES.poor[this.rhymeIdx++ % 2]!);
      AudioService.play('ui_denied', { bus: 'voice' });
      return;
    }
    this.confirming = true;
    this.refresh();
  }

  private doBuy(): void {
    const s = GameState.save!;
    const r = buy(s, ITEMS[this.idx]!);
    this.confirming = false;
    if (r.result === 'ok') {
      GameState.update(() => r.save);
      AudioService.play('coin', { priority: 2 });
      this.say(RHYMES.bought[this.rhymeIdx++ % 2]!);
      const icon = this.icons[this.idx]!;
      this.tweens.add({ targets: icon, scale: 1.4, yoyo: true, duration: 160 });
    }
    this.refresh();
  }

  private leave(): void {
    this.say(RHYMES.bye[0]!);
    void GameState.persist();
    AudioService.stopMusic(0.3);
    Router.go(this, 'WorldMap', {}, ['map']);
  }

  override update(): void {
    InputService.poll();
    if (this.confirming) {
      if (InputService.menu('confirm')) this.doBuy();
      else if (InputService.menu('back')) {
        this.confirming = false;
        this.refresh();
      }
    } else {
      const n = ITEMS.length;
      if (InputService.menu('right') || InputService.menu('down')) this.move(1, n);
      else if (InputService.menu('left') || InputService.menu('up')) this.move(-1, n);
      else if (InputService.menu('confirm')) this.askBuy();
      else if (InputService.menu('back')) this.leave();
    }
    InputService.endTick();
  }

  private move(d: number, n: number): void {
    this.idx = (this.idx + d + n) % n;
    AudioService.play('ui_move', { bus: 'voice' });
    this.refresh();
  }
}
