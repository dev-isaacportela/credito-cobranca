# 01 — Convenções

Normativo para os 7 `plan.md`. Onde este arquivo e um plan antigo divergem, vale este.
"A confirmar no sandbox" = entra na T-002 da 001 (lista completa no fim); o plano B já está escrito.

## 1. Nomes

| Coisa | Regra | Exemplo |
|---|---|---|
| Tabela | `CC_` + CAIXA_ALTA, sem acento. `ID INT AUTO_INCREMENT PRIMARY KEY` | `CC_COBRANCA` |
| Server Function pública | `cc` + **prefixo da spec** + Entidade + Ação, camelCase | `ccCobAcordoPropor` |
| Escrita SQL interna | `ccEsc` + prefixo da spec + Entidade + Ação | `ccEscCobAcordoInserir` |
| Listagem | `…Listar` + `…Total` (mesmos filtros, sem `limite`/`offset`) | `ccJurCustoListar` / `ccJurCustoTotal` |
| Parâmetro | `grupo.chave`, camelCase (catálogo em `03-parametros.md`) | `regua.lig` |
| Modelo de mensagem | `CODIGO` = `COB_` / `JUR_` / `PUB_` / `CRED_` + nome | `COB_NOTIF_FORMAL` |
| Fase de quadro | `CC_FASE.CHAVE` em snake_case minúsculo; regra nunca usa id nem nome de fase | `cob_ativa` |
| Campo de quadro | `KB_CAMPO.CHAVE` snake_case; item de checklist = `<fase>_<n>` | `protesto_1` |
| Card ↔ domínio | `KB_CARD.ORIGEM_CHAVE = 'cc:<entidade>:<id>'`, entidade ∈ `cobranca`, `solicitacao`, `pedido`, `processo` | `cc:cobranca:42` |
| Carteira (D-05) | `PRIVADA`, `ESTETICA`, `PUBLICA`. É coluna (`CARTEIRA`) e parâmetro (`carteira`) das SFs de cobrança (002) e de concessão (004); o quadro de um caso é `<processo>-<carteira em minúsculas>`. "Setor" (`PRIVADO`/`PUBLICO`) é só atributo do cliente (`CC_CLIENTE.SETOR`); a lista de clientes de um agente chama-se **atribuição** | `cobranca-publica` |
| Proibido (D-05) | SF, tabela ou tela `…Publica…`/`…Estetica…` que repita uma do privado. Entre carteiras só muda **dado**: quadro (05), valor de parâmetro por carteira (03) e motor de análise. A 005 (`ccPub…`) publica só o que não existe no privado: NF pública, motor do órgão, regras por ente, comunicação com o órgão e certidões | — |

Prefixo por spec (um dono por prefixo; ninguém publica SF com prefixo alheio):

| Spec | Público | Interno | Arquivo |
|---|---|---|---|
| 001 | `ccBase…` + os 4 nomes transversais `ccEmailEnviar`, `ccPodeMover`, `ccPodeExcluir`, `ccRotina` | `ccEscBase…` | `add-010-base.mjs` |
| 002 | `ccCob…` | `ccEscCob…` | `add-020-cobranca-privada.mjs` |
| 003 | `ccJur…` | `ccEscJur…` | `add-030-juridico.mjs` |
| 004 | `ccCred…` | `ccEscCred…` | `add-040-concessao-credito.mjs` |
| 005 | `ccPub…` | `ccEscPub…` | `add-050-setor-publico.mjs` |
| 006 | `ccPainel…` | `ccEscPainel…` | `add-060-painel-consolidado.mjs` |
| 007 | `ccHist…` | `ccEscHist…` | `add-070-historico-apoio.mjs` |

Saída de SF: SQL devolve colunas em `UPPERCASE`; JAVASCRIPT devolve `{ ok: true, … }` ou
`{ ok: false, error: 'frase para a pessoa' }`, com listas em `linhas` (objetos com chaves `UPPERCASE`, como numa SQL) e `total`.

## 2. Tipos

| Dado | Tipo MySQL | Regra |
|---|---|---|
| Chave | `INT AUTO_INCREMENT` | referência a outra tabela = `INT` com índice; sem `FOREIGN KEY` (o simulador e a carga ficam simples) |
| Dinheiro | `DECIMAL(15,2)` | nunca nulo em saldo: `DEFAULT 0` |
| Percentual, nota | `DECIMAL(7,2)` | 20 % grava `20.00` |
| Data | `VARCHAR(10)` `AAAA-MM-DD` | preenchida no código; `NULL` = sem data |
| Data e hora | `VARCHAR(19)` `AAAA-MM-DDTHH:MM:SS`, **horário de Brasília** | exceção: colunas `KB_*` da lib são UTC (regra da lib) |
| Mês | `VARCHAR(7)` `AAAA-MM` | |
| Booleano | `BOOLEAN DEFAULT FALSE` | parâmetro de SF: `({{x}} = 1)` |
| Texto curto / longo | `VARCHAR(n)` / `TEXT` | `''` em vez de `NULL` quando a coluna entra em `UNIQUE` |
| Autor | `INT` = `CC_MEMBRO.ID` | `NULL` = rotina. Só as colunas `KB_*` guardam `INT_USER.ID` |
| Enumeração | `VARCHAR` com os valores listados em `02-dados.md` | constante no código só para definição do sistema |

Arredondamento de dinheiro: 2 casas, metade para cima, no JS (`Math.round(v * 100) / 100`). Rateio com resto: a diferença vai para a última parcela.

## 3. Tempo

| Item | Regra |
|---|---|
| Fonte única | `backend/lib/tempo.mjs` (001): `agora()` → `AAAA-MM-DDTHH:MM:SS`, `hoje()` → `AAAA-MM-DD`, ambos UTC−3 fixo |
| Em SF JAVASCRIPT | `agora()`/`hoje()` do preâmbulo. Lêem `process.env.CC_AGORA` se existir (só existe no simulador), senão o relógio real |
| Em SF SQL | fragmentos `HOJE_SQL` e `AGORA_SQL` de `tempo.mjs`: `DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00'), '%Y-%m-%d')` (e `'%Y-%m-%dT%H:%i:%s'`). No simulador `UTC_TIMESTAMP()` devolve `CC_AGORA` + 3 h |
| Hora da lib em SQL | fragmento `KB_BRASILIA('<coluna>')` de `tempo.mjs` = `DATE_FORMAT(CONVERT_TZ(<coluna>, '+00:00', '-03:00'), '%Y-%m-%dT%H:%i:%s')`; toda leitura `cc*` que mostra ou compara `KB_CARD.FASE_DESDE`, `KB_MOVIMENTO.QUANDO`, `KB_LOG.QUANDO` usa este fragmento (002, 004, 007) |
| Proibido | SF receber `hoje`/`agora` da tela; `CURDATE()`, `NOW()`, `CURRENT_TIMESTAMP` em SQL; `new Date()` solto em JS |
| Escrita SQL interna | recebe `{{agora}}` da JS que a chama (a JS é a única que lê o relógio numa operação) |
| Dias úteis | `backend/lib/dias-uteis.mjs` (001): `ehDiaUtil(data, feriados)`, `proximoUtil(data, feriados)`, `somarDiasUteis(data, n, feriados)`, `diasUteisEntre(a, b, feriados)`, `motivoNaoUtil(data, feriados)`; `feriados` = datas de `CC_FERIADO` (nacional + UF + município pedidos). Cópia de tela em `frontend/src/lib/base/dias-uteis.ts` (001), testada com os mesmos casos |
| Somar meses | fim de mês cai no último dia do mês de destino (30/11 + 3 meses = 28/02) — `somarMeses()` em `tempo.mjs` |
| Vencimento em dia não útil | parâmetro `base.vencimentoDiaNaoUtil` (D-03), aplicado **só** na sincronização (§11) |

## 4. Identidade e sessão

A identidade é `:VAR_USER` (= `INT_USER.ID`) → `CC_MEMBRO` por e-mail. Nunca vem do `input`.

| Onde | Como resolve | Estado |
|---|---|---|
| SF **SQL** chamada pela tela | `:VAR_USER` direto, pelo fragmento `EU` (§6) | provado (SGC 2, lib) |
| SF **JAVASCRIPT** chamada pela tela | `sessao()` do preâmbulo: `runQueryMitra` com `:VAR_USER` dentro do SQL (cópia de `sessao()` da lib, `mitra-kanban/backend/funcoes.mjs`) | provado (lib em produção) |
| SF chamada **por outra SF** (aninhada) | **sem sessão**: `:VAR_USER` não chega. Quem chama passa `membroId` no `input`; a regra única abaixo (DT-34) faz o código funcionar também se a sessão chegar | adotado do SGC 2 (`runtime.mjs` força `userId = 0`); **a confirmar no sandbox** |
| SF em **cron** | sem sessão; age como "rotina" (`membroId = 0`) | provado (cron da lib e do SGC 2) |

`sessao()` do preâmbulo (`backend/lib/escritas.mjs`, 001), uma consulta:

