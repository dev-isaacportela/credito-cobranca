# B3 · 005-setor-publico — validação independente do backend

**Data:** 2026-11-17 · **Escopo:** backend da spec 005. A 002 e a 004 entram só como dependências (`ccCobCasoSincronizar`, `ccCobContatoRegistrar`, a decisão pública da 004). A 003, a 006 e a 007 ficam fora.

**Leu:** `CLAUDE.md`; `docs/LEIA-construcao.md`; skill `mitra-escopo` 0.10.0; README da `mitra-kanban`; contrato `00` (DT-29), `01` (§3–§6, §10–§11), `02` §005, `03` §15–§16 (`pub.*`, `pubMotor.*`), `04` §0, §5, §8 e §9, `05` §3.2, §3.4, §3.7 e §4, `06` §5; `pedidos/01-correcoes-v2.md` (DT-29, DT-34 a DT-37, DT-40, DT-41 e a seção da 005); `docs/arquitetura.md` §7; `docs/specs/005-setor-publico/{spec,plan,tasks}.md`; modelos `B2-002-cobranca.md` e `B2-004-concessao.md`.

**Código lido:**
- da 005: `backend/add-050-setor-publico.mjs`, `schema/005-*`, `lib/setor-publico/*`, `lib/{parametros,modelos,quadros}/005-*`, `simulator/seed/005-*`, `simulator/smoke/005-*`, `tests/005-*` e os blocos 5xxx de `frontend/src/lib/server-functions.ts`;
- da base e das outras specs: `lib/guarda.mjs`, `lib/visibilidade.mjs`, `lib/winthor-sql.mjs`, `lib/concessao-credito/sql.mjs`, `add-040` (ramo público da decisão), `add-020` (quem cria caso), `add-090` (perfil) e `simulator/{seed,smoke/base}.mjs`.

**Rodou:** `cd backend && npm test` estava verde na entrega (76 regra, 105 SQL, smoke 275 ok / 0 pulado / 0 falha) e não foi repetido. Rodou também quatro scripts descartáveis no scratchpad, cada um num banco temporário do pipeline com o seed 005 e o relógio 2026-12-01. Eles provam B-01, C-01, C-04, O-01, O-02 e O-03 e mediram as contas pelo contador do simulador. Nada foi gravado no repositório e nada rodou contra a plataforma.

**Conferido e conforme:**
- **SFs:** 29 SFs com os nomes de 04 §5 (18 públicas + 10 `ccEscPub…` + `ccPubWinthorNf`), nos dois blocos de `server-functions.ts` (5001–5018 e 5051–5061). Entradas e saídas iguais às de 04 §5.
- **Tabelas:** 5 tabelas com colunas, tipos, nulos, padrões, `UQ` e `IX` de 02 §005.
- **Parâmetros:** 15 `pub.*` e 47 `pubMotor.*` com padrão, faixa e vigência de 03 §15–§16. `validarConjunto` cobre as ordens crescentes do 03.
- **Gancho:** `gancho('concessao-publica')` com a frase de 04 §8.
- **Relógio:** nenhum `NOW()`/`CURDATE()`/`CURRENT_TIMESTAMP`/`SYSDATE`. O `Date.now()` aparece só no orçamento de parede da rotina. Datas em `VARCHAR`, colunas em maiúscula.
- **Escritas:** toda JS de escrita audita. O "Calcular" só audita quando o resultado muda.
- **Plataforma:** `runDmlMitra` só em `ccPubRotina` (recusa quem não é rotina, e ela está em `FORA_DO_PERFIL`). O Winthor é lido por `runQueryMitra` com o marcador do `add-002`. Nenhuma leitura com `EU` é chamada aninhada.
- **Identidade (DT-34):** vem de `quem()`. O RN-038 prova que o `membroId` da tela é ignorado com sessão.
- **`PROPOSTA_POR` canônico:** usa `PROPONENTE_ADD` da 004, com `CAST`. O teste "membroId '4.0' grava '4'" confirma. O furo B-02 da B2 (`FIND_IN_SET` sobre `{{membroId}}` cru) não se repete na 005.
- **Decisão pela JS:** a 004 recalcula o motor e recusa uma fotografia forjada ("O motor mudou desde o último cálculo"). O furo está só na chamada direta (B-01).
- **SQL × lib:** `SITUACAO_NF_SQL`, `DIAS_ATRASO_NF_SQL` e `ACIMA_2M_SQL` aplicam a mesma regra de `situacaoNf`.

