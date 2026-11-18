# Plan: Jurídico (dossiê, processos, custos, acordos judiciais e carga inicial)

**Spec:** `../003-juridico/spec.md` · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c)

> O COMO. Nenhum requisito novo nasce aqui — se faltou algo, volta pra spec.
>
> Nomes, colunas, parâmetros e assinaturas estão no contrato; aqui só a seção
> (`02 §003`, `04 §3`…) e o que o contrato não diz: algoritmo, ordem das escritas,
> casos de borda e como testar. Os pedidos PJ-01 a PJ-13 estão decididos em
> `docs/contrato/pedidos/00-respostas.md` (16/11/2026) e aplicados aqui.

## Checagem de princípios

| Princípio | Toca? | Como atende |
|---|---|---|
| Spec antes de código | sim | spec corrigida nesta rodada; as 8 dúvidas viraram pendências com padrão (P-02, P-06/11, P-07, P-08, P-25, P-38 a P-44); nenhuma bloqueia |
| Backend escrito local, executado no sandbox | sim | um arquivo, `backend/add-030-juridico.mjs` (SFs + semeadura do quadro `juridico`); nada do `mitra-sdk` roda daqui |
| Migrations append-only | sim | DDL em `backend/schema/003-juridico.mjs`, importado pelo `setup-backend.mjs`; `backend/migrations/` intocado |
| Leitura e escrita por Server Function | sim | 42 SFs públicas + 19 internas (04 §3); nenhuma tela usa CRUD REST |
| Simulador cobre a feature | sim | `simulator/seed/003-juridico.mjs` e `simulator/smoke/003-juridico.mjs`; mesmas `definitions` e mesmo DDL |
| Testes automatizados obrigatórios | sim | 59 linhas da seção Testes da spec → 56 `teste()` no smoke (64 com os de chamada direta e `nasDuasSessoes` da validação B3) e 4 `test()` de tela (RN-027 tem um de cada lado), mais um teste de orçamento e um do espelho do gancho; `npm test` nos dois lados |
| Design tokens, sem cor literal | sim | telas com o vocabulário do `design.md` e os componentes da lib de quadros; papel do PDF com tokens e folha de impressão |
| Simplicidade | sim | alertas e indicadores em uma passada em memória, sem tabela; pendências da carga em colunas do processo; PDF pela impressão do navegador; uma dependência nova (`xlsx`), justificada em D-06 |

Constitution: II — os 31 números do módulo são as chaves `jur.*` (03 §14), mais `regua.jur`, `enc.*` e `com.*` lidos de outras donas. III — permissão, alçada, segregação e a política do acordo judicial ficam na `GUARDA` das `ccEsc…` (01 §5), não só na JS (bloqueio B-4 da v1 e B-1 da v2). V — toda `JS-E` chama `auditar()` com `CLIENTE_ID`. VI — seção Testes. VII — sem migration à mão. IX — nenhuma credencial neste módulo.

## Contexto técnico

- **Frontend:** React 19 · Vite 7 · Tailwind 4 · react-router 7 · `mitra-interactions-sdk` · `@benenutri/mitra-kanban` 1.14.0 (quadro e card aberto).
- **Backend:** tabelas e SFs na plataforma Mitra, provisionadas por `backend/add-030-juridico.mjs`.
- **Reuso (001, só importar):** preâmbulo `lib/escritas.mjs` (`quem`, `ler`, `escrever`, `auditar`, `parametros`, `visivel`, `agora`, `hoje`), `guarda.mjs` (`ATOR`, `NUMEROS_20`), `visibilidade.mjs`, `parametros.mjs` (`PARAM_NUM`), `tempo.mjs` (`HOJE_SQL`, `somarMeses`), `dias-uteis.mjs` (`somarDiasUteis`), `quadros.mjs` (`semearQuadro`, `chamarKb`, `FASE_DO_CARD`), `ccEmailEnviar`, `ccBaseModeloPrever`, `ccBaseTitulosAbertos`, `ccBaseClienteListar`; no front `lib/base/arquivos.ts` (`enviarArquivo`) e `lib/base/extensoes.ts`.
- **Reuso (002, por SF):** `ccCobEncargosCalcular`, `ccCobEnviarJuridico` (id 0 = módulo ausente). Da 005 nenhuma SF: `ccJurDossieSugestao` lê `CC_NF_PUBLICA`, `CC_NF_ACAO`, `CC_ANALISE_ORGAO` e `CC_CERTIDAO` direto (tabela ausente = sugestão vazia; DT-34 regra 2).
- **Chamada aninhada (DT-34):** toda JS da 003 chama as JS de outra dona com `membroId` = o membro de `quem()`: `ccCobEncargosCalcular`, `ccBaseTitulosAbertos`, `ccBaseModeloPrever`, `ccEmailEnviar`, `ccCobEnviarJuridico`. Nenhuma SQL com `EU` é chamada aninhada: `ccCobSituacao` e `ccBaseClienteListar` só pela tela (aba "Cobrança de origem", "Novo processo") e nos testes; a ficha e os alertas leem `CC_COBRANCA` e a posição por `ler()`.
- **Dependência nova:** `xlsx` (SheetJS CE 0.20.3, tarball de cdn.sheetjs.com), carregada por `import()` só na tela da carga (D-06). PDF não pede dependência (D-07).

## Modelo de dados

As 8 tabelas e todas as colunas estão em `02 §003-juridico`. O que o contrato não diz:

| Entidade (spec) | Tabela | Observação |
|---|---|---|
| Processo | `CC_PROCESSO` | Ativo = `ENCERRADO_EM IS NULL` (igual a "card não concluído" por construção: só `ccJurProcessoEncerrar` leva o card a `encerrado`). Grupo da lista = `AUTOS <> ''` (derivado, sem coluna). `VALOR`, `SETOR`, `CARTEIRA`, `BU_ID` e `FILIAL` são gravados na criação e `VALOR`/`VALOR_ATUALIZADO` regravados no envio; depois só o Jurídico altera. `STATUS` é a "situação atual" da spec |
| Dossiê | `CC_DOSSIE_ITEM` | Uma linha por item aplicável à carteira, criada em lote na abertura. Obrigatório, texto e carteira do item vêm do catálogo (`lib/juridico/catalogos.mjs`, cópia de 05 §8); progresso = itens obrigatórios com `OK` ou `NA` com `OBS` ÷ obrigatórios |
| Andamento | `CC_PROCESSO_ANDAMENTO` | `TIPO`: `MANUAL` (pessoa), `SISTEMA` (só o envio do dossiê), `CARGA`. `CC_PROCESSO.ULTIMO_ANDAMENTO_EM` é mantido na mesma operação |
| Custo | `CC_PROCESSO_CUSTO` | 12 códigos de `TIPO` (até 16 caracteres) e o grupo de cada um em `catalogos.mjs`: `CUSTAS_INICIAIS`, `CUSTAS_CITACAO`, `EDITAL`, `RECURSOS` (Custas processuais) · `HON_CONTRATUAIS`, `HON_EXITO` (Honorários) · `DILIGENCIA`, `LOCOMOCAO`, `PESQUISAS` (Diligências e pesquisas) · `PERICIA`, `CARTORIO`, `OUTROS` (Outros). O grupo entra no SQL por `CASE` gerado do catálogo |
| Acordo e parcela | `CC_ACORDO_JUDICIAL`, `…_PARCELA` | IX (`PROCESSO_ID`), sem UQ: no máximo um `AGUARDANDO` ou `ANDAMENTO` por processo (`NOT EXISTS` na guarda de `ccEscJurAcordoInserir`); o `RECUSADO` fica como histórico. "O acordo do processo" = o mais recente não `RECUSADO`. "Vencida" é derivada (`ABERTA` com `VENCIMENTO < HOJE_SQL`). Situações: acordo `AGUARDANDO`/`ANDAMENTO`/`QUITADO`/`RECUSADO`; parcela `ABERTA`/`PAGA` (`A_CONFIRMAR` só na carga) |
| Notificação | `CC_NOTIFICACAO_EXTRAJUDICIAL` | Valores sempre os de `ccCobEncargosCalcular` na data da emissão |
| Filial credora | `CC_FILIAL_CREDORA` | `CODIGO` = `CODFILIAL` do Winthor (leitura de 06 §2.2). Sem seed de produção: quem administra cadastra (P-41) |
| Carga inicial | colunas `CHAVE_CARGA`, `ALERTA_CARGA`, `SUGESTAO_CLIENTES`, `CARGA_CONFERIDA_*` de `CC_PROCESSO`; estado `CC_ESTADO['jur.cargaConcluida']` | Pendência "sem cliente" = `CLIENTE_ID IS NULL`; "parcela a confirmar" = parcela `A_CONFIRMAR`; as outras duas, colunas |
| Alerta e indicador | — | Calculados na leitura (D-03) |

Escrita em tabela de outra dona: `CC_CLIENTE.NO_JURIDICO` por `ccEscBaseClienteJuridico` (verdadeiro quando o cliente tem processo ativo fora da fase `dossie`; recalculado ao criar, vincular, enviar e encerrar) e `CC_ESTADO` por `ccEscBaseEstado`. `CC_COBRANCA` só pela `ccCobEnviarJuridico` da 002, chamada apenas de dentro de `ccJurDossieEnviar`; processo que nasce fora do dossiê (`ccJurProcessoCriar` com `clienteId > 0`, `ccJurProcessoVincularCliente`, `ccJurCargaAplicar` com cliente casado) só marca `NO_JURIDICO` por `ccEscBaseClienteJuridico`, e a cobrança vai a `juridico` na rodada seguinte da `ccCobRotina` (05 §3.6 linha 14).

**Parâmetros:** as 31 chaves `jur.*` de `03 §14`, declaradas em `backend/lib/parametros/003-juridico.mjs` como estão lá. `validarConjunto`: `prazoVermelhoDias < prazoAmareloDias`; `paradoAtencaoDias < paradoCriticoDias`; `custoBomPct < custoMetaPct`; `faixasValor` crescente; em cada par `ind…Bom`/`ind…Ruim`, o sentido da tabela de 03. Lidas de outras donas: `regua.jur` (desvio "pronto para o Jurídico"), `enc.*` (rótulos do demonstrativo), `com.email` e `com.telefone` (notificação).

