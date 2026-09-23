import { DT, WORLD_W, secToTicks } from './constants';
import type { EventQueue } from './events';
import { Hazard, type HazardContext, initHazard } from './hazards';
import { type EnemyProjectile, Motion } from './projectiles';
import type { Rng } from './rng';
import type {
  AttackAction,
  AttackDef,
  BodyPhaseDef,
  BossDef,
  DifficultyDef,
  EmitterDef,
  OriginDef,
  PhaseDef,
  ProjSpec,
} from './types';

export type BossState = 'intro' | 'idle' | 'attack' | 'breather' | 'transition' | 'knockout' | 'dead';

/** Mundo visto pelo chefe (implementado pela BattleSim). */
export interface BossWorld extends HazardContext {
  tick: number;
  rng: Rng;
  events: EventQueue;
  spawnEnemyProjectile(): EnemyProjectile | null;
  spawnHazard(): Hazard | null;
  /** alvo: jogador vivo mais próximo (ou sorteado em co-op) */
  targetPos(x: number, y: number, out: { x: number; y: number }): boolean;
  clearEnemyStuff(poof: boolean): void;
  musicBeat(): number;
  onMusic(op: 'skip' | 'tempoUp', value: number): void;
  /** verificação de justiça: distância do jogador mais próximo ao ponto de surgimento */
  checkSpawnFairness(x: number, y: number, hasWarn: boolean): void;
  requestHitstop(ticks: number): void;
}

/** Hit stop do nocaute (ticks). */
export const KNOCKOUT_HITSTOP = 20;

export class BossBody {
  id = '';
  x = 0;
  y = 0;
  px = 0;
  py = 0;
  def: BodyPhaseDef | null = null;
  visible = true;
  defeated = false;
  anim = 'idle';
  animT = 0;
  damageTaken = 0;
  flash = 0;
  // movimento
  moveType: 'none' | 'move' | 'jump' | 'chase' = 'none';
  fromX = 0;
  fromY = 0;
  toX = 0;
  toY = 0;
  moveT = 0;
  moveDur = 0;
  jumpH = 0;
  ease = true;
  chaseSpeed = 0;
  facing: 1 | -1 = -1;
}

/** Instância em execução de um emissor (pool reutilizado). */
class EmitterRun {
  active = false;
  def: EmitterDef | null = null;
  t = 0;
  spawned = 0;
  nextAt = 0;
  lastX = -9999;
  angle = 0;
  parryCounter = 0;
  body = '';
}

export class AttackSelector {
  private history: string[] = [];

  reset(): void {
    this.history.length = 0;
  }

  get last(): string | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Escolha ponderada com semente: nunca o mesmo ataque 3 vezes seguidas e respeita cannotFollow.
   */
  pick(options: readonly { id: string; weight: number }[], attacks: Map<string, AttackDef>, rng: Rng): string | null {
    const last = this.history[this.history.length - 1];
    const prev = this.history[this.history.length - 2];
    const lastDef = last ? attacks.get(last) : undefined;
    let total = 0;
    const allowed: { id: string; weight: number }[] = [];
    for (const o of options) {
      if (!attacks.has(o.id) || o.weight <= 0) continue;
      if (last && prev && o.id === last && o.id === prev) continue;
      if (lastDef?.cannotFollow?.includes(o.id)) continue;
      allowed.push(o);
      total += o.weight;
    }
    if (allowed.length === 0) {
      // fallback: qualquer ataque diferente do último
      for (const o of options) if (o.id !== last && attacks.has(o.id)) allowed.push(o), (total += Math.max(1, o.weight));
      if (allowed.length === 0) return options[0]?.id ?? null;
    }
    let r = rng.next() * total;
    for (const o of allowed) {
      r -= o.weight;
      if (r <= 0) {
        this.history.push(o.id);
        if (this.history.length > 8) this.history.shift();
        return o.id;
      }
    }
    const id = allowed[allowed.length - 1]!.id;
    this.history.push(id);
    return id;
  }
}

/** Executa a timeline de um ataque (telegraph + ações com tempo). */
class AttackRun {
  def: AttackDef | null = null;
  t = 0;
  telegraphTicks = 0;
  activeTicks = 0;
  recoveryTicks = 0;
  actionIdx = 0;
  sortedActions: { tick: number; a: AttackAction }[] = [];
  done = true;
  waitingBeat = false;
  beatStart = 0;
}

const tmpPos = { x: 0, y: 0 };
const tmpTarget = { x: 0, y: 0 };

