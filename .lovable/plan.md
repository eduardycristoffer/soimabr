

# Auditoria de Seguranca + Verificacao de Email (SMTP Proprio)

Este plano cobre todas as melhorias de seguranca solicitadas, divididas em fases para organizacao e seguranca na implementacao.

---

## FASE 1: Desativar Signup Publico + Bloquear Login Inseguro

### 1.1 Remover aba "Cadastrar" do Login
- **Arquivo:** `src/pages/Login.tsx`
- Remover completamente a aba `TabsTrigger value="signup"` e o `TabsContent value="signup"`
- Remover o metodo `signUp` do useAuth e do AuthContext (manter apenas no backend via manage-users)
- Pagina de login fica apenas com formulario de email + senha

### 1.2 Validar is_active no login (AuthContext)
- **Arquivo:** `src/contexts/AuthContext.tsx`
- Apos `fetchUserProfile`, verificar se `profile.is_active === false`
- Se inativo, fazer `signOut()` automatico e mostrar mensagem generica
- Mensagem: "Acesso nao autorizado. Verifique seu email ou fale com o administrador."

### 1.3 Mensagens de erro genericas no login
- **Arquivo:** `src/pages/Login.tsx`
- No `catch` do `handleLogin`, substituir `error.message` por mensagem generica fixa
- Nunca diferenciar "usuario nao existe" de "senha incorreta"

---

## FASE 2: SMTP Proprio + Verificacao de Email

### 2.1 Armazenar credenciais SMTP como secrets
Secrets a criar:
- `SMTP_HOST` = br378.hostgator.com.br
- `SMTP_PORT` = 465
- `SMTP_USER` = noreply@tryade.com.br
- `SMTP_PASSWORD` = (sera solicitado via ferramenta segura - NAO armazenar no codigo)
- `SMTP_FROM_NAME` = Sistema Soima
- `SMTP_FROM_EMAIL` = noreply@tryade.com.br

### 2.2 Edge Function: send-email
- **Arquivo:** `supabase/functions/send-email/index.ts`
- Funcao generica para envio de email via SMTP proprio (usando biblioteca Deno SMTP)
- Aceita: destinatario, assunto, corpo HTML
- Valida JWT do chamador (apenas admin ou sistema)
- Templates HTML com logo SOIMA para:
  - Convite de usuario (novo usuario criado por admin)
  - Confirmacao de email
  - Reset de senha

### 2.3 Tabela: email_verification_tokens
Nova tabela no banco:

```text
email_verification_tokens
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- token (text, UNIQUE, NOT NULL)
- expires_at (timestamptz, NOT NULL)
- used_at (timestamptz, NULL)
- created_at (timestamptz, default now())
```

RLS: Nenhum acesso direto pelo cliente. Apenas edge functions com service_role_key.

### 2.4 Fluxo de convite de usuario (atualizar manage-users)
- **Arquivo:** `supabase/functions/manage-users/index.ts`
- Ao criar usuario:
  1. Criar usuario no auth com `email_confirm: false` (nao confirmar automaticamente)
  2. Criar profile com `is_active: false`
  3. Gerar token de verificacao (UUID + expiracao 24h) na tabela `email_verification_tokens`
  4. Enviar email de convite via send-email com link: `https://soimabr.lovable.app/auth/verify?token=...`
  5. Retornar sucesso

### 2.5 Edge Function: verify-email
- **Arquivo:** `supabase/functions/verify-email/index.ts`
- Recebe token via query param
- Valida: existe, nao expirou, nao foi usado
- Marca token como usado
- Atualiza auth user: `email_confirm: true`
- Atualiza profile: `is_active: true`
- Retorna redirect para pagina de login com mensagem de sucesso

### 2.6 Pagina de verificacao no frontend
- **Arquivo:** `src/pages/VerifyEmail.tsx`
- Rota: `/auth/verify`
- Le token da URL, chama edge function verify-email
- Mostra status: verificando / sucesso / erro / token expirado
- Botao para ir ao login

### 2.7 Edge Function: resend-verification
- **Arquivo:** `supabase/functions/resend-verification/index.ts`
- Apenas admin pode chamar
- Gera novo token, invalida anteriores
- Reenvia email de convite
- Rate limit: maximo 1 reenvio por minuto por usuario

