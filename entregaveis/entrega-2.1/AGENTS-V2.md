# AGENTS.md — NovaTech Assistant

> Constitution do projeto. Todo agente de IA (Copilot, Claude Code) lê este arquivo antes de gerar qualquer artefato.
> As seções abaixo são preenchidas por papéis diferentes nos exercícios do Cenário 2.

## Project Overview

O NovaTech Assistant é um assistente conversacional interno desenvolvido para atendentes de logística da NovaTech, que respondem perguntas sobre procedimentos, SLAs e regras de frete com base exclusivamente em documentos oficiais da empresa. A arquitetura é composta por quatro componentes principais: (1) pipeline de ingestão de documentos (extração, chunking, embedding e indexação via Azure AI Search), (2) API do assistente (Azure Functions + Azure AI Search + Azure OpenAI GPT-4o, padrão RAG), (3) bot do Microsoft Teams como interface conversacional para os atendentes, e (4) painel web React para dashboard de métricas e histórico de interações. A stack principal é TypeScript com Azure (OpenAI, AI Search, Functions) e Bicep para infraestrutura como código. **Antes de gerar qualquer artefato, leia as seções Coding Standards e Tech Stack abaixo. As regras aqui são contratos, não sugestões.**

## Tech Stack & Architecture

### Stack com versões

| Tecnologia | Versão | Uso |
|---|---|---|
| TypeScript | ^5.5.0 | Toda a base de código (`src/`, `tests/`) |
| Node.js / ESM | `"type": "module"` | Runtime — módulos ECMAScript nativos |
| Vitest | ^2.0.0 | Framework de testes (único permitido) |
| Zod | ^3.23.0 | Validação de schemas de entrada |
| Azure Functions | v4 (`app.http()`) | HTTP triggers — um por módulo |
| Azure OpenAI GPT-4o | — | LLM principal (128K tokens, data residency `brazilsouth`) |
| Azure OpenAI `text-embedding-3-large` | — | Embeddings (1.536 dimensões, suporte nativo a português) |
| Azure AI Search | — | Vector store com busca híbrida (vetorial + BM25) |
| React | — | Painel web (`src/web/`) |
| Bicep | — | Infraestrutura como código (`infra/`) |

**Configuração TypeScript (`tsconfig.json`):** `target` ES2022, `module` ESNext, `moduleResolution` Bundler, `strict: true` — não alterar.

### Mapa de diretórios

| Diretório | Responsabilidade |
|---|---|
| `src/functions/` | Azure Functions com HTTP triggers — um arquivo por módulo, sintaxe `app.http()` |
| `src/services/` | Lógica de negócio e integrações externas (inclui `prompt-builder.ts`) |
| `src/pipeline/` | Pipeline de ingestão: extractor, chunker, embedder, indexer |
| `src/bot/` | Bot do Microsoft Teams |
| `src/web/` | Painel web React (dashboard de métricas e histórico) |
| `src/shared/` | Código compartilhado: tipos globais, config, `logger.ts`, `errors.ts` |
| `specs/` | Artefatos SDD por módulo: requirements, plan, tasks |
| `prompts/` | System prompt versionado (`system-prompt.md`) |
| `skills/` | Skills do projeto organizadas em camadas (Foundation → Domain → Artifact) |
| `infra/modules/` | Módulos Bicep reutilizáveis |
| `infra/parameters/` | Parâmetros por ambiente (dev, staging, prod) |
| `docs/novatech/` | Documentos de negócio (substituto local do Confluence) |
| `data/retrieval-corpus/` | Chunks de referência para RAG (substituto local do Azure AI Search) |

### Gerenciamento de contexto (ADR-0002)

O `src/services/prompt-builder.ts` DEVE verificar o orçamento de contexto **antes** de cada chamada ao LLM. Ultrapassar esses limites é um **erro de runtime** — não uma degradação silenciosa.

| Componente | Limite | Responsável |
|---|---|---|
| System prompt | ~4.000 tokens | `prompts/system-prompt.md` |
| Chunks recuperados (top-5) | ~8.000 tokens | `src/services/prompt-builder.ts` |
| Pergunta + histórico (3 turnos) | orçamento restante | `src/services/prompt-builder.ts` |

- DEVE recuperar os chunks mais relevantes do Azure AI Search e enviar os top-5 ao LLM dentro do limite de ~8.000 tokens
- Cada chunk DEVE incluir os metadados de citação: `{ doc_id, versao, data_emissao, status_vigencia }`
- O histórico DEVE ser limitado a **3 turnos** — NUNCA usar `.max(10)` ou outro valor; o schema Zod DEVE ser: `history: z.array(...).max(3).default([])`

### Documentos contraditórios (ADR-0003)

Cada chunk indexado DEVE conter o metadado `status_vigencia` com um dos valores: `"ativa"` | `"supersedida"` | `"obsoleta-confirmada"`.

