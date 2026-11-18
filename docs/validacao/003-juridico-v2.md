# Validação v2: 003-juridico

Validador independente, rodada v2 (fase 0c, passo 5). Data: 2026-11-16. Só leitura: nada foi corrigido.

Lido por inteiro: `docs/specs/003-juridico/{spec,plan,tasks}.md`, o relatório v1 (`003-juridico.md`), `LEIA-v2.md`,
o contrato `00`–`06` nas seções que a 003 usa (01 §3–§14, 02 §003 e `CC_CLIENTE`, 03 §6 e §14, 04 §0–§3 e §8,
05 §1–§2, §3.6, §6–§8, 06 inteiro), `pedidos/00-respostas.md` (PJ-01 a PJ-13, PA-14, DT-29), `arquitetura.md` §7 e
`opcoes-tela/escolhas.md`. Do plan da 001 e da 002, só os trechos de rotina, trava, seed e `ccCobEnviarJuridico`.

Resumo: **1 BLOQUEIA, 9 CORRIGIR, 8 OBSERVAÇÃO.**

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | Passa | |
| RF com critério de aceite; cenário de erro; fora de escopo | Passa | 40 RF; O-7 da v1 virou "fora de escopo" |
| Testes: linha por C-NNN e RN-NNN com números | Passa | 59 linhas; encargos refeitos (tabela abaixo) |
| `[NEEDS CLARIFICATION]` / "pendente do arquiteto" | Passa | nenhum; PJ-01 a PJ-13 aplicados |
| Plan × contrato: tabelas, colunas, parâmetros, SFs, fases, cargos | Passa com ressalva | 8 tabelas e colunas de 02 §003 batem; 31 chaves `jur.*` = 03 §14; 42 + 19 SFs = 04 §3; 11 fases = 05 §6. Desvios em C-7, O-1, O-3 |
| Spec × plan × tasks | Passa com ressalva | 56 `teste()` (T-101 a T-156) + 4 `test()` de tela + orçamento + gancho; toda SF pública tem tarefa. Spec × plan diverge em RN-007 (C-6) e RN-009(b) (C-9) |
| Ordem dos testes em estado compartilhado | Falha | C-009 depois de C-003 (C-3); rotina do RN-007 no meio do bloco B (C-2) |
| Orçamento (DT-29) | Passa com ressalva | contas abaixo; tela e card do dossiê passam do teto (C-5) |
| D-01 a D-06; sem arrastar; quadro pela lib | Passa | gancho com `PODE_ADMINISTRAR`; "Mover para" no card |
| Telas × `escolhas.md`; telas sem desenho com tarefa | Passa | 9 telas com a opção certa; "Novo processo", filiais, ficha de leitura e dossiê público com tarefa (T-214 a T-216, T-223) |
| Identidade, escrita guardada, `VITE_*`, produção, migration | Falha em um ponto | identidade pela sessão; guarda do acordo não relê a política (B-1) |
| Carga: leitura no navegador × revalidação no servidor | Passa com ressalva | arquivo não sai do navegador; servidor recalcula chave e vínculo; formato da linha e vínculo confirmado sem contrato (C-4, C-8) |

### Contas refeitas

| Linha | Refeito | Veredito |
|---|---|---|
| Atlas 31.087,25 e Iota 34.388,25 (título a título, 03 §6) | 228 + 120; 91,25 + 48,00 · 346,67 + 173,33; 138,87 + 69,38 | Certo (B-1 da v1 resolvido) |
| C-010, C-022, C-016, RN-016, RN-023 (20 e 21) | 5/320 mil, 4/175 mil, 3/42 mil; 3, 8, 1, 11, 1, 12; 13 alertas e 4 críticos; 30.000 ÷ 537.000 = 5,6%; 3,7 anos; 2 ÷ 8 | Certo |
| `ccJurDossieEnviar` ≈ 28 | JS 1 + envio 1 + encargos 3 + item 1 + andamento 1 + auditoria 1 + `kbCardMover` 5 + `kbCardAtualizar` 3 + `ccCobEnviarJuridico` 12 = 28 | Certo (≤ 30) |
| `ccJurDossieAbrir` ≈ 16 | 1 + títulos 2 + processo 1 + itens 1 + `kbCardCriar` 6 + card 1 + auditoria 1 + nota 2 = 15 | Certo |
| `ccJurCargaAplicar` ≈ 13 | 13 no caso comum; processo encerrado (+`kbCardMover` 5) e com custos (+1) = 19 | Certo, no limite |
| Ritmo da carga | 10 processos/min × 13 = 130/min (≤ 150, metade de 300); 500 em 50 min | Certo |
| Abrir aba Processos = 6 | sessão + 2 da lib + alertas + indicadores + parâmetros | Certo |
| Abrir o dossiê (rota ou card) | sessão + ficha + `ccJurDossieSugestao` (1 + encargos 3; + `ccPubNfListar` + `ccPubCertidaoListar` na pública) + filiais = 7 (privada) e 9 (pública); no card, ficha + sugestão | **Passa do teto** (C-5) |

