import { describe, it, expect, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  clampIndex, computeCardPosition, findVisibleTarget, hasSeenTour, isElementVisible, markTourOffered, markTourSeen,
  paragraphs, spotlightRect, visibleSteps, wasTourOffered, type Tour,
} from "./tour";
import { NOVIDADES_TOUR, getTour } from "./tourContent";

const tour: Tour = {
  id: "t", version: 1, title: "T", description: "",
  steps: [
    { id: "a", title: "A", body: "a" },
    { id: "b", title: "B", body: "b", adminOnly: true },
    { id: "c", title: "C", body: "c", feature: "service" },
    { id: "d", title: "D", body: "d", adminOnly: true, feature: "service" },
  ],
};

describe("passos que aparecem", () => {
  it("usuário comum, função desligada: só o passo livre", () => {
    expect(visibleSteps(tour, { isAdmin: false, features: { service: false } }).map((s) => s.id)).toEqual(["a"]);
  });
  it("administrador vê os passos de administrador", () => {
    expect(visibleSteps(tour, { isAdmin: true, features: { service: false } }).map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("função ativa libera o passo dela; combinação exige as duas coisas", () => {
    expect(visibleSteps(tour, { isAdmin: false, features: { service: true } }).map((s) => s.id)).toEqual(["a", "c"]);
    expect(visibleSteps(tour, { isAdmin: true, features: { service: true } }).map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("clampIndex não sai da lista", () => {
    expect([clampIndex(-1, 3), clampIndex(1, 3), clampIndex(9, 3), clampIndex(2, 0)]).toEqual([0, 1, 2, 0]);
  });
});

describe("posição do cartão", () => {
  const vp = { width: 1200, height: 800 };
  const card = { width: 360, height: 220 };

  it("sem destino: no centro", () => {
    expect(computeCardPosition(null, card, vp)).toEqual({ top: 290, left: 420, placement: "center" });
  });

  it("placement 'center' ignora o destino", () => {
    expect(computeCardPosition({ top: 10, left: 10, width: 50, height: 20 }, card, vp, "center").placement).toBe("center");
  });

  it("menu lateral (à esquerda): cartão à direita, alinhado ao meio do alvo", () => {
    const p = computeCardPosition({ top: 200, left: 8, width: 240, height: 40 }, card, vp);
    expect(p.placement).toBe("right");
    expect(p.left).toBe(8 + 240 + 14);
    expect(p.top).toBe(220 - 110); // centro do alvo (220) - metade do cartão
  });

  it("alvo no canto direito: sem espaço à direita, vai para baixo e fica dentro da tela", () => {
    const p = computeCardPosition({ top: 20, left: 1100, width: 80, height: 36 }, card, vp);
    expect(p.placement).toBe("bottom");
    expect(p.left + card.width).toBeLessThanOrEqual(vp.width - 12);
    expect(p.top).toBe(20 + 36 + 14);
  });

  it("alvo embaixo: usa o lado de cima", () => {
    const p = computeCardPosition({ top: 740, left: 500, width: 200, height: 40 }, card, vp, "bottom");
    expect(p.placement).toBe("top");
    expect(p.top).toBe(740 - 220 - 14);
  });

  it("alvo gigante que não deixa espaço: centro", () => {
    expect(computeCardPosition({ top: 0, left: 0, width: 1200, height: 800 }, card, vp).placement).toBe("center");
  });

  it("celular: cartão estreito nunca passa da borda", () => {
    const phone = { width: 375, height: 700 };
    const c = { width: 340, height: 260 };
    const p = computeCardPosition({ top: 100, left: 20, width: 100, height: 40 }, c, phone);
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.left + c.width).toBeLessThanOrEqual(phone.width - 12);
    expect(p.top + c.height).toBeLessThanOrEqual(phone.height - 12);
  });

  it("cartão maior que a tela: não fica com posição negativa", () => {
    const p = computeCardPosition(null, { width: 500, height: 900 }, { width: 400, height: 600 });
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.top).toBeGreaterThanOrEqual(12);
  });

  it("destaque é um pouco maior que o elemento", () => {
    expect(spotlightRect({ top: 100, left: 50, width: 200, height: 40 }, 6)).toEqual({ top: 94, left: 44, width: 212, height: 52 });
  });
});

describe("achar o elemento visível", () => {
  const mk = (html: string) => {
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };
  const show = (el: Element, rect = { width: 100, height: 20 }) => {
    vi.spyOn(el, "getClientRects").mockReturnValue([{}] as any);
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ ...rect, top: 0, left: 0, right: rect.width, bottom: rect.height, x: 0, y: 0, toJSON() {} } as DOMRect);
  };

  it("sem seletor ou com seletor inválido: null, sem exceção", () => {
    expect(findVisibleTarget(undefined)).toBeNull();
    expect(findVisibleTarget("###[[")).toBeNull();
  });

  it("ignora elementos escondidos e pega o primeiro que aparece (menu duplicado do desktop/celular)", () => {
    const root = mk('<a class="x" id="hidden"></a><a class="x" id="shown"></a>');
    show(root.querySelector("#shown")!);
    expect(findVisibleTarget(".x", root)?.id).toBe("shown");
  });

  it("nada visível: null", () => {
    const root = mk('<a class="y"></a>');
    expect(findVisibleTarget(".y", root)).toBeNull();
  });

  it("elemento sem tamanho não conta", () => {
    const root = mk('<a class="z"></a>');
    show(root.querySelector(".z")!, { width: 0, height: 0 });
    expect(isElementVisible(root.querySelector(".z")!)).toBe(false);
  });
});

describe("lembrar o que já foi visto", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it("marca como visto por versão do tour", () => {
    const s = mem();
    expect(hasSeenTour(s, "novidades", 1)).toBe(false);
    markTourSeen(s, "novidades", 1, "done");
    expect(hasSeenTour(s, "novidades", 1)).toBe(true);
    expect(hasSeenTour(s, "novidades", 2)).toBe(false); // versão nova volta a ser oferecida
    expect(hasSeenTour(s, "outro", 1)).toBe(false);
  });

  it("'dispensado' também conta como visto", () => {
    const s = mem();
    markTourSeen(s, "novidades", 1, "skipped");
    expect(hasSeenTour(s, "novidades", 1)).toBe(true);
  });

  it("convite é controlado à parte do 'visto'", () => {
    const s = mem();
    markTourOffered(s, "novidades", 1);
    expect(wasTourOffered(s, "novidades", 1)).toBe(true);
    expect(hasSeenTour(s, "novidades", 1)).toBe(false);
  });

  it("armazenamento bloqueado ou ausente nunca lança erro", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(() => markTourSeen(broken, "n", 1, "done")).not.toThrow();
    expect(hasSeenTour(broken, "n", 1)).toBe(false);
    expect(hasSeenTour(null, "n", 1)).toBe(false);
    expect(() => markTourOffered(undefined, "n", 1)).not.toThrow();
  });

  it("parágrafos", () => {
    expect(paragraphs("a\n\n  b  \n\n\n\nc")).toEqual(["a", "b", "c"]);
  });
});

