import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Save, Send, XCircle } from "lucide-react";
import { callProposalEmail, useEmailIntegration } from "@/hooks/useEmailIntegration";
import { SMTP_PRESETS } from "@/lib/proposalEmail";
import { useAuth } from "@/contexts/AuthContext";

interface FormState {
  enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_security: "ssl" | "starttls";
  smtp_username: string;
  smtp_password: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  bcc_email: string;
  signature_text: string;
  require_admin_approval: boolean;
}

const EMPTY: FormState = {
  enabled: false, smtp_host: "", smtp_port: "465", smtp_security: "ssl", smtp_username: "", smtp_password: "",
  from_name: "SOIMA BR", from_email: "", reply_to: "", bcc_email: "", signature_text: "", require_admin_approval: false,
};

/** Conexão da conta de e-mail da empresa, usada para enviar propostas aos clientes. */
export default function EmailIntegrationConfig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const availability = useEmailIntegration();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hasPassword, setHasPassword] = useState(false);
  const [preset, setPreset] = useState<string>("");
  const [testTo, setTestTo] = useState("");

  const ready = availability.dbReady && availability.deployed;

  const { data: settingsRes, isLoading } = useQuery({
    queryKey: ["email-integration-settings"],
    enabled: ready,
    queryFn: () => callProposalEmail({ action: "settings_get" }),
  });
  const saved = settingsRes?.settings || null;

  useEffect(() => {
    if (!settingsRes) return;
    const s = settingsRes.settings;
    setHasPassword(!!s?.has_password);
    if (s) {
      setForm({
        enabled: !!s.enabled,
        smtp_host: s.smtp_host || "",
        smtp_port: String(s.smtp_port || 465),
        smtp_security: s.smtp_security === "starttls" ? "starttls" : "ssl",
        smtp_username: s.smtp_username || "",
        smtp_password: "",
        from_name: s.from_name || "",
        from_email: s.from_email || "",
        reply_to: s.reply_to || "",
        bcc_email: s.bcc_email || "",
        signature_text: s.signature_text || "",
        require_admin_approval: !!s.require_admin_approval,
      });
    }
  }, [settingsRes]);

  useEffect(() => { if (!testTo && user?.email) setTestTo(user.email); }, [user?.email, testTo]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const applyPreset = (id: string) => {
    setPreset(id);
    const p = SMTP_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({ ...f, smtp_host: p.host || f.smtp_host, smtp_port: String(p.port), smtp_security: p.security }));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["email-integration-settings"] });
    qc.invalidateQueries({ queryKey: ["email-integration-availability"] });
  };

  const save = useMutation({
    mutationFn: () => callProposalEmail({ action: "settings_save", settings: { ...form, smtp_port: Number(form.smtp_port) } }),
    onSuccess: () => { toast({ title: "Configuração de e-mail salva" }); refresh(); },
    onError: (e: any) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" }),
  });

  const test = useMutation({
    mutationFn: () => callProposalEmail({ action: "settings_test", to: testTo }),
    onSuccess: (r: any) => {
      if (r?.ok) toast({ title: "E-mail de teste enviado", description: `Confira a caixa de ${r.to}.` });
      else toast({ title: "O teste falhou", description: r?.error || "Erro desconhecido", variant: "destructive" });
      refresh();
    },
    onError: (e: any) => toast({ title: "Não foi possível testar", description: e.message, variant: "destructive" }),
  });

  if (availability.isLoading) {
    return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // Ainda faltam passos de instalação (banco e/ou função)
  if (!ready) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Integração de e-mail</CardTitle>
          <CardDescription>
            Conecta o e-mail da empresa para enviar as propostas aos clientes. Falta concluir a instalação:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            {availability.dbReady ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" /> : <XCircle className="h-4 w-4 mt-0.5 text-amber-600" />}
            <span>Atualização do banco de dados (arquivo <code>supabase/manual/2026-11-18_email_integration.sql</code>)</span>
          </div>
          <div className="flex items-start gap-2">
            {availability.deployed ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" /> : <XCircle className="h-4 w-4 mt-0.5 text-amber-600" />}
            <span>Publicação da função <code>proposal-email</code> pelo chat do Lovable</span>
          </div>
          <p className="text-muted-foreground pt-2">O passo a passo está em <code>supabase/manual/LEIAME.md</code>.</p>
        </CardContent>
      </Card>
    );
  }

  const presetInfo = SMTP_PRESETS.find((p) => p.id === preset);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Integração de e-mail</CardTitle>
            {availability.configured
              ? <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">Conectado</Badge>
              : <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">Não conectado</Badge>}
          </div>
          <CardDescription>
            O e-mail da empresa envia as propostas aos clientes, com o PDF anexado e somente com autorização.
            A senha é guardada criptografada e nunca é exibida de novo.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>}

          {/* Servidor */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Servidor de e-mail (SMTP)</h3>
            <div className="max-w-md space-y-1">
              <Label className="text-xs">Provedor (preenche servidor e porta)</Label>
              <Select value={preset} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue placeholder="Escolha o seu provedor" /></SelectTrigger>
                <SelectContent>
                  {SMTP_PRESETS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {presetInfo && <p className="text-xs text-muted-foreground">{presetInfo.hint}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr] gap-3">
              <div>
                <Label className="text-xs">Servidor</Label>
                <Input placeholder="smtp.seudominio.com.br" value={form.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Porta</Label>
                <Input inputMode="numeric" value={form.smtp_port} onChange={(e) => set("smtp_port", e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label className="text-xs">Segurança</Label>
                <Select value={form.smtp_security} onValueChange={(v) => set("smtp_security", v as "ssl" | "starttls")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssl">SSL/TLS (porta 465)</SelectItem>
                    <SelectItem value="starttls">STARTTLS (porta 587)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Usuário (normalmente o próprio e-mail)</Label>
                <Input autoComplete="off" value={form.smtp_username} onChange={(e) => set("smtp_username", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Senha</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={hasPassword ? "•••••••• (salva — deixe em branco para manter)" : "Senha do e-mail"}
                  value={form.smtp_password}
                  onChange={(e) => set("smtp_password", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Remetente */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Remetente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome que o cliente vê</Label>
                <Input value={form.from_name} onChange={(e) => set("from_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">E-mail do remetente</Label>
                <Input type="email" placeholder="comercial@soimabrasil.com.br" value={form.from_email} onChange={(e) => set("from_email", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Responder para (opcional)</Label>
                <Input type="email" value={form.reply_to} onChange={(e) => set("reply_to", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cópia oculta de todo envio (opcional)</Label>
                <Input type="email" placeholder="arquivo@soimabrasil.com.br" value={form.bcc_email} onChange={(e) => set("bcc_email", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Assinatura no fim do e-mail (opcional)</Label>
              <Textarea rows={3} placeholder={"SOIMA BR Indústria e Comércio\n(62) 3314-2227 · www.soimabrasil.com.br"} value={form.signature_text} onChange={(e) => set("signature_text", e.target.value)} />
            </div>
          </section>

          {/* Regras */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Regras de envio</h3>
            <label className="flex items-start justify-between gap-4 rounded-lg border p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Exigir autorização de um administrador</div>
                <p className="text-xs text-muted-foreground">
                  Com isto ligado, o envio feito por um vendedor fica aguardando um administrador autorizar (em Aprovações).
                  Desligado, o vendedor autoriza o próprio envio na hora. Administradores sempre enviam direto.
                </p>
              </div>
              <Switch checked={form.require_admin_approval} onCheckedChange={(v) => set("require_admin_approval", v)} />
            </label>
            <label className="flex items-start justify-between gap-4 rounded-lg border p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Ativar envio de propostas por e-mail</div>
                <p className="text-xs text-muted-foreground">Enquanto desativado, o botão "Enviar ao cliente" não envia nada.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
            </label>
          </section>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testar a conexão</CardTitle>
          <CardDescription>Salve primeiro. O teste envia um e-mail simples para o endereço abaixo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input className="max-w-sm" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="seu@email.com" />
            <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !saved}>
              {test.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar e-mail de teste
            </Button>
          </div>
          {saved?.last_test_at && (
            <div className={`flex items-start gap-2 text-sm ${saved.last_test_ok ? "text-green-700" : "text-destructive"}`}>
              {saved.last_test_ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
              <span>
                Último teste em {new Date(saved.last_test_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}:{" "}
                {saved.last_test_ok ? "funcionou." : `falhou — ${saved.last_test_error || "erro desconhecido"}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
