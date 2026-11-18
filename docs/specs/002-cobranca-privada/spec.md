# Spec: Cobrança das três carteiras (privada, Estética e pública)

**ID:** 002-cobranca-privada · **Status:** em revisão · **Data:** 2026-11-14 (revisada contra o contrato técnico)

> **Escopo (decisão D-05, 14/11/2026).** O nome da pasta fica, mas esta spec
> deixou de ser "só privado": é a cobrança das **três carteiras** — Privada,
> Estética e Injetáveis, e Pública. O caso de cobrança, os contatos, as
> promessas, o acordo, a baixa como perda, a agenda, os encargos e o envio ao
> Jurídico são um só para as três. O que muda de uma carteira para outra é
> dado: as etapas do quadro de cada carteira e o valor dos parâmetros.
>
> Três coisas **não valem para o órgão público** (exceções E-1 a E-3 da
> decisão): a etapa do órgão não sai dos dias de atraso, sai do andamento das
> notas fiscais, e quem a calcula é o módulo de NF pública (spec `005`), que só
> informa a esta spec em que etapa o órgão está; a régua de comunicação com o
> órgão é por nota fiscal e também é da `005`; e acordo parcelado, bloqueio de
> pedidos, fila de e-mails da régua e notificação extrajudicial não existem
> para o órgão.
>
> O que vem do ERP (cliente, títulos, saldos por carteira e por BU,
> recebimentos), a equipe, os parâmetros e o seu editor, os feriados, a ficha de
> contatos, os modelos de mensagem e o seu editor, o envio de e-mail, os anexos
> e a auditoria são da spec `001-base`. O dossiê e o processo jurídico são a
> `003`; PDD, roll rate e painel executivo são a `006`. Fases, cartão, card
> aberto, histórico de passagem, prazo da etapa, tarefas, chat e anexos do
> quadro são do motor de quadros comum a todo o sistema (arquitetura §8); aqui
> ficam só as regras da cobrança dentro dele.
>
> Fonte das regras: o artefato do gestor estudado em `docs/estudo-artefato/`
> (relatório C, com B, D e A). O artefato é referência de regra, não de tela.

## Problema

O dinheiro vencido da Benenutri é cobrado hoje num painel montado por um gestor,
onde saldo e dias de atraso são digitados ou importados de planilha, o e-mail
sai por copiar e colar, a aprovação de acordo e de baixa é conferida só na tela
e qualquer pessoa com acesso de escrita aprova qualquer coisa. O resultado: a
régua avança com dado velho, cliente que já pagou continua sendo cobrado,
bloqueio no ERP depende de alguém lembrar, e ninguém consegue provar quem
aprovou um acordo fora do padrão ou uma baixa de R$ 50 mil.

## Resultado esperado

Todo cliente com título vencendo ou vencido — privado, da Estética ou órgão
público — aparece sozinho na etapa certa do quadro da sua carteira, com o que fazer hoje, o e-mail pronto e o
histórico do que já foi feito; o agente só registra o que aconteceu, e acordo,
baixa e e-mail formal saem com a aprovação de quem tem alçada para isso.

## Usuários

| Perfil | O que precisa fazer | Frequência |
|---|---|---|
| Agente de cobrança | Trabalhar os próprios clientes nas três carteiras: agenda do dia, contatos, promessas, checklist da etapa, e-mails manuais, propor acordo e baixa, montar o dossiê, aplicar a lista de bloqueio no ERP | diária |
| Supervisor | Tudo do agente na própria carteira e na dos agentes abaixo dele; aprovar e-mails "com aprovação"; aprovar acordo na sua alçada | diária |
| Gerente financeiro | Tudo do supervisor em toda a carteira; aprovar acordo fora do padrão e baixa na sua alçada; enviar o dossiê ao Jurídico | diária |
| Diretoria | Ver toda a carteira e a visão gerencial; decidir baixa e acordo acima das alçadas inferiores | semanal |
| Jurídico | Ver, só para leitura, a cobrança dos clientes que têm processo no Jurídico; dar parecer nas propostas de baixa | semanal |
| Administrador | Administrar os quadros da cobrança (nome, prazo e campos das etapas); soma-se ao cargo da pessoa, não muda o que ela enxerga | mensal |

O **cargo** define o que a pessoa enxerga e a sua alçada. Os parâmetros da
política são editados na tela de parâmetros da base, por quem a `001` autoriza
(no contrato, gerente financeiro ou acima, ou quem tem a marca Administrador); ser **administrador** acrescenta a
administração dos quadros.

## Cenários

**C-001 — Cliente entra na régua pelo atraso**
- **Dado que** o ERP mostra o Hospital Aurora (privado) com R$ 3.200,00 vencidos há 5 dias e a régua usa os valores padrão
- **Quando** a sincronização com o ERP termina
- **Então** o cliente aparece na coluna "D+4 · Cobrança ativa", com a ação "Ligar para o financeiro, avisar o vendedor e bloquear novos pedidos" a fazer, e entra na lista "a bloquear para novos pedidos"

**C-002 — Preventiva antes do vencimento**
- **Dado que** a Clínica Boa Vista não tem nada vencido e tem R$ 8.000,00 vencendo daqui a 3 dias; a Farmácia São Bento vence R$ 4.500,00 amanhã; o Laboratório Delta vence R$ 2.000,00 hoje
- **Quando** a sincronização termina
- **Então** os três aparecem, respectivamente, em "D-5 · Lembrete", "D-1 · Confirmação" e "D+0 · Vencimento", com o valor do próximo vencimento no cartão

**C-003 — Quem pagou sai da cobrança**
- **Dado que** a Casa Esperança está em "D+7 · Notificação formal" com R$ 6.000,00 vencidos e o bloqueio de novos pedidos já foi aplicado no ERP
- **Quando** a sincronização seguinte mostra o saldo vencido zerado
- **Então** o cliente vai para "Regularizados" sem ninguém mover nada, e passa a constar na lista "a liberar no ERP"

**C-004 — Estética com régua própria**
- **Dado que** foi definida, só para a carteira Estética, a cobrança ativa em D+6 (o padrão é D+4)
- **Quando** a Estética Harmonia (carteira Estética) e o Hospital Aurora (carteira Privada) têm os dois 5 dias de atraso
- **Então** a Estética Harmonia fica em "D+2 · Pagamento não identificado", no quadro da Estética, onde a coluna seguinte se chama "D+6 · Cobrança ativa"; e o Hospital Aurora fica em "D+4 · Cobrança ativa", no quadro privado

**C-005 — Ação da régua feita**
- **Dado que** o Hospital Aurora está em "D+4 · Cobrança ativa" com o checklist vazio
- **Quando** o agente marca "Ligação com o responsável financeiro do cliente" e depois "Vendedor avisado e novos pedidos bloqueados no ERP"
- **Então** depois do primeiro item a ação continua "a fazer"; depois do segundo, ela aparece como feita no cartão e sai da agenda, mesmo sem o item "Data e valor de pagamento registrados"

**C-006 — A régua não se move à mão (erro)**
- **Dado que** a Clínica Boa Vista está em "D-5 · Lembrete", sem nada vencido, e o Hospital Aurora em "D+4 · Cobrança ativa"
- **Quando** alguém abre o card da Clínica Boa Vista e usa "Mover para: Em negociação", ou abre o do Hospital Aurora e usa "Mover para: D-1 · Confirmação"
- **Então** nada muda: a primeira é recusada com "Só cliente com saldo vencido entra em negociação." e a segunda com "A régua move o card pelos dias de atraso."

**C-007 — Voltar da negociação para a régua**
- **Dado que** a Distribuidora Ômega está "Em negociação", sem acordo proposto nem ativo, e tem 12 dias de atraso
- **Quando** o agente abre o card e usa "Mover para"
- **Então** o destino oferecido na régua é o dos dias de atraso dela, "D+10 · Protesto em cartório"; as outras etapas da régua aparecem desabilitadas com o motivo "A régua move o card pelos dias de atraso."; movido, o cliente volta a andar sozinho. Se por outro caminho ele for parar em outra etapa da régua, a rodada seguinte o reposiciona. Com acordo proposto ou ativo, sair da negociação é recusado com "Há acordo em aberto neste caso."

**C-008 — Destinos que só o sistema alcança (erro)**
- **Dado que** o Hospital Aurora tem saldo vencido
- **Quando** alguém abre o card e usa "Mover para" com destino "Baixados como perda", "Regularizados", "Acordo em andamento" ou "D+45 · Cobrança judicial"
- **Então** nada muda, e a mensagem explica, conforme o destino: "O caso é encerrado pelo sistema (saldo zerado) ou pela decisão de baixa."; "O card vai para Acordo quando o acordo é aprovado."; "Envie o dossiê pelo quadro Jurídico."

**C-009 — Contato com promessa de pagamento**
- **Dado que** o Hospital Promessa tem R$ 5.000,00 vencidos
- **Quando** o agente registra, com data 13/11/2026, um contato por telefone com retorno "Promessa de pagamento", previsão 19/11/2026, valor R$ 5.000,00 e o feedback da conversa
- **Então** o contato entra no histórico com o nome do agente, nasce uma promessa aberta de R$ 5.000,00 para 19/11/2026 e a próxima ação passa a ser "Conferir pagamento prometido" em 19/11/2026

**C-010 — Promessa longa demais (erro)**
- **Dado que** o limite de promessa é de 5 dias úteis e 20/11/2026 é feriado
- **Quando** o agente registra, com data 13/11/2026, uma promessa para 24/11/2026
- **Então** o sistema recusa com "Promessa acima de 5 dias úteis: registre um acordo formal com entrada", e aceitaria a mesma promessa para 23/11/2026

**C-011 — Promessa cumprida, promessa quebrada**
- **Dado que** a Clínica Mista, em contato de 30/10/2026, prometeu R$ 2.000,00 para 03/11/2026 e pagou R$ 2.000,00 em 05/11/2026; depois prometeu mais duas vezes, em 06/11 para 09/11 e em 09/11 para 10/11, sem pagar mais nada
- **Quando** o sistema reavalia as promessas
- **Então** a primeira fica "cumprida" (pagamento dentro da tolerância de 3 dias), as outras duas "quebradas", e a agenda do agente mostra hoje "2 promessas quebradas: exigir acordo formal com entrada ou avançar a régua"

**C-012 — Acordo dentro do padrão**
- **Dado que** a Rede Vida deve R$ 10.000,00 e o agente propõe acordo de R$ 10.000,00 com entrada de R$ 2.000,00 e 4 parcelas mensais
- **Quando** o supervisor do agente aprova
- **Então** o acordo fica ativo com a entrada e 4 parcelas de R$ 2.000,00, o cliente vai para "Acordo em andamento" e sai da régua automática; enquanto a proposta aguardava, o cliente ficou "Em negociação"

