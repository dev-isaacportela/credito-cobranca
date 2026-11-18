# B3 · 003-juridico — validação independente do backend

**Data:** 2026-11-17 · **Escopo:** backend da spec 003-juridico. A 005 e a correção da 002 estão em curso e ficam de fora.

**Leu:** `CLAUDE.md`; `docs/LEIA-construcao.md`; a skill `mitra-escopo` 0.10.0 (`SKILL.md`, `references/plataforma-mitra.md`: perfil, 300 SF/min, 60 s); o README da `mitra-kanban`; o contrato `00`, `01`, `02` §003, `03` §14, `04` §0, §2 (Cobrança → Jurídico), §3 e §8, `05` §1, §2, §6 e §7, `06`; `pedidos/01-correcoes-v2.md` (DT-29, DT-34, DT-35, DT-41, DT-42); `arquitetura.md` §7 (D-07, D-09); `docs/specs/003-juridico/{spec,plan,tasks}.md`; os modelos `B2-002-cobranca.md` e `B2-004-concessao.md`. Código: `add-030-juridico.mjs` (inteiro), `schema/003-*`, `lib/{parametros,modelos,quadros}/003-*`, `lib/juridico/*`, `simulator/seed/003-*`, `simulator/smoke/003-*`, os blocos 3xxx de `frontend/src/lib/server-functions.ts` e, da base, `guarda.mjs`, `visibilidade.mjs`, `parametros.mjs`, `tempo.mjs`, `escritas.mjs`, `runtime.mjs` (`bindParams`), `smoke/base.mjs` e as guardas de `ccEscBaseEstado` e `ccEscBaseParametrosSalvar` em `add-010-base.mjs`.

**Rodou:** `cd backend && npm test`. Regra pura: 76 ok. `sim:check`: 105 SQL executaram, 0 falharam. Smoke: 274 ok, 0 pulados, 1 falha (001 C-031, conhecida, sem parte da 003). Smoke **003: 56 ok, 0 pulados, 0 falhas**. Rodou também três scripts descartáveis no scratchpad (cópia do banco do passo 11, nada no repositório): provas de B-01 a B-03, C-01, C-02, C-05 e O-01, O-02; a contagem de execuções por SF; e envio, criação, carga e encerramento com `nasDuasSessoes` (mesmo resultado nas duas). Nada contra a plataforma.

**Conferido e conforme:**
- **SFs:** 61 (42 públicas + 19 internas), nomes iguais a 04 §3, nos dois blocos de `server-functions.ts` (3001–3119, sem id repetido). Entradas e saídas batem com 04 §3; as diferenças são acréscimos (`tipo` em `ccJurAlertas`, `prazoAte`/`para` na prévia, `semelhanca` nos candidatos).
- **Tabelas e parâmetros:** as 8 tabelas batem com 02 §003 (colunas, tipos, nulos, padrões, `UQ` e `IX`). As 31 chaves `jur.*` batem com 03 §14 (padrão, unidade, sem carteira nem vigência); `validarConjunto.jur` cobre as relações de 03.
- **Quadro:** fases, SLA, cores, capa por fase, etiquetas e a automação de `recebido` batem com 05 §6 e §7. O gancho segue as 7 regras na ordem do plan (destinos controlados antes de "Só o Jurídico move processos.", DT-35). Supervisor é `membro` do `juridico` pelo passo `ACESSOS` da base (D-07).
- **Identidade e alçada:** toda JS usa `quem()`; toda interna tem `ATOR` (DT-34). Envio e aprovação comparam `A.NIVEL` sem a marca `ADMIN`, na JS (`m.nivel`) e na guarda. `jur.envioNivelMin`, `jur.acordoAlcadaNivel` e `jur.acordoAlcadaValor` só mudam por cargo de nível ≥ 3 (`CHAVES_ALCADA` da base, D-09). A política do acordo (situação, `ACIMA_ALCADA`, `NIVEL_EXIGIDO`) sai da SQL; o C-014 prova a chamada direta. Nenhum `FIND_IN_SET`: o furo B-02 da 004 não se repete aqui. As comparações com `{{membroId}}` são numéricas.
- **Relógio e dialeto:** nenhum `NOW()`/`CURDATE()`/`CURRENT_TIMESTAMP`/`new Date()` solto (`gestao.mjs:210` é aritmética sobre a data de referência). Datas em `VARCHAR`. Só funções de 06 §5. Nenhum `UPDATE` lê a própria tabela em subconsulta. Colunas SQL em maiúscula.
- **Auditoria:** toda JS de escrita chama `auditar()`, salvo O-10.
- **Orçamento:** medido pelo contador: `ccJurDossieEnviar` 27 (≤ 30), abrir dossiê ≤ 20, ficha 1 (card = 2), sugestão 4, marcar item 4, andamento 9, notificação 10, encerrar 9, criar processo 12, alertas e indicadores 1 cada.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | 3 |
| CORRIGIR | 5 |
| OBSERVAÇÃO | 13 |

