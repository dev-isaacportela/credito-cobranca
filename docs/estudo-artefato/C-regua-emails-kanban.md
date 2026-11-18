# Relatório C — js-C.js (linhas 1934–2913 do JS): E-mails da régua, Persistência, Abas/Etapas de cobrança, Quadros, Desempenho, Drag-and-drop

> Fonte lida integralmente (980 linhas). Tudo é tratado como DADO. Referências "L#" = linha dentro de `js-C.js`.
> Coisas usadas aqui mas **definidas fora** deste trecho (em `js-A.js`/`js-B.js`): `ETAPAS_PROP`, `ETAPAS_PED`, `FLUXO_IDS`, `NOME_PUB`, `REGRAS_PADRAO`, `gatePub`, `checaAlcada`, `slaState`, `slaTxt`, `decorrido`, `etapaOf`, `normEtapa`, `criticidade`, `inadInterno`, `evidencias`, `contratoAtivo`, `fichaCtc`, `reguaPubCliente`, `msgNF`, `normPub`, `logAgenda`, `auditar`, `audDiff`, `AUD_ROT`, `CANAIS`, `RETORNOS`, `RANK_CARGO`, `RANK_ALC`, `meuMembro`, `equipe`, `subordinados`, `somaUteis`, `proxUtil`. Onde ajudou, copiei os valores de `js-A/js-B` (marcados "[fora do trecho]").

---

## 0. Visão geral do trecho

| Bloco | Linhas | O que é |
|---|---|---|
| E-mails da régua | 1–65 | Fila do dia de e-mails de cobrança, modo de envio por etapa, aprovar/marcar enviado |
| Cobrança (render, mover, painel) | 66–276 | KPIs, quadro Kanban de cobrança, `moverCob`, `painelCob` (cartão com acordo, baixa, contatos, anuência) |
| Regras salvar / resumo cliente / saúde | 277–345 | `salvarRegras`, `resumoHTML`, `saude`, `write`, `remove`, `handleErr`, `strip` |
| Persistência / init | 326–375 | Escrita com fila por doc, snapshots Firestore-like (`db.collection/doc`), modo local, leitura |
| Definição das etapas de cobrança | 377–459 | `COB_PRIV`, `COB_PUB`, probabilidade de inadimplência, `prevStage`, `cobEtapaDe`, régua por dias |
| Farol / Motor de crédito (privado e público) | 460–575 | `FAROL`, `scoreFinal`, `limitePolitica`, `motorPub`, `motorCredito` |
| Modelos de e-mail | 576–606 | `modeloEmail` (assunto/corpo/WhatsApp), `waLink` |
| Filtros/segmentos/setSec | 607–680 | `naCobranca`, setor/BU/ramo/agente, meses |
| `render()` global | 698–807 | KPIs, carteira, tabelas |
| Cards Kanban | 809–862 | `slaValor`, `cardProp`, `cardPed`, `calibFoto` |
| Desempenho | 864–941 | `perfLinhas`, `renderDesempenho` |
| Drag-and-drop e `mover` | 943–979 | Validações de movimentação das propostas/pedidos |

Existem **dois Kanbans** de crédito (propostas = concessão+gestão; pedidos acima do limite) e **um Kanban de cobrança** (por setor privado/público). O setor "Estética" é um *segmento do privado* (BU = "Estética"), não um setor próprio.

---

## 1. Entidades e campos

### 1.1 Coleção `propostas` (= cliente/proposta de crédito; também é o "cliente" de cobrança)
Um único documento serve a concessão, gestão e cobrança. `id` é o id do doc (não gravado no corpo: `strip()` remove `id`). Datas ISO `YYYY-MM-DD` (strings) ou ISO timestamp UTC (`toISOString`).

**Identificação / classificação**

| Campo | Tipo | Significado |
|---|---|---|
| `cliente` | string | Razão social/nome (usado em busca, assunto de e-mail, dlTodos) |
| `documento` | string | CPF/CNPJ |
| `tipo` | "PF" \| "PJ" (inferido; default exibido "PF") | tipo de pessoa; `tipo!=="PF"` ⇒ checa idade do CNPJ |
| `setor` | "publico" \| (qualquer outro = privado) | `setorP(p)` |
| `bu` | string | Unidade de negócio. Lista base `BUS=["Nutrição","Enfermagem","Medicamento","Estética"]` + qualquer outra encontrada. "Estética" define o segmento Estética |
| `ramo` | string | Ramo de atividade. Lista `RAMOS` (ver §1.9); vazio ⇒ "Não informado" |
| `grupo` | string | Grupo econômico/rede (concentração de limite) |
| `rca` | string | Executivo comercial (RCA) — exibido no card |
| `analista` | string | Agente de crédito responsável pela proposta (chave do Desempenho). Vazio ⇒ "Sem agente" |
| `cobResp` | string | Agente de cobrança. `agenteDe` = `cobResp.trim()` ou "Sem agente" |
| `tipoCliente` | "novo" \| "recorrente" \| "inativo" | afeta score interno (+50/−50) e regras de fraude |
| `exemplo` | bool | marca registro de demonstração (`fState.semEx` oculta) |
| `criadoEm` | ISO timestamp | criação; base de filtro mensal/período e SLA por valor |
| `justificativa` | string | texto livre mostrado no card (exceto em etapas finais/gestão) |

**Fluxo de concessão**

| Campo | Tipo | Significado |
|---|---|---|
| `etapa` | id de etapa (ver §2.7) | etapa atual (`etapaOf(p)` normaliza) |
| `entrouEtapa` | ISO ts | quando entrou na etapa atual (ordenação do quadro; SLA) |
| `historico` | `[{etapa,em}]` (máx 40, `.slice(-40)`) | trilha de etapas (base do Desempenho) |
| `valor` | number | valor solicitado |
| `prazo` | string/number | prazo (meses) exibido `Nm` |
| `rating` | "AA".."H"/"A".."H" etc. | rating de risco (ver `PROB_RATING`); vazio ⇒ "s/ rating" |
| `score` | number | Score Serasa (0–1000) |
| `pontualidade` | number 0–100 (%) | pontualidade de pagamento |
| `limite` | number | limite de crédito concedido (em gestão); se ausente `limiteDe` usa `valor` |
| `utilizado` | number | limite utilizado |
| `revisao` | `YYYY-MM-DD` | validade do crédito (3 meses) |
| `inicioValidade` | `YYYY-MM-DD` | início da validade corrente |
| `comprasPeriodo` | number | nº de compras no período de validade (recorrente ≥ `COMPRAS_RECORRENTES`=2 [fora do trecho]) |
| `ultimaCompra` | `YYYY-MM-DD` | data da última compra |
| `encaminhamento` | string | destino textual (Reanálise/Obsoleto) |
| `garantia` | string | "Sem garantia" ou tipo de garantia |
| `comiteResp`,`comiteParecer`,`comiteCargo`,`comiteData`,`comitePlano`,`comiteForma` | string/date | decisão da alçada/comitê (usado também no Desempenho "Responsáveis") |
| `checklist` | `{etapaId:{idx:true}}` | checklist de concessão (progresso do card) |
| `prazoMedio` | number (dias) | prazo médio de compra (mín 30 no cálculo de limite) |
| `potencial` | number | potencial (sugestão comercial) |
| `fontePagadora` (público), `fpTipo`,`fpPrazo` (privado) | string/number | fonte pagadora principal e prazo |

**Dados cadastrais/risco (lidos em farol/motor)**: `telefoneStatus`("Confirmado"), `enderecoStatus`(começa com "Confirmado"), `finStatus`("Confirmado"), `finNome`, `finContato` (e-mail OU telefone/WhatsApp do financeiro), `cReceita` ("Irregular"), `cProtesto` ("Com protesto"), `cProcesso` ("Com processo relevante"), `cSocios` ("Com restrição"), `cData` (data das consultas), `dataAbertura`, `fatMensal`, `compraMedia`, `fPL` (patrimônio líquido), `fAC`/`fPC` (ativo/passivo circulante), `fDiv`, `fEbitda`, `flagNeg`, `flagDados`, `flagPedido` (flags manuais do farol), `capFin`, `perfilPag` ("Pontual"/"Atrasos eventuais"/"Atrasos frequentes"), `atrasoMedioOrgao`.

**Campos específicos setor público**: `esfera` (Federal/Estadual/Municipal), `pCapag` (A/B/C/D/"Não divulgada"/"Não se aplica (União)"), `pPessoal` (% RCL), `pCauc` ("Regular"/"Com pendência"), `pFonteTipo` ("Vinculada (SUS fundo a fundo)"/"Outra vinculada"/outros), `pEmpPrev` ("Sim"/"Não"), `pContrato` ("Sim"/"Não"), `pBase` ("Estimado do edital"/"Saldo de contrato ativo"), `pEstimado`, `pEdital`, `pSaldo`, `empenho`, `nfs` (array de NFs), `pubDocs`, `_nfEtapa` (derivado por `normPub`, **não persistir**).

**Cobrança (todos no mesmo doc `propostas/{id}`)**

| Campo | Tipo | Significado |
|---|---|---|
| `valorAtraso` | number R$ | saldo vencido. Em público com `nfs`, é calculado das NFs |
| `diasAtraso` | int | dias de atraso (maior atraso) |
| `saldoAVencer` | number | saldo a vencer |
| `proxVenc` | `YYYY-MM-DD` | próximo vencimento (gatilho das etapas preventivas) |
| `proxVencValor` | number\|"" | valor do próximo vencimento (fallback `saldoAVencer`) |
| `cobEtapa` | "" \| id | etapa MANUAL de cobrança. `""` = régua automática. Valores: negociacao, acordo, juridico, regularizado, baixado (e público: nfprot.. via `_nfEtapa`) |
| `cobEntrou` | ISO ts | quando entrou na etapa de cobrança manual |
| `cobHist` | `[{etapa,em}]` (máx 40) | movimentações de cobrança |
| `cobCheck` | `{etapaId:{idx:true}}` | checklist por etapa de cobrança (também registra "ação da régua feita") |
| `cobAcoes` | `[{etapa,acao,em,resp}]` (máx 60) | log de "Marcar ação como feita" |
| `cobContatos` | `[{data,canal,pessoa,retorno,previsao,valor,feedback,resp,em}]` (máx 100) | histórico de contatos (ver §1.3) |
| `cobProxAcao`, `cobProxData` | string, date | próxima ação e data |
| `cobAcordo` | string | condições/observação do acordo (público: "Previsão / programação de pagamento") |
| `cobParcelas` | `[{n,venc,valor,pago,pagoEm}]` | parcelas do acordo |
| `descontoAcordo` | number | desconto concedido no acordo |
| `cobObs` | string | observações gerais |
| `valorRecuperado` | number | acumulado recuperado |
| `cobRecLog` | `[{v,em}]` (máx 60) | lançamentos de recuperação (base de indicadores) |
| `valorBaixado` | number | acumulado baixado como perda |
| `cobBaixa` | objeto\|null | proposta de baixa pendente (ver §1.4) |
| `cobBaixasLog` | array (máx 20) | decisões de baixa |
| `protestado` | bool | marca persistente de protesto (também derivado, `foiProtestado`) |
| `anuenciaEm`, `anuenciaResp` | date, string | carta de anuência enviada |
| `cobMail` | `{chave:{etapa,assunto,para,modo,aprovado,aprovPor,enviado,por,canal}}` | registro de e-mail da régua (ver §3.5) |
| `pubDocs` | `{ne,nf,liq,op,opData,fila}` | documentos do órgão (nota de empenho, NF, liquidação, ordem de pagamento, data OP, posição na fila cronológica) — salvos só quando `#pdNE` existe |

