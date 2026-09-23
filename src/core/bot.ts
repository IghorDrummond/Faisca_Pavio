import type { BattleSim } from './battle';
import { Btn } from './input';
import { type Aabb, circleAabb } from './geom';
import { PLAYER_TUNING as T } from '../data/tuning';

const box: Aabb = { x: 0, y: 0, hw: 0, hh: 0 };
const HORIZON = 24;

/**
 * Bot de playtest: move-se para zonas seguras, atira no alvo mais próximo e tenta parry.
 * Heurística determinística (sem RNG próprio) — serve para detectar travamentos e soft-locks.
 */
export class BotBrain {
  private jumpHold = 0;
  private targetX = 700;
  private retarget = 0;
  private dashCd = 0;
  private parryCd = 0;

  decide(sim: BattleSim, pi: number): number {
    const p = sim.players[pi];
    if (!p || !p.joined) return 0;
    if (!p.alive) {
      // fantasma: nada a fazer; parceiro tenta reviver
      return 0;
    }
    let bits = Btn.Shoot;
    // alvo para mirar
    let tx = 1500;
    let ty = 500;
    let best = Infinity;
    for (const t of sim.targets) {
      if (!t.alive) continue;
      const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
      if (d < best) {
        best = d;
        tx = t.x;
        ty = t.y;
      }
    }
    if (p.mode === 'plane') return bits | this.planeMove(sim, pi, ty);
    if (this.dashCd > 0) this.dashCd--;
    if (this.parryCd > 0) this.parryCd--;

    // escolhe a melhor coluna x (perigo previsto mínimo, preferindo ficar perto)
    this.retarget--;
    const nowDanger = this.danger(sim, p.x, p.y, false);
    if (this.retarget <= 0 || nowDanger > 0) {
      let bestX = p.x;
      let bestScore = Infinity;
      const lo = Math.max(sim.geo.left, sim.viewLeft) + 60;
      const hi = Math.min(sim.geo.right, sim.viewRight) - 60;
      for (let x = lo; x <= hi; x += 80) {
        const dg = this.danger(sim, x, sim.floorY, false);
        // evitar encostar no chefe
        let body = 0;
        for (const t of sim.targets) if (t.owner === 'boss' && Math.abs(t.x - x) < t.hw + 90 && t.y + t.hh > sim.floorY - 200) body += 50;
        const score = dg * 10 + body + Math.abs(x - p.x) * 0.01 + Math.abs(x - 600) * 0.002;
        if (score < bestScore) {
          bestScore = score;
          bestX = x;
        }
      }
      this.targetX = bestX;
      this.retarget = 20;
    }
    const dx = this.targetX - p.x;
    if (Math.abs(dx) > 18) bits |= dx > 0 ? Btn.Right : Btn.Left;

    // perigo imediato: pular, agachar ou dash
    const dStand = this.danger(sim, p.x, p.y, false, 14);
    if (p.grounded && dStand > 0) {
      const dCrouch = this.danger(sim, p.x, p.y, true, 14);
      if (dCrouch === 0) bits |= Btn.Down;
      else {
        this.jumpHold = 18;
        if (this.dashCd === 0 && Math.abs(dx) > 150) {
          bits |= Btn.Dash;
          this.dashCd = 40;
        }
      }
    }
    if (this.jumpHold > 0) {
      bits |= Btn.Jump;
      this.jumpHold--;
    }
    // parry: objeto ciano perto e estamos no ar
    if (!p.grounded && this.parryCd === 0) {
      for (const s of sim.enemyShots.items) {
        if (!s.active || !s.parry || s.warn > 0) continue;
        if (Math.abs(s.x - p.x) < 90 && Math.abs(s.y - (p.y - 70)) < 110) {
          bits = (bits & ~Btn.Jump) | 0;
          this.jumpHold = 0;
          this.parryCd = 20;
          // novo toque de pulo no ar = parry
          return bits | Btn.Jump;
        }
      }
      for (const q of sim.players) {
        if (q !== p && q.state === 'ghost' && Math.abs(q.x - p.x) < 80 && Math.abs(q.y - 60 - (p.y - 70)) < 120) {
          this.parryCd = 20;
          return bits | Btn.Jump;
        }
      }
    }
    // revive: pular em direção ao fantasma do parceiro
    for (const q of sim.players) {
      if (q !== p && q.state === 'ghost' && p.grounded && Math.abs(q.x - p.x) < 200 && q.y > p.y - 400) {
        this.targetX = q.x;
        this.jumpHold = 22;
      }
    }
    // mira: 8 direções em direção ao alvo
    const ax = tx - p.x;
    const ay = ty - (p.y - 80);
    const ang = Math.atan2(ay, ax);
    const deg = (ang * 180) / Math.PI;
    if (deg < -60 && deg > -120) bits |= Btn.Up;
    else if (deg <= -20 && deg >= -60) bits |= Btn.Up;
    else if (deg <= -120 && deg >= -160) bits |= Btn.Up;
    // atirar parado para cima-diagonal usa lock quando o alvo está alto
    if (ay < -250 && Math.abs(dx) <= 18 && p.grounded) bits |= Btn.Lock | (ax > 0 ? Btn.Right : Btn.Left);
    // EX / super quando houver cartas
    if (p.cards >= 5 || (p.cards >= 2 && sim.tick % 240 === 0)) bits |= sim.tick % 2 ? Btn.Ex : 0;
    return bits;
  }