As 7 divergências declaradas são aceitáveis. Três pedem ajuste no contrato: 04 §8 (gancho), 04 §3 (`tipo` em `ccJurAlertas`) e 05 §6 (responsável padrão). A divergência 7 tem limite de implantação (O-05). Os três bloqueios têm a mesma origem do que apareceu na 002 e na 004: uma interna `ccEsc…` que confia em valor da entrada.

## BLOQUEIA

- **B-01 · `ccEscJurProcessoInserir` de origem `COBRANCA` aceita encerramento, valor e qualquer coluna da entrada** — `backend/add-030-juridico.mjs:1460-1473`.
  - **O defeito:** o ramo `COBRANCA` exige só o cliente visível e nenhum processo ativo na carteira. `ENCERRADO_EM`, `MOTIVO_ENCERRAMENTO`, `VALOR`, `AUTOS`, `RESPONSAVEL_ID`, `PRAZO`, `STATUS`, `CHAVE_CARGA` e `ULTIMO_ANDAMENTO_EM` vêm do parâmetro. Um agente (nível 1) grava, sem a JS, um processo já encerrado, que é ato só do Jurídico (`ccEscJurProcessoEncerrar` exige `JUR`). O `NOT EXISTS` olha só processos ativos, então a gravação se repete sem limite. Com `chaveCarga`, o agente ainda ocupa a chave de uma linha da planilha, e a carga passa a completar o processo dele.
  - **Prova no simulador:** Ana chama a interna com o cliente 3001, carteira `ESTETICA`, `valor` 1.000.000, `encerradoEm` hoje e `motivo` `QUITADO`. O `ccJurResumo` vai de `RECUPERADO_MES` 0 para 1.000.000 e de `RECUPERADO_ANO` 30.000 para 1.030.000. O indicador 06 sobe para 67%. Uma segunda chamada leva o mês a 2.000.000.
  - **Correção:** no ramo `COBRANCA`, a SQL grava `ENCERRADO_EM` nulo, `MOTIVO_ENCERRAMENTO`/`MOTIVO_TEXTO`/`AUTOS`/`TRIBUNAL`/`PRAZO`/`CHAVE_CARGA`/`ULTIMO_ANDAMENTO_EM` vazios ou nulos e `RESPONSAVEL_ID` nulo, com `CASE WHEN '{{origem}}' = 'COBRANCA' THEN … ELSE {{…}} END`. `VALOR` vem de `CC_POSICAO_CLIENTE_CARTEIRA.VENCIDO`, que é o que a JS já usa. Acrescentar ao RN-030 um teste com a chamada direta.
