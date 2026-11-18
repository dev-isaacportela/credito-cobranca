# Validação — spec 007 · Histórico e apoio

> Validador independente (fase 0b). Lidos por inteiro: `docs/specs/007-historico-apoio/{spec,plan,tasks}.md`,
> `docs/constitution.md`, `docs/arquitetura.md`, `docs/execucao.md`, `docs/templates/`, os relatórios do
> artefato (00-visao-geral, E) e os contratos da 001–005 que o histórico lê.
> Nada foi corrigido; este arquivo só relata.
>
> **Resultado: 0 BLOQUEIA · 14 CORRIGIR · 12 OBSERVAÇÃO.** Nenhum achado impede a construção. Os mais sérios:
> um padrão provisório que contradiz três testes da própria spec e uma leitura do histórico que, do jeito
> descrito, pode gastar o teto de 300 SF/min sozinha.

## 1. Checklist do Fluxo A (mitra-escopo) e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF/componente | ok | Nenhuma menção a SF, tabela ou biblioteca |
| Todo RF com critério verificável | ok | 24 RF com critério; três sem assert (C-14) |
| Cenário de erro | ok | Cliente fora da visibilidade, arquivo recusado, fonte sem endereço |
| Fora de escopo | ok | Presente (linha 257); faltam os treinamentos/documentos do Jurídico e a tela de planos (§2) |
| Seção Testes: linha por C/RN com entrada e resultado | ok | 19 C + 15 RN com números; os padrões provisórios D-009/D-010 não têm linha (C-2) |
| Plan: checagem de princípios | ok | Seção "Checagem de princípios" |
| Plan: contratos de SF | ok com ressalvas | Prefixo `cc`; todas JAVASCRIPT; parâmetros e saídas declarados; mecanismo de identidade dentro do JS não descrito (C-6) |
| Toda listagem com LIMIT/OFFSET + `…Total` | ok | Histórico, fontes e material paginados com `…Total` |
| Plan: seção Simulador | ok com ressalvas | Smoke "cria as tabelas de origem mínimas" — stubs (C-7) |
| Plan: mapa de testes | ok | |
| Tasks: uma task por teste | ok | Numeração irregular `T-0100…T-0123` (O-12) |
| Rastreabilidade RF → task → teste | **não** | RF-014 (ordenar), RF-018 (inativar material), RF-023 ("3 registros") sem assert |
| `[NEEDS CLARIFICATION]` | ok com ressalva | 5 pendências, todas com padrão no plan (D-009…D-013) — mas o cabeçalho das tasks ainda exige as respostas (C-3) |

### Contas refeitas (todas conferem)

| Linha | Entrada | Conta | Esperado | Veredito |
|---|---|---|---|---|
| C-001 | eventos do cliente do seed por categoria | 5 + 1 + 2 + 2 + 4 + 3 + 1 + 3 + 1 + 1 + 1 = 24 | 24 registros | soma certa — mas vale só para quem vê Auditoria (C-1) |
| C-002 | 24 registros, página de 10 | 10 / 10 / 4 | 3 páginas | certo |
| C-019 | contagem por categoria | `AUDITORIA: 1` entre as 9 categorias | idem | certo para Supervisor+; errado para o agente A1 com o padrão D-010 (C-1) |
| Fontes | cadastro inicial por grupo | 6 + 3 + 9 + 5 + 12 + 6 = 41 | 41 | certo |
| Fontes a revisar | dois grupos sem revisão | 12 + 9 = 21; depois de revisar uma, 20; depois de incluir uma, 42 no total | idem | certo |
| Material | cadastro inicial | 1 política + 1 BPMN em PDF + 5 PNG = 7; filtro "fluxo" = 6 | 7 e 6 | certo |
| C-017 | regras em vigor por segmento | Estética 5, geral 7 | idem | certo, desde que o relógio do teste seja ≥ 01/11/2026 |
| RN-014 | material inativado | 7 − 1 = 6 | 6 | certo |
| Exportação | nome de arquivo e texto sem acento fora do Latin-1 | exemplos consistentes entre spec e plan | idem | certo |

