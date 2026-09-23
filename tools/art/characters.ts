/**
 * FAÍSCA (palito de fósforo) e PAVIO (vela baixinha) — personagens originais.
 * Quadro lógico 200x220 com os pés em (100, 208). Olhando para a direita (o jogo espelha).
 */
import { type Canvas, type HandPose, type Pt, INK, WHITE, ellipsePts, flame, glove, hose, inkLine, mouth, pieEye, puff, roundRectPts, shape, shoe } from './lib/svg';
import { MUZZLE, MUZZLE_CROUCH } from '../../src/core/weaponsSim';

export type CharId = 'faisca' | 'pavio';
export const FRAME_W = 200;
export const FRAME_H = 220;
export const FEET: Pt = [100, 208];

export interface Pose {
  /** deslocamento dos quadris */
  x: number;
  y: number;
  lean: number;
  sx: number;
  sy: number;
  headDx: number;
  headDy: number;
  headRot: number;
  /** mãos (posição absoluta no quadro) */
  handF: Pt;
  handB: Pt;
  handPoseF: HandPose;
  handPoseB: HandPose;
  bendF: number;
  bendB: number;
  /** pés (posição absoluta no quadro) */
  footF: Pt;
  footB: Pt;
  footTiltF: number;
  footTiltB: number;
  lookX: number;
  lookY: number;
  blink: number;
  mouth: 'smile' | 'grin' | 'open' | 'o' | 'grit' | 'sad' | 'flat';
  flameSize: number;
  flamePhase: number;
  flameIntensity: number;
  /** rotação global (bola do pulo/parry) em graus em torno do centro */
  spin: number;
  /** derretendo (Pavio ao tomar dano) */
  melt: number;
  smoke: number;
  brows: number;
}

interface Anatomy {
  hip: Pt; // quadril padrão (relativo ao quadro)
  shoulderY: number; // relativo ao quadril
  shoulderW: number;
  legLen: number;
}

export const ANATOMY: Record<CharId, Anatomy> = {
  faisca: { hip: [100, 166], shoulderY: -56, shoulderW: 12, legLen: 42 },
  pavio: { hip: [100, 170], shoulderY: -30, shoulderW: 70, legLen: 38 },
};

const WOOD = '#ecc98e';
const WOOD_SH = '#c4945a';
const MATCH_RED = '#c9362b';
const MATCH_RED_SH = '#8c1f19';
const WAX = '#f3dd9c';
const WAX_SH = '#cfad63';
const SHOE_F = '#6e2a19';
const SHOE_P = '#2a4677';

export function basePose(ch: CharId): Pose {
  const a = ANATOMY[ch];
  const hx = a.hip[0];
  const hy = a.hip[1];
  return {
    x: 0,
    y: 0,
    lean: 0,
    sx: 1,
    sy: 1,
    headDx: 0,
    headDy: 0,
    headRot: 0,
    handF: [hx + a.shoulderW * 0.5 + 18, hy + a.shoulderY + 44],
    handB: [hx - a.shoulderW * 0.5 - 14, hy + a.shoulderY + 44],
    handPoseF: 'open',
    handPoseB: 'open',
    bendF: 10,
    bendB: -10,
    footF: [hx + 14, FEET[1] - 4],
    footB: [hx - 16, FEET[1] - 4],
    footTiltF: 0,
    footTiltB: 0,
    lookX: 0.4,
    lookY: 0,
    blink: 0,
    mouth: 'smile',
    flameSize: 1,
    flamePhase: 0,
    flameIntensity: 1,
    spin: 0,
    melt: 0,
    smoke: 0,
    brows: 0,
  };
}

