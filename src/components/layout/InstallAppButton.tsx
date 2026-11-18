import { useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { cn } from "@/lib/utils";

/** "Instalar app": aparece só quando o aparelho pode instalar e o app ainda não está instalado. */
export function InstallAppButton({ collapsed = false }: { collapsed?: boolean }) {
  const { canInstall, isIos, install } = useInstallPrompt();
  const [iosHelp, setIosHelp] = useState(false);

  if (!canInstall && !isIos) return null;

  const onClick = () => (isIos ? setIosHelp(true) : install());

  const button = (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label="Instalar app"
      data-tour="instalar-app"
      className={cn("text-sidebar-foreground hover:bg-sidebar-accent w-full", collapsed ? "justify-center px-0" : "justify-start")}
    >
      <Download className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="ml-2">Instalar app</span>}
    </Button>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">Instalar app</TooltipContent>
        </Tooltip>
      ) : button}

      <Dialog open={iosHelp} onOpenChange={setIosHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar no iPhone ou iPad</DialogTitle>
            <DialogDescription>O Safari não tem o botão automático. Faça assim:</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><Share className="h-4 w-4" /></span>
              Toque em <strong>Compartilhar</strong> (o quadrado com a seta) na barra do Safari.
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><SquarePlus className="h-4 w-4" /></span>
              Escolha <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">3</span>
              Toque em <strong>Adicionar</strong>. O ícone do SOIMA aparece na sua tela.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">É preciso abrir pelo Safari; em outros navegadores do iPhone a opção não aparece.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