## 2. Cobertura contra o artefato

**O que o artefato faz e a 007 não cobre nem declara fora de escopo**

| Item do artefato | Situação |
|---|---|
| Material de apoio: cerca de 17 documentos (7 treinamentos, 3 documentos do Jurídico, política, BPMN, fluxos) | a 007 carrega 7; os outros 10 não são citados nem excluídos (O-4) |
| Página "Regras em vigor" com tabelas descritivas e checklists | a 007 mostra só os valores dos parâmetros (O-5) |
| Tela "Prazos de pagamento" (planos) | órfã — nenhuma spec assume (O-7) |
| Carta de anuência e dossiê como eventos do histórico | fora do mapa de origens (O-3) |
| Trilha de auditoria | declarada fora, sem apontar para a 001 (`ccAuditoriaListar`) (O-6) |

**Números da política:** a 007 não define política; as contagens (9 categorias, 12 campos do resumo, 41 fontes)
conferem com o relatório E.

**Defeitos conhecidos do artefato**

| Defeito | Na 007 |
|---|---|
| jsPDF carregado de CDN em tempo de execução | corrigido — dependência no bundle. A versão ficou presa em 2.5.1 "igual ao artefato" (O-9) |
| PDF limitado a Latin-1 | mantido e declarado (saneamento do texto) |
| Resumo mostra "risco, farol, rating e score" como quatro coisas | **copiado** depois da decisão §8.3 (farol = rating) e sem P1–P4 para cliente público (C-8) |
| Histórico só com o que estava no navegador | corrigido — lê as origens no servidor; começa na implantação (D-013) |
| Identidade digitada | corrigido |

## 3. Conformidade

**Constitution**

| Princípio | Situação |
|---|---|
| I. Spec primeiro | O cabeçalho das tasks exige "5 pendências respondidas e pedidos P-1 a P-11 atendidos", contra a regra 4 de `execucao.md` e contra o próprio plan, que adotou padrões (C-3) |
| II. Política como parâmetro | ok — a tela de regras lê `ccParametroValores` |
| III. Regra no servidor, identidade por `:VAR_USER` | Visibilidade num helper JS `visiveis(user)` — terceira implementação da mesma regra; o plan não diz como o JS obtém a identidade (a 001 oferece `membroDaSessao()` no preâmbulo de `escritas.mjs`) (C-6) |
| IV. Winthor só leitura | ok |
| V. Auditoria em toda escrita | ok para fontes e material; `ATUALIZADO_POR` guarda e-mail enquanto as outras specs guardam o id do membro (O-8) |
| VI. Testes obrigatórios | Padrões D-009/D-010 sem teste; D-010 contradiz três testes (C-1, C-2); smoke com stubs (C-7) |

**Arquitetura**

- **Dono de tabela:** só lê as tabelas das outras specs e grava `CC_FONTE_LINK` e `CC_MATERIAL` — correto.
  O anexo do material depende do `ccAnexoRegistrar` da 001, que só aceita `ENTIDADE='CLIENTE'` com a guarda
  "cliente visível" (confirmado em `001-base/plan.md` linhas 160–161) (C-10).
- **Caminhos:** T-012 escreve no `seed.mjs` compartilhado; rotas e mapa de SFs em arquivos compartilhados; a 007
  roda em paralelo com a 006 (C-12).
- **Colunas citadas que não existem onde o plan aponta:** o pedido P-9 busca rating, score e fonte pagadora em
  `CC_CREDITO`; eles estão em `CC_RISCO_CLIENTE`, `CC_SOLICITACAO` e `CC_POSICAO_CLIENTE` (C-9).

**Armadilhas da plataforma**

