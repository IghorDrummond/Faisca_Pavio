/**
 * SENHOR CUCO — relógio cuco de parede original: telhado entalhado, mostrador com rosto e bigode,
 * braços de ponteiro com luvas, pinhas-peso nas correntes, e o cuco nervoso que mora na porta.
 * Quadro do corpo 460x760, âncora (230,400) = posição do corpo na simulação. Olha para a esquerda.
 */
import type { SpriteDef } from '../fx';
import { type Canvas, type Pt, INK, WHITE, ellipsePts, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, sparkle } from '../lib/svg';
import { bgShape, planks, rgrad, vgrad, wash } from '../lib/scenery';
import { registerGroups } from '../groups';

const W = 560;
const H = 760;
const AX = 280;
const AY = 400;

const WOOD = '#9a5b2e';
const WOOD_SH = '#65361a';
const ROOF = '#6e3f22';
const ROOF_SH = '#43230f';
const FACE = '#f1e2bd';
const FACE_SH = '#cdb98c';
const BRASS = '#d5a03b';
const BRASS_SH = '#8e6417';

type Mood = 'calm' | 'angry' | 'broken' | 'ko';

interface CucoPose {
  lean: number;
  squash: number;
  lookX: number;
  lookY: number;
  blink: number;
  mouth: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat';
  mood: Mood;
  /** ângulo dos braços-ponteiro (graus) */
  armL: number;
  armR: number;
  handL: 'open' | 'fist' | 'point' | 'wave';
  handR: 'open' | 'fist' | 'point' | 'wave';
  door: number; // 0 fechada .. 1 aberta
  pend: number; // -1..1 pêndulo interno
  hop: number;
  cracks: number;
  steam: number;
  spin: number; // KO: ponteiros girando
}

function base(): CucoPose {
  return {
    lean: 0,
    squash: 1,
    lookX: -0.8,
    lookY: 0.2,
    blink: 0,
    mouth: 'flat',
    mood: 'calm',
    armL: 200,
    armR: -20,
    handL: 'open',
    handR: 'open',
    door: 0,
    pend: 0,
    hop: 0,
    cracks: 0,
    steam: 0,
    spin: 0,
  };
}

