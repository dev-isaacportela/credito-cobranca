# Validação — spec 005 · Setor público

> Validador independente (fase 0b). Lidos por inteiro: `docs/specs/005-setor-publico/{spec,plan,tasks}.md`,
> `docs/constitution.md`, `docs/arquitetura.md`, `docs/execucao.md`, `docs/templates/`, os relatórios do
> artefato (00-visao-geral, A, B, C, D) e os contratos da 001/002/004/006 de que a 005 depende.
> Nada foi corrigido; este arquivo só relata.
>
> **Resultado: 2 BLOQUEIA · 16 CORRIGIR · 8 OBSERVAÇÃO.** As regras e os prazos estão corretos (todas as
> datas e somas refeitas conferem). O que impede construir é a fronteira com a 004: do jeito que as duas
> specs estão escritas, ninguém consegue criar nem mover uma solicitação pública.

## 1. Checklist do Fluxo A (mitra-escopo) e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF/componente | ok | Nenhum nome de SF, tabela ou biblioteca na spec |
| Todo RF com critério verificável | ok | 35 RF com critério; quatro sem assert correspondente (C-14) |
| Cenário de erro | ok | Recusas cobertas (gates da pré-aprovação, liberação, regra de ente inativa, NF já paga) |
| Fora de escopo | ok | Presente (linha 571); faltam declarações para cinco comportamentos do artefato (§2) |
| Seção Testes: linha por C/RN com entrada e resultado | ok | 30 C + 36 RN com datas e valores concretos |
| Plan: Constitution Check | ok | Presente |
| Plan: contratos de SF | ok com ressalvas | Prefixo `cc`, tipos e saídas ok; valores de filtro desligado não estão escritos em todas as leituras (O-5); contratos com a 001/004/006 não batem (C-15, B-1) |
| Toda listagem com LIMIT/OFFSET + `…Total` | ok | |
| Plan: seção Simulador | ok com ressalvas | Seed descrito; relógio próprio `CC_HOJE=2026-12-01` e elenco conflitante (C-8, C-9) |
| Plan: mapa de testes | ok | Uma linha por C/RN |
| Tasks: uma task por teste | ok | |
| Rastreabilidade RF → task → teste | **não** | RF-004 → T-087 não prova; RF-009 (histórico), RF-017 (ordenação e busca por empenho), RF-035 (agenda/quadro) sem teste |
| `[NEEDS CLARIFICATION]` | parcial | 6 pendências; duas têm padrão provisório inseguro ou contraditório (§6) |

### Contas refeitas (todas conferem)

| Linha | Entrada | Conta | Esperado | Veredito |
|---|---|---|---|---|
| C-008 | CAPAG/pessoal/CAUC/fonte/histórico/empenho do seed | 22 + 10 + 10 + 15 + 20 + 10 = 87 → P1 (≥ 80) | P1, limite 200.000 | certo |
| C-009 | mesmos fatores com CAPAG zerado | 0 + 15 + 10 + 15 + 20 + 10 = 70; trava rebaixa para P3 | P3, 150.000 | certo |
| C-010 | 84 pontos; estadual em fim de mandato × municipal | 84 − 5 = 79 → P2, 400.000; municipal sem redutor: 84 → P1, 500.000 | idem | certo |
| C-011 | histórico com atraso médio 13 dias | histórico vale 18; total 85 | 85 | certo |
| C-014 | NF emitida em 01/10/2026; regra 10 + 10 dias úteis | 01/10 + 10 úteis = 16/10 (pula 12/10); + 10 úteis = 30/10; de 30/10 a 01/12 = 32 dias de atraso | 16/10, 30/10, 32 dias | certo |
| C-015 | pequeno valor (metade do prazo: 5 + 5) × valor normal | 10/11 e 17/11; sem pequeno valor 17/11 e 02/12 (20/11 feriado) | idem | certo |
| C-016 | prazo contratual de 30 dias corridos, órgão do DF | 30/10 + 30 = 29/11 (domingo); 30/11 feriado no DF → 01/12; sem contrato: 24/11 + 10 úteis = 09/12 | idem | certo |
| C-019 | 7 NFs do órgão | total 222.000; vencidas 170.000; acima de 2 meses 60.000; liquidadas não pagas 85.000 | idem | certo |
| C-020 | régua pública com `hoje` = 01/12/2026 | 4 ações: 1001 passo G3 (24/11), 1002 M2 (30/11), 1009 G5 (30/10; pagar até 24/06/2026, 160 dias), 1001 M2 (02/12); G4 de 15/12 e 17/12 fora da janela | 4 ações | certo |
| C-026 | NF paga em 01/12, vencida em 17/11 | 14 dias | 14 | certo |
| C-029 | três NFs com 9, 15 e 19 dias | conferem com o calendário do seed | idem | certo |
| RN-015 | soma de exposição | 99.000; 13.000 | idem | certo |
| RN-020 / RN-022 / RN-031 | prazos em dias úteis | 04/11 e 09/11; 03/12; 4 dias | idem | certo |
| RN-027 | nove datas da régua | 06/10, 19/10, 23/10, 30/10, 03/11, 09/11, 24/11, 15/12, 02/12 | idem | certo |

