/** Utilitários de cenário: gradientes suaves, textura de aquarela/papel, padrões repetidos. */
import { type Canvas, type Pt, INK, f, shape, smoothPath, uid } from './svg';

/** Gradiente linear vertical. Retorna url(#id). */
export function vgrad(c: Canvas, stops: [number, string][]): string {
  const id = uid('vg');
  c.def(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient>`);
  return `url(#${id})`;
}

export function rgrad(c: Canvas, stops: [number, string][], cx = 0.5, cy = 0.5, r = 0.7): string {
  const id = uid('rg');
  c.def(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</radialGradient>`);
  return `url(#${id})`;
}

/** Filtro de textura de aquarela (turbulência + deslocamento leve). */
export function watercolorFilter(c: Canvas, seed: number, strength = 0.18): string {
  const id = uid('wc');
  c.def(
    `<filter id="${id}" x="0" y="0" width="100%" height="100%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="3" seed="${seed}" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 ${strength} 0" result="tex"/>` +
      `<feComposite in="tex" in2="SourceGraphic" operator="atop" result="t2"/>` +
      `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t2"/></feMerge>` +
      `</filter>`,
  );
  return `url(#${id})`;
}

/** Retângulo preenchido com a textura de aquarela aplicada. */
export function wash(c: Canvas, x: number, y: number, w: number, h: number, fill: string, seed: number, strength = 0.2): void {
  const filt = watercolorFilter(c, seed, strength);
  c.add(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" filter="${filt}"/>`);
}

/** Forma de fundo com contorno mais fino e esmaecido (menor contraste que a camada de jogo). */
export function bgShape(c: Canvas, pts: Pt[], fill: string, salt: number, line = 'rgba(40,25,15,0.55)', width = 3.5, shade?: string): void {
  shape(c, pts, { fill, stroke: line, width, boil: 2, ...(shade ? { shade, shadeOffset: 8 } : {}) }, salt);
}

/** Tábuas de piso de madeira. */
export function planks(c: Canvas, x: number, y: number, w: number, h: number, base: string, dark: string, salt: number): void {
  c.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/>`);
  const n = Math.ceil(w / 180);
  for (let i = 0; i <= n; i++) {
    const px = x + i * 180 + ((i * 37) % 60);
    c.add(`<path d="M${f(px)},${f(y)} L${f(px - 30)},${f(y + h)}" stroke="${dark}" stroke-width="4" fill="none"/>`);
  }
  for (let k = 1; k < 3; k++) {
    const py = y + (h / 3) * k;
    c.add(`<path d="${smoothPath([[x, py], [x + w * 0.3, py + 3], [x + w * 0.7, py - 2], [x + w, py + 2]], false)}" stroke="${dark}" stroke-width="3" fill="none" opacity="0.7"/>`);
  }
  c.add(`<rect x="${x}" y="${y}" width="${w}" height="8" fill="${INK}" opacity="0.85"/>`);
  void salt;
}

/** Holofote/luz suave em cone. */
export function lightCone(c: Canvas, x: number, y: number, w: number, h: number, color: string, alpha: number): void {
  const g = vgrad(c, [
    [0, color],
    [1, 'rgba(255,255,255,0)'],
  ]);
  c.add(`<path d="M${f(x - 20)},${f(y)} L${f(x + 20)},${f(y)} L${f(x + w / 2)},${f(y + h)} L${f(x - w / 2)},${f(y + h)} Z" fill="${g}" opacity="${alpha}"/>`);
}
