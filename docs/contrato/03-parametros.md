# 03 — Catálogo único de parâmetros

Uma chave por regra, um dono por chave. A tabela é `CC_PARAMETRO_DEF` (definição) + `CC_PARAMETRO` (valor); a única SF que grava valor é `ccBaseParametroSalvar` (001). Cada spec declara as suas chaves em `backend/lib/parametros/NNN-<slug>.mjs` exatamente como estão aqui. Leitura: `parametros(carteira, data?)` em JS e `PARAM('grupo.chave', carteira)` em SQL (01 §9).

**Como ler as tabelas**

| Coluna | Significado |
|---|---|
| Chave | nome definitivo (`grupo.chave`) |
| Padrão | valor semeado na linha padrão (`CARTEIRA = ''`) — é o valor da carteira `PRIVADA` |
| Un. | `d` dias corridos · `du` dias úteis · `m` meses · `%` · `R$` · `nível` (1–5 de `CC_MEMBRO.NIVEL`) · `pts` pontos · `txt` texto · `op` opção · `lista` |
| Carteira | `—` = valor único do sistema · `sim` = aceita valor próprio por carteira (hoje nenhuma define) · `PUB = x` / `EST = x` = valor próprio já semeado. **Regra D-05:** carteira sem valor próprio usa o padrão |
| Vig. | `sim` = guarda histórico por data de início de vigência; cálculo com data usa o valor em vigor naquela data. **Vigência nova só de hoje em diante** (17/11/2026): `ccBaseParametroSalvar` recusa início anterior a hoje; histórico anterior só pelo `vigencias` do catálogo, na publicação (01 §9) |
| Usam | specs que leem (a primeira é a dona, que semeia) |
| Validação | conferida em `ccBaseParametroSalvar` (a regra cruzada do grupo é o `validarConjunto` declarado pela dona, que recebe o conjunto efetivo inteiro, 01 §9) |
| Era | nomes antigos (Anexo A da 001 e plans) — é a tabela **de → para** |

Total: 277 chaves (276 + `cred.revValidadeDias`, 16/11/2026). SLA de etapa **não é parâmetro**: é `KB_FASE.SLA_HORAS`, editado na administração do quadro (05-quadros.md).

---

## 1. `base.*` — leitura do Winthor e calendário (dona 001)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `base.syncIntervaloMin` | 15 | min | — | não | 001, 006 | 5–120, múltiplo de 5 | `syncIntervaloMin` |
| `base.syncJanelaMeses` | 12 | m | — | não | 001 | 1–36 | `syncJanelaMeses` |
| `base.comprasJanelaDias` | 90 | d | — | não | 001, 004 | 30–365 | `comprasJanelaDias` |
| `base.pontualidadeMeses` | 12 | m | — | não | 001, 002, 004 | 1–36 | `cob.pontualidadeMeses` |
| `base.calendarioUf` | DF | txt | — | não | 001 | UF válida | `calendarioUf` |
| `base.fichaValidadeDias` | 180 | d | — | não | 001, 004 | 30–730 | `ctcValid` |
| `base.ramosPublicos` | 11,12,13,14,15 | lista | — | não | 001 | códigos de `PCATIVI` separados por vírgula; pode ser vazio | **D-02** (novo) |
| `base.ramoPublicoPrefixo` | ORGAO PUBLICO | txt | — | não | 001 | pode ser vazio; vazio nos dois = ninguém é público (recusado) | **D-02** plano B (novo) |
| `base.ramosEsfera` | (vazio) | lista | — | não | 001, 005 | pares `código=FEDERAL\|ESTADUAL\|MUNICIPAL` | novo (005 NC) |
| `base.vencimentoDiaNaoUtil` | CORRIDO | op | sim | sim | 001 | `CORRIDO`, `PROXIMO_UTIL`, `UTIL_ANTERIOR` | **D-03** `VENCIMENTO_DIA_NAO_UTIL` |
| `base.cobrancasExcluidas` | (vazio) | lista | — | não | 001 | códigos de `PCCOB` separados por vírgula | **D-04** (novo) |
| `base.rotinaUsuarioEmail` | (vazio) | txt | — | não | 001 | e-mail de usuário existente; vazio = primeiro `ADMIN` ativo | novo |

**D-02** — cliente é `PUBLICO` se `RAMO_COD ∈ base.ramosPublicos` **ou** o nome do ramo começa por `base.ramoPublicoPrefixo`; senão `PRIVADO`. Pessoa física é `TIPO_PESSOA`, não setor. Esfera: `base.ramosEsfera` quando preenchido; senão lançada à mão na ficha do órgão.
**D-03** — `CORRIDO`: atraso conta do vencimento, qualquer dia. `PROXIMO_UTIL`: vencimento em dia não útil passa para o próximo dia útil. `UTIL_ANTERIOR`: passa para o dia útil anterior. Vale para o vencimento **efetivo** gravado na posição (a data original fica no Winthor); mudar o valor recalcula na próxima leitura completa.
**D-04** — título cujo `CODCOB` está na lista não entra em posição, aging, régua nem PDD. Lista vazia = nenhum excluído.

## 2. `com.*` — identidade da comunicação (dona 001)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `com.telefone` | (61) 3033-3116 | txt | sim | não | 001, 002, 003, 005 | não vazio | `comTelefone`, `cob.contatoTelefone`, `JUR_NOTIF_TELEFONE` |
| `com.email` | cobranca@benenutri.com | txt | sim | não | 001, 002, 003, 005 | e-mail válido | `comEmail`, `cob.contatoEmail`, `JUR_NOTIF_EMAIL` |
| `com.assinatura` | Equipe de Crédito e Cobrança – Grupo Benenutri | txt | sim | não | 001, 002, 003, 005 | não vazio | `comAssinatura`, `cob.assinatura` |
| `com.politicaVersao` | 5.2 | txt | — | sim | 001, 007 | não vazio | `politicaVersao` |
| `com.modeloRevalidarMeses` | 12 | m | — | não | 001 | 1–60 | `modeloRevalidarMeses` |
| `com.modeloValidaNivel` | 3 | nível | — | não | 001 | 1–5 | novo (P-06) |

