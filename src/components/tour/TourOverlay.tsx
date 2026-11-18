import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeCardPosition, paragraphs, spotlightRect, type Rect, type TourStep } from "@/lib/tour";

interface Props {
  step: TourStep;
  index: number;
  total: number;
  /** posição do elemento destacado na tela (null = cartão no centro) */
  target: Rect | null;
  tourTitle: string;
  onNext: () => void;
  onPrev: () => void;
  /** fechou sem terminar */
  onSkip: () => void;
}

const CARD_MAX = 380;
const EDGE = 12;

/** Escurece a tela, destaca o elemento e mostra o cartão do passo. Só visual; a lógica fica no TourProvider. */
export default function TourOverlay({ step, index, total, target, tourTitle, onNext, onPrev, onSkip }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [cardH, setCardH] = useState(0);

  useEffect(() => {
    const onResize = () => setVp({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cardW = Math.min(CARD_MAX, vp.width - EDGE * 2);

  // Mede o cartão (a altura muda com o texto) para posicionar sem cortar
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    setCardH(el.offsetHeight);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [step.id, cardW]);

  // Leva o foco para o cartão a cada passo (leitor de tela e teclado)
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [step.id]);

  const pos = computeCardPosition(target, { width: cardW, height: cardH || 240 }, vp, step.placement ?? "auto");
  const hole = target ? spotlightRect(target) : null;
  const last = index === total - 1;
  const titleId = `tour-title-${step.id}`;
  const bodyId = `tour-body-${step.id}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }} data-tour-overlay>
      {/* Bloqueia cliques no sistema enquanto o tour está aberto */}
      <div className="absolute inset-0" aria-hidden onClick={(e) => e.stopPropagation()} />

      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200 motion-reduce:transition-none"
          style={{
            top: hole.top, left: hole.left, width: hole.width, height: hole.height,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-slate-900/60" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="absolute rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl outline-none transition-[top,left] duration-200 motion-reduce:transition-none"
        style={{ top: pos.top, left: pos.left, width: cardW }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tourTitle} · passo {index + 1} de {total}
          </p>
          <Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-1 h-7 w-7 shrink-0" onClick={onSkip} aria-label="Fechar o tour">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        <h2 id={titleId} className="text-base font-semibold leading-snug">{step.title}</h2>
        <div id={bodyId} className="mt-1.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {paragraphs(step.body).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {step.tip && (
          <p className="mt-3 rounded-md bg-accent/60 px-3 py-2 text-xs leading-snug text-accent-foreground">💡 {step.tip}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onSkip}>
            Pular tour
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onPrev} disabled={index === 0}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
            </Button>
            <Button type="button" size="sm" onClick={onNext}>
              {last ? (<><Check className="mr-1 h-3.5 w-3.5" /> Concluir</>) : (<>Próximo <ArrowRight className="ml-1 h-3.5 w-3.5" /></>)}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
