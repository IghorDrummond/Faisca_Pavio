/**
 * Tipos de dados (definições data-driven) usados pelo núcleo.
 * Todo número de balanceamento vive em /src/data e segue estes tipos.
 * Unidades: tempo em segundos (convertido para ticks ao carregar), distância em px, velocidade em px/s.
 */

export type WeaponId = 'reta' | 'leque' | 'teleguiada' | 'rojao';
export type SuperId = 'chamaMestra' | 'pavioLongo' | 'braseiroGemeo';
export type CharmId = 'coracaoCera' | 'fumacaPalco' | 'luvaMagnetica' | 'cartolaSorte';
export type DifficultyId = 'simples' | 'normal' | 'especialista';
export type CharacterId = 'faisca' | 'pavio';

export interface WeaponDef {
  id: WeaponId;
  price: number;
  /** intervalo entre disparos (s) */
  fireInterval: number;
  damage: number;
  speed: number;
  /** alcance máximo percorrido (px); Infinity = até sair da tela */
  range: number;
  radius: number;
  pattern: 'straight' | 'spread' | 'homing' | 'charge';
  spreadDeg?: number[];
  /** rad/s de curvatura (teleguiada) */
  homingTurn?: number;
  charge?: {
    time: number;
    damage: number;
    speed: number;
    radius: number;
    explosionRadius: number;
    weakDamage: number;
    weakInterval: number;
    weakSpeed: number;
    /** recuperação após disparo carregado (s) */
    recovery: number;
  };
  ex: ExDef;
  projKind: string;
  /** dano de referência para ganho de medidor (fração de carta por ponto de dano) */
  meterPerDamage: number;
}

export interface ExDef {
  kind: 'pierce' | 'ring' | 'swarm' | 'split';
  damage: number;
  count: number;
  speed: number;
  radius: number;
  /** golpes em alvos distintos/tempo para perfurante */
  hits?: number;
  explosionRadius?: number;
  projKind: string;
}

export interface SuperDef {
  id: SuperId;
  kind: 'beam' | 'invincible' | 'clone';
  duration: number;
  /** dano por tick de contato (beam/invincible) */
  damagePerHit: number;
  hitInterval: number;
}

export interface CharmDef {
  id: CharmId;
  price: number;
}

export interface DifficultyDef {
  id: DifficultyId;
  projectileSpeed: number;
  telegraph: number;
  bossHp: number;
  skipLastPhase: boolean;
  expertPatterns: boolean;
  /** telegraph mínimo absoluto nesta dificuldade (s) */
  minTelegraph: number;
}

/** Origem de emissão de projéteis. */
export interface OriginDef {
  from: 'body' | 'point' | 'top' | 'left' | 'right';
  /** id da parte/âncora do chefe (quando from = body) */
  anchor?: string;
  body?: string;
  x?: number;
  y?: number;
}

export interface ProjSpec {
  kind: string;
  radius: number;
  speed: number;
  gravity?: number;
  motion?: 'linear' | 'sine' | 'homing' | 'boomerang';
  sineAmp?: number;
  sineFreq?: number;
  homingTurn?: number;
  homingTime?: number;
  boomerangTime?: number;
  bounces?: number;
  /** some ao tocar o chão (padrão true quando gravity > 0 e sem bounces) */
  floorKill?: boolean;
  life?: number;
  /** tempo parado com brilho de aviso antes de mover (s) */
  warn?: number;
  /** a cada N projéteis desta emissão, 1 é de parry (ex.: 3 = o terceiro) */
  parryEvery?: number;
  parryChance?: number;
  spin?: number;
  /** projétil rola no chão (carretéis, discos) */
  rolling?: boolean;
}

