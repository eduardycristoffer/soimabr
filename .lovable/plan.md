
# Correcoes e Novas Funcionalidades

## Problema 1: Erro 404 na pagina /auth/verify

A rota `/auth/verify` existe no React Router (App.tsx linha 36), mas como o app e uma SPA (Single Page Application), o servidor precisa redirecionar todas as rotas para `index.html`. O dominio customizado `soima.tryade.com.br` provavelmente ainda nao foi publicado com as alteracoes mais recentes, ou o dominio precisa ser configurado nas configuracoes do projeto.

**Acao:** Verificar se o projeto foi publicado apos as ultimas alteracoes. Se o dominio `soima.tryade.com.br` esta configurado em Settings > Domains, basta republicar o projeto. O roteamento SPA e tratado automaticamente pela plataforma.

---

## Problema 2: Recuperacao de Senha

Adicionar fluxo completo de "Esqueci minha senha" no login.

### Fluxo:
```text
[Tela Login] -> "Esqueci minha senha" -> [Informar email] -> Envia link por e-mail -> [Pagina /auth/reset-password?token=...] -> Definir nova senha -> Redirecionado ao login
```

### Alteracoes:

**Nova tabela `password_reset_tokens`:**
- `id` (uuid), `user_id` (uuid), `token` (uuid, default gen_random_uuid()), `expires_at` (timestamptz), `used_at` (timestamptz nullable), `created_at`
- RLS habilitado, sem politicas diretas (acesso apenas via Edge Function)

**Nova Edge Function `reset-password`:**
- Acao `request`: recebe `email`, verifica se usuario existe e esta ativo, gera token, envia e-mail com link `APP_URL/auth/reset-password?token=...` usando template ja existente `getPasswordResetEmailHTML` do `send-email`
- Acao `reset`: recebe `token` + `new_password`, valida token, atualiza senha via `auth.admin.updateUserById`, marca token como usado
- Nao requer autenticacao (chamado por usuarios deslogados)

**Frontend - Login.tsx:**
- Adicionar link "Esqueci minha senha" abaixo do campo de senha
- Ao clicar, mostrar tela simples para informar o email e solicitar redefinicao

**Nova pagina `src/pages/ResetPassword.tsx`:**
- Le o token da URL
- Formulario com "Nova senha" e "Confirmar senha"
- Chama a Edge Function `reset-password` com acao `reset`
- Apos sucesso, redireciona para `/login`

**App.tsx:**
- Adicionar rota `/auth/reset-password` apontando para `ResetPassword`

**Registrar em config.toml:**
- `[functions.reset-password]` com `verify_jwt = false`

---

## Problema 3: Pagina de Perfil (Alterar Nome e Senha)

Adicionar opcao no sidebar para o usuario acessar seu perfil e alterar nome e senha.

### Alteracoes:

**Nova pagina `src/pages/MeuPerfil.tsx`:**
- Secao 1: Alterar nome (campo editavel com botao Salvar)
- Secao 2: Redefinir senha (senha atual, nova senha, confirmar nova senha)
- Ambas as acoes chamam a Edge Function `manage-users`

**Nova acao `update_own_profile` em manage-users:**
- Requer autenticacao (JWT do proprio usuario, nao precisa ser admin)
- Recebe `name` (opcional) e/ou `current_password` + `new_password`
- Para alterar senha: valida a senha atual fazendo signIn temporario, depois atualiza via admin API
- Para alterar nome: atualiza o profile e user_metadata

**Sidebar.tsx:**
- Adicionar link "Meu Perfil" ou tornar o nome do usuario clicavel, redirecionando para `/perfil`

**App.tsx:**
- Adicionar rota `/perfil` dentro das rotas protegidas apontando para `MeuPerfil`

---

## Problema 4: Logo Branca da SOIMA no Email

O usuario forneceu a logo branca da SOIMA BR (arquivo `logo-2-soima_3.webp`). Essa logo deve ser usada nos templates de e-mail no lugar da logo atual.

### Alteracoes:

**Upload da logo:**
- Copiar `user-uploads://logo-2-soima_3.webp` para `public/images/logo-soima-white.webp`
- Fazer upload para o Supabase Storage no bucket `logos` como `soima-logo-white.webp`
- Atualizar a constante `SOIMA_LOGO_URL` em todas as Edge Functions para apontar para a nova logo branca

**Arquivos afetados:**
- `supabase/functions/manage-users/index.ts` (linha 11)
- `supabase/functions/resend-verification/index.ts` (linha 9)
- `supabase/functions/login-otp/index.ts` (linha 9)
- `supabase/functions/send-email/index.ts` (linha 10)

---

## Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| Nova migration SQL | Criar tabela `password_reset_tokens` |
| `supabase/functions/reset-password/index.ts` | Nova Edge Function para recuperacao de senha |
| `supabase/functions/manage-users/index.ts` | Nova acao `update_own_profile` + atualizar logo URL |
| `supabase/functions/login-otp/index.ts` | Atualizar logo URL |
| `supabase/functions/resend-verification/index.ts` | Atualizar logo URL |
| `supabase/functions/send-email/index.ts` | Atualizar logo URL |
| `supabase/config.toml` | Registrar `reset-password` |
| `src/pages/Login.tsx` | Adicionar "Esqueci minha senha" com formulario inline |
| `src/pages/ResetPassword.tsx` | Nova pagina para redefinir senha via token |
| `src/pages/MeuPerfil.tsx` | Nova pagina de perfil com edicao de nome e senha |
| `src/components/layout/Sidebar.tsx` | Link para pagina de perfil |
| `src/App.tsx` | Novas rotas `/auth/reset-password` e `/perfil` |
| `public/images/logo-soima-white.webp` | Logo branca copiada do upload |
