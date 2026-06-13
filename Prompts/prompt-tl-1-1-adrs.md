# Prompt — Tech Lead | Exercício 1.1: Decisões Arquiteturais como ADRs

> **Como usar:** Cole este prompt integralmente no Claude (chat) como primeira mensagem da conversa. O prompt é autossuficiente — inclui todo o contexto necessário para gerar as 4 ADRs.

---

## CONTEXTO DO PROJETO

Você é um especialista em arquitetura de software e vai me ajudar como **Tech Lead** em um projeto de IA generativa.

**Empresa:** NovaTech — logística, médio porte, 1.200 funcionários.

**Problema:** A equipe de atendimento ao cliente (45 pessoas) gasta em média 12 minutos por chamado buscando informações em ~1.250 documentos internos espalhados em 3 fontes:

| Fonte | Qtde | Formato | Atualização |
|-------|------|---------|-------------|
| SharePoint corporativo | ~800 docs | PDF, DOCX | Mensal |
| Wiki no Confluence | ~400 páginas | HTML/Wiki | Semanal |
| Pasta de rede | ~50 planilhas | XLSX | Mensal |

**Solução:** Assistente de IA que permite ao atendente perguntar em linguagem natural e receber resposta fundamentada na documentação oficial, com indicação de fonte.

**Restrições do projeto:**
- Integração: Microsoft Teams + SharePoint
- Infraestrutura: Azure (a NovaTech já possui licenças Microsoft 365 E3)
- Azure AI Services disponíveis para provisionar
- Prazo: 3 meses (discovery + desenvolvimento + go-live)
- Meta: reduzir tempo de busca de 12 minutos para menos de 2 minutos por chamado

---

## INPUTS TÉCNICOS

### Análise do Desenvolvedor (simulada)

- Base estimada em **~12 milhões de tokens**
- PDFs com tabelas complexas (15+ colunas) são o maior desafio para extração de texto
- Aproximadamente **15% da base são documentos escaneados** (OCR necessário)
- **Documentos contraditórios identificados em pelo menos 3 procedimentos:** o caso mais crítico é o PROC-042 v1 (data: mar/2023, multiplicadores regionais Sul=1.2, Sudeste=1.0, Norte=1.6) e PROC-042-v2 (data: nov/2023, multiplicadores Sul=1.3, Sudeste=1.1, Norte=1.8) — ambos coexistem no SharePoint **sem indicação formal de qual é o vigente**
- Recomendação de chunking: por seção semântica com overlap de 10%
- Volume operacional: **320 chamados/dia**, dos quais ~60% envolvem consulta a documentação (~192 queries/dia com IA)

### Requisitos do Product Specialist (simulados)

1. Toda resposta DEVE citar a fonte (nome do documento + seção)
2. Quando houver documentos contraditórios, DEVE mostrar ambas as versões com indicação de data
3. Atualização máxima de 24h após publicação de novo documento na base
4. O assistente NUNCA deve inventar informações — quando não encontrar resposta nos documentos, deve dizer explicitamente "não encontrei na documentação disponível"
5. Integração com Teams deve ser transparente (o atendente não precisa sair do Teams para usar o assistente)

---

## FORMATO OBRIGATÓRIO DE ADR

Você DEVE usar exatamente este template para cada ADR. Não omita nenhuma seção.

```
# ADR-NNNN: [Título da Decisão]

## Status
[Proposto | Aceito | Depreciado]

## Contexto
[Qual problema esta decisão resolve? Quais forças atuam — restrições técnicas, requisitos de negócio, limitações de orçamento, prazo? Seja específico ao projeto NovaTech.]

## Decisão
[O que decidimos fazer? Por quê esta opção e não as alternativas? Inclua o raciocínio técnico.]

## Consequências

**Positivas:**
- [benefício 1]
- [benefício 2]

**Negativas / Trade-offs:**
- [custo, risco ou limitação 1]
- [custo, risco ou limitação 2]

## Alternativas Consideradas

| Alternativa | Motivo de descarte |
|-------------|-------------------|
| [opção A]   | [razão específica] |
| [opção B]   | [razão específica] |
```

---

## TAREFA

Produza **4 ADRs independentes**, na ordem abaixo. Cada ADR deve ser autossuficiente — deve poder ser lida e compreendida isoladamente, sem depender das outras.

Após gerar as ADRs 0001 e 0002, execute o processo de **devil's advocate** descrito no final deste prompt.

---

### ADR-0001 — Escolha do Modelo de LLM

Avalie e decida entre as seguintes opções:

- **Azure OpenAI (GPT-4o):** janela de contexto de 128K tokens, custo aproximado de $0.005/1K tokens de entrada e $0.015/1K tokens de saída, nativo no ecossistema Azure/Microsoft
- **Claude via API (Anthropic):** janela de contexto de 200K tokens, pricing similar, requer integração via API fora do ecossistema Azure nativo
- **Modelos open-source via Ollama (ex: Llama 3, Mistral):** custo zero de API, mas exige infraestrutura dedicada, maior latência, sem SLA de disponibilidade

