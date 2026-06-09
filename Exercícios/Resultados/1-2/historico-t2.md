# Histórico — Tarefa 2 - Anatomia do contexto e orçamento de tokens 
> Exercício 1.2 - Design de Prompt Engineering como Artefato de Arquitetura

---

## Input (prompt)

Projeto: Assistente de IA com RAG para NovaTech (logística, 1.200 funcionários). Atendentes (45 pessoas)
consultam documentação interna (~1.250 fontes) via Microsoft Teams. Stack: Azure OpenAI GPT-4o (128K tokens)
+ Azure AI Search + Azure Prompt Flow. Repositório: Azure DevOps (Git). Time: Tech Lead, 2 devs, 1 QA, 1 PS.

Decisões arquiteturais de referência (Exercício 1.1):
- ADR-0001: Azure OpenAI GPT-4o. Estimativa: ~5.600–6.800 tokens/query. Custo: ~$130/mês.
- ADR-0002: Orçamento de 12.000 tokens/query. N = 6 chunks. Anti-context rot: janela deslizante
  + sumarização ao ultrapassar 2.000 tokens de histórico. Sempre manter as últimas 2 trocas completas.

System prompt atual (protótipo do desenvolvedor):

```
Você é o assistente de atendimento da NovaTech, empresa de logística.
Responda perguntas sobre procedimentos, SLAs e regras de frete.
Use apenas as informações dos documentos fornecidos.
Cite a fonte. Se não souber, diga que não sabe.
```

Guardrails do Product Specialist: (1) Citar fonte (nome + seção). (2) Nunca inventar prazos ou valores.
(3) Quando não encontrar: "Não encontrei essa informação na documentação disponível." (4) Português formal.

Composição do contexto por query: system prompt (estático) + metadados do cliente (tier Gold/Silver/Standard,
contrato, região) + chunks recuperados (~500 tokens, overlap 10%) + pergunta do atendente + histórico da sessão.

Preciso mapear com precisão o contexto que chega ao LLM a cada query e definir o orçamento de tokens.
Cubra as 4 seções abaixo:

2.1 — Estático vs dinâmico: para cada parte do contexto (system prompt, metadados do cliente, chunks
recuperados, pergunta do atendente, histórico da sessão), classifique, informe a frequência de mudança
e a implicação para o pipeline. Qual parte é a maior fonte de variabilidade? Qual é a mais crítica?

2.2 — Estimativas de tokens: estime cada parte mostrando o raciocínio (regra: ~0,65 palavras/token em
PT-BR). Inclua: system prompt atual (4 linhas), system prompt melhorado, metadados do cliente,
1/3/5 chunks recuperados, pergunta típica do atendente e histórico de 1/3/6 trocas.

2.3 — Orçamento de contexto (janela: 128.000 tokens): defina tabela de alocação máxima por parte,
N máximo de chunks que cabem no orçamento, regra de truncamento (o que cortar primeiro quando estourar),
e ponto de context rot: a partir de quantas trocas no Teams o histórico começa a competir com os chunks?
Mostre o cálculo.

2.4 — Diagnóstico do system prompt atual: identifique ao menos 3 elementos ausentes e 1 instrução
ambígua. Reescreva com seções claras (identidade, regras, formato de resposta, instruções de uso dos
chunks). Estime tokens da versão reescrita.

---

## Output (Resposta)

### 2.1 — Estático vs Dinâmico — Mapa do Contexto

O pipeline tem três categorias de componentes quanto à frequência de mudança:

| Componente | Tipo | Frequência de mudança | Implicação para o pipeline |
|---|---|---|---|
| **System Prompt** | Estático | Versões por sprint (semanas/meses) | Pode ser pré-tokenizado e cacheado (Azure OAI prefix caching). Mudanças requerem re-deploy e reavaliação de guardrails. Impacto no runtime: baixo. Impacto em manutenção: alto. |
| **Metadados do cliente** | Semi-estático | Por sessão (minutos/horas) | Lido uma vez na autenticação, injetado no início de cada sessão. Pode mudar entre sessões (ex: upgrade de tier). O pipeline precisa de lookup ao CRM/IAM antes de montar o contexto. Custo: 1 I/O por sessão. |
| **Chunks recuperados** | Dinâmico | Por query (segundos) | Maior fonte de variabilidade volumétrica. Score de relevância, threshold e valor de N determinam tamanho. O pipeline deve medir tokens pós-retrieval e normalizar antes de montar o prompt. ⚠ Principal fonte de variabilidade. |
| **Pergunta do atendente** | Dinâmico | Por query (segundos) | Imprevisível em tamanho e complexidade. Consultas compostas ("qual o SLA Gold no Nordeste e o procedimento de cancelamento?") podem dobrar o tamanho esperado. O pipeline deve validar tamanho do input e alertar se exceder 300 tokens. |
| **Histórico da sessão** | Dinâmico | Acumulativo (cresce por troca) | Cresce linearmente a cada par (pergunta + resposta). Sem controle, satura a janela em ~6 trocas extensas. ADR-0002 define janela deslizante + sumarização ao ultrapassar 2.000 tokens. ⚠ Componente mais crítico para context rot. |

**Maior fonte de variabilidade:** Chunks recuperados — variam entre 0 e N×~500 tokens a cada query. O score de relevância do Azure AI Search, a qualidade do embedding e a natureza da pergunta determinam se chegam 1 ou 6 chunks, com densidades diferentes. O pipeline deve medir e logar tokens pós-retrieval para controle de custo e qualidade.

**Componente mais crítico:** Histórico da sessão — único componente que cresce de forma acumulativa e silenciosa. Sem controle (janela deslizante + sumarização, conforme ADR-0002), expulsa os chunks do contexto a partir de ~4 trocas longas, degradando o grounding nas fontes sem gerar erro explícito.

---

### 2.2 — Estimativas de Tokens por Componente

**Regra de conversão PT-BR:** ~0,65 palavras/token → 1 token ≈ 1,54 palavras. Para texto técnico denso (SLAs, valores, siglas), o ratio tende a ~0,70–0,75 palavras/token. Estimativas com margem de ±15–20%.

#### System Prompt

| Versão | Cálculo | Estimativa |
|---|---|---|
| Atual (4 linhas, ~70 palavras) | 70 ÷ 0,65 | ~108 tokens |
| Melhorado (seções estruturadas, ~250 palavras + markup) | 250 ÷ 0,65 + ~15t markup | ~385 tokens |

Detalhamento do prompt melhorado: identidade (30w) + regras×5 (90w) + formato (55w) + instrução chunks (50w) + exemplos de frase (25w) = ~250 palavras + ~15t de tokens de marcação ("##", "•", quebras de linha).

#### Metadados do cliente

| Escopo | Cálculo | Estimativa |
|---|---|---|
| Mínimo: Tier + Contrato + Região | ~25 palavras ÷ 0,65 | ~40 tokens |
| Completo: + SLAs do tier + vigência do contrato | ~55 palavras ÷ 0,65 | ~85 tokens |

Exemplo: *"Cliente: Ana Lima | Tier: Gold | Contrato: CT-2024-0892 | Região: Sudeste | SLA Entrega: D+1 | SLA Retorno: D+3 | Vigência: 2024–2026"* — ratio mais alto por abreviações, IDs e datas.

#### Chunks recuperados (500 tokens/chunk, overlap 10%)

Custo efetivo por chunk = 500t (conteúdo) + 15t (cabeçalho: nome do documento + seção) = **515t**.
Overlap acumulado a partir de N=3: ~50t redundantes por par adjacente.

| N de chunks | Cálculo | Estimativa |
|---|---|---|
| 1 chunk | 1 × 515 | ~515 tokens |
| 3 chunks | 3 × 515 | ~1.595 tokens |
| 5 chunks | 5 × 515 | ~2.675 tokens |
| 6 chunks (ADR-0002 máx) | 6 × 515 + ~100t overlap acumulado | ~3.190 tokens |

#### Pergunta típica do atendente

| Complexidade | Exemplo | Cálculo | Estimativa |
|---|---|---|---|
| Simples (~15 palavras) | "Qual o prazo de entrega Gold para o Nordeste?" | 15 ÷ 0,65 | ~23 tokens |
| Média (~30 palavras) | "Cliente Gold em SP, pedido feito ontem às 18h. Qual o SLA e o que fazer se atrasar?" | 30 ÷ 0,65 | ~46 tokens |
| Composta (~60 palavras) | Dois cenários, informações de cliente embutidas, múltiplas perguntas | 60 ÷ 0,65 | ~92 tokens |

