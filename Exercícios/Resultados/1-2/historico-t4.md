# Histórico — Tarefa 4 — Enforcement probabilístico vs determinístico

> Exercício 1.2 — Design de Prompt Engineering como Artefato de Arquitetura

---

## Input

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

System Prompt reescrito

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

---

## Output

### 4.1 — Mapa de Enforcement

| # | Guardrail | Enforcement | Justificativa pelo custo real de falha |
|---|-----------|-------------|----------------------------------------|
| 1 | Citar fonte (nome + seção) | **Ambos** | Um atendente que cita um procedimento sem fonte não consegue escalar para o supervisor nem auditar depois. A falha probabilística do LLM (omitir a citação em respostas muito longas) é frequente o suficiente para exigir verificação em código. |
| 2 | Nunca inventar prazos ou valores | **Ambos** | Custo de falha crítico: prazo inventado vira SLA comunicado ao cliente. Geração de valores fictícios pode configurar responsabilidade contratual. O LLM alucinará sob pressão (pergunta sobre tier não coberto na documentação). Verificação no prompt é insuficiente isoladamente. |
| 3 | Português formal | **Prompt** | Custo de falha baixo-médio: resposta informal ou parcialmente em inglês é perceptível pelo atendente e não causa decisão errada. Detecção humana é eficaz. Enforcement em código exigiria classificador de formalidade com latência e FP elevados — custo operacional desproporcional. |
| 4 | "Não encontrei" quando sem resposta | **Ambos** | Se o LLM responde com inventividade ao invés de recusar, o atendente age com dado falso. A frase exata é necessária para rastreio em logs de suporte. Verificação em código por ausência de `[Fonte:` combinada com resposta substantiva captura o padrão de alucinação mais perigoso. |
| 5 | Não misturar versões contraditórias sem sinalizar | **Prompt** | A detecção determinística de contradição entre fontes exigiria comparar semanticamente todos os chunks — latência proibitiva (~400–800ms adicionais). O prompt instrui explicitamente a sinalizar conflito. O mecanismo de detecção em produção é log + sampling humano, não filtro em tempo real. |

---

### 4.2 — Implementação dos Determinísticos

Os guardrails **1**, **2** e **4** recebem enforcement em código. A seguir, o design de cada filtro:

---

#### Guardrail 1 — Citação de Fonte

**O que verifica:** presença de pelo menos uma citação estruturada na resposta.

**Estrutura inspecionada:**

```python
import re

CITATION_PATTERN = re.compile(
    r'\[([^\]]{3,80}),\s*[Ss]e[çc][ãa]o\s+[\d\.A-Z]+\]'
)

def check_citation(response: str) -> bool:
    """
    Aceita: [Manual de Frete, Seção 3.2]
    Rejeita: resposta sem nenhum padrão [Documento, Seção X]
    """
    return bool(CITATION_PATTERN.search(response))
```

**Estratégia de falha:**

```python
def enforce_citation(response: str, context: dict) -> dict:
    if check_citation(response):
        return {"status": "ok", "response": response}

    # Reprocessamento com prompt reforçado (1 tentativa)
    reinforced = call_llm(
        response_so_far=response,
        extra_instruction=(
            "Sua resposta anterior não contém citação de fonte. "
            "Reescreva incluindo obrigatoriamente [Nome do Documento, Seção X.X] "
            "ao final."
        )
    )

    if check_citation(reinforced):
        log_event("citation_repaired", original=response)
        return {"status": "repaired", "response": reinforced}

    # Falha após reprocessamento → bloqueio + alerta
    log_event("citation_blocked", severity="HIGH", response=response)
    return {
        "status": "blocked",
        "response": (
            "Não foi possível recuperar a informação com rastreabilidade. "
            "Por favor, consulte a documentação diretamente ou acione o supervisor."
        )
    }
```

**Impacto de latência:** reprocessamento adiciona ~800–1.200 ms. Aceitável pois ocorre apenas em falhas, estimadas em < 5% das queries com prompt bem calibrado.

---

#### Guardrail 2 — Nunca Inventar Prazos ou Valores

**O que verifica:** presença de números que parecem prazos ou valores monetários sem âncora explícita nos chunks recuperados.

