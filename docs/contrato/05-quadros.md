# 05 — Quadros (`@benenutri/mitra-kanban`)

Os 8 quadros da arquitetura §8.1. Fases, campos, capa, condições, etiquetas e SLA são **dado** semeado por `semearQuadro()` a partir do `QUADROS` de `backend/lib/quadros/NNN-<slug>.mjs` da dona. Depois de semeado, o gestor muda nome, cor, SLA e campos na administração do quadro; a regra do sistema só conhece a **chave** da fase (`CC_FASE.CHAVE`) e a chave do campo.

| Quadro (slug) | Dona | Card = | `ORIGEM_CHAVE` | Carteira |
|---|---|---|---|---|
| `cobranca-privada` | 002 | caso de cobrança (cliente × carteira, por ciclo) | `cc:cobranca:<id>` | `PRIVADA` |
| `cobranca-estetica` | 002 | idem | idem | `ESTETICA` |
| `cobranca-publica` | 002 (etapa calculada pela 005) | idem (órgão) | idem | `PUBLICA` |
| `concessao-privada` | 004 | solicitação e o crédito que nasce dela | `cc:solicitacao:<id>` | `PRIVADA` |
| `concessao-estetica` | 004 | idem | idem | `ESTETICA` |
| `concessao-publica` | 004 (trava do órgão pela 005) | idem (órgão) | idem | `PUBLICA` |
| `pedidos-limite` | 004 | pedido retido por limite | `cc:pedido:<id>` | a do crédito do cliente |
| `juridico` | 003 | processo (do dossiê ao encerramento) | `cc:processo:<id>` | coluna do processo |

D-05: os três quadros de cobrança têm **uma** tela e **um** conjunto de SFs (002); os três de concessão, idem (004). A diferença entre carteiras está toda nas tabelas deste arquivo. A 005 pluga abas e ações no card dos dois quadros públicos por `registrarExtensao()` (01 §14).

---

## 1. Regras de integração (valem para os 8)

| # | Regra |
|---|---|
| 1 | **Semeadura** no provisionamento (`add-0N0` da dona chama `semearQuadro(QUADROS)`): cria quadro, fases, campos e etiquetas que faltam, pelo slug e pela chave; **nunca sobrescreve** nome, cor, SLA ou ordem já existentes; grava `CC_FASE` (`QUADRO`, `BOARD_ID`, `CHAVE`, `FASE_ID`, `ORDEM`, `FINAL`). Fase ou campo semeado que alguém excluiu é recriado na publicação seguinte. |
| 2 | **Card nasce só por SF** do domínio (`kbCardCriar` com `origem: 'sistema'`). A tela passa `novoCard` próprio (formulário do módulo) ou nenhum; ninguém cria card solto. |
| 3 | **Ordem de toda escrita:** domínio (`CC_*`) primeiro, quadro depois. Se o passo do quadro falhar, a rotina concilia (card ausente → cria; fase diferente da devida → move). |
| 4 | **Nenhum campo é obrigatório na lib.** O motor cobra obrigatórios em todo movimento, inclusive da rotina e para fase final, o que travaria régua, recusa e encerramento. Trava vira: (a) **condição de entrada** da fase seguinte, quando depende de campo do card e a fase só é alcançada por pessoa; (b) **gancho** `ccPodeMover` (04 §8), quando depende do domínio; (c) item de checklist = campo Sim/Não da fase, não obrigatório. O gestor pode endurecer um item marcando-o obrigatório na administração, sabendo que passa a travar também a rotina. |
| 5 | **Fase que a rotina alcança não tem condição de entrada** (fases da régua, `acordo`, `juridico`, `gestao`, `reanalise`, finais). |
| 6 | **Duas situações da chamada aninhada** (S-01/S-14): a JS de uma pessoa chama `kbCardMover`/`kbCardAtualizar`/`kbNotaRegistrar` por id passando `movidoPor`/`atualizadoPor`/`usuarioId` = `USER_ID` de quem age. (i) A plataforma **não** leva a sessão: vale o "em nome de", sem consulta ao gancho nem ao nível do quadro. (ii) A plataforma **leva** a sessão: a lib usa a sessão, confere o nível de acesso e consulta o gancho, que passa porque o domínio já foi gravado e o destino controlado não depende de quem move (04 §8, DT-35). Por isso agente e analista são responsáveis dos próprios cards, o supervisor é `membro` dos quadros em que age por SF (§2) e nenhuma SF põe efeito de quadro em nome de quem só lê aquele quadro (DT-34 regra 4). O código é o mesmo nas duas. |
| 7 | **Rotina** age sem sessão, em nome do responsável do card (agente ou analista) ou, sem ele, de `base.rotinaUsuarioEmail`. Não passa por gancho nem por nível. |
| 8 | **Nota no card** (`kbNotaRegistrar`) só em evento: mudança de fase pela rotina, promessa quebrada, acordo quebrado ou aprovado, bloqueio devido mudou, decisão, encaminhamento, envio ao Jurídico, encerramento. Nunca a cada rodada. |
| 9 | **Capa** só é regravada quando o valor mudou (comparação com o que foi enviado por último). Dias de atraso e prazo de SLA não são campo: saem do `prazo` do card e de `FASE_DESDE` + `SLA_HORAS`, que a lib mostra relativos. |
| 10 | **SLA** = `KB_FASE.SLA_HORAS`, horas corridas (padrão da pendência da 004: dias corridos). `0` = sem SLA. |
| 11 | **Datas da lib são UTC**; leitura `cc*` que junta `KB_CARD`/`KB_MOVIMENTO` converte para Brasília (`CONVERT_TZ`). |
| 12 | **Exclusão** de card: recusada sempre (`ccPodeExcluir`). |
| 13 | Tela: `atualizarACadaMs = 60000`; `podeMover` espelha o gancho só para esconder destino impossível (a decisão é do servidor); `antesDeMover` pede motivo na volta de fase. Abrir card = `kbCardDetalheSql` + uma `…Ficha` do módulo. |
| 14 | **Automação da lib**: nenhuma `mover_fase` é semeada (movimento automático é só da rotina) e nenhuma `enviar_email` para fora da empresa (cliente e órgão recebem só por `ccEmailEnviar`). As semeadas estão em §7. |

