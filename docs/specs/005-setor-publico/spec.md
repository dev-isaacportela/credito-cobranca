# Spec: Setor público — nota fiscal, motor do órgão, regras por ente, comunicação e certidões

**ID:** 005-setor-publico · **Status:** em revisão (corrigida contra o contrato técnico em 14/11/2026) · **Data:** 2026-11-14

> Escopo: só o que não existe no setor privado — o fluxo da nota fiscal pública
> (etapas, prazos legais, datas e régua por nota), o motor do órgão (nota de 0 a
> 100, rating P1 a P4), as regras de pagamento por ente, a comunicação com o
> órgão e as certidões da empresa.
>
> Pela decisão D-05 ("setor público vamos reaproveitar o setor privado"), a
> concessão de crédito ao órgão é a esteira da spec `004` na carteira Pública, e
> a cobrança do órgão (quadro, agenda, contato, previsão de pagamento, baixa
> como perda, envio ao Jurídico) é a da spec `002` na carteira Pública. Esta
> spec entra nessas telas com um bloco ou uma aba (a análise e o motor do órgão
> no card da solicitação; as notas fiscais e a régua da NF no card da cobrança)
> e diz qual é a etapa do órgão; não tem esteira, quadro nem agenda próprios.
> Cliente, equipe, parâmetros, feriados, modelos de mensagem, e-mail, anexos e
> auditoria vêm da `001`; o Jurídico é a `003`; o painel consolidado é a `006`.

## Problema

Órgão público não paga como cliente privado. Não se bloqueia, não se negativa,
não se protesta: o dinheiro sai quando a nota fiscal percorre o caminho do
empenho ao pagamento — protocolo, atesto do fiscal, liquidação, ordem de
pagamento — e cada ente tem prazo legal próprio, contado em dias úteis. Hoje
isso vive num protótipo do gestor que calcula os prazos no navegador, tem as
regras de quatro entes marcadas "a confirmar", mistura o rating do órgão com o
do cliente privado (e erra a criticidade) e deixa desligado o alerta das
certidões que, vencidas, permitem ao órgão reter o pagamento. O custo: nota
parada no órgão sem ninguém saber em que passo está, ofício que não sai na
data certa e crédito concedido a ente sem saldo de contrato.

## Resultado esperado

Toda nota fiscal emitida para órgão público aparece sozinha, com o prazo legal
de liquidação e de pagamento já calculado pela regra do ente, e o agente
recebe na agenda a ação certa no dia certo — e-mail, pedido pela LAI, ofício —
com a mensagem pronta; a concessão ao órgão só libera fornecimento com nota de
risco própria e saldo de contrato ativo.

## Usuários

| Perfil | O que precisa fazer nesta spec | Frequência |
|---|---|---|
| Analista de crédito | preencher a análise do órgão dentro da solicitação pública e conferir a nota do motor (a solicitação e a decisão são da esteira da `004`) | diária |
| Agente de cobrança | lançar empenho, protocolo, atesto, liquidação e ordem de pagamento das NFs dos seus órgãos; executar os passos da régua da NF; enviar a mensagem ao órgão | diária |
| Supervisor | o mesmo que o agente, para a sua equipe; manter regras por ente e certidões | diária |
| Gerente financeiro | validar regra de pagamento por ente; editar os modelos de comunicação e, no padrão provisório (P-06), validá-los | semanal |
| Diretoria | o mesmo que o Gerente | eventual |
| Jurídico | validar ofício e requerimento; validar regra por ente; consultar NFs e certidões dos órgãos que estão no Jurídico | eventual |
| Administrador | parâmetros da régua da NF e do motor do órgão (tela de parâmetros da `001`); quem administra é Gerente, Diretoria ou a marca Administrador (D-06) | mensal |

Perfis, hierarquia e visibilidade são os da base (`001`): o agente e o
analista veem os órgãos que atendem; o supervisor, os da sua equipe; Gerente,
Diretoria e Administrador, todos. A mesma pessoa pode ser agente e analista
(P-04): a segregação é por caso. Quem lança as datas de uma NF é o agente ou o
analista do órgão, ou quem está acima dele.

## Cenários

Datas de referência: **hoje = terça, 01/12/2026**. Feriados nacionais do
calendário da `001` (12/10, 02/11, 15/11, 20/11, 25/12…); feriado distrital de
30/11/2026 cadastrado para o DF.

Pessoas (elenco único do sistema): **Carlos**, agente dos cinco órgãos e
analista das solicitações deles; **Silvia**, supervisora de Carlos;
**Gustavo**, gerente; **Diana**, diretoria; **Júlia**, Jurídico; **Ana**,
agente de outra equipe.

| Órgão | Esfera / UF | Regra de pagamento | Notas fiscais |
|---|---|---|---|
| Secretaria de Estado de Saúde do DF (SES-DF) | Estadual / DF | Distrito Federal (10 + 10 dias úteis, a confirmar); o contrato fixa o pagamento em 30 dias corridos do protocolo | 1004, 1005, 1008 |
| Fundo Municipal de Saúde de Goiânia (FMS Goiânia) | Municipal / GO | Municípios (10 + 10 úteis, a confirmar) | 1001 |
| Hospital Universitário Federal (HU Federal) | Federal / GO | Federal (10 + 10 úteis, a confirmar) | 1002, 1009 |
| Fundo Municipal de Saúde de Trindade (FMS Trindade) | Municipal / GO | Municípios; contratação de pequeno valor (R$ 50.000) | 1003 em aberto; 1006 e 1007 pagas; 1010 cancelada |
| Autarquia de Saúde de Formosa | sem esfera informada / GO | Federal (regra de quem não tem esfera) | — |

| NF | Órgão | Valor | Emissão | Protocolo | Atesto | Liquidação | Ordem de pagamento | Empenho |
|---|---|---|---|---|---|---|---|---|
| 1001 | FMS Goiânia | 80.000 | 01/10 | 01/10 | — | — | — | 2026NE000812 |
| 1002 | HU Federal | 40.000 | 28/09 | 29/09 | 15/10 | 20/10 | — | sim |
| 1009 | HU Federal | 20.000 | 01/06 | 02/06 | 03/06 | 10/06 | 15/07 | sim |
| 1003 | FMS Trindade | 30.000 | 03/11 | 03/11 | — | — | — | sem número |
| 1004 | SES-DF | 25.000 | 30/10 | 30/10 | 06/11 | 12/11 | 26/11 | sim |
| 1005 | SES-DF | 15.000 | 24/11 | 24/11 | — | — | — | sim |
| 1008 | SES-DF | 12.000 | 27/11 | — | — | — | — | sim |
| 1006 | FMS Trindade | 18.000 | 01/09 | 01/09 | 04/09 | 08/09 | 14/09 | sim — paga em 15/09 |
| 1007 | FMS Trindade | 22.000 | 03/07 | 03/07 | 06/07 | 08/07 | 05/08 | sim — paga em 10/08 |

Da NF 1001 já foram feitos os dois primeiros passos da régua (e-mail em 19/10
e ligação em 23/10); nenhum outro passo foi feito.

### Concessão ao órgão (carteira Pública da esteira da `004`)

Os cenários C-001, C-003, C-004 e C-005 descrevem o que a carteira Pública tem
de próprio dentro da esteira única de concessão. A função testada é a da
`004`; os dados do órgão e a regra do motor são desta spec.

**C-001 — Solicitação pública percorre três etapas** *(carteira Pública; função da `004`)*
- **Dado que** Carlos registra a solicitação de crédito do FMS Goiânia, de R$ 200.000, em 20/11/2026
- **Quando** ela passa por Recebimento da solicitação, Análise documental e financeira e Classificação de risco e aprovação
- **Então** o quadro de concessão pública mostra as três etapas com prazo de 1, 8 e 2 dias (decisão em até 11 dias: 01/12/2026), e a solicitação, que entrou na Análise em 21/11/2026, aparece em 01/12/2026 com 10 dias na etapa contra 8 de prazo, sinalizada como fora do prazo

**C-002 — Análise incompleta não avança (erro)**
- **Dado que** a solicitação do FMS Goiânia está na Análise sem os itens "Contrato ou ata, empenho e ordem de fornecimento" e "Dotação orçamentária e autorização da despesa" marcados, sem capacidade financeira e sem perfil de pagamento
- **Quando** Carlos tenta levá-la para Classificação de risco e aprovação
- **Então** o sistema recusa pelos dois itens; com os dois itens marcados e a análise do órgão ainda vazia, recusa dizendo que faltam a capacidade financeira, o perfil de pagamento e o rating

**C-003 — Edital pré-aprova, não aprova** *(carteira Pública; decisão da `004`, regra do motor desta spec)*
- **Dado que** a análise da Autarquia de Formosa tem base "Estimado do edital", de R$ 1.200.000, nota 87 e rating P1
- **Quando** Diana tenta registrar a decisão "Aprovada"; depois Gustavo e Diana tentam registrar "Pré-aprovada"
- **Então** a aprovação é recusada porque não há contrato ativo; Gustavo é recusado porque R$ 1.200.000 exige Diretoria; Diana pré-aprova, e a solicitação fica na Classificação, marcada "Pré-aprovada", até a assinatura do contrato

**C-004 — Sem saldo de contrato ativo não há aprovação (erro)**
- **Dado que** a base é "Saldo de contrato ativo", com saldo de R$ 80.000 e vigência até 30/11/2026
- **Quando** alguém tenta aprovar o crédito em 01/12/2026
- **Então** o sistema recusa porque a vigência terminou; com vigência até 30/06/2027 e saldo R$ 0,00 recusa porque não há saldo; nos dois casos só "Recusada" é aceita

