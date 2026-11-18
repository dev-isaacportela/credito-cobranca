# Validação — spec 004 · Concessão de crédito

> Validador independente (fase 0b). Lidos por inteiro: `docs/specs/004-concessao-credito/{spec,plan,tasks}.md`,
> `docs/constitution.md`, `docs/arquitetura.md`, `docs/execucao.md`, `docs/templates/`, os relatórios do
> artefato (`docs/estudo-artefato/00-visao-geral.md`, A, B, C) e os contratos da 001/002/005/006 que a 004 consome
> ou alimenta. Nada foi corrigido; este arquivo só relata.
>
> **Resultado: 2 BLOQUEIA · 19 CORRIGIR · 14 OBSERVAÇÃO.** A spec está bem escrita e as contas fecham;
> o que impede a construção é (1) as tasks continuam travadas em pendências sem padrão provisório e
> (2) o motor depende de quatro dados que a 001 não entrega.

## 1. Checklist do Fluxo A (mitra-escopo) e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF/componente | **quase** | O corpo está limpo. A seção Testes vaza linguagem de implementação: `ok:false` (8 ocorrências, a partir da linha 501), "LIMIT" (3, a partir da 514), "não existe SF de excluir" (linha 569), `…Total`, `analistaId` |
| Todo RF com critério verificável | ok | 41 RF, todos com critério. RF-039 (3 / 75% / 1) e RF-004 (total 12) têm critério mas não têm assert (ver §5 C-15) |
| Cenário de erro | ok | C-003, C-005, C-012, C-013, C-019, C-022 e outros cobrem recusa |
| Fora de escopo | ok | Presente (linha 578); AA–H e rating público P1–P4 declarados fora. Faltam declarações para itens do artefato que ficaram órfãos (§2) |
| Seção Testes: linha por C/RN com entrada e resultado | ok | 33 C + 37 RN com números. Duas linhas com entrada ambígua (C-009, C-028 — ver abaixo) |
| Plan: Constitution Check | ok | Presente; D-013 viola a regra de dono de tabela e não está no Complexity Tracking (§3) |
| Plan: contratos de SF (prefixo `cc`, tipo, parâmetros com valor desligado, saída) | ok com ressalvas | Prefixo e tipos ok. `ccSolicitacaoHistorico` sem LIMIT/OFFSET/Total; `ccCalibracaoRevisoes` sem `…Total`; cita "D-015", que não existe na tabela de decisões |
| Toda listagem com LIMIT/OFFSET + `…Total` | **parcial** | As duas acima |
| Plan: seção Simulador | ok | Seed e `CHECK_INPUT` descritos; elenco e relógio conflitam com as outras specs (§3) |
| Plan: mapa de testes | ok | Uma linha por C/RN |
| Tasks: uma task por teste | ok | T-08x…T-14x; quatro delas marcadas `[BLOQ]` |
| Rastreabilidade RF → task → teste sem buraco | **não** | RF-041 → T-117 não prova os 45 movimentos; RF-039 e RF-004 sem assert; 18 marcas `[BLOQ P-NN]` deixam RF sem task executável |
| `[NEEDS CLARIFICATION]` resolvido ou com padrão | **não** | 17 marcas na spec, 10 pendências (P-01…P-10), **nenhuma com padrão provisório no plan** (§5 B-1) |

### Contas refeitas (todas conferem)