## 2. Acesso por cargo

`ACESSO_JSON.padrao = 'restrito'` em todos (restrito = vê e mexe só nos cards em que é responsável). O passo `ACESSOS` da rotina mantém `ADMINS_IDS` e `ACESSO_JSON.pessoas` conforme `CC_MEMBRO`, preservando chaves que não conhece (`semEmail`): é a única escrita direta em tabela `KB_` fora da semeadura (`ponytail:` troca por `kbBoardSalvar` sem sessão quando a lib oferecer).

| Cargo | `cobranca-*` | `concessao-*`, `pedidos-limite` | `juridico` |
|---|---|---|---|
| Agente | restrito (responsável dos casos dos seus clientes) | restrito (responsável das solicitações em que é o analista) | restrito (responsável do dossiê que abriu, até o envio) |
| Analista | restrito | restrito | — |
| Supervisor | membro | membro | membro (envia dossiê e aprova acordo judicial pela SF; o gancho só deixa o Jurídico mover à mão, DT-35) |
| Jurídico | leitor | — | membro |
| Gerente, Diretoria e quem tem a marca `ADMIN` (D-06: `PODE_ADMINISTRAR`) | admin | admin | admin |

`ADMINS_IDS` de cada quadro = `USER_ID` de todo membro ativo com `PODE_ADMINISTRAR`. Com isso quem edita parâmetro (`ccBaseParametroSalvar`, `ADM`) é administrador do quadro e pode renomear a fase com `kbFaseSalvar` quando `regua.*` muda (§3.1). Quem está em `ADMINS_IDS` **não** entra em `ACESSO_JSON.pessoas`: na lib o administrador vale mais que qualquer marca e vê e altera todos os cards e a estrutura (README da lib, "Níveis de acesso"). `pessoas` guarda só `membro` e `leitor` de quem não administra; `restrito` é o padrão e também fica fora.

Diferença conhecida (arquitetura §8.2): supervisor é `membro` e vê todos os cards do quadro; listagens e painéis `cc*` filtram pela hierarquia. Quem decide alçada, parecer ou dossiê não precisa de acesso de escrita ao quadro: age pela SF.

---

## 3. Cobrança — `cobranca-privada`, `cobranca-estetica`, `cobranca-publica`

### 3.1 Fases de `cobranca-privada` e `cobranca-estetica` (iguais; os dias vêm de `regua.*` da carteira)

| Ordem | Chave | Nome semeado | Tipo | SLA (h) | Cor | Entra quando |
|---|---|---|---|---|---|---|
| 1 | `prev_d5` | D-5 · Lembrete | comum | 0 | `data-1` | faltam ≤ `regua.prevAviso1` dias para o próximo vencimento e não há vencido |
| 2 | `prev_d1` | D-1 · Confirmação | comum | 0 | `data-1` | faltam ≤ `regua.prevAviso2` |
| 3 | `venc_d0` | D+0 · Vencimento | comum | 0 | `data-2` | vence hoje, ou atraso menor que `regua.confPag` |
| 4 | `pag_nao_ident` | D+2 · Pagamento não identificado | comum | 0 | `data-2` | atraso ≥ `regua.confPag` |
| 5 | `cob_ativa` | D+4 · Cobrança ativa | comum | 0 | `data-3` | atraso ≥ `regua.lig` |
| 6 | `notif_formal` | D+7 · Notificação formal | comum | 0 | `data-3` | atraso ≥ `regua.notif` |
| 7 | `protesto` | D+10 · Protesto em cartório | comum | 0 | `data-4` | atraso ≥ `regua.neg` |
| 8 | `neg_pos_protesto` | D+20 · Negociação pós-protesto | comum | 0 | `data-4` | atraso ≥ `regua.prop` |
| 9 | `extrajudicial` | D+30 · Extrajudicial | comum | 0 | `data-5` | atraso ≥ `regua.extra` |
| 10 | `juridico` | D+45 · Cobrança judicial | comum | 0 | `data-5` | envio do dossiê (`ccCobEnviarJuridico`); a régua **não** entra aqui sozinha |
| 11 | `negociacao` | Em negociação | comum | 240 | `data-6` | pessoa arrasta, ou proposta de acordo |
| 12 | `acordo` | Acordo em andamento | comum | 0 | `data-6` | acordo aprovado |
| 13 | `regularizado` | Regularizados | sucesso (final) | — | `data-7` | vencido zerou depois de ter atrasado |
| 14 | `pago_no_prazo` | Pagos no vencimento | sucesso (final) | — | `data-7` | caso preventivo que nunca atrasou |
| 15 | `baixado` | Baixados como perda | cancelado (final) | — | `data-8` | baixa aprovada |

Nome com dia = `nomeDaFase(chave, parametros)` (função pura em `lib/cobranca`); quando `regua.*` muda, a tela de parâmetros da 002 chama `kbFaseSalvar` para renomear, mandando a fase inteira lida da estrutura (inclusive `capaJson`, senão a capa volta ao padrão). Quem edita parâmetro é administrador do quadro (§2, D-06); se ainda assim for recusado, a tela avisa "O nome da coluna ainda mostra o dia antigo; um administrador pode renomear na administração do quadro." A regra não depende do nome. Caso com atraso ≥ `regua.jur` e sem dossiê fica em `extrajudicial` com a etiqueta `Pronto para o Jurídico`; ≥ `regua.jurMax`, `Jurídico atrasado`.

### 3.2 Fases de `cobranca-publica` (etapa do órgão = a mais avançada entre as NFs em aberto)

