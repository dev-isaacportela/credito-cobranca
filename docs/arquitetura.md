# Arquitetura comum — Crédito e Cobrança

Normativo para todo `plan.md`. Uma spec **não redefine** tabela, perfil ou SF de
outra spec: se precisa de algo que pertence a outra, registra em
"Pedidos a outras specs" no seu `plan.md` e usa o contrato descrito aqui.

Origem do produto: o artefato do gestor estudado em `docs/estudo-artefato/`
(visão geral em `00-visao-geral.md`; decisões em §8). O artefato é **referência
de regra**, não de implementação: o que ali é protótipo (ver §5 da visão geral)
é refeito do jeito certo.

**Versão:** 1.0.0 · 2026-11-14

---

## 1. Módulos e specs

| Spec | Módulo | Depende de | Ordem de construção |
|---|---|---|---|
| `001-base` | Clientes e posição financeira vindos do Winthor, equipe e hierarquia, perfis, parâmetros (por segmento), BUs, feriados e dias úteis, ficha de contatos do cliente, modelos de mensagem, envio de e-mail, anexos, auditoria | — | 1 |
| `002-cobranca-privada` | Régua privada (preventiva D-5/D-1/D0 e D+1…D+60), quadro da cobrança, ações e checklist, contatos de cobrança, promessas, acordos e quebra, e-mails da régua (fila, modos), lista de bloqueio, Minha agenda, baixa como perda, carta de anuência, visão gerencial da cobrança | 001 | 2 |
| `003-juridico` | Envio ao Jurídico (dossiê com checklist), quadro de 11 etapas, ficha do processo, andamentos, prazos, custos, acordos judiciais, alertas de desvio, visão gerencial, PDFs de notificação extrajudicial e demonstrativo do débito, carga inicial da planilha | 001, 002 | 3 |
| `004-concessao-credito` | Esteira privada (6 etapas + gestão, reanálise, obsoleto, recusada), consultas obrigatórias, análise financeira, rating único/farol e motor de limite, comitê e alçada, gestão de crédito (validade 3 meses, reanálise/obsoleto), flexibilização, pedidos acima do limite, semáforo e calibração, saúde das análises, desempenho | 001 | 4 |
| `005-setor-publico` | Esteira pública (3 etapas), motor do órgão (nota 0–100, P1–P4), notas fiscais em tramitação, régua pública por NF em dias úteis, regras de pagamento por ente, comunicação com o órgão, certidões da empresa | 001, 002, 004 | 5 |
| `006-painel-consolidado` | Painel executivo das 4 carteiras: saúde, aging, PDD, roll rate, foto mensal, fechamento manual, metas e evolução no ano, movimento da inadimplência, concentração, conversão, inadimplência por agente e BU, indicadores por nível da equipe | 001–005 | 6 |
| `007-historico-apoio` | Histórico do cliente (linha do tempo de tudo) com PDF, fontes e links, material de apoio, consulta das regras de negócio em vigor | 001–006 | 7 |

Carteiras no menu: **Privado**, **Estética**, **Público**, **Jurídico**.
Estética é uma BU de segmento próprio (`ESTETICA`): segue o fluxo privado, com
parâmetros que podem sobrepor os gerais.

## 2. Convenções

- **Prefixo das Server Functions:** `cc` + Domínio + Ação, em camelCase.
  Ex.: `ccCobrancaListar`, `ccCobrancaTotal`, `ccContatoRegistrar`,
  `ccAcordoCriar`. Toda listagem tem `LIMIT/OFFSET` e uma SF `…Total`.
- **Tabelas:** prefixo `CC_`, nome e colunas em CAIXA ALTA, chave `ID` inteira
  auto-incremento. Datas em `VARCHAR` (`YYYY-MM-DD` ou ISO com hora, fuso
  America/Sao_Paulo), preenchidas no código. Dinheiro em `DECIMAL(15,2)`.
- **Identidade:** `:VAR_USER` → `CC_MEMBRO.USER_EMAIL`. Nunca e-mail vindo do input.
- **Escrita:** SF SQL para escrita simples; SF JAVASCRIPT quando há validação
  (alçada, segregação, gate). Toda escrita de negócio chama a auditoria.