**Regras do pipeline de ingestão:**
- Entre versões do mesmo `doc_id`, a mais recente DEVE ser marcada automaticamente como `"ativa"`
- Documentos obsoletos NÃO DEVEM ser excluídos do índice — DEVEM ser movidos para o índice de auditoria com `status_vigencia: "obsoleta-confirmada"`

**Comportamento obrigatório ao detectar conflito:**
- Com versão ativa identificada: DEVE responder com a versão ativa e informar que existe versão anterior
- Sem versão ativa confirmada: DEVE apresentar ambas as versões explicitamente, indicar a mais recente como recomendação e sugerir confirmação com supervisor
- NUNCA escolher silenciosamente uma versão sem informar o atendente sobre o conflito

## Coding Standards (Tech Lead)

### TypeScript

- DEVE usar `strict: true` em todos os arquivos sob `src/` e `tests/` (configurado em `tsconfig.json` — não alterar)
- NUNCA usar o tipo `any` — SEMPRE usar `unknown` com type guard explícito
- NUNCA criar imports circulares entre módulos de `src/`

### Logging

- DEVE usar `pino` via `src/shared/logger.ts` para todos os registros de log em `src/`
- NUNCA usar `console.log`, `console.warn` ou `console.error` em qualquer arquivo sob `src/`

### Validação

- DEVE usar Zod para validar todos os inputs de HTTP triggers
- O schema Zod DEVE ser exportado como `InputSchema` **no mesmo arquivo do handler** (`src/functions/<modulo>/handler.ts`) — NUNCA em arquivo separado como `validator.ts`
- NUNCA adicionar campos ao `InputSchema` que não estejam definidos no `requirements.md` do módulo — não gerar campos especulativos (ex: `session_id`, `trace_id`, `client_id`)
- O campo `question` DEVE ter `.min(1).max(2000)` — o limite superior protege o context budget (ADR-0002)
- Exemplo obrigatório de estrutura:
  ```typescript
  // src/functions/query/handler.ts
  export const InputSchema = z.object({ ... });
  export async function queryHandler(...) { ... }
  app.http('query', { ... });
  ```

### Azure Functions

- DEVE usar Azure Functions v4 com sintaxe `app.http()`
- NUNCA usar sintaxe legada de `function.json`
- DEVE ter um arquivo por módulo em `src/functions/`
- O `authLevel` DEVE ser `'function'` em todos os endpoints — NUNCA usar `'anonymous'`

### Testes

- DEVE usar Vitest como framework de testes — NUNCA usar Jest
- DEVE usar a nomenclatura: `describe('NomeDoModulo', () => { it('should [comportamento] when [condição]') })`
- DEVE manter cobertura mínima de 80% de linhas (configurado em `vitest.config.ts` — não reduzir)
- Todo código novo em `src/` DEVE ter testes correspondentes em `tests/`

### Tratamento de erros

- DEVE usar `AppError` de `src/shared/errors.ts` para todos os erros de domínio
- NUNCA usar `throw` não tratado em HTTP handlers — SEMPRE capturar e retornar resposta de erro estruturada
- JSON inválido no body DEVE retornar `{ error: 'INVALID_JSON' }` com status 400 — NUNCA usar `.catch(() => null)` para engolir o erro silenciosamente; SEMPRE tratar com bloco `try/catch` separado antes do Zod
- O `invocationId` do `InvocationContext` DEVE ser usado como `requestId` em todos os logs do handler — NUNCA ignorar com `_context`

### Commits

- DEVE seguir Conventional Commits com escopo explícito: `feat(query):`, `fix(pipeline):`, `chore(infra):`
- Exemplos válidos: `feat(query): add context budget enforcement`, `fix(pipeline): handle missing status_vigencia metadata`

## Product Rules & Guardrails (Product Specialist)
<!-- TODO (Product Specialist — Ex. 2.3) -->

## Testing Standards (QA)
<!-- TODO (QA — Ex. 2.1) -->

## Project Management Rules (Delivery Manager)
<!-- TODO (Delivery Manager — Ex. 2.3) -->

## Build & Deploy

### Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm test` | Executa `vitest run` — roda todos os testes uma vez (sem watch mode) |
| `npm run lint` | Executa `eslint .` — valida estilo e regras estáticas em todo o projeto |
| `npm run build` | Executa `tsc -p .` — compila TypeScript para `dist/` conforme `tsconfig.json` |

### Pipeline CI (ordem obrigatória)

A ordem de execução DEVE ser:

```
lint → test → build
```

Falha em qualquer etapa DEVE bloquear o merge. Etapas subsequentes NÃO DEVEM ser executadas após uma falha.

### Branch strategy

