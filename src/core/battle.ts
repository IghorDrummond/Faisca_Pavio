import { BossSim, type BossWorld } from './boss';
import { DT, WORLD_H, WORLD_W, secToTicks } from './constants';
import { EventQueue } from './events';
import { type Aabb, aabbOverlap, circleAabb, circleAabbRaw, sweptCircleAabb } from './geom';
import { Hazard, stepHazard } from './hazards';
import type { SimHost } from './host';
import { InputFrame } from './input';
import { LevelGeometry } from './level';
import { MusicClock } from './music';
import { PlayerSim, type PlayerLoadout } from './player';
import { EnemyProjectile, Motion, PlayerProjectile, Pool } from './projectiles';
import { Rng } from './rng';
import type { BossDef, CharacterId, DifficultyDef } from './types';
import { SUPERS } from '../data/weapons';
import { COOP_BOSS_HP_MULT } from '../data/difficulty';

/** Alvo atingível pelos tiros do jogador (partes do chefe, inimigos, alvos de treino). */
export interface HitTarget {
  tid: number;
  x: number;
  y: number;
  hw: number;
  hh: number;
  mult: number;
  alive: boolean;
  /** 'boss' | 'enemy' | 'dummy' */
  owner: string;
  /** corpo do chefe (owner = boss) */
  bodyId: string;
  contact: boolean;
  ref: unknown;
}

/** Objeto de parry genérico fornecido por módulos (balões, alvos do tutorial). */
export interface ParryTarget {
  x: number;
  y: number;
  r: number;
  onParry(sim: BattleSim, player: PlayerSim): void;
}

/** Módulo de fase (run'n'gun, tutorial, desafio de parry): estende a batalha sem alterar o núcleo. */
export interface StageModule {
  reset(sim: BattleSim): void;
  update(sim: BattleSim): void;
  collectTargets(sim: BattleSim, out: HitTarget[]): void;
  collectParryables(sim: BattleSim, out: ParryTarget[]): void;
  onHit(sim: BattleSim, target: HitTarget, damage: number, owner: number, isEx: boolean): void;
  /** verifica dano de contato de inimigos no jogador */
  playerContact(sim: BattleSim, box: Aabb): boolean;
  isComplete(sim: BattleSim): boolean;
  progress(sim: BattleSim): number;
  /** limites da câmera (run'n'gun) */
  readonly scrolling: boolean;
}

export interface PlayerConfig {
  character: CharacterId;
  loadout: PlayerLoadout;
  joined: boolean;
  autoFire?: boolean;
}

export interface BattleConfig {
  mode: 'ground' | 'plane';
  boss: BossDef | null;
  module: StageModule | null;
  difficulty: DifficultyDef;
  seed: number;
  players: PlayerConfig[];
  floorY: number;
  left: number;
  right: number;
  platforms: { x: number; y: number; w: number }[];
  spawnX: number[];
  spawnY: number;
  coopHpMult?: number;
  bpm?: number;
}

export type BattleResult = 'none' | 'victory' | 'defeat';

const TMP_BOX: Aabb = { x: 0, y: 0, hw: 0, hh: 0 };
const TMP_BOX2: Aabb = { x: 0, y: 0, hw: 0, hh: 0 };
const TMP_POS = { x: 0, y: 0 };

export class BattleSim implements SimHost, BossWorld {
  tick = 0;
  /** ticks de luta (sem intro) */
  fightTicks = 0;
  readonly events = new EventQueue(512);
  readonly geo = new LevelGeometry();
  readonly rng: Rng;
  readonly music = new MusicClock();
  readonly players: PlayerSim[] = [];
  readonly inputs: InputFrame[] = [new InputFrame(), new InputFrame()];
  readonly enemyShots = new Pool<EnemyProjectile>(() => new EnemyProjectile(), 400, 1200);
  readonly playerShots = new Pool<PlayerProjectile>(() => new PlayerProjectile(), 160, 400);
  readonly hazards = new Pool<Hazard>(() => new Hazard(), 32, 96);
  boss: BossSim | null = null;
  module: StageModule | null;
  config: BattleConfig;
  result: BattleResult = 'none';
  resultTicks = 0;
  hitstop = 0;
  superFreeze = 0;
  viewLeft = 0;
  viewRight = WORLD_W;
  telegraphMult = 1;
  minWarnTicks = 24;
  speedMult = 1;
  fairnessViolations = 0;
  /** debug: jogadores não tomam dano */
  invincible = false;
  /** provedor externo de tempo musical (AudioService); null = relógio determinístico */
  beatProvider: (() => number) | null = null;
  onMusicHook: ((op: 'skip' | 'tempoUp', value: number) => void) | null = null;
  readonly targets: HitTarget[] = [];
  readonly parryables: ParryTarget[] = [];
  private readonly bossTargets: HitTarget[] = [];
  private nextTid = 1;
  private readonly platformMap = new Map<number, number>();
  /** contagem de golpes recebidos por ataque (telemetria de "ataques que mais matam") */
  readonly hitsByAttack = new Map<string, number>();
  lastHitAttack = '';

