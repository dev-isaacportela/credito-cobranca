# Validação v3-B: 004, 005, 006 e coerência entre specs

**Data:** 2026-11-16 · **Validador:** agente independente (rodada v3). Só leu; nada foi corrigido.

**Lido:** relatórios v2 `004-concessao-credito-v2.md`, `005-setor-publico-v2.md`, `006-painel-consolidado-v2.md`, `000-contratos-entre-specs-v2.md`; `contrato/pedidos/01-correcoes-v2.md` inteiro (DT-34 a DT-42, §2 seções 004/005/006/007, §3 integrador, §5 Fechamento v2); `contrato/LEIA-correcao-v2.md`; `specs/004-concessao-credito/plan.md` inteiro e `tasks.md`/`spec.md` por busca (RN-007, RN-008, RF-026, RNF); `specs/005-setor-publico/plan.md` inteiro e `tasks.md`/`spec.md` por busca; `specs/006-painel-consolidado/plan.md` (Modelo, Contratos, Superfície, Orçamento, Simulador, Testes, Decisões) e `tasks.md`/`spec.md` por busca; contrato `04` §0, §4, §5, §6, §8, §9 e as linhas de `ccCobContatoRegistrar`, `ccCobCasoSincronizar`, `ccJurResumo`, `ccEmailEnviar`; `06` §1–§3; `02` por busca (colunas novas); `00` §1. Das outras specs: 002/plan (`ccCobContatoRegistrar`, `ccCobCasoSincronizar`, `sincronizarCaso()`, orçamento), 003/plan (`ccJurResumo`, seed), 001 e 007 (seed e pipeline) por busca.