function clockHandShape(c: Canvas, x0: number, y0: number, len: number, ang: number, width: number, salt: number, fill = INK): void {
  const a = (ang * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const pts: Pt[] = [
    [x0 + nx * width * 0.5, y0 + ny * width * 0.5],
    [x0 + dx * len * 0.72 + nx * width * 0.35, y0 + dy * len * 0.72 + ny * width * 0.35],
    [x0 + dx * len * 0.72 + nx * width * 1.1, y0 + dy * len * 0.72 + ny * width * 1.1],
    [x0 + dx * len, y0 + dy * len],
    [x0 + dx * len * 0.72 - nx * width * 1.1, y0 + dy * len * 0.72 - ny * width * 1.1],
    [x0 + dx * len * 0.72 - nx * width * 0.35, y0 + dy * len * 0.72 - ny * width * 0.35],
    [x0 - nx * width * 0.5, y0 - ny * width * 0.5],
  ];
  shape(c, pts, { fill, stroke: INK, width: 3, boil: 0.8 }, salt);
}

/** Desenha o relógio. (0,0) local = centro do corpo. */
function drawClock(c: Canvas, p: CucoPose): void {
  c.group(`translate(${AX} ${AY - p.hop}) rotate(${p.lean} 0 300) translate(0 300) scale(${2 - p.squash} ${p.squash}) translate(0 -300)`, () => {
    // correntes e pinhas (pesos)
    for (const [cx, len, s] of [[-70, 60 + p.pend * 6, 1], [70, 40 - p.pend * 6, 2]] as [number, number, number][]) {
      for (let k = 0; k < 5; k++) shape(c, ellipsePts(cx, 300 + k * (len / 5), 5, 7, 8), { fill: 'none', stroke: INK, width: 3 }, 50 + k + s * 10);
      shape(c, ellipsePts(cx, 318 + len, 16, 30, 12), { fill: '#7a4a24', shade: '#4a2a12', shadeOffset: 4 }, 70 + s);
      for (let k = 0; k < 3; k++) inkLine(c, [[cx - 12, 304 + len + k * 12], [cx + 12, 310 + len + k * 12]], 3, 80 + k + s * 4);
    }
    // braço de trás (ponteiro das horas)
    const shL: Pt = [-120, -40];
    const shR: Pt = [120, -40];
    const armPt = (sh: Pt, ang: number, len: number): Pt => [sh[0] + Math.cos((ang * Math.PI) / 180) * len, sh[1] + Math.sin((ang * Math.PI) / 180) * len];
    const hR = armPt(shR, p.armR, 95);
    hose(c, shR, hR, -14, 9, INK, 90);
    glove(c, hR[0], hR[1], (p.armR * Math.PI) / 180, 22, p.handR, 91);
    // caixa
    shape(c, roundRectPts(-150, -270, 300, 570, 30), { fill: WOOD, shade: WOOD_SH, shadeOffset: 14, highlight: 'rgba(255,220,180,0.25)' }, 100);
    // entalhes laterais
    for (const s of [-1, 1]) {
      inkLine(c, [[s * 128, -240], [s * 132, -100], [s * 126, 60], [s * 130, 270]], 4, 101 + s, 'rgba(40,20,8,0.7)');
      for (let k = 0; k < 4; k++) shape(c, ellipsePts(s * 138, -200 + k * 120, 10, 22, 8), { fill: '#b8773f', width: 3 }, 104 + k + s * 5);
    }
    // janela do pêndulo interno
    shape(c, roundRectPts(-70, 150, 140, 130, 60), { fill: '#3a2414', width: 4 }, 110);
    const pa = p.pend * 0.35;
    inkLine(c, [[0, 158], [Math.sin(pa) * 90, 158 + Math.cos(pa) * 90]], 5, 111, BRASS);
    shape(c, ellipsePts(Math.sin(pa) * 96, 158 + Math.cos(pa) * 96, 20, 20, 12), { fill: BRASS, shade: BRASS_SH, shadeOffset: 4 }, 112);
    // telhado entalhado
    const roof: Pt[] = [[-205, -250], [-110, -330], [0, -395], [110, -330], [205, -250], [150, -262], [0, -350], [-150, -262]];
    shape(c, roof, { fill: ROOF, shade: ROOF_SH, shadeOffset: 8 }, 120);
    for (let k = 0; k < 7; k++) shape(c, ellipsePts(-150 + k * 50, -252, 16, 9, 8), { fill: '#b8773f', width: 3 }, 121 + k);
    // porta do cuco
    shape(c, roundRectPts(-42, -330, 84, 74, 36), { fill: '#2a170b', width: 4 }, 130);
    if (p.door > 0) {
      // porta aberta (folha à esquerda)
      shape(c, roundRectPts(-42 - 50 * p.door, -330, 44 * p.door + 4, 74, 18), { fill: '#b8773f', shade: '#7a4a24', shadeOffset: 3 }, 131);
    } else {
      shape(c, roundRectPts(-40, -328, 80, 70, 34), { fill: '#b8773f', shade: '#7a4a24', shadeOffset: 5 }, 132);
      shape(c, ellipsePts(24, -292, 5, 5, 8), { fill: BRASS, width: 2.5 }, 133);
    }
    // mostrador
    shape(c, ellipsePts(0, -90, 132, 132, 24), { fill: BRASS, shade: BRASS_SH, shadeOffset: 8 }, 140);
    shape(c, ellipsePts(0, -90, 116, 116, 24), { fill: p.mood === 'angry' ? '#f3d2b0' : FACE, shade: FACE_SH, shadeOffset: 8 }, 141);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      if (p.cracks > 0 && (k === 2 || k === 7)) continue;
      const x = Math.cos(a) * 98;
      const y = -90 + Math.sin(a) * 98;
      inkLine(c, [[x * 0.93, y + (y + 90) * -0.07], [x, y]], k % 3 === 0 ? 7 : 4, 142 + k);
    }
    // rosto (olha para a esquerda)
    const ex = p.mood === 'broken' ? 0.9 : p.blink;
    pieEye(c, -46, -118, 20, 28, p.lookX, p.lookY, ex, 160);
    pieEye(c, 22, -122, 18, 26, p.lookX, p.lookY, ex, 161);
    if (p.mood === 'angry') {
      inkLine(c, [[-72, -160], [-26, -146]], 7, 162);
      inkLine(c, [[48, -162], [4, -150]], 7, 163);
      shape(c, ellipsePts(-78, -70, 16, 10, 10), { fill: 'rgba(214,80,60,0.55)', stroke: 'none', width: 0.01 }, 164);
      shape(c, ellipsePts(52, -74, 14, 9, 10), { fill: 'rgba(214,80,60,0.55)', stroke: 'none', width: 0.01 }, 165);
    } else if (p.mood === 'ko') {
      inkLine(c, [[-62, -132], [-30, -104]], 6, 166);
      inkLine(c, [[-30, -132], [-62, -104]], 6, 167);
      inkLine(c, [[8, -136], [38, -108]], 6, 168);
      inkLine(c, [[38, -136], [8, -108]], 6, 169);
    }
    // nariz e bigode
    shape(c, ellipsePts(-14, -82, 16, 13, 10), { fill: '#c8674a', shade: '#8d3d28', shadeOffset: 3 }, 170);
    const stache = (s: number): Pt[] => [
      [-14, -66],
      [-14 + s * 30, -72],
      [-14 + s * 62, -60],
      [-14 + s * 76, -74],
      [-14 + s * 70, -48],
      [-14 + s * 36, -50],
    ];
    shape(c, stache(-1), { fill: '#3a2414', width: 3.5 }, 171);
    shape(c, stache(1), { fill: '#3a2414', width: 3.5 }, 172);
    mouth(c, -14, -34, 22, p.mouth, 173);
    // ponteiros no mostrador (giram no nocaute)
    clockHandShape(c, 0, -90, 70, -90 + p.spin, 9, 180);
    clockHandShape(c, 0, -90, 50, 20 + p.spin * 1.7, 11, 181);
    shape(c, ellipsePts(0, -90, 9, 9, 10), { fill: BRASS, width: 3 }, 182);
    // rachaduras (fase 3 / nocaute)
    if (p.cracks > 0) {
      inkLine(c, [[-110, -140], [-60, -100], [-80, -50], [-30, -10]], 5, 190);
      inkLine(c, [[90, 40], [60, 110], [100, 180]], 5, 191);
      if (p.cracks > 1) inkLine(c, [[40, -250], [10, -200], [50, -160]], 5, 192);
    }
    // braço da frente (ponteiro dos minutos) em direção ao jogador
    const hL = armPt(shL, p.armL, 105);
    hose(c, shL, hL, 16, 10, INK, 193);
    glove(c, hL[0], hL[1], (p.armL * Math.PI) / 180, 24, p.handL, 194);
    if (p.steam > 0) {
      puff(c, -170, -300 - p.steam * 20, 22 + p.steam * 12, 'rgba(240,235,225,0.9)', 195);
      puff(c, 175, -290 - p.steam * 26, 18 + p.steam * 10, 'rgba(240,235,225,0.9)', 196);
    }
  });
}

