# Cenário-Âncora 1 — Fase de Entendimento e Contexto

## Tópicos cobertos
- Fundamentos de IA Generativa
- Engenharia de Prompt
- Engenharia de Contexto
- RAG (Retrieval-Augmented Generation)

## Ferramentas disponíveis para os participantes
- **Claude** (chat) — todos os papéis
- **GitHub Copilot** — desenvolvedores e Tech Lead
- **Claude Cowork** — Delivery Manager, Product Specialist, QA
- **Claude Design** — Product Specialist

## Documentos de apoio
- **Anexo A — Documentação Simulada da NovaTech:** Contém o conteúdo completo dos 5 documentos-chave da NovaTech (POL-001, PROC-042, PROC-042-v2, SLA-2024, FAQ-Atendimento). É a fonte de verdade para todos os exercícios que pedem avaliação de respostas ou análise de documentação.
- **Anexo B — Chunks de Referência do Pipeline de RAG:** Contém os chunks que o pipeline de RAG extrairia dos documentos do Anexo A, com mapa de cobertura (pergunta → chunks esperados). Use nos exercícios que envolvem teste de prompts ou avaliação de retrieval.

---

## O Cenário

A NovaTech é uma empresa de médio porte do setor de logística com 1.200 funcionários. Sua operação depende de um conjunto extenso de documentação interna: manuais de procedimento operacional, políticas de compliance, tabelas de SLA por tipo de cliente, regras de cálculo de frete, e normas de segurança de carga.

Hoje, essa documentação está espalhada em três fontes: um SharePoint corporativo com ~800 documentos (PDFs e Word), uma wiki interna no Confluence com ~400 páginas, e uma pasta de rede com planilhas de referência atualizadas mensalmente.

O problema: a equipe de atendimento ao cliente (45 pessoas) gasta em média 12 minutos por chamado buscando informações nessas fontes para responder dúvidas de clientes sobre prazos, regras de frete, políticas de devolução e procedimentos de reclamação. Isso gera atrasos, respostas inconsistentes e frustração tanto dos atendentes quanto dos clientes.

A NovaTech contratou a DB1 para construir um assistente de IA que permita aos atendentes fazer perguntas em linguagem natural e receber respostas fundamentadas na documentação oficial da empresa, com indicação da fonte. O assistente será integrado ao ambiente Microsoft da NovaTech (Teams + SharePoint).

### Informações adicionais fornecidas pela NovaTech

- O volume médio é de 320 chamados/dia, dos quais ~60% envolvem consulta a documentação.
- A documentação é atualizada mensalmente por 3 áreas diferentes (Operações, Compliance, Comercial), sem processo unificado de revisão.
- Alguns documentos se contradizem entre versões — a equipe de atendimento hoje resolve isso "perguntando para quem sabe".
- A NovaTech já tem licenças Microsoft 365 E3 e está disposta a provisionar Azure AI Services.
- O projeto tem orçamento para 3 meses de discovery + desenvolvimento + go-live.
- A expectativa da diretoria é reduzir o tempo médio de busca de 12 para menos de 2 minutos por chamado.

---

## Exercícios por Papel

---

### DELIVERY MANAGER

#### Exercício 1.1 — Avaliação de viabilidade com fundamentos de IA

**Contexto:** Você recebeu o briefing acima e precisa preparar uma análise inicial para o kickoff interno do projeto. A diretoria da DB1 quer entender se o projeto é viável com IA e quais são os riscos técnicos que podem impactar prazo e custo.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo acima.
- Uma tabela resumo dos tipos de documento da NovaTech:

| Fonte | Qtde docs | Formato | Atualização | Responsável |
|-------|-----------|---------|-------------|-------------|
| SharePoint | ~800 | PDF, DOCX | Mensal | Operações, Compliance |
| Confluence | ~400 páginas | HTML/Wiki | Semanal | TI, Comercial |
| Pasta de rede | ~50 planilhas | XLSX | Mensal | Comercial |

**Tarefa:**
1. Usando o **Claude**, elabore um documento de 1-2 páginas contendo uma avaliação dos riscos do projeto relacionados às características da IA generativa. Forneça ao Claude o cenário completo e peça ajuda para identificar riscos. Considere ao menos: o risco de alucinação (o assistente inventar procedimentos que não existem), o impacto de documentação contraditória nas respostas, a dependência da qualidade dos documentos-fonte, a expectativa da diretoria versus o que a tecnologia realmente entrega hoje, e o risco de degradação de qualidade quando o contexto do modelo fica muito grande (*context rot*).

2. Para cada risco, refine com o Claude: probabilidade (alta/média/baixa), impacto no projeto (prazo, custo, qualidade), e uma ação de mitigação concreta.

3. Formule três perguntas que você faria ao Tech Lead antes de confirmar o cronograma de 3 meses.

**Entregável:** O documento final E o histórico da conversa com o Claude (prints ou export), demonstrando como você usou a ferramenta e como refinou o output.

**Critérios de avaliação:**
- Os riscos demonstram compreensão real das limitações de LLMs (não são genéricos como "a IA pode errar"). Exemplo de risco bem formulado: "documentos contraditórios entre PROC-042 e PROC-042-v2 podem gerar respostas que misturam regras de versões diferentes sem que o atendente perceba".
- Ao menos um risco aborda contexto: o impacto do volume de documentação (~1.250 fontes) na qualidade das respostas (context rot, orçamento de atenção limitado do modelo).
- As mitigações são acionáveis, não apenas "monitorar" ou "ficar atento". Exemplo: "implementar versionamento explícito com data de vigência no pipeline de ingestão e instruir o modelo a priorizar a versão mais recente".
- As perguntas ao Tech Lead revelam entendimento de que a qualidade do RAG depende do pipeline de dados, não só do modelo.
- O uso do Claude demonstra capacidade de refinar outputs (não é um prompt único com aceitação acrítica do resultado).

