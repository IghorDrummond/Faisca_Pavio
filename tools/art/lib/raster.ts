import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

export interface RasterFrame {
  name: string;
  /** tamanho lógico do quadro (antes do recorte) */
  sw: number;
  sh: number;
  /** recorte (bbox de alfa) dentro do quadro lógico */
  tx: number;
  ty: number;
  tw: number;
  th: number;
  /** pixels RGBA do recorte */
  data: Buffer;
}

/** Rasteriza um SVG em 2x e reduz para 1x com Lanczos (bordas mais limpas). */
export async function rasterize(svg: string, w: number, h: number, supersample = 2): Promise<Buffer> {
  const r = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: supersample },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: false },
  });
  const png = r.render().asPng();
  return sharp(png).resize(w, h, { kernel: 'lanczos3', fit: 'fill' }).ensureAlpha().raw().toBuffer();
}

/** Recorta pela caixa de alfa (> 2) e devolve o quadro com metadados de trim. */
export function trimFrame(name: string, raw: Buffer, w: number, h: number): RasterFrame {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (raw[(y * w + x) * 4 + 3]! > 2) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    minX = minY = 0;
    maxX = maxY = 0;
  }
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const data = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    raw.copy(data, y * tw * 4, ((minY + y) * w + minX) * 4, ((minY + y) * w + minX + tw) * 4);
  }
  return { name, sw: w, sh: h, tx: minX, ty: minY, tw, th, data };
}

export async function renderFrame(name: string, svg: string, w: number, h: number): Promise<RasterFrame> {
  const raw = await rasterize(svg, w, h);
  return trimFrame(name, raw, w, h);
}
