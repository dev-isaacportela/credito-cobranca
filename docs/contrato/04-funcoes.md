# 04 — Server Functions

Todas as SFs do sistema, por spec dona, com o nome definitivo. Nome fora desta lista não é publicado; SF nova = pedido ao contrato.

## 0. Como ler

| Coluna | Valores |
|---|---|
| Tipo | `SQL-L` leitura SQL paginável · `JS-L` leitura composta em JS · `JS-E` escrita forma A (JS pública + `ccEsc…`, 01 §5) · `SQL-E` escrita direta forma B · `INT` SQL interna (`ccEsc…`, só chamada pela JS da dona, guarda `ATOR`) · `SIS` só rotina: sem sessão e `membroId = 0` (guarda `ROTINA`); recusa pessoa · `SIS + <quem>` = duas origens (01 §4, DT-34 regra 3): rotina como `SIS`, pessoa (sessão ou `membroId > 0`) com a guarda `<quem>` |
| Quem | `T` = qualquer membro ativo, limitado à visibilidade do cliente (01 §6) · `N2`/`N3`/`N5` = nível mínimo de `CC_MEMBRO.NIVEL` **ou** a marca `ADMIN` (`NIVEL_MIN`, 01 §5); sobre registro de um cliente, também com o cliente visível (`clienteVisivelA`, DT-41) · `JUR` = cargo Jurídico ou `ADM` · `ADM` = **administra (D-06)**: nível ≥ 3 ou a marca `ADMIN` (`PODE_ADMINISTRAR`, 01 §4) · `alçada` = nível relido da tabela de alçada (03 §7), sem a marca `ADMIN`, e **quem propôs não decide** (quem propôs = as colunas de autor da proposta na própria linha: acordo e baixa `PROPOSTO_POR`; acordo judicial `REGISTRADO_POR`; solicitação `ANALISTA_ID` e `PROPOSTA_POR`, e na `PUBLICA` também `CC_ANALISE_ORGAO.PROPOSTA_POR` da solicitação (fechamento v2); pedido `ANALISTA_ID`, `CRIADO_POR` e `RECOMENDADO_POR`; renovação `CC_CREDITO.ANALISTA_ID` — DT-40; `PROPOSTA_POR` e `RECOMENDADO_POR` são listas de **todos** os autores, não só o último, acabamento pós-v3). A alçada **não exige o cliente visível**, nas três carteiras (D-05, DT-35): quem decide na alçada não precisa ser do caso, e a leitura que a decisão faz para isso também não (`ccPubMotorCalcular`, §5) · `caso` = agente ou analista do caso, ou superior dele |
| Entrada | `nome (valor de desligado)`. Listagem (`L+T`) tem sempre `busca ('')`, `limite (20)`, `offset (0)` e a gêmea `…Total` com os mesmos filtros devolvendo `TOTAL`. Exceção: `ccBaseAuditoriaListar`/`…Total` filtram por `area`, `entidade`, `entidadeId`, `clienteId`, `membroId`, `de`, `ate`, sem `busca`. `carteira` aceita `PRIVADA`, `ESTETICA`, `PUBLICA`; onde o desligado é `''`, vale "todas as visíveis" |
| Saída | `SQL-L`: colunas em CAIXA ALTA. `JS`: `{ ok, error?, … }` (01 §1) |
| kb | SFs da lib chamadas por id, sempre **depois** da escrita do domínio (ordem: domínio → quadro) |

Toda escrita chama `auditar()`; não repito na tabela. `membroId (0)` existe em toda JS (`JS-L` ou `JS-E`) que outra SF chama aninhada, resolvido por `quem()`; SQL de leitura com `EU` nunca é chamada aninhada (01 §4, DT-34). As JS chamadas aninhadas hoje: `ccBaseTitulosAbertos`, `ccBaseModeloPrever`, `ccEmailEnviar` (001) · `ccCobEncargosCalcular`, `ccCobContatoRegistrar`, `ccCobEnviarJuridico`, `ccCobCasoSincronizar` (002) · `ccPubMotorCalcular` (005).

**Regra D-05:** as SFs `ccCob…` (002) e `ccCred…` (004) servem as três carteiras pelo parâmetro `carteira` (ou pela carteira do caso). Não existe SF `…Publica…`/`…Estetica…`. A 005 (`ccPub…`) só tem o que não existe no privado (§5). O que as SFs fazem de diferente por carteira sai de dado: fases do quadro `<processo>-<carteira>`, valor do parâmetro na carteira e motor aplicado.

Contagem (gêmeas `…Total` contadas): 001 = 50 públicas + 26 internas · 002 = 39 + 21 · 003 = 42 + 19 · 004 = 49 + 17 · 005 = 18 + 10 · 006 = 15 + 2 · 007 = 14 + 5. Total **227 públicas + 100 internas = 327** (conferido nas `definitions` de cada `add-0N0`, 17/11/2026; `ccPubWinthorNf` saiu da publicação).

Novas na revisão de 16/11/2026 (respostas aos pedidos, `pedidos/00-respostas.md`): públicas `ccBaseContatoTotal`, `ccBaseSincronizacaoListar`, `ccBaseSincronizacaoTotal`, `ccCobCasoListar`, `ccCobCasoTotal`; internas `ccEscBaseFeriadoRemover`, `ccEscBaseFeriadosInserir`, `ccEscBaseModeloValidar`, `ccBaseWinthorCliente`. Gêmeas com nome fixado: `ccHistClienteBuscarTotal`, `ccHistEventoTotal`, `ccHistFonteTotal`, `ccHistMaterialTotal`, `ccPubNfTotal`, `ccCredSolicitacaoTotal`, `ccJurCustoTotal`, `ccCredAgendaTotal` (já contada como gêmea L+T). Nova no fechamento de 16/11/2026: interna `ccEscPubNfPassoAtualizar`. Teto por clique: 20 (`ccJurDossieEnviar` 30), 01 §10.

Correções da validação v2 (16/11/2026, `pedidos/01-correcoes-v2.md`): nenhuma SF nova nem removida (contagem igual). Mudaram entrada, saída ou quem: `ccBaseTitulosAbertos`, `ccBaseModeloPrever`, `ccCobEncargosCalcular` (`membroId`); `ccCobContatoRegistrar` (`origem`, `emailEnviadoId`, `membroId`); `ccCobCasoSincronizar` (duas origens, `nota`, `membroId`, `FASE_DEVIDA`); `ccCobAcaoRegistrar` (`protesto_1`); `ccCobBaixaParecer` (sem nota no card); `ccCobAcordoCancelar`, `ccCobEnviarJuridico`, `ccCobRotina`; `ccJurDossieSugestao` (lê tabelas da 005), `ccJurResumo` (`mes` + funil), `ccJurCargaPrevia` (`candidatos[]`); `ccCredMotorCalcular`, `ccCredDecisaoRegistrar` (DT-36), `ccCredSolicitacaoSalvar`, `ccCredSolicitacaoAtribuir`, `ccCredRatingAjustar`, `ccCredPedidoSalvar` (DT-40), `ccCredPedidoTotal` (`ATRASADOS`), `ccCredAgendaListar`; `ccPubAnaliseObter` (`motor`), `ccPubMotorCalcular` (`membroId`), `ccPubResumo` (`mes` + funil), `ccPubNfDatasSalvar`, `ccPubNfPassoRegistrar` (contas); `ccPainelPosicao` (`fotoPendente`), `ccPainelSerieCredito` (`PRE_APROVADA`), `ccPainelAtencao` (só tipos próprios); `ccHistRegrasVigentes` (texto). Ganchos: §8 (DT-35).

Fechamento v2 (16/11/2026, `pedidos/01-correcoes-v2.md` §5): nenhuma SF nova nem removida. Mudaram: `ccBaseClienteFicha` (`documento`); `ccCobAgendaResumo` (`ate`, `PROXIMOS`, `A_VENCER_7DU`), `ccCobEmailFilaDecidir` (fila por item, conta 16); `ccJurDossieAbrir` (cliente sem caso: só `N2`), `ccJurResumo`, `ccJurIndicadores`, `ccJurAcordoTotal` (D-08); `ccCredDecisaoRegistrar`, `ccCredAgendaListar` (autor da análise do órgão); `ccPubAnaliseSalvar` (`ATUALIZADO_POR`), `ccPubNfFicha` (`contratacoes[]`), `ccPubMensagemPreparar` (códigos `PUB_*`), `ccPubNfDatasSalvar` (mensagem da contratação).

Acabamento pós-v3 (16/11/2026, `pedidos/01-correcoes-v2.md` §6): nenhuma SF nova nem removida, nenhuma entrada ou saída nova. Mudaram só regra e guarda: `ccCobCasoSincronizar`, `ccEscCobCasoCapa` (pessoa só na `PUBLICA` e entre fases da régua do órgão); `ccCredSolicitacaoSalvar`, `ccCredRatingAjustar`, `ccCredPedidoSalvar`, `ccCredDecisaoRegistrar`, `ccCredAgendaListar`, `ccPubAnaliseSalvar` (autores da proposta em lista; dado do motor torna proponente); `ccPubMotorCalcular` (leitura do decisor fora do caso). Contas de execução iguais.

Construção do backend (17/11/2026, `pedidos/02-pos-construcao.md` → `02-pos-construcao-respostas.md`): **removida** `ccPubWinthorNf` (a rotina lê o Oracle por `runQueryMitra`, §5); nenhuma outra SF nova nem removida. Saídas acrescidas: `ccCobProjecaoTotal` (`CLIENTES_FORTE`), `ccPainelSerieCredito` (`DECIDIDAS`), `ccPainelCredito` (`foraDoPrazo` por carteira), `ccPainelRotina` (`execucoes: 1`); entrada acrescida: `ccJurAlertas` (`tipo`). Entradas ignoradas: `cargoAlcada` das decisões da 004. Regras transversais novas: internas `ccEsc…` recalculam na SQL o valor derivado, membro normalizado nas listas de autores e número como `CAST('{{x}}' AS …)` (01 §5); D-09 (01 §4); vigência só de hoje em diante (01 §9).

---

## 1. 001-base (`ccBase…` + transversais)

### Leituras

| SF | Tipo | Quem | Entrada | Saída | Lê |
|---|---|---|---|---|---|
| `ccBaseSessao` | JS-L | todo usuário logado | — | `{ membro: { userId, membroId, nome, cargo, nivel, admin, veTudo } \| null }` (`null` = sem vínculo: a tela mostra "sem acesso") | `INT_USER`, `CC_MEMBRO` |
| `ccBaseClienteListar` L+T | SQL-L | T | `setor ('')`, `carteira ('')`, `agenteId (0; -1 = sem agente)`, `analistaId (0)`, `buId (-1)`, `uf ('')`, `tipoPessoa ('')`, `soVencidos (0)`, `situacaoFicha ('' \| EM_DIA \| VENCIDA \| NUNCA \| A_REVISAR)` (`A_REVISAR` = vencida ou nunca), `ordem ('NOME')` | `ID, CODCLI, NOME, FANTASIA, DOCUMENTO, TIPO_PESSOA, SETOR, UF, MUNICIPIO, AGENTE_ID, AGENTE_NOME, ANALISTA_NOME, VENCIDO, A_VENCER, DIAS_ATRASO, LIMITE, UTILIZADO, DISPONIVEL, SITUACAO_FICHA, CONTATOS_REVISADO_EM, BUS_SALDO` (nomes das BUs com saldo em aberto, de `CC_POSICAO_CLIENTE_BU`). `…Total`: `TOTAL, VENCIDO, A_VENCER, EM_ATRASO, MAIOR_ATRASO, SEM_AGENTE, FICHA_A_REVISAR` | `CC_CLIENTE`, `CC_POSICAO_CLIENTE`, `CC_POSICAO_CLIENTE_BU`, `CC_MEMBRO`, `CC_BU` |
| `ccBaseClienteFicha` | JS-L | T (Jurídico: cliente com `NO_JURIDICO`) | `clienteId (0)`, `codcli (0)`, `documento ('')` (CPF/CNPJ só dígitos, busca exata; fechamento v2, RF-012 da 001) | `{ cliente, posicao, porBu[], porCarteira[], contatos[], agente, analista }`. `documento` que casa com `CC_CLIENTE.DOCUMENTO` abre esse cliente (com a visibilidade de sempre). `codcli` ou `documento` que não está em `CC_CLIENTE`, para quem vê tudo (01 §6): `{ cliente: null, foraDoSistema: true, winthor: { codcli, nome, documento, uf, municipio, ramo, limite } }` lido ao vivo por `ccBaseWinthorCliente`; para os demais, "Cliente não encontrado." | idem + `CC_POSICAO_CLIENTE_CARTEIRA`, `CC_CONTATO_CLIENTE`, `CC_BU` |
| `ccBaseTitulosAbertos` | JS-L | T; aninhada por 002, 003, 005 | `clienteId`, `carteira ('')`, `soVencidos (0)`, `membroId (0)` | `linhas[]`: `CHAVE, TITULO, PARCELA, FILIAL, NUMNOTA, EMISSAO, VENCIMENTO, VENCIMENTO_EFETIVO, VALOR, SALDO, DIAS_ATRASO, BU_ID, CARTEIRA, CODCOB` — ao vivo do Winthor, com `base.cobrancasExcluidas` e `base.vencimentoDiaNaoUtil` aplicados | Winthor (`ccBaseWinthorTitulos`), `CC_BU_DEPTO` |
| `ccBaseRecebimentoListar` L+T | SQL-L | T | `clienteId (0)`, `carteira ('')`, `de ('')`, `ate ('')`, `comAtraso (0)` | colunas de `CC_RECEBIMENTO` (só `ESTORNADO = FALSE`) | `CC_RECEBIMENTO` |
| `ccBaseFaturamentoMes` | SQL-L | T | `clienteId`, `meses (12)` | `MES, BU_ID, BU_NOME, VALOR` | `CC_FATURAMENTO_MES`, `CC_BU` |
| `ccBaseContatoListar` L+T | SQL-L | T | `clienteId (0)`, `area ('')`, `situacaoFicha ('')` (valores de `ccBaseClienteListar`), `soPrincipais (0)` | colunas de `CC_CONTATO_CLIENTE` + `SITUACAO_FICHA, CODCLI, CLIENTE_NOME, AGENTE_NOME`. Com `clienteId > 0` é **lista fixa** (todos os contatos do cliente, sem paginar). `ccBaseContatoTotal`: `TOTAL, CLIENTES_COM_FICHA, FICHAS_VENCIDAS, CLIENTES_SEM_CONTATO` | `CC_CONTATO_CLIENTE`, `CC_CLIENTE`, `CC_MEMBRO` |
| `ccBaseMembroListar` L+T | SQL-L | T | `cargo ('')`, `ativo (-1)` | `ID, NOME, USER_EMAIL, CARGO, NIVEL, SUPERIOR_ID, SUPERIOR_NOME, ADMIN, ATIVO, TEM_USUARIO, CLIENTES` (clientes em que é `AGENTE_ID`), `SUBORDINADOS_ATIVOS` | `CC_MEMBRO`, `INT_USER`, `CC_CLIENTE` |
| `ccBaseEquipeConferir` | JS-L | ADM | — | `{ semUsuario[], semSuperior[], ciclos[], clientesSemAgente }` | `CC_MEMBRO`, `CC_CLIENTE` |
| `ccBaseBuListar` | SQL-L | T | `ativa (-1)` | `ID, NOME, CARTEIRA, ORDEM, ATIVA, DEPTOS` | `CC_BU`, `CC_BU_DEPTO` |
| `ccBaseBuDeptoListar` | SQL-L | ADM | `semBu (0)` | `CODEPTO, DEPTO_NOME, BU_ID, BU_NOME` | `CC_BU_DEPTO` |
| `ccBaseParametroListar` | SQL-L | todo usuário logado e chamada aninhada (não junta `EU`: parâmetro não é dado de cliente) | `grupo ('')`, `carteira ('')`, `data ('')` | `CHAVE, GRUPO, ORDEM, ROTULO, TIPO, UNIDADE, OPCOES, POR_CARTEIRA, COM_VIGENCIA, SPEC_DONA, USADO_POR, DESCRICAO, PADRAO` (do catálogo), `MINIMO, MAXIMO, VALOR_PADRAO, VALOR_CARTEIRA, VALOR_EFETIVO, VIGENCIA_INICIO` (do valor efetivo na carteira pedida), `VALIDADO` | `CC_PARAMETRO_DEF`, `CC_PARAMETRO` |
| `ccBaseParametroHistorico` | SQL-L | T | `chave`, `carteira ('')` | `CARTEIRA, VALOR, VIGENCIA_INICIO, ATUALIZADO_EM, ATUALIZADO_POR_NOME` | `CC_PARAMETRO` |
| `ccBaseFeriadoListar` | SQL-L | T | `ano (0)` | colunas de `CC_FERIADO` | `CC_FERIADO` |
| `ccBasePlanoListar` | SQL-L | T | `ativo (1)` | `CODIGO, DESCRICAO, PRAZO_MEDIO` | `CC_PLANO_PAGAMENTO` |
| `ccBaseModeloListar` | SQL-L | T | `specDona ('')`, `codigo ('')` | `CODIGO, NOME, ASSUNTO, CORPO, EFEITO_LEGAL, VERSAO, VALIDADO_VERSAO, VALIDADO_EM, VALIDADO_POR_NOME, SITUACAO_VALIDACAO, CAMPOS_EXTRAS, SPEC_DONA` | `CC_MODELO_MENSAGEM` |
| `ccBaseModeloPrever` | JS-L | T; aninhada por 003 e 005 | `codigo`, `clienteId`, `contatoId (0)`, `extras ('{}')`, `membroId (0)` | `{ assunto, corpo, para, validado, faltando[] }` — o mesmo preenchimento do envio, sem enviar | modelo, cliente, posição, `com.*` |
| `ccBaseEmailListar` L+T | SQL-L | T | `clienteId (0)`, `origem ('')`, `de ('')`, `ate ('')` | colunas de `CC_EMAIL_ENVIADO` | `CC_EMAIL_ENVIADO` |
| `ccBaseAnexoListar` | SQL-L | T | `entidade`, `entidadeId` | colunas de `CC_ANEXO` | `CC_ANEXO` |
| `ccBaseAuditoriaListar` L+T | SQL-L | ADM; com `clienteId` > 0: N2 | `area ('')`, `entidade ('')`, `entidadeId (0)`, `clienteId (0)`, `membroId (0)`, `de ('')`, `ate ('')` | colunas de `CC_AUDITORIA` | `CC_AUDITORIA` |
| `ccBaseSincronizacaoStatus` | SQL-L | T | — | última leitura (`ID, SITUACAO, INICIO, FIM, ERRO`) + passos da última leitura `OK`, uma linha por passo (`PASSO, PASSO_SITUACAO, PENDENTES, PASSO_FIM`; sem passo, uma linha com eles nulos — D-012 da 001) + `ULTIMA_OK_EM`, `MINUTOS_DESDE` (desde a última leitura `OK`), `INTERVALO_MIN` (`base.syncIntervaloMin`), `PEDIDO_PENDENTE` (0/1: há `SOLICITADA`) | `CC_SINCRONIZACAO`, `CC_ROTINA_PASSO` |
| `ccBaseSincronizacaoListar` L+T | SQL-L | ADM | `dia ('')`, `situacao ('')` | colunas de `CC_SINCRONIZACAO` + `SOLICITADA_POR_NOME`, mais recente primeiro. `…Total`: `TOTAL, COM_ERRO, CLIENTES_NOVOS` | `CC_SINCRONIZACAO`, `CC_MEMBRO` |
| `ccBaseWinthorDescobrir` | JS-L | ADM | `tabelas ('')` | colunas reais das tabelas `PC*` (S-12); grava em `CC_ESTADO['winthor.descoberta']` | Winthor (`ALL_TAB_COLUMNS`) |

