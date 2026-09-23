/**
 * Pools de projéteis pré-alocados (sem alocação durante o combate).
 * Posições anteriores (px, py) permitem interpolação na renderização e varredura contínua.
 */

export const Motion = {
  Linear: 0,
  Sine: 1,
  Homing: 2,
  Boomerang: 3,
} as const;
export type Motion = (typeof Motion)[keyof typeof Motion];

export class EnemyProjectile {
  active = false;
  id = 0;
  x = 0;
  y = 0;
  px = 0;
  py = 0;
  vx = 0;
  vy = 0;
  gravity = 0;
  r = 10;
  kind = '';
  parry = false;
  warn = 0;
  warnTotal = 0;
  life = 0;
  age = 0;
  motion: Motion = Motion.Linear;
  // seno
  baseX = 0;
  baseY = 0;
  dirX = 0;
  dirY = 0;
  sineAmp = 0;
  sineFreq = 0;
  // perseguição / bumerangue
  turn = 0;
  homingLeft = 0;
  boomerangAt = 0;
  speed = 0;
  bounces = 0;
  floorKill = true;
  rolling = false;
  spin = 0;
  angle = 0;
  /** avisos de fora da tela */
  offscreenWarn = false;
  /** gerado com aviso de sombra (chuva) */
  shadow = false;
  targetPlayer = 0;
}

export class PlayerProjectile {
  active = false;
  id = 0;
  owner = 0;
  x = 0;
  y = 0;
  px = 0;
  py = 0;
  vx = 0;
  vy = 0;
  r = 10;
  damage = 0;
  travel = 0;
  range = Infinity;
  kind = '';
  homingTurn = 0;
  pierce = 0;
  lastHit = -1;
  hitCooldown = 0;
  explosionRadius = 0;
  splitCount = 0;
  life = 0;
  isEx = false;
  meterGain = 0;
  angle = 0;
  gravity = 0;
}

export class Pool<T extends { active: boolean; id: number }> {
  readonly items: T[] = [];
  private cursor = 0;
  private nextId = 1;
  activeCount = 0;
  private readonly factory: () => T;
  private readonly maxCapacity: number;

  constructor(factory: () => T, capacity: number, maxCapacity: number) {
    this.factory = factory;
    this.maxCapacity = maxCapacity;
    for (let i = 0; i < capacity; i++) this.items.push(factory());
  }

  /** Obtém um item livre; retorna null se o limite global for atingido. */
  spawn(): T | null {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      const idx = (this.cursor + k) % n;
      const it = this.items[idx] as T;
      if (!it.active) {
        this.cursor = (idx + 1) % n;
        it.active = true;
        it.id = this.nextId++;
        this.activeCount++;
        return it;
      }
    }
    if (n < this.maxCapacity) {
      const it = this.factory();
      it.active = true;
      it.id = this.nextId++;
      this.items.push(it);
      this.activeCount++;
      return it;
    }
    return null;
  }

  kill(it: T): void {
    if (it.active) {
      it.active = false;
      this.activeCount--;
    }
  }

  clear(): void {
    for (const it of this.items) it.active = false;
    this.activeCount = 0;
  }
}
