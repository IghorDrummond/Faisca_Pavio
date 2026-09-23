/**
 * TEST-21 — Analisador de ROTA DE FUGA.
 * Simula um ataque isolado (sem interferência do jogador) e faz uma busca de alcançabilidade no tempo
 * sobre os estados do jogador: posição x (baldes de 8 px ≈ 1 tick de corrida), em pé, agachado,
 * arco de pulo alto e arco de pulo baixo. Se em algum tick nenhum estado alcançável estiver livre,
 * o ataque é injusto para aquela semente/posição inicial.
 *
 * Aproximações (conservadoras): sem dash nem parry; projéteis mirados usam a posição inicial do jogador.
 */
import { BattleSim } from './battle';
import { createBossBattle } from './factory';
import { circleAabbRaw } from './geom';
import { Btn } from './input';
import type { BossDef, DifficultyId } from './types';
import type { EnemyProjectile } from './projectiles';
import type { Hazard } from './hazards';
import { PLAYER_TUNING as T, PLANE_TUNING } from '../data/tuning';
import { DIFFICULTIES } from '../data/difficulty';
import { DEFAULT_LOADOUT } from './factory';

const BUCKET = 8;
const NB = Math.ceil(1920 / BUCKET);
const HW = T.hurtW / 2;

interface Arc {
  dy: number[];
}

let arcsCache: { full: Arc; tap: Arc } | null = null;

/** Arcos de pulo reais (medidos na física do jogador). */
function jumpArcs(): { full: Arc; tap: Arc } {
  if (arcsCache) return arcsCache;
  const measure = (hold: number): Arc => {
    const sim = new BattleSim({
      mode: 'ground',
      boss: null,
      module: null,
      difficulty: DIFFICULTIES.normal,
      seed: 1,
      players: [
        { character: 'faisca', loadout: DEFAULT_LOADOUT, joined: true },
        { character: 'pavio', loadout: DEFAULT_LOADOUT, joined: false },
      ],
      floorY: 900,
      left: 0,
      right: 1920,
      platforms: [],
      spawnX: [960, 800],
      spawnY: 900,
    });
    for (let i = 0; i < 40; i++) {
      sim.feedInput(0, 0);
      sim.step();
    }
    const p = sim.players[0]!;
    const dy: number[] = [];
    for (let i = 0; i < 120; i++) {
      sim.feedInput(0, i < hold ? Btn.Jump : 0);
      sim.step();
      sim.events.clear();
      if (i > 0 && p.grounded) break;
      dy.push(p.y - 900);
    }
    return { dy };
  };
  arcsCache = { full: measure(60), tap: measure(1) };
  return arcsCache;
}

interface Band {
  top: number;
  bot: number;
}

export interface EscapeResult {
  ok: boolean;
  ticks: number;
  failTick: number;
  startX: number;
  reason: string;
}

interface Active {
  shots: EnemyProjectile[];
  hazards: Hazard[];
}

function collectActive(sim: BattleSim, out: Active): void {
  out.shots.length = 0;
  out.hazards.length = 0;
  for (const s of sim.enemyShots.items) if (s.active && s.warn === 0) out.shots.push(s);
  for (const h of sim.hazards.items) if (h.active && h.damaging) out.hazards.push(h);
}

/** Marca em `row` os baldes x onde a hurtbox (faixa vertical band) colide com algo perigoso. */
function markDanger(sim: BattleSim, act: Active, band: Band, row: Uint8Array): void {
  row.fill(0);
  const cy = (band.top + band.bot) / 2;
  const hh = (band.bot - band.top) / 2;
  const markInterval = (x0: number, x1: number): void => {
    const a = Math.max(0, Math.floor((x0 - HW) / BUCKET));
    const b = Math.min(NB - 1, Math.ceil((x1 + HW) / BUCKET));
    for (let i = a; i <= b; i++) row[i] = 1;
  };
  const circle = (x: number, y: number, r: number): void => {
    const dy = y < band.top ? band.top - y : y > band.bot ? y - band.bot : 0;
    if (dy >= r) return;
    const w = Math.sqrt(r * r - dy * dy);
    markInterval(x - w, x + w);
  };
  for (const s of act.shots) circle(s.x, s.y, s.r * 0.9);
  for (const h of act.hazards) {
    switch (h.type) {
      case 'sweep': {
        const c = Math.cos(h.angle);
        const s = Math.sin(h.angle);
        if (h.bob > 0) circle(h.pivotX + c * h.length, h.pivotY + s * h.length, h.bob);
        else {
          const inner = h.length * h.safeInner;
          for (let d = inner; d <= h.length; d += h.w / 2) circle(h.pivotX + c * d, h.pivotY + s * d, h.w / 2);
        }
        break;
      }
      case 'laser': {
        const len = Math.hypot(h.x2 - h.x, h.y2 - h.y);
        const n = Math.max(1, Math.ceil(len / (h.w / 2)));
        for (let k = 0; k <= n; k++) circle(h.x + ((h.x2 - h.x) * k) / n, h.y + ((h.y2 - h.y) * k) / n, h.w / 2);
        break;
      }
      case 'ring': {
        // só testa baldes cuja faixa horizontal cruza o anel
        const outer = h.radius + h.thickness / 2 + hh + HW;
        const dyMin = h.y < band.top ? band.top - h.y : h.y > band.bot ? h.y - band.bot : 0;
        if (dyMin > outer) break;
        const reach = Math.sqrt(outer * outer - dyMin * dyMin);
        const a = Math.max(0, Math.floor((h.x - reach) / BUCKET));
        const bb = Math.min(NB - 1, Math.ceil((h.x + reach) / BUCKET));
        const inner = Math.max(0, h.radius - h.thickness / 2 - hh - HW);
        for (let i = a; i <= bb; i++) {
          if (row[i]) continue;
          const bx = i * BUCKET + BUCKET / 2;
          const dx = Math.abs(bx - h.x);
          // centro da caixa muito dentro do anel interno → seguro
          const far = Math.hypot(dx + HW, Math.max(Math.abs(band.top - h.y), Math.abs(band.bot - h.y)));
          if (far < inner) continue;
          if (h.hits({ x: bx, y: cy, hw: HW, hh })) row[i] = 1;
        }
        break;
      }
      default:
        if (Math.abs(h.y - cy) < h.h / 2 + hh) markInterval(h.x - h.w / 2, h.x + h.w / 2);
    }
  }
  // corpo do chefe com dano de contato
  const b = sim.boss;
  if (b) {
    for (const t of sim.bossPartBoxes) {
      if (t.contact && Math.abs(t.y - cy) < t.hh + hh) markInterval(t.x - t.hw, t.x + t.hw);
    }
  }
}

