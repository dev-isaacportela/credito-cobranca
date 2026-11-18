# Correções do contrato depois da validação v2 (16/11/2026)

Origem: os 8 relatórios `docs/validacao/*-v2.md`. Aqui está só o que nasce no contrato. O que é só do plano de uma
spec (teste, seed, ordem de teste, guarda local) fica com o agente da spec, pelo próprio relatório v2.

Nenhuma SF, tabela, parâmetro ou fase foi criado ou removido: os números do índice continuam 55 tabelas, 277 chaves,
328 SFs (227 + 101) e 84 fases. Entraram três colunas (`CC_COBRANCA.FASE_DEVIDA`, `CC_SOLICITACAO.PROPOSTA_POR`,
`CC_PEDIDO_RETIDO.RECOMENDADO_POR`) e mudaram entradas, saídas e "quem" de SFs existentes (lista em 04 §0).

## 1. Decisões

| # | Decisão | Motivo | Onde |
|---|---|---|---|
| DT-34 | **Chamada aninhada, regra única.** (1) Quem chama passa `m.membroId`; a JS chamada resolve por `quem()` e aplica a visibilidade sobre esse membro (`MEMBRO_A` + `clienteVisivelA`), nunca por `EU`. (2) SQL de leitura com `EU` nunca é aninhada: a tela chama, ou a JS lê a tabela da outra dona. (3) Escrita aninhada só em SF que aceita a origem: `SIS` = só rotina; `SIS + <quem>` = duas origens. (4) Efeito de quadro só em nome de quem escreve naquele quadro | funciona igual com `SIM_SESSAO_ANINHADA` 0 e 1, e com sessão o `membroId` do input é ignorado: a identidade nunca vem da tela (entre-specs B-1, B-2, C-4; 006 B-1; 002 O-1) | 01 §4, §6; 04 §0 |
| DT-35 | **Gancho por domínio.** "Quem move" vale só para o movimento livre; destino que o sistema controla confere só o estado do domínio. Na cobrança, movimento entre fases da régua só para `CC_COBRANCA.FASE_DEVIDA` (gravada por `ccCobCasoSincronizar` antes de mover). Supervisor passa a `membro` do quadro `juridico` | com a sessão levada, o gancho recusava quem decide na alçada sem ser "caso", o supervisor que envia o dossiê e o agente que lança datas da NF (003 C-7, 004 O-8, entre-specs B-1) | 04 §8; 05 §1 regra 6, §2; 02 `CC_COBRANCA` |
| DT-36 | **Decisão de crédito do órgão.** A fotografia do motor do órgão é `CC_ANALISE_ORGAO.RATING_PUB`/`EXPOSICAO`, gravada pela 005 em toda `ccPubAnaliseSalvar` e no "Calcular" (`gravar = 1`). A decisão (004) chama `ccPubMotorCalcular` direto, confere com a fotografia, e na SQL: exceção na Pública = `limiteAprovado > EXPOSICAO` (os outros termos só com `temMotorProprio`); faixa = `alcada.conc*` da `PUBLICA`; copia `RATING_PUB` e `LIMITE_MOTOR` na decisão e `ANALISE_ORGAO_ID` no crédito | ninguém gravava a fotografia do órgão em `CC_SOLICITACAO`, e toda aprovação de órgão virava exceção ou recusa; ler a análise da 005 não soma execução (continua 17–18) nem cria escrita cruzada (005 B-1, 004 C-1, C-5) | 04 §4 `ccCredDecisaoRegistrar`, `ccCredMotorCalcular`, §5 `ccPubMotorCalcular`; 02 |
| DT-37 | **Rotina da 002 na Pública:** linhas 8 (promessa → `QUEBRADA`/`CUMPRIDA`, etiqueta `Promessa vencida`, nota), 13 só nos itens de ação registrada (`juridico_1`) e no responsável, e 14. A 9 (`Sem contato`) e as de régua por dias continuam fora | a limitação era lacuna, não E-1/E-2: a previsão do órgão é promessa como nas outras carteiras (RN-032 da 002) e a etiqueta está semeada no quadro público; já `Sem contato` não existe no quadro público e o órgão é cobrado pelo passo da NF (E-2) (002 C-1) | 05 §3.6; 04 §2 `ccCobRotina` |
| DT-38 | **Banco do simulador por um pipeline só** (11 passos): elenco → **quadros semeados** → leitura → `atribuir()` (agente por `ccBaseClienteAtribuir`, analista por `ccEscBaseClienteAnalista`, como Gustavo) → processamento → `passado()` → `dominio()` → leitura pedida e rotina finais. Relógio do banco = `RELOGIO` do smoke; começa em `INICIO` se um seed precisa de estado passado; a rotina só roda com o relógio para frente; `rodarCron` apaga a trava | o runtime só carrega `definitions` (sem `isEntrypoint()`), ninguém semeava os quadros; o relógio voltando não abre leitura; o elenco não tinha como gravar o analista (001 B-1, C-7; entre-specs C-5, C-6) | 06 §1, §2.3; 01 §14 |
| DT-39 | **Publicação em duas passadas** do `PUBLISH_ORDER` (a segunda injeta os ids de todas as SFs e remonta `ccPodeMover`), depois `add-001-kanban` e `add-090`; publicação de uma spec republica o `add-010` e quem a chama (hoje `add-040` depois do `add-050`). **Formato fixo de `modules/NNN/index.ts`** (`Modulo`, `RotaModulo`, `ItemMenu` em `lib/base/menu.ts`), só os 3 grupos da casca C | sem isso o `ccRotina` e a decisão pública ficam com id 0 para sempre e o gancho sem trechos; o M2 libera telas de 6 specs contra um tipo que não existia (001 C-2, C-3) | 01 §14 |
| DT-40 | **Quem propôs não decide** pelas colunas de autor: `CC_SOLICITACAO.PROPOSTA_POR` (último a gravar limite proposto, parecer, fotografia do motor ou ajuste) e `CC_PEDIDO_RETIDO.RECOMENDADO_POR`, além de analista e criador; atribuir analista só antes de `comite`, trocar analista do pedido só antes de `alcada` | trocar o analista ou o superior escrever a proposta contornava a segregação; a coluna é o que a guarda da 004 precisa e só o contrato pode criá-la (004 B-1, parte do contrato) | 02; 04 §0, §4 |
| DT-41 | `N2`/`N3`/`N5` sobre registro de cliente também exigem o cliente visível | nível mínimo dava acesso a cliente de outra equipe (002 C-4) | 04 §0 |
| DT-42 | Abrir card = `kbCardDetalheSql` + 1 ficha da dona + 1 leitura por módulo que estende o card; `ccPubAnaliseObter` passa a trazer `motor` | o bloco do órgão no card público custava 2 leituras a mais sem regra (005 C-9) | 01 §10; 04 §5 |

