# Tasks: Concessão e gestão de crédito (carteiras Privada, Estética e Pública)

**Plan:** [`plan.md`](plan.md) · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c) · corrigido em 2026-11-16 pela validação v2 (DT-34 a DT-42)

> Ordem de execução. Nenhuma decisão de design se resolve aqui — se apareceu
> uma, volta pro `plan.md`. Nomes, colunas e assinaturas são os do contrato
> (`02 §004`, `03`, `04 §4` e `§8`, `05 §4`, `§5`, `§7`).
>
> `[P]` = paralelizável dentro da 004 (arquivos distintos, sem dependência entre si).
> `(PA-nn)` = pedido ao arquiteto (`docs/contrato/pedidos/004-concessao-credito.md`), aceito em
> `docs/contrato/pedidos/00-respostas.md` e já no contrato.
> Duas trilhas: **Backend** inteiro primeiro (fase B2), **Frontend** depois (F3).
> Depende da 001 construída (B1). Nada roda contra a plataforma.

## Trilha Backend

### Base do módulo

- [ ] **T-001** `[P]` — DDL das 8 tabelas de 02 §004, com as `UQ` e `IX` do contrato e as colunas de autor `CC_SOLICITACAO.PROPOSTA_POR` e `CC_PEDIDO_RETIDO.RECOMENDADO_POR` (DT-40) (um template literal por tabela) → `backend/schema/004-concessao-credito.mjs`. Prova: T-195 (simulador sobe com as 8 tabelas)
- [ ] **T-002** `[P]` — 86 chaves (`alcada.*` da concessão e do pedido com os valores da `PUBLICA`, `limite.*`, `score.*`, `farol.*`, `cred.*`, `flex.*`, `saude.*`, 4 `meta.*`) e `validarConjunto` → `backend/lib/parametros/004-concessao-credito.mjs`. Prova: T-135, T-151, T-179
- [ ] **T-003** `[P]` — Motor puro `motor(entradas, p)` (RN-011 a RN-021) → `backend/lib/concessao-credito/motor.mjs`. Prova: T-107 a T-110, T-156 a T-164
- [ ] **T-004** `[P]` — Regras puras: `tipoCliente`, `prazoDecisao`, `alcadaConcessao` (na `PUBLICA` exceção só acima da exposição, DT-36), `excessoPedido`, `alcadaPedido`, `docsExigidos`, `flexibilizacao`, `criticidade`, `saude`, `classeRisco`, `gatilhos`, `chanceAtraso`, `destinoVencimento`, `leituraFarol`, `temMotorProprio` → `backend/lib/concessao-credito/regras.mjs`. Prova: T-121, T-144, T-145, T-151, T-155, T-166, T-169, T-170, T-172, T-173, T-182
- [ ] **T-005** `[P]` — Fragmentos SQL: `RATING_EFETIVO`, `ABERTA`, `NIVEL_CONCESSAO` (ramo público pela `EXPOSICAO`, montado só com a 005 publicada: DT-36), `PROPONENTE_ADD`/`NAO_PROPONENTE` (listas de autores: acabamento pós-v3), guardas das 17 internas (plan §Internas: autor da proposta e fase antes de `comite`/`alcada` pela DT-40; transições de `…CreditoSituacao` e origem de `…PendenciaInserir` pelo ato) → `backend/lib/concessao-credito/sql.mjs`. Prova: T-150, T-151, T-178, T-185, T-188, T-192
- [ ] **T-006** — `QUADROS` dos quatro quadros (fases, SLA, cor, checklist `<fase>_<n>`, `termo_assinado`, capa, etiquetas, condições de entrada, automações de 05 §7; capa a mais: PA-08) → `backend/lib/quadros/004-concessao-credito.mjs`. Prova: T-137, T-146, T-190
- [ ] **T-007** — `gancho(slug)` para `concessao-*` (um trecho, três quadros) e `pedidos-limite`, com as frases de 04 §8 (avanço só para a fase seguinte: PA-09); cláusulas de domínio dos destinos controlados primeiro, "quem move: caso" (sem a marca) só no movimento livre (DT-35) → mesmo arquivo de T-006. Prova: T-105, T-116, T-143, T-147, T-148, T-193
- [ ] **T-008** — Esqueleto do `add-040`: `definitions` vazias, injeção do texto de `motor.mjs`/`regras.mjs`, `semearQuadro(QUADROS)` no `isEntrypoint()`; o prompt de sandbox da 004 diz que o `add-040` é republicado depois do `add-050` (DT-39) → `backend/add-040-concessao-credito.mjs`. Prova: T-195

