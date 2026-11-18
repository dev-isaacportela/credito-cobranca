# 00 — Contrato técnico único · índice

Este diretório é a fonte única de nomes, tipos e regras transversais do sistema Crédito e Cobrança. Os 7 `plan.md`/`tasks.md` são refeitos **contra ele**: onde um plan antigo diverge, vale o contrato. Mudança no contrato = pedido ao arquiteto, nunca edição local.

## 1. Arquivos

| Arquivo | O que fixa | Tamanho |
|---|---|---|
| `00-indice.md` | este índice, decisões transversais, exceções, pendências | — |
| `01-convencoes.md` | nomes, tipos, relógio, identidade e sessão (**chamada aninhada, DT-34**), **quem administra (D-06)**, escrita guardada, visibilidade, auditoria, erros, paginação, orçamento de execuções (teto 20 por clique), rotina única, anexos, e-mail, costuras de arquivo, publicação em duas passadas e formatos de `QUADROS`/`gancho()`/`registrarExtensao()`/`modules/NNN/index.ts`, lista do sandbox (S-01…S-16) | 54 KB |
| `02-dados.md` | 55 tabelas `CC_` com todas as colunas, chaves e quem lê/escreve; tabelas da lib lidas; mapa do Winthor (confirmado × a confirmar); schema Winthor do simulador | 65 KB |
| `03-parametros.md` | catálogo único: 277 chaves `grupo.chave`, valor por carteira, vigência, validação, de → para de todo nome antigo, tabelas de alçada, fórmula dos encargos, D-02/D-03/D-04 | 33 KB |
| `04-funcoes.md` | 327 Server Functions (227 públicas + 100 internas; contadas nas `definitions` dos `add-0N0`, 17/11/2026) por dona; ganchos por quadro; resumos do painel; fluxo cobrança → Jurídico; o que o D-05 substitui; os 88 pedidos entre specs resolvidos um a um; colisões | 98 KB |
| `pedidos/00-respostas.md` | resposta a cada um dos 145 pedidos da fase 0c e o que cada plano precisa mudar | — |
| `pedidos/01-correcoes-v2.md` | decisões DT-34 a DT-42 tiradas da validação v2, o que cada plano precisa mudar, o fechamento v2 (§5: pipeline do banco, agenda do painel, segregação na Pública, D-08, busca por documento) e o acabamento pós-v3 (§6: etapa do órgão por pessoa, autores da proposta em lista, alçada sem cliente visível nas três carteiras) | — |
| `pedidos/02-pos-construcao-respostas.md` | os textos pedidos depois da construção do backend (17/11/2026), item a item: aplicado, aplicado de outro jeito ou não aplicado, e as decisões dos itens abertos | — |
| `05-quadros.md` | os 8 quadros da lib: 84 fases (chave, nome, SLA, tipo, cor); checklist com o texto exato do artefato; capa, etiquetas, travas, acesso por cargo, extensões de tela, o que a rotina faz em cada quadro; itens do dossiê | 41 KB |
| `06-seed-testes.md` | relógio de teste, elenco único (12 usuários, 58 clientes com código e documento), pipeline do banco (quadros semeados, leitura, atribuição, rotina), convenção de smoke, o que o simulador emula, armadilhas MySQL × SQLite | 21 KB |

Ordem de leitura para refazer um plan: 00 → 01 → a seção da spec em 02, 03, 04 → o quadro em 05 → 06.

## 2. Decisões do gestor e do usuário que o contrato segue

