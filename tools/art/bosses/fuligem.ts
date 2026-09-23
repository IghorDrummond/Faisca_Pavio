/** COMODORO FULIGEM — nuvem de fuligem industrial com chaminés; fábrica flutuante; núcleo-fornalha. */
import type { SpriteDef } from '../fx';
import { type Canvas, type Pt, INK, WHITE, ellipsePts, flame, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape } from '../lib/svg';
import { bgShape, vgrad, wash } from '../lib/scenery';
import { registerGroups } from '../groups';

const TAU = Math.PI * 2;
const SOOT = '#4a4448';
const SOOT_SH = '#26222a';

function cloud(c: Canvas, i: number, mood: 'idle' | 'windup' | 'attack' | 'ko'): void {
  const puffR = mood === 'windup' ? 1.08 : mood === 'attack' ? 0.94 : 1 + Math.sin((i / 4) * TAU) * 0.03;
  c.group(`translate(260 300) scale(${puffR})`, () => {
    // chaminés
    for (const [x, h, s] of [[-60, 110, 1], [120, 90, 2]] as [number, number, number][]) {
      shape(c, roundRectPts(x - 26, -200 - h, 52, h + 40, 6), { fill: '#6e3a2a', shade: '#3a1a14', shadeOffset: 5 }, 7700 + s);
      shape(c, roundRectPts(x - 32, -210 - h, 64, 18, 4), { fill: '#3a2a24', width: 4 }, 7702 + s);
      if (mood !== 'ko') puff(c, x, -230 - h - (i % 2) * 10, 20 + (i % 2) * 6, 'rgba(90,84,88,0.9)', 7704 + s, 5);
    }
    // corpo de nuvem
    const lobes: Pt[] = [];
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * TAU;
      const bump = k % 3 === 1 ? 1.1 : 0.94;
      lobes.push([Math.cos(a) * 220 * bump, Math.sin(a) * 190 * bump]);
    }
    shape(c, lobes, { fill: SOOT, shade: SOOT_SH, shadeOffset: 14, boil: 3 }, 7710);
    // chapéu de comodoro
    shape(c, [[-140, -150], [120, -170], [90, -230], [-110, -220]], { fill: '#1e2a4a', shade: '#0e1428', shadeOffset: 5 }, 7711);
    shape(c, roundRectPts(-160, -165, 300, 26, 8), { fill: '#1e2a4a', width: 5 }, 7712);
    shape(c, ellipsePts(-10, -200, 16, 14, 10), { fill: '#e8b64c', width: 3 }, 7713);
    // rosto rabugento
    const bl = mood === 'ko' ? 0.9 : i === 3 ? 1 : 0;
    pieEye(c, -80, -40, 28, 34, -0.9, 0, bl, 7720);
    pieEye(c, 20, -44, 26, 32, -0.9, 0, bl, 7721);
    inkLine(c, [[-120, -96], [-50, -76]], 8, 7722);
    inkLine(c, [[60, -100], [-8, -82]], 8, 7723);
    shape(c, ellipsePts(-150, 30, 40, 26, 14), { fill: '#6a6468', width: 4 }, 7724); // bochecha/boca
    mouth(c, -40, 60, 34, mood === 'attack' ? 'open' : mood === 'ko' ? 'sad' : 'grit', 7725);
    // bigodão de fumaça
    for (const s of [-1, 1]) puff(c, -40 + s * 40, 40, 26, '#2a2428', 7726 + s, 5);
    hose(c, [-180, 60], [-250, 140], 12, 12, SOOT_SH, 7730);
    glove(c, -250, 140, 2.2, 24, mood === 'windup' ? 'fist' : 'point', 7731);
    if (mood === 'ko') for (let k = 0; k < 4; k++) puff(c, -180 + k * 120, 180, 40, 'rgba(160,152,158,0.8)', 7740 + k, 6);
  });
}

function factory(c: Canvas, i: number, mood: 'idle' | 'windup' | 'attack'): void {
  c.group('translate(240 340)', () => {
    puff(c, 0, 260, 120, SOOT, 7800, 7);
    shape(c, roundRectPts(-170, -250, 380, 500, 14), { fill: '#6e5a4a', shade: '#44362a', shadeOffset: 12 }, 7801);
    for (let k = 0; k < 3; k++) {
      shape(c, roundRectPts(-150 + k * 120, -120, 90, 70, 6), { fill: mood === 'attack' ? '#ffd27a' : '#f2c65a', width: 4 }, 7802 + k);
      inkLine(c, [[-150 + k * 120, -85], [-60 + k * 120, -85]], 3, 7806 + k);
    }
    // esteiras (saída das caixas)
    for (const y of [-150, 170]) {
      shape(c, roundRectPts(-240, y - 30, 120, 60, 26), { fill: '#3a3438', width: 5 }, 7810 + y);
      for (let k = 0; k < 4; k++) shape(c, ellipsePts(-222 + k * 30, y, 10, 10, 8), { fill: '#8a8488', width: 3 }, 7812 + k + y);
    }
    for (const x of [-40, 110]) shape(c, roundRectPts(x - 24, -330, 48, 90, 5), { fill: '#6e3a2a', width: 4 }, 7820 + x);
    pieEye(c, -40, 40, 26, 30, -0.9, 0, i === 3 ? 1 : 0, 7830);
    pieEye(c, 50, 36, 24, 28, -0.9, 0, i === 3 ? 1 : 0, 7831);
    mouth(c, 0, 110, 36, mood === 'attack' ? 'open' : 'grit', 7832);
    shape(c, [[-120, -250], [150, -270], [120, -310], [-100, -300]], { fill: '#1e2a4a', width: 5 }, 7833);
  });
}

