/** TIO GRAMOFONE — gramofone vaidoso, corneta dourada e bigode de disco de vinil. */
import type { SpriteDef } from '../fx';
import { type Canvas, type Pt, INK, WHITE, ellipsePts, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, sparkle } from '../lib/svg';
import { bgShape, planks, vgrad, wash, lightCone } from '../lib/scenery';
import { registerGroups } from '../groups';

const GOLD = '#e8b64c';
const GOLD_SH = '#9c7418';
const WOOD = '#7a4a24';
const WOOD_SH = '#4a2a12';
const TAU = Math.PI * 2;

interface P {
  lean: number;
  squash: number;
  blink: number;
  mouth: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat';
  horn: number; // abertura da corneta
  disc: number; // rotação do disco
  mood: 'vain' | 'scratch' | 'inhale' | 'dizzy' | 'ko';
  crank: number;
}

const base = (): P => ({ lean: 0, squash: 1, blink: 0, mouth: 'grin', horn: 1, disc: 0, mood: 'vain', crank: 0 });

// Quadro 560x640, âncora (300,340)
function draw(c: Canvas, p: P): void {
  c.group(`translate(300 340) rotate(${p.lean} 0 250) scale(${2 - p.squash} ${p.squash})`, () => {
    // pés/base
    for (const x of [-120, 170]) shape(c, ellipsePts(x, 262, 30, 14, 10), { fill: GOLD, shade: GOLD_SH, shadeOffset: 3 }, 7000 + x);
    // caixa de madeira
    shape(c, roundRectPts(-150, 40, 360, 220, 14), { fill: WOOD, shade: WOOD_SH, shadeOffset: 12, highlight: 'rgba(255,220,180,0.25)' }, 7010);
    inkLine(c, [[-130, 70], [190, 70]], 4, 7011, GOLD);
    inkLine(c, [[-130, 236], [190, 236]], 4, 7012, GOLD);
    // disco girando em cima
    // disco em perspectiva: só o reflexo gira (a elipse fica parada)
    shape(c, ellipsePts(30, 34, 170, 26, 24), { fill: '#241c1a', width: 5 }, 7020);
    shape(c, ellipsePts(30, 34, 50, 10, 16), { fill: '#d9542b', width: 3 }, 7021);
    const ra = (p.disc * Math.PI) / 180;
    inkLine(c, [[30 + Math.cos(ra) * 70, 34 + Math.sin(ra) * 10], [30 + Math.cos(ra) * 140, 34 + Math.sin(ra) * 20]], 3, 7022, 'rgba(255,255,255,0.4)');
    // braço da agulha + corneta dourada (flor)
    inkLine(c, [[150, 20], [120, -40], [40, -90]], 10, 7030);
    inkLine(c, [[150, 20], [120, -40], [40, -90]], 5, 7031, GOLD);
    const hw = 90 * p.horn;
    const bell: Pt[] = [
      [40, -90],
      [-60, -150 - hw * 0.6],
      [-170, -250 - hw * 0.9],
      [-230, -210 - hw * 0.5],
      [-250, -110],
      [-220, -20 + hw * 0.3],
      [-120, -40],
      [20, -70],
    ];
    shape(c, bell, { fill: GOLD, shade: GOLD_SH, shadeOffset: 12, highlight: 'rgba(255,245,210,0.65)' }, 7040);
    shape(c, ellipsePts(-225, -140, 30 + hw * 0.1, 80 + hw * 0.3, 18, 0.35), { fill: '#3a2414', width: 5 }, 7041);
    for (let k = 0; k < 4; k++) inkLine(c, [[20 - k * 12, -76 - k * 4], [-200 + k * 10, -240 + k * 50]], 3, 7042 + k, GOLD_SH);
    // rosto na caixa
    const e = p.mood === 'ko' || p.mood === 'dizzy' ? 0.9 : p.blink;
    pieEye(c, -60, 130, 24, 30, -0.8, p.mood === 'inhale' ? -0.5 : 0, e, 7050);
    pieEye(c, 30, 126, 22, 28, -0.8, p.mood === 'inhale' ? -0.5 : 0, e, 7051);
    if (p.mood === 'scratch' || p.mood === 'dizzy') {
      inkLine(c, [[-92, 84], [-34, 98]], 7, 7052);
      inkLine(c, [[62, 82], [4, 96]], 7, 7053);
    }
    if (p.mood === 'inhale') {
      shape(c, ellipsePts(-110, 190, 28, 22, 12), { fill: '#d9854a', width: 4 }, 7054);
      shape(c, ellipsePts(80, 186, 26, 20, 12), { fill: '#d9854a', width: 4 }, 7055);
    }
    // bigode de disco de vinil
    for (const s of [-1, 1]) shape(c, [[-15, 176], [-15 + s * 40, 166], [-15 + s * 86, 180], [-15 + s * 96, 162], [-15 + s * 90, 198], [-15 + s * 40, 196]], { fill: '#241c1a', width: 3.5 }, 7060 + s);
    mouth(c, -15, 204, 22, p.mouth, 7063);
    // manivela (braço) com luva
    shape(c, ellipsePts(214, 150, 18, 18, 10), { fill: GOLD, width: 4 }, 7070);
    const ca = p.crank;
    const hx = 214 + Math.cos(ca) * 60;
    const hy = 150 + Math.sin(ca) * 60;
    hose(c, [214, 150], [hx, hy], 8, 9, INK, 7071);
    glove(c, hx, hy, ca, 20, 'fist', 7072);
    // braço esquerdo vaidoso ajeitando o bigode
    hose(c, [-150, 140], [-200, 90], -12, 9, INK, 7073);
    glove(c, -200, 90, Math.PI * 1.1, 20, p.mood === 'vain' ? 'point' : 'open', 7074);
    if (p.mood === 'dizzy') for (let k = 0; k < 3; k++) sparkle(c, -80 + k * 80, -10, 14, '#ffe27a', 7080 + k);
    if (p.mood === 'ko') for (let k = 0; k < 3; k++) puff(c, -120 + k * 120, 20, 34, 'rgba(235,228,215,0.9)', 7085 + k, 6);
  });
}

