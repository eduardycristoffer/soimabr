import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QuoteWizardData, PanelItemDraft } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical, Download, Info, Shield, Zap, Settings2 } from "lucide-react";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepTechnical({ data, updateData, onNext, onPrev }: Props) {
  const selectedGruaId = data.equipment[0]?.product_id;

  // Fetch product defaults
  const { data: productDefaults } = useQuery({
    queryKey: ["product-defaults", selectedGruaId],
    queryFn: async () => {
      if (!selectedGruaId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", selectedGruaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGruaId,
  });

  // Fetch default panel items for the selected product
  const { data: defaultPanelItems } = useQuery({
    queryKey: ["default-panel-items", selectedGruaId],
    queryFn: async () => {
      if (!selectedGruaId) return [];
      const { data, error } = await supabase
        .from("default_panel_items")
        .select("*")
        .eq("product_id", selectedGruaId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGruaId,
  });

  const loadSpecDefaults = () => {
    if (!productDefaults) return;
    const pd = productDefaults as any;
    updateData({
      spec_tipo: pd.spec_tipo || "",
      spec_vel_elevacao: pd.spec_vel_elevacao || "",
      spec_vel_rotacao: pd.spec_vel_rotacao || "",
      spec_vel_translacao: pd.spec_vel_translacao || "",
    });
  };

  const loadPanelDefaults = () => {
    if (!defaultPanelItems || defaultPanelItems.length === 0) return;
    const items: PanelItemDraft[] = defaultPanelItems.map((item) => ({
      text: item.item_text,
      order: item.order_index,
    }));
    updateData({ panel_items: items });

    if (productDefaults) {
      const pd = productDefaults as any;
      updateData({
        panel_voltage: pd.default_panel_voltage || "380",
        panel_include_motors: pd.default_panel_include_motors || false,
        panel_motor_elev_kw: pd.default_motor_elev_kw ?? null,
        panel_motor_elev_hp: pd.default_motor_elev_hp ?? null,
        panel_motor_elev_vel: pd.default_motor_elev_vel || "",
        panel_motor_trans_kw: pd.default_motor_trans_kw ?? null,
        panel_motor_trans_hp: pd.default_motor_trans_hp ?? null,
        panel_motor_trans_vel: pd.default_motor_trans_vel || "",
        panel_motor_rot_kw: pd.default_motor_rot_kw ?? null,
        panel_motor_rot_hp: pd.default_motor_rot_hp ?? null,
        panel_motor_rot_vel: pd.default_motor_rot_vel || "",
      });
    }
  };

  const loadWarrantyDefaults = () => {
    if (!productDefaults) return;
    const pd = productDefaults as any;
    updateData({
      warranty_struct_years: pd.default_warranty_struct_years ?? 3,
      warranty_paint_years: pd.default_warranty_paint_years ?? 2,
      warranty_components_years: pd.default_warranty_components_years ?? 1,
    });
  };

  const addPanelItem = () => {
    const newItems = [...data.panel_items, { text: "", order: data.panel_items.length }];
    updateData({ panel_items: newItems });
  };

  const removePanelItem = (index: number) => {
    const newItems = data.panel_items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i }));
    updateData({ panel_items: newItems });
  };

  const updatePanelItem = (index: number, text: string) => {
    const newItems = data.panel_items.map((item, i) => i === index ? { ...item, text } : item);
    updateData({ panel_items: newItems });
  };

  const numInput = (value: number | null) => (value === null || value === 0) ? "" : String(value);
  const parseNum = (v: string) => v === "" ? null : Number(v);
  const parseIntSafe = (v: string) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
  };

  // Auto-populate defaults when entering this step
  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (hasAutoLoaded.current || !selectedGruaId) return;
    if (!productDefaults || !defaultPanelItems) return;

    hasAutoLoaded.current = true;

    // Specs
    if (!data.spec_tipo) {
      loadSpecDefaults();
    }

    // Panel items
    if (data.panel_items.length === 0 && defaultPanelItems.length > 0) {
      loadPanelDefaults();
    }

    // Warranty (if still at initial values)
    if (data.warranty_struct_years === 3 && data.warranty_paint_years === 2 && data.warranty_components_years === 1) {
      loadWarrantyDefaults();
    }
  }, [productDefaults, defaultPanelItems, selectedGruaId]);

  return (
    <div className="space-y-6">
      {!selectedGruaId && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <Info className="h-4 w-4 shrink-0" />
          <span>Selecione uma grua na etapa "Equipamento" para carregar os dados padrão do modelo.</span>
        </div>
      )}

      {/* Block 1 - Escopo do Fornecimento */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Escopo do Fornecimento</CardTitle>
              <CardDescription>Especificações técnicas da grua para o PDF</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={data.spec_override_enabled}
                onCheckedChange={(v) => updateData({ spec_override_enabled: v })}
              />
              <Label className="text-sm">Sobrescrever dados do modelo nesta proposta</Label>
            </div>
            {selectedGruaId && (
              <Button variant="outline" size="sm" onClick={loadSpecDefaults}>
                <Download className="mr-1 h-3 w-3" />
                Preencher com padrão
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input
                placeholder="Ex: Torre ascensional"
                value={data.spec_tipo}
                onChange={(e) => updateData({ spec_tipo: e.target.value })}
                disabled={!data.spec_override_enabled && !!selectedGruaId}
              />
            </div>
            <div className="space-y-2">
              <Label>Velocidade de distribuição</Label>
              <Input
                placeholder="Ex: MULT SPEED 2.5/58 m/min"
                value={data.spec_vel_elevacao}
                onChange={(e) => updateData({ spec_vel_elevacao: e.target.value })}
                disabled={!data.spec_override_enabled && !!selectedGruaId}
              />
            </div>
            <div className="space-y-2">
              <Label>Velocidade de rotação</Label>
              <Input
                placeholder="Ex: 0 – 0,9 rpm"
                value={data.spec_vel_rotacao}
                onChange={(e) => updateData({ spec_vel_rotacao: e.target.value })}
                disabled={!data.spec_override_enabled && !!selectedGruaId}
              />
            </div>
            <div className="space-y-2">
              <Label>Velocidade de translação</Label>
              <Input
                placeholder="Ex: 0 – 50 m/min"
                value={data.spec_vel_translacao}
                onChange={(e) => updateData({ spec_vel_translacao: e.target.value })}
                disabled={!data.spec_override_enabled && !!selectedGruaId}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Lança, torre e cargas são configurados na etapa "Equipamento" e aparecerão automaticamente no escopo.
          </p>
        </CardContent>
      </Card>

      {/* Block 2 - Itens do Painel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Itens Integrantes da Grua</CardTitle>
              <CardDescription>Lista de itens inclusos na grua</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            {selectedGruaId && (
              <Button variant="outline" size="sm" onClick={loadPanelDefaults}>
                <Download className="mr-1 h-3 w-3" />
                Carregar itens padrão do modelo
              </Button>
            )}
          </div>

          {/* Panel items list */}
          <div className="space-y-2">
            {data.panel_items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={item.text}
                  onChange={(e) => updatePanelItem(index, e.target.value)}
                  placeholder="Descrição do item..."
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removePanelItem(index)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPanelItem}>
              <Plus className="mr-1 h-3 w-3" />
              Adicionar item
            </Button>
          </div>

          <Separator />

          {/* Voltage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tensão de alimentação</Label>
              <Select value={data.panel_voltage} onValueChange={(v) => updateData({ panel_voltage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="220">220V</SelectItem>
                  <SelectItem value="380">380V</SelectItem>
                  <SelectItem value="440">440V</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Motors toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={data.panel_include_motors}
              onCheckedChange={(v) => updateData({ panel_include_motors: v })}
            />
            <Label className="text-sm">Incluir mini-tabela de motorredutor no PDF</Label>
          </div>

          {data.panel_include_motors && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h5 className="text-sm font-semibold">Motorredutores</h5>
              
              {/* Elevação */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Motorredutor de Distribuição</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Potência (kW)</Label>
                    <Input type="number" step="0.1" value={numInput(data.panel_motor_elev_kw)} onChange={(e) => updateData({ panel_motor_elev_kw: parseNum(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Potência (HP)</Label>
                    <Input type="number" step="0.1" value={numInput(data.panel_motor_elev_hp)} onChange={(e) => updateData({ panel_motor_elev_hp: parseNum(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Velocidade</Label>
                    <Input placeholder="m/min" value={data.panel_motor_elev_vel} onChange={(e) => updateData({ panel_motor_elev_vel: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Translação */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Motorredutor de Translação</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Potência (kW)</Label>
                    <Input type="number" step="0.1" value={numInput(data.panel_motor_trans_kw)} onChange={(e) => updateData({ panel_motor_trans_kw: parseNum(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Potência (HP)</Label>
                    <Input type="number" step="0.1" value={numInput(data.panel_motor_trans_hp)} onChange={(e) => updateData({ panel_motor_trans_hp: parseNum(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Velocidade</Label>
                    <Input placeholder="m/min" value={data.panel_motor_trans_vel} onChange={(e) => updateData({ panel_motor_trans_vel: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Rotação */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Motorredutor de Rotação</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Potência (kW)</Label>
                    <Input type="number" step="0.1" value={numInput(data.panel_motor_rot_kw)} onChange={(e) => updateData({ panel_motor_rot_kw: parseNum(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Potência (HP)</Label>
                    <Input type="number" step="0.1" value={numInput(data.panel_motor_rot_hp)} onChange={(e) => updateData({ panel_motor_rot_hp: parseNum(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Velocidade</Label>
                    <Input placeholder="rpm" value={data.panel_motor_rot_vel} onChange={(e) => updateData({ panel_motor_rot_vel: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block 3 - Garantia */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Garantia</CardTitle>
              <CardDescription>Prazos de garantia para o PDF</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-end">
            {selectedGruaId && (
              <Button variant="outline" size="sm" onClick={loadWarrantyDefaults}>
                <Download className="mr-1 h-3 w-3" />
                Usar padrão do modelo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estrutural (anos)</Label>
              <Input
                type="number" min={0} max={10} step={1}
                value={data.warranty_struct_years}
                onChange={(e) => updateData({ warranty_struct_years: parseIntSafe(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pintura (anos)</Label>
              <Input
                type="number" min={0} max={10} step={1}
                value={data.warranty_paint_years}
                onChange={(e) => updateData({ warranty_paint_years: parseIntSafe(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Componentes (anos)</Label>
              <Input
                type="number" min={0} max={10} step={1}
                value={data.warranty_components_years}
                onChange={(e) => updateData({ warranty_components_years: parseIntSafe(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p>Esses prazos aparecerão automaticamente na seção <strong>GARANTIA</strong> do PDF.</p>
              <p className="mt-1">Se o valor for <strong>0</strong>, a linha correspondente será ocultada no PDF.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext}>Próximo</Button>
      </div>
    </div>
  );
}
