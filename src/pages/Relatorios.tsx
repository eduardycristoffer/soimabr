import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/quoteMoney";
import { QuoteAmount } from "@/components/quotes/QuoteAmount";
import { ColumnChart, HBarList, StatTile } from "@/components/reports/charts";
import {
  QUOTE_TYPE_LABEL,
  avgDaysToSign,
  byType,
  bySeller,
  computeStats,
  contractRows,
  downloadCsv,
  filterQuotes,
  lastMonthKeys,
  monthLabel,
  presetRange,
  quotesByMonth,
  signedByMonth,
  toCsv,
  todayBR,
  type PeriodPreset,
  type ReportFilters,
  type ReportQuote,
} from "@/lib/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown, ArrowUp, BarChart3, Download, FileSignature, FileText, FilterX, Minus, Percent, Receipt, Wallet,
} from "lucide-react";

const QUOTE_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const CONTRACT_STATUS: Record<string, string> = {
  draft: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  sent: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

const DEFAULT_FILTERS: ReportFilters = { status: "all", seller: "all", type: "all", start: "", end: "" };
const PAGE = 25;

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
const brl = (n: number) => formatMoney(n, "BRL");
const brlCompact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(n);
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);
const numPt = (n: number) => n.toFixed(2).replace(".", ",");

