# Spec: Concessão e gestão de crédito (carteiras Privada, Estética e Pública)

**ID:** 004-concessao-credito · **Status:** em revisão · **Data:** 2026-11-14 (revisada contra o contrato técnico, fase 0c)

> Escopo: a solicitação de crédito de qualquer cliente — privado, da Estética
> ou órgão público —, da entrada até o limite ativo, o acompanhamento desse
> crédito (validade, reanálise, obsoleto), os pedidos acima do limite, o motor
> de crédito com o rating único e os quadros de semáforo, saúde das análises,
> desempenho e criticidade.
> Pela decisão D-05 há **uma só** esteira de concessão, com as mesmas telas e
> as mesmas regras para as três carteiras; o que muda de uma carteira para
> outra é dado: as etapas do quadro da carteira, o valor dos parâmetros
> (alçadas, validade) e o motor de análise. O motor do órgão público e os dados
> do órgão são da spec `005-setor-publico`; cobrança é `002`; painel executivo
> é `006`.
>
> Fonte das regras: o artefato do gestor estudado em `docs/estudo-artefato/`
> (relatório A §3–§5, C §4.12–4.16 e §6.3, D §1.15, §1.16, §2 e §3), as
> decisões de 11/11/2026 (visão geral §8) e as de 14/11/2026 (D-01 a D-05).
> O artefato é referência de regra, não de implementação.

## Problema

Hoje a concessão de crédito da Benenutri vive num painel montado por um gestor:
uma página única em que solicitação, cliente com limite e caso de cobrança são o
mesmo registro, e em que toda regra (alçada, "quem analisa não aprova", gates de
etapa) roda no navegador de quem está usando. Quem não vinculou o login à equipe
aprova qualquer valor; o Kanban deixa pular etapa; o rating é digitado à mão
numa escala de banco (AA–H) que contradiz o semáforo calculado (AA–E); a
validade de 3 meses só é cumprida se alguém apertar "Encaminhar"; e os números
de limite, utilizado e atraso são digitados na ficha, em paralelo ao Winthor.
O custo é crédito concedido sem a alçada certa, limite vencido que ninguém
revisa e nenhuma forma confiável de saber se as análises aprovadas acertaram.

## Resultado esperado

Toda solicitação de crédito — de cliente privado, da Estética ou de órgão
público — percorre a esteira da sua carteira, com o rating e o limite sugeridos
pelo motor da Política, a decisão registrada pela alçada competente e conferida
pelo sistema, e o crédito aprovado é acompanhado sozinho até a renovação ou o
encerramento, com o limite real lido do Winthor.

## Usuários

| Perfil | O que precisa fazer | Frequência |
|---|---|---|
| Analista de crédito | Registrar solicitação, conduzir a análise (consultas, financeira, fonte pagadora, garantia, confirmação cadastral, documentos), propor limite e rating, conduzir formalização e liberação, analisar pedidos acima do limite | diária |
| Supervisor | Tudo do analista para a sua equipe; decidir na alçada de Supervisor; aprovar ajuste de rating dos seus analistas; redistribuir solicitações; antecipar reanálise | diária |
| Gerente financeiro | Decidir na alçada de Gerente e registrar a decisão do Comitê regional; ver toda a carteira; calibrar o semáforo (cortes de score, percentuais por faixa) e registrar a revisão trimestral | semanal |
| Diretoria | Registrar a decisão do Comitê executivo e do Comitê de crédito; decidir liberações críticas | eventual |
| Administrador | Configurar os quadros (nome, prazo e checklist das etapas) e os acessos. Administra quem tem nível de Gerente ou acima ou a marca de administrador (de qualquer nível) | eventual |

Perfis, cargos, níveis de alçada e hierarquia são os da arquitetura (§5) e do
cadastro de equipe da spec `001-base`. Esta spec não cria perfil. A mesma pessoa
pode ser agente de cobrança e analista de crédito; a segregação é por caso
(pendência P-04).

## Cenários

Datas de referência: "hoje" = 14/11/2026. Parâmetros com o valor padrão.
Pessoas: Rita (analista), Ana (agente, par de Rita), Sérgio (supervisor das
duas), Silvia (supervisora), Carlos (agente da equipe de Silvia), Gustavo
(gerente financeiro), Diana (diretoria). Salvo indicação, a carteira é a Privada.

**C-001 — Nova solicitação sugere o tipo de cliente**
- **Dado que** o cliente Clínica Iota tem crédito vigente em gestão
- **Quando** o analista abre "Nova solicitação", escolhe "Análise de crédito" e seleciona a Clínica Iota
- **Então** o tipo de cliente vem sugerido como "recorrente", com o motivo "crédito ativo na carteira"; ao confirmar com justificativa, valor R$ 25.000 e prazo 3 meses, a solicitação aparece na etapa "Solicitação recebida" com SLA "0d / 1d" e prazo de decisão em 23/11/2026

**C-002 — Cliente inativo e cliente novo**
- **Dado que** a Farmácia Kappa tem o último crédito em "Cadastro obsoleto" e a Clínica Xi nunca teve solicitação
- **Quando** o analista seleciona cada uma na nova solicitação
- **Então** a Farmácia Kappa vem sugerida como "inativo" ("cadastro obsoleto") e a Clínica Xi como "novo"; o analista pode trocar a sugestão

**C-003 — Solicitação sem justificativa (erro)**
- **Dado que** o analista preencheu cliente e valor
- **Quando** confirma sem justificativa
- **Então** o sistema recusa e diz que a justificativa da solicitação é obrigatória; nada é gravado

**C-004 — Liberação de pedido excedente pela mesma entrada**
- **Dado que** o Hospital Pi tem limite R$ 100.000 e utilizado R$ 90.000 lidos do Winthor
- **Quando** o analista escolhe "Liberação de pedido excedente" e registra o pedido nº 51234 de R$ 15.000
- **Então** o pedido aparece em "Retido por limite" com excesso R$ 5.000 (+5%) e alçada exigida "Supervisor"

**C-005 — Confirmação cadastral pendente trava o avanço (erro)**
- **Dado que** a solicitação está em "Documentação e análise cadastral" com a confirmação por telefone marcada e as confirmações de endereço e de contato financeiro por marcar
- **Quando** o analista tenta mover para "Análise de crédito"
- **Então** o sistema recusa; o card mostra "endereço" e "contato financeiro" como o que falta para avançar; a etapa não muda

**C-006 — Consultas vencidas (erro)**
- **Dado que** as consultas obrigatórias foram registradas em 10/10/2026 (35 dias atrás)
- **Quando** o analista tenta sair de "Documentação e análise cadastral"
- **Então** o sistema recusa porque as consultas valem 30 dias e pede que sejam refeitas

**C-007 — Motor aprova dentro da política**
- **Dado que** a Clínica Iota (recorrente) tem score Serasa 750, pontualidade 95%, nenhum atraso, compra média R$ 20.000/mês, prazo médio 30 dias, faturamento informado R$ 200.000/mês, nenhum alerta, e a concentração não limita
- **Quando** o analista calcula o motor para R$ 25.000 solicitados
- **Então** o motor mostra score comportamental 1000, score final 850, rating **AA**, limite sugerido de R$ 24.000 a R$ 29.000, resultado "Aprovar" e alçada "Supervisor"

**C-008 — Atraso e alerta rebaixam a faixa**
- **Dado que** o mesmo cliente tem 10 dias de atraso e o analista marcou o alerta "Negativação"
- **Quando** o motor é calculado
- **Então** o score final é 810 (faixa AA), a faixa do atraso é B, a pior é B, o alerta rebaixa para **C**; o limite sugerido é R$ 12.000 e o resultado é "Aprovar com limite de R$ 12.000 (solicitado 108% acima do motor)"

**C-009 — Faixa D: negar ou exceção com garantia**
- **Dado que** a Clínica Xi, cliente novo sem histórico conosco, tem score Serasa 150 e faturamento informado de R$ 100.000/mês
- **Quando** o motor é calculado sem garantia e depois com "Aval dos sócios"
- **Então** o rating é **D**, o limite sugerido é R$ 0 e o resultado é "Negar a prazo: somente à vista"; com o aval, passa a "Exceção com garantia: levar ao comitê"

**C-010 — Concentração reduz o limite**
- **Dado que** a carteira de limites dos demais clientes soma R$ 900.000, dos quais R$ 80.000 são de outra empresa do mesmo grupo econômico, e a política sugere R$ 50.000
- **Quando** o motor é calculado
- **Então** o teto de concentração é R$ 95.000 (10% de R$ 950.000), o disponível para o grupo é R$ 15.000 e o limite sugerido cai para R$ 15.000, "reduzido pela concentração"; se o grupo já tivesse R$ 95.000, o resultado seria "Levar ao comitê: concentração"

**C-011 — Ajuste manual do rating**
- **Dado que** o motor deu rating C para a solicitação da analista Rita, cujo supervisor é Sérgio
- **Quando** Rita ajusta para B sem justificativa, depois com justificativa; Ana (par de Rita) tenta aprovar o ajuste; Sérgio aprova
- **Então** o ajuste sem justificativa é recusado; com justificativa fica "aguardando aprovação" e a solicitação não sai da Análise de crédito; Ana é recusada por não estar acima de Rita; com a aprovação de Sérgio o rating efetivo passa a B, o ajuste fica na auditoria e a decisão dessa solicitação passa a ser do Comitê de crédito (rating ajustado é exceção ao motor)

**C-012 — Quem analisa não aprova (erro)**
- **Dado que** Sérgio (Supervisor) é o analista responsável por uma solicitação de R$ 30.000 no Comitê
- **Quando** Sérgio registra a decisão de aprovar
- **Então** o sistema recusa por segregação de funções, mesmo Sérgio tendo a alçada do valor

**C-013 — Alçada pelo valor**
- **Dado que** uma solicitação com limite proposto de R$ 60.000, dentro do sugerido pelo motor, está no Comitê
- **Quando** Sérgio (Supervisor) registra a aprovação e depois Gustavo (Gerente) registra
- **Então** Sérgio é recusado com "A aprovação exige Gerente"; a de Gustavo é aceita, a solicitação vai para "Formalização", e o rating na concessão fica congelado com o rating efetivo daquele dia

**C-014 — Decisão incompleta (erro)**
- **Dado que** Gustavo vai aprovar uma solicitação no Comitê
- **Quando** registra sem plano de pagamento, sem forma de pagamento e sem parecer
- **Então** o sistema recusa e lista os três campos; nada muda

**C-015 — Limite acima do motor é exceção: Comitê de crédito, com justificativa (erro)**
- **Dado que** o motor sugeriu R$ 12.000 e a solicitação está no Comitê com limite proposto de R$ 20.000
- **Quando** Gustavo (Gerente) aprova R$ 20.000; depois Diana (Diretoria) aprova R$ 20.000 sem justificativa de exceção, e por fim com
- **Então** Gustavo é recusado com "A aprovação exige Comitê de crédito"; Diana sem justificativa é recusada; com justificativa é aceita, e a decisão fica registrada em nome do Comitê de crédito com a justificativa

**C-016 — Do aprovado ao limite ativo, sem escrever no Winthor**
- **Dado que** uma solicitação foi aprovada em R$ 29.000, plano "28/35/42 dias", forma "Boleto bancário" e está em "Formalização"
- **Quando** o analista tenta mover para "Liberação" sem o termo de concessão assinado, depois com o termo anexado; tenta mover à mão para "Gestão de crédito"; e por fim marca a pendência como aplicada
- **Então** a aprovação já tinha criado a pendência "Aplicar no Winthor: limite R$ 29.000, plano 28/35/42 dias, boleto"; sem o termo a mudança para "Liberação" é recusada; com o termo é aceita; mover à mão para "Gestão de crédito" é recusado; marcada a pendência como aplicada, o crédito fica vigente com validade até 14/02/2027 e o card vai sozinho para "Gestão de crédito"