function cuckoo(c: Canvas, x: number, y: number, open: number, i: number, salt: number, scale = 1): void {
  c.group(`translate(${x} ${y}) scale(${scale})`, () => {
    // corpo e cabeça do passarinho (olha para a esquerda)
    shape(c, ellipsePts(10, 14, 34, 26, 14), { fill: '#e8a23a', shade: '#a8661a', shadeOffset: 5 }, salt);
    shape(c, ellipsePts(-12, -14, 26, 24, 14), { fill: '#f0b54a', shade: '#a8661a', shadeOffset: 4 }, salt + 1);
    // topete
    for (let k = 0; k < 3; k++) shape(c, ellipsePts(-6 + k * 7, -42 - k * 2, 5, 12, 8, 0.4 * k - 0.2), { fill: '#d9542b', width: 3 }, salt + 2 + k);
    // bico abrindo
    shape(c, [[-34, -16], [-62, -12 - open * 6], [-36, -6]], { fill: '#e36a2b', width: 3.5 }, salt + 6);
    shape(c, [[-34, -6], [-58, -2 + open * 12], [-34, 0]], { fill: '#c9501f', width: 3.5 }, salt + 7);
    pieEye(c, -18, -20, 9, 12, -0.8, i % 2 ? -0.2 : 0.3, 0, salt + 8);
    // asinha tremendo
    shape(c, ellipsePts(20, 10 + (i % 2) * 3, 16, 10, 10, 0.5), { fill: '#c7862c', width: 3 }, salt + 9);
  });
}