## 2. BLOQUEIA

| Id | Onde | Achado |
|---|---|---|
| B-1 | plan.md "Internas e guardas", linha `JurAcordoInserir`; `ccJurAcordoCriar` | A situação (`ANDAMENTO`/`AGUARDANDO`) e o `NIVEL_EXIGIDO` do acordo são decididos na JS; a guarda de `ccEscJurAcordoInserir` só confere `JUR`, processo aberto e `NOT EXISTS`. Um Jurídico que chama a interna direto grava acordo de 70.000 já `ANDAMENTO` com nível 0: pula alçada e segregação, que é o defeito do B-4 da v1. 01 §5 ("Limites conhecidos") manda pôr entrada mínima, parcelas máximas e teto de alçada na `GUARDA` com `PARAM(…)`. Correção: o `INSERT … SELECT` calcula `SITUACAO`, `ACIMA_ALCADA` e `NIVEL_EXIGIDO` com `PARAM_NUM('jur.acordo*')` sobre os valores recebidos; o "Limite conhecido" do plan e o Complexity Tracking passam a dizer isso. |

## 3. CORRIGIR

| Id | Onde | Achado |
|---|---|---|
| C-1 | plan.md Simulador, `dominio()` passo (a) | O relógio volta para `dia(-40)` e roda a rotina para a 3013 chegar a `protesto`. Pela 01 §11 a rodada só lê o Winthor se a última leitura começou há ≥ 14 min. Com o relógio para trás, a idade da última leitura (feita em D) dá negativa, então não há leitura e as posições continuam as de D (atraso 52, fase `extrajudicial`). O `ccCobAcaoRegistrar` na fase `protesto` falha, e C-001/RN-003 ficam sem o protesto conferido. Correção: forçar a leitura (`ccBaseSincronizacaoPedir`) em `dia(-40)` ou dizer como o integrador trata relógio para trás. |
| C-2 | plan.md Testes, ordem do bloco B (RN-007) e T-120 | O `rodarCron('ccRotina')` do RN-007 roda no meio do bloco B. É a primeira rotina depois de o seed criar P01–P05, P09 e P12, então a linha 14 de 05 §3.6 leva ao `juridico` os casos de 3002, 3003, 3005, 3006, 3007 e 3010, além da Iota: cards movidos e notas gravadas, coisa que o seed nunca fez. Depois disso, o RN-004 (T-127) afirma que a fase da Iota "continua a mesma" após abrir o dossiê e manda Sérgio enviar o dossiê da Iota. A Iota já está em `juridico`, com `PROCESSO_ID` do processo manual, e `ccCobEnviarJuridico` recebe outro `processoId` (não é `jaEnviado`), um caminho que a 002 não define. Correção: rodar uma rotina no fim de `dominio()`, para o seed já sair coerente, e levar o RN-007 para o fim do bloco B (ou fazê-lo num cliente sem dossiê); declarar o efeito sobre os demais clientes. |
| C-3 | plan.md ordem ("C-009 depois de C-012, RN-008 e C-014"); tasks T-126, T-127, T-148, T-149 | O C-009 exige a Atlas em `dossie` com 7 de 10 e recusa "Envie o dossiê". Só que o C-003 (T-126) já enviou a Atlas e o RN-004 (T-127) enviou a Iota. Quando o T-148 roda, o movimento da Atlas para Petição é **aceito**. Do RN-009 em diante, o único processo em `dossie` é o do Fundo de Luziânia (C-007, público). É o C-3 da v1 mal resolvido. Correção: rodar o trecho da Atlas no C-009 antes do C-003, ou abrir um dossiê privado só para o C-009 e o RN-009. |
| C-4 | plan.md "Carga inicial" itens 2 e 3; T-008, T-020, T-204, `PLANILHA_TESTE` | O formato de um "processo interpretado" (o JSON de `linhas`) não está escrito em lugar nenhum: o contrato só diz "JSON" e o plan só diz "no formato de `ccJurCargaAplicar`". A tela (T-204), o servidor (T-008/T-020) e o seed dependem dele. Pontos soltos: (a) a data do andamento chega como "dd/mm" cru ou já convertida? O plan põe a conversão nos dois lados, mas o RN-010 é testado no servidor; (b) qual motivo de encerramento vem da planilha "Quitado"; (c) `ORIGEM_SITUACAO = 'COR_PLANILHA'` gravado pelo servidor; (d) custos (o contrato aceita 20, o plan não cita); (e) a situação do acordo da carga, se passa ou não pela política. Correção: uma tabela de campos no plan, dizendo o que o servidor ignora e recalcula. |
| C-5 | plan.md "Orçamento ao abrir"; Superfície (dossiê "o mesmo componente nos dois lugares"); T-157 | Abrir o dossiê chama a ficha, mais `ccJurDossieSugestao`, que leva encargos e títulos aninhados (e, na pública, mais 2 SFs da 005), mais as filiais. Dá 7 execuções na privada e 9 na pública, contra o teto de 6 por tela (01 §10). No card em `dossie` o conteúdo da fase chama ficha e sugestão, contra "card = `kbCardDetalheSql` + **1** ficha". O T-157 não mede. Correção: a orientação já fica gravada na abertura; a sugestão ao vivo vira botão ("Atualizar sugestões"), ou entra na ficha só na fase `dossie`. Pôr a conta e o teste no plan. |
| C-6 | plan.md `ccJurDossieAbrir` passo (0) e guarda `JurProcessoInserir` × spec RN-007 e RF-007 | A spec diz que abrir o dossiê de cliente com **qualquer** processo ativo abre esse processo. O plan só reaproveita o processo de origem `COBRANCA`. Cliente com processo manual ou da carga (cuja cobrança a rotina já levou a `juridico`, onde "Montar dossiê" continua visível) ganha um segundo processo ativo, o que viola o RF-007. Correção: o passo (0) e o `NOT EXISTS` passam a olhar qualquer processo ativo do cliente na carteira. |
| C-7 | plan.md gancho regra (1) × teste RN-004 (T-127, "Sérgio envia") e 05 §1 regra 6 | Com `jur.envioNivelMin = 2` e `SIM_SESSAO_ANINHADA=1`, o `kbCardMover` aninhado do envio usa a sessão de Sérgio: o gancho recusa ("Só o Jurídico move processos.") e a lib também, porque ele é `restrito` e não é o responsável do card. No modo 0 passa, e 06 §3 exige resultado igual nos dois modos. A falha é do contrato: a regra (1) olha quem move, não o estado do domínio, ao contrário do princípio de 04 §8. Correção: pedir ao arquiteto (exceção `dossie → recebido` com `DOSSIE_ENVIADO_EM` preenchido, ou `jur.envioNivelMin` ≥ 3) e ajustar o teste. |
| C-8 | plan.md "Carga inicial" item 3 e tela da carga (C-023); 04 §3 `ccJurCargaPrevia` | Três problemas no vínculo durante a carga: (a) a saída da prévia em 04 (`clienteSugerido`, singular) não tem lista de candidatos, e o C-023 e a tela pedem "2 candidatos (3015 e 3016)"; (b) o servidor só aceita `clienteId` "se foi confirmação explícita de uma sugestão", coisa que ele não tem como saber; (c) a tela oferece "Outro → busca por código ou CNPJ" e escolha entre dois candidatos (sem sugestão), e o servidor descarta essas escolhas sem avisar. Correção: incluir `candidatos[]` na prévia (pedido ao contrato) e aceitar qualquer `clienteId` existente (é vínculo por código, RN-011; quem carrega já é `JUR` e pode vincular pela ficha). |
| C-9 | plan.md `ccJurProcessoCriar` × spec RN-009(b); seed (`dominio()` passo d) | O card nasce direto na `faseChave` sem passar pelo gancho, e o plan aceita `autos` vazio em qualquer fase. Dá para criar processo em `citacao`, `defesa`, `sentenca` ou `execucao` sem número dos autos. Correção: recusar essas quatro fases com autos vazio (a mesma frase do gancho). |
| C-10 | plan.md Simulador (seeds carregados); 06 §3 "seeds declarados no topo" | O plan não diz quais seeds o smoke da 003 carrega (a 002 diz "não carrega o seed de clientes da 001"). Com o seed da 001, o 1004 (3.000 com atraso 45) entra em "pronto para o Jurídico sem dossiê"; com o da 002, entra o 2010 (atraso 47). C-016 e C-002 deixam de dar 13 e 12. Correção: declarar "elenco + seed 003, sem seed de clientes de outra spec". |