  constructor(config: BattleConfig) {
    this.config = config;
    this.rng = new Rng(config.seed);
    this.module = config.module;
    config.players.forEach((pc, i) => {
      const p = new PlayerSim(i, pc.character, pc.loadout);
      p.joined = pc.joined;
      p.autoFire = pc.autoFire ?? false;
      this.players.push(p);
    });
    const joined = config.players.filter((p) => p.joined).length;
    if (config.boss) {
      const hpMult = joined > 1 ? (config.coopHpMult ?? COOP_BOSS_HP_MULT) : 1;
      this.boss = new BossSim(config.boss, config.difficulty, hpMult, this);
    }
    this.reset(config.seed);
  }

  get floorY(): number {
    return this.geo.floorY;
  }

  /** Reset completo para retry instantâneo (reutiliza pools, sem recarregar nada). */
  reset(seed: number): void {
    const c = this.config;
    this.rng.reseed(seed);
    this.tick = 0;
    this.fightTicks = 0;
    this.result = 'none';
    this.resultTicks = 0;
    this.hitstop = 0;
    this.superFreeze = 0;
    this.fairnessViolations = 0;
    this.events.clear();
    this.enemyShots.clear();
    this.playerShots.clear();
    this.hazards.clear();
    this.hitsByAttack.clear();
    this.platformMap.clear();
    this.geo.reset(c.floorY, c.left, c.right, c.mode === 'ground');
    for (const pl of c.platforms) this.geo.addPlatform(pl.x, pl.y, pl.w);
    this.viewLeft = 0;
    this.viewRight = WORLD_W;
    const d = c.difficulty;
    this.telegraphMult = d.telegraph;
    this.minWarnTicks = secToTicks(d.minTelegraph);
    this.speedMult = d.projectileSpeed;
    this.music.reset(c.bpm ?? c.boss?.bpm ?? 120);
    for (const inp of this.inputs) inp.reset();
    this.players.forEach((p, i) => {
      p.spawn(c.spawnX[i] ?? 400 + i * 120, c.spawnY, c.mode);
      if (!p.joined) p.forceState('out');
    });
    this.boss?.reset();
    this.module?.reset(this);
  }

  /** Troca/define o chefe durante a partida (sala do mini-chefe do run'n'gun). */
  setBoss(def: BossDef): void {
    const joined = this.players.filter((p) => p.joined).length;
    const hpMult = joined > 1 ? (this.config.coopHpMult ?? COOP_BOSS_HP_MULT) : 1;
    this.boss = new BossSim(def, this.config.difficulty, hpMult, this);
    this.music.reset(def.bpm ?? 120);
  }

  /** Jogador 2 entra no meio da partida (co-op drop-in). */
  joinPlayer(i: number): void {
    const p = this.players[i];
    if (!p || p.joined) return;
    p.joined = true;
    const other = this.players.find((q) => q !== p && q.alive);
    p.spawn(other ? other.x - 80 : 500, this.config.mode === 'plane' ? (other?.y ?? 540) : this.config.spawnY, this.config.mode);
    p.invuln = secToTicks(2);
  }

