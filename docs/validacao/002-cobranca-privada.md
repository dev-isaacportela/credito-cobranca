# Validação: 002-cobranca-privada

Validador independente. Data: 2026-11-14. Só leitura: nada foi corrigido nas specs.

Lido por inteiro: `docs/specs/002-cobranca-privada/{spec,plan,tasks}.md`, as três peças da 001 e da 003 (para os
contratos entre specs), constitution, arquitetura, execucao, templates, relatórios 00, A, B, C e E do estudo e a
skill `mitra-escopo`. Do relatório D li a navegação (§1.5, §1.13, §1.14) e as dúvidas (§5). Da 006 só fiz buscas.

Resumo: 4 BLOQUEIA, 9 CORRIGIR, 6 OBSERVAÇÃO.

## 1. Checklist do Fluxo A e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | Passa | Limpa. |
| Todo RF com critério de aceite | Passa | 38 RF. |
| Cenário de erro | Passa | Recusas de alçada, segregação, promessa fora do prazo, acordo fora da política. |
| Fora de escopo | Passa com ressalva | Declarado (envio automático, rating e criticidade na projeção, regularização manual); faltam os itens da seção 2. |
| Testes: linha por C-00N e RN-00N com números | Passa | 26 cenários e 30 regras, 56 linhas. C-021 não tem número fixo (O-2). |
| Plan: Constitution Check | Falha | Complexity Tracking "vazio" apesar de 22 SQL de escrita sem guarda (B-1). |
| Plan: contratos de SF | Passa | 62 SFs (8 régua + 16 leitura + 16 escrita JS + 22 escrita SQL), prefixo `cc`, tipo, params e saída. |
| Plan: listagem com LIMIT/OFFSET e `…Total` | Passa com ressalva | Listagens JS devolvem `total` no mesmo retorno (D-013, justificado); `ccPainel*` são agregados sem paginação (O-6). |
| Plan: seção Simulador | Passa com ressalva | Seed descrito, mas grava direto em tabela da 001 e usa equipe própria (C-2). |
| Plan: mapa de testes | Passa | 56 linhas. |
| Tasks: uma task por teste | Passa | T-080 a T-135 = 56. |
| Tasks: rastreabilidade RF → task → teste | Falha parcial | RF-005, RF-024, RF-029 e RF-034 só têm verificação manual (T-194); RF-014 (T-091 não paga parcela nem quita), RF-006 (T-100 não testa busca e filtros), RF-028, RF-031 e RF-033 têm teste que não exercita o critério (C-6). |

### Contas refeitas

| Linha | Entrada | Esperado na spec | Refeito | Veredito |
|---|---|---|---|---|
| C-010 | Promessa em 13/11/2026 (sexta), máximo de 5 dias úteis, feriado em 20/11 | Limite 23/11 | 16, 17, 18, 19 e, pulando 20, 21 e 22, 23/11 | Certo |
| C-012 | Proposta de 10.000 com entrada de 2.000 e 4 parcelas | 5 parcelas: entrada + 4 × 2.000,00 | (10.000 − 2.000) ÷ 4 = 2.000 | Certo |
| C-013 | Débito de 20.000 com entrada de 2.000 | Supervisor recusado, gerente aceito | 2.000 ÷ 20.000 = 10%, fora do padrão do supervisor; sobe de alçada | Certo |
| C-022 | Próximos 7 dias úteis a partir de 19/11/2026 | 19, 23, 24, 25, 26, 27 e 30/11 | 20/11 feriado, 21 e 22 fim de semana, 28 e 29 fim de semana | Certo |
| C-024 | BU com A (10.000 vencidos), B (30.000 a vencer), C (5.000 vencidos há 95 dias e 5.000 a vencer) | Índice 0,30; vencido 15.000 em 2 clientes; acima de 90 dias 5.000 | 15.000 ÷ 50.000 = 0,30; 5.000 ÷ 15.000 = 33,3% do vencido | Certo |
| C-025 | Projeção: P com pontualidade de 70% e 10.000 a vencer; Q com 90% e vencido; R sem recebimentos | P: 0,30 e 3.000; Q: 0,50 e 2.000; R: 0,05 e 50 | 1 − 0,70 = 0,30 × 10.000 = 3.000; 0,50 × 4.000 = 2.000; 0,05 × 1.000 = 50 | Certo |
| C-026 | Valor atualizado: 10.000 vencidos há 30 dias | 10.340 | Multa 2% = 200; juros 1% ao mês = 100; correção 0,4% = 40; total 10.340 | Certo |
| RN-010 | 10.000 em 3 parcelas | 3.333,33; 3.333,33; 3.333,34 em 23/11, 21/12 e 20/01/2027 | Resto de 0,01 na última; 21/11 é sábado e vai para 23/11; 21/12 segunda; 20/01 quarta | Certo |
| RN-015 | Juros de 10.000 por 30 dias | 100 | 10.000 × 1% × 30/30 | Certo |
| RN-026 | Conversão com 4.000 recebidos e 6.000 em aberto; dois devedores com 50% cada | Conversão 0,40; índice de concentração 5.000 | 4.000 ÷ 10.000 = 0,40; 50² + 50² = 5.000 | Certo |
| RN-023 | Avanço da régua | 19/11 e 23/11 | Datas certas, mas o exemplo "32 dias com alvo 30" não ocorre com a régua padrão: a etapa extrajudicial mira 45 dias | **Exemplo impossível** (C-9) |

