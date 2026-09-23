/** O MAESTRO DE CORDA — caixinha de música gigante e maestro de metal regendo com a batuta. */
import type { SpriteDef } from '../fx';
import { PARRY, PARRY_SH } from '../fx';
import { type Canvas, INK, WHITE, ellipsePts, flame, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, sparkle } from '../lib/svg';
import { bgShape, lightCone, planks, rgrad, vgrad, wash } from '../lib/scenery';
import { registerGroups } from '../groups';

const GOLD = '#e8b64c';
const GOLD_SH = '#9c7418';
const TIN = '#b8b8c4';
const TIN_SH = '#6e6e7e';
const TAU = Math.PI * 2;

interface P {
  scale: number;
  baton: number; // ângulo do braço da batuta
  open: number; // tampa da caixa (coda)
  mouth: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat';
  blink: number;
  lean: number;
  keyRot: number;
  ko: boolean;
}

const base = (): P => ({ scale: 1, baton: -0.6, open: 0, mouth: 'flat', blink: 0, lean: 0, keyRot: 0, ko: false });

// Quadro 640x800, âncora (320,440)
function draw(c: Canvas, p: P): void {
  const s = p.scale;
  c.group(`translate(320 ${440 - (s - 1) * 80}) scale(${s})`, () => {
    // caixinha de música
    shape(c, roundRectPts(-210, 110, 420, 180, 14), { fill: '#7a2a3a', shade: '#4a1a24', shadeOffset: 10, highlight: 'rgba(255,200,210,0.25)' }, 8000);
    for (let k = 0; k < 6; k++) inkLine(c, [[-190 + k * 76, 130], [-170 + k * 76, 270]], 3, 8001 + k, GOLD);
    shape(c, roundRectPts(-220, 96, 440, 26, 8), { fill: GOLD, shade: GOLD_SH, shadeOffset: 4 }, 8010);
    if (p.open > 0) {
      // tampa aberta + Chama-Mãe revelada
      shape(c, [[-220, 100], [220, 100], [200, 100 - 180 * p.open], [-200, 100 - 200 * p.open]], { fill: '#8a3a4a', shade: '#4a1a24', shadeOffset: 6 }, 8011);
      flame(c, 0, 110, 160 * p.open, 0.3, 1.6, 8012, { outer: '#ff9b2e', mid: '#ffe27a', core: '#fffbe6' });
    }
    // maestro de metal
    const bodyY = -60;
    hose(c, [-30, 90], [-40, 96], 0, 14, INK, 8020);
    hose(c, [30, 90], [40, 96], 0, 14, INK, 8021);
    shape(c, roundRectPts(-60, bodyY - 80, 120, 170, 20), { fill: TIN, shade: TIN_SH, shadeOffset: 8, highlight: 'rgba(255,255,255,0.45)' }, 8022);
    // fraque
    shape(c, [[-60, bodyY - 70], [0, bodyY + 20], [60, bodyY - 70], [70, bodyY + 90], [-70, bodyY + 90]], { fill: '#1e1a2a', width: 4 }, 8023);
    shape(c, [[-18, bodyY - 70], [18, bodyY - 70], [0, bodyY - 50]], { fill: WHITE, width: 3 }, 8024);
    // chave de corda nas costas (lado direito = costas)
    c.group(`rotate(${p.keyRot} 90 ${bodyY - 20})`, () => {
      inkLine(c, [[60, bodyY - 20], [100, bodyY - 20]], 12, 8030);
      shape(c, [[100, bodyY - 60], [140, bodyY - 40], [140, bodyY], [100, bodyY + 20], [110, bodyY - 20]], { fill: GOLD, shade: GOLD_SH, shadeOffset: 4 }, 8031);
    });
    // cabeça
    const hy = bodyY - 150;
    shape(c, ellipsePts(0, hy, 62, 70, 18), { fill: TIN, shade: TIN_SH, shadeOffset: 8, highlight: 'rgba(255,255,255,0.5)' }, 8040);
    for (let k = 0; k < 5; k++) puff(c, -50 + k * 25, hy - 64 - Math.abs(k - 2) * 6, 16, WHITE, 8041 + k, 5); // cabeleira branca
    const bl = p.ko ? 0.9 : p.blink;
    pieEye(c, -26, hy - 6, 14, 20, -0.8, 0, bl, 8050);
    pieEye(c, 16, hy - 8, 13, 19, -0.8, 0, bl, 8051);
    inkLine(c, [[-46, hy - 36], [-10, hy - 30]], 6, 8052);
    inkLine(c, [[36, hy - 38], [4, hy - 32]], 6, 8053);
    mouth(c, -6, hy + 32, 18, p.mouth, 8054);
    // braço da batuta (frente)
    const bx = -60 + Math.cos(p.baton + Math.PI) * 110;
    const by = bodyY - 50 + Math.sin(p.baton + Math.PI) * 110;
    hose(c, [-50, bodyY - 50], [bx, by], 10, 10, INK, 8060);
    glove(c, bx, by, p.baton + Math.PI, 20, 'fist', 8061);
    inkLine(c, [[bx, by], [bx + Math.cos(p.baton + Math.PI) * 90, by + Math.sin(p.baton + Math.PI) * 90]], 5, 8062, WHITE);
    hose(c, [50, bodyY - 50], [110, bodyY + 10], -8, 10, INK, 8063);
    glove(c, 110, bodyY + 10, 0.5, 20, 'open', 8064);
    if (p.ko) for (let k = 0; k < 4; k++) puff(c, -160 + k * 110, 60, 36, 'rgba(235,228,215,0.9)', 8070 + k, 6);
  });
}