function core(c: Canvas, i: number, mood: 'idle' | 'windup' | 'attack' | 'ko'): void {
  c.group('translate(150 150)', () => {
    shape(c, ellipsePts(0, 0, 110, 110, 20), { fill: '#3a3438', shade: '#1a161a', shadeOffset: 10 }, 7900);
    if (mood !== 'ko') flame(c, 0, 50, 120 + (i % 2) * 10, i / 4, 1.5, 7901);
    shape(c, roundRectPts(-80, -30, 160, 20, 6), { fill: '#2a2428', width: 4 }, 7902);
    pieEye(c, -34, -46, 20, 24, -0.8, 0, mood === 'ko' ? 1 : 0, 7903);
    pieEye(c, 34, -48, 18, 22, -0.8, 0, mood === 'ko' ? 1 : 0, 7904);
    mouth(c, 0, 20, 30, mood === 'attack' ? 'open' : mood === 'ko' ? 'o' : 'grit', 7905);
    if (mood === 'ko') puff(c, 0, -110, 40, 'rgba(160,152,158,0.9)', 7906, 6);
  });
}

export function fuligemSprites(): SpriteDef[] {
  const s = (name: string, w: number, h: number, n: number, fps: number, draw: (c: Canvas, i: number) => void): SpriteDef => ({ name, w, h, frames: n, fps, repeat: -1, draw });
  return [
    s('fuligem_cloud_idle', 560, 600, 4, 8, (c, i) => cloud(c, i, 'idle')),
    s('fuligem_cloud_windup', 560, 600, 2, 12, (c, i) => cloud(c, i, 'windup')),
    s('fuligem_cloud_attack', 560, 600, 2, 12, (c, i) => cloud(c, i, 'attack')),
    s('fuligem_factory_idle', 520, 700, 4, 8, (c, i) => factory(c, i, 'idle')),
    s('fuligem_factory_windup', 520, 700, 2, 12, (c, i) => factory(c, i, 'windup')),
    s('fuligem_factory_attack', 520, 700, 2, 12, (c, i) => factory(c, i, 'attack')),
    s('fuligem_core_idle', 300, 300, 4, 10, (c, i) => core(c, i, 'idle')),
    s('fuligem_core_attack', 300, 300, 2, 12, (c, i) => core(c, i, 'attack')),
    s('fuligem_transition', 560, 600, 4, 12, (c, i) => cloud(c, i, i % 2 ? 'windup' : 'attack')),
    s('fuligem_knockout', 300, 300, 4, 8, (c, i) => core(c, i, 'ko')),
    {
      name: 'hz_piston',
      w: 260,
      h: 340,
      draw: (c) => {
        shape(c, roundRectPts(100, 0, 60, 250, 6), { fill: '#8a8488', shade: '#4a4448', shadeOffset: 5 }, 7950);
        shape(c, roundRectPts(10, 240, 240, 96, 10), { fill: '#6e5a4a', shade: '#44362a', shadeOffset: 8, highlight: 'rgba(255,255,255,0.3)' }, 7951);
        for (let k = 0; k < 6; k++) inkLine(c, [[20 + k * 40, 322], [40 + k * 40, 334]], 5, 7952 + k, '#e8b64c');
      },
    },
  ];
}

export const FULIGEM_IMAGES = [
  {
    pack: 'ilha2',
    key: 'bg_fuligem_far',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#8a7a6a'], [0.6, '#b8a07a'], [1, '#6a5a4a']])}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 111, 0.4);
      for (let k = 0; k < 7; k++) bgShape(c, ellipsePts(140 + k * 290, 200 + (k % 3) * 60, 160, 50, 14), 'rgba(240,230,210,0.5)', 11100 + k, 'rgba(0,0,0,0)', 0.1);
    },
  },
  {
    pack: 'ilha2',
    key: 'bg_fuligem_mid',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: false,
    draw: (c: Canvas) => {
      // horizonte industrial (tileável)
      for (let k = 0; k < 10; k++) {
        const x = k * 192;
        const h = 180 + ((k * 73) % 160);
        bgShape(c, roundRectPts(x, 1080 - h, 170, h, 4), '#4a3e3a', 11200 + k, 'rgba(20,15,15,0.5)', 3);
        bgShape(c, roundRectPts(x + 60, 1080 - h - 120, 36, 130, 3), '#5a3a2a', 11220 + k, 'rgba(20,15,15,0.5)', 3);
        puff(c, x + 78, 1080 - h - 150, 40, 'rgba(90,84,88,0.5)', 11240 + k, 5);
      }
      void INK;
      void WHITE;
    },
  },
];

registerGroups([{ pack: 'ilha2', atlas: 'fuligem', palette: true, scale: 0.8, sprites: fuligemSprites }], FULIGEM_IMAGES);
