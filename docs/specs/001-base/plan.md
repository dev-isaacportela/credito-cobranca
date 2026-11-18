# Plan: Base — clientes e posição do Winthor, equipe, parâmetros e serviços comuns

**Spec:** [`spec.md`](spec.md) · **Data:** 2026-11-14 (refeito contra `docs/contrato/`; ajustado às respostas do arquiteto e à validação v2 em 16/11/2026, `pedidos/01-correcoes-v2.md`)

> O COMO. Nenhum requisito novo nasce aqui — se faltou algo, volta pra spec.
> Normativos: [`constitution.md`](../../constitution.md), [`arquitetura.md`](../../arquitetura.md)
> e o contrato técnico (`docs/contrato/00` a `06`). Este plano **não copia o contrato**:
> tabelas, colunas, parâmetros e assinaturas estão lá; aqui fica o que ele não diz
> (algoritmo, ordem das escritas, bordas, como testar). Citação `02 §CC_CLIENTE` =
> `docs/contrato/02-dados.md`, seção da tabela.
>
> A 001 carrega também o **esqueleto do projeto** (Fluxo B da skill `mitra-escopo`): os
> arquivos compartilhados de 01 §14 nascem nas primeiras tarefas do backend desta spec.

## Checagem de princípios

| Princípio | Toca? | Como atende |
|---|---|---|
| I. Spec antes de código | sim | Spec corrigida, zero `NEEDS CLARIFICATION`. Pendências do gestor seguem pelo padrão do contrato (00 §4). Os pedidos ao arquiteto foram respondidos em 16/11/2026 (`docs/contrato/pedidos/00-respostas.md`); o que cada resposta mudou está em "Respostas do arquiteto" |
| II. A política é dado | sim | 38 chaves da base em `lib/parametros/001-base.mjs` (03 §1, §2, §3, §8). Constante no código só para definição do sistema: cargos e níveis, faixas de aging, formatos de anexo, fases da leitura, tetos de lote |
| III. A regra roda no servidor | sim | Forma A de 01 §5 em toda escrita: JS pública valida e a `ccEsc…` repete permissão, visibilidade e estado na própria SQL. Identidade por `sessao()`/`quem()` (01 §4) |
| IV. Winthor é a fonte do financeiro | sim | Só `SELECT` em `lib/winthor-sql.mjs`; teste varre o arquivo e as definitions com `jdbcId` atrás de DML/DDL (RNF-005) |
| V. Toda escrita é auditada | sim | `auditar()` em toda JS de escrita; `CC_AUDITORIA` sem SF de `UPDATE`/`DELETE` (teste C-026). Leitura do Winthor não audita posição (01 §7) |
| VI. Testes obrigatórios | sim | Uma linha da seção Testes da spec = um `teste()` em `backend/simulator/smoke/001-base.mjs` ou um `test()` em `frontend/tests/001-base.test.mjs` |
| VII. Migrations append-only | sim | Nada em `backend/migrations/`; scripts só rodam no sandbox |
| VIII. Simplicidade | sim | Um cálculo de posição (função pura) serve a leitura e os títulos ao vivo; uma SF de parâmetro; sem SF de dia útil, de troca de topo ou de restaurar padrão; nenhum arquivo vazio "para depois" |
| IX. Segurança e credenciais | sim | `MITRA_*`, `WINTHOR_*`, `CC_ADMIN_*` só no `.env` do sandbox; nada em `VITE_*` |
| Backend escrito local, executado no sandbox | sim | `setup-backend.mjs`, `add-001-kanban.mjs`, `add-002-jdbc-winthor.mjs`, `add-010-base.mjs`, `add-090-perfil-acesso.mjs`. Nenhum roda daqui |
| Leitura e escrita por Server Function | sim | Tela só chama SF; business escreve por `ccEsc…` chamada pela JS |
| Simulador cobre a feature | sim | Mesmas definitions e mesmo DDL; emulações de 06 §4; `sim:check` + smoke |
| Design tokens, sem cor literal | sim | Design system Benenutri instalado no esqueleto do frontend (skill `design`, modo Instalar) |

## Contexto técnico

- **Frontend:** React 19 · Vite 7 · Tailwind 4 · react-router 7 · `mitra-interactions-sdk` · `@benenutri/mitra-kanban` (as telas da 001 não têm quadro; a lib entra pelo `montarEmail` no backend e pelo `enviarArquivo` que a 001 entrega). Vite **5185**.
- **Backend:** scripts com `mitra-sdk`; simulador na porta **3115**. Lib `@benenutri/mitra-kanban` ^1.14.0 nos dois lados.
- **Referências de cópia:** `p-novo-sgc` (SGC 2) para `add-001-kanban.mjs`, `add-003-jdbc-winthor.mjs` (aqui `add-002`), `simulator/{runtime,server,mysql-dialect,winthor-oracle}.mjs`, `smoke/base.mjs`, `ids-do-mapa.mjs` e o padrão "publica, lê os ids, republica as JS com o mapa real"; `consultas-winthor/backend/add-004-fotos.mjs` para cron que lê o Winthor com `runQueryMitra({ jdbcId })` e grava com `runDmlMitra` (marcador `__JDBC_WINTHOR__`); `p-44515/backend/add-winthor-billing-realtime.mjs` para o SQL de faturamento e os joins de D-01/D-02; kit da skill `mitra-escopo` (`assets/backend`, `assets/frontend`).
- **Dependência nova:** nenhuma além das do SGC 2 (`oracledb` só como devDependency para `SIMULATOR_WINTHOR=oracle`).

## Arquivos (costuras de 01 §14)

