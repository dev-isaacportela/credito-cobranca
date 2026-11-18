# Projeto: Crédito e Cobrança (Benenutri)

App que roda dentro da plataforma **Mitra**: React 19 + TypeScript + Vite 7 + Tailwind 4 no frontend;
backend composto por tabelas e Server Functions que vivem na plataforma, provisionadas pelos scripts de
`backend/` com `mitra-sdk`. Este clone é para **desenvolvimento local**: o backend é escrito aqui e
executado no sandbox do Mitra; o frontend roda aqui contra o simulador.

## Leia antes de escrever a primeira linha

1. `docs/constitution.md` — o processo.
2. `docs/contrato/` — o contrato entre os 7 módulos (nomes, tipos, SFs, quadros, seed e testes). Vale
   sobre o plano: divergência entre os dois se resolve pelo contrato e se anota.
3. A spec da feature: `docs/specs/NNN-slug/spec.md`, depois `plan.md`, depois `tasks.md`.

## Estrutura

```
frontend/                   React. Build SEMPRE daqui: cd frontend && npm run build
  src/lib/server-functions.ts  contrato NOMES + IDS das SFs (lib 8001–9032; 001 = 1000–1999 …; 01 §14)
backend/
  setup-backend.mjs           schema/NNN-*.mjs + parâmetros + modelos + BUs + feriados + topo da equipe
  add-001-kanban.mjs          motor de quadros (@benenutri/mitra-kanban) e ganchos ccPodeMover/ccPodeExcluir
  add-002-jdbc-winthor.mjs    conexão JDBC "WinThor" por nome
  add-0N0-<slug>.mjs          SFs de cada spec (exportam `definitions`)
  add-090-perfil-acesso.mjs   perfil único "Crédito e Cobrança" (por último; fora do PUBLISH_ORDER)
  schema/NNN-<slug>.mjs       DDL de cada spec (`export const DDL`)
  lib/                        regra e fragmentos compartilhados (escritas, guarda, visibilidade, tempo …)
  tests/*.test.mjs            regra pura (node --test)
  simulator/                  Mitra local em SQLite: executa as MESMAS definitions
    seed.mjs                  pipeline do banco em 11 passos (06 §2.3) — o mesmo do sim e dos smokes
    seed/000-elenco.mjs       usuários, equipe, referência e os ajudantes dia/diaUtil/nota/atribuir
    smoke/NNN-<slug>.mjs      testes de cada spec (smoke/base.mjs: teste, como, chamar, rodarCron …)
  migrations/                 GERADO PELO SISTEMA — não toque
docs/specs/                   spec.md (o quê) · plan.md (como) · tasks.md (ordem)
```

## Como rodar

```bash
cd backend && npm test            # tests/ (regra pura) + sim:check (o SQL roda?) + sim:smoke (o fluxo?)
cd backend && npm run sim         # simulador em http://localhost:3115 (relógio D = 2026-11-19T10:00:00)
cd backend && npm run sim:seed    # refaz o banco do simulador pelo pipeline
cd frontend && npm run dev        # app em http://localhost:5185 (sem VITE_MITRA_AUTH_URL entra no simulador)
cd frontend && npm run build      # obrigatório antes de subir
```

Cron à mão no simulador: `POST http://localhost:3115/sim/cron?nome=ccRotina`.

## Regras que quebram produção se ignoradas

1. **Não existe staging.** Com `VITE_MITRA_AUTH_URL` preenchido, toda Server Function chamada do
   `localhost` bate no banco de produção. Localmente, trabalhe no simulador.
2. **Nunca execute `setup-backend.mjs`, `add-*.mjs` ou qualquer escrita do `mitra-sdk` da máquina
   local.** O SDK é um cliente HTTP puro: rodar daqui aplica DDL/SF em produção **sem gerar migration**.
   Os scripts são escritos e commitados aqui; a execução acontece no sandbox da plataforma.
3. **Não crie, edite nem `git add` em `backend/migrations/` ou `migrations.yaml`.**
4. **`.env` nunca é commitado.** `.env.example` só com as chaves, vazias. Token no frontend é falha de
   segurança (toda `VITE_*` vai para o bundle).
5. **Alteração mínima.** Não mude tela, fluxo ou componente que não foi pedido.
6. **Commit sem assinatura de agente.** Nunca acrescente `Co-Authored-By: Claude …` nem outro trailer de IA.
7. **Sem teste não está pronto.** Cada cenário C-0NN e regra RN-0NN tem um `teste()` em
   `backend/simulator/smoke/NNN-<slug>.mjs` ou um `test()` em `backend/tests/` / `frontend/tests/`, com o
   id no título. `npm test` verde antes de marcar task ou publicar.
