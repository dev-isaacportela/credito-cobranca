# B2 · 002-cobranca — validação independente do backend

**Data:** 2026-11-17 · **Escopo:** backend da spec 002-cobranca-privada (as três carteiras). A 003 e a 004 estão em construção e ficam de fora.

**Leu:** `CLAUDE.md`; `docs/LEIA-construcao.md`; a skill `mitra-escopo` 0.10.0 (`SKILL.md`, `references/plataforma-mitra.md`); o README da `mitra-kanban` (ganchos, `ORIGEM_CHAVE`, "só sem sessão"); o contrato `01` (§4–§7, §10, §11), `02` §002, `03` §4–§7 e §13, `04` §0, §2 e §8, `05` §3, `06` §5; `arquitetura.md` §7; `docs/specs/002-cobranca-privada/{spec,plan,tasks}.md` (o plan e o tasks inteiros, a spec por cenário); o modelo `B1-001-base.md`. Código: `add-020-cobranca-privada.mjs` (inteiro), `schema/002-*`, `lib/{parametros,modelos,quadros}/002-*`, `lib/cobranca-privada/*`, `simulator/seed/002-*`, `simulator/smoke/002-*`, `tests/002-*`, os blocos 2xxx de `frontend/src/lib/server-functions.ts` e, da base, `guarda.mjs`, `visibilidade.mjs`, `tempo.mjs`, `escritas.mjs` (auditar), `parametros.mjs` (`fundir`), `runtime.mjs` e `smoke/base.mjs`.

**Rodou:** `cd backend && npm test`. Regra pura: 54 ok. `sim:check`: 81 SQL executaram, 0 falharam. Smoke 000 + 001: 59 ok. Smoke **002: 52 ok, 3 pulados (`depende de 003`), 0 falhas**. A suíte inteira sai com código 1 por causa da 004: 3 falhas (C-007, C-039, C-042) e o `004-zz-dbg.mjs`, que sumiu durante a execução. Isso é da 004 e não conta contra a 002. Rodou também um script descartável no scratchpad (banco temporário do simulador, nada no repositório) que provou B-01, B-02, C-01 e O-01. Nada contra a plataforma.

**Conferido e conforme:**
- **SFs:** 60 SFs, 39 públicas e 21 internas, com os nomes de 04 §2. Nenhuma fica fora do contrato. Todas estão nos dois blocos de `server-functions.ts`, sem id repetido. Entradas, saídas e "quem" batem com 04 §2, salvo C-02 e C-04.
- **Tabelas e parâmetros:** as 8 tabelas batem com 02 §002 (colunas, tipos, nulos, padrões e chaves). As 52 chaves batem com 03 §4–§7 e §13 (padrão, faixa, carteira `PUBLICA` e vigência).
- **Quadros:** os três quadros e as fases batem com 05 §3. O trecho do gancho segue a ordem de DT-35: primeiro os destinos controlados, depois a saída fechada, depois quem move.
- **Relógio, colunas e Winthor:** nenhum `NOW()`/`CURDATE()`/`new Date()` solto (só aritmética de data). Datas em `VARCHAR`, colunas SQL em maiúscula. Winthor só por `ccBaseTitulosAbertos`.
- **Identidade:** vem de `quem()`, e a guarda `ATOR` confere a sessão (DT-34). O RNF-005 prova que o `membroId` da entrada é ignorado quando há sessão.
- **`ccCobCasoSincronizar`, caminho "pessoa":** só na `PUBLICA` e só entre fases da régua do órgão, na JS e na guarda de `ccEscCobCasoCapa`. O C-027 prova isso nas duas sessões e pela chamada direta.
- **Alçada:** `NIVEL_EXIGIDO` da baixa é calculado na SQL. As decisões usam `CC_MEMBRO.NIVEL`, sem a marca `ADMIN`, e quem propôs não decide, na JS e na guarda.
- **`runDmlMitra`:** só dentro de `ccCobRotina` (cron).
- **Orçamento:** o orçamento DT-29 é afirmado pelo contador do simulador.
- **Testes pulados:** os 3 `pular('depende de 003')` são legítimos. A 003 não está publicada (`ccJurDossieAbrir` ausente), e os três testes rodam antes a parte que não depende dela.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | 2 |
| CORRIGIR | 8 |
| OBSERVAÇÃO | 16 |