  /** Jogador sai da partida (co-op drop-out); o parceiro continua. Nunca remove o último jogador. */
  leavePlayer(i: number): boolean {
    const p = this.players[i];
    if (!p || !p.joined || this.players.filter((q) => q.joined).length < 2) return false;
    p.joined = false;
    p.forceState('out');
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // SimHost / BossWorld

  spawnPlayerShot(): PlayerProjectile | null {
    return this.playerShots.spawn();
  }

  spawnEnemyProjectile(): EnemyProjectile | null {
    return this.enemyShots.spawn();
  }

  spawnHazard(): Hazard | null {
    const h = this.hazards.spawn();
    return h;
  }

  requestHitstop(ticks: number): void {
    this.hitstop = Math.max(this.hitstop, ticks);
  }

  requestSuperFreeze(ticks: number): void {
    this.superFreeze = Math.max(this.superFreeze, ticks);
    this.events.push('shake', 0, 0, 0.2);
  }

  findTarget(x: number, y: number, out: { x: number; y: number }): boolean {
    let best = Infinity;
    for (const t of this.targets) {
      if (!t.alive) continue;
      const d = (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y);
      if (d < best) {
        best = d;
        out.x = t.x;
        out.y = t.y;
      }
    }
    return best < Infinity;
  }

  get targetX(): number {
    const p = this.pickTarget(960, 540);
    return p ? p.x : 960;
  }

  private pickTarget(x: number, y: number): PlayerSim | null {
    let best: PlayerSim | null = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (!p.joined || !p.alive) continue;
      const d = Math.abs(p.x - x) + Math.abs(p.y - y) * 0.5;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  targetPos(x: number, y: number, out: { x: number; y: number }): boolean {
    const alive = this.players.filter((p) => p.joined && p.alive);
    if (alive.length === 0) return false;
    // em co-op, alterna o alvo de forma determinística
    const p = alive.length === 1 ? alive[0]! : alive[this.rng.int(0, alive.length - 1)]!;
    out.x = p.x;
    out.y = p.mode === 'plane' ? p.y + 60 : p.y;
    void x;
    void y;
    return true;
  }

  rngPick(choices: number[]): number {
    return choices[this.rng.int(0, choices.length - 1)] ?? 0;
  }

  bodyPos(id: string, out: { x: number; y: number }): boolean {
    return this.boss ? this.boss.bodyPos(id, out) : false;
  }

  addPlatform(x: number, y: number, w: number, life: number, warn: number): number {
    const p = this.geo.addPlatform(x - w / 2, y, w);
    p.life = life;
    p.warn = warn;
    p.kind = 'fabric';
    return p.id;
  }

  removePlatform(id: number): void {
    for (const p of this.geo.platforms) if (p.id === id) p.active = false;
  }

  clearEnemyStuff(poof: boolean): void {
    for (const s of this.enemyShots.items) {
      if (s.active) {
        if (poof && s.warn === 0) this.events.push('projDie', s.x, s.y, s.parry ? 1 : 0, 0, -1, s.kind);
        this.enemyShots.kill(s);
      }
    }
    for (const h of this.hazards.items) {
      if (h.active) {
        if (h.type === 'platform' && h.platformId) this.removePlatform(h.platformId);
        this.hazards.kill(h);
      }
    }
  }

  musicBeat(): number {
    return this.beatProvider ? this.beatProvider() : this.music.beat;
  }

  onMusic(op: 'skip' | 'tempoUp', value: number): void {
    if (op === 'skip') this.music.skip(value);
    else this.music.tempoUp(value);
    this.onMusicHook?.(op, value);
  }

  checkSpawnFairness(x: number, y: number, hasWarn: boolean): void {
    if (hasWarn) return;
    for (const p of this.players) {
      if (!p.joined || !p.alive) continue;
      const py = p.mode === 'plane' ? p.y : p.y - 60;
      if (Math.hypot(p.x - x, py - y) < 150) {
        // ignora projéteis que nascem do corpo do chefe quando o jogador está colado nele
        if (!this.touchingBoss(p)) this.fairnessViolations++;
      }
    }
  }

  private touchingBoss(p: PlayerSim): boolean {
    p.hurtbox(TMP_BOX2);
    TMP_BOX2.hw += 120;
    TMP_BOX2.hh += 120;
    for (const t of this.bossTargets) if (aabbOverlap(TMP_BOX2, t)) return true;
    return false;
  }

  // ---------------------------------------------------------------------------------------------
  // Loop

  /** Alimenta o input bruto de um jogador (chamado toda vez antes de step). */
  feedInput(i: number, raw: number): void {
    this.inputs[i]?.feed(raw);
  }

  step(): void {
    this.tick++;
    if (this.result !== 'none') this.resultTicks++;
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    if (this.superFreeze > 0) {
      this.superFreeze--;
      return;
    }
    for (const inp of this.inputs) inp.latch();
    this.music.step();
    this.geo.step(this.tick);

    // alvos do chefe
    this.rebuildTargets();

    // jogadores
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]!;
      if (!p.joined) continue;
      if (this.result === 'victory' && p.alive) {
        p.forceState('victory');
      }
      p.update(this.inputs[i]!, this);
    }

    // chefe
    if (this.boss) {
      this.boss.update();
      if (this.boss.state !== 'intro') this.fightTicks++;
    } else if (this.result === 'none') {
      this.fightTicks++;
    }

    this.module?.update(this);

    // perigos
    for (const h of this.hazards.items) {
      if (!h.active) continue;
      if (!stepHazard(h, this)) this.hazards.kill(h);
      else if (h.type === 'force' && h.phase === 'active') this.applyForce(h);
    }

    this.stepEnemyShots();
    this.rebuildTargets();
    this.stepPlayerShots();
    this.applySupers();
    this.checkPlayers();
    this.checkEnd();
  }

