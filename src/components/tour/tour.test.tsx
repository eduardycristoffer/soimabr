import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { TourProvider, useTour } from "./TourProvider";
import type { Tour, TourContext } from "@/lib/tour";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

const tour: Tour = {
  id: "t1", version: 1, title: "Tour de teste", description: "Descrição do tour",
  steps: [
    { id: "s1", title: "Abertura", body: "Texto de abertura." },
    { id: "s2", title: "Menu", body: "Texto do menu.", route: "/a", target: '[data-tour="alvo-a"]' },
    { id: "s3", title: "Só admin", body: "Texto admin.", route: "/b", target: '[data-tour="alvo-b"]', adminOnly: true },
    { id: "s4", title: "Alvo ausente", body: "Este alvo nunca aparece.", route: "/a", target: '[data-tour="nao-existe"]' },
    { id: "s5", title: "Fim", body: "Texto final.", tip: "Dica final." },
  ],
};

const user: TourContext = { isAdmin: false, features: { service: false } };
const admin: TourContext = { isAdmin: true, features: { service: false } };

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}
function Starter() {
  const { start, isActive } = useTour();
  return <button onClick={() => start("t1")}>iniciar{isActive ? "-ativo" : ""}</button>;
}
function Page({ route }: { route: string }) {
  const p = useLocation().pathname;
  return (
    <div>
      {p === "/a" && route === "/a" && <button data-tour="alvo-a">Alvo A</button>}
      {p === "/b" && <button data-tour="alvo-b">Alvo B</button>}
    </div>
  );
}

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
let store = mem();

function setup(ctx: TourContext = user, extra: Record<string, unknown> = {}, path = "/inicio") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <TourProvider ctx={ctx} tours={[tour]} {...(extra as any)}>
        <Starter />
        <Where />
        <Page route="/a" />
      </TourProvider>
    </MemoryRouter>,
  );
}
const where = () => screen.getByTestId("where").textContent;
const dialog = () => screen.queryByRole("dialog");

beforeEach(() => {
  toastMock.mockReset();
  store = mem();
  Object.defineProperty(window, "localStorage", { value: store, configurable: true });
  // jsdom não calcula layout: todo elemento "ocupa" 200×40 na posição (50, 100)
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as any);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    { top: 100, left: 50, width: 200, height: 40, right: 250, bottom: 140, x: 50, y: 100, toJSON() {} } as DOMRect,
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("abrir e navegar", () => {
  it("antes de iniciar não há nada na tela", () => {
    setup();
    expect(dialog()).toBeNull();
    expect(screen.getByText("iniciar")).toBeInTheDocument();
  });

  it("inicia no primeiro passo, com contagem de passos só do que vale para o usuário", async () => {
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Abertura");
    // 5 passos, 1 é só de administrador → 4
    expect(screen.getByText(/passo 1 de 4/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voltar/ })).toBeDisabled();
  });

  it("administrador vê todos os passos", async () => {
    setup(admin);
    fireEvent.click(screen.getByText("iniciar"));
    expect(await screen.findByText(/passo 1 de 5/)).toBeInTheDocument();
  });

  it("Próximo troca de tela quando o passo pede e destaca o elemento", async () => {
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    await waitFor(() => expect(where()).toBe("/a"));
    expect(await screen.findByText("Texto do menu.")).toBeInTheDocument();
    expect(document.querySelector("[data-tour-overlay] .ring-2")).not.toBeNull(); // destaque desenhado
  });

  it("setas do teclado avançam e voltam", async () => {
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByText("Texto de abertura.");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByText("Texto do menu.");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await screen.findByText("Texto de abertura.");
  });

  it("passo sem alvo na tela vira cartão central (sem destaque)", async () => {
    vi.useFakeTimers();
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    // s1 → s2 → s4 (s3 é só admin)
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    // s4 tenta achar o alvo por ~1,5 s e desiste
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.getByText("Este alvo nunca aparece.")).toBeInTheDocument();
    expect(document.querySelector("[data-tour-overlay] .ring-2")).toBeNull();
  });

  it("o último passo mostra a dica e o botão Concluir", async () => {
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    for (let i = 0; i < 3; i++) {
      fireEvent.keyDown(window, { key: "ArrowRight" });
      await waitFor(() => expect(screen.getByText(new RegExp(`passo ${i + 2} de 4`))).toBeInTheDocument());
    }
    expect(screen.getByText(/Dica final/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Concluir/ })).toBeInTheDocument();
  });
});

