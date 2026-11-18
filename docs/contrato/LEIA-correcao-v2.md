# Correção dos planos depois da validação v2 (fase 0c, passo 6b)

Instruções comuns aos 7 agentes de correção. Cada agente cuida de **uma** spec e só escreve em
`docs/specs/NNN-<sua spec>/`.

## Entradas

1. `docs/contrato/pedidos/01-correcoes-v2.md`: as decisões DT-34 a DT-42 e a seção da sua spec
   ("o que o plano desta spec precisa mudar"). Leia também a seção "Para o integrador".
2. `docs/validacao/NNN-<sua spec>-v2.md`: o relatório do seu validador. Resolva **todo BLOQUEIA e
   todo CORRIGIR**. Observação: resolva se for barato.
3. `docs/validacao/000-contratos-entre-specs-v2.md`: resolva os itens que citam a sua spec e que
   não estejam já cobertos pelo item 1.
4. O contrato (`docs/contrato/00` a `06`) para conferir nome, assinatura e valor de tudo que você
   escrever.

## Como corrigir

- Cirúrgico: mexa só no que os itens pedem. Não reescreva seções nem reformate o que está certo.
- Cenário ou regra que mudou de comportamento: ajuste spec, teste do plano e tarefa juntos. Não
  renumere; item que sai fica "removido (motivo)".
- Teste que dependia da ordem de outro, ou que dividia o banco e estragava o estado de outro: isole
  (dados próprios no seed da faixa da sua spec, ou banco próprio), não reordene na esperança de
  passar.
- Conta de execuções que você mexeu: a linha dos passos e a do orçamento têm de bater, dentro do
  teto (20 por clique; `ccJurDossieEnviar` até 30; abrir tela até 6 por bloco, mais 1 por módulo
  que estende o card — DT-42).
- Item que você acha que não deve ser feito, ou que a correção do arquiteto não fecha: não invente,
  não deixe de fora calado. Escreva no relatório com o id do item e o motivo.

## Regras

- Só escreva em `docs/specs/NNN-<sua spec>/`. Nada de código, nada contra a plataforma.
- Busque no fim: todo nome novo que você escreveu existe no contrato; nenhum "pendente".

## Relate no fim (poucas linhas)

Para cada BLOQUEIA e CORRIGIR do seu relatório v2 e cada item da sua seção do arquiteto: feito,
feito de outro jeito (como) ou não feito (por quê). O que muda para o usuário, se algo.