**C-005 — Alçada pública em três faixas** *(carteira Pública; função da `004`)*
- **Dado que** o limite proposto para o HU Federal é R$ 350.000, para o FMS Trindade R$ 40.000 e para a Autarquia de Formosa R$ 1.200.000
- **Quando** Silvia, Gustavo e Diana tentam decidir
- **Então** nos R$ 350.000 Silvia é recusada com a indicação de que a decisão exige Gerente, e Gustavo decide; nos R$ 40.000 Silvia decide; nos R$ 1.200.000 Gustavo é recusado e só Diana decide, com a alçada registrada como "Diretoria"

**C-006 — removido (coberto por 004 pela regra única, D-05).** "Quem analisa não aprova" é regra da esteira única: cenário C-012 da `004`.

**C-007 — removido (coberto por 004 pela regra única, D-05).** Recusa e decisão sem parecer são da esteira única: cenários C-014 e C-020 da `004`. O responsável pela decisão é sempre quem está logado, nunca um campo digitado.

### Motor do órgão

**C-008 — Nota e rating do órgão**
- **Dado que** o FMS Goiânia (municipal) tem CAPAG B, despesa com pessoal de 50% da receita, CAUC regular, recurso vinculado do SUS fundo a fundo, perfil de pagamento pontual, empenho prévio e contrato vigente, e base "Saldo de contrato ativo" de R$ 200.000 com vigência até 30/06/2027
- **Quando** o analista salva a análise
- **Então** a nota é 87 (22 + 10 + 10 + 15 + 20 + 10), o rating é P1, a exposição máxima é R$ 200.000 e a decisão sugerida é "Aprovar"

**C-009 — Trava de CAPAG D**
- **Dado que** um órgão municipal tem CAPAG D, pessoal de 45%, CAUC regular, SUS fundo a fundo, perfil pontual, empenho e contrato, e saldo de contrato de R$ 300.000
- **Quando** o motor calcula
- **Então** a nota é 70, que seria P2, mas o rating fica P3 pela trava, a exposição máxima é R$ 150.000 e a decisão sugerida é "Reduzir"

**C-010 — Fim de mandato**
- **Dado que** um órgão estadual tem CAPAG B, pessoal de 40%, CAUC regular, SUS fundo a fundo, atrasos eventuais, empenho e contrato, e saldo de R$ 500.000
- **Quando** o motor calcula em 01/12/2026, último ano do mandato estadual
- **Então** a nota é 79 (84 − 5), o rating é P2 e a exposição R$ 400.000; com os mesmos dados um órgão municipal tem nota 84, P1 e exposição R$ 500.000

**C-011 — O histórico do órgão alimenta o motor**
- **Dado que** o FMS Trindade tem duas NFs pagas — a 1007 com 26 dias de atraso e a 1006 no prazo — e a análise está com o perfil de pagamento "Não definido"
- **Quando** o analista abre a análise
- **Então** o atraso médio sugerido é 13 dias, o critério de histórico vale 18 pontos e, com os demais dados do C-008, a nota é 85 (P1); a ficha mostra 2 notas pagas, 1 no prazo, liquidação média de 6 dias e pagamento médio de 20 dias

**C-012 — Rating público não se mistura com o privado**
- **Dado que** o crédito do FMS Goiânia foi aprovado com rating P1
- **Quando** o crédito ativo é consultado
- **Então** o P1 aparece como rating público, vindo da análise do órgão, e o rating privado (AA a E) fica vazio; risco, criticidade, farol e saúde do privado não são calculados para o órgão

### Notas fiscais em tramitação

**C-013 — A NF do Winthor entra sozinha**
- **Dado que** o Winthor tem, desde a data de corte, as NFs de saída dos quatro órgãos da tabela, a NF 1010 cancelada do FMS Trindade e uma NF de um cliente privado
- **Quando** a rotina roda
- **Então** só as NFs não canceladas dos órgãos entram em tramitação (7 em aberto e 2 pagas); rodar de novo não duplica; uma NF com duas parcelas de R$ 10.000, uma paga, aparece em aberto com saldo de R$ 10.000, e só fica paga quando as duas estão pagas, com a data do último pagamento

**C-014 — Prazo legal pela regra do ente**
- **Dado que** a NF 1001 do FMS Goiânia, de R$ 80.000, foi emitida e protocolada em 01/10/2026 e não tem atesto
- **Quando** a lista de NFs é aberta em 01/12/2026
- **Então** a NF mostra "liquidar até 16/10/2026" (o feriado de 12/10 não conta), "pagar até 30/10/2026", a situação "Liquidação vencida desde 16/10" e 32 dias de atraso pelo prazo legal

**C-015 — Pequeno valor corta os prazos pela metade**
- **Dado que** a NF 1003 do FMS Trindade, de R$ 30.000, pertence a uma contratação estimada em R$ 50.000 (abaixo de R$ 65.492,11) e foi protocolada em 03/11/2026
- **Quando** os prazos são calculados
- **Então** a NF mostra "liquidar até 10/11/2026" e "pagar até 17/11/2026" (5 + 5 dias úteis, em vez de 17/11 e 02/12) e a etiqueta "pequeno valor"

**C-016 — Prazo do contrato e feriado do ente**
- **Dado que** o contrato da SES-DF fixa pagamento em 30 dias corridos do protocolo e a NF 1004 foi protocolada em 30/10/2026; e a NF 1005 foi protocolada em 24/11/2026 sem atesto
- **Quando** os prazos são calculados
- **Então** a NF 1004 mostra "pagar até 01/12/2026" (29/11 é domingo e 30/11 é feriado no DF) e a etiqueta "prazo do contrato"; a NF 1005 mostra "liquidar até 09/12/2026", e não 08/12, por causa do feriado distrital

**C-017 — Mais de dois meses da emissão**
- **Dado que** a NF 1002 foi emitida em 28/09/2026 e a NF 1001 em 01/10/2026, nenhuma paga
- **Quando** a lista é filtrada por "Acima de 2 meses" em 01/12/2026
- **Então** aparece a 1002 (limite 28/11/2026, já passado) e não aparece a 1001 (limite 01/12/2026, que é hoje)

**C-018 — Data fora de ordem (erro)**
- **Dado que** a NF 1005 foi protocolada em 24/11/2026
- **Quando** Carlos informa atesto em 20/11/2026, ou liquidação em 05/12/2026
- **Então** o sistema recusa: o atesto não pode ser anterior ao protocolo, e nenhuma data pode ser posterior a hoje

**C-019 — Lista, indicadores e o recorte de cada um**
- **Dado que** estão em aberto as NFs 1001 (R$ 80.000), 1002 (R$ 40.000), 1009 (R$ 20.000), 1003 (R$ 30.000), 1004 (R$ 25.000), 1005 (R$ 15.000) e 1008 (R$ 12.000), todas de órgãos de Carlos
- **Quando** Gustavo abre as notas fiscais em tramitação
- **Então** vê 7 NFs, R$ 222.000, 4 órgãos; 4 com prazo vencido (R$ 170.000), sendo 2 com liquidação vencida e 2 com pagamento vencido; 2 acima de 2 meses (R$ 60.000); 1 a protocolar. Carlos e Silvia veem as mesmas 7; Ana não vê nenhuma

### Régua da nota fiscal

**C-020 — A régua entrega a próxima ação com a mensagem pronta**
- **Dado que** as NFs 1001, 1002, 1009 e 1003 estão vencidas e a 1005 está protocolada sem atesto
- **Quando** a rotina roda em 01/12/2026 e Carlos abre a agenda (a da `002`, carteira Pública)
- **Então** cada NF mostra o seu passo atual — 1001: ligação ao setor financeiro (24/11); 1002: avaliação de requerimento e art. 137 (30/11); 1009: avaliação de cobrança judicial (30/10); 1003: ofício pedindo a liquidação (25/11); 1005: confirmar recebimento e atesto (27/11) — e a agenda traz uma ação por órgão, a mais antiga: HU Federal (30/10), FMS Goiânia (24/11), FMS Trindade (25/11) e SES-DF (27/11), todas atrasadas. Os passos vencidos anteriores de cada NF não aparecem. A ação de e-mail ou ofício abre a mensagem preenchida com órgão, NF, empenho, valor e prazos

**C-021 — Marcar o passo como feito**
- **Dado que** o ofício por liquidação vencida da NF 1001 venceu em 30/10/2026 e a avaliação de requerimento vence em 02/12/2026
- **Quando** Carlos marca os dois como feitos em 01/12/2026 e tenta marcar também o ofício de cobrança do pagamento, que vence em 15/12/2026
- **Então** o primeiro conta como "fora do prazo", o segundo como "no prazo", e o terceiro é recusado porque ainda faltam mais de 2 dias úteis para ele; cada passo feito fica registrado também como contato com o órgão

**C-022 — Ofício e requerimento mudam a etapa sozinhos**
- **Dado que** o ofício da NF 1001 venceu em 30/10, o da NF 1003 em 25/11, e o requerimento da NF 1002 em 30/11, feitos ou não; e a NF 1008 da SES-DF foi emitida em 27/11 e não foi protocolada
- **Quando** o quadro de cobrança pública é aberto em 01/12/2026
- **Então** a SES-DF está em "NF a protocolar", o FMS Goiânia e o FMS Trindade em "Ofício / notificação formal" e o HU Federal em "Requerimento administrativo"; quem tenta mover um card pelo "Mover para" é recusado com "A etapa do órgão acompanha as notas fiscais."

**C-023 — Cobrança judicial depende do Jurídico**
- **Dado que** o passo "Avaliar cobrança judicial com o jurídico" da NF 1009 venceu em 30/10/2026
- **Quando** a rotina recalcula
- **Então** a ação aparece para Carlos, mas o HU Federal continua em "Requerimento administrativo"; só depois que o dossiê é enviado ao Jurídico (spec `003`) ele vai para "Cobrança judicial", e o recálculo seguinte não o tira de lá

