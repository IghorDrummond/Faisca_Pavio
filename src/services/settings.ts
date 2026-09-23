import { EventBus } from './eventBus';
import { Logger } from './logger';

/** Ações de jogo remapeáveis. */
export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'shoot', 'dash', 'lock', 'ex', 'swap', 'pause'] as const;
export type Action = (typeof ACTIONS)[number];

export type KeyProfile = 'solo' | 'split1' | 'split2';
export type KeyBindings = Record<Action, string[]>;
export type PadBindings = Record<Exclude<Action, 'left' | 'right' | 'up' | 'down'>, number[]>;

/** Teclas reservadas pelo navegador/sistema que não podem ser usadas no jogo. */
export const RESERVED_KEYS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'ContextMenu', 'OSLeft', 'OSRight',
  'Backquote', 'PrintScreen', 'ScrollLock', 'Pause', 'NumLock', 'CapsLock', 'Tab',
]);

export const DEFAULT_KEYS: Record<KeyProfile, KeyBindings> = {
  solo: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['KeyZ', 'Space'],
    shoot: ['KeyX', 'KeyJ'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
    lock: ['KeyC', 'KeyL'],
    ex: ['KeyV', 'KeyI'],
    swap: ['KeyQ', 'KeyU'],
    pause: ['KeyP', 'Enter', 'Escape'],
  },
  split1: {
    left: ['KeyA'],
    right: ['KeyD'],
    up: ['KeyW'],
    down: ['KeyS'],
    jump: ['Space'],
    shoot: ['KeyF'],
    dash: ['ShiftLeft'],
    lock: ['KeyR'],
    ex: ['KeyE'],
    swap: ['KeyQ'],
    pause: ['KeyP', 'Escape'],
  },
  split2: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    jump: ['Numpad0', 'Period'],
    shoot: ['Numpad1', 'Slash'],
    dash: ['Numpad2', 'ShiftRight'],
    lock: ['Numpad3', 'Quote'],
    ex: ['Numpad4', 'Semicolon'],
    swap: ['Numpad5', 'BracketRight'],
    pause: ['Enter', 'NumpadEnter'],
  },
};

export const DEFAULT_PAD: PadBindings = {
  jump: [0],
  shoot: [2],
  dash: [5, 1],
  lock: [7],
  ex: [3],
  swap: [4],
  pause: [9],
};

export interface Settings {
  renderScale: number;
  dprCap: number;
  postQuality: 'low' | 'medium' | 'high';
  grain: number;
  scratches: number;
  vignette: number;
  desaturate: number;
  frameJitter: boolean;
  flicker: boolean;
  blackWhite: boolean;
  showFps: boolean;
  master: number;
  music: number;
  sfx: number;
  voice: number;
  ambient: number;
  vinyl: boolean;
  deadzone: number;
  rumble: boolean;
  autoFire1: boolean;
  autoFire2: boolean;
  toggleLock: boolean;
  toggleCrouch: boolean;
  keys: Record<KeyProfile, KeyBindings>;
  pad: [PadBindings, PadBindings];
  shake: number;
  reduceFlashes: boolean;
  projOutline: boolean;
  colorblind: 'none' | 'protan' | 'deutan' | 'tritan';
  parryStar: boolean;
  bossHpBar: boolean;
  subtitles: boolean;
  textScale: number;
  hudScale: number;
  gameSpeed: number;
  lang: 'pt-BR' | 'en';
  telemetryOptIn: boolean;
  onlineOptIn: boolean;
  fastTransitions: boolean;
  seenIntro: boolean;
}

function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function defaultSettings(): Settings {
  const reduced = prefersReducedMotion();
  return {
    renderScale: 1,
    dprCap: 1,
    postQuality: 'high',
    grain: 0.5,
    scratches: 0.5,
    vignette: 0.6,
    desaturate: 0.35,
    frameJitter: !reduced,
    flicker: !reduced,
    blackWhite: false,
    showFps: false,
    master: 0.8,
    music: 0.7,
    sfx: 0.85,
    voice: 0.9,
    ambient: 0.6,
    vinyl: true,
    deadzone: 0.3,
    rumble: true,
    autoFire1: false,
    autoFire2: false,
    toggleLock: false,
    toggleCrouch: false,
    keys: clone(DEFAULT_KEYS),
    pad: [clone(DEFAULT_PAD), clone(DEFAULT_PAD)],
    shake: reduced ? 0.3 : 1,
    reduceFlashes: reduced,
    projOutline: false,
    colorblind: 'none',
    parryStar: true,
    bossHpBar: false,
    subtitles: true,
    textScale: 1,
    hudScale: 1,
    gameSpeed: 1,
    lang: 'pt-BR',
    telemetryOptIn: false,
    onlineOptIn: false,
    fastTransitions: false,
    seenIntro: false,
  };
}

