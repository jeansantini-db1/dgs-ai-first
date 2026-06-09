# Revisão Técnica — Pipeline RAG NovaTech

## Contexto do Projeto

A NovaTech é uma empresa de logística com ~1.250 documentos distribuídos em SharePoint (~800 PDFs/DOCX), Confluence (~400 páginas) e ~50 planilhas XLSX. O objetivo é um assistente de IA para o time de atendimento (45 pessoas, ~320 chamados/dia), integrado ao Microsoft Teams, que responda perguntas em linguagem natural com base na documentação oficial e cite a fonte. A documentação tem documentos contraditórios entre versões e é atualizada mensalmente por três áreas sem processo unificado.

---

## Proposta Técnica Original

> "Vamos usar Azure AI Search com embeddings do ada-002. Todos os documentos serão indexados num único índice. Chunking fixo de 512 tokens sem overlap. O LLM recebe os 3 chunks mais similares. Usaremos GPT-4o para geração. O pipeline de ingestão roda manualmente quando alguém lembra de atualizar."

---

## Tarefa 0 — Minha Revisão

**1. Problema: Chunking fixo de 512 tokens sem overlap**
- **Impacto:** Se o corte cair entre duas seções que se complementam entre si, como por exemplo, uma segunda seção que complementa ou adiciona uma exceção do que se tem como contexto da seção 1, a LLM poderia considerar como provável somente o chunk 1 em momentos onde a info do chunk 2 é importante.
- **Solução:** Criar um overlap de aproximadamente 50 tokens, pegando o final do chunk 1 e inserindo no chunk 2, preservando o contexto.

**2. Problema: Pipeline sem previsibilidade**
- **Impacto:** Corre o risco de ficar desatualizado e resultar em respostas incorretas.
- **Solução:** Pipeline automatizada (triggers) para criação/modificação. Ao rodar o pipeline, fazer um delete (soft) dos chunks antigos.

**3. Problema: Ausência de Monitoramento**
- **Impacto:** Não há como medir uma taxa de erro ou identificar falha com relação à documentação.
- **Solução:** Logar interações. Criar filtros e dashboards para revisão.

**4. Problema: Índice único sem distinção**
- **Impacto:** Aumento da similaridade de chunks de versões mais antigas dos documentos.
- **Solução:** Adicionar índices separados por título do documento, versão, data, ou algum filtro específico que ajude a encontrar a versão correta.

**5. Problema: Somente 3 chunks para o LLM**
- **Impacto:** Se o chunk relevante está na posição 4 por similaridade, será descartado. Somente 3 pode ser muito pouco para o cenário de 1.250 documentos.
- **Solução:** Aumentar para top-7 por similaridade.

---

## Tarefa 1 — Revisão Independente

### Problema A — Chunking fixo de 512 tokens sem overlap
**Impacto concreto:** Documentos de logística frequentemente têm seções com dependência linear: uma cláusula de exceção ou condição especial aparece no parágrafo seguinte à regra principal. Com corte fixo, esse vínculo semântico se perde. O LLM recebe um fragmento sem a ressalva crítica e gera uma resposta incorreta — num contexto de atendimento, isso pode resultar em orientação errada a um cliente ou transportadora.
**Contexto agravante:** Os ~50 arquivos XLSX têm estrutura tabular — 512 tokens fixos cortam linhas relacionadas de forma imprevisível.

---

### Problema B — Índice único sem metadados de versão ou fonte
**Impacto concreto:** A NovaTech tem documentos contraditórios entre versões. Sem campo de versão/data indexado, o retriever trata um procedimento desatualizado de 2022 com o mesmo peso semântico que a revisão de 2024. Para perguntas sobre SLA de entrega ou procedimento de devolução — que mudam com frequência — o sistema vai retornar o chunk mais *similar*, não o mais *atual*.
**Contexto agravante:** Três áreas sem processo unificado de versionamento aumentam a probabilidade de coexistência de documentos conflitantes no mesmo índice.

---

### Problema C — Pipeline de ingestão manual e sem garantia de idempotência
**Impacto concreto:** Com atualização mensal e três equipes publicando independentemente, o gap entre o documento real e o índice pode crescer semanas. Em operações logísticas, uma mudança de tabela de frete ou prazo de entrega não refletida no assistente gera respostas erradas sistematicamente — sem que o atendente saiba.
**Contexto agravante:** Sem idempotência no pipeline, uma reindexação parcial pode gerar duplicatas do mesmo documento em versões diferentes, piorando o problema B.

