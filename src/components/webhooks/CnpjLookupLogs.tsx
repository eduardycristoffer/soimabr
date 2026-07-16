import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { formatCNPJ } from "@/lib/validators";

type StatusFilter = "all" | "success" | "warning" | "error";

export default function CnpjLookupLogs() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cnpj-lookup-logs", status, search],
    queryFn: async () => {
      let q = supabase
        .from("cnpj_lookup_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") q = q.eq("status", status);
      if (search) {
        const digits = search.replace(/\D/g, "");
        if (digits) q = q.ilike("cnpj", `%${digits}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const badgeVariant = (s: string) =>
    s === "success" ? "default" : s === "warning" ? "secondary" : "destructive";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Logs de Consulta CNPJ</CardTitle>
            <CardDescription>Últimas 200 consultas realizadas via BrasilAPI.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Filtrar por CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Duração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : logs?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
              ) : (
                logs?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.cnpj?.length === 14 ? formatCNPJ(l.cnpj) : l.cnpj}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(l.status) as any} className="capitalize">{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.http_status ?? "—"}</TableCell>
                    <TableCell className="text-xs">{l.situacao_cadastral ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={l.message ?? ""}>{l.message ?? "—"}</TableCell>
                    <TableCell className="text-xs">{l.user_email ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">{l.duration_ms ?? 0} ms</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
