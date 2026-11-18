import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceWizardData } from "@/hooks/useServiceWizard";
import {
  ServiceData, DEFAULT_EQUIPMENT_LABELS, DEFAULT_SITE_LABELS, DEFAULT_INTRO, DEFAULT_OBJECT_TEXT, kvFromLabels,
} from "@/lib/serviceProposal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlockHeader, KVListEditor } from "./editors";

export interface IssuerCompany {
  id: string;
  slug: string | null;
  company_name: string;
  razao_social: string;
}

interface Props {
  data: ServiceWizardData;
  updateData: (d: Partial<ServiceWizardData>) => void;
  updateService: (d: Partial<ServiceData>) => void;
  companies: IssuerCompany[];
  onCompanyChange: (slug: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

const kg = (n: unknown) => Number(n).toLocaleString("pt-BR");

export default function ServiceStepScope({ data, updateData, updateService, companies, onCompanyChange, onNext, onPrev }: Props) {
  const s = data.service;

  const { data: cranes } = useQuery({
    queryKey: ["cranes-service-prefill"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, nome, codigo, default_lanca_m, default_altura_torre_m, default_carga_maxima_kg, default_carga_ponta_kg")
        .eq("categoria", "grua")
        .eq("is_active", true)
        .order("nome");
      if (error) throw error;
      return products;
    },
  });

  /** Preenche as linhas do equipamento a partir de uma grua do catálogo (tudo continua editável). */
  const prefillFromCrane = (id: string) => {
    const c: any = (cranes || []).find((x: any) => x.id === id);
    if (!c) return;
    const set = (label: string, value: string) => (kv: { label: string; value: string }) => (kv.label === label ? { ...kv, value } : kv);
    let eq = s.equipment.length ? s.equipment : kvFromLabels(DEFAULT_EQUIPMENT_LABELS);
    eq = eq.map(set("Fabricante", "SOIMA")).map(set("Modelo", c.nome));
    if (c.default_lanca_m) eq = eq.map(set("Comprimento da lança", `até ${c.default_lanca_m} metros`));
    if (c.default_carga_maxima_kg) {
      const tip = c.default_carga_ponta_kg && c.default_lanca_m
        ? ` e ${kg(c.default_carga_ponta_kg)} kg na ponta da lança a ${c.default_lanca_m} metros`
        : "";
      eq = eq.map(set("Capacidade de carga", `${kg(c.default_carga_maxima_kg)} kg (máxima)${tip}`));
    }
    if (c.default_altura_torre_m) eq = eq.map(set("Altura inicial", `${c.default_altura_torre_m} metros de torre`));
    updateService({ equipment: eq });
  };

  const canNext = !!data.project_name.trim() && !!s.subject.trim();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Empresa que emite a proposta *</Label>
          <Select value={s.company_slug} onValueChange={onCompanyChange}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {companies.length === 0 && <SelectItem value={s.company_slug}>{s.company_slug}</SelectItem>}
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.slug || c.id}>{c.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Define o cabeçalho, o rodapé e o assinante da proposta.</p>
        </div>
        <div className="space-y-2">
          <Label>Cidade de emissão</Label>
          <Input placeholder="Ex: Anápolis/GO" value={s.issue_city} onChange={(e) => updateService({ issue_city: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome da obra *</Label>
          <Input placeholder="Ex: Obra Corporate" value={data.project_name} onChange={(e) => updateData({ project_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Local da obra</Label>
          <Input placeholder="Ex: Betim, MG" value={data.project_location} onChange={(e) => updateData({ project_location: e.target.value })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>A/C (aos cuidados de)</Label>
          <Input placeholder="Ex: Eng. Rodrigo Fiuza" value={s.attention} onChange={(e) => updateService({ attention: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assunto *</Label>
        <Input value={s.subject} onChange={(e) => updateService({ subject: e.target.value })} />
        <p className="text-xs text-muted-foreground">Aparece depois do número da proposta. Ex.: “Proposta PRO260012 — Serviços de montagem industrial…”</p>
      </div>

      <div className="space-y-2">
        <BlockHeader title="Texto de abertura" onReset={() => updateService({ intro: DEFAULT_INTRO })} />
        <Textarea rows={3} value={s.intro} onChange={(e) => updateService({ intro: e.target.value })} />
      </div>

      <div className="space-y-2">
        <BlockHeader title="Objeto da proposta" onReset={() => updateService({ object_text: DEFAULT_OBJECT_TEXT })} />
        <Textarea rows={3} value={s.object_text} onChange={(e) => updateService({ object_text: e.target.value })} />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        {(cranes?.length ?? 0) > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Preencher o equipamento a partir do catálogo (opcional)</Label>
            <Select onValueChange={prefillFromCrane}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Escolha uma grua do catálogo..." /></SelectTrigger>
              <SelectContent>
                {(cranes || []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <KVListEditor
          title="Equipamento identificado"
          hint="Mostrado logo abaixo do objeto. Apague as linhas que não se aplicam."
          value={s.equipment}
          onChange={(equipment) => updateService({ equipment })}
          onReset={() => updateService({ equipment: kvFromLabels(DEFAULT_EQUIPMENT_LABELS) })}
        />
      </div>

      <div className="rounded-lg border p-4">
        <KVListEditor
          title="Características da obra"
          hint="Ex.: estrutura, número de pavimentos, altura prevista para a grua."
          value={s.site_features}
          onChange={(site_features) => updateService({ site_features })}
          onReset={() => updateService({ site_features: kvFromLabels(DEFAULT_SITE_LABELS) })}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!canNext}>Próximo</Button>
      </div>
    </div>
  );
}
