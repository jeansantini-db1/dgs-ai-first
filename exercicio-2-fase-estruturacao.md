# Cenário-Âncora 2 — Fase de Estruturação do Trabalho

## Tópicos cobertos
- MCP (Model Context Protocol)
- Recorte de Domínio e Spec Driven Development (SDD)
- AGENTS.md
- Skills

## Ferramentas disponíveis para os participantes
- **Claude** (chat) — todos os papéis
- **GitHub Copilot** — desenvolvedores e Tech Lead
- **Claude Cowork** — Delivery Manager, Product Specialist, QA
- **Claude Design** — Product Specialist

## Documentos de apoio
- **Anexo A — Documentação Simulada da NovaTech:** Conteúdo completo dos 5 documentos-chave. Usar como referência para guardrails, glossário de domínio, e dados de teste.
- **Anexo B — Chunks de Referência do Pipeline de RAG:** Chunks extraídos e mapa de cobertura. Usar nos exercícios que pedem dados de teste realistas.
- **Anexo C — Estrutura do Repositório:** Mapa de diretórios do `db1/novatech-assistant` no início desta fase, com convenções de organização e exemplo de configuração MCP.

---

## O Cenário (continuação)

O projeto NovaTech foi aprovado. O discovery está concluído e a fase de entendimento produziu artefatos concretos: ADRs com decisões arquiteturais (modelo LLM, estratégia de contexto, tratamento de documentos contraditórios, build vs buy), uma spec de requisitos de produto para o pipeline de RAG, um protótipo funcional de RAG com ferramentas open-source, cenários de falha mapeados pelo QA, e um plano de testes inicial. Agora o time precisa estruturar o ambiente, os padrões e os artefatos que vão governar o desenvolvimento.

### O que foi definido na fase anterior (cenário 1)

- **Modelo LLM:** Azure OpenAI (GPT-4o) — escolhido pela integração com o ecossistema Microsoft da NovaTech e pela janela de 128K tokens (ADR-0001).
- **Pipeline de RAG:** Azure AI Search + Azure OpenAI. O protótipo open-source (ChromaDB + sentence-transformers) validou a abordagem e identificou problemas de chunking em tabelas (ADR-0004).
- **Estratégia de contexto:** Context budget de ~4K tokens para system prompt + ~8K para chunks (5 chunks de ~1.500 tokens) + pergunta + histórico limitado a 3 turnos (ADR-0002).
- **Documentos contraditórios:** Metadado de vigência no pipeline; prompt instrui o modelo a priorizar versão mais recente; documentos obsoletos marcados, não excluídos (ADR-0003).
- **Integração:** Microsoft Teams (bot) + painel web interno.
- **Base documental:** das ~1.250 fontes brutas do cenário 1 (SharePoint, Confluence e planilhas), após deduplicação e limpeza no discovery restaram 847 documentos válidos consolidados (12 deles com contradições pendentes de resolução pelo Compliance da NovaTech); 63 foram descartados por obsolescência e ~340 eliminados como duplicatas ou redundâncias.
- **Arquitetura:** 4 componentes — (1) pipeline de ingestão, (2) API do assistente (Azure Functions + Azure AI Search + Azure OpenAI), (3) interface no Teams via Bot Framework, e (4) painel web interno (dashboard de métricas e histórico).
- **Stack:** TypeScript (backend e bot), React (painel web), Bicep para infraestrutura como código.
- **Repositório:** `novatech-assistant` (o prefixo `db1/` é narrativo). Nesta fase é trabalhado como repositório Git **local** — ver Anexo D (Starter Repo); não há remoto nem GitHub necessários.
- **Time:** 1 Tech Lead, 2 Desenvolvedores (1 pleno, 1 sênior), 1 QA, 1 Product Specialist, 1 Delivery Manager.

### O desafio desta fase

Antes de escrever a primeira linha de código de produção, o time precisa:
1. Definir como agentes de IA (Copilot, Claude Code) serão usados no desenvolvimento — regras, limites, padrões.
2. Recortar o domínio do projeto (bounded contexts, linguagem ubíqua) e especificar o que será construído usando Spec Driven Development.
3. Configurar as conexões que os agentes precisam para operar (MCP servers para acessar repositório, docs, Azure).
4. Criar skills reutilizáveis que encapsulam os padrões do projeto para geração consistente de código e artefatos.

---

## Exercícios por Papel

---

### DELIVERY MANAGER

#### Exercício 2.1 — Definição do workflow de desenvolvimento AI First

**Contexto:** Você precisa definir como o time vai trabalhar no modelo AI First: quais ferramentas cada papel usa, qual o fluxo de trabalho, e quais são os checkpoints humanos (validation gates).

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo acima.
- Uma lista das ferramentas disponíveis no projeto:
  - GitHub Copilot (ativo para todos os devs e Tech Lead)
  - Claude (disponível para todo o time)
  - Claude Cowork (disponível para papéis não-dev)
  - Claude Design (disponível para Product Specialist)
  - Azure DevOps para boards e tracking
  - GitHub para repositório e CI/CD

