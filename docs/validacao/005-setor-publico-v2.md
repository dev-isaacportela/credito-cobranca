# Validação v2 — spec 005 · Setor público

> Validador independente (fase 0c, passo 5). Lidos: `docs/validacao/LEIA-v2.md`, o relatório v1
> (`005-setor-publico.md`), `docs/specs/005-setor-publico/{spec,plan,tasks}.md`, contrato `01` (§1–§15),
> `02` (§004, §005, §Winthor, `CC_CONTATO_COBRANCA`), `03` (§7, §15–§16, §18), `04` (§1, §2, §4, §5, §8–§10),
> `05` (inteiro), `06` (inteiro), `pedidos/00-respostas.md` (seção 005 e Fechamento), `arquitetura.md` §7,
> `opcoes-tela/escolhas.md` §005, a skill `mitra-escopo` (Fluxo A) e, para conferir o que saiu pelo D-05,
> `specs/004-concessao-credito/{spec,plan,tasks}.md` e `specs/002-cobranca-privada/{plan,tasks}.md`.
> Nada foi corrigido; este arquivo só relata.
>
> **Resultado: 1 BLOQUEIA · 9 CORRIGIR · 8 OBSERVAÇÃO.** Os 2 bloqueios da v1 estão resolvidos; o D-05
> está aplicado (a esteira e a cobrança saíram para 004/002 e as extensões seguem 01 §14). Todas as datas,
> somas e notas dos cenários foram refeitas e conferem. O bloqueio novo está na fronteira com a 004: a decisão
> pública lê, em `CC_SOLICITACAO`, uma fotografia do motor que ninguém grava para o órgão.

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF | ok | |
| Todo RF com critério verificável | ok | RF-002, RF-009, RF-024 marcados como removidos |
| Fora de escopo, com quem ficou com o quê | ok | os seis itens que faltavam na v1 (C-11) estão declarados |
| Seção Testes: uma linha por C/RN | ok | 31 C + 39 RN + RF-016; removidos apontam para 002/004 |
| `[NEEDS CLARIFICATION]` / "pendente do arquiteto" | ok | zero; P-05…P-47 com padrão adotado. PA-13 aguarda o usuário (O-8) |
| Plan: Constitution Check, Simulador, mapa de testes | ok | |
| Nomes × contrato (tabelas, colunas, parâmetros, SFs, fases, cargos) | ok com ressalvas | conferidos por busca: 5 tabelas de 02 §005, 15 `pub.*` + 47 `pubMotor.*`, 18 + 11 SFs de 04 §5, fases de 05 §3.2/§4.1. Contagem de SFs errada (C-6); saída extra em `ccPubNfFicha` (O-2) |
| Spec × plan × tasks | ok com ressalvas | todo C/RN tem teste e todo teste tem tarefa; RF-004, RF-014, RF-017 sem prova (C-7); removidos sem teste nas donas (C-8) |
| Toda SF pública com tarefa e teste | ok | `ccPubContratoTotal` sem assert próprio (só a irmã) |
| Orçamento (DT-29) | ok com ressalvas | as duas escritas caras cabem em 20, mas as contas divergem da 002 (C-2, C-3); abrir card não contado (C-9) |
| D-01…D-06; sem arrastar; quadros pela lib | ok | D-06 em regra e certidão (`NIVEL_MIN`), modelos `ADM`; "Mover para", nunca arrastar |
| Telas × `escolhas.md` | ok | 7 telas com opção; aba Contratos sem desenho tem T-207 |
| `registrarExtensao()` no formato de 01 §14 | ok com ressalvas | `abasExtras`, `acoesExtras`, `conteudoDaFase` nos dois quadros públicos, como 05 §3.5 e §4.4; falta o espelho `podeMover` (O-5) |
| Segurança e plataforma | ok | identidade por `quem()` (RN-038 testa `membroId` alheio ignorado), escrita guardada `ccEscPub…`, sem `VITE_*`, sem produção, DDL em `schema/`, nada em `migrations/` |

### Contas refeitas