### 1.2 Coleção `pedidos` (pedido acima do limite)
`id`, `numero`, `cliente`, `clienteId` (vínculo com propostas; fallback por nome), `vendedor`, `analista` (agente de cobrança do pedido), `valor`, `etapa` (bloqueado/analise/alcada/liberado/recusado), `entrouEtapa`, `historico`, `criadoEm`, `decisao` (texto; `split(" (")[0]` exibido), `libPlano`, `libForma`, `libResp`, `libParecer`, `libCargo`, `libData`, `atrasoDias`, `justificativa`, `bu`, `tipoCliente`, `exemplo`. Excesso: `excesso(p)` → `{val,exc,pct}`; alçada `alcadaExc(p)`; `critico(p)` [fora do trecho].

### 1.3 Contato de cobrança (item de `cobContatos`)
| Campo | Tipo | Regra |
|---|---|---|
| `data` | date | default hoje |
| `canal` | enum `CANAIS`: Telefone, WhatsApp, E-mail, Visita, Ofício, Portal do órgão | |
| `pessoa` | string | "Falou com" (datalist da ficha de contatos) |
| `retorno` | enum `RETORNOS`: Promessa de pagamento, Pagou, Pediu negociação / parcelamento, Contestou o débito, Sem retorno / não atendeu, Recusou pagar, Aguardando liquidação (órgão) | cores: PromPag/Pediu/Aguardando = r-mid; Pagou = r-ok; Contestou/Recusou = r-bad; Sem retorno = r-none |
| `previsao` | date | previsão de pagamento |
| `valor` | number\|"" | valor prometido |
| `feedback` | string | **obrigatório** |
| `resp` | string | agente (campo cobResp da tela ou `p.cobResp`) |
| `em` | ISO ts | |

`promessaStatus(c,p)` ⇒ "vencida" (chip) [implementação fora do trecho].

### 1.4 `cobBaixa` (write-off)
Pendente: `{status:"pendente", valor, motivo, prop, docs:{0..3:true}, em}`. Ao decidir vira em `cobBaixasLog`: `{...b, status:"aprovada"|"recusada", aprov, cargo, parecer, decEm}` e `cobBaixa=null`.
Motivos fixos: "Esgotadas as vias de cobrança", "Falência ou recuperação judicial", "Dívida prescrita", "Valor menor que o custo da cobrança judicial", "Desconto concedido em acordo".
Documentos (checklist da proposta, `docsBx`): 0 "Régua de cobrança cumprida até o jurídico"; 1 "Parecer do jurídico sobre a chance de recuperação"; 2 "Título protestado ou negativado"; 3 "Tentativa de acordo registrada" (não bloqueiam; só são exibidos ✓/✗).

### 1.5 Parcela de acordo (`cobParcelas[]`)
`{n (1..N), venc (date, ajustada por proxUtil), valor (R$ 2 casas), pago (bool), pagoEm (date)}`.

### 1.6 Registro de fila de e-mail → ver §3.

### 1.7 Coleções/docs do banco → ver §5.

### 1.8 Documento `config/regras` (REGRAS) — chaves usadas neste trecho (defaults de `REGRAS_PADRAO`, [fora do trecho])
| Chave | Default | Uso |
|---|---|---|
| `regLig` | 4 | D+4: cobrança ativa; bloqueio de novos pedidos (`bloqueado`) |
| `regNotif` | 7 | D+7: notificação formal |
| `regNeg` | 10 | D+10: protesto/negativação; "protestado" implícito; bloqueio total |
| `regProp` | 20 | D+20: negociação pós-protesto |
| `regExtra` | 30 | D+30: cobrança extrajudicial |
| `regJur` | 45 | D+45: Jurídico (início) |
| `regJurMax` | 60 | D+60: prazo máximo da régua / ação judicial |
| `quebraDias` | 5 | tolerância de parcela vencida (acordo quebrado se > 5 dias) |
| `alcBaixa1` | 10000 | alçada de baixa: ≤ → Gerente financeiro |
| `alcBaixa2` | 100000 | ≤ → Diretor financeiro; acima → Diretoria / Comitê |
| `pdd0..pdd5` | 0.5, 3, 10, 30, 50, 100 (%) | PDD por faixa (`pddDe`) |
| `multaPriv`/`jurosPriv` | 2 (%) / 1 (% a.m.) | encargos privado |
| `multaPub`/`jurosPub` | 0 / 0.5 | encargos público |
| `correcao` | 0.4 (% a.m.) | correção monetária composta |
| `polFolga` | 1.2 | folga do limite por compra média |
| `polNovoPct` | 10 (%) | % do faturamento mensal p/ cliente sem histórico |
| `polTetoPct` | 30 (%) | teto do limite como % do faturamento (sem farol) |
| `polPLPct` | 10 (%) | teto do limite como % do PL |
| `pesoSerasa` | 60 (%) | peso do Serasa no score final |
| `concMax` | 10 (%) | teto de concentração por cliente/grupo na carteira de limites |
| `docF1`/`docF2` | 100000 / 500000 | faixas de valor: docs extras e SLA por valor |
| `consValid` | 30 (dias) | validade das consultas |
| `fraudeMeses`/`fraudePct` | 12 / 50 | alertas: CNPJ novo; pedido inicial alto |
| `diasSemCompra` | 90 | sem compras ⇒ Obsoleto |
| `metaSla` etc. | 85… | metas (outras telas) |

### 1.9 Constantes de listas
`CANAIS`, `RETORNOS` (§1.3), `BUS` (§1.1), `RAMOS=["Hospital","Clínica e consultório","Farmácia e drogaria","Laboratório","Casa de repouso e home care","Distribuidor e atacado","Varejo alimentar","Secretaria e fundo de saúde","Prefeitura e administração pública","Pessoa física","Outros"]` (comentário no código: "substituir pela lista oficial da Benenutri" ⇒ **protótipo**), `SEM_RAMO="Não informado"`, `COB_CONTATO={tel:"(61) 3033-3116", email:"cobranca@benenutri.com", assin:"Equipe de Crédito e Cobrança – Grupo Benenutri"}`.

### 1.10 `config/equipe`, etc. → §5.

---

## 2. Definições de etapas (copiadas fielmente)

Convenção dos campos: `id`; `nome`; `sla` (dias; `null` = sem SLA); flags `prev` (etapa preventiva, automática pelo próximo vencimento), `regua` (etapa automática da régua pelos dias de atraso), `manual` (etapa manual escolhida pelo agente), `final` ("ok"/"bad"); `acao` (ação da régua); `acaoIdx` (índices do `check[]` que, todos marcados, tornam a ação "feita"; default `[0]`); `saida` (critério de saída); `check` (checklist). Nomes marcados `get nome()` são **dinâmicos** (dependem de `REGRAS`).

### 2.1 Cobrança PRIVADA (`COB_PRIV`) — ordem de colunas do Kanban

#### `prev5` — "D-5 · Pré-vencimento"
- flags: `prev:true`, `sla:null`
- acao: "Enviar lembrete de vencimento (e-mail e WhatsApp)" (acaoIdx default [0])
- saida: "Cliente lembrado do vencimento com boleto ou PIX e lançamento da nota confirmado."
- check: [0] "Lembrete de vencimento enviado (e-mail e WhatsApp)"; [1] "Lançamento da nota fiscal no financeiro do cliente confirmado"

#### `prev1` — "D-1 · Pré-vencimento"
- `prev:true`, `sla:null`
- acao: "Confirmar a programação do pagamento"
- saida: "Programação do pagamento confirmada na véspera."
- check: [0] "Contato de confirmação do pagamento"; [1] "Boleto ou PIX reenviado, se necessário"

#### `venc0` — "D+0 · Vencimento"
- `prev:true`, `sla:null`
- acao: "Enviar aviso de vencimento do dia"
- saida: "Cliente avisado do vencimento do dia e dos encargos em caso de atraso."
- check: [0] "E-mail de vencimento do dia enviado"

#### `r1` — nome dinâmico: se `faixa.r1[1] > 1` → `D+1 a D+{regLig-1} · Pagamento não identificado`, senão `D+1 · Pagamento não identificado` (com defaults: "D+1 a D+3 · Pagamento não identificado")
- `regua:true`; `acaoIdx:[0,1]`
- acao: "Enviar e-mail e ligar: pagamento não identificado"
- saida: "Cliente avisado por e-mail e por telefone de que o pagamento não foi identificado, com 2ª via enviada e comprovante ou previsão de pagamento pedidos."
- check: [0] "E-mail enviado informando que o pagamento não foi identificado, com a 2ª via"; [1] "Ligação para o financeiro do cliente sobre o pagamento não identificado"; [2] "Comprovante solicitado ou previsão de pagamento registrada"

#### `r5` — nome dinâmico `D+{regLig||4} · Cobrança ativa` (default "D+4 · Cobrança ativa")
- `regua:true`; `acaoIdx:[0,1]`
- acao: "Ligar para o financeiro, avisar o vendedor e bloquear novos pedidos"
- saida: "Compromisso de pagamento obtido, vendedor acionado e novos pedidos bloqueados."
- check: [0] "Ligação com o responsável financeiro do cliente"; [1] "Vendedor avisado e novos pedidos bloqueados no ERP"; [2] "Data e valor de pagamento registrados"

#### `r15` — nome dinâmico `D+{regNotif||7} · Notificação formal` (default "D+7 · Notificação formal")
- `regua:true`; acaoIdx default [0]
- acao: "Enviar notificação formal com aviso de protesto"
- saida: "Notificação formal enviada avisando que, sem pagamento, o título vai a protesto em cartório."
- check: [0] "Notificação formal enviada (e-mail com confirmação ou carta com AR)"; [1] "Data de envio ao cartório informada ao cliente"

#### `r30` — nome dinâmico `D+{regNeg||10} · Protesto em cartório` (default "D+10 · Protesto em cartório")
- `regua:true`; `acaoIdx:[0,2]`
- acao: "Enviar ao cartório, negativar e bloquear todo o crédito"
- saida: "Título enviado a protesto em cartório, negativado e crédito totalmente bloqueado."
- check: [0] "Título enviado a protesto em cartório"; [1] "Título negativado (Serasa / Boa Vista)"; [2] "Bloqueio total do crédito confirmado no ERP"

#### `rneg` — nome dinâmico `D+{regProp||20} · Negociação pós-protesto` (default "D+20 · Negociação pós-protesto")
- `regua:true`; acaoIdx default [0]
- acao: "Apresentar proposta de acordo (carta de anuência após o pagamento)"
- saida: "Proposta de acordo apresentada. O protesto permanece até a quitação do acordo, quando é emitida a carta de anuência."
- check: [0] "Proposta de acordo apresentada ao cliente"; [1] "Retorno do cliente registrado"

#### `rext` — nome dinâmico `D+{regExtra||30} · Cobrança extrajudicial` (default "D+30 · Cobrança extrajudicial")
- `regua:true`; acaoIdx default [0]
- acao: "Financeiro envia a notificação extrajudicial e aciona a assessoria"
- saida: "Caso com a assessoria de cobrança e notificação extrajudicial enviada com prazo final antes da ação judicial."
- check: [0] "Notificação extrajudicial enviada pelo Financeiro (modelo padrão, prazo de 15 dias)"; [1] "Caso encaminhado à assessoria de cobrança"; [2] "Última proposta de acordo apresentada"

#### `negociacao` — "Em negociação"
- `sla:10`, `manual:true` (sem `acao`)
- saida: "Proposta de acordo aprovada. Enquanto negocia, o cliente sai da régua automática."
- check: [0] "Proposta de acordo apresentada"; [1] "Acordo aprovado na alçada"

#### `acordo` — "Acordo em andamento"
- `sla:null`, `manual:true`
- saida: "Parcelas pagas até a quitação. Parcela vencida além do prazo de tolerância quebra o acordo e o cliente volta para a régua."
- check: [0] "Termo de acordo assinado"; [1] "Parcelas geradas no cartão"

