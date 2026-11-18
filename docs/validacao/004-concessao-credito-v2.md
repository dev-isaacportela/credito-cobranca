# Validação v2 — spec 004 · Concessão de crédito

> Validador independente (fase 0c, passo 5). Lidos por inteiro: `docs/specs/004-concessao-credito/{spec,plan,tasks}.md`,
> `docs/validacao/004-concessao-credito.md` (v1), `docs/validacao/LEIA-v2.md`, `docs/contrato/01` (§3–§15),
> `02` (§001 cliente e posição, §004, `CC_FASE`, tabelas da lib), `03` (§1, §3, §7, §9–§13, §17, §18), `04` (§0, §1, §4–§8),
> `05` (§1, §2, §4, §5, §7), `06`, `00` (§3, §4), `pedidos/004-concessao-credito.md`, `pedidos/00-respostas.md`
> (seção 004 e Fechamento), `arquitetura.md` §7, `opcoes-tela/escolhas.md` (004) e o Fluxo A da skill `mitra-escopo`.
> Conferido por busca: nomes de SF (49 + 17), chaves de parâmetro (86), colunas, fases e elenco. Nada foi corrigido.
>
> **Resultado: 1 BLOQUEIA · 9 CORRIGIR · 10 OBSERVAÇÃO.** Os dois bloqueios da v1 caíram e quase todos os CORRIGIR
> foram resolvidos. O que impede construir certo é a segregação "quem propõe não decide": a guarda compara só o
> analista atual, e o próprio plano deixa o superior escrever a proposta ou trocar o analista antes de decidir.

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF/componente | ok | `ok:false`, LIMIT, `…Total` e `analistaId` saíram (v1 C-17) |
| RF com critério verificável; cenário de erro; fora de escopo | ok | 45 RF, 11 cenários de erro, fora de escopo com os órfãos da v1 |
| Seção Testes: uma linha por C/RN com números | ok | 43 C + 43 RN + RF-024/026/032/039/041 + RNF-004 = 92 linhas |
| Plan: Constitution Check, Complexity Tracking | ok | |
| Contratos de SF × 04 §4 | ok | 49 públicas e 17 internas com o nome exato; `ccCredPedidoTotal.ATRASADOS` não existe (C-8) |
| Chaves de parâmetro × 03 | ok | 86 chaves conferem (6+4+5+14+5+29+11+4+4+4); `validarConjunto` bate com a coluna Validação |
| Colunas, fases, fragmentos × 02/05/01 | ok | `CC_POSICAO_CLIENTE` tem todas as colunas do motor (v1 B-2); `FASE_DO_CARD`, `chamarKb`, `KB_CARD.VALORES_JSON` existem |
| Spec × plan × tasks | ok | todo C/RN tem linha no mapa (RN-014–RN-020 pela faixa "RN-011 a RN-021") e um `teste()` (T-101…T-191); toda SF pública tem tarefa; zero `[NEEDS CLARIFICATION]`, zero `[BLOQ]`, zero "pendente do arquiteto" |
| RNF | parcial | RNF-001/002 sem tarefa; RNF-003 sem massa de 3.000 (O-6) |
| Orçamento (DT-29) | parcial | contas das escritas refeitas e certas; plano B do S-13 fora do contrato (C-5); Gestão abre com 7 (C-6); card em `comite` e card do pedido abrem com 3 (C-7) |
| D-01 a D-06 | parcial | D-05 aplicado (uma esteira, `temMotorProprio`); D-06 aplicado nas `N2`/`ADM`, mas nenhum teste prova que a marca não dá alçada (C-3) e o gancho aceita a marca em "quem move" (O-1) |
| Telas × `escolhas.md` | ok | as 12 telas apontam a opção escolhida; a faixa "Aguardando você" (sem desenho) tem T-204 |
| Quadros pela lib, sem arrastar | ok | T-392; fora de escopo "mudar etapa fora do card" |
| Segurança e plataforma | **não** | identidade por `quem()` ok; segregação contornável (B-1); internas sem a permissão do ato (C-2); fila de outra pessoa por parâmetro (C-4). Sem token em `VITE_*`, sem produção, sem migration à mão |
| Alçada e segregação | **não** | B-1, C-1, C-2, C-3 |

### Orçamento refeito (custos de referência de 01 §10; leitura por `runQueryMitra` não conta)

