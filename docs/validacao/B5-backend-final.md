# B5 · backend inteiro — validação final entre specs

**Data:** 2026-11-17 · **Escopo:** o backend das 7 specs junto (`backend/`), no que os validadores por spec (B1–B4) não viam: o fluxo atravessando módulos, as chamadas entre donas, a publicação e o perfil, a rotina inteira, a segurança transversal, o roteiro T-002 e os números do índice. O frontend (`frontend/src/modules/`) ficou de fora.

**Leu:** `CLAUDE.md`; `docs/execucao.md` (entradas de 16 e 17/11); o contrato `00` a `06`, `pedidos/01-correcoes-v2.md` e `pedidos/02-pos-construcao-respostas.md`; `arquitetura.md` §7 (D-01 a D-10); os relatórios `B1-*` a `B4-*`; a skill `mitra-escopo` 0.10.0 (`SKILL.md`, `plataforma-mitra.md`, `publicacao.md`, `simulador.md`). Código: todo o `backend/`, ou seja, `setup-backend`, `add-001` a `add-090`, `lib/**`, `schema/**`, `simulator/**` (seed, smoke, runtime, server), `sandbox/t002-confirmar.mjs` e `tests/`. Também o README da `mitra-kanban` (o contrato do `kbCardAtualizar`).

**Rodou:**
- `cd backend && npm test` → **verde**: regra pura 91 ok; `sim:check` com 119 SQL executadas, 0 falhas e 269 puladas; smoke com 385 ok, 0 pulados, 0 falhas.
- `npm run sim:seed` → **sem aviso** (INT_USER 12, CC_MEMBRO 11, CC_PARAMETRO 286, KB_BOARD 8, CC_CLIENTE 194). Rodou com `SIMULATOR_DB_PATH` no scratchpad, para não reescrever o banco que os construtores de tela usam.
- Simulador na porta 3130 sobre esse banco: `GET /health` dá 388 SFs, `semDefinicao: []` e `erros: []`.
- Seis scripts descartáveis no scratchpad (`b5/`), nada no repositório e nada contra a plataforma:
  - `e2e.mjs`: o roteiro ponta a ponta, 85 conferências;
  - `chamadas.mjs`: 528 chamadas entre specs;
  - `ordem.mjs`: ordem de publicação e contagens;
  - `rotina.mjs`: rodadas, virada do mês, D-10 e trava;
  - `seguranca.mjs`: 33 sondas diretas como business;
  - `m1093*.mjs`: varredura do erro 1093.

## Resumo

**1 BLOQUEIA · 6 CORRIGIR · 7 OBSERVAÇÃO.**

O fluxo atravessa os 7 módulos sem quebrar:
- cobrança → acordo → quebra → dossiê → Jurídico → acordo judicial → painel → histórico;
- concessão privada até a pendência do Winthor;
- concessão pública até o crédito com contrato ativo.

Os números do painel batem com as donas. O que bloqueia não aparece no simulador: uma escrita da 004 cai no erro 1093 do MySQL e derruba renovação, reanálise e substituição de crédito em produção.

## BLOQUEIA

- **B-01 · `ccEscCredCreditoSituacao` lê a própria tabela que atualiza (erro 1093 no MySQL)**
  - **Onde:** `backend/add-040-concessao-credito.mjs:1793-1808`, linha 1801. É `UPDATE CC_CREDITO … AND NOT EXISTS (SELECT 1 FROM CC_CREDITO CN WHERE CN.DECISAO_ID = D.ID)`, sem tabela derivada.
  - **Por que bloqueia:** o MySQL recusa esse texto ao preparar a instrução, em qualquer ramo do `situacao`. Então toda chamada falha e `escrever()` lança. O SQLite aceita, e por isso o smoke passa. A armadilha está listada em 06 §5.
  - **Quem cai:**
    - `ccCredReanaliseAbrir` (`:1192`);
    - `ccCredReanaliseConcluir`, para renovar ou tornar obsoleto (`:1227`, `:1237`);
    - `criarCredito` dentro de `ccCredDecisaoRegistrar` (`:1124`): todo novo crédito de cliente que já tem um vigente (aumento, Pública que cria o crédito na decisão).
  - **Correção:**
    1. Tirar a subconsulta da mesma tabela. Por exemplo, a JS confere antes que a decisão ainda não tem crédito; ou embrulhar em derivada materializada (`SELECT DISTINCT …`/`COUNT(*)`), como 001 e 003 já fazem.
    2. Pôr a SF no item O-02 da T-002.
    3. Ganhar um teste estático da armadilha (ver C-01).

