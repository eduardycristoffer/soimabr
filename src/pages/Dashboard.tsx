import { useAuth } from "@/contexts/AuthContext";
import StatsCards from "@/components/dashboard/StatsCards";
import PipelineChart from "@/components/dashboard/PipelineChart";
import RecentQuotes from "@/components/dashboard/RecentQuotes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Users, FileText, Kanban } from "lucide-react";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.name}! {isAdmin && "(Admin)"}
        </p>
      </div>

      {/* Stats Grid */}
      <StatsCards />

      {/* Charts + Recent */}
      <div className="grid gap-4 md:grid-cols-2">
        <PipelineChart />
        <RecentQuotes />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Atalhos para as tarefas mais comuns</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate("/clientes")}>
            <Users className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
          <Button variant="outline" onClick={() => navigate("/pipeline")}>
            <Kanban className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
          <Button variant="outline" onClick={() => navigate("/orcamentos")}>
            <FileText className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