**Modelo de mensagem:** `JUR_NOTIF_EXTRAJUDICIAL` em `backend/lib/modelos/003-juridico.mjs`, com efeito legal (nasce não validado) e os 5 campos extras de 01 §13. O corpo guarda as 5 cláusulas do artefato (E §3.1); `[TOTAL]` e `[PRAZO_DIAS]` chegam já formatados ("R$ 31.087,25, assim composto: principal de…", "15 (quinze)").

**Quadro:** `juridico` em `backend/lib/quadros/003-juridico.mjs` — fases, SLA, cores, título, responsável e automação de `05 §6` e `§7`; descrição de cada fase = "o que acontece" + "saída" do estudo (E §5), que é o que RF-008 pede no cabeçalho da coluna. Capa (campos fixos e por fase) como em 05 §6. Etiquetas semeadas: só `Custo a pagar`, `Carga a conferir` e `Substabelecer`, gravadas por evento; `Prazo vencendo` e `Sem andamento` **não** são semeadas (o prazo relativo e o filtro "Atrasados" são da lib; os dias sem andamento ficam no cartão e na aba Alertas). Nenhum campo obrigatório, nenhuma condição de entrada (05 §1, regras 4 e 5).

## Contratos de backend

Assinaturas em `04 §3`. A tabela diz o cenário que cada SF pública atende, o teste de smoke que a cobre e o que o contrato deixa em aberto. Gêmeas `…Total` são cobertas pelo mesmo teste da listagem.

### Leituras

| SF | Atende | Smoke | O que o contrato não diz |
|---|---|---|---|
| `ccJurProcessoListar` / `Total` | RF-012, RF-013, RF-019, RN-008, RN-030 | C-010, C-022, RN-008, RN-032 | Visibilidade: `EU.VE_TUDO = 1 OR EU.CARGO = 'JURIDICO' OR (P.CLIENTE_ID IS NOT NULL AND clienteVisivel('C'))`; processo sem cliente só para quem vê tudo. Ordem: `PRAZO IS NULL, PRAZO, VALOR DESC`. `busca` em nome, documento, autos (só dígitos também), tribunal, situação e nome do responsável, sobre texto normalizado pela tela. Filtros `buId`, `linha`, `grupo` e as colunas a mais como em 04 §3 |
| `ccJurProcessoFicha` | RF-015, RNF-006 | C-001, C-012, RNF-006 | Uma execução por card aberto. `acordo` = o mais recente não `RECUSADO`. Sem acesso = `'Processo não encontrado.'`, sem dado nenhum. `pode` = espelho das guardas (mover, editar, lançar, enviar, aprovar acordo, emitir notificação, marcar item). Endereço de anexo só sai daqui |
| `ccJurDossieSugestao` | RF-002, RN-003 | C-001, C-007, RN-003 | Só leitura, chamada pelo botão "Ver sugestões do sistema" do dossiê (não na abertura: orçamento, C-5 v2): total do demonstrativo (`ccCobEncargosCalcular` com `membroId`), lista de títulos, e na `PUBLICA` NF, empenho, protocolo e atesto (`CC_NF_PUBLICA` sem canceladas, `CC_NF_ACAO`), contrato (`CC_ANALISE_ORGAO` mais recente do cliente) e certidões (`CC_CERTIDAO`), lidos com `runQueryMitra` depois de conferir o processo pelo membro de `quem()`. Tabela da 005 ausente = item sem sugestão. Nunca grava (os itens automáticos e as orientações de RN-003 nascem na abertura) |
| `ccJurAndamentoListar` / `Total` | RF-018 | C-011, RN-010 | `ORDER BY EM DESC, ID DESC` |
| `ccJurCustoListar` / `Total`, `ccJurCustoResumo` | RF-020, RF-021, RF-022 | C-012, RN-013, RN-014 | "A pagar antigo" = `PAGO = FALSE` e `DATA` há mais de `jur.custoAPagarAntigoDias`; `Total` soma valor, pago e a pagar |
| `ccJurAcordoListar` / `Total`, `ccJurAcordoParcelaListar` | RF-027 | C-013, C-015, RN-020 | `PROXIMA_PARCELA` = menor vencimento em aberto; a contagem de vencidas é derivada na leitura; o `RECUSADO` sai junto, como histórico, sem contar em a receber nem em vencidas; o `AGUARDANDO` aparece com a sua linha e só soma no total `AGUARDANDO`/`VALOR_AGUARDANDO` da `…Total`, nunca em `VALOR_A_RECEBER` (D-08) |
| `ccJurAlertas` | RF-028, RF-029 | C-016, C-024, RN-022, RN-031 | Ver "Alertas e indicadores" abaixo. Os contadores das abas (RF-029) saem da contagem por `tipo` desta resposta. **Divergência (B2, aceita em B3):** entrada `tipo ('')` opcional filtra as linhas por tipo (acréscimo; sem filtro a resposta é a mesma) |
| `ccJurIndicadores` | RF-014, RF-021, RF-030, RF-031 | C-017, RN-016, RN-023 | Idem. 07 e 08 contam só acordo `ANDAMENTO`; `acordosAguardando { quantidade, valor }` à parte, fora dos 24 (D-08; mostrado ao lado do número de acordos do RF-014). `de`/`ate` recortam só o que é de período (custo no mês, evolução de 12 meses); vazios = hoje. Cortes, 10 maiores, resumo e bloco de custos na mesma resposta (04 §3) |
| `ccJurResumo` | pedido 006-10, DT-33 | C-017, C-013 | SQL única, chamada pela tela (nunca aninhada); "prazos vencendo" = ativo com prazo até hoje + `jur.prazoAmareloDias`; "sem andamento" = regra do desvio (fora de `dossie` e `suspenso`, acima de `jur.paradoAtencaoDias`). Funil (04 §3): `AJUIZAR`/`VALOR_AJUIZAR` = ativos com `AUTOS = ''`; `ACORDOS_A_RECEBER`/`VALOR_…` = acordo `ANDAMENTO` com parcela `ABERTA` (valor = soma das abertas; `AGUARDANDO` nunca soma, D-08); `ACORDOS_PARCELA_VENCIDA`/`VALOR_PARCELA_VENCIDA` = os mesmos com parcela vencida (soma das vencidas); `RECUPERADO_MES`/`_ANO` = RN-015 datada: parcelas `PAGA` por `PAGO_EM`, mais `VALOR` dos encerrados `QUITADO` sem parcela paga e o `RECUPERADO_INFORMADO` dos encerrados, por `ENCERRADO_EM`; `CUSTO_MES` = custos não removidos por `DATA`. `DESVIOS_PRAZO` = linhas `prazo` (ativo com `PRAZO < HOJE_SQL`) + linhas `parado` (ativo fora de `dossie` e `suspenso`, `DATEDIFF(HOJE_SQL, ULTIMO_ANDAMENTO_EM) > jur.paradoAtencaoDias`) de `ccJurAlertas`; `DESVIOS_CRITICOS` = dessas, prazo vencido há mais de `jur.prazoCriticoDias` ou parado há mais de `jur.paradoCriticoDias` (os outros críticos de C-016 não entram) |
| `ccJurNotificacaoPreparar` | RF-032, RN-024, RN-025 | C-018, C-018 (documento), RN-024 | Monta `texto` = cabeçalho (notificante da filial, notificada, assunto, referência) + corpo de `ccBaseModeloPrever` com os extras + fecho (cidade/UF da filial, data por extenso, representante). Recusa: carteira `PUBLICA`; filial sem razão social ou CNPJ. `validado = false` não recusa a prévia, só o registro |
| `ccJurNotificacaoUltima` | RN-003 | C-001 | — |
| `ccJurDemonstrativoPreparar` | RF-033, RN-026 | C-019, RN-026 | Repassa `ccCobEncargosCalcular` sem recalcular; acrescenta cabeçalho e rótulos com os percentuais de `enc.*` da carteira. Não grava emissão |
| `ccJurFilialCredoraListar` | RF-034 | C-018, RN-030 | — |
| `ccJurCargaPendenciaListar` / `Total` | RF-037 | C-020, C-021 | Inclui as parcelas `A_CONFIRMAR` e a coluna `TIPO` (04 §3) |
| `ccJurCargaPrevia` | RF-035, RF-036 | C-020, C-023, RN-027 | Ver "Carga inicial" abaixo. `candidatos[]` por linha (`motivo` `CODIGO` = vinculado; `NOME` = um só, sugestão; dois ou mais `NOME` = candidatos sem sugestão). Nada grava |

### Escritas

Todas na forma A (01 §5): valida com mensagem → `ccEsc…` com guarda → 0 linha = recusa → `auditar()` → quadro. Ordem sempre domínio → quadro.