| Operação | Conta | Plan | Veredito |
|---|---|---|---|
| `ccCredDecisaoRegistrar` aprovada, Privada | 1 JS + 1 decisão + 1 solicitação + 1 pendência + 1 auditoria + 5 mover + 3 capa/etiquetas + 2 nota | 15 | certo |
| idem, Pública (cria o crédito) | 15 + 1 `ccPubMotorCalcular` + 0–1 encerrar anterior + 1 crédito | 17–18 | certo; folga de **2**, que some se o `kbCardMover` custar 6 e o `kbCardAtualizar` 4, ou se a decisão chamar `ccCredMotorCalcular` → `ccPubMotorCalcular` como diz o plan da 005 (§Fluxo 1) — C-5 |
| idem, `PRE_APROVADA` | 1 + 1 + 1 + 1 + 1 + 3 + 2 | 10 | certo |
| `ccCredPendenciaAplicar` em `liberacao` | 1 + 0–1 + 1 + 1 + 1 + 5 + 3 | 12–13 | certo |
| `ccCredReanaliseConcluir` | 1 + 1 + 1 + 1 + 1 + 5 + 3 + 2 | 15 | certo |
| `ccCredSolicitacaoCriar` | 1 + 1 + 1 + 6 + 1 + 1 | 11 | certo |
| Rotina, por crédito encaminhado | auditoria 1 + mover 5 + nota 2; para `obsoleto` também a etiqueta `Aplicar no Winthor` (05 §4.5 linha 3) | 8 | 11 no obsoleto (O-3) |

A ordem das escritas do plan §Fluxo 4–6 bate linha a linha com a tabela do orçamento.

## 2. BLOQUEIA

| # | Onde | Achado | Correção |
|---|---|---|---|
| B-1 | `plan.md` §Internas (linhas 139–146), §Fluxo 1, 2 e 7; `04 §0` "quem propôs não decide"; `01 §5` segregação | A segregação só compara o **analista atual** (`S.ANALISTA_ID`, `P.ANALISTA_ID`/`P.CRIADO_POR`, `CR.ANALISTA_ID`), e o próprio plano deixa o decisor ser quem propôs: (a) `ccCredSolicitacaoAtribuir` (`N2`, aceita a marca `ADMIN`) troca o analista sem trava de fase — Sérgio, analista do C-012, se reatribui a Ana e aprova; (b) `…Dados`/`…Analise`/`…Motor` e `ccCredRatingAjustar` são `caso` (inclui o superior): o supervisor grava `LIMITE_PROPOSTO`, parecer e a fotografia do motor (`MOTOR_LIMITE`, que decide a exceção em `NIVEL_CONCESSAO`) e decide a mesma solicitação; (c) `ccCredPedidoSalvar` troca `analistaId` e grava a recomendação do pedido que a mesma pessoa libera; (d) `ccEscCredSolicitacaoEncerrar` só exige "caso; não decidida": chamada direta recusa em `comite` sem alçada nem decisão | Na guarda: `…Analista` e a troca de analista do pedido só antes de `comite`/`alcada` (`FASE_DO_CARD`); colunas da proposta (`…Analise`, `…Motor`, ajuste `PROPOR`, recomendação) gravadas só por `ANALISTA_ID = membroId` — ou gravar o autor da proposta e compará-lo na decisão (coluna nova = pedido ao contrato); `…Encerrar` com fase anterior a `comite`. Acrescentar a RN-007 (T-150) um caso para cada desvio |

## 3. CORRIGIR

