# Validação — spec 006 · Painel consolidado

> Validador independente (fase 0b). Lidos por inteiro: `docs/specs/006-painel-consolidado/{spec,plan,tasks}.md`,
> `docs/constitution.md`, `docs/arquitetura.md`, `docs/execucao.md`, `docs/templates/`, os relatórios do
> artefato (00-visao-geral, C, D) e os contratos da 001/002/003/004/005 que o painel lê.
> Nada foi corrigido; este arquivo só relata.
>
> **Resultado: 3 BLOQUEIA · 11 CORRIGIR · 6 OBSERVAÇÃO.** É a spec com a melhor disciplina de teste (banco
> isolado, ordem explícita, todos os números fecham). Os bloqueios são de fronteira: um nome de SF já usado
> pela 002, dados que a 001 não grava e três SFs de resumo que as outras specs não publicam.

## 1. Checklist do Fluxo A (mitra-escopo) e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack/tabela/SF/componente | ok | Só nomes de chave de parâmetro aparecem (O-6) |
| Todo RF com critério verificável | ok | 26 RF com critério |
| Cenário de erro | ok | Perfil sem acesso, mês sem fotografia, fechamento duplicado |
| Fora de escopo | ok | Presente (linha 390); faltam os itens órfãos entre 004 e 006 (§2) |
| Seção Testes: linha por C/RN com entrada e resultado | ok | 24 C + 21 RN com números |
| Plan: Constitution Check | ok | |
| Plan: contratos de SF | **não** | `ccPainelAgentes` colide com SF da 002 (B-1); prefixo e tipos ok |
| Toda listagem com LIMIT/OFFSET + `…Total` | parcial | `ccFechamentoListar/Total` ok; listagens curtas (agentes, planos, equipe) sem LIMIT (O-4) |
| Plan: seção Simulador | ok | Tabela de seed C1…C10 e banco isolado (D-014); seed da faixa de outubro incoerente (O-1) |
| Plan: mapa de testes | ok | |
| Tasks: uma task por teste | ok | |
| Rastreabilidade RF → task → teste | ok | Sem buraco encontrado; C-014 e C-023 dependem de SFs inexistentes (B-3) |
| `[NEEDS CLARIFICATION]` | parcial | NC-1 a NC-3; NC-1 não é construível hoje (§6) |

### Contas refeitas (todas conferem)

| Linha | Entrada (seed C1…C10) | Conta | Esperado | Veredito |
|---|---|---|---|---|
| Posição | a vencer 70.000; vencido 24.000 | carteira 94.000; inadimplência 24.000/94.000 = 25,53%; > 90 dias 12.000 = 12,77% | idem | certo |
| PDD por título | faixas × 0,5 / 3 / 10 / 30 / 50 / 100% | 350 + 120 + 300 + 1.500 + 4.000 + 4.000 = 10.270 (10,93%) | 10.270 | certo — por cliente daria 10.340 (ver NC-1) |
| Outubro | fotografia de 31/10 | carteira 98.000; vencido 28.000; PDD 5.720 | idem | certo |
| C-011 | inadimplência gerada e recuperada em novembro | gerada 3.000 (C1 2.000 + C4 1.000); recuperado 5.000; ajustes 2.000; recuperado/gerado = 166,67%; outubro estimado 4.000 | idem | certo |
| Roll rate | migração entre faixas out → nov | 15/35 = 42,86%; 10/13 = 76,92%; 5/8 = 62,50% | idem | certo |
| Saúde | três grupos de clientes | 1/20, 3/19, 4/55 (com 96%: 2/26) | idem | certo |
| C-015 | solicitações S1…S4 e promessas | ciclo 26/3 = 8,67 dias; aprovado 86.300; 5/31 = 16,13%; 2 de 3 promessas cumpridas; exposição 94.000; limite 176.300 | idem | certo (o SLA depende da definição de prazo — C-1) |
| C-016 / C-021 | série de 12 meses | 28,57% no mês; média 28,03% | idem | certo |
| C-018 | concentração | HHI = 2.187,5 (entre 1.500 e 2.500 → moderada) | idem | certo |
| C-019 / C-020 | Top devedores e soma por BU | 48.000 (25%); soma 94.000 | idem | certo |
| C-022 | meta de recuperação | 20.833,33; 16,28%; 28% | idem | certo |
| RN-003 | PDD com parâmetro alterado | 650 / 10.570 | idem | certo |
| Agentes | carteiras | Ana 17/7; Sara 52/12; Caio 42/12; Estética 8/4 | idem | certo |