### Server Functions (todas em `backend/add-040-concessao-credito.mjs`)

- [ ] **T-010** — As 17 internas `ccEscCred…` com a guarda de cada uma (T-005). Prova: as recusas de T-112 a T-116, T-122, T-123, T-150 (chamada direta), T-152, T-188, T-192
- [ ] **T-011** — `ccCredTipoClienteSugerir` (RN-001, carteira sugerida). Prova: T-101, T-102, T-137, T-144
- [ ] **T-012** — `ccCredSolicitacaoCriar` (ordem: domínio → analista do cliente → card → `CARD_ID` → auditoria). Prova: T-101, T-103, T-134, T-137, T-138
- [ ] **T-013** — `ccCredSolicitacaoSalvar` (bloco alterado, fotografia do motor só quando muda, `PROPOSTA_POR` como lista — também quando `…Dados` muda um campo do motor, pela própria SQL, primeira atribuição do `SET` (O-2) —, capa só se mudou) e `ccCredSolicitacaoAtribuir` (só antes de `comite`, cliente visível: DT-40, DT-41). Prova: T-105, T-106, T-147, T-150, T-154, T-178
- [ ] **T-014** — `ccCredMotorCalcular` (Privada/Estética: motor da 004; Pública: `ccPubMotorCalcular` com `membroId`, repassando `gravar` e sem gravar `CC_SOLICITACAO`, DT-36; `podeAprovar` e `motivoNaoAprovar` nos dois, 005 PA-03; simulação por `entradas`: PA-04). Prova: T-107 a T-110, T-127, T-136, T-179
- [ ] **T-015** — `ccCredSolicitacaoFicha` (posição, faturamento, consultas válidas, motor, alçada, decisões, crédito + risco, `pendencias[]`, documentos atendidos, `pode`). Prova: T-105, T-135, T-155, T-191
- [ ] **T-016** — `ccCredSolicitacaoListar`/`Total` (somatórios, PA-19), `ccCredEsteiraResumo`, `ccCredSolicitacaoHistorico`. Prova: T-125, T-133, T-138, T-145, T-178, T-189
- [ ] **T-017** — `ccCredSolicitacaoRecusar`. Prova: T-120, T-149
- [ ] **T-018** — `ccCredRatingAjustar` (grava `PROPOSTA_POR`), `ccCredRatingAjusteDecidir`. Prova: T-111, T-150, T-165, T-192
- [ ] **T-019** — `ccCredDecisaoRegistrar` (ordem e ramos do plan §Fluxo 4; segregação por `ANALISTA_ID` e pelas listas `PROPOSTA_POR` e, na Pública, `CC_ANALISE_ORGAO.PROPOSTA_POR` (fechamento v2, acabamento pós-v3); na Pública `ccPubMotorCalcular` direto, sem gravar, conferido com `CC_ANALISE_ORGAO`, e capa `rating`/`limite_sugerido` da análise: DT-36; capa, etiquetas e nota do próprio card no clique, ≤ 20: PA-01). Prova: T-112 a T-116, T-135, T-136, T-149 a T-153, T-180, T-192, T-193. O ramo público (motor do órgão conferido com a fotografia, crédito na decisão do quadro sem `liberacao`, D-004) é da 004 e está no `add-040` (C-05 da B2)
- [ ] **T-020** — `ccCredPendenciaListar`/`Total`, `ccCredPendenciaAplicar` (cria o crédito, substitui o vigente; capa e etiquetas do próprio card no clique, ≤ 20: PA-01). Prova: T-116, T-139, T-168, T-186
- [ ] **T-021** — `ccCredCreditoListar`/`Total` (colunas: PA-07), `ccCredCreditoResumo`, `ccCredRevisaoListar`/`Total`. Prova: T-117, T-140, T-182, T-187
- [ ] **T-022** — `ccCredReanaliseAbrir` (`NIVEL_MIN(2)` com o cliente visível, DT-41), `ccCredReanaliseConcluir` (capa e etiquetas do próprio card no clique, ≤ 20: PA-01). Prova: T-119, T-150, T-188, T-192
- [ ] **T-023** — `ccCredPedidoCriar`, `ccCredPedidoSalvar` (`RECOMENDADO_POR` como lista; troca de analista só antes de `alcada`: DT-40), `ccCredPedidoListar`/`Total` (`ATRASADOS`), `ccCredPedidoFicha`. Prova: T-104, T-121, T-124, T-125, T-150, T-170
- [ ] **T-024** — `ccCredPedidoDecidir` (plano e forma: PA-05; bloqueio da régua lido de `CC_COBRANCA`; recusa analista, criador e quem recomendou). Prova: T-122, T-123, T-150, T-171, T-192
- [ ] **T-025** — `ccCredRotina`, risco do cliente (plan §Fluxo 8, item 1). Prova: T-117, T-126, T-165, T-175, T-181
- [ ] **T-026** — `ccCredRotina`, encaminhamento nas três carteiras com auditoria "Rotina" (item 2). Prova: T-118, T-167, T-180
- [ ] **T-027** — `ccCredRotina`, foto de calibração e conciliação quadro × domínio (itens 3 e 4), dentro do orçamento do passo. Prova: T-139, T-177, T-191
- [ ] **T-028** — `ccCredFarolCarteira`, `ccCredFarolClienteListar`/`Total`, `ccCredFarolValidacao`, `ccCredCalibracaoRevisaoListar`, `ccCredCalibracaoRevisar` (`PODE_ADMINISTRAR`: nível ≥ 3 ou `ADMIN`; leituras `N2` aceitam a marca). Prova: T-128, T-129, T-176, T-187
- [ ] **T-029** — `ccCredSaudeResumo`, `ccCredSaudeListar`/`Total`, `ccCredRiscoResumo`, `ccCredRiscoListar`/`Total` (recortes e classe: PA-06). Prova: T-126, T-130, T-172, T-173
- [ ] **T-030** — `ccCredCriticidadeListar`/`Total` (valores medidos: PA-07), `ccCredFlexResumo`. Prova: T-132, T-141, T-175, T-183
- [ ] **T-031** — `ccCredDesempenho`. Prova: T-131, T-174
- [ ] **T-032** — `ccCredAgendaListar`/`Total` (`membroId` só eu ou abaixo de mim; linha com cliente visível; `DECISAO_ALCADA` pelo nível, sem a marca e fora dos autores da proposta, inclusive o da análise do órgão na Pública: C-4). Prova: T-142, T-184, T-192