**Você DEVE analisar obrigatoriamente os seguintes fatores:**

1. **Custo estimado:** com 192 queries/dia, cada query consumindo em média ~3.000 tokens de entrada (system prompt + chunks + pergunta) e ~500 tokens de saída, calcule o custo mensal de cada opção paga
2. **Janela de contexto:** dado que cada query compõe: system prompt estático (~2K tokens) + até 5 chunks de ~500 tokens cada (~2.5K tokens) + pergunta do atendente (~100 tokens) + metadados do cliente (~200 tokens) + histórico de conversa (variável), qual modelo garante espaço suficiente com folga?
3. **Comportamento quando não há resposta nos chunks:** como cada modelo se comporta quando os documentos recuperados não contêm a informação solicitada? Qual tende a alucinar menos nesse cenário?
4. **Integração e compliance:** RBAC do Azure Active Directory, logs de auditoria, data residency, suporte enterprise — qual opção se integra melhor ao que a NovaTech já tem?

---

### ADR-0002 — Estratégia de Gerenciamento de Contexto

Decida como o pipeline gerencia o contexto enviado ao LLM em cada query individual.

**Você DEVE definir obrigatoriamente:**

1. **Orçamento de contexto por query:** distribua o total de tokens disponíveis entre as partes que compõem o contexto (system prompt, chunks, histórico, pergunta, metadados). Justifique cada alocação.
2. **Número de chunks recuperados (N):** defina N e justifique com base no tipo de pergunta esperada. Considere: perguntas simples (1 documento) vs. perguntas multi-domínio que cruzam SLA + frete + devolução simultaneamente.
3. **Estratégia para perguntas multi-domínio:** ex: *"Qual o SLA para um cliente Gold que quer devolver uma carga perigosa com frete especial para o Norte?"* — como o retriever vai buscar chunks de 3 documentos diferentes? Considere: **query expansion** (expandir a pergunta original em sub-queries antes do retrieval, ex: decompor em "SLA cliente Gold" + "devolução carga perigosa" + "frete especial Norte"), **multi-query retrieval** (executar múltiplas buscas vetoriais e fazer merge dos resultados), ou **re-ranking** (buscar N chunks e reordenar por relevância antes de truncar para o orçamento de contexto).
4. **Tratamento de context rot em sessões longas:** o bot no Teams mantém histórico de conversa na sessão. Se o atendente fizer 8 perguntas seguidas, o histórico cresce e degrada a qualidade das respostas mais recentes. Escolha uma estratégia entre:
   - **Janela deslizante:** manter apenas as últimas N mensagens do histórico
   - **Sumarização automática:** quando o histórico exceder X tokens, comprimir com um LLM call antes de montar o contexto
   - **Contexto stateless:** tratar cada pergunta como nova conversa, sem histórico
   - **Híbrido:** sumarizar após N mensagens, mas manter a última pergunta completa

---

### ADR-0003 — Tratamento de Documentos Contraditórios

Decida como o pipeline trata a coexistência de documentos conflitantes (caso real: PROC-042 v1 e PROC-042-v2 com multiplicadores diferentes, ambos sem status de vigência no SharePoint).

**Avalie as seguintes opções:**

- **Opção A — Versionamento com metadado de vigência:** ingerir ambas as versões, enriquecer cada chunk com metadado `{vigencia: "ativa" | "obsoleta", data_emissao: "AAAA-MM-DD"}`, instruir o LLM via system prompt a priorizar o chunk marcado como ativo e, quando ambos forem recuperados, indicar ao atendente qual é o mais recente
- **Opção B — Exclusão preventiva da versão obsoleta:** remover do índice documentos com versão mais antiga do mesmo número de procedimento antes da ingestão (requer processo de curadoria manual ou automatizado por metadado de data)
- **Opção C — Apresentação explícita do conflito:** quando dois chunks conflitantes são recuperados, o assistente apresenta ambos com as datas e sinaliza *"Há duas versões deste procedimento. Versão de mar/2023: [dado A]. Versão de nov/2023: [dado B]. Verifique qual se aplica ao seu contrato."*
- **Opção D — Delegação ao LLM sem instrução explícita:** o LLM recebe os dois chunks e decide qual usar com base no contexto da pergunta, sem instrução específica no system prompt

**Você DEVE considerar:**
- Quem é responsável por marcar documentos como obsoletos — TI, Compliance, ou o processo de ingestão automatizado?
- O que acontece no intervalo entre a publicação de um novo documento e sua ingestão (até 24h de lag)?
- Como o atendente vai agir com a informação que o assistente fornecer? Ele tem autonomia para decidir qual versão usar?