export default function Relatorios() {
  const { user, isAdmin } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [preset, setPreset] = useState<PeriodPreset | "custom">("all");
  const [tab, setTab] = useState("geral");
  const [quotesShown, setQuotesShown] = useState(PAGE);
  const [contractsShown, setContractsShown] = useState(PAGE);

  const { data: sellers } = useQuery({
    queryKey: ["report-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles_directory").select("user_id, name").order("name");
      if (error) throw error;
      return data as { user_id: string; name: string }[];
    },
  });

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["report-quotes", isAdmin, user?.user_id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          "id, quote_number, status, quote_type, total, currency, usd_brl_rate_used, created_at, created_by, clients(razao_social, nome_fantasia), contracts(id, contract_number, status, signed_at, sent_at, created_at)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReportQuote[];
    },
  });

  const names = useMemo(() => new Map((sellers || []).map((s) => [s.user_id, s.name])), [sellers]);
  const all = quotes || [];

  // Números do período/filtros escolhidos
  const filtered = useMemo(() => filterQuotes(all, filters), [all, filters]);
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  // Séries mensais: janela fixa de 12 meses; respeitam vendedor e tipo, mas não o período
  const months = useMemo(() => lastMonthKeys(12), []);
  const seriesBase = useMemo(
    () => filterQuotes(all, { ...filters, status: "all", start: "", end: "" }),
    [all, filters.seller, filters.type], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const signedSeries = useMemo(() => signedByMonth(seriesBase, months), [seriesBase, months]);
  const valueSeries = useMemo(() => quotesByMonth(seriesBase, months), [seriesBase, months]);

  const currentSigned = signedSeries[signedSeries.length - 1]?.count ?? 0;
  const previousSigned = signedSeries[signedSeries.length - 2]?.count ?? 0;
  const delta = currentSigned - previousSigned;

  const typeGroups = useMemo(() => byType(filtered), [filtered]);
  const sellerGroups = useMemo(() => bySeller(filtered, names), [filtered, names]);
  const contracts = useMemo(() => contractRows(filtered), [filtered]);
  const contractCount = (s: string) => contracts.filter((c) => c.status === s).length;

  const sellerLabel = (id: string) => names.get(id) || "—";
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const applyPreset = (p: PeriodPreset | "custom") => {
    setPreset(p);
    if (p !== "custom") setFilters((f) => ({ ...f, ...presetRange(p) }));
    setQuotesShown(PAGE);
    setContractsShown(PAGE);
  };
  const setFilter = (patch: Partial<ReportFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setQuotesShown(PAGE);
    setContractsShown(PAGE);
  };
  const clearAll = () => { setFilters(DEFAULT_FILTERS); setPreset("all"); setQuotesShown(PAGE); setContractsShown(PAGE); };

  const exportCsv = () => {
    const stamp = todayBR();
    if (tab === "contratos") {
      downloadCsv(`relatorio-contratos-${stamp}.csv`, toCsv(
        ["Contrato", "Proposta", "Cliente", "Status", "Enviado em", "Assinado em", "Dias até assinar"],
        contracts.map((c) => [c.contract_number, c.quote_number, c.client, CONTRACT_STATUS[c.status] || c.status, fmtDate(c.sent_at), fmtDate(c.signed_at), c.daysToSign]),
      ));
    } else if (tab === "vendedores") {
      downloadCsv(`relatorio-vendedores-${stamp}.csv`, toCsv(
        ["Vendedor", "Propostas", "Finalizadas", "Contratos assinados", "Valor (R$)", "Conversão"],
        sellerGroups.map((g) => [g.label, g.propostas, g.finalizadas, g.assinados, numPt(g.valorBRL), pct(g.conversao)]),
      ));
    } else {
      downloadCsv(`relatorio-propostas-${stamp}.csv`, toCsv(
        ["Número", "Cliente", "Tipo", "Vendedor", "Valor (R$)", "Status", "Contrato", "Criada em"],
        filtered.map((q) => [
          q.quote_number,
          q.clients?.nome_fantasia || q.clients?.razao_social || "",
          QUOTE_TYPE_LABEL[q.quote_type || "venda"] || q.quote_type,
          sellerLabel(q.created_by),
          numPt(Number(q.total) || 0),
          QUOTE_STATUS[q.status]?.label || q.status,
          q.contracts.some((c) => c.status === "signed") ? "Assinado" : q.contracts.length ? "Em andamento" : "",
          fmtDate(q.created_at),
        ]),
      ));
    }
  };

  const funnelItems = [
    { label: "Propostas criadas", value: stats.total },
    { label: "Propostas finalizadas", value: stats.finalizadas },
    { label: "Contrato gerado", value: stats.comContrato },
    { label: "Contrato assinado", value: stats.assinados },
  ].map((s) => ({ ...s, hint: stats.total ? `${Math.round((s.value / stats.total) * 100)}%` : undefined }));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7" /> Relatórios
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Propostas, contratos e vendedores da empresa" : "Suas propostas e contratos"}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={isLoading}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros: uma única linha acima de tudo que ela controla */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={preset} onValueChange={(v) => applyPreset(v as PeriodPreset | "custom")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tudo</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={filters.start} onChange={(e) => { setPreset("custom"); setFilter({ start: e.target.value }); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={filters.end} onChange={(e) => { setPreset("custom"); setFilter({ end: e.target.value }); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filters.type} onValueChange={(v) => setFilter({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status da proposta</Label>
              <Select value={filters.status} onValueChange={(v) => setFilter({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="finalized">Finalizada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="space-y-1">
                <Label className="text-xs">Vendedor</Label>
                <Select value={filters.seller} onValueChange={(v) => setFilter({ seller: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {sellers?.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearAll}><FilterX className="h-4 w-4 mr-1" /> Limpar filtros</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList data-tour="relatorios-abas">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          {isAdmin && <TabsTrigger value="vendedores">Vendedores</TabsTrigger>}
        </TabsList>

        {/* ───────── Visão geral ───────── */}
        <TabsContent value="geral" className="space-y-6">
          {/* Estrela-guia */}
          <Card>
            <CardContent className="p-6 flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">
                  Contratos assinados em {monthLabel(months[months.length - 1])}
                </p>
                <p className="text-5xl font-semibold tracking-tight">{isLoading ? "…" : currentSigned}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {delta > 0 ? <ArrowUp className="h-4 w-4" /> : delta < 0 ? <ArrowDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                <span>
                  {delta === 0 ? "Igual a" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} em relação a`}{" "}
                  {monthLabel(months[months.length - 2])} ({previousSigned})
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Propostas" value={stats.total} icon={<FileText className="h-4 w-4" />}
              hint={`${stats.finalizadas} finalizadas · ${stats.canceladas} canceladas`} />
            <StatTile label="Valor em propostas" value={brl(stats.valorBRL)} icon={<Wallet className="h-4 w-4" />}
              hint={stats.outraMoeda > 0 ? `Exclui ${stats.outraMoeda} em outra moeda e as canceladas` : "Exclui as canceladas"} />
            <StatTile label="Ticket médio" value={stats.ticketMedio === null ? "—" : brl(stats.ticketMedio)} icon={<Receipt className="h-4 w-4" />}
              hint={`Sobre ${stats.qtdNaSoma} proposta${stats.qtdNaSoma === 1 ? "" : "s"}`} />
            <StatTile label="Conversão" value={pct(stats.conversao)} icon={<Percent className="h-4 w-4" />}
              hint={`${stats.assinados} assinada${stats.assinados === 1 ? "" : "s"} de ${stats.finalizadas} finalizada${stats.finalizadas === 1 ? "" : "s"}`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ColumnChart
              title="Contratos assinados por mês"
              description="Últimos 12 meses, pela data da assinatura"
              data={signedSeries.map((m) => ({ label: m.label, value: m.count }))}
              format={(n) => String(n)}
              valueHeader="Contratos assinados"
              integer
            />
            <ColumnChart
              title="Valor das propostas criadas por mês"
              description="Últimos 12 meses, em R$ (sem canceladas)"
              data={valueSeries.map((m) => ({ label: m.label, value: m.value }))}
              format={brlCompact}
              valueHeader="Valor em R$"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <HBarList title="Funil" description="Do período e filtros escolhidos" items={funnelItems} ordinal />
            <HBarList
              title="Por tipo de proposta"
              description="Valor em R$ no período"
              items={typeGroups.map((g) => ({ label: g.label, value: g.valorBRL, display: brlCompact(g.valorBRL), hint: `${g.propostas} propostas` }))}
            />
          </div>
        </TabsContent>

        {/* ───────── Propostas ───────── */}
        <TabsContent value="propostas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Propostas</CardTitle>
              <CardDescription>{filtered.length} no período e filtros escolhidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      {isAdmin && <TableHead>Vendedor</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, quotesShown).map((q) => {
                      const signed = q.contracts.some((c) => c.status === "signed");
                      return (
                        <TableRow key={q.id}>
                          <TableCell className="font-mono font-medium">{q.quote_number}</TableCell>
                          <TableCell>{q.clients?.nome_fantasia || q.clients?.razao_social || "—"}</TableCell>
                          <TableCell>{QUOTE_TYPE_LABEL[q.quote_type || "venda"] || q.quote_type}</TableCell>
                          {isAdmin && <TableCell>{sellerLabel(q.created_by)}</TableCell>}
                          <TableCell><Badge variant={QUOTE_STATUS[q.status]?.variant}>{QUOTE_STATUS[q.status]?.label}</Badge></TableCell>
                          <TableCell>
                            {signed ? <Badge variant="outline">Assinado</Badge> : q.contracts.length ? <Badge variant="outline">Em andamento</Badge> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>{fmtDate(q.created_at)}</TableCell>
                          <TableCell className="text-right font-medium"><QuoteAmount value={q.total} quote={q} /></TableCell>
                        </TableRow>
                      );
                    })}
                    {!isLoading && filtered.length === 0 && (
                      <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">Nenhuma proposta neste filtro.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filtered.length > quotesShown && (
                <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                  <span>Mostrando {quotesShown} de {filtered.length}</span>
                  <Button variant="outline" size="sm" onClick={() => setQuotesShown((n) => n + PAGE)}>Mostrar mais</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── Contratos ───────── */}
        <TabsContent value="contratos" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Assinados" value={contractCount("signed")} icon={<FileSignature className="h-4 w-4" />} hint="Das propostas do período" />
            <StatTile label="Aguardando assinatura" value={contractCount("sent")} hint="Enviados e ainda não assinados" />
            <StatTile label="Em preparo" value={contractCount("draft") + contractCount("em_revisao") + contractCount("aprovado")} hint="Rascunho, revisão ou aprovado" />
            <StatTile label="Tempo até assinar" value={avgDaysToSign(contracts) === null ? "—" : `${String(avgDaysToSign(contracts)).replace(".", ",")} dias`} hint="Do envio à assinatura (média)" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratos</CardTitle>
              <CardDescription>{contracts.length} contrato{contracts.length === 1 ? "" : "s"} das propostas do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Proposta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Assinado em</TableHead>
                      <TableHead className="text-right">Dias até assinar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.slice(0, contractsShown).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-medium">{c.contract_number}</TableCell>
                        <TableCell className="font-mono">{c.quote_number}</TableCell>
                        <TableCell>{c.client}</TableCell>
                        <TableCell><Badge variant={c.status === "signed" ? "default" : "outline"}>{CONTRACT_STATUS[c.status] || c.status}</Badge></TableCell>
                        <TableCell>{fmtDate(c.sent_at)}</TableCell>
                        <TableCell>{fmtDate(c.signed_at)}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.daysToSign === null ? "—" : String(c.daysToSign).replace(".", ",")}</TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && contracts.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum contrato neste filtro.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {contracts.length > contractsShown && (
                <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                  <span>Mostrando {contractsShown} de {contracts.length}</span>
                  <Button variant="outline" size="sm" onClick={() => setContractsShown((n) => n + PAGE)}>Mostrar mais</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── Vendedores (admin) ───────── */}
        {isAdmin && (
          <TabsContent value="vendedores">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendedores</CardTitle>
                <CardDescription>Ordenado pelo valor em R$ (propostas não canceladas)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Propostas</TableHead>
                        <TableHead className="text-right">Finalizadas</TableHead>
                        <TableHead className="text-right">Assinadas</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellerGroups.map((g) => (
                        <TableRow key={g.key}>
                          <TableCell className="font-medium">{g.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{g.propostas}</TableCell>
                          <TableCell className="text-right tabular-nums">{g.finalizadas}</TableCell>
                          <TableCell className="text-right tabular-nums">{g.assinados}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct(g.conversao)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{brl(g.valorBRL)}</TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && sellerGroups.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma proposta neste filtro.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
