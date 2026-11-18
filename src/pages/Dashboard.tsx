import { useAuth } from "@/contexts/AuthContext";
import StatsCards from "@/components/dashboard/StatsCards";
import PipelineChart from "@/components/dashboard/PipelineChart";
import RecentQuotes from "@/components/dashboard/RecentQuotes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, FileText, Kanban } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardViewProps {
  name?: string | null;
  isAdmin?: boolean;
  onNavigate: (path: string) => void;
  /** troca os blocos que buscam dados (nos testes e na pré-visualização) */
  slots?: { stats?: ReactNode; pipeline?: ReactNode; recent?: ReactNode };
}

/** Painel inicial. Separado da busca de dados para poder ser testado e conferido em qualquer largura. */
export function DashboardView({ name, isAdmin, onNavigate, slots }: DashboardViewProps) {
  const navigate = onNavigate;
  const user = { name };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="truncate text-sm text-muted-foreground sm:text-base">
          Bem-vindo, {user?.name}! {isAdmin && "(Admin)"}
        </p>
      </div>

      {/* Stats Grid */}
      {slots?.stats ?? <StatsCards />}

      {/* Charts + Recent */}
      <div className="grid gap-4 xl:grid-cols-2">
        {slots?.pipeline ?? <PipelineChart />}
        {slots?.recent ?? <RecentQuotes />}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Ações rápidas</CardTitle>
          <CardDescription>Atalhos para as tarefas mais comuns</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <Button variant="outline" className="h-11 justify-start" onClick={() => navigate("/clientes")}>
            <Users className="mr-2 h-4 w-4" />
            Novo cliente
          </Button>
          <Button variant="outline" className="h-11 justify-start" onClick={() => navigate("/pipeline")}>
            <Kanban className="mr-2 h-4 w-4" />
            Novo lead
          </Button>
          <Button variant="outline" className="h-11 justify-start" onClick={() => navigate("/orcamentos")}>
            <FileText className="mr-2 h-4 w-4" />
            Nova proposta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  return <DashboardView name={user?.name} isAdmin={isAdmin} onNavigate={(path) => navigate(path)} />;
}
