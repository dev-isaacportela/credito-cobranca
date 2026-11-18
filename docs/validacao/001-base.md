# Validação: 001-base

Validador independente. Data: 2026-11-14. Só leitura: nada foi corrigido nas specs.

Lido por inteiro: `docs/specs/001-base/{spec,plan,tasks}.md`, `docs/constitution.md`, `docs/arquitetura.md`,
`docs/execucao.md`, `docs/templates/`, relatórios 00, A, B, C e E do estudo do artefato, skill `mitra-escopo`
(SKILL, `plataforma-mitra.md`, `simulador.md`, `runtime.mjs` do kit). Do relatório D li a navegação (§1.3 a §1.14)
e as dúvidas (§5); a ficha de crédito (§2 e §3) não foi lida porque pertence à 004. Das specs 004 a 007 só fiz
buscas pontuais para conferir quem consome o quê.

Resumo: 1 BLOQUEIA, 11 CORRIGIR, 9 OBSERVAÇÃO.

## 1. Checklist do Fluxo A e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | Passa com ressalva | RNF-001, RNF-002, RNF-004 e a Verificação manual citam "sandbox", "simulador", "T-001/T-002" e "plan" (O-1). Nenhuma tabela, SF ou componente. |
| Todo RF com critério de aceite | Passa | 42 RF, todos com critério verificável. |
| Cenário de erro | Passa | Recusas de permissão, de validação e de política presentes (C-017 soma 12 recusas). |
| Fora de escopo | Passa | Declarado, inclusive `fatMes` e planos de pagamento ("sem dono", ver C-11). |
| Testes: linha por C-00N e RN-00N com números | Passa | 27 cenários e 27 regras; 33 linhas de teste, todas com entrada e resultado. |
| Plan: Constitution Check | Passa com ressalva | Presente; o Complexity Tracking registra só a validação de conteúdo e omite três exposições reais (C-2). |
| Plan: contratos de SF (prefixo, tipo, params, saída) | Passa | 64 SFs (23 JS + 41 SQL; conferi 15+8+16+22+3), todas `cc…`, com tipo, parâmetros com valor desligado e colunas. |
| Plan: listagem com LIMIT/OFFSET e `…Total` | Falha parcial | Nove listagens sem paginação (`ccMembroListar`, `ccMembroVisiveis`, `ccParametroListar`, `ccParametroHistorico`, `ccBuListar`, `ccFeriadoListar`, `ccContatoListar`, `ccModeloListar`, `ccAnexoListar`), justificadas em D-010 mas sem registro no Complexity Tracking (O-2). `ccParametroHistorico` e `ccAnexoListar` crescem sem teto. |
| Plan: seção Simulador | Passa | Seed por cenário e `CHECK_INPUT` descritos. |
| Plan: mapa de testes | Passa | 33 linhas mapeadas para arquivo e assert. |
| Tasks: uma task por teste | Passa | T-080 a T-112 = 33. |
| Tasks: rastreabilidade RF → task → teste | Passa | Sem buraco; RF-030 fica bloqueado por NC-1 a NC-3, declarado. |

### Contas refeitas

| Linha | Entrada | Esperado na spec | Refeito | Veredito |
|---|---|---|---|---|
| C-001 | Limite 10.000; títulos vencidos 1.500, a vencer 3.100; vendas 9000 a 9004 (5.300) e 8999 cancelada | vencido 1.500; a vencer 3.100; 12 dias; próximo 2.300; utilizado 4.600; disponível 5.400; 5 compras de 5.300 | 1.500 + 3.100 = 4.600; 10.000 − 4.600 = 5.400; cancelada fora da conta | Certo |
| C-002 | Título de 1.700: recebimento de 700 com 2 dias de atraso, depois 500, depois estorno do de 700 | Vencido 1.000 após o primeiro; 2 recebimentos; após o estorno vencido 1.700 e 30 dias | 1.700 − 700 = 1.000; estornar os 700 devolve o vencido a 1.700 | Certo |
| C-009 | Visibilidade pela hierarquia, 10 clientes no seed | Ana 3, Bruno 2, Carlos 2, Silvia 2, Sérgio 6, Gustavo 10, Diana 10, Nara 10, Júlia 0 | Cada agente vê a própria carteira; cada supervisor a sua mais a dos agentes dele; gerente, diretoria e administradora os 10; Jurídico nenhum | Certo |
| C-014 | Reatribuição de carteira | Ana 5, Bruno 0, Carlos 3 | Idem | Certo |
| C-017 | Bateria de recusas | 7 + 5 = 12 recusas | Contei 12 casos distintos | Certo |
| C-021 | Calendário 2026 | 13/11 sexta; 15/11 domingo; 19/11 + 1 dia útil = 23/11; Carnaval 16 e 17/02; Sexta-feira Santa 03/04; Corpus Christi 04/06; 13 feriados nacionais | Páscoa de 2026 em 05/04: −47 dias = 17/02, −2 = 03/04, +60 = 04/06; 20/11 é feriado e cai numa sexta, logo o próximo útil é 23/11 | Certo |
| RN-026 | Catálogo de parâmetros | 114 = 15+16+12+6+5+11+5+5+12+11+6+1+4+5; 72 do artefato + 42 novos | Soma dos grupos = 114; 72 = 15+10+10+6+5+12+4+10 (REGRAS_PADRAO) | Certo |
| C-016 | Parâmetro com 3 vigências | 62.725,59 em 30/06/2025; 65.492,11 em 14/11/2026; 70.000,00 em 02/01/2027 | Vale a vigência mais recente até a data consultada; as três datas caem em vigências diferentes | Certo |
| C-018 e C-026 | Seis alterações de parâmetro (4→5, 5→4, 30→35, 90→85, 35→30, 85→90) | "2 registros" mais "outros dois" = 4; C-026 filtra "4 mudanças de Nara" | Seis gravações com valor diferente geram 6 registros de auditoria, não 4 | **Errado** (C-1) |