| Ordem | Chave | Nome semeado | Tipo | SLA (h) | Cor | Entra quando (calculado pela 005) |
|---|---|---|---|---|---|---|
| 1 | `nf_protocolar` | NF a protocolar | comum | 48 | `data-1` | há NF em aberto e nenhuma em etapa mais avançada (NF protocolada e no prazo conta aqui) |
| 2 | `liquidacao_vencida` | Liquidação vencida · cobrar atesto | comum | 120 | `data-3` | alguma NF passou do "liquidar até" sem liquidação |
| 3 | `pagamento_vencido` | Pagamento vencido · ordem cronológica | comum | 240 | `data-4` | alguma NF passou do "pagar até" sem pagamento |
| 4 | `oficio` | Ofício / notificação formal | comum | 240 | `data-4` | data devida do passo `L3` ou `G4` chegou em alguma NF (feito ou não: é ação devida) |
| 5 | `requerimento` | Requerimento administrativo | comum | 0 | `data-5` | data devida do passo `M2` chegou |
| 6 | `juridico` | Cobrança judicial | comum | 0 | `data-5` | envio do dossiê |
| 7 | `regularizado` | Pagos | sucesso (final) | — | `data-7` | todas as NFs pagas |
| 8 | `baixado` | Baixados como perda | cancelado (final) | — | `data-8` | baixa aprovada |

**Exceção D-05 (registrada no índice):** as fases do público não são dias de atraso, são andamento da NF; por isso quem diz a fase é a 005 (`ccPubRotina` → `ccCobCasoSincronizar`), não `ccCobRotina`. Chaves de papel igual são as mesmas (`juridico`, `regularizado`, `baixado`); o quadro não tem `negociacao`, `acordo` nem `pago_no_prazo`, então acordo parcelado e bloqueio de pedidos não se aplicam ao órgão.

### 3.3 Checklist — campos Sim/Não da fase (chave `<fase>_<n>`; ● = define "ação da fase feita"; ✉ = o e-mail da fase marca o item)

**Privada e Estética**

| Fase | Itens (texto exato) |
|---|---|
| `prev_d5` | 1 ● ✉ Lembrete de vencimento enviado (e-mail e WhatsApp) · 2 Lançamento da nota fiscal no financeiro do cliente confirmado |
| `prev_d1` | 1 ● ✉ Contato de confirmação do pagamento · 2 Boleto ou PIX reenviado, se necessário |
| `venc_d0` | 1 ● ✉ E-mail de vencimento do dia enviado |
| `pag_nao_ident` | 1 ● ✉ E-mail enviado informando que o pagamento não foi identificado, com a 2ª via · 2 ● Ligação para o financeiro do cliente sobre o pagamento não identificado · 3 Comprovante solicitado ou previsão de pagamento registrada |
| `cob_ativa` | 1 ● Ligação com o responsável financeiro do cliente · 2 ● Vendedor avisado e novos pedidos bloqueados no ERP · 3 Data e valor de pagamento registrados |
| `notif_formal` | 1 ● ✉ Notificação formal enviada (e-mail com confirmação ou carta com AR) · 2 Data de envio ao cartório informada ao cliente |
| `protesto` | 1 ● Título enviado a protesto em cartório · 2 Título negativado (Serasa / Boa Vista) · 3 ● Bloqueio total do crédito confirmado no ERP |
| `neg_pos_protesto` | 1 ● ✉ Proposta de acordo apresentada ao cliente · 2 Retorno do cliente registrado |
| `extrajudicial` | 1 ● ✉ Notificação extrajudicial enviada pelo Financeiro (modelo padrão, prazo de 15 dias) · 2 Caso encaminhado à assessoria de cobrança · 3 Última proposta de acordo apresentada |
| `juridico` | 1 ● Dossiê completo enviado ao Jurídico (marcado por `ccCobEnviarJuridico`) · 2 Contato amigável do Jurídico com o cliente · 3 Ação de execução ou monitória ajuizada |
| `negociacao` | 1 Proposta de acordo apresentada · 2 Acordo aprovado na alçada |
| `acordo` | 1 Termo de acordo assinado · 2 Parcelas geradas no cartão |
| `regularizado` | 1 Pagamento conferido · 2 Bloqueio de pedidos retirado · 3 Carta de anuência enviada e negativação excluída (quando houve protesto) |
| `baixado` | 1 Lançamento contábil da perda · 2 Cliente mantido bloqueado |

O "15 dias" do item `extrajudicial_1` é texto do artefato; o prazo de verdade é `jur.notifPrazoDias`. `pago_no_prazo` não tem itens.

**Pública**

| Fase | Itens (texto exato) |
|---|---|
| `nf_protocolar` | 1 NF e empenho conferidos · 2 NF protocolada com comprovante e certidões · 3 Agente de cobrança definido |
| `liquidacao_vencida` | 1 Fiscal do contrato contatado · 2 Pendências documentais verificadas · 3 Previsão de atesto e liquidação registrada |
| `pagamento_vencido` | 1 Posição na ordem cronológica pedida (LAI) · 2 Setor financeiro contatado · 3 Previsão de pagamento registrada |
| `oficio` | 1 Ofício enviado ao ordenador de despesa · 2 Protocolo registrado |
| `requerimento` | 1 Requerimento protocolado · 2 Reconhecimento de dívida ou programação de pagamento |
| `juridico` | 1 ● Encaminhado ao jurídico · 2 Ação ajuizada |
| `regularizado` | 1 Pagamento conferido |

No público a "ação feita" é o passo da régua da NF (`CC_NF_ACAO`), não o item do card; só `juridico_1` gera `CC_ACAO_REGUA`.

### 3.4 Card: título, prazo, capa, etiquetas

| Item | Privada / Estética | Pública |
|---|---|---|
| Título | `<CODCLI> · <nome>` | idem |
| Responsável | usuário do agente do cliente (rotina reconcilia na troca) | idem |
| `prazo` do card | vencimento mais antigo em aberto; em caso preventivo, o próximo vencimento | menor prazo pendente entre as NFs em aberto: `PAGAR_ATE` da NF liquidada, senão `LIQUIDAR_ATE` (o "liquidar até" de NF já liquidada não é prazo) |
| Campos de capa (sem fase) | `vencido` (moeda) · `a_vencer` (moeda) · `bus` (texto: composição por BU, ex. "Nutrição 60% · Enfermagem 40%") · `proxima_acao` (texto) · `proxima_acao_data` (data) · `bloqueio` (seleção: `Pedidos`, `Total`) · `acordo` (progresso: parcelas pagas) · `acao_fase` (seleção `A fazer`, `Feita`, com `config.filtro` — filtro "Ação da régua" do quadro) · `ultimo_contato` (data) — os dois gravados nas mesmas chamadas de `kbCardAtualizar` que já existem (ação, contato, rotina). "Valor atualizado" **não** vai à capa nem a lista: só no card aberto (aba Títulos) | `valor_aberto` (moeda) · `nfs_abertas` (número) · `acima_2m` (moeda) · `proxima_acao` · `proxima_acao_data` |
| Etiquetas (`etiquetas`) | `Protestado` · `Bloqueio pedidos` · `Bloqueio total` · `Bloqueio a aplicar` · `Promessa vencida` · `Sem contato` · `Anuência pendente` · `Baixa pendente` · `Pronto para o Jurídico` · `Jurídico atrasado` | `Acima de 2 meses` · `Pequeno valor` · `Promessa vencida` · `Baixa pendente` |
| Formulário inicial | nenhum (card nasce pela rotina) | idem |
| Condição de entrada | nenhuma (regra 5) | nenhuma |