### Escritas

| SF | Tipo | Quem | Entrada | Efeito | Escreve |
|---|---|---|---|---|---|
| `ccBaseClienteAtribuir` | JS-E | N2 (dentro da própria hierarquia; `ADM` em qualquer cliente) | `clienteIds` (lista, até 20), `agenteId (0 = sem agente)` | troca o agente (lote: uma `ccEscBaseClienteAgente` + uma `auditarLinhas`); a rotina reconcilia o responsável dos cards | `CC_CLIENTE.AGENTE_ID` |
| `ccBaseClienteClassificar` | JS-E | N2 | `clienteId`, `grupoEconomico ('')`, `esfera ('')` | dados locais do cliente | `CC_CLIENTE` |
| `ccBaseContatoSalvar` | JS-E | T | `contatoId (0 = novo)`, `clienteId`, `nome`, `area ('')`, `funcao ('')`, `telefone ('')`, `whatsapp ('')`, `email ('')`, `situacao ('PENDENTE')`, `obs ('')`, `principal (0)` | um `PRINCIPAL` por cliente; a lista de funções inclui "Ordenador de despesa", "Fiscal do contrato" e "Gestor do contrato"; mantém `BUSCA` | `CC_CONTATO_CLIENTE` |
| `ccBaseContatosRevisar` | JS-E | T | `clienteId` | marca a ficha como revisada hoje | `CC_CLIENTE.CONTATOS_REVISADO_EM/POR` |
| `ccBaseMembroSalvar` | JS-E | ADM | `membroId (0)` (aqui é o **membro editado**, `0` = novo — não o ator: a SF nunca é aninhada, e quem age vem da sessão; decisão de 17/11/2026 sobre O-07 da B1, o nome fica), `nome`, `userEmail ('')`, `cargo`, `superiorId (0)`, `admin (0)`, `ativo (1)` | recalcula `NIVEL` (pelo cargo) e o `CAMINHO` (pelo superior gravado) do membro e dos subordinados, na SQL; recusa ciclo; D-09 (01 §4): ninguém altera o próprio cargo, superior, marca ou situação, e cargo de nível ≥ 3 só por cargo de nível igual ou maior; marcar/desmarcar `admin` só quem tem a marca; o último membro ativo com a marca não a perde nem é inativado (01 §4); membro existente de Diretoria com `superiorId = 0` troca o topo (qualquer outro "sem superior" é recusado) | `CC_MEMBRO` |
| `ccBaseBuSalvar` | JS-E | ADM | `buId (0)`, `nome`, `carteira` (`PRIVADA`/`ESTETICA`), `ordem (0)`, `ativa (1)` | | `CC_BU` |
| `ccBaseBuDeptoSalvar` | JS-E | ADM | `codepto`, `buId (0 = Sem BU)` | vale na próxima leitura completa | `CC_BU_DEPTO` |
| `ccBaseParametroSalvar` | JS-E | ADM | `itens` (JSON: até 20 `{ chave, carteira, valor, vigenciaInicio }`; `valor` nulo numa carteira = voltar a herdar; `valor` nulo na linha padrão (`carteira ''`) = restaurar o `PADRAO` do catálogo como vigência nova) | valida tipo, faixa e os `validarConjunto` de **todos** os grupos sobre o conjunto efetivo inteiro (01 §9; a regra cruzada vale nos dois sentidos); `vigenciaInicio` anterior a hoje é recusada; chave de alçada (01 §4: `alcada.*`, `jur.envioNivelMin`, `jur.acordoAlcadaNivel`, `jur.acordoAlcadaValor`, `com.modeloValidaNivel`) só por cargo de nível ≥ 3, a marca não basta (D-09, na JS e na guarda de `ccEscBaseParametro`); **único editor de parâmetro** | `CC_PARAMETRO` |
| `ccBaseFeriadoSalvar` | JS-E | ADM | `feriadoId (0)`, `data`, `nome`, `abrangencia` (`NACIONAL`, `UF`, `MUNICIPIO`), `uf ('')`, `municipio ('')`, `remover (0)`, `gerarAno (0)` | `remover = 1` apaga (`ccEscBaseFeriadoRemover`); `gerarAno > 0` grava os nacionais daquele ano num lote (`ccEscBaseFeriadosInserir`, `INSERT IGNORE`, `ORIGEM = 'GERADO'`) e uma auditoria | `CC_FERIADO` |
| `ccBaseModeloSalvar` | JS-E | ADM | `codigo`, `assunto`, `corpo` | sobe `VERSAO` (derruba a validação) | `CC_MODELO_MENSAGEM` |
| `ccBaseModeloValidar` | JS-E | cargo Jurídico ou nível ≥ `com.modeloValidaNivel` | `codigo` | `VALIDADO_VERSAO = VERSAO` | `CC_MODELO_MENSAGEM` |
| `ccEmailEnviar` | JS-E | T; aninhada por 002, 003, 005 | 01 §13 | envia e registra | `CC_EMAIL_ENVIADO` |
| `ccBaseAnexoRegistrar` | JS-E | T (`CLIENTE`: cliente visível; `MATERIAL`: ADM; `CERTIDAO`: N2) | `entidade`, `entidadeId`, `clienteId (0)`, `tipoDoc ('')`, `nomeArquivo`, `mime`, `tamanhoBytes`, `url` | registra o endereço público | `CC_ANEXO` |
| `ccBaseAnexoRemover` | JS-E | quem registrou ou N2 | `anexoId` | marca removido | `CC_ANEXO` |
| `ccBaseSincronizacaoPedir` | JS-E | N2 | — | cria leitura `SOLICITADA` (a rotina atende na próxima rodada) | `CC_SINCRONIZACAO` |

### Rotina e ganchos

| SF | Tipo | Quem | Entrada | Efeito |
|---|---|---|---|---|
| `ccRotina` | SIS (cron `0 */5 * * * *`) | — | — | orquestra os passos (01 §11) |
| `ccBaseSincronizar` | SIS | passo `SINC` | contrato de passo (01 §11) | lê o Winthor; escreve `CC_CLIENTE`, posições, `CC_RECEBIMENTO`, `CC_FATURAMENTO_MES`, `CC_PLANO_PAGAMENTO`, `CC_BU_DEPTO` (departamentos novos), `CC_SINCRONIZACAO` |
| `ccBaseAcessosConciliar` | SIS | passo `ACESSOS` | idem | `CC_MEMBRO.USER_ID`; `KB_BOARD.ADMINS_IDS` (membros com `PODE_ADMINISTRAR`) e `ACESSO_JSON` dos 8 quadros (05 §2); usuário novo no perfil, se a S-15 confirmar |
| `ccPodeMover` | SQL (gancho da lib) | a lib | `usuarioId`, `cardId`, `boardId`, `faseId` | `PODE`, `MOTIVO` — regras em §8 |
| `ccPodeExcluir` | SQL (gancho da lib) | a lib | `usuarioId`, `cardId`, `boardId` | sempre `PODE = 0`, `MOTIVO = 'Casos não são excluídos; encerre pela etapa final.'` |

### Internas (`INT`)

`ccEscBaseAuditoria` (lote de até 20 linhas, listas alinhadas de entidade, cliente, campo, antes e depois) · `ccEscBaseEstado` (rotina em qualquer chave; pessoa só com `PODE_ADMINISTRAR` e só `winthor.descoberta` ou `jur.cargaConcluida` = `'1'`, que não reabre) · `ccEscBaseRotinaPasso` · `ccEscBaseParametro` · `ccEscBaseClienteAgente` (lote `FIND_IN_SET`) · `ccEscBaseClienteClassificar` · `ccEscBaseClienteAnalista` (chamada pela 004) · `ccEscBaseClienteJuridico` (chamada pela 003) · `ccEscBaseContatoInserir` · `ccEscBaseContatoAtualizar` · `ccEscBaseContatosRevisar` · `ccEscBaseMembroInserir` · `ccEscBaseMembroAtualizar` (sem `nivel` nem `caminhoNovo` na entrada: nível pelo cargo e caminho pelo superior, na SQL; `…Atualizar` recebe o `caminhoAntigo`, conferido contra o gravado; o novo membro nasce com `CAMINHO` vazio e ganha o caminho na segunda escrita) · `ccEscBaseBuSalvar` · `ccEscBaseBuDepto` · `ccEscBaseFeriado` · `ccEscBaseFeriadoRemover` · `ccEscBaseFeriadosInserir` (lote ≤ 20, `INSERT IGNORE`) · `ccEscBaseModelo` · `ccEscBaseModeloValidar` · `ccEscBaseEmailInserir` · `ccEscBaseAnexoInserir` · `ccEscBaseAnexoRemover` · `ccEscBaseSincronizacaoPedir`. Leitura Oracle: `ccBaseWinthorTitulos` (SQL com `jdbcId`, chamada só por `ccBaseTitulosAbertos`) · `ccBaseWinthorCliente` (busca exata por `codcli` ou `documento` — CPF/CNPJ só dígitos —, chamada só por `ccBaseClienteFicha`).

---

## 2. 002-cobranca (`ccCob…`) — as três carteiras

Caso = `CC_COBRANCA` (um aberto por cliente × carteira); card no quadro `cobranca-<carteira>`.

### Leituras

| SF | Tipo | Quem | Entrada | Saída | Lê |
|---|---|---|---|---|---|
| `ccCobQuadroResumo` | SQL-L | T | `carteira`, `agenteId (0)`, `buId (-1)` | por fase: `FASE_CHAVE, CASOS, VENCIDO, A_VENCER` (totais das colunas; os cards são da lib) | `CC_COBRANCA`, `CC_FASE`, `KB_CARD`, `CC_POSICAO_CLIENTE_CARTEIRA` |
| `ccCobCasoFicha` | JS-L | T; cargo Jurídico também (só leitura) quando o caso tem baixa `PENDENTE` | `cobrancaId (0)`, `cardId (0)` | `{ caso, cliente, posicao, porBu[], acoes[] (da fase), promessas[], acordo, parcelas[], baixa, bloqueio, contatos[] (5), fila[], pode: { … } }` (chaves de `pode` fixadas no plan da 002) | tabelas da 002, posição, `CC_CONTATO_CLIENTE` |
| `ccCobCasoListar` L+T | SQL-L | T | `carteira ('')`, `agenteId (0)`, `buId (-1)`, `filtro ('' \| ATRASADO \| SEM_CONTATO \| PROMESSA \| ACORDO)` | casos abertos: `COBRANCA_ID, CARD_ID, CLIENTE_ID, CODCLI, CLIENTE_NOME, CARTEIRA, FASE_CHAVE, FASE_NOME, VENCIDO, DIAS_ATRASO, ULT_CONTATO, PROMESSA_DATA, PROMESSA_VALOR, PROMESSA_SITUACAO, ACORDO_SITUACAO, PARCELAS_PAGAS, N_PARCELAS, PROX_ACAO, PROX_ACAO_DATA` | `CC_COBRANCA`, `CC_FASE`, `KB_CARD`, `KB_FASE`, posição por carteira, `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `CC_ACORDO`, `CC_ACORDO_PARCELA` |
| `ccCobSituacao` | SQL-L | T; Jurídico | `clienteId`, `carteira ('')` | `COBRANCA_ID, CARTEIRA, CARD_ID, FASE_CHAVE, FASE_NOME, VENCIDO, DIAS_ATRASO, PROTESTADO, JURIDICO_EM, PROCESSO_ID, BLOQUEIO_DEVIDO, BLOQUEIO_APLICADO` | `CC_COBRANCA`, `CC_FASE`, `KB_CARD`, posição |
| `ccCobEncargosCalcular` | JS-L | T; aninhada por 003 e 005 | `clienteId`, `carteira`, `data ('' = hoje)`, `titulos ('' = todos os vencidos)`, `membroId (0)` | `{ linhas[]: TITULO, PARCELA, VENCIMENTO, SALDO, DIAS, MULTA, JUROS, CORRECAO, TOTAL; principal, multa, juros, correcao, total }` — título a título, `enc.*` da carteira em vigor na data | `ccBaseTitulosAbertos`, `enc.*` |
| `ccCobContatoListar` L+T | SQL-L | T | `clienteId (0)`, `cobrancaId (0)`, `nfId (0)`, `agenteId (0)`, `carteira ('')`, `retorno ('')`, `promessa ('' \| ABERTA \| QUEBRADA)`, `de ('')`, `ate ('')` | colunas de `CC_CONTATO_COBRANCA` + `AGENTE_NOME`, `CLIENTE_NOME`, `PROMESSA_SITUACAO`. `…Total`: `TOTAL, PROMESSAS_ABERTAS, PROMESSAS_QUEBRADAS, SEM_RETORNO` | `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `CC_COBRANCA` |
| `ccCobAgendaListar` L+T | SQL-L | T (`membroId` = eu ou subordinado); cargo Jurídico: só `BAIXA_PARECER` | `carteira ('')`, `membroId (0 = eu)`, `ate ('' = hoje)` | `TIPO` (`ACAO_REGUA`, `PROX_ACAO`, `PROMESSA`, `PARCELA_ACORDO`, `ANUENCIA`, `EMAIL_APROVAR`, `ACORDO_DECIDIR`, `BAIXA_PARECER`, `BAIXA_DECIDIR`, `BLOQUEIO_APLICAR`, `FICHA_REVISAR` — caso aberto com `SITUACAO_FICHA` vencida ou nunca revisada, data = hoje), `CLIENTE_ID, CLIENTE_NOME, CARTEIRA, COBRANCA_ID, CARD_ID, DATA, ATRASADO, TEXTO, VALOR`. A data do `ACAO_REGUA` é o prazo da ação (definição de `CC_ACAO_REGUA.NO_PRAZO`) | tabelas da 002, `CC_CLIENTE` |
| `ccCobAgendaResumo` | SQL-L | T | `carteira ('')`, `buId (-1)`, `ate ('' = hoje)` (a tela manda o 7º dia útil, como em `ccCobAgendaListar`) | por agente: `AGENTE_ID, AGENTE_NOME, PARA_HOJE, ATRASADAS, PROMESSAS_VENCIDAS, SEM_CONTATO, PROXIMOS` (eventos da agenda com data depois de hoje e até `ate`), `A_VENCER_7DU` (Σ `A_VENCER_7DU` da posição por carteira, ou por BU com `buId ≥ 0`, dos clientes do agente) (resumo pedido pela 006; as duas últimas pela DT-33, fechamento v2) | idem, posição |
| `ccCobBloqueioListar` L+T | SQL-L | T | `carteira ('')`, `situacao ('PENDENTE' \| BLOQUEAR_PEDIDOS \| BLOQUEAR_TOTAL \| LIBERAR \| BLOQUEADOS)` — `PENDENTE` = devido ≠ aplicado; `BLOQUEAR_*` = pendente com devido `PEDIDOS`/`TOTAL`; `LIBERAR` = pendente com devido `''`; `BLOQUEADOS` = aplicado ≠ `''` e igual ao devido | `COBRANCA_ID, CLIENTE_*, DEVIDO, APLICADO, DIAS_ATRASO, VENCIDO` | `CC_COBRANCA`, posição |
| `ccCobProjecaoListar` L+T | SQL-L | T | `carteira ('')`, `agenteId (0)`, `buId (-1)`, `dias (30)` | `CLIENTE_*, A_VENCER, PROX_VENC, PROX_VENC_VALOR, PROB_ATRASO, VALOR_ESPERADO, FAIXA` (`cob.prob*`). `…Total`: `TOTAL, A_VENCER, VALOR_ESPERADO, CLIENTES_FORTE` (chance de atraso ≥ `cob.probForte`) | posição, `CC_RECEBIMENTO` |
| `ccCobEmailFilaListar` L+T | SQL-L | T | `carteira ('')`, `situacao ('PENDENTE' \| ENVIAR \| APROVAR \| SEM_EMAIL \| ENVIADO)` — `PENDENTE` = todas as pendentes; `ENVIAR` = modo `MANUAL` com e-mail; `APROVAR` = modo `APROVAR` com e-mail; `SEM_EMAIL` = pendente sem destinatário; `ENVIADO` = enviadas hoje (modo lido de `cob.emailModo.*` na hora) | colunas de `CC_EMAIL_FILA` + cliente, fase, modelo, `MODO`, `VALIDADO`, `PARA` | `CC_EMAIL_FILA`, `CC_CONTATO_CLIENTE`, modelos |
| `ccCobPainelKpis` | SQL-L | T | `carteira ('')`, `buId (-1)`, `agenteId (0)`, `de`, `ate` | vencido, a vencer, inadimplência %, recuperado, promessas cumpridas %, conversão de contatos %, ações no prazo %, contatos do período por retorno, baixas pendentes por alçada e sem parecer (colunas fixadas no plan da 002) | tabelas da 002, posição, recebimentos |
| `ccCobPainelAgentes` | SQL-L | T | idem | uma linha por agente, com `SUPERVISOR_ID`, `SUPERVISOR_NOME` | idem |
| `ccCobPainelBu` | SQL-L | T | idem | uma linha por BU | `CC_POSICAO_CLIENTE_BU` |
| `ccCobPainelAging` | SQL-L | T | `carteira ('')`, `buId (-1)`, `agenteId (0)` | faixas com saldo e PDD (`pdd.*`) | posição por BU |
| `ccCobPainelTopDevedores` | SQL-L | T | idem + `limite (10)` | maiores vencidos | posição |

### Escritas