- **B-02 · `ccEscJurProcessoCard` liga o processo a qualquer card, e o gancho passa a ler o processo errado** — `add-030-juridico.mjs:1475-1476`; gancho em `lib/quadros/003-juridico.mjs:48-62`.
  - **O defeito:** a guarda pede só `CARD_ID IS NULL`, `cardId > 0` e `ATOR()`. Não confere que o card é do quadro `juridico` nem que nenhum outro processo já o usa. O gancho decide por `EXISTS (… CC_PROCESSO P WHERE P.CARD_ID = K.ID AND …)`. Um processo falso apontado para o card de outro cumpre a regra 3, `→ encerrado` com `ENCERRADO_EM`. Esse destino é controlado e não confere quem move (DT-35).
  - **Prova no simulador:** Sérgio (Supervisor, `membro` do quadro) grava pela interna um processo encerrado (B-01) e o liga, por `ccEscJurProcessoCard`, ao card do Vale Verde (3002). Depois chama `kbCardMover` para `encerrado`: `ok: true`. O card fica em `encerrado` com `CC_PROCESSO.ENCERRADO_EM` nulo e não volta mais ("Processo encerrado não volta."). Pelo mesmo caminho, um processo sem autos ligado a um card trava as fases `citacao` a `execucao`. A capa e o título do card também passam a ser regravados pelas SFs do processo falso.
  - **Correção:** a guarda exige `EXISTS (SELECT 1 FROM KB_CARD K JOIN KB_BOARD B ON B.ID = K.BOARD_ID WHERE K.ID = {{cardId}} AND B.SLUG = 'juridico')` e `NOT EXISTS (SELECT 1 FROM CC_PROCESSO X WHERE X.CARD_ID = {{cardId}})`. Um `UNIQUE (CARD_ID)` no DDL faz o mesmo (pedido a 02). Mais um teste com a chamada direta.
- **B-03 · as parcelas do acordo não precisam bater com o acordo: a entrada mínima vira só declaração** — `add-030-juridico.mjs:1563-1572` (`ccEscJurAcordoParcelasInserir`).
  - **O defeito:** a política é decidida na SQL de `ccEscJurAcordoInserir` sobre `{{entrada}}` e `{{nParcelas}}` declarados (bloqueio B-1 v2). Depois, as parcelas `MANUAL` entram com `VALOR` e `VENCIMENTO` livres; a guarda confere só `NUMERO` ≤ `N_PARCELAS`. O plan (Complexity Tracking) e 01 §5 afirmam que a entrada mínima vale na chamada direta, e não vale.
  - **Prova no simulador:** Júlia chama direto `ccEscJurAcordoInserir` na Eta com 50.000, entrada declarada de 10.000 e 5 parcelas. O acordo nasce `ANDAMENTO`, nível 0. Em seguida ela grava a parcela 0 de R$ 0,01 e as cinco seguintes de 10.000, vencendo em 2031. O mesmo acordo pela SF (entrada 0,01) nasce `AGUARDANDO`, nível 3.
  - **Correção:** a guarda de `ccEscJurAcordoParcelasInserir` (origem `MANUAL`) recalcula o valor de cada parcela sobre o acordo: parcela 0 = `AJ.ENTRADA`; de 1 a N−1 = (`AJ.VALOR` − `AJ.ENTRADA`) ÷ `AJ.N_PARCELAS`, truncado nos centavos com uma função da lista de 06 §5 (a mesma conta de `gerarParcelas`); a N-ésima absorve o resto (RN-017). Recusa diferença acima de 0,004. Vencimentos sem passar de `AJ.REGISTRADO_EM` + `N_PARCELAS` meses + 1 mês. Mais um teste com a chamada direta no C-014.

## CORRIGIR

