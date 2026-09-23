/**
 * Projéteis e efeitos. Regras de leitura:
 * - tiros do jogador: menores, translúcidos, cores quentes;
 * - projéteis inimigos: formas fortes, contorno escuro grosso, brilho interno, nunca ciano;
 * - objetos de parry: CIANO ELÉTRICO #2BE7F0 com contorno branco (exclusivo).
 */
import { type Canvas, type Pt, INK, WHITE, ellipsePts, flame, inkLine, puff, roundRectPts, shape, sparkle } from './lib/svg';

export const PARRY = '#2be7f0';
export const PARRY_SH = '#11a9b8';

export interface SpriteDef {
  name: string;
  w: number;
  h: number;
  draw: (c: Canvas, i: number) => void;
  frames?: number;
  fps?: number;
  repeat?: number;
}

const HOT = { a: '#ffe27a', b: '#ff9b2e', c: '#fff6cf' };

function spark(c: Canvas, cx: number, cy: number, len: number, r: number, i: number, col = HOT): void {
  // faísca alongada (rastro) apontando para a direita
  const pts: Pt[] = [
    [cx + r * 1.4, cy],
    [cx + r * 0.2, cy - r],
    [cx - len * 0.5, cy - r * 0.45],
    [cx - len, cy],
    [cx - len * 0.5, cy + r * 0.45],
    [cx + r * 0.2, cy + r],
  ];
  shape(c, pts, { fill: col.b, width: 3.2, boil: 1, opacity: 0.92 }, 600 + i);
  shape(c, ellipsePts(cx + r * 0.2, cy, r * 0.75, r * 0.6, 10), { fill: col.a, width: 0.01, stroke: 'none' }, 610 + i);
  shape(c, ellipsePts(cx + r * 0.4, cy, r * 0.35, r * 0.3, 8), { fill: col.c, width: 0.01, stroke: 'none' }, 620 + i);
}

function rocket(c: Canvas, cx: number, cy: number, s: number, i: number): void {
  flame(c, cx - s * 1.7, cy + s * 0.05, s * 1.3, i / 3, 1.3, 640 + i);
  c.group(`rotate(90 ${cx - s * 1.7} ${cy})`, () => undefined);
  shape(c, roundRectPts(cx - s * 1.4, cy - s * 0.42, s * 2.1, s * 0.84, s * 0.3), { fill: '#d23b2a', shade: '#8a1f15', shadeOffset: 3, width: 4 }, 650 + i);
  shape(c, [[cx + s * 0.7, cy - s * 0.42], [cx + s * 1.4, cy], [cx + s * 0.7, cy + s * 0.42]], { fill: '#f1dca0', width: 4 }, 651 + i);
  shape(c, [[cx - s * 1.3, cy - s * 0.4], [cx - s * 1.7, cy - s * 0.85], [cx - s * 0.9, cy - s * 0.4]], { fill: '#f1dca0', width: 3.5 }, 652 + i);
  shape(c, [[cx - s * 1.3, cy + s * 0.4], [cx - s * 1.7, cy + s * 0.85], [cx - s * 0.9, cy + s * 0.4]], { fill: '#f1dca0', width: 3.5 }, 653 + i);
  inkLine(c, [[cx - s * 0.3, cy - s * 0.42], [cx - s * 0.3, cy + s * 0.42]], 3, 654 + i, WHITE, 0.5);
}