function fr(name: string, n: number, fps: number, fn: (i: number) => P): SpriteDef {
  return { name, w: 560, h: 640, frames: n, fps, repeat: -1, draw: (c, i) => draw(c, fn(i)) };
}

export function gramofoneSprites(): SpriteDef[] {
  const moods: [string, P['mood']][] = [
    ['p1', 'vain'],
    ['p2', 'scratch'],
    ['p3', 'inhale'],
    ['p4', 'dizzy'],
  ];
  const out: SpriteDef[] = [];
  for (const [ph, mood] of moods) {
    out.push(
      fr(`gramofone_${ph}_idle`, 4, 8, (i) => ({ ...base(), mood, disc: i * 45, crank: (i / 4) * TAU, lean: Math.sin((i / 4) * TAU) * 2, blink: i === 3 ? 1 : 0, mouth: mood === 'vain' ? 'grin' : mood === 'dizzy' ? 'o' : 'grit' })),
      fr(`gramofone_${ph}_windup`, 2, 12, (i) => ({ ...base(), mood, disc: i * 90, horn: 0.7, lean: 5, squash: 0.95, mouth: 'grit', crank: -1.2 })),
      fr(`gramofone_${ph}_attack`, 2, 12, (i) => ({ ...base(), mood, disc: i * 90, horn: 1.3, lean: -6, squash: 1.05, mouth: 'open', crank: 1.2 })),
    );
  }
  out.push(
    fr('gramofone_scratch', 2, 16, (i) => ({ ...base(), mood: 'scratch', disc: i * 180, lean: i ? 4 : -4, mouth: 'o' })),
    fr('gramofone_inhale', 2, 12, (i) => ({ ...base(), mood: 'inhale', horn: 1.4 + i * 0.1, squash: 1.06, mouth: 'o' })),
    fr('gramofone_transition', 4, 12, (i) => ({ ...base(), mood: i < 2 ? 'scratch' : 'dizzy', lean: i % 2 ? 6 : -6, disc: i * 120, mouth: 'open' })),
    fr('gramofone_knockout', 4, 8, (i) => ({ ...base(), mood: 'ko', lean: 6 + i * 4, squash: 1 - i * 0.04, horn: 0.6 - i * 0.05, mouth: 'sad', crank: 1.5 })),
    {
      name: 'hz_soundbar_low',
      w: 300,
      h: 70,
      draw: (c) => {
        for (let k = 0; k < 5; k++) shape(c, roundRectPts(10 + k * 58, 8, 44, 54, 10), { fill: k % 2 ? GOLD : '#d9542b', width: 4 }, 7100 + k);
      },
    },
    {
      name: 'hz_soundbar_high',
      w: 300,
      h: 90,
      draw: (c) => {
        for (let k = 0; k < 5; k++) shape(c, roundRectPts(10 + k * 58, 8, 44, 74, 10), { fill: k % 2 ? '#d9542b' : GOLD, width: 4 }, 7110 + k);
      },
    },
  );
  return out;
}

export const GRAMOFONE_IMAGES = [
  {
    pack: 'ilha2',
    key: 'bg_gramofone_far',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#3a2a4a'], [1, '#5a3a3a']])}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 91, 0.35);
      // salão de baile: lustres, colunas, casais dançando em silhueta
      for (let k = 0; k < 6; k++) bgShape(c, roundRectPts(80 + k * 330, 200, 70, 560, 10), '#6a4a5a', 9100 + k, 'rgba(30,20,30,0.5)', 3);
      for (const x of [480, 1440]) {
        lightCone(c, x, 60, 600, 700, 'rgba(255,230,170,0.6)', 0.3);
        bgShape(c, ellipsePts(x, 80, 90, 30, 14), '#c9a24a', 9110 + x, 'rgba(30,20,30,0.6)', 3);
      }
      for (let k = 0; k < 5; k++) bgShape(c, ellipsePts(300 + k * 320, 700, 40, 90, 14), 'rgba(40,25,40,0.45)', 9120 + k, 'rgba(0,0,0,0)', 0.1);
    },
  },
  {
    pack: 'ilha2',
    key: 'bg_gramofone_floor',
    w: 1920,
    h: 200,
    scale: 1,
    opaque: false,
    draw: (c: Canvas) => {
      planks(c, 0, 20, 1920, 180, '#8a5a4a', '#5a3a2a', 9200);
      for (let x = 0; x < 1920; x += 120) c.add(`<rect x="${x}" y="20" width="60" height="180" fill="rgba(255,255,255,0.05)"/>`);
      c.add(`<rect x="0" y="0" width="1920" height="24" fill="#5a3a2a"/>`);
      void WHITE;
    },
  },
];

registerGroups([{ pack: 'ilha2', atlas: 'gramofone', palette: true, scale: 0.8, sprites: gramofoneSprites }], GRAMOFONE_IMAGES);
