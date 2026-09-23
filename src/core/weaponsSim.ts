import { TICK_RATE, secToTicks } from './constants';
import type { SimHost } from './host';
import { DIR8 } from './input';
import type { PlayerSim } from './player';
import type { PlayerProjectile } from './projectiles';
import { PLANE_TUNING } from '../data/tuning';
import { CHARM_EFFECTS, WEAPONS } from '../data/weapons';

/**
 * Pontos de origem dos disparos por direção (relativos aos pés, x espelhado pelo facing).
 * Espelham os metadados de animação ("muzzle") gerados pelo pipeline de arte.
 */
export const MUZZLE: ReadonlyArray<readonly [number, number]> = [
  [58, -78], // 0 frente
  [48, -42], // 1 diag baixo
  [4, -10], // 2 baixo (ar)
  [48, -42], // 3 diag baixo (espelhado)
  [58, -78], // 4 frente (espelhado)
  [46, -128], // 5 diag cima
  [10, -156], // 6 cima
  [46, -128], // 7 diag cima
];
export const MUZZLE_CROUCH: readonly [number, number] = [60, -40];

export class WeaponState {
  cooldown = 0;
  charge = 0;
  wasShooting = false;
  alt = 0;

  reset(): void {
    this.cooldown = 0;
    this.charge = 0;
    this.wasShooting = false;
    this.alt = 0;
  }
}

const tmpTarget = { x: 0, y: 0 };

function muzzleOf(p: PlayerSim, out: { x: number; y: number }): void {
  if (p.mode === 'plane') {
    out.x = p.x + 46;
    out.y = p.y + 4;
    return;
  }
  const m = p.crouching ? MUZZLE_CROUCH : (MUZZLE[p.aim] ?? MUZZLE[0]!);
  const sideSign = p.aim === 6 || p.aim === 2 ? p.facing : DIR8[p.aim]![0] >= 0 ? 1 : -1;
  out.x = p.x + m[0] * sideSign;
  out.y = p.y + m[1];
}

const muzzle = { x: 0, y: 0 };

function damageMult(p: PlayerSim): number {
  return p.loadout.charm === 'coracaoCera' ? CHARM_EFFECTS.coracaoCera.damageMult : 1;
}

function spawnShot(
  p: PlayerSim,
  host: SimHost,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  radius: number,
  range: number,
  kind: string,
  meterPerDamage: number,
): PlayerProjectile | null {
  const s = host.spawnPlayerShot();
  if (!s) return null;
  s.owner = p.index;
  s.x = s.px = x;
  s.y = s.py = y;
  s.vx = Math.cos(angle) * speed;
  s.vy = Math.sin(angle) * speed;
  s.angle = angle;
  s.damage = damage * damageMult(p);
  s.r = radius;
  s.range = range;
  s.travel = 0;
  s.kind = kind;
  s.homingTurn = 0;
  s.pierce = 0;
  s.lastHit = -1;
  s.hitCooldown = 0;
  s.explosionRadius = 0;
  s.splitCount = 0;
  s.life = secToTicks(4);
  s.isEx = false;
  s.meterGain = meterPerDamage;
  s.gravity = 0;
  return s;
}

