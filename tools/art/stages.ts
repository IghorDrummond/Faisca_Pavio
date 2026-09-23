/** Inimigos comuns, objetos de fase, mini-chefes e cenários das fases run'n'gun/tutorial. */
import type { SpriteDef } from './fx';
import { PARRY, PARRY_SH } from './fx';
import { type Canvas, type Pt, INK, WHITE, ellipsePts, flame, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, shoe, sparkle } from './lib/svg';
import { bgShape, lightCone, planks, rgrad, vgrad, wash } from './lib/scenery';
import { registerGroups } from './groups';

const TAU = Math.PI * 2;

function eyes(c: Canvas, x: number, y: number, s: number, look: number, salt: number, blink = 0): void {
  pieEye(c, x - 9 * s, y, 7 * s, 10 * s, look, 0, blink, salt);
  pieEye(c, x + 9 * s, y - 1, 7 * s, 10 * s, look, 0, blink, salt + 1);
}

// quadros ~140x140 com base (pés) em y=136, olhando para a esquerda
function enemyDefs(): SpriteDef[] {
  const out: SpriteDef[] = [];
  const add = (name: string, n: number, fps: number, draw: (c: Canvas, i: number) => void, w = 140, h = 140): void => {
    out.push({ name, w, h, frames: n, fps, repeat: -1, draw });
  };
  // 1. Parafuso saltitante
  const parafuso = (c: Canvas, i: number, atk: boolean): void => {
    const hop = atk ? 10 : Math.abs(Math.sin((i / 4) * TAU)) * 6;
    c.group(`translate(0 ${-hop})`, () => {
      hose(c, [60, 108], [52, 132], -3, 6, INK, 4000);
      hose(c, [80, 108], [88, 132], 3, 6, INK, 4001);
      shoe(c, 50, 132, 14, -1, '#6e2a19', 4002);
      shoe(c, 90, 132, 14, 1, '#6e2a19', 4003);
      shape(c, roundRectPts(52, 56, 36, 56, 6), { fill: '#b8b0a0', shade: '#6c665c', shadeOffset: 5 }, 4004);
      for (let k = 0; k < 4; k++) inkLine(c, [[52, 66 + k * 12], [88, 60 + k * 12]], 3, 4005 + k);
      shape(c, [[36, 56], [104, 56], [110, 36], [70, 26], [30, 36]], { fill: '#d9d4c8', shade: '#8d8778', shadeOffset: 5 }, 4010);
      inkLine(c, [[58, 40], [84, 42]], 5, 4011);
      eyes(c, 70, 76, 0.9, -0.8, 4012);
      mouth(c, 70, 96, 8, atk ? 'grit' : 'flat', 4014);
    });
  };
  add('en_parafuso', 4, 12, (c, i) => parafuso(c, i, false));
  add('en_parafuso_atk', 2, 12, (c, i) => parafuso(c, i, true));
  // 2. Lâmpada vigia (teto)
  const lamp = (c: Canvas, i: number, hot: boolean): void => {
    inkLine(c, [[70, 0], [70, 30]], 5, 4020);
    shape(c, [[40, 30], [100, 30], [112, 70], [28, 70]], { fill: '#3a3a42', shade: '#1a1a20', shadeOffset: 4 }, 4021);
    shape(c, ellipsePts(70, 88, 34, 28, 16), { fill: hot ? (i % 2 ? '#ffe27a' : '#ff9b2e') : '#efe2c4', shade: '#b8a57a', shadeOffset: 5 }, 4022);
    eyes(c, 70, 86, 0.9, 0, 4023, hot ? 0 : 0.5);
    if (hot) sparkle(c, 70, 120, 14, '#fff6cf', 4025 + i);
  };
  add('en_lampada', 2, 6, (c, i) => lamp(c, i, false));
  add('en_lampada_atk', 2, 16, (c, i) => lamp(c, i, true));
  // 3. Sapato voador
  add('en_sapato', 4, 12, (c, i) => {
    const flap = i % 2 ? -12 : 10;
    shape(c, [[92, 70], [126, 50 + flap], [118, 84]], { fill: WHITE, width: 4 }, 4030);
    shoe(c, 70, 90, 44, -1, '#6e2a19', 4031);
    eyes(c, 60, 72, 0.8, -0.8, 4032);
    for (let k = 0; k < 3; k++) inkLine(c, [[80 + k * 8, 64], [86 + k * 8, 58]], 3, 4035 + k, WHITE);
  });
  // 4. Caixa-surpresa
  add('en_caixa', 2, 6, (c, i) => {
    shape(c, roundRectPts(30, 56 + (i % 2) * 2, 80, 80, 6), { fill: '#c9546a', shade: '#8a2f55', shadeOffset: 6 }, 4040);
    for (const [x, y] of [[45, 70], [95, 70], [45, 120], [95, 120]] as Pt[]) sparkle(c, x, y, 7, '#e8b64c', 4041 + x);
    shape(c, roundRectPts(26, 50, 88, 14, 4), { fill: '#e8b64c', width: 4 }, 4046);
    inkLine(c, [[112, 92], [128, 92], [128, 80]], 5, 4047);
    shape(c, ellipsePts(128, 76, 6, 6, 8), { fill: '#e8b64c', width: 3 }, 4048);
  });
  // 5. Escovinha teimosa
  const brush = (c: Canvas, i: number, atk: boolean): void => {
    const lean = atk ? -10 : 0;
    c.group(`rotate(${lean} 70 130)`, () => {
      for (let k = 0; k < 9; k++) inkLine(c, [[30 + k * 10, 118], [28 + k * 10 + (i % 2 ? 2 : -2), 136]], 4, 4050 + k, '#5a3a1e');
      shape(c, roundRectPts(24, 84, 96, 36, 14), { fill: '#b07a3e', shade: '#7a4f23', shadeOffset: 5 }, 4060);
      eyes(c, 56, 100, 0.8, -0.9, 4061);
      if (atk) {
        inkLine(c, [[44, 88], [58, 94]], 4, 4063);
        inkLine(c, [[70, 94], [80, 88]], 4, 4064);
        puff(c, 124, 120, 10, 'rgba(220,205,180,0.9)', 4065, 5);
      }
    });
  };
  add('en_escovinha', 2, 8, (c, i) => brush(c, i, false));
  add('en_escovinha_atk', 2, 16, (c, i) => brush(c, i, true));
  // 6. Cata-vento
  add('en_catavento', 4, 12, (c, i) => {
    inkLine(c, [[70, 70], [70, 140]], 6, 4070, '#7a5a34');
    c.group(`rotate(${i * 22} 70 60)`, () => {
      const cols = ['#d9542b', '#e8b64c', '#5d8a3a', '#2a4677'];
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU;
        shape(c, [[70, 60], [70 + Math.cos(a) * 50, 60 + Math.sin(a) * 50], [70 + Math.cos(a + 0.7) * 40, 60 + Math.sin(a + 0.7) * 40]], { fill: cols[k]!, width: 4 }, 4071 + k);
      }
    });
    shape(c, ellipsePts(70, 60, 12, 12, 10), { fill: '#efe2c4', width: 3 }, 4076);
    eyes(c, 70, 58, 0.45, 0, 4077);
  });
  // 7. Balão de papel (ciano — objeto de parry)
  add('en_balao', 2, 4, (c, i) => {
    inkLine(c, [[70, 104], [66 + (i % 2) * 6, 138]], 3, 4080, WHITE);
    shape(c, ellipsePts(70, 62, 40, 46, 16), { fill: PARRY, shade: PARRY_SH, shadeOffset: 6, stroke: WHITE, width: 5, highlight: 'rgba(255,255,255,0.65)' }, 4081);
    for (let k = 0; k < 3; k++) inkLine(c, [[46 + k * 24, 22 + (k === 1 ? -4 : 4)], [46 + k * 24, 104]], 2.5, 4082 + k, 'rgba(255,255,255,0.6)');
    eyes(c, 70, 58, 0.8, 0, 4086);
    mouth(c, 70, 78, 8, 'smile', 4088);
  });
  // 8. Torre de latinhas
  add('en_torre', 2, 6, (c, i) => {
    for (let k = 0; k < 3; k++) {
      const y = 40 + k * 60 + (i % 2 && k === 0 ? -3 : 0);
      shape(c, roundRectPts(48 - k * 4, y, 64 + k * 8, 56, 8), { fill: ['#c9c3b6', '#d35a8a', '#e2a64c'][k]!, shade: 'rgba(0,0,0,0.3)', shadeOffset: 5, highlight: 'rgba(255,255,255,0.45)' }, 4090 + k);
      eyes(c, 80, y + 26, 0.6, -0.8, 4094 + k * 2);
    }
  }, 160, 220);
  add('en_lata', 4, 12, (c, i) => {
    c.group(`rotate(${i * 30} 70 100)`, () => {
      shape(c, roundRectPts(44, 72, 52, 56, 8), { fill: '#c9c3b6', shade: '#6c665c', shadeOffset: 5 }, 4100);
      eyes(c, 70, 96, 0.6, -0.8, 4101);
    });
  });
  // morte: poeira de estrelas
  add('en_poof', 4, 16, (c, i) => {
    puff(c, 70, 90, 18 + i * 10, `rgba(235,228,215,${0.95 - i * 0.2})`, 4110 + i, 6);
    sparkle(c, 40 + i * 6, 60 - i * 6, 10, '#ffe27a', 4120 + i);
    sparkle(c, 100 - i * 4, 50 - i * 8, 8, '#ffffff', 4125 + i);
  });
  // alvo de treino (papelão)
  out.push({
    name: 'dummy',
    w: 140,
    h: 180,
    frames: 1,
    draw: (c) => {
      inkLine(c, [[70, 120], [70, 176]], 8, 4130, '#7a5a34');
      shape(c, ellipsePts(70, 70, 56, 56, 18), { fill: '#efe2c4', shade: '#b8a57a', shadeOffset: 6 }, 4131);
      shape(c, ellipsePts(70, 70, 36, 36, 16), { fill: '#d9542b', width: 4 }, 4132);
      shape(c, ellipsePts(70, 70, 16, 16, 12), { fill: '#efe2c4', width: 4 }, 4133);
    },
  });
  out.push({
    name: 'parry_balloon',
    w: 100,
    h: 120,
    frames: 1,
    draw: (c) => {
      inkLine(c, [[50, 92], [48, 118]], 3, 4140, WHITE);
      sparkle(c, 50, 52, 42, '#ffffff', 4141);
      sparkle(c, 50, 52, 30, '#bff8fb', 4142);
    },
  });
  return out;
}