export class BossSim {
  def: BossDef;
  difficulty: DifficultyDef;
  hp = 0;
  maxHp = 0;
  /** fração em que o chefe é nocauteado (Simples pula a última fase) */
  koFraction = 0;
  phaseIndex = 0;
  phaseCount = 0;
  state: BossState = 'intro';
  stateT = 0;
  bodies: BossBody[] = [];
  readonly attacks = new Map<string, AttackDef>();
  readonly selector = new AttackSelector();
  private readonly run = new AttackRun();
  private readonly ambient = new AttackRun();
  private ambientTimer = 0;
  private readonly emitters: EmitterRun[] = [];
  gapTimer = 0;
  sinceBreather = 0;
  nextBreatherAt = 0;
  phaseTicks = 0;
  tempoTimer = 0;
  survivor = '';
  attackCount = 0;
  lastAttackId = '';
  currentAttackId = '';
  /** chefe some / fica invulnerável */
  invulnerable = true;
  private readonly world: BossWorld;
  private readonly actionCache = new Map<AttackDef, { tick: number; a: AttackAction }[]>();

  constructor(def: BossDef, difficulty: DifficultyDef, hpMult: number, world: BossWorld) {
    this.def = def;
    this.difficulty = difficulty;
    this.world = world;
    for (const a of def.attacks) this.attacks.set(a.id, a);
    for (let i = 0; i < 24; i++) this.emitters.push(new EmitterRun());
    this.maxHp = Math.round(def.hp * difficulty.bossHp * hpMult);
    this.phaseCount = def.phases.length;
    this.koFraction = difficulty.skipLastPhase && def.phases.length > 1 ? (def.phases[def.phases.length - 1]?.hpStart ?? 0) : 0;
    this.reset();
  }

  reset(): void {
    this.hp = this.maxHp;
    this.phaseIndex = 0;
    this.state = 'intro';
    this.stateT = secToTicks(2.2);
    this.selector.reset();
    this.run.done = true;
    this.ambient.done = true;
    for (const e of this.emitters) e.active = false;
    this.bodies.length = 0;
    this.survivor = '';
    this.attackCount = 0;
    this.lastAttackId = '';
    this.currentAttackId = '';
    this.invulnerable = true;
    this.phaseTicks = 0;
    const ph = this.def.phases[0];
    if (ph) this.applyBodies(ph, true);
    this.sinceBreather = 0;
    this.nextBreatherAt = this.randTicks(ph?.breatherEvery ?? [9, 11]);
  }

  get phase(): PhaseDef {
    return this.def.phases[this.phaseIndex] ?? this.def.phases[0]!;
  }

  /** Progresso rumo ao nocaute (0..1), usado na barra da tela de derrota. */
  get progress(): number {
    const f = this.hp / this.maxHp;
    return Math.min(1, Math.max(0, (1 - f) / (1 - this.koFraction)));
  }

  /** Marcadores de fase na barra de progresso. */
  phaseMarkers(): number[] {
    const out: number[] = [];
    const n = this.difficulty.skipLastPhase ? this.def.phases.length - 1 : this.def.phases.length;
    for (let i = 1; i < n; i++) {
      const p = this.def.phases[i];
      if (p) out.push((1 - p.hpStart) / (1 - this.koFraction));
    }
    return out;
  }

  body(id: string): BossBody | undefined {
    const real = id === 'survivor' ? this.survivor : id;
    for (const b of this.bodies) if (b.id === real) return b;
    return this.bodies[0];
  }

  bodyPos(id: string, out: { x: number; y: number }): boolean {
    const b = this.body(id);
    if (!b) return false;
    out.x = b.x;
    out.y = b.y;
    return true;
  }

  private randTicks(range: readonly [number, number]): number {
    return secToTicks(this.world.rng.range(range[0], range[1]));
  }

  private applyBodies(ph: PhaseDef, snap: boolean): void {
    for (const bd of ph.bodies) {
      let b = this.bodies.find((x) => x.id === bd.id);
      if (!b) {
        b = new BossBody();
        b.id = bd.id;
        b.x = b.px = bd.x;
        b.y = b.py = bd.y;
        this.bodies.push(b);
      }
      b.def = bd;
      b.visible = bd.visible ?? true;
      if (snap) {
        b.x = b.px = bd.x;
        b.y = b.py = bd.y;
        b.moveType = 'none';
      } else if (!b.defeated) {
        this.startMove(b, bd.x, bd.y, Math.max(20, secToTicks(ph.transition) - 20), true);
      }
    }
  }

  private startMove(b: BossBody, x: number, y: number, ticks: number, ease: boolean): void {
    b.moveType = 'move';
    b.fromX = b.x;
    b.fromY = b.y;
    b.toX = x;
    b.toY = y;
    b.moveT = 0;
    b.moveDur = Math.max(1, ticks);
    b.ease = ease;
  }

