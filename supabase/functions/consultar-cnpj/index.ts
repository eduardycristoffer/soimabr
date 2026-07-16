import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
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
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => ({}))
    const raw = String(body?.cnpj ?? '')
    const cnpj = raw.replace(/\D/g, '')
    if (cnpj.length !== 14) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: cfg } = await admin.from('cnpj_lookup_config').select('is_active').limit(1).maybeSingle()
    if (!cfg?.is_active) {
      return new Response(JSON.stringify({ error: 'Integração de consulta CNPJ desativada' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
    if (resp.status === 404) {
      return new Response(JSON.stringify({ error: 'CNPJ não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Erro na consulta (${resp.status})` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const d = await resp.json()

    const enderecoParts = [
      d.logradouro,
      d.numero ? d.numero : null,
    ].filter(Boolean).join(', ')
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

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
