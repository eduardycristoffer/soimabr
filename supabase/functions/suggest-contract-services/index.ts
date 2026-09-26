import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

const json = (body: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extra, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);

    const { notes, current_services } = await req.json();
    const text = String(notes || "").trim();
    if (!text) return json({ suggestions: [] });
    if (text.length > 8000) return json({ error: "Observações muito longas (máx. 8000 caracteres)." }, 400);
    const current: string[] = Array.isArray(current_services) ? current_services.map(String).slice(0, 50) : [];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Lovable AI não configurado." }, 500);

    const prompt = `Você analisa propostas comerciais de gruas (venda/locação) da SOIMA.
A cláusula 5 do contrato lista os serviços inclusos no preço; o que não estiver listado NÃO está incluso.
Serviços já listados na cláusula 5:
${current.length ? current.map((s) => `- ${s}`).join("\n") : "(nenhum)"}

Observações da proposta, escritas pelo vendedor:
"""
${text}
"""

Identifique serviços ofertados nas observações (ex.: frete, transporte, montagem, desmontagem, operador, manutenção, treinamento, assistência técnica, mobilização, ART, içamento) que NÃO estejam na lista acima.
Para cada um, escreva um texto curto e formal, em português, pronto para entrar como item da cláusula 5 (sem marcador inicial), incluindo detalhes citados (origem/destino, prazos, quantidades).
Não invente serviços que não estejam nas observações. Máximo de 10 itens.
Responda SOMENTE com JSON no formato: {"suggestions":[{"servico":"nome curto","texto":"texto para a cláusula","trecho":"trecho das observações que justifica"}]}`;

    const upstream = await fetch(GATEWAY, {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    const aigHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => {
      if (k.toLowerCase().startsWith("x-lovable-aig-")) aigHeaders[k] = v;
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      let msg = "Falha ao consultar a IA.";
      try { msg = JSON.parse(errText)?.error?.message || JSON.parse(errText)?.message || msg; } catch (_) { /* */ }
      if (upstream.status === 402) msg = "Créditos de IA esgotados. Adicione créditos em Settings → Plans & credits.";
      if (upstream.status === 429) msg = "Muitas solicitações à IA. Aguarde alguns instantes e tente novamente.";
      return json({ error: msg }, upstream.status, aigHeaders);
    }

    // Consume SSE stream server-side
    const reader = upstream.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    let streamErr: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta") out += ev.delta || "";
          else if (ev.type === "error" || ev.type === "response.failed")
            streamErr = ev.error?.message || ev.response?.error?.message || "Erro na IA";
        } catch (_) { /* ignore */ }
      }
    }
    if (streamErr) return json({ error: streamErr }, 502, aigHeaders);
    if (!out.trim()) return json({ error: "A IA não retornou resposta." }, 502, aigHeaders);

    let parsed: any = null;
    const m = out.match(/\{[\s\S]*\}/);
    try { parsed = JSON.parse(m ? m[0] : out); } catch (_) {
      return json({ error: "Resposta da IA em formato inesperado." }, 502, aigHeaders);
    }
    const suggestions = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
      .slice(0, 10)
      .map((s: any) => ({
        servico: String(s?.servico || "").slice(0, 80),
        texto: String(s?.texto || "").slice(0, 500),
        trecho: String(s?.trecho || "").slice(0, 300),
      }))
      .filter((s: any) => s.texto);
    return json({ suggestions }, 200, aigHeaders);
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