---

## FASE 3: Seguranca em Edge Functions

### 3.1 dispatch-outbound-webhook
- **Arquivo:** `supabase/functions/dispatch-outbound-webhook/index.ts`
- Adicionar validacao de JWT (getClaims) - atualmente nao valida autenticacao
- Verificar que o chamador e um usuario autenticado

### 3.2 generate-pdf
- **Arquivo:** `supabase/functions/generate-pdf/index.ts`
- Ja valida auth via getUser - OK
- Adicionar verificacao de que o usuario tem acesso a proposta (owner ou admin)

### 3.3 webhook-leads (publico)
- Ja valida secret token e loga tudo - OK
- Adicionar validacao de tamanho do payload (max 10KB)
- Sanitizar inputs (trim, max length)

---

## FASE 4: Correcoes RLS

### 4.1 Tabelas publicas - restringir a autenticados
Alterar RLS de `USING (true)` para `USING (auth.uid() IS NOT NULL)` nas tabelas:
- `products` (SELECT)
- `pipeline_stages` (SELECT)
- `company_settings` (SELECT para nao-admin)
- `discount_rules` (SELECT)

### 4.2 Habilitar leaked password protection
- Ativar via configuracao de auth

---

## FASE 5: Logs de Seguranca

### 5.1 Tabela: security_logs
Nova tabela para eventos de seguranca:

```text
security_logs
- id (uuid, PK)
- user_id (uuid, NULL)
- action (text, NOT NULL) -- login_success, login_failed, user_created, user_invited, email_verified, password_reset, role_changed, user_activated, user_deactivated
- ip_address (text, NULL)
- user_agent (text, NULL)
- metadata (jsonb, NULL)
- created_at (timestamptz, default now())
```

RLS: Apenas admin pode SELECT. Nenhum DELETE/UPDATE.

### 5.2 Registrar eventos em edge functions
- manage-users: logar criacao de usuario, alteracao de role, ativacao/desativacao
- verify-email: logar confirmacao de email
- send-email: logar envio de convite

### 5.3 Registrar login no frontend (via edge function)
- Criar edge function `log-auth-event` que registra login bem-sucedido e tentativas falhas
- Chamar apos signIn no AuthContext

---

## FASE 6: Atualizacoes no Frontend

### 6.1 Pagina de Usuarios - botao "Reenviar Convite"
- **Arquivo:** `src/pages/Usuarios.tsx`
- Adicionar opcao no dropdown de acoes para reenviar email de verificacao
- Visivel apenas para usuarios inativos

### 6.2 Rota /auth/verify
- **Arquivo:** `src/App.tsx`
- Adicionar rota publica `/auth/verify` apontando para `VerifyEmail.tsx`

---

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Login.tsx` | Remover signup, mensagens genericas |
| `src/contexts/AuthContext.tsx` | Validar is_active, remover signUp |
| `src/types/index.ts` | Remover signUp do AuthContextType |
| `supabase/functions/send-email/index.ts` | NOVO - envio SMTP proprio |
| `supabase/functions/verify-email/index.ts` | NOVO - verificar token |
| `supabase/functions/resend-verification/index.ts` | NOVO - reenviar convite |
| `supabase/functions/log-auth-event/index.ts` | NOVO - log de seguranca |
| `supabase/functions/manage-users/index.ts` | Integrar com send-email, criar token |
| `supabase/functions/dispatch-outbound-webhook/index.ts` | Adicionar JWT validation |
| `src/pages/VerifyEmail.tsx` | NOVO - pagina de verificacao |
| `src/pages/Usuarios.tsx` | Botao reenviar convite |
| `src/App.tsx` | Adicionar rota /auth/verify |
| Migracao SQL | Tabelas email_verification_tokens + security_logs, RLS updates |
| `supabase/config.toml` | Registrar novas edge functions |

## Nota sobre SMTP Password

A senha SMTP sera armazenada como secret seguro do backend. **Nunca** sera incluida no codigo-fonte. Sera solicitada via ferramenta segura apos aprovacao do plano.

## Nota sobre dominio

Os links de verificacao usarao o dominio publicado atual: `https://soimabr.lovable.app`. Quando o dominio `soima.tryade.com.br` estiver configurado, basta atualizar o link na edge function.

