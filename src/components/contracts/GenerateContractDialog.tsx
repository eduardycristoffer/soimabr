import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { hasColumn } from "@/lib/dbFeatures";
import { Loader2, Plus, Trash2, Sparkles, Check } from "lucide-react";
import {
  buildPlaceholderMap,
  servicosInclusosBullets,
  resolvePlaceholders,
  type PaymentScheduleItem,
  type ContractGenerationInputs,
} from "@/lib/contractPlaceholders";
import {
  isValidCPF,
  formatCPF,
  formatPhone,
  formatCpfIfPossible,
  formatPhoneIfPossible,
} from "@/lib/validators";
import { AlertTriangle } from "lucide-react";

const FAKE_NAME_RX = /^(teste|test|xxx|fulano|beltrano|ciclano|nome do)/i;
const isFakeName = (n?: string) => !!n && FAKE_NAME_RX.test(n.trim());
const isFakeCpf = (c?: string) => {
  const d = (c || "").replace(/\D/g, "");
  return !!d && (/^(\d)\1{10}$/.test(d) || d === "12345678909");
};

interface Props {
  quoteId: string;
  open: boolean;
  onClose: () => void;
}

type Signatory = { name: string; cpf: string; rg?: string; cargo?: string };
type Witness = { name: string; cpf: string; email?: string };

// Human labels for clause_key toggles
const CLAUSE_KEY_LABELS: Record<string, string> = {
  operador: "Incluir cláusulas de operador (faturamento e condições)",
  prestadora_servico: "Incluir cláusula de prestação de serviço acessória",
};

