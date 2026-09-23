/**
 * Biblioteca de desenho vetorial no estilo "rubber hose" dos anos 1930.
 * Tudo é gerado proceduralmente (arte original). Coordenadas em px na escala 1x;
 * a rasterização é feita em 2x e reduzida (ver raster.ts).
 *
 * Características:
 * - contorno preto grosso e irregular (3–6 px) com terminações arredondadas;
 * - "boil": variação leve dos vértices por semente, alternada a cada desenho;
 * - sombreamento chapado de 1 tom (crescente inferior-direito recortado pela forma);
 * - membros de mangueira (sem cotovelo) com luvas brancas de 4 dedos e sapatos grandes.
 */
import { Rng } from '../../../src/core/rng';

export type Pt = [number, number];

export const INK = '#1c120b';
export const WHITE = '#fbf6ea';
export const OUTLINE = 5;

let idCounter = 0;
export function uid(prefix: string): string {
  idCounter++;
  return `${prefix}${idCounter}`;
}

/** Contexto de desenho: acumula elementos SVG e definições. */
export class Canvas {
  readonly w: number;
  readonly h: number;
  private defs: string[] = [];
  private body: string[] = [];
  /** semente de boil deste desenho */
  boil: number;
  rng: Rng;

  constructor(w: number, h: number, boil = 0) {
    // ids de <defs> só precisam ser únicos dentro de cada SVG → saída determinística (cache estável)
    idCounter = 0;
    this.w = w;
    this.h = h;
    this.boil = boil;
    this.rng = new Rng(9001 + boil * 7919);
  }

  def(s: string): void {
    this.defs.push(s);
  }

  add(s: string): void {
    this.body.push(s);
  }

  group(transform: string, fn: () => void): void {
    this.body.push(`<g transform="${transform}">`);
    fn();
    this.body.push('</g>');
  }

  toSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}"><defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>`;
  }

  /** Ruído de boil determinístico por (semente do desenho, índice do ponto, salt). */
  jitter(i: number, salt: number, amount: number): number {
    const r = new Rng((this.boil + 1) * 100003 + i * 131 + salt * 7);
    return (r.next() - 0.5) * 2 * amount;
  }
}

