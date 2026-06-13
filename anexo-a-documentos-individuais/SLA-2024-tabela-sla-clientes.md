# SLA-2024 — Tabela de SLA por Tipo de Cliente

**Versão:** 2024.1
**Última atualização:** 02/01/2024
**Responsável:** Diretoria Comercial + Diretoria de Operações
**Classificação:** Documento contratual — os SLAs listados aqui são compromissos formais com o cliente

## 1. Classificação de clientes

A NovaTech classifica seus clientes em 3 (três) tiers com base no volume mensal de operações e no valor do contrato:

| Tier | Critério de elegibilidade | Revisão |
|------|--------------------------|---------|
| Gold | Contrato anual acima de R$ 500.000 OU mais de 200 operações/mês | Semestral |
| Silver | Contrato anual entre R$ 100.000 e R$ 500.000 OU entre 50 e 200 operações/mês | Semestral |
| Standard | Todos os demais clientes | Anual |

Nota: Não existem outros tiers além dos três listados acima. Solicitações de SLA diferenciado fora desses tiers devem ser encaminhadas ao Comercial para análise de viabilidade.

## 2. Tabela de SLAs

| Métrica | Gold | Silver | Standard |
|---------|------|--------|----------|
| Tempo de primeira resposta (chamados gerais) | Até 2h úteis | Até 4h úteis | Até 8h úteis |
| Tempo de resolução (chamados gerais) | Até 24h úteis | Até 48h úteis | Até 72h úteis |
| Tempo de primeira resposta (incidentes críticos) | Até 30min | Até 1h | Até 2h |
| Tempo de resolução (incidentes críticos) | Até 4h | Até 8h | Até 24h |
| Disponibilidade do portal de tracking | 99,5% | 99,0% | 98,0% |
| Gerente de conta dedicado | Sim | Não | Não |
| Relatório mensal de performance | Sim (detalhado) | Sim (resumido) | Sob demanda |

## 3. Definição de incidente crítico

Um incidente é classificado como crítico quando atende a pelo menos um dos seguintes critérios:

- Carga com valor declarado acima de R$ 100.000 está com status desconhecido há mais de 6 horas.
- Carga perigosa com qualquer irregularidade de documentação ou rastreamento.
- Mais de 5 chamados do mesmo cliente nas últimas 24 horas sobre o mesmo problema.
- Qualquer situação que envolva risco à segurança de pessoas.

## 4. Penalidades por descumprimento

- Primeira violação de SLA no mês: registro interno, sem impacto contratual.
- Segunda violação no mesmo mês: crédito de 5% sobre o valor do frete do chamado afetado.
- Terceira violação ou mais no mesmo mês: crédito de 10% + reunião obrigatória com o gerente de conta (Gold) ou gerente de operações (Silver/Standard).

## 5. Medição e reportes

Os SLAs são medidos pelo sistema de chamados (Azure DevOps) a partir do timestamp de abertura do chamado. O relógio de SLA pausa fora do horário comercial (08h-18h, dias úteis) para chamados gerais, mas não pausa para incidentes críticos de clientes Gold.
