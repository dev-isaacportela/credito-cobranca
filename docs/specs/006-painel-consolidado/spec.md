# Spec: Painel consolidado — Crédito e Cobrança

**ID:** 006-painel-consolidado · **Status:** revisada contra o contrato técnico (fase 0c) e corrigida pela validação v2 (16/11) · **Data:** 2026-11-14

> Escopo: a visão executiva das três carteiras (Privada, Estética e Pública) e
> do Jurídico numa tela só — saúde, indicadores com meta, evolução no ano, aging,
> PDD, roll rate, movimento da inadimplência, concentração, conversão e
> indicadores por pessoa e por nível da equipe — mais a foto mensal da carteira
> e o fechamento manual de meses sem foto. O painel **só lê**: posição e
> recebimentos vêm da base (001), cobrança da 002, processos da 003, crédito da
> 004 e notas públicas da 005. Onde o número é regra de outro módulo (agenda,
> saúde, jurídico, notas públicas), o painel mostra o que o módulo dono informa;
> não refaz a conta. As telas onde o trabalho é feito são dessas specs.

## Problema

No artefato do gestor, o painel consolidado é a tela que a gerência e a
diretoria abrem para saber se a carteira está saudável. Ele tem três defeitos que
tornam os números pouco confiáveis: a foto mensal da carteira só era tirada
quando alguém abria o app no mês (mês sem acesso ficava sem foto, e a foto saía
com a data do primeiro acesso, não do fechamento); a "inadimplência gerada" era
estimada pela data de hoje menos os dias de atraso, o que torna o
"recuperado ÷ gerado" impreciso; e o cobrado de meses passados usava o saldo
aberto de hoje. Além disso, todo mundo via tudo — não havia recorte por
hierarquia. Deixar como está é decidir a política de crédito olhando números que
mudam conforme o dia em que alguém abriu a tela.

## Resultado esperado

Cada pessoa abre o painel e vê, para o mês, a BU e a carteira que escolher, os
números da parte da carteira que lhe cabe, sabendo de onde veio cada número
(posição de hoje, foto do fechamento ou lançamento manual) e se está dentro da
meta da política.

## Usuários

| Perfil | O que precisa fazer | Frequência |
|---|---|---|
| Diretoria | Acompanhar saúde, metas e evolução no ano das carteiras | semanal |
| Gerente financeiro | O mesmo da Diretoria, mais comparar agentes, BUs e carteiras, agir nos pontos de atenção e lançar o fechamento de meses sem foto | diária |
| Supervisor | Acompanhar a carteira da própria equipe: inadimplência, conversão, agenda, roll rate | diária |
| Agente de cobrança | Ver os indicadores da própria carteira | diária |
| Analista de crédito | Ver os indicadores dos clientes cujas análises são dele | diária |
| Administrador | Vê a carteira inteira e também lança o fechamento de meses sem foto | eventual |

Jurídico não acessa o painel (o perfil dele é só o módulo jurídico); os
indicadores do jurídico aparecem aqui para os demais perfis.

## Cenários

Massa de referência dos cenários (hoje = 14/11/2026, 10:00; mês corrente =
novembro): dez clientes de teste (códigos 6001 a 6010), oito com saldo em
aberto, somando carteira de R$ 94.000 (R$ 70.000 a vencer e R$ 24.000 vencidos).
Ana é a agente de 6001 a 6005 (equipe do supervisor Sérgio, que também tem o
agente Bruno, sem clientes, e a analista Rita); Carlos é o agente de 6006 a 6010
(equipe da supervisora Silvia); Gustavo é o gerente e Diana a diretora. As BUs
são Nutrição e Enfermagem (carteira Privada) e Estética (carteira Estética); o
cliente 6006 é órgão público (carteira Pública) e o 6004 compra de duas BUs,
aparecendo nas carteiras Privada e Estética. As fotos de setembro (carteira
R$ 54.000, vencido R$ 25.000) e de outubro (R$ 98.000 e R$ 28.000) já foram
tiradas. O detalhamento cliente a cliente está no `plan.md` (Simulador). Onde o
cenário diz "massa dos outros módulos", os dados são os clientes de teste da
cobrança, do jurídico, da concessão e do setor público.

**C-001 — Visão do gerente no mês corrente**
- **Dado que** o gerente Gustavo vê toda a carteira e não aplicou filtro
- **Quando** abre o painel em novembro
- **Então** vê carteira R$ 94.000, saldo vencido R$ 24.000, índice de inadimplência 25,53%, vencido acima de 90 dias R$ 12.000 (12,77% da carteira) e PDD R$ 10.270 (10,93% da carteira), 8 clientes com saldo e 6 em atraso, com a indicação "posição de hoje" e o horário da última leitura do Winthor

**C-002 — Cada um vê a parte da carteira que lhe cabe**
- **Dado que** Ana é agente dos clientes 6001 a 6005 e Sérgio supervisiona Ana e Bruno
- **Quando** cada um abre o painel sem filtro
- **Então** Ana vê carteira R$ 45.000 e vencido R$ 11.000; Sérgio vê os mesmos R$ 45.000 e R$ 11.000 (a equipe dele); Carlos e Silvia veem R$ 49.000 e R$ 13.000; Bruno, que não tem clientes, vê todos os blocos com "Nenhum cliente no recorte"; Rita, analista, vê só os clientes cujas análises são dela (nos meses passados, só os de que também era a agente na foto, RN-006); nenhum bloco mostra cliente, agente ou valor de fora da árvore de cada um
- **E quando** Júlia, do Jurídico, um usuário sem vínculo com a equipe ou um membro inativo tenta abrir o painel
- **Então** o acesso é recusado

**C-003 — Filtros de carteira e BU**
- **Dado que** a carteira tem saldo nas BUs Nutrição, Enfermagem e Estética, e o cliente 6004 tem saldo em duas delas
- **Quando** o gerente filtra a carteira Estética
- **Então** vê carteira R$ 4.000, vencido R$ 4.000, índice 100,00%, 1 cliente
- **E quando** filtra a carteira Pública
- **Então** vê só o órgão 6006: carteira R$ 38.000, vencido R$ 8.000
- **E quando** filtra a BU Enfermagem
- **Então** vê carteira R$ 10.000 e vencido R$ 10.000
- **E quando** combina BU Enfermagem com carteira Estética
- **Então** todos os blocos mostram "Nenhum cliente no recorte" e travessão, sem erro
- *Removido: o filtro "carteira Jurídico". Carteira passou a ser só Privada, Estética e Pública (D-05); o Jurídico aparece pelo resumo do módulo (RF-024).*

**C-004 — Mês passado vem da foto do fechamento**
- **Dado que** a foto de outubro foi tirada em 01/11 às 00:15
- **Quando** o gerente escolhe outubro no filtro de mês
- **Então** aging, PDD e inadimplência mostram carteira R$ 98.000, vencido R$ 28.000 e PDD R$ 5.720, com a indicação "foto do fechamento de 10/2026, tirada em 01/11/2026 00:15" — e não os números de hoje