- **C-01 · a exceção da carga na política do acordo vale sempre que a carga está aberta, e a marca `ADMIN` reabre a carga** — `add-030-juridico.mjs:1452`, `:1554-1560`; base `add-010-base.mjs:1560`.
  - **Prova:** com a carga aberta (o seed nunca a conclui), Júlia grava direto, com `carga = 1`, um acordo de 500.000, sem entrada e em 60 parcelas, no P09. O acordo nasce `ANDAMENTO` com `ACIMA_ALCADA = 1` e `NIVEL_EXIGIDO = 0`. O mesmo vale depois de um acordo `RECUSADO` pelo Gerente.
  - **Reabertura:** Nara (Agente com `ADMIN`) conclui a carga e depois grava `jur.cargaConcluida = '0'` por `ccEscBaseEstado`. A prévia volta a ser aceita. A conclusão deixa de ser definitiva (RF-038), e a exceção da alçada fica à mão de quem tem a marca, o que D-09 veda.
  - **Correção na 003:** `carga = 1` só quando o processo não tem acordo nenhum, que é o que a JS já faz (`:1219`). `CARGA_ABERTA` passa a ser "não existe a linha" (a JS: `!!e`).
  - **Correção na base:** `ccEscBaseEstado` aceita para `jur.cargaConcluida` só o valor `'1'`. Decide o orquestrador.
- **C-02 · `ccEscJurNotificacaoInserir` grava data, valores, versão do modelo, processo e caso da entrada** — guarda em `add-030-juridico.mjs:1595-1602`; JS em `:1016` e `:1025`.
  - **Prova:** com o modelo sem validação, a SF recusa ("aguarda validação"). Ana grava direto, para a 3001, `EMITIDA_EM` 02/01/2026, `TOTAL` 1, `MODELO_VERSAO` 99 e `PROCESSO_ID` do Vale Verde, que é processo de outro cliente. A notificação é registro de efeito legal: a orientação do item `notif` do dossiê e a ficha mostram essa data.
  - **Na própria JS:** `processoId` e `cobrancaId` da entrada não são conferidos contra o cliente. Supervisor ou quem administra anota a notificação no card do processo de outro cliente.
  - **Correção:** na guarda, `EMITIDA_EM = HOJE_SQL`; o modelo validado em dia, relido de `CC_MODELO_MENSAGEM` (`VALIDADO_VERSAO = VERSAO` e prazo de `com.modeloRevalidarMeses`); `MODELO_VERSAO` da tabela; processo e caso só do mesmo `CLIENTE_ID`. Na JS, acrescentar `AND CLIENTE_ID = cid` às duas leituras. Os encargos não se recalculam em SQL. O mínimo é `PRINCIPAL` igual ao `VENCIDO` da posição (±0,004).
- **C-03 · `KB_ANEXO_IDS` estoura no MySQL estrito, e o SQLite não acusa** — `add-030-juridico.mjs:494`, `:503`; DDL `schema/003-juridico.mjs:60` (`V(200)`). A JS junta todos os ids de anexo do item, sem teto. Com cerca de 28 anexos de id de 6 dígitos (uma NF por arquivo, no item `nf` de um cliente com muitas notas), o `UPDATE` falha no MySQL. A releitura devolve "Sem permissão", e o SQLite grava normalmente. Correção: recusar acima de 200 caracteres, com mensagem ("até N anexos por item"), ou pedir `V(1000)` a 02.
- **C-04 · testes que não afirmam o que o plan pede:**
  - (a) **Orçamento** (`smoke/003-juridico.mjs:751-769`): faltam ficha e card em `dossie` = 2, "Ver sugestões" ≤ 6 e `ccJurAndamentoRegistrar` ≤ 12. A "tela" soma Listar, Total, Alertas e Resumo, e não o conjunto do plan (sessão, 2 da lib, Alertas, Indicadores e parâmetros). As contas reais cabem (medidas acima), mas nenhum teste as segura.
  - (b) **`nasDuasSessoes`** só aparece no C-007 (`:160`). O plan (Simulador) exige as duas sessões em abrir, enviar, criar, encerrar, carga, sugestão, demonstrativo e notificação, e o RN-004 com Sérgio. O validador rodou envio, criação, carga e encerramento nas duas, com o mesmo resultado. Falta o teste.
  - (c) **Chamada direta:** só `ccEscJurAcordoInserir` é chamada direto (C-014). Faltam `ccEscJurProcessoInserir`, `ccEscJurProcessoCard`, `ccEscJurAcordoParcelasInserir`, `ccEscJurNotificacaoInserir` e `carga = 1` em processo da carga (B-01 a C-02).
  - (d) **RN-015** (`:342-347`): falta "de volta a 0 (deriva)" da tabela do plan.
  - (e) **C-020** (`:660`): o `pular('depende da base…')` sobrou. A base já aceita a chave, e o `pular` só vale para spec não construída. Tirar, e afirmar também que `ccJurCargaAplicar` recusa depois de concluída.
