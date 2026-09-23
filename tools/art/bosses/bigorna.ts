/** IRMÃS BIGORNA — BATE (impulsiva, lenço vermelho) e FORJA (calculista, óculos e tenaz). */
import type { SpriteDef } from '../fx';
import { type Canvas, INK, WHITE, ellipsePts, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, sparkle } from '../lib/svg';
import { bgShape, planks, rgrad, vgrad, wash } from '../lib/scenery';
import { registerGroups } from '../groups';

const IRON = '#4a4a52';
const IRON_SH = '#26262c';
const TAU = Math.PI * 2;

type Who = 'bate' | 'forja';
interface P {
  who: Who;
  lean: number;
  squash: number;
  blink: number;
  mouth: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat';
  arm: number;
  angry: boolean;
  crying: boolean;
  hot: number;
}

const base = (who: Who): P => ({ who, lean: 0, squash: 1, blink: 0, mouth: who === 'bate' ? 'grit' : 'smile', arm: 0, angry: false, crying: false, hot: 0 });

// Quadro 380x340, âncora (190,200) = centro do corpo; olha para a esquerda (o jogo espelha a da esquerda)
function anvil(c: Canvas, p: P): void {
  c.group(`translate(190 200) rotate(${p.lean} 0 100) scale(${2 - p.squash} ${p.squash})`, () => {
    // pé
    shape(c, [[-80, 100], [80, 100], [60, 50], [-60, 50]], { fill: IRON, shade: IRON_SH, shadeOffset: 6 }, 7500);
    // cintura
    shape(c, roundRectPts(-50, -10, 100, 70, 10), { fill: IRON, shade: IRON_SH, shadeOffset: 6 }, 7501);
    // topo com chifre (bico) para a esquerda
    shape(c, [[-190, -60], [-80, -90], [130, -90], [130, -20], [-80, -20], [-150, -30]], { fill: p.hot > 0 ? '#8a4a3a' : IRON, shade: IRON_SH, shadeOffset: 8, highlight: 'rgba(255,255,255,0.35)' }, 7502);
    if (p.hot > 0) inkLine(c, [[-170, -58], [-90, -76]], 5, 7503, '#ffae3a');
    // rosto
    const bl = p.crying ? 0.9 : p.blink;
    pieEye(c, -50, -54, 16, 20, -0.9, 0, bl, 7510);
    pieEye(c, 10, -56, 15, 19, -0.9, 0, bl, 7511);
    if (p.who === 'forja') {
      shape(c, ellipsePts(-50, -54, 22, 22, 14), { fill: 'none', stroke: INK, width: 4 }, 7512);
      shape(c, ellipsePts(10, -56, 21, 21, 14), { fill: 'none', stroke: INK, width: 4 }, 7513);
      inkLine(c, [[-28, -55], [-11, -56]], 4, 7514);
    } else {
      // lenço vermelho
      shape(c, [[-120, -96], [120, -96], [110, -118], [-110, -118]], { fill: '#c9362b', width: 4 }, 7515);
      shape(c, [[110, -110], [150, -140], [146, -96]], { fill: '#c9362b', width: 4 }, 7516);
    }
    if (p.angry || p.who === 'bate') {
      inkLine(c, [[-74, -82], [-30, -72]], 6, 7517);
      inkLine(c, [[34, -84], [-6, -74]], 6, 7518);
    }
    mouth(c, -20, -34, 16, p.crying ? 'sad' : p.mouth, 7519);
    if (p.crying) {
      shape(c, ellipsePts(-66, -24, 6, 10, 8), { fill: '#7ac8ff', width: 2 }, 7520);
      shape(c, ellipsePts(24, -26, 6, 10, 8), { fill: '#7ac8ff', width: 2 }, 7521);
      puff(c, 60, -130, 24, 'rgba(200,190,180,0.85)', 7522, 5);
    }
    // braços
    const ax = p.who === 'bate' ? -120 : -110;
    hose(c, [-40, 10], [ax, -40 + p.arm], 12, 10, INK, 7530);
    hose(c, [40, 10], [110, -30 - p.arm * 0.5], -12, 10, INK, 7531);
    if (p.who === 'bate') {
      glove(c, ax, -40 + p.arm, Math.PI, 24, 'fist', 7532);
      glove(c, 110, -30 - p.arm * 0.5, 0, 24, 'fist', 7533);
    } else {
      glove(c, ax, -40 + p.arm, Math.PI, 20, 'fist', 7534);
      // tenaz
      inkLine(c, [[ax - 10, -40 + p.arm], [ax - 70, -90 + p.arm]], 5, 7535);
      inkLine(c, [[ax - 6, -34 + p.arm], [ax - 70, -76 + p.arm]], 5, 7536);
      glove(c, 110, -30 - p.arm * 0.5, 0, 20, 'open', 7537);
    }
  });
}

