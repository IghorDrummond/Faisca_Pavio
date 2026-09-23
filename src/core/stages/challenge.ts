import type { BattleSim, HitTarget, ParryTarget, StageModule } from '../battle';
import type { Aabb } from '../geom';
import { Motion } from '../projectiles';
import type { SuperId } from '../types';

/**
 * Desafios de parry do mapa (concedem supers):
 * - Balão: 5 balões em arco — parry em todos sem tocar o chão depois do primeiro;
 * - Fagulha: 6 parries em fagulhas cianas disparadas por canhões, entre projéteis comuns.
 */
export class ChallengeModule implements StageModule {
  readonly scrolling = false;
  readonly kind: 'balao' | 'fagulha';
  readonly reward: SuperId;
  balloons: { pt: ParryTarget; alive: boolean; baseY: number }[] = [];
  parries = 0;
  goal: number;
  complete = false;
  chainStarted = false;
  private cannonTimer = 0;
  private shots = 0;

  constructor(kind: 'balao' | 'fagulha') {
    this.kind = kind;
    this.reward = kind === 'balao' ? 'pavioLongo' : 'braseiroGemeo';
    this.goal = kind === 'balao' ? 5 : 6;
  }

  reset(sim: BattleSim): void {
    this.parries = 0;
    this.complete = false;
    this.chainStarted = false;
    this.cannonTimer = 60;
    this.shots = 0;
    sim.geo.reset(900, 0, 1920, true);
    sim.viewLeft = 0;
    sim.viewRight = 1920;
    this.balloons = [];
    if (this.kind === 'balao') {
      const pos: [number, number][] = [
        [560, 690],
        [760, 560],
        [960, 450],
        [1160, 560],
        [1360, 680],
      ];
      pos.forEach(([x, y], i) => this.balloons.push({ pt: { x, y, r: 44, onParry: () => this.pop(i) }, alive: true, baseY: y }));
    }
  }

  private pop(i: number): void {
    const b = this.balloons[i];
    if (!b) return;
    b.alive = false;
    this.parries++;
    this.chainStarted = true;
    if (this.parries >= this.goal) this.complete = true;
  }

  update(sim: BattleSim): void {
    const p = sim.players[0]!;
    if (this.kind === 'balao') {
      for (const b of this.balloons) b.pt.y = b.baseY + Math.sin(sim.tick * 0.05 + b.pt.x * 0.01) * 12;
      // tocar o chão depois de começar a corrente reinicia os balões
      if (this.chainStarted && p.grounded && !this.complete) {
        this.parries = 0;
        this.chainStarted = false;
        for (const b of this.balloons) b.alive = true;
        sim.events.push('sound', 960, 500, 0, 0, -1, 'poof');
      }
      return;
    }
    // fagulha: canhões nas laterais
    this.cannonTimer--;
    if (this.cannonTimer <= 0 && !this.complete) {
      this.cannonTimer = 40;
      this.shots++;
      const side = this.shots % 2 ? 1 : -1;
      const s = sim.spawnEnemyProjectile();
      if (s) {
        const y = 520 + ((this.shots * 97) % 260);
        s.x = s.px = side > 0 ? -30 : 1950;
        s.y = s.py = y;
        s.vx = side * 360 * sim.speedMult;
        s.vy = 0;
        s.speed = 360;
        s.gravity = 0;
        s.r = 22;
        s.kind = 'ember';
        s.parry = this.shots % 3 !== 0;
        s.warn = s.warnTotal = 30;
        s.life = 400;
        s.age = 0;
        s.motion = Motion.Sine;
        s.baseX = s.x;
        s.baseY = y;
        s.dirX = side;
        s.dirY = 0;
        s.sineAmp = 40;
        s.sineFreq = 0.6;
        s.spin = 0;
        s.rolling = false;
        s.floorKill = false;
        s.bounces = 0;
        s.shadow = false;
        s.offscreenWarn = true;
      }
    }
    this.parries = sim.players[0]!.stats.parries;
    if (this.parries >= this.goal) this.complete = true;
  }

  collectTargets(_sim: BattleSim, _out: HitTarget[]): void {}

  collectParryables(_sim: BattleSim, out: ParryTarget[]): void {
    for (const b of this.balloons) if (b.alive) out.push(b.pt);
  }

  onHit(): void {}

  playerContact(_sim: BattleSim, _b: Aabb): boolean {
    return false;
  }

  isComplete(): boolean {
    return this.complete;
  }

  progress(): number {
    return this.parries / this.goal;
  }

  collectedCoins(): string[] {
    return [];
  }
}
