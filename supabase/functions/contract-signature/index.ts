// Assinatura digital de contratos via Autentique (API v2, GraphQL).
//
// Uma única função com dois "modos", porque cada função precisa de deploy manual pelo chat do Lovable:
//  1) Ações do sistema (exigem usuário logado): status | send | sync
//  2) Webhook do Autentique (assinado por HMAC no header X-Autentique-Signature)
//
// Segredos (Lovable Cloud > Secrets) — nada disso vai para o código nem para o chat:
//  - AUTENTIQUE_API_KEY         chave de API (painel.autentique.com.br/perfil/api)
//  - AUTENTIQUE_WEBHOOK_SECRET  segredo para validar os webhooks
//  - AUTENTIQUE_SANDBOX         "false" para produção. Qualquer outro valor (ou ausente) = SANDBOX
//                               (documentos de teste: não gastam crédito e NÃO têm validade jurídica)
//
// Fonte da API: https://docs.autentique.com.br/api/2
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-autentique-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTENTIQUE_URL = "https://api.autentique.com.br/v2/graphql";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ───────────────────────── helpers puros (testáveis) ─────────────────────────

export type SignerKind = "seller" | "buyer" | "witness";
export type RequestStatus = "pending" | "viewed" | "signed" | "rejected";

/** Status de uma pessoa a partir dos eventos devolvidos pelo Autentique. */
export function signerStatus(sig: any): RequestStatus {
  if (sig?.rejected?.created_at) return "rejected";
  if (sig?.signed?.created_at) return "signed";
  if (sig?.viewed?.created_at) return "viewed";
  return "pending";
}

/** HMAC-SHA256 em hexadecimal do corpo bruto da requisição. */
export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante (evita vazar o segredo por tempo de resposta). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Nome de arquivo seguro para storage/multipart. */
export function safeFileName(name: string): string {
  const base = (name || "contrato").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
  return (base || "contrato").slice(0, 80);
}

/** Ids possíveis do documento dentro de um evento de webhook (o formato varia por tipo de evento). */
export function documentIdCandidates(body: any): string[] {
  const d = body?.event?.data ?? body?.data ?? {};
  const raw = [d?.document?.id, d?.document_id, typeof d?.document === "string" ? d.document : null, d?.id];
  return [...new Set(raw.filter((x) => typeof x === "string" && x.length > 0))] as string[];
}

export interface SignerInput {
  kind: SignerKind;
  id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
}

/** Converte nossos signatários no formato SignerInput do Autentique. */
export function toAutentiqueSigners(signers: SignerInput[]) {
  return signers.map((s) => {
    const action = s.kind === "witness" ? "SIGN_AS_A_WITNESS" : "SIGN";
    const email = (s.email || "").trim();
    // Com e-mail, o Autentique envia o link por e-mail; sem e-mail, devolve um link para enviarmos.
    return email ? { email, action } : { name: s.name, action };
  });
}

/** Casa as assinaturas devolvidas pelo Autentique com os signatários enviados (e-mail, depois ordem). */
export function matchSignatures(sent: SignerInput[], returned: any[]) {
  const used = new Set<number>();
  return sent.map((s, idx) => {
    const email = (s.email || "").trim().toLowerCase();
    let pos = -1;
    if (email) {
      pos = returned.findIndex((r, i) => !used.has(i) && (r?.email || "").toLowerCase() === email);
    } else {
      // sem e-mail: a primeira assinatura devolvida sem e-mail que ainda não foi usada
      pos = returned.findIndex((r, i) => !used.has(i) && !(r?.email || "").trim());
    }
    if (pos < 0 && returned[idx] && !used.has(idx)) pos = idx; // último recurso: mesma ordem do envio
    if (pos >= 0) used.add(pos);
    return { signer: s, signature: pos >= 0 ? returned[pos] : null };
  });
}

// ───────────────────────── Autentique (GraphQL) ─────────────────────────

function cfg() {
  const apiKey = Deno.env.get("AUTENTIQUE_API_KEY") || "";
  // Padrão SEGURO: sandbox, a menos que AUTENTIQUE_SANDBOX seja exatamente "false"
  const sandbox = (Deno.env.get("AUTENTIQUE_SANDBOX") || "").trim().toLowerCase() !== "false";
  const webhookSecret = Deno.env.get("AUTENTIQUE_WEBHOOK_SECRET") || "";
  return { apiKey, sandbox, webhookSecret, configured: !!apiKey };
}