**C-005 — Foto tirada sozinha na virada do mês**
- **Dado que** ainda não existe foto de novembro
- **Quando** termina com sucesso a primeira leitura do Winthor de dezembro (01/12 às 00:10) e a rotina automática roda
- **Então** a foto do fechamento de novembro é gravada com a posição dessa leitura: uma linha por cliente e BU com saldo e uma linha zerada para cada uma da foto anterior que ficou sem saldo (11 linhas na massa de referência), vencido R$ 24.000 e PDD R$ 10.340 (um título de R$ 1.000 já passou de 30 dias de atraso em 01/12)
- **E quando** a rotina roda de novo
- **Então** nada muda: a foto de um mês nunca é regravada

**C-006 — Foto não é tirada sem base (erro)**
- **Dado que** dezembro começou e ainda não houve leitura do Winthor com sucesso no mês
- **Quando** a rotina automática roda
- **Então** a foto de novembro não é tirada e o painel aponta "foto de 11/2026 pendente" nos pontos de atenção
- **E dado que** o sistema não teve nenhuma leitura com sucesso em janeiro de 2027
- **Quando** a primeira leitura de fevereiro termina e a rotina roda
- **Então** a foto de janeiro é gravada com a posição dessa leitura, e dezembro, que não teve leitura no mês seguinte, fica sem foto e só entra por fechamento manual

**C-007 — Redistribuir cliente não reescreve o passado**
- **Dado que** o cliente 6002 era da Ana na foto de outubro
- **Quando** o gerente passa 6002 para o Carlos em novembro
- **Então** a carteira de novembro da Ana cai para R$ 40.000, mas a de outubro continua R$ 50.000 com vencido R$ 10.000, e a de outubro do Carlos continua R$ 48.000

**C-008 — Fechamento manual de mês sem foto**
- **Dado que** agosto de 2026 não tem foto
- **Quando** o gerente lança o fechamento de agosto com carteira R$ 60.000, vencido R$ 22.000, vencido acima de 90 dias R$ 4.000 e PDD R$ 5.000
- **Então** o fechamento é gravado, aparece na lista de fechamentos, alimenta a evolução no ano da visão consolidada (agosto: inadimplência 36,67%, vencido > 90 dias 6,67%, PDD 8,33%, fonte "manual") e a alteração fica na auditoria
- **E quando** ele corrige o PDD para R$ 5.500
- **Então** o valor é atualizado e a auditoria registra antes R$ 5.000 e depois R$ 5.500

**C-009 — Fechamento manual recusado (erro)**
- **Dado que** o gerente lança fechamentos inválidos
- **Quando** informa vencido R$ 70.000 com carteira R$ 60.000; ou vencido acima de 90 dias R$ 25.000 com vencido R$ 22.000; ou o mês de setembro (que tem foto); ou o mês corrente
- **Então** cada um é recusado com o motivo (vencido maior que a carteira; vencido > 90 dias maior que o vencido; mês já tem foto; mês ainda não fechou), e nada é gravado
- **E quando** o supervisor Sérgio tenta lançar um fechamento válido
- **Então** é recusado por falta de permissão

**C-010 — Fechamento manual não vale para recorte**
- **Dado que** agosto tem só fechamento manual
- **Quando** o gerente filtra a BU Nutrição, ou quando a agente Ana abre a evolução
- **Então** agosto aparece "sem dado", porque o fechamento manual é um número da empresa inteira e não se divide por BU, carteira ou agente

**C-011 — Movimento da inadimplência de novembro**
- **Dado que** em novembro 6001 passou a ter R$ 2.000 vencidos, 6004 teve R$ 1.000 a mais vencidos, 6009 e 6010 pagaram R$ 3.000 e R$ 2.000 de títulos vencidos, 6001 pagou R$ 5.000 de um título no dia do vencimento, um pagamento de 6002 foi estornado e 6005 teve R$ 2.000 baixados como perda
- **Quando** o gerente abre o movimento da inadimplência
- **Então** vê, para novembro: saldo vencido no fechamento anterior R$ 28.000, inadimplência gerada R$ 3.000, recuperado R$ 5.000, baixas e outros ajustes R$ 2.000, saldo vencido atual R$ 24.000, variação líquida −R$ 4.000, recuperado ÷ gerado 166,67%, 1 cliente que entrou em atraso, 1 regularizado e 1 baixado — e nem o pagamento em dia de 6001 nem o pagamento estornado de 6002 entram no recuperado
- **E** para outubro: vencido inicial R$ 25.000, gerada R$ 9.000, recuperado R$ 6.000 e vencido final R$ 28.000

**C-012 — Roll rate de outubro para novembro**
- **Dado que** a foto de outubro tem, na faixa de 1 a 30 dias, 6004 (Estética, saldo R$ 4.000), 6005 (R$ 2.000) e 6009 (R$ 3.000), e na faixa de 31 a 60 dias 6002 e 6010
- **Quando** o gerente abre o roll rate de novembro
- **Então** a linha "1 a 30 dias" mostra saldo R$ 9.000, pagou R$ 3.000 (6009), piorou R$ 6.000 (6004 e o baixado 6005) e taxa de rolagem 66,67%; a linha "31 a 60 dias" mostra melhorou R$ 3.000 (6010), piorou R$ 5.000 (6002) e taxa 62,50%; a linha "a vencer" mostra manteve R$ 24.000, piorou R$ 15.000 e taxa 38,46%

**C-013 — Saúde da carteira**
- **Dado que** a concessão de crédito classifica cada cliente com crédito aprovado em Saudável, Em atenção ou Risco (massa dos outros módulos)
- **Quando** o gerente abre a saúde da carteira
- **Então** vê, para cada nível, a quantidade de clientes e o saldo, iguais aos que a concessão informa para o mesmo recorte, os quatro maiores clientes de cada nível com o motivo, e o índice de saúde; órgão público não entra, e a soma dos três níveis é o total de clientes com crédito aprovado que ele enxerga

**C-014 — Pontos de atenção**
- **Dado que** a massa dos outros módulos tem pedidos retidos (clientes 4007 e 4010), uma baixa aguardando decisão (2014), bloqueios devidos e não aplicados (2005 e 2007), um crédito com validade vencida (4005), um cliente crítico (4010) e uma nota pública vencida há mais de 2 meses (5003)
- **Quando** o gerente abre o painel
- **Então** os pontos de atenção listam cada um desses sinais com quantidade e valor, mais as ações de cobrança atrasadas, as promessas vencidas, os processos sem andamento e as certidões a vencer, com a mesma quantidade que cada módulo dono informa
- **E quando** a última leitura do Winthor com sucesso tem mais de 30 minutos
- **Então** aparece no topo "dados do Winthor desatualizados desde hh:mm"

