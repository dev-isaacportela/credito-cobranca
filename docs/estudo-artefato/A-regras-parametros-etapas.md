# Relatório A — Painel de Crédito e Cobrança (js-A.js, linhas 1–1045)

Escopo: leitura integral do trecho. O arquivo é um **recorte** do app: várias funções/constantes são usadas mas **definidas fora** (js-B). Elas estão listadas na seção 8.1. Tudo o que está marcado como "(externo)" não foi visto neste trecho.
Convenções: `p` = registro de proposta/cliente (coleção `propostas`); `q` = registro de pedido (coleção `pedidos`); `R`/`REGRAS` = parâmetros configuráveis.
Marca da empresa nos textos: Benenutri (Grupo Benenutri, "Núcleo Financeiro"); atividade: nutrição/saúde (fonte pagadora SUS, operadoras, licitação).

---

## 1. Entidades e campos

### 1.1 Persistência observada (`db.collection(...)`, objeto `items`)
| Coleção / chave | Conteúdo | Observação |
|---|---|---|
| `propostas` (Map `items.propostas`) | Um doc por cliente/solicitação. **Proposta e cliente são o MESMO registro**: ao chegar em `gestao` ele vira "cliente com limite". | `write("propostas", id, doc)`; `strip(doc)` (externo) remove campos derivados antes de gravar |
| `pedidos` (Map `items.pedidos`) | Pedido retido por excesso de limite | `kind==="pedidos"` |
| `aging` (doc id = `YYYY-MM`) | Foto mensal do aging: `{em:ISO, c:{[propostaId]:[faixa(0..5), valor]}}` | Gravada 1x por mês na 1ª abertura (ver 3.9). Map `SNAPS` |
| fechamento manual (`FECH`, Map `YYYY-MM`→obj) | `{carteira, vencido, v90, pdd}` lançados à mão p/ meses sem foto | nome da coleção não aparece (externo) |
| regras | `REGRAS` inteiro, gravado por `salvarRegras(obj)` (externo) | merge sobre `REGRAS_PADRAO` |
| equipe (`EQUIPE`) | lista `{nome,cargo,sup,uid?}` | gravada por form (externo) |
| anexos | arquivos via `ASSETS.upload/delete` (store de assets da plataforma), servidos em `/_blob/{id}` | metadado fica em `p.anexos` |

Flags globais: `readOnly` (usuário só visualiza → inputs `disabled`, botões de salvar ocultos), `localMode` (modo local: não grava foto de aging; atualiza Map em memória), `ready`, `db`, `MY_UID` (uid do login atual).

### 1.2 Proposta / Cliente (`p`) — campos lidos/escritos
**Identificação e classificação**
| Campo | Tipo | Significado |
|---|---|---|
| `id` | string | chave |
| `cliente` | string | razão social/nome |
| `documento` | string | CPF/CNPJ (busca por texto e só dígitos) |
| `setor` | `"publico"` \| outro (=privado) | `setorP(p)` retorna `"publico"` só se `p.setor==="publico"`, senão `"privado"` |
| `bu` | string | Business Unit (lista `BUS`, externo; cores `BU_CORES`) |
| `rca` | string | representante comercial (tag) |
| `grupo` | string | grupo econômico (se vazio, o cliente é seu próprio grupo: chave `"cli:"+id`) |
| `esfera` | `Municipal`/`Estadual`/`Federal`/"" | só público |
| `exemplo` | bool | marca registro de exemplo (chip "exemplo") |
| `ramo` / `ramoNm(p)` / `segDe(...)` | externos | ramo e segmento (`privado`,`estetica`,`publico`) |
| `criadoEm` | ISO datetime | abertura da solicitação |

**Esteira de crédito**
| Campo | Tipo | Significado |
|---|---|---|
| `etapa` | id de etapa | passa por `normEtapa` (mapa de ids antigos, ver 4.4) |
| `entrouEtapa` | ISO | data de entrada na etapa atual (base do SLA; fallback `criadoEm`) |
| `historico` | `[{etapa, em}]` | passagem por etapas; o 1º item pode ser igual a `criadoEm` (ignorado na linha do tempo); usado também p/ achar a data de entrada em `gestao` |
| `checklist` | `{[etapaId]:{[índice]:bool}}` | marcações do checklist; `checklist.panalise[0]` e `[1]` são exigidas p/ sair de "Análise documental e financeira" (público) |
| `valor` | number | valor solicitado (crédito) / do contrato (público) |
| `prazo` | number (meses) | prazo solicitado |
| `justificativa` | string | texto da solicitação |
| `analista` | string | agente responsável pela análise (nome do membro da equipe) |
| `obs` | string | observações da análise de crédito |
| `limite` | number | limite aprovado (lido via `limiteDe(p)`, externo — em público é "valor do contrato") |
| `inicioValidade` | date `YYYY-MM-DD` | início da validade do crédito |
| `revisao` | date `YYYY-MM-DD` | fim da validade (próxima revisão) = início + 3 meses |
| `comprasPeriodo` | number | nº de compras no período de validade |
| `ultimaCompra` | date | última compra (alimenta "sem compras") |
| `garantia` | string | "Sem garantia" ou tipo |
| `rating` | `AA`..`H` | rating interno |
| `score` | number | score Serasa (só privado) |
| `pontualidade` | number % ou "" | pontualidade das vendas da empresa |
| `prazoMedio` | number dias | prazo médio praticado do cliente |
| `compraMedia`, `fatMensal` | number | compra média mensal e faturamento mensal (entradas da política de limite e do simulador) |
| `flagNeg` | bool | negativação (gatilho de revisão) |
| flags do farol `FLAGS_FAROL` (chaves externas) | bool | alertas do agente: negativação, dados inconsistentes, pedido fora da realidade, etc. |
| `cData`,`cReceita`,`cProtesto`,`cProcesso`,`cSocios` | data / string | data e resultado das 4 consultas obrigatórias (Receita, protestos, processos, sócios) |
| `fpTipo` | enum FONTES_PAG | fonte pagadora (privado) |
| `fpNome` | string | nome da fonte (operadora, convênio…) |
| `fpPrazo` | number dias | prazo em que o cliente recebe da fonte |
| `fontePagadora` | string | fonte pagadora (público) |
| `anexos` | `[{id,nome,tipo,etapa,em,tam}]` | documentos |
| (público) `pBase` | `"Estimado do edital"` \| `"Saldo de contrato ativo"` | base da solicitação |
| (público) `pVigFim` | date | fim da vigência do contrato |
| (público) `pSaldo` | number | saldo do contrato |
| (público) `capFin` | string | capacidade financeira do ente (classificada na análise) |
| (público) `perfilPag` | string | perfil de pagamento do ente |
| `comiteResp`, `comiteCargo`, `comiteParecer`, `comitePlano`, `comiteForma`, `comiteData` | strings/ISO | decisão da alçada/comitê: responsável, cargo, parecer técnico, plano e forma de pagamento aprovados, data |
| `contratoAtivo(p)` (externo) | | retorna `{ok, venc}` |

**Exposição/inadimplência (vêm da importação Winthor, ver 7)**
| Campo | Significado |
|---|---|
| `utilizado` | limite utilizado (R$) |
| `diasAtraso` | dias do atraso (maior) |
| `valorAtraso` | saldo vencido (R$) |
| `saldoAVencer` | saldo a vencer (R$) |
| `proxVenc`, `proxVencValor` | próximo vencimento (date) e valor |

**Cobrança (mesmo documento, prefixo `cob`)**
| Campo | Tipo | Significado |
|---|---|---|
| `cobEtapa` | id etapa cobrança | `cobEtapaDe(p)` (externo) deriva a etapa efetiva |
| `cobEntrou` | date | entrada na cobrança |
| `cobResp` | string | agente de cobrança |
| `cobHist` | `[{etapa,em}]` | histórico de etapas de cobrança |
| `cobAcoes` | `[{em, acao, etapa, resp}]` | ações da régua registradas como feitas |
| `cobCheck` | `{[etapaId]:{[idx]:bool}}` | checklist da etapa de cobrança; para preventiva, `cobCheck[prev5|prev1|venc0][0]` = lembrete enviado |
| `cobContatos` | `[{em, data, canal, retorno, pessoa, previsao, valor, feedback, resp}]` | contatos de cobrança; `retorno==="Pagou"` conta como pagamento; `previsao` = promessa de pagamento |
| `cobAcordo` | string | texto do acordo |
| `cobParcelas` | `[{n, valor, venc, pago, pagoEm}]` | parcelas do acordo |
| `cobRecLog` | `[{em, v}]` | log de valores recuperados |
| `valorRecuperado` | number | total recuperado (legado quando não há `cobRecLog`) |
| `valorBaixado` | number | valor baixado como perda |
| `cobBaixa` | `{status("pendente"/aprovada/recusada), valor, motivo, em, prop}` | proposta de baixa vigente |
| `cobBaixasLog` | `[{em, valor, motivo, prop, decEm, status, parecer, aprov, cargo}]` | histórico de baixas |
| `cobProxAcao`, `cobProxData` | string, date | próxima ação agendada |
| `cobObs` | string | observações da cobrança |
| `anuenciaEm`, `anuenciaResp` | ISO, string | carta de anuência enviada |
| `pubDocs` | `{liq, nf, ne, opData, op, fila}` | público: data da liquidação, nº NF, nº empenho, data da ordem de pagamento, nº OP, posição na fila |
| `nfs` | `[{nf, valor, ...}]` (outros campos externos) | público: notas fiscais; status via `statusNF(p,n)` (externo) |

**Contatos**
| Campo | Significado |
|---|---|
| `contatos` | `[{nome, area, funcao, tel, whats, email, status, obs, pref, atualizadoEm, atualizadoPor}]` |
| `contatosEm`, `contatosPor` | última atualização da ficha |
| `contatosLog` | `[{em, por, resumo}]`, mantém só os últimos 40 |
| legado: `finNome`, `finContato`, `finStatus`, `telefone`, `telefoneStatus`, `endereco` | espelham o contato principal (`finNome/finContato/finStatus` são reescritos ao salvar a ficha) |

### 1.3 Pedido acima do limite (`q`)
| Campo | Significado |
|---|---|
| `id`, `numero` | id e nº do pedido (Winthor) |
| `cliente`, `clienteId` | vínculo ao cliente (se sem `clienteId`, casa por nome) |
| `valor` | valor do pedido |
| `limite`, `utilizado` | limite e utilizado do cliente **na data do pedido** (fallback `limiteDe(cliente)`) |
| `atrasoDias` | dias de atraso do cliente (**atenção**: nome diferente de `diasAtraso` da proposta) |
| `etapa`, `entrouEtapa`, `criadoEm`, `historico` | como em propostas (SLA em **horas**) |
| `justificativa`, `vendedor`, `analista`, `obs` | texto do comercial, vendedor, agente, observação da análise |
| `libData`, `libResp`, `libCargo`, `libParecer`, `libPlano`, `libForma` | decisão da alçada |
| `decisao` | uma de DECISOES (4.5) |
| `bu` via `buDe("pedidos",q)` (externo) | BU |

### 1.4 Membro da equipe
`{nome, cargo ∈ CARGOS_EQ, sup (nome do superior), uid? (login vinculado)}`. Se não houver equipe cadastrada, é inferida dos nomes em `analista`/`cobResp` (cargo "Jurídico" se o nome casa `/jur[ií]dico/i`, senão "Agente de cobrança").

### 1.5 Anexo
`{id (asset), nome, tipo (lista TIPOS_ANX_*), etapa (etapa em que foi anexado), em (ISO), tam (bytes)}`.

