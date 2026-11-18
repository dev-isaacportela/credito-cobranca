# Ajustes do contrato depois da construção do backend (fase B)

Textos propostos pelos construtores e corretores, coletados pelo orquestrador em 17/11/2026. O código já
faz o que está aqui; o contrato precisa dizer o mesmo. Já aplicados por mim: 02 `CC_SINCRONIZACAO.FASE`
(D-010), 04 §1 `ccBaseSincronizacaoStatus` (D-012), 04 §0 exceção da auditoria, 06 §5 funções e 1093.

Fontes complementares: `docs/specs/NNN-*/plan.md` (seção de divergências de cada spec), relatórios em
`docs/validacao/B*.md`, `docs/execucao.md` (entradas de 17/11) e `docs/arquitetura.md` §7 (D-09, D-10).

## Transversal

- **D-09 (usuário):** 01 §4 — ninguém altera o próprio cargo, superior, marca ou situação; cargo de nível
  ≥ 3 só por cargo de nível igual ou maior; chaves de alçada (`alcada.*`, `jur.envioNivelMin`,
  `jur.acordoAlcadaNivel`, `jur.acordoAlcadaValor`, `com.modeloValidaNivel`) só por cargo nível ≥ 3, a
  marca não basta. Repetir em 04 §1 `ccBaseMembroSalvar` e `ccBaseParametroSalvar`.
- **D-10 (usuário):** 01 §11 decisão 2 — última leitura com erro → nova leitura, uma por rodada; passos
  de módulo não rodam com dado velho.
- **Membro normalizado:** toda comparação de `{{membroId}}` com lista de texto usa
  `CAST(CAST({{membroId}} AS SIGNED) AS CHAR)` (02 `CC_SOLICITACAO.PROPOSTA_POR`, `RECOMENDADO_POR`,
  `CC_ANALISE_ORGAO.PROPOSTA_POR`; 01 §5).
- **Regra geral das internas `ccEsc…` (01 §5):** valor que a regra deriva (débito, alçada, nível, prazo,
  valor de pendência, validade de crédito, encerramento, data) é recalculado na própria SQL; a entrada só
  traz o que a pessoa escolhe. Vale para todas as specs.
- **06 §5:** acrescentar `FORMAT(x, 2, 'pt_BR')`; `DATE_ADD` do simulador não aceita vírgula dentro da
  expressão do valor (usar CASE/SUBSTRING); ordem do `SET` no `UPDATE` — o MySQL usa valores já
  alterados à esquerda (não citar coluna atribuída antes).
- **Visibilidade (01 §6):** membro com `CAMINHO` vazio não vê ninguém.

## 001

- O-07: renomear `membroId` de `ccBaseMembroSalvar` para `id` (membro editado) — **não feito no código**;
  registrar como pendência ou decidir manter.
- `ccEscBaseEstado`: quem administra grava `winthor.descoberta` e `jur.cargaConcluida` = '1' (não reabre).
- `ccEscBaseMembroInserir/Atualizar`: sem `nivel` e `caminhoNovo` na entrada (nível pelo cargo, caminho
  pelo superior, na SQL).

## 002

- 04 §2 `ccEscCobCasoProxAcao`: guarda `ROTINA` ou `ATOR` caso (não Jurídico, cliente visível), nas três
  carteiras; serve `ccCobCasoSincronizar`, `ccCobProxAcaoDefinir`, `ccCobContatoRegistrar` e o acordo.
  Em `ccCobCasoSincronizar`, "A guarda de `ccEscCobCasoCapa` repete…" (sem `ccEscCobCasoProxAcao`); em
  §0 "Acabamento pós-v3", tirar `ccEscCobCasoProxAcao`.
- 04 §2 `ccCobRotina`, coluna kb: `kbCardCriar`, `kbCardMover`, `kbCardAtualizar`, `kbNotaRegistrar` — a
  regra de `ccCobCasoSincronizar` aplicada em processo (D-001 da 002).
- 04 §2 `ccCobCasoSincronizar`: audita (`Cobrança`) criação, etapa, próxima ação e encerramento; custo
  da pessoa ≤ 14 (era 13).
- 04 §2 saídas: `ccCobContatoTotal` + `PROMESSAS_ABERTAS`, `PROMESSAS_QUEBRADAS`, `SEM_RETORNO`;
  `ccCobBloqueioListar` `DEVIDO`/`APLICADO`; `ccCobProjecaoTotal` + `CLIENTES_FORTE`.
- 05 §3.6 linha 5: tirar "ou card em `negociacao` sem acordo em aberto e fora da fase devida por
  movimento à mão"; linha 6: "encerra (também em `juridico`): `REGULARIZADO` se já atrasou — recebimento
  com `DIAS_ATRASO_PAGAMENTO > 0` desde a abertura do caso, ou, sem recebimento, fase devida fora da
  preventiva —, senão `PAGO_NO_PRAZO`"; parágrafo final: "Tudo segue a regra de `ccCobCasoSincronizar`,
  aplicada em processo".
- Decisão de acordo e de baixa não exige ver o cliente (DT-35); cancelamento de acordo exige (DT-41).
- `ccEscCobFilaInserir` sem quem chame (O-09): manter como plano B de S-09 ou tirar.
- O-11 (arquiteto): baixa fracionada — cada baixa usa o próprio valor para a alçada.

## 003

