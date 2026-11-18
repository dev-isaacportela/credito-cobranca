# Validação 000 v2: contratos entre as 7 specs

**Fase:** 0c, passo 5 · **Data:** 2026-11-16 · **Validador:** agente independente. Só leu, não corrigiu nada.

**Lido:** `docs/validacao/LEIA-v2.md`; contrato `docs/contrato/00` a `06` (01, 04, 05 e 06 inteiros; 02 e 03 por busca e pelas seções citadas); `docs/contrato/pedidos/00-respostas.md` inteiro, com o Fechamento; relatório v1 `docs/validacao/000-contratos-entre-specs.md` (resumo e §6); `docs/opcoes-tela/escolhas.md` e o mockup `006-painel-consolidado/telas-05-outras-equipe.html` (opção B do `painel-juridico-publico`).

Dos 7 `plan.md`/`tasks.md`, o que foi feito:
- busca automática de toda SF `cc…` contra 04;
- busca de toda referência `CC_TABELA.COLUNA` contra 02;
- busca de toda chave `grupo.chave` contra 03;
- busca de toda chave de fase contra 05;
- lista de todo caminho de arquivo das tasks;
- leitura das seções Contratos, Simulador e Testes onde há chamada entre specs: 002 §Escritas, §`sincronizarCaso`, §Rotina; 003 §Contratos, §Simulador; 004 §Simulador, §Decidir, §Gancho; 005 §Contratos, §Rotina, §Simulador, §Testes; 006 §Simulador, §Atenção; 007 §Simulador.

**Como citar:** `005/plan §Arquivos` = `docs/specs/005-setor-publico/plan.md`, seção "Arquivos".

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | **2** |
| CORRIGIR | **7** |
| OBSERVAÇÃO | **5** |
| Bloqueios da v1 (19) | 19 resolvidos |
| Correções da v1 (59) | 59 resolvidas; 1 voltou em outra forma (C-002-9 → C-5) |

Nomes de SF, tabela, coluna, parâmetro e fase usados nos 7 plans existem todos no contrato. A busca automática não achou nenhum nome fora de 04, 02, 03 ou 05; as únicas diferenças são as gêmeas `…Total` das listagens `L+T`. Os dois bloqueios vêm do próprio contrato: duas chamadas aninhadas que ele manda fazer não funcionam numa das duas hipóteses de sessão que o smoke é obrigado a rodar.

## Checklist

| Item (LEIA-v2) | Resultado |
|---|---|
| Toda chamada a SF de outra spec existe na dona com o mesmo nome | ok (busca: 0 nome fora de 04) |
| … com os mesmos parâmetros e saída | **falha**: B-1, B-2, C-3, C-4 |
| Tabelas e colunas de outra dona (02) | ok (busca `CC_X.COL`: 0 ausente) |
| Parâmetros (03) | ok. Contas de chaves dos plans: 38 + 52 + 31 + 86 + 62 + 8 = **277** |
| Costuras de arquivo (01 §14): duas specs no mesmo arquivo | ok. Só `server-functions.ts` aparece em 001 e 003, e a 003 pede ao integrador (O-2) |
| Ordem de construção: M1 = T-079, M2 = T-089; B2 = 002 ‖ 004, B3 = 003 ‖ 005, B4 = 006 ‖ 007 | ok. 005 vem depois de 001, 002 e 004. Para dependência adiantada (003 ↔ 005, 002 → 006, 004 → 005) há `pular()` ou id 0 |
| Seeds: faixas de código (06 §2.3) | ok, sem colisão (a 002 usa 2015–2047, a 004 usa 4011–4099, a 005 usa 5006 e NFs com `numnota`) |
| Seeds: formato em duas partes e relógio | **falha**: C-5, C-6, C-7 |
| Quadros (05): toda fase usada existe | ok (busca: 0 fase fora de 05; 84 fases) |
| Ganchos 004 + 005 em `concessao-publica` | ok. A linha `comite` da 004 vale só com `S.CARTEIRA <> 'PUBLICA'`; o trecho da 005 cobre `comite` da Pública; ordem 004 → 005 |
| Extensões de tela (dona antes da 005) | ok (001 T-081) |
| Resumos lidos pela 006 e pela 007 existem nas donas | ok. `ccCobAgendaResumo` está em 002/plan §Leituras, `ccJurResumo` em 003/plan §Contratos, `ccPubResumo` em 005, `ccBaseParametroListar` sem `EU` em 001/plan §Contratos. Mas a chamada aninhada dos três primeiros não funciona: B-2 |
| Orçamento entre specs | `ccJurDossieEnviar` 28 ≤ 30 bate com `ccCobEnviarJuridico` 12. A decisão da Pública dá 17–18 ≤ 20. As contas da 005 sobre SFs da 002 estão erradas: C-2 |
| Índice (00 §1) × 02, 03, 04 | ok: 55 tabelas (22 + 8 + 8 + 8 + 5 + 2 + 2); 277 chaves; 328 SFs (públicas 50 + 39 + 42 + 49 + 18 + 15 + 14 = 227; internas 26 + 21 + 19 + 17 + 11 + 2 + 5 = 101). Exceção: o texto da 005 (C-1) |