**C-013 — Acordo fora do padrão sobe de alçada**
- **Dado que** o Mercado Leste deve R$ 20.000,00 e o agente propõe entrada de R$ 2.000,00 (10%)
- **Quando** o supervisor tenta aprovar, e depois o gerente financeiro aprova
- **Então** a aprovação do supervisor é recusada com a explicação de que entrada abaixo de 20% exige o gerente financeiro; a do gerente é aceita

**C-014 — Quem propõe não aprova (erro)**
- **Dado que** o gerente financeiro propôs um acordo para o Hospital Leste
- **Quando** ele mesmo tenta aprová-lo
- **Então** o sistema recusa com "quem propôs o acordo não pode aprová-lo", e a Diretoria consegue aprovar

**C-015 — Acordo quebrado volta para a régua**
- **Dado que** a Farmácia Oeste tem acordo ativo, a tolerância de quebra é de 5 dias e a parcela 1 venceu há 6 dias sem pagamento; o cliente tem 25 dias de atraso no ERP
- **Quando** o sistema reavalia os acordos
- **Então** o acordo fica "quebrado" e o cliente volta para a régua em "D+20 · Negociação pós-protesto"; um acordo com parcela vencida há 5 dias continua ativo

**C-016 — Baixa como perda com alçada e parecer**
- **Dado que** a Clínica Antiga deve R$ 8.000,00 há 200 dias e a Distribuidora Falida R$ 50.000,00
- **Quando** o agente propõe a baixa de R$ 8.000,00 por "Esgotadas as vias de cobrança", o Jurídico dá parecer, o supervisor tenta aprovar e o gerente aprova; e o gerente propõe a baixa de R$ 50.000,00 e tenta aprová-la antes e depois do parecer do Jurídico
- **Então** a baixa de R$ 8.000,00 é recusada ao supervisor (exige gerente financeiro) e aprovada pelo gerente, e o cliente vai para "Baixados como perda"; a de R$ 50.000,00 é recusada sem parecer do Jurídico, recusada ao gerente por ter sido ele o proponente e por estar acima da alçada dele, e só a Diretoria consegue aprovar

**C-017 — Carta de anuência depois do protesto**
- **Dado que** o Hospital Centro teve o título protestado e o ERP passou a mostrar o saldo vencido zerado
- **Quando** o cliente vai para "Regularizados"
- **Então** o cartão e a agenda mostram "carta de anuência pendente" com prazo de 5 dias úteis; depois que o agente registra o envio, a pendência some. A Casa Esperança, que regularizou sem protesto, não tem pendência de anuência

**C-018 — E-mail que precisa de aprovação**
- **Dado que** a Clínica Serra está em "D+7 · Notificação formal", tem e-mail no contato principal da ficha, a etapa está no modo "com aprovação" e o texto da notificação formal está validado
- **Quando** a fila do dia é montada, o agente tenta aprovar o e-mail e depois o supervisor aprova
- **Então** o e-mail aparece como "Aguardando aprovação" com assunto e texto já preenchidos; a aprovação do agente é recusada; a do supervisor envia o e-mail, registra um contato "E-mail da régua enviado" no histórico, marca o item "Notificação formal enviada" do checklist e o e-mail não volta à fila no mesmo ciclo. Com o texto ainda sem validação, a aprovação é recusada com "Modelo aguardando validação" e nada é enviado

**C-019 — Cliente sem e-mail (erro)**
- **Dado que** o Laboratório Sem Contato está em "D+2 · Pagamento não identificado" e a ficha de contatos não tem nenhum e-mail
- **Quando** a fila do dia é montada
- **Então** o item aparece como "Sem e-mail cadastrado" e o envio é recusado até a ficha ganhar um e-mail

**C-020 — Lista de bloqueio para o ERP**
- **Dado que** o Hospital Aurora (5 dias) deve ter novos pedidos bloqueados, a Clínica Norte (47 dias) deve ter bloqueio total e a Casa Esperança regularizou com bloqueio aplicado
- **Quando** o agente abre a lista de bloqueio
- **Então** vê o Hospital Aurora em "a bloquear: novos pedidos", a Clínica Norte em "a bloquear: total" e a Casa Esperança em "a liberar"; ao registrar "aplicado no ERP" para o Hospital Aurora, ele sai de "a bloquear" e passa a "bloqueados", e o item "Vendedor avisado e novos pedidos bloqueados no ERP" do checklist fica marcado

**C-021 — Cada um vê a sua carteira**
- **Dado que** o agente A1 responde ao supervisor S1, o agente A2 ao supervisor S2, e ambos os supervisores ao gerente G
- **Quando** cada um abre o quadro, a agenda, as listas e a visão gerencial
- **Então** A1 vê só os clientes dele, em tudo; nas listas, na agenda e na visão gerencial, S1 vê os de A1 e os próprios, S2 não vê nenhum cliente de A1 e G vê todos; no quadro, supervisor e gerente veem todos os cards (o quadro não corta por equipe), mas S2, ao abrir o card de um cliente de A1, não recebe o conteúdo da cobrança ("Cliente não encontrado.") e não consegue operar nele

**C-022 — Minha agenda nos próximos 7 dias úteis**
- **Dado que** hoje é 19/11/2026 (quinta), 20/11 é feriado e o agente tem uma promessa para 19/11, uma parcela de acordo para 21/11 (sábado) e uma ação da régua atrasada desde 17/11
- **Quando** abre "Minha agenda"
- **Então** a semana mostra os dias 19, 23, 24, 25, 26, 27 e 30/11; a promessa aparece em 19/11, a parcela em 23/11 e a ação da régua na coluna "Ações atrasadas"

**C-023 — Dossiê primeiro, depois a cobrança judicial**
- **Dado que** a Clínica Norte tem 47 dias de atraso e está em "D+30 · Extrajudicial" com a marca "Pronto para o Jurídico"
- **Quando** o agente monta o dossiê a partir do card, tenta enviá-lo ao Jurídico, e depois o gerente financeiro envia o dossiê completo
- **Então** o agente consegue abrir e montar o dossiê, mas o envio por ele é recusado (exige gerente financeiro ou acima); o envio do gerente leva o cliente a "D+45 · Cobrança judicial" com data e responsável, marca o item "Dossiê completo enviado ao Jurídico", tira o cliente da régua automática e o torna visível, só para leitura, ao perfil Jurídico. Repetir o envio não duplica nada

**C-024 — Visão gerencial**
- **Dado que** a BU de teste tem três clientes: A com R$ 10.000,00 vencidos há 20 dias; B com R$ 30.000,00 a vencer; C com R$ 5.000,00 vencidos há 95 dias e R$ 5.000,00 a vencer
- **Quando** o gerente abre a visão gerencial filtrada por essa BU
- **Então** o índice de inadimplência é 30,0% (15.000 ÷ 50.000), o saldo vencido é R$ 15.000,00 em 2 clientes, acima de 90 dias são R$ 5.000,00 (33,3% do vencido) e o aging mostra R$ 10.000,00 em "1 a 30 dias" e R$ 5.000,00 em "91 a 180 dias"

**C-025 — Projeção de possível inadimplência**
- **Dado que** nos últimos 12 meses o cliente P pagou R$ 7.000,00 em dia e R$ 3.000,00 com atraso e tem R$ 10.000,00 a vencer; o cliente Q tem R$ 4.000,00 a vencer, 90% de pontualidade e algo vencido; o cliente R nunca pagou nada conosco e tem R$ 1.000,00 a vencer
- **Quando** o agente abre a projeção
- **Então** P aparece com chance de atraso de 30% e R$ 3.000,00 projetados; Q com 50% (piso de quem já está em atraso) e R$ 2.000,00; R com 5% ("sem histórico") e R$ 50,00

**C-026 — Valor atualizado com encargos**
- **Dado que** o Hospital Sul tem um único título de R$ 10.000,00 vencido há 30 dias e os encargos padrão (multa 2%, juros 1% ao mês, correção 0,4% ao mês)
- **Quando** o agente abre o card
- **Então** o valor atualizado é R$ 10.340,00 (multa R$ 200,00, juros R$ 100,00, correção R$ 40,00)

**C-027 — Órgão público anda pelo andamento da nota fiscal**
- **Dado que** a Secretaria Municipal de Saúde de Catalão (órgão público) tem R$ 50.000,00 vencidos há 40 dias, e o módulo de NF pública informa que a etapa do órgão é "Liquidação vencida · cobrar atesto", com a próxima ação "Cobrar o atesto com o fiscal do contrato" para 23/11/2026
- **Quando** a informação chega e, depois, a régua por dias de atraso roda
- **Então** o órgão aparece no quadro da cobrança pública em "Liquidação vencida · cobrar atesto", com a próxima ação na agenda do agente em 23/11/2026; a régua por dias não o move nem abre caso para ele; quando o módulo de NF informa que todas as notas foram pagas, o caso vai para "Pagos"

**C-028 — O que não existe para o órgão (erro)**
- **Dado que** a Secretaria Municipal de Saúde de Catalão está em cobrança
- **Quando** o agente tenta propor um acordo parcelado, e alguém procura o órgão na lista de bloqueio e na fila de e-mails da régua
- **Então** a proposta é recusada com "Esta carteira não tem acordo parcelado."; o órgão não aparece na lista de bloqueio nem na fila de e-mails

**C-029 — Contato, previsão, encargos e Jurídico do órgão são os mesmos**
- **Dado que** a Secretaria Municipal de Saúde de Catalão tem um único título de R$ 50.000,00 vencido há 40 dias
- **Quando** o agente registra, em 19/11/2026, um contato pelo canal "Ofício" sobre uma nota fiscal, com retorno "Aguardando liquidação (órgão)" e previsão de pagamento para 18/12/2026; abre o valor atualizado; e o gerente financeiro envia o dossiê ao Jurídico
- **Então** o contato entra no histórico ligado à nota fiscal e nasce a promessa para 18/12/2026 (a previsão do órgão não tem o limite de 5 dias úteis); o valor atualizado é R$ 50.600,17 (sem multa, juros de 0,5% ao mês R$ 333,33, correção R$ 266,84); e o envio leva o órgão a "Cobrança judicial"