**C-024 — Ofício sem validação não sai (erro)**
- **Dado que** o modelo de ofício não tem validação registrada
- **Quando** Carlos tenta enviar por e-mail o ofício da NF 1003
- **Então** o sistema recusa dizendo que o modelo aguarda validação; depois que Júlia (Jurídico) valida, o e-mail sai, fica registrado e o passo fica feito

**C-025 — Órgão não se bloqueia, não se negativa, não se protesta, não parcela** *(carteira Pública; funções da `002`)*
- **Dado que** o HU Federal está com R$ 60.000 vencidos há 160 dias
- **Quando** a lista de bloqueio, a régua por dias de atraso e a fila de e-mails da régua são geradas, e alguém tenta propor um acordo parcelado para ele
- **Então** o HU Federal não aparece em nenhuma delas, o caso dele não tem bloqueio devido, e a proposta de acordo é recusada

**C-026 — Pagamento encerra a cobrança**
- **Dado que** o Winthor registra o pagamento da NF 1003 em 01/12/2026 e o FMS Trindade não tem outra NF em aberto
- **Quando** a rotina roda
- **Então** a NF 1003 fica "Paga com 14 dias de atraso", o FMS Trindade passa para "Pagos" e sai da agenda de Carlos

### Regras, comunicação, certidões e contratos

**C-027 — Regra a confirmar avisa; validar exige Gerência ou Jurídico**
- **Dado que** a regra "Distrito Federal" está "A confirmar"
- **Quando** a NF 1005 é aberta, e depois Silvia (Supervisora) tenta marcar a regra como Verificada
- **Então** a NF mostra o aviso de regra a confirmar; Silvia é recusada porque a validação cabe a Gerente, Diretoria ou Jurídico; Gustavo, sem o link da norma, também é recusado; com o link, a regra fica Verificada com "validado por Gustavo em 01/12/2026"

**C-028 — Escolha automática da regra**
- **Dado que** nenhuma contratação fixou regra para os órgãos
- **Quando** os prazos são calculados
- **Então** a SES-DF usa "Distrito Federal", o FMS Goiânia e o FMS Trindade usam "Municípios", o HU Federal usa "Federal" e um órgão estadual de Goiás usaria "Estado de Goiás"; a Autarquia de Formosa, sem esfera informada, usa "Federal"; e se a contratação do FMS Trindade escolher "Estado do Tocantins", essa escolha prevalece

**C-029 — Certidões avisam 15 dias antes**
- **Dado que** a CND federal vale até 10/12/2026, o CRF do FGTS até 28/11/2026, a CNDT até 20/12/2026, a CND estadual de GO até 16/12/2026 e a CND municipal não foi cadastrada
- **Quando** a tela de certidões é aberta em 01/12/2026
- **Então** aparecem em alerta a CND federal (vence em 9 dias) e a estadual (vence em 15 dias); o CRF do FGTS aparece vencido; a CND municipal aparece como "não cadastrada"; a CNDT não gera alerta; o resumo entregue ao painel (`006`) conta 2 vencendo e 1 vencida

**C-030 — Documento do recebível vencido**
- **Dado que** as NFs vencidas são 1001 (com empenho, sem liquidação), 1002 (liquidada, sem ordem de pagamento), 1003 (sem empenho) e 1009 (ordem de pagamento emitida)
- **Quando** a lista de NFs em tramitação é aberta
- **Então** cada uma mostra onde travou: "Aguardando liquidação", "Liquidada sem ordem de pagamento", "Sem empenho" e "Ordem de pagamento emitida", nessa correspondência

**C-031 — Contrato perto do fim ou com pouco saldo**
- **Dado que** os créditos vigentes são o da SES-DF (contrato de R$ 600.000 com saldo de R$ 100.000 e vigência até 30/06/2027), o do FMS Trindade (R$ 50.000, saldo R$ 50.000, vigência até 15/01/2027), o do HU Federal e o do FMS Goiânia (saldo integral, vigência até 30/06/2027)
- **Quando** a lista de contratos é aberta em 01/12/2026
- **Então** aparecem 4 contratos e 2 em alerta: o da SES-DF, por saldo abaixo de 20% (16,7%), e o do FMS Trindade, por vigência em até 60 dias (45 dias)

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | Na carteira Pública, a esteira de concessão (`004`) DEVE ter três etapas antes do crédito — Recebimento da solicitação, Análise documental e financeira, Classificação de risco e aprovação — com prazo por etapa | Prazos semeados de 1, 8 e 2 dias, editáveis na administração do quadro; tempo na etapa e situação do prazo visíveis no card (C-001) | must |
| RF-002 | removido (coberto por 004 pela regra única, D-05): o checklist de cada etapa é dado do quadro de concessão pública | — | — |
| RF-003 | O sistema DEVE impedir a entrada na Classificação sem a análise do órgão completa (RN-003) e impedir a aprovação sem contrato ativo (RN-005) | Movimentação e decisão recusadas dizem o que falta (C-002, C-003, C-004); voltar de etapa segue a regra da `004` | must |
| RF-004 | O sistema DEVE registrar na solicitação pública a análise do órgão: esfera, CAPAG, capacidade financeira, despesa com pessoal, CAUC, fonte e tipo de fonte do recurso, perfil de pagamento, atraso médio, restos a pagar, empenho prévio, contrato vigente, base da análise, edital, valor estimado, nº do contrato ou empenho, saldo e vigência do contrato, regra de pagamento escolhida e prazo de pagamento do contrato | Todos os campos salvos e auditados; campos com opções fechadas só aceitam as opções da RN-010; depois da decisão só contrato, saldo, vigência, prazo do contrato e regra continuam editáveis (na pré-aprovada, também a base e os dados de empenho e contrato) | must |
| RF-005 | O sistema DEVE calcular, a cada gravação da análise e a pedido ("Calcular"), a nota do órgão de 0 a 100, o rating P1 a P4, a exposição máxima e a decisão sugerida (RN-010 a RN-016) | C-008 a C-011 reproduzidos com os números exatos | must |
| RF-006 | O sistema DEVE sugerir a capacidade financeira a partir da CAPAG enquanto ninguém a alterar à mão | CAPAG A → Alta; B → Média; C ou D → Baixa; alterada à mão, a CAPAG não sobrescreve mais (RN-011) | should |
| RF-007 | O sistema DEVE mostrar o histórico de pagamento do órgão: notas pagas, pagas no prazo, liquidação média, pagamento médio e atraso médio, e sugerir o atraso médio na análise | C-011 | must |
| RF-008 | Na carteira Pública, a alçada da concessão (`004`) DEVE ter três faixas (RN-007) | C-005; "quem analisa não aprova" é da `004` (C-012 de lá) | must |
| RF-009 | removido (coberto por 004 pela regra única, D-05): o registro da decisão — aprovada, pré-aprovada ou recusada, com parecer, plano e forma — é da esteira única (C-013 e C-014 da `004`); o que é próprio do órgão está em RF-003 | — | — |
| RF-010 | O sistema DEVE manter o rating público (P1 a P4) em lugar próprio, na análise do órgão, com cópia congelada na decisão | C-012 | must |
| RF-011 | O sistema DEVE mostrar as evidências exigidas pela base da análise (RN-017); os arquivos são anexos do card da solicitação | Base edital pede edital; base contrato pede contrato e nota de empenho; sempre CAPAG, RGF/RREO, extrato do CAUC e certidões | should |
| RF-012 | O sistema DEVE trazer do Winthor, a cada rodada da rotina, as NFs de saída não canceladas de clientes do setor público emitidas a partir da data de corte, com número, série, emissão, valor, saldo em aberto e pagamento | C-013; NF privada ou cancelada nunca entra; reprocessar não duplica NF; NF cancelada depois de entrar sai da tramitação | must |
| RF-013 | O sistema DEVE permitir lançar, por NF, o nº do empenho, as datas de protocolo, atesto, liquidação e ordem de pagamento e a posição na ordem cronológica | Datas validadas pela RN-025 (C-018); cada alteração auditada; quem lança é o agente ou analista do órgão, ou quem está acima; se a etapa do órgão muda, o card de cobrança do órgão vai para a nova etapa no mesmo lançamento, com a nota da etapa | must |
| RF-014 | O sistema DEVE ligar cada NF a uma contratação aprovada do órgão, propondo a mais recente | A NF herda da contratação o valor estimado, a regra escolhida e o prazo do contrato; quem lança as datas pode trocar a contratação da NF | must |
| RF-015 | O sistema DEVE calcular por NF o liquidar até, o pagar até e o limite de dois meses (RN-019 a RN-023) | C-014 a C-017 com as datas exatas | must |
| RF-016 | O sistema DEVE classificar cada NF por etapa (entregue, protocolada, atestada, liquidada, ordem de pagamento emitida, paga) e por situação (no prazo, protocolar a NF, liquidação vencida, pagamento vencido, paga no prazo, paga com atraso) e marcar "acima de 2 meses" | Texto da situação com a data ("Liquidação vencida desde 16/10") e os dias de atraso da paga (C-026) | must |
| RF-017 | O sistema DEVE listar as NFs em tramitação com filtro de situação (todas em aberto, a protocolar, no prazo, liquidação vencida, pagamento vencido, acima de 2 meses, pagas), busca por órgão, NF ou empenho, e paginação | Ordenação: vencidas primeiro, depois pagar até crescente; cada NF com órgão, esfera/UF, agente, NF/empenho, valor, etapa, liquidar até, pagar até, situação, regra aplicada e passo atual da régua (C-019) | must |
| RF-018 | O sistema DEVE mostrar os indicadores das NFs em tramitação — quantidade, valor e órgãos em aberto; com prazo vencido; liquidação vencida; pagamento vencido; a protocolar; acima de 2 meses — e entregá-los ao painel da `006`, junto com o funil por etapa que o painel mostra (entre a entrega e o atesto, aguardando liquidação, liquidadas sem pagamento, pagamento vencido, recebido no mês, com quantidade e valor) | C-019 | must |
| RF-019 | O sistema DEVE calcular a régua de cada NF não paga com os 10 passos da RN-027 | Cada passo com data devida, canal, mensagem e situação feito/pendente/atrasado; datas do C-020 | must |
| RF-020 | O sistema DEVE entregar ao caso de cobrança do órgão a próxima ação da régua (RN-028), que a agenda da `002` mostra | C-020: uma ação por órgão, a mais antiga | must |
| RF-021 | O sistema DEVE permitir marcar o passo como feito, com data e, no ofício e no requerimento, o nº do protocolo no órgão | Feito até a data devida conta no prazo; depois, fora; passo com mais de 2 dias úteis de antecedência é recusado (C-021); o cumprimento é contado por agente | must |
| RF-022 | O sistema DEVE montar a mensagem de cada passo a partir do modelo de comunicação, preenchida com os dados do órgão, da NF e do agente, e permitir enviá-la por e-mail ao contato do órgão | Envio registrado e passo marcado feito; ofício e requerimento só saem com modelo validado (C-024) | must |
| RF-023 | O sistema DEVE derivar a etapa de cobrança do órgão a partir das NFs (RN-030) e entregá-la ao quadro de cobrança pública (`002`), sem movimentação manual | C-022 | must |
| RF-024 | removido (coberto por 002 pela regra única, D-05): checklist e prazo de cada etapa são dados do quadro de cobrança pública | — | — |
| RF-025 | O sistema DEVE mostrar a ação "Avaliar cobrança judicial com o jurídico" sem mudar a etapa por conta própria; o envio é o dossiê da `003` | C-023 | must |
| RF-026 | O sistema DEVE mostrar, nas telas de NF e no card do órgão, o que está vencido pelo prazo legal (valor em aberto, NFs em aberto, acima de 2 meses, dias de atraso de cada NF), sem alterar a posição financeira do cliente, que segue o vencimento do título (P-09) | RN-026 | must |
| RF-027 | Na carteira Pública, a cobrança (`002`) NÃO DEVE incluir o órgão em bloqueio de pedidos, negativação, protesto, régua por dias de atraso, fila de e-mails da régua nem acordo parcelado | C-025 | must |
| RF-028 | O sistema DEVE manter as regras de pagamento por ente: nome, esfera, UF, prazo de liquidação, prazo de pagamento, contagem (úteis ou corridos), base legal, link da norma, situação (Verificado / A confirmar), quem validou e quando | Cadastro, edição e inativação por Supervisor ou acima (ou a marca Administrador); validação por Gerente, Diretoria, Jurídico ou a marca Administrador, com link obrigatório (C-027); regra inativa não é escolhida | must |
| RF-029 | O sistema DEVE avisar, na NF e na análise, quando a regra aplicada está "A confirmar" | C-027 | must |
| RF-030 | O sistema DEVE oferecer os sete modelos de comunicação com o órgão do Anexo A, editáveis por Gerente ou acima | Cada modelo com versão e validação; o tipo sugerido muda com a situação da NF (RN-033) | must |
| RF-031 | O sistema DEVE manter as certidões da empresa — CND federal, CRF do FGTS, CNDT, CND estadual e CND municipal — com CNPJ, abrangência, validade e arquivo | C-029; renovar guarda a anterior | must |
| RF-032 | O sistema DEVE alertar a certidão que vence em até 15 dias, a vencida e a não cadastrada | C-029; o alerta aparece na tela de certidões e as contagens vão para o painel da `006` | must |
| RF-033 | O sistema DEVE mostrar, em cada NF vencida da lista, o documento em que o recebível travou (RN-034) | C-030 | must |
| RF-034 | O sistema DEVE mostrar o fluxo da NF pública (empenho, entrega, recebimento, protocolo, atesto e liquidação, ordem cronológica, pagamento) com os prazos da regra federal vigente e o valor de pequeno valor vigente | Texto atualizado quando o parâmetro muda | could |
| RF-035 | O sistema DEVE recortar NFs, indicadores, contratos e régua pelo que cada pessoa pode ver (base `001`) | C-019: Carlos e Silvia 7, Ana 0, Gustavo 7 | must |
| RF-036 | O sistema DEVE listar os contratos dos créditos públicos vigentes e alertar o que vence em até 60 dias (ou já venceu) e o que tem saldo abaixo de 20% do valor (RN-037) | C-031; a contagem de contratos em alerta vai para o painel da `006` | must |

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | NF emitida no Winthor aparece em tramitação em até 20 minutos | Emissão no Winthor de teste e cronômetro até a NF aparecer na lista |
| RNF-002 | Lista de NFs responde em até 2 s com 5.000 NFs | Massa de teste de 5.000 NFs, cronômetro |
| RNF-003 | Toda escrita desta spec fica na trilha de auditoria com quem, quando, antes e depois (RN-039) | Alterar uma data de NF, uma regra e uma certidão e conferir as três linhas na auditoria |
| RNF-004 | Nenhum prazo é calculado sem o calendário de feriados: nacional, da UF e do município do órgão | Feriado distrital de 30/11 move o prazo do DF (C-016) e não move o de GO |

