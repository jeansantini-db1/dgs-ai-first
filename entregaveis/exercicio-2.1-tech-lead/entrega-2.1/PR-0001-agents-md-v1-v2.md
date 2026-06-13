# PR-0001 — AGENTS.md: Construção e Validação Empírica (Exercício 2.1 — Tech Lead)

## Objetivo

Construir o `AGENTS.md` do repositório NovaTech Assistant e validar empiricamente sua eficácia usando o GitHub Copilot como agente de teste. O processo documenta o ciclo completo: escrita → geração → observação de desvios → refinamento.

## Artefatos deste PR

| Artefato | Arquivo | Descrição |
|---|---|---|
| AGENTS.md v1 | `AGENTS-V1.md` | Primeira versão — regras escritas, ainda não testadas |
| AGENTS.md v2 | `AGENTS-V2.md` | Versão refinada após ciclos de teste empírico |
| Código gerado com v1 | `v1/src/` + `v1/tests/` | Output do Copilot lendo o AGENTS-V1.md |
| Código gerado com v2 | `v2/src/` + `v2/tests/` | Output final compilado após os 3 ciclos de refinamento — todos os desvios corrigidos |

---

## 1. O que o Copilot seguiu com o AGENTS.md v1

As seguintes regras foram respeitadas na primeira geração, sem necessidade de ajuste:

| Regra | Evidência em `v1/src/functions/query/handler.ts` |
|---|---|
| Azure Functions v4 com `app.http()` | `app.http('query', { methods: ['POST'], ... })` — sem `function.json` |
| `logger` de `src/shared/logger.ts` (sem `console.log`) | `import { logger } from '../../shared/logger.js'` em todas as linhas de log |
| `AppError` de `src/shared/errors.ts` | Usado corretamente no bloco `catch` |
| Sem `any` no TypeScript | Tipagem explícita em todo o arquivo; `err` sem tipo explícito mas tratado com `instanceof` |
| `authLevel: 'function'` | Presente no registro `app.http()` |
| `invocationId` como `requestId` nos logs | `const requestId = context.invocationId` na linha 14 |
| JSON inválido retorna `INVALID_JSON` | Bloco `try/catch` separado antes do Zod, retornando `{ error: 'INVALID_JSON' }` |
| Vitest com `import from 'vitest'` | `import { describe, it, expect, vi, beforeEach } from 'vitest'` |
| Nomenclatura `should [behavior] when [condition]` | Todos os `it()` seguem o padrão no arquivo de teste |

---

## 2. Ciclo 1 — Desvios observados e correções aplicadas

### Desvio 1 — `InputSchema` em arquivo separado

**Regra no v1:** *"O schema Zod DEVE ser exportado como `InputSchema` no mesmo arquivo do handler correspondente"*

**O que o Copilot gerou:**

```typescript
// v1/src/functions/query/handler.ts — linha 8
import { InputSchema } from './validator.js'; // ← arquivo separado criado

// v1/src/functions/query/validator.ts — arquivo criado indevidamente
export const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z.array(ConversationTurnSchema).max(10).default([]),
});
```

**Por que aconteceu:** A regra dizia "no mesmo arquivo" mas não dizia "NUNCA em arquivo separado" nem mostrava a estrutura de arquivo esperada. O Copilot escolheu o padrão de separação de responsabilidades que é mais comum na internet.

**Risco:** Dev que procura o schema em `handler.ts` não encontra; inconsistência entre módulos do projeto.

---

### Desvio 2 — `history.max(10)` em vez de `.max(3)`

**Regra no v1:** *"O histórico DEVE ser limitado a 3 turnos"*

**O que o Copilot gerou:**

```typescript
// v1/src/functions/query/validator.ts — linha 9
history: z.array(ConversationTurnSchema).max(10).default([]),
//                                        ^^^^ deveria ser .max(3)
```

**Por que aconteceu:** A regra mencionava "3 turnos" em texto, mas não especificava o valor no schema Zod. O Copilot usou `.max(10)` — o padrão "razoável" para paginação na internet — sem considerar que o limite deriva do context budget da ADR-0002.

**Risco:** Histórico de 10 turnos pode exceder o context budget (~8K tokens para chunks + pergunta + histórico), causando erro silencioso em produção.

---

## 3. Ciclo 1 — Resultado das correções

### Correção do Desvio 1 — `InputSchema` no mesmo arquivo