| SF | Tipo | Quem | Entrada | Efeito | Escreve | kb |
|---|---|---|---|---|---|---|
| `ccCobAcaoRegistrar` | JS-E | caso | `cobrancaId`, `itens` (números dos itens de checklist da fase atual a marcar; `''` = só os que definem "ação feita") | marca os campos no card; se os itens que definem a ação ficaram todos `Sim`, grava a ação da fase (no prazo ou não); `protesto_1 = Sim` marca `PROTESTADO` (pelo botão aqui; marcado direto no card, pela rotina, 05 §3.6 linha 12) | `CC_ACAO_REGUA`, `CC_COBRANCA` | `kbCardAtualizar` |
| `ccCobContatoRegistrar` | JS-E | caso; aninhada por `ccPubNfPassoRegistrar` | `clienteId`, `carteira`, `cobrancaId (0)`, `nfId (0)`, `data ('' = hoje; recusa data futura)`, `canal`, `falouCom ('')`, `retorno`, `previsao ('')`, `valor (0)`, `feedback ('')`, `proxAcao ('')`, `proxAcaoData ('')`, `origem ('MANUAL')`, `emailEnviadoId (0)`, `membroId (0)` | contato; com `previsao` cria promessa (até `cob.promessaMaxUteis` dias úteis contados de `data`; `0` = sem limite). `feedback` obrigatório sempre. `origem` aceita `MANUAL` e `REGUA_PUB` (`EMAIL_REGUA` e `FORA` só as SFs da 002 gravam); `REGUA_PUB` aceita `retorno = ''` (a 005 manda em `feedback` o texto do passo) e grava `EMAIL_ENVIADO_ID` | `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `CC_COBRANCA` | `kbNotaRegistrar`, `kbCardAtualizar` (capa, inclusive `ultimo_contato`) |
| `ccCobProxAcaoDefinir` | JS-E | caso | `cobrancaId`, `proxAcao`, `proxAcaoData` | próxima ação da agenda | `CC_COBRANCA` | `kbCardAtualizar` |
| `ccCobEmailEnviar` | JS-E | caso | `cobrancaId`, `contatoId (0)`, `dataLimite ('')` | e-mail da fase atual (modo `MANUAL`); marca o item ✉ e o campo de capa `acao_fase` quando o e-mail é a ação; marca `ENVIADO` a linha `PENDENTE` da fila do caso × fase, se houver | `CC_ACAO_REGUA`, `CC_EMAIL_FILA` | `ccEmailEnviar`, `kbCardAtualizar` |
| `ccCobEmailFilaDecidir` | JS-E | nível ≥ `alcada.emailAprovaNivel` | `filaIds` (**até 2** por chamada: 1 + 2 × (`ccEmailEnviar` 4 + contato 1 + ação 1 + fila 1, que grava `ENVIADO` e o `EMAIL_ENVIADO_ID` do item) + auditoria 1 = 16; descartar = 1 escrita de fila para o lote; a tela divide e encadeia), `aprovar (1)`, `obs ('')` | aprova e envia, ou descarta (`FORA`); por item enviado, contato `EMAIL_REGUA` e `CC_ACAO_REGUA`; o item ✉ do card é marcado pela rotina (05 §3.6 linha 13) | `CC_EMAIL_FILA`, `CC_CONTATO_COBRANCA`, `CC_ACAO_REGUA` | `ccEmailEnviar` |
| `ccCobBloqueioAplicar` | JS-E | caso | `cobrancaId`, `aplicado` (`''`, `PEDIDOS`, `TOTAL`) | registra o que foi feito no ERP | `CC_COBRANCA` | `kbCardAtualizar` (etiqueta) |
| `ccCobAcordoPropor` | JS-E | caso | `cobrancaId`, `debito` (só conferência: a SF relê o vencido da carteira, recusa se diferir — "O saldo mudou; atualize a tela." — e grava o relido), `valor`, `entrada`, `entradaData`, `nParcelas`, `primeiroVenc`, `intervaloDias`, `garantia ('')` | calcula nível exigido e motivo; leva o card a `negociacao` se estiver na régua. Recusa em quadro sem fase `negociacao` | `CC_ACORDO`, `CC_ACORDO_PARCELA` | `kbCardMover`, `kbNotaRegistrar` |
| `ccCobAcordoDecidir` | JS-E | alçada (acordo) | `acordoId`, `aprovar`, `parecer ('')` | aprovado → `ATIVO`, card em `acordo`; recusado → `RECUSADO`, card continua em `negociacao` | `CC_ACORDO` | `kbCardMover`, `kbNotaRegistrar` |
| `ccCobAcordoParcelaPagar` | JS-E | caso | `parcelaId`, `pagoEm` | última parcela → acordo `QUITADO` (o caso fecha quando o Winthor mostrar saldo zero) | `CC_ACORDO_PARCELA`, `CC_ACORDO` | `kbCardAtualizar` (progresso) |
| `ccCobAcordoCancelar` | JS-E | N2 (cliente visível, DT-41) | `acordoId`, `motivo` | `CANCELADO`; a rotina devolve o card à fase da régua (de `negociacao` ou de `acordo`, 05 §3.6 linha 5) | `CC_ACORDO` | `kbNotaRegistrar` |
| `ccCobBaixaPropor` | JS-E | caso | `cobrancaId`, `valor`, `motivo` (um dos 5), `docRegua`, `docParecer`, `docProtesto`, `docAcordo` (0/1), `obs` | calcula o nível pela tabela de baixa sobre o **valor desta baixa** (baixa fracionada: cada uma na própria alçada; uma `PENDENTE` por caso; P-49) | `CC_BAIXA` | `kbNotaRegistrar`, `kbCardAtualizar` (etiqueta) |
| `ccCobBaixaParecer` | JS-E | cargo Jurídico (sem a visibilidade do cliente: basta a baixa estar `PENDENTE`) | `baixaId`, `resultado` (`FAVORAVEL`/`DESFAVORAVEL`), `texto` | parecer obrigatório antes da decisão. Sem efeito no card: o Jurídico é leitor dos quadros de cobrança (DT-34 regra 4); o parecer aparece na ficha do caso e no histórico (`CC_BAIXA`) | `CC_BAIXA` | — |
| `ccCobBaixaDecidir` | JS-E | alçada (baixa) | `baixaId`, `aprovar`, `texto` | aprovada → soma em `CC_COBRANCA.VALOR_BAIXADO`; encerra o caso (`BAIXADO`, card em `baixado`, bloqueio mantido) só quando `VALOR_BAIXADO` ≥ vencido da carteira; senão o caso segue na fase. NF pública do cliente fica `BAIXADA` pela 005 na rodada seguinte | `CC_BAIXA`, `CC_COBRANCA` | `kbCardMover` (se encerra), `kbNotaRegistrar` |
| `ccCobAnuenciaRegistrar` | JS-E | caso | `cobrancaId`, `enviarEmail (1)`, `contatoId (0)` | carta de anuência (`COB_ANUENCIA`) | `CC_COBRANCA` | `ccEmailEnviar`, `kbCardAtualizar` |
| `ccCobEnviarJuridico` | JS-E | só aninhada por `ccJurDossieEnviar` (sessão ou `membroId` com nível ≥ `jur.envioNivelMin`) | `clienteId`, `carteira`, `processoId`, `membroId (0)` | a guarda exige `CC_PROCESSO` `processoId` do mesmo cliente e carteira com `DOSSIE_ENVIADO_EM` preenchido (gravado antes por `ccJurDossieEnviar`): chamada direta não pula o dossiê. **Idempotente**: grava envio, ação da fase `juridico` (`CC_ACAO_REGUA`; o item `juridico_1` do card é marcado pela rotina), `NO_JURIDICO`; move o card para `juridico`. Cliente sem caso aberto na carteira → `{ ok: true, semCaso: true }`, grava só `NO_JURIDICO` | `CC_COBRANCA`, `CC_ACAO_REGUA`, `CC_CLIENTE` (via 001) | `kbCardMover`, `kbNotaRegistrar` |
| `ccCobCasoSincronizar` | SIS + caso (duas origens, DT-34) | rotina: `ccCobRotina` (em processo) e `ccPubRotina`; pessoa: `ccPubNfDatasSalvar` (agente do órgão ou superior) | `clienteId`, `carteira`, `faseChave` (`''` = não mexer na fase), `titulo`, `prazo ('')`, `capaJson ('{}')`, `responsavelUserId (0)`, `proxAcao ('')`, `proxAcaoData ('')`, `desfecho ('')`, `nota ('')` (texto da nota quando move; `''` = sem nota), `membroId (0)` | **Rotina** (sem sessão, `membroId = 0`): abre o caso e o card se não existe (nunca para `desfecho` preenchido); move se a fase mudou; **pessoa** (sessão ou `membroId > 0`, guarda `caso`): só na carteira `PUBLICA` (outra carteira → "Só o sistema muda a etapa desta carteira.") e só caso aberto — move, capa e próxima ação; move só com o card atual **e** a `faseChave` em fase da régua do `cobranca-publica` (fase comum que não é `juridico`: a etapa do órgão, E-1; senão "A etapa do órgão só anda entre as fases da régua.", sem escrita); na chave `etiquetas` do `capaJson`, só `Acima de 2 meses` e `Pequeno valor`; caso ausente ou `desfecho` → `{ ok: true, pendente: true }` sem escrita (fica para a rotina); `movidoPor` = quem age. A guarda de `ccEscCobCasoCapa` repete na SQL a carteira e as fases para a pessoa (acabamento pós-v3; a de `ccEscCobCasoProxAcao` é `ROTINA` ou `caso` nas três carteiras, §2 Internas): a chamada direta não leva o card a `acordo`, `juridico` ou fase final, nem com `SIM_SESSAO_ANINHADA=0`, quando o gancho nem é consultado. Antes de mover grava `CC_COBRANCA.FASE_DEVIDA` = `faseChave` (`ccEscCobCasoCapa`), que o gancho usa para aceitar o movimento entre fases da régua (DT-35); `capaJson = '{}'` não mexe na capa; senão grava a capa e guarda em `CAPA_ENVIADA` o texto recebido, sem reformatar (quem chama compara antes, com as chaves em ordem alfabética). A chave `etiquetas` de `capaJson` traz só as etiquetas que **quem chama** controla (005: `Acima de 2 meses`, `Pequeno valor`); as demais do card são preservadas. `desfecho` preenchido encerra (card em `regularizado`, `pago_no_prazo` ou `baixado`). Audita (`Cobrança`) criação do caso, etapa, próxima ação e encerramento. Conta da pessoa movendo: ≤ **14** execuções, com a auditoria | `CC_COBRANCA` | `kbCardCriar`, `kbCardMover`, `kbCardAtualizar` |
| `ccCobRotina` | SIS | passo `REGUA` | contrato de passo | régua das carteiras `PRIVADA` e `ESTETICA` (05 §3.6); na `PUBLICA`, só promessas (linha 8), itens de ação registrada e responsável (linha 13) e processo ativo (linha 14) — DT-37 | `CC_COBRANCA`, `CC_ACAO_REGUA`, `CC_PROMESSA`, `CC_ACORDO`, `CC_EMAIL_FILA` | `kbCardCriar`, `kbCardMover`, `kbCardAtualizar`, `kbNotaRegistrar` — a regra de `ccCobCasoSincronizar` aplicada em processo (D-001 da 002), sem chamar a SF; grava por `runDmlMitra` e audita abertura, etapa, encerramento, ação, protesto, processo no Jurídico, promessa e acordo quebrado |

Movimento manual do card (arrastar) é da lib, validado por `ccPodeMover` (§8): não há `ccCobMover`.

### Internas (`INT`)

`ccEscCobCasoInserir` · `ccEscCobCasoCard` · `ccEscCobCasoCapa` (grava `CAPA_ENVIADA` e `FASE_DEVIDA`, cada uma só quando informada; guarda `ROTINA` ou `ATOR` com cliente visível, carteira `PUBLICA` e, com `FASE_DEVIDA`, destino e fase atual do card na régua do `cobranca-publica`) · `ccEscCobCasoProxAcao` (guarda `ROTINA` ou `ATOR` `caso` — não Jurídico, cliente visível —, nas três carteiras: serve `ccCobCasoSincronizar`, `ccCobProxAcaoDefinir`, `ccCobContatoRegistrar` e o acordo) · `ccEscCobCasoEncerrar` · `ccEscCobCasoJuridico` · `ccEscCobCasoBloqueio` · `ccEscCobCasoAnuencia` · `ccEscCobCasoProtesto` · `ccEscCobAcaoInserir` · `ccEscCobContatoInserir` · `ccEscCobPromessaInserir` · `ccEscCobAcordoInserir` · `ccEscCobAcordoParcelasInserir` (lote ≤ 20) · `ccEscCobAcordoSituacao` · `ccEscCobAcordoParcelaPagar` · `ccEscCobBaixaInserir` · `ccEscCobBaixaParecer` · `ccEscCobBaixaDecidir` · `ccEscCobFilaInserir` (sem chamador hoje: a rotina grava a fila por `runDmlMitra`; fica publicada como plano B da S-09, se `runDmlMitra` no passo aninhado do cron falhar — decisão de 17/11/2026 sobre O-09 da B2) · `ccEscCobFilaSituacao`. Promessa cumprida/quebrada e acordo quebrado são gravados pela rotina (`runDmlMitra`). Valor derivado (débito do acordo, nível exigido, `VALOR_BAIXADO` = soma das baixas aprovadas) é relido na SQL (01 §5).

### Cobrança → Jurídico (fluxo único, pendência P-07 = dossiê primeiro)

| # | Quem | Chamada | O que acontece |
|---|---|---|---|
| 1 | agente ou supervisor, no card da cobrança (ação extra "Montar dossiê", visível da fase `extrajudicial` em diante ou com nível ≥ `jur.envioNivelMin`) | `ccJurDossieAbrir({ clienteId, carteira })` | cria `CC_PROCESSO` (`DOSSIE_ABERTO_EM/POR`, `COBRANCA_ID`), os itens de `CC_DOSSIE_ITEM` da carteira já com sugestão, e o card em `juridico` fase `dossie`; nota no card da cobrança. Já existe dossiê aberto → devolve o mesmo. Cliente **sem caso aberto** na carteira (fechamento v2): aceito só pelo ramo `N2` (o ramo `caso` exige o caso); `COBRANCA_ID` nulo e sem nota; o envio depois cai no `semCaso` de `ccCobEnviarJuridico` |
| 2 | quem monta | `ccJurDossieItemMarcar` | itens `OK` / `NA` (não se aplica) com observação e anexos do card |
| 3 | nível ≥ `jur.envioNivelMin` | `ccJurDossieEnviar({ processoId })` | confere obrigatórios (menos `alcada`, que é este passo), grava `DOSSIE_ENVIADO_EM/POR`, valor atualizado por `ccCobEncargosCalcular`, prazo = hoje + `jur.prazoInicialDu` dias úteis; move `dossie → recebido` |
| 4 | a própria `ccJurDossieEnviar` | `ccCobEnviarJuridico({ clienteId, carteira, processoId, membroId })` | cobrança vai para a fase `juridico`; cliente fica visível ao Jurídico |
| — | qualquer pessoa arrastando o card da cobrança para `juridico` | gancho | recusado: "Envie o dossiê pelo quadro Jurídico." |
| — | processo que nasce fora do dossiê (`ccJurProcessoCriar`, carga, vínculo posterior) | `ccCobRotina` (05 §3.6 linha 14) | na rodada seguinte o caso aberto da carteira do processo vai para `juridico` com `JURIDICO_EM` e `PROCESSO_ID`; a 003 não chama `ccCobEnviarJuridico` nesses casos |

Vale igual para a carteira `PUBLICA`: os itens do dossiê é que mudam (05 §8) e as sugestões de NF, empenho, protocolo, contrato e certidões são lidas por `ccJurDossieSugestao` direto das tabelas da 005 (DT-34 regra 2b).

---

## 3. 003-juridico (`ccJur…`)

Quem enxerga processo: Jurídico, Gerente, Diretoria e administrador veem todos; os demais, os dos clientes visíveis.

### Leituras

| SF | Tipo | Quem | Entrada | Saída | Lê |
|---|---|---|---|---|---|
| `ccJurProcessoListar` L+T | SQL-L | T | `faseChave ('')`, `carteira ('')`, `filial ('')`, `buId (-1)`, `linha ('')`, `grupo ('' \| ANDAMENTO \| AJUIZAR \| ENCERRADO)`, `situacao ('' \| ATIVO \| ENCERRADO)`, `responsavelId (0)`, `semAndamentoDias (0)`, `valorDe (0)`, `valorAte (0)` | `ID, CARD_ID, CLIENTE_ID, CODCLI, NOME_DEVEDOR, DOCUMENTO, SETOR, CARTEIRA, BU_ID, BU_NOME, LINHA, FILIAL, TRIBUNAL, STATUS, SUBSTABELECER, FASE_CHAVE, FASE_NOME, AUTOS, VALOR, VALOR_ATUALIZADO, PRAZO, PRAZO_DESCRICAO, DIAS_PRAZO, ULTIMO_ANDAMENTO_EM, DIAS_SEM_ANDAMENTO, CUSTO_TOTAL, RESPONSAVEL_NOME, MOTIVO_ENCERRAMENTO, ENCERRADO_EM, DOSSIE_OK, DOSSIE_TOTAL, ACORDO_VALOR, PARCELAS_PAGAS, PARCELAS_TOTAL, ACORDO_A_RECEBER, ALERTA_CARGA`. `…Total`: `TOTAL`, `VALOR` e, por grupo, `TOTAL_<GRUPO>`/`VALOR_<GRUPO>` | `CC_PROCESSO`, `CC_FASE`, `KB_CARD`, `CC_PROCESSO_CUSTO`, `CC_DOSSIE_ITEM`, `CC_ACORDO_JUDICIAL`, `…_PARCELA`, `CC_CLIENTE`, `CC_BU` |
| `ccJurProcessoFicha` | JS-L | T | `processoId (0)`, `cardId (0)` | `{ processo, cliente, itens[] (dossiê), andamentos[] (10), custos[], custoResumo, acordo, parcelas[], notificacao, pode: { … } }` | tabelas da 003, `CC_CLIENTE` |
| `ccJurDossieSugestao` | JS-L | T | `processoId` | por item: `{ item, sugestao, origem }` — demonstrativo (`ccCobEncargosCalcular`, aninhada com `membroId`), histórico de cobrança, protesto, notificação, e na carteira `PUBLICA` NF, empenho, protocolo e atesto (`CC_NF_PUBLICA` sem canceladas, `CC_NF_ACAO`), contrato (`CC_ANALISE_ORGAO` mais recente do cliente) e certidões (`CC_CERTIDAO` vigentes na emissão das NFs), lidos com `runQueryMitra` depois de conferir o acesso ao processo pelo membro de `quem()` (DT-34; nenhuma SF SQL da 005 aninhada). Tabela da 005 ausente = sugestão vazia | 002 por SF; tabelas de 002 e 005 |
| `ccJurAndamentoListar` L+T | SQL-L | T | `processoId` | colunas de `CC_PROCESSO_ANDAMENTO` | `CC_PROCESSO_ANDAMENTO` |
| `ccJurCustoListar` L+T | SQL-L | T | `processoId (0)`, `pago (-1)`, `carteira ('')`, `filial ('')`, `semComprovante (0)` | colunas de `CC_PROCESSO_CUSTO` (sem removidos) + processo | `CC_PROCESSO_CUSTO` |
| `ccJurCustoResumo` | SQL-L | T | `processoId (0)` | `TOTAL, PAGO, A_PAGAR, A_PAGAR_ANTIGO, PCT_DO_VALOR` | idem, `jur.custo*` |
| `ccJurAcordoListar` L+T | SQL-L | T | `processoId (0)`, `situacao ('')`, `carteira ('')`, `filial ('')` | colunas de `CC_ACORDO_JUDICIAL` + `PARCELAS_PAGAS`, `PROXIMA_PARCELA`. `…Total`: `TOTAL`, `VALOR_A_RECEBER` (abertas dos `ANDAMENTO`), `AGUARDANDO`, `VALOR_AGUARDANDO` (D-08) | `CC_ACORDO_JUDICIAL`, `…_PARCELA` |
| `ccJurAcordoParcelaListar` | SQL-L | T | `acordoId` | colunas de `CC_ACORDO_JUDICIAL_PARCELA` + `VENCIDA` (derivada) | idem |
| `ccJurAlertas` | JS-L | JUR | `carteira ('')`, `filial ('')`, `linha ('')`, `buId (-1)`, `tipo ('')` (filtra pelo tipo do desvio; `''` = todos) | `linhas[]`: `{ tipo, processoId, texto, gravidade }` — os 13 desvios da spec | tabelas da 003, `jur.*` |
| `ccJurIndicadores` | JS-L | JUR | `de`, `ate`, `carteira ('')`, `filial ('')`, `linha ('')`, `buId (-1)` | os 24 indicadores `{ chave, valor, faixa }` com a faixa pelos `jur.ind*` (07 acordos a receber e 08 com parcela vencida contam só acordo `ANDAMENTO`, D-08); `acordosAguardando { quantidade, valor }` = acordos `AGUARDANDO` aprovação, indicador à parte, fora dos 24 e do a receber (D-08); na mesma passada: `porEtapa[]`, `cortes { filial[], carteiraLinha[], tribunal[], faixa[], ano[] }`, `maiores[10]`, `resumo`, `custos { numeros, porMesGrupo[12], porGrupo[], porTipo[], porFilial[], porBu[], porEtapa[], maiores[10], custoRecuperado[], porProcesso[] }` (a aba Custos não tem SF própria) | idem |
| `ccJurResumo` | SQL-L | T | `carteira ('')`, `buId (-1)`, `mes ('' = corrente)` | `ATIVOS, EM_DOSSIE, VALOR_EM_CAUSA, PRAZOS_VENCENDO, SEM_ANDAMENTO, CUSTO_TOTAL, CUSTO_A_PAGAR, RECUPERADO` + para o funil escolhido no painel (DT-33, O-3 da validação v2): `AJUIZAR, VALOR_AJUIZAR` (grupo `AJUIZAR` de `ccJurProcessoListar`), `VALOR_ATIVOS`, `ACORDOS_A_RECEBER, VALOR_ACORDOS_A_RECEBER` (acordo `ANDAMENTO` com parcela em aberto; `AGUARDANDO` aprovação nunca soma no a receber, D-08), `ACORDOS_PARCELA_VENCIDA, VALOR_PARCELA_VENCIDA` (os mesmos `ANDAMENTO`), `RECUPERADO_MES, RECUPERADO_ANO, CUSTO_MES` (do `mes`; processo que já veio encerrado da carga — `ORIGEM = 'CARGA' AND ENCERRADO_EM = CRIADO_EM`, sem data real — não entra no recuperado do mês nem do ano, RN-015; a 006 lê por esta SF), `DESVIOS_PRAZO, DESVIOS_CRITICOS` (desvios de prazo e de andamento pela mesma regra e gravidade de `ccJurAlertas`; a 003 fixa a expressão no plan). Resumo pedido pela 006; `buId` filtra clientes com saldo na BU; a tela chama direto (DT-34) | `CC_PROCESSO`, custos, acordos |
| `ccJurNotificacaoPreparar` | JS-L | T | `clienteId`, `carteira`, `filial ('')`, `prazoDias (0 = jur.notifPrazoDias)` | `{ texto, demonstrativo, filial, modeloVersao, validado }` (modelo `JUR_NOTIF_EXTRAJUDICIAL`) | `ccCobEncargosCalcular`, `CC_FILIAL_CREDORA`, modelo |
| `ccJurNotificacaoUltima` | SQL-L | T | `clienteId` | última linha de `CC_NOTIFICACAO_EXTRAJUDICIAL` | idem |
| `ccJurDemonstrativoPreparar` | JS-L | T | `processoId (0)`, `clienteId (0)`, `carteira ('')`, `data ('')` | cabeçalho + linhas de `ccCobEncargosCalcular` para o PDF | 002 por SF |
| `ccJurFilialCredoraListar` | SQL-L | T | `ativa (-1)` | colunas de `CC_FILIAL_CREDORA` | idem |
| `ccJurCargaPendenciaListar` L+T | SQL-L | JUR | `tipo ('' \| SEM_CLIENTE \| SUGESTAO \| ALERTA \| PARCELA)` | processos da carga com `ALERTA_CARGA` ou sem cliente, e parcelas `A_CONFIRMAR` (uma linha cada): `TIPO, ID, PARCELA_ID, NOME_DEVEDOR, DOCUMENTO, ALERTA_CARGA, SUGESTAO_CLIENTES` | `CC_PROCESSO`, `CC_ACORDO_JUDICIAL_PARCELA` |
| `ccJurCargaPrevia` | JS-L | JUR | `linhas` (JSON, até 5 processos) | por linha: `{ chave, acao (NOVO/ATUALIZA/IGNORA), alertas[], candidatos[]: { clienteId, codcli, nome, motivo } }` (vazio = sem sugestão; a tela escolhe um, outro por busca, ou nenhum; `ccJurCargaAplicar` aceita qualquer `clienteId` existente) | `CC_PROCESSO`, `CC_CLIENTE` |

### Escritas

| SF | Tipo | Quem | Entrada | Efeito | Escreve | kb |
|---|---|---|---|---|---|---|
| `ccJurDossieAbrir` | JS-E | caso (cobrança) ou N2 (cliente sem caso aberto: só N2) | `clienteId`, `carteira` | §2 "Cobrança → Jurídico" passo 1 | `CC_PROCESSO`, `CC_DOSSIE_ITEM` | `kbCardCriar`, `kbNotaRegistrar` |
| `ccJurDossieItemMarcar` | JS-E | quem abriu, caso ou JUR | `itemId`, `situacao` (`PENDENTE`, `OK`, `NA`), `obs ('')`, `kbAnexoIds ('')` | `NA` exige `obs` | `CC_DOSSIE_ITEM` | — |
| `ccJurDossieEnviar` | JS-E | nível ≥ `jur.envioNivelMin` | `processoId`, `obs ('')` | passo 3 e 4. Responsável do processo no envio: o `RESPONSAVEL_ID` já gravado ou, se vazio, o primeiro membro `JURIDICO` ativo (`MIN(ID)`, padrão provisório, P-50). **Única exceção ao teto de 20 por clique (até 30, 01 §10)** | `CC_PROCESSO`, `CC_DOSSIE_ITEM` (`alcada`), `CC_PROCESSO_ANDAMENTO` | `kbCardMover`, `kbCardAtualizar` (prazo, capa), `ccCobEnviarJuridico` |
| `ccJurProcessoCriar` | JS-E | JUR | `clienteId (0)`, `carteira`, `nomeDevedor`, `documento`, `filial`, `linha ('')`, `valor`, `autos ('')`, `tribunal ('')`, `responsavelId (0)`, `prazo ('')`, `prazoDescricao ('')`, `faseChave ('recebido')`, `obs ('')` | processo sem dossiê (legado ou avulso); com `clienteId > 0` marca `NO_JURIDICO` (`ccEscBaseClienteJuridico`); a cobrança vai a `juridico` pela rotina da 002 | `CC_PROCESSO`, `CC_CLIENTE` (via 001) | `kbCardCriar` |
| `ccJurProcessoSalvar` | JS-E | JUR | `processoId`, `autos`, `tribunal`, `filial ('')`, `linha ('')`, `responsavelId (0)`, `status`, `prazo ('')`, `prazoDescricao ('')`, `substabelecer (0)`, `formaCitacao ('')`, `resultadoSentenca ('')`, `recuperadoInformado (0)`, `valor`, `obs` | dados do processo (`''` em `filial`/`linha` = manter) | `CC_PROCESSO` | `kbCardAtualizar` (capa, prazo, etiqueta `Substabelecer`) |
| `ccJurProcessoEncerrar` | JS-E | JUR | `processoId`, `motivo` (`QUITADO`, `ACORDO_CUMPRIDO`, `BAIXA_PERDA`, `EXTINTO`, `OUTRO`), `motivoTexto ('')` | encerra; card em `encerrado`; tira `NO_JURIDICO` se era o último ativo do cliente. `ACORDO_CUMPRIDO` exige acordo `QUITADO`; `OUTRO` exige texto; `BAIXA_PERDA` sem baixa aprovada aceita com aviso (P-43) | `CC_PROCESSO`, `CC_CLIENTE` (via 001) | `kbCardMover`, `kbNotaRegistrar` |
| `ccJurProcessoVincularCliente` | JS-E | JUR | `processoId`, `clienteId` | liga processo da carga ao cliente | `CC_PROCESSO`, `CC_CLIENTE` (via 001) | `kbCardAtualizar` |
| `ccJurAndamentoRegistrar` | JS-E | JUR | `processoId`, `em`, `texto`, `prazo ('')`, `prazoDescricao ('')` | andamento + novo prazo | `CC_PROCESSO_ANDAMENTO`, `CC_PROCESSO` | `kbNotaRegistrar`, `kbCardAtualizar` |
| `ccJurCustoLancar` | JS-E | JUR | `processoId`, `tipo`, `data`, `valor`, `obs ('')`, `pago (0)`, `guiaKbAnexoId (0)`, `comprovanteKbAnexoId (0)` | | `CC_PROCESSO_CUSTO` | — |
| `ccJurCustoSalvar` | JS-E | JUR | `custoId` + os mesmos campos | | idem | — |
| `ccJurCustoRemover` | JS-E | JUR | `custoId`, `motivo` | remoção lógica | idem | — |
| `ccJurAcordoCriar` | JS-E | JUR | `processoId`, `valor`, `entrada`, `nParcelas`, `primeiroVencimento` (até hoje + 31 dias), `honorarios` | calcula `ACIMA_ALCADA` e `NIVEL_EXIGIDO`; dentro da alçada já nasce `ANDAMENTO`, fora nasce `AGUARDANDO`; recusa se o processo já tem acordo `AGUARDANDO` ou `ANDAMENTO`. Levar o card para `acordo` é o passo seguinte da tela (`ctx.mover()` da lib, 01 §10) | `CC_ACORDO_JUDICIAL`, `…_PARCELA` | `kbNotaRegistrar` |
| `ccJurAcordoAprovar` | JS-E | nível ≥ `jur.acordoAlcadaNivel`, ≠ quem registrou | `acordoId`, `aprovar`, `texto ('')` | `aprovar = 1` → `ANDAMENTO`; `aprovar = 0` → `RECUSADO` (o processo pode registrar outro acordo) | `CC_ACORDO_JUDICIAL` | `kbNotaRegistrar` |
| `ccJurAcordoParcelaSituacao` | JS-E | JUR | `parcelaId`, `situacao` (`ABERTA`, `PAGA`), `pagoEm ('')` | `PAGA` só com o acordo em `ANDAMENTO` (acordo `AGUARDANDO` não recebe parcela); `A_CONFIRMAR` (carga) vira o valor informado; última em aberto paga → acordo `QUITADO` e resposta `quitado: true` — a tela chama em seguida `ccJurProcessoEncerrar` com `ACORDO_CUMPRIDO` | `…_PARCELA`, `CC_ACORDO_JUDICIAL` | `kbCardAtualizar` (capa `acordo`) |
| `ccJurAcordoHonorariosPagar` | JS-E | JUR | `acordoId`, `pagoEm` | | `CC_ACORDO_JUDICIAL` | — |
| `ccJurNotificacaoRegistrar` | JS-E | caso (cobrança) | `clienteId`, `carteira`, `cobrancaId (0)`, `processoId (0)`, `filial`, `prazoDias (0)`, `enviarEmail (0)`, `contatoId (0)` | grava os valores do demonstrativo; recusa carteira `PUBLICA` (órgão não recebe notificação extrajudicial) | `CC_NOTIFICACAO_EXTRAJUDICIAL` | `ccEmailEnviar` (`JUR_NOTIF_EXTRAJUDICIAL`), `kbNotaRegistrar` |
| `ccJurFilialCredoraSalvar` | JS-E | ADM | `codigo` (= `CODFILIAL` do Winthor), `razaoSocial`, `cnpj`, `endereco`, `cidadeUf`, `uf`, `banco`, `representante`, `representanteCargo`, `ativa (1)` | | `CC_FILIAL_CREDORA` | — |
| `ccJurCargaAplicar` | JS-E | JUR | `linhas` (JSON, **1 processo por chamada**, com até 20 andamentos e 20 custos; ≈ 13 execuções) | cria ou atualiza pelo `CHAVE_CARGA`; recusa depois de concluída; com cliente casado marca `NO_JURIDICO`. Acordo da carga nasce `ANDAMENTO`, sem aprovação, só se for o primeiro do processo e não passar do valor do processo; senão segue a política (`jur.acordo*`). A tela manda um processo por vez, em sequência, com progresso (≈ 10 por minuto) | tabelas da 003, `CC_CLIENTE` (via 001) | `kbCardCriar` |
| `ccJurCargaConferir` | JS-E | JUR | `processoId` | `CARGA_CONFERIDA_EM/POR` | `CC_PROCESSO` | — |
| `ccJurCargaConcluir` | JS-E | ADM | — | `CC_ESTADO['jur.cargaConcluida'] = 1` | `CC_ESTADO` (via 001) | — |

### Internas (`INT`)

`ccEscJurProcessoInserir` (sem `cobrancaId`: na origem `COBRANCA` caso, setor, valor e status saem da SQL) · `ccEscJurProcessoCard` (só card do quadro `juridico` com o título do processo e ainda sem processo) · `ccEscJurProcessoAtualizar` · `ccEscJurProcessoEnvio` (sem `valor`: relido da posição) · `ccEscJurProcessoEncerrar` · `ccEscJurProcessoCliente` · `ccEscJurProcessoCarga` · `ccEscJurDossieItensInserir` (lote) · `ccEscJurDossieItemMarcar` · `ccEscJurAndamentosInserir` (lote ≤ 20) · `ccEscJurCustosInserir` (lote ≤ 20) · `ccEscJurCustoAtualizar` · `ccEscJurCustoRemover` · `ccEscJurAcordoInserir` · `ccEscJurAcordoParcelasInserir` (lote) · `ccEscJurAcordoSituacao` · `ccEscJurAcordoParcela` · `ccEscJurNotificacaoInserir` (sem `emitidaEm`/`modeloVersao`: hoje e a versão do modelo validado em dia, relidos na SQL) · `ccEscJurFilialSalvar`.

---

## 4. 004-concessao-credito (`ccCred…`) — as três carteiras

Solicitação = `CC_SOLICITACAO`; card no quadro `concessao-<carteira>`. As fases têm a **mesma chave** nos três quadros quando têm o mesmo papel (`entrada`, `comite`, `gestao`, `reanalise`, `obsoleto`, `recusada`, `encerrada`); o código só usa a chave, e o que cada quadro tem a mais ou a menos é dado (05 §4). Regras gerais lidas do quadro: a decisão acontece na fase `comite`; aprovada, o card vai para a próxima fase comum do quadro; o crédito (`CC_CREDITO`) nasce quando o card entra em `gestao`.

### Leituras

| SF | Tipo | Quem | Entrada | Saída | Lê |
|---|---|---|---|---|---|
| `ccCredSolicitacaoListar` L+T | SQL-L | T | `carteira`, `faseChave ('')`, `analistaId (0)`, `situacao ('' \| ABERTA \| DECIDIDA \| ENCERRADA)`, `tipoPessoa ('')`, `de ('')`, `ate ('')` | `ID, CARD_ID, CLIENTE_*, CARTEIRA, FASE_CHAVE, FASE_NOME, FASE_DESDE, VALOR, TIPO_CLIENTE, ANALISTA_NOME, PRAZO_DECISAO, ATRASADA, DECISAO_RESULTADO, DECIDIDA_EM, RATING`. `…Total`: `TOTAL, VALOR, APROVADAS, RECUSADAS, ATRASADAS` (taxa de aprovação da Esteira para quem não é N2). Aberta = `ENCERRADA_EM` nulo e sem `CC_CREDITO` nascido dela | `CC_SOLICITACAO`, `CC_FASE`, `KB_CARD` |
| `ccCredEsteiraResumo` | SQL-L | T | `carteira` | por fase: `FASE_CHAVE, QTD, VALOR, NO_PRAZO, ATRASADAS` | idem, `KB_FASE` |
| `ccCredSolicitacaoFicha` | JS-L | T | `solicitacaoId (0)`, `cardId (0)` | `{ solicitacao, cliente, posicao, faturamento[], consultasValidas, motor, ratingEfetivo, alcada: { nivel, rotulo, valor }, decisoes[], credito, pendencias[], analiseOrgaoId, pode: { … } }` | tabelas da 004, posição, `alcada.*` |
| `ccCredSolicitacaoHistorico` | SQL-L (lista fixa) | T | `clienteId` | solicitações e decisões anteriores: `SOLICITACAO_ID, CARTEIRA, CRIADO_EM, VALOR, RESULTADO, LIMITE_APROVADO, RATING, RATING_PUB, RESPONSAVEL_NOME, EM` | `CC_SOLICITACAO`, `CC_DECISAO` |
| `ccCredTipoClienteSugerir` | SQL-L | T | `clienteId` | `TIPO_CLIENTE, CARTEIRA_SUGERIDA, ULTIMA_COMPRA, COMPRAS_QTD, TEM_CREDITO_VIGENTE` | `CC_CLIENTE`, posição, `CC_CREDITO` |
| `ccCredMotorCalcular` | JS-L (grava com `gravar = 1`) | caso; simulação pura: T | `solicitacaoId (0)`, `gravar (0)`, `entradas ('{}')` — JSON que sobrepõe os valores lidos (`carteira`, `tipoCliente`, `scoreSerasa`, `pontualidade`, `diasAtraso`, `compraMedia`, `prazoMedio`, `fatMensal`, `pl`, `garantia`, `valor`, `alertas`, `carteiraLimites`, `exposicaoGrupo`); `solicitacaoId = 0` + `entradas` = simulação sem solicitação; com `entradas` não vazio **nunca grava** | `{ rating, limiteSugerido, resultado, score, alertas[], detalhes, podeAprovar, motivoNaoAprovar }`. **Motor aplicado é o da carteira:** `PRIVADA`/`ESTETICA` = motor da 004 (`limite.*`, `score.*`, `farol.*`); `PUBLICA` = chama `ccPubMotorCalcular` e devolve no mesmo formato (`rating` = P1–P4, `limiteSugerido` = exposição). Motor do órgão não publicado (id 0) → `{ ok: false, error: 'O motor do órgão não está instalado.' }`. Na `PUBLICA`, `gravar = 1` passa a `ccPubMotorCalcular`, que grava a fotografia em `CC_ANALISE_ORGAO`; a 004 não grava `RATING_MOTOR`/`MOTOR_*` do órgão (DT-36) | `CC_SOLICITACAO`, posição, `CC_RECEBIMENTO`; escreve `CC_SOLICITACAO` (motor, carteiras com motor da 004) |
| `ccCredCreditoListar` L+T | SQL-L | T | `carteira ('')`, `situacao ('')`, `analistaId (0)`, `vencendoEmDias (0)`, `vencidos (0)`, `divergeWinthor (0)` | `ID, CLIENTE_*, CARTEIRA, LIMITE, UTILIZADO, PLANO_DESCR, FORMA, RATING_CONCESSAO, RATING_ATUAL, RATING_PUB, INICIO_VALIDADE, FIM_VALIDADE, SITUACAO, SITUACAO_EM, MOTIVO_ENCAMINHAMENTO, DESTINO, CARD_ID, ANALISTA_NOME, LIMITE_WINTHOR, DISPONIVEL, VENCIDO, A_VENCER, CRITICIDADE, COMPRAS_QTD, ULTIMA_COMPRA, LIMITE_DIVERGE, PEDIDOS_RETIDOS` | `CC_CREDITO`, `CC_RISCO_CLIENTE`, `CC_ANALISE_ORGAO`, posição, `CC_PEDIDO_RETIDO`, `CC_MEMBRO` |
| `ccCredCreditoResumo` | SQL-L | T | `carteira ('')` | `VIGENTES, LIMITE_TOTAL, UTILIZADO_TOTAL, VENCENDO_30D, VENCIDOS, EM_REANALISE, OBSOLETOS` | idem |
| `ccCredRevisaoListar` L+T | SQL-L | T | `carteira ('')`, `gatilho ('' \| ATRASO \| USO \| NEGATIVACAO \| VALIDADE)` | créditos com `REVISAO_GATILHOS` não vazio: colunas de `ccCredCreditoListar` + `REVISAO_GATILHOS` | `CC_RISCO_CLIENTE`, `CC_CREDITO` |
| `ccCredPedidoListar` L+T | SQL-L | T | `faseChave ('')`, `analistaId (0)`, `situacao ('')` | colunas de `CC_PEDIDO_RETIDO` + cliente, fase, `FASE_DESDE`. `…Total`: `TOTAL, ATRASADOS` (fora do SLA da fase) | `CC_PEDIDO_RETIDO`, `CC_FASE`, `KB_CARD` |
| `ccCredPedidoFicha` | JS-L | T | `pedidoId (0)`, `cardId (0)` | `{ pedido, cliente, posicao, credito, risco, alcada, decisao, pode }` | tabelas da 004 |
| `ccCredPendenciaListar` L+T | SQL-L | T | `tipo ('')`, `situacao ('PENDENTE')` | colunas de `CC_PENDENCIA_WINTHOR` + cliente | `CC_PENDENCIA_WINTHOR` |
| `ccCredAgendaListar` L+T | SQL-L | T (`membroId` = eu ou alguém abaixo de mim, `membroVisivel` sobre `EU`; toda linha também com `clienteVisivel`; `DECISAO_ALCADA` pelo nível, sem a marca, e fora de quem propôs — `ANALISTA_ID`, `PROPOSTA_POR` e, na `PUBLICA`, `CC_ANALISE_ORGAO.PROPOSTA_POR`) | `membroId (0 = eu)` | `TIPO` (`SOLICITACAO_PRAZO` — só com `PRAZO_DECISAO` ≤ hoje —, `AJUSTE_DECIDIR`, `DECISAO_ALCADA`, `PENDENCIA_WINTHOR`, `REANALISE`, `PEDIDO`), `CLIENTE_*, CARD_ID, DATA, ATRASADO, TEXTO`. `ccCredAgendaTotal`: `TOTAL` ("Ver todos (N)" da faixa "Aguardando você" da Esteira) | tabelas da 004 |
| `ccCredFarolCarteira` | SQL-L | T | `carteira ('')` | por rating atual: `RATING, CLIENTES, LIMITE, UTILIZADO, VENCIDO, REBAIXADOS` | `CC_RISCO_CLIENTE`, posição |
| `ccCredFarolClienteListar` L+T | SQL-L | T | `carteira ('')`, `rating ('')`, `rebaixado (-1)` | cliente + colunas de `CC_RISCO_CLIENTE` + `LIMITE, VENCIDO` | idem |
| `ccCredFarolValidacao` | JS-L | N2 | `carteira ('')` | por faixa: inadimplência observada × `farol.<faixa>Inad`, meses de base (`cred.calibMinMeses`); sem foto, sem leitura; com menos de `cred.calibMinMeses` meses, leitura com aviso | `CC_CALIBRACAO` |
| `ccCredCalibracaoRevisaoListar` | SQL-L (lista fixa) | N2 | — | colunas de `CC_CALIBRACAO_REVISAO` + `PROXIMA` (`cred.calibRevisaoMeses`) | idem |
| `ccCredSaudeResumo` | SQL-L | T | `carteira ('')`, `agrupar ('' \| ANALISTA \| RATING)` | `GRUPO, GRUPO_NOME` (vazios com `agrupar = ''`, uma linha) + `SAUDAVEL, ATENCAO, RISCO, INDICE` (`saude.*`); `RATING` = rating na concessão | `CC_RISCO_CLIENTE`, `CC_CREDITO` |
| `ccCredSaudeListar` L+T | SQL-L | T | `carteira ('')`, `saude ('')` | cliente, `SAUDE`, `SAUDE_SINAIS`, saldos + `ANALISTA_NOME, RATING_CONCESSAO, APROVADO_POR_NOME, DIAS_ATRASO, VENCIDO, LIMITE, UTILIZADO` | idem, `CC_DECISAO` |
| `ccCredRiscoResumo` | SQL-L | T | `carteira ('')`, `agrupar ('' \| ANALISTA \| RATING)` | universo = rating na concessão **ou** rating atual em `cred.riscoCorteRating` ou pior: `GRUPO, GRUPO_NOME, CLASSE` (`NAO_PREVISTO` = concedido melhor que o corte e hoje no corte ou pior; `ACEITO` = já concedido no corte ou pior), `CLIENTES, LIMITE, UTILIZADO, VENCIDO` | idem |
| `ccCredRiscoListar` L+T | SQL-L | T | `carteira ('')`, `classe ('' \| NAO_PREVISTO \| ACEITO)` | clientes do universo acima + `CLASSE` | idem |
| `ccCredCriticidadeListar` L+T | SQL-L | T | `carteira ('')`, `criticidade ('')` | cliente, `CRITICIDADE`, `CRIT_MOTIVOS`, saldos + `DIAS_ATRASO, PONTUALIDADE_PCT, SCORE_SERASA, LIMITE, UTILIZADO, PRAZO_MEDIO_DIAS, RATING_ATUAL, REBAIXADO, ALERTAS, FASE_NOME` | idem, posição, `CC_SOLICITACAO`, `CC_FASE`, `KB_FASE` |
| `ccCredFlexResumo` | SQL-L | T | `de`, `ate` | mostradores de flexibilização: `PEDIDOS, FLEXIBILIZADOS, TAXA_PCT, DENTRO_REGRA_PCT` × `flex.metaTaxaPct`, `flex.metaConfPct` | `CC_PEDIDO_RETIDO` |
| `ccCredDesempenho` | JS-L | N2 | `carteira ('')`, `de`, `ate` | tempo médio de decisão, % no prazo, taxa de aprovação × `meta.*`; por analista e por fase (tempo em `KB_MOVIMENTO`) | `CC_SOLICITACAO`, `CC_DECISAO`, `KB_MOVIMENTO` |

### Escritas

| SF | Tipo | Quem | Entrada | Efeito | Escreve | kb |
|---|---|---|---|---|---|---|
| `ccCredSolicitacaoCriar` | JS-E | T | `clienteId`, `carteira`, `tipoCliente`, `valor`, `prazoMeses`, `justificativa`, `rca ('')`, `analistaId (0)` | recusa cliente fora da carteira (`PUBLICA` ⇔ setor público) e solicitação aberta repetida; grava `PRAZO_DECISAO`; card na fase `entrada` | `CC_SOLICITACAO`, `CC_CLIENTE.ANALISTA_ID` (via 001) | `kbCardCriar` |
| `ccCredSolicitacaoSalvar` | JS-E | caso | `solicitacaoId` + campos de `CC_SOLICITACAO` (dados, consultas, financeiro, fonte pagadora, alertas, limite proposto, parecer) | só enquanto não decidida; quem grava limite proposto, parecer, a fotografia do motor ou um campo que entra no motor (score, faturamento, financeiro, garantia, alertas, consultas, abertura do CNPJ, fonte pagadora, valor, tipo de cliente) entra em `PROPOSTA_POR` (DT-40; o campo do motor pela própria SQL de `ccEscCredSolicitacaoDados`, mesmo sem mudar o resultado do motor: acabamento pós-v3) | `CC_SOLICITACAO` | `kbCardAtualizar` (capa) |
| `ccCredSolicitacaoAtribuir` | JS-E | N2 | `solicitacaoId`, `analistaId` — só com o card antes de `comite` (depois, "A solicitação já está na alçada.") | | `CC_SOLICITACAO`, `CC_CLIENTE` (via 001) | `kbCardAtualizar` (responsável) |
| `ccCredSolicitacaoRecusar` | JS-E | caso (antes da fase `comite`) | `solicitacaoId`, `motivo` | encerra (`ENCERRADA_EM`, `MOTIVO_RECUSA`; **não** grava `DECIDIDA_EM` nem `DECISAO_RESULTADO`: não é decisão de alçada e não conta como decidida na 006); card em `recusada`. Na fase `comite` a recusa é decisão | `CC_SOLICITACAO` | `kbCardMover`, `kbNotaRegistrar` |
| `ccCredRatingAjustar` | JS-E | caso | `solicitacaoId`, `rating`, `justificativa` | ajuste `PENDENTE` (só carteiras com motor da 004); grava `PROPOSTA_POR` | `CC_SOLICITACAO` | `kbNotaRegistrar` |
| `ccCredRatingAjusteDecidir` | JS-E | superior hierárquico de quem ajustou | `solicitacaoId`, `aprovar`, `texto ('')` | | `CC_SOLICITACAO` | `kbNotaRegistrar` |
| `ccCredDecisaoRegistrar` | JS-E | alçada (concessão; exceção ao motor → Comitê de crédito) | `solicitacaoId`, `resultado` (`APROVADA`, `PRE_APROVADA`, `RECUSADA`), `limiteAprovado (0)`, `planoCod ('')`, `forma ('')`, `parecer`, `cargoAlcada ('')` (aceito e **ignorado**: o rótulo gravado é o relido da tabela de alçada na SQL; idem nas decisões de renovação e de pedido), `justificativaExcecao ('')` | só na fase `comite`. Valor da alçada = maior entre `LIMITE_PROPOSTO` e `limiteAprovado` (sem proposta, `VALOR`), gravado em `CC_DECISAO.VALOR_ALCADA`. **Fotografia do motor (DT-36):** carteiras com motor da 004 = `CC_SOLICITACAO.RATING_MOTOR`/`MOTOR_LIMITE`; `PUBLICA` = `CC_ANALISE_ORGAO.RATING_PUB`/`EXPOSICAO` da solicitação, gravada pela 005 em toda `ccPubAnaliseSalvar` e no "Calcular" (`ccPubMotorCalcular` com `gravar = 1`). Na `PUBLICA` a JS chama `ccPubMotorCalcular` direto (sem gravar, com `membroId`) para `podeAprovar` e para conferir com a fotografia (diferente → "O motor mudou desde o último cálculo. Recalcule no bloco do órgão."); a exceção ao motor é só `limiteAprovado > EXPOSICAO` (os demais termos de exceção valem só com `temMotorProprio`); a faixa é a de `alcada.conc*` na carteira `PUBLICA` (E-6). `ccEscCredDecisaoInserir` copia na própria SQL `RATING_PUB` e `LIMITE_MOTOR` (= `EXPOSICAO`) da análise, e `ccEscCredCreditoInserir` grava `ANALISE_ORGAO_ID` (com `RATING_CONCESSAO` vazio); nada disso vem de parâmetro. Segregação na `PUBLICA` (fechamento v2): quem já gravou a análise do órgão (`CC_ANALISE_ORGAO.PROPOSTA_POR`, lista) não decide — a JS recusa com "Quem propôs não decide esta solicitação." e `ccEscCredDecisaoInserir` repete na guarda, sobre a mesma linha da análise que já lê; para `APROVADA` a mesma guarda repete o `podeAprovar` (contrato ativo: `BASE = 'CONTRATO'`, saldo > 0, vigência ≥ `HOJE_SQL`). Custo da Pública inalterado (17–18); plano B da S-13: se o custo medido das `kb*` levar a decisão pública acima de 20, a nota sai do clique (a decisão fica na ficha e no histórico), sem exceção nova ao teto. `APROVADA` (só se o motor da carteira devolver `podeAprovar`) → próxima fase comum e pendência `APLICAR_LIMITE`; se a próxima é `gestao`, cria o crédito (substitui e encerra o anterior; o card do crédito substituído vai para `encerrada` na conciliação do passo `CREDITO`, 05 §4.5 linha 5). `PRE_APROVADA` (só `PUBLICA`; grava `DECIDIDA_EM` na primeira decisão, a aprovação posterior não o altera) → fica em `comite` aguardando contrato; aprovar depois acima do pré-aprovado exige nova decisão. `RECUSADA` → `recusada`. Capa e etiquetas do próprio card no clique (≤ 20, 01 §10) | `CC_DECISAO`, `CC_SOLICITACAO`, `CC_CREDITO`, `CC_PENDENCIA_WINTHOR` | `kbCardMover`, `kbCardAtualizar`, `kbNotaRegistrar` |
| `ccCredPendenciaAplicar` | JS-E | caso | `pendenciaId`, `obs ('')` | marca aplicada no ERP. `APLICAR_LIMITE` de solicitação: recusada com o card antes de `liberacao` nos quadros que têm essa fase; em `liberacao` → cria o crédito e leva o card a `gestao` | `CC_PENDENCIA_WINTHOR`, `CC_CREDITO` | `kbCardMover`, `kbCardAtualizar` |
| `ccCredReanaliseAbrir` | JS-E | N2 | `creditoId`, `motivo` | antecipa a reanálise (a rotina abre sozinha no vencimento) | `CC_CREDITO` | `kbCardMover`, `kbNotaRegistrar` |
| `ccCredReanaliseConcluir` | JS-E | alçada (concessão, pelo limite vigente) | `creditoId`, `resultado` (`RENOVADA`, `OBSOLETO`), `parecer` | `RENOVADA` → novo período em `CC_CREDITO` com o mesmo limite, card volta a `gestao`; `OBSOLETO` → card em `obsoleto` + pendência `BLOQUEAR_LIMITE`. Capa e etiquetas do próprio card no clique (≤ 20, 01 §10) | `CC_DECISAO`, `CC_CREDITO`, `CC_PENDENCIA_WINTHOR` | `kbCardMover`, `kbCardAtualizar`, `kbNotaRegistrar` |
| `ccCredPedidoCriar` | JS-E | T | `clienteId`, `numeroPedido`, `valor`, `rca ('')`, `justificativa ('')` | fotografa limite, utilizado e atraso; calcula excesso e alçada; card em `retido` | `CC_PEDIDO_RETIDO` | `kbCardCriar` |
| `ccCredPedidoSalvar` | JS-E | caso | `pedidoId`, `recomendacao` (grava `RECOMENDADO_POR`), `analistaId (0)` — troca de analista só antes de `alcada` | | `CC_PEDIDO_RETIDO` | `kbCardAtualizar` |
| `ccCredPedidoDecidir` | JS-E | alçada (pedido) | `pedidoId`, `resultado` (`LIBERADO`, `RECUSADO`), `condicao ('')`, `planoCod ('')`, `forma ('')`, `parecer`, `motivo ('')` — `condicao`, `planoCod` e `forma` obrigatórios em `LIBERADO` | card em `liberado`/`recusado`; `LIBERADO` gera pendência `LIBERAR_PEDIDO` | `CC_DECISAO`, `CC_PEDIDO_RETIDO`, `CC_PENDENCIA_WINTHOR` | `kbCardMover`, `kbNotaRegistrar` |
| `ccCredCalibracaoRevisar` | JS-E | ADM | `parecer` | registra a revisão trimestral com a leitura do dia | `CC_CALIBRACAO_REVISAO` | — |
| `ccCredRotina` | SIS | passo `CREDITO` | contrato de passo | risco, criticidade, saúde, flexibilização e gatilhos (só carteiras com motor da 004; relê a cada rodada o universo — crédito vigente e solicitação aberta — e grava só o que mudou); encaminhamento no vencimento ou sem compra (as três); foto de calibração; conciliação quadro × domínio | `CC_RISCO_CLIENTE`, `CC_CALIBRACAO`, `CC_CREDITO`, `CC_PENDENCIA_WINTHOR` | `kbCardMover`, `kbCardAtualizar`, `kbNotaRegistrar` |

Itens de checklist e confirmações são campos do card (lib); mover entre fases comuns é da lib com `ccPodeMover` (§8). Não há `ccCredMover` nem `ccCredChecklistMarcar`.

### Internas (`INT`)

`ccEscCredSolicitacaoInserir` · `ccEscCredSolicitacaoCard` · `ccEscCredSolicitacaoDados` · `ccEscCredSolicitacaoAnalise` · `ccEscCredSolicitacaoAnalista` · `ccEscCredSolicitacaoMotor` · `ccEscCredSolicitacaoAjuste` · `ccEscCredSolicitacaoDecisao` · `ccEscCredSolicitacaoEncerrar` · `ccEscCredDecisaoInserir` · `ccEscCredCreditoInserir` · `ccEscCredCreditoSituacao` · `ccEscCredPedidoInserir` · `ccEscCredPedidoAtualizar` · `ccEscCredPendenciaInserir` · `ccEscCredPendenciaAplicar` · `ccEscCredCalibracaoRevisaoInserir`. Calculam na SQL (01 §5): `ccEscCredPedidoInserir` (crédito, limite, utilizado, atraso, excesso e alçada), `ccEscCredCreditoInserir` (validade: hoje + `cred.validadeMeses`), `ccEscCredPendenciaInserir` (cliente, valor e texto, da origem), `ccEscCredDecisaoInserir` (rótulo e nível da alçada, rating e limite do motor). O crédito só nasce com o card em `liberacao` (ou em `comite` no quadro sem `liberacao`), por quem decide ou pelo caso; aplicar a pendência é do caso da origem.

---

## 5. 005-setor-publico (`ccPub…`) — só o que não existe no privado

NF pública (etapas, prazos, datas), motor do órgão, regras por ente, comunicação com o órgão e certidões. Cobrança do órgão = SFs `ccCob…` com `carteira = 'PUBLICA'`; concessão ao órgão = SFs `ccCred…` com `carteira = 'PUBLICA'` (§10).

| SF | Tipo | Quem | Entrada | Saída / efeito | Lê / escreve | kb |
|---|---|---|---|---|---|---|
| `ccPubAnaliseObter` | JS-L | T | `solicitacaoId` | `{ analise, regra, sugestoes: { atrasoMedio, esfera }, historico: { pagas, noPrazo, liquidacaoMedia, pagamentoMedio, atrasoMedio }, motor }` (sugestão e histórico de pagamento pelas NFs do órgão; `motor` = a saída de `ccPubMotorCalcular` calculada na mesma execução, sem gravar, `null` sem análise — o bloco do card abre com 1 leitura, DT-42) | `CC_ANALISE_ORGAO`, `CC_NF_PUBLICA`, `CC_REGRA_PAGAMENTO_ENTE` | — |
| `ccPubAnaliseSalvar` | JS-E | caso | `solicitacaoId` + campos de `CC_ANALISE_ORGAO` | cria na primeira gravação; só enquanto a solicitação não foi decidida (contrato, saldo e vigência continuam editáveis depois). Grava `ATUALIZADO_POR` = quem salva e acrescenta quem salva a `PROPOSTA_POR` (lista, na mesma instrução): os autores da proposta na `PUBLICA`, que não decidem a solicitação (DT-40, fechamento v2, acabamento pós-v3); o "Calcular" (`ccPubMotorCalcular` com `gravar = 1`) regrava a fotografia e acrescenta quem calcula a `PROPOSTA_POR` (sem mexer em `ATUALIZADO_POR`): quem recalcula não decide (DT-40, correção da B3) | `CC_ANALISE_ORGAO` | — |
| `ccPubMotorCalcular` | JS-L (grava com `gravar = 1`) | caso; com `gravar = 0` e o card da solicitação em `comite`, também quem tem nível ≥ `alcada.nivelSupervisor` (a menor alçada de concessão, sem a marca `ADMIN`), sem exigir o cliente visível: é a leitura de quem decide na alçada fora do caso (04 §0; acabamento pós-v3, mesmo comportamento da Privada). Aninhada por `ccCredMotorCalcular` e `ccCredDecisaoRegistrar` | `solicitacaoId`, `gravar (0)`, `membroId (0)` | `{ nota, pontos: { capag, pessoal, cauc, fonte, historico, atraso, operacao }, ratingPub, exposicao, decisaoSugerida, faltando[], podeAprovar, motivoNaoAprovar, travas: { capagD, pessoalAcima, fimMandato, atrasoTeto } }` (`pubMotor.*`). `pontos.historico` = pontos quando há perfil de pagamento; `pontos.atraso` = pontos quando o critério sai do atraso médio (sem perfil); um dos dois é sempre 0. `podeAprovar` = contrato ativo (04 §8). `gravar = 1` grava a fotografia (`ccEscPubAnaliseMotor`) e torna quem grava proponente (`PROPOSTA_POR`, DT-40) | `CC_ANALISE_ORGAO` | — |
| `ccPubNfListar` L+T | SQL-L | T; Jurídico | `clienteId (0)`, `analiseId (0)`, `agenteId (0)`, `situacao ('' \| A_PROTOCOLAR \| NO_PRAZO \| LIQUIDACAO_VENCIDA \| PAGAMENTO_VENCIDO \| PAGA)`, `acima2m (-1)`, `de ('')`, `ate ('')` | colunas de `CC_NF_PUBLICA` (sem canceladas) + `SITUACAO, DIAS_ATRASO, ACIMA_2M, PROXIMO_PASSO` (= `PROX_PASSO`), `PROXIMO_PASSO_DATA` (= `PROX_PASSO_DATA`), `CODCLI, CLIENTE_NOME, ESFERA, UF, AGENTE_NOME, REGRA_NOME, REGRA_SITUACAO`. `ccPubNfTotal`: `TOTAL, VALOR, ORGAOS, VENCIDAS, VALOR_VENCIDO, ACIMA_2M, REGRA_A_CONFIRMAR`. Sem filtro de BU (NF não tem BU) | `CC_NF_PUBLICA`, `CC_NF_ACAO`, `CC_CLIENTE`, `CC_MEMBRO`, `CC_REGRA_PAGAMENTO_ENTE` | — |
| `ccPubNfFicha` | JS-L | T | `nfId` | `{ nf, regra, passos[] (devido, feito, no prazo), contratacoes[] (análises do órgão com solicitação `APROVADA` ou `PRE_APROVADA`, para a troca em `ccPubNfDatasSalvar`), pode }` | idem, `pub.rp*` | — |
| `ccPubMensagemPreparar` | JS-L | T | `nfId`, `passo` | `{ codigo, assunto, corpo, para, validado }`. Os 7 modelos da 005 (Anexo A da spec): `PUB_ANALISE`, `PUB_PROTOCOLO`, `PUB_LIQ`, `PUB_FILA`, `PUB_PAGAMENTO`, `PUB_OFICIO` e `PUB_REQUERIMENTO` (os dois últimos com efeito legal) | modelos, NF | — |
| `ccPubReguaCumprimento` | SQL-L | T | `de`, `ate`, `agenteId (0)` | por agente: `DEVIDOS, FEITOS, NO_PRAZO, PCT` — `DEVIDOS` = passos feitos no período (por `FEITO_EM`) + passos atuais (`PROX_PASSO_DATA`) vencidos e não feitos até o fim do período; `PCT = NO_PRAZO ÷ DEVIDOS`. `ponytail:` passo pulado (a NF avançou sem ele) não conta como devido; contar exige uma linha por passo pendente | `CC_NF_ACAO`, `CC_NF_PUBLICA` | — |
| `ccPubContratoListar` L+T | SQL-L | T | `soAlerta (0)` | contratos dos créditos vigentes: `CLIENTE_*, CONTRATO, VIGENCIA_FIM, SALDO_CONTRATO, ALERTA` (`pub.contratoVigDias`, `pub.contratoSaldoPct`) | `CC_ANALISE_ORGAO`, `CC_CREDITO` | — |
| `ccPubResumo` | SQL-L | T | `buId (-1)` (≥ 0 = órgãos com saldo na BU em `CC_POSICAO_CLIENTE_BU`; `ponytail:` NF de nota mista conta inteira), `mes ('' = corrente)` | `NFS_ABERTAS, VALOR_ABERTO, A_PROTOCOLAR, LIQUIDACAO_VENCIDA, PAGAMENTO_VENCIDO, ACIMA_2M, VALOR_ACIMA_2M, CERTIDOES_VENCENDO, CERTIDOES_VENCIDAS, CONTRATOS_ALERTA, P1, P2, P3, P4` + para o funil escolhido no painel (DT-33, O-3 da validação v2), por `ETAPA_NF` das NFs em aberto: `SEM_ATESTO, VALOR_SEM_ATESTO` (`ENTREGUE`/`PROTOCOLADA`), `AGUARDANDO_LIQUIDACAO, VALOR_AGUARDANDO_LIQUIDACAO` (`ATESTADA`), `LIQUIDADAS_SEM_PAGAMENTO, VALOR_LIQUIDADAS_SEM_PAGAMENTO` (`LIQUIDADA`/`OP`), `VALOR_PAGAMENTO_VENCIDO`, `RECEBIDO_MES, NFS_RECEBIDAS_MES` (`PAGO_EM` no `mes`). Resumo pedido pela 006; a tela chama direto (DT-34) | tabelas da 005, `CC_CREDITO` | — |
| `ccPubRegraEnteListar` | SQL-L | T | `ativo (-1)` | colunas de `CC_REGRA_PAGAMENTO_ENTE` | idem | — |
| `ccPubCertidaoListar` | SQL-L | T; Jurídico | `situacao ('' \| VALIDA \| VENCENDO \| VENCIDA)`, `todas (0)` | colunas de `CC_CERTIDAO` + `SITUACAO`, `ANEXO_URL`, `VIGENTE` (0/1); `todas = 0` = só a vigente de cada tipo/abrangência; `1` = também as anteriores (histórico do cartão) | `CC_CERTIDAO`, `CC_ANEXO` | — |
| `ccPubNfDatasSalvar` | JS-E | caso | `nfId`, `empenho ('')`, `protocolo ('')`, `atesto ('')`, `liquidacao ('')`, `op ('')`, `filaPosicao (0)`, `analiseId (0)` — a tela manda o estado inteiro do trilho: `''` = sem data (apaga), respeitando a ordem da RN-025; `filaPosicao = 0` = sem posição; `analiseId = 0` = manter a contratação; `analiseId` de outro órgão ou sem solicitação `APROVADA`/`PRE_APROVADA` → "Contratação não encontrada para este órgão.". A regra do ente não é escolhida por NF (vem da contratação ou é automática) | recalcula prazos, `PROX_PASSO*` e etapa da NF; chama `ccCobCasoSincronizar` como pessoa (`membroId`; duas origens, DT-34) para o órgão com fase, capa, próxima ação e `nota` "Etapa do órgão: <nome>" quando a fase muda. Conta medida no simulador: **15** com mudança de fase (16 com a sessão levada à aninhada), 2 sem mudança | `CC_NF_PUBLICA` | `ccCobCasoSincronizar` |
| `ccPubNfPassoRegistrar` | JS-E | caso | `nfId`, `passo`, `protocoloOrgao ('')`, `obs ('')`, `enviarEmail (0)`, `para ('')`, `assunto ('')`, `corpo ('')` | passo da régua da NF feito; com e-mail, envia o modelo `PUB_*` (ofício e requerimento exigem modelo validado); regrava `PROX_PASSO`/`PROX_PASSO_DATA` com o novo passo atual (`ccEscPubNfPassoAtualizar`); registra o contato pela 002 (`ccCobContatoRegistrar` com `origem = 'REGUA_PUB'`, `retorno = ''`, `feedback` = "<passo> feito" + `obs`, `emailEnviadoId`, `canal` `E-mail` com envio, senão o canal do passo fixado no plan da 005, e a próxima ação = novo passo atual); devolve o novo passo atual. Conta medida no simulador: **16** com e-mail, 10 sem | `CC_NF_ACAO`, `CC_NF_PUBLICA` (`PROX_PASSO*`) | `ccEmailEnviar`, `ccCobContatoRegistrar` |
| `ccPubRegraEnteSalvar` | JS-E | N2; `validar = 1`: cargo Jurídico ou N3 | `regraId (0)`, `nome`, `esfera`, `uf`, `liqDias`, `pagDias`, `contagem`, `baseLegal`, `link`, `ativo (1)`, `validar (0)` | | `CC_REGRA_PAGAMENTO_ENTE` | — |
| `ccPubCertidaoSalvar` | JS-E | N2 | `certidaoId (0)`, `tipo`, `cnpj`, `abrangencia ('')`, `numero ('')`, `emissao ('')`, `validade`, `anexoId (0)` | | `CC_CERTIDAO` | — |
| `ccPubRotina` | SIS | passo `PUBLICO` | contrato de passo | lê NFs dos órgãos no Winthor (SQL de `lib/setor-publico/winthor-nf.mjs`, por `runQueryMitra` com o `jdbcId`; grava `CC_ESTADO['pub.nfCorteLido']`), recalcula prazos, e por órgão com NF em aberto chama `ccCobCasoSincronizar` com a etapa mais avançada entre as NFs, a próxima ação e a capa (05 §3.7) | `CC_NF_PUBLICA` | `ccCobCasoSincronizar` |

Leitura Oracle: a SQL de `winthor-nf.mjs`, lida pela rotina por `runQueryMitra`; `ccPubWinthorNf` **não é publicada** (C-03 da B3: ninguém a chamava e, no perfil, leria NF de qualquer `CODCLI` sem visibilidade). Gancho: `gancho('concessao-publica')` (§8).

Internas (`INT`): `ccEscPubAnaliseInserir` · `ccEscPubAnaliseAtualizar` · `ccEscPubAnaliseMotor` · `ccEscPubNfDatas` · `ccEscPubNfAcaoInserir` · `ccEscPubNfPassoAtualizar` · `ccEscPubRegraInserir` · `ccEscPubRegraAtualizar` · `ccEscPubCertidaoInserir` · `ccEscPubCertidaoAtualizar`.

---

## 6. 006-painel-consolidado (`ccPainel…`)

Só leitura das tabelas dos outros módulos + os três resumos de §9, que a **tela** chama direto (são SQL com `EU`; nunca aninhados, DT-34). Filtro do painel inteiro: `mes ('' = corrente)`, `buId (-1)`, `carteira ('' \| PRIVADA \| ESTETICA \| PUBLICA)`; Jurídico não é carteira (aparece pelo bloco de `ccJurResumo`). Mês passado = lido da foto (`CC_FOTO_AGING`, agente da foto) ou do fechamento manual; mês corrente = posição de hoje. **Quem `T` aqui exclui o cargo `JURIDICO`** (o Jurídico não acessa o painel: JS recusa com frase; SQL não devolve linha). Analista enxerga pelo mesmo fragmento de visibilidade (01 §6). Solicitação não tem BU: o filtro de BU não altera as decisões de crédito (a tela avisa).

| SF | Tipo | Quem | Entrada | Saída | Lê |
|---|---|---|---|---|---|
| `ccPainelPosicao` | JS-L | T | `mes ('')`, `carteira ('')`, `buId (-1)`, `agenteId (0)` | `{ mes, origem (ATUAL \| FOTO \| MANUAL \| SEM), posicaoEm, total, aVencer, vencido, vencido90, faixas[6]: { saldo, pdd }, pdd, inadPct, vencido90Pct, clientes, clientesAtraso, atrasoMedioDias (VDIAS ÷ VENCIDO), anterior: { mes, vencido, inadPct } \| null, porCarteira[], porBu[] (cada linha: chave, rotulo, clientes, clientesAtraso, total, aVencer, faixas[5], vencido, vencido90, pdd), metas (todas as meta.*), sincronizacao: { em, atrasada }, fotoPendente (mês `M` encerrado sem foto nem fechamento manual, ou `null`) }` (`pdd.*`, `meta.*`, `painel.sincAtrasoMin`) | `CC_POSICAO_CLIENTE_BU`, `CC_FOTO_AGING`, `CC_FECHAMENTO`, `CC_CLIENTE`, `CC_BU`, `CC_SINCRONIZACAO` |
| `ccPainelRollRate` | SQL-L | T | `mes ('' = último fechado; mês corrente = destino é a posição de hoje)`, `carteira ('')`, `buId (-1)` | matriz `FAIXA_DE, FAIXA_PARA, CLIENTES, VALOR` + `BASE_EM` (data da foto de origem); `FAIXA_PARA = 6` = baixado como perda no mês (RN-010: baixado = piorou) | `CC_FOTO_AGING`, `CC_POSICAO_CLIENTE_BU`, `CC_BAIXA` |
| `ccPainelSerie` | JS-L | T | `meses (12)`, `ate ('' = mês corrente)`, `carteira ('')`, `buId (-1)` | `linhas[]` por mês, janela que termina em `ate`: `MES, TOTAL, VENCIDO, VENCIDO_90, PDD, VENCIDO_INICIAL, GERADA` (nula sem base anterior), `RECUPERADO, BAIXADO, ENTRARAM, REGULARIZADOS, BAIXADOS, PROMESSAS, PROMESSAS_CUMPRIDAS, PROMESSAS_QUEBRADAS, ESTIMADO (0/1, RN-008), FOTO_EM, ORIGEM` (`ATUAL`, `FOTO`, `MANUAL`; fechamento manual só na visão consolidada) | `CC_FOTO_AGING`, `CC_FECHAMENTO`, `CC_POSICAO_CLIENTE_BU`, `CC_RECEBIMENTO`, `CC_BAIXA`, `CC_COBRANCA`, `CC_PROMESSA` |
| `ccPainelSerieCredito` | SQL-L | T | `meses (12)`, `ate ('')`, `carteira ('')` | por mês: `MES, SOLICITACOES` (abertas no mês), `DECIDIDAS`, `APROVADAS, RECUSADAS` (pela `DECIDIDA_EM`; `PRE_APROVADA` conta como decidida e aprovada, definição da RN-031 da 004), `VALOR_APROVADO, VALOR_RECUSADO` (valor solicitado), `LIMITE_CONCEDIDO` (Σ `CC_DECISAO.LIMITE_APROVADO` das aprovadas), `TEMPO_MEDIO_DIAS`, `NO_PRAZO` (decididas até `PRAZO_DECISAO`) | `CC_SOLICITACAO`, `CC_DECISAO` |
| `ccPainelCredito` | JS-L | T | `mes ('')`, `carteira ('')`, `buId (-1)` | `{ limite, utilizado, usoPct, emAnalise: { qtd, valor, foraDoPrazo }, porCarteira[] (carteira, emAnalise, foraDoPrazo, aprovadas, recusadas, valorAprovado, valorRecusado, concedido, utilizado, vencido, criticos, pedidosRetidos), porRating[] (grupo PRIVADO AA–E \| PUBLICO P1–P4 \| SEM; as escalas não se misturam), porBu[] (buId, nome, clientes, utilizado, vencido, criticos), pmrDias, prazoMedioDias, vencendo, pedidosRetidos }`. Limite = o da posição (`CC_POSICAO_CLIENTE.LIMITE`) | `CC_CREDITO`, `CC_RISCO_CLIENTE`, `CC_PEDIDO_RETIDO`, `CC_SOLICITACAO`, `CC_DECISAO`, `CC_ANALISE_ORGAO`, posição, `CC_RECEBIMENTO` |
| `ccPainelConcentracao` | JS-L | T | `base ('VENCIDO' \| 'LIMITE')`, `mes ('')`, `carteira ('')`, `buId (-1)` | `{ total, clientes, porCliente, porGrupo, porRegiao, porBu (cada um { hhi, hhiFaixa, linhas[]: valor, pct, pctAcum }), top10[], acimaDoMaximo[] (só base LIMITE, limite.concMax) }` (`painel.hhi*`). `VENCIDO` = concentração da inadimplência; `LIMITE` = dos limites (DT-27). Mesmo cálculo, medida diferente | `CC_CREDITO`, `CC_CLIENTE`, posição, `CC_FOTO_AGING` |
| `ccPainelAgentes` | SQL-L | T | `mes ('')`, `buId (-1)`, `carteira ('')` | `AGENTE_ID, AGENTE_NOME, SUPERIOR_NOME, CLIENTES, CLIENTES_ATRASO, TOTAL, VENCIDO, VENCIDO_90, COBRADO, RECUPERADO, CLIENTES_COBRADOS, CONTATOS, PROMESSAS, PROMESSAS_CUMPRIDAS, PROMESSAS_QUEBRADAS, ACOES, ACOES_NO_PRAZO` (somas; ações = `CC_ACAO_REGUA` + `CC_NF_ACAO` pelo `NO_PRAZO` gravado pelo dono); mês passado = agente da foto | posição, `CC_FOTO_AGING`, tabelas da 002, `CC_NF_ACAO`, `CC_RECEBIMENTO` |
| `ccPainelPlanos` | SQL-L | T | `mes ('')`, `buId (-1)`, `carteira ('')` | `PLANO_COD, DESCRICAO, PRAZO_MEDIO, CLIENTES, CLIENTES_ATRASO, TOTAL, VENCIDO, ATRASO_MEDIO_DIAS, FAT_M0 … FAT_M5` (faturado no mês e nos 5 anteriores) | `CC_CLIENTE`, `CC_PLANO_PAGAMENTO`, posição, `CC_FATURAMENTO_MES` |
| `ccPainelSaude` | JS-L | T | `carteira ('')`, `buId (-1)` | `{ indice, faixa, niveis[3]: { nivel, clientes, saldo, maiores[4]: { clienteId, nome, sinais, saldo } } }` (lê `CC_RISCO_CLIENTE.SAUDE`/`SAUDE_SINAIS`; não recalcula) | `CC_RISCO_CLIENTE`, posição, `CC_CLIENTE` |
| `ccPainelEquipe` | SQL-L | N2 | `mes ('')`, `carteira ('')`, `buId (-1)` | cada linha soma a pessoa e quem está abaixo: `MEMBRO_ID, NOME, CARGO, SUPERIOR_ID, SUPERIOR_NOME, PROFUNDIDADE, ANALISES_ANDAMENTO, DECIDIDAS, TEMPO_MEDIO_DIAS, CLIENTES_ATRASO, VENCIDO, RECUPERADO, CONTATOS`. "Ações atrasadas" a tela soma pela árvore com `ccCobAgendaResumo` | tabelas da 002 e 004, `CC_MEMBRO`, posição, `CC_RECEBIMENTO` |
| `ccPainelAtencao` | JS-L | T | `carteira ('')`, `buId (-1)` | `{ tipo, texto, valor, quantidade, gravidade }[]`, `tipo` ∈ `INAD_ACIMA_ALERTA`, `CONCENTRACAO`, `LIMITE_VENCIDO`, `CLIENTE_CRITICO`, `BLOQUEIO_NAO_APLICADO`, `PROMESSA_VENCIDA`, `JURIDICO_SEM_ANDAMENTO`, `NF_ACIMA_2M`, `CERTIDAO`, `LEITURA_ATRASADA`, `CLIENTE_EM_RISCO`, `FOTO_PENDENTE`, `SOLICITACAO_FORA_PRAZO`, `PEDIDO_RETIDO`, `ACAO_ATRASADA`, `ACORDO_QUEBRADO`, `BAIXA_PENDENTE`, `JURIDICO_PRAZO`, `NF_PAGAMENTO_VENCIDO`. A SF devolve só os tipos das leituras próprias; `PROMESSA_VENCIDA` e `ACAO_ATRASADA` (de `ccCobAgendaResumo`), `JURIDICO_SEM_ANDAMENTO` e `JURIDICO_PRAZO` (`ccJurResumo`), `NF_PAGAMENTO_VENCIDO`, `NF_ACIMA_2M` e `CERTIDAO` (`ccPubResumo`) a tela monta com `atencaoDosResumos()` (`frontend/src/lib/painel-consolidado/`), chamando os três resumos direto no mesmo bloco (DT-34) | próprias (os resumos, pela tela) |
| `ccPainelFechamentoListar` L+T | SQL-L | ADM | — | colunas de `CC_FECHAMENTO` + `TEM_FOTO` | `CC_FECHAMENTO`, `CC_FOTO_AGING` |
| `ccPainelFechamentoSalvar` | JS-E | ADM | `mes`, `total`, `vencido`, `vencido90`, `pdd` | só mês sem foto e já encerrado; auditoria com `CLIENTE_ID` nulo | `CC_FECHAMENTO` |
| `ccPainelRotina` | SIS | passo `FOTO` | contrato de passo | foto do mês anterior na primeira leitura OK do mês (01 §11), num `INSERT IGNORE … SELECT` único por `runDmlMitra` (plano B: lotes de 500); não fotografa sem leitura `OK` anterior ao mês (sem foto retroativa da implantação); devolve `execucoes: 1` | `CC_FOTO_AGING` |

Internas: `ccEscPainelFechamentoInserir` · `ccEscPainelFechamentoAtualizar`.

## 7. 007-historico-apoio (`ccHist…`)

| SF | Tipo | Quem | Entrada | Saída | Lê / escreve |
|---|---|---|---|---|---|
| `ccHistClienteBuscar` + `ccHistClienteBuscarTotal` | SQL-L | T (Jurídico: só cliente com `NO_JURIDICO`) | `busca`, `limite (20)`, `offset (0)` | `ID, CODCLI, NOME, DOCUMENTO, SETOR, UF, AGENTE_NOME, VENCIDO` | `CC_CLIENTE`, posição |
| `ccHistResumo` | JS-L | T | `clienteId` | `{ cliente, posicao, credito (com a etapa = fase do card da solicitação mais recente, mesmo sem crédito vigente), risco, ratingPub, cobrancas[], processos, ultimoContato, recuperado (Σ VALOR_PAGO com DIAS_ATRASO_PAGAMENTO > 0, sem estornados; null sem pagamento), contatos, promessasAbertas, documentos (CC_ANEXO do cliente + KB_ANEXO dos cards dele), total, contagens por categoria }` | tabelas de 001–005, `KB_ANEXO` |
| `ccHistEventoListar` + `ccHistEventoTotal` | SQL-L | T | `clienteId`, `categoria ('')` (uma ou mais, separadas por vírgula; `''` = todas as visíveis), `de ('')`, `ate ('')`, `limite (20)`, `offset (0)` — **sem `busca`** | `EM, AGENDADO (0/1, por HOJE_SQL), CATEGORIA, TITULO, TEXTO, AUTOR_NOME, ORIGEM, ORIGEM_ID, CARD_ID` — união das fontes (mapa abaixo: 39 origens); ordem: agendados em data crescente, depois passados em data decrescente, empate pela `ORIGEM` (alfabética) e pelo `ORIGEM_ID` decrescente (no mesmo instante `ACORDO_PARCELA` vem antes de `PROX_ACAO`: parcela 1, próxima ação, parcela 2); datas `KB_*` por `KB_BRASILIA`; categoria `Alteração auditada` só `NIVEL_MIN(2)` | idem + `KB_MOVIMENTO`, `KB_LOG`, `CC_AUDITORIA` |
| `ccHistExportar` | JS-L (grava a auditoria da emissão) | T | `clienteId`, `categoria ('')`, `de ('')`, `ate ('')` | resumo + até 2.000 eventos (com `AGENDADO`) para o documento (gerado pela impressão do navegador); grava 1 linha `auditar('Histórico', 'CLIENTE', clienteId, clienteId, [{ campo: '(emissão)', depois: categorias, período e quantidade }])` — 2 execuções | idem; escreve `CC_AUDITORIA` (via 001) |
| `ccHistFonteListar` + `ccHistFonteTotal` | SQL-L | T | `busca ('')` (em `BUSCA`), `grupo ('')`, `revisar (-1)`, `ativo (1)`, `limite (20)`, `offset (0)` | colunas de `CC_FONTE_LINK` | `CC_FONTE_LINK` |
| `ccHistFonteSalvar` | JS-E | ADM | `fonteId (0)`, `grupo`, `titulo`, `url ('')`, `responsavel ('')`, `uso ('')`, `ordem (0)`, `ativo (1)`, `revisarJuridico (0)` | mantém `BUSCA` | `CC_FONTE_LINK` |
| `ccHistFonteRevisar` | JS-E | cargo Jurídico ou ADM | `fonteId` | `REVISADO_EM/POR`, baixa `REVISAR_JURIDICO` | `CC_FONTE_LINK` |
| `ccHistMaterialListar` + `ccHistMaterialTotal` | SQL-L | T | `busca ('')`, `grupo ('')`, `ativo (1)`, `limite (20)`, `offset (0)` | colunas de `CC_MATERIAL` + `ANEXO_URL`, `ANEXO_NOME` | `CC_MATERIAL`, `CC_ANEXO` |
| `ccHistMaterialSalvar` | JS-E | ADM | `materialId (0)`, `grupo`, `titulo`, `descricao ('')`, `tags ('')`, `anexoId (0)`, `vigenteDesde ('')`, `ordem (0)`, `ativo (1)` | | `CC_MATERIAL` |
| `ccHistRegrasVigentes` | JS-L | T | `carteira ('')` | parâmetros em vigor por grupo (código do grupo e rótulo da chave; o nome do grupo a tela tira de `GRUPOS_PARAMETRO`, 01 §9), tabelas de alçada (grupo `alcada.*` com os rótulos do catálogo) e dias da régua, `com.politicaVersao`, e `quadros[]`: por quadro, as fases (`chave`, `nome`, `slaHoras`, `final`, na ordem) | `ccBaseParametroListar` (aninhada, sem sessão), `CC_FASE`, `KB_FASE` |

Internas: `ccEscHistFonteInserir` · `ccEscHistFonteAtualizar` · `ccEscHistFonteRevisar` · `ccEscHistMaterialInserir` · `ccEscHistMaterialAtualizar`.

Mapa de fontes do histórico (`CATEGORIA` ← tabela, data, autor): `Cobrança` ← `CC_ACAO_REGUA`, `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `KB_MOVIMENTO` dos quadros de cobrança, `CC_COBRANCA` (só a próxima ação de caso aberto com data ≥ hoje, como agendado) · `Acordos e baixas` ← `CC_ACORDO`, `CC_ACORDO_PARCELA`, `CC_BAIXA` · `Crédito` ← `CC_SOLICITACAO`, `CC_DECISAO`, `CC_CREDITO`, `CC_PEDIDO_RETIDO`, `KB_MOVIMENTO` dos quadros de concessão e de `pedidos-limite` · `Jurídico` ← `CC_PROCESSO`, `CC_PROCESSO_ANDAMENTO`, `CC_ACORDO_JUDICIAL`, `CC_NOTIFICACAO_EXTRAJUDICIAL`, `KB_MOVIMENTO` do quadro `juridico` · `Setor público` ← `CC_NF_PUBLICA` (marcos), `CC_NF_ACAO` · `Comunicação` ← `CC_EMAIL_ENVIADO`, `KB_LOG` com `EVENTO = 'nota'` dos cards do cliente nos 8 quadros · `Recebimentos` ← `CC_RECEBIMENTO` · `Alteração auditada` ← `CC_AUDITORIA`. `Alteração auditada` exclui o eco: a linha de auditoria que só repete a criação de um fato que já aparece na sua categoria, por 12 pares `ENTIDADE|CAMPO` como as donas gravam (`ECO_AUDITORIA` de `lib/historico-apoio/eventos.mjs`). Toda junção que só traz card, NF, ação da NF, processo, caso, solicitação, pedido ou notificação confere o mesmo cliente. Jurídico (P-27) vê todas menos `Alteração auditada`, só de cliente com `NO_JURIDICO` (cai fora de `Alteração auditada` pela regra `NIVEL_MIN(2)`, sem regra própria).

