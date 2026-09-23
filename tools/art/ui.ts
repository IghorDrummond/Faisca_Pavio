/** UI, mapa-múndi, NPCs, loja do Seu Trapo e ícones — arte original procedural. */
import type { SpriteDef } from './fx';
import { type Canvas, type Pt, INK, WHITE, ellipsePts, flame, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, shoe, sparkle } from './lib/svg';
import { bgShape, rgrad, vgrad, wash } from './lib/scenery';
import { registerGroups } from './groups';
import { MAP_H, MAP_W, ISLANDS } from '../../src/core/worldmap';
import { MAP_NODES } from '../../src/core/progression';
import { NPCS } from '../../src/core/worldmap';

const GOLD = '#e8b64c';
const GOLD_SH = '#9c7418';

function medallion(c: Canvas, bg: string, salt: number): void {
  shape(c, ellipsePts(80, 80, 70, 70, 20), { fill: GOLD, shade: GOLD_SH, shadeOffset: 6 }, salt);
  shape(c, ellipsePts(80, 80, 56, 56, 20), { fill: bg, shade: 'rgba(0,0,0,0.25)', shadeOffset: 6 }, salt + 1);
}

const ICONS: SpriteDef[] = [
  {
    name: 'icon_w_reta',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#6b2a1a', 2000);
      for (let k = 0; k < 3; k++) shape(c, [[40 + k * 30, 80], [58 + k * 30, 70], [70 + k * 30, 80], [58 + k * 30, 90]], { fill: '#ffe27a', width: 3.5 }, 2002 + k);
    },
  },
  {
    name: 'icon_w_leque',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#6b2a1a', 2010);
      for (const a of [-0.35, 0, 0.35]) flame(c, 80 + Math.cos(a - Math.PI / 2 + Math.PI / 2) * 0 + Math.sin(a) * 40, 96 - Math.cos(a) * 20, 30, 0.2, 1, 2012 + a * 10);
    },
  },
  {
    name: 'icon_w_teleguiada',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#5a2240', 2020);
      inkLine(c, [[40, 110], [70, 60], [110, 80], [120, 50]], 5, 2021, '#ff9bc8');
      shape(c, ellipsePts(120, 50, 12, 12, 10), { fill: '#ff6fa8', width: 3.5 }, 2022);
    },
  },
  {
    name: 'icon_w_rojao',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#3a2a4a', 2030);
      c.group('rotate(-35 80 80)', () => {
        shape(c, roundRectPts(44, 68, 64, 24, 8), { fill: '#d23b2a', shade: '#8a1f15', shadeOffset: 3, width: 4 }, 2031);
        shape(c, [[108, 68], [126, 80], [108, 92]], { fill: '#f1dca0', width: 4 }, 2032);
        flame(c, 36, 82, 22, 0.3, 1.2, 2033);
      });
    },
  },
  {
    name: 'icon_s_chamaMestra',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#8a2a14', 2040);
      shape(c, roundRectPts(34, 66, 96, 28, 14), { fill: '#ff9b2e', width: 4 }, 2041);
      shape(c, roundRectPts(34, 74, 96, 12, 6), { fill: '#fff1b5', width: 0.01, stroke: 'none' }, 2042);
    },
  },
  {
    name: 'icon_s_pavioLongo',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#8a2a14', 2050);
      flame(c, 80, 112, 70, 0.1, 1.5, 2051);
    },
  },
  {
    name: 'icon_s_braseiroGemeo',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#8a2a14', 2060);
      flame(c, 62, 110, 46, 0.2, 1.2, 2061);
      flame(c, 100, 110, 46, 0.6, 1.2, 2062, { outer: '#ffb13b', mid: '#ffe27a', core: '#ffffff' });
    },
  },
  {
    name: 'icon_c_coracaoCera',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#5a3a22', 2070);
      shape(c, [[80, 118], [44, 82], [48, 58], [66, 52], [80, 66], [94, 52], [112, 58], [116, 82]], { fill: '#f3dd9c', shade: '#cfad63', shadeOffset: 5 }, 2071);
    },
  },
  {
    name: 'icon_c_fumacaPalco',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#3a3a4a', 2080);
      puff(c, 66, 88, 22, '#e8e0d0', 2081, 5);
      puff(c, 96, 76, 18, '#f3ecdc', 2082, 5);
    },
  },
  {
    name: 'icon_c_luvaMagnetica',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#2a3a5a', 2090);
      glove(c, 80, 84, -Math.PI / 2, 26, 'open', 2091);
      inkLine(c, [[46, 44], [56, 54]], 4, 2092, '#ffe27a');
      inkLine(c, [[114, 44], [104, 54]], 4, 2093, '#ffe27a');
    },
  },
  {
    name: 'icon_c_cartolaSorte',
    w: 160,
    h: 160,
    draw: (c) => {
      medallion(c, '#4a2a4a', 2100);
      shape(c, roundRectPts(54, 44, 52, 58, 6), { fill: '#241a1a', width: 4 }, 2101);
      shape(c, ellipsePts(80, 104, 40, 10, 14), { fill: '#241a1a', width: 4 }, 2102);
      shape(c, roundRectPts(54, 88, 52, 10, 3), { fill: '#c9362b', width: 3 }, 2103);
      sparkle(c, 112, 52, 12, '#ffe27a', 2104);
    },
  },
];

