# Validação v3-A: 001-base, 002-cobranca-privada, 003-juridico, 007-historico-apoio

Validador independente, rodada v3. Data: 2026-11-16. Só leitura: nada foi corrigido nas specs nem no contrato.

**Lido:** relatórios v2 `001-base-v2`, `002-cobranca-privada-v2`, `003-juridico-v2`, `007-historico-apoio-v2` e
`000-contratos-entre-specs-v2`; `contrato/pedidos/01-correcoes-v2.md` inteiro (DT-34 a DT-42, seções 001, 002, 003, 007,
"Para o integrador" e §5 Fechamento v2); `contrato/LEIA-correcao-v2.md`. Dos planos: `specs/001-base/{spec,plan,tasks}`,
`specs/002-cobranca-privada/{plan,tasks}` e spec por busca, `specs/003-juridico/{plan,tasks}` e spec por busca,
`specs/007-historico-apoio/{plan,tasks}` e spec por busca, nas seções que as correções tocam (Simulador, Testes,
Escritas, guardas, gancho, orçamento, publicação). Contrato por seção: 06 §1 a §3 inteiros, 04 §2 (`ccCobCasoSincronizar`,
`ccPubNfDatasSalvar`) e §8, 01 §14 (publicação), 03 §14 (`jur.*`). Busca automática nos 4 planos: toda SF `cc…`/`kb…`
contra 04/01/05, toda `CC_X.COLUNA` contra 02, toda chave `grupo.chave` contra 03. Para conferir a correção da 007, a
guarda de `ccEscCredSolicitacaoInserir` em `specs/004-concessao-credito/plan.md`.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA (novos ou não resolvidos) | **0** |
| CORRIGIR (novos ou não resolvidos) | **3** |
| OBSERVAÇÃO | **6** |
| Itens v2 conferidos (BLOQUEIA + CORRIGIR das 4 specs + 000 que as cita) | 41: 38 resolvidos, 1 resolvido com resto, 2 mal resolvidos (o mesmo defeito, 007 C-1 = 000 C-7) |
| Itens de 01-correcoes-v2 (001: 12, 002: 14, 003: 9, 007: 4) e §5 que tocam as 4 | 39 + 6 aplicados no texto; 1 aplicado mas não fecha (007 item 1); 1 aplicado com furo de segurança (002 item 1) |

Busca de nomes: nenhum nome fora do contrato além das gêmeas `…Total` (`ccBaseClienteTotal`, `ccCobAgendaTotal`,
`ccCobBloqueioTotal`, `ccCobContatoTotal`, `ccCobEmailFilaTotal`, `ccCobProjecaoTotal`, `ccJurProcessoTotal`) e
`kbCardExcluir` (lib). Colunas e chaves: zero ausentes. Nenhum "pendente do arquiteto" nem `NEEDS CLARIFICATION`.
Contas mexidas conferidas entre passos, orçamento e tarefas: `ccCobEmailFilaDecidir` 1 + 2 × 7 + 1 = 16 (plan, T-041);
`ccCobCasoSincronizar` como pessoa 1 + 1 + 1 + 5 + 2 + 3 = 13 (plan, T-126, C-027); `ccCobBaixaParecer` 3;
`ccJurDossieEnviar` 28 ≤ 30 com `ccCobEnviarJuridico` 12; abrir dossiê = 2 e "Ver sugestões" = 4; ficha da 001 ≤ 6.
Seeds das 4 seguem o pipeline de 06 §2.3: atribuição só no passo 7 (`ATRIBUICAO` da 002 para 2015–2058), nenhum
`rodarCron` no `dominio()`, 3013 em `passado()` com `INICIO = dia(-40)`.

## v2 → v3

