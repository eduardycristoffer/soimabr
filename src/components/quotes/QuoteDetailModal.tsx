import { formatDecimal, formatRate } from "@/lib/numberFormat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, FileSignature, FileDown, Mail, Globe, BadgeCheck, RotateCcw } from "lucide-react";
import SendProposalEmailDialog from "@/components/quotes/SendProposalEmailDialog";
import { useEmailIntegration } from "@/hooks/useEmailIntegration";
import { downloadQuotePdf } from "@/lib/quotePdf";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import QuoteShareCard from "./QuoteShareCard";
import ServiceItemsCard from "./ServiceItemsCard";
import RentalItemsCard from "./RentalItemsCard";
import CloseQuoteDialog from "./CloseQuoteDialog";
import { useQuoteClosingEnabled } from "@/hooks/useQuoteClosingEnabled";
import { isInternationalQuote, internationalReason } from "@/lib/quoteFlags";
import { canConfirmClosing, canUndoClosing, closingDateLabel, isClosed } from "@/lib/quoteClosing";
import GenerateContractDialog from "@/components/contracts/GenerateContractDialog";
import { QuoteAmount } from "@/components/quotes/QuoteAmount";
import { formatMoney, isUsdEstimateQuote } from "@/lib/quoteMoney";
import { useUsdBrlRate } from "@/hooks/useUsdBrlRate";