// -------------------------------------------------------------------------------------------------
// Ícones dos nós do mapa (200x200, base em (100,170))

function nodeBase(c: Canvas, salt: number): void {
  shape(c, ellipsePts(100, 170, 80, 22, 18), { fill: 'rgba(0,0,0,0.28)', stroke: 'none', width: 0.01 }, salt);
}

const NODE_ICONS: Record<string, (c: Canvas) => void> = {
  icon_tutorial: (c) => {
    nodeBase(c, 3000);
    shape(c, [[30, 165], [100, 50], [170, 165]], { fill: '#e04a3a', shade: '#8a2319', shadeOffset: 8 }, 3001);
    for (let k = 0; k < 3; k++) shape(c, [[58 + k * 32, 165], [100, 50], [74 + k * 32, 165]], { fill: WHITE, width: 3 }, 3002 + k);
    inkLine(c, [[100, 50], [100, 28]], 4, 3005);
    shape(c, [[100, 28], [124, 36], [100, 44]], { fill: GOLD, width: 3 }, 3006);
  },
  icon_shop: (c) => {
    nodeBase(c, 3010);
    shape(c, roundRectPts(44, 90, 112, 76, 6), { fill: '#a8783e', shade: '#6e4a22', shadeOffset: 6 }, 3011);
    shape(c, [[30, 96], [100, 40], [170, 96]], { fill: '#6b8a3a', shade: '#3e5a1e', shadeOffset: 6 }, 3012);
    for (const [x, y, col] of [[60, 60, '#d9542b'], [120, 70, '#2a4677'], [96, 50, GOLD]] as [number, number, string][]) shape(c, roundRectPts(x, y, 20, 16, 2), { fill: col, width: 3 }, 3013 + x);
    shape(c, roundRectPts(86, 120, 30, 46, 4), { fill: '#3a2414', width: 4 }, 3020);
  },
  icon_cuco: (c) => {
    nodeBase(c, 3030);
    shape(c, roundRectPts(64, 76, 72, 92, 8), { fill: '#9a5b2e', shade: '#65361a', shadeOffset: 6 }, 3031);
    shape(c, [[50, 82], [100, 38], [150, 82]], { fill: '#6e3f22', width: 4 }, 3032);
    shape(c, ellipsePts(100, 112, 26, 26, 14), { fill: '#f1e2bd', width: 4 }, 3033);
    inkLine(c, [[100, 112], [100, 94]], 4, 3034);
    inkLine(c, [[100, 112], [112, 118]], 4, 3035);
  },
  icon_agulha: (c) => {
    nodeBase(c, 3040);
    shape(c, [[40, 160], [160, 160], [150, 140], [50, 140]], { fill: '#4a2a3a', width: 4 }, 3041);
    shape(c, [[60, 140], [60, 70], [150, 70], [150, 92], [84, 92], [84, 140]], { fill: '#2a2a3a', shade: '#141420', shadeOffset: 6, highlight: 'rgba(255,255,255,0.3)' }, 3042);
    inkLine(c, [[134, 92], [134, 128]], 5, 3043, '#d9d4c8');
    shape(c, ellipsePts(76, 62, 14, 14, 10), { fill: '#e2a64c', width: 3.5 }, 3044);
  },
  icon_runngun1: (c) => {
    nodeBase(c, 3050);
    shape(c, roundRectPts(34, 60, 132, 106, 6), { fill: '#3a1a14', width: 4 }, 3051);
    shape(c, [[34, 60], [100, 60], [80, 166], [34, 166]], { fill: '#a8322a', shade: '#6e1f18', shadeOffset: 6 }, 3052);
    shape(c, [[166, 60], [100, 60], [120, 166], [166, 166]], { fill: '#a8322a', shade: '#6e1f18', shadeOffset: 6 }, 3053);
    flame(c, 100, 150, 34, 0.4, 1.3, 3054);
  },
  icon_challenge: (c) => {
    nodeBase(c, 3060);
    inkLine(c, [[100, 166], [96, 120], [104, 100]], 3, 3061);
    shape(c, ellipsePts(100, 72, 36, 42, 16), { fill: '#2be7f0', shade: '#11a9b8', shadeOffset: 6, stroke: WHITE, width: 5, highlight: 'rgba(255,255,255,0.6)' }, 3062);
  },
  icon_gramofone: (c) => {
    nodeBase(c, 3070);
    shape(c, roundRectPts(58, 120, 84, 46, 6), { fill: '#7a4a24', shade: '#4a2a12', shadeOffset: 5 }, 3071);
    inkLine(c, [[100, 120], [110, 84]], 6, 3072);
    shape(c, [[110, 84], [150, 30], [176, 60], [168, 92]], { fill: GOLD, shade: GOLD_SH, shadeOffset: 6, highlight: 'rgba(255,245,210,0.6)' }, 3073);
  },
  icon_bigorna: (c) => {
    nodeBase(c, 3080);
    for (const [x, s] of [[62, 3081], [138, 3085]] as [number, number][]) {
      shape(c, [[x - 44, 100], [x + 34, 100], [x + 20, 124], [x + 14, 124], [x + 22, 166], [x - 26, 166], [x - 18, 124], [x - 30, 118]], { fill: '#4a4a52', shade: '#26262c', shadeOffset: 6, highlight: 'rgba(255,255,255,0.35)' }, s);
    }
    sparkle(c, 100, 76, 16, '#ffae3a', 3090);
  },
  icon_fuligem: (c) => {
    nodeBase(c, 3100);
    puff(c, 100, 104, 50, '#4a4448', 3101, 7);
    shape(c, roundRectPts(72, 36, 20, 44, 3), { fill: '#6e3a2a', width: 4 }, 3102);
    shape(c, roundRectPts(110, 46, 20, 36, 3), { fill: '#6e3a2a', width: 4 }, 3103);
    puff(c, 82, 26, 12, '#8a8488', 3104, 5);
  },
  icon_runngun2: (c) => {
    nodeBase(c, 3110);
    shape(c, roundRectPts(40, 90, 120, 76, 6), { fill: '#6e5a4a', shade: '#44362a', shadeOffset: 6 }, 3111);
    const pts: Pt[] = [];
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const r = k % 4 < 2 ? 36 : 28;
      pts.push([100 + Math.cos(a) * r, 80 + Math.sin(a) * r]);
    }
    shape(c, pts, { fill: '#b8894a', shade: '#6f4d22', shadeOffset: 5 }, 3112);
    shape(c, ellipsePts(100, 80, 10, 10, 10), { fill: INK, width: 2 }, 3113);
  },
  icon_maestro: (c) => {
    nodeBase(c, 3120);
    shape(c, roundRectPts(34, 96, 132, 70, 4), { fill: '#e2d2a8', shade: '#b8a57a', shadeOffset: 6 }, 3121);
    shape(c, [[34, 96], [100, 34], [166, 96]], { fill: '#a8322a', shade: '#6e1f18', shadeOffset: 6 }, 3122);
    for (let k = 0; k < 4; k++) shape(c, roundRectPts(48 + k * 30, 110, 14, 56, 3), { fill: WHITE, width: 3 }, 3123 + k);
    sparkle(c, 100, 26, 14, GOLD, 3130);
  },
};

