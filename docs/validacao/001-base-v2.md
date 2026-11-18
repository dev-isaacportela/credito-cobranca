# Validação v2: 001-base

Validador independente, rodada v2. Data: 2026-11-16. Só leitura: nada foi corrigido nas specs.

Lido por inteiro: `docs/specs/001-base/{spec,plan,tasks}.md`, `docs/validacao/LEIA-v2.md`, relatório v1
`docs/validacao/001-base.md`, contrato `01-convencoes.md`, `06-seed-testes.md`, 02 §001-base e §Winthor,
03 §1 a §3, 04 §0, §1 e §8, 05 §1 e §2, `pedidos/00-respostas.md` (seção 001, "Para o integrador",
"Fechamento"), `LEIA-ajuste.md`, `arquitetura.md` §7, `opcoes-tela/escolhas.md` (001). Skill `mitra-escopo`
(SKILL.md, `references/simulador.md`, `references/publicacao.md`). Das specs 002 a 007, buscas pontuais
(o que pedem da 001, `semearQuadro`, `index.ts`, M1/M2, `add-010`).

Resumo: **1 BLOQUEIA, 8 CORRIGIR, 11 OBSERVAÇÃO.** Os 12 itens da lista "o que o plano desta spec precisa mudar"
foram aplicados; o item 5 só em parte (C-4).

## 1. Checklist

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | Passa | |
| RF com critério de aceite; cenários de erro; fora de escopo | Passa | 50 RF, 34 cenários, 32 RN |
| Todo C-NNN e RN-NNN com linha de teste | Passa | conferido um a um |
| Todo teste com tarefa | Passa | 37 linhas de backend = T-040 a T-076; 9 de tela = T-110 a T-118 |
| Toda SF pública com tarefa e teste | Falha parcial | 50 públicas e 26 internas de 04 §1 com tarefa (T-022 a T-035). Sem assert: o ramo "fora do sistema" da Ficha e `ccBaseWinthorCliente` (C-5); `ccBaseMembroListar`/`Total` só indireto |
| Nomes × contrato (tabelas, colunas, parâmetros, SFs, fases, cargos) | Passa | 22 tabelas, 38 chaves (12+6+14+6), passos, fases da leitura e cargos conferidos por busca |
| Nada de `NEEDS CLARIFICATION` / "pendente do arquiteto" | Passa | |
| Orçamento (DT-29) | Passa | Atribuir 20 = 3; parâmetros 20 = 3; membro novo / troca de topo = 4; contato principal novo = 5; feriados do ano = 3. Ficha: a linha diz 4, a conta dá 6 (O-4), no teto |
| D-01 a D-06; nenhum "arrastar"; quadros pela lib | Passa | |
| Telas × `escolhas.md`; telas sem desenho com tarefa | Passa | 14 telas com a opção certa; 7 estados/diálogos não desenhados em T-091, T-092, T-100, T-102 |
| Segurança e plataforma | Passa com ressalva | Identidade por `sessao()`/`quem()`; Forma A com guarda; nada em `VITE_*`; nada de produção nem migration. Exposição de `ccBaseWinthorCliente` não registrada (C-8) |
| Esqueleto (01 §14, Fluxo B) e marcos M1/M2 | Falha | O simulador não semeia os quadros (B-1); formato do `index.ts` de módulo não fixado antes do M2 (C-3); `add-010` não é republicado depois dos outros (C-2) |

## 2. BLOQUEIA

| Id | Onde | Achado |
|---|---|---|
| B-1 | tasks T-003, T-009, T-010; plan "Simulador"; 06 §2.3 | Nenhuma tarefa do esqueleto semeia os quadros no simulador. Pelo kit, o runtime só carrega `definitions` e não roda o `isEntrypoint()`, onde 002, 003 e 004 chamam `semearQuadro(QUADROS)`. O pipeline do orquestrador (DDL → elenco → `winthor()` → `ccRotina` → `atribuir()` → `dominio()`) não tem esse passo, então `KB_BOARD`/`KB_FASE`/`CC_FASE` ficam vazios: `ACESSOS`, `ccPodeMover` e os smokes das donas não têm quadro. A prova da 002 (T-012, "sim:check com os três quadros criados") não passa, e as donas não podem editar o orquestrador (01 §14). Correção: passo "semear os `QUADROS` de cada `lib/quadros/NNN` presente" logo depois do elenco, nos dois orquestradores, com o mesmo `semearQuadro()` da produção. |

## 3. CORRIGIR

