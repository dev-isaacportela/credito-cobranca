# Tasks: Painel consolidado — Crédito e Cobrança

**Plan:** [`plan.md`](plan.md) · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c) · corrigido pela validação v2 (16/11)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`.
>
> `[P]` = paralelizável (arquivos distintos, sem dependência entre si).
> Duas trilhas: **Backend** inteiro primeiro, depois **Frontend**. Toda tarefa de SF
> diz o smoke que a cobre. Assinaturas marcadas "PA-nn" seguem a proposta de
> `docs/contrato/pedidos/006-painel-consolidado.md`, aceita pelo arquiteto
> (`docs/contrato/pedidos/00-respostas.md`, 16/11; assinaturas em 04 §6).

## Backend

### Preparação

- [x] **T-000** — Conferida a resposta do arquiteto aos pedidos PA-01 a PA-25 (todos aceitos; D-06 aplicada no `plan.md`). O resultado do sandbox para S-02, S-06 e S-09 não trava: se vier contra, entra o plano B da seção Sandbox do `plan.md` → `docs/specs/006-painel-consolidado/plan.md`
- [ ] **T-001** — DDL de `CC_FOTO_AGING` e `CC_FECHAMENTO` como em 02 §006 (chaves únicas e índices incluídos) → `backend/schema/006-painel-consolidado.mjs`
- [ ] **T-002** `[P]` — Declarar as 8 chaves da 006 (03 §13) e o `validarConjunto` (`hhiModerado < hhiAlto`; `sincAtrasoMin ≥ base.syncIntervaloMin`) → `backend/lib/parametros/006-painel-consolidado.mjs`
- [ ] **T-003** `[P]` — Funções puras: `mesAnterior`, `mesSeguinte`, `hhi`, `faixaHhi`, `ranking` (participação e acumulado), `geradaEstimada`, `REGIAO_DA_UF` → `backend/lib/painel-consolidado/calculo.mjs` · prova: T-130, T-118
- [ ] **T-004** — Fragmentos SQL: ramo ao vivo (regras de preenchimento da foto, plan "Modelo de dados"), `linhasDoMes(mes)`, `visivelNoPainel('B')`, `filtrosDoPainel('B')`, tabela derivada dos percentuais de PDD por carteira, `temBase(mes)` → `backend/lib/painel-consolidado/base.mjs` · prova: T-101, T-104, T-127
- [ ] **T-005** `[P]` — Seed no formato de 06 §2.3 (DT-38), sem `INICIO` nem `passado()`: `winthor()` com clientes 6001–6010 e notas (ajudante `nota()`); `dominio()` apaga as fotos que a rotina tirou nos passos 8–9, grava as fotos semeadas de setembro e outubro, classifica 6001/6002 no Grupo Alfa, faz a baixa de 6005 pelas SFs da 002 (pula sem a 002) e, no Winthor simulado, cancela a parcela de 6005 e desfaz o pagamento de 6002 (plan "Simulador") → `backend/simulator/seed/006-painel-consolidado.mjs`
- [ ] **T-006** — Cabeçalho do smoke: `export const RELOGIO = '2026-11-14T10:00:00'`, seeds declarados (A: só 006; B: 002–005 + 006) e `pular` quando a 002 não está. Sem `preparar()`: o banco chega pronto do passo 11 do pipeline → `backend/simulator/smoke/006-painel-consolidado.mjs`

### Server Functions (todas em `backend/add-060-painel-consolidado.mjs`)

- [ ] **T-010** — `ccPainelPosicao` (JS-L; PA-01): origem do mês, totais e 6 faixas, por carteira, por BU, fechamento anterior, leitura (`atrasada` no servidor), `fotoPendente` (saída de 04 §6: sem foto nem fechamento manual), metas · smoke: T-101, T-102, T-103, T-104, T-107, T-110, T-127, T-129, T-132
- [ ] **T-011** `[P]` — `ccPainelSerie` (JS-L; PA-02): fotos + mês corrente + fechamento manual + promessas; `GERADA` nula sem base; estimada só na visão consolidada · smoke: T-108, T-110, T-111, T-115, T-116
- [ ] **T-012** `[P]` — `ccPainelRollRate` (SQL-L; PA-03): matriz origem × destino com `FAIXA_PARA` −1 e 6, `BASE_EM` · smoke: T-112
- [ ] **T-013** `[P]` — `ccPainelSerieCredito` (SQL-L; PA-04): abertas por criação, decididas por decisão (`PRE_APROVADA` = decidida e aprovada, 04 §6), concedido, tempo médio, no prazo · smoke: T-115
- [ ] **T-014** `[P]` — `ccPainelCredito` (JS-L; PA-05): exposição e limite, por carteira (decisões com `PRE_APROVADA` entre as aprovadas, em análise, fora do prazo, pedidos retidos, críticos), por rating, por BU, PMR e prazo médio, vencendo · smoke: T-115, T-119, T-120, T-126
- [ ] **T-015** `[P]` — `ccPainelConcentracao` (JS-L; PA-06): base `VENCIDO` (mês) e `LIMITE` (hoje); por cliente, grupo, região, BU; 10 maiores; acima do teto · smoke: T-118, T-125
- [ ] **T-016** `[P]` — `ccPainelAgentes` (SQL-L; PA-07): carteira, vencido, > 90, cobrado, recuperado, clientes cobrados, contatos, promessas, ações no prazo por agente · smoke: T-117, T-121
- [ ] **T-017** `[P]` — `ccPainelPlanos` (SQL-L; PA-08): por plano, com `FAT_M0…FAT_M5` · smoke: T-122
- [ ] **T-018** `[P]` — `ccPainelSaude` (JS-L; PA-09): três níveis lidos de `CC_RISCO_CLIENTE`, saldo, 4 maiores, índice e faixa · smoke: T-113
- [ ] **T-019** `[P]` — `ccPainelEquipe` (SQL-L, N2 = `NIVEL_MIN(2)`, aceita a marca `ADMIN`; PA-10): árvore por `CAMINHO`, cada linha somando a subárvore · smoke: T-124
- [ ] **T-020** — `ccPainelAtencao` (JS-L; PA-11): 4 leituras próprias e só os 12 tipos delas; não chama nenhuma SF (os 7 tipos dos resumos vêm da tela, T-042 e T-050; DT-34); só quantidade > 0 · smoke: T-106, T-114, T-123, T-132
- [ ] **T-021** `[P]` — `ccPainelFechamentoListar` e `ccPainelFechamentoTotal` (SQL-L, ADM = `PODE_ADMINISTRAR`; PA-12) · smoke: T-108, T-109
- [ ] **T-022** `[P]` — `ccEscPainelFechamentoInserir` e `ccEscPainelFechamentoAtualizar` (INT): `ATOR` + `PODE_ADMINISTRAR` + RN-016 inteira na `GUARDA` (mês encerrado por `AGORA_SQL`) · smoke: T-109
- [ ] **T-023** — `ccPainelFechamentoSalvar` (JS-E): validação com mensagem, escrita guardada, `auditar('Fechamento', …)` · smoke: T-108, T-109
- [ ] **T-024** — `ccPainelRotina` (SIS, passo `FOTO`; PA-13, PA-20): `INSERT IGNORE … SELECT` do ramo ao vivo com `mes = M`, uma vez por mês; marca a própria linha nos dois ramos; devolve o contrato de passo · smoke: T-105, T-106
- [ ] **T-025** — `CHECK_INPUT` de todas as SFs (plan "Simulador") e `npm run sim:check` limpo no dialeto de 06 §5 → `backend/add-060-painel-consolidado.mjs`
- [ ] **T-026** — Entregar ao integrador a lista de PA-24 (bloco 6000–6999, `PUBLISH_ORDER`, `ccPainelRotina` em `FORA_DO_PERFIL`, rota `/painel`, item de menu) — nenhum arquivo compartilhado é editado aqui

### Testes de backend → `backend/simulator/smoke/006-painel-consolidado.mjs`

Uma task por linha da seção **Testes** do `plan.md`; o `assert` de cada uma é o da linha correspondente. Banco A, salvo indicação.

- [ ] **T-101** `[P]` — `teste('C-001: visão do gerente no mês corrente')`: 94000 / 70000 / 24000 / 12000 / 10270, 8 clientes, 6 em atraso, origem `ATUAL`, leitura 14/11 10:00
- [ ] **T-102** `[P]` — `teste('C-002: cada cargo vê a sua parte')` (A e B): ana, sergio, carlos, silvia, gustavo, diana, nara, bruno em `ccPainelPosicao`; julia, visitante e otavio recusados ou sem linha nas 13 SFs de leitura; ana com 1 linha em `ccPainelAgentes`, sergio com as da equipe; rita (B) só os clientes que analisa, e em `mes '2026-10'` 0 cliente (a foto segue o agente)
- [ ] **T-103** `[P]` — `teste('C-003: filtros de carteira e BU')`: três carteiras somam 94000; Enfermagem 10000/10000; Enfermagem + Estética 0 clientes sem erro; 6004 contado uma vez
- [ ] **T-104** `[P]` — `teste('C-004: mês passado vem da foto')`: outubro 98000 / 28000 / 5720, `FOTO`, tirada 01/11 00:15
- [ ] **T-105** — `teste('C-005: foto tirada na virada do mês')`: 11 linhas, vencido 24000, PDD 10340, baixado 2000; segunda rodada não duplica
- [ ] **T-106** — `teste('C-006: foto não é tirada sem base')`: (a) 01/12 00:02 `FOTO_PENDENTE` e 0 linhas; rotina sem leitura não grava; (b) 01/02/2027 foto de janeiro, 0 linhas de dezembro
- [ ] **T-107** — `teste('C-007: redistribuir não reescreve o passado')`: ana nov 40000, carlos nov 54000; outubro 50000/10000 e 48000/18000; desfaz
- [ ] **T-108** — `teste('C-008: fechamento manual de mês sem foto')`: grava agosto, total 1, a linha da lista com os quatro valores e `TEM_FOTO 0`, auditoria 1, série `MANUAL`; correção do PDD com antes/depois; ≤ 12 execuções
- [ ] **T-109** — `teste('C-009: fechamento manual recusado')`: cinco mensagens; `ccEsc…Inserir` e `ccEsc…Atualizar` direto como sergio não gravam; `ccPainelFechamentoListar`/`Total` como sergio e ana: 0 linha; nara corrige o PDD de agosto (e o teste volta a 5500)
- [ ] **T-110** — `teste('C-010: fechamento manual não vale para recorte')`: agosto com BU e como ana ausente/`SEM`; gustavo sem filtro `MANUAL`
- [ ] **T-111** — `teste('C-011: movimento da inadimplência')`: novembro 28000 / 3000 / 5000 / 2000 / 24000, 1 / 1 / 1; outubro 25000 / 9000 / 6000 / 28000, 3; setembro `GERADA null` e, depois de T-108, 3000 estimada só no consolidado
- [ ] **T-112** `[P]` — `teste('C-012: roll rate de outubro para novembro')`: as 9 células da matriz e `BASE_EM`
- [ ] **T-113** `[P]` — `teste('C-013: saúde da carteira')` (B): por nível = `ccCredSaudeResumo` e conta registro a registro; sem órgão público; ≤ 4 maiores em ordem
- [ ] **T-114** `[P]` — `teste('C-014: pontos de atenção')` (B): casos fixos de 06 §2.5 com quantidade = conta registro a registro; só tipos próprios em `ccPainelAtencao`; `ccPubResumo` direto com `ACIMA_2M ≥ 1`; nenhum item com 0
- [ ] **T-115** `[P]` — `teste('C-015: indicadores executivos')` (A e B): somas que dão 25,53% / 12,77% / 10,93% / 166,67% / 16,13% / 53,32% / 86,79 dias; em B, crédito e promessas de novembro = conta registro a registro
- [ ] **T-116** — `teste('C-016: evolução no ano')`: depois de T-108, meses ago–nov com origens `MANUAL, FOTO, FOTO, ATUAL` e índices 36,67 / 46,30 / 28,57 / 25,53
- [ ] **T-117** — `teste('C-017: conversão por agente')`: carlos 18000 / 5000 / 4; ana 13000 / 0 / 4; depois dos contatos, 2 e 1, promessas 1 e 0
- [ ] **T-118** `[P]` — `teste('C-018: concentração da inadimplência')`: 6006 33,33%, Alfa 7000, regiões, BUs, HHI 2187,5 moderada e 3888,9 alta
- [ ] **T-119** `[P]` — `teste('C-019: crédito por carteira e por BU')` (A e B): saldos por carteira e por BU; em B decisões = conta registro a registro e não mudam com `buId`
- [ ] **T-120** `[P]` — `teste('C-020: exposição por faixa de risco')` (A e B): faixas somam 94000; 6006 fora do grupo privado; em B = conta registro a registro
- [ ] **T-121** `[P]` — `teste('C-021: inadimplência por agente e por BU')`: linhas de carlos, ana, Nutrição e Enfermagem; carlos primeiro
- [ ] **T-122** `[P]` — `teste('C-022: planos de pagamento')`: plano 30 com 4 clientes, 43000 / 7000, 2 em atraso, faturamento jun–nov
- [ ] **T-123** `[P]` — `teste('C-023: resumos no consolidado')` (B): com `buId 1`, `ccPainelAtencao` sem tipos dos resumos e os três resumos chamados direto com linha (`ccCobAgendaResumo` com `ate` traz `PROXIMOS` e `A_VENCER_7DU`, RF-017); funil: colunas de 04 §3/§5 com `mes '2026-11'` e `RECEBIDO_MES` = conta registro a registro
- [ ] **T-124** `[P]` — `teste('C-024: indicadores por nível da equipe')` (A e B): sergio 4 linhas, silvia 2, gustavo 9, nara (marca `ADMIN`) 9, ana nenhuma; somas da subárvore; em B rita soma em sergio
- [ ] **T-125** `[P]` — `teste('C-025: concentração de limites')`: total 186300, 6006 42,94%, Alfa 16,10%, HHI 2518,1 alta, quatro acima do teto
- [ ] **T-126** `[P]` — `teste('C-026: prazo médio de recebimento')`: `pmrDias` e `prazoMedioDias` = conta cliente a cliente
- [ ] **T-127** `[P]` — `teste('RN-001: faixa da linha é a do título mais antigo')`: 6004/4 com 1000 e 3000, faixa 2; faixa 1–30 do total = 4000
- [ ] **T-128** — `teste('RNF-001: orçamento por bloco')`: `execucoes()` das SFs de cada bloco ≤ 6 (o de visão geral = 6: três SFs da 006 + três resumos chamados direto); `ccPainelRotina` ≤ 2
- [ ] **T-129** — `teste('RN-003: PDD por carteira com vigência')`: `pdd.f2 = 20` na Estética → 630 e 10570; outubro continua 5720; desfaz
- [ ] **T-130** `[P]` — `teste('RN-014: faixa do índice de concentração')`: 2187,5 moderada; 1499 pulverizada; 2500 alta
- [ ] **T-131** `[P]` — `teste('Coerência com a 002')` (B): vencido e PDD de `ccPainelPosicao` = `ccCobPainelKpis` / `ccCobPainelAging`
- [ ] **T-132** — `teste('RN-021: leitura atrasada')`: 10:25 falso; 10:35 verdadeiro e `LEITURA_ATRASADA` nos pontos de atenção

Ordem dos que mudam estado (plan "Testes"): T-117 → T-108 → T-109 → T-110 → T-116 → T-111 → T-107 → T-129 → T-132 → T-106a → T-105 → T-106b.

## Frontend

### Regra pura → `frontend/src/lib/painel-consolidado/`

- [x] **T-040** `[P]` — `indice`, `pct`, `rotuloPct`, `naMeta`, `indicadoresExecutivos`, `resumoDaSerie` → `calculo.ts` · prova: T-140, T-141, T-146, T-148
- [x] **T-041** `[P]` — `destinosRollRate` (pagou, melhorou, manteve, piorou e taxa por faixa) → `rollRate.ts` · prova: T-142
- [x] **T-042** `[P]` — `blocosDoCargo`, `estadoDoBloco`, `avisosDeTopo`, `rotuloFonte`, `mesesOferecidos`, `janelaMeses`, `atencaoDosResumos` (os 7 tipos a partir das linhas de `ccCobAgendaResumo`, `ccJurResumo`, `ccPubResumo`; plan "Pontos de atenção dos resumos"), `funilJuridicoPublico` (etapas do funil B) → `visao.ts` · prova: T-143, T-145, T-147, T-149
- [x] **T-043** `[P]` — `somarAcoesNaArvore` (ações atrasadas de `ccCobAgendaResumo` somadas pela árvore) → `equipe.ts` · prova: T-144

### Página → `frontend/src/modules/006-painel-consolidado/`

- [x] **T-044** — Chamadas das SFs por nome, com cache por (bloco, filtros) e `Promise.allSettled`; `ccPainelPosicao` no cache só por filtros (cabeçalho e blocos dividem a resposta) → `dados.ts`
- [x] **T-045** — Rota `/painel`, item de menu, `PainelPage`: `PageHeader`, `Toolbar` com mês / BU / carteira (*debounce* 400 ms), rótulo da fonte, `Tabs` das cinco abas (`?aba=`), organização **B — Abas por assunto** → `index.ts`, `PainelPage.tsx`
- [x] **T-046** `[P]` — `BlocoPreguicoso` (carrega ao ficar visível, esqueleto com a altura final) e `Medidor` (valor × meta em tokens) → `BlocoPreguicoso.tsx`, `Medidor.tsx`

### Blocos (um por tela escolhida; componentes e SFs no plan "Superfície de interação")

- [x] **T-050** `[P]` — `painel-visao-saude` **C**: KPIs, três colunas de saúde com os maiores clientes, selos dos pontos de atenção (`ccPainelAtencao` + `atencaoDosResumos` sobre `ccCobAgendaResumo`, `ccJurResumo`, `ccPubResumo` chamados direto no bloco; 6 execuções), `Dialog` "Ver os N clientes" → `blocos/VisaoSaude.tsx`
- [x] **T-051** `[P]` — `painel-indicadores` **B**: três grupos × quatro indicadores com `Status` e `Medidor` → `blocos/Indicadores.tsx`
- [x] **T-052** `[P]` — `painel-evolucao` **A**: dois gráficos com seletor de indicador, barras dentro/fora da meta (exceção D-07: valor escrito, legenda, linha da meta), par Gráfico/Tabela, três KPIs, mês sem dado como `Dash` e não barra zero (§12.4); fechamento manual recolhido (formulário, lista paginada, mensagens de recusa) → `blocos/Evolucao.tsx`
- [x] **T-053** `[P]` — `painel-aging-pdd` **B**: mapa de calor recorte × faixa (`tomDeIntensidade`, valor em cada célula, visão de tabela) e tabela do PDD por faixa → `blocos/AgingPdd.tsx`
- [x] **T-054** `[P]` — `painel-roll-rate` **B**: barra de 100% por faixa com quatro destinos rotulados e tabela em reais → `blocos/RollRate.tsx`
- [x] **T-055** `[P]` — `painel-movimento` **B**: seis meses lado a lado, gerada × recuperado e vencido final → `blocos/Movimento.tsx`
- [x] **T-056** `[P]` — `painel-concentracao` **A**: quatro recortes em barra ordenada e os 10 maiores; aceita `base` para servir também aos limites → `blocos/Concentracao.tsx`
- [x] **T-057** `[P]` — `painel-agentes` **B**: abas internas (por agente, por BU, conversão, agenda); a aba Agenda chama `ccCobAgendaResumo` com `ate` = 7º dia útil e mostra as colunas do mockup, inclusive "A vencer em 7 dias úteis" (`A_VENCER_7DU`) e "Próximos 7 dias úteis" (`PROXIMOS`) (RF-017) → `blocos/Agentes.tsx`
- [x] **T-058** `[P]` — `painel-planos` **C**: um cartão por plano, com "Ver como tabela" → `blocos/Planos.tsx`
- [x] **T-059** — `painel-credito` **A**: gráficos e quadros por carteira e por BU; **sem mockup (PA-25):** concentração de limites (reusa T-056 com `base = LIMITE`, sem região e BU, com a lista "acima do teto") e rodapé com PMR e prazo médio → `blocos/Credito.tsx`
- [x] **T-060** `[P]` — `painel-juridico-publico` **B**: funil completo do mockup de cada carteira (etapas por valor, quantidade ao lado; desvios de prazo e críticos), por `funilJuridicoPublico` sobre `ccJurResumo` e `ccPubResumo` com o `mes` do filtro; links para os módulos → `blocos/JuridicoPublico.tsx`
- [x] **T-061** `[P]` — `painel-equipe` **A**: tabela em árvore com recuo por nível → `blocos/Equipe.tsx`

### Visões e estados sem mockup

- [x] **T-062** — Visão restrita por cargo (plan "O que cada cargo enxerga"): cabeçalho "a sua carteira" / "a sua equipe"; agente e analista sem bloco de equipe, sem fechamento manual e sem gráficos de comparação entre agentes; supervisor sem fechamento manual; Jurídico sem item de menu e com "sem acesso" na rota → `PainelPage.tsx`, `blocos/Agentes.tsx`, `blocos/Evolucao.tsx` · prova: T-145 (tela) e T-102, T-109, T-124 (servidor)
- [x] **T-063** — Estados: vazio (`EmptyState` "Nenhum cliente no recorte", KPIs com `Dash`), "Sem dado para MM/AAAA", `Alert` de Winthor desatualizado e de foto pendente acima das abas, "módulo não instalado", erro só no bloco, "filtro não se aplica", gráfico não desenhado sem base → `PainelPage.tsx`, `BlocoPreguicoso.tsx` · prova: T-143
- [x] **T-064** — Passar a lista de gráficos de design §12 em todos os blocos: rampa de dados pelo índice do contrato, sem pizza, sem dois eixos Y, par Gráfico/Tabela, legenda a partir de duas séries, eixo de barra em zero; única cor de estado em série = D-07

### Testes de tela → `frontend/tests/006-painel-consolidado.test.mjs`

- [x] **T-140** `[P]` — `test('RN-002: índice de inadimplência')`: `indice(24000, 94000)` → 0,2553; `(0, 0)` → `null`; `rotuloPct(null)` → `'—'`
- [x] **T-141** `[P]` — `test('RN-013: estado da meta')`: os seis casos da spec
- [x] **T-142** `[P]` — `test('C-012: destinos do roll rate')`: matriz de T-112 → pagou / melhorou / manteve / piorou por faixa e taxas 38,46% / 66,67% / 62,50%
- [x] **T-143** `[P]` — `test('C-023: estados do bloco')`: `estadoDoBloco` para id 0 ("módulo não instalado"), recorte vazio, sem dado e erro; `avisosDeTopo` para foto pendente e leitura atrasada
- [x] **T-144** `[P]` — `test('C-024: ações atrasadas pela árvore')`: `somarAcoesNaArvore` soma em sergio as de ana e bruno
- [x] **T-145** `[P]` — `test('RN-015: blocos de cada cargo')`: agente e analista sem equipe nem fechamento; supervisor com equipe e sem fechamento; gerente, diretoria e administrador (agente com a marca `ADMIN`) com tudo; Jurídico sem nada
- [x] **T-146** `[P]` — `test('C-015: doze indicadores')`: `indicadoresExecutivos` com as respostas do banco A → valores e estados da spec; três informativos sem meta
- [x] **T-147** `[P]` — `test('RF-001: meses oferecidos')`: não oferece mês futuro; padrão = mês corrente
- [x] **T-148** `[P]` — `test('C-016: resumo da série')`: média 34,27% e 0 de 4 meses na meta; mês manual e mês parcial rotulados
- [x] **T-149** `[P]` — `test('C-014, C-023: pontos de atenção e funil dos resumos')`: `atencaoDosResumos` com linhas de exemplo dá os 7 tipos com a soma de cada coluna, nada com 0, nada de um resumo `null`; `funilJuridicoPublico` dá as etapas na ordem do mockup com quantidade e valor da coluna certa

## Verificação

- [ ] **T-150** — `cd backend && npm test` verde (`sim:check` + `sim:smoke`), nos bancos A e B
- [ ] **T-151** — `cd frontend && npm test` verde; `npm run build` e `npm run lint` limpos
- [ ] **T-152** — Verificação manual no simulador: C-001 como gustavo (94.000 / 24.000 / 25,53%); C-002 como ana ("a sua carteira", 45.000, sem bloco de equipe) e como sergio; C-003 Enfermagem + Estética (vazio sem erro); C-008 e C-009 pelo formulário
- [ ] **T-153** — RNF-002: massa sintética de 20.000 clientes e 24 fotos; cada SF de leitura ≤ 3 s; se `linhasDoMes` ao vivo estourar, aplicar a saída do risco R-04
- [x] **T-154** — Tema claro (`.theme-light`) sem cor quebrada; mapa de calor e barras de estado legíveis nos dois temas
- [ ] **T-155** — RNF-004: nenhum número de política fixo no código da 006 (metas, PDD, limiares, tolerância); alterar `meta.inadPct` para 30 muda o estado de C-015 sem nova versão
- [ ] **T-156** — RNF-003, depois de publicar: nos dois primeiros meses, comparar a hora da primeira leitura do mês com a hora da foto

## Dependências

```
T-000 concluída (não trava)
T-001 → T-004 → T-010 … T-020, T-024
T-002, T-003, T-005 [P] independentes entre si
T-003 → T-011, T-015
T-022 → T-023 ; T-021 [P]
T-010 … T-024 → T-025 → T-006 → T-101 … T-132
T-050, T-060 chamam ccCobAgendaResumo (002), ccJurResumo (003), ccPubResumo (005) pela tela: ausentes = id 0 → "módulo não instalado"
T-005 (baixa), T-105, T-111, T-112, T-117 dependem das SFs da 002 (pular se ausentes)
T-113, T-114, T-119 (B), T-120 (B), T-123, T-124 (B), T-131 dependem dos seeds de 002–005
Backend inteiro (T-150) → Frontend
T-040 … T-043 [P] → T-140 … T-149
T-044 → T-045 → T-046 → T-050 … T-061 [P] → T-062, T-063, T-064
T-056 → T-059
T-026 (integrador) → T-045 visível no menu
T-151 → T-152 → T-154
```

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001 / C-003, C-004 | T-004, T-010, T-042, T-045 | T-103, T-104, T-147 |
| RF-002 / C-002 | T-004, T-062 | T-102, T-145 |
| RF-003 / C-001, C-004, C-008, C-010 | T-010, T-042 | T-101, T-104, T-108, T-110 |
| RF-004 / C-013 | T-018, T-050 | T-113 |
| RF-005 / C-006, C-014, C-023 | T-020, T-042, T-050 | T-106, T-114, T-123, T-149 |
| RF-006 / C-015 | T-010, T-011, T-013, T-014, T-040, T-051 | T-115, T-146 |
| RF-007 / C-016 | T-011, T-013, T-040, T-052 | T-116, T-141, T-148 |
| RF-008 / C-001, C-003 | T-010, T-053 | T-101, T-103, T-127 |
| RF-009 | T-004, T-010, T-053 | T-101, T-129 |
| RF-010 / C-012 | T-012, T-041, T-054 | T-112, T-142 |
| RF-011 / C-005, C-006 | T-024 | T-105, T-106 |
| RF-012 / C-008, C-009 | T-021, T-022, T-023, T-052 | T-108, T-109 |
| RF-013 / C-011 | T-011, T-055 | T-111 |
| RF-014 / C-022 | T-017, T-058 | T-122 |
| RF-015 / C-021 | T-016, T-057 | T-121 |
| RF-016 / C-021 | T-010, T-057 | T-121 |
| RF-017 / C-023 | T-057 | T-123, T-143 |
| RF-018 / C-017 | T-011, T-016, T-057 | T-117 |
| RF-019 / C-018 | T-003, T-015, T-056 | T-118, T-130 |
| RF-020 / C-019 | T-013, T-014, T-059 | T-115, T-119 |
| RF-021 / C-020 | T-014, T-059 | T-120 |
| RF-022, RF-023 / C-019 | T-014, T-059 | T-119 |
| RF-024, RF-025 / C-023 | T-042, T-060 | T-123, T-143, T-149 |
| RF-026 / C-024 | T-019, T-043, T-061 | T-124, T-144 |
| RF-027 / C-025 | T-015, T-056, T-059 | T-125 |
| RF-028 / C-026 | T-014, T-059 | T-126 |
| C-007 | T-004 | T-107 |
| C-010 | T-010, T-011 | T-110 |
| RNF-001 | T-044, T-046 | T-128 |
| RNF-002 | T-004 | T-153 |
| RNF-003 | T-024 | T-105, T-156 |
| RNF-004 | T-002 | T-129, T-155 |
| RN-001 | T-004 | T-127 |
| RN-002 | T-040 | T-140 |
| RN-003 | T-004 | T-129 |
| RN-004 | T-004, T-010 | T-101, T-104 |
| RN-005 | T-024 | T-105, T-106 |
| RN-006 | T-004 | T-107 |
| RN-007, RN-008, RN-009 | T-003, T-004, T-011 | T-111 |
| RN-010 | T-012, T-041 | T-112, T-142 |
| RN-011 | T-016 | T-117 |
| RN-012 | T-018 | T-113 |
| RN-013 | T-040 | T-141 |
| RN-014 | T-003 | T-130 |
| RN-015 | T-004, T-019, T-062 | T-102, T-124, T-145 |
| RN-016 | T-022, T-023 | T-109 |
| RN-017 | T-004, T-063 | T-103 |
| RN-018 | T-003 | T-118 |
| RN-019 | T-019, T-043 | T-124, T-144 |
| RN-020 | T-013, T-014 | T-115 |
| RN-021 | T-010, T-020, T-063 | T-132, T-143 |
| RN-022 | T-015 | T-125 |
| RN-023 | T-014 | T-126 |
| Estados e visão por cargo sem mockup | T-062, T-063 | T-102, T-143, T-145, T-152 |
| Gráficos (design §12, exceção D-07) | T-052, T-064 | T-154 |
