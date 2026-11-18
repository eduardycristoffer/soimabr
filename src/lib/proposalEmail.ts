/** Auxiliares do envio de propostas por e-mail (lado do app). */

const EMAIL_RX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export const isValidEmail = (s: string) => EMAIL_RX.test((s || "").trim());

/**
 * Lê uma lista de e-mails digitada livremente (separados por vírgula, ponto e vírgula,
 * espaço ou quebra de linha). Devolve válidos (minúsculos, sem repetidos) e inválidos.
 */
export function parseEmailInput(text: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const part of (text || "").split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    (isValidEmail(e) ? valid : invalid).push(e);
  }
  return { valid, invalid };
}

export interface ProposalEmailVars {
  numero: string;
  contato?: string | null;
  obra?: string | null;
  vendedor?: string | null;
}

/** Assunto e mensagem padrão (o usuário pode editar antes de enviar). */
export function defaultProposalEmail(language: string | null | undefined, v: ProposalEmailVars) {
  const contato = (v.contato || "").trim();
  const obra = (v.obra || "").trim();
  const vendedor = (v.vendedor || "").trim();

  if (language === "en") {
    return {
      subject: `Commercial proposal ${v.numero} — SOIMA BR`,
      body:
        `${contato ? `Hello ${contato},` : "Hello,"}\n\n` +
        `Please find attached our commercial proposal ${v.numero}${obra ? ` for the project ${obra}` : ""}.\n\n` +
        `Please let us know if you have any questions.\n\n` +
        `Best regards,${vendedor ? `\n${vendedor}` : ""}`,
    };
  }
  return {
    subject: `Proposta comercial ${v.numero} — SOIMA BR`,
    body:
      `${contato ? `Olá, ${contato}!` : "Olá!"}\n\n` +
      `Segue em anexo a proposta comercial ${v.numero}${obra ? ` referente à obra ${obra}` : ""}.\n\n` +
      `Ficamos à disposição para esclarecer qualquer dúvida.\n\n` +
      `Atenciosamente,${vendedor ? `\n${vendedor}` : ""}`,
  };
}

export const DISPATCH_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  pending_authorization: { label: "Aguardando autorização", tone: "warn" },
  authorized: { label: "Autorizado", tone: "neutral" },
  sent: { label: "Enviado", tone: "ok" },
  failed: { label: "Falhou", tone: "bad" },
  rejected: { label: "Negado", tone: "bad" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

/** Servidores SMTP comuns, para preencher a tela de conexão com um clique. */
export const SMTP_PRESETS: { id: string; label: string; host: string; port: number; security: "ssl" | "starttls"; hint: string }[] = [
  { id: "gmail", label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, security: "ssl",
    hint: "Use uma senha de app (conta Google com verificação em duas etapas). A senha normal não funciona." },
  { id: "office365", label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, security: "starttls",
    hint: "O administrador do Microsoft 365 precisa liberar o envio SMTP autenticado para esta conta." },
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.com", port: 465, security: "ssl",
    hint: "Use uma senha de aplicativo, se a conta tiver verificação em duas etapas." },
  { id: "hostgator", label: "HostGator / cPanel", host: "", port: 465, security: "ssl",
    hint: "O servidor costuma ser mail.seudominio.com.br (veja em Contas de e-mail → Configurar cliente de e-mail)." },
  { id: "custom", label: "Outro servidor", host: "", port: 465, security: "ssl",
    hint: "Peça ao provedor do e-mail o servidor SMTP, a porta e o tipo de segurança." },
];