## 2. Cobertura contra o artefato

Não coberto nem claramente decidido:

- Tela "Prazos de pagamento" (planos, `PLANOS_PADRAO`, vínculo cliente × plano; B §3.11 e D §1.8) e o consolidado
  planos × faturamento (B §3.10): a spec declara "sem dono". A 006 pede `CC_PLANO` e `CC_FATURAMENTO_MES` à 001 no
  plan dela. Ou a 001 assume, ou a 006 perde o indicador (C-11).
- Parâmetros `regConfPag`, `posProtestoDias` e `prevAviso2` entram no catálogo com a nota "usa 002", mas a 002 não
  os usa: o cronograma por dia da régua (A §3.13) ficou sem dono (C-6).
- O artefato exige ao menos um Gerente na equipe; a 001 não tem essa regra (O-6).

Divergências de número: nenhuma sem justificativa nos 72 parâmetros herdados. Os 42 novos estão marcados.

Defeitos conhecidos do artefato (00 §5): vínculo por nome virou vínculo por código do cliente; escrita no front virou
SF; auditoria passou a ser só inserção. Corrigidos. A regra "limiares estritamente crescentes" (RN-016) corrige o
defeito de A §8.2 item 16, mas a 002 o reintroduz (ver relatório da 002, B-2).

Melhoria registrada: feriado local por UF e município. Detalhe: 30/11 é feriado no DF (Dia do Evangélico) e o teste
trata a data como útil com `calendarioUf=DF` (O-5).

## 3. Conformidade

- **Constitution V (auditoria em toda escrita)**: a escrita do usuário passa por JS que chama a SQL `…Gravar` e
  depois a auditoria. Como a SQL precisa estar no perfil do usuário, ela pode ser chamada direto, sem auditoria.
  `ccAuditoriaRegistrarGravar` aceita registro forjado por qualquer membro e `ccEmailRegistrarGravar` aceita
  "ENVIADO" sem envio (RN-023). O plan (R-007, Complexity Tracking) só reconhece a perda da validação de conteúdo (C-2).
- **Constitution II (regra no servidor)**: `ccParametroSalvar` grava uma chave por vez, mas a RN-016 valida
  relações entre chaves; o resultado passa a depender da ordem em que a tela grava (C-3).
- **Arquitetura §2 (paginação)**: nove listagens sem LIMIT/OFFSET (O-2).
- **execucao.md regra 2 (costura por módulo)**: o plan usa `add-001…add-006`, `add-009`, DDL em `setup-backend.mjs`
  e `smoke.mjs`/`seed.mjs` únicos; a regra pede `add-NNN-<slug>.mjs`, `schema/NNN`, `simulator/seed/NNN` e
  `simulator/smoke/NNN`. Os números 002 a 006 colidem com os `add-002-*` da spec 002 (C-7).
- **300 SF/min**: `ccClienteAtribuir` (2 SFs por cliente, sem teto de lote), `ccParametroRestaurar` por grupo,
  `ccFeriadoGerarAno` (13 × 2) e a auditoria com uma SF por campo. R-010 não conta chamadas aninhadas (C-4).