Ressalva: o trio 6 / 26 / 13 dias de C-011 depende das datas exatas do seed; o plan precisa fixá-las (O-7).

## 2. Cobertura contra o artefato

**Decisão §8.3:** conforme — rating público P1–P4 em campo próprio, separado do AA–E. O problema é **onde**
ele é gravado (B-2).

**O que o artefato faz e a 005 não cobre nem declara fora de escopo**

| Item do artefato | Situação |
|---|---|
| Agenda "contratos": vigência ≤ 60 dias ou saldo < 20% (`contratoVigDias`, `contratoSaldoPct` — chaves existem no catálogo da 001) | não coberto |
| Agenda "NF": eventos previstos (protocolar hoje, liquidação prevista, pagamento previsto) | não coberto |
| NF paga com atraso conta como recuperação | não coberto (a 006 também não soma) |
| Coluna "Baixados como perda" no quadro da cobrança pública (o artefato tem 8 colunas; o plan tem 7) | não coberto |
| Probabilidade de inadimplência do órgão por perfil (0,05 / 0,25 / 0,60 / 0,15) | não coberto |
| Criticidade e saúde do órgão | a RN-018 chama uma SF da 004 que recusa público |
| Checklist público pós-aprovação ("Acompanhamento dos pagamentos · Revisão periódica da situação financeira do ente · Reavaliação do risco quando necessário") e etapas Monitoramento/Reavaliação | sem dono — nem 004 nem 005 |
| Escolha da regra de pagamento: passos 4–5 do artefato (sem esfera, com UF → regra da UF) | retirados sem registro (O-2) |

**Números da política:** pesos do motor, cortes P1 ≥ 80…P4, fatores 1 / 0,8 / 0,5 / 0,25, fim de mandato −5,
10 + 10 dias úteis, pequeno valor 65.492,11 (metade do prazo), régua de 10 passos e SLA 2/5/10/10 conferem com
os relatórios A e C. **Divergência declarável:** o passo M2 da régua vence no primeiro dia útil **depois** do
limite de 2 meses; no artefato vence no próprio limite (O-1).

**Defeitos conhecidos do artefato**

| Defeito | Na 005 |
|---|---|
| Limite de 2 meses calculado em dias fixos | corrigido (calendário) |
| NF dada como paga com parcela em aberto | corrigido (só com todas as parcelas) |
| Certidões sem alerta | corrigido (RF-032) — mas o alerta "no painel" não está na 006 (C-16) |
| Rating público misturado ao privado | corrigido |
| Regras por ente dadas como certas | corrigido (todas "A confirmar") |
| Responsável digitado na tela | **copiado no texto**: C-007, RN-004 e RN-006 dizem "informar o responsável" (C-13) |

## 3. Conformidade

**Constitution**

| Princípio | Situação |
|---|---|
| II. Política como parâmetro | Valores parametrizados, mas T-003 semeia `CC_PARAMETRO` e `CC_MODELO_MENSAGEM`, que são da 001, com chaves fora do catálogo (C-10) |
| III. Regra no servidor, identidade por `:VAR_USER` | Sem RN/teste de identidade pela sessão; texto ainda fala em "informar o responsável" (C-12, C-13). Leituras recebem `hoje` do frontend (O-4) |
| IV. Winthor só leitura | ok |
| V. Auditoria em toda escrita | Só o RNF-003, verificado por task manual (T-195); nenhuma linha de teste automatizado (C-12) |
| VI. Testes obrigatórios | Testes mudam o seed fora de ordem (C-5); T-014 cria stubs das SFs da 001/002/004 — falso positivo (C-6) |

**Arquitetura**

- **Dono de tabela:** a 005 grava solicitação, decisão e crédito "pela SF da 004" — correto em princípio, mas as
  SFs pedidas não existem e a 004 recusa público (B-1). T-016 edita o script de perfis da 001.
- **Caminhos:** `backend/simulator/seed.mjs`, `smoke.mjs`, `config.mjs`, `frontend/src/App.tsx`,
  `server-functions.ts`, `frontend/src/lib/publico.js`, `frontend/src/pages/…` — todos compartilhados; a 005 roda
  em paralelo com a 003 (fase B3) (C-7).
- Prefixo, datas VARCHAR e caixa alta: ok.

**Armadilhas da plataforma**