/** Atualiza a arma ativa: cadência, carga e disparo. */
export function updateWeapon(p: PlayerSim, host: SimHost, shooting: boolean): void {
  const w = p.weapon;
  if (w.cooldown > 0) w.cooldown--;
  if (p.state === 'dash' || p.state === 'dead' || p.state === 'super' || p.exTicks > 0) {
    w.wasShooting = shooting;
    return;
  }

  if (p.mode === 'plane') {
    updatePlaneWeapon(p, host, shooting);
    return;
  }

  const def = WEAPONS[p.currentWeapon];
  if (def.pattern === 'charge' && def.charge) {
    const c = def.charge;
    const full = secToTicks(c.time);
    if (shooting) {
      if (w.cooldown === 0) w.charge++;
      if (p.autoFire && w.charge >= full) {
        fireRocket(p, host, true);
        w.charge = 0;
        w.cooldown = secToTicks(c.recovery);
      }
    } else if (w.wasShooting) {
      // soltou o botão
      if (w.charge >= full) {
        fireRocket(p, host, true);
        w.cooldown = secToTicks(c.recovery);
      } else if (w.cooldown === 0) {
        fireRocket(p, host, false);
        w.cooldown = secToTicks(c.weakInterval);
      }
      w.charge = 0;
    }
    w.wasShooting = shooting;
    return;
  }

  w.wasShooting = shooting;
  if (!shooting || w.cooldown > 0) return;
  w.cooldown = Math.max(1, Math.round(def.fireInterval * TICK_RATE));
  muzzleOf(p, muzzle);
  const dir = DIR8[p.aim] ?? [1, 0];
  const baseAngle = Math.atan2(dir[1], dir[0]);
  p.stats.shotsFired++;
  p.recoil = 4;
  host.events.push('shoot', muzzle.x, muzzle.y, baseAngle, 0, p.index, def.id);
  if (def.pattern === 'spread') {
    for (const deg of def.spreadDeg ?? [0]) {
      spawnShot(p, host, muzzle.x, muzzle.y, baseAngle + (deg * Math.PI) / 180, def.speed, def.damage, def.radius, def.range, def.projKind, def.meterPerDamage);
    }
  } else {
    // alterna levemente a altura dos tiros retos (leitura visual)
    w.alt = (w.alt + 1) % 2;
    const off = def.pattern === 'straight' ? (w.alt === 0 ? -5 : 5) : 0;
    const nx = -Math.sin(baseAngle) * off;
    const ny = Math.cos(baseAngle) * off;
    const s = spawnShot(p, host, muzzle.x + nx, muzzle.y + ny, baseAngle, def.speed, def.damage, def.radius, def.range, def.projKind, def.meterPerDamage);
    if (s && def.pattern === 'homing') s.homingTurn = def.homingTurn ?? 6;
  }
  // clone do Braseiro Gêmeo imita o tiro
  if (p.cloneTicks > 0) {
    const s = spawnShot(p, host, p.cloneX + (muzzle.x - p.x), p.cloneY + (muzzle.y - p.y), baseAngle, def.speed, def.damage, def.radius, def.range, def.projKind, 0);
    if (s && def.pattern === 'homing') s.homingTurn = def.homingTurn ?? 6;
  }
}

function fireRocket(p: PlayerSim, host: SimHost, charged: boolean): void {
  const def = WEAPONS.rojao;
  const c = def.charge!;
  muzzleOf(p, muzzle);
  const dir = DIR8[p.aim] ?? [1, 0];
  const a = Math.atan2(dir[1], dir[0]);
  p.stats.shotsFired++;
  p.recoil = charged ? 8 : 4;
  host.events.push('shoot', muzzle.x, muzzle.y, a, charged ? 1 : 0, p.index, 'rojao');
  const s = spawnShot(
    p,
    host,
    muzzle.x,
    muzzle.y,
    a,
    charged ? c.speed : c.weakSpeed,
    charged ? c.damage : c.weakDamage,
    charged ? c.radius : 10,
    def.range,
    charged ? 'shot_rojao' : 'shot_rojao_weak',
    def.meterPerDamage,
  );
  if (s && charged) s.explosionRadius = c.explosionRadius;
  if (p.cloneTicks > 0) {
    const s2 = spawnShot(p, host, p.cloneX + (muzzle.x - p.x), p.cloneY + (muzzle.y - p.y), a, charged ? c.speed : c.weakSpeed, charged ? c.damage : c.weakDamage, charged ? c.radius : 10, def.range, charged ? 'shot_rojao' : 'shot_rojao_weak', 0);
    if (s2 && charged) s2.explosionRadius = c.explosionRadius;
  }
}

