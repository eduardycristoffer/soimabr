

# Alterar Prefixo de Proposta e Adicionar Logos no PDF

## Resumo

Tres alteracoes:
1. Trocar o prefixo de numeracao de propostas de **ORC** para **PRO**
2. Adicionar as logos da **Yelum Seguradora** e **CREA-GO** no rodape do PDF
3. Adicionar a **logo da SOIMA** no canto superior esquerdo do cabecalho do PDF

---

## 1. Alterar Prefixo ORC para PRO

A numeracao atual e gerada por uma trigger no banco de dados (`generate_quote_number`). A funcao monta o numero como `ORC` + ano (2 digitos) + sequencial (4 digitos).

### Migration SQL

Recriar a funcao `generate_quote_number()` substituindo `ORC` por `PRO`:

```text
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 4 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.quotes
  WHERE quote_number LIKE 'PRO' || year_suffix || '%';
  
  NEW.quote_number := 'PRO' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

**Nota:** Propostas existentes com prefixo ORC permanecem inalteradas. Apenas novas propostas usarao PRO.

---

## 2. Logos no PDF (Edge Function `generate-pdf/index.ts`)

As logos da SOIMA, CREA-GO e Yelum ja existem em `src/assets/`. Porem, a Edge Function gera HTML puro no servidor e nao tem acesso ao sistema de arquivos do frontend. As imagens precisam ser embutidas como **base64 data URIs** diretamente no HTML do PDF.

### Copiar novas logos para o projeto

Copiar os arquivos enviados (`crea-go-logo-2.webp` e `Yelum-2.png`) para `src/assets/` como versoes atualizadas.

### Embutir logos na Edge Function

Na funcao `generateQuoteHTML()`:

- **Cabecalho (canto superior esquerdo):** Adicionar a logo da SOIMA como imagem base64 antes do nome da empresa
- **Rodape:** Adicionar as logos da Yelum Seguradora e CREA-GO lado a lado, em tamanho pequeno, apos os dados institucionais

As imagens serao convertidas para base64 e inseridas diretamente no codigo da Edge Function como constantes.

---

## Arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Recriar funcao `generate_quote_number` com prefixo PRO |
| `supabase/functions/generate-pdf/index.ts` | Adicionar logo SOIMA no cabecalho + logos Yelum e CREA no rodape (base64) |
| `src/assets/crea-go-logo.webp` | Atualizar com a nova versao enviada |
| `src/assets/yelum-logo.png` | Atualizar com a nova versao enviada |

