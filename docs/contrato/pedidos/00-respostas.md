# Respostas do arquiteto aos pedidos das 7 specs (16/11/2026)

Uma seção por spec. Em cada uma: a decisão de cada pedido (aceito · aceito com alteração · recusado), o motivo em uma linha e onde está no contrato; depois, **o que o plano desta spec precisa mudar** — só onde a resposta difere do que o plano seguiu ou onde uma decisão transversal mexe nele. O que não está na lista fica como o plano escreveu (troque só "pendente do arquiteto (…)" pela referência do contrato).

## Decisões transversais (valem para todas)

| # | Decisão | Onde |
|---|---|---|
| DT-29 | **Teto por clique = 20 execuções** (lib e aninhadas inclusive). Exceção nomeada única: `ccJurDossieEnviar` ≤ 30. Lote: a SF declara quantos itens aceita por chamada para caber em 20 e a tela chama em sequência, com progresso. No clique fica o domínio, a auditoria e o efeito no card aberto (movimento, nota, capa); só o efeito em **outro** card e a marcação de item em lote vão para a conciliação da rotina. Abrir tela ≤ 6 **por bloco** (tela escolhida) | 01 §10 · 00 DT-29 |
| DT-30 / D-06 | **Quem administra = nível ≥ 3 ou marca `ADMIN`** (`PODE_ADMINISTRAR`, `podeAdministrar(m)`). `N2`/`N3` de 04 aceitam a marca (`NIVEL_MIN(n)`); alçada nunca. `ADM` em 04 passa a significar isso. Marcar `ADMIN` só quem tem a marca. Gerente, Diretoria e marca `ADMIN` são administradores dos 8 quadros | 01 §4, §5 · 04 §0 · 05 §2 · 00 §2 |
| DT-31 | Enumeração: vale a de 02; SF recebe e devolve o valor da coluna. Corrigidos em 04/05: acordo `ATIVO`/`QUITADO`; parecer `DESFAVORAVEL`; item do dossiê `NA`; motivo `BAIXA_PERDA`; parcela judicial `ABERTA`/`PAGA` (`A_CONFIRMAR` só na carga); acordo judicial `AGUARDANDO`/`ANDAMENTO`/`QUITADO`/`RECUSADO` | 02 · 04 §2, §3, §8 · 05 §8 |
| DT-32 | Formatos fixos de `QUADROS`, `gancho(slug)` (texto com cláusulas `WHEN … THEN '…'`) e `registrarExtensao()` | 01 §14 |
| DT-33 | Tela escolhida não perde função por falta de leitura: entrada/saída ampliadas quando o dado existe | 04 (cada SF) |
| P-31…P-47 | Pendências novas do gestor numeradas, com o padrão | 00 §4 |

Smoke: onde o plano afirma `execucoes() ≤ 12` num clique, pode manter (cabe no teto); onde dividiu a operação só para caber em 12, desfaça conforme a lista da spec. O teto do contrato é 20 (30 em `ccJurDossieEnviar`).

---

## 001-base

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PA-01 | aceito com alteração | D-06: administrar = nível ≥ 3 **ou** `ADMIN` (não "só Administrador"); (b) aceito: `N2`/`N3` aceitam a marca, alçada não | 01 §4, §5; 04 §0, §1 (`ADM`) |
| PA-02 | aceito | o dado existe (agente, ficha, posição por BU) | 04 §1 `ccBaseClienteListar` |
| PA-03 | aceito | tela escolhida; contatos com `BUSCA` normalizada (coluna nova) | 04 §1 `ccBaseContatoListar`/`ccBaseContatoTotal`; 02 `CC_CONTATO_CLIENTE.BUSCA` |
| PA-04 | aceito | desligado `'PENDENTE'` | 04 §1 `ccBaseContatoSalvar` |
| PA-05 | aceito | tela escolhida; `CC_SINCRONIZACAO` tem os dados | 04 §1 `ccBaseSincronizacaoListar`/`Total`, `ccBaseSincronizacaoStatus` |
| PA-06 | aceito | `DELETE` e validação não cabem na mesma SQL | 04 §1 internas `ccEscBaseFeriadoRemover`, `ccEscBaseModeloValidar` |
| PA-07 | aceito com alteração | `gerarAno` aceito, mas o lote precisa de interna própria: `ccEscBaseFeriadosInserir` (`INSERT IGNORE`, ≤ 20) | 04 §1 `ccBaseFeriadoSalvar`, internas |
| PA-08 | aceito | busca exata ao vivo, só para quem vê tudo | 04 §1 `ccBaseClienteFicha`, `ccBaseWinthorCliente` |
| PA-09 | aceito | o catálogo tem o padrão | 04 §1 `ccBaseParametroListar`, `ccBaseParametroSalvar` |
| PA-10 | aceito | lote 20; `auditarLinhas` serve aos lotes de todos | 01 §7, §10; 04 §1 internas |
| PA-11 | aceito com alteração | vale 04, com D-06: `MATERIAL` = `ADM`, `CERTIDAO` = `N2` (marca aceita) | 02 `CC_ANEXO`; 04 §1 |
| PA-12 | aceito | mesmo limite do aviso | 01 §11 decisão 2 |
| PA-13 | aceito | item S-15 | 01 §15 |
| PA-14 | aceito | roteiro agora, T-002 fecha antes de publicar | 01 §15 |
| PA-15 | aceito com alteração | `gancho()` em texto, como proposto; em `QUADROS` os nomes seguem as colunas `KB_*` (`label`, `slaHoras`, `noCard`, `condicao`, `capa`) e `final` não se declara (= `tipo <> 'comum'`) | 01 §14 |
| PA-16 | aceito | contagem barata, dado existe | 04 §1 `ccBaseMembroListar` |
| PA-17 | aceito | exclusão fixa só `DTCANCEL` até a S-12 | 01 §11 |
| C (7 registros) | aceito como está no plano | troca do topo entrou em `ccBaseMembroSalvar` | 04 §1 |