export const PLAYER_FX: SpriteDef[] = [
  { name: 'shot_reta', w: 70, h: 36, frames: 2, fps: 24, repeat: -1, draw: (c, i) => spark(c, 50, 18, 42 + i * 4, 9, i) },
  { name: 'shot_leque', w: 50, h: 40, frames: 2, fps: 24, repeat: -1, draw: (c, i) => { flame(c, 26, 26, 26, i / 2, 1.2, 660 + i, { outer: '#ff7b2a', mid: '#ffb13b', core: '#fff1b5' }); } },
  { name: 'shot_teleguiada', w: 56, h: 40, frames: 2, fps: 24, repeat: -1, draw: (c, i) => spark(c, 38, 20, 30, 10, i + 3, { a: '#ffd1f0', b: '#ff6fa8', c: '#fff' }) },
  { name: 'shot_rojao', w: 110, h: 56, frames: 3, fps: 24, repeat: -1, draw: (c, i) => rocket(c, 70, 28, 18, i) },
  { name: 'shot_rojao_weak', w: 44, h: 30, frames: 2, fps: 24, repeat: -1, draw: (c, i) => spark(c, 30, 15, 24, 7, i + 6) },
  { name: 'ex_reta', w: 150, h: 80, frames: 3, fps: 24, repeat: -1, draw: (c, i) => { spark(c, 110, 40, 100, 26, i + 9); sparkle(c, 60, 24 + i * 8, 10, HOT.a, 700 + i); } },
  { name: 'ex_leque', w: 56, h: 56, frames: 2, fps: 24, repeat: -1, draw: (c, i) => flame(c, 28, 36, 36, i / 2, 1.5, 710 + i) },
  { name: 'ex_teleguiada', w: 64, h: 48, frames: 2, fps: 24, repeat: -1, draw: (c, i) => spark(c, 44, 24, 36, 14, i + 12, { a: '#ffd1f0', b: '#ff4f8f', c: '#fff' }) },
  { name: 'ex_rojao', w: 140, h: 70, frames: 3, fps: 24, repeat: -1, draw: (c, i) => rocket(c, 88, 35, 24, i + 3) },
  { name: 'ex_rojao_small', w: 90, h: 46, frames: 2, fps: 24, repeat: -1, draw: (c, i) => rocket(c, 58, 23, 14, i + 6) },
  { name: 'shot_plane', w: 64, h: 30, frames: 2, fps: 24, repeat: -1, draw: (c, i) => spark(c, 46, 15, 36, 8, i + 15) },
  { name: 'shot_bomb', w: 50, h: 50, frames: 2, fps: 12, repeat: -1, draw: (c, i) => { shape(c, ellipsePts(25, 28, 16, 16, 12), { fill: '#3a3230', shade: '#141010', shadeOffset: 4, highlight: 'rgba(255,255,255,0.4)' }, 720); inkLine(c, [[30, 14], [36, 6]], 4, 721); flame(c, 38, 6, 12, i / 2, 1.2, 722 + i); } },
  { name: 'ex_plane', w: 130, h: 70, frames: 3, fps: 24, repeat: -1, draw: (c, i) => { spark(c, 96, 35, 84, 24, i + 18); } },
  {
    name: 'muzzle',
    w: 70,
    h: 70,
    frames: 3,
    fps: 24,
    repeat: 0,
    draw: (c, i) => sparkle(c, 35, 35, 28 - i * 7, i === 2 ? '#fff6cf' : HOT.a, 730 + i),
  },
  {
    name: 'impact',
    w: 90,
    h: 90,
    frames: 4,
    fps: 24,
    repeat: 0,
    draw: (c, i) => {
      const r = 14 + i * 9;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i * 0.3;
        sparkle(c, 45 + Math.cos(a) * r, 45 + Math.sin(a) * r, 9 - i * 1.6, k % 2 ? HOT.a : HOT.b, 740 + k + i * 5);
      }
      if (i < 2) shape(c, ellipsePts(45, 45, 16 - i * 5, 16 - i * 5, 10), { fill: '#fff6cf', width: 3 }, 760 + i);
    },
  },
  {
    name: 'fizzle',
    w: 50,
    h: 50,
    frames: 3,
    fps: 16,
    repeat: 0,
    draw: (c, i) => puff(c, 25, 25, 8 + i * 5, `rgba(240,230,210,${0.9 - i * 0.25})`, 770 + i, 5),
  },
  {
    name: 'explosion',
    w: 260,
    h: 260,
    frames: 6,
    fps: 20,
    repeat: 0,
    draw: (c, i) => {
      const t = i / 5;
      const r = 40 + t * 80;
      if (i < 4) {
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + i;
          puff(c, 130 + Math.cos(a) * r * 0.55, 130 + Math.sin(a) * r * 0.55, r * 0.38, k % 2 ? '#ffb13b' : '#ff7b2a', 780 + k + i * 7, 5);
        }
        shape(c, ellipsePts(130, 130, r * 0.5, r * 0.5, 16), { fill: '#fff1b5', width: 4 }, 830 + i);
      } else {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + i;
          puff(c, 130 + Math.cos(a) * r * 0.6, 130 + Math.sin(a) * r * 0.6, r * 0.28 * (1.2 - t * 0.5), 'rgba(90,80,75,0.85)', 840 + k + i * 6, 5);
        }
      }
    },
  },
  {
    name: 'smoke',
    w: 120,
    h: 120,
    frames: 5,
    fps: 16,
    repeat: 0,
    draw: (c, i) => puff(c, 60, 60 - i * 4, 22 + i * 8, `rgba(235,228,215,${0.95 - i * 0.16})`, 860 + i, 6),
  },
  {
    name: 'dust',
    w: 90,
    h: 50,
    frames: 4,
    fps: 16,
    repeat: 0,
    draw: (c, i) => {
      puff(c, 30 - i * 5, 32 - i * 2, 10 + i * 3, `rgba(220,205,180,${0.9 - i * 0.2})`, 870 + i, 5);
      puff(c, 60 + i * 5, 32 - i * 2, 9 + i * 3, `rgba(220,205,180,${0.9 - i * 0.2})`, 875 + i, 5);
    },
  },
  {
    name: 'parry_flash',
    w: 200,
    h: 200,
    frames: 4,
    fps: 20,
    repeat: 0,
    draw: (c, i) => {
      sparkle(c, 100, 100, 90 - i * 18, i % 2 ? '#ffffff' : '#fff6cf', 880 + i);
      if (i < 2) sparkle(c, 100, 100, 40, PARRY, 885 + i);
    },
  },
  {
    name: 'hit_star',
    w: 70,
    h: 70,
    frames: 3,
    fps: 20,
    repeat: 0,
    draw: (c, i) => sparkle(c, 35, 35, 30 - i * 8, '#ffffff', 890 + i),
  },
  {
    name: 'parry_star',
    w: 60,
    h: 60,
    frames: 1,
    draw: (c) => sparkle(c, 30, 30, 26, WHITE, 895),
  },
  {
    name: 'coin',
    w: 64,
    h: 64,
    frames: 6,
    fps: 12,
    repeat: -1,
    draw: (c, i) => {
      const sx = Math.abs(Math.cos((i / 6) * Math.PI));
      shape(c, ellipsePts(32, 32, 4 + 22 * sx, 26, 16), { fill: '#e8b64c', shade: '#a8741f', shadeOffset: 4, highlight: 'rgba(255,255,230,0.7)' }, 900 + i);
      if (sx > 0.4) inkLine(c, [[32, 20], [32, 44]], 4, 910 + i);
    },
  },
  {
    name: 'ghost_halo',
    w: 90,
    h: 40,
    frames: 1,
    draw: (c) => shape(c, ellipsePts(45, 20, 30, 9, 16), { fill: 'none', stroke: WHITE, width: 5 }, 920),
  },
];