// -------------------------------------------------------------------------------------------------
// Perigos de fase e mini-chefes

function hazardSprites(): SpriteDef[] {
  return [
    {
      name: 'hz_counterweight',
      w: 140,
      h: 900,
      draw: (c) => {
        inkLine(c, [[70, 0], [70, 780]], 6, 4200);
        shape(c, roundRectPts(20, 780, 100, 110, 10), { fill: '#4a4a52', shade: '#26262c', shadeOffset: 8, highlight: 'rgba(255,255,255,0.3)' }, 4201);
        inkLine(c, [[40, 830], [100, 830]], 4, 4202, '#e8b64c');
      },
    },
    {
      name: 'hz_press',
      w: 180,
      h: 900,
      draw: (c) => {
        shape(c, roundRectPts(60, 0, 60, 760, 6), { fill: '#6e5a4a', shade: '#44362a', shadeOffset: 6 }, 4210);
        shape(c, roundRectPts(8, 760, 164, 130, 10), { fill: '#8a7a6a', shade: '#44362a', shadeOffset: 8, highlight: 'rgba(255,255,255,0.3)' }, 4211);
        for (let k = 0; k < 5; k++) inkLine(c, [[20 + k * 32, 872], [36 + k * 32, 884]], 5, 4212 + k, '#e8b64c');
      },
    },
    {
      name: 'hz_steam',
      w: 120,
      h: 520,
      draw: (c) => {
        for (let k = 0; k < 7; k++) puff(c, 60 + Math.sin(k) * 10, 470 - k * 68, 44 - k * 2, 'rgba(240,235,228,0.92)', 4220 + k, 6);
      },
    },
    {
      name: 'hz_curtain_wave',
      w: 100,
      h: 80,
      draw: (c) => shape(c, [[4, 78], [30, 10], [50, 0], [70, 10], [96, 78]], { fill: '#a8322a', shade: '#6e1f18', shadeOffset: 6 }, 4230),
    },
  ];
}