**Tarefa:**
1. Usando o **Claude**, elabore um fluxo de trabalho que mapeie, para cada papel do time, quais ferramentas de IA usa e em qual etapa do ciclo (Spec → Plan → Tasks → Implement → Review → Deploy).

2. Usando o **Claude Cowork**, crie um template de checklist de validation gates — pontos onde um humano obrigatoriamente revisa e aprova antes de avançar. O checklist deve incluir ao menos:
   - Gate entre Spec e Plan (quem aprova a spec antes de gerar o plano?)
   - Gate entre Tasks geradas por IA e início de implementação (quem valida que as tasks fazem sentido?)
   - Gate entre código gerado por agente e merge (quem faz code review?)
   - Gate entre testes gerados por IA e deploy (quem valida que os testes são suficientes?)

3. Para cada gate, defina: quem aprova, o que verifica, quanto tempo tem, e o que acontece se reprovar.

**Entregável:** O fluxo de trabalho, o checklist de validation gates gerado pelo Cowork, e evidência do uso das ferramentas.

**Critérios de avaliação:**
- O fluxo reconhece que diferentes papéis usam diferentes ferramentas (Copilot para devs, Cowork para gestão, Design para produto).
- Os validation gates são específicos o suficiente para serem executáveis (não são genéricos como "revisar antes de continuar").
- O checklist inclui critérios concretos de aprovação para cada gate (ex: "a spec deve ter critérios de aceite verificáveis para cada requisito").
- O fluxo equilibra velocidade (IA gera) com segurança (humano valida).

---

#### Exercício 2.2 — Governança de specs no modelo SDD

**Contexto:** O time vai usar Spec Driven Development. Specs não são documentos passivos — são contratos executáveis. Você precisa definir como specs são criadas, aprovadas, versionadas e rastreadas.

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- A estrutura do repositório do projeto (ver **Anexo C**) — as specs devem seguir a organização de diretórios definida.
- O fluxo SDD simplificado: *"requirements.md define o que precisa ser feito. plan.md define como será feito. tasks.md decompõe em unidades atômicas executáveis por agentes. Cada transição (requirements → plan → tasks) é um checkpoint humano."*
- Uma lista dos módulos do projeto que precisarão de specs:
  1. Pipeline de ingestão de documentos
  2. API de busca (query endpoint)
  3. API de feedback (atendente reporta resposta incorreta)
  4. Bot do Teams (interface conversacional)
  5. Painel web (dashboard de métricas e histórico)

**Tarefa:**
1. Usando o **Claude**, defina um processo de governança de specs que cubra: quem cria cada tipo de spec (requirements pelo Product Specialist, plan pelo Tech Lead, tasks pelo Dev com apoio do Copilot), como as specs são nomeadas e versionadas, onde ficam no repositório, e como mudanças são rastreadas.

2. Usando o **Claude Cowork**, crie um board de tracking (template de kanban ou tabela) que permita acompanhar o status de cada spec: Rascunho → Em Revisão → Aprovada → Em Implementação → Validada. Inclua os 5 módulos como itens iniciais.

3. Defina o que acontece quando uma spec precisa mudar depois de já estar em implementação (change management).

**Entregável:** O documento de governança, o board de tracking gerado pelo Cowork, e o processo de change management.

**Critérios de avaliação:**
- O processo reconhece que specs são artefatos vivos que evoluem (não são documentos estáticos escritos uma vez).
- O board é prático e permite que qualquer membro do time veja o status atual de cada spec.
- O processo de change management é explícito sobre quem pode alterar, quem precisa aprovar, e como isso afeta tasks já em andamento.
- A atribuição de responsabilidades por papel é coerente com as competências de cada um.

---

#### Exercício 2.3 — Participação na construção do AGENTS.md do projeto

**Contexto:** O Tech Lead está montando o AGENTS.md do repositório e pediu que cada papel contribua com a seção que lhe diz respeito.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- A estrutura do repositório (ver **Anexo C**).
- A estrutura do AGENTS.md proposta pelo Tech Lead:
  ```
  # AGENTS.md — NovaTech Assistant
  ## Project Overview
  ## Tech Stack & Architecture
  ## Coding Standards (Tech Lead)
  ## Product Rules & Guardrails (Product Specialist)
  ## Testing Standards (QA)
  ## Project Management Rules (Delivery Manager)
  ## Build & Deploy
  ```
- Validation gates simulados (output do exercício 2.1 — fornecidos para que este exercício seja autossuficiente):
  ```
  Gate 1 — Spec → Plan: PS aprova requirements.md antes do TL gerar o plan.
  Gate 2 — Tasks → Implement: TL aprova tasks.md antes do Dev iniciar.
  Gate 3 — Code → Merge: TL faz code review; PR precisa de 1 approval.
  Gate 4 — Tests → Deploy: QA valida cobertura e cenários; TL aprova deploy.
  ```

**Tarefa:**
Usando o **Claude** e referenciando o **Anexo C** para caminhos corretos, escreva a seção **"Project Management Rules"** do AGENTS.md. Esta seção será lida por agentes de IA quando gerarem artefatos de gestão, tasks, ou documentação. Ela deve conter:

1. Regras de nomenclatura de tasks e issues (ex: formato do título, labels obrigatórias).
2. Regras de documentação de decisões (ex: toda decisão técnica ou de escopo deve ser registrada como ADR em `/docs/adr/`).
3. Definição dos validation gates em formato consumível por agentes.
4. Restrições de comunicação que afetam geração de artefatos (ex: "documentos de status devem ser em português, código e comments em inglês").

**Entregável:** A seção do AGENTS.md pronta para ser adicionada ao repositório, com evidência do uso do Claude.

**Critérios de avaliação:**
- A seção é machine-readable (um agente de IA consegue parseá-la e seguir as instruções).
- As regras são prescritivas, não descritivas (dizem o que fazer, não o que é).
- As regras são consistentes com os validation gates fornecidos.
- A seção não é genérica — contém referências específicas ao projeto NovaTech.

---

### PRODUCT SPECIALIST

#### Exercício 2.1 — Recorte de domínio e spec de produto no formato SDD

**Contexto:** Antes de escrever a spec, você precisa recortar o domínio: quais são os bounded contexts do projeto, qual a linguagem ubíqua do domínio de logística que o time (e os agentes) devem usar, e quais são as fronteiras do que o assistente faz e não faz. Depois, você escreve a spec de requisitos do módulo principal usando SDD.

**Ferramentas a utilizar:** Claude (chat) + Claude Design

**Inputs fornecidos:**
- O cenário completo.
- A documentação da NovaTech (ver **Anexo A**) — use para extrair os termos do domínio e identificar os bounded contexts.
- A spec de requisitos de RAG escrita na fase anterior (simulada): *"O assistente responde perguntas sobre SLAs, frete e devoluções. Fontes contraditórias devem mostrar ambas as versões. O assistente nunca inventa informações. Toda resposta cita fonte. Atualização em até 24h."*
- O fluxo SDD: *"requirements.md contém: outcomes, scope boundaries, constraints, prior decisions, verification criteria."*
- Dados do discovery: *"As perguntas mais frequentes caem em 4 categorias: prazos de entrega, regras de frete, política de devolução e SLAs. Em 15% dos casos, a pergunta cruza duas categorias. Os atendentes precisam da resposta em menos de 30 segundos."*
- Conceito de recorte de domínio: *"Bounded contexts definem fronteiras claras entre subdomínios. Linguagem ubíqua é o vocabulário compartilhado que todo membro do time (e todo agente) usa da mesma forma. Para IA, recorte de domínio é especialmente importante porque agentes sem domínio claro geram outputs genéricos."*

**Tarefa:**
1. Usando o **Claude**, faça o recorte de domínio do projeto:
   - Identifique os bounded contexts do assistente NovaTech (ex: "Atendimento ao Cliente", "Gestão Documental", "SLAs e Contratos", "Logística de Frete"). Para cada contexto, defina: o que está dentro, o que está fora, e como se relaciona com os outros.
   - Extraia a linguagem ubíqua do domínio a partir do Anexo A: termos que precisam ser usados de forma consistente por humanos e agentes (ex: "carga perigosa" sempre significa "classes 1-6 da ANTT", "frete especial" sempre significa "acima de 500kg").

2. Usando o **Claude**, escreva o `requirements.md` do query endpoint seguindo a estrutura SDD. As prior decisions devem referenciar as ADRs da fase anterior (simuladas no contexto). Os scope boundaries devem derivar dos bounded contexts definidos acima.

3. Usando o **Claude Design**, crie um mockup da interface de resposta no Teams, coerente com os requirements.

4. Itere: peça ao Claude que atue como Tech Lead e aponte ambiguidades. Ajuste.

**Entregável:** O mapa de bounded contexts com linguagem ubíqua, o requirements.md, o mockup, e o histórico de iteração.

**Critérios de avaliação:**
- Os bounded contexts são coerentes com o domínio de logística (não são divisões técnicas como "frontend/backend").
- A linguagem ubíqua contém termos que um LLM confundiria sem definição explícita (ex: "Gold" é um tier de cliente, não o metal).
- Os outcomes no requirements.md são orientados a resultado do usuário, não a features técnicas.
- Os scope boundaries derivam dos bounded contexts (ex: "este módulo cobre o contexto 'Atendimento ao Cliente' — não cobre 'Gestão Documental' diretamente").
- Os verification criteria são testáveis pelo QA.

---

#### Exercício 2.2 — Definição de guardrails como artefato de produto

**Contexto:** Na fase anterior, você identificou guardrails informais. Agora você precisa formalizá-los como um artefato estruturado consumível por humanos e agentes.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- A documentação da NovaTech (ver **Anexo A**) como fonte de verdade para os guardrails.
- Os guardrails informais do cenário 1: *"(1) Sempre citar fonte. (2) Nunca inventar prazos ou valores. (3) Quando não encontrar resposta, dizer explicitamente. (4) Responder em português formal."*
- 3 incidentes simulados onde o assistente falhou durante testes internos:
  1. *"O assistente respondeu que o prazo de devolução para carga perigosa é 7 dias, quando na verdade cargas perigosas NÃO podem ser devolvidas."*
  2. *"O assistente citou 'PROC-042, seção 2' mas os multiplicadores informados eram da versão 1 (desatualizada), não da v2 (vigente)."*
  3. *"O assistente disse 'Não encontrei informação sobre isso' para uma pergunta sobre SLA Gold, mas o documento SLA-2024 estava indexado e continha a resposta."*