### Seed

- [ ] **T-040** — `winthor()`: Winthor simulado da faixa 4001–4099 pelos ajudantes (`nota()`), com a pontualidade, a compra média, o prazo e os atrasos de cada balde do plan §Simulador, datas por `dia(n)`; o seed não roda `ccRotina` e exporta `ATRIBUICAO` com agente e analista dos baldes de 4011–4099 (aplicada no passo 7, 06 §2.3); 4097, 4098 e 4099 no ramo 13 (RN-008 DT-35 público e RN-007 e); o smoke exporta `RELOGIO = '2026-11-14T10:00:00'` → `backend/simulator/seed/004-concessao-credito.mjs`
- [ ] **T-041** — `dominio()`: estado da 004 por balde: solicitações e pedidos pelas próprias SFs (com `comRelogio(dia(n), …)` para datas passadas), créditos e decisões históricas e fotos de 2026-10 direto nas tabelas da 004; revisão de 10/08/2026 → mesmo arquivo
- [ ] **T-042** — `CHECK_INPUT` do plan (com `agrupar` e `classe`) no bloco da 004 e `npm run sim:check` sem `FALHOU` para as 66 SFs (arquivo de configuração é do integrador: entregar a lista)

### Smoke — um `teste()` por linha da seção Testes da spec → `backend/simulator/smoke/004-concessao-credito.mjs`

O título começa pelo id. O que o `assert` verifica está no mapa do plan §Testes.