| Linha | Conta | Veredito |
|---|---|---|
| C-008 a C-011, RN-010 a RN-016 | 22+10+10+15+20+10 = 87; 0+15+10+15+20+10 = 70 → P3 pela trava; 84 − 5 = 79 → P2 × 0,8 = 400.000; histórico do 5004 com pequeno valor (5 + 5 úteis): 1007 pagar até 15/07, paga 10/08 = 26 d; 1006 no prazo → atraso 13, liquidação 6, pagamento 20 | certo |
| C-014 a C-017, RN-020 a RN-023 | 1001 16/10 e 30/10, 32 d; 1003 10/11 e 17/11; 1004 01/12 (29/11 domingo, 30/11 DF); 1005 09/12; 1002 pagar até 04/11, limite 28/11 | certo |
| C-019, RN-026 | 222.000; vencidas 170.000; acima de 2 meses 60.000; SES-DF 52.000 | certo |
| C-020, C-021, RN-027, RN-028 | 1001 G3 24/11, 1002 M2 30/11, 1009 G5 30/10, 1003 L3 = G2 = 25/11 → L3, 1005 CONF 27/11; `DEVIDOS` 7 (5 passos atuais vencidos + 2 feitos) | certo |
| C-031 | 100.000 ÷ 600.000 = 16,7%; 15/01/2027 − 01/12/2026 = 45 d | certo, se o seed gravar `VALOR_ESTIMADO` (C-5) |

## 2. D-05 — o que saiu para 002/004

| Removido da 005 | Coberto lá? |
|---|---|
| C-006 (quem analisa não aprova), C-007, RF-009, RN-004, RN-006, RN-008 → 004 C-012, C-013, C-014, C-020 | sim, mas pelos cenários da carteira Privada; na `PUBLICA` só o RN-038 da 004 (`fluxo(carteira)`). O rótulo "com carteira PUBLICA" não confere (O-1) |
| RF-002, RN-002 (checklist de `concessao-publica`) | **não**: nenhum teste da 004 afirma os itens públicos; só `analise_1`/`analise_2` aparecem, no C-002 da própria 005 (C-8) |
| RF-024, RN-031 (checklist e SLA de `cobranca-publica`) | **não**: a T-005 da 002 semeia o quadro, mas T-101/T-129 só provam o privado (C-8) |
| Esteira, decisão, crédito, monitoramento, reavaliação | sim: 004 C-034/C-035/C-036, rotina `CREDITO` linhas 2–3 nas três carteiras |
| Quadro, agenda, contato, promessa, baixa, Jurídico | sim: 002 C-027/C-028 e fluxo de baixa; 003 pelo dossiê |

## 3. Achados

### BLOQUEIA

| # | Onde | Achado |
|---|---|---|
| B-1 | `plan.md` §Fluxo 1, §Testes C-003/C-005/C-012/C-031, §Simulador (seed) × 004 `plan.md` §Fluxo 2 e 4, `NIVEL_CONCESSAO` | A decisão pública da 004 lê a fotografia do motor em `CC_SOLICITACAO` (`RATING_MOTOR`, `MOTOR_LIMITE`): compara o motor recalculado com ela ("O motor mudou…") e trata `limiteAprovado > MOTOR_LIMITE` como exceção ao motor (Comitê de crédito, nível 5). Para a `PUBLICA` ninguém grava essa fotografia: a 004 só regrava "carteira com motor próprio", e a 005 grava o motor em `CC_ANALISE_ORGAO`. Do jeito que está, toda aprovação de órgão vira exceção ou é recusada. Caem C-003, C-005 e C-012, e também as aprovações do seed (5001 e 5004 por Silvia), de que dependem C-011, C-015, C-031 e o quadro. A 004 também não diz quem preenche `CC_DECISAO.RATING_PUB` e `CC_CREDITO.ANALISE_ORGAO_ID`, que `ccPubContratoListar`, `ccPubResumo` e o C-012 leem. É preciso fechar com a 004 quem grava o quê na decisão pública. |

### CORRIGIR

