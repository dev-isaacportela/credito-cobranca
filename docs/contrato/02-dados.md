# 02 — Modelo de dados

Todas as tabelas `CC_` do sistema, por spec dona. Só o dono cria e escreve (os outros escrevem pela SF do dono). DDL em `backend/schema/NNN-<slug>.mjs`.

**Legenda de tipo:** `INT` · `DEC` = `DECIMAL(15,2)` · `PCT` = `DECIMAL(7,2)` · `D10` = `VARCHAR(10)` data `AAAA-MM-DD` · `D19` = `VARCHAR(19)` data e hora de Brasília · `M7` = `VARCHAR(7)` mês · `V(n)` = `VARCHAR(n)` · `BOOL` = `BOOLEAN` · `TEXT`.
**Nulo:** `N` = `NOT NULL` · `S` = aceita nulo. **Padrão:** `—` = sem padrão. Toda tabela tem `ID INT AUTO_INCREMENT PRIMARY KEY` (não repetido abaixo). Coluna de autor = `CC_MEMBRO.ID`; `NULL` = rotina.
**UQ** = `UNIQUE KEY` · **IX** = `INDEX`.

Resumo: 55 tabelas — 001: 22 · 002: 8 · 003: 8 · 004: 8 · 005: 5 · 006: 2 · 007: 2.

**Carteira (D-05):** `PRIVADA`, `ESTETICA`, `PUBLICA`. Cobrança e concessão têm **um** conjunto de tabelas; a carteira é a coluna `CARTEIRA`. Não há tabela `…_PUBLICA`/`…_ESTETICA` espelhando uma do privado: a 005 só tem as tabelas do que não existe no privado (órgão, NF pública, passos da NF, regra por ente, certidão).

## Mudanças em relação à arquitetura §4

| Tabela | Decisão | Motivo |
|---|---|---|
| `CC_COBRANCA_HIST`, `CC_SOLICITACAO_HIST` | **saem** | a etapa e o histórico de passagem moram no card (`KB_CARD.FASE_ID`, `KB_MOVIMENTO`) — arquitetura §8.2 |
| `CC_SOLICITACAO_CHECK` | **sai** | item de checklist é campo Sim/Não da fase no quadro (05-quadros.md) |
| `CC_CLIENTE.BU_ID` | **sai** | D-01: BU é do item; entram `CC_BU_DEPTO`, `CC_POSICAO_CLIENTE_BU`, `CC_POSICAO_CLIENTE_CARTEIRA` |
| `CC_PARAMETRO_DEF` | aceita, dono 001 | catálogo único (03-parametros.md) |
| `CC_FATURAMENTO_MES` | aceita, dono 001 | faturamento mensal por cliente × BU vem do Winthor; serve 004 e 006 |
| `CC_PLANO_PAGAMENTO` | aceita, dono 001 (o validador sugeria fundir em `CC_CLIENTE`) | a decisão de crédito e o painel listam **todos** os planos com prazo; lista ao vivo custaria uma leitura JDBC por tela e depende de S-07 |
| `CC_FASE` | nova, dono 001 | chave estável da fase → `KB_FASE.ID` (padrão `SGC_FASE` do SGC 2) |
| `CC_ROTINA_PASSO`, `CC_ESTADO` | novas, dono 001 | estado da rotina única e chaves de estado que não são política (ex.: carga do Jurídico concluída) |
| `CC_RISCO_CLIENTE`, `CC_PENDENCIA_WINTHOR`, `CC_CALIBRACAO_REVISAO` | aceitas, dono 004 | recomendação do validador (000 §3) |
| `CC_NOTIFICACAO_EXTRAJUDICIAL` (era `CC_NOTIFICACAO`), `CC_FILIAL_CREDORA` | aceitas, dono 003 | idem |
| `CC_ACAO_REGUA` | muda de grão | era item de checklist; passa a ser "ação da fase feita" por caso (o item é campo do card) |
| `CC_COBRANCA` | uma linha por **ciclo** de cobrança de cliente × carteira, com `CARD_ID` | um card por ciclo; checklist novo a cada ciclo; D-05: a mesma tabela serve as três carteiras (dono 002); no público a 005 calcula a etapa pela NF e a 002 grava (`ccCobCasoSincronizar`) |
| `CC_SOLICITACAO`, `CC_DECISAO`, `CC_CREDITO` | uma só para as três carteiras (D-05) | dono 004; dados do órgão em `CC_ANALISE_ORGAO` (005) |
| `CC_FOTO_AGING` | larga, uma linha por mês × cliente × BU | D-01 + leitura simples (soma) |

---

## 001-base

### CC_MEMBRO — pessoa da equipe
Lê: todas. Escreve: 001 (`ccEscBaseMembro*`, passo `ACESSOS`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| NOME | V(120) | N | — | nome de exibição |
| NOME_CHAVE | V(120) | N | — | nome minúsculo, sem acento, espaços colapsados |
| USER_EMAIL | V(160) | N | — | e-mail minúsculo; casa com `INT_USER.DESCR` |
| USER_ID | INT | S | — | `INT_USER.ID` (cache para responsável de card; conciliado pela rotina) |
| CARGO | V(12) | N | — | `AGENTE`, `ANALISTA`, `SUPERVISOR`, `GERENTE`, `DIRETORIA`, `JURIDICO` |
| NIVEL | INT | N | 1 | nível de alçada do cargo (01 §4) |
| SUPERIOR_ID | INT | S | — | membro acima; `NULL` só no topo |
| CAMINHO | V(200) | N | — | `/id-do-topo/…/ID/` (01 §6) |
| ADMIN | BOOL | N | FALSE | administrador do sistema |
| ATIVO | BOOL | N | TRUE | |
| CRIADO_EM, ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`NOME_CHAVE`), UQ (`USER_EMAIL`), IX (`SUPERIOR_ID`), IX (`CAMINHO`), IX (`USER_ID`).

### CC_BU — unidade de negócio
Lê: todas. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| NOME | V(80) | N | — | |
| CARTEIRA | V(10) | N | 'PRIVADA' | `PRIVADA` ou `ESTETICA` (público é setor do cliente, não BU) |
| ORDEM | INT | N | 0 | ordem de exibição |
| ATIVA | BOOL | N | TRUE | |

UQ (`NOME`). `BU_ID = 0` em outras tabelas = "Sem BU" (não há linha 0).

### CC_BU_DEPTO — departamento do Winthor → BU (D-01)
Lê: 001. Escreve: 001 (a leitura insere departamento novo com `BU_ID` nulo; o Administrador mapeia).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CODEPTO | INT | N | — | `PCDEPTO.CODEPTO` |
| DEPTO_NOME | V(200) | N | '' | `PCDEPTO.DESCRICAO` |
| BU_ID | INT | S | — | `NULL` = sem BU |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`CODEPTO`), IX (`BU_ID`).