| SF | Atende | Smoke | Ordem das escritas e bordas |
|---|---|---|---|
| `ccJurDossieAbrir` | RF-001, RF-005, RF-007, RN-003, RN-007 | C-001, C-002, C-007, C-008, RN-007 | Quem: o caso do cliente ou nível ≥ 2, sempre com o cliente visível (DT-41). (0) há processo ativo do cliente na carteira, de **qualquer** origem (RF-007, RN-007) → devolve o mesmo; se for de origem `COBRANCA` ainda em `dossie`, completa o que faltou (itens por `INSERT IGNORE`, card se `CARD_ID` nulo); processo manual, da carga ou já enviado não ganha itens, e a rota do dossiê mostra a ficha de leitura; (1) lê posição da carteira (valor) e `ccBaseTitulosAbertos` (filial e BU de maior saldo vencido; Winthor fora do ar → filial vazia, segue); (2) `ccEscJurProcessoInserir`; (3) `ccEscJurDossieItensInserir` (11 ou 13 linhas; `demonst` e `hist` já `OK`, `protesto` `OK` se `CC_COBRANCA.PROTESTADO`, `notif` e `cadastro` pendentes com a orientação, tudo com `ORIGEM = 'SUGESTAO'`); (4) `kbCardCriar` na fase `dossie`, responsável = quem abre; (5) `ccEscJurProcessoCard`; (6) `auditar`; (7) nota no card da cobrança. Cliente sem caso aberto na carteira (04 §2 passo 1, fechamento v2): só pelo ramo nível ≥ 2, `COBRANCA_ID` nulo, valor da posição da carteira (pode ser 0), sem nota (passo 7 pulado); o envio cai no `semCaso` da 002 (RN-030 da 002). Não toca `NO_JURIDICO` nem a cobrança |
| `ccJurDossieItemMarcar` | RF-003, RN-002 | C-006, RN-002, RN-003 | `NA` sem `obs` recusa. `kbAnexoIds` preenchido com situação `PENDENTE` vira `OK`, `ORIGEM = 'ANEXO'` e `OBS = 'Anexo: <nome>'` se vazia (nome lido de `KB_ANEXO`). Depois do envio o dossiê é só leitura. Atualiza a capa `dossie` do card |
| `ccJurDossieEnviar` | RF-006, RN-004, RN-005 | C-003, C-004, C-005, RN-004, RN-005 | (1) confere o nível (recusa "exige Gerente financeiro ou acima") e depois a completude (`faltam[]`), com mensagem; (2) `ccCobEncargosCalcular` e posição → valor, valor atualizado, dias; prazo = `somarDiasUteis(hoje, jur.prazoInicialDu, feriados nacionais + UF da filial)`; (3) `ccEscJurProcessoEnvio` — se o processo já estava enviado, pula (4) e (5) e só refaz o que faltar do quadro e da cobrança; (4) item `alcada` com nome e data; (5) andamento `SISTEMA` "Dossiê enviado ao Jurídico. Saldo vencido R$ …, valor atualizado R$ …, N dias de atraso."; (6) `auditar`; (7) `kbCardMover` para `recebido` e `kbCardAtualizar` (prazo, capa); (8) `ccCobEnviarJuridico` com `membroId`. Falha em (7) ou (8): repetir o envio completa. **Divergência (B2, aceita em B3, provisória — O-12):** processo sem responsável recebe no envio o primeiro membro `JURIDICO` ativo (`MIN(ID)`); a automação de `recebido` (e-mail "Dossiê recebido pelo Jurídico" ao `$responsavel`) roda no `kbCardMover`, antes do `kbCardAtualizar` que troca o responsável, então vai para quem abriu o dossiê (O-03, a confirmar) |
| `ccJurProcessoCriar` | RF-016, RN-007, RN-009 | RN-007, RN-009, C-022 | Exige `clienteId` existente; `faseChave` não pode ser `dossie` nem `encerrado`; `autos` vazio ou no padrão CNJ; `faseChave` `citacao`, `defesa`, `sentenca` ou `execucao` com `autos` vazio recusa com a frase do gancho, "Informe o número dos autos." (o card nasce direto na fase, sem passar pelo gancho: RN-009(b)); setor do cliente, BU pela posição. Card nasce direto na fase. Com `clienteId > 0`, `ccEscBaseClienteJuridico` (`NO_JURIDICO = TRUE`); não chama `ccCobEnviarJuridico` (a rotina da 002 leva a cobrança). `linha`, `responsavelId`, `prazo` como em 04 §3 |
| `ccJurProcessoSalvar` | RF-015, RN-012, RN-032 | C-009, RN-012, RN-015, RN-032 | Audita campo a campo (até 10; acima disso, `(demais)`). Autos fora do CNJ recusa. `recuperadoInformado = 0` volta a derivar. Regrava título, prazo, capa e a etiqueta `Substabelecer` do card. `filial` e `linha` como em 04 §3 |
| `ccJurProcessoEncerrar` | RN-009, RN-015 | C-009, C-015, RN-009 | `OUTRO` exige texto; `ACORDO_CUMPRIDO` exige acordo `QUITADO` (na guarda); `BAIXA_PERDA` sem `CC_BAIXA` aprovada do cliente: aceita e devolve `aviso`, que também vai na nota. (1) `ccEscJurProcessoEncerrar`; (2) `NO_JURIDICO`; (3) `auditar`; (4) `kbCardMover` para `encerrado`; (5) nota com o motivo ("Acordo quitado: todas as parcelas pagas." no caso do acordo) |
| `ccJurProcessoVincularCliente` | RF-017, RN-011 | C-023, RN-011 | Cliente inexistente = `'Cliente não encontrado.'`. Regrava `CLIENTE_ID`, `DOCUMENTO`, `SETOR`, `BU_ID`, limpa `SUGESTAO_CLIENTES`; `ccEscBaseClienteJuridico` (`NO_JURIDICO = TRUE`), sem chamar `ccCobEnviarJuridico`; regrava título e capa |
| `ccJurAndamentoRegistrar` | RF-018, RN-010 | C-011, RN-010 | Texto obrigatório; `em` não futuro. Insere o andamento e atualiza `ULTIMO_ANDAMENTO_EM` (maior data), `STATUS` (o texto) e, se veio, o prazo. Não existe SF de alterar nem de apagar |
| `ccJurCustoLancar`, `ccJurCustoSalvar`, `ccJurCustoRemover` | RF-020, RN-013 | C-012, RN-013 | Valor > 0; tipo do catálogo; comprovante ⇒ `PAGO`. Depois de cada uma, regrava a capa `custo` e a etiqueta `Custo a pagar` (existe custo ativo não pago) |
| `ccJurAcordoCriar` | RF-024, RN-017 a RN-019 | C-013, C-014, RN-017, RN-018, RN-019 | `honorarios = 0` calcula por `jur.honorariosPct`. Parcelas: resto ÷ n truncado, sobra na última; vencimentos por `somarMeses`. Situação, `ACIMA_ALCADA` e `NIVEL_EXIGIDO` **não saem da JS**: a JS passa valor, entrada, nº de parcelas e honorários, e a guarda de `ccEscJurAcordoInserir` decide (fora de qualquer dos três limites: `AGUARDANDO`, nível `jur.acordoAlcadaNivel`; dentro: `ANDAMENTO`, nível 0); a JS relê a linha para a resposta e a nota. `politicaDoAcordo()` só monta a mensagem e a prévia da tela. Recusa se o processo já tem acordo `AGUARDANDO` ou `ANDAMENTO` (o `RECUSADO` não impede). Parcelas em lotes de 20. Não move o card: a tela chama `ctx.mover()` em seguida |
| `ccJurAcordoAprovar` | RF-025 | C-014, RN-019 | Nível e "não é quem registrou" relidos na guarda. `aprovar = 0`: grava `RECUSADO` e a nota no card; o processo pode registrar outro acordo |
| `ccJurAcordoParcelaSituacao` | RF-026, RN-020 | C-015, C-021, RN-020 | Aceita `ABERTA` e `PAGA` (com `pagoEm` não futuro); grava `ORIGEM_SITUACAO = 'MANUAL'`. Última em aberto paga → acordo `QUITADO` e resposta `quitado: true`; a tela chama então `ccJurProcessoEncerrar` com `ACORDO_CUMPRIDO`. Regrava a capa `acordo` |
| `ccJurAcordoHonorariosPagar` | RF-026 | RN-018 | — |
| `ccJurNotificacaoRegistrar` | RF-032, RN-006, RN-025 | C-018, C-007, RN-024, RN-025 | Recalcula os encargos (não recebe valor); recusa `PUBLICA`, modelo sem validação em dia e filial incompleta. Com `enviarEmail = 1`, `ccEmailEnviar` (`origem '003-notificacao'`); falha do e-mail não desfaz o registro. Nota no card da cobrança e no do processo, se houver e se quem emite escreve naquele card (responsável do dossiê ainda não enviado, ou membro ou administrador do quadro `juridico`; DT-34 regra 4) |
| `ccJurFilialCredoraSalvar` | RF-034 | C-018, RN-030 | Cria ou atualiza pelo `CODIGO`; CNPJ com 14 dígitos ou vazio. Quem: `ADM` (`podeAdministrar(m)` na JS, `PODE_ADMINISTRAR` na guarda, D-06) |
| `ccJurCargaAplicar`, `ccJurCargaConferir`, `ccJurCargaConcluir` | RF-035 a RF-038, RN-027 a RN-029 | C-020, C-021, C-023, RN-029 | Ver "Carga inicial" |

### Internas e guardas (resposta ao bloqueio B-4)

Todas levam `ATOR({{membroId}})`. `JUR` = `(A.CARGO = 'JURIDICO' OR PODE_ADMINISTRAR)` (04 §0; `PODE_ADMINISTRAR` = nível ≥ 3 ou marca `ADMIN`, 01 §5). Estado sempre no `WHERE` (repetir não regrava).

