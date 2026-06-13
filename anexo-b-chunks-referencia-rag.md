# Anexo B — Chunks de Referência do Pipeline de RAG

> **Nota para o participante:** Os chunks abaixo simulam o resultado do pipeline de RAG após processar a documentação da NovaTech (Anexo A). Eles representam os trechos que o Azure AI Search retornaria ao buscar por similaridade com a pergunta do atendente. Use estes chunks quando os exercícios pedirem simulação de respostas ou teste de prompts.

---

## Como usar este anexo

Quando um exercício pedir que você teste o assistente, simule o comportamento do pipeline:
1. Leia a pergunta do atendente.
2. Identifique quais chunks seriam recuperados por similaridade semântica (tipicamente os 3-5 mais relevantes).
3. Esses chunks são o contexto que o LLM recebe para gerar a resposta.

O assistente **só deveria usar informação presente nos chunks recuperados**. Se uma informação não está em nenhum chunk, o assistente não deveria mencioná-la (sob risco de alucinação).

---

## Chunks extraídos

### Chunks da POL-001 (Política de Devolução)

**Chunk POL-001-A** — Seção 3.1: Prazo geral
> O cliente pode solicitar a devolução de mercadorias em até 7 (sete) dias úteis após a data de recebimento confirmada no sistema de tracking. A contagem de dias úteis exclui sábados, domingos e feriados nacionais.

**Chunk POL-001-B** — Seção 3.2: Exceções
> As seguintes categorias de carga NÃO são elegíveis para devolução pelo processo padrão: Cargas perigosas classificadas nas classes 1 a 6 da ANTT (Agência Nacional de Transportes Terrestres), conforme Resolução ANTT nº 5.947/2021. Inclui: explosivos (classe 1), gases (classe 2), líquidos inflamáveis (classe 3), sólidos inflamáveis (classe 4), oxidantes e peróxidos (classe 5), substâncias tóxicas e infectantes (classe 6). Para essas categorias, o cliente deve entrar em contato com o setor de Gestão de Riscos (ramal 4500) para tratamento individual.

**Chunk POL-001-C** — Seção 3.3: Procedimento
> O cliente abre chamado no Portal do Cliente (portal.novatech.com.br), selecionando a categoria "Devolução de Mercadoria". O chamado deve incluir: número do CT-e, fotos da mercadoria (mínimo 3: embalagem externa, etiqueta, conteúdo), e motivo da devolução. O time de atendimento tem 4 horas úteis para triagem. Se elegível, a coleta reversa é agendada em até 2 dias úteis após aprovação.

**Chunk POL-001-D** — Seção 3.5: Custos
> Defeito ou erro da NovaTech (carga errada, avaria em trânsito): devolução sem custo para o cliente. Desistência do cliente (carga correta, sem defeito): o custo do frete reverso é do cliente, calculado com os mesmos multiplicadores do frete original. Prazo expirado (solicitação após 7 dias úteis): não elegível para devolução padrão — encaminhar ao Comercial.

---

### Chunks da PROC-042 (Frete Especial — versão original)

**Chunk PROC-042-A** — Seção 2: Fórmula
> Frete especial para cargas acima de 500kg. Valor do frete = Valor base × Multiplicador regional × Fator de peso. Fator de peso: 1.0 (500-1.000kg), 1.2 (1.001-3.000kg), 1.5 (acima de 3.000kg).

**Chunk PROC-042-B** — Seção 2.1: Multiplicadores regionais
> Multiplicadores regionais (PROC-042 v1): Sul 1.2, Sudeste 1.0, Centro-Oeste 1.3, Nordeste 1.4, Norte 1.6.

**Chunk PROC-042-C** — Seção 3: Prazo
> O prazo de entrega para frete especial é calculado como o prazo padrão da rota + 2 dias úteis adicionais para manuseio de carga pesada.

---

### Chunks da PROC-042-v2 (Frete Especial — versão revisada)

