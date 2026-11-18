# Validação v2: spec 007 · Histórico e apoio

> Validador independente (fase 0c, passo 5). Lidos por inteiro: `docs/specs/007-historico-apoio/{spec,plan,tasks}.md`,
> o relatório v1 (`docs/validacao/007-historico-apoio.md`), `docs/validacao/LEIA-v2.md`, o contrato
> (`01` §3–§8, §10, §12, §14, §15; `02` todas as tabelas que o histórico lê; `03` §6 e §18; `04` §0, §1, §2, §3, §4, §7, §11;
> `05` fases usadas; `06` inteiro), `pedidos/007-historico-apoio.md` e a seção 007 + "Fechamento" de `pedidos/00-respostas.md`,
> `arquitetura.md` §7, `opcoes-tela/escolhas.md`, a skill `mitra-escopo` (Fluxo A). Colunas `KB_*` conferidas no DDL da lib
> (`mitra-kanban/backend/schema.mjs`) e o formato da nota em `mitra-kanban/backend/funcoes.mjs` (`kbNotaRegistrar` grava `EVENTO = 'nota'`, `DETALHE = { texto }`).
> Busca feita nos arquivos, não de memória. Não corrigi nada: este arquivo só relata.
>
> **Resultado: 0 BLOQUEIA · 4 CORRIGIR · 8 OBSERVAÇÃO.** As 39 origens do histórico existem no contrato com as colunas usadas.
> O Jurídico só vê cliente com processo e fica sem "Alteração auditada" (P-27), pelas regras do contrato. Os achados ficam
> na preparação e nos asserts do smoke, e num filtro que falta (NF cancelada).

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF/componente | ok | |
| Todo RF com critério verificável | ok | RF-023 cita "3 registros", mas o C-011 faz 4 gravações (C-3) |
| Cenário de erro e Fora de escopo | ok | Fora de escopo cobre os O-4 a O-7 da v1 |
| Testes da spec: uma linha por C/RN com números | ok | 21 C (sem o C-008) + 18 RN (sem a RN-007) + "Órgão público" |
| Plan: princípios, contratos, simulador, mapa de testes | ok | |
| Listagem com LIMIT/OFFSET + `…Total` | ok | as 4 gêmeas com os nomes de 04 §0 |
| Tasks: uma task por teste | ok | 39 S (T-101…T-139) e 11 F (T-251…T-261) = 50 linhas do mapa |
| Toda SF pública com tarefa e teste | ok | 14 públicas (T-011…T-019) + 5 internas (T-015, T-017), todas com smoke |
| `pendente do arquiteto` / `[NEEDS CLARIFICATION]` | ok | nenhum; PA-01…PA-19 respondidos e aplicados |
| Nomes × contrato (SF, tabela, coluna, parâmetro, fase, cargo) | ok com ressalva | tudo existe com o mesmo nome (§2); falta o filtro `CANCELADA` (C-4) |
| Orçamento DT-29 | ok | contas abaixo |
| D-01…D-06 | ok | D-05 (3 carteiras nas regras, padrão = Privada), D-06 (`PODE_ADMINISTRAR`, `NIVEL_MIN(2)`); sem "arrastar"; a 007 não tem quadro |
| Telas × `escolhas.md` | ok | 5 telas: `historico-cliente` C, `historico-pdf` A, `fontes-links` A, `material-apoio` A, `regras-vigor` B; mockups existem |
| Segurança e plataforma | ok | identidade por `EU`/`sessao()`/`quem()`; escrita guardada por `ATOR` + `PODE_ADMINISTRAR`; nada de token, produção ou migration à mão |
| P-27 (Jurídico) | ok | `clienteVisivel` (01 §6) limita a `NO_JURIDICO = TRUE`; `NIVEL_MIN(2)` tira a auditoria (nível 0); `ccJurProcessoCriar`/`Encerrar` ligam e desligam `NO_JURIDICO` (04 §3); testes C-021 e RN-017 |