| `ccEsc…` | Guarda além do ator |
|---|---|
| `JurProcessoInserir` | origem `COBRANCA`: quem não é do Jurídico, com `clienteVisivelA('C')` e (caso aberto na carteira ou `NIVEL_MIN(2)`, DT-41), e não existe processo ativo (`ENCERRADO_EM IS NULL`, qualquer origem) do cliente na carteira; a SQL deriva caso (`COBRANCA_ID`), nome, setor, valor (posição da carteira) e status, e grava vazios autos, tribunal, linha, prazo, responsável, substabelecer, obs, chave e alerta da carga, encerramento e último andamento (validação B3, B-01: nada disso vem da entrada); origem `MANUAL` ou `CARGA`: `JUR`; `CARGA` ainda exige carga não concluída e usa `INSERT IGNORE` sobre `CHAVE_CARGA` |
| `JurProcessoCard` | `CARD_ID IS NULL`; o card é do quadro `juridico`, não excluído, com o título deste processo (`NOME_DEVEDOR · AUTOS` ou `sem autos`, o de `criarCard`), e nenhum processo o usa (contagem em tabela derivada com agregado, 06 §5) — B3, B-02 |
| `JurProcessoAtualizar`, `JurProcessoCliente`, `JurProcessoCarga` | `JUR`. A ficha continua editável depois do encerramento (valor recuperado informado, vínculo, conferência da carga); o que não volta é a etapa |
| `JurProcessoEnvio` | `A.NIVEL >= PARAM_NUM('jur.envioNivelMin')` e (Jurídico ou `clienteVisivelA`, como `vePro`); `DOSSIE_ENVIADO_EM IS NULL`; não existe item obrigatório (lista do catálogo, menos `alcada`) `PENDENTE` ou `NA` sem `OBS`; `VALOR` relido da posição da carteira; prazo depois de hoje e até hoje + 100 dias (B3, O-01) |
| `JurProcessoEncerrar` | `JUR`; `ENCERRADO_EM IS NULL`; `ACORDO_CUMPRIDO` exige acordo `QUITADO`; `OUTRO` exige texto |
| `JurDossieItensInserir` | o acesso do processo de origem cobrança (`clienteVisivelA`), sem o `NOT EXISTS`; processo `ORIGEM = 'COBRANCA'` com `DOSSIE_ENVIADO_EM` e `ENCERRADO_EM` nulos; item do catálogo da carteira; `alcada` só `PENDENTE` (B3, O-02); `INSERT IGNORE` |
| `JurDossieItemMarcar` | dossiê não enviado e (quem abriu, ou `clienteVisivelA`, ou `JUR`); o item `alcada` só pelo envio (`DOSSIE_ENVIADO_POR = {{membroId}}`) |
| `JurAndamentosInserir`, `JurCustosInserir`, `JurCustoAtualizar`, `JurCustoRemover`, `JurAcordoParcelasInserir`, `JurAcordoParcela` | `JUR`; parcelas do acordo: `NUMERO` entre 0 e `N_PARCELAS` do acordo, que não está `QUITADO` nem `RECUSADO`; origem `MANUAL` (B3, B-03): só `ABERTA`, valor igual (±0,004) ao da conta de `gerarParcelas` sobre o acordo gravado (0 = `ENTRADA`, existente só com entrada; 1..N−1 = resto ÷ N truncado; N = o que sobra), vencimento até `REGISTRADO_EM` + 31 dias × (número + 1) (a JS recusa entrada vencendo depois de hoje + 31 dias) e acordo `ANDAMENTO` sem aprovação dentro da política relida; origem `COR_PLANILHA`: processo da carga com a carga aberta; parcela: `pagoEm <= HOJE_SQL`, e `PAGA` só com o acordo `ANDAMENTO` (O-04) |
| `JurAcordoInserir` (bloqueio B-1 v2) | `JUR`; processo não encerrado; `NOT EXISTS` acordo `AGUARDANDO`/`ANDAMENTO` do processo; `{{valor}} > 0`, `0 <= {{entrada}} <= {{valor}}`, `{{nParcelas}} >= 0`. A política é relida na SQL, sobre os valores recebidos, e nada dela vem da JS: `FORA` = `{{entrada}} < {{valor}} * PARAM_NUM('jur.acordoEntradaMinPct') / 100 OR {{nParcelas}} > PARAM_NUM('jur.acordoParcelasMax') OR {{valor}} > PARAM_NUM('jur.acordoAlcadaValor')`; o `INSERT … SELECT` grava `ACIMA_ALCADA = FORA`, `SITUACAO = CASE WHEN FORA THEN 'AGUARDANDO' ELSE 'ANDAMENTO' END`, `NIVEL_EXIGIDO = CASE WHEN FORA THEN PARAM_NUM('jur.acordoAlcadaNivel') ELSE 0 END`, `REGISTRADO_POR = {{membroId}}`. Única exceção, a carga: processo `ORIGEM = 'CARGA'`, carga não concluída (não existe a linha `jur.cargaConcluida`), processo sem acordo nenhum e `{{carga}} = 1` → aceito; e só com `{{valor}} <= P.VALOR` (o acordo não passa do valor do processo na planilha) nasce `ANDAMENTO` com `NIVEL_EXIGIDO = 0` (acordo já homologado; `ACIMA_ALCADA` gravado como calculado); acima disso vale a política (B3, C-01) |
| `JurAcordoSituacao` | aprovar ou recusar (`ANDAMENTO`/`RECUSADO`): `SITUACAO = 'AGUARDANDO'`, `A.NIVEL >= NIVEL_EXIGIDO` (coluna relida) e `REGISTRADO_POR <> {{membroId}}`; quitar: `JUR` e nenhuma parcela em aberto; honorários: `JUR` |
| `JurNotificacaoInserir` | o agente do cliente ou alguém acima dele (`V.ID = C.AGENTE_ID AND V.CAMINHO LIKE CONCAT(A.CAMINHO, '%')`); cliente fora do setor público; `EMITIDA_EM = HOJE_SQL` e `MODELO_VERSAO` do modelo `JUR_NOTIF_EXTRAJUDICIAL` validado em dia (31 dias por mês de `com.modeloRevalidarMeses`); processo e caso só do mesmo cliente; total = soma (±0,01) e principal até `VENCIDO + A_VENCER` da posição (o principal vem do Winthor ao vivo, a posição é da última leitura: igualdade recusaria notificação legítima) — B3, C-02 |
| `JurFilialSalvar` | `PODE_ADMINISTRAR` |

Limite conhecido (01 §5): quem tem a permissão do ato e chama a `ccEsc…` por fora pula a validação de formato e a auditoria da JS; alçada, segregação, completude do dossiê, estado e a política do acordo (entrada mínima, parcelas máximas e teto de alçada, comparados com `PARAM_NUM('jur.acordo…')` na guarda de `ccEscJurAcordoInserir`) continuam valendo, porque estão na SQL. Um Jurídico que chama a interna direto com 70.000 grava o acordo `AGUARDANDO` com nível 3, como pela tela.

### Gancho do quadro `juridico`

Trecho de `ccPodeMover` entregue por `gancho('juridico')`, sobre os apelidos de 04 §8, com `P` = processo do card. Primeiro as cláusulas de domínio dos destinos controlados, depois "quem move" só para o movimento livre (DT-35). Primeira regra que casar recusa, nesta ordem: (1) destino `dossie`; (2) origem `encerrado`; (3) destino `encerrado` sem `P.ENCERRADO_EM`; (4) `dossie → recebido` sem `P.DOSSIE_ENVIADO_EM` — **divergência (B2, aceita em B3):** as regras 4 e 6 valem só para o dossiê vindo da cobrança (`P.ORIGEM = 'COBRANCA'`); processo manual ou da carga nasce no card em `dossie` (a lib sempre cria na fase de entrada) e a SF o leva à fase pedida; o `EXISTS` sobre `CARD_ID` é seguro porque `ccEscJurProcessoCard` só liga um processo por card; (5) movimento livre (destino que não é `encerrado` nem `dossie → recebido`) e quem move não é cargo Jurídico nem `PODE_ADMINISTRAR` (com `M` no lugar de `A`, 01 §14) — "Só o Jurídico move processos."; (6) origem `dossie`, destino que não é `recebido` nem `encerrado`, sem `P.DOSSIE_ENVIADO_EM`; (7) destino `citacao`, `defesa`, `sentenca` ou `execucao` com `P.AUTOS = ''`. Frases de 04 §8. Com isso o `kbCardMover` aninhado do envio passa quando a sessão é levada, seja quem enviar com nível ≥ `jur.envioNivelMin` (Supervisor, que é `membro` do quadro, 05 §2), e o do encerramento passa para quem encerra. Espelho de tela em `frontend/src/lib/juridico/mover.ts`, igual, só para desabilitar destino.

### Alertas e indicadores

Uma função pura, `calcular(carteira, parametros, hoje)` em `backend/lib/juridico/gestao.mjs`, usada pelas duas SFs. A SF lê por `ler()` (consulta direta, sem SF aninhada): processos com fase, custo agregado e contagem de itens; acordos com parcelas agregadas; saldo vencido dos clientes vinculados (`CC_POSICAO_CLIENTE_CARTEIRA`); casos de cobrança abertos com dias de atraso; parâmetros. As duas são `JUR`, que vê tudo: sem filtro de hierarquia.

- Acordo `RECUSADO` fica fora dos desvios e dos indicadores ("o acordo do processo" = o mais recente não `RECUSADO`, 02).
- Desvios: os 13 de RN-022, ordem "críticos primeiro, depois a ordem dos tipos" (`prazo`, `parcela`, `politica`, `semdossie`, `parado`, `custo`, `custas`, `carga`, `subst`, `suspenso`, `dossie`, `encsaldo`, `atvreg`). "Divergência na carga" = um alerta por pendência não conferida. "Pronto para o Jurídico sem dossiê": caso aberto de `PRIVADA` ou `ESTETICA`, fase da régua, `DIAS_ATRASO >= regua.jur` da carteira, sem processo ativo; a linha traz `clienteId` e `carteira` (a tela abre o dossiê), sem `processoId`.
- Indicadores: os 24 de RN-023 com a faixa pelos `jur.ind*`; 06 pela RN-016 nova; 21 com ajuizados ativos e encerrados.
- `ponytail:` carteira inteira em memória, teto de ~5.000 processos; acima disso, agregar em SQL.

### Carga inicial (onde o arquivo é lido e como o servidor valida)

