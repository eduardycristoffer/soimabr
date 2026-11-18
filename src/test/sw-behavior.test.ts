import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Executa o public/sw.js REAL num ambiente simulado (cache, fetch e eventos falsos) e confere
 * as regras de segurança e as estratégias. Não depende de navegador.
 */

const ORIGIN = "https://app.test";
const swSource = readFileSync(join(process.cwd(), "public/sw.js"), "utf-8");

type FakeRes = { ok: boolean; type: string; tag: string; clone: () => FakeRes };
const mkRes = (tag: string, type = "basic", ok = true): FakeRes => ({ ok, type, tag, clone: () => mkRes(tag, type, ok) });

function setup() {
  const handlers: Record<string, (e: any) => void> = {};
  const stores = new Map<string, Map<string, FakeRes>>();
  const keyOf = (r: any) => (typeof r === "string" ? r : r.url);

  const openCache = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      put: async (req: any, res: FakeRes) => { m.set(keyOf(req), res); },
      match: async (req: any) => m.get(keyOf(req)),
      delete: async (req: any) => m.delete(keyOf(req)),
      keys: async () => [...m.keys()].map((url) => ({ url })),
      addAll: async (urls: string[]) => { urls.forEach((u) => m.set(u, mkRes(u))); },
    };
  };

  const caches = {
    open: openCache,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };

  const fetchMock = vi.fn();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: (e: any) => void) => { handlers[type] = fn; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
  };

  // eslint-disable-next-line no-new-func
  new Function("self", "caches", "fetch", "URL", "Response", swSource)(self, caches, fetchMock, URL, { error: () => "ERRO_DE_REDE" });

  /** Dispara um evento fetch e devolve { respondido, resposta, pendentes } */
  async function doFetch(request: { method?: string; url: string; mode?: string }) {
    let responded = false;
    let response: any;
    const pending: Promise<any>[] = [];
    handlers.fetch({
      request: { method: "GET", mode: "cors", ...request },
      respondWith: (p: any) => { responded = true; response = p; },
      waitUntil: (p: any) => { pending.push(p); },
    });
    const value = responded ? await response : undefined;
    await Promise.all(pending);
    return { responded, value };
  }

  return { handlers, stores, self, fetchMock, doFetch };
}

describe("service worker — segurança", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => { t = setup(); });

  it("NÃO intercepta outra origem (Supabase, câmbio...): vai direto para a rede", async () => {
    const r = await t.doFetch({ url: "https://untvhsyorhojoviyplax.supabase.co/rest/v1/clients?select=*" });
    expect(r.responded).toBe(false);
    expect(t.fetchMock).not.toHaveBeenCalled();
    expect(t.stores.size).toBe(0); // nada foi guardado
  });

  it("NÃO intercepta funções e arquivos do Supabase mesmo com cara de imagem/arquivo", async () => {
    expect((await t.doFetch({ url: "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/sign/contracts/x.png" })).responded).toBe(false);
    expect((await t.doFetch({ url: "https://economia.awesomeapi.com.br/json/last/USD-BRL" })).responded).toBe(false);
  });

  it("NÃO intercepta POST/PUT/DELETE, mesmo na própria origem", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect((await t.doFetch({ method, url: `${ORIGIN}/api/x` })).responded).toBe(false);
    }
  });

  it("não mexe no próprio sw.js", async () => {
    expect((await t.doFetch({ url: `${ORIGIN}/sw.js` })).responded).toBe(false);
  });

  it("não guarda resposta que não seja da própria origem (type != basic) nem com erro", async () => {
    t.fetchMock.mockResolvedValueOnce(mkRes("opaque", "opaque"));
    const r1 = await t.doFetch({ url: `${ORIGIN}/assets/a.js` });
    expect(r1.responded).toBe(true);
    t.fetchMock.mockResolvedValueOnce(mkRes("erro", "basic", false));
    await t.doFetch({ url: `${ORIGIN}/assets/b.js` });
    const store = t.stores.get("soima-static-v1");
    expect(store?.size ?? 0).toBe(0);
  });
});