---

### Problema D — Recuperação por top-3 sem reranking
**Impacto concreto:** Com 1.250 documentos e heterogeneidade de fontes (SharePoint, Confluence, XLSX), a similaridade por cosseno do ada-002 não discrimina bem relevância contextual versus relevância semântica superficial. O chunk correto pode estar na posição 4 ou 5 — e jamais chegará ao LLM. Para perguntas compostas ("qual o prazo de entrega para zona 3 em casos de reentrega?"), três chunks raramente cobrem todas as dimensões da resposta.
**Contexto agravante:** 320 chamados/dia significa alta variabilidade de perguntas — não é um domínio restrito.

---

### Problema E — Ausência de filtro de fonte no momento do retrieval
**Impacto concreto:** Uma pergunta sobre política interna de RH pode retornar chunks de manual de operações logísticas por similaridade de termos comuns ("prazo", "aprovação", "solicitação"). Sem filtro por tipo de documento ou área, o contexto enviado ao LLM é ruidoso.
**Contexto agravante:** Três fontes heterogêneas (SharePoint, Confluence, XLSX) com convenções de escrita diferentes aumentam o ruído semântico cruzado.

---

### Problema F — Ausência de citação de fonte confiável na resposta
**Impacto concreto:** O requisito explícito do projeto é que o assistente *cite a fonte*. A proposta não descreve nenhum mecanismo para isso — nem metadados no chunk, nem instrução no prompt para referenciar origem. O LLM com GPT-4o tende a sintetizar sem citar a menos que seja instruído e que os chunks contenham o metadado de origem.
**Contexto agravante:** Em ambiente de atendimento regulado por SLA, a rastreabilidade da resposta é um requisito de negócio, não opcional.

---

### Problema G — Ausência de observabilidade e feedback loop
**Impacto concreto:** Sem logging de queries, chunks recuperados e respostas geradas, não há como identificar: quais perguntas o sistema erra sistematicamente, quais documentos nunca são recuperados (possível problema de embedding), e se a taxa de respostas incorretas é aceitável.
**Contexto agravante:** 320 chamados/dia gera volume suficiente para análise estatística — ignorar isso é desperdiçar o principal sinal de qualidade disponível.

---

### Problema H — Ausência de tratamento para perguntas sem resposta na base
**Impacto concreto:** O GPT-4o, sem instrução explícita, tende a gerar respostas plausíveis mesmo quando nenhum chunk recuperado é relevante ("hallucination by extrapolation"). Num assistente de atendimento, uma resposta inventada sobre prazo de entrega ou política de devolução tem impacto direto no cliente final.
**Contexto agravante:** Documentação incompleta ou contraditória aumenta a probabilidade de queries sem boa cobertura na base.

---

## Tarefa 2 — Comparação

### (a) O que a revisão independente identificou além da revisão original

| Item | Descrição |
|---|---|
| **Problema E** | Ausência de filtro de fonte no retrieval — ruído semântico cruzado entre SharePoint, Confluence e XLSX |
| **Problema F** | Mecanismo de citação de fonte não descrito na proposta, apesar de ser requisito explícito |
| **Problema H** | Sem guardrail contra alucinação quando nenhum chunk é suficientemente relevante |

O Problema B (contradições por versão) foi tocado implicitamente na revisão original (ponto 4), mas enquadrado como problema de índice — a revisão independente o tratou também como problema de metadados e de política de retrieval.

---

### (b) O que a revisão original identificou que a revisão independente não mencionou explicitamente

| Item da revisão original | Avaliação |
|---|---|
| **Ponto 3 — Monitoramento com dashboards** | A revisão independente cobriu observabilidade (Problema G), mas a revisão original foi mais específica ao mencionar filtros e dashboards como artefato concreto de revisão. Ponto válido deixado em nível mais abstrato na revisão independente. |
| **Soft delete dos chunks antigos no pipeline** | Mecanismo de idempotência mencionado conceitualmente na revisão independente (Problema C), mas a revisão original nomeou a operação específica — diferencial relevante em Azure AI Search, onde o merge-or-upload sem controle gera duplicatas silenciosas. |

---

