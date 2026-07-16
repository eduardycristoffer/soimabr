
-- 1) Enum de status
DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('draft','sent','signed','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Company settings: novos campos
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS representante_nome text,
  ADD COLUMN IF NOT EXISTS representante_cpf text,
  ADD COLUMN IF NOT EXISTS representante_rg text,
  ADD COLUMN IF NOT EXISTS representante_cargo text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text;

-- 3) contract_templates
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contract_type public.quote_type NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view templates" ON public.contract_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert templates" ON public.contract_templates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Only admins can update templates" ON public.contract_templates
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Only admins can delete templates" ON public.contract_templates
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;

-- 4) contract_clauses
CREATE TABLE IF NOT EXISTS public.contract_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_core boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_clauses TO authenticated;
GRANT ALL ON public.contract_clauses TO service_role;
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view clauses" ON public.contract_clauses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins manage clauses" ON public.contract_clauses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) contracts
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id),
  template_id uuid NOT NULL REFERENCES public.contract_templates(id),
  status public.contract_status NOT NULL DEFAULT 'draft',
  seller_rep_name text, seller_rep_cpf text, seller_rep_rg text, seller_rep_cargo text,
  buyer_rep_name text, buyer_rep_cpf text, buyer_rep_rg text, buyer_rep_cargo text,
  seller_manager_name text, seller_manager_cpf text, seller_manager_phone text, seller_manager_email text,
  buyer_manager_name text, buyer_manager_cpf text, buyer_manager_phone text, buyer_manager_email text,
  payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_days int,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  generated_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  cancelled_at timestamptz,
  pdf_url text,
  signed_pdf_url text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (public.can_view_quote(quote_id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Users can create contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY "Users can delete own draft contracts" ON public.contracts
  FOR DELETE TO authenticated
  USING ((created_by = auth.uid() AND status = 'draft') OR public.has_role(auth.uid(),'admin'));

-- 6) contract_clause_snapshots
CREATE TABLE IF NOT EXISTS public.contract_clause_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  source_clause_id uuid REFERENCES public.contract_clauses(id),
  order_index int NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_core boolean NOT NULL DEFAULT false,
  edited_by uuid,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_clause_snapshots TO authenticated;
GRANT ALL ON public.contract_clause_snapshots TO service_role;
ALTER TABLE public.contract_clause_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contract snapshots" ON public.contract_clause_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (public.can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())));
CREATE POLICY "Users can insert own contract snapshots" ON public.contract_clause_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Users can update own contract snapshots" ON public.contract_clause_snapshots
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Users can delete own contract snapshots" ON public.contract_clause_snapshots
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- 7) Triggers: updated_at
CREATE TRIGGER trg_contract_templates_updated BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contract_clauses_updated BEFORE UPDATE ON public.contract_clauses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Trigger: set created_by from auth
CREATE OR REPLACE FUNCTION public.set_contract_created_by_from_auth()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NOT NULL THEN NEW.created_by := _uid; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_contracts_set_created_by BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_created_by_from_auth();

-- 9) Trigger: numeração CTRYY####
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE year_suffix text; seq int;
BEGIN
  IF NEW.contract_number IS NOT NULL AND NEW.contract_number <> '' THEN RETURN NEW; END IF;
  year_suffix := to_char(now(),'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 6) AS int)),0)+1 INTO seq
  FROM public.contracts
  WHERE contract_number LIKE 'CTR'||year_suffix||'%' AND LENGTH(contract_number)=9;
  NEW.contract_number := 'CTR'||year_suffix||LPAD(seq::text,4,'0');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_contracts_generate_number BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();

-- 10) Trigger: bloqueia edição de contrato assinado
CREATE OR REPLACE FUNCTION public.prevent_signed_contract_edit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.signed_pdf_url IS DISTINCT FROM OLD.signed_pdf_url
       OR NEW.pdf_url IS DISTINCT FROM OLD.pdf_url
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Contrato assinado não pode ser editado';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_contracts_prevent_signed_edit BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_signed_contract_edit();