/** Desenha o personagem em uma pose. */
export function drawPlayer(c: Canvas, ch: CharId, p: Pose): void {
  const a = ANATOMY[ch];
  const hipX = a.hip[0] + p.x;
  const hipY = a.hip[1] + p.y;
  const cx = hipX;
  const cy = hipY - 30;
  const outer = `rotate(${p.spin} ${cx} ${cy})`;
  c.group(outer, () => {
    const lean = `rotate(${p.lean} ${hipX} ${hipY}) translate(${hipX} ${hipY}) scale(${p.sx} ${p.sy}) translate(${-hipX} ${-hipY})`;
    const shoulderY = hipY + a.shoulderY * p.sy;
    const shF: Pt = [hipX + a.shoulderW * 0.5, shoulderY];
    const shB: Pt = [hipX - a.shoulderW * 0.5, shoulderY + 2];
    const legThick = 7;
    const armThick = 6.5;
    if (ch === 'pavio') {
      // corpo largo: mãos que cairiam sobre o corpo são afastadas para os lados
      const bodyTop = hipY + a.shoulderY - 30;
      const push = (h: Pt, side: number): Pt => {
        const dx = h[0] - hipX;
        if (h[1] > bodyTop - 4 && Math.abs(dx) < 50 && Math.sign(dx || side) === side) return [hipX + side * (50 + Math.abs(dx) * 0.4), h[1]];
        return h;
      };
      p = { ...p, handF: push(p.handF, 1), handB: push(p.handB, -1) };
    }
    // braço e perna de trás
    hose(c, shB, p.handB, p.bendB, armThick, INK, 101);
    glove(c, p.handB[0], p.handB[1], Math.atan2(p.handB[1] - shB[1], p.handB[0] - shB[0]), 15, p.handPoseB, 102);
    hose(c, [hipX - 8, hipY], p.footB, -6, legThick, INK, 103);
    shoe(c, p.footB[0] + 6, p.footB[1], 22, 1, ch === 'faisca' ? SHOE_F : SHOE_P, 104, p.footTiltB);
    c.group(lean, () => {
      if (ch === 'faisca') drawMatchBody(c, hipX, hipY, a, p);
      else drawCandleBody(c, hipX, hipY, a, p);
    });
    hose(c, [hipX + 8, hipY], p.footF, 6, legThick, INK, 105);
    shoe(c, p.footF[0] + 6, p.footF[1], 23, 1, ch === 'faisca' ? SHOE_F : SHOE_P, 106, p.footTiltF);
    hose(c, shF, p.handF, p.bendF, armThick, INK, 107);
    glove(c, p.handF[0], p.handF[1], Math.atan2(p.handF[1] - shF[1], p.handF[0] - shF[0]), 16, p.handPoseF, 108);
  });
}

function drawFace(c: Canvas, x: number, y: number, p: Pose, scale: number): void {
  const ex = 9 * scale;
  pieEye(c, x - ex * 0.4, y, 7.5 * scale, 11 * scale, p.lookX, p.lookY, p.blink, 201);
  pieEye(c, x + ex * 1.35, y - 1.5 * scale, 7.5 * scale, 11 * scale, p.lookX, p.lookY, p.blink, 202);
  if (p.brows !== 0) {
    const t = p.brows * 4 * scale;
    inkLine(c, [[x - ex * 0.9, y - 15 * scale - t], [x + ex * 0.1, y - 13 * scale + t]], 3.5, 203);
    inkLine(c, [[x + ex * 0.9, y - 16 * scale + t], [x + ex * 1.9, y - 17 * scale - t]], 3.5, 204);
  }
  mouth(c, x + ex * 0.5, y + 17 * scale, 9 * scale, p.mouth, 205);
}

function drawMatchBody(c: Canvas, hipX: number, hipY: number, a: Anatomy, p: Pose): void {
  // palito
  const top = hipY + a.shoulderY - 16;
  shape(c, roundRectPts(hipX - 13, top, 26, hipY - top + 8, 8), { fill: WOOD, shade: WOOD_SH, shadeOffset: 5 }, 301);
  // veios da madeira
  inkLine(c, [[hipX - 3, top + 18], [hipX - 5, top + 40]], 2, 302, 'rgba(90,55,25,0.55)');
  inkLine(c, [[hipX + 5, top + 30], [hipX + 4, top + 52]], 2, 303, 'rgba(90,55,25,0.55)');
  // cabeça (bulbo vermelho)
  const hx = hipX + p.headDx + 4;
  const hy = top - 20 + p.headDy;
  c.group(`rotate(${p.headRot} ${hx} ${hy + 20})`, () => {
    if (p.flameSize > 0.02) flame(c, hx + 2, hy - 30, 38 * p.flameSize, p.flamePhase, p.flameIntensity, 310);
    if (p.smoke > 0) puff(c, hx + 2, hy - 42 - p.smoke * 30, 10 + p.smoke * 10, 'rgba(200,190,180,0.9)', 311, 5);
    shape(c, ellipsePts(hx, hy, 31, 34, 18), { fill: MATCH_RED, shade: MATCH_RED_SH, shadeOffset: 7, highlight: 'rgba(255,200,180,0.55)' }, 312);
    drawFace(c, hx + 6, hy - 2, p, 1);
  });
}