## 3. `crit.*` — criticidade do cliente (dona 001; calcula a 004)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `crit.atrasoAlerta` | 1 | d | sim | não | 004, 006 | < `atrasoCritico` | `atrasoAlerta` |
| `crit.atrasoCritico` | 30 | d | sim | não | 004, 006 | | `atrasoCrit` |
| `crit.pontAlerta` | 90 | % | sim | não | 004 | > `pontCritico` | `pontAlerta` |
| `crit.pontCritico` | 80 | % | sim | não | 004 | 0–100 | `pontCrit` |
| `crit.scoreAlerta` | 600 | pts | sim | não | 004 | > `scoreCritico` | `scoreAlerta` |
| `crit.scoreCritico` | 400 | pts | sim | não | 004 | 0–1000 | `scoreCrit` |
| `crit.usoAlerta` | 90 | % | sim | não | 004, 006 | < `usoCritico` | `usoAlerta` |
| `crit.usoCritico` | 100 | % | sim | não | 004, 006 | | `usoCrit` |
| `crit.prazoAlerta` | 60 | d | sim | não | 004 | < `prazoCritico` | `prazoAlerta` |
| `crit.prazoCritico` | 90 | d | sim | não | 004 | | `prazoCrit` |
| `crit.ratingAlerta` | D | op | sim | não | 004 | AA–E; melhor que `ratingCritico` | `ratingAlerta` |
| `crit.ratingCritico` | E | op | sim | não | 004 | AA–E | `ratingCrit` |
| `crit.alertasParaCritico` | 3 | qtd | sim | não | 004 | 1–6 | `alertasParaCritico` |
| `crit.inadDias` | 1 | d | sim | não | 002, 004, 006 | ≥ 1 | `inadDias` |

## 4. `regua.*` — dias da régua de cobrança (dona 002)

Dias corridos contados do vencimento mais antigo em aberto (negativo = antes do vencimento mais próximo). Cada chave abre a fase indicada do quadro `cobranca-<carteira>`.
**Exceção D-05:** a carteira `PUBLICA` não usa este grupo — a etapa do órgão vem do andamento da NF (`pub.*`, §17). A `ESTETICA` usa, com valor próprio onde o gestor definir.

| Chave | Padrão | Un. | Fase que abre | Carteira | Vig. | Usam | Era |
|---|---|---|---|---|---|---|---|
| `regua.prevAviso1` | 5 | d antes | `prev_d5` | sim | não | 002 | `prevAviso1`, `cob.prevInicio` |
| `regua.prevAviso2` | 1 | d antes | `prev_d1` | sim | não | 002 | `prevAviso2` |
| `regua.confPag` | 2 | d | `pag_nao_ident` | sim | não | 002 | `regConfPag` |
| `regua.lig` | 4 | d | `cob_ativa` (e bloqueio de pedidos) | sim | não | 002, 004 | `regLig`, `cob.regLig` |
| `regua.notif` | 7 | d | `notif_formal` | sim | não | 002 | `regNotif`, `cob.regNotif` |
| `regua.neg` | 10 | d | `protesto` | sim | não | 002 | `regNeg`, `cob.regNeg` |
| `regua.prop` | 20 | d | `neg_pos_protesto` | sim | não | 002 | `regProp`, `cob.regProp` |
| `regua.extra` | 30 | d | `extrajudicial` | sim | não | 002, 003 | `regExtra`, `cob.regExtra` |
| `regua.jur` | 45 | d | `juridico` (caso passa a "pronto para o dossiê") | sim | não | 002, 003 | `regJur`, `cob.regJur` |
| `regua.jurMax` | 60 | d | — (alerta "Jurídico atrasado") | sim | não | 002, 003 | `regJurMax`, `cob.regJurMax` |
| `regua.bloqTotal` | 10 | d | — (bloqueio total do crédito) | sim | não | 002, 004 | `cob.regBloqTotal` (P-01) |

Validação do conjunto (por carteira): `prevAviso1 > prevAviso2 ≥ 1`; `1 ≤ confPag < lig < notif < neg < prop < extra < jur ≤ jurMax`; `lig ≤ bloqTotal ≤ jur`. Mudou um dia → a tela da 002 renomeia a fase com `kbFaseSalvar` (o nome é rótulo; a regra usa a chave).