**O que o plano desta spec precisa mudar**

1. **D-06 (PA-01 a):** no `plan.md` (validações de `ccBaseMembroSalvar`, `ccBaseBuSalvar`, `ccBaseBuDeptoSalvar`, `ccBaseParametroSalvar`, `ccBaseFeriadoSalvar`, `ccBaseModeloSalvar`, `ccBaseBuDeptoListar`, `ccBaseEquipeConferir`, `ccBaseAuditoriaListar`, `ccBaseSincronizacaoListar`, conferência do Winthor em `/admin/sincronizacao`) troque "Administrador `[PA-01]`" por `PODE_ADMINISTRAR` (nível ≥ 3 ou `ADMIN`). Na `spec.md`, C-019, C-027, RF-013, RF-023, RF-028, RF-031, RF-035 voltam a "Gerente, Diretoria ou Administrador". Smoke: Gustavo (Gerente, sem marca) **passa** nos cadastros; Nara (Agente + `ADMIN`) passa; Sérgio (Supervisor) é recusado. Teste novo: Gustavo tenta marcar `admin` em alguém → recusa ("só quem tem a marca"); Nara consegue.
2. **`guarda.mjs`:** exportar `PODE_ADMINISTRAR` e `NIVEL_MIN(n)`; preâmbulo exporta `podeAdministrar(m)` e `auditarLinhas()`.
3. **PA-03:** coluna `CC_CONTATO_CLIENTE.BUSCA` (nome + e-mail + telefone, maiúscula sem acento) gravada por `ccEscBaseContatoInserir`/`Atualizar`; a busca 'MARTA' do C-022 usa essa coluna.
4. **PA-07:** `gerarAno` grava por `ccEscBaseFeriadosInserir` (interna nova), não por `ccEscBaseFeriado`.
5. **Passo `ACESSOS`:** `ADMINS_IDS` de cada quadro = `USER_ID` de quem tem `PODE_ADMINISTRAR` (antes: só `ADMIN`). Smoke: Gustavo aparece em `ADMINS_IDS` dos 8 quadros.
6. **007 PA-10:** `ccBaseParametroListar` **não** junta o fragmento `EU` (funciona sem sessão, chamada aninhada pela 007); `VIGENCIA_INICIO` é a do valor efetivo na carteira pedida; saída inclui `PADRAO`, `MINIMO`, `MAXIMO`, `USADO_POR`.
7. **007 PA-12:** exportar `GRUPOS_PARAMETRO` (`{ codigo, nome, ordem }`, todos os grupos de 03) em `frontend/src/lib/base/parametros.ts`; a tela de parâmetros usa o nome.
8. **007 PA-13:** `tempo.mjs` exporta `KB_BRASILIA('<coluna>')`.
9. **005 PA-11 e 03 §18:** `setup-backend.mjs` aceita `vigencias: [{ inicio, valor }]` e `carteiras: { … }` na definição da chave (01 §9).
10. **007 PA-18:** `setup-backend.mjs` e a montagem de `ccPodeMover` toleram a ausência de `lib/parametros`, `lib/modelos` e `lib/quadros` de uma spec.
11. **`semearQuadro()` e montagem do gancho:** seguir o formato de 01 §14 (propriedades `label`, `slaHoras`, `noCard`, `condicao` com chave, `capa`; `FINAL` derivado do `tipo`; quadro com texto de gancho vazio não entra no `CASE`; dois arquivos para o mesmo quadro na ordem 004 → 005). `extensoes.ts`: `registrarExtensao`/`extensoesDe` com a regra de combinação de 01 §14 (inclui `podeMover`).
12. **Teto por clique:** `RNF-006` e as afirmações de C-014/C-018/C-024 podem ficar em ≤ 12; o contrato é 20.

---