**C-017 — Limite no Winthor divergente**
- **Dado que** o crédito vigente da Clínica Mi foi aprovado em R$ 29.000 e a sincronização leu R$ 30.000 de limite no Winthor
- **Quando** alguém abre a carteira em gestão
- **Então** a Clínica Mi aparece com o sinal "Limite no Winthor diverge do aprovado (R$ 30.000 × R$ 29.000)"

**C-018 — Encaminhamento automático no vencimento**
- **Dado que** em 14/11/2026 existem: K1 com validade 13/11/2026 e 3 compras no período; K2 com validade 13/11/2026 e 1 compra; K3 com validade em dia e última compra em 06/08/2026; K4 com validade em dia e última compra em 01/11/2026
- **Quando** a rotina do sistema roda
- **Então** K1 vai para "Reanálise" (SLA 5 dias), K2 vai para "Cadastro obsoleto" ("1 compra no período"), K3 vai para "Cadastro obsoleto" ("Sem compras há 100 dias, última em 06/08/2026"), K4 fica em gestão; nascem as pendências "Bloquear limite no Winthor" de K2 e K3

**C-019 — Renovação na reanálise**
- **Dado que** K1, com limite de R$ 40.000 e analista Rita, está em "Reanálise"
- **Quando** Rita registra a renovação; Sérgio (Supervisor) registra sem parecer e depois com parecer
- **Então** Rita é recusada (quem analisa não decide); sem parecer a renovação é recusada; com parecer começa um novo período de crédito com o mesmo limite, validade de 3 meses a partir de hoje e uma nova fotografia do rating na concessão; o período anterior fica no histórico e o card volta para "Gestão de crédito"

**C-020 — Recusa com motivo**
- **Dado que** uma solicitação está em "Documentação e análise cadastral"
- **Quando** o analista recusa sem motivo, e depois com o motivo "CNPJ inapto na Receita"
- **Então** a primeira é recusada; a segunda leva a solicitação para "Recusadas" com o motivo visível no card e no histórico

**C-021 — Alçada do pedido pelo tamanho do excesso**
- **Dado que** o Hospital Pi tem limite R$ 100.000, utilizado R$ 90.000 e nenhum atraso
- **Quando** são registrados pedidos de R$ 15.000, R$ 30.000, R$ 50.000 e R$ 80.000, e um de R$ 30.000 para um cliente com 16 dias de atraso
- **Então** as alçadas exigidas são Supervisor (+5%), Gerente (+20%), Diretor financeiro (+40%, liberação crítica), Comitê de crédito (+70%) e Comitê de crédito (atraso acima de 15 dias); um pedido de R$ 5.000 é recusado na entrada porque cabe no limite

**C-022 — Liberação de pedido: regras de quem decide (erro)**
- **Dado que** o pedido de R$ 50.000 (Diretor financeiro) tem Rita como analista
- **Quando** Rita tenta liberar; Diana (Diretoria) libera sem parecer; Diana libera com condição "Liberação pontual", plano, forma e parecer
- **Então** Rita é recusada por segregação; a liberação sem parecer é recusada por ser crítica; a terceira libera o pedido e cria a pendência "Liberar pedido 51234 no Winthor"

**C-023 — Cliente bloqueado pela régua de cobrança (erro)**
- **Dado que** o cliente do pedido (Clínica Lambda) está bloqueado para novos pedidos pela régua de cobrança
- **Quando** Gustavo (Gerente) libera um pedido de alçada Gerente sem parecer
- **Então** o sistema recusa e exige o parecer da liberação

**C-024 — Flexibilização do limite pela faixa**
- **Dado que** um cliente AA tem limite R$ 100.000, sem títulos vencidos, pontualidade 95%, sem bloqueio, validade em dia e farol sem rebaixamento; outro, com os mesmos dados, é faixa B
- **Quando** a ficha mostra o mostrador de flexibilização
- **Então** o cliente AA pode chegar a R$ 120.000 (+20%) e o B a R$ 100.000, com o motivo "faixa B não permite flexibilizar"; se o AA tiver R$ 1 vencido, a flexibilização cai a zero com o motivo "títulos vencidos em aberto"

**C-025 — Fora do SLA**
- **Dado que** uma solicitação entrou em "Documentação e análise cadastral" há 4 dias e um pedido entrou em "Retido por limite" há 3 horas
- **Quando** a esteira e o quadro de pedidos são abertos
- **Então** a solicitação aparece "4d / 3d" fora do SLA e o pedido "3h / 2h" fora do SLA; cada um entra no contador "Fora do SLA" do seu quadro

**C-026 — Rating atual recalculado após a sincronização**
- **Dado que** a Clínica Ni foi aprovada em AA (score Serasa 750, pontualidade 95%, sem atraso) e a sincronização com o Winthor passou a mostrar 35 dias de atraso
- **Quando** a rotina do sistema roda depois da sincronização
- **Então** o rating atual passa a **D** (score final 710 = A, atraso 35 dias = D), o rating na concessão continua AA, e o cliente passa a contar como "risco não previsto"

**C-027 — Simulador do semáforo**
- **Dado que** alguém abre o simulador do semáforo
- **Quando** informa score 650, prazo médio 30 dias, compra média R$ 20.000 e faturamento R$ 200.000, e depois muda o prazo para 50 dias
- **Então** o resultado é faixa A com limite R$ 24.000; com 50 dias, R$ 40.000 e o aviso "Prazo de 50 dias acima do máximo da faixa (45)"; nada é gravado

**C-028 — Validação do farol**
- **Dado que** a foto mensal mais recente da carteira mostra, na faixa AA, R$ 1.000.000 de saldo (vencido + a vencer) com R$ 5.000 vencidos; na A, R$ 2.000.000 com R$ 100.000 vencidos; na B, R$ 1.000.000 com R$ 30.000 vencidos; nenhum cliente C; e só existe 1 mês de fotos
- **Quando** o Gerente abre a validação do farol
- **Então** AA "Dentro do esperado" (0,5% até 1%), A "Fora da ordem" (5% acima dos 3% da faixa B), B "Dentro do esperado" (3% até 5%), C "Sem carteira", D e E "Faixa sem crédito a prazo"; e o aviso "Base de 1 de 12 meses: leitura ainda não conclusiva"

**C-029 — Calibração trimestral**
- **Dado que** a última revisão do semáforo foi registrada em 10/08/2026
- **Quando** Gustavo (Gerente) abre o semáforo em 14/11/2026, registra a revisão com parecer e altera o corte da faixa A de 600 para 620 na tela de parâmetros
- **Então** antes do registro aparece o aviso "Revisão trimestral vencida (última em 10/08/2026)"; depois o aviso some, a revisão fica registrada com autor e data, e o novo corte vale a partir da vigência informada

**C-030 — Saúde das análises**
- **Dado que** há 5 créditos aprovados: sem atraso e uso 50%; atraso 12 dias; uso 95%; atraso 31 dias; validade vencida
- **Quando** a aba "Saúde das análises" é aberta
- **Então** mostra 1 saudável, 3 em atenção, 1 em risco, e índice de saúde de 20% (vermelho, abaixo de 60%)

**C-031 — Desempenho dos agentes**
- **Dado que** nos últimos 90 dias o analista Carlos tem 5 solicitações decididas — em 5, 7, 9, 14 e 25 dias depois de abertas, quatro aprovadas e uma recusada — e 1 solicitação aberta há 12 dias, ainda sem decisão
- **Quando** a supervisora Silvia abre "Desempenho"
- **Então** Carlos aparece com SLA cumprido 60% (3 de 5 decididas em até 9 dias; vermelho, meta 85%), tempo médio de decisão 12,0 dias (meta 9), aprovação 80% e 1 fora do prazo agora

**C-032 — Criticidade e clientes sinalizados**
- **Dado que** um cliente em gestão tem pontualidade 85%, score Serasa 550 e uso do limite de 92%, sem atraso; outro tem 35 dias de atraso; outro só pontualidade 88%
- **Quando** a tabela de clientes sinalizados é aberta
- **Então** o primeiro aparece "Crítico" com o motivo "3 sinais de alerta ao mesmo tempo" e os três alertas; o segundo "Crítico" por atraso; o terceiro "Alerta"; um cliente sem sinal não aparece

**C-033 — Cada um vê a sua carteira**
- **Dado que**, numa carteira, Rita tem 2 solicitações em andamento, Ana 1, ambas subordinadas a Sérgio, e Sérgio a Gustavo
- **Quando** cada um abre a esteira
- **Então** Rita vê 2, Ana 1, Sérgio 3 e Gustavo 3; a contagem dos filtros bate com o quadro

**C-034 — Órgão público entra pela carteira Pública**
- **Dado que** a Secretaria Municipal de Saúde de Catalão é cliente do setor público e a Clínica Xi é do setor privado
- **Quando** o analista abre uma análise de crédito para a Secretaria na carteira Pública; tenta abrir para a Secretaria na carteira Privada; e tenta abrir para a Clínica Xi na carteira Pública
- **Então** a primeira entra em "Recebimento da solicitação", no quadro da carteira Pública (3 etapas até a decisão), com prazo de decisão em 25/11/2026 (11 dias); as outras duas são recusadas dizendo que órgão público só entra pela carteira Pública e cliente privado não entra nela

**C-035 — Alçada da carteira Pública**
- **Dado que** duas solicitações de órgão estão em "Classificação de risco e aprovação", com limite proposto de R$ 80.000 e de R$ 1.200.000
- **Quando** o sistema mostra a alçada exigida de cada uma
- **Então** a primeira exige "Supervisor" (na Privada, o mesmo valor exigiria Gerente) e a segunda exige "Diretoria" (na Pública não há Comitê regional)

**C-036 — Órgão sem contrato: só pré-aprovação; com contrato, o crédito nasce na decisão**
- **Dado que** uma solicitação de órgão está em "Classificação de risco e aprovação" e o motor do órgão (spec 005) diz que ainda não há contrato ativo
- **Quando** o Supervisor (alçada do valor) registra "aprovada"; depois "pré-aprovada"; e, com o contrato já lançado, "aprovada"
- **Então** a primeira é recusada ("sem contrato ativo, só pré-aprovar ou recusar"); a pré-aprovação é aceita e a solicitação fica na mesma etapa, marcada "Pré-aprovada"; a aprovação final cria o crédito na hora (o quadro da Pública não tem Formalização nem Liberação), leva o card para "Monitoramento (crédito ativo)" e gera a pendência "Aplicar no Winthor". Numa solicitação da carteira Privada, "pré-aprovada" é recusada

**C-037 — Estética tem o seu quadro**
- **Dado que** a Estética Prime comprou nos últimos 90 dias mais em itens da BU Estética do que nas outras
- **Quando** o analista abre uma análise de crédito de R$ 60.000 para ela
- **Então** a carteira vem sugerida como "Estética" (pode ser trocada); a solicitação entra no quadro da Estética, com as mesmas 6 etapas da Privada, e a alçada exigida é "Gerente"

**C-038 — Usuário sem vínculo com a equipe (erro)**
- **Dado que** o usuário "visitante" tem login, mas não está na equipe de Crédito e Cobrança
- **Quando** tenta abrir uma solicitação, registrar uma decisão e listar a esteira
- **Então** as duas escritas são recusadas com "Você não faz parte da equipe de Crédito e Cobrança", nada é gravado, e a esteira vem vazia

