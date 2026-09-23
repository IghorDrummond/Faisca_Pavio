import type { BattleSim, HitTarget, ParryTarget, StageModule } from '../battle';
import type { Aabb } from '../geom';
import { METER } from '../../data/tuning';

export type TutorialGoal = 'walk' | 'jump' | 'crouch' | 'shoot' | 'aim' | 'dash' | 'parry' | 'ex' | 'super';

export interface Station {
  goal: TutorialGoal;
  signX: number;
  /** texto da placa; {btn:ação} é trocado pelo botão do dispositivo em uso */
  text: string;
  gateX: number;
  done: boolean;
  progress: number;
}

export interface Dummy {
  target: HitTarget;
  hp: number;
  maxHp: number;
  station: number;
  exOnly: boolean;
  superOnly: boolean;
  flash: number;
  y: number;
}

export const TUTORIAL_LENGTH = 7600;

/** ENSAIO GERAL: andar → pular → agachar → atirar → mirar/lock → dash → parry → EX → super. */
export class TutorialModule implements StageModule {
  readonly scrolling = true;
  stations: Station[] = [];
  dummies: Dummy[] = [];
  stars: { pt: ParryTarget; alive: boolean; baseY: number }[] = [];
  camX = 0;
  current = 0;
  complete = false;
  private crouchTicks = 0;
  private lastEx = false;
  maxX = 0;

  reset(sim: BattleSim): void {
    this.complete = false;
    this.current = 0;
    this.camX = 0;
    this.maxX = 0;
    this.crouchTicks = 0;
    sim.invincible = true; // ensaio: ninguém se machuca
    const F = 900;
    sim.geo.reset(F, 0, TUTORIAL_LENGTH, false);
    // chão com o fosso da estação do dash
    sim.geo.solids.push({ x: 0, y: F, w: 4420, h: 400 }, { x: 4900, y: F, w: TUTORIAL_LENGTH - 4900, h: 400 });
    // obstáculos de pulo
    sim.geo.solids.push({ x: 1180, y: F - 100, w: 90, h: 100 }, { x: 1560, y: F - 210, w: 110, h: 210 });
    sim.geo.killY = F + 350;
    this.stations = [
      { goal: 'walk', signX: 300, text: 'Ande com {btn:left} {btn:right}', gateX: 0, done: false, progress: 0 },
      { goal: 'jump', signX: 900, text: 'Pule com {btn:jump} — segure para pular mais alto', gateX: 0, done: false, progress: 0 },
      { goal: 'crouch', signX: 1950, text: 'Agache segurando {btn:down}', gateX: 2350, done: false, progress: 0 },
      { goal: 'shoot', signX: 2600, text: 'Atire com {btn:shoot}', gateX: 3250, done: false, progress: 0 },
      { goal: 'aim', signX: 3450, text: 'Segure {btn:lock} para mirar parado e acerte o alvo alto', gateX: 4050, done: false, progress: 0 },
      { goal: 'dash', signX: 4150, text: 'Pule e use {btn:dash} no ar para cruzar o fosso', gateX: 0, done: false, progress: 0 },
      { goal: 'parry', signX: 5150, text: 'PARRY: pule e aperte {btn:jump} DE NOVO encostando nas estrelas azul-elétricas', gateX: 5800, done: false, progress: 0 },
      { goal: 'ex', signX: 6000, text: 'Com 1 carta, aperte {btn:ex} para um tiro EX', gateX: 6650, done: false, progress: 0 },
      { goal: 'super', signX: 6800, text: 'Com 5 cartas, {btn:ex} solta o SUPER: Chama Mestra!', gateX: 0, done: false, progress: 0 },
    ];
    for (const st of this.stations) if (st.gateX) sim.geo.solids.push({ x: st.gateX, y: F - 1000, w: 40, h: 1000 });
    const mk = (x: number, y: number, hp: number, station: number, exOnly = false, superOnly = false): Dummy => ({
      target: { tid: 900000 + station * 10 + this.dummies.length, x, y, hw: 50, hh: 70, mult: 1, alive: true, owner: 'dummy', bodyId: '', contact: false, ref: null },
      hp,
      maxHp: hp,
      station,
      exOnly,
      superOnly,
      flash: 0,
      y,
    });
    this.dummies = [];
    this.dummies.push(mk(3100, F - 70, 40, 3));
    this.dummies.push(mk(3850, F - 520, 30, 4));
    this.dummies.push(mk(6450, F - 70, 1, 7, true));
    this.dummies.push(mk(7300, F - 90, 120, 8, false, true));
    for (const d of this.dummies) d.target.ref = d;
    this.stars = [0, 1, 2].map((i) => ({ pt: { x: 5320 + i * 170, y: F - 230, r: 40, onParry: () => this.onStar(i) }, alive: true, baseY: F - 230 }));
    sim.viewLeft = 0;
    sim.viewRight = 1920;
  }