| Id v2 | Spec | Situação v3 |
|---|---|---|
| B-1 (quadros não semeados) | 001 | Resolvido: passo 3 do pipeline; C-033 com `ate: 3` |
| C-1 (banco único, rotina antes do C-003) | 001 | Resolvido: banco por teste, C-003 parte do passo 11 (11 → 12) |
| C-2 (publicação em uma passada) | 001 | Resolvido: T-001 e plan com duas passadas e republicação do `add-010` |
| C-3 (`index.ts` sem formato) | 001 | Resolvido: T-085, T-089, C-027 |
| C-4 (`semearQuadro` com 2 fases; slug do `ACESSOS`) | 001 | Resolvido: plan "Acessos" passo 2; C-033 completo |
| C-5 (RF-012 sem teste) | 001 | Resolvido: linha RF-012 (código e documento), T-126 |
| C-6 (último Administrador fora da spec) | 001 | Resolvido: RN-011 e C-011 da spec |
| C-7 (`atribuir()` sem analista) | 001 | Resolvido: analista por `ccEscBaseClienteAnalista`; teste do pipeline em C-009 |
| C-8 (`ccBaseWinthorCliente` exposta) | 001 | Resolvido: R-003 e Complexity Tracking |
| C-1 (rotina não concilia a Pública) | 002 | Resolvido: bloco "Na `PUBLICA`", T-021, C-029 |
| C-2 (modo automático reenvia) | 002 | Resolvido: `REFERENCIA` por caso × fase; RN-021 com 2ª rodada |
| C-3 (envio ao Jurídico sem dossiê) | 002 | Resolvido: `DOSSIE_ENVIADO_EM` na JS e na guarda; C-023 |
| C-4 (cancelar acordo sem visibilidade) | 002 | Resolvido: `clienteVisivelA`; RN-011 com Silvia |
| C-5 (`protesto_1` à mão) | 002 | Resolvido: botão e linha 12; RN-005 com 2049 |
| C-6 (RN-003 contra linha 1 de 05 §3.6) | 002 | Resolvido: teto na spec e no teste |
| C-7 (`ACAO_REGUA` em `acordo`) | 002 | Resolvido: 2010 em `extrajudicial` |
| C-8 (C-002 pelo total da coluna) | 002 | Resolvido: capa de cada card |
| C-9 (ordem do seed) | 002 | Resolvido: T-013 e T-050 |
| C-10 (estado compartilhado) | 002 | Resolvido com resto: A-O1 (RN-031 deixa 2057 com caso aberto) |
| C-11 (RFs sem assert) | 002 | Resolvido: RF-005, RF-006, RF-034, RF-036, RNF-005 e C-021 completo |
| B-1 (guarda do acordo judicial) | 003 | Resolvido: política relida com `PARAM_NUM('jur.acordo…')` no `INSERT … SELECT`; C-014 chama a interna direto |
| C-1 (relógio volta a `dia(-40)`) | 003 | Resolvido: `INICIO` + `passado()` |
| C-2 (rotina no meio do bloco B) | 003 | Resolvido: rotina do passo 11; RN-007 no fim do bloco B |
| C-3 (C-009 depois do envio da Atlas) | 003 | Resolvido por ordem declarada (C-009 antes de C-004 e C-003); ver A-O2 |
| C-4 (formato da carga) | 003 | Resolvido: tabela "processo interpretado" |
| C-5 (dossiê acima de 6 ao abrir) | 003 | Resolvido: abrir = 2; sugestões por botão = 4 |
| C-6 (segundo processo ativo) | 003 | Resolvido: passo (0) e `NOT EXISTS` de qualquer origem; RN-007 |
| C-7 (gancho recusa o supervisor que envia) | 003 | Resolvido: regra (4) antes de (5); RN-004 com `nasDuasSessoes` e `jur.envioNivelMin` 2 |
| C-8 (vínculo na carga) | 003 | Resolvido: `candidatos[]`, qualquer `clienteId` existente; C-023 |
| C-9 (processo em `citacao` sem autos) | 003 | Resolvido: recusa em `ccJurProcessoCriar`; RN-009 |
| C-10 (seeds carregados) | 003 | Resolvido: elenco + 003 |
| C-1 (Rita não vê 7001) | 007 | **Mal resolvido** → A-C1 |
| C-2 (ordem `CONTATO`/`NOTA`/`PROMESSA`) | 007 | Resolvido: RN-001 afirma a ordem por `ORIGEM` |
| C-3 (C-011 com 4 gravações) | 007 | Resolvido: 4 linhas na spec (RF-023), plan e T-110 |
| C-4 (NF cancelada) | 007 | Resolvido: `CANCELADA = FALSE` nas 7 origens; teste "Órgão público" |
| B-1 (`ccCobCasoSincronizar` com sessão) | 000 → 002 | Resolvido (DT-34): duas origens; mas ver A-C2 |
| B-2 (SQL com `EU` aninhada no dossiê) | 000 → 003 | Resolvido: `ccJurDossieSugestao` lê as tabelas da 005 |
| C-4 (`membroId` nas JS aninhadas) | 000 → 001, 002, 003 | Resolvido: `ccBaseTitulosAbertos`, `ccBaseModeloPrever`, `ccCobEncargosCalcular`, `ccCobContatoRegistrar` declaram; a 003 passa sempre |
| C-5 (formato dos seeds) | 000 → 001, 002, 003 | Resolvido |
| C-6 (analista no elenco) | 000 → 001 | Resolvido |
| C-7 (Rita na 007) | 000 → 007 | **Mal resolvido** → A-C1 |
| O-2 (T-200 da 003) | 000 → 003 | Resolvido: lista entregue ao integrador |
| O-5 (seed da 005 em outro relógio) | 000 → 007 | Resolvido: datas por `dia(n)` do `RELOGIO` da 007 |
| 01-correcoes §001 itens 1–12; §5 itens 1, 2, 5 | 001 | Aplicados |
| 01-correcoes §002 itens 1–14; §5 itens 1, 2, 7a, 7b | 002 | Aplicados; o item 1 abre o furo A-C2 |
| 01-correcoes §003 itens 1–9; §5 itens 4, 7b | 003 | Aplicados |
| 01-correcoes §007 itens 2–4 | 007 | Aplicados |
| 01-correcoes §007 item 1 | 007 | Aplicado ao pé da letra, não fecha → A-C1 |

