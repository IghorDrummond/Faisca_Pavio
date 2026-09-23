import Phaser from 'phaser';
import type { BattleSim } from '../../core/battle';
import { PARRY_COLOR } from '../../core/constants';
import { lerp } from '../../core/geom';
import { ChallengeModule } from '../../core/stages/challenge';
import { ENEMY_SPECS } from '../../core/stages/enemies';
import { RunGunModule } from '../../core/stages/runngun';
import { TutorialModule } from '../../core/stages/tutorial';
import { InputService } from '../../platform/input';
import type { Action } from '../../services/settings';
import { style } from '../../ui/theme';

export interface StageTheme {
  layers: { key: string; factor: number; y: number; depth: number; alpha?: number }[];
  floor: number;
  floorDark: number;
  block: number;
}

export const STAGE_THEMES: Record<string, StageTheme> = {
  tutorial: { layers: [{ key: 'bg_tut_far', factor: 0.2, y: 0, depth: -100 }, { key: 'bg_tut_mid', factor: 0.5, y: 0, depth: -90 }], floor: 0x8a6440, floorDark: 0x5a3c22, block: 0x6e4a2c },
  runngun1: { layers: [{ key: 'bg_rg1_far', factor: 0.15, y: 0, depth: -100 }, { key: 'bg_rg1_mid', factor: 0.45, y: 0, depth: -90 }], floor: 0x6e3a2a, floorDark: 0x3a1a14, block: 0x8a5a2e },
  runngun2: { layers: [{ key: 'bg_rg2_far', factor: 0.15, y: 0, depth: -100 }, { key: 'bg_rg2_mid', factor: 0.45, y: 0, depth: -90 }], floor: 0x5a5048, floorDark: 0x2e2824, block: 0x6e5a4a },
  challenge1: { layers: [{ key: 'bg_tut_far', factor: 0, y: 0, depth: -100 }], floor: 0x8a6440, floorDark: 0x5a3c22, block: 0x6e4a2c },
  challenge2: { layers: [{ key: 'bg_tut_far', factor: 0, y: 0, depth: -100 }], floor: 0x8a6440, floorDark: 0x5a3c22, block: 0x6e4a2c },
};

const ENEMY_ANIM: Record<string, string> = {
  parafuso: 'en_parafuso',
  lampada: 'en_lampada',
  sapato: 'en_sapato',
  caixa: 'en_caixa',
  escovinha: 'en_escovinha',
  catavento: 'en_catavento',
  balao: 'en_balao',
  torre: 'en_torre',
  lata: 'en_lata',
};

/** Desenha geometria e entidades de módulos de fase (run'n'gun, tutorial, desafios). */
export class StageView {
  private readonly scene: Phaser.Scene;
  private readonly sim: BattleSim;
  private readonly theme: StageTheme;
  private ground: Phaser.GameObjects.Graphics;
  private tiles: Phaser.GameObjects.TileSprite[] = [];
  private enemySprites: Phaser.GameObjects.Sprite[] = [];
  private coinSprites: Phaser.GameObjects.Sprite[] = [];
  private signTexts: Phaser.GameObjects.Text[] = [];
  private dummySprites: Phaser.GameObjects.Sprite[] = [];
  private starSprites: Phaser.GameObjects.Image[] = [];
  private banner: Phaser.GameObjects.Text;
  private lastSection = -1;
  private arenaLayers = false;

  constructor(scene: Phaser.Scene, sim: BattleSim, stageId: string) {
    this.scene = scene;
    this.sim = sim;
    this.theme = STAGE_THEMES[stageId] ?? STAGE_THEMES.tutorial!;
    for (const l of this.theme.layers) {
      if (!scene.textures.exists(l.key)) continue;
      const src = scene.textures.get(l.key).getSourceImage() as { width: number; height: number };
      const sc = 1920 / src.width;
      const ts = scene.add.tileSprite(0, l.y, 1920 / sc, src.height, l.key).setOrigin(0, 0).setScale(sc).setScrollFactor(0).setDepth(l.depth);
      if (l.alpha !== undefined) ts.setAlpha(l.alpha);
      ts.setData('factor', l.factor);
      ts.setData('sc', sc);
      this.tiles.push(ts);
    }
    this.ground = scene.add.graphics().setDepth(-70);
    for (let i = 0; i < 48; i++) this.enemySprites.push(scene.add.sprite(-500, -500, 'enemies', 'en_parafuso_0').setVisible(false).setDepth(25));
    for (let i = 0; i < 8; i++) this.coinSprites.push(scene.add.sprite(-500, -500, 'fx', 'coin_0').setVisible(false).setDepth(24));
    for (let i = 0; i < 12; i++) this.signTexts.push(scene.add.text(-500, -500, '', style(24, '#1c120b', { wordWrap: { width: 380 }, align: 'center', backgroundColor: '#efe2c4', padding: { x: 14, y: 10 } })).setOrigin(0.5, 1).setDepth(-60).setVisible(false));
    for (let i = 0; i < 6; i++) this.dummySprites.push(scene.add.sprite(-500, -500, 'enemies', 'dummy').setVisible(false).setDepth(22));
    for (let i = 0; i < 8; i++) this.starSprites.push(scene.add.image(-500, -500, 'enemies', 'parry_balloon').setVisible(false).setDepth(41));
    this.banner = scene.add.text(960, 220, '', style(44, '#efe2c4', { stroke: '#1c120b', strokeThickness: 8 })).setOrigin(0.5).setScrollFactor(0).setDepth(900).setAlpha(0);
  }