## 5. `cob.*` — cobrança, promessas, acordos (dona 002)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `cob.quebraDias` | 5 | d | sim | não | 002 | 1–60 | `quebraDias`, `cob.quebraDias` |
| `cob.promessaToleranciaDias` | 3 | d | sim | não | 002, 006 | 0–30 | `promTolerDias`, `cob.promessaTolerancia` |
| `cob.promessaMaxUteis` | 5 | du | **PUB = 0** | não | 002 | 0–30; `0` = sem limite (órgão é isento, P-37) | `cob.promessaMaxUteis` |
| `cob.promessasQuebradas` | 2 | qtd | sim | não | 002 | 1–10 | `cob.promessasQuebradas` |
| `cob.anuenciaDiasUteis` | 5 | du | sim | não | 002 | 1–30 | `anuenciaDiasUteis`, `cob.anuenciaPrazoUteis` |
| `cob.emailPrazoMinDias` | 3 | d | sim | não | 002 | 1–30 | `cob.emailPrazoMinimo` |
| `cob.semContatoDias` | 7 | d | sim | não | 002 | 1–60 | `cob.semContatoDias` |
| `cob.acordoEntradaMinPct` | 20 | % | sim | não | 002 | 0–100 | `cob.acordoEntradaMinPct` |
| `cob.acordoMaxParcelas` | 5 | qtd | sim | não | 002 | 1–60 | `cob.acordoMaxParcelas` |
| `cob.acordoValorGerente` | 50000 | R$ | sim | não | 002 | > 0 | `cob.acordoValorGerente` |
| `cob.acordoParcelasPadrao` | 3 | qtd | sim | não | 002 | 1–`acordoMaxParcelas` | `cob.acordoParcelasPadrao` |
| `cob.acordoPrimeiroDias` | 7 | d | sim | não | 002 | 0–60 | `cob.acordoPrimeiroDias` |
| `cob.acordoIntervaloDias` | 30 | d | sim | não | 002 | 1–90 | `cob.acordoIntervalo` |
| `cob.probSemHistorico` | 5 | % | sim | não | 002, 004 | 0–100 | `cob.probSemHistorico` |
| `cob.probPisoAtraso` | 50 | % | sim | não | 002, 004 | 0–100 | `cob.probPisoAtraso` |
| `cob.probTeto` | 95 | % | sim | não | 002, 004 | ≥ `probPisoAtraso` | `cob.probTeto` |
| `cob.probForte` | 40 | % | sim | não | 002 | > `probMedio` | `cob.probForte` |
| `cob.probMedio` | 15 | % | sim | não | 002 | 0–100 | `cob.probMedio` |

Teto de 60 parcelas por acordo é limite do sistema (não é política).

`cob.emailModo.<fase>` — como o e-mail da fase sai: `MANUAL` (a pessoa dispara pelo card), `APROVAR` (a rotina monta em `CC_EMAIL_FILA` e alguém com nível ≥ `alcada.emailAprovaNivel` aprova), `AUTOMATICO` (a rotina envia). Modelo com efeito legal só sai com validação em dia, em qualquer modo. Carteira: sim. Era `cob.emailModo.<ETAPA>`.

| Chave | Padrão | Modelo |
|---|---|---|
| `cob.emailModo.prev_d5` | MANUAL | `COB_PREV_D5` |
| `cob.emailModo.prev_d1` | MANUAL | `COB_PREV_D1` |
| `cob.emailModo.venc_d0` | MANUAL | `COB_VENC_D0` |
| `cob.emailModo.pag_nao_ident` | MANUAL | `COB_PAG_NAO_IDENT` |
| `cob.emailModo.cob_ativa` | MANUAL | `COB_ATIVA` |
| `cob.emailModo.notif_formal` | APROVAR | `COB_NOTIF_FORMAL` |
| `cob.emailModo.protesto` | APROVAR | `COB_PROTESTO` |
| `cob.emailModo.neg_pos_protesto` | APROVAR | `COB_NEG_POS_PROTESTO` |
| `cob.emailModo.extrajudicial` | APROVAR | `COB_EXTRAJUDICIAL` |
| `cob.emailModo.juridico` | MANUAL | `COB_JURIDICO` |

## 6. `enc.*` — encargos de atraso (dona 002; cálculo título a título em `ccCobEncargosCalcular`)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `enc.multa` | 2 | % | **PUB = 0** | sim | 002, 003, 005 | 0–20 | `multaPriv`, `multaPub`, `cob.multa` |
| `enc.juros` | 1 | % ao mês | **PUB = 0,5** | sim | 002, 003, 005 | 0–20 | `jurosPriv`, `jurosPub`, `cob.juros` |
| `enc.correcao` | 0,4 | % ao mês | sim | sim | 002, 003, 005 | 0–20 | `correcao`, `cob.correcao` |

**Fórmula** (por título vencido, na data `d`, com os valores em vigor em `d`; RN-015 da 002): `dias = d − vencimento efetivo`; multa = saldo × `enc.multa` % (uma vez); juros = saldo × `enc.juros` % × dias ÷ 30 (simples, pro rata); correção = saldo × ((1 + `enc.correcao` %)^(dias ÷ 30) − 1) (composta); cada parcela arredondada a 2 casas (01 §2) antes de somar; total = saldo + multa + juros + correção. Referência do seed: 18.000 há 38 dias + 12.000 há 30 dias = 30.000 + 600,00 + 348,00 + 139,25 = **31.087,25** (cliente 3001, 06 §2.5). Encargos conferidos contra os contratos e correção por índice oficial: P-34.

## 7. `alcada.*` — alçadas (cada dona semeia as suas)

