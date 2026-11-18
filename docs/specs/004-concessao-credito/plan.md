# Plan: Concessão e gestão de crédito (carteiras Privada, Estética e Pública)

**Spec:** [`spec.md`](spec.md) · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c) · corrigido em 2026-11-16 pela validação v2 (`docs/contrato/pedidos/01-correcoes-v2.md`, DT-34 a DT-42)

> O COMO. Nenhum requisito novo nasce aqui — se faltou algo, volta pra spec.
> Tabelas, colunas, parâmetros, assinaturas de SF, fases e travas estão no
> contrato; este plano **aponta** (`02 §004`, `04 §4`, `05 §4`) e escreve só o
> que o contrato não diz: algoritmo, ordem das escritas, casos de borda, como
> testar. `(PA-nn)` = pedido ao arquiteto (`docs/contrato/pedidos/004-concessao-credito.md`),
> já respondido em `docs/contrato/pedidos/00-respostas.md` e incorporado ao contrato.

## Constitution Check

| Princípio | Toca? | Como atende |
|---|---|---|
| I. Spec antes de código | sim | `spec.md` revisada: 43 cenários, 45 RF, 43 RN, zero `[NEEDS CLARIFICATION]`; as pendências do gestor têm padrão (00 §4) |
| II. A política é dado | sim | 86 chaves declaradas em `lib/parametros/004-concessao-credito.mjs` (03 §7, §9–§13), lidas por `parametros(carteira)` / `PARAM()`. SLA, nome e checklist de etapa são dado do quadro (05 §4, §5). Constante no código só para listas de domínio (formas, fontes, garantias, faixas AA–E) |
| III. A regra roda no servidor | sim | Alçada, segregação e estado na guarda das `ccEsc…` (01 §5), relendo o nível exigido na própria SQL; travas de etapa no gancho `ccPodeMover` (04 §8) e na condição de entrada do quadro (05 §4.3); identidade por `quem()` (01 §4) |
| IV. Winthor fonte do financeiro | sim | Limite, utilizado, atraso, pontualidade, compra média e prazo médio vêm de `CC_POSICAO_CLIENTE` (001). Nada é escrito no ERP: `CC_PENDENCIA_WINTHOR` |
| V. Toda escrita é auditada | sim | `auditar()` em toda `JS-E` (áreas `Crédito`, `Pedidos`, `Pendências do Winthor`, `Calibração`); a rotina audita encaminhamento como "Rotina" |
| VI. Testes obrigatórios | sim | Uma linha de teste por linha da seção Testes da spec (mapa abaixo), em `backend/simulator/smoke/004-concessao-credito.mjs` e `frontend/tests/004-concessao-credito.test.mjs` |
| VII. Migrations append-only | sim | DDL em `backend/schema/004-concessao-credito.mjs`, SFs em `backend/add-040-concessao-credito.mjs`; nada roda daqui |
| VIII. Simplicidade | sim | Um motor (função pura), um conjunto de SFs para três carteiras, sem tabela de etapa nem de checklist (são do card), risco gravado uma vez pela rotina e lido por todos os quadros |
| IX. Segurança e credenciais | sim | Nenhuma credencial nova; a 004 não lê o Winthor nem envia e-mail |

## Contexto técnico

- **Frontend:** React 19 · Vite 7 · Tailwind 4 · react-router 7 · `mitra-interactions-sdk` · `@benenutri/mitra-kanban` (quadro e card).
- **Backend:** só os arquivos da costura da 004 (01 §14); nenhum arquivo de outra spec é editado.

| Arquivo | Conteúdo |
|---|---|
| `backend/schema/004-concessao-credito.mjs` | DDL das 8 tabelas de 02 §004 |
| `backend/lib/parametros/004-concessao-credito.mjs` | as 86 chaves + `validarConjunto` |
| `backend/lib/quadros/004-concessao-credito.mjs` | `QUADROS` (`concessao-privada`, `concessao-estetica`, `concessao-publica`, `pedidos-limite`) + `gancho(slug)` |
| `backend/lib/concessao-credito/motor.mjs` | motor puro (RN-011 a RN-021) |
| `backend/lib/concessao-credito/regras.mjs` | puras: tipo de cliente, alçada da concessão e do pedido, excesso, risco do cliente (criticidade, saúde, flexibilização, gatilhos, chance de atraso), destino no vencimento, prazo de decisão, documentos exigidos, leitura do farol |
| `backend/lib/concessao-credito/sql.mjs` | fragmentos SQL: `RATING_EFETIVO`, `NIVEL_CONCESSAO`, guardas das `ccEsc…`, `ABERTA`, `PROPONENTE_ADD(col)` e `NAO_PROPONENTE(col)` (listas de autores, abaixo) |
| `backend/add-040-concessao-credito.mjs` | `definitions` (49 públicas + 17 internas); `semearQuadro(QUADROS)` no `isEntrypoint()` (no simulador, o passo 3 do pipeline de 06 §2.3 chama a mesma função); injeta o texto de `motor.mjs` e `regras.mjs` nas JS que os usam. Publicado nas duas passadas do `PUBLISH_ORDER` e republicado depois do `add-050` (DT-39); o prompt de sandbox da 004 diz isso |
| `backend/simulator/seed/004-concessao-credito.mjs`, `backend/simulator/smoke/004-concessao-credito.mjs` | seed e testes |
| `frontend/src/modules/004-concessao-credito/` | telas, rotas e menu (`index.ts`, formato de 01 §14: `Modulo`, `RotaModulo`, `ItemMenu`); `extensoes.ts` registra `conteudoDaFase`, `abasExtras`, `acoesExtras` dos 4 quadros por `registrarExtensao()` (01 §14; o `App` importa a dona antes da 005) |
| `frontend/src/lib/concessao-credito/*.ts` | regra pura de tela (inclui o espelho `podeMover`) |
| `frontend/tests/004-concessao-credito.test.mjs` | testes de tela |

- **Reuso (001):** `sessao`/`quem`, `escrever`, `ler`, `auditar`, `parametros`, `visivel`, `agora`/`hoje`/`somarMeses`, fragmentos `EU`, `clienteVisivel`, `ATOR`, `PARAM`, `HOJE_SQL`, `FASE_DO_CARD`, `semearQuadro`, `chamarKb`; SFs `ccBaseClienteListar`, `ccBaseClienteFicha`, `ccBasePlanoListar`, `ccBaseContatoListar`, `ccBaseParametroListar`/`Salvar`, `ccEscBaseClienteAnalista`, `ccEscBaseAuditoria`. **Não há modelo de mensagem** (a 004 não envia e-mail; os avisos ao responsável são as automações da lib de 05 §7).
- **Dependência nova:** nenhuma.

## Modelo de dados

Tudo em **02 §004**. O plano acrescenta só:

| Entidade (spec) | Tabela | O que o contrato não diz |
|---|---|---|
| Solicitação | `CC_SOLICITACAO` | "Aberta" = `ENCERRADA_EM IS NULL` e sem `CC_CREDITO` com esse `SOLICITACAO_ID` (fragmento `ABERTA`; PA-14); uma aberta por cliente × carteira. `RATING_MOTOR`, `MOTOR_LIMITE`, `MOTOR_RESULTADO`, `MOTOR_EM` (só carteiras com motor da 004) são regravados por `…Motor` sempre que o cálculo do `Salvar` ou do `gravar = 1` dá resultado diferente da fotografia (o gancho e a guarda da decisão leem a fotografia). `PROPOSTA_POR` (DT-40) = a **lista** de todos os membros que já gravaram `LIMITE_PROPOSTO`, `PARECER_ANALISTA`, a fotografia do motor, o ajuste `PROPOR` ou um campo que entra no motor (as entradas de `CC_SOLICITACAO` do Fluxo 3: score Serasa, faturamento, PL, AC, PC, dívida, EBITDA, garantia, alertas, consultas, abertura do CNPJ, fonte pagadora, valor, tipo de cliente) — acabamento pós-v3, O-2 e O-3 da v3-B; só cresce (ids separados por vírgula, sem repetição). Fragmentos: `PROPONENTE_ADD(col)` = `CASE WHEN FIND_IN_SET({{membroId}}, col) > 0 THEN col WHEN col = '' THEN '{{membroId}}' ELSE CONCAT(col, ',', {{membroId}}) END`; `NAO_PROPONENTE(col)` = `FIND_IN_SET({{membroId}}, col) = 0` (plano B da S-05: `CONCAT(',', col, ',') NOT LIKE CONCAT('%,', {{membroId}}, ',%')`). `RECOMENDADO_POR` do pedido e `CC_ANALISE_ORGAO.PROPOSTA_POR` (005) são listas iguais. O recálculo igual à fotografia não regrava nada, e quem só corrige dado que não entra no motor (RCA, observação, contato) não vira proponente. Na `PUBLICA` a fotografia é `CC_ANALISE_ORGAO.RATING_PUB`/`EXPOSICAO` (DT-36), gravada pela 005; a 004 não grava `RATING_MOTOR`/`MOTOR_*` do órgão. `PRAZO_DECISAO` = data de `CRIADO_EM` + ⌈Σ `KB_FASE.SLA_HORAS` das fases comuns do quadro até `comite`, inclusive ÷ 24⌉ dias |
| Decisão | `CC_DECISAO` | Renovação grava `ENTIDADE = 'SOLICITACAO'` (a do card do crédito) com `RESULTADO` `RENOVADA`/`OBSOLETO`. `CARGO_ALCADA` vazio na entrada = o rótulo da faixa. `VALOR_ALCADA` = maior entre proposto e aprovado (PA-03) |
| Crédito | `CC_CREDITO` | Encerrar o anterior **antes** de inserir o novo (a `UQ (VIGENTE_CHAVE)` impede dois vigentes; se a inserção falhar, repetir a ação é idempotente porque o anterior já está `ENCERRADO`). `RATING_CONCESSAO` = `CC_DECISAO.RATING`; na renovação, o `RATING_ATUAL` do dia. Na `PUBLICA`, `RATING_CONCESSAO` vazio e `ANALISE_ORGAO_ID` = a `CC_ANALISE_ORGAO` da solicitação, lida na SQL de `ccEscCredCreditoInserir` (DT-36) |
| Risco do cliente | `CC_RISCO_CLIENTE` | Universo: clientes com solicitação aberta ou crédito vigente em carteira com motor próprio (PA-16). Score e alertas vêm da solicitação do crédito vigente; sem crédito, da solicitação aberta |
| Pedido retido | `CC_PEDIDO_RETIDO` | Carteira do pedido (parâmetros `alcada.ped*`) = a do crédito vigente; sem crédito, `PUBLICA` se `SETOR = 'PUBLICO'`, senão `PRIVADA`. `LIMITE_NA_DATA` = `CC_POSICAO_CLIENTE.LIMITE` (o do Winthor). `RECOMENDADO_POR` = lista de todos os que gravaram a recomendação (DT-40; lista no acabamento pós-v3) |
| Pendência, foto, revisão | `CC_PENDENCIA_WINTHOR`, `CC_CALIBRACAO`, `CC_CALIBRACAO_REVISAO` | — |

Etapa, histórico de passagem, checklist e anexos não têm tabela: são do card (DT-04, DT-21).

### Parâmetros (dona 004 — 03 §7, §9, §10, §11, §12, §13)

`alcada.nivel*` (6), `alcada.conc*` (4, com os valores da `PUBLICA`), `alcada.ped*` (5), `limite.*` (14), `score.*` (5), `farol.*` (29), `cred.*` (11, com `cred.revValidadeDias`), `flex.*` (4), `saude.*` (4), `meta.tempoDecisaoDias`, `meta.slaPct`, `meta.aprovacaoMinPct`, `meta.aprovacaoMaxPct`. Lidas e não semeadas aqui: `crit.*`, `base.comprasJanelaDias`, `base.fichaValidadeDias`, `cob.prob*`.
`validarConjunto`: as validações da coluna "Validação" de 03 (níveis não decrescentes; `concSupervisor ≤ concGerente ≤ concRegional`; `pedSupPct < pedGerPct < pedDirPct`; scores do farol decrescentes, atrasos crescentes, `Fmin ≤ Fmax`; `docF1 < docF2`; `indiceVermelho < indiceVerde`; `riscoBaixoPct ≤ riscoMinimoPct`; `aprovacaoMinPct < aprovacaoMaxPct`).

