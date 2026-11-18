# Spec: Jurídico (dossiê, processos, custos, acordos judiciais e carga inicial)

**ID:** 003-juridico · **Status:** em revisão (corrigida contra o contrato técnico, fase 0c) · **Data:** 2026-11-14

> Escrito para quem usa e para quem paga. Sem stack, tabela, endpoint ou
> componente: isso é assunto do `plan.md`.
>
> Escopo: o que acontece depois que a cobrança decide levar o cliente ao
> Jurídico, nas três carteiras (privada, Estética e pública). A régua que leva o
> cliente até lá e o cálculo de encargos são da `002-cobranca-privada`; o painel
> executivo que soma o Jurídico às outras carteiras é da `006-painel-consolidado`.

## Problema

O acompanhamento judicial da Benenutri vive numa planilha do escritório, com
cinco abas que se contradizem (o mesmo processo com dois números de autos, a
situação de cada parcela de acordo indicada pela **cor** da célula, o vínculo
com o cliente feito pelo nome digitado). O Financeiro monta o dossiê de cada
caso por e-mail, sem saber o que falta, e ninguém responde de imediato quantos
processos têm prazo vencido, quanto se gastou em custas por processo, quais
acordos têm parcela atrasada ou quais clientes já passaram do dia de ir ao
Jurídico sem dossiê montado. O artefato do gestor provou o modelo, mas guarda
tudo no navegador e casa processo e cliente por semelhança de nome: dois
hospitais com nome parecido viram o mesmo devedor.

## Resultado esperado

O caso chega ao Jurídico com o dossiê completo e conferido, o sistema passa a
ser a fonte única de cada processo (etapa, andamentos, prazos, custos, acordo e
recuperação), ligado ao cliente pelo código ou CNPJ, e a gestão enxerga numa
tela os desvios e os indicadores do judicial, sem abrir planilha.

## Usuários

| Perfil | O que precisa fazer | Frequência |
|---|---|---|
| Agente de cobrança | Abrir e montar o dossiê dos clientes da sua atribuição, anexar documentos; gerar a notificação extrajudicial e o demonstrativo; ver (sem alterar) os processos desses clientes | semanal |
| Supervisor | O mesmo do agente, para os seus clientes e os dos agentes abaixo dele | semanal |
| Gerente financeiro | Enviar o dossiê ao Jurídico; aprovar acordo judicial na alçada; cadastrar as filiais credoras; concluir a carga inicial; acompanhar custos, alertas e indicadores | diária |
| Diretoria | Acompanhar a visão gerencial; aprovar acordo judicial na alçada | mensal |
| Jurídico | Operar todos os processos: etapa, andamentos, prazos, custos, acordos, encerramento; fazer a carga inicial da planilha do escritório; validar o modelo da notificação | diária |
| Administrador | O mesmo acesso de operação do Jurídico, inclusive a carga inicial; como o Gerente financeiro, cadastrar as filiais credoras e concluir a carga inicial; ajustar os parâmetros do Jurídico | eventual |

O perfil Analista de crédito não acessa o módulo Jurídico.

## Cenários

Datas dos cenários: "hoje" é quinta-feira, 19/11/2026; 20/11/2026 (sexta) é
feriado nacional. A carteira de teste está descrita na seção **Testes**.

**C-001 — Abrir o dossiê com sugestão automática**
- **Dado que** a Iota Farma (carteira privada) está pronta para o Jurídico: R$ 33.000,00 vencidos há 52 dias, caso de cobrança na fase Extrajudicial e sem processo, título protestado, notificação extrajudicial emitida em 20/10/2026 e CNPJ e endereço no cadastro
- **Quando** a agente Ana abre o dossiê de cobrança jurídica da Iota a partir do caso de cobrança
- **Então** o sistema mostra os 11 documentos que valem para as carteiras privada e Estética (10 obrigatórios e 1 "se houver"), já com o demonstrativo, o histórico de cobrança e o protesto marcados como conferidos, a notificação e o cadastro como pendentes com a orientação do que anexar, e o progresso 3 de 10

**C-002 — O dossiê aberto já é o rascunho**
- **Dado que** Ana acabou de abrir o dossiê da Iota, incompleto
- **Quando** ela marca um documento, sai e volta
- **Então** o processo aparece na coluna "01 · Dossiê em montagem" com o valor de R$ 33.000,00 e a filial credora dos títulos vencidos (filial 1), a marcação continua lá, o caso de cobrança da Iota não muda de fase e o alerta "Cliente pronto para o Jurídico sem dossiê" deixa de existir para ela

**C-003 — Enviar o dossiê completo ao Jurídico**
- **Dado que** o dossiê da Comercial Atlas (R$ 30.000,00 vencidos há 38 dias) tem todos os documentos obrigatórios conferidos, exceto a aprovação do encaminhamento
- **Quando** o gerente Gustavo envia o dossiê ao Jurídico
- **Então** o processo vai para "02 · Recebido · contato amigável" com prazo em 27/11/2026 (5 dias úteis, pulando o feriado e o fim de semana), o item "Aprovação do encaminhamento ao Jurídico" fica conferido com o nome de Gustavo e a data, o caso de cobrança da Atlas passa para a fase "Cobrança judicial", e o primeiro andamento registra saldo vencido R$ 30.000,00, valor atualizado R$ 31.087,25 e 38 dias de atraso

**C-004 — Dossiê incompleto não sai (erro)**
- **Dado que** o dossiê da Atlas tem 7 de 10 itens conferidos, com a notificação extrajudicial e o cadastro do devedor pendentes
- **Quando** Gustavo tenta enviá-lo
- **Então** o sistema recusa e lista os dois documentos que faltam; o processo continua em "Dossiê em montagem"

**C-005 — Quem monta não necessariamente envia (erro)**
- **Dado que** o dossiê da Atlas está completo
- **Quando** a agente Ana tenta enviá-lo
- **Então** o sistema recusa e explica que o envio ao Jurídico exige Gerente financeiro ou acima; o dossiê continua salvo

**C-006 — "Não se aplica" exige justificativa (erro)**
- **Dado que** o cadastro do devedor da Atlas está pendente
- **Quando** Ana marca o item como "não se aplica" sem escrever o motivo
- **Então** o sistema recusa; com o motivo escrito, o item passa a contar no progresso

**C-007 — Carteira pública tem outro dossiê e não recebe notificação extrajudicial**
- **Dado que** o Fundo Municipal de Saúde de Luziânia é cliente do setor público, sem processo
- **Quando** o agente Carlos abre o dossiê dele e depois tenta gerar a notificação extrajudicial
- **Então** o dossiê mostra os 13 documentos da carteira pública (11 obrigatórios, entre eles ofícios e requerimento administrativo, e nenhum item de protesto ou notificação extrajudicial), e a notificação é recusada com a orientação de usar ofício e requerimento administrativo

**C-008 — Cliente que já tem dossiê ou processo ativo**
- **Dado que** a Iota já tem o dossiê aberto em C-001
- **Quando** Ana abre de novo o dossiê da Iota a partir da cobrança
- **Então** o sistema abre o mesmo processo, e nenhum segundo processo é criado

**C-009 — Regras de movimentação no card (erro)**
- **Dado que** o processo da Atlas está em "Dossiê em montagem" com 7 de 10, o do Hospital Delta está em "Custas e protocolo" sem número dos autos e o do Hospital Vale Verde está em "Citação"
- **Quando** a Júlia (Jurídico) usa "Mover para", dentro do card aberto, para levar a Atlas a "Petição inicial", o Delta a "Citação" e o Vale Verde a "Encerrado"
- **Então** as três movimentações são recusadas, cada uma com o seu motivo (enviar o dossiê primeiro; informar o número dos autos; encerrar pela ação "Encerrar processo", com o motivo); com o número dos autos no padrão do CNJ o Delta vai para "Citação", e em "Encerrar processo" com o motivo "quitado" o Vale Verde vai para "Encerrado" (sem motivo, é recusado); cada movimento fica no histórico de passagem do card. O cartão não se arrasta

**C-010 — Lista de processos em três grupos**
- **Dado que** a carteira de teste tem 9 processos ativos e 3 encerrados
- **Quando** o Jurídico abre a lista de processos
- **Então** vê "Em andamento" com 5 processos (R$ 320.000,00), "A ajuizar" com 4 (R$ 175.000,00) e "Encerrados" com 3 (R$ 42.000,00, visíveis só quando pede); filtrando a linha Galderma sobra 1, a filial 2 tem 3 ativos, a carteira pública 1 e a Estética 1

**C-011 — Andamento e prazo**
- **Dado que** o processo da Distribuidora Gama está sem andamento há 50 dias
- **Quando** a Júlia (Jurídico) registra "Penhora via SISBAJUD positiva" e define o próximo prazo para 21/11/2026
- **Então** o processo passa a 0 dias sem andamento, sai do alerta "Processo sem andamento", e o prazo aparece em vermelho "em 2 dias"; andamento sem texto é recusado, e o agente Bruno, que vê o processo, não consegue registrar andamento

**C-012 — Custos do processo**
- **Dado que** o Hospital Vale Verde (R$ 40.000,00) tem R$ 1.500,00 de custos
- **Quando** a Júlia tenta lançar um custo de R$ 0,00, depois lança "Honorários de êxito" de R$ 2.600,00 a pagar e anexa o comprovante da diligência de R$ 300,00
- **Então** o custo zero é recusado; o processo passa a R$ 4.100,00 de custo (10,25% do valor) e entra no alerta "Custo acima de 10% do valor"; a diligência vira paga; o total a pagar da carteira fica em R$ 2.600,00

