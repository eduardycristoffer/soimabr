
# Converter Lead em Cliente = Cadastro Completo de Cliente

## Problema
O modal de conversao atual (`ConvertLeadModal`) tem apenas 5 campos basicos. Deveria ser identico ao formulario de cadastro de cliente (`ClientFormModal`), com CNPJ obrigatorio, tipo nacional/internacional, endereco, etc. - apenas com os dados do lead pre-preenchidos.

## Solucao

Substituir o `ConvertLeadModal` simplificado por uma versao que reutiliza o `ClientFormModal` existente, passando os dados do lead como valores iniciais.

### Abordagem: Reutilizar ClientFormModal com modo "conversao"

**Arquivo: `src/components/clients/ClientFormModal.tsx`**
- Adicionar prop opcional `leadData` com os dados do lead para pre-preencher
- Adicionar prop opcional `onConvertSuccess` callback para quando a conversao for concluida
- Quando `leadData` estiver presente, o modal funciona em modo "conversao":
  - Titulo muda para "Converter Lead em Cliente"
  - Botao muda para "Converter em Cliente"
  - Apos salvar com sucesso, chama `onConvertSuccess(clientId)` para atualizar o lead

**Arquivo: `src/pages/Pipeline.tsx`**
- Remover o `ConvertLeadModal` e usar o `ClientFormModal` no lugar
- Passar os dados do lead como `leadData` para pre-preenchimento
- No callback `onConvertSuccess`, atualizar o lead com `is_converted`, `converted_at`, `client_id` e registrar historico

**Arquivo: `src/components/pipeline/ConvertLeadModal.tsx`**
- Sera removido (nao mais necessario)

### Pre-preenchimento dos dados do lead

Os campos do lead serao mapeados para os campos do cliente:

| Campo do Lead | Campo do Cliente |
|---------------|-----------------|
| company_name | razao_social, nome_fantasia |
| contact_name | contato_nome |
| contact_email | contato_email |
| contact_phone | contato_telefone |

Os demais campos (CNPJ, endereco, tipo, etc.) ficam vazios para o usuario preencher.

---

## Detalhes tecnicos

### ClientFormModal - novas props

```text
interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  // Novas:
  leadData?: { company_name?: string; contact_name?: string; contact_email?: string; contact_phone?: string } | null;
  onConvertSuccess?: (clientId: string) => void;
}
```

Quando `leadData` presente:
- `getDefaultValues` usa dados do lead para preencher razao_social, nome_fantasia, contato_nome, contato_email, contato_telefone
- Apos `mutation.onSuccess`, chama `onConvertSuccess` com o ID do cliente criado
- Titulo e botao mudam para refletir "conversao"

### Pipeline.tsx - logica de conversao

No callback `onConvertSuccess(clientId)`:
1. Atualiza o lead: `is_converted = true`, `converted_at = now()`, `client_id = clientId`
2. Insere historico em `lead_histories` com action "CONVERTED"
3. Dispara webhook `lead.converted`
4. Invalida queries de leads e clientes

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/components/clients/ClientFormModal.tsx` | Adicionar props leadData e onConvertSuccess, ajustar titulo/botao e getDefaultValues |
| `src/pages/Pipeline.tsx` | Substituir ConvertLeadModal por ClientFormModal em modo conversao |
| `src/hooks/usePipelineData.ts` | Simplificar convertLeadMutation para receber apenas leadId + clientId (cliente ja criado pelo modal) |
| `src/components/pipeline/ConvertLeadModal.tsx` | Remover arquivo |
