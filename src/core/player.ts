import { DT, TICK_RATE, secToTicks } from './constants';
import { approach, clamp } from './geom';
import type { SimHost } from './host';
import { Btn, DIR8, InputBuffer, type InputFrame } from './input';
import type { CharacterId, CharmId, SuperId, WeaponId } from './types';
import { METER, PLANE_TUNING, PLAYER_TUNING as T } from '../data/tuning';
import { CHARM_EFFECTS } from '../data/weapons';
import { WeaponState, fireEx, updateWeapon } from './weaponsSim';

export type PlayerState =
  | 'intro'
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'crouch'
  | 'lock'
  | 'dash'
  | 'parry'
  | 'hurt'
  | 'ex'
  | 'super'
  | 'dead'
  | 'ghost'
  | 'out'
  | 'victory';

/** Transições permitidas (estados proibidos são impedidos por setState). */
const ALLOWED: Record<PlayerState, readonly PlayerState[]> = {
  intro: ['idle', 'run', 'fall', 'jump', 'dead', 'victory'],
  idle: ['run', 'jump', 'fall', 'crouch', 'lock', 'dash', 'hurt', 'ex', 'super', 'dead', 'victory', 'idle'],
  run: ['idle', 'jump', 'fall', 'crouch', 'lock', 'dash', 'hurt', 'ex', 'super', 'dead', 'victory', 'run'],
  jump: ['fall', 'idle', 'run', 'dash', 'parry', 'hurt', 'ex', 'super', 'dead', 'victory', 'jump', 'crouch', 'lock'],
  fall: ['idle', 'run', 'jump', 'dash', 'parry', 'hurt', 'ex', 'super', 'dead', 'victory', 'fall', 'crouch', 'lock'],
  crouch: ['idle', 'run', 'jump', 'fall', 'lock', 'dash', 'hurt', 'ex', 'super', 'dead', 'victory', 'crouch'],
  lock: ['idle', 'run', 'jump', 'fall', 'crouch', 'dash', 'hurt', 'ex', 'super', 'dead', 'victory', 'lock'],
  dash: ['idle', 'run', 'fall', 'jump', 'parry', 'hurt', 'dead', 'victory', 'crouch', 'lock'],
  parry: ['fall', 'jump', 'idle', 'run', 'dash', 'hurt', 'ex', 'super', 'dead', 'victory', 'parry', 'crouch', 'lock'],
  hurt: ['idle', 'run', 'jump', 'fall', 'crouch', 'lock', 'dash', 'dead', 'victory', 'hurt', 'parry', 'ex'],
  ex: ['idle', 'run', 'jump', 'fall', 'crouch', 'lock', 'hurt', 'dead', 'victory'],
  super: ['idle', 'fall', 'run', 'jump', 'dead', 'victory'],
  dead: ['ghost', 'out', 'idle'],
  ghost: ['idle', 'out', 'fall'],
  out: ['idle', 'fall'],
  victory: ['victory'],
};

export interface PlayerLoadout {
  weapons: [WeaponId, WeaponId];
  superId: SuperId;
  charm: CharmId | null;
}

export interface PlayerStats {
  parries: number;
  cardsUsed: number;
  damageTaken: number;
  shotsFired: number;
  damageDealt: number;
}

export class PlayerSim {
  readonly index: number;
  character: CharacterId;
  mode: 'ground' | 'plane' = 'ground';
  state: PlayerState = 'idle';
  stateTicks = 0;

  x = 0;
  y = 0; // pés
  px = 0;
  py = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = false;
  /** plataforma one-way sob os pés (id) ou 0 */
  onPlatform = 0;
  coyote = 0;
  jumpBuffer = new InputBuffer(T.jumpBufferTicks);
  dashBuffer = new InputBuffer(4);
  parryBufferAfterDash = new InputBuffer(T.dashBufferParryTicks);
  jumping = false;
  airDash = true;
  dashTicks = 0;
  dashDir: 1 | -1 = 1;
  parryTicks = 0;
  parryUsed = false;
  /** direção de mira 0..7 */
  aim = 0;
  crouching = false;
  locked = false;
  dropThrough = 0;