function fr(name: string, n: number, fps: number, fn: (i: number) => P): SpriteDef {
  return { name, w: 380, h: 340, frames: n, fps, repeat: -1, draw: (c, i) => anvil(c, fn(i)) };
}

export function bigornaSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const who of ['bate', 'forja'] as Who[]) {
    out.push(
      fr(`${who}_idle`, 4, 8, (i) => ({ ...base(who), lean: Math.sin((i / 4) * TAU) * 2, squash: 1 + Math.sin((i / 4) * TAU) * 0.02, blink: i === 3 ? 1 : 0 })),
      fr(`${who}_windup`, 2, 12, (i) => ({ ...base(who), lean: 6, squash: 0.92, arm: -40 - i * 6, mouth: 'grit', hot: 1 })),
      fr(`${who}_attack`, 2, 12, (i) => ({ ...base(who), lean: -8, squash: 1.06, arm: 30 + i * 6, mouth: 'open', hot: 1 })),
      fr(`${who}_angry`, 4, 10, (i) => ({ ...base(who), angry: true, mouth: 'open', lean: i % 2 ? 4 : -4, hot: 1 })),
      fr(`${who}_defeated`, 2, 6, (i) => ({ ...base(who), crying: true, lean: 10 + i * 2, squash: 0.9 })),
    );
  }
  out.push(
    {
      name: 'hz_quake',
      w: 100,
      h: 80,
      draw: (c) => {
        shape(c, [[4, 78], [26, 30], [40, 50], [54, 6], [70, 44], [96, 78]], { fill: '#ffae3a', shade: '#b0521a', shadeOffset: 5 }, 7600);
        sparkle(c, 54, 30, 10, '#fff1b5', 7601);
      },
    },
  );
  void WHITE;
  return out;
}

export const BIGORNA_IMAGES = [
  {
    pack: 'ilha2',
    key: 'bg_bigorna_far',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#2a1a14'], [1, '#5a2a14']])}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 101, 0.35);
      // forja: fornalha ao fundo, ferramentas penduradas
      c.add(`<ellipse cx="960" cy="640" rx="360" ry="260" fill="${rgrad(c, [[0, 'rgba(255,160,60,0.6)'], [1, 'rgba(255,120,40,0)']])}"/>`);
      bgShape(c, [[700, 900], [720, 420], [960, 320], [1200, 420], [1220, 900]], '#3a2a24', 10100, 'rgba(20,10,5,0.6)', 4);
      bgShape(c, ellipsePts(960, 640, 150, 110, 16), '#ff9b3a', 10101, 'rgba(20,10,5,0.5)', 4);
      for (let k = 0; k < 8; k++) {
        const x = 100 + k * 110 + (k > 3 ? 900 : 0);
        inkLine(c, [[x, 120], [x, 300]], 5, 10110 + k, 'rgba(20,10,5,0.6)');
        bgShape(c, roundRectPts(x - 16, 290, 32, 60, 6), '#4a4a52', 10120 + k, 'rgba(20,10,5,0.6)', 3);
      }
    },
  },
  {
    pack: 'ilha2',
    key: 'bg_bigorna_floor',
    w: 1920,
    h: 200,
    scale: 1,
    opaque: false,
    draw: (c: Canvas) => {
      planks(c, 0, 20, 1920, 180, '#5a4a44', '#342a26', 10200);
      c.add(`<rect x="0" y="0" width="1920" height="24" fill="#342a26"/>`);
    },
  },
];

registerGroups([{ pack: 'ilha2', atlas: 'bigorna', palette: true, scale: 0.8, sprites: bigornaSprites }], BIGORNA_IMAGES);
