import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Download, Send, Upload,
  Loader2, Lock, History, RotateCcw, Bold, List, CheckCircle2, AlertCircle, GitBranch, Ban,
} from "lucide-react";
import { createContractVersion, restoreContractVersion } from "@/lib/contractVersions";
import { ContractScopePreview } from "@/components/contracts/ContractScopePreview";
import { ContractDataCard } from "@/components/contracts/ContractDataCard";
import { ContractSignatureCard } from "@/components/contracts/ContractSignatureCard";
import { ContractRentalCard } from "@/components/fleet/ContractRentalCard";
import { useAutentiqueAvailability } from "@/hooks/useAutentique";
import { useContractPlaceholderMap } from "@/hooks/useContractPlaceholderMap";
import { resolvePlaceholders } from "@/lib/contractPlaceholders";
import { sanitizeStorageFileName } from "@/lib/storageFileName";
import { formatCPF, formatPhone, isValidCPF } from "@/lib/validators";
import { RefreshCw } from "lucide-react";


const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  sent: "Enviado",
  signed: "Assinado",
  cancelled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  em_revisao: "outline",
  aprovado: "default",
  sent: "default",
  signed: "default",
  cancelled: "destructive",
};

const LOCKED_STATES = ["aprovado", "sent", "signed", "cancelled"];

const warnIfBadCpf = (v: string, who?: string) => {
  if (v && !isValidCPF(v)) {
    toast({
      title: "CPF parece inválido",
      description: who ? `Confira o CPF de ${who}.` : "Confira o número digitado.",
      variant: "destructive",
    });
  }
};