## CORRIGIR

- **C-01 · derivada simples na mesma tabela pode voltar ao 1093, e nada testa a armadilha**
  - **Onde:** `add-040-concessao-credito.mjs:1735` (`ccEscCredSolicitacaoCard`) e `:1835` (`ccEscCredPedidoAtualizar`). As duas usam `NOT EXISTS (SELECT 1 FROM (SELECT S2.ID FROM CC_SOLICITACAO S2 …) X)` sem `DISTINCT` nem agregado.
  - **O problema:** 06 §5 diz que a derivada simples pode ser fundida (`derived_merge`) e o 1093 volta. A 001 (`DISTINCT`) e a 003 (`COUNT`, `add-030:1515`) já seguem a regra.
  - **Correção:** pôr `DISTINCT` ou `COUNT` nas duas. Somar um teste em `tests/` que varra `UPDATE/DELETE <T>` com `FROM|JOIN <T>` fora de derivada materializada; a varredura de `b5/m1093.mjs` acha as cinco.

- **C-02 · leituras do Winthor no perfil sem visibilidade**
  - **Onde:** `add-010-base.mjs:1701-1702` (`ccBaseWinthorTitulos`, `ccBaseWinthorCliente`) e `add-090-perfil-acesso.mjs:13` (`FORA_DO_PERFIL`).
  - **O problema:** as duas SQL Oracle entram no perfil, como toda SF fora dessa lista. Rodam no Oracle, então não há `EU` nem visibilidade. A JS que as chama confere o acesso, mas a chamada direta não passa por ela.
  - **Prova:** no simulador, Ana lê os títulos em aberto e o cadastro do 2008 (cliente de Bruno). É o mesmo achado da B3-005 C-03, corrigido só para `ccPubWinthorNf`.
  - **O risco cresce se a S-16 falhar:** `'{{documento}}'` vai entre aspas para o Oracle (`lib/winthor-sql.mjs:111`).
  - **Correção:** se a S-03 confirmar, pôr as duas em `FORA_DO_PERFIL`. Se não confirmar, registrar o risco no plan da 001 e limitar `documento` a dígitos na própria SQL (`REGEXP_LIKE` no Oracle).

- **C-03 · a T-002 não cobre o caminho real da rotina nem pontos dos relatórios B1–B4** (`backend/sandbox/t002-confirmar.mjs`)
  - **O cron só testa uma SQL por id** (`:165-175`). O caminho de produção é outro: `ccRotina` (cron) → JS aninhada (`ccBaseSincronizar`, `ccCobRotina`…) → `runDmlMitra` e `runQueryMitra` com `jdbcId` do Winthor dentro dela. Esse caminho não é exercitado. Faltam:
    - `runDmlMitra` aninhado;
    - JDBC em cron (S-07 "por cron");
    - o teto de 60 s numa cadeia aninhada.
  - **S-13 e S-14 ficaram "para a 002"** (`:213-214`), mas não existe roteiro da 002. Faltam o custo real de `kbCardCriar/Mover/Atualizar` e a sessão no `kb*` chamado por JS de business.
  - **O 1093 (O-02) só testa as escritas de membro** (`:142-147`). Faltam as cinco da varredura (B-01, C-01).
  - **Ficaram sem teste:**
    - a união das 39 partes do histórico (B4-007 O-05);
    - `HEX()` × collation e charset `utf8mb4` no selo das fontes (`add-070:130`, B4-007 O-01);
    - `sendEmailMitra` chamado por JS de business (S-11 só usa o token dev).
  - **Correção:** acrescentar esses itens ao roteiro (a chamada aninhada pode ser uma `zzT002` JS que faz `runDmlMitra` e lê o Winthor, chamada pelo cron de teste).