```sql
SELECT EU.ID AS USER_ID, M.ID AS MEMBRO_ID, M.NOME, M.CARGO, M.NIVEL, M.ADMIN, M.CAMINHO
FROM (SELECT :VAR_USER AS ID) EU
LEFT JOIN INT_USER U ON U.ID = EU.ID
LEFT JOIN CC_MEMBRO M ON M.USER_EMAIL = LOWER(U.DESCR) AND M.ATIVO = TRUE
WHERE EU.ID IS NOT NULL LIMIT 1
```

Devolve `{ userId, membroId, nome, cargo, nivel, admin, veTudo, caminho }`; `userId = 0` = sem sessão; `membroId = 0` com sessão = "Você não faz parte da equipe" (recusa; cobre o defeito do artefato "usuário sem vínculo decide").

Regra das JS públicas (`quem()` do preâmbulo):
1. Com sessão → o membro da sessão. Qualquer `membroId` do `input` é **ignorado**.
2. Sem sessão e `input.membroId > 0` → esse membro ("em nome de", chamada aninhada).
3. Sem sessão e `input.membroId = 0` → rotina; só as SFs marcadas `SIS` em `04-funcoes.md` aceitam.

Premissa (a mesma da lib, README "Premissa de segurança"): chamada sem sessão só existe para cron, script do sandbox e chamada aninhada. Um usuário logado nunca chega sem `:VAR_USER`.

**Chamada aninhada — regra única (DT-34, 16/11/2026).** Vale igual nas duas hipóteses do sandbox (S-01/S-14: a aninhada chega sem sessão, `SIM_SESSAO_ANINHADA=0`, ou com a sessão de quem clicou, `=1`); a identidade nunca sai de parâmetro vindo da tela, porque com sessão o `membroId` do `input` é ignorado (regra 1 acima).

| # | Regra |
|---|---|
| 1 | **Quem chama passa `m.membroId`; quem é chamado resolve por `quem()`.** Toda JS (leitura ou escrita) que outra SF chama declara `membroId (0)` na entrada (04 marca "aninhada por …"). A visibilidade dentro dessa JS é aplicada sobre o membro de `quem()` (`visivel(m, cliente)` ou `clienteVisivelA` com `A` = esse membro), **nunca** pelo fragmento `EU` nas consultas dela: sem sessão, `EU` não acha ninguém |
| 2 | **SQL de leitura com `EU` nunca é chamada aninhada.** Ela não recebe identidade. Quem precisa desse dado: (a) a **tela** chama a SQL direto e compõe (é o caso dos resumos do painel, 04 §6 `ccPainelAtencao`); ou (b) a JS lê a tabela da outra dona com `runQueryMitra`, depois de conferir o acesso pelo membro de `quem()` (02 lista a leitora em "Lê"). SQL de leitura sem `EU` — dado da empresa, não de cliente (`ccBaseParametroListar`) — pode ser aninhada |
| 3 | **Escrita aninhada só em SF que aceita a origem de quem chama.** `JS-E` chamada por JS de pessoa resolve a pessoa por `quem()` e aplica a sua guarda (`caso`, nível, alçada). `SIS` aceita só a rotina (sem sessão e `membroId = 0`) e recusa pessoa. SF que serve as duas origens é marcada **"SIS + `<quem>`"** em 04 (hoje: `ccCobCasoSincronizar`, `ccEmailEnviar`): sem sessão e `membroId = 0` age como rotina; senão, como a pessoa, com a guarda dela |
| 4 | **Efeito no quadro "em nome de" a pessoa** (`kbCardMover`/`kbCardAtualizar`/`kbNotaRegistrar` com o `USER_ID` de quem age): na hipótese com sessão a lib confere o nível da pessoa no quadro e o gancho. Por isso (a) a pessoa que dispara o efeito tem nível de escrita no quadro do card (05 §2; quem só lê o quadro não recebe efeito de quadro na sua SF) e (b) o destino que o sistema controla é decidido pelo estado do domínio, não por quem move (04 §8, DT-35) |
| 5 | **Teste:** o smoke roda nas duas hipóteses toda escrita com efeito no quadro **e** toda leitura JS chamada aninhada; o resultado tem de ser o mesmo (06 §3) |

Níveis de cargo (definição do sistema; `CC_MEMBRO.NIVEL` gravado pela escrita do membro):
`AGENTE` 1 · `ANALISTA` 1 · `SUPERVISOR` 2 · `GERENTE` 3 · `DIRETORIA` 5 · `JURIDICO` 0. `ADMIN` é flag, não nível. "Diretor financeiro" e comitês são níveis **exigidos** (parâmetros `alcada.nivel*`), atendidos por quem tem nível maior ou igual.

**Quem administra (D-06, decisão do usuário de 14/11/2026).** Administrar = **nível ≥ 3 (Gerente, Diretoria) ou a marca `ADMIN`** (pessoal técnico, de qualquer nível). Vale para parâmetros, feriados, BUs e departamentos, modelos de mensagem, equipe e redistribuição, filiais credoras, conclusão da carga do Jurídico, fontes e material de apoio, fechamento manual do painel, leituras do Winthor, auditoria e administração dos quadros da lib (05 §2). Regra num fragmento só: `PODE_ADMINISTRAR` em `guarda.mjs` (SQL, sobre o ator `A` ou `EU`) e `podeAdministrar(m)` no preâmbulo (JS). Pela mesma razão, exigência de nível mínimo que **não é alçada** (`N2`, `N3` em 04) é atendida também pela marca `ADMIN` (fragmento `NIVEL_MIN(n)`). Alçada (`alçada` em 04, `alcada.*`, `jur.envioNivelMin`, `jur.acordoAlcadaNivel`, `jur.acordoAlcadaValor`, `com.modeloValidaNivel`) **nunca** é atendida pela marca: só pelo nível. Marcar ou desmarcar `ADMIN` num membro: só quem já tem a marca. O último membro ativo com a marca não a perde nem é inativado (recusa "É preciso manter ao menos um Administrador."): sem ninguém com a marca, ninguém mais poderia concedê-la.

**Ninguém se promove (D-09, decisão do usuário de 17/11/2026).** Ninguém altera o próprio cargo, superior, marca ou situação ("Ninguém altera o próprio cargo, superior, marca ou situação."). Cargo de nível ≥ 3 (Gerente, Diretoria) só é dado por quem tem **cargo** de nível igual ou maior (`A.NIVEL`, nunca a marca). As chaves de alçada da lista acima (`alcada.*`, `jur.envioNivelMin`, `jur.acordoAlcadaNivel`, `jur.acordoAlcadaValor`, `com.modeloValidaNivel`) só são alteradas por cargo de nível ≥ 3: administrar pela marca não basta. Vale na JS e na guarda SQL (`ccEscBaseMembroInserir`/`…Atualizar`, `ccEscBaseParametro`).

**Plano B** (se o sandbox mostrar que a chamada aninhada carrega `:VAR_USER`): nada muda — a regra 1 passa a valer também na SF chamada (a regra única DT-34 já cobre essa hipótese). **Plano C** (se `:VAR_USER` dentro de `runQueryMitra` falhar para business): toda escrita vira forma B (SQL guardada chamada direto da tela, §5) e toda leitura com visibilidade vira SF SQL com o fragmento `EU` (§6); JS fica só para e-mail e rotina.

## 5. Escrita guardada

Objetivo: permissão, alçada e segregação valem mesmo que alguém chame a SQL de escrita por fora da tela (o perfil business libera todas as SFs, internas inclusive — é assim que a JS as chama por id).

### Forma A (padrão): JS pública + `ccEsc…` SQL

```
tela → cc<Spec><Ação> (JAVASCRIPT)
         1. m = quem()                          (§4)
         2. valida formato e regra, com mensagem (lê por runQueryMitra)
         3. escrever('ccEsc…', { …, membroId: m.membroId, agora })   uma instrução por SF
         4. confere linhas afetadas / relê; 0 linha = recusa
         5. auditar(…)                          (§7) — uma execução
         6. efeitos no quadro: kbCardMover / kbCardAtualizar / kbNotaRegistrar "em nome de" (05-quadros.md §1)
       ← { ok, … }
```

Toda `ccEsc…` é `INSERT … SELECT … FROM DUAL WHERE <GUARDA>` ou `UPDATE/DELETE … WHERE … AND <GUARDA>`. `GUARDA` é montada com os fragmentos de `backend/lib/guarda.mjs` (001).

**O que a `ccEsc…` recebe (construção, 17/11/2026; vale para todas as specs).** Valor que a regra **deriva** — débito, alçada e nível exigido, prazo, valor de pendência, validade do crédito, encerramento, data de hoje, nível e caminho do membro — é recalculado na própria SQL a partir das tabelas e de `PARAM(…)`; a entrada só traz o que a pessoa escolhe. Chamada direta da interna não grava valor derivado à escolha de quem chama.