**Chunk PROC-042v2-A** — Seção 2: Fórmula atualizada
> Frete especial para cargas acima de 500kg (versão revisada, novembro/2023). Valor do frete = Valor base × Multiplicador regional × Fator de peso. Fator de peso: 1.0 (500-1.000kg), 1.15 (1.001-3.000kg), 1.4 (acima de 3.000kg).

**Chunk PROC-042v2-B** — Seção 2.1: Multiplicadores regionais atualizados
> Multiplicadores regionais atualizados (novembro/2023): Sul 1.3, Sudeste 1.1, Centro-Oeste 1.4, Nordeste 1.5, Norte 1.8.

**Chunk PROC-042v2-C** — Seção 3: Prazo atualizado
> O prazo de entrega para frete especial é calculado como o prazo padrão da rota + 3 dias úteis adicionais para manuseio e roteirização de carga pesada.

**Chunk PROC-042v2-D** — Seção 4: Descontos de volume
> A partir de 8 fretes especiais/mês para o mesmo cliente, aplicar desconto de 5% sobre o multiplicador regional. Acima de 15 fretes/mês, desconto de 10%. Descontos maiores requerem aprovação da Diretoria Comercial.

**Chunk PROC-042v2-E** — Seção 5: Disposições transitórias
> Chamados abertos antes de 01/12/2023 que ainda estejam em processamento devem usar os multiplicadores da versão anterior (PROC-042 v1). Chamados novos a partir de 01/12/2023 devem usar os multiplicadores desta versão.

---

### Chunks da SLA-2024 (Tabela de SLA)

**Chunk SLA-2024-A** — Seção 1: Classificação de clientes
> A NovaTech classifica seus clientes em 3 (três) tiers: Gold (contrato anual acima de R$ 500.000 ou mais de 200 operações/mês), Silver (contrato anual entre R$ 100.000 e R$ 500.000 ou entre 50 e 200 operações/mês), e Standard (todos os demais clientes). Não existem outros tiers além dos três listados.

**Chunk SLA-2024-B** — Seção 2: Tabela de SLAs (chamados gerais)
> SLAs para chamados gerais — Gold: resposta em até 2h úteis, resolução em até 24h úteis. Silver: resposta em até 4h úteis, resolução em até 48h úteis. Standard: resposta em até 8h úteis, resolução em até 72h úteis.

**Chunk SLA-2024-C** — Seção 2: Tabela de SLAs (incidentes críticos)
> SLAs para incidentes críticos — Gold: resposta em até 30min, resolução em até 4h. Silver: resposta em até 1h, resolução em até 8h. Standard: resposta em até 2h, resolução em até 24h.

**Chunk SLA-2024-D** — Seção 3: Definição de incidente crítico
> Um incidente é crítico quando: carga com valor acima de R$ 100.000 com status desconhecido há mais de 6h; carga perigosa com irregularidade; mais de 5 chamados do mesmo cliente em 24h sobre o mesmo problema; qualquer risco à segurança de pessoas.

**Chunk SLA-2024-E** — Seção 4: Penalidades
> Primeira violação de SLA no mês: registro interno. Segunda violação: crédito de 5% sobre o frete do chamado. Terceira ou mais: crédito de 10% + reunião obrigatória com gerente de conta (Gold) ou gerente de operações (Silver/Standard).

---

### Chunks do FAQ-Atendimento (Perguntas Frequentes)

**Chunk FAQ-03** — Item 3: Devolução de carga perigosa
> "Na prática, a gente orienta o cliente a ligar no ramal 4500 (Gestão de Riscos). Oficialmente não pode pelo processo padrão, mas já tiveram casos em que o pessoal de Riscos autorizou exceção. Então não diga que é impossível — diga que precisa de tratamento especial."