## 002-cobranca-privada

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PA-01 | aceito | DT-31: vale 02 (`ATIVO`, `QUITADO`) | 04 §2 `ccCobAcordoDecidir`, `ccCobAcordoParcelaPagar`; 04 §8 |
| PA-02 | aceito | DT-31: `DESFAVORAVEL` | 04 §2 `ccCobBaixaParecer` |
| PA-03 | aceito | regra do artefato; a régua não deixa o indicador sempre 100% | 02 `CC_ACAO_REGUA.NO_PRAZO`; 05 §3.6; 04 §2 `ccCobAgendaListar` |
| PA-04 | aceito | fila para `MANUAL` e `APROVAR`; envio avulso fecha a linha | 05 §3.6 linha 10; 02 `CC_EMAIL_FILA`; 04 §2 `ccCobEmailEnviar` |
| PA-05 | aceito | agente propõe (spec, artefato, tela) | 04 §2 `ccCobBaixaPropor` |
| PA-06 | aceito | (a) baixa parcial mantém o caso; (b) não reabre enquanto o saldo baixado está no Winthor (com `ponytail:`) | 04 §2 `ccCobBaixaDecidir`; 05 §3.6 linha 1; 02 `CC_COBRANCA.VALOR_BAIXADO` |
| PA-07 | aceito | preventiva não entra em negociação | 04 §8 |
| PA-08 | aceito | dado existe | 04 §2 `ccCobContatoListar` |
| PA-09 | aceito | tela escolhida (aba "Clientes") | 04 §2 `ccCobCasoListar` / `ccCobCasoTotal` |
| PA-10 | aceito | regra do artefato | 04 §2 `ccCobAgendaListar` (`FICHA_REVISAR`) |
| PA-11 | aceito | capa escolhida; custo zero | 05 §3.4 (`acao_fase`, `ultimo_contato`) |
| PA-12 | aceito | órgão isento do limite | 03 §5 `cob.promessaMaxUteis` (0–30, `PUB = 0`), §18 |
| PA-13 | aceito | numeradas P-34 a P-37 | 00 §4 |
| PA-14 | aceito como está no plano | valor atualizado só no card aberto | 05 §3.4 |
| PA-15 | aceito como está no plano | valores fixados no contrato | 04 §2 `ccCobBloqueioListar` |
| PA-16 | aceito como está no plano | colunas no plan; `ccCobPainelKpis`/`Agentes` ampliadas | 04 §2 |
| PA-17 | aceito como está no plano | com D-06 quem edita parâmetro é administrador do quadro e a renomeação passa; o aviso fica só de reserva | 05 §2, §3.1 |
| PA-18 | aceito como está no plano | `semCaso: true` | 04 §2 `ccCobEnviarJuridico` |
| PA-19 | aceito como está no plano | risco registrado; laço de implantação no sandbox, depois da S-13 | — |
| PA-20 | aceito | a coluna existe e a spec depende dela | 04 §2 `ccCobContatoRegistrar` (`data`) |
| PA-21 | aceito | parecer não depende de o cliente ter ido ao Jurídico | 04 §2 `ccCobBaixaParecer`, `ccCobCasoFicha`, `ccCobAgendaListar` |
| PA-22 | aceito | servidor relê o saldo | 04 §2 `ccCobAcordoPropor` |
| PA-23 | aceito | valores fixados | 04 §2 `ccCobEmailFilaListar` |
| PA-24 | aceito | DT-29: marcação de item em lote vai à conciliação | 05 §3.6 linha 13; 04 §2 `ccCobEmailFilaDecidir`, `ccCobEnviarJuridico` |

**O que o plano desta spec precisa mudar**

1. **DT-29:** `ccCobEmailFilaDecidir` aceita **até 2** ids por chamada (era 5; a conta de 3 esquecia a fila do lote e dava 21 — Fechamento 16/11); a tela de fila divide a seleção e chama em sequência com progresso. Conta do plan: 1 + 2 × (`ccEmailEnviar` 4 + contato `EMAIL_REGUA` 1 + ação 1) + fila do lote 1 + auditoria 1 = 15. Smoke do lote: 3 selecionados = 2 chamadas (2 + 1), cada uma ≤ 20; 3º id numa chamada → recusa "até 2".
2. **003 PJ-08 (novo na rotina):** `ccCobRotina` ganha a linha 14 de 05 §3.6 — caso aberto fora de `juridico` de cliente com processo ativo na mesma carteira (`CC_PROCESSO.ENCERRADO_EM` nulo e `DOSSIE_ENVIADO_EM` preenchido ou `ORIGEM` ≠ `COBRANCA`) vai para `juridico`, grava `JURIDICO_EM` (se nulo) e `PROCESSO_ID`, nota "Processo no Jurídico: <autos>". Vale nas três carteiras (no `PUBLICA` o caso é aberto pela 005, mas a fase `juridico` é movida aqui). Teste novo no smoke: processo criado por `ccJurProcessoCriar` para 2009 → depois de `rodarCron('ccRotina')` o card está em `juridico` (pula se a 003 não estiver publicada).
3. **005 PA-08:** em `ccCobCasoSincronizar`, a chave `etiquetas` do `capaJson` substitui só as etiquetas do chamador (`Acima de 2 meses`, `Pequeno valor`) e preserva as outras do card (`Promessa vencida`, `Baixa pendente`); `CAPA_ENVIADA` guarda o texto recebido sem reformatar; `capaJson = '{}'` não toca na capa; `desfecho` sem caso aberto não abre caso. Cenário de smoke correspondente no plan.
4. **D-06:** `ccCobBaixaPropor` = `caso` (já no plan); nenhuma escrita da 002 usa "só Administrador". `ccCobAcordoCancelar` (`N2`) aceita a marca `ADMIN`.
5. Nenhuma outra mudança: PA-01 a PA-24 seguem como o plano adotou.

---