## Entidades do domínio

- **Solicitação pública** — pedido de crédito de um órgão; é a solicitação da
  `004` na carteira Pública. Esta spec acrescenta a ela a análise do órgão.
- **Análise do órgão** — os dados do ente que sustentam a decisão (CAPAG,
  pessoal, CAUC, fonte, histórico, edital, contrato). Uma por solicitação
  pública. Dela saem a nota, o rating P1–P4 e a exposição máxima.
- **Contratação** — a análise aprovada (ou pré-aprovada) de um órgão: valor
  estimado, contrato, saldo, vigência, regra e prazo de pagamento. Um órgão pode
  ter várias; cada NF pertence a uma.
- **Nota fiscal pública** — NF de saída para órgão, vinda do Winthor, com o
  caminho empenho → protocolo → atesto → liquidação → ordem de pagamento →
  pagamento. Os prazos legais são calculados; as datas do caminho, salvo o
  pagamento, são lançadas pela equipe.
- **Passo da régua da NF** — ação devida numa NF (confirmar, e-mail, ligação,
  ofício, pedido pela LAI, requerimento, avaliação judicial), com data devida e,
  quando feito, quem fez e quando.
- **Etapa do órgão** — a posição do órgão no quadro de cobrança pública da
  `002`; é calculada aqui, a partir das NFs.
- **Regra de pagamento do ente** — prazos legais de liquidação e pagamento de
  uma esfera/UF, com a norma e a situação da validação.
- **Certidão da empresa** — certidão de regularidade da Benenutri exigida pelo
  órgão para pagar, com validade.
- **Modelo de comunicação com o órgão** — texto padrão de uma situação da NF ou
  da análise, com campos preenchidos pelo sistema.

## Regras de negócio

### Concessão ao órgão (o que a carteira Pública tem de próprio)

- **RN-001** — *(carteira Pública; função da `004`)* A esteira pública tem três
  etapas antes do crédito — Recebimento da solicitação (1 dia), Análise
  documental e financeira (8 dias), Classificação de risco e aprovação (2 dias)
  — e depois as etapas de gestão do crédito da `004`, com os nomes do público:
  Monitoramento (crédito ativo), Reavaliação de risco, Cadastro obsoleto,
  Recusadas e Encerradas. Prazos em dias corridos, editáveis na administração do
  quadro. O crédito nasce na própria decisão de aprovação.
- **RN-002** — removida (coberta por 004 pela regra única, D-05): os itens de
  checklist de cada etapa pública são dados do quadro de concessão pública. O
  que trava a passagem está na RN-003.
- **RN-003** — Entrar na Classificação exige os itens "Contrato ou ata, empenho
  e ordem de fornecimento" e "Dotação orçamentária e autorização da despesa"
  marcados, a capacidade financeira, o perfil de pagamento e o rating
  calculado. Na base "Estimado do edital", em que ainda não há contrato nem
  empenho, o primeiro item é marcado com o edital ou o termo de referência
  conferido.
- **RN-004** — removida (coberta por 004 pela regra única, D-05): decisão com
  parecer, plano e forma de pagamento é da esteira única (C-014 da `004`); o
  rating calculado passou para a RN-003.
- **RN-005** — Aprovar exige contrato ativo: base "Saldo de contrato ativo",
  saldo maior que zero e vigência igual ou posterior a hoje. Sem isso, só
  "Pré-aprovada" (base "Estimado do edital") ou "Recusada". Depois do contrato
  assinado, aprovar acima do valor pré-aprovado exige nova decisão, na alçada do
  novo valor (P-22).
- **RN-006** — removida (coberta por 004 pela regra única, D-05): recusa com
  motivo e volta de etapa são da esteira única (C-020 da `004`).
- **RN-007** — *(carteira Pública; função da `004`)* Alçada pública pelo limite
  proposto para o órgão: até R$ 100.000 Supervisor; até R$ 1.000.000 Gerente;
  acima, Diretoria. Não existe a faixa de Comitê regional. Limites são
  parâmetros da carteira Pública; cargo com nível igual ou maior decide. Propor
  acima da exposição máxima do motor é exceção ao motor e segue a regra de
  exceção da `004`.
- **RN-008** — removida (coberta por 004 pela regra única, D-05): C-012 da `004`.
- **RN-009** — "Sem empenho, sem entrega" (Lei 4.320/64, art. 60): com empenho
  prévio "Não", a decisão sugerida é "Não entregar sem nota de empenho",
  qualquer que seja o rating.

### Motor do órgão