// -------------------------------------------------------------------------------------------------
// Projéteis inimigos (cada um tem versão normal e versão ciana de parry, sufixo "_p").

interface Pal {
  fill: string;
  shade: string;
  ink: string;
  glow: string;
}
const NORMAL = (fill: string, shade: string, glow = 'rgba(255,245,200,0.75)'): Pal => ({ fill, shade, ink: INK, glow });
const PARRY_PAL: Pal = { fill: PARRY, shade: PARRY_SH, ink: WHITE, glow: 'rgba(255,255,255,0.85)' };

type ProjDraw = (c: Canvas, pal: Pal, i: number) => void;

function gear(c: Canvas, cx: number, cy: number, r: number, teeth: number, pal: Pal, salt: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k < teeth * 4; k++) {
    const a = (k / (teeth * 4)) * Math.PI * 2;
    const rr = k % 4 < 2 ? r : r * 0.78;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  shape(c, pts, { fill: pal.fill, shade: pal.shade, shadeOffset: r * 0.14, stroke: pal.ink, width: 5, boil: 0.6 }, salt);
  shape(c, ellipsePts(cx, cy, r * 0.3, r * 0.3, 10), { fill: pal.shade, stroke: pal.ink, width: 4 }, salt + 1);
}

const numeralBars: Record<string, [number, number, number, number][]> = {
  // barras (x, y, w, h) em unidade de 10px formando algarismos romanos
  XII: [[0, 0, 1, 6], [2, 0, 1, 6], [4, 0, 1, 6], [6, 0, 1, 6]],
  III: [[0, 0, 1, 6], [2, 0, 1, 6], [4, 0, 1, 6]],
  VI: [[0, 0, 1, 6], [2, 0, 1, 6], [4, 0, 1, 6]],
  IX: [[0, 0, 1, 6], [2, 0, 1, 6]],
};