  private stepBodies(): void {
    for (const b of this.bodies) {
      b.px = b.x;
      b.py = b.y;
      b.animT++;
      if (b.flash > 0) b.flash--;
      // corpos sempre olham para o centro da arena
      b.facing = b.x < 940 ? 1 : -1;
      if (b.moveType === 'move' || b.moveType === 'jump') {
        b.moveT++;
        const k0 = Math.min(1, b.moveT / b.moveDur);
        const k = b.ease ? k0 * k0 * (3 - 2 * k0) : k0;
        b.x = b.fromX + (b.toX - b.fromX) * (b.moveType === 'jump' ? k0 : k);
        b.y = b.fromY + (b.toY - b.fromY) * k;
        if (b.moveType === 'jump') b.y -= Math.sin(k0 * Math.PI) * b.jumpH;
        if (k0 >= 1) {
          if (b.moveType === 'jump') {
            this.world.events.push('shake', b.x, b.y, 0.5);
            this.world.events.push('sound', b.x, b.y, 0, 0, -1, 'land_heavy');
          }
          b.moveType = 'none';
        }
      } else if (b.moveType === 'chase') {
        b.moveT++;
        if (this.world.targetPos(b.x, b.y, tmpTarget)) {
          const dx = tmpTarget.x - b.x;
          const dy = tmpTarget.y - 60 - b.y;
          const d = Math.hypot(dx, dy) || 1;
          b.x += (dx / d) * b.chaseSpeed * DT;
          b.y += (dy / d) * b.chaseSpeed * DT * 0.6;
          b.facing = dx > 0 ? 1 : -1;
        }
        if (b.moveT >= b.moveDur) b.moveType = 'none';
      }
    }
  }

  // ---------------------------------------------------------------------------------------------

  update(): void {
    this.stepBodies();
    this.stepEmitters();
    this.stateT--;
    switch (this.state) {
      case 'intro':
        this.invulnerable = true;
        if (this.stateT <= 0) this.beginPhase(0, false);
        return;
      case 'transition':
        this.invulnerable = true;
        if (this.stateT <= 0) {
          this.state = 'idle';
          this.invulnerable = false;
          this.gapTimer = secToTicks(0.8);
          this.setAllAnim('idle');
        }
        return;
      case 'knockout':
        this.invulnerable = true;
        if (this.stateT <= 0) this.state = 'dead';
        return;
      case 'dead':
        return;
      default:
        break;
    }
    this.invulnerable = false;
    this.phaseTicks++;
    this.sinceBreather++;
    const ph = this.phase;

    // aceleração de andamento (fase final do gramofone)
    if (ph.tempoUpEvery) {
      this.tempoTimer++;
      if (this.tempoTimer >= secToTicks(ph.tempoUpEvery)) {
        this.tempoTimer = 0;
        this.world.onMusic('tempoUp', 1.08);
        this.world.events.push('music', 0, 0, 1.08, 0, -1, 'tempoUp');
      }
    }

    // trilha ambiente (perigos contínuos da fase)
    if (ph.ambient) {
      if (this.ambient.done) {
        this.ambientTimer--;
        if (this.ambientTimer <= 0) {
          this.startAmbient(ph);
          this.ambientTimer = secToTicks(ph.ambient.every + this.world.rng.range(-ph.ambient.jitter, ph.ambient.jitter));
        }
      } else {
        this.stepRun(this.ambient);
      }
    }

    if (this.state === 'attack') {
      this.stepRun(this.run);
      if (this.run.done) {
        this.state = 'idle';
        this.lastAttackId = this.currentAttackId;
        this.currentAttackId = '';
        this.gapTimer = this.computeGap();
        this.setAllAnim('idle');
      }
      return;
    }
    if (this.state === 'breather') {
      if (this.stateT <= 0) {
        this.state = 'idle';
        this.gapTimer = secToTicks(0.3);
      }
      return;
    }
    // idle
    this.gapTimer--;
    if (this.gapTimer > 0) return;
    if (this.sinceBreather >= this.nextBreatherAt) {
      this.state = 'breather';
      this.stateT = this.randTicks(ph.breatherTime);
      this.sinceBreather = 0;
      this.nextBreatherAt = this.randTicks(ph.breatherEvery);
      this.setAllAnim('idle');
      return;
    }
    const options = ph.attacks.filter((o) => {
      const a = this.attacks.get(o.id);
      return a !== undefined && (!a.expertOnly || this.difficulty.expertPatterns);
    });
    const id = this.selector.pick(options, this.attacks, this.world.rng);
    if (!id) return;
    const def = this.attacks.get(id);
    if (!def) return;
    this.startRun(this.run, def);
    this.currentAttackId = id;
    this.attackCount++;
    this.state = 'attack';
    this.world.events.push('attackStart', 0, 0, 0, 0, -1, id);
  }

