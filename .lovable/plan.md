

# Filtro de Categorias Responsivo na Pagina de Produtos

## Problema
As abas (Tabs) de categorias quebram o layout em telas menores porque ocupam muito espaco horizontal, fazendo o conteudo transbordar.

## Solucao
Substituir o componente `Tabs/TabsList/TabsTrigger` por um `Select` dropdown, mantendo "Todos" como opcao padrao e listando as categorias no menu suspenso.

## Arquivo alterado
`src/pages/Produtos.tsx`

## Mudancas

### Imports
- Remover imports de `Tabs, TabsList, TabsTrigger`
- Adicionar import de `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` de `@/components/ui/select`

### UI (linhas 145-164)
Substituir o bloco de `<Tabs>` por um `<Select>` compacto:

```text
<Select value={category} onValueChange={(v) => setCategory(v)}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Todos" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="grua">Gruas</SelectItem>
    <SelectItem value="configuracao">Configuracoes</SelectItem>
    <SelectItem value="torre">Torres</SelectItem>
    <SelectItem value="tramo">Tramos</SelectItem>
    <SelectItem value="chassis">Chassis</SelectItem>
    <SelectItem value="acessorio">Acessorios</SelectItem>
  </SelectContent>
</Select>
```

Os emojis das categorias serao mantidos nos itens do Select para manter consistencia visual. O dropdown tem fundo solido e z-index alto para nao ficar transparente.

### Layout do header
Reorganizar os controles (busca, switch inativos, select categoria) para ficarem bem empilhados em mobile e lado a lado em desktop.

