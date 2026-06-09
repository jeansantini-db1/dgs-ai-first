# Anexo A — Documentação Simulada da NovaTech

> **Nota para o participante:** Os documentos abaixo simulam a documentação real da NovaTech. Eles são a fonte de verdade do projeto. Ao avaliar respostas do assistente ou elaborar análises, use estes documentos como referência.

> **Documentos individuais para ingestão em pipeline de RAG:** Os mesmos 5 documentos estão disponíveis como arquivos separados na pasta `anexo-a-documentos-individuais/`. Use esses arquivos quando o exercício pedir ingestão de documentos num pipeline (ex: Dev 1.3). Cada arquivo contém um único documento em formato markdown limpo, pronto para ser processado por scripts de chunking e embedding.
>
> Arquivos disponíveis:
> - `POL-001-politica-devolucao.md`
> - `PROC-042-frete-especial-v1.md`
> - `PROC-042-v2-frete-especial-revisado.md`
> - `SLA-2024-tabela-sla-clientes.md`
> - `FAQ-atendimento.md`

---

## Documento 1: POL-001 — Política de Devolução de Mercadorias

**Versão:** 3.1  
**Última atualização:** 15/01/2024  
**Responsável:** Diretoria de Operações  
**Classificação:** Documento normativo — uso obrigatório pelo time de atendimento

### 1. Objetivo

Esta política define as regras e procedimentos para devolução de mercadorias transportadas pela NovaTech, aplicável a todos os tipos de cliente e categorias de carga, salvo exceções explicitamente listadas na seção 3.

### 2. Escopo

Aplica-se a todas as devoluções solicitadas por clientes da NovaTech após a entrega da mercadoria. Não se aplica a mercadorias ainda em trânsito (para essas, consultar PROC-088: Procedimento de Interceptação de Carga).

### 3. Regras de Devolução

#### 3.1. Prazo geral

O cliente pode solicitar a devolução de mercadorias em até **7 (sete) dias úteis** após a data de recebimento confirmada no sistema de tracking. A contagem de dias úteis exclui sábados, domingos e feriados nacionais.

#### 3.2. Exceções ao prazo geral

As seguintes categorias de carga **NÃO são elegíveis** para devolução pelo processo padrão:

- **Cargas perigosas** classificadas nas classes 1 a 6 da ANTT (Agência Nacional de Transportes Terrestres), conforme Resolução ANTT nº 5.947/2021. Inclui: explosivos (classe 1), gases (classe 2), líquidos inflamáveis (classe 3), sólidos inflamáveis (classe 4), oxidantes e peróxidos (classe 5), substâncias tóxicas e infectantes (classe 6).
- **Cargas refrigeradas** que tenham rompido a cadeia de frio (temperatura fora da faixa especificada na nota fiscal por mais de 30 minutos contínuos, conforme registro do sensor IoT).
- **Cargas com lacre de segurança violado**, salvo quando a violação for documentada no ato de entrega com assinatura do motorista e do recebedor.

Para essas categorias, o cliente deve entrar em contato com o setor de **Gestão de Riscos** (ramal 4500) para tratamento individual.

#### 3.3. Procedimento de devolução

1. O cliente abre chamado no **Portal do Cliente** (portal.novatech.com.br), selecionando a categoria "Devolução de Mercadoria".
2. O chamado deve incluir: número do CT-e (Conhecimento de Transporte Eletrônico), fotos da mercadoria no estado atual (mínimo 3 fotos: embalagem externa, etiqueta de identificação, e conteúdo), e motivo da devolução.
3. O time de atendimento tem **4 horas úteis** para triagem do chamado (verificar elegibilidade, documentação e prazo).
4. Se elegível, a coleta reversa é agendada em até **2 dias úteis** após aprovação.
5. O reembolso ou crédito é processado em até **5 dias úteis** após o recebimento da mercadoria devolvida no centro de distribuição.

#### 3.4. Devoluções parciais

Quando a entrega envolver múltiplos volumes, o cliente pode devolver volumes individuais. Cada volume devolvido segue o mesmo procedimento da seção 3.3. O cálculo de reembolso é proporcional ao peso/valor do volume devolvido, conforme o CT-e.

#### 3.5. Custos de devolução

