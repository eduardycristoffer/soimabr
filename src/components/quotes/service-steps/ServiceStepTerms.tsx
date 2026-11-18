import { ServiceWizardData } from "@/hooks/useServiceWizard";
import {
  ServiceData, DEFAULT_INCLUSIONS, DEFAULT_PAYMENT_TEXT, DEFAULT_CLIENT_RESPONSIBILITIES,
  DEFAULT_COMPANY_RESPONSIBILITIES, DEFAULT_FINAL_SECTIONS, DEFAULT_CLOSING_TEXT, DEFAULT_ACCEPTANCE_TEXT,
} from "@/lib/serviceProposal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { BlockHeader, SectionListEditor, StringListEditor } from "./editors";

interface Props {
  data: ServiceWizardData;
  updateData: (d: Partial<ServiceWizardData>) => void;
  updateService: (d: Partial<ServiceData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ServiceStepTerms({ data, updateData, updateService, onNext, onPrev }: Props) {
  const s = data.service;

  return (
    <div className="space-y-8">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Os textos já vêm preenchidos com o modelo de proposta de serviço. <strong>Revise tudo</strong> antes de enviar —
          principalmente <em>reajuste, retenções, prazos e responsabilidades</em> — e edite, reordene ou apague o que não se aplica.
          O botão “Restaurar” volta ao texto original.
        </AlertDescription>
      </Alert>

      <StringListEditor
        title="Inclusos nas condições comerciais"
        hint="O que está incluído no preço."
        value={s.inclusions}
        onChange={(inclusions) => updateService({ inclusions })}
        onReset={() => updateService({ inclusions: [...DEFAULT_INCLUSIONS] })}
      />

      <div className="space-y-2">
        <BlockHeader title="Condições de pagamento" onReset={() => updateService({ payment_text: DEFAULT_PAYMENT_TEXT })} />
        <Textarea rows={4} value={s.payment_text} onChange={(e) => updateService({ payment_text: e.target.value })} />
      </div>

      <StringListEditor
        title="Responsabilidades da CONTRATANTE (cliente)"
        value={s.client_responsibilities}
        onChange={(client_responsibilities) => updateService({ client_responsibilities })}
        onReset={() => updateService({ client_responsibilities: [...DEFAULT_CLIENT_RESPONSIBILITIES] })}
        rows={3}
      />

      <StringListEditor
        title="Responsabilidades da CONTRATADA (nossa empresa)"
        value={s.company_responsibilities}
        onChange={(company_responsibilities) => updateService({ company_responsibilities })}
        onReset={() => updateService({ company_responsibilities: [...DEFAULT_COMPANY_RESPONSIBILITIES] })}
        rows={3}
      />

      <SectionListEditor
        value={s.final_sections}
        onChange={(final_sections) => updateService({ final_sections })}
        onReset={() => updateService({ final_sections: DEFAULT_FINAL_SECTIONS.map((x) => ({ ...x })) })}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Validade da proposta (dias) *</Label>
          <Input
            type="number" min="1" step="1"
            value={data.validity_days || ""}
            onChange={(e) => updateData({ validity_days: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observações adicionais (opcional)</Label>
          <Textarea rows={2} value={data.notes} onChange={(e) => updateData({ notes: e.target.value })} placeholder="Aparece no fim das condições comerciais" />
        </div>
      </div>

      <div className="space-y-2">
        <BlockHeader title="Encerramento" onReset={() => updateService({ closing_text: DEFAULT_CLOSING_TEXT })} />
        <Textarea rows={2} value={s.closing_text} onChange={(e) => updateService({ closing_text: e.target.value })} />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <Label className="text-sm font-semibold">Assinatura e aceite</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Quem assina pela empresa</Label>
            <Input value={s.signer_name} onChange={(e) => updateService({ signer_name: e.target.value })} placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cargo</Label>
            <Input value={s.signer_role} onChange={(e) => updateService({ signer_role: e.target.value })} placeholder="Ex: Engenheiro Mecânico" />
          </div>
        </div>
        <div className="space-y-1">
          <BlockHeader title="Texto do aceite (assinado pelo cliente)" onReset={() => updateService({ acceptance_text: DEFAULT_ACCEPTANCE_TEXT })} />
          <Textarea rows={3} value={s.acceptance_text} onChange={(e) => updateService({ acceptance_text: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!(data.validity_days > 0)}>Próximo</Button>
      </div>
    </div>
  );
}