## 2. Cobertura contra o artefato

O artefato faz e a spec não cobre nem declara fora de escopo:

- Item de agenda "ficha de contatos vencida ou nunca revisada" (A §3.20).
- "Cumprimento dos prazos" e o registro de conclusão no prazo de cada ação (`agLog`, B §3.3). A 006 (RF-017)
  mostra "concluídas no prazo e fora" e ninguém grava esse dado.
- KPIs do painel da agenda: contatos em 7 dias, cobertura da carteira, próximos passos em dia (B §3.6; D §1.5).
- Indicadores da visão gerencial (B §8.3): prazo médio de recebimento, recuperação de crédito, eficiência, índice
  de recebimento, tempo médio de atendimento, write-off, renegociação, classificação qualitativa e
  acompanhamento. Não achei write-off, eficiência, índice de recebimento nem tempo de atendimento na 002 nem na 006.
- Cronograma por dia da régua (D+2, D+regLig+1, D+regNeg+5, última negociação; A §3.13; D §1.13 "Régua completa").
- KPIs do histórico de contatos (B §8.2; D §1.14.4).

Divergências sem registro:

- "Protestado" só por item marcado; no artefato `foiProtestado` também considera dias de atraso e histórico.
- Promessa cumprida exige soma paga maior ou igual ao valor prometido; no artefato qualquer pagamento cumpre.

Regra copiada com defeito conhecido:

- RN-028 ("limiares diferentes entre si") repete o defeito de A §8.2 item 16 e contradiz a RN-016 da 001
  ("estritamente crescentes"). O teste espera a mensagem /diferentes/ (B-2).

Declarado e justificado: modo de envio automático fora; projeção sem rating e criticidade; regularização manual
removida (D-004); entrada como parcela 0 (D-007); acordo fora do padrão sobe de alçada (D-006).

## 3. Conformidade

- **Constitution II e III (regra no servidor, identidade por `:VAR_USER`)**: as 22 SQL de escrita e as SQL da régua
  não conferem permissão, alçada nem segregação. Precisam estar no perfil do usuário e, portanto, são chamáveis
  direto: `ccAcordoSituacaoGravar`, `ccBaixaDecisaoGravar`, `ccBaixaParecerGravar`, `ccCobrancaJuridicoGravar`,
  `ccEmailFilaSituacaoGravar`. `ccReguaAplicar` recebe `d1..d6` do chamador e é chamada por `ccCobrancaMover`:
  qualquer agente reclassifica a carteira com os limiares que quiser. A 001 já tem o padrão (D-008); a 002 não o usa (B-1).
- **Constitution I (política como parâmetro)**: as chaves `cob.*` duplicam ou renomeiam as da 001 (`regLig`,
  `quebraDias`, `alcBaixa1/2`, `multaPriv`, `promTolerDias`, `anuenciaDiasUteis`, `comTelefone`…) e são semeadas
  direto em `CC_PARAMETRO`, sem `CC_PARAMETRO_DEF`. Duas fontes para a mesma política (B-2).
- **Arquitetura (dono de tabela)**: o seed grava em `CC_POSICAO_CLIENTE`, que é da 001; a sincronização da 001 zera
  quem não está nas tabelas do Winthor (C-2).
- **execucao.md regra 2**: `add-002-cobranca.mjs` + `add-002-cron.mjs`, DDL dentro do add e `seed.mjs`/`smoke.mjs`
  comuns, em vez de `schema/002`, `simulator/seed/002` e `simulator/smoke/002` (C-2).
- **execucao.md regra 4 e P-06**: o plan deixa enviar modelo com efeito legal sem validação (T-018); a 001 bloqueia.
  As duas specs se contradizem e o C-018 falha (C-1).
- **300 SF/min**: `ccEmailFilaAcao` conta "N+4", mas cada `ccEmailEnviar` da 001 aninha de 5 a 6 SFs; um lote de 20
  passa de 120. `ccAcordoPropor` chega a 61 (C-4).