#### `juridico` — nome dinâmico `D+{regJur||45} a D+{regJurMax||60} · Cobrança judicial` (default "D+45 a D+60 · Cobrança judicial")
- `regua:true`; acaoIdx default [0]
- acao: "Enviar o dossiê ao Jurídico: contato amigável e ação judicial"
- saida: "Jurídico faz o contato amigável com o cliente e, sem acordo, ajuíza a ação de execução ou monitória até o prazo máximo da régua."
- check: [0] "Dossiê completo enviado ao Jurídico (checklist do painel)"; [1] "Contato amigável do Jurídico com o cliente"; [2] "Ação de execução ou monitória ajuizada"

#### `regularizado` — "Regularizados"
- `sla:null`, `final:"ok"`
- saida: "Saldo vencido quitado. Quando houve protesto, carta de anuência enviada e negativação excluída em até 5 dias úteis."
- check: [0] "Pagamento conferido"; [1] "Bloqueio de pedidos retirado"; [2] "Carta de anuência enviada e negativação excluída (quando houve protesto)"

#### `baixado` — "Baixados como perda"
- `sla:null`, `final:"bad"`
- saida: "Saldo lançado como perda após aprovação na alçada."
- check: [0] "Lançamento contábil da perda"; [1] "Cliente mantido bloqueado"

### 2.2 Cobrança PÚBLICA (`COB_PUB`) — sem `acao`/`acaoIdx`/`regua`/`prev`

| id | nome | sla (d) | saida | check |
|---|---|---|---|---|
| `nfprot` | NF a protocolar | 2 | "NF protocolada no órgão com comprovante de entrega e certidões." | [0] "NF e empenho conferidos"; [1] "NF protocolada com comprovante e certidões"; [2] "Agente de cobrança definido" |
| `nfliq` | Liquidação vencida · cobrar atesto | 5 | "NF atestada e liquidada." | [0] "Fiscal do contrato contatado"; [1] "Pendências documentais verificadas"; [2] "Previsão de atesto e liquidação registrada" |
| `nfpag` | Pagamento vencido · ordem cronológica | 10 | "Pagamento programado ou recebido." | [0] "Posição na ordem cronológica pedida (LAI)"; [1] "Setor financeiro contatado"; [2] "Previsão de pagamento registrada" |
| `negociacao` | Ofício / notificação formal | 10 | "Ofício protocolado com prazo de resposta." | [0] "Ofício enviado ao ordenador de despesa"; [1] "Protocolo registrado" |
| `acordo` | Requerimento administrativo | null | "Pagamento programado ou reconhecimento de dívida." | [0] "Requerimento protocolado"; [1] "Reconhecimento de dívida / programação de pagamento" |
| `juridico` | Cobrança judicial | null | "Ação de cobrança ajuizada." | [0] "Encaminhado ao jurídico"; [1] "Ação ajuizada" |
| `regularizado` | Pagos (`final:"ok"`) | null | "Pagamento recebido." | [0] "Pagamento conferido" |
| `baixado` | Baixados como perda (`final:"bad"`) | null | "Saldo lançado como perda após aprovação na alçada." | [0] "Lançamento contábil da perda" |

(O público reutiliza ids `negociacao`/`acordo`/`juridico` com nomes diferentes.) Nota: `RK={nfprot:1,nfliq:2,nfpag:3,negociacao:4,acordo:5,juridico:6}` ordena as etapas públicas.

### 2.3 Estados/contadores da régua (privado)
- `REGUA_IDS=["r1","r5","r15","rneg","r30","rext"]` (NÃO inclui `juridico`, mas `juridico` também tem `regua:true`).
- `REGUA_LIM=[["r5","regLig",4],["r15","regNotif",7],["r30","regNeg",10],["rneg","regProp",20],["rext","regExtra",30],["juridico","regJur",45]]` — **ordenadas por dias** em `reguaOrdem()` (ordena pelos valores configurados, então se o gestor trocar regNeg e regProp as colunas são reordenadas dinamicamente).
- Faixas: `F.r1=[1, primeiro.d−1]`; cada etapa `[d, próximo.d−1]`; a última (juridico) `[d, null]`. Defaults: r1 1–3, r5 4–6, r15 7–9, r30 10–19, rneg 20–29, rext 30–44, juridico ≥45.
- `reguaEtapa(p)`: `d=+diasAtraso`; percorre ordem desc; retorna o primeiro `id` com `d>=limite`; senão `r1`. (Pode retornar `juridico` com d ≥ regJur.)
- Jurídico: `regJurMax`(60) só aparece no nome e na mensagem.

### 2.4 Etapas preventivas (`prevStage`)
```
prevStage(p): se setor != privado OU valorAtraso>0 → null
  d = diasAteVenc(p)  (proxVenc - hoje, em dias; null se sem proxVenc)
  se d==null OU d<0 OU d>5 → null
  d==0 → "venc0"; d<=1 → "prev1"; senão → "prev5"   (d=2..5 → prev5)
```
Observação: "D-5" cobre 2 a 5 dias; "D-1" = 1 dia; "D+0" = hoje.

### 2.5 `cobEtapaDe(p)` (etapa efetiva de cobrança)
```
pv = prevStage(p); se pv → pv
v = valorAtraso
SE setor != privado (público):
   se cobEtapa=="baixado" → "baixado"
   nfE = p._nfEtapa (derivada das NFs, por normPub)
   RK = {nfprot:1,nfliq:2,nfpag:3,negociacao:4,acordo:5,juridico:6}
   se cobEtapa ∈ {negociacao,acordo,juridico} E (v>0 OU nfE OU existe parcela não paga):
        retorna (RK[nfE]||0) > RK[cobEtapa] ? nfE : cobEtapa     // etapa mais avançada vence
   se nfE → nfE
   se v>0 → "nfpag"
   senão "regularizado"
SENÃO (privado):
   se v==0 → (cobEtapa=="baixado" ? "baixado" : "regularizado")
   se cobEtapa=="acordo" E !acordoQuebrado(p) → "acordo"
   se cobEtapa=="negociacao" → "negociacao"
   se cobEtapa=="juridico" → "juridico"
   senão reguaEtapa(p)
```
Efeitos: acordo quebrado devolve o cliente para a régua (sem alterar `cobEtapa` salvo). Estado "regularizado" é derivado de `valorAtraso==0`.

### 2.6 `naCobranca(p)` (quem aparece em cobrança)
`etapaOf(p)!=="recusada" && ( !!_nfEtapa || !!prevStage(p) || valorAtraso>0 || !!cobEtapa || cobParcelas.length>0 )`.
`FINAIS_COB=["regularizado","baixado"]`; "ativos" no painel = não final E não preventivo.

### 2.7 Etapas de CONCESSÃO/GESTÃO e PEDIDOS (definidas em `js-A.js`; copiadas aqui só para referência, com os mesmos campos) [fora do trecho]
Propostas (`ETAPAS_PROP`): ids `entrada`(SLA 1d), `cadastral`(3), `credito`(3), `comite`(2), `formalizacao`(2), `liberacao`(1), `gestao`(sem SLA, `final:"gestao"`, validade 3 meses), `reanalise`(5), `obsoleto`(`final:"obs"`), `pentrada`(1,público), `panalise`(8,público), `paprov`(2,público), `recusada`(`final:"bad"`).
Fluxos: `FLUXO_IDS.privado=[entrada,cadastral,credito,comite,formalizacao,liberacao,gestao,reanalise,obsoleto,recusada]`; `publico=[pentrada,panalise,paprov,gestao,reanalise,obsoleto,recusada]`; `NOME_PUB={gestao:"Monitoramento",reanalise:"Reavaliação de risco"}`.
Pedidos (`ETAPAS_PED`, unidade **horas**): `bloqueado` "Retido por limite" SLA 2h; `analise` "Análise do excesso" 4h; `alcada` "Aprovação da alçada" 8h; `liberado` "Pedidos liberados" (final ok); `recusado` "Pedidos recusados" (final bad). Checklists completos estão em `js-A.js` (outro relatório).
No Kanban de propostas: `fase = "g"` (Gestão de crédito) para `gestao/reanalise/obsoleto`, senão `"c"` (Concessão); pedidos `fase="p"`. `FASE={c:"Concessão",g:"Gestão de crédito",p:"Pedido acima do limite"}`. Rótulo "step": final ⇒ (`final==="gestao"` ? "validade 3 meses" : "fim"), senão nº da coluna (2 dígitos) + ` · SLA {sla}{unidade||"d"}`.

---

## 3. E-mails / mensagens da régua

### 3.1 Etapas com e-mail e modo padrão (`MAIL_ETAPAS`)
| id | Nome | Modo padrão |
|---|---|---|
| prev5 | D-5 · Lembrete de vencimento | auto |
| prev1 | D-1 · Confirmação do pagamento | auto |
| venc0 | D+0 · Vence hoje | auto |
| r1 | Pagamento não identificado | auto |
| r5 | Cobrança ativa · pedidos suspensos | auto |
| r15 | Notificação formal · aviso de protesto | aprovar |
| r30 | Título enviado a protesto | aprovar |
| rneg | Negociação pós-protesto | aprovar |
| rext | Notificação extrajudicial | aprovar |
| juridico | Encaminhamento ao Jurídico | manual |
| pub | Órgão público · e-mails da régua por NF | aprovar |

Modos (`MAIL_MODOS`): `auto`="Automático" (chip r-ok), `aprovar`="Com aprovação" (r-mid), `manual`="Manual" (r-none).
Modo efetivo `mailModo(e)` = `config/emails.modos[e]` (se válido) senão default acima senão "manual".
Texto na UI por modo: auto = "Enviado sozinho e registrado no histórico"; aprovar = "Vira rascunho; sai depois de aprovado no painel"; manual = "Só pelo botão Abrir no e-mail". Dica fixa: "Recomendado: notificação formal, protesto, extrajudicial e órgãos públicos com aprovação; Jurídico manual."

### 3.2 Quem recebe (`mailDest(p)`)
1. `fichaCtc(p)` (ficha de contatos, [fora do trecho]) → primeiro contato com `pref` (preferencial) e e-mail contendo "@";
2. senão primeiro contato com e-mail contendo "@";
3. senão `p.finContato` se contiver "@";
4. senão `""` ⇒ situação "Sem e-mail cadastrado".
O e-mail é `String(email).trim()`. **Nome no corpo** (`cli`) = `p.finNome || p.cliente` sem ponto final (`.replace(/\.\s*$/,"")`).
Nota: o painel do cartão (`painelCob`) usa só `finContato` (com "@") — não a ficha de contatos (**inconsistência** com `mailDest`).
WhatsApp: `waLink(p,txt)`: `finContato` só dígitos; válido se 10–13 dígitos; se ≤11 dígitos prefixa "55"; URL `https://wa.me/{n}?text={urlencoded}`.

### 3.3 Fila do dia (`mailFila`)
Para cada cliente da carteira (filtrada por setor/BU/`naCobranca`):

**Privado**
```
ac = acaoRegua(p)  // etapa efetiva + ação; null se etapa sem 'acao' (negociacao, acordo, regularizado, baixado)
se !ac OU ac.e ∉ MAIL_ETAPAS ids → ignora
mod = modeloEmail(p, ac.e); se !mod → ignora
ref = prevStage(p) ? p.proxVenc : addDias(hoje, -diasAtraso)   // data do vencimento que originou a cobrança
key = (ac.e + "_" + ref) sanitizada por /[^A-Za-z0-9_-]/g → ""   // ex.: r5_2026-11-03
reg = p.cobMail[key] || null
se ac.feito E NÃO(reg && reg.enviado) → ignora      // ação já cumprida por outro meio: sai da fila
item = {p, e:ac.e, nome:ac.nome, key, assunto, corpo, para:mailDest(p), modo:mailModo(ac.e), reg,
        v: +valorAtraso || +proxVencValor || +saldoAVencer || 0}
```
**Público** (`pub`): para cada item de `reguaPubCliente(p,true)` com `msg ∈ {"liq","pag","fila"}`, `!feito` e `due<=hoje`, e `msgNF(p,n,msg)` existente: `key = "pub_"+nf.nf+"_"+id`, `nome = "NF {nf} · {t}"`, `assunto=mm.a`, `corpo=mm.b`, `modo=mailModo("pub")`, `v=+nf.valor`, `nf`, `st=id`. (Textos de `msgNF` ficam fora do trecho.)