---

## 8. Ganchos `ccPodeMover` e `ccPodeExcluir`

`ccPodeExcluir`: sempre `PODE = 0` (casos não são excluídos).

`ccPodeMover(usuarioId, cardId, boardId, faseId)` — SQL única publicada pela 001; cada dona entrega o trecho do seu quadro em `lib/quadros/NNN.mjs` (`gancho(slug)`), escrito sobre os mesmos apelidos: `M` = `CC_MEMBRO` ativo com `USER_ID = {{usuarioId}}`, `DE` / `PARA` = `CC_FASE` da fase atual do card e da fase pedida. Ordem: (1) sem `M` → "Usuário sem vínculo na equipe."; (2) trecho(s) do quadro; (3) nada recusou → `PODE = 1`.

Princípio (vale para todos): **fase que o sistema controla só aceita o card quando o domínio já está no estado certo.** A SF grava o domínio e depois move; se a plataforma levar a sessão para a chamada aninhada, o gancho é consultado e passa; se não levar, a lib nem consulta (05 §1). O usuário que arrastar à mão é recusado com a frase da tabela.

**Quem move × domínio (DT-35).** A regra de "quem move" de cada quadro vale só para o **movimento livre** (o que a pessoa faz à mão). Destino que o sistema controla — a linha da tabela exige um estado que só uma SF grava — confere **só o domínio**, seja quem for o `M`: com a sessão levada, quem decide na alçada, quem envia o dossiê ou quem lança as datas da NF não é recusado por não ser "caso" ou Jurídico. Cada trecho escreve primeiro as cláusulas de domínio dos destinos controlados e só depois a de quem move, com `PARA.CHAVE` fora desses destinos.