- **RN-010** — Nota de 0 a 100, soma de seis critérios (pontos padrão, todos
  parâmetros):

  | Critério | Pontos |
  |---|---|
  | CAPAG | A 30 · B 22 · C 10 · D 0 · Não divulgada 12 · Não se aplica (União) 30 · não consultada: Federal 30, demais 12 |
  | Despesa com pessoal ÷ limite da esfera (municípios 54%, estados 49%, União 37,9% da receita corrente líquida) | até 90% do limite 15 · até 95% 10 · até 100% 5 · acima 0 · não informada ou órgão sem esfera: Federal 15, demais 7 |
  | CAUC | Regular 10 · Com pendência 3 · Não consultado 5 |
  | Tipo de fonte do recurso | Vinculada (SUS fundo a fundo) 15 · Outra vinculada 10 · Recursos próprios ou não informada 6 |
  | Histórico de pagamento | Pontual 20 · Atrasos eventuais 12 · Atrasos frequentes 4 · sem perfil, pelo atraso médio: até 15 dias 18, até 45 12, até 90 6, acima 2 · sem perfil e sem atraso médio 10 |
  | Empenho prévio e contrato vigente | empenho "Sim" 5 + contrato "Sim" 5 · base "Estimado do edital" sem empenho nem contrato: 5 |

- **RN-011** — Capacidade financeira sugerida pela CAPAG (A ou União → Alta; B →
  Média; C ou D → Baixa) até alguém escolhê-la à mão.
- **RN-012** — Atraso médio acima de 90 dias limita o critério de histórico a 4
  pontos, mesmo com perfil informado. O atraso médio sugerido é a média, sobre
  as NFs pagas do órgão, dos dias entre o pagar até e o pagamento (zero quando
  pagou no prazo). Liquidação média é a média dos dias entre o protocolo e a
  liquidação; pagamento médio, a dos dias entre a liquidação e o pagamento.
- **RN-013** — Fim de mandato (LRF, art. 42): a partir de 1º de maio do último
  ano do mandato a nota perde 5 pontos. Último ano: estadual e federal nos anos
  2026, 2030…; municipal nos anos 2028, 2032…
- **RN-014** — Rating: P1 de 80 a 100, P2 de 60 a 79, P3 de 40 a 59, P4 abaixo
  de 40. Trava: CAPAG D ou pessoal acima do limite deixam o rating no máximo em
  P3.
- **RN-015** — Exposição máxima = base × fator do rating (P1 100%, P2 80%, P3
  50%, P4 25%), arredondada ao milhar mais próximo. Base: valor estimado do
  edital; ou saldo do contrato ativo; sem base, o valor solicitado. Exemplo:
  base R$ 123.456 em P2 → R$ 99.000.
- **RN-016** — Decisão sugerida, na ordem: sem base informada → "Informe a
  base"; base edital → "Pré-aprovar até a assinatura do contrato"; contrato sem
  saldo ou vencido → "Não fornecer"; empenho prévio "Não" → RN-009; contrato
  vigente "Não" → "Não fornecer sem contrato ou ata vigente"; P1 → "Aprovar";
  P2 ou P3 → "Reduzir à exposição máxima"; P4 → "Levar à Diretoria". Junto da
  sugestão o motor diz se a aprovação é possível (RN-005) e por que não.
- **RN-017** — Evidências exigidas: base edital → edital ou termo de
  referência; base contrato → contrato ou ata e nota de empenho; sempre CAPAG,
  RGF/RREO, extrato do CAUC e certidões da empresa.
- **RN-018** — O rating público (P1–P4) mora na análise do órgão; a decisão
  guarda uma cópia congelada. Nunca ocupa o lugar do rating privado (AA–E), e
  risco, criticidade, farol e saúde do privado não são calculados para órgão.

### Notas fiscais e prazos

- **RN-019** — Regra aplicada à NF, na ordem: a escolhida na contratação; a de
  mesma esfera e UF do órgão; a de mesma esfera sem UF; a Federal. Só regras
  ativas. Órgão sem esfera informada usa a Federal — o protótipo ainda tentava
  a regra da UF nesse caso; a busca pela UF sem esfera foi retirada porque uma
  UF tem regras de esferas diferentes.
- **RN-020** — Marco inicial: o protocolo da NF; sem protocolo, a emissão.
  Liquidar até = marco + prazo de liquidação da regra. Pagar até = liquidação
  real (ou, sem ela, o liquidar até) + prazo de pagamento da regra. Em dias
  úteis, conta-se dia a dia pulando sábado, domingo e feriado (nacional, da UF e
  do município do órgão); em dias corridos, o resultado que cair em dia não útil
  vai para o próximo dia útil.
- **RN-021** — Pequeno valor (Lei 14.133/2021, art. 75, II): contratação com
  valor estimado até o limite vigente e regra em dias úteis tem os dois prazos
  pela metade, arredondada para cima. O limite é parâmetro com vigência
  (R$ 62.725,59 desde 01/01/2025; R$ 65.492,11 desde 01/01/2026, Decreto
  12.807/2025), atualizado pela Gerência Financeira todo janeiro. Vale o limite
  vigente na data de emissão da NF (padrão adotado, P-47):
  contratação de R$ 64.000 com NF de 15/12/2025 não é pequeno valor; com NF de
  10/01/2026 é. Contratação sem valor estimado informado (zero), ou NF sem
  contratação, não é pequeno valor.
- **RN-022** — Prazo do contrato: quando a contratação fixa o pagamento em N
  dias corridos, pagar até = marco + N dias, no próximo dia útil se cair em dia
  não útil; o liquidar até continua pela regra. O prazo do contrato prevalece
  sobre a regra e não é cortado pelo pequeno valor.
- **RN-023** — Limite de dois meses (Lei 14.133/2021, art. 137) = emissão + 2
  meses no calendário; sem o dia no mês de destino, vale o último dia do mês
  (31/12/2026 → 28/02/2027; 31/01/2027 → 31/03/2027). A NF fica "acima de 2
  meses" a partir do dia seguinte ao limite.
- **RN-024** — Etapa da NF é a mais adiantada com data: paga > ordem de
  pagamento > liquidada > atestada > protocolada > entregue. Situação: paga →
  "Paga no prazo" ou "Paga com N dias de atraso" (N = pagamento − pagar até);
  não paga e não protocolada → "Protocolar a NF" (nunca vencida); sem
  liquidação com hoje depois do liquidar até → "Liquidação vencida desde dd/mm";
  senão, hoje depois do pagar até → "Pagamento vencido desde dd/mm"; senão "No
  prazo". Dias de atraso da NF em aberto = hoje − pagar até, quando positivo.
- **RN-025** — Datas da NF seguem a ordem emissão ≤ protocolo ≤ atesto ≤
  liquidação ≤ ordem de pagamento; nenhuma é posterior a hoje; cada uma exige a
  anterior (não há atesto sem protocolo). O pagamento vem do Winthor: a NF está
  paga quando todas as suas parcelas estão pagas, na data do último pagamento.
- **RN-026** — A posição financeira do órgão (vencido, a vencer, dias de
  atraso, aging) é a mesma de todo cliente: pelo vencimento do título, lida do
  Winthor pela `001` (P-09). O prazo legal não regrava essa posição; ele aparece
  nas telas de NF e no card do órgão: valor e quantidade de NFs em aberto, valor
  acima de 2 meses, situação e dias de atraso de cada NF, e o menor "liquidar
  até"/"pagar até" em aberto como prazo do card.

### Régua da nota fiscal

- **RN-027** — Dez passos por NF não paga, em dias úteis (parâmetros):

  | Passo | Quando | Ação | Canal | Muda a etapa do órgão |
  |---|---|---|---|---|
  | Confirmar | protocolo + 3, só enquanto protocolada sem atesto | Confirmar recebimento da NF e o atesto com o fiscal | ligação / e-mail | — |
  | L1 | liquidar até + 1, enquanto não liquidada | E-mail ao fiscal e ao financeiro: liquidação vencida | e-mail | — |
  | L2 | liquidar até + 5 | Ligação ao fiscal: pendências e previsão de atesto | ligação | — |
  | L3 | liquidar até + 10 | Ofício ao ordenador de despesa pedindo a liquidação | ofício | Ofício / notificação formal |
  | G1 | pagar até + 1, quando liquidada ou com pagar até vencido | E-mail cobrando o pagamento vencido | e-mail | — |
  | G2 | pagar até + 5 | Pedido de posição na ordem cronológica (LAI) | e-mail / protocolo | — |
  | G3 | pagar até + 15 | Ligação ao setor financeiro / ordenador de despesa | ligação | — |
  | G4 | pagar até + 30 | Ofício formal de cobrança ao ordenador de despesa | ofício | Ofício / notificação formal |
  | M2 | primeiro dia útil depois do limite de 2 meses | Jurídico avalia requerimento e art. 137 | requerimento | Requerimento administrativo |
  | G5 | pagar até + 90 | Avaliar cobrança judicial com o jurídico | jurídico | — (RN-032) |

  Sem bloqueio, negativação ou protesto em nenhum passo. No protótipo o passo
  M2 vencia no próprio dia do limite; aqui vence no primeiro dia útil seguinte,
  quando a NF já está "acima de 2 meses" (RN-023).
- **RN-028** — Passo atual de uma NF: o último passo vencido não feito; não
  havendo vencido, o próximo passo a vencer. Na mesma data, vale o passo que
  muda a etapa (ofício, requerimento) e, persistindo o empate, o último da
  tabela. Os vencidos mais antigos não aparecem, para não inundar a agenda.
  Próxima ação do órgão: entre os passos atuais das suas NFs, o de data mais
  antiga — é ela que vai para o caso de cobrança e aparece na agenda da `002`.
  Data devida que cair em dia não útil vai para o próximo dia útil.
- **RN-029** — Marcar feito só a partir de 2 dias úteis antes da data devida
  (parâmetro). Feito até a data devida conta "no prazo"; depois, "fora do
  prazo". O cumprimento é contado por agente e por período.