## BLOQUEIA

| Id | Onde | O que está errado |
|---|---|---|
| B-1 | 04 §2 `ccCobCasoSincronizar` (Quem: só `ccCobRotina` e `ccPubRotina`, tipo `SIS`) × 04 §5 `ccPubNfDatasSalvar` ("pede `ccCobCasoSincronizar` … no clique") × 002/plan §Escritas ("com sessão, recusa") × 005/plan §Escritas e §Testes ("orçamento: `ccPubNfDatasSalvar` com mudança de fase ≤ 20", rodado com `SIM_SESSAO_ANINHADA=0` e `=1`) | Uma JS de pessoa chama uma SF `SIS`. Na hipótese em que a plataforma leva a sessão para a chamada aninhada (S-01/S-14, `=1`), dois pontos recusam: a 002 recusa a chamada e a guarda `ROTINA` das `ccEsc…` não passa. O lançamento de datas da NF não move o card, e o smoke da 005 não dá resultado igual nas duas situações. Na outra hipótese (`=0`), o clique grava como "rotina" (autor nulo). O contrato precisa decidir: ou `ccCobCasoSincronizar` aceita chamada de pessoa (com `membroId` e guarda `caso`), ou a 005 deixa o card para a rotina. |
| B-2 | 01 §4 (chamada aninhada chega sem `:VAR_USER`) e §6 (sem `EU`, 0 linha) × 04 §6 `ccPainelAtencao` ("próprias + `ccCobAgendaResumo`, `ccJurResumo`, `ccPubResumo`") × 04 §3 `ccJurDossieSugestao` (`ccPubNfListar`, `ccPubCertidaoListar` "por SF") × 006/plan §`ccPainelAtencao`, T-020, T-114, T-123 × 003/plan §Reuso | Uma JS chama uma SF SQL de leitura que filtra pelo fragmento `EU`. Na hipótese padrão do simulador e do contrato (aninhada sem sessão), `EU` não acha ninguém e a leitura volta vazia; SQL não recebe `membroId`. Resultado: os pontos de atenção da 006 perdem os tipos que vêm dos três resumos, e a C-014/C-023 falham com `SIM_SESSAO_ANINHADA=0`. O dossiê público da 003 vem sem as sugestões de NF, empenho, protocolo e certidões. Só `ccBaseParametroListar` foi tratada assim (sem `EU`, PA-10 da 007). Os três resumos e as duas leituras da 005 precisam de outro caminho: versão sem `EU` com a visibilidade conferida pela JS, a JS ler as tabelas direto, ou chamada pela tela. |

## CORRIGIR