**C-013 — Acordo judicial dentro da política**
- **Dado que** o processo da Eta Saúde está em "Defesa e instrução"
- **Quando** a Júlia registra acordo de R$ 30.000,00 com entrada de R$ 6.000,00 em 19/11/2026 e 5 parcelas
- **Então** o sistema gera a entrada e 5 parcelas mensais de R$ 4.800,00 (19/12/2026 a 19/04/2027), honorários de R$ 3.000,00, o acordo fica "em andamento" sem pedir aprovação, e o processo passa para "Acordo judicial"

**C-014 — Acordo que exige alçada (erro e aprovação)**
- **Dado que** a Júlia registrou acordo de R$ 70.000,00 no Hospital Delta, e o Gustavo registrou acordo de R$ 25.000,00 com entrada de 8% na Distribuidora Gama
- **Quando** a Júlia e o supervisor Sérgio tentam aprovar o do Delta, e o Gustavo tenta aprovar o da Gama
- **Então** as três aprovações são recusadas (Jurídico e Supervisor sem alçada; quem registrou não aprova); o Gustavo aprova o do Delta e a Diana (Diretoria) aprova o da Gama, e os dois passam de "aguardando aprovação" para "em andamento" com o nome de quem aprovou

**C-015 — Parcelas pagas quitam o acordo**
- **Dado que** o acordo da Eta Saúde (C-013) tem 6 parcelas em aberto
- **Quando** a Júlia marca as 6 como pagas, cada uma com a data do pagamento
- **Então** ao marcar a última o acordo fica quitado e o processo vai para "Encerrado" com motivo "acordo cumprido", a nota "Acordo quitado: todas as parcelas pagas." fica no histórico do card e o valor recuperado do processo é R$ 30.000,00

**C-016 — Alertas de desvio**
- **Dado que** a carteira de teste tem um caso de cada um dos 13 desvios
- **Quando** a gerência abre "Alertas de desvios"
- **Então** vê 13 alertas, os 4 críticos primeiro (prazo vencido há 9 dias, parcela de acordo vencida, acordo acima de R$ 50 mil sem aprovação, cliente pronto para o Jurídico sem dossiê), cada um com o detalhe e a ação sugerida; o filtro por tipo reduz a lista, e a linha do cliente sem dossiê abre o dossiê

**C-017 — Visão gerencial**
- **Dado que** a carteira de teste
- **Quando** a gerência abre a visão gerencial
- **Então** vê, entre os 24 indicadores: 5 processos em andamento (R$ 320.000,00, ticket médio R$ 64.000,00), 4 a ajuizar (em atenção, acima de 40% dos ativos), recuperado R$ 30.000,00, taxa de recuperação 5,6% (ruim), custo total R$ 4.500,00, custo ÷ valor 0,9% (bom), retorno 6,7 vezes, 48 dias médios sem andamento (atenção) e taxa de êxito 66,7% (atenção); e o resumo diz que os 3 maiores processos concentram 58,6% do valor

**C-018 — Notificação extrajudicial**
- **Dado que** a Atlas tem dois títulos vencidos (R$ 18.000,00 há 38 dias e R$ 12.000,00 há 30 dias), a filial credora 1 está cadastrada com razão social e CNPJ e o modelo da notificação está validado pelo Jurídico
- **Quando** a agente Ana gera a notificação em 19/11/2026
- **Então** o documento vem preenchido com a notificante (razão social e CNPJ da filial 1), a notificada, a tabela dos 2 títulos, principal R$ 30.000,00, multa R$ 600,00, juros R$ 348,00, correção R$ 139,25 e total R$ 31.087,25, as 5 cláusulas e o prazo de 15 dias corridos; a emissão fica registrada com prazo até 04/12/2026 e anotada no card do processo da Atlas
- **E quando** o modelo não está validado, ou a filial credora não tem razão social e CNPJ cadastrados
- **Então** a notificação é recusada, dizendo o que falta

**C-019 — Demonstrativo do débito**
- **Dado que** a Iota tem dois títulos vencidos (R$ 20.000,00 há 52 dias e R$ 13.000,00 há 40 dias)
- **Quando** alguém gera o demonstrativo atualizado do débito
- **Então** o documento mostra os 2 títulos, cada um com seus dias de atraso, e a composição principal R$ 33.000,00, multa (2%) R$ 660,00, juros de mora (1% ao mês, pro rata por título) R$ 520,00, correção monetária (0,4% ao mês) R$ 208,25 e total R$ 34.388,25, os mesmos valores que a cobrança calcula para a Iota na mesma data

**C-020 — Carga inicial da planilha do escritório: prévia e aplicação**
- **Dado que** a planilha de teste tem as 5 abas, com 5 processos distintos espalhados entre elas
- **Quando** a Júlia (Jurídico) carrega a planilha
- **Então** a prévia mostra 5 processos (1 em citação, 2 em petição inicial, 1 em acordo, 1 encerrado), 3 vinculados pelo código do cliente, 1 com sugestão de cliente pelo nome aguardando confirmação, 1 sem cliente, 1 com divergência entre abas e 1 parcela com situação a confirmar
- **E quando** aplica
- **Então** os 5 processos entram com seus andamentos e o acordo; o relatório de pendências ganha 4 itens; aplicar a mesma planilha de novo não cria nenhum processo; o supervisor Sérgio não consegue "concluir a carga"; depois de a administradora Nara concluí-la, nova carga é recusada

**C-021 — Situação da parcela não vem da cor**
- **Dado que** na aba de acordos da planilha uma parcela está pintada de amarelo, cor que não é a de "quitado" nem a de "pendente" na legenda
- **Quando** a carga é aplicada
- **Então** essa parcela entra como "a confirmar" e aparece no relatório de pendências; as parcelas verde e laranja entram como "paga" e "aberta", marcadas como vindas da cor da planilha; depois da carga, a situação de toda parcela é escolhida explicitamente

**C-022 — Cada perfil vê o que lhe cabe**
- **Dado que** a Ana cuida da Atlas, do Vale Verde, da Nova Era e da Iota, o Bruno de outros oito clientes com processo e o Carlos da Secretaria de Saúde de Mu
- **Quando** cada um abre o Jurídico
- **Então** Ana vê 3 processos, Bruno 8, Carlos 1, o supervisor Sérgio (acima de Ana e Bruno) 11, a supervisora Silvia (acima de Carlos) 1, e Júlia, Gustavo, Diana e a administradora Nara veem os 12; Ana e Bruno não movem etapa, não lançam custo nem andamento

**C-023 — Vínculo pelo código ou CNPJ, nunca pelo nome (erro e correção)**
- **Dado que** existem os clientes "Hospital Santa Maria Ltda" e "Hospital Santa Maria do Sul Ltda" (CNPJ 30.160.000/0001-30)
- **Quando** a planilha traz o devedor "Hospital Santa Maria" sem código
- **Então** a prévia mostra os dois clientes como candidatos e não vincula nenhum; na ficha, o Jurídico vincula pelo CNPJ 30.160.000/0001-30 e o processo passa a ser do Hospital Santa Maria do Sul; código inexistente é recusado