- **300 SF/min:** `ccHistoricoEventos` lê cerca de 25 origens em memória; `ccHistoricoEventosTotal` lê tudo de
  novo, e `ccHistoricoResumo` soma mais. Se cada origem for uma SF chamada por id, abrir um cliente custa perto
  de 60 execuções e trocar de página ou filtro repete a conta — cinco usuários estouram o teto (C-4).
- **Tempo:** 25 leituras em sequência dentro de uma SF JS contra o limite de 60 s — medir.
- Escrita só por SF SQL: respeitado no desenho (JS valida, SQL grava).
- Simulador: nada de SQL exótico; o risco é o stub das origens (C-7).

## 4. Viabilidade do backend

1. **Padrão que contradiz os testes (C-1).** D-010 diz que a categoria "Alteração auditada" só aparece para
   Supervisor ou acima. C-001, C-002 e C-019 rodam como o agente A1 e esperam 24 registros e `AUDITORIA: 1`.
   Com o padrão, A1 vê 23, duas páginas de 10 e uma de 3, e `AUDITORIA: 0`.
2. **Origem quebrada some em silêncio (C-5).** O `try/catch` por origem devolve o histórico sem a categoria que
   falhou e sem aviso — o usuário lê um histórico incompleto como se fosse completo.
3. **Anexo de material (C-10).** Sem mudança na 001, `ccMaterialSalvar` não consegue registrar arquivo. E C-015
   afirma que a recusa de tipo/tamanho vem de `ccMaterialSalvar`, enquanto o plan diz que a validação é da SF da
   001 (C-11).
4. **Smoke com tabelas falsas (C-7).** A 007 é a última fase (B4); as tabelas reais das specs 001–005 já existem.
   Criar "tabelas de origem mínimas" esconde nome de coluna errado, como o do item C-9.
5. **Desempate (O-1).** A ordenação "data, depois maior id" não é comparável entre origens diferentes.
6. **Timbrado (O-10).** O PDF sai sem timbrado oficial até o arquivo ser fornecido; a task de verificação T-092
   não fecha antes disso.
7. Sem dependência circular e sem dado inexistente além dos itens C-9 e C-10.

## 5. Lista de achados

### BLOQUEIA

Nenhum.

### CORRIGIR

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| C-1 | `plan.md` D-010 × `spec.md` C-001, C-002, C-019 | Padrão "auditoria só Supervisor+" contradiz testes que rodam como agente e esperam 24 registros | Rodar esses testes como supervisor/gerente e acrescentar a linha "agente vê 23", ou trocar o padrão |
| C-2 | `spec.md` §Testes; `plan.md` §Testes | Padrões D-009 (Jurídico restrito) e D-010 sem linha de teste | Uma linha de teste por padrão provisório |
| C-3 | `tasks.md` cabeçalho (linha 9) | Exige pendências respondidas e P-1…P-11 atendidos, embora o plan tenha adotado padrões | Trocar por "segue pelos padrões D-009…D-013" |
| C-4 | `plan.md` §Contratos (`ccHistoricoEventos`, `…Total`, `ccHistoricoResumo`) | Lê ~25 origens duas ou três vezes por abertura/página | Consultas diretas dentro de uma única SF, devolvendo página e total na mesma chamada (ou um `UNION ALL` por `CLIENTE_ID`) |
| C-5 | `plan.md` §Fluxo (try/catch por origem) | Origem com erro é descartada em silêncio | Devolver `origensComErro` e mostrar o aviso na tela |
| C-6 | `plan.md` §Contratos (`visiveis(user)`) | Terceira implementação da visibilidade; identidade no JS não descrita | Usar o fragmento de `lib/visibilidade.mjs` e `membroDaSessao()` da 001 |
| C-7 | `plan.md` §Simulador | Smoke cria tabelas de origem mínimas | Rodar sobre o schema real das specs 001–005 |
| C-8 | `spec.md` RF do resumo (12 campos) | "Risco, farol, rating e score" ignora §8.3 e não trata P1–P4 | Um campo "Rating" (AA–E, ou P1–P4 para público) mais o score |
| C-9 | `plan.md` §Pedidos a outras specs (P-9) | Busca rating, score e fonte pagadora em `CC_CREDITO` | Apontar para `CC_RISCO_CLIENTE`, `CC_SOLICITACAO` e `CC_POSICAO_CLIENTE` |
| C-10 | `plan.md` §Pedidos a outras specs | `ccAnexoRegistrar` da 001 só aceita entidade `CLIENTE` com guarda de cliente visível | Pedir à 001 a entidade `MATERIAL` com guarda de administrador |
| C-11 | `spec.md` C-015 × `plan.md` | Teste afirma a recusa em `ccMaterialSalvar`; o plan valida na SF da 001 | Dizer no plan qual SF recusa e ajustar o assert |
| C-12 | `tasks.md` T-012, Frontend | Escreve em `seed.mjs`, rotas e mapa de SFs compartilhados | Usar as costuras por módulo de `docs/execucao.md` |
| C-13 | `plan.md` §Simulador | Elenco (A1, S1, G) conflita com o das outras specs | Usar o elenco da 001 |
| C-14 | `tasks.md` §Rastreabilidade | RF-014 (ordenar), RF-018 (inativar material) e RF-023 ("3 registros") sem assert | Acrescentar os asserts |