/** Analisa um ataque (com ou sem a trilha ambiente da fase). */
export function analyzeAttack(boss: BossDef, phaseIndex: number, attackId: string, difficulty: DifficultyId, seed: number): EscapeResult {
  const sim = createBossBattle(boss, { difficulty, seed });
  sim.invincible = true;
  const b = sim.boss!;
  const p = sim.players[0]!;
  // posição inicial derivada da semente (fora do corpo do chefe)
  const rngStart = ((seed * 2654435761) >>> 0) / 4294967296;
  let startX = 120 + rngStart * 1100;
  // intro até a fase desejada
  for (let i = 0; i < 200 && b.state === 'intro'; i++) {
    sim.feedInput(0, 0);
    sim.step();
  }
  b.startAtPhase(phaseIndex);
  sim.clearEnemyStuff(false);
  p.x = p.px = startX;
  p.y = p.py = sim.floorY;
  // avança o necessário para existir o corpo e alvos
  sim.feedInput(0, 0);
  sim.step();
  // não pode começar dentro do corpo do chefe
  for (const t of sim.targets) if (t.owner === 'boss' && t.contact && Math.abs(t.x - startX) < t.hw + HW + 30 && t.y + t.hh > sim.floorY - 120) startX = Math.max(60, t.x - t.hw - HW - 80);
  p.x = p.px = startX;
  b.forceAttack(attackId);
  const arcs = jumpArcs();
  const F = arcs.full.dy.length;
  const S = arcs.tap.dy.length;
  const MODES = 2 + F + S;
  const bands: Band[] = [];
  const stand = T.hurtH;
  const crouch = T.hurtH * T.crouchHeightFactor;
  const floor = sim.floorY;
  const bandAt = (dy: number, h: number): Band => ({ top: floor + dy - h - 2, bot: floor + dy - 2 });
  bands.push(bandAt(0, stand), bandAt(0, crouch));
  for (const d of arcs.full.dy) bands.push(bandAt(d, stand));
  for (const d of arcs.tap.dy) bands.push(bandAt(d, stand));
  let cur = new Uint8Array(MODES * NB);
  let next = new Uint8Array(MODES * NB);
  const danger = new Uint8Array(MODES * NB);
  const row = new Uint8Array(NB);
  const act: Active = { shots: [], hazards: [] };
  cur[0 * NB + Math.round(startX / BUCKET)] = 1;
  const maxTicks = 60 * 16;
  let t = 0;
  let quietTicks = 0;
  for (; t < maxTicks; t++) {
    // congela a seleção de novos ataques após o analisado
    if (b.state === 'idle' || b.state === 'breather') b.gapTimer = 99999;
    sim.feedInput(0, 0);
    p.x = p.px = startX;
    sim.step();
    sim.events.clear();
    collectActive(sim, act);
    for (let m = 0; m < MODES; m++) {
      markDanger(sim, act, bands[m]!, row);
      danger.set(row, m * NB);
    }
    next.fill(0);
    let any = false;
    const lo = Math.max(1, Math.floor((Math.max(sim.geo.left, sim.viewLeft) + HW + T.edgeMargin) / BUCKET));
    const hi = Math.min(NB - 2, Math.floor((Math.min(sim.geo.right, sim.viewRight) - HW - T.edgeMargin) / BUCKET));
    const set = (m: number, x: number): void => {
      if (x < lo || x > hi) return;
      const idx = m * NB + x;
      if (!danger[idx] && !next[idx]) {
        next[idx] = 1;
        any = true;
      }
    };
    for (let m = 0; m < MODES; m++) {
      const base = m * NB;
      for (let x = lo; x <= hi; x++) {
        if (!cur[base + x]) continue;
        if (m === 0) {
          set(0, x - 1);
          set(0, x);
          set(0, x + 1);
          set(1, x);
          set(2, x);
          set(2 + F, x);
        } else if (m === 1) {
          set(1, x);
          set(0, x);
        } else if (m < 2 + F) {
          const k = m - 2;
          const nm = k + 1 >= F ? 0 : m + 1;
          set(nm, x - 1);
          set(nm, x);
          set(nm, x + 1);
        } else {
          const k = m - 2 - F;
          const nm = k + 1 >= S ? 0 : m + 1;
          set(nm, x - 1);
          set(nm, x);
          set(nm, x + 1);
        }
      }
    }
    if (!any) return { ok: false, ticks: t, failTick: t, startX, reason: `sem estado seguro no tick ${t} (ataque ${attackId})` };
    const tmp = cur;
    cur = next;
    next = tmp;
    const quiet = !b.attackRunning && sim.enemyShots.activeCount === 0 && sim.hazards.activeCount === 0 && b.emitterActiveCount === 0;
    quietTicks = quiet ? quietTicks + 1 : 0;
    if (quietTicks > 10) break;
  }
  return { ok: true, ticks: t, failTick: -1, startX, reason: '' };
}