function cortinaSprites(): SpriteDef[] {
  // Cortina de veludo viva: 460x780, âncora (230,420)
  const draw = (c: Canvas, i: number, mood: 'idle' | 'windup' | 'attack' | 'ko'): void => {
    const sway = Math.sin((i / 4) * TAU) * 8;
    c.group(`translate(230 420)`, () => {
      shape(c, roundRectPts(-220, -400, 440, 60, 10), { fill: '#e8b64c', shade: '#9c7418', shadeOffset: 6 }, 4300);
      const folds = 6;
      for (let k = 0; k < folds; k++) {
        const x0 = -200 + k * 68;
        const bend = Math.sin(k + i) * 10 + sway * (k / folds);
        shape(c, [[x0, -345], [x0 + 68, -345], [x0 + 70 + bend, 330], [x0 - 4 + bend, 350]], { fill: k % 2 ? '#a8322a' : '#922a22', shade: '#5e1712', shadeOffset: 10 }, 4301 + k);
      }
      // cordão dourado com borla (braço)
      hose(c, [-180, -60], [-250 + (mood === 'attack' ? -30 : 0), 60 + sway], 20, 9, '#e8b64c', 4310);
      glove(c, -250 + (mood === 'attack' ? -30 : 0), 60 + sway, Math.PI * 0.8, 24, mood === 'windup' ? 'fist' : 'open', 4311);
      hose(c, [180, -60], [240, 40 - sway], -20, 9, '#e8b64c', 4312);
      glove(c, 240, 40 - sway, 0.2, 24, 'wave', 4313);
      // rosto no tecido
      const blink = mood === 'ko' ? 1 : i === 3 ? 0.9 : 0;
      pieEye(c, -80, -150, 30, 40, -0.8, 0.1, blink, 4320);
      pieEye(c, 10, -155, 28, 38, -0.8, 0.1, blink, 4321);
      if (mood === 'windup' || mood === 'attack') {
        inkLine(c, [[-120, -205], [-50, -185]], 8, 4322);
        inkLine(c, [[40, -210], [-20, -190]], 8, 4323);
      }
      mouth(c, -40, -80, 40, mood === 'attack' ? 'open' : mood === 'ko' ? 'o' : mood === 'windup' ? 'grit' : 'grin', 4324);
      if (mood === 'ko') for (let k = 0; k < 3; k++) puff(c, -150 + k * 150, 280, 40, 'rgba(235,228,215,0.9)', 4330 + k, 6);
    });
  };
  const W = 460;
  const H = 780;
  return [
    { name: 'cortina_idle', w: W, h: H, frames: 4, fps: 8, repeat: -1, draw: (c, i) => draw(c, i, 'idle') },
    { name: 'cortina_windup', w: W, h: H, frames: 2, fps: 12, repeat: -1, draw: (c, i) => draw(c, i, 'windup') },
    { name: 'cortina_attack', w: W, h: H, frames: 2, fps: 12, repeat: -1, draw: (c, i) => draw(c, i, 'attack') },
    { name: 'cortina_ko', w: W, h: H, frames: 4, fps: 10, repeat: -1, draw: (c, i) => draw(c, i, 'ko') },
  ];
}

