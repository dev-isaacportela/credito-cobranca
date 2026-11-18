# Plan: Histórico do cliente e apoio (fontes, material, regras em vigor)

**Spec:** `spec.md` · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c)

> O COMO. Nenhum requisito novo nasce aqui — se faltou algo, volta pra spec.
> Tabelas, colunas, parâmetros e assinaturas de SF estão no contrato; aqui só o
> que ele não diz: algoritmo, ordem das escritas, casos de borda e como testar.
> Pedidos PA-01 a PA-19 de `docs/contrato/pedidos/007-historico-apoio.md`: respondidos em
> `docs/contrato/pedidos/00-respostas.md` (16/11/2026) e já refletidos no contrato; cada ponto cita a seção.

## Checagem de princípios

| Princípio (constitution) | Toca? | Como atende |
|---|---|---|
| I. Spec antes de código | sim | `spec.md` corrigida, zero `[NEEDS CLARIFICATION]`; pendências P-27, P-02, P-25, P-32 e P-33 seguem com padrão adotado |
| II. Política é dado | sim | As regras em vigor são lidas do catálogo único (`ccBaseParametroListar`, 03) e dos quadros (`CC_FASE` + `KB_FASE`); a 007 não tem parâmetro próprio nem guarda texto de regra. Constantes só de definição do sistema: as 8 categorias, os 12 campos do resumo, o teto de 2.000 registros do documento |
| III. Regra no servidor | sim | Visibilidade pelo fragmento `EU` + `clienteVisivel()` (01 §6) nas SQL e por `sessao()` + `visivel()` nas JS; permissão de fontes e material na guarda `ATOR` das `ccEscHist…` (01 §5); quem vê `Alteração auditada` decidido na SQL |
| IV. Winthor é a fonte do financeiro | sim | Nada é escrito no Winthor; recebimentos e posição vêm das tabelas que a 001 grava na leitura |
| V. Toda escrita é auditada | sim | Fontes, material e cada emissão do documento chamam `auditar()` (áreas `Fontes`, `Material`, `Histórico` — 01 §7) |
| VI. Testes obrigatórios | sim | Cada linha da seção Testes da spec tem `teste()` em `backend/simulator/smoke/007-historico-apoio.mjs` ou `test()` em `frontend/tests/007-historico-apoio.test.mjs` |
| VII. Migrations append-only | sim | Só `schema/007-historico-apoio.mjs` e `add-070-historico-apoio.mjs`; nada em `backend/migrations/` |
| VIII. Simplicidade | sim | Histórico sem tabela própria (uma consulta sobre o que as donas já gravam); documento gerado pela impressão do navegador (sem biblioteca de PDF); sem tabela de grupos; sem cache |
| IX. Segurança e credenciais | sim | Nenhum token no front; o endereço do arquivo de material só sai em SF com membro ativo |

## Contexto técnico

- **Frontend:** React 19 · Vite 7 · Tailwind 4 · react-router 7 · `mitra-interactions-sdk`; design system Benenutri.
- **Backend:** tabelas e SFs na plataforma Mitra; prefixo `ccHist…` / `ccEscHist…` (01 §1); arquivo `add-070-historico-apoio.mjs`.
- **Reuso identificado (001):** preâmbulo `sessao`, `quem`, `ler`, `escrever`, `auditar`, `visivel`, `agora`, `hoje` (`lib/escritas.mjs`); fragmentos `EU`, `clienteVisivel`, `ATOR`, `HOJE_SQL`; `ccBaseParametroListar`; `ccBaseAnexoRegistrar` / `ccBaseAnexoRemover`; `enviarArquivo()` de `frontend/src/lib/base/arquivos.ts`. A 007 não tem quadro: nada de `registrarExtensao()` nem de gancho.
- **Dependência nova:** nenhuma. O `jspdf` do plano anterior saiu (D-001).
- **O que a 007 não entrega** (não tem): `lib/parametros/007`, `lib/modelos/007`, `lib/quadros/007` (PA-18).

## Modelo de dados

| Entidade (spec) | Tabela | Onde está | Observação |
|---|---|---|---|
| Fonte / link | `CC_FONTE_LINK` | 02 §007 | com a coluna `BUSCA` (V(900), mantida por `ccHistFonteSalvar` — PA-05) |
| Material de apoio | `CC_MATERIAL` | 02 §007 | arquivo em `CC_ANEXO` com `ENTIDADE = 'MATERIAL'`, `ENTIDADE_ID` = id do material (01 §12) |
| Registro do histórico, resumo | nenhuma | 02 §007 (nota final), 04 §7 (mapa) | derivado em consulta |
| Regra em vigor | nenhuma | 03; 02 `CC_FASE` | leitura |

`BUSCA` (das duas tabelas) = `normalizar(…)` de `backend/lib/historico-apoio/texto.mjs`: sem acento, CAIXA ALTA, espaços colapsados — a mesma forma de `CC_CLIENTE.NOME_BUSCA`. Em `CC_FONTE_LINK`: título + responsável + uso; em `CC_MATERIAL`: título + descrição + marcadores (02).

Ordem dos grupos na listagem, sem tabela de grupos: `ORDER BY (SELECT MIN(X.ID) FROM <tabela> X WHERE X.GRUPO = T.GRUPO), T.ORDEM, T.TITULO` — o grupo aparece na ordem em que nasceu (a da carga inicial) e, dentro dele, vale `ORDEM`.

### Registros do histórico: o que cada origem vira

Um fragmento só, `EVENTOS_SQL(clienteId)` em `backend/lib/historico-apoio/eventos.mjs`: `UNION ALL` de subconsultas, cada uma filtrada por `CLIENTE_ID` (índice garantido em 04 §11, pedidos 007 P-2 a P-10) e devolvendo as mesmas colunas: `EM`, `CATEGORIA`, `TITULO`, `TEXTO`, `AUTOR_NOME`, `ORIGEM`, `ORIGEM_ID`, `CARD_ID`, `AGENDADO`. O fragmento é montado por uma função `origem({ … })` que recebe a tabela, as expressões e o `WHERE`, para as 39 subconsultas saírem iguais. O mesmo texto serve a `ccHistEventoListar`, `ccHistEventoTotal`, às contagens de `ccHistResumo` e a `ccHistExportar`.