**Funil do painel (entre-specs O-3), revisto pela DT-33:** a resposta PA-21 da 006 (reduzir o funil ao que os resumos
traziam) contrariava a DT-33. `ccJurResumo` e `ccPubResumo` ganham `mes` e as colunas do funil escolhido (opção B de
`painel-juridico-publico`): a ajuizar, em andamento, acordos a receber e com parcela vencida, recuperado no mês e no
ano, custo no mês, desvios de prazo e críticos; no público, entre a entrega e o atesto, aguardando liquidação,
liquidadas sem pagamento, pagamento vencido, recebido no mês, tudo com quantidade e valor. Todos os dados existem nas
tabelas da 003 e da 005.

**Correções pontuais (causa no contrato):**

| Origem | Correção | Onde |
|---|---|---|
| entre-specs C-2, C-3; 005 C-2, C-3, O-7 | `ccCobContatoRegistrar` ganha `origem` (`MANUAL`, `REGUA_PUB`), `emailEnviadoId`, `membroId`; `REGUA_PUB` aceita `retorno = ''`, `feedback` sempre obrigatório. Contas fixadas: `ccPubNfPassoRegistrar` 18 com e-mail / 14 sem; `ccPubNfDatasSalvar` 16 com mudança de fase. `ccCobCasoSincronizar` ganha `nota` (a nota "Etapa do órgão" tinha ficado sem dono) | 04 §2, §5; 05 §3.7 |
| 002 C-2 | modo `AUTOMATICO`: um envio por caso × fase (`CC_EMAIL_ENVIADO.REFERENCIA`) | 05 §3.6 linha 11 |
| 002 C-3 | `ccCobEnviarJuridico` exige processo com `DOSSIE_ENVIADO_EM` | 04 §2 |
| 002 C-5 | `protesto_1 = Sim` grava `PROTESTADO` pelo botão e pela rotina | 04 §2; 05 §3.6 linha 12 |
| 002 O-8 | acordo cancelado devolve à régua de `negociacao` ou `acordo`; recusado fica em `negociacao` (04 e 05 discordavam) | 05 §3.6 linha 5; 04 §2 |
| 002 O-1 | `ccCobBaixaParecer` sem nota no card (o Jurídico é leitor da cobrança) | 04 §2 |
| 003 C-8 | `ccJurCargaPrevia` devolve `candidatos[]`; `ccJurCargaAplicar` aceita qualquer `clienteId` existente | 04 §3 |
| 003 O-3 | sugestão do dossiê público sem `ccPubAnaliseObter`/`ccPubNfListar`/`ccPubCertidaoListar`: lê as tabelas | 04 §3; 05 §8 |
| 004 C-4 | `ccCredAgendaListar`: `membroId` só eu ou abaixo de mim | 04 §4 |
| 004 C-8 | `ccCredPedidoTotal` devolve `ATRASADOS` | 04 §4 |
| 004 C-9, 006 O-7 | `PRE_APROVADA` conta como decidida e aprovada no painel (vale a RN-031 da 004) | 04 §6 |
| 006 C-1 | `ccPainelPosicao` devolve `fotoPendente` | 04 §6 |
| 007 O-4 | `ccHistRegrasVigentes`: o nome do grupo é da tela (`GRUPOS_PARAMETRO`) | 04 §7 |
| 001 O-6 | `CC_SINCRONIZACAO.CURSOR` = último `CODCLI` lido | 02 |
| 001 O-8, O-10, O-11 | elenco com parâmetros pela fusão do setup e filial que pula sem a tabela da 003; `nasDuasSessoes()` e `como(null)` em `smoke/base.mjs`; `smoke/900-fluxos.mjs` é do integrador | 06 §2.2, §3; 01 §14 |
| entre-specs O-1 | e-mail em lote: cada SF declara o seu lote (fila: 2) | 01 §13 |
| entre-specs O-5 | seed com data relativa ao `RELOGIO` do banco; absoluta só para feriado e vigência | 06 §1 |

Fica como observação, sem mudança nesta rodada: entre-specs O-4 (caso em `juridico` depois de processo encerrado sem
quitar). 003 B-1 (guarda do acordo judicial) e a parte de guarda da 004 B-1 são do plano da spec.

---

## 2. O que o plano de cada spec precisa mudar

Só o que vem das decisões acima. Cada item cita a decisão; o resto segue o relatório v2 da spec.

### 001-base (12)