  hp: number = T.maxHp;
  maxHp: number = T.maxHp;
  invuln = 0;
  hurtTicks = 0;
  deathTicks = 0;
  /** super: invencível enquanto > 0 */
  superInvuln = 0;
  superTicks = 0;
  superKind: SuperId | null = null;
  exTicks = 0;
  meter = 0;
  firstHitFree = false;
  lastSafeX = 0;
  lastSafeY = 0;
  fellCount = 0;

  loadout: PlayerLoadout;
  weapon: WeaponState;
  activeWeapon = 0;
  stats: PlayerStats = { parries: 0, cardsUsed: 0, damageTaken: 0, shotsFired: 0, damageDealt: 0 };

  /** avião: encolhido */
  shrunk = false;
  planeParryCooldown = 0;
  planeWeapon: 'shot' | 'bomb' = 'shot';
  /** clone de fogo (Braseiro Gêmeo) */
  cloneTicks = 0;
  cloneX = 0;
  cloneY = 0;
  /** jogador está participando (co-op) */
  joined = true;
  autoFire = false;
  /** ghost: posição do fantasma */
  ghostBaseX = 0;
  /** mira do avião/anim recuo */
  recoil = 0;
  /** tiros travados (tutorial) */
  canShoot = true;
  canDash = true;
  canParry = true;
  canEx = true;
  private readonly jumpV: number;
  private readonly jumpCutV: number;
  private readonly gUp: number;
  private readonly gDown: number;

  constructor(index: number, character: CharacterId, loadout: PlayerLoadout) {
    this.index = index;
    this.character = character;
    this.loadout = loadout;
    this.weapon = new WeaponState();
    // Física do pulo derivada das alturas-alvo (px/s e px/s²).
    this.jumpV = (2 * T.jumpHeightFull) / T.timeToApex;
    this.gUp = this.jumpV / T.timeToApex;
    this.gDown = this.gUp * T.fallGravityMult;
    this.jumpCutV = Math.sqrt(2 * this.gUp * T.jumpHeightTap * 0.72);
  }

  get alive(): boolean {
    return this.state !== 'dead' && this.state !== 'ghost' && this.state !== 'out';
  }

  get active(): boolean {
    return this.joined && this.state !== 'out';
  }

  get currentWeapon(): WeaponId {
    return this.loadout.weapons[this.activeWeapon] ?? 'reta';
  }

  get cards(): number {
    return Math.floor(this.meter / METER.perCard);
  }

  get dashInvuln(): boolean {
    return this.state === 'dash' && this.loadout.charm === 'fumacaPalco' && CHARM_EFFECTS.fumacaPalco.dashInvuln;
  }

  get invulnerable(): boolean {
    return this.invuln > 0 || this.superInvuln > 0 || this.dashInvuln || this.state === 'victory';
  }

  spawn(x: number, y: number, mode: 'ground' | 'plane'): void {
    this.mode = mode;
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = this.vy = 0;
    this.lastSafeX = x;
    this.lastSafeY = y;
    this.facing = 1;
    this.maxHp = T.maxHp + (this.loadout.charm === 'coracaoCera' ? CHARM_EFFECTS.coracaoCera.extraHp : 0);
    this.hp = this.maxHp;
    this.meter = 0;
    this.invuln = 0;
    this.superInvuln = 0;
    this.superTicks = 0;
    this.superKind = null;
    this.exTicks = 0;
    this.parryTicks = 0;
    this.parryUsed = false;
    this.airDash = true;
    this.dashTicks = 0;
    this.deathTicks = 0;
    this.cloneTicks = 0;
    this.shrunk = false;
    this.planeWeapon = 'shot';
    this.activeWeapon = 0;
    this.firstHitFree = this.loadout.charm === 'cartolaSorte';
    this.jumpBuffer.clear();
    this.dashBuffer.clear();
    this.parryBufferAfterDash.clear();
    this.weapon.reset();
    this.stats.parries = 0;
    this.stats.cardsUsed = 0;
    this.stats.damageTaken = 0;
    this.stats.shotsFired = 0;
    this.stats.damageDealt = 0;
    this.grounded = mode === 'ground';
    this.state = 'intro';
    this.stateTicks = 0;
    this.fellCount = 0;
  }