- **Simulador:** porta **3115**, Vite **5185**, registrado no `mitra-hub`.
  Winthor no simulador = tabelas `PC*` em SQLite (padrão de
  `consultas-winthor/backend/simulator/schema-winthor.mjs`), opcionalmente
  contra o Oracle real em modo leitura (`winthor-oracle.mjs`).

## 3. Winthor (leitura por JDBC)

Decisão: tempo real por JDBC, sem tela de importação. O sistema não escreve no
Winthor. Padrão copiado de `consultas-winthor` (BN Search):
`add-001-jdbc-winthor.mjs` cria a conexão por nome, `jdbcIdWinthor()` resolve o id.

Duas formas de leitura:

| Forma | Para quê | Como |
|---|---|---|
| **Ao vivo** | ficha do cliente, títulos de um cliente, busca de cliente | SF SQL com `jdbcId` do Winthor |
| **Sincronizada** (cron a cada 15 min, parâmetro) | tudo o que cruza Winthor com dados do sistema: quadro, agenda, régua, painel, aging | SF JAVASCRIPT lê o Winthor e grava `CC_POSICAO_CLIENTE` e `CC_RECEBIMENTO` no MySQL |

Tabelas do Winthor prováveis (**a confirmar na T-001 da spec 001**, consulta de
colunas no sandbox): `PCCLIENT` (cliente, CNPJ, limite `LIMCRED`, plano
`CODPLPAG`, RCA `CODUSUR1`, UF, ramo `CODATV1`, última compra), `PCPREST`
(títulos a receber: vencimento, valor, pagamento, valor pago, emissão, cobrança),
`PCPLPAG` (planos de pagamento), `PCUSUARI` (RCA), `PCATIVI` (ramo de atividade),
`PCNFSAID` (NFs de saída, para o setor público). BU e segmento do cliente: regra
de derivação **a confirmar** (pode vir de filial, departamento, RCA ou cadastro
manual no sistema).

## 4. Modelo de dados e dono de cada tabela

O `plan.md` do dono detalha colunas. Os outros só leem (ou escrevem pela SF do dono).

### 001-base
| Tabela | O que guarda |
|---|---|
| `CC_CLIENTE` | cliente espelhado do Winthor (`CODCLI` único, CNPJ/CPF, nome, tipo PF/PJ, UF, ramo, RCA, plano) + atributos do sistema: `BU_ID`, `SETOR` (`PRIVADO`/`PUBLICO`), `GRUPO_ECONOMICO`, `AGENTE_ID` (agente de cobrança), `ESFERA` (público) |
| `CC_POSICAO_CLIENTE` | 1 linha por cliente, gravada pela sincronização: vencido, a vencer, dias de atraso (título mais antigo), próximo vencimento e valor, limite e utilizado, última compra, compras nos últimos 90 dias, data da sincronização |
| `CC_RECEBIMENTO` | pagamentos lidos do Winthor (chave natural título+parcela+data, sem duplicar), usados em conversão e recuperação |
| `CC_SINCRONIZACAO` | log de cada sincronização (início, fim, registros, erro) |
| `CC_BU` | BU com `SEGMENTO` (`PRIVADO`, `ESTETICA`, `PUBLICO`) |
| `CC_MEMBRO` | pessoa da equipe: nome, `USER_EMAIL`, `CARGO`, `SUPERIOR_ID`, ativo |
| `CC_PARAMETRO` | `CHAVE`, `SEGMENTO` (`''` = geral), `VALOR`, `VIGENCIA_INICIO`; valor efetivo = segmento > geral, vigência mais recente ≤ hoje |
| `CC_FERIADO` | data, nome, abrangência (nacional/UF/município) |
| `CC_CONTATO_CLIENTE` | ficha de contatos: nome, área, função, telefone, WhatsApp, e-mail, situação, preferido, atualizado em/por |
| `CC_MODELO_MENSAGEM` | modelo por código (etapa da régua, notificação, comunicação com órgão): assunto, corpo com campos `[CAMPO]`, versão, validado por/em. O conteúdo de cada modelo é definido pela spec que o usa |
| `CC_EMAIL_ENVIADO` | todo e-mail enviado pelo sistema: modelo, cliente, para, assunto, corpo final, enviado em/por, resultado |
| `CC_ANEXO` | arquivo genérico: `ENTIDADE` + `ENTIDADE_ID`, tipo, nome, tamanho, URL, enviado em/por |
| `CC_AUDITORIA` | área, entidade, id, campo, antes, depois, por, em |