| Chave | Padrão | Un. | Carteira | Vig. | Usam (dona) | Validação | Era |
|---|---|---|---|---|---|---|---|
| `alcada.nivelSupervisor` | 2 | nível | — | não | 004, 002 | 1–5 | `nivelSupervisor` |
| `alcada.nivelGerente` | 3 | nível | — | não | 004, 002 | ≥ supervisor | `nivelGerente` |
| `alcada.nivelComiteRegional` | 3 | nível | — | não | 004 | ≥ gerente | `nivelComiteRegional` |
| `alcada.nivelComiteExecutivo` | 5 | nível | — | não | 004 | ≥ regional | `nivelComiteExecutivo` |
| `alcada.nivelDiretorFinanceiro` | 5 | nível | — | não | 004, 002 | ≥ gerente | `nivelDiretorFinanceiro` (era 4; P-12) |
| `alcada.nivelComiteCredito` | 5 | nível | — | não | 004 | ≥ gerente | `nivelComiteCredito` (era 4; P-12) |
| `alcada.concSupervisor` | 50000 | R$ | **PUB = 100000** | sim | 004 | > 0 | `alcProp1`, `alcSupValor`, `alcPub1`, `pubAlcadaSupervisor` |
| `alcada.concGerente` | 500000 | R$ | **PUB = 1000000** | sim | 004 | ≥ `concSupervisor` | `alcProp2`, `alcGerValor`, `alcPub2`, `pubAlcadaGerente` |
| `alcada.concRegional` | 2000000 | R$ | **PUB = 1000000** | sim | 004 | ≥ `concGerente` (igual = faixa não existe) | `alcProp3`, `alcRegionalValor` |
| `alcada.concRotuloTopo` | Comitê executivo | txt | **PUB = Diretoria** | não | 004 | não vazio | novo (D-05) |
| `alcada.pedAtrasoComiteDias` | 15 | d | sim | não | 004 | ≥ 0 | `excAtrasoComite`, `pedAtrasoComiteDias` |
| `alcada.pedSupPct` | 10 | % | sim | não | 004 | < `pedGerPct` | `alcExcPct1`, `pedSupPct` |
| `alcada.pedSupValor` | 20000 | R$ | sim | não | 004 | > 0 | `alcExcValor1`, `pedSupValor` |
| `alcada.pedGerPct` | 25 | % | sim | não | 004 | < `pedDirPct` | `alcExcPct2`, `pedGerPct` |
| `alcada.pedDirPct` | 50 | % | sim | não | 004 | ≤ 1000 | `alcExcPct3`, `pedDirPct` |
| `alcada.baixaGerente` | 10000 | R$ | sim | sim | 002 | > 0 | `alcBaixa1`, `cob.alcBaixa1` |
| `alcada.baixaDiretor` | 100000 | R$ | sim | sim | 002 | ≥ `baixaGerente` | `alcBaixa2`, `cob.alcBaixa2` |
| `alcada.baixaNivel1` | 3 | nível | — | não | 002 | 1–5 | `cob.alcBaixaNivel1` |
| `alcada.baixaNivel2` | 5 | nível | — | não | 002 | ≥ nível 1 | `cob.alcBaixaNivel2` |
| `alcada.baixaNivel3` | 5 | nível | — | não | 002 | ≥ nível 2 | `cob.alcBaixaNivel3` |
| `alcada.acordoNivelPadrao` | 2 | nível | — | não | 002 | 1–5 | novo (regra da 002 RN de acordo) |
| `alcada.acordoNivelFora` | 3 | nível | — | não | 002 | ≥ padrão | novo |
| `alcada.emailAprovaNivel` | 2 | nível | — | não | 002 | 1–5 | novo |

### Tabelas de alçada (como as chaves se combinam)

Nível da pessoa = `CC_MEMBRO.NIVEL` (Agente/Analista 1 · Supervisor 2 · Gerente 3 · Diretoria 5 · Jurídico 0). Vale sempre: **quem propôs não decide** e a alçada é relida no servidor.

**Concessão e renovação de crédito** (004, as três carteiras; valor = maior entre o limite proposto e o limite aprovado na decisão — sem proposta, o valor solicitado; na renovação, o limite vigente; gravado em `CC_DECISAO.VALOR_ALCADA`)

| Faixa | Privada / Estética | Pública | Nível exigido | Rótulo gravado |
|---|---|---|---|---|
| 1 | até 50.000 | até 100.000 | `alcada.nivelSupervisor` | Supervisor |
| 2 | até 500.000 | até 1.000.000 | `alcada.nivelGerente` | Gerente |
| 3 | até 2.000.000 | (não existe) | `alcada.nivelComiteRegional` | Comitê regional |
| 4 | acima | acima de 1.000.000 | `alcada.nivelComiteExecutivo` | `alcada.concRotuloTopo` |

Exceção ao motor (limite aprovado acima do sugerido, rating ajustado, alerta de fraude): nível `alcada.nivelComiteCredito`, rótulo "Comitê de crédito", com justificativa.

**Pedido acima do limite** (004; excesso = valor do pedido + utilizado − limite)

| Condição (primeira que casar) | Nível | Rótulo |
|---|---|---|
| atraso do cliente > `alcada.pedAtrasoComiteDias` | `alcada.nivelComiteCredito` | Comitê de crédito |
| excesso ≤ `pedSupPct` % do limite **e** ≤ `pedSupValor` | `alcada.nivelSupervisor` | Supervisor |
| excesso ≤ `pedGerPct` % | `alcada.nivelGerente` | Gerente |
| excesso ≤ `pedDirPct` % | `alcada.nivelDiretorFinanceiro` | Diretor financeiro (liberação crítica) |
| acima | `alcada.nivelComiteCredito` | Comitê de crédito (liberação crítica) |

Pedido dentro do teto flexível do cliente (`flex.*`) segue a mesma tabela; a diferença é só o indicador `DENTRO_REGRA`. Pedido acima do teto flexível também segue a tabela (P-45). Comitê regional com nível 3: o Gerente decide sozinho até `alcada.concRegional` (P-46).

**Baixa como perda** (002; exige parecer do Jurídico antes da decisão)

| Valor | Nível | Rótulo |
|---|---|---|
| até `alcada.baixaGerente` | `alcada.baixaNivel1` | Gerente |
| até `alcada.baixaDiretor` | `alcada.baixaNivel2` | Diretor financeiro |
| acima | `alcada.baixaNivel3` | Diretoria |

**Acordo de cobrança** (002)

| Condição | Nível |
|---|---|
| entrada ≥ `cob.acordoEntradaMinPct`, parcelas ≤ `cob.acordoMaxParcelas` e débito ≤ `cob.acordoValorGerente` | `alcada.acordoNivelPadrao` |
| qualquer condição fora do padrão | `alcada.acordoNivelFora`; débito acima de `cob.acordoValorGerente` exige garantia descrita |

**Outras:** aprovar e-mail da fila — `alcada.emailAprovaNivel` · ajuste manual de rating — superior hierárquico do analista (sem chave) · envio do dossiê ao Jurídico — `jur.envioNivelMin` · acordo judicial acima de `jur.acordoAlcadaValor` — `jur.acordoAlcadaNivel` · validar modelo com efeito legal — cargo Jurídico ou `com.modeloValidaNivel`.

