/**
 * Visual dos chefes (camada GAME): como traduzir o estado da simulação em animações do atlas.
 * A simulação não conhece sprites; aqui só há leitura do estado.
 */
export interface BodyVisual {
  /** retorna a chave de animação para (índice da fase, anim da simulação, estado do chefe) */
  anim: (phase: number, simAnim: string, bossState: string) => string | null;
  origin: [number, number];
  /** origem por fase (quando o chefe muda de forma e de quadro) */
  originFor?: (phase: number) => [number, number];
  depth?: number;
  scale?: number;
  /** esconder quando não há partes (ex.: corpo "fantasma") */
  hideWhenEmpty?: boolean;
  /** flip automático conforme facing */
  flip?: boolean;
}

export interface HazardVisual {
  kind: 'pendulum' | 'image' | 'ring' | 'laser' | 'shock' | 'stomp' | 'crusher' | 'platform' | 'crosser' | 'force';
  image?: string;
  rod?: string;
  tint?: number;
  color?: number;
}

export interface ArenaLayer {
  key: string;
  depth: number;
  y: number;
  alpha?: number;
  /** balanço leve (cenário vivo) */
  sway?: number;
  /** rolagem horizontal contínua (px/s) — fase aérea */
  scroll?: number;
}

export interface BossVisual {
  song: string;
  layers: ArenaLayer[];
  bodies: Record<string, BodyVisual>;
  hazards: Record<string, HazardVisual>;
  title: string;
  quote: string;
}

const phaseTag = (i: number): string => `p${Math.min(3, i + 1)}`;