function fr(name: string, n: number, fps: number, fn: (i: number) => P): SpriteDef {
  return { name, w: 640, h: 800, frames: n, fps, repeat: -1, draw: (c, i) => draw(c, fn(i)) };
}

function ballerina(c: Canvas, i: number, col: string, sh: string, stroke = INK): void {
  c.group(`translate(60 60) rotate(${i * 30})`, () => {
    shape(c, ellipsePts(0, 10, 50, 16, 16), { fill: col, shade: sh, shadeOffset: 4, stroke, width: 4 }, 8100);
    shape(c, roundRectPts(-12, -40, 24, 50, 8), { fill: TIN, width: 4, stroke }, 8101);
    shape(c, ellipsePts(0, -52, 14, 14, 10), { fill: TIN, width: 4, stroke }, 8102);
    inkLine(c, [[-12, -30], [-40, -56]], 5, 8103, stroke);
    inkLine(c, [[12, -30], [40, -56]], 5, 8104, stroke);
  });
}

export function maestroSprites(): SpriteDef[] {
  return [
    fr('maestro_p1_idle', 4, 8, (i) => ({ ...base(), baton: -0.6 + Math.sin((i / 4) * TAU) * 0.4, keyRot: i * 30, blink: i === 3 ? 1 : 0 })),
    fr('maestro_p1_baton', 2, 12, (i) => ({ ...base(), baton: i ? 0.4 : -1.2, mouth: 'grit', lean: 4 })),
    fr('maestro_p1_attack', 2, 12, (i) => ({ ...base(), baton: i ? 0.8 : 0.2, mouth: 'open' })),
    fr('maestro_p3_idle', 4, 8, (i) => ({ ...base(), scale: 1.25, baton: -0.6 + Math.sin((i / 4) * TAU) * 0.5, keyRot: i * 45, mouth: 'grit' })),
    fr('maestro_p3_baton', 2, 12, (i) => ({ ...base(), scale: 1.25, baton: i ? 0.4 : -1.2, mouth: 'grit' })),
    fr('maestro_p3_attack', 2, 12, (i) => ({ ...base(), scale: 1.25, baton: i ? 0.8 : 0.2, mouth: 'open' })),
    fr('maestro_p4_idle', 4, 10, (i) => ({ ...base(), scale: 1.25, open: 1, baton: Math.sin((i / 4) * TAU), keyRot: i * 60, mouth: 'open' })),
    fr('maestro_transition', 4, 12, (i) => ({ ...base(), scale: 1 + i * 0.07, baton: i % 2 ? 1 : -1, mouth: 'o', keyRot: i * 90 })),
    fr('maestro_knockout', 4, 8, (i) => ({ ...base(), scale: 1.25, open: 1, ko: true, lean: i * 4, baton: 1.6, mouth: 'sad' })),
    { name: 'hz_ballerina_low', w: 120, h: 120, frames: 4, fps: 16, repeat: -1, draw: (c, i) => ballerina(c, i, '#e8a0b8', '#9e5a70') },
    { name: 'hz_ballerina_high', w: 120, h: 120, frames: 4, fps: 16, repeat: -1, draw: (c, i) => ballerina(c, i, '#c9c3b6', '#6c665c') },
    { name: 'hz_ballerina_parry', w: 120, h: 120, frames: 4, fps: 16, repeat: -1, draw: (c, i) => ballerina(c, i, PARRY, PARRY_SH, WHITE) },
  ];
}

export const MAESTRO_IMAGES = [
  {
    pack: 'final',
    key: 'bg_maestro_far',
    w: 1920,
    h: 1080,
    scale: 0.5,
    opaque: true,
    draw: (c: Canvas) => {
      c.add(`<rect width="1920" height="1080" fill="${vgrad(c, [[0, '#2a1024'], [1, '#4a1a24']])}"/>`);
      wash(c, 0, 0, 1920, 1080, 'rgba(0,0,0,0)', 121, 0.35);
      // teatro grandioso: camarotes e lustre
      for (let row = 0; row < 3; row++) {
        for (let k = 0; k < 9; k++) {
          const x = 60 + k * 210;
          const y = 160 + row * 170;
          bgShape(c, [[x, y + 110], [x + 20, y], [x + 170, y], [x + 190, y + 110]], '#6a2a34', 12100 + row * 10 + k, 'rgba(30,10,15,0.5)', 3);
          c.add(`<rect x="${x + 30}" y="${y + 20}" width="130" height="70" fill="rgba(255,210,140,0.12)"/>`);
        }
      }
      c.add(`<ellipse cx="960" cy="80" rx="220" ry="60" fill="${rgrad(c, [[0, 'rgba(255,230,160,0.6)'], [1, 'rgba(255,230,160,0)']])}"/>`);
      lightCone(c, 960, 0, 1200, 1000, 'rgba(255,230,170,0.5)', 0.25);
      for (const s of [-1, 1]) bgShape(c, [[960 + s * 960, 0], [960 + s * 700, 0], [960 + s * 760, 1080], [960 + s * 960, 1080]], '#8a1f24', 12200 + s, 'rgba(30,10,15,0.5)', 4, '#5a1418');
    },
  },
  {
    pack: 'final',
    key: 'bg_maestro_floor',
    w: 1920,
    h: 200,
    scale: 1,
    opaque: false,
    draw: (c: Canvas) => {
      planks(c, 0, 20, 1920, 180, '#6e4a34', '#3e2a1e', 12300);
      c.add(`<rect x="0" y="0" width="1920" height="24" fill="#3e2a1e"/>`);
      void sparkle;
    },
  },
];

registerGroups([{ pack: 'final', atlas: 'maestro', palette: true, scale: 0.8, sprites: maestroSprites }], MAESTRO_IMAGES);