#### Histórico da sessão no Teams

Troca típica: pergunta ~30w (~46t) + resposta ~270w (~415t) + tokens de role/formatação (~15t) = **~646 tokens/troca**.

| Número de trocas | Cálculo | Estimativa |
|---|---|---|
| 1 troca | 646 × 1 | ~646 tokens |
| 3 trocas | 646 × 3 | ~1.938 tokens |
| 6 trocas (sem sumarização) | 646 × 6 | ~3.876 tokens |

**Gatilho ADR-0002:** sumarização obrigatória ao superar 2.000t → acionado entre a 3ª e a 4ª troca.

---

### 2.3 — Orçamento de Contexto — Janela 128.000 tokens

**KPIs do orçamento:**
- Janela total GPT-4o: 128.000 tokens
- Budget operacional (ADR-0002): 12.000 tokens (9,4% da janela)
- N máximo de chunks: 6 (conforme ADR-0002)
- Ponto de context rot: ~4–5 trocas sem sumarização

#### Tabela de alocação máxima — Budget de 12.000 tokens

| Componente | Alocação máx | % do budget | Política / Observação |
|---|---|---|---|
| System Prompt (melhorado) | 500 t | 4,2% | Fixo; candidato a prefix caching. Margem para evolução do prompt. |
| Metadados do cliente | 150 t | 1,2% | Truncar campos secundários se exceder 150t. Tier e número de contrato são obrigatórios. |
| Chunks recuperados (N≤6) | 3.500 t | 29,2% | ~583t/chunk médio com cabeçalho. Descartar chunks com score abaixo do threshold antes de contar. |
| Pergunta do atendente | 300 t | 2,5% | Alertar o atendente se a pergunta exceder 300t (campo muito longo). |
| Histórico da sessão | 2.000 t | 16,7% | Gatilho ADR-0002: sumarizar ao atingir. Manter sempre as 2 últimas trocas completas. |
| **Reserva para resposta (output)** | **4.000 t** | **33,3%** | max_tokens da chamada. Respostas longas estruturadas com citação de múltiplas fontes. |
| Buffer de segurança | 1.550 t | 12,9% | Margem para variações de tamanho, tokens de controle (role, newlines) e picos de input. |
| **TOTAL BUDGET** | **12.000 t** | **100%** | Entrada típica: ~6.040t; com saída: ~10.040t (dentro do budget). |

#### N máximo de chunks — Cálculo

```
Budget p/ chunks:       3.500 t
Custo efetivo/chunk:    500 + 15 = 515 t
N máx = 3.500 ÷ 515  = 6,7 → N = 6
─────────────────────────────────────
✅ ADR-0002 (N=6) está correto e cabe no budget definido.
```

#### Regra de truncamento — Ordem de prioridade quando o budget estourar

1. **Truncar histórico antigo** — substituir trocas além das últimas 2 pelo resumo sumarizado (ADR-0002). Sempre preservar as 2 últimas trocas completas para manter coerência conversacional.
2. **Reduzir N de chunks** — descartar chunks com menor score de relevância (ex: de N=6 para N=4). Nunca descartar o chunk de maior score; é a âncora principal de grounding.
3. **Truncar metadados secundários** — manter Tier + Contrato (obrigatórios), remover SLAs estendidos do bloco de metadados (estarão nos chunks se forem relevantes para a query).
4. **Nunca truncar:** system prompt, pergunta atual do atendente, output mínimo (1.500t). Se o budget ainda estourar após todas as etapas, retornar erro controlado ao atendente solicitando que reformule a pergunta.

#### Ponto de context rot — Cálculo

```
Budget histórico (ADR-0002):        2.000 t
Tokens por troca típica:             ~646 t
Trocas antes de sumarizar: 2.000 ÷ 646 = 3,09
→ Sumarização obrigatória:          na 4ª troca
Trocas preservadas:                 últimas 2 completas
─────────────────────────────────────────────────────
⚠ Context rot começa na troca 4–5 sem sumarização
```

A partir da 4ª–5ª troca sem sumarização, o histórico consome tokens dos chunks, degradando o grounding nas fontes documentais sem gerar qualquer erro explícito no pipeline.

