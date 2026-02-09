import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, ClipboardList, Info, AlertTriangle, CheckCircle, ChevronDown, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AuditLog } from "@/types";
import { Json } from "@/integrations/supabase/types";

const tableLabels: Record<string, string> = {
  clients: "Clientes",
  products: "Produtos",
  quotes: "Orçamentos",
  leads: "Leads",
  user_roles: "Permissões",
  profiles: "Perfis",
};

function formatJson(val: Json | null): string {
  if (!val) return "-";
  if (typeof val === "object") {
    // Filter out noisy fields
    const filtered = { ...val as Record<string, unknown> };
    delete filtered["created_at"];
    delete filtered["updated_at"];
    return JSON.stringify(filtered, null, 2);
  }
  return String(val);
}

function DiffView({ oldVal, newVal }: { oldVal: Json | null; newVal: Json | null }) {
  if (!oldVal && !newVal) return <p className="text-sm text-muted-foreground">Sem detalhes</p>;

  if (!oldVal && newVal) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Dados criados:</p>
        <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-60">{formatJson(newVal)}</pre>
      </div>
    );
  }

  if (oldVal && !newVal) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Dados removidos:</p>
        <pre className="rounded-md bg-destructive/10 p-3 text-xs overflow-auto max-h-60">{formatJson(oldVal)}</pre>
      </div>
    );
  }

  // Diff: show changed fields only
  const oldObj = (oldVal as Record<string, unknown>) || {};
  const newObj = (newVal as Record<string, unknown>) || {};
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  const skipFields = new Set(["created_at", "updated_at"]);

  for (const key of Object.keys(newObj)) {
    if (skipFields.has(key)) continue;
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({ field: key, from: oldObj[key], to: newObj[key] });
    }
  }

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma alteração significativa</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{changes.length} campo(s) alterado(s):</p>
      <div className="space-y-1">
        {changes.map((c) => (
          <div key={c.field} className="rounded-md bg-muted p-2 text-xs">
            <span className="font-semibold">{c.field}:</span>{" "}
            <span className="text-destructive line-through">{JSON.stringify(c.from)}</span>{" "}
            → <span className="text-primary">{JSON.stringify(c.to)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Auditoria() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", search, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (search) {
        query = query.or(`user_email.ilike.%${search}%,action.ilike.%${search}%,table_name.ilike.%${search}%`);
      }

      if (actionFilter !== "all") {
        query = query.ilike("action", `%${actionFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return <CheckCircle className="h-3 w-3" />;
    if (action.includes("DELETE")) return <AlertTriangle className="h-3 w-3" />;
    return <Info className="h-3 w-3" />;
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" => {
    if (action.includes("CREATE")) return "default";
    if (action.includes("DELETE")) return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground">Histórico de todas as ações realizadas no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, ação ou tabela..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="CREATE">Criação</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum log encontrado</h3>
              <p className="text-muted-foreground">As atividades do sistema aparecerão aqui</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <Collapsible key={log.id} asChild open={expandedId === log.id} onOpenChange={(open) => setExpandedId(open ? log.id : null)}>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === log.id ? "rotate-180" : ""}`} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(log.created_at)}</TableCell>
                          <TableCell className="text-sm">{log.user_email || "Sistema"}</TableCell>
                          <TableCell>
                            <Badge variant={getActionVariant(log.action)} className="gap-1">
                              {getActionIcon(log.action)}
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {tableLabels[log.table_name || ""] || log.table_name || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.record_id ? log.record_id.slice(0, 8) + "…" : "-"}
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={6} className="border-b bg-muted/30 px-6 py-4">
                            <DiffView oldVal={log.old_values} newVal={log.new_values} />
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
