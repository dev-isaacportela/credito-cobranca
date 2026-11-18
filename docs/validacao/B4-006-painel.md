# B4 · 006-painel-consolidado: validação independente do backend

**Data:** 2026-11-17 · **Escopo:** backend da spec 006. As specs 002 a 005 entram só como donas dos dados que o painel cruza. A 007 fica fora.

**Leu:**
- `CLAUDE.md`, `docs/LEIA-construcao.md` e a skill `mitra-escopo` 0.10.0.
- Contrato: `00`, `01`, `02` §006, `03` §8 e §13 (`meta.*`, `painel.*`), `04` §0, §6 e §9, `06` §5.
- Pedidos: `pedidos/01-correcoes-v2.md` (DT-29, DT-33, DT-34, DT-42 e a seção 006) e `pedidos/02-pos-construcao.md` §006.
- `docs/arquitetura.md` §7 (D-08, D-09) e `docs/specs/006-painel-consolidado/{spec,plan,tasks}.md`.
- Relatórios-modelo: `B2-002` e `B3-005`.

**Código lido:**
- Da 006: `backend/add-060-painel-consolidado.mjs`, `schema/006-*`, `lib/painel-consolidado/{base,calculo}.mjs`, `lib/parametros/006-*`, `simulator/seed/006-*`, `simulator/smoke/006-*`, `tests/006-*` e o bloco 6xxx de `frontend/src/lib/server-functions.ts`.
- Da base e das donas, para comparar:
  - base: `lib/{visibilidade,guarda,escritas,parametros}.mjs`, `add-010` (passo `FOTO`, `ccBaseParametroSalvar`) e `add-090` (`FORA_DO_PERFIL`);
  - donas: `add-020` (bloqueio, acordo quebrado), `add-030` (`ACORDOS_A_RECEBER` e D-08) e `add-040` (`ccCredSaudeResumo`, validade, prazo).

**Rodou:** `npm test` estava verde na entrega (88 regra, 119 SQL, smoke 370 ok) e não foi repetido. Rodou também três sondas descartáveis no scratchpad, cada uma num banco temporário do pipeline com o seed 006 e o relógio 2026-11-14T10:00:
- `p006a`: vazamento, internas e Jurídico com a marca;
- `p006b`: vigência retroativa da PDD;
- `p006perf`: volume, com 20.010 clientes, 240.120 linhas de foto (12 meses), 20.010 recebimentos e a rotina da foto em cron.

Nada foi gravado no repositório além deste relatório. Nada rodou contra a plataforma.

**Conferido e conforme:**
- **SFs:** 15 públicas e 2 internas com os nomes de 04 §6, nos dois blocos de `server-functions.ts` (6001–6015 e 6051–6052). `ccPainelRotina` está em `FORA_DO_PERFIL` e no passo `FOTO` do `add-010`.
  - Entradas iguais às de 04 §6.
  - Saídas iguais ou aditivas (`DECIDIDAS`, `foraDoPrazo`, `A_VENCER` em Planos).
  - Nenhuma SF da 006 chama SF de outro módulo: os três resumos vão pela tela (DT-34).
- **Tabelas:** `CC_FOTO_AGING` e `CC_FECHAMENTO` com colunas, tipos, nulos, padrões, `UQ` e `IX` de 02 §006.
- **Parâmetros:** as 8 chaves de 03 §13 com os padrões 5, 2, 3, 80, 10, 1500, 2500 e 30. `PERCENTUAL` já limita a 0–100. `hhiModerado < hhiAlto` está em `validarConjunto`.
- **Relógio e dialeto:** nenhum `NOW()`, `CURDATE()` ou `new Date()` em regra. Mês corrente por `hoje()` / `HOJE_SQL`. Datas em `VARCHAR`. Sem `ROW_NUMBER`, `WITH` ou `ON DUPLICATE`. Divisões com `* 1.0` ou `CAST … DECIMAL` (o simulador traduz para `REAL`). Booleano nunca somado.
  - `GROUP BY` compatível com `ONLY_FULL_GROUP_BY` em todas as SQL e nas `ler()` das JS.
  - Colunas de retorno das SQL-L em maiúscula.
- **Números:** os de C-001 a C-026 batem com a spec no banco A, conferidos pelos asserts e revistos contra a regra:
  - aging por título;
  - PDD por carteira e vigência;
  - gerada linha a linha, `max(0, final − inicial + recuperado)`;
  - roll rate pela foto anterior;
  - HHI;
  - conversão = recuperado ÷ (inicial + gerada);
  - promessas pela `DATA_PROMETIDA`.
