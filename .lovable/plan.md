

## Ajustes no PDF: Cabecalho fixo + correcao de sobreposicao do rodape

### Problema 1: "Documento gerado em..." deve ser cabecalho fixo

Atualmente o texto "Documento gerado em 20/02/2026 por Eduardy Cristoffer (eduardycristoffer@outlook.com)" esta no final do conteudo (linha 940-943 do codigo). O usuario quer que seja um cabecalho fixo, pequeno e discreto, presente em todas as paginas de conteudo (exceto capa e contracapa).

### Problema 2: Rodape sobrepondo conteudo

O `padding-bottom: 40mm` ainda nao e suficiente. Na pagina 2 do PDF gerado, a secao "Condicoes Comerciais" esta sendo cortada pelo rodape fixo -- informacoes como "Prazo de Entrega" ficam escondidas. Sera aumentado para `45mm` e adicionado `padding-top` extra para acomodar o cabecalho fixo.

### Solucao

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | 3 alteracoes descritas abaixo |

#### 1. Criar cabecalho fixo discreto (`.page-header`)

Novo elemento HTML com `position: fixed; top: 0` que repete em todas as paginas impressas. Contera o texto "Documento gerado em [data] por [nome] ([email])" com fonte pequena (7px), cor cinza claro (#999), alinhado a direita. Mesma estrategia de z-index: o cabecalho fica com `z-index: 10` e as imagens de capa/contracapa com `z-index: 20`, escondendo-o nessas paginas.

```css
.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 6px 15mm;
  font-size: 7px;
  color: #999;
  text-align: right;
  z-index: 10;
  background: white;
}
```

#### 2. Aumentar padding para evitar sobreposicao

- `padding-top`: de `15mm` para `20mm` (espaco para o cabecalho fixo)
- `padding-bottom`: de `40mm` para `45mm` (mais margem para o rodape fixo)

#### 3. Remover texto "gerado em" do final do conteudo

O bloco na linha 940-943 que exibia o texto inline sera removido, pois agora o cabecalho fixo cumpre essa funcao.

