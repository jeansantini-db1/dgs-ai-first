# Prompt — Tech Lead | Exercício 1.3: Revisão Técnica de Proposta de Pipeline RAG

> **Como usar:** Cole este prompt integralmente no Claude (chat) como primeira mensagem da conversa. O prompt é autossuficiente — inclui todo o contexto necessário para a revisão.

---

## CONTEXTO DO PROJETO

Você é um revisor técnico sênior especialista em pipelines de RAG para aplicações enterprise.

A NovaTech é uma empresa de logística com ~1.250 documentos distribuídos em SharePoint (~800 PDFs/DOCX), Confluence (~400 páginas) e ~50 planilhas XLSX. O objetivo é um assistente de IA para o time de atendimento (45 pessoas, ~320 chamados/dia), integrado ao Microsoft Teams, que responda perguntas em linguagem natural com base na documentação oficial e cite a fonte. A documentação tem documentos contraditórios entre versões e é atualizada mensalmente por três áreas sem processo unificado.

---

## PROPOSTA TÉCNICA A REVISAR

"Vamos usar Azure AI Search com embeddings do ada-002. Todos os documentos serão indexados num único índice. Chunking fixo de 512 tokens sem overlap. O LLM recebe os 3 chunks mais similares. Usaremos GPT-4o para geração. O pipeline de ingestão roda manualmente quando alguém lembra de atualizar."

---

## MINHA REVISÃO _(feita antes desta conversa)_

```
1. Problema: Chunking fixo de 512 tokens sem overlap. | Impacto: Se o corte cair entre duas seções que se complementam entre si, como por exemplo, uma segunda seção que complementa ou adiciona uma exceção do que se tem como contexto da seção 1. a LLM poderia considerar como provável somente o chunk 1 em momentos onde a info do chunk 2 é importante. | Solução: Criar um overlap de aproximadamente 50 tokens, pegando o final do chunk 1 e inserindo no chunk 2, preservando o contexto.

2. Problema: Pipeline sem previsibilidade | Impacto: Corre o risco de ficar desatualizado e resultar em respostas incorretas | Solução: Pipeline automatizada (triggers) para criação/modificação. Ao rodar o pipeline, fazer um delete (soft) dos chunks antigos.

3. Problema: Ausência de Monitoramento | Impacto: Não há como medir uma taxa de erro ou identificar falha com relação à documentação. | Solução: Logar interações. Criar filtros e dashboards para revisão.

4. Problema: Índice único sem distinção. | Impacto: Aumento da similaridade de chunks de versões mais antigas dos documentos. | Solução: Adicionar índices separados por título do documento, versão, data, ou algum filtro específico que ajude a encontrar a versão correta.

5. Problema: Somente 3 chunks para o LLM | Impacto: Se o chunk relevante está na posição 4 por similaridade, será descartado. Somente 3 Pode ser muito pouco para o cenário de 1.250 documentos. | Solução: Aumentar para top-7 por similaridade.
```

---

## TAREFA

Preciso que você faça o seguinte, em ordem:
1. **Revisão independente:** Analise a proposta acima sem considerar minha revisão ainda. Liste cada problema ou risco que você identifica. Para cada item: descreva o problema, explique o impacto concreto no projeto da NovaTech, e indique qual aspecto do contexto (volume, contradições, frequência de atualização, tipo de pergunta) torna esse problema relevante aqui.
2. **Comparação:** Agora compare sua lista com a minha. Indique explicitamente: (a) o que você encontrou que eu não mencionei, e (b) o que eu encontrei que você não mencionou.
3. **Alternativas:** Para cada problema das duas listas combinadas, proponha uma alternativa concreta e justificada. Seja específico — evite recomendações vagas como "melhorar o chunking"; prefira "usar chunking por seção semântica com overlap de 10% (~50 tokens) para não perder contexto em fronteiras de parágrafo".
4. **Proposta reescrita:** Reescreva a proposta incorporando todas as melhorias. Mantenha o formato de proposta técnica objetiva e evite overengineering — a NovaTech tem orçamento para 3 meses e já opera no ecossistema Azure.