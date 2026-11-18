# Tasks: Base — clientes e posição do Winthor, equipe, parâmetros e serviços comuns

**Plan:** [`plan.md`](plan.md) · **Data:** 2026-11-14 (refeito contra `docs/contrato/`; ajustado às respostas do arquiteto e à validação v2 em 16/11/2026)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`.
>
> `[P]` = paralelizável (arquivo distinto, sem dependência). As SFs moram todas em
> `backend/add-010-base.mjs` e os testes de backend em `backend/simulator/smoke/001-base.mjs`:
> tarefas sobre o mesmo arquivo não levam `[P]`.
> Os pedidos ao arquiteto (PA-01 a PA-17) estão decididos: ver "Respostas do arquiteto" no plan.
> Nada aqui roda contra a plataforma: `setup-backend.mjs` e `add-*.mjs` só são **escritos**.
>
> **Dois marcos para as outras specs:**
> - **M1 (fim da T-079): o backend das specs 002 a 007 pode começar.** É o backend inteiro da
>   001 — esqueleto, bibliotecas, schema, SFs, seed e smoke verdes — porque os seeds e smokes dos
>   outros módulos chamam as SFs da base (atribuir agente, gravar contato, validar modelo, enviar
>   e-mail, ler títulos) e rodam `ccRotina`. O resultado da T-002 (sandbox) não entra no M1: as
>   outras specs seguem as hipóteses padrão de 01 §15 e o smoke exercita as duas de sessão.
> - **M2 (fim da T-089): o frontend das specs 002 a 007 pode começar.** Casca, mapa de SFs,
>   design system, as funções compartilhadas de `frontend/src/lib/base/` e os tipos `Modulo`,
>   `RotaModulo`, `ItemMenu` de `lib/base/menu.ts` (01 §14), com T-116 e T-118 verdes.

## Backend

### 0. Esqueleto do projeto (arquivos do integrador, 01 §14; Fluxo B da `mitra-escopo`; molde: `p-novo-sgc`)

- [ ] **T-001** — Estrutura do repositório: `git init`; `README.md`, `CLAUDE.md` (a partir de `assets/CLAUDE.md` da skill, com a ordem de publicação `setup-backend` → `add-001-kanban` → `add-002-jdbc-winthor` → `PUBLISH_ORDER` (`add-010` … `add-070`) **duas vezes** (a primeira cria todas as SFs; a segunda, upsert pelo nome, injeta os ids de todas e remonta `ccPodeMover` com os trechos de todos os `lib/quadros`, DT-39) → `add-001-kanban` de novo (liga os ganchos) → `add-090-perfil-acesso` → `sync-server-function-map`; e a regra da publicação de uma spec sozinha, que o prompt de sandbox de cada spec repete: publicar a spec e republicar o `add-010` (e o `add-040` depois do `add-050`), 01 §14), `AGENTS.md`, `.gitignore` (`.env`, `node_modules`, `backend/simulator/data/`), `.claude/launch.json` (simulador 3115, Vite 5185); `backend/package.json` (scripts `sim`, `sim:seed`, `sim:check`, `sim:smoke`, `test`; `@benenutri/mitra-kanban` ^1.14.0, `mitra-sdk`, `dotenv`; dev `oracledb`) e `backend/.env.example` (`MITRA_*`, `WINTHOR_JDBC_URL/USER/PASSWORD`, `CC_ADMIN_NOME`, `CC_ADMIN_EMAIL`, `SIMULATOR_*`) → raiz e `backend/`
- [ ] **T-002** — **Confirmação no sandbox (S-01 a S-15 de 01 §15).** Escrever o roteiro `backend/sandbox/t002-confirmar.mjs`: publica SFs temporárias de prefixo `zzT002`, executa cada verificação (com o token do projeto e com um usuário business de teste vindo do `.env`), imprime uma linha por item (`S-nn · resultado · plano B se falhou`), chama `ccBaseWinthorDescobrir` para o S-12 (colunas de `PCPREST`, `PCPLPAG`, `PCCOB`, extras de `PCCLIENT`/`PCNFSAID`; como o Winthor marca cancelado, estornado e desdobrado; chave única da parcela; lista de `CODCOB` com a contagem de títulos em aberto; códigos dos ramos públicos), mede o tempo de uma leitura completa e o teto de linhas por consulta, e apaga as temporárias. **Execução:** no sandbox, quando o projeto existir na plataforma (plan D-006; 01 §15), depois de publicados o esqueleto e o `add-010`. Resultado registrado na tabela "Depende do sandbox" do `plan.md`; item que falhar aciona o plano B de 01 §15 antes de publicar. A construção no simulador não espera por ela. **Roteiro escrito na correção B1 (17/11/2026)**, com os itens O-01 (parâmetro numérico `1 OR 1=1`), O-02 (erro 1093 nas escritas de membro), O-03 (SELECT direto por business) e VARCHAR em modo estrito; falta rodar no sandbox → `backend/sandbox/t002-confirmar.mjs`, `plan.md`
- [ ] **T-003** — Kit do simulador com as emulações de 06 §4: `config.mjs` (rótulo, porta 3115, `DDL_SOURCES` = `schema/*.mjs` + schema da lib + `schema-winthor.mjs`, `PUBLISH_ORDER` = `add-001-kanban`, `add-002-jdbc-winthor`, `add-010` … `add-070` dos que existirem), `runtime.mjs` (`{{param}}`, `:VAR_USER`, SF por id com o mapa `__CC_IDS__`, `runQueryMitra` com `jdbcId` do Winthor sobre as `PC*`, `runDmlMitra` só em cron, `sendEmailMitra` → `SIM_EMAIL` com falha em `@falha.test`, `uploadFilePublicMitra` falso, cron disparado à mão, contador de execuções, `SIM_SESSAO_ANINHADA`, `Date` deslocado para `CC_AGORA`), `server.mjs`, `check.mjs`, `seed-cli.mjs`, `mysql-dialect.mjs` (funções de 06 §5; Oracle `NVL`, `TO_DATE`, `TO_CHAR`, `TRUNC`, `SYSDATE`; `UTC_TIMESTAMP()` = `CC_AGORA` + 3 h), `winthor-oracle.mjs` (cópia do SGC 2, só `SELECT`/`WITH`), `relogio.mjs` (`fixarRelogio`, `comRelogio`; o relógio do banco é o `RELOGIO` exportado pelo smoke, padrão D, 06 §1) → `backend/simulator/`
- [ ] **T-004** `[P]` — `schema-winthor.mjs` com as tabelas `PC*` de 02 §"Schema Winthor do simulador" e a tabela `ALL_TAB_COLUMNS` preenchida a partir delas → `backend/simulator/schema-winthor.mjs`
- [ ] **T-005** — `add-001-kanban.mjs`: `instalar({ ganchos, email: { sistema: 'Crédito e Cobrança', urlDoCard } })` no molde do SGC 2 (liga os ganchos só se `ccPodeMover`/`ccPodeExcluir` já existem; avisa para rodar de novo depois do `add-010`); `definitions` da lib exportadas para o simulador → `backend/add-001-kanban.mjs`
- [ ] **T-006** `[P]` — `add-002-jdbc-winthor.mjs`: cópia do `add-003-jdbc-winthor.mjs` do SGC 2 (`NOME_JDBC_WINTHOR`, `parseWinthorUrl`, `jdbcIdWinthor`) → `backend/add-002-jdbc-winthor.mjs`
- [ ] **T-007** — `setup-backend.mjs`: importa o `DDL` de `schema/NNN-*.mjs` que existir, funde os `lib/parametros/*` presentes em `CC_PARAMETRO_DEF` e semeia o padrão só para chave sem valor (aceitando `vigencias: [{ inicio, valor }]` e `carteiras: { … }` na definição da chave, 01 §9), chama `semearModelos()` com os `lib/modelos/*` presentes (spec sem o arquivo, como a 007, é pulada sem erro), semeia as 4 BUs e os feriados nacionais do ano corrente e do seguinte, e faz o bootstrap do topo com `CC_ADMIN_NOME`/`CC_ADMIN_EMAIL` (só com `CC_MEMBRO` vazia) → `backend/setup-backend.mjs`
- [ ] **T-008** — Mapa de SFs: `frontend/src/lib/server-functions.ts` com os dois blocos da lib e o bloco da 001 (ids locais 1000–1999; faixas das outras specs reservadas em comentário **fora** dos blocos, porque o kit lê os blocos por texto), `ids-do-mapa.mjs` e `sync-server-function-map.mjs` → `frontend/src/lib/server-functions.ts`, `backend/`
- [ ] **T-009** — Seed orquestrador e elenco (DT-38): `seed.mjs` exporta `montarBanco({ seeds, relogio, quadros, atribuicao, ate })`, o pipeline de 11 passos de 06 §2.3 descrito no plan ("Pipeline do banco"), usado pelo `sim` (relógio D) e por `smoke/base.mjs`: DDL → elenco → **semear os `QUADROS` de cada `lib/quadros/NNN` presente** (e os `quadros` extras do smoke) pela mesma `semearQuadro()` da publicação → `fixarRelogio(T0)` → `winthor()` → `rodarCron` até a leitura `OK` → `atribuir()` → `rodarCron` até o processamento terminar → `passado()` e avanço a `RELOGIO` → `dominio()` → `ccBaseSincronizacaoPedir` (Gustavo) + `rodarCron` final; `ate: n` para no passo n. `000-elenco.mjs` com os 12 usuários e a equipe de 06 §2.1 (ids e `CAMINHO` exatos), os dados de referência de 06 §2.2 (parâmetros e modelos pela mesma fusão do `setup-backend.mjs`, com `vigencias` e `carteiras`; `CC_FILIAL_CREDORA` pulada se a tabela da 003 não existe), os ajudantes `dia(n)`, `diaUtil(n)` (contados do `RELOGIO` do banco) e `nota({ … })` (aceita `numnota`) e `atribuir(linhas = ATRIBUICAO)` (coluna Agente de 06 §2.4 + linha "Atribuição" de 06 §2.5 + `ATRIBUICAO` exportada pelos seeds declarados, 06 §2.3): agente por `ccBaseClienteAtribuir` como Gustavo, analista por `ccEscBaseClienteAnalista` com o `membroId` de Gustavo, cliente ausente de `CC_CLIENTE` pulado → `backend/simulator/seed.mjs`, `backend/simulator/seed/000-elenco.mjs`
- [ ] **T-010** — Smoke orquestrador e base: `smoke.mjs` roda `smoke/000-esqueleto.mjs` e os `smoke/NNN-*.mjs` que existirem, cada um em banco novo montado por `montarBanco()` (T-009) com os seeds declarados no topo do arquivo, o `RELOGIO` que ele exporta (padrão D) e os `QUADROS_TESTE` que ele exportar; com `BANCO_POR_TESTE = true` exportado, cada `teste()` recebe uma cópia do banco do passo 11; `smoke/base.mjs` com `teste`, `como` (`como(null, fn)` = sem sessão), `rodarCron` (apaga `CC_ESTADO['rotina.trava']` antes de chamar), `nasDuasSessoes(fn)` (roda com `SIM_SESSAO_ANINHADA` 0 e 1 e afirma o mesmo resultado), `execucoes`, `pular`, `substituir(nome, definicao)`, `winthorFora(fn)`; `smoke/000-esqueleto.mjs` com os testes `ESQ-nn` do plan (dialeto, relógio, sessão aninhada nos dois modos, card de teste criado e movido pela lib, contador) → `backend/simulator/smoke.mjs`, `backend/simulator/smoke/`
- [ ] **T-011** `[P]` — `add-090-perfil-acesso.mjs`: perfil "Crédito e Cobrança" com todas as SFs menos `FORA_DO_PERFIL` (`ccRotina` e os passos), `SELECT` em `CC_*` e `KB_*`, usuários dos membros ativos; nunca entra no `PUBLISH_ORDER` → `backend/add-090-perfil-acesso.mjs`

### 1. Bibliotecas da base (só a 001 edita; as outras importam)

- [ ] **T-012** `[P]` — `tempo.mjs`: `agora()`, `hoje()` (UTC−3 fixo, lendo `CC_AGORA` quando existe), `somarMeses()`, `HOJE_SQL`, `AGORA_SQL`, `KB_BRASILIA('<coluna>')` (01 §3) → `backend/lib/tempo.mjs`
- [ ] **T-013** `[P]` — `dias-uteis.mjs`: `ehDiaUtil`, `proximoUtil`, `somarDiasUteis` (N = 0 ajusta para o próximo útil), `diasUteisEntre`, `motivoNaoUtil`, mais `pascoa(ano)` e `feriadosNacionais(ano)` (13) → `backend/lib/dias-uteis.mjs`
- [ ] **T-014** — `escritas.mjs`: `PREAMBULO` e `js(corpo)` com `sessao`, `quem`, `ler`, `escrever`, `auditar`, `auditarLinhas` (lote de até 20 linhas, 01 §7), `podeAdministrar(m)`, `parametros`, `visivel`, `rodadaCompleta`, `agora`, `hoje`; `MARCADOR_IDS = '__CC_IDS__'`, `injetarIds`; `semearModelos()` → `backend/lib/escritas.mjs`
- [ ] **T-015** — `guarda.mjs` (`ATOR`, `ROTINA`, `PODE_ADMINISTRAR` = nível ≥ 3 ou `ADMIN`, `NIVEL_MIN(n)` = nível ≥ n ou `ADMIN`, sobre `A` ou `EU` (01 §4, §5), `clienteVisivelA`, `NUMEROS_20`) e `visibilidade.mjs` (`EU`, `MEMBRO_A(membroId)` — a tabela derivada `A` com as colunas de `EU` para o membro de `quem()`, 01 §6 —, `clienteVisivel`, `membroVisivel`), texto igual para MySQL e SQLite → `backend/lib/guarda.mjs`, `backend/lib/visibilidade.mjs`
- [ ] **T-016** — `parametros.mjs` (`PARAM`, `PARAM_NUM`, fusão dos arquivos de chaves, validação de tipo/faixa/opção) e `lib/parametros/001-base.mjs` com as 38 chaves de 03 §1, §2, §3 e §8 e o `validarConjunto` de cada grupo (RN-016) → `backend/lib/parametros.mjs`, `backend/lib/parametros/001-base.mjs`
- [ ] **T-017** — `quadros.mjs`: `semearQuadro()` (05 §1 regra 1, lê `QUADROS` no formato de 01 §14: `label`, `slaHoras`, `noCard`, `condicao` com chave trocada por id, `capa`; grava `CC_FASE` com `FINAL` = `tipo <> 'comum'`), `chamarKb()`, `FASE_DO_CARD`, e o montador de `ccPodeMover`/`ccPodeExcluir` a partir dos `gancho()` (texto de cláusulas `WHEN … THEN '…'`) de `lib/quadros/NNN-*.mjs` que existirem: texto vazio não entra no `CASE`, dois arquivos do mesmo quadro na ordem 004 → 005, spec sem arquivo pulada → `backend/lib/quadros.mjs`
- [ ] **T-018** — `winthor-sql.mjs`: `SQL_CLIENTES_PAGINA`, `SQL_COMPRAS_PAGINA`, `SQL_TITULOS_ABERTOS`, `SQL_ITENS_POR_DEPTO`, `SQL_RECEBIMENTOS`, `SQL_FATURAMENTO` (do `p-44515`), `SQL_PLANOS`, `SQL_TITULOS_CLIENTE` e a lista `COLUNAS_LIDAS` por tabela; só `SELECT`/`WITH`; colunas de 02 §Winthor → `backend/lib/winthor-sql.mjs`
- [ ] **T-019** `[P]` — `posicao.mjs` (`calcularPosicao`: os 6 passos do plan, com `A_VENCER_7DU` no passo 5) e `setor.mjs` (`setorDoRamo`, `esferaDoRamo`), puras → `backend/lib/base/posicao.mjs`, `backend/lib/base/setor.mjs`
- [ ] **T-020** `[P]` — `modelo.mjs` (`camposDoTexto`, `renderizar` com os campos comuns de 01 §13 e os extras, formatação de dinheiro e data) e `equipe.mjs` (`nomeChave`, `nivelDoCargo`, `conferirEquipe`) → `backend/lib/base/modelo.mjs`, `backend/lib/base/equipe.mjs`

### 2. Schema

- [ ] **T-021** — `DDL` das 22 tabelas de 02 §001-base, um template literal por tabela, com as chaves únicas e os índices do contrato → `backend/schema/001-base.mjs`

### 3. Server Functions → `backend/add-010-base.mjs`

- [ ] **T-022** — Sessão e auditoria: `ccBaseSessao`, `ccEscBaseAuditoria` (lote de até 20 linhas por listas alinhadas, com `entidadeIds` e `clienteIds`, 01 §7), `ccBaseAuditoriaListar`/`Total`
- [ ] **T-023** — Parâmetros: `ccBaseParametroListar` (sem o fragmento `EU`, funciona aninhada sem sessão; `VIGENCIA_INICIO` do valor efetivo na carteira pedida; `PADRAO`, `MINIMO`, `MAXIMO`, `USADO_POR`), `ccBaseParametroHistorico`, `ccBaseParametroSalvar` (lote, validação do conjunto por carteira afetada, restaurar padrão), `ccEscBaseParametro`
- [ ] **T-024** — Equipe: `ccBaseMembroListar`/`Total` (com `busca`, `limite`, `offset`), `ccBaseMembroSalvar` (`PODE_ADMINISTRAR`; marca `admin` só por quem tem a marca; o último ativo com a marca não a perde nem é inativado; novo, edição com `CAMINHO` da subárvore, troca de topo, inativação), `ccEscBaseMembroInserir`, `ccEscBaseMembroAtualizar` (guarda em tabela derivada), `ccBaseEquipeConferir`
- [ ] **T-025** — Rotina: `ccRotina` (cron `0 */5 * * * *`, trava com token, rodada de leitura × de processamento, orçamento, erro de passo isolado, leitura parada), `ccEscBaseEstado`, `ccEscBaseRotinaPasso`, `ccBaseSincronizacaoStatus`, `ccBaseSincronizacaoPedir`, `ccEscBaseSincronizacaoPedir`, e `ccBaseSincronizacaoListar`/`Total` (`PODE_ADMINISTRAR`)
- [ ] **T-026** — Leitura do Winthor, parte 1: `ccBaseSincronizar` com as fases `CLIENTES` e `POSICAO` (páginas por `CODCLI`, só clientes completos, grava só o que mudou, departamentos novos, setor e esfera pelo ramo, marcador `__JDBC_WINTHOR__`)
- [ ] **T-027** — Leitura do Winthor, parte 2: fases `RECEBIMENTOS` (janela, estorno), `FATURAMENTO`, `PLANOS` e `FECHAR` (zeragem, pontualidade, contagens, `OK`); retomada por `FASE`/`CURSOR`; falha → `ERRO`
- [ ] **T-028** — Clientes, leituras: `ccBaseClienteListar`/`Total`, `ccBaseClienteFicha`, `ccBaseRecebimentoListar`/`Total`, `ccBaseFaturamentoMes`, `ccBasePlanoListar`
- [ ] **T-029** — Winthor ao vivo: `ccBaseTitulosAbertos` (`membroId (0)`, visibilidade por `MEMBRO_A` + `clienteVisivelA`, sem `EU`, DT-34), `ccBaseWinthorTitulos` (SQL Oracle com `jdbcId`), `ccBaseWinthorDescobrir`, `ccBaseWinthorCliente` e o ramo "fora do sistema" da Ficha
- [ ] **T-030** — Clientes, escritas: `ccBaseClienteAtribuir`, `ccEscBaseClienteAgente`, `ccBaseClienteClassificar` e `ccEscBaseClienteClassificar` (`NIVEL_MIN(2)` com o cliente visível, DT-41), `ccEscBaseClienteAnalista`, `ccEscBaseClienteJuridico`
- [ ] **T-031** — BUs, departamentos e feriados: `ccBaseBuListar`, `ccBaseBuDeptoListar`, `ccBaseBuSalvar`, `ccEscBaseBuSalvar`, `ccBaseBuDeptoSalvar`, `ccEscBaseBuDepto`, `ccBaseFeriadoListar`, `ccBaseFeriadoSalvar` (com `remover` e `gerarAno`), `ccEscBaseFeriado`, `ccEscBaseFeriadoRemover`, `ccEscBaseFeriadosInserir` (lote ≤ 20, `INSERT IGNORE`)
- [ ] **T-032** — Contatos: `ccBaseContatoListar` (por cliente; de todos os clientes + `ccBaseContatoTotal`, busca pela coluna `BUSCA`), `ccBaseContatoSalvar` (principal único, desligado `PENDENTE`), `ccEscBaseContatoInserir` e `ccEscBaseContatoAtualizar` (gravam `BUSCA`), `ccBaseContatosRevisar`, `ccEscBaseContatosRevisar`
- [ ] **T-033** — Modelos e e-mail: `ccBaseModeloListar`, `ccBaseModeloPrever` (`membroId (0)`, visibilidade por `MEMBRO_A`, DT-34), `ccBaseModeloSalvar`, `ccEscBaseModelo`, `ccBaseModeloValidar`, `ccEscBaseModeloValidar`, `ccEmailEnviar` (com `montarEmail` da lib inlinado; cliente visível ao membro de `quem()` por `MEMBRO_A`), `ccEscBaseEmailInserir`, `ccBaseEmailListar`/`Total`
- [ ] **T-034** — Anexos: `ccBaseAnexoListar`, `ccBaseAnexoRegistrar` (formatos, 20 MB, guarda por entidade: `MATERIAL` `PODE_ADMINISTRAR`, `CERTIDAO` `NIVEL_MIN(2)`), `ccEscBaseAnexoInserir`, `ccBaseAnexoRemover`, `ccEscBaseAnexoRemover`
- [ ] **T-035** — Quadros: `ccPodeMover`, `ccPodeExcluir` (montados por `lib/quadros.mjs`) e `ccBaseAcessosConciliar` (passo `ACESSOS`: `USER_ID`, `ADMINS_IDS` = membros ativos com `PODE_ADMINISTRAR`, coluna de 05 §2 pelo slug — `cobranca-*`, `concessao-*`/`pedidos-limite`, `juridico`, com Supervisor `membro` no `juridico` (DT-35) —, `ACESSO_JSON` só quando muda; perfil da plataforma atrás do resultado da S-15 na T-002)
- [ ] **T-036** — Publicação do `add-010`: `definitions` completas com `FORA_DO_PERFIL`; `isEntrypoint()` em duas passadas (publica, lê os ids, republica as JS com `injetarIds`) e idempotente (upsert pelo nome, ids mantidos), porque roda de novo na segunda passada do `PUBLISH_ORDER` e depois de cada spec publicada sozinha (DT-39): a cada execução injeta os ids das SFs já publicadas e remonta `ccPodeMover` com os `lib/quadros` presentes; `jdbcId` do Winthor por nome em `ccBaseWinthorTitulos` e no marcador da leitura, cron do `ccRotina`; cabeçalho com a entrada de cada `ccEsc…`

### 4. Seed

- [ ] **T-037** — `seed/001-base.mjs` conforme a seção Simulador do plan: `winthor()` com os clientes 1001 a 1012 pelo `nota()` (sem `CC_CLIENTE`: nasce no passo 6 e os agentes vêm do `atribuir()`); `dominio()` com o contato do 1002 revisado em `dia(-181)` (por `ccBaseContatoSalvar` como Ana) e os modelos `TESTE_AVISO` e `TESTE_LEGAL`; e `CHECK_INPUT` do `config.mjs`; `npm run sim:check` sem falha → `backend/simulator/seed/001-base.mjs`, `backend/simulator/config.mjs`

### 5. Testes de backend → `backend/simulator/smoke/001-base.mjs`

Uma tarefa por linha de backend da seção Testes do `plan.md`; o `assert` de cada uma é o da linha.
O arquivo exporta `RELOGIO`, `QUADROS_TESTE` e `BANCO_POR_TESTE = true`: cada teste parte de uma cópia do
banco do passo 11 e refaz dentro de si o que pressupõe de outro cenário (plan, "Testes").

- [ ] **T-040** — `teste('C-001: posição do 1001 calculada dos títulos')` (RN-001, RN-003 a RN-006, RN-030)
- [ ] **T-041** — `teste('RN-002: título que vence hoje é a vencer')`
- [ ] **T-042** — `teste('C-002: recebimento entra uma vez e estorno sai da conta')` (RN-007)
- [ ] **T-043** — `teste('C-003: cliente novo entra, alterado atualiza, sem movimento fica fora')` (RN-010, RF-021)
- [ ] **T-044** — `teste('C-004: quem quitou sai zerado no total, na BU e na carteira')` (RN-008)
- [ ] **T-045** — `teste('C-005: Winthor fora não altera posição nem roda passo')` (RN-009)
- [ ] **T-046** — `teste('C-006: intervalo, pedido manual, leitura parada e leitura retomada')` (RF-001, RF-007, RF-008)
- [ ] **T-047** — `teste('C-007: ficha com títulos ao vivo e erro sem dado antigo')` (RF-010, RF-019; inclui `ccBaseTitulosAbertos` e `ccBaseModeloPrever` aninhadas em `nasDuasSessoes`, DT-34)
- [ ] **T-048** — `teste('C-008: busca por nome, documento e código, filas e totais')` (RF-011)
- [ ] **T-049** — `teste('C-009: visibilidade pela hierarquia, em SQL e em memória')` (RN-012; inclui `ccEscBaseClienteAnalista` e `ccEscBaseClienteJuridico`)
- [ ] **T-050** — `teste('C-010: sem vínculo e inativo não acessam')` (RN-013)
- [ ] **T-051** — `teste('C-011: cadastro da equipe com erro')` (RN-011)
- [ ] **T-052** — `teste('C-012: troca do topo')`
- [ ] **T-053** — `teste('C-013: inativar quem tem clientes ou equipe')`
- [ ] **T-054** — `teste('C-014: redistribuição dentro da equipe')` (RN-014)
- [ ] **T-055** — `teste('C-015: valor por carteira')` (RN-015)
- [ ] **T-056** — `teste('C-016: vigência e substituição na mesma data')` (RN-015)
- [ ] **T-057** — `teste('C-017: validações dos parâmetros e lote inteiro')` (RN-016, RF-022)
- [ ] **T-058** — `teste('C-018: auditoria e restaurar padrão')` (RN-017)
- [ ] **T-059** — `teste('C-019: administra quem é Gerente, Diretoria ou Administrador')` (inclui a marca `admin` só por quem tem a marca)
- [ ] **T-060** — `teste('C-020: BU do item, setor pelo ramo e departamentos')` (RN-018)
- [ ] **T-061** — `teste('C-021: feriados e dias úteis')` (RN-019, RN-020)
- [ ] **T-062** — `teste('C-022: ficha de contatos')` (RN-021)
- [ ] **T-063** — `teste('C-023: modelo, campos, versão e validação')` (RN-022)
- [ ] **T-064** — `teste('C-024: envio de e-mail registrado')` (RN-023, RF-036, RF-038; `ccEmailEnviar` aninhada em `nasDuasSessoes`)
- [ ] **T-065** — `teste('C-025: anexo')` (RN-024)
- [ ] **T-066** — `teste('C-026: consulta da auditoria e imutabilidade')` (RN-025)
- [ ] **T-067** — `teste('C-028: posição por BU, por carteira e por faixa')` (RN-028, RN-029)
- [ ] **T-068** — `teste('C-029: vencimento em dia não útil')` (RN-002)
- [ ] **T-069** — `teste('C-030: tipo de cobrança excluído')` (RN-001)
- [ ] **T-070** — `teste('C-031: rotinas dos módulos em ordem')` (RN-031)
- [ ] **T-071** — `teste('C-032: planos de pagamento e faturamento mensal')`
- [ ] **T-072** — `teste('C-033: acesso aos quadros e ganchos')` (RN-032; `semearQuadro` com etiquetas, automações, checklist, `config`, "nunca sobrescreve" e "recria o excluído"; `cobranca-teste` e `juridico-teste`; com `nasDuasSessoes`)
- [ ] **T-073** — `teste('C-034: conferência da equipe e dos campos do Winthor')`
- [ ] **T-074** — `teste('RN-026: hoje é a data de Brasília')`
- [ ] **T-075** — `teste('RNF-006: orçamento de execuções')` (ficha ≤ 6; as afirmações de ≤ 12 e ≤ 150 ficam dentro de T-054, T-058, T-064 e T-070)
- [ ] **T-076** — `teste('RNF-005: nada escreve no Winthor')`
- [ ] **T-126** — `teste('RF-012: cliente fora do sistema lido do Winthor')` (`ccBaseWinthorCliente` e o ramo `foraDoSistema` da Ficha, pelo código e pelo `documento`)
- [ ] **T-127** — `teste('C-033: quadros semeados pelo pipeline antes da primeira rotina')` (DT-38; banco próprio, linha "C-033 · pipeline" do plan)
- [ ] **T-128** — `teste('C-009: atribuição do pipeline grava agente e analista antes do processamento')` (DT-38; banco próprio, linha "C-009 · pipeline" do plan)

### 6. Verificação do backend

- [ ] **T-077** — `cd backend && npm test` verde (`sim:check` + `smoke/000-esqueleto` + `smoke/001-base`); `GET /health` do simulador sem `semDefinicao` nem `erros`
- [ ] **T-078** — Conferência contra o contrato: os nomes das 50 SFs públicas e das 26 internas de 04 §1 iguais em `add-010-base.mjs` e em `server-functions.ts`; as 22 tabelas com as colunas de 02; as 38 chaves com o padrão de 03; nenhuma SF, tabela ou chave fora do contrato
- [ ] **T-079** — RNF-002: `seed-cli.mjs --massa 20000` e `ccBaseClienteListar` em até 2 s. **Marco M1: o backend das specs 002 a 007 pode começar**

## Frontend

### 7. Esqueleto do frontend (integrador)

- [x] **T-080** — Projeto Vite (React 19, TS, Tailwind 4, `react-router-dom`, `lucide-react`, `mitra-interactions-sdk`, `@benenutri/mitra-kanban` e pares), `vite.config.ts` (porta 5185, `base: './'`, alias `@`), `.env.example`, `mitra-api.ts` e `mitra-auth.ts` do kit (simulador na 3115), script `test` (`node --test "tests/**/*.test.mjs"`); design system Benenutri pela skill `design`, modo Instalar (tokens, fontes, marca, primitivos, `components/page.tsx`, `recharts` + `chart.tsx` do kit para a 006, tema claro/escuro sincronizado com o Painel, `docs/design.md`); `@source` da lib no `index.css` → `frontend/`
- [x] **T-081** — Casca e acesso: `App.tsx` (rotas e menu vindos do `index.ts` de cada módulo; "módulo entregue" = módulo cujo `index.ts` o `App` importa, e `menuDoMembro` recebe a lista dos importados, DT-39; importa uma vez os `extensoes.ts` dos módulos, as donas antes da 005), `AdminLayout.tsx` na opção `casca` **C** (Operação / Cadastros / Administração por `menuDoMembro`, faixa de posição desatualizada por `ccBaseSincronizacaoStatus` com cache de 60 s), guarda de sessão por `ccBaseSessao`, e `/entrar` na opção `login` **A** com o estado "Seu acesso ainda não foi liberado. Fale com o Administrador." → `frontend/src/App.tsx`, `frontend/src/AdminLayout.tsx`, `frontend/src/modules/001-base/entrar/`

### 8. Regra de tela → `frontend/src/lib/base/`

- [x] **T-082** `[P]` — `documento.ts` (`normalizarDocumento`, `formatarDocumento`, `montarBusca`) e `posicao.ts` (`situacaoDaPosicao`)
- [x] **T-083** `[P]` — `equipe.ts` (`montarEquipes`: direção, coluna por supervisor, diretos; inativos marcados)
- [x] **T-084** `[P]` — `parametros.ts` (`formatarParametro`; `GRUPOS_PARAMETRO` exportado = `{ codigo, nome, ordem }[]` com todos os grupos de 03, usado pela tela de parâmetros e pela 007; o que mudou num grupo)
- [x] **T-085** `[P]` — `menu.ts` (tipos `Modulo`, `RotaModulo`, `ItemMenu` e `MembroSessao` e `menuDoMembro(membro, modulos)` no formato de 01 §14: junta o `menu` dos módulos recebidos, guarda os itens com `pode(membro)` verdadeiro, agrupa em `OPERACAO`, `CADASTROS`, `ADMINISTRACAO` por `ordem`), `carteira.ts` (`CARTEIRAS`, `useCarteira(tela)`) e `extensoes.ts` (`registrarExtensao`, `extensoesDe` com a assinatura e a regra de combinação de 01 §14, incluindo `podeMover`)
- [x] **T-086** `[P]` — `dias-uteis.ts`: cópia de `backend/lib/dias-uteis.mjs`
- [x] **T-087** `[P]` — `auditoria.ts` (`agruparPorDia`, `agruparPorItem`, `fraseDoRegistro`)
- [x] **T-088** `[P]` — `arquivos.ts` (`validarArquivo`: formatos e 20 MB; `enviarArquivo`: renomeia para `<uuid>-<nome>` e chama `uploadFilePublicMitra`)
- [x] **T-089** — `frontend/src/modules/001-base/index.ts` no formato de 01 §14 (`export const modulo: Modulo`, rotas e itens de menu da base em `CADASTROS` e `ADMINISTRACAO`, administração com `pode = (m) => m.nivel >= 3 || m.admin`, D-06); `cd frontend && npm test && npm run build && npm run lint` limpos com a casca, as funções acima e os tipos de `menu.ts` publicados. **Marco M2: o frontend das specs 002 a 007 pode começar** (com T-116 e T-118 verdes)

### 9. Telas → `frontend/src/modules/001-base/` (opções de `docs/opcoes-tela/escolhas.md`; skill `design`, modo Construir)

- [x] **T-090** — `/clientes`, opção `clientes-busca` **C** (Filas prontas): quatro números, abas Em atraso · Sem agente · Ficha de contatos a revisar · Todos · Buscar no Winthor (só para quem vê tudo), filtros de BU e agente, "Escolher agente" na linha, paginação com total, espera de 400 ms na busca
- [x] **T-091** — `/clientes/:codcli`, opção `cliente-ficha` **B** (Cabeçalho fixo e abas): cabeçalho com os quatro números e a data da leitura; abas Títulos (em aberto ao vivo · pagos em 90 dias), Posição por BU, Contatos, E-mails e anexos, Cadastro; **estados não desenhados**: Winthor fora do ar ("Não foi possível consultar o Winthor agora." + "Tentar de novo", sem dado antigo) e posição desatualizada ou nunca lida
- [x] **T-092** — Diálogos da ficha **não desenhados**: "Grupo econômico e esfera" (RF-029), "Enviar e-mail" (modelo, contato, campos extras e prévia de `ccBaseModeloPrever`; recusas em aviso) e "Anexar" (tipo de documento, arquivo, aviso de endereço público, `validarArquivo` antes do envio); "Trocar agente" reusa a atribuição
- [x] **T-093** — Ficha de contatos (componente único: edição, principal, "Revisada sem alteração", situação) e `/contatos`, opção `contatos` **C** (Agenda de contatos), com a ficha em diálogo e o aviso de clientes sem contato
- [x] **T-094** — `/equipe`: aba Organograma na opção `equipe-organograma` **C**, **Equipes lado a lado, sem desenho de árvore** (faixa da direção, uma coluna por supervisor, "Direto com…"); aba Cadastro na opção `equipe-cadastro` **A** (Tabela e diálogo), com a marca "Administrador" habilitada só para quem tem a marca, o aviso de `ccBaseEquipeConferir`, a recusa de inativação citando as contagens e a troca de topo com confirmação
- [x] **T-095** `[P]` — `/equipe/redistribuir`, opção `equipe-redistribuicao` **A** (Selecionar e mover): seleção de até 20, destino entre os visíveis, faixa de ação
- [x] **T-096** `[P]` — `/admin/parametros`, opção `adm-parametros` **A** (Grupo em grade): colunas Padrão · Valor · Estética · Pública, "Vale a partir de", "Salvar grupo" (só o que mudou, em lotes de 20), "Restaurar padrão" do parâmetro e do grupo, nome do grupo por `GRUPOS_PARAMETRO`, histórico, motivos da recusa no topo do grupo
- [x] **T-097** `[P]` — `/admin/bus`, opção `adm-bus` **A** (BUs em tabela): BUs com carteira e departamentos, painel "Departamentos sem BU", bloco "Setor público" (ramos e prefixo)
- [x] **T-098** `[P]` — `/admin/feriados`, opção `adm-feriados` **C** (Por abrangência): três colunas, conferidor de dia útil, "Gerar ano", incluir e remover
- [x] **T-099** `[P]` — `/admin/modelos`, opção `adm-modelos` **B** (Editor com prévia): seletor de modelo, campos clicáveis, prévia com cliente escolhido, situação da validação e "Registrar validação"; sem "Novo modelo"
- [x] **T-100** `[P]` — `/admin/sincronizacao`, opção `adm-sincronizacao` **B** com o pedido do usuário "a+b": **faixa do dia (um traço por leitura) com os quatro números e a tabela de leituras** (`ccBaseSincronizacaoListar`/`Total`); "Ler agora"; bloco "Conferir campos do Winthor" (não desenhado, só `PODE_ADMINISTRAR`)
- [x] **T-101** `[P]` — `/admin/auditoria`, opção `adm-auditoria` **B** com o pedido "b+c": **linha do tempo por dia com a alternância "por item alterado"**; filtros de período, pessoa, área e cliente; somente leitura
- [x] **T-102** `[P]` — `/cadastros/planos` (**não desenhada**; listagem padrão, só leitura): código, descrição, prazo médio

### 10. Testes de tela → `frontend/tests/001-base.test.mjs`

- [x] **T-110** `[P]` — `test('C-005: posição desatualizada após 2 intervalos')`
- [x] **T-111** `[P]` — `test('C-008: documento e montagem da busca')`
- [x] **T-112** `[P]` — `test('C-011: equipes lado a lado')` (RF-017)
- [x] **T-113** `[P]` — `test('C-021: dias úteis na tela')` (RN-019; os mesmos casos do backend)
- [x] **T-114** `[P]` — `test('C-025: arquivo barrado antes do envio')`
- [x] **T-115** `[P]` — `test('C-026: auditoria por dia e por item')`
- [x] **T-116** `[P]` — `test('C-027: menu por perfil')` (RF-042; item com `pode` falso some; só os grupos `OPERACAO`, `CADASTROS`, `ADMINISTRACAO`)
- [x] **T-117** `[P]` — `test('RN-027: parâmetro na sua unidade')`
- [x] **T-118** `[P]` — `test('Extensões: registros do mesmo quadro combinados')` (01 §14)

## Verificação

- [ ] **T-120** — `cd backend && npm test` verde
- [ ] **T-121** — `cd frontend && npm test` verde; `npm run build` e `npm run lint` limpos
- [ ] **T-122** — Revisão das telas pela skill `design`, modo Revisar (anti-padrões de `design.md` §14), incluindo as não desenhadas; tema claro e escuro sem cor quebrada; zero hex cru
- [ ] **T-123** — No simulador, pelo navegador: C-027 com Ana, Nara e Gustavo; C-007 (ficha do 1001, Winthor fora do ar, 1006 recusado para Ana); C-005 (faixa de posição desatualizada); RF-017 em largura de celular; C-025 (PDF e imagem abrem; aviso de endereço público)
- [ ] **T-124** — RNF-004: nenhuma tela relê sozinha em menos de 60 s (inspeção das chamadas no simulador)
- [ ] **T-125** — No sandbox, depois da T-002: C-001 com 3 clientes reais conferido contra o relatório de títulos em aberto do Winthor (`SIMULATOR_WINTHOR=oracle`); C-024 com e-mail real; RNF-001 e RNF-003 medidos e registrados no `plan.md`

## Dependências

```
T-001 → T-003 → T-005, T-007, T-008 → T-009 → T-010 (o pipeline chama `semearQuadro` da T-017 e as SFs de T-025 e T-030: roda de verdade a partir da T-037)
T-004 [P], T-006 [P], T-011 [P] depois de T-001
T-002: roteiro depois de T-001; execução no sandbox depois de T-036 (não trava o simulador)
T-012, T-013 [P] → T-014 → T-015 → T-016, T-017 · T-018 depois de T-004 · T-019, T-020 [P] depois de T-013
T-021 depois de T-007
T-014..T-021 → T-022 → T-023 → T-024 → T-025 → T-026 → T-027 → T-028 → T-029 → T-030 → T-031 → T-032 → T-033 → T-034 → T-035 → T-036
T-009, T-036 → T-037 → T-040..T-076, T-126..T-128 → T-077 → T-078 → T-079 = M1
M1 → backend de 002..007
T-008 → T-080 → T-081 · T-082..T-088 [P] depois de T-080 → T-089 + T-116 + T-118 = M2
M2 → frontend de 002..007
T-089 → T-090 → T-091 → T-092, T-093 · T-094 → T-095 · T-096..T-102 [P]
T-082..T-088 → T-110..T-118 [P]
T-120..T-124 depois de tudo · T-125 depois de T-002 executada
```

Registro no `mitra-hub` e README final são da fase 5 de `execucao.md` (orquestrador), fora desta lista.

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001 / C-006 | T-016, T-025 | T-046 |
| RF-002 / C-001 · RN-001, 003 a 006, 030 | T-018, T-019, T-026, T-027 | T-040, T-041 |
| RF-003 / C-002 · RN-007 | T-018, T-027, T-028 | T-042 |
| RF-004 / C-003 · RN-010 | T-018, T-026 | T-043 |
| RF-005 / C-005 · RN-009 | T-026, T-027 | T-045 |
| RF-006 / C-005 | T-025, T-081, T-082, T-091 | T-045, T-110 |
| RF-007 / C-006 | T-025, T-100 | T-046 |
| RF-008 / C-006 | T-025 | T-046 |
| RF-009 / C-007 | T-028, T-029, T-091 | T-047 |
| RF-010 / C-007 | T-029, T-091 | T-047 |
| RF-011 / C-008 | T-028, T-082, T-090 | T-048, T-111 |
| RF-012 | T-029, T-090 | T-126 |
| RF-013, RF-014 / C-011 · RN-011 | T-020, T-024, T-094 | T-051 |
| RF-015 / C-012 | T-024, T-094 | T-052 |
| RF-016 / C-013 | T-024, T-094 | T-053 |
| RF-017 / C-011 | T-024, T-083, T-094 | T-112 |
| RF-018 / C-010 · RN-013 | T-014, T-022, T-081 | T-050 |
| RF-019 / C-009 · RN-012 | T-009, T-015, T-028, T-030 | T-049, T-047, T-128 |
| RF-020 / C-014 · RN-014 | T-030, T-090, T-095 | T-054 |
| RF-021 | T-028, T-090 | T-043, T-048 |
| RF-022 | T-007, T-016 | T-057 |
| RF-023, RF-024 / C-015, C-016 · RN-015 | T-016, T-023, T-096 | T-055, T-056 |
| RF-025 / C-017 · RN-016 | T-016, T-023 | T-057 |
| RF-026 / C-018 · RN-017 | T-023, T-096 | T-058 |
| RF-027 | T-023, T-096 | T-056 |
| RF-028 | T-007, T-031, T-097 | T-060 |
| RF-029 / C-020 | T-030, T-092 | T-060 |
| RF-030 / C-020, C-028 · RN-018, RN-028 | T-019, T-026 | T-060, T-067 |
| RF-031 / C-021 · RN-020 | T-013, T-031, T-098 | T-061 |
| RF-032 / C-021 · RN-019 | T-013, T-086, T-098 | T-061, T-113 |
| RF-033, RF-034 / C-022 · RN-021 | T-032, T-093 | T-062 |
| RF-035 / C-023 · RN-022 | T-020, T-033, T-099 | T-063 |
| RF-036 | T-033, T-092, T-099 | T-064 |
| RF-037 / C-024 · RN-023 | T-033, T-092 | T-064, T-125 |
| RF-038 | T-033, T-091 | T-064 |
| RF-039 / C-025 · RN-024 | T-034, T-088, T-092 | T-065, T-114 |
| RF-040 | T-014, T-022 | T-054, T-058, T-066 |
| RF-041 / C-026 · RN-025 | T-022, T-087, T-101 | T-066, T-115 |
| RF-042 / C-027 | T-081, T-085, T-089 | T-116, T-123 |
| RF-043 / C-028 · RN-029 | T-019, T-021, T-026 | T-067 |
| RF-044 / C-020 | T-026, T-031, T-097 | T-060 |
| RF-045 / C-032 | T-027, T-028, T-102 | T-071 |
| RF-046 / C-032 | T-018, T-027, T-028 | T-071 |
| RF-047 / C-031 · RN-031 | T-025 | T-070 |
| RF-048 / C-033 · RN-032 | T-009, T-017, T-035, T-085 | T-072, T-127, T-118 |
| RF-049 / C-034 | T-020, T-024, T-094 | T-073 |
| RF-050 / C-034 | T-018, T-029, T-100 | T-073 |
| C-004 · RN-008 | T-027 | T-044 |
| C-019 | T-015, T-023, T-024, T-031, T-033 | T-059 |
| C-029 · RN-002 | T-013, T-019, T-026 | T-041, T-068 |
| C-030 · RN-001 | T-019, T-026, T-029 | T-069 |
| RN-026 | T-012 | T-074 |
| RN-027 | T-084, T-096 | T-117 |
| RNF-001, RNF-003 | T-002 | T-125 |
| RNF-002 | T-028, T-037 | T-079 |
| RNF-004 | T-081 | T-124 |
| RNF-005 | T-018 | T-076 |
| RNF-006 | T-010 | T-075, T-054, T-058, T-064, T-070 |
| Esqueleto (01 §14, 06 §4) e pipeline do banco (06 §2.3) | T-001, T-003 a T-011, T-080, T-081 | `smoke/000-esqueleto.mjs` (T-010), T-127, T-128, T-077 |
| Sandbox S-01 a S-15 | T-002 | T-125 |