## 2. Cobertura contra o artefato

**O que o artefato faz e a 006 não cobre nem declara fora de escopo**

| Item do artefato | Situação |
|---|---|
| Concentração da carteira de limites (Top 10, HHI, por grupo), mostradores de flexibilização com meta 30% / 90%, PMR, revisão de limites vencidos, carteira por BU do crédito | órfãos — a 004 também não assume |
| Pontos de atenção: certidões vencendo, clientes críticos, validade vencida, preventiva/régua pendente, "a bloquear no ERP", cartas de anuência, comitê aguardando | ausentes do RF-005 |
| Linha de alerta do índice de inadimplência (`inadIdxAlerta` 10%, chave no catálogo da 001) | não usada |
| Filtro por agente e por ramo | ausente (O-3) |
| Alerta de certidão "no painel" prometido pela 005 RF-032 | não listado |

**Números da política:** percentuais de PDD (0,5 / 3 / 10 / 30 / 50 / 100), cortes de HHI (1.500 / 2.500) e
faixas de aging conferem com D. Divergência só em **nomes de chave** (`saudeDiasRisco` aqui × `saudeRiscoDias`
na 004; nomes fora do Anexo A da 001) (C-10).

**Defeitos conhecidos do artefato — todos corrigidos**

| Defeito | Na 006 |
|---|---|
| Fotografia de aging feita quando alguém abria a tela | corrigido — cron com data |
| Inadimplência gerada estimada por diferença | corrigido — pelo fluxo real (com estimativa só para o passado sem fotografia) |
| "Cobrado" sem histórico | corrigido |
| Indicadores decorativos | corrigido — 12 indicadores reais |

## 3. Conformidade

**Constitution**

| Princípio | Situação |
|---|---|
| II. Política como parâmetro | ok nos valores; chaves fora do catálogo da 001 (C-10) |
| III. Regra no servidor, identidade por `:VAR_USER` | ok; a visibilidade é reimplementada com joins fixos (D-006) em vez do fragmento da 001 (C-3) |
| IV. Winthor só leitura | ok — painel só lê |
| V. Auditoria em toda escrita | Fechamento auditado; fotografia não auditada com justificativa (D-012) — aceitável (O-5) |
| VI. Testes obrigatórios | ok — banco isolado `seedPainel()` e ordem explícita |

**Arquitetura**

- **Dono de tabela:** lê tabelas das outras specs, grava só `CC_FOTO_AGING` e `CC_FECHAMENTO` — correto. Mas o
  DDL vai em `setup-backend.mjs` e o seed/smoke em arquivos compartilhados; a 006 roda em paralelo com a 007 (C-8).
- **Segmento:** o painel separa público/privado por `CC_BU.SEGMENTO` e semeia uma BU "Governo" pública; a 001
  (RN-018) define público por `CC_CLIENTE.SETOR='PUBLICO'` e não tem essa BU (C-2).
- **Nomes de coluna:** lê `RATING`/`RATING_PUB` e criticidade onde a 004 grava `RATING_CONCESSAO` e
  `CC_RISCO_CLIENTE` (C-11).

**Armadilhas da plataforma**

- **300 SF/min (ponto crítico pedido):** até 8 chamadas por aba e sem polling — dentro do teto para um usuário.
  Abrir todas as abas custa cerca de 20 chamadas; cinco gestores trocando filtro ao mesmo tempo chegam perto de
  100/min. Se as SFs de resumo pedidas à 002/003/005 forem JAVASCRIPT chamando SQL por id, a conta real é maior.
  Falta no plan: cache no cliente por (aba, filtros) e debounce do filtro (O-2).