function drawCandleBody(c: Canvas, hipX: number, hipY: number, a: Anatomy, p: Pose): void {
  const top = hipY + a.shoulderY - 30 + p.melt * 8;
  const w = 72 + p.melt * 6;
  const x0 = hipX - w / 2;
  // corpo de cera
  const pts: Pt[] = [
    [x0 + 4, top + 6],
    [hipX - 10, top + 2],
    [hipX + 12, top + 4],
    [x0 + w - 4, top + 6],
    [x0 + w, top + 30],
    [x0 + w + 1, hipY - 6],
    [hipX + 16, hipY + 6],
    [hipX - 16, hipY + 6],
    [x0 - 1, hipY - 6],
    [x0, top + 30],
  ];
  shape(c, pts, { fill: WAX, shade: WAX_SH, shadeOffset: 8, highlight: 'rgba(255,255,240,0.6)' }, 401);
  // gotas de cera escorrendo
  const drip = (dx: number, len: number, salt: number): void => {
    shape(
      c,
      [
        [x0 + dx - 6, top + 4],
        [x0 + dx + 6, top + 4],
        [x0 + dx + 5, top + len],
        [x0 + dx, top + len + 6],
        [x0 + dx - 5, top + len],
      ],
      { fill: '#f8e8b5', width: 3.5 },
      salt,
    );
  };
  drip(14, 18 + p.melt * 12, 402);
  drip(w - 16, 12 + p.melt * 16, 403);
  // topo (borda) e pavio
  shape(c, ellipsePts(hipX, top + 6, w / 2 - 4, 7, 14), { fill: '#fbeec0', width: 3.5 }, 404);
  const wickTop = top - 10 + p.headDy * 0.3;
  inkLine(c, [[hipX + 1, top + 6], [hipX + 2 + p.headDx * 0.2, wickTop]], 4.5, 405);
  if (p.flameSize > 0.02) flame(c, hipX + 3 + p.headDx * 0.2, wickTop - 4, 32 * p.flameSize, p.flamePhase, p.flameIntensity, 406);
  if (p.smoke > 0) puff(c, hipX + 3, wickTop - 16 - p.smoke * 30, 9 + p.smoke * 10, 'rgba(200,190,180,0.9)', 407, 5);
  // rosto no corpo
  c.group(`rotate(${p.headRot} ${hipX} ${top + 40})`, () => drawFace(c, hipX + 8 + p.headDx, top + 36 + p.headDy, p, 1.05));
}

// -------------------------------------------------------------------------------------------------
// Animações (quadros = desenhos; 12 desenhos/s "on twos" em 24 fps)

export interface AnimDef {
  name: string;
  n: number;
  fps: number;
  repeat: number;
  pose: (ch: CharId, i: number, n: number) => Pose;
}

const TAU = Math.PI * 2;

function muzzlePoint(dirIdx: number, crouch = false): Pt {
  const m = crouch ? MUZZLE_CROUCH : MUZZLE[dirIdx]!;
  // olhando para a direita: usa x positivo
  return [FEET[0] + Math.abs(m[0]), FEET[1] + m[1]];
}

function idlePose(ch: CharId, i: number, n: number): Pose {
  const p = basePose(ch);
  const t = i / n;
  const breathe = Math.sin(t * TAU);
  p.y = breathe * 1.5;
  p.sy = 1 + breathe * 0.025;
  p.sx = 1 - breathe * 0.02;
  p.handF[1] += breathe * 2;
  p.handB[1] += breathe * 2;
  p.flamePhase = t;
  p.blink = i === n - 2 ? 1 : 0;
  return p;
}