  private rebuildTargets(): void {
    this.targets.length = 0;
    this.bossTargets.length = 0;
    const b = this.boss;
    if (b && b.state !== 'dead') {
      let k = 0;
      for (const body of b.bodies) {
        if (!body.def || body.defeated || !body.visible) continue;
        for (const part of body.def.parts) {
          let t = this.bossTargetPool[k];
          if (!t) {
            t = { tid: this.nextTid++, x: 0, y: 0, hw: 0, hh: 0, mult: 1, alive: true, owner: 'boss', bodyId: '', contact: false, ref: null };
            this.bossTargetPool.push(t);
          }
          k++;
          const flip = body.facing === 1 ? -1 : 1;
          t.x = body.x + part.x * flip;
          t.y = body.y + part.y;
          t.hw = part.w / 2;
          t.hh = part.h / 2;
          t.mult = part.damageMult ?? 1;
          t.alive = part.hurt && !b.invulnerable;
          t.bodyId = body.id;
          t.contact = part.contact;
          this.bossTargets.push(t);
          if (part.hurt) this.targets.push(t);
        }
      }
    }
    this.module?.collectTargets(this, this.targets);
    this.parryables.length = 0;
    this.module?.collectParryables(this, this.parryables);
  }

  private readonly bossTargetPool: HitTarget[] = [];

  /** Todas as partes do chefe (inclui as só de contato), para análises e bot. */
  get bossPartBoxes(): readonly HitTarget[] {
    return this.bossTargets;
  }

  private applyForce(h: Hazard): void {
    for (const p of this.players) {
      if (!p.alive || p.state === 'dash') continue;
      const dir = Math.sign(h.x - p.x);
      p.x += dir * h.strength * DT;
    }
  }

  private stepEnemyShots(): void {
    const floor = this.geo.floorY;
    for (const s of this.enemyShots.items) {
      if (!s.active) continue;
      s.px = s.x;
      s.py = s.y;
      if (s.warn > 0) {
        s.warn--;
        continue;
      }
      s.age++;
      switch (s.motion) {
        case Motion.Sine: {
          s.baseX += s.dirX * s.speed * DT;
          s.baseY += s.dirY * s.speed * DT;
          const off = Math.sin((s.age / 60) * s.sineFreq * Math.PI * 2) * s.sineAmp;
          s.x = s.baseX - s.dirY * off;
          s.y = s.baseY + s.dirX * off;
          break;
        }
        case Motion.Homing: {
          if (s.homingLeft > 0) {
            s.homingLeft--;
            if (this.targetPos(s.x, s.y, TMP_POS)) {
              const want = Math.atan2(TMP_POS.y - 70 - s.y, TMP_POS.x - s.x);
              const cur = Math.atan2(s.vy, s.vx);
              let d = want - cur;
              while (d > Math.PI) d -= Math.PI * 2;
              while (d < -Math.PI) d += Math.PI * 2;
              const maxT = s.turn * DT;
              const na = cur + Math.max(-maxT, Math.min(maxT, d));
              s.vx = Math.cos(na) * s.speed;
              s.vy = Math.sin(na) * s.speed;
            }
          }
          s.x += s.vx * DT;
          s.y += s.vy * DT;
          break;
        }
        case Motion.Boomerang: {
          if (s.age > s.boomerangAt) {
            s.vx -= s.dirX * s.speed * 1.6 * DT;
            s.vy -= s.dirY * s.speed * 1.6 * DT;
          }
          s.x += s.vx * DT;
          s.y += s.vy * DT;
          break;
        }
        default:
          s.vy += s.gravity * DT;
          s.x += s.vx * DT;
          s.y += s.vy * DT;
      }
      s.angle += s.spin * DT;
      if (s.rolling) {
        s.y = floor - s.r;
        s.angle += (s.vx * DT) / Math.max(1, s.r);
      } else if (s.gravity > 0 && s.y + s.r >= floor && s.vy > 0) {
        if (s.bounces > 0) {
          s.bounces--;
          s.y = floor - s.r;
          s.vy = -Math.abs(s.vy) * 0.82;
          this.events.push('sound', s.x, s.y, 0, 0, -1, 'bounce');
        } else if (s.floorKill) {
          this.events.push('projDie', s.x, floor, s.parry ? 1 : 0, 0, -1, s.kind);
          this.enemyShots.kill(s);
          continue;
        }
      }
      s.life--;
      if (s.life <= 0 || s.x < this.viewLeft - 260 || s.x > this.viewRight + 260 || s.y > WORLD_H + 200 || s.y < -400) {
        this.enemyShots.kill(s);
      }
    }
  }

