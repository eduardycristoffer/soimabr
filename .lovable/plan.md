

## Adicionar Descrição Técnica em Inglês nos Produtos

### Resumo

Adicionar campo `descricao_tecnica_en` no cadastro de produtos para que propostas em inglês usem a versão traduzida da descrição técnica no PDF.

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | `ALTER TABLE products ADD COLUMN descricao_tecnica_en text;` |
| `ProductFormModal.tsx` | Adicionar campo "Technical Description (English)" abaixo da descrição técnica PT-BR. Visível para todas as categorias (assim como a descrição técnica PT-BR). Salvar no payload. |
| `generate-pdf/index.ts` | Quando `lang === "en"` e `descricao_tecnica_en` existir, usar no lugar de `descricao_tecnica` |

#### Formulário

Abaixo do campo "Descrição Técnica" e do checkbox "Exibir no PDF", adicionar:

```
Descrição Técnica (English)
[textarea] Technical product description...
```

O campo aparece para todos os produtos (não só gruas), igual ao campo PT-BR.

#### PDF

Na linha que renderiza `descricao_tecnica`, trocar:
```
const techDesc = (lang === "en" && product?.descricao_tecnica_en) 
  ? product.descricao_tecnica_en 
  : product?.descricao_tecnica;
```