### Contas refeitas

| Conta | Resultado |
|---|---|
| Origens | 5 (Cobrança) + 8 (Acordos) + 6 (Crédito) + 9 (Jurídico) + 7 (Setor público) + 2 (Comunicação) + 1 + 1 = **39**. Bate com T-004…T-008 e T-023 |
| `ORIGEM:ORIGEM_ID` único | sim. `ACORDO_PARCELA` aparece em duas subconsultas (paga / em aberto), mas uma parcela só cai numa delas |
| Abrir histórico | `ccHistResumo` 1 + `ccHistEventoListar` 1 = 2 (≤ 6); trocar aba ou página = 1 |
| Prévia do documento | `ccHistExportar` 1 + `ccEscBaseAuditoria` 1 = 2 (igual a 04 §7) |
| Regras em vigor | 1 + 3 × `ccBaseParametroListar` = 4 (≤ 6) |
| Trocar arquivo de material | `ccBaseAnexoRegistrar` 3 + `ccHistMaterialSalvar` 3 + `ccBaseAnexoRemover` 3 = 9 (≤ 20) |
| Salvar fonte | JS + `ccEsc` + auditoria = 3 |
| C-002 / C-019 | 1 proposta + 1 decisão + 3 parcelas = 5; 5 + 2 recebimentos = 7, páginas 3/3/1 |
| C-006 | utilizado 12.500 + 20.000 = 32.500; recuperado = 3.000 (pago 10 dias depois); 2.000 pago antes do vencimento não conta |
| Acordo do smoke | entrada 2.500 / 12.500 = 20 % ≥ `cob.acordoEntradaMinPct`; 2 parcelas ≤ 5; débito ≤ 50.000 → alçada padrão, Sérgio decide |
| Fontes / material | 6 + 3 + 9 + 5 + 12 + 6 = 41; 12 + 9 = 21 a revisar; 1 + 1 + 5 = 7 materiais, "fluxo" = 6 (estudo A §680, B §520) |
| C-011 auditoria | criação + `USO` + `ORDEM` + `ATIVO` = **4** linhas, não as 3 do assert (C-3) |

## 2. As 39 origens × contrato (02 e DDL da lib)

