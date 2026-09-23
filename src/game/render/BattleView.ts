import Phaser from 'phaser';
import type { BattleSim } from '../../core/battle';
import { PARRY_COLOR } from '../../core/constants';
import { lerp } from '../../core/geom';
import type { Hazard } from '../../core/hazards';
import type { PlayerSim } from '../../core/player';
import { SettingsService } from '../../services/settings';
import { FxPool } from '../fx/FxPool';
import { Shake } from '../fx/Shake';
import { BOSS_VISUALS, type BossVisual } from './bossVisuals';
import { AssetPackLoader } from '../assets';

const PLAYER_ORIGIN_Y = 208 / 220;
const AIM_ANIM = ['aim_fwd', 'aim_diagdown', 'aim_down', 'aim_diagdown', 'aim_fwd', 'aim_diagup', 'aim_up', 'aim_diagup'];

interface PlayerView {
  spr: Phaser.GameObjects.Sprite;
  ghosts: Phaser.GameObjects.Sprite[];
  clone: Phaser.GameObjects.Sprite;
  ballJump: boolean;
  lastShotTick: number;
  squash: number;
  ghostTimer: number;
  halo: Phaser.GameObjects.Image;
  star: Phaser.GameObjects.Image;
}

/** Renderizador da batalha: lê o estado da simulação e desenha (interpolando por alpha). */
export class BattleView {
  readonly scene: Phaser.Scene;
  sim: BattleSim;
  readonly fx: FxPool;
  readonly shake = new Shake();
  private players: PlayerView[] = [];
  private bodies = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyPool: Phaser.GameObjects.Sprite[] = [];
  private shotPool: Phaser.GameObjects.Sprite[] = [];
  private hazardImgs: Phaser.GameObjects.Image[] = [];
  private rods: Phaser.GameObjects.Image[] = [];
  private gfx: Phaser.GameObjects.Graphics;
  private warnGfx: Phaser.GameObjects.Graphics;
  private beamGfx: Phaser.GameObjects.Graphics;
  private layers: { img: Phaser.GameObjects.Image; sway: number; baseY: number }[] = [];
  private visual: BossVisual | null;
  private extra = new Map<string, Phaser.GameObjects.Sprite>();
  private time = 0;
  flashTimer = 0;
  private starMode = false;
  outline = false;

  constructor(scene: Phaser.Scene, sim: BattleSim, bossId: string | null) {
    this.scene = scene;
    this.sim = sim;
    this.visual = bossId ? (BOSS_VISUALS[bossId] ?? null) : null;
    this.fx = new FxPool(scene, 140, 50);
    this.gfx = scene.add.graphics().setDepth(18);
    this.warnGfx = scene.add.graphics().setDepth(45);
    this.beamGfx = scene.add.graphics().setDepth(34);
    this.buildLayers();
    for (const p of sim.players) this.players.push(this.makePlayer(p));
    for (let i = 0; i < 260; i++) this.enemyPool.push(scene.add.sprite(-500, -500, 'fx', 'ep_seed_0').setVisible(false).setDepth(40));
    for (let i = 0; i < 140; i++) this.shotPool.push(scene.add.sprite(-500, -500, 'fx', 'shot_reta_0').setVisible(false).setDepth(35).setAlpha(0.9));
    for (let i = 0; i < 24; i++) {
      this.hazardImgs.push(scene.add.image(-500, -500, 'fx', 'impact_0').setVisible(false).setDepth(16));
      this.rods.push(scene.add.image(-500, -500, 'fx', 'impact_0').setVisible(false).setDepth(15).setOrigin(0.5, 0));
    }
    this.applySettings();
  }

  applySettings(): void {
    const s = SettingsService.all;
    this.shake.multiplier = s.shake;
    this.starMode = s.parryStar;
    this.outline = s.projOutline;
  }

  private buildLayers(): void {
    const v = this.visual;
    if (!v) return;
    for (const l of v.layers) {
      if (!this.scene.textures.exists(l.key)) continue;
      const img = this.scene.add.image(0, l.y, l.key).setOrigin(0, 0).setDepth(l.depth).setAlpha(l.alpha ?? 1);
      const tex = this.scene.textures.get(l.key).getSourceImage() as { width: number };
      // camadas renderizadas em meia resolução são esticadas para 1920 de largura
      img.setScale(1920 / tex.width);
      this.layers.push({ img, sway: l.sway ?? 0, baseY: l.y });
    }
  }

