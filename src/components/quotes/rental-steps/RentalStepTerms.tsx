import { ChevronDown, Info, Plus, Trash2 } from "lucide-react";
import { RentalWizardData } from "@/hooks/useRentalWizard";
import {
  DEFAULT_ACCEPTANCE_TEXT, DEFAULT_CORRECTIVE_NOTES, DEFAULT_EQUIPMENT_LABELS, DEFAULT_INCLUDED, DEFAULT_INSURANCE,
  DEFAULT_INTRO, DEFAULT_NOT_INCLUDED, DEFAULT_OBSERVATIONS, DEFAULT_SAFETY_DEVICES, DEFAULT_SECTIONS, DEFAULT_SUBJECT,
  kvFromLabels, type RentalData, type RentalSection,
} from "@/lib/rentalProposal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BlockHeader, KVListEditor, StringListEditor, moveItem } from "../service-steps/editors";
import type { IssuerCompany } from "../service-steps/ServiceStepScope";

export interface RentalIssuerCompany extends IssuerCompany {
  address?: string | null;
  representante_nome?: string | null;
  representante_cargo?: string | null;
}

interface Props {
  data: RentalWizardData;
  updateRental: (d: Partial<RentalData>) => void;
  companies: RentalIssuerCompany[];
  onCompanyChange: (slug: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

/** Bloco que abre e fecha: a tela fica curta e quem precisa mexer num texto abre só aquele. */
function Group({ title, hint, defaultOpen = false, children }: { title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6 border-t px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Cláusulas por assunto: título + tópicos (cada tópico vira um item da lista na proposta). */
function SectionsEditor({ value, onChange, onReset }: { value: RentalSection[]; onChange: (v: RentalSection[]) => void; onReset: () => void }) {
  const set = (i: number, patch: Partial<RentalSection>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-4">
      <BlockHeader
        title="Assuntos"
        hint="Cada assunto vira um item numerado da proposta, com seus tópicos."
        onReset={onReset}
        resetLabel="Restaurar assuntos-padrão"
      />
      {value.map((s, i) => (
        <div key={i} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center gap-1.5">
            <Input
              value={s.title}
              onChange={(e) => set(i, { title: e.target.value })}
              placeholder="Título do assunto"
              aria-label={`Título do assunto ${i + 1}`}
              className="h-9 text-sm font-medium"
            />
            <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" disabled={i === 0} onClick={() => onChange(moveItem(value, i, -1))}>Subir</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, 1))}>Descer</Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remover assunto ${s.title || i + 1}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <StringListEditor
            title="Tópicos"
            value={s.items}
            onChange={(items) => set(i, { items })}
            rows={3}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { title: "", items: [""] }])}>
        <Plus className="mr-1 h-3 w-3" />
        Adicionar assunto
      </Button>
    </div>
  );
}

export default function RentalStepTerms({ data, updateRental, companies, onCompanyChange, onNext, onPrev }: Props) {
  const r = data.rental;
  const nightTables = data.lines.some((l) => (l.group === "night17" || l.group === "night22") && l.enabled && Number(l.unit_price) > 0);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Os textos já vêm preenchidos com um modelo de proposta de locação. <strong>Revise tudo</strong> antes de enviar —
          principalmente <em>percentuais, prazos, reajustes e multas</em> — e edite, reordene ou apague o que não se aplica.
          O botão “Restaurar” volta ao texto original. Assunto que ficar vazio não aparece na proposta.
        </AlertDescription>
      </Alert>

      <Group title="Cabeçalho da proposta" hint="Quem emite, a quem se dirige e do que se trata" defaultOpen>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Empresa que emite a proposta *</Label>
            <Select value={r.company_slug} onValueChange={onCompanyChange}>
              <SelectTrigger aria-label="Empresa que emite a proposta"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {companies.length === 0 && <SelectItem value={r.company_slug}>{r.company_slug}</SelectItem>}
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.slug || c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Define o cabeçalho, o rodapé e o assinante da proposta.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rent-city">Cidade de emissão</Label>
            <Input id="rent-city" placeholder="Ex: Santana de Parnaíba/SP" value={r.issue_city} onChange={(e) => updateRental({ issue_city: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rent-subject">Assunto *</Label>
          <Input id="rent-subject" value={r.subject} onChange={(e) => updateRental({ subject: e.target.value })} />
        </div>
        <div className="space-y-2">
          <BlockHeader title="Texto de abertura" onReset={() => updateRental({ subject: DEFAULT_SUBJECT, intro: DEFAULT_INTRO })} />
          <Textarea rows={3} aria-label="Texto de abertura" value={r.intro} onChange={(e) => updateRental({ intro: e.target.value })} />
        </div>
      </Group>

      <Group title="Equipamento" hint="Características técnicas e dispositivos de segurança que aparecem na proposta">
        <KVListEditor
          title="Características técnicas"
          hint="Só as linhas preenchidas aparecem. Lança, altura e cargas já vêm do cadastro da grua."
          value={r.equipment}
          onChange={(equipment) => updateRental({ equipment })}
          onReset={() => updateRental({ equipment: kvFromLabels(DEFAULT_EQUIPMENT_LABELS) })}
        />
        <StringListEditor
          title="Dispositivos de segurança"
          value={r.safety_devices}
          onChange={(safety_devices) => updateRental({ safety_devices })}
          onReset={() => updateRental({ safety_devices: [...DEFAULT_SAFETY_DEVICES] })}
          rows={1}
        />
      </Group>

      <Group title="Seguro, incluso e não incluso" hint="O que está e o que não está no preço">
        <StringListEditor
          title="Seguro"
          value={r.insurance}
          onChange={(insurance) => updateRental({ insurance })}
          onReset={() => updateRental({ insurance: [...DEFAULT_INSURANCE] })}
          rows={2}
        />
        <StringListEditor
          title="Não incluso"
          value={r.not_included}
          onChange={(not_included) => updateRental({ not_included })}
          onReset={() => updateRental({ not_included: [...DEFAULT_NOT_INCLUDED] })}
        />
        <StringListEditor
          title="Incluso"
          value={r.included}
          onChange={(included) => updateRental({ included })}
          onReset={() => updateRental({ included: [...DEFAULT_INCLUDED] })}
          rows={3}
        />
      </Group>

      <Group
        title="Manutenção corretiva"
        hint={nightTables ? "Notas sob as tabelas de horas fora do horário comercial" : "Só aparece se houver tabela de manutenção corretiva com valor"}
      >
        <StringListEditor
          title="Notas da manutenção corretiva"
          value={r.corrective_notes}
          onChange={(corrective_notes) => updateRental({ corrective_notes })}
          onReset={() => updateRental({ corrective_notes: [...DEFAULT_CORRECTIVE_NOTES] })}
          rows={3}
        />
      </Group>

      <Group title="Observações do quadro de preços" hint="Observações numeradas que acompanham o quadro de preços">
        <StringListEditor
          title="Observações do quadro de preços"
          value={r.observations}
          onChange={(observations) => updateRental({ observations })}
          onReset={() => updateRental({ observations: [...DEFAULT_OBSERVATIONS] })}
          rows={3}
        />
      </Group>

      <Group title="Condições por assunto" hint="Compromissos, medição e pagamentos, prazos, jornadas e demais condições">
        <SectionsEditor
          value={r.sections}
          onChange={(sections) => updateRental({ sections })}
          onReset={() => updateRental({ sections: DEFAULT_SECTIONS.map((s) => ({ title: s.title, items: [...s.items] })) })}
        />
      </Group>

      <Group title="Assinatura e aceite" hint="Quem assina pela empresa e o texto assinado pelo cliente">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Quem assina pela empresa</Label>
            <Input aria-label="Quem assina pela empresa" value={r.signer_name} onChange={(e) => updateRental({ signer_name: e.target.value })} placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cargo</Label>
            <Input aria-label="Cargo de quem assina" value={r.signer_role} onChange={(e) => updateRental({ signer_role: e.target.value })} placeholder="Ex: Engenheiro Mecânico" />
          </div>
        </div>
        <div className="space-y-1">
          <BlockHeader title="Texto do aceite (assinado pelo cliente)" onReset={() => updateRental({ acceptance_text: DEFAULT_ACCEPTANCE_TEXT })} />
          <Textarea rows={3} aria-label="Texto do aceite" value={r.acceptance_text} onChange={(e) => updateRental({ acceptance_text: e.target.value })} />
        </div>
      </Group>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!r.subject.trim()} title={r.subject.trim() ? undefined : "Informe o assunto da proposta"}>Próximo</Button>
      </div>
    </div>
  );
}
