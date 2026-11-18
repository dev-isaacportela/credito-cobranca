# Tasks: Cobrança das três carteiras (privada, Estética e pública)

**Plan:** [`plan.md`](plan.md) · **Data:** 2026-11-14 (refeito contra o contrato técnico, fase 0c)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`.
>
> `[P]` = paralelizável (arquivos distintos, sem dependência entre si). As SFs ficam todas em
> `backend/add-020-cobranca-privada.mjs` e os testes de smoke num arquivo só: não levam `[P]`.
>
> **Duas trilhas.** A trilha **Backend** (T-001 a T-051 e os testes de smoke) termina inteira
> antes da trilha **Frontend** (T-060 a T-078 e os testes de tela). Cada task de SF diz o teste
> que a prova (`prova: T-1xx`); a SF só está feita com esse teste verde.
>
> **(PA-nn)** = a task segue o pedido PA-nn (`docs/contrato/pedidos/002-cobranca-privada.md`),
> aceito pelo arquiteto (`docs/contrato/pedidos/00-respostas.md`, seção 002).
>
> Nada aqui roda em produção: `setup-backend.mjs`, `add-*.mjs` e o `mitra-sdk` só rodam no
> sandbox, pelo integrador. Migration não se cria à mão.

## Backend

### Fundação

- [ ] **T-001** — Conferir o resultado de S-01 a S-14 (T-002 da 001) (as respostas aos pedidos PA-01 a PA-24 já estão no plan, seção "Respostas do arquiteto"); onde o resultado pedir o plano B, ajustar o trecho citado → `docs/specs/002-cobranca-privada/plan.md`. Prova: tabela "Sandbox" do plan sem linha em aberto
- [ ] **T-002** — DDL das 8 tabelas de `02 §002`, um template literal por tabela, com as chaves únicas (`ATIVO_CHAVE` do caso, ação por caso e fase, `CHAVE` da fila) e a coluna `CC_COBRANCA.FASE_DEVIDA` (DT-35) → `backend/schema/002-cobranca-privada.mjs`. Prova: `sim:check`; T-146, T-159
- [ ] **T-003** `[P]` — As 52 chaves `regua.*`, `cob.*`, `enc.*`, `alcada.*`, `meta.*` como em `03 §4–§7, §13` e `validarConjunto` (plan, "Parâmetros"; `cob.promessaMaxUteis` 0–30, PA-12) → `backend/lib/parametros/002-cobranca-privada.mjs`. Prova: T-156
- [ ] **T-004** `[P]` — Os 11 modelos `COB_*` com o texto do relatório C §3.6, campos de `01 §13` + `[DATA_LIMITE]`, `EFEITO_LEGAL` nos cinco legais → `backend/lib/modelos/002-cobranca-privada.mjs`. Prova: T-151
- [ ] **T-005** `[P]` — `QUADROS` (`cobranca-privada`, `cobranca-estetica`, `cobranca-publica`: fases, checklists, capa, etiquetas de `05 §3.1–§3.4`; campos de capa `acao_fase` e `ultimo_contato`, PA-11) e `ITENS_ACAO` → `backend/lib/quadros/002-cobranca-privada.mjs`. Prova: T-101, T-129
- [ ] **T-006** `[P]` — `CARTEIRAS_COM_REGUA`, `faseDevida()`, `bloqueioDevido()`, `etiquetas()`, `nomeDaFase()`, `prazoDaAcao()`, `acaoNoPrazo()` (PA-03) → `backend/lib/cobranca-privada/regua.mjs`. Prova: T-130, T-131, T-133, T-158, T-161
- [ ] **T-007** `[P]` — `parcelasAcordo()` → `backend/lib/cobranca-privada/acordo.mjs` (o nível do acordo e da baixa ficou só na SQL do INSERT, D-003; `nivelAcordo`/`nivelBaixa` saíram na correção B2) (situações de `02`, PA-01 e PA-02). Prova: T-139, T-141
- [ ] **T-008** `[P]` — `encargosTitulo()`, `somarEncargos()` (título a título, arredondamento de `01 §2`) → `backend/lib/cobranca-privada/encargos.mjs`. Prova: T-125, T-143
- [ ] **T-009** `[P]` — `dataLimite()` e `MODELO_DA_FASE` → `backend/lib/cobranca-privada/email.mjs`. Prova: T-151
- [ ] **T-010** `[P]` — Fragmentos `CASO_ABERTO`, `EVENTOS_AGENDA_SQL` (os 11 `TIPO` da tabela "Agenda"; `FICHA_REVISAR`, PA-10), `MODO_EMAIL_SQL`, `PROB_ATRASO_SQL`, `NIVEL_ACORDO_SQL`, `NIVEL_BAIXA_SQL`, `FASE_REGUA_PUB` (fase da régua do `cobranca-publica`: A-C2), só com funções de `06 §5` → `backend/lib/cobranca-privada/sql.mjs`. Prova: `sim:check`; T-153, T-124, T-112, T-141, T-126
- [ ] **T-011** — `gancho(slug)`: trecho único para os três quadros, regras de `04 §8` na ordem da DT-35 (destinos controlados primeiro; entre fases da régua só `PARA.CHAVE = FASE_DEVIDA`; saída de `acordo`, `juridico` ou final nunca; depois quem move; acordo em aberto, PA-01; preventiva não negocia, PA-07) → `backend/lib/quadros/002-cobranca-privada.mjs`. Prova: T-105, T-106, T-107, T-152
- [ ] **T-012** — Esqueleto do módulo: `definitions` vazio e `semearQuadro()` dos três quadros no `isEntrypoint()` → `backend/add-020-cobranca-privada.mjs`. Prova: `sim:check` com os três quadros criados
- [ ] **T-013** `[P]` — Seed, `winthor()` (DT-38): notas, títulos e pagamentos dos clientes 2001 a 2061 da tabela do plan pelo ajudante `nota()`, datas por `dia(n)` (inclusive os pagamentos de 2035, 2039–2041 e 2046); e `ATRIBUICAO` de 2015–2061 (coluna Agente da tabela do plan; aplicada no passo 7 junto com 2001–2014 do elenco, 06 §2.3); sem contatos (vão no `dominio()`, T-050) → `backend/simulator/seed/002-cobranca-privada.mjs`. Prova: `sim:check`; posição dos clientes depois do passo 6 do pipeline

### Escritas internas (`ccEsc…`, `04 §2`) — cada uma com `ATOR`/`ROTINA` e estado na guarda

- [ ] **T-014** — As 9 do caso: `ccEscCobCasoInserir` (`WHERE NOT EXISTS`; grava `FASE_DEVIDA`), `…CasoCard`, `…CasoCapa` (`CAPA_ENVIADA` e `FASE_DEVIDA`, cada uma só quando informada) e `…CasoProxAcao`, estas duas com guarda `ROTINA` ou `ATOR` com `clienteVisivelA` e `CARTEIRA = 'PUBLICA'` (em `…CasoCapa`, `FASE_DEVIDA` só com `FASE_REGUA_PUB` no destino e na fase atual do card: A-C2), `…CasoEncerrar`, `…CasoProtesto`, `…CasoJuridico`, `…CasoBloqueio`, `…CasoAnuencia` → `backend/add-020-cobranca-privada.mjs`. Prova: T-126, T-159
- [ ] **T-015** — `ccEscCobContatoInserir`, `ccEscCobPromessaInserir`, `ccEscCobAcaoInserir` (`INSERT IGNORE`) → idem. Prova: T-108, T-104
- [ ] **T-016** — `ccEscCobAcordoInserir` (nível na SQL), `ccEscCobAcordoParcelasInserir` (listas alinhadas, lotes de 20), `ccEscCobAcordoSituacao`, `ccEscCobAcordoParcelaPagar` → idem. Prova: T-111, T-112, T-113
- [ ] **T-017** — `ccEscCobBaixaInserir` (nível na SQL; quem propõe, PA-05), `ccEscCobBaixaParecer` (PA-21), `ccEscCobBaixaDecidir` → idem. Prova: T-115, T-141, T-142
- [ ] **T-018** — `ccEscCobFilaInserir` (`INSERT IGNORE`), `ccEscCobFilaSituacao` (lote por `FIND_IN_SET`) → idem. Prova: T-146, T-117

### Caso e régua

- [ ] **T-019** — `sincronizarCaso()` (os passos 0 a 5 do plan: origem rotina ou pessoa; pessoa só na `PUBLICA`, só em caso aberto (senão `pendente`), movendo só entre fases da régua do `cobranca-publica` e com `etiquetas` só da 005 (A-C2); `FASE_DEVIDA` antes do `kbCardMover`; `nota` quando move; `movidoPor` = quem age; `capaJson = '{}'` não mexe, `etiquetas` só do chamador, `CAPA_ENVIADA` sem reformatar, `desfecho` sem caso não abre) e `capaDoCaso()` → `backend/lib/cobranca-privada/caso.mjs`. Prova: T-126, T-159
- [ ] **T-020** — `ccCobCasoSincronizar` (`SIS + caso`, DT-34: rotina sem sessão e `membroId = 0`; pessoa com guarda `caso`, só na `PUBLICA`; entradas `nota ('')` e `membroId (0)`) → `backend/add-020-cobranca-privada.mjs`. Prova: T-126, T-160
- [ ] **T-021** — `ccCobRotina`, passos 1, 2 e 4: conjunto de trabalho numa consulta, cálculo em memória, abrir → mover → encerrar → capa, por carteira de `CARTEIRAS_COM_REGUA` (baixado não reabre, PA-06); e, nas três carteiras, o caso de cliente com processo ativo no Jurídico vai para `juridico` (linha 14 de `05 §3.6`); na `PUBLICA`, também promessas (linha 8) e, no card, só itens das ações registradas, etiqueta `Promessa vencida` e responsável (linha 13), DT-37 → idem. Prova: T-100, T-101, T-102, T-103, T-128, T-129, T-130, T-131, T-132, T-158
- [ ] **T-022** — `ccCobRotina`, passo 3: escritas em lote por `runDmlMitra` (promessas, acordos quebrados, bloqueio devido, `FASE_DEVIDA` dos casos a mover, fila nova e `FORA` — PA-04 —, ação marcada direto no card e `PROTESTADO` de `protesto_1`, auditoria) e devolução à régua do card em `acordo` (quebrado ou cancelado) ou em `negociacao` (cancelado ou fora da devida); recusado fica em `negociacao` → idem. Prova: T-110, T-114, T-133, T-134, T-137, T-140, T-146
- [ ] **T-023** — `ccCobRotina`, passos 5 a 7: modo `AUTOMATICO` (até 5 envios, um por caso × fase pela `REFERENCIA` em `CC_EMAIL_ENVIADO`), notas, marcação adiada dos itens (PA-24), contagem de execuções e `pendentes` → idem. Prova: T-149, T-162

### Leituras

- [ ] **T-024** — `ccCobQuadroResumo` → `backend/add-020-cobranca-privada.mjs`. Prova: T-101, T-120, T-129
- [ ] **T-025** — `ccCobCasoFicha` (uma execução; sinais do caso, inclusive `faseDevida`; `pode`; leitura do Jurídico, PA-21) → idem. Prova: T-104, T-120, T-155, T-157
- [ ] **T-026** — `ccCobSituacao` → idem. Prova: T-122
- [ ] **T-027** — `ccCobEncargosCalcular` (3 execuções; `membroId (0)` e visibilidade sobre o membro de `quem()`, DT-34; Winthor fora do ar devolve `erroWinthor`) → idem. Prova: T-125, T-128, T-143, T-166
- [ ] **T-028** — `ccCobContatoListar` e `ccCobContatoTotal` (filtros e somatórios, PA-08) → idem. Prova: T-108, T-128
- [ ] **T-029** — `ccCobAgendaListar` e `ccCobAgendaTotal` → idem. Prova: T-110, T-126, T-153
- [ ] **T-030** — `ccCobAgendaResumo` (com `ate`, `PROXIMOS` e `A_VENCER_7DU`, 04 §2) → idem. Prova: T-153
- [ ] **T-031** — `ccCobBloqueioListar` e `ccCobBloqueioTotal` (valores de `situacao`, PA-15) → idem. Prova: T-100, T-119, T-127
- [ ] **T-032** — `ccCobProjecaoListar` e `ccCobProjecaoTotal` → idem. Prova: T-124, T-144
- [ ] **T-033** — `ccCobEmailFilaListar` e `ccCobEmailFilaTotal` (valores de `situacao`, PA-23) → idem. Prova: T-117, T-118, T-145, T-149
- [ ] **T-034** — `ccCobPainelKpis` com as colunas do plan (PA-16) → idem. Prova: T-123, T-154, T-161
- [ ] **T-035** — `ccCobPainelAgentes`, `ccCobPainelBu`, `ccCobPainelAging`, `ccCobPainelTopDevedores` → idem. Prova: T-123, T-154
- [ ] **T-036** — `ccCobCasoListar` e `ccCobCasoTotal` (colunas e filtros de `04 §2`, PA-09) → idem. Prova: T-153

### Escritas públicas (forma A: valida → `ccEsc…` → `auditar()` → quadro)

- [ ] **T-037** — `ccCobAcaoRegistrar` (`protesto_1` = Sim grava `PROTESTADO`) → `backend/add-020-cobranca-privada.mjs`. Prova: T-104, T-134, T-146, T-161
- [ ] **T-038** — `ccCobContatoRegistrar` (`data`, PA-20; limite da promessa, PA-12; `origem` `MANUAL`/`REGUA_PUB`, `emailEnviadoId`, `membroId`) → idem. Prova: T-108, T-109, T-128, T-135
- [ ] **T-039** — `ccCobProxAcaoDefinir` → idem. Prova: T-147
- [ ] **T-040** — `ccCobEmailEnviar` → idem. Prova: T-118, T-150, T-151
- [ ] **T-041** — `ccCobEmailFilaDecidir` (até 2 ids por chamada, o 3º recusa com "até 2"; `extras.DATA_LIMITE`; uma `ccEscCobFilaSituacao` por item enviado, com o `EMAIL_ENVIADO_ID` dele; 16 execuções com 2 itens; não marca o card, PA-24) → idem. Prova: T-117, T-150
- [ ] **T-042** — `ccCobBloqueioAplicar` → idem. Prova: T-119, T-133, T-160
- [ ] **T-043** — `ccCobAcordoPropor` (`debito` relido, PA-22) → idem. Prova: T-111, T-127, T-138, T-139
- [ ] **T-044** — `ccCobAcordoDecidir` → idem. Prova: T-111, T-112, T-113
- [ ] **T-045** — `ccCobAcordoParcelaPagar` e `ccCobAcordoCancelar` (`N2`: nível ≥ 2 ou a marca `ADMIN`, D-06, e cliente visível, DT-41) → idem. Prova: T-140
- [ ] **T-046** — `ccCobBaixaPropor` (PA-05) e `ccCobBaixaParecer` (PA-21; sem nota no card, 3 execuções) → idem. Prova: T-115, T-141, T-142
- [ ] **T-047** — `ccCobBaixaDecidir` (parcial não encerra, PA-06) → idem. Prova: T-115, T-132, T-142
- [ ] **T-048** — `ccCobAnuenciaRegistrar` → idem. Prova: T-116, T-148
- [ ] **T-049** — `ccCobEnviarJuridico` (só aninhada; exige `CC_PROCESSO` do cliente e carteira com `DOSSIE_ENVIADO_EM`; `semCaso`, PA-18; `jaEnviado`) → idem. Prova: T-122, T-128, T-158

### Fecho do backend

- [ ] **T-050** — Seed, `dominio()` (passo 10 do pipeline, DT-38; nenhum `rodarCron`; a atribuição é do passo 7, T-013): contatos da ficha por `ccBaseContatoSalvar` (2004 sem e-mail; 2006, 2044, 2045 como descrito) e, sob `comRelogio(dia(n))` quando a data importa, as SFs reais para os estados da coluna "Estado extra" e dos clientes fixos (bloqueio aplicado de 2019 e 2057; negociação de 2021 e 2058; protesto de 2013 e 2052; baixa proposta de 2014; baixa aprovada de 2056; promessas de 2008 e 2035; acordos de 2011, 2028, 2029, 2032, 2042; caso público de 2043) → `backend/simulator/seed/002-cobranca-privada.mjs`. Prova: `sim:check`; banco do passo 11 com 2008 e 2035 avaliadas e 2028 `QUEBRADO` (T-110, T-114, T-137)
- [ ] **T-051** — Passar ao integrador, sem editar arquivo dele: lista das 39 públicas para o bloco 2000–2999 de `server-functions.ts`; as 21 `ccEsc…` no perfil; `ccCobRotina` em `FORA_DO_PERFIL` (`01 §14`); posição do `add-020` no `PUBLISH_ORDER` e, no prompt de sandbox da 002, republicar o `add-010` depois do `add-020` (DT-39); valores de `CHECK_INPUT` do plan; import de `seed/002` e `smoke/002`. Prova: `sim:check` verde com o módulo ligado

## Frontend

Só começa com a trilha Backend verde (T-190). Opções de `docs/opcoes-tela/escolhas.md`; componentes e dados de cada tela na tabela "Superfície de interação" do plan.

- [x] **T-060** `[P]` — `nomeDaFase()` → `frontend/src/lib/cobranca-privada/fases.ts`; `motivoDeDestino()` e `podeMover` (espelho do gancho, mesmas cláusulas e ordem; entre fases da régua só `caso.faseDevida`) → `frontend/src/lib/cobranca-privada/mover.ts`. Prova: T-103, T-106, T-130
- [x] **T-061** `[P]` — `semanaUteis()`, `agruparPorDia()`, `limitePromessa()` → `frontend/src/lib/cobranca-privada/agenda.ts`; `cenariosAcordo()`, `simularParcelas()` → `acordo.ts`; `corChance()`, `situacaoFila()` → `listas.ts`; `agruparPorSupervisor()`, `resumoGerencial()` → `gerencial.ts`. Prova: T-121, T-136, T-144, T-149, T-163
- [x] **T-062** — Rotas e itens de menu do módulo (as 11 rotas do plan) → `frontend/src/modules/002-cobranca-privada/index.ts`; pedir ao integrador o registro em `App.tsx`. Prova: `npm run build`
- [x] **T-063** — Quadro de cobrança, opção **B** "Capa com a situação" (`telas-01`): `KanbanBoard` por `:carteira`, sem novo card, sem excluir, `podeMover` de `mover.ts`, faixa de `Kpi` de `ccCobQuadroResumo` → `frontend/src/modules/002-cobranca-privada/Quadro.tsx`. Prova: T-193 (C-006 no simulador)
- [x] **T-064** — Card do cliente, opção **A** "Tudo em Nesta fase" (`telas-01`): `registrarExtensao` nos três slugs com `conteudoDaFase` = bloco "Ação da fase" (checklist ●, registrar ação, e-mail da fase, promessa, acordo, baixa, aviso da próxima etapa, contato rápido), lendo `ccCobCasoFicha` → `frontend/src/modules/002-cobranca-privada/extensoes.ts`, `card/AcaoDaFase.tsx`. Prova: T-193 (C-005); abrir o card = 2 chamadas (RNF-003)
- [x] **T-065** — `abasExtras`: "Contatos e promessas" e "Títulos do Winthor" (encargos adiados, com cache por caso) → `frontend/src/modules/002-cobranca-privada/card/AbaContatos.tsx`, `card/AbaTitulos.tsx`. Prova: T-193 (C-026)
- [x] **T-066** — `acoesExtras`: as dez ações de `05 §3.5`, cada uma conforme `pode` → `frontend/src/modules/002-cobranca-privada/extensoes.ts`. Prova: T-193 (C-021: Silvia sem botão em 2012)
- [x] **T-067** `[P]` — Registrar contato, opção **B** "Formulário com contexto" (`telas-03`) → `frontend/src/modules/002-cobranca-privada/RegistrarContato.tsx`. Prova: T-193 (C-009, C-010)
- [x] **T-068** `[P]` — Acordo de pagamento, opção **C** "Cenários lado a lado" (`telas-03`), abas Proposta e Acompanhamento → `frontend/src/modules/002-cobranca-privada/Acordo.tsx`. Prova: T-193 (C-012)
- [x] **T-069** `[P]` — Baixa como perda, opção **B** "Trilha e decisão" (`telas-03`) → `frontend/src/modules/002-cobranca-privada/Baixa.tsx`. Prova: T-193 (C-016)
- [x] **T-070** `[P]` — E-mails da régua, opção **C** "Abas por situação" (`telas-02`); aprovação de 2 em 2 (`ccCobEmailFilaDecidir`) e envio manual item a item, um pedido por vez, em sequência, com progresso → `frontend/src/modules/002-cobranca-privada/Emails.tsx`. Prova: T-193 (C-018); abrir ≤ 6 chamadas
- [x] **T-071** `[P]` — Histórico de contatos, opção **B** "Linha do tempo por dia" (`telas-02`) → `frontend/src/modules/002-cobranca-privada/Historico.tsx`. Prova: T-163 (`agruparPorDia`)
- [x] **T-072** `[P]` — Lista de bloqueio, opção **A** "Abas por situação" (`telas-04`), sem "valor atualizado" (PA-14) → `frontend/src/modules/002-cobranca-privada/Bloqueio.tsx`. Prova: T-193 (C-020)
- [x] **T-073** `[P]` — Projeção, opção **A** "Ranking por valor" (`telas-04`) → `frontend/src/modules/002-cobranca-privada/Projecao.tsx`. Prova: T-144
- [x] **T-074** `[P]` — Minha agenda, opção **B** "Semana em colunas" (`telas-05`): 8 colunas, `Kpi`, seletor de pessoa → `frontend/src/modules/002-cobranca-privada/Agenda.tsx`. Prova: T-121
- [x] **T-075** — Minha agenda: abas Clientes (`ccCobCasoListar`, PA-09), Aprovações e Indicadores, sob demanda → `frontend/src/modules/002-cobranca-privada/agenda/`. Prova: T-193 (RN-025)
- [x] **T-076** `[P]` — Regras de cobrança, opção **B** "Abas por assunto" (`telas-05`); renomear fase ao voltar da edição (PA-17) → `frontend/src/modules/002-cobranca-privada/Regras.tsx`. Prova: T-193 (C-004)
- [x] **T-077** `[P]` — Visão gerencial, opção **C** "Um bloco por agente" de `cobranca-visao-gerencial-2` (`telas-06-visao-gerencial-novas.html`): seletor de carteira, BU, agente e período; resumo; 4 totais do time; blocos por agente agrupados por supervisor, com medidores contra a meta → `frontend/src/modules/002-cobranca-privada/VisaoGerencial.tsx`, `gerencial/Totais.tsx`, `gerencial/BlocoAgente.tsx`. Prova: T-163; abrir = 3 chamadas
- [x] **T-078** — Visão gerencial: as cinco abas (faixa de atraso, etapa da régua, BU, ações/acordos/baixas, concentração — esta com as duas linhas da 006 só se `ccPainelConcentracao` existir), cada uma pedindo o dado na primeira vez → `frontend/src/modules/002-cobranca-privada/gerencial/Abas.tsx`. Prova: T-193 (C-024)

## Testes

Obrigatório: uma task por linha da seção **Testes** do `plan.md` (o que o `assert` verifica está lá, na mesma linha). RN-012 não tem task própria: é coberta por T-113 e T-115. Em linha "smoke + tela" ou "puro + tela", o `teste()` de smoke fecha na trilha Backend e o `test()` de tela na trilha Frontend; a task só fecha com os dois.

### Trilha Backend — `backend/simulator/smoke/002-cobranca-privada.mjs`

- [ ] **T-100** — `teste('C-001: …')`: 2015 em `cob_ativa`, sem ação, bloqueio de pedidos devido e na lista
- [ ] **T-101** — `teste('C-002: …')`: 2016, 2017, 2018 nas três preventivas; capa `a_vencer` de cada card
- [ ] **T-102** — `teste('C-003: …')`: 2019 paga → `REGULARIZADO`, 1 movimento do sistema, 1 linha a liberar
- [ ] **T-103** — `teste('C-004: …')` + tela: `regua.lig` = 6 só na Estética reposiciona 2020 e não 2015; `nomeDaFase`
- [ ] **T-104** — `teste('C-005: …')`: ação só fecha com todos os itens ●; item livre fica vazio
- [ ] **T-105** — `teste('C-006: …')`: recusas "saldo vencido" e "A régua move" (movimento à mão para fase ≠ `FASE_DEVIDA`, nas duas sessões)
- [ ] **T-106** — `teste('C-007: …')` + tela: saída da negociação, correção pela rotina, recusa com acordo em aberto; `motivoDeDestino`
- [ ] **T-107** — `teste('C-008: …')`: quatro destinos recusados com a mensagem de cada um
- [ ] **T-108** — `teste('C-009: …')`: contato, promessa e próxima ação
- [ ] **T-109** — `teste('C-010: …')`: previsão além de 5 dias úteis recusada
- [ ] **T-110** — `teste('C-011: …')`: 1 cumprida, 2 quebradas, texto "2 promessas quebradas" na agenda
- [ ] **T-111** — `teste('C-012: …')`: acordo no padrão, supervisor aprova, 5 parcelas, card em `acordo`
- [ ] **T-112** — `teste('C-013: …')`: entrada abaixo do mínimo sobe para o gerente
- [ ] **T-113** — `teste('C-014: …')`: quem propôs não aprova
- [ ] **T-114** — `teste('C-015: …')`: em D, 2028 (6 dias) quebrado e de volta à régua, 2029 (5 dias) ativo; sem mexer no relógio
- [ ] **T-115** — `teste('C-016: …')`: baixa com parecer, alçada e segregação (2030 e 2031)
- [ ] **T-116** — `teste('C-017: …')`: anuência pendente só para protestado (2013 sim, 2057 não); prazo 2026-11-27
- [ ] **T-117** — `teste('C-018: …')`: fila com aprovação; modelo não validado barra; envio grava contato e ação
- [ ] **T-118** — `teste('C-019: …')`: cliente sem e-mail
- [ ] **T-119** — `teste('C-020: …')`: abas da lista de bloqueio (2057 a liberar) e registro do aplicado; devolve o aplicado de 2015
- [ ] **T-120** — `teste('C-021: …')`: totais Bruno 1, Carlos 2, Sérgio 1, Silvia 2, Gustavo 3; lista, agenda e visão gerencial por pessoa; "Cliente não encontrado."
- [ ] **T-122** — `teste('C-023: …')`: recusa à mão; com a 003 (senão `pular`): envio só com dossiê enviado e por gerente; `jaEnviado`; rodando com `SIM_SESSAO_ANINHADA` 0 e 1
- [ ] **T-123** — `teste('C-024: …')`: números de Enfermagem em KPIs, aging, BU e agentes
- [ ] **T-124** — `teste('C-025: …')`: P 30% e 3.000; Q 50% e 2.000; R 5% e 50
- [ ] **T-125** — `teste('C-026: …')`: 200,00 + 100,00 + 40,00 = 10.340,00; `membroId` de Ana = como Ana, de Silvia recusado, nas duas sessões
- [ ] **T-126** — `teste('C-027: …')`: `ccCobCasoSincronizar` abre (rotina), move como Carlos nas duas sessões com nota e `FASE_DEVIDA` (≤ 13), recusa Ana, recusa a pessoa fora da régua do órgão, fora da `PUBLICA` e com etiqueta alheia (pela SF e direto nas internas, nas duas sessões), devolve `pendente` à pessoa com `desfecho`, e encerra (rotina) o caso de 2048; a rotina não abre nem move por dias na `PUBLICA`; `etiquetas` do chamador preservam as outras, `capaJson: '{}'` não atualiza, `desfecho` sem caso não abre
- [ ] **T-127** — `teste('C-028: …')`: sem acordo, sem bloqueio e sem fila para o órgão
- [ ] **T-128** — `teste('C-029: …')`: contato "Ofício" com NF e previsão longa (PA-12); previsão vencida quebra com `Promessa vencida` (DT-37); encargos 50.600,17; Jurídico do órgão e `juridico_1` (com a 003)
- [ ] **T-129** — `teste('C-030: …')`: 2012 com dois casos; pagar a Estética regulariza só um
- [ ] **T-130** — `teste('RN-001: …')` + tela: `faseDevida` para os 15 dias de atraso da linha; cards de 2004, 2005, 2006, 2008 e 2010
- [ ] **T-131** — `teste('RN-002: …')`: preventivas pela janela; 2003 pago no vencimento → `pago_no_prazo`
- [ ] **T-132** — `teste('RN-003: …')`: 2032 regulariza em `acordo`; 2056 baixado não reabre, nem com título novo enquanto o baixado está no Winthor; tirado o baixado, abre caso novo (PA-06)
- [ ] **T-133** — `teste('RN-004: …')`: `bloqueioDevido` 3, 4, 10 dias; acordo ativo com entrada paga libera (2029); baixado mantém (2056)
- [ ] **T-134** — `teste('RN-005: …')`: protesto pelo botão (2007) e direto no card + rotina (2049) marcam `PROTESTADO`; caso novo nasce limpo
- [ ] **T-135** — `teste('RN-006: …')`: feedback obrigatório, data futura recusada, próxima ação vencida limpa; `origem` `REGUA_PUB` grava `ORIGEM` e `EMAIL_ENVIADO_ID`, `MANUAL` sem retorno e `EMAIL_REGUA` pela entrada recusados
- [ ] **T-137** — `teste('RN-008: …')`: promessa quebrada, parcial quebrada, sem valor cumprida
- [ ] **T-138** — `teste('RN-009: …')`: garantia acima de `cob.acordoValorGerente`; níveis
- [ ] **T-139** — `teste('RN-010: …')`: `parcelasAcordo` 3.333,33 / 3.333,33 / 3.333,34 em dias úteis; desconto
- [ ] **T-140** — `teste('RN-011: …')`: quitação (2042); cancelamento por supervisor, Ana e Silvia recusadas, card de `negociacao` de volta à régua; recusado fica em `negociacao` (2053)
- [ ] **T-141** — `teste('RN-013: …')`: nível da SQL da proposta nas fronteiras (10.000,00 → 3; 10.000,01 → 5); recusas de valor e motivo
- [ ] **T-142** — `teste('RN-014: …')`: parecer só do Jurídico; baixa parcial mantém o caso
- [ ] **T-143** — `teste('RN-015: …')`: dois títulos → 10.340,04; 2010 → 31.118,13
- [ ] **T-144** — `teste('RN-016: …')` + tela: cliente montado no teste com todos os pagamentos em atraso → 95 (teto); `corChance` 40, 39, 15, 14
- [ ] **T-145** — `teste('RN-017: …')`: destinatário principal, único e vazio
- [ ] **T-146** — `teste('RN-018: …')`: fila de fase antiga some; duas rodadas não duplicam
- [ ] **T-147** — `teste('RN-019: …')`: sábado e feriado vão para 23/11 com aviso
- [ ] **T-148** — `teste('RN-020: …')`: anuência sem protesto recusada
- [ ] **T-149** — `teste('RN-021: …')` + tela: situações e ordem da fila; modo `AUTOMATICO` na `ESTETICA` (2050), um envio só por caso × fase; `situacaoFila`
- [ ] **T-150** — `teste('RN-022: …')`: item ✉ marcado, ação só com todos os ●; aprovação fora da equipe recusada
- [ ] **T-151** — `teste('RN-023: …')`: `dataLimite` nos três casos; 11 modelos com assunto base
- [ ] **T-152** — `teste('RN-024: …')`: `acordo` → `negociacao` (2029), card do órgão para fase ≠ `FASE_DEVIDA` e exclusão recusados
- [ ] **T-153** — `teste('RN-025: …')`: tipos e datas da agenda (2011, 2010 em fase da régua, 2052), aprovações do supervisor, `FICHA_REVISAR` (PA-10), `ccCobCasoListar` (PA-09), resumo igual à lista
- [ ] **T-154** — `teste('RN-026: …')`: conversão 40,0; maior devedor 66,7%; soma dos contatos por retorno
- [ ] **T-155** — `teste('RN-027: …')`: Jurídico não lê 2015, lê 2014 (baixa pendente) sem operar; agente de fora recusado
- [ ] **T-156** — `teste('RN-028: …')`: régua não crescente e faixas inválidas recusadas; válido grava e audita
- [ ] **T-157** — `teste('RN-029: …')`: `negociacaoVencida` no 11º dia (2058)
- [ ] **T-158** — `teste('RN-030: …')`: etiquetas em 44, 45, 59, 60 dias; com a 003 (senão pula): `semCaso` de 2041 (PA-18) e processo criado por `ccJurProcessoCriar` para 2009 leva o card a `juridico` na rodada seguinte
- [ ] **T-159** — `teste('RN-031: …')`: caso novo depois de regularizar (2057); troca de agente troca o responsável (2017, devolvido no fim)
- [ ] **T-160** — `teste('RN-032: …')`: bloqueio recusado para o órgão
- [ ] **T-161** — `teste('RN-033: …')`: `acaoNoPrazo()` puro com as entradas de 19/11, 18/11 e 20/11; no smoke, 2059–2061 (Nara): duas ações em D no prazo, uma sob `comRelogio` de 23/11 fora; `ACOES_NO_PRAZO_PCT` de Nara = 66,7 (PA-03; sem mexer no relógio do banco)
- [ ] **T-162** — `teste('RNF-002/RNF-006: …')`: telas ≤ 6, escritas ≤ 20, lote da fila com 3 ids recusado e 3 selecionados = 2 chamadas ≤ 20, rodada ≤ 150 com `pendentes`, rodada sem mudança = 0 escrita
- [ ] **T-164** — `teste('RF-005: …')` (puro, `capaDoCaso()`): itens da capa presentes quando se aplicam e ausentes quando não
- [ ] **T-165** — `teste('RF-036: …')`: a linha de `CC_AUDITORIA` por área (Cobrança, Acordos, Baixas, Bloqueio), afirmada dentro de C-009, C-012, C-016 e C-020, e a passagem do C-003 com autor sistema
- [ ] **T-166** — `teste('RNF-005: …')`: como Ana com `membroId` de Gustavo em 2023: "Cliente não encontrado." e nada gravado

### Trilha Frontend — `frontend/tests/002-cobranca-privada.test.mjs`

- [x] **T-121** `[P]` — `test('C-022: …')`: `semanaUteis('2026-11-19')` = 19, 23, 24, 25, 26, 27, 30/11; sábado na segunda; atrasado na primeira coluna
- [x] **T-136** `[P]` — `test('RN-007: …')`: `limitePromessa('2026-11-13', 5)` = 2026-11-23; 0 = sem limite
- [x] **T-163** `[P]` — `test('gerencial: …')`: `agruparPorSupervisor` (4 agentes, 2 grupos, somas) e `resumoGerencial`; mais um caso para `agruparPorDia`, `cenariosAcordo`, `simularParcelas`
- Partes de tela de T-103 (`nomeDaFase`), T-106 (`motivoDeDestino`), T-130 (`nomeDaFase` com `regua.lig` = 6), T-144 (`corChance`) e T-149 (`situacaoFila`)

## Verificação

- [ ] **T-190** — `cd backend && npm test` verde (`sim:check` + `sim:smoke`), com `SIM_SESSAO_ANINHADA=0` e `=1` — fecha a trilha Backend
- [ ] **T-191** — `cd frontend && npm test` verde; `npm run build` e `npm run lint` limpos
- [ ] **T-192** — Nenhuma tela com classe solta ou hex; nenhum CRUD REST; nenhuma escrita em `KB_*` fora das SFs `kb*` (busca no módulo)
- [ ] **T-193** — Verificação manual da spec reproduzida no simulador, como Ana, Sérgio, Gustavo, Silvia e Júlia: C-005, C-006, C-009, C-010, C-012, C-016, C-018, C-020, C-021, C-024, C-026 e a agenda (RN-025) dão o resultado do cenário
- [ ] **T-194** — Tema claro (`.theme-light`) sem cor quebrada nas 12 telas
- [ ] **T-195** — RNF-001 e RNF-004 no sandbox com massa de 5.000 casos e 500 clientes de um agente: quadro, lista de bloqueio e visão gerencial ≤ 2 s; agenda ≤ 3 s; custo real de `kbCardCriar`/`Mover`/`Atualizar` (S-13) conferido contra a tabela de orçamento do plan

## Dependências

```
T-001 → tudo
T-002 → T-014…T-018 → T-019 → T-020 → T-021 → T-022 → T-023
T-003…T-010 [P] entre si; T-005 → T-011, T-012; T-006, T-010 → T-019
T-013 [P] (só depende da 001) → T-050
T-021 → T-024…T-036 (leituras) ; T-014…T-018 + T-012 → T-037…T-049 (escritas)
T-016 → T-043 → T-044 → T-045 ; T-017 → T-046 → T-047 ; T-018 → T-040, T-041
T-037…T-049 → T-050 → testes de smoke (T-100…T-166) → T-051 → T-190
T-190 → T-060, T-061 [P] → T-062 → T-063 → T-064 → T-065, T-066
T-062 → T-067…T-074, T-076, T-077 [P] ; T-074 → T-075 ; T-077 → T-078
T-061 → T-121, T-136, T-163 [P] e as partes de tela de T-103, T-106, T-130, T-144, T-149
Frontend → T-191…T-195
```

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001, RF-002, RF-003 / C-001 a C-004, C-030 | T-006, T-019, T-021 | T-100 a T-103, T-129, T-130, T-131 |
| RF-004, RF-006 / C-002 | T-005, T-024, T-063 | T-101, T-123 |
| RF-005, RF-008 / C-005 | T-019, T-025, T-037, T-064 | T-104, T-134, T-164 |
| RF-007 / C-006, C-007, C-008 | T-011, T-060, T-063 | T-105, T-106, T-107, T-152 |
| RF-009, RF-010, RF-011 / C-009, C-010, C-011 | T-015, T-038, T-039, T-022, T-067 | T-108, T-109, T-110, T-135, T-136, T-137, T-147 |
| RF-012, RF-013 / C-012, C-013, C-014 | T-007, T-016, T-043, T-044, T-068 | T-111, T-112, T-113, T-138, T-139 |
| RF-014, RF-015 / C-015 | T-045, T-022, T-068 | T-114, T-140 |
| RF-016 / C-016 | T-017, T-046, T-047, T-069 | T-115, T-141, T-142 |
| RF-017 / C-017 | T-048, T-066 | T-116, T-148 |
| RF-018 / C-026 | T-008, T-027, T-065 | T-125, T-143 |
| RF-019 / C-020 | T-031, T-042, T-072 | T-119, T-133 |
| RF-020 / C-025 | T-032, T-073 | T-124, T-144 |
| RF-021, RF-022, RF-023, RF-024 / C-018, C-019 | T-018, T-033, T-040, T-041, T-023, T-070 | T-117, T-118, T-145, T-146, T-149, T-150 |
| RF-025 | T-004, T-009 | T-151 |
| RF-026 / C-023 | T-049, T-026, T-021, T-066 | T-122, T-158 |
| RF-027, RF-028, RF-029, RF-041 / C-022 | T-010, T-029, T-030, T-036, T-074, T-075 | T-121, T-153 |
| RF-030 a RF-033, RF-040 / C-024 | T-034, T-035, T-077, T-078 | T-123, T-154, T-161, T-163 |
| RF-034 | T-028, T-071 | T-108, T-163 |
| RF-035 / C-021 | T-024, T-025 e a guarda de T-014 a T-018 | T-120, T-155 |
| RF-036 | T-021, T-022 e o `auditar()` de T-037 a T-049 | T-102, T-156, T-165 |
| RF-037 | T-003, T-076 | T-156 |
| RF-038 | T-006, T-025 | T-157, T-158 |
| RF-039 / C-027 | T-019, T-020 | T-126, T-159 |
| RF-042 / C-028, C-029 | T-043, T-042, T-033, T-038 | T-127, T-128, T-160 |
| RNF-001, RNF-004 | T-024, T-029, T-031, T-034 | T-195 |
| RNF-002, RNF-006 | T-021, T-023, T-041 | T-162 |
| RNF-003 | T-025, T-064 | T-162, T-193 |
| RNF-005 | T-014 a T-018, T-027 | T-113, T-115, T-120, T-155, T-166 |
| RN-001 a RN-033 | a task da SF ou da função citada na linha do teste | T-130 a T-161 (RN-012: T-113 e T-115) |
