/** MADAME AGULHA — máquina de costura antiga (fases 1–2) e boneca de pano gigante (fase 3). */
import type { SpriteDef } from '../fx';
import { type Canvas, type Pt, INK, WHITE, ellipsePts, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, sparkle } from '../lib/svg';
import { bgShape, planks, rgrad, vgrad, wash } from '../lib/scenery';
import { registerGroups } from '../groups';

const IRON = '#2a2a36';
const IRON_SH = '#15151d';
const GOLD = '#e0b04a';
const TAU = Math.PI * 2;

interface P {
  lean: number;
  squash: number;
  blink: number;
  look: number;
  mouth: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat';
  needle: number; // 0 alto .. 1 baixo
  cushion: boolean;
  angry: boolean;
  ko: boolean;
  handL: number;
}

const base = (): P => ({ lean: 0, squash: 1, blink: 0, look: -0.8, mouth: 'smile', needle: 0, cushion: false, angry: false, ko: false, handL: 0 });

// Quadro 560x560, âncora (300,300)
function machine(c: Canvas, p: P): void {
  c.group(`translate(300 300) rotate(${p.lean} 0 200) scale(${2 - p.squash} ${p.squash})`, () => {
    // pedestal
    shape(c, roundRectPts(-200, 190, 420, 50, 12), { fill: '#6e3f22', shade: '#43230f', shadeOffset: 6 }, 6000);
    // corpo (coluna) e braço em arco
    shape(c, [[60, 200], [60, -120], [200, -150], [210, 200]], { fill: IRON, shade: IRON_SH, shadeOffset: 12, highlight: 'rgba(255,255,255,0.18)' }, 6001);
    shape(c, [[-260, -140], [-250, -60], [80, -40], [210, -80], [200, -160], [-10, -170]], { fill: IRON, shade: IRON_SH, shadeOffset: 10, highlight: 'rgba(255,255,255,0.2)' }, 6002);
    // decalques dourados
    for (let k = 0; k < 4; k++) inkLine(c, [[-200 + k * 60, -120], [-170 + k * 60, -110], [-150 + k * 60, -124]], 4, 6003 + k, GOLD);
    inkLine(c, [[90, 20], [120, 60], [100, 120]], 4, 6008, GOLD);
    // cabeça da agulha (esquerda)
    shape(c, roundRectPts(-280, -150, 60, 110, 10), { fill: IRON, shade: IRON_SH, shadeOffset: 5 }, 6010);
    const ny = -40 + p.needle * 70;
    inkLine(c, [[-250, -40], [-250, ny + 40]], 7, 6011);
    inkLine(c, [[-250, -40], [-250, ny + 40]], 3, 6012, '#d9d4c8');
    // carretéis-olhos no topo
    for (const [x, s] of [[-40, 1], [40, 2]] as [number, number][]) {
      shape(c, roundRectPts(x - 30, -250, 60, 70, 8), { fill: '#e2a64c', shade: '#9c6a22', shadeOffset: 5 }, 6020 + s);
      shape(c, ellipsePts(x, -250, 34, 10, 12), { fill: '#b07a3e', width: 4 }, 6022 + s);
      shape(c, ellipsePts(x, -180, 34, 10, 12), { fill: '#b07a3e', width: 4 }, 6024 + s);
      pieEye(c, x, -214, 20, 26, p.look, 0, p.ko ? 1 : p.blink, 6026 + s);
    }
    if (p.angry) {
      inkLine(c, [[-70, -270], [-15, -256]], 7, 6030);
      inkLine(c, [[70, -272], [15, -258]], 7, 6031);
    }
    // almofada de alfinetes (tomate) sobre o braço
    if (p.cushion) {
      shape(c, ellipsePts(60, -190, 44, 34, 14), { fill: '#d9353a', shade: '#8a1c20', shadeOffset: 6 }, 6040);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI + (k / 4) * Math.PI;
        inkLine(c, [[60 + Math.cos(a) * 20, -200 + Math.sin(a) * 14], [60 + Math.cos(a) * 52, -206 + Math.sin(a) * 40]], 3, 6041 + k, '#d9d4c8');
      }
    }
    // boca (lábios elegantes) no braço
    shape(c, ellipsePts(-110, -95, 38, 14, 12), { fill: '#c9546a', width: 4 }, 6050);
    mouth(c, -110, -104, 22, p.mouth, 6051);
    // fita métrica como cachecol
    shape(c, [[-20, -170], [120, -175], [150, -150], [180, -60], [150, -50], [120, -140], [-10, -140]], { fill: '#e8c46a', width: 4 }, 6060);
    for (let k = 0; k < 8; k++) inkLine(c, [[10 + k * 15, -170], [10 + k * 15, -160]], 2.5, 6061 + k);
    // braço-manivela com luva (roda do volante)
    shape(c, ellipsePts(210, 20, 50, 50, 16), { fill: '#3a3a46', width: 5 }, 6070);
    hose(c, [210, 20], [260, -40 + p.handL], 10, 9, INK, 6071);
    glove(c, 260, -40 + p.handL, -0.6, 22, p.angry ? 'fist' : 'open', 6072);
    if (p.ko) for (let k = 0; k < 3; k++) puff(c, -100 + k * 120, -240, 30, 'rgba(235,228,215,0.9)', 6080 + k, 6);
  });
}