describe("fechar", () => {
  it("Concluir marca como visto e volta para a tela de onde começou", async () => {
    setup(user, {}, "/inicio");
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    for (let i = 0; i < 3; i++) {
      fireEvent.keyDown(window, { key: "ArrowRight" });
      await waitFor(() => expect(screen.getByText(new RegExp(`passo ${i + 2} de 4`))).toBeInTheDocument());
    }
    expect(where()).toBe("/a"); // o tour passou por outra tela
    fireEvent.click(screen.getByRole("button", { name: /Concluir/ }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(store.m.get("tour:t1:v1:done")).toBe("done");
    expect(where()).toBe("/inicio");
  });

  it("Pular tour e Esc marcam como dispensado e voltam à tela original", async () => {
    setup(user, {}, "/inicio");
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(where()).toBe("/a"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(store.m.get("tour:t1:v1:done")).toBe("skipped");
    expect(where()).toBe("/inicio");
  });

  it("botão X e 'Pular tour' fecham", async () => {
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Pular tour" }));
    await waitFor(() => expect(dialog()).toBeNull());
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Fechar o tour" }));
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it("o tour pode ser refeito depois de fechado", async () => {
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(dialog()).toBeNull());
    fireEvent.click(screen.getByText("iniciar"));
    expect(await screen.findByText(/passo 1 de 4/)).toBeInTheDocument();
  });

  it("devolve o foco ao botão que abriu o tour", async () => {
    setup(user);
    const btn = screen.getByText("iniciar");
    btn.focus();
    fireEvent.click(btn);
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(btn);
  });
});

describe("convite automático", () => {
  it("quem nunca viu recebe um aviso 'Ver tour' (uma vez)", async () => {
    vi.useFakeTimers();
    setup(user, { autoOfferTourId: "t1", autoOfferDelay: 100 });
    expect(toastMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0]).toMatchObject({ title: "Novidades no sistema", description: "Descrição do tour" });
    expect(store.m.get("tour:t1:v1:offered")).toBe("1");
  });

  it("não repete: já oferecido ou já visto não mostra de novo", async () => {
    vi.useFakeTimers();
    store.m.set("tour:t1:v1:offered", "1");
    setup(user, { autoOfferTourId: "t1", autoOfferDelay: 50 });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(toastMock).not.toHaveBeenCalled();
    cleanup();
    store.m.clear();
    store.m.set("tour:t1:v1:done", "done");
    setup(user, { autoOfferTourId: "t1", autoOfferDelay: 50 });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("sem autoOfferTourId não oferece nada", async () => {
    vi.useFakeTimers();
    setup(user, { autoOfferDelay: 50 });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("a ação 'Ver tour' do aviso abre o tour", async () => {
    vi.useFakeTimers();
    setup(user, { autoOfferTourId: "t1", autoOfferDelay: 10 });
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    const action = toastMock.mock.calls[0][0].action;
    expect(action.props.altText).toBe("Ver o tour guiado");
    await act(async () => { action.props.onClick(); });
    vi.useRealTimers();
    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Abertura");
  });

  it("armazenamento bloqueado não derruba a tela", async () => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); }, configurable: true });
    setup(user);
    fireEvent.click(screen.getByText("iniciar"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(dialog()).toBeNull());
  });
});

describe("fora do provedor", () => {
  it("useTour devolve um objeto inofensivo (o botão do menu não quebra em outras telas)", () => {
    function Lone() {
      const t = useTour();
      return <button onClick={() => t.start()}>solo{t.isActive ? "-ativo" : ""}</button>;
    }
    render(<Lone />);
    fireEvent.click(screen.getByText("solo"));
    expect(screen.getByText("solo")).toBeInTheDocument();
  });
});