## 8. `pdd.*` — provisão por faixa de atraso (dona 001; calcula a 006 e o painel da 002)

| Chave | Padrão | Faixa | Carteira | Vig. | Usam | Era |
|---|---|---|---|---|---|---|
| `pdd.f0` | 0,5 | a vencer | sim | sim | 002, 006 | `pdd0` |
| `pdd.f1` | 3 | 1–30 | sim | sim | 002, 006 | `pdd1` |
| `pdd.f2` | 10 | 31–60 | sim | sim | 002, 006 | `pdd2` |
| `pdd.f3` | 30 | 61–90 | sim | sim | 002, 006 | `pdd3` |
| `pdd.f4` | 50 | 91–180 | sim | sim | 002, 006 | `pdd4` |
| `pdd.f5` | 100 | acima de 180 | sim | sim | 002, 006 | `pdd5` |

Unidade %. Validação: 0–100 e não decrescente de `f0` a `f5`.

## 9. `limite.*` — política de limite (dona 004)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `limite.folga` | 1,2 | fator | sim | não | 004 | 1–3 | `polFolga` |
| `limite.novoPct` | 10 | % | sim | não | 004 | 0–100 | `polNovoPct` |
| `limite.tetoPct` | 30 | % | sim | não | 004 | 0–100 | `polTetoPct` |
| `limite.plPct` | 10 | % | sim | não | 004 | 0–100 | `polPLPct` |
| `limite.pesoSerasa` | 60 | % | sim | não | 004 | 0–100 | `pesoSerasa` |
| `limite.concMax` | 10 | % | sim | não | 004, 006 | 0–100 | `concMax` |
| `limite.docF1` | 100000 | R$ | sim | não | 004 | < `docF2` | `docF1` |
| `limite.docF2` | 500000 | R$ | sim | não | 004 | | `docF2` |
| `limite.consultaValidadeDias` | 30 | d | sim | não | 004 | 1–365 | `consValid` |
| `limite.fraudeMeses` | 12 | m | sim | não | 004 | 1–120 | `fraudeMeses` |
| `limite.fraudePct` | 50 | % | sim | não | 004 | 0–1000 | `fraudePct` |
| `limite.lcMin` | 1 | índice | sim | não | 004 | ≥ 0 | `finLcMin` |
| `limite.divEbitdaMax` | 3 | índice | sim | não | 004 | ≥ 0 | `finDivEbitdaMax` |
| `limite.fonteDescasDias` | 15 | d | sim | não | 004 | ≥ 0 | `fonteDescasDias`, `fpDescasamentoDias` |

## 10. `score.*` — score comportamental (dona 004)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `score.semHistorico` | 700 | pts | sim | não | 004 | 0–1000 | `compSemHist` |
| `score.penalDia` | 10 | pts/dia | sim | não | 004 | ≥ 0 | `compPenalDia` |
| `score.penalMax` | 600 | pts | sim | não | 004 | 0–1000 | `compPenalMax` |
| `score.bonusRecorrente` | 50 | pts | sim | não | 004 | ≥ 0 | `compBonusRecorrente` |
| `score.penalInativo` | 50 | pts | sim | não | 004 | ≥ 0 | `compPenalInativo` |

## 11. `farol.*` — semáforo de rating (dona 004)

Cortes (carteira: sim; sem vigência). Score: maior ou igual ao corte dá a faixa. Atraso: até o corte dá a faixa.

| Chave | Padrão | Un. | Era | | Chave | Padrão | Un. | Era |
|---|---|---|---|---|---|---|---|---|
| `farol.scoreAA` | 800 | pts | `farolAA` | | `farol.atrasoA` | 5 | d | `farolAtrA` |
| `farol.scoreA` | 600 | pts | `farolA` | | `farol.atrasoB` | 15 | d | `farolAtrB` |
| `farol.scoreB` | 400 | pts | `farolB` | | `farol.atrasoC` | 30 | d | `farolAtrC` |
| `farol.scoreC` | 200 | pts | `farolC` | | `farol.atrasoD` | 45 | d | `farolAtrD` |

Política por faixa (`farol.<faixa><Item>`; era `farol<FAIXA><Item>`):

| Faixa | `Fmin` (% do limite do motor, mínimo) | `Fmax` (% máximo) | `Teto` (% do faturamento) | `Prazo` (dias) | `Inad` (% esperada) |
|---|---|---|---|---|---|
| `aa` | `farol.aaFmin` 100 | `farol.aaFmax` 120 | `farol.aaTeto` 30 | `farol.aaPrazo` 60 | `farol.aaInad` 1 |
| `a` | `farol.aFmin` 100 | `farol.aFmax` 100 | `farol.aTeto` 25 | `farol.aPrazo` 45 | `farol.aInad` 2 |
| `b` | `farol.bFmin` 70 | `farol.bFmax` 90 | `farol.bTeto` 20 | `farol.bPrazo` 42 | `farol.bInad` 5 |
| `c` | `farol.cFmin` 0 | `farol.cFmax` 50 | `farol.cTeto` 15 | `farol.cPrazo` 35 | `farol.cInad` 10 |
| `d` | — | — | — | — | `farol.dInad` 20 |

Validação: scores decrescentes de AA a C; atrasos crescentes de A a D; `Fmin ≤ Fmax`. Faixa E = abaixo de `scoreC` ou acima de `atrasoD` (sem política: não concede).

## 12. `cred.*`, `flex.*`, `saude.*` — gestão do crédito (dona 004)