- **Defeito ou erro da NovaTech** (carga errada, avaria em trânsito): devolução sem custo para o cliente.
- **Desistência do cliente** (carga correta, sem defeito): o custo do frete reverso é do cliente, calculado com os mesmos multiplicadores do frete original.
- **Prazo expirado** (solicitação após 7 dias úteis): não elegível para devolução padrão. Encaminhar ao Comercial para negociação caso a caso.

---

## Documento 2: PROC-042 — Procedimento de Cálculo de Frete Especial

**Versão:** 1.0  
**Data de emissão:** 03/03/2023  
**Responsável:** Diretoria Comercial  
**Status:** ⚠️ *Este documento não possui indicação formal de vigência ou obsolescência no sistema da NovaTech. Coexiste com a versão PROC-042-v2.*

### 1. Objetivo

Definir a fórmula e os parâmetros para cálculo de frete especial aplicável a cargas com peso acima de 500kg.

### 2. Fórmula de cálculo

O frete especial é calculado como:

**Valor do frete = Valor base × Multiplicador regional × Fator de peso**

Onde:
- **Valor base** = tarifa publicada na tabela mensal de fretes (disponível em `\\novatech-fs\comercial\tabelas\frete-base-AAAAMM.xlsx`).
- **Multiplicador regional** = fator aplicado conforme a região de destino (seção 2.1).
- **Fator de peso** = 1.0 para cargas de 500kg a 1.000kg; 1.2 para cargas de 1.001kg a 3.000kg; 1.5 para cargas acima de 3.000kg.

#### 2.1. Multiplicadores regionais

| Região | Multiplicador |
|--------|--------------|
| Sul | 1.2 |
| Sudeste | 1.0 |
| Centro-Oeste | 1.3 |
| Nordeste | 1.4 |
| Norte | 1.6 |

### 3. Prazo de entrega para frete especial

O prazo de entrega para frete especial é calculado como o prazo padrão da rota **+ 2 dias úteis** adicionais para manuseio de carga pesada.

### 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas).
- Descontos de volume (mais de 10 fretes especiais/mês para o mesmo cliente) devem ser negociados pelo Comercial e registrados em aditivo contratual.

---

## Documento 3: PROC-042-v2 — Procedimento de Cálculo de Frete Especial (Revisado)

**Versão:** 2.0  
**Data de emissão:** 10/11/2023  
**Responsável:** Diretoria Comercial  
**Status:** ⚠️ *Este documento não possui indicação formal de que substitui o PROC-042 v1. Ambos coexistem no SharePoint sem hierarquia clara.*

### 1. Objetivo

Definir a fórmula e os parâmetros atualizados para cálculo de frete especial aplicável a cargas com peso acima de 500kg. Os multiplicadores foram revisados para refletir os custos operacionais atualizados de cada região.

### 2. Fórmula de cálculo

O frete especial é calculado como:

**Valor do frete = Valor base × Multiplicador regional × Fator de peso**

Onde:
- **Valor base** = tarifa publicada na tabela mensal de fretes (disponível em `\\novatech-fs\comercial\tabelas\frete-base-AAAAMM.xlsx`).
- **Multiplicador regional** = fator aplicado conforme a região de destino (seção 2.1).
- **Fator de peso** = 1.0 para cargas de 500kg a 1.000kg; 1.15 para cargas de 1.001kg a 3.000kg; 1.4 para cargas acima de 3.000kg.

#### 2.1. Multiplicadores regionais (atualizados em novembro/2023)

| Região | Multiplicador |
|--------|--------------|
| Sul | 1.3 |
| Sudeste | 1.1 |
| Centro-Oeste | 1.4 |
| Nordeste | 1.5 |
| Norte | 1.8 |

### 3. Prazo de entrega para frete especial

O prazo de entrega para frete especial é calculado como o prazo padrão da rota **+ 3 dias úteis** adicionais para manuseio e roteirização de carga pesada (anteriormente era + 2 dias na versão anterior).

### 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas). **Nota:** a PROC-043 está em processo de revisão pelo Compliance e pode sofrer alterações.
- Descontos de volume: a partir de 8 fretes especiais/mês para o mesmo cliente, aplicar desconto de 5% sobre o multiplicador regional. Acima de 15 fretes/mês, desconto de 10%. Descontos maiores requerem aprovação da Diretoria Comercial.

### 5. Disposições transitórias

Durante o período de transição, chamados abertos antes de 01/12/2023 que ainda estejam em processamento devem usar os multiplicadores da versão anterior (PROC-042 v1). Chamados novos a partir de 01/12/2023 devem usar os multiplicadores desta versão.