**C-015 — Indicadores executivos e metas**
- **Dado que** a massa de referência está carregada
- **Quando** o gerente abre os indicadores executivos de novembro
- **Então** vê inadimplência 25,53% (fora, ≤ 5%), vencido > 90 dias 12,77% (fora, ≤ 2%), PDD 10,93% (fora, ≤ 3%), recuperado ÷ gerado 166,67% (na meta, ≥ 80%), conversão 16,13% (fora, ≥ 60%), exposição R$ 94.000 usando 53,32% de R$ 176.300 de limite e tempo médio de atraso 86,79 dias (os dois últimos sem meta)
- **E dado que** a massa dos outros módulos tem solicitações decididas e promessas avaliadas no mês
- **Então** tempo médio de análise (meta ≤ 9 dias), SLA da análise (≥ 85%), taxa de aprovação (entre 60% e 85%), crédito concedido e promessas cumpridas (≥ 70%) batem com a conta feita registro a registro, cada um com o estado da meta

**C-016 — Evolução no ano × meta**
- **Dado que** agosto tem fechamento manual, setembro e outubro têm foto e novembro é o mês corrente
- **Quando** o gerente abre a evolução de 2026 sem filtro
- **Então** a inadimplência mostra agosto 36,67% (manual), setembro 46,30% (foto), outubro 28,57% (foto), novembro 25,53% (atual, parcial), janeiro a julho "sem dado" e dezembro vazio; o cartão mostra último valor 25,53%, "Fora da meta", média no ano 34,27% e 0 de 4 meses na meta

**C-017 — Conversão da cobrança por agente**
- **Dado que** em novembro os clientes do Carlos tinham R$ 18.000 vencidos no fechamento de outubro e ele recebeu R$ 5.000 de títulos vencidos; os da Ana tinham R$ 10.000 e geraram mais R$ 3.000; Ana registrou 2 contatos (um com promessa) e Carlos 1
- **Quando** o gerente abre a conversão por agente
- **Então** a linha do Carlos mostra 4 clientes cobrados, cobrado R$ 18.000, recebido R$ 5.000, conversão 27,78% e 1 contato; a da Ana, cobrado R$ 13.000, recebido R$ 0, 2 contatos e 1 promessa; o total mostra cobrado R$ 31.000, recebido R$ 5.000 e conversão 16,13%

**C-018 — Concentração da inadimplência**
- **Dado que** o vencido de R$ 24.000 está em seis clientes, dois deles do Grupo Alfa
- **Quando** o gerente abre a concentração
- **Então** vê maior devedor 6006 com 33,33% do vencido, Grupo Alfa com 29,17%, região Sudeste com 50,00%, BUs Nutrição e Enfermagem com 41,67% cada, a lista dos 10 maiores devedores com percentual e acumulado, e índice de concentração por cliente 2.187,5, classificado como "moderada"

**C-019 — Crédito analisado e quadros por carteira e por BU**
- **Dado que** a massa dos outros módulos tem solicitações aprovadas, recusadas e em análise nas três carteiras
- **Quando** o gerente abre o crédito analisado e o quadro por carteira
- **Então** vê, por carteira, em análise (com as fora do prazo), aprovadas e recusadas (quantidade e valor), aprovação e concedido iguais à conta feita registro a registro; e, na massa de referência, exposição e vencido de R$ 52.000 e R$ 12.000 na Privada, R$ 4.000 e R$ 4.000 na Estética e R$ 38.000 e R$ 8.000 na Pública
- **E quando** abre o quadro por BU
- **Então** vê Nutrição com exposição R$ 80.000, vencido R$ 10.000 e 5 clientes; Enfermagem com R$ 10.000, R$ 10.000 e 3 clientes; Estética com R$ 4.000, R$ 4.000 e 1 cliente

**C-020 — Exposição por faixa de risco**
- **Dado que** cada cliente tem um rating atual (privado e estética AA a E; público P1 a P4) ou nenhum
- **Quando** o gerente abre a exposição por faixa de risco
- **Então** vê o saldo utilizado de cada faixa, com as duas escalas separadas e a linha "sem rating", somando a exposição total de R$ 94.000; o órgão 6006 nunca aparece nas faixas AA a E

**C-021 — Inadimplência por agente e por BU**
- **Dado que** a massa de referência está carregada
- **Quando** o gerente abre a inadimplência por agente e por BU
- **Então** a linha do Carlos mostra carteira R$ 49.000, vencido R$ 13.000, índice 26,53%, acima de 90 dias R$ 12.000, 3 clientes em atraso e 54,17% do vencido total; a BU Nutrição mostra carteira R$ 80.000, vencido R$ 10.000, representatividade 41,67%, índice 12,50%, 2 clientes em atraso e R$ 8.000 acima de 90 dias

**C-022 — Planos de pagamento × faturamento × inadimplência**
- **Dado que** os clientes do plano de 30 dias faturaram R$ 20.000, R$ 20.000, R$ 25.000, R$ 20.000 e R$ 35.000 de junho a outubro e R$ 28.000 em novembro
- **Quando** o gerente abre os planos de pagamento em novembro
- **Então** a linha do plano de 30 dias mostra 4 clientes, faturado no mês R$ 28.000, média de 6 meses R$ 24.666,67, vencido R$ 7.000, 2 clientes em atraso, inadimplência 16,28% e vencido ÷ faturado 25,00%

**C-023 — Resumo da agenda, jurídico e público no consolidado**
- **Dado que** a cobrança, o jurídico e o setor público informam os seus resumos (massa dos outros módulos)
- **Quando** o gerente abre o painel com a BU Nutrição
- **Então** o resumo da agenda, o do jurídico e o do setor público mostram os números que cada módulo informa para a BU Nutrição, e os pontos de atenção repetem as mesmas quantidades
- **E quando** abre o bloco do jurídico e do setor público
- **Então** vê o funil de cada carteira no mês escolhido, com quantidade e valor por etapa: no jurídico, a ajuizar, em andamento, acordos judiciais a receber e com parcela vencida, recuperado no mês e no ano, custo no mês e os desvios de prazo (e os críticos); no público, notas em tramitação, entre a entrega e o atesto, aguardando liquidação, liquidadas sem pagamento, com pagamento vencido e recebido no mês — os números que cada módulo informa
- **E quando** um desses módulos ainda não está instalado
- **Então** o bloco dele mostra "módulo não instalado", sem erro, e os demais continuam

**C-024 — Indicadores por nível da equipe**
- **Dado que** a hierarquia é Diretoria > Gerente > Supervisor > Agentes e Analista
- **Quando** Sérgio abre os indicadores por nível
- **Então** vê quatro linhas (ele, Ana, Bruno e Rita); a linha dele soma a equipe: 3 clientes em atraso, vencido R$ 11.000 e recuperado no mês R$ 0, mais as análises em andamento e decididas da Rita
- **E quando** Gustavo abre a mesma tabela
- **Então** vê nove linhas; a dele e a da Diana mostram 6 clientes em atraso, vencido R$ 24.000 e recuperado R$ 5.000; a da Silvia, 3 clientes, R$ 13.000 e R$ 5.000
- **E quando** Ana, agente, abre o painel
- **Então** o bloco da equipe não aparece para ela e a consulta é recusada

**C-025 — Concentração da carteira de limites**
- **Dado que** os dez clientes têm limite de crédito somando R$ 186.300 e o teto de concentração é 10%
- **Quando** o gerente abre a concentração de limites
- **Então** vê o maior cliente 6006 com R$ 80.000 (42,94%), o Grupo Alfa com R$ 30.000 (16,10%), o índice de concentração por cliente 2.518,1 ("alta") e a lista de quem passa do teto: os clientes 6006, 6003 e 6001 e o Grupo Alfa

