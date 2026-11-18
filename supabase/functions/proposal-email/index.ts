// Integração de e-mail da empresa (SMTP) e envio de propostas ao cliente com autorização.
//
// Ações (todas exigem usuário logado):
//   status                → todos: o e-mail está conectado? exige aprovação de admin?
//   settings_get|save|test→ só administrador: configurar a conta e testar
//   request_send          → quem criou a proposta (ou admin): pede o envio, já com "Autorizo"
//   authorize|reject      → administrador: libera ou nega um envio que ficou aguardando
//   cancel|retry          → quem pediu (ou admin): cancela um pendente / tenta de novo um que falhou
//
// Segurança:
//  - a senha SMTP é guardada CRIPTOGRAFADA (AES-256-GCM, chave derivada do segredo do servidor)
//    e nunca é devolvida ao app;
//  - só se envia proposta FINALIZADA e com desconto aprovado;
//  - todo envio fica registrado (quem pediu, quem autorizou, quando, erro).
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SOIMA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo-white.webp";

// ───────────────────────── helpers puros (testáveis) ─────────────────────────

const EMAIL_RX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export const isValidEmail = (s: string) => EMAIL_RX.test((s || "").trim());

/** Normaliza uma lista de e-mails: minúsculas, sem repetidos, separando válidos e inválidos. */
export function normalizeEmails(list: unknown): { valid: string[]; invalid: string[] } {
  const raw = Array.isArray(list) ? list : [];
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const item of raw) {
    const e = String(item ?? "").trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    (isValidEmail(e) ? valid : invalid).push(e);
  }
  return { valid, invalid };
}

