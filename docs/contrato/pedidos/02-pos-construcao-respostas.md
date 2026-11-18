# Respostas a `02-pos-construcao.md` (17/11/2026)

Cada item do pedido, conferido no código (`backend/add-0N0-*.mjs`, `lib/`, `schema/`, só leitura) antes de entrar no contrato. Situação: **aplicado** · **aplicado de outro jeito** (como) · **já constava** (o contrato já dizia o que o código faz) · **não aplicado** (por quê). Os itens abertos foram decididos pelo mais simples que não muda código; o que só muda com código virou pendência (P-49, P-50 em 00 §4).

Contagens conferidas nas `definitions` de cada `add-0N0` (importadas sem publicar): 001 = 50 + 26 · 002 = 39 + 21 · 003 = 42 + 19 · 004 = 49 + 17 · 005 = 18 + 10 · 006 = 15 + 2 · 007 = 14 + 5 → **327 SFs (227 públicas + 100 internas)**; os nomes públicos e internos batem um a um com 04. Tabelas: **55** (`CREATE TABLE` de `schema/*.mjs` = `### CC_` de 02). Parâmetros: **277** (`PARAMETROS` de `lib/parametros/*.mjs`).

## Transversal

| # | Item | Situação | Onde |
|---|---|---|---|
| T-1 | D-09: ninguém altera o próprio cargo, superior, marca ou situação; nível ≥ 3 só por cargo igual ou maior; chaves de alçada só por cargo nível ≥ 3 | aplicado; a lista de chaves de alçada de 01 §4 ganhou `jur.acordoAlcadaValor` (está em `CHAVES_ALCADA` do `add-010`) | 00 §2 (D-09), 01 §4, 04 §1 `ccBaseMembroSalvar` e `ccBaseParametroSalvar` |
| T-2 | D-10: última leitura com erro → nova leitura, uma por rodada; passos de módulo não rodam com dado velho | aplicado (código: `lerAgora` com `ultima.SITUACAO === 'ERRO'`) | 00 §2 (D-10), 01 §11 decisão 2 |
| T-3 | Membro normalizado: `CAST(CAST({{membroId}} AS SIGNED) AS CHAR)` nas listas de autores | aplicado (código: `PROPONENTE_ADD`/`NAO_PROPONENTE` de `lib/concessao-credito/sql.mjs`, importados pela 005) | 01 §5, 02 `CC_SOLICITACAO.PROPOSTA_POR`, `CC_PEDIDO_RETIDO.RECOMENDADO_POR`, `CC_ANALISE_ORGAO.PROPOSTA_POR`, 00 DT-44 |
| T-4 | Regra geral das internas: valor derivado recalculado na SQL | aplicado | 01 §5, 00 DT-43; exemplos nas internas de 04 §1–§4 |
| T-5 | 06 §5: `FORMAT(x, 2, 'pt_BR')`; `DATE_ADD` sem vírgula no valor; ordem do `SET` | aplicado; `DATE_ADD` também registra "sem `MONTH`" (emulação do simulador só aceita `SECOND|MINUTE|HOUR|DAY`) e a regra do `SET` ficou "nunca citar coluna já atribuída à esquerda" | 06 §5 |
| T-6 | Visibilidade: membro com `CAMINHO` vazio não vê ninguém | aplicado (código: `CAMINHO <> ''` em `lib/visibilidade.mjs` e `visivel()`); os fragmentos de 01 §6 passaram a trazer a cláusula | 01 §6 |
| T-7 | Decisão nova: todo número em SQL como `CAST('{{x}}' AS SIGNED|DECIMAL)` | aplicado como regra; S-16 nova na lista do sandbox. **Código em alinhamento**: hoje só a 007 (e trechos de 003/006) usa o `CAST`; as demais specs entram no lote de fechamento B5a | 01 §5, 01 §15 (S-16), 06 §5, 00 DT-45 e §5 |
| T-8 | Decisão nova: parâmetro com vigência só vale de hoje em diante | aplicado como regra. **Código em alinhamento**: `ccBaseParametroSalvar` ainda aceita início anterior a hoje; a recusa entra no lote B5a | 01 §9, 03 (coluna "Vig."), 04 §1, 00 DT-46 |
| T-9 | (do coordenador, corretor da 007) `HEX(…)` permitido; exceção `LIMIT/OFFSET` ao `CAST`, dependente de S-16 | aplicado | 06 §5, 01 §5, 01 §15 |
| T-10 | Números do índice 00 | aplicado: 04 = 327 (227 + 100); 02 = 55 e 03 = 277 conferidos, sem mudança; lista do sandbox S-01…S-16; linha para este arquivo | 00 §1, 04 §0 |