// -------------------------------------------------------------------------------------------------
// NPCs (140x170, pés em (70,160)), 4 desenhos de "respiração"

function npcLegs(c: Canvas, i: number, shoeCol: string): void {
  const bob = i % 2 ? 2 : 0;
  hose(c, [60, 128], [54, 158 - bob], -4, 6, INK, 3200);
  hose(c, [80, 128], [86, 158], 4, 6, INK, 3201);
  shoe(c, 58, 158 - bob, 16, -1, shoeCol, 3202);
  shoe(c, 90, 158, 16, 1, shoeCol, 3203);
}

const NPC_DRAW: Record<string, (c: Canvas, i: number) => void> = {
  npc_botao: (c, i) => {
    npcLegs(c, i, '#2a4677');
    shape(c, ellipsePts(70, 90 - (i % 2), 46, 46, 18), { fill: '#d35a8a', shade: '#8a2f55', shadeOffset: 6 }, 3210);
    for (const [dx, dy] of [[-14, 12], [14, 12], [-14, 34], [14, 34]] as Pt[]) shape(c, ellipsePts(70 + dx, 70 + dy, 6, 6, 8), { fill: '#6e1f3a', width: 3 }, 3211);
    pieEye(c, 58, 66, 7, 10, 0.3, 0, i === 3 ? 1 : 0, 3215);
    pieEye(c, 82, 66, 7, 10, 0.3, 0, i === 3 ? 1 : 0, 3216);
    mouth(c, 70, 104, 12, 'grin', 3217);
  },
  npc_tonico: (c, i) => {
    npcLegs(c, i, '#6e2a19');
    shape(c, roundRectPts(34, 60 - (i % 2), 72, 70, 10), { fill: '#e2a64c', shade: '#9c6a22', shadeOffset: 6 }, 3220);
    shape(c, ellipsePts(70, 60 - (i % 2), 40, 10, 14), { fill: '#b07a3e', width: 4 }, 3221);
    for (let k = 0; k < 4; k++) inkLine(c, [[38, 78 + k * 12], [102, 78 + k * 12]], 2.5, 3222 + k, 'rgba(90,40,20,0.6)');
    pieEye(c, 60, 86, 7, 10, 0, 0, 0, 3226);
    pieEye(c, 80, 86, 7, 10, 0, 0, 0, 3227);
    mouth(c, 70, 110, 10, 'smile', 3228);
  },
  npc_gilda: (c, i) => {
    npcLegs(c, i, '#3a2a4a');
    shape(c, roundRectPts(20, 70 - (i % 2), 100, 48, 10), { fill: '#b8b8c8', shade: '#6e6e7e', shadeOffset: 6, highlight: 'rgba(255,255,255,0.5)' }, 3230);
    for (let k = 0; k < 7; k++) shape(c, roundRectPts(28 + k * 12, 100, 8, 12, 2), { fill: INK, width: 1 }, 3231 + k);
    pieEye(c, 54, 84, 7, 10, 0.4, 0, i === 2 ? 1 : 0, 3240);
    pieEye(c, 86, 84, 7, 10, 0.4, 0, i === 2 ? 1 : 0, 3241);
  },
  npc_apito: (c, i) => {
    npcLegs(c, i, '#2a2a3a');
    shape(c, ellipsePts(76, 94 - (i % 2), 38, 32, 16), { fill: '#c9c3b6', shade: '#6c665c', shadeOffset: 6, highlight: 'rgba(255,255,255,0.55)' }, 3250);
    shape(c, roundRectPts(20, 80, 40, 22, 6), { fill: '#c9c3b6', width: 4 }, 3251);
    shape(c, roundRectPts(58, 50, 40, 16, 4), { fill: '#2a4677', width: 4 }, 3252);
    pieEye(c, 70, 92, 7, 10, -0.5, 0, 0, 3253);
    pieEye(c, 92, 90, 7, 10, -0.5, 0, 0, 3254);
    if (i % 2) puff(c, 16, 70, 8, 'rgba(240,235,225,0.9)', 3255, 5);
  },
  npc_lima: (c, i) => {
    npcLegs(c, i, '#8a2f55');
    c.group(`rotate(${i % 2 ? 3 : -3} 70 130)`, () => {
      shape(c, roundRectPts(52, 20, 36, 112, 16), { fill: '#e8a0b8', shade: '#9e5a70', shadeOffset: 5 }, 3260);
      for (let k = 0; k < 6; k++) inkLine(c, [[56, 34 + k * 14], [84, 40 + k * 14]], 2, 3261 + k, 'rgba(90,30,50,0.5)');
      pieEye(c, 62, 56, 6, 9, 0.2, 0, 0, 3268);
      pieEye(c, 78, 56, 6, 9, 0.2, 0, 0, 3269);
      mouth(c, 70, 76, 8, 'smile', 3270);
    });
  },
  npc_lampiao: (c, i) => {
    npcLegs(c, i, '#3a2414');
    shape(c, roundRectPts(38, 50, 64, 82, 8), { fill: 'rgba(255,230,160,0.55)', stroke: INK, width: 5 }, 3280);
    flame(c, 70, 110, 34, i / 4, 1, 3281);
    shape(c, [[30, 52], [70, 20], [110, 52]], { fill: '#3a3a42', width: 4 }, 3282);
    inkLine(c, [[70, 20], [70, 6]], 4, 3283);
    pieEye(c, 58, 72, 6, 9, 0, 0.3, 0.5, 3284);
    pieEye(c, 82, 72, 6, 9, 0, 0.3, 0.5, 3285);
    shape(c, [[50, 92], [70, 100], [90, 92], [84, 104], [56, 104]], { fill: WHITE, width: 3 }, 3286);
  },
};

