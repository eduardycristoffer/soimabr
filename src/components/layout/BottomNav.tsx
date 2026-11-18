import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_BAR_HREFS, isNavActive, useVisibleNavItems } from "./navItems";

interface Props {
  /** abre a gaveta "Mais" com todas as opções */
  onOpenMore: () => void;
  moreOpen?: boolean;
}

/**
 * Barra de baixo do celular, como nos aplicativos: os 4 atalhos principais + "Mais".
 * Alvos de toque de pelo menos 56 px e respeito à barra do sistema (área segura do iPhone).
 */
export function BottomNav({ onOpenMore, moreOpen = false }: Props) {
  const { pathname } = useLocation();
  const items = useVisibleNavItems();
  const bar = BOTTOM_BAR_HREFS.map((href) => items.find((i) => i.href === href)).filter(Boolean) as typeof items;
  // "Mais" fica em destaque quando a tela atual é uma das que só aparecem lá
  const onMoreScreen = !bar.some((i) => isNavActive(pathname, i.href)) && items.some((i) => isNavActive(pathname, i.href));

  const tab = "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-none transition-colors active:bg-muted/60 motion-reduce:transition-none";

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {bar.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <li key={item.href}>
              <NavLink to={item.href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-primary" : "text-muted-foreground")}>
                {active && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" />}
                <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                <span>{item.title}</span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            aria-label="Mais opções"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(tab, moreOpen || onMoreScreen ? "text-primary" : "text-muted-foreground")}
          >
            {(moreOpen || onMoreScreen) && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" />}
            <Menu className="h-[22px] w-[22px]" aria-hidden />
            <span>Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
