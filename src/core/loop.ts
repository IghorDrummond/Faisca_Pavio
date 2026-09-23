import { TICK_MS } from './constants';

/**
 * Acumulador de passo fixo: a lógica roda a 60 ticks/s independentemente da taxa de quadros.
 * O alpha resultante interpola a renderização entre o estado anterior e o atual.
 */
export class FixedStepper {
  private acc = 0;
  /** limite para não "saltar" a simulação após travadas ou troca de aba */
  maxFrameMs = 250;
  /** multiplicador de velocidade (acessibilidade 70/85/100% e câmera lenta) */
  timeScale = 1;
  alpha = 0;

  /** Retorna quantos ticks devem ser executados neste quadro. */
  advance(frameMs: number): number {
    const dt = Math.min(Math.max(0, frameMs), this.maxFrameMs) * this.timeScale;
    this.acc += dt;
    let n = 0;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      n++;
    }
    this.alpha = this.acc / TICK_MS;
    return n;
  }

  reset(): void {
    this.acc = 0;
    this.alpha = 0;
  }
}