function runPose(ch: CharId, i: number, n: number, aim: number | null): Pose {
  const p = basePose(ch);
  const t = i / n;
  const s = Math.sin(t * TAU);
  const c2 = Math.cos(t * TAU);
  const hip = ANATOMY[ch].hip;
  p.lean = 9;
  p.y = -Math.abs(Math.sin(t * TAU)) * 6 + 2;
  p.footF = [hip[0] + 6 + s * 30, FEET[1] - 4 - Math.max(0, c2) * 16];
  p.footB = [hip[0] + 2 - s * 30, FEET[1] - 4 - Math.max(0, -c2) * 16];
  p.footTiltF = -s * 18;
  p.footTiltB = s * 18;
  p.handB = [hip[0] - 16 + s * 24, hip[1] + ANATOMY[ch].shoulderY + 38 - Math.abs(s) * 6];
  p.handPoseB = 'fist';
  if (aim === null) {
    p.handF = [hip[0] + 20 - s * 26, hip[1] + ANATOMY[ch].shoulderY + 36 - Math.abs(s) * 6];
    p.handPoseF = 'fist';
  } else {
    p.handF = muzzlePoint(aim);
    p.handF[1] += p.y;
    p.handPoseF = 'point';
    p.bendF = 4;
  }
  p.flamePhase = t;
  p.flameIntensity = 1.2;
  p.lookX = 0.8;
  p.mouth = aim === null ? 'smile' : 'grin';
  return p;
}

function aimPose(ch: CharId, dir: number, i: number): Pose {
  const p = basePose(ch);
  p.handF = muzzlePoint(dir);
  p.handPoseF = 'point';
  p.bendF = dir === 6 ? 2 : 6;
  const recoil = i % 2 === 1 ? 3 : 0;
  const ang = Math.atan2(MUZZLE[dir]![1] + 70, Math.abs(MUZZLE[dir]![0]));
  p.handF = [p.handF[0] - Math.cos(ang) * recoil, p.handF[1] - Math.sin(ang) * recoil];
  p.lookX = dir === 6 ? 0.2 : 0.9;
  p.lookY = dir === 6 || dir === 7 ? -0.9 : dir === 1 ? 0.8 : dir === 2 ? 1 : 0;
  p.headRot = dir === 6 ? -8 : dir === 7 ? -5 : dir === 1 ? 5 : 0;
  p.mouth = 'grin';
  p.flameIntensity = 1.35;
  p.flamePhase = i * 0.5;
  p.lean = dir === 1 ? 4 : dir === 6 ? -3 : 0;
  return p;
}

function crouchPose(ch: CharId, i: number, shoot: boolean): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  p.y = 26;
  p.sy = 0.78;
  p.sx = 1.12;
  p.footF = [hip[0] + 28, FEET[1] - 4];
  p.footB = [hip[0] - 28, FEET[1] - 4];
  p.lean = 6;
  p.headDy = 6;
  if (shoot) {
    p.handF = muzzlePoint(0, true);
    p.handF[0] += i % 2 === 1 ? -3 : 0;
    p.handPoseF = 'point';
    p.mouth = 'grin';
  } else {
    p.handF = [hip[0] + 30, hip[1] + 10];
    p.handB = [hip[0] - 26, hip[1] + 14];
  }
  p.handB = [hip[0] - 24, hip[1] + 16];
  p.flamePhase = i * 0.5;
  return p;
}

function ballPose(ch: CharId, i: number, n: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  p.spin = (i / n) * 360;
  p.y = -22;
  p.sy = 0.85;
  p.footF = [hip[0] + 14, hip[1] - 6];
  p.footB = [hip[0] - 12, hip[1] - 2];
  p.handF = [hip[0] + 24, hip[1] - 30];
  p.handB = [hip[0] - 20, hip[1] - 26];
  p.handPoseF = 'fist';
  p.handPoseB = 'fist';
  p.blink = 0.5;
  p.mouth = 'o';
  p.flameIntensity = 1.4;
  p.flamePhase = i / n;
  return p;
}

function fallPose(ch: CharId, i: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  p.y = -10;
  p.sy = 1.06;
  p.sx = 0.96;
  p.handF = [hip[0] + 34, hip[1] + ANATOMY[ch].shoulderY - 20 - i * 3];
  p.handB = [hip[0] - 30, hip[1] + ANATOMY[ch].shoulderY - 18 - i * 3];
  p.footF = [hip[0] + 16, FEET[1] - 14];
  p.footB = [hip[0] - 12, FEET[1] - 8];
  p.mouth = 'o';
  p.lookY = 0.6;
  p.flameIntensity = 0.8;
  p.flamePhase = i * 0.5;
  return p;
}

function landPose(ch: CharId, i: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  const k = i === 0 ? 1 : 0.4;
  p.y = 16 * k;
  p.sy = 1 - 0.2 * k;
  p.sx = 1 + 0.16 * k;
  p.footF = [hip[0] + 22, FEET[1] - 4];
  p.footB = [hip[0] - 22, FEET[1] - 4];
  p.handF[1] += 10 * k;
  p.handB[1] += 10 * k;
  return p;
}

