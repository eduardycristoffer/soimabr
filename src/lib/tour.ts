/**
 * Tour guiado — parte "pura" (sem React): passos, quais aparecem, onde posicionar o cartão,
 * como achar o elemento destacado e como lembrar que o usuário já viu.
 * A tela (overlay) fica em src/components/tour; o conteúdo dos passos, em src/lib/tourContent.ts.
 */

export type Placement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  title: string;
  /** Texto do passo. Linha em branco separa parágrafos. */
  body: string;
  /** Vai para esta tela antes de mostrar o passo. */
  route?: string;
  /** Seletor CSS do que será destacado (usa o primeiro elemento VISÍVEL). Sem ele, o cartão fica no centro. */
  target?: string;
  placement?: Placement | "auto";
  /** Só para administradores. */
  adminOnly?: boolean;
  /** Só quando a função já está ativa no sistema. */
  feature?: "service";
  /** Dica curta mostrada em destaque abaixo do texto. */
  tip?: string;
}

export interface Tour {
  id: string;
  /** Aumente quando o conteúdo mudar o bastante para valer mostrar de novo. */
  version: number;
  title: string;
  description: string;
  steps: TourStep[];
}

export interface TourContext {
  isAdmin: boolean;
  features: { service: boolean };
}

/** Passos que valem para este usuário e para o estado atual do sistema. */
export function visibleSteps(tour: Tour, ctx: TourContext): TourStep[] {
  return tour.steps.filter((s) => {
    if (s.adminOnly && !ctx.isAdmin) return false;
    if (s.feature && !ctx.features[s.feature]) return false;
    return true;
  });
}

export const clampIndex = (i: number, length: number) => (length <= 0 ? 0 : Math.max(0, Math.min(i, length - 1)));

// ───────────────────────── posição do cartão ─────────────────────────

export interface Rect { top: number; left: number; width: number; height: number }
export interface Size { width: number; height: number }

export interface CardPosition { top: number; left: number; placement: Placement }

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));

/** Retângulo do destaque (um pouco maior que o elemento). */
export function spotlightRect(target: Rect, pad = 6): Rect {
  return { top: target.top - pad, left: target.left - pad, width: target.width + pad * 2, height: target.height + pad * 2 };
}

/**
 * Onde colocar o cartão. Sem destino (ou "center"), vai para o meio da tela.
 * Em "auto" escolhe, nesta ordem, o primeiro lado onde o cartão cabe inteiro: direita, embaixo, em cima, esquerda;
 * se nenhum couber (destino muito grande, tela pequena), vai para o meio.
 */
export function computeCardPosition(
  target: Rect | null,
  card: Size,
  viewport: Size,
  placement: Placement | "auto" = "auto",
  gap = 14,
  margin = 12,
): CardPosition {
  const center: CardPosition = {
    top: Math.max(margin, (viewport.height - card.height) / 2),
    left: Math.max(margin, (viewport.width - card.width) / 2),
    placement: "center",
  };
  if (!target || placement === "center") return center;

  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  const fits = (p: CardPosition) =>
    p.left >= margin && p.top >= margin && p.left + card.width <= viewport.width - margin && p.top + card.height <= viewport.height - margin;

  const candidates: Record<Exclude<Placement, "center">, CardPosition> = {
    right: { top: clamp(cy - card.height / 2, margin, viewport.height - card.height - margin), left: target.left + target.width + gap, placement: "right" },
    bottom: { top: target.top + target.height + gap, left: clamp(cx - card.width / 2, margin, viewport.width - card.width - margin), placement: "bottom" },
    top: { top: target.top - card.height - gap, left: clamp(cx - card.width / 2, margin, viewport.width - card.width - margin), placement: "top" },
    left: { top: clamp(cy - card.height / 2, margin, viewport.height - card.height - margin), left: target.left - card.width - gap, placement: "left" },
  };

  const order: Array<Exclude<Placement, "center">> =
    placement === "auto" ? ["right", "bottom", "top", "left"] : [placement, "bottom", "top", "right", "left"];
  for (const p of order) if (fits(candidates[p])) return candidates[p];
  return center;
}

// ───────────────────────── achar o elemento ─────────────────────────

/** Elemento que ocupa espaço na tela (não escondido por menu fechado, aba inativa etc.). */
export function isElementVisible(el: Element): boolean {
  if (el.getClientRects().length === 0) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const style = typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
  return !style || (style.visibility !== "hidden" && style.display !== "none");
}

/**
 * Primeiro elemento VISÍVEL que combina com o seletor. O menu lateral existe duas vezes na página
 * (versão do computador e do celular); só a que aparece conta.
 */
export function findVisibleTarget(selector: string | undefined, root: ParentNode = document): HTMLElement | null {
  if (!selector) return null;
  let list: Element[] = [];
  try {
    list = Array.from(root.querySelectorAll(selector));
  } catch {
    return null; // seletor inválido nunca pode derrubar a tela
  }
  return (list.find(isElementVisible) as HTMLElement | undefined) ?? null;
}

// ───────────────────────── lembrar o que já foi visto ─────────────────────────

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const key = (tourId: string, version: number, kind: "done" | "offered") => `tour:${tourId}:v${version}:${kind}`;

function safeGet(storage: StorageLike | null | undefined, k: string): string | null {
  try {
    return storage?.getItem(k) ?? null;
  } catch {
    return null; // navegação privada / dados bloqueados
  }
}

function safeSet(storage: StorageLike | null | undefined, k: string, v: string) {
  try {
    storage?.setItem(k, v);
  } catch {
    /* sem armazenamento: o tour só será oferecido de novo, sem prejuízo */
  }
}

/** O usuário já terminou ou dispensou esta versão do tour. */
export const hasSeenTour = (s: StorageLike | null | undefined, tourId: string, version: number) =>
  safeGet(s, key(tourId, version, "done")) !== null;

export const markTourSeen = (s: StorageLike | null | undefined, tourId: string, version: number, how: "done" | "skipped") =>
  safeSet(s, key(tourId, version, "done"), how);

/** O convite ("Ver tour") já foi mostrado — evita repetir a cada login. */
export const wasTourOffered = (s: StorageLike | null | undefined, tourId: string, version: number) =>
  safeGet(s, key(tourId, version, "offered")) !== null;

export const markTourOffered = (s: StorageLike | null | undefined, tourId: string, version: number) =>
  safeSet(s, key(tourId, version, "offered"), "1");

/** Texto → parágrafos (linha em branco separa). */
export const paragraphs = (text: string): string[] =>
  text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
