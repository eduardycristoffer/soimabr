import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ClipboardList, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AuditLog } from "@/types";

const actionColors: Record<string, "default" | "secondary" | "destructive"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

export default function Auditoria() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Redirecionar se não for admin
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
        .limit(100);

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

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return <CheckCircle className="h-3 w-3" />;
    if (action.includes("DELETE")) return <AlertTriangle className="h-3 w-3" />;
    return <Info className="h-3 w-3" />;
  };

  const getActionVariant = (action: string) => {
    if (action.includes("CREATE")) return "default";
    if (action.includes("DELETE")) return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground">
          Histórico de todas as ações realizadas no sistema
        </p>
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
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum log encontrado</h3>
              <p className="text-muted-foreground">
                As atividades do sistema aparecerão aqui
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>{log.user_email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getActionVariant(log.action)} className="gap-1">
                        {getActionIcon(log.action)}
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.table_name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {log.record_id ? `ID: ${log.record_id.slice(0, 8)}...` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