## 001

| # | Item | Situação | Onde |
|---|---|---|---|
| 001-1 | O-07: renomear `membroId` de `ccBaseMembroSalvar` para `id` | **aplicado de outro jeito — decisão: o nome fica.** Renomear muda entrada pública (código e tela). 04 §1 passa a dizer que ali `membroId` é o membro editado (`0` = novo), não o ator: a SF nunca é aninhada e quem age vem da sessão | 04 §1 |
| 001-2 | `ccEscBaseEstado`: quem administra grava `winthor.descoberta` e `jur.cargaConcluida` = `'1'` (não reabre) | aplicado (guarda conferida no `add-010`) | 04 §1 Internas, 02 `CC_ESTADO` |
| 001-3 | `ccEscBaseMembroInserir/Atualizar` sem `nivel` e `caminhoNovo` | aplicado; registrado também que `…Atualizar` recebe `caminhoAntigo`, conferido contra o gravado, e que o membro novo nasce com `CAMINHO` vazio | 04 §1 Internas e `ccBaseMembroSalvar` |

## 002

| # | Item | Situação | Onde |
|---|---|---|---|
| 002-1 | `ccEscCobCasoProxAcao`: `ROTINA` ou `ATOR` `caso`, nas três carteiras; frase de `ccCobCasoSincronizar`; tirar do acabamento pós-v3 | aplicado (guarda conferida: `ROTINA OR OPERA_CB`) | 04 §0, §2 `ccCobCasoSincronizar` e Internas |
| 002-2 | `ccCobRotina`, coluna kb: `kbCardCriar`, `kbCardMover`, `kbCardAtualizar`, `kbNotaRegistrar`, regra de `ccCobCasoSincronizar` em processo | aplicado, com o que a rotina audita (relatório do corretor) | 04 §2 |
| 002-3 | `ccCobCasoSincronizar` audita criação, etapa, próxima ação e encerramento; pessoa ≤ 14 | aplicado | 04 §2 |
| 002-4 | Saídas: `ccCobContatoTotal` + 3 colunas; `ccCobBloqueioListar` `DEVIDO`/`APLICADO`; `ccCobProjecaoTotal` + `CLIENTES_FORTE` | `ccCobContatoTotal` e `ccCobBloqueioListar` **já constavam**; `ccCobProjecaoTotal` aplicado (`TOTAL, A_VENCER, VALOR_ESPERADO, CLIENTES_FORTE`, como a SQL) | 04 §2 |
| 002-5 | 05 §3.6 linha 5, linha 6 ("já atrasou", também em `juridico`) e parágrafo final | aplicado | 05 §3.6 |
| 002-6 | Decisão de acordo e de baixa sem exigir ver o cliente (DT-35); cancelamento exige (DT-41) | **já constava** (04 §0 "alçada não exige o cliente visível"; `ccCobAcordoCancelar` "N2 (cliente visível, DT-41)"); código confere | — |
| 002-7 | O-09: `ccEscCobFilaInserir` sem chamador | **decisão: fica**, como plano B da S-09 (se `runDmlMitra` no passo aninhado do cron falhar). Tirar seria mudar código e a contagem; ela tem guarda `ROTINA` | 04 §2 Internas |
| 002-8 | O-11: baixa fracionada — cada baixa usa o próprio valor para a alçada | **decisão: vale o valor de cada baixa** (como o código). Contém o risco: uma `PENDENTE` por caso, parecer do Jurídico em cada uma, segregação e auditoria; o acumulado fica em `VALOR_BAIXADO`. Como é política, foi para o gestor: **P-49** (trocar = código em `ccEscCobBaixaInserir`) | 04 §2 `ccCobBaixaPropor`, 00 §4 P-49 |

