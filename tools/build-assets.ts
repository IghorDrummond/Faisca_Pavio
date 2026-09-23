/**
 * npm run assets — regenera toda a arte e o áudio procedurais:
 * SVG parametrizado → PNG (2x → 1x) → atlas (≤2048) + JSON multiatlas do Phaser, WebP + PNG,
 * imagens de cenário, SFX (WAV) e o manifesto TypeScript src/generated/assets.ts.
 * Cache incremental por hash das fontes (--force ignora).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { Canvas } from './art/lib/svg';
import { rasterize, renderFrame, type RasterFrame } from './art/lib/raster';
import { atlasJson, composePage, encodePage, pack } from './art/lib/packer';
import { ATLAS_GROUPS, IMAGE_ASSETS } from './art/groups';
import './art/register';
import { buildAudio, type AudioOut } from './audio/build';

const FORCE = process.argv.includes('--force');
const OUT = 'public/packs';
const CACHE_FILE = join(OUT, '.cache.json');

interface AtlasOut {
  key: string;
  webp: string;
  png: string;
}
interface ImageOut {
  key: string;
  webp: string;
  png: string;
  w: number;
  h: number;
  scale: number;
}
interface AnimOut {
  key: string;
  atlas: string;
  frames: string[];
  fps: number;
  repeat: number;
  scale: number;
}
interface PackOut {
  atlases: AtlasOut[];
  images: ImageOut[];
  anims: AnimOut[];
  audio: AudioOut[];
  bytes: number;
  /** memória de textura estimada (RGBA) */
  gpuBytes: number;
  atlasScale: Record<string, number>;
}