### 3.5 Tela (uma só, da 002; recebe a carteira)

| Extensão | Privada / Estética (002) | A mais na Pública (005, por `registrarExtensao('cobranca-publica')`) |
|---|---|---|
| `conteudoDaFase` | bloco "Ação da fase": itens do checklist da fase com "Registrar" (`ccCobAcaoRegistrar`), prazo da ação, e-mail da fase (`ccCobEmailEnviar` ou situação na fila) | bloco "Régua da NF": passos devidos e feitos das NFs do órgão (`ccPubNfFicha`, `ccPubNfPassoRegistrar`) |
| `abasExtras` | "Títulos" (`ccBaseTitulosAbertos` + `ccCobEncargosCalcular`) · "Contatos" (`ccCobContatoListar`) · "Acordo e baixa" (da `ccCobCasoFicha`) | "Notas fiscais" (`ccPubNfListar`, `ccPubNfDatasSalvar`) · "Regra do ente" |
| `acoesExtras` | Registrar contato · Definir próxima ação · Propor acordo · Decidir acordo · Propor baixa · Parecer da baixa · Decidir baixa · Registrar bloqueio · Carta de anuência · Montar dossiê (cada uma visível conforme `pode` da ficha) | Lançar datas da NF · Preparar mensagem ao órgão (`ccPubMensagemPreparar`) |
| Fora do card | Minha agenda (`ccCobAgendaListar`), Bloqueios, Fila de e-mail, Projeção, Painel da cobrança | Notas fiscais, Contratos, Regras por ente, Certidões (telas da 005) |

Ações que o quadro da carteira não comporta somem sozinhas: sem fase `negociacao` não há "Propor acordo"; `PUBLICA` não tem bloqueio nem fila de e-mail.

### 3.6 O que a rotina faz — passo `REGUA` (`ccCobRotina`; carteiras `PRIVADA` e `ESTETICA`; na `PUBLICA`, só as linhas 8, 13 e 14 — DT-37)

Por cliente × carteira com posição alterada desde a última rodada (uma vez por dia, todos):

| # | Situação | Efeito no domínio | Efeito no quadro | Nota |
|---|---|---|---|---|
| 1 | sem caso aberto e (vencido > 0 ou próximo vencimento em até `regua.prevAviso1` dias), **exceto** quando o último caso da carteira foi encerrado `BAIXADO` e `VENC_MAIS_ANTIGO` da posição é anterior ou igual à data do encerramento (o saldo baixado continua no Winthor até a baixa contábil; `ponytail:` título novo que vence depois da baixa só abre caso quando os antigos saírem do Winthor) | abre `CC_COBRANCA` | cria o card na fase devida | — |
| 2 | fase devida pelos dias ≠ fase do card, e o card está em fase da régua | — | move (para frente ou para trás) | "Régua: <nome da fase>" |
| 3 | card em `negociacao`, `acordo` ou `juridico` | — | não move | — |
| 4 | parcela de acordo vencida há mais de `cob.quebraDias` | acordo `QUEBRADO` | devolve à fase da régua | "Acordo quebrado" |
| 5 | acordo cancelado (card em `negociacao` ou `acordo`) — acordo recusado mantém o card em `negociacao` | — | devolve à fase da régua | — |
| 6 | vencido zerou (e o título acompanhado saiu — `PROX_VENC ≠ DATA_REF` — ou não há fase devida; preventiva em curso não encerra, nem por pagamento atrasado de outro título) | encerra (também em `juridico`): `REGULARIZADO` se já atrasou — recebimento com `DIAS_ATRASO_PAGAMENTO > 0` desde a abertura do caso, ou, sem recebimento, fase devida fora da preventiva —, senão `PAGO_NO_PRAZO`; se `PROTESTADO`, `ANUENCIA_ATE` = hoje + `cob.anuenciaDiasUteis` úteis | move para a final; etiqueta `Anuência pendente` | "Regularizado" |
| 7 | bloqueio devido mudou (≥ `regua.lig` = `PEDIDOS`; ≥ `regua.bloqTotal` = `TOTAL`; sem atraso = nenhum) | `BLOQUEIO_DEVIDO` | etiqueta `Bloqueio a aplicar` enquanto devido ≠ aplicado | "Bloqueio devido: …" |
| 8 | promessa com data + `cob.promessaToleranciaDias` vencida sem recebimento | `QUEBRADA` (recebimento no período → `CUMPRIDA`) | etiqueta `Promessa vencida` | "Promessa quebrada" |
| 9 | sem contato há mais de `cob.semContatoDias` em caso vencido | — | etiqueta `Sem contato` | — |
| 10 | fase com modelo, `cob.emailModo` ≠ `AUTOMATICO` (`MANUAL` ou `APROVAR`), ação da fase não feita e sem fila para a chave | `CC_EMAIL_FILA` | — | — |
| 11 | fase com `cob.emailModo` = `AUTOMATICO` e sem `CC_EMAIL_ENVIADO` `ENVIADO` com `REFERENCIA = 'cobranca:<id>:<fase>'` (um envio por caso × fase) | envia (`ccEmailEnviar`, até 5 por rodada), `CC_ACAO_REGUA` se completa os ● | marca o item ✉ | — |
| 12 | item ● marcado direto no card (fora do botão) | `CC_ACAO_REGUA` (`ORIGEM = 'CARD'`); `protesto_1 = Sim` grava também `PROTESTADO` (pelo botão ou direto no card) | — | — |
| 13 | valores de capa, prazo, título ou responsável mudaram; ou há ação registrada (`CC_ACAO_REGUA`) cujo item ✉/● do card ainda não está "Sim" (lote da fila, envio ao Jurídico) | `CAPA_ENVIADA` | `kbCardAtualizar` (capa e itens na mesma chamada). Na `PUBLICA` só itens (`juridico_1`), etiqueta `Promessa vencida` e responsável: capa, prazo e título são da 005 (§3.7), e `CAPA_ENVIADA` não é tocada | — |
| 14 | caso aberto fora de `juridico` de cliente com processo ativo (`CC_PROCESSO` com `ENCERRADO_EM` nulo e `DOSSIE_ENVIADO_EM` preenchido ou `ORIGEM` ≠ `COBRANCA`) na mesma carteira (vale também para `PUBLICA`) | `JURIDICO_EM` (se nulo), `PROCESSO_ID` = processo ativo mais recente | move para `juridico` | "Processo no Jurídico: <autos>" |