---

### 2.4 — Diagnóstico do System Prompt Atual

#### Problemas identificados

**Elementos ausentes:**

1. **Identidade contextualizada e papel do assistente** — O prompt diz apenas "assistente de atendimento da NovaTech" sem definir: (a) que o assistente serve os atendentes, não o cliente final; (b) o canal (Teams); (c) o escopo exato de conhecimento (logística, SLAs, procedimentos de frete); (d) o tom esperado (português formal, conforme guardrail #4). O modelo fica sem âncora de persona para calibrar profundidade e registro.

2. **Instrução explícita de formato de citação e uso dos chunks** — "Cite a fonte" é radicalmente vago: não especifica formato (nome do documento + seção?), não instrui sobre múltiplas fontes conflitantes, não define o grau de confiança quando a informação é parcial. O guardrail #1 do Product Specialist ("nome + seção") não está implementado no prompt.

3. **Formato estruturado de resposta** — Sem definição de estrutura de saída (resposta direta → detalhamento → fonte), o modelo alterna entre bullet points, prosa corrida e tabelas. Também ausente: limite de comprimento, instrução de tom formal (guardrail #4), e frase-padrão para informação não encontrada (guardrail #3 parcialmente presente, mas sem a redação exata).

4. **Instrução de uso dos metadados do cliente (tier)** — Os metadados (Tier Gold/Silver/Standard, contrato, região) são injetados no contexto, mas o prompt não instrui o modelo a usá-los para personalizar a resposta. Sem instrução explícita, o modelo pode ignorar o tier ao citar SLAs, respondendo com valores genéricos ao invés de contratuais.

**Instrução ambígua:**

5. **"Use apenas as informações dos documentos fornecidos"** — Problemas em cascata: (1) "documentos fornecidos" não define que são os chunks no bloco CONTEXTO — o modelo pode interpretar como qualquer documento no treinamento; (2) "apenas" pode causar recusas desnecessárias quando a pergunta envolve conhecimento de domínio complementar (ex: cálculo de datas, geografia); (3) não trata informação parcial: se um chunk responde 50% da pergunta, o modelo deve responder parcialmente, sinalizar a lacuna, ou recusar?

#### System Prompt reescrito

```
## IDENTIDADE
Você é o Assistente de Suporte Documental NovaTech, ferramenta interna que auxilia atendentes
(não clientes finais) a consultarem a documentação operacional da NovaTech — empresa de logística
— via Microsoft Teams.

## REGRAS DE OPERAÇÃO
1. Baseie TODAS as respostas exclusivamente nos trechos de documentação fornecidos na seção CONTEXTO
   abaixo. Não utilize conhecimento externo para afirmar prazos, valores ou procedimentos.
2. Se os trechos não contiverem informação suficiente, responda exatamente:
   "Não encontrei essa informação na documentação disponível."
3. Nunca invente, estime ou extrapole prazos, valores monetários ou regras de SLA.
4. Use sempre português formal. Evite gírias, linguagem coloquial ou tutear.
5. Utilize o tier do cliente (Gold/Silver/Standard) e a região informados nos metadados para
   priorizar os SLAs e regras contratuais correspondentes.

## FORMATO DE RESPOSTA
Estruture cada resposta em:
• Resposta direta: 1–2 frases objetivas respondendo à pergunta.
• Detalhamento: procedimento passo a passo, se aplicável.
• Fonte: [Nome do Documento, Seção X.X]
Máximo de 250 palavras. Se múltiplas fontes, cite todas. Se houver conflito entre fontes, sinalize:
"Há divergência entre [Fonte A] e [Fonte B]. Recomendo consulta ao supervisor."

## USO DOS TRECHOS (SEÇÃO CONTEXTO)
Os trechos são fragmentos da base documental interna recuperados por busca semântica. Responda
apenas com o que estiver explícito neles. Se um trecho responder parcialmente a pergunta,
responda a parte coberta e sinalize a lacuna.
```

#### Análise de tokens — versão reescrita

| Seção | Palavras aprox. | Tokens estimados |
|---|---|---|
| IDENTIDADE | ~40w | ~62 t |
| REGRAS DE OPERAÇÃO (5 itens) | ~100w | ~154 t |
| FORMATO DE RESPOSTA | ~60w | ~92 t |
| USO DOS TRECHOS | ~50w | ~77 t |
| Tokens de marcação ("##", "•", quebras) | — | ~15 t |
| **Total** | **~250 palavras** | **~385–400 tokens** |

Delta vs prompt atual: **+~277 tokens → +2,3% do budget de 12.000t** — custo marginal desprezível. Versão dentro da alocação de 500t definida no orçamento.

---

## Comunicações extras

**[Pergunta]** O que nesse orçamento seria otimista demais ou inconsistente com os dados reais de atendimento da NovaTech?

**[Resposta]**

**Premissas otimistas demais**

**1. "Resposta típica = ~270 palavras (~415 tokens)"**
Esse é o número mais arbitrário do modelo inteiro. Ele determina diretamente o cálculo de context rot (646 tokens/troca) e o ponto de sumarização. Respostas de suporte logístico real frequentemente incluem tabelas de SLA por região, listas de procedimentos numerados e transcrições de cláusulas contratuais — que facilmente chegam a 500–800 palavras. Se a resposta típica for 500 palavras em vez de 270, o context rot ocorre na **3ª troca**, não na 4ª–5ª. A alocação de 4.000 tokens para output também pode ser apertada para casos multi-etapa.

**2. "Chunks de ~500 tokens com distribuição uniforme"**
500 tokens/chunk é o tamanho de indexação, não o tamanho médio do conteúdo útil. Na prática, documentos de logística têm seções muito heterogêneas: uma cláusula de SLA pode caber em 80 tokens; um procedimento de devolução multimodal pode ter 900 tokens. Overlap de 10% entre chunks adjacentes foi tratado como constante (~50t/par), mas em documentos com tabelas e listas, o overlap pode ser estruturalmente quebrado, gerando duplicação ou perda de contexto sem controle.

**3. "Pergunta média = ~30 palavras"**
Em ambientes de suporte B2B real, atendentes costumam colar contexto do sistema (número do pedido, histórico de ocorrências, dados do cliente) diretamente na mensagem. Perguntas com contexto colado de CRM facilmente chegam a 150–300 palavras, consumindo 230–460 tokens — bem acima do estimado e próximos do limite de 300 tokens alocados.

**Inconsistências internas**

**4. O ADR-0001 diz 5.600–6.800 tokens/query, mas a tabela de alocação soma 6.040 tokens de entrada + 4.000 de saída = 10.040 tokens**
Há um gap de ~3.200 tokens entre a estimativa do ADR-0001 e o budget real. Ou o ADR-0001 está subestimando (não incluiu histórico + sistema prompt melhorado no cálculo), ou o budget de 12.000 foi calibrado sem reavaliar o ADR anterior. Isso precisa ser reconciliado antes de usar o custo de $130/mês como referência — o custo real pode ser 30–50% maior.

**5. N=6 chunks foi validado pelo budget, mas não pela qualidade de retrieval**
O raciocínio foi "cabem 6 chunks no budget, logo N=6". Isso é raciocínio de capacidade, não de qualidade. Se o Azure AI Search retorna chunks 4, 5 e 6 com score de relevância baixo (comum em bases com ~1.250 fontes heterogêneas), incluí-los adiciona ruído ao contexto. O N ótimo para qualidade provavelmente é 3–4 com threshold de score, não 6 sem filtro.

**6. Custo de $130/mês assume distribuição uniforme de queries**
45 atendentes em logística não têm carga distribuída. Há picos previsíveis (segunda-feira manhã, fim de mês, datas de fechamento de ciclo). Se o cálculo de $130 usa média diária, os picos podem ultrapassar o limite de rate da conta Azure e o custo mensal real pode variar 2–3× dependendo do perfil sazonal.

**O que falta para calibrar o modelo com dados reais**

Para tornar o orçamento confiável para projeção de custo e para o gatilho de sumarização do ADR-0002, seriam necessários: (a) amostra de 100–200 conversas reais do Teams para medir distribuição de tamanho de pergunta e resposta; (b) análise de score distribution do Azure AI Search para definir threshold de N; (c) log de tokens das chamadas ao Azure OpenAI para reconciliar o ADR-0001 com o budget real.