### Quadros (05 §4, §5, §7)

`QUADROS` semeia exatamente as fases, SLAs, cores, itens de checklist (`<fase>_<n>`), campo `termo_assinado`, capa, etiquetas, condições de entrada (05 §4.3) e as três automações de e-mail de 05 §7. Nenhum campo obrigatório (DT-05). Capa a mais pedida pelas telas escolhidas (PA-08): `limite_sugerido`, `alcada`, `pendencia` em `concessao-*` (05 §4.4) e `uso` em `pedidos-limite` (05 §5).

`gancho(slug)` devolve o trecho SQL de 04 §8 para os três `concessao-*` (um texto só) e para `pedidos-limite`. O que o contrato não diz:
- Ordem do trecho (DT-35): primeiro as cláusulas de domínio dos destinos controlados — em `concessao-*` a fase seguinte a `comite`, `gestao`, `reanalise`, `obsoleto`, `encerrada`, `recusada`; em `pedidos-limite` `liberado` e `recusado` — sem conferir quem move; depois "quem move = caso", só com `PARA.CHAVE` fora desses destinos (movimento livre). A linha "saída de `gestao`, `reanalise` ou fase final: nunca" vale só para destino que não é controlado (a saída de `gestao` para `reanalise` pela SF passa pela cláusula de domínio). Espelho `podeMoverConcessao`/`podeMoverPedido` na mesma ordem.
- "Quem move = caso": `M.ID = S.ANALISTA_ID` ou `M.CAMINHO` é prefixo do caminho do analista (sem a marca `ADMIN`: 04 §0 define "caso" sem ela).
- Carteira com motor próprio: `S.CARTEIRA <> 'PUBLICA'` (PA-16). A linha `comite` da 004 só vale para ela; a da Pública é o trecho da 005.
- "Fase seguinte a `comite`" e "próxima fase comum": menor `CC_FASE.ORDEM` maior que a de `comite`, não final, no mesmo quadro.
- Item do card no gancho (`formalizacao_2`): `JSON_UNQUOTE(JSON_EXTRACT(K.VALORES_JSON, '$.formalizacao_2')) = 'true'` (formato a conferir na lib no B1; S-06).
- Avanço só para a fase imediatamente seguinte, até `comite` (PA-09): linha de 04 §8, "Avance uma etapa por vez.".
- `MOTIVO` de `comite` lista o que falta, com `CONCAT` das partes ausentes.

## Contratos de backend

Assinaturas em **04 §4**. Abaixo, o que cada SF pública atende e o teste de smoke que a cobre (título do `teste()`).

### Leituras

| SF | Atende | Smoke |
|---|---|---|
| `ccCredSolicitacaoListar` / `…Total` | RF-038, RF-039, RN-035; a gêmea devolve `TOTAL, VALOR, APROVADAS, RECUSADAS, ATRASADAS` (PA-19) | C-033, C-038, RN-035, RF-039, C-025 |
| `ccCredEsteiraResumo` | RF-007, RF-039 | RF-039, C-025, RN-002 |
| `ccCredSolicitacaoFicha` | RF-008 a RF-013, RF-031; `pendencias[]` = o que falta para a próxima fase; `credito.risco` = linha de `CC_RISCO_CLIENTE`; `motor.detalhes.docs[]` | C-005, C-035, C-024, RN-012, RNF-004 |
| `ccCredSolicitacaoHistorico` | aba "Histórico de crédito" (lista fixa, PA-20) | C-019, C-039 |
| `ccCredTipoClienteSugerir` | RF-002, RN-001, RN-038 | C-001, C-002, RN-001, C-037 |
| `ccCredMotorCalcular` | RF-015, RF-016, RF-032 (simulador: `entradas`, PA-04) | C-007, C-008, C-009, C-027, C-036, RN-036 |
| `ccCredCreditoListar` / `…Total` | RF-024 (colunas a mais: PA-07) | C-017, C-018, RN-035 |
| `ccCredCreditoResumo` | RF-024 | RF-024 |
| `ccCredRevisaoListar` / `…Total` | RF-042, RN-039 | C-040, RN-039 |
| `ccCredPedidoListar` / `…Total` | RF-028 | C-004, C-025 |
| `ccCredPedidoFicha` | RF-029, RF-031 | C-021, C-024 |
| `ccCredPendenciaListar` / `…Total` | RF-023 | C-016, RN-025 |
| `ccCredAgendaListar` / `…Total` | RF-044, RN-041; `membroId ≠ 0` só para eu ou membro abaixo de mim (`membroVisivel` sobre `EU`, senão 0 linha); toda linha com `clienteVisivel(EU)`; `DECISAO_ALCADA` pelo `NIVEL`, sem a marca, e fora de `ANALISTA_ID`/`PROPOSTA_POR` e, na `PUBLICA`, de `CC_ANALISE_ORGAO.PROPOSTA_POR` (listas, `NAO_PROPONENTE`; 04 §4) | C-042, RN-041, RN-008 (D-06) |
| `ccCredFarolCarteira`, `ccCredFarolClienteListar` / `…Total` | RF-032 | RF-032 |
| `ccCredFarolValidacao` | RF-032, RN-033 | C-028, RN-033 |
| `ccCredCalibracaoRevisaoListar` | RF-033 (`PROXIMA`, aviso de vencida) | C-029 |
| `ccCredSaudeResumo`, `ccCredSaudeListar` / `…Total` | RF-034, RN-029 (por agente e por rating: PA-06) | C-030, RN-029 |
| `ccCredRiscoResumo`, `ccCredRiscoListar` / `…Total` | RF-035, RN-030 (classe: PA-06) | C-026, RN-030 |
| `ccCredCriticidadeListar` / `…Total` | RF-037, RN-032 (valores medidos: PA-07) | C-032, RN-032 |
| `ccCredFlexResumo` | RF-043, RN-040 | C-041, RN-040 |
| `ccCredDesempenho` | RF-036, RN-031 | C-031, RN-031 |

`N2` (`ccCredFarolValidacao`, `ccCredDesempenho`, `ccCredCalibracaoRevisaoListar`, e as escritas `ccCredSolicitacaoAtribuir`, `ccCredReanaliseAbrir`) = `NIVEL_MIN(2)`: aceita a marca `ADMIN`; as duas escritas, que são sobre registro de cliente, também exigem o cliente visível (`clienteVisivelA`, DT-41). Alçada (decisão, renovação, pedido, ajuste de rating) nunca aceita a marca (D-06): o `pode.decidir` da ficha e a guarda leem só `NIVEL`. A alçada não exige o cliente visível (04 §0): quem decide na alçada não precisa ser do caso (DT-35), nas três carteiras (D-05). Na `PUBLICA` isso vale também para a leitura do motor do órgão que a decisão faz: `ccPubMotorCalcular` com `gravar = 0` e o card em `comite` aceita quem tem nível ≥ `alcada.nivelSupervisor` (04 §5, acabamento pós-v3, B-C3 da v3-B); antes, a guarda `caso` dela recusava na Pública o decisor que a Privada aceita.

### Escritas

| SF | Atende | Smoke |
|---|---|---|
| `ccCredSolicitacaoCriar` | RF-001, RF-003, RF-045, RN-038, RN-042 | C-001, C-003, C-034, C-037, C-038 |
| `ccCredSolicitacaoSalvar` | RF-008 a RF-012; grava `PROPOSTA_POR` (DT-40) | C-005, C-006, RN-004, RN-011, RN-007 |
| `ccCredSolicitacaoAtribuir` | RF-038; só com o card antes de `comite` (DT-40), cliente visível (DT-41) | RN-004, RN-035, RN-007 |
| `ccCredSolicitacaoRecusar` | RF-027, RN-006 | C-020, RN-006 |
| `ccCredRatingAjustar`, `ccCredRatingAjusteDecidir` | RF-017, RN-022; o ajuste grava `PROPOSTA_POR` | C-011, RN-022, RN-007, RN-008 (D-06) |
| `ccCredDecisaoRegistrar` | RF-018 a RF-021, RN-007 a RN-010 | C-012, C-013, C-014, C-015, C-035, C-036, RN-006, RN-007, RN-008, RN-008 (D-06), RN-009, RN-010 |
| `ccCredPendenciaAplicar` | RF-022, RF-023, RN-025, RN-043 | C-016, C-039, RN-025, RN-043 |
| `ccCredReanaliseAbrir` | RF-026; cliente visível (DT-41) | RF-026 |
| `ccCredReanaliseConcluir` | RF-026, RN-007 | C-019, RN-007, RN-008 (D-06) |
| `ccCredPedidoCriar` | RF-029, RN-027 | C-004, C-021, RN-027 |
| `ccCredPedidoSalvar` | RF-028; grava `RECOMENDADO_POR`; troca de analista só com o card antes de `alcada` (DT-40) | C-022, RN-007 |
| `ccCredPedidoDecidir` | RF-030, RN-028 (plano e forma: PA-05) | C-022, C-023, RN-007, RN-008 (D-06), RN-028 |
| `ccCredCalibracaoRevisar` | RF-033, RN-034 | C-029 |
| `ccCredRotina` | RF-021, RF-025, RF-033, RN-024, RN-034 | C-017, C-018, C-026, C-039, RN-024, RN-034, RNF-004 |

Travas de etapa (RF-006, RN-004, RN-005) não têm SF da 004: são `ccPodeMover` + condição de entrada, cobertas por C-005, C-006, C-016, C-043, RN-004, RN-005.

### Internas

As 17 de 04 §4, uma instrução cada, com a guarda de 01 §5. O que o contrato não diz:

| Interna | Usada por | Guarda além de `ATOR` |
|---|---|---|
| `ccEscCredSolicitacaoInserir` | Criar | cliente visível; setor ⇔ carteira; sem aberta para cliente × carteira; `analistaId` = o próprio, ou outro só com nível ≥ 2 |
| `ccEscCredSolicitacaoCard` | Criar | linha sem `CARD_ID`; o card é do quadro `concessao-<carteira>` e nenhuma outra solicitação o usa (O-02 da B2; o mesmo no modo `CARD` do pedido, quadro `pedidos-limite`) |
| `ccEscCredSolicitacaoDados`, `…Analise`, `…Motor` | Salvar; Motor (`gravar = 1`) | caso; `DECIDIDA_EM IS NULL`. `…Analise` (limite proposto, parecer) e `…Motor` (fotografia, só quando muda) acrescentam `membroId` a `PROPOSTA_POR` (`PROPONENTE_ADD`) na mesma instrução (DT-40); `…Dados` acrescenta quando algum campo que entra no motor muda: `PROPOSTA_POR = CASE WHEN <coluna do motor> <> <valor recebido> OR … (COALESCE nas que aceitam nulo) THEN PROPONENTE_ADD('PROPOSTA_POR') ELSE PROPOSTA_POR END`, **primeira** atribuição do `SET` (06 §5: lê os valores antigos nos dois bancos). É a própria SQL que decide, então a chamada direta não escapa: o superior que muda CNPJ ou faturamento para tirar a exceção do Comitê de crédito vira proponente, mesmo sem mudar o resultado do motor (O-2) |
| `ccEscCredSolicitacaoAnalista` | Atribuir | `NIVEL_MIN(2)` (nível ≥ 2 ou `ADMIN`), cliente visível (`clienteVisivelA`, DT-41) e card **antes de `comite`** (`FASE_DO_CARD`: fase comum com `ORDEM` menor que a de `comite` no mesmo quadro; DT-40, B-1 a). 0 linha → "A solicitação já está na alçada." |
| `ccEscCredSolicitacaoAjuste` | Ajustar, Decidir ajuste | `acao = 'PROPOR'`: caso; grava `AJUSTE_POR` = `membroId` e o acrescenta a `PROPOSTA_POR` (DT-40); `acao = 'DECIDIR'`: `AJUSTE_SITUACAO = 'PENDENTE'`, caminho do ator é prefixo próprio do caminho de `AJUSTE_POR` (sem a marca); não mexe em `PROPOSTA_POR` |
| `ccEscCredDecisaoInserir` | Decisão, Reanálise concluir, Pedido decidir | três ramos por `entidade`/`resultado`, todos com `A.NIVEL` (nunca a marca, D-06): concessão — `A.NIVEL ≥ NIVEL_CONCESSAO(S, limiteAprovado)`, `membroId` diferente de `S.ANALISTA_ID`, `NAO_PROPONENTE('S.PROPOSTA_POR')` (DT-40, B-1 a/b) e, na `PUBLICA`, `NAO_PROPONENTE('AO.PROPOSTA_POR')` da análise que a SQL já junta (fechamento v2, R-010), card em `comite`, não decidida (ou `PRE_APROVADA`); copia na própria SQL `RATING` (`RATING_EFETIVO`) e `LIMITE_MOTOR` (`S.MOTOR_LIMITE`) ou, na `PUBLICA`, `RATING_PUB` e `LIMITE_MOTOR` = `EXPOSICAO` da `CC_ANALISE_ORGAO` da solicitação (DT-36); renovação — nível pela faixa de `CC_CREDITO.LIMITE` vigente, `CR.ANALISTA_ID <> membroId`, `SITUACAO = 'REANALISE'`; pedido — `A.NIVEL ≥ P.NIVEL_EXIGIDO`, `membroId` fora de `P.ANALISTA_ID`, `P.CRIADO_POR` **e** da lista `P.RECOMENDADO_POR` (`NAO_PROPONENTE`; DT-40, B-1 c), `DECISAO_RESULTADO = ''` |
| `ccEscCredSolicitacaoDecisao` | Decisão | existe a `CC_DECISAO` `decisaoId` desse membro para a solicitação; `RECUSADA` grava também `ENCERRADA_EM` e `MOTIVO_RECUSA` |
| `ccEscCredSolicitacaoEncerrar` | Recusar (antes de `comite`) | caso; não decidida; card **antes de `comite`** (a mesma condição de `…Analista`; B-1 d): em `comite` a recusa é decisão; não grava `DECIDIDA_EM` (PA-15) |
| `ccEscCredCreditoInserir` | Decisão (quadro sem `liberacao`), Pendência aplicar, Reanálise concluir | existe a decisão `APROVADA`/`RENOVADA` de origem sem crédito nascido dela; `INICIO_VALIDADE` = hoje e `FIM_VALIDADE` = hoje + `cred.validadeMeses` calculados na SQL (`SOMAR_MESES`, igual a `somarMeses`; nada de `inicio`/`fim` na entrada — C-02 da B2); `APROVADA`: é a `DECISAO_ID` da solicitação, card **liberável** (`CREDITO_LIBERAVEL`: em `liberacao`, ou em `comite` num quadro sem `liberacao`, D-004) e ator = decisor ou caso; `RENOVADA`: ator = decisor. Na `PUBLICA` grava `ANALISE_ORGAO_ID` lido na SQL e `RATING_CONCESSAO` vazio (DT-36) |
| `ccEscCredCreditoSituacao` | Decisão (Pública), Pendência aplicar, Reanálise abrir/concluir | guarda por transição (C-2), qualquer outra → 0 linha: `GESTAO → REANALISE` com `NIVEL_MIN(2)` e cliente visível (DT-41); `GESTAO`/`REANALISE` → `ENCERRADO` por substituição só se há `CC_DECISAO` `APROVADA` do cliente mais nova que `CR.DECISAO_ID`, sem crédito nascido dela, com o card da solicitação nova liberável e o ator = decisor ou caso dela (o mesmo de `ccEscCredCreditoInserir`; C-01 da B2); `REANALISE → ENCERRADO` na renovação e `REANALISE → OBSOLETO` só com `CC_DECISAO` `RENOVADA`/`OBSOLETO` da solicitação do crédito, mais nova que `CR.DECISAO_ID` e com `RESPONSAVEL_ID = membroId`. A rotina grava as suas transições por `runDmlMitra` (guarda `ROTINA`) |
| `ccEscCredPedidoInserir`, `ccEscCredPedidoAtualizar` | Pedido criar/salvar/decidir | cliente visível; caso. `…Inserir` relê na própria SQL limite, utilizado e atraso de `CC_POSICAO_CLIENTE`, o crédito vigente, o excesso, o % e a alçada de 03 §7 (`ALCADA_PEDIDO`, igual a `alcadaPedido`, na carteira do crédito vigente ou pelo setor): a entrada só traz cliente, número, valor e texto (B-01 da B2); a recomendação acrescenta `membroId` a `RECOMENDADO_POR` (`PROPONENTE_ADD`; DT-40); troca de `ANALISTA_ID` só com o card antes de `alcada` (`retido`, `analise`; 0 linha → "O pedido já está na alçada."; B-1 c); o desfecho (sem caso) só com a `CC_DECISAO` do pedido de `RESPONSAVEL_ID = membroId` |
| `ccEscCredPendenciaInserir`, `ccEscCredPendenciaAplicar` | Decisão, Reanálise, Pedido; Aplicar | Inserir (C-2): a origem no estado que a gera, pelo mesmo ator e sem pendência aberta do mesmo `TIPO`/`ORIGEM_ID` — `APLICAR_LIMITE` ⇐ `CC_DECISAO` `APROVADA` da solicitação com `RESPONSAVEL_ID = membroId`; `BLOQUEAR_LIMITE` ⇐ crédito `OBSOLETO` com a `CC_DECISAO` `OBSOLETO` do mesmo ator; `LIBERAR_PEDIDO` ⇐ pedido `LIBERADO` com a `CC_DECISAO` do mesmo ator (a rotina grava as suas por `runDmlMitra`). `CLIENTE_ID`, `VALOR` e `DESCRICAO` saem da origem na própria SQL (limite aprovado da `DECISAO_ID`, limite do crédito, valor do pedido; texto com `BRL`, igual a `brl()`; C-03 da B2). Aplicar: `APLICADA_EM IS NULL`; caso da origem (`CASO_PW`: analista da solicitação, do crédito ou do pedido, ou quem abriu, ou superior; a JS repete; C-04 da B2) |
| `ccEscCredCalibracaoRevisaoInserir` | Calibração revisar | `PODE_ADMINISTRAR` (nível ≥ 3 ou `ADMIN`; D-06) |

`NIVEL_CONCESSAO(S, limiteAprovado)` relê tudo na SQL: faixa por `PARAM_NUM('alcada.conc*', S.CARTEIRA)` sobre `GREATEST(S.LIMITE_PROPOSTO, limiteAprovado)`; exceção eleva para `alcada.nivelComiteCredito`: com `S.CARTEIRA <> 'PUBLICA'` (`temMotorProprio`), `limiteAprovado > S.MOTOR_LIMITE`, `AJUSTE_SITUACAO = 'APROVADO'`, `MOTOR_RESULTADO` de comitê, CNPJ mais novo que `limite.fraudeMeses`, cliente `NOVO` com `VALOR > limite.fraudePct` % de `FAT_MENSAL`; com `S.CARTEIRA = 'PUBLICA'`, só `limiteAprovado > AO.EXPOSICAO` (`CC_ANALISE_ORGAO` da solicitação; DT-36, C-1). `alcadaConcessao()` de `regras.mjs` tem os mesmos dois ramos (recebe `exposicao` na Pública). O teste de regra pura (`tests/004`, "RN-008 · RN-010 (SQL × função)") cruza o fragmento com a função num banco do simulador nos mesmos casos, inclusive os públicos; idem `ALCADA_PEDIDO` × `alcadaPedido`, `SOMAR_MESES` × `somarMeses` e `BRL` × `brl`.
"Quem propôs" compara a forma canônica do id: `NAO_PROPONENTE`/`PROPONENTE_ADD` usam `CAST(CAST({{membroId}} AS SIGNED) AS CHAR)`, porque `ATOR` aceita `A.ID = {{membroId}}` por igualdade numérica e `'3.0'` passaria (B-02 da B2).
Sem a 005 no `PUBLISH_ORDER` a tabela `CC_ANALISE_ORGAO` não existe: o `add-040` monta os fragmentos e as leituras que a citam sem o ramo público — a guarda da decisão recusa toda decisão na `PUBLICA` e a JS, com `ccPubMotorCalcular` de id 0, recusa com "O motor do órgão não está instalado.". **Dois critérios** (O-10 da B2), coerentes pelo `PUBLISH_ORDER`: a SQL olha o arquivo `add-050-setor-publico.mjs` na publicação; a JS, o id na execução. O ramo público da JS é **da 004** e está no `add-040` (C-05 da B2): decisão chama `ccPubMotorCalcular` sem gravar e confere com a fotografia, exclui `CC_ANALISE_ORGAO.PROPOSTA_POR`, cria o crédito na decisão quando o quadro não tem `liberacao` (D-004), capa `rating`/`limite_sugerido` da análise (também no "Calcular" com `gravar = 1`), `analiseOrgaoId` na ficha e o ramo `DECISAO_ALCADA` da fila sem os autores da análise. A republicação do `add-040` depois do `add-050` (DT-39) liga o ramo da SQL.

## Fluxo — o que o contrato não diz

**1. Abrir (`ccCredSolicitacaoCriar`).** Valida justificativa (sem espaços), `valor > 0`, `prazoMeses > 0`, cliente visível, setor ⇔ carteira (mensagens da C-034). Ordem: inserir → `ccEscBaseClienteAnalista` (se há analista) → `kbCardCriar` (fase `entrada`, responsável = `USER_ID` do analista ou, sem ele, de quem abre; `prazo` = `PRAZO_DECISAO`; capa `valor`, `tipo_cliente`) → gravar `CARD_ID` → auditar. `analistaId = 0` = sem analista (o Supervisor atribui); a tela manda o próprio membro por padrão.
`ccCredTipoClienteSugerir`: RN-001 em uma consulta; `CARTEIRA_SUGERIDA` = `PUBLICA` se o setor é público, senão a carteira com maior soma de `CC_FATURAMENTO_MES` nos 3 últimos meses, o corrente (parcial) incluído (empate ou sem compra = `PRIVADA`; `ponytail:` mês e não dia, aproxima os "últimos 90 dias" da spec; trocar por soma de notas se a diferença pesar).

**2. Salvar (`ccCredSolicitacaoSalvar`).** Grava só o bloco que mudou (`…Analise`, com `PROPOSTA_POR`, ou `…Dados`, com `PROPOSTA_POR` quando muda um campo do motor), recalcula o motor em memória (carteira com motor próprio) e regrava a fotografia (`…Motor`, com `PROPOSTA_POR`) só se o resultado mudou (DT-40); `kbCardAtualizar` só se a capa mudou. `consultasValidas` = as quatro consultas feitas (sócios só para `TIPO_PESSOA = 'J'`) e `CONS_DATA ≥ hoje − limite.consultaValidadeDias`.