---

#### Exercício 1.2 — Comunicação de expectativas com o cliente

**Contexto:** A diretoria da NovaTech espera que o assistente "responda tudo certo, como o ChatGPT mas com nossos dados". Você precisa preparar uma comunicação que ajuste expectativas sem matar o entusiasmo.

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- Um e-mail fictício do diretor de operações da NovaTech: *"Estamos animados com o projeto. Nosso CEO viu uma demo do Copilot e quer algo parecido. A expectativa é que em 3 meses nosso time de atendimento não precise mais procurar nada manualmente. O assistente vai saber tudo."*

**Tarefa:**
1. Usando o **Claude**, elabore o rascunho de um e-mail de resposta ao diretor que: valide o entusiasmo, explique em linguagem não-técnica por que um assistente de IA não "sabe tudo" (usando o conceito de respostas probabilísticas), explique o que é RAG e por que a qualidade depende da documentação-fonte, e proponha 2-3 critérios de sucesso mensuráveis.

2. Usando o **Claude Cowork**, crie um one-pager visual (documento de 1 página) que possa ser anexado ao e-mail, mostrando: como o assistente funciona (fluxo simplificado pergunta → busca → resposta com fonte), o que ele faz bem, o que ele não faz, e os critérios de sucesso propostos.

**Entregável:** O e-mail redigido, o one-pager gerado pelo Cowork, e evidência do uso das ferramentas.

**Critérios de avaliação:**
- O e-mail usa analogias ou linguagem acessível, não jargão técnico.
- A explicação de RAG é precisa sem ser acadêmica.
- Os critérios de sucesso são mensuráveis e derivam de entendimento real da tecnologia (ex: "% de respostas com citação de fonte verificável" é bom; "o assistente funcionar bem" é ruim).
- O one-pager é claro o suficiente para um executivo entender em 2 minutos.

---

#### Exercício 1.3 — Planejamento de discovery com IA

**Contexto:** O projeto foi aprovado. Você precisa planejar a fase de discovery considerando que no modelo AI First, agentes de IA pré-analisam documentação antes do discovery humano (fase de Intent).

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- Uma descrição resumida da fase de Intent do AI First SDLC: *"Antes de entrevistas com stakeholders, agentes especializados analisam documentação existente, contexto de negócio e restrições para gerar um mapa priorizado de fontes, dependências e gaps."*

**Tarefa:**
1. Usando o **Claude**, elabore um plano de discovery que defina: quais atividades serão feitas por agentes de IA na fase de Intent (ex: catalogar os 800 documentos do SharePoint, identificar documentos duplicados ou contraditórios, mapear temas mais frequentes), quais atividades serão feitas por humanos no discovery (entrevistas, validação, priorização), e a sequência (o que precisa acontecer antes do quê).

2. Usando o **Claude Cowork**, transforme o plano em um cronograma visual de 2 semanas de discovery, com atividades, responsáveis e dependências.

3. Identifique o que a NovaTech precisa fornecer (acessos, pessoas, tempo) e quando.

**Entregável:** O plano textual, o cronograma visual gerado pelo Cowork, e evidência do uso das ferramentas.

**Critérios de avaliação:**
- O plano demonstra entendimento de que Intent antecede e alimenta o discovery humano.
- As atividades atribuídas a agentes são realistas (coisas que IA faz bem: catalogar, comparar, resumir).
- As atividades humanas focam no que IA não faz bem (validar, priorizar, decidir).
- O cronograma é realista para 2 semanas.

---

### PRODUCT SPECIALIST

#### Exercício 1.1 — Mapeamento de intent com engenharia de contexto

**Contexto:** Você é o Product Specialist do projeto e vai conduzir a fase de Intent + Discovery. Antes de entrevistar qualquer stakeholder, você precisa usar IA para pré-analisar a documentação disponível e gerar hipóteses. Mas não basta jogar tudo no prompt: a forma como você organiza e sequencia a informação para o modelo determina a qualidade do resultado.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- Os 5 documentos-chave da NovaTech com conteúdo completo (ver **Anexo A** — para a etapa 2, os documentos individuais estão disponíveis na pasta `anexo-a-documentos-individuais/`):
  1. *"POL-001: Política de Devolução de Mercadorias"* — Define regras para devolução em até 7 dias, com exceções para carga perigosa.
  2. *"PROC-042: Procedimento de Cálculo de Frete Especial"* — Fórmula para fretes acima de 500kg com tabela de multiplicadores por região.
  3. *"SLA-2024: Tabela de SLA por Tipo de Cliente"* — Prazos de resposta diferenciados para clientes Gold, Silver e Standard.
  4. *"PROC-042-v2: Procedimento de Cálculo de Frete (Revisado)"* — Mesma numeração do item 2, mas com multiplicadores diferentes. Sem indicação de qual é o vigente.
  5. *"FAQ-Atendimento: Perguntas Frequentes do Time de Suporte"* — Documento informal com 47 perguntas e respostas escritas por atendentes experientes, sem validação formal.
- Conceito de engenharia de contexto: *"Prompt engineering é como pedir. Context engineering é decidir o que o modelo vê antes de responder. Inclui: orçamento de atenção (modelos têm capacidade limitada — informação em excesso degrada a qualidade), progressive disclosure (alimentar o modelo em etapas, não tudo de uma vez), e priorização (colocar a informação mais relevante no início do contexto)."*

