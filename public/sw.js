/*
 * Service worker do SOIMA BR (PWA).
 *
 * Regras de segurança (o app mostra dados de clientes e contratos):
 *  - só arquivos do PRÓPRIO app (telas, scripts versionados, ícones) passam por aqui;
 *  - NADA de outra origem é interceptado nem guardado: Supabase (login, dados, arquivos,
 *    funções), câmbio e demais APIs vão direto para a rede, sempre. Nenhum dado de cliente
 *    nem sessão fica no cache do aparelho;
 *  - só requisições GET.
 *
 * Estratégias:
 *  - páginas (navegação): rede primeiro; sem internet, abre a última tela do app guardada
 *    ou a página "sem conexão";
 *  - arquivos versionados (/assets/*), ícones e imagens: cache primeiro (o nome do arquivo
 *    muda a cada versão, então nunca ficam velhos);
 *  - atualização: a versão nova espera o usuário clicar em "Atualizar" (mensagem SKIP_WAITING),
 *    para não recarregar a tela no meio de uma proposta.
 */
const VERSION = "v1";
const STATIC_CACHE = `soima-static-${VERSION}`;
const PAGES_CACHE = `soima-pages-${VERSION}`;
const SHELL_KEY = "/";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.webp"];
const MAX_STATIC_ENTRIES = 150;

self.addEventListener("install", (event) => {
  // Se algum arquivo falhar, a instalação do app continua (o cache é só um reforço)
  event.waitUntil(caches.open(PAGES_CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
    for (const key of await caches.keys()) {
      if (key.startsWith("soima-") && !keep.has(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]); // os mais antigos primeiro
}

const isStaticAsset = (path) =>
  path.startsWith("/assets/") || path.startsWith("/icons/") || path.startsWith("/images/") ||
  /\.(?:woff2?|webp|png|jpe?g|svg|ico)$/.test(path);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nunca toca em outra origem (Supabase etc.)
  if (url.pathname === "/sw.js") return;            // o próprio service worker: sempre da rede

  // Páginas: rede primeiro
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          event.waitUntil(caches.open(PAGES_CACHE).then((c) => c.put(SHELL_KEY, copy))); // a tela-base do app (SPA)
        }
        return res;
      } catch {
        const cache = await caches.open(PAGES_CACHE);
        return (await cache.match(SHELL_KEY)) || (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  // Arquivos versionados, ícones e imagens: cache primeiro
  if (isStaticAsset(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === "basic") {
        event.waitUntil(cache.put(req, res.clone()).then(() => trim(cache, MAX_STATIC_ENTRIES)));
      }
      return res;
    })());
  }
});