**Regra adicionada no v2:**
```markdown
- O schema Zod DEVE ser exportado como `InputSchema` **no mesmo arquivo do handler**
  (`src/functions/<modulo>/handler.ts`) — NUNCA em arquivo separado como `validator.ts`
- NUNCA adicionar campos ao `InputSchema` que não estejam definidos no `requirements.md`
- Exemplo obrigatório de estrutura:
  // src/functions/query/handler.ts
  export const InputSchema = z.object({ ... });
  export async function queryHandler(...) { ... }
  app.http('query', { ... });
```

**O que o Copilot gerou com v2:**

```typescript
// v2/src/functions/query/handler.ts — linha 9 (sem validator.ts separado)
export const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(3)       // ← corrigido
    .default([]),
});
```

O arquivo `v2/src/functions/query/validator.ts` existe mas está **vazio** — o Copilot criou o arquivo mas não colocou nada nele, colocando o schema no handler corretamente.

### Correção do Desvio 2 — `history.max(3)`

**Regra adicionada no v2:**
```markdown
- O histórico DEVE ser limitado a **3 turnos** — NUNCA usar `.max(10)` ou outro valor;
  o schema Zod DEVE ser: `history: z.array(...).max(3).default([])`
```

**Resultado:** `history.max(3)` presente em `v2/src/functions/query/handler.ts` linha 17. ✅

### Impacto cascata nos testes

A migração do `InputSchema` para o `handler.ts` propagou mudanças para `v2/tests/unit/query-handler.test.ts`:

| Aspecto | v1 | v2 |
|---|---|---|
| Import do schema | Não importa — schema estava em `validator.ts` | `import { queryHandler, InputSchema } from '../../src/functions/query/handler.js'` |
| Import de tipos | `Chunk, ConversationTurn` | `RetrievedChunk, ConflictInfo` (tipos refinados) |
| `detectConflicts` mockado | Ausente — função não existia na v1 | `vi.mock('prompt-builder.js', () => ({ buildPrompt, detectConflicts }))` |
| Bloco dedicado ao schema | Ausente | `describe('InputSchema')` com 7 casos cobrindo limites de entrada |

O caso mais relevante adicionado no v2:

```typescript
it('should reject history with more than 3 turns', () => {
  const result = InputSchema.safeParse({
    question: 'Qual o prazo?',
    history: Array(4).fill({ role: 'user', content: 'msg' }),
  });
  expect(result.success).toBe(false);
});
```

Esse teste só existe porque o schema migrou para o `handler.ts` — o que permite importar e testar `InputSchema` diretamente, sem depender do handler completo.

---

## 4. Ciclo 2 — Desvios observados e correções aplicadas

### Desvio 3 — Campos especulativos no `InputSchema`

**Regra no AGENTS.md antes do ciclo:** *"— DEVE usar Zod para validar todos os inputs de HTTP triggers"* — sem restrição explícita a campos definidos em `requirements.md`.

**O que o Copilot gerou:**

```typescript
export const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  session_id: z.string().optional(),       // ← não definido em nenhum requirements.md
  trace_id: z.string().uuid().optional(),  // ← idem
  history: z.array(...).max(3).default([]),
});
```

**Por que aconteceu:** O Copilot "completou" o schema com campos plausíveis para uma API de chat. Sem restrição explícita, adicionou campos que fazem sentido em sistemas similares na internet — mas nenhum estava especificado no projeto.

**Risco:** Campos não documentados entram em produção sem contrato; o cliente começa a depender de campos que o servidor ignora ou remove em próxima versão.

**Correção adicionada ao AGENTS.md:**

```markdown
- NUNCA adicionar campos ao `InputSchema` que não estejam definidos no `requirements.md` do módulo — não gerar campos especulativos (ex: `session_id`, `trace_id`, `client_id`)
```

---

### Desvio 4 — `authLevel: 'anonymous'`

**Regra no AGENTS.md antes do ciclo:** *"DEVE usar Azure Functions v4 com sintaxe `app.http()`"* — sem especificar o valor de `authLevel`.

**O que o Copilot gerou:**

```typescript
app.http('query', {
  methods: ['POST'],
  authLevel: 'anonymous', // ← padrão para desenvolvimento local
  handler: queryHandler,
});
```