- **Contra as donas (banco B):**
  - saúde = `ccCredSaudeResumo`, com o mesmo universo e a mesma carteira (`S.CARTEIRA`);
  - vencido e PDD = `ccCobPainelKpis` / `ccCobPainelAging` (R-05);
  - bloqueio pendente = o `PENDENTE` da 002 (`DEVIDO <> APLICADO`);
  - acordo quebrado pela `ENCERRADO_EM`, como a 002;
  - limite vencido e solicitação fora do prazo com o mesmo corte da 004.
- **Foto × ao vivo:** sem dupla contagem.
  - `linhasDoMes` = foto `UNION ALL` ramo ao vivo só quando o mês é o corrente. A série tira o mês corrente da foto. `fonteDoMes` escolhe uma fonte só.
  - A foto de M é tirada na leitura de M+1 e nunca coincide com o mês corrente.
- **D-08:** o painel não soma acordo judicial. O funil usa `ACORDOS_A_RECEBER` de `ccJurResumo`, que conta só `ANDAMENTO` (`add-030:1416`). Os `AGUARDANDO` ficam no indicador próprio da 003.
- **D-09:** não se aplica, porque a 006 não grava cargo nem alçada.
- **Visibilidade:**
  - todas as leituras usam `EU` (SQL) ou `MEMBRO_A` sobre o membro de `sessao()` (JS);
  - o `membroId` da tela é ignorado (sonda: Ana com o `membroId` do Gustavo vê 45.000);
  - sem sessão, a leitura é recusada;
  - foto pelo agente congelado e ao vivo pelo cliente (RN-006);
  - Jurídico, usuário sem vínculo e inativo são recusados nas 6 JS e não recebem linha nas 7 SQL (C-002).
- **Internas do fechamento:**
  - a guarda é `ATOR` com `PODE_ADMINISTRAR`, as quatro comparações da RN-016, `mes < SUBSTRING(AGORA_SQL, 1, 7)` e "sem foto";
  - o supervisor, como ele mesmo ou fingindo ser o Gustavo, não grava (C-009);
  - **não há escalada**.
- **Escrita auditada:** o fechamento audita a criação e cada campo alterado (3 execuções). A foto não audita, como manda 01 §7.
- **Orçamento:** a Visão geral dá 6 pelo contador do simulador (RNF-001 com `assert.equal`). `ccPainelAtencao` sozinha dá 1 e a rotina dá 1.
- **Volume (SQLite, indicativo):** com o mês informado, toda leitura ficou abaixo de 1,2 s:
  - `Posicao` 0,99 s; `Credito` 1,17 s; `Serie` de 12 meses 0,84 s; `RollRate` 0,33 s;
  - `Agentes` 0,30 s, `Planos` 0,39 s e `Equipe` 0,54 s, com `mes = '2026-11'`.
  - A foto de 22.011 linhas por um `INSERT IGNORE … SELECT` levou 0,42 s.
  - Exceção: as três SQL com `mes = ''` (ver O-02).

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | 0 |
| CORRIGIR | 4 |
| OBSERVAÇÃO | 8 |

Das oito divergências declaradas, todas são aceitáveis. Duas (3 e 7) já estão no contrato e não são divergência. Uma (8) deixa morta uma regra de 03 até a pendência da base. Nenhuma está anotada no plan (C-04).

## BLOQUEIA

Nenhum.

## CORRIGIR

- **C-01 · O analista e o supervisor veem a atividade de agentes fora do seu recorte em `ccPainelAgentes`.**
  - **Onde:** `backend/add-060-painel-consolidado.mjs:598-611`. Os `LEFT JOIN` de contatos (`KC`), promessas (`PR`) e ações (`AC`) contam tudo o que o agente registrou no mês, em qualquer cliente. Só o recorte de BU e carteira se aplica, sem `clienteVisivel`.
  - **Provado (`p006a`):** Rita, analista do 6006 (cliente do Carlos), abre o bloco e vê a linha do Carlos com `CONTATOS = 1`. Esse contato é de um cliente que Rita não enxerga (o 6007).
  - **Por que importa:** fere RN-015 / C-002 ("nenhum bloco mostra … de fora da árvore"; "agente e analista: só a própria linha"). O efeito é pequeno, mas é contagem de trabalho alheio.
  - **Correção:** nos três subselects, juntar `CC_CLIENTE` e exigir `clienteVisivel('C')` com o `EU` (ou comparar com o mesmo recorte das linhas). Afirmar no C-002 com a Rita analista de cliente de outro agente.
