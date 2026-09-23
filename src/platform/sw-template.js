/* Service worker do Faísca & Pavio — gerado por tools/post-build.ts a partir deste modelo. */
/* eslint-disable */
const VERSION = __SW_VERSION__;
const SHELL = __SHELL_FILES__;
const PACKS = __PACK_FILES__;
const SHELL_CACHE = 'fp-shell-' + VERSION;
const PACK_CACHE = 'fp-packs-' + VERSION;

self.addEventListener('install', (event) => {
  // cache do shell e do pacote inicial na instalação; ativação só quando o jogador pedir (sem interromper partida)
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, PACK_CACHE]);
      const names = await caches.keys();
      // pacotes de ilha já baixados em versões antigas são reaproveitados quando o hash for o mesmo
      const oldPacks = names.filter((n) => n.startsWith('fp-packs-') && n !== PACK_CACHE);
      if (oldPacks.length) {
        const next = await caches.open(PACK_CACHE);
        const wanted = new Set(Object.values(PACKS).flat());
        for (const n of oldPacks) {
          const c = await caches.open(n);
          for (const req of await c.keys()) {
            const path = new URL(req.url).pathname;
            if (wanted.has(path)) {
              const res = await c.match(req);
              if (res) await next.put(req, res);
            }
          }
        }
      }
      await Promise.all(names.filter((n) => n.startsWith('fp-') && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'skipWaiting') self.skipWaiting();
  if (msg.type === 'downloadAll') {
    event.waitUntil(
      (async () => {
        const all = Object.values(PACKS).flat();
        const cache = await caches.open(PACK_CACHE);
        let done = 0;
        for (const url of all) {
          if (!(await cache.match(url))) {
            try {
              const r = await fetch(url);
              if (r.ok) await cache.put(url, r);
            } catch (e) {
              /* segue; o cliente recebe o total real */
            }
          }
          done++;
          if (event.source) event.source.postMessage({ type: 'downloadProgress', done, total: all.length });
        }
        if (event.source) event.source.postMessage({ type: 'downloadDone', total: all.length });
      })(),
    );
  }
  if (msg.type === 'version' && event.source) event.source.postMessage({ type: 'version', version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (req.mode === 'navigate' || path === '/' || path === '/index.html') {
    // network-first para o index (versões novas chegam logo), com fallback offline
    event.respondWith(
      (async () => {
        try {
          const r = await fetch(req);
          const c = await caches.open(SHELL_CACHE);
          if (r.ok && path === '/') c.put('/', r.clone());
          return r;
        } catch (e) {
          const c = await caches.open(SHELL_CACHE);
          return (await c.match(path === '/index.html' ? '/index.html' : '/')) || (await c.match('/index.html')) || Response.error();
        }
      })(),
    );
    return;
  }
  if (path.startsWith('/assets/') || path.startsWith('/packs/')) {
    // assets com hash no nome: cache-first (imutáveis)
    event.respondWith(
      (async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        const r = await fetch(req);
        if (r.ok) {
          const c = await caches.open(path.startsWith('/packs/') && !path.startsWith('/packs/core/') ? PACK_CACHE : SHELL_CACHE);
          c.put(req, r.clone());
        }
        return r;
      })(),
    );
    return;
  }
  // demais (ícones, manifest, páginas legais): stale-while-revalidate
  event.respondWith(
    (async () => {
      const c = await caches.open(SHELL_CACHE);
      const hit = await c.match(req);
      const net = fetch(req)
        .then((r) => {
          if (r.ok) c.put(req, r.clone());
          return r;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    })(),
  );
});
