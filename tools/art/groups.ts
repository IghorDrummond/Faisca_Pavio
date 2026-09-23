/**
 * Registro de grupos de arte. Cada grupo vira um atlas (1+ páginas) dentro de um pacote.
 * Pacotes: core (sempre), ilha1, ilha2, final, map.
 */
import { Canvas } from './lib/svg';
import type { SpriteDef } from './fx';
import { PLAYER_FX, enemyProjectileSprites } from './fx';
import { FRAME_H, FRAME_W, MAP_H, MAP_W, PLANE_ANIMS, PLANE_H, PLANE_W, PLAYER_ANIMS, drawPlane, drawPlayer, mapWalkPose, type CharId } from './characters';

export interface AtlasGroup {
  pack: string;
  atlas: string;
  /** usar paleta indexada no PNG (arte chapada) */
  palette: boolean;
  sprites: () => SpriteDef[];
  /** origem sugerida por sprite (0..1), exportada no manifesto */
  origins?: Record<string, [number, number]>;
  /** escala de rasterização (0.8 = 80%; o jogo amplia com 1/scale) — economiza memória de GPU */
  scale?: number;
}

export interface ImageAsset {
  pack: string;
  key: string;
  w: number;
  h: number;
  /** escala de renderização (0.5 = metade da resolução, esticada no jogo) */
  scale: number;
  opaque: boolean;
  draw: (c: Canvas) => void;
}

function playerSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const ch of ['faisca', 'pavio'] as CharId[]) {
    for (const a of PLAYER_ANIMS) {
      out.push({
        name: `${ch}_${a.name}`,
        w: FRAME_W,
        h: FRAME_H,
        frames: a.n,
        fps: a.fps,
        repeat: a.repeat,
        draw: (c, i) => drawPlayer(c, ch, a.pose(ch, i, a.n)),
      });
    }
    for (const a of PLANE_ANIMS) {
      out.push({
        name: `${ch}_${a.name}`,
        w: PLANE_W,
        h: PLANE_H,
        frames: a.n,
        fps: a.fps,
        repeat: -1,
        draw: (c, i) => drawPlane(c, ch, a.tilt, a.shrink, i, a.hurt),
      });
    }
    for (const dir of ['side', 'down', 'up'] as const) {
      out.push({
        name: `${ch}_map_${dir}`,
        w: MAP_W,
        h: MAP_H,
        frames: 4,
        fps: 10,
        repeat: -1,
        draw: (c, i) => c.group(`scale(0.55)`, () => drawPlayer(c, ch, mapWalkPose(ch, dir, i))),
      });
    }
  }
  return out;
}

export const ATLAS_GROUPS: AtlasGroup[] = [
  { pack: 'core', atlas: 'players', palette: true, sprites: playerSprites },
  { pack: 'core', atlas: 'fx', palette: true, sprites: () => [...PLAYER_FX, ...enemyProjectileSprites()] },
];

export const IMAGE_ASSETS: ImageAsset[] = [];

export function registerGroups(groups: AtlasGroup[], images: ImageAsset[] = []): void {
  ATLAS_GROUPS.push(...groups);
  IMAGE_ASSETS.push(...images);
}