  setState(s: PlayerState): boolean {
    if (s === this.state) {
      return true;
    }
    if (!ALLOWED[this.state].includes(s)) return false;
    this.state = s;
    this.stateTicks = 0;
    return true;
  }

  /** Força estado (usado por intro/vitória/reset). */
  forceState(s: PlayerState): void {
    this.state = s;
    this.stateTicks = 0;
  }

  addMeter(points: number, host: SimHost): void {
    if (this.superTicks > 0) return; // não enche durante o super
    const before = this.cards;
    this.meter = clamp(this.meter + points, 0, METER.cards * METER.perCard);
    const after = this.cards;
    if (after > before) host.events.push('meterCard', this.x, this.y, after, 0, this.index);
  }

  // ---------------------------------------------------------------------------------------------
  // Hitboxes

  /** Hurtbox: ~60% da largura e ~75% da altura do sprite, centrada no tronco (sem a chama). */
  hurtbox(out: { x: number; y: number; hw: number; hh: number }): void {
    if (this.mode === 'plane') {
      const r = this.shrunk ? PLANE_TUNING.shrinkHurtR : PLANE_TUNING.hurtR;
      out.x = this.x;
      out.y = this.y;
      out.hw = r;
      out.hh = r * 0.75;
      return;
    }
    const h = this.crouching ? T.hurtH * T.crouchHeightFactor : T.hurtH;
    out.hw = T.hurtW / 2;
    out.hh = h / 2;
    out.x = this.x;
    out.y = this.y - h / 2 - 2;
  }

  parryBox(out: { x: number; y: number; hw: number; hh: number }): void {
    if (this.mode === 'plane') {
      out.x = this.x;
      out.y = this.y;
      out.hw = out.hh = PLANE_TUNING.parryR;
      return;
    }
    out.hw = T.parryW / 2;
    out.hh = T.parryH / 2;
    out.x = this.x;
    out.y = this.y - T.bodyH / 2;
  }

  get parryActive(): boolean {
    return this.parryTicks > 0;
  }

  // ---------------------------------------------------------------------------------------------
  // Dano / morte / parry

  /** Retorna true se o dano foi aplicado. */
  hurt(host: SimHost): boolean {
    if (!this.alive || this.invulnerable) return false;
    if (this.firstHitFree) {
      this.firstHitFree = false;
      this.invuln = secToTicks(T.invulnTime);
      host.events.push('luckyBlock', this.x, this.y - 80, 0, 0, this.index);
      host.requestHitstop(T.hurtHitstopTicks);
      return false;
    }
    this.hp--;
    this.stats.damageTaken++;
    this.invuln = secToTicks(T.invulnTime);
    this.parryTicks = 0;
    host.requestHitstop(T.hurtHitstopTicks);
    host.events.push('playerHurt', this.x, this.y - 70, this.hp, 0, this.index);
    host.events.push('shake', 0, 0, 0.35);
    if (this.hp <= 0) {
      this.die(host);
    } else if (this.mode === 'ground') {
      this.vy = -T.hurtKnockback;
      this.grounded = false;
      this.jumping = false;
      this.dashTicks = 0;
      this.hurtTicks = 12;
      if (this.state !== 'super') this.setState('hurt');
    } else {
      this.hurtTicks = 12;
    }
    return true;
  }

  die(host: SimHost): void {
    this.hp = 0;
    this.forceState('dead');
    this.deathTicks = secToTicks(T.deathTime);
    this.vx = 0;
    this.vy = 0;
    this.superTicks = 0;
    this.superInvuln = 0;
    this.cloneTicks = 0;
    this.parryTicks = 0;
    host.events.push('playerDie', this.x, this.y - 60, 0, 0, this.index);
  }

  revive(host: SimHost): void {
    this.hp = 1;
    this.invuln = secToTicks(T.invulnTime);
    this.forceState(this.mode === 'plane' ? 'idle' : 'fall');
    this.vy = 0;
    this.grounded = false;
    this.airDash = true;
    host.events.push('playerRevive', this.x, this.y - 60, 0, 0, this.index);
  }

