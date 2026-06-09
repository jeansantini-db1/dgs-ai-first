# Histórico — Tarefa 1 - Estratégia de versionamento de prompts 
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

---

## Output (Resposta)

Aqui está a estratégia completa, tratando prompts com o mesmo rigor de código de produção no contexto da NovaTech.

---

### Prompt como Código de Produção — NovaTech RAG Assistant

---

#### 1.1 — Localização no Repositório

**Princípio:** prompts vivem no mesmo repositório do código de orquestração, mas em módulo isolado. Isso garante rastreabilidade por commit, PRs unificados e pipeline de CI/CD compartilhado sem misturar responsabilidades.

```
novatech-rag/
├── src/                          # Código de orquestração (Prompt Flow / Python)
│   ├── flows/
│   │   ├── rag_main.flow.yaml
│   │   └── retrieval.py
│   └── utils/
│
├── prompts/                      # ← Módulo de prompts (tratado como código)
│   ├── system/                   # System prompts estáticos
│   ├── few-shot/                 # Exemplos de few-shot por domínio
│   ├── fallback/                 # Instruções de fallback e edge cases
│   ├── fragments/                # Blocos reutilizáveis (ex: bloco de citação, bloco de tom)
│   └── _schema/                  # JSON Schema de validação estrutural dos arquivos
│
├── tests/
│   ├── prompt-evals/             # Testes automatizados de prompt (golden set)
│   │   ├── cases/                # Casos de teste em YAML
│   │   └── results/              # Histórico de runs (não comitar outputs, só schema)
│   └── unit/
│
├── config/
│   ├── prompts.dev.yaml          # Referências de versão ativa por ambiente
│   ├── prompts.hml.yaml
│   └── prompts.prod.yaml         # ← Alterado somente via PR aprovado
│
└── .github/ (ou azure-pipelines/)
    └── prompt-validation.yml     # Pipeline de lint + eval automático
```

**Separação código × prompt:** o Prompt Flow referencia prompts via variável de configuração, nunca com caminho hardcoded. Isso permite trocar um prompt sem retocar o código de orquestração.

```yaml
# config/prompts.prod.yaml
system_prompt: "prompts/system/atd-system-v1.2.0-prod.md"
fallback_instruction: "prompts/fallback/atd-fallback-v1.0.1-prod.md"
few_shot_sla: "prompts/few-shot/atd-fewshot-sla-v1.1.0-prod.md"
```

**Fluxo de alteração urgente em produção (hotfix):**

```
1. Branch: hotfix/prompt-atd-fallback-msg-urgente
2. Editar APENAS o arquivo de prompt afetado
3. Rodar eval local: make eval PROMPT=fallback (mínimo 15 casos do golden set)
4. PR direto para main com label [hotfix] — revisão por 1 aprovador (Tech Lead OU Product Spec.)
5. Merge → pipeline atualiza config/prompts.prod.yaml automaticamente
6. Post-mortem em até 48h documentado na própria PR
```

Regra: o hotfix não dispensa testes — apenas reduz o quórum de aprovação de 2 para 1.

---

#### 1.2 — Convenção de Nomenclatura

**Padrão:**

```
{componente}-{tipo}-{domínio}-v{MAJOR}.{MINOR}.{PATCH}-{env}.md
```

| Segmento | Valores possíveis | Significado |
|---|---|---|
| `componente` | `atd` (atendimento), `ret` (retrieval), `sum` (sumarização) | Qual parte do sistema |
| `tipo` | `system`, `fewshot`, `fallback`, `fragment` | Natureza do prompt |
| `domínio` | `sla`, `frete`, `contrato`, `geral` | Escopo funcional |
| `vMAJOR` | Quebra de contrato de comportamento | Mudança que invalida golden set existente |
| `MINOR` | Nova instrução, novo guardrail | Adição retrocompatível |
| `PATCH` | Correção de wording, typo | Sem impacto funcional esperado |
| `env` | `dev`, `hml`, `prod` | Ambiente de destino |