| Categoria | Tabelas e colunas usadas | Situação |
|---|---|---|
| Cobrança | `CC_ACAO_REGUA` (`FEITA_EM`, `FEITA_POR`, `FASE_CHAVE`, `ORIGEM`, `NO_PRAZO`) · `CC_CONTATO_COBRANCA` (`CRIADO_EM`, `DATA`, `CANAL`, `RETORNO`, `FALOU_COM`, `FEEDBACK`, `AGENTE_ID`) · `CC_PROMESSA` (`CONTATO_ID`, `DATA_PROMETIDA`, `VALOR`, `SITUACAO`, `AGENTE_ID`) · `CC_COBRANCA` (`PROX_ACAO`, `PROX_ACAO_DATA`, `ENCERRADO_EM`, `CARTEIRA`, `CARD_ID`) · `KB_MOVIMENTO` (`CARD_ID`, `DE_FASE_ID`, `PARA_FASE_ID`, `USUARIO_ID`, `ORIGEM`, `QUANDO`) | existem. A carteira da ação vem de `CC_COBRANCA` por `COBRANCA_ID` (O-8) |
| Acordos e baixas | `CC_ACORDO` (`PROPOSTO_EM/POR`, `DECIDIDO_EM/POR`, `PARECER`, `ENCERRADO_EM`, `SITUACAO`, `DEBITO`, `VALOR`, `ENTRADA`, `N_PARCELAS`, `GARANTIA`) · `CC_ACORDO_PARCELA` (`N`, `VENC`, `VALOR`, `PAGO_EM` D10, `PAGO_POR`) · `CC_BAIXA` (`PROPOSTO_EM`, `PARECER_EM`, `PARECER_RESULTADO`, `PARECER_TEXTO`, `DECIDIDO_EM`, `DECISAO_TEXTO`, `VALOR`, `MOTIVO`, autores) | existem |
| Crédito | `CC_SOLICITACAO` (`CRIADO_EM/POR`, `VALOR`, `PRAZO_MESES`, `JUSTIFICATIVA`) · `CC_DECISAO` (`EM`, `ENTIDADE`, `RESULTADO`, `LIMITE_APROVADO`, `RATING`, `RATING_PUB`, `PARECER`, `RESPONSAVEL_ID`) · `CC_CREDITO` (`INICIO_VALIDADE`, `LIMITE`, `FIM_VALIDADE`, `PLANO_DESCR`) · `CC_PEDIDO_RETIDO` (`CRIADO_EM/POR`, `NUMERO_PEDIDO`, `VALOR`, `EXCESSO`, `ALCADA_EXIGIDA`) · `KB_MOVIMENTO` | existem |
| Jurídico | `CC_PROCESSO` (`DOSSIE_ABERTO_EM/POR`, `DOSSIE_ENVIADO_EM/POR`, `ORIGEM` `COBRANCA`/`MANUAL`/`CARGA`, `CRIADO_EM/POR`, `ENCERRADO_EM`, `MOTIVO_*`, `AUTOS`, `TRIBUNAL`, `VALOR`, `VALOR_ATUALIZADO`) · `CC_PROCESSO_ANDAMENTO` (`PROCESSO_ID`, `EM`, `TEXTO`, `AUTOR_ID`, `AUTOR_NOME`) · `CC_ACORDO_JUDICIAL` (`REGISTRADO_EM/POR`, `APROVADO_EM/POR`, `VALOR`, `ENTRADA`, `N_PARCELAS`, `HONORARIOS`) · `CC_NOTIFICACAO_EXTRAJUDICIAL` (`EMITIDA_EM` D10, `TOTAL`, `PRAZO_ATE`, `EMITIDA_POR`) · `KB_MOVIMENTO` | existem; andamento e acordo judicial chegam ao cliente pelo processo, como o plan diz |
| Setor público | `CC_NF_PUBLICA` (`EMISSAO`, `PROTOCOLO`, `ATESTO`, `LIQUIDACAO`, `OP`, `PAGO_EM`, `NUMNOTA`, `VALOR`, `EMPENHO`) · `CC_NF_ACAO` (`FEITO_EM/POR`, `PASSO`, `OBS`, `PROTOCOLO_ORGAO`, `NO_PRAZO`) | existem; falta `CANCELADA = FALSE` (C-4) |
| Comunicação | `CC_EMAIL_ENVIADO` (`ENVIADO_EM/POR`, `ASSUNTO`, `PARA`, `RESULTADO`, `CORPO`, `CLIENTE_ID`) · `KB_LOG` (`EVENTO = 'nota'`, `DETALHE '$.texto'`, `QUANDO`, `USUARIO_ID`, `CARD_ID`) | existem |
| Recebimentos | `CC_RECEBIMENTO` (`DATA_PAGAMENTO`, `VALOR_PAGO`, `VENCIMENTO`, `DIAS_ATRASO_PAGAMENTO`, `ESTORNADO`, `TITULO`, `PARCELA`) | existem |
| Alteração auditada | `CC_AUDITORIA` (`EM`, `AREA`, `ENTIDADE`, `CAMPO`, `ANTES`, `DEPOIS`, `POR_NOME`, `CLIENTE_ID`); áreas `Histórico`, `Fontes`, `Material`, `Contatos` em 01 §7 | existem; os nomes de `ENTIDADE` da borda 4 são as tabelas sem `CC_` (02) |

Índice por `CLIENTE_ID` (ou `PROCESSO_ID`/`CARD_ID` nas que chegam pelo pai) existe em todas as 39 origens (02 e DDL da lib).

## 3. Achados

### BLOQUEIA

Nenhum.

### CORRIGIR