## 003-juridico

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PJ-01 | aceito | DT-31: vale 02 — `NA`, `BAIXA_PERDA`, parcela `ABERTA`/`PAGA` (`A_CONFIRMAR` só da carga), acordo `AGUARDANDO`/`ANDAMENTO`/`QUITADO` (+ `RECUSADO`, PJ-09) | 02 §003; 04 §2 passo 2, §3; 05 §8 |
| PJ-02 | aceito | encerrar sem enviar é regra da spec | 04 §8 quadro `juridico` |
| PJ-03 | aceito com alteração | DT-29: teto 20; `ccJurDossieAbrir` (≈ 16) cabe; `ccJurDossieEnviar` é a única exceção (≤ 30); `ccJurCargaAplicar` aceita **1** processo por chamada (não 5) e a tela encadeia; RNF-003 "em até 60 min, com progresso" aceito | 01 §10; 04 §3 |
| PJ-04 | aceito | as contas conferem; 3001 fica com 31.087,25, cliente novo 3013 com 34.388,25; fórmula escrita | 06 §2.5; 03 §6 |
| PJ-05 | aceito | colunas existem | 04 §3 `ccJurProcessoSalvar`, `ccJurProcessoCriar` |
| PJ-06 | aceito | DT-33: tudo sai de tabelas da 003 e do cliente | 04 §3 `ccJurProcessoListar`, `ccJurIndicadores`, `ccJurAlertas`, `ccJurAcordoListar`, `ccJurCustoListar`, `ccJurCargaPendenciaListar` |
| PJ-07 | aceito com alteração | campos de capa e `Substabelecer` aceitos; `Prazo vencendo` e `Sem andamento` **saem** das etiquetas semeadas (ninguém as grava; o prazo relativo é da lib e os dias sem andamento ficam no cartão e nos alertas) | 05 §6 |
| PJ-08 | aceito com alteração | a cobrança vai a `juridico` pela **rotina da 002** (05 §3.6 linha 14), não por chamada aninhada nova (a carga estouraria o teto); a 003 só precisa marcar `NO_JURIDICO` | 05 §3.6; 04 §2 fluxo; 04 §3 `ccJurProcessoCriar`, `ccJurCargaAplicar` |
| PJ-09 | aceito com alteração | (a) e (b) como proposto; (c) recusa grava `RECUSADO` e o processo pode registrar outro acordo (sai o UQ de `CC_ACORDO_JUDICIAL.PROCESSO_ID`; um `AGUARDANDO`/`ANDAMENTO` por processo) | 02 `CC_ACORDO_JUDICIAL`; 04 §3 |
| PJ-10 | aceito | regra geral de seed em duas partes | 06 §2.3, §2.5 |
| PJ-11 | aceito | código da filial credora = `CODFILIAL` | 02 `CC_FILIAL_CREDORA.CODIGO`; 06 §2.2 |
| PJ-12 | aceito com alteração | D-06: `ADM` = nível ≥ 3 **ou** `ADMIN` (Nara entra) | 04 §3 `ccJurFilialCredoraSalvar`, `ccJurCargaConcluir` |
| PJ-13 | aceito | J-1…J-7 viram P-38…P-44 | 00 §4 |
| D (ciência) | aceito como está no plano | abas "Processo completo" e "Cobrança de origem" com os blocos em `conteudoDaFase` (escolha do usuário) | 05 §6 |

**O que o plano desta spec precisa mudar**

1. **PJ-03:** `ccJurCargaAplicar` recebe **1** processo por chamada (o plan aceitava até 5); a recusa de 2 ou mais processos vira teste. `ccJurCargaPrevia` continua com até 5. Smoke: `execucoes()` de uma aplicação ≤ 20; `ccJurDossieEnviar` ≤ 30; `ccJurDossieAbrir` ≤ 20.
2. **PJ-07:** em `lib/quadros/003-juridico.mjs` **não** semear as etiquetas `Prazo vencendo` e `Sem andamento` (ficam `Custo a pagar`, `Carga a conferir`, `Substabelecer`).
3. **PJ-08:** sai o risco R-03 do plan. `ccJurProcessoCriar` (com `clienteId > 0`), `ccJurProcessoVincularCliente` e `ccJurCargaAplicar` (com cliente casado) chamam `ccEscBaseClienteJuridico` (`NO_JURIDICO = TRUE`); a 003 **não** chama `ccCobEnviarJuridico` fora de `ccJurDossieEnviar`. Teste no smoke da 003: processo criado para cliente com caso de cobrança aberto → após `rodarCron('ccRotina')`, `ccCobSituacao` mostra `FASE_CHAVE = 'juridico'` (pula se a 002 não estiver publicada).
4. **PJ-09 (c):** `ccJurAcordoAprovar` com `aprovar = 0` grava `RECUSADO` (o plan mantinha `AGUARDANDO`). DDL: `CC_ACORDO_JUDICIAL` com IX (`PROCESSO_ID`) no lugar do UQ, e `ccEscJurAcordoInserir` com `NOT EXISTS` de acordo `AGUARDANDO`/`ANDAMENTO` do processo. `ccJurProcessoFicha.acordo` = o mais recente não `RECUSADO`. Teste: recusa → novo `ccJurAcordoCriar` no mesmo processo é aceito; com um `ANDAMENTO`, recusado.
5. **PJ-12 / D-06:** a guarda de `ccJurFilialCredoraSalvar` e `ccJurCargaConcluir` usa `PODE_ADMINISTRAR` (o plan usava `N3` puro). `JUR` = cargo Jurídico ou `PODE_ADMINISTRAR`. Smoke: Nara (Agente + `ADMIN`) conclui a carga; Sérgio é recusado. Gancho do quadro `juridico`: "cargo Jurídico ou `PODE_ADMINISTRAR`".
6. **PJ-13:** citar P-38 (J-1) … P-44 (J-7) na spec, no lugar de J-1…J-7.