function updatePlaneWeapon(p: PlayerSim, host: SimHost, shooting: boolean): void {
  const w = p.weapon;
  w.wasShooting = shooting;
  if (!shooting || w.cooldown > 0) return;
  muzzleOf(p, muzzle);
  p.stats.shotsFired++;
  if (p.planeWeapon === 'shot') {
    w.cooldown = secToTicks(PLANE_TUNING.shotInterval);
    w.alt = (w.alt + 1) % 2;
    const dmg = PLANE_TUNING.shotDamage * (p.shrunk ? PLANE_TUNING.shrinkDamageMult : 1);
    host.events.push('shoot', muzzle.x, muzzle.y, 0, 0, p.index, 'plane');
    spawnShot(p, host, muzzle.x, muzzle.y + (w.alt ? -8 : 8), 0, PLANE_TUNING.shotSpeed, dmg, p.shrunk ? 8 : 12, Infinity, 'shot_plane', 0.55);
  } else {
    w.cooldown = secToTicks(PLANE_TUNING.bombInterval);
    host.events.push('shoot', muzzle.x, muzzle.y, 0, 1, p.index, 'bomb');
    const dmg = PLANE_TUNING.bombDamage * (p.shrunk ? PLANE_TUNING.shrinkDamageMult : 1);
    const s = spawnShot(p, host, p.x, p.y + 20, 0, 0, dmg, 18, Infinity, 'shot_bomb', 0.5);
    if (s) {
      s.vx = PLANE_TUNING.bombSpeedX;
      s.vy = PLANE_TUNING.bombSpeedY;
      s.gravity = PLANE_TUNING.bombGravity;
      s.explosionRadius = 90;
    }
  }
}

/** Dispara o EX da arma ativa (consome 1 carta — já descontada pelo chamador). */
export function fireEx(p: PlayerSim, host: SimHost): void {
  muzzleOf(p, muzzle);
  if (p.mode === 'plane') {
    const s = spawnShot(p, host, muzzle.x, muzzle.y, 0, 1500, 30, 34, Infinity, 'ex_plane', 0);
    if (s) {
      s.isEx = true;
      s.pierce = 4;
      s.hitCooldown = 0;
    }
    return;
  }
  const def = WEAPONS[p.currentWeapon];
  const ex = def.ex;
  const dir = DIR8[p.aim] ?? [1, 0];
  const a = Math.atan2(dir[1], dir[0]);
  switch (ex.kind) {
    case 'pierce': {
      const s = spawnShot(p, host, muzzle.x, muzzle.y, a, ex.speed, ex.damage, ex.radius, Infinity, ex.projKind, 0);
      if (s) {
        s.isEx = true;
        s.pierce = ex.hits ?? 3;
      }
      break;
    }
    case 'ring': {
      for (let i = 0; i < ex.count; i++) {
        const ang = a + (i / ex.count) * Math.PI * 2;
        const s = spawnShot(p, host, p.x + Math.cos(ang) * 40, p.y - 70 + Math.sin(ang) * 40, ang, ex.speed, ex.damage, ex.radius, 520, ex.projKind, 0);
        if (s) s.isEx = true;
      }
      break;
    }
    case 'swarm': {
      for (let i = 0; i < ex.count; i++) {
        const spread = ((i - (ex.count - 1) / 2) * 22 * Math.PI) / 180;
        const s = spawnShot(p, host, muzzle.x, muzzle.y, a + spread, ex.speed, ex.damage, ex.radius, 2400, ex.projKind, 0);
        if (s) {
          s.isEx = true;
          s.homingTurn = 7;
        }
      }
      break;
    }
    case 'split': {
      const s = spawnShot(p, host, muzzle.x, muzzle.y, a, ex.speed, ex.damage, ex.radius, Infinity, ex.projKind, 0);
      if (s) {
        s.isEx = true;
        s.explosionRadius = ex.explosionRadius ?? 100;
        s.splitCount = ex.count;
      }
      break;
    }
  }
}

/** Busca alvo para projéteis teleguiados (reaproveita objeto temporário). */
export function homingTarget(host: SimHost, x: number, y: number): { x: number; y: number } | null {
  return host.findTarget(x, y, tmpTarget) ? tmpTarget : null;
}