**C-039 — Crédito novo substitui o vigente**
- **Dado que** a Clínica Iota tem crédito vigente de R$ 100.000 e uma nova solicitação (aumento) aprovada em R$ 130.000, em "Liberação"
- **Quando** a pendência "Aplicar no Winthor" do aumento é marcada como aplicada
- **Então** o crédito de R$ 130.000 passa a ser o único vigente do cliente; o de R$ 100.000 fica "Encerrado (substituído)" no histórico e o card dele vai para "Encerradas"

**C-040 — Gatilhos de revisão**
- **Dado que** há cinco créditos em gestão: um com 16 dias de atraso; um com uso do limite de 92%; um cujo analista marcou "Negativação"; um com a validade vencendo em 10 dias; e um sem nenhum desses
- **Quando** a lista "Créditos a revisar" é aberta
- **Então** aparecem os quatro primeiros, cada um com o seu gatilho (atraso, uso, negativação, validade vencendo); o quinto não aparece

**C-041 — Mostradores de flexibilização**
- **Dado que** no mês foram decididos 4 pedidos acima do limite: 3 liberados (2 deles dentro do teto flexível do cliente) e 1 recusado
- **Quando** os mostradores de flexibilização são abertos
- **Então** a taxa de flexibilização é 75% (fora da meta de até 30%) e 67% das liberações ficaram dentro da regra (fora da meta de pelo menos 90%)

**C-042 — Fila do crédito**
- **Dado que** Rita tem uma solicitação com o prazo de decisão vencendo hoje e uma pendência "Aplicar no Winthor" aberta; e Sérgio tem um ajuste de rating de Rita para decidir e uma solicitação de R$ 30.000 de Rita aguardando a alçada de Supervisor
- **Quando** cada um abre a sua fila (faixa "Aguardando você" no topo da esteira: os 5 primeiros itens e "ver todos")
- **Então** Rita vê os seus 2 itens e Sérgio os seus 2, cada item com o cliente, a data e o que fazer; nenhum vê os itens do outro como seus

**C-043 — Etapa do sistema não se muda à mão (erro)**
- **Dado que** uma solicitação está em "Solicitação recebida", com valor, prazo e analista, e um crédito está em "Gestão de crédito"
- **Quando** o analista tenta mover a solicitação direto para "Análise de crédito" (pulando uma etapa), tenta mover a solicitação para "Comitê / Alçada", e tenta mover o crédito para "Reanálise"
- **Então** as três são recusadas, cada uma dizendo o motivo (só a etapa seguinte; análise incompleta; encaminhamento é feito pelo sistema); nenhum card muda de etapa

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | O sistema DEVE abrir uma solicitação escolhendo o tipo — análise de crédito (novo limite ou aumento) ou liberação de pedido excedente — para um cliente do cadastro, na carteira dele | Análise entra na primeira etapa do quadro da carteira; pedido entra em "Retido por limite" (C-001, C-004, C-034) | must |
| RF-002 | O sistema DEVE sugerir o tipo de cliente (novo, recorrente, inativo) com o motivo, e permitir trocar | C-001 e C-002 com as três sugestões | must |
| RF-003 | O sistema DEVE exigir justificativa, valor e prazo na abertura da análise de crédito | C-003 | must |
| RF-004 | O sistema DEVE conduzir a análise pelas etapas do quadro da carteira. Privada e Estética: Solicitação recebida (1 dia), Documentação e análise cadastral (3), Análise de crédito (3), Comitê / Alçada (2), Formalização (2), Liberação (1). Pública: Recebimento da solicitação (1), Análise documental e financeira (8), Classificação de risco e aprovação (2). Nas três: Gestão de crédito (na Pública, "Monitoramento"), Reanálise (5 dias), Cadastro obsoleto, Recusadas e Encerradas | Quadro com as etapas nessa ordem; solicitação aberta em 14/11/2026 tem prazo de decisão em 23/11/2026 na Privada (9 dias) e em 25/11/2026 na Pública (11 dias) | must |
| RF-005 | O sistema DEVE mostrar em cada etapa o checklist da Política (RN-003) e registrar quem marcou cada item e quando | Item marcado mostra autor e data; desmarcar também fica registrado | must |
| RF-006 | O sistema DEVE validar no servidor as condições de cada mudança de etapa (RN-004) e recusar dizendo o que falta | C-005, C-006, C-043 | must |
| RF-007 | O sistema DEVE mostrar o SLA de cada solicitação e pedido (decorrido / prazo) e marcar os que estão fora | C-025 | must |
| RF-008 | O sistema DEVE registrar na ficha as consultas obrigatórias (Receita, protestos, processos, sócios), a data delas e a data de abertura do CNPJ, e mostrar se estão válidas | Consulta de 35 dias aparece vencida (C-006) | must |
| RF-009 | O sistema DEVE registrar a análise financeira (ativo e passivo circulante, patrimônio líquido, dívida bancária, EBITDA) e calcular liquidez corrente, dívida/EBITDA e dívida/PL | AC 80.000 e PC 100.000 mostram LC 0,80 | must |
| RF-010 | O sistema DEVE registrar a fonte pagadora (tipo, quem paga, prazo de recebimento) e mostrar os alertas dela | RN-014 | must |
| RF-011 | O sistema DEVE registrar a garantia oferecida | Lista: Sem garantia, Aval dos sócios, Nota promissória, Carta fiança, Seguro de crédito, Outra | must |
| RF-012 | O sistema DEVE registrar a confirmação cadastral — telefone, endereço e contato financeiro —, cada uma marcada como feita, com quem marcou e quando, e o contato financeiro confirmado escolhido na ficha de contatos do cliente | C-005 | must |
| RF-013 | O sistema DEVE listar os documentos exigidos pela faixa de valor e mostrar quais já estão atendidos | RN-012 | must |
| RF-014 | O sistema DEVE permitir anexar documentos à solicitação, e ter um lugar próprio para o termo de concessão assinado na Formalização | Sem o termo anexado a solicitação não entra em Liberação (C-016) | must |
| RF-015 | O sistema DEVE calcular o motor de crédito da carteira. Privada e Estética: score comportamental, score final, faixa, alertas, limite sugerido, concentração, resultado e alçada. Pública: o motor do órgão (spec 005), pelo mesmo ponto de entrada | C-007 a C-010; C-036 | must |
| RF-016 | O sistema DEVE ter um rating único, a faixa do semáforo (AA, A, B, C, D, E), calculado pelo motor, sem campo de rating digitado | Não existe a escala AA–H em tela nenhuma | must |
| RF-017 | O sistema DEVE permitir ajustar o rating com justificativa e aprovação de quem está acima do analista | C-011 | must |
| RF-018 | O sistema DEVE registrar a decisão do Comitê / Alçada com responsável (quem está logado), cargo ou nome do comitê, limite aprovado, plano e forma de pagamento aprovados, parecer e data | C-013, C-014 | must |
| RF-019 | O sistema DEVE recusar a decisão de quem não tem a alçada do valor na carteira e de quem é o analista da solicitação | C-012, C-013, C-035 | must |
| RF-020 | O sistema DEVE tratar como exceção ao motor — decisão do Comitê de crédito, com justificativa — o limite aprovado acima do sugerido, o rating ajustado, o alerta de fraude e o "levar ao comitê" do motor | C-015, C-011 | must |
| RF-021 | O sistema DEVE congelar o rating na concessão no dia da decisão e manter o rating atual recalculado depois de cada sincronização com o Winthor | C-013, C-026 | must |
| RF-022 | O sistema DEVE gerar a pendência "Aplicar no Winthor" com limite, plano e forma aprovados, e só levar o crédito a gestão depois que alguém marcar a pendência como aplicada; o crédito novo substitui o vigente do mesmo cliente | C-016, C-039 | must |
| RF-023 | O sistema DEVE manter a lista de pendências para o Winthor (aplicar limite, bloquear limite, liberar pedido), com quem gerou, quem aplicou e quando | Pendência aplicada sai da lista de abertas e fica no histórico | must |
| RF-024 | O sistema DEVE mostrar a carteira em gestão com limite aprovado, limite e utilizado lidos do Winthor, disponível, vencido, a vencer, índice de inadimplência, plano e forma aprovados, uso, criticidade, rating atual, validade, compras no período, última compra, destino ao vencer e pedidos retidos | C-017 sinaliza divergência | must |
| RF-025 | O sistema DEVE encaminhar sozinho, todos os dias, o crédito vencido ou sem compras para Reanálise ou Cadastro obsoleto, nas três carteiras | C-018 | must |
| RF-026 | O sistema DEVE permitir, na Reanálise, renovar por mais um período ou encerrar como obsoleto, pela alçada do limite vigente; e permitir ao Supervisor ou acima (ou a quem tem a marca de administrador) antecipar a reanálise de um crédito em gestão de cliente que ele vê | C-019 | must |
| RF-027 | O sistema DEVE permitir recusar a solicitação em qualquer etapa ativa, com motivo | C-020 | must |
| RF-028 | O sistema DEVE conduzir o pedido acima do limite por Retido por limite (2 h), Análise do excesso (4 h) e Aprovação da alçada (8 h) até Liberado ou Recusado, com o checklist de cada etapa | C-021, C-025 | must |
| RF-029 | O sistema DEVE calcular o excesso do pedido e a alçada exigida, e recusar a entrada de pedido que cabe no limite | C-021 | must |
| RF-030 | O sistema DEVE exigir na liberação a condição (liberação pontual, aumento temporário, mediante garantia adicional, pagamento antecipado ou sinal, liberação parcial), plano e forma; parecer quando crítica ou cliente bloqueado pela régua; e recusar quem é o analista do pedido ou quem o lançou | C-022, C-023 | must |
| RF-031 | O sistema DEVE mostrar a flexibilização do limite do cliente (limite, teto flexível e motivos que impedem) na ficha do crédito e na do pedido | C-024 | must |
| RF-032 | O sistema DEVE mostrar o semáforo: faixas com cortes e diretrizes, simulador de limite, carteira por faixa, clientes por farol (limite atual × sugerido) e validação do farol | C-027, C-028 | must |
| RF-033 | O sistema DEVE guardar uma foto mensal da carteira por faixa e registrar a revisão trimestral do semáforo, avisando quando ela vence | C-029 | should |
| RF-034 | O sistema DEVE mostrar a saúde das análises aprovadas por agente e por rating na concessão, e a lista das que estão em atenção ou risco | C-030 | must |
| RF-035 | O sistema DEVE mostrar risco não previsto e risco aceito, por rating na concessão e por agente | C-026 | must |
| RF-036 | O sistema DEVE mostrar o desempenho por agente (em carteira, fora do prazo agora, decididas, aprovação, tempo médio de decisão, SLA cumprido, volume aprovado, pedidos decididos, tempo médio do pedido, clientes em risco), o tempo médio por etapa × SLA e as decisões críticas por responsável, no período escolhido (30, 90 — padrão —, 365 dias ou tudo) | C-031 | must |
| RF-037 | O sistema DEVE classificar a criticidade de cada cliente com solicitação ativa ou crédito vigente e listar os sinalizados com as regras acionadas e o valor medido de cada sinal | C-032 | must |
| RF-038 | O sistema DEVE limitar esteira, carteira, pedidos e quadros pela hierarquia de quem está logado, e recusar quem não faz parte da equipe | C-033, C-038 | must |
| RF-039 | O sistema DEVE mostrar os indicadores da esteira (em análise, taxa de aprovação, fora do SLA, enviadas para gestão) e o funil por etapa (quantidade, valor, fora do SLA) | Com 3 em análise, 1 fora do SLA, 3 aprovadas e 1 recusada: 3, 75%, 1 | should |
| RF-040 | O sistema DEVE tratar a Estética como o privado, com quadro próprio e os parâmetros da carteira Estética sobrepondo os gerais | RN-036, C-037 | must |
| RF-041 | O sistema DEVE manter o histórico de etapas de cada solicitação e pedido, sem limite de entradas | Solicitação com 45 movimentos mostra os 45 | must |
| RF-042 | O sistema DEVE listar os créditos em gestão com gatilho de revisão ativo (atraso, uso do limite, negativação, validade vencendo) | C-040 | must |
| RF-043 | O sistema DEVE mostrar os mostradores de flexibilização do período (pedidos decididos, liberados, taxa de flexibilização e liberações dentro da regra) contra as metas | C-041 | should |
| RF-044 | O sistema DEVE mostrar a cada pessoa a sua fila do crédito: solicitações com prazo de decisão, ajustes de rating a decidir, decisões na sua alçada, pendências para o Winthor, reanálises e pedidos | C-042 | must |
| RF-045 | O sistema DEVE servir as três carteiras com as mesmas telas e as mesmas regras: órgão público só entra pela carteira Pública, com as etapas, a alçada e o motor dela; criticidade, semáforo, saúde e flexibilização não se aplicam à Pública | C-034, C-035, C-036; RN-038 | must |

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | Esteira, carteira em gestão e pedidos respondem em até 2 s com 5.000 solicitações e 3.000 créditos | Cronômetro com massa de teste |
| RNF-002 | O cálculo do motor responde em até 2 s | Cronômetro na ficha |
| RNF-003 | A rotina (recálculo do rating atual, encaminhamento, foto mensal) respeita o orçamento de cada rodada e continua na rodada seguinte, com 3.000 créditos | Execução no simulador com 3.000 créditos semeados |
| RNF-004 | Abrir o card de uma solicitação gasta no máximo 2 chamadas ao servidor (mais 1 por módulo que estende o card, como o bloco do órgão na Pública); abrir uma tela, no máximo 6; uma ação de escrita, no máximo 20 execuções | Contagem de chamadas no simulador |
| RNF-005 | Toda escrita de negócio fica na auditoria com quem, quando, antes e depois | Auditoria de uma decisão mostra os campos |