  /** Ritmo aumenta conforme a vida cai dentro da fase. */
  private computeGap(): number {
    const ph = this.phase;
    const next = this.def.phases[this.phaseIndex + 1];
    const endF = next ? next.hpStart : this.koFraction;
    const f = this.hp / this.maxHp;
    const span = Math.max(0.0001, ph.hpStart - endF);
    const k = Math.min(1, Math.max(0, (ph.hpStart - f) / span));
    return secToTicks(ph.gapStart + (ph.gapEnd - ph.gapStart) * k);
  }

  private setAllAnim(anim: string): void {
    for (const b of this.bodies) {
      if (b.defeated) continue;
      if (b.anim !== anim) {
        b.anim = anim;
        b.animT = 0;
      }
    }
  }

  telegraphTicksFor(def: AttackDef): number {
    const base = secToTicks(def.telegraph) * this.difficulty.telegraph;
    return Math.max(secToTicks(this.difficulty.minTelegraph), Math.round(base));
  }

  private actionsOf(def: AttackDef): { tick: number; a: AttackAction }[] {
    let c = this.actionCache.get(def);
    if (!c) {
      c = def.actions.map((a) => ({ tick: secToTicks(a.t), a })).sort((p, q) => p.tick - q.tick);
      this.actionCache.set(def, c);
    }
    return c;
  }

  private startRun(r: AttackRun, def: AttackDef): void {
    r.def = def;
    r.t = 0;
    r.telegraphTicks = this.telegraphTicksFor(def);
    r.activeTicks = secToTicks(def.active);
    r.recoveryTicks = secToTicks(def.recovery);
    r.actionIdx = 0;
    r.sortedActions = this.actionsOf(def);
    r.done = false;
    r.waitingBeat = def.onBeat === true;
    r.beatStart = Math.floor(this.world.musicBeat());
    if (!r.waitingBeat) this.beginTelegraph(r);
  }

  private beginTelegraph(r: AttackRun): void {
    const def = r.def!;
    const bodyId = this.findActionBody(def);
    const b = this.body(bodyId);
    if (b && def.telegraphAnim) {
      b.anim = def.telegraphAnim;
      b.animT = 0;
    }
    this.world.events.push('warn', b?.x ?? 960, b?.y ?? 500, r.telegraphTicks, 0, -1, def.warnSound ?? 'warn');
  }

  private findActionBody(def: AttackDef): string {
    for (const a of def.actions) {
      if ('body' in a && a.body) return a.body;
    }
    return this.survivor || this.bodies[0]?.id || 'main';
  }

  private startAmbient(ph: PhaseDef): void {
    const amb = ph.ambient!;
    const pseudo: AttackDef = this.ambientDefs.get(ph) ?? {
      id: `${ph.id}_ambient`,
      telegraph: 0,
      telegraphAnim: '',
      active: Math.max(...amb.actions.map((a) => a.t)) + 0.1,
      recovery: 0,
      containsParry: false,
      actions: amb.actions,
    };
    this.ambientDefs.set(ph, pseudo);
    const r = this.ambient;
    r.def = pseudo;
    r.t = 0;
    r.telegraphTicks = 0;
    r.activeTicks = secToTicks(pseudo.active);
    r.recoveryTicks = 0;
    r.actionIdx = 0;
    r.sortedActions = this.actionsOf(pseudo);
    r.done = false;
    r.waitingBeat = false;
  }

  private readonly ambientDefs = new Map<PhaseDef, AttackDef>();

  private stepRun(r: AttackRun): void {
    if (r.done || !r.def) return;
    if (r.waitingBeat) {
      if (Math.floor(this.world.musicBeat()) > r.beatStart) {
        r.waitingBeat = false;
        this.beginTelegraph(r);
      }
      return;
    }
    r.t++;
    const activeT = r.t - r.telegraphTicks;
    while (r.actionIdx < r.sortedActions.length) {
      const item = r.sortedActions[r.actionIdx]!;
      if (item.tick > activeT) break;
      this.execAction(item.a);
      r.actionIdx++;
    }
    if (activeT >= r.activeTicks + r.recoveryTicks) r.done = true;
  }