| Dono | Arquivos |
|---|---|
| Integrador (nascem nesta spec, fase B1) | raiz: `README.md`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`, `.claude/launch.json` · `backend/`: `package.json`, `.env.example`, `setup-backend.mjs`, `add-001-kanban.mjs`, `add-002-jdbc-winthor.mjs`, `add-090-perfil-acesso.mjs`, `sync-server-function-map.mjs`, `ids-do-mapa.mjs`, `sandbox/t002-confirmar.mjs` · `backend/simulator/`: `config.mjs`, `runtime.mjs`, `server.mjs`, `check.mjs`, `mysql-dialect.mjs`, `winthor-oracle.mjs`, `schema-winthor.mjs`, `relogio.mjs`, `seed.mjs`, `seed-cli.mjs`, `seed/000-elenco.mjs`, `smoke.mjs`, `smoke/base.mjs`, `smoke/000-esqueleto.mjs` · `frontend/`: projeto Vite, design system, `src/App.tsx`, `src/AdminLayout.tsx`, `src/lib/{server-functions,mitra-api,mitra-auth}.ts` |
| 001 | `backend/add-010-base.mjs` · `backend/schema/001-base.mjs` · `backend/lib/{escritas,guarda,visibilidade,parametros,tempo,dias-uteis,winthor-sql,quadros}.mjs` · `backend/lib/base/{posicao,setor,modelo,equipe}.mjs` · `backend/lib/parametros/001-base.mjs` · `backend/simulator/seed/001-base.mjs` · `backend/simulator/smoke/001-base.mjs` · `frontend/src/modules/001-base/` · `frontend/src/lib/base/*.ts` · `frontend/tests/001-base.test.mjs` |

Não existem `lib/modelos/001-base.mjs` nem `lib/quadros/001-base.mjs`: a base não tem modelo nem quadro.
`frontend/src/lib/server-functions.ts` nasce no backend (T-008), porque é dele que o simulador tira os ids.

## Modelo de dados

As 22 tabelas da 001 estão em 02 §001-base, com colunas, chaves e quem escreve. DDL em
`backend/schema/001-base.mjs`, um template literal por tabela. O que o contrato não diz:

| Tabela | Nota de implementação |
|---|---|
| `CC_MEMBRO` | Bootstrap no `setup-backend.mjs`: com a tabela vazia, cria o topo a partir de `CC_ADMIN_NOME`/`CC_ADMIN_EMAIL` do `.env` (`DIRETORIA`, `ADMIN`, `CAMINHO = '/1/'`). `NIVEL` é gravado pela escrita a partir do cargo (01 §4) |
| `CC_BU`, `CC_FERIADO` | Semeados no setup se vazios: as 4 BUs de RF-028; nacionais do ano corrente e do seguinte (`ORIGEM = 'GERADO'`) |
| `CC_PARAMETRO_DEF`, `CC_PARAMETRO` | Fusão de `lib/parametros/*` no setup (01 §9). `PADRAO` guardado como texto no formato de máquina (`0.5`, `65492.11`, `11,12,13,14,15`). A definição da chave aceita `vigencias: [{ inicio, valor }]` (só com `comVigencia`: grava as vigências históricas da linha padrão no lugar do `padrao`) e `carteiras: { PUBLICA: valor, … }` (valor próprio semeado da carteira), sempre só para chave sem valor (01 §9, 03 §18) |
| `CC_CONTATO_CLIENTE` | `BUSCA` = nome + e-mail + telefone em maiúscula sem acento, gravada por `ccEscBaseContatoInserir`/`ccEscBaseContatoAtualizar` na mesma instrução (02 §CC_CONTATO_CLIENTE); é a coluna da busca de contatos |
| `CC_POSICAO_CLIENTE_BU`, `…_CARTEIRA` | Linha que deixa de ter saldo é **zerada**, não apagada (a chave única continua valendo e `ALTERADO_EM` avisa os passos) |
| `CC_SINCRONIZACAO` | `CURSOR` guarda o último `CODCLI` processado da fase (paginação por chave, não por número de página) |
| `CC_ESTADO` | Chaves da 001: `rotina.trava` (`<agora>¦<token>`), `rotina.diaCompleto.ACESSOS`, `winthor.descoberta` (JSON resumido, até 500 caracteres: tabelas e nº de colunas ausentes) |
| `CC_FASE` | Escrita só por `semearQuadro()`; a 001 não semeia quadro em produção. No simulador, o passo 3 do pipeline (06 §2.3) chama a mesma função para cada `lib/quadros` presente |

Winthor: mapa em 02 §Winthor; todo SQL Oracle em `lib/winthor-sql.mjs` (DT-26). Colunas "a confirmar" = S-12.

## Contratos de backend

Assinaturas em 04 §1. Tudo em `backend/add-010-base.mjs`. Abaixo, por SF pública: o cenário que
atende, o título do teste que a cobre e só o que o contrato não diz. Pedidos ao arquiteto (PA-nn)
já decididos: ver "Respostas do arquiteto".

### Leituras

| SF | Atende | Teste (`smoke/001-base.mjs`) | O que o contrato não diz |
|---|---|---|---|
| `ccBaseSessao` | C-010, C-027, RF-018 | C-010 | Sem `throw`: `membro: null` para sem vínculo e inativo |
| `ccBaseClienteListar` / `…Total` | C-008, C-009, RF-011, RF-021 | C-008, C-009 | `busca` chega normalizada pela tela (`montarBusca`): casa `NOME_BUSCA LIKE`, `DOCUMENTO =` ou `CODCLI =` num `OR` só. `buId`: `-1` desligado, `0` = "Sem BU" (`EXISTS` em `CC_POSICAO_CLIENTE_BU` com saldo). `carteira`: `EXISTS` em `…_CARTEIRA` com saldo. `ordem` é lista fechada (`NOME`, `VENCIDO`, `DIAS_ATRASO`) resolvida por `CASE`, nunca interpolada. `SITUACAO_FICHA` = `NUNCA` / `VENCIDA` (`DATEDIFF` > `PARAM_NUM('base.fichaValidadeDias')`) / `EM_DIA`. `agenteId = -1` = sem agente; `situacaoFicha` (`A_REVISAR` = vencida ou nunca); saída com `BUS_SALDO` e `CONTATOS_REVISADO_EM`; `…Total` com `TOTAL, VENCIDO, A_VENCER, EM_ATRASO, MAIOR_ATRASO, SEM_AGENTE, FICHA_A_REVISAR` (04 §1) |
| `ccBaseClienteFicha` | C-007, RF-009, RF-019 | C-007 | Uma consulta de visibilidade + cliente; não visível = `'Cliente não encontrado.'`. Só MySQL (o que é ao vivo fica em `ccBaseTitulosAbertos`). `codcli` fora de `CC_CLIENTE`, para quem vê tudo: `{ cliente: null, foraDoSistema: true, winthor }` lido ao vivo por `ccBaseWinthorCliente` (busca exata por código ou documento: entrada `documento`, CPF/CNPJ só dígitos, normalizado pela tela; `documento` que já está em `CC_CLIENTE` abre o cliente com a visibilidade de sempre; 04 §1, fechamento v2); para os demais, "Cliente não encontrado." |
| `ccBaseTitulosAbertos` | C-007, C-030, RF-010 | C-007, C-030 | Ver "Títulos ao vivo" no Fluxo. Aninhada (002, 003, 005): `membroId (0)`, visibilidade sobre o membro de `quem()` por `MEMBRO_A` + `clienteVisivelA`, nunca por `EU` (01 §4 DT-34) |
| `ccBaseRecebimentoListar` / `…Total` | C-002, RF-003, RF-009 | C-002 | `clienteVisivel('C')` por `JOIN CC_CLIENTE`; `comAtraso = 1` → `DIAS_ATRASO_PAGAMENTO > 0` |
| `ccBaseFaturamentoMes` | C-032, RF-046 | C-032 | Últimos `meses` a contar do mês de hoje; `BU_NOME = 'Sem BU'` para `BU_ID = 0` |
| `ccBaseContatoListar` / `ccBaseContatoTotal` | C-022, RF-033 | C-022 | `SITUACAO_FICHA` repetida em cada linha. `clienteId > 0` = lista fixa do cliente; `clienteId = 0` = L+T de todos os clientes visíveis, com `busca` normalizada pela tela casando `BUSCA LIKE` |
| `ccBaseMembroListar` / `…Total` | C-011, C-013, RF-017 | C-011 | Lista inteira para todo membro ativo (a equipe é pública na empresa); devolve também `CLIENTES` e `SUBORDINADOS_ATIVOS` (a tela mostra e a recusa de inativação cita). Aceita `busca`, `limite`, `offset` como toda L+T (04 §0); a tela da equipe pede `limite` 500 |
| `ccBaseEquipeConferir` | C-034, RF-049 | C-034 | `podeAdministrar(m)`. Ciclo e caminho inconsistente detectados em memória sobre a lista inteira (`lib/base/equipe.mjs`) |
| `ccBaseBuListar` | C-020, RF-028 | C-020 | `DEPTOS` = `GROUP_CONCAT` "código nome" |
| `ccBaseBuDeptoListar` | C-020, RF-044 | C-020 | `PODE_ADMINISTRAR` no `WHERE` (com `EU`). `semBu = 1` → `BU_ID IS NULL` |
| `ccBaseParametroListar` | C-015, C-017, RF-022 | C-015, C-017 | `data ''` = hoje. **Não junta `EU`**: funciona sem sessão (chamada aninhada pela 007). `VALOR_EFETIVO` pelo fragmento `PARAM()`; `VIGENCIA_INICIO` é a do valor efetivo na carteira pedida. Saída com `PADRAO`, `MINIMO`, `MAXIMO`, `USADO_POR` do catálogo |
| `ccBaseParametroHistorico` | C-016, RF-027 | C-016 | Ordem: `VIGENCIA_INICIO DESC` |
| `ccBaseFeriadoListar` | C-021, RF-031 | C-021 | `ano = 0` → ano de hoje |
| `ccBasePlanoListar` | C-032, RF-045 | C-032 | — |
| `ccBaseModeloListar` | C-023, RF-035 | C-023 | `SITUACAO_VALIDACAO`: `NAO_EXIGE`, `VALIDO`, `AGUARDANDO` (versão diferente ou nunca), `VENCIDA` (mais de `com.modeloRevalidarMeses`) |
| `ccBaseModeloPrever` | RF-036 | C-024 | Chama o mesmo `renderizar()` do envio (`lib/base/modelo.mjs`); `validado` = pode enviar hoje. Aninhada (003, 005): `membroId (0)`, cliente visível ao membro de `quem()` por `MEMBRO_A` (DT-34) |
| `ccBaseEmailListar` / `…Total` | RF-038 | C-024 | `clienteVisivel`; `clienteId = 0` só para quem vê tudo |
| `ccBaseAnexoListar` | C-025, RF-039 | C-025 | Só `REMOVIDO_EM IS NULL`; `CLIENTE` exige cliente visível |
| `ccBaseAuditoriaListar` / `…Total` | C-026, RF-041 | C-026 | Guarda no `WHERE` (sem acesso = 0 linha): `PODE_ADMINISTRAR`; com `clienteId > 0`, `NIVEL_MIN(2)` e o cliente visível (DT-41). Sem busca por texto: o contrato não traz `busca` |
| `ccBaseSincronizacaoStatus` | C-005, C-006, RF-006 | C-005, C-006 | Uma linha por passo, repetindo as colunas da última leitura; sem passo, uma linha só. `ULTIMA_OK_EM`, `MINUTOS_DESDE` (desde a última `OK`), `INTERVALO_MIN`, `PEDIDO_PENDENTE` |
| `ccBaseSincronizacaoListar` / `…Total` | C-006, RF-007 | C-006 | `PODE_ADMINISTRAR` no `WHERE`; mais recente primeiro; `…Total` com `TOTAL`, `COM_ERRO`, `CLIENTES_NOVOS` |
| `ccBaseWinthorDescobrir` | C-034, RF-050, S-12 | C-034 | `podeAdministrar(m)`. Compara `ALL_TAB_COLUMNS` com a lista `COLUNAS_LIDAS` exportada por `winthor-sql.mjs`; devolve `{ tabelas: [{ tabela, colunas[], ausentes[] }] }` |

### Escritas

| SF | Atende | Teste | O que o contrato não diz |
|---|---|---|---|
| `ccBaseClienteAtribuir` | C-014, C-013, RF-020 | C-014 | Ver "Atribuição" no Fluxo |
| `ccBaseClienteClassificar` | C-020, RF-029 | C-020 | `NIVEL_MIN(2)` e cliente visível ao ator (`clienteVisivelA`, DT-41; não visível = "Cliente não encontrado."), repetidos na guarda de `ccEscBaseClienteClassificar`. `esfera` só para cliente `PUBLICO`; vazio limpa. Audita por campo mudado |
| `ccBaseContatoSalvar` | C-022, RF-033 | C-022 | Ver "Contato" no Fluxo. Listas de área e função são constantes em `add-010` (definição do sistema; a de função inclui as três do público) |
| `ccBaseContatosRevisar` | C-022, RF-034 | C-022 | Não toca `ATUALIZADO_EM` dos contatos |
| `ccBaseMembroSalvar` | C-011, C-012, C-013, RF-013 a RF-016 | C-011, C-012, C-013 | Ver "Equipe" no Fluxo |
| `ccBaseBuSalvar` | C-019, RF-028 | C-019, C-020 | `podeAdministrar(m)`. Nome único sem diferença de caixa; não existe exclusão; inativar não desfaz ligações de departamento |
| `ccBaseBuDeptoSalvar` | C-019, C-020, RF-044 | C-019, C-020 | `podeAdministrar(m)`. `buId = 0` grava `NULL`; BU precisa estar ativa |
| `ccBaseParametroSalvar` | C-015 a C-018, RF-023 a RF-026 | C-015 a C-018 | Ver "Parâmetros" no Fluxo |
| `ccBaseFeriadoSalvar` | C-019, C-021, RF-031 | C-019, C-021 | `podeAdministrar(m)`. `UF`/`MUNICIPIO` obrigatórios conforme a abrangência. `remover = 1` → `ccEscBaseFeriadoRemover`; `gerarAno > 0` → os 13 de `feriadosNacionais(ano)` numa execução de `ccEscBaseFeriadosInserir` (`INSERT IGNORE`, `ORIGEM = 'GERADO'`, lote ≤ 20) e uma auditoria |
| `ccBaseModeloSalvar` | C-019, C-023, RF-035 | C-019, C-023 | `podeAdministrar(m)`. Recusa campo `[X]` fora dos comuns (01 §13) e de `CAMPOS_EXTRAS`; assunto e corpo iguais aos atuais não sobem versão |
| `ccBaseModeloValidar` | C-023 | C-023 | Só modelo com `EFEITO_LEGAL`; nível relido na SQL por `PARAM('com.modeloValidaNivel')` |
| `ccEmailEnviar` | C-024, RF-037 | C-024 | Ver "E-mail" no Fluxo |
| `ccBaseAnexoRegistrar` | C-025, RF-039 | C-025 | Extensão e MIME conferidos; `url` precisa ser `https://`; guarda por entidade (04 §1): `CLIENTE` = cliente visível, `MATERIAL` = `PODE_ADMINISTRAR`, `CERTIDAO` = `NIVEL_MIN(2)` |
| `ccBaseAnexoRemover` | C-025 | C-025 | — |
| `ccBaseSincronizacaoPedir` | C-006, RF-007 | C-006 | Recusa com `SOLICITADA` ou `EM_ANDAMENTO` existente (a condição está no `INSERT … SELECT`) |

### Rotina, ganchos e internas

| SF | Atende | Teste | O que o contrato não diz |
|---|---|---|---|
| `ccRotina` | C-006, C-031, RF-001, RF-047 | C-006, C-031 | Ver "Rotina" no Fluxo |
| `ccBaseSincronizar` | C-001 a C-005, C-028 a C-030, C-032 | C-001 a C-005, C-028 a C-030, C-032 | Ver "Leitura do Winthor" no Fluxo |
| `ccBaseAcessosConciliar` | C-033, RF-048 | C-033 | Ver "Acessos" no Fluxo |
| `ccPodeMover`, `ccPodeExcluir` | C-033 | C-033 | Ver "Ganchos" no Fluxo |
| `ccEscBaseClienteAnalista`, `ccEscBaseClienteJuridico` | pedidos da 004 e da 003 (04 §11) | C-009 | Entrada `{{clienteId}}`, `{{analistaId}}` (0 = limpa) / `{{noJuridico}}`, `{{membroId}}`. Analista (B1 C-05): destino ativo e de cargo diferente de `JURIDICO`; `ROTINA`, ou `ATOR` com o cliente visível que põe **a si mesmo**, ou com `NIVEL_MIN(2)` (põe outro ou limpa) — o mesmo "o próprio, ou outro só com nível ≥ 2" da `ccEscCredSolicitacaoInserir` da 004. Jurídico: `ROTINA`, ou `ATOR` com cargo `JURIDICO` ou `PODE_ADMINISTRAR` (o `JUR` de 04 §0), **sem** exigir o cliente visível (o Jurídico só vê cliente já marcado, B1 O-09), ou nível ≥ `jur.envioNivelMin` (sem a marca) com o cliente visível. O smoke da 001 chama as duas e confere que Rita e Júlia passam a ver o cliente e as recusas |

As 24 internas `ccEsc…` de 04 §1 seguem a Forma A (01 §5); as outras duas internas são as leituras Oracle `ccBaseWinthorTitulos` e `ccBaseWinthorCliente`. Entradas de cada `ccEsc…` são decididas aqui e
ficam no cabeçalho de `add-010-base.mjs`; quem chama de fora (003, 004) usa só as duas da linha acima.
Internas próprias por resposta do arquiteto: `ccEscBaseFeriadoRemover`, `ccEscBaseModeloValidar` (PA-06) e `ccEscBaseFeriadosInserir` (PA-07).
Guarda de `ccEscBaseEstado`: `ROTINA`, ou `ATOR` com `PODE_ADMINISTRAR` só para a chave `winthor.descoberta` (`ccBaseWinthorDescobrir` grava com sessão).

Conta de execuções das três operações mais caras (teto: 20 por clique, 01 §10):

| Operação | Execuções |
|---|---|
| `ccBaseClienteAtribuir` com 20 clientes | 1 (a própria) + 1 `ccEscBaseClienteAgente` (lote por `FIND_IN_SET`) + 1 `ccEscBaseAuditoria` (lote de 20, `auditarLinhas`) = **3** |
| `ccBaseParametroSalvar` com 20 itens | 1 + 1 `ccEscBaseParametro` (lote de listas alinhadas) + 1 auditoria (lote de 20) = **3** |
| `ccBaseMembroSalvar` (membro novo ou troca de topo) | 1 + 2 escritas + 1 auditoria = **4** |
| Abrir a ficha do cliente | `ccBaseClienteFicha` 1 + `ccBaseTitulosAbertos` 2 (ela + `ccBaseWinthorTitulos`) + `ccBaseRecebimentoListar` e `…Total` 2 ("pagos em 90 dias", na aba Títulos, que abre primeiro) + `ccBaseSincronizacaoStatus` 1 = **6** (teto 6; com o Status no cache de 60 s do layout, 5); e-mails e anexos só ao abrir a aba |
| Rodada da rotina | leitura: 2; processamento só com a 001: `ccRotina` 1 + `ACESSOS` 1 + `ccEscBaseRotinaPasso` 2 = 4 (teto 150) |

`sessao()`, `ler()` e `runDmlMitra` não são execução de SF (são consultas do SDK dentro da JS).

## Superfície de interação

Opções escolhidas em `docs/opcoes-tela/escolhas.md`; mockup no `<template data-opcao>` do arquivo
indicado. Componentes = vocabulário do design system Benenutri (`components/page.tsx` e
`components/ui/`). Rotas e itens de menu saem de `frontend/src/modules/001-base/index.ts`, no
formato fixo de 01 §14 (DT-39): `modulo: Modulo` com `rotas: RotaModulo[]` e `menu: ItemMenu[]`, grupo só
`OPERACAO`, `CADASTROS` ou `ADMINISTRACAO`. Os tipos (e `MembroSessao`, o `membro` de `ccBaseSessao`, que o
`pode` recebe) são exportados por `lib/base/menu.ts` antes do M2. "Módulo entregue" = módulo cujo `index.ts`
o `App.tsx` importa; `menuDoMembro(membro, modulos)` recebe essa lista.

| Tela / rota | Opção | Monta com | Notas |
|---|---|---|---|
| `/entrar` | `login` **A** Manchete e contexto (`telas-01-acesso.html`) | tela de login do kit (`MonogramTile`, `Field`, `Button`) | Estado "Seu acesso ainda não foi liberado. Fale com o Administrador." quando `ccBaseSessao` devolve `membro: null` |
| Casca (`AdminLayout`, integrador) | `casca` **C** Menu por função (`telas-02-casca.html`) | menu lateral do kit, `ThemeToggle` | Grupos Operação / Cadastros / Administração montados por `menuDoMembro()`; a carteira é aba **dentro** das telas de Crédito e Cobrança (`useCarteira(tela)` em `lib/base/carteira.ts`, guardada por tela); faixa `Alert` de posição desatualizada no layout (RF-006) |
| `/clientes` | `clientes-busca` **C** Filas prontas (`telas-03-clientes.html`) | `PageHeader`, `Kpi` ×4, `Tabs`, `Toolbar`, `SelectMenu`, `Table`, `Status`, `Pagination`, `Dash` | Abas: Em atraso · Sem agente · Ficha de contatos a revisar · Todos · Buscar no Winthor (só para quem vê tudo). "Escolher agente" na linha = `ccBaseClienteAtribuir` de 1 cliente |
| `/clientes/:codcli` | `cliente-ficha` **B** Cabeçalho fixo e abas (`telas-03-clientes.html`) | `PageHeader`, `Kpi` ×4, `Tabs`, `Table`, `Panel`, `Alert`, `Dialog`, `Field` | Abas: Títulos (em aberto ao vivo · pagos em 90 dias) · Posição por BU · Contatos · E-mails e anexos · Cadastro |
| `/contatos` | `contatos` **C** Agenda de contatos (`telas-04-contatos.html`) | `PageHeader`, `Alert`, `Toolbar`, `Table`, `Pagination`, `Dialog` com a ficha | Lê `ccBaseContatoListar`/`ccBaseContatoTotal` com `clienteId = 0`. O diálogo da ficha é o mesmo componente da aba Contatos da ficha do cliente |
| `/equipe` (aba Organograma) | `equipe-organograma` **C** Equipes lado a lado (`telas-05-equipe.html`) | `PageHeader`, `Tabs`, `Panel` por equipe, cartões de pessoa | **Sem desenho de árvore** (observação do usuário): faixa da direção + uma coluna por supervisor + "Direto com…"; `montarEquipes()` |
| `/equipe` (aba Cadastro) | `equipe-cadastro` **A** Tabela e diálogo (`telas-05-equipe.html`) | `Toolbar`, `Table`, `Status`, `Dialog`, `Field`, `SelectMenu`, `Alert` | Aviso do topo vem de `ccBaseEquipeConferir` (sem usuário, sem agente); o aviso "login sem vínculo" do mockup não é construído (sem dado). Troca de topo: opção "Topo da hierarquia" em "Reporta a", só para Diretoria, com confirmação. A marca "Administrador" no diálogo só fica habilitada para quem tem a marca |
| `/equipe/redistribuir` | `equipe-redistribuicao` **A** Selecionar e mover (`telas-05-equipe.html`) | `Toolbar`, `Table` com seleção, faixa de ação, `SelectMenu`, `Pagination` | Seleção limitada a 20 por vez; destino só entre os visíveis |
| `/admin/parametros` | `adm-parametros` **A** Grupo em grade (`telas-06-adm-politica.html`) | lista de grupos, `Table` editável, `Field`, `Alert`, `Dialog` (histórico) | Colunas: Padrão do catálogo · Valor (Privada) · Estética · Pública (D-05; o mockup ainda mostra Geral/Privado/Estética/Público). "Salvar grupo" manda só o que mudou; "Restaurar" manda `valor` nulo na linha padrão. Nome dos grupos de `GRUPOS_PARAMETRO` (`lib/base/parametros.ts`) |
| `/admin/bus` | `adm-bus` **A** BUs em tabela (`telas-06-adm-politica.html`) | `Table`, `Dialog`, `Panel` "Departamentos sem BU", `SelectMenu` | Bloco "Setor público": edita `base.ramosPublicos` e `base.ramoPublicoPrefixo` por `ccBaseParametroSalvar` |
| `/admin/feriados` | `adm-feriados` **C** Por abrangência (`telas-06-adm-politica.html`) | três `Panel` (nacionais, estaduais, municipais), `Dialog`, conferidor de dia útil | Conferidor roda na tela (`lib/base/dias-uteis.ts`) com os feriados de `ccBaseFeriadoListar` |
| `/admin/modelos` | `adm-modelos` **B** Editor com prévia (`telas-07-adm-operacao.html`) | `SelectMenu` de modelo, `Field`, chips de campo, `Panel` da prévia, `Status`, `Alert` | Sem "Novo modelo" e sem editar "efeito legal" (o contrato não cria modelo). "Registrar validação" habilitado só para quem pode |
| `/admin/sincronizacao` | `adm-sincronizacao` **B** Linha do tempo + números e tabela da A (`telas-07-adm-operacao.html`) | `PageHeader`, `Kpi` ×4, faixa do dia (um traço por leitura), `Panel` da leitura marcada, `Table`, `Pagination` | Observação do usuário "a+b": **faixa do dia com os quatro números e a tabela de leituras** (`ccBaseSincronizacaoListar`/`Total`). "Ler agora" desabilitado com pedido pendente (`PEDIDO_PENDENTE`) |
| `/admin/auditoria` | `adm-auditoria` **B** Linha do tempo com a alternância da C (`telas-07-adm-operacao.html`) | filtros em coluna, linha do tempo por dia, alternador "por dia / por item alterado", `Pagination` | Observação "b+c": `agruparPorDia()` e `agruparPorItem()` sobre a mesma página de registros |

Telas e estados que a spec pede e o agente de design **não desenhou** (seguem os padrões de
`design.md` §9; passam pelo modo Revisar da skill `design`):

| O quê | Onde | Monta com |
|---|---|---|
| Diálogo "Grupo econômico e esfera" (RF-029) | aba Cadastro da ficha | `Dialog`, `Field`, `SelectMenu` (esfera só para setor público) |
| Diálogo "Enviar e-mail" (RF-036, RF-037) | ficha do cliente | `Dialog` em dois lados: modelo, contato e campos extras à esquerda; prévia de `ccBaseModeloPrever` à direita; recusa por validação ou campo faltando em `Alert` |
| Diálogo "Anexar" (RF-039) | ficha do cliente | `Dialog`, `Field` tipo de documento, seletor de arquivo, aviso "arquivo em endereço público"; `validarArquivo()` antes de `enviarArquivo()` |
| Winthor fora do ar (RF-010) | aba Títulos | `Alert` "Não foi possível consultar o Winthor agora." + botão "Tentar de novo"; tabela vazia, sem dado antigo |
| Posição desatualizada / nunca lida (RF-006) | layout, cabeçalho da ficha, `/clientes`, `/admin/sincronizacao` | `Alert` de atenção com a data da última leitura; `situacaoDaPosicao()` |
| Planos de pagamento (RF-045) | `/cadastros/planos` | listagem padrão (`PageHeader`, `Table`), só leitura |
| Conferência dos campos do Winthor (RF-050) | bloco em `/admin/sincronizacao`, só para quem tem `PODE_ADMINISTRAR` | `Panel` recolhível com `Table` (tabela, campos, ausentes) |

Regra pura de tela (`frontend/src/lib/base/`, testada): `documento.ts` (`normalizarDocumento`,
`formatarDocumento`, `montarBusca`), `posicao.ts` (`situacaoDaPosicao`), `equipe.ts`
(`montarEquipes`), `parametros.ts` (`formatarParametro`; `GRUPOS_PARAMETRO` = `{ codigo, nome, ordem }[]` com todos os grupos de 03, importado também pela 007), `menu.ts`
(tipos `Modulo`, `RotaModulo`, `ItemMenu`, `MembroSessao` e `menuDoMembro(membro, modulos)`, 01 §14), `dias-uteis.ts` (cópia de `backend/lib/dias-uteis.mjs`), `auditoria.ts`
(`agruparPorDia`, `agruparPorItem`, `fraseDoRegistro`), `arquivos.ts` (`validarArquivo`,
`enviarArquivo`), `carteira.ts`, `extensoes.ts` (`registrarExtensao`, `extensoesDe`, assinatura e regra de combinação de 01 §14: abas e ações concatenadas na ordem de registro, dona primeiro; `conteudoDaFase` desenha os blocos de todos, ignorando `null`; `podeMover` devolve a primeira mensagem não nula).
Nenhuma tela relê sozinha (RNF-004); busca com espera de 400 ms; `Promise.allSettled` ao abrir.

## Fluxo

### Preâmbulo e fragmentos

`lib/escritas.mjs` exporta `PREAMBULO` (texto) e `js(corpo)`, que cola o preâmbulo na frente do
corpo de cada SF JAVASCRIPT. Chamada por id usa `Number('__CC_IDS__.nome')`, trocado por
`injetarIds(code, mapa)`: no simulador com os ids locais de `server-functions.ts`; no sandbox em
duas passadas (publica tudo, lê os ids, republica as JS), como o SGC 2. Id 0 = SF não publicada.
Como o `add-010` chama SFs das specs 002 a 007 (`ccRotina` → passos) e monta o `ccPodeMover` com os
`lib/quadros` presentes, a publicação completa roda o `PUBLISH_ORDER` (`add-010` … `add-070`) **duas vezes**,
depois `add-001-kanban` e `add-090`; publicar uma spec sozinha republica o `add-010` (e o `add-040` depois do
`add-050`) — 01 §14, DT-39; ordem escrita no `CLAUDE.md` (T-001).
Regra pura usada dentro de SF (posição, setor, render de modelo, dias úteis, equipe) é função
exportada em `lib/base/*.mjs` e entra no corpo por `função.toString()`: o smoke testa a mesma
função que roda na plataforma. Fragmentos SQL (`EU`, `clienteVisivel`, `ATOR`, `ROTINA`,
`PODE_ADMINISTRAR`, `NIVEL_MIN(n)`, `PARAM`, `HOJE_SQL`, `KB_BRASILIA('<coluna>')`, `NUMEROS_20`,
`FASE_DO_CARD`) são texto idêntico para MySQL e SQLite (01 §3, §5, §6, §9).

**Quem administra (D-06, 01 §4).** `PODE_ADMINISTRAR` = `(A.NIVEL >= 3 OR A.ADMIN = TRUE)` e
`NIVEL_MIN(n)` = `(A.NIVEL >= n OR A.ADMIN = TRUE)`, exportados por `guarda.mjs` (sobre `A` ou `EU`),
com o espelho `podeAdministrar(m)` no preâmbulo: Gerente, Diretoria ou a marca `ADMIN`. Usam
`PODE_ADMINISTRAR`: `ccBaseMembroSalvar`, `ccBaseBuSalvar`, `ccBaseBuDeptoSalvar`,
`ccBaseParametroSalvar`, `ccBaseFeriadoSalvar`, `ccBaseModeloSalvar`, `ccBaseBuDeptoListar`,
`ccBaseEquipeConferir`, `ccBaseAuditoriaListar`, `ccBaseSincronizacaoListar`,
`ccBaseWinthorDescobrir` (conferência do Winthor em `/admin/sincronizacao`) e o anexo `MATERIAL`;
usam `NIVEL_MIN(2)`: `ccBaseClienteAtribuir`, `ccBaseClienteClassificar`, `ccBaseSincronizacaoPedir`,
`ccBaseAnexoRemover`, o anexo `CERTIDAO` e a auditoria por cliente. Alçada nunca aceita a marca (na
001: o nível de `com.modeloValidaNivel` em `ccBaseModeloValidar`). Recusa na JS: "Somente Gerente,
Diretoria ou Administrador."

### Rotina (`ccRotina`)

Decisão da rodada como em 01 §11. O que fica definido aqui:

1. **Trava.** Grava `rotina.trava = '<agora>¦<token>'` só se o valor atual tem mais de 4 min, relê e confere o token (não depende de `rowsAffected`, S-04).
2. **Leitura parada** (01 §11 decisão 2): `EM_ANDAMENTO` com `INICIO` há menos de 2 × `base.syncIntervaloMin` → retoma; há mais → `ERRO` "interrompida" e nova leitura na mesma rodada.
3. **Orçamento.** `ccRotina` passa a cada passo o que sobra de 150 execuções e de 45 s (relógio de parede, `Date.now()` do início da rodada) e desconta o `execucoes` devolvido. Passo com id 0 no mapa é pulado **sem linha** em `CC_ROTINA_PASSO` (D-011).
3a. **Leitura em erro (D-015).** Se a última leitura terminou em `ERRO`, a rodada seguinte é de leitura de novo (uma tentativa por rodada) e nenhum passo de módulo roda sobre posição velha.
4. **Erro de passo.** `try/catch` em volta da chamada: grava `ERRO` + mensagem por `ccEscBaseRotinaPasso` e segue para o próximo. Na rodada seguinte, passo `ERRO` ou com `PENDENTES > 0` roda de novo antes dos que estão `OK`.
5. **Dia completo.** Na primeira leitura `OK` do dia, o passo recebe a ordem de rodar completo (lê `rotina.diaCompleto.<PASSO>` pelo preâmbulo, `rodadaCompleta(passo)`), e grava a data ao terminar.

### Leitura do Winthor (`ccBaseSincronizar`, passo `SINC`)

Cron, sem sessão: lê com `runQueryMitra({ sql, jdbcId })` e grava com `runDmlMitra` em lotes de
até 500 linhas. Retomável: `FASE` + `CURSOR` (último `CODCLI` gravado). Três fases (D-010): a página de
clientes (`CODCLI > cursor`, corte por `ROW_NUMBER()` em `LINHAS_POR_CONSULTA`, constante ajustada na
T-002) traz o cadastro, e as outras consultas Oracle leem a mesma faixa `CODCLI BETWEEN de AND ate`: o
cliente sai **inteiro** na página (cadastro, compras, posição, recebimentos e faturamento). O cursor é
gravado ao fim de cada página. Sem orçamento, devolve `pendentes > 0`.

| Fase | Lê (Oracle) | Grava | Regra |
|---|---|---|---|
| `PLANOS` | `PCPLPAG` inteira; departamentos | `CC_PLANO_PAGAMENTO` (upsert; ausente → `ATIVO = FALSE`); `CC_BU_DEPTO` (`INSERT IGNORE` dos departamentos novos) | — |
| `CLIENTES` | por página: cadastro do universo (01 §11) com RCA, ramo, limite, última compra; compras da janela (nº de vendas distintas, valor, Σ valor × prazo, títulos emitidos sem cancelados); títulos em aberto e itens por venda × departamento; pagamentos (40 dias; na primeira carga, desde 1º de janeiro do ano anterior); faturamento por cliente × departamento × mês (mês anterior e corrente; primeira carga desde janeiro do ano anterior) | `CC_CLIENTE` (upsert por `CODCLI`, só colunas do Winthor + `NOME_BUSCA` + `SETOR` + `ESFERA` quando `base.ramosEsfera` mapeia o ramo); as três tabelas de posição (só as linhas que mudaram, D-003); `CC_RECEBIMENTO` (`INSERT IGNORE` por `CHAVE`); `CC_FATURAMENTO_MES` (upsert) | Universo = título em aberto ou movimento desde a data **mais antiga** entre `base.syncJanelaMeses` e as janelas de recebimento e faturamento (na primeira carga, janeiro do ano anterior: cliente pago nesse intervalo também entra, B1 C-06). `setorDoRamo()`; `ESFERA` à mão não é tocada sem mapeamento (RN-010). Estorno: chave não estornada, na janela e ausente da leitura → `ESTORNADO = TRUE`; `BU_ID` = BU de maior parte. Mês da janela que não veio vai a 0. `PONTUALIDADE_PCT` dos recebimentos da página |
| `FECHAR` | — | zera posição (três tabelas) de quem não foi tocado por esta leitura e tinha saldo; contagens; `SITUACAO = 'OK'`, `FIM` | Só aqui alguém é zerado (RN-008, RN-009) |

`calcularPosicao(titulos, itens, ctx)` — `lib/base/posicao.mjs`, pura, a mesma dos títulos ao vivo:

1. Fora: título pago, saldo ≤ 0,004, cancelado, `CODCOB` em `base.cobrancasExcluidas`.
2. Partes do título por BU: proporção do valor dos itens da venda (`CODEPTO` → `CC_BU_DEPTO` → BU; sem BU ou sem venda = BU 0); 2 casas, sobra na última parte (RN-028).
3. Carteira da parte: `PUBLICA` se o cliente é público; senão a da BU; BU 0 = `PRIVADA`.
4. Vencimento efetivo da parte: `base.vencimentoDiaNaoUtil` **da carteira da parte** (valor em vigor hoje), usando o mapa data → data útil montado uma vez por rodada (`CC_FERIADO` nacional + `base.calendarioUf`, fins de semana, de −400 a +90 dias; fora da janela vale a data original).
5. Dias = hoje − vencimento efetivo; faixa por parte; `VDIAS` = Σ saldo × dias; próximo vencimento = menor efetivo ≥ hoje e a soma nele; `A_VENCER_7DU` = soma das partes com vencimento efetivo de hoje até `somarDiasUteis(hoje, 7)`, no mesmo calendário (02 bloco SALDOS, fechamento v2).
6. Agrega por cliente × BU, por cliente × carteira (com `COMPOSICAO_BU` pelo saldo em aberto, maior primeiro) e por cliente (dias de atraso = maior entre as partes; `UTILIZADO`, `DISPONIVEL`, compras, compra média, prazo médio; sem título emitido na janela, o prazo do plano).

Falha em qualquer consulta ou gravação → leitura `ERRO` com a mensagem, e a rodada seguinte começa
uma leitura nova (uma tentativa por rodada, D-015). Cada cliente já gravado está inteiro (as três tabelas dele saem no mesmo lote);
ninguém foi zerado; os passos 1 a 5 não rodam (RF-005).

### Títulos ao vivo (`ccBaseTitulosAbertos`)

`quem()` → cliente visível ao membro de `quem()` (uma consulta MySQL com `MEMBRO_A(m.membroId)` +
`clienteVisivelA('C')`, sem `EU`: vale igual na tela, aninhada sem sessão e aninhada com sessão, DT-34) → `ccBaseWinthorTitulos` (SQL Oracle com `jdbcId`,
uma linha por título × departamento) → `calcularPosicao()` no modo "linhas" (BU de maior parte,
carteira, vencimento efetivo, dias) → filtros `carteira` e `soVencidos`. Erro do Oracle:
`{ ok: true, linhas: [], total: 0, erroWinthor }` (01 §8). Nunca devolve dado guardado.

### Equipe (`ccBaseMembroSalvar`)

Validações na JS, nesta ordem, cada uma com a sua frase: `podeAdministrar(m)`; nome e e-mail
(`NOME_CHAVE` e e-mail minúsculo únicos); cargo válido; superior ativo de cargo `SUPERVISOR`,
`GERENTE` ou `DIRETORIA`; ciclo (o `CAMINHO` do superior proposto não pode conter o id do membro);
inativação (0 cliente atribuído e 0 subordinado ativo, citando as contagens).

- **Nível e caminho na SQL (B1 B-01).** Nem `NIVEL` nem `CAMINHO` vêm do parâmetro: `NIVEL` é um `CASE` pelo cargo (01 §4) e o caminho novo é o `CAMINHO` **gravado** do superior + id (`/id/` sem superior); `caminhoAntigo` tem de ser o caminho gravado do membro (conferido na guarda). A guarda também exige superior ativo de cargo que chefia, sem ciclo (o caminho do superior não começa pelo do membro), `superiorId = 0` só para o topo atual ou cargo `DIRETORIA` (troca de topo), e quem tem subordinado ativo continua ativo e com cargo que chefia (RN-011, B1 C-03).
- **Ninguém se promove (D-014).** Na JS e na guarda: o ator não altera o próprio cargo, superior, marca nem situação ("Ninguém altera o próprio cargo, superior, marca ou situação."; vale também para o topo antigo numa troca de topo); cargo de nível ≥ 3 que muda (ou membro novo) só por quem tem `NIVEL` (do cargo) igual ou maior ("Cargo de Gerente ou Diretoria só é dado por quem tem cargo de nível igual ou maior.").
- **Novo:** `ccEscBaseMembroInserir` (com `CAMINHO = ''`: até a segunda escrita o membro não vê ninguém pela hierarquia, porque os fragmentos de visibilidade exigem `CAMINHO <> ''` do ator, B1 C-01) → relê o id pelo e-mail → `ccEscBaseMembroAtualizar` grava o caminho.
- **Edição:** um `UPDATE` só: campos da linha do membro por `CASE WHEN ID = {{id}}` e o prefixo do `CAMINHO` de toda a subárvore (fórmula de 01 §6; sem mudança de superior o prefixo novo é igual ao antigo). `WHERE (ID = {{id}} OR ('{{caminhoAntigo}}' <> '' AND CAMINHO LIKE CONCAT('{{caminhoAntigo}}', '%')))`. Toda leitura de `CC_MEMBRO` dentro dessa escrita (guarda `ATOR`, superior, subordinados) está em tabela derivada com `DISTINCT` ou agregado, para o MySQL materializá-la e não dar o erro 1093 (06 §5, B1 O-02). A JS relê a linha e confere também o `CAMINHO`.
- **Sem superior:** recusado ("já existe o topo"), salvo a **troca de topo**: membro existente, ativo, de cargo `DIRETORIA`, com `superiorId = 0`. Duas chamadas de `ccEscBaseMembroAtualizar`, nesta ordem: (1) o novo topo e a subárvore dele passam a `/<novo>/…`; (2) o topo antigo e o resto passam a `/<novo>/<antigo>/…` com `SUPERIOR_ID = novo` no antigo. A ordem importa: depois de (1), as linhas do novo topo já não casam com o prefixo antigo.
- Marcar ou desmarcar `admin` (valor diferente do gravado): só quem **já tem a marca** (`m.admin`, não `PODE_ADMINISTRAR`), com a guarda `A.ADMIN = TRUE` repetida na `ccEsc…` quando a marca muda; Gustavo (Gerente, sem a marca) é recusado com "Só quem tem a marca de Administrador pode marcá-la ou desmarcá-la.". O último membro ativo com a marca não a perde nem é inativado (01 §4): recusa "É preciso manter ao menos um Administrador.", conferida na JS e na guarda da `ccEsc…` (`EXISTS` de outro membro ativo com `ADMIN = TRUE` quando a marca sai ou `ATIVO` vira 0).

### Atribuição (`ccBaseClienteAtribuir`)

Até 20 ids. JS: `NIVEL_MIN(2)` (nível ≥ 2 ou a marca `ADMIN`); lê clientes e destino numa consulta; cada
cliente visível ao ator (não visível = "Cliente não encontrado."); destino ativo, cargo `AGENTE`,
`SUPERVISOR` ou `GERENTE`, no caminho do ator (ou qualquer um, para quem vê tudo); `agenteId = 0` e
cliente sem agente só para quem vê tudo (RN-014). Qualquer recusa = nada gravado. Depois
`ccEscBaseClienteAgente` (um `UPDATE … WHERE FIND_IN_SET(ID, '{{ids}}')` com a visibilidade repetida
na guarda) e `auditarLinhas('Atribuição', 'CLIENTE', …)`, uma linha por cliente que mudou de fato.
O responsável dos cards é reconciliado pelos passos dos donos dos quadros (01 §11), não aqui.

### Parâmetros (`ccBaseParametroSalvar`)

1. `podeAdministrar(m)`; chave `alcada.*` no lote só com `m.nivel >= 3` (D-014; repetido na guarda de `ccEscBaseParametro`). Lê o catálogo e os valores inteiros (DT-46).
2. Por item: chave existe; `carteira` ∈ `''`, `ESTETICA`, `PUBLICA` e só com `POR_CARTEIRA`; tipo, mínimo, máximo, opções; `vigenciaInicio ''` = hoje (data diferente de hoje só com `COM_VIGENCIA`); `valor` nulo na carteira = herdar; `valor` nulo na linha padrão = padrão do catálogo como vigência nova.
3. Aplica o lote em memória sobre o conjunto em vigor **de cada carteira afetada** (mudança na linha padrão é conferida também para `ESTETICA` e `PUBLICA`, que herdam) e roda o `validarConjunto()` de **todos** os grupos com o conjunto efetivo inteiro (DT-46, 17/11): a regra cruzada vale nos dois sentidos (`painel.sincAtrasoMin ≥ base.syncIntervaloMin` recusa o painel e a base). `vigenciaInicio` anterior a hoje é recusada (JS e guarda de `ccEscBaseParametro`: mudar parâmetro não reescreve mês fechado).
4. `ccEscBaseParametro`: um `INSERT … SELECT` por listas alinhadas com `ON DUPLICATE KEY UPDATE` (mesma chave + carteira + vigência substitui).
5. Auditoria: uma linha por item cujo valor em vigor mudou; `CAMPO` = chave (com `@CARTEIRA` quando não é a padrão), antes e depois = valor em vigor.

Grupo com mais de 20 chaves alteradas é gravado pela tela em chamadas de 20, na ordem do catálogo
(`ponytail:` a validação cruzada vê um lote por vez; `alcada`, `cob` e `jur` passam de 20 chaves —
subir o teto para 40 se uma restauração de grupo for recusada no meio).

### Contato (`ccBaseContatoSalvar`, `ccBaseContatosRevisar`)

Cliente visível; ao menos um canal; e-mail `nome@domínio.ext`; situação válida; principal não pode
ser `NAO_USAR`. Primeiro contato do cliente nasce principal. Marcar principal: o
`ccEscBaseContatoAtualizar` é um `UPDATE` sobre o contato e o principal anterior
(`WHERE CLIENTE_ID = … AND (ID = {{id}} OR PRINCIPAL = TRUE)`, campos por `CASE`), para nunca haver
dois. Novo contato principal: insere e chama o atualizar. Tirar a marca do único principal é
recusado. Toda gravação termina com `ccEscBaseContatosRevisar` (renova a revisão, RN-021).
`ATUALIZADO_EM` só muda no contato que mudou. `BUSCA` (nome + e-mail + telefone, maiúscula sem
acento, a mesma normalização de `montarBusca`) é calculada pela JS e gravada por
`ccEscBaseContatoInserir`/`ccEscBaseContatoAtualizar` na mesma instrução.

### E-mail (`ccEmailEnviar`) e modelo

Regras em 01 §13. Ordem: `quem()` (aceita aninhada e rotina) → cliente visível ao membro de `quem()`
por `MEMBRO_A`, sem `EU` (rotina não confere; DT-34) → modelo ativo → efeito legal com validação vigente → destinatário → `renderizar()`
(campos comuns da posição total, ou da carteira com `extras.carteira`; dinheiro `R$ 1.500,00`, data
`dd/mm/aaaa`; `faltando[]` não vazio = recusa) → `montarEmail` (inlinado como a lib faz) →
`sendEmailMitra` em `try/catch` → `ccEscBaseEmailInserir` (`ENVIADO` ou `FALHOU` + erro) → auditoria
área `E-mail`. Recusa antes do envio não grava `CC_EMAIL_ENVIADO`. Lote de 5 é de quem chama.

### Acessos (`ccBaseAcessosConciliar`, passo `ACESSOS`)

1. `CC_MEMBRO.USER_ID` ← `INT_USER.ID` pelo e-mail, onde difere.
2. Para cada quadro em `CC_FASE` (`DISTINCT QUADRO, BOARD_ID`): a coluna da tabela de 05 §2 sai do slug — começa com `cobranca-` → `cobranca-*`; começa com `concessao-` ou é `pedidos-limite` → `concessao-*`; começa com `juridico` → `juridico`; outro slug → só `ADMINS_IDS`. Monta `ADMINS_IDS` (`USER_ID` de todo membro ativo com `PODE_ADMINISTRAR`: Gerente, Diretoria e a marca `ADMIN`, 05 §2) e `ACESSO_JSON` (`padrao: 'restrito'`; em `pessoas`, só quem não é restrito na coluna e não está em `ADMINS_IDS`: `cobranca-*` Supervisor `membro` e Jurídico `leitor`; `concessao-*` Supervisor `membro`; `juridico` Supervisor e Jurídico `membro`, DT-35), preservando chaves que não conhece (`semEmail`); compara com o atual e grava **só se mudou** (única escrita direta em `KB_`, isolada aqui). Membro inativo ou sem usuário sai de `pessoas` e de `ADMINS_IDS`.
3. Sem quadro instalado: termina `OK` com 0 processado. S-15 (01 §15): se o sandbox confirmar, este passo também põe o usuário do membro no perfil da plataforma; senão, o perfil é refeito rodando o `add-090` e o cadastro avisa "o acesso vale depois da próxima publicação do perfil".

### Ganchos e quadros (`lib/quadros.mjs`)

- `semearQuadro(QUADROS)` segue 05 §1 regra 1 e lê `QUADROS` no formato fixo de 01 §14 (DT-32): `{ slug, nome, descricao, config, fases, campos, etiquetas, automacoes }`; fase = `{ chave, nome, tipo ('comum' | 'sucesso' | 'cancelado'), slaHoras, cor ('data-1'…'data-8'), descricao, condicao, capa, campos }`, com `ORDEM` = posição no array; campo = `{ chave, label, tipo, noCard, editavelDepois, config }` (nunca obrigatório). `condicao` (o `CONDICAO_JSON` da lib) vem escrita com a **chave** do campo/fase e `semearQuadro` troca pelo id; `capa` = chaves de campo que a fase acrescenta à capa (`KB_FASE.CAPA_JSON`); `noCard: true` num campo sem fase = capa de todas as fases. `CC_FASE.FINAL` é derivado (`tipo <> 'comum'`), não se declara. A 005 não exporta `QUADROS`.
- `gancho(slug)` devolve **texto** com zero ou mais cláusulas `WHEN <condição> THEN '<motivo>'` sobre os apelidos `M` (`CC_MEMBRO` ativo com `USER_ID = {{usuarioId}}`, pode ser nulo), `K` (`KB_CARD` de `{{cardId}}`), `DE` (`CC_FASE` de `K.FASE_ID`) e `PARA` (`CC_FASE` de `{{faseId}}`); o domínio entra por subconsulta ligada a `K.ID`. Na cláusula valem `PODE_ADMINISTRAR`/`NIVEL_MIN(n)` com `M` no lugar de `A` e `membroVisivel` com `M`.
- `ccPodeMover` = a SQL de 01 §14: `SELECT CASE WHEN X.MOTIVO = '' THEN 1 ELSE 0 END AS PODE, X.MOTIVO FROM (SELECT CASE WHEN M.ID IS NULL THEN 'Usuário sem vínculo na equipe.' WHEN PARA.QUADRO = '<slug>' THEN (CASE <cláusulas> ELSE '' END) … ELSE '' END AS MOTIVO FROM (SELECT 1 AS U) U1 LEFT JOIN KB_CARD K … LEFT JOIN CC_FASE DE … LEFT JOIN CC_FASE PARA … LEFT JOIN CC_MEMBRO M …) X`. Um `WHEN PARA.QUADRO = '<slug>'` por quadro com trecho; `gancho()` que devolve texto vazio não entra no `CASE`. O quadro é reconhecido pelo slug em `CC_FASE.QUADRO`, não pelo id (muda entre ambientes). Quadro sem arquivo cai no `ELSE ''` (`PODE = 1`). Dois arquivos no mesmo quadro (`concessao-publica`: 004 e 005): as cláusulas são concatenadas na ordem 004 → 005 dentro do mesmo `CASE`; a primeira que recusa responde.
- `ccPodeExcluir`: constante (04 §1).
- `add-010-base.mjs` importa os `lib/quadros/NNN-*.mjs` que existirem (leitura do diretório no carregamento, em ordem de nome); spec sem o arquivo (a 007 não tem `lib/quadros`, `lib/parametros` nem `lib/modelos`) é simplesmente pulada, aqui e no `setup-backend.mjs` (01 §9). Com só a 001, a SQL tem só o ramo "sem vínculo" e o padrão.

## Simulador

- **Integrador (T-003 a T-011):** tudo de 06 §1, §3 e §4. Pontos que este plano fixa: `DDL_SOURCES` = `schema/*.mjs` + schema da lib + `schema-winthor.mjs`; `PUBLISH_ORDER` = `add-001-kanban`, `add-002-jdbc-winthor`, `add-010` … `add-070` (os que existirem); tabela `ALL_TAB_COLUMNS` preenchida do próprio `schema-winthor.mjs` (para `ccBaseWinthorDescobrir`); `sendEmailMitra` grava em `SIM_EMAIL` e falha para destinatário `@falha.test`; `smoke/base.mjs` oferece `teste`, `como` (`como(null, fn)` = sem sessão, como cron ou aninhada), `rodarCron` (apaga `CC_ESTADO['rotina.trava']` antes de chamar, 06 §1), `nasDuasSessoes(fn)` (roda `fn` com `SIM_SESSAO_ANINHADA` 0 e 1 e afirma o mesmo resultado, 06 §3), `execucoes`, `pular`, `substituir(nome, definicao)` (dublê de SF de outro módulo) e `winthorFora(fn)` (renomeia uma `PC*` durante a função). Relógio: cada smoke exporta `RELOGIO` (sem export = D, 06 §1); o banco do `sim` usa D; `relogio.mjs` (`fixarRelogio`, `comRelogio`) grava `CC_AGORA`.
- **Pipeline do banco (06 §2.3, DT-38):** `seed.mjs` exporta `montarBanco({ seeds, relogio, quadros, atribuicao, ate })`, a mesma para o `sim` e para `smoke/base.mjs`: (1) DDL de todos os módulos presentes; (2) elenco; (3) `semearQuadro(QUADROS)` de cada `lib/quadros/NNN-*.mjs` presente, na ordem das specs, e depois os `quadros` extras (os `QUADROS_TESTE` que o smoke exporta) — a mesma função que o `add-0N0` chama na publicação, porque o runtime só carrega `definitions`; (4) `fixarRelogio(T0)`, T0 = menor `INICIO` dos seeds ou o `relogio`; (5) `winthor()` de cada seed; (6) `rodarCron('ccRotina')` até a leitura `OK`; (7) `atribuir(atribuicao)`; (8) `rodarCron` até o processamento terminar (todos os passos `OK`, sem `pendentes`); (9) `passado()` dos seeds e, com T0 < `relogio`, `fixarRelogio(relogio)` + `rodarCron` até leitura e processamento; (10) `dominio()` de cada seed; (11) `ccBaseSincronizacaoPedir` como Gustavo + `rodarCron` até leitura e processamento. `ate: n` para depois do passo n (só o teste do pipeline usa). Smoke que exporta `BANCO_POR_TESTE = true` recebe uma cópia do banco do passo 11 em cada `teste()`; sem o export, o arquivo divide um banco.
- **Elenco (`seed/000-elenco.mjs`):** 06 §2.1 e §2.2; parâmetros e modelos pela **mesma fusão** do `setup-backend.mjs` (`lib/parametros.mjs` com `vigencias` e `carteiras`, 01 §9; `semearModelos()`); `CC_FILIAL_CREDORA` só se a tabela da 003 existe (senão pula). Ajudantes `dia(n)`/`diaUtil(n)` contados do `RELOGIO` do banco (o pipeline o fixa antes de chamar os seeds), `nota()` (aceita `numnota`) e `atribuir(linhas = ATRIBUICAO)`: `ATRIBUICAO` = coluna Agente de 06 §2.4 + linha "Atribuição" de 06 §2.5, e o pipeline soma a `ATRIBUICAO` exportada por cada seed declarado (06 §2.3, fechamento v2); agente por `ccBaseClienteAtribuir` como Gustavo (um lote de até 20 por agente), analista por `ccEscBaseClienteAnalista` com o `membroId` de Gustavo (`ccBaseClienteAtribuir` só grava agente); linha de cliente ausente de `CC_CLIENTE` (seed não declarado) é pulada.
- **Seed da 001 (`seed/001-base.mjs`):** `winthor()` com os clientes 1001 a 1012 de 06 §2.4 no Winthor simulado. Completa o que a tabela não fixa: emissões do 1001 em `dia(-42)`, `dia(-33)`, `dia(-25)`, `dia(-10)` e `dia(-60)` (todas com 30 dias de prazo; a paga é da Nutrição), cancelada em `dia(-70)`; plano 35 e RCA 10 no 1001; 1011 com um título pago há 730 dias. Não grava `CC_CLIENTE` (nasce na leitura do passo 6; os agentes vêm do passo 7). `dominio()`: contato do 1002 por `ccBaseContatoSalvar` como Ana dentro de `comRelogio(dia(-181), …)` (revisão em `dia(-181)`, aponta `CC_CLIENTE.ID`, por isso não fica no `winthor()`) e dois modelos de teste em `CC_MODELO_MENSAGEM`, tabela da própria 001 (`TESTE_AVISO` sem efeito legal; `TESTE_LEGAL` com efeito legal e extra `DATA_LIMITE`, não validado). Sem `INICIO` nem `passado()`.
- **`CHECK_INPUT`** (entradas novas): `setor`, `carteira`, `agenteId`, `analistaId`, `buId: -1`, `uf`, `tipoPessoa`, `soVencidos`, `ordem: 'NOME'`, `situacaoFicha`, `soPrincipais`, `dia`, `gerarAno`, `remover`, `clienteId: 1`, `codcli: 1001`, `meses: 12`, `cargo`, `ativo: -1`, `semBu`, `grupo`, `data`, `chave: 'crit.atrasoCritico'`, `ano`, `specDona`, `codigo`, `origem`, `entidade: 'CLIENTE'`, `entidadeId: 1`, `area`, `membroId`, `de`, `ate`, `usuarioId: 1`, `cardId`, `boardId`, `faseId`, e as das `ccEsc…`.
- **Dialeto:** nada além da lista de 06 §5. Oracle em `winthor-sql.mjs`: `NVL`, `TO_DATE`, `TO_CHAR`, `TRUNC`, `SYSDATE`, `ROW_NUMBER() OVER` (nativo no SQLite).

## Testes

Backend: `backend/simulator/smoke/001-base.mjs`, que exporta `RELOGIO = '2026-11-19T10:00:00'` (D),
`QUADROS_TESTE` (os quadros `cobranca-teste` e `juridico-teste` do C-033, no formato de 01 §14, com slugs
que não colidem com os 8 de 05) e `BANCO_POR_TESTE = true`. O banco é montado uma vez pelo pipeline
(elenco + seed da 001, nenhum outro declarado) e **cada `teste()` começa de uma cópia dele**, no estado do
passo 11: leitura `OK`, processamento feito, clientes atribuídos. Nenhum teste depende de outro; o que um
cenário pressupõe de outro (C-024 do C-022 e do C-023, C-026 do C-014 e do C-018) é refeito dentro do teste.
"Leitura" nas linhas abaixo = `ccBaseSincronizacaoPedir` como Gustavo + `rodarCron('ccRotina')` até `OK`.
Rodam em `nasDuasSessoes` (`SIM_SESSAO_ANINHADA` 0 e 1, DT-34 regra 5) toda escrita com efeito em card
(C-033) e as JS da 001 chamadas aninhadas: `ccBaseTitulosAbertos` e `ccBaseModeloPrever` (C-007) e
`ccEmailEnviar` (C-024). Frontend: `frontend/tests/001-base.test.mjs`.

| Cenário / regra | Arquivo | O que o `assert` verifica |
|---|---|---|
| C-001 · RN-001, 003 a 006, 030 | smoke | `CC_POSICAO_CLIENTE` do 1001 após a leitura: `VENCIDO` 1500.00, `A_VENCER` 3100.00, `DIAS_ATRASO` 12, `VENC_MAIS_ANTIGO` `dia(-12)`, `PROX_VENC` `dia(5)`, `PROX_VENC_VALOR` 2300.00, `A_VENCER_7DU` 2300.00 (o 800 de `dia(20)` fica fora), `TITULOS_ABERTOS` 5, `TITULOS_VENCIDOS` 2, `LIMITE` 10000, `UTILIZADO` 4600.00, `DISPONIVEL` 5400.00, `COMPRAS_QTD` 5, `COMPRAS_VALOR` 5300.00, `ULTIMA_COMPRA` `dia(-10)`, `COMPRA_MEDIA_MENSAL` 1766.67, `PRAZO_MEDIO_DIAS` 30, `PONTUALIDADE_PCT` 0.00, `VDIAS` 13500.00; 1005 com `PONTUALIDADE_PCT` nulo |
| RN-002 | smoke | 1005: `VENCIDO` 0, `DIAS_ATRASO` 0, `A_VENCER` 600.00, `PROX_VENC` hoje, `PROX_VENC_VALOR` 600.00, `A_VENCER_7DU` 600.00 |
| C-002 · RN-007 | smoke | duas leituras → `ccBaseRecebimentoListar(1001)` 1 linha (700.00, `DIAS_ATRASO_PAGAMENTO` 2); paga o de 500 + leitura → 2 linhas, `VENCIDO` 1000.00; anula o `DTPAG` do 700 + leitura → lista com 1 linha, `ESTORNADO` na tabela, `RECEBIMENTOS_ESTORNADOS` 1, `VENCIDO` 1700.00, `DIAS_ATRASO` 30 |
| C-003 · RN-010 | smoke | antes: `ccBaseClienteTotal` (Gustavo) 11, `SEM_AGENTE` 2; grava no Winthor simulado o 1013 (ramo 3, GO; `PCCLIENT` + um título a vencer em `dia(10)` pelo `nota()`) e troca `CODUSUR1` do 1004 para 11; leitura → 12, `CLIENTES_NOVOS` 1; 1013 `AGENTE_ID` nulo; 1004 `RCA_COD` 11 e agente Bruno; 1011 ausente; `SEM_AGENTE` 3 |
| C-004 · RN-008 | smoke | 1002 2500.00/8 → paga + leitura → zeros e `PROX_VENC` nulo em `CC_POSICAO_CLIENTE`, na linha da BU 1 e na da carteira `PRIVADA`; `ALTERADO_EM` mudou |
| C-005 · RN-009 | smoke | `winthorFora` + leitura → `SITUACAO` `ERRO`, `ERRO` não vazio; 1001 com 1500.00 e o `SINCRONIZADO_EM` anterior; nenhuma linha de `CC_ROTINA_PASSO` para essa leitura; `ccBaseSincronizacaoStatus` com `MINUTOS_DESDE` contado da última `OK`; nova rodada com o Winthor fora → uma leitura nova, em `ERRO`, e 1001 igual (D-015) |
| C-002 · RN-007 (B1 C-06) | smoke | apaga `CC_RECEBIMENTO` e `CC_FATURAMENTO_MES` (primeira carga de novo); 1014 só com título pago há 400 dias → entra em `CC_CLIENTE` com o recebimento; 1011 (730 dias) continua fora |
| C-005 · RF-006 | front | `situacaoDaPosicao({ minutosDesde: 31, intervaloMin: 15 })` → `'desatualizada'`; 29 → `'atual'`; sem leitura → `'nunca'` |
| C-006 · RF-008 | smoke | `fixarRelogio` + `rodarCron`: +10 min sem leitura nova; +16 lê; `ccBaseSincronizacaoPedir` (Sérgio) com +10 → próxima rodada lê; segundo pedido → `ok: false` /pendente/; Ana → `ok: false`; linha `EM_ANDAMENTO` com `INICIO` −40 min → `ERRO` /interrompida/ e leitura nova; `LINHAS_POR_CONSULTA` e orçamento reduzidos → leitura termina em mais de uma rodada com a mesma posição do C-001; `ccBaseSincronizacaoListar` (Gustavo) da mais recente para a mais antiga, com as contagens, e `…Total` igual; Sérgio → 0 linha; RF-001: `base.syncIntervaloMin` 30 (Nara) → +16 min sem leitura nova, +31 lê |
| C-007 · RF-010 | smoke | Ana: `ccBaseClienteFicha(1001)` → `cliente.DOCUMENTO` '12345678000190', `posicao.LIMITE` 10000, plano '28/35/42 DIAS', `RCA_NOME` 'CARLOS LIMA', `porBu` 3, `porCarteira` 1; `ccBaseTitulosAbertos` → 5 linhas, `DIAS_ATRASO` 12 e 3, `BU_ID` preenchido; `winthorFora` → `erroWinthor` e 0 linhas, ficha intacta; 1006 → `'Cliente não encontrado.'` nas duas. Aninhada (DT-34): `como(null)` com `membroId` de Ana → as mesmas 5 linhas; com o de Silvia → `'Cliente não encontrado.'`; em `nasDuasSessoes`, uma JS de teste (`substituir`) chamada como Ana que repassa o `membroId` dela → as mesmas 5 linhas nas duas; `ccBaseModeloPrever('TESTE_AVISO', 1001)` pelos mesmos três caminhos → o corpo de Ana nos dois de Ana e recusa no de Silvia |
| RF-012 | smoke | Gustavo: `ccBaseClienteFicha({ codcli: 1011 })` → `cliente` nulo, `foraDoSistema` true, `winthor.codcli` 1011 e `winthor.nome` 'CLIENTE SEM MOVIMENTO LTDA' (lido por `ccBaseWinthorCliente`); `ccBaseClienteFicha({ documento: '10110000000110' })` (CNPJ do 1011, 06 §2.3) → o mesmo; Nara idem; Sérgio e Ana → `'Cliente não encontrado.'` |
| C-008 | smoke | Ana: `busca` 'SAO LUCAS', '12345678000190', '1001' → 1001; vazia → 3 e total 3; `soVencidos 1` → 3; Gustavo `agenteId -1` → 2; Total de Gustavo: 11, `VENCIDO` 27400.00, `A_VENCER` 5600.00, `EM_ATRASO` 8, `MAIOR_ATRASO` 60 |
| C-008 | front | `normalizarDocumento`, `formatarDocumento` (CNPJ e CPF), `montarBusca('são lucas')` → 'SAO LUCAS', `montarBusca('12.345.678/0001-90')` → '12345678000190' |
| C-009 · RN-012 | smoke | Lista = total por usuário: 3, 3, 2, 2, 7, 11, 11, 11, 0, 0; `visivel(m, cliente)` do preâmbulo dá o mesmo para 11 × 10; após `ccEscBaseClienteAnalista(1003, Rita)` Rita vê 1; após `ccEscBaseClienteJuridico(1004, 1)` Júlia vê 1 |
| C-009 · RN-012 (B1 C-05) | smoke | analista: Ana põe Carlos no 1001 → nada; põe a si mesma → grava; Ana limpa → nada; Gustavo põe Júlia, Otávio (inativo) ou id inexistente → nada; Sérgio põe Rita e limpa → grava. Jurídico: Ana e Sérgio marcam → nada; Júlia marca o 1001 (que não vê) → grava; Ana desmarca → nada; Gustavo desmarca → grava |
| RN-012 (B1 C-01) | smoke | `ccEscBaseMembroInserir` direto (Nara) cria o membro do visitante com `CAMINHO` '' → lista e total do visitante 0; `visivel()` com caminho vazio 0 |
| C-009 · pipeline (DT-38) | smoke | banco próprio: `montarBanco` com a atribuição de teste "1003: agente Ana, analista Rita" e `substituir('ccCobRotina', dublê)` que, no passo 8, cria o card do 1003 em `cobranca-teste` com responsável = usuário do `AGENTE_ID` do cliente naquele momento → 1003 com `AGENTE_ID` Ana e `ANALISTA_ID` Rita (agente por `ccBaseClienteAtribuir` como Gustavo, analista por `ccEscBaseClienteAnalista` com o `membroId` de Gustavo); card com Ana responsável; Rita vê o 1003 |
| C-010 · RN-013 | smoke | visitante e Otávio: `ccBaseSessao.membro` nulo; lista 0; `ccBaseContatoSalvar` → /não faz parte da equipe/; `ccEscBaseContatoInserir` chamada direto → 0 linha nova |
| C-011 · RN-011 | smoke | `ccBaseMembroSalvar` recusados: /nome/, /topo/ (Diana), /Supervisor, Gerente ou Diretoria/, /ciclo/, /e-mail/ (Nara), /ao menos um Administrador/ (Gustavo inativa Nara, a única com a marca); Sérgio a Agente → /3 subordinados ativos/ e `ccEscBaseMembroAtualizar` direto (Gustavo) → `CARGO` igual; `CC_MEMBRO` com 11 linhas |
| C-011 · RF-017 | front | `montarEquipes(elenco)` → direção [Diana, Gustavo]; Sérgio [Ana, Bruno, Rita, Otávio `inativo`], 7 clientes; Silvia [Carlos], 2; diretos [Júlia, Nara] |
| C-012 | smoke | Diana cria Roberto (→ Diana; Diretoria só por Diretoria, D-014); Diana o põe no topo → /próprio/ (ela mudaria de superior); Nara salva com `superiorId 0` → Roberto `/12/`, Diana `/12/1/` e `SUPERIOR_ID` 12, um só membro sem superior, os outros com o mesmo superior e `CAMINHO` começando por `/12/1/`; contagens do C-009 iguais; `ccBaseEquipeConferir` sem inconsistência |
| C-013 | smoke | inativar Bruno → /3 clientes/; Sérgio → /3 subordinados/; redistribui os 3; Bruno `ATIVO` 0 |
| C-014 · RN-014 | smoke | Sérgio move 1004 e 1005 → Ana 5, Bruno 1; 2 linhas de Sérgio em `CC_AUDITORIA` área `Atribuição` (`ANTES` 'Bruno Dias', `DEPOIS` 'Ana Costa', `POR_NOME` Sérgio, `CLIENTE_ID` de cada um); 1006 → recusa; destino Carlos → recusa; Ana → recusa; Gustavo 1009 → Carlos 3; Sérgio `agenteId 0` → recusa; 21 ids → recusa; 1003 sem agente visível a Sérgio pela analista Rita → /sem agente/ e `ccEscBaseClienteAgente` direto → nada; Gustavo → aceito (B1 C-04) |
| C-014 · RNF-006 | smoke | 9 clientes novos + leitura → 20 em `CC_CLIENTE`; Gustavo atribui os 20 a Ana → `execucoes()` ≤ 12, 20 com Ana, 17 linhas novas de auditoria |
| C-015 · RN-015 | smoke | `crit.atrasoCritico` `ESTETICA` 45 → `parametros('ESTETICA')` 45, `('PRIVADA')` e `('PUBLICA')` 30, `PARAM()` em SQL igual; `ccBaseParametroListar(carteira 'ESTETICA')` sem sessão → `VALOR_EFETIVO` 45 com `VIGENCIA_INICIO` da linha da Estética e `PADRAO` 30; valor nulo → 30 |
| C-016 · RN-015 | smoke | `com.politicaVersao` 5.3 em 2027-01-01, depois 5.4 na mesma data → `parametros('', '2026-11-19')` 5.2; `('', '2027-01-02')` 5.4; histórico 2 linhas; 2 auditorias |
| C-017 · RN-016 | smoke | 7 recusas com /mais brando/ (×3), /múltiplo de 5/, /0 a 100/, /não podem diminuir/, /obrigatório/; ramos e prefixo vazios → recusa; lote `alerta 40 + crítico 50` aceito nas duas ordens; lote `alerta 40 + intervalo 7` → `CC_PARAMETRO` com o mesmo nº de linhas; `ccBaseParametroListar` → as 38 chaves `SPEC_DONA = '001'` com padrão, carteira e vigência transcritos de 03 §1–3, §8 no teste (não da fonte da semeadura) |
| C-018 · RN-017 | smoke | 30 → 35 → restaurar → 30 (2 auditorias, Nara); 85 e 2 → restaurar grupo `crit` → 90 e 1 (6 no total); histórico de `crit.atrasoCritico` com 2 linhas |
| C-018 · RNF-006 | smoke | 20 chaves com valor gravado fora do padrão; restaurar as 20 num lote → `execucoes()` ≤ 12, 20 linhas novas de auditoria, as 20 no padrão |
| C-019 | smoke | Ana: parâmetro, membro, feriado, BU, departamento e modelo → 6 recusas /Gerente, Diretoria ou Administrador/; Sérgio: parâmetro → mesma recusa; Gustavo (Gerente, sem a marca): as 6 aceitas, todas regravando o que já está (parâmetro no valor em vigor, Bruno e a BU Nutrição sem alteração, `gerarAno` 2026, departamento na mesma BU, modelo com o mesmo texto), para não mexer nos outros testes; Nara (Agente + `ADMIN`): parâmetro aceito do mesmo modo; `ccEscBaseParametro` direto por Ana → 0 linha nova; Gustavo marca `admin` em Bruno → /só quem tem a marca/ e `ADMIN` 0; Nara marca → `ADMIN` 1, e desmarca de volta |
| C-019 · B-01 (B1) | smoke | `ccEscBaseMembroAtualizar` direto: Nara em si mesma com `nivel` 5 (e com cargo Diretoria) → linha igual; Gustavo põe `caminhoNovo` '/' na Ana (com e sem `caminhoAntigo`) → linha igual, Ana vê 3; Ana sob Silvia → `CAMINHO` '/1/2/4/5/'; superior que não chefia ou ciclo → nada |
| C-019 · D-014 | smoke | Nara e Gustavo mudando o próprio cargo → /próprio/ (e direto → nada); Nara põe Sérgio Gerente e Gustavo põe Sérgio Diretoria → /nível igual ou maior/ (e direto → nada); Gustavo põe Gerente → `NIVEL` 3; Diana põe Diretoria → 5; chave `alcada.*` de teste: Nara → /alçada/ e `ccEscBaseParametro` direto → 0 linha; Gustavo → grava |
| C-020 · RN-018 | smoke | 1007 `SETOR` `PUBLICO`, linha `PUBLICA` com 12000.00 e BU 1; 1012 `PRIVADO`/`F`; `nota()` do 1008 com produto 901 → BU 0 com 200.00, `ccBaseBuDeptoListar(semBu 1)` traz o 90; liga à BU 2 + leitura → BU 2; `ccBaseClienteClassificar` (Sérgio) mantido após leitura; `base.ramosPublicos` '11,12' → público; + prefixo 'XYZ' → `PRIVADO`, saldo na `PRIVADA`; BU nova (Nara) aparece em `ccBaseBuListar` e, inativada, continua lá com `ATIVA` 0 (RF-028: não existe exclusão); DT-41: `ccBaseClienteClassificar` (Silvia) no 1008, da equipe de Sérgio → `'Cliente não encontrado.'` e `GRUPO_ECONOMICO` inalterado |
| C-021 · RN-019, 020 | smoke | funções de `lib/dias-uteis.mjs` com os feriados de `ccBaseFeriadoListar`: os 5 casos da spec; gerar 2026 duas vezes (`gerarAno`, uma `ccEscBaseFeriadosInserir` por chamada) → 13 nacionais com 16/02, 17/02, 03/04, 04/06; remover o Carnaval → 17/02 volta a ser útil |
| C-021 · RN-019 | front | os mesmos 5 casos em `lib/base/dias-uteis.ts` |
| C-022 · RN-021 | smoke | 1001: 2 contatos, Marta `PRINCIPAL`, `SITUACAO_FICHA` `EM_DIA`, revisada por Ana; recusas /telefone, WhatsApp ou e-mail/, /e-mail inválido/; Recepção principal → Marta não; principal `NAO_USAR` → recusa; lista: 1002 `VENCIDA`, 1004 `NUNCA`; `ccBaseContatosRevisar(1002)` → `EM_DIA`, `ATUALIZADO_EM` do contato igual; `ccBaseContatoListar` de todos os clientes (Ana, `clienteId 0`, `busca` 'MARTA', casando `BUSCA`) → 1 e `ccBaseContatoTotal` → `TOTAL` 1 |
| C-023 · RN-022 | smoke | `TESTE_AVISO` versão 1 → 2; `[XYZ]` → /XYZ/; `TESTE_LEGAL`: envio /aguardando validação/; Ana valida → recusa; Júlia valida → `SITUACAO_VALIDACAO` `VALIDO` e envio ok; editar → versão 2, recusa; `VALIDADO_EM` de 13 meses atrás → `VENCIDA`, recusa |
| C-024 · RN-023 | smoke | prepara no próprio banco: Ana grava Marta (principal, marta@hsl.com.br) no 1001, Nara grava no `TESTE_AVISO` o texto do C-023 e Júlia valida o `TESTE_LEGAL`. Ana envia `TESTE_AVISO` ao 1001 → `resultado` `ENVIADO`, 1 linha em `SIM_EMAIL` para marta@hsl.com.br, `CORPO` exato com `dia(-12)` em `dd/mm/aaaa`; 1010 → /Sem e-mail cadastrado/, `SIM_EMAIL` igual; `TESTE_LEGAL` validado sem `DATA_LIMITE` → recusa com `faltam` ['DATA_LIMITE']; contato `x@falha.test` → `FALHOU` com `ERRO`; 1006 → recusa; `ccBaseModeloPrever` = corpo enviado; assunto de 400+ caracteres → gravado com 300 (VARCHAR(300) em modo estrito, B1 C-08); `ccBaseEmailListar(1001)` mais recente primeiro; `execucoes()` ≤ 12; em `nasDuasSessoes`, uma JS de teste (`substituir`) chamada como Ana que repassa o `membroId` dela → `ENVIADO`, registrado como enviado por Ana, nas duas |
| C-025 · RN-024 | smoke | registrar PDF 5 MB → listado; 26214400 bytes → /20 MB/; `.exe` → /PDF, PNG, JPG, XLSX ou DOCX/; remover (Ana) → lista vazia, 1 auditoria área `Anexos`; Bruno remove anexo do 1001 → recusa |
| C-025 | front | `validarArquivo({ nome, tamanho })`: 25 MB e `.exe` com as mesmas frases; PDF de 5 MB ok |
| C-026 · RN-025 | smoke | prepara no próprio banco: Sérgio move 1004 e 1005 para Ana (como no C-014) e Nara faz as 6 gravações do C-018. Gustavo: `membroId` Sérgio → 2; `area` 'Parâmetros' → 6; `clienteId` do 1004 → 2 (a atribuição do passo 7, por Gustavo, e a de Sérgio); Ana → 0 linha; nenhuma definition contém `UPDATE CC_AUDITORIA` nem `DELETE FROM CC_AUDITORIA` |
| C-026 | front | `agruparPorDia(8 registros)` → 2 grupos com `fraseDoRegistro`; `agruparPorItem` → 5 grupos |
| C-027 · RF-042 | front | `menuDoMembro` com e sem módulos entregues (lista de `Modulo` no formato de 01 §14): Ana e Sérgio sem item de administração; Nara (marca) e Gustavo (Gerente, sem a marca) com os 6; módulo fora da lista → nenhum item dele; item com `pode` falso para o membro some; grupos devolvidos só `OPERACAO`, `CADASTROS`, `ADMINISTRACAO`, nessa ordem, itens por `ordem` |
| C-028 · RN-028, 029 | smoke | 1001: BU 1 `VENCIDO` 1100.00; BU 2 400.00 / `A_VENCER` 2300.00; BU 3 `A_VENCER` 800.00; `PRIVADA` 1500.00 / 3100.00, `V_1_30` 1500.00, `COMPOSICAO_BU` 'Enfermagem 59% · Nutrição 24% · Medicamento 17%'; 1010: `ESTETICA` 1100.00 e `PRIVADA` 1100.00; 1004: `V_31_60` 3000.00; `calcularPosicao` com 100,00 em três partes → 33.33, 33.33, 33.34 |
| C-029 · RN-002 | smoke | padrão: 1001 12 dias; 1007 60 dias, `V_31_60` 12000.00; `base.vencimentoDiaNaoUtil` `PUBLICA` = `UTIL_ANTERIOR` + leitura → 1007 62 dias, `VENC_MAIS_ANTIGO` 2026-09-18, `V_61_90` 12000.00, 1001 12; padrão = `PROXIMO_UTIL` + leitura → 1001 10 dias, 2026-11-09 |
| C-030 · RN-001 | smoke | 1012: 700.00 / 9; `base.cobrancasExcluidas` 'DESD' + leitura → 400.00 / 6; `ccBaseTitulosAbertos` 2 → 1 |
| C-031 · RN-031 | smoke | leitura `OK`; rodada seguinte → `ACESSOS` `OK`; `substituir('ccCobRotina', falha)` e `('ccCredRotina', pendentes 1)` → `REGUA` `ERRO` com mensagem, `CREDITO` executado com `PENDENTES` 1; nova rodada → os dois chamados de novo; sem dublê → pulados; `ccRotina` chamado duas vezes direto no mesmo minuto (sem `rodarCron`, que apaga a trava, 06 §1) → a segunda não executa passo; rodada de leitura não cria `CC_ROTINA_PASSO`; `execucoes()` ≤ 150 |
| C-032 | smoke | `ccBasePlanoListar` 3 linhas (0, 30, 35); `ccBaseFaturamentoMes(1001)`: 2026-09 BU 1 700.00; 2026-10 BU 1 1100.00 e BU 2 2700.00; 2026-11 BU 3 800.00; apaga o plano 30 no Winthor + leitura → 2 ativos |
| C-033 · pipeline (DT-38) | smoke | banco próprio: `montarBanco({ quadros: QUADROS_TESTE, ate: 3 })` → `CC_FASE` com as fases dos dois quadros de teste e `CC_SINCRONIZACAO` vazia (semeados antes da primeira rotina); o mesmo pipeline sem `ate` → `ADMINS_IDS` dos dois gravado pelo `ACESSOS` do passo 8, sem rodada extra |
| C-033 · RN-032 | smoke | `semearQuadro` (05 §1 regra 1): `cobranca-teste` tem 2 fases (`comum` com o checklist `abertura_1` `sim_nao` e `condicao` escrita com chave; `sucesso`), um campo sem fase com `noCard`, uma etiqueta, uma automação e `config` → `KB_BOARD.CONFIG_JSON`, 2 `KB_FASE`, os 2 campos, a etiqueta e a automação gravados; `CC_FASE` com `FINAL` 0 e 1 e a condição gravada com o id; fase renomeada e campo `abertura_1` excluído pela lib (como o gestor faria) + `semearQuadro` de novo → nome mantido e campo recriado. No banco entregue (o `ACESSOS` já rodou no pipeline): `ADMINS_IDS` de todo quadro de `CC_FASE` (os de teste e os de `lib/quadros` presentes) com os usuários de Diana, Gustavo e Nara (`PODE_ADMINISTRAR`); `cobranca-teste`: `pessoas` com Sérgio e Silvia `membro` e Júlia `leitor`, Ana, Bruno, Carlos e Rita fora (restritos pelo padrão); `juridico-teste`: Sérgio, Silvia e Júlia `membro`, os demais fora (DT-35); chave `semEmail` preservada; promove Bruno a Supervisor, redistribui os clientes de Carlos e o inativa → Bruno `membro` nos dois, Carlos fora; segunda rodada sem mudança não regrava; `ccPodeExcluir` → `PODE` 0 e o motivo "Casos não são excluídos; …"; `ccPodeMover` com `usuarioId` do visitante → 0 /sem vínculo/; com Ana → 1; mesmo resultado em `nasDuasSessoes`; montador com dois `gancho()` de teste no mesmo slug (ordem 004 → 005) → responde o primeiro que recusa, e `gancho()` vazio → o slug não entra no `CASE` |
| Extensões (01 §14) | front | `extensoesDe` com dois `registrarExtensao` no mesmo slug: `abasExtras` e `acoesExtras` concatenadas na ordem de registro; `conteudoDaFase` desenha os dois blocos e ignora `null`; `podeMover` devolve a primeira mensagem não nula; slug sem registro → listas vazias e `podeMover` nulo |
| C-034 | smoke | cria Paulo com e-mail sem `INT_USER`; `ccBaseEquipeConferir` (Gustavo) → `semUsuario` 1, `semSuperior` 0, `ciclos` 0, `clientesSemAgente` 2; Ana → recusa; `ccBaseWinthorDescobrir` (Nara) → `PCPREST` com as colunas e `ausentes` vazio; Ana → recusa |
| RN-026 | smoke | `hoje()`/`agora()` de `tempo.mjs` com `CC_AGORA` e com relógio real nos dois instantes; `somarMeses('2026-11-30', 3)` → '2027-02-28' |
| RN-027 | front | `formatarParametro` nos 4 casos |
| RNF-006 | smoke | `execucoes()`: abrir a ficha (ficha + títulos + recebimentos e `…Total` + status) ≤ 6; afirmações de ≤ 12 nos lotes cheios de C-014 (20 clientes) e C-018 (20 parâmetros) e em C-024 (cabem no teto de 20 por clique, 01 §10); de ≤ 150 em C-031 |
| RNF-005 | smoke | nenhum texto de `winthor-sql.mjs` nem definition com `jdbcId` contém `INSERT`, `UPDATE`, `DELETE`, `MERGE` ou DDL |

`smoke/000-esqueleto.mjs` (integrador, títulos `ESQ-nn`): dialeto de 06 §5, relógio, sessão
aninhada nos dois modos, lib instalada (cria e move um card de teste), contador de execuções.

## Depende do sandbox (T-002)

Planos B em 01 §15. O que cada ponto atinge na 001:

| # | Onde pega na 001 | Se falhar |
|---|---|---|
| S-01, S-02 | `quem()`, guarda `ATOR` de todas as `ccEsc…`, passo sem sessão | 01 §4 planos B e C; o smoke já roda os dois modos |
| S-03 | `ccEsc…` no perfil; `ccBaseWinthorTitulos` e `ccBaseWinthorCliente` fora (B5 C-02) | `ccEsc…` ficam no perfil com guarda; as duas Oracle voltam ao perfil (R-003) |
| S-04 | recusa por "0 linha" | reler a linha (a trava da rotina já relê) |
| S-05 | lotes de `ccEscBaseAuditoria`, `ccEscBaseParametro`, `ccEscBaseClienteAgente`, feriados | uma execução por linha; tetos de lote ÷ 4 |
| S-06 | `ON DUPLICATE KEY UPDATE`, `INSERT IGNORE`, `CONVERT_TZ`, `ROW_NUMBER` no Oracle | upsert em duas instruções |
| S-07 | `ccBaseTitulosAbertos` (por SF SQL Oracle, já no desenho), `ccBaseWinthorDescobrir`, teto de linhas → `LINHAS_POR_CONSULTA` | descoberta roda pelo roteiro com o token do projeto |
| S-08 | tempo da leitura completa (RNF-001) | leitura já é retomável; se passar do intervalo, cadastro e faturamento passam a rodar 1 vez por hora |
| S-09 | `ccRotina` em cron chamando passos por id; `runDmlMitra` em cron | um cron por passo (01 §11) |
| S-10 | `enviarArquivo` | anexo como link |
| S-11 | `ccEmailEnviar` por business e por cron; `replyTo` | envio pela rotina a partir da fila da 002 |
| S-12 | `winthor-sql.mjs` (`PCPREST`, `PCPLPAG`, `PCCOB`, extras de `PCCLIENT`), como o Winthor marca cancelado/estornado/desdobrado, chave do recebimento, códigos de ramo | só `winthor-sql.mjs` muda; setor pelo prefixo |
| S-13 | não atinge a 001 (não cria nem move card) | — |
| S-14 | idem | — |
| S-15 | perfil da plataforma para membro novo (`ccBaseAcessosConciliar`) | rodar o `add-090` de novo; aviso no cadastro |
| O-01 (B1) | parâmetro numérico sem aspas (`{{id}}` = `1 OR 1=1`) em toda guarda | envolver os números das guardas em `CAST('{{x}}' AS SIGNED)` |
| O-02 (B1) | erro 1093 em `ccEscBaseMembroAtualizar`/`Inserir` (derivadas já com `DISTINCT`/`MAX`) | separar em duas instruções |
| O-03 (B1) | `SELECT` em `CC_*`/`KB_*` no perfil abre leitura direta por business? | tirar as tabelas do perfil no `add-090` |
| VARCHAR (B1) | valor maior que a coluna em modo estrito: erro ou corte? | cortar todo texto renderizado ao tamanho da coluna (o assunto do e-mail e o campo da auditoria já são cortados) |

Roteiro: `backend/sandbox/t002-confirmar.mjs` (só no sandbox, depois da publicação completa e antes de liberar aos usuários — `CLAUDE.md`; cria
`zzT002*`, `ZZ_T002` e `CC_ESTADO['t002.*']` e apaga tudo no fim). Imprime uma linha por item, para copiar aqui.

## Respostas do arquiteto

Pedidos em `docs/contrato/pedidos/001-base.md`, respondidos em `docs/contrato/pedidos/00-respostas.md`
(16/11/2026): 17 aceitos, 4 deles com alteração (PA-01, PA-07, PA-11, PA-15); nenhum recusado. Os 7 registros da parte C ficaram como estavam.

| # | Decisão | Onde no contrato | O que ficou no plano |
|---|---|---|---|
| PA-01 | aceito com alteração (D-06): administrar = nível ≥ 3 **ou** `ADMIN`, não "só Administrador"; `N2`/`N3` aceitam a marca, alçada não | 01 §4, §5; 04 §0, §1 | `PODE_ADMINISTRAR`, `NIVEL_MIN(n)` e `podeAdministrar(m)` ("Quem administra" no Fluxo); marcar `admin` só quem tem a marca; C-019, C-027 e C-033 da spec mudam |
| PA-02 | aceito | 04 §1 `ccBaseClienteListar` | filtros, `BUS_SALDO` e somatórios em "Contratos de backend" |
| PA-03 | aceito | 04 §1 `ccBaseContatoListar`/`ccBaseContatoTotal`; 02 `CC_CONTATO_CLIENTE.BUSCA` | lista de todos os clientes e coluna `BUSCA`; tela `/contatos` |
| PA-04 | aceito | 04 §1 `ccBaseContatoSalvar` | `situacao` desligado = `PENDENTE` |
| PA-05 | aceito | 04 §1 `ccBaseSincronizacaoListar`/`Total`, `ccBaseSincronizacaoStatus` | lista de leituras e as três colunas do Status |
| PA-06 | aceito | 04 §1 internas | `ccEscBaseFeriadoRemover`, `ccEscBaseModeloValidar` |
| PA-07 | aceito com alteração: o lote tem interna própria | 04 §1 `ccBaseFeriadoSalvar`, internas | `gerarAno` grava por `ccEscBaseFeriadosInserir` (`INSERT IGNORE`, ≤ 20), não por `ccEscBaseFeriado` |
| PA-08 | aceito | 04 §1 `ccBaseClienteFicha`, `ccBaseWinthorCliente` | ramo "fora do sistema" da Ficha; aba "Buscar no Winthor" |
| PA-09 | aceito | 04 §1 `ccBaseParametroListar`, `ccBaseParametroSalvar` | `PADRAO` no Listar; nulo na linha padrão = restaurar |
| PA-10 | aceito | 01 §7, §10; 04 §1 | lote de 20; `auditarLinhas` (uma auditoria de até 20 linhas) |
| PA-11 | aceito com alteração: vale 04 com D-06 | 02 `CC_ANEXO`; 04 §1 | `MATERIAL` = `PODE_ADMINISTRAR`, `CERTIDAO` = `NIVEL_MIN(2)` |
| PA-12 | aceito | 01 §11 decisão 2 | leitura parada = 2 × intervalo |
| PA-13 | aceito | 01 §15 S-15 | verificação S-15 na T-002; plano B = rodar o `add-090` de novo |
| PA-14 | aceito | 01 §15 | T-002 entrega o roteiro agora e fecha depois da publicação completa, antes de liberar aos usuários (F5 C-01) |
| PA-15 | aceito com alteração: `gancho()` em texto; em `QUADROS` os nomes seguem as colunas `KB_*` (`label`, `slaHoras`, `noCard`, `condicao`, `capa`) e `final` não se declara | 01 §14 | formato em "Ganchos e quadros" no Fluxo |
| PA-16 | aceito | 04 §1 `ccBaseMembroListar` | `CLIENTES` e `SUBORDINADOS_ATIVOS` |
| PA-17 | aceito | 01 §11 | exclusão fixa = cancelado (`DTCANCEL`) até a S-12; tipo de cobrança só pela lista |

## Decisões

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-001 | Posição calculada em JS por uma função pura, com SQL Oracle simples (títulos; itens por departamento) | Agregar no Oracle com tabela de dias não úteis embutida no SQL | A mesma função serve a leitura e os títulos ao vivo; rateio, carteira e vencimento efetivo por carteira ficam testáveis sem Oracle; coluna a confirmar muda um `SELECT` curto |
| D-002 | Só clientes completos por página; cursor = último `CODCLI` | Página por número | Cliente nunca fica com posição pela metade (RF-005); retomada simples |
| D-003 | Gravar só a posição que mudou | Upsert cego com `ALTERADO_EM` condicional | Evita a armadilha de ordem do `SET` (06 §5) e escreve menos; `ALTERADO_EM` fica exato para os passos |
| D-004 | Troca de topo e restaurar padrão dentro das SFs que já existem | SF própria para cada | O contrato não as lista; uma regra a mais na JS resolve |
| D-005 | Renovar a revisão da ficha a cada contato gravado | Só pelo botão "revisada" | RN-021; custa uma execução |
| D-006 | A T-002 não trava o simulador | Esperar o projeto existir na plataforma | execucao.md regra 6; o contrato já escreveu os planos B e o smoke roda os dois modos de sessão |
| D-007 | Quadro reconhecido por `CC_FASE.QUADRO` no gancho | `boardId` numérico | Id muda entre simulador, sandbox e produção |
| D-008 | Dois modelos de teste no seed da 001 | Arquivo `lib/modelos/001-base.mjs` | A base não tem modelo em produção; o seed grava só tabela da própria spec |
| D-009 | `ccBaseMembroListar` devolve a equipe inteira a todo membro | Filtrar pela hierarquia | RF-017: a equipe é mostrada a todos os perfis; não traz dado de cliente |
| D-010 (B1b) | `ccBaseSincronizar` em 3 fases: `PLANOS` → `CLIENTES` (cadastro, compras, posição, recebimentos e faturamento do cliente inteiro na mesma página, consultas Oracle por faixa `de..ate`) → `FECHAR` | Fases separadas por tabela | D-002 levado ao fim: o cursor nunca deixa cliente com posição, recebimento e faturamento de leituras diferentes |
| D-011 (B1b) | Passo de módulo não publicado (id 0) não ganha linha em `CC_ROTINA_PASSO` | Linha `PENDENTE` | Uma linha que nunca anda impediria o pipeline (06 §2.3) de ver o processamento terminado |
| D-012 (B1b) | `ccBaseSincronizacaoStatus`: colunas do passo `PASSO`, `PASSO_SITUACAO`, `PENDENTES`, `PASSO_FIM` | `SITUACAO`/`FIM` repetidos | Os nomes da leitura e do passo colidiriam na mesma linha |
| D-013 (B1b) | C-009: Sérgio vê 7 no banco do smoke (1003 sem analista); 8 no banco do T-128, onde Rita é analista do 1003 | Ajustar a regra | 01 §6: o analista conta na visibilidade; o teste afirma o número que o SQL dá em cada banco |
| D-014 (B1, usuário 17/11/2026; `docs/arquitetura.md` §7 D-09) | **Ninguém se promove.** Ninguém altera o próprio cargo, superior, marca ou situação; cargo de nível ≥ 3 (Gerente, Diretoria) só é dado por quem tem **cargo** de nível igual ou maior (a marca Administrador não conta); parâmetros `alcada.*` só são alterados por quem tem cargo de nível ≥ 3. Na JS (`ccBaseMembroSalvar`, `ccBaseParametroSalvar`) e na guarda (`ccEscBaseMembroInserir`, `ccEscBaseMembroAtualizar`, `ccEscBaseParametro`) | Deixar como D-06 (a marca administra tudo) | A marca de um Agente virava alçada (ele se dava Diretoria, ou baixava o nível exigido das alçadas): 01 §4 diz que alçada nunca é atendida pela marca. O contrato não tinha regra para o próprio cargo (B1 C-02, O-10) |
| D-015 (B1, usuário 17/11/2026; `docs/arquitetura.md` §7 D-10) | **Winthor fora, módulos param.** Última leitura em `ERRO` → a rodada seguinte é de leitura (uma tentativa por rodada) e nenhum passo de módulo roda | Voltar ao intervalo e rodar os passos com a posição da última leitura `OK` | 01 §11 decisão 2 não traz a condição. Com dado velho a régua cobraria quem já pagou; parar é o lado seguro. Custo: uma tentativa no Winthor a cada 5 min enquanto ele estiver fora (B1 C-07) |
| D-016 (frontend M2, 17/11/2026) | `extensoes.ts`: `AcaoExtra = (ctx) => ReactNode` e `extensoesDoQuadro(slug)` devolve as props prontas do `KanbanBoard`; `icone` do menu restrito à lista `ICONES` do `AdminLayout`; rotas da 001 vazias até cada tela (item sem rota cai na tela "ainda não entregue" da casca); o membro chega às telas por `useOutletContext<MembroSessao>()` | `AcaoExtra[]` de 01 §14 como tipo da lib; `DynamicIcon` do lucide; tela vazia por rota | A lib 1.14.0 não tem `AcaoExtra` (recebe uma função); `DynamicIcon` gera um arquivo por ícone (~1.600) no build; arquivo vazio "para depois" fere o princípio VIII; contexto do roteador dispensa um arquivo de sessão |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| R-001 Colunas e semântica de `PCPREST` diferentes da premissa (cancelamento, desdobramento, chave) | Posição errada: todos os módulos dependem dela | S-12 pela T-002; tudo em `winthor-sql.mjs`; conferir C-001 com 3 clientes reais (`SIMULATOR_WINTHOR=oracle`) antes de publicar |
| R-002 Leitura completa mais lenta que o intervalo | Posição sempre atrasada | S-08; retomável; plano de cadência horária para cadastro e faturamento |
| R-003 `ccBaseWinthorTitulos` e `ccBaseWinthorCliente` estão no perfil: quem souber o id lê títulos ou o cadastro de qualquer cliente do Winthor | Visibilidade furada na leitura ao vivo | S-03 (tirar do perfil) ou S-07 (ler de dentro da JS). **B5 C-02 (17/11):** as duas estão em `FORA_DO_PERFIL` (só a JS da casa as chama; o simulador recusa chamada direta de pessoa); se a S-03 mostrar que JS de business não alcança SF fora do perfil, voltam ao perfil e o risco volta a ser aceito |
| R-004 Anexo em endereço público (P-25) | Documento acessível por quem tem o link | 01 §12: nome embaralhado, endereço só em SF com guarda, aviso na tela |
| R-005 `CAMINHO` é dado derivado | Visibilidade errada se dessincronizar | Toda mudança de superior num `UPDATE` só; `ccBaseEquipeConferir` aponta; teste C-012 confere as contagens |
| R-006 removido (PA-02, PA-03 e PA-05 aceitos em 16/11/2026) | — | — |
| R-007 Membro novo sem perfil na plataforma | Entra e toma 403 | S-15 (01 §15); aviso no cadastro |
| R-008 Formato de `gancho()`/`QUADROS` divergir do que 002 a 005 planejaram | Retrabalho no montador | Formato fixado em 01 §14 (DT-32, PA-15); o montador é um arquivo da 001 e o smoke C-033 semeia um quadro no formato e monta dois trechos no mesmo slug |
| R-009 Cliente com mais títulos em aberto que `LINHAS_POR_CONSULTA` | Página nunca fecha | A página dobra o corte até 8×; acima disso a leitura falha com a mensagem (`ponytail:` paginar dentro do cliente se acontecer) |

## Complexity Tracking

| Princípio violado | Por que é necessário | Por que a alternativa simples não serve |
|---|---|---|
| III. Regra no servidor — `ccEsc…` chamada direto pula a validação de **conteúdo** e a auditoria da JS (01 §5) | Business só escreve por SF SQL de uma instrução, e ela precisa estar no perfil | Guarda de permissão, visibilidade e estado está na SQL; S-03 pode tirar as `ccEsc…` do perfil |
| V. Auditoria — `ccEscBaseAuditoria` e `ccEscBaseEmailInserir` aceitam conteúdo forjado por um membro ativo em nome dele mesmo (registro falso de alteração; "ENVIADO" sem envio) | Mesma causa: a escrita interna é chamável por id | A guarda `ATOR` impede forjar em nome de outro; autor e data saem da própria instrução; S-03 resolve |
| III. Visibilidade — `ccBaseWinthorTitulos` e `ccBaseWinthorCliente` (Oracle, no perfil) não têm como conferir visibilidade no MySQL: quem souber o id lê títulos ou o cadastro de qualquer cliente do Winthor | SF SQL com `jdbcId` do Winthor só enxerga o Winthor | Ler de dentro da JS depende de S-07; R-003 |
| Arquitetura §2 (paginação) — listas fixas sem `LIMIT/OFFSET` (equipe, BUs, departamentos, feriados do ano, parâmetros, planos, contatos e anexos de um registro) | Volume fixo ou limitado pelo filtro obrigatório; a equipe precisa vir inteira | `LIMIT 500` de segurança (01 §10) |
| Arquitetura §8.2 — escrita direta em `KB_BOARD` no passo `ACESSOS` | A lib não tem `kbBoardSalvar` sem sessão | Isolada num passo, grava só diferença, preserva chaves desconhecidas (05 §2) |
| Sem transação — troca de topo e membro novo são duas escritas | Uma instrução por SF | Ordem fixa e idempotente; `ccBaseEquipeConferir` detecta caminho inconsistente; membro com `CAMINHO = ''` não vê ninguém (B1 C-01) |

## Notas da validação B5 (17/11/2026)

- **Republicação (B5 O-01):** feriados nacionais só são gerados para ano ainda sem feriado `GERADO` (o gestor que remove um feriado não o vê voltar). Quadros: fase ou campo semeado que o gestor **inativou ou excluiu** volta na publicação seguinte (05 §1 regra 1: a regra do sistema depende da chave); nome, cor, SLA e ordem nunca são sobrescritos. A tela de administração do quadro deve avisar isso.
- **Leitura × processamento (B5 O-02):** o intervalo não abre leitura nova enquanto a última leitura OK tem passo da rotina por fazer (até 4 intervalos); pedido e erro continuam abrindo leitura.
- **Sessão:** `ccBaseSessao` devolve também `hoje` (relógio único), para as telas não usarem a data do navegador.