Das 10 divergências declaradas, 6 são aceitáveis. Quatro pedem mudança no contrato: 1 e 4 em 04 §2, 4 também em 05 §3.6 e 6 em 05 §3.6 linha 5. As divergências 5, 7 e 8 não são aceitáveis e viram C-06, C-02 e C-03. A 9 é aceitável, mas tem um teste tautológico (C-08). Detalhe na seção final.

## BLOQUEIA

- **B-01 · alçada e garantia do acordo vêm do `debito` informado por quem chama** — `backend/add-020-cobranca-privada.mjs:1774-1792` (`ccEscCobAcordoInserir`).
  - **O defeito:** `DEBITO`, `DESCONTO` e o cálculo do nível usam `{{debito}}`, valor que vem do parâmetro. O nível sai de `FD` (débito acima de `cob.acordoValorGerente`) e de `FE` (entrada mínima sobre `GREATEST(debito, valor)`). A exigência de `garantia` também depende desse valor. A releitura do vencido ("O saldo mudou") existe só na JS. Isso fere D-003 do plan e 01 §5: a chamada direta não pode baixar a alçada.
  - **Prova no simulador:** Ana chama a interna direto no caso de 2027, com vencido de 60.000, passando `debito: 1`, `valor: 60000`, entrada de 20% e sem garantia. O acordo nasce com `NIVEL_EXIGIDO = 2` e `GARANTIA = ''`. Sérgio (Supervisor, nível 2) aprova pela SF pública: o acordo fica `ATIVO` e o card vai para `acordo`. Pelo caminho normal (RN-009), o mesmo acordo exige garantia e nível 3.
  - **Correção:** a SQL lê `CC_POSICAO_CLIENTE_CARTEIRA.VENCIDO` do caso e usa esse valor em `DEBITO`, `DESCONTO`, `FD` e `FE`. Recusa se `{{debito}}` diferir do lido em mais de 0,004. Mais um teste no RN-009 com a chamada direta.
- **B-02 · quem decidiu uma baixa parcial encerra o caso como `BAIXADO` e infla `VALOR_BAIXADO`** — `add-020-cobranca-privada.mjs:1723-1732` (`ccEscCobCasoEncerrar`).
  - **O defeito:** o ramo `ATOR` exige só uma baixa `APROVADA` decidida pelo ator, com `DECIDIDO_EM = '{{agora}}'` e o mesmo valor. Os dois dados aparecem na ficha (`baixa`). Nada impede repetir a chamada, que soma de novo a cada vez. Nada exige que `desfecho = 'BAIXADO'` venha só quando o baixado alcança o vencido; essa conta é feita só na JS (`:1190`).
  - **Prova no simulador:** 2009 tem vencido de 15.000. Gustavo (Gerente, nível 3) aprova uma baixa de 3.000 (nível 3). Depois chama a interna direto: duas chamadas com `desfecho` vazio levam `VALOR_BAIXADO` a 9.000, e uma com `BAIXADO` encerra o caso, com `VALOR_BAIXADO = 12.000`. Baixar 15.000 exige nível 5 (`alcada.baixaGerente` = 10.000). Com o caso encerrado, o gancho aceita o card em `baixado`, e o passo da rotina para casos encerrados fora dela (`:1630-1633`) o leva para lá.
  - **Correção:** a SQL grava `VALOR_BAIXADO = (SELECT COALESCE(SUM(VALOR), 0) FROM CC_BAIXA WHERE COBRANCA_ID = CB.ID AND SITUACAO = 'APROVADA')`, idempotente. O desfecho `BAIXADO` só vale quando essa soma alcança o `VENCIDO` da posição (−0,004). Mais um teste no RN-014 com a chamada direta.

## CORRIGIR