8. **Relógio único (01 §3).** Nada de `NOW()`, `CURDATE()`, `CURRENT_TIMESTAMP` nem `new Date()` solto em
   regra: `HOJE_SQL`/`AGORA_SQL` na SQL, `agora()`/`hoje()` na JS. Datas em `VARCHAR`.
9. **Mesmo texto SQL no MySQL e no SQLite.** Armadilhas em `docs/contrato/06-seed-testes.md` §5.

## Como o frontend fala com o backend

- Frontend importa **`mitra-interactions-sdk`**; nunca `mitra-sdk`. Usuário final é `business`: CRUD
  REST dá 403; toda leitura e escrita vai por Server Function.
- Parâmetro é **`input:`**. SF SQL recebe `{{nome}}` (`'{{nome}}'` para texto); `:VAR_USER` é quem chama.
- Retorno com **colunas em UPPERCASE**. Listagem paginada (`LIMIT/OFFSET`). Filtro desligado: `''` / `0`.
- Nome novo de SF: em `add-0N0-*.mjs` **e** nos dois blocos de `server-functions.ts` (id local da faixa
  da spec até o `sync:function-map` trazer o real).

## Como subir para o Mitra (01 §14, DT-39)

Publicação completa, no sandbox, nesta ordem:

```bash
cd backend
node setup-backend.mjs
node add-001-kanban.mjs
node add-002-jdbc-winthor.mjs
for f in add-010-*.mjs add-020-*.mjs add-030-*.mjs add-040-*.mjs add-050-*.mjs add-060-*.mjs add-070-*.mjs; do node "$f"; done   # 1ª passada: cria todas as SFs
for f in add-010-*.mjs add-020-*.mjs add-030-*.mjs add-040-*.mjs add-050-*.mjs add-060-*.mjs add-070-*.mjs; do node "$f"; done   # 2ª passada: injeta os ids de todas e remonta ccPodeMover
node add-001-kanban.mjs           # de novo: liga os ganchos (ccPodeMover/ccPodeExcluir já existem)
node add-090-perfil-acesso.mjs    # por último
node sync-server-function-map.mjs
```

A 2ª passada existe porque o id de SF é injetado na publicação: uma JS publicada antes da SF que ela
chama fica com id 0, e o `ccPodeMover` montado antes de um `lib/quadros/NNN` não tem o trecho dele.

**Publicação de uma spec só** (o prompt de sandbox de cada spec repete): publique a spec e republique o
`add-010` e toda spec já publicada que chama SF dela (hoje, o `add-040` depois do `add-050`); depois
`add-090` e `sync-server-function-map`.

**Confirmação no sandbox (T-002, S-01 a S-16): depois da publicação completa, antes de liberar.** Na
primeira subida, com todos os comandos acima já rodados (inclusive `add-090` e `sync-server-function-map`),
e **antes** de cadastrar a equipe além do topo e de divulgar o endereço do app:

```bash
cd backend && node sandbox/t002-confirmar.mjs   # só no sandbox; precisa de T002_BUSINESS_TOKEN (e T002_EMAIL) no .env
```

- Precisa de tudo publicado porque confere o caminho real: identidade (`:VAR_USER`) em chamada aninhada e
  nas `kb*`, `{{x}}` ligado como parâmetro ou texto, erro 1093 nas escritas, SF fora do perfil, perfil e
  passo `ACESSOS`, JDBC do Winthor por business e por cron, cron de 5 min, e-mail, upload e colunas do Winthor.
- `T002_BUSINESS_TOKEN`: token de sessão de um usuário **business**, membro ativo com a marca
  Administrador (o topo criado pelo `setup-backend`, logado no app). Só no `.env` do sandbox; nunca
  `VITE_*`, nunca commitado. `T002_EMAIL`: caixa que recebe o teste do S-11.
- Cria só `zzT002*`, `ZZ_T002`, `t002.*` em `CC_ESTADO` e o quadro `zz-t002`, e apaga tudo no fim.
- Imprime `S-nn · resultado · plano B`. Copie as linhas para "Depende do sandbox" do `plan.md` da 001.
  **Item que falhar: não libere.** Aplique o plano B da linha (01 §15; índice do contrato, 00 §5), suba de
  novo o que mudou nesta mesma ordem e rode o roteiro outra vez até não restar falha.

Fluxo git: `npm test` verde → `git fetch origin && git merge origin/main --no-edit` → **um** commit
(`tipo: descrição`, sem trailer de agente) + push → no chat do projeto no Mitra, pedir a sincronização e
os comandos acima → de volta aqui, `git pull` (migrations e mapa de ids).

## Antes de dizer que terminou

- [ ] `npm test` verde em `backend/` (tests + check + smoke) e em `frontend/`; todo cenário citado no título de um teste
- [ ] `npm run build` e `npm run lint` limpos em `frontend/`
- [ ] `backend/migrations/` intocado; `.env` fora do commit
- [ ] Divergência entre contrato e plano anotada
