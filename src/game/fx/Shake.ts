/** Tremor de tela central por "trauma" com decaimento e multiplicador global (0–100%). */
export class Shake {
  trauma = 0;
  decay = 1.6;
  maxOffset = 22;
  maxAngle = 0.012;
  multiplier = 1;
  x = 0;
  y = 0;
  angle = 0;
  private t = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - this.decay * dt);
    const k = this.trauma * this.trauma * this.multiplier;
    // ruído suave (somas de senos) — determinístico e barato
    this.x = this.maxOffset * k * (Math.sin(this.t * 53.1) * 0.6 + Math.sin(this.t * 31.7) * 0.4);
    this.y = this.maxOffset * k * (Math.sin(this.t * 47.3 + 1.3) * 0.6 + Math.sin(this.t * 23.9) * 0.4);
    this.angle = this.maxAngle * k * Math.sin(this.t * 41.3);
  }

  reset(): void {
    this.trauma = 0;
    this.x = this.y = this.angle = 0;
  }
}