| # | Decisão | Onde aparece |
|---|---|---|
| D-01 | BU é do item comprado (departamento do produto), não do cliente | posição por cliente × BU e × carteira (02); rateio pelo item da nota (01 §11) |
| D-02 | Setor público sai do ramo (códigos 11–15, lista parametrizada); pessoa física é tipo de pessoa | `base.ramosPublicos`, `base.ramoPublicoPrefixo` (03 §1) |
| D-03 | Vencimento em dia não útil é parâmetro | `base.vencimentoDiaNaoUtil` |
| D-04 | Códigos de cobrança excluídos são lista parametrizada | `base.cobrancasExcluidas` |
| D-05 | **Setor público e Estética e Injetáveis reaproveitam o setor privado**: um conjunto só de tabelas, SFs e telas de cobrança e de concessão, parametrizado pela carteira (`PRIVADA`, `ESTETICA`, `PUBLICA`) | 01 §1 e §14; 02 (coluna `CARTEIRA`); 03 (coluna Carteira, §18); 04 §0, §5, §10; 05 (os 8 quadros) |
| D-06 | **Quem administra: Gerente para cima** — nível ≥ 3 (Gerente, Diretoria) **ou** a marca Administrador (pessoal técnico). Parâmetros, feriados, BUs e departamentos, modelos, equipe e redistribuição, filiais credoras, conclusão da carga do Jurídico, fontes e material de apoio, fechamento do painel, leituras, auditoria e administração dos quadros | 01 §4 e §5 (`PODE_ADMINISTRAR`, `NIVEL_MIN`); 04 §0 (`ADM`, `N2`/`N3`); 05 §2 |
| D-07 | **Supervisor vê todos os cards do quadro Jurídico** (16/11/2026; era a P-48): é `membro` do quadro `juridico`; mover à mão continua só do Jurídico; listagens `cc*` seguem a hierarquia | 05 §2, passo `ACESSOS` (DT-35) |
| D-08 | **Acordo judicial aguardando aprovação não é "a receber"** (16/11/2026): "Acordos a receber" conta só acordo `ANDAMENTO`; os `AGUARDANDO` têm indicador próprio (quantidade e valor), sem somar ao a receber | 04 §3 `ccJurResumo`, `ccJurIndicadores`, `ccJurAcordoListar`; plano da 003 |
| D-09 | **Ninguém se promove** (17/11/2026): ninguém altera o próprio cargo, superior, marca ou situação; cargo de nível ≥ 3 só por cargo de nível igual ou maior; chaves de alçada só por cargo nível ≥ 3, a marca não basta | 01 §4; 04 §1 `ccBaseMembroSalvar`, `ccBaseParametroSalvar` |
| D-10 | **Winthor fora, módulos param** (17/11/2026): última leitura com erro → nova leitura, uma por rodada; passos de módulo não rodam com dado velho | 01 §11 decisão 2 |
| Quadros | Todo quadro é da lib `@benenutri/mitra-kanban` | 05 |

**O que o D-05 tirou das specs.** Da **002**: o filtro "só privado e estética" e as 14 etapas fixas em código — o caso (`CC_COBRANCA`), contatos, promessas, baixa, agenda, encargos e o envio ao Jurídico passam a servir também o órgão, e a etapa vem da chave da fase do quadro `cobranca-<carteira>`. Da **004**: a recusa de cliente público em todas as SFs e a esteira com etapas no domínio — solicitação, decisão, crédito, reanálise e encaminhamento servem as três carteiras, com as fases de `concessao-<carteira>`, a alçada pelo valor do parâmetro na carteira e o motor da carteira atrás de `ccCredMotorCalcular`. Da **005**: saem a esteira pública de concessão (listar, mover, decidir, histórico, monitoramento, reavaliação), o quadro e a agenda da cobrança pública, o registro próprio de contato, previsão, baixa e envio ao Jurídico, e os parâmetros de alçada e de encargos do público (viram valor da carteira `PUBLICA`); **ficam** só NF pública (etapas, prazos, datas, régua por NF), motor do órgão (0–100, P1–P4), regras de pagamento por ente, comunicação com o órgão e certidões — 18 SFs e 5 tabelas (04 §5 e §10 trazem a substituição SF a SF). P-03 fica reduzida a "quais parâmetros da Estética têm valor diferente".

**Exceções ao D-05** (onde o privado não comporta o público sem remendo; não foi forçado):