| Id | Onde | O que está errado |
|---|---|---|
| C-1 | 005/plan §Arquivos (linha do `add-050`: "28 SFs"; "ids locais 5000–5027"); 005/tasks T-028 ("28 SFs com id local 5000–5027") | Depois do F-1 a 005 tem 18 + 11 = **29** SFs. O próprio plan diz 29 em §Contratos ("18 públicas + 11 internas"). Falta um id no bloco do integrador (`ccEscPubNfPassoAtualizar`). |
| C-2 | 005/plan §Rotina, tabela "Contas de execução" | As contas usam custos da 002 diferentes dos que a 002 fixou. `ccPubNfPassoRegistrar` conta "contato com próxima ação 8", mas `ccCobContatoRegistrar` custa **10** (002/plan §Escritas); o total é 18, não 16. `ccPubNfDatasSalvar` conta 15, mas `sincronizarCaso()` da 002 custa 1 + mover 5 + capa 4 (`kbCardAtualizar` + `ccEscCobCasoCapa`) + próxima ação 1 (+ nota 2), ou seja 16. Os dois cabem em 20; as linhas e os testes T-022/T-164 citam números errados. |
| C-3 | 005/plan §Escritas `ccPubNfPassoRegistrar` × 04 §2 `ccCobContatoRegistrar` × 02 `CC_CONTATO_COBRANCA` | A 005 não diz o `retorno` nem o `feedback` que manda. A 002 exige `feedback` e recusa `retorno` fora da lista. Além disso, 02 lista `ORIGEM = 'REGUA_PUB'` e `EMAIL_ENVIADO_ID`, mas `ccCobContatoRegistrar` não tem entrada para nenhum dos dois: o contato da régua pública sai como `MANUAL` e sem o e-mail ligado. |
| C-4 | 04 §0 ("`membroId (0)` existe em toda `JS-E` que outra SF chama aninhada"); 04 §2 `ccCobEncargosCalcular`, §5 `ccPubMotorCalcular`, `ccPubAnaliseObter`, §1 `ccBaseModeloPrever`; 002/plan §Leituras; 004/plan §Motor | Essas leituras JS são chamadas aninhadas pela 003 (envio do dossiê, notificação, sugestão) e pela 004 (decisão e motor da Pública). Exigem visibilidade (`T`/`caso`), mas nem o contrato nem a dona declaram `membroId`. Sem ele, `quem()` cai em "rotina", que só uma SF `SIS` aceita. Hoje só `ccBaseTitulosAbertos` declara (001/plan). A 003 e a 005 dizem que passam `membroId`; a 004 não diz que passa para `ccPubMotorCalcular`. Funciona por acaso, porque `quem()` lê `input.membroId`; precisa estar escrito na regra de 04 §0 e na dona. |
| C-5 | 06 §2.3 ("Seed em duas partes": o orquestrador roda DDL → elenco → `winthor()` → `ccRotina` → `atribuir()` → `dominio()`) × 002/tasks T-013 (atribuição e contatos por SF antes da rotina) e T-050 (`rodarCron` dentro do seed) · 004/plan §Simulador (o seed roda `ccRotina` e atribui) · 006/plan §Simulador ("Preparo do banco A": relógio 08/11 → rotina → atribuição, no smoke) · 003/plan §Simulador `dominio()` (a): relógio volta a `dia(-40)` · 001/tasks T-009, T-010 | Quatro seeds fogem do formato, e o orquestrador não diz com que relógio roda a primeira `ccRotina` num banco cujo smoke fixa 11-14 (004, 006) ou 12-01 (005). Daí dois defeitos. (a) A T-013 da 002 chama `ccBaseClienteAtribuir`/`ccBaseContatoSalvar` antes de existir `CC_CLIENTE`, e falha. (b) A 006 (08/11) e a 003 (`dia(-40)`) voltam o relógio depois da leitura do orquestrador. Com relógio para trás, 01 §11 regra 2 não abre leitura nova, e a posição fica a do dia da primeira leitura: a 3013 nunca passa por `protesto`, e o "Preparo" da 006 não lê nada em 08/11. |
| C-6 | 06 §2.5 "Atribuição" ("4001–4010 analista Rita") e §2.3 (`atribuir()` "de agente e analista … por `ccBaseClienteAtribuir`"); 001/plan §Simulador, 001/tasks T-009 | `ccBaseClienteAtribuir` só grava `AGENTE_ID` (04 §1). `ANALISTA_ID` só muda por `ccEscBaseClienteAnalista`, chamada pela 004 ao criar ou atribuir a solicitação. O `atribuir()` do elenco não tem como pôr Rita como analista. |
| C-7 | 007/plan §Simulador, passo 4 ("Rita: `ccCredSolicitacaoCriar` … e `ccCredPedidoCriar`" para 7001) × 004/plan §Abrir ("cliente visível") × 01 §6 | 7001 está com Ana e não tem analista. Rita (Analista, abaixo de Sérgio) não enxerga 7001 antes de ser a analista, e as duas SFs da 004 recusam com "Cliente não encontrado.". Os testes de Crédito do histórico ficam sem evento. |