## Entidades do domínio

- **Carteira** — Privada, Estética ou Pública. Define o quadro (etapas, prazos,
  checklist), o valor dos parâmetros e o motor de análise. O órgão público é
  sempre da Pública; o cliente privado, da Privada ou da Estética.
- **Solicitação de crédito** — pedido de análise de limite para um **Cliente**
  (do cadastro da `001`), numa carteira, com valor, prazo, justificativa, tipo
  de cliente, analista responsável e o que a análise produziu (consultas,
  financeira, fonte pagadora, garantia, score, alertas, limite proposto,
  parecer). Um cliente pode ter várias ao longo do tempo, uma em andamento por
  vez. Os dados próprios do órgão público ficam com a `005`.
- **Card** — o cartão da solicitação no quadro da carteira. Guarda a etapa, o
  checklist, os anexos e o histórico de passagem. O mesmo card acompanha a
  solicitação e, aprovada, o crédito que nasce dela, inclusive nas renovações.
- **Passagem de etapa** — entrada e saída de um card numa etapa, com quem
  moveu. É a base do SLA e do tempo por etapa.
- **Decisão** — o que a alçada decidiu sobre uma solicitação, uma renovação ou
  um pedido: quem, com que cargo ou comitê, resultado, limite, plano, forma,
  parecer, condição (pedido), justificativa de exceção, rating na data.
- **Crédito** — período de crédito vigente de um cliente nascido de uma decisão:
  limite aprovado, plano e forma, início e fim da validade, rating na concessão,
  situação (gestão, reanálise, obsoleto, encerrado). Renovar abre outro período;
  um cliente tem no máximo um crédito vigente.
- **Risco do cliente** — a fotografia atual do motor para o cliente: score
  comportamental e final, faixa (= rating atual), alertas, se foi rebaixado,
  criticidade com motivos, saúde, flexibilização, gatilhos de revisão.
  Recalculada pela rotina. Não existe para a carteira Pública.
- **Pedido retido** — pedido do Winthor que leva a exposição além do limite:
  número, valor, limite, utilizado e atraso do cliente na data, excesso, alçada,
  analista, RCA, decisão. Tem card próprio, no quadro de pedidos.
- **Pendência para o Winthor** — ação que alguém precisa fazer à mão no ERP
  (aplicar limite, bloquear limite, liberar pedido), com quem gerou e quem aplicou.
- **Foto de calibração** — a carteira por faixa num mês (cliente, faixa, score,
  atraso, vencido, limite, utilizado).
- **Revisão do semáforo** — o registro trimestral de que os cortes foram revistos.

## Regras de negócio

Todo número abaixo é parâmetro da Política (constitution II), com o padrão
indicado e a chave do catálogo entre crases; o valor pode ser próprio de cada
carteira e, sem valor próprio, vale o da Privada.

- **RN-001 — Tipo de cliente sugerido.** Cliente com crédito em gestão ou
  reanálise = recorrente ("crédito ativo na carteira"); senão, com crédito em
  cadastro obsoleto = inativo ("cadastro obsoleto"); senão, com qualquer
  solicitação anterior = recorrente ("já tem solicitação registrada"); senão novo.
- **RN-002 — Etapas, SLA e prazo de decisão.** As etapas, os prazos e o
  checklist são configuração do quadro de cada carteira; os padrões são:
  Privada e Estética — Solicitação recebida 1 dia · Documentação e análise
  cadastral 3 · Análise de crédito 3 · Comitê / Alçada 2 · Formalização 2 ·
  Liberação 1. Pública — Recebimento da solicitação 1 · Análise documental e
  financeira 8 · Classificação de risco e aprovação 2. Nas três, Reanálise 5.
  Gestão, Obsoleto, Recusadas e Encerradas não têm SLA. Pedido: Retido por
  limite 2 h · Análise do excesso 4 h · Aprovação da alçada 8 h. O SLA conta em
  horas corridas (P-18); decorrido maior que o SLA = fora. Prazo de decisão da
  solicitação = abertura + soma dos SLAs das etapas até a de decisão, inclusive
  (9 dias na Privada e na Estética, 11 na Pública), gravado na abertura.
- **RN-003 — Checklists (texto exato; padrão do quadro, que quem administra pode alterar).**
  - Solicitação recebida: Proposta assinada pelo cliente · Documento de identificação recebido · Autorização de consulta ao SCR e aos bureaus assinada (LGPD)
  - Documentação e análise cadastral: Consulta Serasa / Boa Vista · Consulta SCR (endividamento bancário) · Restritivos e protestos verificados · Grupo econômico mapeado · Confirmação por contato telefônico com o cliente · Confirmação de endereço (comprovante, visita ou foto da fachada) · Contato financeiro identificado e confirmado · Comprovante de renda ou faturamento · Comprovante de endereço · Contrato social e últimas alterações (PJ) · Situação na Receita Federal e quadro societário (QSA) conferidos · Ações judiciais, falência e recuperação judicial pesquisadas · Sócios e empresas ligadas sem débitos com o grupo
  - Análise de crédito: Capacidade de pagamento calculada · Score e rating atribuídos · Limite e condições sugeridos · Parecer do agente
  - Comitê / Alçada: Alçada de aprovação definida · Proposta apresentada · Decisão e condições registradas
  - Formalização: Termo de concessão de limite / contrato de fornecimento emitido · Garantias formalizadas, quando exigidas (aval, nota promissória, fiança ou seguro de crédito) · Termo assinado digitalmente · Poderes de quem assina conferidos (contrato social ou procuração)
  - Liberação: Conferência final de documentos · Limite cadastrado e ativo no ERP
  - Gestão de crédito: Limite cadastrado no ERP · Validade de 3 meses registrada · Monitoramento de exposição ativo · Garantias e covenants acompanhados
  - Reanálise: Histórico de compras e pagamentos revisado · Serasa e SCR atualizados · Limite reavaliado · Parecer de renovação registrado
  - Cadastro obsoleto: Limite bloqueado no ERP · Cliente informado
  - Recusadas: Motivo da recusa registrado · Cliente comunicado
  - Pública — Recebimento da solicitação: Solicitação da área Comercial ou de Licitação · Órgão público identificado · Valor e prazo da operação definidos. Análise documental e financeira: Contrato ou ata, empenho e ordem de fornecimento · Dotação orçamentária e autorização da despesa · Publicação da contratação, quando aplicável · Capacidade financeira do ente avaliada · Histórico de pagamentos e restos a pagar verificados. Classificação de risco e aprovação: Risco da operação classificado · Aprovação conforme a política e as alçadas. As etapas depois da aprovação não têm checklist no artefato (P-29).
  - Pedido — Retido por limite: Excesso confirmado no ERP · Agente responsável atribuído. Análise do excesso: Títulos em aberto e atrasos verificados · Histórico de pagamento consultado · Exposição do grupo econômico revisada · Recomendação registrada. Aprovação da alçada: Alçada competente acionada · Condição de liberação definida. Liberado: Desbloqueio feito no ERP · Comercial avisado. Recusado: Motivo registrado · Comercial avisado.
- **RN-004 — Condições de mudança de etapa (servidor).** Avança-se só para a
  etapa seguinte, nunca pulando, e sempre dentro do card aberto, em "Mover
  para". Para entrar em:
  - a segunda etapa (saindo da de entrada): valor > 0, prazo > 0 e analista atribuído.
  - Análise de crédito: confirmações de telefone, endereço e contato
    financeiro marcadas; consultas obrigatórias registradas (Receita, protestos,
    processos e, para PJ, sócios) com data dentro da validade (RN-011).
  - Comitê / Alçada (Privada e Estética): score Serasa informado; fonte
    pagadora informada; rating efetivo calculado e sem ajuste aguardando
    aprovação; limite proposto > 0; parecer do analista; análise financeira
    (AC, PC, PL) preenchida quando o valor passa de `limite.docF2`.
  - Classificação de risco e aprovação (Pública): itens "Contrato ou ata,
    empenho e ordem de fornecimento" e "Dotação orçamentária" marcados e a
    análise do órgão completa (regra da spec 005).
  - a etapa seguinte à de decisão: só pela decisão "aprovada" (RN-009).
  - Liberação: termo de concessão assinado anexado e, se houver garantia, o
    item "Garantias formalizadas" marcado.
  - Gestão de crédito, Reanálise, Cadastro obsoleto, Recusadas e Encerradas:
    ninguém move à mão; é o sistema que leva o card, quando a pendência é
    aplicada, na decisão, no encaminhamento ou na recusa.
  Os demais itens do checklist e os documentos exigidos pela faixa de valor
  (RN-012) não travam: faltando, viram ressalva para a alçada.
- **RN-005 — Voltar etapa.** Até a decisão, a solicitação pode voltar para uma
  etapa anterior; a tela pede o motivo, que fica como nota no card (P-28: o
  motivo não é trava do servidor). Depois da decisão não se volta: ou segue, ou
  é recusada.
- **RN-006 — Recusa.** Recusar exige motivo, em qualquer etapa ativa. Antes da
  etapa de decisão, recusa o analista do caso ou quem está acima dele. Na etapa
  de decisão, recusar é decisão: valem a alçada, a segregação e o parecer
  (RN-007 a RN-009).