## 4. OBSERVAÇÃO

| Id | Onde | Achado |
|---|---|---|
| O-1 | plan.md "Escrita em tabela de outra dona" | `NO_JURIDICO` "fora da fase `dossie`" é mais estreito que 02 (`CC_CLIENTE.NO_JURIDICO` = "tem processo ativo") e que PA-14. Fica coerente com 04 §2 passo 4, mas convém o arquiteto fixar uma das duas leituras. |
| O-2 | plan.md Testes C-018 ("filial 3 sem CNPJ … criada no teste") | Se a filial 3 tiver UF DF ou GO, a carga do bloco C acha duas filiais na UF, gera aviso a mais em `ALERTA_CARGA` e as pendências do C-020 (1 → 5) mudam. Fixar outra UF ou inativá-la. |
| O-3 | plan.md Contexto técnico e `ccJurDossieSugestao` | `ccPubAnaliseObter` recebe `solicitacaoId`, e o dossiê só tem o cliente; 04 §3 lista para a sugestão só `ccPubNfListar` e `ccPubCertidaoListar`. Fica para o validador entre specs. |
| O-4 | plan.md carga item 3 (`sugerirCliente`) | A semelhança de nome no servidor lê todos os nomes de `CC_CLIENTE` a cada chamada da prévia ou da aplicação; declarar o teto de linhas ou pré-filtrar por `NOME_BUSCA`. |
| O-5 | plan.md Simulador `winthor()` | O seed não fixa o endereço da 3013 (exigido pela orientação de cadastro do C-001), o "cliente sem endereço" do RN-003, nem o vencimento dos títulos "dos demais" com processo. |
| O-6 | plan.md Testes RN-008 e RN-032 | Afirmam números absolutos (6 em andamento; Galderma 2) depois de o RN-007 criar o segundo processo da Iota; vale só se ele nascer sem autos e sem linha (dizer no teste). |
| O-7 | plan.md guarda `JurProcessoInserir`; 05 §6 `acoesExtras` | A spec (RN-030) deixa o Jurídico abrir o dossiê; a guarda (`clienteVisivelA` ou nível ≥ 2) recusa o Jurídico em cliente sem `NO_JURIDICO`. "Gerar notificação" está em `acoesExtras` no plan, mas não em 05 §6 (acréscimo inofensivo). |
| O-8 | plan.md Testes RN-007 e seed | Com o relógio fixo, `rodarCron` só executa se o simulador ignorar a trava de 4 min da rotina (plan da 001, passo 1). O próprio orquestrador do seed depende disso; confirmar com o integrador. |

