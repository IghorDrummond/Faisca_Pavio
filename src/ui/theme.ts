import type Phaser from 'phaser';
import { SettingsService } from '../services/settings';

export const COLORS = {
  ink: 0x1c120b,
  paper: 0xefe2c4,
  paperDark: 0xcdb98c,
  accent: 0xd9542b,
  gold: 0xe8b64c,
  red: 0xa8322a,
  green: 0x5d8a3a,
  shadow: 0x000000,
};

export const CSS = {
  ink: '#1c120b',
  paper: '#efe2c4',
  gold: '#e8b64c',
  accent: '#d9542b',
  white: '#fff8e6',
  dim: '#8c7a5c',
};

export const FONT_TITLE = 'Limelight, Georgia, serif';
export const FONT_BODY = '"Josefin Sans", system-ui, sans-serif';

export function textScale(): number {
  return SettingsService.get('textScale');
}

/** Estilo de texto padronizado (escala de texto da acessibilidade aplicada). */
export function style(size: number, color = CSS.ink, opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_BODY,
    fontSize: `${Math.round(size * textScale())}px`,
    color,
    fontStyle: 'bold',
    ...opts,
  };
}

export function titleStyle(size: number, color = CSS.gold, stroke = CSS.ink): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_TITLE,
    fontSize: `${Math.round(size * textScale())}px`,
    color,
    stroke,
    strokeThickness: Math.max(4, Math.round(size / 9)),
    shadow: { offsetX: 4, offsetY: 5, color: '#000', blur: 0, fill: true, stroke: true },
  };
}

/** Painel de papel envelhecido com moldura ornamental dupla. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, opts: { fill?: number; alpha?: number } = {}): void {
  g.fillStyle(COLORS.shadow, 0.45);
  g.fillRoundedRect(x + 10, y + 12, w, h, 22);
  g.fillStyle(COLORS.ink, 1);
  g.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 26);
  g.fillStyle(opts.fill ?? COLORS.paper, opts.alpha ?? 1);
  g.fillRoundedRect(x, y, w, h, 20);
  g.lineStyle(3, COLORS.ink, 0.8);
  g.strokeRoundedRect(x + 14, y + 14, w - 28, h - 28, 12);
  // cantos ornamentais
  for (const [cx, cy] of [
    [x + 14, y + 14],
    [x + w - 14, y + 14],
    [x + 14, y + h - 14],
    [x + w - 14, y + h - 14],
  ] as [number, number][]) {
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(cx, cy, 8);
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(cx, cy, 4);
  }
  // manchas de papel velho (determinísticas)
  g.fillStyle(0x8c6a3a, 0.07);
  for (let i = 0; i < 9; i++) {
    const px = x + ((i * 997) % Math.max(1, w - 60)) + 30;
    const py = y + ((i * 571) % Math.max(1, h - 60)) + 30;
    g.fillCircle(px, py, 18 + ((i * 13) % 30));
  }
}