---

## Documento 4: SLA-2024 — Tabela de SLA por Tipo de Cliente

**Versão:** 2024.1  
**Última atualização:** 02/01/2024  
**Responsável:** Diretoria Comercial + Diretoria de Operações  
**Classificação:** Documento contratual — os SLAs listados aqui são compromissos formais com o cliente

### 1. Classificação de clientes

A NovaTech classifica seus clientes em **3 (três) tiers** com base no volume mensal de operações e no valor do contrato:

| Tier | Critério de elegibilidade | Revisão |
|------|--------------------------|---------|
| **Gold** | Contrato anual acima de R$ 500.000 OU mais de 200 operações/mês | Semestral |
| **Silver** | Contrato anual entre R$ 100.000 e R$ 500.000 OU entre 50 e 200 operações/mês | Semestral |
| **Standard** | Todos os demais clientes | Anual |

> **Nota:** Não existem outros tiers além dos três listados acima. Solicitações de SLA diferenciado fora desses tiers devem ser encaminhadas ao Comercial para análise de viabilidade.

### 2. Tabela de SLAs

| Métrica | Gold | Silver | Standard |
|---------|------|--------|----------|
| Tempo de primeira resposta (chamados gerais) | Até 2h úteis | Até 4h úteis | Até 8h úteis |
| Tempo de resolução (chamados gerais) | Até 24h úteis | Até 48h úteis | Até 72h úteis |
| Tempo de primeira resposta (incidentes críticos) | Até 30min | Até 1h | Até 2h |
| Tempo de resolução (incidentes críticos) | Até 4h | Até 8h | Até 24h |
| Disponibilidade do portal de tracking | 99,5% | 99,0% | 98,0% |
| Gerente de conta dedicado | Sim | Não | Não |
| Relatório mensal de performance | Sim (detalhado) | Sim (resumido) | Sob demanda |

### 3. Definição de incidente crítico

Um incidente é classificado como **crítico** quando atende a pelo menos um dos seguintes critérios:

- Carga com valor declarado acima de R$ 100.000 está com status desconhecido há mais de 6 horas.
- Carga perigosa com qualquer irregularidade de documentação ou rastreamento.
- Mais de 5 chamados do mesmo cliente nas últimas 24 horas sobre o mesmo problema.
- Qualquer situação que envolva risco à segurança de pessoas.

### 4. Penalidades por descumprimento

- Primeira violação de SLA no mês: registro interno, sem impacto contratual.
- Segunda violação no mesmo mês: crédito de 5% sobre o valor do frete do chamado afetado.
- Terceira violação ou mais no mesmo mês: crédito de 10% + reunião obrigatória com o gerente de conta (Gold) ou gerente de operações (Silver/Standard).

### 5. Medição e reportes

Os SLAs são medidos pelo sistema de chamados (Azure DevOps) a partir do timestamp de abertura do chamado. O relógio de SLA pausa fora do horário comercial (08h-18h, dias úteis) para chamados gerais, mas **não pausa** para incidentes críticos de clientes Gold.

---

## Documento 5: FAQ-Atendimento — Perguntas Frequentes do Time de Suporte

**Versão:** Não controlada  
**Última atualização:** Diversas (documento colaborativo)  
**Responsável:** Nenhum responsável formal — mantido informalmente pelo time de atendimento  
**Classificação:** ⚠️ Documento informal — NÃO validado por Compliance ou Operações. Representa o conhecimento prático do time, mas pode conter informações desatualizadas ou imprecisas.

> **Aviso interno:** Este FAQ foi criado organicamente pelo time de atendimento ao longo de 2 anos. As respostas refletem a experiência prática dos atendentes, mas NÃO foram validadas contra os documentos oficiais (POL, PROC, SLA). Use com cautela e sempre confirme informações críticas na documentação normativa.

### Perguntas selecionadas (das 47 do documento original)

**Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"**
> "Na prática, a gente orienta o cliente a ligar no ramal 4500 (Gestão de Riscos). Oficialmente não pode pelo processo padrão, mas já tiveram casos em que o pessoal de Riscos autorizou exceção. Então não diga que é impossível — diga que precisa de tratamento especial."

