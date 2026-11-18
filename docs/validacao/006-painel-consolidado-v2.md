# Validação v2: spec 006 · Painel consolidado

> Validador independente (fase 0c, passo 5). Lidos: `docs/specs/006-painel-consolidado/{spec,plan,tasks}.md`;
> o relatório v1 (`006-painel-consolidado.md`); `docs/contrato/01` (§3–§11, §14), `02` (001, 002, 004, 005, 006),
> `03` (§8, §9, §12, §13), `04` (§0, §1, §2, §3, §5, §6, §9), `06` (§1–§5); `pedidos/006-painel-consolidado.md` e a
> seção 006 + Fechamento de `pedidos/00-respostas.md`; `arquitetura.md` §7; `opcoes-tela/escolhas.md` (006) e o
> mockup `telas-02-resumo.html`; skill `mitra-escopo` (Fluxo A); design system §8.7, §9.7, §12.
> Nada foi corrigido; este arquivo só relata.
>
> **Resultado: 1 BLOQUEIA · 3 CORRIGIR · 9 OBSERVAÇÃO.** Os 3 bloqueios e os 11 pedidos de correção da v1 estão
> resolvidos. Todos os números da massa de referência foram refeitos e fecham (tabela abaixo). Sobra um bloqueio
> novo: os pontos de atenção leem os resumos dos outros módulos por chamada aninhada, e nessa chamada a sessão
> não chega.

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | ok | nem chave de parâmetro (v1 O-6 resolvida) |
| Todo RF com critério verificável; Fora de escopo; caminho de erro | ok | 28 RF; C-002, C-006, C-009, C-010 |
| Seção Testes: uma linha por C e RN, com números | ok | 26 C + 23 RN, todas cobertas (direto ou pelo cenário) |
| Zero `[NEEDS CLARIFICATION]` / "pendente do arquiteto" | ok | P-04, P-09, P-10, P-26, P-31 batem com 00 §4 |
| Nomes × contrato (tabelas, colunas, SFs, parâmetros, cargos) | parcial | conferidos por busca em 02/03/04; um campo fora do contrato (C-1) |
| As 15 + 2 SFs de 04 §6 com tarefa e teste | parcial | `ccPainelFechamentoListar` e `ccEscPainelFechamentoAtualizar` sem teste de recusa (C-3) |
| Plan: mapa de testes → tasks T-101…T-148 | ok | um para um; ordem dos testes que mudam estado explícita |
| Orçamento (DT-29) | ok | refeito: bloco Visão geral = 6; `ccPainelFechamentoSalvar` = 3; `ccPainelRotina` = 2; demais blocos 2 a 4 |
| D-01 a D-06 | ok | BU do item; carteira por setor e BU; sem "Jurídico" no filtro; `PODE_ADMINISTRAR` e `NIVEL_MIN(2)` |
| Quadros e "arrastar" | n/a | o painel não tem quadro |
| Telas × `escolhas.md` | ok | 13 telas com a opção escolhida; sem desenho (concentração de limites, PMR, visões de agente e supervisor) têm T-059 e T-062 |
| Identidade pela sessão, escrita guardada | **não** | escrita ok (`quem()`, `ATOR` + `PODE_ADMINISTRAR` na `GUARDA`); a leitura aninhada dos resumos fica sem identidade (B-1) |
| Visibilidade por cargo no servidor | parcial | todas as SFs filtram por `EU` e `clienteVisivel`/`membroVisivel`, recusam Jurídico e `ccPainelEquipe` é N2. A tela só esconde. Exceções: B-1 e C-2 |
| Gráficos × design §12 | ok, com ressalvas | recharts pelo kit, `corDeSerie` pelo índice do contrato, `tomDeIntensidade` no mapa de calor, sem pizza, sem dois eixos, par Gráfico/Tabela; exceção D-07 registrada no Complexity Tracking (O-5, O-6) |
| Token em `VITE_*`, produção, migration à mão | ok | nenhum |

### Contas refeitas (banco A, 14/11/2026)

