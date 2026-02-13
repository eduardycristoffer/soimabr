
# Tres Melhorias no Fluxo de Usuarios

## 1. Codigo de Verificacao (OTP) no Login

Adicionar uma segunda etapa de seguranca no login: apos o usuario informar email e senha corretamente, o sistema envia um codigo de 6 digitos por e-mail. O usuario precisa digitar esse codigo para completar o acesso.

### Fluxo:
```text
[Email + Senha] --> Valida credenciais --> Envia OTP por e-mail --> [Tela de codigo] --> Valida OTP --> Acesso liberado
```

### Alteracoes tecnicas:

**Nova tabela `login_otp_codes`:**
- `id`, `user_id`, `code` (6 digitos), `expires_at` (5 min), `used_at`, `created_at`
- RLS: sem acesso direto (tudo via Edge Function)

**Nova Edge Function `login-otp`:**
- Acao `generate`: recebe `user_id`, gera codigo de 6 digitos, salva na tabela, envia por e-mail via `send-email`
- Acao `verify`: recebe `user_id` + `code`, valida, marca como usado

**Arquivos frontend alterados:**
- `src/pages/Login.tsx` - Adicionar estado de "etapa 2" com input OTP apos validacao de senha. Usar o componente `InputOTP` ja existente no projeto
- `src/contexts/AuthContext.tsx` - Ajustar `signIn` para retornar o user_id sem criar sessao completa ate o OTP ser validado. Na pratica: fazer signIn, depois signOut imediato, salvar user_id temporariamente, e so fazer signIn definitivo apos OTP

**Template de e-mail OTP:**
- Assunto: "Codigo de acesso - Sistema SOIMA"
- Corpo com o codigo em destaque, expira em 5 minutos

---

## 2. Excluir Usuarios com Convite Pendente

Adicionar opcao de excluir usuarios inativos (que nunca confirmaram o e-mail) diretamente da tela de usuarios.

### Alteracoes tecnicas:

**Edge Function `manage-users` - nova acao `delete_user`:**
- Recebe `user_id`
- Verifica que o usuario alvo esta inativo (`is_active = false`)
- Remove tokens de verificacao, profile, role e o usuario do auth via `supabase.auth.admin.deleteUser()`
- Registra no `security_logs`

**Frontend `src/pages/Usuarios.tsx`:**
- Adicionar item "Excluir Convite" no menu dropdown, visivel apenas para usuarios inativos
- Usar o `AlertDialog` ja existente para confirmacao
- Icone `Trash2` do lucide-react

---

## 3. Criar Usuario Pedindo Apenas Email

O admin informa somente o e-mail. O sistema cria o usuario com uma senha temporaria aleatoria. Quando o usuario clicar no link de convite, alem de verificar o e-mail, ele sera direcionado para definir seu nome e senha.

### Alteracoes tecnicas:

**`src/components/users/InviteUserModal.tsx`:**
- Remover campos "Nome" e "Senha"
- Manter apenas o campo "Email"
- Atualizar schema zod para validar somente email

**Edge Function `manage-users` (acao `create_user`):**
- Gerar senha temporaria aleatoria (crypto.randomUUID)
- Usar o prefixo do email como nome temporario
- Marcar flag `must_set_password: true` no `user_metadata`

**Nova coluna em `profiles`:**
- `must_complete_profile` (boolean, default false) - indica que o usuario precisa definir nome e senha

**Edge Function `verify-email`:**
- Apos verificar o token, checar se `must_complete_profile` e true
- Retornar flag `must_complete_profile: true` na resposta

**`src/pages/VerifyEmail.tsx`:**
- Apos verificacao bem-sucedida com `must_complete_profile`, mostrar formulario para o usuario definir:
  - Nome completo
  - Nova senha (minimo 6 caracteres)
  - Confirmacao de senha
- Chamar nova acao na Edge Function para atualizar nome e senha

**Nova acao `complete_profile` em `manage-users`:**
- Recebe `user_id`, `name`, `password`
- Atualiza profile com o nome
- Atualiza senha via `supabase.auth.admin.updateUserById`
- Remove flag `must_complete_profile`

---

## Resumo dos arquivos afetados

| Arquivo | Acao |
|---|---|
| Nova migration SQL | Criar tabela `login_otp_codes`, adicionar coluna `must_complete_profile` em `profiles` |
| `supabase/functions/login-otp/index.ts` | Nova Edge Function para gerar/verificar OTP |
| `supabase/functions/manage-users/index.ts` | Novas acoes: `delete_user`, `complete_profile`; ajustar `create_user` |
| `supabase/functions/verify-email/index.ts` | Retornar flag `must_complete_profile` |
| `supabase/config.toml` | Registrar `login-otp` |
| `src/pages/Login.tsx` | Adicionar etapa OTP com componente InputOTP |
| `src/pages/VerifyEmail.tsx` | Adicionar formulario de nome/senha apos verificacao |
| `src/components/users/InviteUserModal.tsx` | Simplificar para somente email |
| `src/pages/Usuarios.tsx` | Adicionar opcao "Excluir Convite" para inativos |
| `src/contexts/AuthContext.tsx` | Ajustar fluxo de signIn para suportar OTP |