const ENEMY_PROJ: { name: string; w: number; h: number; frames: number; draw: ProjDraw }[] = [
  { name: 'gear', w: 84, h: 84, frames: 2, draw: (c, pal, i) => gear(c, 42, 42, 32, 8, pal, 1000 + i) },
  {
    name: 'seed',
    w: 48,
    h: 48,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(24, 24, 17, 13, 12, 0.3), { fill: pal.fill, shade: pal.shade, shadeOffset: 3, stroke: pal.ink, width: 4.5 }, 1010 + i);
      shape(c, ellipsePts(19, 20, 5, 3, 8, 0.3), { fill: pal.glow, width: 0.01, stroke: 'none' }, 1012 + i);
    },
  },
  {
    name: 'numeral',
    w: 100,
    h: 100,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(50, 50, 42, 42, 16), { fill: pal.fill, shade: pal.shade, shadeOffset: 6, stroke: pal.ink, width: 5 }, 1020 + i);
      const bars = i === 0 ? numeralBars.XII! : numeralBars.III!;
      const totalW = (bars.length * 2 - 1) * 8;
      for (const [bx, , bw, bh] of bars) {
        shape(c, roundRectPts(50 - totalW / 2 + bx * 8, 30, bw * 8, bh * 7, 2, 1), { fill: pal.ink, stroke: pal.ink, width: 1.5, boil: 0.5 }, 1025 + bx);
      }
    },
  },
  {
    name: 'spring',
    w: 70,
    h: 70,
    frames: 2,
    draw: (c, pal, i) => {
      for (let k = 0; k < 4; k++) {
        shape(c, ellipsePts(35, 18 + k * 11 + i * 2, 22, 7, 12), { fill: 'none', stroke: pal.ink, width: 8.5 }, 1030 + k);
        shape(c, ellipsePts(35, 18 + k * 11 + i * 2, 22, 7, 12), { fill: 'none', stroke: pal.fill, width: 4 }, 1034 + k);
      }
    },
  },
  {
    name: 'needle_bolt',
    w: 90,
    h: 40,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, [[8, 20], [70, 13], [86, 20], [70, 27]], { fill: pal.fill, shade: pal.shade, shadeOffset: 2, stroke: pal.ink, width: 4.5 }, 1040 + i);
      shape(c, ellipsePts(24, 20, 7, 3, 8), { fill: pal.shade, stroke: pal.ink, width: 3 }, 1042);
    },
  },
  {
    name: 'button',
    w: 60,
    h: 60,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(30, 30, 24, 24, 16), { fill: pal.fill, shade: pal.shade, shadeOffset: 4, stroke: pal.ink, width: 5 }, 1050 + i);
      for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as Pt[]) shape(c, ellipsePts(30 + dx, 30 + dy, 3.5, 3.5, 8), { fill: pal.ink, stroke: pal.ink, width: 1 }, 1052);
    },
  },
  {
    name: 'spool',
    w: 110,
    h: 110,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(55, 55, 46, 46, 18), { fill: pal.shade, stroke: pal.ink, width: 5 }, 1060 + i);
      shape(c, ellipsePts(55, 55, 34, 34, 16), { fill: pal.fill, stroke: pal.ink, width: 4 }, 1062 + i);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + i * 0.5;
        inkLine(c, [[55 + Math.cos(a) * 12, 55 + Math.sin(a) * 12], [55 + Math.cos(a) * 32, 55 + Math.sin(a) * 32]], 3, 1064 + k, pal.ink, 0.5);
      }
      shape(c, ellipsePts(55, 55, 9, 9, 10), { fill: pal.ink, stroke: pal.ink, width: 2 }, 1070);
    },
  },
  {
    name: 'pin',
    w: 80,
    h: 34,
    frames: 2,
    draw: (c, pal, i) => {
      inkLine(c, [[14, 17], [72, 17]], 8, 1080, pal.ink);
      inkLine(c, [[14, 17], [70, 17]], 3.5, 1081, '#d9d4c8');
      shape(c, ellipsePts(14, 17, 11, 11, 12), { fill: pal.fill, shade: pal.shade, shadeOffset: 2, stroke: pal.ink, width: 4 }, 1082 + i);
    },
  },
  {
    name: 'note',
    w: 70,
    h: 90,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(26, 66, 18, 13, 12, -0.35), { fill: pal.fill, shade: pal.shade, shadeOffset: 3, stroke: pal.ink, width: 5 }, 1090 + i);
      inkLine(c, [[42, 62], [44, 14]], 6, 1092, pal.ink);
      shape(c, [[44, 14], [62, 24 + i * 3], [58, 40], [44, 30]], { fill: pal.fill, stroke: pal.ink, width: 4.5 }, 1093);
    },
  },
  {
    name: 'vinyl',
    w: 120,
    h: 120,
    frames: 2,
    draw: (c, pal, i) => {
      const pts: Pt[] = [];
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        const rr = k % 2 ? 52 : 47;
        pts.push([60 + Math.cos(a) * rr, 60 + Math.sin(a) * rr]);
      }
      shape(c, pts, { fill: '#2b2320', stroke: pal.ink, width: 4, boil: 0.3 }, 1100 + i);
      for (const r of [38, 28]) shape(c, ellipsePts(60, 60, r, r, 20), { fill: 'none', stroke: 'rgba(255,255,255,0.18)', width: 2 }, 1102 + r);
      shape(c, ellipsePts(60, 60, 17, 17, 14), { fill: pal.fill, stroke: pal.ink, width: 4 }, 1104 + i);
    },
  },
  {
    name: 'horseshoe',
    w: 90,
    h: 90,
    frames: 2,
    draw: (c, pal, i) => {
      const d = `M25,70 C10,40 25,15 45,15 C65,15 80,40 65,70`;
      c.add(`<path d="${d}" fill="none" stroke="${pal.ink}" stroke-width="24" stroke-linecap="round"/>`);
      c.add(`<path d="${d}" fill="none" stroke="${pal === PARRY_PAL ? PARRY : i ? '#ff7a2a' : '#ffae3a'}" stroke-width="13" stroke-linecap="round"/>`);
    },
  },
  {
    name: 'spark_ball',
    w: 60,
    h: 60,
    frames: 2,
    draw: (c, pal, i) => {
      sparkle(c, 30, 30, 24, pal.fill, 1110 + i);
      shape(c, ellipsePts(30, 30, 8, 8, 8), { fill: pal.glow, width: 0.01, stroke: 'none' }, 1112);
    },
  },
  {
    name: 'coal',
    w: 80,
    h: 80,
    frames: 2,
    draw: (c, pal, i) => {
      const pts: Pt[] = [[20, 18], [48, 10], [68, 26], [66, 56], [40, 70], [14, 54]];
      shape(c, pts, { fill: pal === PARRY_PAL ? PARRY : '#3a302c', shade: pal.shade === PARRY_SH ? PARRY_SH : '#161110', shadeOffset: 6, stroke: pal.ink, width: 5 }, 1120 + i);
      shape(c, ellipsePts(40, 40, 11, 8, 10), { fill: pal === PARRY_PAL ? WHITE : '#ff7a2a', width: 0.01, stroke: 'none' }, 1122 + i);
    },
  },
  {
    name: 'smoke_ring',
    w: 110,
    h: 110,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(55, 55, 42, 40, 18), { fill: 'none', stroke: pal.ink, width: 22 }, 1130 + i);
      shape(c, ellipsePts(55, 55, 42, 40, 18), { fill: 'none', stroke: pal === PARRY_PAL ? PARRY : '#6d625c', width: 12, boil: 2 }, 1132 + i);
    },
  },
  {
    name: 'crate',
    w: 100,
    h: 100,
    frames: 1,
    draw: (c, pal) => {
      shape(c, roundRectPts(12, 12, 76, 76, 6), { fill: pal === PARRY_PAL ? PARRY : '#b07a3e', shade: pal === PARRY_PAL ? PARRY_SH : '#7a4f23', shadeOffset: 7, stroke: pal.ink, width: 5 }, 1140);
      inkLine(c, [[16, 16], [84, 84]], 5, 1141, pal.ink);
      inkLine(c, [[84, 16], [16, 84]], 5, 1142, pal.ink);
    },
  },
  {
    name: 'cymbal',
    w: 120,
    h: 60,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(60, 30, 52, 18 - i * 3, 18), { fill: pal === PARRY_PAL ? PARRY : '#e2b340', shade: pal === PARRY_PAL ? PARRY_SH : '#9f7418', shadeOffset: 5, highlight: 'rgba(255,255,230,0.6)', stroke: pal.ink, width: 5 }, 1150 + i);
      shape(c, ellipsePts(60, 28, 8, 5, 10), { fill: pal.ink, stroke: pal.ink, width: 2 }, 1152);
    },
  },
  {
    name: 'drum',
    w: 100,
    h: 100,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, roundRectPts(16, 30 + i * 2, 68, 50, 10), { fill: pal === PARRY_PAL ? PARRY : '#c23a2e', shade: pal === PARRY_PAL ? PARRY_SH : '#7f1f18', shadeOffset: 6, stroke: pal.ink, width: 5 }, 1160 + i);
      shape(c, ellipsePts(50, 32 + i * 2, 34, 10, 14), { fill: '#f2e6c8', stroke: pal.ink, width: 4.5 }, 1162);
      for (let k = 0; k < 4; k++) inkLine(c, [[22 + k * 18, 40], [30 + k * 18, 76]], 3.5, 1163 + k, pal === PARRY_PAL ? WHITE : '#e8b64c');
    },
  },
  {
    name: 'feather',
    w: 90,
    h: 40,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, [[6, 20], [40, 6 + i * 2], [84, 20], [40, 34 - i * 2]], { fill: pal.fill, shade: pal.shade, shadeOffset: 3, stroke: pal.ink, width: 4 }, 1170 + i);
      inkLine(c, [[8, 20], [82, 20]], 3, 1172, pal.ink);
    },
  },
  {
    name: 'petal',
    w: 50,
    h: 50,
    frames: 2,
    draw: (c, pal, i) => shape(c, ellipsePts(25, 25, 18, 10, 12, i * 0.8), { fill: pal.fill, shade: pal.shade, shadeOffset: 3, stroke: pal.ink, width: 4 }, 1180 + i),
  },
  {
    name: 'ember',
    w: 56,
    h: 56,
    frames: 2,
    draw: (c, pal, i) => {
      shape(c, ellipsePts(28, 28, 20, 20, 14), { fill: pal.fill, shade: pal.shade, shadeOffset: 4, stroke: pal.ink, width: 5 }, 1190 + i);
      shape(c, ellipsePts(24, 24, 7, 6, 10), { fill: pal.glow, width: 0.01, stroke: 'none' }, 1192 + i);
    },
  },
];