describe("conteúdo do tour Novidades", () => {
  const steps = NOVIDADES_TOUR.steps;

  it("ids únicos e textos preenchidos", () => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const s of steps) {
      expect(s.title.trim().length, s.id).toBeGreaterThan(0);
      expect(s.body.trim().length, s.id).toBeGreaterThan(20);
    }
  });

  it("começa na abertura, termina no fecho, ambos sem alvo (cartão central)", () => {
    expect(steps[0].id).toBe("boas-vindas");
    expect(steps[steps.length - 1].id).toBe("fim");
    expect(steps[0].target).toBeUndefined();
    expect(steps[steps.length - 1].target).toBeUndefined();
  });

  it("rotas existem no sistema e seletores são válidos", () => {
    const routes = ["/orcamentos", "/contratos", "/relatorios", "/webhooks", "/aprovacoes", "/dashboard"];
    for (const s of steps) {
      if (s.route) expect(routes, s.id).toContain(s.route);
      if (s.target) expect(() => document.querySelector(s.target!), s.id).not.toThrow();
    }
  });

  it("passos de administrador são só os de e-mail e aprovações", () => {
    expect(steps.filter((s) => s.adminOnly).map((s) => s.id)).toEqual(["integracao-email", "aprovacoes"]);
  });

  it("para o usuário comum, sem serviço ativado: nenhuma menção a função inexistente", () => {
    const list = visibleSteps(NOVIDADES_TOUR, { isAdmin: false, features: { service: false } });
    expect(list.some((s) => s.id === "servico")).toBe(false);
    const nova = list.find((s) => s.id === "nova-proposta")!;
    expect(nova.body).not.toMatch(/Servi[çc]o/);
  });

  it("administrador com tudo ativo vê o tour completo", () => {
    expect(visibleSteps(NOVIDADES_TOUR, { isAdmin: true, features: { service: true } })).toHaveLength(steps.length);
  });

  it("getTour encontra pelo id", () => {
    expect(getTour("novidades")).toBe(NOVIDADES_TOUR);
    expect(getTour("nao-existe")).toBeUndefined();
  });
});

describe("o tour aponta só para o que existe no sistema (evita o tour 'quebrar' sem ninguém notar)", () => {
  const root = join(process.cwd(), "src");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  // código das telas, sem os testes e sem o próprio conteúdo do tour (que cita os seletores)
  const files = walk(root).filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.test\.|tourContent\.ts$/.test(f));
  const code = files.map((f) => readFileSync(f, "utf-8")).join("\n");
  const sidebar = readFileSync(join(root, "components/layout/Sidebar.tsx"), "utf-8");
  const app = readFileSync(join(root, "App.tsx"), "utf-8");

  for (const s of NOVIDADES_TOUR.steps) {
    if (s.target) {
      it(`passo "${s.id}": alvo ${s.target}`, () => {
        const attr = s.target!.match(/^\[data-tour="([^"]+)"\]$/);
        const nav = s.target!.match(/^nav a\[href="([^"]+)"\]$/);
        if (attr) expect(code).toContain(`data-tour="${attr[1]}"`);
        else if (nav) expect(sidebar).toContain(`href: "${nav[1]}"`);
        else throw new Error(`formato de alvo não reconhecido: ${s.target}`);
      });
    }
    if (s.route) {
      it(`passo "${s.id}": a tela ${s.route} existe`, () => {
        expect(app).toContain(`path="${s.route}"`);
      });
    }
  }

  it("itens do menu só de administrador são marcados como adminOnly nos passos", () => {
    for (const s of NOVIDADES_TOUR.steps.filter((x) => x.route === "/aprovacoes" || x.route === "/webhooks")) {
      expect(s.adminOnly, s.id).toBe(true);
      expect(sidebar).toMatch(new RegExp(`href: "${s.route}"[^}]*adminOnly: true`));
    }
  });
});