function foleSprites(): SpriteDef[] {
  // Fole gigante: 520x460, âncora (260,230)
  const draw = (c: Canvas, i: number, mood: 'idle' | 'windup' | 'attack' | 'ko'): void => {
    const squeeze = mood === 'attack' ? 0.8 : mood === 'windup' ? 1.15 : 1 + Math.sin((i / 4) * TAU) * 0.05;
    c.group(`translate(260 230)`, () => {
      // bico
      shape(c, [[-150, -24], [-250, -10], [-250, 10], [-150, 24]], { fill: '#8a7a6a', shade: '#44362a', shadeOffset: 4 }, 4400);
      if (mood === 'attack') puff(c, -270, 0, 30, 'rgba(90,80,75,0.9)', 4401, 6);
      c.group(`scale(1 ${squeeze})`, () => {
        shape(c, [[-160, -150], [170, -170], [190, 170], [-160, 150]], { fill: '#8a5a2e', shade: '#5a3a1e', shadeOffset: 10 }, 4402);
        for (let k = 0; k < 5; k++) inkLine(c, [[-140, -110 + k * 55], [170, -130 + k * 62]], 6, 4403 + k, '#3a2414');
        shape(c, [[-160, -150], [170, -170], [150, -200], [-150, -180]], { fill: '#b07a3e', width: 5 }, 4410);
      });
      // alças como braços
      hose(c, [170, -120], [230, -200], 10, 10, '#b07a3e', 4411);
      glove(c, 230, -200, -0.8, 24, 'fist', 4412);
      hose(c, [170, 120], [230, 200], -10, 10, '#b07a3e', 4413);
      glove(c, 230, 200, 0.8, 24, 'fist', 4414);
      const blink = mood === 'ko' ? 1 : i === 3 ? 0.9 : 0;
      pieEye(c, -40, -40, 28, 36, -0.8, 0, blink, 4420);
      pieEye(c, 40, -44, 26, 34, -0.8, 0, blink, 4421);
      mouth(c, 0, 40, 34, mood === 'attack' ? 'open' : mood === 'ko' ? 'sad' : 'grit', 4422);
      if (mood === 'ko') puff(c, 0, -210, 40, 'rgba(90,80,75,0.9)', 4423, 6);
    });
  };
  const W = 520;
  const H = 460;
  return [
    { name: 'fole_idle', w: W, h: H, frames: 4, fps: 8, repeat: -1, draw: (c, i) => draw(c, i, 'idle') },
    { name: 'fole_windup', w: W, h: H, frames: 2, fps: 12, repeat: -1, draw: (c, i) => draw(c, i, 'windup') },
    { name: 'fole_attack', w: W, h: H, frames: 2, fps: 12, repeat: -1, draw: (c, i) => draw(c, i, 'attack') },
    { name: 'fole_ko', w: W, h: H, frames: 4, fps: 10, repeat: -1, draw: (c, i) => draw(c, i, 'ko') },
  ];
}