### 1.6 Contato (ficha)
Ver 1.2. Enums em 4.7.

---

## 2. Parâmetros configuráveis (`REGRAS_PADRAO`)
Todos numéricos salvo `ratingCrit/ratingAlerta`. Edição: aba "Regras" (`#rgForm`) e aba Cobrança › Régua (`#rcForm`, chaves `COB_KEYS`). Botão "Restaurar padrão" em cada uma (a de Regras restaura tudo **exceto** COB_KEYS; a de cobrança restaura **só** COB_KEYS).

### 2.1 Criticidade de cliente
| Chave | Padrão | Unid. | Uso |
|---|---|---|---|
| `atrasoAlerta` | 1 | dias | alerta se `diasAtraso ≥` |
| `atrasoCrit` | 30 | dias | crítico se `diasAtraso ≥` |
| `pontAlerta` | 90 | % | alerta se pontualidade `<` |
| `pontCrit` | 80 | % | crítico se pontualidade `<` |
| `scoreAlerta` | 600 | pontos | alerta se score Serasa `<` |
| `scoreCrit` | 400 | pontos | crítico se score `<` |
| `usoAlerta` | 90 | % | alerta se utilizado/limite `≥` |
| `usoCrit` | 100 | % | crítico se uso `≥` |
| `prazoAlerta` | 60 | dias | alerta se prazo médio `>` |
| `prazoCrit` | 90 | dias | crítico se prazo médio `>` |
| `ratingAlerta` | "D" | rating | alerta se rating ≥ (D ou pior) |
| `ratingCrit` | "E" | rating | crítico se rating ≥ E |
| `alertasParaCritico` | 3 | nº | N alertas (sem nenhum crítico) viram crítico |
| `inadDias` | 1 | dias | etiqueta "Inadimplente · Empresa" a partir de N dias de atraso |
| `diasSemCompra` | 90 | dias | N dias sem compra → destino "Cadastro obsoleto" |

### 2.2 Régua de cobrança privada (dias corridos após vencimento)
| Chave | Padrão | Significado |
|---|---|---|
| `regLig` | 4 | D+4: ligação de cobrança ativa **e bloqueio de novos pedidos** |
| `regNotif` | 7 | D+7: notificação formal com aviso de protesto |
| `regNeg` | 10 | D+10: envio ao cartório, negativação e bloqueio total |
| `regProp` | 20 | D+20: negociação pós-protesto (parcelamento, carta de anuência) |
| `regExtra` | 30 | D+30: cobrança extrajudicial (assessoria) |
| `regJur` | 45 | D+45: início da cobrança judicial (dossiê ao Jurídico) |
| `regJurMax` | 60 | D+60: prazo máximo para ajuizar a ação |
| `quebraDias` | 5 | dias de atraso de parcela de acordo que quebram o acordo |
| `alcBaixa1` | 10000 | R$ até o qual baixa como perda é aprovada por Gerente financeiro |
| `alcBaixa2` | 100000 | R$ até o qual é Diretor financeiro; acima: Diretoria/Comitê |

Validação ao salvar (`#rcForm`): os 6 dias `regLig, regNotif, regNeg, regProp, regExtra, regJur` devem ser **todos ≥ 2 e distintos entre si** ("a partir do D+2"; D+1 é fixo para "pagamento não identificado"); `regJurMax ≥ regJur`. Valor vazio/inválido vira 0.

### 2.3 Régua pública (dias **úteis** por nota fiscal)
| Chave | Padrão | Significado |
|---|---|---|
| `rpConf` | 3 | dias úteis após o protocolo para confirmar recebimento e atesto |
| `rpL1` / `rpL2` / `rpL3` | 1 / 5 / 10 | liquidação vencida: e-mail D+1, ligação D+5, ofício D+10 |
| `rpG1` | 1 | pagamento vencido: e-mail D+1 |
| `rpG2` | 5 | posição na fila (pedido LAI) D+5 |
| `rpG3` | 15 | ligação D+15 |
| `rpG4` | 30 | ofício D+30 (na tabela de etapas: "Pagamento D+30 ou liquidação D+10" = etapa Negociação) |
| `rpG5` | 90 | jurídico avalia ação D+90 (decisão do jurídico) |
| `pequenoValor` | 65492.11 | R$ limite de "pequeno valor" (art. 75, II Lei 14.133, Decreto 12.807/2025): prazos pela metade. **Sem campo de edição neste trecho** |
| (fixo no texto) | 2 meses | "2 meses da emissão da NF": requerimento e art. 137 (suspensão/extinção). Não é parâmetro |

### 2.4 PDD (provisão) — % sobre o saldo de cada faixa do aging
| Chave | Padrão | Faixa |
|---|---|---|
| `pdd0` | 0,5 | a vencer |
| `pdd1` | 3 | 1–30 dias |
| `pdd2` | 10 | 31–60 |
| `pdd3` | 30 | 61–90 |
| `pdd4` | 50 | 91–180 |
| `pdd5` | 100 | >180 |

### 2.5 Encargos sobre saldo vencido
| Chave | Padrão | Unid. |
|---|---|---|
| `multaPriv` | 2 | % (única) |
| `jurosPriv` | 1 | % ao mês |
| `multaPub` | 0 | % |
| `jurosPub` | 0,5 | % ao mês |
| `correcao` | 0,4 | % ao mês (índice do contrato, ex.: IPCA) |
`encargos(p).tot` (externo) calcula o valor atualizado exibido no cartão/ficha.

### 2.6 Política de limite e motor de crédito (privado)
| Chave | Padrão | Unid. | Uso |
|---|---|---|---|
| `polFolga` | 1,2 | fator | limite sugerido = compra média mensal × prazo médio ÷ 30 × folga |
| `polNovoPct` | 10 | % fat. mensal | limite de cliente sem histórico |
| `polTetoPct` | 30 | % fat. mensal | teto p/ cliente **sem score** |
| `polPLPct` | 10 | % do patrimônio líquido | teto pelo PL, quando informado |
| `pesoSerasa` | 60 | % | peso do Serasa no score interno; restante (40%) = comportamento (pontualidade, atraso, relacionamento). Cliente novo sem histórico: 100% Serasa |
| `concMax` | 10 | % | nenhum cliente/grupo > N% da carteira de limites sem comitê |
| `docF1` | 100000 | R$ | até: cadastro, consultas e score |
| `docF2` | 500000 | R$ | até: + faturamento comprovado; acima: + balanço e DRE |
| `consValid` | 30 | dias | validade das consultas obrigatórias |
| `ctcValid` | 180 | dias | validade da ficha de contatos |
| `fraudeMeses` | 12 | meses | CNPJ com menos de N meses = sinal de fraude |
| `fraudePct` | 50 | % fat. mensal | cliente novo pedindo > N% do faturamento mensal = sinal de fraude |

### 2.7 Flexibilização do limite (privado)
| Chave | Padrão | Uso |
|---|---|---|
| `flexMin` | 20 | % acima do limite permitido p/ farol 0 ("risco mínimo") |
| `flexBaixo` | 10 | % p/ farol 1 ("risco baixo") |
| `flexMetaTaxa` | 30 | meta: taxa de flexibilização ≤ N% dos pedidos decididos |
| `flexMetaConf` | 90 | meta: ≥ N% das liberações dentro da regra |

### 2.8 Metas do ano
| Chave | Padrão | Unid. |
|---|---|---|
| `metaTempo` | 9 | dias (tempo médio de análise, máx.) |
| `metaSla` | 85 | % (SLA cumprido, mín.) |
| `metaAprMin` / `metaAprMax` | 60 / 85 | % (faixa de aprovação) |
| `metaInad` | 5 | % (índice de inadimplência, máx.) |
| `metaV90` | 2 | % da carteira (vencido >90d, máx.) |
| `metaPdd` | 3 | % da carteira (máx.) |
| `metaRecup` | 80 | % (recuperado ÷ gerado, mín.) |
| `metaConv` | 60 | % (recebido ÷ cobrado por agente, mín.) |
| `metaProm` | 70 | % (promessas cumpridas, mín.) |
Obs.: `META_SLA` (const usada em performance por analista) é externo; provavelmente = `metaSla/100`.

### 2.9 Regras de formulário
- `rg_*` com `inputmode="numeric/decimal"`; conversão `num()` (externo, aceita vírgula). Rating via `<select>` RATINGS.
- Validação em Regras: `pontAlerta ≥ pontCrit`, `scoreAlerta ≥ scoreCrit`, `usoAlerta ≤ usoCrit`, `prazoAlerta ≤ prazoCrit`, `atrasoAlerta ≤ atrasoCrit`, `idx(ratingAlerta) ≤ idx(ratingCrit)`; senão "O limite de alerta precisa ser mais brando que o crítico."
- `REGRAS_DEF` (6 indicadores da tela): 
  | Indicador | Unid. | Direção | chave crítico | chave alerta |
  |---|---|---|---|---|
  | Dias de atraso | dias | `>=` | atrasoCrit | atrasoAlerta |
  | Pontualidade das nossas vendas | % | `<` | pontCrit | pontAlerta |
  | Score Serasa | pontos | `<` | scoreCrit | scoreAlerta |
  | Uso do limite de crédito | % | `>=` | usoCrit | usoAlerta |
  | Prazo médio do cliente | dias | `>` | prazoCrit | prazoAlerta |
  | Rating de risco | — | rating (≥ na ordem) | ratingCrit | ratingAlerta |

---

## 3. Regras de negócio e cálculos

### 3.1 Constantes e enumerações auxiliares
- `VALIDADE_MESES = 3`; `COMPRAS_RECORRENTES = 2` (**constantes fixas, não configuráveis**).
- `RATINGS = [AA, A, B, C, D, E, F, G, H]` (índice 0 = melhor). `ratingClass`: idx ≤2 (AA,A,B) = ok; 3–4 (C,D) = médio; ≥5 = ruim; ausente = neutro.
- `PRODUTOS` (lista de 9, **resíduo de protótipo de banco**; não usado neste trecho): Capital de giro, Antecipação de recebíveis, Conta garantida, Limite de crédito comercial, CDC veículo, Crédito pessoal, Consignado, Financiamento imobiliário, Cartão empresarial.
- Moeda: BRL sem casas; compacto `1,2 mi`; % sem casas.

### 3.2 Tempo / SLA
```
decorrido(p, unid) = max(0, floor((agora - (entrouEtapa||criadoEm)) / (unid==="h"?3600000:86400000)))   // 0 se data inválida
slaState: se etapa sem sla (null) -> null
          d = decorrido; d > sla -> "bad"; d == sla -> "warn"; d < sla -> "ok"
slaTxt: "{decorrido}{u} / {sla}{u}"  (u = "h" ou "d")
```
Sem calendário de dias úteis no SLA (dias corridos). Pedidos em horas.
SLA_TOTAL (para KPI e evolução) = soma de `sla` das etapas do setor, exceto finais e `reanalise` → **privado: 1+3+3+2+2+1 = 12 dias; público: 1+8+2 = 11 dias** (a tela de metas fala "12 dias" fixo no texto).

### 3.3 Alçadas
**Proposta privada** `alcadaProp(v)` (v = `max(valor, limiteDe)`):
| Valor | Alçada |
|---|---|
| ≤ 50.000 | Supervisor |
| ≤ 500.000 | Gerente |
| ≤ 2.000.000 | Comitê regional |
| > 2.000.000 | Comitê executivo |

