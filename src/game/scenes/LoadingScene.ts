import Phaser from 'phaser';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { Logger } from '../../services/logger';
import { AudioService } from '../../services/audio';
import { COLORS, CSS, style, titleStyle } from '../../ui/theme';
import { AssetPackLoader } from '../assets';
import { Router } from '../router';

interface LoadingData {
  packs: string[];
  next: string;
  data: object;
}

/** Tela de carregamento temática com barra de progresso REAL e recuperação de falha de rede. */
export class LoadingScene extends Phaser.Scene {
  private params!: LoadingData;
  private bar!: Phaser.GameObjects.Graphics;
  private reel!: Phaser.GameObjects.Graphics;
  private msg!: Phaser.GameObjects.Text;
  private failed = false;
  private retryBtn: Phaser.GameObjects.Text | null = null;
  private progress = 0;
  private startedAt = 0;

  constructor() {
    super('Loading');
  }

  init(d: LoadingData): void {
    this.params = d;
    this.failed = false;
    this.progress = 0;
  }

  create(): void {
    this.add.rectangle(960, 540, 1920, 1080, 0x1b120c);
    this.add.text(960, 380, t('loading'), titleStyle(72)).setOrigin(0.5);
    this.reel = this.add.graphics();
    this.bar = this.add.graphics();
    this.msg = this.add.text(960, 700, t('loadingTip'), style(30, CSS.paper)).setOrigin(0.5);
    Router.reveal(this);
    this.startedAt = performance.now();
    this.startLoad();
  }

  private startLoad(): void {
    this.failed = false;
    this.retryBtn?.destroy();
    this.retryBtn = null;
    this.msg.setText(t('loadingTip')).setColor(CSS.paper);
    let queued = false;
    for (const p of this.params.packs) queued = AssetPackLoader.queue(this, p) || queued;
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => (this.progress = v));
    this.load.once(Phaser.Loader.Events.COMPLETE, (_l: unknown, _ok: number, failed: number) => {
      if (failed > 0) {
        this.onFail();
        return;
      }
      for (const p of this.params.packs) AssetPackLoader.finalize(this, p);
      void AudioService.whenDecoded(this.params.packs.flatMap((p) => AssetPackLoader.audioKeys(p))).then(() => this.finish());
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (f: Phaser.Loader.File) => {
      Logger.warn('Loading', `falha ao baixar ${f.key} (${f.url as string})`);
    });
    if (queued) this.load.start();
    else this.finish();
  }

  private onFail(): void {
    this.failed = true;
    this.load.off(Phaser.Loader.Events.PROGRESS);
    this.msg.setText(t('loadError')).setColor('#ff9b7a');
    this.retryBtn = this.add
      .text(960, 800, `▶ ${t('retry')}`, style(40, CSS.gold))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.retry());
  }

  private retry(): void {
    // remove arquivos com falha do cache para tentar de novo
    this.load.removeAllListeners();
    this.startLoad();
  }

  private finish(): void {
    const minShow = 250;
    const wait = Math.max(0, minShow - (performance.now() - this.startedAt));
    this.time.delayedCall(wait, () => Router.go(this, this.params.next, this.params.data, []));
  }

  override update(time: number): void {
    InputService.poll();
    if (this.failed && InputService.menu('confirm')) this.retry();
    InputService.endTick();
    const g = this.bar;
    g.clear();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(560 - 6, 600 - 6, 800 + 12, 40 + 12, 16);
    g.fillStyle(COLORS.paper, 1);
    g.fillRoundedRect(560, 600, 800, 40, 12);
    g.fillStyle(COLORS.accent, 1);
    g.fillRoundedRect(560, 600, Math.max(24, 800 * this.progress), 40, 12);
    // rolo de filme girando
    const r = this.reel;
    r.clear();
    const a = time / 400;
    r.fillStyle(COLORS.ink, 1);
    r.fillCircle(960, 510, 60);
    r.fillStyle(COLORS.paperDark, 1);
    r.fillCircle(960, 510, 52);
    for (let k = 0; k < 5; k++) {
      const aa = a + (k / 5) * Math.PI * 2;
      r.fillStyle(COLORS.ink, 1);
      r.fillCircle(960 + Math.cos(aa) * 30, 510 + Math.sin(aa) * 30, 11);
    }
    r.fillCircle(960, 510, 8);
  }
}