- **C-05 · processo encerrado da carga entra como recuperado no mês da carga** — `add-030-juridico.mjs:1179`, `:1187` (`ENCERRADO_EM = agora`), lido por `REC_PERIODO` em `:1388-1390`. Provado: a linha "Antiga Farmácia" (encerrado, `QUITADO`) com 250.000 leva o `RECUPERADO_MES` de novembro de 0 a 250.000. Na carga real, todo o histórico quitado cai no mês da migração, no painel (006) e no indicador 06. Correção: `REC_PERIODO` ignora `ORIGEM = 'CARGA'` com `ENCERRADO_EM` = `CRIADO_EM`; o total histórico fica. A alternativa é pedir à spec a data de encerramento na planilha.

## OBSERVAÇÃO

- **O-01 · envio direto grava valor e prazo livres** — `add-030-juridico.mjs:1487-1493`. Provado: Gustavo chama `ccEscJurProcessoEnvio` com `valor` 1 e `prazo` 2099-12-31, e o processo fica enviado com o card ainda em `dossie`. Quem tem o nível já tem o ato, então o risco é baixo. A guarda também não exige o cliente visível, e a JS exige: com `jur.envioNivelMin = 2`, Supervisor de outra equipe envia por fora. Ler `VALOR` da posição na SQL e alinhar a visibilidade com a JS.
- **O-02 · `ccEscJurDossieItensInserir` aceita código fora do catálogo e `alcada` = `OK`** — `:1514-1518`. Provado: Ana grava o item `xyz` como `OK`. Num processo criado direto, `alcada` nasce `OK` com texto livre até o envio regravá-lo. Restringir `ITEM` ao catálogo da carteira e `alcada` a `PENDENTE`.
- **O-03 · e-mail "Dossiê recebido pelo Jurídico" vai para quem abriu o dossiê** — `:565-566`. O `kbCardMover` (gatilho da automação ao `$responsavel`) roda antes do `kbCardAtualizar`, que troca o responsável para o Jurídico. Se o aviso é para o Jurídico, inverter a ordem.
- **O-04 · parcela paga em acordo `AGUARDANDO`** — JS `:914`, guarda `:1592`. A parcela é aceita e entra no recuperado (`PAGO_TOTAL` exclui só `RECUSADO`). Exigir acordo `ANDAMENTO` para gravar `PAGA`.
- **O-05 · opções de filial e BU da capa** (divergência 7) — `lib/quadros/003-juridico.mjs:22-27`. BU 1–4 bate com o `setup-backend`. Filial `1`/`2` é do elenco do simulador. Em produção o filtro de filial do quadro fica vazio até alguém editar as opções. Entra na lista de implantação, ou `ccJurFilialCredoraSalvar` acrescenta a opção.
- **O-06 · cada JS carrega o código de todas** — `:217-228`, `:1620-1622`. São 27 JS de cerca de 81 KB (2,1 MB no total) com regras, carga, gestão e catálogos inteiros. Colar em cada SF só o que ela usa (`FONTE_CARGA` nas três da carga, `FONTE_GESTAO` em Alertas e Indicadores).
- **O-07 · busca sobre `UPPER()` com acento** — `:1276-1277`. Processo da carga sem cliente ("Pi Clínica Médica") não casa com a busca normalizada no SQLite. No MySQL (`ai_ci`) casa, então os dois bancos divergem. Comparar sobre o nome normalizado na gravação.
- **O-08 · máximos fora de 03 §14** — `lib/parametros/003-juridico.mjs:11-17`, como `prazoVermelhoDias` ≤ 60, `prazoAmareloDias` ≤ 90 e `paradoCriticoDias` ≤ 730. Anotar em 03 ou tirar.
- **O-09 · divergências não anotadas no plan** — o plan ainda descreve os blocos A/B/C, o card da carga "cria em `recebido`", o gancho com `dossie → qualquer` para todo processo e `ccJurAlertas` sem `tipo`. `CLAUDE.md` pede a anotação.
- **O-10 · reabertura do dossiê completa itens e card sem auditoria** — `:444-448`.
- **O-11 · ritmo da carga e o teto do projeto** — 10 processos por minuto × cerca de 13 execuções = cerca de 130 SF/min. É quase metade do teto de 300/min do projeto inteiro (skill §5): durante a carga, as telas de todos ficam perto da degradação. Considerar 5 por minuto ou carga fora do horário.
- **O-12 · responsável padrão = `MIN(ID)` do Jurídico** (divergência 3) — `:1489`. Com mais de um advogado, todo processo enviado vai para o mesmo. Pergunta ao arquiteto (parâmetro ou distribuição).
- **O-13 · notificação sem filial com o Winthor fora** (divergência 4) — `:956-966`. Sem títulos, a filial fica vazia e a mensagem diz "precisa ter razão social e CNPJ", o que engana. Usar a mensagem "Informe a filial credora (Winthor indisponível)".

