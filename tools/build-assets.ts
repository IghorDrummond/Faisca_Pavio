/**
 * npm run assets — regenera toda a arte e o áudio procedurais:
 * SVG parametrizado → PNG (2x → 1x) → atlas (≤2048) + JSON multiatlas do Phaser (PNG com paleta ou WebP),
 * imagens de cenário, ícones do PWA, SFX/amostras (WAV) e o manifesto TypeScript src/generated/assets.ts.
 * Cache incremental por grupo: só rasteriza o que mudou (hash dos SVGs gerados). --force ignora o cache.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { Canvas } from './art/lib/svg';
import { rasterize, renderFrame, type RasterFrame } from './art/lib/raster';
import { atlasJson, composePage, encodePage, pack } from './art/lib/packer';
import { ATLAS_GROUPS, IMAGE_ASSETS, type AtlasGroup, type ImageAsset } from './art/groups';
import './art/register';
import { buildAudio, type AudioOut } from './audio/build';
import { buildIcons } from './art/icons';

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

interface GroupResult {
  hash: string;
  files: string[];
  atlas?: AtlasOut;
  image?: ImageOut;
  anims: AnimOut[];
  bytes: number;
  gpuBytes: number;
  scale: number;
}

interface Cache {
  groups: Record<string, GroupResult>;
}

function newPack(): PackOut {
  return { atlases: [], images: [], anims: [], audio: [], bytes: 0, gpuBytes: 0, atlasScale: {} };
}

const short = (b: Buffer | string): string => createHash('sha1').update(b).digest('hex').slice(0, 8);

function loadCache(): Cache {
  if (FORCE || !existsSync(CACHE_FILE)) return { groups: {} };
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Cache;
  } catch {
    return { groups: {} };
  }
}

function filesExist(files: string[]): boolean {
  return files.every((f) => existsSync(f));
}

async function buildAtlas(group: AtlasGroup, cache: Cache): Promise<GroupResult> {
  const dir = join(OUT, group.pack);
  mkdirSync(dir, { recursive: true });
  const sc = group.scale ?? 1;
  // 1) gera todos os SVGs (barato) e calcula o hash do grupo
  const svgs: { name: string; svg: string; w: number; h: number }[] = [];
  const anims: AnimOut[] = [];
  const hasher = createHash('sha256');
  hasher.update(`${group.atlas}|${sc}|${group.palette}`);
  for (const s of group.sprites()) {
    const n = s.frames ?? 1;
    const names: string[] = [];
    for (let i = 0; i < n; i++) {
      const c = new Canvas(s.w, s.h, i % 3);
      s.draw(c, i);
      const name = n === 1 ? s.name : `${s.name}_${i}`;
      const svg = c.toSvg();
      names.push(name);
      svgs.push({ name, svg, w: Math.round(s.w * sc), h: Math.round(s.h * sc) });
      hasher.update(name);
      hasher.update(svg);
    }
    if (n > 1 || s.fps) anims.push({ key: s.name, atlas: group.atlas, frames: names, fps: s.fps ?? 12, repeat: s.repeat ?? -1, scale: sc });
  }
  const hash = hasher.digest('hex').slice(0, 16);
  const cached = cache.groups[`atlas:${group.atlas}`];
  if (cached && cached.hash === hash && filesExist(cached.files)) {
    console.log(`  atlas ${group.pack}/${group.atlas}: em cache`);
    return cached;
  }
  // 2) rasteriza e empacota
  const t0 = Date.now();
  const frames: RasterFrame[] = [];
  for (const s of svgs) frames.push(await renderFrame(s.name, s.svg, s.w, s.h));
  const pages = pack(frames, 2048);
  const mainNames: string[] = [];
  const pngNames: string[] = [];
  const files: string[] = [];
  let bytes = 0;
  let gpuBytes = 0;
  for (const pg of pages) {
    const raw = composePage(pg);
    const png = await encodePage(raw, pg.w, pg.h, 'png', group.palette);
    const webp = await encodePage(raw, pg.w, pg.h, 'webp', false);
    const hs = short(png);
    // formato principal = o menor (PNG com paleta costuma vencer em arte chapada); PNG é sempre o fallback
    const useWebp = webp.length < png.length * 0.9;
    const pngName = `${group.atlas}-${hs}.png`;
    writeFileSync(join(dir, pngName), png);
    files.push(join(dir, pngName));
    pngNames.push(pngName);
    if (useWebp) {
      const wn = `${group.atlas}-${hs}.webp`;
      writeFileSync(join(dir, wn), webp);
      files.push(join(dir, wn));
      mainNames.push(wn);
      bytes += webp.length;
    } else {
      mainNames.push(pngName);
      bytes += png.length;
    }
    gpuBytes += pg.w * pg.h * 4;
  }
  const jw = Buffer.from(JSON.stringify(atlasJson(pages, mainNames)));
  const jp = Buffer.from(JSON.stringify(atlasJson(pages, pngNames)));
  const jwName = `${group.atlas}-${short(jw)}.json`;
  const jpName = `${group.atlas}-png-${short(jp)}.json`;
  writeFileSync(join(dir, jwName), jw);
  writeFileSync(join(dir, jpName), jp);
  files.push(join(dir, jwName), join(dir, jpName));
  bytes += jw.length;
  console.log(`  atlas ${group.pack}/${group.atlas}: ${frames.length} quadros, ${pages.length} página(s) ${pages.map((x) => `${x.w}x${x.h}`).join(', ')} em ${Date.now() - t0} ms`);
  return {
    hash,
    files,
    atlas: { key: group.atlas, webp: `/packs/${group.pack}/${jwName}`, png: `/packs/${group.pack}/${jpName}` },
    anims,
    bytes,
    gpuBytes,
    scale: sc,
  };
}

async function buildImage(img: ImageAsset, cache: Cache): Promise<GroupResult> {
  const dir = join(OUT, img.pack);
  mkdirSync(dir, { recursive: true });
  const c = new Canvas(img.w, img.h, 0);
  img.draw(c);
  const svg = c.toSvg();
  const hash = short(`${svg}|${img.scale}|${img.opaque}`);
  const cached = cache.groups[`img:${img.key}`];
  if (cached && cached.hash === hash && filesExist(cached.files)) return cached;
  const rw = Math.round(img.w * img.scale);
  const rh = Math.round(img.h * img.scale);
  const raw = await rasterize(svg, rw, rh, img.scale < 1 ? 1 : 2);
  const base = sharp(raw, { raw: { width: rw, height: rh, channels: 4 } });
  const webp = await base.clone().webp(img.opaque ? { quality: 88, effort: 5 } : { nearLossless: true, quality: 88, effort: 5 }).toBuffer();
  const png = await base.clone().png({ compressionLevel: 9, palette: !img.opaque }).toBuffer();
  const hs = short(png);
  const wf = join(dir, `${img.key}-${hs}.webp`);
  const pf = join(dir, `${img.key}-${hs}.png`);
  writeFileSync(wf, webp);
  writeFileSync(pf, png);
  console.log(`  imagem ${img.pack}/${img.key}: ${rw}x${rh}`);
  return {
    hash,
    files: [wf, pf],
    image: { key: img.key, webp: `/packs/${img.pack}/${img.key}-${hs}.webp`, png: `/packs/${img.pack}/${img.key}-${hs}.png`, w: img.w, h: img.h, scale: img.scale },
    anims: [],
    bytes: webp.length,
    gpuBytes: rw * rh * 4,
    scale: img.scale,
  };
}

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

async function main(): Promise<void> {
  const t0 = Date.now();
  mkdirSync(OUT, { recursive: true });
  const cache = loadCache();
  const next: Cache = { groups: {} };
  const packs: Record<string, PackOut> = {};
  const keep = new Set<string>();
  console.log('assets: arte…');
  for (const g of ATLAS_GROUPS) {
    const r = await buildAtlas(g, cache);
    next.groups[`atlas:${g.atlas}`] = r;
    const p = (packs[g.pack] ??= newPack());
    if (r.atlas) p.atlases.push(r.atlas);
    p.anims.push(...r.anims);
    p.bytes += r.bytes;
    p.gpuBytes += r.gpuBytes;
    p.atlasScale[g.atlas] = r.scale;
    for (const f of r.files) keep.add(f);
  }
  for (const img of IMAGE_ASSETS) {
    const r = await buildImage(img, cache);
    next.groups[`img:${img.key}`] = r;
    const p = (packs[img.pack] ??= newPack());
    if (r.image) p.images.push(r.image);
    p.bytes += r.bytes;
    p.gpuBytes += r.gpuBytes;
    for (const f of r.files) keep.add(f);
  }
  await buildIcons();
  console.log('assets: áudio…');
  const audio = await buildAudio(OUT);
  for (const a of audio) {
    const p = (packs[a.pack] ??= newPack());
    p.audio.push(a);
    p.bytes += a.bytes;
    keep.add(join('public', a.url));
  }
  // remove arquivos obsoletos
  for (const f of walkFiles(OUT)) {
    if (f.endsWith('.cache.json')) continue;
    const norm = f.split('\\').join('/');
    if (![...keep].some((k) => k.split('\\').join('/') === norm)) unlinkSync(f);
  }
  mkdirSync('src/generated', { recursive: true });
  const header = '/* Gerado por tools/build-assets.ts — não editar à mão. */\n';
  writeFileSync(
    'src/generated/assets.ts',
    `${header}import type { AssetPacks } from '../game/assetTypes';\n\nexport const ASSET_PACKS: AssetPacks = ${JSON.stringify(packs, null, 2)};\n`,
  );
  writeFileSync(CACHE_FILE, JSON.stringify(next));
  for (const [k, v] of Object.entries(packs)) console.log(`  pacote ${k}: ${(v.bytes / 1048576).toFixed(2)} MB em disco; ~${(v.gpuBytes / 1048576).toFixed(0)} MB de textura`);
  console.log(`assets: concluído em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
