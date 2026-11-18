import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shouldRegisterServiceWorker } from "@/lib/pwa";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf-8");

/** Largura e altura de um PNG (bytes 16–23 do arquivo). */
function pngSize(p: string): { w: number; h: number } {
  const b = readFileSync(join(root, p));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe("manifesto do PWA", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));

  it("tem o necessário para instalar", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toMatch(/^\//);
    expect(manifest.scope).toBe("/");
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.lang).toBe("pt-BR");
  });

  it("os ícones existem e têm o tamanho declarado", () => {
    for (const icon of manifest.icons) {
      const file = `public${icon.src}`;
      expect(existsSync(join(root, file)), file).toBe(true);
      const [w, h] = icon.sizes.split("x").map(Number);
      expect(pngSize(file)).toEqual({ w, h });
    }
  });

  it("tem ícone de 192, 512 e um 'maskable' (Android)", () => {
    const sizes = manifest.icons.map((i: any) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:any");
    expect(sizes).toContain("512x512:maskable");
  });

  it("os atalhos apontam para telas que existem", () => {
    const routes = ["/orcamentos", "/contratos", "/clientes", "/relatorios"];
    for (const s of manifest.shortcuts) expect(routes.some((r) => s.url.startsWith(r))).toBe(true);
  });

  it("o index.html aponta para o manifesto e para o ícone do iPhone", () => {
    const html = read("index.html");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(existsSync(join(root, "public/icons/apple-touch-icon.png"))).toBe(true);
    expect(pngSize("public/icons/apple-touch-icon.png")).toEqual({ w: 180, h: 180 });
  });
});

describe("service worker (regras de segurança)", () => {
  const sw = read("public/sw.js");

  it("só intercepta a própria origem e só GET (nada de Supabase no cache)", () => {
    expect(sw).toContain('req.method !== "GET"');
    expect(sw).toContain("url.origin !== self.location.origin");
    // a checagem de origem vem antes de qualquer cache.put/fetch de resposta
    expect(sw.indexOf("url.origin !== self.location.origin")).toBeLessThan(sw.indexOf("caches.open(STATIC_CACHE)"));
  });

  it("só guarda respostas da própria origem (type basic)", () => {
    const puts = sw.split("\n").filter((l) => l.includes(".put("));
    expect(puts.length).toBeGreaterThan(0);
    expect(sw).toContain('res.type === "basic"');
  });

  it("a atualização espera o usuário (não pula a espera sozinha)", () => {
    expect(sw).toContain('"SKIP_WAITING"');
    // skipWaiting só dentro do tratador de mensagem
    const idx = sw.indexOf("self.skipWaiting()");
    expect(sw.slice(Math.max(0, idx - 120), idx)).toContain("SKIP_WAITING");
    expect(sw.match(/skipWaiting\(\)/g)?.length).toBe(1);
  });

  it("existe a página sem conexão", () => {
    expect(existsSync(join(root, "public/offline.html"))).toBe(true);
    expect(sw).toContain("/offline.html");
  });
});

describe("quando registrar o service worker", () => {
  const prod = { prod: true, inIframe: false, hostname: "soimabr.lovable.app" };
  it("registra em produção normal", () => expect(shouldRegisterServiceWorker(prod)).toBe(true));
  it("não registra em desenvolvimento", () => expect(shouldRegisterServiceWorker({ ...prod, prod: false })).toBe(false));
  it("não registra dentro de iframe (editor do Lovable)", () => expect(shouldRegisterServiceWorker({ ...prod, inIframe: true })).toBe(false));
  it("não registra nas prévias do Lovable", () => {
    expect(shouldRegisterServiceWorker({ ...prod, hostname: "1d50f110-xxxx.lovableproject.com" })).toBe(false);
    expect(shouldRegisterServiceWorker({ ...prod, hostname: "id-preview--abc.lovable.app" })).toBe(false);
  });
});