function dashPose(ch: CharId, i: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  p.lean = 22;
  p.sx = 1.18;
  p.sy = 0.86;
  p.y = -6;
  p.footF = [hip[0] - 18, hip[1] + 20];
  p.footB = [hip[0] - 46, hip[1] + 8];
  p.footTiltF = -30;
  p.footTiltB = -40;
  p.handF = [hip[0] - 20, hip[1] - 46];
  p.handB = [hip[0] - 46, hip[1] - 40];
  p.handPoseF = 'fist';
  p.handPoseB = 'fist';
  p.headDx = 6;
  p.mouth = 'grit';
  p.brows = -1;
  p.flameIntensity = 1.6;
  p.flamePhase = i * 0.33;
  return p;
}

function parryPose(ch: CharId, i: number, n: number): Pose {
  const p = ballPose(ch, i, n);
  const hip = ANATOMY[ch].hip;
  p.spin = (i / n) * 360 * 0.75 - 30;
  p.handF = [hip[0] + 48, hip[1] - 52];
  p.handPoseF = 'wave';
  p.mouth = 'grin';
  p.blink = 0;
  p.lookX = 1;
  return p;
}

function hurtPose(ch: CharId, i: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  p.lean = -12;
  p.sy = i === 0 ? 0.8 : 1.08;
  p.sx = i === 0 ? 1.2 : 0.95;
  p.handF = [hip[0] + 40, hip[1] - 70];
  p.handB = [hip[0] - 40, hip[1] - 66];
  p.handPoseF = 'wave';
  p.handPoseB = 'wave';
  p.blink = 1;
  p.mouth = 'o';
  p.melt = ch === 'pavio' ? 1 : 0;
  p.flameIntensity = 1.8;
  p.flameSize = 1.2;
  p.flamePhase = i * 0.4;
  return p;
}

function deathPose(ch: CharId, i: number, n: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  const t = i / (n - 1);
  p.flameSize = Math.max(0, 1 - t * 1.4);
  p.smoke = t > 0.5 ? (t - 0.5) * 2 : 0;
  p.y = t * 20;
  p.sy = 1 - t * 0.18;
  p.lean = -t * 8;
  p.handF = [hip[0] + 26, hip[1] + 6];
  p.handB = [hip[0] - 24, hip[1] + 8];
  p.blink = t > 0.3 ? 1 : 0.5;
  p.mouth = 'sad';
  p.melt = ch === 'pavio' ? t * 1.5 : 0;
  return p;
}

function ghostPose(ch: CharId, i: number, n: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  const t = i / n;
  p.flameSize = 0;
  p.y = Math.sin(t * TAU) * 4 - 6;
  p.handF = [hip[0] + 34, hip[1] - 80 + Math.sin(t * TAU) * 6];
  p.handB = [hip[0] - 34, hip[1] - 80 - Math.sin(t * TAU) * 6];
  p.handPoseF = 'wave';
  p.handPoseB = 'wave';
  p.footF = [hip[0] + 10, FEET[1] - 12];
  p.footB = [hip[0] - 10, FEET[1] - 16];
  p.blink = 1;
  p.mouth = 'smile';
  return p;
}

function victoryPose(ch: CharId, i: number, n: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  const t = i / n;
  const up = Math.abs(Math.sin(t * Math.PI));
  p.y = -up * 22;
  p.handF = [hip[0] + 30, hip[1] - 110 - up * 10];
  p.handB = [hip[0] - 28, hip[1] - 106 - up * 10];
  p.handPoseF = 'fist';
  p.handPoseB = 'open';
  p.mouth = 'grin';
  p.footF = [hip[0] + 14, FEET[1] - 4 - up * 18];
  p.footB = [hip[0] - 14, FEET[1] - 4 - up * 14];
  p.flameIntensity = 1.5;
  p.flamePhase = t;
  return p;
}