**Situação (`sit`)**
```
sit = reg.enviado ? "enviado"
    : !para        ? "semmail"
    : modo=="manual" ? "manual"
    : (modo=="aprovar" && !reg.aprovado) ? "aprovar"
    : "fila"
```
`MAIL_SIT`: enviado "Enviado" (r-ok); semmail "Sem e-mail cadastrado" (r-bad); manual "Enviar manualmente" (r-none); aprovar "Aguardando aprovação" (r-mid); fila "Pronto para envio" (r-ok).
Ordenação: pendentes primeiro, depois por `v` decrescente.

### 3.4 Tela "E-mails" (KPIs e passos)
- KPIs: "E-mails na fila hoje" (= pendentes, não enviados; sub: nº de clientes); "Prontos para envio" (sit=fila; sub: "saem na próxima rodada" se integração ativa, senão "automáticos após a integração"); "Aguardando aprovação" (sub "notificações e protesto"); "Sem e-mail cadastrado" (sub "enviados no mês: N" = soma de `cobMail[*].enviado` no mês corrente).
- Badge na aba = nº de pendentes.
- `mailIntegrada()` = `config/emails.integracao.status==="ativa"`. Se ativa: aviso "Envio pela conta {integracao.conta||COB_CONTATO.email}. Todo dia útil de manhã a tarefa envia os e-mails prontos, cria rascunho dos que pedem aprovação e registra cada envio no histórico do cliente." Se pendente: lista de 4 passos (conectar conta Gmail/Outlook; e-mail do financeiro no cadastro; modelos e modo por etapa; "Ativar a tarefa diária de envio — dias úteis, 8h, com registro no histórico do cliente"). **O envio automático real NÃO existe no código** (é "pendente"; depende de integração externa).
- Botões por linha: Ver/Fechar (expande assunto+mensagem read-only); "Abrir no e-mail" (`mailto:` com subject/body — sem anexos); "Aprovar" (só se sit=aprovar e não readOnly); "Marcar enviado" (se não readOnly).
- Painel de modos: tabela por etapa com `<select>` auto/aprovar/manual; botão "Salvar modos" grava `config/emails` = `{...MAILCFG, modos:{id:modo}, integracao: MAILCFG.integracao || {status:"pendente", conta:COB_CONTATO.email}}` com auditoria ("E-mails da régua", "modos de envio").

### 3.5 Registro `cobMail[key]`
`{etapa, assunto, para, modo, aprovado (ISO), aprovPor, enviado (ISO), por, canal}`; `canal = mailIntegrada()?"integracao":"manual"`.

`mailGravar(x,acao)`:
- `quem = meuMembro().nome || p.cobResp || ""`.
- **aprovar**: `r.aprovado=agora; r.aprovPor=quem`.
- **enviar**: `r.enviado=agora; r.por=quem; r.canal=…`; adiciona em `cobContatos` `{data:hoje, canal:"E-mail", pessoa: finNome||para, retorno:"", previsao:"", valor:"", feedback:"E-mail da régua enviado ({nome}): {assunto}", resp:quem, em:agora}` (máx 100); se etapa privada e `MAIL_CHECK[e]!=null` marca `cobCheck[e][idx]=true` com `MAIL_CHECK={prev5:0,prev1:0,venc0:0,r1:0,r15:0,rneg:0,rext:0}` (r5, r30, juridico não têm marcação automática); se `pub`: localiza a NF (por `nf`+`emissao`), seta `nfs[i].regua[st]=hoje`, `logAgenda(...)` com item `{k:"regua", t:"NF {nf}: e-mail da régua", prazo:hoje}` e chama `normPub`.
- grava `propostas/{id}` com `cobMail` atualizado. Toast "E-mail aprovado" / "Envio registrado no histórico do cliente".
**Aprovação não exige perfil** (qualquer usuário com escrita pode aprovar) e **não há segregação** (quem aprova pode enviar).

### 3.6 Modelos de e-mail (`modeloEmail(p,e)`) — texto integral
**Variáveis** (com `p` real; se `p` ausente = placeholder `ph`):

| Var | Valor | Placeholder |
|---|---|---|
| `cli` | `finNome||cliente` sem ponto final | `[Nome do Cliente]` |
| `v` | `brl(valorAtraso)` | `R$ [valor]` |
| `d` | `diasAtraso` | — |
| `vencAt` | `proxVenc` formatado (`fmtDia`) ou "[data de vencimento]" | `[data de vencimento]` |
| `av` | `brl(proxVencValor || saldoAVencer)` | `R$ [valor]` |
| `vencOrig` | `hoje − d dias` formatado (se d=0 → "[data de vencimento]") | idem |
| `hoje` | data atual | `[data]` |
| `limV(k)` | `hoje + n dias` onde `n = REGRAS[k] − d`; se `n<=0` usa **+3 dias** | `[data limite]` |
| `fale` | `\n\nFale conosco:\nTelefone: (61) 3033-3116\nE-mail: cobranca@benenutri.com` | |
| `ass` | `\n\nAtenciosamente,\nEquipe de Crédito e Cobrança – Grupo Benenutri` | |
| `oi` | `Prezado(a) {cli},\n\n` | |

**Assunto final**: `"{assunto-base} · {p.cliente}"` (com `p`); sem `p` só o assunto-base. WhatsApp (`whats`) só onde indicado.

| Etapa | Assunto-base | Corpo (e-mail) | WhatsApp |
|---|---|---|---|
| **prev5** | Lembrete: seu pagamento vence em breve! | `{oi}Gostaríamos de lembrá-lo que sua fatura no valor de {av} vence em {vencAt}. Segue o boleto/chave PIX para pagamento.\n\nCaso já tenha realizado o pagamento, por favor, desconsidere este aviso.{ass}` | `Olá, {cli}! Lembrete do Grupo Benenutri: sua fatura de {av} vence em {vencAt}. Se precisar do boleto ou da chave PIX, é só responder esta mensagem.` |
| **prev1** | Seu pagamento vence amanhã | `{oi}Sua fatura no valor de {av} vence amanhã, {vencAt}. Pedimos a gentileza de confirmar a programação do pagamento.\n\nCaso já tenha realizado o pagamento, por favor, desconsidere este aviso.{ass}` | `Olá, {cli}! Sua fatura de {av} vence amanhã ({vencAt}). Pode nos confirmar a programação do pagamento? Obrigado!` |
| **venc0** | Atenção: seu pagamento vence hoje! | `{oi}Informamos que sua fatura no valor de {av} vence hoje, {hoje}. Para evitar a incidência de juros e multa, recomendamos que realize o pagamento ainda hoje.\n\nCaso já tenha efetuado o pagamento, por favor, ignore esta mensagem.{ass}` | `Olá, {cli}! Sua fatura de {av} vence hoje. Para evitar juros e multa, o pagamento deve ser feito ainda hoje. Se já pagou, desconsidere.` |
| **r1** | Pagamento não identificado | `{oi}Não identificamos em nosso sistema o pagamento da fatura no valor de {v}, vencida em {vencOrig}. Segue a 2ª via para pagamento.\n\nSe o pagamento já foi realizado, pedimos a gentileza de nos enviar o comprovante para a baixa. Caso contrário, por favor, informe a previsão de pagamento.{fale}{ass}` | `Olá, {cli}! Não identificamos o pagamento da fatura de {v}, vencida em {vencOrig}. Se já pagou, pode nos enviar o comprovante? Se não, qual a previsão de pagamento?` |
| **r5** | Aviso: fatura vencida – regularize seu pagamento | `{oi}Identificamos que sua fatura no valor de {v} venceu em {vencOrig} e ainda não consta o pagamento em nosso sistema.\n\nInformamos que novos pedidos ficam suspensos até a regularização. Para evitar a aplicação de encargos adicionais e outras restrições, solicitamos o pagamento o quanto antes.\n\nSe já realizou o pagamento, por favor, envie-nos o comprovante.{fale}{ass}` | `Olá, {cli}. A fatura de {v}, vencida em {vencOrig}, segue em aberto e novos pedidos estão suspensos até a regularização. Podemos combinar a data de pagamento?` |
| **r15** | Notificação de débito em aberto – aviso de protesto | `{oi}Notificamos que permanece em aberto a fatura no valor de {v}, vencida em {vencOrig}, acrescida dos encargos previstos em contrato.\n\nSolicitamos a regularização até {limV("regNeg")}. Não havendo pagamento, o título será encaminhado para protesto em cartório e negativação nos órgãos de proteção ao crédito, e o crédito ficará totalmente bloqueado.{fale}{ass}` | `{cli}, enviamos por e-mail a notificação formal da fatura de {v} em aberto. Sem pagamento até {limV("regNeg")}, o título será enviado para protesto em cartório.` |
| **r30** | Aviso: título encaminhado para protesto em cartório | `{oi}Apesar de nossos contatos anteriores, sua fatura no valor de {v} permanece em aberto desde {vencOrig}.\n\nInformamos que o título foi encaminhado para protesto em cartório e para negativação nos órgãos de proteção ao crédito, o que poderá resultar em restrições ao seu CPF/CNPJ. O cartório enviará a intimação para pagamento. O crédito para novas compras está totalmente bloqueado até a quitação.\n\nSe já realizou o pagamento, pedimos que nos envie o comprovante.{fale}{ass}` | `{cli}, a fatura de {v} em aberto desde {vencOrig} foi enviada para protesto em cartório e negativação, e o crédito está bloqueado. Para regularizar ou negociar, fale com a gente.` |
| **rneg** | Negociação do débito protestado | `{oi}Sua fatura no valor de {v}, vencida em {vencOrig}, foi protestada e continua em aberto.\n\nAinda é possível negociar. Podemos oferecer opções de parcelamento e, com o acordo quitado, emitimos a carta de anuência para o cancelamento do protesto. Entre em contato até {limV("regExtra")}, antes do encaminhamento para cobrança extrajudicial.{fale}{ass}` | `{cli}, ainda dá para negociar a fatura de {v} protestada, inclusive com parcelamento. Quitado o acordo, emitimos a carta de anuência do protesto. Fale com a gente até {limV("regExtra")}.` |
| **rext** | Notificação extrajudicial – débito em aberto | `{oi}Após múltiplas tentativas de contato, a fatura no valor de {v}, vencida em {vencOrig}, continua em aberto, já protestada e negativada.\n\nConcedemos o prazo final até {limV("regJur")} para pagamento ou formalização de acordo. Sem retorno, o débito será encaminhado para cobrança judicial, com acréscimo de custas e honorários.{fale}{ass}` | `{cli}, enviamos a notificação extrajudicial da fatura de {v}. O prazo final para pagamento ou acordo é {limV("regJur")}; depois disso o caso segue para cobrança judicial.` |
| **anuencia** (fora da fila; usado no painel, etapa Regularizados com protesto) | Quitação confirmada – carta de anuência | `{oi}Confirmamos a quitação do débito que estava em aberto conosco. Obrigado pela regularização.\n\nSegue anexa a carta de anuência para o cancelamento do protesto. Basta apresentá-la ao cartório de protesto, conforme as regras e custas do próprio cartório. A negativação nos órgãos de proteção ao crédito também foi excluída, e seu cadastro está liberado para novos pedidos.{fale}{ass}` | `Olá, {cli}! Confirmamos o pagamento, obrigado! Enviamos por e-mail a carta de anuência para cancelar o protesto no cartório. A negativação foi excluída e o cadastro está liberado.` |
| **juridico** | Notificação de encaminhamento para cobrança judicial | `{oi}Após múltiplas tentativas de contato, identificamos que sua fatura no valor de {v}, vencida em {vencOrig}, continua em aberto.\n\nInformamos que o débito foi encaminhado ao nosso setor jurídico, que fará um último contato para uma solução amigável. Sem acordo, a ação de cobrança será ajuizada até {limV("regJurMax")}. Ainda é possível evitar a ação com o pagamento integral ou a formalização de acordo até essa data.\n\nPara evitar custos adicionais, juros e medidas legais, regularize sua situação imediatamente.{fale}{ass}` | `null` (sem WhatsApp) |

