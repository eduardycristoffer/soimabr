import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTour } from "./TourProvider";

interface Props {
  collapsed?: boolean;
  /** No celular o menu é uma gaveta: precisa fechar antes de o tour abrir. */
  onBeforeStart?: () => void;
}

/** "Tour guiado" no menu lateral — abre o tour das novidades quando o usuário quiser. */
export function TourButton({ collapsed = false, onBeforeStart }: Props) {
  const { start } = useTour();

  const onClick = () => {
    if (onBeforeStart) {
      onBeforeStart();
      window.setTimeout(() => start(), 400); // espera a gaveta terminar de fechar
    } else {
      start();
    }
  };

  const button = (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label="Tour guiado"
      data-tour="tour-button"
      className={cn("text-sidebar-foreground hover:bg-sidebar-accent w-full", collapsed ? "justify-center px-0" : "justify-start")}
    >
      <Compass className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="ml-2">Tour guiado</span>}
    </Button>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">Tour guiado</TooltipContent>
    </Tooltip>
  ) : button;
}
