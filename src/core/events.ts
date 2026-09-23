/**
 * Eventos emitidos pela simulação a cada tick (sons, efeitos, UI).
 * Armazenados em pool pré-alocado para não gerar lixo no caminho quente.
 */
export type SimEventType =
  | 'shoot'
  | 'hitBoss'
  | 'hitEnemy'
  | 'projDie'
  | 'playerHurt'
  | 'playerDie'
  | 'playerRevive'
  | 'parry'
  | 'parryFail'
  | 'jump'
  | 'land'
  | 'dash'
  | 'ex'
  | 'super'
  | 'superEnd'
  | 'meterCard'
  | 'bossPhase'
  | 'bossKnockout'
  | 'attackStart'
  | 'warn'
  | 'shake'
  | 'sound'
  | 'explosion'
  | 'enemyDie'
  | 'coin'
  | 'music'
  | 'fell'
  | 'luckyBlock'
  | 'turn'
  | 'victory'
  | 'defeat'
  | 'swapWeapon'
  | 'ghostOut';

export class SimEvent {
  type: SimEventType = 'sound';
  x = 0;
  y = 0;
  a = 0;
  b = 0;
  player = -1;
  str = '';
}

export class EventQueue {
  private pool: SimEvent[] = [];
  private count = 0;

  constructor(capacity = 256) {
    for (let i = 0; i < capacity; i++) this.pool.push(new SimEvent());
  }

  push(type: SimEventType, x = 0, y = 0, a = 0, b = 0, player = -1, str = ''): void {
    let e = this.pool[this.count];
    if (!e) {
      e = new SimEvent();
      this.pool.push(e);
    }
    e.type = type;
    e.x = x;
    e.y = y;
    e.a = a;
    e.b = b;
    e.player = player;
    e.str = str;
    this.count++;
  }

  get length(): number {
    return this.count;
  }

  get(i: number): SimEvent {
    // i < length garantido pelo chamador
    return this.pool[i] as SimEvent;
  }

  clear(): void {
    this.count = 0;
  }
}