| # | Onde | Achado |
|---|---|---|
| C-1 | `plan.md` §Simulador, passo 4 da história; `spec.md` §Testes, "Dados de referência" ("solicitação… (Rita)") | Rita abre a solicitação e o pedido de 7001, mas antes disso não vê 7001: o cliente é da Ana e Rita é irmã dela na equipe (01 §6). `ccCredSolicitacaoCriar` e `ccCredPedidoCriar` são `T` e exigem cliente visível (04 §4; plan 004 §1). As duas chamadas voltam "Cliente não encontrado.", e quebram C-001 (`SOLICITACAO` 1, `PEDIDO` 1), C-006 (etapa de crédito) e RN-002 (Rita abre 7001). Correção: Ana, ou Sérgio, abre a solicitação com `analistaId` = Rita; o pedido vem depois, quando Rita já é a analista. |
| C-2 | `plan.md` §Testes RN-001 (S); T-122 | O assert diz "a linha `CONTATO` vem imediatamente antes da `PROMESSA`". Só que `ccCobContatoRegistrar` também grava uma nota no card no mesmo instante (04 §2, coluna kb; a borda 9 do próprio plan admite isso). Com `ORIGEM ASC` no empate, a `NOTA` fica entre as duas (C < N < P), e o teste falha com o relógio fixo do smoke. Melhor afirmar "`CONTATO` antes de `PROMESSA`, e a ordem por `ORIGEM` dentro do mesmo `EM`". |
| C-3 | `plan.md` §Testes C-011 ("as três gravações somam 3 linhas"); `spec.md` RF-023 ("C-011: 3 registros"); T-110 | O C-011 faz 4 gravações: incluir, editar o uso, mudar a ordem e inativar. Pela regra "uma linha por campo que mudou" (plan §Fontes, passo 4), isso dá 4 linhas (`(criação)`, `USO`, `ORDEM`, `ATIVO`). O assert de 3 falha. |
| C-4 | `plan.md` §Registros do histórico, linhas `NF_*` e `NF_ACAO` | 02 `CC_NF_PUBLICA` manda "toda leitura e a régua filtram `CANCELADA = FALSE`". As 7 subconsultas de Setor público não filtram, e a NF cancelada no Winthor continuaria aparecendo no histórico e no documento. |

### OBSERVAÇÃO

| # | Onde | Achado |
|---|---|---|
| O-1 | `plan.md` §Testes C-010, C-012, C-013, C-014, C-016 | As contagens dependem da ordem dos testes no mesmo banco. No C-012, Gustavo e Diana salvam com sucesso e mudam 41/7. O C-016 cria um material e afirma `PENDENTES = 7`. O C-014 inativa um fluxo. O plan fixa a ordem só entre blocos. Fixar a ordem dentro do bloco, ou afirmar diferenças em vez de totais. |
| O-2 | `plan.md` §Resumo, passo 1 (também `ccHistExportar`) | A consulta lê "cliente + agente + superior do agente", mas `visivel(m, cliente)` também precisa do analista (caminho) e de `NO_JURIDICO` (RN-002 com Rita, RN-017 com Júlia). Dizer que a leitura traz esses campos, ou aplicar `clienteVisivel('C')` na própria consulta. |
| O-3 | `plan.md` §Contratos `ccHistFonteRevisar` | A auditoria da revisão (área `Fontes`, campo `REVISAR_JURIDICO`) e o custo (3) não estão escritos. 04 §0 diz que toda escrita audita; falta deixar explícito no passo e no teste C-013. |
| O-4 | 04 §7 `ccHistRegrasVigentes` × `plan.md` §Superfície, diferença 5 | O contrato põe o nome do grupo (`GRUPOS_PARAMETRO`) na saída da SF, mas esse nome mora em `frontend/src/lib/base/parametros.ts` (01 §9). O plan resolve na tela, e está certo. Vale alinhar o texto de 04. |
| O-5 | `plan.md` §Simulador (seeds declarados `001-base`, `005-setor-publico`) | O seed da 005 fixa o relógio do seu banco em 2026-12-01 (06 §1, §2.3); a 007 roda em 19/11. Dizer que o `dominio()` da 005 roda sob o relógio dela, e que os asserts de 5001 e 5002 (P1, `L1`/`L2`, emissão) não dependem da data. |
| O-6 | `plan.md` §Testes RN-002 | "`visitante` recebe `ok: false` em tudo": nas SQL-L (`ccHistClienteBuscar`, `ccHistEventoListar`) a evidência é zero linha, não `ok: false`. Escrever como no C-004. |
| O-7 | `tasks.md` cabeçalho, linhas 10–11 | Ainda fala em "propostas PA-01 a PA-19 … nenhuma resposta bloqueia". Os pedidos já foram respondidos (00-respostas, 16/11). Trocar por "respondidos e aplicados". |
| O-8 | `plan.md` §Registros do histórico | Faltam duas notas no mapa. (a) `CC_ACAO_REGUA` não tem `CARTEIRA`: o nome da fase pede a junção com `CC_COBRANCA` por `COBRANCA_ID`. (b) Parcela de acordo vencida e não paga não aparece (não é paga nem agendada). Declarar se é de propósito. |

