import Phaser from 'phaser';

interface FxItem {
  s: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  life: number;
  fade: boolean;
  grav: number;
  spin: number;
}

/** Pool de sprites de efeito (impactos, fumaça, poeira, explosões). Nunca cria/destrói em combate. */
export class FxPool {
  private items: FxItem[] = [];
  private cursor = 0;
  private readonly scene: Phaser.Scene;
  maxActive = 160;

  constructor(scene: Phaser.Scene, size: number, depth: number) {
    this.scene = scene;
    for (let i = 0; i < size; i++) {
      const s = scene.add.sprite(-1000, -1000, 'fx', 'impact_0').setVisible(false).setActive(false).setDepth(depth);
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.release(s));
      this.items.push({ s, vx: 0, vy: 0, life: 0, fade: false, grav: 0, spin: 0 });
    }
  }

  private release(s: Phaser.GameObjects.Sprite): void {
    s.setVisible(false).setActive(false);
  }

  spawn(
    anim: string,
    x: number,
    y: number,
    opts: { scale?: number; rot?: number; tint?: number; alpha?: number; vx?: number; vy?: number; life?: number; grav?: number; flipX?: boolean; depth?: number; spin?: number; add?: boolean } = {},
  ): Phaser.GameObjects.Sprite | null {
    if (!this.scene.anims.exists(anim)) return null;
    const n = this.items.length;
    let it: FxItem | undefined;
    for (let k = 0; k < n; k++) {
      const c = this.items[(this.cursor + k) % n]!;
      if (!c.s.active) {
        it = c;
        this.cursor = (this.cursor + k + 1) % n;
        break;
      }
    }
    if (!it) return null;
    const s = it.s;
    s.setActive(true).setVisible(true).setPosition(x, y).setScale(opts.scale ?? 1).setRotation(opts.rot ?? 0).setAlpha(opts.alpha ?? 1).setFlipX(opts.flipX ?? false);
    if (opts.depth !== undefined) s.setDepth(opts.depth);
    s.setBlendMode(opts.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (opts.tint !== undefined) s.setTint(opts.tint);
    else s.clearTint();
    it.vx = opts.vx ?? 0;
    it.vy = opts.vy ?? 0;
    it.life = opts.life ?? 0;
    it.fade = opts.life !== undefined;
    it.grav = opts.grav ?? 0;
    it.spin = opts.spin ?? 0;
    s.play(anim, true);
    return s;
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (!it.s.active) continue;
      if (it.vx || it.vy || it.grav) {
        it.vy += it.grav * dt;
        it.s.x += it.vx * dt;
        it.s.y += it.vy * dt;
      }
      if (it.spin) it.s.rotation += it.spin * dt;
      if (it.fade) {
        it.life -= dt;
        it.s.alpha = Math.max(0, Math.min(1, it.life * 4));
        if (it.life <= 0) this.release(it.s);
      }
    }
  }

  clear(): void {
    for (const it of this.items) this.release(it.s);
  }

  get activeCount(): number {
    let n = 0;
    for (const it of this.items) if (it.s.active) n++;
    return n;
  }
}