**Estrutura inspecionada:**

```python
import re

# Padrões de risco: "3 dias úteis", "R$ 450,00", "72h", "até 5 dias"
RISKY_PATTERN = re.compile(
    r'\b(\d{1,3})\s*(dias?\s*úteis?|dias?\s*corridos?|horas?|h\b)'
    r'|R\$\s*[\d\.,]+'
    r'|\b\d+%\s*(de\s*)?(multa|desconto|acréscimo)',
    re.IGNORECASE
)

def extract_numbers_from_chunks(chunks: list[str]) -> set[str]:
    """Extrai todos os valores numéricos presentes nos chunks recuperados."""
    found = set()
    for chunk in chunks:
        found.update(re.findall(r'\b\d[\d\.,]*\b', chunk))
    return found

def check_hallucinated_values(response: str, chunks: list[str]) -> list[str]:
    """
    Retorna lista de valores suspeitos (presentes na resposta
    mas ausentes em qualquer chunk recuperado).
    """
    response_numbers = set(re.findall(r'\b\d[\d\.,]+\b', response))
    grounded_numbers = extract_numbers_from_chunks(chunks)
    return list(response_numbers - grounded_numbers)
```

**Estratégia de falha:**

```python
def enforce_no_hallucinated_values(
    response: str,
    chunks: list[str]
) -> dict:

    suspects = check_hallucinated_values(response, chunks)

    if not suspects:
        return {"status": "ok", "response": response}

    # Não reprocessa — risco de segunda alucinação
    # Bloqueia imediatamente e registra para auditoria
    log_event(
        "hallucinated_values_blocked",
        severity="CRITICAL",
        suspects=suspects,
        response=response
    )

    return {
        "status": "blocked",
        "response": (
            "Não encontrei essa informação na documentação disponível. "
            "Os dados específicos de prazo ou valor devem ser consultados "
            "diretamente no sistema ou com o supervisor."
        ),
        "alert": {
            "type": "hallucination_risk",
            "values": suspects,
            "action": "supervisor_notification"
        }
    }
```

**Estratégia de falha:** bloqueio imediato sem reprocessamento. A segunda chamada ao LLM com os mesmos chunks tem probabilidade relevante de reiterar a alucinação. Latência zero adicional no caminho de falha — a resposta bloqueada é gerada localmente.

---

#### Guardrail 4 — Resposta "Não Encontrei"

**O que verifica:** consistência entre ausência de chunks úteis e formato da resposta.

**Estrutura inspecionada:**

```python
NOT_FOUND_PHRASE = "Não encontrei essa informação na documentação disponível"
SUBSTANTIVE_PATTERN = re.compile(
    r'\[.+?,\s*[Ss]e[çc][ãa]o\s+[\d\.]+\]'  # tem citação
    r'|'
    r'(?:o prazo|o valor|o procedimento|conforme|segundo)\b',  # afirmação factual
    re.IGNORECASE
)

def check_false_confidence(response: str, retrieval_score: float) -> str:
    """
    Detecta dois padrões de falha:
    A) Score de retrieval baixo, mas LLM respondeu com confiança.
    B) LLM incluiu NOT_FOUND_PHRASE mas também fez afirmação factual
       (resposta esquizofrênica).
    """
    has_not_found = NOT_FOUND_PHRASE.lower() in response.lower()
    has_factual   = bool(SUBSTANTIVE_PATTERN.search(response))
    low_retrieval = retrieval_score < 0.72  # threshold calibrado empiricamente

    if low_retrieval and not has_not_found and has_factual:
        return "false_confidence"       # alucinação com baixo retrieval
    if has_not_found and has_factual:
        return "contradictory_response" # "não sei mas o prazo é 3 dias"
    return "ok"
```

**Estratégia de falha:**