1. **DT-38, B-1:** T-009/T-010 implementam em `seed.mjs` e `smoke/base.mjs` o pipeline de 11 passos de 06 §2.3, com o passo 3 (semear os `QUADROS` de cada `lib/quadros/NNN` presente pela mesma `semearQuadro()`). Teste novo no smoke da 001: com um `lib/quadros` de teste presente, `CC_FASE` tem as fases antes da primeira rotina e o passo `ACESSOS` grava `ADMINS_IDS` nesse quadro.
2. **DT-38, C-7:** `atribuir()` grava o agente por `ccBaseClienteAtribuir` (como Gustavo) e o analista por `ccEscBaseClienteAnalista` (`membroId` de Gustavo); roda no passo 7 (depois da leitura, antes do processamento). Teste do pipeline: um cliente da linha "Atribuição" com analista sai com `AGENTE_ID` e `ANALISTA_ID` gravados e o card nasce com o agente como responsável.
3. **DT-38:** `relogio.mjs`/`smoke/base.mjs`: `RELOGIO` exportado por cada smoke (padrão D), `dia(n)` contado do `RELOGIO`, `INICIO` e `passado()` opcionais nos seeds, `rodarCron` apagando `CC_ESTADO['rotina.trava']`, `como(null, fn)` e `nasDuasSessoes(fn)` (O-10).
4. **DT-38, C-1:** o seed da 001 só tem `winthor()`; `CC_CLIENTE` nasce no passo 6. O teste que precisa do "antes" (C-003, "antes: 10") parte do estado entregue no passo 11 e cria o caso novo dentro do teste (título no Winthor simulado + `ccBaseSincronizacaoPedir` + `rodarCron`).
5. **DT-38, O-8:** o elenco grava parâmetros e modelos pela mesma fusão do `setup-backend.mjs` (`vigencias`, `carteiras`) e pula `CC_FILIAL_CREDORA` se a tabela da 003 não existe.
6. **DT-39, C-2:** T-001 (ordem no `CLAUDE.md`) e T-036: publicação completa com o `PUBLISH_ORDER` duas vezes, depois `add-001-kanban` e `add-090`; o texto do prompt de sandbox por spec diz "republicar o `add-010` (e o `add-040` depois do `add-050`)".
7. **DT-39, C-3:** T-085 exporta de `lib/base/menu.ts` os tipos `Modulo`, `RotaModulo`, `ItemMenu` e `menuDoMembro(membro, modulos)` no formato de 01 §14; T-089 escreve o `index.ts` da 001 nesse formato e o M2 só fecha com os tipos publicados. Teste de tela (C-027): item com `pode` falso some; só os grupos `OPERACAO`, `CADASTROS`, `ADMINISTRACAO`.
8. **DT-34:** `visibilidade.mjs` exporta `MEMBRO_A(membroId)`; `ccBaseTitulosAbertos` e `ccBaseModeloPrever` declaram `membroId (0)` e aplicam a visibilidade sobre o membro de `quem()` (sem `EU`). Teste: `como(null)` com `membroId` de Ana devolve o mesmo que como Ana; com `membroId` de Silvia, "Cliente não encontrado.".
9. **DT-35:** passo `ACESSOS`: Supervisor é `membro` do quadro `juridico` (05 §2). C-033: Sérgio e Silvia em `ACESSO_JSON.pessoas` do `juridico` como `membro`.
10. **DT-41:** `ccBaseClienteClassificar` (`N2`) exige o cliente visível. Teste: Silvia classificando cliente da equipe do Sérgio → recusa.
11. **DT-39:** `App.tsx` (T-081): "módulo entregue" = módulo importado; `menuDoMembro` recebe a lista dos módulos importados.
12. **DT-34 (regra 5):** a seção Testes registra que as leituras JS aninhadas da 001 (`ccBaseTitulosAbertos`, `ccBaseModeloPrever`, `ccEmailEnviar`) rodam com `nasDuasSessoes`.

### 002-cobranca-privada (14)

1. **DT-34, entre-specs B-1, O-1:** `ccCobCasoSincronizar` deixa de recusar com sessão: é "SIS + caso". Rotina como hoje; pessoa (sessão ou `membroId > 0`, guarda `caso` do cliente): só caso aberto — move, capa e próxima ação; caso ausente ou `desfecho` → `{ ok: true, pendente: true }` sem escrita; `movidoPor` = quem age. Entradas novas `nota ('')` e `membroId (0)`. Guarda de `ccEscCobCasoCapa` e `ccEscCobCasoProxAcao`: `ROTINA` ou `ATOR` com `clienteVisivelA`.
2. **DT-35:** `sincronizarCaso()` grava `CC_COBRANCA.FASE_DEVIDA` antes do `kbCardMover` (`ccEscCobCasoCapa`, que passa a gravar `CAPA_ENVIADA` e `FASE_DEVIDA`; na rotina pode ir no lote por `runDmlMitra`) e grava a `nota` recebida quando move. DDL: coluna `FASE_DEVIDA`.
3. **DT-35:** trecho do gancho: "entre fases da régua" aceita só `PARA.CHAVE = FASE_DEVIDA`; linha à parte "saída de `acordo`, `juridico` ou final: nunca". Espelho `mover.ts` igual. Teste: Ana arrastando à mão entre fases da régua → recusa; C-027 ganha o caminho da pessoa com `nasDuasSessoes`: como Carlos, `nf_protocolar → liquidacao_vencida` movido nas duas, com nota e `FASE_DEVIDA`; como Ana (sem visibilidade) → recusa; pessoa com `desfecho` → `pendente`, sem escrita. Custo da pessoa ≤ 13.
4. **DT-37, C-1:** `ccCobRotina` na `PUBLICA`: linha 8 (promessa `QUEBRADA`/`CUMPRIDA`, etiqueta `Promessa vencida`, nota), linha 13 só itens de ação registrada (`juridico_1`) e responsável — sem capa, prazo, título nem `CAPA_ENVIADA` — e linha 14. O passo "Para cada carteira de `CARTEIRAS_COM_REGUA`" fica para a régua; os três blocos acima rodam também na `PUBLICA`. Teste C-029: previsão do órgão vencida → `QUEBRADA` e etiqueta na rodada; envio do órgão ao Jurídico → `juridico_1` = Sim na rodada seguinte.
5. **Pontual (C-3 entre-specs, O-7 da 005):** `ccCobContatoRegistrar` aceita `origem` (`MANUAL`, `REGUA_PUB`; `EMAIL_REGUA`/`FORA` pela entrada → recusa), `emailEnviadoId`, `membroId`; `REGUA_PUB` aceita `retorno = ''`. Teste: com `REGUA_PUB` grava `ORIGEM` e `EMAIL_ENVIADO_ID`; `MANUAL` sem retorno recusa.
6. **Pontual (O-1):** `ccCobBaixaParecer` sem `kbNotaRegistrar` (custo 5 → 3); RN-014 não afirma nota.
7. **Pontual (C-3):** guarda de `ccCobEnviarJuridico` exige `CC_PROCESSO` do cliente e carteira com `DOSSIE_ENVIADO_EM`. C-023 no smoke da 002: o processo sai de `ccJurDossieAbrir`/`ccJurDossieEnviar` quando a 003 está publicada; sem ela, `pular('depende de 003')`.
8. **DT-41, C-4:** `ccCobAcordoCancelar` com cliente visível; RN-011 ganha "Silvia recusada".
9. **Pontual (C-5):** `protesto_1 = Sim` grava `PROTESTADO` pelo botão e pela linha 12 da rotina. RN-005 ganha: item marcado direto no card + rotina → `PROTESTADO`.
10. **Pontual (C-2):** linha 11: modo `AUTOMATICO` só envia se não há `CC_EMAIL_ENVIADO` `ENVIADO` com `REFERENCIA = 'cobranca:<id>:<fase>'`. RN-021 ganha a segunda rodada sem e-mail novo.
11. **Pontual (O-8):** linha 5: acordo cancelado devolve à régua também de `negociacao`; recusado fica em `negociacao`. Ajustar o passo 4 do plan e o teste RN-011.
12. **DT-34:** `ccCobEncargosCalcular` declara `membroId (0)` e aplica a visibilidade sobre o membro de `quem()`. Teste: `como(null)` com `membroId` de Ana = como Ana.
13. **DT-38, C-9, C-10:** T-013 tira a atribuição (já vem do passo 7) e põe contatos/ficha em `dominio()`; nenhum `rodarCron` dentro do seed (T-050). O banco chega depois da rotina do passo 11 em D: o 2008 já com a promessa quebrada (06 §2.5); conferir se o acordo do C-015 (2028) ainda está `ATIVO` em D e, se não, mover a parcela no seed.
14. **DT-39:** prompt de sandbox: republicar o `add-010` depois do `add-020`.