**Tarefa:**
1. No **Claude**, projete e execute uma estratégia de análise em 3 etapas, usando engenharia de contexto:
   - **Etapa 1 — Visão geral:** Forneça ao Claude apenas os títulos, metadados e resumos dos 5 documentos (não o conteúdo completo). Peça um mapa de temas cobertos e hipóteses de gaps.
   - **Etapa 2 — Análise profunda:** Com base no mapa da etapa 1, selecione os 2 documentos que mais precisam de análise (ex: os dois PROC-042 contraditórios). Forneça o conteúdo completo apenas desses 2 e peça análise de inconsistências.
   - **Etapa 3 — Cruzamento:** Forneça ao Claude o output das etapas 1 e 2 junto com o FAQ-Atendimento completo. Peça que cruze as inconsistências encontradas com as práticas informais do FAQ.

2. Para cada etapa, documente: por que escolheu fornecer essa informação nessa ordem (decisão de contexto), o que obteve como output, e como a qualidade variou entre as etapas.

3. Identifique ao menos 2 riscos que encontrou e descreva como levaria isso para o discovery humano.

4. Reflexão: o que teria acontecido se você tivesse colado os 5 documentos completos de uma vez no primeiro prompt? Compare com o resultado da abordagem progressiva.

**Entregável:** A estratégia de contexto documentada, os 3 prompts com outputs, a análise crítica de cada etapa, a reflexão sobre progressive disclosure, e o mapa de riscos.

**Critérios de avaliação:**
- A estratégia de 3 etapas demonstra progressive disclosure (não joga tudo de uma vez).
- A escolha de quais documentos analisar em profundidade na etapa 2 é justificada.
- A reflexão sobre "tudo de uma vez vs. progressivo" demonstra compreensão de orçamento de atenção e context rot.
- Os riscos identificados são reais e a proposta de tratamento no discovery é concreta.

---

#### Exercício 1.2 — Design de jornada com componente de IA

**Contexto:** Com base no discovery, você precisa mapear a jornada do atendente usando o assistente de IA.

**Ferramentas a utilizar:** Claude (chat) + Claude Design

**Inputs fornecidos:**
- O cenário completo.
- Dados do discovery (simulados): *"Os atendentes hoje abrem em média 4 fontes diferentes por chamado. As dúvidas mais comuns são sobre prazos de entrega (35%), regras de frete (25%), política de devolução (20%) e outros (20%). Em 15% dos casos, o atendente não encontra resposta e escala para o supervisor."*

**Tarefa:**
1. Usando o **Claude**, elabore a jornada do atendente em formato de texto estruturado, incluindo:
   - O fluxo principal: atendente recebe dúvida → consulta o assistente → recebe resposta com fonte → usa no atendimento.
   - O fluxo de fallback: o que acontece quando o assistente não tem confiança na resposta ou quando o atendente discorda.
   - O fluxo de feedback: como o atendente sinaliza que uma resposta estava errada, desatualizada ou incompleta.
   - Ao menos 2 guardrails de comportamento do assistente (ex: "nunca inventar um prazo que não esteja documentado").

2. Usando o **Claude Design**, transforme a jornada textual em um diagrama visual de fluxo que mostre os 3 caminhos (principal, fallback, feedback) de forma clara para apresentar ao time e ao cliente.

**Entregável:** A jornada textual, o diagrama visual gerado pelo Claude Design, e evidência do uso das ferramentas.

**Critérios de avaliação:**
- A jornada inclui o caminho feliz E os caminhos de exceção.
- Os guardrails são específicos ao domínio (logística/atendimento), não genéricos.
- O fluxo de feedback mostra entendimento de que RAG precisa de manutenção contínua (feedback loop).
- O diagrama visual é coerente com o texto e legível para não-técnicos.

---

#### Exercício 1.3 — Especificação de requisitos de RAG do ponto de vista do produto

**Contexto:** Você precisa especificar os requisitos que o pipeline de RAG deve atender para que o assistente entregue valor real para os atendentes.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- Dados do discovery.
- A documentação da NovaTech (ver **Anexo A**) como exemplo concreto das contradições e gaps que a spec precisa endereçar.
- Uma explicação simplificada do pipeline de RAG: *"Documentos são divididos em pedaços (chunks), transformados em representações numéricas (embeddings), armazenados num banco vetorial, e recuperados por similaridade quando o usuário faz uma pergunta. O LLM então gera uma resposta usando os chunks recuperados como contexto."*

**Tarefa:**
Usando o **Claude**, escreva uma especificação de requisitos do produto (não técnica, mas precisa) que cubra:

1. Quais fontes de dados devem ser indexadas (e quais não — ex: documentos obsoletos devem ser excluídos ou marcados?).
2. Como o assistente deve lidar com documentos contraditórios (ex: duas versões do mesmo procedimento).
3. Qual o comportamento esperado quando a pergunta do atendente não tem resposta na base (o assistente deve dizer "não encontrei" ou tentar responder com conhecimento geral?).
4. Requisitos de atualização: quando novos documentos são publicados, em quanto tempo devem estar disponíveis no assistente?
5. Requisitos de rastreabilidade: toda resposta deve citar a fonte? Deve mostrar o trecho relevante?

Itere com o Claude: apresente a primeira versão e peça ao Claude que identifique gaps ou ambiguidades na sua especificação. Refine com base no feedback.

**Entregável:** A especificação final e o histórico de iteração com o Claude mostrando a versão inicial, o feedback do Claude e a versão refinada.

**Critérios de avaliação:**
- Os requisitos demonstram entendimento de que a qualidade do RAG depende da curadoria dos dados, não só da tecnologia.
- O tratamento de contradições e ausência de resposta mostra maturidade de produto.
- Os requisitos são testáveis (o QA conseguiria verificar cada um).
- A iteração com o Claude demonstra capacidade de usar IA como revisor, não apenas gerador.

---

### DESENVOLVEDOR

#### Exercício 1.1 — Análise de viabilidade técnica com fundamentos de LLM e engenharia de contexto