## OBSERVAÇÃO

| Id | Onde | O quê |
|---|---|---|
| O-1 | 01 §13 "Custo … Lote: no máximo 5 e-mails por chamada da tela" | O texto ficou para trás do F-4 e de 01 §10 ("2 e-mails da fila"). |
| O-2 | 003/tasks T-200 | A seta aponta para `frontend/src/lib/server-functions.ts`, arquivo do integrador. O texto diz "pedir ao integrador", mas a forma é de quem escreve; as outras specs entregam a lista. |
| O-3 | 006/plan D-06 e §Superfície (`painel-juridico-publico` B) × mockup `telas-05-outras-equipe.html` × 00 DT-33 | O arquiteto aceitou (PA-21 da 006) reduzir o funil ao que `ccJurResumo`/`ccPubResumo` trazem. Saem "A ajuizar" com valor, acordos a receber ou com parcela vencida, recebido no mês ou no ano, e valor por etapa do público. O dado existe nas tabelas da 003 e da 005, e DT-33 diz que a tela escolhida não perde função por falta de leitura. Vale confirmar com o usuário. |
| O-4 | 05 §3.6 (linhas 3 e 14) × 04 §3 `ccJurProcessoEncerrar` | Processo encerrado sem quitar a dívida (`EXTINTO`, `OUTRO`, `BAIXA_PERDA` sem baixa): o card da cobrança fica em `juridico` para sempre, porque a régua não move essa fase e o gancho proíbe sair à mão. Com `NO_JURIDICO` falso, o Jurídico perde também a leitura do cliente. Nenhuma linha do contrato trata a volta. |
| O-5 | 06 §1, §2.3 × 005/plan §Simulador × 006/plan §Simulador (banco B com o seed da 005) e 007/plan §Simulador (seed da 005 declarado) | O seed da 005 tem datas absolutas e `comRelogio('2026-11-20…')` para a solicitação do 5002. Carregado nos bancos da 006 (11-14) e da 007 (11-19), essa solicitação fica com criação no futuro. Hoje nenhum teste afirma sobre ela nesses bancos, mas o contrato só fala de relógio "cada um no seu banco". |

## v1 → v2

**Bloqueios (19): todos resolvidos.**

| v1 | Destino |
|---|---|
| B-001-1 | resolvido: catálogo composto por arquivo de chaves (01 §9; 03) |
| B-001-2 | resolvido: `ccEmailEnviar` com `assunto`/`corpo`, `ccBaseModeloValidar` (01 §13) |
| B-001-3 | resolvido: `VDIAS`, faixas, pontualidade, compra média, prazo médio e `ALTERADO_EM` (02, Bloco SALDOS e `CC_POSICAO_CLIENTE`) |
| B-001-4 | resolvido: todo cliente tem posição por título, e a visão legal fica em `CC_NF_PUBLICA` (01 §11; P-09) |
| B-001-5 | resolvido: `CC_FATURAMENTO_MES`, `CC_PLANO_PAGAMENTO` e `ccBasePlanoListar`; `PCNFSAID` no schema (02; 04 §11) |
| B-001-6 | resolvido: `add-0N0` e arquivos por spec (01 §14) |
| B-001-7 | resolvido: `NO_JURIDICO` dentro de `clienteVisivel()` (01 §6) |
| B-002-1 | resolvido: `regua.*`, `cob.*`, `enc.*` (03 §4–6) |
| B-002-2 | resolvido: `ccCobEncargosCalcular`, título a título (04 §2) |
| B-002-3 | resolvido: fluxo único com dossiê primeiro, `ccCobEnviarJuridico` idempotente e `ccCobSituacao` (04 §2) |
| B-002-4 | resolvido: a 002 usa `ccCobPainel*` (04 §12) |
| B-002-5 | resolvido: `ccCobCasoSincronizar` e quadro `cobranca-publica`. O caminho do clique da 005 é o B-1 novo |
| B-003-1 | resolvido: `jur.*`; a carga concluída vira `CC_ESTADO` (03 §14, §17) |
| B-003-2 | resolvido: 31.087,25 e 34.388,25 (06 §2.5; 003/plan C-003) |
| B-004-1 | resolvido: D-05 (solicitação única, `PRE_APROVADA`, P1–P4 em `CC_ANALISE_ORGAO`, `temMotorProprio`) |
| B-004-2 | resolvido: 86 chaves no catálogo; `saude.riscoDias` unificada |
| B-005-1 | resolvido: alçada e encargos do público viram valor da carteira `PUBLICA` (03 §18) |
| B-006-1 | resolvido: `painel.hhi*`, `painel.sincAtrasoMin`, `saude.*` (03 §12–13) |
| B-007-1 | resolvido: `ccEscHist…` com guarda (04 §7) |