## 5. v1 → v2

| v1 | Destino | Nota |
|---|---|---|
| B-1 encargos | Resolvido | título a título (03 §6); Atlas 31.087,25 e Iota 34.388,25 conferem |
| B-2 seed | Resolvido | faixa 3001–3099, elenco único, relógio D; restam os pontos do seed em C-1, C-10, O-5 |
| B-3 SFs da 002 | Resolvido | `ccCobEncargosCalcular`, `ccCobEnviarJuridico`, `ccCobSituacao` em 04 §2; fluxo do dossiê primeiro igual nos dois |
| B-4 guarda de alçada | Mal resolvido | envio, aprovação e segregação estão na SQL; a criação do acordo não (B-1) |
| C-1 nomes da 001 | Resolvido | |
| C-2 parâmetros | Resolvido | 31 `jur.*` de 03 §14 |
| C-3 ordem dos testes | Mal resolvido | C-3 e C-2 desta rodada |
| C-4 arquivos | Resolvido | `add-030-juridico.mjs`, `schema/003`, `seed/003`, `smoke/003` |
| C-5 data do andamento | Resolvido na regra | spec e plan dizem o mesmo; falta dizer de que lado da carga se converte (C-4) |
| C-6 CSV | Resolvido | T-253 |
| C-7 taxa de recuperação | Resolvido | mesmo universo (P-44), indicador 21 definido |
| O-1 a O-8 | Resolvidos | sem `JSON_TABLE`; estado em `CC_ESTADO`; sem `CC_HOJE`; teto em memória com `ponytail:`; 1 processo por chamada; pré-requisito ajustado; itens do artefato declarados fora; baixa com aviso |