| Categoria | `ORIGEM` | Tabela (condição) | `EM` | Título | Texto | Autor |
|---|---|---|---|---|---|---|
| Cobrança | `ACAO` | `CC_ACAO_REGUA` | `FEITA_EM` | Ação da régua feita | nome da fase (`CC_FASE` do quadro `cobranca-<carteira>` + `KB_FASE.NOME`; a carteira vem de `CC_COBRANCA` por `COBRANCA_ID`, que `CC_ACAO_REGUA` não tem `CARTEIRA`), origem, no prazo ou fora | `FEITA_POR` |
| | `CONTATO` | `CC_CONTATO_COBRANCA` | `CRIADO_EM`; se `DATA` é de dia anterior, `DATA` às 00:00 | Contato por `CANAL`: `RETORNO` | "Falou com …" + `FEEDBACK` | `AGENTE_ID` |
| | `PROMESSA` | `CC_PROMESSA` | o `EM` do contato que a criou (`CONTATO_ID`) | Promessa de pagamento até `{D:DATA_PROMETIDA}` | `{R$:VALOR}` (se > 0) e a situação | `AGENTE_ID` |
| | `PROX_ACAO` | `CC_COBRANCA` (aberto, `PROX_ACAO <> ''`, `PROX_ACAO_DATA ≥ hoje`) — 04 §7 (mapa) | `PROX_ACAO_DATA`; agendado | Próxima ação: `PROX_ACAO` | carteira | — |
| | `MOV_COB` | `KB_MOVIMENTO` dos cards de `CC_COBRANCA` | `QUANDO` em hora de Brasília | Etapa da cobrança: nome da fase de destino | carteira; "veio de" fase de origem | "Rotina" se `ORIGEM = 'sistema'`; senão o membro de `USUARIO_ID` |
| Acordos e baixas | `ACORDO` | `CC_ACORDO` | `PROPOSTO_EM` | Acordo proposto | débito, valor, entrada, parcelas, garantia | `PROPOSTO_POR` |
| | `ACORDO_DECISAO` | `CC_ACORDO` (`DECIDIDO_EM` preenchido) | `DECIDIDO_EM` | Acordo aprovado / recusado (`SITUACAO = 'RECUSADO'`) | `PARECER` | `DECIDIDO_POR` |
| | `ACORDO_FIM` | `CC_ACORDO` (`ENCERRADO_EM`, situação `QUITADO`, `QUEBRADO` ou `CANCELADO`) | `ENCERRADO_EM` | Acordo quitado / quebrado / cancelado | — | — |
| | `ACORDO_PARCELA` | `CC_ACORDO_PARCELA` paga | `PAGO_EM` | Entrada do acordo paga (`N = 0`) / Parcela `N` do acordo paga | `{R$:VALOR}` | `PAGO_POR` |
| | `ACORDO_PARCELA` | `CC_ACORDO_PARCELA` em aberto, de acordo `ATIVO`, `VENC ≥ hoje` | `VENC`; agendado | Parcela `N` do acordo vence | `{R$:VALOR}` | — |
| | `BAIXA`, `BAIXA_PARECER`, `BAIXA_DECISAO` | `CC_BAIXA` (uma por data preenchida: proposta, parecer, decisão) | `PROPOSTO_EM`, `PARECER_EM`, `DECIDIDO_EM` | Baixa como perda proposta / Parecer do Jurídico: favorável ou desfavorável / Baixa aprovada ou recusada | valor e motivo / texto do parecer / texto da decisão | quem propôs, deu parecer, decidiu |
| Crédito | `SOLICITACAO` | `CC_SOLICITACAO` | `CRIADO_EM` | Solicitação de crédito aberta | `{R$:VALOR}`, prazo, justificativa | `CRIADO_POR` |
| | `DECISAO` | `CC_DECISAO` | `EM` | Decisão de crédito (ou do pedido): resultado por extenso | alçada, limite aprovado, rating (`RATING` ou `RATING_PUB`), parecer | `RESPONSAVEL_ID` |
| | `CREDITO` | `CC_CREDITO` | `INICIO_VALIDADE` | Crédito liberado | limite, validade, plano | — |
| | `PEDIDO` | `CC_PEDIDO_RETIDO` | `CRIADO_EM` | Pedido `NUMERO_PEDIDO` retido por limite | valor, excesso, alçada exigida | `CRIADO_POR` |
| | `MOV_CRED`, `MOV_PED` | `KB_MOVIMENTO` dos cards de `CC_SOLICITACAO` e de `CC_PEDIDO_RETIDO` | `QUANDO` | Etapa do crédito / do pedido: fase de destino | carteira | como `MOV_COB` |
| Jurídico | `DOSSIE`, `DOSSIE_ENVIO` | `CC_PROCESSO` (`DOSSIE_ABERTO_EM`, `DOSSIE_ENVIADO_EM`) | idem | Dossiê para o Jurídico aberto / enviado | valor, valor atualizado | quem abriu, quem enviou |
| | `PROCESSO` | `CC_PROCESSO` sem dossiê (`ORIGEM` `MANUAL` ou `CARGA`) | `CRIADO_EM` | Processo registrado | autos, tribunal, valor | `CRIADO_POR` |
| | `PROCESSO_FIM` | `CC_PROCESSO` (`ENCERRADO_EM`) | `ENCERRADO_EM` | Processo encerrado | motivo | — |
| | `ANDAMENTO` | `CC_PROCESSO_ANDAMENTO` (pelo `CLIENTE_ID` do processo) | `EM` | Andamento do processo | `TEXTO` | `AUTOR_ID`; na carga, `AUTOR_NOME` |
| | `ACORDO_JUD`, `ACORDO_JUD_APROV` | `CC_ACORDO_JUDICIAL` (pelo processo) | `REGISTRADO_EM`, `APROVADO_EM` | Acordo judicial registrado / aprovado | valor, entrada, parcelas, honorários | quem registrou, quem aprovou |
| | `NOTIFICACAO` | `CC_NOTIFICACAO_EXTRAJUDICIAL` | `EMITIDA_EM` | Notificação extrajudicial emitida | total e prazo | `EMITIDA_POR` |
| | `MOV_JUR` | `KB_MOVIMENTO` dos cards de `CC_PROCESSO` — 04 §7 (mapa) | `QUANDO` | Etapa do processo: fase de destino | — | como `MOV_COB` |
| Setor público | `NF_EMISSAO`, `NF_PROTOCOLO`, `NF_ATESTO`, `NF_LIQUIDACAO`, `NF_OP`, `NF_PAGAMENTO` | `CC_NF_PUBLICA` com `CANCELADA = FALSE` (02), uma por data preenchida (`EMISSAO`, `PROTOCOLO`, `ATESTO`, `LIQUIDACAO`, `OP`, `PAGO_EM`) | a data | NF `NUMNOTA`: emitida / protocolada / atestada / liquidada / ordem de pagamento / paga | valor, empenho | — |
| | `NF_ACAO` | `CC_NF_ACAO` com `JOIN CC_NF_PUBLICA` por `NF_ID` e `CANCELADA = FALSE` | `FEITO_EM` | Régua da NF `NUMNOTA`: passo `PASSO` | observação, protocolo do órgão, no prazo ou fora | `FEITO_POR` |
| Comunicação | `EMAIL` | `CC_EMAIL_ENVIADO` | `ENVIADO_EM` | `ASSUNTO` | "Para `PARA` · Enviado/Falhou" `{+}` `CORPO` | `ENVIADO_POR` (nulo = Rotina) |
| | `NOTA` | `KB_LOG` com `EVENTO = 'nota'` dos cards do cliente | `QUANDO` | Nota no card | `JSON_UNQUOTE(JSON_EXTRACT(DETALHE, '$.texto'))` | membro de `USUARIO_ID` |
| Recebimentos | `RECEBIMENTO` | `CC_RECEBIMENTO` com `ESTORNADO = FALSE` | `DATA_PAGAMENTO` | Pagamento recebido / recebido com atraso (`DIAS_ATRASO_PAGAMENTO > 0`) | título e parcela, `{R$:VALOR_PAGO}`, vencimento, dias de atraso | "Winthor" |
| Alteração auditada | `AUDITORIA` | `CC_AUDITORIA` (ver borda 4) | `EM` | `AREA`: `CAMPO` | de `ANTES` para `DEPOIS` | `POR_NOME` |

Casos de borda do fragmento:

1. **Cards do cliente:** tabela derivada `CARDS` = `CARD_ID` de `CC_COBRANCA`, `CC_SOLICITACAO`, `CC_PEDIDO_RETIDO` e `CC_PROCESSO` do cliente (`CARD_ID` não nulo); `KB_MOVIMENTO` e `KB_LOG` só entram por ela. Nome da fase = `KB_FASE.NOME` de hoje (se o gestor renomeou a fase, o histórico mostra o nome novo).
2. **Datas:** coluna de data sem hora vira `CONCAT(data, 'T00:00:00')`. `KB_*.QUANDO` é UTC: convertido pelo fragmento `KB_BRASILIA` da 001 (01 §3).
3. **Dinheiro e data dentro do texto:** a SQL não formata. Escreve marcadores — `{R$:12500.00}`, `{D:2026-11-24}` — e `{+}` separando o que só aparece ao expandir (corpo do e-mail). A função pura `formatarTexto()` da tela troca os marcadores (pt-BR). Evita `FORMAT()` e formato de data por dialeto nas 39 subconsultas.
4. **Auditoria sem eco:** ficam fora as linhas de auditoria que só repetem a criação de um fato que já é origem do mapa: o fato já aparece na sua categoria. O filtro é por par `ENTIDADE|CAMPO`, como as donas gravam hoje (não por `(criação)` genérico, que as donas não usam de modo uniforme; divergência aceita em B4-007): `CONTATO|(contato)`, `ACORDO|(proposta)`, `BAIXA|(proposta)`, `SOLICITACAO|Solicitação`, `PEDIDO|Pedido`, `CREDITO|Crédito`, `CREDITO|Crédito renovado`, `PROCESSO|(criação)`, `ANDAMENTO|Andamento`, `ACORDO_JUDICIAL|(criação)`, `NOTIFICACAO|(criação)`, `EMAIL_ENVIADO|(envio)` (`ECO_AUDITORIA` em `eventos.mjs`), mais o passo da NF (`NF_PUBLICA`, campo `… · passo …`), que já é `NF_ACAO`. Alteração de campo (inclusive `Situação`, `Reanálise`, parcela paga), remoção e criação do que não está no mapa (contato da ficha, anexo, atribuição, emissão do histórico) entram. Um teste de regra pura confere que cada par ainda é o que as donas gravam (se uma dona renomear o campo, o teste quebra).
4a. **Junções do mesmo cliente:** toda junção que só traz o card, a NF ou o processo de uma origem confere que é do mesmo cliente (`CC_COBRANCA`, `CC_SOLICITACAO`, `CC_PEDIDO_RETIDO`, `CC_PROCESSO` da notificação, `CC_NF_PUBLICA` do passo da NF; B4 C-02): dado inconsistente numa dona não leva card nem NF de outro cliente para a linha do tempo.
4b. **Parâmetro numérico:** todo número da entrada na SQL entra como `CAST('{{x}}' AS SIGNED)` (B4 C-01), nas leituras e nas 5 internas. Exceção: `LIMIT {{limite}} OFFSET {{offset}}`, porque o MySQL só aceita literal ali (padrão de 06 §5); a proteção desses dois depende da plataforma (S-16).
5. **Quem vê o quê**, na consulta de fora: `JOIN CC_CLIENTE C ON C.ID = {{clienteId}}` + `EU` + `clienteVisivel('C')` (sem acesso = zero linha) e `(E.CATEGORIA <> 'Alteração auditada' OR NIVEL_MIN(2))`, com o fragmento `NIVEL_MIN(n)` de `guarda.mjs` sobre `EU` (= `EU.NIVEL >= 2 OR EU.ADMIN = TRUE`; 01 §5, §7, D-06). O Jurídico (nível 0) fica sem a categoria sem regra à parte (PA-08, P-27).
6. **Ordem (RN-001):** `ORDER BY E.AGENDADO DESC, CASE WHEN E.AGENDADO = 1 THEN E.EM ELSE '' END ASC, E.EM DESC, E.ORIGEM ASC, E.ORIGEM_ID DESC`. `ORIGEM` + `ORIGEM_ID` é único por registro: é o desempate e a chave da linha na tela.
7. **Filtros:** `categoria` com uma ou mais categorias separadas por vírgula (`FIND_IN_SET`; 04 §7); `de`/`ate` comparam o dia de `EM`; sem `busca` (04 §7 `ccHistEventoListar`).
8. **Fora do mapa de propósito:** custo de processo, item de dossiê, parcela de acordo judicial, posição por BU (spec, Fora de escopo). Parcela de acordo vencida e não paga também não entra: não é fato nem agenda; o atraso está na posição do resumo e a quebra aparece em `ACORDO_FIM`.
9. **Redundância conhecida:** a nota que uma SF do domínio escreve no card (ex.: contato registrado) aparece em Comunicação além do fato na sua categoria. Fica assim (o mapa do contrato é esse); ver Riscos. O parecer do Jurídico na baixa não grava nota (04 §2 `ccCobBaixaParecer`): aparece só como `BAIXA_PARECER`, lido de `CC_BAIXA` (o mesmo dado da ficha do caso).