**Exemplos concretos:**

```
# System prompt de atendimento — versão de produção
prompts/system/
  atd-system-geral-v1.2.0-prod.md       ← ativo em prod hoje
  atd-system-geral-v1.3.0-hml.md        ← candidato em homologação
  atd-system-geral-v2.0.0-dev.md        ← refatoração experimental

# Few-shot examples para SLA
prompts/few-shot/
  atd-fewshot-sla-v1.1.0-prod.md        ← exemplos de consulta de prazo
  atd-fewshot-frete-v1.0.0-prod.md      ← exemplos de regras de frete

# Instrução de fallback
prompts/fallback/
  atd-fallback-geral-v1.0.1-prod.md     ← "Não encontrei essa informação..."
  atd-fallback-geral-v1.0.2-hml.md      ← ajuste de tom após feedback do PS
```

**Regra de ouro:** o sufixo de ambiente (`-prod`, `-hml`, `-dev`) é controlado pelo `config/prompts.{env}.yaml`, não pelo nome em si — o arquivo físico pode ter `-hml` no nome e nunca ser promovido. O YAML de configuração é a fonte de verdade sobre o que está ativo.

O versionamento segue semver porque torna imediato o impacto de uma alteração: `v1.0.0 → v1.0.1` é correção de texto; `v1.0.0 → v2.0.0` exige re-aprovação completa do golden set.

---

#### 1.3 — Processo de Revisão e Aprovação

**Verificações obrigatórias antes do merge (checklist de PR):**

```markdown
## PR Checklist — Alteração de Prompt

### Automático (CI bloqueia merge se falhar)
- [ ] Lint estrutural: arquivo segue schema JSON (campos obrigatórios: version, author, changelog, guardrails)
- [ ] Eval automatizado: ≥ 90% de pass rate no golden set (43 casos atualmente)
- [ ] Nenhuma regressão em casos marcados como [crítico] no golden set
- [ ] Token count estimado dentro do orçamento de 12.000 tokens/query
- [ ] Nome do arquivo segue convenção de nomenclatura

### Manual (revisores humanos)
- [ ] Todos os guardrails do Product Specialist preservados (citar fonte, nunca inventar valores, português formal)
- [ ] Changelog preenchido com motivação da alteração
- [ ] Casos de teste novos adicionados se o PR cobre cenário ainda não testado
- [ ] Impacto no custo estimado (tokens adicionais × volume de queries)
```

**Quórum de aprovação por tipo de mudança:**

| Tipo de alteração | Aprovadores necessários |
|---|---|
| PATCH (wording, typo) | 1 × (Tech Lead OU Product Spec.) |
| MINOR (nova instrução, guardrail) | Tech Lead + Product Spec. |
| MAJOR (reestruturação, mudança de contrato) | Tech Lead + Product Spec. + Delivery Manager (ciência) |
| Hotfix em produção | 1 × (Tech Lead OU Product Spec.) + post-mortem em 48h |

**Critério para aceitar v2 com 95% de melhoria e 2 regressões:**

A resposta depende do que regrediu. A regra é:

> **Regressão em caso [crítico] = bloqueio incondicional.** Regressão em caso [normal] = análise de risco.

Casos críticos são aqueles que envolvem: invenção de prazos ou valores, resposta em idioma errado, ausência de citação de fonte, ou falha total de resposta. Qualquer regressão nesses casos bloqueia o merge independentemente do ganho geral.

Para casos normais, o critério de aceitação segue esta lógica:

```
SE as 2 regressões são em casos [normal]
  E existe workaround documentado para os atendentes
  E o Product Specialist valida que o ganho de 95% justifica o risco
  E um ticket de acompanhamento é aberto para v2.0.1 corrigir as regressões
ENTÃO → aceitar com aprovação MAJOR (3 papéis)

CASO CONTRÁRIO → rejeitar e iterar para v2.0.1 que cubra os 2 casos
```