- [ ] **T-101** — `teste('C-001: …')` sugestão recorrente; abertura cria solicitação, card em `entrada`, prazo 23/11/2026
- [ ] **T-102** — `teste('C-002: …')` inativo e novo
- [ ] **T-103** — `teste('C-003: …')` justificativa em branco recusada; total inalterado
- [ ] **T-104** — `teste('C-004: …')` pedido em `retido`, excesso 5.000, 5%, Supervisor
- [ ] **T-105** — `teste('C-005: …')` mover para `credito` recusado; pendências citam endereço e contato financeiro
- [ ] **T-106** — `teste('C-006: …')` consultas de 35 dias: recusa
- [ ] **T-107** — `teste('C-007: …')` 1000 / 850 / AA / 24.000–29.000 / Aprovar / Supervisor
- [ ] **T-108** — `teste('C-008: …')` 810, atraso B, rating C rebaixado, 12.000, "108%"
- [ ] **T-109** — `teste('C-009: …')` D, limite 0, negar; com aval, exceção com garantia
- [ ] **T-110** — `teste('C-010: …')` teto 95.000, disponível 15.000, limite 15.000; grupo cheio → comitê
- [ ] **T-111** — `teste('C-011: …')` ajuste sem justificativa, pendente trava o Comitê, Ana recusada, Sérgio aprova → B e Comitê de crédito
- [ ] **T-112** — `teste('C-012: …')` analista não decide
- [ ] **T-113** — `teste('C-013: …')` Sérgio "exige Gerente"; Gustavo → `formalizacao`, rating congelado
- [ ] **T-114** — `teste('C-014: …')` sem plano, forma e parecer
- [ ] **T-115** — `teste('C-015: …')` acima do motor: Gerente recusado, Diretoria só com justificativa, Comitê de crédito gravado
- [ ] **T-116** — `teste('C-016: …')` pendência na aprovação; termo trava `liberacao`; `gestao` à mão recusado; aplicar → crédito até 14/02/2027
- [ ] **T-117** — `teste('C-017: …')` divergência 30.000 × 29.000
- [ ] **T-118** — `teste('C-018: …')` K1 reanálise, K2 e K3 obsoletos com os motivos, K4 gestão, 2 bloqueios
- [ ] **T-119** — `teste('C-019: …')` renovação: analista recusada, sem parecer recusada, com parecer novo período de 40.000
- [ ] **T-120** — `teste('C-020: …')` recusa sem e com motivo
- [ ] **T-121** — `teste('C-021: …')` quatro alçadas, atraso → Comitê, pedido que cabe recusado
- [ ] **T-122** — `teste('C-022: …')` segregação, crítica sem parecer, liberação completa + pendência
- [ ] **T-123** — `teste('C-023: …')` cliente bloqueado pela régua exige parecer (pula sem a 002)
- [ ] **T-124** — `teste('C-024: …')` flex 20.000 / 0 faixa B / 0 títulos vencidos
- [ ] **T-125** — `teste('C-025: …')` fora do SLA: 1 na esteira, 1 nos pedidos
- [ ] **T-126** — `teste('C-026: …')` atual D, 710, concessão AA, não previsto
- [ ] **T-127** — `teste('C-027: …')` simulador A 24.000; prazo 50 → 40.000 e aviso; nada gravado (PA-04)
- [ ] **T-128** — `teste('C-028: …')` cinco leituras e base de 1 mês
- [ ] **T-129** — `teste('C-029: …')` aviso, Supervisor recusado, Gerente registra, aviso some; Nara (marca `ADMIN`) também registra
- [ ] **T-130** — `teste('C-030: …')` 1 / 3 / 1, índice 20
- [ ] **T-131** — `teste('C-031: …')` 60%, 12,0 dias, 80%, 1 fora do prazo
- [ ] **T-132** — `teste('C-032: …')` três sinalizados com os motivos; o sem sinal ausente
- [ ] **T-133** — `teste('C-033: …')` 2 / 1 / 3 / 3 e total igual às linhas
- [ ] **T-134** — `teste('C-034: …')` órgão na Pública, prazo 25/11/2026; trocas de carteira recusadas
- [ ] **T-135** — `teste('C-035: …')` Supervisor e Diretoria na Pública; Gerente e Comitê regional na Privada
- [ ] **T-136** — `teste('C-036: …')` sem contrato só pré-aprova; com contrato cria o crédito na decisão (pula sem a 005); pré-aprovada na Privada recusada
- [ ] **T-137** — `teste('C-037: …')` carteira sugerida Estética, quadro da Estética, Gerente
- [ ] **T-138** — `teste('C-038: …')` visitante: escritas recusadas, listagem vazia
- [ ] **T-139** — `teste('C-039: …')` crédito novo substitui; card antigo em `encerrada` depois da rotina
- [ ] **T-140** — `teste('C-040: …')` quatro gatilhos; filtro por uso
- [ ] **T-141** — `teste('C-041: …')` taxa 75%, dentro da regra 67%
- [ ] **T-142** — `teste('C-042: …')` filas de Rita e de Sérgio
- [ ] **T-143** — `teste('C-043: …')` pular etapa, Comitê incompleto e crédito em gestão: três recusas
- [ ] **T-144** — `teste('RN-001: …')` só recusada anterior → recorrente
- [ ] **T-145** — `teste('RN-002: …')` 72 h no prazo, 73 h fora; prazo de 30/11 → 09/12
- [ ] **T-146** — `teste('RN-003: …')` 13, 2 e 5 itens; autor do item
- [ ] **T-147** — `teste('RN-004: …')` sem analista; 600.000 sem PL; garantia não formalizada
- [ ] **T-148** — `teste('RN-005: …')` volta aceita antes da decisão, recusada depois
- [ ] **T-149** — `teste('RN-006: …')` recusa no Comitê é decisão; fora do caso não recusa
- [ ] **T-150** — `teste('RN-007: …')` segregação em decisão, renovação e pedido (analista e quem lançou); os desvios (a)–(d) do B-1, o (e) da Pública (autores da análise do órgão, também depois de o analista regravar; pula sem a 005), o (f) de dado do motor gravado por `ccEscCredSolicitacaoDados` direto sem mudar o motor (O-2) e o (g) de autor anterior ao último na solicitação e no pedido (O-3), com dados próprios, cada recusa pela SF pública e pela `ccEsc…` direta (DT-40)
- [ ] **T-151** — `teste('RN-008: …')` faixas das duas tabelas; função pura × fragmento SQL, com o caso público (≤ exposição → faixa; acima → Comitê de crédito; DT-36)
- [ ] **T-152** — `teste('RN-009: …')` responsável = sessão; consultas de 31 dias
- [ ] **T-153** — `teste('RN-010: …')` sem exceção passa pela alçada do valor; CNPJ de 8 meses → Comitê de crédito
- [ ] **T-154** — `teste('RN-011: …')` 30 válida, 31 vencida, alerta da Receita
- [ ] **T-155** — `teste('RN-012: …')` 7 / 9 / 4 exigências; item marcado conta 1
- [ ] **T-156** — `teste('RN-013: …')` 0,80 / 3,5 / 0,70 e os dois alertas
- [ ] **T-157** — `teste('RN-014: …')` avisos da fonte sem rebaixar
- [ ] **T-158** — `teste('RN-015: …')` 1000 / 750 / −600 / sem comportamental
- [ ] **T-159** — `teste('RN-016: …')` 520 / 600 / sem score / Serasa 0 válido
- [ ] **T-160** — `teste('RN-017: …')` cortes de score e de atraso; não passa de E
- [ ] **T-161** — `teste('RN-018: …')` CNPJ recente, pedido inicial alto, três manuais
- [ ] **T-162** — `teste('RN-019: …')` base pelo PL, prazo mínimo 30, sem score 15.000
- [ ] **T-163** — `teste('RN-020: …')` cliente sem grupo é o próprio grupo
- [ ] **T-164** — `teste('RN-021: …')` dados insuficientes; faixa E nega
- [ ] **T-165** — `teste('RN-022: …')` concessão congelada; ajuste vale enquanto o motor não muda
- [ ] **T-166** — `teste('RN-023: …')` três somas de meses
- [ ] **T-167** — `teste('RN-024: …')` 91 dias sem compra; crédito da Pública vencido com 2 compras
- [ ] **T-168** — `teste('RN-025: …')` bloquear limite; aplicar grava quem; fora de `liberacao` recusa
- [ ] **T-169** — `teste('RN-026: …')` 10.000 / 0 / 20.000 sem pontualidade / 0 rebaixado / 5.000 pela concentração
- [ ] **T-170** — `teste('RN-027: …')` limite 0; 10% exato; 20.001
- [ ] **T-171** — `teste('RN-028: …')` sem condição; recusa sem motivo
- [ ] **T-172** — `teste('RN-029: …')` 30 atenção, 31 risco, 89% saudável, 80% verde
- [ ] **T-173** — `teste('RN-030: …')` três classificações
- [ ] **T-174** — `teste('RN-031: …')` recusa do analista fora; pré-aprovada dentro; pedido 6,0 h; passagem em curso fora
- [ ] **T-175** — `teste('RN-032: …')` score vazio × score 0; E crítico; 2 alertas; Pública sem classificação
- [ ] **T-176** — `teste('RN-033: …')` 1% dentro, 1,1% acima, sem foto sem leitura
- [ ] **T-177** — `teste('RN-034: …')` uma foto por mês, sem a Pública (último teste do arquivo)
- [ ] **T-178** — `teste('RN-035: …')` analista não vê o de outro; agente vê o crédito do cliente
- [ ] **T-179** — `teste('RN-036: …')` teto 15% na Estética, 10% na Privada
- [ ] **T-180** — `teste('RN-037: …')` auditoria da decisão e da rotina; exclusão sempre recusada
- [ ] **T-181** — `teste('RN-038: …')` `fluxo(carteira)` nas três carteiras, nas duas situações de sessão aninhada
- [ ] **T-182** — `teste('RN-039: …')` limites dos gatilhos (14/15 dias, 90%, 16/15 dias)
- [ ] **T-183** — `teste('RN-040: …')` período vazio; exposição igual ao teto
- [ ] **T-184** — `teste('RN-041: …')` o que não entra na fila; Ana pedindo a fila de Rita → 0 linha
- [ ] **T-185** — `teste('RN-042: …')` membro inativo = sem vínculo
- [ ] **T-186** — `teste('RN-043: …')` um vigente por cliente; auditoria do encerramento
- [ ] **T-187** — `teste('RF-024: …')` e `teste('RF-032: …')` resumo 5 / 500.000 / 1; faixas AA 3, B 1, D 1; farol D acima do sugerido
- [ ] **T-188** — `teste('RF-026: …')` Supervisor antecipa; analista não; Silvia (outra equipe) não
- [ ] **T-189** — `teste('RF-039: …')` 3 / 75% / 1
- [ ] **T-190** — `teste('RF-041: …')` 45 movimentos
- [ ] **T-192** — `teste('RN-008 (D-06): …')` Nara (nível 1 + `ADMIN`) recusada em concessão, renovação, pedido e ajuste, também pela `ccEscCredDecisaoInserir` direta; fila sem `DECISAO_ALCADA`; `pode` da ficha sem decidir
- [ ] **T-193** — `teste('RN-008 (DT-35): …')` Silvia decide a solicitação de Rita com `nasDuasSessoes` → card na fase seguinte nas duas; na Pública (4097, 4098; pula sem a 005) também, e `ccPubMotorCalcular` aceita Silvia só com `gravar = 0` e recusa Ana (B-C3)
- [ ] **T-191** — `teste('RNF-004: …')` card = 2 chamadas (também em `comite` e no pedido); escrita ≤ 20 (decisão, aplicar pendência e concluir reanálise na Privada e na Pública); rodada ≤ 150
- [x] **T-194** — Correções da validação B2 (`docs/validacao/B2-004-concessao.md`): B-01 (pedido relido na SQL), B-02 (id canônico na lista de autores), C-01 a C-04 (substituir, criar e aplicar só o caso, card liberável, validade e pendência pela SQL), C-05/C-06 (ramo público e os 4 testes da 005), C-07 a C-10 (testes que afirmam; `validarConjunto.meta`). Prova: `teste('RN-027 · RN-028 (chamada direta) …')`, `teste('RN-023 (chamada direta) …')`, `teste('RN-043 · RN-025 (chamada direta) …')`, `teste('RN-007 (B-02) …')` e os cruzamentos SQL × função de `tests/004`