**Na `PUBLICA` (DT-37):** a linha 8 (previsão de pagamento do órgão, RN-032 da 002) e a 13 só nos itens e no responsável valem porque não dependem de dias de atraso; a linha 9 não vale (o quadro público não tem `Sem contato` e o órgão é cobrado pelo passo da NF, E-2); as demais são régua por dias (E-1) ou não existem para o órgão (E-3).

"Ação no prazo" (`CC_ACAO_REGUA.NO_PRAZO`) = definição de 02 (`CC_ACAO_REGUA`): registrada até o dia de entrada na fase levado ao próximo dia útil (fase com SLA: entrada + SLA). Tudo segue a regra de `ccCobCasoSincronizar`, aplicada em processo (a rotina não chama a SF; D-001 da 002); a rodada respeita `orcamentoExec` e devolve `pendentes`.

### 3.7 O que a rotina faz — passo `PUBLICO` (`ccPubRotina`; carteira `PUBLICA`)

| # | Situação | Efeito |
|---|---|---|
| 1 | NF de órgão nova ou alterada no Winthor (emissão ≥ `pub.nfDataCorte`; novas a partir do maior `NUMTRANSVENDA` gravado + releitura das em aberto) | grava `CC_NF_PUBLICA`; recalcula `LIQUIDAR_ATE`, `PAGAR_ATE`, `LIMITE_2M`, `M2_DEVIDO`, `PROX_PASSO`, `PROX_PASSO_DATA`, `PEQUENO_VALOR` pela regra do ente e pelas datas lançadas; NF cancelada no Winthor → `CANCELADA = TRUE` |
| 2 | órgão com NF em aberto, e fase, prazo, capa ou próxima ação diferentes do que está em `CC_COBRANCA`/`KB_CARD` (compara antes de chamar) | `ccCobCasoSincronizar({ carteira: 'PUBLICA', faseChave, prazo, capaJson, proxAcao, proxAcaoData })` com a fase de §3.2, o próximo passo devido da régua da NF e a capa (JSON com as chaves em ordem alfabética); etiquetas `Acima de 2 meses` e `Pequeno valor` na chave `etiquetas` do `capaJson` |
| 3 | caso em `juridico` | `faseChave = ''` (não mexe na fase; só capa) |
| 4 | todas as NFs do órgão pagas (órgão sem nenhuma linha em `CC_NF_PUBLICA` não é encerrado pela 005: o caso não é dela) | `desfecho = 'REGULARIZADO'` |
| 5 | baixa aprovada no caso (002) | marca `BAIXADA` nas NFs em aberto do órgão |

Nota no card só quando a fase muda ("Etapa do órgão: <nome>"), pela entrada `nota` de `ccCobCasoSincronizar` (rotina e `ccPubNfDatasSalvar`). Responsável do card: a 002 reconcilia (§3.6 linha 13); a 005 não manda `responsavelUserId`.

---

## 4. Concessão — `concessao-privada`, `concessao-estetica`, `concessao-publica`

Um card acompanha a solicitação e, aprovada, o crédito por toda a vida dele (renovação volta à mesma fase `gestao`; cada período é uma linha de `CC_CREDITO`). Crédito novo aprovado para o mesmo cliente encerra o anterior (card em `encerrada`).

### 4.1 Fases

Fases de mesmo papel têm a **mesma chave** nos três quadros; o código da 004 só usa a chave.

| Chave | `concessao-privada` e `concessao-estetica` | SLA (h) | `concessao-publica` | SLA (h) | Tipo | Cor |
|---|---|---|---|---|---|---|
| `entrada` | 1 · Solicitação recebida | 24 | 1 · Recebimento da solicitação | 24 | comum | `data-1` |
| `cadastral` | 2 · Documentação e análise cadastral | 72 | — | | comum | `data-2` |
| `credito` | 3 · Análise de crédito | 72 | — | | comum | `data-2` |
| `analise` | — | | 2 · Análise documental e financeira | 192 | comum | `data-2` |
| `comite` | 4 · Comitê / Alçada | 48 | 3 · Classificação de risco e aprovação | 48 | comum | `data-3` |
| `formalizacao` | 5 · Formalização | 48 | — | | comum | `data-4` |
| `liberacao` | 6 · Liberação | 24 | — | | comum | `data-4` |
| `gestao` | Gestão de crédito | 0 | Monitoramento (crédito ativo) | 0 | comum | `data-7` |
| `reanalise` | Reanálise | 120 | Reavaliação de risco | 120 | comum | `data-5` |
| `obsoleto` | Cadastro obsoleto | — | Cadastro obsoleto | — | cancelado (final) | `data-8` |
| `recusada` | Recusadas | — | Recusadas | — | cancelado (final) | `data-8` |
| `encerrada` | Encerradas (crédito substituído) | — | Encerradas | — | sucesso (final) | `data-6` |

`CC_SOLICITACAO.PRAZO_DECISAO` = abertura + soma dos SLAs das fases comuns até `comite`, inclusive (privado 9 dias, o `meta.tempoDecisaoDias`; público 11 dias).