A prática recomendada é não lançar v2 enquanto existirem regressões conhecidas se o prazo permitir — 3 meses de projeto significa que cada regressão em produção tem custo alto de confiança com os 45 atendentes.

---

#### 1.4 — Ownership

| Papel | Pode propor alteração? | Pode aprovar PR? | Pode implantar em produção? |
|---|---|---|---|
| **Tech Lead** | ✅ Sim | ✅ Sim (qualquer tipo) | ✅ Sim (executa o merge/deploy) |
| **Desenvolvedor** | ✅ Sim | ⚠️ Apenas PATCH | ❌ Não |
| **QA** | ✅ Sim | ⚠️ Apenas validação técnica (não é aprovador de conteúdo) | ❌ Não |
| **Product Spec.** | ✅ Sim (principal autor de intenção) | ✅ Sim (MINOR e MAJOR obrigatório) | ❌ Não |
| **Delivery Manager** | ✅ Sim (requisitos de negócio) | ⚠️ Apenas ciência em MAJOR | ❌ Não |

**Justificativas das restrições mais importantes:**

**Por que Desenvolvedor não aprova MINOR/MAJOR?**
O desenvolvedor raciocina sobre código, não sobre impacto no comportamento do assistente para os atendentes. Uma instrução nova ("sempre mencionar o contrato do cliente antes do SLA") parece inofensiva tecnicamente e pode ser catastrófica operacionalmente. O Product Specialist tem o contexto de negócio para julgar esse impacto.

**Por que Product Spec. não implanta em produção?**
Separação de responsabilidades clássica: quem define o conteúdo não opera a infraestrutura. O PS não tem visibilidade sobre dependências do Prompt Flow, configuração do Azure AI Search ou possíveis efeitos colaterais no pipeline. O deploy é ato técnico com consequências sistêmicas, não apenas de conteúdo.

**Por que QA não é aprovador de conteúdo?**
O QA valida que os testes passam e que a cobertura do golden set é adequada — isso é aprovação técnica de processo, não de mérito. A decisão sobre se um prompt "diz a coisa certa" é do Product Specialist. Mesclar essas responsabilidades cria ambiguidade sobre quem responde por uma resposta incorreta do assistente.

**Por que Delivery Manager só tem ciência em MAJOR?**
Em um time de 5 pessoas com 3 meses de prazo, exigir o DM em toda alteração é overhead que trava o ciclo. Mas mudanças MAJOR têm impacto de escopo e risco que o DM precisa conhecer para gerenciar expectativas com stakeholders. É ciência, não veto — o DM não bloqueia o merge, registra o conhecimento.

---

#### Crítica Franca: O que é Genérico Demais ou Impraticável

Após estruturar essa estratégia, é preciso ser honesto sobre o que não sobrevive ao contexto real de 5 pessoas em 3 meses:

**O que vai parecer burocrático demais e ser abandonado:**

O golden set com 43 casos e pipeline de CI que bloqueia merge é o ponto mais vulnerável. Montar, manter e evoluir um eval set dá trabalho de QA dedicado. Com 1 QA no time, o risco real é que o golden set fique desatualizado na semana 4 e a equipe passe a fazer merges "na fé" porque o CI está quebrando por casos obsoletos. **Mitigação pragmática:** começar com 15 casos críticos, não 43. Prioridade absoluta: os guardrails do PS (invenção de valores, ausência de fonte). Crescer o set organicamente.

**O quórum duplo (Tech Lead + PS) para MINOR vai emperrar:**

Em um time pequeno e presencial (ou no mesmo Teams), a tendência é resolver no chat e fazer o PR virar formalidade. Isso é perigoso porque perde o histórico de decisão. **Mitigação:** o PR não precisa de reunião — o comentário de aprovação no PR é suficiente, mesmo que seja "aprovado, discutimos no Teams." O registro importa mais que o ritual.

**Versionamento semver de prompts é conceitualmente correto, mas operacionalmente confuso:**