**Por que aconteceu:** `'anonymous'` evita configuração de chave de API em ambiente local — é a escolha mais cômoda para desenvolvimento. O AGENTS.md não explicitava o valor correto.

**Risco:** Endpoint exposto sem autenticação no Azure em produção. O Azure Functions honra o `authLevel` do código quando não sobreposto por política explícita — vulnerabilidade de segurança real.

**Correção adicionada ao AGENTS.md:**

```markdown
- O `authLevel` DEVE ser `'function'` em todos os endpoints — NUNCA usar `'anonymous'`
```

**Nota de rastreabilidade:** O output intermediário com `authLevel: 'anonymous'` foi capturado como snippet acima no momento da observação. O código em `v2/` representa o estado compilado após todos os ciclos e já exibe `'function'` corretamente.

---

### Desvio 5 — `question` sem `.max(2000)`

**Regra no AGENTS.md antes do ciclo:** *"O campo `question` DEVE ter `.min(1)`"* — sem mencionar limite superior.

**O que o Copilot gerou:**

```typescript
question: z.string().min(1),  // ← sem .max(2000)
```

**Por que aconteceu:** A regra mencionava apenas `.min(1)`; o limite superior foi omitido silenciosamente.

**Risco:** Input longo estoura o context budget da ADR-0002 sem erro explícito — o handler aceita a requisição e a falha ocorre no `prompt-builder.ts` em runtime.

**Correção adicionada ao AGENTS.md:**

```markdown
- O campo `question` DEVE ter `.min(1).max(2000)` — o limite superior protege o context budget (ADR-0002)
```

---

## 5. Ciclo 3 — Desvios observados e correções aplicadas

### Desvio 6 — JSON inválido engolido com `.catch(() => null)`

**Regra no AGENTS.md antes do ciclo:** *"NUNCA usar `throw` não tratado em HTTP handlers"* — sem especificar o mecanismo correto de parse.

**O que o Copilot gerou:**

```typescript
const rawBody: unknown = await request.json().catch(() => null); // ← engole o erro
const parsed = InputSchema.safeParse(rawBody);
// null passa pelo Zod como VALIDATION_ERROR genérico
```

**Por que aconteceu:** `.catch(() => null)` é elegante sintaticamente e satisfaz a regra de "não usar `throw` não tratado". O Copilot escolheu essa forma sem perceber que elimina a distinção de código de erro.

**Risco:** JSON malformado retorna `VALIDATION_ERROR` (do Zod ao receber `null`) em vez de `INVALID_JSON` — o cliente não consegue distinguir "corpo malformado" de "campo faltando".

**Correção adicionada ao AGENTS.md:**

```markdown
- JSON inválido no body DEVE retornar `{ error: 'INVALID_JSON' }` com status 400 — NUNCA usar `.catch(() => null)` para engolir o erro silenciosamente; SEMPRE tratar com bloco `try/catch` separado antes do Zod
```

---

### Desvio 7 — `_context`: `invocationId` perdido

**Regra adicionada ao AGENTS.md após este ciclo:** *"O `invocationId` do `InvocationContext` DEVE ser usado como `requestId` em todos os logs do handler".*

**O que o Copilot gerou na geração intermediária (capturado no ciclo):**

```typescript
export async function queryHandler(
  request: HttpRequest,
  _context: InvocationContext, // ← underscore: variável não utilizada
): Promise<HttpResponseInit> {
  // logger.info sem requestId — rastreabilidade perdida
```

**Por que aconteceu:** O Copilot adicionou o prefixo underscore ao `context` por convenção TypeScript de "parâmetro não usado". Sem instrução explícita sobre o uso do `invocationId`, o parâmetro foi silenciado automaticamente.

**Risco:** Impossível correlacionar logs de uma chamada específica em produção; debugging de erros intermitentes perde rastreabilidade por requisição.

**Correção adicionada ao AGENTS.md:**

```markdown
- O `invocationId` do `InvocationContext` DEVE ser usado como `requestId` em todos os logs do handler — NUNCA ignorar com `_context`
```

**Validação — resultado em `v2/src/functions/query/handler.ts`:**

```typescript
export async function queryHandler(
  request: HttpRequest,
  context: InvocationContext, // ← sem underscore
): Promise<HttpResponseInit> {
  const requestId = context.invocationId; // ← usado em todos os ramos de saída
```

