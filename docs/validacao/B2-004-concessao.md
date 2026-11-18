# B2 · 004-concessao-credito — validação independente do backend

**Data:** 2026-11-17 · **Escopo:** backend da spec 004 (sem 003/005, em construção; a 002 só como dependência).

**Leu:** `CLAUDE.md`; `docs/LEIA-construcao.md`; skill `mitra-escopo` 0.10.0; README da `mitra-kanban` (formato `sim_nao` = `'1'`); contrato `00`, `01` §3–§5 e §10–§11, `02` §004, `03` §7 e §9–§13, `04` §0, §4 e §8, `05` (quadros da concessão), `06`; `docs/arquitetura.md` §7; `docs/specs/004-concessao-credito/{spec,plan,tasks}.md`; modelo `docs/validacao/B1-001-base.md`. Código: `backend/add-040-concessao-credito.mjs`, `schema/004-*`, `lib/parametros/004-*`, `lib/concessao-credito/*`, `lib/quadros/004-*`, `simulator/seed/004-*`, `simulator/smoke/004-*`, `tests/004-*`, blocos 4xxx de `frontend/src/lib/server-functions.ts`; da base, `lib/guarda.mjs`, `lib/visibilidade.mjs`, `lib/parametros.mjs`, `lib/tempo.mjs`, `simulator/{runtime,mysql-dialect,seed}.mjs`, `smoke/base.mjs`, `add-090-perfil-acesso.mjs`.

**Rodou:** `cd backend && npm test` → **verde** (regra pura 54/54; `sim:check` 81 SQL ok, 0 falha; smoke 168 ok, 7 pulados, 0 falha; 004 = 57 ok + 4 pulados). Script descartável no scratchpad, num banco temporário do pipeline (nada no repositório), para provar B-01, B-02 e C-01 a C-04. Nada contra a plataforma.

**Conferido e conforme:** 66 SFs (49 públicas + 17 internas), nomes iguais a 04 §4, nos dois blocos de `server-functions.ts` (4001–4067); 8 tabelas com colunas, tipos, nulos, padrões, `UQ` e `IX` de 02 §004; 86 chaves de 03, nenhuma fora do contrato; fases, checklists, capa e gancho de 05/04 §8 (ordem DT-35: destinos controlados antes de "quem move"); nenhum `NOW()`/`CURDATE()`/`CURRENT_TIMESTAMP`/`Date.now()` em regra; datas `VARCHAR`; colunas em maiúscula; toda JS de escrita audita; identidade por `quem()` e pela guarda `ATOR` (DT-34; o C-006 prova que o `membroId` da entrada é ignorado com sessão); a marca `ADMIN` só entra em `NIVEL_MIN`/`PODE_ADMINISTRAR`, nunca nas guardas de alçada (concessão, renovação e pedido usam `A.NIVEL`; ajuste usa o caminho); `ccCredRotina` fora do perfil; `runDmlMitra` só na rotina; fragmento SQL da alçada igual a `alcadaConcessao()` em JS, inclusive a aritmética de mês.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | 2 |
| CORRIGIR | 10 |
| OBSERVAÇÃO | 17 |

As divergências declaradas pelo construtor estão avaliadas na seção final. Duas delas pedem ajuste: o ramo público da decisão não existe nem com a 005 (C-05), e o grupo `meta` ficou sem validação (C-10).

## BLOQUEIA

- **B-01 · alçada do pedido vem do parâmetro: um agente forja o pedido e um Supervisor o libera.** Ver `backend/add-040-concessao-credito.mjs:1731-1740` (`ccEscCredPedidoInserir`) e `:1634-1640` (`RAMO_PEDIDO`). A interna grava `LIMITE_NA_DATA`, `UTILIZADO_NA_DATA`, `ATRASO_NA_DATA`, `EXCESSO`, `NIVEL_EXIGIDO`, `ALCADA_EXIGIDA` e `CRITICA` exatamente como chegam. A guarda só exige cliente visível e `nivelExigido ≥ alcada.nivelSupervisor`. Depois, a decisão compara `A.NIVEL ≥ P.NIVEL_EXIGIDO` com o valor gravado. Isso fere 04 §0 ("alçada = nível relido da tabela de alçada, 03 §7").
  - **Provado no simulador:** Rita chama a interna direto e grava um pedido de 500.000 com excesso de 400.000 marcado como "Supervisor", nível 2. Sérgio (nível 2) libera pela SF pública (`ok: true`), e nasce a pendência `LIBERAR_PEDIDO` de 500.000. O mesmo pedido pela JS exige "Comitê de crédito".
  - **Correção:** na própria SQL, ler limite, utilizado e atraso de `CC_POSICAO_CLIENTE`, calcular o excesso e tirar nível, rótulo e crítica da tabela de 03 §7 com `PARAM_NUM` na carteira do crédito vigente (setor público → `PUBLICA`). É um fragmento `NIVEL_PEDIDO`, irmão de `NIVEL_CONCESSAO`. Acrescentar ao RN-007/RN-008 um teste com a chamada direta.