### 002-cobranca-privada
`CC_COBRANCA` (caso de cobrança por cliente: etapa atual, entrou em, etapa manual
quando acordo/regularizado/jurídico, próxima ação e data), `CC_COBRANCA_HIST`,
`CC_ACAO_REGUA` (item de checklist feito: cliente, etapa, item, feito em/por),
`CC_CONTATO_COBRANCA` (canal, falou com, retorno, feedback, agente),
`CC_PROMESSA` (valor, data prometida, situação: aberta/cumprida/quebrada),
`CC_ACORDO` + `CC_ACORDO_PARCELA` (acordos extrajudiciais), `CC_BAIXA` (proposta
e decisão da baixa como perda), `CC_EMAIL_FILA` (fila do dia: etapa, modo,
situação, aprovado por).

### 003-juridico
`CC_PROCESSO` (cliente, etapa, nº dos autos, tribunal, filial, valor, responsável,
prazo, situação), `CC_PROCESSO_ANDAMENTO`, `CC_PROCESSO_CUSTO`,
`CC_DOSSIE_ITEM` (checklist de documentos), `CC_ACORDO_JUDICIAL` +
`CC_ACORDO_JUDICIAL_PARCELA`.

### 004-concessao-credito
`CC_SOLICITACAO` (solicitação de crédito: cliente, setor, valor, prazo,
justificativa, etapa, entrou em, analista, consultas, análise financeira, garantia,
fonte pagadora), `CC_SOLICITACAO_HIST`, `CC_SOLICITACAO_CHECK`, `CC_DECISAO`
(comitê/alçada: responsável, cargo, parecer, plano e forma aprovados, data),
`CC_CREDITO` (crédito vigente do cliente: limite aprovado, início e fim da
validade, rating na concessão, plano e forma aprovados, situação
gestão/reanálise/obsoleto), `CC_PEDIDO_RETIDO` (+ hist e decisão), `CC_CALIBRACAO`.

### 005-setor-publico
`CC_ANALISE_ORGAO` (dados do ente por solicitação pública: esfera, CAPAG,
despesa com pessoal, CAUC, fonte, perfil de pagamento, edital, contrato, nota e
rating P1–P4), `CC_NF_PUBLICA` (NF, empenho, valor, protocolo, atesto,
liquidação, OP, pagamento, prazos calculados), `CC_NF_ACAO` (passo da régua
pública feito), `CC_REGRA_PAGAMENTO_ENTE`, `CC_CERTIDAO`.

### 006-painel-consolidado
`CC_FOTO_AGING` (mês, cliente, faixa, valor — gravada por cron no 1º dia do mês),
`CC_FECHAMENTO` (lançamento manual de meses sem foto). Metas são parâmetros (001).

### 007-historico-apoio
`CC_FONTE_LINK`, `CC_MATERIAL` (documento com anexo).

## 5. Perfis (decisão de 11/11/2026, §8.2 do estudo)

| Perfil Mitra | Cargo em `CC_MEMBRO` | Nível de alçada |
|---|---|---|
| Agente de cobrança | `AGENTE` | 1 |
| Supervisor | `SUPERVISOR` | 2 |
| Gerente financeiro | `GERENTE` | 3 |
| Diretoria | `DIRETORIA` | 5 |
| Jurídico | `JURIDICO` | 0 (só módulo jurídico) |
| Administrador | qualquer cargo + flag `ADMIN` | — |
| Analista de crédito | `ANALISTA` | 1 (ver pendência P-04) |

- **Visibilidade:** agente vê a própria carteira; supervisor, a sua e a dos
  subordinados diretos e indiretos; gerente, diretoria e administrador, tudo.
  Filtro aplicado na SF a partir de `:VAR_USER`.