| Chave | Padrão | Un. | Carteira | Vig. | Usam | Validação | Era |
|---|---|---|---|---|---|---|---|
| `cred.validadeMeses` | 3 | m | sim | não | 004, 005 | 1–36 | `validadeMeses`, `credValidadeMeses` |
| `cred.comprasRecorrentes` | 2 | qtd | sim | não | 004 | ≥ 1 | `comprasRecorrentes`, `credComprasRecorrentes` |
| `cred.diasSemCompra` | 90 | d | sim | não | 004, 001 | ≥ 1 | `diasSemCompra` |
| `cred.revAtrasoDias` | 15 | d | sim | não | 004 | ≥ 1 | `revAtraso` |
| `cred.revUsoPct` | 90 | % | sim | não | 004 | 0–1000 | `revUso` |
| `cred.revValidadeDias` | 15 | d | sim | não | 004 | ≥ 1 | gatilho `VALIDADE_15D` (novo) |
| `cred.baixoRiscoScore` | 600 | pts | sim | não | 004 | 0–1000 | `baixoRiscoScore` |
| `cred.baixoRiscoRating` | B | op | sim | não | 004 | AA–E | `baixoRiscoRating` |
| `cred.calibMinMeses` | 12 | m | — | não | 004 | 1–60 | `calibMinMeses` |
| `cred.calibRevisaoMeses` | 3 | m | — | não | 004 | 1–24 | `calibMeses` |
| `cred.riscoCorteRating` | C | op | sim | não | 004 | AA–E | `riscoCorteRating` |
| `flex.riscoMinimoPct` | 20 | % | sim | não | 004 | ≥ `riscoBaixoPct` | `flexMin` |
| `flex.riscoBaixoPct` | 10 | % | sim | não | 004 | ≥ 0 | `flexBaixo` |
| `flex.metaTaxaPct` | 30 | % | — | não | 004, 006 | 0–100 | `flexMetaTaxa` |
| `flex.metaConfPct` | 90 | % | — | não | 004, 006 | 0–100 | `flexMetaConf` |
| `saude.riscoDias` | 30 | d | sim | não | 004, 006 | ≥ 1 | `saudeRiscoDias`, `saudeDiasRisco` |
| `saude.usoAtencaoPct` | 90 | % | sim | não | 004, 006 | 0–1000 | `saudeUsoAtencao` |
| `saude.indiceVerde` | 80 | % | — | não | 004, 006 | > `indiceVermelho` | `saudeIndiceVerde` |
| `saude.indiceVermelho` | 60 | % | — | não | 004, 006 | 0–100 | `saudeIndiceVermelho` |

Na carteira `PUBLICA` o motor aplicado é o do órgão (`pubMotor.*`); `limite.*`, `score.*`, `farol.*`, `flex.*` e `saude.*` não são lidos (exceção D-05). `cred.validadeMeses`, `cred.diasSemCompra` e `cred.comprasRecorrentes` valem para as três.

## 13. `meta.*` e `painel.*` — metas e leitura dos painéis

| Chave | Padrão | Un. | Carteira | Vig. | Usam (dona) | Validação | Era |
|---|---|---|---|---|---|---|---|
| `meta.tempoDecisaoDias` | 9 | d | — | não | 004, 006 | ≥ 1 | `metaTempo` |
| `meta.slaPct` | 85 | % | — | não | 004, 006 | 0–100 | `metaSla` |
| `meta.aprovacaoMinPct` | 60 | % | — | não | 004, 006 | < máx. | `metaAprMin` |
| `meta.aprovacaoMaxPct` | 85 | % | — | não | 004, 006 | 0–100 | `metaAprMax` |
| `meta.conversaoPct` | 60 | % | — | não | 002, 006 | 0–100 | `metaConv` |
| `meta.promessaPct` | 70 | % | — | não | 002, 006 | 0–100 | `metaProm` |
| `meta.inadPct` | 5 | % | — | não | 006, 002 | 0–100 | `metaInad` |
| `meta.vencido90Pct` | 2 | % | — | não | 006 | 0–100 | `metaV90` |
| `meta.pddPct` | 3 | % | — | não | 006 | 0–100 | `metaPdd` |
| `meta.recuperacaoPct` | 80 | % | — | não | 006, 002 | 0–100 | `metaRecup` |
| `meta.inadIndiceAlerta` | 10 | % | — | não | 006 | 0–100 | `inadIdxAlerta` |
| `painel.hhiModerado` | 1500 | pts | — | não | 006 | < `hhiAlto` | `hhiModerado` |
| `painel.hhiAlto` | 2500 | pts | — | não | 006 | ≤ 10000 | `hhiAlto` |
| `painel.sincAtrasoMin` | 30 | min | — | não | 006 | ≥ `base.syncIntervaloMin` | `painelSincAtrasoMin` |

Validação cruzada: o grupo `meta` tem três donas (004, 002, 006) e o `alcada` duas (004, 002); `fundir` aceita um `validarConjunto` por grupo, então **a 004 declara os dois** (`meta`: `aprovacaoMinPct < aprovacaoMaxPct`; `alcada`: as ordens de 03 §7, inclusive as chaves da 002), e regra cruzada nova de `meta.*` da 002 ou da 006 entra no validador da 004. O `painel` é da 006 (`hhiModerado < hhiAlto`, `sincAtrasoMin ≥ base.syncIntervaloMin`).

## 14. `jur.*` — Jurídico (dona 003)

Todas: carteira `—`, sem vigência, usadas pela 003 (as marcadas também por outra spec).