export const BOSS_VISUALS: Record<string, BossVisual> = {
  cuco: {
    song: 'cuco',
    title: 'SENHOR CUCO',
    quote: '“Tic-tac, visitante! Seu tempo acabou antes de começar!”',
    layers: [
      { key: 'bg_cuco_far', depth: -100, y: 0 },
      { key: 'bg_cuco_mid', depth: -90, y: 0, sway: 1.5 },
      { key: 'bg_cuco_floor', depth: -80, y: 880 },
      { key: 'bg_cuco_fg', depth: 800, y: 0, alpha: 0.95, sway: 3 },
    ],
    bodies: {
      main: {
        origin: [280 / 560, 400 / 760],
        depth: 10,
        anim: (phase, a, st) => {
          if (st === 'knockout' || a === 'knockout') return 'cuco_knockout';
          if (a === 'transition') return phase >= 2 ? 'cuco_crack' : 'cuco_transition';
          const p = phaseTag(phase);
          if (p === 'p3') return 'cuco_p3_idle';
          const map: Record<string, string> = {
            idle: `cuco_${p}_idle`,
            windup: `cuco_${p}_windup`,
            attack: `cuco_${p}_attack`,
            chime: `cuco_${p}_chime`,
            cuckoo_out: `cuco_${p}_cuckoo_out`,
            cuckoo_spit: `cuco_${p}_cuckoo_spit`,
          };
          return map[a] ?? `cuco_${p}_idle`;
        },
      },
      cage: {
        origin: [0.5, 0.5],
        depth: 12,
        anim: (_p, a, st) => (st === 'knockout' ? 'cuco_cage_idle' : a === 'attack' || a === 'windup' ? 'cuco_cage_attack' : 'cuco_cage_idle'),
      },
    },
    hazards: {
      pendulum: { kind: 'pendulum', image: 'hz_pendulum_bob', rod: 'hz_pendulum_rod' },
      hand_low: { kind: 'image', image: 'hz_hand_low' },
      hand_high: { kind: 'image', image: 'hz_hand_high' },
      soundwave: { kind: 'ring', color: 0xf2e6c8 },
    },
  },
  agulha: {
    song: 'agulha',
    title: 'MADAME AGULHA',
    quote: '“Querido, vou fazer uma bainha em você que nunca mais desfaz!”',
    layers: [
      { key: 'bg_agulha_far', depth: -100, y: 0, sway: 1 },
      { key: 'bg_agulha_floor', depth: -80, y: 880 },
    ],
    bodies: {
      main: {
        origin: [300 / 560, 0.5],
        originFor: (p) => (p >= 2 ? [0.5, 400 / 720] : [300 / 560, 0.5]),
        depth: 10,
        anim: (phase, a, st) => {
          if (st === 'knockout' || st === 'dead') return 'agulha_knockout';
          if (a === 'transition') return 'agulha_transition';
          const p = phase >= 2 ? 'p3' : phase === 1 ? 'p2' : 'p1';
          if (a === 'windup' || a === 'cushion') return `agulha_${p}_windup`;
          if (a === 'attack') return `agulha_${p}_attack`;
          return `agulha_${p}_idle`;
        },
      },
    },
    hazards: {
      needle: { kind: 'image', image: 'hz_needle' },
      scissors_low: { kind: 'image', image: 'hz_scissors_low' },
      scissors_high: { kind: 'image', image: 'hz_scissors_high' },
      thread: { kind: 'laser', color: 0xd9546a },
    },
  },
  gramofone: {
    song: 'gramofone',
    title: 'TIO GRAMOFONE',
    quote: '“Silêncio! A estrela da noite sou EU — e o compasso também!”',
    layers: [
      { key: 'bg_gramofone_far', depth: -100, y: 0, sway: 1 },
      { key: 'bg_gramofone_floor', depth: -80, y: 880 },
    ],
    bodies: {
      main: {
        origin: [300 / 560, 340 / 640],
        depth: 10,
        anim: (phase, a, st) => {
          if (st === 'knockout' || st === 'dead') return 'gramofone_knockout';
          if (a === 'transition') return 'gramofone_transition';
          if (a === 'scratch') return 'gramofone_scratch';
          if (a === 'inhale') return 'gramofone_inhale';
          const p = `p${Math.min(4, phase + 1)}`;
          if (a === 'windup') return `gramofone_${p}_windup`;
          if (a === 'attack') return `gramofone_${p}_attack`;
          return `gramofone_${p}_idle`;
        },
      },
    },
    hazards: {
      soundbar_low: { kind: 'image', image: 'hz_soundbar_low' },
      soundbar_high: { kind: 'image', image: 'hz_soundbar_high' },
    },
  },
  bigorna: {
    song: 'bigorna',
    title: 'IRMÃS BIGORNA',
    quote: '“— Eu bato! — Eu calculo! — E você amassa!”',
    layers: [
      { key: 'bg_bigorna_far', depth: -100, y: 0, sway: 1 },
      { key: 'bg_bigorna_floor', depth: -80, y: 880 },
    ],
    bodies: {
      bate: {
        origin: [0.5, 200 / 340],
        depth: 11,
        flip: true,
        anim: (phase, a, st) => (st === 'knockout' || st === 'dead' || a === 'defeated' ? 'bate_defeated' : a === 'windup' ? 'bate_windup' : a === 'attack' ? 'bate_attack' : phase >= 2 ? 'bate_angry' : 'bate_idle'),
      },
      forja: {
        origin: [0.5, 200 / 340],
        depth: 10,
        flip: true,
        anim: (phase, a, st) => (st === 'knockout' || st === 'dead' || a === 'defeated' ? 'forja_defeated' : a === 'windup' ? 'forja_windup' : a === 'attack' ? 'forja_attack' : phase >= 2 ? 'forja_angry' : 'forja_idle'),
      },
    },
    hazards: { quake: { kind: 'image', image: 'hz_quake' } },
  },
  fuligem: {
    song: 'fuligem',
    title: 'COMODORO FULIGEM',
    quote: '“Todos a bordo… da minha fumaça! Ha-kof-kof!”',
    layers: [
      { key: 'bg_fuligem_far', depth: -100, y: 0, scroll: 40 },
      { key: 'bg_fuligem_mid', depth: -90, y: 0, scroll: 160 },
    ],
    bodies: {
      main: {
        origin: [260 / 560, 0.5],
        originFor: (p) => (p === 3 ? [0.5, 0.5] : p === 2 ? [240 / 520, 340 / 700] : [260 / 560, 0.5]),
        depth: 10,
        anim: (phase, a, st) => {
          if (st === 'knockout' || st === 'dead') return 'fuligem_knockout';
          if (a === 'transition') return phase === 3 ? 'fuligem_core_attack' : 'fuligem_transition';
          const f = phase === 3 ? 'core' : phase === 2 ? 'factory' : 'cloud';
          if (f === 'core') return a === 'attack' || a === 'windup' ? 'fuligem_core_attack' : 'fuligem_core_idle';
          if (a === 'windup') return `fuligem_${f}_windup`;
          if (a === 'attack') return `fuligem_${f}_attack`;
          return `fuligem_${f}_idle`;
        },
      },
    },
    hazards: { piston: { kind: 'image', image: 'hz_piston' } },
  },
  maestro: {
    song: 'maestro',
    title: 'O MAESTRO DE CORDA',
    quote: '“Luz só no meu compasso. Um, dois, três… apaga!”',
    layers: [
      { key: 'bg_maestro_far', depth: -100, y: 0, sway: 1 },
      { key: 'bg_maestro_floor', depth: -80, y: 880 },
    ],
    bodies: {
      main: {
        origin: [0.5, 440 / 800],
        originFor: (p) => (p >= 2 ? [0.5, 420 / 800] : [0.5, 440 / 800]),
        depth: 10,
        anim: (phase, a, st) => {
          if (st === 'knockout' || st === 'dead') return 'maestro_knockout';
          if (a === 'transition') return 'maestro_transition';
          if (phase >= 3) return 'maestro_p4_idle';
          const p = phase >= 2 ? 'p3' : 'p1';
          if (a === 'baton' || a === 'windup') return `maestro_${p}_baton`;
          if (a === 'attack') return `maestro_${p}_attack`;
          return `maestro_${p}_idle`;
        },
      },
    },
    hazards: {
      pendulum: { kind: 'pendulum', image: 'hz_pendulum_bob', rod: 'hz_pendulum_rod' },
      needle: { kind: 'image', image: 'hz_needle' },
      quake: { kind: 'image', image: 'hz_quake' },
      soundwave: { kind: 'ring', color: 0xf2e6c8 },
      baton_beam: { kind: 'laser', color: 0xfff0b0 },
      ballerina_low: { kind: 'crosser', image: 'hz_ballerina_low_0' },
      ballerina_high: { kind: 'crosser', image: 'hz_ballerina_high_0' },
      ballerina_parry: { kind: 'crosser', image: 'hz_ballerina_parry_0' },
    },
  },
  cortina: {
    song: 'runngun1',
    title: 'CORTINA DE VELUDO',
    quote: '“O show acabou pra você, fósforo!”',
    layers: [],
    bodies: {
      main: {
        origin: [230 / 460, 420 / 780],
        depth: 10,
        anim: (_p, a, st) => (st === 'knockout' || st === 'dead' ? 'cortina_ko' : a === 'windup' ? 'cortina_windup' : a === 'attack' ? 'cortina_attack' : 'cortina_idle'),
      },
    },
    hazards: {
      counterweight: { kind: 'image', image: 'hz_counterweight' },
      spotlight: { kind: 'laser', color: 0xfff0b0 },
      curtain_wave: { kind: 'image', image: 'hz_curtain_wave' },
    },
  },
  fole: {
    song: 'runngun2',
    title: 'FOLE GIGANTE',
    quote: '“Vou soprar essa chaminha!”',
    layers: [],
    bodies: {
      main: {
        origin: [0.5, 0.5],
        depth: 10,
        anim: (_p, a, st) => (st === 'knockout' || st === 'dead' ? 'fole_ko' : a === 'windup' ? 'fole_windup' : a === 'attack' ? 'fole_attack' : 'fole_idle'),
      },
    },
    hazards: {
      press: { kind: 'image', image: 'hz_press' },
      steam: { kind: 'image', image: 'hz_steam' },
    },
  },
};