Observações: `{vencAt}` é a data do próximo vencimento (etapas preventivas) e `{vencOrig}` é *calculada* como hoje−diasAtraso (**aproximação**; não é a data real do título). Para prazos: r15 usa `regNeg`; rneg usa `regExtra`; rext usa `regJur`; juridico usa `regJurMax`. O texto da r15 diz "até {regNeg}" mas o rótulo da etapa é D+7; r30 diz "foi encaminhado" mas o checklist só é feito depois ⇒ possível desalinhamento (**ambiguidade**).
Aviso: o e-mail "anuência" diz "Segue anexa" mas o sistema **não anexa nada** (`mailto:`).

---

## 4. Regras e cálculos

### 4.1 Encargos (`encargos(p)`)
```
v=valorAtraso; d=diasAtraso; se !v ou !d → {multa:0,juros:0,corr:0,tot:v}
pub = setor=="publico"
multa = v * (pub ? multaPub : multaPriv)/100                      // fixa, 1x  (priv 2%, pub 0%)
juros = v * (pub ? jurosPub : jurosPriv)/100 * d/30              // simples pro-rata (priv 1% a.m., pub 0,5% a.m.)
corr  = v * ((1 + correcao/100)^(d/30) − 1)                      // composta, 0,4% a.m.
tot   = v + multa + juros + corr
```
### 4.2 Alçada da baixa (`alcadaBaixa(v)`)
`v ≤ alcBaixa1 (10.000)` → "Gerente financeiro"; `≤ alcBaixa2 (100.000)` → "Diretor financeiro"; senão "Diretoria / Comitê".

### 4.3 Bloqueio
- `bloqueado(p)` = privado E `valorAtraso>0` E `diasAtraso >= regLig||4` ("Pedidos bloqueados": novos pedidos bloqueados no ERP; liberação só com responsável e parecer).
- `bloqueioTotal(p)` = bloqueado E `diasAtraso >= regNeg||20` ⇒ **fallback 20 aqui vs 10 nos outros lugares** (com `regNeg` sempre definido = 10 não importa; incoerência de código).
- `foiProtestado(p)` = `protestado` OU (privado E valorAtraso>0 E diasAtraso ≥ regNeg||10) OU `cobHist` contém r30/rneg/rext/juridico OU `cobCheck.r30[0]` marcado.
- `anuenciaPendente(p)` = etapa regularizado E foiProtestado E !anuenciaEm.

### 4.4 Ação da régua (`acaoRegua(p)`)
Só privado. `e=cobEtapaDe(p)`; etapa em `COB_PRIV` com `acao`. Retorna `{e,nome,acao,idx:acaoIdx||[0],feito: todos os idx marcados em cobCheck[e]}`. "Marcar ação como feita" (`#rgFeito`) marca todos os `idx` em `cobCheck[e]` e acrescenta `cobAcoes[{etapa,acao,em,resp}]` (máx 60), `resp = campo Agente da tela || p.cobResp`.

### 4.5 Acordo de pagamento
**Gerar parcelas** (`#acGer`), entradas: Valor do acordo `tot` (default = valorAtraso), `n` (default 3; clamp 1..60), `prim` (1ª venc., default hoje+7 dias), `int` (intervalo em dias, default 30, mín 1), `ent` (entrada, default `ceil(valorAtraso*0.2)`).
Validações:
1. `tot` e `prim` obrigatórios.
2. **Somente privado**: `deb = max(valorAtraso, tot)`; `ent ≥ deb*0.20 − 0.01` (senão "Entrada mínima de 20% ... fora do padrão: Gestão Financeira").
3. Privado: `n ≤ 5` (senão "Mais de 5 parcelas é condição fora do padrão: aprovação da Gestão Financeira"). (Dica na UI: "entrada + 3 a 5 parcelas".)
4. Privado: se `deb > 50.000` e `RANK_CARGO[meuMembro.cargo] < 3` (menos que Gerente) → "Acordo acima de R$ 50 mil: aprovação do Gerente e garantia." (só valida se `meuMembro()` existe; a "garantia" não é verificada).
5. Público: sem essas regras.
Cálculo: `base=floor(tot/n*100)/100`; parcelas `i=0..n-1`: `venc=proxUtil(addDias(prim,i*int))` (próximo dia útil), `valor = (i==n-1) ? round((tot−base*(n−1))*100)/100 : base`; `pago:false`.
Grava: `cobParcelas`, `cobEtapa:"acordo"`, `cobEntrou`, `cobCheck.acordo[1]=true`, `cobAcordo="{n} parcela(s) de {base} a partir de {data}"`, `cobHist+{acordo}`, `cobProxAcao="Conferir pagamento da parcela"`, `cobProxData=prim`.
**A entrada não vira parcela nem lançamento** — só é validada (parece protótipo: "Entrada paga" apenas como campo de validação, não persistido).
Desconto: "Abaixo do saldo vencido, a diferença vira desconto concedido" (aplicado apenas na quitação, ver abaixo).

**Registrar pagamento de parcela** (`data-pg`): marca `pago=true,pagoEm=hoje`; `valorAtraso = max(0, round((valorAtraso − valorParcela)*100)/100)`; `valorRecuperado += valor`; `cobRecLog += {v,em}` (60); `cobProxData` = menor vencimento das abertas ou ""; se **todas pagas**: se `valorAtraso>0` restante → `descontoAcordo += restante; valorAtraso=0`; `diasAtraso=0`; `protestado=true` se `foiProtestado`; `cobEtapa="regularizado"`; `cobProxAcao=""`; `cobHist+regularizado`. Se restam parcelas e `valorAtraso==0` → `diasAtraso=0`.
**Cancelar acordo** (`#acCanc`, se `pagas<n`): `cobParcelas=[]`, `cobEtapa=""`, `cobAcordo=""`, `cobHist+{reguaEtapa(a)}`.
`acordoQuebrado(p)`: existe parcela não paga com `venc` e `diasDesde(venc) > quebraDias||5`. `acordoInfo`: `{n,pagas,vencidas,quebrado,aberto (soma não pagas),prox}`.

### 4.6 Baixa como perda (write-off)
- Propor (`#bxProp`): `v>0 e ≤ valorAtraso`; motivo obrigatório; proponente obrigatório. Grava `cobBaixa` pendente. Toast "Baixa proposta · aguardando {alçada}".
- Decidir (`aprovar`/`recusar`): exigem `Aprovado por` e `Parecer`; **segregação**: `mesmaPessoa(aprovador, proponente)` bloqueia ("quem propôs a baixa não pode aprová-la") — comparação por nome (case-insensitive, trim). O campo "Cargo" default = alçada requerida, **não é validado** contra o cargo real do usuário.
- Aprovação: `v=min(b.valor, valorAtraso)`; `valorBaixado += v`; `valorAtraso −= v`; se zerou: `cobEtapa="baixado"`, `diasAtraso=0`, `cobHist+baixado`. Grava `cobBaixasLog` (máx 20) e `cobBaixa=null`.
- `moverCob(...,"baixado")` não move: abre o painel (precisa de aprovação).

### 4.7 Regularização manual
`moverCob(..., "regularizado")` (ou select de etapa no painel): `valorRecuperado += valorAtraso`; `cobRecLog += {v:valorAtraso, em}` (se >0); `valorAtraso=0; diasAtraso=0`; `protestado=true` se `foiProtestado`.
No painel (submit): detecta `delta` de `valorRecuperado` digitado manualmente (versus anterior, descontando o log já lançado) e acrescenta `cobRecLog` do delta (se >0) — para que a edição manual do "Valor recuperado" entre no log.

### 4.8 Carta de anuência
Só aparece se `foiProtestado` E etapa `regularizado`. Exige "Enviada por" (obrigatório); grava `protestado=true`, `anuenciaEm`, `anuenciaResp`, `cobCheck.regularizado[2]=true`. Texto: "enviar a carta de anuência e excluir a negativação em até 5 dias úteis". Usa modelo `anuencia`.

### 4.9 Registrar contato
Obrigatórios: `feedback`. **Regra de promessa (privado)**: `previsao > somaUteis(data, 5)` ⇒ bloqueia: "Promessa acima de 5 dias úteis (política v5.2): registre um acordo formal com entrada." (público isento.) Efeitos: se havia `cobProxAcao` com `cobProxData <= hoje`, registra no log de agenda (`logAgenda` item `{k:"acao",t,prazo}`) e limpa próxima ação; se há `previsao`, `cobProxAcao="Conferir pagamento prometido"`, `cobProxData=previsao`; se `resp` e `cobResp` vazio ⇒ `cobResp=resp`. Máx 100 contatos.

### 4.10 Salvar do painel (submit)
Salva: `valorAtraso, diasAtraso, cobResp, cobProxAcao, cobProxData, cobAcordo, valorRecuperado, cobObs, cobCheck[cur], proxVenc, proxVencValor`. `pubDocs` só no público. Campos readonly no público com NFs (calculados). Log de agenda: se checklist da etapa passou de vazio para algo marcado → item `{k:"prev"|"regua", t:"Ações de {etapa}", prazo: prazoEtapaCob(a,cur)}`; se mudou `cobProxAcao` → item `{k:"acao"...}`. Mudança de etapa pelo select (não preventivo, não baixado): `sel==="regua"` ⇒ `cobEtapa=""`, `alvo=reguaEtapa(novo)`; senão `cobEtapa=sel`; `cobEntrou`, `cobHist`. Se `sel==="juridico"` e sem dossiê (`jurDeCliente`) e valorAtraso>0 ⇒ após 700 ms abre o dossiê.

### 4.11 KPIs de cobrança (`renderCobranca`)
Todos sobre `lista` = carteira do setor/BU/ramo/agente/busca (`cliente,cobResp,grupo,rca`) com `naCobranca`; `ativos` = lista − finais − preventivos; `prevs` = preventivos.