| # | Onde | Achado |
|---|---|---|
| C-1 | `plan.md` `ccPubNfDatasSalvar`; T-020 × 002 `plan.md` (`ccCobCasoSincronizar`: "com sessão, recusa") e 04 §2 (Quem: só as rotinas) | O clique de datas chama `ccCobCasoSincronizar` aninhada. Com `SIM_SESSAO_ANINHADA=1`, que o smoke exige igual ao `=0` (06 §3), a 002 recusa e o card não é atualizado. O "código igual nas duas hipóteses" do §Sandbox não vale aqui. |
| C-2 | `plan.md` `ccPubNfPassoRegistrar` e §Contas; T-022 × 002 `plan.md` (`ccCobContatoRegistrar`) | A 002 exige `feedback` e `retorno` da lista, que o plano não manda: o passo fica feito sem contato, e o "2 contatos" do C-021 falha. O contato custa 10, não 8: com e-mail são 18 (o plano diz 16), sem e-mail 14 (o plano diz 12). |
| C-3 | `plan.md` §Contas (`ccPubNfDatasSalvar` = 15), §Rotina passo 6 × 05 §3.7 ("Nota no card só quando a fase muda") e 002 `sincronizarCaso()` | A conta inclui um `kbNotaRegistrar` que ninguém chama, porque a `sincronizarCaso()` não faz nota, e deixa de fora o `ccEscCobCasoProxAcao`. A nota "Etapa do órgão: …" e a auditoria da mudança de etapa, que o Constitution Check atribui à 002, ficam sem dono. |
| C-4 | `tasks.md` Bloco C (T-143, T-147, T-148) | O C-031 (T-147) roda antes do C-012 (T-148), que aprova o 5002: há 3 contratos vigentes, não 4. O RN-007 (T-143) deixa o `LIMITE_PROPOSTO` do 5002 em 1.000.000,01 sem restaurar, e por isso o C-012 de Gustavo cai na Diretoria. O mesmo RN-007 testa limites acima da exposição (200.000) esperando "Gerente", quando a spec RN-007 os trata como exceção ao motor. |
| C-5 | `plan.md` §Simulador (`dominio()` pelas SFs de 001 e 004), Bloco C C-005 | O seed não fixa o `VALOR_ESTIMADO` das contratações: 600.000 no 5001, de que depende o 16,7% do C-031, e 50.000 no 5004, de que depende o pequeno valor de C-011 e C-015. A RN-021 também não diz que `VALOR_ESTIMADO = 0` não é pequeno valor; se for, as NFs da SES-DF passam a ter meio prazo e o C-016 quebra. O 5003 do C-005 precisa de base, saldo e vigência para `podeAprovar` e para o "saldo integral" do C-031, e o plano não dá esses dados. |
| C-6 | `plan.md` §Arquivos ("28 SFs"); T-028 ("28 SFs, ids 5000–5027") × 04 §0 e §5 (18 + 11 = 29) | A interna `ccEscPubNfPassoAtualizar`, entrada no Fechamento, não entrou na conta: são 29 SFs, ids 5000–5028. |
| C-7 | `tasks.md` §Rastreabilidade (RF-004, RF-014, RF-017) | v1 C-14 resolvido só em parte. Nenhum teste prova as opções fechadas recusadas nem a editabilidade depois da decisão (RF-004), a troca de contratação de uma NF (RF-014), a ordenação "vencidas primeiro, depois pagar até" e a busca por empenho (RF-017). |
| C-8 | `spec.md` §Testes (linhas "removido"); `tasks.md` última linha da Rastreabilidade | RF-002/RN-002 e RF-024/RN-031 apontam para "testes da 002 e da 004", que não existem para os quadros públicos (§2). Sem isso, o checklist de `concessao-publica` e o checklist e o SLA de `cobranca-publica` (48/120/240/240 h) não têm prova. |
| C-9 | `plan.md` §Superfície (extensões: "cada bloco carrega ao ficar visível") × 01 §10 ("Abrir um card = `kbCardDetalheSql` + 1 ficha") | Abrir o card em `analise` ou `comite` custa a ficha da 004, mais `ccPubAnaliseObter`, mais `ccPubMotorCalcular`, porque `…Obter` não devolve `travas`, `podeAprovar` nem `faltando`, que o bloco do motor mostra: são 4, contra 2. No card de cobrança, a régua soma `ccPubNfListar`. O plano não traz a conta nem registra a exceção. |

### OBSERVAÇÃO