| Chave | Padrão | Un. | Validação | Era |
|---|---|---|---|---|
| `jur.prazoInicialDu` | 5 | du | 1–60 | `JUR_PRAZO_INICIAL_DU` |
| `jur.envioNivelMin` | 3 | nível | 1–5 | `JUR_ENVIO_NIVEL_MIN` |
| `jur.prazoVermelhoDias` | 3 | d | < amarelo | `JUR_PRAZO_VERMELHO_DIAS` |
| `jur.prazoAmareloDias` | 7 | d | | `JUR_PRAZO_AMARELO_DIAS` |
| `jur.prazoCriticoDias` | 7 | d | ≥ 1 | `JUR_PRAZO_CRITICO_DIAS` |
| `jur.paradoAtencaoDias` | 30 | d | < crítico | `JUR_PARADO_ATENCAO_DIAS` |
| `jur.paradoCriticoDias` | 60 | d | | `JUR_PARADO_CRITICO_DIAS` |
| `jur.custoMetaPct` | 10 | % | > `custoBomPct` | `JUR_CUSTO_META_PCT`, `jurCustoMetaPct` |
| `jur.custoBomPct` | 5 | % | ≥ 0 | `JUR_CUSTO_BOM_PCT` |
| `jur.dossieParadoDias` | 10 | d | ≥ 1 | `JUR_DOSSIE_PARADO_DIAS` |
| `jur.custoAPagarAntigoDias` | 15 | d | ≥ 1 | `JUR_CUSTO_A_PAGAR_ANTIGO_DIAS` |
| `jur.acordoEntradaMinPct` | 20 | % | 0–100 | `JUR_ACORDO_ENTRADA_MIN_PCT`, `jurEntradaPct` |
| `jur.acordoParcelasMax` | 5 | qtd | 1–60 | `JUR_ACORDO_PARCELAS_MAX`, `jurMaxParcelas` |
| `jur.acordoAlcadaValor` | 50000 | R$ | > 0 | `JUR_ACORDO_ALCADA_VALOR`, `jurAlcAcordo` |
| `jur.acordoAlcadaNivel` | 3 | nível | 1–5 | `JUR_ACORDO_ALCADA_NIVEL` |
| `jur.honorariosPct` | 10 | % | 0–100 | `JUR_HONORARIOS_PCT`, `jurHonorariosPct` |
| `jur.notifPrazoDias` | 15 | d | 1–90 (usada também pela 002 no modelo `COB_EXTRAJUDICIAL`) | `JUR_NOTIF_PRAZO_DIAS`, `notifPrazoDias` |
| `jur.faixasValor` | 10000;50000;100000 | lista R$ | crescente, separada por `;` | `JUR_FAIXAS_VALOR` |
| `jur.indAjuizarAtencaoPct` | 40 | % | 0–100 | `JUR_IND_AJUIZAR_ATENCAO_PCT` |
| `jur.indRecupBomPct` | 30 | % | > ruim | `JUR_IND_RECUP_BOM_PCT` |
| `jur.indRecupRuimPct` | 10 | % | | `JUR_IND_RECUP_RUIM_PCT` |
| `jur.indRetornoBom` | 3 | vezes | > ruim | `JUR_IND_RETORNO_BOM` |
| `jur.indRetornoRuim` | 1 | vezes | | `JUR_IND_RETORNO_RUIM` |
| `jur.indSemAndBomDias` | 30 | d | < ruim | `JUR_IND_SEM_AND_BOM_DIAS` |
| `jur.indSemAndRuimDias` | 60 | d | | `JUR_IND_SEM_AND_RUIM_DIAS` |
| `jur.indParadosBomPct` | 20 | % | < ruim | `JUR_IND_PARADOS_BOM_PCT` |
| `jur.indParadosRuimPct` | 50 | % | | `JUR_IND_PARADOS_RUIM_PCT` |
| `jur.indExitoBomPct` | 70 | % | > ruim | `JUR_IND_EXITO_BOM_PCT` |
| `jur.indExitoRuimPct` | 40 | % | | `JUR_IND_EXITO_RUIM_PCT` |
| `jur.indEditalBomPct` | 15 | % | < ruim | `JUR_IND_EDITAL_BOM_PCT` |
| `jur.indEditalRuimPct` | 30 | % | | `JUR_IND_EDITAL_RUIM_PCT` |

## 15. `pub.*` — nota fiscal de órgão (dona 005) — só existe no público

| Chave | Padrão | Un. | Vig. | Validação | Era |
|---|---|---|---|---|---|
| `pub.rpConf` | 3 | du após o protocolo | não | ≥ 1 | `rpConf` |
| `pub.rpL1` | 1 | du após "liquidar até" | não | `L1 < L2 < L3` | `rpL1` |
| `pub.rpL2` | 5 | du | não | | `rpL2` |
| `pub.rpL3` | 10 | du | não | | `rpL3` |
| `pub.rpG1` | 1 | du após "pagar até" | não | `G1 < G2 < G3 < G4 < G5` | `rpG1` |
| `pub.rpG2` | 5 | du | não | | `rpG2` |
| `pub.rpG3` | 15 | du | não | | `rpG3` |
| `pub.rpG4` | 30 | du | não | | `rpG4` |
| `pub.rpG5` | 90 | du | não | | `rpG5` |
| `pub.rpFeitoAntecedencia` | 2 | du | não | ≥ 0 | `rpFeitoAntecedencia` |
| `pub.pequenoValor` | 65492,11 | R$ | **sim** (62.725,59 desde 2025-01-01; 65.492,11 desde 2026-01-01 — semeadas por `vigencias`, 01 §9); vale o limite em vigor na **emissão da NF** (P-47) | > 0 | `pequenoValor` |
| `pub.contratoVigDias` | 60 | d | não | ≥ 1 | `contratoVigDias` |
| `pub.contratoSaldoPct` | 20 | % | não | 0–100 | `contratoSaldoPct` |
| `pub.nfDataCorte` | 2026-01-01 | data | não | data válida | `nfPubDataCorte` |
| `pub.certAlertaDias` | 15 | d | não | ≥ 1 | `certAlertaDias` |

Carteira: `—` (só há uma). Usam: 005; `pub.certAlertaDias` e `pub.contratoVigDias` também o resumo que a 005 entrega à 006.

