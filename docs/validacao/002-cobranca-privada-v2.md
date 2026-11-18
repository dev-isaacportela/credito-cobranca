# Validação v2: 002-cobranca-privada

Validador independente, rodada v2 (fase 0c, passo 5). Data: 2026-11-16. Só leitura: nada foi corrigido.

Lido por inteiro: `docs/validacao/LEIA-v2.md`, o relatório v1 (`002-cobranca-privada.md`), `docs/specs/002-cobranca-privada/{spec,plan,tasks}.md`, o contrato `00-indice`, `01-convencoes`, `03-parametros`, `06-seed-testes`, `pedidos/00-respostas.md` (inclusive "Fechamento"), `arquitetura.md` §7, `opcoes-tela/escolhas.md` (seção 002) e a skill `mitra-escopo` (SKILL.md). Por seção: `02-dados` (001 até `CC_FASE`, §002 inteira, `CC_PROCESSO`), `04-funcoes` (§0, §1, §2, §3 até escritas, §5 a §10), `05-quadros` (§1 a §3.7). Por busca: o relatório C do estudo (lista de retornos) e as referências à 002 nos plans da 003, 005 e 006.

Resumo: **0 BLOQUEIA, 11 CORRIGIR, 8 OBSERVAÇÃO.** Os 4 BLOQUEIA da v1 estão resolvidos. Os nomes de tabela, coluna, parâmetro, SF, fase, etiqueta e cargo do plan e das tasks batem com o contrato. As contas de execução também batem. Os defeitos que sobram estão em três lugares: o que a rotina deixa de fazer na carteira Pública, duas guardas de escrita e asserts de smoke que vão falhar com o seed descrito.

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | Passa | |
| Todo RF com critério de aceite; cenários de erro; fora de escopo | Passa | 42 RF, 30 cenários, 33 RN; fora de escopo cobre os blocos do artefato que a v1 apontou |
| Seção Testes: uma linha por C e RN, com números | Passa | 63 linhas; contas refeitas abaixo |
| Zero `[NEEDS CLARIFICATION]` / "pendente do arquiteto" | Passa | P-34 a P-37 numeradas no índice |
| Plan: princípios, contratos, simulador, mapa de testes, decisões, Complexity Tracking | Passa | Complexity Tracking registra as `ccEsc…` no perfil e a escrita sem transação |
| Plan × contrato: nomes e assinaturas | Passa | 39 públicas e 21 internas iguais a 04 §2; 52 chaves iguais a 03 (11 + 28 + 3 + 8 + 2); 8 tabelas de 02; fases e etiquetas de 05 §3 |
| Spec × plan × tasks: todo C/RN com teste, todo teste com task, toda SF pública com task | Passa | T-100 a T-162, T-121, T-136, T-163; RN-012 coberta por T-113/T-115 |
| Testes provam o critério | Falha parcial | C-2, C-6 a C-8, C-10 e C-11 abaixo |
| Orçamento (20 por clique, ≤ 6 ao abrir, 150 por rodada) | Passa | ver tabela |
| D-01 a D-06; nenhum arrastar; quadros pela lib | Passa | D-06 só fica imprecisa no texto da spec (O-7) |
| Telas × `escolhas.md` | Passa | as 12 telas apontam a opção escolhida; nenhuma sem desenho |
| Segurança e plataforma | Falha parcial | identidade por `quem()`, forma A, nada de `VITE_*`, produção ou migration. Faltam duas guardas (C-3, C-4) |

### Contas refeitas

| Linha | Conta | Veredito |
|---|---|---|
| C-029 / encargos públicos | 50.000 × 0,5% × 40/30 = 333,33; 50.000 × (1,004^(40/30) − 1) = 266,84; total 50.600,17 | Certo |
| RN-015 (dois títulos) | juros 16,67 + 83,33; correção 6,66 + 33,38 = 40,04; total 10.340,04 | Certo |
| RN-015 (2010) | multa 400 + 200; juros 313,33 + 56,67 = 370,00; correção 125,48 + 22,65 = 148,13; total 31.118,13 | Certo |
| RN-023 | 17/11 + (10 − 8) = 19/11; 18/11 + 3 = 21/11 (sáb.) → 23/11; 18/11 + 15 = 03/12 (qui.) | Certo |
| RN-033 | 19/11 no prazo; 18/11 → 19/11 fora; 20/11 (feriado) → prazo 23/11, no prazo; 2 de 3 = 66,7% | Certo |
| C-015 | parcela 13/11, tolerância 5: em 18/11, 13 < 13 é falso (ativo); em 19/11, 13 < 14 (quebra) | Certo |
| C-017 | 19/11 + 5 dias úteis, sem 20/11 = 27/11 | Certo |
| RN-010 | 21/11 + 30 = 21/12 (seg.); + 60 = 20/01/2027 (qua.) | Certo |
| C-002 no smoke | `A_VENCER` da fase "filtrando por agente": Ana em `prev_d5` = 2001 (5.000) + 2016 (8.000) = 13.000; em `venc_d0` = 2003 + 2018 = 5.000 | **Errado** (C-8) |