## Contratos de backend

Assinaturas em **04 §7**; SFs internas e guarda em 04 §7 e 01 §5. Abaixo, só o que o contrato não diz.

| SF pública | Cenários que atende | Teste de smoke | O que este plano acrescenta |
|---|---|---|---|
| `ccHistClienteBuscar` + `ccHistClienteBuscarTotal` (04 §7) | C-003, C-004, C-021 · RF-001, RF-007 | C-003, C-004, C-021, RN-002 | A tela manda `busca` já normalizada por `termoDeBusca()`: só dígitos quando o termo é número com pontuação; senão CAIXA ALTA sem acento. Casa `NOME_BUSCA LIKE %termo%`, `DOCUMENTO LIKE termo%` ou `CODCLI = termo`. Ordem por `NOME`. Menos de 2 caracteres: a tela não chama |
| `ccHistResumo` | C-005, C-006 · RF-006, RF-004 (contagens) | C-002, C-005, C-006, C-022, RN-005 | Ver "Resumo" abaixo |
| `ccHistEventoListar` + `ccHistEventoTotal` | C-001, C-002, C-019, C-021, C-022 · RF-002 a RF-005, RF-025 | C-001, C-002, C-019, C-021, C-022, RN-001, RN-004, RN-015, RN-016, RN-019, Órgão público | `EVENTOS_SQL` + bordas 5 a 7; saída com `AGENDADO` (04 §7) |
| `ccHistExportar` | C-007, C-009 · RF-008, RF-010, RF-011 | C-007, C-009, RN-003, RN-008, RN-018 | Ver "Emissão" abaixo |
| `ccHistFonteListar` + `ccHistFonteTotal` | C-010, C-011 · RF-013 | C-010, C-011, RN-009, RN-013 | `ativo`: `1` só ativas (padrão) · `0` só inativas · `-1` todas; inativa só aparece para `PODE_ADMINISTRAR` sobre `EU` (nível ≥ 3 ou `ADMIN`, D-06), qualquer que seja o filtro. `…Total` devolve também `A_REVISAR` e `GRUPOS` (os três números do cabeçalho da tela) |
| `ccHistFonteSalvar` | C-011, C-012 · RF-014, RF-023, RF-024 | C-011, C-012, RN-009, RN-010, RN-011 | Ver "Fontes" abaixo |
| `ccHistFonteRevisar` | C-013 · RF-016 | C-013, RN-010 | Uma `UPDATE` com `REVISAR_JURIDICO = TRUE` no `WHERE`: revisar duas vezes não regrava (0 linha = "já revisada ou sem permissão"). Com 1 linha, `auditar('Fontes', 'FONTE_LINK', id, null, [{ campo: 'REVISAR_JURIDICO', antes: 'Sim', depois: 'Não' }], m)`; com 0, não audita. Custo: 3 execuções (JS + `ccEscHistFonteRevisar` + auditoria) |
| `ccHistMaterialListar` + `ccHistMaterialTotal` | C-014, C-016 · RF-017, RF-019 | C-014, C-016, RN-012 | `LEFT JOIN CC_ANEXO` só com `ENTIDADE = 'MATERIAL'` e `REMOVIDO_EM IS NULL`; sem anexo = `ANEXO_URL` nulo ("Arquivo pendente"). Mesmo `ativo` das fontes. `…Total` devolve também `PENDENTES` |
| `ccHistMaterialSalvar` | C-015, C-012 · RF-018, RF-023, RF-024 | C-012, C-014, C-015, C-016, RN-012 | Ver "Material" abaixo |
| `ccHistRegrasVigentes` | C-017, C-018, C-020 · RF-020 a RF-022 | C-017, C-018, C-020, RN-014 | Ver "Regras" abaixo |

Internas (04 §7): `ccEscHistFonteInserir`, `ccEscHistFonteAtualizar`, `ccEscHistFonteRevisar`, `ccEscHistMaterialInserir`, `ccEscHistMaterialAtualizar`. Guarda `ATOR({{membroId}})` com `PODE_ADMINISTRAR` (`A.NIVEL >= 3 OR A.ADMIN = TRUE`; revisar: `A.CARGO = 'JURIDICO' OR PODE_ADMINISTRAR`) — fragmento único de `guarda.mjs` (01 §4, §5, D-06). Inserção = `INSERT … SELECT … FROM DUAL WHERE <guarda> AND NOT EXISTS (mesmo GRUPO e TITULO)`; a JS relê o id pela chave única.

### Resumo (`ccHistResumo`)

1. `m = sessao()`; lê cliente + agente + superior do agente + analista (caminho) + `NO_JURIDICO` + posição numa consulta (o que `visivel()` usa, inclusive para a analista e para o Jurídico); `visivel(m, cliente)` falso ou cliente inexistente → `{ ok: false, error: 'Cliente não encontrado.' }` (01 §8).
2. Mais três consultas por `ler()`: (a) crédito — solicitação mais recente com a fase do card (`FASE_DO_CARD` + `KB_FASE.NOME`), crédito vigente (`VIGENTE_CHAVE`), `CC_RISCO_CLIENTE`, fonte pagadora (`CC_SOLICITACAO.FP_NOME`; órgão: `CC_ANALISE_ORGAO.FONTE_PAGADORA`) e rating público pela regra de 02 `CC_ANALISE_ORGAO`; (b) cobrança e Jurídico — casos abertos com carteira e nome da fase, processos ativos e total, último contato, quantidade de contatos, promessas abertas, recuperado, documentos; (c) contagens — `SELECT CATEGORIA, COUNT(*) FROM (EVENTOS_SQL) … GROUP BY CATEGORIA`, com a mesma borda 5.
3. Saída: as chaves de 04 §7 mais `recuperado`, `contatos`, `promessasAbertas`, `documentos` e `total` (04 §7 `ccHistResumo`, DT-33). `credito = { etapa, carteira, fontePagadora, vigente: { LIMITE, FIM_VALIDADE, SITUACAO } | null }`, ou `null` para quem nunca teve solicitação; `cobrancas = [{ CARTEIRA, FASE_NOME, CARD_ID }]` (um cliente pode ter caso em duas carteiras). Sem dado = `null` (a tela mostra "—"): recuperado sem pagamento atrasado é `null`, não zero.
4. Custo: 1 execução (as leituras são `ler()`, não SF).

### Emissão (`ccHistExportar`)

1. Mesma recusa do resumo. Reusa as consultas do resumo (função de `lib/historico-apoio/resumo.mjs`), lê a ficha (`CC_CONTATO_CLIENTE` do cliente, menos `NAO_USAR`) e os registros por `ler(EVENTOS_SQL)` com o filtro e `LIMIT teto`, onde `teto = 2000` (constante `TETO_EMISSAO`; o simulador pode reduzir por `process.env.CC_HIST_TETO`, do mesmo jeito que `CC_AGORA` — só para o teste da RN-018).
2. Devolve `{ ok, emitidoEm: agora(), emitidoPor: m.nome, cliente, resumo, contatos, eventos, total, cortado }`; `cortado = total > eventos.length`.
3. Depois de montar tudo, `auditar('Histórico', 'CLIENTE', clienteId, clienteId, [{ campo: '(emissão)', antes: '', depois: 'Categorias: …; período: …; N registros' }], m)` (04 §7 `ccHistExportar`). Uma linha por chamada; a tela chama uma vez por abertura da prévia, não por clique em imprimir.
4. Custo: 2 execuções.

### Fontes (`ccHistFonteSalvar`)