function introPose(ch: CharId, i: number, n: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  const t = i / (n - 1);
  // chama acende (risca/acende o pavio) e acena
  p.flameSize = t < 0.35 ? 0.05 + t * 1.5 : 1 + Math.sin(t * 10) * 0.08;
  p.flameIntensity = t < 0.5 ? 1.8 : 1.1;
  p.handF = t < 0.5 ? [hip[0] + 20, hip[1] - 96] : [hip[0] + 38, hip[1] - 88 + Math.sin(t * 20) * 8];
  p.handPoseF = t < 0.5 ? 'fist' : 'wave';
  p.mouth = t < 0.35 ? 'o' : 'grin';
  p.blink = t < 0.2 ? 1 : 0;
  p.flamePhase = t * 2;
  p.lookX = t < 0.5 ? 0 : 0.8;
  p.lookY = t < 0.5 ? -0.9 : 0;
  return p;
}

function exPose(ch: CharId, i: number): Pose {
  const p = aimPose(ch, 0, 0);
  const hip = ANATOMY[ch].hip;
  p.lean = i === 0 ? 6 : -10;
  p.handB = [p.handF[0] - 12, p.handF[1] + 6];
  p.handPoseB = 'open';
  p.footF = [hip[0] + 26, FEET[1] - 4];
  p.footB = [hip[0] - 26, FEET[1] - 4];
  p.mouth = 'open';
  p.brows = -1;
  p.flameSize = 1.3;
  p.flameIntensity = 2;
  return p;
}

function superPose(ch: CharId, i: number): Pose {
  const p = basePose(ch);
  const hip = ANATOMY[ch].hip;
  if (i < 2) {
    p.handF = [hip[0] + 24, hip[1] - 112];
    p.handB = [hip[0] - 24, hip[1] - 112];
    p.handPoseF = 'fist';
    p.handPoseB = 'fist';
    p.sy = 1.08;
    p.mouth = 'grit';
  } else {
    p.handF = [hip[0] + 70, hip[1] - 60];
    p.handB = [hip[0] + 58, hip[1] - 50];
    p.handPoseF = 'open';
    p.handPoseB = 'open';
    p.lean = -6;
    p.mouth = 'open';
  }
  p.brows = -1;
  p.flameSize = 1.5;
  p.flameIntensity = 2.2;
  p.flamePhase = i * 0.3;
  return p;
}

const AIM_DIRS: [string, number][] = [
  ['fwd', 0],
  ['up', 6],
  ['diagup', 7],
  ['diagdown', 1],
  ['down', 2],
];

export const PLAYER_ANIMS: AnimDef[] = [
  { name: 'idle', n: 6, fps: 12, repeat: -1, pose: idlePose },
  { name: 'run', n: 8, fps: 12, repeat: -1, pose: (ch, i, n) => runPose(ch, i, n, null) },
  { name: 'run_shoot', n: 8, fps: 12, repeat: -1, pose: (ch, i, n) => runPose(ch, i, n, 0) },
  { name: 'run_shoot_up', n: 8, fps: 12, repeat: -1, pose: (ch, i, n) => runPose(ch, i, n, 7) },
  { name: 'jump', n: 4, fps: 16, repeat: -1, pose: ballPose },
  { name: 'fall', n: 2, fps: 12, repeat: -1, pose: (ch, i) => fallPose(ch, i) },
  { name: 'land', n: 2, fps: 16, repeat: 0, pose: (ch, i) => landPose(ch, i) },
  { name: 'crouch', n: 2, fps: 12, repeat: -1, pose: (ch, i) => crouchPose(ch, i, false) },
  { name: 'crouch_shoot', n: 2, fps: 16, repeat: -1, pose: (ch, i) => crouchPose(ch, i, true) },
  ...AIM_DIRS.map(([nm, d]) => ({ name: `aim_${nm}`, n: 2, fps: 16, repeat: -1, pose: (ch: CharId, i: number) => aimPose(ch, d, i) })),
  { name: 'dash', n: 3, fps: 16, repeat: -1, pose: (ch, i) => dashPose(ch, i) },
  { name: 'parry', n: 4, fps: 16, repeat: 0, pose: parryPose },
  { name: 'hurt', n: 3, fps: 16, repeat: 0, pose: (ch, i) => hurtPose(ch, i) },
  { name: 'death', n: 6, fps: 10, repeat: 0, pose: deathPose },
  { name: 'ghost', n: 4, fps: 8, repeat: -1, pose: ghostPose },
  { name: 'victory', n: 6, fps: 12, repeat: -1, pose: victoryPose },
  { name: 'intro', n: 8, fps: 12, repeat: 0, pose: introPose },
  { name: 'ex', n: 2, fps: 12, repeat: 0, pose: (ch, i) => exPose(ch, i) },
  { name: 'super', n: 4, fps: 10, repeat: 0, pose: (ch, i) => superPose(ch, i) },
];