---

## 004-concessao-credito

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PA-01 | aceito com alteração | DT-29: teto 20. `ccCredDecisaoRegistrar` (15 na Privada), `ccCredPendenciaAplicar` e `ccCredReanaliseConcluir` cabem **com** capa e etiquetas no clique; só o card do crédito substituído (outro card, +5 na Pública) vai para a conciliação do passo `CREDITO` | 01 §10; 04 §4 `ccCredDecisaoRegistrar`; 05 §4.5 linha 5 |
| PA-02 | aceito | grandezas diferentes | 02 `CC_SOLICITACAO.FAT_MENSAL` |
| PA-03 | aceito | a alçada não pode ser contornada aprovando acima do proposto | 03 §7; 04 §4 `ccCredDecisaoRegistrar` |
| PA-04 | aceito | tela escolhida; uma regra só no servidor | 04 §4 `ccCredMotorCalcular` (`entradas`) |
| PA-05 | aceito | colunas existem; RN-028 | 04 §4 `ccCredPedidoDecidir` |
| PA-06 | aceito | DT-33 | 04 §4 `ccCredSaudeResumo`, `ccCredRiscoResumo`, `ccCredRiscoListar` |
| PA-07 | aceito | DT-33; tudo das tabelas que a SF já lê | 04 §4 `ccCredCreditoListar`, `ccCredCriticidadeListar`, `ccCredSaudeListar`, `ccCredFarolClienteListar`, `ccCredRevisaoListar` |
| PA-08 | aceito | capa escolhida | 05 §4.4, §5 |
| PA-09 | aceito | RN-004 "nunca pulando" | 04 §8 quadros `concessao-*` |
| PA-10 | aceito | constitution II | 03 §12 `cred.revValidadeDias`; 02 `CC_RISCO_CLIENTE.REVISAO_GATILHOS` (`VALIDADE`) |
| PA-11 | aceito | numeradas P-45 e P-46 | 00 §4; 03 §7 |
| PA-12 | aceito como está no plano | faixa "Aguardando você" no topo da Esteira; a agenda da 002 não soma itens de crédito | — |
| PA-13 | aceito como está no plano | pendência nasce na decisão | 04 §4 `ccCredDecisaoRegistrar`, `ccCredPendenciaAplicar` |
| PA-14 | aceito como está no plano | definição de aberta | 04 §4 `ccCredSolicitacaoListar` |
| PA-15 | aceito como está no plano | recusa antes do Comitê não é decisão | 04 §4 `ccCredSolicitacaoRecusar` |
| PA-16 | aceito como está no plano | `temMotorProprio(carteira)` | 04 §8 |
| PA-17 | aceito como está no plano | — | — |
| PA-18 | aceito como está no plano | — | 04 §4 `ccCredFarolValidacao` |
| PA-19 | aceito como está no plano | somatórios na gêmea | 04 §4 `ccCredSolicitacaoListar` |
| PA-20 | aceito como está no plano | lista fixa | 04 §4 |
| PA-21 | aceito como está no plano | — | — |
| PA-22 | aceito como está no plano | — | 04 §4 `ccCredMotorCalcular` |

**O que o plano desta spec precisa mudar**

1. **PA-01:** no `plan.md` ("Orçamento", hoje "Capa, etiquetas e o card do crédito substituído … ficam para a conciliação"), a capa (`valor`, `rating`, `validade`, `alcada`, `pendencia`) e as etiquetas do **próprio** card voltam para o clique de `ccCredDecisaoRegistrar`, `ccCredPendenciaAplicar` e `ccCredReanaliseConcluir`; só o card do crédito substituído fica para a conciliação (05 §4.5 linha 5). Smoke: `execucoes()` dessas três ≤ 20 nas carteiras `PRIVADA` e `PUBLICA` (era ≤ 12); C-039 continua afirmando o card antigo em `encerrada` **depois** da rotina. Risco R-001: o teto é 20.
2. **D-06:** `ccCredCalibracaoRevisar` = `ADM` (nível ≥ 3 ou `ADMIN`); `N2` das leituras (`ccCredFarolValidacao`, `ccCredDesempenho`, `ccCredCalibracaoRevisaoListar`) e de `ccCredSolicitacaoAtribuir`/`ccCredReanaliseAbrir` aceitam a marca `ADMIN`. Alçadas não.
3. **005 PA-03:** o motor da 004 também devolve `podeAprovar` (`true` com rating efetivo) e `motivoNaoAprovar`, para a decisão tratar os dois motores igual.
4. **PA-11:** citar P-45 (pedido acima do teto flexível segue a tabela) e P-46 (Gerente decide sozinho no Comitê regional) na spec.

---