```python
def enforce_not_found(
    response: str,
    retrieval_score: float
) -> dict:

    status = check_false_confidence(response, retrieval_score)

    if status == "ok":
        return {"status": "ok", "response": response}

    if status == "contradictory_response":
        # Reprocessa pedindo coerência
        fixed = call_llm(
            extra_instruction=(
                "Sua resposta é contraditória: contém 'Não encontrei' "
                "mas também faz afirmações factuais. "
                "Escolha: ou a informação está nos documentos (cite a fonte) "
                "ou não está (use apenas a frase padrão)."
            )
        )
        log_event("contradictory_response_reprocessed")
        return {"status": "repaired", "response": fixed}

    if status == "false_confidence":
        log_event("false_confidence_blocked", severity="HIGH")
        return {
            "status": "blocked",
            "response": NOT_FOUND_PHRASE + "."
        }
```

---

### 4.3 — Falha Silenciosa nos Guardrails de Prompt

Para os guardrails enforçados **apenas no prompt** (3 e 5):

---

#### Guardrail 3 — Português Formal

**Exemplo concreto de falha:**

> Pergunta do atendente: "Qual é o SLA para coleta Gold em SP?"
>
> Resposta com falha: *"Oi! O SLA pra Gold em SP é de 24h conforme o contrato. Qualquer coisa me chama!"*

O LLM pode deslizar para registro informal quando a pergunta do atendente é escrita informalmente, por efeito de code-switching estilístico — especialmente em sessões longas onde o histórico acumula mensagens coloquiais.

**Mecanismo de detecção em produção:**

```python
# Amostragem estocástica: 5% das respostas passam por classificador leve
INFORMAL_MARKERS = [
    r'\boi\b', r'\btchau\b', r'\bpra\b', r'\bpro\b',
    r'\bqualquer coisa\b', r'\bme chama\b', r'\btá\b',
    r'!{2,}',  # múltiplas exclamações
]

def sample_formality_audit(response: str, rate: float = 0.05) -> None:
    import random
    if random.random() > rate:
        return
    violations = [m for m in INFORMAL_MARKERS if re.search(m, response, re.I)]
    if violations:
        log_event(
            "formality_violation",
            severity="LOW",
            markers=violations,
            response_preview=response[:200]
        )
        # Alimenta dashboard semanal de qualidade — não bloqueia
```

A detecção é assíncrona e não bloqueia o fluxo. O dado alimenta revisão semanal pelo Tech Lead para recalibrar o prompt se a taxa de violações ultrapassar 2%.

---

#### Guardrail 5 — Sinalizar Conflito entre Fontes

**Exemplo concreto de falha:**

> Chunks recuperados: Manual de Frete v2.1 diz "prazo Gold SP: 24h"; Contrato Matriz 2024 diz "prazo Gold SP: 48h úteis".
>
> Resposta com falha: *"O prazo para clientes Gold em SP é de 24 horas. [Manual de Frete, Seção 4.2]"*

O LLM escolhe silenciosamente a fonte de maior confiança semântica e ignora a contradição — comportamento documentado em RAG com chunks de versões diferentes do mesmo documento.

**Mecanismo de detecção em produção:**

```python
def audit_conflict_suppression(
    response: str,
    chunks: list[dict]  # cada chunk tem {"source": str, "content": str}
) -> None:
    """
    Detecta post-hoc se múltiplos chunks com números diferentes
    foram recuperados mas a resposta cita apenas um.
    """
    cited_sources = re.findall(r'\[([^\]]+),\s*[Ss]e[çc][ãa]o', response)

    # Valores numéricos por fonte
    source_values = {}
    for chunk in chunks:
        nums = re.findall(r'\b\d[\d\.,]*\b', chunk["content"])
        source_values[chunk["source"]] = set(nums)

    # Se há ≥2 fontes com valores distintos mas apenas 1 citada
    if len(cited_sources) == 1 and len(chunks) >= 2:
        all_values = [v for s, v in source_values.items()]
        if len(all_values) >= 2 and all_values[0] != all_values[1]:
            log_event(
                "conflict_suppressed",
                severity="MEDIUM",
                cited=cited_sources,
                chunks_available=[c["source"] for c in chunks],
                response_preview=response[:300]
            )
            # Aciona revisão humana assíncrona (ticket no DevOps)
```

A detecção é assíncrona. Casos identificados geram tickets automáticos no Azure DevOps para revisão humana e potencial atualização da base documental.

---

### 4.4 — Recomendação Arquitetural: Duplo Enforcement