| # | Onde | Achado | Correção |
|---|---|---|---|
| C-1 | `plan.md` linha 152 (`NIVEL_CONCESSAO`), `regras.mjs` `alcadaConcessao` | A exceção ao motor não é cortada por `temMotorProprio`: na `PUBLICA` `MOTOR_LIMITE = 0` (o motor da 004 não roda), então `limiteAprovado > MOTOR_LIMITE` sempre vale e toda decisão pública vira Comitê de crédito; fraude por CNPJ e "cliente novo" também caem sobre órgão. Quebra C-035, C-036 e os testes da 005 (C-012, RN-007) | Os termos de exceção só com `S.CARTEIRA <> 'PUBLICA'`, nos dois lados (SQL e função pura), e um caso público no cruzamento da RN-008 |
| C-2 | `plan.md` §Internas: `ccEscCredCreditoSituacao`, `ccEscCredPendenciaInserir` | Guarda sem a permissão do ato: "existe a decisão de origem; transição válida" deixa qualquer membro ativo, por chamada direta, levar um crédito a `REANALISE`, `OBSOLETO` ou `ENCERRADO`; "origem existente" deixa criar pendência para o Winthor. 01 §5 pede permissão na SQL | Guarda por transição: `GESTAO → REANALISE` com `NIVEL_MIN(2)` e cliente visível; `→ ENCERRADO` só se o cliente tem crédito ou decisão `APROVADA` mais nova; saída de `REANALISE` só com `CC_DECISAO` `RENOVADA`/`OBSOLETO` do mesmo ator; pendência com `caso` e a origem no estado que a gera |
| C-3 | `spec.md` §Testes, `plan.md` §Testes (só C-029 usa Nara) | Nenhum teste prova D-06 pelo lado que recusa: a marca `ADMIN` nunca dá alçada. Nada afirma que Nara (nível 1 + `ADMIN`) é recusada ao decidir concessão, renovação, pedido ou ajuste, nem que fica fora do `DECISAO_ALCADA` da fila e do `pode` da ficha | Linha na RN-008 (ou RN-007) da spec e do mapa: Nara recusada nas quatro decisões; fila e `pode` sem a marca |
| C-4 | `plan.md` §Fluxo 9 (`ccCredAgendaListar`); `04 §4` `membroId (0 = eu)` | O plano não diz quem pode pedir a fila de outra pessoa: `membroId` vem da tela e escolhe de quem é a fila | `membroId ≠ 0` só para membro visível (`membroVisivel` sobre `EU`); toda linha também com `clienteVisivel(EU)`; `DECISAO_ALCADA` pelo nível, sem a marca |
| C-5 | `plan.md` §Depende do sandbox (S-13) e R-001 | O plano B "se estourar, a capa vai para a conciliação" contradiz 01 §10 e DT-29 (capa e nota do próprio card ficam no clique). A decisão pública tem folga de 2 só sobre custos "≈" da lib, e o plan da 005 (§Fluxo 1) descreve a mesma decisão chamando `ccCredMotorCalcular` → `ccPubMotorCalcular` (+1) | Plano B dentro do contrato (pedido de exceção nomeada ao arquiteto, como `ccJurDossieEnviar`, se o S-13 medir acima); fixar com a 005 que a decisão chama `ccPubMotorCalcular` direto |
| C-6 | `plan.md` §Superfície, linha `credito-gestao` | Abrir a Gestão custa 7: `ccCredCreditoResumo` + `ccCredCreditoListar` × 4 grupos (vencidos, vencendo em 15 dias, reanálise, diverge) + `ccCredRevisaoListar` + `ccCredPendenciaListar` (teto 6, 01 §10) | Um grupo numa chamada (entrada nova pela DT-33) ou grupos carregados ao abrir o painel; recontar com os `…Total` da paginação |
| C-7 | `plan.md` §Superfície, `card-decisao` e card do pedido | O formulário da decisão e o da liberação leem `ccBasePlanoListar`: abrir o card em `comite` (ou o do pedido) passa a 3 chamadas; RNF-004 e 01 §10 fixam 2 | Planos dentro da ficha, ou lidos só ao clicar em "Registrar decisão"/"Liberar" |
| C-8 | `plan.md` §Testes C-025 | Afirma `ccCredPedidoTotal → ATRASADOS 1`; a gêmea de `ccCredPedidoListar` em 04 §4 devolve só `TOTAL` | Pedir a coluna ao contrato (DT-33) ou afirmar pelas linhas da listagem |
| C-9 | `spec.md` RN-031 × `04 §6` `ccPainelSerieCredito` | A 004 diz que a pré-aprovada conta como decidida e aprovada; o contrato diz "`PRE_APROVADA` não conta como decidida" no painel que deveria só ler a definição da 004. É o v1 C-18 voltando pelo contrato | Alinhar 04 §6 à RN-031 (ou a RN-031 ao contrato) e citar no mapa |

## 4. OBSERVAÇÃO