**Tarefa:**
1. Usando o **Claude**, elabore um documento de guardrails organizado em:
   - **DEVE** (comportamentos obrigatórios).
   - **NÃO DEVE** (comportamentos proibidos).
   - **QUANDO EM DÚVIDA** (comportamentos de fallback).

2. Para cada guardrail, classifique como: enforcement via prompt (probabilístico) ou enforcement via código (determinístico). Justifique.

3. Conecte cada guardrail a ao menos um dos 3 incidentes (qual incidente esse guardrail previne?).

**Entregável:** O documento de guardrails completo, com classificação de enforcement e rastreabilidade aos incidentes.

**Critérios de avaliação:**
- Os guardrails são específicos ao domínio da NovaTech, não genéricos.
- A classificação prompt vs código demonstra compreensão de que prompts são probabilísticos e código é determinístico.
- Cada guardrail é rastreável a um risco concreto (incidente).

---

#### Exercício 2.3 — Participação na construção do AGENTS.md do projeto

**Contexto:** O Tech Lead está montando o AGENTS.md e pediu que cada papel contribua com sua seção.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- A documentação da NovaTech (ver **Anexo A**) e a estrutura do repositório (ver **Anexo C**).
- A estrutura do AGENTS.md proposta pelo Tech Lead:
  ```
  # AGENTS.md — NovaTech Assistant
  ## Project Overview
  ## Tech Stack & Architecture
  ## Coding Standards (Tech Lead)
  ## Product Rules & Guardrails (Product Specialist)
  ## Testing Standards (QA)
  ## Project Management Rules (Delivery Manager)
  ## Build & Deploy
  ```
- Guardrails formalizados simulados (output do exercício 2.2 — fornecidos para que este exercício seja autossuficiente):
  ```
  DEVE:
  - Citar fonte com identificador do documento e seção em toda resposta.
  - Incluir campo source_document no JSON de retorno, mesmo com confiança baixa.
  - Responder em português formal.
  
  NÃO DEVE:
  - Gerar valores numéricos (prazos, multiplicadores, SLAs) que não estejam
    literalmente na documentação indexada.
  - Afirmar que carga perigosa (classes 1-6 ANTT) pode ser devolvida
    pelo processo padrão.
  - Inventar tiers de cliente (só existem Gold, Silver, Standard).
  
  QUANDO EM DÚVIDA:
  - Prefixar resposta com aviso de baixa confiança.
  - Sugerir escalação ao supervisor.
  - Se duas versões de um documento existirem, priorizar a mais recente
    e informar que existe versão anterior.
  ```

**Tarefa:**
Usando o **Claude** e referenciando os Anexos A e C, escreva a seção **"Product Rules & Guardrails"** do AGENTS.md. Ela deve conter:

1. Regras de comportamento do assistente (derivadas dos guardrails simulados acima).
2. Glossário de linguagem ubíqua do domínio que os agentes precisam conhecer (ex: "cliente Gold", "carga perigosa", "SLA de resolução", "multiplicador regional", "frete especial").
3. Restrições que impactam geração de código (ex: "toda resposta DEVE incluir o campo `source_document` no JSON de retorno").
4. Referências a documentos de spec no repositório.

**Entregável:** A seção do AGENTS.md pronta para ser adicionada ao repositório.

**Critérios de avaliação:**
- A seção é machine-readable.
- As regras são prescritivas (DEVE/NÃO DEVE).
- O glossário é útil (termos que um LLM confundiria sem contexto de domínio).
- As restrições de código são concretas o suficiente para influenciar o output do Copilot.

---

### DESENVOLVEDOR

#### Exercício 2.1 — Configuração e uso real de MCP servers no projeto

**Contexto:** Antes de codar, você vai configurar e **efetivamente rodar** os MCP servers que dão aos agentes de IA acesso ao repositório, à documentação da NovaTech e ao corpus de busca. Tudo local e gratuito — nenhum serviço pago ou externo.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- O **Anexo C** (estrutura do repositório e exemplo de `.mcp/mcp.json`) e o **Anexo D — Starter Repo**, que já traz a árvore, o `git init` e as pastas `docs/novatech/` (documentos do Anexo A) e `data/retrieval-corpus/` (chunks do Anexo B).
- A lista de necessidades do projeto que precisam de acesso via MCP:
  - Código, specs e skills do repositório (ler e escrever).
  - Documentação de negócio da NovaTech (ler — está em `docs/novatech/`).
  - Corpus de chunks para "recuperação" (ler — está em `data/retrieval-corpus/`).
  - Histórico/branches do repositório.
  - Memória persistente de decisões e linguagem ubíqua do projeto.
- Conceito de MCP: *"MCP (Model Context Protocol) padroniza como modelos de IA se conectam a ferramentas externas. Um MCP server expõe Tools (ações), Resources (dados read-only) e Prompts (templates). Servers podem rodar localmente — não precisam ser serviços na nuvem."*