type Check = (v: unknown) => boolean;
const num = (lo: number, hi: number): Check => (v) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const bool: Check = (v) => typeof v === 'boolean';
const oneOf = (...xs: unknown[]): Check => (v) => xs.includes(v);
const codeList: Check = (v) =>
  Array.isArray(v) && v.length <= 4 && v.every((c) => typeof c === 'string' && c.length < 32 && !RESERVED_KEYS.has(c));
const keyBindings: Check = (v) =>
  typeof v === 'object' && v !== null && ACTIONS.every((a) => codeList((v as Record<string, unknown>)[a]));
const padList: Check = (v) => Array.isArray(v) && v.length <= 3 && v.every((b) => Number.isInteger(b) && b >= 0 && b < 20);
const padBindings: Check = (v) =>
  typeof v === 'object' && v !== null && Object.keys(DEFAULT_PAD).every((a) => padList((v as Record<string, unknown>)[a]));

/** Regras de validação por chave: valores inválidos voltam para o padrão com aviso no log. */
export const SETTINGS_RULES: Record<keyof Settings, Check> = {
  renderScale: num(0.5, 1),
  dprCap: oneOf(1, 1.5, 2),
  postQuality: oneOf('low', 'medium', 'high'),
  grain: num(0, 1),
  scratches: num(0, 1),
  vignette: num(0, 1),
  desaturate: num(0, 1),
  frameJitter: bool,
  flicker: bool,
  blackWhite: bool,
  showFps: bool,
  master: num(0, 1),
  music: num(0, 1),
  sfx: num(0, 1),
  voice: num(0, 1),
  ambient: num(0, 1),
  vinyl: bool,
  deadzone: num(0.05, 0.8),
  rumble: bool,
  autoFire1: bool,
  autoFire2: bool,
  toggleLock: bool,
  toggleCrouch: bool,
  keys: (v) =>
    typeof v === 'object' && v !== null && (['solo', 'split1', 'split2'] as const).every((p) => keyBindings((v as Record<string, unknown>)[p])),
  pad: (v) => Array.isArray(v) && v.length === 2 && v.every(padBindings),
  shake: num(0, 1),
  reduceFlashes: bool,
  projOutline: bool,
  colorblind: oneOf('none', 'protan', 'deutan', 'tritan'),
  parryStar: bool,
  bossHpBar: bool,
  subtitles: bool,
  textScale: num(0.75, 1.5),
  hudScale: num(0.75, 1.25),
  gameSpeed: oneOf(0.7, 0.85, 1),
  lang: oneOf('pt-BR', 'en'),
  telemetryOptIn: bool,
  onlineOptIn: bool,
  fastTransitions: bool,
  seenIntro: bool,
};

/** Normaliza um objeto de configurações qualquer (corrige campos inválidos). Puro — testável em Node. */
export function sanitizeSettings(raw: unknown): { settings: Settings; fixed: string[] } {
  const d = defaultSettings();
  const fixed: string[] = [];
  if (typeof raw !== 'object' || raw === null) return { settings: d, fixed: ['*'] };
  const src = raw as Record<string, unknown>;
  const out = d as unknown as Record<string, unknown>;
  for (const k of Object.keys(SETTINGS_RULES) as (keyof Settings)[]) {
    if (!(k in src)) continue;
    if (SETTINGS_RULES[k](src[k])) out[k] = clone(src[k]);
    else fixed.push(k);
  }
  return { settings: out as unknown as Settings, fixed };
}

const STORAGE_KEY = 'fp.settings.v1';

class SettingsServiceImpl {
  private data: Settings = defaultSettings();
  private storageOk = true;

  load(): void {
    let raw: unknown = null;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      raw = s ? (JSON.parse(s) as unknown) : null;
    } catch (e) {
      this.storageOk = false;
      Logger.warn('Settings', 'localStorage indisponível; usando memória', String(e));
    }
    if (raw === null) {
      this.data = defaultSettings();
      return;
    }
    const { settings, fixed } = sanitizeSettings(raw);
    if (fixed.length) Logger.warn('Settings', `valores inválidos corrigidos para o padrão: ${fixed.join(', ')}`);
    this.data = settings;
  }

  get<K extends keyof Settings>(k: K): Settings[K] {
    return this.data[k];
  }

  get all(): Readonly<Settings> {
    return this.data;
  }

  set<K extends keyof Settings>(k: K, v: Settings[K]): void {
    if (!SETTINGS_RULES[k](v)) {
      Logger.warn('Settings', `valor inválido ignorado para ${String(k)}`);
      return;
    }
    this.data[k] = v;
    this.persist();
    EventBus.emit('settings:changed', { key: k });
  }

  resetKeys(): void {
    this.data.keys = clone(DEFAULT_KEYS);
    this.data.pad = [clone(DEFAULT_PAD), clone(DEFAULT_PAD)];
    this.persist();
    EventBus.emit('settings:changed', { key: 'keys' });
  }

  persist(): void {
    if (!this.storageOk) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      this.storageOk = false;
      Logger.warn('Settings', 'falha ao salvar configurações', String(e));
    }
  }
}

export const SettingsService = new SettingsServiceImpl();