function cage(c: Canvas, i: number, attack: boolean): void {
  const cx = 130;
  const cy = 150;
  // molas da gaiola
  for (let k = 0; k < 7; k++) {
    const x = cx - 90 + k * 30;
    inkLine(c, [[x, cy - 110], [x + 4 * Math.sin(i + k), cy - 40], [x - 3, cy + 30], [x + 2, cy + 110]], 9, 300 + k);
    inkLine(c, [[x, cy - 110], [x + 4 * Math.sin(i + k), cy - 40], [x - 3, cy + 30], [x + 2, cy + 110]], 4, 310 + k, '#c9c3b6');
  }
  shape(c, ellipsePts(cx, cy - 112, 100, 18, 16), { fill: BRASS, shade: BRASS_SH, shadeOffset: 4 }, 320);
  shape(c, ellipsePts(cx, cy + 112, 100, 18, 16), { fill: BRASS, shade: BRASS_SH, shadeOffset: 4 }, 321);
  shape(c, ellipsePts(cx, cy - 138, 16, 16, 10), { fill: BRASS, width: 4 }, 322);
  inkLine(c, [[cx, cy - 150], [cx, cy - 200]], 5, 323);
  cuckoo(c, cx + 6, cy + 10 + (i % 2) * 4, attack ? 1 : i % 2 ? 0.3 : 0, i, 330, 1.25);
  // asas batendo fora da gaiola (voo)
  const flap = i % 2 ? -18 : 12;
  shape(c, [[cx - 100, cy - 20], [cx - 160, cy - 60 + flap], [cx - 150, cy + 10 + flap * 0.5], [cx - 100, cy + 20]], { fill: '#e8a23a', shade: '#a8661a', shadeOffset: 4 }, 340);
  shape(c, [[cx + 100, cy - 20], [cx + 160, cy - 60 + flap], [cx + 150, cy + 10 + flap * 0.5], [cx + 100, cy + 20]], { fill: '#e8a23a', shade: '#a8661a', shadeOffset: 4 }, 341);
}

function clockFrames(name: string, n: number, fps: number, repeat: number, fn: (i: number) => CucoPose): SpriteDef {
  return { name, w: W, h: H, frames: n, fps, repeat, draw: (c, i) => drawClock(c, fn(i)) };
}

const TAU = Math.PI * 2;

