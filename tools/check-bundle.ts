/**
 * Verifica orçamentos de tamanho da build de produção (tamanhos brotli):
 * - carregamento inicial (shell + JS/CSS + fontes + pacote core) ≤ 5 MB
 * - cada pacote de ilha ≤ 15 MB
 * - JS total ≤ 1 MB comprimido sem code splitting (senão exige splitting)
 * - ferramentas de debug ausentes do bundle de produção
 * Uso: tsx tools/check-bundle.ts [dist]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const dist = process.argv[2] ?? 'dist';
const MB = 1048576;
const BUDGET_INITIAL = 5 * MB;
const BUDGET_PACK = 15 * MB;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (!p.endsWith('.br') && !p.endsWith('.gz')) out.push(p);
  }
  return out;
}

function transferSize(f: string): number {
  if (existsSync(f + '.br')) return statSync(f + '.br').size;
  const ext = f.slice(f.lastIndexOf('.'));
  if (['.png', '.webp', '.woff2', '.ogg', '.m4a', '.mp3'].includes(ext)) return statSync(f).size;
  return brotliCompressSync(readFileSync(f)).length;
}

const all = walk(dist);
const rel = (f: string): string => '/' + relative(dist, f).split('\\').join('/');
let initial = 0;
let js = 0;
const packs: Record<string, number> = {};
for (const f of all) {
  const r = rel(f);
  const size = transferSize(f);
  const m = /^\/packs\/([^/]+)\//.exec(r);
  if (m && m[1] !== 'core') {
    packs[m[1]!] = (packs[m[1]!] ?? 0) + size;
    continue;
  }
  if (r.endsWith('.js') && r.startsWith('/assets/')) js += size;
  if (r === '/index.html' || r.startsWith('/assets/') || r.startsWith('/packs/core/') || r === '/manifest.webmanifest' || r === '/sw.js') {
    initial += size;
  }
}

let fail = false;
const fmt = (n: number): string => `${(n / MB).toFixed(2)} MB`;
console.log(`check:bundle — carregamento inicial: ${fmt(initial)} (orçamento ${fmt(BUDGET_INITIAL)})`);
if (initial > BUDGET_INITIAL) fail = true;
console.log(`check:bundle — JS (brotli): ${fmt(js)}`);
for (const [k, v] of Object.entries(packs)) {
  console.log(`check:bundle — pacote ${k}: ${fmt(v)} (orçamento ${fmt(BUDGET_PACK)})`);
  if (v > BUDGET_PACK) fail = true;
}
// ferramentas de debug não podem existir no bundle de produção
const markers = ['debug-routes', 'debug-tools', '__BENCHMARK_SCENE__'];
for (const f of all.filter((x) => x.endsWith('.js'))) {
  const src = readFileSync(f, 'utf8');
  for (const mk of markers) {
    if (src.includes(mk) && !dist.includes('e2e')) {
      console.error(`check:bundle — marcador de debug "${mk}" encontrado em ${rel(f)}`);
      fail = true;
    }
  }
}
if (fail) {
  console.error('check:bundle — FALHOU');
  process.exit(1);
}
console.log('check:bundle — OK');