**Quadros `cobranca-*` (trecho único da 002, as três carteiras)**

| De → para | Quem | Exige | Recusa com |
|---|---|---|---|
| fase da régua → `negociacao` | caso | `VENCIDO > 0` na posição da carteira | "Só cliente com saldo vencido entra em negociação." |
| `negociacao` → fase da régua | caso | sem acordo `PROPOSTO` ou `ATIVO` | "Há acordo em aberto neste caso." |
| qualquer → `acordo` | — | `CC_ACORDO.SITUACAO = 'ATIVO'` do caso | "O card vai para Acordo quando o acordo é aprovado." |
| qualquer → `juridico` | — | `CC_COBRANCA.JURIDICO_EM` preenchido | "Envie o dossiê pelo quadro Jurídico." |
| qualquer → `regularizado`, `pago_no_prazo`, `baixado` | — | `CC_COBRANCA.ENCERRADO_EM` preenchido com o `DESFECHO` da fase | "O caso é encerrado pelo sistema (saldo zerado) ou pela decisão de baixa." |
| entre fases da régua | — | só para `CC_COBRANCA.FASE_DEVIDA` (a fase que a rotina ou a etapa do órgão mandou por último, gravada por `ccCobCasoSincronizar` antes de mover; vazia = nunca) | "A régua move o card pelos dias de atraso." / no `cobranca-publica`: "A etapa do órgão acompanha as notas fiscais." |
| saída de `acordo`, `juridico` ou fase final | — | nunca à mão | idem |