const categoryLabels: Record<string, string> = {
  grua: "🏗️ Grua",
  configuracao: "⚙️ Configuração",
  torre: "🗼 Torre",
  tramo: "📐 Tramo",
  chassis: "🔧 Chassis",
  acessorio: "🔩 Acessório",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface Props {
  quoteId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function QuoteDetailModal({ quoteId, open, onClose }: Props) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const closingEnabled = useQuoteClosingEnabled();
  const [closingMode, setClosingMode] = useState<"close" | "undo" | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const emailIntegration = useEmailIntegration();
  const emailAvailable = emailIntegration.dbReady && emailIntegration.deployed;

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote-detail", quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia, cnpj, cidade, estado, client_type)")
        .eq("id", quoteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId && open,
  });

  const { data: items } = useQuery({
    queryKey: ["quote-items-detail", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId && open,
  });

  const { data: versions } = useQuery({
    queryKey: ["quote-versions-detail", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from("quote_versions")
        .select("id, version_number, edited_at, edited_by")
        .eq("quote_id", quoteId)
        .order("version_number", { ascending: false });
      if (error) throw error;

      const editorIds = [...new Set((data || []).map((v: any) => v.edited_by).filter(Boolean))];
      let names: Record<string, string> = {};
      if (editorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_directory")
          .select("user_id, name")
          .in("user_id", editorIds);
        names = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.name]));
      }
      return (data || []).map((v: any) => ({ ...v, editor_name: names[v.edited_by] || "—" }));
    },
    enabled: !!quoteId && open,
  });

  // Propostas internacionais em USD têm os valores gravados em R$ (o dólar é só estimativa):
  // formatar com "US$" mostrava o número em reais com o símbolo errado.
  const isUsdEstimate = isUsdEstimateQuote(quote as any);
  const { rate: liveUsdRate } = useUsdBrlRate(isUsdEstimate);
  const formatCurrency = (value: number, currency: string = "BRL") =>
    formatMoney(value, isUsdEstimate ? "BRL" : currency);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  const formatDateTime = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));

  const handleGeneratePdf = async () => {
    if (!quoteId) return;
    setGeneratingPdf(true);
    try {
      const response = await supabase.functions.invoke("generate-pdf", {
        body: { quoteId },
      });
      if (response.error) throw response.error;
      const { html, quote_number } = response.data;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
      toast({ title: "PDF gerado!", description: `Proposta ${quote_number} pronta para impressão` });
    } catch (error: any) {
      toast({ title: "Erro ao gerar PDF", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Baixa o arquivo PDF (o botão "Gerar PDF" só abre a página para imprimir)
  const handleDownloadPdf = async () => {
    if (!quoteId) return;
    setDownloadingPdf(true);
    try {
      const name = await downloadQuotePdf(quoteId);
      toast({ title: "PDF baixado", description: name });
    } catch (error: any) {
      toast({ title: "Erro ao baixar o PDF", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const equipmentItems = items?.filter((i) => i.product_category === "grua") || [];
  const componentItems = items?.filter((i) => ["configuracao", "torre", "tramo", "chassis"].includes(i.product_category)) || [];
  const accessoryItems = items?.filter((i) => i.product_category === "acessorio") || [];

  const isRental = (quote as any)?.quote_type === "locacao";
  const isService = (quote as any)?.quote_type === "servico";
  // Locação feita no quadro de preços (cada custo em sua linha); as antigas continuam como eram
  const isRentalDetailed = isRental && (quote as any)?.service_data?.kind === "locacao";
  const hideUnitPrices = !!(quote as any)?.hide_unit_prices;
  const rentalServices: string[] = [];
  if (isRental && !isRentalDetailed && quote) {
    if ((quote as any).rental_operator_included) rentalServices.push("Operador incluso");
    if ((quote as any).rental_maintenance_included) rentalServices.push("Manutenção inclusa");
    if ((quote as any).rental_insurance_included) rentalServices.push("Seguro incluso");
    if ((quote as any).rental_technical_assistance) rentalServices.push("Assistência técnica");
  }

  const renderItemGroup = (groupItems: typeof items, title: string) => {
    if (!groupItems || groupItems.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
        {groupItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {categoryLabels[item.product_category] || item.product_category}
              </Badge>
              <span>{item.product_name}</span>
              <span className="text-muted-foreground text-xs">x{item.quantity}</span>
            </div>
            {!hideUnitPrices && (
              <span className="font-medium">{formatCurrency(item.total_price, quote?.currency || "BRL")}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {quote ? (
              <>
                <span className="font-mono">{quote.quote_number}</span>
                <Badge variant={statusLabels[quote.status]?.variant || "secondary"} className={`status-badge-${quote.status}`}>
                  {statusLabels[quote.status]?.label || quote.status}
                </Badge>
                {isInternationalQuote(quote as any) && (
                  <Badge
                    variant="outline"
                    title={`Proposta internacional: ${internationalReason(quote as any)}`}
                    className="gap-1 border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-300"
                  >
                    <Globe className="h-3 w-3" /> Internacional
                  </Badge>
                )}
                {closingEnabled && quote.status === "finalized" && isClosed(quote as any) && (
                  <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <BadgeCheck className="h-3 w-3" /> Fechada
                  </Badge>
                )}
              </>
            ) : (
              "Detalhes da Proposta"
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quote ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cliente</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{quote.clients?.nome_fantasia || quote.clients?.razao_social}</p>
                  {quote.clients?.razao_social && quote.clients?.nome_fantasia && (
                    <p className="text-muted-foreground text-xs">{quote.clients.razao_social}</p>
                  )}
                  {quote.clients?.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {quote.clients.cnpj}</p>}
                  {quote.clients?.cidade && (
                    <p className="text-xs text-muted-foreground">
                      {quote.clients.cidade}{quote.clients.estado ? ` - ${quote.clients.estado}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Projeto</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Nome:</span> {quote.project_name || "-"}</p>
                  {quote.project_location && (
                    <p><span className="text-muted-foreground">Local:</span> {quote.project_location}</p>
                  )}
                </CardContent>
              </Card>

              {/* Rental: Work Site Data */}
              {isRental && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Dados da Obra</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {(quote as any).rental_work_type && <p><span className="text-muted-foreground">Tipo:</span> {(quote as any).rental_work_type}</p>}
                    {(quote as any).rental_height_needed && <p><span className="text-muted-foreground">Altura necessária:</span> {(quote as any).rental_height_needed} m</p>}
                    {(quote as any).rental_jib_needed && <p><span className="text-muted-foreground">Lança necessária:</span> {(quote as any).rental_jib_needed} m</p>}
                    {(quote as any).rental_max_weight && <p><span className="text-muted-foreground">Peso máximo:</span> {Number((quote as any).rental_max_weight).toLocaleString("pt-BR")} kg</p>}
                    {(quote as any).rental_duration_months && <p><span className="text-muted-foreground">Duração:</span> {(quote as any).rental_duration_months} meses</p>}
                    {(quote as any).rental_start_date && <p><span className="text-muted-foreground">Início previsto:</span> {formatDate((quote as any).rental_start_date)}</p>}
                    {(quote as any).rental_terrain_condition && <p><span className="text-muted-foreground">Terreno:</span> {(quote as any).rental_terrain_condition}</p>}
                    {(quote as any).rental_special_foundation && <p><span className="text-muted-foreground">Fundação especial:</span> Sim</p>}
                  </CardContent>
                </Card>
              )}

              {equipmentItems.filter(item => item.grua_lanca_m || item.grua_altura_torre_m || item.grua_carga_maxima_kg || item.grua_carga_ponta_kg || item.grua_altura_trabalho_m).map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Especificações — {item.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {item.grua_lanca_m && <p><span className="text-muted-foreground">Lança:</span> {item.grua_lanca_m} m</p>}
                    {item.grua_altura_torre_m && <p><span className="text-muted-foreground">Altura da torre:</span> {item.grua_altura_torre_m} m</p>}
                    {item.grua_carga_maxima_kg && <p><span className="text-muted-foreground">Carga máxima:</span> {item.grua_carga_maxima_kg} kg</p>}
                    {item.grua_carga_ponta_kg && <p><span className="text-muted-foreground">Carga na ponta:</span> {item.grua_carga_ponta_kg} kg</p>}
                    {item.grua_altura_trabalho_m && <p><span className="text-muted-foreground">Altura de trabalho:</span> {item.grua_altura_trabalho_m} m</p>}
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Condições Comerciais</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Moeda:</span> {quote.currency}</p>
                  <p><span className="text-muted-foreground">Validade:</span> {quote.validity_days} dias</p>
                  {quote.delivery_time && <p><span className="text-muted-foreground">Entrega:</span> {quote.delivery_time}</p>}
                  {quote.payment_terms && <p><span className="text-muted-foreground">Pagamento:</span> {quote.payment_terms}</p>}
                  {(quote as any).payment_terms_items && Array.isArray((quote as any).payment_terms_items) && (quote as any).payment_terms_items.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Tópicos:</span>
                      <ul className="list-disc list-inside ml-2 mt-1 text-xs">
                        {(quote as any).payment_terms_items.filter((i: any) => i.text).map((item: any, idx: number) => (
                          <li key={idx}>{item.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {quote.freight_terms && <p><span className="text-muted-foreground">Frete:</span> {quote.freight_terms}</p>}
                  {quote.notes && (
                    <div>
                      <span className="text-muted-foreground">Obs:</span>
                      <p className="whitespace-pre-line">{quote.notes}</p>
                    </div>
                  )}
                  {(quote as any).usd_brl_rate_used && (
                    <p className="pt-1 border-t mt-2">
                      <span className="text-muted-foreground">Cotação USD/BRL:</span>{" "}
                      {formatRate(Number((quote as any).usd_brl_rate_used))}
                      {(quote as any).usd_brl_rate_updated_at && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (em {formatDate((quote as any).usd_brl_rate_updated_at)})
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Rental: Included Services */}
              {isRental && rentalServices.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Serviços Inclusos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {rentalServices.map((s, i) => (
                      <p key={i} className="flex items-center gap-1">✓ {s}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Datas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Criado em:</span> {formatDateTime(quote.created_at)}</p>
                  <p><span className="text-muted-foreground">Última alteração:</span> {formatDateTime((quote as any).updated_at || quote.created_at)}</p>
                  {quote.finalized_at && <p><span className="text-muted-foreground">Finalizado em:</span> {formatDate(quote.finalized_at)}</p>}
                  {quote.cancelled_at && <p><span className="text-muted-foreground">Cancelado em:</span> {formatDate(quote.cancelled_at)}</p>}
                  {closingEnabled && isClosed(quote as any) && (
                    <p><span className="text-muted-foreground">Fechada em:</span> {closingDateLabel((quote as any).closed_at)}</p>
                  )}
                  {closingEnabled && isClosed(quote as any) && (quote as any).closing_note && (
                    <p><span className="text-muted-foreground">Obs. do fechamento:</span> {(quote as any).closing_note}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Histórico de salvamentos {versions && versions.length > 0 ? `(rev. ${versions[0].version_number})` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {!versions || versions.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhuma revisão registrada ainda.</p>
                  ) : (
                    versions.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 border-b last:border-0 pb-1">
                        <Badge variant="outline" className="text-[10px] status-badge-revision">rev. {v.version_number}</Badge>
                        <span className="text-xs flex-1 truncate">{v.editor_name}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(v.edited_at)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {quote.created_by && (
                <QuoteShareCard quoteId={quote.id} ownerId={quote.created_by} />
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {isService ? (
                <ServiceItemsCard rows={(items as any[]) || []} hidePrices={hideUnitPrices} />
              ) : isRentalDetailed ? (
                <RentalItemsCard
                  serviceData={(quote as any).service_data}
                  months={Number((quote as any).rental_duration_months) || 0}
                  discountPercent={Number(quote.discount_percent) || 0}
                  taxPercent={Number((quote as any).rental_tax_percent) || 0}
                  total={Number(quote.total) || 0}
                  hidePrices={hideUnitPrices}
                />
              ) : isRental ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Detalhamento de Custos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {!hideUnitPrices && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor mensal × {(quote as any).rental_duration_months || 0} meses</span>
                          <span className="font-medium">{formatCurrency(((quote as any).rental_monthly_value || 0) * ((quote as any).rental_duration_months || 0), quote.currency)}</span>
                        </div>
                        {(quote as any).rental_mobilization > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Mobilização</span><span>{formatCurrency((quote as any).rental_mobilization, quote.currency)}</span></div>
                        )}
                        {(quote as any).rental_demobilization > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Desmobilização</span><span>{formatCurrency((quote as any).rental_demobilization, quote.currency)}</span></div>
                        )}
                        {(quote as any).rental_freight > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{formatCurrency((quote as any).rental_freight, quote.currency)}</span></div>
                        )}
                        {(quote as any).rental_assembly > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Montagem</span><span>{formatCurrency((quote as any).rental_assembly, quote.currency)}</span></div>
                        )}
                        {(quote as any).rental_disassembly > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Desmontagem</span><span>{formatCurrency((quote as any).rental_disassembly, quote.currency)}</span></div>
                        )}
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
                        </div>
                        {quote.discount_percent > 0 && (
                          <div className="flex justify-between text-destructive">
                            <span>Desconto ({formatDecimal(quote.discount_percent)}%)</span>
                            <span>-{formatCurrency(quote.discount_value, quote.currency)}</span>
                          </div>
                        )}
                        {(quote as any).rental_tax_percent > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Impostos ({formatDecimal((quote as any).rental_tax_percent)}%)</span>
                            <span>{formatCurrency(quote.total - (quote.subtotal - quote.discount_value), quote.currency)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between border-t pt-2 text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-bold">{formatCurrency(quote.total, quote.currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Itens ({items?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderItemGroup(equipmentItems, "Equipamento")}
                    {renderItemGroup(componentItems, "Componentes")}
                    {renderItemGroup(accessoryItems, "Acessórios")}

                    <Separator />

                    <div className="space-y-2 text-sm">
                      {!hideUnitPrices && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
                          </div>
                          {quote.discount_percent > 0 && (
                            <div className="flex justify-between text-destructive">
                              <span>Desconto ({formatDecimal(quote.discount_percent)}%)</span>
                              <span className="font-medium">-{formatCurrency(quote.discount_value, quote.currency)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between border-t pt-2 text-lg">
                        <span className="font-bold">Total</span>
                        <QuoteAmount className="font-bold text-right" value={quote.total} quote={quote as any} liveRate={liveUsdRate} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {closingEnabled && quote && canConfirmClosing(quote as any) && (
            <Button variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setClosingMode("close")}>
              <BadgeCheck className="mr-2 h-4 w-4" /> Confirmar fechamento
            </Button>
          )}
          {closingEnabled && quote && canUndoClosing(quote as any) && (
            <Button variant="outline" onClick={() => setClosingMode("undo")}>
              <RotateCcw className="mr-2 h-4 w-4" /> Desfazer fechamento
            </Button>
          )}
          {quote && quote.status === "finalized" && (
            <Button variant="default" onClick={() => setContractDialogOpen(true)}>
              <FileSignature className="mr-2 h-4 w-4" /> Gerar Contrato
            </Button>
          )}
          {quote && (quote.status === "finalized" || quote.status === "draft") && (
            <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Gerar PDF
            </Button>
          )}
          {quote && (quote.status === "finalized" || quote.status === "draft") && (
            <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
              {downloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Baixar PDF
            </Button>
          )}
          {quote && quote.status === "finalized" && emailAvailable && (
            <Button variant="default" onClick={() => setEmailDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Enviar ao cliente
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
      {quoteId && (
        <GenerateContractDialog
          quoteId={quoteId}
          open={contractDialogOpen}
          onClose={() => setContractDialogOpen(false)}
        />
      )}
      {quote && (
        <CloseQuoteDialog
          quote={quote as any}
          mode={closingMode ?? "close"}
          open={closingMode !== null}
          onClose={() => setClosingMode(null)}
        />
      )}
      {quoteId && emailDialogOpen && (
        <SendProposalEmailDialog
          quoteId={quoteId}
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
        />
      )}
    </Dialog>
  );
}
