import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceProposalEnabled } from "@/hooks/useServiceProposalEnabled";
import { TourProvider } from "./TourProvider";
import { NOVIDADES_TOUR } from "@/lib/tourContent";

/**
 * Liga o tour ao sistema: quem é o usuário (administrador ou não) e quais funções já estão ativas.
 * Fica dentro do layout das telas logadas, então nada aparece na tela de login.
 */
export function AppTourProvider({ children }: { children: ReactNode }) {
  const { isAdmin, user } = useAuth();
  const serviceEnabled = useServiceProposalEnabled();
  const ctx = useMemo(() => ({ isAdmin: !!isAdmin, features: { service: serviceEnabled } }), [isAdmin, serviceEnabled]);

  return (
    <TourProvider ctx={ctx} autoOfferTourId={user ? NOVIDADES_TOUR.id : null}>
      {children}
    </TourProvider>
  );
}