// -------------------------------------------------------------------------------------------------
// Cenários (tileáveis horizontalmente, meia resolução)

function tutFar(c: Canvas): void {
  c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#5a2a24'], [1, '#2a1410']])}"/>`);
  wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 51, 0.35);
  for (let i = 0; i < 12; i++) c.add(`<rect x="${i * 160}" y="0" width="80" height="1080" fill="rgba(0,0,0,0.12)"/>`);
  lightCone(c, 480, 0, 700, 900, 'rgba(255,240,190,0.5)', 0.35);
  lightCone(c, 1440, 0, 700, 900, 'rgba(255,240,190,0.5)', 0.35);
}

function tutMid(c: Canvas): void {
  for (let i = 0; i < 3; i++) {
    const x = 200 + i * 640;
    bgShape(c, roundRectPts(x, 560, 260, 300, 10), '#6e4a2c', 5100 + i, 'rgba(40,25,15,0.6)', 4, '#4f331c');
    bgShape(c, ellipsePts(x + 130, 520, 90, 40, 14), '#e8d8a8', 5110 + i, 'rgba(40,25,15,0.4)', 3);
  }
}

function rg1Far(c: Canvas): void {
  c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#3a1a14'], [0.6, '#5a2a1c'], [1, '#2a120c']])}"/>`);
  wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 61, 0.35);
  // cordas e roldanas das coxias
  for (let i = 0; i < 10; i++) {
    const x = 90 + i * 190;
    c.add(`<path d="M${x},0 L${x + (i % 2 ? 20 : -20)},900" stroke="rgba(200,170,110,0.45)" stroke-width="6"/>`);
    bgShape(c, ellipsePts(x, 80 + (i % 3) * 40, 22, 22, 12), '#6e5a4a', 5200 + i, 'rgba(40,25,15,0.5)', 3);
  }
  // brilho de fogo distante
  c.add(`<ellipse cx="960" cy="1000" rx="1200" ry="260" fill="${rgrad(c, [[0, 'rgba(255,140,60,0.35)'], [1, 'rgba(255,140,60,0)']])}"/>`);
}