  render(alpha: number, time: number): void {
    const sim = this.sim;
    const cam = sim.viewLeft;
    for (const ts of this.tiles) {
      const f = ts.getData('factor') as number;
      const sc = ts.getData('sc') as number;
      ts.tilePositionX = (cam * f) / sc;
    }
    this.drawGeometry();
    const mod = sim.module;
    // inimigos
    let ei = 0;
    if (mod instanceof RunGunModule) {
      for (const e of mod.enemies.items) {
        if (!e.active) continue;
        const spr = this.enemySprites[ei++];
        if (!spr) break;
        const anim = e.state === 'dying' ? 'en_poof' : `${ENEMY_ANIM[e.type]}${e.state === 'warn' || e.state === 'attack' ? '_atk' : ''}`;
        const key = this.scene.anims.exists(anim) ? anim : (ENEMY_ANIM[e.type] ?? 'en_parafuso');
        if (spr.anims.currentAnim?.key !== key && this.scene.anims.exists(key)) spr.play(key);
        const sp = ENEMY_SPECS[e.type];
        spr.setVisible(true).setPosition(lerp(e.px, e.x, alpha), lerp(e.py, e.y, alpha) + sp.h / 2).setOrigin(0.5, 1).setFlipX(e.facing > 0);
        if (e.flash > 0) spr.setTint(0x4a3e32).setTintMode(Phaser.TintModes.ADD);
        else spr.clearTint();
        if (e.type === 'balao') spr.setAlpha(0.85 + 0.15 * Math.sin(time * 12));
        else spr.setAlpha(1);
      }
      // moedas
      mod.coins.forEach((c, i) => {
        const s = this.coinSprites[i];
        if (!s) return;
        s.setVisible(!c.taken).setPosition(c.x, c.y + Math.sin(time * 3 + i) * 6);
        if (!c.taken && s.anims.currentAnim?.key !== 'coin') s.play('coin');
      });
      // faixa com o nome da seção
      let sec = 0;
      mod.def.sections.forEach((s, i) => {
        if (sim.viewLeft + 400 >= s.x) sec = i;
      });
      if (mod.phase === 'run' && sec !== this.lastSection) {
        this.lastSection = sec;
        this.banner.setText(mod.def.sections[sec]?.name ?? '').setAlpha(1);
        this.scene.tweens.add({ targets: this.banner, alpha: 0, delay: 1400, duration: 500 });
      }
    }
    for (; ei < this.enemySprites.length; ei++) this.enemySprites[ei]!.setVisible(false);
    // tutorial: placas, alvos e estrelas
    if (mod instanceof TutorialModule) {
      mod.stations.forEach((st, i) => {
        const t = this.signTexts[i];
        if (!t) return;
        t.setVisible(true).setPosition(st.signX, 700).setText(this.expand(st.text) + (st.done ? '  ✓' : st.progress > 0 && st.progress < 1 ? `  ${Math.round(st.progress * 100)}%` : ''));
        t.setAlpha(st.done ? 0.6 : 1);
      });
      mod.dummies.forEach((d, i) => {
        const s = this.dummySprites[i];
        if (!s) return;
        s.setVisible(d.hp > 0).setPosition(d.target.x, d.target.y + d.target.hh).setOrigin(0.5, 1);
        if (d.flash > 0) s.setTint(0x6a5a4a).setTintMode(Phaser.TintModes.ADD);
        else s.clearTint();
        s.setScale(d.superOnly ? 1.3 : 1);
      });
      this.drawStars(mod.stars.map((s) => ({ x: s.pt.x, y: s.pt.y, alive: s.alive })), time);
    } else if (mod instanceof ChallengeModule) {
      this.drawStars(mod.balloons.map((b) => ({ x: b.pt.x, y: b.pt.y, alive: b.alive })), time);
    }
  }