## BLOQUEIA

Nenhum.

## CORRIGIR

| Id | Onde | Achado |
|---|---|---|
| A-C1 | 007 plan §Simulador passo 4, spec "Dados de referência" (Alfa), T-022; origem em 01-correcoes §007 item 1 × 004 plan, guarda de `ccEscCredSolicitacaoInserir` ("`analistaId` = o próprio, ou outro só com nível ≥ 2") | Ana (Agente, nível 1) abre a solicitação de 7001 com `analistaId` = Rita, e a guarda da 004 recusa. Sem solicitação, Rita continua sem ver 7001 e o pedido dela também falha: C-001 (`SOLICITACAO` 1, `PEDIDO` 1), C-006 (etapa de crédito), RN-002 e RN-016 da 007 continuam quebrados. Correção: Sérgio abre com `analistaId` = Rita, ou Ana abre sem analista e Sérgio atribui por `ccCredSolicitacaoAtribuir` antes de `comite`; corrigir também o item 1 de 01-correcoes. |
| A-C2 | 002 plan §Escritas `ccCobCasoSincronizar` e `sincronizarCaso()` passo 0; 04 §2 `ccCobCasoSincronizar` | O caminho "pessoa" (novo, DT-34) não limita carteira nem fase. A SF está no perfil (só `ccRotina` e os passos ficam fora). Um agente que a chama direto com qualquer `faseChave` grava `FASE_DEVIDA` e move o próprio card na `PRIVADA` ou na `ESTETICA`, e o gancho aceita, porque a `FASE_DEVIDA` acabou de ser gravada. Isso contorna "A régua move" (DT-35). Com `SIM_SESSAO_ANINHADA=0`, o `kbCardMover` aninhado nem consulta o gancho, e o card vai a `acordo`, `juridico` ou fase final com o caso aberto (de `juridico` a rotina não o tira). A `capaJson` também é livre. Correção, na JS e na guarda de `ccEscCobCasoCapa`: pessoa só na `PUBLICA`, com o card atual e a `faseChave` em fase da régua do quadro (nunca `juridico` nem final). Teste de recusa no C-027. |
| A-C3 | 002 plan Testes RN-033, Simulador "Relógio"; tasks T-161; spec RN-033 | O teste pede um caso que entrou em `cob_ativa` em 18/11 e outro em 20/11. Nenhum cliente do seed produz isso, e o próprio plan diz que o banco é montado em D (sem `INICIO`), que nenhum teste avança nem volta o relógio e que a rotina só roda em D (06 §1). A data de entrada é o `FASE_DESDE` gravado pela rotina, então os dois casos não têm como nascer, e o 66,7% não tem base. Correção: afirmar 18/11 e 20/11 na função pura do `NO_PRAZO` e, no smoke, só o 2034; ou declarar o cliente e o caminho (`INICIO`/`passado()`) que cria essas entradas. |