## As 7 divergências declaradas

| # | Divergência | Aceitável? | Contrato |
|---|---|---|---|
| 1 | `BANCO_POR_TESTE = true` em vez dos blocos A/B/C | Sim. Cada teste monta o que precisa e as dependências de ordem do plan somem | Nenhum; atualizar "Ordem do smoke" no plan (O-09) |
| 2 | Gancho: "Envie o dossiê" só para processo `ORIGEM = 'COBRANCA'` não enviado; manual e carga nascem em `dossie` e a SF os move | Sim. `kbCardCriar` sempre cria na fase de entrada, e `dossie → recebido` de processo manual não é movimento livre (passa sem "quem move", inofensivo). Depende de B-02: o `EXISTS` sobre `CARD_ID` só é seguro com um processo por card | **04 §8:** "`dossie` → qualquer menos `encerrado`" vale só para o dossiê vindo da cobrança |
| 3 | Processo sem responsável recebe o primeiro membro `JURIDICO` ativo no envio | Sim, como padrão provisório (O-12) | **05 §6** (Responsável): dizer de onde vem o responsável no envio |
| 4 | Notificação sem filial usa a filial de maior saldo | Sim. É a mesma regra da abertura do dossiê; custa 1 execução a mais e precisa do Winthor (O-13) | Nenhum |
| 5 | `ccJurAlertas` com filtro `tipo` opcional | Sim. É acréscimo e não muda a contagem por tipo da resposta sem filtro | **04 §3:** acrescentar `tipo ('')` à entrada |
| 6 | C-007 ajustado com a 005 instalada | Sim. A afirmação depende de haver NF da 3004 em `CC_NF_PUBLICA`; os demais itens públicos continuam exigindo sugestão vazia | Nenhum |
| 7 | Filial e BU na capa como seleção semeada | Sim para BU (ids fixos do setup). Para filial, só com passo de implantação (O-05) | Nenhum; lista de implantação |

Divergências não registradas pelo construtor: o envio grava o responsável antes de mover e manda o aviso a quem abriu (O-03); a data de encerramento da carga é a data da carga (C-05); as SFs públicas aceitam processo e caso de outro cliente na notificação (C-02).