  private drawStars(list: { x: number; y: number; alive: boolean }[], time: number): void {
    list.forEach((s, i) => {
      const img = this.starSprites[i];
      if (!img) return;
      img.setVisible(s.alive).setPosition(s.x, s.y).setScale(1 + 0.06 * Math.sin(time * 10 + i)).setTint(PARRY_COLOR);
    });
    for (let i = list.length; i < this.starSprites.length; i++) this.starSprites[i]!.setVisible(false);
  }

  /** Troca {btn:ação} pelo botão atual do dispositivo em uso (ícones dinâmicos). */
  private expand(text: string): string {
    return text.replace(/\{btn:(\w+)\}/g, (_m, a: string) => `[${InputService.labelFor(0, a as Action)}]`);
  }

  private drawGeometry(): void {
    const g = this.ground;
    g.clear();
    const sim = this.sim;
    const th = this.theme;
    const vl = sim.viewLeft - 50;
    const vr = sim.viewRight + 50;
    if (sim.geo.hasFloor) {
      // arenas (mini-chefe, desafios) têm chão contínuo
      g.fillStyle(0x1c120b, 1);
      g.fillRect(vl, sim.geo.floorY - 4, vr - vl, 200);
      g.fillStyle(th.floor, 1);
      g.fillRect(vl, sim.geo.floorY, vr - vl, 200);
      g.fillStyle(th.floorDark, 1);
      g.fillRect(vl, sim.geo.floorY, vr - vl, 10);
    }
    for (const s of sim.geo.solids) {
      if (s.x + s.w < vl || s.x > vr) continue;
      const isGate = s.w === 40 && s.h === 1000;
      if (isGate) {
        // portão de cortina (abre ao cumprir a estação)
        g.fillStyle(0x1c120b, 1);
        g.fillRect(s.x - 30, s.y, s.w + 60, s.h);
        g.fillStyle(0xa8322a, 1);
        for (let k = 0; k < 4; k++) g.fillRect(s.x - 26 + k * 25, s.y, 22, s.h);
        continue;
      }
      const top = s.y;
      const bottom = Math.min(1080, s.y + s.h);
      g.fillStyle(0x1c120b, 1);
      g.fillRect(s.x - 4, top - 4, s.w + 8, bottom - top + 8);
      const isFloor = s.h >= 300;
      g.fillStyle(isFloor ? th.floor : th.block, 1);
      g.fillRect(s.x, top, s.w, bottom - top);
      g.fillStyle(th.floorDark, 1);
      if (isFloor) {
        g.fillRect(s.x, top, s.w, 10);
        for (let x = s.x + 60; x < s.x + s.w; x += 180) g.fillRect(x, top + 10, 5, bottom - top);
      } else {
        g.lineStyle(5, th.floorDark, 1);
        g.lineBetween(s.x + 6, top + 6, s.x + s.w - 6, bottom - 6);
        g.lineBetween(s.x + s.w - 6, top + 6, s.x + 6, bottom - 6);
      }
    }
    for (const p of sim.geo.platforms) {
      if (!p.active || p.kind !== 'platform') continue;
      if (p.x + p.w < vl || p.x > vr) continue;
      const falling = p.fallDelay > 0;
      const shaking = p.fallTimer > 0 ? Math.sin(p.fallTimer * 2) * 3 : 0;
      g.fillStyle(0x1c120b, 1);
      g.fillRoundedRect(p.x - 4 + shaking, p.y - 4, p.w + 8, 30, 8);
      g.fillStyle(falling ? 0xb89a6a : p.movePeriod > 0 ? 0xc9954a : 0xa8783e, 1);
      g.fillRoundedRect(p.x + shaking, p.y, p.w, 22, 6);
      if (falling) {
        g.lineStyle(3, 0x1c120b, 1);
        g.lineBetween(p.x + p.w * 0.3 + shaking, p.y, p.x + p.w * 0.4 + shaking, p.y + 22);
        g.lineBetween(p.x + p.w * 0.7 + shaking, p.y, p.x + p.w * 0.62 + shaking, p.y + 22);
      }
    }
  }

  /** Arena do mini-chefe: troca o cenário (uma vez). */
  onArena(layers: (keys: string[]) => void, keys: string[]): void {
    if (this.arenaLayers) return;
    this.arenaLayers = true;
    layers(keys);
  }

  reset(): void {
    this.lastSection = -1;
    this.arenaLayers = false;
  }
}