| Linha | Entrada | Conta | Esperado na spec | Veredito |
|---|---|---|---|---|
| C-007 | score 750; pontualidade/tempo/ticket do seed; faturamento 20.000; prazo 30 | comp = 950 + 50 = 1000; final = 0,6×750 + 0,4×1000 = 850 → AA; base = 20.000 × 30/30 × 1,2 = 24.000; AA 100–120% → 24.000 a 29.000 (arredondado); alçada Supervisor | AA, 24.000–29.000, Supervisor | certo |
| C-008 | comp 900; score 750; atraso 10 dias; 1 alerta; pedido 25.000 | final = 450 + 360 = 810; atraso 10 → B; alerta rebaixa → C; C = 50% de 24.000 = 12.000; excesso (25.000 − 12.000)/12.000 = 108% | C, 12.000, 108% acima | certo |
| C-010 | carteira de limites 950.000; concentração 10%; exposição do grupo 80.000 | teto 95.000; disponível 95.000 − 80.000 = 15.000 | 15.000 | certo |
| C-016 / RN-023 | aprovação em 14/11/2026, validade 3 meses | 14/02/2027; 30/11 + 3 m = 28/02/2027; 31/01/2028 + 1 m = 29/02/2028 (bissexto) | idem | certo |
| C-018 / C-029 | última compra 10/08/2026, hoje 14/11/2026 | 21 + 30 + 31 + 14 = 96 dias > 90 | 96 dias, sem uso | certo |
| C-021 / RN-027 | limite 100.000; pedidos com 5%, 20%, 40%, 70% de excesso; 20.001 sobre 300.000 | 5% e ≤ 20.000 → Supervisor; 20% → Gerente (≤ 25%); 40% → Dir. financeiro (≤ 50%); 70% → Comitê; 20.001 (6,7%, mas > 20.000) → Gerente | idem | certo |
| C-026 | comp 650, score 750, atraso 35 | final = 450 + 260 = 710 → A; atraso 35 dias → D | D | certo |
| C-027 | faixa A, base 24.000, prazo 50 | 20.000 × 50/30 × 1,2 = 40.000; aviso de prazo > 45 | 40.000 + aviso | certo |
| C-030 | 3 pedidos flexibilizados: 1 pago em dia, 1 em atraso, 1 aberto | taxa sobre a carteira = 20% | 1 / 3 / 1, 20% | certo |
| C-031 | 5 solicitações decididas, 3 no prazo; ciclo médio 12,0; aprovação 50% | 3/5 = 60% | 60%, 12,0, 50% | certo |
| RN-013 | pontuações parciais do comportamento | 0,80 · 3,5× · 0,70 | idem | certo |
| RN-015 / RN-016 | componentes do score | 1000 / 750 / −600 (trava em 0); 520 | idem | certo |
| RN-019 | PL 1.000.000, teto 10–12% | 100.000 a 120.000; sem score 15.000 | idem | certo |

Entradas a esclarecer (resultado certo, enunciado frágil): **C-009** só fecha se o faturamento estiver informado
— pela ordem da RN-021, sem ele o resultado é "Dados insuficientes" antes de qualquer outra regra; **C-028**
"com R$ 1.000.000" não diz se é PL, faturamento ou pedido.

## 2. Cobertura contra o artefato

**§8.3 (rating único) — conforme.** RF-016/RF-017, RN-022 e RN-030 implementam: rating = faixa do farol AA–E
calculada; ajuste do analista com justificativa e aprovação de superior; duas fotografias (concessão congelada,
atual recalculado); "risco não previsto" = aprovado AA/A/B e hoje C ou pior; "aceito" = aprovado C ou pior;
AA–H fora de escopo; P1–P4 nunca gravado nos campos de rating do privado. **Uma falha:** o rating atual é
recalculado pelo motor e ignora o ajuste manual aprovado — cliente aprovado com ajuste C→B aparece como
"risco não previsto" no dia seguinte, sem nada ter mudado (C-7).

**O que o artefato faz e a 004 não cobre nem declara fora de escopo**

| Item do artefato | Onde está no estudo | Situação |
|---|---|---|
| Concentração da carteira de limites (Top 10, HHI, por grupo) | C §4 / D | órfão entre 004 e 006 — nenhuma das duas assume |
| Mostradores de flexibilização com meta (`flexMetaTaxa` 30%, `flexMetaConf` 90%) | C §4 | chaves existem no catálogo da 001; ninguém consome |
| PMR, revisão de limites vencidos, carteira por BU, pontos de atenção do crédito | C §4 / D §3 | órfãos entre 004 e 006 |
| Gatilhos de revisão (`revAtraso` 15, `revUso` 90, negativação, validade vencendo ≤ 15 dias) | A §3 | parâmetros no catálogo; sem RF nem "fora de escopo" |
| Itens de crédito na agenda | B §3 | a agenda da 002 (`ccAgendaMontar`) não traz itens de crédito e a 004 não pede |
| Segregação do pedido: "nem o vendedor/RCA" | A §2 | a spec manteve só "quem lançou"; a parte do vendedor sumiu sem registro |
| Filtros PF/PJ e "Inadimplentes com a empresa" (`inadDias`, barra de criticidade) | C §4.12 | ausentes |
| Chip de SLA por valor (2/5/10 dias úteis, `slaValor`) | C §4.15 | o artefato aplica de fato; virou só a pendência P-03 |

