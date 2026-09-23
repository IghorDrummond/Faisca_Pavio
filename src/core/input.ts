/**
 * Representação de input independente de dispositivo, lida pela simulação a cada tick.
 * A camada PLATFORM converte teclado/controle neste formato.
 */
export const Btn = {
  Left: 1 << 0,
  Right: 1 << 1,
  Up: 1 << 2,
  Down: 1 << 3,
  Jump: 1 << 4,
  Shoot: 1 << 5,
  Dash: 1 << 6,
  Lock: 1 << 7,
  Ex: 1 << 8,
  Swap: 1 << 9,
  Pause: 1 << 10,
  Crouch: 1 << 11, // gerado pelo toggle de agachar (acessibilidade)
} as const;

export type BtnName = keyof typeof Btn;
export const BTN_NAMES = Object.keys(Btn) as BtnName[];

/**
 * Estado de input de um jogador em um tick.
 * `feed` é chamado todo tick com o estado bruto; bordas de "pressionar" são acumuladas
 * até serem consumidas por `latch` (assim nenhum toque se perde durante hit stop).
 */
export class InputFrame {
  buttons = 0;
  private pressedMask = 0;
  private releasedMask = 0;
  private lastRaw = 0;
  private pressedAcc = 0;
  private releasedAcc = 0;

  feed(raw: number): void {
    this.pressedAcc |= raw & ~this.lastRaw;
    this.releasedAcc |= ~raw & this.lastRaw;
    this.lastRaw = raw;
  }

  /** Fixa o estado para o tick da simulação que vai rodar. */
  latch(): void {
    this.buttons = this.lastRaw;
    this.pressedMask = this.pressedAcc;
    this.releasedMask = this.releasedAcc;
    this.pressedAcc = 0;
    this.releasedAcc = 0;
  }

  /** Atalho para testes: alimenta e fixa no mesmo tick. */
  set(raw: number): void {
    this.feed(raw);
    this.latch();
  }

  held(b: number): boolean {
    return (this.buttons & b) !== 0;
  }

  pressed(b: number): boolean {
    return (this.pressedMask & b) !== 0;
  }

  released(b: number): boolean {
    return (this.releasedMask & b) !== 0;
  }

  reset(): void {
    this.buttons = 0;
    this.pressedMask = 0;
    this.releasedMask = 0;
    this.lastRaw = 0;
    this.pressedAcc = 0;
    this.releasedAcc = 0;
  }
}

/** 8 direções + neutro. Índice 0 = direita, sentido horário na tela (y para baixo). */
export const DIR8: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [Math.SQRT1_2, Math.SQRT1_2],
  [0, 1],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [-1, 0],
  [-Math.SQRT1_2, -Math.SQRT1_2],
  [0, -1],
  [Math.SQRT1_2, -Math.SQRT1_2],
];

/** Retorna -1 (neutro) ou índice 0..7 a partir dos direcionais pressionados. */
export function dirIndexFromButtons(buttons: number): number {
  const x = (buttons & Btn.Right ? 1 : 0) - (buttons & Btn.Left ? 1 : 0);
  const y = (buttons & Btn.Down ? 1 : 0) - (buttons & Btn.Up ? 1 : 0);
  return dirIndexFromXY(x, y);
}

export function dirIndexFromXY(x: number, y: number): number {
  if (x === 0 && y === 0) return -1;
  const ang = Math.atan2(y, x);
  let idx = Math.round(ang / (Math.PI / 4));
  if (idx < 0) idx += 8;
  return idx % 8;
}

/**
 * Converte analógico em bits de direção (8 setores de 45° bem definidos) com zona morta radial.
 * Retorna bitmask com Left/Right/Up/Down.
 */
export function analogToDirBits(ax: number, ay: number, deadzone: number): number {
  const mag = Math.hypot(ax, ay);
  if (mag < deadzone) return 0;
  const idx = dirIndexFromXY(ax, ay);
  return dirBitsFromIndex(idx);
}

export function dirBitsFromIndex(idx: number): number {
  switch (idx) {
    case 0:
      return Btn.Right;
    case 1:
      return Btn.Right | Btn.Down;
    case 2:
      return Btn.Down;
    case 3:
      return Btn.Left | Btn.Down;
    case 4:
      return Btn.Left;
    case 5:
      return Btn.Left | Btn.Up;
    case 6:
      return Btn.Up;
    case 7:
      return Btn.Right | Btn.Up;
    default:
      return 0;
  }
}

/** Buffer de input: lembra um "pressionar" por N ticks. */
export class InputBuffer {
  private remaining = 0;
  window: number;
  constructor(window: number) {
    this.window = window;
  }

  push(): void {
    this.remaining = this.window;
  }

  tick(): void {
    if (this.remaining > 0) this.remaining--;
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  consume(): boolean {
    if (this.remaining > 0) {
      this.remaining = 0;
      return true;
    }
    return false;
  }

  clear(): void {
    this.remaining = 0;
  }
}