  private planeMove(sim: BattleSim, pi: number, targetY: number): number {
    const p = sim.players[pi]!;
    let bestY = p.y;
    let bestX = p.x;
    let bestScore = Infinity;
    for (let y = 120; y <= 980; y += 70) {
      for (let x = 160; x <= 900; x += 120) {
        const dg = this.dangerCircle(sim, x, y, 40);
        const score = dg * 10 + Math.abs(y - targetY) * 0.004 + Math.hypot(x - p.x, y - p.y) * 0.003;
        if (score < bestScore) {
          bestScore = score;
          bestY = y;
          bestX = x;
        }
      }
    }
    let bits = 0;
    if (bestY < p.y - 12) bits |= Btn.Up;
    else if (bestY > p.y + 12) bits |= Btn.Down;
    if (bestX < p.x - 12) bits |= Btn.Left;
    else if (bestX > p.x + 12) bits |= Btn.Right;
    if (this.dangerCircle(sim, p.x, p.y, 40) > 0) bits |= Btn.Dash;
    for (const s of sim.enemyShots.items) {
      if (s.active && s.parry && s.warn === 0 && Math.hypot(s.x - p.x, s.y - p.y) < 90 && this.parryCd === 0) {
        this.parryCd = 30;
        bits |= Btn.Jump;
      }
    }
    if (this.parryCd > 0) this.parryCd--;
    if (p.cards >= 1 && sim.tick % 180 === 0) bits |= Btn.Ex;
    return bits;
  }

  /** Perigo previsto para uma hurtbox (em pé/agachada) nos próximos ticks. */
  private danger(sim: BattleSim, x: number, feetY: number, crouch: boolean, horizon = HORIZON): number {
    const h = crouch ? T.hurtH * T.crouchHeightFactor : T.hurtH;
    box.hw = T.hurtW / 2 + 16;
    box.hh = h / 2 + 10;
    box.x = x;
    box.y = feetY - h / 2;
    let d = 0;
    for (const s of sim.enemyShots.items) {
      if (!s.active) continue;
      const w = s.warn;
      for (let k = Math.max(0, w); k <= horizon; k += 3) {
        const tt = (k - w) / 60;
        const px = s.x + s.vx * tt;
        const py = s.y + s.vy * tt + 0.5 * s.gravity * tt * tt;
        if (circleAabb(px, py, s.r, box)) {
          d += 1 + (horizon - k) / horizon;
          break;
        }
      }
    }
    for (const hz of sim.hazards.items) {
      if (!hz.active) continue;
      if (hz.hits(box)) d += 3;
      else if (hz.phase === 'warn' || hz.phase === 'active') {
        // aproximação: perigo horizontal avançando
        const futureX = hz.x + hz.dir * hz.speed * (horizon / 60);
        if ((hz.type === 'slab' || hz.type === 'shockwave' || hz.type === 'crosser') && Math.abs(hz.y - box.y) < hz.h / 2 + box.hh) {
          const minX = Math.min(hz.x, futureX) - hz.w / 2;
          const maxX = Math.max(hz.x, futureX) + hz.w / 2;
          if (x > minX - box.hw && x < maxX + box.hw) d += 2;
        }
        if (hz.type === 'stomp' && Math.abs(hz.x - x) < hz.w / 2 + box.hw) d += 2;
        if (hz.type === 'sweep' && hz.bob > 0) {
          const bx = hz.pivotX + Math.cos(hz.angle) * hz.length;
          if (Math.abs(bx - x) < 260) d += 1;
        }
        if (hz.type === 'ring' && hz.phase === 'active') {
          const dist = Math.hypot(x - hz.x, box.y - hz.y);
          const ahead = hz.radius + hz.speed * (horizon / 60);
          if (dist > hz.radius - 20 && dist < ahead + 30 && hz.hits({ x, y: box.y, hw: box.hw, hh: box.hh })) d += 2;
          else if (dist > hz.radius && dist < ahead + 30) {
            const ang = Math.atan2(box.y - hz.y, x - hz.x);
            let da = ang - hz.gapAngle;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            if (Math.abs(da) > hz.gapHalf * 0.7) d += 2;
          }
        }
      }
    }
    return d;
  }

  private dangerCircle(sim: BattleSim, x: number, y: number, r: number): number {
    box.x = x;
    box.y = y;
    box.hw = box.hh = r;
    let d = 0;
    for (const s of sim.enemyShots.items) {
      if (!s.active) continue;
      for (let k = Math.max(0, s.warn); k <= HORIZON; k += 4) {
        const tt = (k - s.warn) / 60;
        if (circleAabb(s.x + s.vx * tt, s.y + s.vy * tt + 0.5 * s.gravity * tt * tt, s.r, box)) {
          d += 1;
          break;
        }
      }
    }
    for (const hz of sim.hazards.items) if (hz.active && hz.hits(box)) d += 3;
    for (const t of sim.targets) if (t.owner === 'boss' && Math.abs(t.x - x) < t.hw + r && Math.abs(t.y - y) < t.hh + r) d += 2;
    return d;
  }
}