**Proposta pública** `alcadaPub(v)`: ≤100.000 Supervisor; ≤1.000.000 Gerente; >1.000.000 Diretoria.
(Tabela "Alçadas" na tela de Regras de Negócio é texto fixo: 50k Sup/Sup; 50–100k Ger/Sup; 100–500k Ger/Ger; 500k–1M Com.regional/Ger; 1–2M Com.regional/Diretoria; >2M Com.executivo/Diretoria — consistente com as funções.)

**Pedido acima do limite** `alcadaExc(q)`: `excesso(q)`:
```
lim=+limite, uti=+utilizado, val=+valor
exc = max(0, uti + val - lim);  disp = max(0, lim - uti)
pct = lim ? exc/lim : (exc ? 1 : 0)
```
Ordem de avaliação:
1. exc ≤ 0 → "Dentro do limite" (pedido cabe)
2. `atrasoDias` > 15 → **Comitê de crédito**
3. pct ≤ 10% **e** exc ≤ R$ 20.000 → Supervisor
4. pct ≤ 25% → Gerente
5. pct ≤ 50% → Diretor financeiro
6. senão → Comitê de crédito
(10%, 20.000, 25%, 50%, 15 dias são **fixos no código**, não parametrizados.)
`critico(q)` = alçada ∈ {Diretor financeiro, Comitê de crédito} (CRITICAS) → "liberações críticas".

**Baixa como perda**: `alcadaBaixa(valor)` (externo) usa `alcBaixa1/2`: ≤ alcBaixa1 Gerente financeiro; ≤ alcBaixa2 Diretor financeiro; acima Diretoria/Comitê. Regras textuais: quem propõe a baixa não pode aprová-la; baixa só após esgotar vias de cobrança e com parecer do Jurídico.

### 3.4 Validade do crédito, reanálise e obsolescência
```
somaMeses(iso, m): data (iso ou hoje) + m meses -> "YYYY-MM-DD"
diasParaVencer(c) = round((revisao - hoje)/dia) ; null se sem revisao
vencido(c)  = diasParaVencer < 0
recorrente(c) = comprasPeriodo >= 2
diasSemCompra(c): ref = ultimaCompra || inicioValidade || data de entrada em "gestao" no historico; null se nenhuma; max(0, hoje - ref) em dias
semCompra(c) = diasSemCompra >= (REGRAS.diasSemCompra||90)
paraEncaminhar(c) = vencido(c) || semCompra(c)
destinoVencimento(c) = semCompra(c) ? "obsoleto" : (recorrente(c) ? "reanalise" : "obsoleto")
```
Texto: crédito válido 3 meses a partir da liberação/renovação. No vencimento: recorrente (≥2 compras no período) → Reanálise; sem compras recorrentes → Cadastro obsoleto; independentemente, ≥ `diasSemCompra` dias sem compra → obsoleto. `motivoEnc` monta o texto do motivo ("Sem compras há N dias (última em dd/mm/aaaa)" ou "Validade dd/mm/aaaa · N compra(s) no período").
A movimentação em si (executar o encaminhamento) não está neste trecho (externo); aqui só se calcula quem deve ser encaminhado (alerta no painel gerencial: "N cliente(s) com validade vencida ou sem compras a encaminhar").

### 3.5 Criticidade do cliente `criticidade(p)` → `{nivel: critico|alerta|ok, motivos:[{sev,t}]}`
Cada sinal gera `crit` ou `alerta`:
1. Atraso: `atr=diasAtraso`; se atr>0 e atr ≥ atrasoCrit → crit; senão se atr>0 e ≥ atrasoAlerta → alerta.
2. Pontualidade (só se preenchida e numérica): v < pontCrit → crit; v < pontAlerta → alerta.
3. Score Serasa (**só setor privado**, só se score ≠ 0): v < scoreCrit → crit; v < scoreAlerta → alerta.
4. Farol: `farolDe(p)` (externo) devolve `{f, i, fl[], rebaixado}`; se há alertas (`fl.length`) → `crit` se `i ≥ 3` (farol índice 3 ou pior), senão alerta. Texto "Farol rebaixado para X (alertas)".
5. Uso do limite: `lim=limiteDe(p)`, `uti=utilizado`; só se ambos > 0; u=uti/lim×100; ≥ usoCrit → crit; ≥ usoAlerta → alerta.
6. Prazo médio (se preenchido): > prazoCrit crit; > prazoAlerta alerta.
7. Rating (se válido): idx ≥ idx(ratingCrit) crit; idx ≥ idx(ratingAlerta) alerta.
8. Acúmulo: se **nenhum** crit e nº de alertas ≥ `alertasParaCritico` → insere sinal `crit` "N sinais de alerta ao mesmo tempo".
Nível final: algum crit → "critico"; senão algum sinal → "alerta"; senão "ok". Exibição: etiqueta Crítico/Alerta (tooltip com motivos) ou "Normal".

### 3.6 Inadimplência
```
inadInterno(p): d=diasAtraso, v=valorAtraso; se d>0 e d >= (inadDias||1) -> {d,v} senão null   // etiqueta "Inadimplente · Empresa"
indiceInad(p) = valorAtraso / (valorAtraso + saldoAVencer); se total=0: (valorAtraso? 1 : null)
classeIdx(x): null->"na"; 0->"ok"; <=0.10->"mid"; senão "bad"
```
`inadTag` adiciona também `bloqTag(p)` (externo; etiqueta de bloqueio da régua).

### 3.7 Farol (semáforo) e política de limite — o que aparece neste trecho
(Definições `FAROL`, `farolDe`, `limitePolitica`, `motorPub`, `RAT_PUB` são externas; abaixo, o que o trecho revela.)
- 6 classes (`FAROL[0..5]`), campos usados: `n` (nome), `cor`, `soft`, `min/max` (faixa de score; `min<0` = sem faixa/sem crédito), `perfil`, `lim` (texto de diretriz), `prazo` (texto), `extra`, `renda` ("% do faturamento"), `fmin/fmax` (percentual do limite calculado; `fmax` falsy = "Sem crédito · somente à vista"; `fmin===fmax` = valor único; `fmin` falsy = "até X%"), `prazoMax` (dias máx. da faixa), `teto` (% do faturamento), `atr` (faixa de atraso).
- Inadimplência **esperada** por faixa (fixa na tela): `[0.01, 0.02, 0.05, 0.10, 0.20, null]` (até 1%, 2%, 5%, 10%, 20%, —; última faixa sem crédito a prazo).
- Regra: **classe = pior entre a faixa de score e a faixa de atraso; cada alerta rebaixa uma classe** ("Política v5.2"). Alertas: negativação, dados inconsistentes, pedido fora da realidade (FLAGS_FAROL), resultado negativo nas consultas obrigatórias (Receita, protestos, processos, sócios), sinais de fraude (CNPJ < `fraudeMeses` meses; cliente novo pedindo > `fraudePct`% do faturamento mensal), análise financeira ruim (liquidez corrente < 1, dívida > 3× EBITDA, patrimônio líquido negativo).
- Recalibração trimestral (texto): "A calibração é feita a cada trimestre na aba Semáforo de crédito".
- **Limite sugerido** (política): `compraMedia × prazoMedio ÷ 30 × polFolga`; sem histórico: `polNovoPct`% do faturamento mensal; sem score: teto `polTetoPct`% do fat.; com score: aplica `fmin..fmax` do farol sobre o cálculo e teto % do faturamento por faixa; limite pelo PL ≤ `polPLPct`% do patrimônio líquido (quando informado). `limitePolitica(t)` devolve `{v (máx.), vmin, como (texto)}`.
- Simulador (aba Farol): entradas `score` (vazio permitido), `prazoMedio` (default 30), `compraMedia`, `fatMensal` + checkboxes de FLAGS_FAROL; saída: farol, faixa de limite ("até X" ou "min a max" ou "Sem crédito"), explicação e aviso "Prazo de N dias acima do máximo da faixa" se `prazoMedio > prazoMax`.
- Validação do farol (aba): por faixa agrega carteira privada ativa (exclui recusada/obsoleto), `T=V+A`, `ix=V/T`; classifica "Fora da ordem" (índice maior que o da próxima faixa com carteira), "Acima do esperado: revisar o corte" (ix > esperado), "Dentro do esperado", "Sem carteira", "Faixa sem crédito a prazo". Conta faixas a revisar.
- Aba Farol: KPIs por classe (qtd, limite, "score a-b"), "Sem score", "rebaixados"; distribuição de limite por classe + saldo vencido por classe; lista de clientes (privados, exclui recusada/obsoleto), ordenados por farol pior e depois por maior valor vencido; compara limite atual × limite sugerido ("Acima do farol"/"Dentro do farol"/"Sem cálculo"). Filtro `#fFarol`: classe i / "sem" / "reb".
- Público: `motorPub(p)` → `{pts (0–100), rt:{id,n,...}}`.

**Metodologia de risco do órgão público (texto da tela, pontos somam 0–100):**
| Critério | Pontos |
|---|---|
| CAPAG (Tesouro Nacional) | A 30 · B 22 · C 10 · D 0 · não divulgada 12 · União 30 |
| Despesa com pessoal (RGF) | até 90% do limite: 15 · até 95%: 10 · até o limite: 5 · acima: 0 (limites: municípios 54%, estados 49%, União 37,9% da RCL) |
| CAUC | regular 10 · com pendência 3 · não consultado 5 |
| Fonte do recurso | SUS fundo a fundo 15 · outra vinculada 10 · recursos próprios 6 |
| Histórico de pagamento | pontual 20 · atrasos eventuais 12 · atrasos frequentes 4 · sem histórico 10 |
| Empenho prévio e contrato vigente | 5 + 5 (pelo edital: 5, verificado na assinatura) |
| Fim de mandato (LRF art. 42) | −5 nos dois últimos quadrimestres |
Rating público (`RAT_PUB`, 4 classes; ids tipo "P1…P4" — a tela cita "mínimo P3"): notas 80–100, 60–79, 40–59, 0–39; "Exposição máxima = fat × base" (`r.fat`, % da base) e condição `r.cond` (textos externos). **Travas:** CAPAG D ou despesa com pessoal acima do limite levam no mínimo a P3. **Base:** estimado do edital → pré-aprovação; fornecimento só com saldo de contrato ativo. "Sem empenho, sem entrega" (Lei 4.320/64 art. 60).

### 3.8 Flexibilização do limite `flexDe(p)` (só privado, exige limite > 0)
```
fr = farolDe(p)
pct = fr ? (fr.i==0 ? flexMin : fr.i==1 ? flexBaixo : 0) : 0         // % do limite aprovado
motivos (cada um BLOQUEIA a flexibilização):
  - sem farol ("sem score: farol não aplicado") ou pct=0 ("farol X não permite flexibilizar")
  - diasAtraso>0 ou valorAtraso>0 ("títulos vencidos em aberto")
  - pontualidade preenchida e < pontAlerta (90)
  - bloqueado(p) (bloqueio da régua)
  - vencido(p) (validade do crédito)
  - fr.rebaixado (farol rebaixado por alerta)
flex = motivos.length ? 0 : round(lim*pct/100/1000)*1000      // arredonda a R$1.000
se flex>0: c=concentracao(p, lim+flex); se c && lim+flex > c.disp:
     flex = max(0, floor((c.disp - lim)/1000)*1000)  e motivo "limitado pelo teto de concMax% de concentração"
retorna {lim, uti, pct, flex, teto = lim+flex, mot, possivel = flex>0, fr}
```
Uso na tela `flexHTML(p, pedido)`: `uso = utilizado + pedido`; status `ok` (uso ≤ lim) / `flex` (≤ teto: liberar na alçada, sem comitê) / `acima` (só comitê de crédito; mensagem diferente se possível ou não). Medidor semicircular (`gaugeSVG`) verde = limite, amarelo = flexibilização, vermelho = acima do teto.
Regra completa de texto: "risco mínimo até +flexMin% e risco baixo até +flexBaixo% do limite aprovado, sem títulos vencidos, pontualidade ≥ pontAlerta, sem bloqueio e com validade em dia. Dentro da flexibilização é liberado na alçada; acima, só com comitê."

