# Histórico — Tarefa 3: Script de teste automatizado de prompts
> Exercício 1.2 - Design de Prompt Engineering como Artefato de Arquitetura

---

## Input (prompt)

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

---

## Output (Resposta)

Arquivo `Exercícios/Resultados/prompt_tester.py` criado com o seguinte conteúdo (Atualizado com as Iterações):

```python
"""
Teste automatizado de prompts para assistente RAG.
Requisitos: openai>=1.0.0
Variável de ambiente obrigatória: AZURE_OPENAI_API_KEY
"""

import os
import re
import sys
from dataclasses import dataclass, field

from openai import AzureOpenAI

# ---------------------------------------------------------------------------
# Configuração do cliente Azure OpenAI
# ---------------------------------------------------------------------------
AZURE_OPENAI_ENDPOINT = os.environ.get(
    "AZURE_OPENAI_ENDPOINT", "https://<seu-recurso>.openai.azure.com/"
)
AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")

# ---------------------------------------------------------------------------
# Modo mock: ativado via MOCK_MODE=1 ou automaticamente sem AZURE_OPENAI_API_KEY
# ---------------------------------------------------------------------------
MOCK_MODE: bool = (
    os.environ.get("MOCK_MODE", "0") == "1"
    or not os.environ.get("AZURE_OPENAI_API_KEY")
)

# ---------------------------------------------------------------------------
# System prompt configurável
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
Você é um assistente especializado em logística e atendimento ao cliente da NovaTech.
Responda SEMPRE em português do Brasil.
Cite obrigatoriamente a fonte no formato [NOME_DOC, seção X.X] ao final de cada afirmação factual.
Seja objetivo e direto. Não use termos como "não sei", "talvez" ou "provavelmente".
""".strip()

# ---------------------------------------------------------------------------
# Stopwords mínimas para detecção de português
# ---------------------------------------------------------------------------
PT_STOPWORDS = {
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "para", "por", "com", "que", "não", "uma", "um", "se", "ao", "são",
    "o", "a", "os", "as", "e", "é", "ou", "mas", "mais",
}

# ---------------------------------------------------------------------------
# Estruturas de dados
# ---------------------------------------------------------------------------

@dataclass
class TestCase:
    """Define um caso de teste para o assistente RAG."""

    question: str
    expected_patterns: list[str]   # todos devem estar presentes na resposta
    expected_source: str            # trecho que deve aparecer na citação de fonte
    mock_response: str = ""        # resposta usada em modo mock (substitui chamada ao LLM)


@dataclass
class CriterionResult:
    """Resultado de um único critério de verificação."""

    name: str
    passed: bool
    critical: bool
    detail: str = ""


@dataclass
class TestResult:
    """Resultado completo de um caso de teste."""

    test_case: TestCase
    response: str
    criteria: list[CriterionResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(c.passed for c in self.criteria)

    @property
    def critical_failed(self) -> bool:
        return any(not c.passed and c.critical for c in self.criteria)


# ---------------------------------------------------------------------------
# Casos de teste
# ---------------------------------------------------------------------------
TEST_CASES: list[TestCase] = [
    TestCase(
        question="Qual o prazo de devolução para carga perigosa?",
        expected_patterns=["não pode ser devolvida"],
        expected_source="POL-001",
        mock_response=(
            "Carga perigosa não pode ser devolvida após a coleta, conforme a política vigente de devoluções da NovaTech. "
            "Esta restrição se aplica independentemente do prazo de entrega, do estado da mercadoria ou do motivo alegado pelo cliente. "
            "Qualquer solicitação de devolução para este tipo de carga será recusada automaticamente pelo sistema, "
            "sem exceções previstas no contrato padrão. Em casos de dúvida, o atendente deve encaminhar ao setor jurídico. "
            "[POL-001, seção 3.2]"
        ),
    ),
    TestCase(
        question="Qual o SLA do cliente Gold?",
        expected_patterns=["2h", "24h"],
        expected_source="SLA-2024",
        mock_response=(
            "O cliente Gold possui SLA de 2h para abertura e triagem de chamados e 24h para resolução completa do incidente. "
            "Estes prazos são contados em dias úteis a partir do registro formal do chamado no sistema de gestão. "
            "O não cumprimento gera notificação automática para o gestor responsável pela conta e pode acarretar penalidades contratuais. "
            "Clientes Gold têm prioridade máxima na fila de atendimento conforme acordo vigente. "
            "[SLA-2024, seção 2.1]"
        ),
    ),
    TestCase(
        question="Qual o multiplicador de frete para o Norte?",
        expected_patterns=["1.8"],
        expected_source="PROC-042-v2",
        mock_response=(
            "O multiplicador de frete para a região Norte é de 1.8, aplicado diretamente sobre a tarifa base acordada. "
            "Este coeficiente reflete os custos logísticos específicos da região, incluindo infraestrutura viária precária e maior distância dos centros de distribuição. "
            "O valor de 1.8 foi revisado e homologado na última atualização do procedimento de frete especial, "
            "entrando em vigor conforme cronograma aprovado pela diretoria de operações. "
            "[PROC-042-v2, seção 4.1]"
        ),
    ),
]

# ---------------------------------------------------------------------------
# Funções principais
# ---------------------------------------------------------------------------

def get_llm_response(question: str, system_prompt: str, mock_response: str = "") -> str:
    """Envia a pergunta ao Azure OpenAI e retorna o texto da resposta.

    Em modo mock (MOCK_MODE=True), retorna mock_response do TestCase sem chamar a API.
    """
    if MOCK_MODE:
        return mock_response or "Resposta simulada para a pergunta. [MOCK-DOC, seção 1.0]"

    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("Variável AZURE_OPENAI_API_KEY não definida.")

    client = AzureOpenAI(
        api_key=api_key,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
    )

    completion = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0,
    )
    return completion.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# Regex para extração de tokens numéricos (decimais, inteiros, e.g. "1.8", "24", "2h")
# ---------------------------------------------------------------------------
_NUMERIC_TOKEN_RE = re.compile(r"\b\d+(?:[.,]\d+)?(?:h|%|x)?\b", re.IGNORECASE)


def verify_groundedness(response: str, test_case: TestCase) -> CriterionResult:
    """Verifica groundedness básica: checa se valores numéricos da resposta contradizem a fonte.

    Lógica:
      1. Extrai tokens numéricos esperados a partir de expected_patterns (e.g. "1.8", "2h", "24h").
      2. Extrai todos os tokens numéricos presentes no corpo da resposta (excluindo a citação).
      3. Para cada valor esperado, confirma que ele está na resposta.
      4. Detecta contradição quando um token numérico da mesma "família" (mesmo sufixo de unidade
         ou mesma ordem de magnitude) aparece na resposta mas com valor diferente do esperado.
    Retorna FAIL se qualquer contradição for detectada.
    """
    # Separa o corpo da resposta da parte de citação para não confundir números de seção
    citation_split = re.split(r"\[", response)
    body = citation_split[0] if len(citation_split) > 1 else response

    # Tokens numéricos esperados (apenas expected_patterns que contêm dígitos)
    expected_numeric: list[str] = [
        p.lower()
        for p in test_case.expected_patterns
        if re.search(r"\d", p)
    ]

    if not expected_numeric:
        return CriterionResult(
            name="Groundedness numérica",
            passed=True,
            critical=False,
            detail="Nenhum valor numérico nos padrões esperados; verificação ignorada.",
        )

    # Todos os tokens numéricos presentes no corpo
    body_tokens: set[str] = {m.group(0).lower() for m in _NUMERIC_TOKEN_RE.finditer(body)}

    contradictions: list[str] = []
    for expected in expected_numeric:
        if expected not in body_tokens:
            # Valor esperado ausente — possível contradição ou omissão
            contradictions.append(f"'{expected}' esperado mas não encontrado no corpo")
            continue

        # Detecta tokens da mesma unidade/sufixo com valor diferente
        # Ex.: esperado "2h" — qualquer "Nh" (N != 2) é suspeito
        suffix_match = re.search(r"([a-z%x]+)$", expected)
        suffix = suffix_match.group(1) if suffix_match else ""
        if suffix:
            rival_pattern = re.compile(r"\b\d+(?:[.,]\d+)?" + re.escape(suffix) + r"\b", re.IGNORECASE)
            rivals = {
                m.group(0).lower()
                for m in rival_pattern.finditer(body)
                # ignora o próprio valor esperado E outros valores também esperados
                if m.group(0).lower() not in expected_numeric
            }
            if rivals:
                contradictions.append(
                    f"Valor esperado '{expected}' mas resposta também menciona {sorted(rivals)} "
                    f"(possível contradição)"
                )

    passed = len(contradictions) == 0
    return CriterionResult(
        name="Groundedness numérica",
        passed=passed,
        critical=False,
        detail=" | ".join(contradictions) if contradictions else "",
    )


def verify_criteria(response: str, test_case: TestCase) -> list[CriterionResult]:
    """Aplica todos os critérios de verificação à resposta e retorna os resultados.

    Critérios:
      1. (CRÍTICO) Citação de fonte no formato [NOME_DOC, seção X.X]
      2. (CRÍTICO) Ausência de termos proibidos
      3. Resposta em português (stopwords pt-BR)
      4. Comprimento entre 50 e 500 palavras
      5. Padrões esperados presentes
      6. Fonte esperada citada
      7. Groundedness numérica (sem contradição de valores)
    """
    results: list[CriterionResult] = []

    # --- 1. Citação de fonte (CRÍTICO) ---
    citation_pattern = re.compile(r"\[.+?,\s*seção\s+\d+(\.\d+)*\]", re.IGNORECASE)
    has_citation = bool(citation_pattern.search(response))
    results.append(CriterionResult(
        name="Citação de fonte [NOME_DOC, seção X.X]",
        passed=has_citation,
        critical=True,
        detail="" if has_citation else "Nenhuma citação encontrada no formato esperado.",
    ))

    # --- 2. Ausência de termos proibidos (CRÍTICO) ---
    forbidden = ["não sei", "talvez", "provavelmente"]
    found_forbidden = [t for t in forbidden if t.lower() in response.lower()]
    results.append(CriterionResult(
        name="Ausência de termos proibidos",
        passed=not found_forbidden,
        critical=True,
        detail=f"Termos encontrados: {found_forbidden}" if found_forbidden else "",
    ))

    # --- 3. Resposta em português ---
    words = set(re.findall(r"\b\w+\b", response.lower()))
    pt_hits = words & PT_STOPWORDS
    is_portuguese = len(pt_hits) >= 3
    results.append(CriterionResult(
        name="Resposta em português",
        passed=is_portuguese,
        critical=False,
        detail="" if is_portuguese else f"Poucas stopwords pt-BR detectadas: {pt_hits}",
    ))

    # --- 4. Comprimento entre 50 e 500 palavras ---
    word_count = len(response.split())
    length_ok = 50 <= word_count <= 500
    results.append(CriterionResult(
        name="Comprimento (50–500 palavras)",
        passed=length_ok,
        critical=False,
        detail=f"{word_count} palavra(s).",
    ))

    # --- 5. Padrões esperados presentes na resposta ---
    for pattern in test_case.expected_patterns:
        found = pattern.lower() in response.lower()
        results.append(CriterionResult(
            name=f"Padrão esperado: '{pattern}'",
            passed=found,
            critical=False,
            detail="" if found else f"Padrão '{pattern}' não encontrado na resposta.",
        ))

    # --- 6. Fonte esperada citada ---
    source_cited = test_case.expected_source.lower() in response.lower()
    results.append(CriterionResult(
        name=f"Fonte esperada: '{test_case.expected_source}'",
        passed=source_cited,
        critical=False,
        detail="" if source_cited else f"Fonte '{test_case.expected_source}' não mencionada.",
    ))

    # --- 7. Groundedness numérica ---
    results.append(verify_groundedness(response, test_case))

    return results


def run_tests(
    test_cases: list[TestCase],
    system_prompt: str,
) -> list[TestResult]:
    """Executa todos os casos de teste e retorna os resultados."""
    results: list[TestResult] = []
    for i, case in enumerate(test_cases, start=1):
        print(f"\n{'='*60}")
        print(f"Caso {i}/{len(test_cases)}: {case.question}")
        print("="*60)

        try:
            response = get_llm_response(case.question, system_prompt, case.mock_response)
        except Exception as exc:  # noqa: BLE001
            print(f"  [ERRO] Falha ao obter resposta: {exc}")
            results.append(TestResult(
                test_case=case,
                response="",
                criteria=[
                    CriterionResult(
                        name="Comunicação com LLM",
                        passed=False,
                        critical=True,
                        detail=str(exc),
                    )
                ],
            ))
            continue

        criteria = verify_criteria(response, case)
        result = TestResult(test_case=case, response=response, criteria=criteria)
        results.append(result)

        print(f"\nResposta obtida:\n{response}\n")
        print("Critérios:")
        for c in criteria:
            status = "✔ PASS" if c.passed else "✘ FAIL"
            critical_tag = " [CRÍTICO]" if c.critical else ""
            detail = f" — {c.detail}" if c.detail else ""
            print(f"  {status}{critical_tag}  {c.name}{detail}")

        overall = "PASS" if result.passed else "FAIL"
        print(f"\nResultado do caso: {overall}")

    return results


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main() -> None:
    """Ponto de entrada: executa os testes e define o exit code."""
    if MOCK_MODE:
        print("[MODO MOCK] AZURE_OPENAI_API_KEY não encontrada — usando respostas pré-definidas.")

    results = run_tests(TEST_CASES, SYSTEM_PROMPT)

    print(f"\n{'='*60}")
    print("RESUMO FINAL")
    print("="*60)
    any_critical_failure = False
    for i, r in enumerate(results, start=1):
        overall = "PASS" if r.passed else "FAIL"
        print(f"  Caso {i}: {overall} — {r.test_case.question}")
        if r.critical_failed:
            any_critical_failure = True

    if any_critical_failure:
        print("\n[EXIT 1] Um ou mais critérios CRÍTICOS falharam.")
        sys.exit(1)
    else:
        print("\n[EXIT 0] Todos os critérios CRÍTICOS passaram.")
        sys.exit(0)


if __name__ == "__main__":
    main()
```