export default function GenerateContractDialog({ quoteId, open, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefilled, setPrefilled] = useState(false);

  // Signatories (N per side)
  const [sellerSigs, setSellerSigs] = useState<Signatory[]>([]);
  const [buyerSigs, setBuyerSigs] = useState<Signatory[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);

  // Managers
  const [sellerMgrName, setSellerMgrName] = useState("");
  const [sellerMgrCpf, setSellerMgrCpf] = useState("");
  const [sellerMgrPhone, setSellerMgrPhone] = useState("");
  const [sellerMgrEmail, setSellerMgrEmail] = useState("");
  const [buyerMgrName, setBuyerMgrName] = useState("");
  const [buyerMgrCpf, setBuyerMgrCpf] = useState("");
  const [buyerMgrPhone, setBuyerMgrPhone] = useState("");
  const [buyerMgrEmail, setBuyerMgrEmail] = useState("");

  // Payment
  const [deliveryDays, setDeliveryDays] = useState<string>("");
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [extraServices, setExtraServices] = useState<string[]>([]);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [notesTouched, setNotesTouched] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ servico: string; texto: string; trecho: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Multi-contract control (for locação w/ services)
  const [alsoGenerateService, setAlsoGenerateService] = useState(false);
  // Optional clause toggles: keyed by `${templateId}::${clauseKey}` = boolean
  const [clauseToggles, setClauseToggles] = useState<Record<string, boolean>>({});

  const { data: quote } = useQuery({
    queryKey: ["quote-for-contract", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(*)")
        .eq("id", quoteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!quoteId,
  });

  const { data: previewItems } = useQuery({
    queryKey: ["quote-items-for-contract", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_items")
        .select("product_name, product_category, quantity")
        .eq("quote_id", quoteId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!quoteId,
  });

  const structuredServices = useMemo(
    () => (quote ? servicosInclusosBullets(previewItems || [], quote, []) : []),
    [previewItems, quote],
  );

  useEffect(() => {
    if (quote && !notesTouched) setNotesDraft(String(quote.notes || ""));
  }, [quote, notesTouched]);

  const analyzeNotes = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const current = [
        ...structuredServices.map((b) => b.replace(/^-\s*/, "")),
        ...extraServices.map((s) => s.trim()).filter(Boolean),
      ];
      const { data, error } = await supabase.functions.invoke("suggest-contract-services", {
        body: { notes: notesDraft, current_services: current },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch (_) { /* */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      const list = data?.suggestions || [];
      setAiSuggestions(list);
      if (!list.length) toast({ title: "Nenhum serviço faltando encontrado nas observações." });
    } catch (e: any) {
      setAiError(e?.message || "Falha ao analisar com IA");
    } finally {
      setAiLoading(false);
    }
  };

  // Active templates for this quote_type (+ 'servico' when locação)
  const { data: templates } = useQuery({
    queryKey: ["contract-templates-for-quote", quote?.quote_type],
    queryFn: async () => {
      const types = quote?.quote_type === "locacao" ? ["locacao", "servico"] : [quote?.quote_type || "venda"];
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*, company:company_settings(*)")
        .in("contract_type", types as any)
        .eq("is_active", true)
        .order("version", { ascending: false });
      if (error) throw error;
      // Keep only the latest per contract_type
      const seen = new Set<string>();
      return (data || []).filter((t: any) => {
        if (seen.has(t.contract_type)) return false;
        seen.add(t.contract_type);
        return true;
      });
    },
    enabled: open && !!quote,
  });

  const primaryTemplate = useMemo(
    () => templates?.find((t: any) => t.contract_type === (quote?.quote_type || "venda")),
    [templates, quote],
  );
  const serviceTemplate = useMemo(
    () => templates?.find((t: any) => t.contract_type === "servico"),
    [templates],
  );

  // Load clauses for templates involved (to know optional ones)
  const templateIds = useMemo(
    () => [primaryTemplate?.id, alsoGenerateService ? serviceTemplate?.id : null].filter(Boolean) as string[],
    [primaryTemplate, serviceTemplate, alsoGenerateService],
  );

  const { data: clausesAll } = useQuery({
    queryKey: ["contract-clauses", templateIds],
    queryFn: async () => {
      if (templateIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contract_clauses")
        .select("*")
        .in("template_id", templateIds)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: templateIds.length > 0,
  });

  // Optional clause groups (unique clause_key per template with is_core=false)
  const optionalGroups = useMemo(() => {
    const map = new Map<string, { templateId: string; clauseKey: string }>();
    (clausesAll || []).forEach((c: any) => {
      if (!c.is_core && c.clause_key) {
        const k = `${c.template_id}::${c.clause_key}`;
        if (!map.has(k)) map.set(k, { templateId: c.template_id, clauseKey: c.clause_key });
      }
    });
    return Array.from(map.values());
  }, [clausesAll]);

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-for-contract", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("name, email").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: open && !!user?.id,
  });

  // Prefill once when data loads
  useEffect(() => {
    if (!open || prefilled || !quote || !primaryTemplate) return;

    // Seller signatory prefilled from primary template's company
    const co = (primaryTemplate as any).company;
    if (co && sellerSigs.length === 0) {
      setSellerSigs([{
        name: co.representante_nome || "",
        cpf: formatCpfIfPossible(co.representante_cpf),
        rg: co.representante_rg || "",
        cargo: co.representante_cargo || "",
      }]);
    }
    if (buyerSigs.length === 0) {
      setBuyerSigs([{ name: "", cpf: "", rg: "", cargo: "" }]);
    }

    const client = (quote as any).clients;
    if (client) {
      setBuyerMgrName(client.contato_nome || "");
      setBuyerMgrPhone(formatPhoneIfPossible(client.contato_telefone || client.telefone || ""));
      setBuyerMgrEmail(client.contato_email || client.email || "");
    }
    if (myProfile) {
      setSellerMgrName(myProfile.name || "");
      setSellerMgrEmail(myProfile.email || "");
    }
    const total = Number(quote.total || 0);
    setSchedule([
      { label: "Entrada (40%)", value: +(total * 0.4).toFixed(2), due: "na confirmação do contrato" },
      { label: "Saldo (60%)", value: +(total * 0.6).toFixed(2), due: "à combinar" },
    ]);
    setDeliveryDays(String(quote.delivery_time ?? ""));

    // Auto-detect service for rental: if operator/maintenance/technical assistance is included → propose gen'ing service contract
    if (quote.quote_type === "locacao") {
      const hasService = !!(quote.rental_operator_included || quote.rental_maintenance_included || quote.rental_technical_assistance);
      setAlsoGenerateService(hasService);
    }
    setPrefilled(true);
  }, [open, quote, primaryTemplate, myProfile, prefilled, sellerSigs.length, buyerSigs.length]);

  // Auto-toggle optional clauses when groups appear
  useEffect(() => {
    if (!optionalGroups.length) return;
    setClauseToggles((prev) => {
      const next = { ...prev };
      optionalGroups.forEach(({ templateId, clauseKey }) => {
        const k = `${templateId}::${clauseKey}`;
        if (next[k] !== undefined) return;
        // Defaults:
        // - 'prestadora_servico' on locação template: enable if service contract is being generated
        // - 'operador' on service template: enable if quote.rental_operator_included
        if (clauseKey === "prestadora_servico" && templateId === primaryTemplate?.id) {
          next[k] = alsoGenerateService;
        } else if (clauseKey === "operador" && templateId === serviceTemplate?.id) {
          next[k] = !!quote?.rental_operator_included;
        } else {
          next[k] = false;
        }
      });
      return next;
    });
  }, [optionalGroups, alsoGenerateService, primaryTemplate?.id, serviceTemplate?.id, quote?.rental_operator_included]);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setPrefilled(false);
      setSellerSigs([]);
      setBuyerSigs([]);
      setWitnesses([]);
      setClauseToggles({});
      setAlsoGenerateService(false);
    }
  }, [open]);

  const totalSchedule = schedule.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const quoteTotal = Number(quote?.total || 0);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error("Proposta não carregada");
      if (!primaryTemplate) throw new Error("Nenhum modelo ativo para este tipo de proposta");
      if (!buyerSigs.length || !buyerSigs[0].name || !buyerSigs[0].cpf)
        throw new Error("Informe ao menos um representante legal da compradora (nome e CPF)");
      if (schedule.length === 0) throw new Error("Adicione ao menos uma parcela no cronograma de pagamento");
      if (Math.abs(totalSchedule - quoteTotal) > 0.01)
        throw new Error(`Soma das parcelas (R$ ${totalSchedule.toFixed(2)}) diverge do total da proposta (R$ ${quoteTotal.toFixed(2)}).`);
      const allSigs = [...sellerSigs, ...buyerSigs, ...witnesses];
      for (const s of allSigs) {
        if (s.cpf && !isValidCPF(s.cpf))
          throw new Error(`CPF inválido: ${s.cpf} (${s.name || "sem nome"}).`);
      }
      if (alsoGenerateService && !serviceTemplate)
        throw new Error("Nenhum modelo ativo de prestação de serviço encontrado");

      const { data: items } = await supabase
        .from("quote_items")
        .select("*, products(descricao, descricao_tecnica)")
        .eq("quote_id", quoteId)
        .order("order_index");

      const firstSeller = sellerSigs[0] || { name: "", cpf: "", rg: "", cargo: "" };
      const firstBuyer = buyerSigs[0];

      const inputsBase: ContractGenerationInputs = {
        // Todos os representantes entram na qualificação das partes (não só o primeiro)
        seller_reps: sellerSigs.filter((s) => s.name && s.cpf),
        buyer_reps: buyerSigs.filter((s) => s.name && s.cpf),
        seller_rep_name: firstSeller.name,
        seller_rep_cpf: firstSeller.cpf,
        seller_rep_rg: firstSeller.rg,
        seller_rep_cargo: firstSeller.cargo,
        buyer_rep_name: firstBuyer.name,
        buyer_rep_cpf: firstBuyer.cpf,
        buyer_rep_rg: firstBuyer.rg,
        buyer_rep_cargo: firstBuyer.cargo,
        seller_manager_name: sellerMgrName,
        seller_manager_cpf: sellerMgrCpf,
        seller_manager_phone: sellerMgrPhone,
        seller_manager_email: sellerMgrEmail,
        buyer_manager_name: buyerMgrName,
        buyer_manager_cpf: buyerMgrCpf,
        buyer_manager_phone: buyerMgrPhone,
        buyer_manager_email: buyerMgrEmail,
        payment_schedule: schedule,
        delivery_days: deliveryDays ? Number(deliveryDays) : undefined,
        extra_services: extraServices.map((s) => s.trim()).filter(Boolean),
      };

      // Serviços adicionais só são gravados no contrato se a coluna já existir no banco
      const withExtraServices = await hasColumn("contracts", "extra_services");

      // Helper: create one contract for a given template
      const createOne = async (template: any) => {
        const { data: contract, error: cErr } = await supabase
          .from("contracts")
          .insert({
            quote_id: quoteId,
            template_id: template.id,
            company_id: template.company_id,
            contract_number: "",
            status: "draft",
            seller_rep_name: firstSeller.name || null,
            seller_rep_cpf: firstSeller.cpf || null,
            seller_rep_rg: firstSeller.rg || null,
            seller_rep_cargo: firstSeller.cargo || null,
            buyer_rep_name: firstBuyer.name,
            buyer_rep_cpf: firstBuyer.cpf,
            buyer_rep_rg: firstBuyer.rg || null,
            buyer_rep_cargo: firstBuyer.cargo || null,
            seller_manager_name: sellerMgrName || null,
            seller_manager_cpf: sellerMgrCpf || null,
            seller_manager_phone: sellerMgrPhone || null,
            seller_manager_email: sellerMgrEmail || null,
            buyer_manager_name: buyerMgrName || null,
            buyer_manager_cpf: buyerMgrCpf || null,
            buyer_manager_phone: buyerMgrPhone || null,
            buyer_manager_email: buyerMgrEmail || null,
            payment_schedule: schedule as any,
            delivery_days: deliveryDays ? Number(deliveryDays) : null,
            generated_at: new Date().toISOString(),
            ...(withExtraServices ? { extra_services: inputsBase.extra_services || [] } : {}),
          } as any)
          .select("*")
          .single();
        if (cErr) throw cErr;

        // Signatories (all)
        const sigRows = [
          ...sellerSigs.filter((s) => s.name && s.cpf).map((s, i) => ({
            contract_id: contract.id, side: "seller", name: s.name, cpf: s.cpf,
            rg: s.rg || null, cargo: s.cargo || null, order_index: i,
          })),
          ...buyerSigs.filter((s) => s.name && s.cpf).map((s, i) => ({
            contract_id: contract.id, side: "buyer", name: s.name, cpf: s.cpf,
            rg: s.rg || null, cargo: s.cargo || null, order_index: i,
          })),
        ];
        if (sigRows.length) {
          const { error } = await supabase.from("contract_signatories").insert(sigRows);
          if (error) throw error;
        }

        // Witnesses
        const witRows = witnesses.filter((w) => w.name && w.cpf).map((w, i) => ({
          contract_id: contract.id, name: w.name, cpf: w.cpf, email: w.email || null, order_index: i,
        }));
        if (witRows.length) {
          const { error } = await supabase.from("contract_witnesses").insert(witRows);
          if (error) throw error;
        }

        // Clauses for THIS template, filtered by optional toggles
        const templateClauses = (clausesAll || []).filter((c: any) => c.template_id === template.id);
        const filtered = templateClauses.filter((c: any) => {
          if (c.is_core) return true;
          if (!c.clause_key) return true;
          const key = `${template.id}::${c.clause_key}`;
          return !!clauseToggles[key];
        });

        const map = buildPlaceholderMap({
          quote,
          client: (quote as any).clients,
          company: (template as any).company,
          items: items || [],
          inputs: inputsBase,
          contract_number: contract.contract_number,
        });

        const snapshotRows = filtered.map((c: any) => ({
          contract_id: contract.id,
          source_clause_id: c.id,
          order_index: c.order_index,
          title: c.title,
          body: resolvePlaceholders(c.body, map),
          is_core: c.is_core,
          clause_key: c.clause_key,
        }));
        if (snapshotRows.length) {
          const { error } = await supabase.from("contract_clause_snapshots").insert(snapshotRows);
          if (error) throw error;
        }
        // Snapshot initial version (v1)
        try {
          const { createContractVersion } = await import("@/lib/contractVersions");
          await createContractVersion({
            contractId: contract.id,
            changeSummary: "Versão inicial (geração)",
            explicitVersionNumber: 1,
            bumpContract: false,
          });
        } catch (err) {
          // non-fatal — contract exists
          console.error("Falha ao gravar versão inicial:", err);
        }

        return contract;
      };

      const primaryContract = await createOne(primaryTemplate);
      let serviceContract: any = null;
      if (alsoGenerateService && serviceTemplate) {
        serviceContract = await createOne(serviceTemplate);
      }
      return { primaryContract, serviceContract };
    },
    onSuccess: ({ primaryContract, serviceContract }) => {
      toast({
        title: serviceContract ? "Contratos gerados" : "Contrato gerado",
        description: serviceContract
          ? `${primaryContract.contract_number} + ${serviceContract.contract_number}`
          : `Nº ${primaryContract.contract_number}`,
      });
      onClose();
      navigate(`/contratos/${primaryContract.id}`);
    },
    onError: (e: any) =>
      toast({ title: "Erro ao gerar contrato", description: e.message, variant: "destructive" }),
  });

  const updateSchedule = (idx: number, field: keyof PaymentScheduleItem, v: string) => {
    setSchedule((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: field === "value" ? Number(v) : v } : p))
    );
  };

  const updateSig = (list: Signatory[], setList: (v: Signatory[]) => void, idx: number, field: keyof Signatory, v: string) =>
    setList(list.map((s, i) => (i === idx ? { ...s, [field]: v } : s)));

  const updateWit = (idx: number, field: keyof Witness, v: string) =>
    setWitnesses(witnesses.map((w, i) => (i === idx ? { ...w, [field]: v } : w)));

  const primaryLabel =
    primaryTemplate?.contract_type === "locacao" ? "Locação"
    : primaryTemplate?.contract_type === "servico" ? "Prestação de Serviço"
    : "Venda";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Contrato a partir da Proposta</DialogTitle>
          <DialogDescription>
            Modelo <strong>{primaryLabel}</strong>
            {primaryTemplate && (primaryTemplate as any).company?.razao_social && (
              <> · Empresa emissora: <strong>{(primaryTemplate as any).company.razao_social}</strong></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Multi-contract for rental */}
          {quote?.quote_type === "locacao" && serviceTemplate && (
            <section className="rounded-lg border p-3 bg-muted/30">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={alsoGenerateService}
                  onCheckedChange={(v) => setAlsoGenerateService(!!v)}
                />
                <div className="text-sm">
                  <div className="font-medium">Gerar também contrato de Prestação de Serviço</div>
                  <div className="text-xs text-muted-foreground">
                    Emitido por <strong>{(serviceTemplate as any).company?.razao_social}</strong>, vinculado à mesma proposta.
                    Usado quando a locação inclui operador e/ou manutenção.
                  </div>
                </div>
              </label>
            </section>
          )}

          {/* Optional clause toggles */}
          {optionalGroups.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Cláusulas opcionais</h3>
              <div className="space-y-2">
                {optionalGroups.map(({ templateId, clauseKey }) => {
                  const k = `${templateId}::${clauseKey}`;
                  const isService = templateId === serviceTemplate?.id;
                  const templateLabel = isService ? "Serviço" : primaryLabel;
                  return (
                    <label key={k} className="flex items-start gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={!!clauseToggles[k]}
                        onCheckedChange={(v) => setClauseToggles((prev) => ({ ...prev, [k]: !!v }))}
                      />
                      <div>
                        <div>{CLAUSE_KEY_LABELS[clauseKey] || clauseKey}</div>
                        <div className="text-xs text-muted-foreground">Contrato: {templateLabel}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <Separator />

          {/* Seller signatories */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Representantes da vendedora</h3>
              <Button variant="outline" size="sm" onClick={() => setSellerSigs([...sellerSigs, { name: "", cpf: "", rg: "", cargo: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar representante
              </Button>
            </div>
            {sellerSigs.map((s, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                <div><Label className="text-xs">Nome</Label><Input value={s.name} onChange={(e) => updateSig(sellerSigs, setSellerSigs, idx, "name", e.target.value)} /></div>
                <div><Label className="text-xs">CPF</Label><Input inputMode="numeric" placeholder="000.000.000-00" value={s.cpf} onChange={(e) => updateSig(sellerSigs, setSellerSigs, idx, "cpf", formatCPF(e.target.value))} /></div>
                <div><Label className="text-xs">RG</Label><Input value={s.rg || ""} onChange={(e) => updateSig(sellerSigs, setSellerSigs, idx, "rg", e.target.value)} /></div>
                <div><Label className="text-xs">Cargo</Label><Input value={s.cargo || ""} onChange={(e) => updateSig(sellerSigs, setSellerSigs, idx, "cargo", e.target.value)} /></div>
                <Button variant="ghost" size="icon" onClick={() => setSellerSigs(sellerSigs.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>

          <Separator />

          {/* Buyer signatories */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Representantes da compradora *</h3>
              <Button variant="outline" size="sm" onClick={() => setBuyerSigs([...buyerSigs, { name: "", cpf: "", rg: "", cargo: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar representante
              </Button>
            </div>
            {buyerSigs.map((s, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                <div><Label className="text-xs">Nome *</Label><Input value={s.name} onChange={(e) => updateSig(buyerSigs, setBuyerSigs, idx, "name", e.target.value)} /></div>
                <div><Label className="text-xs">CPF *</Label><Input inputMode="numeric" placeholder="000.000.000-00" value={s.cpf} onChange={(e) => updateSig(buyerSigs, setBuyerSigs, idx, "cpf", formatCPF(e.target.value))} /></div>
                <div><Label className="text-xs">RG</Label><Input value={s.rg || ""} onChange={(e) => updateSig(buyerSigs, setBuyerSigs, idx, "rg", e.target.value)} /></div>
                <div><Label className="text-xs">Cargo</Label><Input value={s.cargo || ""} onChange={(e) => updateSig(buyerSigs, setBuyerSigs, idx, "cargo", e.target.value)} /></div>
                <Button variant="ghost" size="icon" onClick={() => setBuyerSigs(buyerSigs.filter((_, i) => i !== idx))} disabled={buyerSigs.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>

          <Separator />

          {/* Witnesses */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Testemunhas</h3>
              <Button variant="outline" size="sm" onClick={() => setWitnesses([...witnesses, { name: "", cpf: "", email: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar testemunha
              </Button>
            </div>
            {witnesses.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma testemunha adicionada.</p>
            )}
            {witnesses.map((w, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div><Label className="text-xs">Nome</Label><Input value={w.name} onChange={(e) => updateWit(idx, "name", e.target.value)} /></div>
                <div><Label className="text-xs">CPF</Label><Input inputMode="numeric" placeholder="000.000.000-00" value={w.cpf} onChange={(e) => updateWit(idx, "cpf", formatCPF(e.target.value))} /></div>
                <div><Label className="text-xs">E-mail</Label><Input value={w.email || ""} onChange={(e) => updateWit(idx, "email", e.target.value)} /></div>
                <Button variant="ghost" size="icon" onClick={() => setWitnesses(witnesses.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Gestores de contrato</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 text-xs font-medium text-muted-foreground">Vendedora</div>
              <div><Label>Nome</Label><Input value={sellerMgrName} onChange={(e) => setSellerMgrName(e.target.value)} /></div>
              <div><Label>CPF</Label><Input inputMode="numeric" placeholder="000.000.000-00" value={sellerMgrCpf} onChange={(e) => setSellerMgrCpf(formatCPF(e.target.value))} /></div>
              <div><Label>Telefone</Label><Input inputMode="tel" placeholder="(00) 00000-0000" value={sellerMgrPhone} onChange={(e) => setSellerMgrPhone(formatPhone(e.target.value))} /></div>
              <div><Label>E-mail</Label><Input value={sellerMgrEmail} onChange={(e) => setSellerMgrEmail(e.target.value)} /></div>
              <div className="col-span-2 text-xs font-medium text-muted-foreground mt-2">Compradora</div>
              <div><Label>Nome</Label><Input value={buyerMgrName} onChange={(e) => setBuyerMgrName(e.target.value)} /></div>
              <div><Label>CPF</Label><Input inputMode="numeric" placeholder="000.000.000-00" value={buyerMgrCpf} onChange={(e) => setBuyerMgrCpf(formatCPF(e.target.value))} /></div>
              <div><Label>Telefone</Label><Input inputMode="tel" placeholder="(00) 00000-0000" value={buyerMgrPhone} onChange={(e) => setBuyerMgrPhone(formatPhone(e.target.value))} /></div>
              <div><Label>E-mail</Label><Input value={buyerMgrEmail} onChange={(e) => setBuyerMgrEmail(e.target.value)} /></div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Condições de pagamento</h3>
              <div className="text-xs text-muted-foreground">
                Total proposta: <strong>R$ {quoteTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                {" · "}
                Cronograma: <strong>R$ {totalSchedule.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {schedule.map((p, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2 items-end">
                <div><Label className="text-xs">Descrição</Label><Input value={p.label} onChange={(e) => updateSchedule(idx, "label", e.target.value)} /></div>
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={p.value} onChange={(e) => updateSchedule(idx, "value", e.target.value)} /></div>
                <div><Label className="text-xs">Vencimento</Label><Input value={p.due} onChange={(e) => updateSchedule(idx, "due", e.target.value)} placeholder="ex: 2026-09-01 ou 'na entrega'" /></div>
                <Button variant="ghost" size="icon" aria-label="Remover parcela" onClick={() => setSchedule((s) => s.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setSchedule((s) => [...s, { label: "", value: 0, due: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar parcela
            </Button>

            <div>
              <Label>Prazo de entrega (dias)</Label>
              <Input type="number" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Serviços inclusos no contrato (cláusula 5)</h3>
            {(() => {
              const extras = extraServices.map((s) => s.trim()).filter(Boolean).map((s) => `- ${s}`);
              const all = [...structuredServices, ...extras];
              return all.length ? (
                <ul className="list-disc pl-6 text-sm space-y-0.5">
                  {all.map((b, i) => <li key={i}>{b.replace(/^-\s*/, "")}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum serviço — a cláusula 5 dirá "nenhum serviço adicional incluso além do fornecimento do equipamento".
                </p>
              );
            })()}
            {structuredServices.length === 0 && !!String(quote?.notes || "").trim() && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                <div className="flex items-start gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  Nenhum serviço estruturado encontrado, mas a proposta tem texto em Observações — revise se frete, montagem ou outro serviço foi ofertado e não vai aparecer no contrato.
                </div>
                <blockquote className="border-l-2 border-amber-400 pl-3 whitespace-pre-line text-xs max-h-40 overflow-y-auto">
                  {quote?.notes}
                </blockquote>
              </div>
            )}
            <div className="rounded-md border p-3 space-y-2">
              <Label className="text-xs">Observações da proposta (informadas pelo vendedor)</Label>
              <Textarea
                rows={4}
                value={notesDraft}
                onChange={(e) => { setNotesTouched(true); setNotesDraft(e.target.value); }}
                placeholder="Descreva o que foi ofertado: frete, montagem, operador, treinamento..."
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={analyzeNotes}
                disabled={aiLoading || !notesDraft.trim()}
              >
                {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Identificar serviços faltantes com IA
              </Button>
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
              {aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Sugestões da IA — revise antes de incluir:</p>
                  {aiSuggestions.map((sg, i) => {
                    const added = extraServices.some((x) => x.trim() === sg.texto.trim());
                    return (
                      <div key={i} className="flex gap-2 items-start rounded border bg-muted/40 p-2">
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="font-medium">{sg.servico}</div>
                          <div>{sg.texto}</div>
                          {sg.trecho && <div className="text-xs text-muted-foreground italic mt-1">“{sg.trecho}”</div>}
                        </div>
                        <Button
                          size="sm"
                          variant={added ? "ghost" : "outline"}
                          disabled={added}
                          onClick={() => setExtraServices((arr) => [...arr, sg.texto])}
                        >
                          {added ? <><Check className="h-3 w-3 mr-1" />Incluído</> : <><Plus className="h-3 w-3 mr-1" />Incluir</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <Label className="text-xs">Serviços adicionais a incluir na cláusula 5</Label>
            {extraServices.map((s, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={s}
                  placeholder="ex: Frete/transporte do equipamento de Anápolis-GO até Betim-MG"
                  onChange={(e) => setExtraServices((arr) => arr.map((v, i) => (i === idx ? e.target.value : v)))}
                />
                <Button variant="ghost" size="icon" aria-label="Remover serviço" onClick={() => setExtraServices((arr) => arr.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setExtraServices((arr) => [...arr, ""])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar serviço
            </Button>
          </section>
        </div>

        {(() => {
          const warns: string[] = [];
          const scheduleDiff = totalSchedule - quoteTotal;
          if (schedule.length > 0 && Math.abs(scheduleDiff) > 0.01) {
            warns.push(
              `Cronograma diverge do total da proposta em R$ ${scheduleDiff.toFixed(2)} — ajuste antes de gerar.`,
            );
          }
          const badCpfs = [...sellerSigs, ...buyerSigs, ...witnesses].filter(
            (s) => s.cpf && !isValidCPF(s.cpf),
          );
          if (badCpfs.length) warns.push(`${badCpfs.length} CPF(s) inválido(s) em signatários/testemunhas.`);
          const fakes = [...sellerSigs, ...buyerSigs, ...witnesses].filter(
            (s) => isFakeName(s.name) || isFakeCpf(s.cpf),
          );
          if (fakes.length) warns.push(`Possíveis dados fictícios (nome/CPF padrão de teste) em ${fakes.length} entrada(s).`);
          if (!warns.length) return null;
          return (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" /> Verifique antes de gerar
              </div>
              <ul className="list-disc pl-6">
                {warns.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          );
        })()}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={
              generateMutation.isPending ||
              (schedule.length > 0 && Math.abs(totalSchedule - quoteTotal) > 0.01) ||
              [...sellerSigs, ...buyerSigs, ...witnesses].some((s) => s.cpf && !isValidCPF(s.cpf))
            }
          >
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {alsoGenerateService ? "Gerar Contratos" : "Gerar Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