**Números divergentes sem justificativa:** nenhum nos números da política (alçadas 50k/500k/2M, 10%+20k/25%/50%,
validade 3 meses / 2 compras / 90 dias, flex 20%/10%, pesos 60/40 conferem com A). A divergência é de **nomes de
chave** (§3, C-4), não de valores.

**Defeitos conhecidos do artefato (00-visao-geral §5, A §8.2, C dúvidas)**

| Defeito | Na 004 |
|---|---|
| Usuário sem vínculo ativo de equipe decide (§5.1) | **copiado por omissão**: não há RN nem teste que recuse (C-8) |
| Score 0 tratado como "não informado" (A §8.2-21) | **copiado** na linha de teste da RN-032; o plan diz `null` — spec e plan divergem (C-11) |
| Flexibilização passa sem pontualidade (A §8.2-19) | mantido sem declarar (O-3) |
| Documentos CNPJ/sócios exigidos sempre | mudado para "só PJ" sem registrar a mudança (O-2) |
| Comitê regional nível 3 = Gerente sozinho aprova até R$ 2 mi | aparece só no risco R-006, não como pendência ao gestor (O-1) |
| Rating AA–H solto e desligado do farol | corrigido (§8.3) |
| Identidade digitada na tela | corrigido (identidade pela sessão) |

## 3. Conformidade

**Constitution**

| Princípio | Situação |
|---|---|
| II. Política como parâmetro | Valores parametrizados, mas com **nomes fora do catálogo da 001** e chaves novas autorregistradas pela 004; a 001 diz "parâmetro novo = pedido à 001" (C-4). P-04 e P-06 sem padrão deixam alçada e Estética sem valor (B-1) |
| III. Regra no servidor, identidade por `:VAR_USER` | ok no desenho. Falta a recusa de usuário sem vínculo ativo (C-8) |
| IV. Winthor só leitura | ok — bloqueio e limite viram `CC_PENDENCIA_WINTHOR` para execução manual |
| V. Auditoria em toda escrita | ok no plan; a rotina agendada grava como admin — declarar o autor "Sistema" na auditoria |
| VI. Testes obrigatórios | 4 testes `[BLOQ]` (T-098, T-104, T-110, T-144) e testes com contagem agregada que colidem entre si (C-5) |
| VIII. Simplicidade | ok |

**Arquitetura**

- **Dono de tabela (§4):** D-013 faz as SFs da 004 recusarem `SETOR='PUBLICO'`, mas a 005 precisa criar e mover
  solicitação pública nas tabelas da 004 "pela SF do dono". Do jeito escrito ninguém consegue — e a violação não
  está no Complexity Tracking (C-14).
- **Caminhos (`docs/execucao.md`):** plan e tasks escrevem em arquivos compartilhados (`backend/simulator/seed.mjs`,
  `smoke.mjs`, `config.mjs`, `backend/lib/escritas.mjs`, `frontend/src/App.tsx`, `server-functions.ts`,
  `frontend/src/lib/credito.ts`, `frontend/src/pages/…`) em vez das costuras por módulo (`simulator/seed/004-…`,
  `simulator/smoke/004-…`, `schema/004-…`, `src/modules/004-…/`, `src/lib/credito/`, `tests/004-….test.mjs`).
  A 004 roda em paralelo com a 002 (fase B2): "dois agentes nunca escrevem o mesmo arquivo" (C-1).
- Prefixo `cc`/`CC_`, datas VARCHAR e colunas em caixa alta: ok.

**Armadilhas da plataforma**

- CRUD REST 403 / escrita só por SF SQL: respeitado (JS valida e chama SQL por id).
- `{{param}}`: valores desligados declarados; `aberta` é tri-estado (O-7).
- 300 SF/min: `ccSolicitacaoMover` e `ccDecisaoRegistrar` custam 5 a 7 execuções cada (JS + SQLs internas +
  auditoria). Aceitável para uso humano; registrar no plan (O-9).