export default function ContratoEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts")
        .select("*, quotes(quote_number, quote_type, clients(razao_social, nome_fantasia))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: snapshots, refetch: refetchSnapshots } = useQuery({
    queryKey: ["contract-snapshots", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_clause_snapshots")
        .select("*").eq("contract_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Load source clauses to compare (personalization indicator + restore default)
  const sourceClauseIds = useMemo(
    () => Array.from(new Set((snapshots || []).map((s) => s.source_clause_id).filter(Boolean))) as string[],
    [snapshots],
  );
  const { data: sourceClauses } = useQuery({
    queryKey: ["source-clauses", sourceClauseIds],
    queryFn: async () => {
      if (sourceClauseIds.length === 0) return [];
      const { data, error } = await supabase.from("contract_clauses")
        .select("id, title, body").in("id", sourceClauseIds);
      if (error) throw error;
      return data;
    },
    enabled: sourceClauseIds.length > 0,
  });
  const sourceMap = useMemo(() => {
    const m = new Map<string, { title: string; body: string }>();
    (sourceClauses || []).forEach((c: any) => m.set(c.id, { title: c.title, body: c.body }));
    return m;
  }, [sourceClauses]);

  // Assinatura digital (Autentique): só entra em cena quando banco, função e chave estiverem prontos
  const autentique = useAutentiqueAvailability();

  // Dados atuais do contrato (proposta, cliente, empresa, signatários) para preencher os {{campos}}
  const { buildMap, structuredServices, quoteTotal, ready: mapReady } = useContractPlaceholderMap(contract);

  // Texto do modelo JÁ preenchido com os dados atuais (é com ele que o snapshot deve ser comparado)
  const resolvedSourceMap = useMemo(() => {
    const m = new Map<string, { title: string; body: string; resolved: boolean }>();
    const map = buildMap();
    sourceMap.forEach((v, k) =>
      m.set(k, { title: v.title, body: map ? resolvePlaceholders(v.body, map) : v.body, resolved: !!map }),
    );
    return m;
  }, [sourceMap, buildMap]);

  const status = contract?.status;
  const isLocked = status ? LOCKED_STATES.includes(status) : false;
  const isSigned = status === "signed" || status === "cancelled";

  // ── content mutations ──────────────────────────────────────
  const updateClause = async (snapshotId: string, patch: { body?: string; title?: string }) => {
    const p: any = { ...patch, edited_at: new Date().toISOString() };
    const { error } = await supabase.from("contract_clause_snapshots").update(p).eq("id", snapshotId);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["contract-snapshots", id] });
  };

  const reorderClause = async (idx: number, dir: -1 | 1) => {
    if (!snapshots) return;
    const target = snapshots[idx + dir];
    if (!target) return;
    const a = snapshots[idx];
    await supabase.from("contract_clause_snapshots").update({ order_index: target.order_index }).eq("id", a.id);
    await supabase.from("contract_clause_snapshots").update({ order_index: a.order_index }).eq("id", target.id);
    refetchSnapshots();
  };

  const addClause = async () => {
    if (!snapshots) return;
    const maxOrder = Math.max(0, ...snapshots.map((s) => s.order_index));
    const { error } = await supabase.from("contract_clause_snapshots").insert({
      contract_id: id!,
      order_index: maxOrder + 1,
      title: "Nova cláusula",
      body: "Conteúdo da cláusula",
      is_core: false,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    refetchSnapshots();
  };

  const removeClause = async (snapId: string, isCore: boolean) => {
    if (isCore) { toast({ title: "Cláusula núcleo não pode ser removida" }); return; }
    if (!confirm("Remover esta cláusula?")) return;
    const { error } = await supabase.from("contract_clause_snapshots").delete().eq("id", snapId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    refetchSnapshots();
  };

  const restoreDefault = async (snap: any) => {
    const src = snap.source_clause_id ? sourceMap.get(snap.source_clause_id) : null;
    if (!src) { toast({ title: "Sem texto padrão para restaurar" }); return; }
    const map = buildMap();
    if (!map) { toast({ title: "Aguarde o carregamento dos dados do contrato e tente de novo" }); return; }
    if (!confirm("Restaurar o texto padrão desta cláusula, com os dados atuais do contrato? Suas alterações manuais nela serão perdidas.")) return;
    try {
      // antes o texto voltava com os {{campos}} crus; agora volta preenchido
      await updateClause(snap.id, { title: src.title, body: resolvePlaceholders(src.body, map) });
      toast({ title: "Texto padrão restaurado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  // Refaz, a partir do modelo, as cláusulas indicadas (com os dados do contrato + alterações recém-salvas)
  const regenerateClauses = async (snaps: any[], override: Record<string, any> = {}) => {
    const map = buildMap(override);
    if (!map) throw new Error("Dados do contrato ainda não carregaram");
    for (const s of snaps) {
      const src = s.source_clause_id ? sourceMap.get(s.source_clause_id) : null;
      if (!src) continue;
      await updateClause(s.id, { body: resolvePlaceholders(src.body, map) });
    }
  };

  const tokenRx = (t: string) => new RegExp(`\\{\\{\\s*${t}\\s*\\}\\}`, "i");

  // Depois de salvar prazo/parcelas/serviços: oferece atualizar as cláusulas que usam esses dados
  const handleDataSaved = async (patch: Record<string, any>) => {
    const c: any = contract;
    const same = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    const tokens: string[] = [];
    if (!same(c.delivery_days, patch.delivery_days)) tokens.push("prazo_entrega_dias");
    if (!same(c.payment_schedule, patch.payment_schedule)) tokens.push("condicoes_pagamento_tabela");
    if ("extra_services" in patch && !same(c.extra_services, patch.extra_services)) tokens.push("servicos_inclusos_lista");

    await qc.invalidateQueries({ queryKey: ["contract", id] });
    if (!tokens.length) return;

    const affected = (snapshots || []).filter((s: any) => {
      const src = s.source_clause_id ? sourceMap.get(s.source_clause_id) : null;
      return !!src && tokens.some((t) => tokenRx(t).test(src.body));
    });
    if (!affected.length) return;

    const titles = affected.map((s: any) => `• ${s.title}`).join("\n");
    if (!confirm(`Atualizar o texto das cláusulas que usam esses dados?\n\n${titles}\n\nElas serão refeitas a partir do modelo (alterações manuais nelas serão substituídas).`)) {
      toast({ title: "Cláusulas mantidas", description: "Os dados foram salvos, mas o texto das cláusulas não mudou." });
      return;
    }
    try {
      await regenerateClauses(affected, patch);
      toast({ title: "Cláusulas atualizadas", description: `${affected.length} cláusula(s) refeita(s) com os novos dados.` });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar cláusulas", description: e.message, variant: "destructive" });
    }
  };

  // Botão geral: refaz as cláusulas que divergem do modelo com os dados atuais
  const refreshAllFromData = async () => {
    const map = buildMap();
    if (!map) { toast({ title: "Aguarde o carregamento dos dados do contrato e tente de novo" }); return; }
    const differing = (snapshots || []).filter((s: any) => {
      const src = s.source_clause_id ? sourceMap.get(s.source_clause_id) : null;
      if (!src || !/\{\{/.test(src.body)) return false;
      return resolvePlaceholders(src.body, map).trim() !== (s.body || "").trim();
    });
    if (!differing.length) { toast({ title: "Tudo em dia", description: "Nenhuma cláusula está diferente do modelo com os dados atuais." }); return; }
    const titles = differing.map((s: any) => `• ${s.title}`).join("\n");
    if (!confirm(`Estas cláusulas estão diferentes do modelo com os dados atuais:\n\n${titles}\n\nRefazer o texto delas? Alterações manuais nelas serão substituídas.`)) return;
    try {
      await regenerateClauses(differing);
      toast({ title: "Cláusulas atualizadas", description: `${differing.length} cláusula(s) refeita(s).` });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar cláusulas", description: e.message, variant: "destructive" });
    }
  };

  const saveContractFields = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("contracts").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract", id] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ── status transitions ────────────────────────────────────
  const transition = useMutation({
    mutationFn: async (to: "em_revisao" | "aprovado" | "sent" | "cancelled") => {
      const patch: any = { status: to };
      const now = new Date().toISOString();
      let summary = `Status alterado para ${statusLabel[to]}`;
      if (to === "aprovado") {
        const { data: u } = await supabase.auth.getUser();
        patch.approved_at = now;
        patch.approved_by = u?.user?.id || null;
        summary = "Contrato aprovado";
      } else if (to === "sent") {
        patch.sent_at = now;
        patch.finalized_at = now;
        summary = "Contrato enviado para assinatura";
      } else if (to === "cancelled") {
        patch.cancelled_at = now;
        summary = "Contrato cancelado";
      } else if (to === "em_revisao") {
        summary = "Enviado para revisão";
      }
      const { error } = await supabase.from("contracts").update(patch).eq("id", id!);
      if (error) throw error;
      await createContractVersion({ contractId: id!, changeSummary: summary });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", id] });
      qc.invalidateQueries({ queryKey: ["contract-versions", id] });
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro ao alterar status", description: e.message, variant: "destructive" }),
  });

  const newVersionForEdit = useMutation({
    mutationFn: async () => {
      // Snapshot current state, then unlock by moving to em_revisao
      await createContractVersion({
        contractId: id!,
        changeSummary: `Nova versão para edição a partir de ${statusLabel[status!]}`,
      });
      const { error } = await supabase.from("contracts").update({ status: "em_revisao" }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", id] });
      qc.invalidateQueries({ queryKey: ["contract-versions", id] });
      toast({ title: "Nova versão criada — contrato liberado para edição" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract-pdf", { body: { contractId: id } });
      if (error) throw error;
      if (!data?.pdf_base64) throw new Error(data?.error || "Resposta inválida do servidor");
      const bin = atob(data.pdf_base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const filename = `${data.contract_number || "contrato"}.pdf`;
      const url = URL.createObjectURL(blob);
      // Open in new tab
      const win = window.open(url, "_blank");
      if (!win) {
        // Popup blocked → force download
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      toast({ title: "PDF gerado", description: filename });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e?.message || "Erro desconhecido", variant: "destructive" });
    } finally { setGeneratingPdf(false); }
  };



  const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // O Storage recusa colchetes, acentos etc. no nome ("Invalid key"): usa um nome seguro
      const path = `${id}/signed-${Date.now()}-${sanitizeStorageFileName(file.name)}`;
      const { error: upErr } = await supabase.storage.from("contracts").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      await saveContractFields.mutateAsync({
        signed_pdf_url: path,
        signed_at: new Date().toISOString(),
        status: "signed",
      });
      await createContractVersion({ contractId: id!, changeSummary: "Contrato assinado (upload)" });
      toast({ title: "PDF assinado anexado" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  if (isLoading || !contract) return <div className="p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/contratos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {contract.contract_number}
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </h1>
          <p className="text-sm text-muted-foreground">
            Proposta {(contract as any).quotes?.quote_number} · {(contract as any).quotes?.clients?.nome_fantasia || (contract as any).quotes?.clients?.razao_social}
            {" · "}v{(contract as any).current_version || 1}
          </p>
        </div>
        <Badge variant={statusVariant[contract.status]} className={`status-badge-${contract.status}`}>{statusLabel[contract.status]}</Badge>
      </div>

      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
          {generatingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Gerar PDF
        </Button>
        <Button variant="outline" onClick={() => setShowHistory(true)}>
          <History className="h-4 w-4 mr-2" /> Histórico de versões
        </Button>

        {status === "draft" && (
          <Button variant="secondary" onClick={() => transition.mutate("em_revisao")} disabled={transition.isPending}>
            <Send className="h-4 w-4 mr-2" /> Enviar para revisão
          </Button>
        )}
        {status === "em_revisao" && (
          <Button onClick={() => transition.mutate("aprovado")} disabled={transition.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
          </Button>
        )}
        {/* Com o Autentique ativo, o envio é feito pelo cartão "Assinatura digital" (abaixo) */}
        {status === "aprovado" && !autentique.active && (
          <Button onClick={() => transition.mutate("sent")} disabled={transition.isPending}>
            <Send className="h-4 w-4 mr-2" /> Enviar para assinatura
          </Button>
        )}
        {(status === "aprovado" || status === "sent") && (
          <Button variant="secondary" onClick={() => {
            if (confirm("Criar uma nova versão para permitir edição? O contrato voltará para 'Em revisão' (versões anteriores continuam preservadas).")) {
              newVersionForEdit.mutate();
            }
          }} disabled={newVersionForEdit.isPending}>
            <GitBranch className="h-4 w-4 mr-2" /> Criar nova versão para alteração
          </Button>
        )}
        {status !== "signed" && status !== "cancelled" && (
          <Button variant="destructive" onClick={() => {
            if (confirm("Cancelar este contrato? Essa ação não pode ser desfeita.")) transition.mutate("cancelled");
          }} disabled={transition.isPending}>
            <Ban className="h-4 w-4 mr-2" /> Cancelar contrato
          </Button>
        )}

        {status !== "signed" && (
          <label>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleUploadSigned} disabled={uploading} />
            <Button variant="default" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Anexar PDF assinado
              </span>
            </Button>
          </label>
        )}
        {contract.signed_pdf_url && (
          <Button variant="ghost" onClick={async () => {
            const { data } = await supabase.storage.from("contracts").createSignedUrl(contract.signed_pdf_url!, 60);
            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
          }}>Baixar assinado</Button>
        )}
      </div>

      {isLocked && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-200 p-3.5 text-sm text-amber-900 flex items-start gap-2 shadow-sm">
          <Lock className="h-4 w-4 mt-0.5" />
          <div>
            Contrato em estado <strong>{statusLabel[status!]}</strong> — edição direta bloqueada.
            {!isSigned && " Para alterar, use \"Criar nova versão para alteração\"."}
          </div>
        </div>
      )}

      <ContractSignatureCard
        contract={contract}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["contract", id] });
          qc.invalidateQueries({ queryKey: ["contract-versions", id] });
        }}
      />

      <ContractRentalCard contract={contract as any} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestores do contrato</CardTitle>
          <p className="text-xs text-muted-foreground">
            Recebem notas fiscais, boletos e comunicações. Os representantes legais que assinam ficam em "Signatários", abaixo.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {([
            ["Vendedora", "seller_manager"],
            ["Compradora", "buyer_manager"],
          ] as const).map(([side, prefix]) => (
            <div key={prefix} className="space-y-2">
              <h4 className="text-sm font-semibold">{side}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ["Nome", `${prefix}_name`, undefined, "text"],
                  ["CPF", `${prefix}_cpf`, formatCPF, "numeric"],
                  ["Telefone", `${prefix}_phone`, formatPhone, "tel"],
                  ["E-mail (notas fiscais e boletos)", `${prefix}_email`, undefined, "email"],
                ] as const).map(([label, key, mask, mode]) => (
                  <div key={key}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      defaultValue={(contract as any)[key] || ""}
                      inputMode={mode as any}
                      disabled={isLocked}
                      onChange={(e) => { if (mask) e.target.value = mask(e.target.value); }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== ((contract as any)[key] || "")) {
                          if (key.endsWith("_cpf") && v && !isValidCPF(v)) {
                            toast({ title: "CPF parece inválido", description: `Confira o CPF do gestor da ${side.toLowerCase()}.`, variant: "destructive" });
                          }
                          saveContractFields.mutate({ [key]: v || null });
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <SignatoriesEditor contractId={id!} isLocked={isLocked} />
      <WitnessesEditor contractId={id!} isLocked={isLocked} />

      <ContractDataCard
        contract={contract}
        quoteTotal={quoteTotal}
        structuredServices={structuredServices}
        isLocked={isLocked}
        onSaved={handleDataSaved}
      />

      {(contract as any).quote_id && (
        <ContractScopePreview quoteId={(contract as any).quote_id} />
      )}


      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Cláusulas</h2>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refreshAllFromData} disabled={!mapReady}
              title="Refaz o texto das cláusulas que estão diferentes do modelo com os dados atuais do contrato">
              <RefreshCw className="h-3 w-3 mr-1" /> Atualizar com dados atuais
            </Button>
            <Button size="sm" variant="outline" onClick={addClause}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar cláusula
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {snapshots?.map((s, idx) => (
          <ClauseCard
            key={s.id}
            snapshot={s}
            index={idx}
            total={snapshots.length}
            isLocked={isLocked}
            source={s.source_clause_id ? resolvedSourceMap.get(s.source_clause_id) : undefined}
            onSave={(patch) => updateClause(s.id, patch)}
            onMove={(dir) => reorderClause(idx, dir)}
            onRemove={() => removeClause(s.id, s.is_core)}
            onRestoreDefault={() => restoreDefault(s)}
          />
        ))}
      </div>

      <VersionHistoryDialog
        contractId={id!}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onView={(v) => setViewingVersion(v)}
        canRestore={!isSigned}
        onRestored={() => {
          refetchSnapshots();
          qc.invalidateQueries({ queryKey: ["contract", id] });
        }}
      />
      <ViewVersionDialog version={viewingVersion} onClose={() => setViewingVersion(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Clause Card with autosave + toolbar + personalized indicator
// ─────────────────────────────────────────────────────────
type SaveState = "idle" | "saving" | "saved" | "error";

function ClauseCard({
  snapshot, index, total, isLocked, source, onSave, onMove, onRemove, onRestoreDefault,
}: {
  snapshot: any;
  index: number;
  total: number;
  isLocked: boolean;
  source?: { title: string; body: string; resolved?: boolean };
  onSave: (patch: { body?: string; title?: string }) => Promise<void>;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onRestoreDefault: () => void;
}) {
  const [title, setTitle] = useState(snapshot.title);
  const [body, setBody] = useState(snapshot.body);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title: snapshot.title, body: snapshot.body });

  // If snapshot changes from outside (e.g. restore), sync
  useEffect(() => {
    setTitle(snapshot.title);
    setBody(snapshot.body);
    lastSaved.current = { title: snapshot.title, body: snapshot.body };
    setSaveState("idle");
  }, [snapshot.id, snapshot.title, snapshot.body]);

  const scheduleSave = (nextTitle: string, nextBody: string) => {
    if (isLocked) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      const patch: { body?: string; title?: string } = {};
      if (nextTitle !== lastSaved.current.title) patch.title = nextTitle;
      if (nextBody !== lastSaved.current.body) patch.body = nextBody;
      if (Object.keys(patch).length === 0) { setSaveState("saved"); return; }
      try {
        await onSave(patch);
        lastSaved.current = { title: nextTitle, body: nextBody };
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1500);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Só compara quando o modelo já está preenchido com os dados do contrato; antes de carregar,
  // o texto do modelo traz {{campos}} e TODA cláusula pareceria "personalizada".
  const isPersonalized = !!source && source.resolved !== false && source.body.trim() !== (snapshot.body || "").trim();

  const wrap = (before: string, after = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const sel = body.slice(start, end);
    const next = body.slice(0, start) + before + sel + after + body.slice(end);
    setBody(next);
    scheduleSave(title, next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = end + before.length;
    });
  };

  const insertList = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = body.slice(0, start);
    const after = body.slice(start);
    const needsNl = before && !before.endsWith("\n");
    const insert = (needsNl ? "\n" : "") + "- ";
    const next = before + insert + after;
    setBody(next);
    scheduleSave(title, next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + insert.length;
    });
  };

  const label = index === 0 ? "—" : String(index);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground w-8">{label}</span>
          <Input
            value={title}
            disabled={isLocked}
            onChange={(e) => { setTitle(e.target.value); scheduleSave(e.target.value, body); }}
            className="font-semibold"
          />
          {snapshot.is_core && <Badge variant="outline" className="text-[10px] rounded-full">núcleo</Badge>}
          {isPersonalized && (
            <Badge variant="secondary" className="text-[10px] rounded-full" title="O texto difere do modelo padrão preenchido com os dados atuais do contrato">
              personalizada
            </Badge>
          )}
          {!isLocked && (
            <>
              <Button variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === total - 1}><ArrowDown className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" onClick={onRemove} disabled={snapshot.is_core}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isLocked && (
          <div className="flex items-center gap-1 border rounded-full p-1 bg-muted/30 w-fit">
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("**")} title="Negrito">
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={insertList} title="Item de lista">
              <List className="h-3.5 w-3.5" />
            </Button>
            {source && isPersonalized && (
              <Button type="button" variant="ghost" size="sm" onClick={onRestoreDefault} className="text-xs" title="Restaurar texto do modelo">
                <RotateCcw className="h-3 w-3 mr-1" /> Restaurar padrão
              </Button>
            )}
          </div>
        )}
        <Textarea
          ref={textareaRef}
          value={body}
          disabled={isLocked}
          rows={Math.min(20, Math.max(4, (body || "").split("\n").length))}
          onChange={(e) => { setBody(e.target.value); scheduleSave(title, e.target.value); }}
          className="font-mono text-xs whitespace-pre-wrap"
        />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-h-[16px]">
          {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>}
          {saveState === "saved" && <><CheckCircle2 className="h-3 w-3 text-green-600" /> Alterações salvas</>}
          {saveState === "error" && <><AlertCircle className="h-3 w-3 text-destructive" /> Erro ao salvar — tente novamente</>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Version history dialogs
// ─────────────────────────────────────────────────────────
function VersionHistoryDialog({
  contractId, open, onClose, onView, canRestore, onRestored,
}: {
  contractId: string;
  open: boolean;
  onClose: () => void;
  onView: (v: any) => void;
  canRestore: boolean;
  onRestored: () => void;
}) {
  const qc = useQueryClient();
  const { data: versions } = useQuery({
    queryKey: ["contract-versions", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_versions")
        .select("*, profiles:created_by(name, email)")
        .eq("contract_id", contractId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const restore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Restaurar o conteúdo da versão ${versionNumber}? Uma nova versão será criada preservando o estado atual e as versões anteriores permanecem no histórico.`)) return;
    try {
      await restoreContractVersion({ contractId, versionId });
      qc.invalidateQueries({ queryKey: ["contract-versions", contractId] });
      qc.invalidateQueries({ queryKey: ["contract-snapshots", contractId] });
      qc.invalidateQueries({ queryKey: ["contract", contractId] });
      qc.invalidateQueries({ queryKey: ["contract-signatories", contractId] });
      qc.invalidateQueries({ queryKey: ["contract-witnesses", contractId] });
      toast({ title: "Versão restaurada" });
      onRestored();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao restaurar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico de versões</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {(versions || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma versão registrada ainda.</p>}
          {(versions || []).map((v: any) => (
            <div key={v.id} className="flex items-center justify-between border rounded-xl p-3 transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <div className="text-sm font-semibold">v{v.version_number} · {v.change_summary || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(v.created_at).toLocaleString("pt-BR")} · {v.profiles?.name || v.profiles?.email || "sistema"}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => onView(v)}>Visualizar</Button>
                {canRestore && (
                  <Button size="sm" variant="secondary" onClick={() => restore(v.id, v.version_number)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewVersionDialog({ version, onClose }: { version: any | null; onClose: () => void }) {
  if (!version) return null;
  const clauses = (version.clauses_data as any[]) || [];
  return (
    <Dialog open={!!version} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Versão {version.version_number} — {version.change_summary || "snapshot"}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">
          Criada em {new Date(version.created_at).toLocaleString("pt-BR")} (somente leitura)
        </div>
        <div className="space-y-3">
          {clauses.sort((a, b) => a.order_index - b.order_index).map((c: any, i: number) => (
            <div key={c.id || i} className="border rounded-xl p-3 bg-muted/20">
              <div className="text-sm font-semibold mb-1">{i === 0 ? "—" : i}. {c.title}</div>
              <pre className="whitespace-pre-wrap font-mono text-xs">{c.body}</pre>
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Signatories (multi per side)
// ─────────────────────────────────────────────────────────
function SignatoriesEditor({ contractId, isLocked }: { contractId: string; isLocked: boolean }) {
  const { data: rows, refetch } = useQuery({
    queryKey: ["contract-signatories", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_signatories")
        .select("*").eq("contract_id", contractId).order("side").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const add = async (side: "seller" | "buyer") => {
    const idx = (rows || []).filter((r: any) => r.side === side).length;
    await supabase.from("contract_signatories").insert({
      contract_id: contractId, side, name: "", cpf: "", order_index: idx,
    });
    refetch();
  };
  const upd = async (id: string, patch: any) => {
    await supabase.from("contract_signatories").update(patch).eq("id", id);
    refetch();
  };
  const del = async (id: string) => {
    await supabase.from("contract_signatories").delete().eq("id", id);
    refetch();
  };

  const renderSide = (side: "seller" | "buyer", label: string) => {
    const list = (rows || []).filter((r: any) => r.side === side);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{label}</h4>
          {!isLocked && (
            <Button variant="outline" size="sm" onClick={() => add(side)}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
        {list.length === 0 && <p className="text-xs text-muted-foreground">Nenhum representante.</p>}
        {list.map((s: any) => (
          <div key={s.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <div><Label className="text-xs">Nome</Label><Input defaultValue={s.name} disabled={isLocked} onBlur={(e) => e.target.value !== s.name && upd(s.id, { name: e.target.value })} /></div>
            <div><Label className="text-xs">CPF</Label><Input defaultValue={formatCPF(s.cpf || "")} inputMode="numeric" placeholder="000.000.000-00" disabled={isLocked}
              onChange={(e) => { e.target.value = formatCPF(e.target.value); }}
              onBlur={(e) => { const v = e.target.value; if (v !== (s.cpf || "")) { warnIfBadCpf(v, s.name); upd(s.id, { cpf: v }); } }} /></div>
            <div><Label className="text-xs">RG</Label><Input defaultValue={s.rg || ""} disabled={isLocked} onBlur={(e) => e.target.value !== (s.rg || "") && upd(s.id, { rg: e.target.value || null })} /></div>
            <div><Label className="text-xs">Cargo</Label><Input defaultValue={s.cargo || ""} disabled={isLocked} onBlur={(e) => e.target.value !== (s.cargo || "") && upd(s.id, { cargo: e.target.value || null })} /></div>
            {!isLocked && (
              <Button variant="ghost" size="icon" onClick={() => del(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Signatários</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {renderSide("seller", "Pela Vendedora")}
        <Separator />
        {renderSide("buyer", "Pela Compradora")}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Witnesses
// ─────────────────────────────────────────────────────────
function WitnessesEditor({ contractId, isLocked }: { contractId: string; isLocked: boolean }) {
  const { data: rows, refetch } = useQuery({
    queryKey: ["contract-witnesses", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_witnesses")
        .select("*").eq("contract_id", contractId).order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const add = async () => {
    const idx = (rows || []).length;
    await supabase.from("contract_witnesses").insert({ contract_id: contractId, name: "", cpf: "", order_index: idx });
    refetch();
  };
  const upd = async (id: string, patch: any) => {
    await supabase.from("contract_witnesses").update(patch).eq("id", id);
    refetch();
  };
  const del = async (id: string) => {
    await supabase.from("contract_witnesses").delete().eq("id", id);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Testemunhas</CardTitle>
          {!isLocked && (
            <Button variant="outline" size="sm" onClick={add}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar testemunha
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(rows || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhuma testemunha.</p>}
        {(rows || []).map((w: any) => (
          <div key={w.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
            <div><Label className="text-xs">Nome</Label><Input defaultValue={w.name} disabled={isLocked} onBlur={(e) => e.target.value !== w.name && upd(w.id, { name: e.target.value })} /></div>
            <div><Label className="text-xs">CPF</Label><Input defaultValue={formatCPF(w.cpf || "")} inputMode="numeric" placeholder="000.000.000-00" disabled={isLocked}
              onChange={(e) => { e.target.value = formatCPF(e.target.value); }}
              onBlur={(e) => { const v = e.target.value; if (v !== (w.cpf || "")) { warnIfBadCpf(v, w.name); upd(w.id, { cpf: v }); } }} /></div>
            <div><Label className="text-xs">E-mail</Label><Input defaultValue={w.email || ""} disabled={isLocked} onBlur={(e) => e.target.value !== (w.email || "") && upd(w.id, { email: e.target.value || null })} /></div>
            {!isLocked && (
              <Button variant="ghost" size="icon" onClick={() => del(w.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
