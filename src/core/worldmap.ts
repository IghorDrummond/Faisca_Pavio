import type { SaveData } from './save';
import { MAP_NODES, type MapNode, nodeDone, nodeUnlocked } from './progression';

/** Mundo do mapa (px). Visão de cima estilizada: duas ilhas + ilhota do Teatro, ligadas por ponte e barco. */
export const MAP_W = 3700;
export const MAP_H = 1400;

interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
  island: number;
}

export const ISLANDS: Ellipse[] = [
  { x: 900, y: 730, rx: 860, ry: 470, island: 0 },
  { x: 2560, y: 730, rx: 700, ry: 460, island: 1 },
  { x: 3360, y: 760, rx: 230, ry: 190, island: 2 },
];

/** Ponte entre as ilhas (retângulo), liberada ao vencer os dois chefes da Ilha do Picadeiro. */
export const BRIDGE = { x: 1700, y: 690, w: 240, h: 90 };
/** Rota de barco até o Teatro (liberada com 5 Brasas). */
export const BOAT = { x: 3150, y: 720, w: 110, h: 80 };

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  lines: string[];
  givesCoin?: boolean;
  sprite: string;
}

export const NPCS: NpcDef[] = [
  { id: 'botao', name: 'Seu Botão', x: 520, y: 640, sprite: 'npc_botao', lines: ['Perdi meus quatro furinhos de tanto rir!', 'Dica: pule de novo no ar em cima das coisas azul-elétricas. Chama-se parry, meu jovem.'] },
  { id: 'tonico', name: 'Tonico Carretel', x: 1260, y: 960, sprite: 'npc_tonico', givesCoin: true, lines: ['Eu enrolo, desenrolo e enrolo de novo.', 'Toma uma moedinha que achei na costura!'] },
  { id: 'gilda', name: 'Gilda Gaita', x: 1450, y: 480, sprite: 'npc_gilda', lines: ['Fum-fum-fum! Ops, desafinei.', 'Quem vence o Relógio e a Costureira ganha passagem pela ponte!'] },
  { id: 'apito', name: 'Maestrinho Apito', x: 2250, y: 470, sprite: 'npc_apito', lines: ['Priiii! Silêncio na plateia!', 'Dizem que o Gramofone só ataca no compasso. Conte as batidas!'] },
  { id: 'lima', name: 'Dona Lima-de-Unha', x: 2830, y: 1020, sprite: 'npc_lima', lines: ['As Irmãs Bigorna brigam por tudo.', 'Ataque a mais atrevida primeiro... ou não, sei lá, sou só uma lixa.'] },
  { id: 'lampiao', name: 'Vô Lampião', x: 3100, y: 520, sprite: 'npc_lampiao', lines: ['No meu tempo a Chama-Mãe iluminava até o fim da rua.', 'Traga as cinco Brasas e a luz volta, garoto de fósforo.'] },
];

/** Moedas escondidas no mapa (3). */
export const MAP_COINS = [
  { id: 'map:c1', x: 180, y: 520 },
  { id: 'map:c2', x: 1540, y: 1080 },
  { id: 'map:c3', x: 3030, y: 1070 },
];

export function walkable(s: SaveData, x: number, y: number): boolean {
  for (const e of ISLANDS) {
    const dx = (x - e.x) / e.rx;
    const dy = (y - e.y) / e.ry;
    if (dx * dx + dy * dy <= 1) {
      if (e.island === 1 && !nodeDone(s, 'bridge')) return false;
      if (e.island === 2 && s.embers.length < 5) return false;
      return true;
    }
  }
  if (x >= BRIDGE.x && x <= BRIDGE.x + BRIDGE.w && y >= BRIDGE.y && y <= BRIDGE.y + BRIDGE.h) return nodeDone(s, 'bridge');
  if (x >= BOAT.x && x <= BOAT.x + BOAT.w && y >= BOAT.y && y <= BOAT.y + BOAT.h) return s.embers.length >= 5;
  return false;
}

export function islandAt(x: number): number {
  if (x < 1760) return 0;
  if (x < 3180) return 1;
  return 2;
}

/** Nó mais próximo dentro do raio de interação. */
export function nearestNode(x: number, y: number, radius = 110): MapNode | null {
  let best: MapNode | null = null;
  let bd = radius * radius;
  for (const n of MAP_NODES) {
    if (n.kind === 'bridge') continue;
    const d = (n.x - x) ** 2 + (n.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

export function nearestNpc(x: number, y: number, radius = 110): NpcDef | null {
  let best: NpcDef | null = null;
  let bd = radius * radius;
  for (const n of NPCS) {
    const d = (n.x - x) ** 2 + (n.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

export { MAP_NODES, nodeUnlocked, nodeDone };

/** Movimento em 8 direções com deslizamento nas bordas (pura; testável). */
export function moveOnMap(s: SaveData, x: number, y: number, dx: number, dy: number, speed: number, dt: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy) || 1;
  const vx = (dx / len) * speed * dt;
  const vy = (dy / len) * speed * dt;
  let nx = x + vx;
  let ny = y + vy;
  if (!walkable(s, nx, ny)) {
    if (walkable(s, nx, y)) ny = y;
    else if (walkable(s, x, ny)) nx = x;
    else {
      nx = x;
      ny = y;
    }
  }
  return { x: nx, y: ny };
}