Desenvolvedores entendem semver para APIs. Para prompts, a linha entre MINOR e MAJOR é subjetiva — "adicionar instrução de citar região do contrato" é MINOR ou MAJOR? Sem critério explícito escrito no SKILL.md do time, cada PR vai gerar discussão. **Mitigação:** criar uma tabela de 10 exemplos concretos de o que conta como PATCH/MINOR/MAJOR para esse projeto específico, não genérico.

**O que deve ser mantido mesmo sob pressão de prazo:**

Três práticas que custam pouco e têm ROI alto em 3 meses: (1) todo arquivo de prompt tem cabeçalho com `version`, `author` e `changelog` de 1 linha — rastreabilidade mínima sem processo; (2) `config/prompts.prod.yaml` como fonte de verdade — nunca caminho hardcoded no código; (3) o critério de regressão crítica como bloqueio incondicional — esse é o único guardrail que não pode ser negociado, porque uma resposta inventando prazo ou valor chega aos 45 atendentes em produção em segundos.

---

## Comunicações extras

### [Pergunta]

Quais partes dessa estratégia seriam as primeiras a serem abandonadas sob pressão de prazo? Como torná-las obrigatórias mesmo assim?

### [Resposta]

Boa pergunta — e honesta. A pressão de prazo não elimina riscos, só os torna invisíveis até explodirem.

Vou direto ao ponto: há uma hierarquia clara de abandono sob pressão, e a solução não é disciplina — é reduzir o custo de fazer a coisa certa.

---

#### O que cai primeiro, e por quê

**1º a cair: o golden set e o CI de evals**

É o mais trabalhoso de criar e o mais fácil de racionalizar abandonar. O argumento clássico: *"a gente conhece o sistema, não precisa de teste automatizado para mudar duas linhas de prompt."* Na semana 6 de um projeto de 12, isso já está acontecendo.

O mecanismo de falha é insidioso: o golden set não é deletado — ele apodrece. Os casos ficam desatualizados, o CI começa a falhar por motivos legítimos, a equipe aprende a ignorar o pipeline, e na semana 10 ninguém sabe se o prompt de produção passa nos testes porque ninguém mais roda.

**2º a cair: o quórum duplo para alterações MINOR**

Product Specialist e Tech Lead raramente estão disponíveis ao mesmo tempo. A pressão cria o atalho: *"o PS já validou no Teams, vou só registrar aqui."* O PR passa sem comentário formal de aprovação. Em 2 semanas isso vira padrão silencioso.

**3º a cair: o changelog e o cabeçalho dos arquivos**

É o mais barato de manter e ainda assim desaparece. Ninguém quer escrever `## Changelog` quando está com PR na fila e o cliente esperando. O arquivo vai para produção sem histórico, e na semana 11 ninguém sabe por que `v1.3.0` existe.

**O que nunca cai (e por quê):**

O `config/prompts.prod.yaml` como fonte de verdade — porque se alguém hardcodar o caminho no código, quebra na hora. Dor imediata = compliance natural. Esse é o padrão a replicar.

---

#### Como tornar cada um obrigatório de verdade

A lógica central é sempre a mesma: **se fazer errado dói mais do que fazer certo, a equipe faz certo.** Motivação e disciplina não escalam. Fricção e automação, sim.

---

##### Golden set e CI de evals

**O problema real** não é falta de disciplina — é custo de criação. Ninguém cria 43 casos de teste em uma sprint já apertada.

**Solução: mínimo viável que trava o pipeline**

Comece com 8 casos, não 43. Esses 8 cobrem apenas as falhas catastróficas:

```yaml
# tests/prompt-evals/cases/criticos.yaml
- id: C01
  input: "Qual o prazo de entrega para SP zona sul?"
  must_not_contain: ["dias úteis", "horas", "prazo de"]  # nunca inventar valor
  must_contain_pattern: "Não encontrei"  # ou citação real
  severity: CRITICAL

- id: C02
  input: "Me explica o SLA gold"
  must_contain: ["fonte:", "seção"]  # guardrail de citação
  severity: CRITICAL
```

