import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const started = Date.now()
  let cnpjDigits = ''
  let userId: string | null = null
  let userEmail: string | null = null

  const log = async (fields: {
    status: 'success' | 'warning' | 'error'
    message?: string | null
    situacao_cadastral?: string | null
    http_status?: number | null
  }) => {
    try {
      await admin.from('cnpj_lookup_logs').insert({
        cnpj: cnpjDigits || 'invalid',
        status: fields.status,
        message: fields.message ?? null,
        situacao_cadastral: fields.situacao_cadastral ?? null,
        provider: 'brasilapi',
        http_status: fields.http_status ?? null,
        duration_ms: Date.now() - started,
        user_id: userId,
        user_email: userEmail,
      })
    } catch (_) { /* swallow */ }
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      await log({ status: 'error', message: 'Não autenticado', http_status: 401 })
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      await log({ status: 'error', message: 'Não autenticado', http_status: 401 })
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    userId = (claims.claims as any).sub ?? null
    userEmail = (claims.claims as any).email ?? null

    const body = await req.json().catch(() => ({}))
    const raw = String(body?.cnpj ?? '')
    cnpjDigits = raw.replace(/\D/g, '')
    if (cnpjDigits.length !== 14) {
      await log({ status: 'error', message: 'CNPJ inválido', http_status: 400 })
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: cfg } = await admin.from('cnpj_lookup_config').select('is_active').limit(1).maybeSingle()
    if (!cfg?.is_active) {
      await log({ status: 'error', message: 'Integração desativada', http_status: 403 })
      return new Response(JSON.stringify({ error: 'Integração de consulta CNPJ desativada' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`)
    if (resp.status === 404) {
      await log({ status: 'error', message: 'CNPJ não encontrado', http_status: 404 })
      return new Response(JSON.stringify({ error: 'CNPJ não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!resp.ok) {
      await log({ status: 'error', message: `Erro upstream ${resp.status}`, http_status: resp.status })
      return new Response(JSON.stringify({ error: `Erro na consulta (${resp.status})` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const d = await resp.json()

    const enderecoParts = [d.logradouro, d.numero ? d.numero : null].filter(Boolean).join(', ')
    const extras = [d.complemento, d.bairro].filter(Boolean).join(' - ')
    const endereco = [enderecoParts, extras].filter(Boolean).join(' - ')

    const situacao = d.descricao_situacao_cadastral || null
    const warning = situacao && situacao.toString().toUpperCase() !== 'ATIVA'
      ? `Situação cadastral: ${situacao}`
      : null

    const result = {
      razao_social: d.razao_social || null,
      nome_fantasia: d.nome_fantasia || null,
      situacao_cadastral: situacao,
      endereco: endereco || null,
      cidade: d.municipio || null,
      estado: d.uf || null,
      cep: d.cep || null,
      telefone: d.ddd_telefone_1 || null,
      email: d.email || null,
      warning,
    }

    await log({
      status: warning ? 'warning' : 'success',
      message: warning ?? 'OK',
      situacao_cadastral: situacao,
      http_status: 200,
    })

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    await log({ status: 'error', message: (e as Error).message, http_status: 500 })
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