1. **O arquivo só existe no navegador.** `frontend/src/lib/juridico/planilha.ts` lê o `.xlsx` com SheetJS (`cellStyles: true`, que traz a cor da célula) e devolve as abas como matrizes `{ v, cor }`. O arquivo não é enviado nem guardado em lugar nenhum.
2. **Interpretação na tela, em função pura** (`frontend/src/lib/juridico/carga.ts`, regras de E §2.1–2.7): localiza as 5 abas, lê cada linha, sugere a etapa pelo texto, separa andamentos `[Autor] dd/mm: texto`, converte valor e data de vencimento (a data do andamento vai crua), funde o mesmo processo de abas diferentes (15 dígitos dos autos → código + semelhança ≥ 0,34 → semelhança ≥ 0,6), marca divergência de autos e traduz a cor da parcela pela legenda (RN-028). Saída: lista de processos no formato da tabela abaixo. É regra de tela, testada em `frontend/tests`.
3. **O servidor não confia na tela.** `ccJurCargaPrevia` recebe até 5 processos e `ccJurCargaAplicar` **1** por chamada (2 ou mais = recusa); para cada um, em `backend/lib/juridico/carga.mjs`: conferem formato e teto (nome obrigatório, fase do catálogo menos `dossie`, valor ≥ 0, datas válidas, até 20 andamentos, parcelas com situação `ABERTA`/`PAGA`/`A_CONFIRMAR`); **recalculam a chave** (dígitos dos autos; senão código + nome normalizado; senão nome) — a chave vinda da tela é ignorada; **refazem o vínculo**: código existente em `CC_CLIENTE` vincula, sem código a semelhança de nome ≥ 0,6 com um cliente só vira sugestão, com dois ou mais lista os candidatos (a prévia devolve `candidatos[]`, 04 §3); na aplicação, `clienteId` mandado pela tela vale se o cliente existe, seja ele um candidato, um escolhido pela busca "Outro" ou a sugestão confirmada (vínculo é por código, RN-011, e quem carrega já é `JUR`, que pode vincular pela ficha); `clienteId` inexistente é ignorado e o vínculo segue a regra do código; sem vínculo, os candidatos por nome vão para `SUGESTAO_CLIENTES`. `ponytail:` a semelhança lê `ID, CODCLI, NOME_BUSCA` de `CC_CLIENTE` com `LIMIT 5000` por chamada; acima disso, pré-filtrar por palavra do nome em `NOME_BUSCA`. Resolvem a filial pela UF (uma filial ativa na UF, senão vazia + aviso em `ALERTA_CARGA`); decidem `NOVO` (chave nova), `ATUALIZA` (chave já gravada e incompleta: falta card, andamento ou acordo) ou `IGNORA`. Data de andamento sem ano: ano da carga, ou o anterior se cair no futuro; sem data: a da carga (RN-010).
4. **Aplicar** (por processo): `ccEscJurProcessoInserir` (`INSERT IGNORE`) → `kbCardCriar` na fase sugerida (encerrado: grava `ENCERRADO_EM` e motivo, cria na fase de entrada, `dossie`, e move para `encerrado`; o `ENCERRADO_EM` é a data da carga e o processo não entra no recuperado do mês nem do ano, `ENC_NO_PERIODO`, B3 C-05) → `ccEscJurProcessoCard` → andamentos em lote → acordo e parcelas → `ccEscBaseClienteJuridico` se vinculado (a cobrança vai a `juridico` pela rotina da 002) → `auditar` (área `Carga do Jurídico`). Reaplicar não altera campo gravado; completa o que faltou. `ccJurCargaConcluir` (`ADM`: `podeAdministrar(m)`, D-06) grava o estado; daí em diante prévia e aplicação recusam.
5. **Ritmo:** a tela manda **1 processo por chamada**, em sequência, no máximo 10 por minuto, com barra de progresso e botão de pausa (04 §3; RNF-003 "em até 60 min, com progresso").

**Formato de um processo interpretado** (um item de `linhas`; o mesmo em `ccJurCargaPrevia`, `ccJurCargaAplicar`, `carga.ts` e `PLANILHA_TESTE`):

| Campo | Quem produz | O que o servidor faz |
|---|---|---|
| `chave` | tela (fusão entre abas) | ignora; recalcula (RN-029) |
| `nomeDevedor`, `codcli ('')`, `documento ('')` | tela | nome obrigatório; `codcli`/`documento` só em dígitos, usados no vínculo |
| `clienteId (0)` | tela (candidato, busca ou sugestão confirmada) | aceita se existe; senão ignora (acima) |
| `carteira`, `setor`, `linha ('' \| GALDERMA)` | tela (segmento da planilha) | confere os valores; com cliente vinculado, o setor passa a ser o do cliente (RN-011) |
| `uf` | tela (sigla da filial) | resolve a filial credora (uma ativa na UF; senão vazia + aviso em `ALERTA_CARGA`) |
| `valor` | tela (já convertido, "R$ 7.250,30" → 7250.30) | ≥ 0 |
| `autos ('')`, `tribunal ('')` | tela | autos fora do padrão CNJ: grava vazio e põe o texto lido em `ALERTA_CARGA` (vira pendência, RN-009 "a carga deixa a inconsistência como pendência") |
| `faseChave`, `status`, `substabelecer (0)` | tela (etapa sugerida pelo texto, E §2.3) | fase do catálogo menos `dossie` |
| `motivo ('')` | tela: `QUITADO` quando a situação é "Quitado"; outro texto de encerrado → `OUTRO` | só com `faseChave = 'encerrado'`; um dos 5 motivos; `OUTRO` usa `status` como texto |
| `divergencia ('')` | tela (autos diferentes entre abas, RN-027) | vai para `ALERTA_CARGA` (o servidor não vê as abas) |
| `andamentos[]` (≤ 20): `{ data, autor, periodo, texto }` | tela separa `[Autor] dd/mm: texto`; `data` vai **crua** (`'dd/mm'`, `'dd/mm/aaaa'` ou `''`) | converte por `inferirData` (RN-010: ano da carga ou o anterior; sem data = data da carga); `TIPO = 'CARGA'` |
| `custos[]` (≤ 20): `{ tipo, data, valor, pago, obs }` | tela (a planilha de teste não traz) | tipo do catálogo, valor > 0, data ISO |
| `acordo` (ou `null`): `{ valor, entrada, nParcelas, honorarios (0), situacaoTexto, parcelas[]: { numero, valor, vencimento, situacao } }` | tela (vencimento já em ISO, data serial convertida; `situacao` pela cor, RN-028) | parcelas `ABERTA`/`PAGA`/`A_CONFIRMAR`, sempre com `ORIGEM_SITUACAO = 'COR_PLANILHA'` (gravado pelo servidor); acordo nasce `ANDAMENTO`, sem passar pela política (exceção da carga na guarda de `ccEscJurAcordoInserir`); honorários 0 = `jur.honorariosPct` |

A função `semelhanca(a, b)` (E §2.4) existe nos dois lados (fusão entre abas na tela, sugestão de cliente no servidor), como já acontece com os dias úteis: os dois testes usam os mesmos casos.

## Superfície de interação

Módulo em `frontend/src/modules/003-juridico/`, rota-mãe `/juridico`, menu "Jurídico" (some para o Analista). A opção de cada tela é a de `docs/opcoes-tela/escolhas.md`; o mockup está em `docs/opcoes-tela/003-juridico/`.

| Tela / rota | Opção escolhida | Montagem | Novos |
|---|---|---|---|
| `/juridico` (casca com 5 abas e contadores) | — | `PageHeader`, abas com contagem (RF-029, de `ccJurAlertas`); abas de gestão só para `JUR` | `JuridicoPage` |
| aba Visão gerencial | `juridico-visao-gerencial` **C** — Abas por pergunta | 4 `Kpi` fixos + resumo; 4 abas (carteira, recuperação e acordos, custos, prazos e andamento), cada uma com `Table` dos indicadores e `PainelGrafico` em `GradeGraficos`; tabela "indicadores por etapa" | `VisaoGerencial` |
| aba Processos | `juridico-processos` **B** — Capa completa por fase | `KanbanBoard slug="juridico"` (`atualizarACadaMs = 60000`, `podeExcluir = false`, `novoCard` = "Novo processo"); faixa dos 6 números (RF-014) no cabeçalho; filtros de BU, carteira, linha e filial pelos campos de seleção do quadro; alternância Quadro/Lista; a Lista é `Table` em 3 grupos com `Pagination` e "Exportar CSV" | `ProcessosAba`, `ListaProcessos` |
| card do processo | `juridico-card-processo` **B** — Tudo em Nesta fase | `CardDrawer` da lib com `conteudoDaFase` = blocos que abrem e fecham (prazo e situação, andamentos, custos, acordo, dossiê); `abasExtras` = "Processo completo" e "Cobrança de origem"; `acoesExtras` = Registrar andamento, Lançar custo, Registrar acordo, Enviar dossiê, Gerar notificação, Demonstrativo, Encerrar processo; `podeMover` de `mover.ts` | `BlocosDoProcesso`, `AcoesDoProcesso`, diálogos de andamento, custo, acordo e encerramento |
| dossiê (`/juridico/dossie/:processoId` e fase `dossie` do card) | `juridico-dossie` **B** — Pendências primeiro | o mesmo componente nos dois lugares, só com a ficha (`ccJurProcessoFicha`) ao abrir: "Falta para enviar" em cartões com a orientação gravada na abertura e a ação, conferidos recolhidos, "Se houver" à parte, filial credora (a lista de `ccJurFilialCredoraListar` carrega quando a pessoa abre o seletor) e "Enviar ao Jurídico"; botão "Ver sugestões do sistema" chama `ccJurDossieSugestao` (total, títulos e, na pública, NF, empenho, protocolo, contrato e certidões). **Dossiê público (não desenhado):** a mesma tela com os 13 itens do catálogo; os dois "se houver" (LAI, garantias) no bloco "Se houver"; sem o botão de notificação | `DossiePendencias` |
| aba Acordos judiciais | `juridico-acordos` **A** — Tabela de acordos | 4 `Kpi`, `Table` com as parcelas abrindo sob a linha, "Aprovar" e "Marcar paga" | `AcordosAba` |
| aba Custos | `juridico-custos` **A** — Painel de números | 7 `Kpi`, aviso de custas sem lançamento, 4 `PainelGrafico` com visão de tabela, cortes por tipo, filial, BU e etapa, a pagar, pagos sem comprovante, tabela por processo; "Lançar custo" em diálogo | `CustosAba` |
| aba Alertas | `juridico-alertas` **A** — Lista por severidade | fichas por tipo com contagem, `Table` única com `Status` de severidade, "Abrir processo" ou "Abrir dossiê" | `AlertasAba` |
| notificação e demonstrativo (`/juridico/documentos/…`) | `juridico-previa-documentos` **C** — Conferência em passos | notificação em 4 passos (partes, débito, pagamento e assinatura, prévia e emissão); demonstrativo em 2; o papel só no último. Editáveis: filial, prazo, contato e envio por e-mail; valores só leitura | `DocumentoPassos`, `Papel` |
| carga inicial (`/juridico/carga`) | `juridico-carga-inicial` **C** — Passo a passo | 5 passos (arquivo, leitura por aba, vínculo, pendências, aplicar e concluir). **Dois candidatos pelo nome (C-023, não desenhado):** no passo do vínculo a linha fica "2 candidatos", sem sugestão marcada; "Outro" abre a busca por código ou CNPJ com os dois no topo; sem escolha, segue como "sem cliente" para as pendências | `CargaPassos` |
| "Novo processo" (não desenhado) | padrão da tela vizinha (Processos B) | `Dialog` sobre o quadro: busca do cliente por código ou CNPJ (`SelectMenu` sobre `ccBaseClienteListar`), carteira, filial, valor, linha, autos, tribunal, etapa inicial, observação; o resumo do cliente ao lado | `NovoProcessoDialog` |
| filiais credoras (`/juridico/filiais`, não desenhado) | padrão de cadastro da 001 (`adm-bus` A, tabela e diálogo) | `Table` das filiais com `Status` ativa/inativa e `Dialog` de edição; botão desabilitado para quem não é Gerente ou acima | `FiliaisCredoras` |
| ficha de leitura (`/juridico/processos/:id`) | os blocos do card B | para quem vê o processo mas não tem acesso ao card no quadro (agente fora do próprio dossiê; o supervisor é `membro` do quadro e abre o card, P-48): os mesmos `BlocosDoProcesso`, sem ações. Card de cliente fora da hierarquia aberto pelo supervisor no quadro: a ficha devolve "Processo não encontrado." e o card mostra só isso (05 §2, diferença conhecida) | `FichaLeitura` |