- **SQL que o SQLite não roda ou roda diferente**: `ccReguaAplicar` usa
  `UPDATE … SET ETAPA = …, ETAPA_DESDE = CASE WHEN ETAPA <> … END`. O MySQL avalia o SET da esquerda para a direita
  e já vê a ETAPA nova; o SQLite vê a antiga. O teste passa no simulador e a data da etapa nunca muda em produção.
  `UPDATE … JOIN` não existe no SQLite e não está na lista de adaptações do simulador (C-3).
- **Perfil**: T-024 inclui as 62 SFs e esquece o SELECT das 9 tabelas (C-5).
- **CRUD REST 403 e `{{param}}`**: sem violação.

## 4. Viabilidade do backend

- **Contratos com a 001 que não batem** (o próprio plan manda alinhar na T-001, mas hoje nada fecha):
  `VENCIDO_VALOR_DIAS` não existe; `DATA_SINC` contra `SINCRONIZADO_EM`; `DT_VENC` e `DT_PAGTO` contra `VENCIMENTO`
  e `DATA_PAGAMENTO` (mais `ESTORNADO`); cron em 0/15/30/45 contra cron de 5 minutos por intervalo; `ccEmailEnviar`
  com `(modeloCodigo, para, assunto, corpo, anexoIds)` contra `(codigo, clienteId, contatoId, extras, origem,
  referencia)`; `ccAuditoriaRegistrar` contra `ccAuditoriaRegistrarGravar`; `PREFERIDO` contra `PRINCIPAL`;
  `TEXTO_WHATSAPP` inexistente; campos de modelo fora do Anexo B da 001, que recusa campo desconhecido (B-3).
- **Fluxo com a 003 invertido**: RN-030 da 002 diz que o gerente encaminha e depois nasce o dossiê. A RN-004 da 003,
  igual ao artefato, diz que o agente monta o dossiê em rascunho e o envio pelo gerente move a cobrança. A 003
  pede `ccCobrancaEnviarJuridico(clienteId, processoId)`, `ccCobrancaSituacao` e `ccEncargosCalcular`; a 002 só tem
  `ccCobrancaEncaminharJuridico(clienteId, obs)` e calcula encargos em `frontend/src/lib/cobranca.ts` (B-4).
- **Seed**: equipe genérica (DIR, G, S1, S2, A1, A2, J, ADM) e clientes 2001 em diante somados ao seed comum quebram
  as contagens da 001; o feriado de 20/11/2026 precisa ser inserido de propósito, porque a 001 só gera o ano
  corrente e o seguinte a partir da data da carga (C-2).
- **Ordem dos crons**: a régua em horário fixo pode rodar antes da sincronização da 001 terminar (O-5).
- **Testes que não provam**: C-021 compara com um SELECT do próprio teste (O-2); RN-026 testa a conversão como
  função pura, sem seed (O-3); os RFs listados em C-6.
- **Valor atualizado**: D-010 aproxima a correção por dias médios, enquanto a RN-015 diz "título a título" (O-1).
  A 003 herda essa ambiguidade com números errados (ver relatório da 003, B-1).

## 5. Achados