**C-024 — Limiar é parâmetro**
- **Dado que** a meta de custo é 10% e a Distribuidora Gama tem custo de 12% do valor
- **Quando** o Administrador muda a meta para 15%
- **Então** a Gama sai do alerta "Custo acima da meta" e o alerta passa a citar 15%, sem nenhuma mudança no sistema

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | O sistema DEVE abrir o dossiê de cobrança jurídica a partir do caso de cobrança (ação "Montar dossiê") ou de um cliente localizado por código ou CNPJ/CPF, com o checklist da carteira do caso | Privada e Estética: 11 itens (10 obrigatórios); pública: 13 itens (11 obrigatórios) (C-001, C-007) | must |
| RF-002 | O sistema DEVE pré-marcar o checklist com a sugestão automática (RN-003) | C-001: 3 de 10 conferidos e 2 pendentes com orientação, sem ninguém marcar | must |
| RF-003 | O sistema DEVE permitir marcar cada item como pendente, conferido ou "não se aplica", com observação e anexos | "Não se aplica" sem motivo é recusado (C-006); anexo de PDF, PNG, JPG, XLSX ou DOCX até 20 MB marca o item como conferido | must |
| RF-004 | O sistema DEVE mostrar o progresso do dossiê (conferidos de obrigatórios) no dossiê, no cartão (enquanto o processo está em Dossiê ou Recebido) e na ficha | Cartão da Atlas mostra "Dossiê 7 de 10"; completo aparece destacado | must |
| RF-005 | O sistema DEVE manter o dossiê como rascunho desde a abertura: abrir cria o processo na etapa Dossiê em montagem e cada marcação é gravada na hora, sem mexer no caso de cobrança | C-002 | must |
| RF-006 | O sistema DEVE enviar o dossiê ao Jurídico só se completo e por quem tem a alçada de envio, aplicando os efeitos de RN-004 e RN-005 | C-003, C-004, C-005 | must |
| RF-007 | O sistema NÃO DEVE criar um segundo processo ativo para o mesmo cliente a partir da cobrança | C-008: abrir o dossiê de cliente com processo ativo abre o existente | must |
| RF-008 | O sistema DEVE mostrar os processos num quadro de 11 etapas, numeradas, com a quantidade e o texto "o que acontece" e "saída" de cada etapa; a soma do valor por etapa aparece nos indicadores por etapa da visão gerencial | Quadro com as 11 colunas na ordem de RN-008; a coluna Recebido mostra 2 cartões; indicadores por etapa: Recebido 2 · R$ 65.000,00 | must |
| RF-009 | O cartão DEVE mostrar devedor e nº dos autos (ou "sem autos"), responsável, prazo, valor, carteira, filial, BU, linha, tribunal e situação atual; o progresso do dossiê nas etapas Dossiê e Recebido, o custo e sua razão sobre o valor nas etapas ajuizadas, as parcelas pagas do acordo na etapa Acordo; e os sinais "Custo a pagar", "Carga a conferir" e "Substabelecer". Prazo vencido e dias sem andamento aparecem pelo prazo e pelo tempo do cartão; parcela vencida, saldo na cobrança e cliente regularizado aparecem no card aberto e nos alertas | Cartão da Clínica Nova Era mostra "Acordo 0 de 5" e a linha Galderma | must |
| RF-010 | O quadro DEVE poder ser ordenado por prazo (mais próximo primeiro); a lista ordena por prazo e depois por valor decrescente | Lista, grupo A ajuizar: Secretaria de Saúde de Mu (prazo 24/11) antes de Hospital Delta (sem prazo, R$ 80.000,00) e de Teta (sem prazo, R$ 15.000,00) | should |
| RF-011 | O sistema DEVE mover o processo de etapa por "Mover para", dentro do card aberto, aplicando as regras de RN-009; o cartão não se arrasta | C-009 | must |
| RF-012 | O sistema DEVE oferecer a lista de processos em três grupos (em andamento, a ajuizar, encerrados) com cliente, carteira e BU, filial, nº dos autos, tribunal, valor, custo, etapa, último andamento e prazo | C-010 | must |
| RF-013 | O sistema DEVE filtrar quadro e lista por busca (cliente, nº dos autos, código, situação, tribunal, responsável), BU, carteira (privada, Estética, pública), linha (Galderma × demais), filial, responsável e etapa | C-010; filtros combináveis; quadro e lista com os mesmos filtros mostram o mesmo conjunto | must |
| RF-014 | O sistema DEVE mostrar, a quem opera ou gere o Jurídico, 6 números no topo dos processos: em andamento, a ajuizar (com clientes prontos para o Jurídico sem dossiê), em citação, cumprimento e execução, acordos a receber (com parcelas vencidas; ao lado, à parte, os acordos aguardando aprovação) e prazos vencidos ou em 7 dias. A receber conta só acordo em andamento (aprovado); aguardando aprovação não soma (D-08) | Carteira de teste: 5 · R$ 320 mil; 4 · R$ 175 mil (1 sem dossiê); 1; 1; R$ 0 a receber (0 acordo · 0 parcela vencida) e 1 aguardando aprovação · R$ 60 mil; 2 | must |
| RF-015 | O sistema DEVE ter ficha do processo com cliente vinculado e sua posição na cobrança, e permitir ao Jurídico editar nº dos autos, tribunal, filial, responsável, valor, linha, prazo e sua descrição, substabelecimento pendente, forma de citação, resultado da sentença, valor recuperado informado e observações | Toda alteração aparece na auditoria com valor antes e depois; nº dos autos fora do padrão CNJ é recusado (RN-012) | must |
| RF-016 | O sistema DEVE permitir ao Jurídico cadastrar processo novo diretamente ("Novo processo"), com o cliente localizado por código ou CNPJ/CPF | Processo sem cliente não salva fora da carga inicial | must |
| RF-017 | O sistema DEVE vincular processo e cliente só por código do cliente ou CNPJ/CPF, e permitir corrigir o vínculo na ficha | C-023 | must |
| RF-018 | O sistema DEVE registrar andamentos com data, autor e texto, do mais recente ao mais antigo, e gerar sozinho o andamento do envio do dossiê; mudança de etapa, acordo, notificação e encerramento ficam no histórico do card (passagens e notas) | C-011; nenhum andamento se edita ou se apaga (RN-010) | must |
| RF-019 | O sistema DEVE exportar a lista de processos filtrada em planilha (CSV) | Colunas: cliente, código, carteira, linha, filial, nº dos autos, tribunal, valor, etapa, situação atual, prazo, responsável, dossiê, acordo, parcelas pagas, a receber do acordo | should |
| RF-020 | O sistema DEVE lançar custos de processo com tipo (12), data, valor, observação, situação (pago ou a pagar), guia e comprovante, e permitir marcar pago e remover | C-012; remoção fica na auditoria | must |
| RF-021 | O sistema DEVE ter a visão "Custos dos processos": custo total, no mês, a pagar, custo ÷ valor, retorno sobre o custo, custo médio, documentação; evolução dos últimos 12 meses por grupo; composição por grupo; 10 maiores; custo × recuperado; por tipo, filial, BU e etapa; custos a pagar (destacando os de mais de 15 dias); pagos sem comprovante; tabela por processo | Carteira de teste: total R$ 4.500, no mês R$ 1.200, a pagar R$ 300 (1 há mais de 15 dias), documentação 66,7% | must (números) / should (gráficos) |
| RF-022 | O sistema DEVE mostrar o custo ÷ valor de cada processo e destacar os acima da meta | Gama: 12,0% destacado; Vale Verde: 3,8% sem destaque | must |
| RF-023 | O sistema DEVE calcular o valor recuperado de cada processo pela RN-015 | Carteira de teste: R$ 30.000 no total | must |
| RF-024 | O sistema DEVE registrar acordo judicial com valor, entrada, nº de parcelas e vencimento da entrada, gerando parcelas e honorários (RN-017, RN-018) | C-013 | must |
| RF-025 | O sistema DEVE exigir aprovação, na alçada e por pessoa diferente de quem registrou, do acordo fora da política ou acima do valor de alçada (RN-019) | C-014 | must |
| RF-026 | O sistema DEVE registrar a situação de cada parcela de forma explícita (aberta, paga com data; "a confirmar" só nasce na carga) e se os honorários foram pagos | C-015, C-021 | must |
| RF-027 | O sistema DEVE ter a visão "Acordos judiciais": acordos com valor, entrada, parcelas pagas/total, a receber, vencidas, próximo vencimento, honorários e aprovação | Carteira de teste: 2 acordos (Clínica Nova Era aguardando aprovação, Kappa quitado); a receber R$ 0 e aguardando aprovação R$ 60.000 (D-08) | must |
| RF-028 | O sistema DEVE apontar os 13 desvios de RN-022 com severidade, detalhe e ação sugerida, críticos primeiro, filtráveis por tipo, abrindo o processo (ou o dossiê) ao clicar | C-016 | must |
| RF-029 | O sistema DEVE mostrar contadores nas abas: prazos vencidos (Processos), acordos com parcela vencida (Acordos), custas sem lançamento (Custos), desvios críticos (Alertas) | Carteira de teste: 1, 1, 1, 4 | must |
| RF-030 | O sistema DEVE calcular os 24 indicadores de RN-023 com a cor de cada um pelos limiares em parâmetro | C-017 | must |
| RF-031 | A visão gerencial DEVE ter os gráficos por etapa, filial, carteira e linha, tribunal, faixa de valor e ano de ajuizamento, os 10 maiores processos ativos, os indicadores por etapa e o resumo em texto | Faixas da carteira de teste: até 10 mil 0; 10–50 mil 5; 50–100 mil 3; acima de 100 mil 1 | should |
| RF-032 | O sistema DEVE gerar a notificação extrajudicial (só carteiras privada e Estética) com conferência das partes, do débito e da assinatura antes da emissão, registrar a emissão e, se pedido, enviá-la por e-mail ao contato do cliente | C-018 | must |
| RF-033 | O sistema DEVE gerar o demonstrativo atualizado do débito de um cliente | C-019 | must |
| RF-034 | O Gerente financeiro (ou acima, ou o Administrador) DEVE cadastrar, por filial credora (a filial do Winthor em nome da qual se cobra), razão social, CNPJ, endereço da sede, cidade/UF da assinatura, dados de pagamento e o representante que assina, com o cargo | Filial 1 cadastrada pelo Gustavo aparece como notificante em C-018; o Jurídico é recusado ao tentar salvar | must |
| RF-035 | O Jurídico (ou Gerente, Diretoria, Administrador) DEVE carregar uma vez a planilha do escritório (5 abas) com prévia antes de gravar | C-020 | must |
| RF-036 | A carga DEVE vincular o cliente pelo código; nome só gera sugestão, que alguém confirma | C-020, C-023 | must |
| RF-037 | A carga DEVE gerar o relatório de pendências (sem cliente, sugestão a confirmar, divergência entre abas, parcela a confirmar) e permitir marcar cada pendência como conferida | C-020; pendência conferida sai do relatório e do alerta "Divergência na carga" | must |
| RF-038 | A carga DEVE poder ser reaplicada sem duplicar e ser encerrada de vez ("concluir carga") por Gerente financeiro ou acima, ou pelo Administrador | C-020 | must |
| RF-039 | O sistema DEVE aplicar a visibilidade e as permissões de RN-030 em toda tela e toda gravação | C-022 | must |
| RF-040 | Toda gravação deste módulo DEVE ficar na auditoria (quem, quando, o quê, antes e depois) | Auditoria do processo da Atlas após C-003 mostra o envio do dossiê e o prazo vazio → 27/11/2026, por Gustavo; a passagem Dossiê → Recebido está no histórico do card | must |

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | Quadro e lista respondem em até 2 s com 2.000 processos e 20.000 andamentos | cronômetro, massa de teste gerada |
| RNF-002 | Alertas e visão gerencial respondem em até 5 s com 2.000 processos | cronômetro, mesma massa |
| RNF-003 | A carga inicial de 500 processos (prévia + aplicação) termina em até 60 min, com progresso visível, usando no máximo metade da capacidade de execuções da plataforma, sem deixar o sistema lento para os demais usuários | cronômetro com planilha de 500 linhas; outro usuário navegando ao mesmo tempo |
| RNF-004 | Notificação e demonstrativo saem em até 3 s | cronômetro |
| RNF-005 | Datas, prazos e "hoje" seguem o fuso de Brasília | processo enviado às 23h30 de 19/11 tem envio em 19/11 |
| RNF-006 | O endereço dos documentos do dossiê e dos comprovantes de custo só é entregue a quem vê o processo (o arquivo em si fica em endereço público: pendência P-25, risco aceito) | agente de outra atribuição não abre a ficha nem o card da Atlas e não recebe o endereço dos anexos |