/** Paleta de cada projétil inimigo (nunca ciano). */
const ENEMY_COLORS: Record<string, Pal> = {
  gear: NORMAL('#b8894a', '#6f4d22'),
  seed: NORMAL('#8a5a2b', '#4d2f14'),
  numeral: NORMAL('#efe2c4', '#b9a57c'),
  spring: NORMAL('#c9c3b6', '#6c665c'),
  needle_bolt: NORMAL('#d9d4c8', '#8d8778'),
  button: NORMAL('#d35a8a', '#8a2f55'),
  spool: NORMAL('#e2a64c', '#9c6a22'),
  pin: NORMAL('#d9353a', '#8a1c20'),
  note: NORMAL('#e9b03c', '#9f7418'),
  vinyl: NORMAL('#e04a3a', '#8a2319'),
  horseshoe: NORMAL('#ff9b2e', '#b0521a'),
  spark_ball: NORMAL('#ffc23b', '#c07a18'),
  coal: NORMAL('#3a302c', '#161110'),
  smoke_ring: NORMAL('#6d625c', '#3a332f'),
  crate: NORMAL('#b07a3e', '#7a4f23'),
  cymbal: NORMAL('#e2b340', '#9f7418'),
  drum: NORMAL('#c23a2e', '#7f1f18'),
  feather: NORMAL('#e7d6b8', '#a8916a'),
  petal: NORMAL('#e8708a', '#9e3a52'),
  ember: NORMAL('#ff7a2a', '#b0421a'),
};

export function enemyProjectileSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const p of ENEMY_PROJ) {
    const pal = ENEMY_COLORS[p.name] ?? NORMAL('#aaa', '#666');
    out.push({ name: `ep_${p.name}`, w: p.w, h: p.h, frames: p.frames, fps: 12, repeat: -1, draw: (c, i) => p.draw(c, pal, i) });
    out.push({ name: `ep_${p.name}_p`, w: p.w, h: p.h, frames: p.frames, fps: 12, repeat: -1, draw: (c, i) => p.draw(c, PARRY_PAL, i) });
  }
  return out;
}