// -------------------------------------------------------------------------------------------------
// Seu Trapo (espantalho de retalhos) 320x560, pés em (160, 550)

function drawTrapo(c: Canvas, i: number): void {
  const sway = Math.sin((i / 4) * Math.PI * 2) * 4;
  c.group(`rotate(${sway} 160 550)`, () => {
    inkLine(c, [[160, 550], [160, 300]], 12, 3300, '#7a5a34');
    // corpo de retalhos
    const patches: [number, number, number, number, string][] = [
      [96, 250, 70, 90, '#c9546a'],
      [160, 250, 70, 90, '#5d8a3a'],
      [96, 330, 70, 80, '#2a4677'],
      [160, 330, 70, 80, '#e2a64c'],
    ];
    for (const [x, y, w, h, col] of patches) shape(c, roundRectPts(x, y, w, h, 6), { fill: col, shade: 'rgba(0,0,0,0.25)', shadeOffset: 5 }, 3301 + x + y);
    for (let k = 0; k < 8; k++) inkLine(c, [[100 + k * 16, 332], [106 + k * 16, 338]], 2.5, 3310 + k, WHITE);
    // braços de pano
    hose(c, [100, 270], [40, 250 - sway * 2], -10, 14, '#b8894a', 3320);
    hose(c, [226, 270], [284, 230 + sway * 2], 10, 14, '#b8894a', 3321);
    glove(c, 36, 250 - sway * 2, Math.PI, 18, 'wave', 3322);
    glove(c, 288, 228 + sway * 2, 0, 18, 'open', 3323);
    // cabeça de saco
    shape(c, ellipsePts(163, 200, 62, 58, 18), { fill: '#d9c08a', shade: '#a88a52', shadeOffset: 6 }, 3330);
    for (let k = 0; k < 5; k++) inkLine(c, [[118 + k * 22, 238], [122 + k * 22, 246]], 3, 3331 + k);
    pieEye(c, 140, 190, 12, 16, -0.4, 0, i === 3 ? 1 : 0, 3337);
    pieEye(c, 186, 188, 12, 16, -0.4, 0, i === 3 ? 1 : 0, 3338);
    mouth(c, 163, 222, 18, i % 2 ? 'open' : 'grin', 3339);
    // chapéu de palha
    shape(c, ellipsePts(163, 148, 92, 18, 18), { fill: '#e8c46a', shade: '#a8863a', shadeOffset: 4 }, 3340);
    shape(c, roundRectPts(118, 92, 90, 56, 18), { fill: '#e8c46a', shade: '#a8863a', shadeOffset: 5 }, 3341);
    shape(c, roundRectPts(118, 126, 90, 14, 4), { fill: '#c9362b', width: 3 }, 3342);
    // palha saindo
    for (let k = 0; k < 5; k++) inkLine(c, [[108 - k * 3, 204 + k * 8], [84 - k * 6, 214 + k * 10]], 3, 3343 + k, '#e8c46a');
  });
}