## Entidades do domínio

- **Processo jurídico** — o caso de um devedor no Jurídico, do dossiê ao
  encerramento. Pertence a um **Cliente** (vinculado por código ou CNPJ/CPF);
  só um processo vindo da carga inicial pode existir sem cliente, como
  pendência. Tem etapa, carteira (privada, Estética ou pública: a do caso de
  cobrança de origem), valor em cobrança, valor atualizado na data do envio,
  nº dos autos, tribunal, filial credora, responsável no Jurídico, linha
  (Galderma ou demais), prazo, situação atual e, quando encerrado, o motivo.
  O setor vem do cliente; a BU é informativa (a de maior saldo vencido do
  cliente quando o processo nasce), porque a BU é do item comprado, não do cliente.
- **Dossiê** — o checklist de documentos de um processo. Cada **item** é um
  dos 17 documentos do catálogo, com situação, observação e anexos.
- **Andamento** — fato do processo: data, autor e texto. É escrito por alguém,
  vem da carga, ou é o registro do envio do dossiê. Mudança de etapa, acordo,
  notificação e encerramento não são andamento: ficam no histórico do card.
- **Custo** — despesa do processo: tipo (um de 12, cada um de um dos 4 grupos),
  data, valor, situação pago/a pagar, guia e comprovante.
- **Acordo judicial** — acordo homologado ou proposto num processo (um por
  processo): valor, entrada, parcelas, honorários, quem registrou e, quando
  exigido, quem aprovou. Tem **parcelas**, cada uma com número (0 = entrada),
  valor, vencimento e situação.
- **Notificação extrajudicial** — emissão do documento para um cliente: data,
  prazo final, valores e filial notificante. Relaciona-se com o processo do
  cliente, se houver.
- **Filial credora** — a filial do Winthor em nome da qual se cobra: código,
  razão social, CNPJ, endereço, cidade e UF, dados de pagamento e representante.
- **Carga inicial** — a leitura única da planilha do escritório; deixa, em cada
  processo que criou, a origem e as pendências a conferir.
- **Alerta de desvio** e **Indicador** — calculados na hora a partir dos
  processos; nada é digitado.
- Usa de outras specs: **Cliente**, **Posição do cliente**, **Membro da
  equipe**, **Parâmetro**, **Feriado**, **Modelo de mensagem**, **Envio de
  e-mail** e **Auditoria** (001); **Caso de cobrança**, **Encargos** e
  **Baixa como perda** (002); **Nota fiscal de órgão**, **Certidão** e
  **Análise do órgão** (005, só nas sugestões do dossiê público).

## Regras de negócio

- **RN-001** — O catálogo do dossiê tem 17 documentos (lista do estudo, E §1.5).
  Valem para um processo os de "ambos" mais os da carteira. Privada e Estética:
  10 obrigatórios (notas fiscais, comprovantes de entrega, pedido/contrato,
  boletos e posição dos títulos, protesto e negativação, notificação
  extrajudicial, demonstrativo, histórico de cobrança, cadastro do devedor,
  aprovação do encaminhamento) e 1 "se houver" (garantias). Pública: 11
  obrigatórios (notas fiscais, entrega, contrato administrativo ou ata, empenho,
  protocolo e atesto, ofícios e requerimento administrativo, certidões da
  Benenutri, demonstrativo, histórico, cadastro, aprovação) e 2 "se houver"
  (resposta à LAI, garantias).