## Tarefa 3 — Alternativas Consolidadas

### A — Chunking
**Proposta:** Substituir chunking fixo por chunking semântico por seção/parágrafo, com overlap de ~10% (~50 tokens), usando separadores hierárquicos (cabeçalhos Markdown/DOCX → parágrafos → sentenças como fallback). Para XLSX, indexar por linha ou grupo de linhas com contexto do cabeçalho da coluna embutido no chunk.

**Justificativa:** Preserva unidades semânticas naturais; o overlap garante que exceções/ressalvas no parágrafo seguinte não sejam perdidas na fronteira; o tratamento específico de XLSX evita fragmentação de tabelas relacionadas.

---

### B — Metadados e controle de versão
**Proposta:** Adicionar ao schema do índice os campos: `source_system` (SharePoint/Confluence/XLSX), `document_title`, `version`, `last_modified_date`, `area_owner`. Usar `last_modified_date` como fator de boosting no ranker (chunks de documentos mais recentes recebem peso maior quando a similaridade é próxima). Configurar filtros de metadados opcionais na query para permitir escopo por área ou fonte.

**Justificativa:** Resolve diretamente a ambiguidade entre versões contraditórias sem exigir índices separados por documento (que criaria overhead de manutenção desproporcional para 1.250 docs no orçamento de 3 meses).

---

### C — Pipeline de ingestão
**Proposta:** Implementar triggers via Azure Event Grid monitorando eventos de criação/modificação em SharePoint e Confluence (webhooks nativos). O pipeline executa: (1) extração, (2) chunking, (3) upsert com `merge-or-upload` usando `document_id` + `chunk_index` como chave composta, (4) soft delete dos chunks órfãos do mesmo `document_id` com `last_modified_date` anterior. Agendamento de varredura semanal como fallback para fontes sem webhook confiável.

**Justificativa:** Elimina dependência humana; a chave composta garante idempotência; o soft delete evita coexistência de versões antigas e novas do mesmo documento.

---

### D — Retrieval e reranking
**Proposta:** Aumentar retrieval inicial para top-10 por similaridade vetorial, seguido de reranking com Azure AI Search Semantic Ranker (já disponível no ecossistema Azure, sem infraestrutura adicional). Enviar ao LLM os top-5 após reranking, com metadados de origem incluídos em cada chunk.

**Justificativa:** O Semantic Ranker do Azure usa um modelo cross-encoder que reordena por relevância contextual, não apenas similaridade vetorial — resolve o problema do chunk correto fora do top-3 sem aumentar o custo de forma linear.

---

### E — Filtro de fonte no retrieval
**Proposta:** Na interface Teams, permitir que o atendente selecione o escopo da consulta (ex.: "Operações", "Comercial", "RH") mapeado para filtros de `area_owner` ou `source_system` na query ao índice. Para queries sem escopo, aplicar retrieval híbrido (vetorial + BM25 keyword) para reduzir ruído semântico cruzado entre fontes heterogêneas.

**Justificativa:** O retrieval híbrido é nativo no Azure AI Search e melhora precisão em domínios com vocabulário específico (ex.: códigos de produto, siglas logísticas) que embeddings isolados frequentemente subavaliam.

---

### F — Citação de fonte
**Proposta:** Incluir no metadado de cada chunk o campo `citation` formatado como `"[Título do Documento | Versão X | Última atualização: DD/MM/AAAA | Fonte: SharePoint/Confluence]"`. Incluir instrução explícita no system prompt para que o GPT-4o cite a fonte ao final de cada afirmação usando esse campo. Exibir as citações como cards clicáveis na interface Teams com link direto ao documento original.

**Justificativa:** Atende o requisito de negócio de rastreabilidade; o link direto permite ao atendente verificar o documento completo em casos de dúvida — reduz a responsabilidade do assistente como única fonte de verdade.

---

### G — Observabilidade
**Proposta:** Logar em Azure Application Insights: query do usuário, chunks recuperados (com scores), resposta gerada e, opcionalmente, feedback binário do atendente (👍/👎 na interface Teams). Criar dashboard no Azure Monitor com: taxa de feedback negativo por área de documento, queries sem chunks acima do threshold de similaridade, e documentos nunca recuperados em 30 dias (candidatos a problema de embedding ou indexação).