- **RN-030** — Etapa do órgão = a mais alta entre as NFs não pagas: NF a
  protocolar (1) → Liquidação vencida · cobrar atesto (2) → Pagamento vencido ·
  ordem cronológica (3) → Ofício / notificação formal (4) → Requerimento
  administrativo (5). Ofício e requerimento sobem a etapa quando a data devida
  chega, feitos ou não. Com todas as NFs pagas e tendo estado em cobrança, o
  órgão vai para Pagos. Ninguém move card à mão.
- **RN-031** — removida (coberta por 002 pela regra única, D-05): checklist e
  prazo de cada etapa do quadro de cobrança pública são dados do quadro. No
  público a ação feita é o passo da régua da NF, não o item do card.
- **RN-032** — Cobrança judicial é decisão do Jurídico: o passo G5 só cria a
  ação. O órgão vai para "Cobrança judicial" quando o dossiê é enviado ao
  Jurídico (spec `003`), e nem essa etapa nem a baixa como perda (spec `002`)
  são desfeitas pelo cálculo automático. Baixa aprovada marca como baixadas as
  NFs em aberto do órgão, que saem da tramitação.

### Regras por ente, comunicação, certidões e contratos

- **RN-033** — Mensagem sugerida pela situação da NF: acima de 2 meses →
  requerimento (art. 137); entregue → protocolo; protocolada ou atestada →
  liquidação vencida, se vencida, senão protocolo; liquidada ou com ordem de
  pagamento → pagamento vencido, se vencido, senão posição na fila. Ofício e
  requerimento têm efeito legal: só podem ser enviados com a versão atual do
  modelo validada pelo Jurídico (ou, no padrão provisório P-06, por Gerente ou
  acima); os demais, com qualquer versão.
- **RN-034** — Documento do recebível vencido, na ordem: sem nº de empenho →
  "Sem empenho"; sem liquidação → "Aguardando liquidação"; liquidada sem ordem de
  pagamento → "Liquidada sem ordem de pagamento"; com ordem → "Ordem de
  pagamento emitida".
- **RN-035** — Regra por ente: Supervisor ou acima (ou quem tem a marca
  Administrador) cria, edita e inativa; só Gerente, Diretoria, Jurídico ou a
  marca Administrador marca "Verificado", e só com o link da norma.
  Validar grava quem e quando. Mudar prazo, contagem, esfera ou UF de uma regra
  Verificada a devolve para "A confirmar". A carga inicial entra toda "A
  confirmar" (P-23), com os prazos e a base legal do protótipo: Federal (Lei
  14.133/2021, art. 141, e IN SEGES/ME 77/2022 — 10 dias úteis para liquidar e
  10 para pagar), Distrito Federal, Estado de Goiás, Estado do Tocantins e
  Municípios.
- **RN-036** — Certidão: alerta a partir de 15 dias antes da validade (parâmetro;
  no 15º dia já alerta), vencida depois da validade, e "não cadastrada" quando
  não há certidão daquele tipo. Vale a de validade mais recente de cada tipo,
  CNPJ e abrangência; cadastrar e renovar cabe a Supervisor ou acima (ou à
  marca Administrador).
- **RN-037** — Contrato em alerta: contrato de crédito público vigente com
  vigência em até 60 dias (ou já vencida), ou com saldo abaixo de 20% do valor
  da contratação. Os dois limites são parâmetros.
- **RN-038** — Quem age é sempre a pessoa da sessão: nenhuma tela desta spec
  informa responsável, autor ou data de hoje. Usuário sem vínculo com a equipe
  não lê nem grava. Na etapa de decisão, a nota do motor do órgão é lida
  também por quem tem a alçada de decidir, mesmo sem ser do caso (como na
  carteira privada); recalcular e gravar a nota continua só de quem é do caso.
- **RN-039** — Toda escrita desta spec (análise do órgão, datas da NF, passo
  feito, regra por ente, certidão) grava na auditoria quem, quando, o campo, o
  valor anterior e o novo.

## Testes

