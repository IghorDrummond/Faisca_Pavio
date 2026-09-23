import type { BossDef } from '../../core/types';

/** COMODORO FULIGEM — nuvem de fuligem industrial com chaminés (fase aérea: avião de papel). */
export const FULIGEM: BossDef = {
  id: 'fuligem',
  mode: 'air',
  hp: 2200,
  targetTime: 130,
  bpm: 138,
  knockoutTime: 3.2,
  coins: 2,
  arena: { floorY: 1300, left: 0, right: 1920, platforms: [] },
  attacks: [
    // FASE 1: chaminés sopram anéis de fumaça
    {
      id: 'aneis',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'steam',
      active: 2.0,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'line', origin: { from: 'body', anchor: 'chimney1' }, dirDeg: 'aimed', count: 3, interval: 0.5, proj: { kind: 'smoke_ring', radius: 36, speed: 440, parryEvery: 3, life: 6 } } },
        { t: 0.25, do: 'emit', emitter: { type: 'line', origin: { from: 'body', anchor: 'chimney2' }, dirDeg: 'aimed', count: 3, interval: 0.5, proj: { kind: 'smoke_ring', radius: 36, speed: 440, life: 6 } } },
      ],
    },
    {
      id: 'baforada',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'steam',
      active: 1.6,
      recovery: 0.5,
      containsParry: false,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'fan', origin: { from: 'body', anchor: 'mouth' }, dirDeg: 180, count: 5, spreadDeg: 64, repeats: 2, interval: 0.7, proj: { kind: 'coal', radius: 26, speed: 520, life: 6 } } },
      ],
    },
    // FASE 2: chuva de carvão com indicadores na borda superior
    {
      id: 'chuva_carvao',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_bell',
      active: 2.8,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'rain', count: 8, interval: 0.3, xMin: 120, xMax: 1150, minSpacing: 200, warn: 0.6, proj: { kind: 'coal', radius: 28, speed: 620, parryEvery: 4, life: 4, floorKill: false } } },
      ],
    },
    // FASE 3: fábrica flutuante com esteiras disparando caixas
    {
      id: 'esteiras',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'warn_horn',
      active: 2.6,
      recovery: 0.4,
      containsParry: true,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'line', origin: { from: 'body', anchor: 'belt1' }, dirDeg: 180, count: 3, interval: 0.8, proj: { kind: 'crate', radius: 40, speed: 560, parryEvery: 3, life: 6 } } },
        { t: 0.4, do: 'emit', emitter: { type: 'line', origin: { from: 'body', anchor: 'belt2' }, dirDeg: 180, count: 3, interval: 0.8, proj: { kind: 'crate', radius: 40, speed: 560, life: 6 } } },
      ],
    },
    {
      id: 'parede_fumaca',
      telegraph: 0.55,
      telegraphAnim: 'windup',
      warnSound: 'steam',
      active: 2.4,
      recovery: 0.4,
      containsParry: false,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'emit', emitter: { type: 'wall', side: 'right', count: 13, spacing: 80, top: 80, gapMin: 220, gapMax: 700, gapSize: 280, proj: { kind: 'smoke_ring', radius: 30, speed: 380, warn: 0.5, life: 8 } } },
      ],
    },
    // FASE 4: núcleo exposto persegue; pistões esmagam as bordas
    {
      id: 'perseguir',
      telegraph: 0.55,
      telegraphAnim: 'windup',
      warnSound: 'warn_horn',
      active: 3.0,
      recovery: 0.5,
      containsParry: true,
      actions: [
        { t: 0, do: 'chase', speed: 150, time: 2.6 },
        { t: 0.4, do: 'emit', emitter: { type: 'ring', origin: { from: 'body', anchor: 'mouth' }, count: 8, offsetDeg: 0, proj: { kind: 'ember', radius: 22, speed: 360, parryEvery: 4, life: 5 } } },
        { t: 1.6, do: 'emit', emitter: { type: 'ring', origin: { from: 'body', anchor: 'mouth' }, count: 8, offsetDeg: 22, proj: { kind: 'ember', radius: 22, speed: 360, life: 5 } } },
        { t: 2.6, do: 'move', x: 1500, y: 540, time: 0.8 },
      ],
    },
    {
      id: 'pistoes',
      telegraph: 0.5,
      telegraphAnim: 'windup',
      warnSound: 'stomp',
      active: 2.4,
      recovery: 0.4,
      containsParry: false,
      actions: [
        { t: 0, do: 'anim', anim: 'attack' },
        { t: 0, do: 'hazard', hazard: { type: 'crusher', kind: 'piston', side: 'top', depth: 330, warn: 0.7, active: 0.8, at: 450, size: 260 } },
        { t: 0, do: 'hazard', hazard: { type: 'crusher', kind: 'piston', side: 'bottom', depth: 330, warn: 0.7, active: 0.8, at: 800, size: 260 } },
        { t: 1.1, do: 'hazard', hazard: { type: 'crusher', kind: 'piston', side: 'top', depth: 330, warn: 0.7, active: 0.8, at: 900, size: 260 } },
        { t: 1.1, do: 'hazard', hazard: { type: 'crusher', kind: 'piston', side: 'bottom', depth: 330, warn: 0.7, active: 0.8, at: 350, size: 260 } },
      ],
    },
  ],
  phases: [
    {
      id: 'nuvem',
      hpStart: 1,
      transition: 2,
      gapStart: 1.0,
      gapEnd: 0.65,
      breatherEvery: [8, 12],
      breatherTime: [1, 1.5],
      attacks: [
        { id: 'aneis', weight: 3 },
        { id: 'baforada', weight: 3 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1520,
          y: 520,
          parts: [{ id: 'nuvem', x: 40, y: 0, w: 420, h: 420, hurt: true, contact: true }],
          anchors: { chimney1: { x: -60, y: -260 }, chimney2: { x: 120, y: -250 }, mouth: { x: -190, y: 30 }, belt1: { x: -220, y: -120 }, belt2: { x: -220, y: 170 } },
        },
      ],
    },
    {
      id: 'chuva',
      hpStart: 0.7,
      transition: 2,
      gapStart: 0.95,
      gapEnd: 0.6,
      breatherEvery: [8, 12],
      breatherTime: [1, 1.5],
      attacks: [
        { id: 'chuva_carvao', weight: 3 },
        { id: 'aneis', weight: 2 },
        { id: 'baforada', weight: 2 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1520,
          y: 520,
          parts: [{ id: 'nuvem', x: 40, y: 0, w: 420, h: 420, hurt: true, contact: true }],
          anchors: { chimney1: { x: -60, y: -260 }, chimney2: { x: 120, y: -250 }, mouth: { x: -190, y: 30 }, belt1: { x: -220, y: -120 }, belt2: { x: -220, y: 170 } },
        },
      ],
    },
    {
      id: 'fabrica',
      hpStart: 0.45,
      transition: 2.2,
      gapStart: 0.9,
      gapEnd: 0.6,
      breatherEvery: [8, 11],
      breatherTime: [1, 1.4],
      attacks: [
        { id: 'esteiras', weight: 3 },
        { id: 'parede_fumaca', weight: 2 },
        { id: 'chuva_carvao', weight: 1 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1540,
          y: 540,
          parts: [{ id: 'fabrica', x: 30, y: 0, w: 400, h: 520, hurt: true, contact: true }],
          anchors: { chimney1: { x: -40, y: -300 }, chimney2: { x: 110, y: -300 }, mouth: { x: -180, y: 0 }, belt1: { x: -200, y: -150 }, belt2: { x: -200, y: 170 } },
        },
      ],
    },
    {
      id: 'nucleo',
      hpStart: 0.2,
      transition: 2.2,
      gapStart: 0.85,
      gapEnd: 0.55,
      breatherEvery: [8, 10],
      breatherTime: [1, 1.3],
      attacks: [
        { id: 'perseguir', weight: 3 },
        { id: 'pistoes', weight: 3 },
      ],
      bodies: [
        {
          id: 'main',
          x: 1500,
          y: 540,
          parts: [{ id: 'fornalha', x: 0, y: 0, w: 220, h: 220, hurt: true, contact: true }],
          anchors: { mouth: { x: -60, y: 20 }, chimney1: { x: 0, y: -120 }, chimney2: { x: 0, y: -120 }, belt1: { x: -100, y: 0 }, belt2: { x: -100, y: 0 } },
        },
      ],
    },
  ],
};
