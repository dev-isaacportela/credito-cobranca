# B1 · 001-base — validação independente do backend

**Data:** 2026-11-17 · **Escopo:** backend da spec 001-base (sem 002/004, que estão em construção).

**Leu:** `CLAUDE.md`; skill `mitra-escopo` 0.10.0 (`SKILL.md`, `references/plataforma-mitra.md`, `publicacao.md`, `simulador.md`); contrato `00`, `01` (inteiro), `02` §001-base, `03` §1–3 e §8, `04` §0, §1 e §8, `05` §1–2, `06`; `docs/specs/001-base/{spec,plan,tasks}.md`; código `backend/add-010-base.mjs`, `lib/**` (escritas, guarda, visibilidade, parametros, tempo, dias-uteis, winthor-sql, quadros, base/*, parametros/001-base), `schema/001-base.mjs`, `setup-backend.mjs`, `add-001-kanban.mjs`, `add-002-jdbc-winthor.mjs`, `add-090-perfil-acesso.mjs`, `simulator/` (runtime, config, seed.mjs, seed/001-base, smoke/base, smoke/001-base; 000-elenco e 000-esqueleto por amostra), `tests/*`, `frontend/src/lib/server-functions.ts` (blocos da 001); `escritas.mjs` e `README` da lib `@benenutri/mitra-kanban` 1.14.0 (proteção de parâmetros).

**Rodou:** `cd backend && npm test` → verde (14 testes de regra, `sim:check` 32 SQL ok / 0 falha, smoke 000 + 001 = 52 ok, 0 pulado, 0 falha). Script descartável no scratchpad (banco temporário do simulador, nada no repositório) para provar o B-01. Nada contra a plataforma.

**Conferido e conforme:** 76 SFs com os nomes de 04 §1 (50 públicas + 26 internas), sem nome fora do contrato, todas nos dois blocos de `server-functions.ts` (ids 1001–1076); entradas, saídas e "quem" batem com 04 §1, salvo D-012 e O-06; 22 tabelas com colunas, tipos, nulos, padrões e chaves de 02; 38 chaves com padrão, faixa, carteira e vigência de 03 §1–3, §8; nenhum `NOW()`/`CURDATE()`/`CURRENT_TIMESTAMP`/`SYSDATE` nem `new Date()` em regra (só aritmética de data e orçamento de parede, previsto no plan); datas `VARCHAR`; colunas em maiúscula; toda JS de escrita audita; `CC_AUDITORIA` sem `UPDATE`/`DELETE`; Winthor só `SELECT` (teste RNF-005); `runDmlMitra` só em `ccRotina`/`ccBaseSincronizar`/`ccBaseAcessosConciliar` (cron); nenhuma SQL de leitura com `EU` é chamada aninhada; `quem()`/`sessao()` como 01 §4; SQL montada em JS usa `q()` (aspas dobradas, sem barra invertida) e `inteiro()`; regra do último Administrador e "marca só por quem tem" na JS **e** na guarda; `ccPodeMover`/`ccPodeExcluir` no formato de 01 §14; perfil exclui `ccRotina` e os 6 passos.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | 1 |
| CORRIGIR | 10 |
| OBSERVAÇÃO | 16 |

D-010 a D-013 fazem sentido; D-010 e D-012 pedem atualização do contrato (02 e 04), D-011 pede correção no próprio plan, D-013 não muda contrato (ver seção final).

## BLOQUEIA

- **B-01 · escalada de alçada e de visibilidade pela escrita interna de membro** — `backend/add-010-base.mjs:1565-1590` (`ccEscBaseMembroInserir`, `ccEscBaseMembroAtualizar`). As duas SQL gravam `NIVEL = {{nivel}}` e `CAMINHO = '{{caminhoNovo}}'` vindos do parâmetro. A guarda só exige `PODE_ADMINISTRAR`, e a `ccEsc…` está no perfil, então quem administra chama a SQL direto, sem a JS e sem auditoria. Provado no simulador: Nara (Agente com a marca, nível 1) grava em si mesma `NIVEL = 5` mantendo `CARGO = 'AGENTE'`, e passa a atender toda alçada até Diretoria/Comitê. Isso fere 01 §4 ("alçada nunca é atendida pela marca") e a premissa de 01 §5. Gustavo grava `CAMINHO = '/'` na Ana, e ela passa a ver 9 clientes em vez de 3. Correção: `NIVEL` calculado na própria SQL (`CASE '{{cargo}}' WHEN 'AGENTE' THEN 1 … END`) e `CAMINHO` calculado na SQL pelo `CAMINHO` do superior, com `caminhoAntigo` conferido contra o gravado. Mais um teste em C-019 com a chamada direta.

## CORRIGIR

- **C-01 · membro novo nasce com `CAMINHO = ''` e o fragmento SQL abre tudo** — `add-010-base.mjs:1567` e `lib/visibilidade.mjs:21-25,36`. O cadastro de membro faz duas escritas sem transação. Se a segunda (`ccEscBaseMembroAtualizar`) falhar, `V.CAMINHO LIKE CONCAT('', '%')` casa todos: o membro vê todos os clientes que têm agente ou analista. O `visivel()` em JS recusa caminho vazio (`visibilidade.mjs:47`), então SQL e JS divergem. Correção: inserir com um caminho que não casa nada, ou exigir `<ator>.CAMINHO <> ''` em `visibilidadeDeCliente`/`membroVisivel`.
- **C-02 · quem administra pode se promover pela tela** — `add-010-base.mjs:549-633`. `ccBaseMembroSalvar` aceita que o próprio ator mude o seu cargo para DIRETORIA (nível 5): a marca ADMIN de um Agente vira alçada, e um Gerente vira Diretoria. Fica auditado, mas é permitido. O contrato (D-06) não proíbe. É preciso pedir ao arquiteto uma regra: ninguém altera o próprio cargo, e cargo de nível ≥ 3 só é dado por quem tem nível igual ou maior.
- **C-03 · RN-011: rebaixar quem tem subordinados não é recusado** — `add-010-base.mjs:568-596`. Supervisor que vira Agente ou Jurídico mantém os subordinados ativos com um superior de cargo inválido. Só a inativação confere subordinados. O `ccBaseEquipeConferir` só aponta o problema depois.
- **C-04 · RN-014: "cliente sem agente só é atribuído por quem vê tudo" não é conferido** — `add-010-base.mjs:441` (JS) e `1530-1535` (guarda). Só "deixar sem agente" é restrito. Um Supervisor que enxerga o cliente sem agente pelo analista (ex.: Rita no 1003, como no teste de pipeline do C-009) consegue atribuí-lo. O plan (Atribuição) pede a regra. Falta também o teste no C-014.
- **C-05 · `ccEscBaseClienteAnalista`/`ccEscBaseClienteJuridico` com guarda frouxa** — `add-010-base.mjs:1538-1541`. Qualquer membro que vê o cliente grava, e `analistaId` não é conferido (qualquer id, inativo ou de outro cargo). Um agente pode dar visibilidade do cliente a qualquer membro, ou tirar o `NO_JURIDICO`. Exigir destino ativo de cargo válido e o cargo/nível mínimo do ator, combinando com 003 e 004.
- **C-06 · a leitura perde pagamentos e notas da primeira carga** — `add-010-base.mjs:1109-1125`, `lib/winthor-sql.mjs:31-35`. O universo da página usa `base.syncJanelaMeses` (12 meses). Já recebimentos e faturamento da primeira carga começam em janeiro do ano anterior (até 23 meses; 02 §CC_RECEBIMENTO, §CC_FATURAMENTO_MES). Com D-010 tudo vem pela página de clientes, então cliente sem movimento nos últimos 12 meses fica sem esses pagamentos e notas. Na primeira carga, o universo deve usar a data mais antiga das duas.
- **C-07 · rotina: "última leitura com erro → nova leitura" não está no contrato** — `add-010-base.mjs:998`. 01 §11, decisão 2, não traz essa condição. Com o Winthor fora, toda rodada vira leitura, nenhum passo de módulo roda (a régua e a passagem do dia param) e o Winthor recebe uma tentativa a cada 5 min. Registrar como divergência com justificativa, ou voltar ao intervalo.
- **C-08 · e-mail sai sem registro em MySQL estrito** — `add-010-base.mjs:880-884`. O assunto renderizado (assunto do modelo até 300 + valores dos campos) não é cortado a 300 antes de `ccEscBaseEmailInserir` (`CC_EMAIL_ENVIADO.ASSUNTO V(300)`). No MySQL estrito o INSERT falha depois do `sendEmailMitra`: o e-mail sai sem registro, contra RN-023. O SQLite não confere tamanho, então o simulador não acusa.
- **C-09 · testes que não afirmam o que a linha diz** — `simulator/smoke/001-base.mjs`:
  - (a) RNF-006 pede ≤ 12 com **20** clientes e **20** parâmetros, mas o C-014 (`:388`) usa 2 clientes e o C-018 (`:465`) 14 chaves. O lote cheio (`NUMEROS_20`, auditoria de 20 linhas) nunca roda.
  - (b) O C-017 (`:450-452`) compara `PADRAO` com o próprio `lib/parametros/001-base.mjs`, que é a fonte da semeadura: é tautológico e não confere 03/Anexo A. Conferi à mão e bate.
  - (c) O C-033 (`:829`) afirma só `typeof MOTIVO === 'string'`, e a spec pede "Casos não são excluídos".
- **C-10 · plan desatualizado em relação a D-010/D-011** — `docs/specs/001-base/plan.md:233` diz que o passo com id 0 "fica `PENDENTE`", mas o D-011 diz "sem linha". `plan.md:245-252` ainda descreve 6 fases da leitura, e o D-010 diz 3.

## OBSERVAÇÃO

- **O-01 · `{{param}}` numérico sem aspas** — `simulator/runtime.mjs:44-53`. O simulador troca por texto e só dobra aspas, então `clienteId = "1 OR 1=1"` passa e anula a guarda de qualquer `ccEsc…` ou leitura chamada direto. A segurança depende da "proteção de parâmetros" da plataforma (citada em `mitra-kanban/backend/escritas.mjs:24`), que não está na lista S-01…S-15. Pôr na T-002 como S-16, ou envolver números em `CAST('{{x}}' AS SIGNED)`.
- **O-02 · erro 1093 e `derived_merge`** — `add-010-base.mjs:91,1586-1590`. `ccEscBaseMembroAtualizar` lê `CC_MEMBRO` em tabela derivada (`ATOR_DERIVADO`, `Z2`, `T2`). O MySQL pode fundir a derivada e voltar a dar 1093; o SQLite não acusa. Forçar a materialização (`LIMIT`/`DISTINCT` na derivada) ou conferir na T-002 (S-06). A regra de 06 §5 tem a mesma fragilidade.
- **O-03 · SELECT em `CC_*`/`KB_*` no perfil** — `add-090-perfil-acesso.mjs:261-264`. Confirmar na T-002 que isso não abre leitura direta (REST) para business, o que furaria RN-012 e a auditoria.
- **O-04 · T-002 ainda sem roteiro** — `backend/sandbox/t002-confirmar.mjs` não existe (tasks T-002). É condição para publicar. Incluir O-01, O-02, O-03 e o tamanho de `VARCHAR` em modo estrito (C-08).
- **O-05 · lista de funções de 06 §5 incompleta** — o código usa `TIMESTAMPDIFF` (`add-010-base.mjs:1459`), `CHAR_LENGTH` (`:1583`) e `CAST … AS SIGNED/CHAR` (`:206`, `:1407`), que não estão na lista. Atualizar o contrato.
- **O-06 · `ccBaseAuditoriaListar` sem `busca`** — `add-010-base.mjs:221-229`. 04 §0 diz que toda L+T tem `busca`. O plan registrou a decisão, mas o contrato fica inconsistente.
- **O-07 · nome `membroId` com dois sentidos** — em `ccBaseMembroSalvar` (04 §1) `membroId` é o membro editado, mas `quem()` lê `event.membroId` como "quem age" quando não há sessão (`lib/escritas.mjs:89`). Hoje só cron e script chegam sem sessão. Renomear no contrato (ex.: `id`).
- **O-08 · `ccBaseTitulosAbertos` aceita rotina** — `add-010-base.mjs:373`. 04 não a marca como SIS. É inofensivo, mas convém documentar ou recusar.
- **O-09 · Jurídico não marca cliente novo** — `ccEscBaseClienteJuridico` exige o cliente visível ao ator, e o Jurídico só vê cliente com `NO_JURIDICO`. A 003 precisa chamar em nome de quem vê o cliente, ou como rotina.
- **O-10 · marca ADMIN e `alcada.*`** — parâmetro é ADM, então quem tem a marca pode baixar o nível exigido nas alçadas: outra porta pela qual a marca vira alçada. Decidir junto com C-02.
- **O-11 · regras de tela sem teste** — C-005·RF-006, C-008, C-011·RF-017, C-021, C-025, C-026, C-027 e RN-027 não têm teste: `frontend/tests/` ainda não existe (fase de frontend).
- **O-12 · `sim:check` roda sem sessão** — as 12 leituras com `EU` voltam vazias e só provam que o SQL compila. Rodar o check como um membro (ex.: Gustavo) daria linhas.
- **O-13 · duplicação de ajudantes** — quatro cópias do quotador SQL: `q` (`add-010-base.mjs:60`), `txt` (`lib/escritas.mjs:187`, `lib/quadros.mjs:215`, `setup-backend.mjs:31`), `sql` (`lib/parametros.mjs:135`). E três normalizações de texto quase iguais: `normalizarBusca` (`add-010-base.mjs:65`), `normalizarTexto` (`lib/base/setor.mjs:4`), `nomeChave` (`lib/base/equipe.mjs:4`).
- **O-14 · `ATOR_DERIVADO` frágil** — `add-010-base.mjs:91` monta a guarda com regex sobre o texto de `ATOR`. Melhor exportar de `guarda.mjs` o corpo do `EXISTS`.
- **O-15 · `FONTE_EMAIL` frágil** — `add-010-base.mjs:252-253` fatia o fonte do motor por marcadores de comentário sem conferir `indexOf`. Com `^1.14.0`, uma atualização da lib quebra em silêncio. Lançar erro se o marcador não aparecer.
- **O-16 · linha morta no smoke** — `smoke/001-base.mjs:214`: `UPDATE PCPREST SET DTVENC = DTVENC WHERE 1 = 0` não faz nada.

## D-010 a D-013

| # | Faz sentido? | Contrato |
|---|---|---|
| D-010 (leitura em 3 fases, cliente inteiro por página) | Sim: nenhum cliente fica com posição, recebimento e faturamento de leituras diferentes. Junto vem o C-06 | Atualizar **02 §CC_SINCRONIZACAO.FASE** para `PLANOS`, `CLIENTES`, `FECHAR`; corrigir o Fluxo do plan (C-10) |
| D-011 (passo com id 0 sem linha) | Sim: uma linha `PENDENTE` que nunca anda travaria o pipeline de 06 §2.3; o C-031 afirma o comportamento | 01 §11 decisão 4 comporta; vale deixar explícito "sem linha". Corrigir `plan.md:233` |
| D-012 (`PASSO_SITUACAO`, `PASSO_FIM`) | Sim: as colunas da leitura e do passo colidem na mesma linha | Atualizar **04 §1 `ccBaseSincronizacaoStatus`**; a 006 lê essa SF (04 §11, 006-3) |
| D-013 (Sérgio vê 7 no banco comum, 8 com Rita analista do 1003) | Sim: é o efeito do analista na visibilidade (01 §6) | Nenhuma mudança; a spec C-009 já usa o banco comum |

Divergências não registradas no plan: a regra "última leitura com erro → nova leitura" (C-07), a lista de funções de 06 §5 (O-05), a falta de `busca` na auditoria (O-06) e a falta de regra no contrato para alguém mudar o próprio cargo (C-02).