// -------------------------------------------------------------------------------------------------
// Imagens: fundo do mapa, interior da loja

function drawMap(c: Canvas): void {
  c.add(`<rect width="${MAP_W}" height="${MAP_H}" fill="${vgrad(c, [[0, '#6f97a5'], [1, '#4f7482']])}"/>`);
  wash(c, 0, 0, MAP_W, MAP_H, 'rgba(0,0,0,0)', 21, 0.3);
  // ondinhas
  for (let y = 60; y < MAP_H; y += 90) {
    for (let x = (y / 90) % 2 ? 40 : 100; x < MAP_W; x += 160) {
      c.add(`<path d="M${x},${y} q14,-12 28,0 q14,12 28,0" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="5" stroke-linecap="round"/>`);
    }
  }
  const cols = ['#b8a26a', '#a8a07a', '#c2a870'];
  for (const e of ISLANDS) {
    const pts: Pt[] = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const wob = 1 + Math.sin(a * 5 + e.x) * 0.04;
      pts.push([e.x + Math.cos(a) * (e.rx + 30) * wob, e.y + Math.sin(a) * (e.ry + 30) * wob]);
    }
    bgShape(c, pts, '#e8d8a8', 3400 + e.island, 'rgba(40,25,15,0.7)', 6);
    const inner = pts.map(([x, y]) => [e.x + (x - e.x) * 0.9, e.y + (y - e.y) * 0.9] as Pt);
    bgShape(c, inner, cols[e.island] ?? '#b8a26a', 3410 + e.island, 'rgba(40,25,15,0.35)', 3);
    // arvorezinhas e casinhas decorativas
    for (let k = 0; k < 10; k++) {
      const a = k * 2.39 + e.island;
      const tx = e.x + Math.cos(a) * e.rx * 0.72;
      const ty = e.y + Math.sin(a) * e.ry * 0.7;
      if (MAP_NODES.some((n) => Math.hypot(n.x - tx, n.y - ty) < 170)) continue;
      shape(c, ellipsePts(tx, ty - 30, 34, 30, 12), { fill: '#6b8a3a', shade: '#3e5a1e', shadeOffset: 6, stroke: 'rgba(40,25,15,0.7)', width: 4 }, 3420 + k + e.island * 20);
      inkLine(c, [[tx, ty], [tx, ty - 10]], 7, 3440 + k, '#5a3a1e');
    }
  }
  // caminhos pontilhados entre os nós
  const byId = new Map(MAP_NODES.map((n) => [n.id, n]));
  for (const n of MAP_NODES) {
    for (const r of n.requires) {
      const m = byId.get(r);
      if (!m) continue;
      c.add(`<path d="M${m.x},${m.y} Q${(m.x + n.x) / 2},${Math.min(m.y, n.y) - 60} ${n.x},${n.y}" fill="none" stroke="rgba(90,60,30,0.55)" stroke-width="10" stroke-dasharray="4 26" stroke-linecap="round"/>`);
    }
  }
}

