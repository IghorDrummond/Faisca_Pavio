import type { EventQueue } from './events';
import type { LevelGeometry } from './level';
import type { PlayerProjectile } from './projectiles';
import type { Rng } from './rng';

/** Serviços da simulação disponíveis para entidades (jogador, armas, inimigos). */
export interface SimHost {
  tick: number;
  events: EventQueue;
  geo: LevelGeometry;
  rng: Rng;
  spawnPlayerShot(): PlayerProjectile | null;
  requestHitstop(ticks: number): void;
  requestSuperFreeze(ticks: number): void;
  /** preenche out com a posição do alvo mais próximo; false se não houver */
  findTarget(x: number, y: number, out: { x: number; y: number }): boolean;
  /** limite visível da câmera (para despawn e limites) */
  viewLeft: number;
  viewRight: number;
}