| Id | Severidade | Arquivo e seção | Achado | Correção |
|---|---|---|---|---|
| B-1 | BLOQUEIA | plan.md contratos de escrita SQL e da régua; Complexity Tracking | SQL de escrita chamável direto, sem permissão, alçada nem segregação; régua aceita limiares do chamador. | Pôr a guarda com `:VAR_USER` na própria SQL (padrão D-008 da 001), tirar a régua do perfil (só cron) e fazer `ccCobrancaMover` não chamar `ccReguaAplicar`. |
| B-2 | BLOQUEIA | spec.md RN-028 e parâmetros; plan.md seed de `CC_PARAMETRO` | Chaves `cob.*` duplicam o catálogo da 001 e a RN-028 copia o defeito "diferentes entre si". | Usar as chaves da 001, registrar só as novas no catálogo e trocar a RN-028 e o teste para "estritamente crescentes". |
| B-3 | BLOQUEIA | plan.md "Depende da 001" e contratos | Colunas, nomes e assinaturas não batem com o plan da 001. | Fechar a tabela de contratos com a 001 antes de qualquer task de backend e corrigir os dois plans. |
| B-4 | BLOQUEIA | spec.md RN-030; plan.md `ccCobrancaEncaminharJuridico` | Encaminhamento ao Jurídico na ordem inversa da 003 e três SFs pedidas pela 003 não existem. | Adotar a ordem do artefato (dossiê em rascunho, envio pelo gerente move a cobrança) e publicar `ccCobrancaEnviarJuridico`, `ccCobrancaSituacao` e `ccEncargosCalcular` no servidor. |
| C-1 | CORRIGIR | plan.md P-06 e tasks.md T-018 | Envio de modelo legal sem validação contradiz a RN-022 da 001. | Seguir a 001: bloquear o envio e depender da validação provisória (001 B-1). |
| C-2 | CORRIGIR | plan.md seção Simulador e estrutura de arquivos; tasks.md | Seed grava em tabela da 001, usa outra equipe, colide nas contagens e o layout contraria a regra 2. | Semear nas tabelas do Winthor simulado e deixar a sincronização calcular; reusar a equipe da 001; faixa de códigos própria; arquivos `…/002-cobranca-privada.mjs`. |
| C-3 | CORRIGIR | plan.md `ccReguaAplicar` | Ordem de avaliação do SET difere entre MySQL e SQLite; `UPDATE … JOIN` sem adaptação. | Gravar `ETAPA_DESDE` antes de `ETAPA` no SET (ou em duas instruções) e trocar o JOIN por subconsulta. |
| C-4 | CORRIGIR | plan.md `ccEmailFilaAcao`, `ccAcordoPropor`, riscos | Conta de execuções ignora as SFs aninhadas da 001. | Teto de lote (por exemplo 10 e-mails por chamada) e INSERT de várias linhas para parcelas. |
| C-5 | CORRIGIR | tasks.md T-024 | Perfil sem SELECT nas 9 tabelas. | Incluir as tabelas no script de perfil. |
| C-6 | CORRIGIR | plan.md mapa de testes; tasks.md T-091, T-100, T-194 | Nove RFs sem teste que exercite o critério. | Acrescentar asserts: pagar parcela e quitar (RF-014), busca e filtros (RF-006) e um teste para cada RF hoje só manual que tenha regra. |
| C-7 | CORRIGIR | spec.md RFs da agenda e da visão gerencial; Fora de escopo | Seis blocos do artefato sem cobertura e sem declaração; a 006 depende do registro de conclusão no prazo. | Cobrir o registro de conclusão e o item de ficha vencida; declarar o resto fora de escopo ou passar à 006. |
| C-8 | CORRIGIR | spec.md regras de protesto e de promessa | Duas regras divergem do artefato sem registro. | Registrar a decisão e o motivo, ou voltar à regra do artefato. |
| C-9 | CORRIGIR | spec.md RN-023 e linha de teste | Exemplo "32 dias com alvo 30" não acontece com a régua padrão. | Trocar por um caso real (47 dias com alvo 45, por exemplo). |
| O-1 | OBSERVAÇÃO | plan.md D-010; spec.md RN-015 | Correção por dias médios contra "título a título". | Escolher uma e alinhar com a 003. |
| O-2 | OBSERVAÇÃO | plan.md mapa, C-021 | Assert compara com SELECT do próprio teste. | Fixar o número esperado a partir do seed. |
| O-3 | OBSERVAÇÃO | plan.md mapa, RN-026 | Conversão testada sem seed. | Um caso com seed. |
| O-4 | OBSERVAÇÃO | plan.md leituras com parâmetro `hoje` | A data vem da tela. | Calcular no servidor; aceitar parâmetro só no simulador. |
| O-5 | OBSERVAÇÃO | plan.md cron da régua | Pode rodar antes da sincronização. | Rodar a régua ao fim da sincronização ou conferir a hora da última. |
| O-6 | OBSERVAÇÃO | plan.md D-013 e `ccPainel*` | `total` embutido e agregados sem paginação. | Registrar a exceção à arquitetura §2. |

## 6. Perguntas ao gestor

| Pergunta | Padrão provisório do plan | Seguro para construir agora? | Recomendação |
|---|---|---|---|
| P-01 (dia do bloqueio total) | `cob.regBloqTotal` = 10, parâmetro separado | Sim | Manter, com a chave no catálogo da 001. |
| P-02 | Padrão do artefato, parametrizado | Sim | Manter. |
| P-03 | Padrão do artefato, parametrizado | Sim | Manter. |
| P-06, modelos com efeito legal | Enviar mesmo sem validação, marcado "não validado" | **Não** (contradiz a 001) | Bloquear o envio e liberar a validação provisória por Jurídico ou Gerente (001 B-1). |
| P-06, encargos (2%, 1% ao mês, 0,4% ao mês) | Padrão do artefato, marcado "não validado" | Sim | Manter; são parâmetros. |
| Acordo registrado no ERP | Registro manual | Sim | Manter. |
| Faixa intermediária da baixa como perda | Nível 5 (Diretoria) | Sim, conservador | Manter. |
| Parecer do Jurídico em toda baixa | Exigido | Sim, conservador | Manter. |
