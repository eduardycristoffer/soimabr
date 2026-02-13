

# Corrigir Dominio dos Links de Verificacao e Melhorar Layout do Email

## Problema 1: Dominio Errado
Os links de verificacao no e-mail apontam para `soimabr.lovable.app` em vez de `soima.tryade.com.br`.

## Problema 2: Layout do Logo
Melhorar a visibilidade do logo no header do e-mail.

---

## Alteracoes

### 1. Atualizar APP_URL em duas Edge Functions

**Arquivos afetados:**
- `supabase/functions/manage-users/index.ts` (linha 9)
- `supabase/functions/resend-verification/index.ts` (linha 10)

Alterar de:
```text
const APP_URL = "https://soimabr.lovable.app";
```
Para:
```text
const APP_URL = "https://soima.tryade.com.br";
```

### 2. Melhorar layout do logo no template de e-mail

Nos templates HTML de ambas as funcoes (`manage-users` e `resend-verification`) e tambem no `send-email/index.ts`:

- Aumentar o padding do header de 24px para 32px
- Aumentar a altura do logo de 40px para 56px
- Adicionar mais espaco ao redor do logo para melhor visibilidade

### 3. Atualizar tambem o template em send-email

O arquivo `supabase/functions/send-email/index.ts` tambem tem um template base com o logo. Atualizar a mesma melhoria de layout la.

---

## Nota Importante

O dominio `soima.tryade.com.br` precisa estar configurado e apontando para o projeto. Caso ainda nao esteja configurado, os links nao funcionarao ate que o DNS esteja ativo. Para configurar, va em **Settings > Domains** no projeto e adicione `soima.tryade.com.br`.