Três guardrails exigem **prompt + código** para o nível de confiabilidade esperado em produção logística:

---

**Guardrail 1 — Citação de Fonte**

Impacto direto: rastreabilidade de decisões operacionais. Quando um atendente registra uma ocorrência baseada em informação sem fonte, o time de QA não consegue auditar se o dado veio da documentação ou de alucinação. Em logística, isso significa impossibilidade de distinguir erro do sistema de erro humano. O prompt garante boa cobertura nominal; o código garante que **nenhuma resposta sem citação chegue ao atendente**.

---

**Guardrail 2 — Nunca Inventar Prazos ou Valores**

Impacto direto: SLA comunicado com dados falsos gera expectativa no cliente que a NovaTech não pode honrar — resultando em multa contratual, chargeback ou ruptura de contrato. Com 45 atendentes e ~1.250 fontes documentais (incluindo versões e aditivos contratuais), a probabilidade de o LLM extrapolar é alta para perguntas sobre tiers não cobertos nos chunks recuperados. Este é o guardrail de maior criticidade no negócio — o custo de uma única falha supera o custo operacional de centenas de filtros.

---

**Guardrail 4 — "Não Encontrei" quando sem resposta**

Impacto direto: o padrão de falha mais perigoso não é o LLM dizendo algo claramente errado — é ele respondendo com confiança sobre algo que não está na documentação. O atendente não tem como distinguir uma resposta fundamentada de uma alucinação convincente sem verificação em código. A combinação de score de retrieval baixo + resposta factual é o sinal mais preciso disponível sem custo de latência adicional.

---

**Diagrama de fluxo consolidado:**

```
Query do Atendente
       │
       ▼
[Azure AI Search] ── retrieval_score ──────────────────────┐
       │                                                   │
       ▼                                                   │
[Azure OpenAI GPT-4o]                                      │
  System Prompt com Guardrails 1,2,3,4,5                   │
       │                                                   │
       ▼                                                   ▼
  Resposta Raw ──► [Filtro G4: false_confidence] ◄── retrieval_score
                          │
                     ok / block / repair
                          │
                   [Filtro G2: valores]  ◄── chunks
                          │
                     ok / block
                          │
                   [Filtro G1: citação]
                          │
                     ok / repair / block
                          │
                          ▼
                   Resposta Final → Atendente
                          │
                   (async) [Audit G3: formalidade]
                   (async) [Audit G5: conflito suprimido]
                          │
                          ▼
                   Logs → Azure Monitor
                   Alertas → Azure DevOps
```

Os filtros síncronos (G1, G2, G4) ficam no caminho crítico com latência total adicional estimada em **0–2.400 ms** apenas em casos de falha (< 5% das queries). Os auditores assíncronos (G3, G5) nunca impactam latência percebida pelo atendente.

---

## Comunicações extras

### [Pergunta]

Entre rejeitar e reprocessar quando um guardrail determinístico falha — qual é preferível neste contexto? Qual o custo operacional de cada um?

### [Resposta]

#### O problema estrutural do reprocessamento

Reprocessar significa chamar o LLM uma segunda vez com o mesmo contexto de chunks, acrescentando uma instrução corretiva. Isso funciona bem quando a falha é **de formato** (o modelo sabia a resposta mas omitiu a citação). Funciona mal quando a falha é **de conteúdo** (o modelo não tinha base nos chunks e inventou) — porque a segunda chamada recebe os mesmos chunks insuficientes e tem probabilidade relevante de reiterar ou variar a alucinação.

Essa distinção é o eixo central da decisão.

---

#### Análise por guardrail

**Guardrail 1 — Citação ausente → Reprocessar**

A ausência de citação é quase sempre uma falha de formato, não de conteúdo. O modelo respondeu com informação dos chunks mas não estruturou o `[Documento, Seção X.X]`. A instrução corretiva ("reescreva incluindo a citação") tem alta taxa de sucesso porque o modelo já tem o dado — só precisa formatá-lo.

Custo do reprocessamento: ~800–1.200 ms, ~50% do custo de tokens da chamada original. Custo da rejeição: o atendente recebe mensagem de bloqueio e precisa reformular ou escalar — interrupção de fluxo desnecessária para um problema que o sistema pode corrigir sozinho.