export const escHtml = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto simples → HTML seguro (parágrafos e quebras de linha). */
export function plainTextToHtml(text: string): string {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="color:#3f3f46;line-height:1.6;margin:0 0 14px;">${escHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export function buildEmailHtml(bodyText: string, signatureText: string | null | undefined): string {
  const sig = (signatureText || "").trim();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:#1a1a2e;padding:24px;text-align:center;"><img src="${SOIMA_LOGO_URL}" alt="SOIMA BR" height="48" style="height:48px;"/></td></tr>
      <tr><td style="padding:28px 32px;">
        ${plainTextToHtml(bodyText)}
        ${sig ? `<p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;border-top:1px solid #e4e4e7;padding-top:14px;">${escHtml(sig).replace(/\n/g, "<br/>")}</p>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function aesKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("soima-email-integration"), info: new TextEncoder().encode("v1") },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Criptografa a senha SMTP: "v1:" + base64(iv + texto cifrado). */
export async function encryptSecret(plain: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return `v1:${b64(out)}`;
}

export async function decryptSecret(stored: string, secret: string): Promise<string> {
  if (!stored.startsWith("v1:")) throw new Error("Formato de senha desconhecido");
  const raw = unb64(stored.slice(3));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, await aesKey(secret), raw.slice(12));
  return new TextDecoder().decode(pt);
}

// ───────────────────────── configuração e envio ─────────────────────────

interface SmtpConfig {
  host: string; port: number; security: "ssl" | "starttls"; username: string; password: string;
  fromName: string; fromEmail: string; replyTo: string | null; bcc: string | null; signature: string | null;
  requireApproval: boolean;
}

const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function loadRow(admin: any) {
  const { data } = await admin.from("email_integration").select("*").eq("id", true).maybeSingle();
  return data as any | null;
}

const rowIsComplete = (row: any) =>
  !!(row?.smtp_host && row.smtp_username && row.smtp_password_encrypted && row.from_email);

/** Monta a conta SMTP (decifrando a senha) a partir da linha salva. */
async function smtpFromRow(row: any): Promise<SmtpConfig> {
  const password = await decryptSecret(row.smtp_password_encrypted, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return {
    host: row.smtp_host, port: Number(row.smtp_port) || 465,
    security: row.smtp_security === "starttls" ? "starttls" : "ssl",
    username: row.smtp_username, password,
    fromName: row.from_name || "SOIMA BR", fromEmail: row.from_email,
    replyTo: row.reply_to || null, bcc: row.bcc_email || null, signature: row.signature_text || null,
    requireApproval: !!row.require_admin_approval,
  };
}

/** Conta SMTP pronta para uso, ou null se o e-mail ainda não foi conectado/ativado. */
async function loadSmtp(admin: any): Promise<SmtpConfig | null> {
  const row = await loadRow(admin);
  if (!row?.enabled || !rowIsComplete(row)) return null;
  return smtpFromRow(row);
}

async function sendMail(cfg: SmtpConfig, msg: {
  to: string[]; cc?: string[]; bcc?: string[]; subject: string; html: string; text: string;
  attachments?: { filename: string; contentBase64: string }[];
}) {
  const client = new SMTPClient({
    connection: {
      hostname: cfg.host,
      port: cfg.port,
      // 465 = TLS direto; 587 = começa sem TLS e sobe com STARTTLS
      tls: cfg.security === "ssl",
      auth: { username: cfg.username, password: cfg.password },
    },
  });
  try {
    await client.send({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to: msg.to,
      cc: msg.cc && msg.cc.length ? msg.cc : undefined,
      bcc: msg.bcc && msg.bcc.length ? msg.bcc : undefined,
      replyTo: cfg.replyTo || undefined,
      subject: msg.subject,
      content: msg.text,
      html: msg.html,
      attachments: (msg.attachments || []).map((a) => ({
        filename: a.filename, content: a.contentBase64, encoding: "base64", contentType: "application/pdf",
      })),
    });
  } finally {
    try { await client.close(); } catch { /* ignora */ }
  }
}

/** PDF da proposta (gerado pela função generate-pdf, com o login de quem está agindo). */
async function fetchProposalPdf(authHeader: string, quoteId: string) {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    body: JSON.stringify({ quoteId, format: "pdf" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) throw new Error(body?.error || `Falha ao gerar o PDF (HTTP ${res.status})`);
  if (!body?.pdf_base64) throw new Error("O servidor ainda não gera PDF: publique a função generate-pdf atualizada.");
  return { base64: body.pdf_base64 as string, fileName: (body.file_name as string) || "Proposta.pdf" };
}

/** Envia de fato um pedido já autorizado e registra o resultado. */
async function deliver(admin: any, authHeader: string, dispatch: any, cfg: SmtpConfig) {
  try {
    const pdf = await fetchProposalPdf(authHeader, dispatch.quote_id);
    const bcc = cfg.bcc ? [cfg.bcc] : [];
    await sendMail(cfg, {
      to: dispatch.to_emails,
      cc: dispatch.cc_emails,
      bcc,
      subject: dispatch.subject,
      html: buildEmailHtml(dispatch.body_text, cfg.signature),
      text: dispatch.body_text + (cfg.signature ? `\n\n-- \n${cfg.signature}` : ""),
      attachments: [{ filename: pdf.fileName, contentBase64: pdf.base64 }],
    });
    await admin.from("proposal_email_dispatches").update({
      status: "sent", sent_at: new Date().toISOString(), error: null, attachment_name: pdf.fileName,
    }).eq("id", dispatch.id);
    return { ok: true as const };
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 500);
    console.error("proposal-email deliver error:", msg);
    await admin.from("proposal_email_dispatches").update({ status: "failed", error: msg }).eq("id", dispatch.id);
    return { ok: false as const, error: msg };
  }
}

// ───────────────────────── autenticação ─────────────────────────

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ error: "Não autenticado" }, 401) };
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return { error: json({ error: "Não autorizado" }, 401) };
  return { user: data.user, authHeader };
}

async function isAdmin(admin: any, userId: string) {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// ───────────────────────── servidor ─────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;
  const user = (auth as any).user;
  const authHeader = (auth as any).authHeader as string;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const action: string = body?.action;
  const admin = adminClient();

  try {
    const userIsAdmin = await isAdmin(admin, user.id);

    // ───── status (qualquer usuário logado) ─────
    if (action === "status") {
      const row = await loadRow(admin);
      const cfg = row?.enabled ? await loadSmtp(admin).catch(() => null) : null;
      return json({
        configured: !!cfg,
        require_admin_approval: !!row?.require_admin_approval,
        from_email: cfg ? cfg.fromEmail : null,
      });
    }

    // ───── configuração (administrador) ─────
    if (action === "settings_get") {
      if (!userIsAdmin) return json({ error: "Apenas administradores" }, 403);
      const row = await loadRow(admin);
      if (!row) return json({ settings: null });
      const { smtp_password_encrypted, ...safe } = row;
      return json({ settings: { ...safe, has_password: !!smtp_password_encrypted } });
    }

    if (action === "settings_save") {
      if (!userIsAdmin) return json({ error: "Apenas administradores" }, 403);
      const s = body.settings || {};
      const host = String(s.smtp_host || "").trim();
      const port = Number(s.smtp_port);
      const security = s.smtp_security === "starttls" ? "starttls" : "ssl";
      const username = String(s.smtp_username || "").trim();
      const fromEmail = String(s.from_email || "").trim().toLowerCase();
      const replyTo = String(s.reply_to || "").trim().toLowerCase();
      const bcc = String(s.bcc_email || "").trim().toLowerCase();
      const password = String(s.smtp_password || "");
      const enabled = !!s.enabled;

      if (!host || /\s|\//.test(host)) return json({ error: "Informe o servidor SMTP (ex.: smtp.gmail.com)." }, 400);
      if (!Number.isInteger(port) || port < 1 || port > 65535) return json({ error: "Porta inválida." }, 400);
      if (!username) return json({ error: "Informe o usuário (normalmente o próprio e-mail)." }, 400);
      if (!isValidEmail(fromEmail)) return json({ error: "E-mail do remetente inválido." }, 400);
      if (replyTo && !isValidEmail(replyTo)) return json({ error: "E-mail de resposta inválido." }, 400);
      if (bcc && !isValidEmail(bcc)) return json({ error: "E-mail de cópia oculta inválido." }, 400);

      const existing = await loadRow(admin);
      let encrypted: string | null = existing?.smtp_password_encrypted || null;
      if (password) encrypted = await encryptSecret(password, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      if (enabled && !encrypted) return json({ error: "Informe a senha do e-mail para ativar." }, 400);

      const { error } = await admin.from("email_integration").upsert({
        id: true,
        enabled,
        smtp_host: host, smtp_port: port, smtp_security: security, smtp_username: username,
        smtp_password_encrypted: encrypted,
        from_name: String(s.from_name || "").trim() || null,
        from_email: fromEmail,
        reply_to: replyTo || null,
        bcc_email: bcc || null,
        signature_text: String(s.signature_text || "").slice(0, 1000) || null,
        require_admin_approval: !!s.require_admin_approval,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        // mudou a conta: o teste anterior não vale mais
        ...(password || host !== existing?.smtp_host || username !== existing?.smtp_username
          ? { last_test_at: null, last_test_ok: null, last_test_error: null } : {}),
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "settings_test") {
      if (!userIsAdmin) return json({ error: "Apenas administradores" }, 403);
      const row = await loadRow(admin);
      if (!rowIsComplete(row)) return json({ error: "Salve a conta completa (servidor, usuário, senha e e-mail do remetente) antes de testar." }, 400);
      // O teste funciona mesmo com a integração ainda desativada: só precisa da conta completa.
      let cfg: SmtpConfig;
      try {
        cfg = await smtpFromRow(row);
      } catch {
        return json({ error: "Não foi possível ler a senha salva. Digite a senha de novo e salve." }, 400);
      }
      const to = String(body.to || user.email || "").trim().toLowerCase();
      if (!isValidEmail(to)) return json({ error: "Informe um e-mail válido para receber o teste." }, 400);
      try {
        await sendMail(cfg, {
          to: [to],
          subject: "Teste de e-mail — Sistema SOIMA",
          text: "Este é um e-mail de teste do Sistema SOIMA. Se você recebeu, a conta de e-mail está conectada corretamente.",
          html: buildEmailHtml("Este é um e-mail de teste do Sistema SOIMA.\n\nSe você recebeu, a conta de e-mail está conectada corretamente.", cfg.signature),
        });
        await admin.from("email_integration").update({ last_test_at: new Date().toISOString(), last_test_ok: true, last_test_error: null }).eq("id", true);
        return json({ ok: true, to });
      } catch (e: any) {
        const msg = String(e?.message || e).slice(0, 400);
        await admin.from("email_integration").update({ last_test_at: new Date().toISOString(), last_test_ok: false, last_test_error: msg }).eq("id", true);
        return json({ ok: false, error: msg }, 200);
      }
    }

    // ───── pedir o envio de uma proposta ─────
    if (action === "request_send") {
      if (body.authorize !== true) return json({ error: "É preciso autorizar o envio da proposta ao cliente." }, 400);

      const cfg = await loadSmtp(admin).catch(() => null);
      if (!cfg) return json({ error: "O e-mail da empresa ainda não está conectado (Integrações → E-mail).", code: "not_configured" }, 409);

      const { data: quote } = await admin.from("quotes").select("id, quote_number, status, discount_approved, created_by").eq("id", body.quoteId).maybeSingle();
      if (!quote) return json({ error: "Proposta não encontrada" }, 404);
      if (quote.created_by !== user.id && !userIsAdmin) return json({ error: "Só quem criou a proposta (ou um administrador) pode enviá-la." }, 403);
      if (quote.status !== "finalized") return json({ error: "Só é possível enviar propostas finalizadas." }, 409);
      if (quote.discount_approved === false) return json({ error: "O desconto desta proposta ainda não foi aprovado." }, 409);

      const to = normalizeEmails(body.to);
      const cc = normalizeEmails(body.cc);
      if (to.invalid.length || cc.invalid.length) {
        return json({ error: `E-mail inválido: ${[...to.invalid, ...cc.invalid].join(", ")}` }, 400);
      }
      if (!to.valid.length) return json({ error: "Informe ao menos um destinatário." }, 400);
      if (to.valid.length + cc.valid.length > 10) return json({ error: "No máximo 10 destinatários por envio." }, 400);

      const subject = String(body.subject || "").trim();
      const text = String(body.body || "").trim();
      if (!subject || subject.length > 200) return json({ error: "Informe o assunto (até 200 caracteres)." }, 400);
      if (!text || text.length > 5000) return json({ error: "Informe a mensagem (até 5000 caracteres)." }, 400);

      const needsAdmin = cfg.requireApproval && !userIsAdmin;
      const now = new Date().toISOString();
      const { data: dispatch, error: insErr } = await admin.from("proposal_email_dispatches").insert({
        quote_id: quote.id,
        requested_by: user.id,
        to_emails: to.valid,
        cc_emails: cc.valid,
        subject,
        body_text: text,
        status: needsAdmin ? "pending_authorization" : "authorized",
        authorized_by: needsAdmin ? null : user.id,
        authorized_at: needsAdmin ? null : now,
      }).select("*").single();
      if (insErr) throw insErr;

      if (needsAdmin) return json({ ok: true, status: "pending_authorization", dispatchId: dispatch.id });

      const result = await deliver(admin, authHeader, dispatch, cfg);
      return result.ok
        ? json({ ok: true, status: "sent", dispatchId: dispatch.id })
        : json({ ok: false, status: "failed", dispatchId: dispatch.id, error: result.error }, 200);
    }

    // ───── ações sobre um envio existente ─────
    const dispatchId: string | undefined = body.dispatchId;
    if (["authorize", "reject", "cancel", "retry"].includes(action)) {
      if (!dispatchId) return json({ error: "dispatchId obrigatório" }, 400);
      const { data: dispatch } = await admin.from("proposal_email_dispatches").select("*").eq("id", dispatchId).maybeSingle();
      if (!dispatch) return json({ error: "Envio não encontrado" }, 404);

      if (action === "authorize") {
        if (!userIsAdmin) return json({ error: "Apenas administradores podem autorizar." }, 403);
        if (dispatch.status !== "pending_authorization") return json({ error: "Este envio não está aguardando autorização." }, 409);
        const cfg = await loadSmtp(admin).catch(() => null);
        if (!cfg) return json({ error: "O e-mail da empresa não está conectado.", code: "not_configured" }, 409);
        await admin.from("proposal_email_dispatches").update({
          status: "authorized", authorized_by: user.id, authorized_at: new Date().toISOString(),
        }).eq("id", dispatchId);
        const result = await deliver(admin, authHeader, { ...dispatch, status: "authorized" }, cfg);
        return result.ok ? json({ ok: true, status: "sent" }) : json({ ok: false, status: "failed", error: result.error }, 200);
      }

      if (action === "reject") {
        if (!userIsAdmin) return json({ error: "Apenas administradores podem negar." }, 403);
        if (dispatch.status !== "pending_authorization") return json({ error: "Este envio não está aguardando autorização." }, 409);
        await admin.from("proposal_email_dispatches").update({
          status: "rejected", rejection_reason: String(body.reason || "").slice(0, 500) || null,
          authorized_by: user.id, authorized_at: new Date().toISOString(),
        }).eq("id", dispatchId);
        return json({ ok: true, status: "rejected" });
      }

      const mine = dispatch.requested_by === user.id;
      if (!mine && !userIsAdmin) return json({ error: "Sem permissão para este envio." }, 403);

      if (action === "cancel") {
        if (!["pending_authorization", "failed"].includes(dispatch.status)) return json({ error: "Só dá para cancelar envios pendentes ou que falharam." }, 409);
        await admin.from("proposal_email_dispatches").update({ status: "cancelled" }).eq("id", dispatchId);
        return json({ ok: true, status: "cancelled" });
      }

      if (action === "retry") {
        if (dispatch.status !== "failed") return json({ error: "Só dá para tentar de novo um envio que falhou." }, 409);
        const cfg = await loadSmtp(admin).catch(() => null);
        if (!cfg) return json({ error: "O e-mail da empresa não está conectado.", code: "not_configured" }, 409);
        const result = await deliver(admin, authHeader, dispatch, cfg);
        return result.ok ? json({ ok: true, status: "sent" }) : json({ ok: false, status: "failed", error: result.error }, 200);
      }
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error("proposal-email error:", e);
    return json({ error: e?.message || "Erro interno" }, 500);
  }
});
