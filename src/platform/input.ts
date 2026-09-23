import { Btn, analogToDirBits } from '../core/input';
import { EventBus } from '../services/eventBus';
import { Logger } from '../services/logger';
import { type Action, type KeyProfile, RESERVED_KEYS, SettingsService } from '../services/settings';

export type Device = 'keyboard' | 'gamepad';
export type MenuAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause';

const ACTION_BIT: Record<Action, number> = {
  left: Btn.Left,
  right: Btn.Right,
  up: Btn.Up,
  down: Btn.Down,
  jump: Btn.Jump,
  shoot: Btn.Shoot,
  dash: Btn.Dash,
  lock: Btn.Lock,
  ex: Btn.Ex,
  swap: Btn.Swap,
  pause: Btn.Pause,
};

/** Teclas sempre bloqueadas (rolagem de página / perda de foco). */
const ALWAYS_PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'PageUp', 'PageDown', 'Home', 'End', 'Backspace']);

interface PadState {
  index: number;
  id: string;
  standard: boolean;
  buttons: boolean[];
  prevButtons: boolean[];
  ax: number;
  ay: number;
}

export interface PlayerSlot {
  joined: boolean;
  device: Device;
  /** índice do gamepad atribuído (-1 = nenhum) */
  pad: number;
  profile: KeyProfile;
  lockToggled: boolean;
  crouchToggled: boolean;
  prevLockRaw: boolean;
  prevCrouchRaw: boolean;
  lastDevice: Device;
}

const MENU_REPEAT_DELAY = 22;
const MENU_REPEAT_RATE = 6;

class InputServiceImpl {
  private keys = new Set<string>();
  private keysPressedEdge = new Set<string>();
  private pads = new Map<number, PadState>();
  readonly slots: PlayerSlot[] = [this.newSlot(true), this.newSlot(false)];
  private menuHeld = new Map<MenuAction, number>();
  private menuFired = new Set<MenuAction>();
  private attached = false;
  /** callback para "qualquer tecla" (tela de título) */
  anyPressed = false;
  lastAnyDevice: Device = 'keyboard';
  /** tecla capturada pelo remapeamento */
  captureCallback: ((code: string) => void) | null = null;
  enabled = true;

  private newSlot(joined: boolean): PlayerSlot {
    return {
      joined,
      device: 'keyboard',
      pad: -1,
      profile: 'solo',
      lockToggled: false,
      crouchToggled: false,
      prevLockRaw: false,
      prevCrouchRaw: false,
      lastDevice: 'keyboard',
    };
  }

  attach(target: Window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', this.onKeyDown, { capture: true });
    target.addEventListener('keyup', this.onKeyUp, { capture: true });
    target.addEventListener('blur', this.clearKeys);
    target.addEventListener('gamepadconnected', this.onPadConnected as EventListener);
    target.addEventListener('gamepaddisconnected', this.onPadDisconnected as EventListener);
  }

  private isGameKey(code: string): boolean {
    if (ALWAYS_PREVENT.has(code)) return true;
    const k = SettingsService.get('keys');
    for (const prof of Object.values(k)) {
      for (const list of Object.values(prof)) if (list.includes(code)) return true;
    }
    return false;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // nunca interferir em atalhos do navegador
    const code = e.code;
    if (this.captureCallback && !e.repeat) {
      e.preventDefault();
      const cb = this.captureCallback;
      this.captureCallback = null;
      cb(code);
      return;
    }
    if (this.isGameKey(code) || code === 'Backquote') e.preventDefault();
    if (e.repeat) return;
    this.keys.add(code);
    this.keysPressedEdge.add(code);
    this.anyPressed = true;
    this.lastAnyDevice = 'keyboard';
    this.markDevice(-1);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (this.isGameKey(e.code)) e.preventDefault();
  };

  clearKeys = (): void => {
    this.keys.clear();
    this.keysPressedEdge.clear();
  };

  private onPadConnected = (e: GamepadEvent): void => {
    Logger.info('Input', `controle conectado: ${e.gamepad.id}`);
    EventBus.emit('gamepad:connected', { index: e.gamepad.index, id: e.gamepad.id });
  };

