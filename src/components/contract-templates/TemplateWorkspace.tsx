import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, Loader2, Pencil, Plus, Save, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CONTRACT_TYPE_LABEL, type ContractType } from "@/lib/contractFields";
import { buildSampleMap } from "@/lib/contractSample";
import {
  cloneClauseRows, clauseIsDirty, countChanges, defaultTemplate, moveClause, newClause, parseStoredDraft, planSave,
  reconcileStoredDraft, referenceWarnings, saveTemplateChanges, serializeDraft, toDraft, validateDraft,
  type DraftClause, type ServerClause,
} from "@/lib/contractTemplateDraft";
import { ClauseEditorCard } from "./ClauseEditorCard";
import { ContractPaper } from "./ContractPaper";
import { HowItWorks } from "./HowItWorks";
import { VersionBar, type CompanyRow, type TemplateRow } from "./VersionBar";

const storageKey = (templateId: string) => `soima:contract-draft:${templateId}`;
const readStored = (templateId: string) => {
  try {
    return localStorage.getItem(storageKey(templateId));
  } catch {
    return null;
  }
};
const writeStored = (templateId: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(storageKey(templateId));
    else localStorage.setItem(storageKey(templateId), value);
  } catch {
    /* sem armazenamento local: o rascunho só não é guardado */
  }
};
const errMsg = (e: any) => e?.message || "Tente novamente em instantes.";

interface Props {
  type: ContractType;
  /** avisa a página quando há alterações não salvas (para confirmar antes de trocar de aba) */
  onDirtyChange?: (dirty: boolean) => void;
}

