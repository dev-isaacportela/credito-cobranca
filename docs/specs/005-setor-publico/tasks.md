# Tasks: Setor público — nota fiscal, motor do órgão, regras por ente, comunicação e certidões

**Plan:** [`plan.md`](plan.md) · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`. Nome de tabela, coluna, parâmetro e assinatura: o
> contrato (`02 §005`, `03 §15–16`, `04 §5`); a tarefa cita, não repete.
>
> `[P]` = paralelizável (arquivos distintos, sem dependência entre si).
> **(PA-nn)** = pedido de `docs/contrato/pedidos/005-setor-publico.md`, já decidido em
> `docs/contrato/pedidos/00-respostas.md` e incorporado ao contrato e ao plano.
>
> Pré-requisito: 001, 002 e 004 construídas (fase B do `docs/execucao.md`). 003 é
> opcional (só a segunda metade do C-023). Nada aqui roda em produção.

## Trilha Backend

### Base do módulo

- [ ] **T-001** — DDL das 5 tabelas de 02 §005, com índices e `UQ`; colunas `PROX_PASSO`, `PROX_PASSO_DATA` **(PA-01)** e `CANCELADA` **(PA-07)** → `backend/schema/005-setor-publico.mjs`. Prova: `npm run sim:check`
- [ ] **T-002** `[P]` — 15 chaves `pub.*` e 47 `pubMotor.*` de 03 §15–16 com padrão, tipo e rótulo; `validarConjunto` (ordens `L1 < L2 < L3`, `G1 < … < G5`, cortes decrescentes, fatores entre 0 e 1); vigências de `pub.pequenoValor` **(PA-11)** → `backend/lib/parametros/005-setor-publico.mjs`. Prova: T-121, T-154
- [ ] **T-003** `[P]` — 7 modelos `PUB_*` com assunto e corpo do Anexo A da spec (`PUB_ANALISE`, `PUB_PROTOCOLO`, `PUB_LIQ`, `PUB_FILA`, `PUB_PAGAMENTO`, `PUB_OFICIO`, `PUB_REQUERIMENTO`, 04 §5); `PUB_OFICIO` e `PUB_REQUERIMENTO` com efeito legal (exigem validação); campos extras **(PA-10)** → `backend/lib/modelos/005-setor-publico.mjs`. Prova: T-139, T-155, T-156
- [ ] **T-004** `[P]` — `motorOrgao`, `fimMandato`, `capacidadeSugerida`, `podeAprovar`; saída com `pontos`, `travas`, `faltando`, `decisaoSugerida` **(PA-03)** → `backend/lib/setor-publico/motor.mjs`. Prova: T-101 a T-112
- [ ] **T-005** `[P]` — `regraDaNf`, `prazosNf`, `mais2Meses`, `etapaNf`, `situacaoNf`, `validarDatas`; fragmentos `SITUACAO_NF_SQL` e `DIAS_ATRASO_NF_SQL`; `REGRAS_INICIAIS` (5, todas a confirmar) → `backend/lib/setor-publico/nf.mjs`. Prova: T-113 a T-119
- [ ] **T-006** — `reguaNf`, `passoAtual`, `etapaOrgao` (data devida — **PA-02**), `proximaAcaoOrgao`, `tipoMensagem` → `backend/lib/setor-publico/nf.mjs`. Prova: T-120, T-134, T-136, T-138
- [ ] **T-007** — `historicoPagamento`, `situacaoCertidao`, `alertaContrato` → `backend/lib/setor-publico/nf.mjs`. Prova: T-122, T-123, T-131
- [ ] **T-008** `[P]` — SQL Oracle da leitura de NFs (novas por cursor e abertas por lista — **PA-20**) → `backend/lib/setor-publico/winthor-nf.mjs`. Prova: T-124
- [ ] **T-009** `[P]` — `gancho('concessao-publica')`: trecho de 04 §8, ligado por `K.ID` (01 §14); outro slug devolve `''` → `backend/lib/quadros/005-setor-publico.mjs`. Prova: T-141, T-142
- [ ] **T-010** — esqueleto do módulo: `definitions` (vazio), preâmbulo das libs, `isEntrypoint()` que insere `REGRAS_INICIAIS` se a tabela estiver vazia (na publicação; no simulador quem insere é a T-031, com a mesma condição — DT-38) → `backend/add-050-setor-publico.mjs`. Prova: `sim:check`; T-129

### Server Functions (todas em `backend/add-050-setor-publico.mjs`)

- [ ] **T-011** — `ccEscPubAnaliseInserir`, `ccEscPubAnaliseAtualizar` (guarda: ator, visibilidade, estado da decisão — **PA-18**), `ccEscPubAnaliseMotor` (`…Inserir`/`…Atualizar` gravam `ATUALIZADO_POR` e acrescentam quem salva à lista `PROPOSTA_POR`, autores da proposta na Pública; `…Motor` não mexe em nenhum dos dois: fechamento v2, acabamento pós-v3). Prova: T-142, T-158 e o RN-007 (e) da 004
- [ ] **T-012** — `ccPubAnaliseObter`: análise, sugestões (`atrasoMedio`, `esfera`; sem `perfilPag`), regra do órgão com situação, `historico` **(PA-04)**, `motor` calculado na mesma execução, sem gravar (`null` sem análise; **DT-42**). Prova: T-131, T-164
- [ ] **T-013** — `ccPubMotorCalcular`: entrada `membroId (0)` e visibilidade sobre o membro de `quem()` (aninhada pela 004, **DT-34**); com `gravar = 0` e card em `comite`, aceita também nível ≥ `alcada.nivelSupervisor` sem o cliente visível (decisor fora do caso, **B-C3**); `gravar = 0` prévia, `gravar = 1` grava a fotografia `RATING_PUB`/`EXPOSICAO`/`CALCULADO_EM` (botão "Calcular", **DT-36**); `podeAprovar`, `motivoNaoAprovar`, `travas` **(PA-03)**. Prova: T-142, T-145, T-146, T-148, T-151
- [ ] **T-014** — `ccPubAnaliseSalvar`: opções fechadas, capacidade sugerida × manual, grava a fotografia do motor que a decisão da 004 confere (**DT-36**) e devolve o motor, auditoria na área `Setor público`; 4 execuções. Prova: T-142, T-144, T-166
- [ ] **T-015** `[P]` — SQL Oracle das NFs (`winthor-nf.mjs`), lido só pela rotina por `runQueryMitra`; `ccPubWinthorNf` não é publicada (C-03 da B3: ninguém a chama, e no perfil leria NF de qualquer cliente). Prova: T-124
- [ ] **T-016** — `ccPubRotina`, passos 1–4 do plano: novas, abertas, gravar (upsert, contratação, `PRE_APROVADA` — **PA-19**), recalcular e gravar só a diferença. Prova: T-124, T-125, T-126, T-160
- [ ] **T-017** — `ccPubRotina`, passos 5–7: baixa, órgãos (fase, prazo, capa com `etiquetas` só `Acima de 2 meses` e `Pequeno valor`, próxima ação; `ccCobCasoSincronizar` só na diferença com `CAPA_ENVIADA` — **PA-08** —, com `nota` "Etapa do órgão: <nome>" quando a fase muda e sem `responsavelUserId`, 05 §3.7), orçamento (reserva de 13 por órgão) e `pendentes`. Prova: T-133, T-134, T-136, T-161, T-162, T-163, T-164
- [ ] **T-018** — `ccPubNfListar` + `ccPubNfTotal`: recorte por visibilidade, situação e atraso por SQL, filtros, busca, ordem, colunas e somatórios **(PA-14)**. Prova: T-125, T-132, T-133
- [ ] **T-019** — `ccPubNfFicha`: NF, regra, `passos[]` com `podeFeito`, contratações, `pode`. Prova: T-125, T-138
- [ ] **T-020** — `ccEscPubNfDatas` (guarda: caso visível, NF não paga) + `ccPubNfDatasSalvar`: `validarDatas`, recálculo, auditoria `Notas fiscais`, caso do órgão só se mudou, por `ccCobCasoSincronizar` **como pessoa** (`membroId`, duas origens — **DT-34**), com o `capaJson` completo também na mudança de fase e a `nota` "Etapa do órgão: <nome>" quando a fase muda; `analiseId` só contratação do mesmo órgão; sem entrada `regraId`; 3, 9 ou 16 execuções **(PA-05, PA-24, PA-25)**. Prova: T-150, T-151, T-165 (com `nasDuasSessoes`: card movido, nota e ≤ 20 nas duas), T-167, T-164
- [ ] **T-021** `[P]` — `ccPubMensagemPreparar`: tipo pelo passo ou pela situação **(PA-22)**, campos da NF, destinatário pela função do contato. Prova: T-134, T-139
- [ ] **T-022** — `ccEscPubNfAcaoInserir` + `ccEscPubNfPassoAtualizar` (guarda: caso visível, NF não paga) + `ccPubNfPassoRegistrar`: aplicável, idempotente, antecedência, e-mail antes do passo, `PROX_PASSO*` regravado no clique, auditoria, contato pela 002 (`ccCobContatoRegistrar` com `origem 'REGUA_PUB'`, `retorno ''`, `feedback` "<passo> feito" + `obs`, `nfId`, `emailEnviadoId`, `membroId`) sempre com `proxAcao`/`proxAcaoData` do novo passo atual; 14 ou 18 execuções **(PA-05, Fechamento 16/11, 04 §5)**. Prova: T-153 a T-156, T-164
- [ ] **T-023** `[P]` — `ccPubReguaCumprimento` **(PA-01)**. Prova: T-153
- [ ] **T-024** `[P]` — `ccPubContratoListar` + `ccPubContratoTotal`. Prova: T-147
- [ ] **T-025** `[P]` — `ccPubResumo` (`buId` — **PA-09**; `mes` e as colunas do funil por `ETAPA_NF`, 04 §5 — **DT-33**). Prova: T-133, T-140, T-147, T-162
- [ ] **T-026** `[P]` — `ccEscPubRegraInserir`, `ccEscPubRegraAtualizar`, `ccPubRegraEnteListar`, `ccPubRegraEnteSalvar` (editar `NIVEL_MIN(2)`; validar Jurídico ou `NIVEL_MIN(3)` com link — a marca `ADMIN` atende os dois, D-06; volta a "A confirmar" quando o prazo muda); auditoria `Regras por ente`. Prova: T-129, T-152, T-157
- [ ] **T-027** `[P]` — `ccEscPubCertidaoInserir`, `ccEscPubCertidaoAtualizar`, `ccPubCertidaoListar` (vigente por tipo; histórico — **PA-12**), `ccPubCertidaoSalvar` (`NIVEL_MIN(2)`, D-06); auditoria `Certidões`. Prova: T-140, T-159
- [ ] **T-028** — nota de entrega ao integrador no cabeçalho do `add-050`: 28 SFs com id local 5001–5018 e 5051–5060, `CHECK_INPUT` do plano, tabelas Winthor usadas (`PCNFSAID`, `PCPREST`, `PCPEDC`), rotas e `extensoes.ts`; prompt de sandbox (**DT-39**): depois do `add-050`, republicar o `add-010` e o `add-040`. Prova: `sim:check` lista as 28

### Seed → `backend/simulator/seed/005-setor-publico.mjs`

- [ ] **T-030** — `winthor()`: clientes 5001–5006 e as 11 notas do plano (1006 e 1007 pagas, 1010 cancelada, 1099 privada) com `nota()` **(PA-16)**; datas por `dia(n)` do `RELOGIO` (**DT-38**); o smoke exporta `RELOGIO = '2026-12-01T10:00:00'`
- [ ] **T-031** — `dominio()`, tabelas da 005: 5 regras (só com a tabela vazia), 4 certidões, marcos das NFs, passos `L1` e `L2` da 1001; datas por `dia(n)`
- [ ] **T-032** — `dominio()`, pelas SFs de 001, 004 e 005 com `comRelogio(dia(n), …)`: `base.ramosEsfera`, contatos (a atribuição a Carlos vem do passo 7 do pipeline); contratações do 5001 e do 5004 em `dia(-42)`: solicitação e `ccPubAnaliseSalvar` como Carlos (dados, `VALOR_ESTIMADO` 600.000 e 50.000, fotografia P1/100.000 e P2/40.000 — **DT-36**), aprovadas por Silvia com limite = exposição; solicitação do 5002 criada em `dia(-11)` e na Análise desde `dia(-10)`. Sem `rodarCron`: a leitura e o processamento finais são o passo 11 do pipeline (**DT-38**). Prova: T-130, T-145

### Smoke — um `teste()` por linha da seção Testes da spec → `backend/simulator/smoke/005-setor-publico.mjs`

O nome do teste começa pelo id (`teste('C-014: …')`). Ordem fixa: blocos A → B → C → D. O `assert` de cada um está no mapa de testes do plano. Aqui `[P]` = teste que não depende da ordem dos vizinhos (o arquivo é um só: quem paraleliza divide por bloco).

**Bloco A — lib pura, sem banco** (todas `[P]` entre si)

- [ ] **T-101** `[P]` — `C-008` (lib): `motorOrgao` → 87, P1, 200.000, Aprovar, pontos 22/10/10/15/20/0/10
- [ ] **T-102** `[P]` — `C-009`: 70, P3 pela trava, 150.000, Reduzir
- [ ] **T-103** `[P]` — `C-010`: estadual 79, P2, 400.000; municipal 84, P1, 500.000
- [ ] **T-104** `[P]` — `C-004` e `RN-005`: `podeAprovar` com vigência vencida, saldo zero e vigência igual a hoje
- [ ] **T-105** `[P]` — `RN-009`: empenho prévio "Não" → `SEM_EMPENHO`
- [ ] **T-106** `[P]` — `RN-010`: pontos de "não informado" por esfera e limites de pessoal e fonte
- [ ] **T-107** `[P]` — `RN-011` (lib): `capacidadeSugerida` por CAPAG
- [ ] **T-108** `[P]` — `RN-012`: perfil × atraso médio × sem histórico
- [ ] **T-109** `[P]` — `RN-013`: `fimMandato` nas quatro datas
- [ ] **T-110** `[P]` — `RN-014`: cortes de rating e trava de pessoal
- [ ] **T-111** `[P]` — `RN-015`: exposição arredondada
- [ ] **T-112** `[P]` — `RN-016`: decisão sugerida sem base, sem contrato e com nota 30
- [ ] **T-113** `[P]` — `C-028` (lib) e `RN-019`: `regraDaNf` por esfera, UF, contratação e regra inativa
- [ ] **T-114** `[P]` — `RN-020`: marco sem protocolo, pagar até da 1002, regra em dias corridos
- [ ] **T-115** `[P]` — `RN-021`: pequeno valor pela data de emissão e pela contagem; valor estimado zero não é pequeno valor
- [ ] **T-116** `[P]` — `C-015` (variante) e `RN-022`: contratação de 70.000; prazo de contrato de 30 dias sem corte
- [ ] **T-117** `[P]` — `C-016` (variante): sem o feriado do DF → 2026-11-30
- [ ] **T-118** `[P]` — `RN-023`: `mais2Meses` nas três emissões
- [ ] **T-119** `[P]` — `RN-024` (lib): NF sem protocolo continua "a protocolar" com hoje simulado
- [ ] **T-120** `[P]` — `RN-028` (empate) e `RN-030` (lib): `passoAtual` no empate `L3`/`G2`; `etapaOrgao` com `L3` vencido e não feito
- [ ] **T-121** `[P]` — `validarConjunto` recusa `rpL2 < rpL1` e corte fora de ordem (apoio à T-002)
- [ ] **T-122** `[P]` — `RN-036` (limite): `situacaoCertidao` em hoje + 15 e hoje + 16
- [ ] **T-123** `[P]` — `RN-037` (limite): `alertaContrato` em 60 e 61 dias, 20 % e 19,99 %
- [ ] **T-143** `[P]` — `RN-007` (lib da 004, sem banco): `alcadaConcessao()` com os valores da `PUBLICA` nos quatro limites e acima da exposição → Comitê de crédito; sem a lib, `pular('depende de 004')` (saiu do bloco C para não mexer no 5002, validador C-4)

**Bloco B — leituras do estado do seed**

- [ ] **T-124** — `C-013` (primeira parte): 7 em aberto, 2 pagas, sem a 1010 e a 1099; nova rodada mantém 9
- [ ] **T-125** `[P]` — `C-014`: prazos, situação e 32 dias da 1001; lista = ficha
- [ ] **T-126** `[P]` — `C-015` e `C-016` (banco): 1003, 1004 e 1005 gravadas com os prazos e as marcas
- [ ] **T-127** `[P]` — `C-028` (banco): `REGRA_ID` de 1004, 1001, 1003, 1002
- [ ] **T-128** `[P]` — `RN-020` (banco) e `RN-024`: 1002 com pagar até 2026-11-04; 1004 em `OP` e `NO_PRAZO`
- [ ] **T-129** `[P]` — `RN-035` (estado inicial): 5 regras, todas a confirmar
- [ ] **T-130** `[P]` — `C-001` e `RN-001`: três fases com 24, 192 e 48 h; solicitação do 5002 com decisão para 2026-12-01 e Análise estourada
- [ ] **T-131** `[P]` — `C-011`: histórico do 5004 (2, 1, 6, 20, 13) e nota 85 sem perfil
- [ ] **T-132** `[P]` — `C-017`: filtro acima de 2 meses → 1002 e 1009
- [ ] **T-133** `[P]` — `C-019` e `RN-026`: indicadores para Gustavo, recorte de Carlos, Silvia e Ana, capa do 5001, posição do 5003 intacta
- [ ] **T-134** `[P]` — `C-020` e `RN-028`: passo atual das cinco NFs, agenda de Carlos com uma ação por órgão, mensagem do `G4` da 1001
- [ ] **T-135** `[P]` — `C-025`: sem bloqueio, fila, quadro privado nem acordo para o 5003
- [ ] **T-136** `[P]` — `C-022` e `RN-030`: resumo do quadro (1, 2, 1) e recusa de mover o card do 5001
- [ ] **T-137** `[P]` — `RF-017`: ordem da lista (vencidas primeiro, por pagar até) e busca por empenho e por órgão
- [ ] **T-168** `[P]` — `RN-002` e `RN-031`: itens semeados de `concessao-publica` e itens e SLA de `cobranca-publica` (48/120/240/240 h), texto de 05 §4.2 e §3.3
- [ ] **T-138** `[P]` — `RN-027`: os passos da 1001 com as datas; 1002 sem `CONF` e sem `L*`
- [ ] **T-139** `[P]` — `RN-033` (tipo): modelo sugerido para 1002, 1008, 1005, 1001, 1004
- [ ] **T-140** `[P]` — `C-029`: situação das quatro certidões e o resumo (2 vencendo, 1 vencida)

**Bloco C — concessão pública (funções da 004 + esta spec)**, em ordem

- [ ] **T-141** — `C-002`: recusa pelos itens; depois pela frase do gancho
- [ ] **T-142** — `RN-003` e `C-008` (banco): `ccPubAnaliseSalvar` devolve o motor; card entra em `comite`
- [ ] **T-144** — `RN-011` (banco): capacidade manual sobrevive à troca da CAPAG (solicitação do 5003)
- [ ] **T-145** — `C-005`: 350.000 Silvia recusada; Gustavo com 350.000,01 (acima da exposição) recusado por Comitê de crédito; com 350.000 aceito na faixa Gerente; decisão do 5004 com alçada Supervisor e `LIMITE_MOTOR` 40.000
- [ ] **T-146** — `C-003`: edital 1.200.000 — Aprovada recusada, Pré-aprovada só pela Diretoria (faixa, sem exceção), card fica em `comite`, `PRE_APROVADA` conciliada
- [ ] **T-148** — `C-012` e `RN-018`: rating público P1 no crédito e na decisão, `LIMITE_MOTOR` 200.000, `ANALISE_ORGAO_ID` no crédito, alçada Gerente; privado vazio; sem risco calculado
- [ ] **T-147** — `C-031` e `RN-037`: 4 contratos, 2 em alerta, resumo 2 — último do bloco C (lê os contratos aprovados na T-145 e na T-148)

**Bloco D — escritas**, em ordem

- [ ] **T-150** — `C-018` e `RN-025`: as quatro recusas de data
- [ ] **T-165** — `RF-013` (com `nasDuasSessoes`): datas da 1004 sem liquidação levam a SES-DF a `liquidacao_vencida` no clique, com nota e `FASE_DEVIDA`, 16 execuções; relançar devolve a `nf_protocolar`
- [ ] **T-166** — `RF-004`: opção fechada recusada; depois da decisão CAPAG recusada e saldo aceito (e devolvido)
- [ ] **T-167** — `RF-014`: 1001 ligada à contratação do 5002; contratação de outro órgão recusada
- [ ] **T-151** — `RN-038`: Ana não encontra; autor é o da sessão; visitante recusado; `ccPubMotorCalcular` por `como(null)` com `membroId` (**DT-34**); Sérgio lê o motor do 5005 em `comite` sem gravar, é recusado ao gravar e fora de `comite` (**B-C3**)
- [ ] **T-152** — `C-027`: aviso na 1005; Silvia recusada; sem link recusado; com link Verificado por Gustavo em 2026-12-01
- [ ] **T-153** — `C-021`: `L3` fora do prazo, `M2` no prazo, `G4` recusado; cumprimento 2 feitos, 1 no prazo; 2 contatos com `ORIGEM` `REGUA_PUB`
- [ ] **T-154** — `RN-029`: antecedência 15 libera o `G4`; volta a 2
- [ ] **T-155** — `RN-033` (envio): `L1` da 1003 enviado sem validação
- [ ] **T-156** — `C-024`: ofício recusado sem validação e nada gravado; validado por Júlia → e-mail com origem e referência, passo e contato ligados ao e-mail
- [ ] **T-157** — `RN-035` (escrita): Ana recusada; Tocantins validada e de volta a "A confirmar" quando Silvia muda o prazo
- [ ] **T-159** — `RN-036`: renovação da CND federal → válida, duas linhas do tipo
- [ ] **T-160** — `C-013` (segunda parte): NF de duas parcelas no 5005, uma paga e depois as duas
- [ ] **T-161** — `C-023`: `G5` devido e órgão em `requerimento`; com a 003, dossiê enviado e `juridico` mantido; sem a 003, `pular('depende de 003')`
- [ ] **T-162** — `C-026`: 1003 paga em 2026-12-01 → 14 dias, caso regularizado, fora da agenda; recebido no mês do resumo + 30.000
- [ ] **T-163** — `RN-032`: baixa do 5002 pela 002 → 1001 `BAIXADA`, sem caso novo
- [ ] **T-158** — `RN-039`: uma linha de auditoria por área (análise, data, passo, regra, certidão) — roda por último
- [ ] **T-164** — orçamento: lista ≤ 6; abrir o card de `concessao-publica` do 5002 em `analise` e o de `cobranca-publica` do 5001 = 3 cada (**DT-42**; esta parte roda no bloco B, antes do C); `ccPubNfDatasSalvar` com mudança de fase 16; `ccPubNfPassoRegistrar` 18 com e-mail e 14 sem (≤ 20, DT-29); rodada ≤ 150

### Verificação do backend

- [ ] **T-170** — `cd backend && npm test` verde (`sim:check` + `sim:smoke`) com `SIM_SESSAO_ANINHADA=0` e `=1`
- [ ] **T-171** — nenhum `pular()` além de "depende de 003"; nenhuma SF da 005 fora do prefixo `ccPub`/`ccEscPub`; nenhum nome de tabela ou parâmetro fora do contrato (`grep`)

## Trilha Frontend

Começa depois da T-170. Opção de cada tela: tabela "Superfície de interação" do plano. Só vocabulário do design system e tokens; nada de arrastar.

- [x] **T-201** — regra pura de tela: `textoSituacao`, `etiquetaRegra`, `documentoRecebivel`, `evidenciasExigidas`, `tiposSemCertidao`, `rotuloDecisao` → `frontend/src/lib/setor-publico/formato.ts`. Prova: T-281 a T-284
- [x] **T-202** `[P]` — `Trilho` (horizontal, compacto, editável; vira lista em telefone), `BarraPontos`, `BarraPrazo` → `frontend/src/modules/005-setor-publico/componentes.tsx`
- [x] **T-203** `[P]` — rotas `/publico/notas-fiscais`, `/publico/regras-ente`, `/publico/comunicacao`, `/publico/certidoes` e itens de menu → `frontend/src/modules/005-setor-publico/index.ts`
- [x] **T-204** — aba "Etapas e prazos" (`nf-etapas-prazos` A) → `FluxoNfPage.tsx`
- [x] **T-205** — aba "Notas fiscais em tramitação" (`nf-tramitacao` C), como componente reutilizado pela aba do card → `NotasFiscaisLista.tsx` + `FluxoNfPage.tsx`
- [x] **T-206** — diálogo de datas sobre o trilho (`nf-datas` B); a regra do ente só exibida, sem escolha **(PA-24)** → `NfDatasDialog.tsx`
- [x] **T-207** `[P]` — aba "Contratos", terceira aba da página Fluxo da NF pública, com a listagem padrão do design system (`ccPubContratoListar` + `…Total`) **(PA-13)** → `ContratosAba.tsx` + `FluxoNfPage.tsx`
- [x] **T-208** `[P]` — Regras por ente (`regras-ente` B) → `RegrasEntePage.tsx`
- [x] **T-209** `[P]` — Comunicação com o órgão (`comunicacao-orgao` C; versões — **PA-23**) → `ComunicacaoPage.tsx`
- [x] **T-210** `[P]` — Certidões (`certidoes` B; arquivo pelo `enviarArquivo` da 001) → `CertidoesPage.tsx`
- [x] **T-211** `[P]` — ficha do órgão e bloco do motor (`concessao-motor` B), abrindo com uma leitura (`ccPubAnaliseObter`, que traz `motor` — **DT-42**), com "Calcular" (`ccPubMotorCalcular` com `gravar = 1` — **DT-36**), evidências e "Pedir fluxo de pagamento ao órgão" **(PA-22)** → `AnaliseOrgao.tsx`, `MotorOrgao.tsx`
- [x] **T-212** `[P]` — bloco "Régua da NF" do card de cobrança: passo atual de cada NF por `ccPubNfListar({ clienteId })` (uma leitura ao abrir), com "Feito" e "Enviar" (confirmação antes do envio), dez passos ao expandir (`ccPubNfFicha`) → `ReguaNf.tsx`
- [x] **T-213** — `registrarExtensao()` para `concessao-publica` (blocos em `analise`, `comite`, `gestao`; aba "Notas fiscais") e `cobranca-publica` (bloco da régua; abas "Notas fiscais" e "Regra do ente"; duas ações); espelho `podeMover` de `concessao-publica` com a frase do trecho (01 §14) → `extensoes.ts`

### Testes de tela → `frontend/tests/005-setor-publico.test.mjs`

- [x] **T-281** `[P]` — `test('RF-016: …')`: `textoSituacao` e `etiquetaRegra`
- [x] **T-282** `[P]` — `test('C-030 e RN-034: …')`: `documentoRecebivel` das quatro NFs
- [x] **T-283** `[P]` — `test('RN-017: …')`: `evidenciasExigidas` — 5 no edital, 6 no contrato
- [x] **T-284** `[P]` — `test('C-029: …')`: `tiposSemCertidao` → só a CND municipal

### Verificação do frontend

- [ ] **T-290** — `cd frontend && npm test` verde; `npm run build` e `npm run lint` limpos
- [x] **T-291** — manual no simulador, C-008: bloco do motor com nota, rating, exposição e decisão em destaque, nos dois temas
- [ ] **T-292** — manual, C-020: da agenda da 002 à NF, mensagem preenchida, envio com confirmação
- [x] **T-293** — manual, C-014 a C-016: trilho por nota com as datas e o ponto em que travou; datas lançadas sobre o trilho
- [x] **T-294** — manual, RF-034: fluxo da NF em telefone (trilho vira lista)
- [ ] **T-295** — RNF-001 e RNF-002 cronometrados na massa de teste (5.000 NFs geradas por script no scratch, fora do seed)
- [ ] **T-296** — modo Revisar da skill `design` nas 7 telas e nas extensões: tokens, tema claro, sem classe solta

## Dependências

```
T-001 → T-010 → T-011 … T-027 → T-028
T-002, T-003, T-004, T-005, T-008, T-009 [P] entre si · T-005 → T-006 → T-007
T-004 → T-013 → T-014 · T-011 → T-014
T-005, T-006, T-008, T-015 → T-016 → T-017
T-005, T-006 → T-018, T-019, T-020, T-021 · T-021 → T-022 · T-020 antes de T-022 (mesmo trecho de "caso do órgão")
T-016, T-017, T-018 → T-030 → T-031 → T-032 → blocos B, C, D
Bloco A depende só de T-004 a T-007 (pode andar antes das SFs)
Bloco B → Bloco C → Bloco D (ordem do arquivo) → T-170 → Trilha Frontend
T-201, T-202, T-203 → T-204 … T-212 → T-213 → T-290 … T-296
Externas: 001 (base), 004 (concessão) e 002 (cobrança) antes da T-016; 003 só para a T-161
```

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001 / C-001, RN-001 | função da 004; T-032 | T-130 |
| RF-003 / C-002, C-003, C-004, RN-003, RN-005 | T-004, T-009, T-013 | T-104, T-141, T-142, T-146 |
| RF-004 / C-008 | T-001, T-011, T-014, T-211 | T-142, T-166 |
| RF-005 / C-008–C-010, RN-009–RN-016 | T-002, T-004, T-013, T-014, T-211 | T-101–T-112 |
| RF-006 / RN-011 | T-004, T-014 | T-107, T-144 |
| RF-007 / C-011 | T-007, T-012, T-211 | T-131 |
| RF-008 / C-005, RN-007 | função da 004 (parâmetros da carteira) | T-143, T-145 |
| RF-010 / C-012, RN-018 | T-011, T-013 | T-148 |
| RF-011 / RN-017 | T-201, T-211 | T-283 |
| RF-012 / C-013 | T-008, T-015, T-016, T-030 | T-124, T-160 |
| RF-013 / C-018, RN-025 | T-005, T-020, T-206 | T-150, T-165 |
| RF-014 / C-015, C-016 | T-016, T-020, T-206 | T-116, T-126, T-167 |
| RF-015 / C-014–C-016, RN-019–RN-023 | T-005, T-016 | T-113–T-118, T-125–T-128 |
| RF-016 / C-014, RN-024 | T-005, T-018, T-201 | T-119, T-125, T-128, T-281 |
| RF-017 / C-017 | T-018, T-205 | T-132, T-137 |
| RF-018 / C-019 | T-018, T-025, T-205 | T-133, T-162 |
| RF-019 / RN-027 | T-006, T-019, T-212 | T-138 |
| RF-020 / C-020, RN-028 | T-006, T-017 | T-120, T-134 |
| RF-021 / C-021, RN-029 | T-022, T-023, T-212 | T-153, T-154 |
| RF-022 / C-020, C-024, RN-033 | T-003, T-021, T-022 | T-134, T-139, T-155, T-156 |
| RF-023 / C-022, C-026, RN-030 | T-006, T-017 | T-120, T-136, T-162 |
| RF-025 / C-023, RN-032 | T-006, T-017 | T-161, T-163 |
| RF-026 / C-019, RN-026 | T-017, T-018 | T-133 |
| RF-027 / C-025 | função da 002 (carteira `PUBLICA`) | T-135 |
| RF-028 / C-027, C-028, RN-035 | T-005, T-010, T-026, T-208 | T-113, T-127, T-129, T-152, T-157 |
| RF-029 / C-027 | T-012, T-019, T-205, T-211 | T-152 |
| RF-030 / C-024 | T-003, T-209 | T-156 |
| RF-031 / C-029, RN-036 | T-007, T-027, T-210 | T-122, T-140, T-159 |
| RF-032 / C-029 | T-025, T-027, T-201, T-210 | T-140, T-284 |
| RF-033 / C-030, RN-034 | T-201, T-205 | T-282 |
| RF-034 | T-202, T-204 | T-294 (manual) |
| RF-035 / RN-038 | T-018, T-020, T-024, T-025 | T-133, T-151 |
| RF-036 / C-031, RN-037 | T-007, T-024, T-025, T-207 | T-123, T-147 |
| RNF-001, RNF-002 | T-016, T-018 | T-295 |
| RNF-003 / RN-039 | T-014, T-020, T-022, T-026, T-027 | T-158 |
| RNF-004 / C-016 | T-005 | T-117, T-126 |
| Orçamento de execuções (01 §10) | T-017, T-020, T-022 | T-164 |
| RF-009, C-006, C-007, RN-004, RN-006, RN-008 | removidos — cobertos por 004 pela regra única (D-05; cenários da Privada) | testes da 004 |
| RF-002, RF-024, RN-002, RN-031 | removidos — dado dos quadros da 004 e da 002; a prova na `PUBLICA` fica aqui | T-168 |
| Correção da B3 (B-01, C-01 a C-05, O-01 a O-09) | `add-050`, `add-040` (ramo público da guarda da decisão) | smoke 005 `B-01`, `C-01 (B3)`, `C-04 (B3)`, `C-05 (B3)`; `tests/005` `C-02`; smoke 004 `RN-005 (B-01 da B3-005)` |