### Orçamento (01 §10)

| Operação | Conta refeita | Plan | Veredito |
|---|---|---|---|
| `ccCobEmailFilaDecidir` (2 itens) | 1 + 2 × (4 + 1 + 1) + 1 + 1 = 15 | 15 nas duas tabelas | Bate |
| `ccCobEmailEnviar` | 1 + 4 + 1 + 1 + 1 + 1 + 3 = 12 | 12 | Bate |
| `ccCobEnviarJuridico` | 1 + 3 + 1 + 5 + 2 = 12 (dentro dos ≤ 30 de `ccJurDossieEnviar`) | 12 | Bate |
| `ccCobAcordoPropor` | 1 + 1 + ⌈(n + 1)/20⌉ + 5 + 2 + 1 = 11 a 14 (n ≤ 60) | 11, até 14 | Bate |
| Demais escritas | 5 a 11 | idem | Bate |
| Telas | e-mails 5, bloqueio 5, regras ≤ 6, agenda 3, gerencial 3, card 2 | idem | Bate |
| Rodada | 8 por caso novo → 18 por rodada de 150 | idem | Bate |

## 2. v1 → v2

| v1 | Destino |
|---|---|
| B-1 SQL de escrita sem guarda; régua com limiares do chamador | Resolvido (forma A, guarda na `ccEsc…`, nível relido na SQL, `ccCobRotina` fora do perfil, sem `ccCobMover`). Duas guardas pontuais ainda faltam (C-3, C-4) |
| B-2 chaves `cob.*` duplicadas; "diferentes entre si" | Resolvido (catálogo 03; RN-028 "estritamente crescentes") |
| B-3 contratos com a 001 | Resolvido (`ccEmailEnviar`, `PRINCIPAL`, `VENCIMENTO_EFETIVO`, `DIAS_ATRASO_PAGAMENTO`, `ccEscBaseClienteJuridico` iguais a 01/02/04) |
| B-4 fluxo com o Jurídico invertido | Resolvido (dossiê primeiro; `ccCobEnviarJuridico`, `ccCobSituacao`, `ccCobEncargosCalcular`) |
| C-1 envio legal sem validação | Resolvido (RN-022, C-018) |
| C-2 seed e layout | Resolvido no layout, na dona e na faixa. A ordem do seed ficou errada (C-9) |
| C-3 ordem do `SET`, `UPDATE … JOIN` | Resolvido (a etapa mora no card; regra de dialeto) |
| C-4 aninhadas no orçamento | Resolvido |
| C-5 perfil sem SELECT | Resolvido (`add-090` do integrador, T-051) |
| C-6 RFs sem teste | Mal resolvido: RF-014 e RF-024 ganharam teste; RF-005, RF-006, RF-034, RF-036 e RNF-005 continuam sem (C-11) |
| C-7 blocos do artefato | Resolvido (RF-040, RF-041 e fora de escopo) |
| C-8 protesto e promessa | Resolvido ("diferença deliberada" registrada) |
| C-9 exemplo da RN-023 | Resolvido |
| O-1 a O-6 | Resolvidos. O-2 só em parte: o C-021 agora tem número fixo, mas não testa listas nem agenda (C-11) |

## 3. BLOQUEIA

Nenhum.

## 4. CORRIGIR