### 003-juridico (9)

1. **DT-34, entre-specs B-2:** `ccJurDossieSugestao` lê `CC_NF_PUBLICA` (sem canceladas), `CC_NF_ACAO`, `CC_ANALISE_ORGAO` (mais recente do cliente) e `CC_CERTIDAO` com `runQueryMitra`, depois de conferir o processo pelo membro de `quem()`; sai do "Reuso por SF" (plan linha 32) `ccPubNfListar`, `ccPubCertidaoListar` e `ccPubAnaliseObter`. Tabela da 005 ausente = sugestão vazia. A conta de abrir o dossiê público cai 2 (igual à privada). C-007 roda com `nasDuasSessoes`.
2. **DT-34:** `ccCobEncargosCalcular`, `ccBaseTitulosAbertos`, `ccBaseModeloPrever` e `ccCobEnviarJuridico` aninhadas sempre com `membroId`; nenhuma JS da 003 chama SQL com `EU` aninhada (se `ccJurProcessoFicha` usa `ccCobSituacao`, troque por leitura de `CC_COBRANCA` ou pela tela).
3. **DT-35, C-7:** trecho do gancho `juridico`: primeiro as cláusulas de `dossie → recebido` com `DOSSIE_ENVIADO_EM` e `→ encerrado` com `ENCERRADO_EM`, depois "só o Jurídico move" para o resto. Espelho `podeMover` igual. RN-004 (T-127): Sérgio envia com `nasDuasSessoes` → card em `recebido` nas duas.
4. **O-3 / DT-33:** `ccJurResumo` com `mes` e as colunas do funil (04 §3); o plan fixa a expressão de `DESVIOS_PRAZO`/`DESVIOS_CRITICOS` pela regra de `ccJurAlertas`; C-017 ganha os números novos.
5. **Pontual (C-8):** `ccJurCargaPrevia` devolve `candidatos[]`; `ccJurCargaAplicar` aceita qualquer `clienteId` existente; C-023 afirma 2 candidatos (3015, 3016).
6. **DT-38, C-1:** a 3013 em `protesto` vai em `passado()` com `INICIO = dia(-40)` (o banco lê e processa em `dia(-40)`; `passado()` chama `ccCobAcaoRegistrar` como Ana); o `dominio()` não volta o relógio nem roda a rotina.
7. **DT-38, C-2, C-10:** a rotina do passo 11 roda depois do `dominio()`: os casos de cobrança dos clientes com processo ativo já chegam em `juridico`. Declarar o efeito, ajustar RN-004/RN-007 a esse estado e declarar os seeds carregados (elenco + 003).
8. **DT-41:** `ccJurDossieAbrir` no ramo `N2` exige o cliente visível.
9. **DT-39:** T-161 (prompt de sandbox): republicar o `add-010` depois do `add-030`.

### 004-concessao-credito (10)