| Cenário | Conta | Veredito |
|---|---|---|
| C-001 | 70.000 a vencer + (4.000 · 3.000 · 5.000 · 8.000 · 4.000) = 94.000 / 24.000; > 90 = 12.000; PDD 350 + 120 + 300 + 1.500 + 4.000 + 4.000 = 10.270 | certo |
| C-002 / C-003 / C-019 / C-021 | Ana 45.000/11.000, Carlos 49.000/13.000; Estética 4.000, Pública 38.000/8.000, Privada 52.000/12.000; Nutrição 80.000/10.000 (5 clientes), Enfermagem 10.000/10.000 (3) | certo |
| C-004 / set. | out. 98.000/28.000, PDD 5.720; set. 54.000/25.000 | certo |
| C-005 | 01/12: 6010 passa a 31–60 → PDD 10.340; 9 linhas com saldo + 6005 e 6009 zeradas = 11 | certo |
| C-007 | Ana nov. 40.000, Carlos 54.000; out. 50.000/10.000 e 48.000/18.000 | certo |
| C-011 | nov.: gerada 2.000 (6001) + 1.000 (6004/4) = 3.000; recuperado 3.000 + 2.000 = 5.000; ajustes 2.000; out.: gerada 9.000, entraram 3; set. estimada 25.000 − 22.000 + 0 = 3.000 | certo |
| C-012 | a vencer 15/39 = 38,46%; 1–30 6/9 = 66,67%; 31–60 5/8 = 62,50% | certo |
| C-015 | VDIAS 2.083.000 ÷ 24.000 = 86,79 dias; 94.000 ÷ 176.300 = 53,32%; conversão 5/31 = 16,13% | certo |
| C-016 | 36,67 / 46,30 / 28,57 / 25,53 → média 34,27; 0 de 4 | certo |
| C-017 | Carlos 18.000 / 5.000 / 4; Ana 10.000 + 3.000 = 13.000 / 0 / 4 | certo |
| C-018 | HHI por cliente 2.187,5; por região 50² + 33,3² + 16,7² = 3.888,9 | certo |
| C-022 | plano 30: 43.000 / 7.000, faturamento 20/20/25/20/35/28 mil, média 24.666,67 | certo |
| C-024 | elenco 06 §2.1: Sérgio 4 linhas, Silvia 2, Gustavo 9 (ativos, sem Júlia) | certo |
| C-025 | 80.000 ÷ 186.300 = 42,94%; Alfa 16,10%; HHI ≈ 2.518 | certo |
| RN-003 | Estética 30 + 300 = 330 → com f2 = 20%: 630; total 10.570 | certo |

## 2. Achados

### BLOQUEIA

| # | Onde | Achado |
|---|---|---|
| B-1 | `plan.md` §"O que cada SF faz" (`ccPainelAtencao`), §Orçamento; `tasks.md` T-020, T-114, T-123 | `ccPainelAtencao` (JS-L) chama por id `ccCobAgendaResumo`, `ccJurResumo` e `ccPubResumo`. São SQL-L `T` com o fragmento `EU`, e nenhuma recebe `membroId`. Na hipótese padrão do contrato (01 §4; 06 §3: aninhada com `userId = 0`) a chamada aninhada chega sem `:VAR_USER`, e os três resumos devolvem 0 linha. Os tipos `ACAO_ATRASADA`, `PROMESSA_VENCIDA`, `JURIDICO_*`, `NF_*` e `CERTIDAO` somem, e C-014 e C-023 nunca ficam verdes no simulador. As saídas óbvias são piores: resumo sem `EU` vaza a carteira inteira, e `membroId` no input põe a identidade num parâmetro. O plano C do Sandbox (a tela chama os resumos) precisa virar o plano padrão: a tela chama os três resumos direto, o bloco continua com 6 execuções e a `ccPainelAtencao` junta só as leituras próprias. A outra saída é o contrato definir como um resumo aninhado herda a visibilidade. |

### CORRIGIR