1. `m = quem()`; valida: grupo e título não vazios; `url` vazia ou começando por `http://` / `https://` (mensagem cita "http"); em edição, a fonte existe.
2. `fonteId = 0` → `ccEscHistFonteInserir` (`REVISAR_JURIDICO = revisarJuridico`); 0 linha = título repetido no grupo ou sem permissão — a JS distingue relendo a chave.
3. `fonteId > 0` → `ccEscHistFonteAtualizar`. **O selo volta na própria SQL** (vale mesmo em chamada direta): `REVISAR_JURIDICO = CASE WHEN TITULO <> '{{titulo}}' OR COALESCE(URL, '') <> '{{url}}' OR {{revisarJuridico}} = 1 THEN TRUE ELSE REVISAR_JURIDICO END`, e `REVISADO_EM`/`REVISADO_POR` viram `NULL` na mesma condição. Essas três colunas vêm **antes** de `TITULO` e `URL` na lista do `SET` (06 §5: o MySQL já enxerga o valor novo da coluna que veio antes). `revisarJuridico = 0` nunca tira o selo: só `ccHistFonteRevisar` tira.
4. `auditar('Fontes', 'FONTE_LINK', id, null, campos alterados, m)`: criação = `(criação)`; edição = uma linha por campo da entrada que mudou (`BUSCA` é derivada e não gera linha); inativar = campo `ATIVO` de Sim para Não. Sem campo alterado, não grava nem audita.
5. Custo: 3 execuções.

### Material (`ccHistMaterialSalvar`) e arquivo

1. Como fontes (validação, repetido, auditoria na área `Material`, 3 execuções). `BUSCA` é calculada na JS. `vigenteDesde` vazia ou data válida.
2. `anexoId = 0` não mexe no arquivo. `anexoId > 0`: tem de ser `CC_ANEXO` com `ENTIDADE = 'MATERIAL'`, `ENTIDADE_ID = materialId` e não removido — conferido na JS (mensagem) e de novo no `WHERE` da `ccEscHistMaterialAtualizar` (`EXISTS`).
3. **Quem recusa tipo e tamanho é `ccBaseAnexoRegistrar` (001), não a 007** (01 §12). Ordem na tela ao anexar: (1) material já salvo (precisa do id); (2) `enviarArquivo(arquivo)` → endereço; (3) `ccBaseAnexoRegistrar({ entidade: 'MATERIAL', entidadeId: materialId, … })` → `anexoId`; (4) `ccHistMaterialSalvar({ materialId, anexoId, … })`; (5) havendo arquivo anterior, `ccBaseAnexoRemover(anexoAnterior)` (falha aqui é ignorada). Recusa em (2) ou (3) deixa o item como estava.
4. Custo do clique mais caro (trocar arquivo): 3 + 3 + 3 = 9 execuções (teto 20, DT-29).

### Regras (`ccHistRegrasVigentes`)

1. `carteira = ''` (o que a tela usa): chama `ccBaseParametroListar` por id três vezes — `''` (padrão = Privada), `ESTETICA`, `PUBLICA` — e junta por `CHAVE`. Com `carteira` informada, uma chamada. A leitura da 001 responde em chamada aninhada: não junta `EU` (parâmetro não é dado de cliente) e devolve `VIGENCIA_INICIO` do valor efetivo da carteira pedida (04 §1 `ccBaseParametroListar`).
2. Por chave devolve: definição (`grupo`, `ordem`, `rotulo`, `tipo`, `unidade`, `descricao`, `porCarteira`), `padrao: { valor, desde }` e, por carteira, `{ valor, proprio, desde, aplica }`. `proprio` = `VALOR_CARTEIRA` não nulo; `desde` só quando próprio. Vigência futura nunca chega: quem resolve a vigência é a 001 (RN-014).
3. `aplica = false` pelo mapa "carteira não usa o grupo" de 03 §18, constante `NAO_USA` em `lib/historico-apoio/regras.mjs` (definição do sistema, não política): `PUBLICA` ✗ `regua`, `limite`, `score`, `farol`, `flex`, `saude`, `crit` e chaves `cob.emailModo.*`; `PRIVADA` e `ESTETICA` ✗ `pub`, `pubMotor`.
4. `quadros[]` (04 §7 `ccHistRegrasVigentes`): `CC_FASE` + `KB_FASE` (`NOME`, `SLA_HORAS`) + `KB_BOARD` (nome), na ordem — uma consulta `ler()`.
5. `versao` = `com.politicaVersao`. Alçadas = o grupo `alcada.*` como os outros; a 007 não remonta a combinação das chaves.
6. Custo: 1 + 3 aninhadas = 4 execuções (teto de abrir tela: 6).

### Orçamento de execuções (01 §10)

| Operação | Execuções |
|---|---|
| Abrir o histórico de um cliente (`ccHistResumo` + `ccHistEventoListar`; o total da aba sai das contagens do resumo) | 2 |
| Trocar aba, categoria ou página | 1 |
| Abrir a prévia do documento | 2 |
| Abrir as regras em vigor | 4 |
| Trocar o arquivo de um material | 9 |

## Arquivos (costuras de 01 §14)

| Caminho | Conteúdo |
|---|---|
| `backend/schema/007-historico-apoio.mjs` | DDL de `CC_FONTE_LINK` e `CC_MATERIAL` |
| `backend/add-070-historico-apoio.mjs` | `definitions` das 14 públicas e 5 internas; no `isEntrypoint()`, a carga inicial (`INSERT IGNORE` pela chave `GRUPO` + `TITULO`), só em tabela vazia (`cargaInicial()`, B5 C-04: republicar não traz de volta a fonte ou o material que o gestor renomeou) |
| `backend/lib/historico-apoio/eventos.mjs` | `origem()`, `EVENTOS_SQL`, ordem, permissão de categoria, lista das subconsultas (para o `sim:check` rodar uma a uma) |
| `backend/lib/historico-apoio/resumo.mjs` | consultas do resumo (usadas por `ccHistResumo` e `ccHistExportar`) |
| `backend/lib/historico-apoio/regras.mjs` | `NAO_USA`, junção das três leituras |
| `backend/lib/historico-apoio/texto.mjs` | `normalizar()`, `linkValido()` |
| `backend/lib/historico-apoio/carga-inicial.mjs` | `FONTES` (41) e `MATERIAIS` (7): uma lista, lida pelo `add-070` e pelo seed do simulador |
| `backend/simulator/seed/007-historico-apoio.mjs` | Winthor de 7001–7003 + carga inicial |
| `backend/simulator/smoke/007-historico-apoio.mjs` | testes |
| `frontend/src/modules/007-historico-apoio/` | 5 telas, CSS de impressão e `index.ts` no formato de 01 §14 (`export const modulo: Modulo`, com `RotaModulo[]` e `ItemMenu[]` de `lib/base/menu.ts`): Histórico do cliente no grupo `OPERACAO`; Fontes e links, Material de apoio e Regras em vigor em `CADASTROS` (não há grupos "Histórico" e "Apoio") |
| `frontend/src/lib/historico-apoio/*.ts` | regra pura de tela |
| `frontend/tests/007-historico-apoio.test.mjs` | testes de tela |

Do integrador (a 007 só informa): bloco 7000–7999 de `frontend/src/lib/server-functions.ts` com os 14 nomes públicos; importação do `index.ts` no `App.tsx` (é o que torna o módulo entregue, 01 §14); inclusão do seed e do smoke nos orquestradores. Nenhum arquivo de outra spec é editado.

Carga inicial: fontes de `docs/estudo-artefato/A-regras-parametros-etapas.md` ("Fontes de consulta": 6 + 3 + 9 + 5 + 12 + 6 = 41; `REVISAR_JURIDICO` nos grupos "Legislação" e "Fluxo da NF e pagamento no setor público" = 21; `URL` nula onde o estudo não traz endereço); materiais de `B-winthor-planos-nf-publica.md` ("Material de apoio": política v5.2, fluxo geral em PDF e 5 fluxos em PNG = 7, todos sem arquivo).

## Superfície de interação

Opções escolhidas em `docs/opcoes-tela/escolhas.md`; mockups em `docs/opcoes-tela/007-historico-apoio/`. Vocabulário do design system (`design.md` §8): `PageHeader`, `Panel`, `Toolbar`, `SelectMenu`, `Status`, `Table`, `Pagination`, `GradeKpi`/`Kpi`, `EmptyState`, `Alert`, `Badge`, `Tabs`, `Dialog`/`DialogBody`, `Logo`. Nenhum componente da lib de quadros.