Regras lidas do quadro, não da carteira: decisão na fase `comite`; `APROVADA` leva à próxima fase comum na ordem (privado `formalizacao`; público `gestao`); quadro sem `liberacao` cria o crédito na própria decisão; quadro com `liberacao` cria quando a pendência `APLICAR_LIMITE` é aplicada.

### 4.2 Checklist — campos Sim/Não da fase (texto exato do artefato)

**Privada e Estética**

| Fase | Itens |
|---|---|
| `entrada` | 1 Proposta assinada pelo cliente · 2 Documento de identificação recebido · 3 Autorização de consulta ao SCR e aos bureaus assinada (LGPD) |
| `cadastral` | 1 Consulta Serasa / Boa Vista · 2 Consulta SCR (endividamento bancário) · 3 Restritivos e protestos verificados · 4 Grupo econômico mapeado · 5 Confirmação por contato telefônico com o cliente · 6 Confirmação de endereço (comprovante, visita ou foto da fachada) · 7 Contato financeiro identificado e confirmado · 8 Comprovante de renda ou faturamento · 9 Comprovante de endereço · 10 Contrato social e últimas alterações (PJ) · 11 Situação na Receita Federal e quadro societário (QSA) conferidos · 12 Ações judiciais, falência e recuperação judicial pesquisadas · 13 Sócios e empresas ligadas sem débitos com o grupo |
| `credito` | 1 Capacidade de pagamento calculada · 2 Score e rating atribuídos · 3 Limite e condições sugeridos · 4 Parecer do agente |
| `comite` | 1 Alçada de aprovação definida · 2 Proposta apresentada · 3 Decisão e condições registradas |
| `formalizacao` | 1 Termo de concessão de limite / contrato de fornecimento emitido · 2 Garantias formalizadas, quando exigidas (aval, nota promissória, fiança ou seguro de crédito) · 3 Termo assinado digitalmente · 4 Poderes de quem assina conferidos (contrato social ou procuração) |
| `liberacao` | 1 Conferência final de documentos · 2 Limite cadastrado e ativo no ERP |
| `gestao` | 1 Limite cadastrado no ERP · 2 Validade de 3 meses registrada · 3 Monitoramento de exposição ativo · 4 Garantias e covenants acompanhados |
| `reanalise` | 1 Histórico de compras e pagamentos revisado · 2 Serasa e SCR atualizados · 3 Limite reavaliado · 4 Parecer de renovação registrado |
| `obsoleto` | 1 Limite bloqueado no ERP · 2 Cliente informado |
| `recusada` | 1 Motivo da recusa registrado · 2 Cliente comunicado |

Campo a mais na fase `formalizacao`: `termo_assinado` (tipo **Anexo**, rótulo "Termo de concessão assinado"). O "3 meses" do item `gestao_2` é texto do artefato; a validade de verdade é `cred.validadeMeses`.

**Pública**

| Fase | Itens |
|---|---|
| `entrada` | 1 Solicitação da área Comercial ou de Licitação · 2 Órgão público identificado · 3 Valor e prazo da operação definidos |
| `analise` | 1 Contrato ou ata, empenho e ordem de fornecimento · 2 Dotação orçamentária e autorização da despesa · 3 Publicação da contratação, quando aplicável · 4 Capacidade financeira do ente avaliada · 5 Histórico de pagamentos e restos a pagar verificados |
| `comite` | 1 Risco da operação classificado · 2 Aprovação conforme a política e as alçadas |

Com base `EDITAL` (ainda sem contrato), `analise_1` é marcado com o edital ou termo de referência conferido (texto de ajuda do campo). As fases `gestao`, `reanalise`, `obsoleto` e `recusada` do público não têm itens no artefato: não são semeados (o gestor cria na administração se quiser).

### 4.3 Travas

| Para entrar em | Condição de entrada no quadro (campo do card) | Gancho (domínio) — 04 §8 |
|---|---|---|
| `cadastral` / `analise` | — | valor, prazo e analista |
| `credito` | `cadastral_5 = Sim` E `cadastral_6 = Sim` E `cadastral_7 = Sim` | consultas obrigatórias válidas |
| `comite` (privado, estética) | — | análise de crédito completa |
| `comite` (público) | `analise_1 = Sim` E `analise_2 = Sim` | análise do órgão completa (trecho da 005) |
| fase seguinte a `comite` | — | decisão `APROVADA` |
| `liberacao` | `termo_assinado` preenchido | garantia formalizada, se houver |
| `gestao`, `reanalise`, finais | nenhuma (regra 5) | estado do crédito |

### 4.4 Card e tela

| Item | Valor |
|---|---|
| Título | `<CODCLI> · <nome>` |
| Responsável | usuário do analista da solicitação |
| `prazo` do card | `PRAZO_DECISAO` até a decisão; depois `FIM_VALIDADE` do crédito |
| Campos de capa | `valor` (moeda: solicitado; depois da decisão, limite aprovado) · `tipo_cliente` (seleção) · `rating` (texto: AA–E ou P1–P4) · `validade` (data) · `limite_sugerido` (moeda, do motor) · `alcada` (texto: rótulo da alçada exigida) · `pendencia` (texto: o que o gancho recusaria para avançar; gravado só pelo `Salvar` e pela decisão — a rotina não o atualiza: depois de movimento à mão ou de item marcado direto no card, a capa mostra o que faltava até o próximo `Salvar`; a ficha mostra o certo) |
| Etiquetas | `Exceção ao motor` · `Ajuste de rating pendente` · `Pré-aprovada` · `Aplicar no Winthor` · `Limite diverge do Winthor` · `Renovação` |
| Formulário inicial | nenhum na lib; "Nova solicitação" é formulário do módulo (`ccCredSolicitacaoCriar`) |
| `conteudoDaFase` (004) | `entrada`: dados da solicitação · `cadastral`: consultas e contato financeiro · `credito`: financeiro, fonte pagadora, motor (`ccCredMotorCalcular`), ajuste de rating, limite e parecer · `comite`: alçada exigida e decisão · `liberacao`: pendências do Winthor · `gestao`/`reanalise`: crédito, risco, gatilhos de revisão |
| `conteudoDaFase` a mais no público (005) | `analise` e `comite`: ficha do órgão com a nota do motor (`ccPubAnaliseObter`, que já traz `motor`; `ccPubAnaliseSalvar`; "Calcular" = `ccPubMotorCalcular` com `gravar = 1`) · `gestao`: contrato (saldo e vigência) |
| `abasExtras` | "Histórico de crédito" (`ccCredSolicitacaoHistorico`) · "Posição" (`ccBaseClienteFicha`); no público, a 005 soma "Notas fiscais" |
| `acoesExtras` | Atribuir analista · Recusar · Ajustar rating · Decidir ajuste · Registrar decisão · Aplicar no Winthor · Antecipar reanálise · Concluir reanálise |