- **RN-002** — Item obrigatório conta como cumprido quando está conferido, ou
  "não se aplica" com motivo escrito. "Não se aplica" sem motivo não se salva.
  Anexar arquivo a um item o marca como conferido (observação "Anexo: nome do
  arquivo", se não havia outra).
- **RN-003** — Sugestão automática ao abrir o dossiê: demonstrativo conferido
  ("gerado pelo sistema"); histórico de cobrança conferido; na privada e na
  Estética, protesto conferido se o título foi protestado pela régua;
  notificação pendente com "Notificação gerada em dd/mm/aaaa; anexar o
  comprovante de recebimento" se houver emissão registrada; cadastro pendente
  com "CNPJ e endereço no cadastro; anexar contrato social e QSA" se o cliente
  tem os dois. Os demais itens recebem só a orientação do que o sistema já sabe
  (títulos vencidos; garantia do último acordo; na pública, notas fiscais,
  empenhos, protocolos, contrato e certidões, quando o módulo do setor público
  estiver instalado), mostrada quando a pessoa pede "Ver sugestões do sistema"
  no dossiê. Sugestão não sobrescreve item que alguém já marcou.
- **RN-004** — Enviar ao Jurídico exige todos os obrigatórios cumpridos, exceto
  "Aprovação do encaminhamento", e cargo com nível de alçada maior ou igual ao
  parâmetro (padrão: Gerente financeiro, nível 3). O próprio envio cumpre a
  aprovação, com nome de quem enviou e data. Efeitos: etapa Recebido; situação
  "Dossiê recebido pelo Jurídico: conferência e contato amigável"; valor =
  saldo vencido do cliente na carteira e valor atualizado = total com encargos
  da cobrança na data; caso de cobrança do cliente na fase Cobrança judicial;
  andamento com saldo, atualizado e dias de atraso. O dossiê em montagem não
  mexe no caso de cobrança: é o envio que o move (decisão P-07, dossiê primeiro).
  Repetir o envio não duplica nada.
- **RN-005** — Prazo inicial do processo enviado = data do envio + N dias úteis
  (parâmetro, padrão 5), pulando sábado, domingo e feriados nacionais e da UF
  da filial credora.
- **RN-006** — Carteira pública não tem notificação extrajudicial: não há o item
  no checklist e a emissão é recusada, com a orientação de usar ofício e
  requerimento administrativo.
- **RN-007** — Abrir o dossiê pela cobrança de cliente que já tem processo
  ativo (qualquer etapa menos Encerrado) abre esse processo. O Jurídico pode
  cadastrar outro processo para o mesmo cliente à mão (RF-016), e a carga pode
  trazer mais de um. Processo cadastrado à mão, vindo da carga ou vinculado
  depois a um cliente leva o caso de cobrança aberto do cliente na mesma
  carteira para a fase Cobrança judicial na rodada seguinte da rotina da
  cobrança.
- **RN-008** — As 11 etapas, nesta ordem: 01 Dossiê em montagem · 02 Recebido ·
  contato amigável · 03 Petição inicial · 04 Custas e protocolo · 05 Citação ·
  06 Defesa e instrução · 07 Sentença e recursos · 08 Cumprimento e execução ·
  09 Acordo judicial · 10 Suspenso · RJ · arquivado · Encerrado. As 4 primeiras
  são pré-ajuizamento. Ativo = qualquer etapa menos Encerrado. "Em andamento" =
  ativo **com** nº dos autos; "A ajuizar" = ativo **sem** nº dos autos;
  "Encerrados" à parte. O grupo depende do nº dos autos, não da etapa.
- **RN-009** — Movimentação, sempre por "Mover para" no card aberto e só por
  Jurídico, Gerente, Diretoria ou Administrador: (a) de Dossiê para qualquer
  etapa que não seja Encerrado, só pelo envio (RN-004), e nenhum processo volta
  para Dossiê; (b) Citação, Defesa, Sentença e Execução exigem nº dos autos
  registrado (é a saída da etapa Custas e protocolo); (c) Encerrado só pela
  ação "Encerrar processo", com motivo: quitado, acordo cumprido (exige o
  acordo quitado), baixa como perda, extinto sem recuperação ou outro (com
  texto); processo encerrado não volta; (d) toda mudança fica no histórico de
  passagem do card, com quem moveu e quando. Encerrar como baixa como perda
  sem baixa aprovada na cobrança é aceito, com aviso a quem encerra e registro
  no card (pendência P-43). A carga inicial não passa por (a) a (c) e deixa as
  inconsistências como pendência.
- **RN-010** — Andamento tem texto obrigatório e não se edita nem se apaga;
  correção é andamento novo. "Dias sem andamento" = hoje − data do andamento
  mais recente; mudança de etapa não conta como andamento. Na carga, andamento
  com dia e mês sem ano recebe o ano da carga, ou o anterior se a data ficaria
  no futuro; andamento sem data nenhuma recebe a data da carga.
- **RN-011** — Processo e cliente se ligam pelo código do cliente no Winthor ou
  pelo CNPJ/CPF (com ou sem pontuação). Semelhança de nome nunca vincula: só
  sugere, e só na carga inicial (RN-027). O setor do processo é o do cliente
  vinculado; a carteira é a do caso de cobrança de origem (no cadastro manual e
  na carga, a informada); a BU é a de maior saldo vencido do cliente no momento
  do vínculo. Processo da carga sem cliente usa o setor e a linha da planilha
  até ser vinculado.
- **RN-012** — Nº dos autos no padrão CNJ: `NNNNNNN-DD.AAAA.J.TR.OOOO` (20
  dígitos). O ano do ajuizamento é o `AAAA`.
- **RN-013** — Custos: os 12 tipos e seus grupos — *Custas processuais*:
  custas iniciais, custas de citação e postais, edital, recursos e preparo;
  *Honorários*: honorários advocatícios contratuais, honorários de êxito;
  *Diligências e pesquisas*: diligência e oficial de justiça, locomoção,
  pesquisas (SISBAJUD, RENAJUD, INFOJUD, endereço); *Outros*: perícia, cartório
  e protesto, outros. Valor maior que zero. Comprovante anexado marca o custo
  como pago. Guia é esperada nos grupos Custas processuais e Diligências.
- **RN-014** — Custo ÷ valor = soma dos custos do processo ÷ valor do
  processo. Acima da meta (parâmetro, padrão 10%) gera alerta em processo
  ativo; na visão gerencial, verde até o limite bom (padrão 5%).
- **RN-015** — Valor recuperado do processo: o valor informado na ficha, se
  houver; senão, a soma das parcelas de acordo pagas; senão, o valor do
  processo se encerrado com motivo "quitado"; senão, zero.
- **RN-016** — Taxa de recuperação = recuperado ÷ valor em cobrança, os dois
  sobre os mesmos processos: todos os do recorte, ativos e encerrados
  (pendência P-44; o artefato dividia pelo valor só dos ativos).
- **RN-017** — Parcelas do acordo: resto = valor − entrada; cada parcela =
  resto ÷ nº de parcelas truncado nos centavos, e a última absorve a diferença.
  Entrada (se maior que zero) é a parcela 0, no vencimento informado; a
  parcela *i* vence *i* meses depois, no mesmo dia ou no último dia do mês
  quando o dia não existe.
- **RN-018** — Honorários do acordo = percentual (parâmetro, padrão 10%) do
  valor do acordo, com marcação de pagos.
- **RN-019** — Política de acordo (parâmetros): entrada mínima 20% do valor,
  no máximo 5 parcelas além da entrada, valor de alçada R$ 50.000,00. Acordo
  dentro dos três limites nasce "em andamento". Fora de qualquer um nasce
  "aguardando aprovação", aprovável só por cargo com nível ≥ parâmetro (padrão
  Gerente financeiro) e por pessoa diferente de quem registrou. Aprovação
  negada fica registrada no card e o acordo passa a "recusado": fica como
  histórico e o processo pode registrar outro acordo. Cada processo tem no
  máximo um acordo aguardando aprovação ou em andamento.
- **RN-020** — A situação da parcela é sempre explícita: aberta ou paga (com
  data de pagamento não futura); "a confirmar" só nasce na carga e é resolvida
  para uma das duas. Vencida = aberta com vencimento anterior a hoje. Quando a
  última parcela em aberto é paga, o acordo fica quitado e o processo é
  encerrado com o motivo "acordo cumprido".
- **RN-021** — Prazo do processo: vencido ou em até 3 dias em vermelho, em até
  7 dias em amarelo, depois neutro (limiares em parâmetro); texto "Prazo hoje",
  "em N dias" ou "vencido há N dias".
- **RN-022** — Os 13 desvios (limiares em parâmetro, padrão entre parênteses):

  | Desvio | Quando | Severidade |
  |---|---|---|
  | Prazo processual vencido | ativo com prazo anterior a hoje | crítico se vencido há mais de 7 dias; senão atenção |
  | Parcela de acordo vencida | acordo não quitado nem recusado com parcela vencida | crítico |
  | Acordo fora da política | acordo não quitado, aguardando aprovação | crítico se acima do valor de alçada; senão atenção |
  | Processo sem andamento | ativo, fora de Dossiê e Suspenso, sem andamento há mais de 30 dias | crítico acima de 60 dias; senão atenção |
  | Custo acima da meta | ativo com custo ÷ valor acima da meta (10%) | atenção |
  | Custas sem lançamento | na etapa Custas e protocolo sem custo do grupo Custas processuais | atenção |
  | Divergência na carga | pendência da carga inicial não conferida | atenção |
  | Substabelecimento pendente | ativo com substabelecimento marcado | atenção |
  | Suspenso ou em recuperação judicial | etapa Suspenso | atenção |
  | Dossiê incompleto há mais de 10 dias | em Dossiê, aberto há mais de 10 dias | atenção |
  | Encerrado com saldo na cobrança | encerrado como quitado ou acordo cumprido, cliente com saldo vencido | atenção |
  | Processo ativo com cliente regularizado | ativo, cliente vinculado com saldo vencido zero | atenção |
  | Cliente pronto para o Jurídico sem dossiê | caso de cobrança aberto da carteira privada ou Estética, com atraso igual ou maior que o dia de ir ao Jurídico da régua (45), sem processo ativo | crítico |

  A ação sugerida de cada um é a do estudo (E §4.5). "Custas sem lançamento"
  deixa de ser busca por palavra no texto, como no artefato. O último desvio
  mudou com a decisão do dossiê primeiro: a cobrança só entra na fase Cobrança
  judicial pelo envio do dossiê, então o desvio passa a olhar quem já devia
  ter dossiê e não tem.
- **RN-023** — Os 24 indicadores (fórmulas do estudo, E §4.7), calculados
  sobre o recorte filtrado; "ativos", "em andamento" e "a ajuizar" conforme
  RN-008. Limiares em parâmetro (padrão): 03 a ajuizar em atenção acima de 40%
  dos ativos; 06 taxa de recuperação (RN-016) boa ≥ 30%, ruim ≤ 10%; 08 e 13
  ruins se maior que zero; 10 custo ÷ valor bom ≤ 5%, ruim ≥ 10%; 11 retorno
  bom ≥ 3, ruim ≤ 1; 14 e 15 em atenção se maior que zero; 16 ruim se maior
  que zero; 17 dias médios sem andamento bom ≤ 30, ruim ≥ 60; 18 parados há
  mais de 30 dias bom ≤ 20%, ruim ≥ 50%; 22 taxa de êxito boa ≥ 70%, ruim ≤
  40%; 23 citação por edital ou curador boa ≤ 15%, ruim ≥ 30%. O 19 repete o
  13 no bloco de prazos, como no artefato. O 20 (idade média) = média de (ano
  atual − ano dos autos + 0,5) dos processos em andamento. O 21 (taxa de
  acordo) = processos ajuizados com acordo ÷ processos ajuizados, ativos e
  encerrados. O 23 e o 24 usam a forma de citação e o resultado da sentença
  registrados na ficha, não busca por palavra.
- **RN-024** — Notificação extrajudicial: título, notificante, notificado (CNPJ
  se o documento tem mais de 11 dígitos, senão CPF), assunto, referência
  (cliente nº e filial credora), 5 cláusulas (1 do débito, com a tabela de
  títulos; 2 da constituição em mora e do prazo; 3 da forma de pagamento e do
  contato; 4 das medidas judiciais; 5 da solução amigável), anexos, local e data
  por extenso, assinatura e bloco de recebimento. Total = principal + multa +
  juros + correção, sempre os calculados pela cobrança na data da emissão:
  ninguém digita valor. Quem emite escolhe a filial credora, o prazo e o
  contato de destino. Prazo de N dias corridos do recebimento (parâmetro,
  padrão 15); a emissão registra "prazo até" = data da emissão + N.
- **RN-025** — A notificação só sai com o modelo validado (por Jurídico ou
  Gerente financeiro, com a validação em dia: pendências P-06 e P-11) e com a
  filial credora com razão social e CNPJ. Banco/PIX, representante e cargo vêm
  do cadastro da filial credora; e-mail e telefone do Financeiro são
  parâmetros de comunicação.
- **RN-026** — O demonstrativo usa o cálculo de encargos da cobrança (002) na
  data da emissão, título a título (pendência P-08): principal, multa, juros,
  correção e total, com os percentuais da carteira do cliente. Este módulo não
  recalcula encargos.
- **RN-027** — Carga inicial: leitura das 5 abas pelas regras do estudo
  (E §2.1–2.7): etapa sugerida pelo texto da situação na ordem da tabela de
  E §2.3; o mesmo processo em abas diferentes se reconhece pelos 15 primeiros
  dígitos dos autos, depois por código + semelhança de nome ≥ 0,34, depois por
  semelhança ≥ 0,6; nº dos autos diferente entre abas vira pendência. Vínculo
  com cliente: código encontrado no cadastro vincula; sem código, nome com
  semelhança ≥ 0,6 com exatamente um cliente vira sugestão; com dois ou mais,
  lista os candidatos sem sugerir. Linhas "aguardando documentação" e sem nome
  são ignoradas. "Galderma" no segmento marca a linha Galderma. A filial da
  planilha vira a filial credora cadastrada da mesma UF, quando só há uma; se
  não, o processo entra sem filial e com o aviso na pendência de divergência.
- **RN-028** — Na aba de acordos, a cor de cada parcela só sugere a situação:
  cor da legenda "quitado" → paga, cor da legenda "pendente" → aberta, outra
  cor → a confirmar (pendência). As sugeridas ficam marcadas como vindas da cor.
- **RN-029** — A carga é única e idempotente: cada processo tem uma chave da
  carga (nº dos autos; senão código + nome; senão nome); reaplicar não duplica
  e não altera o que já foi gravado, só completa o que uma aplicação
  interrompida deixou faltando; "concluir carga" impede nova carga.
- **RN-030** — Visibilidade: Jurídico, Gerente, Diretoria e Administrador veem
  todos os processos; Supervisor vê os de clientes da sua atribuição e dos
  agentes abaixo dele; Agente, os dos clientes da sua atribuição; Analista não
  acessa. Processo da carga sem cliente só aparece para quem vê todos. Escrita:
  etapa, ficha, andamento, custo, registro de acordo, vínculo e carga —
  Jurídico, Gerente, Diretoria e Administrador; dossiê (abrir, itens, anexos) —
  quem abriu, o agente do caso de cobrança e seus superiores, e o Jurídico;
  notificação extrajudicial — o agente do caso de cobrança e seus superiores;
  envio — RN-004; aprovação de acordo — RN-019; filiais credoras e conclusão da
  carga — Gerente financeiro ou acima, ou o Administrador. No quadro, o
  Supervisor vê todos os cartões (pendência P-48), mas lista, números e ficha
  seguem a atribuição, e só o Jurídico move à mão. Identidade vem da sessão.
- **RN-031** — Todo número deste módulo é parâmetro com valor padrão e
  auditoria (lista no plan): dias úteis do prazo inicial, nível do envio,
  limiares de prazo, dias de "sem andamento", meta de custo, dias do dossiê
  parado, política e alçada do acordo, honorários, prazo da notificação, dias
  de custo a pagar antigo, faixas de valor e limiares dos indicadores. Os
  catálogos (etapas, documentos, tipos de custo, motivos de encerramento) são
  definição do sistema.
- **RN-032** — Linha Galderma é um atributo do processo (Galderma ou demais),
  sugerido pela carga e editável na ficha; o filtro "Linha" usa esse atributo.

## Testes

Carteira de teste (hoje = 19/11/2026; 20/11 feriado nacional). Equipe (a do
elenco único do sistema): Ana e Bruno (agentes, sob o supervisor Sérgio),
Carlos (agente, sob a supervisora Silvia), Gustavo (gerente, acima de Sérgio,
Silvia e Júlia), Diana (diretoria), Júlia (jurídico), Nara (administradora),
Rita (analista de crédito). Filiais credoras: 1 (Matriz, DF) e 2 (Goiás, GO).
Ana cuida dos clientes 3001, 3002, 3003 e 3013; Carlos, do 3004 e do 3014;
Bruno, dos demais com agente.

| Proc. | Cliente (código) | Carteira · filial | Valor | Autos (ano) | Etapa | Último andamento | Particularidade |
|---|---|---|---|---|---|---|---|
| P01 | Hospital Vale Verde (3002) | privada · 1 | 40.000 | 2024 | Citação | 09/11 | prazo 10/11; citação por edital; custos 1.200 (custas iniciais, pago, guia e comprovante, 03/11) + 300 (diligência, a pagar, sem guia, 20/10) |
| P02 | Clínica Nova Era (3003) | Estética, linha Galderma · 2 | 60.000 | 2023 | Acordo | 12/11 | acordo 60.000 aguardando aprovação: entrada 12.000 venc. 05/11 aberta + 4 × 12.000 |
| P03 | Distribuidora Gama (3005) | privada · 1 | 25.000 | 2022 | Execução | 30/09 | custo 3.000 (honorários contratuais, pago, comprovante, 10/08); sentença favorável |
| P04 | Hospital Delta (3006) | privada · 1 | 80.000 | — | Custas e protocolo | 16/11 | sem custo; substabelecer |
| P05 | Épsilon Comércio (3007) | privada · 2 | 150.000 | 2021 | Suspenso | 01/06 | recuperação judicial |
| P06 | Comercial Atlas (3001) | privada · 1 | 30.000 | — | Dossiê | — | dossiê aberto por Ana em 02/11, 7 de 10; cobrança em Extrajudicial; títulos 18.000 (38 dias) e 12.000 (30 dias) |
| P07 | Zeta Hospitalar (3008) | privada · 1 | 20.000 | 2023 | Encerrado (quitado) | 15/10 | encerrado em 15/10; cliente ainda com 5.000 vencidos há 20 dias |
| P08 | Eta Saúde (3009) | privada · 1 | 45.000 | 2024 | Defesa | 17/11 | cliente sem saldo vencido |
| P09 | Teta Nutrição (3010) | privada · 2 | 15.000 | — | Recebido | 14/11 (carga) | divergência de carga não conferida |
| P10 | Kappa Clínica (3011) | privada · 1 | 10.000 | 2022 | Encerrado (acordo cumprido) | 01/09 | acordo 10.000: entrada 2.000 + 2 × 4.000, pagas em 12/06, 12/07 e 11/08/2026; encerrado em 01/09 |
| P11 | Lambda Médica (3012) | privada · 1 | 12.000 | 2020 | Encerrado (baixa como perda) | 01/08 | cliente com 12.000 vencidos há 25 dias |
| P12 | Secretaria de Saúde de Mu (3014) | pública · 1 | 50.000 | — | Recebido | 18/11 | prazo 24/11 |

Sem processo: Iota Farma (3013, privada, pronta para o Jurídico: 33.000
vencidos em 2 títulos, 20.000 há 52 dias e 13.000 há 40 dias, protestada,
notificação emitida em 20/10/2026); Fundo Municipal de Saúde de Luziânia (3004,
público, 22.000 vencidos); Hospital Santa Maria Ltda (3015) e Hospital Santa
Maria do Sul Ltda (3016, CNPJ 30.160.000/0001-30). Da planilha de teste: Nu
Hospitalar (3017), XI DISTRIBUIDORA LTDA (3018), Pi Clínica Médica (3019), Rô
Medicamentos (3020) e a "Antiga Farmácia Ltda", com o código 3090, que não
existe. Os demais clientes ativos com processo têm saldo vencido na cobrança.

Encargos de referência (multa 2% uma vez; juros simples de 1% ao mês pro rata
pelos dias de cada título; correção composta de 0,4% ao mês pelos mesmos dias;
cada parcela arredondada a centavos): Atlas = 30.000 + 600,00 + (228,00 +
120,00) + (91,25 + 48,00) = 31.087,25; Iota = 33.000 + 660,00 + (346,67 +
173,33) + (138,87 + 69,38) = 34.388,25.

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001 | Dossiê da Iota aberto por Ana: 11 itens aplicáveis, 10 obrigatórios; demonstrativo, histórico e protesto conferidos; notificação pendente com "Notificação gerada em 20/10/2026"; cadastro pendente com "contrato social e QSA"; progresso 3/10; processo criado na etapa Dossiê | regra de negócio |
| C-002 | Depois de abrir: processo da Iota na etapa Dossiê, valor 33.000,00, filial 1; coluna Dossiê passa de 1 para 2 cartões; fase da cobrança da Iota igual à de antes (Extrajudicial); alertas passam de 13 para 12, sem "Cliente pronto para o Jurídico sem dossiê"; item "comprovantes de entrega" marcado continua conferido ao reabrir | regra de negócio |
| C-003 | Gustavo envia a Atlas completa: etapa Recebido, prazo 2026-11-27, item de aprovação conferido "Gustavo Lima · 19/11/2026", progresso 10/10, cobrança da Atlas na fase Cobrança judicial, valor atualizado 31.087,25, andamento com "30.000,00", "31.087,25" e "38 dias"; enviar de novo não cria segundo andamento | regra de negócio |
| C-004 | Envio da Atlas com 7/10: recusa citando "Notificação extrajudicial" e "Cadastro do devedor" (2 itens; a aprovação não aparece como faltante); etapa continua Dossiê | regra de negócio |
| C-005 | Ana envia a Atlas completa: recusa citando "Gerente"; etapa continua Dossiê; Sérgio (nível 2) também é recusado | regra de negócio |
| C-006 | Item cadastro com "não se aplica" e motivo vazio: recusa citando "motivo"; com motivo "Cadastro já arquivado no processo anterior": aceito e progresso da Atlas vai de 7 para 8 | regra de negócio |
| C-007 | Dossiê do Fundo de Luziânia aberto por Carlos: 13 itens, 11 obrigatórios, nenhum com código de protesto, notificação, pedido ou título; progresso 2/11; notificação para o Fundo recusada citando "ofício" | regra de negócio |
| C-008 | Ana abre o dossiê da Iota de novo: devolve o mesmo id de processo; total de processos da Iota continua 1 | regra de negócio |
| C-009 | Como Júlia, "Mover para": Atlas → Petição inicial: recusa "Envie o dossiê"; Delta → Citação: recusa "número dos autos"; Vale Verde → Encerrado: recusa "Encerrar processo". Delta com autos "12345": recusa "CNJ"; com "0709999-10.2026.8.07.0001" vai para Citação. Encerrar o Vale Verde sem motivo: recusa "motivo"; com motivo quitado vai para Encerrado. As duas passagens aparecem no histórico do card; Ana tentando mover para Petição inicial o dossiê que ela mesma abriu: recusa "Só o Jurídico" | regra de negócio |
| C-010 | Lista como Júlia: em andamento 5 / 320.000,00; a ajuizar 4 / 175.000,00; encerrados 3 / 42.000,00; linha Galderma 1 (P02); filial 2 ativos 3 (P02, P05, P09); carteira pública 1 (P12); carteira Estética 1 (P02); busca "0712345" 1 (P01) | regra de negócio |
| C-011 | Andamento na Gama por Júlia: dias sem andamento 0; alertas "Processo sem andamento" de 1 para 0; texto vazio recusado; Bruno recusado citando "permissão"; prazo 21/11 devolve 2 dias até o prazo | regra de negócio |
| C-012 | Custo 0 recusado citando "valor"; após lançar 2.600,00: custo do Vale Verde 4.100,00, razão 10,25%, alertas de custo de 1 para 2; após anexar comprovante: diligência paga; a pagar da carteira 2.600,00 | regra de negócio |
| C-013 | Acordo da Eta: 6 parcelas (0 a 5), entrada 6.000,00 em 2026-11-19, parcelas de 4.800,00 de 2026-12-19 a 2027-04-19, honorários 3.000,00, situação "em andamento", aprovação vazia; o movimento para a etapa Acordo, feito em seguida pela Júlia, é aceito | regra de negócio |
| C-014 | Acordo 70.000 do Delta "aguardando aprovação"; Júlia e Sérgio recusados citando "alçada"; acordo da Gama (entrada 8%) por Gustavo "aguardando aprovação"; Gustavo recusado citando "registrou"; Gustavo aprova o Delta e Diana a Gama: os dois "em andamento" com aprovador preenchido | regra de negócio |
| C-015 | Pagar as 6 parcelas da Eta: após a 5ª o acordo segue em andamento e o processo em Acordo; a 6ª devolve "quitado" e o encerramento com motivo "acordo cumprido" é aceito: etapa Encerrado, nota "Acordo quitado: todas as parcelas pagas.", recuperado 30.000,00; data de pagamento futura recusada; "acordo cumprido" em processo sem acordo quitado recusado | regra de negócio |
| C-016 | Alertas da carteira: 13 linhas, 4 críticas; ordem dos tipos: prazo, parcela, política, sem dossiê, sem andamento, custo, custas, carga, substabelecimento, suspenso, dossiê, encerrado com saldo, ativo regularizado; detalhe do prazo contém "9 dias"; filtro "custo" devolve 1 (P03); a linha "sem dossiê" aponta o cliente 3013, sem processo | regra de negócio |
| C-017 | Indicadores da carteira: 01=5; 02=320.000 (ticket 64.000; carteira 495.000); 03=4 atenção; 04=1 (25.000); 05=30.000; 06=5,6% ruim; 07=0 (0); 08=0; aguardando aprovação 1 · 60.000 (D-08: fora do 07 e do 08); 09=4.500 (2); 10=0,9% bom; 11=6,7 bom; 12=2.250 atenção; 13=1 ruim; 14=1 atenção; 15=1 atenção; 16=1 ruim; 17=48 atenção; 18=40% atenção; 19=1; 20=3,7 anos; 21=25%; 22=66,7% atenção; 23=20% atenção; 24=1; concentração dos 3 maiores 58,6%. Resumo para o painel: 9 ativos, 1 em dossiê, 495.000,00 em causa, custo 4.500,00 (300,00 a pagar), recuperado 30.000,00; a ajuizar 4 (175.000,00), recuperado no mês 0 e no ano 30.000,00, custo no mês 1.200,00, 2 desvios de prazo e andamento (1 crítico) | regra de negócio |
| C-018 | Notificação da Atlas por Ana, com a filial 1 gravada pelo Gustavo: notificante "BENENUTRI COMERCIAL LTDA" e CNPJ 20.720.905/0001-43; 2 títulos; 30.000,00 / 600,00 / 348,00 / 139,25 / total 31.087,25; emissão registrada com prazo 2026-12-04; nota no card do P06 com "31.087,25" e "04/12/2026"; modelo sem validação: recusa "validação"; filial 3 cadastrada sem CNPJ: recusa "CNPJ"; Júlia tentando emitir: recusa | regra de negócio |
| C-018 (documento) | Texto da notificação da Atlas: 5 cláusulas com os títulos de RN-024, total "R$ 31.087,25", "15 (quinze) dias corridos", "Brasília/DF, 19 de novembro de 2026."; com a multa da carteira em 0%: total "R$ 30.487,25" | regra de negócio |
| C-019 | Demonstrativo da Iota: 2 linhas de título (20.000,00 com 52 dias, juros 346,67 e correção 138,87; 13.000,00 com 40 dias, 173,33 e 69,38); 33.000,00 / 660,00 / 520,00 / 208,25 / 34.388,25, iguais campo a campo ao cálculo de encargos da cobrança para 3013 em 2026-11-19; rótulos "Multa (2%)", "Juros de mora (1% ao mês, pro rata por título)", "Correção monetária (0,4% ao mês)" | regra de negócio |
| C-020 | Prévia da planilha de teste por Júlia: 5 processos; etapas citação 1, inicial 2, acordo 1, encerrado 1; por código 3; sugestão 1 (Xi → 3018); sem cliente 1 (código 3090); divergência 1 (Nu); parcela a confirmar 1. Aplicar: 5 processos, Nu com 4 andamentos e substabelecer marcado, Pi com acordo de 3 parcelas; pendências de 1 para 5; aplicar 2 processos numa chamada só: recusa; reaplicar: 0 novos e total de processos igual; concluir por Júlia e por Sérgio: recusa; por Nara (agente com a marca Administrador): aceito; depois, prévia recusada citando "concluída" | regra de negócio |
| C-021 | Acordo da Pi após a carga: parcela 0 paga, parcela 1 aberta, parcela 2 "a confirmar"; as 3 com origem "cor da planilha"; marcar a parcela 2 como aberta muda a origem para manual e tira a pendência (pendências 5 → 4); marcar a divergência da Nu como conferida tira mais uma (4 → 3) e o alerta "Divergência na carga" dela some | regra de negócio |
| C-022 | Processos visíveis no seed: Ana 3 (P01, P02, P06), Bruno 8, Carlos 1 (P12), Sérgio 11, Silvia 1, Júlia 12, Gustavo 12, Diana 12, Nara 12; processo da carga sem cliente visível para Júlia e não para Bruno; Ana e Sérgio movem etapa → recusa "Só o Jurídico"; Bruno lança custo → recusa | regra de negócio |
| C-023 | Prévia com "Hospital Santa Maria" sem código: vínculo vazio, 2 candidatos (3015 e 3016); vincular ao cliente achado pelo CNPJ "30160000000130" → cliente 3016; cliente inexistente → recusa "não encontrado" | regra de negócio |
| C-024 | Meta de custo 10 → 15: alertas de custo de 1 para 0 e total de 13 para 12; com 10 de volta, o detalhe cita "10%" | regra de negócio |
| RN-001 | Catálogo com 17 itens; privada e Estética: 11 aplicáveis, 10 obrigatórios; pública: 13 aplicáveis, 11 obrigatórios; só na pública: contrato, empenho, atesto, ofício, LAI, certidões | regra de negócio |
| RN-002 | Anexar "nf-3001.pdf" ao item notas fiscais pendente: item conferido com observação "Anexo: nf-3001.pdf"; "não se aplica" sem motivo não conta (progresso igual) | regra de negócio |
| RN-003 | Item protesto marcado pendente pela Ana continua pendente depois de reabrir o dossiê; cliente sem endereço não recebe sugestão de cadastro | regra de negócio |
| RN-004 | Depois de abrir o dossiê (C-002) a fase da cobrança da Iota é a mesma; após o envio (C-003) a da Atlas é Cobrança judicial; nível de envio mudado para 2: Sérgio consegue enviar | regra de negócio |
| RN-005 | Envio em 2026-11-19 com 5 dias úteis: 2026-11-27; com parâmetro 3: 2026-11-25; envio em 2026-11-13 (sexta) com 5: 2026-11-23 (pula 20/11, pois 13+5 úteis = 16,17,18,19,23) | regra de negócio |
| RN-006 | Checklist público sem item "notificação"; emissão para cliente público recusada (C-007) | regra de negócio |
| RN-007 | Júlia cadastra à mão processo para a Zeta Hospitalar (3008, que tem só um processo encerrado e o caso de cobrança aberto): aceito; total de processos da Zeta = 2; Bruno abre o dossiê da Zeta pela cobrança: abre esse processo, sem criar outro; depois da rodada seguinte da rotina, a cobrança da Zeta está na fase Cobrança judicial (só com a cobrança instalada) | regra de negócio |
| RN-008 | Grupos: P09 (Recebido, sem autos) conta em "a ajuizar"; após receber autos conta em "em andamento" (6) mesmo antes de mudar de etapa | regra de negócio |
| RN-009 | Encerrar um processo em Dossiê com motivo "outro" e texto: aceito mesmo com dossiê incompleto; "outro" sem texto: recusa; mover de volta para Dossiê: recusa; mudança de etapa não cria andamento (contagem igual antes e depois); encerrar como baixa sem baixa aprovada: aceito, com o aviso na resposta; cadastrar processo já em Citação sem nº dos autos: recusa "número dos autos" | regra de negócio |
| RN-010 | Não existe operação de alterar ou apagar andamento; dias sem andamento de P03 = 50 antes de C-011; na carga de 19/11/2026, andamento "05/11" entra em 05/11/2026, "20/12" em 20/12/2025 e o sem data em 19/11/2026 | regra de negócio |
| RN-011 | Busca por "30.160.000/0001-30" e por "30160000000130" acha o mesmo cliente; o processo vinculado ao 3016 passa a ter o setor do cliente e deixa de ser pendência | regra de negócio |
| RN-012 | "0712345-11.2024.8.07.0001" aceito e ano 2024; "0712345-11.2024.8.07" e "07123451120248070001X" recusados | regra de negócio |
| RN-013 | Tipo "Pesquisas (SISBAJUD, RENAJUD, INFOJUD, endereço)" no grupo Diligências; "Cartório e protesto" em Outros; 12 tipos, 4 grupos; diligência sem guia conta em "sem guia"; honorários sem guia não | regra de negócio |
| RN-014 | Vale Verde 1.500/40.000 = 3,75% sem alerta; Gama 3.000/25.000 = 12% com alerta; processo encerrado com 15% sem alerta | regra de negócio |
| RN-015 | P07 (quitado, sem acordo) 20.000; P10 (parcelas pagas) 10.000; P11 (baixa) 0; P02 (nada pago) 0; P11 com recuperado informado 1.500 → 1.500 (a ficha de processo encerrado continua editável) | regra de negócio |
| RN-016 | 30.000 ÷ (495.000 + 42.000) = 5,6% | regra de negócio |
| RN-017 | Acordo 1.000,00 com entrada 200,00 e 3 parcelas: 266,66; 266,66; 266,68; entrada em 2027-01-31 → parcela 1 em 2027-02-28, parcela 2 em 2027-03-31 | regra de negócio |
| RN-018 | Acordo 30.000 → honorários 3.000; com parâmetro 12% → 3.600 | regra de negócio |
| RN-019 | 30.000 / 20% / 5 → em andamento; 30.000 / 20% / 6 parcelas → aguardando; 50.000,00 exatos / 20% / 5 → em andamento; 50.000,01 → aguardando; aprovação negada: acordo "recusado", a recusa fica no card e novo acordo no mesmo processo é aceito; com um acordo em andamento, novo acordo é recusado | regra de negócio |
| RN-020 | Parcela vencendo hoje (2026-11-19) aberta não é vencida; vencendo 2026-11-18 é; P02: 1 vencida; gravar "a confirmar" pela ficha é recusado | regra de negócio |
| RN-021 | 0 dias até o prazo → vermelho "Prazo hoje"; +3 vermelho; +4 e +7 amarelo; +8 neutro; −2 vermelho "vencido há 2 dias" | regra de tela |
| RN-022 | Severidades: P01 prazo vencido há 9 dias crítico, com prazo em 2026-11-14 (5 dias) atenção; P03 com último andamento em 2026-09-15 (65 dias) crítico; P02 acordo 60.000 crítico, acordo de 30.000 com 6 parcelas atenção; cliente público com atraso de 45 dias e sem processo não entra em "sem dossiê" | regra de negócio |
| RN-023 | Indicador 20 com anos 2024, 2023, 2022, 2021, 2024 → 3,7; indicador 23 com P01 edital entre 5 → 20%; indicador 21 = 2 ÷ 8; recorte filial 2: 01 = 2 (P02, P05) | regra de negócio |
| RN-024 | Documento com 14 dígitos → "CNPJ"; com 11 → "CPF"; emissão em 2026-11-19 com prazo 15 → "prazo até" 2026-12-04; com parâmetro 10 → 2026-11-29 | regra de negócio |
| RN-025 | Modelo sem validação em dia → recusa; validado pela Júlia → aceita; e-mail e telefone do Financeiro vêm dos parâmetros de comunicação; banco e representante vêm do cadastro da filial | regra de negócio |
| RN-026 | Demonstrativo e cálculo de encargos da cobrança para a mesma data devolvem os mesmos 5 valores (C-019) | regra de negócio |
| RN-027 | Leitura da planilha: status "[Marcos] 05/11: AR devolvido, pesquisar endereço" → etapa citação e andamento com autor Marcos; "Acordo homologado" → acordo; "Quitado" → encerrado; "Novo"/"Verificar" → petição inicial; valor "R$ 7.250,30" → 7250,30; data 46350 → 2026-11-24; a mesma linha em duas abas vira um processo só. No servidor: "Xi Distribuidra" casa com "XI DISTRIBUIDORA LTDA" com semelhança 1 (um erro de digitação) e vira sugestão, não vínculo | regra de tela (leitura) e regra de negócio (sugestão) |
| RN-028 | Legenda quitado = 38761D, pendente = FF6D01: célula 38761D → paga; FF6D01 → aberta; FFFF00 → a confirmar | regra de tela |
| RN-029 | Chave da Nu = dígitos dos autos; Xi = nome; reaplicar com a Nu alterada na planilha não muda a Nu gravada; processo que ficou sem card numa aplicação interrompida ganha o card ao reaplicar | regra de negócio |
| RN-030 | Matriz de permissões: dossiê de cliente da Ana por Bruno → recusa; dossiê da Iota pela supervisora Silvia (outra equipe) → recusa; filial salva por Júlia → recusa, por Gustavo → aceita; carga por Ana → recusa, por Júlia → aceita; Rita lista 0 processos; usuário sem vínculo na equipe recebe "sem acesso" | regra de negócio |
| RN-031 | Parâmetro "dias do dossiê parado" 10 → 20: alerta de dossiê da Atlas (17 dias) some | regra de negócio |
| RN-032 | Filtro linha Galderma: 1 (P02); P03 marcado Galderma na ficha → 2 | regra de negócio |
| RF-019 | Montagem do CSV: 16 colunas na ordem do requisito, separador ";", vírgula decimal ("40000,00"), acentos preservados; campo com ";" vai entre aspas | regra de tela |
| RNF-006 | Bruno pede a ficha do processo da Atlas (cliente da Ana): "não encontrado", sem endereço de anexo na resposta | regra de negócio |

Verificação manual:
- [ ] C-001 a C-009 — no card aberto: "Mover para" só mostra destino possível, a recusa aparece na faixa de aviso, e "Montar dossiê" no card da cobrança abre o dossiê
- [ ] C-007 — dossiê público com os 13 documentos na mesma tela do privado
- [ ] C-018 e C-019 — PDF em papel timbrado, texto justificado, acentos corretos, tabela legível em A4
- [ ] C-020 e C-023 — carregar a planilha real do escritório (`.xlsx`) e conferir a prévia com o Jurídico; devedor com dois candidatos pelo nome
- [ ] RF-016 e RF-034 — formulário "Novo processo" e cadastro das filiais credoras
- [ ] RF-031 — gráficos legíveis em tema claro e escuro
- [ ] RF-019 — CSV abre no Excel com acentos e vírgula decimal

## Fora de escopo

- [ ] Régua da cobrança, fases do caso de cobrança (inclusive a entrada em "Cobrança judicial", que é efeito do envio do dossiê ou, para processo nascido fora do dossiê, da rotina da cobrança) e cálculo de encargos — são da `002-cobranca-privada`, para as três carteiras; aqui só se usam.
- [ ] Quadro, card aberto, histórico de passagem por etapa, chat, tarefas, anexos e níveis de acesso do quadro — são da biblioteca de quadros do sistema; este módulo só define as 11 etapas, as travas e o conteúdo do card.
- [ ] Notas fiscais, empenhos, certidões e análise do órgão — `005-setor-publico`; aqui só aparecem como sugestão do dossiê público, quando aquele módulo estiver instalado.
- [ ] Painel executivo das 4 carteiras e o cartão do Jurídico nele — `006-painel-consolidado` (este módulo só entrega o resumo que ele lê).
- [ ] Histórico do cliente em PDF e o material de apoio (inclusive o modelo de termo de confissão de dívida) — `007-historico-apoio`.
- [ ] Importação recorrente da planilha do escritório — o sistema passa a ser a fonte (estudo §8.1, item 9); só existe a carga única. Dados lançados no artefato do gestor não migram (pendência P-02).
- [ ] Consulta automática a tribunais (PJe, e-SAJ, Projudi) e leitura de diário oficial — andamentos e prazos são lançados por gente.
- [ ] Envio da notificação por carta com AR ou cartório — o sistema gera o documento, registra a emissão e pode mandar o e-mail; o resto é feito fora.
- [ ] Assinatura digital de documentos.
- [ ] Valor recuperado lido dos pagamentos do Winthor — continua informado ou derivado das parcelas (RN-015).
- [ ] Baixa de títulos ou qualquer escrita no Winthor.
- [ ] Pagamento ao escritório e controle de contrato de honorários além do lançamento do custo.
- [ ] Alterar, substituir ou cancelar um acordo judicial já registrado — um acordo aguardando ou em andamento por processo (só o recusado dá lugar a outro); entra quando aparecer a renegociação.
- [ ] Movimento automático do processo e selo de "prazo vencendo" ou "sem andamento" no cartão — o Jurídico não tem rotina; esses sinais saem do prazo do card, dos alertas e da lista.
- [ ] Resposta extra da notificação, contatos e endereço próprios do processo e anexo solto do tipo "outro", que o artefato tinha — contatos e endereço são os do cliente (ficha da base) e documento avulso vai nos anexos do card.
- [ ] Dados de exemplo do artefato e a chave "ocultar exemplos".

## Pendências

Nenhuma bloqueia a construção: cada uma segue com o padrão adotado e muda
depois por parâmetro, cadastro ou ajuste isolado. P-NN é o número do índice do
contrato técnico (P-38 a P-44 são as deste módulo, antes J-1 a J-7).

| # | Pergunta ao gestor | Padrão adotado | Afeta |
|---|---|---|---|
| P-02 | Os processos, dossiês, custos e acordos lançados no artefato migram? | Não; a carga inicial é só a planilha do escritório | RF-035 a RF-038 |
| P-06 / P-11 | Quem valida o texto da notificação extrajudicial e o rodapé do demonstrativo, e o texto do artefato (5 cláusulas, 15 dias corridos, arts. 389, 394 e 397 do Código Civil) vale como ponto de partida? | Jurídico ou Gerente financeiro validam; sem validação em dia a notificação não sai; o texto do artefato é o ponto de partida | C-018, RN-024, RN-025 |
| P-07 | Encaminhar e montar o dossiê depois, ou dossiê completo primeiro? | Dossiê primeiro; o envio é que move a cobrança | RN-004, RN-022 |
| P-08 | Encargos título a título ou pelo título mais antigo? | Título a título | C-003, C-018, C-019 |
| P-25 | Anexo em endereço público | Aceito, com o endereço entregue só a quem vê o processo | RNF-006 |
| P-38 | Os advogados do escritório externo vão usar o sistema ou o Jurídico interno lança por eles? | Responsável é uma pessoa da equipe com cargo Jurídico; advogado externo aparece no texto do andamento | RF-015, RF-018, RN-030 |
| P-39 | Cópia da planilha real do escritório (as 5 abas), para fixar cabeçalhos e colunas | Colunas por posição, como no artefato (E §2.5–2.6); prévia obrigatória; conferir com o arquivo real antes da carga de verdade | C-020, RN-027, RN-028 |
| P-40 | "Linha Galderma" é toda a BU Estética, parte dela ou independe da BU? | Atributo próprio do processo, independente da BU | RF-013, RN-032 |
| P-41 | Quais são a razão social, o CNPJ, o endereço, o banco e o representante de cada filial credora, e a sigla que o escritório usa para cada uma? | Filial credora é a filial do Winthor; nasce da filial dos títulos vencidos; o Gerente cadastra os dados; a carga casa a sigla pela UF | RF-005, RF-034, RN-005, RN-027 |
| P-42 | Acordo abaixo de R$ 50 mil, mas fora da política, precisa de aprovação ou só gera alerta? | Precisa de aprovação na alçada | C-014, RN-019, RN-022 |
| P-43 | Encerrar processo como "baixa como perda" exige a baixa já aprovada na cobrança? | Não exige; quem encerra é avisado e fica registrado | RN-009, RN-015 |
| P-44 | Taxa de recuperação: dividir pelo valor de todos os processos ou só dos ativos? | Todos os processos do recorte, ativos e encerrados | RN-016, RN-023 |

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida
- [x] Cenários cobrem pelo menos um caminho de erro (C-004, C-005, C-006, C-009, C-014, C-023)
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta
- [x] Zero `[NEEDS CLARIFICATION]` em aberto (as 8 viraram pendências com padrão adotado)