| Tela / rota | Opção escolhida | Monta com | Novo no módulo |
|---|---|---|---|
| Histórico do cliente · `/historico`, `/historico/:clienteId` | `historico-cliente` **C** — Por assunto, em abas (`telas-01-historico.html`) | `PageHeader` (cliente, busca "Trocar de cliente", botão Gerar PDF / Imprimir) · `GradeKpi` com 4 números (limite, vencido, a vencer, recuperado) · resumo completo recolhível (`<details>` em `Panel`) com os 12 campos · `Tabs`: Tudo, Crédito, Cobrança e acordos, Comunicação e notas fiscais, Jurídico e auditoria, cada aba com as pílulas das suas categorias e a contagem · registros agrupados por dia, grupo "Agendado" primeiro · `Pagination` · `EmptyState` | `LinhaDoTempo` (grupo de dia + item) |
| Prévia do PDF · `/historico/:clienteId/documento` | `historico-pdf` **A** — Relato corrido | `PageHeader` (Voltar, Imprimir ou salvar em PDF) · `Alert` "A emissão fica registrada" · folha A4: cabeçalho com `Logo`, resumo em 2 colunas, ficha de contatos, registros um abaixo do outro com o texto inteiro | `DocumentoHistorico` (a folha) |
| Fontes e links · `/apoio/fontes` | `fontes-links` **A** — Lista agrupada (`telas-02-fontes.html`) | `PageHeader` (41 fontes · 6 grupos · N a revisar; Nova fonte) · `Toolbar` (busca, grupo, revisão, mostrar inativas) · um bloco recolhível por grupo com `Table` (fonte com link em nova aba, responsável, uso, `Status` "A revisar pelo Jurídico" ou "Revisado por … em …", ações) · `Dialog` Nova fonte / Editar | — |
| Material de apoio · `/apoio/material` | `material-apoio` **A** — Lista por grupo (`telas-03-material.html`) | `PageHeader` (N documentos · N pendentes; Novo documento) · `Toolbar` (busca, grupo) · `Table` única com linha de grupo, marcadores, arquivo (tipo pela extensão ou `Status` "Arquivo pendente"), vigente desde, Baixar / Anexar / Editar · `Dialog` com área de soltar arquivo e `Alert` de recusa | — |
| Regras em vigor · `/apoio/regras` | `regras-vigor` **B** — Comparar segmentos (`telas-04-regras.html`) | `PageHeader` (N regras · N valores próprios; versão da política) · `Alert` "Somente leitura" · `Tabs`: uma aba por grupo de parâmetros + aba "Etapas e prazos" · `Table` matriz: regra, Privada (padrão), Estética, Pública; valor próprio em destaque com "desde", herdado esmaecido, "—" quando não se aplica | — |

Diferenças para o mockup, por causa do contrato: (1) abas e pílulas do histórico são as 8 categorias (RN-004), não as 14 do desenho; (2) a matriz de regras tem 3 colunas de carteira (o "Geral" do desenho é a Privada — D-05); (3) "Imprimir" e "Gerar PDF" do cabeçalho do histórico levam à mesma prévia, que tem um botão só; (4) fontes e material: as ações de cadastro aparecem para Gerente, Diretoria e Administrador (`podeAdministrar`, D-06); (5) nomes dos grupos de parâmetro vêm de `GRUPOS_PARAMETRO` da 001 (01 §9).

Regra pura em `frontend/src/lib/historico-apoio/`:

| Arquivo | Funções |
|---|---|
| `categorias.ts` | `CATEGORIAS` (8, com o token de cor `data-1`…`data-8`), `ABAS` (aba → categorias), `totalDaAba(contagens, aba)` |
| `texto.ts` | `normalizar()`, `termoDeBusca()`, `formatarTexto()` (marcadores `{R$:}`, `{D:}`), `partesDoTexto()` (corte no `{+}`) |
| `documento.ts` | `agruparPorDia()`, `nomeDoDocumento()`, `cssDaPagina()`, `avisoDeCorte()` |
| `regras.ts` | `celula(regra, carteira)` → própria / herdada / não se aplica, `prazoLegivel(horas)` |

### Como o PDF é gerado

Pela impressão do navegador, sem biblioteca. A spec pede A4, identidade Benenutri, cabeçalho, resumo, ficha, registros do filtro, rodapé com "Página i de n" e nome de arquivo sugerido — tudo isso a impressão entrega:

1. A prévia chama `ccHistExportar` uma vez e desenha `DocumentoHistorico` duas vezes: na tela (dentro do layout) e, por `createPortal`, direto em `document.body`, numa cópia que só existe na impressão.
2. CSS do módulo: `@media screen` esconde a cópia; `@media print` esconde `#root` (some menu, cabeçalho, botões) e mostra a cópia. Não depende do layout de nenhum outro módulo.
3. `cssDaPagina({ nome, documento })` gera, num `<style>` criado ao abrir a prévia, `@page { size: A4; margin: … ; @bottom-left { content: "<cliente> · <documento>" } @bottom-right { content: "Página " counter(page) " de " counter(pages) } }`. A função escapa aspas e barras do nome.
4. O botão troca `document.title` por `nomeDoDocumento(nome)` (é o nome que o navegador sugere em "Salvar como PDF"), chama `window.print()` e devolve o título no `afterprint`.
5. Papel timbrado: até a arte oficial chegar, o cabeçalho é o `Logo` do design system com a linha verde. Quando chegar, entra como `<img>` de posição fixa na cópia de impressão (elemento fixo repete em toda página), em `frontend/src/modules/007-historico-apoio/assets/`.
6. Não há mais limite de caracteres (era do `jspdf`): por isso C-008, RF-009 e RN-007 saíram da spec.

Teto conhecido: a caixa de margem do `@page` (rodapé com página) funciona no Chrome e no Edge a partir da versão 131; em navegador sem suporte o documento sai sem o rodapé. Se isso virar problema, aí sim entra biblioteca.

## Fluxo

1. **Histórico:** `/historico` → busca com espera de 400 ms → `ccHistClienteBuscar`; um resultado abre direto. Ao abrir, em `Promise.allSettled`: `ccHistResumo` e `ccHistEventoListar` (aba Tudo, página 0, 20 por página). Trocar aba, pílula ou página chama só `ccHistEventoListar`; o total vem das contagens do resumo. Resposta `ok: false` do resumo vira `Alert` "Cliente não encontrado" e a linha do tempo não é desenhada (nunca uma lista vazia).
2. **Documento:** botão do histórico → `/historico/:clienteId/documento?categoria=…` com o filtro ativo → `ccHistExportar` → prévia → imprimir ou salvar em PDF. Com `cortado`, o documento abre com `avisoDeCorte()`.
3. **Fontes:** `ccHistFonteListar` (limite 100) + `ccHistFonteTotal`; filtros recarregam; salvar e revisar recarregam a lista.
4. **Material:** `ccHistMaterialListar` + `…Total`; anexar segue a ordem de "Material e arquivo".
5. **Regras:** `ccHistRegrasVigentes('')` uma vez; abas e matriz são montadas na tela.
6. **Link direto (RF-012):** outras telas apontam para `/historico/:clienteId` pela rota; nenhum componente é importado entre módulos.

## Simulador

- **Seed (`seed/007-historico-apoio.mjs`)** — só Winthor da faixa 7001–7099 (ajudantes do integrador, em `winthor()`) e as tabelas da 007 (em `dominio()`, passo 10 de 06 §2.3; sem `INICIO` nem `passado()`):
  - 7001 ALFA DISTRIBUIDORA LTDA (`70.010.000/0001-70`, ramo 1, DF, limite 80.000): 12.500 vence `dia(-37)` · 20.000 vence `dia(15)` · 3.000 vence `dia(-22)`, pago em `dia(-12)` · 2.000 vence `dia(-20)`, pago em `dia(-25)`. Todos de Nutrição.
  - 7002 BETA SEM HISTORICO LTDA: 4.000 vence `dia(60)` (06 §2.5).
  - 7003 GAMA EM JUIZO LTDA: 9.000 vence `dia(-90)`.
  - `CC_FONTE_LINK` (41) e `CC_MATERIAL` (7) de `carga-inicial.mjs`.
- **História, montada no começo do smoke pelas SFs das donas** (06 §2.3, §2.5). Seeds declarados no topo: `001-base` e `005-setor-publico` (não o da 004: o cliente 4001 "CLINICA ALFA" mudaria a busca do C-003). O smoke exporta `RELOGIO = '2026-11-19T10:00:00'` (D, 06 §1); um passo por minuto, para a ordem ser determinística. O seed da 005 entra neste banco com as datas por `dia(n)` deste `RELOGIO` (e o `comRelogio(dia(n), …)` dele): os asserts de 5001 e 5002 (rating `P1`, passos `L1`/`L2`, marco de emissão) contam linhas e não dependem de data absoluta:
  1. Antes do smoke, o pipeline de 06 §2.3 já rodou a leitura (passo 6), o `atribuir()` do elenco (passo 7: 7001–7003 só com a agente Ana, sem analista — 06 §2.5, "Atribuição"), o processamento (passo 8) e a rodada final (passo 11): nascem cliente, posição, recebimentos e o caso de cobrança de 7001 e 7003. O smoke não atribui por conta própria: só confere que 7001–7003 estão com Ana e falha se o agente estiver vazio (PA-16).
  2. Ana: `ccBaseContatoSalvar` (Helena Prado, Financeiro, principal) → 3 × `ccCobContatoRegistrar` (o terceiro com `previsao = diaUtil(3)` e `valor = 12500`) → `ccCobProxAcaoDefinir` para `diaUtil(1)` → `ccEmailEnviar` (modelo `COB_ATIVA`, origem `001-manual`; se o modelo for de efeito legal, Júlia valida antes) → `ccCobAcordoPropor` (débito e valor 12.500, entrada 2.500 hoje, 2 parcelas, primeiro vencimento `dia(30)`, intervalo 30).
  3. Sérgio: `ccCobAcordoDecidir` (aprova). Ana: `ccCobAcordoParcelaPagar` (entrada, hoje).
  4. Sérgio (supervisor de Ana): `ccCredSolicitacaoCriar` (Privada, 100.000, `analistaId` = Rita; antes disso Rita não vê 7001, 01 §6). É ele, e não Ana, porque a guarda de `ccEscCredSolicitacaoInserir` (004) só aceita indicar outro analista na abertura com nível ≥ 2 (acabamento pós-v3, A-C1). Depois, Rita, já analista do cliente: `ccCredPedidoCriar` (771204, 60.000). Os testes que dependem disso (C-001 `SOLICITACAO` 1 e `PEDIDO` 1, C-006 etapa de crédito, RN-002 Rita abre 7001, RN-016 Rita sem a categoria) só contam eventos e visibilidade: nenhum afirma quem abriu a solicitação.
  5. Ana: `kbNotaRegistrar` no card da cobrança.
  6. Júlia: `ccJurProcessoCriar` para 7003 (04 §3; a coluna é "tem processo ativo") e 2 × `ccJurAndamentoRegistrar`.
  SF de módulo ausente (id 0) → os testes que dependem dela usam `pular('depende de 00N')`.