export function cucoSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const [ph, mood] of [['p1', 'calm'], ['p2', 'angry'], ['p3', 'broken']] as [string, Mood][]) {
    out.push(
      clockFrames(`cuco_${ph}_idle`, 4, 8, -1, (i) => {
        const p = base();
        p.mood = mood;
        const t = i / 4;
        p.pend = Math.sin(t * TAU);
        p.lean = Math.sin(t * TAU) * 1.5;
        p.squash = 1 + Math.sin(t * TAU * 2) * 0.01;
        p.armL = 200 + Math.sin(t * TAU) * 8;
        p.armR = -20 - Math.sin(t * TAU) * 8;
        p.blink = i === 3 ? 1 : 0;
        p.lookX = -0.8 + Math.sin(t * TAU) * 0.2;
        p.mouth = mood === 'angry' ? 'grit' : mood === 'broken' ? 'sad' : 'flat';
        p.cracks = mood === 'broken' ? 2 : 0;
        p.steam = mood === 'angry' ? (i % 3) / 3 : 0;
        return p;
      }),
    );
    if (ph === 'p3') continue;
    out.push(
      clockFrames(`cuco_${ph}_windup`, 2, 12, -1, (i) => {
        const p = base();
        p.mood = mood;
        p.lean = 6 + i * 1.5;
        p.squash = 0.96;
        p.armL = 250;
        p.armR = -80;
        p.handL = 'fist';
        p.handR = 'fist';
        p.mouth = 'grit';
        p.pend = i ? 1 : 0.8;
        p.steam = mood === 'angry' ? 0.6 : 0;
        return p;
      }),
      clockFrames(`cuco_${ph}_attack`, 2, 12, -1, (i) => {
        const p = base();
        p.mood = mood;
        p.lean = -7;
        p.squash = 1.04;
        p.armL = 170 + i * 6;
        p.armR = 10;
        p.handL = 'point';
        p.mouth = 'open';
        p.pend = -1;
        p.lookX = -1;
        return p;
      }),
      clockFrames(`cuco_${ph}_chime`, 2, 12, -1, (i) => {
        const p = base();
        p.mood = mood;
        p.squash = i ? 0.94 : 1.05;
        p.hop = i ? 0 : 10;
        p.mouth = 'open';
        p.armL = 230;
        p.armR = -60;
        p.handL = 'wave';
        p.handR = 'wave';
        p.blink = 1;
        return p;
      }),
      clockFrames(`cuco_${ph}_cuckoo_out`, 2, 12, -1, (i) => {
        const p = base();
        p.mood = mood;
        p.door = 1;
        p.lookY = -0.9;
        p.lookX = -0.2;
        p.mouth = 'o';
        p.pend = i ? 0.3 : -0.3;
        return p;
      }),
      clockFrames(`cuco_${ph}_cuckoo_spit`, 2, 12, -1, (i) => {
        const p = base();
        p.mood = mood;
        p.door = 1;
        p.lookY = -0.9;
        p.mouth = 'grin';
        p.pend = i ? 0.5 : -0.5;
        return p;
      }),
    );
  }
  out.push(
    clockFrames('cuco_transition', 4, 12, -1, (i) => {
      const p = base();
      p.mood = i < 2 ? 'calm' : 'angry';
      p.lean = i % 2 ? 4 : -4;
      p.hop = i % 2 ? 6 : 0;
      p.squash = i % 2 ? 0.95 : 1.05;
      p.armL = 250;
      p.armR = -90;
      p.handL = 'wave';
      p.handR = 'wave';
      p.mouth = 'open';
      p.steam = 1;
      p.blink = i % 2;
      return p;
    }),
    clockFrames('cuco_crack', 4, 12, -1, (i) => {
      const p = base();
      p.mood = 'broken';
      p.cracks = i < 2 ? 1 : 2;
      p.lean = i % 2 ? 5 : -5;
      p.mouth = 'o';
      p.door = 1;
      p.steam = 1;
      return p;
    }),
    clockFrames('cuco_knockout', 6, 12, -1, (i) => {
      const p = base();
      p.mood = 'ko';
      p.cracks = 2;
      p.spin = i * 60;
      p.lean = Math.sin(i) * 6;
      p.hop = i % 2 ? 8 : 0;
      p.armL = 150 + i * 40;
      p.armR = -60 - i * 40;
      p.handL = 'wave';
      p.handR = 'wave';
      p.mouth = 'o';
      p.door = 1;
      p.steam = 1;
      return p;
    }),
    {
      name: 'cuco_cuckoo',
      w: 150,
      h: 130,
      frames: 4,
      fps: 12,
      repeat: -1,
      draw: (c, i) => cuckoo(c, 80, 70, i >= 2 ? 1 : 0, i, 400),
    },
    {
      name: 'cuco_cage_idle',
      w: 340,
      h: 360,
      frames: 4,
      fps: 12,
      repeat: -1,
      draw: (c, i) => c.group('translate(40 30)', () => cage(c, i, false)),
    },
    {
      name: 'cuco_cage_attack',
      w: 340,
      h: 360,
      frames: 2,
      fps: 12,
      repeat: -1,
      draw: (c, i) => c.group('translate(40 30)', () => cage(c, i + 1, true)),
    },
    {
      name: 'cuco_flee',
      w: 200,
      h: 170,
      frames: 4,
      fps: 12,
      repeat: -1,
      draw: (c, i) => {
        cuckoo(c, 110, 70, 0.4, i, 420);
        // maleta
        shape(c, roundRectPts(20, 70 + (i % 2) * 4, 60, 44, 8), { fill: '#7a3b22', shade: '#4a2212', shadeOffset: 4 }, 430);
        inkLine(c, [[40, 70 + (i % 2) * 4], [44, 58], [58, 58], [62, 70 + (i % 2) * 4]], 4, 431);
        // perninhas correndo
        const s = Math.sin((i / 4) * TAU);
        inkLine(c, [[110, 100], [100 + s * 16, 150]], 5, 432, '#c9501f');
        inkLine(c, [[124, 100], [132 - s * 16, 150]], 5, 433, '#c9501f');
        puff(c, 170, 150, 12, 'rgba(220,205,180,0.8)', 434, 5);
      },
    },
    // perigos
    {
      name: 'hz_pendulum_bob',
      w: 150,
      h: 150,
      frames: 1,
      draw: (c) => {
        shape(c, ellipsePts(75, 75, 62, 62, 20), { fill: BRASS, shade: BRASS_SH, shadeOffset: 10, highlight: 'rgba(255,245,210,0.6)', width: 6 }, 500);
        sparkle(c, 75, 75, 28, '#f2c65a', 501);
        shape(c, ellipsePts(75, 75, 12, 12, 10), { fill: BRASS_SH, width: 4 }, 502);
      },
    },
    {
      name: 'hz_pendulum_rod',
      w: 28,
      h: 256,
      frames: 1,
      draw: (c) => {
        c.add(`<rect x="6" y="0" width="16" height="256" fill="${INK}"/>`);
        c.add(`<rect x="10" y="0" width="7" height="256" fill="${BRASS}"/>`);
      },
    },
    {
      name: 'hz_hand_low',
      w: 540,
      h: 80,
      frames: 1,
      draw: (c) => clockHandShape(c, 520, 40, 500, 180, 22, 510),
    },
    {
      name: 'hz_hand_high',
      w: 580,
      h: 100,
      frames: 1,
      draw: (c) => {
        clockHandShape(c, 560, 50, 540, 180, 30, 520);
        shape(c, ellipsePts(150, 50, 18, 12, 10), { fill: '#8a6b3a', width: 3 }, 521);
      },
    },
  );
  return out;
}