export default function TemplateWorkspace({ type, onDirtyChange }: Props) {
  const qc = useQueryClient();
  const typeLabel = CONTRACT_TYPE_LABEL[type];
  const sample = useMemo(() => buildSampleMap(new Date()), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftClause[]>([]);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<DraftClause[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: templates, isLoading: loadingTemplates, error: templatesError } = useQuery({
    queryKey: ["contract-templates", type],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_templates").select("*").eq("contract_type", type).order("version", { ascending: false });
      if (error) throw error;
      return (data || []) as TemplateRow[];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["company-settings-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("id, razao_social, company_name").order("razao_social");
      if (error) throw error;
      return (data || []) as CompanyRow[];
    },
  });

  const active = (templates && (templates.find((t) => t.id === selectedId) ?? defaultTemplate(templates))) || undefined;

  const { data: serverRows, refetch: refetchClauses, error: clausesError } = useQuery({
    queryKey: ["contract-clauses", active?.id],
    enabled: !!active,
    refetchOnWindowFocus: false, // não troca o texto por baixo de quem está digitando
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_clauses").select("*").eq("template_id", active!.id).order("order_index");
      if (error) throw error;
      return (data || []) as ServerClause[];
    },
  });
  const server: ServerClause[] = useMemo(() => serverRows ?? [], [serverRows]);

  // Carrega o rascunho quando troca de versão (e oferece recuperar o que ficou sem salvar da última vez)
  useEffect(() => {
    if (!active || !serverRows || baseId === active.id) return;
    setDraft(toDraft(serverRows));
    setBaseId(active.id);
    setActiveUid(null);
    setRecovery(reconcileStoredDraft(serverRows, parseStoredDraft(readStored(active.id))));
  }, [active, serverRows, baseId]);

  const ready = !!active && baseId === active.id;
  const plan = useMemo(() => planSave(server, draft), [server, draft]);
  const changes = countChanges(plan);
  const dirty = ready && changes > 0;
  const problems = useMemo(() => validateDraft(draft), [draft]);
  const warnings = useMemo(() => (ready ? referenceWarnings(server, draft) : []), [ready, server, draft]);

  // Guarda o rascunho no navegador enquanto há alterações (rede de segurança contra fechar a aba sem querer)
  useEffect(() => {
    if (!ready || !active || recovery) return;
    writeStored(active.id, dirty ? serializeDraft(draft) : null);
  }, [ready, active, draft, dirty, recovery]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ───── ações sobre as cláusulas (só mexem no rascunho) ─────
  const patchClause = (uid: string, patch: Partial<DraftClause>) => setDraft((d) => d.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));
  const moveAt = (index: number, delta: -1 | 1) => setDraft((d) => moveClause(d, index, delta));
  const removeAt = (index: number) => {
    setDraft((d) => d.filter((_, i) => i !== index));
    setActiveUid(null);
  };
  const addClause = () => {
    const c = newClause({ title: "Nova cláusula" });
    setDraft((d) => [...d, c]);
    setActiveUid(c.uid);
    setMobileView("edit");
  };

  // clicar numa cláusula (na lista ou na folha) abre a edição e leva a outra metade até ela
  const activate = (uid: string, from: "list" | "paper") => {
    setActiveUid(uid);
    if (from === "paper" && typeof window !== "undefined" && !window.matchMedia?.("(min-width: 1024px)").matches) setMobileView("edit");
  };
  useEffect(() => {
    if (!activeUid) return;
    const raf = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-editor-uid="${activeUid}"]`)?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
      const box = previewRef.current;
      const el = box?.querySelector<HTMLElement>(`[data-preview-uid="${activeUid}"]`);
      if (box && el && box.scrollHeight > box.clientHeight) box.scrollTo?.({ top: Math.max(0, el.offsetTop - 16), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeUid]);

  // ───── salvar / descartar ─────
  const save = async () => {
    if (!active || saving || !dirty || problems.length) return;
    setSaving(true);
    const activeIndex = draft.findIndex((c) => c.uid === activeUid);
    try {
      await saveTemplateChanges(supabase, active.id, plan);
      const { data, error } = await refetchClauses();
      if (error) throw error;
      const fresh = toDraft(data as ServerClause[]);
      setDraft(fresh);
      setActiveUid(activeIndex >= 0 ? fresh[activeIndex]?.uid ?? null : null);
      writeStored(active.id, null);
      toast({ title: "Modelo salvo", description: `${changes} ${changes === 1 ? "alteração salva" : "alterações salvas"}. Valem para os contratos novos desta versão.` });
    } catch (e: any) {
      await refetchClauses(); // pode ter gravado uma parte: mostra o que ficou valendo, sem perder o que foi digitado
      toast({ title: "Não foi possível salvar tudo", description: `${errMsg(e)} Suas alterações continuam na tela; tente salvar de novo.`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!active) return;
    setDraft(toDraft(server));
    setActiveUid(null);
    writeStored(active.id, null);
    setConfirmDiscard(false);
  };

  // ───── trocar de versão ─────
  const requestSelect = (id: string) => {
    if (!active || id === active.id) return;
    if (dirty) setPendingSelect(id);
    else setSelectedId(id);
  };
  const confirmSelect = () => {
    if (active) writeStored(active.id, null);
    setSelectedId(pendingSelect);
    setPendingSelect(null);
  };

  // ───── ações sobre a versão (gravam na hora, depois de confirmar na tela) ─────
  const refreshTemplates = () => {
    qc.invalidateQueries({ queryKey: ["contract-templates", type] });
    qc.invalidateQueries({ queryKey: ["contract-templates-for-quote"] });
  };

  const toggleActive = async (next: boolean) => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.from("contract_templates").update({ is_active: next }).eq("id", active.id);
    setBusy(false);
    if (error) return toast({ title: "Não foi possível alterar", description: errMsg(error), variant: "destructive" });
    refreshTemplates();
    toast({ title: next ? `v${active.version} ativada` : `v${active.version} desativada` });
  };

  const changeCompany = async (companyId: string | null) => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.from("contract_templates").update({ company_id: companyId }).eq("id", active.id);
    setBusy(false);
    if (error) return toast({ title: "Não foi possível alterar a empresa", description: errMsg(error), variant: "destructive" });
    refreshTemplates();
    toast({ title: "Empresa do modelo atualizada" });
  };

  const newVersion = async () => {
    if (!active || !templates || dirty) return;
    setBusy(true);
    const next = Math.max(0, ...templates.map((t) => t.version)) + 1;
    const { data: created, error } = await supabase
      .from("contract_templates")
      .insert({ name: `${active.name.replace(/\s\(v\d+\)$/, "")} (v${next})`, contract_type: type, version: next, is_active: false, company_id: active.company_id })
      .select()
      .single();
    if (error || !created) {
      setBusy(false);
      return toast({ title: "Não foi possível criar a versão", description: errMsg(error), variant: "destructive" });
    }
    if (server.length) {
      const { error: cErr } = await supabase.from("contract_clauses").insert(cloneClauseRows(server, created.id));
      if (cErr) {
        await supabase.from("contract_templates").delete().eq("id", created.id); // não deixa uma versão vazia pela metade
        setBusy(false);
        return toast({ title: "Não foi possível copiar as cláusulas", description: errMsg(cErr), variant: "destructive" });
      }
    }
    setBusy(false);
    refreshTemplates();
    setSelectedId(created.id);
    toast({ title: `Versão v${next} criada`, description: "É uma cópia desta, desativada. Edite à vontade e ative quando estiver pronta." });
  };

  const createFirst = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .insert({ name: `Contrato de ${typeLabel} (v1)`, contract_type: type, version: 1, is_active: false })
      .select()
      .single();
    setBusy(false);
    if (error || !data) return toast({ title: "Não foi possível criar o modelo", description: errMsg(error), variant: "destructive" });
    refreshTemplates();
    setSelectedId(data.id);
  };

  // ───── tela ─────
  if (loadingTemplates) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (templatesError) {
    return <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar os modelos. {errMsg(templatesError)}</div>;
  }
  if (!templates || templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">Ainda não existe um modelo de contrato de {typeLabel.toLowerCase()}.</p>
        <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro e depois adicione as cláusulas. Ele começa desativado.</p>
        <Button className="mt-4" onClick={createFirst} disabled={busy}><Plus className="mr-1.5 h-4 w-4" /> Criar modelo de {typeLabel.toLowerCase()}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <HowItWorks />

      {active && (
        <VersionBar
          typeLabel={typeLabel}
          templates={templates}
          activeId={active.id}
          companies={companies || []}
          busy={busy}
          dirty={dirty}
          onSelect={requestSelect}
          onNewVersion={newVersion}
          onToggleActive={toggleActive}
          onChangeCompany={changeCompany}
        />
      )}

      {recovery && active && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="min-w-0 flex-1">Você tinha alterações não salvas desta versão. Quer recuperar?</span>
          <Button size="sm" onClick={() => { setDraft(recovery); setRecovery(null); }}>Recuperar</Button>
          <Button size="sm" variant="outline" onClick={() => { writeStored(active.id, null); setRecovery(null); }}>Descartar</Button>
        </div>
      )}

      {clausesError && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">Não foi possível carregar as cláusulas. {errMsg(clausesError)}</div>}

      {!ready && !clausesError && <Skeleton className="h-64 w-full" />}

      {ready && (
        <>
          {warnings.length > 0 && (
            <div role="alert" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                Você mudou a ordem ou a quantidade de cláusulas. Os textos abaixo citam outras cláusulas pelo <strong>número</strong>, que pode ter mudado. Confira antes de salvar:
                <ul className="mt-1 list-disc pl-5">
                  {warnings.map((w) => (
                    <li key={w.title}>“{w.title}” cita a cláusula {w.refs.join(", ")}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 lg:hidden" role="tablist" aria-label="O que mostrar">
            {(["edit", "preview"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={mobileView === v} onClick={() => setMobileView(v)}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium ${mobileView === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                {v === "edit" ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {v === "edit" ? "Editar" : "Ver o contrato"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <section className={`min-w-0 space-y-2 ${mobileView === "edit" ? "" : "hidden lg:block"}`} aria-label="Cláusulas">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Cláusulas <span className="font-normal text-muted-foreground">({draft.length})</span></h3>
                <Button size="sm" variant="outline" onClick={addClause}><Plus className="mr-1.5 h-3.5 w-3.5" /> Cláusula</Button>
              </div>
              {draft.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma cláusula. Clique em “Cláusula” para adicionar a primeira.</p>}
              {draft.map((c, i) => (
                <ClauseEditorCard
                  key={c.uid}
                  clause={c}
                  index={i}
                  total={draft.length}
                  active={c.uid === activeUid}
                  dirty={clauseIsDirty(server, c)}
                  problem={problems.find((p) => p.uid === c.uid)?.message}
                  sample={sample}
                  onActivate={() => activate(c.uid, "list")}
                  onChange={(patch) => patchClause(c.uid, patch)}
                  onMove={(delta) => moveAt(i, delta)}
                  onRemove={() => removeAt(i)}
                />
              ))}
              {draft.length > 0 && (
                <Button variant="outline" className="w-full border-dashed" onClick={addClause}><Plus className="mr-1.5 h-4 w-4" /> Adicionar cláusula</Button>
              )}
            </section>

            <section className={`min-w-0 ${mobileView === "preview" ? "" : "hidden lg:block"}`} aria-label="Visualização do contrato">
              <div className="mb-2 text-sm text-muted-foreground">Assim o contrato vai sair, com <strong className="text-foreground">dados de exemplo</strong>. Clique numa cláusula para editar.</div>
              <div ref={previewRef} className="relative lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
                <ContractPaper clauses={draft} sample={sample} activeUid={activeUid} onSelect={(uid) => activate(uid, "paper")} />
              </div>
            </section>
          </div>
        </>
      )}

      {dirty && (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:gap-3" role="status" aria-label="Alterações pendentes">
          <div className="w-full min-w-0 text-sm sm:w-auto sm:flex-1">
            <span className="font-medium">{changes} {changes === 1 ? "alteração não salva" : "alterações não salvas"}</span>
            {problems.length > 0 ? (
              <span className="block text-xs text-destructive">Dê um título a todas as cláusulas para poder salvar.</span>
            ) : (
              <span className="block text-xs text-muted-foreground">Nada muda no sistema até você salvar.</span>
            )}
          </div>
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setConfirmDiscard(true)} disabled={saving}><Undo2 className="mr-1.5 h-4 w-4" /> Descartar</Button>
          <Button className="flex-1 sm:flex-none" onClick={save} disabled={saving || problems.length > 0}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar as alterações?</AlertDialogTitle>
            <AlertDialogDescription>O modelo volta ao que está salvo. As {changes} {changes === 1 ? "alteração feita" : "alterações feitas"} nesta tela serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={discard}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingSelect !== null} onOpenChange={(o) => !o && setPendingSelect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar de versão sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>Há {changes} {changes === 1 ? "alteração não salva" : "alterações não salvas"} nesta versão. Se trocar agora, elas serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ficar aqui</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelect}>Trocar e descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