| # | Onde | Achado |
|---|---|---|
| O-1 | `spec.md` C-006, C-007; §Testes | "Coberto por 004 com carteira PUBLICA": os cenários citados da 004 são da carteira Privada. Vale a regra única do D-05, mas o texto promete mais do que existe. |
| O-2 | `plan.md` `ccPubNfFicha`; T-019 × 04 §5 | A saída traz "contratações do órgão", que o contrato não lista (`{ nf, regra, passos[], pode }`). |
| O-3 | `tasks.md` T-003; `plan.md` §Testes | Só 5 dos 7 códigos `PUB_*` aparecem (`OFICIO`, `REQUERIMENTO`, `PROTOCOLO`, `LIQ`, `FILA`). Os de Análise e Pagamento vencido não estão fixados. |
| O-4 | `spec.md` RN-010 ("todos parâmetros") × 03 §16 | Os 0 pontos de "pessoal acima do limite" não têm chave em `pubMotor.*`, e o contrato não diz o que vale acima de 100% do limite. |
| O-5 | `plan.md` §Extensões, §Gancho × 01 §14 e 05 §1 regra 13 | `extensoes.ts` não registra o `podeMover` de `concessao-publica`, espelho do trecho da 005. O trecho usa `{{cardId}}` em vez de `K.ID`, como manda 01 §14. |
| O-6 | `plan.md` §Arquivos (`isEntrypoint` insere as 5 regras) × §Simulador e T-031 (`dominio()`: "5 `REGRAS_INICIAIS`") | Dois lugares inserem as regras. Se os dois rodarem, o RN-035 ("5 regras") falha. |
| O-7 | 04 §2 `ccCobContatoRegistrar` × 02 `CC_CONTATO_COBRANCA` (`ORIGEM` `REGUA_PUB`, `EMAIL_ENVIADO_ID`) | A entrada não tem `origem` nem `emailEnviadoId`, então o contato do passo público não sai marcado `REGUA_PUB` nem ligado ao e-mail. É lacuna do contrato, a combinar com a 002. |
| O-8 | `plan.md` §Superfície, §Respostas; §Arquivos | A aba Contratos (PA-13) ainda depende da confirmação do usuário. `PCMOV` aparece na nota ao integrador, mas não no §Modelo nem na T-028. |

## 4. v1 → v2

| v1 | Destino |
|---|---|
| B-1 solicitação pública impossível | resolvido: D-05, esteira da 004 com `carteira = 'PUBLICA'`, nomes reais (`ccCred…`). O B-1 novo é outro ponto da mesma fronteira |
| B-2 `CC_CREDITO.RATING_PUBLICO` | resolvido: `RATING_PUB` em `CC_ANALISE_ORGAO`, cópia em `CC_DECISAO`, saída de `ccCredCreditoListar` (quem grava: B-1) |
| C-1 ciclo de vida pós-aprovação | resolvido: fases `gestao`/`reanalise` e rotina `CREDITO` da 004 |
| C-2 liberar acima do pré-aprovado | resolvido (RN-005, 04 §4 `PRE_APROVADA`) |
| C-3 edital × item [1] | resolvido (RN-003; 05 §4.2) |
| C-4 posição dupla | resolvido (P-09; sem `ccPosicaoPublicaGravar`) |
| C-5 testes que se atropelam | mal resolvido: blocos A–D e variações na lib, mas a ordem do bloco C ainda quebra C-031 e C-012 (C-4) |
| C-6 stubs | resolvido (sem dublê; `pular()`) |
| C-7 arquivos compartilhados | resolvido (costuras de 01 §14) |
| C-8 elenco | resolvido (06 §2, faixa 5001–5099) |
| C-9 relógio próprio / `hoje` da tela | resolvido (06 §1; `HOJE_SQL`) |
| C-10 semear tabelas da 001 | resolvido (`lib/parametros`, `lib/modelos`) |
| C-11 fora de escopo | resolvido |
| C-12 auditoria e identidade | resolvido (RN-038, RN-039) |
| C-13 "informar o responsável" | resolvido |
| C-14 rastreabilidade | mal resolvido (C-7) |
| C-15 contratos divergentes | resolvido (`ccEmailEnviar`, `ccPubResumo`) |
| C-16 alerta de certidão no painel | resolvido (`ccPubResumo`; 006 `CERTIDAO`) |
| O-1, O-2, O-3, O-4, O-5, O-6, O-7 | resolvidos (declarados na spec, botão "Calcular", servidor calcula `hoje`, desligados em 04, dialeto de 06 §5, datas fixas no seed) |
| O-8 primeira carga | resolvido em parte (risco "implantação com muitos órgãos", laço no sandbox) |