// -------------------------------------------------------------------------------------------------
// Cenário: relojoaria (fundo dessaturado e de baixo contraste)

function clockSilhouette(c: Canvas, x: number, y: number, r: number, fill: string, salt: number, h1: number, h2: number): void {
  bgShape(c, ellipsePts(x, y, r, r, 16), fill, salt, 'rgba(40,25,15,0.45)', 3);
  bgShape(c, ellipsePts(x, y, r * 0.8, r * 0.8, 16), '#d9c9a3', salt + 1, 'rgba(40,25,15,0.3)', 2);
  inkLine(c, [[x, y], [x + Math.cos(h1) * r * 0.6, y + Math.sin(h1) * r * 0.6]], 4, salt + 2, 'rgba(40,25,15,0.6)');
  inkLine(c, [[x, y], [x + Math.cos(h2) * r * 0.45, y + Math.sin(h2) * r * 0.45]], 5, salt + 3, 'rgba(40,25,15,0.6)');
}

export const CUCO_IMAGES = [
  {
    pack: 'ilha1',
    key: 'bg_cuco_far',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#5b4632'], [0.6, '#7a6146'], [1, '#6b533a']])}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 11, 0.35);
      // papel de parede com losangos
      for (let y = 0; y < 900; y += 90) {
        for (let x = (y / 90) % 2 ? 45 : 0; x < 1920; x += 90) {
          c.add(`<path d="M${x},${y + 20} L${x + 14},${y + 45} L${x},${y + 70} L${x - 14},${y + 45} Z" fill="rgba(240,215,160,0.12)"/>`);
        }
      }
      // janela com luar
      c.add(`<rect x="780" y="120" width="360" height="420" rx="170" fill="${rgrad(c, [[0, '#b9b8a0'], [1, '#6d6c5c']])}" stroke="rgba(40,25,15,0.6)" stroke-width="10"/>`);
      c.add(`<path d="M960,120 L960,540 M780,330 L1140,330" stroke="rgba(40,25,15,0.6)" stroke-width="10"/>`);
      // prateleiras distantes de relógios
      for (let k = 0; k < 12; k++) {
        const x = 90 + k * 160 + (k % 3) * 12;
        const y = 640 + (k % 2) * 40;
        clockSilhouette(c, x, y, 38 + (k % 3) * 10, '#8d7152', 700 + k * 5, k * 0.7, k * 1.9);
      }
      c.add(`<rect x="0" y="700" width="1920" height="26" fill="#4b3826" opacity="0.8"/>`);
    },
  },
  {
    pack: 'ilha1',
    key: 'bg_cuco_mid',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: false,
    draw: (c: Canvas) => {
      // relógio de pé à esquerda e bancada
      bgShape(c, roundRectPts(60, 260, 170, 640, 30), '#6e4a2c', 800, 'rgba(40,25,15,0.6)', 4, '#4f331c');
      clockSilhouette(c, 145, 360, 62, '#a17c4e', 801, -1.2, 0.5);
      bgShape(c, roundRectPts(1200, 700, 700, 60, 10), '#7a5634', 810, 'rgba(40,25,15,0.6)', 4, '#57391f');
      for (let k = 0; k < 4; k++) clockSilhouette(c, 1280 + k * 150, 650, 42, '#9b784c', 820 + k * 4, k, k * 2.3);
      // lustres pendurados
      for (const x of [520, 1400]) {
        inkLine(c, [[x, 0], [x, 140]], 4, 840 + x, 'rgba(40,25,15,0.6)');
        bgShape(c, [[x - 60, 140], [x + 60, 140], [x + 30, 190], [x - 30, 190]], '#b08a4a', 850 + x, 'rgba(40,25,15,0.6)', 3);
        c.add(`<ellipse cx="${x}" cy="210" rx="140" ry="60" fill="rgba(255,230,160,0.12)"/>`);
      }
    },
  },
  {
    pack: 'ilha1',
    key: 'bg_cuco_floor',
    w: 1920,
    h: 200,
    scale: 1,
    opaque: false,
    draw: (c: Canvas) => {
      planks(c, 0, 20, 1920, 180, '#8a6440', '#5f4128', 900);
      c.add(`<rect x="0" y="0" width="1920" height="24" fill="#5a3c22"/>`);
    },
  },
  {
    pack: 'ilha1',
    key: 'bg_cuco_fg',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: false,
    draw: (c: Canvas) => {
      // correntes penduradas nas bordas (primeiro plano sutil, fora da área de jogo relevante)
      for (const [x, len] of [[40, 260], [110, 180], [1830, 220], [1880, 300]] as [number, number][]) {
        for (let k = 0; k < len / 18; k++) c.add(`<ellipse cx="${x}" cy="${k * 18}" rx="7" ry="10" fill="none" stroke="#2a1a0e" stroke-width="5"/>`);
        c.add(`<ellipse cx="${x}" cy="${len + 20}" rx="22" ry="34" fill="#3a2414"/>`);
      }
      c.add(`<rect x="0" y="1040" width="1920" height="40" fill="#2a1a0e" opacity="0.9"/>`);
      void WHITE;
    },
  },
];

registerGroups([{ pack: 'ilha1', atlas: 'cuco', palette: true, scale: 0.8, sprites: cucoSprites }], CUCO_IMAGES);