- `ccCreditoRotina` no mesmo cron (`0 */15 * * * *`) da leitura do Winthor: pode rodar sobre posição pela metade (O-8).
  Precisa gravar em lotes como admin, como a `ccSincronizarWinthor` (O-10).
- Simulador: `WITH RECURSIVE` roda no SQLite e exige MySQL 8 (O-11). Relógio próprio `CC_AGORA=2026-11-14T10:00:00`
  em `lib/datas.mjs`, diferente do da 005 e da 006 (C-3).

## 4. Viabilidade do backend

1. **Dado que não existe (B-2).** O motor lê `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS`,
   `COMPRAS_90D` e um carimbo de mudança em `CC_POSICAO_CLIENTE`. A 001 entrega `COMPRAS_QTD`, `COMPRAS_VALOR`,
   `PLANO_PRAZO_MEDIO` (em `CC_CLIENTE`) e `CC_RECEBIMENTO.DIAS_ATRASO_PAGAMENTO` — nenhuma das quatro colunas.
   O próprio plan da 001 (linha 385) lista isso como pedido em aberto da 004.
2. **Rotina incremental não vê o tempo passar (C-6).** Recalcula só cliente cuja posição mudou; validade que
   vence, parâmetro ou calibração alterados e crédito recém-criado não disparam nada.
3. **Crédito novo com outro vigente (C-10).** C-001/C-016 aprovam aumento, mas o destino do crédito anterior
   (encerra? substitui? soma?) não está em RN nem em SF.
4. **Cenários sem seed isolado (C-5).** C-025 espera "fora do SLA = 2" e C-031 semeia outra etapa fora do prazo;
   C-028, C-030, C-032 ("3 linhas") e C-033 (2/1/3/3) contam sobre a carteira da mesma analista; C-017, C-018 e
   C-026 alteram estado que outros testes leem.
5. **Testes que não provam:** T-117 (RF-041) não confere os 45 movimentos; RF-039 e RF-004 sem assert.
6. **Tasks que não fecham (B-1):** T-011, T-012 (itens extra), T-014, T-016 (exceções), T-021, T-022, T-023,
   T-024, T-033, T-040 e os testes T-098, T-104, T-110, T-144 esperam resposta do gestor. `docs/execucao.md`
   regra 4: pendência não bloqueia, segue pelo padrão do artefato parametrizado.
7. **Contratos pedidos por outras specs com outro nome (C-19):** a 005 pede `ccSolicitacaoEtapaGravar`,
   `ccSolicitacaoCheckMarcar`, `ccDecisaoInserir`, `ccCreditoInserir`; a 004 publica `ccEsc*`.
8. Sem dependência circular: 004 depende só da 001.

## 5. Lista de achados

### BLOQUEIA

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| B-1 | `plan.md` §Pontos bloqueados; `tasks.md` (18 marcas `[BLOQ P-NN]`) | Dez pendências travam 10 tasks de backend e 4 testes; não há padrão provisório, a fase B2 nunca fica verde e a regra 4 de `execucao.md` é contrariada | Adotar no plan um padrão provisório parametrizado por pendência (sugestões no §6) e retirar as marcas `[BLOQ]` |
| B-2 | `plan.md` §Modelo de dados / §Pedidos a outras specs | Motor lê quatro colunas e um carimbo que `CC_POSICAO_CLIENTE` não tem | Derivar na 004 (compra média = `COMPRAS_VALOR` ÷ (`comprasJanelaDias`/30); prazo = `CC_CLIENTE.PLANO_PRAZO_MEDIO`; pontualidade = % de `CC_RECEBIMENTO` com `DIAS_ATRASO_PAGAMENTO` ≤ 0 e não estornado; compras = `COMPRAS_QTD`; mudança = `SINCRONIZACAO_ID`) ou fechar com a 001 a inclusão das colunas antes de B2 |