- **B-02 · "quem propõe não decide" compara texto com `FIND_IN_SET`, mas o ator é conferido como número.** Ver `backend/lib/concessao-credito/sql.mjs:13-15`, usado em `add-040:1620-1621` (concessão e análise do órgão), `:1638` (pedido) e `:440` (fila). `ATOR` aceita `A.ID = {{membroId}}` por igualdade numérica, e `NAO_PROPONENTE` procura a forma textual de `{{membroId}}` na lista.
  - **Provado no simulador:** com `PROPOSTA_POR = '11,3'`, a interna `ccEscCredDecisaoInserir` chamada por Sérgio com `membroId = 3` grava 0 linha. Com `membroId = char(51,46,48)` (o texto `'3.0'`) grava a decisão `APROVADA` com `RESPONSAVEL_ID = 3`.
  - **No MySQL:** o mesmo vale com o literal `3.0`, porque `FIND_IN_SET` converte para `'3.0'`. Pelo mesmo caminho, `PROPONENTE_ADD` grava `'3.0'` na lista, e depois a guarda deixa de reconhecer o `3`.
  - **Condição:** só deixa de valer se a plataforma recusar entrada não inteira em `{{membroId}}`. Isso não está confirmado (O-01 da B1).
  - **Correção:** normalizar dentro dos dois fragmentos, com `FIND_IN_SET(CAST(CAST(m AS SIGNED) AS CHAR), col)` e o mesmo em `PROPONENTE_ADD`, ou conferir `A.ID` dentro do `EXISTS` do `ATOR`. Acrescentar ao RN-007 um teste com o `membroId` textual.

## CORRIGIR

- **C-01 · qualquer membro ativo encerra o crédito vigente de qualquer cliente quando há aprovação mais nova** — `add-040:1725-1727` (`ccEscCredCreditoSituacao`, ramo da substituição). A guarda só pede `ATOR()` e uma `CC_DECISAO` `APROVADA` mais nova. Provado: com o aumento do 4017 aprovado e o card em `formalizacao`, Carlos (outra equipe, nível 1, sem ver o cliente) encerra o crédito de 100.000 e o cliente fica sem crédito vigente. Exigir o mesmo ator de `ccEscCredCreditoInserir` (responsável da decisão ou caso) e a solicitação nova em `liberacao`, ou num quadro sem essa fase.
- **C-02 · crédito criado direto, sem Liberação e com validade escolhida** — `add-040:1709-1719` (`ccEscCredCreditoInserir`). `inicio` e `fim` vêm do parâmetro, e a guarda não confere a fase do card. Provado: Rita (analista) cria o crédito com o card ainda em `formalizacao` (sem termo) e com `FIM_VALIDADE = '2099-12-31'`. O crédito nunca vence nem vai a reanálise. Calcular o fim na SQL (`DATE_ADD(hoje, INTERVAL cred.validadeMeses MONTH)`, que está em 06 §5) e exigir `liberacao`, salvo em quadro sem essa fase (D-004).
- **C-03 · pendência para o Winthor com valor e texto livres** — `add-040:1763-1773` (`ccEscCredPendenciaInserir`). A guarda confere que existe a decisão do mesmo ator, mas `VALOR` e `DESCRICAO` vêm do parâmetro. Provado: Sérgio aprova 29.000 e grava, direto, uma `APLICAR_LIMITE` de 1.000.000 com o texto "Aplicar no Winthor: limite R$ 1.000.000". Quem opera o ERP aplica o texto. Copiar `VALOR` de `D.LIMITE_APROVADO` (do crédito, no `BLOQUEAR_LIMITE`; do pedido, no `LIBERAR_PEDIDO`) e montar a descrição na SQL.
- **C-04 · `ccCredPendenciaAplicar`: a guarda é "vê o cliente", não "caso", e a escrita encerra antes de criar** — JS em `add-040:1093`; SQL em `:1775-1777` (o comentário `ponytail` assume a troca); `criarCredito` em `:1070-1082`. O 04 §4 diz que quem aplica é o caso. Provado: Bruno (agente do cliente, que não é superior de Rita) aplica a pendência do aumento do 4011. `criarCredito` encerra o crédito anterior, a inserção é recusada pela guarda e a JS lança erro. O cliente fica sem crédito vigente, e o encerramento sai sem auditoria. Exigir caso na JS e na SQL. Com C-01 corrigido, a primeira escrita também é recusada.
- **C-05 · ramo público da decisão não existe nem com a 005** — ver `add-040:1017-1020`: `else return recusar('O motor do órgão não está instalado.')` vale sempre. A checagem `TEM_005_JS` em `:1006` é redundante, e o cabeçalho (`:4-6`) promete que "a republicação traz o ramo". Com a 005, a SQL ganha o ramo, mas a JS continua sem:
  - `ccPubMotorCalcular` sem gravar e a conferência com a fotografia;
  - o caminho de `PRE_APROVADA`, sem mover o card;
  - a criação do crédito na decisão em quadro sem `liberacao` (D-004: `criarCredito` só é chamada em `ccCredPendenciaAplicar`);
  - a capa com `RATING_PUB`/`EXPOSICAO`;
  - `analiseOrgaoId` da ficha, hoje fixo em `null` (`:661`);
  - na fila, o ramo `DECISAO_ALCADA` (`:439-440`), que não exclui `CC_ANALISE_ORGAO.PROPOSTA_POR` (exigido em 04 §4, `ccCredAgendaListar`).

  Se o construtor da 005 vai escrever isso no `add-040`, registrar no plan e nas tasks. Senão, a 004 não cumpre o Fluxo 4 do plan na Pública.