### CC_CLIENTE — cliente espelhado do Winthor + gestão
Lê: todas. Escreve: 001 (leitura do Winthor só nas colunas do Winthor e `SETOR`; gestão por `ccEscBaseCliente*`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CODCLI | INT | N | — | código no Winthor |
| DOCUMENTO | V(14) | N | '' | CPF/CNPJ só dígitos |
| TIPO_PESSOA | V(1) | N | 'J' | `F` ou `J` |
| NOME | V(200) | N | — | razão social |
| FANTASIA | V(200) | N | '' | |
| NOME_BUSCA | V(400) | N | '' | nome + fantasia em maiúscula sem acento |
| UF | V(2) | N | '' | |
| MUNICIPIO | V(80) | N | '' | |
| ENDERECO | V(300) | N | '' | logradouro, número, bairro, CEP |
| TELEFONE | V(40) | N | '' | |
| EMAIL | V(160) | N | '' | e-mail do cadastro do Winthor (a ficha de contatos é a fonte da cobrança) |
| RAMO_COD | INT | S | — | `PCCLIENT.CODATV1` |
| RAMO | V(60) | N | '' | `PCATIVI.RAMO` |
| RCA_COD | INT | S | — | |
| RCA_NOME | V(80) | N | '' | |
| PLANO_COD | V(10) | N | '' | `CC_PLANO_PAGAMENTO.CODIGO` |
| BLOQUEADO_WINTHOR | BOOL | N | FALSE | bloqueio lido do ERP |
| CADASTRO_EM | D10 | S | — | data de cadastro no Winthor |
| SETOR | V(10) | N | 'PRIVADO' | `PRIVADO`/`PUBLICO`, derivado do ramo na leitura (D-02) |
| ESFERA | V(10) | S | — | `MUNICIPAL`/`ESTADUAL`/`FEDERAL`; do ramo (`base.ramosEsfera`) ou manual |
| GRUPO_ECONOMICO | V(120) | N | '' | manual |
| AGENTE_ID | INT | S | — | agente de cobrança (manual) |
| ANALISTA_ID | INT | S | — | analista do crédito vigente ou da solicitação ativa (gravado pela 004/005) |
| NO_JURIDICO | BOOL | N | FALSE | tem processo ativo (gravado pela 003) |
| CONTATOS_REVISADO_EM | D19 | S | — | última revisão da ficha de contatos |
| CONTATOS_REVISADO_POR | INT | S | — | |
| WINTHOR_LIDO_EM | D19 | S | — | |
| CRIADO_EM | D19 | S | — | |

UQ (`CODCLI`), IX (`DOCUMENTO`), IX (`NOME_BUSCA`(100)), IX (`AGENTE_ID`), IX (`ANALISTA_ID`), IX (`SETOR`).

### Bloco SALDOS (colunas comuns às três tabelas de posição e à foto)

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| A_VENCER | DEC | N | 0 | saldo de títulos com vencimento efetivo ≥ hoje |
| V_1_30 | DEC | N | 0 | vencido há 1–30 dias, **por título** |
| V_31_60 | DEC | N | 0 | 31–60 |
| V_61_90 | DEC | N | 0 | 61–90 |
| V_91_180 | DEC | N | 0 | 91–180 |
| V_180 | DEC | N | 0 | acima de 180 |
| VENCIDO | DEC | N | 0 | soma das cinco faixas |
| VDIAS | DECIMAL(18,2) | N | 0 | Σ (saldo vencido do título × dias de atraso do título) |
| DIAS_ATRASO | INT | N | 0 | hoje − vencimento do título vencido mais antigo |
| VENC_MAIS_ANTIGO | D10 | S | — | vencimento do título vencido mais antigo |
| PROX_VENC | D10 | S | — | menor vencimento ≥ hoje |
| PROX_VENC_VALOR | DEC | N | 0 | soma dos saldos que vencem em `PROX_VENC` |
| A_VENCER_7DU | DEC | N | 0 | saldo de títulos com vencimento efetivo de hoje até o 7º dia útil seguinte (`somarDiasUteis(hoje, 7)`, mesmo calendário do vencimento efetivo); resumo da agenda no painel (fechamento v2, DT-33) |
| TITULOS_ABERTOS | INT | N | 0 | |
| TITULOS_VENCIDOS | INT | N | 0 | |

Faixas e nomes são definição do sistema (constitution II). Saldo total = `A_VENCER + VENCIDO`.

### CC_POSICAO_CLIENTE — posição total do cliente (1 linha por cliente)
Lê: todas. Escreve: 001 (passo `SINC`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| CODCLI | INT | N | — | |
| *bloco SALDOS* | | | | todos os títulos do cliente |
| LIMITE | DEC | N | 0 | limite de crédito no Winthor |
| UTILIZADO | DEC | N | 0 | vencido + a vencer |
| DISPONIVEL | DEC | N | 0 | limite − utilizado |
| ULTIMA_COMPRA | D10 | S | — | |
| COMPRAS_QTD | INT | N | 0 | notas emitidas nos últimos `base.comprasJanelaDias` (padrão 90) |
| COMPRAS_VALOR | DEC | N | 0 | valor dessas notas |
| COMPRA_MEDIA_MENSAL | DEC | N | 0 | `COMPRAS_VALOR ÷ (base.comprasJanelaDias ÷ 30)` |
| PRAZO_MEDIO_DIAS | INT | N | 0 | média ponderada por valor de (vencimento − emissão) dos títulos emitidos na janela; sem título, o prazo do plano |
| PONTUALIDADE_PCT | PCT | S | — | % do valor pago nos últimos `base.pontualidadeMeses` que foi pago até o vencimento, sem estornados; `NULL` = sem pagamento no período |
| SINCRONIZACAO_ID | INT | N | 0 | leitura que gravou |
| SINCRONIZADO_EM | D19 | S | — | |
| ALTERADO_EM | D19 | S | — | só muda quando muda algum valor de saldo, limite, compras ou pontualidade |

UQ (`CLIENTE_ID`), IX (`ALTERADO_EM`), IX (`DIAS_ATRASO`).

### CC_POSICAO_CLIENTE_BU — posição por cliente × BU (D-01)
Lê: 002, 004, 006, 007. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| BU_ID | INT | N | 0 | 0 = sem BU |
| CARTEIRA | V(10) | N | 'PRIVADA' | `PUBLICA` se o cliente é público; senão a carteira da BU |
| *bloco SALDOS* | | | | parte do saldo de cada título rateada para a BU |
| SINCRONIZACAO_ID | INT | N | 0 | |
| ALTERADO_EM | D19 | S | — | |

UQ (`CLIENTE_ID`, `BU_ID`), IX (`BU_ID`), IX (`CARTEIRA`).

### CC_POSICAO_CLIENTE_CARTEIRA — posição por cliente × carteira
É a posição que a régua, o quadro e a fila de e-mail usam (um caso por cliente × carteira). Lê: 002, 003, 005, 006. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| CARTEIRA | V(10) | N | — | `PRIVADA`, `ESTETICA`, `PUBLICA` |
| *bloco SALDOS* | | | | soma das BUs da carteira |
| COMPOSICAO_BU | V(300) | N | '' | texto para a capa: `Nutrição 60% · Enfermagem 40%` (pelo saldo em aberto) |
| SINCRONIZACAO_ID | INT | N | 0 | |
| ALTERADO_EM | D19 | S | — | |

UQ (`CLIENTE_ID`, `CARTEIRA`), IX (`CARTEIRA`, `DIAS_ATRASO`).

### CC_FATURAMENTO_MES — faturamento mensal por cliente × BU
Lê: 004 (motor), 006 (índice de inadimplência, planos). Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| BU_ID | INT | N | 0 | |
| MES | M7 | N | — | mês da saída da nota |
| VALOR | DEC | N | 0 | faturado menos devolvido (regra do `p-44515`) |
| SINCRONIZACAO_ID | INT | N | 0 | |

UQ (`CLIENTE_ID`, `BU_ID`, `MES`), IX (`MES`). A leitura regrava o mês corrente e o anterior; a primeira carga traz desde janeiro do ano anterior.

### CC_PLANO_PAGAMENTO — planos de pagamento do Winthor
Lê: 004, 005, 006. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CODIGO | V(10) | N | — | `PCPLPAG.CODPLPAG` |
| DESCRICAO | V(80) | N | '' | |
| PRAZO_MEDIO | INT | N | 0 | dias |
| ATIVO | BOOL | N | TRUE | FALSE quando some do Winthor |

UQ (`CODIGO`).

### CC_RECEBIMENTO — pagamentos lidos do Winthor
Lê: 002, 004, 006, 007. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CHAVE | V(60) | N | — | `NUMTRANSVENDA|PREST|DTPAG` (a confirmar; alternativa `CODFILIAL|DUPLIC|PREST|DTPAG`) |
| CLIENTE_ID | INT | N | — | |
| CODCLI | INT | N | — | |
| TITULO | V(20) | N | '' | |
| PARCELA | V(4) | N | '' | |
| FILIAL | V(4) | N | '' | |
| BU_ID | INT | N | 0 | BU de maior parte do título |
| CARTEIRA | V(10) | N | 'PRIVADA' | carteira dessa BU (ou `PUBLICA`) |
| VENCIMENTO | D10 | N | — | |
| DATA_PAGAMENTO | D10 | N | — | |
| VALOR_PAGO | DEC | N | 0 | |
| DIAS_ATRASO_PAGAMENTO | INT | N | 0 | `max(0, pagamento − vencimento)`; > 0 = recuperação |
| ESTORNADO | BOOL | N | FALSE | |
| ESTORNADO_EM | D19 | S | — | |
| SINCRONIZACAO_ID | INT | N | 0 | |
| LIDO_EM | D19 | S | — | |

UQ (`CHAVE`), IX (`CLIENTE_ID`, `DATA_PAGAMENTO`), IX (`DATA_PAGAMENTO`). Todo consumidor filtra `ESTORNADO = FALSE`. Primeira carga desde janeiro do ano anterior; depois, janela de 40 dias.

### CC_SINCRONIZACAO — log de cada leitura do Winthor
Lê: 001, 006. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| SITUACAO | V(12) | N | — | `SOLICITADA`, `EM_ANDAMENTO`, `OK`, `ERRO` |
| SOLICITADA_POR | INT | S | — | pedido manual |
| SOLICITADA_EM | D19 | S | — | |
| INICIO | D19 | S | — | |
| FIM | D19 | S | — | |
| FASE | V(20) | N | '' | etapa da leitura retomável (`PLANOS`, `CLIENTES`, `FECHAR`; a página de `CLIENTES` grava o cliente inteiro: cadastro, compras, posição, recebimentos e faturamento — D-010 da 001) |
| CURSOR | INT | N | 0 | ponto de retomada da fase (o último `CODCLI` lido) |
| CLIENTES_LIDOS, CLIENTES_NOVOS, POSICOES_GRAVADAS, POSICOES_ZERADAS, RECEBIMENTOS_NOVOS, RECEBIMENTOS_ESTORNADOS | INT | N | 0 | contagens |
| ERRO | V(1000) | N | '' | |

IX (`SITUACAO`, `INICIO`).

### CC_ROTINA_PASSO — estado dos passos da rotina por leitura
Lê/escreve: 001 (`ccRotina`); cada passo atualiza a própria linha por `ccEscBaseRotinaPasso`.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| SINCRONIZACAO_ID | INT | N | — | leitura `OK` que o passo processa |
| PASSO | V(10) | N | — | `ACESSOS`, `REGUA`, `CREDITO`, `PUBLICO`, `FOTO` |
| SITUACAO | V(12) | N | 'PENDENTE' | `PENDENTE`, `EM_ANDAMENTO`, `OK`, `ERRO` |
| INICIO, FIM | D19 | S | — | |
| PROCESSADOS | INT | N | 0 | |
| PENDENTES | INT | N | 0 | o que ficou para a próxima rodada |
| EXECUCOES | INT | N | 0 | execuções de SF gastas |
| ERRO | V(1000) | N | '' | |

UQ (`SINCRONIZACAO_ID`, `PASSO`).

### CC_ESTADO — chave e valor de estado (não é política)
Lê/escreve: 001 pela `ccEscBaseEstado`; chaves: `rotina.trava`, `rotina.diaCompleto.<PASSO>` (último dia com rodada completa), `jur.cargaConcluida`, `winthor.descoberta`, `pub.nfCorteLido` (005, só a rotina: data de corte das NFs já lida). A guarda de `ccEscBaseEstado` aceita a rotina em qualquer chave; pessoa, só quem administra (`PODE_ADMINISTRAR`) e só em `winthor.descoberta` e em `jur.cargaConcluida` = `'1'` (a carga concluída não reabre por SF).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CHAVE | V(60) | N | — | |
| VALOR | V(500) | N | '' | |
| ATUALIZADO_EM | D19 | S | — | |

UQ (`CHAVE`).

### CC_PARAMETRO_DEF — catálogo de parâmetros
Lê: todas (pela 001). Escreve: `setup-backend.mjs` (funde `lib/parametros/*`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CHAVE | V(60) | N | — | `grupo.chave` |
| GRUPO | V(30) | N | — | código do grupo (prefixo da chave, 03) |
| ORDEM | INT | N | 0 | |
| ROTULO | V(160) | N | — | |
| TIPO | V(12) | N | — | `INTEIRO`, `DECIMAL`, `PERCENTUAL`, `MOEDA`, `RATING`, `TEXTO`, `LISTA`, `OPCAO`, `DATA` |
| UNIDADE | V(30) | N | '' | |
| PADRAO | V(200) | N | '' | |
| MINIMO, MAXIMO | DECIMAL(15,4) | S | — | |
| OPCOES | V(300) | N | '' | valores aceitos de `OPCAO`, separados por vírgula |
| POR_CARTEIRA | BOOL | N | FALSE | aceita valor por carteira |
| COM_VIGENCIA | BOOL | N | FALSE | leitura na data de referência (senão, sempre o valor de hoje) |
| SPEC_DONA | V(3) | N | — | `001`…`007` |
| USADO_POR | V(40) | N | '' | |
| DESCRICAO | V(300) | N | '' | |
| VALIDADO | BOOL | N | TRUE | FALSE = número aguardando validação do Jurídico/Gerência (P-06) |

UQ (`CHAVE`), IX (`GRUPO`, `ORDEM`).

### CC_PARAMETRO — valores por carteira e vigência
Lê: todas (por `parametros()`/`PARAM()`). Escreve: 001 (`ccEscBaseParametro`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CHAVE | V(60) | N | — | |
| CARTEIRA | V(10) | N | '' | `''` = padrão (é o valor da carteira `PRIVADA`); `ESTETICA` ou `PUBLICA` = valor próprio da carteira. Só existe linha de carteira para quem define valor diferente (D-05) |
| VALOR | V(200) | S | — | `NULL` = a carteira volta a herdar o padrão a partir dessa vigência |
| VIGENCIA_INICIO | D10 | N | — | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | `NULL` = carga do padrão |

UQ (`CHAVE`, `CARTEIRA`, `VIGENCIA_INICIO`).

### CC_FERIADO
Lê: todas (dias úteis). Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| DATA | D10 | N | — | |
| NOME | V(120) | N | — | |
| ABRANGENCIA | V(10) | N | — | `NACIONAL`, `UF`, `MUNICIPIO` |
| UF | V(2) | N | '' | |
| MUNICIPIO | V(80) | N | '' | |
| ORIGEM | V(8) | N | 'MANUAL' | `GERADO`, `MANUAL` |

UQ (`DATA`, `ABRANGENCIA`, `UF`, `MUNICIPIO`).

### CC_CONTATO_CLIENTE — ficha de contatos
Lê: 002, 004, 005, 007. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| NOME | V(120) | N | — | |
| AREA | V(40) | N | '' | lista do artefato (A §4.7) |
| FUNCAO | V(60) | N | '' | lista do artefato + `Ordenador de despesa`, `Fiscal do contrato`, `Gestor do contrato` (público) |
| TELEFONE, WHATSAPP | V(40) | N | '' | |
| EMAIL | V(160) | N | '' | |
| SITUACAO | V(12) | N | 'PENDENTE' | `CONFIRMADO`, `PENDENTE`, `SEM_SUCESSO`, `NAO_USAR` |
| OBS | V(500) | N | '' | |
| PRINCIPAL | BOOL | N | FALSE | um por cliente (o "preferido" das outras specs) |
| BUSCA | V(400) | N | '' | nome + e-mail + telefone em maiúscula sem acento (busca igual no MySQL e no SQLite, 06 §5); mantida por `ccEscBaseContato*` |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

IX (`CLIENTE_ID`), IX (`BUSCA`(100)).

### CC_MODELO_MENSAGEM
Lê: 002, 003, 005 (pela 001). Escreve: 001; seed de cada spec por `lib/modelos/NNN`.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CODIGO | V(40) | N | — | |
| NOME | V(120) | N | — | |
| SPEC_DONA | V(3) | N | — | |
| ASSUNTO | V(300) | N | '' | |
| CORPO | TEXT | N | — | texto com `[CAMPO]` |
| CAMPOS_EXTRAS | V(300) | N | '' | nomes separados por vírgula |
| EFEITO_LEGAL | BOOL | N | FALSE | |
| VERSAO | INT | N | 1 | sobe a cada alteração de assunto ou corpo |
| ATIVO | BOOL | N | TRUE | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |
| VALIDADO_POR | INT | S | — | |
| VALIDADO_EM | D19 | S | — | |
| VALIDADO_VERSAO | INT | S | — | validação vale se = `VERSAO` e dentro de `com.modeloRevalidarMeses` |

UQ (`CODIGO`).

### CC_EMAIL_ENVIADO
Lê: 002, 005, 007. Escreve: 001 (`ccEmailEnviar`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| MODELO_ID | INT | S | — | |
| MODELO_CODIGO | V(40) | N | '' | |
| MODELO_VERSAO | INT | N | 0 | |
| CLIENTE_ID | INT | S | — | |
| PARA | V(500) | N | — | |
| ASSUNTO | V(300) | N | — | |
| CORPO | TEXT | N | — | texto final (não o HTML) |
| ORIGEM | V(30) | N | '' | 01 §13 |
| REFERENCIA | V(80) | N | '' | chave de quem pediu (ex.: `fila:123`, `nf:45:G1`) |
| ENVIADO_EM | D19 | N | — | |
| ENVIADO_POR | INT | S | — | |
| RESULTADO | V(8) | N | — | `ENVIADO`, `FALHOU` |
| ERRO | V(500) | N | '' | |

IX (`CLIENTE_ID`), IX (`REFERENCIA`).

### CC_ANEXO — arquivo fora de card
Lê: 005, 007. Escreve: 001.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| ENTIDADE | V(20) | N | — | `CLIENTE`, `MATERIAL`, `CERTIDAO` |
| ENTIDADE_ID | INT | N | — | |
| CLIENTE_ID | INT | S | — | |
| TIPO_DOC | V(40) | N | '' | |
| NOME_ARQUIVO | V(255) | N | — | |
| MIME | V(80) | N | '' | |
| TAMANHO_BYTES | INT | N | 0 | |
| URL | TEXT | N | — | endereço público (01 §12) |
| ENVIADO_EM | D19 | N | — | |
| ENVIADO_POR | INT | S | — | |
| REMOVIDO_EM | D19 | S | — | remoção lógica |
| REMOVIDO_POR | INT | S | — | |

IX (`ENTIDADE`, `ENTIDADE_ID`), IX (`CLIENTE_ID`). Guarda de leitura e escrita: `CLIENTE` = cliente visível; `MATERIAL` = leitura para todo membro, escrita `PODE_ADMINISTRAR` (D-06); `CERTIDAO` = leitura para todo membro, escrita `NIVEL_MIN(2)` (01 §5).

### CC_AUDITORIA
Lê: 001 (tela), 007 (histórico). Escreve: 001 (`ccEscBaseAuditoria`). Sem `UPDATE`/`DELETE`.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| EM | D19 | N | — | |
| AREA | V(30) | N | — | 01 §7 |
| ENTIDADE | V(40) | N | — | nome da tabela sem `CC_` (ex.: `ACORDO`) |
| ENTIDADE_ID | INT | N | 0 | |
| CLIENTE_ID | INT | S | — | |
| CAMPO | V(60) | N | — | |
| ANTES | V(1000) | N | '' | |
| DEPOIS | V(1000) | N | '' | |
| POR | INT | S | — | `NULL` = rotina |
| POR_NOME | V(120) | N | '' | nome na data |

IX (`EM`), IX (`AREA`), IX (`CLIENTE_ID`), IX (`POR`), IX (`ENTIDADE`, `ENTIDADE_ID`).

### CC_FASE — chave estável das fases dos quadros
Lê: todas. Escreve: seed do quadro (dono do quadro, por `semearQuadro()` da 001).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| QUADRO | V(40) | N | — | slug do quadro |
| BOARD_ID | INT | N | — | `KB_BOARD.ID` |
| CHAVE | V(30) | N | — | chave estável (05-quadros.md) |
| FASE_ID | INT | N | — | `KB_FASE.ID` |
| ORDEM | INT | N | 0 | |
| FINAL | BOOL | N | FALSE | fase final (sucesso ou cancelado) |

UQ (`QUADRO`, `CHAVE`), IX (`FASE_ID`), IX (`BOARD_ID`).

Junção canônica "fase atual de um caso" (fragmento `FASE_DO_CARD('X')` em `lib/quadros.mjs`):
`JOIN KB_CARD K ON K.ID = X.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID` → `F.CHAVE`, `K.FASE_DESDE` (UTC), `K.CONCLUIDO_EM`.

---

## 002-cobranca-privada

A etapa do caso é a fase do card (`FASE_DO_CARD('CB')`). Chaves das fases em `05-quadros.md` §3.

### CC_COBRANCA — caso de cobrança (um ciclo de um cliente numa carteira)
Lê: 003, 004, 005, 006, 007. Escreve: 002 (`ccEscCob*`, passo `REGUA`); a 005 abre, move e fecha casos da carteira `PUBLICA` por `ccCobCasoSincronizar`; a 003 marca o envio ao Jurídico por `ccCobEnviarJuridico`.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| CARTEIRA | V(10) | N | — | `PRIVADA`, `ESTETICA`, `PUBLICA` (define o quadro) |
| ATIVO_CHAVE | V(30) | S | — | `<CLIENTE_ID>:<CARTEIRA>` enquanto o caso está aberto; `NULL` ao encerrar (garante um caso aberto por cliente × carteira) |
| CARD_ID | INT | S | — | `KB_CARD.ID`; `NULL` só entre a criação da linha e a do card |
| ABERTO_EM | D19 | N | — | |
| ENCERRADO_EM | D19 | S | — | |
| DESFECHO | V(16) | N | '' | `''` aberto, `PAGO_NO_PRAZO` (só preventiva), `REGULARIZADO`, `BAIXADO` |
| DATA_REF | D10 | S | — | vencimento de referência do ciclo: próximo vencimento (preventiva) ou título vencido mais antigo (régua) |
| PROX_ACAO | V(200) | N | '' | próxima ação combinada |
| PROX_ACAO_DATA | D10 | S | — | |
| PROTESTADO | BOOL | N | FALSE | título enviado a protesto neste ciclo |
| ANUENCIA_ATE | D10 | S | — | prazo da carta de anuência (regularização + `cob.anuenciaDiasUteis`) |
| ANUENCIA_EM | D19 | S | — | carta enviada |
| ANUENCIA_POR | INT | S | — | |
| JURIDICO_EM | D19 | S | — | envio ao Jurídico |
| JURIDICO_POR | INT | S | — | |
| PROCESSO_ID | INT | S | — | `CC_PROCESSO.ID` do envio |
| BLOQUEIO_DEVIDO | V(8) | N | '' | `''`, `PEDIDOS`, `TOTAL` (calculado pela régua) |
| BLOQUEIO_APLICADO | V(8) | N | '' | o que o agente registrou como aplicado no ERP |
| BLOQUEIO_APLICADO_EM | D19 | S | — | |
| BLOQUEIO_APLICADO_POR | INT | S | — | |
| VALOR_BAIXADO | DEC | N | 0 | soma das baixas aprovadas no ciclo; o caso só encerra `BAIXADO` quando alcança o vencido da carteira |
| CAPA_ENVIADA | TEXT | S | — | texto exato do último `capaJson` gravado no card, sem reformatar (quem chama só chama `kbCardAtualizar` se mudar) |
| FASE_DEVIDA | V(30) | N | '' | chave da fase que o sistema mandou por último (`ccCobCasoSincronizar`, gravada antes de mover); o gancho só aceita movimento entre fases da régua para ela (04 §8, DT-35) |
| ATUALIZADO_EM | D19 | S | — | |

UQ (`ATIVO_CHAVE`), IX (`CLIENTE_ID`), IX (`CARD_ID`), IX (`CARTEIRA`, `ENCERRADO_EM`).

### CC_ACAO_REGUA — ação da fase feita (por caso)
Lê: 005, 006, 007. Escreve: 002.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| COBRANCA_ID | INT | N | — | |
| CLIENTE_ID | INT | N | — | |
| FASE_CHAVE | V(30) | N | — | fase em que a ação foi feita |
| FEITA_EM | D19 | N | — | |
| FEITA_POR | INT | S | — | |
| ORIGEM | V(10) | N | — | `BOTAO` (ação extra), `CARD` (itens marcados no card, lidos pela rotina), `EMAIL`, `BLOQUEIO`, `ANUENCIA`, `JURIDICO`, `ACORDO` |
| NO_PRAZO | BOOL | N | TRUE | feita até o **prazo da ação**: o dia em que o caso entrou na fase (`KB_BRASILIA(K.FASE_DESDE)`, só a data), levado ao próximo dia útil se não for útil; em fase com `SLA_HORAS > 0`, a entrada + SLA. É a mesma data do evento `ACAO_REGUA` da agenda — indicador "cumprimento dos prazos" |

UQ (`COBRANCA_ID`, `FASE_CHAVE`), IX (`CLIENTE_ID`), IX (`FEITA_POR`, `FEITA_EM`).

### CC_CONTATO_COBRANCA — contato feito com o cliente ou órgão
Lê: 005, 006, 007. Escreve: 002 (`ccCobContatoRegistrar`, usado também pelo público).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| COBRANCA_ID | INT | S | — | caso aberto na hora, se havia |
| NF_ID | INT | S | — | `CC_NF_PUBLICA.ID` quando o contato é sobre uma NF |
| DATA | D10 | N | — | não pode ser futura |
| CANAL | V(20) | N | — | `Telefone`, `WhatsApp`, `E-mail`, `Visita`, `Carta`, `Ofício`, `Portal do órgão` |
| FALOU_COM | V(120) | N | '' | |
| RETORNO | V(40) | N | '' | lista do artefato (C §1.3) + `Aguardando liquidação (órgão)` |
| PREVISAO | D10 | S | — | data prometida |
| VALOR | DEC | N | 0 | valor prometido |
| FEEDBACK | V(2000) | N | — | obrigatório |
| AGENTE_ID | INT | N | — | sempre quem está logado |
| ORIGEM | V(12) | N | 'MANUAL' | `MANUAL`, `EMAIL_REGUA`, `FORA` (canal fora do sistema), `REGUA_PUB` |
| EMAIL_ENVIADO_ID | INT | S | — | |
| CRIADO_EM | D19 | N | — | |

IX (`CLIENTE_ID`, `DATA`), IX (`AGENTE_ID`, `DATA`).

### CC_PROMESSA
Lê: 006, 007. Escreve: 002.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| COBRANCA_ID | INT | S | — | |
| CONTATO_ID | INT | N | — | |
| DATA_CONTATO | D10 | N | — | |
| DATA_PROMETIDA | D10 | N | — | |
| VALOR | DEC | N | 0 | 0 = sem valor |
| SITUACAO | V(10) | N | 'ABERTA' | `ABERTA`, `CUMPRIDA`, `QUEBRADA` (reavaliada pela rotina) |
| AVALIADA_EM | D19 | S | — | |
| AGENTE_ID | INT | N | — | |

IX (`CLIENTE_ID`), IX (`SITUACAO`, `DATA_PROMETIDA`), IX (`AGENTE_ID`).

### CC_ACORDO — acordo extrajudicial
Lê: 004, 006, 007. Escreve: 002.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| COBRANCA_ID | INT | N | — | |
| CARTEIRA | V(10) | N | — | |
| DEBITO | DEC | N | 0 | saldo vencido da carteira na proposta |
| VALOR | DEC | N | 0 | valor do acordo |
| DESCONTO | DEC | N | 0 | débito − valor, se positivo |
| ENTRADA | DEC | N | 0 | |
| ENTRADA_DATA | D10 | S | — | |
| N_PARCELAS | INT | N | 0 | sem a entrada |
| PRIMEIRO_VENC | D10 | S | — | |
| INTERVALO_DIAS | INT | N | 30 | |
| GARANTIA | V(500) | N | '' | |
| NIVEL_EXIGIDO | INT | N | 2 | gravado na proposta pela regra de alçada; a guarda da decisão lê daqui |
| MOTIVO_NIVEL | V(200) | N | '' | por que subiu de alçada |
| SITUACAO | V(10) | N | 'PROPOSTO' | `PROPOSTO`, `RECUSADO`, `ATIVO`, `QUITADO`, `QUEBRADO`, `CANCELADO` |
| PROPOSTO_POR | INT | N | — | |
| PROPOSTO_EM | D19 | N | — | |
| DECIDIDO_POR | INT | S | — | ≠ `PROPOSTO_POR` |
| DECIDIDO_EM | D19 | S | — | |
| PARECER | V(1000) | N | '' | |
| ENCERRADO_EM | D19 | S | — | quitação, quebra ou cancelamento |

IX (`CLIENTE_ID`), IX (`COBRANCA_ID`), IX (`SITUACAO`). No máximo um `PROPOSTO` ou `ATIVO` por caso (condição `NOT EXISTS` na escrita).

### CC_ACORDO_PARCELA

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| ACORDO_ID | INT | N | — | |
| CLIENTE_ID | INT | N | — | |
| N | INT | N | — | 0 = entrada |
| VENC | D10 | N | — | já levado ao próximo dia útil |
| VALOR | DEC | N | 0 | |
| PAGO_EM | D10 | S | — | |
| PAGO_POR | INT | S | — | |

UQ (`ACORDO_ID`, `N`), IX (`CLIENTE_ID`), IX (`VENC`). Escreve: 002. Lê: 006, 007.

### CC_BAIXA — baixa como perda
Lê: 003, 006, 007. Escreve: 002.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| COBRANCA_ID | INT | N | — | |
| VALOR | DEC | N | 0 | > 0 e ≤ vencido da carteira |
| MOTIVO | V(60) | N | — | um dos 5 motivos da RN-013 da 002 |
| DOC_REGUA, DOC_PARECER, DOC_PROTESTO, DOC_ACORDO | BOOL | N | FALSE | documentos de suporte (não bloqueiam) |
| OBS | V(1000) | N | '' | |
| NIVEL_EXIGIDO | INT | N | 3 | pela tabela de alçada da baixa (03 §7) |
| SITUACAO | V(10) | N | 'PENDENTE' | `PENDENTE`, `APROVADA`, `RECUSADA` |
| PROPOSTO_POR | INT | N | — | |
| PROPOSTO_EM | D19 | N | — | |
| PARECER_RESULTADO | V(12) | N | '' | `FAVORAVEL`, `DESFAVORAVEL` (cargo `JURIDICO`) |
| PARECER_TEXTO | V(1000) | N | '' | |
| PARECER_POR | INT | S | — | |
| PARECER_EM | D19 | S | — | |
| DECIDIDO_POR | INT | S | — | ≠ `PROPOSTO_POR` |
| DECIDIDO_EM | D19 | S | — | |
| DECISAO_TEXTO | V(1000) | N | '' | |

IX (`CLIENTE_ID`), IX (`COBRANCA_ID`), IX (`SITUACAO`). Uma `PENDENTE` por caso.

### CC_EMAIL_FILA — e-mail da régua a enviar
Lê: 006. Escreve: 002.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| COBRANCA_ID | INT | N | — | |
| CLIENTE_ID | INT | N | — | |
| FASE_CHAVE | V(30) | N | — | |
| DATA_REF | D10 | N | — | |
| CHAVE | V(80) | N | — | `<COBRANCA_ID>:<FASE_CHAVE>:<DATA_REF>` |
| VALOR | DEC | N | 0 | para ordenar |
| SITUACAO | V(10) | N | 'PENDENTE' | `PENDENTE`, `ENVIADO`, `FORA` |
| CRIADO_EM | D19 | N | — | |
| APROVADO_POR | INT | S | — | |
| APROVADO_EM | D19 | S | — | |
| ENVIADO_POR | INT | S | — | |
| ENVIADO_EM | D19 | S | — | |
| EMAIL_ENVIADO_ID | INT | S | — | |
| CANAL_FORA | V(20) | N | '' | canal usado quando resolvido fora do sistema |
| OBS | V(500) | N | '' | |

UQ (`CHAVE`), IX (`SITUACAO`), IX (`CLIENTE_ID`). A linha nasce para toda fase com modelo cujo `cob.emailModo` **não** é `AUTOMATICO` (`MANUAL` e `APROVAR`), com a ação da fase ainda não feita. Destinatário, modo, assunto e corpo não são gravados aqui: saem do modelo, do parâmetro `cob.emailModo.*` e da ficha na hora de listar e enviar. Descartar na fila = `FORA`.

---

## 003-juridico

A etapa do processo é a fase do card no quadro `juridico` (`FASE_DO_CARD('P')`). "Ativo" = card não concluído.

### CC_PROCESSO
Lê: 002, 005, 006, 007. Escreve: 003.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CARD_ID | INT | S | — | |
| CLIENTE_ID | INT | S | — | `NULL` só em processo da carga ainda sem vínculo |
| COBRANCA_ID | INT | S | — | caso de cobrança que originou |
| NOME_DEVEDOR | V(200) | N | '' | |
| DOCUMENTO | V(20) | N | '' | |
| SETOR | V(10) | N | 'PRIVADO' | `PRIVADO`/`PUBLICO` |
| CARTEIRA | V(10) | N | 'PRIVADA' | carteira do caso de origem |
| BU_ID | INT | N | 0 | BU de maior saldo no envio (informativo) |
| LINHA | V(12) | N | '' | `''`/`GALDERMA` |
| FILIAL | V(10) | N | '' | `CC_FILIAL_CREDORA.CODIGO` |
| VALOR | DEC | N | 0 | principal (vencido no envio) |
| VALOR_ATUALIZADO | DEC | N | 0 | com encargos, na data do envio |
| AUTOS | V(25) | N | '' | padrão CNJ |
| TRIBUNAL | V(20) | N | '' | |
| RESPONSAVEL_ID | INT | S | — | membro `JURIDICO` |
| STATUS | V(300) | N | '' | situação em texto |
| PRAZO | D10 | S | — | |
| PRAZO_DESCRICAO | V(200) | N | '' | |
| SUBSTABELECER | BOOL | N | FALSE | |
| FORMA_CITACAO | V(10) | N | '' | `PESSOAL`, `EDITAL`, `CURADOR` |
| RESULTADO_SENTENCA | V(12) | N | '' | `FAVORAVEL`, `PARCIAL`, `DESFAVORAVEL` |
| RECUPERADO_INFORMADO | DEC | S | — | `NULL` = derivar |
| MOTIVO_ENCERRAMENTO | V(16) | N | '' | `QUITADO`, `ACORDO_CUMPRIDO`, `BAIXA_PERDA`, `EXTINTO`, `OUTRO` |
| MOTIVO_TEXTO | V(300) | N | '' | |
| ENCERRADO_EM | D19 | S | — | |
| OBS | V(2000) | N | '' | |
| ORIGEM | V(10) | N | — | `COBRANCA`, `MANUAL`, `CARGA` |
| DOSSIE_ABERTO_EM | D19 | S | — | |
| DOSSIE_ABERTO_POR | INT | S | — | |
| DOSSIE_ENVIADO_EM | D19 | S | — | |
| DOSSIE_ENVIADO_POR | INT | S | — | nível ≥ `jur.envioNivelMin` |
| ULTIMO_ANDAMENTO_EM | D19 | S | — | mantido pela escrita de andamento (alertas "parado") |
| CHAVE_CARGA | V(80) | S | — | chave da linha na planilha |
| ALERTA_CARGA | V(1000) | N | '' | |
| SUGESTAO_CLIENTES | V(200) | N | '' | ids CSV |
| CARGA_CONFERIDA_EM | D19 | S | — | |
| CARGA_CONFERIDA_POR | INT | S | — | |
| CRIADO_EM | D19 | N | — | |
| CRIADO_POR | INT | S | — | |

UQ (`CHAVE_CARGA`), IX (`CLIENTE_ID`), IX (`CARD_ID`), IX (`AUTOS`), IX (`RESPONSAVEL_ID`).

### CC_DOSSIE_ITEM — documento do dossiê

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| PROCESSO_ID | INT | N | — | |
| ITEM | V(10) | N | — | um dos 17 códigos (05 §8) |
| SITUACAO | V(10) | N | 'PENDENTE' | `PENDENTE`, `OK`, `NA` (não se aplica; exige `OBS`) — o mesmo valor na SF e em 05 §8 |
| OBS | V(500) | N | '' | |
| ORIGEM | V(10) | N | 'MANUAL' | `SUGESTAO`, `MANUAL`, `ANEXO`, `ENVIO` |
| KB_ANEXO_IDS | V(200) | N | '' | ids dos anexos do card ligados ao item; lista acima de 200 caracteres é recusada ("Até 25 anexos por item: junte os arquivos num só PDF.") |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`PROCESSO_ID`, `ITEM`). Lê: 007. Escreve: 003.

### CC_PROCESSO_ANDAMENTO

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| PROCESSO_ID | INT | N | — | |
| EM | D19 | N | — | |
| PERIODO | V(30) | N | '' | rótulo da planilha (carga) |
| TEXTO | V(2000) | N | — | |
| AUTOR_ID | INT | S | — | |
| AUTOR_NOME | V(120) | N | '' | autor da planilha, quando carga |
| TIPO | V(10) | N | 'MANUAL' | `MANUAL`, `SISTEMA`, `CARGA` (mudança de fase fica em `KB_MOVIMENTO`, não vira andamento) |

IX (`PROCESSO_ID`, `EM`). Sem `UPDATE`/`DELETE`. Lê: 007. Escreve: 003.

### CC_PROCESSO_CUSTO

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| PROCESSO_ID | INT | N | — | |
| TIPO | V(16) | N | — | 12 códigos (E §1.6); grupo derivado em `lib/juridico` |
| DATA | D10 | N | — | |
| VALOR | DEC | N | 0 | > 0 |
| OBS | V(500) | N | '' | |
| PAGO | BOOL | N | FALSE | comprovante ⇒ pago |
| GUIA_KB_ANEXO_ID | INT | S | — | anexo do card |
| COMPROVANTE_KB_ANEXO_ID | INT | S | — | |
| CRIADO_EM | D19 | N | — | |
| CRIADO_POR | INT | S | — | |
| REMOVIDO_EM | D19 | S | — | remoção lógica |
| REMOVIDO_POR | INT | S | — | |

IX (`PROCESSO_ID`). Lê: 007. Escreve: 003.

### CC_ACORDO_JUDICIAL

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| PROCESSO_ID | INT | N | — | |
| VALOR | DEC | N | 0 | |
| ENTRADA | DEC | N | 0 | |
| N_PARCELAS | INT | N | 0 | |
| HONORARIOS | DEC | N | 0 | |
| HONORARIOS_PAGOS | BOOL | N | FALSE | |
| HONORARIOS_PAGOS_EM | D10 | S | — | |
| SITUACAO | V(12) | N | 'AGUARDANDO' | `AGUARDANDO` (aprovação), `ANDAMENTO`, `QUITADO`, `RECUSADO` (a alçada não aprovou) |
| SITUACAO_TEXTO | V(100) | N | '' | texto da planilha |
| ACIMA_ALCADA | BOOL | N | FALSE | fora da política na criação |
| NIVEL_EXIGIDO | INT | N | 0 | 0 = dentro da política |
| REGISTRADO_POR | INT | S | — | |
| REGISTRADO_EM | D19 | N | — | |
| APROVADO_POR | INT | S | — | ≠ `REGISTRADO_POR` |
| APROVADO_EM | D19 | S | — | |

IX (`PROCESSO_ID`). No máximo um `AGUARDANDO` ou `ANDAMENTO` por processo (condição `NOT EXISTS` na escrita); o recusado fica como histórico e o processo pode registrar outro. "O acordo do processo" = o mais recente não `RECUSADO`. Lê: 006, 007. Escreve: 003.

### CC_ACORDO_JUDICIAL_PARCELA

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| ACORDO_ID | INT | N | — | |
| NUMERO | INT | N | — | 0 = entrada |
| VALOR | DEC | N | 0 | |
| VENCIMENTO | D10 | N | — | |
| SITUACAO | V(12) | N | 'ABERTA' | `ABERTA`, `PAGA`, `A_CONFIRMAR` (só nasce na carga, pela cor da planilha; a pessoa grava só `ABERTA`/`PAGA`; vencida é derivada) |
| PAGO_EM | D10 | S | — | |
| ORIGEM_SITUACAO | V(12) | N | 'MANUAL' | `MANUAL`, `COR_PLANILHA` |
| ATUALIZADO_POR | INT | S | — | |

UQ (`ACORDO_ID`, `NUMERO`).

### CC_NOTIFICACAO_EXTRAJUDICIAL — emissão registrada

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| PROCESSO_ID | INT | S | — | |
| COBRANCA_ID | INT | S | — | |
| FILIAL | V(10) | N | — | |
| EMITIDA_EM | D10 | N | — | |
| PRAZO_ATE | D10 | N | — | emissão + `jur.notifPrazoDias` corridos |
| PRINCIPAL, MULTA, JUROS, CORRECAO, TOTAL | DEC | N | 0 | valores da emissão |
| MODELO_VERSAO | INT | N | 0 | |
| EMITIDA_POR | INT | N | — | |

IX (`CLIENTE_ID`). Lê: 002 (sugestão do dossiê, item da fase extrajudicial), 007. Escreve: 003.

### CC_FILIAL_CREDORA

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CODIGO | V(10) | N | — | `PCFILIAL.CODIGO` (= `CODFILIAL` do Winthor) |
| RAZAO_SOCIAL | V(200) | N | '' | |
| CNPJ | V(18) | N | '' | |
| ENDERECO | V(300) | N | '' | |
| CIDADE_UF | V(60) | N | '' | |
| UF | V(2) | N | '' | |
| BANCO | V(300) | N | '' | dados de pagamento da notificação |
| REPRESENTANTE | V(120) | N | '' | |
| REPRESENTANTE_CARGO | V(80) | N | '' | |
| ATIVA | BOOL | N | TRUE | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`CODIGO`). Lê: 005 (CNPJ das certidões). Escreve: 003. Banco e representante saem dos parâmetros `JUR_NOTIF_*` e passam a ser cadastro da filial.

---

## 004-concessao-credito

A etapa da solicitação e do pedido é a fase do card. Solicitação é **genérica**: privado, estética e público usam `CC_SOLICITACAO`, `CC_DECISAO` e `CC_CREDITO`; o que é só do órgão fica em `CC_ANALISE_ORGAO` (005).

### CC_SOLICITACAO — solicitação de crédito
Lê: 005, 006, 007. Escreve: 004 (`ccEscCred*`); a 005 escreve pelas SFs da 004.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CARD_ID | INT | S | — | |
| CLIENTE_ID | INT | N | — | |
| CARTEIRA | V(10) | N | — | `PRIVADA`, `ESTETICA`, `PUBLICA` — escolhido na abertura (privado: a carteira com maior faturamento nos últimos 90 dias, alterável) |
| TIPO_CLIENTE | V(12) | N | — | `NOVO`, `RECORRENTE`, `INATIVO` |
| VALOR | DEC | N | 0 | valor solicitado |
| PRAZO_MESES | INT | N | 0 | |
| JUSTIFICATIVA | V(1000) | N | '' | |
| RCA | V(80) | N | '' | |
| ANALISTA_ID | INT | S | — | |
| CRIADO_EM | D19 | N | — | |
| CRIADO_POR | INT | S | — | |
| PRAZO_DECISAO | D10 | S | — | data-limite da decisão = abertura + soma dos SLAs das fases até a decisão (gravada na abertura) |
| DECIDIDA_EM | D19 | S | — | |
| DECISAO_RESULTADO | V(12) | N | '' | `''`, `APROVADA`, `PRE_APROVADA`, `RECUSADA` |
| DECISAO_ID | INT | S | — | última `CC_DECISAO` |
| CONS_DATA | D10 | S | — | data das consultas obrigatórias |
| CONS_RECEITA | V(16) | N | 'NAO_CONSULTADO' | `NAO_CONSULTADO`, `ATIVA`, `IRREGULAR` |
| CONS_PROTESTO, CONS_PROCESSO, CONS_SOCIOS | V(16) | N | 'NAO_CONSULTADO' | `NAO_CONSULTADO`, `SEM`, `COM` |
| CNPJ_ABERTURA | D10 | S | — | |
| FIN_AC, FIN_PC, FIN_PL, FIN_DIVIDA, FIN_EBITDA | DEC | S | — | análise financeira |
| FAT_MENSAL | DEC | S | — | faturamento mensal **do cliente**, só informado (com o comprovante); sem sugestão — `CC_FATURAMENTO_MES` é o que a Benenutri fatura para ele (compra média), outra grandeza |
| SCORE_SERASA | INT | S | — | `NULL` = não informado; 0 é score válido |
| FP_TIPO | V(20) | N | '' | fonte pagadora |
| FP_NOME | V(120) | N | '' | |
| FP_PRAZO_DIAS | INT | N | 0 | |
| GARANTIA | V(500) | N | '' | |
| CONF_FIN_CONTATO_ID | INT | S | — | contato financeiro confirmado (`CC_CONTATO_CLIENTE`) |
| FLAG_NEGATIVACAO, FLAG_DADOS, FLAG_PEDIDO | BOOL | N | FALSE | alertas do analista |
| LIMITE_PROPOSTO | DEC | N | 0 | |
| PARECER_ANALISTA | V(2000) | N | '' | |
| PROPOSTA_POR | V(200) | N | '' | **todos** os que já gravaram limite proposto, parecer, fotografia do motor, ajuste de rating ou um dado da solicitação que entra no motor (este pela própria SQL de `ccEscCredSolicitacaoDados`): ids de `CC_MEMBRO` separados por vírgula, sem repetição, só cresce (acabamento pós-v3; era só o último). Nenhum deles decide a solicitação (DT-40; guarda `FIND_IN_SET(CAST(CAST({{membroId}} AS SIGNED) AS CHAR), PROPOSTA_POR) = 0`, e a lista grava o id nessa forma — membro normalizado, 01 §5). Na `PUBLICA` a análise do órgão tem a própria lista (`CC_ANALISE_ORGAO.PROPOSTA_POR`), que a guarda da decisão também exclui |
| OBS | V(2000) | N | '' | |
| RATING_MOTOR | V(2) | N | '' | AA–E, fotografia do último cálculo |
| MOTOR_LIMITE | DEC | N | 0 | |
| MOTOR_RESULTADO | V(30) | N | '' | |
| MOTOR_EM | D19 | S | — | |
| RATING_AJUSTE | V(2) | N | '' | |
| AJUSTE_JUSTIFICATIVA | V(1000) | N | '' | |
| AJUSTE_SITUACAO | V(10) | N | '' | `''`, `PENDENTE`, `APROVADO`, `RECUSADO` |
| AJUSTE_POR | INT | S | — | |
| AJUSTE_DECIDIDO_POR | INT | S | — | superior do analista, ≠ `AJUSTE_POR` |
| AJUSTE_DECIDIDO_EM | D19 | S | — | |
| MOTIVO_RECUSA | V(500) | N | '' | |
| ENCERRADA_EM | D19 | S | — | recusa, obsoleto ou substituição |

IX (`CLIENTE_ID`), IX (`CARD_ID`), IX (`ANALISTA_ID`), IX (`DECIDIDA_EM`). Rating efetivo = `RATING_AJUSTE` se `AJUSTE_SITUACAO = 'APROVADO'`, senão `RATING_MOTOR` (expressão `RATING_EFETIVO` em `lib/concessao-credito`). Os campos de confirmação (telefone, endereço, contato financeiro) são campos Sim/Não do card, não colunas.

### CC_DECISAO — decisão de alçada (solicitação, renovação e pedido)
Lê: 005, 006, 007. Escreve: 004; a 005 por `ccCredDecisaoRegistrar`.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| ENTIDADE | V(12) | N | — | `SOLICITACAO`, `PEDIDO` |
| ENTIDADE_ID | INT | N | — | |
| CLIENTE_ID | INT | N | — | |
| RESULTADO | V(12) | N | — | `APROVADA`, `PRE_APROVADA` (só público), `RECUSADA`, `RENOVADA`, `OBSOLETO`, `LIBERADO`, `RECUSADO` |
| RESPONSAVEL_ID | INT | N | — | sempre a pessoa da sessão |
| CARGO_ALCADA | V(60) | N | '' | cargo ou nome do comitê em nome de quem decide |
| ALCADA_EXIGIDA | V(40) | N | '' | rótulo da faixa (`Supervisor`, `Gerente`, `Comitê regional`, …) |
| NIVEL_EXIGIDO | INT | N | 0 | |
| VALOR_ALCADA | DEC | N | 0 | valor que definiu a faixa |
| LIMITE_APROVADO | DEC | N | 0 | |
| LIMITE_MOTOR | DEC | N | 0 | limite do motor na hora (`MOTOR_LIMITE`; na `PUBLICA`, `CC_ANALISE_ORGAO.EXPOSICAO`) |
| RATING | V(2) | N | '' | AA–E efetivo (privado) |
| RATING_PUB | V(2) | N | '' | P1–P4 (público; cópia de `CC_ANALISE_ORGAO`, lida na própria SQL da decisão, DT-36) |
| PLANO_COD | V(10) | N | '' | |
| PLANO_DESCR | V(80) | N | '' | |
| FORMA | V(40) | N | '' | forma de pagamento |
| CONDICAO | V(500) | N | '' | condição de liberação (pedido) |
| PARECER | V(2000) | N | '' | |
| JUSTIFICATIVA_EXCECAO | V(1000) | N | '' | |
| MOTOR_JSON | TEXT | S | — | entradas e saída do motor na hora |
| EM | D19 | N | — | |

IX (`ENTIDADE`, `ENTIDADE_ID`), IX (`CLIENTE_ID`), IX (`EM`), IX (`RESPONSAVEL_ID`).

### CC_CREDITO — crédito vigente e períodos anteriores
Lê: 002, 005, 006, 007. Escreve: 004.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| SOLICITACAO_ID | INT | N | — | card que acompanha o crédito |
| DECISAO_ID | INT | N | — | |
| CARTEIRA | V(10) | N | — | |
| ANALISTA_ID | INT | S | — | |
| LIMITE | DEC | N | 0 | limite aprovado |
| PLANO_COD | V(10) | N | '' | |
| PLANO_DESCR | V(80) | N | '' | |
| FORMA | V(40) | N | '' | |
| RATING_CONCESSAO | V(2) | N | '' | AA–E na concessão; vazio no público |
| ANALISE_ORGAO_ID | INT | S | — | público: análise que deu o P1–P4 (gravada pela 004 ao criar o crédito, lida na SQL, DT-36) |
| TIPO_CLIENTE | V(12) | N | '' | |
| INICIO_VALIDADE | D10 | N | — | |
| FIM_VALIDADE | D10 | N | — | início + `cred.validadeMeses` |
| SITUACAO | V(10) | N | 'GESTAO' | `GESTAO`, `REANALISE`, `OBSOLETO`, `ENCERRADO` |
| SITUACAO_EM | D19 | N | — | |
| MOTIVO_ENCAMINHAMENTO | V(200) | N | '' | |
| VIGENTE_CHAVE | INT | S | — | = `CLIENTE_ID` enquanto `GESTAO` ou `REANALISE`; `NULL` depois |

UQ (`VIGENTE_CHAVE`), IX (`CLIENTE_ID`), IX (`SOLICITACAO_ID`), IX (`SITUACAO`, `FIM_VALIDADE`). Crédito novo aprovado para cliente com vigente: o anterior vira `ENCERRADO` e o card dele vai para a fase `encerrada`.

### CC_RISCO_CLIENTE — risco atual (só setor privado)
Lê: 002, 006, 007. Escreve: 004 (passo `CREDITO`).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| CREDITO_ID | INT | S | — | |
| SOLICITACAO_ID | INT | S | — | origem do score e dos alertas |
| SCORE_COMP | INT | S | — | score comportamental |
| SCORE_FINAL | INT | S | — | |
| FAIXA_SCORE, FAIXA_ATRASO | V(2) | N | '' | |
| RATING_ATUAL | V(2) | N | '' | AA–E recalculado; `''` = sem cálculo |
| REBAIXADO | BOOL | N | FALSE | |
| ALERTAS | V(500) | N | '' | |
| LIMITE_SUGERIDO | DEC | N | 0 | |
| CRITICIDADE | V(8) | N | 'NORMAL' | `NORMAL`, `ALERTA`, `CRITICO` |
| CRIT_MOTIVOS | V(500) | N | '' | |
| SAUDE | V(10) | N | '' | `SAUDAVEL`, `ATENCAO`, `RISCO` (só com crédito aprovado) — **fonte única** da saúde (006 lê daqui) |
| SAUDE_SINAIS | V(300) | N | '' | |
| FLEX_PCT | PCT | N | 0 | flexibilização |
| FLEX_VALOR | DEC | N | 0 | |
| FLEX_MOTIVOS | V(300) | N | '' | |
| PROB_ATRASO | PCT | N | 0 | chance de atraso (projeção da cobrança; regra RN-016 da 002) |
| REVISAO_GATILHOS | V(200) | N | '' | gatilhos de revisão ativos (`ATRASO`, `USO`, `NEGATIVACAO`, `VALIDADE` — validade vence em até `cred.revValidadeDias`) |
| DESTINO | V(12) | N | '' | encaminhamento previsto (`REANALISE`, `OBSOLETO`, `''`) |
| LIMITE_DIVERGE | BOOL | N | FALSE | limite do Winthor ≠ aprovado |
| POSICAO_EM | D19 | S | — | `ALTERADO_EM` da posição usada |
| CALCULADO_EM | D19 | S | — | |

UQ (`CLIENTE_ID`), IX (`CRITICIDADE`), IX (`SAUDE`), IX (`RATING_ATUAL`).

### CC_PEDIDO_RETIDO — pedido acima do limite
Lê: 006, 007. Escreve: 004.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CARD_ID | INT | S | — | quadro `pedidos-limite` |
| CLIENTE_ID | INT | N | — | |
| CREDITO_ID | INT | S | — | |
| NUMERO_PEDIDO | V(20) | N | — | número no Winthor (lançado à mão) |
| VALOR | DEC | N | 0 | |
| LIMITE_NA_DATA, UTILIZADO_NA_DATA | DEC | N | 0 | fotografia da posição |
| ATRASO_NA_DATA | INT | N | 0 | |
| EXCESSO | DEC | N | 0 | |
| EXCESSO_PCT | PCT | N | 0 | |
| ALCADA_EXIGIDA | V(40) | N | '' | |
| NIVEL_EXIGIDO | INT | N | 0 | |
| CRITICA | BOOL | N | FALSE | liberação crítica (Diretor financeiro ou Comitê) |
| RCA | V(80) | N | '' | |
| TIPO_CLIENTE | V(12) | N | '' | |
| JUSTIFICATIVA | V(1000) | N | '' | |
| RECOMENDACAO | V(1000) | N | '' | |
| RECOMENDADO_POR | V(200) | N | '' | **todos** os que já gravaram a recomendação, lista como `CC_SOLICITACAO.PROPOSTA_POR` (acabamento pós-v3; mesma forma normalizada do id e a mesma guarda `FIND_IN_SET(CAST(CAST({{membroId}} AS SIGNED) AS CHAR), …) = 0`); nenhum decide o pedido (DT-40) |
| ANALISTA_ID | INT | S | — | |
| FLEXIBILIZADO | BOOL | N | FALSE | liberado acima do limite (mostradores de flexibilização) |
| DENTRO_REGRA | BOOL | N | FALSE | liberação dentro do teto flexível do cliente |
| CRIADO_EM | D19 | N | — | |
| CRIADO_POR | INT | S | — | |
| DECIDIDO_EM | D19 | S | — | |
| DECISAO_RESULTADO | V(10) | N | '' | `''`, `LIBERADO`, `RECUSADO` |
| MOTIVO_RECUSA | V(500) | N | '' | |

IX (`CLIENTE_ID`), IX (`CARD_ID`), IX (`ANALISTA_ID`), IX (`DECIDIDO_EM`).

### CC_PENDENCIA_WINTHOR — ação a aplicar no ERP
Lê: 006. Escreve: 004.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| TIPO | V(16) | N | — | `APLICAR_LIMITE`, `BLOQUEAR_LIMITE`, `LIBERAR_PEDIDO` |
| CLIENTE_ID | INT | N | — | |
| ORIGEM | V(12) | N | — | `SOLICITACAO`, `CREDITO`, `PEDIDO` |
| ORIGEM_ID | INT | N | — | |
| DESCRICAO | V(300) | N | — | |
| VALOR | DEC | N | 0 | |
| GERADA_EM | D19 | N | — | |
| GERADA_POR | INT | S | — | |
| APLICADA_EM | D19 | S | — | |
| APLICADA_POR | INT | S | — | |
| OBS | V(500) | N | '' | |

IX (`CLIENTE_ID`), IX (`APLICADA_EM`), IX (`ORIGEM`, `ORIGEM_ID`). O bloqueio da régua (002) **não** vem para cá: é estado devido × aplicado em `CC_COBRANCA`.

### CC_CALIBRACAO — foto mensal para calibrar o farol

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| MES | M7 | N | — | |
| CLIENTE_ID | INT | N | — | |
| CREDITO_ID | INT | S | — | |
| CARTEIRA | V(10) | N | — | |
| FAIXA | V(2) | N | '' | rating atual na foto |
| SCORE_FINAL | INT | S | — | |
| DIAS_ATRASO | INT | N | 0 | |
| VENCIDO, A_VENCER, LIMITE, UTILIZADO | DEC | N | 0 | |
| EM | D19 | N | — | |

UQ (`MES`, `CLIENTE_ID`). Gatilho único da foto mensal (01 §11). Escreve: 004.

### CC_CALIBRACAO_REVISAO — revisão trimestral do semáforo

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| REVISADO_EM | D10 | N | — | |
| PARECER | V(2000) | N | — | |
| LEITURA_JSON | TEXT | S | — | a leitura por faixa na data |
| POR_ID | INT | N | — | |
| EM | D19 | N | — | |

---

## 005-setor-publico

### CC_ANALISE_ORGAO — dados do órgão por solicitação pública
Lê: 003, 004 (fotografia do motor do órgão na decisão, DT-36), 006, 007. Escreve: 005.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| SOLICITACAO_ID | INT | N | — | `CC_SOLICITACAO` (004) |
| CLIENTE_ID | INT | N | — | |
| ESFERA | V(10) | N | '' | `FEDERAL`, `ESTADUAL`, `MUNICIPAL` |
| CAPAG | V(6) | N | '' | `A`, `B`, `C`, `D`, `ND`, `UNIAO` |
| CAPACIDADE | V(6) | N | '' | `ALTA`, `MEDIA`, `BAIXA` |
| CAPACIDADE_MANUAL | BOOL | N | FALSE | |
| PESSOAL_PCT | PCT | S | — | despesa com pessoal |
| CAUC | V(10) | N | '' | `REGULAR`, `PENDENCIA` |
| FONTE_TIPO | V(10) | N | '' | `SUS`, `VINCULADA`, `PROPRIOS` |
| FONTE_PAGADORA | V(120) | N | '' | |
| PERFIL_PAG | V(12) | N | '' | `PONTUAL`, `EVENTUAIS`, `FREQUENTES` |
| ATRASO_MEDIO | INT | S | — | dias |
| ATRASO_MEDIO_MANUAL | BOOL | N | FALSE | |
| RESTOS_A_PAGAR | V(300) | N | '' | |
| EMPENHO_PREVIO, CONTRATO_VIGENTE | V(3) | N | '' | `SIM`, `NAO` |
| BASE | V(8) | N | '' | `EDITAL`, `CONTRATO` |
| EDITAL | V(120) | N | '' | |
| VALOR_ESTIMADO | DEC | N | 0 | |
| CONTRATO | V(120) | N | '' | |
| SALDO_CONTRATO | DEC | N | 0 | |
| VIGENCIA_FIM | D10 | S | — | |
| REGRA_ID | INT | S | — | `NULL` = regra automática |
| PRAZO_CONTRATO_DIAS | INT | N | 0 | |
| NOTA | INT | S | — | 0–100 |
| PONTOS | V(300) | N | '' | `capag:22;pessoal:10;…` |
| RATING_PUB | V(2) | N | '' | `P1`…`P4` — único lugar do rating público (cópia congelada em `CC_DECISAO.RATING_PUB`) |
| EXPOSICAO | DEC | N | 0 | exposição máxima proposta. Com `RATING_PUB` e `CALCULADO_EM`, é a **fotografia do motor do órgão** que a decisão da 004 lê (DT-36): regravada em toda `ccPubAnaliseSalvar` e no "Calcular" |
| DECISAO_SUGERIDA | V(20) | N | '' | |
| PRE_APROVADA | BOOL | N | FALSE | aguardando contrato |
| CALCULADO_EM | D19 | S | — | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | último que salvou a análise (`ccPubAnaliseSalvar`; o "Calcular" não mexe) |
| PROPOSTA_POR | V(200) | N | '' | **todos** os que já salvaram a análise (`ccPubAnaliseSalvar`) ou gravaram o "Calcular" (`ccPubMotorCalcular` com `gravar = 1`, na mesma instrução da gravação da fotografia, `ccEscPubAnaliseMotor`), lista como `CC_SOLICITACAO.PROPOSTA_POR` (id normalizado): autores da proposta na `PUBLICA`, nenhum decide a solicitação (DT-40; fechamento v2 com `ATUALIZADO_POR`, lista no acabamento pós-v3) |

UQ (`SOLICITACAO_ID`), IX (`CLIENTE_ID`). Rating público atual de um cliente = `RATING_PUB` da análise ligada ao `CC_CREDITO` vigente; sem crédito vigente, a mais recente com decisão `APROVADA`/`PRE_APROVADA`.

### CC_NF_PUBLICA — nota fiscal de órgão em tramitação
Lê: 003, 006, 007. Escreve: 005 (passo `PUBLICO` e lançamento de datas).

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| CLIENTE_ID | INT | N | — | |
| ANALISE_ID | INT | S | — | contratação a que a NF pertence |
| CODFILIAL | V(4) | N | — | |
| NUMTRANSVENDA | INT | N | — | |
| NUMNOTA | INT | N | 0 | |
| SERIE | V(10) | N | '' | |
| EMISSAO | D10 | N | — | |
| VALOR | DEC | N | 0 | |
| SALDO_ABERTO | DEC | N | 0 | |
| PAGO_EM | D10 | S | — | só com todas as parcelas pagas |
| EMPENHO | V(40) | N | '' | manual até a descoberta |
| PROTOCOLO, ATESTO, LIQUIDACAO, OP | D10 | S | — | marcos lançados à mão |
| FILA_POSICAO | INT | S | — | |
| REGRA_ID | INT | S | — | regra de pagamento aplicada |
| PEQUENO_VALOR | BOOL | N | FALSE | |
| PRAZO_CONTRATO | BOOL | N | FALSE | prazo veio do contrato |
| LIQUIDAR_ATE, PAGAR_ATE | D10 | S | — | prazos calculados |
| LIMITE_2M | D10 | S | — | limite de 2 meses |
| M2_DEVIDO | D10 | S | — | data do passo M2 |
| PROX_PASSO | V(5) | N | '' | passo atual da régua da NF (005 RN-028), regravado pelo passo `PUBLICO` e pelas duas escritas da NF; `''` = nenhum |
| PROX_PASSO_DATA | D10 | S | — | data devida do passo atual (dias úteis com feriado nacional + UF + município do órgão) |
| ETAPA_NF | V(12) | N | 'ENTREGUE' | `ENTREGUE`, `PROTOCOLADA`, `ATESTADA`, `LIQUIDADA`, `OP`, `PAGA` |
| BAIXADA | BOOL | N | FALSE | baixada como perda (002) |
| CANCELADA | BOOL | N | FALSE | NF cancelada no Winthor depois de gravada; toda leitura e a régua filtram `CANCELADA = FALSE` |
| WINTHOR_EM | D19 | S | — | |
| CALCULADO_EM | D19 | S | — | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`CODFILIAL`, `NUMTRANSVENDA`), IX (`CLIENTE_ID`), IX (`PAGO_EM`), IX (`PAGAR_ATE`). Situação, dias de atraso e "acima de 2 meses" são derivados na leitura com `HOJE_SQL`.

### CC_NF_ACAO — passo da régua pública feito

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| NF_ID | INT | N | — | |
| CLIENTE_ID | INT | N | — | |
| PASSO | V(5) | N | — | `CONF`, `L1`, `L2`, `L3`, `G1`…`G5`, `M2` |
| PRAZO | D10 | N | — | data devida no momento |
| FEITO_EM | D19 | N | — | |
| FEITO_POR | INT | S | — | |
| NO_PRAZO | BOOL | N | TRUE | |
| PROTOCOLO_ORGAO | V(60) | N | '' | |
| EMAIL_ENVIADO_ID | INT | S | — | |
| OBS | V(500) | N | '' | |

UQ (`NF_ID`, `PASSO`), IX (`CLIENTE_ID`), IX (`FEITO_POR`, `FEITO_EM`). Lê: 003 (sugestão do dossiê), 006, 007. Escreve: 005.

### CC_REGRA_PAGAMENTO_ENTE

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| NOME | V(120) | N | — | |
| ESFERA | V(10) | N | '' | `''` qualquer, `FEDERAL`, `ESTADUAL`, `MUNICIPAL` |
| UF | V(2) | N | '' | `''` = qualquer |
| LIQ_DIAS | INT | N | 10 | |
| PAG_DIAS | INT | N | 10 | |
| CONTAGEM | V(8) | N | 'UTEIS' | `UTEIS`, `CORRIDOS` |
| BASE_LEGAL | V(300) | N | '' | |
| LINK | V(500) | N | '' | |
| SITUACAO | V(12) | N | 'A_CONFIRMAR' | `A_CONFIRMAR`, `VERIFICADO` |
| VALIDADO_POR | INT | S | — | |
| VALIDADO_EM | D19 | S | — | |
| ATIVO | BOOL | N | TRUE | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

Lê: 007. Escreve: 005.

### CC_CERTIDAO — certidão da empresa

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| TIPO | V(14) | N | — | `CND_FEDERAL`, `CRF_FGTS`, `CNDT`, `CND_ESTADUAL`, `CND_MUNICIPAL` |
| CNPJ | V(18) | N | — | |
| ABRANGENCIA | V(80) | N | '' | UF ou município/UF |
| NUMERO | V(60) | N | '' | |
| EMISSAO | D10 | S | — | |
| VALIDADE | D10 | N | — | |
| ANEXO_ID | INT | S | — | `CC_ANEXO` (`ENTIDADE = 'CERTIDAO'`) |
| REGISTRADO_EM | D19 | N | — | |
| REGISTRADO_POR | INT | S | — | |

IX (`TIPO`, `CNPJ`, `ABRANGENCIA`, `VALIDADE`). Vale a de maior `VALIDADE`. Lê: 003, 006. Escreve: 005.

---

## 006-painel-consolidado

### CC_FOTO_AGING — foto do fechamento (mês × cliente × BU)
Escreve: 006 (passo `FOTO`). Lê: 006.

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| MES | M7 | N | — | mês fotografado |
| MES_SEGUINTE | M7 | N | — | evita aritmética de mês na leitura |
| CLIENTE_ID | INT | N | — | |
| BU_ID | INT | N | 0 | |
| CARTEIRA | V(10) | N | — | |
| AGENTE_ID | INT | S | — | atribuição congelada |
| GRUPO_ECONOMICO | V(120) | N | '' | |
| UF | V(2) | N | '' | |
| PLANO_COD | V(10) | N | '' | |
| EM_JURIDICO | BOOL | N | FALSE | |
| A_VENCER, V_1_30, V_31_60, V_61_90, V_91_180, V_180, VENCIDO | DEC | N | 0 | da posição por BU |
| VDIAS | DECIMAL(18,2) | N | 0 | |
| DIAS_ATRASO | INT | N | 0 | |
| FAIXA | INT | N | -1 | −1 sem saldo, 0 a vencer, 1…5 pela faixa do título mais antigo |
| PDD | DEC | N | 0 | por título: Σ faixa × `pdd.f*` em vigor na data |
| VENCIDO_INICIAL | DEC | N | 0 | vencido da foto anterior |
| GERADA | DEC | N | 0 | `max(0, vencido − inicial + recuperado)` |
| RECUPERADO | DEC | N | 0 | recebimentos do mês com atraso, não estornados |
| BAIXADO | DEC | N | 0 | baixas aprovadas no mês |
| PRINCIPAL | BOOL | N | FALSE | uma linha por cliente e mês (a de maior saldo) leva limite e utilizado |
| LIMITE, UTILIZADO | DEC | N | 0 | só na linha `PRINCIPAL` |
| SINCRONIZACAO_ID | INT | N | 0 | leitura fotografada |
| SINCRONIZACAO_EM | D19 | N | — | |

UQ (`MES`, `CLIENTE_ID`, `BU_ID`), IX (`MES_SEGUINTE`), IX (`MES`, `AGENTE_ID`), IX (`MES`, `BU_ID`). Linha zerada (para o roll rate, o vencido inicial e o recuperado): cliente × BU da foto anterior que ficou sem saldo ganha linha zerada com **o mesmo `BU_ID`**; e todo cliente × BU com recebimento com atraso ou baixa aprovada no mês, e sem saldo, também. A baixa (que é por caso, cliente × carteira) vai para a linha da carteira do caso com vencido na foto anterior (menor `BU_ID`); sem nenhuma, BU 0. `SINCRONIZACAO_ID = 0` nas fotos semeadas. `EM_JURIDICO` é gravado e nenhuma SF desta entrega o lê.

### CC_FECHAMENTO — lançamento manual de mês sem foto

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| MES | M7 | N | — | |
| MES_SEGUINTE | M7 | N | — | |
| TOTAL, VENCIDO, VENCIDO_90, PDD | DEC | N | 0 | totais do mês |
| LANCADO_POR | INT | N | — | |
| LANCADO_EM | D19 | N | — | |
| ATUALIZADO_POR | INT | S | — | |
| ATUALIZADO_EM | D19 | S | — | |

UQ (`MES`). Escreve: 006.

---

## 007-historico-apoio

### CC_FONTE_LINK

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| GRUPO | V(80) | N | — | |
| TITULO | V(200) | N | — | |
| URL | V(500) | S | — | `NULL` = sem link |
| RESPONSAVEL | V(120) | N | '' | |
| USO | V(300) | N | '' | |
| BUSCA | V(900) | N | '' | título + responsável + uso sem acento, em maiúscula (igual a `CC_MATERIAL.BUSCA`); mantida por `ccHistFonteSalvar` |
| ORDEM | INT | N | 0 | |
| ATIVO | BOOL | N | TRUE | |
| REVISAR_JURIDICO | BOOL | N | FALSE | |
| REVISADO_EM | D19 | S | — | |
| REVISADO_POR | INT | S | — | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`GRUPO`, `TITULO`). Escreve: 007.

### CC_MATERIAL

| Coluna | Tipo | Nulo | Padrão | Significado |
|---|---|---|---|---|
| GRUPO | V(80) | N | — | |
| TITULO | V(200) | N | — | |
| DESCRICAO | V(500) | N | '' | |
| TAGS | V(200) | N | '' | |
| BUSCA | V(900) | N | '' | título + descrição + tags sem acento (busca igual no MySQL e no SQLite) |
| ANEXO_ID | INT | S | — | `CC_ANEXO` (`ENTIDADE = 'MATERIAL'`); `NULL` = arquivo pendente |
| VIGENTE_DESDE | D10 | S | — | |
| ORDEM | INT | N | 0 | |
| ATIVO | BOOL | N | TRUE | |
| ATUALIZADO_EM | D19 | S | — | |
| ATUALIZADO_POR | INT | S | — | |

UQ (`GRUPO`, `TITULO`). Escreve: 007. O histórico do cliente não tem tabela: é derivado das tabelas acima e de `KB_MOVIMENTO`/`KB_LOG`.

---

## Tabelas da lib lidas pelo domínio (só leitura em SQL; escrita só pelas SFs `kb*`)

| Tabela | Para quê |
|---|---|
| `KB_CARD` | fase atual (`FASE_ID`), `FASE_DESDE`, `CONCLUIDO_EM`, `RESPONSAVEL_ID`, `VALORES_JSON` (itens de checklist; lido em JS pela rotina) |
| `KB_FASE` | `SLA_HORAS`, `NOME`, `TIPO` |
| `KB_MOVIMENTO` | histórico de passagem (tempo por etapa, desempenho, histórico do cliente) |
| `KB_LOG` | notas e alterações (histórico do cliente) |
| `KB_ANEXO` | documentos do caso |
| `KB_BOARD` | `ADMINS_IDS`, `ACESSO_JSON` — **única escrita direta**, pelo passo `ACESSOS` (05 §2) |

---

## Winthor — tabelas lidas (somente leitura, JDBC `WinThor`)

Todo SQL Oracle mora em `backend/lib/winthor-sql.mjs` (001) e `backend/lib/setor-publico/winthor-nf.mjs` (005). Trocar coluna = trocar só esses arquivos.

**Confirmadas** = usadas em produção em projeto vizinho (`p-44515/backend/add-winthor-billing-realtime.mjs`, SGC 2). **A confirmar** = S-12 da T-002.

| Tabela | Colunas confirmadas | Colunas a confirmar | Uso |
|---|---|---|---|
| `PCCLIENT` | `CODCLI`, `CLIENTE`, `TIPOFJ`, `CODATV1`, `CGCENT` | `FANTASIA`, `ESTENT`, `MUNICENT`, `ENDERENT`, `BAIRROENT`, `CEPENT`, `TELENT`, `EMAIL`, `CODUSUR1`, `CODPLPAG`, `LIMCRED`, `DTULTCOMP`, `DTCADASTRO`, `BLOQUEIO` | cadastro, limite, plano, RCA |
| `PCATIVI` | `CODATIV`, `RAMO` | códigos dos ramos públicos (11–15) e se cada um é uma esfera | setor (D-02) |
| `PCUSUARI` | `CODUSUR`, `NOME` | — | RCA |
| `PCDEPTO` | `CODEPTO`, `DESCRICAO` | — | BU (D-01) |
| `PCPRODUT` | `CODPROD`, `CODEPTO` | — | departamento do item |
| `PCMOV` | `NUMTRANSVENDA`, `CODFILIAL`, `CODPROD`, `CODCLI`, `QT`, `PUNIT`, `CODOPER`, `DTMOV`, `NUMTRANSITEM`, `DTCANCEL`, `NUMNOTA` | — | itens da nota: rateio por BU e faturamento |
| `PCMOVCOMPLE` | `NUMTRANSITEM`, `VLSUBTOTITEM` | — | valor do item |
| `PCNFSAID` | `NUMTRANSVENDA`, `CODFILIAL`, `CODCLI`, `DTSAIDA`, `DTCANCEL`, `TIPOVENDA`, `CODFISCAL`, `CONDVENDA` | `NUMNOTA`, `SERIE`, `VLTOTAL` | faturamento, NF pública |
| `PCNFENT`, `PCESTCOM` | as do `p-44515` (devolução) | — | faturamento líquido |
| `PCFILIAL` | `CODIGO`, `RAZAOSOCIAL`, `FANTASIA`, `CGC`, `UF` | — | filial |
| `PCPREST` | — | `CODCLI`, `CODFILIAL`, `DUPLIC`, `PREST`, `NUMTRANSVENDA`, `VALOR`, `VPAGO`, `DTVENC`, `DTPAG`, `DTEMISSAO`, `CODCOB`, `DTCANCEL`/estorno/desdobramento | títulos a receber (nenhum projeto vizinho lê) |
| `PCPLPAG` | — | `CODPLPAG`, `DESCRICAO`, `NUMDIAS` | planos |
| `PCCOB` | — | `CODCOB`, `COBRANCA` | tipos de cobrança (D-04) |
| `PCPEDC` | — | `NUMPED`, `NUMPEDCLI` (empenho?) | NF pública (005 NC-1) |

Joins confirmados: `PCPRODUT.CODEPTO = PCDEPTO.CODEPTO`; `PCCLIENT.CODATV1 = PCATIVI.CODATIV`; `PCMOV.NUMTRANSVENDA = PCNFSAID.NUMTRANSVENDA AND PCMOV.CODFILIAL = PCNFSAID.CODFILIAL`; `PCMOV.NUMTRANSITEM = PCMOVCOMPLE.NUMTRANSITEM`. A confirmar: `PCPREST.NUMTRANSVENDA = PCNFSAID.NUMTRANSVENDA` (título ↔ nota).
Filtros de faturamento (confirmados no `p-44515`): `PCMOV.CODOPER NOT IN ('SR','SO')`, `TIPOVENDA NOT IN ('SR','DF')`, `CODFISCAL NOT IN (522,622,722,532,632,732)`, `CONDVENDA NOT IN (4,8,10,13,20,98,99)`, `DTCANCEL IS NULL`.
Plano B do setor: se os códigos 11–15 não se confirmarem, vale só o prefixo do nome do ramo (`ORGAO PUBLICO`, já usado no `p-44515`) — os dois critérios são parâmetro (`base.ramosPublicos`, `base.ramoPublicoPrefixo`).

### Schema Winthor do simulador (`backend/simulator/schema-winthor.mjs`, integrador)

Datas em `VARCHAR(10)`; os mesmos nomes do Oracle. Só o que o sistema lê:

| Tabela | Colunas |
|---|---|
| `PCCLIENT` | `CODCLI` PK, `CLIENTE`, `FANTASIA`, `CGCENT`, `TIPOFJ`, `ESTENT`, `MUNICENT`, `ENDERENT`, `BAIRROENT`, `CEPENT`, `TELENT`, `EMAIL`, `CODATV1`, `CODUSUR1`, `CODPLPAG`, `LIMCRED`, `DTULTCOMP`, `DTCADASTRO`, `BLOQUEIO` |
| `PCATIVI` | `CODATIV` PK, `RAMO` |
| `PCUSUARI` | `CODUSUR` PK, `NOME` |
| `PCDEPTO` | `CODEPTO` PK, `DESCRICAO` |
| `PCPRODUT` | `CODPROD` PK, `DESCRICAO`, `CODEPTO` |
| `PCPLPAG` | `CODPLPAG` PK, `DESCRICAO`, `NUMDIAS` |
| `PCCOB` | `CODCOB` PK, `COBRANCA` |
| `PCFILIAL` | `CODIGO` PK, `RAZAOSOCIAL`, `FANTASIA`, `CGC`, `UF` |
| `PCNFSAID` | `NUMTRANSVENDA` PK, `CODFILIAL`, `NUMNOTA`, `SERIE`, `CODCLI`, `DTSAIDA`, `VLTOTAL`, `DTCANCEL`, `TIPOVENDA`, `CODFISCAL`, `CONDVENDA`, `NUMPED` |
| `PCMOV` | `NUMTRANSITEM` PK, `NUMTRANSVENDA`, `CODFILIAL`, `CODPROD`, `CODCLI`, `CODOPER`, `DTMOV`, `QT`, `PUNIT`, `DTCANCEL`, `NUMNOTA` |
| `PCMOVCOMPLE` | `NUMTRANSITEM` PK, `VLSUBTOTITEM` |
| `PCPREST` | `NUMTRANSVENDA`, `PREST`, `CODFILIAL`, `CODCLI`, `DUPLIC`, `VALOR`, `VPAGO`, `DTVENC`, `DTPAG`, `DTEMISSAO`, `CODCOB`, `DTCANCEL` — PK (`NUMTRANSVENDA`, `PREST`) |
| `PCPEDC` | `NUMPED` PK, `NUMPEDCLI` |

Devolução (`PCNFENT`/`PCESTCOM`) não é simulada: no simulador o faturamento é só a saída (`ponytail:` a consulta de devolução entra junto com a descoberta S-12).
