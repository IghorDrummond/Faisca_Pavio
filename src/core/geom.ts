/** Primitivas de colisão simples usadas pelo núcleo. Coordenadas em px, y para baixo. */

export interface Aabb {
  x: number; // centro
  y: number; // centro
  hw: number; // meia largura
  hh: number; // meia altura
}

export function aabb(x: number, y: number, w: number, h: number): Aabb {
  return { x, y, hw: w / 2, hh: h / 2 };
}

export function aabbOverlap(a: Aabb, b: Aabb): boolean {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
}

export function aabbOverlapRaw(
  ax: number,
  ay: number,
  ahw: number,
  ahh: number,
  bx: number,
  by: number,
  bhw: number,
  bhh: number,
): boolean {
  return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
}

export function circleCircle(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function circleAabb(cx: number, cy: number, r: number, b: Aabb): boolean {
  return circleAabbRaw(cx, cy, r, b.x, b.y, b.hw, b.hh);
}

export function circleAabbRaw(
  cx: number,
  cy: number,
  r: number,
  bx: number,
  by: number,
  bhw: number,
  bhh: number,
): boolean {
  const nx = clamp(cx, bx - bhw, bx + bhw);
  const ny = clamp(cy, by - bhh, by + bhh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/**
 * Varredura de círculo em movimento contra AABB (checagem contínua para projéteis rápidos).
 * Testa o segmento (x0,y0)->(x1,y1) contra a AABB expandida pelo raio (aproximação de Minkowski).
 */
export function sweptCircleAabb(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  bx: number,
  by: number,
  bhw: number,
  bhh: number,
): boolean {
  const minX = bx - bhw - r;
  const maxX = bx + bhw + r;
  const minY = by - bhh - r;
  const maxY = by + bhh + r;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x0 < minX || x0 > maxX) return false;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - x0) * inv;
    let t2 = (maxX - x0) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y0 < minY || y0 > maxY) return false;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - y0) * inv;
    let t2 = (maxY - y0) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Distância ao quadrado de um ponto a um segmento. */
export function distSqPointSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t - px;
  const cy = ay + aby * t - py;
  return cx * cx + cy * cy;
}

/** Cápsula (segmento com raio) contra AABB — amostragem do segmento; suficiente para hitboxes de ataques. */
export function capsuleAabb(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
  box: Aabb,
): boolean {
  // ponto da AABB mais próximo do segmento: amostra adaptativa
  const len = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(len / Math.max(8, Math.min(box.hw, box.hh))));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (circleAabbRaw(ax + (bx - ax) * t, ay + (by - ay) * t, r, box.x, box.y, box.hw, box.hh)) return true;
  }
  return false;
}

/** Retângulo orientado (centro, meia-extensões, ângulo) contra AABB via SAT. */
export function obbAabb(
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  angle: number,
  box: Aabb,
): boolean {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = box.x - cx;
  const dy = box.y - cy;
  // eixos da AABB
  const ex = Math.abs(c) * hw + Math.abs(s) * hh;
  const ey = Math.abs(s) * hw + Math.abs(c) * hh;
  if (Math.abs(dx) > ex + box.hw) return false;
  if (Math.abs(dy) > ey + box.hh) return false;
  // eixos do OBB
  const pu = Math.abs(dx * c + dy * s);
  const ru = box.hw * Math.abs(c) + box.hh * Math.abs(s);
  if (pu > hw + ru) return false;
  const pv = Math.abs(-dx * s + dy * c);
  const rv = box.hw * Math.abs(s) + box.hh * Math.abs(c);
  if (pv > hh + rv) return false;
  return true;
}

/**
 * Anel (onda sonora) com vão angular: colide se a AABB cruza a faixa [r-th/2, r+th/2]
 * fora do setor do vão. Amostra os cantos/centro da caixa.
 */
export function ringAabb(
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  gapAngle: number,
  gapHalfWidth: number,
  box: Aabb,
): boolean {
  const inner = radius - thickness / 2;
  const outer = radius + thickness / 2;
  // caixa inteiramente dentro do raio interno ou fora do externo -> sem colisão
  const nearX = clamp(cx, box.x - box.hw, box.x + box.hw);
  const nearY = clamp(cy, box.y - box.hh, box.y + box.hh);
  const nearD = Math.hypot(nearX - cx, nearY - cy);
  const fx = Math.max(Math.abs(box.x - box.hw - cx), Math.abs(box.x + box.hw - cx));
  const fy = Math.max(Math.abs(box.y - box.hh - cy), Math.abs(box.y + box.hh - cy));
  const farD = Math.hypot(fx, fy);
  if (nearD > outer || farD < inner) return false;
  // checar ângulo do centro da caixa em relação ao vão
  const ang = Math.atan2(box.y - cy, box.x - cx);
  const diff = Math.abs(wrapAngle(ang - gapAngle));
  // largura angular da caixa vista do centro
  const boxAng = Math.atan2(Math.max(box.hw, box.hh), Math.max(1, Math.hypot(box.x - cx, box.y - cy)));
  return diff + boxAng > gapHalfWidth;
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}