  /** Sucesso de parry (chamado pelo mundo ao detectar sobreposição com objeto ciano). */
  parrySuccess(host: SimHost): void {
    this.parryTicks = 0;
    this.parryUsed = false;
    this.airDash = true;
    this.stats.parries++;
    this.addMeter(METER.perCard, host);
    host.requestHitstop(T.parryHitstopTicks);
    host.events.push('parry', this.x, this.y - 70, 0, 0, this.index);
    if (this.mode === 'ground') {
      this.vy = -T.parryBounce;
      this.jumping = false;
      this.grounded = false;
      this.forceState('jump');
    } else {
      this.planeParryCooldown = PLANE_TUNING.parryCooldownTicks;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Update

  update(input: InputFrame, host: SimHost): void {
    this.px = this.x;
    this.py = this.y;
    this.stateTicks++;
    if (this.invuln > 0) this.invuln--;
    if (this.superInvuln > 0) this.superInvuln--;
    if (this.hurtTicks > 0) this.hurtTicks--;
    if (this.recoil > 0) this.recoil--;
    if (this.cloneTicks > 0) {
      this.cloneTicks--;
      this.cloneX += (this.x - this.facing * 110 - this.cloneX) * 0.25;
      this.cloneY += (this.y - 40 - this.cloneY) * 0.25;
    }

    switch (this.state) {
      case 'dead':
        this.deathTicks--;
        if (this.deathTicks <= 0) {
          this.forceState('ghost');
          this.ghostBaseX = this.x;
          this.y -= 60;
        }
        return;
      case 'ghost':
        this.y -= T.ghostRiseSpeed * DT;
        this.x = this.ghostBaseX + Math.sin((this.stateTicks / TICK_RATE) * T.ghostSwaySpeed * Math.PI) * 60;
        if (this.y < -140) {
          this.forceState('out');
          host.events.push('ghostOut', this.x, 0, 0, 0, this.index);
        }
        return;
      case 'out':
        return;
      case 'victory':
        this.vx = 0;
        if (this.mode === 'ground') this.applyGroundPhysics(host);
        return;
      case 'intro':
        if (this.stateTicks > 30) this.forceState(this.mode === 'plane' ? 'idle' : 'idle');
        if (this.mode === 'ground') this.applyGroundPhysics(host);
        return;
      default:
        break;
    }

    if (this.mode === 'plane') {
      this.updatePlane(input, host);
    } else {
      this.updateGround(input, host);
    }
  }

  private updateGround(input: InputFrame, host: SimHost): void {
    const left = input.held(Btn.Left);
    const right = input.held(Btn.Right);
    const up = input.held(Btn.Up);
    const down = input.held(Btn.Down) || input.held(Btn.Crouch);
    let dirX = (right ? 1 : 0) - (left ? 1 : 0);

    this.jumpBuffer.tick();
    this.dashBuffer.tick();
    this.parryBufferAfterDash.tick();
    if (this.parryTicks > 0) this.parryTicks--;

    if (input.pressed(Btn.Jump)) this.jumpBuffer.push();
    if (input.pressed(Btn.Dash) && this.canDash) this.dashBuffer.push();

    // --- super em andamento
    if (this.superTicks > 0) {
      this.superTicks--;
      const kind = this.loadout.superId;
      if (kind === 'chamaMestra') {
        // ancorado disparando o raio
        this.vx = 0;
        this.vy = this.grounded ? this.vy : 0;
        this.applyGroundPhysics(host);
        if (this.superTicks <= 0) this.endSuper(host);
        return;
      }
      if (this.superTicks <= 0) this.endSuper(host);
    }

    // --- EX: breve pausa de recuo
    if (this.exTicks > 0) {
      this.exTicks--;
      this.vx = approach(this.vx, 0, T.runSpeed / T.decelTicks);
      if (!this.grounded) this.vy = Math.min(this.vy, 60);
      this.applyGroundPhysics(host);
      if (this.exTicks === 0) this.setState(this.grounded ? 'idle' : 'fall');
      return;
    }

    // --- dash
    if (this.state === 'dash') {
      this.stepDash(input, host);
      return;
    }

    // --- lock e agachar
    this.locked = input.held(Btn.Lock);
    this.crouching = this.grounded && down && !this.locked;

    // Início de dash (move já neste tick: sem latência extra)
    if (this.dashBuffer.active && (this.grounded || this.airDash) && this.canDash) {
      this.dashBuffer.consume();
      if (dirX !== 0) this.facing = dirX > 0 ? 1 : -1;
      this.dashDir = this.facing;
      this.dashTicks = Math.round(T.dashTime * TICK_RATE);
      if (!this.grounded) this.airDash = false;
      this.jumping = false;
      this.crouching = false;
      this.locked = false;
      this.parryTicks = 0;
      this.forceState('dash');
      host.events.push('dash', this.x, this.y, this.dashDir, 0, this.index);
      this.vy = 0;
      this.stepDash(input, host);
      return;
    }
    this.updateGroundControl(input, host, dirX, up, down);
  }

  private stepDash(input: InputFrame, host: SimHost): void {
    {
      this.dashTicks--;
      if (input.pressed(Btn.Jump) && !this.grounded) this.parryBufferAfterDash.push();
      this.vx = (this.dashDir * T.dashDistance) / T.dashTime;
      this.vy = 0;
      this.moveAndCollide(host, this.vx * DT, 0);
      this.clampToBounds(host);
      if (this.dashTicks <= 0) {
        this.vx = this.dashDir * T.runSpeed;
        this.checkGround(host);
        this.forceState(this.grounded ? 'idle' : 'fall');
        if (!this.grounded && this.parryBufferAfterDash.consume() && !this.parryUsed && this.canParry) {
          this.startParry(host);
        }
      }
    }
  }

  private updateGroundControl(input: InputFrame, host: SimHost, dirXIn: number, up: boolean, down: boolean): void {
    let dirX = dirXIn;
    const left = input.held(Btn.Left);
    const right = input.held(Btn.Right);

    // Pulo / parry / descer de plataforma
    if (this.jumpBuffer.active) {
      if (this.grounded && down && this.onPlatform !== 0 && !this.locked) {
        this.jumpBuffer.consume();
        this.dropThrough = 10;
        this.grounded = false;
        this.onPlatform = 0;
        this.y += 2;
        this.setState('fall');
      } else if (this.grounded || this.coyote > 0) {
        this.jumpBuffer.consume();
        this.vy = -this.jumpV;
        this.grounded = false;
        this.coyote = 0;
        this.jumping = true;
        this.onPlatform = 0;
        this.crouching = false;
        this.setState('jump');
        host.events.push('jump', this.x, this.y, 0, 0, this.index);
      } else if (input.pressed(Btn.Jump) && !this.parryUsed && this.canParry) {
        this.startParry(host);
      }
    }

    // Corte do pulo variável
    if (this.jumping && !input.held(Btn.Jump) && this.vy < -this.jumpCutV) {
      this.vy = -this.jumpCutV;
      this.jumping = false;
    }
    if (this.vy >= 0) this.jumping = false;

    // Movimento horizontal
    if (this.locked || this.crouching) dirX = this.locked || this.grounded ? 0 : dirX;
    const lockInput = (right ? 1 : 0) - (left ? 1 : 0);
    if ((this.locked || this.crouching) && lockInput !== 0) this.facing = lockInput > 0 ? 1 : -1;
    if (dirX !== 0) {
      if (dirX !== this.facing && this.grounded) host.events.push('turn', this.x, this.y, dirX, 0, this.index);
      this.facing = dirX > 0 ? 1 : -1;
    }
    const target = dirX * T.runSpeed;
    const step = T.runSpeed / (dirX !== 0 ? T.accelTicks : T.decelTicks);
    this.vx = approach(this.vx, target, step);
    if (this.hurtTicks > 0) this.vx *= 0.6;

    // Mira
    this.aim = this.computeAim(dirX, up, down, lockInput);

    this.applyGroundPhysics(host);

    // Estado de locomoção
    if (this.state !== 'hurt' || this.hurtTicks === 0) {
      if (this.grounded) {
        if (this.locked) this.setState('lock');
        else if (this.crouching) this.setState('crouch');
        else if (Math.abs(this.vx) > 1) this.setState('run');
        else this.setState('idle');
      } else if (this.parryTicks > 0) {
        this.setState('parry');
      } else if (this.state !== 'parry' || this.stateTicks > 14) {
        this.setState(this.vy < 0 ? 'jump' : 'fall');
      }
    }

    // Tiro, EX, super, troca
    if (input.pressed(Btn.Swap)) {
      this.activeWeapon = this.activeWeapon === 0 ? 1 : 0;
      this.weapon.reset();
      host.events.push('swapWeapon', this.x, this.y, this.activeWeapon, 0, this.index);
    }
    if (input.pressed(Btn.Ex) && this.canEx) {
      if (this.cards >= METER.cards) {
        this.startSuper(host);
        return;
      } else if (this.cards >= 1) {
        this.meter -= METER.perCard;
        this.stats.cardsUsed++;
        this.exTicks = secToTicks(T.exTime);
        this.forceState('ex');
        fireEx(this, host);
        host.events.push('ex', this.x, this.y, this.aim, 0, this.index);
        return;
      }
    }
    const shooting = (input.held(Btn.Shoot) || this.autoFire) && this.canShoot;
    updateWeapon(this, host, shooting);
  }

  private computeAim(dirX: number, up: boolean, down: boolean, lockInput: number): number {
    const f = this.facing;
    const fwd = f > 0 ? 0 : 4;
    if (this.locked) {
      const dx = lockInput;
      if (up && dx !== 0) return dx > 0 ? 7 : 5;
      if (up) return 6;
      if (down && dx !== 0) return dx > 0 ? 1 : 3;
      if (down) return f > 0 ? 1 : 3;
      return fwd;
    }
    if (this.grounded) {
      if (this.crouching) return fwd;
      if (up && dirX !== 0) return dirX > 0 ? 7 : 5;
      if (up) return 6;
      return fwd;
    }
    // no ar: 8 direções
    if (up && dirX !== 0) return dirX > 0 ? 7 : 5;
    if (down && dirX !== 0) return dirX > 0 ? 1 : 3;
    if (up) return 6;
    if (down) return 2;
    return fwd;
  }

  private startParry(host: SimHost): void {
    this.parryTicks = T.parryWindowTicks;
    this.parryUsed = true;
    this.forceState('parry');
    host.events.push('parryFail', this.x, this.y, 0, 0, this.index);
  }

  private startSuper(host: SimHost): void {
    const id = this.loadout.superId;
    this.meter = 0;
    this.stats.cardsUsed += METER.cards;
    const freeze = secToTicks(T.superFreezeTime);
    host.requestSuperFreeze(freeze);
    this.superKind = id;
    this.forceState('super');
    host.events.push('super', this.x, this.y, 0, 0, this.index, id);
    if (id === 'chamaMestra') {
      this.superTicks = secToTicks(1.5);
      this.superInvuln = this.superTicks + freeze + 6;
    } else if (id === 'pavioLongo') {
      this.superTicks = secToTicks(3);
      this.superInvuln = this.superTicks + freeze;
    } else {
      this.superTicks = secToTicks(5);
      this.superInvuln = freeze + 6;
      this.cloneTicks = this.superTicks;
      this.cloneX = this.x - this.facing * 110;
      this.cloneY = this.y - 40;
    }
  }

  private endSuper(host: SimHost): void {
    this.superTicks = 0;
    this.superKind = null;
    host.events.push('superEnd', this.x, this.y, 0, 0, this.index);
    if (this.mode === 'ground') this.forceState(this.grounded ? 'idle' : 'fall');
    else this.forceState('idle');
  }

  /** Superpoderes ativos: consultado pelo mundo para aplicar dano. */
  get beamActive(): boolean {
    return this.superTicks > 0 && this.superKind === 'chamaMestra';
  }

  get auraActive(): boolean {
    return this.superTicks > 0 && this.superKind === 'pavioLongo';
  }

  private applyGroundPhysics(host: SimHost): void {
    // gravidade assimétrica: desce mais rápido do que sobe
    const g = this.vy < 0 ? this.gUp : this.gDown;
    this.vy = Math.min(this.vy + g * DT, T.terminalFall);
    const wasGrounded = this.grounded;
    this.moveAndCollide(host, this.vx * DT, this.vy * DT);
    this.clampToBounds(host);
    if (!this.grounded && wasGrounded && this.vy >= 0) {
      this.coyote = T.coyoteTicks;
    } else if (this.coyote > 0 && !this.grounded) {
      this.coyote--;
    }
    if (this.grounded) {
      this.coyote = 0;
      this.airDash = true;
      this.parryUsed = false;
      this.parryTicks = 0;
      if (!wasGrounded) host.events.push('land', this.x, this.y, 0, 0, this.index);
    }
    if (this.dropThrough > 0) this.dropThrough--;
    // fosso
    if (this.y > host.geo.killY) this.fallIntoPit(host);
  }

  /** Queda em fosso: perde 1 de vida (a Cartola absorve) e reaparece na última posição segura. */
  private fallIntoPit(host: SimHost): void {
    host.events.push('fell', this.x, host.geo.killY, 0, 0, this.index);
    this.fellCount++;
    if (this.superInvuln === 0 && !host.invincible) {
      if (this.firstHitFree) {
        this.firstHitFree = false;
        host.events.push('luckyBlock', this.x, this.y - 80, 0, 0, this.index);
      } else {
        this.hp--;
        this.stats.damageTaken++;
        host.events.push('playerHurt', this.x, this.y - 70, this.hp, 0, this.index);
      }
    }
    this.x = this.px = this.lastSafeX;
    this.y = this.py = this.lastSafeY - 4;
    this.vx = 0;
    this.vy = 0;
    this.dashTicks = 0;
    if (this.hp <= 0) {
      this.die(host);
      return;
    }
    this.invuln = secToTicks(T.fallRespawnInvuln);
    this.forceState('fall');
  }

  private moveAndCollide(host: SimHost, dx: number, dy: number): void {
    const geo = host.geo;
    const hw = T.bodyW / 2;
    // horizontal: sólidos
    this.x += dx;
    for (const s of geo.solids) {
      const top = this.y - T.bodyH;
      if (this.y > s.y + 1 && top < s.y + s.h && this.x + hw > s.x && this.x - hw < s.x + s.w) {
        if (dx > 0) this.x = s.x - hw;
        else if (dx < 0) this.x = s.x + s.w + hw;
      }
    }
    // vertical
    const prevFeet = this.y;
    // carregar com plataforma móvel
    if (this.grounded && this.onPlatform !== 0) {
      for (const p of geo.platforms) {
        if (p.id === this.onPlatform && p.active) {
          this.x += p.dx;
          this.y += p.dy;
          break;
        }
      }
    }
    this.y += dy;
    this.grounded = false;
    let landedPlatform = 0;
    if (this.vy >= 0) {
      // chão contínuo
      if (geo.hasFloor && this.y >= geo.floorY) {
        this.y = geo.floorY;
        this.grounded = true;
      }
      for (const s of geo.solids) {
        if (this.x + hw > s.x && this.x - hw < s.x + s.w && prevFeet <= s.y + 1 + Math.max(0, dy) && this.y >= s.y) {
          if (prevFeet <= s.y + 2) {
            this.y = s.y;
            this.grounded = true;
          }
        }
      }
      if (this.dropThrough === 0) {
        for (const p of geo.platforms) {
          if (!p.active) continue;
          const prevTop = p.py;
          if (this.x + hw * 0.6 > p.x && this.x - hw * 0.6 < p.x + p.w && prevFeet <= prevTop + 2 + Math.max(0, p.dy) && this.y >= p.y) {
            this.y = p.y;
            this.grounded = true;
            landedPlatform = p.id;
            if (p.fallDelay > 0 && p.fallTimer < 0) p.fallTimer = p.fallDelay;
          }
        }
      }
    } else {
      // teto de sólidos
      for (const s of geo.solids) {
        const top = this.y - T.bodyH;
        if (this.x + hw > s.x && this.x - hw < s.x + s.w && top < s.y + s.h && prevFeet - T.bodyH >= s.y + s.h - 1) {
          this.y = s.y + s.h + T.bodyH;
          this.vy = 0;
        }
      }
    }
    this.onPlatform = landedPlatform;
    if (this.grounded) {
      if (this.vy > 0) this.vy = 0;
      // posição segura: longe da borda do bloco atual
      if (landedPlatform === 0 || this.isStablePlatform(host, landedPlatform)) {
        const ground = geo.groundTopAt(this.x - 60, 2, this.y) === this.y && geo.groundTopAt(this.x + 60, 2, this.y) === this.y;
        if (ground || landedPlatform !== 0) {
          this.lastSafeX = this.x;
          this.lastSafeY = this.y;
        }
      }
    }
  }

  private isStablePlatform(host: SimHost, id: number): boolean {
    for (const p of host.geo.platforms) {
      if (p.id === id) return p.fallDelay < 0 && p.life < 0 && p.movePeriod === 0;
    }
    return false;
  }

  private checkGround(host: SimHost): void {
    const geo = host.geo;
    if (geo.hasFloor && this.y >= geo.floorY - 0.5) {
      this.grounded = true;
      return;
    }
    const top = geo.groundTopAt(this.x, T.bodyW / 2, this.y);
    this.grounded = Math.abs(top - this.y) < 0.5;
    if (!this.grounded) {
      for (const p of geo.platforms) {
        if (p.active && this.x > p.x && this.x < p.x + p.w && Math.abs(p.y - this.y) < 0.5) {
          this.grounded = true;
          this.onPlatform = p.id;
        }
      }
    }
  }

  private clampToBounds(host: SimHost): void {
    const hw = T.bodyW / 2 + T.edgeMargin;
    const lo = Math.max(host.geo.left, host.viewLeft) + hw;
    const hi = Math.min(host.geo.right, host.viewRight) - hw;
    if (this.x < lo) {
      this.x = lo;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > hi) {
      this.x = hi;
      if (this.vx > 0) this.vx = 0;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Avião de papel

  private updatePlane(input: InputFrame, host: SimHost): void {
    const dx = (input.held(Btn.Right) ? 1 : 0) - (input.held(Btn.Left) ? 1 : 0);
    const dy = (input.held(Btn.Down) ? 1 : 0) - (input.held(Btn.Up) ? 1 : 0);
    this.shrunk = input.held(Btn.Dash);
    const speed = this.shrunk ? PLANE_TUNING.shrinkSpeed : PLANE_TUNING.speed;
    const len = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1;
    this.vx = dx * speed * len;
    this.vy = dy * speed * len;
    this.x += this.vx * DT;
    this.y += this.vy * DT;
    this.x = clamp(this.x, host.viewLeft + 60, host.viewRight - 60);
    this.y = clamp(this.y, 70, 1010);
    this.facing = 1;
    this.aim = 0;
    if (this.parryTicks > 0) this.parryTicks--;
    if (this.planeParryCooldown > 0) this.planeParryCooldown--;
    if (input.pressed(Btn.Jump) && this.planeParryCooldown === 0 && this.canParry) {
      this.parryTicks = PLANE_TUNING.parryWindowTicks;
      this.planeParryCooldown = PLANE_TUNING.parryCooldownTicks;
      host.events.push('parryFail', this.x, this.y, 0, 0, this.index);
    }
    if (this.superTicks > 0) {
      this.superTicks--;
      if (this.superTicks <= 0) this.endSuper(host);
    }
    if (input.pressed(Btn.Swap)) {
      this.planeWeapon = this.planeWeapon === 'shot' ? 'bomb' : 'shot';
      this.weapon.reset();
      host.events.push('swapWeapon', this.x, this.y, this.planeWeapon === 'shot' ? 0 : 1, 0, this.index);
    }
    if (input.pressed(Btn.Ex) && this.canEx) {
      if (this.cards >= METER.cards) {
        this.startSuper(host);
      } else if (this.cards >= 1) {
        this.meter -= METER.perCard;
        this.stats.cardsUsed++;
        fireEx(this, host);
        host.events.push('ex', this.x, this.y, 0, 0, this.index);
      }
    }
    this.setState(dx !== 0 || dy !== 0 ? 'run' : 'idle');
    updateWeapon(this, host, (input.held(Btn.Shoot) || this.autoFire) && this.canShoot);
  }

  /** Direção de mira como vetor unitário. */
  aimVector(): readonly [number, number] {
    return DIR8[this.aim] ?? [1, 0];
  }
}