| # | Ponto | Como ficou | Motivo |
|---|---|---|---|
| E-1 | Etapa de cobrança do órgão | `cobranca-publica` tem fases próprias e quem calcula a fase é a 005 (`ccPubRotina`), entregando à 002 por `ccCobCasoSincronizar`; `regua.*` não se aplica | no público a etapa é o andamento da NF (protocolo, liquidação, pagamento), não dias de atraso do título |
| E-2 | Régua de comunicação com o órgão | por NF (`CC_NF_ACAO`, passos `CONF`…`G5`, `M2`), na 005; o caso recebe só a próxima ação | os prazos correm de datas de cada NF e contam dias úteis do ente |
| E-3 | Acordo parcelado, bloqueio de pedidos, fila de e-mail e notificação extrajudicial | não existem para o órgão: o quadro não tem `negociacao`/`acordo`, e as SFs recusam pela ausência da fase | o artefato não prevê; órgão reconhece dívida por requerimento administrativo |
| E-4 | Motor de análise | o do órgão tem entradas próprias (`CC_ANALISE_ORGAO`, `pubMotor.*`) atrás do mesmo ponto de entrada; risco, criticidade, farol e saúde não rodam na `PUBLICA` | CAPAG, CAUC, despesa com pessoal e empenho não têm equivalente no privado |
| E-5 | Esteira de concessão | público tem 3 fases antes do crédito (privado 6), cria o crédito na decisão e aceita `PRE_APROVADA` | resolvido só com dado do quadro + um valor a mais em `RESULTADO` |
| E-6 | Alçada | público tem 3 faixas (privado 4): a faixa 3 fica vazia por valor igual e o rótulo do topo é parâmetro | mesma tabela, valores da carteira |

## 3. Decisões transversais