Datas e dados dos cenários (hoje = 01/12/2026). "Removido" = o item saiu desta
spec; a evidência é do cenário indicado da `002` ou da `004`.

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001 | Quadro de concessão pública com as etapas Recebimento, Análise e Classificação e prazos de 1, 8 e 2 dias; solicitação aberta em 20/11/2026 com decisão prevista para 01/12/2026; na Análise desde 21/11/2026 está, em 01/12/2026, com 10 dias contra 8 de prazo | regra de negócio |
| C-002 | Levar à Classificação com os dois itens desmarcados é recusado; com os itens marcados e a análise vazia é recusado com "Análise do órgão incompleta: capacidade financeira, perfil de pagamento e rating." | regra de negócio |
| C-003 | Base edital R$ 1.200.000, nota 87, P1: decisão sugerida "Pré-aprovar"; "Aprovada" por Diana recusada citando contrato; "Pré-aprovada" por Gustavo recusada citando Diretoria; por Diana aceita; solicitação continua na Classificação | regra de negócio |
| C-004 | Saldo R$ 80.000 com vigência 30/11/2026 → aprovação impossível, motivo cita vigência; saldo R$ 0 com vigência 30/06/2027 → motivo cita saldo | regra de negócio |
| C-005 | Limite R$ 350.000: Silvia recusada com "Gerente", Gustavo aceito; R$ 350.000,01 com exposição do motor de R$ 350.000 → exceção ao motor, Gustavo recusado com "Comitê de crédito"; R$ 40.000: Silvia aceita; R$ 1.200.000: Gustavo recusado, Diana aceita com alçada "Diretoria" | regra de negócio |
| C-006 | removido — coberto por C-012 da `004` (cenários da Privada; valem para a Pública pela regra única, D-05) | — |
| C-007 | removido — coberto por C-014 e C-020 da `004` (cenários da Privada; valem para a Pública pela regra única, D-05) | — |
| C-008 | Motor devolve nota 87 (22, 10, 10, 15, 20, 10), rating P1, exposição 200.000, decisão "Aprovar", aprovação possível | regra de negócio |
| C-009 | Motor devolve nota 70, rating P3 pela trava, exposição 150.000, decisão "Reduzir" | regra de negócio |
| C-010 | Estadual em 01/12/2026: nota 79, P2, 400.000; municipal com os mesmos dados: 84, P1, 500.000 | regra de negócio |
| C-011 | Histórico do FMS Trindade: 2 pagas, 1 no prazo, liquidação média 6, pagamento médio 20, atraso médio 13; motor sem perfil: histórico 18, nota 85 | regra de negócio |
| C-012 | Crédito aprovado do FMS Goiânia tem rating público "P1" e rating privado vazio; a decisão guarda "P1" como rating público e a exposição do motor (R$ 200.000) como limite do motor, na alçada de Gerente; o crédito aponta a análise do órgão; depois da rotina não existe risco privado calculado para o órgão | regra de negócio |
| C-013 | Rotina traz 9 NFs dos 4 órgãos (7 em aberto, 2 pagas) e nenhuma cancelada ou privada; rodar de novo mantém 9; NF de 2 parcelas com 1 paga tem saldo 10.000 e não está paga; com as 2 pagas, paga na data da segunda | regra de negócio |
| C-014 | NF 1001: liquidar até 2026-10-16, pagar até 2026-10-30, situação "Liquidação vencida" desde 16/10, 32 dias de atraso; a lista e a ficha da NF dão a mesma situação | regra de negócio |
| C-015 | NF 1003: liquidar até 2026-11-10, pagar até 2026-11-17, pequeno valor = sim; com contratação de R$ 70.000: 2026-11-17 e 2026-12-02 | regra de negócio |
| C-016 | NF 1004: pagar até 2026-12-01 e prazo do contrato = sim; sem o feriado de 30/11, 2026-11-30. NF 1005: liquidar até 2026-12-09 | regra de negócio |
| C-017 | Filtro "acima de 2 meses" devolve a 1002 e a 1009 e não devolve a 1001 | regra de negócio |
| C-018 | Atesto 2026-11-20 na NF 1005 recusado citando "protocolo"; liquidação 2026-12-05 recusada citando "hoje"; atesto na NF 1008, sem protocolo, recusado | regra de negócio |
| C-019 | Indicadores para Gustavo: 7 NFs, 222.000, 4 órgãos; com prazo vencido 4 e 170.000; liquidação vencida 2; pagamento vencido 2; a protocolar 1; acima de 2 meses 2 e 60.000; funil para o painel: entre a entrega e o atesto 4 e 137.000, aguardando liquidação 0, liquidadas sem pagamento 3 e 85.000, pagamento vencido 60.000, recebido no mês 0 (em setembro de 2026: 18.000, 1 NF). Listagem para Carlos: 7; para Silvia: 7; para Ana: 0 | regra de negócio |
| C-020 | Passo atual: 1001-G3 (2026-11-24), 1002-M2 (2026-11-30), 1009-G5 (2026-10-30), 1003-L3 (2026-11-25), 1005-Confirmar (2026-11-27). Agenda de Carlos na carteira Pública: 4 ações, uma por órgão — HU Federal 2026-10-30, FMS Goiânia 2026-11-24, FMS Trindade 2026-11-25, SES-DF 2026-11-27 — todas atrasadas. Mensagem do ofício G4 da 1001 contém "1001", "2026NE000812" e "30/10/2026" | regra de negócio |
| C-021 | Feito da 1001-L3 → fora do prazo; 1001-M2 → no prazo; 1001-G4 → recusado citando a antecedência e mostrado como "ainda não pode"; cumprimento de Carlos em 12/2026: 2 feitos, 1 no prazo; 2 contatos com o órgão registrados para a NF, marcados como da régua pública | regra de negócio |
| C-022 | Quadro de cobrança pública: NF a protocolar 1 (SES-DF), Ofício 2 (FMS Goiânia, FMS Trindade), Requerimento 1 (HU Federal), demais 0; mover o card da SES-DF à mão é recusado com "A etapa do órgão acompanha as notas fiscais." | regra de negócio |
| C-023 | 1009-G5 vencido em 2026-10-30 e HU Federal em Requerimento; depois do envio do dossiê está em Cobrança judicial e a rotina seguinte mantém Cobrança judicial | regra de negócio |
| C-024 | Envio do ofício 1003-L3 com modelo sem validação → recusado citando a validação; validado por Júlia → 1 e-mail registrado e passo feito com o e-mail ligado a ele | regra de negócio |
| C-025 | Lista de bloqueio, fila de e-mails da régua e quadro de cobrança privada não contêm o HU Federal; o caso dele não tem bloqueio devido; proposta de acordo para ele é recusada | regra de negócio |
| C-026 | Pagamento da 1003 em 2026-12-01: situação "Paga" com 14 dias de atraso; FMS Trindade em Pagos; agenda de Carlos sem o FMS Trindade; o recebido no mês do resumo sobe R$ 30.000 | regra de negócio |
| C-027 | NF 1005 com aviso "a confirmar"; validação da regra por Silvia recusada citando "Gerente"; por Gustavo sem link recusada citando "link"; com link: Verificado, validado por Gustavo em 2026-12-01 | regra de negócio |
| C-028 | Regra aplicada: 1004 Distrito Federal, 1001 e 1003 Municípios, 1002 Federal; órgão estadual de GO → Estado de Goiás; órgão sem esfera → Federal; com Tocantins escolhido na contratação: Estado do Tocantins | regra de negócio |
| C-029 | Certidões: federal vencendo em 9 dias; estadual vencendo em 15 dias; FGTS vencida; CNDT válida (19 dias); resumo para o painel: 2 vencendo, 1 vencida | regra de negócio |
| C-029 | Tipos sem certidão: com as quatro cadastradas, só "CND municipal" aparece como não cadastrada | regra de tela |
| C-030 | Documento: 1001 "Aguardando liquidação"; 1002 "Liquidada sem ordem de pagamento"; 1003 "Sem empenho"; 1009 "Ordem de pagamento emitida" | regra de tela |
| C-031 | Contratos de créditos vigentes: 4; em alerta: 2 (SES-DF por saldo, FMS Trindade por vigência); resumo para o painel: 2 contratos em alerta | regra de negócio |
| RN-001 | Coberto por C-001 (três etapas, prazos 1/8/2, decisão em 11 dias) | regra de negócio |
| RN-002 | removida — itens de checklist são do quadro da `004`; como os testes da `004` são da Privada, a evidência fica aqui: o quadro de concessão pública nasce com os itens das etapas Recebimento (3), Análise (5) e Classificação (2), no texto do artefato | regra de negócio |
| RN-003 | Com os dois itens marcados, capacidade "Média", perfil "Pontual" e rating P1 calculado, levar à Classificação é aceito | regra de negócio |
| RN-004 | removida — coberta por C-014 da `004` | — |
| RN-005 | Saldo R$ 80.000 com vigência 2026-12-01 (hoje): aprovação possível | regra de negócio |
| RN-006 | removida — coberta por C-020 da `004` | — |
| RN-007 | Alçada exigida pelo limite proposto: 100.000 Supervisor; 100.000,01 Gerente; 1.000.000 Gerente; 1.000.000,01 Diretoria; limite acima da exposição máxima do motor → Comitê de crédito (exceção ao motor) | regra de negócio |
| RN-008 | removida — coberta por C-012 da `004` | — |
| RN-009 | Dados do C-008 com empenho prévio "Não" → decisão "Não entregar sem nota de empenho" | regra de negócio |
| RN-010 | CAPAG "Não consultada" federal → 30, municipal → 12; pessoal não informado federal → 15, estadual → 7; pessoal 54% municipal → 5; 54,1% → 0; fonte "Recursos próprios" → 6 | regra de negócio |
| RN-011 | CAPAG A → Alta; com capacidade alterada à mão para "Baixa", mudar a CAPAG para B mantém "Baixa" | regra de negócio |
| RN-012 | Perfil "Pontual" com atraso médio 100 → critério 4; sem perfil e atraso médio 50 → 6; sem perfil e sem histórico → 10 | regra de negócio |
| RN-013 | Estadual em 2026-04-30 → sem desconto; em 2026-05-01 → −5; municipal em 2028-05-01 → −5; municipal em 2026-12-01 → sem desconto | regra de negócio |
| RN-014 | Nota 80 → P1; 79 → P2; 60 → P2; 59 → P3; 39 → P4; pessoal 55% municipal com nota 85 → P3 | regra de negócio |
| RN-015 | Base 123.456 em P2 → exposição 99.000; sem base e valor solicitado 50.000 em P4 → 13.000 | regra de negócio |
| RN-016 | Sem base → "Informe a base"; contrato vigente "Não" com P1 → "Não fornecer sem contrato"; nota 30 → "Levar à Diretoria" | regra de negócio |
| RN-017 | Base edital lista 5 evidências (edital + 4); base contrato lista 6 | regra de tela |
| RN-018 | Coberto por C-012 | regra de negócio |
| RN-019 | Regra do Distrito Federal inativa: órgão estadual do DF passa a usar Federal | regra de negócio |
| RN-020 | NF federal sem protocolo emitida em 2026-10-01: marco = emissão, liquidar até 2026-10-16; NF 1002 (liquidada em 20/10): pagar até 2026-11-04; regra em corridos 10+10 com protocolo 2026-10-30: liquidar até 2026-11-09 | regra de negócio |
| RN-021 | Contratação R$ 64.000: NF de 2025-12-15 sem pequeno valor; NF de 2026-01-10 com pequeno valor; regra em dias corridos nunca corta pela metade; contratação com valor estimado zero não é pequeno valor | regra de negócio |
| RN-022 | Prazo de contrato de 30 dias na NF 1003 (pequeno valor, protocolo 2026-11-03): pagar até 2026-12-03, sem corte pela metade; liquidar até continua 2026-11-10 | regra de negócio |
| RN-023 | Emissão 2026-12-31 → limite 2027-02-28; 2027-01-31 → 2027-03-31; 2026-09-28 → 2026-11-28 | regra de negócio |
| RN-024 | NF 1004 etapa "ordem de pagamento emitida", situação "No prazo"; NF não protocolada continua "Protocolar a NF" mesmo com o liquidar até vencido (hoje simulado em 2027-01-31) | regra de negócio |
| RN-025 | NF com 1 de 2 parcelas paga não é paga (coberto por C-013); ordem de pagamento sem liquidação recusada citando "liquidação" | regra de negócio |
| RN-026 | Card da SES-DF: R$ 52.000 em aberto, 3 NFs, prazo 2026-12-01; a posição financeira do HU Federal é a mesma antes e depois do processamento das NFs | regra de negócio |
| RN-027 | Passos da NF 1001: Confirmar 2026-10-06, L1 2026-10-19, L2 2026-10-23, L3 2026-10-30, G1 2026-11-03, G2 2026-11-09, G3 2026-11-24, G4 2026-12-15, M2 2026-12-02; NF 1002 sem passos L e sem Confirmar | regra de negócio |
| RN-028 | Coberto por C-020 (uma ação por órgão; o M2 da 1002 não é a ação do HU Federal porque o G5 da 1009 é mais antigo); empate em 25/11 na NF 1003 entre L3 e G2 → L3 | regra de negócio |
| RN-029 | Com o parâmetro de antecedência em 15 dias úteis, o 1001-G4 passa a poder ser marcado | regra de negócio |
| RN-030 | Coberto por C-022 e C-026; NF com L3 vencido e não feito já põe o órgão em Ofício | regra de negócio |
| RN-031 | removida — checklist e prazo das etapas são do quadro da `002`; como os testes da `002` são da Privada, a evidência fica aqui: o quadro de cobrança pública nasce com os prazos de 2, 5, 10 e 10 dias (NF a protocolar, Liquidação vencida, Pagamento vencido, Ofício) e os itens de cada etapa no texto do artefato | regra de negócio |
| RN-032 | Coberto por C-023; com a baixa do FMS Goiânia aprovada na `002`, a NF 1001 fica baixada e a rotina seguinte não reabre a cobrança | regra de negócio |
| RN-033 | Tipo de mensagem: 1002 → requerimento; 1008 → protocolo; 1005 → protocolo; 1001 → liquidação vencida; 1004 → fila. E-mail de liquidação vencida (1003-L1) sai sem validação | regra de negócio |
| RN-034 | Coberto por C-030 | regra de tela |
| RN-035 | Ana (agente) editando prazo recusada; regra do Tocantins validada por Gustavo e depois com prazo de pagamento alterado por Silvia volta para "A confirmar"; carga inicial: 5 regras, todas "A confirmar" | regra de negócio |
| RN-036 | Coberto por C-029; renovar a CND federal com validade 2027-05-30 tira o alerta e mantém a anterior guardada; validade em hoje + 15 dias alerta, em hoje + 16 não | regra de negócio |
| RN-037 | Coberto por C-031; vigência em hoje + 60 dias alerta, em hoje + 61 não; saldo de 20% não alerta, de 19,99% alerta | regra de negócio |
| RN-038 | Ana, tentando lançar data numa NF do HU Federal, recebe "não encontrada"; a data lançada por Carlos grava Carlos como autor mesmo que a chamada informe outra pessoa; usuário sem vínculo é recusado; um Supervisor de outra equipe vê a nota do motor de uma solicitação na etapa de decisão (é quem pode decidir na alçada), mas não recalcula a nota nem a vê fora da decisão | regra de negócio |
| RN-039 | Depois de salvar a análise, lançar uma data, marcar um passo, validar uma regra e renovar uma certidão, a auditoria tem uma linha de cada uma com autor, campo, antes e depois | regra de negócio |
| RF-016 | Texto da situação: liquidação vencida em 2026-10-16 → "Liquidação vencida desde 16/10"; paga com 26 dias → "Paga com 26 dias de atraso"; etiqueta da regra: "Distrito Federal · a confirmar · prazo do contrato", "Municípios · a confirmar · pequeno valor", "Federal" | regra de tela |
| RF-004 | Análise com uma opção fora da lista (CAPAG "X") recusada; depois da decisão, mudar a CAPAG é recusado e mudar o saldo do contrato é aceito | regra de negócio |
| RF-013 | Lançar na NF 1004 as datas sem liquidação nem ordem de pagamento leva a SES-DF de "NF a protocolar" para "Liquidação vencida · cobrar atesto" no mesmo lançamento, com a nota "Etapa do órgão: Liquidação vencida · cobrar atesto"; relançar as datas devolve a SES-DF a "NF a protocolar" | regra de negócio |
| RF-014 | Com o crédito do FMS Goiânia aprovado, a NF 1001 fica ligada a essa contratação (a mais recente do órgão); trocar a contratação da NF 1003 por uma de outro órgão é recusado | regra de negócio |
| RF-017 | Lista das 7 NFs: as 4 vencidas primeiro, pelo pagar até (1009, 1001, 1002, 1003), depois as no prazo, a 1004 primeiro; busca pelo empenho 2026NE000812 e por "Goiânia" devolve só a 1001 | regra de negócio |