- **Alçada:** nível do cargo ≥ nível exigido pela tabela de alçadas (parâmetro).
  Comitês (regional, executivo, de crédito) são registrados por quem tem o
  nível, com o nome do comitê.
- **Segregação:** quem propõe/analisa não aprova (solicitação, pedido retido,
  acordo, baixa).

## 6. Pendências que atravessam specs

| # | Pendência | Afeta |
|---|---|---|
| P-01 | Bloqueio total em D+10 (parâmetro do artefato) ou D+20 (texto da tela)? | 002 |
| P-02 | Os dados do artefato (clientes, propostas, processos) migram? | 002, 003, 004 |
| P-03 | O que muda na Estética (régua, encargos, equipe, mensagens, aprovação)? | 001, 002, 004 |
| P-04 | Analista de crédito e agente de cobrança são a mesma pessoa? | 001, 004 |
| P-05 | Colunas reais do Winthor e de onde vêm BU, segmento e agente do cliente | 001 |
| P-06 | Quem valida modelos com efeito legal e os encargos (Jurídico + Gerência Financeira) | 002, 003 |

## 7. Decisões do gestor que mudam o modelo (14/11/2026)

Respondidas depois de as specs terem sido escritas; **prevalecem** sobre o que
as specs supuseram e entram na rodada de correção pós-validação.

| # | Decisão | Consequência |
|---|---|---|
| D-01 | **A BU não é do cliente: é do item comprado.** No Winthor a BU é o **departamento** do produto. Um cliente pode ter mais de uma BU. | A posição financeira passa a existir por **cliente × BU**: cada título herda a BU dos itens da nota (regra de rateio quando a nota mistura departamentos: a confirmar na descoberta T-001). `CC_CLIENTE` deixa de ter `BU_ID`; entra `CC_POSICAO_CLIENTE_BU` (vencido, a vencer, dias de atraso por BU) ao lado da posição total do cliente. `CC_BU` mapeia departamento do Winthor → BU → segmento. Aging, inadimplência por BU, Estética e filtros de BU leem a posição por BU. A régua de cobrança continua por cliente (um caso por cliente), com a BU aparecendo como composição do saldo; se a Estética tiver régua própria (P-03), o caso é por cliente × segmento. |
| D-02 | **Setor público × privado vem do ramo de atividade do cliente no Winthor.** Ramos 11 a 15 (a confirmar os códigos) são público; os demais, privado. Há também pessoa física. | `SETOR` do cliente é derivado do ramo na sincronização, por um parâmetro com a lista de ramos públicos (padrão `11,12,13,14,15`), editável. Pessoa física é tipo de pessoa (`PF`/`PJ`), não setor: segue o fluxo privado. A esfera (municipal/estadual/federal) pode sair do ramo, se cada ramo de 11 a 15 for uma esfera: a confirmar. |
| D-03 | **Título que vence em fim de semana ou feriado:** fica para decidir depois. | Parâmetro `VENCIMENTO_DIA_NAO_UTIL` com três valores (`CORRIDO`, `PROXIMO_UTIL`, `UTIL_ANTERIOR`); padrão `CORRIDO` (como o artefato) até a decisão. |
| D-04 | **Tipos de cobrança que não são dívida do cliente:** pergunta não entendida; reexplicar ao gestor. | Parâmetro com a lista de códigos de cobrança do Winthor excluídos do saldo; padrão vazio até a resposta. |
| D-05 | **Setor público e Estética e Injetáveis reaproveitam o setor privado** (usuário, 14/11/2026). | Cobrança e concessão têm **um conjunto só de telas e de Server Functions**, parametrizado pela carteira (`PRIVADA`, `ESTETICA`, `PUBLICA`). O que muda de uma carteira para outra é **dado**: o quadro da lib (fases, campos, SLA), os parâmetros (régua, encargos, alçadas) e o motor de análise. Os 8 quadros do §8.1 continuam existindo; não há tela nem SF `…Publica…`/`…Estetica…` que duplique uma do privado. A spec 005 fica só com o que não existe no privado: fluxo da NF pública (etapas, prazos, datas), motor do órgão (0–100, P1–P4), regras de pagamento por ente, comunicação com o órgão e certidões. A escolha de layout feita em 002 e 004 vale para as três carteiras. P-03 fica reduzida a "quais parâmetros da Estética têm valor diferente". |
| D-06 | **Quem administra: Gerente para cima** (usuário, 14/11/2026). | Parâmetros, feriados, BUs e departamentos, modelos de mensagem, equipe e redistribuição, filiais credoras, conclusão da carga do Jurídico, fontes e material de apoio: nível ≥ 3 (Gerente, Diretoria) **ou** a marca Administrador (pessoal técnico). Regra num fragmento único do servidor. |
| D-07 | **Supervisor vê todos os cards do quadro Jurídico** (usuário, 16/11/2026; era a pendência P-48). | No quadro `juridico` o supervisor é `membro` e enxerga todos os processos; mover o card à mão continua só do Jurídico. |
| D-08 | **Acordos aguardando aprovação ficam separados** (usuário, 16/11/2026). | "Acordos a receber" conta só acordo em andamento; os que aguardam aprovação aparecem num indicador próprio (quantidade e valor), sem somar ao a receber. |
| D-09 | **Ninguém se promove** (usuário, 17/11/2026; no plan da 001 é D-014). | Ninguém altera o próprio cargo, superior, marca ou situação. Cargo de nível ≥ 3 (Gerente, Diretoria) só é dado por quem tem **cargo** de nível igual ou maior — a marca Administrador não conta. Parâmetros `alcada.*` só são alterados por cargo de nível ≥ 3; a marca sozinha não basta. Vale na JS e na guarda SQL. |
| D-10 | **Winthor fora, módulos param** (usuário, 17/11/2026; no plan da 001 é D-015). | Se a última leitura do Winthor falhou, a rotina tenta ler de novo uma vez por rodada e não roda passo de módulo (régua, passagem do dia) com dado velho — ninguém é cobrado do que já pagou. |