- **C-04 · republicar o `add-070` desfaz edição do gestor nas fontes e no material**
  - **Onde:** `add-070-historico-apoio.mjs:403` e `lib/historico-apoio/carga-inicial.mjs:95-103`.
  - **O problema:** a carga inicial roda em toda publicação (duas vezes na publicação completa), por `INSERT IGNORE` na chave `GRUPO + TITULO`. Fonte ou material que o gestor renomeou ou mudou de grupo volta com o texto original, ativo, ao lado do editado.
  - **Correção:** carga só com a tabela vazia, ou com uma marca `hist.cargaInicial` em `CC_ESTADO`.

- **C-05 · acordo quebrado deixa a próxima ação do acordo no caso**
  - **Onde:** `add-020-cobranca-privada.mjs:1451-1459`. A quebra pela rotina não limpa nem reprograma a `PROX_ACAO` gravada na aprovação (`:1030`, "Conferir pagamento da parcela").
  - **Prova (ponta a ponta):** o caso é quebrado em 26/11 e enviado ao Jurídico em 12/12. A agenda da Ana ainda mostra "Conferir pagamento da parcela · 19/11" desse caso, e a capa do card também.
  - **Correção:** ao quebrar, limpar a próxima ação, ou trocá-la pela ação da fase devida.

- **C-06 · falta o `smoke/900-fluxos.mjs` do contrato**
  - **Onde:** 06 §3, linha "Fluxos entre módulos".
  - **O que falta:** o arquivo não existe. Partes estão nos smokes por spec (002 C-023, 004 C-036, 005 RF-013). Mas nenhum teste roda o encadeamento inteiro, e a cobrança → Jurídico pública não está coberta por ele.
  - **Correção:** o roteiro deste relatório (`b5/e2e.mjs`, 85 conferências, todas verdes) serve de base.

## OBSERVAÇÃO

- **O-01 · republicação reativa o que o gestor desligou**
  - **Quadros:** `semearQuadro` reativa fase e campo que o gestor inativou (`lib/quadros.mjs:57`, `:81`, `:116`), e a publicação completa o chama duas vezes por quadro.
  - **Feriados:** o `setup-backend` devolve um feriado nacional que o gestor removeu (`setup-backend.mjs:55`).
  - **O que fazer:** é a regra declarada, mas o gestor não sabe dela. Avisar na tela ou anotar nos plans.

- **O-02 · uma leitura nova atropela o processamento pendente**
  - **Onde:** `add-010-base.mjs:1037-1038`. A cada 15 min começa uma leitura, mesmo com passos da anterior por fazer, e o processamento passa à leitura nova.
  - **No simulador:** na virada do mês, a `FOTO` só rodou na 4ª leitura, uns 45 min depois. Nada se perdeu, porque o trabalho é incremental.
  - **Em produção:** com volume real, `CREDITO`, `PUBLICO` e `FOTO` podem esperar horas.
  - **Sugestão:** não abrir leitura por intervalo enquanto a última leitura OK tiver passo pendente. Pedido e erro continuam abrindo leitura.

- **O-03 · auditoria de cliente que o membro não vê** (`add-010-base.mjs:1553-1558`)
  - `ccEscBaseAuditoria` aceita qualquer entidade e qualquer cliente de quem é membro ativo.
  - Ana grava, direto, uma linha de auditoria num cliente que não vê. A linha sai em "Alteração auditada" desse cliente, assinada por ela.
  - Não há falsidade de autor, mas é registro inventado.