- **`CHECK_INPUT`:** `clienteId`, `categoria`, `de`, `ate`, `busca`, `limite`, `offset`, `grupo`, `revisar`, `ativo`, `fonteId`, `titulo`, `url`, `responsavel`, `uso`, `ordem`, `revisarJuridico`, `materialId`, `descricao`, `tags`, `anexoId`, `vigenteDesde`, `carteira`, `membroId`, `agora`.
- **Dialeto:** só o que 06 §5 já permite (`FIND_IN_SET`, `CONVERT_TZ`, `JSON_UNQUOTE(JSON_EXTRACT())`, `INSERT IGNORE`, `CONCAT` com `COALESCE` em cada parte). Nenhuma emulação nova. O `sim:check` roda cada subconsulta do histórico sozinha, além da união.

## Testes

Backend: `backend/simulator/smoke/007-historico-apoio.mjs` (S). Frontend: `frontend/tests/007-historico-apoio.test.mjs` (F). Título começa pelo id. Quem age: `como('<login>')`.

| Cenário / regra | Arq. | O que o `assert` verifica |
|---|---|---|
| C-001 | S | `ccHistEventoListar(7001, limite 100)` como ana: as 3 primeiras linhas têm `AGENDADO = 1` com `EM` crescente e `ORIGEM` `ACORDO_PARCELA`, `PROX_ACAO`, `ACORDO_PARCELA` (as duas primeiras no mesmo instante: a aprovação do acordo leva a próxima ação ao vencimento da parcela 1 e o desempate por `ORIGEM` põe a parcela antes; divergência aceita em B4-007); as demais com `EM` decrescente; contagem por `ORIGEM`: `CONTATO` 3, `PROMESSA` 1, `PROX_ACAO` 1, `ACORDO` 1, `ACORDO_DECISAO` 1, `ACORDO_PARCELA` 3, `RECEBIMENTO` 2, `EMAIL` 1, `SOLICITACAO` 1, `PEDIDO` 1; `MOV_COB` ≥ 1 e `NOTA` ≥ 1; nenhuma `AUDITORIA`; `ccHistEventoTotal` = Σ `contagens` do resumo = número de linhas; `execucoes()` de resumo + lista = 2 |
| C-001 | F | `formatarTexto('Promessa de {R$:12500.00} até {D:2026-11-24}')` = `'Promessa de R$ 12.500,00 até 24/11/2026'`; `{R$:12500}` dá o mesmo valor |
| C-002 | S | `categoria = 'Acordos e baixas'`: 5 linhas, `TOTAL = 5`, as 2 primeiras agendadas; `contagens['Acordos e baixas'] = 5`, `['Recebimentos'] = 2`, Cobrança, Crédito e Comunicação > 0; resumo (menos contagens) idêntico chamado antes e depois |
| C-003 | S | como sergio: `busca 'ALFA'` → 2 linhas (`CODCLI` 7001 e 1008), `…Total = 2`; `'70010000000170'` → 1 linha, 7001. Como ana: `'ALFA'` → só 7001 |
| C-003 | F | `termoDeBusca('alfa')` = `termoDeBusca('ÁLFA')` = `'ALFA'`; `termoDeBusca('70.010.000/0001-70')` = `'70010000000170'` |
| C-004 | S | matriz ana, sergio, carlos, silvia, gustavo × 7001, 1006: quem não vê recebe `ccHistResumo` e `ccHistExportar` com `ok: false` e `error = 'Cliente não encontrado.'`, `ccHistEventoListar` com 0 linha e `ccHistEventoTotal = 0`; quem vê recebe `ok: true`; `Buscar('DROGARIA')` como ana = 0 |
| C-005 | S | 7002 como ana: `TOTAL = 0`, lista vazia; resumo `ok` com `credito` nulo, `cobrancas` vazio, `risco` sem rating e `recuperado` nulo; `posicao.A_VENCER = 4000` |
| C-006 | S | resumo de 7001: `credito.etapa = '1 · Solicitação recebida'`; `cobrancas[0]` = Privada, `'Acordo em andamento'`; agente `'Ana Costa'`, supervisor `'Sérgio Nunes'`; `LIMITE 80000`, `UTILIZADO 32500`, `VENCIDO 12500`, `DIAS_ATRASO 37`, `A_VENCER 20000`; `recuperado = 3000`; `contatos = 3`; `promessasAbertas = 1`; `risco` igual à linha de `CC_RISCO_CLIENTE` do cliente |
| C-007 | S | `ccHistExportar(7001, 'Acordos e baixas')` como ana: `eventos.length = 5`, `contatos.length = 1` (Helena Prado), `emitidoPor = 'Ana Costa'`, `emitidoEm` = relógio; `CC_AUDITORIA` ganha 1 linha `AREA = 'Histórico'`, `CAMPO = '(emissão)'`, `CLIENTE_ID` de 7001, `DEPOIS` contendo `Acordos e baixas`; `execucoes() = 2` |
| C-007 | F | `nomeDoDocumento('ALFA DISTRIBUIDORA LTDA')` = `'Histórico - ALFA DISTRIBUIDORA LTDA'`; `cssDaPagina({ nome, documento: '70.010.000/0001-70' })` contém `size: A4`, o nome, o documento, `counter(page)` e `counter(pages)` |
| C-009 | S | `ccHistEventoListar(7001, 'Cobrança', limite 5)` → 5 linhas; `ccHistExportar(7001, 'Cobrança')` → `eventos.length` = `ccHistEventoTotal(7001, 'Cobrança')` (> 5), `cortado = false`; +1 linha de auditoria |
| C-010 | S | (primeiro teste do bloco de fontes e material: afirma a carga antes de qualquer gravação) `ccHistFonteListar(limite 100)` como ana: 41 linhas, 6 grupos na ordem da carga com 6, 3, 9, 5, 12, 6; `REVISAR_JURIDICO` em 21 (12 + 9); `ccHistFonteTotal`: `TOTAL 41`, `A_REVISAR 21`, `GRUPOS 6` |
| C-011 | S | gustavo (contagens lidas no início do teste: `T` = `TOTAL` de antes): salvar nova (https) → `ok`, total `T + 1`, auditoria `(criação)`; salvar com outro `uso` → 1 linha `CAMPO = 'USO'` com antes e depois; `ordem` menor que a das demais → é a primeira linha do grupo; `ativo = 0` → ana vê `T`, gustavo com `ativo = -1` vê `T + 1` e 1 inativa a mais; as quatro gravações (incluir, uso, ordem, inativar) somam 4 linhas na área `Fontes` para a fonte: `(criação)`, `USO`, `ORDEM`, `ATIVO` (RF-023); `'ftp://x'` e `'exemplo.gov.br'` → `ok: false` com "http"; título repetido no grupo → `ok: false`; `execucoes()` de um salvar = 3 |
| C-012 | S | ana, rita, sergio, julia: `ccHistFonteSalvar` e `ccHistMaterialSalvar` → `ok: false`; contagens de fontes e de materiais iguais às lidas no início do teste; gustavo e diana → `ok: true`; chamar `ccEscHistFonteInserir` direto como ana → 0 linha gravada |
| C-013 | S | julia `ccHistFonteRevisar` em "Lei 14.133/2021": `REVISAR_JURIDICO` falso, `REVISADO_POR` = id da Júlia, `A_REVISAR` = o de antes − 1, +1 linha de auditoria `Fontes` com `CAMPO = 'REVISAR_JURIDICO'`; revisar de novo → 0 linha, sem auditoria; `execucoes()` da revisão = 3; gustavo muda a `url` → volta a `TRUE` e `REVISADO_EM` nulo; ana revisa → `ok: false` |
| C-014 | S | `ccHistMaterialListar('POLITICA')` → 1 linha, "Política de Crédito e Cobrança v5.2"; `'FLUXO'` → 6; `'ZZZ'` → 0; `…Total` igual em cada filtro (os materiais criados pelos testes não têm "FLUXO" nem "POLITICA" no título, descrição ou marcadores); gustavo inativa um fluxo (auditoria `ATIVO`) → ana vê o `TOTAL` de antes − 1, gustavo com `ativo = -1` vê o de antes |
| C-015 | S | gustavo, num material criado pelo próprio teste: `ccBaseAnexoRegistrar` (`MATERIAL`, PNG, 2 MB) + `ccHistMaterialSalvar(anexoId)` → `ANEXO_URL` preenchida; registro de `.exe` → `ok: false`; de PDF com 25 MB → `ok: false`; `ANEXO_ID` do item não muda; `ccHistMaterialSalvar` com `anexoId` de anexo `CLIENTE` → `ok: false`; `execucoes()` do ciclo registrar + salvar + remover anterior ≤ 20 (DT-29) |
| C-016 | S | carga inicial: as 7 linhas de `MATERIAIS` (por título), todas sem anexo; material novo sem `anexoId`: `ANEXO_URL` nula e `PENDENTES` = o de antes + 1 |
| C-017 | S | depois de `ccBaseParametroSalvar` (`enc.correcao`: `ESTETICA` 0,3 vigência hoje; `ESTETICA` 0,9 vigência 2099-01-01): `ccHistRegrasVigentes('')` → `enc.correcao`: padrão 0,4, Estética `{ valor 0,3, proprio, desde hoje }`, Pública `{ 0,4, herdado }`; `enc.multa`: padrão 2, Estética herdada, Pública `{ 0, proprio }`; nenhum valor 0,9; `regua.notif` com `aplica = false` na Pública; `execucoes() ≤ 6` |
| C-017 | F | `celula()` devolve `propria` com "desde", `herdada` e `nao_se_aplica` ("—") para os três casos |
| C-018 | S | nenhuma definition do `add-070` escreve `CC_PARAMETRO` nem chama `ccBaseParametroSalvar` (varredura do texto das SFs); todo valor próprio de carteira tem `desde` |
| C-019 | S | `categoria = 'Acordos e baixas,Recebimentos'`, limite 3, offsets 0, 3, 6 → 3, 3, 1 linhas; 7 pares `ORIGEM:ORIGEM_ID` distintos; `TOTAL = 7` |
| C-020 | S | `quadros` traz `cobranca-privada` com a fase `negociacao` ("Em negociação", 240) e `concessao-privada` com `entrada` ("1 · Solicitação recebida", 24), na ordem de `CC_FASE.ORDEM`; depois de `kbFaseSalvar` renomeando `negociacao`, a consulta devolve o nome novo |
| C-020 | F | `prazoLegivel(240)` = `'10 dias'`; `(24)` = `'1 dia'`; `(4)` = `'4 horas'`; `(0)` = `'sem prazo'` |
| C-021 | S | como julia: `Buscar('GAMA')` → 7003; `Buscar('ALFA')` → 0; resumo de 7001 → `'Cliente não encontrado.'`; lista de 7003, categoria `Jurídico`: `PROCESSO` 1 e `ANDAMENTO` 2; `contagens` sem `Alteração auditada` |
| C-022 | S | 7001: sergio tem `contagens['Alteração auditada'] > 0` e uma linha `AUDITORIA` da área `Contatos` com autor Ana Costa; ana não tem a chave; `total` ana = `total` sergio − a contagem; `ccHistEventoListar(categoria = 'Alteração auditada')` como ana → 0 |
| RN-001 | S | a linha `CONTATO` do contato com promessa vem antes da `PROMESSA` (mesmo `EM`), e as linhas desse `EM` seguem `ORIGEM` crescente (a `NOTA` que `ccCobContatoRegistrar` grava no card no mesmo instante fica entre as duas: `CONTATO` < `NOTA` < `PROMESSA`); duas leituras seguidas dão a mesma sequência de `ORIGEM:ORIGEM_ID` |
| RN-001 | F | `agruparPorDia()`: primeiro grupo "Agendado" com as linhas `AGENDADO = 1`; depois um grupo por dia, do mais recente ao mais antigo |
| RN-002 | S | matriz do C-004 + diana e nara abrem 7001 e 1006; rita abre 7001 e não 1006; `visitante`: `ok: false` nas JS (`ccHistResumo`, `ccHistExportar`) e zero linha nas SQL-L (`ccHistClienteBuscar`, `ccHistEventoListar`, totais 0), como no C-004 |
| RN-003 | S | nomes `ccHist…` de histórico = `ClienteBuscar`, `ClienteBuscarTotal`, `Resumo`, `EventoListar`, `EventoTotal`, `Exportar`; nenhuma `ccEscHist…` de histórico; a contagem de linhas de `CC_CONTATO_COBRANCA`, `CC_ACORDO`, `CC_SOLICITACAO`, `CC_PROCESSO` e `KB_LOG` é a mesma antes e depois de chamar as seis leituras; só `CC_AUDITORIA` cresce, com a linha da emissão |
| RN-004 | F | `CATEGORIAS` tem 8 nomes iguais aos da RN-004 e 8 tokens distintos; a união das categorias de `ABAS` (menos "Tudo") é as 8, sem repetir |
| RN-004 | S | toda linha de 7001, 7003 e 5002 tem `CATEGORIA` entre as 8 |
| RN-005 | S | resumo de 7002 (campos do C-005 nulos, 12 campos presentes); 5001 como carlos: `ratingPub = 'P1'` (pula sem a 005) |
| RN-006 | F | `nomeDoDocumento('Alfa / Norte: "A"?')` = `'Histórico - Alfa Norte A'`; `cssDaPagina` com `"` e `\` no nome gera `content` com os dois escapados |
| RN-008 | S | 2 emissões de 7001 como ana (sem filtro; `Cobrança`) → 2 linhas novas `AREA = 'Histórico'`, `POR` = Ana, `DEPOIS` com as categorias; as duas aparecem para sergio como `AUDITORIA` |
| RN-009 | S | ana com `ativo = -1` e `0` continua vendo só ativas (fontes e material); gustavo vê inativas; julia `ccHistFonteSalvar` → `ok: false`; nara (marca `ADMIN`) `ccHistFonteSalvar` → `ok: true` (`PODE_ADMINISTRAR`, D-06) |
| RN-010 | S | fonte revisada: gustavo muda `titulo` → `REVISAR_JURIDICO` verdadeiro e `REVISADO_EM` nulo; em outra revisada, muda só `uso` → continua revisada |
| RN-011 | S | `https://a.gov.br/x` e `http://a.gov.br` → `ok`; `a.gov.br` e `javascript:alert(1)` → `ok: false`; `url = ''` em "Legislação" → `ok`, `URL` nula |
| RN-012 | S | segundo anexo ligado ao mesmo material (o do C-015) → `ANEXO_ID` novo e `ANEXO_NOME` novo na listagem |
| RN-013 | F | `normalizar('  ÁÇÃO Ltda ')` = `normalizar('acao ltda')`; `termoDeBusca('70.010.000/0001-70')` = `'70010000000170'` |
| RN-013 | S | `ccHistFonteListar(busca 'LICITACOES')` acha "TCU: Licitações e Contratos"; `BUSCA` gravada por `ccHistFonteSalvar` = `normalizar()` do backend para o mesmo texto do teste F |
| RN-014 | S | massa do C-017 + `ccBaseParametroSalvar` (`enc.correcao`, padrão, 0,5, vigência hoje) → padrão 0,5, Pública 0,5 herdada, Estética 0,3 própria |
| RN-015 | S | linha `EMAIL` de 7001: `TITULO` = assunto enviado; `TEXTO` começa por `Para ` + destinatário + ` · Enviado`, tem `{+}` e depois o corpo |
| RN-015 | F | `partesDoTexto('Para a@b · Enviado{+}Prezados…')` = `{ principal: 'Para a@b · Enviado', expandir: 'Prezados…' }`; texto sem `{+}` → `expandir` vazio |
| RN-016 | S | massa do C-022 + rita sem a categoria; nara com a categoria; `ccHistExportar` como ana sem linha `AUDITORIA` |
| RN-017 | S | massa do C-021; depois de `ccJurProcessoEncerrar` de 7003 (julia), `Buscar('GAMA')` como julia → 0 |
| RN-018 | S | com `CC_HIST_TETO = 3`: `ccHistExportar(7001)` → 3 eventos (os primeiros da ordem), `total` real, `cortado = true` |
| RN-018 | F | `avisoDeCorte({ eventos: 3, total: 40, cortado: true })` = `'Mostrando os 3 registros mais recentes de 40.'`; sem corte, vazio |
| RN-019 | S | (último teste) desfaz no Winthor simulado o pagamento de 3.000 de 7001 e roda a leitura: `RECEBIMENTO` cai de 2 para 1 e `recuperado` = `null` |
| Órgão público | S | 5002 como carlos, categoria `Setor público`: `NF_ACAO` = 2 e `NF_EMISSAO` ≥ 1; depois marca no Winthor simulado a NF de 5002 como cancelada e roda `ccBaseSincronizacaoPedir` como gustavo + `rodarCron('ccRotina')` até leitura e processamento terminarem (a 005 marca `CANCELADA = TRUE`): nenhuma linha `NF_*` nem `NF_ACAO` dessa NF, e `contagens['Setor público']` sem ela (pula sem a 005) |