### 3.9 Aging, PDD e foto mensal
Faixas `FX_AG`: A vencer; 1–30; 31–60; 61–90; 91–180; >180 (181..∞).
```
agingDe(cs): f[0] = soma saldoAVencer; para cada p com valorAtraso>0: faixa por diasAtraso (se não casar -> faixa 1) soma valorAtraso em f[i]; q++ 
V = f1..f5 ; T = V+f0 ; v90 = f4+f5 ; idx = V/T ; q = nº clientes com vencido
faixaAtual(p): vencido>0 -> faixa por dias (mín. 1); senão saldoAVencer>0 -> 0; senão -1
pddDe(f) (externo): soma f[i] * pddI% (pdd0..pdd5)
```
Linha de aging por grupo (BU, esfera, etc.) mostra: barra empilhada, 6 faixas com % do total, vencido (e nº de clientes), índice (classe cor), >90d (e % do vencido), PDD (e % da carteira). Resumo: "Maior índice" e "carteira mais envelhecida" (maior v90/V).
**Foto mensal** `fotoAging()`: para cada proposta não recusada com faixa ≥0 grava `c[id]=[faixa, faixa? valorAtraso : saldoAVencer]`. `tirarFoto()` roda 1 vez por sessão se `!localMode && !readOnly && snapsOk && ready`; id do doc = mês atual (`mesDe`); **não regrava** se o mês já existe em `SNAPS`.

### 3.10 Eventos de inadimplência (base do "recuperado ÷ gerado")
`eventosInad(cs)` para cada cliente:
- Gerado (`t:"g"`): se `valorAtraso>0 && diasAtraso>0` → data = hoje − diasAtraso, valor = valorAtraso (aproximação: considera todo o vencido gerado na data do atraso mais antigo); ou, se `cobEtapa==="regularizado"`, tem `cobHist[0]` e `valorRecuperado>0` → data do 1º item do cobHist, valor = valorRecuperado.
- Recuperado (`t:"r"`): cada `cobRecLog` `{em, v}`; se não há log mas `valorRecuperado>0` → data do último `cobHist` com etapa `regularizado`.

### 3.11 Painel gerencial — indicadores (função `renderGerencial(props, peds)`, recorte por filtros `fState`: setor, mês, BU, ramo)
Conjuntos: `cart` = etapa `gestao`; `ativosCli` = não `recusada` e não `obsoleto`; `expoCli` = `gestao`+`reanalise`; `aprovados` = `gestao`,`reanalise`,`obsoleto`; `ATIVAS_PROP` = etapas sem `final` (inclui gestao/reanalise!).
**12 indicadores executivos (numerados 01–10 visíveis; 11–12 não presentes neste trecho; 08 e 09 usados):**
| # | Indicador | Fórmula | Cor/limiar |
|---|---|---|---|
| 01 | Tempo médio de análise | média de `decisao("propostas",p).ms/DIA` (dias) das decididas | ok se ≤ 0,75×SLA_TOTAL; ruim se ≥ SLA_TOTAL |
| 02 | SLA de aprovação | decididas com tempo ≤ SLA_TOTAL ÷ decididas | ok ≥ 85%; ruim ≤ 60%. Sub: nº em andamento fora do SLA |
| 03 | Taxa de aprovação | apr/(apr+rec): apr = etapa gestao/reanalise/obsoleto; rec = recusada | sem cor |
| 04 | Crédito concedido | soma `limiteDe` dos aprovados | |
| 05 | Exposição total | soma `utilizado` de `expoCli`; separa público (setor=publico) | |
| 06 | Utilização do limite | exposição ÷ soma limites (expoCli) | ok ≤70%; ruim ≥90% |
| 07 | Inadimplência (saldo vencido) | soma valorAtraso ativos; % >90d = venc90/vencAll; índice = venc/(venc+aV) da carteira `gestao` | ruim se idx>10% |
| 08 | Concentração por grupo | maior grupo ÷ limite total; HHI = Σ(share%)² por grupo (grupo = `p.grupo` ou id) | ruim ≥2500; alerta ≥1500 |
| 09 | PMR | Σ(prazoMedio×utilizado)/Σutilizado (fallback: média simples dos prazos) | ok ≤45; ruim ≥60 |
| 10 | Revisão de limites vencidos | revisados/(revisados+pendentes): revisados = tem no `historico` etapa reanalise/obsoleto; pendentes = etapa gestao com validade vencida | ok ≥90%; ruim ≤60% |
`tone(x,good,bad,inv)`: inv=true (menor melhor): ≤good ok, ≥bad ruim, senão warn; inv=false: ≥good ok, ≤bad ruim.
**Bloco analisado/deferido/negado**: soma `valor` de deferidos (gestao/reanalise/obsoleto) e negados (recusada); "Em análise" = ATIVAS_PROP; % deferido = vD/(vD+vN); por BU (inclui "Sem BU").
**Pedidos**: mesmo bloco (liberado/recusado/ATIVAS_PED); "excesso liberado" = Σexc dos liberados.
**Flexibilização (gauges)**: `taxa = liberados / decididos`(meta ≤ flexMetaTaxa); `excM = média(pct de excesso dos liberados)` (ref ≤ flexMin); `conf = liberados cujo uti+val ≤ flexDe(cliente c/ limite do pedido).teto ÷ liberados` (meta ≥ flexMetaConf); `inadF = clientes dos liberados com valorAtraso>0 ÷ clientes` (meta ≤ metaInad).
**Funil**: por etapa do setor (exclui finais, mantém `gestao`): qtd, valor (limite em gestao; `valor` nas demais), nº fora do SLA.
**Saúde da carteira** `saude(c)` (externo) → `nivel ∈ ok|atencao|risco`, `sinais[]`.
**Por BU**: clientes, limite, utilizado (% do total), vencido, índice, críticos, em análise.
**Pedidos**: retidos agora (qtd e R$), fora do SLA, liberados, recusados, liberações críticas, tempo médio de decisão (horas).
**Alertas**: críticos (com R$ utilizado), inadimplentes com a empresa, fora do SLA na esteira, comitê aguardando decisão (etapa `comite` sem `comiteResp` e `comiteParecer`), a encaminhar (validade vencida/sem compras), pedidos parados além do SLA.
**Risco gerado pela concessão**: universo = aprovados; `emRisco = saude=risco || critico || diasAtraso>30`; `baixoRisco = rating ≤ B (idx ≤ idx("B")) senão (score ≥ 600)`; **"Risco não previsto" (erro)** = emRisco ∧ baixoRisco; **"Risco aceito"** = emRisco ∧ ¬baixoRisco (rating C ou pior). KPIs: crédito concedido a clientes de risco, exposição em risco, % de erros sobre aprovações, por rating (inclui "s/ rating"), por agente analista (erros/total), lista detalhada.
**Performance por analista** `perfLinhas(props,peds)` (externo) produz `{nome, ativas, fora, decididas, apr, ciclo, sla, vol, ped}`; somam carteira, saúde, críticos. Barra SLA verde se `sla ≥ META_SLA`.
**Concentração Top 10**: ordena `cart` por limite; maior cliente %, Top5, Top10, HHI de clientes (<1500 pulverizada, 1500–2499 moderada, ≥2500 alta); tabela com % individual e acumulado, uso %, vencido, flag.

### 3.12 Evolução no ano (`renderEvolucao`)
Filtros: ano (a partir de `criadoEm` + ano atual), segmento `"" | privado | estetica | publico`; BU; agente. Meses = 12; meses futuros = null.
Por mês `m`:
- decididas no mês: `decisao(p)` (externo) → data = `hist(p)[0].t + d.ms`; `def` = decisão com `d.etapa==="gestao"`; `neg` = demais.
- `tempo` = média ms/DIA; `sla` = % com ms/DIA ≤ SLA_TOTAL do setor; `apr` = def/total ×100; `conc` = Σ limite dos deferidos (0 se há decisões e nenhuma deferida); `sol` = solicitações criadas no mês.
- `g`/`r` = Σ eventos gerado/recuperado do mês; `rec = r/g×100`.
- Posição de carteira `pos(m)`: mês corrente → `agingDe` atual (fonte "atual"); senão foto `SNAPS` do mês (filtra por segmento/BU/agente; "foto"); senão fechamento manual `FECH` (só se sem filtros: `!st && !bu && !agenteAtivo`; "manual"). `inad = V/T`, `v90 = v90/T`, `pdd = pdd/T` (×100).
8 indicadores (C=concessão, I=inadimplência): tempo(max metaTempo), sla(min metaSla), apr(faixa metaAprMin–metaAprMax), conc(info, soma no ano), inad(max metaInad), v90(max metaV90), pdd(max metaPdd), rec(min metaRecup). Cartão mostra último valor, chip "Na meta/Fora", média no ano (soma para `conc`), nº de meses na meta, mini-gráfico de barras com linha(s) de meta.
Lista de fechamentos manuais `FECH` (carteira, vencido, >90d, PDD).

### 3.13 Cobrança — o que o trecho define
- `prevStage(p)` / `diasAteVenc(p)` / `cobEtapaDe(p)` / `acaoRegua(p)` / `acordoInfo(p)` / `recebivelStatus(p)` / `anuenciaPendente(p)` / `probInad(p)` / `ultimoContato` / `promessaStatus` / `reguaFaixas()` / `reguaPubCliente` / `statusNF` / `naCobranca` / `jurChipCob`: **todos externos**.
- Cartão de cobrança (Kanban): preventivo (cartPrev) mostra valor do próximo vencimento, "vence hoje/amanhã/em N dias", "Lembrete enviado/pendente" (`cobCheck[stage][0]`), "% chance de atraso" (`probInad(p).pr`: ≥40% ruim, ≥15% médio). Normal: valor vencido (ou baixado se `baixado`), chip dias de atraso (>90 ruim, >30 médio), anuência, ação da régua (feita/a fazer), acordo (N/n pagas, quebrado), baixa aguardando alçada, status de recebível, "atualizado (multa, juros e correção)" = `encargos(p).tot`, último contato e promessa vencida, próxima ação (atrasada se `cobProxData < hoje`). Cartão arrastável (`draggable` se não readOnly) = movimentação manual entre colunas.
- **Régua privada (descritiva na tela)**: fases (início em dias): Preventiva D-5; Ativa D+1; Protesto e negociação D+`regNeg`; Extrajudicial D+`regExtra`; Judicial D+`regJur` (até D+`regJurMax`).
  | Fase | Faixa | Itens | Recuperação |
  |---|---|---|---|
  | 1 Cobrança preventiva | D-5 a D+0 | Lembrete por WhatsApp; E-mail de vencimento; Confirmação da nota e do boleto | Alta |
  | 2 Cobrança ativa | D+1 a D+(regNeg-1) | E-mail e ligação: pagamento não identificado; Bloqueio de novos pedidos (D+regLig); Notificação formal com aviso de protesto (D+regNotif) | Boa |
  | 3 Protesto e negociação | D+regNeg a D+(regExtra-1) | Protesto em cartório e negativação; Bloqueio total do crédito; Negociação pós-protesto (D+regProp) | Média |
  | 4 Cobrança extrajudicial | D+regExtra a D+(regJur-1) | Assessoria de cobrança; Notificação extrajudicial; Proposta final | Baixa |
  | 5 Cobrança judicial | D+regJur a D+regJurMax | Dossiê ao Jurídico; Contato amigável do Jurídico; Ação ajuizada até D+regJurMax | Judicial |