| KPI | Fórmula |
|---|---|
| Índice de inadimplência | `vT/(vT+aT)` onde `vT=Σ valorAtraso`, `aT=Σ saldoAVencer` sobre `carteiraCob` = (setor,BU) com etapaOf≠recusada e (valorAtraso+saldoAVencer)>0. Alerta se > 10% |
| Projeção de inadimplência | `(vT + Σ saldoAVencer·pr)/(vT+aT)` com `pr=probInad(p).pr`; só clientes com saldoAVencer>0. Alerta se > 10% |
| Vencem em até 5 dias (só privado) | Σ `(proxVencValor||saldoAVencer)` dos `prevs`; "N cliente(s) · N lembrete(s) pendente(s)" = prevs sem `cobCheck[prevStage][0]` |
| Saldo vencido em cobrança | Σ `valorAtraso` de ativos; sub: nº e média de dias de atraso |
| Acima de 90 dias | Σ valorAtraso de ativos com diasAtraso>90; % do vencido |
| Sem próxima ação ou atrasada | ativos onde `(!cobProxAcao || proxAtrasada(p))` E NÃO existe ação da régua pendente |
| (privado) Ações da régua pendentes | `lista` com `acaoRegua && !feito` |
| (privado) Clientes bloqueados | `lista.filter(bloqueado)`; Σ valorAtraso; nº com `bloqueioTotal` |
| (público) Recebíveis sem liquidação ou OP | ativos com `recebivelStatus(p).k !== "ok"` |
Faixas de atraso (sobre ativos, por `diasAtraso`): 1–30 "Até 30 dias", 31–60, 61–90, 91–180, ≥181 "Acima de 180 dias"; severidade: início>90 = bad; >30 = warn. Barras por agente: Σ valorAtraso por `cobResp||"Sem agente"`.
Totais por coluna do Kanban: preventivas = Σ `proxVencValor||saldoAVencer`; `baixado` = Σ `valorBaixado`; demais = Σ `valorAtraso`. Ordenação dentro da coluna: preventivas por `diasAteVenc` asc; demais por `diasAtraso` desc. Rótulo da coluna: "fim" se final; "preventiva" se prev; "régua automática" se `regua`; senão contador `i+1 − nº de prev` (2 dígitos); acrescenta ` · SLA {sla}d`. `.col.final-bad/.final-ok`, `.ph-p` para régua.
Lista "Bloqueados": por diasAtraso desc; colunas cliente, documento, BU, dias, valor vencido, valor atualizado (`encargos.tot`), etapa (+ chip "ação pendente").
Lista "Projeção": top 10 por valor projetado `saldoAVencer*pr`; barra de cor: pr≥0,40 bad; ≥0,15 warn; senão ok; mostra motivos.

### 4.12 Probabilidade de inadimplência (`probInad`)
```
SE público: pr = PROB_PERFIL[perfilPag] (Pontual .05, Atrasos eventuais .25, Atrasos frequentes .60) senão 0,15 ("perfil de pagamento não definido")
SENÃO se pontualidade numérica: pr = max(0, 1 − pontualidade/100)
SENÃO se rating ∈ PROB_RATING {AA .01, A .02, B .05, C .10, D .20, E .35, F .50, G .70, H .90}: pr = esse
SENÃO pr = 0,05 ("sem histórico")
se valorAtraso>0 → pr = max(pr, 0,50)
criticidade: crítico → max(pr,0,40); alerta → max(pr,0,20)
retorno pr = min(pr, 0,95), motivos[]
```

### 4.13 Score final / Farol / Limite (motor privado)
- `scoreComp(p)` (score interno 0–1000): `temP = pontualidade numérica`; se `!temP && tipoCliente=="novo"` → null; `c = temP ? min(100,pontualidade)*10 : 700`; se `d>0`: `c −= min(600, d*10)`; recorrente +50; inativo −50; clamp 0..1000, round.
- `scoreFinal`: se `score` vazio → null; se `scoreComp==null` → score; senão `w=clamp(pesoSerasa,0,100)/100` ⇒ `round(score*w + comp*(1−w))`.
- `FAROL` (6 classes): AA·Sem risco 800–1000 (limite 100–120% do cálculo, `fmin 1,fmax 1.2`, teto 30% do fat., prazo máx 60 d, "Pode flexibilizar"); A·Baixo 600–799 (100%, teto 25%, prazo 45 d); B·Médio 400–599 (70–90%, teto 20%, 42 d, "Monitorar o comportamento"); C·Alto 200–399 (até 50%, teto 15%, 35 d, "Compras controladas; ligação em D-1"); D·Muito alto 0–199 (sem crédito a prazo; somente à vista ou cartão; exceção só com garantia); E·Restrito (min −1; só por rebaixamento: acima de 45 dias de atraso; sem crédito). Cores: AA #3E7B36 / A #57984D / B #a8730a / C #c25a17 / D #b3352a / E #6B4F8A.
- Faixa por atraso: `atr = d<=0?0 : d<=5?1 : d<=15?2 : d<=30?3 : d<=45?4 : 5`; `base = max(índiceDoScore, atr)`; `alertas = flags manuais (flagNeg "Negativação", flagDados "Dados inconsistentes", flagPedido "Pedido fora da realidade") + alertasAuto`; `i = min(5, base + nº alertas)` (cada alerta rebaixa 1 classe).
- `alertasAuto`: Receita "Irregular"→"Situação irregular na Receita"; "Com protesto"→"Protesto"; "Com processo relevante"→"Processo relevante"; "Com restrição"→"Sócio com restrição"; PJ com abertura < `fraudeMeses` (12) meses→"CNPJ com menos de N meses"; cliente novo com `fatMensal` e `valor > fatMensal*fraudePct/100` (50%)→"Pedido inicial alto"; PL ≤ 0→"Patrimônio líquido negativo"; AC/PC<1→"Liquidez corrente abaixo de 1"; Dív/EBITDA>3→"Dívida acima de 3× o EBITDA".
- `limitePolitica(p)` (privado): `pm=max(prazoMedio||30,30)`; se `compraMedia>0`: `base=compraMedia*pm/30*polFolga`; senão se `fatMensal>0`: `base=fatMensal*polNovoPct/100`; senão `v=null`. Se `fPL>0`: `base=min(base, fPL*polPLPct/100)`. Sem farol (sem score): `v=min(base, fat*polTetoPct/100)` se fat, arredonda ao milhar. Com farol: `i>=4` → `v=0`; senão `v=base*fmax`, `vmin=base*fmin`, `teto=fat*F.teto/100` (se fat) limita, arredonda ao milhar.
- `motorCredito(p, sol, gar)`: resultado `k` ∈ dados / garantia / negar / comite / aprovar / reduzir. Concentração: `cart = Σ limiteDe` de outras propostas em `gestao`/`reanalise` + v; `teto = cart*concMax/100`; `exp` = limites do mesmo `grupo`; `disp = max(0, teto−exp)`; se `v>disp` ⇒ `v=floor(disp/1000)*1000` (reduzido por concentração); `v==0` ⇒ "Levar ao comitê: concentração". Se `sol<=v` ⇒ "Aprovar" (com ressalva se há pendências de documentação); senão "Aprovar com limite de v" ("{x%} acima do motor").
- `docsExigidos(p,v)`: (1) consultas válidas (4 consultas + `cData`; validade `consValid`=30 d), (2) Score Serasa, (3) fonte pagadora `fpTipo`, (4) ficha de contatos atualizada (`contatosStatus`), (5) evidências documentais anexadas; `v>docF1` (100k) ⇒ faturamento comprovado; `v>docF2` (500k) ⇒ balanço e DRE (AC,PC,PL).
- `consultaStatus`: `d = floor((agora − cData)/dia)`; válido se `d ≤ consValid`.
- Classes de cor: `classePont`: ≥95 ok, ≥85 mid, senão bad; `classeScore`: ≥600 ok, ≥400 mid, senão bad. `saude(c)`: `d>30`→"risco"; senão se há sinais (atraso>0, uso ≥90% do limite, validade vencida) →"atencao"; senão "ok".

### 4.14 Motor do órgão público (`motorPub`) — nota 0–100
Critérios (pontos/máx): CAPAG (A 30, B 22, C 10, D 0, "Não divulgada" 12, "Não se aplica (União)" 30; sem info: Federal 30, demais 12) /30; Despesa com pessoal vs limite por esfera `LIM_PESSOAL={Municipal:54, Estadual:49, Federal:37.9}` (≤90% do limite 15; ≤95% 10; ≤100% 5; acima 0; sem info: federal 15, demais 7; sem esfera: 7) /15; CAUC (Regular 10, Com pendência 3, outro 5) /10; Fonte do recurso (Vinculada SUS fundo a fundo 15; Outra vinculada 10; outra 6) /15; Histórico de pagamento (Pontual 20; Atrasos eventuais 12; Atrasos frequentes 4; sem perfil: atrasoMedio ≤15→18, ≤45→12, ≤90→6, senão 2; sem info 10; se atraso médio >90 → cap 4) /20; Empenho prévio e contrato vigente (empenho 5 + contrato 5; "Estimado do edital" sem empenho/contrato = 5) /10. Fim de mandato: a partir de 1º de maio do último ano de mandato (`fimMandato`: federal/estadual anos %4==2; municipal %4==0), −5 pontos ("art. 42 da LRF"). Rating `RAT_PUB`: P1 ≥80 (fat 1,0 "Risco baixo"), P2 ≥60 (0,8), P3 ≥40 (0,5), P4 ≥0 (0,25). Se CAPAG D ou pessoal acima do limite e rating melhor que P3 ⇒ força P3. Exposição = `round(val*fat/1000)*1000`. Base: "Estimado do edital" (val=pEstimado||valor), "Saldo de contrato ativo" (val = pSaldo se contrato ok), senão `valor`. Decisão (`dec.k`): `base` (sem base informada), `edital` (pré-aprovar), `semsaldo` (não fornecer), `empenho` (pEmpPrev=="Não": "Não entregar sem nota de empenho", Lei 4.320/64 arts. 60 e 61), `contrato` (pContrato=="Não"), `aprovar` (P1), `comite` (P4: "Levar à diretoria"), `reduzir` (P2/P3). Condições textuais por rating em `RAT_PUB.cond`.

### 4.15 SLA do Kanban
- `slaState(kind,p)` [fora do trecho]: `d=decorrido(p,unidade)`; `d>sla`→"bad"; `d===sla`→"warn"; senão "ok"; null se sem SLA.
- **SLA por valor (política)**, `slaValor(p)`: só para propostas em etapas ativas exceto `gestao`/`reanalise` e com `criadoEm`: `d = valor ≤ docF1(100k) ? 2 : (valor ≤ docF2(500k) ? 5 : 10)` dias úteis; `lim = somaUteis(criadoEm(date), d)`; vencido se `hoje > lim`. Chip "Análise até {data}" (+" · vencida").
- Preventivas não têm SLA; régua automática sem SLA (só `negociacao` 10 d e as etapas públicas).

### 4.16 Desempenho (aba) — fórmulas
Constantes: `DIA=86400000 ms`, `HORA=3600000`, `META_SLA=0,85`.
- `hist(p)`: `historico` → `[{etapa:normEtapa,t:Date.parse(em)}]` ordenado; se vazio usa `{etapa atual, t: criadoEm}`.
- `passagens(kind,p)`: para cada entrada do histórico cuja etapa tem SLA (unidade "h" ou dia): se NÃO é a última: `ms = próximo.t − t`, `ok = ms ≤ sla*unidade`, `done:true`; se é a última e etapa ativa: `ms = agora − t`; só entra se **já estourou** (`ms > sla*unidade`) com `ok:false, done:false`. ⇒ etapa atual dentro do prazo NÃO conta.
- `decisao(kind,p)`: etapas finais de decisão — propostas `["gestao","recusada"]`, pedidos `["liberado","recusado"]`; primeira ocorrência no histórico; `ms = t_decisão − t_primeiro_histórico`; etapa = qual foi.
- **Por agente** (`perfLinhas`): nomes = `analista||"Sem agente"` das propostas ∪ `analista` dos pedidos; por agente:
  - `ativas` = propostas do agente em `ATIVAS_PROP`;
  - `fora` = ativas com `slaState=="bad"` + pedidos ativos do agente com `slaState=="bad"`;
  - `decididas` = propostas com `decisao`; `apr` = proporção com etapa `gestao` ÷ decididas;
  - `ciclo` = média de `ms/DIA` das decisões (dias);
  - `sla` = `passagens ok / passagens` (propostas+pedidos); `nPas` = nº de passagens; verde se ≥ 85%, vermelho se abaixo;
  - `vol` = Σ `valor` das aprovadas (`gestao`);
  - `ped` = nº de pedidos decididos do agente; `pedH` = média horas até decisão;
  - `inad` = propostas do agente em `gestao` com `saude(p).nivel==="risco"` (atraso >30 d).