## 8. Quadros usam a lib `@benenutri/mitra-kanban` (decisão do usuário, 14/11/2026)

Todo quadro (kanban) do sistema é um quadro do motor `@benenutri/mitra-kanban`
(versão atual 1.14.0; contrato no `README.md` de `mitra-projects/mitra-kanban`;
consumidor de referência: `mitra-projects/p-novo-sgc`, o SGC 2, que também lê o
Winthor por JDBC). **Nenhuma spec reimplementa** fases, cartão, card aberto,
histórico de passagem, SLA por fase, tarefas, chat, anexos do card, etiquetas,
níveis de acesso do quadro ou e-mail de automação: isso é da lib. Esta seção
prevalece sobre os plans escritos antes dela (002, 003, 004 e 005 são replanejados).

### 8.1 Quadros

| Quadro (slug) | Spec dona | Cartão = | Quem move |
|---|---|---|---|
| `cobranca-privada`, `cobranca-estetica` | 002 | caso de cobrança de um cliente | **cron da régua** (por dias de atraso, sem sessão) e o agente nas fases manuais (acordo, jurídico, baixa) |
| `cobranca-publica` | 005 | caso de cobrança de um órgão | cron da régua pública (por NF) e o agente |
| `concessao-privada`, `concessao-estetica` | 004 | solicitação de crédito | analista e alçada; cron encaminha gestão → reanálise/obsoleto |
| `concessao-publica` | 005 | solicitação de crédito de órgão | analista e alçada |
| `pedidos-limite` | 004 | pedido retido acima do limite | analista e alçada |
| `juridico` | 003 | processo | Jurídico |

Estética tem quadros próprios (mesma estrutura no seed) para poder divergir sem
código, já que o gestor configura fases, campos, condições e automações na
administração do quadro (P-03).

### 8.2 Como o domínio se liga ao motor

- **Vínculo:** cada tabela de caso do domínio (`CC_COBRANCA`, `CC_SOLICITACAO`,
  `CC_PEDIDO_RETIDO`, `CC_PROCESSO`) tem `CARD_ID`; o card leva
  `ORIGEM_CHAVE = 'cc:<entidade>:<id>'`. A etapa **mora no card** (`KB_CARD.FASE_ID`);
  o domínio não duplica etapa nem histórico de etapa (as tabelas `*_HIST` saem).