Regra pura de tela em `frontend/src/lib/juridico/`: `prazo.ts` (RN-021), `csv.ts` (RF-019), `planilha.ts` e `carga.ts` (RN-027, RN-028), `mover.ts` (espelho do gancho), `nomes.ts` (`semelhanca`). O botão "Montar dossiê" do card da cobrança é da 002 (05 §3.5): chama `ccJurDossieAbrir` e navega para `/juridico/dossie/:processoId`. A 003 não registra extensão em quadro de outro módulo.

PDF: o passo final mostra o `Papel` (HTML com folha de impressão A4 e timbrado) e chama a impressão do navegador, que salva em PDF (D-07).

Orçamento ao abrir (01 §10): aba Processos = sessão + 2 da lib + `ccJurAlertas` + `ccJurIndicadores` + parâmetros do grupo `jur` = 6; card = `kbCardDetalheSql` + `ccJurProcessoFicha` em toda fase, inclusive `dossie` (nenhum módulo estende o card do `juridico`, DT-42); rota do dossiê = sessão + `ccJurProcessoFicha` = 2, igual na privada e na pública. Por ação da pessoa: "Ver sugestões do sistema" = `ccJurDossieSugestao` 1 + `ccCobEncargosCalcular` 3 = 4 (as tabelas da 005 são lidas por `runQueryMitra`, sem SF); abrir o seletor de filial = 1.

## Fluxo

1. **Cobrança → dossiê.** No card da cobrança, "Montar dossiê" → `ccJurDossieAbrir` → tela do dossiê, que lê a ficha; as sugestões ao vivo vêm pelo botão "Ver sugestões do sistema". Cada marcação ou anexo é um `ccJurDossieItemMarcar`; o anexo sobe por `enviarArquivo` para os anexos do card e a SF recebe só os ids.
2. **Envio.** Gerente ou acima → `ccJurDossieEnviar`: processo em `recebido`, prazo, andamento, cobrança em `juridico`, cliente visível ao Jurídico; a automação da lib avisa o responsável.
3. **Operação.** O Jurídico move por "Mover para" (gancho), lança andamento, custo e acordo pelas ações do card, edita a ficha e encerra por "Encerrar processo".
4. **Acordo.** Registrar → (aprovação, se fora da política) → tela move para `acordo` → parcelas marcadas uma a uma → na última, a tela encerra com "acordo cumprido".
5. **Documentos.** `…Preparar` → passos de conferência → papel → impressão; a notificação chama `ccJurNotificacaoRegistrar` ao emitir.
6. **Gestão.** As abas leem `ccJurAlertas` e `ccJurIndicadores` com os mesmos filtros, em `Promise.allSettled`, com cache por (aba, filtros) e sem atualização periódica.
7. **Carga inicial.** Arquivo lido na tela → prévia em lotes de até 5 → confirmação dos vínculos → aplicar um a um → pendências → concluir (quem administra).

## Simulador

- **Relógio:** o padrão do contrato, `RELOGIO = '2026-11-19T10:00:00'` (é o "hoje" da spec, D). Datas do seed por `dia(n)` contados do `RELOGIO` (a tabela da spec dá cada uma em D); absoluta só feriado e vigência (06 §1).
- **Seeds carregados pelo smoke** (06 §3): elenco + `seed/003-juridico.mjs`. Nenhum seed de clientes de outra spec (com o da 001 entraria o 1004 e com o da 002 o 2010 em "pronto para o Jurídico sem dossiê", e C-016 e C-002 deixariam de dar 13 e 12). Os módulos 002 e 005 podem estar presentes (DDL e SFs), sem dados.
- **Seed** (`backend/simulator/seed/003-juridico.mjs`, faixa 3001–3099), pelo pipeline de 06 §2.3 (DT-38):
  - `winthor()`: notas dos clientes 3001–3020 pelo ajudante `nota()` — 3001: 18.000 `dia(-38)` e 12.000 `dia(-30)`; 3013: 20.000 `dia(-52)` e 13.000 `dia(-40)`; 3003 com produto da BU Estética; 3004 e 3014 com ramo 13; 3008: 5.000 `dia(-20)`; 3012: 12.000 `dia(-25)`; 3009 e 3011 só com título pago; os demais com processo ativo, um título vencido do valor do processo; 3015–3020, um título a vencer. O código 3090 não existe.
  - `INICIO = dia(-40)` e `passado()`: o banco lê e processa em `dia(-40)` (passos 4 a 8), quando a 3013 está com 12 dias de atraso, na fase `protesto`; `passado()` chama `ccCobAcaoRegistrar` como Ana com o item `protesto_1` (grava `PROTESTADO`); o passo 9 leva o relógio a D e roda a rotina (a 3013 chega a `extrajudicial`, protestada). Nada de relógio para trás.
  - `dominio()`, no `RELOGIO`, pelas SFs públicas com `como()` e `comRelogio(dia(n), …)` só para carimbar datas (nunca roda a rotina): (a) filial 1 completa por `ccJurFilialCredoraSalvar` e modelo validado pela Júlia; (b) notificação da 3013 em `dia(-30)` (20/10); (c) P01–P05, P07, P08 e P10–P12 por `ccJurProcessoCriar` + `…Salvar` + andamentos, custos, acordos e encerramentos nas datas da tabela da spec — P07 encerrado em `dia(-35)`; parcelas de P10 pagas em `dia(-160)`, `dia(-130)` e `dia(-100)` e P10 encerrado em `dia(-79)` (fixam `RECUPERADO_ANO` em 30.000 e `RECUPERADO_MES` em 0); (d) P06 por `ccJurDossieAbrir` como Ana em `dia(-17)` (02/11) e cinco itens marcados (7 de 10); (e) P09 por `ccJurCargaAplicar` em `dia(-5)` (14/11) com um aviso de divergência.
  - **Rotina do passo 11** (depois do `dominio()`): o caso de cobrança aberto de cliente com processo ativo enviado ou de origem `MANUAL`/`CARGA` vai a `juridico` (05 §3.6 linha 14): 3002, 3003, 3005, 3006, 3007 e 3010 (e o caso público de 3014, se existir), com nota e `PROCESSO_ID`. Ficam fora: Atlas (dossiê não enviado, em `extrajudicial`), Iota (sem processo), Zeta e Lambda (só processo encerrado, casos na régua). O smoke recebe o banco neste estado; nenhum teste depende de a rotina ainda não ter rodado.
  - Exporta `PLANILHA_TESTE` (os 5 processos de C-020 no formato "processo interpretado" da seção Carga inicial) e `PLANILHA_SANTA_MARIA` (C-023).
- **Módulo ausente:** sem a 002 (id 0), o `passado()` e os testes que dependem da cobrança usam `pular('depende de 002')`; sem as tabelas da 005, o dossiê público vem sem sugestão.
- **Rotina no teste:** `rodarCron('ccRotina')` apaga a trava (06 §1), por isso roda com o relógio fixo; só o RN-007 a chama.
- **Dialeto:** só funções da lista permitida de 06 §5 (`DATEDIFF`, `GROUP_CONCAT`, `SUBSTRING_INDEX`, `FIND_IN_SET`, `INSERT IGNORE`, `ON DUPLICATE KEY UPDATE`). Sem `JSON_TABLE`, sem `WITH RECURSIVE`, sem `ROW_NUMBER`. Busca sempre em texto normalizado.
- **Duas situações da chamada aninhada:** os testes que mexem em card (abrir, enviar, criar, encerrar, carga) e os que chamam leitura JS aninhada (sugestão, demonstrativo, notificação) rodam com `nasDuasSessoes()` (`SIM_SESSAO_ANINHADA=0` e `=1`), com o mesmo resultado nas duas.

## Testes

Arquivo de regra de negócio: `backend/simulator/smoke/003-juridico.mjs`; de tela: `frontend/tests/003-juridico.test.mjs`. A evidência com números é a da seção Testes da spec; a tabela diz por onde o `assert` passa.

**Divergência (construção B2, aceita na validação B3):** o smoke roda com `BANCO_POR_TESTE = true`: cada `teste()` começa de uma cópia do banco do passo 11 e monta o que precisa, então os blocos e as dependências de ordem abaixo não valem mais; ficam como registro. Ordem original do smoke (responde às correções C-3 e C-2 do validador, sem banco novo por teste): **bloco A**, leituras sobre o seed intocado (o estado do passo 11); **bloco B**, escritas, cada teste lê o "antes" na hora e afirma a diferença; **bloco C**, carga, por último. Dependências declaradas: C-001 e C-002 abrem o bloco B (o total de 13 alertas ainda é o do seed); C-008 depois de C-001; C-009 depois de C-012, RN-008 e C-014 e **antes** de C-004 (a Atlas ainda em `dossie` com 7 de 10); C-018 antes de C-003 (Ana ainda é a responsável do card do dossiê da Atlas e pode anotar nele, DT-34 regra 4); C-004 antes de C-006 (o dossiê ainda tem os dois itens pendentes) e C-003 depois dos dois e de C-005; C-015 depois de C-013; **RN-007 no fim do bloco B** (é o único teste que roda a rotina). Processos próprios, que nenhum outro teste usa: o RN-009 abre como Bruno o dossiê da Lambda (3012: caso aberto, só processo encerrado; `ccJurDossieAbrir` é idempotente, então não depende de ordem); o RN-007 cadastra o processo manual da Zeta (3008). C-021 e RN-029 depois de C-020. Linhas agrupadas na tabela são `teste()` separados, um por id.

