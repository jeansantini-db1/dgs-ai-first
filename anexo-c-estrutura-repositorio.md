# Anexo C — Estrutura do Repositório NovaTech Assistant

> **Nota para o participante:** A estrutura abaixo representa o repositório **local** `novatech-assistant` no início da fase de estruturação. O prefixo `db1/` é apenas narrativo (na operação real a DB1 hospedaria na sua organização) — **nesta fase não há remoto, push, GitHub nem Azure**. Use o **Anexo D — Starter Repo**, que já vem com esta árvore, com `git init` feito e com as pastas de dados (`docs/novatech/` e `data/retrieval-corpus/`) semeadas a partir dos Anexos A e B. As pastas existem, mas a maioria dos arquivos ainda precisa ser criada — essa é a tarefa desta fase.

---

## Estrutura de diretórios

```
db1/novatech-assistant/
│
├── AGENTS.md                          # Constitution do projeto (a ser escrito nesta fase)
├── README.md                          # Visão geral do projeto
├── package.json                       # Dependências do projeto (TypeScript, Azure Functions)
├── tsconfig.json                      # Configuração TypeScript (strict: true)
├── vitest.config.ts                   # Configuração de testes
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Pipeline de CI (lint, test, build)
│       └── cd.yml                     # Pipeline de CD (deploy para staging/produção)
│
├── .mcp/
│   └── mcp.json                       # Configuração dos MCP servers do projeto (a ser criado)
│
├── docs/
│   ├── adr/                           # Architecture Decision Records
│   │   └── template.md                # Template para novos ADRs
│   ├── runbooks/                      # Runbooks operacionais
│   └── onboarding.md                  # Guia de onboarding para novos membros
│
├── specs/                             # Specs SDD (requirements, plans, tasks)
│   ├── pipeline-ingestao/
│   │   ├── requirements.md            # (a ser escrito pelo Product Specialist)
│   │   ├── plan.md                    # (a ser escrito pelo Tech Lead)
│   │   └── tasks.md                   # (a ser gerado pelo Dev com apoio de IA)
│   ├── query-endpoint/
│   │   ├── requirements.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── feedback-api/
│   │   ├── requirements.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── teams-bot/
│   │   ├── requirements.md
│   │   ├── plan.md
│   │   └── tasks.md
│   └── painel-web/
│       ├── requirements.md
│       ├── plan.md
│       └── tasks.md
│
├── prompts/                           # System prompts versionados
│   ├── system-prompt.md               # Prompt principal do assistente (versionado aqui)
│   ├── prompt-changelog.md            # Registro de mudanças no prompt
│   └── eval/                          # Dados para avaliação de prompts
│       ├── golden-queries.json        # Perguntas de referência + respostas esperadas
│       └── eval-results/              # Resultados das rodadas de avaliação
│
├── skills/                            # Skills do projeto (hierarquia Foundation → Domain → Artifact)
│   ├── foundation/
│   │   ├── typescript-conventions.md
│   │   ├── error-handling.md
│   │   └── project-structure.md
│   ├── domain/
│   │   ├── azure-functions-endpoint.md
│   │   ├── azure-ai-search-integration.md
│   │   ├── react-components.md
│   │   └── testing-patterns.md
│   └── artifact/
│       ├── create-rag-endpoint.md
│       ├── create-integration-test.md
│       └── create-react-card.md
│
├── src/                               # Código-fonte
│   ├── functions/                     # Azure Functions (endpoints)
│   │   ├── query/
│   │   │   ├── handler.ts             # HTTP trigger do query endpoint
│   │   │   ├── validator.ts           # Validação de input (Zod)
│   │   │   └── response-builder.ts    # Montagem da resposta com fonte
│   │   ├── feedback/
│   │   │   ├── handler.ts
│   │   │   └── validator.ts
│   │   └── health/
│   │       └── handler.ts             # Health check endpoint
│   │
│   ├── services/                      # Lógica de negócio
│   │   ├── search.ts                  # Integração com Azure AI Search
│   │   ├── completion.ts              # Integração com Azure OpenAI
│   │   ├── prompt-builder.ts          # Montagem do prompt com chunks + system prompt
│   │   └── response-validator.ts      # Validação determinística de respostas (harness)
│   │
│   ├── pipeline/                      # Pipeline de ingestão de documentos
│   │   ├── extractor.ts               # Extração de texto de PDFs/DOCX/HTML
│   │   ├── chunker.ts                 # Divisão em chunks com overlap
│   │   ├── embedder.ts                # Geração de embeddings
│   │   └── indexer.ts                 # Indexação no Azure AI Search
│   │
│   ├── bot/                           # Bot do Teams
│   │   ├── bot.ts                     # Lógica principal do bot
│   │   └── cards/                     # Adaptive Cards para respostas no Teams
│   │       ├── response-card.ts
│   │       └── feedback-card.ts
│   │
│   ├── web/                           # Painel web (React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── shared/                        # Código compartilhado
│       ├── types.ts                   # Tipos TypeScript do domínio
│       ├── config.ts                  # Configuração de ambiente
│       ├── logger.ts                  # Logger (pino)
│       └── errors.ts                  # Custom errors
│
├── tests/                             # Testes
│   ├── unit/                          # Testes unitários
│   ├── integration/                   # Testes de integração
│   ├── e2e/                           # Testes end-to-end
│   └── fixtures/                      # Dados de teste compartilhados
│       ├── chunks.ts                  # Chunks simulados para testes
│       ├── queries.ts                 # Perguntas de teste
│       └── expected-responses.ts      # Respostas esperadas
│
└── infra/                             # Infraestrutura como código
    ├── main.bicep                     # Definição principal (Azure)
    ├── modules/
    │   ├── ai-search.bicep
    │   ├── openai.bicep
    │   ├── functions.bicep
    │   └── cosmos.bicep
    └── parameters/
        ├── dev.bicepparam
        ├── staging.bicepparam
        └── prod.bicepparam
```

