/**
 * Visual dos chefes (camada GAME): como traduzir o estado da simulação em animações do atlas.
 * A simulação não conhece sprites; aqui só há leitura do estado.
 */
export interface BodyVisual {
  /** retorna a chave de animação para (índice da fase, anim da simulação, estado do chefe) */
  anim: (phase: number, simAnim: string, bossState: string) => string | null;
  origin: [number, number];
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
};