**Contexto:** O Tech Lead pediu que você avalie a viabilidade técnica do assistente considerando as características da documentação da NovaTech e o impacto do gerenciamento de contexto na arquitetura.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- Informações técnicas adicionais: *"Os PDFs do SharePoint incluem documentos com tabelas complexas (tabelas de frete com 15+ colunas), fluxogramas embutidos como imagens, e alguns documentos escaneados (OCR necessário). A wiki do Confluence tem links internos entre páginas e usa macros customizadas. As planilhas têm fórmulas interdependentes."*
- Conceito de context engineering aplicado a RAG: *"O contexto que o LLM recebe a cada pergunta é limitado pela janela de contexto do modelo. A qualidade da resposta depende de: quais chunks são selecionados (relevância), quantos chunks cabem no contexto (orçamento de atenção), onde ficam posicionados no prompt (informação no meio de contextos longos é 'esquecida' — o efeito 'lost in the middle'), e o que mais está no contexto competindo por atenção (system prompt, histórico de conversa, instruções)."*

**Tarefa:**
1. Usando o **Claude**, produza uma análise técnica que cubra:
   - Para cada tipo de fonte (PDFs com tabelas, PDFs escaneados, wiki com links, planilhas com fórmulas): qual o desafio para o pipeline de RAG, como isso afeta a qualidade das respostas, e uma estratégia de tratamento.
   - Estimativa do tamanho aproximado da base em tokens considerando ~800 documentos PDF (média de 10 páginas cada), ~400 páginas wiki (média de 1.500 palavras cada), e ~50 planilhas. Use a regra prática de ~0.75 palavras por token.
   - Análise de orçamento de contexto: dado que o GPT-4o tem 128K tokens de janela e o system prompt + instruções consomem ~2K tokens, quantos chunks de ~500 tokens cabem em cada query? Como isso afeta a estratégia de chunking e retrieval?
   - Recomendação de estratégia de chunking justificada pelo tipo de pergunta que o usuário fará e pelo conceito de *lost in the middle*.

2. Peça ao **Claude** que revise sua análise: forneça o documento e peça que identifique pontos fracos, estimativas otimistas demais ou riscos que você não considerou. Incorpore o feedback.

**Entregável:** A análise técnica final e o histórico de iteração com o Claude.

**Critérios de avaliação:**
- A análise demonstra entendimento de que diferentes tipos de conteúdo exigem diferentes estratégias de extração e chunking.
- A estimativa de tokens é razoável e mostra compreensão prática do conceito.
- A análise de orçamento de contexto demonstra compreensão de que context window é um recurso limitado que precisa ser gerenciado (não é "quanto maior melhor").
- A estratégia de chunking é justificada pelo tipo de pergunta e considera o efeito *lost in the middle*.
- A iteração com o Claude melhorou o documento de forma verificável.

---

#### Exercício 1.2 — Prototipação de prompt com engenharia de contexto

**Contexto:** Você precisa prototipar o system prompt do assistente e testar com cenários reais. Além do conteúdo do prompt, você precisa pensar em como o contexto é estruturado: o que é estático, o que é dinâmico, e como a ordem da informação afeta a resposta.

**Ferramentas a utilizar:** Claude (chat) — o próprio Claude serve como ambiente de teste do prompt

**Inputs fornecidos:**
- O cenário completo.
- Guardrails definidos pelo Product Specialist: *"O assistente deve (1) sempre citar a fonte do documento, (2) nunca inventar prazos ou valores que não estejam na documentação, (3) quando não encontrar resposta, dizer explicitamente que não encontrou e sugerir escalar para o supervisor, (4) responder em português formal mas acessível."*
- 3 chunks simulados de documentação (extraídos do **Anexo B** — o Anexo B contém o conjunto completo de chunks e o mapa de cobertura para validação):
  - Chunk A: *"Política de Devolução POL-001, seção 3.2: Mercadorias podem ser devolvidas em até 7 dias úteis após o recebimento, exceto cargas classificadas como perigosas (classes 1 a 6 da ANTT). O cliente deve abrir chamado no portal e anexar fotos da mercadoria."*
  - Chunk B: *"Tabela SLA-2024: Cliente Gold — resposta em até 2h, resolução em até 24h. Cliente Silver — resposta em até 4h, resolução em até 48h. Cliente Standard — resposta em até 8h, resolução em até 72h."*
  - Chunk C: *"PROC-042-v2, seção 2: Frete especial para cargas acima de 500kg: valor base × multiplicador regional. Região Sul: 1.3. Região Sudeste: 1.1. Região Norte: 1.8. Região Nordeste: 1.5. Região Centro-Oeste: 1.4."*
- Conceito de contexto estático vs dinâmico: *"Em um prompt de produção, algumas partes são estáticas (system prompt, guardrails — raramente mudam) e outras são dinâmicas (chunks recuperados, dados do cliente, histórico da conversa — mudam a cada query). A engenharia de contexto decide como essas partes se compõem: em que ordem, com que prioridade, e o que fazer quando o contexto total ultrapassa o orçamento."*

**Tarefa:**
1. Escreva um system prompt completo para o assistente, incorporando os guardrails e o contexto do projeto. Organize o prompt em seções claras: identidade, regras, formato de resposta, e instruções para uso dos chunks. Defina explicitamente a ordem de prioridade quando houver conflito entre fontes.

2. Documente a estrutura de contexto do prompt: identifique quais partes são estáticas (vão em toda query) e quais são dinâmicas (mudam por query). Estime o tamanho em tokens de cada parte.

3. Teste o prompt diretamente no **Claude**: abra uma conversa nova, cole o system prompt como instrução inicial junto com os chunks simulados, e faça estas 3 perguntas como se fosse o atendente:
   - "Qual o prazo de devolução para carga perigosa?"
   - "Meu cliente é Gold, qual o SLA de resolução?"
   - "Quanto custa o frete para 600kg para Manaus?"