  private onPadDisconnected = (e: GamepadEvent): void => {
    Logger.info('Input', `controle desconectado: ${e.gamepad.id}`);
    this.pads.delete(e.gamepad.index);
    for (const s of this.slots) {
      if (s.pad === e.gamepad.index) {
        s.pad = -1;
        s.device = 'keyboard';
      }
    }
    EventBus.emit('gamepad:disconnected', { index: e.gamepad.index });
  };

  private markDevice(padIndex: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i]!;
      if (!s.joined) continue;
      const dev: Device = padIndex >= 0 && s.pad === padIndex ? 'gamepad' : padIndex < 0 ? 'keyboard' : s.lastDevice;
      if (padIndex < 0 && i === 1 && s.pad >= 0 && s.profile !== 'split2') continue;
      if (dev !== s.lastDevice) {
        s.lastDevice = dev;
        EventBus.emit('device:changed', { player: i, device: dev });
      }
    }
  }

  /** Lê os controles. Chamado uma vez por tick de simulação (e nos menus). */
  poll(): void {
    this.menuFired.clear();
    let list: (Gamepad | null)[] = [];
    try {
      list = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch {
      list = [];
    }
    for (const gp of list) {
      if (!gp || !gp.connected) continue;
      let st = this.pads.get(gp.index);
      if (!st) {
        st = { index: gp.index, id: gp.id, standard: gp.mapping === 'standard', buttons: [], prevButtons: [], ax: 0, ay: 0 };
        this.pads.set(gp.index, st);
        // atribuição automática: primeiro controle vai para P1 se ele não tiver controle
        const p1 = this.slots[0]!;
        if (p1.pad < 0 && !this.slotsUsingPad(gp.index)) p1.pad = gp.index;
      }
      st.prevButtons = st.buttons;
      st.buttons = gp.buttons.map((b) => b.pressed || b.value > 0.5);
      st.ax = gp.axes[0] ?? 0;
      st.ay = gp.axes[1] ?? 0;
      if (!st.standard) {
        // fallback para controles não padronizados: d-pad costuma vir em axes 6/7 ou 9
        const hat = gp.axes[9];
        if (hat !== undefined && Math.abs(hat) <= 1.01 && hat !== 0 && Math.abs(hat) > 0.01) {
          const ang = Math.round(((hat + 1) * 7) / 2);
          const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
          const d = dirs[ang];
          if (d) {
            st.ax = d[0]!;
            st.ay = d[1]!;
          }
        }
      }
      const anyNew = st.buttons.some((b, i) => b && !st.prevButtons[i]);
      if (anyNew) {
        this.anyPressed = true;
        this.lastAnyDevice = 'gamepad';
        this.markDevice(gp.index);
      }
    }
    this.updateMenu();
  }

  /** Fim do tick: descarta bordas de teclas já entregues. */
  endTick(): void {
    this.keysPressedEdge.clear();
  }

  private slotsUsingPad(index: number): boolean {
    return this.slots.some((s) => s.pad === index);
  }

  /** Controle livre que acabou de apertar Start/A (entrada do P2). */
  pollJoinPad(): number {
    for (const st of this.pads.values()) {
      if (this.slotsUsingPad(st.index)) continue;
      const start = st.buttons[9] && !st.prevButtons[9];
      const a = st.buttons[0] && !st.prevButtons[0];
      if (start || a) return st.index;
    }
    return -1;
  }

  /** Tecla de entrada do P2 no teclado dividido. */
  keyboardJoinPressed(): boolean {
    const codes = SettingsService.get('keys').split2.jump;
    return codes.some((c) => this.keys.has(c)) && !this.slots[1]!.joined;
  }

  joinPlayer2(via: 'keyboard' | number): void {
    const s = this.slots[1]!;
    s.joined = true;
    if (via === 'keyboard') {
      s.device = 'keyboard';
      s.pad = -1;
      s.profile = 'split2';
      s.lastDevice = 'keyboard';
      this.slots[0]!.profile = 'split1';
    } else {
      s.device = 'gamepad';
      s.pad = via;
      s.profile = 'split2';
      s.lastDevice = 'gamepad';
    }
  }

  leavePlayer2(): void {
    const s = this.slots[1]!;
    s.joined = false;
    s.pad = -1;
    this.slots[0]!.profile = 'solo';
  }

  /** Reatribui o controle de um jogador (menu). */
  assignPad(player: number, pad: number): void {
    for (const s of this.slots) if (s.pad === pad) s.pad = -1;
    const s = this.slots[player];
    if (s) s.pad = pad;
  }

  connectedPads(): { index: number; id: string }[] {
    return [...this.pads.values()].map((p) => ({ index: p.index, id: p.id }));
  }

  private keyHeld(profile: KeyProfile, action: Action): boolean {
    const codes = SettingsService.get('keys')[profile][action];
    for (const c of codes) if (this.keys.has(c) || this.keysPressedEdge.has(c)) return true;
    return false;
  }

  private padHeld(st: PadState | undefined, player: number, action: Exclude<Action, 'left' | 'right' | 'up' | 'down'>): boolean {
    if (!st) return false;
    const idx = SettingsService.get('pad')[player]?.[action] ?? [];
    for (const i of idx) if (st.buttons[i]) return true;
    return false;
  }

  /** Bits de Btn do jogador para o tick atual. */
  playerBits(player: number): number {
    const s = this.slots[player];
    if (!s || !s.joined || !this.enabled) return 0;
    let bits = 0;
    // teclado: P1 sempre (perfil solo ou split1); P2 só se entrou pelo teclado dividido
    const useKeyboard = player === 0 || (s.profile === 'split2' && s.pad < 0);
    if (useKeyboard) {
      for (const a of ['left', 'right', 'up', 'down', 'jump', 'shoot', 'dash', 'lock', 'ex', 'swap', 'pause'] as const) {
        if (this.keyHeld(s.profile, a)) bits |= ACTION_BIT[a];
      }
    }
    // controle
    const st = s.pad >= 0 ? this.pads.get(s.pad) : undefined;
    if (st) {
      const dz = SettingsService.get('deadzone');
      bits |= analogToDirBits(st.ax, st.ay, dz);
      if (st.buttons[12]) bits |= Btn.Up;
      if (st.buttons[13]) bits |= Btn.Down;
      if (st.buttons[14]) bits |= Btn.Left;
      if (st.buttons[15]) bits |= Btn.Right;
      for (const a of ['jump', 'shoot', 'dash', 'lock', 'ex', 'swap', 'pause'] as const) {
        if (this.padHeld(st, player, a)) bits |= ACTION_BIT[a];
      }
    }
    // toggles de acessibilidade
    const lockRaw = (bits & Btn.Lock) !== 0;
    if (SettingsService.get('toggleLock')) {
      if (lockRaw && !s.prevLockRaw) s.lockToggled = !s.lockToggled;
      bits = s.lockToggled ? bits | Btn.Lock : bits & ~Btn.Lock;
    }
    s.prevLockRaw = lockRaw;
    const crouchRaw = (bits & Btn.Down) !== 0;
    if (SettingsService.get('toggleCrouch')) {
      if (crouchRaw && !s.prevCrouchRaw) s.crouchToggled = !s.crouchToggled;
      if (s.crouchToggled) bits |= Btn.Crouch;
    }
    s.prevCrouchRaw = crouchRaw;
    return bits;
  }

  resetToggles(): void {
    for (const s of this.slots) {
      s.lockToggled = false;
      s.crouchToggled = false;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Menus: combinação de todos os dispositivos, com repetição ao segurar

  private menuRaw(a: MenuAction): boolean {
    const k = this.keys;
    const solo = SettingsService.get('keys').solo;
    let held = false;
    switch (a) {
      case 'up':
        held = solo.up.some((c) => k.has(c)) || k.has('KeyW') || k.has('ArrowUp');
        break;
      case 'down':
        held = solo.down.some((c) => k.has(c)) || k.has('KeyS') || k.has('ArrowDown');
        break;
      case 'left':
        held = solo.left.some((c) => k.has(c)) || k.has('KeyA') || k.has('ArrowLeft');
        break;
      case 'right':
        held = solo.right.some((c) => k.has(c)) || k.has('KeyD') || k.has('ArrowRight');
        break;
      case 'confirm':
        held = k.has('Enter') || k.has('Space') || k.has('KeyZ') || k.has('NumpadEnter');
        break;
      case 'back':
        held = k.has('Escape') || k.has('Backspace') || k.has('KeyX');
        break;
      case 'pause':
        held = k.has('KeyP') || k.has('Escape') || k.has('Enter');
        break;
    }
    for (const st of this.pads.values()) {
      const b = st.buttons;
      switch (a) {
        case 'up':
          held ||= !!b[12] || st.ay < -0.5;
          break;
        case 'down':
          held ||= !!b[13] || st.ay > 0.5;
          break;
        case 'left':
          held ||= !!b[14] || st.ax < -0.5;
          break;
        case 'right':
          held ||= !!b[15] || st.ax > 0.5;
          break;
        case 'confirm':
          held ||= !!b[0];
          break;
        case 'back':
          held ||= !!b[1];
          break;
        case 'pause':
          held ||= !!b[9];
          break;
      }
    }
    return held;
  }

  private updateMenu(): void {
    for (const a of ['up', 'down', 'left', 'right', 'confirm', 'back', 'pause'] as MenuAction[]) {
      const held = this.menuRaw(a);
      const n = this.menuHeld.get(a) ?? 0;
      if (!held) {
        this.menuHeld.set(a, 0);
        continue;
      }
      this.menuHeld.set(a, n + 1);
      const repeatable = a === 'up' || a === 'down' || a === 'left' || a === 'right';
      if (n === 0 || (repeatable && n >= MENU_REPEAT_DELAY && (n - MENU_REPEAT_DELAY) % MENU_REPEAT_RATE === 0)) {
        this.menuFired.add(a);
      }
    }
  }

  menu(a: MenuAction): boolean {
    return this.enabled && this.menuFired.has(a);
  }

  /** Consome o flag de "qualquer botão". */
  consumeAny(): boolean {
    const v = this.anyPressed;
    this.anyPressed = false;
    return v;
  }

  isReserved(code: string): boolean {
    return RESERVED_KEYS.has(code);
  }

  /** Vibração do controle (degrada silenciosamente sem suporte). */
  rumble(player: number, strong: number, weak: number, ms: number): void {
    if (!SettingsService.get('rumble')) return;
    const s = this.slots[player];
    if (!s || s.pad < 0) return;
    try {
      const gp = navigator.getGamepads?.()[s.pad];
      const act = (gp as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }) | null)?.vibrationActuator;
      if (act?.playEffect) {
        void act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => undefined);
      }
    } catch {
      /* sem suporte */
    }
  }

  deviceOf(player: number): Device {
    return this.slots[player]?.lastDevice ?? 'keyboard';
  }

  /** Nome curto da tecla/botão para placas e ícones dinâmicos. */
  labelFor(player: number, action: Action): string {
    const s = this.slots[player]!;
    if (s.lastDevice === 'gamepad' && action !== 'left' && action !== 'right' && action !== 'up' && action !== 'down') {
      const idx = SettingsService.get('pad')[player]?.[action]?.[0] ?? 0;
      return PAD_LABELS[idx] ?? `B${idx}`;
    }
    if (s.lastDevice === 'gamepad') return action === 'left' ? '◄' : action === 'right' ? '►' : action === 'up' ? '▲' : '▼';
    const code = SettingsService.get('keys')[s.profile][action][0] ?? '?';
    return keyLabel(code);
  }

  /** Estado bruto para testes/debug. */
  debugHeldKeys(): string[] {
    return [...this.keys];
  }
}

export const PAD_LABELS: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'SELECT',
  9: 'START',
  10: 'L3',
  11: 'R3',
};

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const map: Record<string, string> = {
    Space: 'Espaço',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift Dir.',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Enter: 'Enter',
    Escape: 'Esc',
    Period: '.',
    Comma: ',',
    Slash: '/',
    Semicolon: ';',
    Quote: "'",
    BracketRight: ']',
    BracketLeft: '[',
    Backspace: '⌫',
    Minus: '-',
    Equal: '=',
  };
  return map[code] ?? code;
}

export const InputService = new InputServiceImpl();