| # | Onde | Achado |
|---|---|---|
| C-1 | `plan.md` §`ccPainelPosicao`, §Testes (Tela: `avisosDeTopo`); `tasks.md` T-010, T-042, T-143 | `fotoPendente` é devolvido por `ccPainelPosicao` e alimenta o aviso de topo, mas não existe na saída da SF em 04 §6. Pela regra de 04 §0, nome fora do contrato não se publica. Ou o contrato ganha o campo, ou o aviso passa a vir de `FOTO_PENDENTE` de `ccPainelAtencao`, que só é chamada no bloco Visão geral e não serve ao topo das outras abas. |
| C-2 | `plan.md` §Fragmentos (`visivelNoPainel`, `ponytail:` do analista); `spec.md` RN-006, RN-015 (linha "Evolução no ano"), C-002 | Na foto, a visibilidade vai só pelo `AGENTE_ID` congelado. O analista que não é agente vê o mês corrente mas nenhum mês passado (evolução, movimento, roll rate, agentes de outubro). O supervisor de um analista (Sérgio com Rita) vê no mês corrente os clientes analisados pela Rita e deixa de vê-los nos meses passados. A spec não diz isso: a RN-015 promete ao analista "meses com foto". O limite precisa entrar na spec (RN-006/RN-015) e ganhar um teste no banco B (Rita, `mes '2026-10'`). |
| C-3 | `plan.md` §Testes C-009; `tasks.md` T-109, T-102 | Falta o teste do servidor para duas SFs. `ccPainelFechamentoListar`/`Total` (ADM) não é chamada como Sérgio ou Ana: T-102 só testa Júlia, o visitante e Otávio. `ccEscPainelFechamentoAtualizar` não é chamada direto por um não ADM: só a `…Inserir`. O que aparece na lista e o `TEM_FOTO` (C-008: "aparece na lista") também não têm assert: o teste afirma só `Total = 1`. |

### OBSERVAÇÃO

| # | Onde | Achado |
|---|---|---|
| O-1 | `plan.md` §Fluxo 2, §Orçamento | O cabeçalho chama `ccPainelPosicao`, e os blocos Visão geral e Indicadores chamam a mesma SF com os mesmos filtros. Com o cache por (bloco, filtros), abrir a página dá 1 + 6 = 7 execuções e 3 consultas iguais. Basta guardar `ccPainelPosicao` no cache por filtros, não por bloco. |
| O-2 | `plan.md` §`ccPainelRollRate` | `mes = ''` quer dizer "último fechado" no roll rate e "mês corrente" nas outras SFs. A tela precisa sempre mandar o mês explícito (`mesesOferecidos`), senão o mês padrão mostra setembro → outubro. |
| O-3 | `plan.md` §`ccPainelFechamentoSalvar` (GUARDA) | `mes < SUBSTR({{agora}}, 1, 7)` usa o `agora` recebido. Um ADM que chame a `ccEsc…` direto com uma data futura passa a regra "mês ainda não fechou". A guarda pode usar `AGORA_SQL` nessa comparação. |
| O-4 | `plan.md` §`ccPainelConcentracao`; 03 §9 | `limite.concMax` aceita valor por carteira, e a base `LIMITE` (posição total, sem carteira) não diz qual valor vale com "Todas" nem como o filtro de carteira recorta o limite. |
| O-5 | `plan.md` §Gráficos (D-07), T-052, T-148 | Duas ressalvas na evolução. (a) O valor escrito em cada barra contraria a regra "rotule os extremos e o último ponto" do §12.3: o rótulo que o §12.2 exige é o do estado, e a legenda já o dá. (b) Os meses sem dado (jan.–jul.) precisam aparecer como `Dash`, não como barra zero (§12.4), e nenhuma task diz isso. |
| O-6 | `plan.md` §Superfície (`painel-evolucao` A); mockup `telas-02-resumo.html` | O bloco tem seletor de ano próprio (RF-007, mockup), contra a regra de "um filtro só, no topo" do §9.7. O plano não diz se o ano sai do mês da `Toolbar`, nem registra a exceção. No roll rate, os quatro destinos (pagou → piorou) são uma escala com polaridade, desenhada com a rampa de identidade: vale considerar o par de polos do §12.2. |
| O-7 | `plan.md` §`ccPainelCredito` | "Em análise" = `DECISAO_RESULTADO = ''`. A solicitação pública `PRE_APROVADA` não conta como em análise nem como decidida, e some do quadro da Pública. A 004 define "aberta" como `ENCERRADA_EM` nulo e sem `CC_CREDITO` (04 §4 `ccCredSolicitacaoListar`). |
| O-8 | `plan.md` §`ccPainelRotina` | No ramo sem escrita (foto já existe), o plano não diz se o passo marca a sua linha de `CC_ROTINA_PASSO` como `OK`. Se não marcar, o passo `FOTO` roda de novo a cada rodada até a próxima leitura. |
| O-9 | `plan.md` §Testes C-009; 04 §6 | "Nara grava e apaga-se o efeito": não existe SF que remova um fechamento. É mais simples Nara corrigir agosto (atualizar), em vez de inserir outro mês e desfazer por fora. As listas por agente, plano e equipe continuam sem `LIMIT` de segurança (v1 O-4). |