async function gql(apiKey: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(AUTENTIQUE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length) {
    const msg = body?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Autentique: ${msg}`);
  }
  return body.data;
}

async function createDocument(
  apiKey: string,
  sandbox: boolean,
  pdf: Uint8Array,
  fileName: string,
  document: Record<string, unknown>,
  signers: unknown[],
) {
  const query = `mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file${sandbox ? ", sandbox: true" : ""}) {
      id name created_at
      signatures { public_id name email created_at action { name } link { short_link } }
    }
  }`;
  const form = new FormData();
  form.append("operations", JSON.stringify({ query, variables: { document, signers, file: null } }));
  form.append("map", JSON.stringify({ file: ["variables.file"] }));
  form.append("file", new Blob([pdf], { type: "application/pdf" }), `${fileName}.pdf`);

  const res = await fetch(AUTENTIQUE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length) {
    throw new Error(`Autentique: ${body?.errors?.[0]?.message || `HTTP ${res.status}`}`);
  }
  return body.data.createDocument;
}

async function fetchDocument(apiKey: string, documentId: string) {
  const data = await gql(
    apiKey,
    `query { document(id: ${JSON.stringify(documentId)}) {
      id name
      files { original signed }
      signatures {
        public_id name email action { name } link { short_link }
        viewed { created_at } signed { created_at } rejected { created_at reason }
      }
    } }`,
  );
  return data.document;
}

// ───────────────────────── Banco ─────────────────────────

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** Registra uma versão do contrato (trilha de auditoria) — equivalente ao createContractVersion do app. */
async function addContractVersion(admin: any, contractId: string, summary: string) {
  const [{ data: contract }, { data: clauses }, { data: sigs }, { data: wits }, { data: last }] = await Promise.all([
    admin.from("contracts").select("*").eq("id", contractId).single(),
    admin.from("contract_clause_snapshots").select("*").eq("contract_id", contractId).order("order_index"),
    admin.from("contract_signatories").select("*").eq("contract_id", contractId).order("side").order("order_index"),
    admin.from("contract_witnesses").select("*").eq("contract_id", contractId).order("order_index"),
    admin.from("contract_versions").select("version_number").eq("contract_id", contractId)
      .order("version_number", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!contract) return;
  const versionNumber = (last?.version_number || 0) + 1;
  await admin.from("contract_versions").insert({
    contract_id: contractId,
    version_number: versionNumber,
    contract_data: contract,
    clauses_data: clauses || [],
    signatories_data: sigs || [],
    witnesses_data: wits || [],
    change_summary: summary,
    created_by: null,
  });
  await admin.from("contracts").update({ current_version: versionNumber }).eq("id", contractId);
}

/**
 * Atualiza o status de cada pessoa a partir do Autentique e, se todos assinaram,
 * baixa o PDF assinado, guarda no storage e marca o contrato como assinado.
 * É a única fonte da verdade: o webhook só "avisa" e esta função consulta a API.
 */
async function syncContract(admin: any, apiKey: string, contractId: string) {
  const { data: contract } = await admin.from("contracts").select("*").eq("id", contractId).single();
  if (!contract?.autentique_document_id) throw new Error("Este contrato ainda não foi enviado ao Autentique.");

  const doc = await fetchDocument(apiKey, contract.autentique_document_id);
  if (!doc) throw new Error("Documento não encontrado no Autentique.");

  const { data: requests } = await admin
    .from("contract_signature_requests").select("*").eq("contract_id", contractId);

  const signatures: any[] = doc.signatures || [];
  for (const sig of signatures) {
    const row = (requests || []).find((r: any) => r.autentique_public_id === sig.public_id);
    if (!row) continue;
    const status = signerStatus(sig);
    await admin.from("contract_signature_requests").update({
      status,
      sign_link: sig.link?.short_link || row.sign_link,
      viewed_at: sig.viewed?.created_at || row.viewed_at,
      signed_at: sig.signed?.created_at || row.signed_at,
      rejected_at: sig.rejected?.created_at || row.rejected_at,
      rejected_reason: sig.rejected?.reason || row.rejected_reason,
    }).eq("id", row.id);
  }

  const total = signatures.length;
  const signedCount = signatures.filter((s) => signerStatus(s) === "signed").length;
  const anyRejected = signatures.some((s) => signerStatus(s) === "rejected");
  let autentiqueStatus = "pending";
  if (anyRejected) autentiqueStatus = "rejected";
  else if (total > 0 && signedCount === total) autentiqueStatus = "finished";
  else if (signedCount > 0) autentiqueStatus = "partially_signed";

  const patch: Record<string, unknown> = { autentique_status: autentiqueStatus };
  let finalized = false;

  if (autentiqueStatus === "finished" && contract.status !== "signed") {
    const signedUrl: string | undefined = doc.files?.signed;
    if (signedUrl) {
      // O link do arquivo assinado pode ser público ou exigir a chave: tenta sem e depois com.
      let fileRes = await fetch(signedUrl);
      if (!fileRes.ok) fileRes = await fetch(signedUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!fileRes.ok) throw new Error(`Não foi possível baixar o PDF assinado (HTTP ${fileRes.status}).`);
      const bytes = new Uint8Array(await fileRes.arrayBuffer());

      const path = `${contractId}/signed-autentique-${Date.now()}-${safeFileName(contract.contract_number)}.pdf`;
      const { error: upErr } = await admin.storage.from("contracts")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error(`Falha ao guardar o PDF assinado: ${upErr.message}`);

      const dates = signatures.map((s) => s.signed?.created_at).filter(Boolean).sort();
      patch.status = "signed";
      patch.signed_pdf_url = path;
      patch.signed_at = dates[dates.length - 1] || new Date().toISOString();
      finalized = true;
    }
    // Sem arquivo ainda: mantém "enviado"; o próximo evento/sincronização conclui.
  }

  await admin.from("contracts").update(patch).eq("id", contractId);
  if (finalized) await addContractVersion(admin, contractId, "Contrato assinado por todas as partes (Autentique)");
  return { autentiqueStatus, finalized, signedCount, total };
}

// ───────────────────────── Autenticação do usuário ─────────────────────────

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

async function canManageContract(admin: any, userId: string, contract: any): Promise<boolean> {
  if (contract?.created_by === userId) return true;
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// ───────────────────────── Servidor ─────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const config = cfg();
  const raw = await req.text();

  // ───── Modo 2: webhook do Autentique ─────
  const signatureHeader = req.headers.get("x-autentique-signature");
  if (signatureHeader) {
    if (!config.webhookSecret) return json({ error: "Webhook não configurado" }, 503);
    const expected = await hmacSha256Hex(config.webhookSecret, raw);
    if (!safeEqual(expected, signatureHeader.trim().toLowerCase())) return json({ error: "Assinatura inválida" }, 401);

    let body: any;
    try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }

    const admin = adminClient();
    const eventId: string | null = body?.event?.id || null;
    const eventType: string = body?.event?.type || "desconhecido";
    const candidates = documentIdCandidates(body);

    let contractId: string | null = null;
    if (candidates.length) {
      const { data: found } = await admin.from("contracts").select("id")
        .in("autentique_document_id", candidates).limit(1).maybeSingle();
      contractId = found?.id || null;
    }

    // Idempotência: o Autentique pode reenviar o mesmo evento
    const { error: evErr } = await admin.from("contract_signature_events").insert({
      contract_id: contractId, event_id: eventId, event_type: eventType, payload: body,
    });
    if (evErr?.code === "23505") return json({ ok: true, duplicate: true });

    if (contractId && config.apiKey) {
      const work = syncContract(admin, config.apiKey, contractId).catch((e) =>
        console.error("autentique webhook sync error:", e?.message || e));
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(work); else await work;
    }
    return json({ ok: true });
  }

  // ───── Modo 1: ações do sistema ─────
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;
  const user = (auth as any).user;
  const authHeader = (auth as any).authHeader as string;

  let body: any;
  try { body = JSON.parse(raw || "{}"); } catch { return json({ error: "JSON inválido" }, 400); }
  const action: string = body.action;
  const admin = adminClient();

  try {
    if (action === "status") {
      return json({
        configured: config.configured,
        sandbox: config.sandbox,
        webhook_configured: !!config.webhookSecret,
      });
    }

    if (!config.configured) {
      return json({ error: "Autentique ainda não está conectado (falta a chave de API).", code: "not_configured" }, 409);
    }

    if (action === "test") {
      // Consulta barata só para validar a chave
      await gql(config.apiKey, "query { documents(limit: 1, page: 1) { total } }");
      return json({ ok: true, sandbox: config.sandbox });
    }

    const contractId: string | undefined = body.contractId;
    if (!contractId) return json({ error: "contractId obrigatório" }, 400);
    const { data: contract } = await admin.from("contracts").select("*").eq("id", contractId).maybeSingle();
    if (!contract) return json({ error: "Contrato não encontrado" }, 404);
    if (!(await canManageContract(admin, user.id, contract))) {
      return json({ error: "Sem permissão para este contrato" }, 403);
    }

    if (action === "sync") {
      const result = await syncContract(admin, config.apiKey, contractId);
      return json({ ok: true, ...result });
    }

    if (action === "send") {
      if (contract.autentique_document_id) return json({ error: "Este contrato já foi enviado ao Autentique." }, 409);
      if (contract.status !== "aprovado") return json({ error: "Só contratos aprovados podem ser enviados para assinatura." }, 409);

      const signers: SignerInput[] = (body.signers || []).filter((s: any) => (s?.name || "").trim());
      if (!signers.length) return json({ error: "Informe ao menos um signatário." }, 400);
      if (!signers.some((s) => s.kind !== "witness")) {
        return json({ error: "Inclua ao menos um representante (vendedora ou compradora) como signatário." }, 400);
      }

      // PDF sempre atual: gera de novo a partir do estado do contrato
      const pdfRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-contract-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
        body: JSON.stringify({ contractId }),
      });
      const pdfJson = await pdfRes.json().catch(() => null);
      if (!pdfRes.ok || !pdfJson?.pdf_base64) {
        return json({ error: pdfJson?.error || "Falha ao gerar o PDF do contrato." }, 502);
      }
      const bin = atob(pdfJson.pdf_base64);
      const pdf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) pdf[i] = bin.charCodeAt(i);

      const doc = await createDocument(
        config.apiKey,
        config.sandbox,
        pdf,
        safeFileName(contract.contract_number),
        {
          name: `Contrato ${contract.contract_number}`,
          message: (body.message || "").trim() || `Segue o contrato ${contract.contract_number} para sua assinatura.`,
          sortable: false,
        },
        toAutentiqueSigners(signers),
      );

      const matched = matchSignatures(signers, doc.signatures || []);
      const now = new Date().toISOString();

      // Se algo falhar daqui em diante o documento JÁ existe no Autentique: o id vai na mensagem de erro.
      try {
        const { error: updErr } = await admin.from("contracts").update({
          autentique_document_id: doc.id,
          autentique_status: "pending",
          autentique_sent_at: now,
          status: "sent",
          sent_at: now,
          finalized_at: now,
        }).eq("id", contractId);
        if (updErr) throw updErr;

        const rows = matched.map(({ signer, signature }) => ({
          contract_id: contractId,
          signer_kind: signer.kind,
          signer_id: signer.id || null,
          name: signer.name,
          email: (signer.email || "").trim() || null,
          phone: (signer.phone || "").trim() || null,
          autentique_public_id: signature?.public_id || null,
          sign_link: signature?.link?.short_link || null,
          status: "pending",
        }));
        const { error: insErr } = await admin.from("contract_signature_requests").insert(rows);
        if (insErr) throw insErr;
        await addContractVersion(admin, contractId, `Enviado para assinatura digital (Autentique${config.sandbox ? " — modo teste" : ""})`);
      } catch (e: any) {
        console.error("send: falha ao gravar após criar documento", doc.id, e);
        return json({ error: `Documento criado no Autentique (id ${doc.id}), mas falhou ao registrar no sistema: ${e?.message || e}` }, 500);
      }

      return json({ ok: true, documentId: doc.id, sandbox: config.sandbox, signers: matched.map((m) => ({
        name: m.signer.name, email: m.signer.email || null, link: m.signature?.link?.short_link || null,
      })) });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error("contract-signature error:", e);
    return json({ error: e?.message || "Erro interno" }, 500);
  }
});