**3. Motor (`motor(entradas, p)`, puro).** Entradas e origem: pontualidade, dias de atraso, compra média, prazo médio = `CC_POSICAO_CLIENTE`; score Serasa, faturamento do cliente (informado; PA-02), PL, AC, PC, dívida, EBITDA, garantia, alertas manuais, consultas, abertura do CNPJ, fonte pagadora, valor, tipo de cliente = `CC_SOLICITACAO`; carteira de limites e exposição do grupo = `CC_CREDITO` vigentes das três carteiras, grupo por `CC_CLIENTE.GRUPO_ECONOMICO` (PA-17). Passos na ordem da spec: alertas automáticos (RN-011, RN-013, RN-018) → score comportamental (RN-015) → score final (RN-016) → faixa pelo score, faixa pelo atraso, pior das duas, rebaixamento por alerta (RN-017) → base e limite da política (RN-019) → concentração (RN-020) → resultado (RN-021) → documentos exigidos (RN-012) → avisos da fonte (RN-014) e de prazo acima do máximo da faixa. Saída no formato de 04 §4: `rating`, `limiteSugerido` (o máximo), `resultado`, `score`, `alertas[]` e `detalhes { scoreComp, faixaScore, faixaAtraso, rebaixado, limite { base, minimo, maximo, como }, concentracao { tetoPct, teto, exposicaoGrupo, disponivel, reduzido }, indices, docs[], avisos[], excecao, podeAprovar }`. `podeAprovar` e `motivoNaoAprovar` saem também no nível de cima da saída (04 §4), como no motor do órgão, para a decisão tratar os dois motores igual (005 PA-03): `podeAprovar` = `true` quando há rating efetivo (a exceção sobe a alçada, não proíbe); sem rating, `false` com `motivoNaoAprovar` = o resultado do motor ("Dados insuficientes"). Arredondamento ao milhar: `Math.round(v / 1000) * 1000`; na concentração, para baixo.
`ccCredMotorCalcular`: carteira `PUBLICA` → chama `ccPubMotorCalcular` por id com `membroId` e repassando `gravar` (a 005 grava a fotografia em `CC_ANALISE_ORGAO`; a 004 não grava `CC_SOLICITACAO`, DT-36) e devolve no mesmo formato (`rating` = P1–P4, `limiteSugerido` = exposição, `podeAprovar`, `motivoNaoAprovar`); id 0 → erro "O motor do órgão não está instalado." (PA-22). Com `entradas` (simulação, PA-04): os valores do JSON sobrepõem os lidos; `solicitacaoId = 0` simula sem solicitação; com `entradas` não vazio nunca grava (04 §4).
Documentos atendidos: `KB_CARD.VALORES_JSON` do card + `FIN_*` + `SITUACAO_FICHA` (PA-21).

**4. Decidir (`ccCredDecisaoRegistrar`).** Só com o card em `comite` (`FASE_DO_CARD`). Confere, com mensagem: campos (RN-009), consultas válidas (carteira com motor próprio), segregação ("O analista da solicitação não decide." se `membroId = ANALISTA_ID`; "Quem propôs não decide esta solicitação." se está em `PROPOSTA_POR` ou, na `PUBLICA`, em `CC_ANALISE_ORGAO.PROPOSTA_POR` (listas; lida na mesma consulta da fotografia, sem execução a mais); a guarda SQL repete as duas, DT-40), motor recalculado igual à fotografia (motor da 004: `RATING_MOTOR`/`MOTOR_LIMITE`, se mudou "O motor mudou desde o último cálculo. Recalcule e confira."; na `PUBLICA` chama `ccPubMotorCalcular` direto por id, sem gravar e com `membroId`, não lê `RATING_MOTOR`/`MOTOR_LIMITE` e confere `ratingPub`/`exposicao` com `CC_ANALISE_ORGAO.RATING_PUB`/`EXPOSICAO`, se diferente "O motor mudou desde o último cálculo. Recalcule no bloco do órgão."; DT-36), `podeAprovar` para `APROVADA` (do motor da carteira; se `false`, a mensagem é `motivoNaoAprovar`), `PRE_APROVADA` só na `PUBLICA`, nível da pessoa × alçada (mensagem "A aprovação exige <rótulo>"), justificativa quando há exceção. Escritas, nesta ordem: `ccEscCredDecisaoInserir` (com `MOTOR_JSON`) → `ccEscCredSolicitacaoDecisao` → `APROVADA`: `ccEscCredPendenciaInserir` (`APLICAR_LIMITE`; PA-13) e, se o quadro não tem a fase `liberacao`, encerrar o crédito vigente do cliente e `ccEscCredCreditoInserir` → auditar (`auditarLinhas`: decisão, crédito novo e encerramento do anterior numa execução, RN-043) → `kbCardMover` (próxima fase comum, ou `recusada`) → `kbCardAtualizar` (capa `valor` = aprovado, `rating`, `validade`, `alcada`, `pendencia` e etiquetas do próprio card; PA-01; na `PUBLICA` `rating` e `limite_sugerido` vêm da análise do órgão, DT-36) → nota. `PRE_APROVADA` não move: `kbCardAtualizar` (etiqueta `Pré-aprovada`) e nota.

**5. Aplicar pendência (`ccCredPendenciaAplicar`).** `APLICAR_LIMITE` de solicitação em quadro com `liberacao`: exige o card em `liberacao` (senão "A solicitação ainda não está em Liberação."); encerra o vigente anterior → insere o crédito (`INICIO_VALIDADE` = hoje, `FIM_VALIDADE` = `somarMeses(hoje, cred.validadeMeses)`) → marca aplicada → auditar → `kbCardMover` para `gestao` → `kbCardAtualizar` (capa `validade`, `pendencia` e etiqueta `Aplicar no Winthor` do próprio card; PA-01). Nos demais casos só marca aplicada. O card do crédito substituído vai para `encerrada` na conciliação da rotina.

**6. Reanálise.** `ccCredReanaliseAbrir` (`NIVEL_MIN(2)`: nível ≥ 2 ou a marca `ADMIN`, com o cliente visível, DT-41; crédito em `GESTAO`): `SITUACAO = 'REANALISE'`, move o card. `ccCredReanaliseConcluir`: alçada pela faixa do limite vigente na carteira; `RENOVADA` → decisão → período atual `ENCERRADO` → novo período com o mesmo limite, plano e forma → card volta a `gestao`; `OBSOLETO` → decisão → `SITUACAO = 'OBSOLETO'` → pendência `BLOQUEAR_LIMITE` → card em `obsoleto`. Nos dois, depois do movimento, `kbCardAtualizar` (capa `validade` e etiquetas `Renovação`/`Aplicar no Winthor` do próprio card; PA-01) e nota. Parecer obrigatório.

**7. Pedido.** `ccCredPedidoCriar`: fotografa `LIMITE`, `UTILIZADO`, `DIAS_ATRASO` da posição; excesso ≤ 0 → "O pedido cabe no limite."; número repetido em pedido não decidido → recusa; limite 0 → `EXCESSO_PCT` = 100; alçada pela tabela de 03 §7 (primeira condição que casar). `ccCredPedidoSalvar`: a recomendação grava `RECOMENDADO_POR`; `analistaId ≠ 0` com o card em `alcada` → "O pedido já está na alçada." (DT-40). `ccCredPedidoDecidir`: recusa quem está em `ANALISTA_ID`, `CRIADO_POR` ou `RECOMENDADO_POR` ("Quem lançou, analisou ou recomendou o pedido não o libera."); `LIBERADO` exige condição (lista da RF-030), plano e forma (PA-05) e parecer se `CRITICA` ou se o cliente tem caso de cobrança aberto com `BLOQUEIO_DEVIDO <> ''` (leitura direta de `CC_COBRANCA`; tabela ausente = sem bloqueio); `DENTRO_REGRA` = `UTILIZADO_NA_DATA + VALOR ≤ LIMITE_NA_DATA + FLEX_VALOR` do risco do cliente; `RECUSADO` exige motivo.

**8. Rotina (`ccCredRotina`, passo `CREDITO`; 05 §4.5).** Roda completa na primeira leitura OK do dia; nas demais, só sobre clientes com `CC_POSICAO_CLIENTE.ALTERADO_EM`, `CC_CREDITO.SITUACAO_EM`, `CC_SOLICITACAO.MOTOR_EM` ou `DECIDIDA_EM` posteriores ao `CALCULADO_EM` do risco (`ponytail:` mudança de parâmetro só reflete na passada diária). Ordem dentro do passo, parando quando o orçamento não cobre o próximo item e devolvendo `pendentes`:
1. risco (`runDmlMitra`, lotes de 500): motor com os dados do Winthor do dia → `RATING_ATUAL` (ajuste aprovado mantido enquanto o motor der a faixa de `RATING_MOTOR` da solicitação, RN-022), criticidade (RN-032), saúde (RN-029, só com crédito vigente), flexibilização (RN-026), gatilhos (RN-039; `VALIDADE` com `cred.revValidadeDias`, PA-10), chance de atraso (RN-016 da 002: `100 − PONTUALIDADE_PCT`; sem pontualidade `cob.probSemHistorico`; com vencido, no mínimo `cob.probPisoAtraso`; teto `cob.probTeto`), `DESTINO` previsto, `LIMITE_DIVERGE` (`posição.LIMITE ≠ CC_CREDITO.LIMITE`);
2. encaminhamento, três carteiras (RN-024): dias sem compra = hoje − `ULTIMA_COMPRA` (ou − `INICIO_VALIDADE`); compras no período = `CC_POSICAO_CLIENTE.COMPRAS_QTD` (`ponytail:` janela `base.comprasJanelaDias`, não o período exato da validade); grava situação, motivo e pendência por `runDmlMitra`, audita por `ccEscBaseAuditoria`, depois `kbCardMover` + `kbNotaRegistrar` em nome do analista;
3. foto de calibração (gatilho único de 01 §11), `INSERT … SELECT` protegido pela `UQ (MES, CLIENTE_ID)`;
4. conciliação: solicitação sem card → cria; card em fase diferente da devida pelo estado (crédito substituído → `encerrada`) → move; capa, `prazo` e etiquetas diferentes do devido → atualiza.

**9. Leituras compostas.** `ccCredDesempenho`: definições da RN-031 sobre `PRAZO_DECISAO`, `DECIDIDA_EM`, `DECISAO_RESULTADO` (as mesmas colunas que a 006 lê); tempo por fase = média de `KB_MOVIMENTO` com saída no período, convertido de UTC; devolve `{ kpis, analistas[], fases[], responsaveis[] }` (`responsaveis[]` = as decididas agrupadas por `CC_DECISAO.RESPONSAVEL_ID`, com as mesmas medidas). `ccCredFarolValidacao`: `leituraFarol()` de `regras.mjs` sobre a soma das fotos dos últimos `cred.calibMinMeses` meses por faixa; devolve `mesesDeBase` (PA-18). `ccCredAgendaListar`: `UNION ALL` dos seis tipos da RN-041 (`SOLICITACAO_PRAZO` só com `PRAZO_DECISAO` ≤ hoje: a faixa "Aguardando você" mostra o que vence, não todas as abertas do analista — divergência aceita na B2), cada ramo com a sua condição de pessoa sobre o membro pedido (`membroId = 0` = eu; outro só se `membroVisivel` sobre `EU`, senão 0 linha), toda linha com `clienteVisivel(EU)`; `DECISAO_ALCADA` compara `NIVEL` (sem a marca) e exclui `ANALISTA_ID` e quem está em `PROPOSTA_POR` e, na `PUBLICA`, em `CC_ANALISE_ORGAO.PROPOSTA_POR` (C-4, D-06, fechamento v2, listas no acabamento pós-v3).

### Orçamento de execuções (01 §10)

| Operação | Conta | Total |
|---|---|---|
| `ccCredSolicitacaoCriar` | JS 1 + inserir 1 + analista do cliente 1 + `kbCardCriar` 6 + card 1 + auditoria 1 | 11 |
| `ccCredDecisaoRegistrar` — aprovada, Privada | JS 1 + decisão 1 + solicitação 1 + pendência 1 + auditoria 1 + mover 5 + capa e etiquetas 3 + nota 2 | 15 |
| idem — aprovada, Pública (cria o crédito) | JS 1 + motor do órgão 1 (`ccPubMotorCalcular`, sem gravar) + decisão 1 + solicitação 1 + pendência 1 + encerrar anterior 0–1 + crédito 1 + auditoria 1 + mover 5 + capa e etiquetas 3 + nota 2 | 17–18 |
| idem — `PRE_APROVADA` (Pública) | JS 1 + motor do órgão 1 + decisão 1 + solicitação 1 + auditoria 1 + etiqueta 3 + nota 2 | 10 |
| `ccCredPendenciaAplicar` — `APLICAR_LIMITE` em `liberacao` | JS 1 + encerrar anterior 0–1 + crédito 1 + aplicada 1 + auditoria 1 + mover 5 + capa e etiquetas 3 | 12–13 |
| `ccCredReanaliseConcluir` | JS 1 + decisão 1 + situação 1 + crédito ou pendência 1 + auditoria 1 + mover 5 + capa e etiquetas 3 + nota 2 | 15 |
| Rotina, por crédito encaminhado | auditoria 1 + mover 5 + nota 2; para `obsoleto` também a etiqueta `Aplicar no Winthor` 3 (05 §4.5 linha 3) | 8 (reanálise) / 11 (obsoleto); a rotina para pelo orçamento do passo |