**Membro normalizado.** Toda comparação de `{{membroId}}` com lista de texto (`FIND_IN_SET` em `CC_SOLICITACAO.PROPOSTA_POR`, `CC_PEDIDO_RETIDO.RECOMENDADO_POR`, `CC_ANALISE_ORGAO.PROPOSTA_POR`) usa `CAST(CAST({{membroId}} AS SIGNED) AS CHAR)`, e a lista grava o id nessa forma (`'3'`, nunca `'3.0'`): a guarda `ATOR` compara `A.ID` como número, e a lista tem de comparar a mesma forma (`PROPONENTE_ADD`/`NAO_PROPONENTE` de `lib/concessao-credito/sql.mjs`).

**Número entra como texto convertido (construção, 17/11/2026; defesa em profundidade, S-16).** Todo parâmetro numérico em SQL de SF entra como `CAST('{{x}}' AS SIGNED)` ou `CAST('{{x}}' AS DECIMAL(p,s))`, nunca `{{x}}` solto: se a plataforma substituir texto em vez de ligar o valor, o número sem aspas vira injeção (provado no simulador, B4 da 007). Exceção única: `LIMIT {{limite}} OFFSET {{offset}}`, que no MySQL só aceita literal — depende da proteção de parâmetros da plataforma (S-16) e da JS/tela mandar número.

Fragmentos:

| Fragmento | SQL | Garante |
|---|---|---|
| `ATOR({{membroId}})` | `EXISTS (SELECT 1 FROM CC_MEMBRO A LEFT JOIN INT_USER AU ON LOWER(AU.DESCR) = A.USER_EMAIL WHERE A.ID = {{membroId}} AND A.ATIVO = TRUE AND (COALESCE(:VAR_USER, 0) = 0 OR AU.ID = :VAR_USER) AND <cond>)` | quem chama **com sessão** só age como ele mesmo; sem sessão (aninhada, cron) vale o `membroId` recebido |
| `<cond>` de cargo | `A.CARGO IN (…)`, `A.ADMIN = TRUE` | permissão |
| `PODE_ADMINISTRAR` | `(A.NIVEL >= 3 OR A.ADMIN = TRUE)` (§4, D-06) | administração de cadastros |
| `NIVEL_MIN(n)` | `(A.NIVEL >= n OR A.ADMIN = TRUE)` | nível mínimo que não é alçada (`N2`, `N3` de 04) |
| `<cond>` de alçada | `A.NIVEL >= <expressão do nível exigido>` — o nível exigido é **relido na própria SQL** (coluna gravada na proposta, ou `PARAM('alcada.x', seg)` de §9), nunca recebido por parâmetro; a marca `ADMIN` não conta | alçada |
| `<cond>` de segregação | `<tabela>.PROPOSTO_POR <> {{membroId}}` (ou `ANALISTA_ID`, `REGISTRADO_POR`) no `WHERE` da própria linha | quem propõe não aprova |
| `<cond>` de visibilidade | `clienteVisivelA('C')` (§6, versão por `A`) | visibilidade |
| `ROTINA` | `{{membroId}} = 0 AND COALESCE(:VAR_USER, 0) = 0` | só chamada sem sessão age como rotina |
| Estado | `AND SITUACAO = 'PROPOSTO'` etc. | transição válida e idempotência (repetir não regrava) |

`COALESCE(:VAR_USER, 0)`: no simulador `:VAR_USER` vira `0` sem sessão; na plataforma **a confirmar** (pode ser `NULL` ou erro de ligação — ver plano B).

### Forma B: SQL guardada chamada direto da tela

Para escrita de uma instrução sem regra composta (marcar um booleano, salvar um texto). A SQL usa `:VAR_USER` pelo fragmento `EU` e grava o autor na própria linha (`ATUALIZADO_POR`, `ATUALIZADO_EM`). Só é permitida onde `04-funcoes.md` marca "direta": a auditoria completa (antes/depois) não existe nessa forma, só o autor e a data na linha.

### Limites conhecidos (registrar no Complexity Tracking de cada plan que usa)

| Limite | Consequência | Mitigação |
|---|---|---|
| Uma instrução por SF, sem transação | operação de várias escritas pode parar no meio | ordem fixa "domínio primeiro, quadro depois"; toda escrita é idempotente pelo estado; a rotina reconcilia quadro × domínio (§11) |
| `ccEsc…` chamada direto pula a **validação de conteúdo** e a **auditoria** da JS | quem tem permissão para o ato pode gravar valor fora da regra de formato e sem registro de antes/depois | a guarda de permissão, alçada, segregação e estado está na SQL; toda linha grava autor e data na mesma instrução; regra numérica que é política (entrada mínima, parcelas máximas, teto de alçada) entra na `GUARDA` como comparação com `PARAM(…)` |
| Sem sessão em chamada aninhada | a `ccEsc…` confia no `membroId` quando não há `:VAR_USER` | só cron/aninhada chegam assim (premissa do §4) |
| A JS vê recusa como "0 linha afetada" | não sabe qual condição da guarda falhou | a JS valida antes com mensagem; 0 linha depois disso = "Sem permissão para esta ação, ou a situação mudou. Atualize e tente de novo." |

**A confirmar no sandbox:** (1) valor de `:VAR_USER` em SF SQL aninhada e em cron; (2) se uma SF fora do perfil business pode ser chamada por id de dentro de uma JS executada por business — se puder, todas as `ccEsc…` saem do perfil e os dois primeiros limites desaparecem; (3) `rowsAffected` no retorno da SF SQL de escrita (sem ele, a JS relê a linha).
**Plano B de (1):** se `:VAR_USER` der erro sem sessão, a guarda perde a cláusula `COALESCE(:VAR_USER…)` nas `ccEsc…` e a rotina passa a gravar por `runDmlMitra`; o limite "confia no `membroId`" passa a valer também para chamada direta e é registrado como risco aceito até (2) ser resolvido.

### Lote sem `JSON_TABLE`

A proteção de parâmetros da plataforma recusa `JSON_TABLE` (comentário de `escritas.mjs` da lib). Escrita de várias linhas numa execução usa **listas alinhadas** e uma tabela de números embutida:

```sql
INSERT INTO T (A, B)
SELECT SUBSTRING_INDEX(SUBSTRING_INDEX('{{as}}', '¦', N.N), '¦', -1),
       SUBSTRING_INDEX(SUBSTRING_INDEX('{{bs}}', '¦', N.N), '¦', -1)
FROM (SELECT 1 AS N UNION ALL SELECT 2 UNION ALL … SELECT 20) N
WHERE N.N <= {{n}} AND <GUARDA>
```

Separador `¦` (U+00A6); a JS troca `¦` por `|` nos valores antes de enviar. Teto: 20 linhas por execução (`NUMEROS_20` em `guarda.mjs`). `UPDATE` em lote: `FIND_IN_SET(ID, '{{ids}}')` (padrão da lib 1.9.2). **A confirmar no sandbox:** `SUBSTRING_INDEX` com parâmetro ligado em `INSERT … SELECT`. Plano B: uma execução por linha, com o teto de lote da SF dividido por 4.

## 6. Visibilidade pela hierarquia

Sem recursão: `CC_MEMBRO.CAMINHO` guarda os ids do topo até a pessoa (`/2/3/4/`). Quem está abaixo de alguém tem o caminho começando pelo caminho dele. A escrita do membro mantém a coluna (troca de superior = um `UPDATE … SET CAMINHO = CONCAT(novo, SUBSTRING(CAMINHO, LENGTH(antigo) + 1)) WHERE CAMINHO LIKE CONCAT(antigo, '%')`).

Fragmentos de `backend/lib/visibilidade.mjs` (001) — texto SQL idêntico no MySQL e no SQLite do simulador:

```sql
-- EU: junta como tabela derivada; sem membro ativo, a consulta devolve 0 linha
JOIN (SELECT M.ID, M.CARGO, M.NIVEL, M.ADMIN, M.CAMINHO,
             CASE WHEN M.ADMIN = TRUE OR M.CARGO IN ('GERENTE','DIRETORIA') THEN 1 ELSE 0 END AS VE_TUDO
      FROM CC_MEMBRO M JOIN INT_USER U ON LOWER(U.DESCR) = M.USER_EMAIL
      WHERE U.ID = :VAR_USER AND M.ATIVO = TRUE) EU ON 1 = 1

-- clienteVisivel('C'): C = alias de CC_CLIENTE
(EU.VE_TUDO = 1
 OR (EU.CARGO = 'JURIDICO' AND C.NO_JURIDICO = TRUE)
 OR EXISTS (SELECT 1 FROM CC_MEMBRO V WHERE V.ID IN (C.AGENTE_ID, C.ANALISTA_ID)
            AND EU.CAMINHO <> '' AND V.CAMINHO LIKE CONCAT(EU.CAMINHO, '%')))

-- membroVisivel('X.AGENTE_ID'): a coluna aponta um membro
(EU.VE_TUDO = 1 OR EXISTS (SELECT 1 FROM CC_MEMBRO V WHERE V.ID = X.AGENTE_ID AND EU.CAMINHO <> '' AND V.CAMINHO LIKE CONCAT(EU.CAMINHO, '%')))
```