- Escrita só por SF SQL: respeitado.
- `{{param}}`: valores de filtro desligado não escritos em todas as leituras (O-5).
- 300 SF/min: a prévia do motor a cada campo alterado custa uma execução por tecla/seleção; a 004 resolveu com
  botão (O-3).
- Simulador: usa `DATEDIFF`, `DATE_FORMAT`, `GREATEST`, `TO_CHAR` — conferir se o `mysql-dialect.mjs` cobre os
  quatro (O-6).

## 4. Viabilidade do backend

1. **Solicitação pública impossível (B-1).** O fluxo da 005 cria a solicitação, marca checklist e registra a
   decisão por `ccSolicitacaoEtapaGravar`, `ccSolicitacaoCheckMarcar`, `ccDecisaoInserir`, `ccCreditoInserir`.
   A 004 não tem SF com esses nomes (publica `ccEsc*`), recusa `SETOR='PUBLICO'` (D-013) e não tem as etapas
   `PENTRADA/PANALISE/PAPROV` nem a situação `PRE_APROVADA`.
2. **Coluna que não existe (B-2).** C-012 e RF-010 afirmam `CC_CREDITO.RATING_PUBLICO='P1'` e `RATING` vazio.
   A 004 tem `RATING_CONCESSAO` e diz que P1–P4 "fica em `CC_ANALISE_ORGAO`".
3. **Vaivém da posição (C-4).** A leitura da 001 recalcula e zera a posição de todo cliente por título, inclusive
   público; a 005 recalcula por NF. Sem o `ccPosicaoPublicaGravar` (pedido P-7, não previsto na 001) e sem a 001
   pular público, o número muda a cada 15 minutos.
4. **Ciclo de vida do crédito público (C-1).** Depois da aprovação ninguém cuida de validade, monitoramento,
   reavaliação ou obsolescência: a rotina da 004 não trata público e a 005 não tem rotina própria.
5. **Testes que se atropelam (C-5).** C-026 paga a NF 1003 antes de C-030, RN-022 e RN-033 a lerem; C-016 remove
   o feriado do DF; C-015 troca a forma de contratação; RN-019 inativa a regra de GO; RN-030 paga as NFs do órgão
   O1; RN-032 baixa uma NF; C-028 insere NF para O5. As somas de C-019/C-020 só valem antes disso.
6. **Stubs (C-6).** T-014 cria versões falsas das SFs da 001/002/004 no simulador; como B3 roda depois de B1 e
   B2, as reais já existem e o stub só esconde incompatibilidade de contrato.
7. **Contratos divergentes (C-15).** `ccReguaPubEnviar(para, assunto, corpo)` × `ccEmailEnviar(codigo, clienteId,
   contatoId, extras, origem, referencia)` da 001; `ccNfPubKpis(hoje, buId)` × `ccNfPublicaResumo` que a 006 espera.
8. Sem dependência circular formal, mas 004 e 005 precisam fechar B-1 juntas antes de B2.

## 5. Lista de achados

### BLOQUEIA

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| B-1 | `plan.md` §Fluxo, §Pedidos a outras specs (× 004 `plan.md` D-013) | Ninguém cria nem move solicitação pública: a 005 usa SFs da 004 que não existem com esses nomes, e a 004 recusa público e não tem as etapas/situação do público | Fechar com a 004: ela aceita público nas SFs de escrita, com as etapas `PENTRADA/PANALISE/PAPROV` e `PRE_APROVADA`, e a 005 passa a citar os nomes reais |
| B-2 | `spec.md` C-012, RF-010; `plan.md` §Testes | Assert sobre `CC_CREDITO.RATING_PUBLICO`, coluna que a 004 não tem | Decidir um lugar só: ou a 004 cria a coluna, ou o teste lê o rating em `CC_ANALISE_ORGAO` |

