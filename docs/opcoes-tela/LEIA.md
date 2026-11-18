# Opções de tela — como escrever o `telas.html` de um módulo

O usuário vai escolher, para **cada tela e cada aba** do sistema, uma entre
**3 opções** de layout. Cada módulo vira um artefato: a casca (`_casca/`) cuida
da navegação, do seletor A/B/C e do registro da escolha. O agente de design
escreve **só** dentro de `docs/opcoes-tela/NNN-slug/`: um `telas.html` ou, para não
gerar um arquivo gigante, vários `telas-01-<grupo>.html`, `telas-02-<grupo>.html`…
(a montagem junta todos em ordem alfabética).

## Formato

```html
<section data-tela="quadro-cobranca" data-grupo="Cobrança"
         data-titulo="Quadro de cobrança"
         data-desc="Onde o agente vê a carteira em atraso por etapa da régua e abre o cliente.">
  <template data-opcao="A" data-nome="Quadro por etapa" data-resumo="Colunas por etapa da régua; o cartão mostra atraso e próxima ação.">
    ...HTML da tela inteira (do cabeçalho da página para baixo)...
  </template>
  <template data-opcao="B" data-nome="Lista com prioridade" data-resumo="...">...</template>
  <template data-opcao="C" data-nome="Fila do dia + detalhe" data-resumo="...">...</template>
</section>
```

- `data-tela`: id único no módulo, só `a-z`, `0-9` e `-`. Aba de uma tela é uma
  `<section>` própria (ex.: `cobranca-visao-gerencial`, `cobranca-quadro`), com o
  mesmo `data-grupo` da tela-mãe e `data-titulo` "Cobrança · Quadro".
- `data-grupo`: agrupa na lista lateral (nome do menu).
- `data-desc`: uma frase: para quem é a tela e o que a pessoa resolve nela.
- Exatamente 3 `<template>`: `A`, `B`, `C`. `data-nome` em 2 a 4 palavras;
  `data-resumo` em uma frase dizendo **o que esta opção privilegia** (e o que custa).
- Sem `<script>` (não roda dentro de template). Interação só por `<details>` e
  pelas abas da casca: um contêiner `.com-abas` com botões
  `<button data-aba="x" aria-selected="true">` dentro de `.abas` e blocos
  `<div data-painel="x">` (os não selecionados com `hidden`).
- Ao fim do arquivo pode haver **um** `<style>` com classes próprias do módulo,
  prefixadas pelo slug curto (ex.: `.cob-...`), usando só tokens.

## As 3 opções têm de ser 3 ideias

Mesmo conteúdo e mesmas ações nas três; muda **a organização**: o que aparece
primeiro, quanta coisa cabe, quantos cliques até a ação principal. Exemplos de
eixos: quadro × lista × fila do dia; tudo numa página × mestre-detalhe × abas;
denso para quem opera o dia inteiro × arejado para quem consulta; números
primeiro × exceções primeiro. Trocar cor, ordem de colunas ou rótulo **não** é
outra opção. Cada opção precisa ser uma tela que daria para construir.

## Design system (obrigatório)

Invoque a skill `benenutri:design` (modo Construir) e leia o `design.md` dela
(§8 vocabulário, §9 padrões de tela, §12 gráficos, §14 anti-padrões). Os mockups
usam as classes de `_casca/ds.css` (cópia da vitrine do kit) e `_casca/mock.css`:

| Peça | Classes |
|---|---|
| Cabeçalho da página | `.page-header` (`.module`, `h3`, `.desc`, `.meta` com `.stat`) |
| Painel, barra de filtros, chips | `.panel`, `.toolbar`, `.search` + `.input`, `.select`, `.chips` + `.chip` |
| Tabela | `.tabela-wrap` > `table`; `th`/`td`, `.num`, `.row-title`, `.row-meta`, `.code`, `.dash` (travessão), `.acoes` + `.iconbtn`, `.pagination` |
| Estado | `.status` + `.status-live` / `.status-attention` / `.status-alert` / `.status-off` (com `<i></i>`), `.badge` + `-neutral`/`-accent`/`-attention`/`-alert`/`-outline` |
| Botões e campos | `.btn` + `.btn-primary`/`-secondary`/`-ghost`/`-danger`, `.btn-sm`, `.field` > `label` + `.input`, `.form-grade`, `.check` |
| Aviso | `.alert` + `.alert-default`/`-success`/`-warn`/`-error` |
| Quadro | `.quadro` (`.largo` para mais de 4 fases) > `section.fase` > `header` + `.pilha` > `article.cartao` |
| Indicadores e gráficos | `.kpis` > `.kpi` (`.rot`, `.valor`, `.hint`, `.delta`), `.bi` > `.painel-graf` (`header`, `.desenho` com SVG, `.legenda-graf`), `.barras` > `.barra`, `.empilhada`, `.calor` |
| Layout | `.grade-2/3/4`, `.lado` (`.invertido`, `.estreito`), `.pilha-v`, `.entre`, `.corpo-painel`, `.faixa`, `.abas`, `.ficha`, `.linha-tempo`, `.gaveta`, `.dialogo`, `.lista-itens`, `.semana`, `.organograma`, `.avatar`, `.progresso`, `.resumo`, `.rebaixado` |
| Ícones | `<svg><use href="#i-search"/></svg>`: `i-search`, `i-chevron`, `i-x`, `i-sliders`, `i-plus`, `i-pencil`, `i-trash`, `i-check`, `i-alert`, `i-info`, `i-users`, `i-cal`, `i-list`, `i-logout`, `i-sun`, `i-moon` |