describe("service worker — estratégias", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => { t = setup(); });

  it("página: rede primeiro e guarda a tela-base para uso sem internet", async () => {
    t.fetchMock.mockResolvedValueOnce(mkRes("index-online"));
    const r = await t.doFetch({ url: `${ORIGIN}/orcamentos`, mode: "navigate" });
    expect(r.value.tag).toBe("index-online");
    expect(t.stores.get("soima-pages-v1")?.get("/")?.tag).toBe("index-online");
  });

  it("página sem internet: abre a última tela-base guardada", async () => {
    t.fetchMock.mockResolvedValueOnce(mkRes("index-v1"));
    await t.doFetch({ url: `${ORIGIN}/dashboard`, mode: "navigate" });
    t.fetchMock.mockRejectedValueOnce(new Error("offline"));
    const r = await t.doFetch({ url: `${ORIGIN}/contratos`, mode: "navigate" });
    expect(r.value.tag).toBe("index-v1");
  });

  it("página sem internet e sem tela guardada: mostra a página 'sem conexão'", async () => {
    await t.handlers.install({ waitUntil: (p: Promise<any>) => p }); // pré-guarda a página offline
    t.fetchMock.mockRejectedValueOnce(new Error("offline"));
    const r = await t.doFetch({ url: `${ORIGIN}/dashboard`, mode: "navigate" });
    expect(r.value.tag).toBe("/offline.html");
  });

  it("arquivo versionado: cache primeiro (segunda vez não vai à rede)", async () => {
    t.fetchMock.mockResolvedValueOnce(mkRes("js-1"));
    const first = await t.doFetch({ url: `${ORIGIN}/assets/index-abc123.js` });
    expect(first.value.tag).toBe("js-1");
    expect(t.fetchMock).toHaveBeenCalledTimes(1);
    const second = await t.doFetch({ url: `${ORIGIN}/assets/index-abc123.js` });
    expect(second.value.tag).toBe("js-1");
    expect(t.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("limita o tamanho do cache de arquivos (apaga os mais antigos)", async () => {
    for (let i = 0; i < 160; i++) {
      t.fetchMock.mockResolvedValueOnce(mkRes(`f${i}`));
      await t.doFetch({ url: `${ORIGIN}/assets/chunk-${i}.js` });
    }
    expect(t.stores.get("soima-static-v1")!.size).toBeLessThanOrEqual(150);
  });
});

describe("service worker — ciclo de vida", () => {
  it("ativação apaga caches antigos do app, preserva os de outros e assume as abas", async () => {
    const t = setup();
    t.stores.set("soima-static-v0", new Map());
    t.stores.set("soima-pages-v0", new Map());
    t.stores.set("outro-app-cache", new Map());
    let pending: Promise<any> | undefined;
    t.handlers.activate({ waitUntil: (p: Promise<any>) => { pending = p; } });
    await pending;
    expect([...t.stores.keys()]).toContain("outro-app-cache");
    expect([...t.stores.keys()]).not.toContain("soima-static-v0");
    expect([...t.stores.keys()]).not.toContain("soima-pages-v0");
    expect(t.self.clients.claim).toHaveBeenCalled();
  });

  it("só pula a espera quando o usuário manda SKIP_WAITING", () => {
    const t = setup();
    t.handlers.message({ data: "qualquer coisa" });
    expect(t.self.skipWaiting).not.toHaveBeenCalled();
    t.handlers.message({ data: "SKIP_WAITING" });
    expect(t.self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it("a instalação não pula a espera sozinha", async () => {
    const t = setup();
    await t.handlers.install({ waitUntil: (p: Promise<any>) => p });
    expect(t.self.skipWaiting).not.toHaveBeenCalled();
  });
});