- **SQL que o simulador não roda:** `ccPainelSerie` e `ccPainelPosicao` são uma única SQL muito grande, com CTE.
  O SQLite aceita `WITH`, mas o plan não garante MySQL 8 nem mede o tempo contra o limite de 60 s (C-4).
- `{{param}}`: valores desligados declarados.
- Cron `0 10 * * * *` de 6 campos: ok.

## 4. Viabilidade do backend

1. **Colisão de nome (B-1).** A 002 já tem `ccPainelAgentes` (e também `ccPainelKpis`, `ccPainelBu`,
   `ccPainelAging`, `ccPainelTopDevedores`). Duas SFs com o mesmo nome no mesmo projeto: a segunda publicação
   sobrescreve a primeira ou falha.
2. **Dado que não existe (B-2).** Todo o aging e a PDD assumem as faixas por título (`V_1_30` … `V_180`) em
   `CC_POSICAO_CLIENTE`; a 001 só grava `VENCIDO`, `A_VENCER` e `DIAS_ATRASO` do título mais antigo. Também
   faltam `CC_FATURAMENTO_MES` (índice de inadimplência sobre faturamento) e `CC_PLANO`/`CODPLPAG` (a 001 tem
   `PLANO_COD/PLANO_NOME/PLANO_PRAZO_MEDIO` em `CC_CLIENTE`).
3. **SFs de resumo inexistentes (B-3).** O plan pede `ccAgendaResumo` (002), `ccJuridicoResumo` (003) e
   `ccNfPublicaResumo` (005). O que existe: `ccAgendaMontar`; `ccProcessoKpis`, `ccJuridicoIndicadores`,
   `ccJuridicoAlertas`; `ccNfPubKpis(hoje, buId)`. C-014 e C-023 nunca ficam verdes.
4. **"Prazo" indefinido (C-1).** A RN-020 mede SLA contra um prazo que não é coluna de `CC_SOLICITACAO`; o seed
   usa prazos de 10, 10, 11 e 2 dias sem regra. Pela soma dos SLAs das etapas do artefato (12/11 dias), o SLA de
   C-015 seria 100%, não 66,67%.
5. **Série histórica cara (C-4).** Recalcular gerada/recuperado de cada mês passado a cada abertura é o que
   torna a SQL gigante. Guardar por cliente, na fotografia, `VENCIDO_INICIAL`, `GERADA` e `RECUPERADO` transforma
   os meses passados em `SUM` simples.
6. **Saúde calculada duas vezes (C-6).** A 004 grava `CC_RISCO_CLIENTE.SAUDE`; a 006 recalcula em SQL com outra
   chave de parâmetro e outro universo de clientes — dois números diferentes na mesma tela.
7. **Recebimento estornado (C-7).** O "recuperado" não exclui `CC_RECEBIMENTO.ESTORNADO`.
8. Sem dependência circular: a 006 só lê e é a última fase (B4).

## 5. Lista de achados

### BLOQUEIA

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| B-1 | `plan.md` §Contratos | `ccPainelAgentes` já existe na 002, que também tem outras quatro `ccPainel*` | Renomear as SFs da 006 com domínio próprio (ex.: `ccConsolidado…`) ou combinar com a 002 a reutilização |
| B-2 | `plan.md` §Modelo de dados, §Pedidos a outras specs | Faixas de aging por título, faturamento mensal e cadastro de planos não existem na 001 | Fechar com a 001 a gravação das faixas `V_1_30…V_180` e do faturamento mensal na leitura do Winthor; ler o plano de `CC_CLIENTE.PLANO_*` |
| B-3 | `plan.md` §Pedidos a outras specs; `spec.md` C-014, C-023 | `ccAgendaResumo`, `ccJuridicoResumo`, `ccNfPublicaResumo` não existem nas specs donas | Usar as SFs que existem (`ccAgendaMontar`, `ccProcessoKpis`/`ccJuridicoAlertas`, `ccNfPubKpis`) ou obter das três specs o compromisso de publicar os resumos |

### CORRIGIR

