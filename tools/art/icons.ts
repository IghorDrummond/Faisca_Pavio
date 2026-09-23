/** Ícones originais do PWA (192, 512 e maskable) e favicon — gerados a partir da arte do Faísca. */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { Canvas, ellipsePts, flame, mouth, pieEye, roundRectPts, shape } from './lib/svg';
import { rasterize } from './lib/raster';

function iconSvg(maskable: boolean): string {
  const c = new Canvas(512, 512, 0);
  // fundo: maskable ocupa tudo (zona segura de 80%)
  if (maskable) c.add('<rect width="512" height="512" fill="#1b120c"/>');
  else shape(c, roundRectPts(16, 16, 480, 480, 110), { fill: '#1b120c', stroke: '#e8b64c', width: 14, boil: 0 }, 1);
  c.add('<circle cx="256" cy="300" r="170" fill="#3a2717"/>');
  const s = maskable ? 0.78 : 1;
  c.group(`translate(256 290) scale(${s}) translate(-256 -290)`, () => {
    shape(c, roundRectPts(226, 330, 60, 150, 20), { fill: '#ecc98e', shade: '#c4945a', shadeOffset: 8 }, 2);
    flame(c, 262, 170, 150, 0.15, 1.2, 3);
    shape(c, ellipsePts(256, 280, 110, 118, 24), { fill: '#c9362b', shade: '#8c1f19', shadeOffset: 16, highlight: 'rgba(255,200,180,0.55)' }, 4);
    pieEye(c, 224, 262, 22, 32, 0.4, 0, 0, 5);
    pieEye(c, 290, 258, 22, 32, 0.4, 0, 0, 6);
    mouth(c, 258, 320, 34, 'grin', 7);
  });
  return c.toSvg();
}

export async function buildIcons(): Promise<void> {
  mkdirSync('public/icons', { recursive: true });
  for (const [name, size, mask] of [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['icon-maskable-512.png', 512, true],
    ['favicon-32.png', 32, false],
  ] as [string, number, boolean][]) {
    const raw = await rasterize(iconSvg(mask), size, size);
    const png = await sharp(raw, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(`public/icons/${name}`, png);
  }
}