## Resumo

| | Qtde |
|---|---|
| BLOQUEIA | 1 |
| CORRIGIR | 5 |
| OBSERVAÇÃO | 9 |

Das seis divergências declaradas, quatro são aceitáveis como estão. Duas pedem ajuste: a do orçamento (O-03, as contas do plan não batem com o medido) e a do prazo do card (C-05, a rotina não compara o prazo).

## BLOQUEIA

- **B-01 · um Supervisor do caso forja a fotografia do motor do órgão e aprova sozinho, sem Comitê e sem contrato.**
  - **Onde:**
    - `backend/add-050-setor-publico.mjs:932-935` (`ccEscPubAnaliseMotor`, guarda `ANALISE_SOL_OK` em `:903-904`) grava `NOTA`, `RATING_PUB`, `EXPOSICAO` e `DECISAO_SUGERIDA` como chegam. Exige só que o ator seja "caso" (analista ou superior dele) e não o acrescenta a `PROPOSTA_POR`.
    - A guarda da decisão da 004 (`add-040:1666-1681`) usa a `EXPOSICAO` gravada para decidir se há exceção (`limiteAprovado > EXPOSICAO` → Comitê de crédito).
    - A trava RN-005 / 04 §8 ("sem contrato ativo, só `PRE_APROVADA` ou `RECUSADA`") existe só na JS (`add-040:1047`).
  - **Provado no simulador:**
    1. Carlos salva a análise do 5002 com base edital, sem contrato e CAPAG D. O motor dá P4, exposição 0 e `podeAprovar = false`, e o card vai a `comite`.
    2. Silvia (Supervisor, superior de Carlos, nunca salvou a análise) chama `ccEscCredDecisaoInserir` direto com 90.000. Grava 0 linha, porque a exceção exige o Comitê.
    3. Silvia chama `ccEscPubAnaliseMotor` direto com P1 e exposição 10.000.000. `PROPOSTA_POR` continua `'7'`.
    4. A mesma decisão direta grava `APROVADA`, `ALCADA_EXIGIDA` "Supervisor", `LIMITE_MOTOR` 10.000.000 e `RATING_PUB` P1.
    5. `ccEscCredSolicitacaoDecisao` (`add-040:1766-1772`), também direto, leva a solicitação a `DECISAO_RESULTADO = 'APROVADA'`.
    6. Pela JS (`ccCredDecisaoRegistrar`), Silvia é recusada.
  - **Por que bloqueia:** é o mesmo furo da B2-004 (B-01), agora por uma `ccEscPub…`. Fere 04 §0 (alçada relida da tabela) e 04 §8 (só `podeAprovar` aprova). Basta uma pessoa, porque ser superior do analista dá o "caso" e não a torna proponente.
  - **Correção (duas linhas de SQL):**
    - Na guarda de `ccEscPubAnaliseMotor`, exigir que o ator já esteja em `PROPOSTA_POR` (`FIND_IN_SET(CAST(CAST({{membroId}} AS SIGNED) AS CHAR), PROPOSTA_POR) > 0`). Assim, quem grava a fotografia nunca decide, e o "Calcular" continua sem mexer na lista, como pede 02.
    - O contrato diz que `gravar = 1` é "caso". Fica para o arquiteto escolher: ou o superior que não é proponente recebe "salve a análise para recalcular", ou o "Calcular" passa a tornar proponente (mudança em 02 e 04 §5).
    - No `RAMO_CONCESSAO` da 004, para a `PUBLICA` com `resultado = 'APROVADA'`, exigir o contrato ativo, que é dado puro: `AO.BASE = 'CONTRATO' AND AO.SALDO_CONTRATO > 0 AND AO.VIGENCIA_FIM >= HOJE_SQL`.
    - Testar a chamada direta das duas internas no RN-007.

## CORRIGIR