## 005-setor-publico

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PA-01 | aceito | SQL não calcula dia útil com feriado local; o passo atual vira coluna | 02 `CC_NF_PUBLICA.PROX_PASSO`, `PROX_PASSO_DATA`; 04 §5 `ccPubNfListar`, `ccPubReguaCumprimento` |
| PA-02 | aceito | spec e artefato: a etapa sobe pela data devida | 05 §3.2 |
| PA-03 | aceito | a decisão precisa de `podeAprovar` | 04 §5 `ccPubMotorCalcular`; 04 §8 |
| PA-04 | aceito com alteração | `historico` aceito; `sugestoes.perfilPag` **sai** (a spec não tem regra) | 04 §5 `ccPubAnaliseObter`; 04 §10 |
| PA-05 | aceito com alteração | DT-29: teto 20 — os dois cliques (15) cabem inteiros: o contato vai **com** a próxima ação e a mudança de fase leva a capa | 01 §10; 04 §5 |
| PA-06 | aceito | vale 04 (`N2`, marca aceita) | 02 `CC_ANEXO`; 04 §1, §5 |
| PA-07 | aceito | NF cancelada não pode pedir régua | 02 `CC_NF_PUBLICA.CANCELADA` |
| PA-08 | aceito | (a) `etiquetas` no `capaJson`, preservando as do card que não são da 005; (b) `CAPA_ENVIADA` = texto recebido; confirmado `'{}'` não mexe e `desfecho` sem caso não abre | 04 §2 `ccCobCasoSincronizar`; 02 `CC_COBRANCA.CAPA_ENVIADA` |
| PA-09 | aceito | NF não tem BU; filtro pelo órgão com saldo na BU | 04 §5 `ccPubResumo` |
| PA-10 | aceito | campos declarados | 01 §13 |
| PA-11 | aceito | `vigencias` na definição | 01 §9; 03 §15 |
| PA-12 | aceito | tela escolhida | 04 §5 `ccPubCertidaoListar` (`todas`) |
| PA-13 | aceito como está no plano | terceira aba "Contratos" na página Fluxo da NF; confirmação do usuário listada no relatório | — |
| PA-14 | aceito | DT-33 | 04 §5 `ccPubNfListar`/`ccPubNfTotal` |
| PA-15 | aceito | numerada P-47 | 00 §4 |
| PA-16 | aceito | regra geral do seed em duas partes; `nota()` com `numnota` | 06 §1, §2.3 |
| PA-17 | aceito como está no plano | mesma regra da 004 PA-03 | 03 §7 |
| PA-18 | aceito como está no plano | — | 04 §5 `ccPubAnaliseSalvar` |
| PA-19 | aceito como está no plano | — | 02 `CC_ANALISE_ORGAO.PRE_APROVADA` |
| PA-20 | aceito como está no plano | — | — |
| PA-21 | aceito como está no plano | — | — |
| PA-22 | aceito como está no plano | — | — |
| PA-23 | aceito como está no plano | — | — |
| PA-24 | aceito com alteração | a entrada `regraId` **sai** de `ccPubNfDatasSalvar` (ignorar entrada é contrato enganoso) | 04 §5 |
| PA-25 | aceito como está no plano | — | 04 §5 `ccPubNfDatasSalvar` |

**O que o plano desta spec precisa mudar**

1. **PA-05:** `ccPubNfPassoRegistrar` com e-mail chama `ccCobContatoRegistrar` **com** `proxAcao`/`proxAcaoData` do novo passo atual (o plan mandava sem); `ccPubNfDatasSalvar` com mudança de fase manda o `capaJson` completo (o plan mandava `'{}'`). Smoke: as duas ≤ 20 (eram ≤ 12).
2. **PA-04:** tirar `perfilPag` de `sugestoes` em `ccPubAnaliseObter` (fica `{ atrasoMedio, esfera }`).
3. **PA-24:** tirar `regraId` da entrada de `ccPubNfDatasSalvar` (plan, tasks e tela `nf-datas`).
4. **PA-08:** o `capaJson` leva em `etiquetas` só `Acima de 2 meses` e `Pequeno valor` (as demais do card são da 002 e ficam).
5. **PA-15:** citar P-47 na spec (RN-021).
6. **D-06:** `ccPubRegraEnteSalvar` (`N2`; validar = cargo Jurídico ou `N3`) e `ccPubCertidaoSalvar` (`N2`) aceitam a marca `ADMIN`.

---