**Item 8 — "Como funciona o frete especial?"**
> "Acima de 500kg, aplica a tabela de multiplicadores por região. Cuidado: existem duas versões da PROC-042. A mais recente tem multiplicadores mais altos. Na dúvida, use a mais recente (v2), mas se o cliente reclamar do valor, pode ser que o contrato dele ainda esteja na tabela antiga."

**Item 15 — "Cliente diz que é Platinum. Existe esse tier?"**
> "Não existe tier Platinum na NovaTech. Às vezes o cliente confunde com outra transportadora ou com o programa de fidelidade antigo que foi descontinuado em 2022. Oriente que nossos tiers são Gold, Silver e Standard e peça o número do contrato para verificar."

**Item 22 — "Cliente quer saber sobre seguro de carga. O que falar?"**
> "A NovaTech oferece seguro de carga como adicional. O valor é 0,3% do valor declarado da mercadoria para cargas padrão e 0,8% para cargas perigosas. Detalhe: isso vale para contratos a partir de 2023. Contratos mais antigos podem ter percentuais diferentes — confirme com o Comercial."

**Item 27 — "O tracking mostra 'em trânsito' há 5 dias. O que faço?"**
> "Depende da rota. Rotas para o Norte podem levar até 10 dias úteis. Para Sul/Sudeste, mais de 3 dias parado é estranho. Abra um chamado de rastreamento e classifique como prioridade alta se for Gold ou se o valor da carga for acima de R$ 50.000."

**Item 32 — "Pode enviar carga perigosa com frete expresso?"**
> "Sim, mas precisa de autorização do Compliance e a documentação ANTT tem que estar atualizada. Na prática, demora uns 2 dias para conseguir a autorização, então o 'expresso' acaba não sendo tão expresso. Avise o cliente sobre isso."

**Item 38 — "Cliente quer saber a política para carga que chegou danificada."**
> "Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico, não pelo atendimento normal — encaminhe para o e-mail sinistros@novatech.com.br."

**Item 41 — "Qual a diferença entre SLA de resposta e SLA de resolução?"**
> "Resposta é quando a gente dá o primeiro retorno ao cliente (mesmo que seja 'estamos verificando'). Resolução é quando o problema é efetivamente resolvido. O Gold tem 2h de resposta e 24h de resolução. Silver é 4h e 48h. Standard é 8h e 72h. Para incidentes críticos, os prazos são menores — veja a tabela SLA-2024."

**Item 45 — "O cliente quer desconto no frete. Posso dar?"**
> "Atendente não tem autonomia para dar desconto. Para clientes com mais de 10 fretes especiais por mês, existe desconto automático na tabela (veja PROC-042). Para outros casos, encaminhe ao Comercial com justificativa."

---

## Notas sobre a documentação (meta-informação para contexto dos exercícios)

### Contradições identificadas
1. **PROC-042 vs PROC-042-v2:** Multiplicadores regionais diferentes. Nenhum dos dois documentos está marcado como obsoleto no SharePoint. A seção 5 do PROC-042-v2 menciona uma transição, mas a data já passou (dez/2023) e o PROC-042 original não foi arquivado.
2. **PROC-042 vs PROC-042-v2 — Fator de peso:** A v1 usa fatores 1.0/1.2/1.5 e a v2 usa 1.0/1.15/1.4 para as mesmas faixas.
3. **PROC-042 vs PROC-042-v2 — Prazo adicional:** A v1 diz +2 dias úteis, a v2 diz +3 dias úteis.
4. **FAQ Item 32 vs documentação formal:** O FAQ diz que carga perigosa pode ser enviada com frete expresso "com autorização", mas não existe documento formal (PROC ou POL) que defina esse processo. A informação pode ser prática informal não documentada.

### Gaps identificados
1. **Política de carga danificada:** O FAQ Item 38 descreve um processo, mas não existe documento formal (POL ou PROC) sobre tratamento de carga danificada em trânsito. A informação existe apenas no FAQ informal.
2. **Seguro de carga:** O FAQ Item 22 menciona seguro de carga com percentuais, mas não há documento formal na base sobre isso.
3. **Frete padrão (abaixo de 500kg):** A PROC-042 só cobre frete especial (acima de 500kg). Não há documento na amostra que cubra a tabela de fretes padrão.
4. **Processo de escalação para Gestão de Riscos:** A POL-001 menciona o ramal 4500, mas não há procedimento documentado sobre o que a Gestão de Riscos faz com cargas perigosas devolvidas.
