import type { BodyPhaseDef, BossDef } from '../../core/types';

const bate = (x: number): BodyPhaseDef => ({
  id: 'bate',
  x,
  y: 790,
  parts: [{ id: 'bigorna', x: 0, y: 0, w: 260, h: 200, hurt: true, contact: true }],
  anchors: { top: { x: 0, y: -120 }, face: { x: -60, y: -40 } },
});
const forja = (x: number): BodyPhaseDef => ({
  id: 'forja',
  x,
  y: 790,
  parts: [{ id: 'bigorna', x: 0, y: 0, w: 260, h: 200, hurt: true, contact: true }],
  anchors: { top: { x: 0, y: -120 }, face: { x: -60, y: -40 } },
});

/**
 * IRMÃS BIGORNA — BATE (impulsiva) e FORJA (calculista). Vida compartilhada.
 * Fase 3: a que tomou mais dano é derrotada; a sobrevivente funde os ataques das duas.
 */
export const BIGORNA: BossDef = {
  id: 'bigorna',
  mode: 'ground',
  hp: 2400,
  targetTime: 140,
  bpm: 150,
  knockoutTime: 3.4,
  coins: 2,
  twinRule: { phaseIndex: 2, bodies: ['bate', 'forja'] },
  arena: { floorY: 900, left: 0, right: 1920, platforms: [] },
  attacks: [
    {
      id: 'bate_salto',
      telegraph: 0.55,
      telegraphAnim: 'windup',
      warnSound: 'anvil',
      active: 2.2,
      recovery: 0.5,
      containsParry: true,
      actions: [
        // nunca aterrissa no vão estreito atrás da Forja (sempre sobra rota de fuga)
        { t: 0, do: 'jump', body: 'bate', x: 'player', height: 460, time: 1.05, minX: 780, maxX: 1700 },
        { t: 1.05, do: 'hazard', hazard: { type: 'shockwave', kind: 'quake', x: 'body', body: 'bate', dirs: [-1, 1], speed: 820, width: 80, height: 64, warn: 0.3 } },
        { t: 1.05, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', body: 'bate', anchor: 'top' }, dirDeg: -90, count: 3, spreadDeg: 70, proj: { kind: 'spark_ball', radius: 20, speed: 520, gravity: 900, parryEvery: 2, life: 4 } } },
        { t: 1.05, do: 'shake', amount: 0.5 },
      ],
    },
    {
      id: 'forja_ferraduras',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_spring',
      active: 2.0,
      recovery: 0.4,
      containsParry: false,
      actions: [
        { t: 0, do: 'anim', anim: 'attack', body: 'forja' },
        { t: 0, do: 'emit', emitter: { type: 'lob', origin: { from: 'body', body: 'forja', anchor: 'top' }, count: 3, interval: 0.5, distMin: 300, distMax: 900, dir: 'aimed', apexHeight: 380, proj: { kind: 'horseshoe', radius: 30, speed: 0, gravity: 2000, spin: 9, life: 5 } } },
      ],
    },
    {
      id: 'marteladas',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'anvil',
      active: 1.8,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack', body: 'forja' },
        { t: 0, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', body: 'forja', anchor: 'top' }, dirDeg: 'aimed', count: 4, spreadDeg: 44, repeats: 2, interval: 0.7, proj: { kind: 'spark_ball', radius: 20, speed: 620, parryEvery: 4, life: 5 } } },
      ],
    },
    {
      id: 'troca',
      telegraph: 0.6,
      telegraphAnim: 'windup',
      warnSound: 'warn_horn',
      active: 1.9,
      recovery: 0.5,
      containsParry: false,
      actions: [
        { t: 0, do: 'swapBodies' },
        { t: 0.9, do: 'hazard', hazard: { type: 'shockwave', kind: 'quake', x: 'body', body: 'bate', dirs: [-1, 1], speed: 760, width: 80, height: 64, warn: 0.3 } },
        { t: 0.9, do: 'shake', amount: 0.6 },
      ],
    },
    {
      id: 'combo',
      telegraph: 0.55,
      telegraphAnim: 'windup',
      warnSound: 'anvil',
      active: 2.6,
      recovery: 0.5,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack', body: 'forja' },
        { t: 0, do: 'emit', emitter: { type: 'lob', origin: { from: 'body', body: 'forja', anchor: 'top' }, count: 2, interval: 0.7, distMin: 300, distMax: 800, dir: 'aimed', apexHeight: 420, proj: { kind: 'horseshoe', radius: 30, speed: 0, gravity: 2000, spin: 9, life: 5 } } },
        { t: 1.2, do: 'hazard', hazard: { type: 'shockwave', kind: 'quake', x: 'body', body: 'bate', dirs: [-1, 1], speed: 760, width: 80, height: 64, warn: 0.45 } },
        { t: 1.2, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', body: 'bate', anchor: 'top' }, dirDeg: -90, count: 3, spreadDeg: 70, proj: { kind: 'spark_ball', radius: 20, speed: 520, gravity: 900, parryEvery: 2, life: 4 } } },
      ],
    },
    {
      id: 'furia_salto',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'anvil',
      active: 2.9,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'jump', body: 'survivor', x: 'player', height: 460, time: 0.95 },
        { t: 0.95, do: 'hazard', hazard: { type: 'shockwave', kind: 'quake', x: 'body', body: 'survivor', dirs: [-1, 1], speed: 860, width: 80, height: 64, warn: 0.3 } },
        { t: 0.95, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', body: 'survivor', anchor: 'top' }, dirDeg: -90, count: 3, spreadDeg: 80, proj: { kind: 'spark_ball', radius: 20, speed: 560, gravity: 900, parryEvery: 2, life: 4 } } },
        { t: 1.7, do: 'emit', emitter: { type: 'lob', origin: { from: 'body', body: 'survivor', anchor: 'top' }, count: 2, interval: 0.45, distMin: 300, distMax: 800, dir: 'aimed', apexHeight: 380, proj: { kind: 'horseshoe', radius: 30, speed: 0, gravity: 2000, spin: 9, life: 5 } } },
      ],
    },
    {
      id: 'furia_marteladas',
      telegraph: 0.45,
      telegraphAnim: 'windup',
      warnSound: 'anvil',
      active: 2.0,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack', body: 'survivor' },
        { t: 0, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', body: 'survivor', anchor: 'top' }, dirDeg: 'aimed', count: 5, spreadDeg: 60, repeats: 2, interval: 0.6, proj: { kind: 'spark_ball', radius: 20, speed: 640, parryEvery: 5, life: 5 } } },
      ],
    },
  ],
  phases: [
    {
      id: 'duo',
      hpStart: 1,
      transition: 2,
      gapStart: 1.1,
      gapEnd: 0.7,
      breatherEvery: [8, 12],
      breatherTime: [1, 1.5],
      attacks: [
        { id: 'bate_salto', weight: 3 },
        { id: 'forja_ferraduras', weight: 3 },
        { id: 'marteladas', weight: 2 },
      ],
      bodies: [bate(1500), forja(420)],
    },
    {
      id: 'dueto',
      hpStart: 0.6,
      transition: 2,
      gapStart: 1.0,
      gapEnd: 0.65,
      breatherEvery: [8, 12],
      breatherTime: [1, 1.5],
      attacks: [
        { id: 'troca', weight: 2 },
        { id: 'combo', weight: 3 },
        { id: 'marteladas', weight: 2 },
        { id: 'bate_salto', weight: 2 },
      ],
      bodies: [bate(1500), forja(420)],
    },
    {
      id: 'solo_furioso',
      hpStart: 0.3,
      transition: 2.5,
      gapStart: 0.85,
      gapEnd: 0.5,
      breatherEvery: [8, 11],
      breatherTime: [1, 1.4],
      attacks: [
        { id: 'furia_salto', weight: 3 },
        { id: 'furia_marteladas', weight: 2 },
      ],
      bodies: [bate(1500), forja(420)],
    },
  ],
};
