import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { InstallAppButton } from "@/components/layout/InstallAppButton";
import { TourButton } from "@/components/tour/TourButton";
import { isNavActive, useVisibleNavItems } from "./navItems";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initials = (name?: string | null) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

/** Gaveta que sobe de baixo (celular): todas as telas do sistema, o perfil, o tour, instalar o app e sair. */
export function MoreSheet({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = useVisibleNavItems();
  const main = items.filter((i) => !i.adminOnly);
  const admin = items.filter((i) => i.adminOnly);
  const close = () => onOpenChange(false);

  const go = (href: string) => {
    navigate(href);
    close();
  };

  const tile = (item: (typeof items)[number]) => {
    const active = isNavActive(pathname, item.href);
    return (
      <li key={item.href}>
        <button
          type="button"
          onClick={() => go(item.href)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-[84px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 text-center text-xs font-medium leading-tight transition-colors active:scale-[0.97] motion-reduce:transition-none",
            active ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent",
          )}
        >
          <item.icon className="h-6 w-6" aria-hidden />
          <span className="line-clamp-2">{item.title}</span>
        </button>
      </li>
    );
  };

  return (
    // Gaveta que sobe de baixo e fecha arrastando para baixo (ou tocando fora)
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[88dvh] rounded-t-3xl border-0 bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
        <DrawerTitle className="sr-only">Menu</DrawerTitle>
        <DrawerDescription className="sr-only">Todas as telas do sistema</DrawerDescription>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-3">
          {user && (
            <button
              type="button"
              onClick={() => go("/perfil")}
              className="flex w-full items-center gap-3 rounded-2xl bg-sidebar-accent/50 p-3 text-left transition-colors hover:bg-sidebar-accent"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden>
                {initials(user.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-sidebar-foreground">{user.name}</span>
                <span className="block truncate text-xs text-sidebar-foreground/60">{user.email}</span>
              </span>
              <span className="ml-auto shrink-0 text-xs text-primary">Meu perfil</span>
            </button>
          )}

          <section aria-label="Telas">
            <ul className="grid grid-cols-3 gap-2.5">{main.map(tile)}</ul>
          </section>

          {admin.length > 0 && (
            <section aria-label="Administração">
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">Administração</h2>
              <ul className="grid grid-cols-3 gap-2.5">{admin.map(tile)}</ul>
            </section>
          )}
        </div>

        {/* Rodapé fixo: sempre à vista, sem precisar rolar a lista */}
        <div className="grid shrink-0 grid-cols-2 gap-1 border-t px-3 py-2">
          <TourButton onBeforeStart={close} />
          <Button variant="ghost" onClick={() => { close(); void signOut(); }} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-5 w-5" />
            <span className="ml-2">Sair</span>
          </Button>
          <div className="col-span-2 empty:hidden"><InstallAppButton /></div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