### Verificação do backend

- [ ] **T-195** — `cd backend && npm test` verde (`sim:check` + smoke da 004); `GET /health` sem `semDefinicao` nem `erros` para as SFs da 004
- [ ] **T-196** — Conferir contra 04 §4: 49 públicas + 17 internas publicadas com o nome exato; nenhuma SF fora da lista (as de PA-04 a PA-07 só mudam entrada ou saída)

## Trilha Frontend

Tudo em `frontend/src/modules/004-concessao-credito/` (telas) e `frontend/src/lib/concessao-credito/` (regra pura). Rotas `/credito/:carteira/…`, exportadas por `index.ts`. Opção de cada tela em `docs/opcoes-tela/escolhas.md`; antes de cada tarefa, ler o `<template data-opcao>` da opção. Prova das telas: T-390 (build e lint) e o roteiro de T-391; a regra pura, T-301 a T-304.

- [x] **T-201** `[P]` — Regra pura: `motivoTipoCliente`, `fmtIndice`, `zonaFlex`, `grupoDaFila`, `estadoSinal`, `podeMoverConcessao`, `podeMoverPedido`, `rotuloFase` → `frontend/src/lib/concessao-credito/*.ts`
- [x] **T-202** — Rotas, itens de menu "Crédito" e bloco 4000–4999 de nomes de SF (lista entregue ao integrador) → `index.ts` no formato de 01 §14 (`Modulo`, `RotaModulo`, `ItemMenu`; DT-39)
- [x] **T-203** `[P]` — Nova solicitação, opção B (assistente em três passos), para análise e para pedido → `NovaSolicitacao.tsx`
- [x] **T-204** — Esteira, opção B: quadro da lib por carteira, cabeçalho com os indicadores, "Mostrar concluídos", `novoCard`, `podeMover`, `antesDeMover`, faixa "Aguardando você" no topo (PA-12: 5 primeiros de `ccCredAgendaListar`, "Ver todos (N)" por `ccCredAgendaTotal` abrindo a fila paginada num `Dialog`) → `Esteira.tsx`
- [x] **T-205** — Card da solicitação, opção B: `conteudoDaFase` por chave (entrada, cadastral, credito, comite, liberacao, gestao, reanalise), "Para avançar" com `pendencias[]`, abas "Histórico de crédito", "Posição" e "Análise completa", ações conforme `pode`; soma as extensões de `extensoesDe(slug)`; as da 004 registradas por `registrarExtensao()` em `extensoes.ts` (01 §14) → `card/`, `extensoes.ts`
- [x] **T-206** `[P]` — Motor no card, opção C: dados e resultado lado a lado, Aplicar limite sugerido, Ajustar rating, Recalcular → `card/Motor.tsx`
- [x] **T-207** `[P]` — Decisão no card, opção C: conferir, decidir, aplicar; planos (`ccBasePlanoListar`) lidos só ao clicar em "Registrar decisão" (card = 2: C-7); erros do servidor visíveis → `card/Decisao.tsx`
- [x] **T-208** `[P]` — Gestão de crédito, opção B: grupos da fila (abre com 5 chamadas; "Em reanálise", "Limite diverge" e "Em dia" recolhidos, carregados ao abrir; `…Total` só em "Ver todos": C-6), "Créditos a revisar", pendências para o Winthor → `Gestao.tsx`
- [x] **T-209** `[P]` — Pedidos acima do limite, opção A: quadro `pedidos-limite` e o card do pedido (mostrador de limite e flexibilização em SVG, recomendação, liberação com os planos lidos só ao clicar em "Liberar": C-7) → `Pedidos.tsx`, `card/Pedido.tsx`
- [x] **T-210** `[P]` — Saúde das análises, opção A → `Saude.tsx`
- [x] **T-211** `[P]` — Desempenho, opção A, com os rótulos da RN-031 e período 30/90/365/tudo → `Desempenho.tsx`
- [x] **T-212** `[P]` — Clientes sinalizados, opção C (matriz cliente × sinal) → `Sinalizados.tsx`
- [x] **T-213** `[P]` — Semáforo, opção A (cinco abas), com simulador e registro da revisão (só quem administra, `podeAdministrar(m)`) → `Semaforo.tsx`
- [x] **T-214** `[P]` — Visão gerencial, opção A, só com os blocos da 004 (carteira, funil, flexibilização, risco) e link para o painel no lugar dos blocos da 006 → `VisaoGerencial.tsx`
- [x] **T-215** — Carteira Pública: esconder Semáforo, Saúde, Sinalizados e flexibilização; rating P1–P4 vindo da ficha

