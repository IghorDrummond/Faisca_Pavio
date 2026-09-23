/** Geometria do mundo: blocos sólidos, plataformas atravessáveis (one-way), móveis e que caem. */

export interface SolidRect {
  x: number; // esquerda
  y: number; // topo
  w: number;
  h: number;
}

export class OneWayPlatform {
  x = 0; // esquerda
  y = 0; // topo
  w = 0;
  px = 0;
  py = 0;
  /** movimento: offset senoidal ou caminho de ida e volta */
  moveAx = 0;
  moveAy = 0;
  movePeriod = 0;
  baseX = 0;
  baseY = 0;
  /** cai após ser pisada (ticks até cair; -1 = não cai) */
  fallDelay = -1;
  fallTimer = -1;
  vy = 0;
  /** some depois de N ticks (plataformas de tecido); -1 = permanente */
  life = -1;
  warn = 0;
  active = true;
  kind = 'platform';
  /** deslocamento do último tick (para carregar o jogador) */
  dx = 0;
  dy = 0;
  id = 0;
}

export class LevelGeometry {
  floorY = 900;
  /** limites horizontais jogáveis (podem se mover com a câmera no run'n'gun) */
  left = 0;
  right = 1920;
  /** sem chão contínuo: usa solids */
  hasFloor = true;
  solids: SolidRect[] = [];
  platforms: OneWayPlatform[] = [];
  /** abaixo disso o jogador caiu no fosso */
  killY = 1300;
  private nextPlatformId = 1;

  reset(floorY: number, left: number, right: number, hasFloor: boolean): void {
    this.floorY = floorY;
    this.left = left;
    this.right = right;
    this.hasFloor = hasFloor;
    this.solids.length = 0;
    this.platforms.length = 0;
    this.killY = floorY + 400;
  }

  addPlatform(x: number, y: number, w: number): OneWayPlatform {
    const p = new OneWayPlatform();
    p.x = p.baseX = p.px = x;
    p.y = p.baseY = p.py = y;
    p.w = w;
    p.id = this.nextPlatformId++;
    this.platforms.push(p);
    return p;
  }

  step(tick: number): void {
    for (const p of this.platforms) {
      p.px = p.x;
      p.py = p.y;
      if (!p.active) continue;
      if (p.warn > 0) {
        p.warn--;
      }
      if (p.movePeriod > 0) {
        const ph = (tick / p.movePeriod) * Math.PI * 2;
        p.x = p.baseX + Math.sin(ph) * p.moveAx;
        p.y = p.baseY + Math.sin(ph) * p.moveAy;
      }
      if (p.fallTimer > 0) {
        p.fallTimer--;
        if (p.fallTimer === 0) p.vy = 1;
      }
      if (p.vy > 0) {
        p.vy = Math.min(p.vy + 0.6, 18);
        p.y += p.vy;
        if (p.y > this.killY + 200) p.active = false;
      }
      if (p.life > 0) {
        p.life--;
        if (p.life === 0) p.active = false;
      }
      p.dx = p.x - p.px;
      p.dy = p.y - p.py;
    }
  }

  /** Topo do chão sólido sob x (ou Infinity se fosso). */
  groundTopAt(x: number, halfW: number, feetY: number): number {
    let best = Infinity;
    if (this.hasFloor) best = this.floorY;
    for (const s of this.solids) {
      if (x + halfW > s.x && x - halfW < s.x + s.w && s.y >= feetY - 40 && s.y < best) best = s.y;
    }
    return best;
  }
}