**C-026 — Prazo médio de recebimento**
- **Dado que** cada cliente tem um prazo médio de compra
- **Quando** o gerente abre o bloco de crédito
- **Então** vê o prazo médio de recebimento (ponderado pelo saldo utilizado) e o prazo médio simples, iguais à conta feita cliente a cliente

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | O sistema DEVE filtrar o painel por mês, BU e carteira (Todas, Privada, Estética, Pública), e cada filtro vale para todos os blocos | Mês padrão = mês corrente; meses futuros não são oferecidos; trocar um filtro refaz os números (C-003, C-004). Onde o filtro não se aplica (RN-017), o bloco avisa | must |
| RF-002 | O sistema DEVE restringir todos os blocos à parte da carteira visível para quem abre (RN-015) | Ana vê R$ 45.000, Sérgio R$ 45.000, Gustavo R$ 94.000; Jurídico é recusado (C-002) | must |
| RF-003 | O sistema DEVE informar, em cada bloco, de onde vêm os números | Rótulo "posição de hoje hh:mm", "foto do fechamento de MM/AAAA, tirada em …", "fechamento manual" ou "sem dado" (C-001, C-004, C-008) | must |
| RF-004 | O sistema DEVE mostrar a saúde da carteira em três níveis — Saudável, Em atenção, Risco — com quantidade de clientes, saldo e os maiores clientes de cada nível, como classificada pela concessão de crédito (RN-012) | C-013 | must |
| RF-005 | O sistema DEVE listar os pontos de atenção: índice de inadimplência acima do alerta, concentração de limites acima do teto, limites com validade vencida, clientes críticos, clientes em risco, bloqueios devidos e não aplicados, promessas vencidas, ações de cobrança atrasadas, acordos quebrados no mês, baixas aguardando decisão, solicitações de crédito fora do prazo, pedidos retidos, processos sem andamento e com prazo vencendo, notas públicas com pagamento vencido e vencidas há mais de 2 meses, certidões vencendo ou vencidas, foto mensal pendente e dados do Winthor desatualizados | Só aparecem os sinais com quantidade > 0, com quantidade e valor quando houver; sem sinais, "Nenhum ponto de atenção no recorte" (C-014). *Saiu da lista: "indicadores executivos fora da meta" (o bloco de indicadores já conta quantos estão fora)* | must |
| RF-006 | O sistema DEVE mostrar 12 indicadores executivos, cada um com valor, meta e estado (na meta / fora): tempo médio de análise, SLA da análise, taxa de aprovação, crédito concedido, exposição e utilização do limite, índice de inadimplência, vencido > 90 dias, PDD, recuperado ÷ gerado, conversão da cobrança, promessas cumpridas e tempo médio de atraso | Valores de C-015; crédito concedido, exposição e tempo médio de atraso são informativos, sem meta | must |
| RF-007 | O sistema DEVE mostrar a evolução no ano × meta, mês a mês, de: tempo de análise, SLA, aprovação, crédito concedido, inadimplência, vencido > 90 dias, PDD, recuperado ÷ gerado, conversão e promessas cumpridas | Seletor de ano e de carteira; cada mês marcado dentro/fora da meta e com a fonte; cartão com último valor, média no ano e meses na meta (C-016) | must |
| RF-008 | O sistema DEVE mostrar o aging (a vencer, 1–30, 31–60, 61–90, 91–180, acima de 180 dias) da carteira, por carteira e por BU, com total vencido, índice, vencido > 90 dias e PDD de cada linha | Totais de C-001; linhas Privada, Estética e Pública somam o total; as linhas por BU também | must |
| RF-009 | O sistema DEVE mostrar a provisão para perdas (PDD) por faixa: saldo, percentual da faixa, provisão e participação; PDD total, % da carteira e cobertura do vencido | PDD R$ 10.270 na massa; percentuais vêm dos parâmetros em vigor, com o valor da carteira quando houver (RN-003) | must |
| RF-010 | O sistema DEVE mostrar o roll rate do mês: para cada faixa no fechamento anterior (a vencer a 91–180), saldo, pagou, melhorou, manteve, piorou e taxa de rolagem | Valores de C-012 | must |
| RF-011 | O sistema DEVE tirar sozinho a foto mensal da carteira na virada do mês, sem depender de alguém abrir o painel (RN-005) | C-005 e C-006 | must |
| RF-012 | O sistema DEVE permitir ao Gerente, à Diretoria e ao Administrador lançar e corrigir o fechamento manual de mês sem foto: carteira, vencido, vencido > 90 dias e PDD (RN-016) | C-008 e C-009; cada lançamento e correção na auditoria com antes e depois | must |
| RF-013 | O sistema DEVE mostrar o movimento da inadimplência dos 6 meses que terminam no mês escolhido: saldo vencido inicial, gerada, recuperado, baixas e outros ajustes, saldo vencido final, variação líquida, recuperado ÷ gerado, clientes que entraram em atraso, regularizados e baixados | Valores de novembro e de outubro de C-011 | must |
| RF-014 | O sistema DEVE mostrar, por plano de pagamento, prazo médio, clientes, faturado no mês, média dos 6 últimos meses, vencido, clientes em atraso, inadimplência e vencido ÷ faturado no mês, e o faturado de cada um dos 6 meses | Valores de C-022 | should |
| RF-015 | O sistema DEVE mostrar a inadimplência por agente de cobrança: carteira, vencido, índice, acima de 90 dias, clientes em atraso e parte do vencido total | Linha do Carlos em C-021; agentes ordenados por vencido, do maior para o menor | must |
| RF-016 | O sistema DEVE mostrar a inadimplência por BU: carteira, vencido, representatividade no vencido total, índice, clientes em atraso e acima de 90 dias | Linha Nutrição em C-021 | must |
| RF-017 | O sistema DEVE mostrar o resumo da agenda por agente: vencido em cobrança, a vencer em 7 dias úteis, ações atrasadas, ações para hoje, ações nos próximos 7 dias úteis, promessas vencidas, clientes sem contato, e ações concluídas no prazo e fora (com o % no prazo) | Números informados pela agenda da cobrança (002: `ccCobAgendaResumo` com `ate` = 7º dia útil, inclusive `PROXIMOS` e `A_VENCER_7DU`), vencido e ações no prazo de `ccPainelAgentes`, com os filtros de BU e carteira do painel (C-023). Voltou ao que a opção B de `painel-agentes` mostra (DT-33, fechamento v2) | should |
| RF-018 | O sistema DEVE mostrar a conversão da cobrança por agente: clientes cobrados, contatos, cobrado, recebido, conversão, promessas e promessas cumpridas, e a conversão total dos 6 últimos meses | Valores de C-017 | must |
| RF-019 | O sistema DEVE mostrar a concentração da inadimplência por cliente, grupo econômico, região e BU, a lista dos 10 maiores devedores (com % e % acumulado) e o índice de concentração | Valores de C-018 | must |
| RF-020 | O sistema DEVE mostrar o crédito analisado no mês: aprovado e recusado (quantidade e valor), em análise, fora do prazo e % aprovado, por carteira | C-019. *Removido: "por BU" — a solicitação é do cliente na carteira e não tem BU (D-01)* | must |
| RF-021 | O sistema DEVE mostrar a exposição (saldo utilizado) por faixa de risco: AA a E na Privada e na Estética, P1 a P4 na Pública, e "sem rating" | C-020; as faixas somam a exposição total | must |
| RF-022 | O sistema DEVE mostrar o quadro por carteira (Privada, Estética, Pública): em análise, aprovado, recusado, aprovação, concedido, exposição, vencido, inadimplência, críticos e pedidos retidos | Linhas de C-019 | must |
| RF-023 | O sistema DEVE mostrar o quadro por BU: clientes, exposição, vencido, representatividade na inadimplência, inadimplência e críticos | Linhas de C-019. *Removido: aprovado/recusado, concedido e em análise por BU (D-01)* | must |
| RF-024 | O sistema DEVE mostrar o resumo do jurídico como funil do mês: a ajuizar, processos em andamento (quantidade e valor), acordos judiciais a receber e com parcela vencida (quantidade e valor), recuperado no mês e no ano, custo no mês, desvios de prazo e críticos; e ainda em montagem de dossiê, com prazo vencendo, sem andamento, custo total e a pagar | Números informados pelo módulo jurídico (003), com os filtros de mês, carteira e BU do painel (C-023) | must |
| RF-025 | O sistema DEVE mostrar o resumo do setor público como funil do mês: notas em tramitação, entre a entrega e o atesto, aguardando liquidação, liquidadas sem pagamento, com pagamento vencido (cada etapa com quantidade e valor) e recebido no mês; e ainda a protocolar, com liquidação vencida, vencidas há mais de 2 meses (quantidade e valor), certidões vencendo e vencidas, contratos em alerta e créditos por rating do órgão | Números informados pelo módulo público (005), com os filtros de mês e BU do painel (C-023) | must |
| RF-026 | O sistema DEVE mostrar, para supervisor ou acima e para o Administrador, os indicadores por nível da equipe: pessoa, cargo, a quem reporta, análises em andamento, decididas no mês, clientes em atraso, vencido, recuperado no mês e ações atrasadas, cada linha somando a própria carteira e a da equipe abaixo | Valores de C-024 | must |
| RF-027 | O sistema DEVE mostrar a concentração da carteira de limites: maior cliente, 10 maiores com % e % acumulado, participação por grupo econômico, índice de concentração e quem passa do teto de concentração da política (função do artefato que ficou com o painel) | Valores de C-025 | should |
| RF-028 | O sistema DEVE mostrar o prazo médio de recebimento e o prazo médio simples da carteira (função do artefato que ficou com o painel) | C-026; informativos, sem meta | should |

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | Abrir um bloco do painel, ou trocar um filtro nele, dispara no máximo 6 consultas ao servidor (contando as que uma consulta faz por dentro), e o painel não se atualiza sozinho | Contagem de chamadas no simulador ao abrir cada bloco e ao trocar o mês |
| RNF-002 | Cada bloco responde em até 3 s com 20.000 clientes e 24 fotos mensais | Cronômetro com massa sintética desse tamanho |
| RNF-003 | A foto do mês é tirada na rodada da rotina automática seguinte à primeira leitura do Winthor com sucesso do mês seguinte (até 10 minutos) | Data da leitura × data da foto em produção nos dois primeiros meses |
| RNF-004 | Nenhum número da política (metas, percentuais de PDD, limiares de concentração, tolerância da leitura) está fixo: todos são parâmetros com valor padrão | Inspeção: alterar a meta de inadimplência para 30% muda o estado de C-015 para "na meta" sem nova versão |