- **Cronograma por dia** (lista `L`, ordenada por dia; entradas condicionais):
  | Dia | Canal | Ação | Detalhe |
  |---|---|---|---|
  | D-5 | WhatsApp, e-mail | Lembrete preventivo | Boleto/PIX e confirmação da nota |
  | D-1 | WhatsApp | Confirmar programação | Contato amigável |
  | D+0 | e-mail | Aviso de vencimento | Formas de pagamento |
  | D+1 | e-mail | Pagamento não identificado | 2ª via e pedido de comprovante |
  | D+2 | ligação | Confirmar pagamento | Contato humano |
  | D+regLig | ligação | Cobrança ativa | Compromisso de pagamento · bloqueio de pedidos |
  | D+regLig+1 | WhatsApp | Entender o atraso | Negociação simples (omitida se ≥ regNotif) |
  | D+regNotif | e-mail | Notificação formal | Aviso de protesto em D+regNeg |
  | D+regNeg | cartório | Protesto em cartório | Negativação e bloqueio total |
  | D+regNeg+5 | WhatsApp | Contato pós-protesto | Evitar medidas maiores (omitida se ≥ regProp) |
  | D+regProp | ligação | Negociação estruturada | Parcelamento e carta de anuência |
  | D+regExtra | assessoria, e-mail | Notificação extrajudicial | Prazo final antes da ação |
  | round((regExtra+regJur)/2) | ligação | Última negociação | Consequência: ação judicial (omitida se ≤ regExtra ou ≥ regJur) |
  | D+regJur | jurídico | Contato amigável do Jurídico | Última tentativa antes da ação |
  | D+regJurMax | jurídico | Ação ajuizada | Prazo máximo da régua (omitida se regJurMax ≤ regJur) |
- **Tabela de etapas privadas** (`COB_PRIV`, ids externos; vistos: `prev5, prev1, venc0, r1, r5, r30` + chaves de `reguaFaixas()` incl. `rneg`, `rext`, `juridico`): colunas Prazo | Etapa | Checklist | Saída | Responsável. Responsáveis: r5 "Financeiro + Comercial"; rneg "Financeiro + Gerência"; rext "Financeiro (notificação) + assessoria"; juridico "Jurídico"; demais "Financeiro (Cobrança)". Marcadores: r5 "Bloqueio de novos pedidos"; r30 "Protesto e bloqueio total"; juridico "Ação até D+regJurMax". Linhas fixas extras:
  - **Após a quitação — Carta de anuência**: se houve protesto, enviar carta ao cliente, excluir negativação e retirar bloqueio; em até **5 dias úteis** após a compensação; cliente apresenta a carta ao cartório. Resp.: Financeiro (Cobrança).
  - **A qualquer momento — Em negociação / Acordo**: acordo por termo, parcelas geradas no cartão; durante o acordo o cliente sai da régua; parcela com > `quebraDias` dias de atraso quebra o acordo e o cliente volta à régua. Resp.: Financeiro + Gerência.
- **Régua pública** (`COB_PUB`, ids vistos: `nfprot, nfliq, nfpag, negociacao, acordo, juridico, regularizado, baixado`) — prazos exibidos: nfprot "Protocolo +rpConf dia(s) úteis"; nfliq "Liquidação vencida D+rpL1 · D+rpL2 · D+rpL3"; nfpag "Pagamento vencido D+rpG1 · D+rpG2 · D+rpG3"; negociacao "Pagamento D+rpG4 ou liquidação D+rpL3"; acordo "2 meses da emissão da NF"; juridico "Pagamento D+rpG5 (decisão do jurídico)"; regularizado/baixado "—". O formulário descreve: antes do prazo confirmar recebimento/atesto; liquidação vencida e-mail D+1 / ligação D+5 / ofício D+10; pagamento vencido e-mail D+1 / posição na fila (LAI) D+5 / ligação D+15 / ofício D+30 / jurídico avalia ação D+90 / 2 meses da emissão: requerimento e art. 137.
  Checklists e saídas de `COB_PRIV`/`COB_PUB` **não estão neste trecho** (externos).
- **Regras de bloqueio e liberação (texto fixo)**: D+regLig: novos pedidos bloqueados; liberação só por exceção com responsável e parecer registrados. D+regNeg: título ao cartório, negativação, bloqueio total. Desbloqueio após compensação do pagamento ou acordo assinado com a 1ª parcela paga. Comercial não fatura para cliente bloqueado sem liberação formal do Financeiro. Carta de anuência e exclusão da negativação em até 5 dias úteis.
- **Mensagens**: `modeloEmail(null, etapaId)` (externo) → `{assunto, corpo, whats}`; modelos para todas as etapas privadas e `anuencia`; etapa sem WhatsApp: "comunicação apenas formal".
- **Metas de cobrança por agente**: `metaConv` (recebido÷cobrado), `metaProm` (promessas cumpridas).
- **Promessa cumprida** (`promSt` em eventosCliente): para contato com `previsao`: início = `data`/`em`; fim = previsao + 3 dias; se existe pagamento (recuperado, parcela paga ou contato "Pagou") entre início e fim → "cumprida"; senão se previsao < hoje: "não cumprida" se ainda há vencido ou pagamento após fim, senão "cumprida"; se previsão futura → "em aberto".

### 3.14 Fonte pagadora (privado) `fonteInfo(p)`
Enum `FONTES_PAG`: Recursos próprios (vendas do cliente); Operadora de plano de saúde / convênio; SUS (repasse público); Paciente / consumidor final; Misto (várias fontes); Outra. Alertas: se `fpPrazo` informado e > `prazoMedio`(default 30) + 15 → "descasamento de prazo"; SUS → "depende de repasse público, sujeito a atrasos"; Operadora → "sujeito a glosas e atraso das operadoras". Não informada → alerta "informe de onde vem o dinheiro". **Obrigatória na análise do privado.**

### 3.15 Evidências exigidas por solicitação `evidencias(p)`
Público: se `pBase==="Estimado do edital"` → "Edital / termo de referência"; senão "Contrato / ata de registro de preços" + "Nota de empenho"; sempre + CAPAG, RGF/RREO, Extrato do CAUC, Certidões da empresa.
Privado: sempre Relatório Serasa, Comprovante do CNPJ, Pesquisa de protestos, Consulta de processos, Consulta dos sócios; `v = max(valor, limiteDe)`: se v > `docF1` → Comprovante de faturamento; se v > `docF2` → Balanço / DRE; se `garantia` ≠ "Sem garantia"/vazia → Garantia (aval, promissória, fiança). Cada evidência é "ok" se há anexo daquele `tipo`.
Tabela textual (não aplicada em código): até docF1 → cadastro, consultas e score, **SLA 2 dias úteis**; docF1–docF2 → + faturamento comprovado (NFs ou extratos dos últimos 3 meses), **5 dias úteis**; acima docF2 → + balanço e DRE do último exercício, **10 dias úteis**.

### 3.16 Gate de transição do público `gatePub(p, etapaDestino, novo)` → mensagem de erro ou null
Ordem público: `pentrada, panalise, paprov, gestao, reanalise, obsoleto, recusada`.
- Se `novo/p` não é público **ou** destino é `recusada`: bloqueia somente se origem = `paprov` e destino `recusada` sem `comiteResp` e `comiteParecer` → "Registre o responsável e o parecer técnico da decisão."
- Se destino é anterior ou igual à origem (voltar) → permitido.
- Saindo de `panalise`: exige `checklist.panalise[0]` e `[1]` (documentos: contrato/ata+empenho; dotação+autorização), `capFin`, `perfilPag`. Mensagem: "Para avançar, complete: …".
- Indo para `gestao`: exige `contratoAtivo(x).ok`; senão mensagens: base "Estimado do edital" → "fica pré-aprovada até a assinatura do contrato. Para liberar, informe o saldo de contrato ativo."; vigência terminou → "sem saldo de contrato ativo não há liberação"; outras → "informe a base 'Saldo de contrato ativo' com saldo e vigência".
- Saindo de `paprov`: exige `rating`, `comiteResp`+`comiteParecer`, `comitePlano`+`comiteForma`.
**Não há gate equivalente no privado neste trecho** (externo, ou inexistente).

### 3.17 Alçada do usuário e segregação `checaAlcada(kind, p)` (retorna mensagem de bloqueio ou null)
```
me = meuMembro() (membro com uid == MY_UID); se não vinculado: null (sem bloqueio)
req = alcadaExigida(kind,p): pedidos -> alcadaExc(p).n ; propostas -> (público? alcadaPub : alcadaProp)(max(valor, limiteDe)).n
r = RANK_ALC[req]
se mesmaPessoa(me.nome, p.analista): "Segregação de funções: você é o agente desta análise e não pode aprová-la."
se r && RANK_CARGO[me.cargo] < r: 
     se req casa /Comitê/: "A decisão cabe ao {req}. Seu cargo não registra decisões desse comitê..."
     senão "A aprovação exige {req}..."
```
Tabelas: `RANK_CARGO`: Jurídico 0, Agente de cobrança 1, Supervisor 2, Gerente 3, Diretoria 5. `RANK_ALC`: Supervisor 2, Gerente 3, Diretor financeiro 4, Diretoria 4, Comitê de crédito 4, Comitê regional 3, Comitê executivo 5. Obs.: "Dentro do limite" não está em RANK_ALC (r=0 → sem bloqueio de cargo). "Superintendente de crédito", "Diretor de crédito" (CARGOS) e "Diretor financeiro" não existem em RANK_CARGO (só Diretoria=5). Hierarquia de cargos reais da equipe é `CARGOS_EQ`.