Estrutura entregue:

| Função | Responsabilidade |
|---|---|
| `get_llm_response()` | Chama o Azure OpenAI e retorna o texto |
| `verify_criteria()` | Aplica os 6 critérios e retorna `list[CriterionResult]` |
| `run_tests()` | Itera os casos, imprime relatório detalhado por critério |
| `main()` | Chama `run_tests()`, imprime resumo e define exit code |

Critérios implementados:
1. **[CRÍTICO]** Citação `[NOME_DOC, seção X.X]` via regex
2. **[CRÍTICO]** Ausência de `"não sei"`, `"talvez"`, `"provavelmente"`
3. Detecção de português por stopwords pt-BR (≥ 3 hits)
4. Comprimento 50–500 palavras
5. Padrões esperados por caso de teste
6. Fonte esperada mencionada na resposta

---

## Comunicações extras

---

**[Iteração 1]**

**Pergunta:** Crie mocks para quando não há chave azure.

**Resposta:**

Resumo do que foi incorporado:

**`MOCK_MODE`** — ativa automaticamente se `AZURE_OPENAI_API_KEY` não estiver definida, ou manualmente via `MOCK_MODE=1`.

**`mock_response`** em `TestCase` — cada caso carrega sua resposta simulada, com citação válida e padrões esperados embutidos, garantindo que os critérios passem no mock.