### Testes de tela → `frontend/tests/004-concessao-credito.test.mjs`

- [x] **T-301** `[P]` — `test('C-001: …')` e `test('RN-001: …')` motivos do tipo de cliente
- [x] **T-302** `[P]` — `test('C-024: …')` zonas do mostrador (105.000 flexível; 125.000 acima)
- [x] **T-303** `[P]` — `test('RN-013: …')` "0,80" e "3,5×"
- [x] **T-304** `[P]` — `test('RN-004: …')` espelho `podeMoverConcessao`/`podeMoverPedido` com os casos do gancho; `grupoDaFila` e `estadoSinal` (RN-032)

### Verificação do frontend

- [x] **T-390** — `cd frontend && npm test`, `npm run build` e `npm run lint` limpos
- [x] **T-391** — Verificação manual da spec no simulador: quadro por carteira (C-001), faixa "Aguardando você" com os itens de Rita e de Sérgio (C-042), pendências legíveis (C-016), mostrador em três zonas (C-024), simulador sem gravar (C-027), Pública sem os quadros que não se aplicam (C-034)
- [x] **T-392** — Tema claro sem cor quebrada; faixas AA–E com os tokens `data-N`, sem cor literal; nenhum arrastar e soltar

## Dependências

```
001 (B1) → T-001..T-005 [P] → T-006 → T-007 → T-008 → T-010
T-010 → T-011..T-024 → T-025 → T-026 → T-027 ; T-028..T-032 depois de T-025
T-040 → T-041 → T-042 ; T-101..T-191 depois da SF que cada um prova (lista "Prova" em T-010..T-032)
T-195, T-196 fecham o backend → T-201, T-202 → T-203..T-215 → T-301..T-304 → T-390..T-392
002 construída: destrava T-123 · 005 construída: destrava o trecho de T-136 e de T-181 na Pública
```