- **O-04 · chamada direta da `ccEsc…` pula a auditoria e o efeito no card**
  - Exemplo: Júlia encerra um processo como `QUITADO` por `ccEscJurProcessoEncerrar`. O processo fica encerrado, mas o card não vai a `encerrado` e não há auditoria.
  - A capacidade é a mesma da SF pública; a diferença é o rastro.
  - Vale para todas as internas no perfil, até a S-03 decidir.

- **O-05 · `add-090` dá ao perfil todas as SFs menos as 7 da rotina** (`add-090-perfil-acesso.mjs:13`, `:40`)
  - Entram as 100 internas e as `kb*` da lib.
  - As internas só da rotina estão guardadas por `ROTINA`. Provado: Nara recusada em `ccEscBaseRotinaPasso` e nos 7 passos.
  - Se a S-03 confirmar que JS chama SF fora do perfil, tirar `ccEsc…` e as leituras Oracle do perfil reduz a superfície.

- **O-06 · destinatário do e-mail só da ficha de contatos** (RN-017)
  - O e-mail do Winthor (`PCCLIENT.EMAIL`) é lido e não é usado.
  - Cliente novo fica "Sem e-mail cadastrado" na fila até alguém preencher a ficha (visto no roteiro).
  - Confirmar com o gestor.

- **O-07 · rótulo ambíguo no painel de crédito**
  - Em `ccPainelCredito`, `valorAprovado` é o valor **pedido** das solicitações aprovadas; `concedido` é o limite (`add-060:331`, `:350`).
  - No roteiro: 30.000 aprovados contra 2.000 concedidos. Está de acordo com a spec ("quantidade e valor"), mas a tela precisa rotular "valor solicitado".

## Ponta a ponta

**Montagem:** banco descartável pelo pipeline completo de `montarBanco` (11 passos, `seeds: []`, relógio D = 19/11/2026). Os clientes do roteiro entram pelo Winthor simulado e todas as chamadas são de sessão, como a tela faz. Card editado por `kbCardAtualizar` com o card inteiro (`valoresJson`) e movido por `kbCardMover`, sem escrita direta em `KB_*`. Script: `scratchpad/b5/e2e.mjs`. **Resultado: 85 de 85 conferências OK.**

**Cobrança → Jurídico (cliente 8801, 30.000 vencidos há 25 dias)**

| # | Passo | Resultado |
|---|---|---|
| 1 | Leitura | Cliente em `CC_CLIENTE` |
| 2 | Gustavo atribui o cliente à Ana | A rotina abre o caso em `neg_pos_protesto`, responsável Ana. Posição: 30.000, 25 dias |
| 3 | Ana registra contato | Gravado |
| 4 | E-mail da régua | A fase é modo `APROVAR`, então o item entra na fila. Sem contato na ficha, a aprovação é recusada ("Sem e-mail cadastrado", O-06). Ana cadastra o contato e Sérgio aprova: e-mail em `SIM_EMAIL` |
| 5 | Ana propõe acordo de 30.000 (6.000 + 4 parcelas) | Nível 2; caso em `negociacao`. Ana recusada ao decidir (segregação); Sérgio aprova: acordo `ATIVO`, caso em `acordo` |
| 6 | D+7, entrada não paga | A rotina quebra o acordo (`QUEBRADO`) e o caso volta à régua (`extrajudicial`) |
| 7 | D+23 | Ana abre o dossiê e marca os itens; Gustavo envia (27 execuções, dentro de ≤ 30). Processo em `recebido`, cobrança em `juridico`, `NO_JURIDICO = 1` |
| 8 | Júlia trabalha o processo | Autos e andamento gravados. Acordo judicial de 30.000 nasce `ANDAMENTO`; card movido a `acordo`; entrada paga, recuperado 6.000 |
| 9 | Nova rotina | Cobrança e processo ficam onde estavam. A próxima ação do acordo quebrado continua na agenda (C-05) |
| 10 | `ccJurResumo` | `RECUPERADO_MES` 6.000, `ACORDOS_A_RECEBER` 1 / 24.000 (D-08) |
| 11 | Painel | `ccPainelPosicao.vencido` = `ccCobPainelKpis.VENCIDO` = saldo do Winthor = 30.000; PDD 3.000. `ccPainelAtencao` traz inadimplência, bloqueio não aplicado e concentração. Júlia é recusada no painel |
| 12 | Histórico | `ccHistEventoListar` traz contato, e-mail, ação, acordo, decisão, quebra (`ACORDO_FIM`), 6 `MOV_COB`, dossiê, envio, andamentos, acordo judicial, 3 `MOV_JUR`, notas e auditoria. Total do resumo = linhas (47). Júlia vê 30 eventos, sem "Alteração auditada" (P-27) |

