# Validação v2 (fase 0c, passo 5)

Instruções comuns aos validadores da segunda rodada. Você é **independente**: não conserta nada,
só lê e relata. A fase só fecha com **zero BLOQUEIA**; o que você marcar como BLOQUEIA volta para
um agente de correção.

## O que mudou desde a v1

A v1 (relatórios `docs/validacao/NNN-slug.md` e `000-contratos-entre-specs.md`, de 14/11) achou
19 bloqueios e 88 pedidos entre specs. Desde então:

1. Um arquiteto escreveu o contrato técnico único `docs/contrato/00` a `06`.
2. Os 7 `plan.md`/`tasks.md` foram refeitos contra ele e as `spec.md` corrigidas
   (`docs/contrato/LEIA-replanejamento.md`).
3. Os planos abriram 145 pedidos ao arquiteto, respondidos em `docs/contrato/pedidos/00-respostas.md`
   (incluindo a seção "Fechamento") e aplicados aos planos (`docs/contrato/LEIA-ajuste.md`).
4. Decisões do usuário: `docs/arquitetura.md` §7 (D-01 a D-06). Telas escolhidas:
   `docs/opcoes-tela/escolhas.md`.

## O que conferir

**Validador de spec (um por spec):**

- O checklist do Fluxo A da skill `mitra-escopo` e dos templates (`docs/templates/`), como na v1.
  A skill, lida direto do arquivo:
  `C:/Users/Isaac Portela/.claude/plugins/cache/benenutri/benenutri/0.10.0/skills/mitra-escopo/SKILL.md`
  e as referências que ela aponta.
- Cada BLOQUEIA e CORRIGIR do relatório v1 da spec: resolvido, mal resolvido ou não resolvido.
- Spec × contrato: todo nome de tabela, coluna, parâmetro, SF, fase e cargo usado no `plan.md` e no
  `tasks.md` existe no contrato com o mesmo nome e assinatura (confira por busca, não por memória).
- Spec × plan × tasks: todo cenário (C-NNN) e regra (RN-NNN) tem teste; todo teste tem tarefa; toda
  SF pública tem tarefa e teste; nada de "pendente do arquiteto" ou `[NEEDS CLARIFICATION]` sobrando.
- Orçamento de execuções (DT-29, teto 20 por clique; `ccJurDossieEnviar` até 30; abrir tela até 6
  por bloco): refaça a conta das SFs de escrita mais caras e veja se a linha dos passos bate com a
  do orçamento.
- Decisões D-01 a D-06 aplicadas; nenhum "arrastar" card; quadros pela lib.
- Cada tela do módulo aponta para a opção escolhida em `escolhas.md`; as telas sem desenho têm tarefa.
- Segurança e plataforma: identidade pela sessão (não por parâmetro vindo da tela), escrita guardada
  (DT-08, DT-09), nada de token em `VITE_*`, nada de produção, nada de migration à mão.

**Validador entre specs (um só):**

- Toda chamada de uma spec a SF, tabela ou parâmetro de outra existe na dona com o mesmo nome,
  parâmetros e saída.
- As 7 tasks juntas: as costuras de arquivo (01 §14) não fazem duas specs escreverem o mesmo
  arquivo; a ordem de construção (marcos M1/M2 da 001; 005 depois de 001, 004 e 002) é coerente;
  os seeds não colidem (faixas de código do elenco, 06).
- Quadros (05): cada fase usada nas specs existe; os ganchos de 004 e 005 no mesmo quadro somam
  sem conflito.
- Os resumos que o painel (006) e o histórico (007) leem existem nas donas.
- Números do índice (tabelas, parâmetros, SFs) batem com 02, 03, 04.

## Formato do relatório

Mesmo formato da v1: cabeçalho (o que foi lido), resumo com a contagem, checklist em tabela, e as
listas **BLOQUEIA** (impede construir certo), **CORRIGIR** (erro que vai virar defeito, mas não
impede começar) e **OBSERVAÇÃO**. Cada item com id (B-1, C-1, O-1), onde está (arquivo e seção ou
linha) e o que está errado em uma ou duas frases. Seja econômico: só o que achou, sem repetir o que
passou. Inclua uma seção curta "v1 → v2" com o destino de cada BLOQUEIA/CORRIGIR da v1.

Grave em `docs/validacao/NNN-slug-v2.md` (ou `000-contratos-entre-specs-v2.md`). Não escreva em
nenhum outro arquivo.

## Relate no fim (poucas linhas)

Contagem BLOQUEIA / CORRIGIR / OBSERVAÇÃO e os bloqueios em uma linha cada.
