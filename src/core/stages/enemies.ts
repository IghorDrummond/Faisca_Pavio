import type { BattleSim, HitTarget, ParryTarget } from '../battle';
import { DT, secToTicks } from '../constants';
import { type Aabb, aabbOverlap } from '../geom';
import { initHazard } from '../hazards';
import { Motion } from '../projectiles';

export type EnemyType = 'parafuso' | 'lampada' | 'sapato' | 'caixa' | 'escovinha' | 'catavento' | 'balao' | 'torre' | 'lata';

export interface EnemySpec {
  hp: number;
  w: number;
  h: number;
  speed: number;
  score: number;
  contact: boolean;
  gravity: boolean;
}

/** Dados dos inimigos comuns (balanceamento editável). */
export const ENEMY_SPECS: Record<EnemyType, EnemySpec> = {
  parafuso: { hp: 16, w: 60, h: 70, speed: 170, score: 100, contact: true, gravity: true },
  lampada: { hp: 24, w: 80, h: 70, speed: 0, score: 150, contact: true, gravity: false },
  sapato: { hp: 10, w: 80, h: 50, speed: 260, score: 100, contact: true, gravity: false },
  caixa: { hp: 12, w: 80, h: 80, speed: 0, score: 120, contact: true, gravity: true },
  escovinha: { hp: 20, w: 90, h: 50, speed: 620, score: 150, contact: true, gravity: true },
  catavento: { hp: 30, w: 90, h: 120, speed: 0, score: 200, contact: true, gravity: false },
  balao: { hp: 1, w: 70, h: 90, speed: 60, score: 50, contact: false, gravity: false },
  torre: { hp: 70, w: 90, h: 180, speed: 0, score: 300, contact: true, gravity: true },
  lata: { hp: 10, w: 50, h: 56, speed: 220, score: 50, contact: true, gravity: true },
};

export class Enemy {
  active = false;
  id = 0;
  type: EnemyType = 'parafuso';
  x = 0;
  y = 0; // centro
  px = 0;
  py = 0;
  vx = 0;
  vy = 0;
  hp = 1;
  state: 'spawn' | 'idle' | 'warn' | 'attack' | 'dying' = 'spawn';
  t = 0;
  facing: 1 | -1 = -1;
  baseY = 0;
  flash = 0;
  grounded = false;
  target: HitTarget = { tid: 0, x: 0, y: 0, hw: 0, hh: 0, mult: 1, alive: true, owner: 'enemy', bodyId: '', contact: true, ref: null };
}

const box: Aabb = { x: 0, y: 0, hw: 0, hh: 0 };

/** Pool e comportamento dos inimigos. */
export class EnemyManager {
  readonly items: Enemy[] = [];
  private nextId = 1;
  score = 0;

  private readonly parryTargets = new Map<Enemy, ParryTarget>();

  constructor(cap = 48) {
    for (let i = 0; i < cap; i++) {
      const e = new Enemy();
      this.items.push(e);
      // alvo de parry pré-criado (balão de papel) — sem alocação por tick
      this.parryTargets.set(e, { x: 0, y: 0, r: 40, onParry: (sim) => this.kill(sim, e, -1) });
    }
  }

  collectParryables(out: ParryTarget[]): void {
    for (const e of this.items) {
      if (!e.active || e.type !== 'balao' || e.state === 'dying') continue;
      const pt = this.parryTargets.get(e)!;
      pt.x = e.x;
      pt.y = e.y;
      out.push(pt);
    }
  }

  reset(): void {
    for (const e of this.items) e.active = false;
    this.score = 0;
  }

  spawn(type: EnemyType, x: number, y: number): Enemy | null {
    const e = this.items.find((i) => !i.active);
    if (!e) return null;
    const s = ENEMY_SPECS[type];
    e.active = true;
    e.id = this.nextId++;
    e.type = type;
    e.x = e.px = x;
    e.y = e.py = y;
    e.baseY = y;
    e.vx = e.vy = 0;
    e.hp = s.hp;
    e.state = 'spawn';
    e.t = 0;
    e.flash = 0;
    e.facing = -1;
    e.grounded = false;
    e.target.tid = 100000 + e.id;
    e.target.hw = s.w / 2;
    e.target.hh = s.h / 2;
    e.target.alive = type !== 'balao';
    e.target.ref = e;
    return e;
  }

  get activeCount(): number {
    let n = 0;
    for (const e of this.items) if (e.active) n++;
    return n;
  }

  private readonly tmpPl = { x: 0, y: 0 };