## 006-painel-consolidado

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PA-01 | aceito | DT-33: foto, fechamento e posição por BU existem | 04 §6 `ccPainelPosicao` |
| PA-02 | aceito | DT-33; vira `JS-L` (junta foto, mês corrente, fechamento e promessas) | 04 §6 `ccPainelSerie` |
| PA-03 | aceito | mês corrente contra a foto; `FAIXA_PARA = 6` para baixa | 04 §6 `ccPainelRollRate` |
| PA-04 | aceito | colunas fixadas | 04 §6 `ccPainelSerieCredito` |
| PA-05 | aceito | DT-33 | 04 §6 `ccPainelCredito` |
| PA-06 | aceito | uma SF, duas medidas (`base`) | 04 §6 `ccPainelConcentracao` |
| PA-07 | aceito | somas fecham o total; agente da foto no mês passado | 04 §6 `ccPainelAgentes` |
| PA-08 | aceito | `CC_FATURAMENTO_MES` já é lido pela 006 | 04 §6 `ccPainelPlanos` |
| PA-09 | aceito | `JS-L`, sem custo a mais no bloco | 04 §6 `ccPainelSaude` |
| PA-10 | aceito | colunas da spec e da tela | 04 §6 `ccPainelEquipe` |
| PA-11 | aceito | 19 tipos e `quantidade` | 04 §6 `ccPainelAtencao` |
| PA-12 | aceito | (a) o Jurídico não acessa o painel; (b) D-06: `ADM` = nível ≥ 3 ou `ADMIN` | 04 §6 (cabeçalho, `ccPainelFechamentoListar`, `ccPainelFechamentoSalvar`) |
| PA-13 | aceito | linha zerada no mesmo `BU_ID` | 02 `CC_FOTO_AGING` |
| PA-14 | aceito | DT-29: ≤ 6 por bloco | 01 §10 |
| PA-15 | aceito | P-31, padrão "não conta" | 00 §4 |
| PA-16 | aceito como está no plano | carteira sem "Jurídico" | 04 §6 |
| PA-17 | aceito como está no plano | — | 04 §6 |
| PA-18 | aceito como está no plano | limite da posição | 04 §6 `ccPainelCredito` |
| PA-19 | aceito como está no plano | — | 01 §11 |
| PA-20 | aceito como está no plano | um `INSERT IGNORE … SELECT` | 04 §6 `ccPainelRotina` |
| PA-21 | aceito como está no plano | — | 04 §9 |
| PA-22 | aceito como está no plano | `CLIENTE_ID` nulo no que é da empresa | 01 §7; 00 DT-11 |
| PA-23 | aceito como está no plano | `SINCRONIZACAO_ID = 0` nas fotos semeadas | 02 `CC_FOTO_AGING` |
| PA-24 | aceito como está no plano | para o integrador (abaixo) | 01 §14 |
| PA-25 | aceito como está no plano | — | — |

**O que o plano desta spec precisa mudar**

1. **D-06:** `ccPainelFechamentoListar`/`Salvar` usam `PODE_ADMINISTRAR` (o plan já seguia "nível ≥ 3 ou `ADMIN`"; só trocar "pendente" pela referência). `ccPainelEquipe` (`N2`) aceita a marca `ADMIN`.
2. Nada mais: os pedidos foram aceitos como propostos.

---

## 007-historico-apoio

| Pedido | Decisão | Motivo | Onde |
|---|---|---|---|
| PA-01 | aceito | a tela não compara com hoje | 04 §7 `ccHistEventoListar`, `ccHistExportar` (`AGENDADO`) |
| PA-02 | aceito | o dado existe | 04 §7 (mapa) |
| PA-03 | aceito | abas somam categorias | 04 §7 (`categoria` com vírgula) |
| PA-04 | aceito | evento não tem coluna normalizada | 04 §7 `ccHistEventoListar` (sem `busca`) |
| PA-05 | aceito | igual a `CC_MATERIAL.BUSCA` | 02 `CC_FONTE_LINK.BUSCA` |
| PA-06 | aceito | nomes das gêmeas fixados | 04 §7 `ccHistClienteBuscarTotal`, `ccHistEventoTotal`, `ccHistFonteTotal`, `ccHistMaterialTotal` |
| PA-07 | aceito | D-06 | 04 §7 |
| PA-08 | aceito | vale P-27; a regra "nível ≥ 2 ou `ADMIN`" já tira o Jurídico (nível 0) | 04 §7 |
| PA-09 | aceito | rastro da emissão na área `Histórico` | 04 §7 `ccHistExportar` |
| PA-10 | aceito | parâmetro não é dado de cliente: `ccBaseParametroListar` não junta `EU`; `VIGENCIA_INICIO` do valor efetivo da carteira pedida | 04 §1 `ccBaseParametroListar` |
| PA-11 | aceito | prazos de etapa saíram do catálogo | 04 §7 `ccHistRegrasVigentes` (`quadros[]`) |
| PA-12 | aceito | `GRUPOS_PARAMETRO` da 001 | 01 §9 |
| PA-13 | aceito | `KB_BRASILIA` da 001 | 01 §3 |
| PA-14 | aceito | a coluna é "tem processo ativo" | 04 §3 `ccJurProcessoCriar` |
| PA-15 | aceito | 7002 precisa entrar na leitura | 06 §2.5 |
| PA-16 | aceito com alteração | a atribuição do elenco é feita pelo orquestrador depois da primeira leitura (`atribuir()` do `000-elenco`); o smoke da 007 só confere | 06 §2.3 ("Seed em duas partes") |
| PA-17 | aceito | — | 06 §2.5 |
| PA-18 | aceito | arquivos ausentes tolerados | 01 §9, §14 |
| PA-19 | aceito | DT-33 | 04 §7 `ccHistResumo` |
| C (2 pendências) | aceito | numeradas P-32 e P-33 (não P-31/P-32: P-31 ficou com a 006) | 00 §4 |

**O que o plano desta spec precisa mudar**

1. **PA-16:** o smoke da 007 não atribui 7001–7003 por conta própria: confere que o orquestrador atribuiu (06 §2.3) e falha se estiver vazio.
2. **C:** na spec, as pendências de fontes/papel timbrado e de arquivos do material passam a **P-32** e **P-33** (o plan pedia P-31 e P-32).
3. **D-06:** salvar fonte e material = `PODE_ADMINISTRAR`; revisar fonte = cargo `JURIDICO` ou `PODE_ADMINISTRAR`; `Alteração auditada` = `NIVEL_MIN(2)` (já era a proposta; só trocar "pendente").