4. Analise cada resposta: está correta? Citou a fonte? Respeitou os guardrails? Onde errou?

5. Itere o system prompt: reescreva partes que geraram respostas inadequadas e teste novamente.

**Entregável:** O system prompt v1 com mapeamento de contexto estático/dinâmico, as respostas obtidas, a análise crítica, o system prompt v2 (iterado), e as respostas da segunda rodada.

**Critérios de avaliação:**
- O system prompt é específico, com constraints claros (não é genérico como "você é um assistente útil").
- O mapeamento estático/dinâmico demonstra compreensão de engenharia de contexto (não é apenas "o prompt completo").
- A análise das falhas demonstra pensamento crítico (ex: para carga perigosa, a resposta correta é que NÃO pode devolver, conforme a exceção do POL-001).
- A iteração mostra melhoria concreta entre v1 e v2.
- O participante demonstra que usou o Claude como ambiente de teste real.

---

#### Exercício 1.3 — Construção de pipeline de RAG com ferramentas open-source

**Contexto:** O Tech Lead quer uma prova de conceito funcional do pipeline de RAG usando ferramentas gratuitas e open-source, antes de investir em licenças Azure. Você precisa construir um protótipo que ingira documentos, crie embeddings, armazene num vector store, e responda perguntas com base nos documentos.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- Os documentos da NovaTech como arquivos individuais para ingestão (ver **Anexo A**, pasta `anexo-a-documentos-individuais/` — 5 arquivos .md, um por documento, prontos para processamento por scripts).
- Os chunks de referência (ver **Anexo B**) — use o mapa de cobertura como gabarito para validar se o pipeline recupera os chunks corretos.
- Stack sugerida (todas gratuitas/open-source):
  - **Python** como linguagem.
  - **ChromaDB** como vector store local (pip install chromadb).
  - **sentence-transformers** para embeddings open-source (pip install sentence-transformers — modelo sugerido: `all-MiniLM-L6-v2`).
  - **LangChain** ou código manual para orquestração (pip install langchain).
  - Para geração: usar o **Claude** (via chat manual, não via API) ou qualquer modelo local via **Ollama** (gratuito).
- Alternativa: se o participante preferir, pode usar outra stack free (FAISS em vez de ChromaDB, Ollama para embeddings locais, etc). O que importa é que funcione e seja gratuito.

**Tarefa:**
1. Usando o **GitHub Copilot**, implemente um pipeline de RAG mínimo com estas etapas:
   - **Ingestão:** Um script que lê os documentos do Anexo A (como texto), divide em chunks (defina a estratégia de chunking e justifique), gera embeddings, e armazena no ChromaDB.
   - **Busca:** Uma função que recebe uma pergunta, gera o embedding da pergunta, busca os N chunks mais similares no ChromaDB, e retorna os chunks com score de similaridade.
   - **Montagem de prompt:** Uma função que recebe os chunks recuperados e a pergunta, e monta o prompt completo (system prompt + chunks + pergunta) pronto para enviar ao LLM.

2. Teste o pipeline com ao menos 5 perguntas do mapa de cobertura do Anexo B. Para cada pergunta, documente: quais chunks foram recuperados, se são os chunks corretos (compare com o gabarito), e o score de similaridade.

3. Usando o **Claude** (chat), cole o prompt montado pelo pipeline e obtenha a resposta. Avalie: está correta? Citou fonte? Respeitou guardrails?

4. Identifique ao menos 2 problemas encontrados (ex: chunk errado recuperado, documento irrelevante no topo, chunking que cortou uma tabela no meio) e proponha correções.

**Entregável:** O código do pipeline (com evidência do Copilot), os resultados dos 5 testes com análise, e as propostas de correção.

**Critérios de avaliação:**
- O pipeline é funcional: ingere, busca e retorna chunks relevantes (não precisa ser perfeito, mas precisa rodar).
- A estratégia de chunking é justificada (não é apenas "512 tokens fixos" sem motivo).
- Os testes usam perguntas realistas do domínio e são comparados com o gabarito do Anexo B.
- Os problemas identificados são reais e as propostas de correção são concretas.
- O participante demonstra entendimento de que RAG é um sistema de engenharia de dados, não apenas chamada de API.

---

### TECH LEAD

#### Exercício 1.1 — Decisões arquiteturais documentadas como ADRs

**Contexto:** Você é o Tech Lead do projeto e precisa tomar e documentar decisões arquiteturais fundamentadas nas capacidades e limitações reais da IA generativa. Cada decisão deve ser registrada como um ADR (Architecture Decision Record) independente.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- A análise técnica do desenvolvedor (simulada): *"Base estimada em ~12M tokens. PDFs com tabelas complexas são o maior desafio para extração. Documentos escaneados (~15% da base) precisarão de OCR. Documentos contraditórios foram identificados em ao menos 3 procedimentos. Recomendação de chunking por seção com overlap de 10%."*
- Os requisitos do Product Specialist (simulados): *"Respostas devem citar fonte. Documentos contraditórios devem mostrar ambas as versões com indicação de data. Atualização máxima de 24h após publicação de novo documento. O assistente nunca deve inventar informações."*
- Formato de ADR:
  ```
  # ADR-NNNN: [Título da Decisão]
  ## Status: Proposto / Aceito / Depreciado
  ## Contexto: [Qual problema estamos resolvendo? Que forças atuam?]
  ## Decisão: [O que decidimos fazer?]
  ## Consequências: [O que isso implica — positivo e negativo?]
  ## Alternativas consideradas: [O que mais avaliamos e por que descartamos?]
  ```

**Tarefa:**
Usando o **Claude**, produza 4 ADRs independentes, uma para cada decisão abaixo. Para cada ADR, peça ao Claude que atue como "devil's advocate": apresente a decisão e peça que argumente contra. Use os contra-argumentos para fortalecer ou revisar a decisão.