"Fase da régua" = fase comum que não é `negociacao`, `acordo` nem `juridico`. Como o `cobranca-publica` não tem `negociacao` nem `acordo`, ali só o sistema move (para a `FASE_DEVIDA` que ele mesmo gravou) — sem `if` de carteira.

**Quadro `juridico` (003)** — movimento livre: só cargo Jurídico ou `PODE_ADMINISTRAR` ("Só o Jurídico move processos."). Destinos controlados (DT-35): `dossie → recebido` com `DOSSIE_ENVIADO_EM` preenchido (é o movimento de `ccJurDossieEnviar`, feito por quem tem nível ≥ `jur.envioNivelMin`) e `→ encerrado` com `ENCERRADO_EM`

| De → para | Exige | Recusa com |
|---|---|---|
| `dossie` → qualquer **menos `encerrado`** — só no dossiê vindo da cobrança (`P.ORIGEM = 'COBRANCA'` e `DOSSIE_ENVIADO_EM` nulo); processo manual ou da carga nasce em `dossie` (a lib cria na fase de entrada) e a SF o leva à fase pedida | `DOSSIE_ENVIADO_EM` preenchido | "Envie o dossiê para sair desta etapa." |
| qualquer → `dossie` | nunca | "Processo não volta para o dossiê." |
| qualquer → `citacao`, `defesa`, `sentenca`, `execucao` | `AUTOS <> ''` | "Informe o número dos autos." |
| qualquer → `encerrado` | `ENCERRADO_EM` preenchido | "Encerre pelo botão Encerrar processo, com o motivo." |
| `encerrado` → qualquer | nunca | "Processo encerrado não volta." |