O CI roda esses 8 em menos de 30 segundos. **Bloqueia o merge se qualquer CRITICAL falhar.** Não precisa de 43 casos para isso — precisa dos casos certos.

A regra de crescimento: cada bug reportado em produção vira obrigatoriamente um caso novo no golden set antes de ser fechado. O set cresce organicamente a partir de falhas reais, não de exercício teórico.

---

##### Quórum de aprovação

**O problema real** é fricção de sincronização, não falta de vontade.

**Solução: aprovação assíncrona com prazo explícito**

Substitua "aprovação simultânea" por "aprovação com janela de 24h":

```markdown
# Template de PR — Alteração de Prompt MINOR

Reviewers obrigatórios: @tech-lead @product-specialist
Prazo: aprovação em até 24h úteis ou PR é automaticamente fechado.

Discussão no Teams conta APENAS se o comentário de aprovação
for replicado aqui. Mensagem de Teams não é registro oficial.
```

O PR fechado automaticamente parece draconiano — e é. Mas cria o incentivo certo: o autor do PR garante que os revisores viram, porque se não viu, o trabalho some. Na prática, isso resolve o problema de PR aberto eternamente sem revisão.

Para PATCH, uma variação: **silêncio é aprovação após 4h em horário comercial.** O Tech Lead pode mergir se não houver objeção. Isso elimina o gargalo para mudanças triviais sem abrir exceção para as que importam.

---

##### Changelog e cabeçalho

**O problema real** é que é opcional e ninguém cobra na hora.

**Solução: lint que bloqueia merge**

Um script de 15 linhas no CI valida o cabeçalho antes de qualquer revisão humana:

```python
# scripts/lint_prompt_header.py
REQUIRED_FIELDS = ["version:", "author:", "changed:"]

def validate(filepath):
    content = open(filepath).read()
    for field in REQUIRED_FIELDS:
        if field not in content[:500]:  # só o cabeçalho
            raise SystemExit(f"ERRO: '{field}' ausente em {filepath}")
```

```yaml
# azure-pipelines/prompt-validation.yml
- script: python scripts/lint_prompt_header.py $(changedPromptFiles)
  displayName: 'Lint: cabeçalho obrigatório'
  condition: |
    contains(variables['Build.SourceVersionMessage'], 'prompts/')
```

O template do cabeçalho vai no `CONTRIBUTING.md` e como snippet no VS Code do time. Custo de fazer certo: 20 segundos. Custo de não fazer: merge bloqueado.

---

#### A regra meta

Toda prática que depende de alguém **lembrar** de fazer vai ser abandonada. Toda prática que depende de alguém **decidir ignorar ativamente** sobrevive.

Traduzindo para esse projeto:

| Prática | Mecanismo de sobrevivência |
|---|---|
| Golden set mínimo | CI bloqueia merge — ignorar exige ação deliberada |
| Quórum de aprovação | PR fecha sozinho após 24h — ignorar tem consequência visível |
| Changelog | Lint bloqueia merge — ignorar exige bypassar o pipeline |
| `prompts.prod.yaml` como fonte de verdade | Hardcode quebra o sistema — já é mecanismo natural |

O que não tem mecanismo de enforcement vai cair. Não por má vontade — por física de projeto.

---

#### Uma última ressalva honesta

Mesmo com tudo isso, há um risco residual que nenhum processo resolve: se o Tech Lead decide que o prazo justifica bypassar o CI (`--no-verify` ou aprovação manual no portal do Azure DevOps), tudo cai. Em um time de 5 pessoas, o processo é tão forte quanto o comprometimento da liderança.

A única proteção real contra isso é o Product Specialist entender que ele é co-responsável pela qualidade dos prompts — não como aprovador de PR, mas como dono do comportamento do assistente. Quando o PS sente que uma regressão em produção é problema *dele*, o quórum de aprovação passa a ser interesse próprio, não burocracia imposta.