`clienteVisivelA('C')` é a mesma expressão com `A` (o ator da guarda, §5) no lugar de `EU`. Para leitura dentro de JS chamada aninhada (§4, DT-34), `MEMBRO_A(membroId)` é a tabela derivada `A` com as mesmas colunas de `EU` (inclusive `VE_TUDO`) para o membro que `quem()` resolveu (`JOIN (…) A ON 1 = 1`), usada com `clienteVisivelA`/`membroVisivel` sobre `A`. Em JS, `visivel(m, cliente)` do preâmbulo aplica a mesma regra em memória (para leitura composta); o smoke `001` cruza as duas versões com o mesmo elenco.

| Quem | Vê |
|---|---|
| `AGENTE`, `ANALISTA` | clientes em que é `AGENTE_ID` ou `ANALISTA_ID` |
| `SUPERVISOR` | os seus e os de quem está abaixo dele (ativos ou não) |
| `GERENTE`, `DIRETORIA`, `ADMIN` | tudo, inclusive cliente sem agente |
| `JURIDICO` | clientes com `NO_JURIDICO = TRUE` (só leitura fora do módulo Jurídico) e todo o módulo Jurídico |
| Sem membro ativo | nada |
| Membro com `CAMINHO` vazio (recém-inserido, antes de a segunda escrita gravar o caminho) | ninguém pela hierarquia (os fragmentos exigem `CAMINHO <> ''`; `visivel()` em memória igual); só o que "vê tudo" e o Jurídico continuam valendo |

`CC_CLIENTE.ANALISTA_ID` e `NO_JURIDICO` são gravados pelas specs 004/005 e 003 por `ccEscBaseClienteAnalista` e `ccEscBaseClienteJuridico` (001). Diferença conhecida no quadro (arquitetura §8.2): o supervisor é `membro` e vê todos os cards; listagens e painéis `cc*` filtram pela hierarquia.

**A confirmar no sandbox:** nada (não usa `WITH RECURSIVE`). Custo aceito: `CAMINHO` é dado derivado; `ccBaseEquipeConferir` (leitura) aponta caminho inconsistente e o smoke prova a troca de superior.

## 7. Auditoria

Uma escrita, `ccEscBaseAuditoria` (SQL, lote por listas alinhadas de `entidadeIds`, `clienteIds`, `campos`, `antes`, `depois`, até 20 linhas por execução), e duas funções no preâmbulo: `auditarLinhas(area, entidade, [{ entidadeId, clienteId, campo, antes, depois }], m)` (lote de várias entidades numa execução — redistribuição, lote da fila, carga) e `auditar(area, entidade, entidadeId, clienteId, [{ campo, antes, depois }], m)`, que é o caso de uma entidade só. Uma linha de `CC_AUDITORIA` por campo alterado; criação = um campo `'(criação)'` com o resumo em `DEPOIS`; exclusão lógica = `'(remoção)'` com o resumo em `ANTES`. `CLIENTE_ID` vai sempre que a escrita é de um cliente; o que é da empresa inteira (parâmetro, feriado, BU, membro, modelo, filial, fechamento do painel, fonte, material) grava `CLIENTE_ID` nulo.

| Regra | |
|---|---|
| Quando | toda escrita de negócio feita por pessoa ou por rotina com efeito de negócio (mudança de etapa pela régua, quebra de acordo, encaminhamento do crédito). Não audita: posição do Winthor, foto mensal, capa do card, log da rotina |
| Autor | `POR` = `membroId` (`NULL` = rotina, `POR_NOME = 'Rotina'`); com sessão, a SQL confere `ATOR` |
| Valores | texto até 1.000 caracteres; dinheiro `1234.56`; data ISO; booleano `Sim`/`Não`; valor maior é cortado com `…` |
| Custo | 1 execução por operação (até 20 linhas). Operação com mais de 20 linhas audita as 19 primeiras e uma linha `'(demais)'` com a lista de nomes |
| Imutável | não existe SF de `UPDATE`/`DELETE` em `CC_AUDITORIA` |
| Movimento de card | a passagem de fase é auditada pela lib (`KB_MOVIMENTO`, `KB_LOG`); `CC_AUDITORIA` guarda a decisão de domínio que a causou |

Áreas (`CC_AUDITORIA.AREA`, um dono por valor): 001 `Clientes`, `Atribuição`, `Equipe`, `Parâmetros`, `BUs`, `Feriados`, `Contatos`, `Modelos`, `E-mail`, `Anexos`, `Leitura do Winthor` · 002 `Cobrança`, `Acordos`, `Baixas`, `Bloqueio` · 003 `Jurídico`, `Carga do Jurídico` · 004 `Crédito`, `Pedidos`, `Pendências do Winthor`, `Calibração` · 005 `Setor público`, `Notas fiscais`, `Regras por ente`, `Certidões` · 006 `Fechamento` · 007 `Histórico`, `Fontes`, `Material`.
Quem lê a auditoria: `PODE_ADMINISTRAR` (tela da 001); no histórico do cliente (007) a categoria "Alteração auditada" aparece para `NIVEL_MIN(2)` (Supervisor ou acima, ou a marca `ADMIN`).

## 8. Erros

| Situação | Resposta |
|---|---|
| Regra de negócio recusada | JS: `{ ok: false, error }` em português, dizendo o que falta. Nunca `throw` |
| Lista de pendências | `{ ok: false, error, faltam: ['…'] }` |
| Sem acesso ao registro | igual a registro inexistente: `'Cliente não encontrado.'` (não revela que existe) |
| Sem membro | `'Você não faz parte da equipe de Crédito e Cobrança.'` |
| Escrita guardada com 0 linha | `'Sem permissão para esta ação, ou a situação mudou. Atualize e tente de novo.'` |
| Winthor fora do ar em leitura ao vivo | `{ ok: true, …, erroWinthor: 'Não foi possível consultar o Winthor agora.' }` com o que o MySQL tem |
| Falha de plataforma em escrita interna | `escrever()` lança; a JS deixa subir (`executionStatus = FAILED`) e a tela mostra erro genérico |
| SQL de leitura | sem linha = lista vazia; nunca erro por falta de acesso |
| Gancho do quadro | uma linha `PODE` (1/0) e `MOTIVO`; sem linha o motor fecha com "Regra do sistema indisponível." |

## 9. Parâmetros no código

- Catálogo: `03-parametros.md`. Cada spec declara as suas chaves em `backend/lib/parametros/NNN-<slug>.mjs` (array de `{ chave, grupo, ordem, rotulo, tipo, unidade, padrao, minimo, maximo, porCarteira, comVigencia, usadoPor, descricao, vigencias?, carteiras? }`); o `setup-backend.mjs` funde os arquivos que existirem em `CC_PARAMETRO_DEF` e grava o padrão geral em `CC_PARAMETRO` com vigência `2000-01-01` **só se a chave não tem valor**. `vigencias: [{ inicio, valor }]` (opcional, só com `comVigencia`) grava as vigências históricas da linha padrão no lugar do `padrao` (ex.: `pub.pequenoValor`); `carteiras: { PUBLICA: valor, … }` (opcional) grava o valor próprio semeado da carteira (03 §18). Ninguém insere em `CC_PARAMETRO` por fora.
- Spec sem parâmetro, modelo ou quadro (007) não entrega `lib/parametros`, `lib/modelos` nem `lib/quadros`: o `setup-backend.mjs` e a 001 funde só os arquivos presentes.
- Nome dos grupos (`regua` → "Régua de cobrança" etc.): `GRUPOS_PARAMETRO` (`{ codigo, nome, ordem }[]`, todos os grupos de 03) exportado pela 001 em `frontend/src/lib/base/parametros.ts`; a tela de parâmetros da 001 e a consulta de regras da 007 importam de lá.
- Valor efetivo (D-05) = linha da carteira (`ESTETICA` ou `PUBLICA`) com `VALOR` não nulo e maior `VIGENCIA_INICIO ≤ data`; senão a linha padrão (`CARTEIRA = ''`), que é o valor da carteira `PRIVADA`. Chave com `POR_CARTEIRA = FALSE` só tem a linha padrão.
- Em JS: `parametros(carteira, data?)` do preâmbulo → objeto `{ 'grupo.chave': valor tipado }` (uma consulta; `data` omitida = hoje).
- Em SQL: fragmento `PARAM('grupo.chave', '<expr carteira>')` de `backend/lib/parametros.mjs` (001) — subconsulta escalar com `ORDER BY (CARTEIRA <> '') DESC, VIGENCIA_INICIO DESC LIMIT 1`; `PARAM_NUM(…)` = `CAST(… AS DECIMAL(15,4))`.
- Edição: só `ccBaseParametroSalvar` (lote de chaves, valida o conjunto final). Validação cruzada de um grupo é declarada pelo dono no arquivo de chaves (`validarConjunto(valores)` → lista de motivos) e executada pela 001. `valores` é o **conjunto efetivo inteiro** depois do lote (todas as chaves, na carteira e na data conferidas), não só as chaves do grupo: regra cruzada entre grupos (`painel.sincAtrasoMin ≥ base.syncIntervaloMin`, `meta.*` de 002/006 no validador da 004) roda sempre (decisão de 17/11/2026, lote de fechamento do backend).
- **Vigência só de hoje em diante** (decisão de 17/11/2026, C-03 da validação da 006): `vigenciaInicio` < hoje é recusada; o valor novo vale a partir de hoje ou de uma data futura. Vigência retroativa mudaria cálculo de mês já fechado (foto do painel, PDD). As vigências históricas semeadas (`vigencias` do catálogo, ex. `pub.pequenoValor`) entram só pelo `setup-backend.mjs`.
- SLA de etapa **não** é parâmetro: mora em `KB_FASE.SLA_HORAS` (05-quadros.md).

