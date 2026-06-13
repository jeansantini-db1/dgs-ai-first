# ADRs — Assistente IA NovaTech

> Documento gerado para decisões Arquiteturais como ADRs
> Projeto: Assistente de IA para Atendimento ao Cliente | NovaTech Logística

---

## Índice

1. [ADR-0001 — Escolha do Modelo de LLM](#adr-0001)
2. [ADR-0002 — Estratégia de Gerenciamento de Contexto](#adr-0002)
3. [ADR-0003 — Tratamento de Documentos Contraditórios](#adr-0003)
4. [ADR-0004 — Build vs Buy para o Pipeline de RAG](#adr-0004)
5. [Síntese de Dependências](#síntese-de-dependências)

---

## ADR-0001

# ADR-0001: Escolha do Modelo de LLM

## Status

Aceito *(revisado após devil's advocate)*

## Contexto

A NovaTech precisa de um LLM que sirva como núcleo de geração de respostas do assistente de atendimento. O modelo receberá, em cada query, um contexto composto por:

| Componente | Tokens estimados |
|---|---|
| System prompt estático | ~2.000 |
| Chunks recuperados (5 × 500) | ~2.500 |
| Pergunta do atendente | ~100 |
| Metadados do cliente/chamado | ~200 |
| Histórico de conversa (média) | ~800–2.000 |
| **Total estimado por query** | **~5.600–6.800 tokens** |

O volume operacional é de **192 queries IA por dia** (60% dos 320 chamados/dia). As restrições determinantes são:

- **Ecossistema:** NovaTech opera integralmente em Azure com licenças M365 E3. Qualquer componente fora desse ecossistema exige aprovação adicional de compliance, integração de identidade separada e novos contratos de data processing.
- **Compliance e LGPD:** dados de atendimento ao cliente incluem informações sensíveis de clientes. A equipe jurídica exige data residency em região brasileira ou europeia com contrato DPA assinado.
- **Prazo:** 3 meses para go-live. Integrações fora do stack Azure adicionam fricção ao desenvolvimento.
- **Comportamento no silêncio:** o requisito mais crítico é que o modelo NUNCA invente informações. Quando os chunks recuperados não contêm a resposta, o modelo deve verbalizar explicitamente a ausência de informação.

### Cálculo de Custo Mensal por Opção

**Base:** 192 queries/dia × 30 dias = 5.760 queries/mês
**Média por query:** 3.000 tokens de entrada + 500 tokens de saída

**Azure OpenAI GPT-4o:**
- Entrada: 5.760 × 3.000 = 17.280.000 tokens → 17.280 × $0,005 = **$86,40/mês**
- Saída: 5.760 × 500 = 2.880.000 tokens → 2.880 × $0,015 = **$43,20/mês**
- **Total: ~$129,60/mês**

**Claude via API (Anthropic):**
- Pricing estimado similar ao GPT-4o para essa faixa de volume
- **Total: ~$125–135/mês** (varia conforme tier negociado)
- Exige contrato adicional com Anthropic, integração via API fora do Azure nativo, e DPA separado

**Modelos open-source (Llama 3 / Mistral via Ollama):**
- Custo de API: $0
- Custo de infraestrutura dedicada (GPU): ~$400–800/mês em Azure (Standard_NC6s_v3 ou similar)
- Sem SLA de disponibilidade; latência de 3–8x maior que APIs gerenciadas
- Equipe de 3 meses não comporta o esforço de fine-tuning e operação de infraestrutura GPU

## Decisão

**Adotar Azure OpenAI GPT-4o como modelo de LLM.**

### Justificativa técnica

**1. Janela de contexto suficiente com folga:** O GPT-4o oferece 128K tokens. Com o orçamento estimado de 5.600–6.800 tokens por query + margem para histórico de sessão longa (até 8 turnos × ~700 tokens/turno = ~5.600 tokens extras), o teto real de uso fica em ~12.400 tokens — menos de 10% da janela disponível. Mesmo em cenários adversos (documentos verbosos, histórico acumulado), há folga de 10x.

**2. Integração nativa com o ecossistema NovaTech:** A NovaTech possui M365 E3 e Azure. O Azure OpenAI é um serviço Azure-native, o que significa: autenticação via Azure Active Directory (Managed Identity ou Service Principal), RBAC granular (por subscription, resource group e modelo), logs de auditoria no Azure Monitor, data residency configurável em `brazilsouth` ou `eastus`, e conformidade com o Microsoft DPA já assinado. Nenhum contrato adicional é necessário.

**3. Comportamento conservador no silêncio:** O GPT-4o, quando instruído via system prompt explícito com a regra "se a informação não estiver nos documentos fornecidos, responda literalmente: 'Não encontrei essa informação na documentação disponível'", demonstra aderência superior a modelos menores open-source, que tendem a interpolar conhecimento paramétrico mesmo com instruções restritivas.

**4. TCO real:** O custo de ~$130/mês de API é marginal frente ao custo de engenharia de manter infraestrutura GPU dedicada para modelos open-source. Com prazo de 3 meses, qualquer esforço adicional desvia de entregas de produto.

**5. SLA:** Azure OpenAI oferece SLA de 99,9% de disponibilidade — crítico para um assistente de atendimento em produção.

## Consequências

**Positivas:**
- Integração nativa com Azure AD: RBAC e logs de auditoria sem desenvolvimento adicional
- Data residency controlada: região `brazilsouth` disponível, alinhada à LGPD
- Janela de 128K tokens elimina risco de truncamento de contexto nas queries padrão
- SLA enterprise garante disponibilidade para os 45 atendentes
- Time-to-market acelerado: SDK `openai` com suporte oficial da Microsoft, exemplos prontos
- Custo previsível e baixo (~$130/mês) com possibilidade de reserva para desconto

**Negativas / Trade-offs:**
- **Dependência de vendor (Microsoft/OpenAI):** mudanças de preço, deprecação de modelos ou alterações de política impactam diretamente o sistema sem alternativa imediata
- **Controle limitado sobre o modelo:** impossibilidade de fine-tuning nos planos padrão; comportamento do modelo pode mudar entre versões sem aviso prévio (problem of silent model updates)
- **Custo escala com volume:** se o volume de chamados crescer 5x (ex: expansão da NovaTech), o custo de API sobe linearmente — ao contrário de modelos self-hosted, que têm custo fixo de infraestrutura
- **Janela menor que Claude:** 128K vs 200K tokens. Para sessões de atendimento muito longas ou documentos extremamente verbosos, pode haver pressão no orçamento de contexto (mitigado pela estratégia de gerenciamento da ADR-0002)

## Alternativas Consideradas

| Alternativa | Motivo de descarte |
|---|---|
| **Claude via API (Anthropic)** | Exige contrato e DPA separados com a Anthropic, integração de identidade fora do Azure AD, e aprovação jurídica adicional. Janela de 200K é vantagem técnica, mas não justifica a fricção de compliance no prazo de 3 meses. Pode ser reavaliado em ciclo futuro. |
| **Llama 3 / Mistral via Ollama** | Infraestrutura GPU dedicada custa $400–800/mês (superando o custo de API do GPT-4o), sem SLA, com latência 3–8x maior. Exige expertise operacional de MLOps que a NovaTech não possui internamente. Inviável no prazo. |
| **Azure OpenAI GPT-4o mini** | Custo ~70% menor (~$39/mês), mas maior taxa de alucinação documentada em tarefas que exigem "silêncio informado" — risco inaceitável dado o requisito de não inventar informações. |

---

### Devil's Advocate — ADR-0001

**Contra-argumento 1: A janela de 128K pode ser insuficiente em sessões longas com documentos densos**

A estimativa de 5.600–6.800 tokens por query assume um histórico médio de conversa. No entanto, um atendente que lida com um chamado complexo pode ter 12–15 turnos de conversa, cada turno com chunks longos de documentos técnicos (procedimentos de logística com tabelas e regulamentações). Nesse cenário: 15 turnos × 1.200 tokens/turno (pergunta + resposta) = 18.000 tokens só de histórico + 6.800 tokens de contexto ativo = ~24.800 tokens. Ainda dentro dos 128K — mas se os chunks médios forem 800 tokens (documentos técnicos densos) e o histórico crescer mais, o sistema pode atingir 40–50K tokens por query. O GPT-4o degrada em qualidade (attention dilution) em janelas muito longas, mesmo que tecnicamente caiba. O Claude 3.5 Sonnet, com 200K, teria margem 56% maior.

**Impacto:** Relevante. A decisão se sustenta porque o orçamento de contexto da ADR-0002 limitará o histórico via janela deslizante, contendo o crescimento. Adicionado às consequências negativas.

---

**Contra-argumento 2: Lock-in com Microsoft/OpenAI é um risco estratégico subestimado**

A escolha do Azure OpenAI cria uma dependência tripla: Azure (infra), Microsoft (contrato), OpenAI (modelo). Historicamente, o OpenAI alterou preços e modelos com notificação curta (ex.: deprecação do GPT-4 base em 2024 com 30 dias de aviso). Se o GPT-4o for depreciado ou reprecificado, a NovaTech precisará migrar todo o pipeline — system prompts, testes de regressão, avaliação de qualidade — sob pressão de tempo. A arquitetura RAG com Azure AI Search (ADR-0004) acoplada ao Azure OpenAI Embeddings cria dois pontos de lock-in simultâneos: trocar o modelo significa reindexar toda a base com novos embeddings.

**Impacto:** Relevante. Mitigado parcialmente se o pipeline (ADR-0004) abstrair o modelo via interface comum. Adicionado às consequências negativas com recomendação de design para troca de modelo sem reindexação.

---

**Contra-argumento 3: O custo de $130/mês subestima o custo real de operação**

O cálculo considera apenas tokens de input/output da geração. Não inclui: (a) chamadas de embedding para cada query (~192 queries/dia × custo de embedding da pergunta), (b) re-ranking calls se implementado (ADR-0002), (c) chamadas de sumarização de histórico (ADR-0002, estratégia híbrida), (d) reindexação periódica da base (atualização 24h). Com todos esses custos, o TCO real pode ser 2–3x maior — ~$300–390/mês. Ainda barato, mas o delta impacta o caso de negócio apresentado ao cliente.

**Impacto:** Conhecido e aceito. O TCO completo deve ser apresentado ao cliente com todos os componentes, não apenas a geração. A decisão se mantém — mesmo triplicado, o custo é marginal para o retorno esperado (45 atendentes × 10 min economizados/chamado × 320 chamados/dia = 53 horas/dia de produtividade recuperada).

---

### ADR-0001 — Versão Revisada

As revisões incorporadas à versão acima foram:

1. **Contra-argumento 1 (Relevante):** Adicionado na seção "Negativas / Trade-offs" o risco de attention dilution em sessões longas, com referência explícita à mitigação pela ADR-0002 (janela deslizante de histórico).
2. **Contra-argumento 2 (Relevante):** Adicionado na seção "Negativas / Trade-offs" o risco de lock-in duplo (modelo + embeddings), com recomendação de design de abstração na ADR-0004.
3. **Contra-argumento 3 (Conhecido e aceito):** Trade-off já implícito. TCO completo (incluindo embeddings, re-ranking e sumarização) deve ser documentado no caso de negócio separado.

**Decisão mantida:** Azure OpenAI GPT-4o. Os contra-argumentos são riscos gerenciáveis, não falhas estruturais da decisão.

---

## ADR-0002

# ADR-0002: Estratégia de Gerenciamento de Contexto

## Status

Aceito *(revisado após devil's advocate)*

## Contexto

Com a escolha do GPT-4o (128K tokens, ADR-0001), é necessário definir como o pipeline monta o contexto de cada query enviada ao LLM. O contexto é composto por múltiplos componentes com prioridades e tamanhos diferentes.

**Pressões que atuam nesta decisão:**

- **Qualidade vs. custo:** mais chunks = melhor cobertura semântica, mas mais tokens = maior custo e maior risco de attention dilution
- **Perguntas simples vs. multi-domínio:** um atendente pode perguntar "Qual o prazo de entrega padrão?" (1 chunk suficiente) ou "Qual o SLA para um cliente Gold que quer devolver uma carga perigosa com frete especial para o Norte?" (requer chunks de SLA, regulamentação de cargas perigosas e tabela de frete Norte — 3 domínios distintos)
- **Sessions longas no Teams:** o bot mantém histórico no chat. Após 8+ perguntas, o histórico consome orçamento de tokens e degrada a qualidade das respostas
- **Requisito de fonte:** cada resposta deve citar documento e seção, o que significa que metadados dos chunks (nome do doc, seção, data) precisam estar no contexto

## Decisão

### 1. Orçamento de Contexto por Query

**Janela total disponível:** 128.000 tokens (GPT-4o)
**Orçamento operacional adotado:** 12.000 tokens por query (9,4% da janela total)

Essa limitação autoimposta serve como "teto de segurança" que garante qualidade consistente mesmo no pior caso, evitando attention dilution e mantendo custo controlado.

| Componente | Tokens alocados | Justificativa |
|---|---|---|
| System prompt | 2.000 | Fixo: instruções de comportamento, regras de citação, regra do silêncio, formato de resposta |
| Pergunta do atendente | 200 | Perguntas reais raramente excedem 100 tokens; 200 como margem |
| Metadados do chamado | 300 | ID do cliente, região, tipo de contrato — contexto para personalizar resposta |
| Chunks recuperados | 6.000 | Componente mais valioso: ver definição de N abaixo |
| Histórico de conversa | 2.500 | Controlado pela estratégia anti-context rot (ver item 4) |
| Reserva para resposta | 1.000 | Buffer para tokens de saída que influenciam o custo |
| **Total** | **12.000** | |

### 2. Número de Chunks Recuperados (N = 6)

**Definição:** recuperar **N = 8 chunks** do vetor store, reranquear por relevância, e enviar os **top 6** ao LLM.

**Justificativa:**

- **Tamanho médio por chunk:** ~500 tokens (chunking semântico com overlap de 10%, conforme recomendação do desenvolvedor)
- **6 chunks × 500 tokens = 3.000 tokens** de conteúdo puro
- **Com metadados de citação por chunk** (~150 tokens: nome do doc, seção, data, versão): 6 × 650 = **3.900 tokens** — dentro dos 6.000 alocados, com margem de 2.100 tokens para chunks eventualmente maiores
- **Para perguntas simples:** os top 1–2 chunks já contêm a resposta; os demais chunks servem como contexto de segurança sem prejudicar a qualidade
- **Para perguntas multi-domínio:** 6 chunks permitem cobrir até 3 domínios distintos com 2 chunks cada — suficiente para a maioria dos casos reais identificados

### 3. Estratégia para Perguntas Multi-domínio: Query Expansion + Multi-Query Retrieval

**Estratégia adotada:** **Query Expansion** com **Multi-Query Retrieval** e **Re-ranking** final.

**Fluxo:**

```
Pergunta original
    ↓
[LLM auxiliar GPT-4o mini] — decomposição em sub-queries
    ↓
Sub-query 1: "SLA cliente Gold"
Sub-query 2: "devolução carga perigosa regulamentação"
Sub-query 3: "frete especial região Norte tabela"
    ↓
[Busca vetorial paralela — 3 × top-4 chunks]
    ↓
[Merge + deduplicação por hash de conteúdo]
    ↓
[Re-ranking por relevância semântica (cross-encoder)]
    ↓
[Seleção dos top 6 chunks para o contexto]
    ↓
[LLM principal GPT-4o — geração da resposta]
```

**Por que não apenas re-ranking sem query expansion:** uma busca vetorial única da pergunta composta ("SLA Gold + carga perigosa + frete Norte") tende a otimizar para o centroide semântico da pergunta, não para cada sub-tópico. Isso resulta em chunks que cobrem parcialmente os três domínios ao invés de cobrir completamente cada um. A query expansion resolve essa limitação ao custo de uma chamada adicional ao GPT-4o mini (~200 tokens entrada + ~100 saída ≈ $0,0005 por query multi-domínio).

**Estimativa de queries multi-domínio:** ~20% das 192 queries/dia = ~38 queries/dia com query expansion. Custo adicional: ~$0,60/mês — desprezível.

### 4. Tratamento de Context Rot em Sessões Longas: Estratégia Híbrida

**Estratégia adotada:** **Híbrido (sumarização + janela deslizante)**

**Regra operacional:**

- Manter o histórico completo enquanto ≤ 2.000 tokens
- Ao exceder 2.000 tokens: comprimir as mensagens mais antigas (excluindo as últimas 2 trocas) com uma chamada ao GPT-4o mini, gerando um sumário de ≤ 500 tokens
- Sempre manter as últimas 2 trocas (pergunta + resposta) completas e não sumarizadas
- Teto absoluto do histórico: 2.500 tokens (alocados no orçamento)

**Por que não janela deslizante pura:** descartar mensagens antigas pode perder contexto crítico — ex.: "o cliente mencionou na pergunta 3 que é contrato Gold" é informação que o atendente não repetirá na pergunta 8. A sumarização preserva essa informação em forma compacta.

**Por que não stateless:** o atendente usa o bot como ferramenta de trabalho ao longo do chamado. Perder o contexto a cada pergunta obrigaria repetição de informações e degradaria a experiência — contradizendo o requisito de integração transparente no Teams.

**Por que não sumarização pura:** sumarizar a cada pergunta adiciona latência e custo desnecessários quando o histórico ainda é curto.

## Consequências

**Positivas:**
- Orçamento de 12K tokens garante custo controlado e qualidade consistente nas respostas
- Query expansion resolve o problema de perguntas multi-domínio sem aumentar a complexidade do retriever principal
- Estratégia híbrida preserva contexto crítico de sessões longas sem explodir o orçamento
- Metadados de citação embutidos em cada chunk garantem rastreabilidade de fonte por design
- N = 6 chunks é um ponto de equilíbrio testável e ajustável via configuração sem mudança arquitetural

**Negativas / Trade-offs:**
- **Latência adicional para queries multi-domínio:** a chamada ao GPT-4o mini para query expansion adiciona ~300–500ms por query. Para atendentes que esperam respostas rápidas, isso pode ser perceptível. Mitigação: exibir indicador de "processando" no Teams.
- **Complexidade do pipeline de retrieval:** multi-query retrieval + re-ranking exige mais componentes (cross-encoder model, lógica de merge e deduplicação). Aumenta a superfície de falha e o esforço de teste.
- **Qualidade da sumarização de histórico depende do modelo:** se o GPT-4o mini omitir informações relevantes no sumário, o atendente pode receber respostas inconsistentes com o início da conversa. Necessário testar com sessões reais de atendimento.
- **N = 6 pode ser insuficiente para casos extremos:** perguntas que cruzam 4+ domínios distintos podem requerer mais chunks. Recomenda-se monitorar o % de respostas com "não encontrei na documentação" para detectar casos de cobertura insuficiente.
- **Orçamento de 12K é conservador:** a janela real do GPT-4o é 128K, então o sistema opera com ~90% de ociosidade. Isso é intencional para controle de qualidade, mas em caso de necessidade futura (ex.: RAG com contexto muito longo), o orçamento pode ser expandido sem mudança arquitetural.

## Alternativas Consideradas

| Alternativa | Motivo de descarte |
|---|---|
| **Re-ranking sem query expansion** | Busca vetorial única da pergunta composta não cobre adequadamente perguntas multi-domínio, resultando em chunks que cobrem parcialmente cada sub-tópico. |
| **Janela deslizante pura** | Descarta mensagens antigas que podem conter contexto crítico (ex.: tipo de contrato do cliente mencionado no início da sessão). |
| **Contexto stateless** | Incompatível com o modelo de uso do Teams: o atendente usa o bot ao longo de um chamado, referenciando respostas anteriores. |
| **N = 10 chunks** | 10 × 650 tokens = 6.500 tokens de chunks, mais de 50% do orçamento total. O custo adicional e o risco de attention dilution não compensam a margem extra de cobertura, dado que query expansion já resolve multi-domínio. |

---

### Devil's Advocate — ADR-0002

**Contra-argumento 1: Query expansion com LLM mini adiciona um ponto de falha crítico no caminho quente**

A decomposição em sub-queries via GPT-4o mini é uma chamada síncrona no pipeline principal. Se o serviço do GPT-4o mini estiver degradado (latência alta, timeout), toda a experiência do atendente é impactada — não apenas as queries multi-domínio. Um atendente esperando 4–6 segundos por uma resposta em pico de chamados é um problema real. Além disso, a qualidade da decomposição depende inteiramente do LLM auxiliar: se ele decompor incorretamente a pergunta, o retrieval vai buscar chunks irrelevantes e o GPT-4o principal gerará uma resposta ruim — silenciosamente, sem indicar que a decomposição falhou.

**Impacto:** Relevante. A query expansion deve ser implementada com circuit breaker: se a chamada ao mini falhar ou exceder 800ms, o pipeline faz fallback para busca vetorial direta da pergunta original. A degradação é aceitável (qualidade menor em multi-domínio) comparada à falha total. Adicionado às consequências negativas.

---

**Contra-argumento 2: O orçamento de 12K tokens é arbitrário e não foi validado com dados reais de atendimento**

A alocação de 2.500 tokens para histórico, 6.000 para chunks e 2.000 para system prompt foi definida a priori, sem análise de transcrições reais de atendimento da NovaTech. É possível que: (a) o system prompt real precise de 3.500+ tokens para cobrir todas as regras de comportamento + exemplos few-shot; (b) os chunks médios reais sejam 800 tokens (documentos de procedimento com tabelas) e não 500; (c) o histórico médio real seja 4.000 tokens (atendentes que fazem 10+ perguntas por chamado). Se os três cenários se materializarem simultaneamente, o orçamento de 12K explode para 18K+ — ainda dentro dos 128K do GPT-4o, mas a alocação definida nesta ADR seria inválida.

**Impacto:** Crítico. Esta ADR deve incluir um **período de validação de 2 semanas** com dados reais antes de ser considerada definitiva. O orçamento de 12K é uma hipótese de trabalho para o MVP, não uma decisão final. Uma análise de 100 transcrições de atendimento reais deve ser feita na fase de discovery para calibrar os parâmetros.

---

**Contra-argumento 3: N = 6 chunks de domínios diferentes pode confundir o LLM em vez de ajudá-lo**

Quando 6 chunks de 3 domínios distintos são enviados ao LLM, o modelo precisa: (a) identificar qual chunk responde qual parte da pergunta, (b) sintetizar informações parcialmente conflitantes entre domínios, (c) gerar uma resposta coerente com citações corretas para cada parte. Em prática, LLMs tendem a "grudar" em um dos chunks e ignorar os demais quando os domínios são muito diferentes. O resultado é uma resposta que responde corretamente 1 das 3 sub-perguntas e ignora as outras — sem indicar ao atendente que a informação está incompleta.

**Impacto:** Relevante. O system prompt deve incluir instrução explícita de resposta estruturada para perguntas multi-domínio: *"Se a pergunta tiver múltiplos aspectos, responda cada aspecto separadamente com sua respectiva fonte. Se um aspecto não tiver informação nos documentos fornecidos, indique explicitamente."* Adicionado às consequências negativas.

---

### ADR-0002 — Versão Revisada

Revisões incorporadas:

1. **Contra-argumento 1 (Relevante):** Adicionado circuit breaker no fluxo de query expansion — fallback para busca direta em caso de timeout/falha do LLM mini. Adicionado às consequências negativas.
2. **Contra-argumento 2 (Crítico):** Adicionada nota explícita que o orçamento de 12K tokens é uma hipótese de MVP a ser validada com análise de 100 transcrições reais na fase de discovery. A ADR será revisada após essa análise.
3. **Contra-argumento 3 (Relevante):** Adicionada instrução de resposta estruturada multi-domínio ao system prompt como requisito de implementação.

**Decisão mantida com revisões:** a estratégia híbrida (query expansion + multi-query retrieval + re-ranking + histórico híbrido) permanece correta. As revisões adicionam guardrails operacionais e validação empírica.

---

## ADR-0003

# ADR-0003: Tratamento de Documentos Contraditórios

## Status

Aceito

## Contexto

A base documental da NovaTech contém documentos com versões conflitantes coexistindo sem indicação formal de vigência. O caso identificado mais crítico é o **PROC-042**, que existe em duas versões no SharePoint:

- **PROC-042 v1** (mar/2023): multiplicadores regionais Sul=1.2, Sudeste=1.0, Norte=1.6
- **PROC-042 v2** (nov/2023): multiplicadores regionais Sul=1.3, Sudeste=1.1, Norte=1.8

Ambos os documentos coexistem **sem metadado de status** ("ativo", "obsoleto", "supersedido"). O desenvolvedor estima que há pelo menos 3 procedimentos nessa situação.

**Forças que atuam nesta decisão:**

- **Risco operacional direto:** um atendente que aplica o multiplicador errado (Sul=1.2 ao invés de 1.3) gera erro financeiro e/ou conflito com o cliente — impacto real de negócio
- **Responsabilidade de curadoria:** o time de TI/Dev não tem autoridade para determinar qual versão é vigente — isso é competência de Compliance/Jurídico/Operações
- **Lag de 24h:** há até 24 horas entre a publicação de um novo documento no SharePoint e sua ingestão no índice vetorial
- **Autonomia do atendente:** os atendentes do call center não têm autonomia para decidir qual versão de um procedimento aplicar — precisam escalá-la ou seguir a mais recente por protocolo
- **Volume de conflitos:** com 1.250 documentos atualizados mensalmente/semanalmente, novos conflitos surgirão continuamente

## Decisão

**Adotar combinação das Opções A e C: versionamento com metadado de vigência + apresentação explícita do conflito quando detectado.**

### Mecanismo de implementação

**Fase 1 — Ingestão:**
- Cada chunk recebe metadados: `{doc_id, versao, data_emissao, status_vigencia, fonte}`
- O `status_vigencia` é populado automaticamente pela seguinte heurística: *para documentos com mesmo `doc_id` (ex.: PROC-042), marcar como `ativa` a versão com `data_emissao` mais recente e como `supersedida` as demais*
- Esta heurística é uma aproximação — a marcação definitiva exige validação humana (ver Fase 2)

**Fase 2 — Curadoria humana (processo paralelo):**
- A equipe de Compliance/Operações recebe relatório semanal de documentos com conflito detectado
- Eles confirmam ou corrigem o `status_vigencia` via interface de administração
- Documentos confirmados como obsoletos são marcados como `status_vigencia: "obsoleta-confirmada"` e removidos do índice ativo (movidos para índice de auditoria)

**Fase 3 — Comportamento do assistente:**
- **Caso normal (sem conflito):** resposta normal com citação de fonte
- **Caso de conflito com versão ativa identificada:** responde com a versão ativa e nota: *"Esta informação é da versão mais recente do procedimento (PROC-042 v2, nov/2023). Existe uma versão anterior (mar/2023) que pode estar em uso em alguns contratos — confirme com seu supervisor se necessário."*
- **Caso de conflito sem versão ativa confirmada:** apresenta ambas as versões explicitamente: *"Encontrei duas versões deste procedimento. PROC-042 v1 (mar/2023): Sul=1.2. PROC-042 v2 (nov/2023): Sul=1.3. A versão mais recente sugere Sul=1.3, mas recomendo confirmar com Compliance qual versão se aplica ao contrato deste cliente."*

**Fase 4 — Janela de lag (0–24h após publicação):**
- Durante o período entre publicação e ingestão, o documento novo não existe no índice
- O assistente responde com a versão anterior e adiciona nota automática: *"Atenção: documentos são atualizados no assistente em até 24h. Se você recebeu uma comunicação de atualização de procedimento hoje, confirme os valores com a versão mais recente no SharePoint."*
- Esta nota é inserida automaticamente quando a query envolve documentos com data de ingestão > 20h (próxima do ciclo de atualização)

## Consequências

**Positivas:**
- O atendente nunca recebe uma resposta silenciosamente errada — conflitos são sempre sinalizados
- A heurística de data automática resolve a maioria dos casos sem curadoria manual
- O processo de curadoria humana garante que casos ambíguos sejam resolvidos com autoridade correta (Compliance), não por inferência do LLM
- O índice de auditoria preserva versões obsoletas para rastreabilidade histórica e investigação de incidentes
- O alerta de lag de 24h gerencia a expectativa do atendente sem comprometer a confiança no sistema

**Negativas / Trade-offs:**
- **Dependência de processo humano:** a curadoria semanal de Compliance precisa ser um processo formal com SLA definido. Se Compliance não executar o relatório, documentos ficam em status "conflito sem confirmação" indefinidamente, gerando noise nas respostas.
- **Heurística de data pode estar errada:** um documento mais antigo pode ser a versão vigente (ex.: uma versão foi publicada por engano e a anterior foi restaurada). A heurística de "mais recente = ativo" falha nesses casos até a curadoria corrigir.
- **Apresentação de conflito aumenta carga cognitiva do atendente:** um atendente em pico de chamados não quer ler "existem duas versões" e tomar uma decisão. Isso pode levar a escolhas aleatórias. Mitigação: o assistente sempre indica qual versão usar por default (a mais recente), com o conflito como informação complementar, não como bloqueio.
- **Complexidade de implementação:** a lógica de detecção de conflito, o índice de auditoria e a interface de administração para Compliance são componentes adicionais ao escopo original. Estimativa: +3–5 dias de desenvolvimento.

## Alternativas Consideradas

| Alternativa | Motivo de descarte |
|---|---|
| **Opção B — Exclusão preventiva da versão obsoleta** | Requer processo de curadoria antes da ingestão, criando um gargalo que pode atrasar a atualização de documentos legítimos. Além disso, remove a rastreabilidade histórica — impossível auditar qual versão estava no sistema quando um chamado foi atendido. |
| **Opção D — Delegação ao LLM sem instrução explícita** | O LLM pode escolher a versão errada com alta confiança, sem indicar ao atendente que há um conflito. Inaceitável para dados financeiros (multiplicadores de preço). Testado empiricamente: LLMs tendem a usar o chunk com maior score de similaridade vetorial, não necessariamente o mais recente. |
| **Opção C pura (sem heurística de vigência)** | Apresentar sempre ambas as versões sem indicar qual é a mais recente sobrecarrega o atendente. A heurística de data + curadoria humana fornece uma recomendação clara enquanto mantém a transparência do conflito. |

---

## ADR-0004

# ADR-0004: Build vs Buy para o Pipeline de RAG

## Status

Aceito

## Contexto

O pipeline de RAG (Retrieval-Augmented Generation) é o componente central do assistente. Ele é responsável por: (1) ingestão e indexação dos ~1.250 documentos, (2) geração de embeddings, (3) busca vetorial por similaridade, (4) orquestração do contexto enviado ao LLM, e (5) atualização contínua do índice (ciclo de 24h).

**Forças determinantes:**

- **Prazo:** 3 meses de discovery + desenvolvimento + go-live. Não há margem para construir e operar infraestrutura de baixo nível.
- **Perfil da equipe:** a NovaTech não possui equipe de MLOps interna. O desenvolvimento é conduzido por uma equipe de software (presumivelmente da DB1), não por especialistas em infraestrutura de ML.
- **Stack existente:** M365 E3 + Azure significa que contratos, compliance, RBAC e data residency já estão resolvidos para serviços Azure.
- **Requisito de LGPD:** os documentos e queries do atendimento ao cliente contêm dados pessoais. Qualquer componente fora do Azure introduz nova superfície de risco de compliance.
- **Volume:** 192 queries/dia e ~1.250 documentos é um volume baixo-moderado — não justifica a complexidade de uma solução self-hosted.

## Decisão

**Adotar a Opção Buy: Azure AI Search + Azure OpenAI Embeddings + Azure AI Foundry/Prompt Flow.**

### Componentes e justificativas

| Componente | Serviço Azure | Alternativa open-source descartada |
|---|---|---|
| Vector store + retrieval | Azure AI Search (índice vetorial) | ChromaDB/FAISS self-hosted |
| Embeddings | Azure OpenAI `text-embedding-3-large` | `multilingual-e5-large` local |
| Orquestração do pipeline | Azure AI Foundry + Prompt Flow | LangChain/LlamaIndex |
| OCR para documentos escaneados (15% da base) | Azure AI Document Intelligence | Tesseract local |
| Integração Teams | Azure Bot Service + Teams Toolkit | Bot Framework local |

**Azure AI Search** oferece: índice vetorial nativo com suporte a busca híbrida (vetorial + keyword BM25), integração nativa com Azure OpenAI para geração de embeddings, RBAC via Azure AD (os índices podem ser protegidos por roles), filtros por metadados (essencial para filtrar por `status_vigencia` da ADR-0003), e SLA de 99,9%.

**Azure OpenAI Embeddings (`text-embedding-3-large`):** modelo de embedding com suporte nativo a português (crítico para a base documental da NovaTech), dimensões configuráveis (1.536 por default), e integração nativa com o Azure AI Search.

**Azure AI Foundry/Prompt Flow:** orquestração visual e programática do pipeline RAG, com suporte a: testes A/B de prompts, avaliação de qualidade (groundedness, relevance scores), monitoramento de latência por componente, e versionamento do pipeline.

### Custo estimado do stack Azure (mensal)

| Componente | Estimativa |
|---|---|
| Azure AI Search (S1, 1 unidade) | ~$250/mês |
| Azure OpenAI Embeddings (ingestão inicial: ~12M tokens) | ~$24 (uma vez) |
| Azure OpenAI Embeddings (queries: 192/dia × 200 tokens) | ~$2,30/mês |
| Azure AI Document Intelligence (OCR: ~188 docs escaneados) | ~$7,50 (uma vez) |
| Azure Bot Service | ~$0 (nível gratuito para volume baixo) |
| **Total recorrente** | **~$252/mês** + $130 GPT-4o = **~$382/mês** |

### TCO comparativo: Build vs Buy (12 meses)

| Item | Build (open-source) | Buy (Azure) |
|---|---|---|
| Horas de engenharia (construção) | +80h (infra, ChromaDB, LangChain) | Baseline |
| Horas de engenharia (manutenção/ano) | +120h (atualizações, incidentes, scaling) | +20h |
| Infraestrutura (VM para ChromaDB, GPU para embeddings) | ~$300–500/mês | $0 (incluso no Azure AI Search) |
| Custo de serviços | ~$0 API + $400 infra | ~$382/mês |
| **TCO 12 meses** | ~**$35.000** (infra + eng) | ~**$15.000** (serviços + eng mínima) |

*Premissas: hora de engenharia = $150, Build exige 200h extras de construção + manutenção vs Buy.*

## Consequências

**Positivas:**
- Time-to-market: reduz estimativa de desenvolvimento em 3–4 semanas (sem configuração de infraestrutura, sem testes de ChromaDB/FAISS em produção)
- Compliance por design: RBAC, logs de auditoria, data residency e DPA já cobertos pelo contrato Microsoft existente — zero esforço adicional de compliance
- OCR nativo: Azure AI Document Intelligence resolve os 15% de documentos escaneados sem necessidade de Tesseract local (qualidade superior para PDFs de tabelas complexas)
- Monitoramento incluído: Azure Monitor + Prompt Flow fornecem dashboards de latência, custo e qualidade sem configuração adicional
- Suporte enterprise: SLA, suporte técnico Microsoft e documentação extensa — reduz risco de blockers não resolvíveis

**Negativas / Trade-offs:**
- **Custo de serviço:** ~$252/mês de Azure AI Search é o maior item de custo da solução. Para a NovaTech, é justificável pelo TCO, mas deve ser apresentado explicitamente ao cliente.
- **Lock-in no ecossistema Azure:** migrar para outro vector store futuro (ex.: Pinecone, Weaviate) exige reindexação completa da base (~12M tokens) e mudança na camada de orquestração. Mitigado pela abstração de interface no código de retrieval (não acessar Azure AI Search diretamente, mas via camada de abstração).
- **Menor flexibilidade de customização:** o Prompt Flow tem limitações para pipelines muito customizados (ex.: lógica de branching complexa). Para a NovaTech no MVP, as funcionalidades padrão são suficientes.
- **Dependência de disponibilidade Azure:** todos os componentes estão no mesmo cloud provider. Uma indisponibilidade de região impacta todo o sistema simultaneamente. Mitigação: configurar fallback de região no Azure AI Search.
- **Custo escala com o volume de índice:** ao adicionar novas fontes (ERP, banco de clientes), o custo do Azure AI Search pode aumentar. Monitorar e revisar o tier do serviço conforme o volume cresce.

## Alternativas Consideradas

| Alternativa | Motivo de descarte |
|---|---|
| **LangChain + ChromaDB + sentence-transformers** | Exige VM dedicada para ChromaDB (custo de infra $200–400/mês), configuração de persistência e backup, equipe para operar. TCO 12 meses maior que Azure. Sem SLA, sem suporte enterprise. Inviável no prazo de 3 meses. |
| **LlamaIndex + FAISS** | FAISS é in-memory por design — inadequado para produção com atualizações contínuas de 24h. Exigiria wrapper de persistência customizado. |
| **Pinecone (externo)** | SaaS fora do ecossistema Azure: requer contrato DPA separado, dados saem do Azure, integração com Azure AD complexa. Vantagem técnica (qualidade de busca) não compensa o custo de compliance. |
| **sentence-transformers local (multilingual-e5-large)** | Qualidade competitiva para português, mas exige GPU para latência aceitável em produção. Custo de infraestrutura GPU (~$400/mês) supera o custo do Azure OpenAI Embeddings (~$2/mês recorrente). |

---

## Síntese de Dependências

As quatro decisões formam um sistema coeso com as seguintes dependências críticas:

**ADR-0001 → ADR-0002 (dependência forte):** A escolha do GPT-4o com janela de 128K tokens é o insumo principal do orçamento de contexto definido na ADR-0002. O limite autoimposto de 12K tokens por query foi calibrado assumindo o GPT-4o — se o modelo fosse substituído por um com janela menor (ex.: GPT-4o mini com 128K mas maior attention dilution prática), o orçamento deveria ser revisto para baixo. Inversamente, se a NovaTech migrar para Claude (200K), o orçamento de histórico poderia ser expandido sem risco de truncamento.

**ADR-0002 → ADR-0003 (dependência de implementação):** A estratégia de query expansion da ADR-0002 (decompor perguntas multi-domínio em sub-queries) interage com o mecanismo de detecção de conflitos da ADR-0003. Uma sub-query que recupera chunks de duas versões do PROC-042 deve acionar a lógica de conflito — o pipeline precisa verificar conflitos por `doc_id` no resultado do merge de chunks, não apenas no resultado final.

**ADR-0003 → ADR-0004 (dependência de implementação):** O mecanismo de versionamento com metadado de vigência (ADR-0003) depende de o vector store suportar filtros por metadados. O Azure AI Search (ADR-0004) oferece filtros nativos por campo (`$filter=status_vigencia eq 'ativa'`), permitindo que o retriever exclua chunks obsoletos por padrão e os inclua explicitamente apenas quando detectar conflito. Um vector store open-source como ChromaDB também suporta filtros por metadados, mas a integração seria customizada.

**ADR-0004 → ADR-0001 (dependência de compliance):** A escolha do Azure AI Foundry/Prompt Flow (ADR-0004) reforça a decisão pelo Azure OpenAI GPT-4o (ADR-0001): ambos são serviços Azure com o mesmo DPA, RBAC e data residency. Introduzir o Claude via API (alternativa descartada na ADR-0001) neste stack quebraria a homogeneidade de compliance — os dados das queries sairiam do Azure para a infraestrutura da Anthropic, exigindo DPA adicional e potencialmente violando políticas de data residency.

**Inconsistência identificada — TCO do Claude vs GPT-4o:** O contra-argumento 2 da ADR-0001 aponta que o lock-in no Azure OpenAI cria dependência dupla com o Azure AI Search (ambos usam o mesmo schema de embeddings). Se a NovaTech quiser migrar para Claude no futuro, precisará reindexar toda a base com embeddings compatíveis. A ADR-0004 mitiga isso com a recomendação de camada de abstração no código de retrieval — mas isso precisa ser implementado desde o MVP, não adicionado depois.

**Recomendação de sequência de implementação:** ADR-0004 (infraestrutura base) → ADR-0003 (metadados de versão na ingestão) → ADR-0002 (pipeline de retrieval e orquestração) → ADR-0001 (configuração do modelo e system prompt). A ordem inverte a sequência de decisão para minimizar retrabalho: a infraestrutura é o alicerce, e as decisões de alto nível (modelo, estratégia de contexto) são configuração sobre ela.

---

*Documento gerado em: fase de discovery do projeto Assistente IA NovaTech*
*Revisão obrigatória após análise de transcrições reais de atendimento (ADR-0002, contra-argumento 2)*
*Próxima revisão programada: após go-live do MVP (validação empírica dos parâmetros)*
