# Prompt — Tech Lead | Exercício 1.2: Design de Prompt Engineering como Artefato de Arquitetura

> Cole o **Contexto compartilhado** junto com o prompt de cada tarefa ao iniciar cada conversa.
> Ao concluir cada tarefa.

---

## Contexto compartilhado _(incluir no início das Tarefas 1, 2 e 4)_

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

---

## Tarefa 1 — Estratégia de versionamento de prompts

**Ferramenta:** Claude (chat) · **Entregável:** documento de estratégia com 4 seções

```
[Cole o Contexto compartilhado antes deste bloco]

Atue como arquiteto sênior. Preciso definir como tratar prompts como código de produção neste projeto —
versionados, testados e implantados com o mesmo rigor de qualquer componente de software.

Produza uma estratégia de versionamento com estas 4 seções:

1.1 — Localização no repositório: estrutura de pastas, separação (ou não) do código de orquestração
(Azure Prompt Flow / LangChain), gestão por ambiente (dev/hml/prod) e fluxo mínimo para uma alteração
urgente em produção.

1.2 — Convenção de nomenclatura: padrão de nome que comunique componente do sistema, versão, ambiente
e tipo de prompt apenas pelo nome do arquivo. Mostre exemplos para: system prompt de atendimento,
few-shot examples e instrução de fallback.

1.3 — Processo de revisão e aprovação: verificações obrigatórias antes do merge, quem pode aprovar
um PR de prompt de produção, e o critério para aceitar um prompt v2 que melhora 95% dos casos mas
introduz 2 regressões identificadas nos testes automatizados.

1.4 — Ownership: preencha e justifique as restrições mais importantes.
| Papel            | Pode propor alteração? | Pode aprovar PR? | Pode implantar em produção? |
| Tech Lead        |                        |                  |                             |
| Desenvolvedor    |                        |                  |                             |
| QA               |                        |                  |                             |
| Product Spec.    |                        |                  |                             |
| Delivery Manager |                        |                  |                             |

Ao final, aponte o que nessa estratégia seria genérico demais ou impraticável para um time de 5 pessoas
em um projeto de 3 meses.
```

---

## Tarefa 2 — Anatomia do contexto e orçamento de tokens

**Ferramenta:** Claude (chat) · **Entregável:** mapa estático/dinâmico, estimativas, orçamento e diagnóstico

```
[Cole o Contexto compartilhado antes deste bloco]

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
```

---

## Tarefa 3 — Script de teste automatizado de prompts

**Ferramenta:** GitHub Copilot (VSCode) · **Entregável:** `prompt_tester.py` funcional

Abra um arquivo `prompt_tester.py` no VSCode e envie este prompt no chat do Copilot:

```
Crie um script Python de teste automatizado de prompts para um assistente RAG.
O script recebe: (1) um system prompt, (2) pares (pergunta, padrão_esperado, fonte_esperada)
e (3) critérios de verificação. Envia cada pergunta ao LLM e valida a resposta.

Stack: Azure OpenAI GPT-4o (openai>=1.0.0). Autenticação: variável AZURE_OPENAI_API_KEY.

Critérios de verificação (avaliar cada resposta):
  1. Contém citação de fonte no formato "[NOME_DOC, seção X.X]"          — CRÍTICO
  2. Não contém termos proibidos: ["não sei", "talvez", "provavelmente"]  — CRÍTICO
  3. Está em português (verificar presença de stopwords pt-BR)
  4. Comprimento entre 50 e 500 palavras

Casos de teste (baseados nos chunks de referência do pipeline RAG):
  - Pergunta: "Qual o prazo de devolução para carga perigosa?"
    Padrão esperado na resposta: "não pode ser devolvida" | Fonte: "POL-001"
  - Pergunta: "Qual o SLA do cliente Gold?"
    Padrão esperado: "2h" E "24h" | Fonte: "SLA-2024"
  - Pergunta: "Qual o multiplicador de frete para o Norte?"
    Padrão esperado: "1.8" | Fonte: "PROC-042-v2"

Requisitos de implementação:
  - SYSTEM_PROMPT como string configurável no topo do arquivo
  - Funções separadas: get_llm_response(), verify_criteria(), run_tests()
  - Relatório por caso: PASS/FAIL por critério com a resposta obtida
  - Exit code 1 se qualquer critério CRÍTICO falhar em qualquer caso
  - Type hints e docstrings curtas em cada função
```

---

## Tarefa 4 — Enforcement probabilístico vs determinístico

**Ferramenta:** Claude (chat) · **Entregável:** mapa de enforcement e recomendação arquitetural

```
[Cole o Contexto compartilhado antes deste bloco. Inclua também o system prompt reescrito
produzido na Tarefa 2.]

Preciso definir a fronteira entre guardrails enforçados no prompt (probabilístico — dependem do LLM)
e guardrails enforçados em código fora do prompt (determinístico — sempre executam).

4.1 — Mapa de enforcement: para cada guardrail abaixo, defina se é prompt, código ou ambos.
Justifique pelo custo real de falha no contexto de um atendente de logística tomando decisões
operacionais com base na resposta.
  (1) Citar fonte (nome + seção).
  (2) Nunca inventar prazos ou valores.
  (3) Responder em português formal.
  (4) Dizer "Não encontrei" quando sem resposta.
  (5) Não misturar versões contraditórias sem sinalizar.

4.2 — Implementação dos determinísticos: para cada guardrail classificado como código ou ambos,
descreva o filtro: o que verifica na resposta do LLM, qual estrutura inspeciona e o que acontece
na falha — rejeita e retorna erro? reprocessa? registra alerta silencioso? Considere o impacto
de latência no atendimento ao definir a estratégia de falha.

4.3 — Falha silenciosa: para cada guardrail enforçado apenas no prompt, dê um exemplo concreto
de falha no contexto NovaTech. Defina o mecanismo de detecção em produção para cada exemplo.

4.4 — Recomendação arquitetural: quais guardrails exigem duplo enforcement (prompt + código) para
o nível de confiabilidade esperado? Justifique pelo impacto direto no negócio da NovaTech.
```

> **Itere:** Após a resposta, pergunte: _"Entre rejeitar e reprocessar quando um guardrail
> determinístico falha — qual é preferível neste contexto? Qual o custo operacional de cada um?"_

---

## Modelo de histórico _(salvar ao final de cada tarefa)_

Crie 4 arquivos: `historico-t1.md`, `historico-t2.md`, `historico-t3.md`, `historico-t4.md`.
Use esta estrutura em todos:

---

**# Histórico — Tarefa [X]: [Nome da Tarefa]**
**> Exercício 1.2 — Tech Lead | Design de Prompt Engineering como Artefato de Arquitetura**

**## Input — Prompt enviado**
_(Cole aqui o prompt exato enviado — contexto compartilhado + prompt da tarefa)_

**## Output — Resposta da LLM**
_(Cole aqui a resposta completa recebida)_

**## Comunicações extras**
_(Iterações de refinamento e follow-ups, se houver. Formato: **[Pergunta]** → **[Resposta]**)_