## 10. Paginação e orçamento de execuções

| Regra | Valor |
|---|---|
| Página | `limite` (padrão 20, máximo 100) e `offset`; `…Total` irmã devolve `TOTAL` (e somatórios quando a tela mostra) |
| Sem paginação | só listas de volume fixo, marcadas "lista fixa" em `04-funcoes.md` (equipe, BUs, feriados do período, parâmetros de um grupo, contatos de um cliente, parcelas de um acordo), com `LIMIT 500` de segurança |
| Listagem em JS | devolve `linhas` e `total` na mesma chamada (uma execução em vez de duas) |
| Teto da plataforma | 300 execuções de SF por minuto (por projeto; se a plataforma contar por usuário, vale o mais restritivo), **contando as aninhadas** (JS que chama 3 SQL = 4) |
| Rotina | no máximo **150** execuções por rodada (5 min) e 45 s de relógio; o resto fica para a rodada seguinte |
| Escrita de pessoa | no máximo **20** execuções por clique (inclui as da lib e as aninhadas). Exceção nomeada: `ccJurDossieEnviar`, até **30** (encargos + movimento + prazo + `ccCobEnviarJuridico` aninhada; uma vez por processo). Nenhuma outra SF passa de 20 |
| O que fica no clique | domínio, auditoria e o efeito que a pessoa precisa ver no card que está aberto (movimento, nota, capa). Pode ir para a conciliação da rotina (até 5 min, 05 §1 regra 3) só o efeito em **outro** card (ex.: card do crédito substituído) e a marcação de item ✉/● em envio de lote; o card aberto lê a ficha e já mostra o estado certo |
| Lote da tela | a SF de lote declara em 04 quantos itens aceita por chamada, de modo que uma chamada caiba em 20; a tela divide a seleção e chama **em sequência** (nunca em paralelo), com progresso. Ex.: 2 e-mails da fila, 20 clientes por redistribuição, 1 processo da carga |
| Abrir uma tela | no máximo **6** execuções, em `Promise.allSettled`; trocar filtro com *debounce* de 400 ms e cache por (tela, filtros) na sessão. Página que empilha várias telas escolhidas (abas do painel da 006) conta **por tela (bloco)**: cada bloco busca os seus dados ao entrar na área visível, com cache por (bloco, filtros), e cada bloco ≤ 6 |
| Abrir um card | `kbCardDetalheSql` + **1** leitura de ficha do módulo dono (`…Ficha`) + **1** leitura por módulo que estende o card (005 nos quadros públicos, 05 §3.5 e §4.4), carregada quando o bloco fica visível (DT-42). Leitura a mais dentro do card só por ação da pessoa (abrir aba, expandir, botão) |
| Quadro | `atualizarACadaMs = 60000`; a capa do card não chama SF |
| Polling | proibido fora do quadro e do chat da lib |
Custo de referência (medir no simulador pelo contador do `runtime.mjs` e ajustar o teto da rotina): `kbCardCriar` ≈ 6 · `kbCardMover` ≈ 5 · `kbCardAtualizar` ≈ 3 · `kbNotaRegistrar` ≈ 2 · `ccEmailEnviar` ≈ 4 · JS de escrita simples (1 `ccEsc` + auditoria) = 3.
Cada plan traz a conta de execuções das suas 3 operações mais caras.

## 11. Rotina agendada única

Uma SF em cron: **`ccRotina`** (001, JAVASCRIPT, `0 */5 * * * *`, fora do perfil). Ela chama por id, em ordem, o passo de cada módulo. Os passos são SFs JAVASCRIPT sem cron, fora do perfil, com o mesmo contrato:

`input { sincronizacaoId, orcamentoExec, orcamentoMs }` → `{ ok, pendentes, execucoes, resumo }` (`pendentes > 0` = continua na próxima rodada).

| Ordem | Passo (`CC_ROTINA_PASSO.PASSO`) | SF | Dono | O que faz |
|---|---|---|---|---|
| 0 | `SINC` | `ccBaseSincronizar` | 001 | lê o Winthor e grava cliente, posições (cliente, cliente × BU, cliente × carteira), recebimentos, faturamento, planos; retomável por página |
| 1 | `ACESSOS` | `ccBaseAcessosConciliar` | 001 | `CC_MEMBRO.USER_ID`; `ADMINS_IDS` e `ACESSO_JSON` dos quadros pelo cargo (05-quadros.md §2) |
| 2 | `REGUA` | `ccCobRotina` | 002 | abre/fecha casos, move cards pela régua, promessas, acordos quebrados, bloqueio devido, fila de e-mail, capa |
| 3 | `CREDITO` | `ccCredRotina` | 004 | risco do cliente, encaminhamento gestão → reanálise/obsoleto, foto da calibração |
| 4 | `PUBLICO` | `ccPubRotina` | 005 | notas fiscais do Winthor, prazos e passos da NF; calcula a etapa do órgão e pede à 002 (`ccCobCasoSincronizar`, carteira `PUBLICA`) que a reflita no quadro `cobranca-publica` |
| 5 | `FOTO` | `ccPainelRotina` | 006 | foto mensal do aging |

Decisão de cada rodada (`ccRotina`):
1. Trava: `CC_ESTADO['rotina.trava']` com a hora; outra rodada em menos de 4 min → sai. Passo `EM_ANDAMENTO` há mais de 10 min → `ERRO` "interrompido".
2. **Rodada de leitura:** se há `CC_SINCRONIZACAO` `SOLICITADA`, ou a última leitura começou há `base.syncIntervaloMin − 1` minutos ou mais, ou há leitura `EM_ANDAMENTO` (retoma), **ou a última leitura terminou em `ERRO`** (D-10: nova tentativa, uma por rodada) → executa só o passo 0 e termina. Assim, com o Winthor fora, os passos de módulo não rodam com dado velho (ninguém é cobrado do que já pagou): só voltam quando uma leitura fecha `OK`. Com o padrão de 15 min a leitura roda em :00, :15, :30, :45. Leitura `EM_ANDAMENTO` é retomada enquanto `INICIO` tem menos de 2 × `base.syncIntervaloMin`; depois disso vira `ERRO` "interrompida" e a rodada abre outra (é o mesmo limite do aviso de posição desatualizada).
3. **Rodada de processamento:** senão, para a última leitura `OK`, cria as linhas de `CC_ROTINA_PASSO` que faltam e executa, na ordem, os passos não `OK`, enquanto houver orçamento (150 execuções, 45 s). Passo com erro registra `ERRO` e **não** impede os seguintes; é repetido na rodada seguinte.
4. Passo cuja SF ainda não foi publicada (módulo não construído) é pulado: o mapa `__IDS__` traz id 0.

| Propriedade | Como |
|---|---|
| Ordem | os passos 1–5 só rodam sobre uma leitura `OK` e nunca na mesma rodada da leitura |
| Idempotência | cada passo compara "o que deveria ser" com "o que está" e só escreve a diferença; repetir não duplica (chaves `UNIQUE`: `CC_COBRANCA.ATIVO_CHAVE`, `CC_EMAIL_FILA.CHAVE`, `CC_FOTO_AGING (MES, CLIENTE_ID, BU_ID)`, `CC_CALIBRACAO (MES, CLIENTE_ID)`, `CC_NF_PUBLICA (CODFILIAL, NUMTRANSVENDA)`) |
| Passagem do tempo | cada passo roda **uma vez completa por dia** mesmo sem posição nova (primeira leitura `OK` do dia: validade que vence, promessa que expira, dia da régua que vira) e, nas demais, só sobre clientes com `ALTERADO_EM` posterior à sua última rodada |
| Prioridade dentro do passo | criar card → mover → fechar → atualizar capa → notas |
| Escrita do passo | nas tabelas `CC_*` do próprio módulo por `runDmlMitra` em lotes de até 500 linhas (cron roda com o token do projeto; não conta execução); no quadro, só pelas SFs `kb*` sem sessão (`origem: 'sistema'`); em tabela de outro módulo, pela SF do dono |
| Foto mensal | gatilho único para `CC_FOTO_AGING` e `CC_CALIBRACAO`: primeira leitura `OK` cujo mês é posterior ao mês `M` sem foto → grava a foto de `M` com a posição dessa leitura |
| "Em nome de" | card criado/movido pela rotina usa `criadoPor`/`movidoPor` = `USER_ID` do agente (ou analista) do caso; sem agente, o usuário de `base.rotinaUsuarioEmail` |
| Pedido "ler agora" | `ccBaseSincronizacaoPedir` grava `SOLICITADA`; atendido em até 5 min |

