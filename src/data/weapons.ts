import type { CharmDef, CharmId, SuperDef, SuperId, WeaponDef, WeaponId } from '../core/types';

/**
 * Armas. DPS de referência ~30–35 (salvo trade-offs):
 * - Faísca Reta: 4 dano x 8/s = 32 DPS
 * - Leque: 3 x 2.2 dano x 6.4/s ≈ 42 DPS de perto (alcance curto)
 * - Teleguiada: 3 dano x 8/s = 24 DPS
 * - Rojão: 45 dano por ciclo de 0.6s carga + 0.75s recuperação ≈ 33 DPS (menos se errar)
 */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  reta: {
    id: 'reta',
    price: 0,
    fireInterval: 1 / 8,
    damage: 4,
    speed: 2100,
    range: Infinity,
    radius: 12,
    pattern: 'straight',
    projKind: 'shot_reta',
    meterPerDamage: 0.55,
    ex: { kind: 'pierce', damage: 7, count: 3, speed: 1700, radius: 30, hits: 3, projKind: 'ex_reta' },
  },
  leque: {
    id: 'leque',
    price: 4,
    fireInterval: 1 / 6.4,
    damage: 2.2,
    speed: 1500,
    range: 480,
    radius: 13,
    pattern: 'spread',
    spreadDeg: [-15, 0, 15],
    projKind: 'shot_leque',
    meterPerDamage: 0.45,
    ex: { kind: 'ring', damage: 5, count: 10, speed: 900, radius: 18, projKind: 'ex_leque' },
  },
  teleguiada: {
    id: 'teleguiada',
    price: 4,
    fireInterval: 1 / 8,
    damage: 3,
    speed: 1300,
    range: 1900,
    radius: 12,
    pattern: 'homing',
    homingTurn: 9,
    projKind: 'shot_teleguiada',
    meterPerDamage: 0.7,
    ex: { kind: 'swarm', damage: 6, count: 5, speed: 1000, radius: 16, projKind: 'ex_teleguiada' },
  },
  rojao: {
    id: 'rojao',
    price: 4,
    fireInterval: 0.15,
    damage: 45,
    speed: 1250,
    range: Infinity,
    radius: 22,
    pattern: 'charge',
    charge: {
      time: 0.6,
      damage: 45,
      speed: 1250,
      radius: 22,
      explosionRadius: 120,
      weakDamage: 3,
      weakInterval: 0.2,
      weakSpeed: 1600,
      recovery: 0.75,
    },
    projKind: 'shot_rojao',
    meterPerDamage: 0.5,
    ex: { kind: 'split', damage: 16, count: 3, speed: 1100, radius: 26, explosionRadius: 110, projKind: 'ex_rojao' },
  },
};

export const WEAPON_ORDER: WeaponId[] = ['reta', 'leque', 'teleguiada', 'rojao'];

export const SUPERS: Record<SuperId, SuperDef> = {
  chamaMestra: { id: 'chamaMestra', kind: 'beam', duration: 1.5, damagePerHit: 9, hitInterval: 3 / 60 },
  pavioLongo: { id: 'pavioLongo', kind: 'invincible', duration: 3, damagePerHit: 6, hitInterval: 6 / 60 },
  braseiroGemeo: { id: 'braseiroGemeo', kind: 'clone', duration: 5, damagePerHit: 0, hitInterval: 0 },
};

export const SUPER_ORDER: SuperId[] = ['chamaMestra', 'pavioLongo', 'braseiroGemeo'];

export const CHARMS: Record<CharmId, CharmDef> = {
  coracaoCera: { id: 'coracaoCera', price: 3 },
  fumacaPalco: { id: 'fumacaPalco', price: 3 },
  luvaMagnetica: { id: 'luvaMagnetica', price: 3 },
  cartolaSorte: { id: 'cartolaSorte', price: 3 },
};

export const CHARM_ORDER: CharmId[] = ['coracaoCera', 'fumacaPalco', 'luvaMagnetica', 'cartolaSorte'];

/** Efeitos dos amuletos (dados). */
export const CHARM_EFFECTS = {
  coracaoCera: { extraHp: 1, damageMult: 0.95 },
  fumacaPalco: { dashInvuln: true },
  luvaMagnetica: { autoParry: true },
  cartolaSorte: { firstHitFree: true },
} as const;