// Boneca de pano: quadro 480x720, âncora (240,400)
function doll(c: Canvas, i: number, p: P): void {
  const sway = Math.sin((i / 4) * TAU) * 5;
  c.group(`translate(240 400) rotate(${p.lean + sway * 0.3} 0 300)`, () => {
    // pernas e braços de pano
    hose(c, [-50, 250], [-70, 310], -6, 34, '#e8a0b8', 6100);
    hose(c, [50, 250], [70, 310], 6, 34, '#e8a0b8', 6101);
    hose(c, [-110, -80], [-210, 30 + sway], 20, 30, '#e8a0b8', 6102);
    hose(c, [110, -80], [200, 20 - sway], -20, 30, '#e8a0b8', 6103);
    shape(c, ellipsePts(-214, 36 + sway, 28, 28, 12), { fill: '#e8a0b8', width: 5 }, 6104);
    shape(c, ellipsePts(204, 26 - sway, 28, 28, 12), { fill: '#e8a0b8', width: 5 }, 6105);
    // vestido de retalhos
    shape(c, [[-120, -140], [120, -140], [160, 260], [-160, 260]], { fill: '#5d8a3a', shade: '#3e5a1e', shadeOffset: 12 }, 6110);
    for (let k = 0; k < 4; k++) shape(c, roundRectPts(-100 + k * 50, 40 + (k % 2) * 60, 44, 44, 4), { fill: ['#c9546a', '#2a4677', '#e2a64c', '#efe2c4'][k]!, width: 3 }, 6111 + k);
    for (let k = 0; k < 10; k++) inkLine(c, [[-150 + k * 32, 250], [-140 + k * 32, 262]], 3, 6120 + k, WHITE);
    // cabeça com costuras e botões nos olhos
    shape(c, ellipsePts(-10, -290, 110, 96, 20), { fill: '#f0d7c0', shade: '#c9a88a', shadeOffset: 10 }, 6130);
    for (const [x, s] of [[-50, 1], [30, 2]] as [number, number][]) {
      shape(c, ellipsePts(x, -300, 24, 24, 14), { fill: '#2a2a36', width: 4 }, 6131 + s);
      for (const [dx, dy] of [[-6, -6], [6, 6]] as Pt[]) shape(c, ellipsePts(x + dx, -300 + dy, 4, 4, 6), { fill: WHITE, width: 1 }, 6133);
    }
    if (p.angry) {
      inkLine(c, [[-80, -340], [-24, -326]], 7, 6140);
      inkLine(c, [[60, -342], [4, -328]], 7, 6141);
    }
    mouth(c, -10, -250, 36, p.ko ? 'sad' : p.mouth, 6142);
    for (let k = 0; k < 6; k++) inkLine(c, [[-46 + k * 14, -232], [-40 + k * 14, -224]], 3, 6143 + k);
    // cabelo de lã
    for (let k = 0; k < 7; k++) puff(c, -100 + k * 30, -380 + Math.abs(k - 3) * 8, 26, '#b8402e', 6150 + k, 5);
    if (p.ko) for (let k = 0; k < 3; k++) puff(c, -80 + k * 80, 200, 40, 'rgba(235,228,215,0.9)', 6160 + k, 6);
  });
}

function frames(name: string, n: number, fps: number, fn: (c: Canvas, i: number) => void, w = 560, h = 560): SpriteDef {
  return { name, w, h, frames: n, fps, repeat: -1, draw: fn };
}