- **Fases, SLA e checklists:** as etapas do artefato viram fases no seed do
  quadro, com o SLA da fase. Item de checklist vira **campo de fase** Sim/Não
  (obrigatório quando é gate de saída) ou **tarefa** do card. Gate = campos
  obrigatórios + condição de entrada da fase, que o motor confere no servidor.
- **Regra de pessoas** (alçada, segregação "quem propõe não aprova", quem pode
  mover o quê): um **gancho de servidor** `ccPodeMover` / `ccPodeExcluir` (SF SQL
  com o contrato da lib; um por projeto, despacha por `boardId`), espelhado na
  tela por `podeMover`/`antesDeMover`.
- **Movimento automático:** o cron chama `kbCardCriar`, `kbCardMover` e
  `kbCardAtualizar` sem sessão (`origem: 'sistema'`, "em nome de" o agente). Ele
  cria o cartão quando o cliente entra em cobrança, move pela régua, atualiza os
  campos da capa (vencido, dias de atraso, próxima ação) e leva à fase final
  quando o saldo zera. Evento de domínio relevante entra no histórico por `kbNotaRegistrar`.
- **Conteúdo do domínio no card aberto:** `conteudoDaFase` (o que a fase pede:
  ação da régua, proposta de acordo, decisão do comitê, dossiê) e `abasExtras`
  (Contatos e promessas, Acordo, Títulos do Winthor ao vivo, Custos, Notas
  fiscais), e `acoesExtras` (Registrar contato, Propor acordo, Enviar ao Jurídico).
  Parcelas de acordo e uso do limite podem ir à capa pelo campo **Progresso**.
- **Anexos de um caso** são os anexos do card (`KB_ANEXO`); `CC_ANEXO` fica só
  para o que não é card (material de apoio, cliente). Atenção: o anexo da lib é
  endereço público; documento sensível (balanço, dossiê) depende do anexo privado
  que a lib ainda não tem — registrar como risco em cada plan.
- **Acesso ao quadro:** níveis da lib. Agente = `restrito` (vê os cards em que é
  responsável: a própria carteira); Supervisor, Gerente e Diretoria = `membro`;
  Jurídico = `membro` no `juridico` e `leitor` nos de cobrança; Administrador =
  administrador do quadro. Diferença conhecida para a regra de hierarquia: o
  supervisor vê todos os cards do quadro, não só os da equipe; as listagens e
  painéis próprios (`cc*`) continuam filtrando pela hierarquia.
- **E-mail:** todo e-mail do sistema usa `montarEmail` do motor (modelo Benenutri,
  design.md §15), inclusive os da régua.
- **Sem arrastar e soltar:** o cartão é só leitura; mover é no card aberto, em
  "Mover para". As specs que citam arrastar e soltar são corrigidas.

### 8.0 Nota sobre o Winthor (achado de 14/11/2026)

A consulta de faturamento do `p-44515` (`backend/add-winthor-billing-realtime.mjs`)
já confirma, no Winthor real, os joins das decisões D-01 e D-02: a BU é
`PCPRODUT.CODEPTO = PCDEPTO.CODEPTO` (departamento do produto) e o ramo é
`PCCLIENT.CODATV1 = PCATIVI.CODATIV`. Use essa consulta como ponto de partida
da posição por cliente × BU. **Nenhum projeto da pasta lê títulos a receber**
(`PCPREST`), limite de crédito nem plano de pagamento: essas colunas continuam
a confirmar na T-001 da spec 001.

### 8.3 Arquivos do backend

Seguindo o SGC 2: `add-001-kanban.mjs` (instala a lib, com `ganchos` e `email`),
`add-002-jdbc-winthor.mjs`, depois um arquivo por spec numerado em dezenas
(`add-010-base.mjs`, `add-020-cobranca-privada.mjs`, `add-030-juridico.mjs`,
`add-040-concessao-credito.mjs`, `add-050-setor-publico.mjs`,
`add-060-painel-consolidado.mjs`, `add-070-historico-apoio.mjs`) e
`add-090-perfil-acesso.mjs`. O seed de cada quadro (fases, campos, automações)
fica no arquivo da spec dona. Substitui a numeração `add-NNN` = número da spec.