| # | Decisão | Justificativa (uma linha) |
|---|---|---|
| DT-01 | Um prefixo de SF por spec (`ccBase`, `ccCob`, `ccJur`, `ccCred`, `ccPub`, `ccPainel`, `ccHist`) + 4 nomes transversais (`ccRotina`, `ccEmailEnviar`, `ccPodeMover`, `ccPodeExcluir`) | acaba com as colisões e diz o dono pelo nome |
| DT-02 | Carteira é coluna e parâmetro; quadro = `<processo>-<carteira>` | D-05 |
| DT-03 | Fases de mesmo papel têm a mesma chave nos quadros das três carteiras; a regra só conhece a chave | é o que permite um código só para três quadros diferentes |
| DT-04 | Etapa mora no card (`KB_CARD.FASE_ID`); `CC_FASE` dá a chave estável; saem `*_HIST`, `*_CHECK` e colunas `ETAPA` | arquitetura §8.2; uma fonte só |
| DT-05 | Nenhum campo obrigatório na lib: trava de campo = condição de entrada; trava de domínio = gancho; checklist = campo Sim/Não | o motor cobra obrigatório também da rotina e nas fases finais (refina a arquitetura §8.2) |
| DT-06 | Ordem de toda escrita: domínio → quadro; a rotina concilia | falha no meio nunca deixa o card à frente do domínio |
| DT-07 | Fase controlada pelo sistema só aceita o card com o domínio pronto (gancho) | funciona igual se a chamada aninhada levar ou não a sessão (S-01/S-14) |
| DT-08 | Identidade: `sessao()` na JS pública; chamada aninhada e rotina levam `membroId` explícito; guarda `ATOR` na SQL | a regra fica no servidor nas duas hipóteses da plataforma |
| DT-09 | Escrita guardada: JS pública + `ccEsc…` SQL de um comando; lote por listas alinhadas | business não tem DML; `JSON_TABLE` é recusado |
| DT-10 | Visibilidade sem recursão por `CC_MEMBRO.CAMINHO`; Jurídico por `CC_CLIENTE.NO_JURIDICO`; analista por `ANALISTA_ID` | um fragmento SQL que roda igual no MySQL e no SQLite |
| DT-11 | Auditoria: uma função (`auditar()`, com o lote `auditarLinhas()`), uma escrita (`ccEscBaseAuditoria`), com `CLIENTE_ID` sempre que a escrita é de um cliente (nulo no que é da empresa inteira) | constitution: toda escrita auditada; o histórico (007) lê um lugar só |
| DT-12 | Catálogo único de parâmetros, um editor (`ccBaseParametroSalvar`), valor por carteira herdando o padrão; SLA fora do catálogo | política como parâmetro, sem chave duplicada |
| DT-13 | Uma rotina (`ccRotina`, 5 min) com passos em ordem: leitura → acessos → régua → crédito → público → foto; idempotente por chave única; teto de 150 execuções por rodada | cabe nas 300 SF/min e nunca processa leitura pela metade |
| DT-14 | Posição por cliente, cliente × BU e cliente × carteira, com faixas por título e Σ saldo × dias; todo cliente tem posição, inclusive órgão | D-01; aging e PDD por título |
| DT-15 | Caso de cobrança = cliente × carteira × ciclo, um card por ciclo | checklist novo a cada ciclo; um cliente pode estar em dois quadros |
| DT-16 | Encargos título a título no servidor (`ccCobEncargosCalcular`, 002), usados também por 003 e 005 | um cálculo só; o demonstrativo do Jurídico bate com a cobrança |
| DT-17 | Cobrança → Jurídico: dossiê primeiro; o envio do dossiê é que move a cobrança (`ccCobEnviarJuridico`, idempotente) | o Jurídico só recebe caso completo |
| DT-18 | Solicitação, decisão e crédito únicos (004) para as três carteiras; dados do órgão em tabela da 005 | D-05 |
| DT-19 | Um card acompanha a solicitação e o crédito que nasce dela; renovação no mesmo card | histórico do crédito num lugar; sem solicitação "de renovação" |
| DT-20 | Um envio de e-mail (`ccEmailEnviar` com `montarEmail` da lib); modelo com efeito legal só sai validado | uma identidade visual e um registro |
| DT-21 | Documento de caso = anexo do card; `CC_ANEXO` só para cliente, material e certidão | a lib já guarda, lista e controla acesso |
| DT-22 | Relógio único (`lib/tempo.mjs`; `CC_AGORA` só no simulador); datas `VARCHAR` em hora de Brasília; `KB_*` em UTC | teste determinístico e nenhuma data vinda da tela |
| DT-23 | Um elenco de seed, faixas de código por módulo, banco novo por smoke, título do teste começa pelo id do cenário | sete módulos em paralelo sem colidir |
| DT-24 | Costuras por spec (um `add-0N0`, um arquivo de schema, de parâmetros, de modelos, de quadros, de seed, de smoke); telas se estendem por `registrarExtensao()`; ganchos de um quadro são somados | nenhum módulo edita arquivo de outro |
| DT-25 | Acesso ao quadro por cargo, conciliado pela rotina | única escrita direta em `KB_`, isolada num passo |
| DT-26 | Todo SQL do Winthor em dois arquivos (`winthor-sql.mjs`, `winthor-nf.mjs`) | coluna a confirmar muda um arquivo |
| DT-27 | Funções órfãs do artefato ganham dono: concentração de limites, PMR, carteira por BU do crédito e pontos de atenção → 006 (`ccPainelConcentracao`, `ccPainelCredito`, `ccPainelAtencao`); mostradores de flexibilização, gatilhos de revisão, limites vencidos e fila do crédito → 004 (`ccCredFlexResumo`, `ccCredRevisaoListar`, `ccCredCreditoListar`, `ccCredAgendaListar`); agenda de contratos e alerta de certidão → 005 (`ccPubContratoListar`, `ccPubResumo`); tela de planos → 001 (`ccBasePlanoListar`) | nada do artefato fica sem dono nem ganha requisito novo |
| DT-28 | Cortes por simplicidade: sem SF de dia útil (é lib), sem `…Mover` de domínio (é a lib + gancho), sem tabela de checklist, sem `posProtestoDias`, sem migração de histórico | constitution: cortar o que nenhuma spec pede |
| DT-29 | **Teto por clique = 20 execuções** (lib e aninhadas inclusive); exceção nomeada única `ccJurDossieEnviar` ≤ 30; lote dividido pela tela em chamadas sequenciais que cabem em 20; só efeito em **outro** card (crédito substituído) e marcação de item em lote vão para a conciliação da rotina; tela = bloco (≤ 6 por bloco) | o limite real é 300/min; 12 obrigava a cortar o que o usuário escolheu ver, e 20 cabe 15 cliques caros por minuto ao lado da rotina |
| DT-30 | **Quem administra** = `PODE_ADMINISTRAR` (nível ≥ 3 ou marca `ADMIN`), num fragmento só; `N2`/`N3` aceitam a marca; alçada nunca | D-06 |
| DT-31 | **Uma enumeração por domínio, a de 02**; SF recebe e devolve o valor da coluna; valor derivado (vencida, atrasada) não se grava | 02 e 04 divergiam em acordo, parecer, item do dossiê, motivo de encerramento e parcela |
| DT-32 | **Formato fixo** de `QUADROS`, `gancho(slug)` e `registrarExtensao()` (01 §14) | 002 a 005 escrevem em paralelo o que a 001 monta |
| DT-33 | **Tela escolhida não perde função por falta de leitura**: a SF de leitura ganha entrada/saída quando o dado existe no modelo; o que não existe é recusado e a tela mostra o que há | o usuário escolheu as telas (`opcoes-tela/escolhas.md`) |
| DT-34 | **Chamada aninhada, regra única** (01 §4): quem chama passa `membroId` e quem é chamado resolve por `quem()`; SQL de leitura com `EU` nunca é aninhada (a tela chama, ou a JS lê a tabela); escrita aninhada só em SF que aceita a origem (`SIS` = só rotina; "SIS + quem" = duas origens); efeito de quadro só em nome de quem escreve naquele quadro | funciona igual com e sem a sessão levada, sem identidade vinda da tela; resolve os resumos do painel, a sugestão do dossiê público e o lançamento de datas da NF |
| DT-35 | **Gancho por domínio**: "quem move" vale só para o movimento livre; destino controlado pelo sistema confere só o estado do domínio. Régua do quadro de cobrança aceita só a `CC_COBRANCA.FASE_DEVIDA` | com a sessão levada, quem decide, envia o dossiê ou lança a NF não é recusado por não ser "caso" ou Jurídico |
| DT-36 | **Decisão de crédito do órgão**: a fotografia do motor do órgão é `CC_ANALISE_ORGAO` (`RATING_PUB`, `EXPOSICAO`), gravada pela 005; a 004 lê na SQL, copia `RATING_PUB`/`LIMITE_MOTOR` na decisão e `ANALISE_ORGAO_ID` no crédito; exceção na Pública = limite acima da exposição | uma fotografia só, sem escrita cruzada e sem execução a mais (17–18) |
| DT-37 | **Rotina da 002 na Pública**: além do processo ativo, promessas (quebra e `Promessa vencida`) e itens de ação registrada e responsável; sem `Sem contato` nem régua por dias | a previsão do órgão funciona como nas outras carteiras; `juridico_1` passa a ser marcado |
| DT-38 | **Banco do simulador por um pipeline só** (06 §2.3): elenco → **quadros semeados** → leitura → atribuição (agente e analista) → processamento → `passado()` → `dominio()` → leitura e rotina finais; relógio só para frente | o runtime não roda `isEntrypoint()`; seeds coerentes e iguais nos 7 smokes |
| DT-39 | **Publicação em duas passadas** do `PUBLISH_ORDER` e formato fixo de `modules/NNN/index.ts` (01 §14) | id 0 de SF publicada depois e `ccPodeMover` sem trecho somem; o M2 libera telas contra um tipo só |
| DT-40 | **Quem propôs não decide** pelas colunas de autor da proposta (`CC_SOLICITACAO.PROPOSTA_POR`, `CC_PEDIDO_RETIDO.RECOMENDADO_POR`, `CC_ANALISE_ORGAO.PROPOSTA_POR`, além de analista e criador), que guardam **todos** os autores, inclusive quem mudou um dado que entra no motor (acabamento pós-v3) | trocar o analista ou o superior escrever a proposta não contorna a segregação |
| DT-41 | `N2`/`N3`/`N5` sobre registro de cliente também exigem o cliente visível | nível mínimo não dá acesso a cliente de outra equipe |
| DT-42 | Abrir card = `kbCardDetalheSql` + 1 ficha da dona + 1 leitura por módulo que estende o card | o bloco do órgão no card público cabe numa leitura (`ccPubAnaliseObter` traz o motor) |
| DT-43 | **Interna recalcula o derivado** (17/11/2026): débito, alçada, nível, prazo, valor de pendência, validade, encerramento, data, nível e caminho do membro saem da própria SQL da `ccEsc…`; a entrada traz só o que a pessoa escolhe (01 §5) | os bloqueios das validações B1–B3 eram todos interna confiando em valor da entrada |
| DT-44 | **Membro normalizado** nas listas de autores: `CAST(CAST({{membroId}} AS SIGNED) AS CHAR)` na comparação e na gravação (01 §5) | `membroId = '3.0'` burlava "quem propôs não decide" |
| DT-45 | **Número em SQL como `CAST('{{x}}' AS SIGNED\|DECIMAL)`**, exceto `LIMIT/OFFSET` (01 §5, 06 §5, S-16) | defesa em profundidade: sem confirmar que a plataforma liga o valor, número sem aspas é injeção |
| DT-46 | **Parâmetro com vigência só vale de hoje em diante**; `validarConjunto` recebe o conjunto efetivo inteiro (01 §9, 03) | vigência retroativa mudava mês fechado; regra cruzada entre grupos só rodava com as duas chaves no lote |