- **CRUD REST 403, `{{param}}`, SQLite**: sem violação. Escrita só por SF SQL chamada por id; parâmetros numéricos
  com 0 de desligado; `bindParams` do kit escapa apóstrofo. Nenhum SQL fora do que o simulador roda.

## 4. Viabilidade do backend

- **Dependência circular (bloqueio)**: RN-022 só envia modelo com efeito legal depois de validado, e as SFs de
  validação (`ccModeloValidar`, `ccModeloValidacaoGravar`) ficam fora do `PUBLISH_ORDER` enquanto NC-9 não for
  respondida. Resultado: notificação formal, protesto, extrajudicial, jurídico e carta de anuência nunca saem.
  O C-018 da 002 e a notificação da 003 dependem disso (B-1).
- **Dado que os consumidores pedem e a 001 não entrega**: `VENCIDO_VALOR_DIAS` em `CC_POSICAO_CLIENTE` (002),
  `ENDERECO` em `CC_CLIENTE` (003), `CC_PLANO` e `CC_FATURAMENTO_MES` (006), texto de WhatsApp no modelo (002) e os
  campos `[NOME_CONTATO]`, `[DATA_VENCIMENTO]`, `[DATA_VENCIMENTO_ORIGINAL]`, `[TELEFONE_COBRANCA]`,
  `[EMAIL_COBRANCA]`, que o Anexo B não lista e a 001 recusa como campo desconhecido (C-8).
- **Catálogo fechado**: RF-022 e os testes fixam 114 parâmetros. A 002 traz cerca de 25 chaves novas e a 003 traz 37
  `JUR_*`; o grupo 11 "Jurídico" da 001 (`jurEntradaPct`, `jurMaxParcelas`, `jurAlcAcordo`, `jurHonorariosPct`,
  `jurCustoMetaPct`, `notifPrazoDias`) duplica as da 003. Falta dizer como um módulo acrescenta chaves (C-5).
- **Seed**: as contagens esperadas (Gustavo 10, Ana 3, e as de C-009) quebram se os seeds da 002 e da 003 entrarem
  no mesmo banco. Falta regra de isolamento (C-9).
- **Riscos já na T-002**: usuário business rodando leitura por conexão externa (R-003) e o tempo da leitura dos
  títulos dentro dos 60 s (R-002). Se a T-002 falhar, o desenho da sincronização muda (O-3).
- **Atomicidade**: RF-005 promete posição coerente, mas uma falha no meio do passo 6 altera parte das posições (O-4).
- **Testes que não provam o que dizem**: RF-028 (BU com cliente só pode ser inativada), RF-034 (revisão sem
  alteração), RN-021 (contato principal marcado "não usar mais"), RN-022 (validade em meses), RN-023 (campo sem
  valor), RF-007 (ordem da lista) e a maior parte da RN-016 não têm assert próprio (C-10).

## 5. Achados