## Entidades do domínio

- **Posição do cliente** — o que o cliente deve hoje, a vencer e vencido por
  faixa de atraso, por BU e por carteira, e o limite e o utilizado; vem da
  leitura do Winthor (001). É a fonte do mês corrente.
- **Foto do fechamento** — a posição de cada cliente em cada BU na virada do
  mês, congelada: saldos por faixa, PDD, o movimento do mês (vencido inicial,
  gerada, recuperado, baixado), e a carteira, o agente, o grupo, a UF e o plano
  naquele momento. Uma por cliente, BU e mês; nunca muda.
- **Fechamento manual** — os quatro números da empresa inteira (carteira,
  vencido, vencido > 90 dias, PDD) de um mês que não tem foto. Só existe para a
  visão consolidada.
- **Recebimento** — pagamento real lido do Winthor (001), com a data de
  pagamento e o vencimento do título. Pago depois do vencimento, e não
  estornado, é recuperação.
- **Carteira** — recorte do painel: Privada, Estética e Pública (RN-017).
- **BU** — unidade de negócio do item comprado; um cliente pode ter saldo em
  mais de uma.
- **Meta** — parâmetro da política (001) que diz se um indicador está bom; um
  valor só para a empresa.
- **Membro da equipe** — pessoa com cargo e superior (001); define o que cada um
  vê (RN-015) e como os indicadores somam por nível (RN-019).
- **Solicitação, decisão, crédito, risco do cliente, pedido retido** (004),
  **contato, promessa, acordo, baixa, agenda** (002), **processo** (003),
  **nota fiscal pública, certidão** (005) — lidos para os indicadores; o painel
  não altera nenhum deles.

## Regras de negócio

- **RN-001** — As faixas de aging são definição do sistema: a vencer, 1–30,
  31–60, 61–90, 91–180 e acima de 180 dias de atraso, contados na data da
  posição. O vencido se distribui **por título**: cada parcela entra na faixa
  dos seus dias de atraso (P-10). A faixa de uma linha (cliente numa BU), usada
  no roll rate, é a do título vencido mais antigo; sem vencido e com saldo a
  vencer, "a vencer"; sem saldo, "sem saldo".
- **RN-002** — Carteira = vencido + a vencer. Índice de inadimplência = vencido ÷
  carteira. Vencido > 90 dias = faixas 91–180 e acima de 180. Recorte sem
  carteira mostra "—", não 0%.
- **RN-003** — PDD = soma, por faixa, de saldo da faixa × percentual da faixa
  (padrão 0,5 / 3 / 10 / 30 / 50 / 100%), com o valor da carteira da linha
  quando existir. A foto guarda o PDD calculado com os percentuais em vigor no
  dia da foto; mudar o parâmetro depois não reescreve meses fechados.
- **RN-004** — Fonte da posição de um mês: o mês corrente usa a posição de
  hoje; mês passado usa a foto do fechamento; mês sem foto usa o fechamento
  manual, só na visão consolidada (sem filtro de BU e carteira, por quem vê a
  carteira inteira); fora disso, "sem dado".
- **RN-005** — A foto do fechamento do mês M é tirada uma única vez, na rodada
  da rotina seguinte à primeira leitura do Winthor com sucesso do mês M + 1,
  com a posição dessa leitura. Inclui toda linha (cliente e BU) com saldo e,
  zerada, toda linha que tinha saldo na foto anterior ou que teve recuperação
  ou baixa no mês. Nunca é regravada nem editada. Mês cujo mês seguinte não
  teve leitura com sucesso fica sem foto.