- **KPIs gerais**: SLA global = passagens ok ÷ todas (sub: "X de Y etapas no prazo"); Ciclo = média dias das decisões; Aprovação = `aprovadas÷decididas` ("N aprovadas · M recusadas"); Pedidos decididos = nº (média de horas até decisão).
- Filtro: período em dias (`#fPeriodo`; por `criadoEm >= agora − dias*DIA`; desabilitado quando há filtro de mês, que usa `mesDe(criadoEm)===mes`), setor/segmento/BU. Dois itens (propostas/pedidos) detectados por presença de `numero` (`p.numero!==undefined` ⇒ pedido — **frágil**).
- Ordenação da tabela clicável por coluna (`perfSort`: `{k:"decididas",dir:-1}`; `nome` asc por padrão; nulos tratados como −1).
- Gráfico SLA por agente (barra com marca de meta 85%); gráfico tempo médio por etapa: só `passagens` concluídas (`done`), em dias, escala comum `max(sla, avg)*1,1`, barra vermelha se média > SLA.
- **Responsáveis (decisões críticas)**: agrega por pessoa: propostas com `comiteResp && comiteParecer` (conta `com`, `valor`, `comiteData`) e pedidos **liberados** com `libResp && libParecer` (conta `lib`); cargo = `comiteCargo`/`libCargo`; ordenado pela data mais recente.
- Home/Resumo (`render`): "Taxa de aprovação" = `aprovadas(gestao+reanalise+obsoleto) ÷ (aprovadas + recusadas)`; "Fora do SLA" (propostas e pedidos); carteira em gestão (limite total, utilizado, vencido, a vencer, % uso = utilizado/limite); "Vendas retidas" = pedidos ativos e Σ valor.
- Gestão (aba): `venc = carteira.filter(paraEncaminhar)`; destino `reanalise` se recorrente (≥2 compras no período) senão `obsoleto`; "Sem compras há N (diasSemCompra=90)+ dias" ⇒ Obsoleto mesmo com validade em dia; botão "Encaminhar N cliente(s)" (`#btnVenc`, em lote — handler fora do trecho).

### 4.17 Calibração mensal (`calibFoto`)
Uma vez por sessão (flag), se `!readOnly && !localMode && db` e ainda não existe doc do mês: tira "foto" dos clientes reais (`!exemplo`, etapa gestão): para público `{id,cliente,seg:"publico",bu,classe:"Público",diasAtraso,valorAtraso,limite,utilizado}`; para privado `{id,cliente,seg,bu,classe:farol.n,i,base,score,scoreComp,diasAtraso,valorAtraso,limite,utilizado}` (máx 900). Grava `calibracao/{YYYY-MM}` = `{mes,em,n,clientes[]}`. Disparado 4 s após carregar a coleção. Objetivo: calibração trimestral do score (Política v5.2). Erros são engolidos.

### 4.18 Outras coisas no `render()`
Contagens "N em análise" (concessão) e "N em cobrança" por segmento (privado, estetica, publico); filtros por mês (`aprovacaoDe`: data da 1ª entrada em `gestao`/`liberada` do histórico, ou `entrouEtapa`/`criadoEm`; `refData` usa isso só para propostas já em gestão/reanálise/obsoleto), BU, ramo, agente (incluindo "eq:{nome}" = equipe de um supervisor/gerente/diretoria via `subordinados`). Filtros salvos em `localStorage` (esteira.sec/setor/bu/ramo/agente/mes/est); se o filtro salvo não tiver mais registros, limpa e avisa (toast).
`criticidade(p)`: nível "ok"/"alerta"/"critico" [fora do trecho]; barra de críticos: nº críticos, em alerta, inadimplentes ("inadInterno") e Σ valorAtraso; "limite utilizado por críticos".

---

## 5. Persistência

### 5.1 Plataforma original (protótipo) → a mapear para MySQL
Cliente usa `window.claude.use("db")` (API tipo Firestore: `db.collection(x).doc(id).set/get/delete`, `db.doc("config/x").set`, `onSnapshot`), `use("user")` (`user.can("data.write")`, `user.id()`), `use("assets")` (anexos). Tempo real: **todas as coleções são ouvidas por `onSnapshot`** e `render()` roda a cada atualização.

### 5.2 Coleções e documentos
| Caminho | Formato | Conteúdo / uso |
|---|---|---|
| `propostas/{id}` | doc por cliente/proposta (ver §1.1) | `.set(data)` com **documento inteiro** (`{...strip(a), campos}`) — sobrescreve; `id` não vai no corpo |
| `pedidos/{id}` | doc (ver §1.2) | idem |
| `config/regras` | objeto plano de chaves (ver §1.8) | merge feito no cliente com `REGRAS_PADRAO`; salvo com `.set({...n})`; auditoria "Regras e metas" / "config/regras" com `audDiff` |
| `config/emails` | `{modos:{etapaId:"auto"|"aprovar"|"manual"}, integracao:{status:"pendente"|"ativa", conta}}` | modos de envio e estado da integração |
| `config/certidoes` | objeto `{fed,fgts,trab,est,mun: validade date}` | `CERT_LISTA`: CND Federal (Receita Federal e PGFN), CRF do FGTS (Caixa), CNDT · débitos trabalhistas (TST), CND Estadual, CND Municipal. `certAlertas()` retorna `[]` logo na primeira linha (código morto/desativado) |
| `config/equipe` | `{membros:[…]}` (nome, cargo, sup…) | `EQUIPE`; cargos e `RANK_CARGO` |
| `config/planos` | `{lista:[…]}` | planos de pagamento (`PLANOS_TAB`) |
| `config/pagamento` | `{lista:[…]}` | regras de pagamento (`REGRAS_PAG`) |
| `config/feriados` | `{lista:[…]}` | feriados locais (`FER_LOC`) — usados em `somaUteis`/`proxUtil` |
| `config/juridico` | objeto | `JURCFG` |
| `auditoria` | coleção; cada doc `{em (ISO), …}` | log; ordenado em memória por `em` desc |
| `importacoes` | coleção | log de importações (`IMPLOG`; aba "imp") |
| `fechamentos` | coleção, `id`=período | fechamentos (`FECH`) |
| `calibracao/{YYYY-MM}` | `{mes,em,n,clientes[≤900]}` | foto mensal (ver §4.17) |
| `juridico/{id}` | doc de processo (`autos`, `etapa`; "encerrado") | contagem "N em andamento" = etapa≠"encerrado" e com `autos` |
| `aging/{id}` | snapshots (`SNAPS`) | fotos de aging (`snapsOk`); `tirarFoto()` chamada em `render()` [fora do trecho] |

### 5.3 Escrita (`write(kind,id,data)`)
1. `readOnly` ⇒ toast "Você tem acesso só de leitura a esta esteira." e retorna false.
2. `localMode` (sem banco) ⇒ guarda só em memória.
3. Para `propostas`/`pedidos`: calcula `audDiff(old, data, Object.keys(AUD_ROT))` e chama `auditar(…)`: tipo "Análise de crédito" (propostas) / "Pedido acima do limite" (pedidos), alvo = `cliente||id`, mudanças `[{c,a,d}]`; se doc novo: `[{c:"etapa",a:"—",d:etapa||"nova"}]`. **Só os campos em `AUD_ROT` são auditados**: `limite, valor, etapa, analista, cobResp, comiteResp, libResp, excJust, ramo, fonte, prazo, obs` [fora do trecho]. (Ou seja, movimentações de cobrança, baixas, acordos, e-mails **não** são auditados no log — exceto `cobResp`.) Edição de config/regras e config/emails também gera auditoria.
4. **Fila por documento**: `queues` (Map `kind/id → Promise`): escritas ao mesmo doc são serializadas (`prev.catch(()=>{}).then(set)`).
5. Otimismo: em `mover`/`moverCob`, atualiza `items` local antes de gravar (`if(!localMode)`).
6. Sem transações/merge: **sobrescreve o doc inteiro** com base na cópia local (`atual()`), risco de last-write-wins em concorrência.
`remove(kind,id)`: mesma checagem; `db.collection(kind).doc(id).delete()`.
`strip(p)`: remove `id` e clona profundamente por JSON.
Em `moverCob`/`mover` o doc novo é `{...strip(p), …}`; em `mover` é `strip(novo)`.

### 5.4 Erros (`handleErr`)
`invalid_argument` ⇒ `readOnly=true` + toast "Não foi possível salvar: seu acesso permite apenas visualizar."; `quota_exceeded` ⇒ "O limite de registros desta esteira foi atingido. Exclua itens antigos para continuar."; outro ⇒ "Não foi possível salvar agora. Tente de novo em instantes." Listeners de propostas/pedidos: `revoked` ⇒ readOnly + "O acesso a esta esteira mudou.".

### 5.5 Permissões / modo leitura / modo local
- `readOnly`: definido se `user.can("data.write")===false`; desabilita botões ("Nova proposta", "Registrar pedido", "Aprovar", "Marcar enviado", "Salvar modos", selects), campos do painel (`disabled`), `draggable=false`, impede `write/remove/salvarRegras`. Padrão: leitura é aberta a quem tem acesso à esteira; escrita é um único flag binário (sem perfis granulares na plataforma).
- Perfis **de negócio** vêm de `config/equipe` (`cargo`) via `meuMembro()` (provavelmente comparação com `MY_UID`/usuário) e `RANK_CARGO={"Agente de cobrança":1,"Jurídico":0,"Supervisor":2,"Gerente":3,"Diretoria":5}` e `RANK_ALC={"Supervisor":2,"Gerente":3,"Diretor financeiro":4,"Diretoria":4,"Comitê de crédito":4,"Comitê regional":3,"Comitê executivo":5}`; `checaAlcada` bloqueia (só se `meuMembro()` existir) [fora do trecho].
- `localMode`: sem `db`, banner "Modo local: esta visualização não está conectada ao armazenamento compartilhado, então as alterações valem só até fechar a página." Sem persistência.
- `localStorage`: preferências de UI (`esteira.sec/setor/est/bu/ramo/agente/mes`).
- Anexos (`ASSETS`): `refreshAnexos()` — armazenamento de arquivos (evidências documentais).

---

## 6. Fluxos e transições

### 6.1 Cobrança privada — automático × manual
```
[proxVenc em 5..2 dias]  → prev5   (automático, só se valorAtraso==0, setor privado)
[proxVenc em 1 dia]      → prev1   (automático)
[proxVenc = hoje]        → venc0   (automático)
[valorAtraso>0]          → r1 (D+1..)  → r5 (D+4) → r15 (D+7) → r30 (D+10) → rneg (D+20) → rext (D+30) → juridico (D+45..60)
                           (automático pelos diasAtraso; ordem/limites configuráveis em config/regras)
Manual: "negociacao" (SLA 10 d) / "acordo" (parcelas) / "juridico" (antecipar, com dossiê) / "regularizado" / "baixado" (via proposta+aprovação)
valorAtraso→0 (sem cobEtapa) → "regularizado" (derivado)
acordo quebrado (parcela > 5 dias vencida) → volta à régua (derivado, não grava)
acordo quitado → regularizado (grava); cancelar acordo → cobEtapa="" (régua)
```
Efeitos da régua (`r5`): "bloquear novos pedidos"; `r30`: "bloqueio total". `bloqueado` ⇒ pedidos acima do limite só podem ser liberados com responsável+parecer (ver §6.4).