**C-030 — Um cliente em duas carteiras**
- **Dado que** a Estética Lumina deve R$ 2.500,00 vencidos há 5 dias em produtos da Estética e R$ 1.000,00 vencidos há 12 dias em produtos de Nutrição
- **Quando** a sincronização termina
- **Então** há dois casos: um no quadro da Estética, em "D+4 · Cobrança ativa", com R$ 2.500,00; outro no quadro privado, em "D+10 · Protesto em cartório", com R$ 1.000,00; cada um com checklist, acordo e baixa próprios. Pagar só a parte da Estética regulariza só o caso da Estética

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | O sistema DEVE manter um caso de cobrança por cliente e carteira (Privada, Estética, Pública) para todo cliente com saldo vencido ou com vencimento na janela preventiva, recalculado depois de cada leitura do ERP | Cliente cujo saldo mudou no ERP aparece na etapa nova em até 15 minutos depois da leitura (C-001, C-003); cliente com saldo em duas carteiras tem um caso em cada (C-030) | must |
| RF-002 | O sistema DEVE colocar o cliente sem saldo vencido nas etapas preventivas pela data do próximo vencimento | Faixas de RN-002; cliente com 2 dias ou mais de atraso nunca fica em etapa preventiva (C-002) | must |
| RF-003 | O sistema DEVE colocar o cliente com saldo vencido na etapa da régua correspondente aos dias de atraso do título mais antigo da carteira, com os limites configurados por carteira | Faixas de RN-001; mudar um limite reposiciona os clientes na rodada seguinte (C-001, C-004); não se aplica à carteira Pública (RN-032) | must |
| RF-004 | O sistema DEVE mostrar um quadro por carteira, com as colunas na ordem das etapas, cada uma com nome, quantidade de clientes e valor | Coluna preventiva soma o próximo vencimento; "Baixados" soma o valor baixado; as demais somam o saldo vencido da carteira. Os cards se ordenam pelo prazo (vencimento mais antigo primeiro) | must |
| RF-005 | A capa do card DEVE mostrar, para ler de relance: código e nome do cliente, agente, saldo vencido (ou a vencer, na preventiva), composição do saldo por BU, prazo (vencimento mais antigo ou próximo vencimento), situação da ação da etapa, último contato, próxima ação com data, bloqueio, parcelas pagas do acordo e as marcas de pendência (protestado, bloqueio a aplicar, promessa vencida, sem contato, anuência pendente, baixa pendente, pronto para o Jurídico, Jurídico atrasado). O card aberto DEVE mostrar, além disso, o valor atualizado, o checklist, a promessa, o acordo, a baixa, o e-mail da etapa e o envio ao Jurídico | Cada item aparece quando se aplica e some quando não se aplica | must |
| RF-006 | O sistema DEVE permitir buscar no quadro por nome ou código do cliente e por BU, e filtrar por agente, por marca de pendência, por bloqueio, "meus cards" e "atrasados"; a carteira escolhe o quadro | Filtros combináveis; os totais das colunas respeitam agente e BU | must |
| RF-007 | O sistema DEVE permitir mudar o cliente de etapa só por "Mover para", dentro do card aberto, aplicando as regras de RN-024. O card não se arrasta | Cada destino recusado mostra a mensagem do cenário (C-006, C-007, C-008); movimento aceito fica no histórico do card | must |
| RF-008 | O sistema DEVE mostrar, no card aberto, o checklist da etapa atual com os itens de RN-005, permitir marcar cada item e "Registrar ação" | A ação fica feita quando todos os itens que a definem estão marcados (C-005) e guarda se foi feita no prazo (RN-033) | must |
| RF-009 | O sistema DEVE registrar contato de cobrança com data, canal, com quem falou, retorno, previsão e valor de pagamento e feedback | Feedback obrigatório; agente = quem está logado; data não futura (C-009) | must |
| RF-010 | O sistema DEVE criar promessa de pagamento a partir do contato com previsão e acompanhar a sua situação (aberta, cumprida, quebrada) | Regras de RN-007 e RN-008 (C-009, C-010, C-011) | must |
| RF-011 | O sistema DEVE manter uma próxima ação com data por cliente, definida pelo agente ou pelo próprio sistema (promessa, acordo) | Data em dia não útil vai para o próximo dia útil, com aviso (RN-019) | must |
| RF-012 | O sistema DEVE permitir propor acordo com valor, entrada, número de parcelas, primeiro vencimento e intervalo, gerando as parcelas, nas carteiras Privada e Estética | Parcelas pela RN-010; proposta deixa o cliente "Em negociação" (C-012); no órgão é recusada (C-028) | must |
| RF-013 | O sistema DEVE exigir aprovação do acordo na alçada antes de ativá-lo, e permitir recusar com motivo | Alçada da RN-009, segregação da RN-012 (C-012, C-013, C-014) | must |
| RF-014 | O sistema DEVE registrar o pagamento de cada parcela e da entrada, e quitar o acordo quando todas estiverem pagas | Acordo com todas as parcelas pagas fica "quitado"; o cliente regulariza quando o ERP mostra o saldo vencido zerado | must |
| RF-015 | O sistema DEVE quebrar o acordo com parcela vencida além da tolerância e devolver o cliente à régua; e permitir a supervisor ou acima cancelar acordo não quitado | RN-011 (C-015); cancelar devolve à régua na etapa dos dias de atraso | must |
| RF-016 | O sistema DEVE permitir propor baixa como perda com valor, motivo e documentos de suporte, receber parecer do Jurídico e decidir na alçada | RN-013, RN-014 e RN-012 (C-016) | must |
| RF-017 | O sistema DEVE controlar a carta de anuência de quem regularizou depois de protesto e registrar o seu envio | RN-020 (C-017) | must |
| RF-018 | O sistema DEVE calcular no servidor, título a título, o valor atualizado do saldo vencido com a multa, os juros e a correção da carteira; o mesmo cálculo serve ao demonstrativo do Jurídico e às notas fiscais de órgão | RN-015 (C-026, C-029) | must |
| RF-019 | O sistema DEVE manter, nas carteiras Privada e Estética, a lista de bloqueio para o ERP: a bloquear (novos pedidos e total), bloqueados e a liberar, e registrar quando o bloqueio ou a liberação foi aplicada no ERP | RN-004 (C-020); o sistema não escreve no ERP | must |
| RF-020 | O sistema DEVE mostrar a projeção de possível inadimplência dos clientes com saldo a vencer | RN-016; ordenada pelo valor projetado; os 10 maiores por padrão (C-025) | should |
| RF-021 | O sistema DEVE montar, nas carteiras Privada e Estética, a fila de e-mails do dia, um por caso e etapa com e-mail, com assunto e texto preenchidos a partir do modelo da etapa | RN-017, RN-018 e RN-021; situação de cada item (C-018, C-019) | must |
| RF-022 | O sistema DEVE ter um modo de envio por etapa e carteira — "manual", "com aprovação" ou "automático" —, editável nos parâmetros | Manual: o agente envia pelo card ou pela fila; com aprovação: só sai depois de aprovado por supervisor ou acima, e a aprovação envia (C-018); automático: a rotina envia sozinha, até 5 por rodada. Na implantação nenhuma etapa é automática (P-24) | must |
| RF-023 | O sistema DEVE enviar o e-mail pela conta de e-mail do sistema e registrar o envio no histórico do cliente e no checklist da etapa | RN-022 (C-018); envio em lote dos itens selecionados, em sequência e com progresso (no envio em lote, o item do checklist é marcado na rodada seguinte da régua, em até 5 minutos); modelo com efeito legal só sai com a validação do texto em dia | must |
| RF-024 | O sistema DEVE tirar da fila, sem enviar, o item cuja ação foi feita por outro meio (carta com AR, por exemplo) | Registrada a ação da etapa no card, o item sai da fila; o contato pelo canal usado é registrado à parte, pelo registro de contato | should |
| RF-025 | O sistema DEVE oferecer os 11 modelos de mensagem da régua (RN-023), editáveis na tela de modelos da base | Os 11 existem na implantação com o texto do artefato; os de efeito legal nascem "não validado" | must |
| RF-026 | O sistema DEVE levar o caso à cobrança judicial quando o dossiê é enviado ao Jurídico (spec 003), ou, na rodada seguinte da régua, quando o cliente tem processo aberto no Jurídico por outro caminho (cadastro direto, carga) | C-023: envio por gerente financeiro ou acima; repetir não duplica; vale para as três carteiras (C-029); processo aberto fora do dossiê leva o caso à cobrança judicial (RN-030) | must |
| RF-027 | O sistema DEVE mostrar "Minha agenda" por pessoa: os eventos da RN-025 em "Ações atrasadas" e nos próximos 7 dias úteis, das três carteiras | Supervisor e gerente escolhem a pessoa dentro do que enxergam (C-022) | must |
| RF-028 | A agenda DEVE listar o processo cliente a cliente: etapa, valor e dias em atraso, último contato, promessa, acordo e próximo passo, com filtros "com passo atrasado", "sem contato há mais de 7 dias", "com promessa" e "em acordo" | Ordenado pela data do próximo passo e depois pelo valor vencido | must |
| RF-029 | A agenda de quem tem alçada DEVE listar as aprovações pendentes: e-mails com aprovação, acordos e baixas na alçada da pessoa e, para o Jurídico, baixas aguardando parecer | Supervisor vê os e-mails e acordos dos subordinados; quem propôs não vê a própria proposta como pendência | should |
| RF-030 | O sistema DEVE mostrar a visão gerencial da cobrança: índice de inadimplência, saldo vencido, acima de 90 dias, vencendo em 5 dias, sem próxima ação, ações da etapa pendentes e no prazo, clientes bloqueados, conversão e promessas cumpridas no período | RN-026 (C-024); filtros de carteira, BU, agente e período | must |
| RF-031 | A visão gerencial DEVE mostrar o desempenho por agente: supervisor, clientes em atraso, saldo vencido sob gestão, índice de inadimplência, contatos no mês, promessas no mês, promessas cumpridas, recuperado no mês e ações atrasadas | Contatos e promessas contam para quem registrou; carteira conta para o agente do cliente | must |
| RF-032 | A visão gerencial DEVE mostrar inadimplência por BU (carteira, vencido, participação, índice, clientes em atraso, acima de 90 dias) e o aging da cobrança (a vencer, 1–30, 31–60, 61–90, 91–180, acima de 180 dias: clientes, valor, % da carteira, % do vencido) | C-024 | must |
| RF-033 | A visão gerencial DEVE mostrar clientes por etapa, contatos do período por retorno, acordos (ativos, quebrados, em dia, parcelas nos próximos 30 dias), baixas (pendentes por alçada, aguardando parecer, baixado no período) e os maiores devedores (maior devedor, participação dos 5 e dos 10 maiores) | Números batem com as listas de origem | should |
| RF-034 | O sistema DEVE mostrar o histórico de contatos de cobrança com busca e filtros por retorno e por promessa (aberta, quebrada) | Clique na linha abre o card do cliente | should |
| RF-035 | O sistema DEVE restringir listas, agenda, visão gerencial e o conteúdo da cobrança no card à carteira que a pessoa enxerga; no quadro, o agente vê só os próprios cards | RN-027 (C-021); corte feito pelo servidor, inclusive nos totais | must |
| RF-036 | O sistema DEVE guardar o histórico de passagem de cada caso pelas etapas e auditar toda ação de cobrança | Toda mudança de etapa, automática ou manual, tem data e autor (o sistema, em nome do agente, quando automática); ação de usuário entra na auditoria com antes e depois | must |
| RF-037 | O sistema DEVE mostrar as regras da cobrança (régua, checklists, encargos, alçadas, modos de e-mail, mensagens) a todos e levar quem pode editar parâmetros (regra da base) à edição, com validação do conjunto da régua | RN-028; edição auditada | must |
| RF-038 | O sistema DEVE sinalizar o cliente "Em negociação" além do prazo da etapa, o cliente com atraso além do dia do Jurídico sem dossiê enviado ("Pronto para o Jurídico") e além do prazo máximo ("Jurídico atrasado") | RN-029 e RN-030 | should |
| RF-039 | O sistema DEVE refletir no quadro da cobrança pública a etapa, o prazo e a próxima ação que o módulo de NF pública informa para cada órgão, sem aplicar a régua por dias | RN-032 (C-027) | must |
| RF-040 | O sistema DEVE registrar, para cada ação da etapa, se foi feita no prazo, e mostrar a parte das ações feitas no prazo na visão gerencial e por agente | RN-033 | must |
| RF-041 | A agenda DEVE avisar quando a ficha de contatos de um cliente em cobrança está vencida ou nunca foi revisada | Evento "Revisar ficha de contatos" na data de hoje; some quando a ficha é revisada | should |
| RF-042 | O sistema DEVE recusar, com explicação, a operação que a carteira não comporta (acordo, bloqueio e e-mail da régua no órgão) | C-028 | must |

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | Quadro, lista de bloqueio e visão gerencial respondem em até 2 s com 5.000 clientes em cobrança | Cronômetro com massa de 5.000 clientes no ambiente de teste |
| RNF-002 | A rodada da régua respeita o teto de 150 execuções do servidor e 45 s; o que não couber fica para a rodada seguinte, sem perder nem duplicar; rodada sem mudança no ERP não escreve nada | Contagem de execuções de uma rodada com mais casos novos do que cabem: no máximo 150, com o restante devolvido como pendente; segunda rodada sem mudança: zero escrita |
| RNF-003 | Abrir o card de um cliente custa duas chamadas ao servidor: a do quadro e uma da cobrança | Contagem de chamadas no abrir do card |
| RNF-004 | Minha agenda abre em até 3 s para uma carteira de 500 clientes | Cronômetro com 500 clientes de um agente |
| RNF-005 | Toda regra de permissão, alçada e segregação é decidida no servidor, com a identidade da sessão | Chamada direta ao servidor com outro usuário no lugar do logado é recusada |
| RNF-006 | Abrir uma tela custa no máximo 6 chamadas ao servidor; um clique de escrita, no máximo 20 execuções; envio em lote dividido em chamadas que cabem nesse teto, feitas em sequência | Contagem no teste automatizado das três operações mais caras |