| Id | Onde | Achado |
|---|---|---|
| C-1 | plan "Simulador" (seed da 001 "não roda a leitura") e "Testes"; tasks T-009, T-010, T-037 | Os smokes montam o banco pelo pipeline de 06 §2.3, que roda `ccRotina` antes dos testes. Com isso o C-003 ("antes: 10", 1003 sem cadastro) já começa com 11. Os testes também dividem um banco só por arquivo: C-026 (Sérgio 2, Parâmetros 6) recebe auditorias de C-013, C-015, C-016, C-017, C-019, C-020 e C-029; C-034 (`semUsuario` 1) recebe o Roberto do C-012; C-009 é alterado por C-014 e C-033. Falta dizer se o seed da 001 grava `CC_CLIENTE` no `winthor()` ou no `dominio()`, e dar aos testes um banco por `teste()` (ou um modo do orquestrador sem rotina). É o resto do v1 C-1. |
| C-2 | tasks T-001 (ordem no `CLAUDE.md`), T-036; plan "Preâmbulo" | Os ids são injetados na publicação. Como o `add-010` sai antes do `add-020`…`add-070`, o `ccRotina` no sandbox recebe id 0 para `ccCobRotina`, `ccCredRotina`, `ccPubRotina` e `ccPainelRotina` e pula esses passos para sempre. Também `ccPodeMover` fica sem os trechos dos `lib/quadros` publicados depois, e os ganchos aceitam tudo. A ordem precisa de "`add-010` de novo depois do último `add-0N0`", e o prompt de sandbox de cada spec, também (o da 003, T-161, não tem). |
| C-3 | tasks T-085, T-089 (M2); plan "Superfície" | O M2 libera o frontend de 002 a 007, mas a forma do `modules/NNN/index.ts` que o `App` e o `menuDoMembro(membro, modulosEntregues)` consomem não está fixada: rotas, item com grupo (Operação/Cadastros/Administração), regra de visibilidade por membro, ícone e como se decide "módulo entregue". A 003 precisa de item escondido do Analista e a 007 usa grupos "Histórico" e "Apoio", que não existem na casca C. Falta exportar o tipo em `lib/base/menu.ts` antes do M2. |
| C-4 | tasks T-017, T-035, T-072; plan C-033 e "Acessos" | `semearQuadro` é testado com 2 fases só. Ficam sem prova de 05 §1 regra 1: etiquetas, automações, campos de fase (checklist), `config`, "nunca sobrescreve" e "recria o excluído", que é o que 002, 003 e 004 vão usar. O passo `ACESSOS` não diz como tira a categoria do slug (`cobranca-*`, `concessao-*`/`pedidos-limite`, `juridico`), e cada uma tem tabela própria em 05 §2: Supervisor é `restrito` e Jurídico é `membro` no `juridico`. O teste usa só `cobranca-privada`, e a resposta 001 item 5 pedia "Gustavo em `ADMINS_IDS` dos 8 quadros". |
| C-5 | spec RF-012 e seção Testes; plan C-007; tasks rastreabilidade (RF-012 → T-047) | RF-012 (cliente fora do sistema, pelo 1011) não tem linha de teste na spec nem assert no plan. `ccBaseWinthorCliente` e o ramo `foraDoSistema` da `ccBaseClienteFicha` ficam sem prova, incluindo a recusa para quem não vê tudo. |
| C-6 | spec RN-011, C-011, RF-014, Testes C-011; plan C-011 | A regra "o último Administrador ativo não perde a marca nem é inativado" (F-6, 01 §4) está no plan e no teste (seis recusas), mas não na spec, que diz "cinco recusas". O plan criou requisito. Falta pô-la na RN-011 (ou RN nova) e no C-011. |
| C-7 | tasks T-009 (`atribuir()`); 06 §2.5 | 06 §2.5 manda o elenco gravar "analista Rita" em 4001–4010. `ccBaseClienteAtribuir` só grava agente e recusa destino de cargo ANALISTA. O `atribuir()` precisa gravar o analista por `ccEscBaseClienteAnalista` (Gustavo vê tudo); senão o seed da 004 começa sem analista. |
| C-8 | plan Complexity Tracking e R-003 | `ccBaseWinthorCliente` é SQL Oracle e está no perfil, como `ccBaseWinthorTitulos`: quem souber o id lê o cadastro de qualquer cliente do Winthor. Só a segunda está registrada. |

## 4. OBSERVAÇÃO