Teto 20 por clique (01 §10, DT-29; PA-01). **No clique:** domínio, auditoria, movimento, capa (`valor`, `rating`, `validade`, `alcada`, `pendencia`), etiquetas e nota do **próprio** card — o que a pessoa vê no card aberto. **Na rotina** (conciliação do passo `CREDITO`, 05 §4.5 linha 5, até 5 min): só o card do crédito substituído, que vai para `encerrada` (é outro card; somaria mover 5 → 22–23 na decisão da Pública, acima do teto). Na Pública a nota volta ao clique (o plano anterior a tirava para caber em 12); se o S-13 medir as `kb*` acima da referência e a decisão pública passar de 20, a nota sai do clique (a decisão fica na ficha e no histórico), sem exceção ao teto (04 §4, DT-36). O smoke afirma: cada escrita ≤ 20 (as três acima nas carteiras `PRIVADA` e `PUBLICA`), abrir tela ≤ 6, abrir card = 2 (na Pública em `analise`/`comite`, 3 com o bloco do órgão, DT-42), rodada ≤ 150.

## Superfície de interação

Uma tela por processo para as três carteiras: rota `/credito/:carteira/…` (`privada`, `estetica`, `publica`); o seletor de carteira é o da casca (001, `casca` C). Na `PUBLICA` não aparecem Semáforo, Saúde, Clientes sinalizados nem flexibilização (E-4); o conteúdo do órgão entra pelas extensões da 005 (`extensoesDe('concessao-publica')`). Opções de `docs/opcoes-tela/escolhas.md`; mockups em `docs/opcoes-tela/004-concessao-credito/`.

| Tela (id · opção) | SFs ao abrir (≤ 6) | Montagem |
|---|---|---|
| Visão gerencial (`credito-visao-gerencial` · A, abas por pergunta) | `ccCredCreditoResumo`, `ccCredSolicitacaoTotal`, e a da aba aberta | `PageHeader`, `GradeKpi`/`Kpi` (limite concedido, uso, em análise e aprovação, fora do SLA), abas. **Só o que a spec 004 pede:** Carteira = saúde (`ccCredSaudeResumo`); Concessão = funil (`ccCredEsteiraResumo`); Pedidos = mostradores (`ccCredFlexResumo`); Risco = `ccCredRiscoResumo` + `ccCredRiscoListar`. Deferido × negado por BU, concentração (grupo, Top 10, HHI) e carteira por BU do mockup são do painel (006): viram `TextLink` para o painel, escondido se o módulo não está instalado |
| Esteira (`credito-esteira` · B, só em andamento, capa completa) | quadro da lib + `ccCredSolicitacaoTotal` + `ccCredAgendaListar` + `ccCredAgendaTotal` | tela do quadro da lib (`criarKanbanApi`, `atualizarACadaMs = 60000`) com `novoCard` = assistente, `podeMover`, `antesDeMover` (motivo na volta); cabeçalho com os indicadores da RF-039; fases finais atrás de "Mostrar concluídos"; faixa "Aguardando você" no topo (PA-12): os 5 primeiros itens da fila da pessoa (`ccCredAgendaListar` com `limite = 5`; cada linha com cliente, data, `TEXTO` e link para o card) e "Ver todos (N)" com `ccCredAgendaTotal`, que abre a fila inteira num `Dialog` com `Table` + `Pagination`; a fila não entra na agenda da 002; capa completa com `limite_sugerido`, `alcada` e `pendencia` (05 §4.4, PA-08) |
| Nova solicitação (`nova-solicitacao` · B, assistente em três passos) | `ccBaseClienteListar`, `ccCredTipoClienteSugerir`; pedido: `ccBaseClienteFicha` | `Dialog` com passos: tipo e cliente → dados → conferir (onde entra, alçada sugerida); grava com `ccCredSolicitacaoCriar` ou `ccCredPedidoCriar` |
| Card da solicitação (`card-solicitacao` · B, tudo em "Nesta fase") | `kbCardDetalheSql` + `ccCredSolicitacaoFicha` | card da lib; `conteudoDaFase` por chave de fase (05 §4.4), mostrando `pendencias[]` em "Para avançar"; `abasExtras` "Histórico de crédito" e "Posição" + aba só de leitura "Análise completa"; `acoesExtras` conforme `pode` da ficha |
| Motor (`card-motor` · C, dados e resultado lado a lado) | dentro do card, fase `credito` | dois `Panel`: dados da análise (salva ao sair do campo, 400 ms) e resultado do motor; ações Aplicar limite sugerido, Ajustar rating, Recalcular |
| Decisão (`card-decisao` · C, conferir, decidir, aplicar) | dentro do card, fase `comite` (card = 2; na Pública + 1 do bloco do órgão, DT-42) | três passos numerados: conferências (da ficha), formulário da decisão (`ccBasePlanoListar` lido só ao clicar em "Registrar decisão", C-7), o que acontece até o Winthor (texto corrigido: a pendência nasce na aprovação) |
| Gestão de crédito (`credito-gestao` · B, fila do que vence) | 5: `ccCredCreditoResumo`, `ccCredCreditoListar` × 2 (vencidos; vencendo em 15 dias), `ccCredRevisaoListar`, `ccCredPendenciaListar`, cada lista com `limite = 21` e sem `…Total` | `GradeKpi`; um `Panel` por grupo (função pura `grupoDaFila`), com a ação na linha (Antecipar reanálise, Renovar, Encerrar, Marcar como aplicada); "Créditos a revisar" (RF-042). Os grupos "Em reanálise" (contagem `EM_REANALISE` do resumo) e "Limite diverge do Winthor" e o "Em dia" ficam recolhidos e chamam a sua `ccCredCreditoListar` ao abrir. Grupo que volta 21 linhas mostra 20 e "Ver todos", que abre `Table` + `Pagination` (aí entra o `…Total`) (C-6) |
| Pedidos acima do limite (`pedidos-limite` · A, medidor na capa) | quadro `pedidos-limite` + `ccCredPedidoTotal`; card: `kbCardDetalheSql` + `ccCredPedidoFicha` | quadro da lib; **o card do pedido é desta tela** (não há tela à parte): `conteudoDaFase` com o mostrador de limite e flexibilização (SVG, função pura `zonaFlex`), recomendação e formulário de liberação (`ccBasePlanoListar` lido só ao clicar em "Liberar": card = 2, C-7); medidor na capa = campo `uso` (05 §5, PA-08) |
| Saúde das análises (`credito-saude` · A, três alturas) | `ccCredSaudeResumo` (total, por agente, por rating), `ccCredSaudeListar` | `GradeKpi`, `GradeGraficos` com dois `PainelGrafico` (par Gráfico/Tabela), `Table` |
| Desempenho (`credito-desempenho` · A, três alturas) | `ccCredDesempenho` | `GradeKpi` (SLA cumprido, tempo médio de decisão, aprovação, pedidos), `PainelGrafico` por agente e por etapa × SLA, duas `Table`; rótulos do mockup trocados para a RN-031 ("decididas no prazo", não "passagens") |
| Clientes sinalizados (`credito-sinalizados` · C, matriz cliente × sinal) | `ccCredCriticidadeListar` + total | `Toolbar` + `Table` com uma coluna por sinal; estado da célula por função pura `estadoSinal` sobre os valores medidos da saída (PA-07) |
| Semáforo (`semaforo` · A, cinco abas) | `ccBaseParametroListar` (`farol`), `ccCredCalibracaoRevisaoListar`, e a da aba | abas Faixas, Simulador (`ccCredMotorCalcular` com `solicitacaoId = 0` e `entradas`, PA-04), Carteira por faixa, Validação, Clientes por farol; `Alert` de revisão vencida; "Registrar revisão" só para quem administra (`podeAdministrar(m)`: nível ≥ 3 ou `ADMIN`) |

Regra de tela (`frontend/src/lib/concessao-credito/`): `motivoTipoCliente`, `fmtIndice`, `zonaFlex`, `grupoDaFila`, `estadoSinal`, `podeMoverConcessao`/`podeMoverPedido` (espelho do gancho, só para esconder destino impossível), `rotuloFase`. Nenhuma regra de negócio na tela; o período do Desempenho é filtro (`de`, `ate`).

## Simulador

- **Relógio:** o smoke exporta `RELOGIO = '2026-11-14T10:00:00'` (06 §1, padrão D; DT-38); datas do seed por `dia(n)`, relativas a esse `RELOGIO`.
- **Seed** (`seed/004-concessao-credito.mjs`, faixa 4001–4099, 06 §2.3): o `winthor()` grava o Winthor pelos ajudantes (`nota()`); leitura, processamento e atribuição são dos passos 6–8 do pipeline de 06 §2.3 (o seed não roda `ccRotina`; Rita já chega analista de 4001–4010 pela linha do elenco e os agentes e analistas dos baldes de 4011–4099, tabela abaixo, pela `ATRIBUICAO` que o seed exporta, aplicada no mesmo passo 7: 06 §2.3, fechamento v2); o `dominio()` cria o estado da 004 pelas próprias SFs (com `comRelogio(dia(n), …)` para datas passadas) ou direto nas tabelas da 004 quando o estado é histórico (decisões antigas, fotos). Não grava tabela de outra dona.
- **Isolamento (validador C-5):** contagem agregada nunca divide balde. Balde = quem vê × carteira:

| Balde | Clientes | Cenários |
|---|---|---|
| Rita (agente Bruno), Privada | 4001–4010 (situações fixas de 06 §2.5), 4011 Clínica Iota, 4012 Farmácia Kappa, 4013 Clínica Lambda, 4014 Clínica Mi, 4015 Clínica Ni, 4016 Clínica Xi, 4017 Hospital Pi, 4018 K2, 4019 K4; 4070–4099 genéricos para os testes que abrem a própria solicitação (4097, 4098 e 4099 no ramo 13, órgão: 4099 para o RN-007 e, 4097 e 4098 para o RN-008 DT-35 público) | cenários de um caso só: C-001 a C-024, C-026, C-039, C-042, C-043 e as RN de fluxo |
| Rita + Ana, Estética | 4009 Estética Prime, 4064, 4065 | C-033, C-037 (usa a solicitação semeada do 4009, não abre outra), RN-036 |
| Carlos, Estética | 4035–4039 (créditos) | C-040 |
| Carlos, Privada | 4020–4024 (5 créditos, limite 100.000; decisão há mais de 90 dias, renovados) · 4025–4029 e 4066 (decididas nos últimos 90 dias, uma aberta) · 4060–4062 (fotos de 2026-10) · pedidos decididos sobre 4020–4023 | C-030, RF-024, RF-032 · C-031 (como Silvia) · C-028 · C-041 |
| Ana, Privada | 4030–4033 (sinalizados e um sem sinal), 4034 (4 dias em `cadastral` e pedido de 3 h) | C-032, C-025 |
| Carlos, Pública | 4040–4047, órgãos do ramo 13 | RF-039 |
| Ana, Pública | 4048 Secretaria Municipal de Saúde de Catalão, 4049 | C-034, C-035, C-036, RN-024, RN-038 |