- **RN-007 — Segregação de funções.** O analista da solicitação não registra a
  decisão dela nem a renovação do crédito que analisou; nem o analista do
  pedido nem quem o lançou o libera. Vale mesmo com alçada. Também não decide
  quem propôs, mesmo sendo o superior: quem já gravou o limite proposto, o
  parecer, o cálculo do motor, o ajuste de rating ou um dado da solicitação
  que entra no motor (mesmo sem mudar o resultado do motor), na carteira
  Pública quem já gravou a análise do órgão, e quem já gravou a recomendação
  do pedido. Vale para todos os que gravaram, não só para o último. O analista só é trocado
  antes da etapa de decisão (no pedido, antes da Aprovação da alçada), e a
  solicitação que chegou à etapa de decisão só sai dela pela decisão.
- **RN-008 — Alçada da concessão.** Valor da alçada = o maior entre o limite
  proposto pelo analista e o limite aprovado na decisão (enquanto não há
  proposta, o valor solicitado); na renovação, o limite vigente. Privada e Estética: até R$ 50.000 (`alcada.concSupervisor`)
  Supervisor (nível 2) · até R$ 500.000 (`alcada.concGerente`) Gerente (3) ·
  até R$ 2.000.000 (`alcada.concRegional`) Comitê regional (3; P-46) · acima, Comitê
  executivo (5). Pública: até R$ 100.000 Supervisor · até R$ 1.000.000 Gerente
  · acima, Diretoria (5); não há Comitê regional. Decide quem tem nível de
  cargo maior ou igual ao exigido; para comitê, a pessoa registra em nome do
  comitê, que fica no campo cargo/alçada. Exceção ao motor (RN-010) é sempre do
  Comitê de crédito (nível 5, `alcada.nivelComiteCredito`; P-17). A alçada é o
  nível do cargo: a marca de administrador não dá alçada (D-06). Quem tem a
  alçada decide mesmo sem ser do caso (de outra equipe), igual nas três
  carteiras.
- **RN-009 — Decisão completa.** Aprovar exige: responsável (sempre quem está
  logado, nunca digitado), parecer, limite aprovado > 0, plano de pagamento,
  forma de pagamento e, onde a carteira as exige, consultas ainda válidas na
  data. Formas: Boleto bancário, PIX, Cartão de crédito, Cartão BNDES,
  Transferência (TED), Depósito antecipado, Cheque. Planos: os do Winthor.
  Recusar exige responsável e parecer. "Pré-aprovada" só existe na carteira
  Pública: o órgão ainda sem contrato ativo só pode ser pré-aprovado ou
  recusado (P-22); a solicitação fica na etapa de decisão até a aprovação.
- **RN-010 — Exceção ao motor.** São exceção: limite aprovado acima do
  sugerido pelo motor; rating ajustado pelo analista (mesmo aprovado pelo
  superior); alerta de fraude ativo (CNPJ recente ou pedido inicial alto,
  RN-018); e os resultados "Levar ao comitê: concentração" e "Exceção com
  garantia: levar ao comitê" (RN-021). Toda exceção é decidida pelo Comitê de
  crédito e exige justificativa de exceção, gravada na decisão. Na Pública a
  única exceção é o limite aprovado acima da exposição sugerida pelo motor do
  órgão (os demais termos são do motor da Privada e da Estética).
- **RN-011 — Consultas.** Valem `limite.consultaValidadeDias` = 30 dias a
  partir da data das consultas. Resultado negativo vira alerta automático:
  Receita "Irregular", protestos "Com protesto", processos "Com processo
  relevante", sócios "Com restrição".
- **RN-012 — Documentos exigidos.** Sempre: Relatório Serasa, Pesquisa de
  protestos, Consulta de processos; para PJ também Comprovante do CNPJ (Receita)
  e Consulta dos sócios (o artefato pedia os dois últimos sempre; para pessoa
  física não fazem sentido). Com valor da alçada acima de `limite.docF1` =
  R$ 100.000: + Comprovante de faturamento. Acima de `limite.docF2` =
  R$ 500.000: + Balanço / DRE. Com garantia: + Garantia (aval, promissória,
  fiança). Também: ficha de contatos do cliente em dia (validade da `001`).
  Um documento está atendido quando o item correspondente do checklist está
  marcado (o arquivo fica nos anexos do card); o Balanço / DRE, quando a
  análise financeira (AC, PC, PL) está preenchida; a ficha de contatos, quando
  está em dia.
- **RN-013 — Análise financeira.** Liquidez corrente = AC ÷ PC (2 casas);
  dívida/EBITDA = dívida ÷ EBITDA (1 casa, "×"); dívida/PL = dívida ÷ PL
  (2 casas). Viram alerta automático: LC < 1 (`limite.lcMin`); dívida > 3 ×
  EBITDA (`limite.divEbitdaMax`); PL ≤ 0.
- **RN-014 — Fonte pagadora.** Tipos: Recursos próprios (vendas do cliente);
  Operadora de plano de saúde / convênio; SUS (repasse público); Paciente /
  consumidor final; Misto (várias fontes); Outra. Avisos (não rebaixam):
  prazo de recebimento da fonte > prazo médio + 15 dias
  (`limite.fonteDescasDias`) = "descasamento de prazo"; SUS = "depende de
  repasse público, sujeito a atrasos"; operadora = "sujeito a glosas e atraso
  das operadoras"; não informada = "informe de onde vem o dinheiro".
- **RN-015 — Score comportamental (0–1000).** Sem pontualidade conhecida e
  cliente novo = não há. Senão: base = pontualidade (máx. 100) × 10, ou 700
  (`score.semHistorico`) sem pontualidade; menos 10 por dia de atraso
  (`score.penalDia`), no máximo 600 (`score.penalMax`); +50 se recorrente
  (`score.bonusRecorrente`), −50 se inativo (`score.penalInativo`); limitado a
  0–1000 e arredondado.
- **RN-016 — Score final.** Sem score Serasa = não há (o motor pede o score);
  score 0 é um score válido, "não informado" é o campo vazio. Sem
  comportamental = o Serasa. Senão = 60% Serasa (`limite.pesoSerasa`) + 40%
  comportamental, arredondado.
- **RN-017 — Faixa.** Pelo score final (`farol.score*`): AA 800–1000 · A
  600–799 · B 400–599 · C 200–399 · D 0–199. Pelo atraso (`farol.atraso*`):
  0 dia AA · até 5 A · até 15 B · até 30 C · até 45 D · acima E. Faixa = a pior
  das duas, rebaixada uma posição por alerta, no máximo E. E só se alcança por
  atraso ou rebaixamento.
- **RN-018 — Alertas.** Manuais: Negativação, Dados inconsistentes, Pedido fora
  da realidade. Automáticos: os quatro da RN-011; os dois de fraude — CNPJ com
  menos de 12 meses (`limite.fraudeMeses`) e cliente novo pedindo mais de 50%
  do faturamento mensal (`limite.fraudePct`, "Pedido inicial alto"); os três da
  RN-013.
- **RN-019 — Limite sugerido pela política.** Prazo considerado = o prazo
  médio, no mínimo 30. Base = compra média × prazo ÷ 30 × 1,2 (`limite.folga`);
  sem compra média, 10% do faturamento mensal (`limite.novoPct`); sem os dois,
  não há cálculo. Com PL informado, a base não passa de 10% do PL
  (`limite.plPct`). Sem score: limite = base, até 30% do faturamento
  (`limite.tetoPct`). Com faixa (`farol.<faixa>*`): AA 100%–120% da base, teto
  30% do faturamento, prazo máx. 60 dias; A 100%, teto 25%, 45 dias; B 70%–90%,
  teto 20%, 42 dias; C até 50%, teto 15%, 35 dias; D e E sem crédito a prazo
  (R$ 0). Valores arredondados ao milhar. O faturamento mensal é o do cliente,
  informado pelo analista.
- **RN-020 — Concentração.** Carteira = soma dos limites vigentes (gestão e
  reanálise) dos outros clientes + o limite calculado. Teto = 10%
  (`limite.concMax`) da carteira. Disponível = teto − limites vigentes das
  outras empresas do mesmo grupo econômico (cliente sem grupo é o próprio
  grupo), no mínimo zero. Limite acima do disponível cai para o disponível,
  arredondado para baixo ao milhar.
- **RN-021 — Resultado do motor**, nesta ordem: sem base de cálculo ou sem
  score = "Dados insuficientes"; faixa E = "Negar a prazo: somente à vista";
  faixa D sem garantia = "Negar a prazo: somente à vista"; faixa D com garantia
  = "Exceção com garantia: levar ao comitê"; limite zerado pela concentração =
  "Levar ao comitê: concentração"; solicitado ≤ sugerido = "Aprovar" (com a
  ressalva dos documentos exigidos que faltam); senão "Aprovar com limite de X"
  com o percentual pedido acima do motor.
- **RN-022 — Rating único.** Rating = faixa da RN-017. O analista pode
  ajustá-lo para outra faixa com justificativa; o ajuste só vale depois de
  aprovado por um superior dele (direto ou indireto) e fica na auditoria. O
  rating na concessão é o efetivo no dia da decisão e não muda mais. O rating
  atual é o motor recalculado com o score Serasa e os alertas da última análise
  e o comportamento lido do Winthor (atraso, pontualidade), depois de cada
  sincronização. O ajuste aprovado continua valendo no rating atual enquanto o
  motor recalculado der a mesma faixa que deu na concessão; quando o motor
  muda de faixa, vale o motor.
- **RN-023 — Validade.** O crédito vale 3 meses (`cred.validadeMeses`) a partir
  da entrada em gestão ou da renovação. Somar meses em fim de mês cai no último
  dia do mês de destino: 30/11/2026 + 3 meses = 28/02/2027.
- **RN-024 — Encaminhamento.** Vale para as três carteiras. Dias sem compra =
  hoje − última compra (ou, sem compra, − início da validade). Com 90 dias sem
  compra (`cred.diasSemCompra`), vai para obsoleto mesmo com validade em dia.
  Validade vencida (fim anterior a hoje): com 2 ou mais compras no período
  (`cred.comprasRecorrentes`) vai para reanálise; com menos, obsoleto. Compras
  no período = notas emitidas para o cliente na janela de compras lida do
  Winthor (90 dias). O motivo fica gravado.
- **RN-025 — O sistema não escreve no Winthor.** Toda ação no ERP vira
  pendência: a aprovação gera "Aplicar no Winthor" (limite, plano, forma), que
  só pode ser marcada como aplicada com a solicitação em Liberação (na Pública,
  logo depois da decisão); ir para obsoleto gera "Bloquear limite no Winthor";
  liberar pedido gera "Liberar pedido N no Winthor". Limite lido do Winthor
  diferente do aprovado vigente aparece como divergência.
- **RN-026 — Flexibilização.** Só para crédito vigente com faixa (não existe
  na Pública): AA até +20% (`flex.riscoMinimoPct`), A até +10%
  (`flex.riscoBaixoPct`), demais 0%. Zera se houver: títulos vencidos;
  pontualidade informada abaixo de 90% (sem pontualidade informada não zera,
  como no artefato); bloqueio da régua de cobrança; validade vencida; faixa
  rebaixada por alerta; sem score. Valor = limite × % arredondado ao milhar,
  limitado pela concentração (RN-020). A alçada do pedido é sempre a da RN-027;
  estar dentro do teto flexível é só um indicador da liberação ("dentro da regra");
  acima do teto flexível também segue a tabela (P-45).