**Tarefa:**
1. Usando o **Claude**, mapeie cada necessidade do projeto para um *reference server* gratuito e local (filesystem, git, memory, everything). Para cada um: o que ele expõe (tools/resources/prompts), quem consome, e qual pasta/escopo ele recebe.

2. Escreva o `.mcp/mcp.json` do projeto (preenchendo o scaffold vazio do starter repo). Aplique **least privilege** de forma concreta: o `filesystem` server deve receber só as pastas necessárias, e as fontes de leitura (`docs/novatech/`, `data/retrieval-corpus/`) devem ser tratadas como **read-only**; justifique por que cada escopo é o mínimo suficiente.

3. **Suba os servers e comprove o uso:** abra o agente (Claude/Copilot) com os servers ativos e demonstre, com evidência, que ele consegue (a) listar e ler um documento de `docs/novatech/`, (b) recuperar um chunk relevante de `data/retrieval-corpus/` para uma pergunta do domínio (use o mapa de cobertura do Anexo B como gabarito), e (c) ler o histórico do repositório via `git`.

4. Identifique ao menos 2 riscos de segurança no uso de MCP servers **neste contexto local** e proponha mitigações (ex.: um `filesystem` server com escopo amplo demais expõe `.env`/segredos; um server com escrita habilitada permite que o agente altere arquivos sem revisão).

**Entregável:** O mapeamento, o `.mcp/mcp.json` final, a **evidência de execução** (prints/exports mostrando o agente lendo doc, recuperando chunk e lendo o git), e a análise de riscos.

**Critérios de avaliação:**
- A configuração usa apenas servers locais e gratuitos (nenhum serviço pago/externo).
- O least privilege é concreto: escopos mínimos, fontes de negócio em read-only, justificativa por server.
- Há **evidência real de uso** (não só o arquivo de config): o agente leu documentação e recuperou chunk via MCP.
- Os riscos são específicos ao setup local (exposição de segredos por escopo amplo, escrita sem gate), com mitigação acionável.

---

#### Exercício 2.2 — Implementação de spec com Spec Driven Development

**Contexto:** O Product Specialist escreveu o requirements.md do query endpoint. O Tech Lead converteu em plan.md. Agora você precisa converter o plan em tasks.md e implementar a primeira task. Lembre-se de que na fase anterior você construiu um protótipo de RAG com ferramentas open-source — agora o código é de produção, com Azure e padrões do projeto.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- A estrutura do repositório (ver **Anexo C**) — o código deve seguir a organização de diretórios definida.
- O plan.md simulado do query endpoint:
  ```markdown
  # Plan — Query Endpoint
  
  ## Approach
  Azure Function HTTP trigger que:
  1. Recebe pergunta do atendente via POST /api/query
  2. Converte pergunta em embedding via Azure OpenAI
  3. Busca top-5 chunks no Azure AI Search
  4. Monta prompt com chunks + system prompt + pergunta
     (respeitando context budget: ~4K system + ~8K chunks + pergunta)
  5. Envia ao GPT-4o e retorna resposta com source_document
  
  ## Technical Decisions
  - TypeScript com Azure Functions v4
  - Zod para validação de input/output
  - Retry com exponential backoff para chamadas Azure
  - Structured logging com pino
  
  ## Prior Decisions (do cenário 1)
  - Context budget definido na ADR-0002: ~4K system + ~8K chunks
  - Documentos contraditórios tratados com metadado de vigência (ADR-0003)
  - System prompt versionado em /prompts/system-prompt.md
  
  ## Dependencies
  - Azure AI Search index must be populated (pipeline de ingestão)
  - System prompt must be finalized (ver /prompts/system-prompt.md)
  ```

**Tarefa:**
1. Usando o **Claude**, converta o plan.md em um `tasks.md` com tasks atômicas. Cada task deve ter: ID, descrição, critérios de aceite, dependências (quais tasks precisam estar prontas antes), e estimativa (P/M/G).

2. Usando o **GitHub Copilot**, implemente a primeira task da lista — tipicamente o setup do endpoint com validação de input. O código deve seguir os padrões definidos no plan (TypeScript, Zod, Azure Functions v4).

3. Revise criticamente o código gerado pelo Copilot: identifique ao menos 2 pontos que precisariam de ajuste antes de um code review real.

**Entregável:** O tasks.md, o código implementado com o Copilot, e a revisão crítica com os ajustes propostos.

**Critérios de avaliação:**
- As tasks são realmente atômicas (cada uma pode ser implementada e testada independentemente).
- Os critérios de aceite são verificáveis (não são vagos como "funcionar corretamente").
- O código gerado pelo Copilot é funcional e segue os padrões do plan.
- A revisão crítica identifica problemas reais (não inventa problemas para cumprir a tarefa).

---

#### Exercício 2.3 — Definição de estratégia de skills do projeto

**Contexto:** Você precisa definir quais skills o projeto precisa, quem as cria, e como são mantidas.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- A estrutura do repositório (ver **Anexo C**) — as skills devem seguir a organização em `/skills/foundation/`, `/skills/domain/`, `/skills/artifact/`.
- A lista de artefatos que serão produzidos repetidamente no projeto:
  - Endpoints Azure Functions com padrão RAG (vários ao longo do projeto).
  - Testes de integração para endpoints (mesmo padrão para todos).
  - Componentes React para o painel web (cards de resposta, formulários de feedback).
  - Documentação técnica de endpoints (ADRs, README de módulos).
  - Specs de produto (seguindo template SDD).