**Correções (59): todas resolvidas; uma voltou em outra forma.**

| v1 | Destino |
|---|---|
| C-001-1 … C-001-10 | resolvidas: rodada de leitura e gatilho "leitura OK" (01 §11), `auditarLinhas`, `add-090` com todos os módulos, `proximoUtil` e `dias-uteis.ts`, `PARAM()` e `CAMINHO`, `tempo.mjs`/`CC_AGORA`, `CC_CLIENTE.ENDERECO`, elenco único (06), IX e carga do recebimento, S-01…S-15 |
| C-002-1 … C-002-8, C-002-10, C-002-11 | resolvidas: assinatura de `ccEmailEnviar` e lote de 2 (F-4); de → para dos campos; nomes reais; `validarConjunto` crescente com um editor só; `ccRotina`; promessa `ABERTA`/`CUMPRIDA`/`QUEBRADA`; `ccCobAgendaResumo` e a próxima ação do órgão; guarda na SQL; arquivos por módulo; `regua.prevAviso2`, `painel.hhi*` |
| C-002-9 | resolvida quanto a equipe, faixa e relógio; o formato do seed da 002 voltou como C-5 |
| C-003-1 … C-003-9 | resolvidas: nomes reais; `ccJurResumo`; validação por `SITUACAO_VALIDACAO`; faixas 3001–3099; guarda na SQL; PDF pela impressão, sem `jspdf`; `schema/003`; hoje do servidor; dossiê público em 05 §8 |
| C-004-1 … C-004-8 | resolvidas: internas no `add-040`; guarda de alçada e segregação na SQL; `COMPRAS_QTD`; `PRAZO_DECISAO`/`DECIDIDA_EM`; níveis 1/2/3/5 com tabela única (03 §7); `CLIENTE_ID` em `CC_DECISAO` e as tabelas `_HIST`/`_CHECK` extintas; foto de calibração no gatilho único; Rita como Analista |
| C-005-1 … C-005-8 | resolvidas: nomes reais; `ccEmailEnviar` final; smoke sem dublê; `RATING_CONCESSAO`; contas da rotina; guardas; elenco único; `HOJE_SQL` |
| C-006-1 … C-006-6 | resolvidas: fragmento único de visibilidade; carteira pelo setor; nomes reais e `ESTORNADO = FALSE`; saúde lida de `CC_RISCO_CLIENTE`; `schema/006`; aging do público por título |
| C-007-1 … C-007-7 | resolvidas: `ccBaseParametroListar` e `auditar()`; listagens SQL com `…Total`; autor = `CC_MEMBRO.ID`; mapa de fontes com os nomes de 02; Jurídico por `NO_JURIDICO` e auditoria por `NIVEL_MIN(2)`; crédito por `CC_RISCO_CLIENTE`/`FP_NOME`; faixa 7001–7099 |