**A confirmar no sandbox:** tempo da leitura completa do Winthor (se passar de 45 s, a leitura já é retomável por página: `CC_SINCRONIZACAO.FASE`/`CURSOR`); cron chamando SF JAVASCRIPT por id; `runDmlMitra` em cron. **Plano B:** se chamada aninhada de JS para JS não for permitida, os passos viram 5 SFs em cron próprio (`0 1-59/5`, `0 2-59/5`, …) que decidem pelo mesmo `CC_ROTINA_PASSO`.

Sincronização — regras fixas (detalhe das colunas em `02-dados.md` §Winthor):
- Universo: cliente com título em aberto ou movimento nos últimos `base.syncJanelaMeses`.
- Título em aberto: sem pagamento, saldo > 0,004, `DTCANCEL` vazio, `CODCOB` fora de `base.cobrancasExcluidas` (D-04). Estorno e desdobramento: como o Winthor os marca fica para a S-12; o que for confirmado entra como filtro fixo em `winthor-sql.mjs`. Até lá (e no simulador) a exclusão fixa é só `DTCANCEL`, e tipo de cobrança sai só pela lista do parâmetro.
- Vencimento efetivo: `base.vencimentoDiaNaoUtil` = `CORRIDO` usa `DTVENC`; `PROXIMO_UTIL`/`UTIL_ANTERIOR` trocam a data pela tabela embutida de dias não úteis (JS monta de `CC_FERIADO` + fins de semana, janela de −400 a +90 dias).
- BU do título (D-01): rateio do saldo pelos itens da nota (`PCMOV` da `NUMTRANSVENDA` → `PCPRODUT.CODEPTO` → `CC_BU_DEPTO`), proporcional ao valor dos itens; departamento sem BU = BU 0 "Sem BU". Título sem nota (lançamento avulso) = BU 0.
- Setor (D-02): `PUBLICO` se `RAMO_COD` está em `base.ramosPublicos` ou o nome do ramo começa por `base.ramoPublicoPrefixo`; senão `PRIVADO`. Pessoa física é `TIPO_PESSOA = 'F'`, setor privado.
- Carteira da linha de posição: `PUBLICA` para cliente público (qualquer BU); senão a carteira da BU (`ESTETICA` ou `PRIVADA`; BU 0 = `PRIVADA`).
- Todo cliente tem posição, inclusive o público (por vencimento do título). A visão por prazo legal da NF é da 005, em `CC_NF_PUBLICA`, e não regrava a posição.
- Quem não veio na leitura tem a posição zerada. `ALTERADO_EM` só muda quando um valor muda.

## 12. Anexos

| Tipo de documento | Onde fica | Como |
|---|---|---|
| De um caso (cobrança, solicitação, pedido, processo, dossiê, custo, termo, balanço) | **anexo do card** (`KB_ANEXO`) ou campo de fase do tipo Anexo | aba Anexos / campo da lib; o domínio guarda só o id (`KB_ANEXO_ID`) quando precisa apontar o arquivo |
| Fora de card (cliente, material de apoio, certidão da empresa, carta de anuência avulsa) | `CC_ANEXO` (`ENTIDADE` ∈ `CLIENTE`, `MATERIAL`, `CERTIDAO`) | `ccBaseAnexoRegistrar` |

Caminho do arquivo (igual para os dois): o navegador envia com `uploadFilePublicMitra({ file })` de `mitra-interactions-sdk` e recebe `result.publicUrl`; a função única é `enviarArquivo(arquivo)` em `frontend/src/lib/base/arquivos.ts` (001), passada ao `criarKanbanApi` e usada pelas telas próprias. A SF só registra o endereço. Limites conferidos na tela **e** na SF: PDF, PNG, JPG, XLSX, DOCX; até 20 MB.

**Risco (registrar em cada plan que anexa):** o endereço é público — quem tiver o link abre o arquivo. Mitigação desta entrega: `enviarArquivo` renomeia para `<uuid>-<nome>`, o endereço só sai em SF que confere acesso ao registro, e a tela avisa "arquivo em endereço público" (texto da lib). Balanço, DRE, dossiê e termo assinado seguem esse caminho até a lib ter anexo privado (README da lib, "Ficou para depois").
**A confirmar no sandbox:** `uploadFilePublicMitra` com usuário business e o tamanho máximo aceito. **Plano B:** se business não puder enviar, o anexo vira link (URL de um repositório interno colada pela pessoa); a lib e `ccBaseAnexoRegistrar` já aceitam link.

## 13. E-mail

Um único caminho: **`ccEmailEnviar`** (001, JAVASCRIPT). Monta com `montarEmail` de `@benenutri/mitra-kanban/motor` (inlinado no corpo da SF, como a lib faz) e envia com `sendEmailMitra`. Os e-mails de automação do quadro (movimento, menção, responsável, tarefa) são da lib e não passam por aqui.

`input { codigo, clienteId, contatoId (0), para (''), assunto (''), corpo (''), extras ('{}'), anexos ('[]'), origem, referencia, membroId (0) }` → `{ ok, error?, emailId, resultado }`

| Regra | |
|---|---|
| Modelo | `codigo` obrigatório (`CC_MODELO_MENSAGEM` ativo). `assunto`/`corpo` vazios = renderiza o modelo com os campos comuns (§ abaixo) + `extras`; preenchidos = texto final já editado/aprovado por quem pede (fila da régua, régua pública), e os campos `[CAMPO]` restantes ainda são trocados |
| Destinatário | `para` vazio = contato `contatoId`, senão o contato `PRINCIPAL` com e-mail, senão o primeiro com e-mail; nenhum → recusa "Sem e-mail cadastrado" sem enviar |
| Efeito legal | modelo com `EFEITO_LEGAL` só sai com validação vigente: `VALIDADO_VERSAO = VERSAO` e `VALIDADO_EM` há menos de `com.modeloRevalidarMeses`. Sem isso: recusa "Modelo aguardando validação" |
| Validação (provisória, P-06) | `ccBaseModeloValidar`: cargo `JURIDICO` **ou** nível ≥ `com.modeloValidaNivel` (padrão 3, Gerente). Todo modelo com efeito legal nasce "não validado" no seed |
| Campo sem valor | recusa listando os campos faltantes; campo desconhecido no modelo é recusado ao salvar o modelo |
| Registro | toda tentativa grava `CC_EMAIL_ENVIADO` (`ENVIADO` ou `FALHOU` + erro), com `ORIGEM` e `REFERENCIA` de quem pediu; falha de envio não desfaz o que a chamadora já gravou |
| Formato | `montarEmail({ sistema: 'Crédito e Cobrança', rotulo, titulo: assunto, corpo, dados?, tabela?, anexos?, rodape })`; destinatário de fora = sem botão `acao`; rodapé com `com.assinatura`, `com.telefone`, `com.email` da carteira do cliente |
| Sem sessão | aceita `membroId` (aninhada) e rotina (`membroId = 0`, `ENVIADO_POR = NULL`) |
| Custo | 4 execuções (leitura + envio + registro + auditoria). Lote: cada SF de lote declara quantos e-mails aceita por chamada para caber em 20 (fila da régua: 2, 01 §10) |

Campos comuns (todo modelo pode usar; valor montado pela 001): `[CLIENTE]` (contato destinatário ou razão social), `[RAZAO_SOCIAL]`, `[CNPJ]`, `[CODIGO_CLIENTE]`, `[VALOR_VENCIDO]`, `[DIAS_ATRASO]`, `[VENCIMENTO_MAIS_ANTIGO]`, `[VALOR_A_VENCER]`, `[PROXIMO_VENCIMENTO]`, `[VALOR_PROXIMO_VENCIMENTO]`, `[DATA_HOJE]`, `[AGENTE]`, `[TELEFONE_CONTATO]`, `[EMAIL_CONTATO]`, `[ASSINATURA]`. Com `extras.carteira` os valores de saldo vêm da posição da carteira.
Campos extras (declarados em `CAMPOS_EXTRAS` do modelo; valor enviado por quem pede): 002 `[DATA_LIMITE]`, `[VALOR_ATUALIZADO]`; 003 `[PRAZO_DIAS]`, `[TOTAL]`, `[BANCO]`, `[REPRESENTANTE]`, `[CARGO_REPRESENTANTE]`; 005 `[NUMERO_NF]`, `[EMPENHO]`, `[PROTOCOLO]`, `[DATA_LIQUIDAR_ATE]`, `[DATA_PAGAR_ATE]`, `[ORGAO]`, `[EMISSAO_NF]`, `[VALOR_NF]`, `[CONTRATO]`, `[DIAS_ATRASO_NF]`.
De → para dos campos da 002: `[NOME_CONTATO]` → `[CLIENTE]` · `[DATA_VENCIMENTO]` → `[PROXIMO_VENCIMENTO]` · `[DATA_VENCIMENTO_ORIGINAL]` → `[VENCIMENTO_MAIS_ANTIGO]` · `[TELEFONE_COBRANCA]` → `[TELEFONE_CONTATO]` · `[EMAIL_COBRANCA]` → `[EMAIL_CONTATO]`. Não há texto de WhatsApp no modelo.
Seed de modelos: cada spec exporta `MODELOS` em `backend/lib/modelos/NNN-<slug>.mjs`; o `setup-backend.mjs` insere os que não existem (`semearModelos()` da 001).
`CC_EMAIL_ENVIADO.ORIGEM` (um dono por valor): `001-manual` · `002-regua`, `002-anuencia` · `003-notificacao` · `005-regua-publica`, `005-analise`.