### CORRIGIR

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| C-1 | `plan.md` §Contexto técnico, §Simulador; `tasks.md` Backend/Frontend | Escreve em arquivos compartilhados em vez das costuras por módulo | Trocar todos os caminhos pelas costuras de `docs/execucao.md` |
| C-2 | `plan.md` §Simulador | Elenco do seed (analistas, gerente, admin) conflita com o da 001 e das outras specs; cargo ANALISTA não existe no seed da 001 | Usar o elenco da 001 e pedir a ela o analista, ou criar nomes exclusivos do módulo |
| C-3 | `plan.md` §Simulador (`CC_AGORA`, `lib/datas.mjs`) | Terceiro relógio do projeto (005 usa `CC_HOJE=2026-12-01`, 006 a última sincronização) | Usar um único relógio fornecido pela 001 (`hoje()`/`agora()` de `escritas.mjs`) |
| C-4 | `spec.md` Regras; `plan.md` §Modelo de dados | Chaves de parâmetro com nomes diferentes do Anexo A da 001 e chaves novas registradas pela própria 004 | Renomear para os nomes do catálogo e listar as novas como pedido à 001 |
| C-5 | `spec.md` §Testes; `plan.md` §Testes | Contagens agregadas e testes que mudam estado sobre o mesmo seed | Um cliente/analista por cenário ou banco isolado por bloco, como a 006 (D-014) |
| C-6 | `plan.md` §Fluxo (`ccCreditoRotina`) | Recalcula só quem teve posição alterada | Recalcular também em mudança de crédito, solicitação, parâmetro ou calibração e fazer uma passada completa diária |
| C-7 | `spec.md` RN-022/RN-030 | Rating atual ignora o ajuste manual aprovado | Aplicar o ajuste vigente ao rating atual enquanto o motivo não mudar, ou comparar motor com motor |
| C-8 | `spec.md` §Regras, §Testes | Sem RN nem teste que recuse usuário sem vínculo ativo de equipe (defeito do artefato §5.1) | Acrescentar a RN e uma linha de teste de recusa |
| C-9 | `spec.md` RN de segregação do pedido | "Nem o vendedor/RCA" do artefato sumiu sem registro | Restaurar a regra ou declarar em Fora de escopo com o motivo |
| C-10 | `spec.md` C-001/C-016; `plan.md` `CC_CREDITO` | Destino do crédito vigente quando um novo é aprovado não está definido | Definir: o novo substitui e encerra o anterior, com auditoria e teste |
| C-11 | `spec.md` §Testes RN-032 × `plan.md` | Spec trata score 0 como "não informado"; plan usa `null` | Corrigir a linha de teste: 0 é score válido, vazio é não informado |
| C-12 | `spec.md` §Fora de escopo | Concentração de limites, mostradores de flexibilização, PMR, revisão vencida, carteira por BU e pontos de atenção do crédito não têm dono (nem 004 nem 006) | Atribuir a uma das duas ou declarar fora de escopo |
| C-13 | `spec.md` §Requisitos / §Fora de escopo | Gatilhos de revisão e itens de crédito na agenda não cobertos nem declarados | Acrescentar RF + pedido à 002, ou declarar fora |
| C-14 | `plan.md` D-013, §Complexity Tracking | SFs recusam cliente público e a 004 não oferece etapas `PENTRADA/PANALISE/PAPROV`, `PRE_APROVADA` nem rotina para público; a 005 depende disso | Aceitar público nas SFs de escrita com o conjunto de etapas do público (regra e motor continuam na 005) e registrar no Complexity Tracking |
| C-15 | `tasks.md` §Rastreabilidade | RF-041 (45 movimentos), RF-039 (3/75%/1) e RF-004 (total 12) sem assert | Acrescentar os asserts aos testes existentes |
| C-16 | `plan.md` §Contratos | `ccSolicitacaoHistorico` sem LIMIT/OFFSET/Total; `ccCalibracaoRevisoes` sem `…Total`; cita D-015 inexistente | Paginar as duas e corrigir a referência |
| C-17 | `spec.md` §Testes | `ok:false`, "LIMIT", "SF de excluir", `…Total`, `analistaId` na spec | Reescrever em linguagem de negócio ("recusa com a mensagem…", "não há como excluir") |
| C-18 | `spec.md` RN-031 × 006 RN-020 | "Decidida", "no prazo", taxa de aprovação e ciclo definidos de formas diferentes nas duas specs | Fixar a definição na 004 e a 006 só ler |
| C-19 | `plan.md` §Contratos, §Pedidos a outras specs | Nomes das SFs internas (`ccEsc*`) não batem com os que a 005 pede; `ccParametroVigente`/`lib/hierarquia.mjs` citados onde a 001 publica `ccParametroValores`/`lib/visibilidade.mjs` | Alinhar os nomes aos da 001 e publicar à 005 os nomes definitivos |