-- 11) SEED: Template de VENDA
DO $seed$
DECLARE t_id uuid;
BEGIN
  INSERT INTO public.contract_templates (name, contract_type, version, is_active)
  VALUES ('Contrato de Venda de Equipamento', 'venda', 1, true)
  RETURNING id INTO t_id;

  INSERT INTO public.contract_clauses (template_id, order_index, title, body, is_core) VALUES
  (t_id, 0, 'Qualificação das Partes',
$$
{{vendedora_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{vendedora_cnpj}} e Inscrição Estadual nº {{vendedora_ie}}, com sede em {{vendedora_endereco}}, e-mail {{vendedora_email}}, neste ato representada por {{vendedora_representante_nome}}, portador(a) do CPF nº {{vendedora_representante_cpf}} e RG nº {{vendedora_representante_rg}}, cargo {{vendedora_representante_cargo}}, doravante denominada VENDEDORA;

E, de outro lado, {{compradora_razao_social}}, inscrita no CNPJ/CPF sob o nº {{compradora_cnpj_cpf}}, com sede/domicílio em {{compradora_endereco}}, {{compradora_cidade}} - {{compradora_estado}}, CEP {{compradora_cep}}, e-mail {{compradora_email}}, neste ato representada por {{compradora_representante_nome}}, portador(a) do CPF nº {{compradora_representante_cpf}} e RG nº {{compradora_representante_rg}}, cargo {{compradora_representante_cargo}}, doravante denominada COMPRADORA;

Resolvem celebrar o presente contrato de venda de equipamento, regendo-se pelas cláusulas e condições a seguir:
$$, true),
  (t_id, 1, 'Do Objeto do Contrato',
$$
1.1. O presente contrato tem como objeto a venda e compra de 01 (uma) {{equipamento_tipo}}, marca {{equipamento_marca}}, modelo {{equipamento_modelo}}, de acordo com o descritivo abaixo:

Especificações Técnicas:
- Lança: {{lanca_m}} m
- Altura da torre: {{altura_torre_m}} m
- Capacidade de carga máxima: {{carga_maxima_kg}} kg
- Capacidade de carga na ponta da lança: {{carga_ponta_kg}} kg

Componentes Inclusos:
{{itens_inclusos_tabela}}

Documentação que acompanha o equipamento: Certificado de Fabricação, Certificado de Garantia, Manual de Instruções, Livro de Registro, ART de fabricação do equipamento.
$$, true),
  (t_id, 2, 'Prazo de Entrega',
$$
2.1. O equipamento será entregue pela VENDEDORA em até {{prazo_entrega_dias}} dias após a confirmação deste contrato, nos termos da Cláusula 4.
2.2. A COMPRADORA poderá requerer alteração da data acordada, mediante solicitação por escrito com antecedência mínima de 15 (quinze) dias. A VENDEDORA reserva-se o direito de aceitar ou recusar tal solicitação.
$$, false),
  (t_id, 3, 'Do Preço',
$$
3.1. Fica estipulado o valor de venda do equipamento em {{valor_total_extenso}} ({{valor_total_numerico}}), abrangendo todos os custos relacionados ao objeto contratado.
$$, true),
  (t_id, 4, 'Das Condições de Pagamento',
$$
4.1. O pagamento do valor total será realizado pela COMPRADORA conforme as seguintes condições:

{{condicoes_pagamento_tabela}}

4.1.1. A nota fiscal será emitida pela VENDEDORA em nome da COMPRADORA e enviada para {{compradora_email}}. A COMPRADORA estará isenta de ônus por atrasos decorrentes de mora da VENDEDORA na emissão de nota fiscal, boletos ou cumprimento de outras obrigações contratuais.
4.2. O pagamento das parcelas será efetuado por meio de boleto bancário, enviado com no mínimo 28 dias de antecedência do vencimento.
4.3. Este contrato terá início após o pagamento da entrada e será considerado concluído mediante confirmação do recebimento de todas as parcelas.
4.4. A ausência de pagamento nas datas de vencimento sujeitará a COMPRADORA a multa de 2% sobre o valor devido, acrescida de juros de 1% ao mês.
4.5. Em caso de atraso superior a 15 dias, a VENDEDORA poderá notificar a COMPRADORA por escrito para quitação em 15 dias adicionais; não regularizado, a VENDEDORA poderá bloquear o uso do equipamento até a quitação, sem gerar direito a indenização à COMPRADORA.
4.6. A VENDEDORA é responsável pelo recolhimento de impostos, taxas e contribuições incluídos nos valores acordados.
4.7. Durante a vigência deste contrato, a COMPRADORA garantirá acesso ao local de instalação aos colaboradores da VENDEDORA sempre que necessário.
$$, true),
  (t_id, 5, 'Do Transporte e Prestação de Serviços',
$$
5.1. A realização de serviços de montagem, assistência técnica, manutenção preventiva/corretiva, telescopagem/ascensão, desmontagem e transporte exige contrato específico de prestação de serviços, exceto os já incluídos neste contrato conforme Cláusula 1.
$$, true),
  (t_id, 6, 'Direito de Imagem',
$$
6.1. A VENDEDORA poderá utilizar imagens do equipamento instalado nas dependências da COMPRADORA em materiais de divulgação, em qualquer mídia, no território nacional ou onde mantenha relações comerciais, mediante solicitação prévia por escrito especificando conteúdo e locais de veiculação, e aprovação por escrito da COMPRADORA.
$$, false),
  (t_id, 7, 'Garantias',
$$
7.1. A VENDEDORA concede garantia contra defeitos de fabricação e estruturais pelo período de {{garantia_estrutural_anos}} anos, e de {{garantia_eletrica_anos}} anos para componentes elétricos e motores, contados a partir da montagem do equipamento no canteiro de obras da COMPRADORA.
7.2. As garantias não cobrem danos originados de: (a) utilização inadequada; (b) suprimento inadequado de energia elétrica; (c) descumprimento dos procedimentos de manutenção recomendados; (d) prolongada falta de utilização; (e) assistência técnica, montagem ou alterações por fornecedores não credenciados ou sem autorização por escrito da VENDEDORA; (f) desgaste normal das peças; (g) queima de motores/componentes não decorrente de defeito de fabricação.
$$, true),
  (t_id, 8, 'Das Obrigações da Vendedora',
$$
8.1. Oferecer plena garantia do perfeito funcionamento do equipamento na instalação, conforme especificações técnicas e normas de segurança da NR 18.
8.2. Responsabilizar-se, por técnicos credenciados, pelos serviços de instalação, manutenção e reparos do equipamento.
8.3. Fornecer a ART (Anotação de Responsabilidade Técnica) de montagem.
8.4. Garantir que o equipamento seja deixado em perfeitas condições de uso após a instalação.
8.5. Cuidar da carga do equipamento em seu depósito.
8.6. Realizar manutenção corretiva em horário útil, sem limite de chamadas, para itens cobertos pela garantia.
8.7. Substituir peças danificadas por defeito de fabricação, excluídas as danificadas por mau uso.
$$, true),
  (t_id, 9, 'Das Obrigações da Compradora',
$$
9.1. Executar a base de concreto para apoio do equipamento, conforme especificações do calculista da obra.
9.2. Instalar a rede elétrica até a base da grua.
9.3. Executar o aterramento do equipamento, fornecer laudo técnico e realizar medições semestrais.
9.4. Executar as furações necessárias para montagem das vigas de apoio dos anéis, verificando junto ao calculista a necessidade de reforço estrutural.
9.5. Manter o local da base sempre limpo, isolado e com acesso restrito; descumprimento autoriza a VENDEDORA a interditar o equipamento após notificação por escrito, com prazo de 5 dias para regularização.
9.6. Utilizar o equipamento dentro dos limites de capacidade da Cláusula 1, operado apenas por profissionais qualificados; a COMPRADORA responde por acidentes decorrentes de excesso de carga ou operação inadequada.
9.7. Manter o equipamento no local de instalação; despesas de mudança de local correm por conta da COMPRADORA.
9.8. Não realizar modificações no equipamento sem autorização prévia da VENDEDORA.
9.9. Responsabilizar-se por dano, prejuízo ou inutilização do equipamento causado por si ou terceiros.
9.10. Providenciar alvarás, licenças e autorizações necessárias ao uso do equipamento, incluindo uso de vias públicas quando aplicável.
$$, true),
  (t_id, 10, 'Reserva de Propriedade',
$$
10.1. A propriedade do equipamento fica reservada à VENDEDORA até o pagamento integral do preço ajustado.
10.2. A COMPRADORA considera o equipamento recebido quando em funcionamento, tornando-se depositária do bem até quitação integral, reconhecendo-o como propriedade da VENDEDORA.
10.3. A posse direta pela COMPRADORA não afeta a posse indireta e propriedade da VENDEDORA.
10.4. Despesas do depósito são da COMPRADORA, que não poderá alienar o bem, exercendo apenas posse de depositária.
10.5. O não pagamento de duas parcelas consecutivas ou alternadas acarreta vencimento antecipado das demais, facultando à VENDEDORA: (a) rescindir o contrato com reintegração de posse (art. 562 do CPC); ou (b) cobrar as parcelas vencidas e futuras antecipadamente.
10.6. Enquanto o contrato não for finalizado, a COMPRADORA não poderá ceder pertences/acessórios do equipamento nem transferir a terceiros direitos e obrigações deste contrato.
10.7. Em caso de rescisão, a parte culpada responde pelas despesas de defesa de direitos, consertos, recuperação do bem e indenização pelo uso durante o período de posse.
$$, true),
  (t_id, 11, 'Rescisão',
$$
11.1. Rescisão por culpa da VENDEDORA: valores pagos serão reembolsados nas condições de pagamento estabelecidas, acrescidos de juros e correção pelo IGPM/FGV.
11.2. Rescisão por culpa da COMPRADORA: a VENDEDORA poderá reter os valores pagos até a data da rescisão para compensar custos incorridos e prejuízos, sem prejuízo de cobrança dos trabalhos e equipamentos já executados/fabricados.
11.3. Incluem-se nos custos: fabricação, planejamento, logística de montagem e entrega, transportadora, equipamentos auxiliares de carga/descarga/montagem.
11.4. É vedada a cessão ou transferência de direitos/deveres deste contrato sem concordância expressa da parte contrária, exceto imposição legal.
$$, true),
  (t_id, 12, 'Da Assinatura',
$$
12.1. As partes reconhecem a validade da assinatura em formato eletrônico e/ou certificados eletrônicos, incluindo os não emitidos pela ICP-Brasil, nos termos do art. 10, §2º da MP 2.200-2/2001.
12.2. Cada parte designará um gestor de contrato:
Gestor VENDEDORA: {{gestor_vendedora_nome}}, CPF {{gestor_vendedora_cpf}}, telefone {{gestor_vendedora_telefone}}, e-mail {{gestor_vendedora_email}}.
Gestor COMPRADORA: {{gestor_compradora_nome}}, CPF {{gestor_compradora_cpf}}, telefone {{gestor_compradora_telefone}}, e-mail {{gestor_compradora_email}}.
Os gestores não possuem autorização para alterar o contrato. Comunicações serão feitas via e-mail dos representantes legais e gestores, com prazo de resposta de 2 dias úteis; a ausência de manifestação após esse prazo será considerada concordância.
$$, true),
  (t_id, 13, 'Da Integridade e Anticorrupção',
$$
13.1. A VENDEDORA declara conduzir suas atividades com integridade e ética, sendo inaceitáveis: discriminação de qualquer natureza; pagamento/recebimento de propinas; recebimento de brindes/favores não promocionais visando privilégios indevidos; atos que causem dano a interesses éticos ou prejuízos à COMPRADORA.
13.2. A VENDEDORA está ciente da Lei nº 12.846/2013 e Decreto nº 8.420/2015, reconhecendo como inaceitável qualquer favorecimento ou vantagem pessoal a autoridades públicas ou privadas visando tratamento favorecido.
$$, true),
  (t_id, 14, 'Da Lei Geral de Proteção de Dados',
$$
14.1. As partes obrigam-se a atuar em conformidade com a legislação de Proteção de Dados Pessoais, especialmente a Lei nº 13.709/2018 (LGPD).
14.2. As partes comprometem-se a manter sigilo e confidencialidade de todas as informações e dados pessoais repassados na execução contratual, vedado o repasse a terceiros salvo obrigação legal ou necessidade de cumprimento deste contrato.
$$, true),
  (t_id, 15, 'Foro',
$$
15.1. Fica eleito o foro de {{foro_cidade}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja. As partes assinam eletronicamente, junto a duas testemunhas, podendo ser impressas as cópias necessárias.

{{data_contrato}}

Vendedora: {{vendedora_razao_social}} — Representante: {{vendedora_representante_nome}} — Cargo: {{vendedora_representante_cargo}} — CPF: {{vendedora_representante_cpf}}
Compradora: {{compradora_razao_social}} — Representante: {{compradora_representante_nome}} — Cargo: {{compradora_representante_cargo}} — CPF: {{compradora_representante_cpf}}

Testemunhas:
1) Nome: _______________________ CPF: ______________ E-mail: _______________________
2) Nome: _______________________ CPF: ______________ E-mail: _______________________
$$, true);
END $seed$;