## Entidades do domínio

- **Carteira** — Privada, Estética ou Pública. O cliente público está sempre
  na carteira Pública; o saldo dos demais se divide entre Privada e Estética
  pela BU dos itens comprados (spec 001). Cada carteira tem o seu quadro e pode
  ter valor próprio em cada parâmetro.
- **Caso de cobrança** — um ciclo de cobrança de um cliente numa carteira: do
  dia em que entra na janela preventiva ou atrasa até regularizar, ser pago no
  vencimento ou ser baixado. Um cliente tem no máximo um caso aberto por
  carteira; voltar a atrasar abre um caso novo, com checklist vazio. O caso
  guarda a próxima ação, se foi protestado, a anuência, o envio ao Jurídico, o
  bloqueio devido e o aplicado e o valor baixado. Saldo, dias de atraso,
  vencimentos e recebimentos vêm do ERP (spec 001).
- **Etapa** — a coluna do quadro em que o card do caso está. Na Privada e na
  Estética, preventiva e régua são calculadas pelos dias; negociação é
  escolhida; acordo, cobrança judicial e as etapas finais são consequência de
  uma decisão ou do saldo. Na Pública, a etapa é informada pelo módulo de NF.
- **Histórico de passagem** — cada mudança de etapa do card, com data e autor
  (o sistema, em nome do agente, quando automática).
- **Ação da etapa feita** — o registro de que a ação que a etapa pede foi feita
  naquele caso, por quem, quando, por que meio e se dentro do prazo. Os itens do
  checklist são marcados no card.
- **Contato de cobrança** — conversa com o cliente ou com o órgão: data, canal,
  com quem, retorno, feedback e quem registrou; no órgão pode citar a nota
  fiscal. Pode gerar uma **promessa**.
- **Promessa de pagamento** — valor e data prometidos num contato; fica aberta,
  cumprida ou quebrada.
- **Acordo** — renegociação do saldo vencido de um caso: valor, desconto,
  entrada e parcelas, proposto por alguém e aprovado por outro na alçada. Tem
  **parcelas**, cada uma com vencimento, valor e pagamento.
- **Baixa como perda** — proposta de lançar parte ou todo o saldo de um caso
  como perda, com motivo, documentos, parecer do Jurídico e decisão na alçada.
- **E-mail da régua** — item da fila do dia para um caso e uma etapa; quando
  enviado, vira um e-mail registrado (spec 001) e um contato.
- **Bloqueio para o ERP** — o bloqueio que o cliente deveria ter (nenhum, novos
  pedidos, total) e o que foi registrado como aplicado no ERP. A diferença é a
  lista de trabalho do agente.
- **Envio ao Jurídico** — a marca, no caso, de que o dossiê foi enviado ao
  módulo Jurídico (spec 003), com data, responsável e o processo que nasceu.

## Regras de negócio

Etapas das carteiras Privada e Estética, com os valores padrão da régua
(parâmetros editáveis por carteira):

| Etapa | Entra quando | Ação da etapa |
|---|---|---|
| D-5 · Lembrete | nada vencido e próximo vencimento em 2 a 5 dias | Enviar lembrete de vencimento |
| D-1 · Confirmação | nada vencido e próximo vencimento amanhã | Confirmar a programação do pagamento |
| D+0 · Vencimento | vence hoje, ou 1 dia de atraso | Enviar aviso de vencimento do dia |
| D+2 · Pagamento não identificado | 2 a 3 dias de atraso | Enviar e-mail e ligar: pagamento não identificado |
| D+4 · Cobrança ativa | 4 a 6 dias | Ligar para o financeiro, avisar o vendedor e bloquear novos pedidos |
| D+7 · Notificação formal | 7 a 9 dias | Enviar notificação formal com aviso de protesto |
| D+10 · Protesto em cartório | 10 a 19 dias | Enviar ao cartório, negativar e bloquear todo o crédito |
| D+20 · Negociação pós-protesto | 20 a 29 dias | Apresentar proposta de acordo (carta de anuência após o pagamento) |
| D+30 · Extrajudicial | 30 dias ou mais, até o dossiê ser enviado | Financeiro envia a notificação extrajudicial e aciona a assessoria; a partir de 45 dias, montar o dossiê |
| D+45 · Cobrança judicial | dossiê enviado ao Jurídico | Contato amigável do Jurídico e ação judicial |
| Em negociação | escolhido por quem opera o caso, ou ao propor acordo | — (prazo de 10 dias) |
| Acordo em andamento | acordo aprovado | — |
| Regularizados | saldo vencido zerado depois de ter atrasado | — |
| Pagos no vencimento | caso preventivo pago sem ter atrasado | — |
| Baixados como perda | baixa aprovada que alcança todo o saldo vencido | — |

Etapas da carteira Pública (quem decide em qual o órgão está é a spec 005):
NF a protocolar · Liquidação vencida, cobrar atesto · Pagamento vencido, ordem
cronológica · Ofício / notificação formal · Requerimento administrativo ·
Cobrança judicial · Pagos · Baixados como perda.

