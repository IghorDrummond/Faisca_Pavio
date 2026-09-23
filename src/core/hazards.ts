import { DT, WORLD_W, secToTicks } from './constants';
import { type Aabb, capsuleAabb, circleAabb, obbAabb, ringAabb } from './geom';
import type { HazardDef } from './types';

export type HazardType = HazardDef['type'];
export type HazardPhase = 'delay' | 'warn' | 'active' | 'retract' | 'done';

/**
 * Perigo persistente (pêndulo, ponteiros, agulha, laser, onda de choque, onda sonora, pistões...).
 * Uma única classe com campos genéricos; a lógica de cada tipo é um "emissor" reutilizável.
 */
export class Hazard {
  active = false;
  id = 0;
  type: HazardType = 'slab';
  kind = '';
  phase: HazardPhase = 'warn';
  age = 0;
  delay = 0;
  warn = 0;
  warnTotal = 0;
  activeTicks = 0;
  activeTotal = 0;
  x = 0;
  y = 0;
  px = 0;
  py = 0;
  w = 0;
  h = 0;
  angle = 0;
  pangle = 0;
  radius = 0;
  thickness = 0;
  gapAngle = 0;
  gapHalf = 0;
  maxRadius = 0;
  x2 = 0;
  y2 = 0;
  vx = 0;
  vy = 0;
  speed = 0;
  dir = 1;
  strength = 0;
  parry = false;
  bobAmp = 0;
  baseY = 0;
  /** keyframes de ângulo (rad) do sweep */
  angles: number[] = [];
  segmentTicks = 0;
  ease = false;
  length = 0;
  safeInner = 0;
  bodyId = '';
  offX = 0;
  offY = 0;
  /** stomp em modo rastreio */
  track = false;
  side: 'left' | 'right' | 'top' | 'bottom' = 'left';
  depth = 0;
  ext = 0;
  platformId = 0;
  /** ponto do pivô acompanhando o corpo */
  pivotX = 0;
  pivotY = 0;
  /** tipo de dano: sweep sem pivô na ponta etc */
  bob = 0;

  get damaging(): boolean {
    return this.phase === 'active' && this.type !== 'force' && this.type !== 'platform';
  }

  get progress(): number {
    if (this.phase === 'warn') return this.warnTotal > 0 ? 1 - this.warn / this.warnTotal : 1;
    if (this.phase === 'active') return this.activeTotal > 0 ? 1 - this.activeTicks / this.activeTotal : 0;
    return 0;
  }

  /** Colisão com AABB (hurtbox do jogador). */
  hits(b: Aabb): boolean {
    if (!this.active || !this.damaging) return false;
    switch (this.type) {
      case 'sweep': {
        const c = Math.cos(this.angle);
        const s = Math.sin(this.angle);
        if (this.bob > 0) {
          return circleAabb(this.pivotX + c * this.length, this.pivotY + s * this.length, this.bob, b);
        }
        const inner = this.length * this.safeInner;
        const mid = (inner + this.length) / 2;
        const half = (this.length - inner) / 2;
        return obbAabb(this.pivotX + c * mid, this.pivotY + s * mid, half, this.w / 2, this.angle, b);
      }
      case 'slab':
      case 'stomp':
      case 'shockwave':
      case 'crusher':
      case 'crosser':
        return Math.abs(this.x - b.x) < this.w / 2 + b.hw && Math.abs(this.y - b.y) < this.h / 2 + b.hh;
      case 'laser':
        return capsuleAabb(this.x, this.y, this.x2, this.y2, this.w / 2, b);
      case 'ring':
        return ringAabb(this.x, this.y, this.radius, this.thickness, this.gapAngle, this.gapHalf, b);
      default:
        return false;
    }
  }
}

export interface HazardContext {
  floorY: number;
  targetX: number;
  telegraphMult: number;
  minWarnTicks: number;
  speedMult: number;
  rngPick(choices: number[]): number;
  bodyPos(id: string, out: { x: number; y: number }): boolean;
  addPlatform(x: number, y: number, w: number, life: number, warn: number): number;
  removePlatform(id: number): void;
}

const tmp = { x: 0, y: 0 };

function scaledWarn(sec: number, ctx: HazardContext): number {
  if (sec <= 0) return 0;
  return Math.max(ctx.minWarnTicks, Math.round(secToTicks(sec) * ctx.telegraphMult));
}