| # | Onde | Achado |
|---|---|---|
| O-1 | `plan.md` §Quadros, "Quem move = caso … ou `M.ADMIN`" | 04 §0/§8 definem "caso" sem a marca. Não é alçada, mas é desvio do contrato: tirar ou registrar |
| O-2 | `spec.md` RF-026 | "Supervisor ou acima antecipa"; pelo contrato (`N2`, D-06) a marca `ADMIN` de nível 1 também antecipa. Ajustar o texto |
| O-3 | `plan.md` §Orçamento, linha da rotina | Encaminhamento para `obsoleto` também grava a etiqueta `Aplicar no Winthor` (+3): 11, não 8. A rotina para pelo orçamento, então não estoura; só a conta está curta |
| O-4 | `plan.md` §Testes C-018 × `06 §2.5` | O elenco fixa 4006 com "100 dias sem compra"; o plan afirma `/96 dias/` no 4006 (K3 da spec). Escolher o número ou outro código para o K3 |
| O-5 | `plan.md` §Simulador, `CHECK_INPUT` | Faltam `agrupar` e `classe` (`ccCredSaudeResumo`, `ccCredRiscoResumo`, `ccCredRiscoListar`) |
| O-6 | `tasks.md` §Rastreabilidade | RNF-001 e RNF-002 (2 s) sem tarefa; RNF-003 aponta T-191, que não semeia os 3.000 créditos |
| O-7 | `plan.md` §Contexto técnico; `tasks.md` T-205 | Não diz que a 004 registra as suas extensões em `modules/004-concessao-credito/extensoes.ts` por `registrarExtensao()` (01 §14; o `App` importa a dona antes da 005) |
| O-8 | `plan.md` §Quadros (gancho) | Na situação (ii) de 05 §1, quem decide na alçada sem estar acima do analista (ex.: Silvia numa solicitação de Rita) é recusado pelo "quem move" ao mover o card; o domínio fica decidido e o card só anda na conciliação. Nenhum teste cobre |
| O-9 | `plan.md` §Simulador, balde Estética | C-037 e RN-038 podem abrir solicitação na Estética e mudar a contagem do C-033 conforme a ordem; dizer que o C-037 usa a solicitação semeada do 4009 |
| O-10 | `plan.md` §Fluxo 3/6 | A auditoria da decisão, do crédito novo e do encerramento do anterior (RN-043) só custa 1 com `auditarLinhas`; nomear. `CARTEIRA_SUGERIDA` usa "3 últimos meses" de `CC_FATURAMENTO_MES` e a spec diz "últimos 90 dias" (mês corrente parcial): declarar |

## 5. v1 → v2

| v1 | Destino |
|---|---|
| B-1 pendências sem padrão, 18 `[BLOQ]` | resolvido: padrões no contrato (00 §4) e citados na spec; zero `[BLOQ]` |
| B-2 colunas inexistentes no motor | resolvido: `CC_POSICAO_CLIENTE` ganhou `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS`, `ALTERADO_EM` |
| C-1 arquivos compartilhados | resolvido: só costuras de 01 §14; `CHECK_INPUT` e nomes de SF entregues ao integrador |
| C-2 elenco | resolvido (elenco de 06); resta O-4 |
| C-3 relógio | resolvido (2026-11-14 pelo mecanismo de 06 §1) |
| C-4 nomes de parâmetro | resolvido (86 chaves de 03) |
| C-5 isolamento do seed | resolvido por baldes (D-007); resta O-9 |
| C-6 rotina incremental | resolvido (passada diária + gatilhos; `ponytail:` para parâmetro) |
| C-7 rating atual × ajuste | resolvido (RN-022, D-009) |
| C-8 usuário sem vínculo | resolvido (RN-042, C-038) |
| C-9 "nem o RCA" | resolvido (fora de escopo com motivo) |
| C-10 crédito novo × vigente | resolvido (RN-043, C-039) |
| C-11 score 0 | resolvido (RN-016, RN-032) |
| C-12 órfãos 004 × 006 | resolvido (DT-27; fora de escopo aponta a 006) |
| C-13 gatilhos e fila | resolvido (RF-042, RF-044) |
| C-14 público nas SFs | resolvido (D-05); resta C-1 |
| C-15 asserts RF-041/039/004 | resolvido (T-189, T-190; RF-004 por C-001/C-034) |
| C-16 paginação, D-015 | resolvido (lista fixa, PA-20; referência removida) |
| C-17 linguagem técnica na spec | resolvido |
| C-18 definição de decidida | **mal resolvido**: a spec fixou, o contrato da 006 diverge (C-9) |
| C-19 nomes das internas | resolvido (17 de 04 §4) |
| O-1 a O-14 | O-1 → P-46; O-2, O-3, O-4, O-13, O-14 registrados na spec; O-5 a O-12 resolvidos no plan |