  private stepPlayerShots(): void {
    for (const s of this.playerShots.items) {
      if (!s.active) continue;
      s.px = s.x;
      s.py = s.y;
      if (s.homingTurn > 0 && this.findTarget(s.x, s.y, TMP_POS)) {
        const speed = Math.hypot(s.vx, s.vy);
        const want = Math.atan2(TMP_POS.y - s.y, TMP_POS.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const maxT = s.homingTurn * DT;
        const na = cur + Math.max(-maxT, Math.min(maxT, d));
        s.vx = Math.cos(na) * speed;
        s.vy = Math.sin(na) * speed;
      }
      s.vy += s.gravity * DT;
      s.x += s.vx * DT;
      s.y += s.vy * DT;
      s.angle = Math.atan2(s.vy, s.vx);
      s.travel += Math.hypot(s.x - s.px, s.y - s.py);
      if (s.hitCooldown > 0) s.hitCooldown--;
      s.life--;

      // varredura contínua contra alvos
      let hit: HitTarget | null = null;
      for (const t of this.targets) {
        if (!t.alive) continue;
        if (s.pierce > 0 && t.tid === s.lastHit && s.hitCooldown > 0) continue;
        if (sweptCircleAabb(s.px, s.py, s.x, s.y, s.r, t.x, t.y, t.hw, t.hh)) {
          hit = t;
          break;
        }
      }
      if (hit) {
        this.applyShotHit(s, hit);
        if (s.pierce > 0) {
          s.pierce--;
          s.lastHit = hit.tid;
          s.hitCooldown = 8;
          if (s.pierce === 0) {
            this.playerShots.kill(s);
          }
        } else {
          this.playerShots.kill(s);
        }
        continue;
      }
      // chão (bombas do avião) e alcance
      const floorHit = this.config.mode === 'ground' ? s.y > this.geo.floorY + 30 : s.y > WORLD_H + 20;
      if (s.splitCount > 0 && s.travel > 900) {
        this.explodeShot(s);
        this.playerShots.kill(s);
        continue;
      }
      if (s.travel > s.range || s.life <= 0 || floorHit || s.x < this.viewLeft - 100 || s.x > this.viewRight + 100 || s.y < -150 || s.y > WORLD_H + 150) {
        if (s.explosionRadius > 0 && s.life > 0 && s.travel <= s.range && s.gravity > 0) this.explodeShot(s);
        else this.events.push('projDie', s.x, s.y, 0, 1, s.owner, s.kind);
        this.playerShots.kill(s);
      }
    }
  }

  private applyShotHit(s: PlayerProjectile, t: HitTarget): void {
    if (s.explosionRadius > 0) {
      this.explodeShot(s);
      return;
    }
    this.damageTarget(t, s.damage, s.owner, s.meterGain, s.isEx);
    this.events.push('hitBoss', s.x, s.y, s.damage, s.isEx ? 1 : 0, s.owner, s.kind);
  }

  private explodeShot(s: PlayerProjectile): void {
    this.events.push('explosion', s.x, s.y, s.explosionRadius, 0, s.owner, s.kind);
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (circleAabbRaw(s.x, s.y, s.explosionRadius, t.x, t.y, t.hw, t.hh)) {
        this.damageTarget(t, s.damage, s.owner, s.meterGain, s.isEx);
        // um único golpe por explosão por dono (chefe multi-parte)
        if (t.owner === 'boss') break;
      }
    }
    if (s.splitCount > 0) {
      const n = s.splitCount;
      for (let i = 0; i < n; i++) {
        const c = this.spawnPlayerShot();
        if (!c) break;
        const a = s.angle + ((i - (n - 1) / 2) * 35 * Math.PI) / 180;
        c.owner = s.owner;
        c.x = c.px = s.x - Math.cos(s.angle) * 20;
        c.y = c.py = s.y - Math.sin(s.angle) * 20;
        c.vx = Math.cos(a) * 900;
        c.vy = Math.sin(a) * 900;
        c.damage = s.damage * 0.6;
        c.r = 18;
        c.range = 700;
        c.travel = 0;
        c.kind = 'ex_rojao_small';
        c.homingTurn = 0;
        c.pierce = 0;
        c.hitCooldown = 0;
        c.lastHit = -1;
        c.explosionRadius = 80;
        c.splitCount = 0;
        c.life = 90;
        c.isEx = true;
        c.meterGain = 0;
        c.gravity = 0;
        c.angle = a;
      }
    }
  }