**ADR-0001 — Escolha do modelo de LLM:** Considerando o ecossistema Microsoft, avalie Azure OpenAI (GPT-4o) vs alternativas (Claude via API, modelos open-source via Ollama). Justifique considerando: custo por token para o volume estimado (320 chamados/dia × 60% com consulta), janela de contexto necessária, o requisito de não alucinar, e integração com o stack Azure.

**ADR-0002 — Estratégia de gerenciamento de contexto:** Como o pipeline gerencia o contexto que o LLM recebe? Defina: tamanho máximo de contexto por query, número de chunks recuperados, estratégia para perguntas multi-domínio (que cruzam SLA + frete + devolução), e como lidar com context rot em conversas longas (o bot no Teams pode ter múltiplas perguntas na mesma sessão).

**ADR-0003 — Tratamento de documentos contraditórios:** Como o pipeline deve tratar duas versões de um mesmo documento? Opções incluem: manter apenas a mais recente, manter ambas com metadado de vigência, ou delegar a decisão ao LLM com instrução no prompt.

**ADR-0004 — Build vs buy para o pipeline de RAG:** Construir com LangChain/LlamaIndex + ChromaDB/FAISS (open-source, mais controle) vs usar Azure AI Search + Azure OpenAI nativo (managed, menos controle, mais integrado). Considere: custo, complexidade operacional, flexibilidade, e o fato de que a NovaTech já tem Azure.

**Entregável:** Os 4 ADRs completos no formato especificado e o histórico de "devil's advocate" com o Claude para ao menos 2 das 4 decisões.

**Critérios de avaliação:**
- Cada ADR é independente e autossuficiente (pode ser lido isoladamente).
- As decisões são fundamentadas em trade-offs explícitos, não em preferência de tecnologia.
- A ADR-0002 (contexto) demonstra compreensão de engenharia de contexto — context rot, orçamento de atenção, perguntas multi-domínio.
- A ADR-0003 (contradições) demonstra entendimento de que RAG é um problema de dados, não só de modelo.
- O uso do Claude como devil's advocate melhorou a qualidade das decisões (as versões finais são mais robustas que as iniciais).

---

#### Exercício 1.2 — Design de prompt engineering como artefato de arquitetura

**Contexto:** Você precisa definir a estratégia de prompt engineering e context engineering do projeto como artefato versionado. O prompt não é texto informal — é código que precisa ser gerenciado com o mesmo rigor.

**Ferramentas a utilizar:** Claude (chat) + GitHub Copilot

**Inputs fornecidos:**
- O cenário completo.
- O system prompt prototipado pelo desenvolvedor (simulado — use o prompt abaixo como base para melhorar):

```
Você é o assistente de atendimento da NovaTech, empresa de logística.
Responda perguntas sobre procedimentos, SLAs e regras de frete.
Use apenas as informações dos documentos fornecidos.
Cite a fonte. Se não souber, diga que não sabe.
```

- Os guardrails do Product Specialist: *"(1) Sempre citar fonte. (2) Nunca inventar prazos ou valores. (3) Quando não encontrar resposta, dizer explicitamente. (4) Responder em português formal."*
- Os chunks de referência do pipeline (ver **Anexo B**) para usar como dados de teste no script.

**Tarefa:**
1. Usando o **Claude**, defina: onde os prompts ficam versionados no repositório, como são nomeados, como são testados, e quem pode alterá-los.

2. Identifique quais partes do system prompt são estáticas (raramente mudam) e quais são dinâmicas (mudam conforme o contexto — ex: o tier do cliente, os chunks recuperados). Defina a "anatomia do contexto" completa de uma query: system prompt (estático) + metadados do cliente (dinâmico) + chunks recuperados (dinâmico) + pergunta (dinâmico) + histórico de conversa (dinâmico, crescente). Estime o tamanho de cada parte e defina o orçamento de contexto total.

3. Usando o **GitHub Copilot**, crie um script de teste automatizado de prompts: dado um prompt, um conjunto de perguntas e respostas esperadas, o script envia cada pergunta ao LLM e verifica se a resposta atende critérios básicos (contém citação de fonte, não contém termos proibidos, etc). O script não precisa ser completo — o objetivo é demonstrar o conceito.

4. Defina como o prompt se relaciona com o Harness: quais guardrails são enforçados no prompt (probabilístico) e quais deveriam ser enforçados fora do prompt (determinístico, ex: um filtro que valida se a resposta contém citação).

**Entregável:** O documento de estratégia com a anatomia de contexto, o script de teste gerado com o Copilot, e a análise de enforcement probabilístico vs determinístico.

**Critérios de avaliação:**
- Os prompts são tratados como código (versionados, testados, revisados).
- A anatomia de contexto demonstra pensamento de engenharia de contexto (não é apenas "o prompt" — é o contexto completo que o modelo recebe, com orçamento por parte).
- A separação entre enforcement probabilístico e determinístico demonstra maturidade de engenharia.
- O script de teste é funcional (ou ao menos demonstra claramente o conceito).

---

#### Exercício 1.3 — Revisão crítica de uma proposta de RAG

**Contexto:** Um desenvolvedor mais júnior propôs uma arquitetura de RAG. Você precisa revisar.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- A proposta (simulada): *"Vamos usar Azure AI Search com embeddings do ada-002. Todos os documentos serão indexados num único índice. Chunking fixo de 512 tokens sem overlap. O LLM recebe os 3 chunks mais similares. Usaremos GPT-4o para geração. O pipeline de ingestão roda manualmente quando alguém lembra de atualizar."*

**Tarefa:**
1. Faça sua própria revisão técnica da proposta: identifique ao menos 4 problemas ou riscos.