| Id | Onde | Achado |
|---|---|---|
| O-1 | tasks M1; 002 tasks T-001 ("T-001 → tudo") | A 002 só começa com o resultado de S-01 a S-14, que sai da T-002 executada no sandbox, fora do M1. Ou o M1 diz que as outras specs seguem as hipóteses de 01 §15, ou a 002 tira a dependência. Fica para o validador entre specs. |
| O-2 | tasks M1, M2 | O M1 espera T-078 e T-079 (massa de 20.000), que ninguém consome. O M2 não espera T-116 e T-118, que testam o menu e as extensões que as outras usam. |
| O-3 | tasks T-008 | "Faixas reservadas em comentário": o kit lê os blocos por texto e não aceita comentário dentro deles. O comentário tem de ficar fora. |
| O-4 | plan "Conta de execuções" (ficha = 4) | A aba Títulos, que abre primeiro, também mostra "pagos em 90 dias" (`ccBaseRecebimentoListar` + `Total`). A conta real é 6, no teto, e só fecha com o `ccBaseSincronizacaoStatus` vindo do cache do layout. |
| O-5 | plan (entradas das `ccEsc…`) | A guarda de `ccEscBaseEstado` não está escrita. `ccBaseWinthorDescobrir` (com sessão, `PODE_ADMINISTRAR`) grava `winthor.descoberta`, e uma guarda `ROTINA` recusaria. |
| O-6 | plan `CC_SINCRONIZACAO`; 02 | 02 diz que `CURSOR` é a "página da fase"; o plan usa o último `CODCLI`. Alinhar o texto do 02. |
| O-7 | plan `ccBaseMembroListar`, `ccBaseAuditoriaListar`; 04 §0 | 04 marca `ccBaseMembroListar` como L+T e põe `busca` em toda L+T. O plan trata a equipe como lista fixa e tira `busca` da auditoria. A SF deve ao menos aceitar `busca`/`limite`/`offset`. |
| O-8 | tasks T-009; 06 §2.2 | O elenco grava `CC_FILIAL_CREDORA`, que é da 003, e precisa pular quando a tabela não existe. Os parâmetros do elenco devem sair da mesma fusão do setup, com `vigencias`/`carteiras` (03 §18), ou a 005 não encontra `PUB = x`. |
| O-9 | plan "Testes" | Sem assert: as validações de comunicação da RN-016 (telefone, assinatura, e-mail), a parte de RF-001 "mudar o intervalo para 30 vale na leitura seguinte" e o passo `EM_ANDAMENTO` há mais de 10 min (01 §11). |
| O-10 | tasks T-010 (`smoke/base.mjs`) | Não há ajudante para rodar um teste com `SIM_SESSAO_ANINHADA` 0 e 1, que 06 §3 exige de toda escrita com card nas outras specs. |
| O-11 | 06 §3; "Para o integrador" item 5 | `smoke/900-fluxos.mjs` não tem tarefa em nenhuma spec. |

## 5. v1 → v2

| v1 | Destino |
|---|---|
| B-1 (validação de modelo não publicada) | Resolvido: `ccBaseModeloValidar` + `ccEscBaseModeloValidar` com cargo Jurídico ou nível ≥ `com.modeloValidaNivel`; C-023 prova |
| C-1 (6 auditorias; massa própria do C-026) | Mal resolvido: a conta virou 6, mas o C-026 continua sem massa própria → C-1 |
| C-2 (exposições no Complexity Tracking) | Resolvido para `ccEsc…`, auditoria, e-mail e `ccBaseWinthorTitulos`; falta `ccBaseWinthorCliente` (nova) → C-8 |
| C-3 (parâmetro chave a chave) | Resolvido: lote validado no conjunto final por carteira; o corte de 20 em grupos grandes está registrado (`ponytail:`) |
| C-4 (cota de 300/min) | Resolvido: tetos de lote e `auditarLinhas` |
| C-5 (catálogo fixo em 114) | Resolvido: 38 da base; cada módulo registra as suas |
| C-6 (parâmetros sem consumidor) | Resolvido: saíram |
| C-7 (layout de arquivos) | Resolvido: `add-010-base`, `schema/001-base`, `seed/001-base`, `smoke/001-base` |
| C-8 (dado pedido por 002/003/006) | Resolvido: `ENDERECO`, `VDIAS`, planos, faturamento, de → para dos campos |
| C-9 (seeds no mesmo banco) | Resolvido entre módulos (faixas, banco por smoke); dentro da 001, não → C-1 |
| C-10 (regras sem assert) | Resolvido na maior parte; resto → O-9 |
| C-11 (planos e faturamento sem dono) | Resolvido: dono 001 (RF-045, RF-046) |
| O-1 a O-9 | O-1, O-2, O-4 a O-9 resolvidos; O-3 substituído pela D-006 (a T-002 não trava o simulador, 01 §15) |