- **C-01 · `ccEscCobAcaoInserir` aceita qualquer fase e o `NO_PRAZO` de quem chama** — `add-020-cobranca-privada.mjs:1750-1755`.
  - **O defeito:** `faseChave` não é conferida contra a fase do card, e `NO_PRAZO` vem do parâmetro.
  - **Prova no simulador:** Nara grava, em 2060 (`cob_ativa`), ação de `cob_ativa` e de `extrajudicial` com `FEITA_EM` de 30/11 e `NO_PRAZO = 1`.
  - **Efeito:** o agente maquia o próprio indicador `ACOES_NO_PRAZO_PCT` (RN-033) e marca de antemão a ação de fases futuras, o que some com o `ACAO_REGUA` da agenda.
  - **Correção:** exigir `faseChave` = fase do card. A exceção é `juridico`, com `JURIDICO_EM` preenchido, para `ccCobEnviarJuridico`. `NO_PRAZO` deve ser calculado na SQL com o `PROX_UTIL_SQL` que já existe (`:182`) sobre `KB_BRASILIA(K.FASE_DESDE)` e `HOJE_SQL`.
- **C-02 · decidir acordo exige ver o cliente; a baixa, só na guarda** (divergência 7) — JS `add-020-cobranca-privada.mjs:1040`, guarda `:1806`, agenda `:333-334` (`enxerga: 1`). Do lado da baixa: guarda `:1839` (`VISIVEL_A`) e JS `:1171-1178` (sem visibilidade).
  - **O contrato:** 04 §0 diz "a alçada não exige o cliente visível, nas três carteiras (D-05, DT-35)".
  - **O efeito:** um Supervisor de outra equipe não decide acordo de nível 2. Na baixa, JS e guarda divergem: se `alcada.baixaNivel1` for posto em 2, a JS aceita e a guarda devolve "Sem permissão".
  - **Correção:** tirar a visibilidade das duas decisões (JS, guarda e `ENXERGA` da agenda), como a 004 já testa no RN-008 dela. A alternativa é um pedido ao arquiteto para mudar 04 §0.
- **C-03 · escritas da rotina e de `ccCobCasoSincronizar` sem auditoria** — `add-020-cobranca-privada.mjs:1269-1361` não chama `auditar()`. Na rotina ficam fora: promessas avaliadas (`:1403-1404`), acordo `QUEBRADO` (`:1413`), mudança de etapa pela régua (`:1560-1564`), ação `CARD` (`:1573`), `PROTESTADO` pelo card (`:1577`), `JURIDICO_EM`/`PROCESSO_ID` (`:1517-1518`) e abertura de caso (`:1653`).
  - **O contrato:** 01 §7 manda auditar a "mudança de etapa pela régua, quebra de acordo", e 04 §0 diz que "toda escrita chama `auditar()`". Hoje só entram encerramento e bloqueio devido.
  - **Correção:** pôr esses eventos na lista `auditoria` da rodada (já é um lote só), e um `auditar()` no caminho "pessoa" e no encerramento de `ccCobCasoSincronizar`. O 001 C-026 quebra por contar linhas de um cliente; o certo é ajustar aquele teste, que é arquivo da base (O-16).
- **C-04 · saídas diferentes de 04 §2:**
  - `ccCobContatoTotal` (`:1869-1871`) devolve só `TOTAL`. Faltam `PROMESSAS_ABERTAS`, `PROMESSAS_QUEBRADAS` e `SEM_RETORNO` (PA-08).
  - `ccCobBloqueioListar` (`:1873-1877`) devolve `BLOQUEIO_DEVIDO`/`BLOQUEIO_APLICADO`, e o contrato diz `DEVIDO`/`APLICADO`.
  - `ccCobProjecaoTotal` (`:1891-1894`) não traz `CLIENTES_FORTE` (plan).
  - **Correção:** alinhar o código, ou registrar a mudança no contrato antes do frontend.