2. Em seguida, use o **Claude** para uma segunda revisão: forneça a proposta e peça ao Claude que identifique problemas. Compare a lista do Claude com a sua: o que o Claude encontrou que você não viu? O que você encontrou que o Claude não mencionou?

3. Para cada problema (de ambas as listas), proponha uma alternativa.

4. Reescreva a proposta incorporando as melhorias.

---

**Prompt sugerido para a Tarefa 2:**

```
Você é um revisor técnico sênior especialista em pipelines de RAG para aplicações enterprise.

**Contexto do projeto:**
A NovaTech é uma empresa de logística com ~1.250 documentos distribuídos em SharePoint (~800 PDFs/DOCX), Confluence (~400 páginas) e ~50 planilhas XLSX. O objetivo é um assistente de IA para o time de atendimento (45 pessoas, ~320 chamados/dia), integrado ao Microsoft Teams, que responda perguntas em linguagem natural com base na documentação oficial e cite a fonte. A documentação tem documentos contraditórios entre versões e é atualizada mensalmente por três áreas sem processo unificado.

**Proposta técnica a revisar:**
"Vamos usar Azure AI Search com embeddings do ada-002. Todos os documentos serão indexados num único índice. Chunking fixo de 512 tokens sem overlap. O LLM recebe os 3 chunks mais similares. Usaremos GPT-4o para geração. O pipeline de ingestão roda manualmente quando alguém lembra de atualizar."

**Minha revisão (feita antes desta conversa):**
[COLE AQUI OS PROBLEMAS QUE VOCÊ IDENTIFICOU NA TAREFA 1]

Preciso que você faça o seguinte, em ordem:

1. **Revisão independente:** Analise a proposta acima sem considerar minha revisão ainda. Liste cada problema ou risco que você identifica. Para cada item: descreva o problema, explique o impacto concreto no projeto da NovaTech, e indique qual aspecto do contexto (volume, contradições, frequência de atualização, tipo de pergunta) torna esse problema relevante aqui.

2. **Comparação:** Agora compare sua lista com a minha. Indique explicitamente: (a) o que você encontrou que eu não mencionei, e (b) o que eu encontrei que você não mencionou.

3. **Alternativas:** Para cada problema das duas listas combinadas, proponha uma alternativa concreta e justificada. Seja específico — evite recomendações vagas como "melhorar o chunking"; prefira "usar chunking por seção semântica com overlap de 10% (~50 tokens) para não perder contexto em fronteiras de parágrafo".

4. **Proposta reescrita:** Reescreva a proposta incorporando todas as melhorias. Mantenha o formato de proposta técnica objetiva e evite overengineering — a NovaTech tem orçamento para 3 meses e já opera no ecossistema Azure.
```

---

**Entregável:** Sua revisão original, a revisão do Claude, a comparação entre as duas, e a proposta reescrita.

**Critérios de avaliação:**
- Os problemas identificados são reais e demonstram compreensão de RAG (ex: chunking fixo sem overlap perde contexto em fronteiras; 3 chunks pode ser insuficiente para perguntas complexas; ingestão manual é um risco operacional).
- A comparação humano vs Claude é honesta (reconhece onde cada um acertou e errou).
- A proposta reescrita resolve os problemas sem overengineering.
- O exercício demonstra o uso de IA como par de revisão, não como substituto do julgamento.

---

### QA

#### Exercício 1.1 — Identificação de cenários de falha de IA (incluindo falhas de contexto)

**Contexto:** Você é o QA do projeto e precisa identificar cenários onde o assistente de IA pode falhar, considerando as características específicas de LLMs e os problemas que surgem quando o contexto é mal gerenciado.

**Ferramentas a utilizar:** Claude (chat)

**Inputs fornecidos:**
- O cenário completo.
- Os guardrails definidos pelo Product Specialist: *"(1) Sempre citar fonte. (2) Nunca inventar prazos ou valores. (3) Quando não encontrar resposta, dizer explicitamente. (4) Responder em português formal."*
- Uma explicação de alucinação: *"LLMs podem gerar respostas que parecem corretas e confiantes mas são fabricadas. Isso é especialmente perigoso quando o modelo 'preenche lacunas' misturando informação real com inferências não fundamentadas."*
- Uma explicação de problemas de contexto: *"Além da alucinação, existem falhas ligadas ao gerenciamento de contexto: context rot (em conversas longas, informação fornecida no início é 'esquecida'), lost in the middle (informação no meio de um contexto grande é menos processada que no início ou no fim), chunk errado (o retriever traz um trecho irrelevante ou de versão errada que contamina a resposta), e context overflow (a pergunta + chunks + prompt excedem a janela do modelo, causando truncamento)."*

**Tarefa:**
1. Crie sua própria lista inicial de cenários de falha (sem usar IA) com ao menos 4 cenários.

2. Em seguida, use o **Claude** para expandir a lista: forneça o cenário do projeto, os guardrails, e peça que identifique cenários de falha adicionais. O Claude deve gerar ao menos mais 4 cenários que você não pensou.

3. Consolide numa lista final de ao menos 10 cenários, organizados em categorias:
   - Alucinação (o assistente inventa informação) — ao menos 3 cenários.
   - Informação desatualizada ou contraditória — ao menos 2 cenários.
   - Falha de contexto (context rot, lost in the middle, chunk errado, overflow) — ao menos 3 cenários.
   - Recusa inadequada (diz que não sabe, mas a informação existe) — ao menos 1 cenário.
   - Falha de guardrail (responde em outro idioma, não cita fonte, etc) — ao menos 1 cenário.

4. Para cada cenário, defina: a pergunta de teste, o comportamento esperado, o comportamento indesejado, e como verificar.

**Entregável:** A lista inicial (feita sem IA), os cenários adicionais do Claude, e a lista final consolidada com evidência de qual cenário veio de qual fonte.