/**
 * Inicializa um Hazard a partir da definição. Retorna quantos hazards extras
 * (stomp em sequência) devem ser criados — o chamador usa initStompStep.
 */
export function initHazard(h: Hazard, def: HazardDef, ctx: HazardContext, delayTicks = 0): void {
  h.type = def.type;
  h.kind = def.kind;
  h.age = 0;
  h.delay = delayTicks;
  h.phase = delayTicks > 0 ? 'delay' : 'warn';
  h.parry = false;
  h.bob = 0;
  h.bodyId = '';
  h.track = false;
  h.angle = h.pangle = 0;
  h.radius = 0;
  h.ext = 0;
  switch (def.type) {
    case 'sweep': {
      h.bodyId = def.body ?? '';
      h.offX = def.pivotX;
      h.offY = def.pivotY;
      h.length = def.length;
      h.w = def.width;
      h.safeInner = def.safeInner ?? 0;
      h.angles = def.angles.map((a) => (a * Math.PI) / 180);
      h.segmentTicks = secToTicks(def.segment);
      h.ease = def.ease ?? true;
      h.angle = h.pangle = h.angles[0] ?? 0;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = h.segmentTicks * Math.max(1, h.angles.length - 1);
      h.bob = def.kind.includes('pendulum') ? def.width / 2 : 0;
      updatePivot(h, ctx);
      break;
    }
    case 'slab': {
      h.y = def.y;
      h.h = def.height;
      h.w = def.width;
      h.dir = def.from === 'left' ? 1 : -1;
      h.x = def.from === 'left' ? -def.width / 2 - 20 : WORLD_W + def.width / 2 + 20;
      h.speed = def.speed * ctx.speedMult;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = Math.ceil((WORLD_W + def.width + 80) / (h.speed * DT));
      break;
    }
    case 'stomp': {
      h.w = def.width;
      h.h = ctx.floorY - def.top;
      h.y = def.top + h.h / 2;
      h.x = Array.isArray(def.xs) ? (def.xs[0] ?? 960) : ctx.targetX;
      h.track = def.xs === 'track';
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = secToTicks(def.active);
      break;
    }
    case 'laser': {
      h.x = def.x1;
      h.y = def.y1;
      h.x2 = def.x2;
      h.y2 = def.y2;
      h.w = def.width;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = secToTicks(def.active);
      break;
    }
    case 'shockwave': {
      if (def.x === 'body') {
        ctx.bodyPos(def.body ?? 'main', tmp);
        h.x = tmp.x;
      } else h.x = def.x;
      h.w = def.width;
      h.h = def.height;
      h.y = ctx.floorY - def.height / 2;
      h.dir = def.dirs[0] ?? 1;
      h.speed = def.speed * ctx.speedMult;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = Math.ceil((WORLD_W + 200) / (h.speed * DT));
      break;
    }
    case 'ring': {
      if (def.body) {
        ctx.bodyPos(def.body, tmp);
        h.x = tmp.x + def.x;
        h.y = tmp.y + def.y;
      } else {
        h.x = def.x;
        h.y = def.y;
      }
      h.speed = def.speed * ctx.speedMult;
      h.thickness = def.thickness;
      const gap = def.gapDeg === 'random' ? ctx.rngPick(def.gapChoices ?? [0, 90, 180]) : def.gapDeg;
      h.gapAngle = (gap * Math.PI) / 180;
      h.gapHalf = ((def.gapWidthDeg / 2) * Math.PI) / 180;
      h.maxRadius = def.maxRadius;
      h.radius = 30;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = Math.ceil((def.maxRadius - 30) / (h.speed * DT));
      break;
    }
    case 'force': {
      h.x = def.x;
      h.strength = def.strength;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = secToTicks(def.duration);
      break;
    }
    case 'crusher': {
      h.side = def.side;
      h.depth = def.depth;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = secToTicks(def.active);
      if (def.side === 'left' || def.side === 'right') {
        h.h = def.size;
        h.y = def.at;
        h.w = def.depth;
      } else {
        h.w = def.size;
        h.x = def.at;
        h.h = def.depth;
      }
      placeCrusher(h, 0);
      break;
    }
    case 'platform': {
      h.x = def.x;
      h.y = def.y;
      h.w = def.width;
      h.warnTotal = h.warn = secToTicks(def.warn);
      h.activeTotal = h.activeTicks = secToTicks(def.life);
      h.platformId = 0;
      break;
    }
    case 'crosser': {
      h.w = def.width;
      h.h = def.height;
      h.baseY = h.y = def.y;
      h.dir = def.from === 'left' ? 1 : -1;
      h.x = def.from === 'left' ? -def.width : WORLD_W + def.width;
      h.speed = def.speed * ctx.speedMult;
      h.bobAmp = def.bobAmp ?? 0;
      h.parry = def.parry ?? false;
      h.warnTotal = h.warn = scaledWarn(def.warn, ctx);
      h.activeTotal = h.activeTicks = Math.ceil((WORLD_W + def.width * 2 + 40) / (h.speed * DT));
      break;
    }
  }
  h.px = h.x;
  h.py = h.y;
}