| Cenário / regra | Bloco | O que o `assert` verifica |
|---|---|---|
| C-010 | A | `ccJurProcessoListar`/`Total` como Júlia: contagem e soma dos 3 grupos; filtros linha, filial 2, carteira `PUBLICA` e `ESTETICA`; busca "0712345" |
| C-016 | A | `ccJurAlertas`: 13 linhas, 4 críticas, sequência dos tipos, "9 dias" no prazo, filtro por tipo, linha `semdossie` com cliente 3013 e sem processo |
| C-017 | A | `ccJurIndicadores`: os 24 valores e faixas, concentração 58,6%; `ccJurResumo` (`mes = ''`, novembro): 9, 1, 495.000, 4.500, 300, 30.000; funil: `AJUIZAR` 4 / 175.000, `VALOR_ATIVOS` 495.000, `ACORDOS_A_RECEBER` 0 / 0 e `ACORDOS_PARCELA_VENCIDA` 0 / 0 (o acordo da Nova Era está `AGUARDANDO`); `ccJurIndicadores`: 07 = 0 (0), 08 = 0, `acordosAguardando` 1 / 60.000 (D-08); `ccJurAcordoTotal`: `VALOR_A_RECEBER` 0, `AGUARDANDO` 1, `VALOR_AGUARDANDO` 60.000; `RECUPERADO_MES` 0, `RECUPERADO_ANO` 30.000, `CUSTO_MES` 1.200, `DESVIOS_PRAZO` 2 (P01 prazo, P03 parado), `DESVIOS_CRITICOS` 1 (P01) |
| C-022 | A | `ccJurProcessoTotal` como Ana, Bruno, Carlos, Sérgio, Silvia, Júlia, Gustavo, Diana e Nara; `kbCardMover` como Ana e como Sérgio (`membro` do quadro, P-48) recusados com "Só o Jurídico move processos."; `ccJurCustoLancar` como Bruno recusado |
| RN-001 | A | catálogo: 17 itens; 11/10 e 13/11 por carteira; os 6 só da pública |
| RN-008 | B | P09 em "a ajuizar"; depois de `ccJurProcessoSalvar` com autos, "em andamento" = 6 sem mover (roda antes de C-009, que dá autos ao Delta e encerra o Vale Verde) |
| RN-010 | A | nenhuma SF de alterar ou apagar andamento no mapa; `DIAS_SEM_ANDAMENTO` de P03 = 50; datas inferidas da carga em `carga.mjs` |
| RN-012 | A | `validarAutos` com os três exemplos; ano 2024 |
| RN-013 | A | catálogo de custos: grupo de dois tipos, 12 e 4; regra "sem guia" |
| RN-014 | A | razão de P01 e P03, alerta só no ativo acima da meta |
| RN-015 | A | recuperado de P07, P10, P11, P02; P11 com `recuperadoInformado` 1.500 e de volta a 0 (deriva) no fim do teste |
| RN-016 | A | indicador 06 = 30.000 ÷ 537.000 |
| RN-022 | A | `calcular()` com variações de prazo, andamento e acordo; cliente público sem processo fora de `semdossie` |
| RN-023 | A | indicadores 20, 21, 23; recorte `filial = '2'` |
| RNF-006 | A | `ccJurProcessoFicha` de P06 como Bruno: `ok: false`, "não encontrado", sem `anexos` |
| C-001 | B | `ccJurDossieAbrir` como Ana na 3013: itens, situações, orientações, progresso 3/10 |
| C-002 | B | fase `dossie`, valor, filial; contagem da coluna; `ccCobSituacao` igual; `ccJurAlertas` 13 → 12; item marcado persiste |
| C-008 | B | segunda abertura devolve o mesmo `processoId`; `Total` do cliente = 1 |
| RN-007 | B (fim) | `ccJurProcessoCriar` como Júlia para a Zeta (3008, caso aberto, P07 encerrado): aceito, total da Zeta 2, `NO_JURIDICO` ligado; `ccJurDossieAbrir` como Bruno para a 3008 devolve o processo manual (nenhum terceiro: RF-007 olha qualquer processo ativo); antes da rotina `ccCobSituacao` da 3008 fora de `juridico`, após `rodarCron('ccRotina')` com `FASE_CHAVE = 'juridico'` e `PROCESSO_ID` do manual (`pular('depende de 002')` sem a 002). A rodada não move outro caso (o banco já saiu coerente do passo 11) |
| RN-002 | B | `ccJurDossieItemMarcar` com anexo: `OK`, `OBS` "Anexo: nf-3001.pdf"; `NA` sem motivo não muda o progresso |
| RN-003 | B | protesto marcado `PENDENTE` continua depois de reabrir; cliente sem endereço sem orientação de cadastro |
| C-006 | B | `NA` sem `obs`: recusa "motivo"; com motivo, progresso 7 → 8 |
| C-004 | B | `ccJurDossieEnviar` de P06 com pendências: `faltam` com 2 itens, sem `alcada`; fase `dossie` |
| C-005 | B | envio como Ana e como Sérgio: recusa "Gerente" |
| C-003 | B | envio como Gustavo: fase, prazo 2026-11-27, item `alcada`, 10/10, `ccCobSituacao` em `juridico`, `VALOR_ATUALIZADO` 31.087,25, texto do andamento; segundo envio sem novo andamento |
| RN-004 | B | fase da cobrança antes e depois; `jur.envioNivelMin = 2` (volta a 3 no fim): Sérgio completa e envia o dossiê da Iota com `nasDuasSessoes` → card em `recebido` e cobrança em `juridico` nas duas (gancho regra 4: destino controlado, sem "quem move"; Sérgio é `membro` do quadro) |
| RN-005 | B | prazo com 5 e com 3 dias úteis; envio com relógio em 13/11 |
| C-007, RN-006 | B | dossiê da 3004 como Carlos: 13/11 itens, códigos ausentes, 2/11; `ccJurDossieSugestao` como Carlos com `nasDuasSessoes`: mesma resposta nas duas, itens públicos sem sugestão (a 3004 não tem NF nem certidão no seed; sem as tabelas da 005, idem); `ccJurNotificacaoRegistrar`: recusa "ofício" |
| C-018 | B | `ccJurFilialCredoraSalvar` como Gustavo; `ccJurNotificacaoRegistrar` como Ana: valores, prazo 2026-12-04, nota no card; recusas de modelo, de filial sem CNPJ e de Júlia |
| C-018 (documento) | B | `ccJurNotificacaoPreparar`: 5 títulos de cláusula, total, prazo e data por extenso; com `enc.multa = 0`, 30.487,25 |
| RN-024 | B | rótulo CNPJ/CPF pelo tamanho do documento; "prazo até" com 15 e com 10 |
| RN-025 | B | sem validação recusa, validado aceita; e-mail e telefone de `com.*`; banco e representante da filial |
| C-019, RN-026 | B | `ccJurDemonstrativoPreparar` da 3013 = `ccCobEncargosCalcular` campo a campo; linhas por título; rótulos |
| C-011 | B | `ccJurAndamentoRegistrar` em P03: dias 0, alerta `parado` 1 → 0, texto vazio e Bruno recusados, `DIAS_PRAZO` = 2 |
| C-012 | B | custo 0 recusado; 4.100,00 e 10,25%; alerta `custo` 1 → 2; comprovante ⇒ pago; a pagar 2.600,00 |
| C-024, RN-031 | A (fim) | `ccBaseParametroSalvar` como Nara: meta 15 tira o alerta (13 → 12); dossiê parado 20 tira o da Atlas; os dois valores voltam ao padrão antes do bloco B |
| C-013 | B | `ccJurAcordoCriar` em P08: 6 parcelas, datas, honorários, `ANDAMENTO`; `kbCardMover` para `acordo` aceito; `ccJurResumo`: `ACORDOS_A_RECEBER` 0 → 1 e `VALOR_ACORDOS_A_RECEBER` 0 → 30.000 |
| RN-017, RN-018, RN-019 | B | parcelas com resto; fim de mês; honorários com 10 e 12; os quatro casos de política, com a situação gravada pela SQL igual à de `politicaDoAcordo()`; aprovação negada grava `RECUSADO` e nota; novo `ccJurAcordoCriar` no mesmo processo aceito; com um `ANDAMENTO`, recusado |
| C-014 | B | recusas por alçada e por segregação; aprovações de Gustavo e Diana; `ccEscJurAcordoInserir` chamada direto como Júlia (sessão) com 70.000, entrada 20% e 5 parcelas grava `AGUARDANDO`, `ACIMA_ALCADA` e `NIVEL_EXIGIDO = 3` (bloqueio B-1 v2: a política é da guarda, não da JS) |
| C-015 | B | 5ª parcela não quita; 6ª devolve `quitado`; `ccJurProcessoEncerrar` com `ACORDO_CUMPRIDO`; recuperado 30.000; data futura e "acordo cumprido" sem quitação recusados |
| RN-020 | B | vencida por data; P02 com 1 vencida; `A_CONFIRMAR` pela ficha recusado |
| RN-032 | B | filtro `linha`; P03 marcado Galderma → 2 |
| C-009 | B | `kbCardMover` como Júlia recusado nos três casos com a frase do gancho (Atlas ainda em `dossie`); autos inválidos; Delta em `citacao`; encerramento sem e com motivo; `KB_MOVIMENTO` com as duas passagens; Ana movendo o próprio dossiê para `peticao` recusada com "Só o Jurídico" |
| RN-009 | B | dossiê próprio da Lambda (3012) aberto como Bruno: encerrar em `dossie` com `OUTRO`; sem texto recusa; volta a `dossie` recusa; contagem de andamentos igual; `BAIXA_PERDA` devolve `aviso`; `ccJurProcessoCriar` em `citacao` sem autos recusa "número dos autos" |
| RN-030 | B | dossiê da Ana por Bruno; `ccJurDossieAbrir` da 3013 por Silvia (nível 2, outra equipe) recusado (DT-41); filial por Júlia e por Gustavo; `ccJurCargaPrevia` por Ana (recusa) e por Júlia (aceita, sem gravar); Rita com 0; visitante "sem acesso" |
| C-020 | C | `ccJurCargaPrevia` e `ccJurCargaAplicar` com `PLANILHA_TESTE` (1 por chamada): contagens, pendências 1 → 5, `ccJurCargaAplicar` com 2 processos recusado, reaplicação sem novos, concluir por Júlia e por Sérgio recusado e por Nara (Agente + `ADMIN`) aceito, prévia depois recusada |
| C-021 | C | parcelas da Pi e origem; `ccJurAcordoParcelaSituacao` tira a pendência (5 → 4); `ccJurCargaConferir` na Nu tira outra (4 → 3) e o alerta `carga` dela |
| C-023, RN-011 | C | `ccJurCargaPrevia`: `candidatos[]` com 3015 e 3016 (`motivo` `NOME`), sem vínculo; `ccJurCargaAplicar` com `clienteId` da 3016 escolhido pela busca vincula; com `clienteId` inexistente segue sem cliente; `ccBaseClienteListar` com e sem pontuação acha a 3016; `ccJurProcessoVincularCliente`; cliente inexistente |
| RN-027 (servidor) | C | sugestão "Xi Distribuidra" → 3018 com semelhança 1, sem vincular |
| RN-029 | C | chaves recalculadas; reaplicar com dado alterado não muda; processo sem card ganha card |
| orçamento | B | `execucoes()`: abrir a aba Processos ≤ 6; abrir a rota do dossiê = 2 e o card em `dossie` = 2 (`kbCardDetalheSql` + ficha), na privada e na pública; "Ver sugestões do sistema" ≤ 6; `ccJurAndamentoRegistrar` ≤ 12; `ccJurDossieAbrir` ≤ 20; uma aplicação de `ccJurCargaAplicar` ≤ 20; `ccJurDossieEnviar` ≤ 30 (exceção nomeada, 01 §10) |
| chamada direta das internas (B3) | — | `ccEscJurProcessoInserir` pela Ana (RN-030: valores derivados, sem repetir, sem caso e nível 1 nada), `ccEscJurProcessoCard` pelo Sérgio (C-009: card de outro processo, de outro quadro ou já usado), `ccEscJurAcordoParcelasInserir` pela Júlia (C-014: entrada de R$ 0,01, valor e vencimento fora da conta), `carga = 1` pela Júlia (C-014: 500.000 em 60 parcelas nasce `AGUARDANDO`; depois de um acordo, recusado), `ccEscJurNotificacaoInserir` pela Ana (C-018), `ccEscJurProcessoEnvio` (C-005), `ccEscBaseEstado` com `'0'` pela Nara (C-020: não reabre); `nasDuasSessoes` em envio, criação, carga e encerramento (DT-34) e no RN-004 com o Sérgio |
| RN-021 | tela | `tomDoPrazo(dias, vermelho, amarelo)` e o texto para 0, 3, 4, 7, 8 e −2 |
| RN-027 (leitura) | tela | `interpretar(matrizes)`: etapa pelo texto, autor do andamento, valor, data serial, fusão entre abas |
| RN-028 | tela | `situacaoPorCor(cor, legenda)` com as três cores |
| RF-019 | tela | `montarCsv(linhas)`: 16 colunas, `;`, vírgula decimal, aspas |
| espelho do gancho | tela | `motivoDeDestino()` de `mover.ts` com as 7 regras do gancho, inclusive Supervisor em `dossie → recebido` com dossiê enviado aceito e em `dossie → peticao` recusado com "Só o Jurídico" |