---

## Para o integrador (arquivos compartilhados, 01 §14)

1. `backend/simulator/seed/000-elenco.mjs` exporta `atribuir()` (linha "Atribuição" de 06 §2.5, por `ccBaseClienteAtribuir` como Gustavo); o orquestrador do seed roda DDL → elenco → `winthor()` dos seeds → `ccRotina` → `atribuir()` → `dominio()` dos seeds (06 §2.3). Ajudante `nota()` aceita `numnota`.
2. `server-functions.ts`: blocos com as SFs novas (`ccBaseContatoTotal`, `ccBaseSincronizacaoListar`, `ccBaseSincronizacaoTotal`, `ccCobCasoListar`, `ccCobCasoTotal`, e as internas da 001); bloco 6000–6999 da 006 com os 15 nomes (006 PA-24).
3. `App.tsx`: importa `modules/NNN/extensoes.ts` das donas antes do da 005 (01 §14).
4. `PUBLISH_ORDER` com `add-060`; `ccPainelRotina` em `FORA_DO_PERFIL`; `recharts` + `chart.tsx` instalados com o kit de design (006 PA-24).
5. Smoke `900-fluxos`: processo criado fora do dossiê leva a cobrança a `juridico` na rodada seguinte (05 §3.6 linha 14).

## Contagem

145 pedidos: 001 = 17 · 002 = 24 · 003 = 13 · 004 = 22 · 005 = 25 · 006 = 25 · 007 = 19 (+ 2 pendências sem id da 007, numeradas). Decisões: 131 aceitos (dos quais 36 "como está no plano"), 14 aceitos com alteração, 0 recusados.

## Fechamento (16/11/2026)

Seis pontos que as respostas não fecharam, decididos pelo arquiteto sem pergunta ao usuário (critério: a saída mais simples que cabe no teto de 20 e não tira nada que o usuário vê).

| # | Spec | Decisão | Motivo | Onde mudou |
|---|---|---|---|---|
| F-1 | 005 | interna nova `ccEscPubNfPassoAtualizar` (um `UPDATE` de `CC_NF_PUBLICA.PROX_PASSO`/`PROX_PASSO_DATA`, guarda caso visível e NF não paga), chamada por `ccPubNfPassoRegistrar` depois de `ccEscPubNfAcaoInserir`; custo 12 sem e-mail, 16 com | nenhuma interna gravava o passo; esperar a rotina deixava a lista de NFs sem o passo atual por até 5 min; reaproveitar `ccEscPubNfDatas` regravaria o trilho inteiro de datas | 04 §0 (contagem: 005 = 18 + 11; total 227 + 101 = 328), §5; 00 §1; plan 005 (contratos, `ccPubNfListar`, `ccPubNfPassoRegistrar`, contas, C-021), tasks 005 T-022; integrador: `ccEscPubNfPassoAtualizar` no bloco 5000 de `server-functions.ts` |
| F-2 | 004 | `ccCredReanaliseConcluir` lista `kbCardAtualizar` (capa e etiquetas do próprio card no clique) | PA-01 já pôs no clique; faltava na coluna kb | 04 §4; plan 004 sem mudança (já 15) |
| F-3 | 004 | `ccCredAgendaTotal` (`TOTAL`) nomeada na linha de `ccCredAgendaListar` e na lista de gêmeas com nome fixado | a linha já era `L+T` e a gêmea já estava na contagem (004 = 49 + 17); faltava o nome | 04 §0, §4; contagem e índice sem mudança; plan 004 sem mudança |
| F-4 | 002 | lote de `ccCobEmailFilaDecidir` cai para **2** ids: 1 + 2 × (4 + contato 1 + ação 1) + fila 1 + auditoria 1 = 15 | com 3 dava 21; contato e ação em lote mudariam a assinatura de duas internas usadas por outras SFs; tirar o contato apagaria o registro que o C-018 confere. Para o usuário: a fila aprova de 2 em 2 (mais um passo no progresso) | 04 §2 (`filaIds`, escreve `CC_CONTATO_COBRANCA`); 01 §10 (exemplo); 002 item 1 acima; plan 002 (escrita, tela, smoke RNF-006, conta, DT-29, risco), tasks 002 T-041, T-070, T-162 |
| F-5 | 001 | quem administra fica só em `ADMINS_IDS`, nunca em `ACESSO_JSON.pessoas`; `pessoas` guarda só `membro`/`leitor` | README da lib, "Níveis de acesso": o administrador vale mais que qualquer marca e vê e altera tudo | 05 §2; plan 001 já fazia assim (sem mudança) |
| F-6 | 001 | o último membro ativo com a marca `ADMIN` não a perde nem é inativado ("É preciso manter ao menos um Administrador.") | só quem tem a marca concede a marca: sem nenhum, ela não volta mais (Gerente e Diretoria seguem administrando, D-06); inativar o último dá no mesmo, por isso entra junto | 01 §4; 04 §1 `ccBaseMembroSalvar`; plan 001 (regra e smoke C-011, seis recusas), tasks 001 T-024 |