export function f(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Curva suave fechada/aberta passando pelos pontos (Catmull-Rom → Bézier cúbica). */
export function smoothPath(pts: Pt[], closed: boolean, tension = 1): string {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i: number): Pt => {
    if (closed) return pts[((i % n) + n) % n]!;
    return pts[Math.max(0, Math.min(n - 1, i))]!;
  };
  let d = `M${f(pts[0]![0])},${f(pts[0]![1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  if (closed) d += 'Z';
  return d;
}

/** Aplica boil (ruído) aos pontos. */
export function boilPts(c: Canvas, pts: Pt[], amount: number, salt: number): Pt[] {
  return pts.map((p, i) => [p[0] + c.jitter(i, salt, amount), p[1] + c.jitter(i, salt + 1, amount)]);
}

/** Pontos de uma elipse. */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n = 16, rot = 0): Pt[] {
  const out: Pt[] = [];
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return out;
}

/** Retângulo arredondado como pontos (para boil). */
export function roundRectPts(x: number, y: number, w: number, h: number, r: number, n = 3): Pt[] {
  const out: Pt[] = [];
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return out;
}

export interface ShapeStyle {
  fill: string;
  shade?: string;
  /** deslocamento do sombreamento (px) */
  shadeOffset?: number;
  stroke?: string;
  width?: number;
  boil?: number;
  highlight?: string;
  opacity?: number;
}

/**
 * Forma fechada com traço grosso irregular: um "fantasma" preto deslocado dá espessura extra
 * no lado inferior-direito (efeito de pincel), sombra chapada e contorno com pontas arredondadas.
 */
export function shape(c: Canvas, pts: Pt[], st: ShapeStyle, salt = 0): string {
  const b = boilPts(c, pts, st.boil ?? 1.4, salt);
  const d = smoothPath(b, true);
  const w = st.width ?? OUTLINE;
  const stroke = st.stroke ?? INK;
  const op = st.opacity !== undefined ? ` opacity="${st.opacity}"` : '';
  let out = `<g${op}>`;
  // espessamento do traço (pincel)
  out += `<path d="${d}" transform="translate(1.6,1.8)" fill="none" stroke="${stroke}" stroke-width="${f(w + 1.5)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (st.shade) {
    const id = uid('cl');
    const k = st.shadeOffset ?? 6;
    c.def(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    out += `<path d="${d}" fill="${st.shade}"/>`;
    // o recorte fica num grupo sem transformação para não se deslocar junto com a forma
    out += `<g clip-path="url(#${id})"><path d="${d}" fill="${st.fill}" transform="translate(${-k},${-k})"/></g>`;
  } else {
    out += `<path d="${d}" fill="${st.fill}"/>`;
  }
  if (st.highlight) {
    const id = uid('hl');
    c.def(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    // brilho em crescente no topo-esquerdo
    const cx = b.reduce((s, p) => s + p[0], 0) / b.length;
    const cy = b.reduce((s, p) => s + p[1], 0) / b.length;
    const xs = b.map((p) => p[0]);
    const ys = b.map((p) => p[1]);
    const rw = (Math.max(...xs) - Math.min(...xs)) / 2;
    const rh = (Math.max(...ys) - Math.min(...ys)) / 2;
    out += `<g clip-path="url(#${id})"><ellipse cx="${f(cx - rw * 0.35)}" cy="${f(cy - rh * 0.45)}" rx="${f(rw * 0.28)}" ry="${f(rh * 0.16)}" fill="${st.highlight}" transform="rotate(-25 ${f(cx - rw * 0.35)} ${f(cy - rh * 0.45)})"/></g>`;
  }
  out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  out += '</g>';
  c.add(out);
  return d;
}

/** Linha de tinta (contorno aberto) com boil. */
export function inkLine(c: Canvas, pts: Pt[], width = OUTLINE, salt = 0, color = INK, boil = 1): void {
  const b = boilPts(c, pts, boil, salt);
  c.add(`<path d="${smoothPath(b, false)}" fill="none" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
}

/**
 * Membro de mangueira: curva de Bézier quadrática do ombro à mão,
 * contorno preto largo + miolo colorido (sem cotovelo).
 */
export function hose(c: Canvas, a: Pt, b: Pt, bend: number, thick: number, fill: string, salt = 0): void {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cp: Pt = [mx + nx * bend + c.jitter(0, salt, 1.2), my + ny * bend + c.jitter(1, salt, 1.2)];
  const d = `M${f(a[0])},${f(a[1])} Q${f(cp[0])},${f(cp[1])} ${f(b[0])},${f(b[1])}`;
  c.add(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(thick + OUTLINE * 1.6)}" stroke-linecap="round"/>`);
  c.add(`<path d="${d}" fill="none" stroke="${fill}" stroke-width="${f(thick)}" stroke-linecap="round"/>`);
}

export type HandPose = 'open' | 'fist' | 'point' | 'wave';

/** Luva branca de 4 dedos (3 linhas de dedo) com punho enrolado. angle em rad (direção do braço). */
export function glove(c: Canvas, x: number, y: number, angle: number, size: number, pose: HandPose, salt = 0): void {
  const deg = (angle * 180) / Math.PI;
  c.group(`translate(${f(x)},${f(y)}) rotate(${f(deg)})`, () => {
    // punho
    shape(c, ellipsePts(-size * 0.55, 0, size * 0.28, size * 0.5, 10), { fill: WHITE, shade: '#d9cdb4', shadeOffset: 3, width: 4 }, salt + 11);
    if (pose === 'fist') {
      shape(c, ellipsePts(size * 0.12, 0, size * 0.62, size * 0.56, 14), { fill: WHITE, shade: '#d9cdb4', shadeOffset: 4, width: 4.5 }, salt + 12);
      for (let i = -1; i <= 1; i++) inkLine(c, [[size * 0.3, i * size * 0.26], [size * 0.62, i * size * 0.24]], 3, salt + 20 + i);
    } else if (pose === 'point') {
      shape(c, ellipsePts(0, 0, size * 0.55, size * 0.5, 14), { fill: WHITE, shade: '#d9cdb4', shadeOffset: 4, width: 4.5 }, salt + 13);
      shape(c, roundRectPts(size * 0.25, -size * 0.2, size * 0.95, size * 0.32, size * 0.15), { fill: WHITE, width: 4 }, salt + 14);
    } else {
      // mão aberta: palma + 4 dedos em leque
      shape(c, ellipsePts(0, 0, size * 0.55, size * 0.52, 14), { fill: WHITE, shade: '#d9cdb4', shadeOffset: 4, width: 4.5 }, salt + 15);
      const spread = pose === 'wave' ? 0.42 : 0.3;
      for (let i = 0; i < 4; i++) {
        const a = (i - 1.5) * spread;
        const fx = Math.cos(a) * size * 0.75;
        const fy = Math.sin(a) * size * 0.75;
        shape(c, ellipsePts(fx, fy, size * 0.36, size * 0.17, 10, a), { fill: WHITE, width: 3.6 }, salt + 16 + i);
      }
    }
  });
}

/** Sapato grande arredondado. facing 1 = direita. */
export function shoe(c: Canvas, x: number, y: number, size: number, facing: number, color: string, salt = 0, tilt = 0): void {
  c.group(`translate(${f(x)},${f(y)}) rotate(${f(tilt)}) scale(${facing},1)`, () => {
    const pts: Pt[] = [
      [-size * 0.45, -size * 0.35],
      [size * 0.05, -size * 0.5],
      [size * 0.55, -size * 0.38],
      [size * 0.85, -size * 0.1],
      [size * 0.8, size * 0.12],
      [size * 0.2, size * 0.16],
      [-size * 0.5, size * 0.12],
      [-size * 0.6, -size * 0.1],
    ];
    shape(c, pts, { fill: color, shade: '#0e0906', shadeOffset: 3, highlight: 'rgba(255,255,255,0.35)', width: 4.5 }, salt);
    inkLine(c, [[-size * 0.55, size * 0.1], [size * 0.78, size * 0.1]], 3.2, salt + 3);
  });
}

/** Olho "pie-cut": branco oval, pupila preta alongada com recorte em fatia. */
export function pieEye(c: Canvas, x: number, y: number, w: number, h: number, lookX: number, lookY: number, blink: number, salt = 0): void {
  if (blink >= 0.9) {
    inkLine(c, [[x - w * 0.9, y + h * 0.1], [x, y + h * 0.3], [x + w * 0.9, y + h * 0.1]], 4.5, salt);
    return;
  }
  const hh = h * (1 - blink * 0.85);
  shape(c, ellipsePts(x, y, w, hh, 14), { fill: WHITE, width: 4 }, salt);
  const px = x + lookX * w * 0.35;
  const py = y + lookY * hh * 0.3;
  const pw = w * 0.42;
  const ph = hh * 0.62;
  // pupila com fatia (pie cut) no canto superior direito
  const cut = 0.55;
  const a0 = -Math.PI / 2 + 0.15;
  const a1 = a0 + cut;
  const pts: string[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const a = a1 + (i / steps) * (Math.PI * 2 - cut);
    pts.push(`${f(px + Math.cos(a) * pw)},${f(py + Math.sin(a) * ph)}`);
  }
  c.add(`<path d="M${f(px)},${f(py)} L${pts.join(' L')} Z" fill="${INK}"/>`);
}

/** Boca simples. */
export function mouth(c: Canvas, x: number, y: number, w: number, kind: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat', salt = 0): void {
  switch (kind) {
    case 'smile':
      inkLine(c, [[x - w, y - w * 0.15], [x - w * 0.4, y + w * 0.35], [x + w * 0.4, y + w * 0.35], [x + w, y - w * 0.15]], 4.5, salt);
      break;
    case 'grin': {
      const pts: Pt[] = [[x - w, y - w * 0.2], [x, y - w * 0.05], [x + w, y - w * 0.2], [x + w * 0.55, y + w * 0.55], [x, y + w * 0.7], [x - w * 0.55, y + w * 0.55]];
      shape(c, pts, { fill: '#5a1712', width: 4 }, salt);
      shape(c, ellipsePts(x, y + w * 0.45, w * 0.35, w * 0.18, 10), { fill: '#e0605a', width: 0.1, stroke: 'none' }, salt + 1);
      break;
    }
    case 'open':
      shape(c, ellipsePts(x, y + w * 0.2, w * 0.7, w * 0.55, 12), { fill: '#5a1712', width: 4 }, salt);
      shape(c, ellipsePts(x, y + w * 0.45, w * 0.4, w * 0.2, 10), { fill: '#e0605a', width: 0.1, stroke: 'none' }, salt + 1);
      break;
    case 'o':
      shape(c, ellipsePts(x, y + w * 0.1, w * 0.35, w * 0.42, 10), { fill: '#5a1712', width: 4 }, salt);
      break;
    case 'grit':
      shape(c, roundRectPts(x - w * 0.8, y - w * 0.2, w * 1.6, w * 0.6, w * 0.2), { fill: WHITE, width: 4 }, salt);
      inkLine(c, [[x - w * 0.75, y + w * 0.1], [x + w * 0.75, y + w * 0.1]], 3, salt + 2);
      break;
    case 'sad':
      inkLine(c, [[x - w, y + w * 0.35], [x - w * 0.3, y - w * 0.05], [x + w * 0.3, y - w * 0.05], [x + w, y + w * 0.35]], 4.5, salt);
      break;
    case 'flat':
      inkLine(c, [[x - w * 0.7, y + w * 0.1], [x + w * 0.7, y + w * 0.1]], 4.5, salt);
      break;
  }
}

/** Chama em camadas (externa laranja, interna amarela, núcleo claro). size ~ altura. */
export function flame(c: Canvas, x: number, y: number, size: number, phase: number, intensity: number, salt = 0, palette?: { outer: string; mid: string; core: string }): void {
  const pal = palette ?? { outer: '#e8522a', mid: '#f59f2c', core: '#fff0a8' };
  const sway = Math.sin(phase * Math.PI * 2) * size * 0.12 * intensity;
  const lick = Math.cos(phase * Math.PI * 4) * size * 0.06;
  const layer = (s: number, fill: string, k: number, width: number): void => {
    const h = size * s * (0.85 + 0.25 * intensity);
    const w = size * s * 0.42;
    const pts: Pt[] = [
      [x + sway * 1.4 + lick, y - h],
      [x + w * 0.55 + sway * 0.5, y - h * 0.55],
      [x + w * 0.95, y - h * 0.15],
      [x + w * 0.6, y + h * 0.08],
      [x, y + h * 0.14],
      [x - w * 0.6, y + h * 0.08],
      [x - w * 0.95, y - h * 0.18],
      [x - w * 0.35 + sway * 0.3, y - h * 0.5 + lick],
    ];
    shape(c, pts, { fill, width, boil: 2.2 }, salt + k);
  };
  layer(1, pal.outer, 0, 4.5);
  layer(0.68, pal.mid, 10, 0.01);
  layer(0.38, pal.core, 20, 0.01);
}

/** Estrelinhas / faíscas de desenho (4 pontas). */
export function sparkle(c: Canvas, x: number, y: number, r: number, fill: string, salt = 0): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.35;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  shape(c, pts, { fill, width: 3.5, boil: 0.6 }, salt);
}

/** Nuvem de fumaça de desenho (bolhas). */
export function puff(c: Canvas, x: number, y: number, r: number, fill: string, salt = 0, lobes = 6): void {
  const pts: Pt[] = [];
  for (let i = 0; i < lobes * 3; i++) {
    const a = (i / (lobes * 3)) * Math.PI * 2;
    const bump = i % 3 === 1 ? 1.12 : 0.9;
    pts.push([x + Math.cos(a) * r * bump, y + Math.sin(a) * r * bump]);
  }
  shape(c, pts, { fill, shade: 'rgba(0,0,0,0.12)', shadeOffset: r * 0.18, width: 4, boil: 1.8 }, salt);
}
