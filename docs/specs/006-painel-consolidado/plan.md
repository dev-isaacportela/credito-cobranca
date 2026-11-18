# Plan: Painel consolidado — Crédito e Cobrança

**Spec:** [`spec.md`](spec.md) · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c) · corrigido pela validação v2 e por `pedidos/01-correcoes-v2.md` (16/11: DT-34, DT-38, funil completo)

> O COMO. Nenhum requisito novo nasce aqui — se faltou algo, volta pra spec.
> Tabelas, colunas, parâmetros e assinaturas estão no contrato; este plano cita a
> seção (`02 §006`, `04 §6`) e escreve só o que o contrato não diz: algoritmo,
> casos de borda, telas e testes. O painel **só lê** tabelas de 001–005 e escreve
> nas duas dele. Onde o contrato ficou curto para a spec, o ponto está em
> [`docs/contrato/pedidos/006-painel-consolidado.md`](../../contrato/pedidos/006-painel-consolidado.md)
> e aparece aqui como **PA-nn**. Respondidos em
> [`00-respostas.md`](../../contrato/pedidos/00-respostas.md) (16/11): todos aceitos; as
> assinaturas estão em 04 §6 e a única mudança é D-06 (`PODE_ADMINISTRAR`, `NIVEL_MIN(2)`).

## Checagem de princípios

| Princípio (constitution) | Toca? | Como atende |
|---|---|---|
| I. Spec antes de código | sim | `spec.md` revisada, zero `[NEEDS CLARIFICATION]`; as três antigas viraram P-10, P-04 e P-31 (PA-15, 00 §4), todas com padrão adotado |
| II. Política é dado | sim | Metas, PDD, limiares de concentração e tolerância da leitura lidos do catálogo (03 §8, §9, §13) por `parametros()` / `PARAM()`. Constantes só de definição do sistema: as 6 faixas, as 5 regiões por UF, os 19 tipos de ponto de atenção, a lista de blocos |
| III. Regra no servidor | sim | Toda leitura junta o fragmento `EU` e a visibilidade de 01 §6; fechamento manual é escrita guardada forma A (01 §5), com a regra da RN-016 repetida na `GUARDA` da `ccEsc…`; o que cada cargo vê é decidido pela SF, a tela só esconde |
| IV. Winthor é a fonte do financeiro | sim | Nada lê nem escreve no Winthor: posição, recebimentos e faturamento vêm das tabelas da 001 |
| V. Toda escrita é auditada | sim | `ccPainelFechamentoSalvar` chama `auditar('Fechamento', …)`. A foto não é auditada (01 §7: "não audita foto mensal") e carrega a leitura que a originou |
| VI. Testes obrigatórios | sim | Uma linha de teste por linha da seção Testes da spec (mapa abaixo): `backend/simulator/smoke/006-painel-consolidado.mjs` e `frontend/tests/006-painel-consolidado.test.mjs` |
| VII. Migrations append-only | sim | DDL em `backend/schema/006-painel-consolidado.mjs`; nada em `backend/migrations/` |
| VIII. Simplicidade | sim | Duas tabelas; nenhuma SF além das 15 do contrato; um fragmento ("linhas do mês") serve a foto e todas as leituras; gráficos pelo `recharts` que o kit de design já traz |
| IX. Segurança e credenciais | sim | Nenhuma credencial; `ccPainelRotina` fora do perfil (`FORA_DO_PERFIL`, integrador) |

## Contexto técnico

- **Frontend:** React 19 · Vite 7 · Tailwind 4 · react-router 7 · `mitra-interactions-sdk` · design system Benenutri (`docs/design.md`)
- **Backend:** plataforma Mitra; arquivos da costura da 006 (01 §14):

| Arquivo | Conteúdo |
|---|---|
| `backend/add-060-painel-consolidado.mjs` | `definitions` das 15 SFs públicas e 2 internas |
| `backend/schema/006-painel-consolidado.mjs` | DDL de `CC_FOTO_AGING` e `CC_FECHAMENTO` (02 §006) |
| `backend/lib/painel-consolidado/base.mjs` | fragmentos SQL: linhas do mês, visibilidade do painel, filtros, região, percentuais de PDD por carteira |
| `backend/lib/painel-consolidado/calculo.mjs` | funções puras: `mesAnterior`, `hhi`, `faixaHhi`, `ranking`, `geradaEstimada`, `REGIAO_DA_UF` |
| `backend/lib/parametros/006-painel-consolidado.mjs` | as 8 chaves de que a 006 é dona + `validarConjunto` |
| `backend/simulator/seed/006-painel-consolidado.mjs` · `smoke/006-painel-consolidado.mjs` | seed (faixa 6001–6099) e testes |
| `frontend/src/modules/006-painel-consolidado/` | página, abas, blocos; rota e item de menu por `index.ts` |
| `frontend/src/lib/painel-consolidado/*.ts` | regra pura de tela |
| `frontend/tests/006-painel-consolidado.test.mjs` | testes de tela |

  Sem `lib/modelos` (não envia e-mail) e sem `lib/quadros` (não tem quadro). Do integrador (PA-24): bloco 6000–6999 em `server-functions.ts`, `PUBLISH_ORDER`, `FORA_DO_PERFIL`, rota e menu no `App`.
- **Reuso:** da 001 — `lib/escritas.mjs` (`sessao`, `quem`, `ler`, `escrever`, `auditar`, `parametros`, `agora`, `hoje`), `guarda.mjs` (`ATOR`), `visibilidade.mjs` (`EU`, `clienteVisivel`, `membroVisivel`), `parametros.mjs` (`PARAM_NUM`), `tempo.mjs` (`HOJE_SQL`, `AGORA_SQL`); os três resumos de 04 §9, **chamados pela tela, nunca por uma SF da 006** (são SQL com `EU`; DT-34, 01 §4 regra 2); `ccCredSaudeListar` (004) para a lista completa de um nível de saúde.
- **Dependência nova:** nenhuma (`recharts` + `chart.tsx` vêm com o kit de design, §12.1).

## Modelo de dados

`CC_FOTO_AGING` e `CC_FECHAMENTO`: colunas, chaves e índices em **02 §006**. O que o contrato não diz:

| Ponto | Regra |
|---|---|
| Linhas da foto de M | (a) toda linha de `CC_POSICAO_CLIENTE_BU` com saldo (`A_VENCER + VENCIDO > 0`); (b) zerada, toda chave (cliente, BU) que tinha saldo na foto de M − 1, ou recebimento com atraso em M, ou baixa aprovada em M, e não entrou em (a) — com o **mesmo `BU_ID`** (PA-13) |
| `CARTEIRA`, `AGENTE_ID`, `GRUPO_ECONOMICO`, `UF`, `PLANO_COD`, `EM_JURIDICO` | de `CC_POSICAO_CLIENTE_BU.CARTEIRA` e de `CC_CLIENTE` na hora da foto (`EM_JURIDICO = NO_JURIDICO`); linha zerada herda a carteira da linha anterior |
| `FAIXA` | pela `DIAS_ATRASO` da linha: 0 sem vencido, 1 até 30, 2 até 60, 3 até 90, 4 até 180, 5 acima; −1 sem saldo |
| `PDD` | Σ faixa × `pdd.f0…f5` da carteira da linha, em vigor no dia da leitura. Os percentuais entram por uma tabela derivada de 3 linhas (uma por carteira, `PARAM_NUM`), não por subconsulta em cada linha |
| `VENCIDO_INICIAL` | `VENCIDO` da linha (cliente, BU) na foto com `MES_SEGUINTE = M`; sem ela, 0 |
| `RECUPERADO` | Σ `CC_RECEBIMENTO.VALOR_PAGO` com `DATA_PAGAMENTO` em M, `DIAS_ATRASO_PAGAMENTO > 0`, `ESTORNADO = FALSE`, por (`CLIENTE_ID`, `BU_ID`) |
| `BAIXADO` | Σ `CC_BAIXA.VALOR` com `SITUACAO = 'APROVADA'` e `DECIDIDO_EM` em M. A baixa é por caso (cliente × carteira): vai para a linha daquela carteira com vencido na foto anterior (a de menor `BU_ID`); sem nenhuma, BU 0. `ponytail:` baixa não é rateada por BU |
| `GERADA` | `GREATEST(0, VENCIDO − VENCIDO_INICIAL + RECUPERADO)`; 0 quando não existe foto de M − 1 (a leitura trata como "sem base") |
| `PRINCIPAL`, `LIMITE`, `UTILIZADO` | a linha de maior saldo do cliente (empate: menor `BU_ID`), escolhida por `NOT EXISTS` (sem `ROW_NUMBER`, S-06); leva `LIMITE` e `UTILIZADO` de `CC_POSICAO_CLIENTE` |
| `SINCRONIZACAO_ID` / `_EM` | a leitura que disparou a foto (`INICIO`) |
| `CC_FECHAMENTO.TOTAL` | "carteira" da spec (vencido + a vencer) |

### Leituras de outras specs (só `SELECT`; colunas em 02)