/** Versão aérea: grade 2D (baldes de 16 px) com movimento livre em 8 direções. */
export function analyzeAirAttack(boss: BossDef, phaseIndex: number, attackId: string, difficulty: DifficultyId, seed: number): EscapeResult {
  const sim = createBossBattle(boss, { difficulty, seed });
  sim.invincible = true;
  const b = sim.boss!;
  const p = sim.players[0]!;
  const G = 16;
  const W = Math.ceil(1920 / G);
  const H = Math.ceil(1080 / G);
  for (let i = 0; i < 200 && b.state === 'intro'; i++) {
    sim.feedInput(0, 0);
    sim.step();
  }
  b.startAtPhase(phaseIndex);
  sim.clearEnemyStuff(false);
  const rs = ((seed * 2654435761) >>> 0) / 4294967296;
  const sx = 200 + rs * 500;
  const sy = 200 + ((rs * 7.31) % 1) * 700;
  p.x = p.px = sx;
  p.y = p.py = sy;
  b.forceAttack(attackId);
  let cur = new Uint8Array(W * H);
  let next = new Uint8Array(W * H);
  const danger = new Uint8Array(W * H);
  cur[Math.round(sy / G) * W + Math.round(sx / G)] = 1;
  const r = PLANE_TUNING.hurtR;
  // velocidade ~420 px/s = 7 px/tick → ~1 balde a cada 2 ticks (conservador)
  let t = 0;
  let quiet = 0;
  for (; t < 60 * 16; t++) {
    if (b.state === 'idle' || b.state === 'breather') b.gapTimer = 99999;
    sim.feedInput(0, 0);
    p.x = p.px = sx;
    p.y = p.py = sy;
    sim.step();
    sim.events.clear();
    danger.fill(0);
    for (let gy = 4; gy < H - 4; gy++) {
      for (let gx = 3; gx < W - 3; gx++) {
        const cx = gx * G + G / 2;
        const cy = gy * G + G / 2;
        let d = 0;
        for (const s of sim.enemyShots.items) {
          if (s.active && s.warn === 0 && circleAabbRaw(s.x, s.y, s.r * 0.9, cx, cy, r, r * 0.75)) {
            d = 1;
            break;
          }
        }
        if (!d) for (const h of sim.hazards.items) if (h.active && h.hits({ x: cx, y: cy, hw: r, hh: r * 0.75 })) d = 1;
        if (!d) for (const tg of sim.bossPartBoxes) if (tg.contact && Math.abs(tg.x - cx) < tg.hw + r && Math.abs(tg.y - cy) < tg.hh + r * 0.75) d = 1;
        danger[gy * W + gx] = d;
      }
    }
    next.fill(0);
    let any = false;
    const moveNow = t % 2 === 0;
    for (let gy = 4; gy < H - 4; gy++) {
      for (let gx = 3; gx < W - 3; gx++) {
        if (!cur[gy * W + gx]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!moveNow && (dx || dy)) continue;
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 3 || nx >= W - 3 || ny < 4 || ny >= H - 4) continue;
            const i = ny * W + nx;
            if (!danger[i] && !next[i]) {
              next[i] = 1;
              any = true;
            }
          }
        }
      }
    }
    if (!any) return { ok: false, ticks: t, failTick: t, startX: sx, reason: `sem célula segura no tick ${t} (ataque ${attackId})` };
    const tmp = cur;
    cur = next;
    next = tmp;
    const q = !b.attackRunning && sim.enemyShots.activeCount === 0 && sim.hazards.activeCount === 0 && b.emitterActiveCount === 0;
    quiet = q ? quiet + 1 : 0;
    if (quiet > 10) break;
  }
  return { ok: true, ticks: t, failTick: -1, startX: sx, reason: '' };
}