function newPack(): PackOut {
  return { atlases: [], images: [], anims: [], audio: [], bytes: 0, gpuBytes: 0, atlasScale: {} };
}

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function hashSources(): string {
  const h = createHash('sha256');
  for (const f of [...walk('tools/art'), ...walk('tools/audio'), 'tools/build-assets.ts', 'src/core/weaponsSim.ts'].sort()) {
    h.update(f);
    h.update(readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}

const short = (b: Buffer): string => createHash('sha1').update(b).digest('hex').slice(0, 8);

async function buildAtlas(group: (typeof ATLAS_GROUPS)[number], packs: Record<string, PackOut>): Promise<void> {
  const dir = join(OUT, group.pack);
  mkdirSync(dir, { recursive: true });
  const frames: RasterFrame[] = [];
  const p = (packs[group.pack] ??= newPack());
  const sprites = group.sprites();
  const t0 = Date.now();
  const sc = group.scale ?? 1;
  for (const s of sprites) {
    const n = s.frames ?? 1;
    const names: string[] = [];
    for (let i = 0; i < n; i++) {
      const c = new Canvas(s.w, s.h, i % 3);
      s.draw(c, i);
      const name = n === 1 ? s.name : `${s.name}_${i}`;
      names.push(name);
      frames.push(await renderFrame(name, c.toSvg(), Math.round(s.w * sc), Math.round(s.h * sc)));
    }
    if (n > 1 || s.fps) p.anims.push({ key: s.name, atlas: group.atlas, frames: names, fps: s.fps ?? 12, repeat: s.repeat ?? -1, scale: sc });
  }
  p.atlasScale[group.atlas] = sc;
  const pages = pack(frames, 2048);
  const webpNames: string[] = [];
  const pngNames: string[] = [];
  const encoded: { webp: Buffer; png: Buffer }[] = [];
  for (const pg of pages) {
    const raw = composePage(pg);
    const png = await encodePage(raw, pg.w, pg.h, 'png', group.palette);
    const webp = await encodePage(raw, pg.w, pg.h, 'webp', false);
    const hs = short(png);
    // formato principal = o menor (PNG com paleta costuma vencer em arte chapada); PNG é sempre o fallback
    const useWebp = webp.length < png.length * 0.9;
    webpNames.push(useWebp ? `${group.atlas}-${hs}.webp` : `${group.atlas}-${hs}.png`);
    pngNames.push(`${group.atlas}-${hs}.png`);
    encoded.push({ webp: useWebp ? webp : Buffer.alloc(0), png });
  }
  for (const pg of pages) p.gpuBytes += pg.w * pg.h * 4;
  encoded.forEach((e, i) => {
    if (e.webp.length) writeFileSync(join(dir, webpNames[i]!), e.webp);
    writeFileSync(join(dir, pngNames[i]!), e.png);
    p.bytes += e.webp.length || e.png.length;
  });
  const jw = Buffer.from(JSON.stringify(atlasJson(pages, webpNames)));
  const jp = Buffer.from(JSON.stringify(atlasJson(pages, pngNames)));
  const jwName = `${group.atlas}-${short(jw)}.json`;
  const jpName = `${group.atlas}-png-${short(jp)}.json`;
  writeFileSync(join(dir, jwName), jw);
  writeFileSync(join(dir, jpName), jp);
  p.bytes += jw.length;
  p.atlases.push({ key: group.atlas, webp: `/packs/${group.pack}/${jwName}`, png: `/packs/${group.pack}/${jpName}` });
  console.log(`  atlas ${group.pack}/${group.atlas}: ${frames.length} quadros, ${pages.length} página(s) ${pages.map((x) => `${x.w}x${x.h}`).join(', ')} em ${Date.now() - t0} ms`);
}

async function buildImage(img: (typeof IMAGE_ASSETS)[number], packs: Record<string, PackOut>): Promise<void> {
  const dir = join(OUT, img.pack);
  mkdirSync(dir, { recursive: true });
  const p = (packs[img.pack] ??= newPack());
  const c = new Canvas(img.w, img.h, 0);
  img.draw(c);
  const rw = Math.round(img.w * img.scale);
  const rh = Math.round(img.h * img.scale);
  const raw = await rasterize(c.toSvg(), rw, rh, img.scale < 1 ? 1 : 2);
  const base = sharp(raw, { raw: { width: rw, height: rh, channels: 4 } });
  const webp = await base.clone().webp(img.opaque ? { quality: 88, effort: 5 } : { nearLossless: true, quality: 88, effort: 5 }).toBuffer();
  const png = await base.clone().png({ compressionLevel: 9, palette: !img.opaque }).toBuffer();
  const hs = short(png);
  writeFileSync(join(dir, `${img.key}-${hs}.webp`), webp);
  writeFileSync(join(dir, `${img.key}-${hs}.png`), png);
  p.bytes += webp.length;
  p.gpuBytes += rw * rh * 4;
  p.images.push({ key: img.key, webp: `/packs/${img.pack}/${img.key}-${hs}.webp`, png: `/packs/${img.pack}/${img.key}-${hs}.png`, w: img.w, h: img.h, scale: img.scale });
}

async function main(): Promise<void> {
  const srcHash = hashSources();
  if (!FORCE && existsSync(CACHE_FILE) && existsSync('src/generated/assets.ts')) {
    const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as { hash: string };
    if (cache.hash === srcHash) {
      console.log('assets: fontes inalteradas, nada a fazer (use --force para regenerar)');
      return;
    }
  }
  const t0 = Date.now();
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const packs: Record<string, PackOut> = {};
  console.log('assets: arte…');
  for (const g of ATLAS_GROUPS) await buildAtlas(g, packs);
  for (const img of IMAGE_ASSETS) await buildImage(img, packs);
  console.log('assets: áudio…');
  const audio = await buildAudio(OUT);
  for (const a of audio) {
    const p = (packs[a.pack] ??= newPack());
    p.audio.push(a);
    p.bytes += a.bytes;
  }
  mkdirSync('src/generated', { recursive: true });
  const header = '/* Gerado por tools/build-assets.ts — não editar à mão. */\n';
  writeFileSync(
    'src/generated/assets.ts',
    `${header}import type { AssetPacks } from '../game/assetTypes';\n\nexport const ASSET_PACKS: AssetPacks = ${JSON.stringify(packs, null, 2)};\n`,
  );
  writeFileSync(CACHE_FILE, JSON.stringify({ hash: srcHash }));
  for (const [k, v] of Object.entries(packs)) console.log(`  pacote ${k}: ${(v.bytes / 1048576).toFixed(2)} MB em disco; ~${(v.gpuBytes / 1048576).toFixed(0)} MB de textura`);
  console.log(`assets: concluído em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