  private execAction(a: AttackAction): void {
    const w = this.world;
    switch (a.do) {
      case 'emit':
        this.startEmitter(a.emitter);
        break;
      case 'hazard':
        this.spawnHazardDef(a.hazard);
        break;
      case 'anim': {
        const b = this.body(a.body ?? this.survivor ?? 'main');
        if (b) {
          b.anim = a.anim;
          b.animT = 0;
        }
        break;
      }
      case 'move': {
        const b = this.body(a.body ?? 'main');
        if (b) this.startMove(b, a.x, a.y, secToTicks(a.time), a.ease ?? true);
        break;
      }
      case 'jump': {
        const b = this.body(a.body ?? 'main');
        if (!b) break;
        let tx: number;
        if (a.x === 'player') {
          tx = w.targetPos(b.x, b.y, tmpTarget) ? tmpTarget.x : b.x;
        } else if (a.x === 'opposite') {
          tx = WORLD_W - b.x;
        } else tx = a.x;
        tx = Math.max(this.def.arena.left + 180, Math.min(this.def.arena.right - 180, tx));
        this.startJump(b, tx, secToTicks(a.time), a.height);
        break;
      }
      case 'chase': {
        const b = this.body(a.body ?? 'main');
        if (b) {
          b.moveType = 'chase';
          b.chaseSpeed = a.speed * this.difficulty.projectileSpeed;
          b.moveT = 0;
          b.moveDur = secToTicks(a.time);
        }
        break;
      }
      case 'sound':
        w.events.push('sound', 0, 0, 0, 0, -1, a.id);
        break;
      case 'shake':
        w.events.push('shake', 0, 0, a.amount);
        break;
      case 'music':
        w.onMusic(a.op, a.value);
        w.events.push('music', 0, 0, a.value, 0, -1, a.op);
        break;
      case 'swapBodies': {
        const live = this.bodies.filter((b) => !b.defeated);
        if (live.length === 2) {
          const [b0, b1] = live as [BossBody, BossBody];
          const x0 = b0.x;
          const x1 = b1.x;
          this.startJump(b0, x1, secToTicks(0.9), 380);
          this.startJump(b1, x0, secToTicks(0.9), 260);
        }
        break;
      }
    }
  }

  private startJump(b: BossBody, tx: number, ticks: number, height: number): void {
    b.moveType = 'jump';
    b.fromX = b.x;
    b.fromY = b.y;
    b.toX = tx;
    b.toY = b.def?.y ?? b.y;
    b.moveT = 0;
    b.moveDur = Math.max(1, ticks);
    b.jumpH = height;
  }

  // ---------------------------------------------------------------------------------------------
  // Emissores

  private startEmitter(def: EmitterDef): void {
    const e = this.emitters.find((x) => !x.active) ?? null;
    if (!e) return;
    e.active = true;
    e.def = def;
    e.t = 0;
    e.spawned = 0;
    e.nextAt = 0;
    e.lastX = -9999;
    e.parryCounter = 0;
    e.angle = 'startDeg' in def ? (def.startDeg * Math.PI) / 180 : 0;
    // mira resolvida no início para emissões lineares mirando o jogador
    if ('dirDeg' in def) {
      if (def.dirDeg === 'aimed') {
        this.resolveOrigin(this.originOf(def), tmpPos);
        e.angle = this.world.targetPos(tmpPos.x, tmpPos.y, tmpTarget)
          ? Math.atan2(tmpTarget.y - 60 - tmpPos.y, tmpTarget.x - tmpPos.x)
          : Math.PI;
      } else e.angle = (def.dirDeg * Math.PI) / 180;
    }
  }

  private originOf(def: EmitterDef): OriginDef {
    return 'origin' in def ? def.origin : { from: 'top' };
  }

  private resolveOrigin(o: OriginDef, out: { x: number; y: number }): void {
    switch (o.from) {
      case 'body': {
        const b = this.body(o.body ?? this.survivor ?? 'main');
        const anchor = o.anchor ? b?.def?.anchors[o.anchor] : undefined;
        // âncoras são definidas com o corpo olhando para a esquerda (facing -1)
        const flip = b && b.facing === 1 ? -1 : 1;
        out.x = (b?.x ?? 960) + (anchor?.x ?? 0) * flip + (o.x ?? 0);
        out.y = (b?.y ?? 500) + (anchor?.y ?? 0) + (o.y ?? 0);
        break;
      }
      case 'point':
        out.x = o.x ?? 960;
        out.y = o.y ?? 540;
        break;
      case 'top':
        out.x = o.x ?? 960;
        out.y = -40;
        break;
      case 'left':
        out.x = -40;
        out.y = o.y ?? 540;
        break;
      case 'right':
        out.x = WORLD_W + 40;
        out.y = o.y ?? 540;
        break;
    }
  }