Busca automática nos plan/tasks de 004–006: todo nome `cc…` existe em 04 (só faltam as gêmeas `…Total`, implícitas em L+T); todo `CC_X.COL` de 001–007 existe em 02; toda chave `grupo.chave` de 004–006 existe em 03.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA novos ou não resolvidos | **0** |
| CORRIGIR novos ou não resolvidos | **3** |
| OBSERVAÇÃO | **9** |
| v2 (004, 005, 006, 000): 4 BLOQUEIA + 28 CORRIGIR | 31 resolvidos, 1 mal resolvido (000 C-7 → C-2) |
| Itens do arquiteto (004: 10, 005: 11, 006: 6, integrador: 5, §5: 1/2/3/6) | todos aplicados nos plan/tasks; 006 item 5 feito de outro jeito (aceitável pelo §5 #1a); §5 #3 sem a regra na spec 004 (C-1); integrador item 5 só no pedido (O-4) |

Contas conferidas e iguais entre passos, orçamento e tasks: decisão Privada 15, Pública 17–18 (motor do órgão 1, sem gravar), `PRE_APROVADA` 10, aplicar pendência 12–13, reanálise 15, criar 11, rotina 8/11 (004); `ccPubNfDatasSalvar` 16 = 3 + 13 da 002 (pessoa), `ccPubNfPassoRegistrar` 18/14 (contato 10 na 002), reserva da rotina 13, card público 3, `ccPubAnaliseSalvar` 4 (005); Visão geral 6, Agenda 4, fechamento 3, rotina 2 (006). Única divergência: T-191 da 004 (O-1). Índice: 55 tabelas em 02; 004 = 49 + 17, 005 = 18 + 11, 006 = 15 + 2 por contagem de linhas de 04; 277 chaves e 84 fases não recontadas (nada entrou nem saiu nesta rodada).

## v2 → v3

| Id | Origem | Situação |
|---|---|---|
| B-1 | 004 v2 | resolvido em plan e tasks (`PROPOSTA_POR`, `RECOMENDADO_POR`, atribuir só antes de `comite`, troca do pedido antes de `alcada`, `…Encerrar` antes de `comite`; RN-007 (a)–(e), T-150). A spec não traz o caso (e): C-1 |
| C-1 | 004 v2 | resolvido (`NIVEL_CONCESSAO` e `alcadaConcessao()` com o ramo da `PUBLICA` pela `EXPOSICAO`; RN-008 caso público) |
| C-2 | 004 v2 | resolvido (`…CreditoSituacao` por transição; `…PendenciaInserir` pela origem do mesmo ator) |
| C-3 | 004 v2 | resolvido (RN-008 (D-06) na spec, no mapa e em T-192) |
| C-4 | 004 v2 | resolvido (`membroId` só eu ou abaixo; RN-041 com Ana × Rita) |
| C-5 | 004 v2 | resolvido (plano B = a nota sai do clique; 005 §Fluxo 1 chama `ccPubMotorCalcular` direto) |
| C-6 | 004 v2 | resolvido (Gestão abre com 5) |
| C-7 | 004 v2 | resolvido (planos lidos só no clique; card = 2) |
| C-8 | 004 v2 | resolvido (`ATRASADOS` na gêmea, 04 §4) |
| C-9 | 004 v2 | resolvido (04 §6 conta `PRE_APROVADA` como decidida e aprovada) |
| B-1 | 005 v2 | resolvido (DT-36: fotografia em `CC_ANALISE_ORGAO`; seed 5001/5004 com limite = exposição; C-003, C-005, C-012 conferem `RATING_PUB`, `LIMITE_MOTOR`, `ANALISE_ORGAO_ID`) |
| C-1 | 005 v2 | resolvido (`ccCobCasoSincronizar` como pessoa; RF-013 com `nasDuasSessoes`) |
| C-2 | 005 v2 | resolvido (`REGUA_PUB`, `retorno = ''`, `feedback`; 18/14; C-021 com 2 contatos `REGUA_PUB`) |
| C-3 | 005 v2 | resolvido (16 com `ccEscCobCasoProxAcao`; nota pela entrada `nota`) |
| C-4 | 005 v2 | resolvido: RN-007 foi para a lib (bloco A); C-031 ficou como último do bloco C, por ordem declarada (O-6) |
| C-5 | 005 v2 | resolvido (`VALOR_ESTIMADO` 600.000 e 50.000; `VALOR_ESTIMADO = 0` não é pequeno valor; dados do 5003 no C-005) |
| C-6 | 005 v2 | resolvido (29 SFs, ids 5000–5028, plan e T-028) |
| C-7 | 005 v2 | resolvido (RF-004, RF-014, RF-017 com teste) |
| C-8 | 005 v2 | resolvido (RN-002/RN-031 no bloco B, T-168) |
| C-9 | 005 v2 | resolvido (DT-42; `ccPubAnaliseObter` traz `motor`; card = 3) |
| B-1 | 006 v2 | resolvido (`ccPainelAtencao` só com tipos próprios; a tela chama os três resumos; `atencaoDosResumos()`; bloco = 6) |
| C-1 | 006 v2 | resolvido (`fotoPendente` em 04 §6) |
| C-2 | 006 v2 | resolvido (limite na RN-006/RN-015 e no C-002; teste no banco B com Rita em outubro) |
| C-3 | 006 v2 | resolvido (Listar/Total como Sérgio e Ana; `…Atualizar` direto; `TEM_FOTO` afirmado) |
| B-1 | 000 v2 | resolvido (`SIS + caso`; 002 e 005 batem em entrada, guarda e custo 13) |
| B-2 | 000 v2 | resolvido (006 pela tela; 003 lê as tabelas da 005) |
| C-1 | 000 v2 | resolvido (29 SFs) |
| C-2 | 000 v2 | resolvido (contas iguais em 04 §5, 002 e 005) |
| C-3 | 000 v2 | resolvido (`origem`, `emailEnviadoId`, `membroId` em 04 §2 e no plan da 002) |
| C-4 | 000 v2 | resolvido (lista das JS aninhadas em 04 §0; `membroId` declarado nas donas) |
| C-5 | 000 v2 | resolvido (pipeline de 06 §2.3; seeds de 001–007 sem atribuição fora do passo 7, sem `rodarCron` no seed, `dominio()` sem relógio para trás; 003 por `INICIO`/`passado()`) |
| C-6 | 000 v2 | resolvido (passo 7 grava o analista por `ccEscBaseClienteAnalista`) |
| C-7 | 000 v2 | **mal resolvido**: C-2 |

## BLOQUEIA

Nenhum.

## CORRIGIR

| Id | Onde | Achado |
|---|---|---|
| C-1 | `004/spec.md` RN-007 (regra, linhas 440–447, e linha da seção Testes) × `004/plan.md` §Testes RN-007 (e), §Fluxo 4, R-010; `tasks.md` T-150; 01-correcoes §5 #3 | A regra nova da Pública ("quem gravou a análise do órgão, `ATUALIZADO_POR`, não decide") está no plano, nas tarefas e no contrato, mas não na spec: a RN-007 lista só limite, parecer, motor e ajuste, e a linha de teste só os desvios (a)–(d). O plano testa uma regra que a spec não tem (Constitution I), e o §4 "Para o usuário" anuncia uma mudança que a spec não descreve. |
| C-2 | `004/plan.md` §Internas `ccEscCredSolicitacaoInserir` ("`analistaId` = o próprio, ou outro só com nível ≥ 2") × `007/plan.md` §Simulador passo 4 e 01-correcoes §2 item 1 da 007 | Entre-specs C-7 mal resolvido. A correção põe Ana (Agente, nível 1) abrindo a solicitação do 7001 com `analistaId` = Rita, e a guarda da 004 recusa isso. A abertura falha, o pedido de Rita também falha (ela não vê o 7001), e os testes de Crédito do histórico ficam sem evento, como na v2. Um lado precisa mudar: Ana abre sem analista e Sérgio atribui (`ccCredSolicitacaoAtribuir`), ou a guarda aceita indicar o analista na abertura. |
| C-3 | 04 §5 `ccPubMotorCalcular` (Quem: caso; aninhada por `ccCredDecisaoRegistrar`) e `005/plan.md` ("guarda `caso` sobre o membro de `quem()`") × `004/plan.md` §Contratos ("a alçada não exige o cliente visível … quem decide na alçada não precisa ser do caso", DT-35) e RN-008 (DT-35) | Na Privada, quem decide na alçada fora do caso (Silvia numa solicitação de Rita) é aceito e testado. Na Pública, o mesmo decisor é recusado, porque a decisão chama `ccPubMotorCalcular` com o `membroId` dele e a guarda `caso` devolve "Solicitação não encontrada.". A mesma SF passa a se comportar diferente por carteira (D-05), sem regra e sem teste. O contrato precisa dizer se alçada exige cliente visível. Se não exige, a chamada aninhada pela decisão confere alçada em vez de `caso`. |

## OBSERVAÇÃO

| Id | Onde | Achado |
|---|---|---|
| O-1 | `004/tasks.md` T-191 × `plan.md` §Testes RNF-004 e §Orçamento | A T-191 diz "card = 2 (também em `comite` e no pedido)". Ela não traz o card público em `analise`/`comite` = 3 (DT-42) nem "abrir a Gestão ≤ 6 (5)", que o plano afirma. |
| O-2 | `004/plan.md` §Internas (`…Dados` não grava `PROPOSTA_POR`) × `NIVEL_CONCESSAO` | Dois termos de exceção (CNPJ recente; cliente `NOVO` com `VALOR` acima de `limite.fraudePct` do `FAT_MENSAL`) são lidos direto de colunas que `…Dados` grava. Se a mudança não alterar `RATING_MOTOR`, `MOTOR_LIMITE` ou `MOTOR_RESULTADO`, o superior tira o Comitê de crédito mudando um dado e decide na própria faixa, sem virar proponente. Declarar que essas colunas também gravam `PROPOSTA_POR`, ou que a exceção sai da fotografia. |
| O-3 | DT-40, §5 #3; 02 `PROPOSTA_POR`, `CC_ANALISE_ORGAO.ATUALIZADO_POR` | O autor da proposta é sempre o último a gravar. A proposta do superior deixa de bloqueá-lo quando o analista grava de novo, e na Pública basta salvar qualquer campo da análise (saldo, vigência). É limite aceito pelo contrato, mas não está registrado como limite conhecido (R-010 da 004 o dá como "fechado"). |
| O-4 | 01-correcoes §3 item 5 × 06 §3 "Fluxos entre módulos", 01 §14 | Os dois fluxos novos do `900-fluxos` (datas da NF movendo o card no clique nas duas hipóteses de sessão; decisão pública com a fotografia do órgão) só existem no pedido. A lista do integrador em 06 §3 não os traz. |
| O-5 | `006/plan.md` §Superfície `painel-agentes` (aba Agenda), T-057 | `ate` = 7º dia útil por `somarDiasUteis` na tela pede "hoje" e os feriados. O plano não diz de onde vêm: 06 §1 diz que a tela nunca envia "hoje", e no simulador o navegador não lê `CC_AGORA`. `ccBaseFeriadoListar` também não entra na conta do bloco (4 → 5, ainda ≤ 6). |
| O-6 | `005/plan.md` §Testes C-031 ("dependência declarada da sequência") × `LEIA-correcao-v2.md` ("isole, não reordene") | O C-031 continua dependendo de C-005 e C-012 terem aprovado 5003 e 5002 antes dele. Funciona com a ordem fixa, mas não é o isolamento pedido. |
| O-7 | `005/plan.md` §Simulador, `dominio()` (tabelas da 005); T-031 × 06 §2.3 (b) | Marcos das NFs e `CC_NF_ACAO` da 1001 vão direto na tabela, mas `ccPubNfDatasSalvar` e `ccPubNfPassoRegistrar` gravam esse estado. 06 §2.3 (b) só admite direto o que nenhuma SF grava, ou estado histórico. Declarar que é estado histórico (datas passadas, sem passar pela 002). |
| O-8 | `006/plan.md` §Simulador ("datas do seed da 006 absolutas") × 06 §1 | É exceção à regra "datas relativas ao `RELOGIO`", justificada pelas fotos de mês fixo, mas não registrada no contrato. No banco B o pipeline começa em `dia(-40)`, e o passo 6 lê pagamentos e notas posteriores a T0 (6002 pago em 03/11 lido em 05/10). Hoje não quebra porque o `dominio()` refaz as fotos. |
| O-9 | relatórios v2 | Observações v2 baratas que seguem abertas: 004 O-6 (RNF-001/002 sem tarefa; RNF-003 sem massa); 005 O-8 (`PCMOV` fora da T-028); 006 O-4 (`limite.concMax` com carteira "Todas"), O-5a (valor escrito em cada barra), O-9 (listas por agente, plano e equipe sem `LIMIT`). |