1. **DT-36, B-1 da 005, C-1, C-5:** na `PUBLICA`, `ccCredDecisaoRegistrar` chama `ccPubMotorCalcular` direto (sem gravar, com `membroId`), confere `ratingPub`/`exposicao` com `CC_ANALISE_ORGAO` (diferente → "O motor mudou desde o último cálculo. Recalcule no bloco do órgão.") e não lê `RATING_MOTOR`/`MOTOR_LIMITE`. Conta 17–18, igual.
2. **DT-36, C-1:** `NIVEL_CONCESSAO` e `alcadaConcessao()`: na `PUBLICA` a exceção é só `limiteAprovado > CC_ANALISE_ORGAO.EXPOSICAO`; `AJUSTE_SITUACAO`, `MOTOR_RESULTADO`, fraude por CNPJ e cliente novo só com `S.CARTEIRA <> 'PUBLICA'`. RN-008 cruza SQL × função pura num caso público (≤ exposição → faixa; acima → Comitê de crédito).
3. **DT-36:** `ccEscCredDecisaoInserir` copia na SQL `RATING_PUB` e `LIMITE_MOTOR` (= `EXPOSICAO`); `ccEscCredCreditoInserir` grava `ANALISE_ORGAO_ID` (com `RATING_CONCESSAO` vazio). `ccCredMotorCalcular(PUBLICA, gravar = 1)` repassa `gravar` à 005 e não grava `CC_SOLICITACAO`. Capa `rating`/`limite_sugerido` do card público vem da análise. Plano B da S-13 (C-5): a nota da decisão pública sai do clique, sem exceção ao teto.
4. **DT-40, B-1:** DDL `CC_SOLICITACAO.PROPOSTA_POR` e `CC_PEDIDO_RETIDO.RECOMENDADO_POR`; `ccEscCredSolicitacaoAnalise`, `…Motor` e `…Ajuste` gravam `PROPOSTA_POR`; `ccEscCredPedidoAtualizar` grava `RECOMENDADO_POR`; a guarda da decisão exclui `ANALISTA_ID` e `PROPOSTA_POR` (concessão) e `ANALISTA_ID`, `CRIADO_POR`, `RECOMENDADO_POR` (pedido); `ccCredSolicitacaoAtribuir` só antes de `comite`; troca de analista do pedido só antes de `alcada`. RN-007 (T-150) ganha um caso por desvio (a)–(c) do relatório v2.
5. **DT-35, O-8:** trechos de `concessao-*` e `pedidos-limite`: cláusulas de domínio dos destinos controlados primeiro, "quem move: caso" só no movimento livre; a linha "saída de `gestao`/`reanalise`/final" vale só para destino que não é controlado. Teste: Silvia decide a solicitação de Rita com `nasDuasSessoes` → card na fase seguinte nas duas.
6. **Pontual (C-8):** `ccCredPedidoTotal` devolve `ATRASADOS`; C-025 afirma pela gêmea.
7. **Pontual (C-4):** `ccCredAgendaListar` com `membroId` só eu ou abaixo de mim; teste: Ana pedindo a fila de Rita → zero linha.
8. **DT-41:** `ccCredSolicitacaoAtribuir` e `ccCredReanaliseAbrir` (`N2`) exigem o cliente visível.
9. **DT-38:** o seed não roda `ccRotina` nem atribui (passos 6–8 do orquestrador fazem; Rita já é analista de 4001–4010); o smoke exporta `RELOGIO = '2026-11-14T10:00:00'`.
10. **DT-39:** o `add-040` é republicado depois do `add-050` (id de `ccPubMotorCalcular`); prompt de sandbox da 004 diz isso.

### 005-setor-publico (11)

1. **DT-34, DT-35, entre-specs B-1, C-1:** `ccPubNfDatasSalvar` chama `ccCobCasoSincronizar` como pessoa (com `membroId`), com fase, capa, próxima ação e `nota` "Etapa do órgão: <nome>" quando a fase muda. Conta 16 (C-2, C-3); T-020 roda com `nasDuasSessoes` e afirma card movido, nota e ≤ 20 nas duas.
2. **Pontual (C-3):** `ccPubRotina` manda `nota` quando a fase muda e não manda `responsavelUserId` (a 002 reconcilia).
3. **Pontual (C-2, C-3, O-7):** `ccPubNfPassoRegistrar` chama `ccCobContatoRegistrar` com `origem = 'REGUA_PUB'`, `retorno = ''`, `feedback` "<passo> feito" + `obs`, `emailEnviadoId` e `membroId`. Contas 18 com e-mail / 14 sem na tabela do plan, em T-022 e T-164; C-021 afirma 2 contatos com `ORIGEM = 'REGUA_PUB'`.
4. **DT-36, B-1:** `ccPubAnaliseSalvar` e o "Calcular" (`ccPubMotorCalcular` com `gravar = 1`; o plan dizia "sem gravar") gravam a fotografia (`RATING_PUB`, `EXPOSICAO`, `CALCULADO_EM`) que a 004 lê. §Fluxo 1: a decisão chama `ccPubMotorCalcular` direto, não por `ccCredMotorCalcular`.
5. **DT-36, B-1, C-4:** seed: 5001 e 5004 são aprovados depois de `ccPubAnaliseSalvar` e com limite ≤ exposição; C-003, C-005, C-012 e RN-007 afirmam a alçada pela faixa da `PUBLICA` e exceção (Comitê de crédito) só acima da exposição; C-012 confere `CC_DECISAO.RATING_PUB`, `LIMITE_MOTOR` e `CC_CREDITO.ANALISE_ORGAO_ID`.
6. **DT-34:** `ccPubMotorCalcular` declara `membroId (0)` (aninhada pela 004) e aplica a visibilidade sobre o membro de `quem()`.
7. **DT-42, C-9:** `ccPubAnaliseObter` devolve `motor` (mesma função, sem gravar); o bloco do card em `analise`/`comite` abre com 1 leitura (card = 3); a conta entra no plan.
8. **O-3 / DT-33:** `ccPubResumo` com `mes` e as colunas do funil por `ETAPA_NF` (04 §5); C-019/C-029 ganham os números novos.
9. **DT-38, entre-specs O-5:** `comRelogio('2026-11-20…')` vira `comRelogio(dia(-11), …)`; datas do seed por `dia(n)` (feriado e vigência continuam absolutos); o smoke exporta `RELOGIO = '2026-12-01T10:00:00'`.
10. **DT-34:** `ccPubNfListar`, `ccPubCertidaoListar` e `ccPubAnaliseObter` não são mais chamadas pela 003; nada muda nelas além do item 7.
11. **DT-39:** prompt de sandbox: depois do `add-050`, republicar o `add-010` e o `add-040`.

### 006-painel-consolidado (6)

