import type { BossDef } from '../../core/types';

/**
 * TIO GRAMOFONE — gramofone vaidoso, corneta dourada e bigode de disco.
 * Ataques marcados com onBeat esperam o próximo tempo do relógio musical (audioContext.currentTime no navegador).
 */
export const GRAMOFONE: BossDef = {
  id: 'gramofone',
  mode: 'ground',
  hp: 2300,
  targetTime: 140,
  bpm: 120,
  knockoutTime: 3.4,
  coins: 2,
  arena: { floorY: 900, left: 0, right: 1920, platforms: [] },
  attacks: [
    // ---------------- FASE 1: LADO A
    {
      id: 'notas',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'chime',
      active: 2.2,
      recovery: 0.4,
      containsParry: true,
      onBeat: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'wave', origin: { from: 'body', anchor: 'horn' }, count: 8, interval: 0.25, dirDeg: 180, proj: { kind: 'note', radius: 24, speed: 500, motion: 'sine', sineAmp: 110, sineFreq: 1, parryEvery: 4, life: 6 } } },
      ],
    },
    {
      id: 'discos',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'saw',
      active: 2.4,
      recovery: 0.4,
      containsParry: false,
      onBeat: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'line', origin: { from: 'point', x: 1320, y: 852 }, dirDeg: 180, count: 3, interval: 1.0, proj: { kind: 'vinyl', radius: 44, speed: 620, rolling: true, life: 6 } } },
      ],
    },
    {
      id: 'acordes',
      telegraph: 0.45,
      telegraphAnim: 'windup',
      warnSound: 'chime',
      active: 1.4,
      recovery: 0.5,
      containsParry: false,
      onBeat: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', anchor: 'horn' }, dirDeg: 'aimed', count: 3, spreadDeg: 36, repeats: 3, interval: 0.5, proj: { kind: 'note', radius: 22, speed: 640, life: 5 } } },
      ],
    },
    // ---------------- FASE 2: ARRANHÃO
    {
      id: 'arranhao',
      telegraph: 0.6,
      telegraphAnim: 'scratch',
      warnSound: 'warn_scratch',
      active: 1.8,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'music', op: 'skip', value: 0.5 },
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0.1, do: 'emit', emitter: { type: 'ring', origin: { from: 'body', anchor: 'horn' }, count: 10, offsetDeg: 90, proj: { kind: 'note', radius: 22, speed: 420, parryEvery: 5, life: 6 } } },
        { t: 0.9, do: 'emit', emitter: { type: 'ring', origin: { from: 'body', anchor: 'horn' }, count: 10, offsetDeg: 108, proj: { kind: 'note', radius: 22, speed: 420, life: 6 } } },
      ],
    },
    {
      id: 'caixas_de_som',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_horn',
      active: 2.6,
      recovery: 0.4,
      containsParry: false,
      onBeat: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'hazard', hazard: { type: 'slab', kind: 'soundbar_low', y: 872, height: 56, width: 300, from: 'left', speed: 1100, warn: 0.5 } },
        { t: 1.0, do: 'hazard', hazard: { type: 'slab', kind: 'soundbar_high', y: 776, height: 76, width: 300, from: 'right', speed: 1100, warn: 0.5 } },
      ],
    },
    // ---------------- FASE 3: LADO B
    {
      id: 'succao',
      telegraph: 0.6,
      telegraphAnim: 'inhale',
      warnSound: 'suction',
      active: 3.2,
      recovery: 0.5,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'hazard', hazard: { type: 'force', kind: 'suction', x: 1600, strength: 250, duration: 3, warn: 0.3 } },
        { t: 0.3, do: 'emit', emitter: { type: 'line', origin: { from: 'body', anchor: 'horn' }, dirDeg: 'aimed', count: 6, interval: 0.45, proj: { kind: 'note', radius: 22, speed: 560, parryEvery: 3, life: 5 } } },
      ],
    },
    {
      id: 'discos2',
      telegraph: 0.45,
      telegraphAnim: 'windup',
      warnSound: 'saw',
      active: 2.2,
      recovery: 0.4,
      containsParry: false,
      onBeat: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'lob', origin: { from: 'body', anchor: 'horn' }, count: 3, interval: 0.6, distMin: 500, distMax: 1250, dir: -1, apexHeight: 320, proj: { kind: 'vinyl', radius: 40, speed: 0, gravity: 1800, bounces: 2, spin: 10, life: 6 } } },
      ],
    },
    // ---------------- FASE 4: FIM DO DISCO
    {
      id: 'fim',
      telegraph: 0.45,
      telegraphAnim: 'windup',
      warnSound: 'chime',
      active: 2.6,
      recovery: 0.4,
      containsParry: true,
      onBeat: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'spiral', origin: { from: 'body', anchor: 'horn' }, count: 14, interval: 0.16, startDeg: 110, stepDeg: 11, arms: 2, proj: { kind: 'note', radius: 20, speed: 440, parryEvery: 6, life: 6 } } },
      ],
    },
  ],
  phases: [
    {
      id: 'lado_a',
      hpStart: 1,
      transition: 2,
      gapStart: 1.0,
      gapEnd: 0.7,
      breatherEvery: [8, 12],
      breatherTime: [1, 1.5],
      attacks: [
        { id: 'notas', weight: 3 },
        { id: 'discos', weight: 3 },
        { id: 'acordes', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1570,
          y: 640,
          parts: [
            { id: 'caixa', x: 30, y: 150, w: 360, h: 220, hurt: true, contact: true },
            { id: 'corneta', x: -60, y: -170, w: 300, h: 260, hurt: true, contact: true },
          ],
          anchors: { horn: { x: -200, y: -170 } },
        },
      ],
    },
    {
      id: 'arranhao',
      hpStart: 0.72,
      transition: 2,
      gapStart: 0.95,
      gapEnd: 0.65,
      breatherEvery: [8, 12],
      breatherTime: [1, 1.5],
      attacks: [
        { id: 'arranhao', weight: 2 },
        { id: 'caixas_de_som', weight: 3 },
        { id: 'notas', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1570,
          y: 640,
          parts: [
            { id: 'caixa', x: 30, y: 150, w: 360, h: 220, hurt: true, contact: true },
            { id: 'corneta', x: -60, y: -170, w: 300, h: 260, hurt: true, contact: true },
          ],
          anchors: { horn: { x: -200, y: -170 } },
        },
      ],
    },
    {
      id: 'lado_b',
      hpStart: 0.45,
      transition: 2,
      gapStart: 0.9,
      gapEnd: 0.6,
      breatherEvery: [8, 11],
      breatherTime: [1, 1.4],
      attacks: [
        { id: 'succao', weight: 3 },
        { id: 'discos2', weight: 3 },
        { id: 'acordes', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1570,
          y: 640,
          parts: [
            { id: 'caixa', x: 30, y: 150, w: 360, h: 220, hurt: true, contact: true },
            { id: 'corneta', x: -60, y: -170, w: 300, h: 260, hurt: true, contact: true },
          ],
          anchors: { horn: { x: -200, y: -170 } },
        },
      ],
    },
    {
      id: 'fim_do_disco',
      hpStart: 0.2,
      transition: 2,
      gapStart: 0.8,
      gapEnd: 0.5,
      breatherEvery: [8, 10],
      breatherTime: [1, 1.2],
      tempoUpEvery: 10,
      attacks: [
        { id: 'fim', weight: 3 },
        { id: 'discos', weight: 2 },
        { id: 'caixas_de_som', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1570,
          y: 640,
          parts: [
            { id: 'caixa', x: 30, y: 150, w: 360, h: 220, hurt: true, contact: true },
            { id: 'corneta', x: -60, y: -170, w: 300, h: 260, hurt: true, contact: true },
          ],
          anchors: { horn: { x: -200, y: -170 } },
        },
      ],
    },
  ],
};
