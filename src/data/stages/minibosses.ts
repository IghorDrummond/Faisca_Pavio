import type { BossDef } from '../../core/types';

/** Mini-chefes das fases run'n'gun (30–45 s). Usam o mesmo framework de chefes. */
export const CORTINA: BossDef = {
  id: 'cortina',
  mode: 'ground',
  hp: 950,
  targetTime: 40,
  bpm: 146,
  knockoutTime: 2.4,
  coins: 0,
  arena: { floorY: 900, left: 0, right: 1920, platforms: [] },
  attacks: [
    {
      id: 'franjas',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_spring',
      active: 2.4,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'rain', count: 6, interval: 0.36, xMin: 150, xMax: 1300, minSpacing: 260, warn: 0.6, proj: { kind: 'feather', radius: 26, speed: 780, parryEvery: 3, life: 4 } } },
      ],
    },
    {
      id: 'onda',
      telegraph: 0.55,
      telegraphAnim: 'windup',
      warnSound: 'warn',
      active: 1.8,
      recovery: 0.5,
      containsParry: false,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'hazard', hazard: { type: 'shockwave', kind: 'curtain_wave', x: 1450, dirs: [-1], speed: 900, width: 90, height: 70, warn: 0.4 } },
        { t: 0.9, do: 'hazard', hazard: { type: 'shockwave', kind: 'curtain_wave', x: 1450, dirs: [-1], speed: 900, width: 90, height: 70, warn: 0.4 } },
      ],
    },
    {
      id: 'argolas',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_bell',
      active: 1.6,
      recovery: 0.5,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', anchor: 'mouth' }, dirDeg: 'aimed', count: 4, spreadDeg: 40, repeats: 2, interval: 0.6, proj: { kind: 'smoke_ring', radius: 30, speed: 560, parryEvery: 4, life: 5 } } },
      ],
    },
  ],
  phases: [
    {
      id: 'cortina1',
      hpStart: 1,
      transition: 1.5,
      gapStart: 0.9,
      gapEnd: 0.6,
      breatherEvery: [8, 10],
      breatherTime: [1, 1.2],
      attacks: [
        { id: 'franjas', weight: 2 },
        { id: 'onda', weight: 2 },
        { id: 'argolas', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1560,
          y: 520,
          parts: [{ id: 'pano', x: 0, y: 40, w: 380, h: 700, hurt: true, contact: true }],
          anchors: { mouth: { x: -60, y: -120 } },
        },
      ],
    },
  ],
};

export const FOLE: BossDef = {
  id: 'fole',
  mode: 'ground',
  hp: 1000,
  targetTime: 42,
  bpm: 152,
  knockoutTime: 2.4,
  coins: 0,
  arena: { floorY: 900, left: 0, right: 1920, platforms: [{ x: 420, y: 660, w: 260 }, { x: 900, y: 560, w: 260 }] },
  attacks: [
    {
      id: 'sopro',
      telegraph: 0.6,
      telegraphAnim: 'windup',
      warnSound: 'warn_horn',
      active: 2.6,
      recovery: 0.5,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'hazard', hazard: { type: 'force', kind: 'wind', x: -400, strength: 240, duration: 2.4, warn: 0.3 } },
        { t: 0.4, do: 'emit', emitter: { type: 'line', origin: { from: 'body', anchor: 'nozzle' }, dirDeg: 180, count: 4, interval: 0.5, proj: { kind: 'smoke_ring', radius: 32, speed: 520, parryEvery: 4, motion: 'sine', sineAmp: 90, sineFreq: 0.7, life: 5 } } },
      ],
    },
    {
      id: 'fagulhas',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_spring',
      active: 1.8,
      recovery: 0.5,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'lob', origin: { from: 'body', anchor: 'nozzle' }, count: 4, interval: 0.4, distMin: 400, distMax: 1250, dir: -1, apexHeight: 360, proj: { kind: 'ember', radius: 22, speed: 0, gravity: 1900, bounces: 1, parryEvery: 3, life: 5 } } },
      ],
    },
    {
      id: 'fuligem',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn',
      active: 2.6,
      recovery: 0.4,
      containsParry: false,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'rain', count: 7, interval: 0.33, xMin: 120, xMax: 1300, minSpacing: 240, warn: 0.6, proj: { kind: 'coal', radius: 28, speed: 850, life: 4 } } },
      ],
    },
  ],
  phases: [
    {
      id: 'fole1',
      hpStart: 1,
      transition: 1.5,
      gapStart: 0.9,
      gapEnd: 0.6,
      breatherEvery: [8, 10],
      breatherTime: [1, 1.2],
      attacks: [
        { id: 'sopro', weight: 2 },
        { id: 'fagulhas', weight: 2 },
        { id: 'fuligem', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1600,
          y: 700,
          parts: [{ id: 'fole', x: 0, y: 0, w: 380, h: 360, hurt: true, contact: true }],
          anchors: { nozzle: { x: -230, y: -20 } },
        },
      ],
    },
  ],
};

export const MINIBOSSES: Record<string, BossDef> = { cortina: CORTINA, fole: FOLE };
