import { QuoteWizardData, QuoteItemDraft } from "@/hooks/useQuoteWizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, CheckCircle2, Send, RefreshCw } from "lucide-react";

const categoryLabels: Record<string, string> = {
  grua: "🏗️ Grua",
  configuracao: "⚙️ Configuração",
  torre: "🗼 Torre",
  tramo: "📐 Tramo",
  chassis: "🔧 Chassis",
  acessorio: "🔩 Acessório",
};

interface Props {
  data: QuoteWizardData;
  subtotal: number;
  discountValue: number;
  total: number;
  onPrev: () => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onRequestApproval: () => void;
  needsApproval: boolean;
  isSaving: boolean;
  usdBrlRate?: number | null;
  usdBrlLastUpdated?: string | null;
  isRateStale?: boolean;
}

export default function StepReview({
  data, subtotal, discountValue, total, onPrev, onSaveDraft, onFinalize,
  onRequestApproval, needsApproval, isSaving, usdBrlRate, usdBrlLastUpdated, isRateStale,
}: Props) {
  const isInternationalUsd = data.client_type === "internacional" && data.currency === "USD";

  const formatBrl = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatUsd = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(value);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: data.currency }).format(value);

  const allItems = [...data.equipment, ...data.components, ...data.accessories];

  const renderItems = (items: QuoteItemDraft[], title: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {categoryLabels[item.product_category] || item.product_category}
              </Badge>
              <span>{item.product_name}</span>
              <span className="text-muted-foreground text-xs">x{item.quantity}</span>
            </div>
            <div className="text-right">
              {isInternationalUsd ? (
                <>
                  <span className="font-medium">{formatBrl(item.total_price)}</span>
                  {usdBrlRate && (
                    <span className="text-xs text-muted-foreground block">
                      ≈ {formatUsd(item.total_price / usdBrlRate)}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-medium">{formatCurrency(item.total_price)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isInternationalUsd && usdBrlRate && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-sm">
          <RefreshCw className={`h-4 w-4 shrink-0 ${isRateStale ? "text-amber-600" : ""}`} />
          <div className="flex-1">
            <span className="font-medium">Cotação USD/BRL: {usdBrlRate.toFixed(4)}</span>
            {usdBrlLastUpdated && (
              <span className="text-xs ml-2">(atualizada em {usdBrlLastUpdated})</span>
            )}
            {isRateStale && (
              <span className="text-xs text-amber-600 block">
                ⚠ Cotação pode estar desatualizada — usando último valor válido.
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{data.client_name}</p>
              {isInternationalUsd && (
                <Badge variant="secondary" className="mt-1 text-xs">Internacional · USD</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Projeto</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Nome:</span> {data.project_name}</p>
              {data.project_location && (
                <p><span className="text-muted-foreground">Local:</span> {data.project_location}</p>
              )}
            </CardContent>
          </Card>

          {data.equipment.filter(item => item.grua_lanca_m || item.grua_altura_torre_m || item.grua_carga_maxima_kg || item.grua_carga_ponta_kg || item.grua_altura_trabalho_m).map((item) => (
            <Card key={item.product_id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Especificações — {item.product_name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {item.grua_lanca_m && <p><span className="text-muted-foreground">Lança:</span> {item.grua_lanca_m} m</p>}
                {item.grua_altura_torre_m && <p><span className="text-muted-foreground">Altura da torre:</span> {item.grua_altura_torre_m} m</p>}
                {item.grua_carga_maxima_kg && <p><span className="text-muted-foreground">Carga máxima:</span> {item.grua_carga_maxima_kg} kg</p>}
                {item.grua_carga_ponta_kg && <p><span className="text-muted-foreground">Carga na ponta:</span> {item.grua_carga_ponta_kg} kg</p>}
                {item.grua_altura_trabalho_m && <p><span className="text-muted-foreground">Altura de Trabalho:</span> {item.grua_altura_trabalho_m} m</p>}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Condições Comerciais</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Moeda:</span> {data.currency}</p>
              <p><span className="text-muted-foreground">Validade:</span> {data.validity_days} dias</p>
              {data.delivery_time && <p><span className="text-muted-foreground">Entrega:</span> {data.delivery_time}</p>}
              {data.payment_terms && <p><span className="text-muted-foreground">Pagamento:</span> {data.payment_terms}</p>}
              {data.payment_terms_items && data.payment_terms_items.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Tópicos:</span>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    {data.payment_terms_items.filter(i => i.text).map((item, idx) => (
                      <li key={idx}>{item.text}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.freight_terms && <p><span className="text-muted-foreground">Frete:</span> {data.freight_terms}</p>}
              {data.notes && <p><span className="text-muted-foreground">Obs:</span> {data.notes}</p>}
            </CardContent>
          </Card>

          {/* Technical summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Técnico / Escopo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {data.spec_tipo && <p><span className="text-muted-foreground">Tipo:</span> {data.spec_tipo}</p>}
              {data.spec_vel_elevacao && <p><span className="text-muted-foreground">Vel. distribuição:</span> {data.spec_vel_elevacao}</p>}
              {data.spec_vel_rotacao && <p><span className="text-muted-foreground">Vel. rotação:</span> {data.spec_vel_rotacao}</p>}
              {data.spec_vel_translacao && <p><span className="text-muted-foreground">Vel. translação:</span> {data.spec_vel_translacao}</p>}
              <p><span className="text-muted-foreground">Itens da grua:</span> {data.panel_items.length} item(ns)</p>
              <p><span className="text-muted-foreground">Tensão:</span> {data.panel_voltage}V</p>
              <p>
                <span className="text-muted-foreground">Garantia:</span>{" "}
                {data.warranty_struct_years}a estrutural, {data.warranty_components_years}a componentes
              </p>
              {data.hide_unit_prices && (
                <p className="text-amber-700">⚠ Valores unitários ocultos no PDF</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - items and totals */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Itens ({allItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.hide_unit_prices ? (
                <>
                  {[...data.equipment, ...data.components, ...data.accessories].map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {categoryLabels[item.product_category] || item.product_category}
                        </Badge>
                        <span>{item.product_name}</span>
                        <span className="text-muted-foreground text-xs">x{item.quantity}</span>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between border-t pt-2 text-lg">
                    <span className="font-bold">Total</span>
                    <div className="text-right">
                      {isInternationalUsd ? (
                        <>
                          <span className="font-bold">{formatBrl(total)}</span>
                          {usdBrlRate && (
                            <span className="text-sm text-muted-foreground block font-semibold">
                              ≈ {formatUsd(total / usdBrlRate)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-bold">{formatCurrency(total)}</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {renderItems(data.equipment, "Equipamento")}
                  {renderItems(data.components, "Componentes")}
                  {renderItems(data.accessories, "Acessórios")}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <div className="text-right">
                        {isInternationalUsd ? (
                          <>
                            <span className="font-medium">{formatBrl(subtotal)}</span>
                            {usdBrlRate && (
                              <span className="text-xs text-muted-foreground block">
                                ≈ {formatUsd(subtotal / usdBrlRate)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-medium">{formatCurrency(subtotal)}</span>
                        )}
                      </div>
                    </div>
                    {data.discount_percent > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>
                          {data.hide_discount_value
                            ? "Desconto aplicado (oculto no PDF)"
                            : `Desconto (${data.discount_percent}%)`}
                        </span>
                        <span className="font-medium">-{isInternationalUsd ? formatBrl(discountValue) : formatCurrency(discountValue)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-lg">
                      <span className="font-bold">Total</span>
                      <div className="text-right">
                        {isInternationalUsd ? (
                          <>
                            <span className="font-bold">{formatBrl(total)}</span>
                            {usdBrlRate && (
                              <span className="text-sm text-muted-foreground block font-semibold">
                                ≈ {formatUsd(total / usdBrlRate)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-bold">{formatCurrency(total)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>


          {isInternationalUsd && (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs">
              Valor em USD é estimado com base na cotação do dia e pode variar no momento do pagamento.
            </div>
          )}
        </div>
      </div>

      {needsApproval && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
          <Send className="h-4 w-4 shrink-0" />
          <span>Esta proposta requer aprovação de desconto por um administrador antes de ser finalizada.</span>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={isSaving || data.equipment.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Salvar Rascunho
          </Button>
          {needsApproval ? (
            <Button onClick={onRequestApproval} disabled={isSaving || data.equipment.length === 0}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Enviar para Aprovação
            </Button>
          ) : (
            <Button onClick={onFinalize} disabled={isSaving || data.equipment.length === 0}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finalizar Proposta
            </Button>
          )}
        </div>
        {data.equipment.length === 0 && (
          <p className="text-xs text-destructive text-center">Selecione 1 grua para salvar ou finalizar.</p>
        )}
      </div>
    </div>
  );
}
