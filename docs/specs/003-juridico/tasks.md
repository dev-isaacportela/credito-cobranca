# Tasks: Jurídico (dossiê, processos, custos, acordos judiciais e carga inicial)

**Plan:** `plan.md` · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`.
>
> `[P]` = paralelizável dentro desta spec (arquivos distintos, sem dependência entre si).
>
> **Duas trilhas.** A trilha Backend inteira (T-001 a T-161) vem antes da trilha
> Frontend (T-200 em diante).
>
> **Pré-requisito:** 001 construída (preâmbulo, guardas, `quadros.mjs`, elenco do
> seed, lib de quadros instalada). A 002 e a 005 podem não existir: os testes que
> dependem delas usam `pular('depende de 00N')`. Pendências do gestor não
> bloqueiam (padrões na spec). Pedidos PJ-01 a PJ-13 decididos em
> `docs/contrato/pedidos/00-respostas.md` e aplicados no plan.

## Backend

### Fundação

- [ ] **T-001** — Conferir o plan contra o contrato vigente e a resposta dos pedidos PJ-01 a PJ-13 (`docs/contrato/pedidos/00-respostas.md`, seção 003); onde a resposta difere da proposta, corrigir o `plan.md` antes de seguir → `docs/specs/003-juridico/plan.md`
- [ ] **T-002** — DDL das 8 tabelas de `02 §003`, um template literal por tabela, com as `UNIQUE` e os índices do contrato (`CC_ACORDO_JUDICIAL` com IX em `PROCESSO_ID`, sem UQ) → `backend/schema/003-juridico.mjs` · prova: `sim:check` (T-022)
- [ ] **T-003** `[P]` — 31 chaves `jur.*` de `03 §14` e `validarConjunto` (pares do plan) → `backend/lib/parametros/003-juridico.mjs` · prova: T-115, T-116
- [ ] **T-004** `[P]` — Modelo `JUR_NOTIF_EXTRAJUDICIAL` (efeito legal, 5 cláusulas de E §3.1, 5 campos extras de 01 §13) → `backend/lib/modelos/003-juridico.mjs` · prova: T-131, T-132
- [ ] **T-005** `[P]` — Catálogos: 17 documentos (05 §8), 12 tipos de custo com grupo, 5 motivos, 13 desvios com ação sugerida (E §4.5), 24 indicadores → `backend/lib/juridico/catalogos.mjs` · prova: T-105, T-108
- [ ] **T-006** `[P]` — Regras puras: `validarAutos`, `progressoDoDossie`, `gerarParcelas` (RN-017), `politicaDoAcordo` (RN-019), `recuperado` (RN-015), `prazoInicial` (RN-005), `porExtenso`, `dataPorExtenso`, `montarNotificacao` → `backend/lib/juridico/regras.mjs`, `backend/lib/juridico/texto.mjs` · prova: T-107, T-110, T-128, T-132, T-141
- [ ] **T-007** `[P]` — `calcular(carteira, parametros, hoje)`: 13 desvios e 24 indicadores, cortes e bloco de custos (04 §3), acordo `RECUSADO` fora da conta, `AGUARDANDO` fora do a receber e contado em `acordosAguardando` (D-08), com o `ponytail:` do teto em memória → `backend/lib/juridico/gestao.mjs` · prova: T-102, T-103, T-112, T-113
- [ ] **T-008** `[P]` — Carga no servidor: `validarProcesso`, `chaveDaCarga`, `semelhanca` (E §2.4), `sugerirCliente`, `resolverFilial`, `inferirData`, `decidirAcao` → `backend/lib/juridico/carga.mjs` · prova: T-106, T-155, T-156
- [ ] **T-009** — `QUADROS` do `juridico` (11 fases, SLA, cor, descrição de E §5, capa de 05 §6, etiquetas só `Custo a pagar`, `Carga a conferir` e `Substabelecer` — **sem** `Prazo vencendo` e `Sem andamento` —, automação de 05 §7) e `gancho('juridico')` com as 7 regras do plan, na ordem: cláusulas de domínio dos destinos controlados (`→ encerrado` com `ENCERRADO_EM`, `dossie → recebido` com `DOSSIE_ENVIADO_EM`) antes de "só o Jurídico move" (regra 5, só no movimento livre: cargo Jurídico ou `PODE_ADMINISTRAR`; DT-35) → `backend/lib/quadros/003-juridico.mjs` · prova: T-127, T-148, T-149
- [ ] **T-010** — Esqueleto do provisionamento: `definitions`, injeção de catálogos e regras nas SFs JS, `semearQuadro(QUADROS)` no `isEntrypoint()` → `backend/add-030-juridico.mjs`

### Server Functions (todas em `backend/add-030-juridico.mjs`)

- [ ] **T-011** — As 19 `ccEscJur…` de 04 §3, cada uma `INSERT … SELECT … WHERE <GUARDA>` ou `UPDATE … WHERE … AND <GUARDA>`, com a guarda da tabela "Internas e guardas" do plan (`JUR` e `JurFilialSalvar` sobre `PODE_ADMINISTRAR`; `ccEscJurAcordoInserir` com `NOT EXISTS` de acordo `AGUARDANDO`/`ANDAMENTO` do processo e **situação, `ACIMA_ALCADA` e `NIVEL_EXIGIDO` calculados no `INSERT … SELECT` com `PARAM_NUM('jur.acordo…')` sobre valor, entrada e parcelas recebidos**, exceção só da carga; `ccEscJurProcessoInserir` de origem cobrança com `clienteVisivelA` e sem processo ativo de qualquer origem) · prova: T-125, T-143, T-144, T-150
- [ ] **T-012** `[P]` — Leituras SQL: `ccJurProcessoListar`/`Total`, `ccJurAndamentoListar`/`Total`, `ccJurCustoListar`/`Total`, `ccJurCustoResumo`, `ccJurAcordoListar`/`Total`, `ccJurAcordoParcelaListar`, `ccJurResumo`, `ccJurNotificacaoUltima`, `ccJurFilialCredoraListar`, `ccJurCargaPendenciaListar`/`Total` · prova: T-101, T-103, T-104, T-138, T-151
- [ ] **T-013** — `ccJurProcessoFicha` (uma execução por card; `pode` espelhando as guardas; anexos só para quem vê) · prova: T-114, T-117
- [ ] **T-014** — Dossiê: `ccJurDossieAbrir` (devolve qualquer processo ativo do cliente na carteira; ramo `N2` com cliente visível, DT-41), `ccJurDossieItemMarcar`, `ccJurDossieSugestao` (lê `CC_NF_PUBLICA`, `CC_NF_ACAO`, `CC_ANALISE_ORGAO` e `CC_CERTIDAO` por `runQueryMitra`, sem SF da 005; `ccCobEncargosCalcular` com `membroId`), `ccJurDossieEnviar`, na ordem de escritas do plan e idempotentes · prova: T-117 a T-130
- [ ] **T-015** — Processo: `ccJurProcessoCriar`, `ccJurProcessoSalvar`, `ccJurProcessoEncerrar`, `ccJurProcessoVincularCliente`, `ccJurAndamentoRegistrar`; `Criar` recusa `citacao`/`defesa`/`sentenca`/`execucao` com autos vazio; `Criar` (com `clienteId > 0`) e `VincularCliente` chamam `ccEscBaseClienteJuridico` e não chamam `ccCobEnviarJuridico` · prova: T-120, T-137, T-139, T-148, T-149, T-153
- [ ] **T-016** `[P]` — Custos: `ccJurCustoLancar`, `ccJurCustoSalvar`, `ccJurCustoRemover`, com a capa `custo` e a etiqueta `Custo a pagar` · prova: T-138
- [ ] **T-017** `[P]` — Acordo: `ccJurAcordoCriar` (não decide situação nem nível: passa os valores à guarda e relê a linha), `ccJurAcordoAprovar` (`aprovar = 0` grava `RECUSADO`), `ccJurAcordoParcelaSituacao`, `ccJurAcordoHonorariosPagar` · prova: T-140 a T-146
- [ ] **T-018** — `ccJurAlertas` e `ccJurIndicadores` sobre `calcular()` (leituras diretas por `ler()`, sem SF aninhada) · prova: T-102, T-103, T-111, T-115
- [ ] **T-019** `[P]` — Documentos e filial: `ccJurNotificacaoPreparar`, `ccJurNotificacaoRegistrar` (nota no card do processo só se quem emite escreve nele, DT-34 regra 4), `ccJurDemonstrativoPreparar`, `ccJurFilialCredoraSalvar` (`ADM`: `podeAdministrar(m)`) · prova: T-131 a T-136
- [ ] **T-020** — Carga, no formato "processo interpretado" do plan: `ccJurCargaPrevia` (até 5 processos, `candidatos[]` por linha), `ccJurCargaAplicar` (aceita qualquer `clienteId` existente; 1 processo por chamada, 2 ou mais = recusa; `ccEscBaseClienteJuridico` com cliente casado), `ccJurCargaConferir`, `ccJurCargaConcluir` (`ADM`: `podeAdministrar(m)`) · prova: T-151 a T-156

### Simulador

- [ ] **T-021** — Seed pelo pipeline de 06 §2.3: `winthor()`, `INICIO = dia(-40)` + `passado()` (protesto da 3013), `dominio()` sem rotina e sem relógio para trás, datas por `dia(n)`, `PLANILHA_TESTE` e `PLANILHA_SANTA_MARIA`, como na seção Simulador do plan e na tabela da seção Testes da spec; o smoke declara no topo só o elenco e este seed → `backend/simulator/seed/003-juridico.mjs`
- [ ] **T-022** — `npm run sim:check` sem `FALHOU` para as 61 SFs da 003 → `backend/`

### Smoke (um `teste()` por linha da seção Testes da spec) → `backend/simulator/smoke/003-juridico.mjs`

Bloco A — leituras sobre o seed intocado:

- [ ] **T-101** — `teste('C-010: …')`: três grupos com contagem e soma; filtros linha, filial 2, carteira pública e Estética; busca "0712345"
- [ ] **T-102** — `teste('C-016: …')`: 13 alertas, 4 críticos, ordem dos tipos, "9 dias", filtro por tipo, linha "sem dossiê" do cliente 3013
- [ ] **T-103** — `teste('C-017: …')`: os 24 indicadores com faixa (07 = 0 e 08 = 0: só acordo `ANDAMENTO`) e `acordosAguardando` 1 / 60.000 (D-08), concentração 58,6% e os números de `ccJurResumo`, inclusive o funil (a ajuizar 4 / 175.000, recuperado no mês 0 e no ano 30.000, custo no mês 1.200, desvios de prazo 2 e críticos 1)
- [ ] **T-104** — `teste('C-022: …')`: total visível por pessoa (3, 8, 1, 11, 1, 12, 12, 12, 12); Ana e Sérgio não movem ("Só o Jurídico"); Bruno não lança custo
- [ ] **T-105** `[P]` — `teste('RN-001: …')`: catálogo 17; 11/10 e 13/11; os 6 só da pública
- [ ] **T-106** `[P]` — `teste('RN-010: …')`: sem SF de alterar ou apagar andamento; P03 com 50 dias; datas "05/11", "20/12" e sem data na carga de 19/11/2026
- [ ] **T-107** `[P]` — `teste('RN-012: …')`: um nº de autos aceito (ano 2024) e dois recusados
- [ ] **T-108** `[P]` — `teste('RN-013: …')`: grupos de dois tipos, 12 tipos e 4 grupos, regra "sem guia"
- [ ] **T-109** `[P]` — `teste('RN-014: …')`: 3,75% sem alerta, 12% com alerta, encerrado com 15% sem alerta
- [ ] **T-110** — `teste('RN-015: …')`: recuperado de P07, P10, P11 e P02; P11 informado 1.500 e de volta a derivar
- [ ] **T-111** `[P]` — `teste('RN-016: …')`: 30.000 ÷ 537.000 = 5,6%
- [ ] **T-112** `[P]` — `teste('RN-022: …')`: severidades por variação de prazo, andamento e acordo; cliente público fora de "sem dossiê"
- [ ] **T-113** `[P]` — `teste('RN-023: …')`: indicadores 20, 21 e 23; recorte da filial 2
- [ ] **T-114** `[P]` — `teste('RNF-006: …')`: ficha da Atlas como Bruno devolve "não encontrado", sem anexos
- [ ] **T-115** — `teste('C-024: …')`: meta de custo 10 → 15 → 10; alertas 13 → 12 → 13; detalhe cita "10%"
- [ ] **T-116** — `teste('RN-031: …')`: dossiê parado 10 → 20 tira o alerta da Atlas; valor de volta

Bloco B — escritas (cada teste lê o "antes" e afirma a diferença; nas que mexem em card, `SIM_SESSAO_ANINHADA` 0 e 1):

- [ ] **T-117** — `teste('C-001: …')`: dossiê da Iota por Ana: 11 itens, 3 conferidos, 2 orientações, progresso 3/10
- [ ] **T-118** — `teste('C-002: …')`: fase Dossiê, 33.000,00, filial 1; coluna 1 → 2; cobrança igual; alertas 13 → 12; marcação persiste
- [ ] **T-119** — `teste('C-008: …')`: segunda abertura devolve o mesmo processo; total da Iota 1
- [ ] **T-120** — `teste('RN-007: …')`, **no fim do bloco B**: processo manual da Zeta (3008) cadastrado pela Júlia; total da Zeta 2; "Montar dossiê" da Zeta por Bruno devolve o processo manual; após `rodarCron('ccRotina')`, `ccCobSituacao` da Zeta com `FASE_CHAVE = 'juridico'` (`pular('depende de 002')` sem a 002)
- [ ] **T-121** — `teste('RN-002: …')`: anexo marca conferido com "Anexo: nf-3001.pdf"; "não se aplica" sem motivo não conta
- [ ] **T-122** — `teste('RN-003: …')`: protesto pendente continua pendente ao reabrir; cliente sem endereço sem orientação de cadastro
- [ ] **T-123** — `teste('C-004: …')`: envio com 7/10 recusa e lista os 2 itens, sem a aprovação
- [ ] **T-124** — `teste('C-006: …')`: "não se aplica" sem motivo recusa; com motivo, 7 → 8
- [ ] **T-125** — `teste('C-005: …')`: Ana e Sérgio recusados citando "Gerente"
- [ ] **T-126** — `teste('C-003: …')`: envio por Gustavo: Recebido, prazo 2026-11-27, aprovação, 10/10, cobrança em Cobrança judicial, 31.087,25, andamento; reenvio sem duplicar
- [ ] **T-127** — `teste('RN-004: …')`: fase da cobrança antes e depois; com o nível de envio em 2, Sérgio envia o dossiê completo da Iota com `nasDuasSessoes` → card em Recebido nas duas; nível de volta a 3
- [ ] **T-128** `[P]` — `teste('RN-005: …')`: 27/11 com 5; 25/11 com 3; 23/11 partindo de 13/11
- [ ] **T-129** — `teste('C-007: …')`: dossiê do Fundo de Luziânia por Carlos: 13 itens, 11 obrigatórios, 2/11; sugestões com `nasDuasSessoes`, iguais nas duas; notificação recusada citando "ofício"
- [ ] **T-130** `[P]` — `teste('RN-006: …')`: checklist público sem "notificação"; emissão recusada
- [ ] **T-131** — `teste('C-018: …')` (antes de T-126): filial 1 salva por Gustavo; notificação da Atlas por Ana com os 5 valores, prazo 2026-12-04 e nota no card; recusas de modelo, de filial sem CNPJ e de Júlia
- [ ] **T-132** — `teste('C-018 (documento): …')`: 5 cláusulas, "R$ 31.087,25", "15 (quinze) dias corridos", data por extenso; multa 0% → "R$ 30.487,25"
- [ ] **T-133** `[P]` — `teste('RN-024: …')`: CNPJ × CPF; "prazo até" com 15 e com 10 dias
- [ ] **T-134** — `teste('RN-025: …')`: sem validação recusa; validado aceita; contatos dos parâmetros; banco e representante da filial
- [ ] **T-135** — `teste('C-019: …')`: demonstrativo da Iota: 2 títulos, 33.000,00 / 660,00 / 520,00 / 208,25 / 34.388,25, rótulos
- [ ] **T-136** `[P]` — `teste('RN-026: …')`: demonstrativo igual ao cálculo da cobrança, campo a campo
- [ ] **T-137** — `teste('C-011: …')`: andamento na Gama: 0 dias, alerta 1 → 0, texto vazio e Bruno recusados, 2 dias até o prazo
- [ ] **T-138** — `teste('C-012: …')`: custo 0 recusado; 4.100,00 e 10,25%; alerta 1 → 2; comprovante paga; a pagar 2.600,00
- [ ] **T-139** — `teste('RN-008: …')`: P09 de "a ajuizar" para "em andamento" (6) ao receber autos, sem mudar de etapa
- [ ] **T-140** — `teste('C-013: …')`: acordo da Eta: 6 parcelas, datas, honorários 3.000,00, em andamento; movimento para Acordo aceito; acordos a receber do resumo 0 → 1 (30.000,00)
- [ ] **T-141** `[P]` — `teste('RN-017: …')`: 266,66; 266,66; 266,68; 28/02 e 31/03/2027
- [ ] **T-142** `[P]` — `teste('RN-018: …')`: honorários 3.000 com 10% e 3.600 com 12%
- [ ] **T-143** — `teste('RN-019: …')`: os quatro casos de política, situação gravada pela SQL igual à de `politicaDoAcordo()`; aprovação negada grava "recusado" e anota no card; novo acordo no mesmo processo aceito; com um "em andamento", recusado
- [ ] **T-144** — `teste('C-014: …')`: recusas por alçada (Júlia, Sérgio) e por quem registrou (Gustavo); aprovações de Gustavo e Diana; `ccEscJurAcordoInserir` direto como Júlia com 70.000 grava aguardando, nível 3
- [ ] **T-145** — `teste('C-015: …')`: 5ª parcela não quita; 6ª quita; encerramento "acordo cumprido"; recuperado 30.000,00; data futura e encerramento sem quitação recusados
- [ ] **T-146** `[P]` — `teste('RN-020: …')`: vencida por data; P02 com 1 vencida; "a confirmar" pela ficha recusado
- [ ] **T-147** — `teste('RN-032: …')`: filtro Galderma 1; P03 marcado Galderma → 2
- [ ] **T-148** — `teste('C-009: …')` (depois de T-138, T-139 e T-144; antes de T-123): três recusas de "Mover para" com a frase do gancho; autos inválidos; Delta em Citação; encerramento sem e com motivo; duas passagens no histórico; Ana recusada movendo o próprio dossiê para Petição
- [ ] **T-149** — `teste('RN-009: …')`: dossiê próprio da Lambda (3012) aberto por Bruno; encerrar em Dossiê com "outro"; sem texto recusa; voltar a Dossiê recusa; andamentos não aumentam ao mover; baixa sem baixa aprovada devolve aviso; processo novo em Citação sem autos recusado
- [ ] **T-150** — `teste('RN-030: …')`: dossiê da Ana por Bruno; dossiê da Iota por Silvia (DT-41); filial por Júlia e por Gustavo; prévia da carga por Ana e por Júlia; Rita com 0; usuário sem vínculo

Bloco C — carga, por último:

- [ ] **T-151** — `teste('C-020: …')`: prévia (5 processos e as contagens), aplicação um a um, aplicação com 2 processos recusada, pendências 1 → 5, reaplicação sem novos, concluir por Júlia e por Sérgio recusado e por Nara (Agente + `ADMIN`) aceito, prévia depois recusada
- [ ] **T-152** — `teste('C-021: …')`: parcelas da Pi (paga, aberta, a confirmar, origem da cor); resolver a parcela 2 tira a pendência (5 → 4); conferir a divergência da Nu tira outra (4 → 3)
- [ ] **T-153** — `teste('C-023: …')`: `candidatos[]` com 3015 e 3016, sem vínculo; aplicar com o `clienteId` escolhido vincula; vínculo ao cliente achado pelo CNPJ; cliente inexistente recusado
- [ ] **T-154** `[P]` — `teste('RN-011: …')`: busca com e sem pontuação acha o mesmo cliente; processo vinculado ganha o setor do cliente
- [ ] **T-155** `[P]` — `teste('RN-027: …')` (servidor): "Xi Distribuidra" vira sugestão do 3018 com semelhança 1, sem vincular
- [ ] **T-156** — `teste('RN-029: …')`: chaves recalculadas; reaplicar com dado alterado não muda; processo sem card ganha card

Orçamento e fechamento da trilha:

- [ ] **T-157** — `teste('orçamento: …')` com `execucoes()`: abrir a aba Processos ≤ 6; rota do dossiê e card em Dossiê = 2 cada, privada e pública; "Ver sugestões do sistema" ≤ 6; `ccJurAndamentoRegistrar` ≤ 12; `ccJurDossieAbrir` ≤ 20; uma aplicação de `ccJurCargaAplicar` ≤ 20; `ccJurDossieEnviar` ≤ 30 (exceção nomeada, 01 §10)
- [ ] **T-160** — `cd backend && npm test` verde (`sim:check` + smokes), com a 002 presente e com a 002 ausente
- [ ] **T-161** — Prompt do sandbox para a 003: rodar `setup-backend.mjs`, `add-030-juridico.mjs`, republicar o `add-010` (ids das SFs da 003 no `ccRotina` e trecho do gancho no `ccPodeMover`, DT-39), `add-001-kanban.mjs` de novo, `add-090-perfil-acesso.mjs` e o mapa de ids; nada executado daqui → entrega ao orquestrador

## Frontend

Só começa com a trilha Backend fechada (T-160).

### Regra pura de tela → `frontend/src/lib/juridico/`

- [x] **T-200** — Lista do bloco 003 do mapa de SFs (42 nomes de 04 §3, ids locais 3000–3999), entregue ao integrador, que escreve em `frontend/src/lib/server-functions.ts` (arquivo dele, 01 §14) → entrega ao integrador
- [x] **T-201** `[P]` — `tomDoPrazo(dias, vermelho, amarelo)` e o texto do prazo (RN-021) → `prazo.ts`
- [x] **T-202** `[P]` — `montarCsv(linhas)`: 16 colunas, `;`, BOM, vírgula decimal (RF-019) → `csv.ts`
- [x] **T-203** `[P]` — `semelhanca(a, b)` com os mesmos casos do servidor → `nomes.ts`
- [x] **T-204** `[P]` — `interpretar(matrizes)`, saída no formato "processo interpretado" do plan (data do andamento crua, vencimento em ISO): 5 abas, etapa pelo texto, andamentos, valor, data, fusão entre abas, divergência de autos, `situacaoPorCor` (RN-027, RN-028) → `carga.ts`
- [x] **T-205** `[P]` — Leitura do `.xlsx` com SheetJS por `import()` e `cellStyles`; dependência `xlsx` 0.20.3 pedida ao integrador (`frontend/package.json` é compartilhado) → `planilha.ts`
- [x] **T-206** `[P]` — `motivoDeDestino(persona, card, fase, estrutura)`: espelho das 7 regras do gancho, na mesma ordem → `mover.ts`

### Telas → `frontend/src/modules/003-juridico/` (opção de `docs/opcoes-tela/escolhas.md`)

- [x] **T-210** — `index.ts` (rotas, item de menu escondido do Analista) e casca `/juridico` com as 5 abas e os contadores de RF-029 → `index.ts`, `JuridicoPage.tsx`
- [x] **T-211** — Aba Processos, opção **B** (Capa completa por fase): `KanbanBoard` do `juridico` com `novoCard`, `podeMover`, `podeExcluir = false`, `atualizarACadaMs`, faixa dos 6 números e alternância Quadro/Lista → `ProcessosAba.tsx`
- [x] **T-212** — Lista em 3 grupos com filtros, paginação e "Exportar CSV" → `ListaProcessos.tsx`
- [x] **T-213** — Card do processo, opção **B** (Tudo em Nesta fase): `conteudoDaFase` com os blocos, abas "Processo completo" e "Cobrança de origem", coluna de ações e os diálogos de andamento, custo, acordo e encerramento; depois do acordo chama `ctx.mover()`, depois da última parcela chama o encerramento → `BlocosDoProcesso.tsx`, `AcoesDoProcesso.tsx`, `dialogos/*.tsx`
- [x] **T-214** — Dossiê, opção **B** (Pendências primeiro), para as carteiras privada e Estética (11 documentos) **e pública (13 documentos, 11 obrigatórios, sem notificação)**, usado na rota `/juridico/dossie/:processoId` e na fase `dossie` do card; abre só com a ficha; botão "Ver sugestões do sistema" (`ccJurDossieSugestao`) e lista de filiais carregada ao abrir o seletor; processo fora de `dossie` na rota mostra a ficha de leitura; anexo por `enviarArquivo` → `DossiePendencias.tsx`
- [x] **T-215** — Formulário **"Novo processo"** em diálogo sobre o quadro (padrão da tela vizinha): busca do cliente por código ou CNPJ, carteira, filial, valor, linha, autos, tribunal, etapa inicial → `NovoProcessoDialog.tsx`
- [x] **T-216** — Ficha de leitura para quem não tem acesso ao card (agente fora do próprio dossiê; o supervisor é `membro` do quadro) → `FichaLeitura.tsx`
- [x] **T-217** `[P]` — Aba Acordos judiciais, opção **A** (Tabela de acordos), com "Aprovar" e "Marcar paga" → `AcordosAba.tsx`
- [x] **T-218** `[P]` — Aba Custos, opção **A** (Painel de números): 7 números, 4 gráficos com visão de tabela, cortes, a pagar, sem comprovante, tabela por processo, "Lançar custo" → `CustosAba.tsx`
- [x] **T-219** `[P]` — Aba Alertas, opção **A** (Lista por severidade): fichas por tipo, tabela, abrir processo ou dossiê → `AlertasAba.tsx`
- [x] **T-220** `[P]` — Aba Visão gerencial, opção **C** (Abas por pergunta): 4 números fixos, resumo, 4 abas de indicadores com gráficos, indicadores por etapa → `VisaoGerencial.tsx`
- [x] **T-221** — Notificação e demonstrativo, opção **C** (Conferência em passos): 4 e 2 passos, papel em HTML com folha de impressão A4, emissão e impressão → `DocumentoPassos.tsx`, `Papel.tsx`
- [x] **T-222** — Carga inicial, opção **C** (Passo a passo): 5 passos, envio de 1 processo por chamada com progresso e pausa, **devedor com dois candidatos pelo nome (C-023)** no passo do vínculo → `CargaPassos.tsx`
- [x] **T-223** `[P]` — **Cadastro das filiais credoras**, no padrão tabela e diálogo → `FiliaisCredoras.tsx`

### Testes de tela → `frontend/tests/003-juridico.test.mjs`

- [x] **T-250** `[P]` — `test('RN-021: …')`: 0, 3, 4, 7, 8 e −2 dias → tom e texto
- [x] **T-251** `[P]` — `test('RN-027: …')` (leitura): etapa pelo texto, autor do andamento, "R$ 7.250,30", data 46350, fusão entre abas; `semelhanca` com os casos do servidor
- [x] **T-252** `[P]` — `test('RN-028: …')`: 38761D paga, FF6D01 aberta, FFFF00 a confirmar
- [x] **T-253** `[P]` — `test('RF-019: …')`: 16 colunas, `;`, "40000,00", aspas em campo com `;`
- [x] **T-254** `[P]` — `test('gancho: …')`: `motivoDeDestino` nas 7 regras, com as frases de 04 §8 (Supervisor em `dossie → recebido` com dossiê enviado aceito)

## Verificação

- [ ] **T-300** — `cd backend && npm test` verde
- [ ] **T-301** — `cd frontend && npm test` verde; `npm run build` e `npm run lint` limpos
- [ ] **T-302** — Verificação manual da spec no simulador: C-001 a C-009 no card ("Mover para", recusas, "Montar dossiê" pela cobrança); C-007 dossiê público; C-018 e C-019 em PDF A4; C-020 e C-023 com a planilha de teste; "Novo processo" e filiais; CSV no Excel
- [ ] **T-303** — Temas claro e escuro sem cor quebrada nas 5 abas, no card e no papel; anti-padrões do `design.md` §14 conferidos
- [ ] **T-304** — `tasks.md` marcado e pedido original relido item a item

## Dependências

```
T-001 → T-002 → T-011 → T-014, T-015, T-016, T-017, T-019, T-020
T-003, T-004, T-005, T-006, T-007, T-008 [P] → T-010
T-009 → T-010 → T-012, T-013 → T-018
T-014 … T-020 → T-021 → T-022 → T-101 … T-157 → T-160 → T-161
T-160 → T-200 → T-210 → T-211 → T-212, T-213 → T-214, T-215, T-216
T-201 … T-206 [P] → T-250 … T-254
T-210 → T-217, T-218, T-219, T-220, T-223 [P]
T-204, T-205 → T-222 · T-213 → T-221
T-211 … T-223, T-250 … T-254 → T-300 … T-304
```

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001, RF-002, RF-005, RF-007 / C-001, C-002, C-007, C-008 | T-005, T-014, T-214 | T-117, T-118, T-119, T-122, T-129 |
| RF-003, RF-004 / C-006 | T-014, T-214 | T-121, T-124 |
| RF-006 / C-003, C-004, C-005 | T-006, T-011, T-014, T-214 | T-123, T-125 a T-128 |
| RF-008 a RF-011 / C-009 | T-009, T-015, T-206, T-211, T-213 | T-148, T-149, T-254 |
| RF-012, RF-013 / C-010 | T-012, T-211, T-212 | T-101, T-139, T-147 |
| RF-014, RF-029 | T-007, T-018, T-210, T-211 | T-102, T-103 |
| RF-015, RF-016, RF-017 / C-023 | T-013, T-015, T-213, T-215, T-216 | T-107, T-110, T-120, T-153, T-154 |
| RF-018 / C-011 | T-015, T-213 | T-106, T-137 |
| RF-019 | T-202, T-212 | T-253 |
| RF-020, RF-021, RF-022 / C-012 | T-005, T-012, T-016, T-018, T-218 | T-108, T-109, T-138 |
| RF-023 | T-006, T-007 | T-110, T-111 |
| RF-024, RF-025, RF-026, RF-027 / C-013, C-014, C-015 | T-006, T-011, T-017, T-213, T-217 | T-140 a T-146 |
| RF-028 / C-016, C-024 | T-007, T-018, T-219 | T-102, T-112, T-115, T-116 |
| RF-030, RF-031 / C-017 | T-007, T-018, T-220 | T-103, T-113 |
| RF-032, RF-033 / C-018, C-019 | T-004, T-006, T-019, T-221 | T-130 a T-136 |
| RF-034 | T-019, T-223 | T-131, T-150 |
| RF-035 a RF-038 / C-020, C-021 | T-008, T-020, T-203, T-204, T-205, T-222 | T-151, T-152, T-155, T-156, T-251, T-252 |
| RF-039 / C-022 | T-011, T-012, T-013 | T-104, T-114, T-150 |
| RF-040 | T-014 a T-020 (`auditar()`) | T-126 |
| RN-021 | T-201 | T-250 |
| RNF-001, RNF-002, RNF-004 | T-012, T-018 | T-302 (cronômetro com massa gerada) |
| RNF-003 | T-020, T-222 | T-157 (execuções por processo), T-302 |
| RNF-005 | preâmbulo da 001 (`agora()`, `HOJE_SQL`) | T-126, T-128 |
| RNF-006 | T-013 | T-114 |
