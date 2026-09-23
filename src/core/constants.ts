/** Taxa fixa da simulação (ticks por segundo). Nunca depende do FPS de renderização. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const TICK_MS = 1000 / TICK_RATE;

/** Resolução lógica do mundo (px). */
export const WORLD_W = 1920;
export const WORLD_H = 1080;

/** Converte segundos em ticks inteiros (arredonda para o tick mais próximo). */
export function secToTicks(sec: number): number {
  return Math.round(sec * TICK_RATE);
}

/** Converte px/s em px/tick. */
export function pxPerTick(pxPerSec: number): number {
  return pxPerSec / TICK_RATE;
}

/** Cor exclusiva dos objetos de parry. Nenhum outro elemento do jogo pode usá-la. */
export const PARRY_COLOR = 0x2be7f0;
