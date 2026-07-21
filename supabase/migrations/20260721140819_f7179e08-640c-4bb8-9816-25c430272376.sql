UPDATE public.contract_clauses
SET body = replace(
  body,
  '{{itens_inclusos_tabela}}',
  '{{itens_inclusos_tabela}}

Descrição por extenso dos itens inclusos:
{{itens_inclusos_extenso}}

Especificações da grua por extenso:
{{especificacoes_grua_extenso}}'
)
WHERE template_id IS NOT NULL
  AND body LIKE '%{{itens_inclusos_tabela}}%'
  AND body NOT LIKE '%{{itens_inclusos_extenso}}%';