## 4. v1 → v2

| v1 | Destino |
|---|---|
| C-1 (D-010 × C-001/C-002/C-019) | resolvido: C-001 afirma "nenhuma `AUDITORIA`" para a Ana; nasceram C-022 e RN-016 |
| C-2 (padrões sem teste) | resolvido: C-021, C-022, RN-016, RN-017 |
| C-3 (cabeçalho das tasks exige respostas) | resolvido (resta a redação do O-7) |
| C-4 (~60 execuções) | resolvido: `UNION ALL` único; abrir = 2 |
| C-5 (origem com erro some em silêncio) | resolvido: uma consulta só, o erro aparece (D-002) |
| C-6 (terceira visibilidade) | resolvido: `EU` + `clienteVisivel` e `sessao()` + `visivel()` da 001 (ver O-2) |
| C-7 (smoke com stubs) | resolvido: história pelas SFs das donas (D-014) |
| C-8 (farol/rating) | resolvido: RN-005 com rating AA–E ou P1–P4 |
| C-9 (colunas em `CC_CREDITO`) | resolvido: `CC_RISCO_CLIENTE`, `CC_SOLICITACAO.FP_NOME`, `CC_ANALISE_ORGAO.FONTE_PAGADORA` |
| C-10 (anexo `MATERIAL`) | resolvido: 04 §1 `ccBaseAnexoRegistrar` aceita `MATERIAL` (ADM) |
| C-11 (quem recusa tipo e tamanho) | resolvido: `ccBaseAnexoRegistrar`, na spec e no plan |
| C-12 (arquivos compartilhados) | resolvido: costuras de 01 §14; o resto vai ao integrador |
| C-13 (elenco) | resolvido: elenco de 06 |
| C-14 (asserts de RF-014, RF-018, RF-023) | RF-014 e RF-018 resolvidos; RF-023 mal resolvido (C-3) |
| O-1 (desempate) | resolvido: `ORIGEM`, `ORIGEM_ID` |
| O-2 (estorno) | resolvido: RN-019 |
| O-3 (anuência e dossiê) | dossiê resolvido; a anuência entra como ação da régua (`CC_ACAO_REGUA.ORIGEM = 'ANUENCIA'`) e como e-mail |
| O-4 a O-7 (fora de escopo) | resolvidos |
| O-8 (`ATUALIZADO_POR` com e-mail) | resolvido: `INT` em 02 |
| O-9 (jsPDF) | resolvido: impressão do navegador (D-001) |
| O-10 (timbrado) | aceito pelo padrão P-32 (T-211 espera a arte) |
| O-11 (limite 100) | resolvido: a tela usa 100 |
| O-12 (numeração) | resolvido |