- **C-02 · A interna do fechamento aceita mês inválido e data da entrada.**
  - **Onde:** `add-060:688-699`.
    - A guarda aceita qualquer `'{{mes}}' LIKE '____-__'`.
    - `LANCADO_EM` e `ATUALIZADO_EM` gravam `'{{agora}}'` da entrada.
  - **Provado (`p006a`):** Gustavo, chamando `ccEscPainelFechamentoInserir` direto, grava o mês `2025-13` com `MES_SEGUINTE = '2025-14'` e `LANCADO_EM = 2001-01-01`. Não há auditoria, e o mês aparece em `ccPainelFechamentoListar`.
  - **Por que importa:** não é escalada, porque só quem administra passa na guarda. Mas fere a regra geral das internas de `02-pos-construcao` ("data … recalculada na própria SQL").
  - **Correção:** trocar `'{{agora}}'` por `AGORA_SQL` e acrescentar `SUBSTRING('{{mes}}', 6, 2) BETWEEN '01' AND '12'` à guarda.
- **C-03 · Com vigência retroativa de `pdd.*`, a PDD por faixa de um mês fechado muda e deixa de somar a PDD da foto.**
  - **Onde:** `add-060:98` e `:106`. Para a foto, `PDD0…PDD5` é recalculado com os percentuais em vigor na data da foto, lidos hoje. O total vem de `CC_FOTO_AGING.PDD`, congelado. `ccBaseParametroSalvar` aceita vigência no passado para chave com vigência (`add-010:749-751`).
  - **Provado (`p006b`):** `pdd.f1` da Estética passa a 10% com vigência 2026-10-01. Outubro continua com `pdd` 5.720, mas as faixas passam a somar 5.930 (faixa 1–30: de 270 para 480).
  - **Por que importa:** fere a RN-003 ("mudar o parâmetro depois não reescreve meses fechados") e o RF-009 (a tabela por faixa não fecha com o total).
  - **Correção:** a mais simples é a base recusar vigência anterior a hoje nas chaves `pdd.*`, ou em todas; é decisão do arquiteto, porque toca a 001. A alternativa na 006 é gravar a PDD por faixa na foto (6 colunas em 02).
- **C-04 · As divergências da construção não estão no plan, e o plan ficou desatualizado.**
  - **Onde:** `docs/specs/006-painel-consolidado/plan.md`. Não há seção de divergências.
    - `:125` e `:198` ainda dizem que a rotina chama `ccEscBaseRotinaPasso` e custa 2. O código devolve `execucoes: 1` (`add-060:519`).
    - `:122` não traz o formato dos itens nem o corte "sem leitura OK anterior".
  - **Por que importa:** o CLAUDE.md pede "divergência entre contrato e plano anotada". Hoje elas só existem em `pedidos/02-pos-construcao.md` §006.
  - **Correção:** acrescentar ao plan uma tabela com as 8 (ver abaixo) e ajustar as duas linhas da rotina.

## OBSERVAÇÃO

- **O-01 · O teste do fechamento afirma "≤ 12 execuções" onde o plan diz 3.**
  - **Onde:** `simulator/smoke/006-painel-consolidado.mjs:297`.
  - **Correção:** trocar por `assert.equal(gasto, 3)` (JS, interna e auditoria), para o teste ter dente.
- **O-02 · No simulador, as SQL com `mes = ''` ficam lentas.**
  - **Onde:** `lib/painel-consolidado/base.mjs:15`. `MES_REF` contém `HOJE_SQL`, que no SQLite é UDF não determinística, avaliada por linha e sem índice.
  - **Medido:** com 20 mil clientes, `ccPainelPlanos` leva 9,4 s, `ccPainelEquipe` 3,3 s e `ccPainelAgentes` 2,9 s. Com `mes = '2026-11'` os mesmos levam 0,39, 0,54 e 0,30 s.
  - **No MySQL:** `UTC_TIMESTAMP()` é constante por instrução e o índice de `MES` deve ser usado.
  - **Sugestão:** a tela manda sempre o mês do filtro (o plan já faz isso no roll rate). Medir no sandbox antes de fechar o RNF-002.