**A confirmar no sandbox:** `sendEmailMitra` chamado por business e por cron; remetente e `replyTo`; anexo por link no corpo. **Plano B:** sem `replyTo`, o rodapé já traz o e-mail de contato; se business não puder enviar, o envio passa a ser feito pela rotina a partir de `CC_EMAIL_FILA` aprovada (a fila já existe na 002) e a 005 grava na mesma fila.

## 14. Arquivos por módulo (costuras)

Regra: dois agentes nunca escrevem o mesmo arquivo. O que não está na coluna de uma spec é do integrador (orquestrador ou construtor da B1).

### Compartilhados (integrador; a 001 cria na B1)

| Arquivo | Conteúdo |
|---|---|
| `backend/setup-backend.mjs` | importa `schema/NNN-*.mjs`, funde `lib/parametros/*`, `lib/modelos/*`, bootstrap do topo da equipe |
| `backend/add-001-kanban.mjs` | `instalar({ ganchos: { podeMover: 'ccPodeMover', podeExcluir: 'ccPodeExcluir' }, email: { sistema: 'Crédito e Cobrança', urlDoCard } })`; roda de novo depois do `add-010` (como no SGC 2) |
| `backend/add-002-jdbc-winthor.mjs` | conexão `WinThor` por nome, `jdbcIdWinthor()` (cópia do SGC 2 `add-003`) |
| `backend/add-090-perfil-acesso.mjs` | perfil único "Crédito e Cobrança": todas as SFs menos `FORA_DO_PERFIL` (`ccRotina` e os 6 passos), `SELECT` em `CC_*` e `KB_*`; roda por último, fora do `PUBLISH_ORDER` |

**Publicação (DT-39).** Os ids de SF são injetados na publicação, e uma JS publicada antes da SF que ela chama fica com id 0 para sempre (o `ccRotina` pularia os passos; a decisão pública da 004 não acharia o motor da 005), e o `ccPodeMover` montado antes de um `lib/quadros/NNN` não tem o trecho dele. Por isso a publicação completa roda o `PUBLISH_ORDER` (`add-010` … `add-070`) **duas vezes**: a primeira cria todas as SFs; a segunda (upsert pelo nome, ids mantidos) injeta os ids de todas e remonta `ccPodeMover` com os trechos de todos os quadros. Depois, `add-001-kanban` de novo (liga os ganchos) e `add-090`. Publicação de uma spec só (prompt de sandbox de cada spec): publica a spec e republica o `add-010` e toda spec já publicada que chama SF dela (hoje, o `add-040` depois do `add-050`).
| `backend/sync-server-function-map.mjs`, `package.json` | — |
| `backend/simulator/config.mjs`, `runtime.mjs`, `server.mjs`, `mysql-dialect.mjs`, `schema-winthor.mjs`, `seed.mjs`, `smoke.mjs`, `smoke/base.mjs`, `relogio.mjs` | orquestradores: importam `seed/NNN` e `smoke/NNN` na ordem das specs e montam todo banco (o do `sim` e o de cada smoke) pelo **mesmo** pipeline de 06 §2.3, que inclui semear os quadros (DT-38); `smoke/base.mjs` traz `como()` (`como(null, fn)` = sem sessão, como cron ou aninhada), `rodarCron()`, `execucoes()`, `pular()` e o ajudante que roda um teste nas duas hipóteses de sessão (`nasDuasSessoes(fn)`) |
| `backend/simulator/smoke/900-fluxos.mjs` | fluxos entre módulos (06 §3); tarefa do integrador |
| `frontend/src/App.tsx`, `AdminLayout.tsx`, `src/lib/server-functions.ts` (um bloco por spec), `mitra-api.ts`, `mitra-auth.ts` | registro de rotas, menu e mapa de SFs |

Faixas de id local em `server-functions.ts`: lib 8001–9099 · 001 = 1000–1999 · 002 = 2000–2999 · 003 = 3000–3999 · 004 = 4000–4999 · 005 = 5000–5999 · 006 = 6000–6999 · 007 = 7000–7999.

### Por spec (`NNN-<slug>` = `001-base`, `002-cobranca-privada`, `003-juridico`, `004-concessao-credito`, `005-setor-publico`, `006-painel-consolidado`, `007-historico-apoio`)

| Caminho | Conteúdo |
|---|---|
| `backend/add-0N0-<slug>.mjs` | `definitions` (todas as SFs da spec) + seed dos quadros da spec no `isEntrypoint()` |
| `backend/schema/NNN-<slug>.mjs` | `DDL` da spec (um template literal por tabela) |
| `backend/lib/<slug>/*.mjs` | regra pura e fragmentos da spec |
| `backend/lib/parametros/NNN-<slug>.mjs` | chaves da spec + `validarConjunto` |
| `backend/lib/modelos/NNN-<slug>.mjs` | modelos de mensagem da spec |
| `backend/lib/quadros/NNN-<slug>.mjs` | `QUADROS` e `gancho(slug)` no formato fixado abaixo. Donos dos 8 quadros: 002 (3 de cobrança), 003 (`juridico`), 004 (3 de concessão + `pedidos-limite`). A 005 não tem `QUADROS`: exporta só `gancho(slug)`, que devolve texto para `concessao-publica` e `''` para os demais |
| `backend/simulator/seed/NNN-<slug>.mjs` | seed da spec (faixa de códigos de `06-seed-testes.md`) |
| `backend/simulator/smoke/NNN-<slug>.mjs` | testes da spec |
| `frontend/src/modules/NNN-<slug>/` | telas, rotas e itens de menu exportados por `index.ts`; abas, conteúdo de fase e ações extras do quadro |
| `frontend/src/lib/<slug>/*.ts` | regra pura de tela (inclui o espelho `podeMover` do quadro da spec) |
| `frontend/tests/NNN-<slug>.test.mjs` | testes de tela |

Só da 001 (as outras importam, não editam): `backend/lib/escritas.mjs` (preâmbulo: `sessao`, `quem`, `escrever`, `ler`, `auditar`, `auditarLinhas`, `podeAdministrar`, `parametros`, `visivel`, `agora`, `hoje`, `injetarIds`, `MARCADOR_IDS = '__CC_IDS__'`), `guarda.mjs` (`ATOR`, `ROTINA`, `PODE_ADMINISTRAR`, `NIVEL_MIN`, `NUMEROS_20`), `visibilidade.mjs`, `parametros.mjs`, `tempo.mjs` (`HOJE_SQL`, `AGORA_SQL`, `KB_BRASILIA`, `somarMeses`), `dias-uteis.mjs`, `winthor-sql.mjs`, `quadros.mjs` (`semearQuadro()`, `chamarKb()`, montagem de `ccPodeMover`/`ccPodeExcluir` a partir dos `gancho()` de cada spec), `frontend/src/lib/base/*`.

Importadas de outra spec (a dona exporta e mantém; quem importa não edita e, sem a dona presente, `pular('depende de 00N')`; fechamento v2): `alcadaConcessao()` de `backend/lib/concessao-credito/regras.mjs` (004) → 005, teste RN-007 com os valores da carteira `PUBLICA`. Função pura nova usada por outra spec entra nesta linha.

`ccPodeMover` e `ccPodeExcluir` são publicadas pelo `add-010-base.mjs`, mas o texto SQL de cada quadro vem do `lib/quadros/NNN` da spec dona: a 001 só monta. Quadro cujo arquivo ainda não existe cai no ramo padrão (`PODE = 1`). Dois arquivos podem contribuir para o mesmo quadro (004 e 005 em `concessao-publica`): os trechos são concatenados na ordem 004 → 005 — o primeiro que recusa responde.

**Formato de `QUADROS`** (array exportado por `lib/quadros/NNN-<slug>.mjs`; lido por `semearQuadro()` da 001; nomes de propriedade = colunas `KB_*` da lib em camelCase):

```js
{ slug, nome, descricao, config: {},                 // KB_BOARD (CONFIG_JSON)
  fases: [{ chave, nome, tipo,                       // tipo: 'comum' | 'sucesso' | 'cancelado' (KB_FASE.TIPO); ORDEM = posição no array
            slaHoras, cor, descricao: '',            // cor: 'data-1'…'data-8'
            condicao: null,                          // CONDICAO_JSON da lib, escrita com a CHAVE do campo/fase; semearQuadro troca por id
            capa: [],                                // chaves de campo que a fase acrescenta à capa (KB_FASE.CAPA_JSON)
            campos: [campo] }],                      // campos da fase (checklist `<fase>_<n>`, tipo 'sim_nao')
  campos: [campo],                                   // campos sem fase; noCard: true = capa de todas as fases
  etiquetas: [{ rotulo, cor }],                      // opções do campo reservado `etiquetas` (README da lib, "Etiquetas")
  automacoes: [{ gatilho, faseChave, acao, config }] }
campo = { chave, label, tipo, noCard: false, editavelDepois: false, config: {} }   // KB_CAMPO; obrigatório nunca (05 §1 regra 4)
```

