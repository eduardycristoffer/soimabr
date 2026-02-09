

# Visibilidade de Clientes: Todos os Usuarios Veem Todos os Clientes

## Situacao Atual
A politica RLS de SELECT na tabela `clients` restringe operadores a verem apenas clientes onde `created_by = auth.uid()`. Isso impede que um operador veja clientes cadastrados por colegas.

## Mudanca Proposta
Alterar a politica de SELECT para que **todos os usuarios autenticados** possam visualizar todos os clientes ativos. As politicas de INSERT, UPDATE e DELETE permanecem iguais.

## Detalhes Tecnicos

### Migration SQL
Uma unica migration para substituir a politica de SELECT:

```text
DROP POLICY "Users can view clients" ON public.clients;

CREATE POLICY "Authenticated users can view all clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);
```

### Politicas que NAO mudam
- **INSERT**: `created_by = auth.uid()` (cada um cadastra com seu ID)
- **UPDATE**: admin ou dono (`created_by = auth.uid()`)
- **DELETE**: somente admin

### Arquivos de codigo
Nenhum arquivo de codigo precisa ser alterado. As queries ja buscam `clients` normalmente; a restricao era apenas no RLS.

## Resultado
- Operador ve todos os clientes da empresa (cadastrados por qualquer usuario)
- Operador continua editando apenas os clientes que ele cadastrou
- Admin ve e edita todos
- No wizard de orcamento (StepClient), o operador passa a ver todos os clientes disponiveis