O `requestId` aparece em todos os ramos de saída (happy path, `INVALID_JSON`, `AppError`, erro inesperado). Validado em `v2/tests/unit/query-handler.test.ts` no bloco `describe('observability — invocationId as requestId')` com 3 casos que verificam `expect.objectContaining({ requestId: '...' })` por cenário.

---

## 5b. Ciclo 3 — Resultado das correções

### Correção do Desvio 6 — `INVALID_JSON` distinto de `VALIDATION_ERROR`

**O que o código final em `v2/src/functions/query/handler.ts` exibe:**

```typescript
let rawBody: unknown;
try {
  rawBody = await request.json();
} catch {
  logger.warn({ requestId }, 'Invalid JSON in request body');
  return {
    status: 400,
    jsonBody: { error: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
  };
}

const parsed = InputSchema.safeParse(rawBody);
if (!parsed.success) {
  return {
    status: 400,
    jsonBody: { error: 'VALIDATION_ERROR', details: parsed.error.issues },
  };
}
```

Validado em `v2/tests/unit/query-handler.test.ts` no bloco `describe('error code distinction — INVALID_JSON vs VALIDATION_ERROR')` com 3 casos que verificam tanto o código correto quanto a ausência do código errado em cada cenário.

### Comparação v1 vs v2 — Desvios 6 e 7

| Aspecto | v1/handler.ts | v2/handler.ts (estado final) |
|---|---|---|
| Parse do JSON | `try/catch` separado (✅ já correto na v1) | `try/catch` separado |
| Código de erro JSON inválido | `INVALID_JSON` | `INVALID_JSON` |
| Parâmetro `context` | `context: InvocationContext` (✅ já correto) | `context: InvocationContext` |
| `requestId` nos logs | `context.invocationId` em todos os ramos | `context.invocationId` em todos os ramos |
| Testes de observabilidade | Nenhum bloco dedicado | 3 casos em `describe('observability')` |
| Testes de distinção de código de erro | Nenhum bloco dedicado | 3 casos em `describe('error code distinction')` |

> **Nota:** Os Desvios 6 e 7 foram introduzidos pelo Copilot em gerações intermediárias dos Ciclos 2–3, capturados como snippets acima. A pasta `v1/` não os exibia porque foi gerada com uma sequência de prompt diferente. A `v2/` é o estado final compilado, com todas as correções aplicadas.

---

## 6. Limitações reconhecidas — o que o AGENTS.md não controlou

Nem tudo é controlável via `AGENTS.md`. Os itens abaixo foram observados e **não foram corrigidos** intencionalmente — representam o limite natural do instrumento:

| Comportamento | Por que não foi corrigido |
|---|---|
| `validator.ts` criado vazio no v2 | O Copilot cria o arquivo como "rascunho" mesmo sem conteúdo. Não causa bug, mas gera ruído no repositório. Mitigação via `.gitignore` ou convenção de time, não via AGENTS.md |
| System prompt hardcoded como string no handler | O AGENTS.md define que o system prompt fica em `prompts/system-prompt.md`, mas o Copilot não carregou o arquivo automaticamente. Requer instrução explícita no prompt da tarefa, não no AGENTS.md |

> **Conclusão:** O AGENTS.md é eficaz para regras estruturais e de segurança (onde colocar o schema, qual authLevel usar, qual limite numérico). É menos eficaz para comportamentos que dependem de contexto de runtime (carregar arquivos externos, usar variáveis de contexto específicas). Esses casos precisam de skills ou instruções de tarefa complementares.

---

## Checklist de revisão

- [x] AGENTS.md v1 presente e rastreável (`AGENTS-V1.md`)
- [x] AGENTS.md v2 presente com histórico de melhorias embutido (`AGENTS-V2.md`)
- [x] Evidência de geração com v1 (`v1/src/`, `v1/tests/`)
- [x] Evidência de geração com v2 (`v2/src/`, `v2/tests/`) — estado final compilado após todos os ciclos
- [x] 3 ciclos de refinamento documentados (7 desvios no total)
- [x] Desvios documentados com trechos de código reais (Ciclos 1–3)
- [x] Comparativo antes/depois com as correções exatas (Ciclos 1 e 3)
- [x] Desvio 7 (`_context` / `invocationId`) validado no código final e coberto por testes de observabilidade
- [x] Limitações reconhecidas — nem tudo será seguido (critério explícito do exercício)
