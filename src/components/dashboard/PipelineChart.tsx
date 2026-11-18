import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface PipelineStageCount {
  name: string;
  count: number;
  color: string;
}

/**
 * Leads por etapa do funil, em barras horizontais: o nome da etapa fica à esquerda e a barra ocupa o resto,
 * então funciona em qualquer largura (o gráfico de colunas com nomes inclinados não cabia no celular).
 */
export function PipelineChartView({ data }: { data?: PipelineStageCount[] }) {
  const max = Math.max(1, ...(data || []).map((d) => d.count));
  const empty = !data || data.every((d) => d.count === 0);
  const total = (data || []).reduce((s, d) => s + d.count, 0);

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Pipeline de vendas</CardTitle>
        <CardDescription>{empty ? "Leads por etapa do funil" : `${total} lead${total === 1 ? "" : "s"} por etapa do funil`}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-center text-sm text-muted-foreground">Adicione leads ao pipeline para ver o gráfico</p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Leads por etapa do funil">
            {data!.map((d) => (
              <li key={d.name} className="grid grid-cols-[minmax(72px,34%)_1fr_auto] items-center gap-2 text-sm sm:gap-3">
                <span className="truncate" title={d.name}>{d.name}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.count === 0 ? 0 : Math.max((d.count / max) * 100, 4)}%`, background: d.color || "hsl(var(--primary))" }}
                  />
                </div>
                <span className="min-w-[1.5rem] text-right font-medium tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function PipelineChart() {
  const { isAdmin, user } = useAuth();

  const { data: chartData } = useQuery({
    queryKey: ["pipeline-chart", isAdmin, user?.user_id],
    queryFn: async () => {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index");

      let leadsQuery = supabase.from("leads").select("stage_id");
      if (!isAdmin) leadsQuery = leadsQuery.eq("owner_id", user!.user_id);
      const { data: leads } = await leadsQuery;

      return (stages || []).map((stage) => ({
        name: stage.name,
        count: (leads || []).filter((l) => l.stage_id === stage.id).length,
        color: stage.color,
      }));
    },
    enabled: !!user,
  });

  return <PipelineChartView data={chartData} />;
}