**Preferível: reprocessar, com rejeição como fallback se a segunda chamada também falhar.**

---

**Guardrail 2 — Valores sem âncora nos chunks → Rejeitar imediatamente**

Este é o caso onde reprocessar é perigoso. O modelo gerou um número (prazo, valor monetário) que não aparece em nenhum chunk recuperado. Isso significa que o retrieval não trouxe a informação necessária — e uma segunda chamada com os mesmos chunks insuficientes não resolve o problema estrutural. O modelo vai ou reiterar o mesmo número inventado, ou inventar um número diferente, ou — no melhor caso — usar a frase de recusa que você poderia ter gerado localmente sem custo.

Há também o risco de **variação perigosa**: a segunda chamada pode produzir um valor diferente do primeiro, mas igualmente sem âncora. Se por algum motivo o segundo passar no filtro (falso negativo), o atendente recebe um número ainda menos rastreável.

Custo da rejeição: o atendente recebe a frase padrão e sabe que precisa consultar outra fonte. Custo do reprocessamento: latência adicional + risco não-zero de o segundo resultado ser aceito erroneamente.

**Preferível: rejeitar imediatamente, sem segunda chamada.**

---

**Guardrail 4 — False confidence ou resposta contraditória → Depende do subtipo**

Aqui há dois padrões distintos que merecem tratamento diferente:

*Resposta contraditória* ("Não encontrei essa informação… o prazo é de 3 dias úteis"): reprocessar faz sentido. O modelo tem os dados nos chunks mas produziu uma resposta incoerente. A instrução corretiva pedindo coerência resolve na maioria dos casos — é novamente uma falha de formato/estrutura, não de conteúdo.

*False confidence com retrieval score baixo* (chunks irrelevantes, mas o modelo respondeu com afirmação factual): rejeitar. O score baixo indica que o retrieval não encontrou documentação pertinente. Reprocessar com os mesmos chunks ruins vai provavelmente produzir outra alucinação.

**Preferível: reprocessar para contradição, rejeitar para false confidence com retrieval baixo.**

---

#### Tabela de decisão consolidada

| Guardrail | Tipo de falha | Estratégia | Justificativa |
|---|---|---|---|
| G1 — Citação ausente | Formato | Reprocessar → fallback rejeição | Modelo tem o dado, só errou a estrutura |
| G2 — Valor sem âncora | Conteúdo | Rejeitar imediatamente | Reprocessamento não resolve retrieval insuficiente |
| G4a — Resposta contraditória | Formato/coerência | Reprocessar | Incoerência estrutural, corrigível |
| G4b — False confidence | Conteúdo | Rejeitar imediatamente | Score baixo indica ausência de base documental |

---

#### Custo operacional comparado

**Reprocessamento:**
- Latência adicional: 800–2.000 ms por ocorrência
- Custo de tokens: ~50–100% da chamada original (dependendo do tamanho do contexto reenviado)
- Com ~45 atendentes e estimativa de 5% de falhas de formato, o custo mensal adicional é pequeno — algumas dezenas de dólares sobre o baseline de ~$130/mês
- Risco residual: falso negativo no segundo filtro (o repair passa onde não deveria)

**Rejeição imediata:**
- Latência adicional: zero — resposta bloqueada gerada localmente
- Custo de tokens: zero
- Custo operacional real: fricção no atendimento — o atendente perde o contexto da query e precisa reformular, escalar ou consultar manualmente
- Em contexto de logística com SLA ativo, cada interrupção de fluxo tem custo de tempo humano

O ponto não óbvio é que **rejeitar não é de graça**. O custo não aparece na fatura da Azure, mas aparece no tempo do atendente. Para falhas de formato (G1, G4a), onde o reprocessamento tem alta taxa de sucesso, rejeitar imediatamente é mais barato na aparência e mais caro na operação. Para falhas de conteúdo (G2, G4b), rejeitar é a escolha correta tanto tecnicamente quanto operacionalmente — porque o reprocessamento não teria como produzir um resultado melhor.

A heurística geral para este contexto: **se o problema está no modelo, reprocesse; se o problema está nos dados (retrieval), rejeite.**