  private stepEmitters(): void {
    for (const e of this.emitters) {
      if (!e.active || !e.def) continue;
      const def = e.def;
      while (e.active && e.t >= e.nextAt) {
        this.emitOnce(e, def);
      }
      e.t++;
    }
  }

  private finishIfDone(e: EmitterRun, count: number): void {
    if (e.spawned >= count) e.active = false;
  }

  private emitOnce(e: EmitterRun, def: EmitterDef): void {
    const w = this.world;
    switch (def.type) {
      case 'line':
      case 'wave': {
        this.resolveOrigin(def.origin, tmpPos);
        const ang = def.type === 'wave' ? (def.dirDeg * Math.PI) / 180 : e.angle;
        this.spawnProj(def.proj, tmpPos.x, tmpPos.y, ang, e);
        e.spawned++;
        e.nextAt += Math.max(1, secToTicks(def.interval));
        this.finishIfDone(e, def.count);
        break;
      }
      case 'fan': {
        this.resolveOrigin(def.origin, tmpPos);
        let base = e.angle;
        if (def.dirDeg === 'aimed' && w.targetPos(tmpPos.x, tmpPos.y, tmpTarget)) {
          base = Math.atan2(tmpTarget.y - 60 - tmpPos.y, tmpTarget.x - tmpPos.x);
        }
        const spread = (def.spreadDeg * Math.PI) / 180;
        for (let i = 0; i < def.count; i++) {
          const k = def.count === 1 ? 0 : i / (def.count - 1) - 0.5;
          this.spawnProj(def.proj, tmpPos.x, tmpPos.y, base + k * spread, e);
        }
        e.spawned++;
        e.nextAt += Math.max(1, secToTicks(def.interval ?? 0.5));
        this.finishIfDone(e, def.repeats ?? 1);
        break;
      }
      case 'ring': {
        this.resolveOrigin(def.origin, tmpPos);
        const off = (def.offsetDeg * Math.PI) / 180;
        for (let i = 0; i < def.count; i++) {
          this.spawnProj(def.proj, tmpPos.x, tmpPos.y, off + (i / def.count) * Math.PI * 2, e);
        }
        e.active = false;
        break;
      }
      case 'spiral': {
        this.resolveOrigin(def.origin, tmpPos);
        for (let k = 0; k < def.arms; k++) {
          this.spawnProj(def.proj, tmpPos.x, tmpPos.y, e.angle + (k / def.arms) * Math.PI * 2, e);
        }
        e.angle += (def.stepDeg * Math.PI) / 180;
        e.spawned++;
        e.nextAt += Math.max(1, secToTicks(def.interval));
        this.finishIfDone(e, def.count);
        break;
      }
      case 'rain': {
        let x: number;
        if (def.aimJitter !== undefined && w.targetPos(960, 0, tmpTarget)) {
          x = tmpTarget.x + w.rng.range(-def.aimJitter, def.aimJitter);
        } else {
          x = w.rng.range(def.xMin, def.xMax);
          // espaçamento mínimo entre quedas consecutivas
          for (let tries = 0; tries < 6 && Math.abs(x - e.lastX) < def.minSpacing; tries++) {
            x = w.rng.range(def.xMin, def.xMax);
          }
        }
        x = Math.max(def.xMin, Math.min(def.xMax, x));
        e.lastX = x;
        const p = this.spawnProj(def.proj, x, -60, Math.PI / 2, e, def.warn);
        if (p) p.shadow = true;
        e.spawned++;
        e.nextAt += Math.max(1, secToTicks(def.interval));
        this.finishIfDone(e, def.count);
        break;
      }
      case 'lob': {
        this.resolveOrigin(def.origin, tmpPos);
        const g = def.proj.gravity ?? 1800;
        let dir: number;
        if (def.dir === 'aimed') dir = w.targetPos(tmpPos.x, tmpPos.y, tmpTarget) && tmpTarget.x < tmpPos.x ? -1 : 1;
        else if (def.dir === 'random') dir = w.rng.chance(0.5) ? -1 : 1;
        else dir = def.dir;
        const dist = w.rng.range(def.distMin, def.distMax);
        const vy0 = -Math.sqrt(2 * g * def.apexHeight);
        const tUp = -vy0 / g;
        const fall = def.apexHeight + Math.max(0, this.world.floorY - tmpPos.y);
        const tDown = Math.sqrt((2 * fall) / g);
        const vx = (dir * dist) / (tUp + tDown);
        const p = this.spawnProj(def.proj, tmpPos.x, tmpPos.y, 0, e);
        if (p) {
          const sm = this.difficulty.projectileSpeed;
          // em dificuldades com projétil mais lento, o arco é o mesmo em tempo mais longo
          p.vx = vx * sm;
          p.vy = vy0 * sm;
          p.gravity = g * sm * sm;
        }
        e.spawned++;
        e.nextAt += Math.max(1, secToTicks(def.interval));
        this.finishIfDone(e, def.count);
        break;
      }
      case 'wall': {
        const gapY = w.rng.range(def.gapMin, def.gapMax);
        const x = def.side === 'left' ? -40 : WORLD_W + 40;
        const ang = def.side === 'left' ? 0 : Math.PI;
        for (let i = 0; i < def.count; i++) {
          const y = def.top + i * def.spacing;
          if (y > gapY && y < gapY + def.gapSize) continue;
          this.spawnProj(def.proj, x, y, ang, e);
        }
        e.active = false;
        break;
      }
    }
  }