| Id | Onde | O que está errado |
|---|---|---|
| C-1 | plan `ccCobRotina` passo 3 e 4 ("Para cada carteira de `CARTEIRAS_COM_REGUA`"); 05 §3.6 | Na carteira `PUBLICA` ninguém reavalia promessa (RN-008, RN-032: a previsão do órgão "funciona como nas outras carteiras"). Ninguém põe as etiquetas `Promessa vencida` (semeada no quadro público) e `Sem contato`. Ninguém marca `juridico_1` depois do envio (PA-24 deixou isso para a rotina). Só a linha 14 roda nas três carteiras. A promessa do C-029 fica `ABERTA` para sempre e a agenda nunca mostra "não cumprida". Precisa de pedido ao contrato: estender as linhas 8, 9 e 13 de 05 §3.6 à `PUBLICA` |
| C-2 | plan `ccCobRotina` passo 5; 02 `CC_EMAIL_FILA` | O modo `AUTOMATICO` não tem trava contra reenvio: não há linha de fila para ele (02), e a ação só é gravada quando o e-mail completa os itens ● (em `pag_nao_ident` falta o item 2). A rotina reenviaria o e-mail a cada 5 minutos. Falta a condição "não enviado" (por exemplo `CC_EMAIL_ENVIADO.REFERENCIA = 'cobranca:<id>:<fase>'`). O teste RN-021 põe `pag_nao_ident` em automático e só confere a primeira rodada |
| C-3 | plan `ccCobEnviarJuridico`; 04 §2 | A guarda confere só o nível. Um gerente pode chamar a SF direto, com qualquer `processoId`, e levar o caso a `juridico` sem dossiê enviado: a P-07 / DT-17 fica contornável. A guarda deve exigir `CC_PROCESSO` do mesmo cliente e carteira com `DOSSIE_ENVIADO_EM` preenchido, que `ccJurDossieEnviar` grava antes de chamar. O smoke da 002 sem a 003 precisa então de `pular` ou do fluxo 900 |
| C-4 | plan `ccCobAcordoCancelar` ("quem: `N2`"); 04 §2 | Não há condição de visibilidade. Silvia (supervisora de outra equipe) cancela o acordo de cliente da Ana, contra a RN-027 e o C-021 ("não consegue operar"). Incluir `clienteVisivelA` na guarda e "Silvia recusada" no teste RN-011 |
| C-5 | plan `ccCobAcaoRegistrar` e passo 3 da rotina; spec RN-005 | `PROTESTADO` só é gravado pelo botão, e o plan não diz se depende de `protesto_1` estar entre os itens. O item marcado direto no card vira, pela rotina, só `CC_ACAO_REGUA` (ORIGEM `CARD`), e só quando os dois ● estão marcados. Com `protesto_1` marcado à mão o caso não fica protestado e a anuência nunca é exigida. Regra: `protesto_1 = Sim` grava `PROTESTADO`, por qualquer caminho |
| C-6 | plan Testes RN-003; tasks T-132; spec RN-003 | "Título novo de 2030 que vence em `dia(-1)` → caso novo" contradiz a linha 1 de 05 §3.6. Lá, enquanto o título baixado (`dia(-200)`) está no Winthor, `VENC_MAIS_ANTIGO` é anterior ao encerramento e o caso não abre (`ponytail:`). O teste falha. Tirar o título antigo do Winthor simulado antes do assert e registrar o teto na spec, ou mudar o contrato |
| C-7 | plan Testes RN-025; tasks T-153 | O cliente 2011 está na fase `acordo`, que não tem item ●. Pela tabela "Agenda" (`ACAO_REGUA` só "em fase com item ●"), o evento de ação pendente não existe, e o assert dos 4 tipos falha. Usar um caso em fase da régua para `ACAO_REGUA` |
| C-8 | plan Testes C-002; tasks T-101 | `ccCobQuadroResumo` filtrado por agente não isola 2016 e 2018. 2001 e 2003, também da Ana, estão em `prev_d5` e `venc_d0`, então os totais dão 13.000 e 5.000, não 8.000 e 2.000. A spec pede o valor **do cartão**: conferir a capa (`a_vencer`) de cada card, ou mudar 2016 e 2018 de agente |
| C-9 | plan Simulador "Como o seed grava"; tasks T-013, T-050 | T-013 põe a atribuição (`ccBaseClienteAtribuir`) e a ficha (`ccBaseContatoSalvar`) na parte 1, antes da leitura que cria `CC_CLIENTE`. Por 06 §2.3 elas vão em `dominio()`, seguidas de nova rotina. T-050 semeia o protesto de 2007, que o próprio RN-005 executa, e não semeia o protesto de 2013 (C-017; 06 §2.5) nem a baixa proposta de 2014 (RN-013, "nasce com nível 3"). T-050 também lista os pagamentos de 2039–2041 e 2046 como "SFs reais", mas pagamento é dado do Winthor (`nota()`) |
| C-10 | plan Testes (banco único por smoke, 06 §3) | Os testes mudam estado que outros conferem depois, e o plan não fixa ordem nem desfaz o estado. C-004 põe `regua.lig = 6` na Estética, o que move também o caso Estética de 2012, que o C-030 espera em `cob_ativa`. C-027 encerra o caso de 2043, que C-028 e C-029 usam aberto. Qualquer rotina em 19/11 antes do C-015 já quebra o acordo de 2028, que o C-015 quer ver `ATIVO` em 18/11. O 2011 é usado por RN-003 (quitar), RN-011 (pagar as 4) e RN-025 (parcela futura) |
| C-11 | plan Testes; tasks Rastreabilidade | Critérios sem assert: RF-005 (capa; `capaDoCaso()` é pura e testável), RF-006 (total da coluna com `buId`), RF-034 (filtros por retorno e promessa), RF-036 (nenhum teste lê `CC_AUDITORIA` das áreas `Cobrança`, `Acordos`, `Baixas`, `Bloqueio`) e RNF-005 (`como('ana')` passando `membroId` de outro membro deve ser ignorado ou recusado). C-021: a spec pede "listas, agenda e totais", e o plan só confere `ccCobQuadroResumo` e a ficha |