## Rastreabilidade

| Requisito / cenário | Tasks | Teste |
|---|---|---|
| RF-001 a RF-003, RF-045 / C-001 a C-003, C-034, C-037, RN-001, RN-038 | T-011, T-012, T-203 | T-101 a T-103, T-134, T-137, T-144, T-181, T-301 |
| RF-004, RF-005, RF-007, RF-041 / C-025, RN-002, RN-003 | T-006, T-016, T-204 | T-125, T-145, T-146, T-190 |
| RF-006 / C-005, C-006, C-043, RN-004, RN-005 | T-007, T-013, T-015, T-205 | T-105, T-106, T-143, T-147, T-148, T-304 |
| RF-008 a RF-014 / RN-011 a RN-014 | T-003, T-013, T-015, T-205 | T-154 a T-157, T-303 |
| RF-015, RF-016 / C-007 a C-010, RN-015 a RN-021, RN-036 | T-003, T-014, T-206 | T-107 a T-110, T-158 a T-164, T-179 |
| RF-017, RF-021 / C-011, C-026, RN-022 | T-018, T-025, T-206 | T-111, T-126, T-165 |
| RF-018 a RF-020 / C-012 a C-015, C-035, C-036, RN-006 a RN-010 | T-005, T-019, T-207 | T-112 a T-115, T-135, T-136, T-149 a T-153 |
| RF-022, RF-023 / C-016, C-039, RN-025, RN-043 | T-020, T-207, T-208 | T-116, T-139, T-168, T-186 |
| RF-024, RF-042 / C-017, C-040, RN-039 | T-021, T-025, T-208 | T-117, T-140, T-182, T-187 |
| RF-025, RF-026 / C-018, C-019, RN-023, RN-024 | T-022, T-026, T-208 | T-118, T-119, T-166, T-167, T-188 |
| RF-027 / C-020 | T-017, T-205 | T-120 |
| RF-028 a RF-031, RF-043 / C-004, C-021 a C-024, C-041, RN-026 a RN-028, RN-040 | T-004, T-023, T-024, T-030, T-209 | T-104, T-121 a T-124, T-141, T-169 a T-171, T-183, T-302 |
| RF-032, RF-033 / C-027 a C-029, RN-033, RN-034 | T-014, T-027, T-028, T-213 | T-127 a T-129, T-176, T-177, T-187 |
| RF-034, RF-035 / C-030, RN-029, RN-030 | T-029, T-210, T-214 | T-130, T-172, T-173 |
| RF-036 / C-031, RN-031 | T-031, T-211 | T-131, T-174 |
| RF-037 / C-032, RN-032 | T-025, T-030, T-212 | T-132, T-175 |
| RF-038 / C-033, C-038, RN-035, RN-042 | T-005, T-016 | T-133, T-138, T-178, T-185 |
| RF-039 | T-016, T-204, T-214 | T-189 |
| RF-040 / RN-036 | T-002, T-006 | T-137, T-179 |
| RF-044 / C-042, RN-041 | T-032, T-204 | T-142, T-184 |
| RN-007 | T-005, T-013, T-018, T-019, T-022, T-023, T-024 | T-150 |
| RN-008 (D-06, DT-35) | T-005, T-007, T-019, T-032 | T-192, T-193 |
| RN-037 / RNF-005 | T-010 a T-026 | T-180 |
| RNF-003, RNF-004 | T-025 a T-027 | T-191 |