### 4.5 O que a rotina faz — passo `CREDITO` (`ccCredRotina`)

| # | Situação | Efeito no domínio | Efeito no quadro | Nota |
|---|---|---|---|---|
| 1 | crédito vigente e solicitação aberta, relidos a cada rodada (carteiras com motor da 004) | recalcula e grava só o que mudou em `CC_RISCO_CLIENTE` (score, rating atual, criticidade, saúde, flexibilização, chance de atraso, gatilhos) | capa `rating`; etiqueta `Limite diverge do Winthor` | só quando o rating muda |
| 2 | crédito em `GESTAO` com `FIM_VALIDADE` vencida e ≥ `cred.comprasRecorrentes` compras no período | `SITUACAO = 'REANALISE'` | move para `reanalise` | "Validade vencida: reanálise" |
| 3 | idem, sem compras recorrentes; ou sem compra há `cred.diasSemCompra` dias | `SITUACAO = 'OBSOLETO'` + pendência `BLOQUEAR_LIMITE` | move para `obsoleto`; etiqueta `Aplicar no Winthor` | "Cadastro obsoleto: …" |
| 4 | mês fechado ainda sem foto (idempotente pela `UQ`; na implantação, a primeira rodada no meio de um mês grava uma vez o estado daquele dia com o rótulo do mês anterior) | foto em `CC_CALIBRACAO` | — | — |
| 5 | card sem par ou em fase diferente do estado do crédito (inclui o card do crédito substituído, que vai para `encerrada`) | — | concilia (a capa `pendencia` não é regravada, §4.4) | — |

Linhas 2 e 3 valem para as três carteiras; a 1 e a 4, só para `PRIVADA` e `ESTETICA`.

---

## 5. `pedidos-limite` (004)

| Ordem | Chave | Nome | Tipo | SLA (h) | Cor | Itens do checklist (texto exato) |
|---|---|---|---|---|---|---|
| 1 | `retido` | Retido por limite | comum | 2 | `data-3` | 1 Excesso confirmado no ERP · 2 Agente responsável atribuído |
| 2 | `analise` | Análise do excesso | comum | 4 | `data-4` | 1 Títulos em aberto e atrasos verificados · 2 Histórico de pagamento consultado · 3 Exposição do grupo econômico revisada · 4 Recomendação registrada |
| 3 | `alcada` | Aprovação da alçada | comum | 8 | `data-5` | 1 Alçada competente acionada · 2 Condição de liberação definida |
| 4 | `liberado` | Liberado | sucesso (final) | — | `data-7` | 1 Desbloqueio feito no ERP · 2 Comercial avisado |
| 5 | `recusado` | Recusado | cancelado (final) | — | `data-8` | 1 Motivo registrado · 2 Comercial avisado |

Título `Pedido <número> · <CODCLI> · <nome>`. Responsável: analista do pedido. Capa: `valor` (moeda) · `excesso` (moeda) · `excesso_pct` (número) · `alcada` (texto) · `uso` (progresso: utilizado de limite na data do pedido). Etiquetas: `Liberação crítica` · `Dentro da regra`. Sem condição de entrada; para `liberado`/`recusado` só pela decisão (gancho). Card nasce por `ccCredPedidoCriar` (lançamento manual pelo número do pedido). A rotina não move este quadro; só concilia card ausente.

---

## 6. `juridico` (003)

| Ordem | Chave | Nome | Tipo | SLA (h) | Cor |
|---|---|---|---|---|---|
| 1 | `dossie` | 01 · Dossiê em montagem | comum | 240 | `data-1` |
| 2 | `recebido` | 02 · Recebido · contato amigável | comum | 0 | `data-2` |
| 3 | `peticao` | 03 · Petição inicial | comum | 0 | `data-2` |
| 4 | `custas` | 04 · Custas e protocolo | comum | 0 | `data-3` |
| 5 | `citacao` | 05 · Citação | comum | 0 | `data-3` |
| 6 | `defesa` | 06 · Defesa e instrução | comum | 0 | `data-4` |
| 7 | `sentenca` | 07 · Sentença e recursos | comum | 0 | `data-4` |
| 8 | `execucao` | 08 · Cumprimento e execução | comum | 0 | `data-5` |
| 9 | `acordo` | 09 · Acordo judicial | comum | 0 | `data-6` |
| 10 | `suspenso` | 10 · Suspenso · RJ · arquivado | comum | 0 | `data-8` |
| 11 | `encerrado` | Encerrado | sucesso (final) | — | `data-7` |

SLA de `dossie` = `jur.dossieParadoDias` em horas (semeado 240). Nas demais o prazo é processual: vai no `prazo` do card (`CC_PROCESSO.PRAZO`, começando em envio + `jur.prazoInicialDu` dias úteis). O motivo do encerramento fica no domínio (`MOTIVO_ENCERRAMENTO`), por isso uma só fase final.