export type EmitterDef =
  | { type: 'line'; origin: OriginDef; dirDeg: number | 'aimed'; count: number; interval: number; proj: ProjSpec }
  | {
      type: 'fan';
      origin: OriginDef;
      dirDeg: number | 'aimed';
      count: number;
      spreadDeg: number;
      repeats?: number;
      interval?: number;
      proj: ProjSpec;
    }
  | { type: 'ring'; origin: OriginDef; count: number; offsetDeg: number; proj: ProjSpec }
  | {
      type: 'spiral';
      origin: OriginDef;
      count: number;
      interval: number;
      startDeg: number;
      stepDeg: number;
      arms: number;
      proj: ProjSpec;
    }
  | {
      type: 'rain';
      count: number;
      interval: number;
      xMin: number;
      xMax: number;
      /** distância mínima entre quedas consecutivas */
      minSpacing: number;
      /** aviso de sombra no chão (s) */
      warn: number;
      /** se definido, cai em x mirando o jogador +- jitter */
      aimJitter?: number;
      proj: ProjSpec;
    }
  | {
      type: 'lob';
      origin: OriginDef;
      count: number;
      interval: number;
      /** alcance horizontal alvo (px) aleatório entre min e max, na direção do jogador ou fixa */
      distMin: number;
      distMax: number;
      dir: -1 | 1 | 'aimed' | 'random';
      apexHeight: number;
      proj: ProjSpec;
    }
  | {
      type: 'wave';
      origin: OriginDef;
      count: number;
      interval: number;
      dirDeg: number;
      proj: ProjSpec;
    }
  | {
      type: 'wall';
      /** coluna vertical que atravessa a tela com um vão */
      side: 'left' | 'right';
      count: number;
      spacing: number;
      top: number;
      gapMin: number;
      gapMax: number;
      gapSize: number;
      proj: ProjSpec;
    };

export type HazardDef =
  | {
      type: 'sweep';
      kind: string;
      pivotX: number;
      pivotY: number;
      /** pivô relativo ao corpo */
      body?: string;
      length: number;
      width: number;
      /** ângulos (graus, 90 = para baixo) em keyframes */
      angles: number[];
      /** duração de cada segmento (s) */
      segment: number;
      warn: number;
      /** aplica ease-in-out (pêndulo) */
      ease?: boolean;
      /** a lâmina só machuca da metade para a ponta */
      safeInner?: number;
    }
  | {
      type: 'slab';
      kind: string;
      y: number;
      height: number;
      width: number;
      from: 'left' | 'right';
      speed: number;
      warn: number;
    }
  | {
      type: 'stomp';
      kind: string;
      /** posições x em sequência; 'track' = segue o jogador com atraso */
      xs: number[] | 'track';
      count?: number;
      width: number;
      top: number;
      warn: number;
      active: number;
      interval: number;
    }
  | {
      type: 'laser';
      kind: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      warn: number;
      active: number;
    }
  | {
      type: 'shockwave';
      kind: string;
      x: number | 'body';
      body?: string;
      dirs: (-1 | 1)[];
      speed: number;
      width: number;
      height: number;
      warn: number;
    }
  | {
      type: 'ring';
      kind: string;
      x: number;
      y: number;
      body?: string;
      speed: number;
      thickness: number;
      /** ângulo central do vão (graus) — 'random' sorteia dentre gapChoices */
      gapDeg: number | 'random';
      gapChoices?: number[];
      gapWidthDeg: number;
      warn: number;
      maxRadius: number;
    }
  | { type: 'force'; kind: string; x: number; strength: number; duration: number; warn: number }
  | {
      type: 'crusher';
      kind: string;
      side: 'left' | 'right' | 'top' | 'bottom';
      depth: number;
      warn: number;
      active: number;
      /** posição ao longo da borda (centro) e largura do pistão */
      at: number;
      size: number;
    }
  | {
      type: 'platform';
      kind: string;
      x: number;
      y: number;
      width: number;
      life: number;
      warn: number;
    }
  | {
      type: 'crosser';
      kind: string;
      /** atravessa a tela girando (bailarinas): y, altura, direção */
      y: number;
      width: number;
      height: number;
      from: 'left' | 'right';
      speed: number;
      warn: number;
      bobAmp?: number;
      parry?: boolean;
    };