- **C-06 · os 4 `pular('depende de 005')` são testes de corpo vazio** — `smoke/004-concessao-credito.mjs:512-514, 792-794, 835-837, 914-916`. O motivo é legítimo (a 005 não está construída). Mas cada corpo só tem `if (!existe(...)) pular(...)`: quando a 005 chegar, os quatro passam verdes sem afirmar nada. O RN-038 (`:895-898`) continua exigindo `/órgão/` na Pública e também passa com a 005 instalada, escondendo o C-05. Escrever agora os corpos das linhas do plan (C-036, RN-007 e, RN-008 DT-35 público, RN-038 público). O `pular` fica só na primeira linha.
- **C-07 · RN-025 "some das abertas" não afirma nada** — ver `smoke:305-306`, que chama `ccCredPendenciaListar` com `situacao: 'ABERTA'`. A SQL (`add-040:410`) só conhece `PENDENTE` e `APLICADA`, então a chamada volta 0 linha e `!abertas.some(...)` é sempre verdadeiro. Usar `'PENDENTE'` (o padrão de 04 §4) e afirmar que a pendência estava na lista antes de ser aplicada.
- **C-08 · orçamento (DT-29) medido de forma fraca** — `smoke:945-971`.
  - **Rodada da rotina:** o teste lê `CC_ROTINA_PASSO.EXECUCOES`, que é o número que a própria rotina informa (constantes `CUSTO`, `add-040:1364`), não o contador do simulador. A linha pode ainda ser de uma rodada anterior: o teste pega o último passo `CREDITO`, sem conferir se esta rodada o executou.
  - **Card:** "abrir card = 2" mede só a ficha, sem `kbCardDetalheSql`.
  - **Gestão:** "abrir a Gestão ≤ 6" chama 5 SQL, que dão 5 por construção, e não as SFs da tela (`ccCredCreditoListar` × 2, `ccCredRevisaoListar`, `ccCredPendenciaListar`).

  Medir com `execucoes(() => rodarCron('ccCredRotina'))` e com o conjunto de chamadas de cada tela.
- **C-09 · RN-008 "puro + SQL": o fragmento nunca é cruzado com a função** — ver o plan, linha RN-008. `tests/004:124-141` só testa `alcadaConcessao()`. Nos smokes, os casos de exceção são recusados pela JS antes da SQL. O RN-010 (`smoke:839-849`), por exemplo, nunca exercita `MESES_ATE_HOJE`/`EXCECAO_CONCESSAO` sozinho. Um erro no fragmento, que é a guarda real da chamada direta, não seria pego. Avaliar `SELECT NIVEL_CONCESSAO(...)` sobre linhas de `CC_SOLICITACAO` montadas nos 8 casos da spec e comparar com a função, como o plan pede.
- **C-10 · `meta.aprovacaoMinPct < meta.aprovacaoMaxPct` sem validação** — ver `lib/parametros/004-concessao-credito.mjs:4-6`. O 03 §13 (linha 313) pede "< máx.", e o plan lista a regra em `validarConjunto`. Hoje só a 004 declararia o grupo `meta`: a 002 não declara, e a 006 não existe. Declarar `validarConjunto.meta`, como a 004 já fez com `alcada`, e anotar no 03 quem é dono da validação do grupo.