1. **DT-34, B-1:** o "plano C" vira o padrão: `ccPainelAtencao` devolve só os tipos das leituras próprias; o bloco Visão geral chama `ccCobAgendaResumo`, `ccJurResumo` e `ccPubResumo` direto e monta `PROMESSA_VENCIDA`, `ACAO_ATRASADA`, `JURIDICO_SEM_ANDAMENTO`, `JURIDICO_PRAZO`, `NF_PAGAMENTO_VENCIDO`, `NF_ACIMA_2M`, `CERTIDAO` com `atencaoDosResumos()` (pura, em `frontend/src/lib/painel-consolidado/`). T-020, T-114, T-123: smoke afirma os tipos próprios; teste de tela afirma os sete tipos a partir das linhas dos resumos; a conta do bloco continua ≤ 6. Sai do §Sandbox a linha "S-02 … `Atencao` deixa de aninhar".
2. **O-3 / DT-33:** `painel-juridico-publico` B mostra o funil completo do mockup com as colunas novas de `ccJurResumo` e `ccPubResumo` (com `mes` do filtro); desfaz a decisão D-06 do plan (redução da PA-21) e volta RF-017/RF-024/RF-025 ao que a tela mostra; teste do funil no banco B.
3. **Pontual (C-1):** `fotoPendente` está em `ccPainelPosicao` no contrato; trocar "fora do contrato" pela referência.
4. **Pontual (004 C-9, O-7):** `ccPainelSerieCredito` e `ccPainelCredito` contam `PRE_APROVADA` como decidida e aprovada; ajustar os asserts que a deixavam de fora.
5. **DT-38:** o "Preparo do banco A" sai do smoke e vai para o seed: `INICIO = dia(-6)` (08/11 com `RELOGIO` 14/11) e `passado()` com a classificação de 6001/6002, a baixa de 6005 e as mudanças no Winthor simulado; as atribuições já vêm do passo 7; o smoke exporta `RELOGIO = '2026-11-14T10:00:00'`.
6. **DT-38, entre-specs O-5:** o banco B carrega o seed da 005 com datas relativas ao `RELOGIO` 14/11; nenhum assert da 006 depende de data absoluta da 005.

### 007-historico-apoio (4)

1. **DT-38, entre-specs C-7, C-1 da 007:** 7001 tem só a agente Ana (passo 7). Na história do smoke, ~~Ana~~ **Sérgio** (corrigido no acabamento pós-v3, §6 item 1: só nível ≥ 2 indica outro analista na abertura) abre `ccCredSolicitacaoCriar` com `analistaId` = Rita; o pedido (`ccCredPedidoCriar`) vem depois, já com Rita analista. Ajustar o passo 4 do §Simulador e os "Dados de referência" da spec.
2. **DT-38:** o seed da 005 declarado vem com datas relativas ao `RELOGIO` da 007 (D); os asserts de 5001/5002 não dependem de data absoluta.
3. **DT-39, 001 C-3:** `index.ts` da 007 no formato de 01 §14: Histórico do cliente em `OPERACAO`; Fontes, Material de apoio e Regras em vigor em `CADASTROS` (não há grupos "Histórico" e "Apoio").
4. **DT-39:** prompt de sandbox: republicar o `add-010` depois do `add-070`.

---

## 3. Para o integrador (01 §14)

1. `seed.mjs`, `smoke/base.mjs`, `relogio.mjs`: pipeline de 06 §2.3 (a 001 constrói na B1, T-009/T-010): quadros semeados, `RELOGIO`/`INICIO`/`passado()`, `rodarCron` sem trava, `como(null)`, `nasDuasSessoes()`.
2. `PUBLISH_ORDER` em duas passadas, depois `add-001-kanban` e `add-090` (DT-39); `CLAUDE.md` com essa ordem.
3. `App.tsx`: importa `modules/NNN/index.ts` de cada spec entregue (é a definição de "módulo entregue") e os `extensoes.ts`, donas antes da 005.
4. `server-functions.ts`: nenhum nome novo nesta rodada.
5. `smoke/900-fluxos.mjs` (tarefa do integrador): acrescenta "datas da NF → card do `cobranca-publica` no clique, nas duas hipóteses de sessão" e "decisão pública com a fotografia do órgão".

## 4. Para o usuário (o que muda na tela)

- O funil "Jurídico e setor público" do painel volta a mostrar tudo o que a opção escolhida mostra (a ajuizar, acordos, recebido no mês e no ano, valor por etapa do público).
- O supervisor passa a ver todos os cards do quadro Jurídico (P-48, padrão "sim"; mover à mão continua só do Jurídico).
- O parecer do Jurídico na baixa não grava nota no card da cobrança (fica na ficha do caso e no histórico).
- A previsão de pagamento do órgão passa a quebrar e a marcar "Promessa vencida" como nas outras carteiras.

---

## 5. Fechamento v2 (16/11/2026)

Pontos que os agentes das specs deixaram abertos ao corrigir os planos. Números do índice iguais: 55 tabelas, 277
chaves, 328 SFs (227 + 101), 84 fases. Entrou uma coluna, `A_VENCER_7DU` no bloco SALDOS (as três tabelas de
posição). Decisões do usuário registradas no índice: D-07 (era a P-48) e D-08.