- **Seed extra para o smoke:** nenhum além do `dominio()`; filial 3 sem CNPJ (UF `MG`, para não somar filial ativa em DF ou GO na carga do bloco C), os acordos de C-014, o dossiê da Lambda (RN-009) e o processo manual da Zeta (RN-007) são criados dentro dos testes.

## Depende do sandbox

| # | Onde pesa na 003 | Plano B (do contrato) |
|---|---|---|
| S-01, S-14 | toda `JS-E` que chama `kb*`, `ccCobEnviarJuridico`, `ccCobEncargosCalcular`, `ccBaseModeloPrever` e `ccBaseTitulosAbertos` aninhadas | o código passa `membroId` e o `USER_ID` de quem age nas duas hipóteses (05 §1 regra 6); o gancho aceita porque o destino é controlado e o domínio já foi gravado (DT-35) |
| S-03 | as 19 `ccEsc…` ficam no perfil | guarda na SQL, já escrita |
| S-04 | "0 linha = recusa" em envio, aprovação e encerramento | reler a linha depois da escrita |
| S-05 | lotes de itens do dossiê, parcelas e andamentos da carga | uma execução por linha; a carga já manda 1 processo por vez |
| S-07 | `ccBaseTitulosAbertos` ao vivo na abertura do dossiê e nos documentos | resposta com `erroWinthor`: dossiê abre sem filial e sem lista de títulos |
| S-10 | anexo de dossiê, guia e comprovante | anexo como link (a lib aceita) |
| S-11 | envio opcional da notificação por e-mail | registro sem envio; a pessoa manda o PDF por fora |
| S-13 | contas de execução do Complexity Tracking | ajustar o ritmo da carga |

## Decisões

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-01 | Etapa é a fase do card; o domínio guarda só os fatos que as travas leem (`DOSSIE_ENVIADO_EM`, `AUTOS`, `ENCERRADO_EM`) | coluna de etapa e SF de mover próprias | DT-04 e DT-28 do contrato |
| D-02 | Abrir o dossiê cria o processo; não há "salvar rascunho" | rascunho em memória até salvar | é o fluxo de 04 §2; cada marcação já é uma escrita auditada |
| D-03 | Alertas e indicadores calculados na leitura, por uma função pura | tabela de alertas alimentada por rotina | mudar parâmetro muda o resultado na hora (C-024); o Jurídico não tem passo de rotina |
| D-04 | Catálogos (documentos, tipos de custo, motivos, desvios, indicadores) em `lib/juridico/catalogos.mjs`, injetados nas SFs | tabela de catálogo | não são editáveis (RN-031); a tela recebe os textos pelas SFs |
| D-05 | A tela interpreta a planilha; o servidor revalida, recalcula a chave e refaz o vínculo | servidor recebe as matrizes das abas | o contrato fixou a entrada em processos já interpretados (até 5 na prévia, 1 na aplicação); o arquivo não precisa sair do navegador; o que decide vínculo e gravação continua no servidor |
| D-06 | `xlsx` (SheetJS CE 0.20.3) só na tela da carga | pedir CSV ao escritório | CSV perde as 5 abas e a cor da célula, que a RN-028 lê; o pacote do npm parou na 0.18.5 |
| D-07 | PDF pela impressão do navegador sobre o `Papel` em HTML | `jspdf` | nenhuma dependência; o texto é o mesmo HTML conferido. `ponytail:` se o gestor pedir download direto com nome de arquivo, trocar por biblioteca de PDF |
| D-08 | Movimento para `acordo` e encerramento por quitação são dois toques da tela, não chamadas aninhadas | SF que faz tudo | mantém cada escrita dentro de 20 execuções (01 §10) e dentro do que 04 §3 escreve; `ponytail:` se a segunda chamada falhar, o acordo fica quitado com o processo ativo e a ação "Encerrar processo" continua disponível |
| D-09 | Uma função `semelhanca` em cada lado, com os mesmos casos de teste | pacote compartilhado entre `backend/` e `frontend/` | 15 linhas; o projeto não tem pasta comum aos dois lados |
| D-10 | Ficha de leitura fora do card para quem não tem acesso ao card | dar nível `membro` no quadro ao agente | 05 §2 fixa `restrito` para o agente (o supervisor é `membro`, DT-35, P-48); RN-030 pede a leitura |
| D-11 | Seed do domínio pelas SFs públicas, não por `INSERT` | inserir direto nas tabelas | cria card, capa e `NO_JURIDICO` pelo caminho real, sem escrever em tabela de outra dona |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| R-01 — Anexo do dossiê, guia e comprovante ficam em endereço público (P-25) | quem tiver o link abre o arquivo | 01 §12: nome com uuid, endereço só pela ficha (RNF-006), aviso na tela; trocar quando a lib tiver anexo privado |
| R-02 — removido (PJ-05 a PJ-07 aceitos) | — | — |
| R-03 — removido (PJ-08: a rotina da 002 leva a cobrança a `juridico`, 05 §3.6 linha 14) | — | — |
| R-04 — Planilha real diferente da de teste (P-39) | prévia errada | prévia obrigatória, nada grava antes de aplicar, reaplicação idempotente; conferir com o arquivo real antes de usar |
| R-05 — Cor da célula depende de `cellStyles` do SheetJS | parcelas todas "a confirmar" | vira pendência explícita (RN-028), nunca situação errada |
| R-06 — Carga longa (≈ 13 execuções por processo) | 500 processos levam perto de 1 hora | ritmo fixo de 10 por minuto, pausa e retomada; RNF-003 ajustado |
| R-07 — Falha entre a escrita do domínio e a do quadro | processo sem card ou em fase atrasada | toda SF de criação e de envio é idempotente e completa o que faltou; não há rotina para conciliar o `juridico`, então a retomada é pela própria ação |
| R-08 — Alertas e indicadores em memória | lentidão acima de ~5.000 processos | RNF-002 medido com 2.000; `ponytail:` no código com o caminho de troca |
| R-09 — Modelo da notificação nasce não validado | notificação não sai até a validação | é a regra (P-06); a tela diz o que falta e quem valida |

## Complexity Tracking

| Princípio violado | Por que é necessário | Por que a alternativa simples não serve |
|---|---|---|
| Teto de 20 execuções por clique (01 §10) — `ccJurDossieEnviar` ≈ 28, exceção nomeada do contrato (≤ 30) | 04 §2 manda o envio calcular encargos, mover e atualizar o card e chamar `ccCobEnviarJuridico` na mesma SF | dividir pela tela deixaria o Jurídico receber processo sem a cobrança ter sido movida (DT-17) |
| Regra no servidor (III) — `ccEsc…` chamável por fora pula formato e auditoria da JS | o perfil libera as internas (S-03) | alçada, segregação, completude, estado e a política do acordo (situação, `ACIMA_ALCADA` e `NIVEL_EXIGIDO` calculados na guarda de `ccEscJurAcordoInserir` com `PARAM_NUM('jur.acordo…')`) estão na SQL; limite escrito em 01 §5 |

Números do custo de referência, medidos no smoke (`execucoes()`). `ccJurDossieAbrir` (≈ 16) e `ccJurCargaAplicar` (≈ 13 por processo, 1 por chamada) cabem no teto de 20 e saíram desta tabela (PJ-03).