## 003

| # | Item | Situação | Onde |
|---|---|---|---|
| 003-1 | Gancho `juridico`: "`dossie` → qualquer menos `encerrado`" só para dossiê da cobrança não enviado | aplicado (trecho conferido em `lib/quadros/003-juridico.mjs`) | 04 §8 |
| 003-2 | `ccJurAlertas`: entrada `tipo ('')` | aplicado | 04 §3 |
| 003-3 | 05 §6 Responsável: quem abriu até o envio; no envio, `RESPONSAVEL_ID` ou o primeiro `JURIDICO` ativo (`MIN(ID)`, provisório) | aplicado | 05 §6, 04 §3 `ccJurDossieEnviar` |
| 003-4 | `ccJurAcordoCriar` (até hoje + 31), `ccJurAcordoParcelaSituacao` (`PAGA` só com `ANDAMENTO`), `ccJurCargaAplicar` (acordo da carga) | aplicado | 04 §3 |
| 003-5 | RN-015 / 006: processo encerrado na carga fora do recuperado do mês/ano | aplicado em `ccJurResumo` (a 006 lê o Jurídico por ele) | 04 §3 |
| 003-6 | 02 §003 (opcional): `UNIQUE KEY (CARD_ID)` em `CC_PROCESSO`; `KB_ANEXO_IDS` V(200) com teto de 25 | `UNIQUE KEY`: **não aplicado** — o schema tem `INDEX` e a B-02 foi fechada na guarda de `ccEscJurProcessoCard` (card do quadro `juridico`, título do processo, nenhum outro processo no card); o contrato segue o schema. Teto de 25: aplicado | 02 `CC_DOSSIE_ITEM`, 04 §3 Internas |
| 003-7 | Internas sem `cobrancaId` / `valor` / `emitidaEm` e `modeloVersao` | aplicado | 04 §3 Internas |
| 003-8 | O-03: quem recebe o e-mail "Dossiê recebido" | **decisão: fica como está** — o `$responsavel` no movimento ainda é quem abriu o dossiê (o `kbCardAtualizar` vem depois), então é a confirmação de recebimento para o Financeiro; o Jurídico recebe o aviso padrão de novo responsável da lib. Inverter a ordem seria código | 05 §7 |
| 003-9 | O-05: opções de filial no card | **decisão: passo de implantação** — opções de `filial` nascem com as filiais do elenco; o gestor troca pelas reais na administração do quadro (BU já usa os ids fixos do setup) | 05 §6 |
| 003-10 | O-07: coluna de nome normalizado em `CC_PROCESSO` | **decisão: sem coluna** — em produção (MySQL `ai_ci`) a busca por `UPPER(NOME_DEVEDOR)` casa com acento; só o simulador diverge, em processo da carga sem cliente. Registrado como exceção aceita | 06 §5 |
| 003-11 | O-12: responsável padrão | **decisão: `MIN(ID)` provisório** (o Jurídico troca em `ccJurProcessoSalvar`); a pergunta de distribuição com vários advogados foi para o gestor: **P-50** (trocar = código em `ccEscJurProcessoEnvio`) | 00 §4 P-50, 04 §3, 05 §6 |

## 004

| # | Item | Situação | Onde |
|---|---|---|---|
| 004-1 | 02 `PROPOSTA_POR`/`RECOMENDADO_POR`: guarda com `CAST(CAST(… AS SIGNED) AS CHAR)` e lista nessa forma | aplicado | 02 §004 |
| 004-2 | `cargoAlcada` aceito e ignorado; rótulo relido | aplicado (código: `const cargoAlcada = alcada.rotulo`) | 04 §4 `ccCredDecisaoRegistrar` |
| 004-3 | Internas calculam na SQL; crédito só nasce em `liberacao` (ou `comite` sem `liberacao`); pendência aplicada pelo caso da origem | aplicado (entradas conferidas no cabeçalho do `add-040`) | 04 §4 Internas |
| 004-4 | 03 §13: validação de `meta` e `alcada` é da 004 | aplicado | 03 §13 |
| 004-5 | Divergências aceitas: "Aguardando você" só prazo ≤ hoje; rotina relê o universo; capa `pendencia` não atualizada pela rotina; foto do mês fechado | aplicado | 04 §4 `ccCredAgendaListar`, `ccCredRotina`; 05 §4.4 e §4.5 linhas 1, 4 e 5 |