| # | Decisão | Motivo | Onde mudou |
|---|---|---|---|
| 1 | **Pipeline do banco.** (a) O `dominio()` pode mudar o Winthor simulado da própria faixa (a leitura do passo 11 lê) e apagar ou trocar linha da própria tabela que a rotina gravou nos passos 8–9 (fotos da 006). (b) Carga de tabela própria sem cliente nem card (fontes e material da 007, regras da 005) e estado histórico vão no `dominio()`, direto na tabela quando nenhuma SF grava. (c) O passo 7 aplica a coluna Agente de §2.4, a linha "Atribuição" de §2.5 e a `ATRIBUICAO` que cada seed exporta para os clientes a mais da sua faixa; atribuir no `dominio()` é proibido | o texto só previa SF pública sobre linha de cliente ou card, e a atribuição tardia deixava os cards do passo 8 sem responsável | 06 §2.3, §2.5; planos 001 (pipeline, T-009), 002 (2015–2058 em `ATRIBUICAO`, T-013, T-050), 004 (agentes e analistas dos baldes de 4011–4099 em `ATRIBUICAO`, T-040); 006 e 007 já cabiam |
| 2 | **Agenda no painel (RF-017 da 006).** `ccCobAgendaResumo` ganha `ate` (a tela manda o 7º dia útil), `PROXIMOS` e `A_VENCER_7DU`; a posição ganha `A_VENCER_7DU` (calculada pela leitura, com o mesmo calendário do vencimento efetivo) | DT-33: a opção B de `painel-agentes` mostra "a vencer em 7 dias úteis" e "próximos 7 dias úteis"; o valor por janela não existia no MySQL (só o próximo vencimento) | 02 bloco SALDOS; 04 §2, §9; planos 001 (`calcularPosicao` passo 5, C-001, RN-002, T-019), 002 (`ccCobAgendaResumo`, RN-025, T-030), 006 (RF-017 de volta, fora do "não faz", aba Agenda, C-023, D-06, T-057, T-123). Custo igual (bloco Cobrança = 4) |
| 3 | **Segregação na Pública (R-010 da 004).** O autor da proposta do órgão é `CC_ANALISE_ORGAO.ATUALIZADO_POR` (gravado por `ccPubAnaliseSalvar`; o "Calcular" não mexe), na lista de autores de 04 §0; a JS e a guarda de `ccEscCredDecisaoInserir` o excluem, e a fila `DECISAO_ALCADA` também | a decisão já lê a análise na mesma consulta: +0 execução e nenhuma escrita cruzada (gravar `PROPOSTA_POR` pela 005 custaria 1 execução e uma escrita na tabela da 004); quem só recalcula não vira proponente | 02 `CC_ANALISE_ORGAO`, `CC_SOLICITACAO.PROPOSTA_POR`; 04 §0, §4, §5; planos 004 (guarda, Fluxo 4, agenda, RN-007 (e) no 4099 órgão, R-010 fechado, T-019, T-032, T-150) e 005 (`…Inserir`/`…Atualizar` gravam o autor, T-011). Contas iguais (decisão 17–18, Salvar 4) |
| 4 | **Acordos judiciais a receber (D-08, decisão do usuário).** "A receber" e "com parcela vencida" contam só `ANDAMENTO`; os `AGUARDANDO` têm indicador próprio (`acordosAguardando` em `ccJurIndicadores`; `AGUARDANDO`/`VALOR_AGUARDANDO` em `ccJurAcordoTotal`), sem somar | dinheiro não aprovado não é a receber | 00 §2 (D-07, D-08; P-48 decidida); 04 §3; planos 003 (RF-014, RF-027, C-017: 07 = 0, 08 = 0, aguardando 1 · 60.000; T-007, T-103). O funil da 006 não mostra aguardando: nada muda nele |
| 5 | **Busca no Winthor por documento (RF-012 da 001).** `ccBaseClienteFicha` ganha `documento ('')` (CPF/CNPJ só dígitos): casa com `CC_CLIENTE.DOCUMENTO` ou, fora do sistema, vai a `ccBaseWinthorCliente` | o requisito pede código ou CPF/CNPJ e a ficha só recebia `codcli` | 04 §1; plano 001 (Ficha, RF-012 pelo CNPJ do 1011, T-126); spec 001 (exemplo do RF-012) |
| 6 | **005.** `alcadaConcessao()` (004) entra na regra nova de 01 §14 "importadas de outra spec"; "Contratação não encontrada para este órgão." no `analiseId` de `ccPubNfDatasSalvar`; O-2: `ccPubNfFicha` devolve `contratacoes[]`; O-3: os 7 códigos `PUB_ANALISE`, `PUB_PROTOCOLO`, `PUB_LIQ`, `PUB_FILA`, `PUB_PAGAMENTO`, `PUB_OFICIO`, `PUB_REQUERIMENTO`; O-4: pessoal acima de 100% do limite = 0 ponto, sem chave (definição do sistema, junto da trava `pessoalAcima`) | baratos: só texto do contrato, nenhum parâmetro nem SF | 01 §14; 03 §16; 04 §5; plano 005 (arquivo de modelos, RN-007, T-003) |
| 7 | **002.** (a) Entra o `EMAIL_ENVIADO_ID` por item: na aprovação da fila, uma `ccEscCobFilaSituacao` por item enviado; conta 15 → **16** (≤ 20). (b) `ccJurDossieAbrir` aceita cliente sem caso aberto só pelo ramo `N2`, com `COBRANCA_ID` nulo e sem nota; a RN-030 da 002 (2041, Gustavo) vale | (a) rastro de qual e-mail resolveu a linha da fila; (b) o contrato não dizia | 04 §2 (`ccCobEmailFilaDecidir`, passo 1 do fluxo), §3; planos 002 (`ccCobEmailFilaDecidir`, orçamento, C-018, T-041) e 003 (`ccJurDossieAbrir`) |

**Para o usuário (o que muda na tela):** a aba Agenda do painel volta a mostrar "A vencer em 7 dias úteis" e
"Próximos 7 dias úteis"; no Jurídico, "Acordos a receber" deixa de somar acordo aguardando aprovação, que aparece à
parte; a busca de cliente fora do sistema aceita CPF/CNPJ; na Pública, quem preencheu a análise do órgão não decide
a solicitação.

---

## 6. Acabamento pós-v3 (16/11/2026)

Origem: `docs/validacao/v3-A.md` e `v3-B.md` (nenhum BLOQUEIA). Números do índice iguais: 55 tabelas, 277 chaves,
328 SFs (227 + 101), 84 fases. Colunas: `CC_SOLICITACAO.PROPOSTA_POR` e `CC_PEDIDO_RETIDO.RECOMENDADO_POR` passam de
`INT` a lista `V(200)` (mesmo nome); entra `CC_ANALISE_ORGAO.PROPOSTA_POR` (lista). Nenhuma SF com entrada ou saída
nova; contas de execução iguais. **Nada do que a 001 usa mudou** (nenhum nome, fragmento, tabela ou SF da 001).

