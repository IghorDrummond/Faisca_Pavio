import Phaser from 'phaser';
import { InputService } from '../platform/input';
import { AudioService } from '../services/audio';
import { COLORS, CSS, style } from './theme';

export type MenuItem =
  | { kind: 'button'; label: () => string; onSelect: () => void; disabled?: () => boolean; hint?: () => string }
  | { kind: 'toggle'; label: () => string; get: () => boolean; set: (v: boolean) => void; hint?: () => string }
  | { kind: 'slider'; label: () => string; get: () => number; set: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string; hint?: () => string }
  | { kind: 'choice'; label: () => string; options: () => { value: string | number; label: string }[]; get: () => string | number; set: (v: string | number) => void; hint?: () => string };

interface Row {
  item: MenuItem;
  text: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text | null;
  hit: Phaser.GameObjects.Zone;
}

/**
 * Menu vertical navegável por teclado, controle e mouse. Foco sempre visível.
 * Esquerda/direita alteram sliders/opções; Confirmar ativa; Voltar chama onBack.
 */
export class Menu {
  readonly scene: Phaser.Scene;
  readonly container: Phaser.GameObjects.Container;
  private rows: Row[] = [];
  index = 0;
  private cursor: Phaser.GameObjects.Graphics;
  private hintText: Phaser.GameObjects.Text | null = null;
  onBack: (() => void) | null = null;
  enabled = true;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly rowH: number;
  private scrollTop = 0;
  private readonly maxVisible: number;
  private readonly align: 'center' | 'left';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    items: MenuItem[],
    opts: { width?: number; rowH?: number; fontSize?: number; maxVisible?: number; align?: 'center' | 'left'; hintY?: number; color?: string } = {},
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = opts.width ?? 700;
    this.rowH = opts.rowH ?? 64;
    this.maxVisible = opts.maxVisible ?? 99;
    this.align = opts.align ?? (items.some((i) => i.kind !== 'button') ? 'left' : 'center');
    this.container = scene.add.container(0, 0);
    this.cursor = scene.add.graphics();
    this.container.add(this.cursor);
    const fs = opts.fontSize ?? 36;
    items.forEach((item, i) => {
      const ry = y + i * this.rowH;
      const tx = this.align === 'center' ? x : x - this.width / 2 + 40;
      const text = scene.add.text(tx, ry, '', style(fs, opts.color ?? CSS.ink)).setOrigin(this.align === 'center' ? 0.5 : 0, 0.5);
      let value: Phaser.GameObjects.Text | null = null;
      if (item.kind !== 'button') value = scene.add.text(x + this.width / 2 - 40, ry, '', style(fs * 0.9, CSS.accent)).setOrigin(1, 0.5);
      const hit = scene.add.zone(x, ry, this.width, this.rowH).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        if (!this.enabled) return;
        if (this.index !== i) {
          this.index = i;
          AudioService.play('ui_move', { bus: 'voice', volume: 0.5 });
          this.refresh();
        }
      });
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!this.enabled) return;
        this.index = i;
        if (item.kind === 'slider' || item.kind === 'choice') {
          this.adjust(p.x > x ? 1 : -1);
        } else this.activate();
      });
      this.container.add([text, hit]);
      if (value) this.container.add(value);
      this.rows.push({ item, text, value, hit });
    });
    if (opts.hintY !== undefined) {
      this.hintText = scene.add.text(x, opts.hintY, '', style(24, CSS.dim, { wordWrap: { width: this.width + 200 }, align: 'center' })).setOrigin(0.5, 0);
      this.container.add(this.hintText);
    }
    this.refresh();
  }

  setDepth(d: number): this {
    this.container.setDepth(d);
    return this;
  }

  private isDisabled(i: number): boolean {
    const it = this.rows[i]?.item;
    return !!(it && it.kind === 'button' && it.disabled?.());
  }

  refresh(): void {
    // rolagem quando há muitas opções
    if (this.index < this.scrollTop) this.scrollTop = this.index;
    if (this.index >= this.scrollTop + this.maxVisible) this.scrollTop = this.index - this.maxVisible + 1;
    this.rows.forEach((r, i) => {
      const vis = i >= this.scrollTop && i < this.scrollTop + this.maxVisible;
      const ry = this.y + (i - this.scrollTop) * this.rowH;
      r.text.setVisible(vis).setY(ry);
      r.hit.setY(ry).setVisible(vis);
      if (r.value) r.value.setVisible(vis).setY(ry);
      const focused = i === this.index;
      r.text.setText(r.item.label());
      r.text.setColor(this.isDisabled(i) ? CSS.dim : focused ? '#000000' : CSS.ink);
      r.text.setScale(focused ? 1.06 : 1);
      if (r.value) r.value.setText(this.valueText(r.item));
    });
    const g = this.cursor;
    g.clear();
    const fy = this.y + (this.index - this.scrollTop) * this.rowH;
    g.fillStyle(COLORS.gold, 0.55);
    g.fillRoundedRect(this.x - this.width / 2, fy - this.rowH / 2 + 4, this.width, this.rowH - 8, 14);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeRoundedRect(this.x - this.width / 2, fy - this.rowH / 2 + 4, this.width, this.rowH - 8, 14);
    // mãozinha apontando (foco visível)
    const hx = this.x - this.width / 2 - 34;
    g.fillStyle(COLORS.ink, 1);
    g.fillTriangle(hx - 16, fy - 16, hx - 16, fy + 16, hx + 12, fy);
    g.fillStyle(0xfff8e6, 1);
    g.fillTriangle(hx - 11, fy - 9, hx - 11, fy + 9, hx + 4, fy);
    const cur = this.rows[this.index]?.item;
    if (this.hintText) this.hintText.setText(cur?.hint?.() ?? '');
  }

  private valueText(it: MenuItem): string {
    switch (it.kind) {
      case 'toggle':
        return it.get() ? '◉ Ligado' : '○ Desligado';
      case 'slider': {
        const v = it.get();
        return `◄ ${it.format ? it.format(v) : `${Math.round(v * 100)}%`} ►`;
      }
      case 'choice': {
        const o = it.options().find((x) => x.value === it.get());
        return `◄ ${o?.label ?? String(it.get())} ►`;
      }
      default:
        return '';
    }
  }

  private move(d: number): void {
    const n = this.rows.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!this.isDisabled(i)) break;
    }
    this.index = i;
    AudioService.play('ui_move', { bus: 'voice', volume: 0.5 });
    this.refresh();
  }

  private adjust(d: number): void {
    const it = this.rows[this.index]?.item;
    if (!it) return;
    if (it.kind === 'slider') {
      const v = Math.round((it.get() + d * it.step) / it.step) * it.step;
      it.set(Math.max(it.min, Math.min(it.max, Number(v.toFixed(4)))));
    } else if (it.kind === 'choice') {
      const opts = it.options();
      const idx = opts.findIndex((o) => o.value === it.get());
      const next = opts[(idx + d + opts.length) % opts.length];
      if (next) it.set(next.value);
    } else if (it.kind === 'toggle') {
      it.set(!it.get());
    } else return;
    AudioService.play('ui_move', { bus: 'voice', volume: 0.6 });
    this.refresh();
  }

  private activate(): void {
    const it = this.rows[this.index]?.item;
    if (!it) return;
    if (it.kind === 'button') {
      if (it.disabled?.()) {
        AudioService.play('ui_denied', { bus: 'voice' });
        return;
      }
      AudioService.play('ui_confirm', { bus: 'voice', volume: 0.7 });
      it.onSelect();
    } else if (it.kind === 'toggle') {
      it.set(!it.get());
      AudioService.play('ui_confirm', { bus: 'voice', volume: 0.6 });
    } else this.adjust(1);
    this.refresh();
  }

  /** Chamado a cada quadro pela cena dona (depois de InputService.poll()). */
  update(): void {
    if (!this.enabled) return;
    if (InputService.menu('up')) this.move(-1);
    else if (InputService.menu('down')) this.move(1);
    else if (InputService.menu('left')) this.adjust(-1);
    else if (InputService.menu('right')) this.adjust(1);
    else if (InputService.menu('confirm')) this.activate();
    else if (InputService.menu('back') && this.onBack) {
      AudioService.play('ui_back', { bus: 'voice' });
      this.onBack();
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
    for (const r of this.rows) {
      if (v) r.hit.setInteractive();
      else r.hit.disableInteractive();
    }
  }
}