- **RN-027 — Excesso e alçada do pedido.** Excesso = utilizado + pedido −
  limite (mínimo 0); % = excesso ÷ limite. Excesso zero = o pedido não entra.
  Atraso do cliente acima de 15 dias (`alcada.pedAtrasoComiteDias`) = Comitê de
  crédito; até 10% (`alcada.pedSupPct`) e até R$ 20.000 (`alcada.pedSupValor`)
  = Supervisor (2); até 25% (`alcada.pedGerPct`) = Gerente (3); até 50%
  (`alcada.pedDirPct`) = Diretor financeiro (5; P-12); acima = Comitê de
  crédito (5). Diretor financeiro e Comitê de crédito são liberações críticas.
  Limite, utilizado e atraso são os da data do registro do pedido.
- **RN-028 — Liberação do pedido.** Exige condição, plano e forma. Exige
  parecer quando a liberação é crítica ou o cliente está bloqueado pela régua de
  cobrança. Recusar exige motivo.
- **RN-029 — Saúde da análise aprovada.** Risco = atraso acima de 30 dias
  (`saude.riscoDias`). Atenção = atraso de 1 a 30 dias, uso do limite ≥ 90%
  (`saude.usoAtencaoPct`) ou validade vencida. Saudável = o resto. Índice de
  saúde = saudáveis ÷ aprovadas: verde ≥ 80% (`saude.indiceVerde`), vermelho
  < 60% (`saude.indiceVermelho`). É a definição única de saúde: o painel
  executivo lê a mesma classificação.
- **RN-030 — Risco não previsto × aceito.** O corte é a faixa C
  (`cred.riscoCorteRating`). Não previsto = rating na concessão AA, A ou B e
  rating atual C ou pior. Aceito = rating na concessão C ou pior.
- **RN-031 — Desempenho (definições que o painel executivo também usa).**
  Decidida = solicitação com decisão da alçada (aprovada, pré-aprovada ou
  recusada), na data da primeira decisão; a recusa do analista antes da etapa
  de decisão não é decisão. No prazo = decidida até o prazo de decisão
  (RN-002). SLA cumprido = decididas no prazo ÷ decididas, meta 85%
  (`meta.slaPct`). Tempo de decisão = dias corridos da abertura à decisão, com
  meta de 9 dias para a média (`meta.tempoDecisaoDias`). Aprovação = aprovadas
  e pré-aprovadas ÷ decididas, faixa esperada de 60% a 85%
  (`meta.aprovacaoMinPct`, `meta.aprovacaoMaxPct`). Fora do prazo agora =
  solicitações ainda sem decisão com o prazo de decisão vencido. Tempo médio
  por etapa = média das passagens concluídas no período, comparada com o SLA da
  etapa; a passagem em curso não entra. Pedido: tempo = horas do registro à
  decisão. Agente = o analista da solicitação ou do pedido. O período vale pela
  data da decisão.
- **RN-032 — Criticidade.** Sinais (alerta / crítico, `crit.*`): atraso ≥ 1 /
  ≥ 30 dias; pontualidade < 90% / < 80%; score Serasa < 600 / < 400 (só se
  informado; 0 é score válido); uso do limite ≥ 90% / ≥ 100%; prazo médio > 60
  / > 90 dias; rating atual D / E; faixa rebaixada por alerta: crítico se a
  faixa é C ou pior, senão alerta. Sem nenhum crítico e com 3 ou mais alertas
  (`crit.alertasParaCritico`) = crítico ("N sinais de alerta ao mesmo tempo").
  Nível = crítico, alerta ou normal. Não se calcula para a carteira Pública.
- **RN-033 — Validação do farol.** Por faixa, sobre as fotos mensais da
  carteira (RN-034): índice = vencido ÷ (vencido + a vencer). Inadimplência
  esperada (`farol.<faixa>Inad`): AA até 1%, A 2%, B 5%, C 10%, D 20%. Leitura,
  nesta ordem: D e E = "Faixa sem crédito a prazo"; sem clientes = "Sem
  carteira"; índice maior que o da próxima faixa pior com carteira = "Fora da
  ordem"; acima do esperado = "Acima do esperado: revisar o corte"; senão
  "Dentro do esperado". Com menos de 12 meses de fotos (`cred.calibMinMeses`) a
  leitura sai com o aviso de base insuficiente; sem nenhuma foto, não há leitura.
- **RN-034 — Foto e revisão.** Na virada de cada mês o sistema guarda uma foto
  da carteira por faixa do mês que fechou; o mesmo mês nunca é fotografado duas
  vezes. Revisão do semáforo a cada 3 meses (`cred.calibRevisaoMeses`): passado
  o prazo desde a última, aparece o aviso. Registra a revisão quem administra:
  Gerente ou acima, ou a marca de administrador.
- **RN-035 — Visibilidade.** Cada pessoa vê os clientes em que é o analista de
  crédito ou o agente de cobrança; supervisor, os seus e os dos subordinados
  diretos e indiretos; gerente, diretoria e administrador, tudo. O corte é do
  servidor.
- **RN-036 — Estética.** Segue esta esteira e este motor, em quadro próprio. A
  carteira da solicitação escolhe os parâmetros: valor da carteira Estética
  sobrepõe o geral; hoje nenhum parâmetro da Estética tem valor próprio (P-03).
- **RN-037 — Auditoria.** Toda escrita desta spec (abertura, campo da análise,
  ajuste de rating, decisão, pendência aplicada, encaminhamento, revisão) grava
  quem, quando, antes e depois; o que a rotina faz fica em nome de "Rotina";
  ninguém edita nem apaga. Marcação de checklist e mudança de etapa ficam no
  histórico do card. Solicitação não se exclui: desiste-se dela recusando, com
  motivo.
- **RN-038 — Carteiras (D-05).** A carteira é escolhida na abertura: órgão
  público só entra na Pública e só ele entra nela; para os demais, o sistema
  sugere a carteira (Privada ou Estética) das BUs em que o cliente mais comprou
  nos últimos 90 dias, e o analista pode trocar. As regras desta spec são as
  mesmas nas três; mudam, por carteira, as etapas do quadro, o valor dos
  parâmetros e o motor. Na Pública: o motor é o do órgão (spec 005), o rating
  mostrado é P1–P4 (nunca gravado como AA–E), o crédito nasce na decisão e não
  se calculam criticidade, semáforo, saúde, flexibilização nem gatilhos de
  revisão; validade, encaminhamento, renovação, recusa, segregação e alçada
  valem como nas outras. O pedido acima do limite usa a carteira do crédito do
  cliente.
- **RN-039 — Gatilhos de revisão.** Um crédito em gestão entra na lista de
  revisão quando: atraso ≥ 15 dias (`cred.revAtrasoDias`); uso do limite ≥ 90%
  (`cred.revUsoPct`); alerta de negativação na última análise; ou validade
  vencendo em até 15 dias. Sai da lista quando o gatilho deixa de valer.
- **RN-040 — Mostradores de flexibilização.** No período, pela data da decisão
  do pedido: taxa de flexibilização = pedidos liberados ÷ pedidos decididos,
  meta até 30% (`flex.metaTaxaPct`); dentro da regra = liberações em que a
  exposição com o pedido ficou até o teto flexível do cliente ÷ liberações,
  meta de pelo menos 90% (`flex.metaConfPct`).
- **RN-041 — Fila do crédito.** Entram na fila de uma pessoa: solicitação em
  que é o analista, com o prazo de decisão (atrasada quando vencido); ajuste de
  rating de um subordinado aguardando a sua aprovação; solicitação ou reanálise
  aguardando decisão numa alçada que o nível do cargo dela atende (a marca de
  administrador não conta) e em que ela não é o analista nem quem propôs
  (RN-007); pendência para o Winthor aberta dos seus casos; pedido retido em
  que é o analista. Cada linha é de cliente que a pessoa vê. A fila de outra
  pessoa só é vista por quem está acima dela.
- **RN-042 — Vínculo com a equipe.** Quem tem login mas não é membro ativo da
  equipe não lê nem grava nada desta spec; a escrita é recusada com a mensagem
  de que a pessoa não faz parte da equipe.
- **RN-043 — Um crédito vigente por cliente.** Quando um crédito novo entra em
  gestão para um cliente que já tem crédito vigente, o anterior é encerrado
  como substituído, com auditoria, e o card dele vai para "Encerradas".