## 3. v1 → v2

| v1 | Destino |
|---|---|
| B-1 `ccPainelAgentes` colide com a 002 | resolvido: a 002 usa `ccCobPainel…` (04 §2) e a 006, `ccPainel…` |
| B-2 faixas por título, faturamento e planos ausentes | resolvido: bloco SALDOS com `V_1_30…V_180` e `VDIAS`, `CC_FATURAMENTO_MES`, `CC_PLANO_PAGAMENTO` (02) |
| B-3 SFs de resumo inexistentes | resolvido: `ccCobAgendaResumo`, `ccJurResumo`, `ccPubResumo` (04 §9). O modo de chamar abre o B-1 novo |
| C-1 prazo da solicitação | resolvido: `CC_SOLICITACAO.PRAZO_DECISAO`, gravado na abertura; RN-020 |
| C-2 segmento por BU "Governo" | resolvido: `CARTEIRA` da posição (01 §11, D-02) |
| C-3 visibilidade reimplementada | resolvido: `EU`, `clienteVisivel` e `membroVisivel` de 01 §6 (limite do analista em C-2) |
| C-4 SQL gigante com `WITH` | resolvido: a foto grava `VENCIDO_INICIAL`, `GERADA`, `RECUPERADO` e `BAIXADO`; sem `WITH`/`ROW_NUMBER`; R-04 mede o ramo ao vivo |
| C-5 itens órfãos e `inadIdxAlerta` | resolvido: RF-005 com 19 tipos, RF-027/RF-028 (DT-27), `meta.inadIndiceAlerta`; o resto foi para o Fora de escopo, com o dono |
| C-6 saúde recalculada | resolvido: lê `CC_RISCO_CLIENTE.SAUDE`/`SAUDE_SINAIS` |
| C-7 estorno no recuperado | resolvido: `ESTORNADO = FALSE` (foto e ao vivo) |
| C-8 arquivos compartilhados | resolvido: costuras de 01 §14 (`add-060`, `schema/006`, `lib/painel-consolidado`) |
| C-9 elenco próprio | resolvido: `000-elenco`, faixa 6001–6099 |
| C-10 chaves fora do catálogo | resolvido: as 8 chaves de 03 §13; as demais lidas com o nome de 03 |
| C-11 colunas de rating e criticidade | resolvido: `CC_RISCO_CLIENTE.RATING_ATUAL`/`CRITICIDADE`, `CC_ANALISE_ORGAO.RATING_PUB` pelo crédito vigente |
| O-1 a O-6 | O-1 (dias do seed), O-2 (cache e *debounce*), O-3 (filtro por agente e ramo fora de escopo), O-5 e O-6 resolvidas; O-4 continua (O-9) |
