# Construção do backend de uma spec (fases B2 a B4)

Instruções comuns aos construtores das specs 002 a 007. Cada construtor cuida de **uma** spec.
A base (001) já está pronta e verde: `cd backend && npm test` passa (regra pura, `sim:check`, smoke
`000-esqueleto` e `001-base`).

## Seu escopo

A trilha **Backend** do `docs/specs/NNN-<sua spec>/tasks.md`: schema, parâmetros, modelos, quadros,
Server Functions, seed, smoke e a verificação do backend. **Não** escreva frontend.

Arquivos que são seus (costuras de 01 §14), e só eles você cria ou reescreve:

- `backend/add-0N0-<slug>.mjs`
- `backend/schema/NNN-<slug>.mjs`
- `backend/lib/parametros/NNN-<slug>.mjs`, `backend/lib/modelos/NNN-<slug>.mjs`,
  `backend/lib/quadros/NNN-<slug>.mjs`, `backend/lib/<sua pasta>/` (se o plano criar)
- `backend/simulator/seed/NNN-<slug>.mjs`, `backend/simulator/smoke/NNN-<slug>.mjs`
- `backend/tests/NNN-*.test.mjs`

Arquivos **compartilhados** — mexa só no seu pedaço e **só com a ferramenta Edit** (nunca `Write`,
`sed`, `python` ou outro script que reescreva o arquivo inteiro). Outro construtor pode estar editando o
mesmo arquivo ao mesmo tempo; a Edit recusa se o arquivo mudou desde a sua leitura — nesse caso leia de
novo e refaça a edição:

- `frontend/src/lib/server-functions.ts`: acrescente as SFs da sua spec nos **dois** blocos
  (`SERVER_FUNCTION_NAMES` e `SERVER_FUNCTIONS`), na faixa de ids da sua spec (01 §14: 002 = 2000–2999,
  003 = 3000–3999 …). O simulador resolve chamada por id a partir daqui.
- `backend/simulator/config.mjs`: só as chaves da sua spec em `CHECK_INPUT`.

Arquivos da base (`backend/lib/*.mjs` fora da sua pasta, `add-010-base.mjs`, `simulator/seed.mjs`,
`simulator/seed/000-elenco.mjs`, `simulator/smoke/base.mjs`, `runtime.mjs`): **não edite**. Se precisar de
algo que falta ou achar um defeito neles, não contorne: descreva no relatório (arquivo, o que falta, por
quê) e siga com o resto. O orquestrador decide.

## Leia primeiro

1. `CLAUDE.md` da raiz (regras que quebram produção, relógio único, mesmo SQL nos dois bancos, colunas
   em MAIÚSCULA, toda escrita auditada).
2. A skill da plataforma, direto do arquivo:
   `C:/Users/Isaac Portela/.claude/plugins/cache/benenutri/benenutri/0.10.0/skills/mitra-escopo/SKILL.md`
   e as referências que ela aponta. A lib de quadros:
   `D:/Documentos/Documentos/PROJETOS/mitra-projects/mitra-kanban/README.md`.
3. O contrato `docs/contrato/` 00 a 06, com as respostas e correções já incorporadas
   (`pedidos/00-respostas.md`, `01-correcoes-v2.md`). Vale sobre o plano; divergência se anota.
4. `docs/specs/NNN-<sua spec>/spec.md`, `plan.md`, `tasks.md`.
5. O código da base como exemplo do padrão: `backend/add-010-base.mjs` (definitions, preâmbulo JS,
   guardas `ccEsc…`, publicação em duas passadas), `backend/simulator/seed/001-base.mjs`,
   `backend/simulator/smoke/001-base.mjs` (`teste`, `como`, `chamar`, `chamarComo`, `nasDuasSessoes`,
   `rodarCron`, `QUADROS_TESTE`, contador de execuções). O relatório da base está em `docs/execucao.md`
   (entradas "B1a" e "B1b"): use as convenções que ele descreve (ids pelo mapa `__CC_IDS__` com
   `idDe('nome')`; passos da rotina recebem `{sincronizacaoId, orcamentoExec, orcamentoMs, membroId: 0}`
   e devolvem `{ok, pendentes, execucoes, processados}`; `ccEmailEnviar`; posição em três tabelas; seed
   com `winthor()`, `ATRIBUICAO`, `passado()`, `dominio()`, `bancoDoSeed()`, `chamarComo()`).

## Regras obrigatórias

- **Nada contra a plataforma.** Não execute `setup-backend.mjs`, nenhum `add-*.mjs`, nada do mitra-sdk,
  nada com token. Não crie `.env`. Nada de token em `VITE_*`.
- Não crie nem edite `backend/migrations/` nem `migrations.yaml`.
- **Não faça commit.** Não deixe servidor rodando ao terminar.
- Relógio único; mesmo texto SQL no MySQL e no SQLite (06 §5); datas `VARCHAR`; colunas de retorno em
  MAIÚSCULA; guarda na SQL da `ccEsc…`; identidade pela sessão ou pelo `membroId` de quem chama (DT-34),
  nunca vinda da tela; leitura SQL com `EU` nunca chamada aninhada.
- Orçamento (DT-29): até 20 execuções por clique (`ccJurDossieEnviar` até 30); abrir tela até 6 por bloco
  + 1 por módulo que estende o card. Os testes que afirmam orçamento usam o contador do simulador.
- Teste que depende de outra spec ainda não construída: `pular('depende de NNN')`, nunca dublê que
  finge a outra spec. Teste que depende de spec **já** construída roda de verdade.
- Seus testes não podem quebrar os das outras specs: rode `npm test` inteiro, não só o seu smoke.
- Código simples, sem abstração que o contrato não pede.

## Pronto quando

- `cd backend && npm test` verde **inteiro** (regra pura, `sim:check`, todos os smokes existentes).
- Todo cenário (C-NNN) e regra (RN-NNN) da spec tem `teste()` com o id no título; os `pular` são só os
  que dependem de spec ainda não construída.
- Nomes, entradas e saídas das SFs da sua spec iguais em `add-0N0`, `server-functions.ts` e 04.

## Relate no fim (poucas linhas)

Tarefas feitas; saída resumida do `npm test` (contagens por smoke); testes pulados e de qual spec
dependem; divergências entre contrato e plano e como resolveu; o que falta ou está errado nos arquivos
da base (se algo); o que as specs seguintes precisam saber para chamar as suas SFs.