## Testes

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001 | Cliente com crédito em gestão → sugestão "recorrente"; abertura com R$ 25.000 cria 1 solicitação na etapa Solicitação recebida, com card e prazo de decisão 23/11/2026 | regra de negócio |
| C-001 | Sugestão "recorrente" de cliente com crédito vigente mostra o motivo "crédito ativo na carteira" | regra de tela |
| C-002 | Cliente com último crédito obsoleto → "inativo"; cliente sem solicitação → "novo" | regra de negócio |
| C-003 | Abertura com justificativa "   " → recusada, mensagem cita "justificativa"; o número de solicitações não muda | regra de negócio |
| C-004 | Limite 100.000, utilizado 90.000, pedido 15.000 → pedido em Retido por limite, excesso 5.000, 5%, alçada "Supervisor" | regra de negócio |
| C-005 | Mover para Análise de crédito com endereço e contato financeiro por marcar → recusado; o que falta cita "endereço" e "contato financeiro"; a etapa continua a mesma | regra de negócio |
| C-006 | Consultas com data de 35 dias atrás → mudança recusada, mensagem cita as consultas | regra de negócio |
| C-007 | Motor com os dados do cenário → comportamental 1000, final 850, rating AA, limite 24.000–29.000, "Aprovar", alçada "Supervisor" | regra de negócio |
| C-008 | Atraso 10 + Negativação → final 810, faixa do atraso B, rating C, rebaixado, limite 12.000, resultado contém "12.000" e "108%" | regra de negócio |
| C-009 | Novo, Serasa 150, faturamento 100.000 → rating D, limite 0, "Negar a prazo"; com "Aval dos sócios" → "Exceção com garantia" | regra de negócio |
| C-010 | Carteira 900.000 com 80.000 do grupo, política 50.000 → teto 95.000, disponível 15.000, limite 15.000; grupo com 95.000 → "Levar ao comitê: concentração" | regra de negócio |
| C-011 | Ajuste sem justificativa recusado; com justificativa fica pendente e a ida ao Comitê é recusada; Ana recusada; Sérgio aprova → rating efetivo B, 1 linha de auditoria do ajuste e alçada exigida "Comitê de crédito" | regra de negócio |
| C-012 | Sérgio analista e decisor de R$ 30.000 → recusado, mensagem cita a segregação | regra de negócio |
| C-013 | Limite proposto 60.000: Sérgio recusado ("exige Gerente"); Gustavo aceito → etapa Formalização, decisão gravada com rating igual ao efetivo | regra de negócio |
| C-014 | Decisão sem plano, forma e parecer → recusada, mensagem cita os três | regra de negócio |
| C-015 | Motor 12.000, aprovado 20.000: Gustavo recusado ("Comitê de crédito"); Diana sem justificativa recusada; com justificativa → aceita, decisão em nome do Comitê de crédito com o texto guardado | regra de negócio |
| C-016 | Aprovar cria 1 pendência de aplicar limite de 29.000; sem termo, ida a Liberação recusada; com termo, aceita; ida manual a Gestão recusada; pendência aplicada → crédito em gestão com validade = hoje + 3 meses e card em Gestão de crédito | regra de negócio |
| C-017 | Crédito 29.000 e limite do Winthor 30.000 → a carteira marca divergência para o cliente | regra de negócio |
| C-018 | Rotina com K1..K4 → K1 em reanálise, K2 e K3 obsoletos com os motivos do cenário, K4 em gestão; 2 pendências de bloquear limite | regra de negócio |
| C-019 | Renovação pela analista recusada; sem parecer recusada; com parecer → período anterior encerrado, novo em gestão com o mesmo limite, validade hoje + 3 meses e nova fotografia do rating; card em Gestão de crédito | regra de negócio |
| C-020 | Recusa sem motivo → recusada; com motivo → etapa Recusadas e o motivo no card | regra de negócio |
| C-021 | Pedidos 15.000/30.000/50.000/80.000 → Supervisor/Gerente/Diretor financeiro (crítica)/Comitê de crédito; atraso 16 → Comitê de crédito; pedido 5.000 → recusado "cabe no limite" | regra de negócio |
| C-022 | Rita recusada (segregação); Diana sem parecer recusada ("crítica"); Diana completa → liberado e 1 pendência de liberar pedido | regra de negócio |
| C-023 | Cliente bloqueado, Gerente sem parecer → recusado, mensagem cita "bloqueado" | regra de negócio |
| C-024 | AA 100.000 → flex 20.000, teto 120.000; B → flex 0 com "faixa B"; AA com vencido 1 → flex 0 com "títulos vencidos" | regra de negócio |
| C-024 | Mostrador: exposição 105.000 sobre limite 100.000 e teto 120.000 cai na zona "flexível"; 125.000, na zona "acima do teto" | regra de tela |
| C-025 | Solicitação há 4 dias em Documentação e análise cadastral → fora, contador da esteira = 1; pedido há 3 h em Retido por limite → fora, contador dos pedidos = 1 | regra de negócio |
| C-026 | Concessão AA, sincronização com atraso 35 → rating atual D, final 710, concessão AA, classificado "não previsto" | regra de negócio |
| C-027 | Simulador 650/30/20.000/200.000 → A, 24.000; prazo 50 → 40.000 e aviso "45"; nenhuma solicitação gravada ou alterada | regra de negócio |
| C-028 | Fotos do cenário → leituras AA "Dentro", A "Fora da ordem", B "Dentro", C "Sem carteira", D/E "sem crédito a prazo"; aviso de base com 1 de 12 meses | regra de negócio |
| C-029 | Última revisão 96 dias atrás → aviso = sim; após registrar → aviso = não e 1 revisão com autor; Supervisor tentando registrar → recusado; quem tem a marca de administrador registra | regra de negócio |
| C-030 | 5 créditos do cenário → 1 saudável, 3 atenção, 1 risco, índice 20% | regra de negócio |
| C-031 | Massa do Carlos → SLA 60%, tempo médio 12,0, aprovação 80%, fora do prazo agora 1 | regra de negócio |
| C-032 | Três clientes do cenário → crítico (3 alertas), crítico (atraso), alerta; cliente sem sinal ausente; total 3 | regra de negócio |
| C-033 | Listagem como Rita 2, Ana 1, Sérgio 3, Gustavo 3; o total devolvido é igual ao número de linhas nos quatro | regra de negócio |
| C-034 | Órgão na Pública → etapa Recebimento da solicitação, prazo de decisão 25/11/2026; órgão na Privada e privado na Pública → recusados, nada gravado | regra de negócio |
| C-035 | Pública: 80.000 → Supervisor; 1.200.000 → "Diretoria"; os mesmos valores na Privada → Gerente e Comitê regional | regra de negócio |
| C-036 | Sem contrato: "aprovada" recusada, "pré-aprovada" aceita e a etapa não muda; com contrato: "aprovada" cria o crédito e o card vai para Monitoramento, com 1 pendência de aplicar limite; "pré-aprovada" na Privada recusada | regra de negócio |
| C-037 | Cliente com maior compra em Estética → carteira sugerida Estética; a solicitação nasce no quadro da Estética; 60.000 → alçada Gerente | regra de negócio |
| C-038 | Usuário sem vínculo: abrir solicitação e decidir → recusados com a mensagem de equipe; listagem com 0 linhas | regra de negócio |
| C-039 | Aplicar a pendência do aumento → 1 crédito vigente (130.000); o de 100.000 encerrado; card antigo em Encerradas depois da rotina | regra de negócio |
| C-040 | Cinco créditos do cenário → lista de revisão com 4, cada um com o gatilho certo; filtro por "uso" devolve 1 | regra de negócio |
| C-041 | 4 pedidos decididos, 3 liberados, 2 dentro do teto → taxa 75%, dentro da regra 67% | regra de negócio |
| C-042 | Fila da Rita: 2 itens (prazo de decisão, pendência do Winthor); fila do Sérgio: 2 itens (ajuste a decidir, decisão na alçada); nenhuma traz item da outra | regra de negócio |
| C-043 | Pular etapa, ir ao Comitê com a análise incompleta e mover crédito em gestão à mão → três recusas com o motivo; etapas inalteradas | regra de negócio |
| RN-001 | Cliente só com solicitação recusada anterior → "recorrente" | regra de negócio |
| RN-001 | Recorrente sem crédito vigente mostra o motivo "já tem solicitação registrada"; inativo, "cadastro obsoleto" | regra de tela |
| RN-002 | Solicitação há exatamente 72 h em Documentação e análise cadastral → no prazo; há 73 h → fora; solicitação Privada aberta em 30/11/2026 → prazo de decisão 09/12/2026 | regra de negócio |
| RN-003 | Checklist de Documentação e análise cadastral tem 13 itens, o 1º "Consulta Serasa / Boa Vista"; o de Liberação tem 2; o de Análise documental e financeira (Pública) tem 5; marcar item grava autor | regra de negócio |
| RN-004 | Sair da entrada sem analista → recusado; ir ao Comitê com valor 600.000 sem PL → recusado citando a análise financeira; ir a Liberação com garantia e sem "Garantias formalizadas" → recusado citando a garantia | regra de negócio |
| RN-005 | Voltar de Análise de crédito para Documentação e análise cadastral → aceito; voltar de Formalização → recusado | regra de negócio |
| RN-006 | Recusa no Comitê por Sérgio (analista) → recusada por segregação; por Gustavo com parecer → Recusadas com decisão gravada; recusa na cadastral por alguém fora do caso → recusada | regra de negócio |
| RN-007 | O mesmo membro como analista e decisor é recusado na solicitação, na renovação e no pedido; quem lançou o pedido também é recusado ao liberar. Os quatro desvios também são recusados: (a) o analista se troca por outro com a solicitação já na decisão → recusado; trocado antes, sem o novo analista refazer a proposta, ele continua sem poder decidir; (b) o Supervisor grava o limite proposto, o ajuste de rating ou o cálculo do motor de uma solicitação de Rita e tenta decidi-la → recusado; (c) o Supervisor grava a recomendação do pedido e tenta liberá-lo → recusado; trocar o analista do pedido já na Aprovação da alçada → recusado; (d) encerrar sem decisão uma solicitação que está na decisão → recusado, a solicitação continua na decisão; (e) na Pública, o Supervisor salva a análise do órgão de uma solicitação de Rita e tenta decidi-la → recusado, também depois de Rita salvar a análise de novo; o Gerente que só recalculou o motor do órgão decide; (f) o Supervisor muda só o faturamento ou a data de abertura do CNPJ de uma solicitação de Rita e tenta decidi-la → recusado; (g) o Supervisor grava o limite proposto, Rita grava o parecer depois, e o Supervisor tenta decidir → recusado; o mesmo no pedido com a recomendação. Cada recusa vale também pela gravação direta, sem a tela | regra de negócio |
| RN-008 | Alçada de 50.000 Supervisor; 50.001 Gerente; 500.001 Comitê regional; 2.000.001 Comitê executivo; proposto 40.000 com aprovado 55.000 → Gerente; Pública: 100.000 Supervisor, 100.001 Gerente, 1.000.001 Diretoria; Pública com aprovado até a exposição do motor do órgão → alçada da faixa, acima → Comitê de crédito; Silvia (Supervisor de outra equipe) aprova 30.000 de uma solicitação privada de Rita e 80.000 de uma solicitação pública de Rita → as duas aceitas, o card anda | regra de negócio |
| RN-008 (D-06) | Nara (nível 1 com a marca de administrador) é recusada ao decidir concessão, renovação, pedido e ajuste de rating, com a mensagem da alçada exigida; nenhuma decisão de alçada aparece na fila dela e a ficha não lhe oferece decidir | regra de negócio |
| RN-009 | Responsável gravado = membro da sessão mesmo se a entrada trouxer outro; aprovação com consultas de 31 dias → recusada | regra de negócio |
| RN-010 | Aprovado igual ao sugerido, sem ajuste e sem alerta de fraude → aceito pela alçada do valor, sem justificativa; com CNPJ de 8 meses → exige Comitê de crédito | regra de negócio |
| RN-011 | Consulta de 30 dias atrás → válida; de 31 → vencida; Receita "Irregular" gera o alerta "Situação irregular na Receita" | regra de negócio |
| RN-012 | PJ 150.000 sem garantia → 7 exigências (5 documentos + faturamento + ficha de contatos); PJ 600.000 com aval → 9; PF 50.000 → 4 (Serasa, protestos, processos + ficha); item "Consulta Serasa / Boa Vista" marcado conta 1 atendida | regra de negócio |
| RN-013 | AC 80.000, PC 100.000, PL 500.000, dívida 350.000, EBITDA 100.000 → LC 0,80, dív/EBITDA 3,5×, dív/PL 0,70; alertas "Liquidez" e "Dívida acima de 3×" | regra de negócio |
| RN-013 | Formatação na ficha: 0.8 → "0,80"; 3.5 → "3,5×" | regra de tela |
| RN-014 | Fonte SUS com prazo 60 e prazo médio 30 → avisos "descasamento de prazo" e "repasse público"; faixa não muda | regra de negócio |
| RN-015 | Pontualidade 120 → base 1000; sem pontualidade e recorrente → 750; atraso 70 dias → −600 (não −700); novo sem pontualidade → sem comportamental | regra de negócio |
| RN-016 | Serasa 600 e comportamental 400 → 520; sem comportamental → 600; sem Serasa → sem score final; Serasa 0 informado → score final calculado | regra de negócio |
| RN-017 | Final 799 → A; 800 → AA; atraso 5 → A, 6 → B, 46 → E; faixa D + 2 alertas → E (não passa de E) | regra de negócio |
| RN-018 | CNPJ aberto há 8 meses → alerta; novo pedindo 150.000 com faturamento 200.000 → "Pedido inicial alto"; os 3 manuais somam 3 rebaixamentos | regra de negócio |
| RN-019 | Compra média 100.000, prazo 60, PL 1.000.000, AA, faturamento 1.000.000 → base 100.000 (PL), limite 100.000–120.000; prazo 20 → considerado 30; sem score, base 24.000 e faturamento 50.000 → 15.000 | regra de negócio |
| RN-020 | Cliente sem grupo → o próprio cliente é o grupo e outros clientes não entram na exposição | regra de negócio |
| RN-021 | Sem compra média e sem faturamento → "Dados insuficientes"; faixa E → "Negar a prazo" | regra de negócio |
| RN-022 | Rating na concessão não muda depois de um novo ajuste ou de uma nova sincronização; concessão com ajuste aprovado C→B e motor ainda C → rating atual B; motor passa a D → rating atual D | regra de negócio |
| RN-023 | 14/11/2026 + 3 → 14/02/2027; 30/11/2026 + 3 → 28/02/2027; 31/01/2028 + 1 → 29/02/2028 | regra de negócio |
| RN-024 | Sem última compra e início da validade há 91 dias → obsoleto por "sem compras"; crédito da carteira Pública vencido com 2 compras → reanálise | regra de negócio |
| RN-025 | Ida a obsoleto gera pendência de bloquear limite; aplicar pendência grava quem e quando; pendência aplicada não aparece em abertas; aplicar limite com a solicitação ainda em Formalização → recusado | regra de negócio |
| RN-026 | A 100.000 → 10.000; AA com pontualidade 85 → 0; AA sem pontualidade → 20.000; AA rebaixado → 0; AA com disponível de concentração 105.000 → flex 5.000 | regra de negócio |
| RN-027 | Limite 0, utilizado 0, pedido 10.000 → 100%, Comitê de crédito; limite 200.000 e excesso 20.000 (10% exato) → Supervisor; limite 300.000 e excesso 20.001 (6,7%) → Gerente | regra de negócio |
| RN-028 | Liberação sem condição → recusada citando "condição"; recusa do pedido sem motivo → recusada | regra de negócio |
| RN-029 | Atraso 30 → atenção; 31 → risco; uso 89% sem atraso → saudável; índice 4 de 5 = 80% verde | regra de negócio |
| RN-030 | Concessão B, atual B → nenhum; concessão C, atual A → aceito; concessão A, atual C → não previsto | regra de negócio |
| RN-031 | Recusa do analista antes do Comitê não entra em decididas; pré-aprovada conta como decidida e aprovada; pedido decidido em 6 h → tempo médio do pedido 6,0 h; passagem em curso não entra no tempo médio da etapa | regra de negócio |
| RN-032 | Score não informado → sinal de score não conta; score 0 informado → crítico por score; rating atual E → crítico; 2 alertas → alerta; cliente só da carteira Pública não é classificado | regra de negócio |
| RN-033 | Faixa com índice 1% e esperado 1% → "Dentro"; 1,1% → "Acima do esperado"; sem nenhuma foto → sem leitura | regra de negócio |
| RN-034 | Rotina rodando 2 vezes na virada do mês → 1 foto do mês que fechou, com 1 linha por crédito vigente e a faixa; crédito da Pública fora da foto | regra de negócio |
| RN-035 | Ver C-033; analista pedindo as solicitações de outro analista recebe 0 linhas; agente de cobrança do cliente vê o crédito do cliente | regra de negócio |
| RN-036 | Concentração da Estética = 15 e geral 10 → solicitação da Estética usa teto 15%, da Privada 10% | regra de negócio |
| RN-037 | Decisão de aprovação grava auditoria com o resultado, o limite e o autor da sessão; encaminhamento da rotina grava autor "Rotina"; não há como excluir solicitação nem card | regra de negócio |
| RN-038 | O mesmo fluxo (abrir, analisar, decidir, crédito em gestão, encaminhar, renovar) roda nas três carteiras trocando só a carteira; na Pública não nasce risco do cliente e o rating AA–E fica vazio | regra de negócio |
| RN-039 | Atraso 14 → sem gatilho; 15 → gatilho de atraso; uso 90% → gatilho de uso; validade em 16 dias → sem gatilho; em 15 → gatilho | regra de negócio |
| RN-040 | Nenhum pedido decidido no período → taxa e conformidade vazias, sem divisão por zero; liberação com exposição igual ao teto flexível conta como dentro da regra | regra de negócio |
| RN-041 | Decisão em que a pessoa é o analista não entra na fila dela; solicitação de 60.000 não entra na fila do Supervisor; Ana pedindo a fila de Rita (que não está abaixo dela) → nada | regra de negócio |
| RN-042 | Ver C-038; membro inativo é tratado como sem vínculo | regra de negócio |
| RN-043 | Depois da substituição há exatamente 1 crédito vigente para o cliente e a auditoria tem a linha do encerramento | regra de negócio |
| RF-024 | Resumo da carteira com os 5 créditos do C-030 (limite de R$ 100.000 cada): 5 vigentes, R$ 500.000 de limite, 1 em reanálise | regra de negócio |
| RF-026 | Supervisor antecipa a reanálise de um crédito em gestão → crédito em reanálise e card em Reanálise; o analista do crédito tentando antecipar → recusado; Silvia (Supervisor de outra equipe) tentando antecipar → recusada | regra de negócio |
| RF-032 | Carteira por faixa dos 5 créditos do C-030: AA 3 clientes, B 1, D 1; clientes por farol filtrados por D devolvem 1, marcado "acima do sugerido" | regra de negócio |
| RF-039 | Com 3 em análise, 1 fora do SLA, 3 aprovadas e 1 recusada → em análise 3, aprovação 75%, fora do SLA 1 | regra de negócio |
| RF-041 | Card movido 45 vezes mostra 45 passagens no histórico | regra de negócio |
| RNF-004 | Abrir o card = 2 chamadas; cada escrita desta spec ≤ 20 execuções; uma rodada da rotina ≤ 150 | regra de negócio |