### CORRIGIR

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| C-1 | `spec.md` §Requisitos / §Fora de escopo | Crédito público depois da aprovação (validade, monitoramento, reavaliação, checklist pós-aprovação) sem dono | Atribuir à 005 com rotina própria, ou à 004, e escrever o RF |
| C-2 | `spec.md` RN-005 (padrão provisório) | Permite liberar acima do valor pré-aprovado sem nova decisão de alçada | Exigir nova decisão quando o maior entre valor e exposição superar o pré-aprovado ou subir de alçada |
| C-3 | `spec.md` RN-003 × C-003 | O padrão exige contrato/empenho no item [1], mas C-003 pré-aprova só com edital | Na base "edital", trocar o item [1] pela evidência "Edital / termo de referência" |
| C-4 | `plan.md` §Pedidos (P-7), §Riscos | Posição do cliente público recalculada por duas rotinas com regras diferentes | Fechar com a 001: a leitura pula público e publica `ccPosicaoPublicaGravar` |
| C-5 | `spec.md` §Testes; `plan.md` §Testes | Testes que alteram o seed fora de ordem invalidam somas de outros testes | Banco isolado por bloco ou ordem explícita com leituras antes das escritas (como a 006 D-014) |
| C-6 | `tasks.md` T-014 | Stubs de SFs da 001/002/004 | Remover; o smoke roda sobre as SFs reais publicadas em B1/B2 |
| C-7 | `plan.md` §Contexto técnico; `tasks.md` | Escreve em arquivos compartilhados | Usar as costuras por módulo de `docs/execucao.md` |
| C-8 | `plan.md` §Simulador | Elenco do seed conflita com o da 001/004/006/007 | Usar o elenco da 001 ou nomes exclusivos |
| C-9 | `plan.md` §Simulador (`CC_HOJE`) | Relógio próprio e `hoje` vindo do frontend | Relógio único da 001; `hoje` calculado no servidor |
| C-10 | `tasks.md` T-003, T-016 | Semeia tabelas da 001 (parâmetros, modelos de mensagem) com chaves fora do catálogo e edita o script de perfis da 001 | Virar pedido à 001; a 005 só lê |
| C-11 | `spec.md` §Fora de escopo | Agenda de contratos, agenda de NF prevista, NF paga com atraso como recuperação, coluna "Baixados", probabilidade de inadimplência e criticidade/saúde do órgão não cobertos nem declarados | Cobrir ou declarar fora de escopo, um a um |
| C-12 | `spec.md` §Regras, §Testes | Sem RN/teste de auditoria (só T-195 manual) nem de identidade pela sessão | Acrescentar uma RN e um assert de auditoria por escrita |
| C-13 | `spec.md` C-007, RN-004, RN-006 | "Informar o responsável" reproduz o campo digitado do artefato | Reescrever: o responsável é o usuário da sessão |
| C-14 | `tasks.md` §Rastreabilidade | RF-004 (T-087 não prova), RF-009, RF-017, RF-035 sem teste | Acrescentar os asserts |
| C-15 | `plan.md` §Contratos | `ccReguaPubEnviar` × `ccEmailEnviar` da 001; `ccNfPubKpis` × `ccNfPublicaResumo` da 006 | Usar a assinatura da 001 e combinar um nome só com a 006 |
| C-16 | `spec.md` RF-032 | Promete alerta de certidão "no painel"; a 006 RF-005 não lista | Pedir à 006 ou mover o alerta para a tela da 005 |

### OBSERVAÇÃO

| # | Arquivo · seção | Achado | Sugestão |
|---|---|---|---|
| O-1 | `spec.md` RN-027 | M2 vence no primeiro dia útil após o limite; artefato usa o próprio limite | Declarar a mudança |
| O-2 | `spec.md` regra de escolha do ente | Passos 4–5 do artefato retirados | Declarar |
| O-3 | `plan.md` §Superfície | Prévia do motor a cada campo = 1 execução de SF | Botão "Calcular" ou debounce |
| O-4 | `plan.md` §Contratos | `hoje` enviado pelo frontend nas leituras | Calcular no servidor |
| O-5 | `plan.md` §Contratos | Valor desligado dos filtros não escrito em todas as SFs | Completar |
| O-6 | `plan.md` §Simulador | Funções `DATEDIFF`, `DATE_FORMAT`, `GREATEST`, `TO_CHAR` | Confirmar no `mysql-dialect.mjs` ou calcular no JS |
| O-7 | `spec.md` C-011 | 6/26/13 dias dependem das datas do seed | Fixar as datas no plan |
| O-8 | `plan.md` R-002 | Primeira carga de NF por script de desenvolvedor | Registrar quem roda e quando |

## 6. Perguntas ao gestor

| Pendência | Pergunta | Padrão provisório do plan | Seguro para construir já? |
|---|---|---|---|
| NC-1 | Quais colunas do Winthor trazem empenho, protocolo, liquidação | Colunas assumidas, isoladas em uma função | Sim no simulador; trocar a função quando o gestor confirmar |
| NC-2 | Quem lança as datas de protocolo e liquidação | Não está explícito | Sim, se escrito: agente da carteira e quem está acima dele |
| RN-003 | Evidência exigida na pré-aprovação por edital | Item [1] contrato/empenho obrigatório | **Não** — contradiz C-003. Recomendo: na base edital, o item [1] vira "Edital / termo de referência" |
| RN-005 | Liberação acima do valor pré-aprovado | Permite sem nova decisão | **Não** — fura a alçada. Recomendo: nova decisão quando superar o pré-aprovado ou subir de alçada |
| RN-021 | Data-base do prazo quando não há protocolo | Data de emissão da NF | Sim |
| RN-026 | NF sem liquidação conta como vencida ou a vencer | Como o artefato (a vencer) | Pode construir, mas como parâmetro: o padrão subestima o vencido |