export function agulhaSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const [ph, cushion, angry] of [['p1', false, false], ['p2', true, true]] as [string, boolean, boolean][]) {
    out.push(
      frames(`agulha_${ph}_idle`, 4, 8, (c, i) => machine(c, { ...base(), cushion, angry, needle: i % 2 ? 0.2 : 0, lean: Math.sin((i / 4) * TAU) * 1.5, blink: i === 3 ? 1 : 0, mouth: angry ? 'grit' : 'smile' })),
      frames(`agulha_${ph}_windup`, 2, 12, (c, i) => machine(c, { ...base(), cushion, angry, needle: 0, lean: 5 + i, squash: 0.96, mouth: 'grit', handL: -30 })),
      frames(`agulha_${ph}_attack`, 2, 12, (c, i) => machine(c, { ...base(), cushion, angry, needle: i ? 1 : 0.6, lean: -6, squash: 1.04, mouth: 'open', handL: 20 })),
    );
  }
  out.push(
    frames('agulha_transition', 4, 12, (c, i) => machine(c, { ...base(), angry: i > 1, cushion: i > 1, lean: i % 2 ? 5 : -5, mouth: 'o', needle: i % 2 })),
    frames('agulha_p3_idle', 4, 8, (c, i) => doll(c, i, { ...base(), angry: true, mouth: 'grin' }), 480, 720),
    frames('agulha_p3_windup', 2, 12, (c, i) => doll(c, i, { ...base(), angry: true, mouth: 'grit', lean: 4 }), 480, 720),
    frames('agulha_p3_attack', 2, 12, (c, i) => doll(c, i, { ...base(), angry: true, mouth: 'open', lean: -5 }), 480, 720),
    frames('agulha_knockout', 4, 10, (c, i) => doll(c, i, { ...base(), ko: true, lean: 8 + i * 3 }), 480, 720),
    // perigos
    {
      name: 'hz_needle',
      w: 100,
      h: 620,
      draw: (c) => {
        inkLine(c, [[50, 0], [50, 560]], 26, 6200);
        inkLine(c, [[50, 0], [50, 560]], 14, 6201, '#d9d4c8');
        shape(c, [[36, 560], [64, 560], [50, 618]], { fill: '#d9d4c8', width: 5 }, 6202);
        shape(c, ellipsePts(50, 40, 8, 18, 10), { fill: INK, width: 1 }, 6203);
      },
    },
    {
      name: 'hz_scissors_low',
      w: 400,
      h: 80,
      draw: (c) => {
        shape(c, [[20, 40], [300, 26], [390, 40], [300, 54]], { fill: '#d9d4c8', shade: '#8d8778', shadeOffset: 4 }, 6210);
        shape(c, ellipsePts(40, 40, 30, 22, 14), { fill: 'none', stroke: INK, width: 10 }, 6211);
        shape(c, ellipsePts(40, 40, 30, 22, 14), { fill: 'none', stroke: '#c9546a', width: 5 }, 6212);
      },
    },
    {
      name: 'hz_scissors_high',
      w: 440,
      h: 100,
      draw: (c) => {
        shape(c, [[20, 50], [330, 30], [430, 50], [330, 70]], { fill: '#d9d4c8', shade: '#8d8778', shadeOffset: 4 }, 6220);
        shape(c, ellipsePts(44, 50, 34, 26, 14), { fill: 'none', stroke: INK, width: 10 }, 6221);
        shape(c, ellipsePts(44, 50, 34, 26, 14), { fill: 'none', stroke: '#2a4677', width: 5 }, 6222);
      },
    },
  );
  return out;
}

export const AGULHA_IMAGES = [
  {
    pack: 'ilha1',
    key: 'bg_agulha_far',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#5a4a5e'], [1, '#3a2e3e']])}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 81, 0.35);
      // ateliê: manequins e rolos de tecido
      for (let k = 0; k < 6; k++) {
        const x = 120 + k * 320;
        bgShape(c, [[x, 700], [x + 20, 440], [x + 70, 400], [x + 120, 440], [x + 140, 700]], '#8a6a6e', 8100 + k, 'rgba(40,25,30,0.5)', 3);
        bgShape(c, ellipsePts(x + 70, 380, 30, 26, 12), '#8a6a6e', 8110 + k, 'rgba(40,25,30,0.5)', 3);
      }
      for (let k = 0; k < 8; k++) bgShape(c, roundRectPts(60 + k * 240, 180, 60, 180, 20), ['#7a4a5a', '#4a5a7a', '#7a6a3a'][k % 3]!, 8120 + k, 'rgba(40,25,30,0.4)', 3);
      c.add(`<rect x="0" y="720" width="1920" height="30" fill="rgba(40,25,30,0.7)"/>`);
      void rgrad;
    },
  },
  {
    pack: 'ilha1',
    key: 'bg_agulha_floor',
    w: 1920,
    h: 200,
    scale: 1,
    opaque: false,
    draw: (c: Canvas) => {
      planks(c, 0, 20, 1920, 180, '#7a5a5a', '#4a3434', 8200);
      c.add(`<rect x="0" y="0" width="1920" height="24" fill="#4a3434"/>`);
      void sparkle;
    },
  },
];

registerGroups([{ pack: 'ilha1', atlas: 'agulha', palette: true, scale: 0.8, sprites: agulhaSprites }], AGULHA_IMAGES);