`CC_FASE.FINAL` = `tipo <> 'comum'` (não se declara). A 005 não exporta `QUADROS`.

**Formato de `gancho(slug)`** (exportado pelo mesmo arquivo; `ccPodeExcluir` não tem trecho): devolve **texto** com zero ou mais cláusulas `WHEN <condição> THEN '<motivo>'`, escritas sobre os apelidos `M` (`CC_MEMBRO` ativo com `USER_ID = {{usuarioId}}`, pode ser nulo), `K` (`KB_CARD` de `{{cardId}}`), `DE` (`CC_FASE` de `K.FASE_ID`) e `PARA` (`CC_FASE` de `{{faseId}}`); o domínio entra por subconsulta ligada a `K.ID` (`CARD_ID`). A 001 monta:

```sql
SELECT CASE WHEN X.MOTIVO = '' THEN 1 ELSE 0 END AS PODE, X.MOTIVO FROM (
  SELECT CASE WHEN M.ID IS NULL THEN 'Usuário sem vínculo na equipe.'
              WHEN PARA.QUADRO = '<slug>' THEN (CASE <cláusulas da(s) dona(s)> ELSE '' END)   -- um WHEN por quadro com trecho
              ELSE '' END AS MOTIVO
  FROM (SELECT 1 AS U) U1 LEFT JOIN KB_CARD K ON K.ID = {{cardId}} LEFT JOIN CC_FASE DE ON DE.FASE_ID = K.FASE_ID
  LEFT JOIN CC_FASE PARA ON PARA.FASE_ID = {{faseId}} LEFT JOIN CC_MEMBRO M ON M.USER_ID = {{usuarioId}} AND M.ATIVO = TRUE) X
```

Texto vazio = o quadro não entra no `CASE`. Fragmentos de 01 §5/§6 que a cláusula pode usar: `PODE_ADMINISTRAR`/`NIVEL_MIN(n)` com `M` no lugar de `A`, `membroVisivel` com `M`.

**Extensão de tela entre módulos (D-05):** a tela do quadro é uma só por processo (002 para cobrança, 004 para concessão), recebe a `carteira` e monta os pontos de extensão da lib com o que estiver registrado em `frontend/src/lib/base/extensoes.ts` (001):

```ts
registrarExtensao(slugDoQuadro: string, ext: {
  abasExtras?: AbaExtra[];                                   // tipos da lib (README, "Pontos de extensão")
  acoesExtras?: AcaoExtra[];
  conteudoDaFase?: (ctx: ExtensaoContexto) => ReactNode | null;
  podeMover?: (card, fase, estrutura) => string | null;      // espelho do trecho de gancho do módulo
}): void
extensoesDe(slugDoQuadro): { abasExtras, acoesExtras, conteudoDaFase, podeMover }   // já combinadas
```

Combinação, quando mais de um módulo registra o mesmo slug: `abasExtras` e `acoesExtras` concatenadas na ordem de registro (dona do quadro primeiro); `conteudoDaFase` desenha os blocos de todos, na mesma ordem, ignorando `null`; `podeMover` devolve a primeira mensagem não nula. A dona registra as suas em `frontend/src/modules/NNN-<slug>/extensoes.ts`; a 005 registra para `cobranca-publica` e `concessao-publica` em `frontend/src/modules/005-setor-publico/extensoes.ts`. O `App` (integrador) importa esses arquivos uma vez, dona antes da 005. Nenhum módulo importa componente de outro.

**Formato de `frontend/src/modules/NNN-<slug>/index.ts` (DT-39; tipos exportados pela 001 em `frontend/src/lib/base/menu.ts` antes do M2):**

```ts
export const modulo: Modulo = {
  spec: '002-cobranca-privada',
  rotas: [{ caminho: '/cobranca/:carteira', tela: lazy(() => import('./QuadroCobranca')) }],
  menu: [{ grupo: 'OPERACAO', rotulo: 'Cobrança', caminho: '/cobranca/privada', icone: 'wallet', ordem: 20,
           pode: (m: MembroSessao) => m.cargo !== 'JURIDICO' }],     // pode ausente = todo membro ativo
};
// Modulo = { spec: string; rotas: RotaModulo[]; menu: ItemMenu[] }
// RotaModulo = { caminho: string; tela: LazyExoticComponent<ComponentType> }
// ItemMenu = { grupo: 'OPERACAO' | 'CADASTROS' | 'ADMINISTRACAO'; rotulo: string; caminho: string; icone: string; ordem: number; pode?: (m: MembroSessao) => boolean }
```

`menuDoMembro(membro, modulos)` junta o `menu` dos módulos recebidos, guarda os itens com `pode(membro)` verdadeiro e agrupa na ordem da casca C (Operação, Cadastros, Administração), por `ordem`. **Módulo entregue** = módulo cujo `index.ts` o `App.tsx` importa (o integrador acrescenta a linha quando a spec entrega a primeira tela); não há outra marca. Só existem os três grupos da casca escolhida: a 007 põe o Histórico em Operação e Fontes, Material e Regras em vigor em Cadastros. `pode` só esconde item; a permissão é do servidor.

## 15. A confirmar no sandbox (T-002 da 001)

| # | Verificar | Usado em | Plano B |
|---|---|---|---|
| S-01 | `:VAR_USER` em SF SQL chamada por JS (aninhada) e em cron: valor (`0`, `NULL`, erro) | §4, §5 | §5 plano B |
| S-02 | `runQueryMitra` com `:VAR_USER` em JS chamada por business | §4 | §4 plano C |
| S-03 | SF fora do perfil chamada por id de dentro de JS de business | §5 | manter `ccEsc…` no perfil com guarda |
| S-04 | `rowsAffected` de SF SQL de escrita | §5 | reler a linha |
| S-05 | `SUBSTRING_INDEX`/`FIND_IN_SET` com parâmetro ligado em `INSERT … SELECT` | §5, §7 | uma execução por linha |
| S-06 | `SELECT VERSION()`; `ROW_NUMBER() OVER`, `ON DUPLICATE KEY UPDATE`, `INSERT IGNORE`, `CONVERT_TZ`, `JSON_UNQUOTE(JSON_EXTRACT())` | leituras, upsert | reescrever sem função de janela; upsert = `UPDATE` + `INSERT … WHERE NOT EXISTS` |
| S-07 | JDBC do Winthor de dentro de JS por business (ficha e títulos ao vivo) e por cron; teto de linhas por leitura | 001, 002, 005 | SF SQL Oracle com `jdbcId` chamada pela JS (a JS confere a visibilidade antes) |
| S-08 | Tempo da leitura completa do Winthor | §11 | leitura retomável (já prevista) |
| S-09 | Cron de 5 min chamando JS por id; `runDmlMitra` em cron | §11 | §11 plano B |
| S-10 | `uploadFilePublicMitra` por business; tamanho máximo | §12 | anexo como link |
| S-11 | `sendEmailMitra` por business e por cron; remetente, `replyTo` | §13 | envio pela rotina |
| S-12 | Colunas do Winthor marcadas "a confirmar" em `02-dados.md` §Winthor (títulos, limite, plano, NF, códigos de ramo público) | 001, 005 | mapeamento isolado em `lib/winthor-sql.mjs`; só esse arquivo muda |
| S-13 | Custo real em execuções de `kbCardCriar`/`kbCardMover`/`kbCardAtualizar` | §10 | ajustar o teto por rodada |
| S-14 | `kbCardMover`/`kbCardAtualizar` chamados por JS de business (aninhada): chegam sem sessão? | 05-quadros.md §1 | ver 05 §1 "duas situações" |
| S-15 | Membro cadastrado depois da publicação: o passo `ACESSOS` (cron) consegue pôr o usuário no perfil "Crédito e Cobrança" (`setProfileUsersMitra`)? | 001 (`ccBaseAcessosConciliar`) | o perfil é refeito rodando o `add-090` no sandbox; a tela de cadastro avisa "o acesso vale depois da próxima publicação do perfil" |
| S-16 | `{{x}}` em SF SQL: a plataforma liga o valor como parâmetro ou substitui o texto? Vale também para `LIMIT {{limite}} OFFSET {{offset}}` | todas as SQL (§5 "Número entra como texto convertido") | já coberto para números por `CAST('{{x}}' AS …)`; se substituir texto, `LIMIT/OFFSET` passam a ser conferidos como inteiro pela JS/tela e a SF SQL paginada é chamada só com número |

A T-002 da 001 entrega o roteiro executável do sandbox (S-01 a S-16) e fica aberta até o projeto existir na plataforma. A construção segue pelas hipóteses padrão deste contrato e o smoke exercita as duas situações (`SIM_SESSAO_ANINHADA`); a T-002 roda depois da publicação completa e fechada é condição para liberar o sistema aos usuários, não para o simulador (ordem no `CLAUDE.md`, F5 C-01).