- Conceito de skills: *"Skills são artefatos estruturados (tipicamente arquivos .md) que encapsulam como gerar tipos específicos de outputs. A hierarquia é Foundation (convenções globais) → Domain (padrões por camada) → Artifact (receitas de geração)."*

**Tarefa:**
1. Usando o **Claude**, defina a árvore de skills do projeto seguindo a hierarquia Foundation → Domain → Artifact:
   - Foundation: convenções globais (ex: error handling, logging, env config, TypeScript conventions).
   - Domain: padrões por camada (ex: como endpoints são estruturados, como testes são escritos, como componentes React são organizados).
   - Artifact: receitas de geração específicas (ex: skill para criar endpoint RAG, skill para criar teste de integração).

2. Para cada skill, defina: nome, descrição (frase-ativação que um agente reconheceria), quem cria (qual papel), quem consome (qual papel + quais agentes), e frequência de uso estimada.

3. Usando o **GitHub Copilot**, crie o SKILL.md da skill Foundation mais importante (a que será usada por todas as outras como base). O arquivo deve conter: contexto, regras prescritivas, exemplos concretos (DO/DON'T com código), e anti-padrões.

**Entregável:** A árvore de skills, o mapeamento de criação/consumo, e o SKILL.md Foundation gerado com o Copilot.

**Critérios de avaliação:**
- A árvore de skills é coerente com o projeto (não tem skills que ninguém usaria).
- A atribuição de criação e consumo por papel demonstra visão de time (não é só para devs).
- O SKILL.md Foundation é concreto e prescritivo (contém exemplos de código reais, não abstrações).
- Os anti-padrões são úteis (coisas que o Copilot realmente geraria de errado sem guidance).

---

### TECH LEAD

#### Exercício 2.1 — Construção e teste do AGENTS.md do projeto

**Contexto:** Você é responsável por montar o AGENTS.md do repositório — o documento que todo agente de IA (Copilot, Claude Code) lê antes de gerar qualquer artefato no projeto. As decisões técnicas vêm das ADRs produzidas na fase anterior.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- A estrutura do repositório (ver **Anexo C**).
- As decisões técnicas das ADRs da fase anterior (simuladas):
  - TypeScript com strict mode.
  - Azure Functions v4 com HTTP triggers.
  - Zod para validação de input/output.
  - Vitest para testes.
  - pino para logging (nunca console.log).
  - Conventional Commits para mensagens de commit.
  - Branch strategy: feature branches **locais**. Como esta fase não usa remoto, "abrir PR" significa criar a branch e escrever a descrição do PR como um arquivo markdown (ex.: `docs/pull-requests/PR-NNNN.md`) com objetivo, mudanças e checklist de validation gates; a revisão é simulada localmente.
  - Context budget: ~4K tokens system prompt + ~8K chunks por query (ADR-0002).
  - Documentos contraditórios: metadado de vigência, priorizar mais recente (ADR-0003).
- A especificação do AGENTS.md: *"O AGENTS.md é a constitution do projeto: contém decisões duráveis que todo agente e toda spec devem respeitar. Funciona como contrato entre humanos e agentes."*

**Tarefa:**
1. Usando o **Claude**, escreva o AGENTS.md completo do projeto, incluindo as seções: Project Overview, Tech Stack & Architecture, Coding Standards, Build & Deploy. Inclua na seção de Architecture as regras de gerenciamento de contexto derivadas da ADR-0002. (As seções de Product Rules, Testing Standards e Project Management serão escritas pelos outros papéis.)

2. Usando o **GitHub Copilot**, teste o AGENTS.md: com o arquivo presente no repositório, peça ao Copilot que gere (a) uma Azure Function endpoint, (b) um teste para esse endpoint. Observe se o Copilot segue as convenções definidas.

3. Documente o que o Copilot seguiu e o que ignorou. Para cada item ignorado, reescreva a seção relevante para ser mais prescritiva e teste novamente.

**Entregável:** O AGENTS.md v1, os outputs do Copilot, a análise do que foi seguido/ignorado, o AGENTS.md v2 (iterado), e os outputs da segunda rodada.

**Critérios de avaliação:**
- O AGENTS.md é prescritivo (instruções que um agente consegue seguir, não descrição do projeto).
- As regras de gerenciamento de contexto da ADR-0002 estão incorporadas (context budget, limites por query).
- O teste com Copilot é real (evidência de outputs).
- A iteração v1 → v2 mostra melhoria concreta.
- A análise reconhece limitações (nem tudo será seguido — e isso é esperado).

---

#### Exercício 2.2 — Arquitetura de MCP do projeto (servers locais)

**Contexto:** Você precisa definir a arquitetura de MCP do projeto: quais servers locais, com quais escopos/permissões, como monitorá-los e como o time é avisado de mudanças. Como todos os servers rodam localmente, "monitorar" e "health check" são exercícios **executáveis de verdade**.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo, o **Anexo C** e o **Anexo D — Starter Repo**.
- O mapeamento de MCP do desenvolvedor (simulado — output do Dev 2.1, fornecido para autossuficiência):
  ```
  Servers locais e gratuitos:
  (1) filesystem  -> ./src ./specs ./skills (rw) + ./docs/novatech ./data/retrieval-corpus (read-only)
  (2) git         -> repositório local (histórico, diff, branches)
  (3) memory      -> grafo persistente de decisões e linguagem ubíqua
  (4) everything  -> aprendizado das primitivas de MCP
  ```
- Conceito de MCP architecture: *"MCP servers devem ser gerenciados como infraestrutura: versionados, com escopo/permissões mínimas, e observáveis. O Tech Lead decide quais servers são autorizados e quais tools cada um expõe."*

**Tarefa:**
1. Usando o **Claude**, produza um documento de arquitetura de MCP que cubra:
   - Diagrama dos servers e suas conexões com os agentes (quem consome o quê, com qual escopo).
   - Política de aprovação: como um novo server local é adicionado ao `.mcp/mcp.json` do projeto (quem revisa escopo e permissões).
   - Monitoramento: como saber se um server parou de responder ou perdeu acesso a uma pasta.
   - Versionamento: como garantir que mudar o escopo de um server não quebre fluxos existentes.

2. Usando o **GitHub Copilot**, crie um **script de health check** que sobe/consulta cada server configurado no `.mcp/mcp.json` e verifica que ele responde (ex.: lista as tools/resources expostas; confirma que o `filesystem` enxerga `docs/novatech/`). Como os servers são locais, o script **roda de fato** — inclua a saída de uma execução.

3. Defina o que acontece quando um server fica indisponível durante o desenvolvimento (ex.: `filesystem` sem a pasta de docs -> o agente deve degradar com aviso, não inventar).

**Entregável:** O documento de arquitetura, o script de health check **com saída de execução real**, e o plano de contingência.

**Critérios de avaliação:**
- A arquitetura trata os servers locais como infraestrutura gerenciada (escopo, permissões, versionamento), não config ad-hoc.
- A política de aprovação equilibra agilidade com segurança (revisão de escopo/least privilege).
- O health check é **funcional e foi executado** (saída real contra servers locais), não apenas conceitual.
- O plano de contingência é realista (agente degradado com aviso é melhor que agente que alucina).

---

#### Exercício 2.3 — Criação e teste de skills técnicas

**Contexto:** Você precisa criar as skills técnicas do projeto que vão garantir que o Copilot gere código consistente com os padrões definidos.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- A estrutura do repositório (ver **Anexo C**) — as skills devem seguir a hierarquia de diretórios definida em `/skills/`.
- A árvore de skills proposta pelo desenvolvedor (simulada):
  ```
  Foundation:
  ├── typescript-conventions (strict mode, imports, naming)
  ├── error-handling (custom errors, logging, retry)
  └── project-structure (folders, modules, exports)
  
  Domain:
  ├── azure-functions-endpoint (HTTP trigger pattern)
  ├── azure-ai-search-integration (query, index management)
  ├── react-components (painel web patterns)
  └── testing-patterns (Vitest, mocks, fixtures)
  
  Artifact:
  ├── create-rag-endpoint (receita completa)
  ├── create-integration-test (receita completa)
  └── create-react-card (receita completa)
  ```

**Tarefa:**
1. Usando o **Claude**, escreva o SKILL.md completo para a skill `azure-functions-endpoint` (Domain level). Inclua: contexto, regras prescritivas, exemplos de código (DO/DON'T), anti-padrões comuns, e dependências.

2. Usando o **GitHub Copilot**, teste a skill: com o SKILL.md no repositório, peça ao Copilot que gere um endpoint. Avalie se seguiu as regras.

3. Itere: reescreva seções que o Copilot não seguiu. Teste novamente.

4. Defina critérios para "skill madura": quando está pronta para uso pelo time.

**Entregável:** O SKILL.md, os outputs do Copilot (antes e depois), e os critérios de maturidade.

**Critérios de avaliação:**
- O SKILL.md é prescritivo e concreto (exemplos de código reais).
- A iteração mostra que skills precisam de refinamento baseado em teste real.
- Os critérios de maturidade são práticos e mensuráveis.
- O participante demonstra que skills são artefatos vivos.

---

### QA

#### Exercício 2.1 — Contribuição para o AGENTS.md: seção de Testing Standards

**Contexto:** O Tech Lead pediu que você escreva a seção de padrões de teste do AGENTS.md que todo agente de IA deve seguir ao gerar código de teste.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- As decisões técnicas do Tech Lead: *"Vitest para testes unitários e de integração. Mocks com msw (Mock Service Worker) para APIs externas. Testes rodam no CI via GitHub Actions. Coverage mínimo: 80% de linhas."*
- Um exemplo de teste ruim gerado por IA (simulado):
  ```typescript
  // Teste gerado pelo Copilot sem guidance
  test('query endpoint works', async () => {
    const result = await handler({ body: '{"question": "test"}' });
    expect(result).toBeDefined();
  });
  ```

**Tarefa:**
1. Usando o **Claude**, escreva a seção **"Testing Standards"** do AGENTS.md. Inclua:
   - Padrão de nomenclatura de testes (describe/it com frases descritivas em inglês).
   - O que todo teste DEVE ter (arrange/act/assert, assertions específicas).
   - O que todo teste NÃO DEVE ter (acesso a serviços reais, dependência de ordem, assertions vagas).
   - Padrão de mocking (msw para HTTP, factories para dados).
   - Padrão de fixtures (dados reutilizáveis para testes de RAG — perguntas, chunks, respostas esperadas).

2. Reescreva o teste ruim seguindo seus padrões. Mostre antes/depois, explicando cada melhoria.

3. Defina ao menos 3 critérios que um código de teste gerado por IA deve atender para passar no code review de QA.

**Entregável:** A seção Testing Standards do AGENTS.md, o teste reescrito com explicações, e os critérios de review.

**Critérios de avaliação:**
- A seção é prescritiva o suficiente para que o Copilot gere testes melhores.
- O teste reescrito demonstra os padrões na prática.
- Os critérios de review são objetivos (dois QAs chegariam à mesma conclusão).

---

#### Exercício 2.2 — Criação de spec de testes no formato SDD

**Contexto:** No modelo SDD, até o plano de testes deve ser especificado antes de ser implementado. Você precisa escrever a spec de testes para o query endpoint.

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- A documentação da NovaTech (ver **Anexo A**) e os chunks de referência (ver **Anexo B**) — use para criar dados de teste realistas.
- Os requirements.md do query endpoint (simulado):
  ```
  Outcomes:
  - Atendente recebe resposta relevante em < 30s
  - Toda resposta cita ao menos uma fonte
  - Quando confiança é baixa, resposta inclui aviso
  - Cargas perigosas nunca recebem informação de devolução
  
  Verification Criteria:
  - VC-01: Resposta em < 30s para 95% das queries
  - VC-02: 100% das respostas incluem campo source_document
  - VC-03: Queries sobre carga perigosa + devolução retornam negativa explícita
  - VC-04: Queries sem match retornam mensagem padrão de "não encontrado"
  ```

**Tarefa:**
1. Usando o **Claude**, escreva um `test-plan.md` que derive dos verification criteria. Para cada VC: cenários de teste (happy path + edge cases), dados de teste (perguntas + chunks esperados), e critério de aprovação.

2. Inclua testes de robustez da IA: perguntas ambíguas, prompt injection básico, perguntas em idiomas diferentes.

3. Usando o **Claude Cowork**, organize num formato rastreável: ID único por cenário, status, link para VC.

**Entregável:** O test-plan.md, os cenários de robustez, e o artefato organizado pelo Cowork.

**Critérios de avaliação:**
- Cada VC tem ao menos 2 cenários (happy path + edge case).
- Os dados de teste são realistas e do domínio de logística (não são "test" e "hello").
- Os testes de robustez demonstram compreensão de riscos de IA (prompt injection, language confusion).
- O artefato do Cowork é rastreável (teste → VC).

---

#### Exercício 2.3 — Definição de skill de geração de testes

**Contexto:** Você precisa criar a skill que define como testes devem ser gerados para este projeto.

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- O teste ruim e o teste reescrito do exercício 2.1 (referência de anti-padrão e padrão desejado).
- Testing Standards simulados (output do exercício 2.1 — fornecidos para que este exercício seja autossuficiente):
  ```
  Testing Standards (resumo):
  - Nomenclatura: describe('ModuleName', () => { it('should [behavior] when [condition]') })
  - Estrutura: arrange/act/assert explícitos em todo teste.
  - Assertions: específicas ao comportamento, nunca toBeDefined() ou toBeTruthy() sozinhos.
  - Mocking: msw para HTTP externo, factories para dados de teste.
  - Fixtures: /tests/fixtures/ com chunks, queries e expected responses reutilizáveis.
  - Proibido: acesso a serviços reais, dependência de ordem, dados hardcoded.
  ```
- Conceito de skills: *"Skills encapsulam como gerar tipos específicos de outputs. Uma boa skill tem: contexto (quando usar), regras prescritivas, exemplos concretos (DO/DON'T), e anti-padrões."*

**Tarefa:**
1. Usando o **Claude**, crie o SKILL.md para `create-integration-test` (nível Artifact). Inclua:
   - Quando esta skill se aplica (frase-ativação).
   - Template de teste com placeholders.
   - 2 exemplos completos (DO: teste bem escrito; DON'T: teste com problemas comuns de IA).
   - Anti-padrões específicos de testes gerados por IA.
   - Dependências: quais skills Foundation e Domain devem ser lidas antes.

2. Usando o **Claude Cowork**, crie um checklist de revisão de testes verificável em menos de 2 minutos por teste.

**Entregável:** O SKILL.md completo e o checklist de revisão gerado pelo Cowork.

**Critérios de avaliação:**
- A skill é concreta o suficiente para melhorar o output do Copilot.
- Os anti-padrões são reais (coisas que LLMs realmente geram de errado em testes).
- O checklist é rápido e objetivo.
- A skill é consistente com os Testing Standards fornecidos.