const IMAGES = [
  { pack: 'map', key: 'map_bg', w: MAP_W, h: MAP_H, scale: 0.5, opaque: true, draw: drawMap },
  {
    pack: 'ilha1',
    key: 'bg_shop',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${rgrad(c, [[0, '#8a6440'], [1, '#3a2414']], 0.4, 0.4, 0.9)}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 31, 0.35);
      for (let x = 0; x < 1920; x += 160) c.add(`<rect x="${x}" y="0" width="8" height="1080" fill="rgba(0,0,0,0.12)"/>`);
      c.add(`<rect x="0" y="880" width="1920" height="200" fill="#4a3020"/>`);
      bgShape(c, roundRectPts(1340, 120, 520, 760, 20), 'rgba(60,40,24,0.6)', 3500, 'rgba(40,25,15,0.5)', 4);
      for (let k = 0; k < 6; k++) c.add(`<ellipse cx="${200 + k * 300}" cy="60" rx="80" ry="30" fill="rgba(255,230,160,0.15)"/>`);
    },
  },
];

export function uiSprites(): SpriteDef[] {
  return ICONS;
}

export function mapSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const [name, fn] of Object.entries(NODE_ICONS)) out.push({ name, w: 200, h: 200, draw: (c) => fn(c) });
  for (const npc of NPCS) {
    const fn = NPC_DRAW[npc.sprite];
    if (fn) out.push({ name: npc.sprite, w: 140, h: 170, frames: 4, fps: 6, repeat: -1, draw: (c, i) => fn(c, i) });
  }
  return out;
}

export function shopSprites(): SpriteDef[] {
  return [{ name: 'trapo_idle', w: 320, h: 560, frames: 4, fps: 6, repeat: -1, draw: (c, i) => drawTrapo(c, i) }];
}

registerGroups(
  [
    { pack: 'core', atlas: 'ui', palette: true, sprites: uiSprites },
    { pack: 'map', atlas: 'map', palette: true, sprites: mapSprites },
    { pack: 'ilha1', atlas: 'shop', palette: true, sprites: shopSprites },
  ],
  IMAGES,
);
