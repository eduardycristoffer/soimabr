import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import {
  clampIndex, findVisibleTarget, hasSeenTour, isElementVisible, markTourOffered, markTourSeen, visibleSteps, wasTourOffered,
  type Rect, type Tour, type TourContext as TourCtx, type TourStep,
} from "@/lib/tour";
import { TOURS } from "@/lib/tourContent";
import TourOverlay from "./TourOverlay";

interface TourApi {
  /** Abre um tour pelo id (padrão: o primeiro). */
  start: (tourId?: string) => void;
  isActive: boolean;
}

const noop: TourApi = { start: () => {}, isActive: false };
const Ctx = createContext<TourApi>(noop);

/** Fora do provedor devolve um objeto inofensivo (a tela que usa o botão não quebra). */
export const useTour = () => useContext(Ctx);

interface Props {
  ctx: TourCtx;
  children: ReactNode;
  tours?: Tour[];
  /** Mostra uma vez um aviso "Ver tour" para quem ainda não viu. */
  autoOfferTourId?: string | null;
  /** Atraso do aviso, em ms. */
  autoOfferDelay?: number;
}

/** O que está desenhado na tela. Só troca quando o novo passo já achou seu elemento (sem piscar). */
interface View { step: TourStep; index: number; rect: Rect | null }

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

const rectOf = (el: HTMLElement | null): Rect | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const storage = (): Storage | null => {
  try { return window.localStorage; } catch { return null; }
};

export function TourProvider({ ctx, children, tours = TOURS, autoOfferTourId = null, autoOfferDelay = 2500 }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [tourId, setTourId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const returnPath = useRef<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  /** o passo acabou de mudar de tela: a página pode demorar para montar o elemento */
  const justNavigated = useRef(false);

  const tour = tourId ? tours.find((t) => t.id === tourId) ?? null : null;
  const steps = useMemo(() => (tour ? visibleSteps(tour, ctx) : []), [tour, ctx]);
  const safeIndex = clampIndex(index, steps.length);
  const step: TourStep | undefined = tour ? steps[safeIndex] : undefined;

  // ── abrir / fechar ───────────────────────────────────────────────────────
  const start = useCallback((id?: string) => {
    const t = tours.find((x) => x.id === id) ?? tours[0];
    if (!t) return;
    returnPath.current = pathRef.current;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    targetRef.current = null;
    setIndex(0);
    setView(null);
    setTourId(t.id);
  }, [tours]);

  const close = useCallback((how: "done" | "skipped") => {
    if (tour) markTourSeen(storage(), tour.id, tour.version, how);
    setTourId(null);
    setView(null);
    targetRef.current = null;
    // volta para a tela onde o usuário estava e devolve o foco
    const back = returnPath.current;
    returnPath.current = null;
    if (back && back !== pathRef.current) navigate(back);
    returnFocus.current?.focus?.({ preventScroll: true });
  }, [tour, navigate]);

  const next = useCallback(() => {
    if (safeIndex >= steps.length - 1) close("done");
    else setIndex(safeIndex + 1);
  }, [safeIndex, steps.length, close]);

  const prev = useCallback(() => {
    if (safeIndex > 0) setIndex(safeIndex - 1);
  }, [safeIndex]);

  // ── teclado ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close("skipped"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, next, prev, close]);

  // ── ir para a tela do passo e achar o elemento destacado ─────────────────
  useEffect(() => {
    if (!step) return;
    if (step.route && pathname !== step.route) {
      justNavigated.current = true;
      navigate(step.route);
      return; // este efeito roda de novo quando a rota mudar
    }
    // Acabou de entrar na tela: dá até ~1,5 s para ela montar (dados carregando).
    // Já estava nela: o elemento existe ou não — confere por ~0,3 s e segue (ex.: menu escondido no celular).
    const maxTries = justNavigated.current ? 15 : 3;
    justNavigated.current = false;

    const show = (el: HTMLElement | null) => {
      targetRef.current = el;
      setView({ step, index: safeIndex, rect: rectOf(el) });
    };
    if (!step.target) { show(null); return; }

    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      const el = findVisibleTarget(step.target);
      if (el || tries++ >= maxTries) {
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight) {
            const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
          }
        }
        show(el);
        return;
      }
      timer = setTimeout(tick, 100); // a tela pode estar carregando
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pathname]);

  // ── acompanhar o elemento do passo exibido (rolagem, redimensionar, animação do menu) ──
  const shownStep = view?.step;
  useEffect(() => {
    if (!shownStep) return;
    const measure = () => {
      let el = targetRef.current;
      if (shownStep.target && (!el || !el.isConnected || !isElementVisible(el))) {
        el = findVisibleTarget(shownStep.target);
        targetRef.current = el;
      }
      const r = rectOf(el);
      setView((v) => (v && v.step === shownStep && !sameRect(v.rect, r) ? { ...v, rect: r } : v));
    };
    const id = window.setInterval(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [shownStep]);

  // ── convite único: "Ver tour" ────────────────────────────────────────────
  const offered = useRef(false);
  useEffect(() => {
    if (!autoOfferTourId || offered.current) return;
    const t = tours.find((x) => x.id === autoOfferTourId);
    if (!t) return;
    const s = storage();
    if (hasSeenTour(s, t.id, t.version) || wasTourOffered(s, t.id, t.version)) return;
    const timer = setTimeout(() => {
      if (offered.current) return;
      offered.current = true;
      markTourOffered(s, t.id, t.version);
      toast({
        title: "Novidades no sistema",
        description: t.description,
        duration: 20_000,
        action: createElement(ToastAction, { altText: "Ver o tour guiado", onClick: () => start(t.id) }, "Ver tour") as unknown as ToastActionElement,
      });
    }, autoOfferDelay);
    return () => clearTimeout(timer);
  }, [autoOfferTourId, tours, start, autoOfferDelay]);

  const api = useMemo<TourApi>(() => ({ start, isActive: !!tour }), [start, tour]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {tour && view && (
        <TourOverlay
          step={view.step}
          index={view.index}
          total={steps.length}
          target={view.rect}
          tourTitle={tour.title}
          onNext={next}
          onPrev={prev}
          onSkip={() => close("skipped")}
        />
      )}
    </Ctx.Provider>
  );
}