- **C-01 · passo da régua gravado direto: "no prazo" escolhido, data retroativa, passo que não se aplica, sem auditoria**
  - **Onde:** `add-050:950-958` (`ccEscPubNfAcaoInserir`). `NO_PRAZO` sai de `'{{agora}}' <= '{{prazo}}'`, e os dois vêm da entrada. A guarda não confere se o passo se aplica à NF, nem a antecedência da RN-029 (só a JS confere, em `:513-515`).
  - **Provado no simulador:** Carlos grava `L3` da 1001 com prazo 2099-12-31 e `agora` 2026-10-01. A linha nasce com `NO_PRAZO = 1` e `FEITO_EM` retroativo, sem linha de auditoria. O `ccPubReguaCumprimento` dele sobe de 28,6% para 37,5%.
  - **Efeito:** a rotina não revê `CC_NF_ACAO`, então o efeito é permanente. Passos marcados antes da hora também somem da régua e da próxima ação do órgão.
  - **Correção:**
    - Na guarda, exigir `SUBSTRING('{{agora}}', 1, 10) = HOJE_SQL` e calcular `NO_PRAZO` com `HOJE_SQL`.
    - A rotina, que já carrega `feitosDe` e `reguaNf`, regrava `PRAZO`/`NO_PRAZO` das ações que divergirem do devido. Se preferir, registrar o resto no Complexity Tracking.
- **C-02 · `ccEscPubRegraAtualizar` dá resultado diferente no MySQL**
  - **Onde:** `add-050:968-977`. `SITUACAO` vem primeiro no `SET`, e `VALIDADO_POR`/`VALIDADO_EM` testam `SITUACAO = 'VERIFICADO'`.
  - **Efeito:** no MySQL (esquerda para a direita, 06 §5) eles já leem `'A_CONFIRMAR'` e mantêm o validador antigo. Uma regra editada fica "a confirmar" e ainda "validada por Gustavo". O SQLite lê o valor antigo, por isso o C-027 (`VALIDADO_POR` nulo) passa no simulador e falharia na plataforma.
  - **Correção:** pôr `VALIDADO_POR` e `VALIDADO_EM` antes de `SITUACAO`. Melhor ainda, não depender da ordem: repetir nos três a mesma condição sobre as colunas de prazo, sem citar `SITUACAO` nova.
- **C-03 · `ccPubWinthorNf` está no perfil, sem uso e sem risco registrado**
  - **Onde:** `add-050:1028` e `add-090:15`.
  - **Por que importa:** a rotina lê o Winthor por `runQueryMitra` com o mesmo SQL, então ninguém chama a SF. Mas ela é publicada com o `jdbcId` e entra no perfil. Qualquer membro que souber o id lê as NFs de **qualquer** `CODCLI` do ERP, privado inclusive: a SQL não filtra ramo e não há visibilidade possível no Oracle. Os parâmetros `{{clientes}}`, `{{transacoes}}`, `{{aPartirDe}}` e `{{linhas}}` entram sem aspas e dependem da validação da plataforma.
  - **Na 001:** o mesmo risco é o R-003 do plan, aceito porque lá a SF é usada. Aqui não há esse motivo, e o plan da 005 não registra o risco.
  - **Correção:** não publicar a SF (o contrato a lista; anotar a divergência) ou incluí-la em `FORA_DO_PERFIL`.
- **C-04 · o cursor global perde as NFs de órgão que vira público depois**
  - **Onde:** `add-050:668` e `:677-679`. As novas vêm só com `NUMTRANSVENDA > max(gravado)`, e as antigas só se já estão em `CC_NF_PUBLICA`.
  - **Provado no simulador:** com cursor 500403, um cliente passa a `SETOR = 'PUBLICO'` com uma NF em aberto de transação 400601 (troca de ramo, ou mudança em `base.ramosPublicos`). A rodada não grava a NF, e ela nunca entra.
  - **Outro caminho:** recuar `pub.nfDataCorte` também não traz nada.
  - **Correção:** ler com `aPartirDe = 0`, só para os `CODCLI` públicos que ainda não têm linha em `CC_NF_PUBLICA`. Se preferir, registrar a limitação no plan, ao lado de PA-20 e D-005.