## OBSERVAÇÃO

| Id | Onde | Achado |
|---|---|---|
| A-O1 | 002 plan §Simulador "Isolamento" e Testes RN-031, C-017, C-020 | O RN-031 cria um título atrasado novo de 2057 e um caso aberto, e não desfaz isso no fim. C-017 e C-020 pagam 2057 "idempotente" e afirmam regularizado / `LIBERAR`: só passam porque rodam antes no arquivo. Isso contradiz o "nenhum teste depende de outro". Desfazer no fim do RN-031 ou usar outro cliente. |
| A-O2 | 003 plan Testes, "Ordem do smoke" | O isolamento é por ordem declarada (C-009 antes de C-004 e C-003, C-018 antes de C-003, RN-007 no fim do bloco B), não por dados próprios, como pede o LEIA-correcao-v2. Está coerente hoje, mas é frágil. O banco por teste que a 001 criou resolveria (A-O3). |
| A-O3 | 001 plan §Simulador "Pipeline do banco" e Testes; tasks T-009, T-010; 06 §2.3, §3; 01 §14 | `montarBanco({ …, ate })`, `QUADROS_TESTE` e `BANCO_POR_TESTE` são nomes novos dos arquivos do integrador e não estão no contrato. As outras specs não sabem que podem pedir banco por teste. Registrar em 06 §3 / 01 §14. |
| A-O4 | 002 plan §Escritas `ccCobContatoRegistrar`; teste RN-006 | `origem = 'REGUA_PUB'` vale vinda da tela: qualquer pessoa registra contato sem retorno. `emailEnviadoId` não é conferido contra `CC_EMAIL_ENVIADO` do mesmo cliente (o teste usa 99). A guarda deveria exigir o e-mail do mesmo cliente e `REGUA_PUB` só na `PUBLICA`. |
| A-O5 | 003 plan "Internas e guardas" (`JurAcordoInserir`, exceção da carga) e Complexity Tracking | Até a carga ser concluída, um Jurídico que cria processo `CARGA` e chama a interna com `carga = 1` grava acordo `ANDAMENTO` sem alçada nem segregação. A janela é aceitável, mas não está no "Limite conhecido" nem no Complexity Tracking. |
| A-O6 | 001 plan §Simulador (`PUBLISH_ORDER` = `add-001-kanban`, `add-002`, `add-010` … `add-070`) × T-001, plan §Preâmbulo e 01 §14 (`PUBLISH_ORDER` = `add-010` … `add-070`, "duas vezes") | O mesmo nome cobre duas listas diferentes. Dizer qual delas roda duas vezes (o kanban roda depois, à parte). |