### 6.2 Drag-and-drop no Kanban de COBRANÇA (`moverCob`)
Observação: `renderCobranca` monta `#boardCob` e usa colunas `.col[data-etapa]`, mas **o código de drag-and-drop deste trecho está ligado apenas a `#boardProp` e `#boardPed`** (os handlers `dragstart/drop` são registrados só nesses dois elementos). Se `#boardCob` tiver D&D, o handler está em outro trecho (provável, pois `moverCob` existe e é usado). **Ambiguidade a confirmar.** Regras do `moverCob(id, etapa)`:
| Condição | Resultado |
|---|---|
| etapa == etapa atual | nada |
| cliente em etapa preventiva OU destino ∈ {prev5,prev1,venc0} | bloqueia: "As colunas preventivas são automáticas: o cliente entra pela data do próximo vencimento." |
| destino `baixado` | bloqueia + abre cartão: "A baixa como perda é proposta no cartão e precisa de aprovação na alçada." |
| destino `juridico`, sem dossiê (`!jurDeCliente`) e valorAtraso>0 | bloqueia + abre dossiê: "Para enviar ao Jurídico, monte o dossiê de cobrança jurídica." |
| destino `acordo` e `acordoQuebrado` | bloqueia: "O acordo deste cliente está quebrado. Cancele-o e gere novas parcelas no cartão." |
| privado e destino ∈ REGUA_IDS | `cobEtapa=""` (régua); se a etapa automática calculada == atual → toast "A régua é automática pelos dias de atraso: …"; senão o alvo é `reguaEtapa(p)` **(arrastar para uma coluna da régua apenas devolve para a régua; não escolhe a coluna)** |
| outros (`negociacao`, `acordo`, `juridico`, `regularizado`) | seta `cobEtapa`, `cobEntrou`, `cobHist+{alvo}` (40); `regularizado` zera saldo vencido e lança recuperado |
Depois: se destino `acordo` e sem parcelas ⇒ após 400 ms toast "Gere as parcelas do acordo no cartão." e abre o cartão.
No público: sem checagens além de baixado/jurídico/acordo quebrado; etapa pública `cobEtapa`.

### 6.3 Kanban de CONCESSÃO/GESTÃO (propostas) — `mover(kind,id,etapa)` (validações em ordem)
Aplicam-se quando `etapa != etapaOf(p)`.
1. (Pedidos → `liberado`) sem `decisao` ⇒ "Defina a condição de liberação antes de liberar o pedido." (abre painel na aba liberado).
2. (Pedidos → `liberado`) sem `libPlano` ou `libForma` ⇒ "Informe o plano e a forma de pagamento aprovados para liberar o pedido."
3. (Propostas, de `comite`, para etapa com `idx` maior e ≠ recusada) sem `comitePlano && comiteForma` ⇒ "Informe o plano e a forma de pagamento aprovados pelo comitê."
4. (Pedidos → `liberado`, `critico(p)`) sem `libResp && libParecer` ⇒ "Liberação crítica: informe o responsável e o parecer técnico."
5. (Propostas de `comite` para frente) sem `comiteResp && comiteParecer` ⇒ "Registre o responsável pela decisão do comitê e o parecer técnico."
6. (Propostas) `ord = FLUXO_IDS[setor]`; se está em `comite` ou `paprov`, destino ≠ recusada e posterior na ordem: se `mesmaPessoa(comiteResp, analista)` ⇒ "Segregação de funções: quem analisou a solicitação não pode aprová-la."; e `checaAlcada("propostas",p)` (erro retorna mensagem).
7. (Pedidos → `liberado`) `checaAlcada("pedidos",p)`.
8. (Pedidos → `liberado`) `mesmaPessoa(libResp, analista)` ou `(libResp, vendedor)` ⇒ "Segregação de funções: quem libera o pedido não pode ser o agente nem o vendedor."
9. (Pedidos → `liberado`) cliente bloqueado pela régua (`bloqueado(clienteDoPedido(p))`) sem `libResp && libParecer` ⇒ "Cliente bloqueado pela régua de cobrança: informe o responsável e o parecer da liberação."
10. (Propostas em `cadastral` para frente) `!confirmado(p)` (tel, endereço, financeiro confirmados) ⇒ "Confirme telefone, endereço e contato financeiro antes de avançar."
11. (Propostas) `gatePub(p,etapa)` (regras do público; ver `js-A.js`: `panalise`→frente exige docs (checklist 0 e 1 marcados), `capFin`, `perfilPag`; →`gestao` exige contrato ativo; saindo de `paprov` exige rating, comiteResp+parecer, comitePlano+Forma; recusar de `paprov` exige responsável e parecer).
Observação: **mover para trás é livre** (sem validação além das acima); o Kanban é totalmente "pulável" (qualquer coluna do mesmo `kind`).
Sucesso: `{...p, etapa, entrouEtapa:agora, historico:[...,{etapa,em}] (40)}`; se destino `gestao` ⇒ `prepararGestao(novo, veioDeReanalise)`: `limite = valor` se vazio, `utilizado=0` se vazio; se sem `revisao` ou renovação (veio de `reanalise`) ou vencido ⇒ `revisao = hoje + 3 meses (VALIDADE_MESES)`, `comprasPeriodo=0`, `inicioValidade=hoje`. Toast `"{cliente} → {nomeEtapa}"`.
Regras do DOM: `dragstart` marca `drag={kind,id}`; colunas de outro `kind` recebem `.nodrop`; `dragover/drop` só aceitam coluna do mesmo `kind` (não se pode soltar um pedido no quadro de propostas e vice-versa); `draggable` só se `!readOnly`; clique no card abre o painel (`abrir(kind,id)`). Não há reordenação dentro da coluna (ordem automática por `entrouEtapa` asc).

### 6.4 Pedidos x cobrança
`retidosDe(c)` conta pedidos ativos vinculados ao cliente (por `clienteId` ou nome). Cliente bloqueado pela régua exige parecer para liberar pedido (regra 9).

### 6.5 E-mail (fluxo)
Fila do dia → (auto: "Pronto para envio"; aprovar: "Aguardando aprovação" → botão Aprovar → "Pronto para envio"; manual: "Enviar manualmente") → "Abrir no e-mail" (mailto) → "Marcar enviado" → `cobMail[key].enviado`, histórico de contatos, check automático da etapa, e (público) `nfs[i].regua[st]`. Idempotência: chave `etapa_dataRef` impede reenvio no mesmo ciclo.

---

## 7. Dúvidas, ambiguidades, pontos de protótipo

1. **Etapas e regras fora do trecho**: ETAPAS_PROP/PED, `gatePub`, `checaAlcada`, `msgNF`, `reguaPubCliente`, `normPub`, `criticidade`, `evidencias`, `slaState/decorrido` precisam ser lidos nos outros relatórios.
2. **Envio automático de e-mail inexistente**: só `mailto:` e "Marcar enviado" manual. A "tarefa diária 8h dias úteis" e a integração Gmail/Outlook são promessa/placeholder. `canal:"integracao"` é gravado quando status "ativa" mesmo com clique manual (mentira de auditoria). `mailto:` não suporta anexo (carta de anuência "anexa").
3. **Aprovação de e-mail** sem perfil/alçada; "aprovar" não restringe quem aprova.
4. **`mailDest` ≠ destinatário do painel** (`finContato` apenas). `finContato` mistura e-mail e telefone.
5. **`vencOrig` aproximado** (hoje − diasAtraso) e `limV` usa fallback +3 dias quando prazo já passou — datas nos e-mails podem ficar incoerentes (ex.: r15 "até D+10" chamado de etapa D+7).
6. **Inconsistência `bloqueioTotal`**: usa `regNeg||20`; demais usam `||10`.
7. **Duas fontes de verdade para "feita"**: `cobCheck[etapa][idx]` marca ação cumprida; `cobAcoes[]` é log. Marcar um item do checklist manualmente no cartão também torna a ação "feita" (sem log).
8. `MAIL_CHECK` marca só índice 0; `r5` e `r30`/`juridico` não têm mapeamento ⇒ e-mail enviado não conclui a ação (correto para r5 `acaoIdx [0,1]`, mas r1 também precisa [1] = ligação). Para `r30` o e-mail de "protesto enviado" não marca "Título enviado a protesto".
9. **Régua jurídica**: `juridico` é auto (≥45 d) mas ≠ `REGUA_IDS`; "arrastar para juridico" é manual e exige dossiê; nome diz "D+45 a D+60" mas não há automação ao passar de 60 dias.
10. **Acordo**: "Entrada paga" só é validada (≥20%) e não é registrada como pagamento/parcela; "garantia" acima de R$ 50 mil não verificada; aprovação da Gestão Financeira para exceções é apenas bloqueio (não existe fluxo de exceção). `n>5` bloqueia mas o texto diz "3 a 5 parcelas". Regra sem validação no público. Acordo cancela etapas manualmente.
11. **Baixa**: aprovação não valida o cargo do aprovador vs alçada (campo livre "Cargo"); segregação por comparação de nome; "docs" não bloqueiam a proposta.
12. **Perda de dados por concorrência**: `set` do documento inteiro (sem merge/versão) a partir da cópia em memória; várias ações (e-mail, contato, parcela) escrevem o doc inteiro. Para MySQL: usar updates parciais/versão otimista; considerar tabelas filhas (contatos, parcelas, e-mails, baixas, histórico) em vez de arrays JSON limitados (`slice(-40/-60/-100/-20)` truncam silenciosamente).
13. **Auditoria parcial**: só campos de `AUD_ROT`; cobrança não é auditada (apenas `cobResp`).
14. **Chaves "regras" duplicadas**: `REGRAS_PADRAO` inclui metas, PDD, política de limite etc. (não só cobrança). PDD (`pddDe`) é calculada em outro lugar.
15. **Desempenho**: distingue pedidos de propostas por `p.numero!==undefined` (frágil); passagem ativa só conta se estourou (viés para baixo no SLA); `inad` do agente = clientes "risco" (>30 d), não inadimplência real; "Sem agente" agrega; usa `analista` (agente de crédito) e não `cobResp`. KPI "Aprovação" no topo usa gestão+reanálise+obsoleto como "aprovadas".
16. **`render()` faz tudo a cada snapshot** (re-renderiza ~20 telas): em React/MySQL precisa de queries agregadas no servidor.
17. **Datas**: mistura `hojeISO()` (fuso local) e `toISOString()` (UTC); `somaUteis/proxUtil` dependem de feriados `config/feriados` (lista local). `diasAtraso` e `valorAtraso` são **digitados/importados** (aba de importação "imp"; `config/importacoes`) — não são calculados de títulos no privado (no público são calculados das NFs). Em sistema novo definir se haverá tabela de títulos/faturas (a prévia depende de `proxVenc`/`proxVencValor` por cliente, só um vencimento por cliente).
18. **Hard-codes de negócio** a parametrizar: contato `(61) 3033-3116`, `cobranca@benenutri.com`, assinatura, `RAMOS` (marcada como provisória), BUs, `LIM_PESSOAL` (limites LRF), `PROB_RATING/PROB_PERFIL`, limites de alçada 100 mil/1 milhão (público), `entrada 20%`, `5 dias úteis` de promessa, "Política v5.2", `META_SLA=85%`, validade 3 meses, `COMPRAS_RECORRENTES=2`.
19. **Estética** como segmento do privado por `bu=="Estética"` com botão alternador (`fState.est`).
20. Modelo de e-mail `juridico` não tem WhatsApp (`null`); `modeloEmail(null,e)` gera modelo com placeholders (usado na tela de regras — fora do trecho).
21. `certAlertas()` retorna `[]` logo no início (feature desativada); `confs/farolDe` etc. dependem de `p.score` digitado (não há integração Serasa).
22. `usuário/papel`: o sistema só tem `data.write` binário; "cargo" vem de `config/equipe` e o login/`meuMembro()` mapeia (por `MY_UID`). Na Mitra: modelar perfis reais (Agente, Supervisor, Gerente, Diretoria, Jurídico) e checar no servidor — hoje todas as validações (alçada, segregação) são **só no front**.