**Critérios de avaliação:**
- Os cenários são específicos ao domínio da NovaTech, não genéricos.
- A categoria "falha de contexto" demonstra compreensão de engenharia de contexto (ex: "quando o atendente faz 5 perguntas seguidas na mesma sessão do Teams, a resposta da 5ª pergunta ignora os chunks e repete informação do histórico" — isso é context rot).
- O participante gerou cenários próprios ANTES de usar o Claude (demonstra pensamento independente).
- A lista final integra contribuições humanas e de IA de forma coerente.
- Ao menos metade dos cenários inclui uma proposta de verificação automatizada.

---

#### Exercício 1.2 — Design de critérios de aceitação para respostas de IA

**Contexto:** O time precisa definir quando uma resposta do assistente é "boa o suficiente".

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- A documentação completa da NovaTech para verificação (ver **Anexo A**). Use os documentos do Anexo A como fonte de verdade para avaliar se as respostas abaixo estão corretas.
- 5 pares de pergunta/resposta gerados pelo assistente (simulados):

| # | Pergunta | Resposta do Assistente | Fonte Citada |
|---|----------|----------------------|--------------|
| 1 | "Qual o prazo de devolução?" | "O prazo é de 7 dias úteis, exceto para cargas perigosas classes 1 a 6 da ANTT." | POL-001, seção 3.2 |
| 2 | "Quanto custa frete para 600kg para Manaus?" | "O frete especial para cargas acima de 500kg para a região Norte tem multiplicador de 1.8 sobre o valor base." | PROC-042-v2, seção 2 |
| 3 | "Qual o SLA do cliente Platinum?" | "O cliente Platinum tem resposta em até 1h e resolução em até 12h." | SLA-2024 |
| 4 | "Posso devolver carga perigosa?" | "Sim, cargas perigosas podem ser devolvidas em até 7 dias úteis." | POL-001, seção 3.2 |
| 5 | "Qual o multiplicador de frete para o Sudeste?" | "O multiplicador regional para o Sudeste é 1.1." | PROC-042-v2, seção 2 |

**Tarefa:**
1. Avalie cada resposta por conta própria primeiro: está correta, parcialmente correta ou incorreta? Justifique com base nos documentos do **Anexo A**.

2. Usando o **Claude**, crie uma rubrica de avaliação com 4 dimensões (ex: precisão factual, citação de fonte, aderência aos guardrails, completude), cada uma com escala de 1-3 e descrição do que cada nível significa.

3. Usando o **Claude Cowork**, transforme a rubrica em um template de avaliação reutilizável (planilha ou formulário) que o time de QA possa usar para avaliar qualquer lote de respostas do assistente.

4. Aplique a rubrica às 5 respostas e gere uma pontuação para cada uma.

**Entregável:** A avaliação manual (feita antes da rubrica), a rubrica gerada com o Claude, o template do Cowork, e as pontuações aplicadas.

**Critérios de avaliação:**
- A resposta 3 é identificada como incorreta (o tier "Platinum" não existe na tabela SLA-2024 — o assistente alucionou tanto o tier quanto os valores de SLA).
- A resposta 4 é identificada como incorreta (cargas perigosas NÃO podem ser devolvidas, conforme a exceção explícita do POL-001).
- A rubrica é objetiva o suficiente para que dois QAs cheguem a pontuações semelhantes.
- O template é reutilizável (não é one-off para estas 5 respostas específicas).

---

#### Exercício 1.3 — Plano de testes para pipeline de RAG

**Contexto:** O pipeline de RAG precisa ser testado como qualquer outro componente do sistema.

**Ferramentas a utilizar:** Claude (chat) + Claude Cowork

**Inputs fornecidos:**
- O cenário completo.
- A documentação completa da NovaTech (ver **Anexo A**) e os chunks de referência (ver **Anexo B**). O mapa de cobertura do Anexo B (pergunta → chunks esperados) pode servir de base para os testes de retrieval.
- Uma descrição do pipeline: *"Documentos são extraídos das fontes, convertidos em texto, divididos em chunks, transformados em embeddings, e armazenados no Azure AI Search. Quando o usuário pergunta, a pergunta é convertida em embedding, busca-se os chunks mais similares, e o LLM gera a resposta com os chunks como contexto."*

**Tarefa:**
1. Usando o **Claude**, monte um plano de testes que cubra:
   - Testes de ingestão: como verificar que documentos foram corretamente extraídos, convertidos e indexados?
   - Testes de retrieval: dada uma pergunta conhecida, os chunks corretos são recuperados? Defina ao menos 5 pares pergunta → chunk esperado.
   - Testes de geração: dados os chunks corretos, o LLM gera resposta adequada? O que pode dar errado mesmo com os chunks certos?
   - Testes de contexto: como verificar que o contexto montado (prompt + chunks) está dentro do orçamento? Que o efeito *lost in the middle* não afeta respostas? Que conversas longas no Teams não degradam a qualidade?
   - Testes de ponta a ponta: pergunta → resposta com conjunto de perguntas e respostas esperadas.
   - Testes de regressão: quando prompt muda ou documento é atualizado, quais testes rodam automaticamente?

2. Usando o **Claude Cowork**, organize o plano num formato estruturado que possa ser compartilhado com o time e rastreado ao longo do projeto (ex: checklist com categorias, status e responsável).

**Entregável:** O plano de testes e o artefato organizado gerado pelo Cowork.

**Critérios de avaliação:**
- O plano testa cada etapa do pipeline separadamente E o fluxo integrado.
- Os testes de retrieval usam perguntas realistas do contexto de logística.
- Os testes de contexto demonstram compreensão de engenharia de contexto (context rot, orçamento, lost in the middle).
- O plano reconhece que testes de IA são diferentes de testes tradicionais (não-determinísticos, graus de qualidade em vez de pass/fail binário).
- O artefato do Cowork é prático e reutilizável.