- **Ordem:** o banco chega ao smoke depois da rotina do passo 11 do pipeline (`pendentes = 0`; é o estado que C-018 afirma e de que os agregados partem); C-017 e C-026 alteram o Winthor simulado e rodam leitura + processamento de novo, só sobre o cliente do cenário; RN-034 muda o relógio para 01/12 e é o último teste do arquivo.
- Revisão do semáforo em 10/08/2026 (C-029). `limite.concMax` da `ESTETICA` é gravado no próprio teste da RN-036 por `ccBaseParametroSalvar`.
- **`CHECK_INPUT`:** `carteira`, `faseChave`, `analistaId`, `situacao`, `tipoPessoa`, `de`, `ate`, `clienteId`, `solicitacaoId`, `cardId`, `creditoId`, `pedidoId`, `pendenciaId`, `gravar`, `agrupar`, `classe`, `vencendoEmDias`, `vencidos`, `divergeWinthor`, `gatilho`, `tipo`, `membroId`, `rating`, `rebaixado`, `saude`, `criticidade`, `busca`, `limite`, `offset`.
- **Dialeto:** só funções da lista de 06 §5 (`DATEDIFF`, `DATE_ADD`, `GREATEST`, `CONVERT_TZ`, `JSON_UNQUOTE(JSON_EXTRACT())`); sem `UPDATE … JOIN`, sem `WITH RECURSIVE`; divisão com `* 1.0`.

## Testes

Backend: `backend/simulator/smoke/004-concessao-credito.mjs`; toda escrita que mexe em card roda com `SIM_SESSAO_ANINHADA=0` e `=1` (06 §3). Frontend: `frontend/tests/004-concessao-credito.test.mjs`. Regra pura (`motor.mjs`, `regras.mjs`) é exercitada pela função importada — a mesma injetada nas SFs — quando o caso de borda não precisa de banco.