A parcela de acordo judicial fica fora do histórico de propósito (plan 007 §8).

**Concessão privada (cliente 8802)**

| # | Passo | Resultado |
|---|---|---|
| 1 | Rita abre a solicitação | Gravada |
| 2 | Dados, consultas, motor e proposta | Motor sugere 2.000 |
| 3 | Rita move o card para `cadastral` | Aceito |
| 4 | Rita marca o checklist (`kbCardAtualizar`) | Gravado |
| 5 | Rita leva a `credito` e a `comite` | O gancho recusa pular etapa e recusa a saída sem o checklist |
| 6 | Decisão na alçada | Rita é recusada (analista); Sérgio decide |
| 7 | Pendência ao Winthor | `APLICAR_LIMITE` de 2.000 |
| 8 | Termo e Liberação | Termo anexado pelo card; Rita leva à Liberação |
| 9 | Rita aplica a pendência | Crédito `GESTAO`, card em `gestao` |
| 10 | Painel e histórico | O painel de crédito conta 1 aprovada, concedido 2.000 (O-07). O histórico traz solicitação, decisão, crédito e 8 `MOV_CRED` |

**Concessão pública (órgão 8803, ramo 13)**

| # | Passo | Resultado |
|---|---|---|
| 1 | Leitura | Setor `PUBLICO` pelo ramo |
| 2 | Carlos abre a solicitação na `PUBLICA` | Gravada |
| 3 | Carlos grava a análise do órgão | Motor do órgão: P1, exposição 500.000 |
| 4 | Carlos marca a análise e leva o card a `analise` e `comite` | Aceito |
| 5 | Decisão | Carlos é recusado (proponente); Silvia aprova 80.000 |
| 6 | Crédito | `GESTAO` com `ANALISE_ORGAO_ID`; a decisão copia `RATING_PUB` P1. O contrato aparece em `ccPubContratoListar` (saldo 100%, 384 dias) |

**Onde o fluxo quebra:**
- **No simulador**, em nenhum ponto. Divergência de número, nenhuma. Os dois defeitos de estado são C-05 e O-06.
- **Em produção**, o mesmo roteiro com um segundo crédito para o 8802 (aumento, renovação ou reanálise) cairia em B-01.

## Itens 2 a 7 do pedido

- **2 · Chamadas entre specs:**
  - 528 referências por nome (`escrever`/`idDe`/`chamarKb`), fora as do próprio módulo: todas existem na dona. Nas SQL chamadas com objeto literal, a entrada cobre todos os `{{x}}`.
  - As 13 chamadas JS → JS entre specs (por exemplo `ccJurDossieEnviar → ccCobEnviarJuridico`, `ccCredMotorCalcular → ccPubMotorCalcular`, `ccPubNfDatasSalvar → ccCobCasoSincronizar`) passam as chaves que a chamada lê.
  - Nenhum nome está repetido entre arquivos.
  - Colunas e tabelas: as 119 SQL rodam no `sim:check` e as JS nos 385 smokes, sem coluna inexistente.
