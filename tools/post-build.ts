/**
 * Pós-build: gera o service worker com a lista de precache (shell + pacote inicial),
 * e variantes comprimidas brotli/gzip de todos os arquivos texto/binários compressíveis.
 * Uso: node tools/post-build.ts [dist]
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';

const dist = process.argv[2] ?? 'dist';
const COMPRESS = new Set(['.js', '.css', '.html', '.json', '.svg', '.webmanifest', '.txt', '.wav', '.woff', '.xml']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// ---- service worker
const files = walk(dist)
  .filter((f) => !f.endsWith('.br') && !f.endsWith('.gz'))
  .map((f) => '/' + relative(dist, f).split('\\').join('/'));
const shell = files.filter(
  (f) =>
    f === '/index.html' ||
    f === '/manifest.webmanifest' ||
    f.startsWith('/assets/') ||
    f.startsWith('/icons/') ||
    f.startsWith('/packs/core/') ||
    f === '/privacidade.html' ||
    f === '/licencas.html' ||
    f.startsWith('/legal/'),
);
const packs: Record<string, string[]> = {};
for (const f of files) {
  const m = /^\/packs\/([^/]+)\//.exec(f);
  if (m && m[1] !== 'core') (packs[m[1]!] ??= []).push(f);
}
const hash = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 10);
const swTemplatePath = 'src/platform/sw-template.js';
if (existsSync(swTemplatePath)) {
  const tpl = readFileSync(swTemplatePath, 'utf8');
  const sw = tpl
    .replace('__SW_VERSION__', JSON.stringify(`${pkg.version}-${hash}`))
    .replace('__SHELL_FILES__', JSON.stringify(['/', ...shell]))
    .replace('__PACK_FILES__', JSON.stringify(packs));
  writeFileSync(join(dist, 'sw.js'), sw);
  writeFileSync(join(dist, 'pack-index.json'), JSON.stringify({ version: `${pkg.version}-${hash}`, packs }, null, 0));
}

// ---- compressão
let raw = 0;
let br = 0;
for (const f of walk(dist)) {
  if (f.endsWith('.br') || f.endsWith('.gz')) continue;
  if (!COMPRESS.has(extname(f))) continue;
  const buf = readFileSync(f);
  if (buf.length < 512) continue;
  const b = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } });
  const g = gzipSync(buf, { level: 9 });
  writeFileSync(f + '.br', b);
  writeFileSync(f + '.gz', g);
  raw += buf.length;
  br += b.length;
}
console.log(`post-build: ${files.length} arquivos; compressíveis ${(raw / 1048576).toFixed(2)} MB → brotli ${(br / 1048576).toFixed(2)} MB`);