- **C-05 · a rotina não compara o prazo do card**
  - **Onde:** `add-050:149-153` (`planoDoOrgao`) e `:749-751`.
  - **O que o contrato pede:** 05 §3.7, linha 2, manda sincronizar quando "fase, **prazo**, capa ou próxima ação" diferem.
  - **O que o código faz:** o plano chama a 002 só se a fase, a capa ou a próxima ação mudaram. `casoDe` lê `CARD_PRAZO` e não o usa, e a consulta de casos da rotina nem o lê.
  - **Efeito (por leitura do código):** o prazo do card fica velho quando o menor liquidar/pagar até muda sem mexer no passo atual de data mais antiga. Exemplos: troca de regra ou de contratação numa NF que não é a da próxima ação.
  - **Correção:** acrescentar `K.PRAZO AS CARD_PRAZO` na consulta da rotina e `prazo !== String(caso.CARD_PRAZO || '')` na comparação.

## OBSERVAÇÃO

- **O-01 · prazos e etapa da NF gravados pela entrada** — `add-050:936-949` (`ccEscPubNfDatas`) e `:959-961` (`ccEscPubNfPassoAtualizar`).
  - **O que a guarda deixa passar:** `LIQUIDAR_ATE`, `PAGAR_ATE`, `LIMITE_2M`, `M2_DEVIDO`, `ETAPA_NF` (texto livre, sem lista) e `PROX_PASSO*` vêm da entrada. A guarda confere só a ordem das datas e o operador.
  - **Provado:** Carlos leva a 1001 de "liquidação vencida, 32 dias" para `NO_PRAZO`, atraso 0, fora de "acima de 2 meses", com `ETAPA_NF = 'XYZ'` (sai do funil do `ccPubResumo`).
  - **Por que é observação:** a próxima leitura (15–120 min) recalcula tudo. Ainda assim, a lista, o painel e o cumprimento ficam errados até lá.
  - **Sugestão:** calcular `ETAPA_NF` na SQL pelas datas (um `CASE`) e `LIMITE_2M` com `SOMAR_MESES` (já existe em `lib/concessao-credito/sql.mjs`), e registrar os prazos como reconciliados pela rotina.
- **O-02 · certidão direta sem validar conteúdo** — `add-050:986-994`.
  - **Provado:** grava emissão `'abc'`, validade `'2099-99-99'` e `ANEXO_ID` 777 inexistente.
  - **Risco:** com o id de um anexo real de outra entidade (um documento de processo, por exemplo), a URL sai em `ccPubCertidaoListar` para todo membro.
  - **Sugestão:** pôr o `EXISTS (… CC_ANEXO … ENTIDADE = 'CERTIDAO' AND REMOVIDO_EM IS NULL)` da JS (`:624-627`) também na guarda.
- **O-03 · as contas do orçamento divergem do plan, e duas linhas do plan não têm teste**
  - **O que o plan e 04 §5 dizem e o que o contador mediu:**

    | Operação | Plan / 04 §5 | Contador |
    |---|---|---|
    | `ccPubNfDatasSalvar` com mudança de fase | 16 | **15** |
    | `ccPubNfDatasSalvar` sem mudança | 3 | 2 |
    | `ccPubNfPassoRegistrar` sem e-mail | 14 | **10** |
    | `ccPubNfPassoRegistrar` com e-mail | 18 | **13** |
    | Abrir o card de `cobranca-publica` | 3 | 3 |
    | Rodada da rotina que cria 4 casos | ≤ 150 | 54 (a rotina informa 53) |

  - **Os testes:** afirmam ≤ 20 pelo contador (`smoke:374`, `:459`, `:485`), o que basta para o DT-29. Mas uma regressão de 10 para 19 passaria sem aviso. Abrir o card da concessão também está afirmado só como ≤ 7 (`:257`), contra 3 no plan.
  - **Sem teste:** as linhas do plan para o card de `cobranca-publica` (= 3) e para a rodada (≤ 150).
  - **Sugestão:** afirmar os números medidos e corrigir as contas do plan e de 04 §5.
  - **Detalhe:** o `execucoes` que a rotina devolve não soma as chamadas que lançaram erro (`:760-771`).