**Chunk FAQ-08** — Item 8: Frete especial
> "Acima de 500kg, aplica a tabela de multiplicadores por região. Cuidado: existem duas versões da PROC-042. A mais recente tem multiplicadores mais altos. Na dúvida, use a mais recente (v2), mas se o cliente reclamar do valor, pode ser que o contrato dele ainda esteja na tabela antiga."

**Chunk FAQ-15** — Item 15: Tier Platinum
> "Não existe tier Platinum na NovaTech. Às vezes o cliente confunde com outra transportadora ou com o programa de fidelidade antigo que foi descontinuado em 2022. Oriente que nossos tiers são Gold, Silver e Standard e peça o número do contrato para verificar."

**Chunk FAQ-32** — Item 32: Carga perigosa com frete expresso
> "Sim, mas precisa de autorização do Compliance e a documentação ANTT tem que estar atualizada. Na prática, demora uns 2 dias para conseguir a autorização, então o 'expresso' acaba não sendo tão expresso. Avise o cliente sobre isso."

**Chunk FAQ-38** — Item 38: Carga danificada em trânsito
> "Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico — encaminhe para sinistros@novatech.com.br."

---

## Mapa de cobertura: pergunta → chunks recuperados

A tabela abaixo mostra quais chunks o pipeline de RAG deveria recuperar para perguntas típicas. Use como gabarito para exercícios de avaliação de retrieval.

| Pergunta | Chunks que DEVEM ser recuperados | Chunks que podem aparecer (relevância menor) |
|----------|----------------------------------|----------------------------------------------|
| "Qual o prazo de devolução?" | POL-001-A, POL-001-B | POL-001-C |
| "Posso devolver carga perigosa?" | POL-001-B | FAQ-03, POL-001-A |
| "Qual o SLA do cliente Gold?" | SLA-2024-B | SLA-2024-A, SLA-2024-C |
| "Qual o SLA do cliente Platinum?" | SLA-2024-A (contém "não existem outros tiers") | FAQ-15 |
| "Frete para 600kg para Manaus?" | PROC-042v2-B, PROC-042v2-A | PROC-042-B (versão antiga — risco de contradição) |
| "Frete para 300kg para Salvador?" | Nenhum chunk relevante (frete padrão < 500kg não está documentado) | PROC-042v2-B (parcialmente relevante, mas não cobre < 500kg) |
| "O que acontece com carga danificada?" | FAQ-38 | Nenhum documento formal cobre isso |
| "Carga perigosa com frete expresso?" | FAQ-32 | Nenhum documento formal cobre isso |
| "Qual o multiplicador para o Sudeste?" | PROC-042v2-B | PROC-042-B (versão antiga — contradição: 1.0 vs 1.1) |
| "Prazo de devolução + carga perigosa + frete especial" (multi-domínio) | POL-001-A, POL-001-B, PROC-042v2-A, PROC-042v2-B | FAQ-03 |

---

## Armadilhas para exercícios de avaliação

As seguintes situações são propositais e testam a capacidade do participante de identificar problemas:

1. **Contradição PROC-042 vs v2:** Se o pipeline retornar chunks de ambas as versões, o assistente pode misturar multiplicadores antigos e novos na mesma resposta.
2. **FAQ como fonte para informação crítica:** O FAQ-32 (carga perigosa com frete expresso) e FAQ-38 (carga danificada) não têm respaldo em documentos formais. Se o assistente responder com base no FAQ para perguntas críticas, está usando fonte não confiável com confiança alta.
3. **Tier inexistente:** Se o assistente gerar uma resposta sobre "cliente Platinum" com SLAs inventados, é alucinação pura — o chunk SLA-2024-A diz explicitamente que só existem 3 tiers.
4. **Inversão de regra:** O POL-001-B diz que cargas perigosas NÃO podem ser devolvidas. Se o assistente responder que podem (confundindo a exceção com a regra), é uma falha de interpretação.
5. **Pergunta sem cobertura:** Perguntas sobre frete padrão (< 500kg) não têm documento na base. O assistente correto deve dizer que não encontrou a informação, não inventar uma resposta.