- **RN-006** — A BU é do item comprado: a posição e a foto são por cliente e
  BU, e os recortes por BU somam essas linhas (um cliente conta em cada BU em
  que tem saldo e uma vez só no total). Mês passado agrupa e filtra pela BU,
  carteira, agente, grupo, UF e plano gravados na foto daquele mês, e a
  visibilidade segue o agente gravado na foto; o mês corrente, pelos dados
  atuais do cliente. Limite conhecido: a foto não guarda o analista. Nos meses
  passados, o analista vê só os clientes de que também era o agente, e o
  supervisor de um analista vê só os clientes dos agentes da equipe (os
  analisados pelo analista ficam de fora se o agente for de outra equipe).
- **RN-007** — Recuperado do mês = soma dos recebimentos reais, não estornados,
  com pagamento no mês de títulos pagos depois do vencimento. Pagamento até o
  vencimento não é recuperação; por isso parcela de acordo paga em dia não
  conta (padrão adotado; pendência do gestor em Pendências).
- **RN-008** — Inadimplência gerada de uma linha (cliente e BU) no mês = vencido
  no fim do mês − vencido no fechamento anterior + recuperado no mês, quando
  positivo; senão zero. A gerada de um recorte é a soma das linhas. Baixas e
  outros ajustes = vencido inicial + gerada − recuperado − vencido final
  (baixa como perda, renegociação, cancelamento). Mês sem fechamento anterior
  não tem gerada ("sem dado"); se o anterior é um fechamento manual, a gerada
  da visão consolidada é calculada sobre os totais e marcada "estimada".
- **RN-009** — Entrou em atraso: cliente com vencido zero no fechamento anterior
  e maior que zero no fim do mês. Regularizado: vencido maior que zero antes e
  zero no fim, sem baixa como perda no mês. Baixado: teve baixa como perda
  aprovada no mês.
- **RN-010** — Roll rate: base = linhas (cliente e BU) do fechamento anterior
  com faixa de "a vencer" a 91–180, pelo saldo total que tinham. Destino pela
  faixa no fim do mês: **pagou** (era vencido e ficou sem vencido), **melhorou**
  (faixa menor, ainda vencido), **manteve** (mesma faixa; "a vencer" que
  continua sem vencido), **piorou** (faixa maior, ou baixado como perda). Taxa
  de rolagem = saldo que piorou ÷ saldo da faixa.
- **RN-011** — Conversão do mês = recuperado ÷ cobrado, com cobrado = vencido no
  fechamento anterior + gerada no mês (tudo o que esteve vencido no mês). Por
  agente, pela atribuição da RN-006. Contatos e promessas contam pelo agente que
  os registrou. Promessas cumpridas = cumpridas ÷ (cumpridas + quebradas), pela
  data prometida no mês, conforme a situação dada pela cobrança (002).
- **RN-012** — Saúde: a classificação Saudável / Em atenção / Risco é a da
  concessão de crédito (004), feita para clientes com crédito aprovado das
  carteiras Privada e Estética. O painel só conta clientes e soma saldo por
  nível e mostra o índice de saúde (saudáveis ÷ classificados); não tem regra
  própria. Órgão público não tem saúde.
- **RN-013** — Estado da meta: indicadores "no máximo" (inadimplência, vencido >
  90 dias, PDD, tempo de análise) estão na meta com valor ≤ meta; "no mínimo"
  (SLA, recuperado ÷ gerado, conversão, promessas) com valor ≥ meta; aprovação
  com valor entre o mínimo e o máximo. Sem valor, sem estado.
- **RN-014** — Índice de concentração = soma dos quadrados das participações (em
  %). Abaixo do limiar "moderado" (padrão 1.500) "pulverizada"; abaixo do
  limiar "alto" (padrão 2.500) "moderada"; a partir dele "alta". Vale para a
  inadimplência (participação no vencido) e para os limites (participação no
  limite). Cliente sem grupo conta sozinho no recorte por grupo.
- **RN-015** — Visibilidade: agente vê os clientes de que é o agente; analista,
  os clientes cujas análises são dele; supervisor, os dele e os da equipe
  abaixo, em qualquer nível; gerente, diretoria e administrador veem tudo,
  inclusive clientes sem agente. Jurídico não acessa o painel. Membro inativo
  ou usuário sem membro não acessa. O que cada cargo encontra:

  | Bloco | Agente e analista | Supervisor | Gerente, Diretoria, Administrador |
  |---|---|---|---|
  | Carteira, saúde, indicadores, aging, PDD, roll rate, movimento, concentração, planos, crédito, jurídico e público | só os próprios clientes | a própria equipe | tudo |
  | Comparação entre agentes (inadimplência, conversão, agenda) | só a própria linha, sem gráfico de comparação | as linhas da equipe | todas |
  | Evolução no ano | só meses com foto ou posição (fechamento manual não aparece); nos meses com foto, o analista vê só os clientes de que era o agente (RN-006) | idem | inclui fechamento manual |
  | Indicadores por nível da equipe | não aparece | a própria árvore | todos |
  | Lançar fechamento manual | não aparece | não aparece | aparece |

- **RN-016** — Fechamento manual: lançam o Gerente, a Diretoria e o
  Administrador (P-26); só para mês anterior ao corrente e sem foto; valores
  ≥ 0; vencido ≤ carteira; vencido > 90 dias ≤ vencido; PDD ≤ carteira. Um
  fechamento por mês; lançar de novo o mesmo mês corrige, com auditoria. Se o
  mês ganhar foto, a foto prevalece.
- **RN-017** — Privada, Estética e Pública são disjuntas por linha: saldo de
  órgão público é da carteira Pública, em qualquer BU; os demais seguem a
  carteira da BU do item. Um cliente pode ter saldo em mais de uma carteira;
  "Todas" conta cada cliente uma vez. O filtro de BU não se aplica às decisões
  de crédito (a solicitação é do cliente na carteira) nem ao fechamento manual.
  *Removido: Jurídico como carteira do filtro (D-05).*
- **RN-018** — Região é a das cinco regiões do IBGE, pela UF do cliente; sem UF,
  "Sem região".
- **RN-019** — Indicadores por nível: a linha de cada pessoa soma a própria
  carteira e a de toda a equipe abaixo dela; análises contam pelo analista e
  clientes pelo agente.
- **RN-020** — Crédito do mês: decididas (aprovadas e recusadas) pela data da
  decisão; em análise e fora do prazo pela posição de hoje; concedido = limites
  aprovados nas decisões do mês; tempo de análise em dias corridos da abertura
  à decisão; SLA = decididas até a data-limite da solicitação (gravada pela
  concessão na abertura) ÷ decididas. Pré-aprovação de órgão conta como
  decidida e aprovada (definição da concessão de crédito).
- **RN-021** — Dados desatualizados: a última leitura do Winthor com sucesso tem
  mais minutos que a tolerância da política (padrão 30).