**Quadros `concessao-*` (trecho único da 004, as três carteiras; + trecho da 005 em `concessao-publica`)** — quem move, no movimento livre (avanço até `comite` e volta): caso ("Só o analista do caso ou o superior move."). A fase seguinte a `comite`, `gestao`, `reanalise`, `obsoleto`, `encerrada` e `recusada` conferem só o domínio (DT-35): quem decide na alçada não precisa ser caso

| Para a fase | Exige (domínio) | Recusa com |
|---|---|---|
| avanço entre fases comuns até `comite` | só para a fase **imediatamente seguinte** na ordem do quadro (`PARA.ORDEM` = menor `ORDEM` de fase comum maior que `DE.ORDEM`) | "Avance uma etapa por vez." |
| saindo de `entrada` | `VALOR > 0`, `PRAZO_MESES > 0`, `ANALISTA_ID` preenchido | "Informe valor, prazo e analista." |
| `credito` | consultas obrigatórias feitas (`CONS_RECEITA`, `CONS_PROTESTO`, `CONS_PROCESSO` e, se PJ, `CONS_SOCIOS` ≠ `NAO_CONSULTADO`) e `CONS_DATA` dentro de `limite.consultaValidadeDias` | "Consultas obrigatórias pendentes ou vencidas." |
| `comite` (quadros com motor da 004) | `SCORE_SERASA` informado, `FP_TIPO <> ''`, rating efetivo calculado, `AJUSTE_SITUACAO <> 'PENDENTE'`, `LIMITE_PROPOSTO > 0`, `PARECER_ANALISTA <> ''`; `FIN_AC`, `FIN_PC`, `FIN_PL` se `VALOR > limite.docF2` | "Análise de crédito incompleta: …" (lista o que falta) |
| `comite` (**trecho da 005**, `concessao-publica`) | `CC_ANALISE_ORGAO` da solicitação com `CAPACIDADE <> ''`, `PERFIL_PAG <> ''` e `RATING_PUB <> ''` | "Análise do órgão incompleta: capacidade financeira, perfil de pagamento e rating." |
| a fase seguinte a `comite` | `DECISAO_RESULTADO = 'APROVADA'` | "A solicitação sai do Comitê pela decisão." |
| `liberacao` | se `GARANTIA <> ''`, item "Garantias formalizadas" do card = Sim | "Garantia informada e não formalizada." |
| `gestao` | crédito vigente (`CC_CREDITO.VIGENTE_CHAVE`) desta solicitação | "O crédito entra em gestão quando o limite é aplicado." |
| `reanalise` / `obsoleto` / `encerrada` | `CC_CREDITO.SITUACAO` = `REANALISE` / `OBSOLETO` / `ENCERRADO` | "Encaminhamento é feito pelo sistema ou pela decisão de reanálise." |
| `recusada` | `ENCERRADA_EM` preenchido com `MOTIVO_RECUSA` ou decisão `RECUSADA` | "Recuse pelo botão Recusar, com o motivo." |
| voltar | só entre fases anteriores a `comite` e de `comite` para trás enquanto não decidida | "Solicitação decidida não volta." |
| saída de `gestao`, `reanalise` ou fase final para fase que não está nesta tabela como destino controlado | nunca | "Encaminhamento é feito pelo sistema." |

Travas de campo (confirmações, anexo do termo, itens obrigatórios do checklist público) são **condição de entrada** da fase no quadro (05), não gancho. O motivo de retorno é pedido pela tela (`antesDeMover`) e gravado como nota do card — `ponytail:` o gancho não enxerga o texto; se precisar travar no servidor, vira SF `ccCredSolicitacaoVoltar`.
Regra do motor por carteira: `ccCredDecisaoRegistrar` só aceita `APROVADA` se o motor da carteira devolver `podeAprovar = true` (chave presente nos dois motores; no da 004 é sempre `true` quando há rating efetivo). No motor do órgão isso é contrato ativo (base `CONTRATO`, saldo > 0, vigência ≥ hoje); sem contrato, só `PRE_APROVADA` ou `RECUSADA`. "Carteira com motor da 004" é uma constante só, `temMotorProprio(carteira)` = carteira ≠ `PUBLICA` (em JS e no trecho SQL `S.CARTEIRA <> 'PUBLICA'`). Fotografia do motor e exceção na `PUBLICA`: DT-36 (§4 `ccCredDecisaoRegistrar`).

**Quadro `pedidos-limite` (004)** — quem move (só no movimento livre `retido ⇄ analise ⇄ alcada`): caso; para `liberado` / `recusado` exige `CC_PEDIDO_RETIDO.DECISAO_RESULTADO` igual ("O pedido é liberado ou recusado pela decisão da alçada."); fase final não volta.