Regras que reprovam (design.md §14): cor literal (hex, `rgb`, nome de cor) fora
dos tokens `var(--…)`; azul como acento; inativo em vermelho; zebra; selo
preenchido em célula de tabela (estado é `.status`); `0`/`R$ 0,00` onde o dado
não existe (use `<span class="dash">—</span>`); `<select>` nativo (use `.select`);
mais de um botão `.btn-primary` por tela; emoji; pizza; dois eixos Y; série de
gráfico com cor de estado (série usa `--data-1…8`; magnitude usa `--data-seq-1…4`).
**Quadro não tem arrastar e soltar**: o cartão muda de fase por "Mover para",
dentro do item aberto. Números alinhados à direita. Texto em português com acento.

## Quadros e card aberto são da lib `@benenutri/mitra-kanban`

Todo quadro do sistema usa os componentes da lib (ver `docs/arquitetura.md` §8 e o
`README.md` de `mitra-projects/mitra-kanban`; tela real de referência no
`mitra-projects/p-novo-sgc/frontend`). Isso **fixa** parte do desenho, e as 3 opções
não podem contrariar:

- **Quadro (`KanbanBoard`)**: cabeçalho numa linha (nome, contagem, ações), barra com
  busca, filtro por responsável, "Meus cards", "Atrasados", Ordenar, filtro por
  etiqueta e filtros de campo; colunas por fase numa faixa horizontal, altura fixa,
  pilha rolando por dentro, barra na cor da fase (`--data-N`). Cartão **só leitura**:
  etiquetas (selo), campos da capa, responsáveis, prazo relativo, mensagens novas e os
  três tempos (criação, na fase com fração do SLA, última alteração). Sem arrastar.
- **Card aberto (`CardDrawer`)**: três colunas. Esquerda: responsáveis, prazo, ficha do
  formulário inicial e histórico por passagem. Meio: abas "Nesta fase", "Chat",
  "Tarefas", "Anexos", "Alterações" + as abas do sistema. Direita: "Mover para" em
  botões, ações do sistema e Excluir. Grava ao sair do campo, sem botão Salvar.

O que **varia entre as opções** numa tela de quadro: quais campos vão na **capa do
cartão** (fixos e por fase, inclusive o campo Progresso em barras); o que o sistema
mostra **dentro de "Nesta fase"** (`conteudoDaFase`: ação da régua, checklist, proposta
de acordo, decisão); quais **abas extras** existem e como se organizam (Contatos e
promessas, Acordo, Títulos, Custos, Notas fiscais…); quais **ações extras** ficam na
coluna direita; quais filtros de campo sobem à barra; e a visão **Lista** que alterna
com o quadro. Faça o card aberto como tela própria (3 opções), separada do quadro.
Telas que não são quadro (painéis, listagens, cadastros, agenda) têm liberdade total
dentro do design system.

## Conteúdo

- Dados de exemplo **realistas da Benenutri** (distribuidora de nutrição clínica,
  enfermagem, medicamentos e estética): hospitais, clínicas, home care,
  secretarias de saúde, com CNPJ fictício, valores em R$ e datas de novembro de 2026.
  Mesmos clientes nas três opções de uma tela, para a comparação ser justa.
  Nada de "Lorem ipsum" nem "Cliente 1".
- Cada tela mostra o que a spec do módulo pede para ela: leia `docs/specs/NNN/spec.md`
  (cenários, RF, regras) e o mapa de telas do artefato original em
  `docs/estudo-artefato/D-telas-fichas-eventos.md`. Colunas, filtros, indicadores e
  ações reais; os números da política (dias da régua, alçadas, percentuais) corretos.
- Tela com ficha/painel lateral (cliente, proposta, processo) é uma tela própria,
  com suas 3 opções.

## Conferir

```bash
cd docs/opcoes-tela && node _casca/build.mjs NNN-slug
```

Gera `dist/NNN-slug.html` e acusa: tela sem as 3 opções, id repetido, `<script>`,
cor literal. Tem de sair sem nenhum `!`.