**`get_llm_response()`** — quando `MOCK_MODE=True`, retorna `mock_response` do caso sem fazer nenhuma chamada à API.

Mudanças estruturais aplicadas:
- Adição da constante `MOCK_MODE: bool` com lógica de auto-detecção
- Campo `mock_response: str = ""` no dataclass `TestCase`
- Cada `TestCase` em `TEST_CASES` ganhou uma `mock_response` realista com citação de fonte válida
- Assinatura de `get_llm_response()` atualizada para receber `mock_response: str = ""`
- Branch condicional `if MOCK_MODE: return mock_response` no início da função

Para rodar contra a API real:
```bash
$env:AZURE_OPENAI_API_KEY = "sua-chave"
python prompt_tester.py
```

---

**[Iteração 2]**

**Pergunta:** Adicione uma função que verifica se a resposta contradiz a fonte citada — groundedness básica por comparação de palavras-chave numéricas.

**Resposta:**

Adicionada a função `verify_groundedness()` e integrada como critério 7 em `verify_criteria()`.

**`verify_groundedness(response, test_case) -> CriterionResult`**

Lógica em 3 etapas:

1. Extrai do `expected_patterns` apenas os valores que contêm dígitos (`"2h"`, `"24h"`, `"1.8"`).
2. Para cada valor esperado, verifica se ele está presente no **corpo** da resposta (excluindo o trecho da citação `[...]`, para não confundir números de seção com valores factuais).
3. Detecta **rivais**: tokens com o mesmo sufixo de unidade (ex.: `h`, `%`, `x`) que aparecem na resposta mas **não** estão na lista de valores esperados — sinaliza como possível contradição.

---

**Correção de falso positivo detectada durante os testes:**

Na primeira execução, o Caso 2 (SLA Gold) gerou FAIL no critério de groundedness: `"2h"` e `"24h"` se detectavam mutuamente como rivais porque compartilham o sufixo `h`. A correção foi excluir todos os `expected_numeric` da lista de rivais (não apenas o próprio valor avaliado), usando `if m.group(0).lower() not in expected_numeric`.

Resultado final após correção — todos os 3 casos: **PASS** (exit code 0).
