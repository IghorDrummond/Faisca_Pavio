/**
 * Servidor estático de preview da build de produção.
 * Aplica os cabeçalhos de public/_headers (mesmo formato de Netlify/Cloudflare Pages),
 * serve variantes pré-comprimidas (.br/.gz) e bloqueia path traversal.
 *
 * Uso: node tools/preview-server.ts [--dir dist] [--port 4173]
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
function arg(name: string, def: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : def;
}
const root = resolve(arg('dir', 'dist'));
const port = Number(arg('port', '4173'));
const noHeaders = args.includes('--no-headers');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
};

interface Rule {
  pattern: string;
  headers: [string, string][];
}

function parseHeaders(file: string): Rule[] {
  if (!existsSync(file)) return [];
  const rules: Rule[] = [];
  let cur: Rule | null = null;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      cur = { pattern: raw.trim(), headers: [] };
      rules.push(cur);
    } else if (cur) {
      const idx = raw.indexOf(':');
      if (idx > 0) cur.headers.push([raw.slice(0, idx).trim(), raw.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern: string, path: string): boolean {
  if (pattern.endsWith('*')) return path.startsWith(pattern.slice(0, -1));
  return pattern === path;
}

const rules = noHeaders ? [] : parseHeaders(join(root, '_headers'));

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile() || path.endsWith('/_headers')) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
      return;
    }
    const headers: Record<string, string> = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
    for (const r of rules) {
      if (matches(r.pattern, url.pathname) || (r.pattern === '/index.html' && url.pathname === '/')) {
        for (const [k, v] of r.headers) headers[k] = v;
      }
    }
    const accept = String(req.headers['accept-encoding'] ?? '');
    let body = file;
    if (accept.includes('br') && existsSync(file + '.br')) {
      body = file + '.br';
      headers['Content-Encoding'] = 'br';
    } else if (accept.includes('gzip') && existsSync(file + '.gz')) {
      body = file + '.gz';
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Vary'] = 'Accept-Encoding';
    headers['Content-Length'] = String(statSync(body).size);
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(body).pipe(res);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(port, () => {
  console.log(`Preview: http://localhost:${port}  (servindo ${root}${noHeaders ? ', sem cabeçalhos' : ''})`);
});