  private onStar(i: number): void {
    const s = this.stars[i];
    if (s) s.alive = false;
  }

  private openGate(sim: BattleSim, st: Station): void {
    st.done = true;
    if (st.gateX) {
      const idx = sim.geo.solids.findIndex((s) => s.x === st.gateX && s.w === 40);
      if (idx >= 0) sim.geo.solids.splice(idx, 1);
    }
    sim.events.push('sound', st.gateX || st.signX, 700, 0, 0, -1, 'chime');
  }

  update(sim: BattleSim): void {
    const p = sim.players[0]!;
    let lead = 0;
    for (const q of sim.players) if (q.joined && q.alive) lead = Math.max(lead, q.x);
    this.maxX = Math.max(this.maxX, lead);
    const target = Math.max(this.camX, Math.min(TUTORIAL_LENGTH - 1920, lead - 760));
    this.camX += (target - this.camX) * 0.12;
    sim.viewLeft = this.camX;
    sim.viewRight = this.camX + 1920;
    for (const d of this.dummies) if (d.flash > 0) d.flash--;
    for (const s of this.stars) s.pt.y = s.baseY + Math.sin(sim.tick * 0.05 + s.pt.x) * 10;
    // avança estação corrente
    this.current = this.stations.findIndex((s) => !s.done);
    if (this.current < 0) return;
    const st = this.stations[this.current]!;
    switch (st.goal) {
      case 'walk':
        if (p.x > 700) this.openGate(sim, st);
        break;
      case 'jump':
        if (p.x > 1700) this.openGate(sim, st);
        break;
      case 'crouch':
        if (p.x > st.signX - 200 && p.crouching) this.crouchTicks++;
        st.progress = Math.min(1, this.crouchTicks / 45);
        if (this.crouchTicks >= 45) this.openGate(sim, st);
        break;
      case 'shoot':
      case 'aim':
      case 'super': {
        const d = this.dummies.find((x) => x.station === this.current);
        if (st.goal === 'super' && p.x > st.signX - 300 && p.meter < METER.cards * METER.perCard && p.superTicks === 0 && d && d.hp > 0) p.meter = METER.cards * METER.perCard;
        if (d && d.hp <= 0) {
          this.openGate(sim, st);
          if (st.goal === 'super') this.complete = true;
        }
        break;
      }
      case 'dash':
        if (p.x > 4950 && p.grounded) this.openGate(sim, st);
        break;
      case 'parry':
        st.progress = this.stars.filter((s) => !s.alive).length / this.stars.length;
        if (this.stars.every((s) => !s.alive)) this.openGate(sim, st);
        // estrelas voltam se o jogador cair sem completar
        break;
      case 'ex': {
        const d = this.dummies.find((x) => x.station === 7);
        if (p.x > st.signX - 300 && p.cards < 1 && p.exTicks === 0) p.meter = Math.max(p.meter, METER.perCard);
        if (d && d.hp <= 0) this.openGate(sim, st);
        break;
      }
    }
    this.lastEx = p.exTicks > 0;
  }

  collectTargets(_sim: BattleSim, out: HitTarget[]): void {
    for (const d of this.dummies) {
      d.target.alive = d.hp > 0;
      if (d.target.alive) out.push(d.target);
    }
  }

  collectParryables(_sim: BattleSim, out: ParryTarget[]): void {
    for (const s of this.stars) if (s.alive) out.push(s.pt);
  }

  onHit(sim: BattleSim, t: HitTarget, damage: number, owner: number, isEx: boolean): void {
    const d = t.ref as Dummy;
    if (!d || d.hp <= 0) return;
    const p = sim.players[owner];
    // alvo do EX só cai com EX; o do super só com o super
    if (d.exOnly && !isEx) {
      d.flash = 2;
      return;
    }
    if (d.superOnly && !(p && p.superTicks > 0)) {
      d.flash = 2;
      return;
    }
    d.hp -= damage;
    d.flash = 3;
    sim.events.push('hitEnemy', t.x, t.y, damage, 0, owner, 'dummy');
    if (d.hp <= 0) sim.events.push('enemyDie', t.x, t.y, 0, 0, owner, 'dummy');
  }

  playerContact(_sim: BattleSim, _b: Aabb): boolean {
    return false;
  }

  isComplete(): boolean {
    return this.complete;
  }

  progress(): number {
    return this.stations.filter((s) => s.done).length / this.stations.length;
  }

  /** Moedas do tutorial (2), creditadas na conclusão. */
  collectedCoins(): string[] {
    return this.complete ? ['tutorial:c1', 'tutorial:c2'] : [];
  }
}