## 5. OBSERVAÇÃO

| Id | Onde | Nota |
|---|---|---|
| O-1 | plan `ccCobCasoSincronizar` ("com sessão, recusa"), Sandbox S-01/S-14 | Na hipótese (ii) do sandbox, a chamada aninhada leva a sessão. Então `ccPubNfDatasSalvar` (clique da 005) é recusado ao chamar `ccCobCasoSincronizar`, e o gancho também recusaria o movimento entre fases públicas ("nunca à mão"). Na mesma hipótese, o Jurídico, que é `leitor` em `cobranca-*`, pode ter o `kbNotaRegistrar` do parecer recusado. O plan diz "o código é o mesmo nas duas hipóteses", e aqui não é |
| O-2 | plan `ccCobEmailFilaDecidir` | (a) Uma só `ccEscCobFilaSituacao` para o lote não grava um `EMAIL_ENVIADO_ID` por item. (b) O plan não diz que manda `extras.DATA_LIMITE`. Os modelos em modo `APROVAR` usam o campo, e a 001 recusa campo sem valor (01 §13) |
| O-3 | plan RN-026 ("soma dos `CONT_<retorno>` = `CONTATOS`") | Contato `EMAIL_REGUA` nasce com retorno vazio (artefato C §1.3, linha do envio). Ou `CONTATOS` exclui esses contatos, ou a igualdade falha depois do C-018 |
| O-4 | spec C-022; plan C-022 | O elenco tem 30/11/2026 como feriado do DF (06 §2.2). No simulador, a semana da agenda termina em 01/12. O teste puro só passa com `feriados = [20/11]`; vale dizer isso, ou a verificação manual (T-193) diverge |
| O-5 | spec RF-024 | "O contato é registrado com o canal usado" não tem caminho: `ccCobAcaoRegistrar` não recebe canal e `CC_EMAIL_FILA.CANAL_FORA` nunca é gravado. Dizer que o agente registra o contato à parte |
| O-6 | plan Testes C-014, RN-024, RN-014 | C-014: o 2026 deve 60.000, acima de `cob.acordoValorGerente`, e a proposta precisa de garantia. RN-024: "qualquer fase" do quadro público com "notas fiscais" esbarra em `juridico` e nas finais, que respondem outra frase. RN-014: a spec diz vencido 8.000, o seed usa 2009 com 15.000 |
| O-7 | spec "Usuários" e RN-011 | Com D-06, editar parâmetro e cancelar acordo (`N2`) também valem para a marca Administrador. O texto diz "gerente financeiro ou acima" e "supervisor ou acima" |
| O-8 | spec RF-015; plan `ccCobRotina` passo 4; 04 §2 × 05 §3.6 linha 5 | Cancelar um acordo `PROPOSTO` deixa o card em `negociacao`, porque a rotina só devolve o card que está em `acordo`. O RF-015 diz que cancelar devolve à régua. O contrato diverge consigo mesmo no acordo recusado (04: fica em negociação; 05: devolve) |

## 6. Para relatar

0 BLOQUEIA · 11 CORRIGIR · 8 OBSERVAÇÃO. Não há bloqueio. Os CORRIGIR que mudam comportamento ou segurança: C-1 (rotina não concilia promessas nem itens na Pública), C-2 (modo automático reenvia a cada rodada), C-3 (envio ao Jurídico contornável por chamada direta), C-4 (cancelar acordo sem visibilidade) e C-5 (protesto marcado à mão não grava `PROTESTADO`). Os demais (C-6 a C-11) são seed e asserts de smoke.