  damageTarget(t: HitTarget, dmg: number, owner: number, meterGain: number, isEx = false): void {
    const amount = dmg * t.mult;
    if (t.owner === 'boss') {
      if (this.boss && this.boss.damage(amount, t.bodyId)) {
        const p = this.players[owner];
        if (p) {
          p.stats.damageDealt += amount;
          if (meterGain > 0) p.addMeter(amount * meterGain * 2, this);
        }
      }
    } else if (this.module) {
      this.module.onHit(this, t, amount, owner, isEx);
      const p = this.players[owner];
      if (p && meterGain > 0) p.addMeter(amount * meterGain * 2, this);
    }
  }

  private readonly superHitTimer = [0, 0];

  private applySupers(): void {
    for (const p of this.players) {
      if (!p.alive) continue;
      const i = p.index;
      if (p.beamActive) {
        this.superHitTimer[i] = (this.superHitTimer[i] ?? 0) - 1;
        if ((this.superHitTimer[i] ?? 0) <= 0) {
          this.superHitTimer[i] = secToTicks(SUPERS.chamaMestra.hitInterval);
          const x0 = p.x + p.facing * 60;
          TMP_BOX.x = x0 + p.facing * 800;
          TMP_BOX.y = p.mode === 'plane' ? p.y : p.y - 80;
          TMP_BOX.hw = 800;
          TMP_BOX.hh = 70;
          if (p.mode === 'plane') TMP_BOX.x = p.x + 860;
          for (const t of this.targets) {
            if (t.alive && aabbOverlap(TMP_BOX, t)) {
              this.damageTarget(t, SUPERS.chamaMestra.damagePerHit, i, 0);
              this.events.push('hitBoss', t.x - p.facing * t.hw, TMP_BOX.y, 0, 1, i, 'beam');
              if (t.owner === 'boss') break;
            }
          }
        }
      } else if (p.auraActive) {
        this.superHitTimer[i] = (this.superHitTimer[i] ?? 0) - 1;
        if ((this.superHitTimer[i] ?? 0) <= 0) {
          this.superHitTimer[i] = secToTicks(SUPERS.pavioLongo.hitInterval);
          p.hurtbox(TMP_BOX);
          TMP_BOX.hw += 60;
          TMP_BOX.hh += 50;
          for (const t of this.targets) {
            if (t.alive && aabbOverlap(TMP_BOX, t)) {
              this.damageTarget(t, SUPERS.pavioLongo.damagePerHit, i, 0);
              this.events.push('hitBoss', t.x, t.y, 0, 1, i, 'aura');
              if (t.owner === 'boss') break;
            }
          }
        }
      }
    }
  }