// -------------------------------------------------------------------------------------------------
// Avião de papel de jornal (modo aéreo). Quadro 240x170, centro em (120, 95).

export const PLANE_W = 240;
export const PLANE_H = 170;

export function drawPlane(c: Canvas, ch: CharId, tilt: number, shrink: boolean, i: number, hurt: boolean): void {
  const s = shrink ? 0.6 : 1;
  c.group(`translate(120 95) rotate(${tilt}) scale(${s}) translate(-120 -95)`, () => {
    // personagem sentado (só tronco) atrás da asa
    const p = basePose(ch);
    p.flamePhase = i / 3;
    p.flameIntensity = 1.4;
    p.lookX = 1;
    p.mouth = hurt ? 'o' : 'grin';
    p.blink = hurt ? 1 : 0;
    c.group('translate(52 4) scale(0.55)', () => {
      const a = ANATOMY[ch];
      if (ch === 'faisca') drawMatchBody(c, a.hip[0], a.hip[1] - 10, a, p);
      else drawCandleBody(c, a.hip[0], a.hip[1] - 10, a, p);
    });
    // avião: papel de jornal dobrado
    const paper = '#e8e0cc';
    const paperSh = '#b9ae94';
    shape(c, [[20, 96], [214, 88], [120, 122], [60, 118]], { fill: paper, shade: paperSh, shadeOffset: 6 }, 501);
    shape(c, [[36, 92], [214, 88], [96, 70]], { fill: '#f3ecd9', shade: paperSh, shadeOffset: 4 }, 502);
    // linhas de texto do jornal (ilegíveis)
    for (let k = 0; k < 4; k++) inkLine(c, [[62 + k * 12, 102 + k * 2.5], [150 - k * 8, 99 + k * 1.2]], 2, 503 + k, 'rgba(40,30,20,0.5)', 0.6);
    // hélice / cata-vento de papel na frente
    const spin = (i % 3) * 40;
    c.group(`rotate(${spin} 216 90)`, () => {
      shape(c, ellipsePts(216, 76, 6, 14, 8), { fill: '#d9542b', width: 3 }, 510);
      shape(c, ellipsePts(216, 104, 6, 14, 8), { fill: '#e8b64c', width: 3 }, 511);
    });
    shape(c, ellipsePts(216, 90, 5, 5, 8), { fill: INK, width: 2 }, 512);
    // mão segurando a borda
    glove(c, 132, 86, 0.2, 13, 'fist', 513);
    void WHITE;
  });
}

export const PLANE_ANIMS: { name: string; n: number; fps: number; tilt: number; shrink: boolean; hurt: boolean }[] = [
  { name: 'plane_idle', n: 3, fps: 12, tilt: 0, shrink: false, hurt: false },
  { name: 'plane_up', n: 3, fps: 12, tilt: -9, shrink: false, hurt: false },
  { name: 'plane_down', n: 3, fps: 12, tilt: 9, shrink: false, hurt: false },
  { name: 'plane_shrink', n: 3, fps: 12, tilt: 0, shrink: true, hurt: false },
  { name: 'plane_hurt', n: 2, fps: 12, tilt: -14, shrink: false, hurt: true },
];

// -------------------------------------------------------------------------------------------------
// Mapa-múndi: versão pequena (quadro 110x120, pés em (55,112)), 4 direções x 4 desenhos.

export const MAP_W = 110;
export const MAP_H = 120;

export function mapWalkPose(ch: CharId, dir: 'side' | 'down' | 'up', i: number): Pose {
  const p = runPose(ch, i * 2, 8, null);
  p.lean = dir === 'side' ? 6 : 0;
  if (dir !== 'side') {
    const hip = ANATOMY[ch].hip;
    const s = Math.sin((i / 4) * TAU);
    p.footF = [hip[0] + 14, FEET[1] - 4 - Math.max(0, s) * 12];
    p.footB = [hip[0] - 14, FEET[1] - 4 - Math.max(0, -s) * 12];
    p.handF = [hip[0] + 34, hip[1] - 30 + s * 6];
    p.handB = [hip[0] - 34, hip[1] - 30 - s * 6];
    p.lookX = 0;
    p.lookY = dir === 'down' ? 0.6 : -1;
    if (dir === 'up') p.blink = 1;
  }
  return p;
}