**Justificativa:** O feedback binário dos 45 atendentes é o sinal de qualidade mais barato e confiável disponível — não requer anotação especializada e gera volume estatisticamente significativo com 320 chamados/dia.

---

### H — Guardrail contra alucinação
**Proposta:** Definir threshold mínimo de similaridade (ex.: score < 0.75 no Semantic Ranker) como condição de fallback: se nenhum chunk superar o threshold, o sistema responde com mensagem padrão: *"Não encontrei informação suficiente na documentação oficial para responder com segurança. Consulte [link para base de documentos] ou acione o responsável pela área [campo `area_owner`]."* — sem tentar gerar resposta especulativa.

**Justificativa:** Em atendimento logístico, uma resposta errada tem custo operacional real (reentrega, devolução, conflito com cliente). O silêncio informado é mais seguro do que a resposta plausível incorreta.

---

## Tarefa 4 — Proposta Técnica Reescrita

**Stack:** Azure AI Search · text-embedding-ada-002 · GPT-4o · Azure Event Grid · Application Insights · Microsoft Teams

---

### Indexação e Chunking

Os documentos de SharePoint (~800 PDFs/DOCX), Confluence (~400 páginas) e XLSX (~50 planilhas) serão processados com chunking semântico por seção, usando cabeçalhos como separadores hierárquicos primários e parágrafos como fallback, com overlap de ~50 tokens (~10%) entre chunks consecutivos para preservar contexto em fronteiras de seção. Planilhas XLSX serão indexadas por grupo de linhas temáticas com o cabeçalho de coluna embutido no início de cada chunk.

Cada chunk armazenará os metadados: `document_id`, `chunk_index`, `document_title`, `version`, `last_modified_date`, `area_owner`, `source_system` e `citation` (string formatada para exibição direta na resposta).

---

### Índice e Schema

Um único índice Azure AI Search com schema enriquecido pelos metadados acima. A separação lógica entre versões e fontes é feita por filtros e boosting — não por índices separados, evitando overhead operacional. Documentos mais recentes recebem boosting de relevância quando o delta de similaridade entre versões é inferior a 5%.

---

### Pipeline de Ingestão

Triggers via Azure Event Grid monitoram eventos de criação e modificação em SharePoint e Confluence. O pipeline executa extração → chunking → upsert idempotente com chave composta `document_id + chunk_index` (operação `merge-or-upload`) → soft delete dos chunks do mesmo `document_id` com `last_modified_date` anterior ao documento recém-indexado. Uma varredura agendada semanal cobre fontes sem webhook confiável e valida integridade do índice.

---

### Retrieval e Geração

O retrieval usa busca híbrida (vetorial via ada-002 + BM25 keyword) com recuperação inicial de top-10 chunks. Os resultados são rerankeados pelo Azure AI Search Semantic Ranker (cross-encoder nativo, sem infraestrutura adicional), e os top-5 após reranking são enviados ao GPT-4o. Queries da interface Teams permitirão escopo opcional por área (`area_owner`) para reduzir ruído semântico cruzado entre fontes.

Se nenhum chunk superar o score mínimo de 0.75 no Semantic Ranker, o sistema retorna mensagem de fallback com link para a base documental e indicação da área responsável — sem geração especulativa.

---

### Citação de Fonte

O system prompt instrui o GPT-4o a citar a fonte de cada afirmação usando o campo `citation` dos chunks. Na interface Teams, as citações são exibidas como cards clicáveis com link direto ao documento original em SharePoint ou Confluence.

---

### Observabilidade

Todas as interações são logadas no Azure Application Insights: query, chunks recuperados com scores, resposta gerada e feedback binário do atendente (👍/👎). Um dashboard no Azure Monitor exibe: taxa de feedback negativo por área, queries sem chunks acima do threshold, e documentos não recuperados em 30 dias. Revisão quinzenal pelos responsáveis de área nas primeiras 6 semanas para calibração do threshold e identificação de gaps de documentação.

---

### Considerações de Custo e Prazo (3 meses)

Todos os componentes propostos (Semantic Ranker, Event Grid, Application Insights, retrieval híbrido) são nativos do ecossistema Azure e não exigem serviços externos adicionais. O índice único com metadados reduz custo operacional de manutenção versus múltiplos índices. A automação do pipeline elimina o principal risco de degradação silenciosa do sistema em produção.