## OBSERVAÇÃO

- **O-01 · fotografia do motor gravada pelo parâmetro** — `add-040:1683-1685` (`ccEscCredSolicitacaoMotor`). `rating`, `limite` e `resultado` vêm da entrada. Se o caso grava um `MOTOR_LIMITE` alto e o decisor também chama a interna direto, a exceção ao motor some e o Comitê de crédito deixa de ser exigido. Precisa de duas pessoas em conluio, e é o risco aceito em D-002/R-004. Fica registrado porque contradiz "a ccEsc direta não escala nada".
- **O-02 · `ccEscCredSolicitacaoCard`/`ccEscCredPedidoAtualizar` (modo `CARD`) aceitam qualquer `KB_CARD`** — `add-040:1663-1665, 1753`. Duas solicitações no mesmo card fazem `FALTA_DO_CARD` (`lib/quadros/004:139`, subconsulta escalar) dar erro 1242 no MySQL. O SQLite devolve a primeira linha sem acusar. Exigir card de um quadro `concessao-*`/`pedidos-limite` que nenhuma outra linha usa.
- **O-03 · `ONLY_FULL_GROUP_BY`** — `add-040:534-541` (`ccCredRiscoResumo`). O `GROUP BY` repete `CLASSE`, que contém as subconsultas de `PARAM`. O MySQL pode não reconhecer a expressão como idêntica e dar erro 1055; o SQLite não confere. Agrupar pelo apelido ou por uma tabela derivada, ou incluir na S-06 da T-002.
- **O-04 · `ON DUPLICATE KEY UPDATE c = VALUES(c)`** — `add-040:1450-1451`. Está obsoleto desde o MySQL 8.0.20: funciona, mas com aviso. Conferir na T-002.
- **O-05 · `ATRASADA` usa `UTC_TIMESTAMP()` cru e `TIMESTAMPDIFF`** — `add-040:247`. É o mesmo relógio (01 §3 mapeia `UTC_TIMESTAMP` no simulador), mas fora dos fragmentos de `tempo.mjs`. `TIMESTAMPDIFF` não está na lista de 06 §5 (é o O-05 da B1).
- **O-06 · custo da rotina sem teto de relógio** — `add-040:1385-1455, 1519-1527`. Cada rodada relê e recalcula o universo inteiro (divergência declarada). A conciliação carrega toda solicitação que já teve crédito, inclusive as finais, e cresce sem limite. `orcamentoMs` é ignorado. Medir com 3.000 créditos na T-002 (01 §10: 45 s; RNF-001).
- **O-07 · foto de calibração na primeira implantação** — `add-040:1494-1504`. Se a rotina rodar pela primeira vez no meio do mês, grava o estado do dia com o rótulo do mês anterior. Gravar só quando a rodada é do dia 1, ou registrar a ressalva.
- **O-08 · capa `pendencia` desatualizada depois de movimento à mão** (divergência declarada). A ficha mostra o certo, mas o quadro não. Tirar `pendencia` da capa é mais simples que conciliá-la.
- **O-09 · a marca `ADMIN` muda `alcada.*`** — o 03 permite `alcada.nivelSupervisor = 1`. Nara (nível 1, marca) baixa o nível pelo `ccBaseParametroSalvar` e passa a ter alçada de Supervisor. É o O-10 da B1; afeta diretamente "a marca nunca dá alçada" da 004.
- **O-10 · dois critérios para "a 005 existe"** — `add-040:52` usa o arquivo, no momento da publicação, e `:603` usa o id em tempo de execução. Hoje são coerentes pelo `PUBLISH_ORDER`. Vale uma linha no plan.
- **O-11 · código morto** — imports sem uso de `ROTINA`, `CONSULTAS_VALIDAS` e `FALTA_ANALISE` (`add-040:37, 48`); `CASO_CR` e `FASE_S` sem uso (`sql.mjs:51, 63`); `responsaveis: analistas` repete a lista dos analistas (`add-040:766`; o plan pede responsáveis da decisão).
- **O-12 · renovação usa `carteira: 'PUBLICA'` como truque para pular a exceção** — `add-040:1155`. Funciona, mas engana quem lê. Melhor exportar `faixaConcessao()` de `regras.mjs`.
- **O-13 · testes mais fracos que a linha do plan**:
  - RN-022 (`smoke:859-865`) não afirma `RATING_ATUAL` B/D com a rotina; só o puro afirma.
  - RN-031 (`:867-873`) só cobre a recusa antes de `comite`; falta a passagem em curso.
  - RN-040: falta "exposição = teto → dentro".
  - C-008/C-009 não passam pela SF nas solicitações semeadas; só o puro cobre.
  - RN-007 (g), pedido: falta a chamada direta à `ccEsc`.