- **C-05 · `ccCobRotina` não respeita o orçamento de tempo nem é incremental** — `add-020-cobranca-privada.mjs:1368-1380`, `:1419-1430`, `:1444`, `:1636-1642`.
  - **O defeito:** `orcamentoMs` é ignorado. Toda rodada relê todos os casos abertos, todas as posições e todo o `CC_EMAIL_ENVIADO` da cobrança (cresce sem fim), e faz um `runDmlMitra` por caso alterado.
  - **O contrato:** 01 §11 diz "45 s" e "nas demais, só sobre clientes com `ALTERADO_EM` posterior". O passo 1 do plan pede o mesmo conjunto de trabalho.
  - **O risco:** na carga inicial, ou com milhares de casos, as idas e voltas HTTP do `runDmlMitra` passam do timeout síncrono de 60 s (skill §5), e o passo fica em `ERRO` "interrompido".
  - **Correção:** parar o laço de domínio pelo relógio de parede (`orcamentoMs`) e devolver `pendentes`. Ler só o alterado fora da primeira rodada completa do dia. Limitar `CC_EMAIL_ENVIADO` às referências dos casos lidos.
- **C-06 · "atrasou" por heurística** (divergência 5) — `add-020-cobranca-privada.mjs:1529-1531`.
  - **O defeito:** pagamento feito no vencimento e lançado no ERP no dia seguinte, como no retorno bancário de boleto, vira `REGULARIZADO` em vez de `PAGO_NO_PRAZO`. Isso distorce "pagos no vencimento" e a contagem dos casos regularizados.
  - **Correção:** o dado exato já está no banco. `CC_RECEBIMENTO.DIAS_ATRASO_PAGAMENTO > 0` do cliente na carteira, desde o `ABERTO_EM` do caso, combinado com `FASE_DEVIDA` fora das preventivas, decide `REGULARIZADO`. A rotina já lê `CC_RECEBIMENTO` para as promessas.
- **C-07 · cancelamento de acordo falha no MySQL estrito com motivo longo** — `add-020-cobranca-privada.mjs:1109-1111`. `parecer` = `'Cancelado: '` + `motivo`, com `motivo` de até 1.000 caracteres, grava até 1.011 em `CC_ACORDO.PARECER V(1000)`. O SQLite não acusa. No MySQL o UPDATE falha e a JS devolve "Sem permissão…". Correção: cortar o motivo em 989 caracteres.
- **C-08 · testes que não afirmam o que a linha do plan diz:**
  - (a) RNF-006 (`smoke/002-cobranca-privada.mjs:811`) afirma `r.pendentes > 0`, mas a rotina soma os casos abertos na rodada a `pendentes` (`add-020:1692`). A afirmação é verdadeira sempre que algum caso abre, e não prova o corte por orçamento. Afirme `pendentes > resumo.abertos`, ou que ficaram casos sem card.
  - (b) C-022 (`tests/002-cobranca-privada.test.mjs:96`): `'2026-11-17' < '2026-11-19'` é tautologia. Tirar; a parte de tela ("Ações atrasadas") fica para `frontend/tests`.
  - (c) RN-009 e RN-013 puros testam `nivelAcordo`/`nivelBaixa` (`lib/cobranca-privada/acordo.mjs:7-37`), funções que nenhuma SF chama: a regra real é a SQL (`add-020:1776-1786`, `:1820-1822`). O limite de 10.000,01 → nível 5 nunca roda contra a SQL. Testar a SQL no smoke (proposta de 10.000,01) e apagar as duas funções (O-14).
  - (d) Nenhum teste chama direto `ccEscCobAcordoInserir`, `ccEscCobCasoEncerrar` e `ccEscCobAcaoInserir` (B-01, B-02, C-01).
  - (e) RNF-006 mede só 2 leituras e 2 escritas. Ficam sem medida as escritas mais caras do plan: `ccCobEmailEnviar` (12), `ccCobAcordoDecidir` (11), `ccCobBaixaDecidir` (11) e `ccCobAnuenciaRegistrar` (10).

## OBSERVAÇÃO