| # | Decisão | Motivo | Onde mudou |
|---|---|---|---|
| 1 | **Solicitação do 7001 aberta por Sérgio** com `analistaId` = Rita (não por Ana); corrige o item 1 da 007 em §2 | a guarda de `ccEscCredSolicitacaoInserir` (004) só aceita indicar outro analista com nível ≥ 2; com Ana a abertura falhava e C-001, C-006, RN-002 e RN-016 da 007 quebravam (v3 A-C1 = B-C2). Os quatro só contam eventos e visibilidade: fecham | plano 007 (§Simulador passo 4), spec 007 (Dados de referência), T-022; §2 item 1 da 007 acima |
| 2 | **Pessoa em `ccCobCasoSincronizar` só na `PUBLICA` e só entre fases da régua do `cobranca-publica`** (fase comum, não final, que não é `juridico`; destino e fase atual do card); `etiquetas` só as da 005; a guarda de `ccEscCobCasoCapa` e `ccEscCobCasoProxAcao` repete carteira e fases na SQL | o caminho pessoa (DT-34) não limitava carteira nem fase: um agente chamando direto movia o próprio card a `acordo`, `juridico` ou fase final, e com `SIM_SESSAO_ANINHADA=0` o gancho nem é consultado (v3 A-C2). Só a etapa do órgão (E-1) é informada por pessoa. +0 execução (a conferência vai na leitura do caso; pessoa continua 13, `ccPubNfDatasSalvar` 16) | 04 §2 (`ccCobCasoSincronizar`, internas); plano 002 (Escritas, internas com `FASE_REGUA_PUB`, `sincronizarCaso()` passo 0, C-027 com recusas pela SF e pela interna nas duas sessões), spec 002 (RN-032 e teste), T-014, T-019, T-020, T-126; plano 005 (`ccPubNfDatasSalvar`: já cumpre) |
| 3 | **RN-033 sem relógio**: as entradas de 18/11 e 20/11 vão na função pura `acaoNoPrazo()`; o 66,7% sai de 2059–2061 (agente Nara, só eles), duas ações em D e uma sob `comRelogio` de 23/11 | nenhum cliente do seed entra em `cob_ativa` em 18/11 ou 20/11 e o banco é entregue em D sem voltar o relógio (v3 A-C3); `comRelogio` só carimba a data da SF | plano 002 (Testes RN-033, tabela do seed, `ATRIBUICAO` 2015–2061), spec 002 (linha RN-033), T-013, T-161 |
| 4 | **Spec da 004 traz a regra do autor da análise do órgão** (RN-007 e linha de teste (e)) | o plano e a T-150 testavam uma regra que a spec não tinha (v3 B-C1) | spec 004 RN-007 |
| 5 | **Alçada não exige cliente visível, nas três carteiras** (D-05): `ccPubMotorCalcular` com `gravar = 0` e o card em `comite` aceita também nível ≥ `alcada.nivelSupervisor` (sem a marca); `gravar = 1` continua `caso` | na Privada o decisor fora do caso (Silvia) era aceito e na Pública a guarda `caso` do motor do órgão, chamado pela decisão, o recusava (v3 B-C3). A leitura do motor não é vazamento: o supervisor já é `membro` dos quadros e vê a capa | 04 §0 (`alçada`), §5 (`ccPubMotorCalcular`); plano 004 (texto do `N2`/alçada, RN-008 DT-35 com 4097 e 4098 públicos), spec 004 RN-008, T-193, seed T-040; plano 005 (`ccPubMotorCalcular`, RN-038 com Sérgio no 5005), spec 005 RN-038, T-013, T-151 |
| 6 | **Dado que entra no motor torna proponente**: `ccEscCredSolicitacaoDados` acrescenta `membroId` a `PROPOSTA_POR` quando muda score, faturamento, financeiro, garantia, alertas, consultas, abertura do CNPJ, fonte pagadora, valor ou tipo de cliente — na própria SQL, primeira atribuição do `SET` (06 §5), mesmo sem mudar o resultado do motor | o superior tirava a exceção do Comitê de crédito (CNPJ recente, cliente novo acima de `limite.fraudePct` do faturamento) mudando um dado por `…Dados` e decidia na própria faixa (v3-B O-2). Na SQL, para a chamada direta não escapar; +0 execução | 02 `CC_SOLICITACAO.PROPOSTA_POR`; 04 §4 `ccCredSolicitacaoSalvar`; plano 004 (Modelo, internas, Fluxo 2, RN-007 (f)), spec 004 RN-007, T-013, T-150 |
| 7 | **Todos os autores, não só o último**: `PROPOSTA_POR`, `RECOMENDADO_POR` e `CC_ANALISE_ORGAO.PROPOSTA_POR` viram listas que só crescem (`PROPONENTE_ADD`; guarda `NAO_PROPONENTE` = `FIND_IN_SET(membroId, col) = 0`; plano B da S-05 por `LIKE`); o limite que fica (lista só cresce; ex-analista que nada gravou decide; ~40 autores) está no R-011 da 004 | "o autor é o último a gravar": a proposta do superior deixava de bloqueá-lo quando o analista regravava, e na Pública bastava salvar o saldo (v3-B O-3). Barato: mesma instrução, +0 execução | 02 (`CC_SOLICITACAO`, `CC_PEDIDO_RETIDO`, `CC_ANALISE_ORGAO`); 00 DT-40; 04 §0, §4 (`ccCredDecisaoRegistrar`, `ccCredAgendaListar`), §5 (`ccPubAnaliseSalvar`); plano 004 (Modelo, internas, Fluxo 4, agenda, RN-007 (e) e (g), R-010, R-011, Complexity Tracking), spec 004 RN-007, T-005, T-013, T-019, T-023, T-150; plano 005 (`ccPubAnaliseSalvar`), T-011 |
| 8 | **Os dois fluxos do `smoke/900-fluxos.mjs`** (datas da NF → card do `cobranca-publica` no clique, nas duas sessões; decisão pública com a fotografia do órgão) entram em 06 §3 | só existiam no §3 item 5 deste pedido (v3-B O-4) | 06 §3 "Fluxos entre módulos" |

**Para o usuário (o que muda na tela):** na Pública, o agente que lança datas da NF continua movendo o card do órgão,
mas ninguém mais consegue mover um card de cobrança "pela etapa do órgão" fora da régua do órgão; quem gravou qualquer
parte da proposta de crédito (inclusive faturamento, CNPJ ou outro dado que entra no motor, e inclusive antes de outra
pessoa gravar depois) não decide aquela solicitação, que vai a outro com a alçada; na Pública, um Supervisor de outra
equipe com a alçada decide como já decidia na Privada.

**Para o construtor da 001:** nada muda no que a 001 constrói (`guarda.mjs`, `visibilidade.mjs`, `ccPodeMover`,
pipeline, elenco). A 002 passa a usar `CC_FASE.FINAL` e `FASE_DO_CARD` (já da 001) num fragmento próprio; o seed da 002
atribui 2059–2061 à Nara pela `ATRIBUICAO` (passo 7, sem mudança no elenco).