  /** Jogador vivo mais próximo (objeto reutilizado — sem alocação por tick). */
  private nearestPlayer(sim: BattleSim, x: number): { x: number; y: number } | null {
    let found = false;
    let bd = Infinity;
    for (const p of sim.players) {
      if (!p.joined || !p.alive) continue;
      const d = Math.abs(p.x - x);
      if (d < bd) {
        bd = d;
        this.tmpPl.x = p.x;
        this.tmpPl.y = p.y - 60;
        found = true;
      }
    }
    return found ? this.tmpPl : null;
  }

  private groundAt(sim: BattleSim, e: Enemy, hh: number): void {
    const feet = e.y + hh;
    const top = sim.geo.groundTopAt(e.x, 20, feet);
    let floor = top;
    for (const p of sim.geo.platforms) if (p.active && e.x > p.x && e.x < p.x + p.w && feet <= p.y + 12 && feet + e.vy * DT >= p.y) floor = Math.min(floor, p.y);
    if (feet >= floor && e.vy >= 0) {
      e.y = floor - hh;
      e.vy = 0;
      e.grounded = true;
    } else e.grounded = false;
  }

  update(sim: BattleSim): void {
    for (const e of this.items) {
      if (!e.active) continue;
      e.px = e.x;
      e.py = e.y;
      e.t++;
      if (e.flash > 0) e.flash--;
      const s = ENEMY_SPECS[e.type];
      const pl = this.nearestPlayer(sim, e.x);
      if (e.state === 'dying') {
        if (e.t > 20) e.active = false;
        continue;
      }
      if (e.state === 'spawn' && e.t > 12) {
        e.state = 'idle';
        e.t = 0;
      }
      switch (e.type) {
        case 'parafuso':
          if (pl) e.facing = pl.x < e.x ? -1 : 1;
          e.vx = e.facing * s.speed;
          if (e.grounded && e.t % 70 === 0) e.vy = -780;
          break;
        case 'lampada':
          if (e.state === 'idle' && pl && Math.abs(pl.x - e.x) < 110) {
            e.state = 'warn';
            e.t = 0;
            sim.events.push('warn', e.x, e.y, 30, 0, -1, 'warn_tick');
          } else if (e.state === 'warn' && e.t >= secToTicks(0.55)) {
            e.state = 'attack';
            e.t = 0;
            const h = sim.spawnHazard();
            if (h) initHazard(h, { type: 'laser', kind: 'lamp_beam', x1: e.x, y1: e.y + 30, x2: e.x, y2: sim.floorY + 40, width: 60, warn: 0, active: 0.6 }, sim);
          } else if (e.state === 'attack' && e.t > 90) {
            e.state = 'idle';
            e.t = 0;
          }
          break;
        case 'sapato':
          e.vx = -s.speed;
          e.y = e.baseY + Math.sin(e.t * 0.06) * 70;
          break;
        case 'caixa':
          if (pl && Math.abs(pl.x - e.x) < 90 && Math.abs(pl.y - e.y) < 120) this.pop(sim, e);
          break;
        case 'escovinha':
          if (e.state === 'idle') {
            if (pl) e.facing = pl.x < e.x ? -1 : 1;
            e.vx = 0;
            if (pl && Math.abs(pl.x - e.x) < 800 && e.t > 50) {
              e.state = 'warn';
              e.t = 0;
            }
          } else if (e.state === 'warn') {
            e.vx = -e.facing * 30;
            if (e.t >= secToTicks(0.5)) {
              e.state = 'attack';
              e.t = 0;
            }
          } else if (e.state === 'attack') {
            e.vx = e.facing * s.speed;
            if (e.t > 60) {
              e.state = 'idle';
              e.t = 0;
            }
          }
          break;
        case 'catavento':
          if (e.t % 50 === 0 && pl && Math.abs(pl.x - e.x) < 1300) {
            for (let k = 0; k < 3; k++) {
              const a = (e.t * 0.05 + (k / 3) * Math.PI * 2) % (Math.PI * 2);
              this.shoot(sim, e.x, e.y, a, 300, 'petal', 16, k === 2 && e.t % 150 === 0);
            }
          }
          break;
        case 'balao':
          e.y = e.baseY + Math.sin(e.t * 0.04) * 26;
          break;
        case 'torre':
          e.vx = 0;
          if (pl) e.facing = pl.x < e.x ? -1 : 1;
          if (e.t % 110 === 0 && pl && Math.abs(pl.x - e.x) < 1100) {
            const a = Math.atan2(pl.y - (e.y - 60), pl.x - e.x);
            this.shoot(sim, e.x, e.y - 60, a, 520, 'seed', 16, false);
          }
          break;
        case 'lata':
          if (pl) e.facing = pl.x < e.x ? -1 : 1;
          e.vx = e.facing * s.speed;
          if (e.grounded && e.t % 45 === 0) e.vy = -520;
          break;
      }
      if (s.gravity) {
        e.vy = Math.min(e.vy + 2600 * DT, 1400);
        e.x += e.vx * DT;
        e.y += e.vy * DT;
        this.groundAt(sim, e, s.h / 2);
        if (e.y > sim.geo.killY) e.active = false;
      } else {
        e.x += e.vx * DT;
      }
      // despawn fora da tela (com margem)
      if (e.x < sim.viewLeft - 300 || e.x > sim.viewRight + 900) e.active = false;
      e.target.x = e.x;
      e.target.y = e.y;
    }
  }