| Item | Valor |
|---|---|
| Título | `<nome do devedor> · <autos ou "sem autos">` |
| Responsável | quem abriu o dossiê até o envio; no envio, o `RESPONSAVEL_ID` do processo ou, se vazio, o primeiro membro `JURIDICO` ativo (`MIN(ID)`, provisório, P-50) |
| Campos de capa | fixos: `valor` (moeda) · `carteira` (seleção) · `autos` (texto) · `prazo_descricao` (texto) · `situacao` (texto: `STATUS`) · `tribunal` (texto) · `filial`, `bu`, `linha` (seleção com `config.filtro`: filtros do quadro; as opções de `bu` são os ids fixos do setup; as de `filial` nascem com as filiais do elenco do simulador e, **na implantação**, o gestor as troca pelas filiais credoras reais na administração do quadro — valor sem opção não vai à capa). Por fase (`capa`): `dossie` (progresso: itens OK de obrigatórios) em `dossie` e `recebido` · `custo` (texto "R$ x · y%") de `custas` a `execucao` · `acordo` (progresso: parcelas pagas) em `acordo`. Todos gravados pelas SFs da 003 no `kbCardAtualizar` que cada uma já faz |
| Etiquetas | `Custo a pagar` · `Carga a conferir` · `Substabelecer` — gravadas por evento (custo, carga, `ccJurProcessoSalvar`). Prazo vencendo e dias sem andamento **não** são etiqueta: o prazo relativo e o filtro "Atrasados" são da lib (`prazo` do card) e os dias sem andamento aparecem no cartão e na aba de alertas |
| Checklist na lib | nenhum: os itens do dossiê têm três estados, observação e anexos, e ficam em `CC_DOSSIE_ITEM` (§8) |
| Condição de entrada | nenhuma; travas no gancho (04 §8) |
| `conteudoDaFase` | opção escolhida "Tudo em Nesta fase": `dossie`: itens do dossiê com sugestão, marcação e "Enviar ao Jurídico" · demais: dados do processo e prazo, andamentos, custos, acordo judicial e dossiê (leitura) como blocos |
| `abasExtras` | "Processo completo" · "Cobrança de origem" |
| `acoesExtras` | Enviar dossiê · Registrar andamento · Lançar custo · Registrar acordo · Demonstrativo do débito (PDF) · Encerrar processo |
| Rotina | não tem passo próprio; o quadro não é movido por rotina (a 002 é que leva o caso de cobrança a `juridico`, 05 §3.6 linha 14) |

Documentos do processo (petição, guias, comprovantes) são anexos do card (`KB_ANEXO`).

---

## 7. Automações da lib semeadas

| Quadro | Gatilho | Ação |
|---|---|---|
| `concessao-*` | card movido para `comite` | `enviar_email` ao `$responsavel`: "Solicitação aguardando decisão da alçada" |
| `concessao-*` | card movido para `reanalise` | `enviar_email` ao `$responsavel`: "Crédito em reanálise" |
| `pedidos-limite` | card movido para `alcada` | `enviar_email` ao `$responsavel`: "Pedido aguardando alçada" |
| `juridico` | card movido para `recebido` | `enviar_email` ao `$responsavel`: "Dossiê recebido pelo Jurídico" — o `$responsavel` no movimento ainda é quem abriu o dossiê (o `kbCardAtualizar` que passa o card ao Jurídico vem depois), então o e-mail é a confirmação de recebimento para o Financeiro; o Jurídico recebe o aviso padrão de novo responsável da lib |

Cobrança não tem automação de e-mail (a agenda e a fila fazem o papel; evita um e-mail por card por dia). Avisos padrão da lib (novo responsável, menção, tarefa) continuam ligados. Todas são editáveis pelo gestor na aba Automações.

---

## 8. Itens do dossiê do Jurídico (`CC_DOSSIE_ITEM.ITEM`)

Criados por `ccJurDossieAbrir` conforme a carteira do caso (`PUBLICA` = coluna Público; as outras = Privado). As sugestões que vêm de tabela de outra spec são lidas direto da tabela, nunca por SF SQL aninhada (DT-34). "Auto" = já nasce `OK` com a sugestão do sistema, podendo ser reaberto.

| Código | Texto exato | Obrigatório | Privado | Público | Sugestão automática |
|---|---|---|---|---|---|
| `nf` | Notas fiscais (DANFE e XML) das faturas em aberto | sim | ● | ● | lista de títulos vencidos (`ccBaseTitulosAbertos`) |
| `entrega` | Comprovantes de entrega assinados (canhoto, CT-e ou recibo) | sim | ● | ● | — |
| `pedido` | Pedido de compra, proposta comercial ou contrato com o cliente | sim | ● | | — |
| `contrato` | Contrato administrativo ou ata de registro de preços | sim | | ● | contrato da análise do órgão mais recente (`CC_ANALISE_ORGAO`) |
| `empenho` | Nota de empenho e ordem de fornecimento | sim | | ● | empenhos das NFs (`CC_NF_PUBLICA`) |
| `atesto` | Protocolo da NF no órgão e atesto ou termo de recebimento | sim | | ● | datas de protocolo e atesto das NFs |
| `titulo` | Boletos ou duplicatas e posição dos títulos no Winthor | sim | ● | | posição do cliente |
| `protesto` | Instrumento de protesto e comprovante de negativação | sim | ● | | `CC_COBRANCA.PROTESTADO` |
| `notif` | Notificação extrajudicial (modelo padrão) e comprovante de recebimento | sim | ● | | última `CC_NOTIFICACAO_EXTRAJUDICIAL` |
| `oficio` | Ofícios de cobrança e requerimento administrativo protocolados | sim | | ● | passos `L3`, `G4`, `M2` de `CC_NF_ACAO` |
| `lai` | Posição na ordem cronológica de pagamentos (resposta à LAI) | não | | ● | passo `G2` |
| `certidoes` | Certidões de regularidade da Benenutri na data do faturamento | sim | | ● | `CC_CERTIDAO` vigentes na emissão das NFs |
| `demonst` | Demonstrativo atualizado do débito (principal, multa, juros e correção) | sim (auto) | ● | ● | `ccCobEncargosCalcular` |
| `hist` | Histórico de cobrança (régua, contatos, promessas e propostas) | sim (auto) | ● | ● | `CC_ACAO_REGUA`, `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `CC_ACORDO` |
| `cadastro` | Cadastro do devedor: cartão CNPJ/CPF, contrato social, sócios, endereço | sim | ● | ● | dados de `CC_CLIENTE` |
| `garantia` | Garantias e confissões: aval, fiança ou termo de acordo anterior | não | ● | ● | garantia do último acordo ou da solicitação |
| `alcada` | Aprovação do encaminhamento ao Jurídico pela Gestão Financeira | sim | ● | ● | marcado pelo próprio envio (nível ≥ `jur.envioNivelMin`) |

Envio exige todos os obrigatórios da carteira em `OK` ou `NA` (não se aplica) com observação, menos `alcada`.