  setArena(layers: { key: string; depth: number; y: number; alpha?: number; sway?: number }[]): void {
    for (const l of this.layers) l.img.destroy();
    this.layers.length = 0;
    for (const l of layers) {
      if (!this.scene.textures.exists(l.key)) continue;
      const img = this.scene.add.image(0, l.y, l.key).setOrigin(0, 0).setDepth(l.depth).setAlpha(l.alpha ?? 1);
      const tex = this.scene.textures.get(l.key).getSourceImage() as { width: number };
      img.setScale(1920 / tex.width);
      this.layers.push({ img, sway: l.sway ?? 0, baseY: l.y });
    }
  }

  private makePlayer(p: PlayerSim): PlayerView {
    const s = this.scene;
    const key = `${p.character}_idle`;
    const spr = s.add.sprite(p.x, p.y, 'players', `${key}_0`).setOrigin(0.5, PLAYER_ORIGIN_Y).setDepth(30 - p.index);
    const ghosts: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 3; i++) ghosts.push(s.add.sprite(0, 0, 'players', `${key}_0`).setOrigin(0.5, PLAYER_ORIGIN_Y).setDepth(29).setVisible(false).setTint(0xf5c580).setAlpha(0.5));
    const clone = s.add.sprite(0, 0, 'players', `${key}_0`).setOrigin(0.5, PLAYER_ORIGIN_Y).setDepth(28).setVisible(false).setTint(0xff9b2e).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
    const halo = s.add.image(0, 0, 'fx', 'ghost_halo').setDepth(31).setVisible(false);
    const star = s.add.image(0, 0, 'fx', 'parry_star').setDepth(41).setVisible(false);
    return { spr, ghosts, clone, ballJump: false, lastShotTick: -100, squash: 0, ghostTimer: 0, halo, star };
  }

  /** Processa eventos da simulação para efeitos visuais (chamado antes do render do quadro). */
  onEvent(type: string, x: number, y: number, a: number, b: number, player: number, str: string): void {
    const fx = this.fx;
    const reduce = SettingsService.get('reduceFlashes');
    switch (type) {
      case 'shoot': {
        const pv = this.players[player];
        if (pv) pv.lastShotTick = this.sim.tick;
        fx.spawn('muzzle', x, y, { scale: b ? 1.3 : 0.7, rot: a, depth: 36, add: true });
        break;
      }
      case 'hitBoss':
        fx.spawn(b ? 'hit_star' : 'impact', x, y, { scale: b ? 1 : 0.55 + Math.random() * 0.2, rot: Math.random() * 6, depth: 51 });
        break;
      case 'projDie':
        if (a === 1 && b === 2) break;
        fx.spawn('fizzle', x, y, { scale: b === 1 ? 0.6 : 0.9 });
        break;
      case 'explosion':
        fx.spawn('explosion', x, y, { scale: Math.max(0.5, a / 110), depth: 52 });
        this.shake.add(0.18);
        break;
      case 'parry':
        fx.spawn('parry_flash', x, y, { scale: 1, depth: 53, add: !reduce });
        if (!reduce) this.flashTimer = 0.06;
        this.shake.add(0.12);
        break;
      case 'playerHurt':
        fx.spawn('hit_star', x, y, { scale: 1.6, depth: 53 });
        break;
      case 'playerDie':
        fx.spawn('smoke', x, y - 30, { scale: 1.2, depth: 53 });
        break;
      case 'playerRevive':
        fx.spawn('parry_flash', x, y, { scale: 0.8, depth: 53 });
        break;
      case 'jump': {
        const pv = this.players[player];
        if (pv) pv.ballJump = true;
        fx.spawn('dust', x, y - 10, { scale: 0.8 });
        break;
      }
      case 'land': {
        const pv = this.players[player];
        if (pv) {
          pv.ballJump = false;
          pv.squash = 1;
        }
        fx.spawn('dust', x, y - 12, { scale: 1 });
        break;
      }
      case 'turn':
        fx.spawn('dust', x - a * 20, y - 10, { scale: 0.5, flipX: a < 0 });
        break;
      case 'dash': {
        const pv = this.players[player];
        if (pv) pv.ghostTimer = 0.25;
        fx.spawn('smoke', x - a * 30, y - 60, { scale: 0.6 });
        break;
      }
      case 'ex':
        this.shake.add(0.15);
        break;
      case 'super':
        this.shake.add(0.3);
        if (!reduce) this.flashTimer = 0.08;
        break;
      case 'shake':
        this.shake.add(a);
        break;
      case 'bossPhase':
        this.shake.add(0.5);
        break;
      case 'bossKnockout': {
        this.shake.add(0.8);
        for (let i = 0; i < 6; i++) fx.spawn('explosion', x + (Math.random() - 0.5) * 300, y + (Math.random() - 0.5) * 400, { scale: 0.6 + Math.random() * 0.5, depth: 55 });
        break;
      }
      case 'enemyDie':
        fx.spawn('smoke', x, y, { scale: 1 });
        fx.spawn('impact', x, y, { scale: 1.2 });
        break;
      case 'coin':
        fx.spawn('parry_flash', x, y, { scale: 0.5 });
        break;
      case 'fell':
        fx.spawn('smoke', x, y - 100, { scale: 1 });
        break;
      case 'luckyBlock':
        fx.spawn('parry_flash', x, y, { scale: 0.7, tint: 0xffe27a });
        break;
      default:
        break;
    }
  }

  render(alpha: number, dt: number): void {
    this.time += dt;
    this.shake.update(dt);
    this.fx.update(dt);
    if (this.flashTimer > 0) this.flashTimer -= dt;
    for (const l of this.layers) {
      if (l.sway) l.img.y = l.baseY + Math.sin(this.time * 0.8) * l.sway;
    }
    this.renderBoss(alpha);
    this.renderHazards(alpha);
    this.renderEnemyShots(alpha);
    this.renderPlayerShots(alpha);
    this.renderPlayers(alpha, dt);
    this.renderWarnings(alpha);
  }

  // -------------------------------------------------------------------------------------------

  private renderBoss(alpha: number): void {
    const b = this.sim.boss;
    const v = this.visual;
    if (!b || !v) return;
    for (const body of b.bodies) {
      const bv = v.bodies[body.id];
      if (!bv) continue;
      let spr = this.bodies.get(body.id);
      if (!spr) {
        spr = this.scene.add.sprite(body.x, body.y, 'fx', 'impact_0').setOrigin(bv.origin[0], bv.origin[1]).setDepth(bv.depth ?? 10);
        const atlas = this.sim.config.boss?.id ?? '';
        spr.setScale((bv.scale ?? 1) / AssetPackLoader.atlasScale(atlas));
        this.bodies.set(body.id, spr);
      }
      const visible = body.visible && !(body.defeated && body.anim === 'gone') && !(bv.hideWhenEmpty && !body.def?.parts.length);
      spr.setVisible(visible && (body.id !== 'cage' || b.phaseIndex >= 2));
      if (!spr.visible) continue;
      spr.x = lerp(body.px, body.x, alpha);
      spr.y = lerp(body.py, body.y, alpha);
      if (bv.flip) spr.setFlipX(body.facing === 1);
      const key = bv.anim(b.phaseIndex, body.anim, b.state);
      if (key && this.scene.anims.exists(key) && spr.anims.currentAnim?.key !== key) spr.play(key);
      // flash de dano sem interromper a animação
      // pisca em quadros alternados para não "grudar" com tiro contínuo
      const flashOn = body.flash > 0 && this.sim.tick % 6 < 2;
      if (flashOn) spr.setTint(SettingsService.get('reduceFlashes') ? 0x1e1812 : 0x4a3e32).setTintMode(Phaser.TintModes.ADD);
      else spr.clearTint();
    }
    // extras específicos do Senhor Cuco: o cuco aparece na porta
    const main = b.bodies[0];
    if (this.sim.config.boss?.id === 'cuco' && main) {
      let ck = this.extra.get('cuckoo');
      if (!ck && this.scene.anims.exists('cuco_cuckoo')) {
        ck = this.scene.add.sprite(0, 0, 'cuco', 'cuco_cuckoo_0').setDepth(11).setScale(1 / AssetPackLoader.atlasScale('cuco'));
        this.extra.set('cuckoo', ck);
      }
      if (ck) {
        const show = main.anim === 'cuckoo_out' || main.anim === 'cuckoo_spit';
        ck.setVisible(show);
        if (show) {
          ck.setPosition(lerp(main.px, main.x, alpha) - 40, lerp(main.py, main.y, alpha) - 300);
          const f = main.anim === 'cuckoo_spit' ? 2 + (Math.floor(main.animT / 5) % 2) : Math.floor(main.animT / 5) % 2;
          ck.setFrame(`cuco_cuckoo_${f}`);
        }
      }
      let flee = this.extra.get('flee');
      if (b.state === 'knockout' || b.state === 'dead') {
        if (!flee && this.scene.anims.exists('cuco_flee')) {
          flee = this.scene.add.sprite(main.x - 40, main.y - 300, 'cuco', 'cuco_flee_0').setDepth(60).setScale(1.2 / AssetPackLoader.atlasScale('cuco'));
          flee.play('cuco_flee');
          this.extra.set('flee', flee);
        }
        if (flee) {
          flee.x -= 6;
          flee.y = Math.min(flee.y + 7, 860);
        }
      } else if (flee) {
        flee.destroy();
        this.extra.delete('flee');
      }
    }
  }

  private renderHazards(alpha: number): void {
    const g = this.gfx;
    g.clear();
    let ii = 0;
    let ri = 0;
    const hv = this.visual?.hazards ?? {};
    for (const h of this.sim.hazards.items) {
      if (!h.active || h.phase === 'delay') continue;
      const vis = hv[h.kind];
      const warn = h.phase === 'warn';
      if (h.type === 'sweep') {
        const a = lerp(h.pangle, h.angle, alpha) + (warn ? Math.sin(this.time * 40) * 0.004 : 0);
        const ex = h.pivotX + Math.cos(a) * h.length;
        const ey = h.pivotY + Math.sin(a) * h.length;
        if (vis?.kind === 'pendulum') {
          const rod = this.rods[ri++];
          if (rod) {
            rod.setVisible(true).setTexture(this.atlasFor(vis.rod!), vis.rod!).setPosition(h.pivotX, h.pivotY).setRotation(a - Math.PI / 2);
            rod.setScale(1 / this.scaleOf(vis.rod!), h.length / Math.max(1, rod.frame.realHeight));
          }
          const bob = this.hazardImgs[ii++];
          if (bob) {
            bob.setVisible(true).setTexture(this.atlasFor(vis.image!), vis.image!).setPosition(ex, ey).setRotation(a - Math.PI / 2);
            bob.setScale((h.bob * 2.4) / Math.max(1, bob.frame.realWidth));
          }
        } else {
          g.lineStyle(h.w, 0x241810, 1);
          g.lineBetween(h.pivotX, h.pivotY, ex, ey);
          g.lineStyle(h.w * 0.6, vis?.color ?? 0xb88a3c, 1);
          g.lineBetween(h.pivotX, h.pivotY, ex, ey);
        }
        continue;
      }
      if (warn && (h.type === 'slab' || h.type === 'crosser' || h.type === 'shockwave')) continue; // aviso desenhado em renderWarnings
      const x = lerp(h.px, h.x, alpha);
      const y = lerp(h.py, h.y, alpha);
      switch (h.type) {
        case 'slab':
        case 'crosser': {
          if (vis?.kind === 'image' || vis?.kind === 'crosser') {
            const im = this.hazardImgs[ii++];
            if (im) {
              im.setVisible(true).setTexture(this.atlasFor(vis.image!), vis.image!).setPosition(x, y).setRotation(0).setScale(1 / this.scaleOf(vis.image!));
              im.setFlipX(h.dir > 0);
              if (h.parry) im.setTint(PARRY_COLOR);
              else im.clearTint();
            }
          } else this.drawBlock(g, h, x, y, h.parry ? PARRY_COLOR : 0x8a3b2a);
          break;
        }
        case 'ring': {
          const r = Math.max(4, h.radius);
          if (warn) {
            g.fillStyle(0xf2e6c8, 0.35 + 0.3 * Math.sin(this.time * 30));
            g.fillCircle(h.x, h.y, 30 + h.progress * 30);
            break;
          }
          const a0 = h.gapAngle + h.gapHalf;
          const a1 = h.gapAngle - h.gapHalf + Math.PI * 2;
          g.lineStyle(h.thickness + 10, 0x1c120b, 1);
          g.beginPath();
          g.arc(h.x, h.y, r, a0, a1, false);
          g.strokePath();
          g.lineStyle(h.thickness - 4, vis?.color ?? 0xf2e6c8, 1);
          g.beginPath();
          g.arc(h.x, h.y, r, a0 + 0.01, a1 - 0.01, false);
          g.strokePath();
          g.lineStyle(4, 0xffffff, 0.6);
          g.beginPath();
          g.arc(h.x, h.y, r - h.thickness * 0.25, a0 + 0.02, a1 - 0.02, false);
          g.strokePath();
          break;
        }
        case 'laser': {
          if (warn) {
            this.dotted(g, h.x, h.y, h.x2, h.y2, 0xffe27a, 0.4 + 0.5 * h.progress);
          } else {
            g.lineStyle(h.w + 10, 0x1c120b, 1);
            g.lineBetween(h.x, h.y, h.x2, h.y2);
            g.lineStyle(h.w, vis?.color ?? 0xff5a3a, 1);
            g.lineBetween(h.x, h.y, h.x2, h.y2);
            g.lineStyle(h.w * 0.35, 0xfff1c0, 1);
            g.lineBetween(h.x, h.y, h.x2, h.y2);
          }
          break;
        }
        case 'stomp':
        case 'shockwave':
        case 'crusher': {
          if (warn) break;
          if (vis?.kind === 'image' && vis.image) {
            const im = this.hazardImgs[ii++];
            if (im) {
              im.setVisible(true).setTexture(this.atlasFor(vis.image), vis.image).setPosition(x, y).setRotation(0).setFlipX(h.dir < 0);
              const src = this.scene.textures.getFrame(this.atlasFor(vis.image), vis.image);
              im.setScale(h.w / (src?.realWidth ?? h.w), h.h / (src?.realHeight ?? h.h));
            }
          } else this.drawBlock(g, h, x, y, vis?.color ?? 0x6e5a4a);
          break;
        }
        case 'platform':
        case 'force':
          break;
      }
    }
    for (; ii < this.hazardImgs.length; ii++) this.hazardImgs[ii]!.setVisible(false);
    for (; ri < this.rods.length; ri++) this.rods[ri]!.setVisible(false);
    // plataformas temporárias (tecido) e móveis
    for (const p of this.sim.geo.platforms) {
      if (!p.active || p.kind === 'platform') continue;
      const blink = p.life > 0 && p.life < 30 && Math.floor(p.life / 4) % 2 === 0;
      g.fillStyle(0xc9546a, p.warn > 0 ? 0.35 : blink ? 0.4 : 1);
      g.fillRoundedRect(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha), p.w, 18, 8);
      g.lineStyle(4, 0x1c120b, 1);
      g.strokeRoundedRect(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha), p.w, 18, 8);
    }
  }

  private drawBlock(g: Phaser.GameObjects.Graphics, h: Hazard, x: number, y: number, color: number): void {
    g.fillStyle(0x1c120b, 1);
    g.fillRoundedRect(x - h.w / 2 - 5, y - h.h / 2 - 5, h.w + 10, h.h + 10, 10);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - h.w / 2, y - h.h / 2, h.w, h.h, 8);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(x - h.w / 2 + 6, y - h.h / 2 + 6, h.w * 0.4, Math.min(16, h.h * 0.3), 6);
  }

  private dotted(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, color: number, a: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.floor(len / 28);
    g.lineStyle(6, color, a);
    for (let i = 0; i < n; i += 2) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      g.lineBetween(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
    }
  }

  private atlasCache = new Map<string, string>();

  /** Escala do atlas onde o quadro está. */
  scaleOf(frame: string): number {
    return AssetPackLoader.atlasScale(this.atlasFor(frame));
  }

  /** Descobre em qual atlas está um quadro (cache). */
  atlasFor(frame: string): string {
    const c = this.atlasCache.get(frame);
    if (c) return c;
    for (const key of ['fx', 'players', this.sim.config.boss?.id ?? '', 'enemies1', 'enemies2', 'stage1', 'stage2', 'agulha', 'gramofone', 'bigorna', 'fuligem', 'maestro', 'tutorial']) {
      if (key && this.scene.textures.exists(key) && this.scene.textures.get(key).has(frame)) {
        this.atlasCache.set(frame, key);
        return key;
      }
    }
    return 'fx';
  }

  private renderEnemyShots(alpha: number): void {
    let i = 0;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * 14);
    for (const s of this.sim.enemyShots.items) {
      if (!s.active || s.warn > 0) continue;
      const spr = this.enemyPool[i++];
      if (!spr) break;
      const anim = `ep_${s.kind}${s.parry ? '_p' : ''}`;
      if (spr.anims.currentAnim?.key !== anim) {
        if (this.scene.anims.exists(anim)) spr.play(anim);
        else spr.setFrame('ep_seed_0');
      }
      spr.setVisible(true).setPosition(lerp(s.px, s.x, alpha), lerp(s.py, s.y, alpha)).setRotation(s.spin !== 0 || s.rolling ? s.angle : s.motion === 0 && s.gravity === 0 ? s.angle : 0);
      // tamanho do sprite proporcional ao raio de colisão (hitbox ≈ 85–90% da área desenhada)
      const frame = spr.frame;
      const base = Math.max(frame.realWidth, frame.realHeight) || 60;
      spr.setScale(((s.r * 2) / 0.9) / base * 1.08);
      if (s.parry) spr.setAlpha(pulse);
      else spr.setAlpha(1);
    }
    for (; i < this.enemyPool.length; i++) {
      const spr = this.enemyPool[i]!;
      if (!spr.visible) break;
      spr.setVisible(false);
    }
  }

  private renderPlayerShots(alpha: number): void {
    let i = 0;
    for (const s of this.sim.playerShots.items) {
      if (!s.active) continue;
      const spr = this.shotPool[i++];
      if (!spr) break;
      if (spr.anims.currentAnim?.key !== s.kind && this.scene.anims.exists(s.kind)) spr.play(s.kind);
      spr.setVisible(true).setPosition(lerp(s.px, s.x, alpha), lerp(s.py, s.y, alpha)).setRotation(s.angle);
    }
    for (; i < this.shotPool.length; i++) {
      const spr = this.shotPool[i]!;
      if (!spr.visible) break;
      spr.setVisible(false);
    }
  }

  private animFor(p: PlayerSim, pv: PlayerView): string {
    const ch = p.character;
    if (p.mode === 'plane') {
      if (p.state === 'ghost' || p.state === 'dead') return `${ch}_ghost`;
      if (p.hurtTicks > 0) return `${ch}_plane_hurt`;
      if (p.shrunk) return `${ch}_plane_shrink`;
      if (p.vy < -10) return `${ch}_plane_up`;
      if (p.vy > 10) return `${ch}_plane_down`;
      return `${ch}_plane_idle`;
    }
    const shooting = this.sim.tick - pv.lastShotTick < 8 || p.weapon.charge > 0;
    switch (p.state) {
      case 'intro':
        return `${ch}_intro`;
      case 'run':
        if (shooting) return p.aim === 5 || p.aim === 7 ? `${ch}_run_shoot_up` : `${ch}_run_shoot`;
        return `${ch}_run`;
      case 'crouch':
        return shooting ? `${ch}_crouch_shoot` : `${ch}_crouch`;
      case 'lock':
        return `${ch}_${AIM_ANIM[p.aim] ?? 'aim_fwd'}`;
      case 'jump':
      case 'fall':
        if (shooting) return `${ch}_${AIM_ANIM[p.aim] ?? 'aim_fwd'}`;
        return pv.ballJump ? `${ch}_jump` : `${ch}_fall`;
      case 'dash':
        return `${ch}_dash`;
      case 'parry':
        return `${ch}_parry`;
      case 'hurt':
        return `${ch}_hurt`;
      case 'ex':
        return `${ch}_ex`;
      case 'super':
        return `${ch}_super`;
      case 'dead':
        return `${ch}_death`;
      case 'ghost':
        return `${ch}_ghost`;
      case 'victory':
        return `${ch}_victory`;
      case 'idle':
      default:
        if (shooting || p.aim === 6) return `${ch}_${AIM_ANIM[p.aim] ?? 'aim_fwd'}`;
        return `${ch}_idle`;
    }
  }

  private renderPlayers(alpha: number, dt: number): void {
    const bg = this.beamGfx;
    bg.clear();
    for (const p of this.sim.players) {
      const pv = this.players[p.index];
      if (!pv) continue;
      const show = p.joined && p.state !== 'out';
      pv.spr.setVisible(show);
      pv.halo.setVisible(false);
      pv.star.setVisible(false);
      if (!show) {
        pv.clone.setVisible(false);
        for (const gh of pv.ghosts) gh.setVisible(false);
        continue;
      }
      const x = lerp(p.px, p.x, alpha);
      const y = lerp(p.py, p.y, alpha);
      const anim = this.animFor(p, pv);
      if (pv.spr.anims.currentAnim?.key !== anim && this.scene.anims.exists(anim)) pv.spr.play(anim);
      const recoil = p.recoil > 0 ? p.facing * -2.5 : 0;
      pv.spr.setPosition(x + recoil, p.mode === 'plane' ? y + 60 : y);
      if (p.mode === 'plane') pv.spr.setOrigin(0.5, 0.6);
      pv.spr.setFlipX(p.mode === 'ground' && p.facing < 0);
      // squash de aterrissagem
      if (pv.squash > 0) pv.squash = Math.max(0, pv.squash - dt * 6);
      const sq = pv.squash * 0.18;
      pv.spr.setScale(1 + sq, 1 - sq);
      // piscar na invencibilidade
      const blink = p.invuln > 0 && p.state !== 'ghost' && Math.floor(p.invuln / 3) % 2 === 0;
      pv.spr.setAlpha(p.state === 'ghost' ? 0.8 : blink ? 0.35 : 1);
      if (p.state === 'ghost') {
        pv.spr.setTint(PARRY_COLOR).setTintMode(Phaser.TintModes.MULTIPLY);
        pv.halo.setVisible(true).setPosition(x, y - 190);
        if (this.starMode) pv.star.setVisible(true).setPosition(x + 50, y - 140).setRotation(this.time * 3);
      } else if (p.superKind === 'pavioLongo' && p.superTicks > 0) {
        pv.spr.setTint(0xff8a2a).setTintMode(Phaser.TintModes.ADD);
        if (Math.random() < 0.5) this.fx.spawn('shot_leque', x + (Math.random() - 0.5) * 70, y - 60 - Math.random() * 100, { life: 0.3, vy: -120, scale: 1.2, add: true });
      } else pv.spr.clearTint();
      // rastro do dash
      if (pv.ghostTimer > 0) {
        pv.ghostTimer -= dt;
        pv.ghosts.forEach((gh, i) => {
          gh.setVisible(true)
            .setFrame(pv.spr.frame.name)
            .setPosition(x - p.facing * (i + 1) * 34, y)
            .setFlipX(pv.spr.flipX)
            .setAlpha(0.45 - i * 0.12);
        });
      } else for (const gh of pv.ghosts) gh.setVisible(false);
      // clone do Braseiro Gêmeo
      if (p.cloneTicks > 0) {
        pv.clone.setVisible(true).setFrame(pv.spr.frame.name).setPosition(p.cloneX, p.cloneY + 40).setFlipX(pv.spr.flipX).setAlpha(0.55 + 0.15 * Math.sin(this.time * 20));
      } else pv.clone.setVisible(false);
      // raio da Chama Mestra
      if (p.beamActive) this.drawBeam(bg, p, x, y);
    }
  }

  private drawBeam(g: Phaser.GameObjects.Graphics, p: PlayerSim, x: number, y: number): void {
    const dir = p.mode === 'plane' ? 1 : p.facing;
    const x0 = x + dir * 60;
    const cy = p.mode === 'plane' ? y + 4 : y - 80;
    const len = 1700;
    const wob = Math.sin(this.time * 40) * 6;
    const xL = dir > 0 ? x0 : x0 - len;
    g.fillStyle(0x1c120b, 1);
    g.fillRoundedRect(xL, cy - 62 - wob, len, 124 + wob * 2, 50);
    g.fillStyle(0xff6a2a, 1);
    g.fillRoundedRect(xL, cy - 54 - wob, len, 108 + wob * 2, 44);
    g.fillStyle(0xffb13b, 1);
    g.fillRoundedRect(xL, cy - 34, len, 68, 30);
    g.fillStyle(0xfff1b5, 1);
    g.fillRoundedRect(xL, cy - 14, len, 28, 14);
  }

  /** Avisos: sombras de queda, faixas, marcas no chão, indicadores de borda, brilhos. */
  private renderWarnings(alpha: number): void {
    const g = this.warnGfx;
    g.clear();
    const floor = this.sim.floorY;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 18);
    for (const s of this.sim.enemyShots.items) {
      if (!s.active || s.warn <= 0) continue;
      const k = 1 - s.warn / Math.max(1, s.warnTotal);
      if (s.shadow) {
        g.fillStyle(0x000000, 0.25 + 0.3 * k);
        g.fillEllipse(s.x, floor - 4, (s.r * 2.6) * (0.4 + 0.6 * k), 22);
        g.lineStyle(3, 0xffe27a, 0.4 + 0.4 * pulse);
        g.strokeEllipse(s.x, floor - 4, s.r * 2.8, 26);
      } else if (s.offscreenWarn) {
        // indicador na borda da tela
        const ex = Math.max(40, Math.min(1880, s.x));
        const ey = Math.max(40, Math.min(1040, s.y));
        const ang = Math.atan2(s.vy, s.vx) + Math.PI;
        this.edgeArrow(g, ex, ey, ang, 0.5 + 0.5 * pulse);
      } else {
        g.fillStyle(0xfff6cf, 0.5 + 0.5 * pulse);
        g.fillCircle(s.x, s.y, s.r * (0.5 + 0.5 * k));
      }
    }
    for (const h of this.sim.hazards.items) {
      if (!h.active || h.phase !== 'warn') continue;
      const k = h.progress;
      switch (h.type) {
        case 'slab':
        case 'crosser':
          g.fillStyle(0xffe27a, 0.12 + 0.18 * pulse);
          g.fillRect(0, h.y - h.h / 2, 1920, h.h);
          this.edgeArrow(g, h.dir > 0 ? 40 : 1880, h.y, h.dir > 0 ? Math.PI : 0, 0.5 + 0.5 * pulse);
          break;
        case 'stomp':
          g.fillStyle(0xffe27a, 0.35 + 0.35 * pulse);
          g.fillRect(h.x - h.w / 2, floor - 14, h.w, 14);
          g.fillStyle(0x000000, 0.2 + 0.25 * k);
          g.fillEllipse(h.x, floor - 6, h.w * (0.5 + 0.8 * k), 20);
          break;
        case 'shockwave':
          g.fillStyle(0xffe27a, 0.3 + 0.3 * pulse);
          g.fillTriangle(h.x, floor - h.h, h.x + h.dir * 60, floor - 10, h.x, floor - 10);
          break;
        case 'crusher':
          g.fillStyle(0xffe27a, 0.18 + 0.2 * pulse);
          if (h.side === 'left' || h.side === 'right') g.fillRect(h.side === 'left' ? 0 : 1920 - h.depth, h.y - h.h / 2, h.depth, h.h);
          else g.fillRect(h.x - h.w / 2, h.side === 'top' ? 0 : 1080 - h.depth, h.w, h.depth);
          break;
        case 'force':
          g.lineStyle(4, 0xffe27a, 0.3 + 0.4 * pulse);
          for (let i = 0; i < 4; i++) g.strokeCircle(h.x, 700, 80 + i * 60 + (1 - k) * 60);
          break;
        default:
          break;
      }
    }
    void alpha;
  }

  private edgeArrow(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, a: number): void {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const p = (dx: number, dy: number): [number, number] => [x + dx * c - dy * s, y + dx * s + dy * c];
    const [ax, ay] = p(28, 0);
    const [bx, by] = p(-18, -24);
    const [cx, cy] = p(-18, 24);
    g.fillStyle(0x1c120b, a);
    g.fillTriangle(ax + 4, ay + 4, bx + 4, by + 4, cx + 4, cy + 4);
    g.fillStyle(0xffe27a, a);
    g.fillTriangle(ax, ay, bx, by, cx, cy);
  }

  /** Reset visual completo (retry): esconde tudo e zera efeitos. */
  reset(): void {
    this.fx.clear();
    this.shake.reset();
    for (const s of this.enemyPool) s.setVisible(false);
    for (const s of this.shotPool) s.setVisible(false);
    for (const pv of this.players) {
      pv.ballJump = false;
      pv.squash = 0;
      pv.ghostTimer = 0;
    }
    const flee = this.extra.get('flee');
    if (flee) {
      flee.destroy();
      this.extra.delete('flee');
    }
  }

  /** Objetos de jogo ativos (para detectar vazamento entre retries). */
  get displayCount(): number {
    return this.scene.children.length;
  }
}
