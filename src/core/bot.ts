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
    let tHH = 60;
    let tHW = 60;
    let best = Infinity;
    for (const t of sim.targets) {
      if (!t.alive) continue;
      const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
      if (d < best) {
        best = d;
        tx = t.x;
        ty = t.y;
        tHH = t.hh;
        tHW = t.hw;
      }
    }
    if (p.mode === 'plane') return bits | this.planeMove(sim, pi, ty);
    if (this.dashCd > 0) this.dashCd--;
    if (this.parryCd > 0) this.parryCd--;
    const mod = sim.module as unknown as { stations?: { goal: string; done: boolean; signX: number }[]; stars?: { alive: boolean; pt: { x: number; y: number } }[] } | null;
    if (mod?.stations) return this.tutorial(sim, pi, mod.stations, mod.stars ?? []);
    if (sim.module && !sim.module.scrolling && !sim.boss) return this.parryHunter(sim, pi);
    if (sim.module?.scrolling && !sim.boss) return this.runner(sim, pi, bits, tx, ty);

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
        // posição com linha de tiro em uma das 8 direções (horizontal, diagonal ou vertical)
        const dxA = Math.abs(tx - x);
        const dyA = sim.floorY - 80 - ty;
        const band = Math.max(40, tHH * 0.8);
        const aimOk = Math.abs(dyA) < band || Math.abs(dxA - dyA) < band * 1.4 || dxA < Math.max(40, tHW * 0.8);
        const score = dg * 10 + body + (aimOk ? 0 : 3) + Math.abs(x - p.x) * 0.01 + Math.abs(x - 600) * 0.002;
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
    // setor de 45° mais alinhado ao alvo (0 = horizontal, 1 = diagonal, 2 = vertical)
    const elev = (Math.atan2(-ay, Math.abs(ax)) * 180) / Math.PI;
    const sector = elev > 67.5 ? 2 : elev > 22.5 ? 1 : 0;
    const toward = ax >= 0 ? Btn.Right : Btn.Left;
    const moving = Math.abs(dx) > 18;
    if (sector === 2) {
      if (!moving && p.grounded) bits = (bits & ~(Btn.Left | Btn.Right)) | Btn.Up;
      else bits |= Btn.Up;
    } else if (sector === 1) {
      if (!moving && p.grounded) bits = (bits & ~(Btn.Left | Btn.Right)) | Btn.Lock | Btn.Up | toward;
      else if ((bits & toward) !== 0) bits |= Btn.Up;
    } else if (!moving && p.grounded && p.facing !== (ax >= 0 ? 1 : -1)) {
      // virar para o alvo sem sair do lugar
      bits |= Btn.Lock | toward;
    }
    // EX / super quando houver cartas
    if (p.cards >= 5 || (p.cards >= 2 && sim.tick % 240 === 0)) bits |= sim.tick % 2 ? Btn.Ex : 0;
    return bits;
  }

  /** Desafios de parry: vai para baixo do alvo ciano mais próximo, pula e aperta pulo de novo encostando. */
  private parryHunter(sim: BattleSim, pi: number): number {
    const p = sim.players[pi]!;
    let bits = 0;
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    const consider = (x: number, y: number, vx: number): void => {
      // antecipa a posição (projéteis andando)
      const fx = x + vx * 0.35;
      const d = Math.abs(fx - p.x) + Math.abs(y - p.y) * 0.3;
      if (d < bd) {
        bd = d;
        best = { x: fx, y };
      }
    };
    for (const pt of sim.parryables) consider(pt.x, pt.y, 0);
    for (const s of sim.enemyShots.items) if (s.active && s.parry && s.warn === 0) consider(s.x, s.y, s.vx);
    const tgt = best as { x: number; y: number } | null;
    if (tgt) {
      if (tgt.x > p.x + 20) bits |= Btn.Right;
      else if (tgt.x < p.x - 20) bits |= Btn.Left;
      const near = Math.abs(tgt.x - p.x) < 110;
      if (p.grounded && near && tgt.y < p.y - 60) this.jumpHold = tgt.y < p.y - 300 ? 30 : 12;
      if (!p.grounded && this.parryCd === 0 && Math.abs(tgt.x - p.x) < 80 && Math.abs(tgt.y - (p.y - 70)) < 100) {
        this.parryCd = 16;
        this.jumpHold = 0;
        return bits | Btn.Jump;
      }
    }
    // evita projéteis comuns
    if (p.grounded && this.danger(sim, p.x, p.y, false, 12) > 0) this.jumpHold = Math.max(this.jumpHold, 16);
    if (this.jumpHold > 0) {
      bits |= Btn.Jump;
      this.jumpHold--;
    }
    return bits;
  }

  /** Run'n'gun: avança para a direita pulando fossos/obstáculos e desviando do perigo imediato. */
  private runner(sim: BattleSim, pi: number, base: number, tx: number, ty: number): number {
    const p = sim.players[pi]!;
    let bits = base | Btn.Right;
    const geo = sim.geo;
    const ahead = p.x + 70;
    const groundAhead = geo.groundTopAt(ahead, 10, p.y);
    const hasPlatformAhead = geo.platforms.some((pl) => pl.active && ahead > pl.x && ahead < pl.x + pl.w && Math.abs(pl.y - p.y) < 4);
    const pitAhead = groundAhead > p.y + 10 && !hasPlatformAhead;
    let blockAhead = false;
    for (const s of geo.solids) if (s.x > p.x && s.x < p.x + 90 && s.y < p.y - 4 && s.y > p.y - 260) blockAhead = true;
    if (p.grounded && (pitAhead || blockAhead)) this.jumpHold = 26;
    // dash no ar para cruzar fossos largos
    if (!p.grounded && p.vy > 0 && geo.groundTopAt(p.x, 10, p.y) === Infinity && p.airDash && this.dashCd === 0) {
      bits |= Btn.Dash;
      this.dashCd = 30;
    }
    if (p.grounded && this.danger(sim, p.x, p.y, false, 12) > 0 && this.danger(sim, p.x, p.y, true, 12) === 0) bits = (bits & ~Btn.Right) | Btn.Down;
    else if (p.grounded && this.danger(sim, p.x + 40, p.y, false, 16) > 1) this.jumpHold = Math.max(this.jumpHold, 20);
    if (this.jumpHold > 0) {
      bits |= Btn.Jump;
      this.jumpHold--;
    }
    // mira nos inimigos (alto → diagonal)
    if (ty < p.y - 250 && Math.abs(tx - p.x) < 500) bits |= Btn.Up;
    // parry em balões/projéteis cianos próximos
    if (!p.grounded && this.parryCd === 0) {
      for (const pt of sim.parryables) {
        if (Math.abs(pt.x - p.x) < 90 && Math.abs(pt.y - (p.y - 70)) < 110) {
          this.parryCd = 20;
          return bits | Btn.Jump;
        }
      }
    }
    if (p.cards >= 1 && sim.tick % 200 === 0) bits |= Btn.Ex;
    return bits;
  }

  /** Tutorial: cumpre o objetivo da estação atual. */
  private tutorial(sim: BattleSim, pi: number, stations: { goal: string; done: boolean; signX: number }[], stars: { alive: boolean; pt: { x: number; y: number } }[]): number {
    const p = sim.players[pi]!;
    const st = stations.find((s) => !s.done);
    if (!st) return 0;
    let bits = 0;
    const tick = sim.tick;
    const goTo = (x: number): void => {
      if (p.x < x - 20) bits |= Btn.Right;
      else if (p.x > x + 20) bits |= Btn.Left;
    };
    switch (st.goal) {
      case 'walk':
        bits |= Btn.Right;
        break;
      case 'jump': {
        bits |= Btn.Right;
        let block = false;
        for (const s of sim.geo.solids) if (s.x > p.x && s.x < p.x + 110 && s.y < p.y - 4) block = true;
        if (block && p.grounded) this.jumpHold = 30;
        break;
      }
      case 'crouch':
        if (p.x < st.signX - 100) bits |= Btn.Right;
        else bits |= Btn.Down;
        break;
      case 'shoot':
        goTo(st.signX + 100);
        bits |= Btn.Shoot;
        break;
      case 'aim':
        goTo(st.signX + 60);
        if (Math.abs(p.x - (st.signX + 60)) < 30) bits = Btn.Lock | Btn.Up | Btn.Right | Btn.Shoot;
        break;
      case 'dash':
        bits |= Btn.Right;
        if (p.grounded && p.x > 4330 && p.x < 4420) this.jumpHold = 30;
        if (!p.grounded && p.vy > -250 && p.x > 4430 && p.airDash && this.dashCd === 0) {
          bits |= Btn.Dash;
          this.dashCd = 60;
        }
        break;
      case 'parry': {
        const s = stars.find((x) => x.alive);
        if (s) {
          goTo(s.pt.x);
          if (p.grounded && Math.abs(p.x - s.pt.x) < 30) this.jumpHold = 14;
          if (!p.grounded && this.parryCd === 0 && Math.abs(s.pt.y - (p.y - 70)) < 100 && Math.abs(s.pt.x - p.x) < 70) {
            this.parryCd = 25;
            this.jumpHold = 0;
            return bits | Btn.Jump;
          }
        } else bits |= Btn.Right;
        break;
      }
      case 'ex':
        goTo(st.signX + 100);
        if (Math.abs(p.x - (st.signX + 100)) < 40 && p.cards >= 1 && tick % 20 === 0) bits |= Btn.Ex;
        break;
      case 'super':
        goTo(st.signX + 150);
        if (Math.abs(p.x - (st.signX + 150)) < 40 && p.cards >= 5 && tick % 20 === 0) bits |= Btn.Ex;
        bits |= Btn.Shoot;
        break;
    }
    if (this.jumpHold > 0) {
      bits |= Btn.Jump;
      this.jumpHold--;
    }
    if (this.dashCd > 0) this.dashCd--;
    if (this.parryCd > 0) this.parryCd--;
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