- **3 · Publicação:**
  - A ordem do `CLAUDE.md` bate com `PUBLISH_ORDER` e com o `add-001`: duas passadas, `add-001` de novo, `add-090` por último.
  - A única chamada de arquivo anterior para arquivo posterior, fora o `PASSOS` do `add-010`, é `add-040 → add-050` (20 JS → `ccPubMotorCalcular`), exatamente a exceção que o `CLAUDE.md` cita.
  - Parâmetros: upsert só do catálogo, e valor só para chave sem valor. Modelos e BUs: `INSERT IGNORE`. Nenhum `DROP`, `TRUNCATE` ou `DELETE` nos scripts.
  - O seed só é importado pelo simulador.
  - Os desvios estão em C-04 e O-01; o perfil, em C-02 e O-05.
- **4 · Rotina:**
  - Passos `ACESSOS → REGUA → CREDITO → PUBLICO → FOTO` (DT-13). A maior rodada no banco completo, incluindo a virada do mês, usou **149 execuções** (teto 150), com orçamento de 45 s por rodada e o restante passado a cada passo.
  - A trava funciona: a segunda rodada no mesmo minuto volta `pulado: 'trava'`. `ccRotina` e os 6 passos recusam pessoa.
  - **D-10:** com o Winthor fora, cada rodada tenta uma leitura, fica em `ERRO` e nenhum passo roda (0 linhas novas em `CC_ROTINA_PASSO` em 3 rodadas). Na volta, lê e processa.
  - Não houve escrita repetida entre rodadas. A ressalva está em O-02.
- **5 · Segurança:**
  - 33 sondas diretas como business, com 3 a 6 `ccEsc…` por spec. Cobriram `membroId` de Diana usado por Ana, cliente que não vê, valores derivados forjados e injeção nos ids. Nada escalou.
  - As três que gravaram são Sérgio pondo-se analista de cliente da própria equipe (permitido, N2 com o cliente visível), O-03 e O-04.
  - `numerosComoParametro` está no `sql()` de 010 a 060. A 070 já escreve `CAST`. Nas 213 SQL `cc*` não sobra `{{x}}` fora de aspas além de `LIMIT/OFFSET`.
  - Nenhum `VITE_*` com segredo: `.env.example` só com as chaves, vazias. `.gitignore` cobre `.env` e `.env.*`. `backend/migrations/` não existe.
  - A exceção é C-02.
- **6 · T-002:**
  - Cobre S-01 a S-12, S-15, S-16, VARCHAR estrito, O-01, O-02 (só membro) e O-03.
  - Faltam: o caminho aninhado da rotina (`runDmlMitra` e JDBC dentro de JS chamada pelo cron), S-13, S-14, o 1093 das escritas da 004, a união das 39 partes, `HEX`/`utf8mb4` e o e-mail por business (C-03).
- **7 · Índice 00 contra o código:**
  - 55 tabelas `CC_` nos `schema/*`.
  - 277 chaves no catálogo, iguais às de `CC_PARAMETRO_DEF` (286 linhas de valor em `CC_PARAMETRO`, com os valores por carteira).
  - 327 SFs: 76 / 60 / 61 / 66 / **28** / 17 / 19 por spec, ou 227 públicas + 100 internas (as 98 `ccEsc…` e as 2 leituras Oracle).
  - 8 quadros, 84 fases.
  - Mais as 61 SFs da lib: 388 no `/health`. **Conforme.**

## Conferido por amostra (achados B1–B4 corrigidos)

| Achado | Onde foi conferido |
|---|---|
| B1 B-01 | nível pelo cargo e caminho pelo superior; sonda e smoke C-019 |
| B2-002 B-01 e B-02 | smoke RN-009 e RN-014 |
| B2-002 C-07 | motivo cortado a 989 em `add-020:1111` |
| B2-004 B-01 e B-02 | sonda Rita/Ana e smoke RN-007 (B-02) |
| B3-003 B-01..B-03 | smoke RN-030, C-009 e C-014 |
| B3-005 B-01 | smoke "B-01 · DT-40" |
| B3-005 C-03 | `ccPubWinthorNf` fora das definitions |
| B4-006 C-01 e C-02 | smoke C-002 (Rita) e C-009 (interna) |
| B4-007 C-01 | `CAST` em toda a 007 |

Todos conferem.