Verificação manual:
- [ ] C-001 — quadro com as etapas da carteira na ordem, capa com cliente, valor, rating, alçada e SLA; trocar a carteira troca o quadro
- [ ] C-016 — lista de pendências para o Winthor legível para quem vai digitar no ERP (cliente, CODCLI, o que aplicar)
- [ ] C-024 — mostrador de flexibilização com as três zonas (limite, flexível, acima)
- [ ] C-027 — simulador recalcula ao mudar qualquer campo sem gravar nada
- [ ] C-034 — na carteira Pública somem semáforo, saúde, sinalizados e flexibilização, e o card mostra o conteúdo do órgão (spec 005)
- [ ] Tema claro sem cor quebrada; faixas do semáforo com as cores do sistema visual, sem cor literal

## Fora de escopo

- [ ] Motor do órgão (nota 0–100, P1–P4), dados do órgão (CAPAG, CAUC, contrato, empenho), notas fiscais de órgão, regras de pagamento por ente, comunicação com o órgão e certidões — spec `005-setor-publico`. A esteira, a decisão e o crédito do órgão são desta spec (D-05); a 005 acrescenta ao card da carteira Pública o conteúdo do órgão.
- [ ] Régua de cobrança, bloqueio por atraso, probabilidade de inadimplência — spec `002`. Aqui só se lê se o cliente está bloqueado.
- [ ] Painel executivo: crédito deferido × negado por BU, concentração de limites (por grupo, Top 10, HHI), carteira de crédito por BU, PMR, pontos de atenção do crédito, evolução no ano, metas — spec `006`. A "Visão gerencial" do crédito mostra só o que esta spec pede (carteira, funil, flexibilização, risco) e leva ao painel para o resto. Os dados nascem aqui.
- [ ] Histórico do cliente em PDF e linha do tempo completa — spec `007`.
- [ ] Escrever no Winthor (limite, bloqueio, desbloqueio de pedido) — decisão de 11/11/2026; vira pendência manual.
- [ ] Consulta automática a Serasa, SCR, Receita, CENPROT ou tribunais — o analista consulta fora e registra resultado, data e anexo.
- [ ] Envio de e-mail ou WhatsApp ao cliente ou ao comercial (recusa, liberação) — fica como item de checklist. O aviso interno ao responsável quando o card chega à decisão ou à reanálise é do próprio quadro.
- [ ] Emissão e assinatura digital do termo de concessão — o termo assinado entra como anexo.
- [ ] Tela de edição de parâmetros e de equipe — é da `001`; aqui só se usam os parâmetros e se registra a revisão do semáforo.
- [ ] Escala AA–H da Res. 2.682 e campo de rating digitado — substituídos pelo rating único (§8.3).
- [ ] Lista de produtos bancários e dados de exemplo do artefato — resíduos de protótipo.
- [ ] Excluir solicitação ou pedido — desiste-se recusando, com motivo (RN-037).
- [ ] Mudar a etapa de um card fora dele — o cartão no quadro é só leitura; a mudança é em "Mover para", dentro do card aberto, com as condições da RN-004.
- [ ] Tipo de documento em cada anexo — os anexos do card não têm tipo; o documento exigido é conferido pelo item do checklist (RN-012).
- [ ] Segregação "nem o vendedor (RCA)" do artefato — o RCA não é usuário deste sistema; fica a regra "nem o analista do pedido nem quem o lançou" (RN-007).
- [ ] Prazo total por valor da Política (até R$ 100 mil 2 dias úteis, até R$ 500 mil 5, acima 10), que o artefato mostrava como selo — não adotado; vale o prazo de decisão pela soma das etapas, em dias corridos (P-18).
- [ ] Filtro "Inadimplentes com a empresa" — é da lista de clientes (`001`) e da cobrança (`002`). O filtro pessoa física / jurídica existe na esteira.
- [ ] Renovação que muda o limite — a renovação mantém o limite; limite novo é nova solicitação (P-19).
- [ ] Solicitação para quem ainda não é cliente no Winthor (P-21) e leitura automática dos pedidos bloqueados no Winthor (P-20).
- [ ] Carga dos créditos e propostas do artefato (P-02): a carteira em gestão começa vazia.

## Pendências

Nenhuma bloqueia a construção: cada uma tem o padrão adotado no contrato
técnico (`docs/contrato/00-indice.md` §4), e trocar o padrão depois é mudar
parâmetro ou dado do quadro. Numeração do índice do contrato.

| # | Pergunta ao gestor | Padrão adotado | Onde aparece aqui |
|---|---|---|---|
| P-02 | Migrar o histórico do artefato? | não; a carteira em gestão começa vazia | Fora de escopo |
| P-03 | Que parâmetros da Estética têm valor diferente? | nenhum | RN-036 |
| P-04 | A mesma pessoa pode ser agente e analista? | sim; a segregação é por caso | RN-007, RN-035 |
| P-12 | Quem é o "Diretor financeiro" das alçadas? | cargo Diretoria (nível 5) | RN-027 |
| P-17 | Exceção ao motor de crédito: quem aprova? | Comitê de crédito (nível 5), com justificativa | RN-008, RN-010 |
| P-18 | SLA das etapas em dias úteis ou corridos? | corridos | RN-002 |
| P-19 | Renovação pode mudar o limite? | não; decide a alçada do limite vigente | RF-026, C-019 |
| P-20 | Pedido retido vem do Winthor ou é lançado? | lançado à mão pelo número do pedido | RF-029 |
| P-21 | Solicitação para quem ainda não é cliente no Winthor? | não | RF-001 |
| P-22 | Órgão sem contrato pode ser aprovado? | só pré-aprovado | RN-009, C-036 |
| P-25 | Anexos em endereço público | aceito com as mitigações do contrato | RF-014 |
| P-28 | Motivo ao voltar uma solicitação de etapa | pedido pela tela e gravado como nota | RN-005 |
| P-29 | Checklist das etapas pós-aprovação da Pública | sem texto no artefato: não semeado | RN-003 |
| P-45 | Pedido acima do teto flexível vai sempre ao Comitê de crédito? | não; segue a tabela única do excesso (o teto é só indicador) | RN-026, RN-027 |
| P-46 | Comitê regional com nível 3: o Gerente decide sozinho até R$ 2 milhões? | sim | RN-008 |

Pendências antigas desta spec e para onde foram: P-01 → P-04 · P-02 (o que
trava a etapa) → resolvida na RN-004 · P-03 → P-18 · P-04 → P-17 · P-05 (pedido
acima do teto flexível) → P-45 · P-06 →
P-03 · P-07 → P-19 · P-08 → P-20 · P-09 → P-21 · P-10 → P-02. O Comitê regional
com nível de Gerente (uma pessoa decide até R$ 2 milhões) é a P-46.

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida
- [x] Cenários cobrem pelo menos um caminho de erro (C-003, C-005, C-006, C-012, C-014, C-015, C-020, C-022, C-023, C-038, C-043)
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta
- [x] Zero `[NEEDS CLARIFICATION]` em aberto — as pendências têm padrão adotado e número do índice do contrato
