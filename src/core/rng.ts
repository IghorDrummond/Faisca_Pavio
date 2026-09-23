/**
 * RNG determinístico (sfc32) com semente de 32 bits.
 * Toda aleatoriedade da simulação passa por aqui para garantir reprodutibilidade.
 */
export class Rng {
  private a = 0;
  private b = 0;
  private c = 0;
  private d = 0;
  private seedValue = 0;

  constructor(seed: number) {
    this.reseed(seed);
  }

  get seed(): number {
    return this.seedValue;
  }

  reseed(seed: number): void {
    this.seedValue = seed >>> 0;
    this.a = 0x9e3779b9;
    this.b = 0x243f6a88;
    this.c = 0xb7e15162;
    this.d = this.seedValue ^ 0xdeadbeef;
    for (let i = 0; i < 12; i++) this.nextU32();
  }

  nextU32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** [0, 1) */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Inteiro em [min, max] inclusivo. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Estado serializável (para snapshots de debug). */
  getState(): [number, number, number, number] {
    return [this.a, this.b, this.c, this.d];
  }

  setState(s: readonly [number, number, number, number]): void {
    this.a = s[0];
    this.b = s[1];
    this.c = s[2];
    this.d = s[3];
  }
}

/** Hash simples de string para semente (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
