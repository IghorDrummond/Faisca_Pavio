import type Phaser from 'phaser';
import type { BattleSim } from '../../core/battle';
import { PARRY_COLOR } from '../../core/constants';
import { lerp } from '../../core/geom';

/** Cores por camada de colisão (ver docs/HITBOXES.md). */
export const LAYER_COLORS = {
  PlayerHurtbox: 0x33ff66,
  PlayerParry: 0xffffff,
  PlayerProjectile: 0xffc040,
  EnemyHurtbox: 0xff3333,
  EnemyContact: 0xff00aa,
  EnemyProjectile: 0xff7a00,
  Parryable: PARRY_COLOR,
  World: 0x8888ff,
  OneWayPlatform: 0x44aaff,
  Hazard: 0xff2255,
  Warn: 0xffff00,
};

const box = { x: 0, y: 0, hw: 0, hh: 0 };

/** Desenha hitboxes e (no protótipo) a arte geométrica temporária. */
export function drawDebug(g: Phaser.GameObjects.Graphics, sim: BattleSim, alpha: number, filled: boolean): void {
  g.clear();
  const geo = sim.geo;
  // mundo
  g.lineStyle(2, LAYER_COLORS.World, 0.9);
  if (geo.hasFloor) g.lineBetween(0, geo.floorY, 1920, geo.floorY);
  for (const s of geo.solids) g.strokeRect(s.x, s.y, s.w, s.h);
  for (const p of geo.platforms) {
    if (!p.active) continue;
    g.lineStyle(4, LAYER_COLORS.OneWayPlatform, p.warn > 0 ? 0.4 : 1);
    g.lineBetween(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha), lerp(p.px, p.x, alpha) + p.w, lerp(p.py, p.y, alpha));
  }
  // chefe
  const b = sim.boss;
  if (b) {
    for (const body of b.bodies) {
      if (!body.def || body.defeated) continue;
      const bx = lerp(body.px, body.x, alpha);
      const by = lerp(body.py, body.y, alpha);
      const flip = body.facing === 1 ? -1 : 1;
      for (const part of body.def.parts) {
        const col = part.hurt ? LAYER_COLORS.EnemyHurtbox : LAYER_COLORS.EnemyContact;
        if (filled) {
          g.fillStyle(body.flash > 0 ? 0xffffff : 0x6b3b2a, 0.85);
          g.fillRect(bx + part.x * flip - part.w / 2, by + part.y - part.h / 2, part.w, part.h);
        }
        g.lineStyle(3, col, 1);
        g.strokeRect(bx + part.x * flip - part.w / 2, by + part.y - part.h / 2, part.w, part.h);
      }
    }
  }
  // perigos
  for (const h of sim.hazards.items) {
    if (!h.active) continue;
    const warn = h.phase === 'warn' || h.phase === 'delay';
    const col = warn ? LAYER_COLORS.Warn : LAYER_COLORS.Hazard;
    g.lineStyle(3, col, warn ? 0.6 : 1);
    if (h.parry) g.lineStyle(4, PARRY_COLOR, 1);
    switch (h.type) {
      case 'sweep': {
        const a = lerp(h.pangle, h.angle, alpha);
        const ex = h.pivotX + Math.cos(a) * h.length;
        const ey = h.pivotY + Math.sin(a) * h.length;
        g.lineBetween(h.pivotX, h.pivotY, ex, ey);
        if (h.bob > 0) {
          if (filled) {
            g.fillStyle(warn ? 0x886633 : 0xc9a23f, 1);
            g.fillCircle(ex, ey, h.bob);
          }
          g.strokeCircle(ex, ey, h.bob);
        }
        break;
      }
      case 'ring':
        g.beginPath();
        g.arc(h.x, h.y, Math.max(1, h.radius), h.gapAngle + h.gapHalf, h.gapAngle - h.gapHalf + Math.PI * 2, false);
        g.strokePath();
        break;
      case 'laser':
        g.lineStyle(warn ? 2 : h.w, col, warn ? 0.6 : 0.9);
        g.lineBetween(h.x, h.y, h.x2, h.y2);
        break;
      case 'force':
        break;
      case 'platform':
        break;
      default: {
        const x = lerp(h.px, h.x, alpha);
        const y = lerp(h.py, h.y, alpha);
        if (warn && (h.type === 'slab' || h.type === 'crosser')) {
          g.fillStyle(LAYER_COLORS.Warn, 0.15);
          g.fillRect(0, y - h.h / 2, 1920, h.h);
        } else if (warn && h.type === 'stomp') {
          g.fillStyle(LAYER_COLORS.Warn, 0.25);
          g.fillRect(x - h.w / 2, sim.floorY - 16, h.w, 16);
        } else {
          if (filled) {
            g.fillStyle(h.parry ? PARRY_COLOR : 0xb04030, warn ? 0.3 : 0.9);
            g.fillRect(x - h.w / 2, y - h.h / 2, h.w, h.h);
          }
          g.strokeRect(x - h.w / 2, y - h.h / 2, h.w, h.h);
        }
      }
    }
  }
  // projéteis inimigos
  for (const s of sim.enemyShots.items) {
    if (!s.active) continue;
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    if (s.warn > 0) {
      g.lineStyle(2, LAYER_COLORS.Warn, 0.7);
      if (s.shadow) g.strokeEllipse(x, sim.floorY - 4, s.r * 2.4 * (1 - s.warn / Math.max(1, s.warnTotal)) + 10, 14);
      else g.strokeCircle(Math.max(20, Math.min(1900, x)), Math.max(20, y), 18);
      continue;
    }
    const col = s.parry ? LAYER_COLORS.Parryable : LAYER_COLORS.EnemyProjectile;
    if (filled) {
      g.fillStyle(col, 1);
      g.fillCircle(x, y, s.r);
    }
    g.lineStyle(2, s.parry ? 0xffffff : 0x220000, 1);
    g.strokeCircle(x, y, s.r);
  }
  // projéteis do jogador
  for (const s of sim.playerShots.items) {
    if (!s.active) continue;
    g.fillStyle(LAYER_COLORS.PlayerProjectile, filled ? 0.9 : 0);
    g.lineStyle(2, LAYER_COLORS.PlayerProjectile, 1);
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    if (filled) g.fillCircle(x, y, s.r);
    g.strokeCircle(x, y, s.r);
  }
  // jogadores
  for (const p of sim.players) {
    if (!p.joined || p.state === 'out') continue;
    const x = lerp(p.px, p.x, alpha);
    const y = lerp(p.py, p.y, alpha);
    p.hurtbox(box);
    const ox = x - p.x;
    const oy = y - p.y;
    if (filled) {
      const blink = p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0;
      g.fillStyle(p.state === 'ghost' ? PARRY_COLOR : p.index === 0 ? 0xe2593a : 0xf2d27a, blink ? 0.35 : 1);
      g.fillRect(box.x + ox - box.hw, box.y + oy - box.hh, box.hw * 2, box.hh * 2);
    }
    g.lineStyle(2, LAYER_COLORS.PlayerHurtbox, 1);
    g.strokeRect(box.x + ox - box.hw, box.y + oy - box.hh, box.hw * 2, box.hh * 2);
    if (p.parryActive) {
      p.parryBox(box);
      g.lineStyle(2, LAYER_COLORS.PlayerParry, 1);
      g.strokeRect(box.x + ox - box.hw, box.y + oy - box.hh, box.hw * 2, box.hh * 2);
    }
  }
}
