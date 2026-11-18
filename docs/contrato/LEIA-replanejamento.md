# Replanejamento das specs contra o contrato (fase 0c)

Instruções comuns aos 7 agentes de replanejamento. Cada agente cuida de **uma** spec
(`docs/specs/NNN-slug/`) e só escreve dentro da pasta dela.

## Por que isto existe

As 7 specs foram escritas em paralelo e os planos não encaixavam (88 pedidos entre
specs, 37 lacunas, 19 bloqueios). O arquiteto escreveu um contrato técnico único em
`docs/contrato/`. Agora cada `plan.md` e `tasks.md` é **refeito contra o contrato**, e a
`spec.md` é corrigida onde o validador apontou defeito ou onde uma decisão posterior a mudou.

## Leia, nesta ordem

1. `docs/constitution.md` e `docs/arquitetura.md` (§7 decisões D-01 a D-05; §8 quadros na lib).
2. `docs/contrato/00-indice.md` inteiro; `01-convencoes.md` inteiro; depois a seção da sua
   spec em `02-dados.md`, `03-parametros.md`, `04-funcoes.md`; o(s) quadro(s) da sua spec em
   `05-quadros.md`; `06-seed-testes.md`.
3. `docs/validacao/NNN-<sua spec>.md` (bloqueios, correções, observações) e, em
   `docs/validacao/000-contratos-entre-specs.md`, os pedidos que envolvem a sua spec
   (o contrato 04 §11 diz como cada um foi resolvido).
4. A sua `spec.md`, `plan.md` e `tasks.md` atuais, e `docs/templates/{spec,plan,tasks}.md`.
5. `docs/opcoes-tela/escolhas.md`: a opção de layout que o usuário escolheu para cada tela do
   seu módulo (com as observações dele). O mockup da opção está no arquivo indicado, no
   `<template data-opcao>` da tela. As leituras das observações estão no fim de `docs/execucao.md`.
6. A skill da plataforma, direto do arquivo (ela não aparece na ferramenta Skill do subagente):
   `C:/Users/Isaac Portela/.claude/plugins/cache/benenutri/benenutri/0.10.0/skills/mitra-escopo/SKILL.md`
   (fluxo spec → plan → tasks, regras da plataforma, o que nunca fazer). Para as tarefas de
   tela, `…/skills/design/SKILL.md`.

## O que entregar

### `spec.md` — corrigir, não reescrever

- Resolva **todos** os bloqueios e correções do relatório do validador da sua spec. Observação
  você resolve se for barato; senão deixa.
- Aplique D-01 a D-05, a lib `@benenutri/mitra-kanban` (arquitetura §8) e as exceções E-1 a
  E-6 do índice do contrato. Card **não se arrasta**: tire todo "arrastar"; a mudança de fase
  é "Mover para" dentro do card aberto.
- Nomes de tabela, coluna, parâmetro, SF, fase e cargo passam a ser os do contrato (03 traz o
  de → para dos parâmetros).
- O que saiu da sua spec por causa do contrato (por exemplo, o que a 005 perdeu com o D-05)
  sai da spec, com uma linha em "Fora de escopo" dizendo quem ficou com aquilo.
- Mantenha a numeração dos cenários (C-NNN), requisitos (RF-NNN) e regras (RN-NNN) que
  continuam; item removido fica como "removido (motivo)", sem renumerar os demais.
- Pendência do gestor: use os números P-NN do índice do contrato, com o padrão adotado.
  Nenhuma pendência bloqueia.

### `plan.md` — refazer

- Siga `docs/templates/plan.md`.
- **Não copie o contrato: aponte para ele.** Tabelas, colunas, parâmetros e assinaturas de SF
  estão no contrato; o plano cita o nome e a seção (`02 §3`, `04 §2`) e explica só o que o
  contrato não diz: algoritmo, ordem das escritas, casos de borda, como testar.
- Diga, por SF pública da sua spec, o cenário que ela atende e o teste de smoke que a cobre.
- Arquivos: use as costuras do contrato (01, "costuras de arquivo"). Nenhum arquivo de outra
  spec é editado; extensão de tela é por `registrarExtensao()`.
- Tela: cada tela do seu módulo aponta para a opção escolhida em `escolhas.md` e diz que
  componentes do design system e da lib a montam. Para cobrança e concessão (002 e 004), a
  tela é uma só para as três carteiras.
- Liste o que depende do sandbox (S-01 a S-14) e o plano B que o contrato já escreveu.

### `tasks.md` — refazer

- Siga `docs/templates/tasks.md`. Tarefa pequena, verificável, com o arquivo que toca e o
  teste que prova.
- Duas trilhas marcadas: **Backend** (schema, parâmetros, SFs, quadro, seed, smoke) e
  **Frontend** (telas com a opção escolhida, testes de tela). O backend inteiro vem antes.
- Toda tarefa de SF tem a tarefa de smoke correspondente; cenário da spec sem teste é defeito.
- Marque com `[P]` o que pode andar em paralelo dentro da sua spec.

## Regras

- **Só escreva em `docs/specs/NNN-<sua spec>/`.** Não toque no contrato, na arquitetura, nas
  outras specs, nas telas de opção nem em código.
- Achou erro, lacuna ou contradição no contrato? Não conserte por conta própria e não invente
  nome: escreva em `docs/contrato/pedidos/NNN-<sua spec>.md` (crie o arquivo) o ponto, onde
  está e o que você propõe, e siga com a proposta marcada como "pendente do arquiteto" no plano.
- Nada de produção: nenhum comando do mitra-sdk, nenhum `setup-backend.mjs`/`add-*.mjs`
  executado, nenhuma migration criada à mão.
- Texto em português, com acentuação, direto. Sem repetir o que o contrato já diz.

## Relate no fim (poucas linhas)

Cenários, requisitos, SFs públicas e internas, tabelas e telas da spec depois da revisão; o
que entrou e o que saiu; bloqueios do validador resolvidos (quantos de quantos) e os que não
deu para resolver, com o motivo; pedidos ao arquiteto abertos; riscos que você vê na construção.