- **O-14 · C-023 com um segundo `pular`** — `smoke:383`. Com a 002 construída, "régua sem bloqueio para 4013" seria falha do seed, não dependência. Trocar por `assert`.
- **O-15 · `CARGO_ALCADA` livre** — `add-040:1032`. O contrato aceita `cargoAlcada` na entrada, então um Supervisor pode gravar "Comitê de crédito" como rótulo (a nota e a auditoria repetem). A coluna `ALCADA_EXIGIDA` está certa. Considerar ignorar a entrada.
- **O-16 · `sim:check` sem sessão** — as 15 leituras `ccCred…` com `EU` voltam vazias e só provam que o SQL compila (é o O-12 da B1).
- **O-17 · `ccCredFlexResumo` ignora `carteira`** — o teste C-041 a envia (`smoke:566`), mas 04 §4 só tem `de`/`ate`. Coerente com o contrato; o teste engana quem lê.

## Divergências declaradas pelo construtor

| Divergência | Avaliação | Ação |
|---|---|---|
| Decisão Pública recusada sem a 005 (`TEM_005` pelo arquivo) | Correta para hoje, e os fragmentos SQL ganham o ramo. Mas a JS recusa a Pública **sempre**, também com a 005 (C-05), e os testes que deveriam provar isso estão vazios (C-06) | C-05, C-06; anotar no plan quem escreve o ramo |
| "Aguardando você" só com prazo de decisão hoje ou antes (`add-040:434`) | RN-041 diz "solicitação em que é o analista, com o prazo de decisão". O recorte é defensável (a faixa ficaria cheia com todas as abertas), e o C-042 afirma esse recorte | Registrar no plan, na linha RN-041 da tabela de testes e no Fluxo 9 |
| Texto do motor "Aprovar (faltam documentos: …)" | Conforme RN-021 ("com a ressalva dos documentos exigidos que faltam"). `MOTOR_RESULTADO` guarda o código, não o texto | Nenhuma |
| Validação do grupo `alcada` declarada pela 004, com as regras cruzadas da 002; grupo `meta` sem validador | A de `alcada` é a saída possível com `fundir` (um validador por grupo) e confere só as chaves presentes. A de `meta` deixa sem trava a regra de 03 §13, e a 004 pode declará-la hoje | C-10; anotar no 03 quem é dono da validação de cada grupo |
| Aritmética de mês por `SUBSTRING`/`CAST` (`sql.mjs:17-20`) | Idêntica a `mesesEntre()` e só usa funções de 06 §5. Nenhum teste a cruza com a função (C-09) | C-09 |
| Rotina recalcula o risco do universo inteiro a cada rodada e grava só o que mudou | Mais simples que o plan (que previa a passada completa uma vez por dia). A gravação mínima evita escrita desnecessária, mas o custo de leitura e de CPU não tem teto (O-06) | Registrar no plan; medir na T-002 |
| Rotina não atualiza a capa `pendencia` | O quadro mostra o que falta da fase anterior até o próximo Salvar (O-08) | Tirar o campo da capa ou registrar no plan |
| Fotografia de calibração só quando o mês fechado ainda não tem foto | Correto e idempotente com a `UQ`. Ressalva da primeira implantação no meio do mês (O-07) | O-07 |
| O seed grava o histórico direto nas tabelas da 004 | Conforme o plan (Simulador: "direto nas tabelas da 004 quando o estado é histórico"). Não toca tabela de outra dona; os cards nascem pela conciliação da rotina | Nenhuma |

Divergências não registradas no plan: a guarda de `ccEscCredPendenciaAplicar` e da JS por "vê o cliente" em vez de "caso" (C-04); a JS da decisão sem o ramo público e sem D-004 (C-05); e `responsaveis[]` de `ccCredDesempenho` como cópia dos analistas (O-11).