| Id | Severidade | Arquivo e seção | Achado | Correção |
|---|---|---|---|---|
| B-1 | BLOQUEIA | plan.md, PUBLISH_ORDER e D de NC-9; spec.md RN-022 | Modelo com efeito legal exige validação e a validação não é publicada: envio impossível, travando 002 (C-018) e 003 (notificação). | Publicar `ccModeloValidar` com guarda provisória (cargo JURIDICO ou nível 3 ou mais) e manter o bloqueio de envio sem validação. |
| C-1 | CORRIGIR | spec.md C-018, C-026 e seção Testes | Seis alterações geram 6 auditorias; a spec conta 4 e o C-026 reaproveita o número. | Corrigir para 6 ou reduzir o C-018 a quatro gravações, e dar ao C-026 massa própria como o plan já faz. |
| C-2 | CORRIGIR | plan.md Complexity Tracking e R-007 | Chamada direta da SQL `…Gravar` grava sem auditoria; auditoria e registro de e-mail aceitam conteúdo forjado. | Registrar as três exposições no Complexity Tracking e gravar a auditoria na mesma SQL (ou restringir o que a SQL aceita com `:VAR_USER`). |
| C-3 | CORRIGIR | plan.md contrato `ccParametroSalvar`; spec.md RN-016 | Gravação chave a chave com validação cruzada depende da ordem. | Receber o lote, validar o conjunto final e só então gravar. |
| C-4 | CORRIGIR | plan.md R-010, `ccClienteAtribuir`, `ccParametroRestaurar`, `ccFeriadoGerarAno` | Sem teto de lote e com uma SF de auditoria por campo, a cota de 300/min estoura. | Teto de lote por chamada e auditoria em INSERT de várias linhas. |
| C-5 | CORRIGIR | spec.md RF-022 e RN-026; plan.md catálogo | Catálogo fixo em 114 e grupo 11 duplicando as chaves da 003. | Definir que cada módulo registra suas chaves no catálogo, tirar o grupo 11 ou torná-lo a única fonte, e testar "114 da base" em vez de "114 no total". |
| C-6 | CORRIGIR | spec.md Anexo de parâmetros (`regConfPag`, `posProtestoDias`, `prevAviso2`) | Parâmetros sem consumidor. | Remover ou apontar o RF da 002 que os usa (cronograma por dia da régua). |
| C-7 | CORRIGIR | plan.md estrutura de arquivos; tasks.md T-0xx de backend | Layout contraria a regra 2 de `execucao.md` e colide com a 002. | Adotar `add-001-<slug>.mjs`, `schema/001`, `simulator/seed/001`, `simulator/smoke/001`. |
| C-8 | CORRIGIR | plan.md modelo de dados e Anexo B | Colunas, tabelas e campos de modelo pedidos por 002, 003 e 006 não existem. | Fechar uma tabela única de contratos entre specs e incluir o que faltar (ou negar e avisar a spec consumidora). |
| C-9 | CORRIGIR | plan.md seção Simulador | Contagens fixas quebram com seeds de outros módulos no mesmo banco. | Faixa de códigos por módulo e asserts filtrados pela faixa, ou banco novo por suíte. |
| C-10 | CORRIGIR | plan.md mapa de testes; tasks.md T-080 a T-112 | Sete regras sem assert próprio. | Acrescentar o assert de cada uma na task de teste já existente do cenário mais próximo. |
| C-11 | CORRIGIR | spec.md Fora de escopo | Planos de pagamento e faturamento mensal "sem dono", mas a 006 os pede à 001. | Decidir o dono agora (sugestão: leitura do Winthor na 001, tela na 006). |
| O-1 | OBSERVAÇÃO | spec.md RNF-001, RNF-002, RNF-004, Verificação manual | Cita sandbox, simulador, task e plan. | Reescrever em termos de resultado. |
| O-2 | OBSERVAÇÃO | plan.md D-010 | Nove listagens sem paginação, fora do Complexity Tracking. | Registrar a exceção e pôr teto em histórico e anexos. |
| O-3 | OBSERVAÇÃO | plan.md R-002 e R-003 | A T-002 pode invalidar o desenho da sincronização. | Rodar a T-002 antes de qualquer outra task de backend. |
| O-4 | OBSERVAÇÃO | spec.md RF-005; plan.md fluxo da sincronização, passo 6 | Falha no meio deixa posições parciais. | Marcar a sincronização como incompleta e mostrar o aviso na tela. |
| O-5 | OBSERVAÇÃO | spec.md C-021 | 30/11 é feriado no DF e o teste o trata como útil. | Usar outra data ou incluir o feriado distrital no seed. |
| O-6 | OBSERVAÇÃO | spec.md regras de equipe | Artefato exige um Gerente; a spec não. | Decidir e registrar. |
| O-7 | OBSERVAÇÃO | plan.md `add-009` (perfil) | Membro novo só entra depois de rodar o script no sandbox. | Avisar no cadastro de membro e no guia de publicação. |
| O-8 | OBSERVAÇÃO | plan.md saídas das SFs JS | Chaves em caixa mista contra colunas UPPERCASE. | Padronizar UPPERCASE. |
| O-9 | OBSERVAÇÃO | spec.md NC-6 | A posição pode incluir cartão e cheque até a T-001 conferir a cobrança no Winthor. | Conferir o filtro de tipo de cobrança na T-001. |

## 6. Perguntas ao gestor

| Pergunta | Padrão provisório do plan | Seguro para construir agora? | Recomendação |
|---|---|---|---|
| NC-1 a NC-3 (envio de e-mail: provedor, remetente, domínio) | Registro manual; RF-030 bloqueado | Sim | Manter. |
| NC-4 (canal do WhatsApp) | Manual, texto para copiar | Sim | Manter. |
| NC-5 (atraso conta do dia seguinte ao vencimento) | Como o artefato | Sim | Manter. |
| NC-6 (tipos de cobrança que entram na posição) | Todos os títulos em aberto | Sim, com ressalva | Conferir cartão e cheque na T-001 (O-9). |
| NC-7 e NC-8 (calendário e horário da sincronização) | Parâmetros com o padrão do artefato | Sim | Manter. |
| NC-9 (quem valida modelo com efeito legal) | Validação não publicada; envio bloqueado | **Não** | Publicar a validação com guarda provisória (cargo JURIDICO ou Gerente para cima), parametrizável, mantendo o bloqueio de envio sem validação (B-1). |