- **RN-001** — Na Privada e na Estética, a etapa da régua é a de maior limite
  que os dias de atraso alcançam. Os limites são, em dias corridos do
  vencimento do título mais antigo em aberto na carteira: pagamento não
  identificado 2, cobrança ativa 4, notificação formal 7, protesto 10,
  negociação pós-protesto 20, extrajudicial 30. Com 1 dia de atraso o cliente
  ainda está em "D+0 · Vencimento". A partir do dia do Jurídico (45) o cliente
  **continua em "Extrajudicial"**, com a marca "Pronto para o Jurídico", até o
  dossiê ser enviado (RN-030); a partir do prazo máximo (60), a marca é
  "Jurídico atrasado". O nome de cada coluna mostra o dia configurado na
  carteira (ex.: com cobrança ativa em 6, a coluna se chama "D+6 · Cobrança
  ativa").
- **RN-002** — Preventiva só para quem não tem nada vencido na carteira:
  próximo vencimento em 2 a 5 dias é "D-5 · Lembrete" (o 5 é parâmetro), em 1
  dia é "D-1 · Confirmação" (parâmetro), hoje é "D+0 · Vencimento". Mais longe
  que isso, não há caso. Caso preventivo pago sem atrasar termina em "Pagos no
  vencimento"; se o cliente tem outro vencimento na janela, abre-se um caso
  novo para esse vencimento.
- **RN-003** — Saldo vencido zerado no ERP encerra o caso em "Regularizados" a
  partir de qualquer etapa (inclusive negociação, acordo e cobrança judicial).
  Negociação, acordo e cobrança judicial tiram o cliente da régua automática
  enquanto durarem. Baixado é final: os títulos que já estavam vencidos na data
  da baixa não abrem caso novo. Limitação aceita: enquanto os títulos baixados
  continuam no ERP (até a baixa contábil), um título novo do mesmo cliente na
  carteira também não abre caso; abre depois que os baixados saem do ERP. Regularizados, Pagos no vencimento e Baixados
  ficam no quadro como concluídos, que a pessoa pode ocultar; a pendência que
  sobra (carta de anuência, liberação no ERP) continua na agenda e na lista de
  bloqueio. Cliente regularizado que ganha um vencimento na janela preventiva,
  ou volta a atrasar, abre um caso novo (RN-031).
- **RN-004** — Bloqueio para o ERP (Privada e Estética). Novos pedidos
  bloqueados a partir da cobrança ativa (D+4). Bloqueio total a partir do dia
  do bloqueio total, que é parâmetro próprio: padrão D+10, junto com o protesto
  (P-01). O bloqueio deixa de ser devido quando o saldo vencido zera ou quando
  há acordo ativo com a entrada paga; caso baixado mantém o bloqueio. A lista
  mostra a diferença entre o devido e o aplicado, por caso (cliente com caso
  nas duas carteiras aparece duas vezes, e vale no ERP o mais grave);
  registrar "aplicado no ERP" iguala os dois e marca o item do checklist
  correspondente ("Vendedor avisado e novos pedidos bloqueados no ERP" ou
  "Bloqueio total do crédito confirmado no ERP") se o caso está nessa etapa;
  registrar a liberação marca "Bloqueio de pedidos retirado" nos Regularizados.
- **RN-005** — Checklist de cada etapa (entre colchetes, os itens que definem a
  ação como feita):

  | Etapa | Itens |
  |---|---|
  | D-5 · Lembrete | 1. Lembrete de vencimento enviado (e-mail e WhatsApp) · 2. Lançamento da nota fiscal no financeiro do cliente confirmado — [1] |
  | D-1 · Confirmação | 1. Contato de confirmação do pagamento · 2. Boleto ou PIX reenviado, se necessário — [1] |
  | D+0 · Vencimento | 1. E-mail de vencimento do dia enviado — [1] |
  | Pagamento não identificado | 1. E-mail enviado informando que o pagamento não foi identificado, com a 2ª via · 2. Ligação para o financeiro do cliente sobre o pagamento não identificado · 3. Comprovante solicitado ou previsão de pagamento registrada — [1, 2] |
  | Cobrança ativa | 1. Ligação com o responsável financeiro do cliente · 2. Vendedor avisado e novos pedidos bloqueados no ERP · 3. Data e valor de pagamento registrados — [1, 2] |
  | Notificação formal | 1. Notificação formal enviada (e-mail com confirmação ou carta com AR) · 2. Data de envio ao cartório informada ao cliente — [1] |
  | Protesto em cartório | 1. Título enviado a protesto em cartório · 2. Título negativado (Serasa / Boa Vista) · 3. Bloqueio total do crédito confirmado no ERP — [1, 3] |
  | Negociação pós-protesto | 1. Proposta de acordo apresentada ao cliente · 2. Retorno do cliente registrado — [1] |
  | Extrajudicial | 1. Notificação extrajudicial enviada pelo Financeiro (modelo padrão, prazo de 15 dias) · 2. Caso encaminhado à assessoria de cobrança · 3. Última proposta de acordo apresentada — [1] |
  | Cobrança judicial | 1. Dossiê completo enviado ao Jurídico · 2. Contato amigável do Jurídico com o cliente · 3. Ação de execução ou monitória ajuizada — [1] |
  | Em negociação | 1. Proposta de acordo apresentada · 2. Acordo aprovado na alçada |
  | Acordo em andamento | 1. Termo de acordo assinado · 2. Parcelas geradas no cartão |
  | Regularizados | 1. Pagamento conferido · 2. Bloqueio de pedidos retirado · 3. Carta de anuência enviada e negativação excluída (quando houve protesto) |
  | Baixados como perda | 1. Lançamento contábil da perda · 2. Cliente mantido bloqueado |

  O checklist vale para o caso: quando o cliente volta a atrasar em outro
  ciclo, começa vazio. "Registrar ação" marca de uma vez os itens entre
  colchetes. Marcar "Título enviado a protesto em cartório" registra o caso
  como protestado, pelo botão "Registrar ação" ou marcando o item direto no
  card (neste caso, na rodada seguinte da régua). Diferença deliberada do artefato: lá, "protestado" também era
  deduzido dos dias de atraso e do histórico; aqui vale só o item marcado,
  porque protesto é um fato que alguém executou no cartório, não uma
  consequência do calendário. "Pagos no vencimento" não tem itens. Na carteira
  Pública o checklist de cada etapa é o do artefato para o setor público e não
  define ação da etapa, salvo "Encaminhado ao jurídico" (RN-032).
- **RN-006** — O contato exige feedback; o agente é sempre quem está logado; a
  data do contato não pode ser futura. Registrar contato com a próxima ação
  vencida (data até hoje) conclui essa próxima ação.
- **RN-007** — A data prometida não pode passar de 5 dias úteis depois da data
  do contato (parâmetro por carteira); acima disso, exige acordo formal com
  entrada. Na carteira Pública não há esse limite: a previsão do órgão segue o
  trâmite da nota. A promessa vira a próxima ação "Conferir pagamento
  prometido" na data prometida.
- **RN-008** — A promessa é **cumprida** quando os recebimentos do cliente na
  carteira, entre a data do contato e a data prometida mais a tolerância (3
  dias corridos, parâmetro), somam pelo menos o valor prometido, ou qualquer
  valor se a promessa não tem valor, ou quando o saldo vencido zera nesse
  período; é **quebrada** quando a tolerância passa sem isso; senão,
  **aberta**. Duas promessas quebradas (parâmetro) no caso, sem acordo ativo,
  geram na agenda "N promessas quebradas: exigir acordo formal com entrada ou
  avançar a régua". Diferença deliberada do artefato: lá qualquer pagamento
  cumpria a promessa; aqui a promessa com valor só é cumprida quando o recebido
  alcança o valor, porque pagamento parcial não é o combinado.
- **RN-009** — Alçada do acordo. Dentro do padrão (entrada de pelo menos 20% do
  maior entre o débito e o valor do acordo, até 5 parcelas, débito até
  R$ 50.000,00): supervisor ou acima. Fora do padrão em qualquer um dos três:
  gerente financeiro ou acima. Débito acima de R$ 50.000,00 exige também a
  garantia descrita na proposta. Todos os números são parâmetros.
- **RN-010** — Parcelas do acordo: o valor do acordo menos a entrada dividido
  pelo número de parcelas, com cada parcela arredondada para baixo no centavo e
  a diferença na última; vencimentos a partir do primeiro, no intervalo
  informado (padrão 30 dias), cada um levado ao próximo dia útil. A entrada é
  uma parcela à parte, com valor e data próprios. Valor do acordo abaixo do
  débito registra a diferença como desconto concedido. No máximo 60 parcelas.
- **RN-011** — Acordo com parcela (ou entrada) não paga vencida há mais de 5
  dias (parâmetro) quebra; o cliente volta para a régua na etapa dos dias de
  atraso que o ERP mostra. Um acordo quebrado ou cancelado não volta a ser
  ativo; para negociar de novo, propõe-se outro. Cancelar exige supervisor ou
  acima (ou a marca Administrador) que enxergue o cliente, e motivo; cancelado
  em negociação ou em acordo, o cliente volta para a régua; recusado, fica em
  negociação.
- **RN-012** — Segregação: quem propôs o acordo ou a baixa não aprova; a
  comparação é pela pessoa logada, nunca pelo nome digitado.
- **RN-013** — Alçada da baixa pelo valor: até R$ 10.000,00 gerente
  financeiro; até R$ 100.000,00 Diretor financeiro, papel exercido pela
  Diretoria (P-12); acima, Diretoria. Valores e níveis são parâmetros. O valor
  da baixa é maior que zero e não passa do saldo vencido do caso. Motivos:
  "Esgotadas as vias de cobrança", "Falência ou recuperação judicial", "Dívida
  prescrita", "Valor menor que o custo da cobrança judicial", "Desconto
  concedido em acordo". Documentos de suporte (marcados, não bloqueiam): régua
  cumprida até o Jurídico; parecer do Jurídico sobre a chance de recuperação;
  título protestado ou negativado; tentativa de acordo registrada.
- **RN-014** — A baixa só é decidida com parecer do Jurídico registrado por
  alguém do perfil Jurídico, em toda baixa, inclusive a de "Desconto concedido
  em acordo" (padrão adotado, o mais conservador). Baixa aprovada que alcança
  todo o saldo vencido do caso o encerra em "Baixados como perda", mantendo o
  bloqueio; baixa parcial registra o valor e mantém o caso na etapa. O
  lançamento contábil é feito fora do sistema.
- **RN-015** — Valor atualizado = saldo vencido + multa + juros + correção,
  título a título, calculado no servidor (P-08): multa uma vez; juros simples
  ao mês pro rata pelos dias de atraso de cada título; correção composta ao mês
  pelos mesmos dias. Os três percentuais são parâmetros por carteira, com data
  de vigência: na Privada e na Estética, multa de 2%, juros de 1% e correção de
  0,4%; na Pública, sem multa, juros de 0,5% e a mesma correção. Cada parcela
  do cálculo é arredondada no centavo em cada título, e o total é a soma dos
  títulos. Os percentuais são os do artefato e ainda não foram conferidos pelo
  Jurídico e pela Gerência Financeira contra os contratos; como são parâmetros,
  a conferência muda o valor, não o sistema.
- **RN-016** — Chance de atraso do cliente: 1 menos a pontualidade (parte do
  valor pago nos últimos 12 meses que foi pago até o vencimento); sem
  pagamentos nesse período, 5% ("sem histórico"); com saldo vencido, no mínimo
  50%; nunca acima de 95%. Valor projetado = saldo a vencer × chance. Destaque
  forte a partir de 40% e médio a partir de 15%. Todos os números são
  parâmetros.
- **RN-017** — Destinatário do e-mail: o contato da ficha do cliente marcado
  como principal que tenha e-mail; senão, o primeiro contato com e-mail; senão,
  "Sem e-mail cadastrado". O nome no "Prezado(a)" é o desse contato ou, sem
  nome, a razão social.
- **RN-018** — A fila tem no máximo um e-mail por caso, etapa e vencimento de
  referência (o próximo vencimento na preventiva; o vencimento do título mais
  antigo na régua). Enviado, não volta. Sai da fila sem envio quando o caso
  muda de etapa ou quando a ação da etapa é registrada por outro meio. Só
  existe nas carteiras Privada e Estética.
- **RN-019** — Data de agenda, próxima ação, promessa e parcela que cai em
  sábado, domingo ou feriado vai para o próximo dia útil, com aviso de por quê.
- **RN-020** — Carta de anuência é exigida de quem regularizou depois de ter
  sido protestado, com prazo de 5 dias úteis (parâmetro) contados da
  regularização. Registrar o envio grava quem registrou (a pessoa logada),
  marca o item 3 do checklist de Regularizados e pode enviar o e-mail de
  quitação com a carta anexada.
- **RN-021** — Situação do item da fila: "Enviado"; "Sem e-mail cadastrado";
  "Enviar manualmente" (modo manual); "Aguardando aprovação" (modo com
  aprovação). Ordem: pendentes primeiro, depois maior valor. Modo padrão na
  implantação: D-5, D-1, D+0, pagamento não identificado, cobrança ativa e
  cobrança judicial "manual"; notificação formal, protesto, negociação
  pós-protesto e extrajudicial "com aprovação"; nenhuma etapa em "automático"
  (P-24). No modo automático o e-mail não passa pela fila: a rotina envia.
- **RN-022** — Aprovar um e-mail exige supervisor ou acima (nível
  parametrizado), dentro da carteira que a pessoa enxerga, e envia na hora.
  Modelo com efeito legal (notificação formal, protesto, extrajudicial,
  cobrança judicial e anuência) só sai, em qualquer modo, com a validação do
  texto em dia: validado pelo Jurídico ou por gerente financeiro ou acima, há
  menos de 12 meses (P-06, P-11). O envio registra um contato "E-mail da régua
  enviado ({etapa}): {assunto}" e marca o item 1 do checklist em D-5, D-1, D+0,
  pagamento não identificado, notificação formal, negociação pós-protesto e
  extrajudicial; em cobrança ativa, protesto e cobrança judicial o e-mail não
  marca item.
- **RN-023** — Modelos da régua (assunto base, seguido de " · {razão social}"):
  D-5 "Lembrete: seu pagamento vence em breve!"; D-1 "Seu pagamento vence
  amanhã"; D+0 "Atenção: seu pagamento vence hoje!"; pagamento não identificado
  "Pagamento não identificado"; cobrança ativa "Aviso: fatura vencida –
  regularize seu pagamento"; notificação formal "Notificação de débito em aberto
  – aviso de protesto"; protesto "Aviso: título encaminhado para protesto em
  cartório"; negociação pós-protesto "Negociação do débito protestado";
  extrajudicial "Notificação extrajudicial – débito em aberto"; cobrança
  judicial "Notificação de encaminhamento para cobrança judicial"; anuência
  "Quitação confirmada – carta de anuência". O texto de cada um é o do
  relatório C §3.6, sem o texto de WhatsApp (o sistema não envia por esse
  canal). Datas-limite nos textos: hoje mais (dia da etapa-alvo − dias de
  atraso atuais), ou hoje mais 3 dias (parâmetro) se isso der zero ou menos,
  levada ao próximo dia útil; a etapa-alvo é o protesto na notificação formal,
  o extrajudicial na negociação pós-protesto e o prazo máximo na cobrança
  judicial. Na notificação extrajudicial a data-limite é hoje mais o prazo da
  notificação (15 dias, parâmetro do Jurídico), levada ao próximo dia útil. O
  vencimento citado na régua é o do título mais antigo em aberto.
- **RN-024** — "Mover para", no card aberto (o card não se arrasta). Quem
  move é quem opera o caso (RN-027). Regras: entre etapas da régua, preventivas
  incluídas, ninguém move ("A régua move o card pelos dias de atraso."); etapa
  da régua para "Em negociação" é aceito quando o cliente tem saldo vencido
  (senão, "Só cliente com saldo vencido entra em negociação."); "Em negociação"
  para a régua é aceito sem acordo proposto nem ativo (senão, "Há acordo em
  aberto neste caso."), e o cliente fica na etapa dos seus dias de atraso;
  destino "Acordo em andamento" só pela aprovação do acordo ("O card vai para
  Acordo quando o acordo é aprovado."); destino "Cobrança judicial" só pelo
  envio do dossiê ("Envie o dossiê pelo quadro Jurídico."); destinos finais só
  pelo sistema ou pela decisão de baixa ("O caso é encerrado pelo sistema (saldo
  zerado) ou pela decisão de baixa."); de acordo, cobrança judicial e etapa
  final ninguém sai à mão. No quadro da Pública ninguém move à mão ("A etapa do
  órgão acompanha as notas fiscais."). Caso não se exclui.
- **RN-025** — Eventos da agenda: próxima ação (na data dela; no órgão, a que
  o módulo de NF informa); promessa aberta ("Retorno: pagamento prometido de
  R$ X", na data prometida); promessa quebrada ("Promessa não cumprida: cobrar
  de novo", na data prometida mais a tolerância; com promessas quebradas no
  limite da RN-008, o texto é o de lá); próxima parcela não paga do acordo (no
  vencimento); ação da etapa a fazer, preventiva incluída (na data em que o
  caso entrou na etapa); carta de anuência pendente (no prazo da RN-020);
  bloqueio ou liberação a aplicar no ERP (hoje); ficha de contatos vencida ou
  nunca revisada (hoje); e, para quem decide, e-mail aguardando aprovação,
  acordo a decidir, baixa aguardando parecer e baixa a decidir (hoje). Evento
  com data anterior a hoje vai para "Ações atrasadas". O aviso "entra em
  {etapa} em N dias" deixou de ser evento da agenda: aparece no card aberto.
- **RN-026** — Índice de inadimplência = saldo vencido ÷ (saldo vencido + saldo a
  vencer). Conversão do período = recebido no período ÷ (recebido no período +
  saldo vencido em aberto dos clientes trabalhados no período); trabalhado é
  quem teve contato, recebimento ou caso aberto no período. Promessas cumpridas
  = parte das promessas com data prometida no período, já passada a tolerância,
  que foram cumpridas. Participação do maior devedor, dos 5 e dos 10 maiores =
  parte do saldo vencido do recorte. As metas (inadimplência, conversão,
  promessas, recuperação) são as metas da política. O índice de concentração e
  a contagem de clientes que somam 80% do vencido passaram à spec 006.
- **RN-027** — Visibilidade: o agente enxerga os clientes de que é o agente de
  cobrança; o supervisor, os seus e os de todos que estão abaixo dele na
  hierarquia; gerente financeiro, Diretoria e Administrador, todos; o Jurídico,
  só os clientes com processo no Jurídico, para leitura. No quadro, o agente vê
  só os próprios cards; supervisor, gerente e Diretoria veem todos os cards
  (diferença aceita: o quadro não corta por equipe), mas o conteúdo da cobrança
  e toda operação seguem a hierarquia. Operar (contato, checklist, mover,
  próxima ação, propor, enviar e-mail, aplicar bloqueio, pagar parcela,
  anuência) é do agente do caso e de quem está acima dele na hierarquia.
  Decidir (acordo, baixa, e-mail com aprovação) é pela alçada, e quem propôs
  não decide. O Jurídico só dá o parecer da baixa. Sem acesso ao cliente, a
  resposta é a mesma de cliente inexistente.
- **RN-028** — Parâmetros da régua, conferidos por carteira: o primeiro aviso
  preventivo é maior que o segundo, e este é de 1 dia ou mais; os dias da régua
  são **estritamente crescentes** (pagamento não identificado < cobrança ativa <
  notificação < protesto < negociação pós-protesto < extrajudicial < Jurídico),
  o primeiro de 1 ou mais; o prazo máximo é maior ou igual ao dia do Jurídico; o
  dia do bloqueio total fica entre o da cobrança ativa e o do Jurídico. Cada
  parâmetro pode ter valor próprio na Estética, que prevalece sobre o padrão; na
  implantação a Estética usa os valores do padrão (P-03, P-30). A edição é
  feita na tela de parâmetros da base, por quem ela autoriza, e é auditada.
  Mudou um dia, o nome da coluna acompanha.
- **RN-029** — "Em negociação" tem prazo de 10 dias corridos (prazo da etapa no
  quadro, editável por quem administra o quadro: nível 3 ou acima, ou a marca
  Administrador; P-18); passado o prazo, o card é
  sinalizado, sem mudar de etapa.
- **RN-030** — Envio ao Jurídico: dossiê primeiro (P-07). O dossiê é montado
  no módulo Jurídico (spec 003) a partir do card da cobrança, por quem opera o
  caso, da etapa extrajudicial em diante (ou em qualquer etapa, por gerente
  financeiro ou acima). O envio do dossiê completo, por gerente financeiro ou
  acima, é o que leva o caso à "Cobrança judicial": registra data, responsável
  e o processo, marca o item 1 do checklist da etapa, registra a ação da etapa
  e tira o cliente da régua automática. Ninguém move o card para a cobrança
  judicial à mão, e repetir o envio não muda nada. Caso com atraso a partir do
  dia do Jurídico (45, parâmetro) sem dossiê enviado leva a marca "Pronto para o
  Jurídico"; a partir do prazo máximo (60, parâmetro), "Jurídico atrasado". Vale
  para as três carteiras; no órgão não há a marca por dias. Processo que nasce
  no Jurídico fora do dossiê (cadastro direto, carga, vínculo posterior) leva o
  caso aberto da mesma carteira à "Cobrança judicial" na rodada seguinte da
  régua, com a data e o processo registrados e a nota "Processo no Jurídico".
- **RN-031** — Caso por cliente, carteira e ciclo. Um cliente tem no máximo um
  caso aberto por carteira, no quadro da carteira. O caso abre quando o cliente
  passa a ter saldo vencido na carteira ou vencimento na janela preventiva, e
  fecha por regularização, pagamento no vencimento ou baixa. Um novo atraso
  depois do fechamento é outro caso: checklist vazio, sem protesto nem anuência
  herdados; contatos, promessas, acordos e baixas antigos continuam no
  histórico do cliente. O responsável do card é o agente do cliente; trocado o
  agente, o card troca de responsável na rodada seguinte.
- **RN-032** — Carteira Pública. A etapa, o prazo e a próxima ação do caso do
  órgão são os que o módulo de NF pública informa (a etapa é o andamento da
  nota mais avançada); a régua por dias não se aplica. Fora da rotina, só o
  lançamento de datas da nota, por quem cuida do órgão, muda a etapa, e só
  entre as etapas da régua do órgão: nunca para Cobrança judicial nem para uma
  etapa final, e nunca em caso de outra carteira. Contato (com os canais
  "Ofício" e "Portal do órgão" e o retorno "Aguardando liquidação (órgão)"),
  previsão de pagamento, valor atualizado, baixa como perda, agenda e envio ao
  Jurídico funcionam como nas outras carteiras. Não existem para o órgão:
  acordo parcelado, bloqueio para o ERP, fila de e-mails da régua e notificação
  extrajudicial; a tentativa é recusada com explicação.
- **RN-033** — Ação no prazo. A ação da etapa é "no prazo" quando é registrada
  até a data em que ela é devida na agenda: o dia em que o caso entrou na
  etapa, levado ao próximo dia útil; nas etapas com prazo próprio
  (negociação), até o fim do prazo da etapa. Fica registrado quem fez, quando e
  por que meio (botão do card, item marcado no card, e-mail, bloqueio,
  anuência, envio ao Jurídico, acordo). Ações no prazo do período = feitas no
  prazo ÷ ações registradas no período.

## Testes

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001 | Cliente com 5 dias e R$ 3.200,00 vencidos: etapa "Cobrança ativa", ação não feita, bloqueio devido "novos pedidos", aparece em "a bloquear" | regra de negócio |
| C-002 | Vencimentos em 3, 1 e 0 dias sem nada vencido: etapas "D-5 · Lembrete", "D-1 · Confirmação" e "D+0 · Vencimento"; valor do cartão 8.000, 4.500 e 2.000 | regra de negócio |
| C-003 | Cliente em notificação formal com bloqueio aplicado; saldo vencido passa a 0; depois da rodada: caso encerrado como regularizado, card em "Regularizados" com 1 passagem nova feita pelo sistema, aparece em "a liberar" | regra de negócio |
| C-004 | Cobrança ativa da Estética = 6: cliente da Estética com 5 dias em "Pagamento não identificado", no quadro da Estética; cliente privado com 5 dias em "Cobrança ativa", no quadro privado; a coluna da Estética se chama "D+6 · Cobrança ativa" | regra de negócio e regra de tela |
| C-005 | Cobrança ativa com item 1 marcado: ação não feita; com itens 1 e 2: feita; o item 3 continua desmarcado | regra de negócio |
| C-006 | Mover cliente preventivo para negociação: recusado com "saldo vencido"; mover cliente da régua para D-1: recusado com "A régua move"; etapa inalterada nos dois | regra de negócio |
| C-007 | Cliente em negociação com 12 dias, sem acordo: o destino liberado é "Protesto em cartório" e os demais da régua trazem o motivo; levado à coluna extrajudicial por fora da tela, a rodada seguinte o põe em "Protesto em cartório"; com acordo proposto: recusado com "acordo em aberto" | regra de negócio e regra de tela |
| C-008 | Mover para baixados, regularizados, acordo e cobrança judicial: quatro recusas, com "encerrado pelo sistema" (duas), "acordo é aprovado" e "dossiê" na mensagem; etapa inalterada | regra de negócio |
| C-009 | Contato de 13/11/2026 com promessa para 19/11/2026 e R$ 5.000,00: 1 contato com o agente logado, 1 promessa aberta de 5.000, próxima ação "Conferir pagamento prometido" em 2026-11-19 | regra de negócio |
| C-010 | Contato de 13/11/2026 com promessa para 24/11/2026: recusado com "5 dias úteis"; para 23/11/2026: aceito | regra de negócio |
| C-011 | Promessa de 2.000 para 03/11 com recebimento de 2.000 em 05/11: cumprida; promessas de 06/11 (para 09/11) e de 09/11 (para 10/11) sem recebimento depois de 06/11: quebradas em 19/11; agenda do agente contém "2 promessas quebradas" | regra de negócio |
| C-012 | Proposta de 10.000 com entrada de 2.000 e 4 parcelas pelo agente: cliente "Em negociação"; aprovação do supervisor: acordo ativo, 5 parcelas (entrada + 4 × 2.000,00), cliente "Acordo em andamento" | regra de negócio |
| C-013 | Débito 20.000 e entrada 2.000: aprovação do supervisor recusada com "gerente"; do gerente, aceita | regra de negócio |
| C-014 | Acordo proposto pelo gerente: aprovação pelo próprio recusada com "quem propôs"; pela Diretoria, aceita | regra de negócio |
| C-015 | Parcela vencida há 6 dias com tolerância 5: acordo "quebrado", cliente com 25 dias em "Negociação pós-protesto"; parcela vencida há 5 dias: acordo segue ativo | regra de negócio |
| C-016 | Baixa de 8.000: supervisor recusado ("gerente"), gerente aprova, cliente "Baixados"; baixa de 50.000 proposta pelo gerente: sem parecer recusada ("parecer"), com parecer recusada ao gerente ("quem propôs"), Diretoria aprova | regra de negócio |
| C-017 | Cliente protestado com saldo zerado: "Regularizados" com anuência pendente e prazo = regularização + 5 dias úteis; após registrar o envio, pendência some e item 3 marcado; cliente regularizado sem protesto: sem pendência | regra de negócio |
| C-018 | Fila com 1 item "Aguardando aprovação" para o cliente; aprovação pelo agente recusada; com o modelo sem validação, aprovação do supervisor recusada com "validação" e 0 e-mail enviado; com o modelo validado, a do supervisor: 1 e-mail enviado registrado, 1 contato novo, item 1 da notificação formal marcado; rodar a fila de novo mantém 1 item, já enviado | regra de negócio |
| C-019 | Cliente sem e-mail: item "Sem e-mail cadastrado"; envio recusado com "e-mail" | regra de negócio |
| C-020 | Lista: Hospital Aurora "a bloquear: novos pedidos", Clínica Norte "a bloquear: total", Casa Esperança "a liberar"; após "aplicado" no Hospital Aurora: sai de "a bloquear", entra em "bloqueados", item 2 da cobrança ativa marcado | regra de negócio |
| C-021 | Listas, agenda e totais: agente, supervisor dele, supervisor de outra equipe e gerente recebem exatamente a contagem de casos de cada um no seed (números fixados no plano); o supervisor de outra equipe, abrindo o caso de um cliente do agente, recebe "Cliente não encontrado." e tem a escrita recusada | regra de negócio |
| C-022 | Hoje 19/11/2026 com feriado em 20/11: semana = 19, 23, 24, 25, 26, 27 e 30/11; evento de 21/11 cai em 23/11; evento de 17/11 vai para "Ações atrasadas" | regra de tela |
| C-023 | Envio pelo agente recusado ("gerente"); pelo gerente: caso com data, responsável e processo, card em "Cobrança judicial", item 1 marcado e ação da etapa registrada; o perfil Jurídico passa a ver o cliente; segundo envio: nada novo; mover o card à mão para "Cobrança judicial": recusado com "dossiê" | regra de negócio |
| C-024 | BU com A (10.000 vencidos, 20 dias), B (30.000 a vencer), C (5.000 vencidos, 95 dias, 5.000 a vencer): índice 0,30; vencido 15.000 em 2 clientes; acima de 90 dias 5.000; aging 1–30 = 10.000 e 91–180 = 5.000 | regra de negócio |
| C-025 | P: pontualidade 70% e 10.000 a vencer → chance 0,30 e 3.000; Q: 90% com vencido → 0,50 e 2.000; R sem recebimentos → 0,05 e 50 | regra de negócio |
| C-026 | Título de 10.000 com 30 dias: multa 200,00, juros 100,00, correção 40,00, total 10.340,00 | regra de negócio |
| C-027 | Órgão com etapa informada "liquidação vencida" e próxima ação para 23/11/2026: 1 caso na carteira Pública, card na etapa informada, evento na agenda do agente em 2026-11-23; rodada da régua por dias: 0 caso novo e 0 movimento na carteira Pública; etapa nova informada pelo agente do órgão no lançamento de datas da nota: card na etapa na hora; pela mesma tela, por quem não enxerga o órgão: recusado; informado "todas as notas pagas": caso encerrado como regularizado, card em "Pagos" | regra de negócio |
| C-028 | Propor acordo no caso do órgão: recusado com "acordo parcelado"; lista de bloqueio e fila de e-mails na carteira Pública: 0 linhas | regra de negócio |
| C-029 | Contato de 19/11/2026 por "Ofício", com nota fiscal e previsão para 18/12/2026: 1 contato ligado à nota, 1 promessa aberta para 2026-12-18; título de 50.000 com 40 dias na carteira Pública: multa 0,00, juros 333,33, correção 266,84, total 50.600,17; previsão já vencida além da tolerância: promessa quebrada na rodada seguinte, com a marca "Promessa vencida"; envio do dossiê pelo gerente: card em "Cobrança judicial" e item "Encaminhado ao jurídico" marcado | regra de negócio |
| C-030 | Cliente com 2.500 (5 dias) na Estética e 1.000 (12 dias) na Privada: 2 casos, um em cada quadro, em "Cobrança ativa" e "Protesto em cartório"; pago só o saldo da Estética: esse caso regulariza e o outro segue aberto | regra de negócio |
| RN-001 | Dias 1, 2, 3, 4, 6, 7, 9, 10, 19, 20, 29, 30, 44, 45 e 61 caem em: vencimento (1), pagamento não identificado (2, 3), cobrança ativa (4, 6), notificação (7, 9), protesto (10, 19), negociação pós-protesto (20, 29), extrajudicial (30, 44, 45, 61), com a marca "Pronto para o Jurídico" em 45 e "Jurídico atrasado" em 61; com cobrança ativa em 6, a coluna se chama "D+6 · Cobrança ativa" | regra de negócio e regra de tela |
| RN-002 | Sem vencido, vencimento em 6 dias: sem caso; 5 e 2: D-5; 1: D-1; 0: D+0. Com algo vencido e vencimento em 3 dias: etapa da régua. Caso preventivo pago sem atrasar: "Pagos no vencimento" | regra de negócio |
| RN-003 | Cliente em acordo com saldo zerado: "Regularizados"; caso baixado com o saldo ainda vencido no ERP: continua "Baixados" e não abre caso novo; o mesmo cliente com um título que vence depois da baixa e atrasa: sem caso enquanto o título baixado está no ERP, caso novo depois que ele sai | regra de negócio |
| RN-004 | 3 dias: nenhum bloqueio; 4 dias: novos pedidos; 10 dias: total; acordo ativo com entrada paga: nenhum; caso baixado: bloqueio mantido | regra de negócio |
| RN-005 | Protesto com itens 1 e 3: ação feita e caso marcado como protestado; item 1 do protesto marcado direto no card: protestado depois da rodada, sem ação feita; o mesmo cliente num ciclo novo começa com checklist vazio e sem protesto | regra de negócio |
| RN-006 | Contato sem feedback: recusado com "feedback"; contato com data de amanhã: recusado com "futura"; contato com próxima ação vencida: próxima ação limpa | regra de negócio |
| RN-007 | Coberto por C-009 e C-010: limite de 13/11/2026 + 5 dias úteis com feriado em 20/11 = 2026-11-23 | regra de negócio |
| RN-008 | Promessa de 2.000 com recebimento de 1.500 na janela: não é cumprida e fica quebrada; promessa sem valor com recebimento de 10: cumprida | regra de negócio |
| RN-009 | Débito 60.000, entrada 12.000, 4 parcelas, sem garantia: proposta recusada com "garantia"; com garantia: supervisor recusado, gerente aprova. 6 parcelas com entrada de 20%: exige gerente | regra de negócio |
| RN-010 | Acordo de 10.000, entrada 0, 3 parcelas, primeira em 21/11/2026 (sábado), intervalo 30: 3.333,33 em 23/11/2026, 3.333,33 em 21/12/2026, 3.333,34 em 20/01/2027. Acordo de 9.000 para débito de 10.000: desconto 1.000 | regra de negócio |
| RN-011 | Coberto por C-015; acordo cancelado: situação "cancelado", cliente de volta à régua, nova proposta é um acordo novo; cancelamento por supervisor de outra equipe: recusado; acordo recusado: cliente continua "Em negociação" | regra de negócio |
| RN-012 | Coberto por C-014 e C-016 | regra de negócio |
| RN-013 | Baixa de 10.000,00: exige gerente; de 10.000,01 e de 100.000,01: exigem Diretoria. Baixa de 0 ou acima do vencido: recusada; sem motivo: recusada | regra de negócio |
| RN-014 | Parecer registrado por agente: recusado com "Jurídico"; baixa aprovada de 3.000 num vencido de 15.000: cliente continua na etapa e o valor baixado é 3.000 | regra de negócio |
| RN-015 | Coberto por C-026 e C-029; dois títulos (5.000 com 10 dias e 5.000 com 50 dias): juros 16,67 + 83,33 = 100,00, correção 6,66 + 33,38 = 40,04, total 10.340,04; títulos de 20.000 com 47 dias e de 10.000 com 17 dias: multa 600,00, juros 370,00, correção 148,13, total 31.118,13 | regra de negócio |
| RN-016 | Coberto por C-025; cliente com pontualidade 2%: chance 0,95 (teto); cores: 0,40 forte, 0,39 médio, 0,15 médio, 0,14 sem destaque | regra de negócio e regra de tela |
| RN-017 | Ficha com contato 1 não principal e com e-mail, contato 2 principal com e-mail: destinatário é o 2; só contato não principal com e-mail: é ele; nenhum e-mail: "Sem e-mail cadastrado" | regra de negócio |
| RN-018 | Coberto por C-018; cliente que muda de etapa: o item antigo não enviado some da fila; item cuja ação foi marcada como feita: some da fila | regra de negócio |
| RN-019 | Próxima ação para 21/11/2026 gravada como 23/11/2026 com aviso "sábado"; para 20/11/2026 como 23/11/2026 com aviso do feriado; para 19/11/2026 sem mudança | regra de negócio |
| RN-020 | Coberto por C-017; registrar anuência em caso que não foi protestado: recusado | regra de negócio |
| RN-021 | Modo manual: "Enviar manualmente"; com aprovação não aprovado: "Aguardando aprovação"; ordem: pendente de 1.000 antes de pendente de 500 e de enviado de 9.000; no padrão nenhuma etapa é automática; etapa posta em automático: a rodada envia e marca o item, sem item na fila; a rodada seguinte não envia de novo para o mesmo caso e etapa | regra de negócio |
| RN-022 | Envio em pagamento não identificado marca o item 1; envio em cobrança ativa não marca nenhum item; supervisor de outra equipe aprovando e-mail de cliente do agente: recusado | regra de negócio |
| RN-023 | Notificação formal com 8 dias em 17/11/2026 e protesto em 10: data-limite 19/11/2026; cobrança judicial com 62 dias e prazo máximo 60 em 18/11/2026: 23/11/2026 (+3 caiu no sábado); extrajudicial em 18/11/2026 com prazo de 15 dias: 03/12/2026; os 11 modelos existem com o assunto base listado | regra de negócio |
| RN-024 | Coberto por C-006, C-007, C-008 e C-023; card em "Acordo em andamento" movido para negociação: recusado; qualquer movimento à mão no quadro da Pública: recusado com "notas fiscais"; excluir card: recusado | regra de negócio |
| RN-025 | Caso com promessa aberta, parcela futura, ação da etapa pendente e anuência pendente: 4 eventos com os tipos e datas da regra; supervisor com e-mail a aprovar e acordo a decidir: 2 eventos de aprovação; cliente em cobrança com ficha de contatos nunca revisada: evento "Revisar ficha de contatos" hoje | regra de negócio |
| RN-026 | Coberto por C-024; conversão com recebido 4.000 e aberto 6.000 nos clientes trabalhados do seed: 0,40; no recorte do C-024, maior devedor com 10.000 de 15.000 vencidos: participação de 66,7% | regra de negócio |
| RN-027 | Coberto por C-021; Jurídico vê só o cliente com processo e tem a escrita recusada, salvo o parecer da baixa; agente de outra equipe tentando registrar contato: recusado | regra de negócio |
| RN-028 | Salvar os dias 2, 4, 7, 7, 20, 30, 45: recusado com "crescentes"; pagamento não identificado em 0: recusado; prazo máximo 40 com Jurídico 45: recusado; bloqueio total 3 com cobrança ativa 4: recusado; valores válidos: gravados e auditados; edição por supervisor: recusada | regra de negócio |
| RN-029 | Cliente em negociação há 11 dias com prazo 10: sinalizado; há 10: não | regra de negócio |
| RN-030 | Caso com 44 dias: sem marca; com 45 e com 59: "Pronto para o Jurídico"; com 60: "Jurídico atrasado"; envio para cliente sem caso aberto na carteira: cobrança inalterada e a resposta diz que não havia caso; processo aberto direto no Jurídico para um cliente em cobrança: na rodada seguinte o caso está em "Cobrança judicial" | regra de negócio |
| RN-031 | Caso regularizado e o cliente volta a atrasar: 2 casos no histórico, 1 aberto, card novo com checklist vazio; trocado o agente do cliente, o card muda de responsável na rodada seguinte | regra de negócio |
| RN-032 | Coberto por C-027, C-028 e C-029; registrar bloqueio no caso do órgão: recusado; o agente do órgão informando a etapa "Cobrança judicial" ou "Pagos", ou informando etapa para um caso da Estética: recusado, o card não se move | regra de negócio |
| RN-033 | Caso que entrou na cobrança ativa em 19/11/2026: ação registrada em 19/11, no prazo; caso que entrou em 18/11 com ação registrada em 19/11: fora do prazo; entrada em 20/11 (feriado) com ação em 23/11: no prazo; visão gerencial de um agente com três ações no período, uma registrada depois do prazo: 2 de 3 = 66,7% | regra de negócio |

Verificação manual:
- [ ] C-001 a C-008 — quadro no navegador, nas três carteiras: "Mover para" no card aberto, mensagens de recusa, capa com os itens da RF-005; nenhum card se arrasta
- [ ] C-018 — e-mail chega na caixa de teste com assunto, texto e campos preenchidos
- [ ] C-022 — semana da agenda com as cores por tipo de evento
- [ ] Visão gerencial e lista de bloqueio em tema claro e escuro sem cor quebrada
- [ ] RNF-001 e RNF-004 — tempos com a massa de teste

## Fora de escopo

- [ ] Escrever no ERP (bloqueio, liberação, baixa contábil, limite) — decisão de 11/11/2026; o sistema gera as listas e o agente aplica.
- [ ] Envio de WhatsApp — canal inicial é o e-mail; os modelos não guardam texto de WhatsApp.
- [ ] Etapas, prazos e datas da NF pública, cálculo da etapa do órgão, régua de comunicação com o órgão por nota (ofício, pedido pela LAI, requerimento), regras de pagamento por ente e certidões — spec 005. O caso do órgão, seus contatos, previsões, baixa, agenda, valor atualizado e envio ao Jurídico são desta spec (D-05).
- [ ] Acordo parcelado, bloqueio de pedidos, fila de e-mails da régua e notificação extrajudicial para órgão público — não existem (exceção E-3 do D-05).
- [ ] Fases, cartão, card aberto, histórico de passagem, prazo da etapa, tarefas, chat, anexos, marcas e níveis de acesso do quadro — são do motor de quadros (arquitetura §8). Arrastar e soltar não existe.
- [ ] Dossiê, processo, andamentos, custas, acordos judiciais, notificação extrajudicial em PDF e demonstrativo do débito — spec 003. Aqui só o reflexo do envio do dossiê no caso e o cálculo dos encargos que o demonstrativo usa.
- [ ] Concessão, limite, farol, rating, criticidade do cliente e pedidos acima do limite — spec 004. A chance de atraso aqui usa só pontualidade e atraso.
- [ ] PDD por faixa nos fechamentos, roll rate, foto mensal do aging, movimento gerado × recuperado, metas e evolução no ano, índice de concentração e quantos clientes somam 80% do vencido, prazo médio de recebimento — spec 006.
- [ ] Indicadores do artefato sem regra definida: eficiência, índice de recebimento, tempo médio de atendimento e classificação qualitativa da carteira; e, na agenda, contatos em 7 dias, cobertura da carteira e próximos passos em dia. Ficam os que a RF-030, a RF-031 e a RF-040 listam; voltam quando o gestor definir a conta.
- [ ] Cronograma dia a dia da régua (D+2, D+5, D+15…) do artefato — a tela de regras mostra o prazo e a ação de cada etapa.
- [ ] Linha do tempo completa do cliente e PDF do histórico — spec 007.
- [ ] Edição de parâmetros, de modelos de mensagem e da ficha de contatos, e busca de cliente por CPF/CNPJ — spec 001. Esta spec declara os parâmetros e os modelos da cobrança e leva a pessoa à tela da base.
- [ ] Valor atualizado na capa do card e nas listas — o cálculo é título a título, com leitura do ERP na hora; aparece no card aberto.
- [ ] Agenda "da equipe de" alguém numa lista só — a agenda é por pessoa; o conjunto está no desempenho por agente.
- [ ] Geração do texto da carta de anuência — a carta chega pronta e é anexada.
- [ ] Redistribuir clientes entre agentes e cadastrar a equipe — é o vínculo cliente → agente da spec 001.
- [ ] Importação de títulos por planilha — substituída pela leitura do ERP (spec 001).
- [ ] Migração de contatos, promessas, acordos e baixas do artefato — não migram (P-02); o sistema começa da leitura do ERP.
- [ ] Edição do texto do e-mail antes do envio — sai o texto do modelo; quem precisa de outro texto altera o modelo.
- [ ] Regularizar um cliente à mão — regularizado é só consequência do saldo zerado no ERP.

## Pendências

Nenhuma bloqueia: cada uma segue com o padrão adotado no índice do contrato
(`docs/contrato/00-indice.md` §4) e muda por parâmetro ou por dado do quadro.

| # | Pergunta ao gestor | Padrão adotado | Afeta |
|---|---|---|---|
| P-01 | Em que dia nasce o bloqueio total do crédito? | D+10, junto com o protesto, em parâmetro próprio | RN-004, C-020 |
| P-02 | Os dados do artefato migram? | Não | Fora de escopo |
| P-03, P-30 | O que muda na Estética (dias da régua, encargos, alçadas, modos)? | Nada: usa os valores do padrão; cada parâmetro aceita valor próprio | RN-028, C-004 |
| P-06, P-11 | Quem valida modelo com efeito legal, e pode enviar antes? | Jurídico ou gerente financeiro ou acima; sem validação em dia não envia | RN-022, C-018 |
| P-07 | Jurídico: encaminhar e montar depois, ou dossiê primeiro? | Dossiê primeiro | RN-030, C-023 |
| P-08 | Encargos título a título ou pelo título mais antigo? | Título a título | RN-015 |
| P-09 | Posição do órgão: vencimento do título ou prazo legal da nota? | Vencimento do título (o prazo legal fica nas telas de NF, spec 005) | C-027, C-029 |
| P-12 | Quem é o "Diretor financeiro" da baixa? | A Diretoria | RN-013 |
| P-18 | Prazo da negociação em dias úteis ou corridos? | Corridos | RN-029 |
| P-24 | Algum e-mail sai sozinho, sem aprovação? | Nenhum; o modo automático existe e nasce desligado | RF-022, RN-021 |
| P-25 | Anexo em endereço público (carta de anuência)? | Aceito, com aviso | RN-020 |
| P-34 | Multa de 2%, juros de 1% e correção de 0,4% ao mês conferidos contra os contratos? A correção é percentual fixo ou índice? | Os do artefato, em parâmetro | RN-015 |
| P-35 | Como o acordo aparece no ERP: os títulos ficam em aberto até a quitação ou nascem títulos novos? | Parcela paga é registrada à mão; o caso só regulariza quando o ERP zera o saldo | RF-014 |
| P-36 | O parecer do Jurídico vale para toda baixa, inclusive "Desconto concedido em acordo"? | Sim, em toda baixa | RN-014 |
| P-37 | A previsão de pagamento do órgão tem limite de dias? | Não tem (como no artefato) | RN-007, C-029 |

P-34 a P-37 numeradas no índice do contrato (`docs/contrato/00-indice.md` §4).

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida
- [x] Cenários cobrem caminhos de erro (C-006, C-008, C-010, C-013, C-014, C-016, C-019, C-028)
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta
- [x] Zero `[NEEDS CLARIFICATION]` em aberto — as 8 viraram pendências com padrão adotado (nenhuma bloqueia)
