## Corrigir salvamento do nome em Meu Perfil

O botão "Salvar Nome" hoje chama a edge function `manage-users` (action `update_own_profile`). A função não está registrando logs, indicando que a chamada falha antes de executar (provável problema de auth/JWT ao invocar). Como a RLS de `profiles` já permite `Users can update own profile` (`user_id = auth.uid()`), não há motivo para passar por edge function apenas para trocar o nome.

### Alteração

**`src/pages/MeuPerfil.tsx` — handler `handleSaveName`**

Trocar a chamada `supabase.functions.invoke("manage-users", { action: "update_own_profile", name })` por um `UPDATE` direto:

```ts
const { error } = await supabase
  .from("profiles")
  .update({ name: name.trim() })
  .eq("user_id", user!.user_id);
if (error) throw error;
```

Mantém validação de mínimo 2 caracteres, toast de sucesso/erro e o estado `savingName`. O fluxo de alterar senha continua usando a edge function (precisa de service role para `auth.admin.updateUserById`).

### Resultado

- Admin e operadores conseguem alterar o próprio nome direto pelo cliente
- Erro silencioso da edge function some do fluxo
- Continua auditado pelo trigger `audit_profiles` na tabela `profiles`
