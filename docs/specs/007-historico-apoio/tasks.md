# Tasks: Histórico do cliente e apoio (fontes, material, regras em vigor)

**Plan:** `plan.md` · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`.
>
> `[P]` = paralelizável (arquivos distintos, sem dependência entre si).
> **Pré-requisito:** backend das specs 001 a 005 construído no simulador (a 007 é a fase B4).
> A construção segue pelos padrões das pendências (spec, §Pendências) e pelos pedidos
> PA-01 a PA-19 de `docs/contrato/pedidos/007-historico-apoio.md`, respondidos e aplicados (`pedidos/00-respostas.md`, 16/11/2026).
> Nada roda contra a plataforma: nenhum `setup-backend.mjs`/`add-*.mjs` executado, nada em `backend/migrations/`.

## Trilha Backend

O backend inteiro vem antes do frontend. Todas as SFs moram em `backend/add-070-historico-apoio.mjs` (por isso as tarefas de SF não são `[P]`).

### Schema, regra pura e carga

- [ ] **T-001** — DDL de `CC_FONTE_LINK` (com `BUSCA` V(900), 02 `CC_FONTE_LINK`) e `CC_MATERIAL` conforme 02 §007 → `backend/schema/007-historico-apoio.mjs`
- [ ] **T-002** `[P]` — `normalizar()` (sem acento, CAIXA ALTA, espaços colapsados) e `linkValido()` → `backend/lib/historico-apoio/texto.mjs`
- [ ] **T-003** `[P]` — `FONTES` (41 em 6 grupos; 21 com revisão; `URL` nula onde o estudo não traz endereço) e `MATERIAIS` (7, sem arquivo) → `backend/lib/historico-apoio/carga-inicial.mjs`
- [ ] **T-004** — `origem()`, tabela derivada `CARDS`, união, ordem (RN-001), permissão de categoria e filtros (plan, bordas 1 a 7), com a categoria Cobrança (5 origens) → `backend/lib/historico-apoio/eventos.mjs`
- [ ] **T-005** — origens de Acordos e baixas (8) → `backend/lib/historico-apoio/eventos.mjs`
- [ ] **T-006** — origens de Crédito (6) → `backend/lib/historico-apoio/eventos.mjs`
- [ ] **T-007** — origens de Jurídico (9) → `backend/lib/historico-apoio/eventos.mjs`
- [ ] **T-008** — origens de Setor público (7, só NF com `CANCELADA = FALSE`), Comunicação (2), Recebimentos (1) e Alteração auditada (1, sem o eco das criações) → `backend/lib/historico-apoio/eventos.mjs`
- [ ] **T-009** `[P]` — consultas do resumo (cliente e posição; crédito e risco; cobrança e Jurídico; contagens) → `backend/lib/historico-apoio/resumo.mjs`
- [ ] **T-010** `[P]` — `NAO_USA` e a junção das três leituras de parâmetros por chave → `backend/lib/historico-apoio/regras.mjs`

### Server Functions (nomes de 04 §7)

- [ ] **T-011** — `ccHistClienteBuscar` e `ccHistClienteBuscarTotal` (SQL) → `backend/add-070-historico-apoio.mjs`
- [ ] **T-012** — `ccHistEventoListar` e `ccHistEventoTotal` (SQL, sobre `EVENTOS_SQL`) → `backend/add-070-historico-apoio.mjs`
- [ ] **T-013** — `ccHistResumo` (JS, recusa "Cliente não encontrado.") → `backend/add-070-historico-apoio.mjs`
- [ ] **T-014** — `ccHistExportar` (JS: resumo, ficha, registros até o teto, `cortado`, 1 linha de auditoria na área `Histórico`) → `backend/add-070-historico-apoio.mjs`
- [ ] **T-015** — `ccEscHistFonteInserir`, `ccEscHistFonteAtualizar` (selo na própria SQL, colunas calculadas antes de `TITULO`/`URL`), `ccEscHistFonteRevisar`, com a guarda `ATOR` + `PODE_ADMINISTRAR` (revisar: cargo `JURIDICO` ou `PODE_ADMINISTRAR`) → `backend/add-070-historico-apoio.mjs`
- [ ] **T-016** — `ccHistFonteListar`, `ccHistFonteTotal` (`TOTAL`, `A_REVISAR`, `GRUPOS`), `ccHistFonteSalvar`, `ccHistFonteRevisar` → `backend/add-070-historico-apoio.mjs`
- [ ] **T-017** — `ccEscHistMaterialInserir`, `ccEscHistMaterialAtualizar` (`EXISTS` do anexo `MATERIAL`) → `backend/add-070-historico-apoio.mjs`
- [ ] **T-018** — `ccHistMaterialListar`, `ccHistMaterialTotal` (`TOTAL`, `PENDENTES`), `ccHistMaterialSalvar` → `backend/add-070-historico-apoio.mjs`
- [ ] **T-019** — `ccHistRegrasVigentes` (3 chamadas a `ccBaseParametroListar`, `aplica`, `quadros[]`, `versao`) → `backend/add-070-historico-apoio.mjs`
- [ ] **T-020** — Carga inicial no `isEntrypoint()` (`INSERT IGNORE` por `GRUPO` + `TITULO`, com `BUSCA`) → `backend/add-070-historico-apoio.mjs`

### Simulador

- [ ] **T-021** `[P]` — Seed: `winthor()` com 7001, 7002 e 7003 (plan §Simulador) e `dominio()` com a carga inicial → `backend/simulator/seed/007-historico-apoio.mjs`
- [ ] **T-022** — Preparação do smoke: seeds declarados (`001-base`, `005-setor-publico`), `export const RELOGIO = '2026-11-19T10:00:00'`, conferência de que o pipeline de 06 §2.3 rodou a leitura, o `atribuir()` do elenco e o processamento (7001–7003 com Ana; falha se vazio — o smoke não atribui) e a história de 7001 e 7003 pelas SFs das donas, um passo por minuto (solicitação aberta pelo Sérgio com `analistaId` = Rita — só nível ≥ 2 indica outro analista, guarda da 004; o pedido depois, pela Rita); `pular('depende de 00N')` para módulo ausente → `backend/simulator/smoke/007-historico-apoio.mjs`
- [ ] **T-023** — Lista das 39 subconsultas exportada para o `sim:check` rodar uma a uma; passar ao integrador: os 14 nomes públicos para o bloco 7000–7999 de `server-functions.ts`, os parâmetros de `CHECK_INPUT` (plan §Simulador) e a inclusão do seed e do smoke nos orquestradores → `backend/lib/historico-apoio/eventos.mjs` (a 007 não edita arquivo compartilhado)
- [ ] **T-024** — Prompt do sandbox para a 007: rodar `add-070-historico-apoio.mjs`, republicar `add-010-base.mjs` e `add-001-kanban.mjs`, depois `add-090-perfil-acesso.mjs` (DT-39, plan §Depende do sandbox); nada executado daqui → entrega ao orquestrador

### Testes de smoke — `backend/simulator/smoke/007-historico-apoio.mjs`

Uma tarefa por linha "S" do mapa de testes do plan; o `assert` é o descrito lá.

- [ ] **T-101** — `teste('C-001: …')`: 3 agendados no topo, contagem por origem, total = soma das contagens, sem auditoria para a agente, 2 execuções
- [ ] **T-102** — `teste('C-002: …')`: filtro "Acordos e baixas" = 5; contagens; resumo igual com e sem filtro
- [ ] **T-103** — `teste('C-003: …')`: Sérgio "ALFA" = 2 (7001, 1008); documento = 1; Ana "ALFA" = só 7001
- [ ] **T-104** — `teste('C-004: …')`: matriz de 5 pessoas × 7001 e 1006; recusa "Cliente não encontrado." no resumo e na emissão, zero linha na lista e no total
- [ ] **T-105** — `teste('C-005: …')`: 7002 com total 0 e resumo com os campos ausentes nulos
- [ ] **T-106** — `teste('C-006: …')`: resumo de 7001 com os valores do plan
- [ ] **T-107** — `teste('C-007: …')`: emissão com "Acordos e baixas" = 5 registros, 1 contato, autora e hora; 1 linha de auditoria `(emissão)`; 2 execuções
- [ ] **T-108** — `teste('C-009: …')`: página de 5 × emissão com todos os registros de "Cobrança"
- [ ] **T-109** — `teste('C-010: …')`: 41 fontes, 6 grupos (6, 3, 9, 5, 12, 6), 21 a revisar
- [ ] **T-110** — `teste('C-011: …')`: incluir, editar uso, reordenar, inativar; 4 linhas de auditoria (`(criação)`, `USO`, `ORDEM`, `ATIVO`), contagens relativas ao início do teste; links e título repetido recusados; 3 execuções por salvar
- [ ] **T-111** — `teste('C-012: …')`: Ana, Rita, Sérgio e Júlia recusados em fonte e material; Gustavo e Diana aceitos; interna chamada direto pela agente não grava
- [ ] **T-112** — `teste('C-013: …')`: Júlia revisa (pendentes − 1, 1 linha de auditoria `REVISAR_JURIDICO`, 3 execuções); mudança de link devolve o selo; agente recusada
- [ ] **T-113** — `teste('C-014: …')`: "POLITICA" = 1, "FLUXO" = 6, "ZZZ" = 0; total acompanha; inativar material (Ana vê o total de antes − 1, Gustavo o de antes)
- [ ] **T-114** — `teste('C-015: …')`: PNG aceito e ligado a um material criado no próprio teste; EXE e 25 MB recusados pelo registro do anexo; item inalterado; anexo de cliente recusado; ciclo ≤ 20 execuções (DT-29)
- [ ] **T-115** — `teste('C-016: …')`: material novo sem arquivo (pendentes + 1); os 7 da carga sem arquivo
- [ ] **T-116** — `teste('C-017: …')`: correção monetária e multa por carteira; vigência futura fora; régua "não se aplica" na Pública; ≤ 6 execuções
- [ ] **T-117** — `teste('C-018: …')`: nenhuma SF da 007 escreve parâmetro; valor próprio com "desde"
- [ ] **T-118** — `teste('C-019: …')`: 7 registros em páginas de 3 → 3, 3, 1, sem repetir
- [ ] **T-119** — `teste('C-020: …')`: fases e SLA dos quadros; nome novo depois de renomear a fase
- [ ] **T-120** — `teste('C-021: …')`: Júlia acha 7003 e não 7001; processo 1, andamentos 2; sem "Alteração auditada"
- [ ] **T-121** — `teste('C-022: …')`: Sérgio vê a alteração da ficha de contatos; Ana não; totais batem
- [ ] **T-122** — `teste('RN-001: …')`: contato antes da promessa no empate, linhas do mesmo instante por `ORIGEM` (a nota do contato fica entre as duas); ordem estável em duas leituras
- [ ] **T-123** — `teste('RN-002: …')`: Diana e Nara abrem tudo; Rita abre 7001; visitante não abre nada (`ok: false` nas JS, zero linha nas SQL)
- [ ] **T-124** — `teste('RN-003: …')`: só leituras no histórico; tabelas das donas com a mesma contagem antes e depois
- [ ] **T-125** — `teste('RN-004: …')`: toda linha de 7001, 7003 e 5002 tem uma das 8 categorias
- [ ] **T-126** — `teste('RN-005: …')`: 7002 com 12 campos e ausentes nulos; 5001 com rating P1
- [ ] **T-127** — `teste('RN-008: …')`: 2 emissões = 2 linhas na área `Histórico`, visíveis ao supervisor
- [ ] **T-128** — `teste('RN-009: …')`: agente só vê ativos; gerente vê inativos; Jurídico não edita; administradora salva
- [ ] **T-129** — `teste('RN-010: …')`: título alterado devolve o selo; uso alterado não
- [ ] **T-130** — `teste('RN-011: …')`: http e https aceitos; sem protocolo e `javascript:` recusados; link vazio aceito
- [ ] **T-131** — `teste('RN-012: …')`: segundo arquivo substitui o primeiro
- [ ] **T-132** — `teste('RN-013: …')`: busca de fonte "LICITACOES" acha "Licitações"; `BUSCA` gravada = `normalizar()`
- [ ] **T-133** — `teste('RN-014: …')`: novo padrão 0,5 vale para Privada e Pública; Estética segue 0,3
- [ ] **T-134** — `teste('RN-015: …')`: e-mail com assunto no título, destinatário e resultado antes do `{+}`, corpo depois
- [ ] **T-135** — `teste('RN-016: …')`: analista sem a categoria; administradora com; emissão da agente sem auditoria
- [ ] **T-136** — `teste('RN-017: …')`: processo encerrado tira o cliente da visão do Jurídico
- [ ] **T-137** — `teste('RN-018: …')`: teto reduzido a 3 → 3 registros, total real, `cortado`
- [ ] **T-138** — `teste('RN-019: …')`: pagamento desfeito no Winthor → 1 recebimento e recuperado nulo (último teste)
- [ ] **T-139** — `teste('Órgão público: …')`: 5002 com 2 passos da régua e o marco de emissão em "Setor público"; NF cancelada no Winthor some depois da leitura (roda antes do RN-019)

### Verificação do backend

- [ ] **T-190** — `cd backend && npm test` verde (`sim:check`, com as 39 subconsultas uma a uma, + smoke da 007); `GET /health` sem `semDefinicao` nem `erros` para as SFs `ccHist…`

## Trilha Frontend

Só depois de T-190. Telas com a opção escolhida em `docs/opcoes-tela/escolhas.md` (plan §Superfície).

- [x] **T-201** `[P]` — `CATEGORIAS` (8, tokens `data-1`…`data-8`), `ABAS`, `totalDaAba()` → `frontend/src/lib/historico-apoio/categorias.ts`
- [x] **T-202** `[P]` — `normalizar()`, `termoDeBusca()`, `formatarTexto()`, `partesDoTexto()` → `frontend/src/lib/historico-apoio/texto.ts`
- [x] **T-203** `[P]` — `agruparPorDia()`, `nomeDoDocumento()`, `cssDaPagina()`, `avisoDeCorte()` → `frontend/src/lib/historico-apoio/documento.ts`
- [x] **T-204** `[P]` — `celula()`, `prazoLegivel()` → `frontend/src/lib/historico-apoio/regras.ts`
- [x] **T-205** — Rotas (`/historico`, `/historico/:clienteId`, `/historico/:clienteId/documento`, `/apoio/fontes`, `/apoio/material`, `/apoio/regras`) e itens de menu: `export const modulo: Modulo` no formato de 01 §14, Histórico do cliente em `OPERACAO`; Fontes e links, Material de apoio e Regras em vigor em `CADASTROS` → `frontend/src/modules/007-historico-apoio/index.ts`
- [x] **T-206** — Histórico do cliente, opção **C** (busca, 4 números, resumo recolhível, abas e pílulas com contagem, grupos por dia, paginação, estado vazio, "Cliente não encontrado") → `frontend/src/modules/007-historico-apoio/HistoricoPage.tsx`, `LinhaDoTempo.tsx`
- [x] **T-207** — Prévia do PDF, opção **A** (folha A4, cópia de impressão por portal, `@media print`, `@page` com rodapé, título do documento, botão único) → `frontend/src/modules/007-historico-apoio/HistoricoDocumentoPage.tsx`, `DocumentoHistorico.tsx`, `impressao.css`
- [x] **T-208** `[P]` — Fontes e links, opção **A** (blocos por grupo, filtros, selo, diálogo, revisar, inativar) → `frontend/src/modules/007-historico-apoio/FontesPage.tsx`
- [x] **T-209** `[P]` — Material de apoio, opção **A** (tabela por grupo, busca, "Arquivo pendente", diálogo com envio de arquivo na ordem do plan) → `frontend/src/modules/007-historico-apoio/MaterialPage.tsx`
- [x] **T-210** `[P]` — Regras em vigor, opção **B** (aba por grupo + "Etapas e prazos", matriz Privada / Estética / Pública, sem campo editável) → `frontend/src/modules/007-historico-apoio/RegrasPage.tsx`
- [ ] **T-211** — Arte oficial do papel timbrado na cópia de impressão, quando for fornecida (pendência local; até lá vale o `Logo`) → `frontend/src/modules/007-historico-apoio/assets/`

### Testes de tela — `frontend/tests/007-historico-apoio.test.mjs`

- [x] **T-251** `[P]` — `test('C-001: …')`: `formatarTexto` com `{R$:}` e `{D:}` em formato brasileiro
- [x] **T-252** `[P]` — `test('C-003: …')`: `termoDeBusca` para nome e para documento
- [x] **T-253** `[P]` — `test('C-007: …')`: `nomeDoDocumento` e `cssDaPagina` (A4, cliente, documento, contadores de página)
- [x] **T-254** `[P]` — `test('C-017: …')`: `celula` própria, herdada e não se aplica
- [x] **T-255** `[P]` — `test('C-020: …')`: `prazoLegivel` 240 → 10 dias; 24 → 1 dia; 4 → 4 horas; 0 → sem prazo
- [x] **T-256** `[P]` — `test('RN-001: …')`: `agruparPorDia` com "Agendado" primeiro e dias decrescentes
- [x] **T-257** `[P]` — `test('RN-004: …')`: 8 categorias, 8 cores, abas cobrindo as 8 sem repetir
- [x] **T-258** `[P]` — `test('RN-006: …')`: nome sem caracteres proibidos; `cssDaPagina` escapa aspas e barra
- [x] **T-259** `[P]` — `test('RN-013: …')`: `normalizar` ignora caixa, acento e espaço sobrando
- [x] **T-260** `[P]` — `test('RN-015: …')`: `partesDoTexto` corta no `{+}`
- [x] **T-261** `[P]` — `test('RN-018: …')`: `avisoDeCorte` com e sem corte

## Verificação

- [ ] **T-301** — `cd backend && npm test` verde
- [ ] **T-302** — `cd frontend && npm test` verde; `npm run build` e `npm run lint` limpos
- [ ] **T-303** — Verificação manual no simulador: C-007 (salvar em PDF pela prévia no Chrome e no Edge: logo, cabeçalho, quebra de página, rodapé "Página i de n", nome sugerido), C-009 (impressão sem menus), C-010 (links em nova aba), C-018 (nenhuma célula editável), RNF-001/002 (tempos com 500 registros)
- [ ] **T-304** — Tema claro e escuro sem cor quebrada nas cinco telas (RNF-004); revisão pelo modo Revisar da skill de design

## Dependências

```
T-001 → T-015, T-017, T-020, T-021
T-002 [P] → T-016, T-018, T-020 · T-003 [P] → T-020, T-021
T-004 → T-005 → T-006 → T-007 → T-008 → T-012, T-009
T-009 [P] → T-013 → T-014 · T-010 [P] → T-019
T-011 independente das demais SFs
T-015 → T-016 · T-017 → T-018
T-008 → T-023 · T-011..T-021 → T-022 → T-101..T-139 → T-190 · T-190 → T-024
T-190 → trilha Frontend
T-201..T-204 [P] → T-251..T-261 · T-205 → T-206..T-210
T-203 → T-207 · T-201, T-202 → T-206 · T-204 → T-210
T-207 → T-211 · T-206..T-210 → T-302 → T-303, T-304
```

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001 / C-003, RN-013 | T-011, T-202, T-206 | T-103, T-252, T-259 |
| RF-002, RF-003 / C-001, RN-001, RN-003, RN-004, RN-015, RN-019 | T-004 a T-008, T-012, T-201, T-202, T-206 | T-101, T-122, T-124, T-125, T-134, T-138, T-139, T-251, T-256, T-257, T-260 |
| RF-004 / C-002 | T-009, T-012, T-013, T-201, T-206 | T-102 |
| RF-005 / C-019 | T-012, T-206 | T-118 |
| RF-006 / C-005, C-006, RN-005 | T-009, T-013, T-206 | T-105, T-106, T-126 |
| RF-007, RF-012 / C-004, C-021, RN-002, RN-017 | T-004, T-011, T-012, T-013, T-205 | T-104, T-120, T-123, T-136 |
| RF-008, RF-010 / C-007, C-009, RN-006, RN-018 | T-014, T-203, T-207, T-211 | T-107, T-108, T-137, T-253, T-258, T-261, T-303 |
| RF-011 / RN-008 | T-014 | T-107, T-127 |
| RF-013, RF-015 / C-010 | T-003, T-016, T-020, T-208 | T-109 |
| RF-014 / C-011, RN-011 | T-015, T-016, T-208 | T-110, T-130, T-132 |
| RF-016 / C-013, RN-010 | T-015, T-016, T-208 | T-112, T-129 |
| RF-017, RF-019 / C-014, C-016 | T-018, T-209 | T-113, T-115 |
| RF-018 / C-015, RN-012 | T-017, T-018, T-209 | T-113, T-114, T-131 |
| RF-020, RF-021, RF-022 / C-017, C-018, C-020, RN-014 | T-010, T-019, T-204, T-210 | T-116, T-117, T-119, T-133, T-254, T-255 |
| RF-023 | T-016, T-018 | T-110, T-113 |
| RF-024 / C-012, RN-009 | T-015, T-017 | T-111, T-128 |
| RF-025 / C-022, RN-016 | T-004, T-008, T-012 | T-121, T-135 |
| RNF-001, RNF-002 | T-012, T-207 | T-303 |
| RNF-003 | T-013, T-014 | T-104, T-127 |
| RNF-004 | T-206 a T-210 | T-304 |

SF → smoke: `ccHistClienteBuscar`/`…Total` T-103, T-104, T-120 · `ccHistResumo` T-102, T-105, T-106, T-126 · `ccHistEventoListar`/`ccHistEventoTotal` T-101, T-102, T-118, T-121, T-122 · `ccHistExportar` T-107, T-108, T-127, T-137 · `ccHistFonteListar`/`…Total` T-109, T-128, T-132 · `ccHistFonteSalvar` T-110, T-111, T-129, T-130 · `ccHistFonteRevisar` T-112 · `ccHistMaterialListar`/`…Total` T-113, T-115 · `ccHistMaterialSalvar` T-111, T-114, T-131 · `ccHistRegrasVigentes` T-116, T-117, T-119, T-133 · internas `ccEscHist…` T-111 (chamada direta) e pelos testes das públicas.
