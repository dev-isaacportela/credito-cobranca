# Ajuste dos planos às respostas do arquiteto (fase 0c, passo 4)

Instruções comuns aos 7 agentes de ajuste. Cada agente cuida de **uma** spec e só escreve em
`docs/specs/NNN-<sua spec>/`.

## O que aconteceu

Os planos das 7 specs foram refeitos contra o contrato técnico (`docs/contrato/`) e abriram 145
pedidos ao arquiteto, seguindo cada um a própria proposta marcada "pendente do arquiteto". O
arquiteto respondeu todos em `docs/contrato/pedidos/00-respostas.md` e atualizou o contrato.

## O que fazer

1. Leia em `docs/contrato/pedidos/00-respostas.md`: a seção "Decisões transversais", a seção da
   sua spec inteira e a seção "Para o integrador".
2. Aplique na `spec.md`, `plan.md` e `tasks.md` da sua spec **cada item** da lista "o que o plano
   desta spec precisa mudar". Para cada item, abra no contrato a seção citada e use o nome, a
   assinatura e o valor de lá.
3. Aplique também as decisões transversais onde tocam a sua spec, mesmo que a lista não cite:
   - DT-29: teto de **20 execuções por clique** (contando lib e aninhadas; `ccJurDossieEnviar` até
     30); lote = a SF diz quantos itens aceita por chamada e a tela chama em sequência; abrir tela
     até 6 por bloco. Onde o plano dizia "12", passe a 20 e refaça a conta só se ela mudou de lado.
   - DT-30 / D-06: quem administra = nível ≥ 3 ou a marca Administrador, pelo fragmento único
     `PODE_ADMINISTRAR`. Onde o plano dizia "só Administrador", troque.
   - DT-31: valores de enumeração são os de `02-dados.md`.
   - DT-32: formatos de `QUADROS`, `gancho(slug)` e `registrarExtensao()` de `01 §14`.
4. Troque toda marca "pendente do arquiteto" da sua spec pela decisão: aceito → tire a marca;
   aceito com alteração → ajuste ao que foi decidido. Não deve sobrar nenhuma marca.
5. Cenário, requisito ou teste que mudou de comportamento: ajuste o texto e o teste junto. Não
   renumere; item que sai fica "removido (motivo)".

## Regras

- Mudança cirúrgica: edite só o que as respostas mexem. Não reescreva seções inteiras nem
  reformate o que está certo.
- Só escreva em `docs/specs/NNN-<sua spec>/`. Achou que uma resposta não fecha ou contradiz o
  contrato? Não invente: anote no fim do seu relatório, com o id do pedido.
- Nada de código, nada contra a plataforma.

## Confira antes de terminar

- `grep -n "pendente do arquiteto"` na sua pasta: zero resultados.
- Toda SF, tabela e parâmetro citados no seu `plan.md` e `tasks.md` existem no contrato (busque
  cada nome novo que você escreveu).

## Relate no fim (poucas linhas)

Quantos itens da lista aplicados de quantos; o que mudou de comportamento visível ao usuário (se
algo); pontos em que a resposta não fechou.