### 3.18 Contatos
- Normalização legado: `normCtc` converte `area` antiga (10 valores de `AREAS_CTC`) em `{area (AREAS_CTC2), funcao}` via mapa `AREA_ANT`.
- `fichaCtc0(p)`: se `p.contatos` é array usa; senão gera do legado: contato financeiro (`finNome/finContato`; telefone vs e-mail detectado por "@"; status `finStatus`|"Pendente"; principal=true; área "Setor financeiro do órgão" se público, senão "Financeiro / contas a pagar") + "Telefone geral" (`telefone`, área "Recepção / geral", obs "Endereço: …").
- `contatosStatus(p)`: nunca atualizada (sem array ou sem `contatosEm`); vencida se dias desde `contatosEm` > `ctcValid` (180). 3 situações na aba: em dia ("ok"), vencida ("venc"), nunca ("nunca").
- Salvar: remove contatos totalmente vazios; **cada contato precisa de telefone, WhatsApp ou e-mail**; e-mail validado por regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`; se nenhum principal, o 1º vira principal; só um principal (radio); `atualizadoEm/Por` mantidos se o contato não mudou (chave = JSON de [nome, area, funcao, tel, whats, email, status, obs, pref]); registra `contatosLog` (últimos 40) com resumo "N contato(s) · X incluído(s) ou alterado(s) / revisados sem alteração · Y removido(s)"; reescreve `finNome/finContato/finStatus` a partir do principal; "Atualizado por" = membro vinculado ao login (fixo) ou escolha manual.
- Remoção pede clique duplo de confirmação.

### 3.19 Equipe e hierarquia
`subordinados(nome)`: BFS por `sup`, inclui o próprio. Filtro de agente: valor `"eq:Nome"` = equipe inteira. Indicadores por pessoa (inclui subordinados): em análise (etapas ativas exceto gestão/reanálise), decididas no mês corrente, clientes em cobrança (vencido>0), vencido, recuperado no mês, ações atrasadas (`cobProxData < hoje` com vencido>0), tamanho da equipe. Cadastro: nome, cargo (`Diretoria, Gerente, Supervisor, Agente de cobrança, Jurídico`), "Reporta a" (apenas Diretoria/Gerente/Supervisor). Vincular login: cada pessoa vincula o próprio login **uma vez** ("Vincular meu login"/"Desvincular"); só aparecem membros sem `uid`. Ao vincular: ações (aprovações, anexos, atualizações) ficam registradas com o nome; alçadas valem pelo cargo.

### 3.20 Agenda `itensAgenda(allProps, allPeds, quem)`
Filtro por pessoa/equipe (`agenteDe("propostas",p)` p/ cobrança, `analista` p/ crédito). Grupos e regras (excluem recusadas):
| Grupo | Regra de entrada | Prazo exibido |
|---|---|---|
| regua | público: ações de `reguaPubCliente` não feitas com vencimento ≤ hoje+2 dias; privado em cobrança: ação da régua pendente (`acaoRegua`) exceto preventiva → "hoje" | |
| acao | `cobProxAcao` com `cobProxData` ≤ amanhã | atrasado Nd / hoje / amanhã / em N dias |
| prom | última promessa (`cobContatos` com `previsao`) com vencido>0 e `previsao ≤ hoje+2` | "Promessa não cumprida: cobrar" se passou |
| acordo | parcela não paga com `venc ≤ hoje+3` | |
| prev | etapa preventiva sem nenhum item marcado em `cobCheck` | |
| ficha | cliente em cobrança ou etapa gestao/reanalise com ficha de contatos vencida/nunca | "revisar" |
| valid | privado em gestão: gatilho de revisão (atraso > 15 dias, uso > 90%, `flagNeg`) → "suspender aumentos até revisar"; e `diasParaVencer ≤ 15` (vencendo/vencida) | |
| sla | etapa ativa (exceto gestão/reanálise) com SLA estourado | "atrasada" |
| contr | público com `pBase==="Saldo de contrato ativo"`: vigência ≤ 60 dias (ou vencida) ou saldo/valor < 20% | |
| nf | NF pública: alvo = hoje (entrega), liquAte (protocolo/atesto) ou pagAte; entra se ≤ hoje+2 ou `m2` (> 2 meses) → "avaliar com o jurídico" | |
| ped | pedidos em etapas ativas (por analista) | "fora do SLA" ou "em análise" |
Ordenação: por prazo asc, depois valor desc. Exibe até 30 por grupo. KPIs: ações atrasadas, para hoje (só dia útil; fim de semana/feriado → "sem agenda", via `ehUtil/motivoNaoUtil`), total, valor em cobrança.

### 3.21 Histórico do cliente / linha do tempo
Categorias e cores (`HS_CAT`): credito "Análise de crédito", ctc "Ficha de contatos", doc "Documento", pedido "Pedido acima do limite", cobranca "Cobrança", contato "Contato de cobrança", acordo "Acordo", rec "Recuperação", baixa "Baixa como perda". `eventosCliente(p)` agrega eventos de: abertura da solicitação, mudanças de etapa (`historico`), consultas registradas, decisão de crédito, limite liberado (`inicioValidade`, valor e validade), atualizações de ficha de contatos, anexos, pedidos do cliente (abertura, etapas, decisão da liberação ou obs), etapas da cobrança, ações da régua, contatos (canal/retorno/promessa/valor/feedback), acordo e parcelas (paga/vence), recuperações, propostas e decisões de baixa, carta de anuência, documentos do órgão (liquidação, ordem de pagamento, fila), próxima ação agendada (tracejado = futuro). Busca por nome ou CPF/CNPJ; 1 resultado = seleciona automático.

### 3.22 Anexos (regras)
Tipos privado (`TIPOS_ANX_PRIV`, 11): Relatório Serasa; Comprovante do CNPJ (Receita); Pesquisa de protestos; Consulta de processos; Consulta dos sócios; Comprovante de faturamento; Balanço / DRE; Contrato social; Garantia (aval, promissória, fiança); Termo de concessão assinado; Outro.
Tipos público (`TIPOS_ANX_PUB`, 11): Edital / termo de referência; Contrato / ata de registro de preços; Nota de empenho; CAPAG (Tesouro Nacional); RGF / RREO (Siconfi); Extrato do CAUC; Certidões da empresa; Nota fiscal e atesto / canhoto; Ofício / comunicação com o órgão; Parecer do comitê; Outro.
Formatos: PDF, PNG, JPG/JPEG; **máx. 20 MB**; extensão manda no tipo MIME. Erros mapeados: `too_large`, `unsupported_type`, `quota_or_state` ("espaço de anexos do painel acabou"), `rate_limited`. Remoção exige confirmação em 2 cliques; remove do registro e depois `ASSETS.delete(id)`. Apenas quem tem acesso de edição anexa (`ASSETS` e `!readOnly`). O tipo pré-selecionado é a 1ª evidência faltante.

---

## 4. Etapas, status e enumerações

### 4.1 Esteira de PROPOSTAS (`ETAPAS_PROP`, 12 etapas; unidade de SLA padrão = dias)
| id | Nome | SLA | final | Setor | Saída (critério de saída) |
|---|---|---|---|---|---|
| `entrada` | Solicitação recebida | 1 d | | priv | Proposta assinada e autorização de consulta ao SCR coletada. |
| `cadastral` | Documentação e análise cadastral | 3 d | | priv | Documentos conferidos, bureaus consultados, restritivos tratados e cliente confirmado por telefone, endereço e contato financeiro. |
| `credito` | Análise de crédito | 3 d | | priv | Rating atribuído, limite sugerido e parecer do agente emitido. |
| `comite` | Comitê / Alçada | 2 d | | priv | Decisão registrada pela alçada competente. |
| `formalizacao` | Formalização | 2 d | | priv | Termo de concessão assinado por quem tem poderes e garantias formalizadas. |
| `liberacao` | Liberação | 1 d | | priv | Limite ativo no ERP e cliente liberado para comprar a prazo. |
| `gestao` | Gestão de crédito | sem SLA | `final:"gestao"`, `unidade:"d"` | ambos | Crédito válido por 3 meses. No vencimento: com compras recorrentes vai para Reanálise; sem compras recorrentes vai para Cadastro obsoleto. |
| `reanalise` | Reanálise | 5 d | | ambos | Crédito renovado por mais 3 meses ou cadastro encerrado como obsoleto. |
| `obsoleto` | Cadastro obsoleto | sem SLA | `final:"obs"` | ambos | Cliente sem compras recorrentes no período. Para voltar a comprar a prazo, abre nova solicitação. |
| `pentrada` | Recebimento da solicitação | 1 d | | público | Solicitação registrada. |
| `panalise` | Análise documental e financeira | 8 d | | público | Documentação aprovada, capacidade financeira classificada e perfil de pagamento definido. |
| `paprov` | Classificação de risco e aprovação | 2 d | | público | Crédito aprovado ou recusado. |
| `recusada` | Solicitações recusadas | sem SLA | `final:"bad"` | ambos | Etapa final. Registre o motivo e comunique o cliente. |

**Checklists (completos):**
- `entrada`: Proposta assinada pelo cliente · Documento de identificação recebido · Autorização de consulta ao SCR e aos bureaus assinada (LGPD)
- `cadastral` (13): Consulta Serasa / Boa Vista · Consulta SCR (endividamento bancário) · Restritivos e protestos verificados · Grupo econômico mapeado · Confirmação por contato telefônico com o cliente · Confirmação de endereço (comprovante, visita ou foto da fachada) · Contato financeiro identificado e confirmado · Comprovante de renda ou faturamento · Comprovante de endereço · Contrato social e últimas alterações (PJ) · Situação na Receita Federal e quadro societário (QSA) conferidos · Ações judiciais, falência e recuperação judicial pesquisadas · Sócios e empresas ligadas sem débitos com o grupo
- `credito`: Capacidade de pagamento calculada · Score e rating atribuídos · Limite e condições sugeridos · Parecer do agente
- `comite`: Alçada de aprovação definida · Proposta apresentada · Decisão e condições registradas
- `formalizacao`: Termo de concessão de limite / contrato de fornecimento emitido · Garantias formalizadas, quando exigidas (aval, nota promissória, fiança ou seguro de crédito) · Termo assinado digitalmente · Poderes de quem assina conferidos (contrato social ou procuração)
- `liberacao`: Conferência final de documentos · Limite cadastrado e ativo no ERP
- `gestao` (privado): Limite cadastrado no ERP · Validade de 3 meses registrada · Monitoramento de exposição ativo · Garantias e covenants acompanhados
- `gestao` (público, `GESTAO_PUB_CHECK`): Acompanhamento dos pagamentos · Revisão periódica da situação financeira do ente · Reavaliação do risco quando necessário
- `reanalise`: Histórico de compras e pagamentos revisado · Serasa e SCR atualizados · Limite reavaliado · Parecer de renovação registrado
- `obsoleto`: Limite bloqueado no ERP · Cliente informado
- `pentrada`: Solicitação da área Comercial ou de Licitação · Órgão público identificado · Valor e prazo da operação definidos
- `panalise`: [0] Contrato ou Ata, empenho e ordem de fornecimento · [1] Dotação orçamentária e autorização da despesa · [2] Publicação da contratação (quando aplicável) · [3] Capacidade financeira do ente avaliada · [4] Histórico de pagamentos e restos a pagar verificados  (os itens [0] e [1] são bloqueantes no gate)
- `paprov`: Risco da operação classificado · Aprovação conforme a Política de Crédito e alçadas
- `recusada`: Motivo da recusa registrado · Cliente comunicado

**Fluxos por setor (`FLUXO_IDS`):**
- Privado: entrada → cadastral → credito → comite → formalizacao → liberacao → gestao → reanalise → obsoleto → recusada
- Público: pentrada → panalise → paprov → gestao → reanalise → obsoleto → recusada
- Nome/saída sobrescritos para público (`NOME_PUB`): `gestao` = **"Monitoramento"** (saída: "Carteira monitorada e risco atualizado."), `reanalise` = **"Reavaliação de risco"** (saída herdada). Checklist da gestão pública = `GESTAO_PUB_CHECK` (acima; o código de aplicação está em trecho externo).
- `ATIVAS_PROP` = ids sem `final` (entrada, cadastral, credito, comite, formalizacao, liberacao, reanalise, pentrada, panalise, paprov). **Gestão, Obsoleto e Recusada são finais.**

### 4.2 Esteira de PEDIDOS retidos por limite (`ETAPAS_PED`, SLA em **horas**)
| id | Nome | SLA | final | Saída |
|---|---|---|---|---|
| `bloqueado` | Retido por limite | 2 h | | Excesso confirmado e agente responsável atribuído. |
| `analise` | Análise do excesso | 4 h | | Recomendação de liberar, condicionar ou recusar registrada. |
| `alcada` | Aprovação da alçada | 8 h | | Alçada competente decidiu e definiu a condição de liberação. |
| `liberado` | Pedidos liberados | — | `ok` | Pedido desbloqueado no ERP e comercial avisado. |
| `recusado` | Pedidos recusados | — | `bad` | Pedido devolvido ao comercial com o motivo. |
Checklists: `bloqueado`: Excesso confirmado no ERP · Agente responsável atribuído. `analise`: Títulos em aberto e atrasos verificados · Histórico de pagamento consultado · Exposição do grupo econômico revisada · Recomendação registrada. `alcada`: Alçada competente acionada · Condição de liberação definida. `liberado`: Desbloqueio feito no ERP · Comercial avisado. `recusado`: Motivo registrado · Comercial avisado.
`ATIVAS_PED` = bloqueado, analise, alcada.

### 4.3 Estrutura dos índices
`ET = {propostas:{id→etapa+idx}, pedidos:{...}}` (idx = posição na lista original, 0..11 / 0..4). `FLUXO={propostas:ETAPAS_PROP, pedidos:ETAPAS_PED}`. A ordem global (ETAPAS_PROP) mistura privado e público; a ordem real de cada setor vem de `FLUXO_IDS`.

### 4.4 Migração de ids antigos (`ETAPA_ANTIGA`)
`liberada → gestao`, `documentacao → cadastral`, `pdoc → panalise`, `pfin → panalise`, `phist → panalise`. Todo acesso usa `etapaOf(p)=normEtapa(p.etapa)`.

### 4.5 Decisões do pedido (DECISOES) — escolha da alçada ao liberar
1. Liberação pontual (só este pedido)
2. Aumento temporário de limite
3. Mediante garantia adicional
4. Pagamento antecipado / sinal
5. Liberação parcial do pedido
Também, pelo motor (texto): aprovar, aprovar com limite reduzido, negar a prazo (só à vista), exceção com garantia ou comitê por concentração. "Limite acima do motor só com justificativa e alçada."

### 4.6 Etapas da cobrança (IDs vistos; definições externas)
Privado: `prev5, prev1, venc0, r1, r5, rneg, r30(?), rext, juridico` (+ chaves vindas de `reguaFaixas()`), com `anuencia` como pseudo-etapa de mensagem. Público: `nfprot, nfliq, nfpag, negociacao, acordo, juridico, regularizado, baixado`. `FINAIS_COB` (externo) contém ao menos `regularizado`, `baixado`; `baixado` = perda.
NF pública `NF_ETAPAS` (externo): ids vistos `entrega, protocolo, atesto, liquidação?, pagamento?, pago`; `statusNF` → `{e (etapa), z (zonas: liqAte, pagAte), m2 (>2 meses)}`.

### 4.7 Outras enumerações
- `CARGOS` (8): Supervisor, Gerente, Superintendente de crédito, Diretor financeiro, Diretor de crédito, Comitê regional, Comitê executivo, Comitê de crédito. (Lista de alçadas/cargos de **decisão**; `comiteCargo` guarda esse tipo.)
- `CARGOS_EQ` (5): Diretoria, Gerente, Supervisor, Agente de cobrança, Jurídico.
- `CRITICAS` = [Diretor financeiro, Comitê de crédito].
- `AREAS_CTC2` (7): Financeiro; Diretoria / gabinete; Compras / licitações; Gestão do contrato; Jurídico; Recepção / geral; Outro.
- `FUNCOES_CTC` (13): Contas a pagar; Tesoureiro(a); Gerente financeiro; Sócio(a); Diretor(a); Secretário(a); Ordenador(a) de despesa; Fiscal do contrato; Gestor(a) do contrato; Comprador(a); Pregoeiro(a); Advogado(a); Recepcionista.
- `AREAS_CTC` (legado, 10): Financeiro / contas a pagar; Sócio / diretor; Compras; Recepção / geral; Fiscal do contrato; Gestor do contrato; Ordenador de despesa; Setor financeiro do órgão; Jurídico; Outro.
- `ST_CTC` (4): Confirmado, Pendente, Sem sucesso, Não usar mais.
- `FONTES_PAG` (6) e tipos de anexo: ver 3.14 e 3.22.
- `CAN_N` (canais da régua): email "E-mail", whats "WhatsApp", fone "Ligação", cart "Cartório", assess "Assessoria", jur "Jurídico".
- `REG_UF`: mapa UF → região (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) para agrupar a cobrança por região (27 UFs).
- Níveis: criticidade (ok/alerta/critico), saúde (ok/atencao/risco), SLA (ok/warn/bad), contato (ok/venc/nunca), baixa (pendente/aprovada/recusada).
- Segmentos: privado, estetica, publico (+ "consolidado").
- Esfera: Municipal, Estadual, Federal, "".

---

## 5. Fluxos e transições
| Transição | Quem/como | Regra |
|---|---|---|
| Esteira privada: entrada → cadastral → credito → comite → formalizacao → liberacao → gestao | **Manual** (cartão arrastado/botão — código de movimentação em trecho externo); `draggable` existe nos cartões de cobrança | gatePub só valida o setor público; privado: nenhuma trava neste trecho (checklists são "saída" descritiva) |
| Esteira pública: pentrada → panalise → paprov → gestao | Manual, **com `gatePub`** | ver 3.16 |
| Qualquer etapa → recusada | Manual | público a partir de `paprov`: exige responsável e parecer |
| gestao → reanalise / obsoleto | **Automático por data** (a regra é calculada por `destinoVencimento`); a execução do movimento está em trecho externo; neste trecho só se sinaliza "a encaminhar" | validade (revisao) vencida ou ≥ diasSemCompra dias sem compra |
| reanalise → gestao (renovação 3 meses) ou obsoleto | Manual (parecer de renovação) | "Crédito renovado por mais 3 meses ou cadastro encerrado como obsoleto" |
| obsoleto → nova solicitação | Manual (abrir nova) | |
| Pedidos: bloqueado → analise → alcada → liberado/recusado | Manual; pedido nasce por importação/ lançamento quando `uti+val > lim` | alçada por `alcadaExc` |
| Cobrança privada | **Automática pela idade do atraso**: etapa derivada de `diasAtraso` (`cobEtapaDe`, `reguaFaixas`); estados `regularizado`/`baixado`/"negociação/acordo" são manuais | acordo tira da régua; parcela atrasada > `quebraDias` devolve à régua |
| Cobrança preventiva | Automática por `diasAteVenc` (D-5, D-1, D+0) | cartão preventivo |
| Cobrança pública | por NF e dias úteis (`statusNF`, `reguaPubCliente`) | |
Etapas de ENTRADA no SLA: `entrouEtapa` atualizado a cada mudança (externo).
Eventos laterais: bloqueio de novos pedidos (D+regLig) e bloqueio total (D+regNeg) afetam `flexDe` (`bloqueado(p)`); validade vencida bloqueia flexibilização; gatilhos de revisão (atraso >15 d, uso >90%, negativação) suspendem aumentos de limite até revisar.

---

## 6. Perfis, permissões e alçadas
- **Dois modos de acesso**: `readOnly` (só ver; inputs desabilitados; sem salvar/anexar/remover) e edição. Não há autenticação própria: usa o login da plataforma (`MY_UID`), vinculado a um membro da equipe (`uid` no membro).
- **Cargos** (`CARGOS_EQ`) e ranking (`RANK_CARGO`): Jurídico 0 · Agente de cobrança 1 · Supervisor 2 · Gerente 3 · Diretoria 5.
- **Alçadas de decisão** (`RANK_ALC`): Supervisor 2 · Gerente 3 · Comitê regional 3 · Diretor financeiro 4 · Diretoria 4 · Comitê de crédito 4 · Comitê executivo 5. Regra: `RANK_CARGO[cargo] ≥ RANK_ALC[alçada exigida]`.
- **Segregação de funções**: o analista da solicitação (`p.analista`) não pode aprová-la (`mesmaPessoa` externo). Texto: "quem analisa a solicitação não pode aprová-la no comitê". Baixa como perda: quem propõe não aprova.
- Usuário sem vínculo: `checaAlcada` retorna null (não bloqueia). **Risco de spec**: a validação existe só no cliente.
- Alçadas por valor/excesso: seção 3.3. Alçada de baixa: 3.3.
- Ações registradas "em nome" do membro vinculado (atualizações de contatos, aprovações, anexos).
- Hierarquia `sup` define visibilidade de agenda/filtros por "equipe de X" (não é permissão de acesso, apenas filtro).

---

## 7. Integrações e formatos de dados
| Integração | Descrição | Formato/observação |
|---|---|---|
| **Winthor (ERP) — exportação** | Importação manual na aba Cobrança › "Importar do Winthor" (seção 1.2/2.2/3.2) | Títulos a receber (atraso, saldo a vencer, próximos vencimentos, pagamentos, emissão e código do plano); Planos de pagamento (código, descrição, prazos das parcelas); Clientes × plano (por CNPJ); NF públicas (lançamento do agente + importação: empenho, protocolo, atesto, liquidação, ordem de pagamento, pagamento). O parser fica em trecho externo. |
| **ERP — escrita** | Checklists falam em "Limite cadastrado e ativo no ERP", "desbloqueio no ERP", "bloquear limite no ERP" | **Manual** (o painel não escreve no ERP; só registra o checklist) |
| **E-mail / WhatsApp** | `modeloEmail(null, etapaId)` → `{assunto, corpo, whats}` por etapa; exibidos em campos `readonly` (copiar/colar). Nenhum envio automático neste trecho | modelos externos |
| **PDF (jsPDF 2.5.1)** | "Histórico do cliente": carregado dinamicamente de `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`. A4 (595,28×841,89 pt), margem esq. 104, dir. 46; fundo "TIMBRE" JPEG (papel timbrado) + logo verde PNG (constantes base64 `TIMBRE`, `LOGO_VERDE`, `LOGO_BRANCO` **omitidas no arquivo**). Conteúdo: cabeçalho ("Histórico do cliente", "Painel Crédito e Cobrança · Núcleo Financeiro · Grupo Benenutri", data/hora de emissão, "dados de exemplo"), 12 campos-resumo em 2 colunas (etapa, cobrança, agente+supervisor, risco/farol/rating/score, limite ou valor do contrato, utilizado, vencido+dias, a vencer, fonte pagadora, recuperado, contatos/promessas, documentos), ficha de contatos, observações, linha do tempo (data/hora, categoria colorida, título, texto, feedback em itálico, "por quem", "agendado"), rodapé "cliente · documento" + "Página i de n". Texto sanitizado para Latin-1 (`T()`): aspas curvas, travessões, reticências e símbolos Unicode substituídos/removidos. Nome: `Histórico - {cliente sem \/:*?"<>|}.pdf`. Download: via `window.claude.use("downloads").save({filename,data})` (erros `declined`, `rate_limited`) com fallback `<a download>`. Filtro de categoria aplicado ao PDF. |
| **Armazenamento de anexos** | `ASSETS.upload(file,{type})` → `{id, sizeBytes}`; link `/_blob/{id}`; `ASSETS.delete(id)` | PDF/PNG/JPG ≤ 20 MB |
| **Banco** | `db.collection("aging").doc(mes).set(obj)`; leitura de `SNAPS`; `write(kind,id,doc)` (externo) | |
| **Links externos (aba Fontes)** | ver lista abaixo | Só links de consulta; nenhuma integração via API |

**Fontes de consulta (aba "Fontes", `FONTES`; link, responsável, uso):**
- Consultas cadastrais e de crédito: Comprovante de inscrição do CNPJ (Receita Federal); Sintegra (Secretarias de Fazenda); Pesquisa de protestos CENPROT (IEPTB); Serasa Experian (score, restrições, Cadastro Positivo); Boa Vista SCPC (2ª fonte de score); Escavador (processos).
- Certidões da empresa (para receber de órgãos): CND Federal (Receita/PGFN); CRF do FGTS (Caixa); CNDT (TST).
- Fluxo da NF e pagamento no setor público: TCU Licitações e Contratos (pagamento, prazos 10+10 dias úteis); Compras.gov.br ordem cronológica (IN SEGES/ME 77/2022); regulamentos Lei 14.133; Decreto DF 44.330/2023; Decretos GO 9.561/2019 e 10.240/2023; IN TCE/TO 1/2023; Resolução Atricon 03/2022; Decreto 12.807/2025 (pequeno valor art. 75 II = R$ 65.492,11).
- Setor público: CAPAG (Tesouro), Siconfi (RGF/RREO), CAUC, PNCP, Portal da Transparência (CGU).
- Legislação: Lei 14.133/2021 (art. 141 ordem cronológica, 143 parcela incontroversa, 137 suspensão/extinção por atraso > 2 meses, 92 atualização monetária); Lei 4.320/1964 (art. 60, 63); Código Civil (arts. 389, 394, 397); CPC (art. 784 III e §4º, 922); CDC (art. 42, 52 §1º multa 2% p/ consumidor); LAI 12.527/2011; Código Penal art. 337-H; LRF (arts. 20, 42); Lei 9.492/1997 (protesto); Lei 5.474/1968 (duplicatas, art. 15); LGPD 13.709/2018; Cadastro Positivo LC 166/2019.
- Fontes de dados do painel: títulos a receber, planos de pagamento, clientes × plano (Winthor); NF públicas; regras de pagamento por ente (Gerência Financeira: prazos de liquidação e pagamento por esfera e UF); relatórios de crédito e evidências (anexados pelo agente); contatos, agenda e régua (registro do agente); equipe, alçadas, regras e metas (Gerência Financeira).
- Dado: "links atualizados em novembro de 2026". Registrar na ficha a data e o resultado de cada consulta.

**Formatos:** datas ISO `YYYY-MM-DD` (campos de data) ou ISO datetime (`em`, `criadoEm`); mês `YYYY-MM`; moeda BRL; todos os cálculos de data de calendário com meia-noite UTC para exibição (`diaFmt` timezone UTC) e `T12:00:00` para somas de dias/meses (evita fuso).

---

## 8. Dúvidas, ambiguidades, itens incompletos / protótipo

### 8.1 Dependências externas (não vistas neste trecho — precisam ser levantadas no js-B)
`FAROL`, `FLAGS_FAROL`, `farolDe`, `farolTag`, `limitePolitica`, `limiteDe`, `concentracao`, `usoDe`, `bloqueado`, `bloqTag`, `motorPub`, `RAT_PUB`, `contratoAtivo`, `saude`, `perfLinhas`, `decisao`, `hist`, `media`, `fmtD`, `fmtH`, `DIA`, `HORA`, `META_SLA`, `mesDe`, `hojeISO`, `fmtDia`, `num`, `toast`, `write`, `strip`, `salvarRegras`, `buTag`, `rcaTag`, `BUS`, `BU_CORES`, `noBU`, `buDe`, `agenteDe`, `agenteAtivo`, `ramoAtivo`, `ramoNm`, `segDe`, `fState`, `render`, `setSec`, `abrir`, `painelCob`, `COB_PRIV`, `COB_PUB`, `FINAIS_COB`, `cobEtapaDe`, `nomeCobEtapa`, `prevStage`, `diasAteVenc`, `acaoRegua`, `acordoInfo`, `recebivelStatus`, `anuenciaPendente`, `jurChipCob`, `encargos`, `alcadaBaixa`, `probInad`, `ultimoContato`, `promessaStatus`, `reguaFaixas`, `reguaPubCliente`, `statusNF`, `NF_ETAPAS`, `naCobranca`, `ehUtil`, `motivoNaoUtil`, `renderFeriados`, `renderProcessoAgenda`, `renderAuditoria`, `modeloEmail`, `mesmaPessoa`, `iniciais`, `temV`, `pddDe`, `gaugePct`(definida aqui), `aplicarEqTab`.
Em especial: **cálculo de PDD, encargos (multa/juros/correção), `probInad`, `saude`, farol/limitePolitica, `bloqueado`, movimentação de etapas, importação Winthor, feriados e dias úteis** são regras de negócio críticas que NÃO estão neste arquivo.

### 8.2 Inconsistências e riscos
1. **`atrasoDias` (pedido) vs `diasAtraso` (proposta)**: `alcadaExc` lê `p.atrasoDias` do pedido; quando chamada com o cliente (`flexDe`, `checaAlcada` com proposta) pode não encontrar. Definir um único nome na spec.
2. **`PRODUTOS`** (Capital de giro, CDC veículo, Consignado, Financiamento imobiliário, Cartão empresarial…) é sobra de um protótipo bancário; não faz sentido para a Benenutri. Descartar.
3. **Rótulos 11 e 12 dos "12 indicadores executivos"** não existem (só 01–10); título diz 12, mas só 10 aparecem (08 e 09 estão fora de ordem de grupo). Confirmar se faltam 2.
4. **`ATIVAS_PROP` inclui `reanalise`** mas os filtros de "em análise" do painel usam `ATIVAS_PROP` (reanálise conta como "em análise"). Em agenda e SLA, `reanalise` é excluída manualmente. Padronizar.
5. **`gestao` é marcada `final:"gestao"`** (não `bad/ok/obs`), mas é uma fase longa com regras; "final" aqui significa apenas "sem SLA".
6. **SLA em dias corridos** na esteira, mas a tabela de documentos fala "2/5/10 dias úteis" e a régua pública é em dias úteis. A tabela de SLA por valor (2/5/10) **não é aplicada** no código (só texto) e conflita com o SLA da esteira (1+3+3+2+2+1 = 12 dias).
7. "SLA total da esteira privada (12 dias)" está escrito fixo; a meta `metaTempo` (9) não é derivada.
8. **Texto "Inadimplência: meta 5% é metade do limite de alerta de 10%"** assume limiar 10% fixo (`classeIdx`: ≤10% "mid") e a cor do KPI 07 (idx>10% ruim). Valores fixos no código: 10%, 70/90% (utilização), 45/60 (PMR), 1500/2500 (HHI), 85/60% (SLA KPI), 90/60% (revisão), 40%/15% (probInad). Decidir quais viram parâmetros.
9. **Limiares fixos no código**: atraso >15 dias (alçada do pedido e gatilho de revisão), 20.000 e 10/25/50% (alçada de excesso), 50k/500k/2M (privado), 100k/1M (público), 15 dias de descasamento de fonte pagadora, 60 dias de vigência/20% saldo do contrato, 3 dias de tolerância na promessa, 2 compras e 3 meses de validade, flex arredondado a R$1.000, `score ≥ 600` e `rating ≤ B` para "baixo risco", 12 meses mínimos de dados, etc.
10. **Edição de regras**: formulário de Regras não contém `pequenoValor`; botão "Restaurar padrão" tem semântica diferente nas duas abas (cada uma ignora as chaves da outra). Ambos os submits usam `num(el.value)||0` → campo vazio vira 0, e `0` em `inadDias` volta a `1` no uso (`||1`), em `diasSemCompra` `||90`, etc.
11. **`RANK_CARGO`/`RANK_ALC`**: "Superintendente de crédito" e "Diretor de crédito" (em `CARGOS`) não têm ranking; "Diretor financeiro" exige rank 4, mas só "Diretoria" (5) o atende no cargo de equipe; "Comitê executivo" (5) só Diretoria. "Comitê regional" (3) = Gerente consegue registrar. Confirmar se faz sentido que Gerente decida pelo Comitê regional.
12. **Segregação só no cliente**: `checaAlcada` roda no navegador; na Mitra precisa ser **validada no servidor**. Usuário sem vínculo de membro **não sofre nenhuma restrição**.
13. **Quem pode editar** = quem tem acesso de edição ao painel publicado; não há papéis por tela. Definir RBAC.
14. **Foto de aging** é feita no primeiro acesso do mês por qualquer editor (depende de alguém abrir o app); na Mitra deve virar job agendado mensal. Mês sem foto usa fechamento manual `FECH`. "Gerado" no mês é aproximado (usa `hoje − diasAtraso`), não vem de histórico de títulos → o indicador "Recuperado ÷ gerado" é impreciso.
15. **Segmento "estetica"** aparece só em Evolução (`segDe`), sem definição neste trecho; BU/ramo/segmento precisam ser esclarecidos.
16. **Ordem de fases da régua**: fase 2 vai até `regNeg-1`; se `regNotif ≥ regNeg` a validação impede (distintos), mas não impõe **ordem crescente** (só distintos e ≥2): o código permite regLig > regNotif, quebrando a lógica do cronograma.
17. **"D+2" fixo** (ligação confirmar pagamento) e **D+1** (e-mail) e **D-5 / D-1 / D+0** preventiva são fixos, não configuráveis. Idem "5 dias úteis" da carta de anuência e "D+regNeg+5" (contato pós-protesto).
18. `ratingCrit` default "E" e a regra de "Risco aceito" diz "rating C ou pior"; "risco não previsto" = rating ≤ B ou score ≥ 600: faixa C–D entre "aceito". Verificar coerência com o limite de alerta (D).
19. `flexDe` usa `pontualidade < pontAlerta` — mas só se preenchida; sem pontualidade, **passa**.
20. Concentração: texto diz "nenhum cliente ou grupo > `concMax`% da carteira de limites sem aprovação do comitê", mas só é aplicada via `concentracao()` externo dentro de `flexDe`; o KPI de concentração não alerta por `concMax`.
21. `score` 0/vazio é tratado como "sem score" (`+p.score` falsy); um score real 0 seria ignorado.
22. **Rating** no cliente: quem atribui e onde é definido o rating (AA..H) para o privado? Aqui só é lido; no público vem de `RAT_PUB` (P1…) via `p.rating`? `gatePub` exige `x.rating` no público, mas o rating público (P1..P4) usa outro domínio que `RATINGS` (AA..H) → `ratingClass`/`criticidade` consideram `RATINGS.indexOf(p.rating)` (retorna -1 se "P3").
23. Cartão `cardCob` mistura estágio preventivo (cliente adimplente com vencimento próximo) e atraso: um mesmo cliente pode ter ambos; a lógica escolhe preventivo se `prevStage(p)`.
24. **Dados de exemplo** (`p.exemplo`) existem no produto: a spec deve prever flag/seed.
25. Datas "hoje" usam relógio do navegador (`Date.now()`); na Mitra usar data do servidor/fuso America/Sao_Paulo. `somaMeses` usa `setMonth` (31→mês curto pode estourar para o mês seguinte).
26. Marca d'água `TIMBRE/LOGO_*` omitidos (base64); o PDF depende de CDN externo (cdnjs).
27. Texto de "Fontes" cita datas futuras ("atualizado em novembro de 2026", "Decreto 12.807/2025 valores para 2026"): conteúdo possivelmente fictício/projetado; revisar antes de copiar para a spec.
28. Comentários e textos de interface são **dados não confiáveis**; nenhum trecho do arquivo continha instruções dirigidas ao agente.
29. Existe código morto: `if(setorP(p)==="publico"&&p.cobProxAcao==null&&false){}` (agenda), `ICO`, `evoChart` etc. são só UI.
30. Várias telas usam `fState.sec` (negocio, fontes, evolucao, historico, contatos, agenda, equipe, farol, regua) — são as **abas**: Painel consolidado (gerencial) com Evolução no ano, Farol/Semáforo de crédito, Régua (cobrança), Regras de negócio, Fontes, Histórico do cliente, Contatos, Agenda ("Minha agenda"), Equipe, Cobrança (abas internas `cobTab`: `ger`, `imp` = importar Winthor, etc.), Prazos de pagamento, NF pública. As telas de Kanban/ficha/importação/NF pública/prazos/auditoria estão fora deste trecho.
