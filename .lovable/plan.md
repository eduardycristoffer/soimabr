

# Corrigir erro "duplicate key violates unique constraint quotes_quote_number_key"

## Causa raiz

No `QuoteWizard.tsx`, ao criar uma nova proposta, o codigo insere `quote_number: "TEMP"`. Porem, o trigger `generate_quote_number_trigger` no banco so e acionado quando `quote_number IS NULL OR quote_number = ''`. Como "TEMP" nao e NULL nem vazio, o trigger nunca dispara e a proposta e salva com o numero "TEMP". Na segunda proposta, o erro de chave duplicada ocorre.

## Correcao

**Arquivo: `src/components/quotes/QuoteWizard.tsx`**

Alterar a linha que define `quote_number: "TEMP"` para `quote_number: ""` (string vazia), permitindo que o trigger do banco gere automaticamente o numero no formato PRO260010, PRO260011, etc.

Tambem corrigir o registro existente com quote_number "TEMP" no banco, atualizando para o proximo numero da sequencia via SQL.

## Detalhes tecnicos

### Alteracao no codigo (1 linha)
```text
// Antes:
quote_number: "TEMP",

// Depois:
quote_number: "",
```

### Correcao de dado existente (migracao SQL)
Atualizar o registro que ficou com "TEMP" para receber o proximo numero valido da sequencia.

### Arquivos modificados
| Arquivo | Acao |
|---------|------|
| `src/components/quotes/QuoteWizard.tsx` | Trocar "TEMP" por "" na linha 215 |
| Migracao SQL | Corrigir registro existente com quote_number = "TEMP" |
