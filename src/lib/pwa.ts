/**
 * Registro do service worker (PWA).
 *
 * - Só em produção (no desenvolvimento atrapalharia o recarregamento automático).
 * - Nunca dentro do editor/prévia do Lovable (iframe ou hosts de prévia): lá, um service
 *   worker deixaria a prévia presa em versões antigas.
 * - Versão nova NÃO recarrega a tela sozinha: avisa e espera o usuário clicar em "Atualizar".
 */

/** Hosts/contextos em que o service worker não deve ser registrado. */
export function shouldRegisterServiceWorker(env: { prod: boolean; inIframe: boolean; hostname: string }): boolean {
  if (!env.prod) return false;
  if (env.inIframe) return false;
  const h = env.hostname;
  if (/(^|\.)lovableproject\.com$/.test(h) || h.startsWith("id-preview--")) return false;
  return true;
}

export function registerServiceWorker(onUpdateAvailable: (applyUpdate: () => void) => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const allowed = shouldRegisterServiceWorker({
    prod: import.meta.env.PROD,
    inIframe: window.self !== window.top,
    hostname: window.location.hostname,
  });
  if (!allowed) return;

  window.addEventListener("load", async () => {
    try {
      // Na primeira visita não há "controlador": o primeiro controllerchange não deve recarregar a tela
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      const notify = (worker: ServiceWorker) => onUpdateAvailable(() => worker.postMessage("SKIP_WAITING"));

      if (reg.waiting && hadController) notify(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener("statechange", () => {
          if (incoming.state === "installed" && navigator.serviceWorker.controller) notify(incoming);
        });
      });

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloading) return;
        reloading = true;
        window.location.reload();
      });

      // Confere se há versão nova a cada 30 minutos enquanto o app está aberto
      window.setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
    } catch (err) {
      console.warn("Service worker não registrado:", err);
    }
  });
}
