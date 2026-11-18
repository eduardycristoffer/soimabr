import { createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from "@/hooks/use-toast";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import { registerServiceWorker } from "@/lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

// PWA: instalação e funcionamento sem recarregar a tela à força
registerServiceWorker((applyUpdate) => {
  toast({
    title: "Nova versão disponível",
    description: "Atualize quando terminar o que está fazendo.",
    duration: 600_000,
    action: createElement(
      ToastAction,
      { altText: "Atualizar agora", onClick: applyUpdate },
      "Atualizar",
    ) as unknown as ToastActionElement,
  });
});
