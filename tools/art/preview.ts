/**
 * Folha de contato para inspeção visual.
 * Uso: tsx tools/art/preview.ts <saida.png> <atlas|img:chave> [filtro] [escala]
 */
import sharp from 'sharp';
import { Canvas } from './lib/svg';
import { rasterize } from './lib/raster';
import { ATLAS_GROUPS, IMAGE_ASSETS } from './groups';
import './register';

const out = process.argv[2] ?? 'preview.png';
const target = process.argv[3] ?? 'players';
const filter = process.argv[4] ?? '';
const scale = Number(process.argv[5] ?? '1');

async function main(): Promise<void> {
  if (target.startsWith('img:')) {
    const keys = target.slice(4).split(',');
    const layers: Buffer[] = [];
    for (const k of keys) {
      const img = IMAGE_ASSETS.find((x) => x.key === k);
      if (!img) throw new Error(`imagem ${k} não encontrada`);
      const c = new Canvas(img.w, img.h, 0);
      img.draw(c);
      const w = Math.round(img.w * scale);
      const h = Math.round(img.h * scale);
      const raw = await rasterize(c.toSvg(), w, h, 1);
      layers.push(await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer());
    }
    const first = IMAGE_ASSETS.find((x) => x.key === keys[0])!;
    const W = Math.round(first.w * scale);
    const H = Math.round(first.h * scale);
    await sharp({ create: { width: W, height: H, channels: 4, background: '#000' } })
      .composite(layers.map((b, i) => {
        const img = IMAGE_ASSETS.find((x) => x.key === keys[i])!;
        return { input: b, left: 0, top: img.h * scale < H ? H - Math.round(img.h * scale) - Math.round(100 * scale) : 0 };
      }))
      .png()
      .toFile(out);
    console.log(`imagens → ${out}`);
    return;
  }
  const g = ATLAS_GROUPS.find((x) => x.atlas === target);
  if (!g) throw new Error(`grupo ${target} não encontrado`);
  const cells: { buf: Buffer; w: number; h: number }[] = [];
  for (const s of g.sprites()) {
    if (filter && !s.name.includes(filter)) continue;
    for (let i = 0; i < (s.frames ?? 1); i++) {
      const c = new Canvas(s.w, s.h, i % 3);
      c.add(`<rect width="${s.w}" height="${s.h}" fill="#d8c8a4"/>`);
      s.draw(c, i);
      const w = Math.round(s.w * scale);
      const h = Math.round(s.h * scale);
      cells.push({ buf: await rasterize(c.toSvg(), w, h), w, h });
    }
  }
  const cw = Math.max(...cells.map((c) => c.w));
  const chh = Math.max(...cells.map((c) => c.h));
  const cols = Math.max(1, Math.min(cells.length, Math.floor(2400 / cw)));
  const rows = Math.ceil(cells.length / cols);
  await sharp({ create: { width: cols * cw, height: rows * chh, channels: 4, background: '#999' } })
    .composite(cells.map((c, i) => ({ input: c.buf, raw: { width: c.w, height: c.h, channels: 4 as const }, left: (i % cols) * cw, top: Math.floor(i / cols) * chh })))
    .png()
    .toFile(out);
  console.log(`${cells.length} quadros → ${out}`);
}

void main();
