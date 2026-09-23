import type { BattleSim, HitTarget, ParryTarget, StageModule } from '../battle';
import { type Aabb, aabbOverlap } from '../geom';
import { initHazard } from '../hazards';
import type { BossDef, HazardDef } from '../types';
import { type EnemyType, EnemyManager } from './enemies';

export interface LevelDef {
  id: string;
  length: number;
  floorY: number;
  /** segmentos de chão sólido [x0, x1] — os vãos são fossos */
  ground: [number, number][];
  blocks: { x: number; y: number; w: number; h: number }[];
  platforms: { x: number; y: number; w: number; move?: { ax: number; ay: number; period: number }; fall?: number }[];
  enemies: { at: number; type: EnemyType; x: number; y: number }[];
  hazards: { at: number; until: number; every: number; def: HazardDef }[];
  coins: { x: number; y: number }[];
  sections: { x: number; name: string }[];
  miniboss: BossDef;
  targetTime: number;
}

interface CoinState {
  id: string;
  x: number;
  y: number;
  taken: boolean;
}

const box: Aabb = { x: 0, y: 0, hw: 0, hh: 0 };

/** Fase run'n'gun: rolagem lateral, 3 seções temáticas e mini-chefe final. */
export class RunGunModule implements StageModule {
  readonly scrolling = true;
  readonly def: LevelDef;
  readonly enemies = new EnemyManager(48);
  coins: CoinState[] = [];
  camX = 0;
  camTarget = 0;
  phase: 'run' | 'arena' = 'run';
  private enemyIdx = 0;
  private hazardTimers: number[] = [];
  arenaEnteredTick = 0;
  maxX = 0;

  constructor(def: LevelDef) {
    this.def = def;
  }

  reset(sim: BattleSim): void {
    const d = this.def;
    this.phase = 'run';
    this.camX = 0;
    this.camTarget = 0;
    this.maxX = 0;
    this.enemyIdx = 0;
    this.enemies.reset();
    this.hazardTimers = d.hazards.map(() => 0);
    sim.boss = null;
    sim.geo.reset(d.floorY, 0, d.length, false);
    for (const [x0, x1] of d.ground) sim.geo.solids.push({ x: x0, y: d.floorY, w: x1 - x0, h: 400 });
    for (const b of d.blocks) sim.geo.solids.push({ ...b });
    for (const p of d.platforms) {
      const pl = sim.geo.addPlatform(p.x, p.y, p.w);
      if (p.move) {
        pl.moveAx = p.move.ax;
        pl.moveAy = p.move.ay;
        pl.movePeriod = p.move.period;
      }
      if (p.fall) pl.fallDelay = p.fall;
    }
    sim.geo.killY = d.floorY + 350;
    this.coins = d.coins.map((c, i) => ({ id: `${d.id}:c${i + 1}`, x: c.x, y: c.y, taken: false }));
    sim.viewLeft = 0;
    sim.viewRight = 1920;
  }

  /** Moedas coletadas nesta tentativa (creditadas somente se a fase for concluída). */
  collectedCoins(): string[] {
    return this.coins.filter((c) => c.taken).map((c) => c.id);
  }

  private enterArena(sim: BattleSim): void {
    this.phase = 'arena';
    this.arenaEnteredTick = sim.tick;
    sim.clearEnemyStuff(false);
    this.enemies.reset();
    const mb = this.def.miniboss;
    sim.geo.reset(mb.arena.floorY, 0, 1920, true);
    for (const pl of mb.arena.platforms) sim.geo.addPlatform(pl.x, pl.y, pl.w);
    sim.viewLeft = 0;
    sim.viewRight = 1920;
    this.camX = 0;
    let i = 0;
    for (const p of sim.players) {
      if (!p.joined) continue;
      p.x = p.px = 260 + i * 110;
      p.y = p.py = mb.arena.floorY;
      p.lastSafeX = p.x;
      p.lastSafeY = p.y;
      p.vx = p.vy = 0;
      i++;
    }
    sim.setBoss(mb);
    sim.events.push('bossPhase', 960, 400, 0, 0, -1, 'arena');
  }

  update(sim: BattleSim): void {
    if (this.phase === 'arena') return;
    const d = this.def;
    // câmera: só avança, com antecipação no sentido do movimento
    let lead = 0;
    for (const p of sim.players) if (p.joined && p.alive) lead = Math.max(lead, p.x + Math.max(0, p.vx) * 0.25);
    this.camTarget = Math.max(this.camTarget, Math.min(d.length - 1920, lead - 720));
    this.camX += (this.camTarget - this.camX) * 0.12;
    sim.viewLeft = this.camX;
    sim.viewRight = this.camX + 1920;
    this.maxX = Math.max(this.maxX, lead);
    // gatilhos de inimigos (quando a borda direita da câmera passa)
    const right = sim.viewRight;
    while (this.enemyIdx < d.enemies.length && d.enemies[this.enemyIdx]!.at <= right) {
      const e = d.enemies[this.enemyIdx]!;
      this.enemies.spawn(e.type, e.x, e.y);
      this.enemyIdx++;
    }
    // perigos periódicos (prensas, contrapesos, holofotes)
    d.hazards.forEach((h, i) => {
      if (right < h.at || sim.viewLeft > h.until) return;
      this.hazardTimers[i] = (this.hazardTimers[i] ?? 0) - 1;
      if ((this.hazardTimers[i] ?? 0) <= 0) {
        this.hazardTimers[i] = Math.round(h.every * 60);
        const hz = sim.spawnHazard();
        if (hz) initHazard(hz, h.def, sim);
      }
    });
    this.enemies.update(sim);
    // moedas
    for (const c of this.coins) {
      if (c.taken) continue;
      for (const p of sim.players) {
        if (!p.joined || !p.alive) continue;
        p.hurtbox(box);
        if (Math.abs(box.x - c.x) < box.hw + 34 && Math.abs(box.y - c.y) < box.hh + 34) {
          c.taken = true;
          sim.events.push('coin', c.x, c.y, 0, 0, p.index, c.id);
        }
      }
    }
    // fim do percurso → sala do mini-chefe
    if (lead > d.length - 260) this.enterArena(sim);
  }

  collectTargets(_sim: BattleSim, out: HitTarget[]): void {
    this.enemies.collectTargets(out);
  }

  collectParryables(_sim: BattleSim, out: ParryTarget[]): void {
    this.enemies.collectParryables(out);
  }

  onHit(sim: BattleSim, t: HitTarget, damage: number, owner: number): void {
    this.enemies.hit(sim, t, damage, owner);
  }

  playerContact(_sim: BattleSim, b: Aabb): boolean {
    return this.enemies.contact(b);
  }

  isComplete(): boolean {
    return false; // conclusão via nocaute do mini-chefe (sim.boss)
  }

  progress(sim: BattleSim): number {
    const run = Math.min(1, this.maxX / this.def.length);
    const boss = sim.boss ? sim.boss.progress : 0;
    return this.phase === 'arena' ? 0.8 + boss * 0.2 : run * 0.8;
  }
}

export function coinBox(c: { x: number; y: number }): Aabb {
  return { x: c.x, y: c.y, hw: 30, hh: 30 };
}

export { aabbOverlap };