| Cenário / regra | Arquivo | O que o `assert` verifica |
|---|---|---|
| C-001 | smoke | `ccCredTipoClienteSugerir(4011)` → `RECORRENTE`, `TEM_CREDITO_VIGENTE` 1; `ccCredSolicitacaoCriar` ok; ficha com fase `entrada`, `CARD_ID` > 0, `PRAZO_DECISAO` 2026-11-23 |
| C-001, RN-001 (tela) | front | `motivoTipoCliente` → "crédito ativo na carteira", "já tem solicitação registrada", "cadastro obsoleto" |
| C-002 | smoke | 4012 → `INATIVO`; 4016 → `NOVO` |
| C-003 | smoke | justificativa `'   '` → `ok: false`, `/justificativa/i`; `ccCredSolicitacaoTotal` igual ao de antes |
| C-004 | smoke | `ccCredPedidoCriar(4017, 15000)` → `EXCESSO` 5000, `EXCESSO_PCT` 5, `ALCADA_EXIGIDA` "Supervisor", fase `retido` |
| C-005 | smoke | `kbCardMover` para `credito` recusado; `ficha.pendencias` casa `/endereço/i` e `/contato financeiro/i`; fase segue `cadastral` |
| C-006 | smoke | `CONS_DATA` 2026-10-10 → `consultasValidas` false; mover recusado com `/[Cc]onsultas/` |
| C-007, C-008, C-009 | smoke | `ccCredMotorCalcular` nas solicitações semeadas → os números da spec (`detalhes.scoreComp`, `score`, `rating`, `detalhes.limite`, `resultado`), alçada da ficha |
| C-010 | smoke (puro) | `motor()` com `carteiraLimites` 900.000 e `exposicaoGrupo` 80.000 → teto 95.000, disponível 15.000, limite 15.000, `reduzido`; exposição 95.000 → resultado de comitê |
| C-011 | smoke | ajuste sem justificativa `ok: false`; com → `PENDENTE` e mover para `comite` recusado; decidir como Ana `ok: false`; como Sérgio ok → `ratingEfetivo` B, 1 linha em `CC_AUDITORIA`, `ficha.alcada.rotulo` "Comitê de crédito" |
| C-012 | smoke | decisão como Sérgio (analista) → `ok: false`, `/analis/i` |
| C-013 | smoke | Sérgio `/exige Gerente/`; Gustavo ok → fase `formalizacao`, `CC_DECISAO.RATING` = rating efetivo |
| C-014 | smoke | sem plano, forma, parecer → mensagem casa os três |
| C-015 | smoke | Gustavo `/Comitê de crédito/`; Diana sem justificativa `ok: false`; com → ok, `CARGO_ALCADA` "Comitê de crédito", `JUSTIFICATIVA_EXCECAO` gravada |
| C-016 | smoke | após aprovar: 1 pendência `APLICAR_LIMITE` de 29.000; mover para `liberacao` sem `termo_assinado` recusado, com → ok; mover para `gestao` recusado; `ccCredPendenciaAplicar` → `CC_CREDITO` `GESTAO`, `FIM_VALIDADE` 2027-02-14, card em `gestao` |
| C-017 | smoke | 4014 com limite 30.000 no Winthor; rotina → `ccCredCreditoListar({ divergeWinthor: 1 })` traz 4014 |
| C-018 | smoke | rotina → 4005 `REANALISE`; 4018 e 4006 `OBSOLETO` com `/1 compra/` e `/100 dias/` (última compra `dia(-100)`, 06 §2.5); 4019 `GESTAO`; 2 `BLOQUEAR_LIMITE`; cards nas fases |
| C-019 | smoke | concluir como Rita `ok: false`; Sérgio sem parecer `ok: false`; com → período anterior `ENCERRADO`, novo `GESTAO` de 40.000 até 2027-02-14, card em `gestao`, histórico com 2 períodos |
| C-020 | smoke | sem motivo `ok: false`; com → fase `recusada`, `MOTIVO_RECUSA` gravado |
| C-021 | smoke | quatro pedidos → rótulos e `CRITICA`; 4010 (atraso) → "Comitê de crédito"; 5.000 → `/cabe no limite/` |
| C-022 | smoke | Rita `ok: false`; Diana sem parecer `/crítica/i`; completo → fase `liberado`, 1 `LIBERAR_PEDIDO`; recomendação gravada por `ccCredPedidoSalvar` |
| C-023 | smoke | 4013 bloqueado pela régua (rotina com a 002; sem ela `pular('depende de 002')`); Gustavo sem parecer → `/bloqueado/i` |
| C-024 | smoke (puro) + ficha | `flexibilizacao()` → 20.000 / 0 "faixa B" / 0 "títulos vencidos"; `ccCredPedidoFicha.risco.FLEX_VALOR` do 4017 |
| C-024 (tela) | front | `zonaFlex(105000, 100000, 120000)` = `flexivel`; 125.000 = `acima` |
| C-025 | smoke | como Ana: `ccCredEsteiraResumo` `ATRASADAS` 1 em `cadastral`; `ccCredPedidoTotal` (gêmea, 04 §4) → `ATRASADOS` 1 |
| C-026 | smoke | 4015 com atraso 35; rotina → `RATING_ATUAL` D, `SCORE_FINAL` 710; `RATING_CONCESSAO` AA; `ccCredRiscoListar` traz 4015 como `NAO_PREVISTO` |
| C-027 | smoke | simulação (`entradas`, `solicitacaoId = 0`) → A, 24.000; prazo 50 → 40.000 e aviso `/45/`; contagem de `CC_SOLICITACAO` e `MOTOR_EM` inalterados |
| C-028 | smoke | como Silvia: `ccCredFarolValidacao` → as cinco leituras; `mesesDeBase` 1 |
| C-029 | smoke | `PROXIMA` vencida; revisar como Sérgio `ok: false`; como Gustavo ok → 1 linha com `POR_ID` e aviso desligado; como Nara (nível 1 + `ADMIN`) ok (D-06) |
| C-030 | smoke | como Carlos, Privada: `ccCredSaudeResumo` 1 / 3 / 1, `INDICE` 20; `ccCredSaudeListar` com `saude: 'ATENCAO'` 3 linhas e `'RISCO'` 1 |
| C-031 | smoke | como Silvia, `carteira: 'PRIVADA'`, últimos 90 dias: linha do Carlos em `ccCredDesempenho` → `slaPct` 60, `tempoMedio` 12, `aprovacaoPct` 80, `foraDoPrazo` 1 |
| C-032 | smoke | como Ana: 3 linhas; `/3 sinais/`; crítico por atraso; alerta |
| C-033 | smoke | Estética, `situacao: 'ABERTA'`: Rita 2, Ana 1, Sérgio 3, Gustavo 3; `TOTAL` = linhas |
| C-034 | smoke | 4048 em `PUBLICA` → fase `entrada` de `concessao-publica`, `PRAZO_DECISAO` 2026-11-25; as duas trocas → `ok: false`, total inalterado |
| C-035 | smoke | `ficha.alcada` → "Supervisor" e "Diretoria"; `alcadaConcessao()` com os mesmos valores na Privada → "Gerente" e "Comitê regional" |
| C-036 | smoke | `pular('depende de 005')` sem o motor do órgão; com ele: `APROVADA` recusada, `PRE_APROVADA` ok sem mover, depois `APROVADA` → `CC_CREDITO` e card em `gestao`, 1 pendência; `CC_DECISAO.RATING_PUB` e `LIMITE_MOTOR` = os da `CC_ANALISE_ORGAO` (`EXPOSICAO`), `CC_CREDITO.ANALISE_ORGAO_ID` gravado e `RATING_CONCESSAO` vazio; análise alterada direto na tabela depois do cálculo → `/Recalcule no bloco do órgão/`; `PRE_APROVADA` na Privada `ok: false` (roda sempre) |
| C-037 | smoke | `CARTEIRA_SUGERIDA` `ESTETICA`; card no quadro `concessao-estetica`; alçada "Gerente" |
| C-038 | smoke | como visitante: criar e decidir → mensagem de equipe; listar → 0 linhas |
| C-039 | smoke | aplicar → 1 crédito com `VIGENTE_CHAVE` (130.000), o de 100.000 `ENCERRADO`; capa do card novo já com 130.000 e a validade antes da rotina; card antigo em `encerrada` só **depois** da rotina |
| C-040 | smoke | como Carlos, Estética: 4 linhas com os gatilhos; `gatilho: 'USO'` → 1 |
| C-041 | smoke | como Carlos: `PEDIDOS` 4, `FLEXIBILIZADOS` 3, `TAXA_PCT` 75, `DENTRO_REGRA_PCT` 67 |
| C-042 | smoke | fila de Rita: tipos `SOLICITACAO_PRAZO` e `PENDENCIA_WINTHOR` das solicitações do cenário; fila de Sérgio: `AJUSTE_DECIDIR` e `DECISAO_ALCADA`; nenhuma linha cruzada |
| C-043 | smoke | três `kbCardMover` chamados direto pela sessão da pessoa (como a tela faz) recusados com as frases do gancho; fases inalteradas |
| RN-001 | smoke | cliente só com solicitação recusada → `RECORRENTE`, `TEM_CREDITO_VIGENTE` 0 |
| RN-002 | smoke | 72 h em `cadastral` → `ATRASADA` 0; 73 h → 1; `prazoDecisao('2026-11-30', 216)` = 2026-12-09 |
| RN-003 | smoke | campos semeados: 13 em `cadastral` (1º rótulo exato), 2 em `liberacao`, 5 em `analise` da Pública; marcar item como Rita deixa o autor no histórico do card |
| RN-004 | smoke | sem analista → recusa; 600.000 sem `FIN_PL` → `/financeira/`; garantia sem `formalizacao_2` → `/[Gg]arantia/` |
| RN-005 | smoke | `credito` → `cadastral` ok; `formalizacao` → `comite` recusado |
| RN-006 | smoke | recusa em `comite` pelo analista `ok: false`; por Gustavo com parecer → `recusada` e `CC_DECISAO` `RECUSADA`; `ccCredSolicitacaoRecusar` por Carlos (fora do caso) `ok: false` |
| RN-007 | smoke | analista = decisor recusado em decisão, renovação e pedido; `CRIADO_POR` do pedido recusado ao liberar. Desvios do B-1 (DT-40), cada um com solicitação (até 50.000, alçada de Supervisor) ou pedido próprio em cliente genérico 4070–4099, levado à fase pelos ajudantes de `fluxo()` (RN-038) sem mexer no relógio, e cada recusa conferida duas vezes: pela SF pública (`ok: false`) e pela `ccEsc…` chamada direto com a mesma sessão (0 linha, nada gravado): **(a)** Sérgio analista grava limite e parecer; com o card em `comite`, `ccCredSolicitacaoAtribuir` para Ana → `/alçada/` e `ccEscCredSolicitacaoAnalista` direto → 0 linha, `ANALISTA_ID` = Sérgio; noutra, Sérgio grava a proposta, se troca por Ana antes de `comite`, o card chega a `comite` sem Ana regravar → decisão de Sérgio `/propôs/` e `ccEscCredDecisaoInserir` direto → 0 linha; **(b)** Rita analista, Sérgio grava `limiteProposto` por `ccCredSolicitacaoSalvar` → `PROPOSTA_POR` contém Sérgio → decisão de Sérgio `/propôs/`; idem com `ccCredRatingAjustar` por Sérgio; idem com Sérgio mudando o `scoreSerasa`; controle: Sérgio só corrige o RCA (fora do motor) → `PROPOSTA_POR` sem Sérgio e a decisão de Sérgio passa; **(c)** pedido de Rita: Sérgio grava a recomendação por `ccCredPedidoSalvar` → `RECOMENDADO_POR` = Sérgio → `ccCredPedidoDecidir` de Sérgio `ok: false` e `ccEscCredDecisaoInserir` (ramo pedido) direto → 0 linha; com o card em `alcada`, `ccCredPedidoSalvar` com `analistaId` de Ana → `/alçada/` e `ccEscCredPedidoAtualizar` direto → 0 linha; **(d)** card em `comite`: `ccEscCredSolicitacaoEncerrar` direto como Rita → 0 linha, `ENCERRADA_EM` e `DECIDIDA_EM` nulos, card em `comite`; `ccCredSolicitacaoRecusar` → `ok: false`; **(e)** Pública (fechamento v2; sem a 005, `pular('depende de 005')`): 4099 (órgão, ramo 13), Rita analista grava limite e parecer, Sérgio salva a análise do órgão (`ccPubAnaliseSalvar`) e depois Rita a salva de novo (só o saldo do contrato) → `CC_ANALISE_ORGAO.PROPOSTA_POR` com Sérgio e Rita, `ATUALIZADO_POR` = Rita; card em `comite` com limite ≤ exposição → decisão de Sérgio `/propôs/` e `ccEscCredDecisaoInserir` direto → 0 linha; Gustavo clica "Calcular" (`gravar = 1`: `PROPOSTA_POR` da análise sem Gustavo) e decide → aceita; **(f)** dado do motor sem mudar o motor (O-2 da v3-B): Sérgio chama `ccEscCredSolicitacaoDados` direto (sem a JS nem `…Motor`) mudando só `FAT_MENSAL` de uma solicitação `NOVO` de Rita → `PROPOSTA_POR` contém Sérgio → decisão de Sérgio `/propôs/` e `ccEscCredDecisaoInserir` direto → 0 linha; o mesmo pela tela com a data de abertura do CNPJ; **(g)** todos os autores, não só o último (O-3 da v3-B): Sérgio grava o limite proposto e Rita grava o parecer depois → `PROPOSTA_POR` = Rita e Sérgio → decisão de Sérgio `/propôs/`; pedido de Rita: Sérgio recomenda e Rita recomenda depois → `ccCredPedidoDecidir` de Sérgio `ok: false` e `ccEscCredDecisaoInserir` (ramo pedido) direto → 0 linha; **(B-02 da B2)** `membroId` textual: Sérgio grava o limite por `ccEscCredSolicitacaoAnalise` com `membroId = '3.0'` → `PROPOSTA_POR` com o id canônico; `ccEscCredDecisaoInserir` com `3` e com `'3.0'` → 0 linha; a fila de Sérgio sem a decisão |
| RN-008 | smoke (puro + SQL) | `alcadaConcessao()` nos 8 valores da spec; o fragmento `NIVEL_CONCESSAO` devolve o mesmo nível nos mesmos casos; caso público (DT-36, C-1): `EXPOSICAO` 80.000 com aprovado 80.000 → Supervisor e com 80.001 → Comitê de crédito, na função e no fragmento; a mesma solicitação pública com `AJUSTE_SITUACAO`/`MOTOR_RESULTADO`/CNPJ recente forçados na tabela continua na faixa (pula o lado SQL sem a 005). O cruzamento SQL × função roda em `tests/004` ("RN-008 · RN-010 (SQL × função)"), num banco do simulador, inclusive o caso público com `CC_ANALISE_ORGAO` |
| RN-008 (D-06) | smoke | como Nara (nível 1 + `ADMIN`), com dados próprios (cliente genérico, ajudantes de `fluxo()`): `ccCredDecisaoRegistrar` de 30.000 em `comite` → `/exige Supervisor/`; `ccCredReanaliseConcluir` de crédito próprio levado a `reanalise` por `ccCredReanaliseAbrir` como Sérgio → `/exige/`; `ccCredPedidoDecidir` de pedido em `alcada` → `/exige/`; `ccCredRatingAjusteDecidir` de ajuste `PENDENTE` de Rita → `ok: false`; `ccEscCredDecisaoInserir` direto como Nara nos três ramos → 0 linha; `ccCredAgendaListar` como Nara sem linha `DECISAO_ALCADA`; `ccCredSolicitacaoFicha` como Nara com `pode.decidir` falso (e como Sérgio, verdadeiro) |
| RN-008 (DT-35) | smoke | `nasDuasSessoes`: Silvia (Supervisor de outra equipe, não é caso) aprova 30.000 de solicitação própria de Rita em `comite` (uma por situação) → ok e card na fase seguinte nas duas situações de sessão; o gancho não a recusa por "quem move". Pública, mesmo comportamento (D-05; acabamento pós-v3, B-C3; sem a 005, `pular('depende de 005')`): 4097 e 4098 (órgão), Rita analista com a análise do órgão salva por ela, limite 80.000 ≤ exposição, card em `comite` → Silvia aprova nas duas situações de sessão → ok, card na fase seguinte, `CC_DECISAO.RATING_PUB` preenchido; antes da decisão, `ccPubMotorCalcular` como Silvia com `gravar = 0` → ok, com `gravar = 1` → "Solicitação não encontrada." e nada gravado; como Ana (nível 1, fora do caso) com `gravar = 0` → "Solicitação não encontrada." |
| RN-009 | smoke | `RESPONSAVEL_ID` = sessão com `membroId` de outro na entrada; consultas de 31 dias → `ok: false` |
| RN-010 | smoke | aprovado = sugerido → ok pela alçada do valor, sem justificativa; CNPJ de 8 meses → `/Comitê de crédito/` |
| RN-011 a RN-021 | smoke (puro) | `motor()` com as entradas e os resultados de cada linha da spec |
| RN-013 (tela) | front | `fmtIndice(0.8, 2)` = "0,80"; `fmtIndice(3.5, 1, '×')` = "3,5×" |
| RN-012 | smoke | `docsExigidos()` → 7, 9, 4; com `cadastral_1` marcado no card, `ficha.motor.detalhes.docs` tem 1 atendido |
| RN-022 | smoke | após decisão, novo ajuste e rotina: `RATING_CONCESSAO` igual; ajuste C→B com motor C → `RATING_ATUAL` B; motor D → D |
| RN-023 | smoke (puro) | `somarMeses` nos três casos |
| RN-024 | smoke | sem compra, início há 91 dias → `OBSOLETO` `/sem compras/i`; crédito `PUBLICA` vencido com 2 compras → `REANALISE` |
| RN-025 | smoke | `BLOQUEAR_LIMITE` na ida a obsoleto; aplicar grava `APLICADA_POR`; some de abertas; aplicar com card em `formalizacao` → `/Liberação/` |
| RN-026, RN-029, RN-030, RN-032, RN-039 | smoke (puro) | `flexibilizacao`, `saude`, `classeRisco`, `criticidade`, `gatilhos` com as entradas da spec; RN-032: cliente só `PUBLICA` sem linha em `CC_RISCO_CLIENTE` após a rotina |
| RN-027 | smoke (puro) | `excessoPedido` e `alcadaPedido` nos três casos |
| RN-028 | smoke | liberar sem condição `/condição/`; recusar sem motivo `ok: false` |
| RN-031 | smoke | recusa antes de `comite` fora de decididas; `PRE_APROVADA` dentro (decidida e aprovada; é a definição que `ccPainelSerieCredito` e `ccPainelCredito` leem, 04 §6); pedido em 6 h → 6,0; passagem em curso fora do tempo da fase |
| RN-033 | smoke (puro + SF) | `leituraFarol` 1% × 1% "Dentro", 1,1% "Acima"; carteira sem foto → sem leitura |
| RN-034 | smoke | relógio em 2026-12-01, rotina duas vezes → fotos de `2026-11` = créditos vigentes com motor próprio, sem duplicar |
| RN-035 | smoke | Rita com `analistaId` de Ana → 0 linhas; Bruno (agente) vê o crédito do 4011 |
| RN-036 | smoke | `limite.concMax` `ESTETICA` = 15 → `detalhes.concentracao.tetoPct` 15 no 4009 e 10 numa da Privada |
| RN-037 | smoke | auditoria da aprovação (resultado, limite, autor); encaminhamento com `POR_NOME` "Rotina"; `ccPodeExcluir` → `PODE` 0 |
| RN-038 | smoke | `fluxo(carteira)` para as três: abrir → analisar → decidir → gestão → vencer → reanálise → renovar (quem grava a proposta é o analista e quem decide é outro membro, DT-40; os ajudantes de cada etapa servem aos testes de dados próprios da RN-007 e da RN-008); na `PUBLICA`, sem linha de risco, `RATING_CONCESSAO` vazio, trecho da decisão pulado sem a 005 |
| RN-040 | smoke | período sem pedido → `TAXA_PCT` nulo; exposição = teto → dentro |
| RN-041 | smoke | decisão em que a pessoa é analista fora da fila; 60.000 fora da fila do Supervisor; `ccCredAgendaListar` como Ana com `membroId` de Rita → 0 linha; como Sérgio com `membroId` de Rita → a fila de Rita (C-4); `SOLICITACAO_PRAZO` só com prazo de decisão hoje ou antes (C-042 afirma o recorte; divergência aceita na B2) |
| RN-042 | smoke | Otávio (inativo) tratado como sem vínculo |
| RN-043 | smoke | 1 `VIGENTE_CHAVE` por cliente; linha de auditoria do encerramento |
| RF-024, RF-032 | smoke | como Carlos, Privada: `VIGENTES` 5, `LIMITE_TOTAL` 500.000, `EM_REANALISE` 1; `ccCredFarolCarteira` AA 3, B 1, D 1; `ccCredFarolClienteListar({ rating: 'D' })` 1 linha com limite acima do sugerido |
| RF-026 | smoke | `ccCredReanaliseAbrir` como Sérgio ok → `REANALISE`, card em `reanalise`; como Rita `ok: false`; como Silvia (cliente de outra equipe) `ok: false` e `ccEscCredCreditoSituacao` direto → 0 linha (DT-41, C-2) |
| RF-039 | smoke | como Carlos, Pública: em análise 3, `ATRASADAS` 1, `APROVADAS` 3, `RECUSADAS` 1 |
| RF-041 | smoke | 45 movimentos `entrada` ⇄ `cadastral` → 45 linhas em `KB_MOVIMENTO` do card |
| RNF-004 | smoke | `execucoes()`: ficha do card 2, também em `comite` e no card do pedido (planos só no clique, C-7); abrir a Gestão ≤ 6 (5); cada `JS-E` ≤ 20 (`ccCredDecisaoRegistrar`, `ccCredPendenciaAplicar` e `ccCredReanaliseConcluir` medidas em `PRIVADA` e `PUBLICA`); rodada da rotina ≤ 150. Medido pelo contador do simulador (`execucoes()`): abrir card = `kbCardDetalheSql` + ficha = 2; Gestão = as 5 SFs da tela (resumo, vencidos, vencendo em 15 dias, revisão, pendências); rodada = `execucoes(() => rodarCron('ccCredRotina'))`; decisão pública ≤ 20 no C-036 (Pública) |
| espelho | front | `podeMoverConcessao`, `grupoDaFila`, `estadoSinal` com os casos do gancho, da fila e da RN-032 |