## 4. Pendências para o gestor (nenhuma bloqueia a construção)

Cada uma já tem um padrão adotado; trocar o padrão depois é mudar parâmetro, dado do quadro ou um arquivo isolado.

| # | Pergunta | Padrão adotado | Onde troca |
|---|---|---|---|
| P-01 | Em que dia nasce o bloqueio total do crédito? | D+10 | `regua.bloqTotal` |
| P-02 | Migrar histórico do artefato atual? | não; o sistema começa da leitura do Winthor (só o Jurídico tem carga de planilha) | — |
| P-03 | Quais parâmetros da Estética têm valor diferente do privado? | nenhum | tela de parâmetros, carteira `ESTETICA` |
| P-04 | A mesma pessoa pode ser agente e analista? | sim; a segregação é por caso (quem propõe não decide) | — |
| P-05 | Colunas do Winthor para títulos, limite, plano, NF, empenho e ramos públicos | nomes de 02 §Winthor | `winthor-sql.mjs`, `winthor-nf.mjs` (S-12) |
| P-06 / P-11 | Quem valida modelo com efeito legal, e pode enviar antes? | Jurídico ou nível ≥ 3 (é alçada: a marca Administrador não basta); sem validação em dia não envia | `com.modeloValidaNivel`, `com.modeloRevalidarMeses` |
| P-07 | Jurídico: encaminhar e montar depois, ou dossiê completo primeiro? | dossiê primeiro | 04 §2 |
| P-08 | Encargos título a título ou pelo título mais antigo? | título a título | `ccCobEncargosCalcular` |
| P-09 | Posição do órgão: vencimento do título ou prazo legal da NF? | vencimento do título; a visão por prazo legal fica nas telas de NF | — |
| P-10 | Aging e PDD por título ou por cliente? | por título | — |
| P-12 | Quem é o "Diretor financeiro" das alçadas? | cargo Diretoria (nível 5) | `alcada.nivelDiretorFinanceiro` |
| P-13 | Quem é dono da tela de planos de pagamento? | 001, só leitura | — |
| P-14 | Códigos de ramo público e esfera por ramo | 11–15 + prefixo "ORGAO PUBLICO"; esfera lançada à mão | `base.ramosPublicos`, `base.ramoPublicoPrefixo`, `base.ramosEsfera` |
| P-15 | Vencimento em dia não útil conta como? | dia corrido | `base.vencimentoDiaNaoUtil` |
| P-16 | Quais códigos de cobrança ficam fora? | nenhum | `base.cobrancasExcluidas` |
| P-17 | Exceção ao motor de crédito: quem aprova? | Comitê de crédito (nível 5), com justificativa | `alcada.nivelComiteCredito` |
| P-18 | SLA das etapas em dias úteis ou corridos? | corridos (horas da lib) | `KB_FASE.SLA_HORAS` |
| P-19 | Renovação pode mudar o limite? | não; decide a alçada do limite vigente, limite novo é nova solicitação | — |
| P-20 | Pedido retido vem do Winthor ou é lançado? | lançado à mão pelo número do pedido | — |
| P-21 | Solicitação para quem ainda não é cliente no Winthor? | não; só cliente existente | — |
| P-22 | Órgão sem contrato pode ser aprovado? | só pré-aprovado; aprovar exige contrato ativo, e acima do pré-aprovado, nova decisão | motor do órgão (`podeAprovar`) |
| P-23 | Regras de pagamento por ente semeadas | nascem "a confirmar"; Jurídico ou Gerente valida | tela de regras |
| P-24 | E-mail automático ao cliente sem aprovação | nenhum; fases de efeito legal passam por aprovação | `cob.emailModo.*` |
| P-25 | Endereço público dos anexos | aceito com as mitigações de 01 §12 | — |
| P-26 | Quem fecha mês sem foto no painel | Gerente ou acima | — |
| P-27 | Jurídico vê o quê no histórico do cliente | só cliente com processo, sem a categoria de auditoria | — |
| P-28 | Motivo ao voltar uma solicitação de fase | pedido pela tela e gravado como nota (não trava no servidor) | 04 §8 |
| P-29 | Checklist das fases pós-aprovação do público | sem texto no artefato: não semeado | administração do quadro |
| P-30 | Dias da régua e fases da Estética | iguais aos do privado | `regua.*` na carteira `ESTETICA` |
| P-31 | Parcela de acordo paga em dia conta como recuperado? (006) | não: recuperado é só pagamento depois do vencimento, sem estornados | 006 (`RECUPERADO` da foto e do painel) |
| P-32 | Quem fornece os endereços oficiais das 41 fontes e a arte do papel timbrado? (007) | fonte sem endereço entra "sem link" (a carga inicial grava `URL` nula); o documento sai com o logo e o cabeçalho do design system | tela de fontes; documento do histórico |
| P-33 | Quem fornece os arquivos do material de apoio? (007) | os 7 itens da carga entram como "Arquivo pendente" | tela de material |
| P-34 | Encargos conferidos contra os contratos; correção por índice oficial? (002) | os do artefato (`enc.*`, correção composta a 0,4% a.m.) | `enc.*` (03 §6) |
| P-35 | Acordo de cobrança vai para o ERP? (002) | não; a parcela paga é registrada à mão no sistema | — |
| P-36 | Toda baixa como perda exige parecer do Jurídico? (002) | sim | regra da 002 (`ccCobBaixaDecidir`) |
| P-37 | A previsão de pagamento do órgão tem limite de dias? (002) | não (`cob.promessaMaxUteis` = 0 na `PUBLICA`) | `cob.promessaMaxUteis` |
| P-38 | Advogados do escritório externo usam o sistema? (003, J-1) | não; o responsável é alguém da equipe com cargo Jurídico e o advogado externo aparece no texto do andamento | — |
| P-39 | Planilha real do escritório (5 abas) (003, J-2) | colunas por posição, como no artefato; prévia obrigatória; conferir com o arquivo real antes da carga | `lib/juridico` (carga) |
| P-40 | "Linha Galderma" é a BU Estética? (003, J-3) | atributo próprio do processo, independente da BU | `CC_PROCESSO.LINHA` |
| P-41 | Dados de cada filial credora e sigla usada pelo escritório (003, J-4) | filial credora = filial do Winthor; nasce da filial dos títulos vencidos; o Gerente cadastra os dados; a carga casa a sigla pela UF | `CC_FILIAL_CREDORA` |
| P-42 | Acordo judicial abaixo da alçada, mas fora da política, precisa de aprovação? (003, J-5) | sim, na alçada | `jur.acordo*` |
| P-43 | Encerrar processo como baixa exige a baixa aprovada na cobrança? (003, J-6) | não; quem encerra é avisado e fica registrado | `ccJurProcessoEncerrar` |
| P-44 | Taxa de recuperação do Jurídico: sobre todos os processos ou só os ativos? (003, J-7) | todos os do recorte, ativos e encerrados | `ccJurIndicadores` |
| P-45 | Pedido acima do teto flexível vai sempre ao Comitê de crédito? (004) | não; segue a tabela única do excesso (o teto é só indicador) | 03 §7 |
| P-46 | Comitê regional com nível 3: o Gerente decide sozinho até R$ 2 milhões? (004) | sim | `alcada.nivelComiteRegional` |
| P-47 | Pequeno valor do órgão: vale o limite da contratação ou da emissão da NF? (005) | da emissão da NF | `pub.pequenoValor` (vigência) |
| P-48 | O supervisor vê todos os cards do quadro Jurídico, como já vê os de cobrança e concessão? (DT-35) | **decidida pelo usuário: sim (D-07, 16/11/2026)** — `membro`; mover à mão continua só do Jurídico; listagens `cc*` seguem a hierarquia | 05 §2, passo `ACESSOS` |
| P-49 | Baixa como perda em partes: a alçada vale o valor de cada baixa ou o acumulado do caso? (002, O-11 da B2) | cada baixa pelo próprio valor; uma `PENDENTE` por caso, cada uma com parecer do Jurídico, segregação e auditoria; o acumulado aparece em `VALOR_BAIXADO` | código: `ccEscCobBaixaInserir` (nível sobre `VALOR_BAIXADO` + valor) |
| P-50 | Com mais de um advogado no Jurídico, quem recebe o processo enviado? (003, O-12 da B3) | o `RESPONSAVEL_ID` já gravado ou, se vazio, o primeiro membro `JURIDICO` ativo (`MIN(ID)`); o Jurídico troca depois em `ccJurProcessoSalvar` | código: `ccEscJurProcessoEnvio` (parâmetro ou distribuição) |

