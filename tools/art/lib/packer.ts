import sharp from 'sharp';
import type { RasterFrame } from './raster';

const PAD = 2;

export interface PackedPage {
  w: number;
  h: number;
  frames: { f: RasterFrame; x: number; y: number }[];
}

/**
 * Empacotador "skyline" simples: ordena por altura e posiciona na menor altura disponível.
 * Páginas de no máximo maxSize x maxSize (2048 por padrão, compatível com GPUs modestas).
 */
export function pack(frames: RasterFrame[], maxSize = 2048): PackedPage[] {
  const sorted = [...frames].sort((a, b) => b.th - a.th || b.tw - a.tw);
  const pages: PackedPage[] = [];
  let remaining = sorted;
  while (remaining.length) {
    const page: PackedPage = { w: maxSize, h: 0, frames: [] };
    // skyline: lista de segmentos [x, y, w]
    let sky: [number, number, number][] = [[0, 0, maxSize]];
    const left: RasterFrame[] = [];
    for (const fr of remaining) {
      const fw = fr.tw + PAD * 2;
      const fh = fr.th + PAD * 2;
      if (fw > maxSize || fh > maxSize) throw new Error(`quadro ${fr.name} maior que a página (${fr.tw}x${fr.th})`);
      let best: { x: number; y: number; i: number } | null = null;
      for (let i = 0; i < sky.length; i++) {
        const x = sky[i]![0];
        if (x + fw > maxSize) break;
        // altura máxima dos segmentos cobertos
        let y = 0;
        let covered = 0;
        let j = i;
        while (covered < fw && j < sky.length) {
          y = Math.max(y, sky[j]![1]);
          covered += sky[j]![2];
          j++;
        }
        if (covered < fw) continue;
        if (y + fh > maxSize) continue;
        if (!best || y < best.y) best = { x, y, i };
      }
      if (!best) {
        left.push(fr);
        continue;
      }
      page.frames.push({ f: fr, x: best.x + PAD, y: best.y + PAD });
      page.h = Math.max(page.h, best.y + fh);
      // atualiza skyline
      const nx = best.x;
      const ny = best.y + fh;
      const next: [number, number, number][] = [];
      for (const seg of sky) {
        const [sx, sy, sw] = seg;
        const ex = sx + sw;
        if (ex <= nx || sx >= nx + fw) {
          next.push(seg);
          continue;
        }
        if (sx < nx) next.push([sx, sy, nx - sx]);
        if (ex > nx + fw) next.push([nx + fw, sy, ex - (nx + fw)]);
      }
      next.push([nx, ny, fw]);
      next.sort((a, b) => a[0] - b[0]);
      // funde segmentos vizinhos de mesma altura
      const merged: [number, number, number][] = [];
      for (const s of next) {
        const last = merged[merged.length - 1];
        if (last && last[1] === s[1] && last[0] + last[2] === s[0]) last[2] += s[2];
        else merged.push([...s]);
      }
      sky = merged;
    }
    page.h = Math.ceil(page.h / 4) * 4;
    pages.push(page);
    if (left.length === remaining.length) throw new Error('não foi possível empacotar');
    remaining = left;
  }
  return pages;
}

/** Compõe os pixels da página. */
export function composePage(page: PackedPage): Buffer {
  const buf = Buffer.alloc(page.w * page.h * 4);
  for (const { f, x, y } of page.frames) {
    for (let row = 0; row < f.th; row++) {
      f.data.copy(buf, ((y + row) * page.w + x) * 4, row * f.tw * 4, (row + 1) * f.tw * 4);
    }
  }
  return buf;
}

export async function encodePage(raw: Buffer, w: number, h: number, format: 'png' | 'webp', palette: boolean): Promise<Buffer> {
  const img = sharp(raw, { raw: { width: w, height: h, channels: 4 } });
  if (format === 'png') return img.png({ compressionLevel: 9, palette, quality: 95, effort: 8 }).toBuffer();
  return img.webp({ nearLossless: true, quality: 90, alphaQuality: 100, effort: 5 }).toBuffer();
}

/** JSON no formato multiatlas do Phaser. */
export function atlasJson(pages: PackedPage[], images: string[]): object {
  return {
    textures: pages.map((p, i) => ({
      image: images[i],
      format: 'RGBA8888',
      size: { w: p.w, h: p.h },
      scale: 1,
      frames: p.frames.map(({ f, x, y }) => ({
        filename: f.name,
        rotated: false,
        trimmed: f.tw !== f.sw || f.th !== f.sh,
        sourceSize: { w: f.sw, h: f.sh },
        spriteSourceSize: { x: f.tx, y: f.ty, w: f.tw, h: f.th },
        frame: { x, y, w: f.tw, h: f.th },
      })),
    })),
    meta: { app: 'faisca-e-pavio/tools/art', version: '1' },
  };
}