- **O-01 · `ccEscCobCasoProtesto` marca protesto em qualquer fase** — `add-020-cobranca-privada.mjs:1747-1748`. Provado: Ana marca `PROTESTADO` em 2015 (`cob_ativa`). O efeito é pequeno (etiqueta e exigência de anuência). A guarda poderia exigir o card em `protesto` ou `protesto_1 = '1'`.
- **O-02 · `ambito` é decorativo** (divergência 1) — `:1719-1721`.
  - **O efeito:** com `ambito = 'CASO'`, quem opera o caso grava próxima ação em qualquer carteira. É o mesmo que `ccCobProxAcaoDefinir` já permite (`caso`), então a restrição à `PUBLICA` não protege nada. O teste do C-027 (`smoke:627`) só passa porque manda `ambito: ''`.
  - **Mais simples:** guarda `ROTINA OR OPERA`, sem `ambito`, e pedir ao contrato que tire "carteira `PUBLICA`" da guarda de `ccEscCobCasoProxAcao` (04 §2, internas).
- **O-03 · duas implementações de abrir, mover e encerrar caso** (divergência 4) — `:1303-1323` × `:1650-1677` (abrir e card órfão) e `:1349-1358` × `:1532-1547` (encerrar e anuência). Já divergem: o encerramento da rotina limpa a fila, o de `ccCobCasoSincronizar` não. Extrair os dois trechos numa função usada pelos dois, como no D-001 do plan.
- **O-04 · card órfão pelo título** (divergência 2) — `:1311-1312`, `:1661-1662`. É aceitável: o título leva `CODCLI`, e a lib não grava `ORIGEM_CHAVE` pela `kbCardCriar` (README 1.1.0). Corrigir o plan (Modelo de dados e passo 1 de `sincronizarCaso()`).
- **O-05 · `validarConjunto` do grupo `alcada`** (divergência 3) — `lib/parametros.mjs:127-129` (base). `fundir()` recusa duas specs no mesmo grupo. Ficam sem conferência as regras de 03 §7: `baixaDiretor ≥ baixaGerente`, níveis da baixa não decrescentes e `acordoNivelFora ≥ acordoNivelPadrao`. Correção na base: `fundir` compõe as funções do grupo e concatena os motivos. Decide o orquestrador.
- **O-06 · fuso na carta de anuência** — `:1213`. `KB_ANEXO.CRIADO_EM` está em UTC (`lib/tempo.mjs:31`) e é comparado com `ENCERRADO_EM`, que está em hora de Brasília. Anexo feito até 3 h antes do encerramento conta como "posterior". Converter com `KB_BRASILIA`.
- **O-07 · INSERT sem `IGNORE` na rotina** — `:1573` (`CC_ACAO_REGUA`) e `:1584` (`CC_EMAIL_FILA`). O plan pede `INSERT IGNORE` nas chaves únicas. Uma corrida com `ccCobAcaoRegistrar` derruba o passo inteiro com chave duplicada no MySQL.
- **O-08 · `FORMAT(x, 2, 'pt_BR')`** — `:205`. A função está emulada (R-144 da 005), mas fora da lista de 06 §5. Atualizar o contrato.
- **O-09 · `ccEscCobFilaInserir` sem uso** — `:1841-1846`. Ela está nas 21 internas do contrato, mas a rotina grava a fila por `runDmlMitra`. Usar, ou pedir a retirada.
- **O-10 · custo da rodada estimado abaixo da referência** — `:1366`. `criar` 4 e `mover` 3 contra `kbCardCriar` ≈ 6 e `kbCardMover` ≈ 5 de 01 §10. O smoke mede ≤ 150 no simulador. Conferir na T-002 (S-13).
- **O-11 · baixa fracionada** — `:1820-1822`. O nível vem do valor da proposta, não do acumulado do caso: dez baixas de 10.000 ficam no Gerente. 03 §7 não trata. Pergunta ao arquiteto.
- **O-12 · "pessoa" em `ccCobCasoSincronizar` mexe em mais que fase, capa e próxima ação** — `:1339-1340`. A pessoa troca título e responsável do card (`titulo`, `responsavelUserId`) e grava qualquer campo pelo `capaJson`, só as etiquetas são filtradas. A rotina devolve o responsável na rodada seguinte. Restringir ao que 04 §2 descreve.
- **O-13 · zerado com processo ativo não encerra** — `:1531` (`zerado && !proc`). É divergência não declarada de 05 §3.6 linha 6. O caso fica aberto em `juridico` com saldo zero até o processo encerrar. Declarar no plan ou encerrar.
- **O-14 · código morto e duplicado** — `nivelAcordo`/`nivelBaixa` entram no corpo de todas as JS e só os testes usam (C-08 c). `ACAO_TEXTO` (`:197`) e os nomes de `nomeDaFase` repetem textos de `lib/quadros/002`. O `DATA_REF` não acompanha o vencimento mais antigo (`:1557`), ao contrário do Modelo de dados do plan.
- **O-15 · `runDmlMitra` num passo aninhado do cron** — `:1374`. Depende de o token do cron chegar ao passo chamado por id (S-09), como na base (`ccBaseAcessosConciliar`). Incluir no roteiro da T-002.
- **O-16 · o 001 C-026 conta linhas por cliente** — `simulator/smoke/001-base.mjs:854` (arquivo da base). Qualquer auditoria nova de rotina num cliente do seed da 001 quebra o teste, e por isso o construtor não auditou a abertura de caso (divergência 8). O teste deve filtrar por `area`. Decide o orquestrador.