export type AttackAction =
  | { t: number; do: 'emit'; emitter: EmitterDef }
  | { t: number; do: 'hazard'; hazard: HazardDef }
  | { t: number; do: 'anim'; anim: string; body?: string }
  | { t: number; do: 'move'; x: number; y: number; time: number; body?: string; ease?: boolean }
  | { t: number; do: 'jump'; x: number | 'player' | 'opposite'; height: number; time: number; body?: string; minX?: number; maxX?: number }
  | { t: number; do: 'chase'; speed: number; time: number; body?: string }
  | { t: number; do: 'sound'; id: string }
  | { t: number; do: 'shake'; amount: number }
  | { t: number; do: 'music'; op: 'skip' | 'tempoUp'; value: number }
  | { t: number; do: 'swapBodies' };

export interface AttackDef {
  id: string;
  /** antecipação antes do primeiro golpe (s), escalada pela dificuldade */
  telegraph: number;
  /** anim de antecipação */
  telegraphAnim: string;
  /** avisos visuais extras durante o telegraph */
  telegraphFx?: TelegraphFx[];
  /** duração total da parte ativa (s) após telegraph */
  active: number;
  recovery: number;
  containsParry: boolean;
  actions: AttackAction[];
  /** não pode vir logo após estes ataques */
  cannotFollow?: string[];
  expertOnly?: boolean;
  /** som de aviso distinto no início do telegraph */
  warnSound?: string;
  /** dispara no próximo tempo musical (chefe do ritmo) */
  onBeat?: boolean;
}

export interface TelegraphFx {
  kind: 'flash' | 'shadowBody' | 'edge' | 'band' | 'glint';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  body?: string;
}

export interface PartDef {
  id: string;
  /** offset relativo à posição do corpo */
  x: number;
  y: number;
  w: number;
  h: number;
  /** recebe dano dos tiros */
  hurt: boolean;
  /** causa dano por contato */
  contact: boolean;
  damageMult?: number;
}

export interface BodyPhaseDef {
  id: string;
  x: number;
  y: number;
  parts: PartDef[];
  /** âncoras de emissão */
  anchors: Record<string, { x: number; y: number }>;
  visible?: boolean;
}

export interface AmbientDef {
  /** trilha paralela de ataques/perigos contínuos da fase */
  every: number;
  jitter: number;
  actions: AttackAction[];
  startDelay: number;
}

export interface PhaseDef {
  id: string;
  /** fração da vida em que a fase começa (1 = início) */
  hpStart: number;
  bodies: BodyPhaseDef[];
  attacks: { id: string; weight: number }[];
  /** intervalo entre ataques (s) no início e no fim da fase — ritmo aumenta com a vida caindo */
  gapStart: number;
  gapEnd: number;
  breatherEvery: [number, number];
  breatherTime: [number, number];
  ambient?: AmbientDef;
  /** tempo de transição para esta fase (s) */
  transition: number;
  /** força horizontal contínua (sucção) */
  anims?: Record<string, string>;
  /** plataformas extras da fase */
  platforms?: { x: number; y: number; w: number }[];
  /** tema musical: bpm multiplicador etc. */
  tempoUpEvery?: number;
}

export interface BossDef {
  id: string;
  mode: 'ground' | 'air';
  hp: number;
  targetTime: number;
  arena: {
    floorY: number;
    left: number;
    right: number;
    platforms: { x: number; y: number; w: number }[];
  };
  bpm?: number;
  attacks: AttackDef[];
  phases: PhaseDef[];
  /** regra das irmãs: ao entrar na fase de índice N, o corpo com mais dano sai */
  twinRule?: { phaseIndex: number; bodies: [string, string] };
  /** duração da animação de nocaute (s) */
  knockoutTime: number;
  coins: number;
}

export interface RankingTable {
  timePoints: number;
  hpPoints: number;
  parryPoints: number;
  maxParries: number;
  superPoints: number;
  maxSuperCards: number;
  noDamageBonus: number;
  difficultyPoints: Record<DifficultyId, number>;
  grades: { grade: Grade; min: number }[];
  maxGradeByDifficulty: Record<DifficultyId, Grade>;
}

export type Grade = 'D' | 'C' | 'B' | 'A' | 'A+' | 'S';