function updatePivot(h: Hazard, ctx: HazardContext): void {
  if (h.bodyId && ctx.bodyPos(h.bodyId, tmp)) {
    h.pivotX = tmp.x + h.offX;
    h.pivotY = tmp.y + h.offY;
  } else {
    h.pivotX = h.offX;
    h.pivotY = h.offY;
  }
  h.x = h.pivotX;
  h.y = h.pivotY;
}

function placeCrusher(h: Hazard, ext: number): void {
  h.ext = ext;
  const d = h.depth * ext;
  switch (h.side) {
    case 'left':
      h.w = Math.max(1, d);
      h.x = d / 2;
      break;
    case 'right':
      h.w = Math.max(1, d);
      h.x = WORLD_W - d / 2;
      break;
    case 'top':
      h.h = Math.max(1, d);
      h.y = d / 2;
      break;
    case 'bottom':
      h.h = Math.max(1, d);
      h.y = 1080 - d / 2;
      break;
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Avança um tick. Retorna false quando terminou. */
export function stepHazard(h: Hazard, ctx: HazardContext): boolean {
  h.px = h.x;
  h.py = h.y;
  h.pangle = h.angle;
  h.age++;
  if (h.phase === 'delay') {
    h.delay--;
    if (h.delay <= 0) {
      h.phase = 'warn';
      if (h.track) h.x = ctx.targetX;
    }
    return true;
  }
  if (h.phase === 'warn') {
    if (h.type === 'sweep') updatePivot(h, ctx);
    if (h.type === 'platform' && h.platformId === 0) {
      h.platformId = ctx.addPlatform(h.x, h.y, h.w, h.activeTotal + h.warnTotal, h.warnTotal);
    }
    if (h.type === 'crusher') placeCrusher(h, 0.08 * Math.min(1, (h.warnTotal - h.warn) / Math.max(1, h.warnTotal)));
    h.warn--;
    if (h.warn <= 0) h.phase = 'active';
    return true;
  }
  if (h.phase === 'active') {
    const t = h.activeTotal - h.activeTicks;
    switch (h.type) {
      case 'sweep': {
        updatePivot(h, ctx);
        const seg = Math.min(Math.floor(t / h.segmentTicks), h.angles.length - 2);
        const local = (t - seg * h.segmentTicks) / h.segmentTicks;
        const a0 = h.angles[seg] ?? 0;
        const a1 = h.angles[seg + 1] ?? a0;
        const k = h.ease ? smooth(Math.min(1, local)) : Math.min(1, local);
        h.angle = a0 + (a1 - a0) * k;
        break;
      }
      case 'slab':
      case 'shockwave':
        h.x += h.dir * h.speed * DT;
        break;
      case 'crosser':
        h.x += h.dir * h.speed * DT;
        h.y = h.baseY + Math.sin(t * 0.12) * h.bobAmp;
        break;
      case 'ring':
        h.radius += h.speed * DT;
        break;
      case 'crusher': {
        const out = Math.min(1, t / 8);
        const back = h.activeTicks < 12 ? h.activeTicks / 12 : 1;
        placeCrusher(h, Math.min(out, back));
        break;
      }
      default:
        break;
    }
    h.activeTicks--;
    if (h.activeTicks <= 0) {
      h.phase = 'done';
      if (h.type === 'platform' && h.platformId) ctx.removePlatform(h.platformId);
      return false;
    }
    return true;
  }
  return false;
}