### OBSERVAÇÃO

| # | Arquivo · seção | Achado | Sugestão |
|---|---|---|---|
| O-1 | `plan.md` R-006 | Comitê regional com nível 3: o Gerente sozinho aprova até R$ 2 mi | Levar ao gestor como pendência |
| O-2 | `spec.md` checklist de documentos | CNPJ/sócios só para PJ; o artefato exige sempre | Registrar a mudança |
| O-3 | `spec.md` regra de flexibilização | Passa sem pontualidade informada (defeito 19) | Declarar se é intencional |
| O-4 | `spec.md` desempenho | Etapa corrente só conta quando já está atrasada — favorece a taxa | Declarar o viés ou contar etapas abertas pelo tempo decorrido |
| O-5 | `plan.md` × `spec.md` | `POTENCIAL` aparece no plan e não na spec | Remover ou especificar |
| O-6 | `spec.md` filtros | Sem filtro PF/PJ nem "Inadimplentes com a empresa" | Declarar fora de escopo |
| O-7 | `plan.md` §Contratos | `aberta` tri-estado num parâmetro numérico | Documentar os três valores no contrato |
| O-8 | `plan.md` `ccCreditoRotina` | Mesmo cron da sincronização | Defasar alguns minutos ou encadear ao fim da leitura |
| O-9 | `plan.md` §Riscos | Mover/Decidir = 5–7 execuções de SF por clique | Registrar a conta do teto de 300/min |
| O-10 | `plan.md` `ccCreditoRotina` | Volume da rotina | Gravar em lotes como admin, como a leitura do Winthor |
| O-11 | `plan.md` §Simulador | `WITH RECURSIVE` | Confirmar MySQL 8 no projeto Mitra |
| O-12 | `plan.md` D-007 | `COMPRAS_90D` fixo em 90 dias enquanto a validade é parâmetro | Usar `comprasJanelaDias`/`revUso` |
| O-13 | `spec.md` P-03 | O chip 2/5/10 dias úteis do artefato é aplicado de fato | Informar isso ao gestor na pergunta |
| O-14 | `spec.md` §Testes C-009, C-028 | Entradas ambíguas | Explicitar faturamento em C-009 e a natureza do R$ 1.000.000 em C-028 |

## 6. Perguntas ao gestor

O plan **não adota padrão provisório** para nenhuma das dez. Recomendação para destravar agora:

| Pendência | Pergunta | Padrão recomendado | Seguro para construir já? |
|---|---|---|---|
| P-01 | Quem vê a carteira em gestão e quem é o "agente" do desempenho | Visível ao analista que concedeu e ao agente da carteira do cliente, e a quem está acima de cada um; desempenho por analista | Sim — é filtro; mudar depois não mexe em dado |
| P-02 | Quais itens travam a mudança de etapa | Só os gates da RN-004 travam; checklist e documentos viram ressalva, com um parâmetro para endurecer | Sim |
| P-03 | Unidade do SLA e prazo total por valor | Dias corridos por etapa; chip 2/5/10 dias úteis apenas informativo | Sim — parâmetros |
| P-04 | Alçada das exceções do motor (concentração, garantia) | **Sem padrão não é seguro** (uma exceção poderia passar pela alçada do valor). Usar parâmetro com padrão "Comitê de crédito" (nível 4) | Só com esse padrão |
| P-05 | Alçada do pedido acima do teto flexível | A mais restritiva entre a regra do excesso e a da flexibilização | Sim — restritivo |
| P-06 | Valores da Estética | Os mesmos do privado, por parâmetro de segmento | Sim |
| P-07 | Quem renova e se a renovação muda limite | Decide a alçada do valor vigente, com segregação; renovação não muda limite (aumento = nova solicitação) | Sim — restritivo |
| P-08 | Origem do pedido retido | Lançamento manual pelo número do pedido, com fotografia da posição no momento | Sim; leitura do Winthor entra depois sem mudar a tabela |
| P-09 | Solicitação para prospecto | Só cliente que já existe no cadastro | Sim — restritivo |
| P-10 | Carga inicial dos créditos vigentes | Sem migração; o histórico começa na implantação | Sim, mas a carteira em gestão nasce vazia — avisar o gestor |