- **Backend:** banco novo por smoke (06 §3): DDL de todos + `000-elenco` + seeds `001`, `005` e `007`. Ordem: história → leituras → fontes e material (C-010 primeiro; os demais afirmam diferença sobre o que leem no início) → regras → emissões → RN-017 → Órgão público (cancela a NF de 5002, que nenhum teste seguinte usa) → RN-019. Os testes de escrita rodam com `SIM_SESSAO_ANINHADA` 0 e 1 só onde há chamada aninhada com sessão relevante (`ccHistRegrasVigentes`, `auditar`); a 007 não mexe em card.
- **Frontend:** `node --test` sobre `frontend/src/lib/historico-apoio/`. Tela e impressão: verificação manual da spec.
- **Seed extra para o smoke:** a história acima (não é seed: são chamadas no início do smoke).
- **Quem grava nos testes de regras:** `ccBaseParametroSalvar` como gustavo (`ADM` = `PODE_ADMINISTRAR`; nara também passa, D-06); `kbFaseSalvar` como nara (administradora do quadro).

## Depende do sandbox (01 §15)

| # | Onde a 007 usa | Plano B (já escrito no contrato) |
|---|---|---|
| S-02 | `sessao()` e `ler()` com `:VAR_USER` em `ccHistResumo` e `ccHistExportar` | 01 §4 plano C: leitura com visibilidade vira SF SQL com o fragmento `EU`. Para a 007: o resumo vira leituras SQL chamadas pela tela, e a emissão pagina `ccHistEventoListar` de 100 em 100 (aí entra pedido de nomes novos) |
| S-01, S-03, S-04 | guarda `ATOR` das 5 `ccEscHist…`; contagem de linhas afetadas | 01 §5 plano B; sem `rowsAffected`, a JS relê a linha |
| S-06 | `JSON_UNQUOTE(JSON_EXTRACT())` e `CONVERT_TZ` no fragmento; `INSERT IGNORE` na carga | a SQL devolve `DETALHE` cru e `formatarTexto()` extrai o texto da nota; hora da lib convertida por soma fixa de −3 h em texto; carga por `INSERT … WHERE NOT EXISTS` |
| S-10 | envio do arquivo de material por usuário business | 01 §12 plano B: o material aponta um link colado pela pessoa (`ccBaseAnexoRegistrar` já aceita) |
| S-16 | `LIMIT {{limite}} OFFSET {{offset}}` das 5 listagens (o resto dos números já vai por `CAST`, borda 4b) | se o texto passar cru, a JS da tela já manda inteiro; o plano B é o da S-16 para todas as specs |