## 005

| # | Item | Situação | Onde |
|---|---|---|---|
| 005-1 | 02 `CC_ANALISE_ORGAO.PROPOSTA_POR`: o "Calcular" entra, na instrução de `ccEscPubAnaliseMotor` | aplicado | 02 §005 |
| 005-2 | 02 `CC_ESTADO`: chave `pub.nfCorteLido` | aplicado | 02 `CC_ESTADO` |
| 005-3 | `ccPubAnaliseSalvar` / `ccPubMotorCalcular`: `gravar = 1` torna proponente, sem mexer em `ATUALIZADO_POR` | aplicado | 04 §5 |
| 005-4 | Guarda pública de `ccEscCredDecisaoInserir` repete `podeAprovar` para `APROVADA` | aplicado (código: `AO.BASE = 'CONTRATO' AND AO.SALDO_CONTRATO > 0 AND AO.VIGENCIA_FIM >= HOJE_SQL`) | 04 §4 |
| 005-5 | Custos: `ccPubNfDatasSalvar` 15 (16 com sessão aninhada); `ccPubNfPassoRegistrar` 16 com e-mail, 10 sem | aplicado com os números que o smoke afirma; as contas parciais antigas saíram (os custos `kb*` do simulador não são os de referência) | 04 §5 |
| 005-6 | Leitura Oracle por `runQueryMitra`; `ccPubWinthorNf` não publicada; 005 com 28 SFs no índice | aplicado | 04 §0 e §5, 00 §1 |
| 005-7 | (seção de divergências do plan da 005, itens 6 e 8) prazo do card = menor prazo pendente; rotina não encerra órgão sem NF | aplicado | 05 §3.4, §3.7 linha 4 |

## 006

| # | Item | Situação | Onde |
|---|---|---|---|
| 006-1 | `DECIDIDAS`, `foraDoPrazo` por carteira, `ESTIMADO`, `execucoes: 1`, sem foto sem leitura OK anterior, formato de Atenção, decisões sem `buId` | aplicados `DECIDIDAS`, `foraDoPrazo`, `execucoes: 1` e a foto; **já constavam** `ESTIMADO`, o formato `{ tipo, texto, valor, quantidade, gravidade }` (mesmas chaves) e "o filtro de BU não altera as decisões" | 04 §6 |
| 006-2 | `validarConjunto` recebe só as chaves do grupo; regra cruzada só com as duas chaves juntas (pendência da base) | **aplicado de outro jeito**: pela decisão do orquestrador para o lote de fechamento (B5a), `validarConjunto` recebe o conjunto efetivo inteiro e a regra cruzada roda sempre. **Código em alinhamento** no B5a (hoje `ccBaseParametroSalvar` ainda passa só o grupo) | 01 §9, 03 |

## 007

| # | Item | Situação | Onde |
|---|---|---|---|
| 007-1 | 39 origens; eco excluído por pares `ENTIDADE|CAMPO` (12, inclui `CREDITO|Crédito` e `CREDITO|Crédito renovado`); fontes sem URL (P-32); empate `ACORDO_PARCELA` antes de `PROX_ACAO` (parcela 1, próxima ação, parcela 2); junções conferem o mesmo cliente | aplicado (`ECO_AUDITORIA` e `ORDEM_EVENTOS` conferidos em `lib/historico-apoio/eventos.mjs`; `URL` nula em `carga-inicial.mjs`) | 04 §7, 00 §4 P-32 |

## Pendências e avisos

- **P-49** (baixa fracionada) e **P-50** (responsável padrão no Jurídico): perguntas ao gestor com padrão adotado; trocar o padrão é código.
- **S-16** entrou na lista do sandbox, mas o roteiro `backend/sandbox/t002-confirmar.mjs` ainda vai até S-15: acrescentar a linha é código (fora deste lote).
- Três regras do contrato estão à frente do código e dependem do lote B5a: `CAST` de número fora da 007, vigência só de hoje em diante e `validarConjunto` com o conjunto inteiro. O validador final B5 confere.