---

### ADR-0004 — Build vs Buy para o Pipeline de RAG

Decida entre construir o pipeline com ferramentas open-source ou usar serviços gerenciados do Azure.

**Opção Build (open-source):**
- **Orquestração:** LangChain ou LlamaIndex
- **Vector store:** ChromaDB ou FAISS (local ou self-hosted)
- **Embeddings:** sentence-transformers (`all-MiniLM-L6-v2` ou `multilingual-e5-large`)
- **Perfil:** maior controle técnico, custo de serviço menor, maior esforço de engenharia e operação

**Opção Buy (Azure managed):**
- **Vector store + retrieval:** Azure AI Search com índice vetorial nativo
- **Embeddings:** Azure OpenAI Embeddings (text-embedding-3-large)
- **Orquestração:** Azure AI Foundry / Prompt Flow
- **Perfil:** menor controle, maior custo de serviço, menor esforço operacional, nativo ao stack da NovaTech

**Você DEVE analisar obrigatoriamente:**

1. **Integração com o ecossistema NovaTech:** a empresa tem M365 E3 + Azure. O que isso significa em termos de RBAC (Azure Active Directory), logs de auditoria, data residency (LGPD), e suporte?
2. **Complexidade operacional pós-go-live:** quem opera e mantém o pipeline? A NovaTech tem equipe técnica interna ou dependerá da DB1? Qual opção tem menor custo de manutenção continuada?
3. **Custo total de propriedade (TCO):** considere tanto o custo de serviço (API calls, vector store) quanto o custo de horas de engenharia para construção, manutenção e evolução
4. **Flexibilidade futura:** se a NovaTech quiser adicionar novos tipos de fonte (ex: sistema ERP, banco de dados de clientes) ou trocar o modelo LLM, qual opção facilita mais essa evolução?
5. **Time-to-market:** considerando o prazo de 3 meses, qual opção permite entregar um MVP funcional mais rapidamente?

---

## PROCESSO DE DEVIL'S ADVOCATE

Após gerar cada uma das ADRs 0001 e 0002, você DEVE executar o seguinte processo:

**Passo 1 — Argumente contra:**
Liste os **3 contra-argumentos mais fortes** contra a decisão que você tomou. Seja implacável — não escolha contra-argumentos fracos ou facilmente refutados. Busque os pontos onde a decisão realmente tem fraquezas.

Use o formato:
```
### Devil's Advocate — ADR-NNNN

**Contra-argumento 1:** [título]
[Argumentação concreta de por que essa decisão pode ser errada ou insuficiente]

**Contra-argumento 2:** [título]
[...]

**Contra-argumento 3:** [título]
[...]
```

**Passo 2 — Avalie o impacto:**
Para cada contra-argumento, classifique:
- **Crítico:** revela uma falha real que invalida ou enfraquece significativamente a decisão
- **Relevante:** aponta um risco real, mas a decisão ainda se sustenta com ajuste
- **Conhecido e aceito:** é um trade-off já reconhecido na ADR, não muda a decisão

**Passo 3 — Revise ou confirme:**
Se algum contra-argumento for classificado como **Crítico**, revise a ADR incorporando a melhoria. Se todos forem **Relevantes** ou **Conhecidos**, adicione à seção "Consequências Negativas" da ADR e mantenha a decisão com justificativa explícita.

---

## INSTRUÇÃO DE EXECUÇÃO

Execute na seguinte sequência — não pule etapas:

1. Gere **ADR-0001** completa (todas as seções do template)
2. Execute o **devil's advocate da ADR-0001** (3 passos acima)
3. Apresente a **ADR-0001 revisada** (ou confirme que permanece sem alteração e por quê)
4. Gere **ADR-0002** completa
5. Execute o **devil's advocate da ADR-0002**
6. Apresente a **ADR-0002 revisada** (ou confirme manutenção). Se a revisão da ADR-0001 (passo 3) alterou a escolha de modelo e isso impacta o orçamento de contexto da ADR-0002, ajuste os números correspondentes antes de prosseguir.
7. Gere **ADR-0003** completa
8. Gere **ADR-0004** completa
9. **Síntese de dependências:** em um parágrafo, mapeie como as 4 decisões se relacionam. Exemplo: a escolha do LLM (ADR-0001) impacta diretamente o orçamento de contexto disponível (ADR-0002); a estratégia de documentos contraditórios (ADR-0003) depende da capacidade do pipeline (ADR-0004). Identifique todas as dependências e inconsistências entre as decisões.

---

> **Observação para o Tech Lead:** após receber os 4 ADRs, você deve revisar criticamente cada um antes de aprovar. O objetivo do devil's advocate é revelar fraquezas que você mesmo pode não ter antecipado — use os contra-argumentos como checklist de revisão, não apenas como exercício formal.