| # | Arquivo · seção | Achado | Correção |
|---|---|---|---|
| C-1 | `spec.md` RN-020, C-015; `plan.md` §Simulador | "Prazo" da solicitação indefinido e seed sem regra | Definir prazo = soma dos SLAs das etapas e alinhar "decidida/aprovação/ciclo" com a 004 RN-031 |
| C-2 | `plan.md` §Modelo de dados, §Simulador | Segmento por `CC_BU.SEGMENTO` e BU "Governo" inexistente na 001 | Seguir a 001 RN-018 (`SETOR='PUBLICO'`) |
| C-3 | `plan.md` D-006 | Visibilidade por joins fixos duplica o fragmento da 001 | Usar o fragmento de `lib/visibilidade.mjs` |
| C-4 | `plan.md` §Contratos (`ccPainelSerie`, `ccPainelPosicao`) | SQL única muito grande, sem garantia de MySQL 8 nem de tempo | Gravar `VENCIDO_INICIAL/GERADA/RECUPERADO` por cliente na fotografia e somar |
| C-5 | `spec.md` RF-005, §Fora de escopo | Itens órfãos entre 004 e 006, pontos de atenção ausentes e `inadIdxAlerta` não usado | Assumir na 006 ou declarar fora de escopo, um a um |
| C-6 | `plan.md` `ccPainelSaude` | Saúde recalculada com chave e universo diferentes dos da 004 | Ler `CC_RISCO_CLIENTE.SAUDE` |
| C-7 | `plan.md` §Contratos (recuperado) | Não exclui recebimento estornado | Filtrar `ESTORNADO = 0` |
| C-8 | `plan.md` §Contexto técnico; `tasks.md` | DDL em `setup-backend.mjs` e seed/smoke/rotas em arquivos compartilhados | Usar as costuras por módulo de `docs/execucao.md` |
| C-9 | `plan.md` §Simulador | Elenco (Ana, Sara, Caio, gerente) conflita com o da 001/004/005/007 | Usar o elenco da 001 dentro do banco isolado |
| C-10 | `spec.md` Regras; `plan.md` | Chaves de parâmetro fora do catálogo da 001 (`saudeDiasRisco` etc.) | Usar os nomes do Anexo A e pedir as novas à 001 |
| C-11 | `plan.md` §Contratos | Lê `RATING`/`RATING_PUB` e criticidade em colunas que a 004/005 não têm | Ler `RATING_CONCESSAO`, `CC_RISCO_CLIENTE` e `CC_ANALISE_ORGAO` |

### OBSERVAÇÃO

| # | Arquivo · seção | Achado | Sugestão |
|---|---|---|---|
| O-1 | `plan.md` §Simulador (tabela C1…C10) | Dias de atraso de hoje não fecham com a faixa de 31/10: C2 com 75 dias tinha 61 (faixa 61–90, não 31–60); C5 com 120 tinha 106 (91–180); C6 com 200 tinha 186 (> 180) | Usar C2 entre 61 e 74, C5 entre 91 e 104, C6 entre 181 e 194 dias |
| O-2 | `plan.md` §Riscos | 300 SF/min sem cache nem debounce | Cache no cliente por (aba, filtros) e debounce do filtro |
| O-3 | `spec.md` filtros | Sem filtro por agente e por ramo | Declarar fora de escopo |
| O-4 | `plan.md` §Contratos | Listagens curtas sem LIMIT | Pôr um LIMIT de segurança |
| O-5 | `plan.md` D-012 | Fotografia não auditada | Justificativa aceitável; manter |
| O-6 | `spec.md` Regras | Nomes de chave de parâmetro na spec | Citar pelo rótulo de negócio |

## 6. Perguntas ao gestor

| Pendência | Pergunta | Padrão provisório do plan | Seguro para construir já? |
|---|---|---|---|
| NC-1 | PDD por título ou pelo atraso mais antigo do cliente | Por título (os testes esperam 10.270) | **Não é construível hoje**: a 001 não grava as faixas por título. Recomendo manter "por título" e a 001 incluir as colunas; por cliente daria 10.340 e mudaria todos os asserts de PDD |
| NC-2 | Parcela de acordo paga em dia conta como recuperado | Não conta | Sim — só o predicado muda depois; pode subestimar a recuperação |
| NC-3 | Analista de crédito vê o painel | Não vê | Sim — restritivo |