- **Seed extra para o smoke:** nenhum além do seed do módulo; os testes de fluxo abrem a própria solicitação nos clientes genéricos.

## Depende do sandbox (01 §15)

| # | Onde pesa na 004 | Plano B (já no contrato) |
|---|---|---|
| S-01, S-14 | toda `JS-E` que chama `kb*`; o gancho é ou não consultado | o código é o mesmo nas duas situações (05 §1 regra 6); o smoke roda as duas |
| S-03 | `ccEsc…` chamadas direto | ficam no perfil, com guarda |
| S-04 | conferir "0 linha" nas guardas | reler a linha |
| S-06 | `GREATEST`, `DATEDIFF`, `JSON_EXTRACT` no gancho, `CONVERT_TZ` nas leituras com `KB_*` | reescrever sem a função; item do card conferido na JS |
| S-09 | `ccCredRotina` chamada por `ccRotina`, `runDmlMitra` em cron | cron próprio do passo |
| S-10 | campo Anexo `termo_assinado` | termo como link |
| S-13 | custo real de `kbCardMover`/`kbCardCriar`/`kbCardAtualizar` (tabela do orçamento) | folga de 2 a 5 até o teto 20; se a decisão pública passar de 20, a nota sai do clique (04 §4, DT-36); capa e etiquetas do próprio card ficam no clique (01 §10, DT-29). Outra escrita acima de 20 = pedido de exceção nomeada ao arquiteto, como `ccJurDossieEnviar` |
| S-12 | indireto: pontualidade, compra média e prazo médio da posição | sem pontualidade o motor usa `score.semHistorico` |

## Respostas do arquiteto

Os 22 pedidos foram aceitos (`docs/contrato/pedidos/00-respostas.md`, 16/11/2026); só a PA-01 com alteração: teto 20, capa e etiquetas do próprio card no clique, só o card do crédito substituído na conciliação. PA-11 virou P-45 e P-46 (00 §4). Os PA-13 a PA-22 ficam como o plano fixou.

## Decisões

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-001 | Motor e regras como funções puras em `lib/concessao-credito/`, injetadas nas SFs e importadas pelo smoke | motor escrito dentro de cada SF | uma implementação, testável sem banco |
| D-002 | A fotografia do motor é regravada no `Salvar` sempre que o cálculo muda (e só então grava `PROPOSTA_POR`, DT-40); decisão recusa se o motor recalculado difere da fotografia | guarda SQL recalculando o motor | a guarda e o gancho são SQL e só leem coluna; a JS garante que a coluna está em dia |
| D-003 | Uma única `ccEscCredDecisaoInserir` com três ramos de guarda | três internas | o contrato fixou 17 internas; os ramos são fragmentos nomeados em `sql.mjs` |
| D-004 | Quadro sem `liberacao` cria o crédito na decisão; com `liberacao`, na aplicação da pendência — decidido pela existência da fase em `CC_FASE` | `if carteira === 'PUBLICA'` | DT-03: a regra só conhece a chave da fase |
| D-005 | Pendência `APLICAR_LIMITE` nasce na decisão | nascer ao entrar em `liberacao` | entrar em `liberacao` é movimento da lib, sem SF de domínio (PA-13) |
| D-006 | Compras no período = `COMPRAS_QTD` da posição | contar notas desde `INICIO_VALIDADE` | a 001 já entrega; `ponytail:` janela de 90 dias × validade de 3 meses |
| D-007 | Agregados testados por balde (quem vê × carteira) num banco só | um banco por cenário | o smoke é um arquivo por módulo; a visibilidade já isola |
| D-008 | Documento exigido conferido pelo item do checklist | tipo de documento no anexo | a lib não tem tipo de anexo (PA-21) |
| D-009 | Rating atual mantém o ajuste aprovado enquanto o motor der a faixa da concessão | ignorar o ajuste | validador C-7: cliente virava "risco não previsto" sem nada mudar |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| R-001 — Custo real das SFs `kb*` (S-13) acima da referência | escritas passam de 20 execuções | contagem no smoke; a mais cara (decisão da Pública, que chama `ccPubMotorCalcular` direto: 17–18) tem folga de 2; o card do crédito substituído já fica na conciliação; plano B da S-13 acima |
| R-002 — Card do crédito substituído até 5 min fora de `encerrada` | o quadro mostra dois cards do cliente em `gestao` por alguns minutos | o card aberto lê a ficha; a conciliação move |
| R-003 — Gancho não é consultado quando a aninhada chega sem sessão | proteção de fase depende só da ordem "domínio antes do quadro" | DT-07; smoke nas duas situações |
| R-004 — `ccEsc…` chamável direto pula validação de conteúdo e auditoria | decisão gravada sem `MOTOR_JSON` coerente | guarda de alçada, segregação e estado na SQL; Complexity Tracking |
| R-005 — Anexo em endereço público (balanço, DRE, termo assinado) | quem tem o link abre | mitigações de 01 §12; P-25 |
| R-006 — Pontualidade, compra média e prazo médio dependem de colunas do Winthor a confirmar | score comportamental sem entrada | motor degrada para `score.semHistorico`; nada quebra |
| R-007 — Rotina com 3.000 créditos na primeira passada | passo não termina numa rodada | domínio por `runDmlMitra` em lotes; quadro limitado pelo orçamento; `pendentes` continua |
| R-008 — Comitê regional com nível 3 | Gerente decide sozinho até R$ 2 milhões | parâmetro `alcada.nivelComiteRegional`; PA-11 leva ao gestor |
| R-009 — 005 ainda não publicada quando a 004 fecha | fluxo de aprovação da Pública sem teste na 004 | `pular('depende de 005')`; coberto em `smoke/900-fluxos.mjs`; o `add-040` é republicado depois do `add-050` (id de `ccPubMotorCalcular` e ramo público dos fragmentos, DT-39) |
| R-010 — Na `PUBLICA` a proposta é a análise do órgão (`CC_ANALISE_ORGAO`, 005), que não grava `PROPOSTA_POR` | o superior que preenche a análise do órgão podia decidir a mesma solicitação | **fechado (fechamento v2, lista no acabamento pós-v3):** os autores da análise ficam em `CC_ANALISE_ORGAO.PROPOSTA_POR` (gravado por `ccPubAnaliseSalvar`; o "Calcular" não mexe) e entraram na lista de autores de 04 §0; a JS e a guarda de `ccEscCredDecisaoInserir` os excluem na mesma leitura da análise (+0 execução); RN-007 (e) |
| R-011 — Limite conhecido do autor da proposta (O-3 da v3-B): até o acabamento pós-v3 valia só o **último** a gravar, e a proposta do superior deixava de bloqueá-lo quando o analista regravava | o superior decidia a proposta que ele mesmo escreveu | **fechado pelas listas** (`PROPOSTA_POR`, `RECOMENDADO_POR`, `CC_ANALISE_ORGAO.PROPOSTA_POR`: todo autor, +0 execução; RN-007 f, g). O que fica, aceito: (1) quem foi analista e saiu antes de `comite` sem gravar nada decide (não propôs); (2) a lista só cresce — o superior que corrige um dado do motor não decide mais aquela solicitação, e a decisão vai a outro do mesmo nível (a alçada não exige ser do caso) ou acima; (3) `V(200)` comporta ~40 autores por solicitação e o caso real tem 2 ou 3 (`ponytail:` sem tratamento de lista cheia; vira tabela de autores se um dia encher) |

## Divergências aceitas na validação B2 (`docs/validacao/B2-004-concessao.md`)

| Divergência do plano | Como ficou | Por quê |
|---|---|---|
| "Aguardando você" (RN-041) | `SOLICITACAO_PRAZO` só com `PRAZO_DECISAO` ≤ hoje | com todas as abertas a faixa enche e deixa de apontar o que vence; C-042 afirma o recorte |
| Rotina recalcula o risco do universo inteiro a cada rodada (o plano previa a passada completa uma vez por dia) | relê crédito vigente e solicitação aberta, grava só o que mudou (`CC_RISCO_CLIENTE`) | mais simples, e a gravação mínima evita escrita; custo de leitura e CPU sem teto de relógio (`orcamentoMs` ignorado, O-06): medir com 3.000 créditos na T-002 (01 §10, RNF-001) |
| Capa `pendencia` não é atualizada pela rotina | só o `Salvar` e a decisão gravam; depois de movimento à mão a capa mostra o que faltava na fase anterior até o próximo Salvar (O-08) | a ficha mostra o certo; conciliar a capa custaria `kbCardAtualizar` por card na rodada. Tirar o campo da capa é a alternativa se incomodar |
| Foto de calibração (RN-034) | só quando o mês fechado ainda não tem foto (idempotente pela `UQ`) | gatilho único (01 §11). Ressalva (O-07): se a rotina rodar pela primeira vez no meio de um mês, grava o estado daquele dia com o rótulo do mês anterior — uma vez só, na implantação |
| Validação do grupo `meta` (03 §13) | a 004 declara `validarConjunto.meta` (`aprovacaoMinPct < aprovacaoMaxPct`), como fez com `alcada` (`fundir` aceita um por grupo) | regra cruzada de `meta.*` da 002 ou da 006 entra no mesmo validador, conferida só com as chaves presentes |
| Rótulo da alçada gravado (`CARGO_ALCADA`) | a SQL grava o rótulo relido (concessão: `ROTULO_CONCESSAO`; renovação: faixa; pedido: `ALCADA_EXIGIDA`); a entrada `cargoAlcada` de 04 §4 é aceita e ignorada (O-15) | o rótulo livre deixava um Supervisor gravar "Comitê de crédito" na nota e na auditoria |

## Complexity Tracking

| Princípio violado | Por que é necessário | Por que a alternativa simples não serve |
|---|---|---|
| III (regra no servidor) — `ccEsc…` chamável direto pula validação de formato e auditoria da JS (01 §5, limites conhecidos) | o perfil business precisa das internas para a JS chamá-las por id | sem transação nem SF fora do perfil (S-03); a guarda de permissão, alçada, segregação e estado fica na SQL |
| V (auditoria) — operação de várias escritas pode parar no meio | uma instrução por SF, sem transação | ordem domínio → quadro, escritas idempotentes pelo estado, conciliação na rotina |
| D-05 — `temMotorProprio(carteira)` é um teste de carteira no código | o motor do órgão tem entradas próprias (exceção E-4) | não há dado de quadro que diga qual motor roda; fica numa constante só |
| III (segregação) — autor da proposta em coluna-lista (`PROPOSTA_POR`, `RECOMENDADO_POR`) em vez de tabela de autores | guardar **todos** os autores (R-011) sem execução a mais: a guarda da decisão lê a própria linha | tabela de autores pediria uma escrita a mais em cada Salvar e uma junção na guarda; com `V(200)` e `FIND_IN_SET` a regra fica numa instrução |

## Notas da validação B5 (17/11/2026)

- **B-01/C-01 (1093 no MySQL):** `ccEscCredCreditoSituacao`, `ccEscCredSolicitacaoCard` e `ccEscCredPedidoAtualizar` leem a própria tabela só por derivada com `DISTINCT` (06 §5). Teste estático em `tests/sql.test.mjs` varre toda definition.
- `ccCredAgendaListar`/`…Total` devolvem `CARTEIRA` (do card; `''` = quadro `pedidos-limite`); `ccCredFlexResumo` aceita `carteira ('')` (a do crédito do pedido; sem crédito, pelo setor) e lê as metas da carteira.
