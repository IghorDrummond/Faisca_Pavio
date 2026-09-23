import { TICK_RATE } from './constants';

/**
 * Relógio musical determinístico da simulação.
 * No navegador, a BattleSim pode receber um provedor externo (AudioService) baseado em
 * audioContext.currentTime; este relógio é usado em testes e como fallback.
 */
export class MusicClock {
  bpm = 120;
  tempoMult = 1;
  beat = 0;

  reset(bpm: number): void {
    this.bpm = bpm;
    this.tempoMult = 1;
    this.beat = 0;
  }

  step(): void {
    this.beat += (this.bpm * this.tempoMult) / 60 / TICK_RATE;
  }

  skip(beats: number): void {
    this.beat += beats;
  }

  tempoUp(mult: number): void {
    this.tempoMult = Math.min(1.6, this.tempoMult * mult);
  }
}