  private spawnProj(spec: ProjSpec, x: number, y: number, angle: number, e: EmitterRun, warnOverride?: number): EnemyProjectile | null {
    const w = this.world;
    const p = w.spawnEnemyProjectile();
    if (!p) return null;
    const sm = this.difficulty.projectileSpeed;
    const speed = spec.speed * sm;
    p.x = p.px = x;
    p.y = p.py = y;
    p.speed = speed;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.dirX = Math.cos(angle);
    p.dirY = Math.sin(angle);
    p.baseX = x;
    p.baseY = y;
    p.gravity = (spec.gravity ?? 0) * sm * sm;
    p.r = spec.radius;
    p.kind = spec.kind;
    e.parryCounter++;
    p.parry =
      (spec.parryEvery !== undefined && e.parryCounter % spec.parryEvery === 0) ||
      (spec.parryChance !== undefined && w.rng.chance(spec.parryChance));
    const warnSec = warnOverride ?? spec.warn ?? 0;
    const warn = warnSec > 0 ? Math.max(w.minWarnTicks, Math.round(secToTicks(warnSec) * w.telegraphMult)) : 0;
    p.warn = p.warnTotal = warn;
    p.life = secToTicks(spec.life ?? 9);
    p.age = 0;
    p.motion =
      spec.motion === 'sine'
        ? Motion.Sine
        : spec.motion === 'homing'
          ? Motion.Homing
          : spec.motion === 'boomerang'
            ? Motion.Boomerang
            : Motion.Linear;
    p.sineAmp = spec.sineAmp ?? 0;
    p.sineFreq = spec.sineFreq ?? 0;
    p.turn = spec.homingTurn ?? 0;
    p.homingLeft = secToTicks(spec.homingTime ?? 0);
    p.boomerangAt = secToTicks((spec.boomerangTime ?? 1) / sm);
    p.bounces = spec.bounces ?? 0;
    p.floorKill = spec.floorKill ?? (p.bounces === 0 && (spec.gravity ?? 0) > 0);
    p.rolling = spec.rolling ?? false;
    p.spin = spec.spin ?? 0;
    p.angle = angle;
    p.shadow = false;
    p.offscreenWarn = x < -10 || x > WORLD_W + 10 || y < -10;
    if (p.offscreenWarn && p.warn === 0) {
      // nenhum ataque vindo de fora da tela sem indicador na borda
      p.warn = p.warnTotal = Math.max(w.minWarnTicks, secToTicks(0.4));
    }
    w.checkSpawnFairness(x, y, p.warn > 0);
    return p;
  }

  private spawnHazardDef(def: import('./types').HazardDef): void {
    const w = this.world;
    if (def.type === 'stomp') {
      const count = Array.isArray(def.xs) ? def.xs.length : (def.count ?? 3);
      for (let i = 0; i < count; i++) {
        const h = w.spawnHazard();
        if (!h) return;
        const xs = Array.isArray(def.xs) ? def.xs : null;
        initHazard(h, { ...def, xs: xs ? [xs[i] ?? 960] : 'track' }, w, secToTicks(def.interval) * i);
      }
      return;
    }
    if (def.type === 'shockwave' && def.dirs.length > 1) {
      for (const d of def.dirs) {
        const h = w.spawnHazard();
        if (!h) return;
        initHazard(h, { ...def, dirs: [d] }, w);
      }
      return;
    }
    const h = w.spawnHazard();
    if (h) initHazard(h, def, w);
  }

  // ---------------------------------------------------------------------------------------------
  // Dano, fases, nocaute