- **O-03 · Jurídico com a marca ADMIN lança e lista o fechamento, mas não abre o painel.**
  - **Onde:** `add-060:490` e `:670`. O contrato diz `ADM` para essas SFs e a spec diz "Jurídico não acessa o painel".
  - **Provado (`p006a`):** Júlia com `ADMIN = 1` grava julho e lista 2 fechamentos, mas `ccPainelPosicao` a recusa.
  - **Sugestão:** decidir e alinhar: acrescentar `CARGO <> 'JURIDICO'` à SF, à guarda e ao filtro, ou registrar a exceção.
- **O-04 · A foto é gravada por `INSERT IGNORE … SELECT` que lê a própria `CC_FOTO_AGING` em derivadas e subconsulta.**
  - **Onde:** `add-060:531`, com `ANT`, `BASE` e `BAIXAS`.
  - **Por que importa:** é o idioma comum e funciona no simulador. Mas `INSERT IGNORE` no MySQL transforma em aviso o que o modo estrito recusaria; hoje nenhuma coluna da foto recebe `NULL`.
  - **Sugestão:** conferir no sandbox junto com o S-06 do plan.
- **O-05 · Em meses passados, o recorte de BU de contatos, promessas e ações usa a posição de hoje.**
  - **Onde:** `base.mjs:114` (`recorteDoCliente`), usado em `add-060:265` e `:599-610`. "Cliente com saldo na BU" é lido em `CC_POSICAO_CLIENTE_BU` atual, não na foto.
  - **Efeito:** com filtro de BU, as promessas de um mês passado podem sumir. Mesmo tipo do R-07 (rating de hoje).
  - **Sugestão:** rotular no bloco ou anotar no plan.
- **O-06 · `PMR` e prazo médio de mês passado usam `CC_POSICAO_CLIENTE.PRAZO_MEDIO_DIAS` de hoje.**
  - **Onde:** `add-060:314`.
  - **Sugestão:** é informativo e sem meta. Rotular como "prazo atual" ou anotar com o R-07.
- **O-07 · `COBRADO`/`GERADA` voltam 0, e não "sem dado", quando o mês corrente não tem foto anterior.**
  - **Onde:** `ccPainelAgentes` (`add-060:591`) e o ramo ao vivo (`BASE.N = 0`). `ccPainelSerie` devolve `null` nesse caso.
  - **Efeito:** no primeiro mês de operação, a conversão por agente aparece como 0% em vez de "—".
- **O-08 · Simplicidade: o código é enxuto para o que entrega.**
  - Um fragmento (`linhasDoMes` / `aoVivo`) serve a foto e as 13 leituras, e a regra pura está em `calculo.mjs` com teste.
  - O único ponto de leitura difícil é a montagem por marcadores `#…#` + `preencher()` nas JS (`add-060:42-55`). Ela evita duplicar os fragmentos e se justifica.
  - Não vi abstração sobrando.

## Divergências declaradas (02-pos-construcao §006)

| # | Divergência | Parecer |
|---|---|---|
| 1 | `DECIDIDAS` em `ccPainelSerieCredito` | Aceita: saída aditiva, dá o denominador do SLA e do tempo médio. Texto em 04 §6. |
| 2 | `foraDoPrazo` em `ccPainelCredito.porCarteira` | Aceita: aditiva. O total já existia em `emAnalise.foraDoPrazo`. |
| 3 | `ESTIMADO` em `ccPainelSerie` | Já está em 04 §6 ("`ESTIMADO (0/1, RN-008)`"): não é divergência. |
| 4 | `ccPainelRotina` devolve `execucoes: 1` | Aceita: a linha do passo é do `ccRotina`, e o teste afirma ≤ 2. O plan ainda diz 2 (C-04). |
| 5 | Rotina não fotografa mês sem leitura OK anterior | Aceita: evita foto retroativa na implantação, que a spec põe fora de escopo. O mesmo corte vale em `fotoPendente`, por isso o aviso não aparece no primeiro mês (R-06). Pede uma frase na RN-005 e em 04 §6. |
| 6 | Itens de Atenção `{tipo, texto, quantidade, valor, gravidade}` | É o mesmo conjunto de 04 §6, só em outra ordem: não é divergência. |
| 7 | Decisões ignoram `buId` | Já está em 04 §6 ("o filtro de BU não altera as decisões") e no D-09 do plan: não é divergência. Afirmado no C-019 do banco B. |
| 8 | `validarConjunto` só com as chaves do grupo | Aceita como pendência da base. Até lá, `painel.sincAtrasoMin ≥ base.syncIntervaloMin` (03 §13) não é conferida num salvamento normal. O código da 006 já está pronto (`lib/parametros/006-painel-consolidado.mjs:24-27`). |