Verificação manual:

- [ ] C-008 — o bloco do motor abre com nota, rating, exposição e decisão em destaque e os pontos por critério em barras, em tema claro e escuro
- [ ] C-020 — a ação da agenda leva à NF, abre a mensagem preenchida e o envio pede confirmação
- [ ] C-014 a C-016 — o trilho de cada nota mostra as datas lançadas e o ponto em que travou; o lançamento das datas acontece sobre o próprio trilho
- [ ] RF-034 — fluxo da NF pública legível em telefone (o trilho vira lista)
- [ ] RNF-001 e RNF-002 — cronometrados na massa de teste

## Fora de escopo

- [ ] Esteira de concessão ao órgão: lista, criação e movimentação da solicitação, checklist das etapas, decisão (aprovada, pré-aprovada, recusada), alçada, segregação, crédito ativo, validade, monitoramento, reavaliação e obsolescência — ficaram com a `004`, na carteira Pública (D-05). O checklist das etapas depois da aprovação não tem texto no protótipo e não é semeado (P-29).
- [ ] Quadro e card da cobrança pública, agenda, registro de contato com o órgão, previsão de pagamento (promessa), baixa como perda, encargos da NF em atraso (0% de multa, 0,5% a.m. na carteira Pública) e visão gerencial da cobrança — ficaram com a `002`, na carteira Pública (D-05). A etapa "Baixados como perda" é do quadro da `002`.
- [ ] Envio do órgão ao Jurídico, dossiê público e processo — `003`. Painel executivo — `006`.
- [ ] Posição financeira do órgão pelo prazo legal — não existe: a posição é a da `001`, pelo vencimento do título (P-09).
- [ ] Bloqueio de pedidos, negativação, protesto, acordo parcelado, fila de e-mails da régua e notificação extrajudicial para órgão — não existem (RF-027).
- [ ] Criticidade, saúde, farol e probabilidade de inadimplência do órgão — não são calculados; o risco do órgão é o rating P1–P4.
- [ ] NF paga com atraso contada como recuperação — a recuperação é medida pelos recebimentos (`001`/`006`); aqui a NF só mostra "Paga com N dias de atraso".
- [ ] Eventos previstos da NF na agenda (protocolar hoje, liquidação prevista, pagamento previsto) — a agenda traz a próxima ação da régua; as datas previstas ficam no trilho da nota.
- [ ] Indicadores "aguardando liquidação", "liquidadas sem pagamento" e "recebido no mês" na tela de NFs desta spec — a lista filtra por situação; os números vão no resumo entregue ao painel (`006`), que os mostra no funil (RF-018).
- [ ] Marcar evidência como presente pelo tipo do anexo — os anexos do card não têm tipo; a ficha lista as evidências exigidas.
- [ ] Histórico de textos antigos dos modelos de comunicação — o modelo guarda a versão atual e quem validou; as alterações ficam na auditoria da `001`.
- [ ] Lançar NF à mão — a NF vem só do Winthor (RF-012).
- [ ] Escrever no Winthor (constitution IV) — empenho, protocolo, atesto, liquidação e ordem de pagamento vivem no sistema.
- [ ] Ler empenho, liquidação ou ordem de pagamento de portais de transparência, Siafi ou sistemas dos entes — lançamento manual.
- [ ] Consultar CAPAG, Siconfi ou CAUC automaticamente — o analista consulta e informa.
- [ ] Emitir certidão — o sistema guarda e alerta; a emissão é nos sites dos órgãos.
- [ ] Gerar PDF do ofício ou do requerimento — o texto sai pronto para e-mail ou para copiar; PDFs são da `003`.
- [ ] WhatsApp — o canal inicial é e-mail (decisão de 11/11/2026).
- [ ] Migração das NFs, regras e certidões do protótipo — não migra (P-02).

## Pendências

Nenhuma bloqueia a construção: cada uma tem padrão adotado (números do índice
do contrato técnico).

| # | Pergunta | Padrão adotado |
|---|---|---|
| P-05 | Colunas do Winthor para número, série e valor da NF, ligação da NF com as parcelas e campo do empenho | nomes previstos no contrato; empenho lançado à mão até a confirmação |
| P-09 | Posição do órgão: vencimento do título ou prazo legal da NF? | vencimento do título; o prazo legal fica nas telas de NF (RN-026) |
| P-14 | Códigos de ramo público e esfera por ramo | ramos 11–15 e prefixo "ORGAO PUBLICO"; esfera do ramo quando configurada, senão lançada à mão |
| P-22 | Órgão sem contrato pode ser aprovado? | só pré-aprovado; aprovar exige contrato ativo e, acima do pré-aprovado, nova decisão (RN-005) |
| P-23 | Regras de pagamento por ente da carga inicial | nascem "A confirmar"; Jurídico, Gerente ou Diretoria valida (RN-035) |
| P-06 / P-11 | Quem valida ofício e requerimento | Jurídico, ou Gerente e acima; sem validação em dia não envia (RN-033) |
| P-29 | Checklist das etapas públicas depois da aprovação | não semeado |
| P-47 | Pequeno valor: vale o limite vigente na contratação ou na emissão da NF? | emissão da NF (RN-021) |

Resolvidas pelo contrato, sem pergunta ao gestor: quem lança as datas da NF
(agente ou analista do órgão, ou quem está acima); item de contrato/empenho na
pré-aprovação por edital (RN-003).

## Anexo A — Modelos de comunicação com o órgão

Campos preenchidos pelo sistema: `[ORGAO]`, `[NUMERO_NF]`, `[EMISSAO_NF]`,
`[VALOR_NF]`, `[EMPENHO]`, `[CONTRATO]`, `[PROTOCOLO]`, `[DATA_LIQUIDAR_ATE]`,
`[DATA_PAGAR_ATE]`, `[DIAS_ATRASO_NF]`, `[CLIENTE]` (o contato destinatário),
`[AGENTE]`, `[ASSINATURA]`. Textos iniciais; Gerente ou acima edita e a
validação é exigida nos marcados com ⚖.

| Modelo | Quando | Assunto | Conteúdo |
|---|---|---|---|
| Análise | análise de crédito | Fluxo de pagamento · `[ORGAO]` | Pede ao financeiro do órgão o fluxo de pagamento (quem atesta, quem liquida, prazo usual, ordem cronológica por fonte) e o contato do fiscal do contrato `[CONTRATO]` |
| Protocolo | NF entregue ou protocolada no prazo | NF `[NUMERO_NF]` · confirmação de protocolo | Informa a NF `[NUMERO_NF]` de `[EMISSAO_NF]`, valor `[VALOR_NF]`, empenho `[EMPENHO]`; pede a confirmação do protocolo e do atesto, com certidões anexas |
| Liquidação vencida | passo L1 | NF `[NUMERO_NF]` · liquidação pendente | Registra que o prazo de liquidação venceu em `[DATA_LIQUIDAR_ATE]`, pede as pendências do atesto e a previsão de liquidação |
| Posição na fila (LAI) | passo G2 | Pedido de informação · NF `[NUMERO_NF]` | Com base na Lei 12.527/2011 (LAI) e no art. 141 da Lei 14.133/2021, pede a posição da NF na ordem cronológica de pagamentos e a data prevista |
| Pagamento vencido | passo G1 | NF `[NUMERO_NF]` · pagamento vencido | Registra que o pagamento venceu em `[DATA_PAGAR_ATE]`, há `[DIAS_ATRASO_NF]` dias, e pede a programação do pagamento |
| Ofício ⚖ | passos L3 e G4 | Ofício · cobrança da NF `[NUMERO_NF]` | Dirigido ao ordenador de despesa: histórico da NF, prazos legais vencidos, pedido de liquidação ou pagamento e de resposta em 10 dias úteis |
| Requerimento ⚖ | passo M2 | Requerimento administrativo · NF `[NUMERO_NF]` | Registra atraso superior a 2 meses da emissão (art. 137 da Lei 14.133/2021), requer reconhecimento da dívida e programação de pagamento, resposta em 10 dias úteis |

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida, com quem ficou com o que saiu
- [x] Cenários cobrem caminhos de erro (C-002, C-003, C-004, C-018, C-024, C-025, C-027)
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta ou marcado como removido
- [x] Zero `[NEEDS CLARIFICATION]` em aberto — pendências com padrão adotado (seção Pendências)
