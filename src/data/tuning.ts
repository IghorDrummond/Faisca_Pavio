/** Tuning do jogador (valores em px, px/s, s). Ajustável sem mexer em código. */
export const PLAYER_TUNING = {
  runSpeed: 490,
  accelTicks: 2,
  decelTicks: 2,
  /** corpo de colisão com o mundo */
  bodyW: 56,
  bodyH: 124,
  /** sprite visual de referência (para documentar hurtbox ~60% x ~75%) */
  spriteW: 96,
  spriteH: 168,
  hurtW: 56,
  hurtH: 110,
  crouchHeightFactor: 0.55,
  parryW: 100,
  parryH: 140,
  jumpHeightFull: 290,
  jumpHeightTap: 120,
  timeToApex: 0.36,
  fallGravityMult: 1.55,
  terminalFall: 1500,
  coyoteTicks: 6,
  jumpBufferTicks: 6,
  dashDistance: 260,
  dashTime: 0.2,
  dashBufferParryTicks: 4,
  parryWindowTicks: 10,
  parryHitstopTicks: 5,
  parryBounce: 1150,
  hurtHitstopTicks: 3,
  invulnTime: 1.5,
  hurtKnockback: 520,
  maxHp: 3,
  deathTime: 0.8,
  ghostRiseSpeed: 70,
  ghostSwaySpeed: 1.6,
  exTime: 0.25,
  superFreezeTime: 0.4,
  /** margem dos limites da arena */
  edgeMargin: 20,
  fallRespawnInvuln: 1.5,
} as const;

/** Tuning do avião de papel (modo aéreo). */
export const PLANE_TUNING = {
  speed: 420,
  shrinkSpeed: 560,
  hurtR: 26,
  shrinkHurtR: 15,
  parryR: 60,
  shotInterval: 0.1,
  shotDamage: 4,
  shrinkDamageMult: 0.5,
  shotSpeed: 1900,
  bombInterval: 0.5,
  bombDamage: 11,
  bombGravity: 1800,
  bombSpeedX: 520,
  bombSpeedY: -300,
  parryWindowTicks: 12,
  parryCooldownTicks: 24,
} as const;

/** Medidor de super. */
export const METER = {
  cards: 5,
  /** pontos por carta */
  perCard: 100,
} as const;