function rg1Mid(c: Canvas): void {
  for (let i = 0; i < 4; i++) {
    const x = i * 480 + 60;
    bgShape(c, [[x, 900], [x + 40, 300], [x + 200, 280], [x + 240, 900]], '#4a2a1c', 5300 + i, 'rgba(40,25,15,0.6)', 4, '#2e1a10');
    bgShape(c, roundRectPts(x + 60, 520, 120, 90, 6), '#8a6a3a', 5310 + i, 'rgba(40,25,15,0.5)', 3);
  }
}

function rg2Far(c: Canvas): void {
  c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#4a4448'], [1, '#2a2628']])}"/>`);
  wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 71, 0.35);
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 280;
    bgShape(c, roundRectPts(x, 380 - (i % 2) * 120, 90, 700, 4), '#3a3438', 5400 + i, 'rgba(20,15,15,0.5)', 3);
    puff(c, x + 45, 330 - (i % 2) * 120, 50, 'rgba(120,112,110,0.45)', 5410 + i, 6);
  }
}

function rg2Mid(c: Canvas): void {
  for (let i = 0; i < 5; i++) {
    const cx = 200 + i * 380;
    const cy = 560 + (i % 2) * 80;
    const pts: Pt[] = [];
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * TAU;
      const r = k % 4 < 2 ? 130 : 108;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    bgShape(c, pts, '#6e5a44', 5500 + i, 'rgba(20,15,15,0.5)', 4, '#44362a');
    bgShape(c, ellipsePts(cx, cy, 34, 34, 12), '#3a3024', 5510 + i, 'rgba(20,15,15,0.5)', 3);
  }
  c.add(`<rect x="0" y="820" width="1920" height="30" fill="rgba(40,34,30,0.8)"/>`);
}

const img = (pack: string, key: string, draw: (c: Canvas) => void, opaque: boolean) => ({ pack, key, w: 1920, h: 1080, scale: 0.5, opaque, draw });

registerGroups(
  [
    { pack: 'core', atlas: 'enemies', palette: true, sprites: () => [...enemyDefs(), ...hazardSprites()] },
    { pack: 'ilha1', atlas: 'cortina', palette: true, scale: 0.8, sprites: cortinaSprites },
    { pack: 'ilha2', atlas: 'fole', palette: true, scale: 0.8, sprites: foleSprites },
  ],
  [
    img('ilha1', 'bg_tut_far', tutFar, true),
    img('ilha1', 'bg_tut_mid', tutMid, false),
    img('ilha1', 'bg_rg1_far', rg1Far, true),
    img('ilha1', 'bg_rg1_mid', rg1Mid, false),
    img('ilha2', 'bg_rg2_far', rg2Far, true),
    img('ilha2', 'bg_rg2_mid', rg2Mid, false),
  ],
);

void flame;
void planks;
