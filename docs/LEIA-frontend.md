# Construção do frontend de uma spec (002 a 007)

Para quem constrói as telas de uma spec depois do marco M2 da 001. Leia antes: `CLAUDE.md` da raiz,
`docs/design.md` §8–§10 e §14 (vocabulário e anti-padrões), o `plan.md` da sua spec ("Superfície de
interação") e `docs/contrato/01-convencoes.md` §14 (costuras).

## Onde fica cada coisa

| Caminho | Dono | O que é |
|---|---|---|
| `frontend/src/App.tsx` | integrador | lista `MODULOS` (módulos entregues), rotas, guarda de sessão (`ccBaseSessao`), `KanbanProvider`, import dos `extensoes.ts` |
| `frontend/src/AdminLayout.tsx` | integrador | casca C: menu por função, faixa de posição desatualizada, `ICONES` permitidos no menu |
| `frontend/src/lib/server-functions.ts` | cada spec, só o seu bloco | mapa nome → id (você só acrescenta as suas linhas, com Edit) |
| `frontend/src/lib/mitra-api.ts` | integrador | `linhas(nome, input)` (SQL → linhas), `linha`, `acao(nome, input)` (JS → `{ ok, … }`), `comPadrao` |
| `frontend/src/lib/formato.ts` | integrador | `fmtData`, `fmtDataHora`, `moeda` |
| `frontend/src/lib/base/*.ts` | 001 (importe, não edite) | `menu.ts` (tipos `Modulo`, `RotaModulo`, `ItemMenu`, `MembroSessao`, `podeAdministrar`, `menuDoMembro`), `carteira.ts` (`CARTEIRAS`, `useCarteira(tela)`), `extensoes.ts`, `documento.ts`, `posicao.ts`, `equipe.ts`, `parametros.ts` (`formatarParametro`, `GRUPOS_PARAMETRO`), `dias-uteis.ts`, `auditoria.ts`, `arquivos.ts` (`validarArquivo`, `enviarArquivo`) |
| `frontend/src/components/page.tsx`, `ui/`, `Logo.tsx` | design system | o único vocabulário de tela |
| `frontend/src/modules/NNN-<slug>/` | sua spec | `index.ts`, telas, `extensoes.ts` |
| `frontend/src/lib/<slug>/*.ts` | sua spec | regra pura de tela (inclui o espelho `podeMover` do seu quadro) |
| `frontend/tests/NNN-<slug>.test.mjs` | sua spec | testes de regra de tela |

Faltou algo em `lib/base` ou na casca? Não contorne nem copie: descreva no relatório (arquivo, o que falta, por quê).

## Registrar o módulo e o menu

`frontend/src/modules/NNN-<slug>/index.ts`, no formato fixo de 01 §14:

```ts
import { lazy } from 'react';
import type { Modulo } from '@/lib/base/menu';

export const modulo: Modulo = {
  spec: '002-cobranca-privada',
  rotas: [{ caminho: '/cobranca/:carteira', tela: lazy(() => import('./QuadroCobranca')) }],
  menu: [{ grupo: 'OPERACAO', rotulo: 'Cobrança', caminho: '/cobranca/privada', icone: 'wallet', ordem: 40,
           pode: (m) => m.cargo !== 'JURIDICO' }],
};
```

- Grupos: só `OPERACAO`, `CADASTROS`, `ADMINISTRACAO`. Ordem sugerida em Operação (mockup da casca C):
  Painel 10 · Minha agenda 20 · Análise de crédito 30 · Cobrança 40 · Jurídico 50 · Histórico 60. A base usa
  Cadastros 10–40 (Clientes, Contatos, Equipe, Planos) e Administração 10–60; a 007 entra em Cadastros a partir de 50.
- `pode` só esconde o item; a permissão é do servidor. Administração: `pode: podeAdministrar` (de `menu.ts`).
- `icone`: nome kebab-case do lucide que esteja em `ICONES` de `AdminLayout.tsx` (`wallet`, `calendar-check`,
  `layout-dashboard`, `hand-coins`, `scale`, `gavel`, `history`, `book-open`, `file-text`, `list-checks`,
  `landmark`, `chart-column`, `shield-check`…). Fora da lista vira um círculo; peça o ícone no relatório.
- A tela tem o default export (`export default function QuadroCobranca()`), por causa do `lazy`.
- O módulo só aparece quando o integrador acrescenta `import { modulo as cobranca } from '@/modules/002-cobranca-privada'`
  e o põe em `MODULOS` no `App.tsx`. Não edite o `App.tsx`: diga no relatório que o módulo está pronto.
- Item de menu sem rota cai na tela "ainda não entregue" da casca: dá para registrar o menu antes da tela.

Na tela, o membro logado vem da casca: `const membro = useOutletContext<MembroSessao>()`
(`react-router-dom`). Use para **desabilitar** (não esconder) botão sem permissão. Carteira como aba dentro
da tela: `const [carteira, setCarteira] = useCarteira('cobranca')` e as abas de `CARTEIRAS`.

## Estender o card de um quadro (01 §14, D-05)

A tela do quadro é uma só por processo (002 cobrança, 004 concessão). Quem acrescenta abas, ações, conteúdo
de fase ou regra de mover registra em `frontend/src/modules/NNN-<slug>/extensoes.ts`:

```ts
import { registrarExtensao } from '@/lib/base/extensoes';
registrarExtensao('cobranca-publica', {
  abasExtras: [{ id: 'nf', rotulo: 'Notas fiscais', render: (ctx) => <AbaNotas {...ctx} /> }],
  acoesExtras: [(ctx) => <AcaoProtocolo {...ctx} />],
  conteudoDaFase: (ctx) => (ctx.card.faseId === X ? <Bloco /> : null),
  podeMover: (card, fase, estrutura) => motivoDoPublico(card, fase, estrutura),   // espelho do gancho() da spec
});
```

Com JSX o arquivo é `extensoes.tsx` (o import `@/modules/NNN-<slug>/extensoes` resolve os dois).
A tela dona monta tudo combinado: `<KanbanBoard slug={slug} {...extensoesDoQuadro(slug)} … />`
(`extensoesDoQuadro` de `lib/base/extensoes.ts`; `extensoesDe(slug)` devolve as listas cruas). Combinação:
abas e ações na ordem de registro (dona primeiro), blocos de fase de todos ignorando `null`, `podeMover` = a
primeira mensagem não nula. Nenhum módulo importa componente de outro. O `api` da lib já está no
`KanbanProvider` do `App` (com `enviarArquivo`): não crie outro.

**Diferença do contrato:** em 01 §14 `acoesExtras` é `AcaoExtra[]`; a lib 1.14.0 não tem esse tipo e recebe
uma função `(ctx) => ReactNode`. Aqui `AcaoExtra = (ctx) => ReactNode`, e cada registro passa uma lista delas.

## Dados

- Só `linhas`/`linha`/`acao` de `@/lib/mitra-api` (nunca `mitra-sdk`, nunca CRUD REST; o lint barra).
  Parâmetro é o objeto `input`; colunas voltam em MAIÚSCULA; filtro desligado = `''` ou `0` (todos os campos
  presentes: use `comPadrao`).
- Recusa de JS é `{ ok: false, error }`: mostre em `Alert` no fluxo da tela, não some sozinho (sem toast).
- Nenhuma tela relê sozinha (RNF-004); busca com espera de 400 ms; ao abrir, `Promise.allSettled`.
- Anexo fora do card: `validarArquivo` antes, `enviarArquivo(file)` → endereço, depois a SF que registra;
  avise "arquivo em endereço público".
- Datas: `fmtData`/`fmtDataHora`; dia útil: `lib/base/dias-uteis.ts` com os feriados de `ccBaseFeriadoListar`.
  Nada de `new Date()` em regra (relógio único, CLAUDE.md regra 8).

## Visual

- Tela não escreve classe Tailwind solta: só nomes de `components/page.tsx` (`PageHeader`, `Panel`, `Toolbar`,
  `SelectMenu`, `Table`/`Th`/`Td`, `Status`, `Code`, `Dash`, `Pagination`, `Alert`, `EmptyState`, `Dialog…`,
  `Kpi`, `PainelGrafico`…). Faltou um nome? Reporte; não crie classe na tela.
- Cor só por token; nada de `dark:` na tela; tema claro e escuro saem de graça se você seguir o vocabulário.
- Ausências deliberadas: sem lib de formulário, sem toast, sem drag-and-drop, sem date picker
  (`<input type="date">`), sem `<select>` nativo (`SelectMenu`), sem estado global.
- Mockup da sua opção: `docs/opcoes-tela/NNN-<slug>/telas-*.html`, no `<template data-opcao>` escolhido em
  `docs/opcoes-tela/escolhas.md`.

## Testar regra de tela

Regra que precisa de teste sai do componente para `frontend/src/lib/<slug>/*.ts` (função pura) e ganha
`test('C-0NN: …')` em `frontend/tests/NNN-<slug>.test.mjs` (`node:test` + `node:assert/strict`, id no título).
O Node importa `.ts` direto: no arquivo testado use import **relativo com extensão** (`'../base/menu.ts'`),
não `@/` (o Node não conhece o alias); tipo entra com `import type`. Modelo: `frontend/tests/001-base.test.mjs`.

```bash
cd frontend && npm test && npm run build && npm run lint     # os três limpos antes de dizer que terminou
```

## Conferir no navegador

```bash
cd backend && npm run sim      # simulador na 3115 (relógio D = 2026-11-19T10:00:00); sem banco, monta pelo pipeline
cd frontend && npm run dev     # app na 5185 (sem VITE_MITRA_AUTH_URL entra no simulador)
```

No navegador embutido (`mcp__Claude_Browser__preview_start` com `name` `simulador` e `frontend`, de
`.claude/launch.json`): entre em `/entrar` com `<login>@benenutri.local` e a senha `mitra123`. Elenco
(06 §2.1): `gustavo` (Gerente), `nara` (Agente + Administrador), `ana`, `bruno`, `carlos` (Agentes), `sergio`,
`silvia` (Supervisores), `diana` (Diretoria), `julia` (Jurídico), `rita` (Analista), `otavio` (inativo) e
`visitante` (sem vínculo: cartão "Seu acesso ainda não foi liberado"). Confira os dois temas (botão Sol/Lua no
rodapé do menu) e a largura de celular. Ao terminar, `preview_stop` nos dois servidores.

Se o simulador cair ao montar o banco, o defeito é do backend de alguma spec: não conserte o backend;
reporte. Banco só com a 001 para destravar a tela: um script no seu scratchpad que chama
`montarBanco({ seeds: ['001'], arquivo: DB_PATH })` de `backend/simulator/seed.mjs`; apague
`backend/simulator/data/mitra-sim.db` ao terminar.

## O que não fazer

- Não editar `backend/`, `App.tsx`, `AdminLayout.tsx`, `lib/base/`, `components/` nem o bloco de outra spec em
  `server-functions.ts`.
- Não criar `.env` nem pôr token em `VITE_*`; com `VITE_MITRA_AUTH_URL` preenchido o localhost bate em produção.
- Não rodar `setup-backend.mjs`, `add-*.mjs` ou qualquer `mitra-sdk` daqui; não tocar em `backend/migrations/`.
- Não commitar (o orquestrador faz) e não deixar servidor rodando.