## 5. A confirmar no sandbox (T-002 da 001; plano B já escrito em 01 §15)

Roteiro `backend/sandbox/t002-confirmar.mjs`: roda no sandbox **depois da publicação completa** (ordem do `CLAUDE.md`, até o
`add-090` e o `sync-server-function-map`) e **antes de liberar o sistema aos usuários**. Precisa de tudo publicado porque
confere o caminho real (rotina, ganchos dos quadros, escritas, perfil). Item que falhar segura a liberação: plano B, nova
subida do que mudou e o roteiro de novo. Precisa de `T002_BUSINESS_TOKEN` (e `T002_EMAIL`) no `.env` do sandbox (F5 C-01).

| # | O quê | Se falhar |
|---|---|---|
| S-01, S-02, S-14 | `:VAR_USER` em chamada aninhada, em `runQueryMitra` por business e nas SFs `kb*` chamadas por JS | DT-07/DT-08 e a regra única DT-34/DT-35 já cobrem as duas hipóteses; plano C: escrita direta guardada |
| S-03 | SF fora do perfil chamada por dentro de JS | `ccEsc…` no perfil com guarda |
| S-04, S-05, S-06 | `rowsAffected`; `FIND_IN_SET`/`SUBSTRING_INDEX` com parâmetro; funções do MySQL da plataforma | reler a linha; uma execução por linha |
| S-07, S-08 | JDBC do Winthor por business e por cron; tempo da leitura completa | SF SQL Oracle; leitura retomável |
| S-09 | Cron de 5 min chamando JS por id e `runDmlMitra` | um cron por passo |
| S-10, S-11 | `uploadFilePublicMitra` e `sendEmailMitra` por business e por cron | anexo como link; envio pela rotina |
| S-12 | Colunas do Winthor (`PCPREST`, `PCPLPAG`, `PCCOB`, extras de `PCCLIENT` e `PCNFSAID`, empenho, ramos 11–15) | trocar em `winthor-sql.mjs` / `winthor-nf.mjs`; setor pelo prefixo do ramo |
| S-13 | Custo real das SFs `kb*` em execuções | ajustar o teto por rodada |
| S-15 | Passo `ACESSOS` pondo usuário novo no perfil da plataforma | refazer o perfil pelo `add-090`; a tela avisa |
| S-16 | `{{x}}` ligado como parâmetro ou substituído como texto (inclui `LIMIT/OFFSET`) | números já entram por `CAST('{{x}}' AS …)` (DT-45); `LIMIT/OFFSET` conferidos como inteiro pela JS/tela |