  /** Parry, dano de projéteis, perigos e contato. Parry tem precedência sobre dano do mesmo objeto. */
  private checkPlayers(): void {
    const b = this.boss;
    const bossSafe = !b || b.state === 'transition' || b.state === 'knockout' || b.state === 'dead' || b.state === 'intro';
    for (const p of this.players) {
      if (!p.joined) continue;

      // revive: parry no fantasma do parceiro
      if (p.alive && p.parryActive) {
        for (const q of this.players) {
          if (q === p || q.state !== 'ghost') continue;
          p.parryBox(TMP_BOX);
          if (circleAabb(q.x, q.y - 60, 55, TMP_BOX)) {
            p.parrySuccess(this);
            q.revive(this);
            break;
          }
        }
      }
      if (!p.alive) continue;
      const magnetic = p.loadout.charm === 'luvaMagnetica';
      const canParryNow = p.parryActive || magnetic;
      p.parryBox(TMP_BOX);
      // parry em projéteis cianos
      if (canParryNow) {
        let parried = false;
        for (const s of this.enemyShots.items) {
          if (!s.active || !s.parry || s.warn > 0) continue;
          const box = p.parryActive ? TMP_BOX : this.hurtboxOf(p, TMP_BOX2);
          if (circleAabb(s.x, s.y, s.r, box)) {
            this.events.push('projDie', s.x, s.y, 1, 2, p.index, s.kind);
            this.enemyShots.kill(s);
            p.parrySuccess(this);
            parried = true;
            break;
          }
        }
        if (!parried) {
          for (const h of this.hazards.items) {
            if (!h.active || !h.parry || !h.damaging) continue;
            const box = p.parryActive ? TMP_BOX : this.hurtboxOf(p, TMP_BOX2);
            if (h.hits(box)) {
              h.parry = false;
              p.parrySuccess(this);
              parried = true;
              break;
            }
          }
        }
        if (!parried) {
          for (const pt of this.parryables) {
            const box = p.parryActive ? TMP_BOX : this.hurtboxOf(p, TMP_BOX2);
            if (circleAabb(pt.x, pt.y, pt.r, box)) {
              pt.onParry(this, p);
              p.parrySuccess(this);
              parried = true;
              break;
            }
          }
        }
        if (parried) continue;
      }

      if (this.invincible || p.invulnerable || (bossSafe && b !== null)) continue;
      p.hurtbox(TMP_BOX);
      let hitBy = '';
      for (const s of this.enemyShots.items) {
        if (!s.active || s.warn > 0) continue;
        if (circleAabb(s.x, s.y, s.r * 0.9, TMP_BOX)) {
          hitBy = s.kind;
          break;
        }
      }
      if (!hitBy) {
        for (const h of this.hazards.items) {
          if (h.active && h.hits(TMP_BOX)) {
            hitBy = h.kind;
            break;
          }
        }
      }
      if (!hitBy && b) {
        for (const t of this.bossTargets) {
          if (t.contact && aabbOverlap(TMP_BOX, t)) {
            hitBy = 'contact';
            break;
          }
        }
      }
      if (!hitBy && this.module && this.module.playerContact(this, TMP_BOX)) hitBy = 'enemy';
      if (hitBy) {
        if (p.hurt(this)) {
          const key = `${b?.currentAttackId || b?.phase.id || 'stage'}:${hitBy}`;
          this.hitsByAttack.set(key, (this.hitsByAttack.get(key) ?? 0) + 1);
          this.lastHitAttack = key;
        }
      }
    }
  }

  private hurtboxOf(p: PlayerSim, out: Aabb): Aabb {
    p.hurtbox(out);
    return out;
  }

  private checkEnd(): void {
    if (this.result !== 'none') return;
    const b = this.boss;
    // vitória prevalece se o chefe zerou a vida neste tick
    if ((b && b.state === 'dead') || (b && b.state === 'knockout' && b.stateT <= 1)) {
      this.result = 'victory';
    } else if (!b && this.module && this.module.isComplete(this)) {
      this.result = 'victory';
    }
    if (this.result === 'victory') {
      this.events.push('victory', 0, 0);
      return;
    }
    if (b && (b.state === 'knockout' || b.state === 'dead')) return;
    let anyAlive = false;
    let anyDying = false;
    for (const p of this.players) {
      if (!p.joined) continue;
      if (p.alive) anyAlive = true;
      if (p.state === 'dead') anyDying = true;
    }
    if (!anyAlive && !anyDying) {
      this.result = 'defeat';
      this.events.push('defeat', 0, 0);
    }
  }

  /** Progresso para a barra da tela de derrota. */
  get progress(): number {
    if (this.boss) return this.boss.progress;
    return this.module ? this.module.progress(this) : 0;
  }

  get activeObjectCount(): number {
    return this.enemyShots.activeCount + this.playerShots.activeCount + this.hazards.activeCount;
  }
}