- **RN-022** — Concentração de limites: participação de cada cliente e de cada
  grupo econômico no limite total dos clientes visíveis. Passa do teto quem tem
  participação acima do teto de concentração da política (padrão 10%).
- **RN-023** — Prazo médio de recebimento = soma de (prazo médio do cliente ×
  saldo utilizado) ÷ soma do saldo utilizado, entre os clientes com saldo;
  prazo médio simples = média dos prazos médios desses clientes.

## Testes

"Banco A" = massa de referência (só os clientes 6001 a 6010). "Banco B" = banco
A mais a massa dos outros módulos.

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001, RN-004 | Gerente, novembro, sem filtro: carteira 94.000, a vencer 70.000, vencido 24.000, > 90 dias 12.000, PDD 10.270, 8 clientes, 6 em atraso, fonte "atual" com a hora da última leitura (14/11 10:00) | regra de negócio |
| C-002, RN-015 | Total sem filtro: Ana e Sérgio 45.000/11.000; Carlos e Silvia 49.000/13.000; Gustavo, Diana e a administradora 94.000/24.000; Bruno: zero cliente em todos os blocos; Júlia (Jurídico), usuário sem vínculo e membro inativo: recusa ou nenhuma linha em todas as consultas; no banco B, Rita só os clientes que analisa, e em outubro (foto) nenhum cliente | regra de negócio |
| C-003, RN-017 | Gerente: Estética 4.000/4.000, 1 cliente; Pública 38.000/8.000; Privada 52.000/12.000; as três somam 94.000; BU Enfermagem 10.000/10.000; Enfermagem + Estética: 0 clientes, sem erro; "Todas": 8 clientes (6004 contado uma vez) | regra de negócio |
| C-004 | Gerente, outubro: carteira 98.000, vencido 28.000, PDD 5.720, fonte "foto", tirada em 01/11/2026 00:15 | regra de negócio |
| C-005, RN-005 | Relógio em 01/12/2026 00:10, leitura com sucesso e rodada seguinte da rotina: 11 linhas de novembro (9 com saldo + 6005 e 6009 zeradas), vencido 24.000, PDD 10.340, baixado 2.000; o sinal "foto pendente" some; nova rodada: continua 11 | regra de negócio |
| C-006 | Relógio em 01/12/2026 00:02, antes da leitura: 0 linhas de novembro e ponto de atenção "foto de 2026-11 pendente"; rotina da foto sem leitura com sucesso: nada grava. Relógio em 01/02/2027 sem leitura em janeiro: foto de janeiro gravada, 0 linhas de dezembro | regra de negócio |
| C-007, RN-006 | 6002 passa para Carlos: Ana novembro 40.000; Carlos novembro 54.000; Ana outubro 50.000/10.000; Carlos outubro 48.000/18.000 | regra de negócio |
| C-008 | Gustavo grava agosto 60.000/22.000/4.000/5.000: 1 fechamento, que aparece na lista com os quatro valores e sem foto, 1 registro de auditoria; evolução consolidada de agosto com fonte "manual", carteira 60.000, vencido 22.000; corrigido PDD 5.500: ainda 1 fechamento, auditoria antes 5000.00 depois 5500.00 | regra de negócio |
| C-009, RN-016 | Cinco recusas com motivo contendo "carteira", "90", "foto", "mês" e "permiss"; a gravação e a correção chamadas por fora da tela pelo supervisor não gravam; a lista de fechamentos não devolve nada ao supervisor nem à agente; após elas, 1 fechamento só (o de C-008) | regra de negócio |
| C-010 | Agosto com BU Nutrição: fonte "sem dado"; agosto para Ana: "sem dado"; para Gustavo sem filtro: "manual" | regra de negócio |
| C-011, RN-007, RN-008, RN-009 | Novembro: vencido inicial 28.000, gerada 3.000, recuperado 5.000 (fora: os 5.000 pagos em dia por 6001 e os 5.000 estornados de 6002), baixado 2.000, ajustes 2.000, vencido final 24.000, entraram 1, regularizados 1, baixados 1. Outubro: 25.000, gerada 9.000, recuperado 6.000, final 28.000, entraram 3. Setembro: sem gerada; depois de C-008, gerada 3.000 marcada estimada, só na visão consolidada | regra de negócio |
| C-012, RN-010 | Roll rate novembro: "a vencer" saldo 39.000, manteve 24.000, piorou 15.000; "1–30" 9.000, pagou 3.000, piorou 6.000; "31–60" 8.000, melhorou 3.000, piorou 5.000; "61–90" 38.000 piorou 38.000; "91–180" 4.000 piorou 4.000; data da base 01/11/2026 00:15 | regra de negócio |
| C-013, RN-012 | Banco B: por nível, clientes e saldo iguais ao que a concessão informa para o mesmo usuário e carteira; soma dos níveis = clientes com crédito aprovado visíveis; nenhum órgão público; até 4 maiores por nível, em ordem de saldo; índice = saudáveis ÷ classificados | regra de negócio |
| C-014 | Banco B, gerente: pedidos retidos ≥ 2, baixas aguardando ≥ 1, bloqueios não aplicados ≥ 2, limites vencidos ≥ 1, críticos ≥ 1, notas acima de 2 meses ≥ 1, cada um igual à conta feita registro a registro; ações atrasadas, promessas vencidas, jurídico, notas e certidões iguais ao resumo do módulo dono; sem "foto pendente"; nenhum sinal com quantidade 0 | regra de negócio |
| C-015, RN-020 | Banco A: inadimplência 25,53%, > 90 dias 12,77%, PDD 10,93%, recuperado ÷ gerado 166,67%, conversão 16,13%, exposição 94.000 de 176.300 (53,32%), atraso médio 86,79 dias. Banco B: decididas, aprovadas, recusadas, tempo médio, no prazo e concedido de novembro iguais à conta registro a registro; promessas avaliadas e cumpridas idem | regra de negócio |
| C-016 | Série de 2026 consolidada após C-008: jan–jul ausentes; ago manual 36,67%; set foto 46,30%; out foto 28,57%; nov atual 25,53%; dez ausente; média 34,27%; 0 de 4 na meta | regra de negócio |
| C-017, RN-011 | Novembro: Carlos cobrado 18.000, recebido 5.000, 4 clientes cobrados; Ana cobrado 13.000, recebido 0, 4 clientes; total 31.000 / 5.000; depois de Ana registrar 2 contatos (um com promessa) e Carlos 1: contatos 2 e 1, promessas 1 e 0 | regra de negócio |
| C-018, RN-018 | Concentração do vencido: maior cliente 6006 8.000 (33,33%); Grupo Alfa 7.000; Sudeste 12.000, Centro-Oeste 8.000, Sul 4.000; Nutrição 10.000, Enfermagem 10.000, Estética 4.000; 6 devedores na lista (limite 10), acumulado 100%; índice por cliente 2187,5 "moderada"; por região 3888,9 "alta" | regra de negócio |
| C-019 | Banco A: por carteira, utilizado e vencido 52.000/12.000, 4.000/4.000, 38.000/8.000; por BU 80.000/10.000 (5 clientes), 10.000/10.000 (3), 4.000/4.000 (1). Banco B: em análise, fora do prazo, aprovadas, recusadas e concedido por carteira iguais à conta registro a registro; com filtro de BU as decisões não mudam | regra de negócio |
| C-020 | Banco A: faixas somam 94.000 e 6006 não está em AA–E. Banco B: saldo por rating igual à conta registro a registro, com as escalas AA–E e P1–P4 separadas | regra de negócio |
| C-021 | Carlos 49.000/13.000, > 90 dias 12.000, 3 em atraso; Ana 45.000/11.000, 0 acima de 90, 3 em atraso; BU Nutrição 80.000/10.000, 2 em atraso, > 90 dias 8.000; Enfermagem 10.000/10.000, 3 em atraso | regra de negócio |
| C-022 | Plano 30 dias: 4 clientes, faturado nov 28.000, jun–nov 20.000/20.000/25.000/20.000/35.000/28.000 (soma 148.000), vencido 7.000, a vencer 36.000, 2 em atraso | regra de negócio |
| C-023 | Banco B, BU Nutrição: ações atrasadas, processos sem andamento e notas nos pontos de atenção iguais ao resumo de cada módulo para a mesma BU. Funil de novembro: as etapas do jurídico e do público na ordem da tela, cada uma com a quantidade e o valor do resumo do módulo; recebido no mês do público igual à conta nota a nota. Módulo ausente: o bloco responde "módulo não instalado" e os outros carregam | regra de negócio e regra de tela |
| C-024, RN-019 | Novembro, como Sérgio: 4 linhas; a dele 3 em atraso, vencido 11.000, recuperado 0. Como Silvia: 2 linhas; 3, 13.000, 5.000. Como Gustavo: 9 linhas; Gustavo e Diana 6, 24.000, 5.000. Como a administradora: 9 linhas. Como Ana: recusada. Banco B: análises em andamento e decididas da Rita somam na linha do Sérgio. Ações atrasadas somadas pela árvore | regra de negócio e regra de tela |
| C-025, RN-022 | Limites: total 186.300; 6006 80.000 (42,94%); Grupo Alfa 30.000 (16,10%); índice 2518,1 "alta"; acima de 10%: 6006, 6003, 6001 e Grupo Alfa | regra de negócio |
| C-026, RN-023 | Prazo médio de recebimento e prazo médio simples iguais à conta feita cliente a cliente sobre a posição do banco A | regra de negócio |
| RN-001 | 6004 na Estética com 1.000 em 1–30 e 3.000 em 31–60: faixa da linha "31–60"; total da faixa 1–30 = 4.000 | regra de negócio |
| RN-002 | Vencido 24.000 e carteira 94.000 → 25,53%; vencido 0 e carteira 0 → "—" | regra de tela |
| RN-003 | Com o percentual da faixa 31–60 em 20% só para a Estética: PDD da Estética 630 (era 330), total 10.570; foto de outubro continua 5.720 | regra de negócio |
| RN-013 | 25,53 com meta máx. 5 → fora; 8,67 com máx. 9 → na meta; 166,67 com mín. 80 → na meta; aprovação 66,67 entre 60 e 85 → na meta; 86 → fora; valor nulo → sem estado | regra de tela |
| RN-014 | 2187,5 → "moderada"; 1499 → "pulverizada"; 2500 → "alta" | regra de negócio |
| RN-021 | Última leitura 10:00: às 10:25 não atrasada; às 10:35 atrasada (35 > 30 min) | regra de negócio |