  private shoot(sim: BattleSim, x: number, y: number, a: number, speed: number, kind: string, r: number, parry: boolean): void {
    const p = sim.spawnEnemyProjectile();
    if (!p) return;
    const sm = sim.speedMult;
    p.x = p.px = x;
    p.y = p.py = y;
    p.vx = Math.cos(a) * speed * sm;
    p.vy = Math.sin(a) * speed * sm;
    p.speed = speed * sm;
    p.gravity = 0;
    p.r = r;
    p.kind = kind;
    p.parry = parry;
    p.warn = p.warnTotal = 0;
    p.life = 300;
    p.age = 0;
    p.motion = Motion.Linear;
    p.spin = 3;
    p.rolling = false;
    p.floorKill = false;
    p.bounces = 0;
    p.shadow = false;
    p.offscreenWarn = false;
    p.angle = a;
  }

  /** Caixa-surpresa: explode em molas. */
  private pop(sim: BattleSim, e: Enemy): void {
    for (let k = 0; k < 3; k++) {
      const p = sim.spawnEnemyProjectile();
      if (!p) break;
      p.x = p.px = e.x;
      p.y = p.py = e.y - 20;
      p.vx = (k - 1) * 260 * sim.speedMult;
      p.vy = -900 * sim.speedMult;
      p.speed = 300;
      p.gravity = 2200 * sim.speedMult * sim.speedMult;
      p.r = 22;
      p.kind = 'spring';
      p.parry = k === 1;
      p.warn = p.warnTotal = secToTicks(0.25);
      p.life = 240;
      p.age = 0;
      p.motion = Motion.Linear;
      p.spin = 6;
      p.rolling = false;
      p.floorKill = true;
      p.bounces = 0;
      p.shadow = false;
      p.offscreenWarn = false;
    }
    sim.events.push('sound', e.x, e.y, 0, 0, -1, 'bounce');
    this.kill(sim, e, -1);
  }

  kill(sim: BattleSim, e: Enemy, owner: number): void {
    if (e.state === 'dying') return;
    e.state = 'dying';
    e.t = 0;
    e.target.alive = false;
    this.score += ENEMY_SPECS[e.type].score;
    sim.events.push('enemyDie', e.x, e.y, 0, 0, owner, e.type);
    // torre de latinhas desmonta em 3 partes que atacam
    if (e.type === 'torre') for (let k = 0; k < 3; k++) this.spawn('lata', e.x + (k - 1) * 50, e.y - 40 + k * 40);
  }

  hit(sim: BattleSim, t: HitTarget, dmg: number, owner: number): void {
    const e = t.ref as Enemy;
    if (!e || !e.active || e.state === 'dying') return;
    e.hp -= dmg;
    e.flash = 3;
    sim.events.push('hitEnemy', e.x, e.y, dmg, 0, owner, e.type);
    if (e.hp <= 0) {
      if (e.type === 'caixa') this.pop(sim, e);
      else this.kill(sim, e, owner);
    }
  }

  collectTargets(out: HitTarget[]): void {
    for (const e of this.items) if (e.active && e.target.alive) out.push(e.target);
  }

  /** Contato com inimigos (hurtbox do jogador). */
  contact(b: Aabb): boolean {
    for (const e of this.items) {
      if (!e.active || e.state === 'dying' || e.state === 'spawn') continue;
      const s = ENEMY_SPECS[e.type];
      if (!s.contact) continue;
      box.x = e.x;
      box.y = e.y;
      box.hw = s.w * 0.43;
      box.hh = s.h * 0.43;
      if (aabbOverlap(box, b)) return true;
    }
    return false;
  }
}