  /** Aplica dano. Retorna true se o golpe contou. */
  damage(amount: number, bodyId: string): boolean {
    if (this.invulnerable || this.state === 'knockout' || this.state === 'dead' || this.state === 'intro') return false;
    this.hp -= amount;
    const b = this.body(bodyId);
    if (b) {
      b.damageTaken += amount;
      b.flash = 3;
    }
    const f = this.hp / this.maxHp;
    if (f <= this.koFraction) {
      this.knockout();
      return true;
    }
    const next = this.def.phases[this.phaseIndex + 1];
    if (next && f <= next.hpStart) this.beginPhase(this.phaseIndex + 1, true);
    return true;
  }

  private beginPhase(i: number, withTransition: boolean): void {
    const ph = this.def.phases[i];
    if (!ph) return;
    this.phaseIndex = i;
    this.phaseTicks = 0;
    this.tempoTimer = 0;
    this.run.done = true;
    this.ambient.done = true;
    this.ambientTimer = secToTicks(ph.ambient?.startDelay ?? 1);
    for (const e of this.emitters) e.active = false;
    this.selector.reset();
    this.currentAttackId = '';
    if (this.def.twinRule && i === this.def.twinRule.phaseIndex) {
      const [a, b] = this.def.twinRule.bodies;
      const ba = this.bodies.find((x) => x.id === a);
      const bb = this.bodies.find((x) => x.id === b);
      if (ba && bb) {
        const loser = ba.damageTaken >= bb.damageTaken ? ba : bb;
        const winner = loser === ba ? bb : ba;
        loser.defeated = true;
        loser.anim = 'defeated';
        loser.animT = 0;
        this.survivor = winner.id;
      }
    }
    if (withTransition) {
      this.world.clearEnemyStuff(true);
      this.applyBodies(ph, false);
      this.state = 'transition';
      this.stateT = secToTicks(ph.transition);
      this.invulnerable = true;
      this.setAllAnim('transition');
      this.world.events.push('bossPhase', 0, 0, i, 0, -1, ph.id);
      this.world.events.push('shake', 0, 0, 0.6);
    } else {
      this.applyBodies(ph, true);
      this.state = 'idle';
      this.invulnerable = false;
      this.gapTimer = secToTicks(0.6);
      this.setAllAnim('idle');
    }
    if (this.survivor) {
      const s = this.bodies.find((x) => x.id === this.survivor);
      if (s) s.anim = withTransition ? 'transition' : 'idle';
    }
    this.sinceBreather = 0;
    this.nextBreatherAt = this.randTicks(ph.breatherEvery);
  }

  knockout(): void {
    this.hp = Math.min(this.hp, this.koFraction * this.maxHp);
    this.state = 'knockout';
    this.stateT = secToTicks(this.def.knockoutTime);
    this.run.done = true;
    this.ambient.done = true;
    for (const e of this.emitters) e.active = false;
    for (const b of this.bodies) {
      b.moveType = 'none';
      if (!b.defeated) {
        b.anim = 'knockout';
        b.animT = 0;
      }
    }
    this.world.clearEnemyStuff(true);
    this.world.requestHitstop(KNOCKOUT_HITSTOP);
    this.world.events.push('bossKnockout', this.bodies[0]?.x ?? 960, this.bodies[0]?.y ?? 500);
  }

  /** Força a próxima fase (debug). */
  skipToNextPhase(): void {
    const next = this.def.phases[this.phaseIndex + 1];
    if (next) {
      this.hp = Math.min(this.hp, next.hpStart * this.maxHp - 1);
      this.beginPhase(this.phaseIndex + 1, true);
    } else {
      this.hp = 0;
      this.knockout();
    }
  }

  /** Força um ataque específico (debug). */
  forceAttack(id: string): void {
    const def = this.attacks.get(id);
    if (!def || this.state === 'transition' || this.state === 'knockout' || this.state === 'intro') return;
    this.startRun(this.run, def);
    this.currentAttackId = id;
    this.state = 'attack';
  }

  /** Pula direto para uma fase no início (debug / capturas). */
  startAtPhase(i: number): void {
    const ph = this.def.phases[i];
    if (!ph) return;
    this.hp = Math.floor(ph.hpStart * this.maxHp);
    if (i > 0) this.hp -= 1;
    this.applyBodies(ph, true);
    this.beginPhase(i, false);
    this.state = 'idle';
  }

  get emitterActiveCount(): number {
    let n = 0;
    for (const e of this.emitters) if (e.active) n++;
    return n;
  }

  get attackRunning(): boolean {
    return this.state === 'attack' && !this.run.done;
  }
}