- Verificação manual:
  - [ ] RF-001 — meses futuros não aparecem no filtro; trocar o mês refaz os blocos abertos
  - [ ] RF-002 — entrar como Ana, Bruno, Sérgio e Gustavo e conferir a tabela de RN-015 (blocos que aparecem, linhas, estado vazio)
  - [ ] RF-003 — todo bloco mostra a fonte; mês corrente marcado "parcial" na evolução
  - [ ] RF-007 — barra verde dentro da meta, vermelha fora, com rótulo, e linha tracejada na meta, em tema claro e escuro
  - [ ] C-014 — avisos "dados do Winthor desatualizados" e "foto pendente" visíveis no topo
  - [ ] RNF-002 — tempo de resposta com massa de 20.000 clientes e 24 fotos

## Fora de escopo

- [ ] Telas operacionais (quadro da cobrança, agenda, esteira de crédito, processos, notas públicas) — são das specs 002 a 005; o painel só aponta números.
- [ ] Visão gerencial completa de cada módulo (os indicadores da cobrança, os 24 do jurídico, desempenho por analista, calibração do farol) — ficam nas specs donas; aqui só o resumo.
- [ ] Regra de saúde, de criticidade e de rating — são da concessão (004); o painel só conta.
- [ ] Mostradores de flexibilização, gatilhos de revisão e lista de limites vencidos — ficaram com a concessão (004). Agenda de contratos e alerta de certidão por documento — com o setor público (005). Tela de planos de pagamento — com a base (001).
- [ ] Projeção de inadimplência — é da cobrança (002).
- [ ] "Jurídico" como carteira do filtro — carteira é Privada, Estética ou Pública (D-05); o Jurídico aparece pelo resumo do módulo.
- [ ] Filtro por agente e por ramo de atividade — o recorte por pessoa é a visibilidade de quem abre.
- [ ] Crédito aprovado, recusado e concedido por BU — a solicitação é do cliente na carteira (D-01).
- [ ] Exportação para BI externo, planilha ou PDF do painel, e envio do painel por e-mail.
- [ ] Atualização automática periódica da tela — o painel recarrega quando a pessoa troca filtro ou abre um bloco.
- [ ] Fechamento manual por BU, carteira ou agente — o lançamento é da empresa inteira.
- [ ] Refazer, editar ou apagar foto de mês fechado; foto retroativa de meses anteriores ao início do sistema.
- [ ] Edição de metas e de percentuais de PDD — são parâmetros, editados na tela de parâmetros da 001.
- [ ] Comparativo com o mesmo mês do ano anterior.

## Pendências

Nenhuma bloqueia; cada uma segue o padrão adotado no contrato técnico.

- **P-10** — aging e PDD por título ou por cliente? Adotado: por título (era a NC-1). Por cliente, o PDD da massa seria 10.340 em vez de 10.270.
- **P-26** — quem fecha mês sem foto? Adotado: Gerente ou acima (e o Administrador).
- **P-09** — posição do órgão público pelo vencimento do título ou pelo prazo legal da nota? Adotado: vencimento do título; o prazo legal fica nas telas do setor público.
- **P-04** — analista e agente podem ser a mesma pessoa. O analista acessa o painel e vê os clientes cujas análises são dele (era a NC-3).
- **P-31** — quando a cobrança faz um acordo, a parcela paga em dia conta como recuperado? Adotado: não conta (era a NC-2); muda só o que entra no recuperado (RN-007).

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida
- [x] Cenários cobrem pelo menos um caminho de erro (C-002, C-006, C-009, C-010)
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta
- [x] Zero `[NEEDS CLARIFICATION]` em aberto — as três viraram pendências com padrão adotado