Conferir no sandbox (B4-007, sem MySQL local): a primeira chamada de `ccHistEventoListar` e `ccHistExportar` para um cliente com nota de card, e-mail e auditoria (a união das 39 partes e o `JSON_UNQUOTE` com collation); `HEX(TITULO) <> HEX('…')` em `ccEscHistFonteAtualizar` com a conexão em `utf8mb4` (se não for, o selo volta a mais, nunca a menos).

Publicação da 007 sozinha (prompt do sandbox, DT-39, 01 §14): `add-070-historico-apoio.mjs`, depois republicar o `add-010-base.mjs` (nenhuma outra spec publicada chama SF da 007), o `add-001-kanban.mjs` (roda de novo depois do `add-010`, 01 §14) e por último o `add-090-perfil-acesso.mjs`. Nada é executado daqui.

Chamada aninhada sem sessão (S-01/S-14): só `ccHistRegrasVigentes` → `ccBaseParametroListar` (PA-10) e as escritas → `ccEscHist…`/auditoria, que levam `membroId` (01 §4).

## Decisões

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-001 | Documento pela impressão do navegador (prévia + `window.print()`), sem biblioteca | `jspdf` no navegador (plano anterior); PDF no servidor | A impressão entrega tudo o que a spec pede; tira uma dependência, o limite de Latin-1 e ~300 linhas de desenho de PDF. Teto: rodapé com página só em Chrome/Edge ≥ 131 |
| D-002 | Histórico derivado numa consulta (`UNION ALL` por `CLIENTE_ID`), sem tabela e sem registro próprio | tabela `CC_HISTORICO`; leitura origem a origem em JS (plano anterior, ~60 execuções por abertura) | Fato corrigido na origem aparece corrigido (RN-003); 1 execução por página; erro numa origem derruba a consulta à vista de todos, em vez de sumir com a categoria (achados C-4 e C-5 do validador) |
| D-003 | Texto com marcadores (`{R$:}`, `{D:}`, `{+}`) formatados na tela | `FORMAT()`/`DATE_FORMAT()` em cada subconsulta | Um formato só, testável na tela; nenhuma função nova no simulador |
| D-004 | Total da aba pelas contagens do resumo | chamar `…Total` a cada troca | Metade das execuções; a contagem e a lista saem do mesmo fragmento |
| D-005 | Carga inicial numa lista (`carga-inicial.mjs`) usada pela publicação e pelo simulador | duas listas | 41 + 7 linhas fixas, uma fonte só |
| D-006 | Grupo é texto nas duas tabelas; ordem do grupo pela primeira linha criada | tabela de grupos | Não há regra de grupo além de agrupar |
| D-007 | Um botão na prévia (imprimir ou salvar em PDF) | dois caminhos de geração | É a mesma janela do navegador; uma emissão, uma linha de auditoria |
| D-008 | Regras em vigor = leitura da 001 + fases dos quadros, sem texto de regra guardado | página estática; reimplementar a vigência | constitution II; a regra de vigência fica num lugar (001) |
| D-009 | Alçadas mostradas como o grupo `alcada.*` | remontar as tabelas de 03 §7 | A combinação das chaves é código da 002 e da 004; copiar aqui diverge na primeira mudança |
| D-010 | "Carteira não usa o grupo" como constante `NAO_USA` | coluna nova no catálogo | É definição do sistema (exceções E-1 a E-4 do D-05), 2 linhas |
| D-011 | Auditoria sem as linhas `(criação)` do que já é origem | mostrar tudo | Evita o mesmo fato duas vezes para o supervisor |
| D-012 | Jurídico sem regra própria: nível 0 já o tira de `Alteração auditada`; `clienteVisivel()` já o limita a cliente com processo | lista de categorias do Jurídico | P-27; menos um ramo |
| D-013 | Teto de 2.000 registros na emissão, com aviso no documento | sem teto | 04 §7; 60 s da plataforma e tamanho da resposta |
| D-014 | História de teste montada pelas SFs das donas | seed gravando tabela de outra spec | 06 §2.3 c; prova o schema real (achado C-7) |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Uma coluna errada em qualquer das 39 subconsultas derruba a linha do tempo inteira | histórico fora do ar | `sim:check` roda cada subconsulta sozinha sobre o DDL real; o smoke cobre as 8 categorias; a 007 é construída por último (B4), com as tabelas já publicadas no simulador |
| Mesmo fato em mais de uma categoria (nota automática do card + fato do domínio) | linha do tempo com ruído | D-011 tira o eco da auditoria; a nota fica (mapa do contrato). Se incomodar: as donas marcam a nota automática e a 007 filtra — pedido futuro |
| Rodapé "Página i de n" só em Chrome/Edge ≥ 131 | documento sem numeração em outro navegador | verificação manual nos dois; registrar o navegador suportado; biblioteca só se o gestor exigir outro navegador |
| Cliente antigo com milhares de recebimentos | consulta lenta, documento cortado | índice por `CLIENTE_ID` em todas as origens; página de 20; teto de 2.000 com aviso; medir RNF-001 com 500 |
| Smoke depende de SFs de cinco módulos | teste frágil a mudança alheia | cada passo da história usa só entradas do contrato (04); módulo ausente → `pular`; contagem "≥ 1" para o que a rotina lança sozinha |
| Arquivo de material em endereço público (01 §12) | quem tem o link abre | material não é sensível; nome com uuid; o endereço só sai para membro ativo |
| removido (PA-01 a PA-19 respondidos em 16/11/2026: 18 aceitos, PA-16 aceito com alteração, já aplicado) | — | — |
| Normas das fontes ficam velhas | orientação errada | selo "A revisar pelo Jurídico", filtro de revisão, revisão com autor e data (RN-010) |

## Complexity Tracking

Limites de 01 §5 que a 007 herda (registro obrigatório):

| Princípio tocado | Por que é necessário | Por que a alternativa simples não serve |
|---|---|---|
| III — `ccEscHist…` chamada direto pula a validação de formato e a auditoria da JS (link sem `http`, `BUSCA` fora de forma) | o perfil business libera as internas (é como a JS as chama por id) | a guarda de permissão e a volta do selo estão na própria SQL; autor e data vão na mesma instrução; some se o sandbox confirmar S-03 |
| III — sem sessão, a `ccEsc…` confia no `membroId` | chamada aninhada não leva `:VAR_USER` (S-01) | premissa de 01 §4: só cron e chamada aninhada chegam sem sessão |
| V — anexar arquivo são duas escritas sem transação (registro do anexo na 001, ligação na 007) | uma instrução por SF | se parar no meio fica um anexo sem dono, inofensivo; repetir o clique conclui |