## As 10 divergências declaradas

| # | Divergência | Aceitável? | Contrato |
|---|---|---|---|
| 1 | `ccEscCobCasoProxAcao` com `ambito` | Sim, sem risco: não escala nada. Mas é desnecessária (O-02): basta `ROTINA OR OPERA` | **04 §2 (internas):** tirar "carteira `PUBLICA`" da guarda de `ccEscCobCasoProxAcao`. A de `ccEscCobCasoCapa` fica |
| 2 | Card órfão por quadro + título + "não referenciado" | Sim (O-04) | Nada no contrato; corrigir o plan (`ORIGEM_CHAVE` não é gravável pela `kbCardCriar`) |
| 3 | Sem `validarConjunto` de `alcada` | Sim, como provisório. Faltam as 3 regras cruzadas de 03 §7 | Nada no contrato; defeito de `fundir()` na base (O-05) |
| 4 | `ccCobRotina` aplica as regras em processo com `runDmlMitra` | Sim: é o D-001 do plan, e a rotina é cron. Mas duplica `ccCobCasoSincronizar` (O-03) | **04 §2** `ccCobRotina` ("via `ccCobCasoSincronizar`") e **05 §3.6** ("Tudo passa por `ccCobCasoSincronizar`"): "pela mesma regra, em processo" |
| 5 | "Atrasou" por heurística | **Não**: erra o caso comum de boleto pago no dia e lançado no dia seguinte | Nenhuma; usar `DIAS_ATRASO_PAGAMENTO` (C-06) |
| 6 | Sai de `negociacao` só com acordo `CANCELADO` | Sim: a linha 5 de 05 §3.6 contradiz 04 §2 (acordo recusado mantém o card em `negociacao`) e o seed (2021 e 2058 em negociação sem acordo; C-007, RN-029). A RN-029 sinaliza a negociação vencida | **05 §3.6 linha 5:** tirar "ou card em `negociacao` sem acordo em aberto e fora da fase devida" |
| 7 | Decidir acordo exige ver o cliente | **Não**: contraria 04 §0 (DT-35), e a baixa já segue o contrato na JS (C-02) | Nenhuma, salvo se o arquiteto mudar 04 §0 |
| 8 | Rotina não audita abertura de caso | **Não**: 01 §7. A causa é o 001 C-026 frágil (O-16); faltam também quebra de acordo, promessa e mudança de etapa (C-03) | Nenhuma |
| 9 | C-022 como teste puro | Sim, para a parte de dias úteis; tirar a tautologia (C-08 b). A tela fica para `frontend/tests` | Nenhuma |
| 10 | Textos de modelo provisórios | Sim: o gestor edita na tela de modelos, e os cinco com efeito legal nascem sem validação (P-06) | Nenhuma. Entra na lista de implantação: carregar os textos do relatório C §3.6 antes de ligar a régua |

Divergências não registradas pelo construtor: O-13 (zerado com processo ativo), C-04 (nomes e colunas de saída), `DATA_REF` fixo (O-14) e `FORMAT` fora da lista de 06 §5 (O-08).