-- 12) SEED: Template de LOCAÇÃO
DO $seed2$
DECLARE t_id uuid;
BEGIN
  INSERT INTO public.contract_templates (name, contract_type, version, is_active)
  VALUES ('Contrato de Locação de Equipamento (Rascunho — revisar com jurídico)', 'locacao', 1, true)
  RETURNING id INTO t_id;

  INSERT INTO public.contract_clauses (template_id, order_index, title, body, is_core) VALUES
  (t_id, 0, 'Qualificação das Partes',
$$
{{vendedora_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{vendedora_cnpj}} e Inscrição Estadual nº {{vendedora_ie}}, com sede em {{vendedora_endereco}}, e-mail {{vendedora_email}}, neste ato representada por {{vendedora_representante_nome}}, portador(a) do CPF nº {{vendedora_representante_cpf}} e RG nº {{vendedora_representante_rg}}, cargo {{vendedora_representante_cargo}}, doravante denominada LOCADORA;

E, de outro lado, {{compradora_razao_social}}, inscrita no CNPJ/CPF sob o nº {{compradora_cnpj_cpf}}, com sede/domicílio em {{compradora_endereco}}, {{compradora_cidade}} - {{compradora_estado}}, CEP {{compradora_cep}}, e-mail {{compradora_email}}, neste ato representada por {{compradora_representante_nome}}, portador(a) do CPF nº {{compradora_representante_cpf}} e RG nº {{compradora_representante_rg}}, cargo {{compradora_representante_cargo}}, doravante denominada LOCATÁRIA;

Resolvem celebrar o presente contrato de locação de equipamento, regendo-se pelas cláusulas e condições a seguir:
$$, true),
  (t_id, 1, 'Do Objeto da Locação',
$$
1.1. O presente contrato tem como objeto a locação de 01 (uma) {{equipamento_tipo}}, marca {{equipamento_marca}}, modelo {{equipamento_modelo}}, destinada à obra localizada em {{compradora_endereco}}, {{compradora_cidade}} - {{compradora_estado}}, conforme especificações:

- Lança: {{lanca_m}} m
- Altura da torre: {{altura_torre_m}} m
- Capacidade de carga máxima: {{carga_maxima_kg}} kg
- Capacidade de carga na ponta da lança: {{carga_ponta_kg}} kg

Itens inclusos:
{{itens_inclusos_tabela}}
$$, true),
  (t_id, 2, 'Prazo de Locação',
$$
2.1. O prazo de locação é de {{rental_duration_months}} meses, com início previsto em {{rental_start_date}}, prorrogável mediante acordo escrito entre as partes.
$$, true),
  (t_id, 3, 'Valor e Condições de Pagamento',
$$
3.1. O valor mensal da locação é de {{rental_monthly_value}}.
3.2. Serviços contratados adicionais:
- Mobilização: {{rental_mobilization}}
- Desmobilização: {{rental_demobilization}}
- Frete: {{rental_freight}}
- Montagem: {{rental_assembly}}
- Desmontagem: {{rental_disassembly}}
- Operador incluído: {{rental_operator_included}}
- Manutenção inclusa: {{rental_maintenance_included}}
- Seguro incluso: {{rental_insurance_included}}
- Assistência técnica: {{rental_technical_assistance}}

3.3. Impostos aplicáveis: {{rental_tax_percent}}%.
3.4. Cronograma de pagamento:

{{condicoes_pagamento_tabela}}

3.5. Multa de 2% sobre o valor em atraso, acrescida de juros de 1% ao mês.
$$, true),
  (t_id, 4, 'Condições do Local e do Terreno',
$$
4.1. Tipo de obra: {{rental_work_type}}.
4.2. Altura necessária: {{rental_height_needed}} m; alcance da lança: {{rental_jib_needed}} m; peso máximo previsto: {{rental_max_weight}} kg.
4.3. Condição do terreno: {{rental_terrain_condition}}.
4.4. Necessidade de fundação especial: {{rental_special_foundation}}.
$$, false),
  (t_id, 5, 'Garantias e Manutenção',
$$
5.1. A LOCADORA garante o pleno funcionamento do equipamento durante toda a locação, realizando manutenções necessárias conforme cronograma técnico.
5.2. Não são cobertos danos por: uso inadequado, suprimento elétrico impróprio, descumprimento de manutenção recomendada, intervenções não autorizadas, desgaste natural, sinistros por operação incorreta.
$$, true),
  (t_id, 6, 'Das Obrigações da Locadora',
$$
6.1. Entregar o equipamento em perfeitas condições de uso e conforme NR 18.
6.2. Fornecer ART de montagem, quando aplicável.
6.3. Realizar assistência técnica e manutenção nos termos deste contrato.
6.4. Substituir peças danificadas por defeito de fabricação, excluídas as por mau uso.
$$, true),
  (t_id, 7, 'Das Obrigações da Locatária',
$$
7.1. Executar a base de concreto conforme especificações do calculista da obra.
7.2. Instalar rede elétrica até a base do equipamento.
7.3. Executar aterramento, fornecer laudo técnico e realizar medições semestrais.
7.4. Manter o local isolado, limpo e com acesso restrito.
7.5. Utilizar o equipamento dentro dos limites de capacidade, operado apenas por profissionais qualificados.
7.6. Não modificar o equipamento sem autorização prévia da LOCADORA.
7.7. Responder por danos causados por si ou terceiros ao equipamento.
7.8. Providenciar alvarás, licenças e autorizações necessárias.
$$, true),
  (t_id, 8, 'Devolução do Equipamento',
$$
8.1. Ao término da locação, a LOCATÁRIA devolverá o equipamento nas mesmas condições recebidas, ressalvado o desgaste natural de uso.
8.2. Despesas de desmontagem, transporte e remoção observarão o disposto na Cláusula 3, salvo repactuação por escrito.
$$, true),
  (t_id, 9, 'Rescisão',
$$
9.1. Rescisão por culpa da LOCADORA: reembolso dos valores pagos referentes a serviços não prestados, corrigidos pelo IGPM/FGV.
9.2. Rescisão por culpa da LOCATÁRIA: retenção dos valores devidos e cobrança dos serviços já executados e custos incorridos.
9.3. É vedada a cessão ou transferência deste contrato sem anuência expressa da outra parte, exceto imposição legal.
$$, true),
  (t_id, 10, 'Direito de Imagem',
$$
10.1. A LOCADORA poderá utilizar imagens do equipamento instalado nas dependências da LOCATÁRIA em materiais de divulgação, mediante solicitação prévia por escrito e aprovação da LOCATÁRIA.
$$, false),
  (t_id, 11, 'Da Assinatura',
$$
11.1. As partes reconhecem a validade da assinatura em formato eletrônico, nos termos do art. 10, §2º da MP 2.200-2/2001.
11.2. Gestores de contrato:
Gestor LOCADORA: {{gestor_vendedora_nome}}, CPF {{gestor_vendedora_cpf}}, telefone {{gestor_vendedora_telefone}}, e-mail {{gestor_vendedora_email}}.
Gestor LOCATÁRIA: {{gestor_compradora_nome}}, CPF {{gestor_compradora_cpf}}, telefone {{gestor_compradora_telefone}}, e-mail {{gestor_compradora_email}}.
$$, true),
  (t_id, 12, 'Da Integridade e Anticorrupção',
$$
12.1. A LOCADORA declara conduzir suas atividades com integridade e ética, sendo inaceitáveis discriminação, pagamento/recebimento de propinas ou vantagens indevidas.
12.2. A LOCADORA está ciente da Lei nº 12.846/2013 e Decreto nº 8.420/2015.
$$, true),
  (t_id, 13, 'Da Lei Geral de Proteção de Dados',
$$
13.1. As partes obrigam-se a atuar em conformidade com a Lei nº 13.709/2018 (LGPD).
13.2. As partes comprometem-se a manter sigilo e confidencialidade de todas as informações e dados pessoais repassados na execução contratual.
$$, true),
  (t_id, 14, 'Foro',
$$
14.1. Fica eleito o foro de {{foro_cidade}}, com renúncia expressa a qualquer outro. As partes assinam eletronicamente, junto a duas testemunhas.

{{data_contrato}}

Locadora: {{vendedora_razao_social}} — Representante: {{vendedora_representante_nome}} — Cargo: {{vendedora_representante_cargo}} — CPF: {{vendedora_representante_cpf}}
Locatária: {{compradora_razao_social}} — Representante: {{compradora_representante_nome}} — Cargo: {{compradora_representante_cargo}} — CPF: {{compradora_representante_cpf}}

Testemunhas:
1) Nome: _______________________ CPF: ______________ E-mail: _______________________
2) Nome: _______________________ CPF: ______________ E-mail: _______________________
$$, true);
END $seed2$;
