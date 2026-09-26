import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  FileSignature,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FilterX,
  BarChart3,
} from "lucide-react";

type QuoteStatus = "draft" | "finalized" | "cancelled";

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const contractStatusLabel: Record<string, string> = {
  draft: "Contrato em rascunho",
  em_revisao: "Contrato em revisão",
  aprovado: "Contrato aprovado",
  sent: "Contrato enviado",
  signed: "Contrato assinado",
  cancelled: "Contrato cancelado",
};

interface QuoteRow {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  total: number;
  currency: string;
  created_at: string;
  created_by: string;
  clients: { razao_social: string | null; nome_fantasia: string | null } | null;
  contracts: { id: string; status: string }[];
}

export default function Relatorios() {
  const { user, isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: sellers } = useQuery({
    queryKey: ["report-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_directory")
        .select("user_id, name")
        .order("name");
      if (error) throw error;
      return data as { user_id: string; name: string }[];
    },
  });

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["report-quotes", isAdmin, user?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, status, total, currency, created_at, created_by, clients(razao_social, nome_fantasia), contracts(id, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as QuoteRow[];
    },
    enabled: !!user,
  });

  const sellerName = useMemo(() => {
    const map = new Map<string, string>();
    sellers?.forEach((s) => map.set(s.user_id, s.name));
    return map;
  }, [sellers]);

  const filtered = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (sellerFilter !== "all" && q.created_by !== sellerFilter) return false;
      if (startDate && q.created_at < `${startDate}T00:00:00`) return false;
      if (endDate && q.created_at > `${endDate}T23:59:59.999`) return false;
      return true;
    });
  }, [quotes, statusFilter, sellerFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const valorTotal = filtered
      .filter((q) => q.status !== "cancelled")
      .reduce((sum, q) => sum + (q.total || 0), 0);
    const finalizadas = filtered.filter((q) => q.status === "finalized").length;
    const canceladas = filtered.filter((q) => q.status === "cancelled").length;
    const comContrato = filtered.filter((q) => q.contracts.length > 0).length;
    const assinados = filtered.filter((q) =>
      q.contracts.some((c) => c.status === "signed")
    ).length;
    const conversao = total > 0 ? Math.round((assinados / total) * 100) : 0;
    return { total, valorTotal, finalizadas, canceladas, comContrato, assinados, conversao };
  }, [filtered]);

  const funnel = useMemo(() => {
    const steps = [
      { label: "Propostas criadas", count: stats.total },
      { label: "Propostas finalizadas", count: stats.finalizadas },
      { label: "Contrato gerado", count: stats.comContrato },
      { label: "Contrato assinado", count: stats.assinados },
    ];
    const max = Math.max(stats.total, 1);
    return steps.map((s) => ({ ...s, pct: Math.round((s.count / max) * 100) }));
  }, [stats]);

  const formatCurrency = (value: number, currency: string = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  const clearFilters = () => {
    setStatusFilter("all");
    setSellerFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters =
    statusFilter !== "all" || sellerFilter !== "all" || startDate !== "" || endDate !== "";

  const quoteContractStatus = (q: QuoteRow) => {
    if (q.contracts.length === 0) return null;
    if (q.contracts.some((c) => c.status === "signed")) return "signed";
    const active = q.contracts.find((c) => c.status !== "cancelled");
    return active?.status ?? "cancelled";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Acompanhe o total de propostas e o avanço do fluxo até o contrato.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="finalized">Finalizada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sellers?.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="w-full"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorTotal)} em valor (exceto canceladas)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finalizadas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.canceladas} cancelada{stats.canceladas === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com contrato</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.comContrato}</div>
            <p className="text-xs text-muted-foreground">
              {stats.assinados} assinado{stats.assinados === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversao}%</div>
            <p className="text-xs text-muted-foreground">
              propostas até contrato assinado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Avanço do fluxo até o contrato
          </CardTitle>
          <CardDescription>
            Da criação da proposta até a assinatura do contrato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {funnel.map((step) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="text-muted-foreground">
                  {step.count} ({step.pct}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${step.pct}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Propostas</CardTitle>
          <CardDescription>
            {filtered.length} proposta{filtered.length === 1 ? "" : "s"} no período/filtro
            selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma proposta encontrada com os filtros selecionados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((q) => {
                    const cStatus = quoteContractStatus(q);
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-sm">
                          {q.quote_number}
                        </TableCell>
                        <TableCell>
                          {q.clients?.nome_fantasia || q.clients?.razao_social || "-"}
                        </TableCell>
                        <TableCell>{sellerName.get(q.created_by) || "-"}</TableCell>
                        <TableCell>{formatDate(q.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[q.status]?.variant} className={`status-badge-${q.status}`}>
                            {statusConfig[q.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cStatus ? (
                            <Badge
                              variant={cStatus === "signed" ? "default" : "outline"}
                              className={`whitespace-nowrap status-badge-${cStatus}`}
                            >
                              {contractStatusLabel[cStatus] || cStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sem contrato
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(q.total, q.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