### OBSERVAÇÃO

| # | Arquivo · seção | Achado | Sugestão |
|---|---|---|---|
| O-1 | `plan.md` ordenação | "Maior id" não compara entre origens | Desempatar por `origem:ID` |
| O-2 | `plan.md` mapa de origens | "Recuperado" sem excluir estorno | Filtrar `CC_RECEBIMENTO.ESTORNADO` |
| O-3 | `plan.md` mapa de origens | Carta de anuência (`CC_COBRANCA.ANUENCIA_EM`) e dossiê fora | Incluir ou declarar |
| O-4 | `spec.md` §Fora de escopo | 7 de ~17 documentos do artefato | Declarar os 10 que ficam fora |
| O-5 | `spec.md` regras em vigor | Só valores de parâmetro | Declarar que tabelas descritivas/checklists ficam fora |
| O-6 | `spec.md` §Fora de escopo | Trilha de auditoria "fica fora" | Apontar para a tela da 001 |
| O-7 | `spec.md` §Fora de escopo | Tela "Prazos de pagamento" sem dono | Declarar fora ou atribuir |
| O-8 | `plan.md` §Modelo de dados | `ATUALIZADO_POR` com e-mail | Guardar o id do membro, como as outras specs |
| O-9 | `plan.md` §Contexto técnico | jsPDF fixo em 2.5.1 | Conferir avisos de segurança e usar a versão corrente |
| O-10 | `tasks.md` T-092 | PDF sem timbrado oficial | Aceitar o cabeçalho de texto até o arquivo chegar |
| O-11 | `plan.md` §Testes | Teste de `ccFonteListar` com limite 100 | Testar com o limite real da tela |
| O-12 | `tasks.md` | Ids `T-0100…T-0123` fora do padrão `T-NNN` | Renumerar |

## 6. Perguntas ao gestor

| Pendência | Pergunta | Padrão provisório do plan | Seguro para construir já? |
|---|---|---|---|
| D-009 | O que o Jurídico vê do histórico | Só clientes com processo, em 6 categorias | Sim — restritivo; falta o teste |
| D-010 | Quem vê a categoria "Alteração auditada" | Supervisor ou acima | Sim — restritivo; mas os testes C-001/C-002/C-019 precisam ser corrigidos antes |
| D-011 | Fonte sem endereço e timbrado do PDF | Endereço vazio aceito; sem timbrado | Sim |
| D-012 | Material sem arquivo e exportação em CSV | Material pode existir só com descrição; CSV fora | Sim |
| D-013 | Histórico anterior à implantação | Começa na implantação | Sim — avisar o gestor de que o histórico nasce vazio |