## 9. Resumos que o painel (006) pede aos outros módulos

São SQL com `EU`: a tela do painel chama direto, no bloco que mostra o dado; nenhuma SF os chama aninhados (DT-34).

| SF | Dona | Entrada | Saída | Substitui |
|---|---|---|---|---|
| `ccCobAgendaResumo` | 002 | `carteira ('')`, `buId (-1)`, `ate ('')` | §2 (com `PROXIMOS` e `A_VENCER_7DU`) | `ccAgendaResumo` |
| `ccJurResumo` | 003 | `carteira ('')`, `buId (-1)`, `mes ('')` | §3 (com as colunas do funil) | `ccJuridicoResumo` |
| `ccPubResumo` | 005 | `buId (-1)`, `mes ('')` | §5 (com as colunas do funil) | `ccNfPublicaResumo`, `ccNfPubKpis` + certidões |

Da 004 o painel lê tabelas direto (`CC_SOLICITACAO.PRAZO_DECISAO/DECIDIDA_EM/DECISAO_RESULTADO`, `CC_DECISAO`, `CC_CREDITO`, `CC_PEDIDO_RETIDO`, `CC_RISCO_CLIENTE`). Resumo ainda não publicado (id 0) → o painel mostra o bloco como "módulo não instalado".

## 10. D-05 — o que sai das specs e o que substitui

**SFs da 005 que saem**

| SF que a 005 listava | Passa a ser |
|---|---|
| `ccPubEsteiraListar`, `ccPubEsteiraTotal` | `ccCredSolicitacaoListar` / `…Total` com `carteira = 'PUBLICA'`; as colunas são do quadro `concessao-publica` (lib) + `ccCredEsteiraResumo` |
| `ccPubSolicitacaoMover` | mover do quadro (lib) validado por `ccPodeMover` (trecho da 004 + trecho da 005) |
| `ccPubDecisaoRegistrar` | `ccCredDecisaoRegistrar` (alçada pelo valor de `alcada.conc*` na carteira `PUBLICA`; aceita `PRE_APROVADA`) |
| `ccOrgaoHistorico` | decisões: `ccCredSolicitacaoHistorico`; histórico de **pagamento** pelas NFs (pagas, no prazo, liquidação, pagamento e atraso médios): `historico` de `ccPubAnaliseObter` |
| escritas SQL de etapa, checklist, decisão e crédito da solicitação pública (`ccSolicitacaoEtapaGravar`, `ccSolicitacaoCheckMarcar`, `ccDecisaoInserir`, `ccCreditoInserir` pedidas à 004) | etapa e checklist são do card; decisão e crédito por `ccCredDecisaoRegistrar` / `ccCredReanaliseConcluir` |
| "Monitoramento" e "Reavaliação de risco" próprias | fases `gestao` e `reanalise` do quadro `concessao-publica`; encaminhamento por `ccCredRotina`; renovação por `ccCredReanaliseConcluir` |
| `ccCobPubQuadro`, `ccCobPubTotal` | quadro `cobranca-publica` (lib) + `ccCobQuadroResumo` com `carteira = 'PUBLICA'` |
| `ccCobrancaEtapaAutoGravar` (pedida à 002) | `ccCobCasoSincronizar` |
| `ccReguaPubAgenda` | `ccCobAgendaListar` com `carteira = 'PUBLICA'` (a 005 entrega a próxima ação do órgão em `ccCobCasoSincronizar`) |
| registro de contato com o órgão | `ccCobContatoRegistrar` com `nfId` (canais "Ofício" e "Portal do órgão") |
| previsão de pagamento do órgão | promessa de `ccCobContatoRegistrar` |
| baixa de NF como perda | `ccCobBaixaPropor` / `ccCobBaixaParecer` / `ccCobBaixaDecidir` |
| envio do órgão ao Jurídico | `ccJurDossieAbrir` / `ccJurDossieEnviar` → `ccCobEnviarJuridico` |
| encargos da NF em atraso | `ccCobEncargosCalcular` com `carteira = 'PUBLICA'` |
| `ccPosicaoPublicaGravar` (pedida à 001) | não existe: a posição do órgão é a da leitura geral |

**SFs da 005 que ficam (com o nome novo)**

| Era | Fica |
|---|---|
| `ccOrgaoAnaliseLer`, `ccOrgaoAnaliseSalvar`, `ccOrgaoMotorCalcular` | `ccPubAnaliseObter`, `ccPubAnaliseSalvar`, `ccPubMotorCalcular` |
| `ccNfPubSincronizar` | dentro de `ccPubRotina` |
| `ccNfPubListar`/`Total`, `ccCobPubDocumentos`/`Total` | `ccPubNfListar` / `…Total` |
| `ccNfPubDetalhe`, `ccReguaPubNf` | `ccPubNfFicha` |
| `ccNfPubKpis` | `ccPubResumo` |
| `ccNfPubDatasSalvar` | `ccPubNfDatasSalvar` |
| `ccReguaPubMensagem` | `ccPubMensagemPreparar` |
| `ccReguaPubFeito`, `ccReguaPubEnviar` | `ccPubNfPassoRegistrar` |
| `ccReguaPubCumprimento` | `ccPubReguaCumprimento` |
| `ccRegraEnteListar`/`Salvar`, `ccCertidaoListar`/`Salvar` | `ccPubRegraEnteListar`/`Salvar`, `ccPubCertidaoListar`/`Salvar` |

**Na 002 e na 004:** saem os filtros "só privado" (a 004 recusava `PUBLICO` em todas as SFs; a 002 aceitava só `''`, `PRIVADO`, `ESTETICA`); toda SF recebe ou deriva a `carteira`; regra que citava etapa por nome passa a citar a chave da fase; saem `ccCobrancaMover`, `ccSolicitacaoMover`, `ccPedidoMover`, `ccChecklistListar`, `ccChecklistMarcar`, `ccEtapasDefinicao`, `ccCobrancaQuadro` (são da lib).

## 11. Os 88 pedidos entre specs → resolvido por

**Regras da 001 para as outras (7)**

| Pedido | Resolvido por |
|---|---|
| 001-1 | catálogo único (03); cada spec declara as suas chaves em `lib/parametros/NNN`; leitura por `parametros()` / `PARAM()` |
| 001-2 | `ccEmailEnviar` único (01 §13); modelos em `lib/modelos/NNN`, semeados por `semearModelos()` |
| 001-3 | `lib/dias-uteis.mjs`: `ehDiaUtil`, `proximoUtil`, `somarDiasUteis`, `diasUteisEntre`, `motivoNaoUtil` (não há SF de dia útil) |
| 001-4 | chave própria `regua.bloqTotal` = 10 (P-01) |
| 001-5 | `CC_CLIENTE.NO_JURIDICO` dentro de `clienteVisivel()` (01 §6) |
| 001-6 | `CC_FATURAMENTO_MES` + `COMPRAS_*` da posição; cliente fora do universo não entra (P-09 da 004: só cliente existente) |
| 001-7 | `ccBaseRecebimentoListar` e toda leitura filtram `ESTORNADO = FALSE`; recuperação = `DIAS_ATRASO_PAGAMENTO > 0` |

**Pedidos da 002 (15)**

| Pedido | Resolvido por |
|---|---|
| 001-A | coluna `VDIAS` (Σ saldo × dias) nas três posições |
| 001-B | `CC_RECEBIMENTO.VENCIMENTO`, `DATA_PAGAMENTO`, `VALOR_PAGO`; IX (`CLIENTE_ID`, `DATA_PAGAMENTO`) |
| 001-C | `ccRotina` (cron de 5 min; passo `REGUA` depois da leitura) |
| 001-D | chaves `regua.*`, `cob.*`, `enc.*`, `meta.*` no catálogo; a 002 semeia; edição só em `ccBaseParametroSalvar` |
| 001-E | `CC_MODELO_MENSAGEM` + `lib/modelos/002`; 11 modelos `COB_*`; sem WhatsApp |
| 001-F | `ccEmailEnviar` aceita `para`, `assunto`, `corpo`, `anexos`; devolve `emailId` |
| 001-G | `auditar()` / `ccEscBaseAuditoria` |
| 001-H | nomes de 001-3 + cópia `frontend/src/lib/base/dias-uteis.ts` |
| 001-I | `parametros(carteira, data)`; gravação só `ccBaseParametroSalvar` |
| 001-J | `sessao()` / `quem()` e `clienteVisivel()` (01 §4, §6) |
| 001-K | `CC_CONTATO_CLIENTE.PRINCIPAL`; documento de caso é anexo do card |
| 003-A | dossiê primeiro (§2 "Cobrança → Jurídico") |
| 005-A | `CC_CONTATO_COBRANCA` e `ccCobContatoRegistrar` servem a carteira `PUBLICA` (`nfId`) |
| 006-A | tabelas da 002 com os nomes de 02 |
| 007-A | `CLIENTE_ID` indexado em todas; etapa legível por `CC_FASE` + `KB_FASE.NOME` |

**Pedidos da 003 (12)**

| Pedido | Resolvido por |
|---|---|
| P-1 | `ccBaseSessao`, `sessao()`, `CC_MEMBRO.ADMIN`, fragmentos de 01 §6 |
| P-2 | chaves `jur.*` no catálogo (31); as 6 duplicadas apontam para `com.*` / `CC_FILIAL_CREDORA` (03 §17) |
| P-3 | `somarDiasUteis()` da lib (sem SF) |
| P-4 | `auditar()` em lote (até 10 campos por execução) |
| P-5 | documentos do dossiê e dos custos são anexos do card (`KB_ANEXO`); `CC_DOSSIE_ITEM.KB_ANEXO_IDS`, `CC_PROCESSO_CUSTO.*_KB_ANEXO_ID` |
| P-6 | `ccBaseModeloListar({ codigo })` + `ccBaseModeloPrever`; validade = `SITUACAO_VALIDACAO` |
| P-7 | `ccBaseTitulosAbertos({ soVencidos: 1 })`; `ccBaseClienteListar` (busca por código e CNPJ); `CC_CLIENTE.ENDERECO`; Jurídico enxerga por `NO_JURIDICO` |
| P-8 | `ccCobEncargosCalcular` (título a título) |
| P-9 | `ccCobEnviarJuridico` idempotente + `ccCobSituacao`; ação extra "Montar dossiê" no card |
| P-10 | arrastar para `juridico` é recusado pelo gancho com a orientação; o botão abre `ccJurDossieAbrir` |
| P-11 | `ccJurDossieSugestao` lê `CC_NF_PUBLICA`/`CC_NF_ACAO` (empenho, protocolo), `CC_ANALISE_ORGAO` (contrato/edital) e `CC_CERTIDAO` direto (DT-34; era por `ccPubNfListar` e `ccPubAnaliseObter`) |
| P-12 | `add-090-perfil-acesso.mjs` libera todas as SFs e tabelas de todos os módulos |

**Pedidos da 004 (13)**

| Pedido | Resolvido por |
|---|---|
| 004-1 | `CC_POSICAO_CLIENTE` com `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS`, `COMPRAS_QTD/VALOR` e `ALTERADO_EM` (só muda quando a linha muda) |
| 004-2 | cargo `ANALISTA`; `lib/visibilidade.mjs` (`membroVisivel`, e "superior de" por `CAMINHO`) |
| 004-3 | catálogo composto; tipos `OPCAO`/`TEXTO`; nomes novos em 03 |
| 004-4 | documento da solicitação é anexo do card ou campo Anexo da fase |
| 004-5 | `auditar()` |
| 004-6 | `ccBasePlanoListar` (`CC_PLANO_PAGAMENTO`) e `ccBaseClienteListar` |
| 004-7 | `SITUACAO_FICHA` em `ccBaseClienteListar` e `ccBaseContatoListar` |
| 004-8 | padrão de 01 §11 (passo grava com `runDmlMitra` em lotes de 500) |
| 004-9 | `ccBaseClienteClassificar` (`GRUPO_ECONOMICO` manual) |
| 004-10 | `CC_COBRANCA.BLOQUEIO_DEVIDO/APLICADO` e `ccCobSituacao` |
| 004-11 | `CC_RISCO_CLIENTE.PROB_ATRASO` disponível; a 002 segue com `cob.prob*` |
| 004-12 | `CC_SOLICITACAO`/`CC_DECISAO`/`CC_CREDITO` únicas para as três carteiras; `PRE_APROVADA` aceita; P1–P4 em `CC_ANALISE_ORGAO` (cópia em `CC_DECISAO.RATING_PUB`) |
| 004-13 | a 006 lê `CC_RISCO_CLIENTE` (rating, criticidade, saúde) e as colunas de prazo e decisão de `CC_SOLICITACAO` |

**Pedidos da 005 (18)**

| Pedido | Resolvido por |
|---|---|
| P-1 | `lib/dias-uteis.mjs` com nacional + UF + município (`CC_FERIADO.UF/MUNICIPIO`) |
| P-2 | `CC_CLIENTE.MUNICIPIO`, `UF`, `ESFERA`, `SETOR` |
| P-3 | `parametros('PUBLICA', data)` |
| P-4 | `ccEmailEnviar` com `para`, `assunto`, `corpo`; devolve `emailId` |
| P-5 | `ccBaseModeloValidar` (cargo Jurídico ou nível ≥ `com.modeloValidaNivel`); 7 modelos `PUB_*` em `lib/modelos/005` |
| P-6 | órgão: anexo do card da solicitação; certidão: `CC_ANEXO` (`CERTIDAO`) |
| P-7 | a 005 não grava posição; visão por prazo legal fica em `CC_NF_PUBLICA` (P-09) |
| P-8 | `PCNFSAID`, `PCMOV`, `PCPEDC` no `schema-winthor.mjs` e na descoberta S-12 |
| P-9 | funções de contato "Ordenador de despesa", "Fiscal do contrato", "Gestor do contrato" na lista de `ccBaseContatoSalvar`; perfil único |
| P-10 | `ccCobCasoSincronizar` + quadro `cobranca-publica` da 002 com as fases e o checklist do público |
| P-11 | a régua por dias (`ccCobRotina`) roda só carteiras com `regua.*`; a `PUBLICA` é excluída explicitamente |
| P-12 | `ccCobAgendaListar` (próxima ação do órgão) e `ccPubReguaCumprimento` |
| P-13 | canais e retorno na lista da 002 |
| P-14 | §2 "Cobrança → Jurídico" vale para a `PUBLICA`; dossiê público incluído (05 §8) |
| P-15 | `ccCredSolicitacaoCriar` aceita `PUBLICA`; fases do quadro `concessao-publica` |
| P-16 | sem escrita própria da 005: `ccCredDecisaoRegistrar` (§10) |
| P-17 | `CC_CREDITO.ANALISE_ORGAO_ID`; risco, criticidade, farol e saúde só rodam carteiras com motor da 004; fases `gestao`/`reanalise` |
| P-18 | `ccPubResumo` (inclui certidões) |

**Pedidos da 006 (12)**

| Pedido | Resolvido por |
|---|---|
| 006-1 | faixas por título (`A_VENCER`, `V_1_30`…`V_180`) nas três posições |
| 006-2 | `CC_RECEBIMENTO` carregado desde janeiro do ano anterior (primeira carga) |
| 006-3 | `CC_SINCRONIZACAO.INICIO/SITUACAO`; `ccBaseSincronizacaoStatus` |
| 006-4 | `CC_FATURAMENTO_MES`, `CC_PLANO_PAGAMENTO` |
| 006-5 | `CC_CLIENTE.PLANO_COD` |
| 006-6 | `meta.*`, `pdd.*`, `saude.*`, `painel.*` no catálogo (`saude.riscoDias` unificada) |
| 006-7 | fragmento `PARAM()` exportado; `auditar()` |
| 006-8 | `CC_CONTATO_COBRANCA.DATA/AGENTE_ID`; `CC_PROMESSA.SITUACAO` = `ABERTA`/`CUMPRIDA`/`QUEBRADA`; `CC_BAIXA.DECIDIDO_EM`; `CC_ACORDO.ENCERRADO_EM` + `SITUACAO`; `CC_COBRANCA.PROX_ACAO*` |
| 006-9 | `ccCobAgendaResumo` |
| 006-10 | ativo = `ENCERRADO_EM IS NULL`; `ccJurResumo` |
| 006-11 | `CC_SOLICITACAO.PRAZO_DECISAO/DECIDIDA_EM/DECISAO_RESULTADO`; `CC_RISCO_CLIENTE`; `CC_PEDIDO_RETIDO` |
| 006-12 | `CC_ANALISE_ORGAO.RATING_PUB` por `CC_CREDITO.ANALISE_ORGAO_ID`; `ccPubResumo` |

**Pedidos da 007 (11)**

| Pedido | Resolvido por |
|---|---|
| P-1 | `ccBaseParametroListar` |
| P-2 | `CC_AUDITORIA.CLIENTE_ID`; autor em `POR`/`POR_NOME`; `ccBaseAuditoriaListar({ clienteId })` |
| P-3 | IX (`CLIENTE_ID`) em `CC_ANEXO` |
| P-4 | `ccBaseAnexoRegistrar` com `MATERIAL` |
| P-5 | `lib/visibilidade.mjs`, `ccBaseSessao` |
| P-6 | IX (`CLIENTE_ID`) em `CC_EMAIL_ENVIADO`; `CC_RECEBIMENTO` com vencimento e pagamento |
| P-7 | tabelas da 002 com `CLIENTE_ID`, data, autor e texto |
| P-8 | `CC_PROCESSO.CLIENTE_ID`; andamento com `EM` e `AUTOR_ID` |
| P-9 | `CC_DECISAO.CLIENTE_ID`; rating e score em `CC_RISCO_CLIENTE`; fonte pagadora em `CC_SOLICITACAO.FP_NOME`; etapa em `KB_MOVIMENTO` |
| P-10 | `CC_NF_PUBLICA.CLIENTE_ID` e marcos; `CC_NF_ACAO.CLIENTE_ID` |
| P-11 | mapa de fontes em §7, fechado com os nomes de 02 |

## 12. Colisões resolvidas

| Colisão | Decisão |
|---|---|
| `ccPainelAgentes` (002 × 006) e demais `ccPainel*` da 002 | 002 = `ccCobPainel*`; 006 = `ccPainel*` |
| "Contato": pessoa do cliente (001) × registro de cobrança (002) | `ccBaseContato*` × `ccCobContato*` |
| "Acordo" de cobrança (002) × judicial (003) | `ccCobAcordo*` × `ccJurAcordo*` |
| "Agenda" da cobrança × do crédito | `ccCobAgenda*` × `ccCredAgendaListar` |
| sufixo de total (`…Total`, `…Totais`, `…Contar`) | sempre `…Total` |
| escrita interna (`…Gravar`, `cc…Inserir` solto) | sempre `ccEsc` + prefixo |
| nomes genéricos sem dono (`ccClienteListar`, `ccSolicitacaoMover`, `ccProcessoKpis`…) | prefixo da dona; `Kpis` do Jurídico = `ccJurIndicadores` |
| três editores de parâmetro | só `ccBaseParametroSalvar` |
| etapa em coluna × fase do card | fase do card; `CC_FASE` dá a chave |
| carteira no nome da SF | proibido (D-05): `carteira` é parâmetro |