- **O-04 · `ON DUPLICATE KEY UPDATE c = VALUES(c)`** — `add-050:711`. Está obsoleto desde o MySQL 8.0.20: funciona, mas com aviso (o mesmo que o O-04 da B2-004).
- **O-05 · a rotina relê todo o histórico pago sem contratação, a cada rodada** — `add-050:724-725`. A condição `OR N.ANALISE_ID IS NULL` traz toda NF paga de órgão sem contratação, para sempre. Não grava (a diferença é vazia), mas a leitura cresce com o histórico. Restringir a NF paga com `CALCULADO_EM` nulo ou anterior a `ATUALIZADO_EM`.
- **O-06 · prazo do contrato sem teto** — `add-050:288-291` (JS) e `:929` (SQL). O caso pode gravar `prazoContratoDias = 99999`, inclusive depois da decisão (PA-18), e todas as NFs da contratação deixam de vencer. A mudança é auditada. Ainda assim, um teto (o 03 não fixa; algo como 365) evita o erro de digitação.
- **O-07 · a marca `ADMIN` opera qualquer NF** — `NF_OPERA` (`add-050:905`) e `operaNf` (`:169`) usam a visibilidade (`veTudo` inclui `ADMIN`). 04 §5 diz "caso", e o plan fixou "caso = `clienteVisivelA`". É coerente com a 002, mas Nara (agente, nível 1, marca) lança datas e passos de órgão de outra equipe. Vale uma linha no plan.
- **O-08 · testes mais fracos que a linha do plan**
  - Não há teste da chamada direta de `ccEscPubAnaliseMotor` seguida da decisão (B-01).
  - O RF-004 (`smoke:382-393`) não afirma "fotografia regravada".
  - O C-025 (`:184-194`) não chama `ccCobSituacao(5003)` (`BLOQUEIO_DEVIDO` vazio).
  - O RN-002·RN-031 (`:238-245`) é divergência declarada; ver a tabela.
- **O-09 · simplicidade:**
  - a rotina monta o SQL do Winthor com `split/join` (`:677-679`) em vez do `preencher()` de `lib/winthor-sql.mjs`, que a 001 usa;
  - `corpoMotorCalcular` repete a regra de `podeLer` inline (`:339`);
  - a lista dos tipos de certidão aparece três vezes (`:608`, `:989`, `:993`);
  - `ehVerdade(x) || x === true` (`:141`) é redundante.

  Nada disso é defeito. Fora isso, o código está enxuto: a regra fica numa lib pura e cada SF tem uma escrita por interna.

## Divergências declaradas pelo construtor

| Divergência | Avaliação | Ação |
|---|---|---|
| Cliente 5005 com NF antes do corte (2025-11-10) | Correta. É o jeito de o 5005 entrar no universo da 001 (movimento na janela) sem NF na 005, como pede o C-013 ("4 órgãos"). A contagem 9 do C-013 prova de quebra que a NF anterior ao corte fica fora. | Nenhuma |
| CNPJ da filial 1 como constante do seed | Correta. A 001 não guarda o CNPJ da empresa, e na plataforma quem cadastra a certidão informa o CNPJ. | Nenhuma |
| Orçamento afirmado ≤ 20 em vez de 16/14/18 exatos | O teto do DT-29 é 20, e o teste usa o contador. Mas o medido é 15/10/13, não 16/14/18: as contas do plan e de 04 §5 estão erradas e um teste exato não passaria. | O-03: afirmar o medido e corrigir plan e 04 §5 |
| RN-002·RN-031 conferem contagem e SLA, não o texto | Aceitável. Os textos são dados da 002 e da 004, e conferi-los contra a mesma constante seria tautológico. Um erro de digitação no texto público do 05 §3.3/§4.2 passa. | Registrar no plan, na linha RN-002/RN-031 |
| Prazo do card do órgão = menor prazo pendente entre NFs | Melhor que a letra de 05 §3.4: o "liquidar até" de NF já liquidada não é prazo. Mas a rotina não compara o prazo antes de chamar a 002. | C-05; anotar a leitura no plan |
| A rotina não encerra caso público de órgão sem NF na 005 | Inofensiva. Hoje só a 005 cria caso `PUBLICA` (`ccEscCobCasoInserir` só por `ccCobCasoSincronizar`), e NF cancelada continua em `CC_NF_PUBLICA`. Na prática o filtro não age. | Nenhuma (vale uma linha no plan) |

**Divergências não registradas no plan:**
- `ccEscPubAnaliseMotor` sem trava de proponente (B-01);
- `ccPubWinthorNf` publicada e no perfil sem uso (C-03);
- o cursor que não volta para órgão novo (C-04).