- Feature branches DEVEM ser criadas localmente a partir de `main`
- "PR" neste projeto = arquivo `docs/pull-requests/PR-NNNN.md` contendo: objetivo, lista de mudanças e checklist de revisão
- Após revisão local, fazer merge direto em `main`
- NUNCA fazer push para remoto ou abrir PRs em GitHub/Azure DevOps neste ambiente

### Infraestrutura

- Módulos Bicep reutilizáveis DEVEM ficar em `infra/modules/`
- Parâmetros por ambiente DEVEM ficar em `infra/parameters/` (ex: `dev.parameters.json`, `prod.parameters.json`)

### Nota de ambiente

Esta fase **não usa** Azure provisionado, remoto ou CI/CD real. Todos os comandos (`npm test`, `npm run lint`, `npm run build`) são executados localmente. O MCP server `filesystem` aponta para `./src ./specs ./skills ./docs ./data` como substituto local dos serviços Azure.

---

## Histórico de Melhorias

> Registro empírico de regras adicionadas ou refinadas após ciclos de teste com o Copilot.
> Cada entrada documenta: o que foi observado na geração, qual regra foi adicionada/alterada, e em qual versão.
> Serve como evidência de que este documento é um artefato vivo — não foi escrito de uma vez.

```
v1 (inicial) → v2 (pós 3 ciclos de teste empírico)
```

### Tabela de evolução de regras

| # | Ciclo | Seção | Regra adicionada / refinada | Observação que gerou a mudança | Risco evitado |
|---|---|---|---|---|---|
| 1 | 1 | Validação | `InputSchema` DEVE estar no mesmo arquivo do handler — NUNCA em `validator.ts` separado | Copilot criou `validator.ts` separado e importou no handler; violou o contrato de localização sem sinalizar | Dev procura schema em `handler.ts` e não encontra; inconsistência entre módulos |
| 2 | 1 | Gerenciamento de contexto | `history` DEVE usar `.max(3)` — NUNCA `.max(10)` ou outro valor; schema Zod explícito | Copilot gerou `.max(10)` — o padrão "razoável" da internet para paginação, sem considerar o context budget da ADR-0002 | Janela de tokens excedida silenciosamente em produção |
| 3 | 2 | Validação | NUNCA adicionar campos ao `InputSchema` não definidos no `requirements.md` | Copilot adicionou `session_id: z.string().optional()` sem nenhuma spec que justificasse | Campos não documentados em produção; contrato de API não rastreável |
| 4 | 2 | Azure Functions | `authLevel` DEVE ser `'function'` — NUNCA `'anonymous'` | Copilot escolheu `authLevel: 'anonymous'` — o padrão mais permissivo para desenvolvimento local | Endpoint exposto sem autenticação no Azure em produção; vulnerabilidade de segurança real |
| 5 | 2 | Validação | `question` DEVE ter `.min(1).max(2000)` — o limite superior protege o context budget | Copilot gerou `z.string().min(1)` sem `.max(2000)`; o limite foi removido silenciosamente em relação à versão anterior | Input longo estoura o context budget da ADR-0002 sem erro explícito |
| 6 | 3 | Tratamento de erros | JSON inválido DEVE retornar `{ error: 'INVALID_JSON' }` com `try/catch` separado — NUNCA `.catch(() => null)` | Copilot usou `.catch(() => null)` para engolir o erro de parse; JSON inválido caía no Zod e retornava `VALIDATION_ERROR`, perdendo a distinção de código de erro | Erro de diagnóstico incorreto; cliente não consegue distinguir "JSON malformado" de "campo faltando" |
| 7 | 3 | Tratamento de erros | `invocationId` do `InvocationContext` DEVE ser usado como `requestId` em todos os logs | Copilot ignorou o `context` com prefixo `_context`, eliminando o `requestId` dos logs | Rastreabilidade de requisições perdida; impossível correlacionar logs de uma chamada específica |

### Gráfico de maturação

```
Ciclo         Desvios encontrados    Desvios acumulados corrigidos    Cobertura de testes
─────────────────────────────────────────────────────────────────────────────────────────
v1 (inicial)  —                      0 / 7                            13 testes
Ciclo 1       2 desvios              2 / 7                            15 testes
Ciclo 2       3 desvios              5 / 7                            19 testes
Ciclo 3       2 desvios              7 / 7 → v2 final ✅              19 testes
```

### Padrão observado

Os desvios seguiram uma progressão previsível de gravidade decrescente:

1. **Estruturais** (Ciclo 1): arquivo errado, limite numérico errado — visíveis imediatamente no code review
2. **Especulativos** (Ciclo 2): campos inventados, configuração de segurança permissiva — invisíveis sem checklist
3. **Sutis de contrato** (Ciclo 3): código de erro incorreto, observabilidade degradada — só aparecem em debug de produção

> **Lição registrada:** Regras vagas ("use Zod", "limite o histórico") são suficientes para o comportamento óbvio mas insuficientes para o comportamento correto. Cada desvio encontrado em teste é uma regra que faltava no documento.