---

## Convenções de organização

### Specs (`/specs/`)
Cada módulo do projeto tem sua própria pasta com os 3 artefatos SDD:
- `requirements.md` — escrito pelo Product Specialist, aprovado pelo Tech Lead
- `plan.md` — escrito pelo Tech Lead, aprovado pelo Product Specialist e Dev Sênior
- `tasks.md` — gerado pelo Dev com apoio do Copilot, aprovado pelo Tech Lead

Nomenclatura: o nome da pasta é o slug do módulo (ex: `query-endpoint`, `pipeline-ingestao`).

### Skills (`/skills/`)
Organizadas em 3 níveis seguindo a hierarquia Foundation → Domain → Artifact. Cada skill é um arquivo `.md` independente. O nome do arquivo é o slug da skill (ex: `error-handling.md`).

### Prompts (`/prompts/`)
O system prompt principal vive em `/prompts/system-prompt.md` e é versionado via Git. Toda mudança no prompt deve ser registrada em `/prompts/prompt-changelog.md` com: data, autor, motivo da mudança, e resultado esperado.

### ADRs (`/docs/adr/`)
Nomenclatura: `NNNN-titulo-da-decisao.md` (ex: `0001-escolha-azure-openai.md`). Formato: Contexto, Decisão, Consequências, Alternativas Consideradas.

### Testes (`/tests/`)
- `unit/` — testes que não fazem chamadas externas (mocks para tudo)
- `integration/` — testes que usam mocks para APIs externas (msw) mas testam integração entre módulos internos
- `e2e/` — testes que exercitam o fluxo completo (usados com cautela — consomem tokens)
- `fixtures/` — dados compartilhados entre testes (chunks, queries, respostas esperadas)

---

## Estado atual do repositório (início da fase de estruturação)

| Artefato | Status |
|----------|--------|
| AGENTS.md | Vazio (a ser escrito) |
| Specs (5 módulos) | Pastas criadas, arquivos vazios |
| Skills | Pastas criadas, arquivos vazios |
| System prompt | Versão 1 básica do cenário 1 (a ser evoluída) |
| MCP config | Não criado |
| Código-fonte | Scaffold básico (Azure Functions configurado, nenhuma lógica implementada) |
| Testes | Nenhum |
| Infraestrutura | Definições Bicep presentes como **estado narrativo** — nenhum recurso Azure real é provisionado ou necessário nesta fase |
| CI/CD | Pipeline básico (lint + build) |

---

## Exemplo de configuração MCP (`.mcp/mcp.json`) — servers locais e gratuitos

> Todos os servers abaixo são *reference servers* mantidos pelo protocolo, rodam localmente via `npx`/`uvx` e **não dependem de nenhum serviço pago ou externo**. Eles cobrem as necessidades do projeto sem Azure, Confluence ou GitHub. Este é o formato esperado — o participante define os escopos no exercício Dev 2.1.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem",
               "./src", "./specs", "./skills", "./docs", "./data"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "."]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
  }
}
```

| Necessidade no projeto | Server | Aponta para |
|---|---|---|
| Ler/editar código, specs, skills | `filesystem` | `./src ./specs ./skills` |
| Ler documentação de negócio da NovaTech (era Confluence) | `filesystem` | `./docs/novatech/` (Anexo A) |
| "Recuperar" chunks (era Azure AI Search) | `filesystem` | `./data/retrieval-corpus/` (Anexo B) |
| Histórico, diff e branches do repo (era GitHub) | `git` | repositório local |
| Glossário/linguagem ubíqua e decisões persistentes | `memory` | grafo local |
| Explorar primitivas de MCP (tools/resources/prompts) | `everything` | — (aprendizado) |

**Nota:** os nomes de pacote e comandos (`npx @modelcontextprotocol/server-...`, `uvx mcp-server-...`) evoluem — confirme no README oficial do repositório `modelcontextprotocol/servers` antes de configurar. Ler a documentação do server antes de ligá-lo faz parte do exercício. O server de GitHub foi arquivado no upstream e exigiria conta/token externos; por isso o repositório é tratado localmente via `filesystem` + `git`.