| Dono | Tabelas | Para quê |
|---|---|---|
| 001 | `CC_POSICAO_CLIENTE_BU`, `CC_POSICAO_CLIENTE`, `CC_CLIENTE`, `CC_BU`, `CC_MEMBRO`, `CC_RECEBIMENTO`, `CC_FATURAMENTO_MES`, `CC_PLANO_PAGAMENTO`, `CC_SINCRONIZACAO`, `CC_PARAMETRO` | posição, recortes, visibilidade, recuperado, planos, hora da leitura, metas |
| 002 | `CC_BAIXA` + `CC_COBRANCA` (carteira do caso, bloqueio devido × aplicado), `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `CC_ACORDO`, `CC_ACAO_REGUA` | baixado, contatos, promessas, acordos quebrados, ações no prazo |
| 004 | `CC_SOLICITACAO`, `CC_DECISAO`, `CC_CREDITO`, `CC_RISCO_CLIENTE`, `CC_PEDIDO_RETIDO` | crédito do mês, rating, criticidade, saúde, limites vencidos, pedidos retidos |
| 005 | `CC_ANALISE_ORGAO` (`RATING_PUB` pelo `ANALISE_ORGAO_ID` do crédito vigente), `CC_NF_ACAO` | rating do órgão, passos da régua pública no prazo |

Regra de outro módulo nunca é refeita: agenda, saúde, jurídico, notas e certidões chegam pelas SFs dos donos; das tabelas acima o painel só soma e conta colunas que o dono já gravou.

### Fragmentos comuns (`lib/painel-consolidado/base.mjs`)

- **Mês de referência.** `mesRef` = `{{mes}}`, ou o mês de `hoje()` quando vazio (mês corrente = relógio de 01 §3, não a data da leitura). Mês futuro devolve vazio.
- **Linhas do mês — `linhasDoMes(mes)`.** Uma tabela derivada com as mesmas colunas da foto: `SELECT … FROM CC_FOTO_AGING WHERE MES = mes` `UNION ALL` o ramo **ao vivo** (posição por BU + cliente + foto anterior + recebimentos e baixas do mês, com as regras da tabela acima), ativo só quando `mes` é o corrente. O ramo ao vivo é o mesmo `SELECT` que a rotina congela na foto: **foto = ramo ao vivo gravado**. Toda leitura por mês é `SELECT agregações FROM linhasDoMes B …`.
- **Visibilidade — `visivelNoPainel('B')`.** `EU.CARGO <> 'JURIDICO'` (PA-12) e: linha da foto → `membroVisivel('B.AGENTE_ID')` (o agente congelado, RN-006/C-007); linha ao vivo → `clienteVisivel('C')`. `ponytail:` a foto não congela o analista; o analista vê meses passados só dos clientes de que também é agente, e o supervisor de um analista vê nos meses passados só os clientes dos agentes da equipe (limite escrito na RN-006 e na RN-015; teste C-002 no banco B com Rita em outubro). Para abrir, a foto ganharia `ANALISTA_ID`.
- **Filtros — `filtrosDoPainel('B')`.** `({{buId}} = -1 OR B.BU_ID = {{buId}}) AND ('{{carteira}}' = '' OR B.CARTEIRA = '{{carteira}}')`.
- **Contagem de clientes.** `COUNT(DISTINCT CASE WHEN … THEN B.CLIENTE_ID END)`: o cliente com duas BUs conta uma vez no total e uma em cada BU.
- **Tem base.** O mês tem movimento válido se existe foto com `MES_SEGUINTE = mes`.

## Contratos de backend

Nomes, tipos, quem e colunas: **04 §6**. Aqui: o que muda (pedido), o cenário atendido e o teste. Todas recusam cargo Jurídico, usuário sem membro e membro inativo.

| SF | Tipo e quem (04 §6) | Pedido (aceito, 04 §6) | Atende | Smoke |
|---|---|---|---|---|
| `ccPainelPosicao` | JS-L | PA-01: `mes`, origem, clientes, atraso médio, anterior, por carteira e por BU | C-001…C-004, C-007, C-021 (BU), RN-001…004, RN-017, RN-021; RF-003, 008, 009, 016 | T-101…T-104, T-107, T-121, T-127, T-129, T-132 |
| `ccPainelRollRate` | SQL-L | PA-03: mês corrente como destino, `FAIXA_PARA = 6`, `BASE_EM` | C-012, RN-010 | T-112 |
| `ccPainelSerie` | JS-L | PA-02: `ate`, `ATUAL`, movimento completo, promessas, estimada | C-008, C-010, C-011, C-015, C-016, RN-007…009, RN-011 | T-108, T-110, T-111, T-115, T-116 |
| `ccPainelSerieCredito` | SQL-L | PA-04: `ate`, colunas, `NO_PRAZO`; `PRE_APROVADA` = decidida e aprovada (04 §6) | C-015, RN-020 | T-115 |
| `ccPainelCredito` | JS-L | PA-05: `mes`, `emAnalise`, `porCarteira` | C-015, C-019, C-020, C-026, RN-023 | T-115, T-119, T-120, T-126 |
| `ccPainelConcentracao` | JS-L | PA-06: `base`, `mes`, `buId`, região e BU | C-018, C-025, RN-014, RN-018, RN-022 | T-118, T-125, T-130 |
| `ccPainelAgentes` | SQL-L | PA-07: `mes`, `buId`, somas | C-017, C-021, RN-011 | T-117, T-121 |
| `ccPainelPlanos` | SQL-L | PA-08: `mes`, `buId`, faturamento | C-022 | T-122 |
| `ccPainelSaude` | JS-L | PA-09: por nível com saldo e maiores, `buId` | C-013, RN-012 | T-113 |
| `ccPainelEquipe` | SQL-L, N2 (`NIVEL_MIN(2)`: aceita a marca `ADMIN`, D-06) | PA-10: `mes`, `carteira`, `buId`, colunas | C-024, RN-019 | T-124 |
| `ccPainelAtencao` | JS-L | PA-11: `buId`, `quantidade`; devolve só os 12 tipos das leituras próprias, os 7 dos resumos a tela monta (DT-34, 04 §6) | C-006, C-014, C-023 | T-106, T-114, T-123, T-149 (tela) |
| `ccPainelFechamentoListar` / `…Total` | SQL-L, ADM (`PODE_ADMINISTRAR`, D-06) | PA-12 (b) | C-008, C-009 | T-108, T-109 |
| `ccPainelFechamentoSalvar` | JS-E, ADM (`PODE_ADMINISTRAR`, D-06) | PA-12 (b) | C-008, C-009, RN-016 | T-108, T-109 |
| `ccPainelRotina` | SIS, passo `FOTO` | PA-13, PA-20 | C-005, C-006, RN-005 | T-105, T-106 |
| `ccEscPainelFechamentoInserir` / `…Atualizar` | INT | — | C-009 (chamada por fora) | T-109 |

### O que cada SF faz além do contrato

- **`ccPainelPosicao`.** `sessao()`; resolve `mesRef` e a origem: corrente → `ATUAL`; passado com alguma linha de foto no mês → `FOTO`; sem foto, com `CC_FECHAMENTO` do mês **e** `veTudo` **e** nenhum filtro → `MANUAL` (só `total`, `vencido`, `vencido90`, `pdd`); senão `SEM`. Cinco consultas por `ler()` (não contam execução): totais e faixas; por carteira; por BU; fechamento anterior (foto com `MES_SEGUINTE = mesRef`, mesma visibilidade e filtros); última leitura `OK` (`COALESCE(FIM, INICIO)`). `sincronizacao.atrasada` = minutos desde essa leitura > `painel.sincAtrasoMin`, calculado no servidor com `agora()`. `fotoPendente` (saída de 04 §6) = mês anterior ao corrente quando ele não tem foto nem fechamento manual e já existe alguma foto ou leitura `OK` anterior ao mês corrente; senão `null`. `agenteId` do contrato fica implementado e a tela manda 0 (filtro por agente está fora de escopo).
- **`ccPainelSerie`.** Janela = `meses` (máx. 24) terminando em `ate`, cortada no mês corrente. Consultas: agregados da foto por mês (totais + contagens da RN-009 sobre a subconsulta por cliente: `ENTRARAM` = inicial 0 e vencido > 0; `REGULARIZADOS` = inicial > 0, vencido 0, baixado 0; `BAIXADOS` = baixado > 0); o mês corrente pelo ramo ao vivo; `CC_FECHAMENTO` (só `veTudo` sem filtro, para meses sem foto); promessas por mês de `DATA_PROMETIDA` (total, `CUMPRIDA`, `QUEBRADA`, do jeito que a 002 gravou; carteira pelo caso; BU = cliente com saldo na BU). Em JS: mês sem dado não volta; `GERADA` vira `null` sem base; se o mês anterior é `MANUAL` e a visão é consolidada, `GERADA = geradaEstimada(vencido, vencidoManual, recuperado)` e `ESTIMADO = 1` (RN-008).
- **`ccPainelRollRate`.** Origem = foto com `MES_SEGUINTE = mesRef` e `FAIXA` de 0 a 4; destino = `linhasDoMes(mesRef)` por (`CLIENTE_ID`, `BU_ID`) em `LEFT JOIN`: sem linha = −1; baixado no mês e sem vencido = 6. `VALOR` = saldo total da linha de origem; `CLIENTES` = linhas. Visibilidade e filtros pela linha de origem. `mes = ''` = maior `MES` com foto (contrato); a tela sempre manda o mês do filtro (`mesesOferecidos`), para o mês padrão ser o corrente como nas outras SFs. Quem traduz a matriz em pagou / melhorou / manteve / piorou é `destinosRollRate()` na tela (testada).
- **`ccPainelSerieCredito`.** `SOLICITACOES` por `CRIADO_EM`; as demais por `DECIDIDA_EM` com `DECISAO_RESULTADO IN ('APROVADA','PRE_APROVADA','RECUSADA')`, e `APROVADAS` conta `APROVADA` e `PRE_APROVADA` (04 §6; RN-031 da 004); `LIMITE_CONCEDIDO` pela `CC_DECISAO` apontada em `DECISAO_ID`; `TEMPO_MEDIO_DIAS` = média de `DATEDIFF` (× 1.0, armadilha da divisão inteira); `NO_PRAZO` = data da decisão ≤ `PRAZO_DECISAO`. Visibilidade `clienteVisivel` (alcança o analista).
- **`ccPainelCredito`.** `utilizado` = Σ saldo das linhas do recorte; `limite` = Σ `LIMITE` dos clientes com linha no recorte (cliente em duas carteiras conta o limite em cada uma e uma vez no total). `porRating`: rating **de hoje** do cliente (`CC_RISCO_CLIENTE.RATING_ATUAL` nas linhas Privada/Estética; `RATING_PUB` nas Pública) sobre o saldo do mês pedido. `porCarteira`: decisões do `mes` (aprovadas = `APROVADA` + `PRE_APROVADA`, como em `ccPainelSerieCredito`) + em análise e fora do prazo de hoje (`DECISAO_RESULTADO = ''`, `ENCERRADA_EM` nulo, `PRAZO_DECISAO < hoje`; a pré-aprovada já é decidida e não conta aqui); pedido retido aberto conta na carteira do crédito dele (sem crédito: Pública se o cliente é órgão, senão Privada). `pmrDias` e `prazoMedioDias`: RN-023 sobre `CC_POSICAO_CLIENTE.PRAZO_MEDIO_DIAS` e `UTILIZADO`. `vencendo` = créditos vigentes com fim de validade em até 30 dias (mesmo corte de `VENCENDO_30D` da 004).
- **`ccPainelConcentracao`.** Uma consulta devolve cliente, grupo, UF, BU e valor (`base = VENCIDO`: vencido das linhas do mês; `base = LIMITE`: `CC_POSICAO_CLIENTE.LIMITE > 0` dos clientes visíveis, sempre de hoje, sem BU). O resto é `calculo.mjs`: participações, 10 maiores com acumulado, por grupo (sem grupo conta sozinho), por região, por BU, HHI e faixa de cada recorte, `acimaDoMaximo` (cliente ou grupo acima de `limite.concMax`).
- **`ccPainelAgentes`.** Uma SQL: agregados de `linhasDoMes` por `AGENTE_ID` (`COBRADO = VENCIDO_INICIAL + GERADA`; `CLIENTES_COBRADOS` = clientes com cobrado > 0) com `LEFT JOIN` de contatos (`AGENTE_ID`, `DATA` no mês; contatos, promessas e ações só de cliente visível a quem abre, RN-015), promessas (`AGENTE_ID`, `DATA_PROMETIDA` no mês) e ações (`CC_ACAO_REGUA.FEITA_POR` + `CC_NF_ACAO.FEITO_POR`, com o `NO_PRAZO` gravado). Ordem: `VENCIDO` desc. Cliente sem agente: linha `AGENTE_ID = 0` "Sem agente" (só `veTudo` a vê).
- **`ccPainelPlanos`.** Agregados de `linhasDoMes` por `PLANO_COD` + nome e prazo de `CC_PLANO_PAGAMENTO` + `CC_FATURAMENTO_MES` dos 6 meses até `mesRef` em 6 colunas (`SUM(CASE WHEN MES = … )`), com o mesmo recorte de BU e carteira (carteira do faturamento: Pública se o cliente é órgão, senão a da BU).
- **`ccPainelSaude`.** Lê `SAUDE` e `SAUDE_SINAIS` como estão; saldo = posição total do cliente (com `carteira` ou `buId`, só clientes com linha no recorte); `maiores` = 4 por nível, por saldo; `indice` = saudáveis ÷ classificados; `faixa` por `saude.indiceVerde` / `indiceVermelho`. Sempre posição de hoje.
- **`ccPainelEquipe`.** Quem: `NIVEL_MIN(2)` (supervisor ou acima, ou a marca `ADMIN`; D-06). Linhas = membros ativos não Jurídico com `CAMINHO` começando pelo de quem chama (ou todos, se `veTudo`). Cada linha soma os membros cujo `CAMINHO` começa pelo dela: clientes em atraso, vencido e recuperado pelo agente da linha do mês; análises em andamento, decididas e tempo médio pelo `ANALISTA_ID`; contatos pelo `AGENTE_ID`. `PROFUNDIDADE` = nível no `CAMINHO`, para o recuo.
- **`ccPainelAtencao`.** Não chama nenhuma SF (DT-34: os resumos são SQL com `EU` e nunca são aninhados); faz 4 leituras próprias e devolve só os tipos delas. Tipos, fonte e gravidade (definição do sistema): `INAD_ACIMA_ALERTA` (índice > `meta.inadIndiceAlerta`), `CONCENTRACAO` (clientes e grupos acima de `limite.concMax`), `LIMITE_VENCIDO` (`CC_CREDITO` vigente com `FIM_VALIDADE < hoje`), `CLIENTE_CRITICO`, `CLIENTE_EM_RISCO` (`CC_RISCO_CLIENTE`), `BLOQUEIO_NAO_APLICADO` (caso aberto com devido ≠ aplicado), `ACORDO_QUEBRADO` (no mês corrente), `BAIXA_PENDENTE`, `SOLICITACAO_FORA_PRAZO`, `PEDIDO_RETIDO`, `FOTO_PENDENTE`, `LEITURA_ATRASADA`. Só entra item com `quantidade > 0`.
- **Pontos de atenção dos resumos (tela).** O bloco Visão geral chama `ccCobAgendaResumo` e `ccJurResumo` (com `carteira` e `buId`) e `ccPubResumo` (com `buId`, só com carteira vazia ou `PUBLICA`) direto, e `atencaoDosResumos(agenda, jur, pub)` em `frontend/src/lib/painel-consolidado/visao.ts` monta os outros 7 tipos com o mesmo formato `{ tipo, texto, valor, quantidade, gravidade }`: `PROMESSA_VENCIDA` = Σ `PROMESSAS_VENCIDAS` e `ACAO_ATRASADA` = Σ `ATRASADAS` das linhas da agenda; `JURIDICO_SEM_ANDAMENTO` = `SEM_ANDAMENTO`, `JURIDICO_PRAZO` = `PRAZOS_VENCENDO`; `NF_PAGAMENTO_VENCIDO` = `PAGAMENTO_VENCIDO` (valor `VALOR_PAGAMENTO_VENCIDO`), `NF_ACIMA_2M` = `ACIMA_2M` (valor `VALOR_ACIMA_2M`), `CERTIDAO` = `CERTIDOES_VENCENDO + CERTIDOES_VENCIDAS`. Resumo ausente (id 0) ou não chamado = os tipos dele não entram; só `quantidade > 0`. A lista mostrada = `ccPainelAtencao` + `atencaoDosResumos`, pela gravidade.
- **`ccPainelFechamentoSalvar`.** `quem()`; valida com mensagem (RN-016: valores ≥ 0, vencido ≤ carteira, > 90 ≤ vencido, PDD ≤ carteira, mês < corrente, mês sem foto, nível); lê o fechamento do mês; `escrever('ccEscPainelFechamentoInserir' | '…Atualizar', { …, membroId, agora })`; 0 linha → mensagem padrão de 01 §8; `auditar('Fechamento', 'FECHAMENTO', id, null, campos alterados, m)` (criação = `'(criação)'`; PA-22). As duas `ccEsc…` repetem na `GUARDA`: `ATOR` com `PODE_ADMINISTRAR` (D-06), as quatro comparações, `mes < SUBSTR(AGORA_SQL, 1, 7)` (o relógio do servidor, não o `agora` recebido) e `NOT EXISTS` foto do mês. 3 execuções.
- **`ccPainelRotina`.** Contrato de passo (01 §11). `M` = mês anterior ao da leitura `sincronizacaoId`; se a leitura não é `OK` ou já existe linha de foto de `M` → `{ ok, pendentes: 0 }` sem gravar foto. Senão um `INSERT IGNORE INTO CC_FOTO_AGING … SELECT` do ramo ao vivo com `mes = M` por `runDmlMitra` (uma instrução: grava tudo ou nada; a `UNIQUE` cobre repetição). Não fotografa mês sem leitura `OK` anterior a ele (divergência 5). A linha do passo é do `ccRotina` (01 §11): devolve `execucoes: 1`. 1 execução.

### Parâmetros

`lib/parametros/006-painel-consolidado.mjs` declara, como em 03 §13, as chaves de que a 006 é dona: `meta.inadPct`, `meta.vencido90Pct`, `meta.pddPct`, `meta.recuperacaoPct`, `meta.inadIndiceAlerta`, `painel.hhiModerado`, `painel.hhiAlto`, `painel.sincAtrasoMin`; `validarConjunto`: `hhiModerado < hhiAlto` e `sincAtrasoMin ≥ base.syncIntervaloMin`. Só lê: as demais `meta.*`, `pdd.f0…f5` (por carteira, com vigência), `limite.concMax`, `saude.indiceVerde`, `saude.indiceVermelho`. Nenhuma chave nova.

## Superfície de interação

Rota `/painel` (`?aba=`). Organização escolhida: **`painel-organizacao` B — Abas por assunto** (`escolhas.md`; mockups em `docs/opcoes-tela/006-painel-consolidado/`). Página = `PageHeader` (contador de clientes e de quem é a visão) + `Toolbar` com três `SelectMenu` (mês até o corrente, BU, carteira) e o rótulo da fonte + `Tabs` com cinco abas. Cada aba empilha os seus blocos; **cada bloco é uma das telas escolhidas e busca os próprios dados quando entra na área visível** (`IntersectionObserver`, PA-14; DT-29: ≤ 6 execuções por bloco), em `Promise.allSettled`, com cache por (bloco, filtros) e *debounce* de 400 ms no filtro. `ccPainelPosicao` fica no cache só por filtros: cabeçalho, Visão geral, Indicadores e Aging usam a mesma resposta (uma execução por troca de filtro).

| Aba | Bloco (tela · opção) | Componentes do design system | SFs |
|---|---|---|---|
| Resumo | `painel-visao-saude` **C** Saúde em três colunas | `GradeKpi` + 4 `Kpi` (`Delta inverso` no vencido e no índice); 3 `Panel` (critério, clientes, saldo, 4 maiores em `RowTitle`/`RowMeta`, "Ver os N clientes" abre `Dialog` paginado); selos dos pontos de atenção (`Status` pela gravidade; `ccPainelAtencao` + `atencaoDosResumos`) | `ccPainelPosicao`, `ccPainelSaude`, `ccPainelAtencao`, `ccCobAgendaResumo` (002), `ccJurResumo` (003), `ccPubResumo` (005) — os três resumos chamados direto pela tela (DT-34); sob demanda `ccCredSaudeListar` (004) |
| Resumo | `painel-indicadores` **B** Três grupos lado a lado | 3 `Panel` (Concessão, Carteira e risco, Cobrança) × 4 indicadores: valor, `Status` (Na meta / Fora da meta / Sem meta), `Medidor` (novo: barra do valor e traço da meta, em tokens) | `ccPainelPosicao`, `ccPainelSerie`, `ccPainelSerieCredito`, `ccPainelCredito` |
| Resumo | `painel-evolucao` **A** Dois gráficos com seletor | 2 `PainelGrafico largura="total"` (Concessão; Inadimplência e recuperação), chips do indicador, par Gráfico/Tabela, `BarChart` com `ReferenceLine` da meta, 3 `Kpi` (último valor, média, meses na meta); fechamento manual em `<details>`: `Input`s, `<input type="month">`, `Table` | `ccPainelSerie`, `ccPainelSerieCredito`; ao abrir o fechamento: `ccPainelFechamentoListar`/`Total`, `ccPainelFechamentoSalvar` |
| Carteira e risco | `painel-aging-pdd` **B** Mapa de calor | `GradeKpi`; `PainelGrafico largura="total"` com matriz recorte × faixa (`tomDeIntensidade`, valor escrito em cada célula) e par Gráfico/Tabela; `Table` do PDD por faixa + barras de participação | `ccPainelPosicao` |
| Carteira e risco | `painel-roll-rate` **B** Barras de destino | `GradeKpi`; `PainelGrafico` com uma barra de 100% por faixa em 4 segmentos rotulados (`corDeSerie(0…3)`, legenda); `Table` em reais com linha Total | `ccPainelRollRate` |
| Carteira e risco | `painel-movimento` **B** Seis meses lado a lado | `GradeGraficos` com 2 `PainelGrafico` (gerada × recuperado, 2 séries com legenda; vencido no fim do mês); 6 cartões de mês | `ccPainelSerie` (`meses = 6`, `ate = mes`) |
| Carteira e risco | `painel-concentracao` **A** Quatro recortes e top 10 | `GradeKpi`; `GradeGraficos` com 4 `PainelGrafico` de barra ordenada (cliente, grupo, região, BU); `Table` dos 10 maiores | `ccPainelConcentracao` (`base = VENCIDO`) |
| Cobrança | `painel-agentes` **B** Uma aba por pergunta | `Tabs` internas (Inadimplência por agente · por BU · Conversão · Agenda); cada uma com 2 `PainelGrafico` e `Table` com Total | `ccPainelAgentes`, `ccPainelPosicao` (por BU), `ccPainelSerie` (6 meses), `ccCobAgendaResumo` (002, com `ate` = 7º dia útil por `somarDiasUteis` de `lib/base/dias-uteis.ts`; aba Agenda: vencido e no prazo/fora de `ccPainelAgentes`, a vencer em 7 dias úteis, atrasadas, para hoje, próximos 7 dias úteis e sem contato do resumo) = 4 |
| Cobrança | `painel-planos` **C** Um cartão por plano | grade de `Panel`: `Medidor` da inadimplência × meta, 6 colunas de faturamento, números; "Ver como tabela" | `ccPainelPlanos` |
| Crédito | `painel-credito` **A** Gráficos e quadros | `GradeKpi`; 2 `PainelGrafico` (aprovado × recusado por carteira; exposição por faixa de risco, cor = escala); `Table` por carteira (a linha leva à análise de crédito da carteira) e por BU; rodapé com PMR e prazo médio. **Sem mockup (PA-25):** "Concentração de limites" com o layout de `painel-concentracao` A (por cliente, por grupo, 10 maiores, lista "acima do teto") | `ccPainelCredito`, `ccPainelSerieCredito`, `ccPainelConcentracao` (`base = LIMITE`) |
| Jurídico, público e equipe | `painel-juridico-publico` **B** Funil de cada carteira | 2 `PainelGrafico` de barras horizontais por etapa (largura = valor, quantidade ao lado), com par Gráfico/Tabela, como no mockup. Jurídico: a ajuizar (`AJUIZAR`/`VALOR_AJUIZAR`), em andamento (`ATIVOS`/`VALOR_ATIVOS`), acordo a receber, acordo com parcela vencida, recuperado no mês, custo no mês, recuperado no ano (só valor) e a linha "N desvios de prazo · M críticos". Público: em tramitação (`NFS_ABERTAS`/`VALOR_ABERTO`), entre a entrega e o atesto, aguardando liquidação, liquidadas sem pagamento, com pagamento vencido, recebido no mês (só valor). As etapas saem de `funilJuridicoPublico()` (`lib/painel-consolidado/visao.ts`); links para o Jurídico e para as notas públicas | `ccJurResumo` (003, `mes`, `carteira`, `buId`), `ccPubResumo` (005, `mes`, `buId`; só com carteira vazia ou `PUBLICA`) |
| Jurídico, público e equipe | `painel-equipe` **A** Tabela em árvore | `Table` com recuo por nível | `ccPainelEquipe`, `ccCobAgendaResumo` |

Componentes novos, todos em `modules/006-painel-consolidado/`: `PainelPage`, `BlocoPreguicoso` (observa a visibilidade, dispara a carga, mostra esqueleto com a altura final), `Medidor`, e um arquivo por bloco. Se um bloco precisar de classe solta, o nome entra no `page.tsx` (design §8), não na tela.

### Gráficos (design.md §12)

- Série usa a rampa de dados (`corDeSerie`, índice do contrato, nunca do array filtrado); magnitude usa `tomDeIntensidade`; sem pizza; sem dois eixos Y (por isso a evolução mostra um indicador por vez e gerada × recuperado dividem a mesma unidade); todo `PainelGrafico` traz o par Gráfico/Tabela; legenda a partir de duas séries; eixo de barra começa em zero.
- **Exceção consciente (RF-007):** as barras mensais da evolução são pintadas "dentro da meta" / "fora da meta" com a paleta de estado (`primary`, `alert`). É o caso que o §12.2 admite — o gráfico é *sobre* estado — e por isso cada barra leva o valor escrito, a legenda nomeia os dois estados e a meta é linha tracejada. Mês de fechamento manual e mês parcial são marcados no rótulo do eixo, não por cor. Registrado em Decisões (D-07).
- Dado insuficiente não vira gráfico (§9.7): roll rate e movimento sem foto anterior mostram "Falta a foto de MM/AAAA"; comparação entre agentes com uma linha só mostra só a tabela.

### Estados de tela

| Estado | Quando | O que aparece |
|---|---|---|
| Carregando | bloco entrou na área visível | esqueleto com a altura final |
| Vazio | recorte sem cliente (C-003; agente sem carteira, C-002) | KPIs com `Dash`; `EmptyState` "Nenhum cliente no recorte" no lugar dos gráficos |
| Sem dado | mês passado sem foto nem fechamento visível (C-010) | "Sem dado para MM/AAAA" no bloco |
| Winthor desatualizado | `sincronizacao.atrasada` (C-014, RN-021) | `Alert` de atenção fixo acima das abas: "Dados do Winthor desatualizados desde hh:mm" |
| Foto pendente | `fotoPendente` (C-006) | `Alert` de atenção acima das abas: "Foto de MM/AAAA pendente" + o ponto de atenção |
| Módulo não instalado | SF de resumo com id 0 (C-023) | o bloco diz "módulo não instalado"; os outros carregam |
| Erro do bloco | uma promessa rejeitada | `Alert` de erro só naquele bloco |
| Filtro não se aplica | BU nas decisões de crédito; BU e carteira no fechamento manual (RN-017) | frase no cabeçalho do bloco |

### O que cada cargo enxerga (RN-015; só a visão do gerente foi desenhada)

| Elemento | Agente, analista | Supervisor | Gerente, Diretoria, Administrador (marca `ADMIN`, em qualquer cargo; D-06) | Jurídico |
|---|---|---|---|---|
| Item de menu e rota | sim | sim | sim | não renderizado; rota mostra "sem acesso" |
| Cabeçalho | "visão de Fulano: a sua carteira" | "a sua equipe" | "carteira inteira" | — |
| Blocos de carteira, crédito, jurídico e público | números dos próprios clientes | da equipe | tudo | — |
| `painel-agentes` | uma linha; sem gráficos de comparação | linhas da equipe | todas | — |
| `painel-equipe` | bloco não renderizado (SF é N2) | a própria árvore | todos | — |
| Fechamento manual (em `painel-evolucao`) | não renderizado | não renderizado | renderizado | — |

A decisão é do servidor (as SFs filtram e recusam); `blocosDoCargo()` em `lib/painel-consolidado/` só evita chamar o que seria recusado. Cargo, nível e marca `admin` vêm de `ccBaseSessao`.

## Fluxo

1. **Foto.** A cada rodada de processamento, `ccRotina` chama `ccPainelRotina` (passo 5) com a última leitura `OK`. Na primeira leitura `OK` de um mês novo, o mês anterior ainda não tem foto: grava. Nas demais, sai sem escrever.
2. **Abrir o painel.** A página chama `ccPainelPosicao` (cabeçalho, fonte, avisos de topo; a mesma resposta serve o primeiro bloco) e o primeiro bloco visível carrega. Rolar ou trocar de aba carrega os outros blocos; o que já veio fica em cache enquanto os filtros não mudam.
3. **Trocar filtro.** Limpa o cache e recarrega os blocos visíveis.
4. **Cálculo.** As SFs devolvem somas e contagens; índices, percentuais e estado da meta são funções puras de `lib/painel-consolidado/` (`indice`, `pct`, `naMeta`, `indicadoresExecutivos`, `destinosRollRate`).
5. **Fechamento manual.** Formulário → `ccPainelFechamentoSalvar` → mensagem ou gravação; lista e série são recarregadas.

### Orçamento de execuções (01 §10)

| Operação | Execuções |
|---|---|
| Bloco "Visão geral e saúde" (o mais caro) | `ccPainelPosicao` 1 + `ccPainelSaude` 1 + `ccPainelAtencao` 1 (sem chamada aninhada) + 3 resumos chamados pela tela (`ccCobAgendaResumo`, `ccJurResumo`, `ccPubResumo`) = **6** |
| `ccPainelFechamentoSalvar` | JS 1 + `ccEsc…` 1 + auditoria 1 = **3** |
| `ccPainelRotina` | JS 1 = **1** (a foto vai por `runDmlMitra`, que não conta; a linha do passo é gravada pelo `ccRotina`) |

Demais blocos: 1 a 4 (`ccPainelPosicao` já no cache não conta de novo). Abrir a página = o primeiro bloco (Visão geral: **6**, com o cabeçalho na mesma resposta de `ccPainelPosicao`). Sem atualização automática.

## Simulador

- **Relógio do smoke:** o smoke exporta `RELOGIO = '2026-11-14T10:00:00'` (06 §1, padrão D). Datas do seed da 006 absolutas, porque as duas fotos semeadas são de meses fixos e o seed só entra nos bancos da 006 (mesmo `RELOGIO`).
- **Banco A** = DDL de todos + `000-elenco` + seed da 006. **Banco B** = A + seeds de 002, 003, 004 e 005 (dependências declaradas no topo do smoke). Os dois são montados pelo pipeline de 06 §2.3 e entregues no estado do passo 11. Em A todo número é do painel; em B o que é de outro módulo é conferido contra a SF do dono ou contra a conta registro a registro (um `SELECT` cru + laço em JS no próprio teste). Os seeds de 002–005 entram com datas por `dia(n)` do `RELOGIO` 14/11 (06 §1; o da 005 também) e nenhum assert da 006 depende de data absoluta de outro seed. Em B o pipeline começa em `dia(-40)` (`INICIO` da 003).
- **Clientes** (`PCCLIENT`; grupo e agente são da 001: o agente entra no passo 7 do pipeline, o grupo no `dominio()`):

| Cód | Ramo | UF | Grupo | Plano | Agente | Limite | Notas (`nota()`: emissão · item · parcelas) |
|---|---|---|---|---|---|---|---|
| 6001 | 1 | SP | Alfa | 30 | Ana | 20.000 | 25/10 · 101 · 5.000 venc. 10/11 pago 10/11 e 10.000 venc. 09/12 — 01/11 · 101 · 2.000 venc. 02/11 |
| 6002 | 2 | SP | Alfa | 30 | Ana | 10.000 | 06/08 · 201 · 5.000 venc. 05/09 pago 03/11 (o `dominio()` desfaz o pagamento: estorno) |
| 6003 | 1 | RJ | — | 30 | Ana | 40.000 | dia 05 de jun a out · 101 · 20.000 venc. dia 05 do mês seguinte, pagas no vencimento — 05/11 · 101 · 20.000 venc. 05/12 |
| 6004 | 2 | MG | — | 35 | Ana | 10.000 | 05/09 · 401 · 3.000 venc. 05/10 — 05/10 · 401 · 1.000 venc. 04/11 — 15/10 · 101 · 4.000 venc. 05/12 |
| 6005 | 3 | SP | — | 1 | Ana | 5.000 | 15/09 · 101 · 2.000 venc. 15/10 (o `dominio()` baixa como perda e cancela) |
| 6006 | 13 (órgão) | GO | — | 35 | Carlos | 80.000 | 15/06 · 101 · 6.000 venc. 15/07 pago 20/10 — 07/07 · 101 · 8.000 venc. 06/08 — 20/10 · 101 · 30.000 venc. 19/12 |
| 6007 | 4 | PR | — | 35 | Carlos | 5.000 | 08/04 · 201 · 4.000 venc. 08/05 |
| 6008 | 2 | SP | — | 30 | Carlos | 6.300 | 03/11 · 101 · 6.000 venc. 03/12 |
| 6009 | 3 | SP | — | 1 | Carlos | 5.000 | 10/09 · 101 · 3.000 venc. 10/10 pago 05/11 |
| 6010 | 4 | RJ | — | 35 | Carlos | 5.000 | 21/08 · 201 · 2.000 venc. 20/09 pago 06/11 — 26/09 · 201 · 1.000 venc. 26/10 |

  Produtos do elenco: 101 Nutrição, 201 Enfermagem, 401 Estética. Posição de 14/11 que a leitura produz (R$): a vencer 70.000; 1–30: 4.000 (6001 2.000, 6004 1.000, 6010 1.000); 31–60: 3.000 (6004); 61–90: 5.000 (6002); 91–180: 8.000 (6006); acima de 180: 4.000 (6007); 9 linhas cliente × BU, 8 clientes.
- **Fotos semeadas** (`CC_FOTO_AGING`, `SINCRONIZACAO_ID = 0`, PA-23). Valores em R$; faixa da linha entre parênteses:

| Linha (cliente/BU · carteira · agente) | Setembro (tirada 01/10 00:15) | Outubro (tirada 01/11 00:15) · inicial / gerada / recuperado |
|---|---|---|
| 6001/1 · Privada · Ana | — | a vencer 15.000 (0) · 0 / 0 / 0 |
| 6002/2 · Privada · Ana | 1–30: 5.000 (1) | 31–60: 5.000 (2) · 5.000 / 0 / 0 |
| 6003/1 · Privada · Ana | a vencer 20.000 (0) | a vencer 20.000 (0) |
| 6004/1 · Privada · Ana | — | a vencer 4.000 (0) |
| 6004/4 · Estética · Ana | a vencer 3.000 (0) | a vencer 1.000 + 1–30: 3.000 (1) · 0 / 3.000 / 0 |
| 6005/1 · Privada · Ana | a vencer 2.000 (0) | 1–30: 2.000 (1) · 0 / 2.000 / 0 |
| 6006/1 · Pública · Carlos | 31–60: 8.000 + 61–90: 6.000 (3) | a vencer 30.000 + 61–90: 8.000 (3) · 14.000 / 0 / 6.000 |
| 6007/2 · Privada · Carlos | 91–180: 4.000 (4) | 91–180: 4.000 (4) · 4.000 / 0 / 0 |
| 6009/1 · Privada · Carlos | a vencer 3.000 (0) | 1–30: 3.000 (1) · 0 / 3.000 / 0 |
| 6010/2 · Privada · Carlos | a vencer 1.000 + 1–30: 2.000 (1) | 1–30: 1.000 + 31–60: 2.000 (2) · 2.000 / 1.000 / 0 |
| **Total** | 54.000 · vencido 25.000 · PDD 4.955 | 98.000 · vencido 28.000 · PDD 5.720 · 25.000 / 9.000 / 6.000 |

- **Preparo do banco (no seed, DT-38; o smoke não prepara nada).** O seed da 006 exporta `winthor()` (clientes e notas acima) e `dominio()`, sem `INICIO` nem `passado()`. A atribuição (6001–6005 Ana, 6006–6010 Carlos) vem do passo 7 do pipeline. `dominio()` (passo 10, relógio `RELOGIO`): (1) apaga as linhas de `CC_FOTO_AGING` que a rotina tirou nos passos 8 e 9 (em A, outubro na leitura de 14/11; em B, setembro em `dia(-40)` e outubro em 14/11) e grava as fotos semeadas de setembro e outubro (tabela abaixo; a 006 é dona da tabela e a foto não tem SF de escrita além da rotina, PA-23); (2) Gustavo classifica 6001 e 6002 no Grupo Alfa (`ccBaseClienteClassificar`); (3) baixa de 6005: Sérgio propõe R$ 2.000, Júlia dá parecer, Gustavo aprova (SFs da 002; o caso existe desde o passo 8; sem a 002, o passo pula e os testes que dependem da baixa usam `pular`); (4) no Winthor simulado, cancela a parcela de 6005 e desfaz o pagamento de 6002 (já lido como pago no passo 6). A leitura do passo 11 (14/11 10:00) grava o estorno e a parcela cancelada, e o passo `FOTO` não regrava outubro (já existe). Por que não `INICIO = dia(-6)` + `passado()`: em B o pipeline começa em `dia(-40)` e o `passado()` da 006 rodaria em 05/10, quando 6005 ainda não venceu e não há caso para a baixa; em `dominio()` tudo roda em 14/11 nos dois bancos.
- **`CHECK_INPUT`:** `mes: '2026-11'`, `ate: '2026-11'`, `meses: 12`, `buId: -1`, `carteira: ''`, `agenteId: 0`, `base: 'VENCIDO'`, `limite: 20`, `offset: 0`, `sincronizacaoId: 0`.
- **Dialeto:** só funções da lista permitida de 06 §5 (`DATEDIFF`, `GREATEST`, `DATE_FORMAT`, `CONVERT_TZ`, `INSERT IGNORE`). Nada de `ROW_NUMBER`, `WITH`, `ON DUPLICATE KEY`. Booleano nunca é somado (`CASE WHEN … THEN 1 ELSE 0`); divisão sempre × 1.0.

## Testes

Backend em `backend/simulator/smoke/006-painel-consolidado.mjs`, título começando pelo id; frontend em `frontend/tests/006-painel-consolidado.test.mjs`. "A"/"B" = banco.

| Cenário / regra | Arquivo | O que o `assert` verifica |
|---|---|---|
| C-001, RN-004 | smoke A | `ccPainelPosicao` como gustavo: `total 94000, aVencer 70000, vencido 24000, vencido90 12000, pdd 10270, clientes 8, clientesAtraso 6, origem 'ATUAL'`, `sincronizacao.em` de 14/11 10:00 |
| C-002, RN-015 | smoke A e B | `ccPainelPosicao`: ana e sergio 45000/11000; carlos e silvia 49000/13000; gustavo, diana, nara 94000/24000; bruno `clientes 0`. julia, visitante e otavio: `ok: false` nas JS e 0 linha nas SQL, nas 13 SFs de leitura. B: rita vê só clientes com `ANALISTA_ID` dela; rita com `mes '2026-10'`: `clientes 0`, `total 0` (a foto segue o agente; RN-006) |
| C-003, RN-017 | smoke A | `carteira 'ESTETICA'` 4000/4000 e 1 cliente; `'PUBLICA'` 38000/8000; `'PRIVADA'` 52000/12000; `porCarteira` soma 94000; `buId 2` 10000/10000; `buId 2` + `'ESTETICA'` `clientes 0, origem 'ATUAL'`; sem filtro `clientes 8` |
| C-004 | smoke A | `mes '2026-10'`: 98000/28000, `pdd 5720`, `origem 'FOTO'`, `posicaoEm '2026-11-01T00:15:00'` |
| C-005, RN-005 | smoke A | `fixarRelogio('2026-12-01T00:10:00')`, `rodarCron` × 2: 11 linhas com `MES = '2026-11'`, Σ vencido 24000, Σ PDD 10340, Σ baixado 2000, 6005/1 e 6009/1 zeradas; `FOTO_PENDENTE` ausente; `rodarCron` de novo: 11 |
| C-006 | smoke A | (a, antes de C-005) relógio 01/12 00:02: 0 linhas de novembro, `ccPainelAtencao` traz `FOTO_PENDENTE`; `ccPainelRotina({ sincronizacaoId: 0 })` → `pendentes 0`, 0 linhas. (b, depois) relógio `2027-02-01T00:10:00`, `rodarCron` × 2: existe foto de `2027-01`, 0 linhas de `2026-12` |
| C-007, RN-006 | smoke A | gustavo passa 6002 a Carlos (desfeito no fim): ana nov 40000, carlos nov 54000; ana `mes '2026-10'` 50000/10000; carlos out 48000/18000 |
| C-008 | smoke A | gustavo `ccPainelFechamentoSalvar('2026-08', 60000, 22000, 4000, 5000)` → `ok`; `…Total = 1`; `…Listar` traz agosto com `TOTAL 60000, VENCIDO 22000, VENCIDO_90 4000, PDD 5000, TEM_FOTO 0`; `CC_AUDITORIA` +1 (área `Fechamento`); `ccPainelSerie` de agosto `ORIGEM 'MANUAL', TOTAL 60000, VENCIDO 22000`; de novo com `pdd 5500`: total 1, auditoria `ANTES '5000.00'`, `DEPOIS '5500.00'`; ≤ 12 execuções |
| C-009, RN-016 | smoke A | erros com /carteira/, /90/, /foto/ (setembro), /mês/ (novembro), /permiss/ (sergio); `ccEscPainelFechamentoInserir` (julho) e `ccEscPainelFechamentoAtualizar` (agosto, `pdd 1`) direto como sergio: nada gravado, agosto continua `PDD 5500`; `ccPainelFechamentoListar` e `…Total` como sergio e como ana: 0 linha; `…Total = 1` como gustavo; nara (agente + `ADMIN`) corrige o PDD de agosto para 5400 → `ok`, e o teste volta a 5500 por nara (PA-12 b) |
| C-010 | smoke A | `ccPainelSerie` agosto com `buId 1`: mês ausente; como ana: ausente; gustavo sem filtro: `MANUAL`. `ccPainelPosicao('2026-08')` idem (`SEM` / `MANUAL`) |
| C-011, RN-007…009 | smoke A | `ccPainelSerie` nov: `VENCIDO_INICIAL 28000, GERADA 3000, RECUPERADO 5000, BAIXADO 2000, VENCIDO 24000, ENTRARAM 1, REGULARIZADOS 1, BAIXADOS 1, ORIGEM 'ATUAL'`; out: 25000 / 9000 / 6000 / 28000, `ENTRARAM 3`; set: `GERADA null`; depois de C-008, set `GERADA 3000, ESTIMADO 1` para gustavo e `null` com `buId 1` |
| C-012, RN-010 | smoke A + tela | matriz de nov: (0→0) 24000, (0→1) 15000, (1→−1) 3000, (1→2) 4000, (1→6) 2000, (2→1) 3000, (2→3) 5000, (3→4) 38000, (4→5) 4000; `BASE_EM '2026-11-01T00:15:00'`. Tela: `destinosRollRate()` dá por faixa pagou / melhorou / manteve / piorou e as taxas 38,46%, 66,67%, 62,50% |
| C-013, RN-012 | smoke B | `ccPainelSaude` como gustavo e como sergio: clientes por nível = `ccCredSaudeResumo`; saldo por nível = conta registro a registro; nenhum `maiores` com setor público; `maiores` em ordem de saldo, ≤ 4; `indice` = saudáveis ÷ soma |
| C-014 | smoke B + tela | `ccPainelAtencao` como gustavo: `PEDIDO_RETIDO ≥ 2`, `BAIXA_PENDENTE ≥ 1`, `BLOQUEIO_NAO_APLICADO ≥ 2`, `LIMITE_VENCIDO ≥ 1`, `CLIENTE_CRITICO ≥ 1`, cada quantidade = conta registro a registro; só tipos próprios (nenhum dos 7 dos resumos); sem `FOTO_PENDENTE`; nenhum item com quantidade 0. Os três resumos chamados direto como gustavo: `ccPubResumo.ACIMA_2M ≥ 1` (5003). Tela: `atencaoDosResumos()` com linhas de resumo de exemplo dá os 7 tipos com a soma de cada coluna, sem item com 0, e sem os tipos de um resumo `null` |
| C-015, RN-020 | smoke A e B | A: `inadPct 25.53, vencido90Pct 12.77`, PDD 10,93%, série nov recuperado ÷ gerado 166,67% e conversão 16,13%, `ccPainelCredito` `utilizado 94000, limite 176300`, `atrasoMedioDias 86.79`. B: linha de novembro de `ccPainelSerieCredito` e promessas de `ccPainelSerie` = conta registro a registro (a conta põe `PRE_APROVADA` entre as decididas e aprovadas) |
| C-016 | smoke A | `ccPainelSerie({ ate: '2026-12', meses: 12 })` após C-008: meses `['2026-08','2026-09','2026-10','2026-11']`, origens `MANUAL, FOTO, FOTO, ATUAL`; índices 36,67 / 46,30 / 28,57 / 25,53 |
| C-017, RN-011 | smoke A | `ccPainelAgentes` nov: carlos `COBRADO 18000, RECUPERADO 5000, CLIENTES_COBRADOS 4`; ana `13000, 0, 4`; soma 31000 / 5000; depois de `ccCobContatoRegistrar` (ana × 2, uma com previsão; carlos × 1): `CONTATOS` 2 e 1, `PROMESSAS` 1 e 0 |
| C-018, RN-018 | smoke A | `base 'VENCIDO'`: `top10[0]` 6006 8000 (33,33%), 6 linhas, acumulado 100; grupo Alfa 7000; regiões 12000 / 8000 / 4000; BUs 10000 / 10000 / 4000; `porCliente.hhi 2187.5 'moderada'`; `porRegiao.hhi 3888.9 'alta'` |
| C-019 | smoke A e B | A: `porCarteira` utilizado/vencido 52000/12000, 4000/4000, 38000/8000; `porBu` 80000/10000/5, 10000/10000/3, 4000/4000/1. B: `emAnalise`, aprovadas, recusadas e concedido por carteira = conta registro a registro (`PRE_APROVADA` conta como aprovada na Pública e não como em análise); com `buId 1` as decisões não mudam |
| C-020 | smoke A e B | A: Σ `porRating` = 94000; 6006 fora do grupo `PRIVADO`. B: saldo por rating = conta registro a registro |
| C-021 | smoke A | `ccPainelAgentes`: carlos `TOTAL 49000, VENCIDO 13000, VENCIDO_90 12000, CLIENTES_ATRASO 3`; ana `45000, 11000, 0, 3`; primeiro da lista = carlos. `ccPainelPosicao.porBu`: Nutrição 80000/10000, 2 em atraso, > 90 8000; Enfermagem 10000/10000, 3 |
| C-022 | smoke A | `ccPainelPlanos` nov, plano `30`: `CLIENTES 4, CLIENTES_ATRASO 2, TOTAL 43000, VENCIDO 7000, FAT_M0 28000`, `FAT_M5…M1` 20000, 20000, 25000, 20000, 35000 |
| C-023, RF-024, RF-025 | smoke B + tela | Como gustavo, com `buId 1`: `ccPainelAtencao` sem nenhum dos 7 tipos dos resumos; `ccCobAgendaResumo`, `ccJurResumo` e `ccPubResumo` chamados direto devolvem linha (com sessão, sem aninhar); `ccCobAgendaResumo` com `ate` = 7º dia útil traz `PROXIMOS` e `A_VENCER_7DU` (RF-017). Funil: `ccJurResumo` e `ccPubResumo` com `mes '2026-11'` trazem as colunas do funil (04 §3, §5), e `RECEBIDO_MES`/`NFS_RECEBIDAS_MES` = conta registro a registro de `CC_NF_PUBLICA` com `PAGO_EM` em novembro. Tela: `estadoDoBloco(idZero)` = "módulo não instalado"; `funilJuridicoPublico(jur, pub)` dá as etapas na ordem do mockup (a ajuizar → recuperado no ano; em tramitação → recebido no mês) com quantidade e valor da coluna certa, e `null` no lugar do resumo ausente |
| C-024, RN-019 | smoke A e B + tela | sergio: 4 linhas, a dele `CLIENTES_ATRASO 3, VENCIDO 11000, RECUPERADO 0`; silvia: 2 linhas, `3, 13000, 5000`; gustavo: 9 linhas, gustavo e diana `6, 24000, 5000`; nara (agente + `ADMIN`, D-06): 9 linhas; ana: 0 linha. B: `ANALISES_ANDAMENTO` e `DECIDIDAS` de rita = as de sergio = conta registro a registro. Tela: `somarAcoesNaArvore()` |
| C-025, RN-022 | smoke A | `base 'LIMITE'`: `total 186300`, 6006 80000 (42,94%), Alfa 30000 (16,10%), `porCliente.hhi 2518.1 'alta'`, `acimaDoMaximo` = 6006, 6003, 6001, Alfa |
| C-026, RN-023 | smoke A | `pmrDias` e `prazoMedioDias` = conta cliente a cliente sobre `CC_POSICAO_CLIENTE` |
| RN-001 | smoke A | linha 6004/4 ao vivo: `V_1_30 1000, V_31_60 3000`, faixa 2; `faixas[1].saldo 4000` no total |
| RN-002 | tela | `indice(24000, 94000)` = 0,2553; `indice(0, 0)` = `null`; `rotuloPct(null)` = `'—'` |
| RN-003 | smoke A | `ccBaseParametroSalvar` `pdd.f2 = 20` na `ESTETICA` (desfeito): Estética `pdd 630`, total 10570; `mes '2026-10'` continua 5720 |
| RN-013 | tela | `naMeta(25.53, {max: 5})` falso; `(8.67, {max: 9})`, `(166.67, {min: 80})`, `(66.67, {min: 60, max: 85})` verdadeiros; `(86, {min: 60, max: 85})` falso; `(null, …)` = `null` |
| RN-014 | smoke A | `faixaHhi(2187.5, 1500, 2500)` moderada; 1499 pulverizada; 2500 alta (import direto de `calculo.mjs`) |
| RN-021 | smoke A | relógio 10:25: `sincronizacao.atrasada` falso; 10:35: verdadeiro e `LEITURA_ATRASADA` em `ccPainelAtencao` |
| RNF-001 | smoke A | `execucoes()` das SFs de cada bloco ≤ 6 (Visão geral = `ccPainelPosicao` + `ccPainelSaude` + `ccPainelAtencao` + os três resumos chamados direto = 6; `ccPainelAtencao` sozinha = 1); `ccPainelRotina` ≤ 2 |
| Coerência com a 002 | smoke B | como gustavo sem filtro, vencido e PDD de `ccPainelPosicao` = `ccCobPainelKpis` / `ccCobPainelAging` (mesma fonte, dois módulos) |

- **Ordem no smoke A:** leituras primeiro; depois, nesta ordem, os que mudam estado (cada um desfaz o que mudou quando indicado): C-017 (contatos) → C-008 → C-009 → C-010 → C-016 → C-011 (setembro) → C-007 → RN-003 → RN-021 → C-006a → C-005 → C-006b.
- **Módulo ausente:** SF de outro módulo com id 0 → `pular('depende de 00N')`; sem a 002, pulam C-005 (baixado), C-011, C-012 e C-017 (contatos).
- **As duas situações da chamada aninhada** (06 §3) não se aplicam: nenhuma SF da 006 mexe em card nem chama leitura de outro módulo (os resumos vão pela tela, DT-34).
- **Tela:** além das linhas acima, `blocosDoCargo` (RN-015: agente e analista sem equipe nem fechamento; supervisor com equipe e sem fechamento; Jurídico sem nada), `indicadoresExecutivos` (C-015, a partir das quatro respostas), `resumoDaSerie` (C-016: média 34,27% e 0 de 4 meses na meta), `mesesOferecidos` (RF-001), `avisosDeTopo` (C-006, RN-021: foto pendente e Winthor desatualizado a partir da resposta de `ccPainelPosicao`, campos `fotoPendente` e `sincronizacao` de 04 §6), `atencaoDosResumos` (C-014) e `funilJuridicoPublico` (C-023).

## Decisões

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-01 | Um fragmento "linhas do mês" (foto `UNION ALL` ao vivo) atrás de toda leitura por mês e da própria rotina | SQL própria por SF; reuso de `ccCobPainel*` da 002 no mês corrente | Mês passado só a foto responde; um caminho só para os dois evita número divergente dentro do painel. A coerência com a 002 é afirmada em teste |
| D-02 | Mês corrente = mês do relógio (`hoje()`), não o da última leitura | `MAX(INICIO)` da leitura (plan anterior) | Relógio único do contrato (01 §3); na virada, o aviso "foto pendente" cobre o intervalo até a primeira leitura |
| D-03 | SFs devolvem somas; razões e estado da meta na tela, em funções puras | Cada SF devolver percentuais | Somas recombinam (total = soma das linhas) e as funções ficam testáveis; o que usa relógio ou parâmetro com efeito de regra (`atrasada`, faixa do HHI, estimada) fica no servidor |
| D-04 | Bloco carrega quando fica visível; "tela" do orçamento = bloco (PA-14) | Carregar a aba inteira; segundo nível de abas | Aba inteira estoura 6 execuções; três níveis de aba (aba → bloco → pergunta) atrapalham a leitura. `IntersectionObserver` é do navegador |
| D-05 | Foto por um `INSERT IGNORE … SELECT` (PA-20) | Ler e inserir em lotes de 500 | Uma instrução: sem foto pela metade e sem tabela de controle |
| D-06 | Saúde, agenda, jurídico e público: o número do dono, sem conta local. O funil Jurídico/Público volta completo, como na opção B escolhida, pelas colunas novas de `ccJurResumo` e `ccPubResumo` (com `mes`; DT-33, 01-correcoes-v2 O-3); a redução da PA-21 foi desfeita. A agenda (RF-017) volta completa: `ccCobAgendaResumo` ganhou `ate`, `PROXIMOS` e `A_VENCER_7DU` (04 §2, fechamento v2) | Funil reduzido ao que os resumos traziam (PA-21, desfeito); recalcular na 006 | DT-33: a tela escolhida não perde função por falta de leitura; o número continua do dono |
| D-07 | Barras da evolução com cor de estado (dentro/fora da meta), com rótulo, legenda e linha da meta | Cor de série única + selo ao lado | RF-007 pede o estado no mês; design §12.2 admite quando o gráfico é sobre estado. Exceção registrada |
| D-08 | Limite = o do ERP na posição (PA-18) | Limite aprovado em `CC_CREDITO` | Sem migração (P-02), cliente antigo não tem `CC_CREDITO`; a foto guarda o mesmo limite |
| D-09 | Decisões de crédito só por carteira (PA-17) | Atribuir a solicitação à BU de maior saldo | D-01: a solicitação não tem BU; inventar uma daria número sem dono |
| D-10 | Smoke em dois bancos (PA-23) | Um banco com todos os seeds | Todo total da spec é do universo inteiro; os valores exatos dos outros seeds não são da 006 |

## Divergências da construção (17/11)

Texto para o contrato em `docs/contrato/pedidos/02-pos-construcao.md` §006; parecer em `docs/validacao/B4-006-painel.md`.

| # | Divergência | Situação |
|---|---|---|
| 1 | `DECIDIDAS` em `ccPainelSerieCredito` (denominador do SLA e do tempo médio) | Saída aditiva; texto em 04 §6 |
| 2 | `foraDoPrazo` em `ccPainelCredito.porCarteira` | Saída aditiva (o total já existia em `emAnalise.foraDoPrazo`) |
| 3 | `ESTIMADO` em `ccPainelSerie` | Já em 04 §6 (RN-008): não é divergência |
| 4 | `ccPainelRotina` devolve `execucoes: 1` | A linha do passo é do `ccRotina` (01 §11); custo 1, não 2 |
| 5 | A rotina não fotografa mês sem leitura `OK` anterior a ele; o mesmo corte vale em `fotoPendente` | Evita foto retroativa na implantação (fora de escopo); no primeiro mês não há aviso de foto pendente (R-06). Frase na RN-005 e em 04 §6 |
| 6 | Itens de `ccPainelAtencao` no formato `{tipo, texto, quantidade, valor, gravidade}` | Mesmo conjunto de 04 §6 em outra ordem: não é divergência |
| 7 | Decisões ignoram `buId` | Já em 04 §6 e D-09: não é divergência |
| 8 | `validarConjunto` do grupo `painel` recebia só as chaves do grupo | Resolvido na base (17/11): recebe o conjunto vigente inteiro com o grupo sobreposto; `painel.sincAtrasoMin ≥ base.syncIntervaloMin` (03 §13) vale nos dois sentidos |

Correções do B4 (17/11): `ccPainelAgentes` e `ccPainelEquipe` contam contatos, promessas e ações só de cliente visível (C-01);
as internas do fechamento recusam mês fora de 01–12 e gravam `LANCADO_EM`/`ATUALIZADO_EM` por `AGORA_SQL`, ignorando o `agora`
da entrada (C-02); parâmetro com vigência só vale de hoje em diante (C-03, decisão do orquestrador na base: a PDD por faixa de
mês fechado não muda mais).

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| R-01 — 11 dos 15 contratos dependiam de pedido (PA-01 a PA-11) | — | Fechado: aceitos como propostos (00-respostas.md, 16/11); assinaturas em 04 §6 |
| R-02 — Os smokes B dependem dos seeds de 002 a 005, ainda não escritos | Afirmações "≥" e "igual ao dono" podem não exercitar um caso | 06 §2.5 fixa os casos usados (2005, 2007, 2014, 4005, 4007, 4010, 5003); se um seed não os trouxer, é defeito do seed |
| R-03 — O `dominio()` do seed usa a baixa da 002 e mexe no Winthor simulado | Frágil a mudança de regra da baixa | Passo isolado no `dominio()`; sem a 002 ele pula e os testes dependentes também |
| R-04 — `linhasDoMes` ao vivo com 20.000 clientes dentro de cada leitura | Passar de 3 s (RNF-002) | Índices de 02 (`MES`, `MES_SEGUINTE`, `DATA_PAGAMENTO`); recebimentos e baixas agregados antes do `JOIN`; medir com massa sintética (T-153); se estourar, a série lê o mês corrente numa consulta separada |
| R-05 — Mesmo indicador em dois módulos (aging, PDD, por agente na visão gerencial da 002) | Dois números para a mesma pergunta | Mesma tabela e mesmos parâmetros; teste de coerência no banco B |
| R-06 — Primeiro mês de operação | Roll rate e movimento "sem base"; nenhum aviso de foto pendente | Esperado e rotulado; fechamento manual cobre a evolução |
| R-07 — Rating e saúde de mês passado são os de hoje | Exposição por rating de outubro usa o rating de novembro | Rotulado no bloco ("rating atual"); histórico de rating é da calibração da 004 |
| R-08 — Telas sem mockup (concentração de limites, PMR, visão de agente e de supervisor) | Retrabalho de layout | Reuso do layout escolhido e da tabela "o que cada cargo enxerga"; validar com o usuário na F3 |

## Sandbox (01 §15)

| # | Onde pesa na 006 | Plano B (do contrato) |
|---|---|---|
| S-02 | `sessao()` e `ler()` com `:VAR_USER` nas 6 leituras JS (`Posicao`, `Serie`, `Credito`, `Concentracao`, `Saude`, `Atencao`) | Plano C de 01 §4: cada uma vira SQL-L com o fragmento `EU` e a montagem do objeto passa para `lib/painel-consolidado/` na tela |
| S-01, S-03 | guarda `ATOR` das duas `ccEsc…` do fechamento | 01 §5 plano B |
| S-04 | `rowsAffected` do fechamento | reler a linha |
| S-06 | `INSERT IGNORE`, `CONVERT_TZ`, `GREATEST`, `DATEDIFF` | `INSERT … WHERE NOT EXISTS`; sem função de janela desde já |
| S-09 | `ccPainelRotina` chamada por `ccRotina` e `runDmlMitra` em cron | 01 §11 plano B (cron próprio do passo); sem `runDmlMitra`, lotes de 500 (PA-20) |

## Pedidos

25 pontos em `docs/contrato/pedidos/006-painel-consolidado.md`: 11 lacunas de assinatura (PA-01 a PA-11), 4 pontos a decidir (PA-12 a PA-15) e 10 esclarecimentos que este plano já fixa (PA-16 a PA-25). Resposta em `docs/contrato/pedidos/00-respostas.md`: os 25 aceitos (PA-16 a PA-25 "como está no plano"); PA-15 virou P-31; PA-12 (b) e `ccPainelEquipe` seguem D-06.

## Complexity Tracking

| Princípio violado | Por que é necessário | Por que a alternativa simples não serve |
|---|---|---|
| III (limite conhecido de 01 §5) — `ccEscPainelFechamento…` chamada direto pula a validação com mensagem e a auditoria da JS | O perfil libera as internas para a JS chamá-las por id | A guarda de permissão e as regras numéricas da RN-016 estão na própria SQL; some com o S-03 |
| Design §12 — cor de estado em barra de série (D-07) | RF-007 pede dentro/fora da meta por mês | Cor única + selo perde a leitura de relance que o requisito pede; o §12.2 admite com rótulo |

## Notas da validação B5 (17/11/2026)

- `ccPainelAtencao`: percentuais do `texto` em pt-BR (vírgula decimal). `ccPainelCredito.porRating`: "Sem rating" é uma linha só (pública e privada juntas, clientes distintos).
- O-07: `porCarteira[].valorAprovado` é o valor **pedido** das solicitações aprovadas; `concedido` é o limite. A tela rotula "valor solicitado".