## 16. `pubMotor.*` — motor do órgão, nota 0–100 e P1–P4 (dona 005)

Todas: pontos (`pts`) salvo indicação; carteira `—`; sem vigência; usadas só pela 005. Era: `pub` + o mesmo sufixo (ex.: `pubCapagA` → `pubMotor.capagA`).

| Bloco | Chaves e padrão |
|---|---|
| CAPAG (até 30) | `pubMotor.capagA` 30 · `pubMotor.capagB` 22 · `pubMotor.capagC` 10 · `pubMotor.capagD` 0 · `pubMotor.capagNd` 12 · `pubMotor.capagUniao` 30 · `pubMotor.capagSemFed` 30 · `pubMotor.capagSem` 12 |
| Limite de pessoal (%) | `pubMotor.limPessoalMun` 54 · `pubMotor.limPessoalEst` 49 · `pubMotor.limPessoalFed` 37,9 |
| Despesa com pessoal | `pubMotor.pessoalF1` 90 (% do limite) → `pubMotor.pessoalP1` 15 · `pubMotor.pessoalF2` 95 → `pubMotor.pessoalP2` 10 · até 100% → `pubMotor.pessoalP3` 5 · acima de 100% do limite → 0 (definição do sistema, sem chave; é também a trava `pessoalAcima`) · `pubMotor.pessoalSemFed` 15 · `pubMotor.pessoalSem` 7 |
| CAUC | `pubMotor.caucRegular` 10 · `pubMotor.caucPendencia` 3 · `pubMotor.caucSem` 5 |
| Fonte do recurso | `pubMotor.fonteSus` 15 · `pubMotor.fonteVinculada` 10 · `pubMotor.fonteOutra` 6 |
| Histórico de pagamento | `pubMotor.histPontual` 20 · `pubMotor.histEventuais` 12 · `pubMotor.histFrequentes` 4 · `pubMotor.histSem` 10 |
| Atraso médio | `pubMotor.atrasoF1` 15 d → `pubMotor.atrasoP1` 18 · `pubMotor.atrasoF2` 45 d → `pubMotor.atrasoP2` 12 · `pubMotor.atrasoF3` 90 d → `pubMotor.atrasoP3` 6 · acima → `pubMotor.atrasoP4` 2 · `pubMotor.atrasoTeto` 4 |
| Operação | `pubMotor.empenho` 5 · `pubMotor.contrato` 5 · `pubMotor.edital` 5 · `pubMotor.fimMandato` 5 |
| Corte do rating (nota ≥) | `pubMotor.corteP1` 80 · `pubMotor.corteP2` 60 · `pubMotor.corteP3` 40 (abaixo = P4) |
| Fator de exposição | `pubMotor.fatorP1` 1 · `pubMotor.fatorP2` 0,8 · `pubMotor.fatorP3` 0,5 · `pubMotor.fatorP4` 0,25 |

Validação: cada ponto ≥ 0; `pessoalF1 < pessoalF2`; `atrasoF1 < atrasoF2 < atrasoF3`; `corteP1 > corteP2 > corteP3`; fatores entre 0 e 1.

---

## 17. Nomes antigos que deixam de ser parâmetro (de → para)

| Era | Vai para | Motivo |
|---|---|---|
| `slaRecebida`, `slaCadastral`, `slaCredito`, `slaComite`, `slaFormalizacao`, `slaLiberacao`, `slaReanalise`, `slaPedRetido`, `slaPedAnalise`, `slaPedAlcada` (004) | `KB_FASE.SLA_HORAS` dos quadros de concessão e `pedidos-limite` | SLA é do quadro (arquitetura §8.2) |
| `pubSlaRecebimento`, `pubSlaAnalise`, `pubSlaAprovacao`, `cobPubSla*` (005) | `KB_FASE.SLA_HORAS` de `concessao-publica` e `cobranca-publica` | idem |
| `cob.negociacaoSla` (002) | `KB_FASE.SLA_HORAS` da fase `negociacao` (240 h) | idem |
| `JUR_NOTIF_BANCO`, `JUR_NOTIF_REPRESENTANTE`, `JUR_NOTIF_CARGO` | colunas de `CC_FILIAL_CREDORA` | dado por filial, não política |
| `JUR_CARGA_CONCLUIDA` | `CC_ESTADO['jur.cargaConcluida']` | estado, não política |
| `posProtestoDias` (Anexo A) | sai | nenhuma spec usa; volta quando uma regra pedir |
| `rpL1…rpG5` duplicadas na 001 e na 005 | `pub.rp*` (dona 005) | uma chave por regra |
| `alcPub1`, `alcPub2`, `multaPub`, `jurosPub` | valor da carteira `PUBLICA` em `alcada.concSupervisor`, `alcada.concGerente`, `enc.multa`, `enc.juros` | D-05 |
| SF `ccReguaParametrosSalvar`, `ccCobrancaParametros`, `ccParametrosCredito` | `ccBaseParametroSalvar` / `ccBaseParametroListar` | um editor e um leitor (04) |

## 18. O que cada carteira define hoje (D-05)

| Carteira | Valores próprios semeados | Não usa |
|---|---|---|
| `PRIVADA` | é a linha padrão de todas as chaves | `pub.*`, `pubMotor.*` |
| `ESTETICA` | nenhum (P-03: o gestor informa quais mudam; a tela de parâmetros já aceita) | `pub.*`, `pubMotor.*` |
| `PUBLICA` | `enc.multa` 0 · `enc.juros` 0,5 · `cob.promessaMaxUteis` 0 · `alcada.concSupervisor` 100.000 · `alcada.concGerente` 1.000.000 · `alcada.concRegional` 1.000.000 · `alcada.concRotuloTopo` Diretoria | `regua.*`, `cob.emailModo.*`, `limite.*`, `score.*`, `farol.*`, `flex.*`, `saude.*`, `crit.*` |