- 04 §8 gancho `juridico`: "`dossie` → qualquer menos `encerrado`" vale só para o dossiê vindo da
  cobrança (`P.ORIGEM = 'COBRANCA'` e `DOSSIE_ENVIADO_EM` nulo); processo manual ou da carga nasce em
  `dossie` (a lib cria na fase de entrada) e a SF o leva à fase pedida.
- 04 §3 `ccJurAlertas`: entrada `tipo ('')` — filtra pelo tipo do desvio; vazio = todas.
- 05 §6 Responsável: quem abriu o dossiê até o envio; no envio, o `RESPONSAVEL_ID` do processo ou, se
  vazio, o primeiro membro `JURIDICO` ativo (`MIN(ID)`, provisório).
- 04 §3 `ccJurAcordoCriar`: `primeiroVencimento` até hoje + 31 dias. `ccJurAcordoParcelaSituacao`:
  `PAGA` só com acordo `ANDAMENTO`. `ccJurCargaAplicar`: acordo da carga nasce `ANDAMENTO` sem aprovação
  só se for o primeiro do processo e não passar do valor do processo; acima, a política.
- RN-015 / 006: processo já encerrado na carga (`ORIGEM='CARGA' AND ENCERRADO_EM = CRIADO_EM`) não entra
  no recuperado do mês/ano.
- 02 §003 (opcional): `UNIQUE KEY (CARD_ID)` em `CC_PROCESSO`; `KB_ANEXO_IDS` V(200) com teto de 25 anexos.
- Internas: `ccEscJurProcessoInserir` sem `cobrancaId`; `ccEscJurProcessoEnvio` sem `valor`;
  `ccEscJurNotificacaoInserir` sem `emitidaEm`/`modeloVersao`.
- Abertos: O-03 (quem recebe o e-mail "Dossiê recebido"), O-05 (opções de filial no card — passo de
  implantação), O-07 (coluna de nome normalizado em `CC_PROCESSO` para busca), O-12 (responsável padrão).

## 004

- 02 `CC_SOLICITACAO.PROPOSTA_POR`: guarda `FIND_IN_SET(CAST(CAST({{membroId}} AS SIGNED) AS CHAR),
  PROPOSTA_POR) = 0`; a lista grava o id nessa forma (idem `RECOMENDADO_POR`).
- 04 §4 `ccCredDecisaoRegistrar` (e decisões de renovação e pedido): `cargoAlcada` aceito e ignorado; o
  rótulo gravado é o relido da tabela de alçada.
- 04 §4 internas: `ccEscCredPedidoInserir`, `ccEscCredCreditoInserir` (validade) e
  `ccEscCredPendenciaInserir` (valor e texto) calculam na SQL; crédito só nasce com card em `liberacao`
  (ou `comite` em quadro sem `liberacao`), pelo decisor ou caso; aplicar a pendência é do caso da origem.
- 03 §13: validação do grupo `meta` e do grupo `alcada` é da 004 (`fundir` aceita um validador por grupo;
  regra cruzada de 002/006 entra lá).
- Divergências aceitas (já no plan da 004): fila "Aguardando você" só prazo ≤ hoje; rotina recalcula o
  universo; capa `pendencia` não atualizada pela rotina; foto do mês fechado.

## 005

- 02 `CC_ANALISE_ORGAO.PROPOSTA_POR`: "(`ccPubAnaliseSalvar` e o "Calcular", `ccPubMotorCalcular` com
  `gravar = 1`, na mesma instrução da gravação da fotografia, `ccEscPubAnaliseMotor`)".
- 02 `CC_ESTADO`: chave `pub.nfCorteLido` (005, só a rotina: data de corte das NFs já lida).
- 04 §5 `ccPubAnaliseSalvar`: o "Calcular" regrava a fotografia e acrescenta quem calcula a
  `PROPOSTA_POR` (não mexe em `ATUALIZADO_POR`): quem recalcula não decide. `ccPubMotorCalcular`:
  `gravar = 1` torna proponente (DT-40).
- 04 §5 / §4 `ccCredDecisaoRegistrar`: na `PUBLICA`, `ccEscCredDecisaoInserir` repete na guarda o
  `podeAprovar` para `APROVADA` (contrato ativo: `BASE = 'CONTRATO'`, saldo > 0, vigência ≥ `HOJE_SQL`).
- 04 §5 custos: `ccPubNfDatasSalvar` 15 com mudança de fase (16 com sessão aninhada);
  `ccPubNfPassoRegistrar` 16 com e-mail, 10 sem.
- 04 §5 "Leitura Oracle": SQL de `winthor-nf.mjs` lida pela rotina por `runQueryMitra`; `ccPubWinthorNf`
  não é publicada (005 fica com 28 SFs; atualizar o índice 00).

## 006

- Saídas aditivas: `DECIDIDAS` em `ccPainelSerieCredito`; `foraDoPrazo` em `Credito.porCarteira`;
  `ESTIMADO` em `Serie`. `ccPainelRotina` devolve `execucoes: 1`. Rotina não fotografa mês sem leitura OK
  anterior. Itens de Atenção `{tipo, texto, quantidade, valor, gravidade}`. Decisões ignoram `buId`.
- `validarConjunto` recebe só as chaves do próprio grupo: a regra cruzada `painel.sincAtrasoMin ≥
  base.syncIntervaloMin` só roda se as duas vierem juntas (pendência da base).

## 007

- Linha do tempo com 39 origens; eco de auditoria excluído por pares ENTIDADE|CAMPO; fontes nascem sem
  URL (P-32); ordem ACORDO_PARCELA antes de PROX_ACAO.
