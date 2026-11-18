# 06 — Seed e testes

Um elenco, um relógio, uma convenção de teste para os 7 módulos. O simulador roda as mesmas `definitions` e o mesmo DDL que vão para a plataforma.

## 1. Relógio único

| Item | Decisão |
|---|---|
| Variável | `CC_AGORA` (ambiente do simulador), formato `AAAA-MM-DDTHH:MM:SS`, hora de Brasília. **Só o simulador lê**; em produção não existe e vale o relógio real |
| Valor padrão | `2026-11-19T10:00:00` (quinta-feira; 20/11/2026 é feriado nacional — exercita dia útil) — chamado **D** abaixo |
| Como a JS lê | `agora()` / `hoje()` de `backend/lib/tempo.mjs` (preâmbulo). Proibido `new Date()` solto em regra |
| Como a SQL lê | fragmentos `HOJE_SQL` / `AGORA_SQL` (01 §3). No simulador, `UTC_TIMESTAMP()` devolve `CC_AGORA` + 3 h |
| Escrita interna | `ccEsc…` recebe `{{agora}}` da JS; nunca calcula data |
| Lib do quadro | o runtime do simulador desloca `Date` para `CC_AGORA` em toda SF JS, inclusive as `kb*` (`FASE_DESDE`, `KB_MOVIMENTO` ficam coerentes) |
| Tela | nunca envia "hoje"; o que mostra de data relativa vem da SF |
| Nos testes | `fixarRelogio(iso)` e `comRelogio(iso, fn)` de `backend/simulator/relogio.mjs` (integrador). Avançar o dia = `fixarRelogio` + `rodarCron('ccRotina')`. `rodarCron` do simulador apaga `CC_ESTADO['rotina.trava']` antes de chamar (no simulador não há concorrência; a trava se testa chamando o `ccRotina` duas vezes direto). **A rotina só roda com o relógio para frente** da última leitura: com o relógio para trás a regra 2 de 01 §11 não abre leitura e a posição fica a antiga (DT-38) |
| Relógio do smoke | cada `smoke/NNN` exporta `RELOGIO` (padrão D): 004 e 006 `2026-11-14T10:00:00`; 005 `2026-12-01T10:00:00`. É o relógio em que o banco é entregue ao teste |
| Datas do seed | relativas ao `RELOGIO` do banco: `dia(n)` = `RELOGIO` + n dias corridos (`dia(-12)` = 12 dias atrás); `diaUtil(n)` para úteis; também em `comRelogio(dia(n), …)`. Data absoluta só para o que é absoluto por natureza (feriado, vigência de parâmetro): o seed é carregado também em bancos de outro `RELOGIO` (006, 007) |

## 2. Elenco único

Arquivo `backend/simulator/seed/000-elenco.mjs` (integrador; conteúdo abaixo). Ninguém cria usuário, membro, BU, ramo ou filial fora dele.

### 2.1 Usuários e equipe

`INT_USER` na ordem (id = posição); e-mail `<login>@benenutri.local`; senha única do simulador em `backend/simulator/config.mjs`.

| INT_USER | Login | `CC_MEMBRO.ID` | Nome | Cargo | Nível | Superior | `CAMINHO` | Observação |
|---|---|---|---|---|---|---|---|---|
| 1 | nara | 9 | Nara Admin | AGENTE + `ADMIN` | 1 | Gustavo | `/1/2/9/` | administradora |
| 2 | diana | 1 | Diana Rocha | DIRETORIA | 5 | — | `/1/` | topo; faz o papel de Diretor financeiro (P-12) |
| 3 | gustavo | 2 | Gustavo Lima | GERENTE | 3 | Diana | `/1/2/` | |
| 4 | sergio | 3 | Sérgio Nunes | SUPERVISOR | 2 | Gustavo | `/1/2/3/` | |
| 5 | silvia | 4 | Silvia Prado | SUPERVISOR | 2 | Gustavo | `/1/2/4/` | |
| 6 | ana | 5 | Ana Costa | AGENTE | 1 | Sérgio | `/1/2/3/5/` | |
| 7 | bruno | 6 | Bruno Dias | AGENTE | 1 | Sérgio | `/1/2/3/6/` | |
| 8 | carlos | 7 | Carlos Melo | AGENTE | 1 | Silvia | `/1/2/4/7/` | carteira pública |
| 9 | julia | 8 | Júlia Farias | JURIDICO | 0 | Gustavo | `/1/2/8/` | |
| 10 | otavio | 10 | Otávio Reis | AGENTE | 1 | Sérgio | `/1/2/3/10/` | **inativo** |
| 11 | visitante | — | — | — | — | — | — | usuário sem vínculo (deve ver "sem acesso") |
| 12 | rita | 11 | Rita Alves | ANALISTA | 1 | Sérgio | `/1/2/3/11/` | analista de crédito |

### 2.2 Dados de referência (Winthor simulado e cadastros)

| Coisa | Valores |
|---|---|
| Departamentos (`PCDEPTO`) → BU | 10 NUTRICAO → BU 1 Nutrição (`PRIVADA`) · 20 ENFERMAGEM → BU 2 Enfermagem (`PRIVADA`) · 30 MEDICAMENTOS → BU 3 Medicamento (`PRIVADA`) · 40 ESTETICA E INJETAVEIS → BU 4 Estética (`ESTETICA`) · 90 DIVERSOS → sem BU (0) |
| Produtos (`PCPRODUT`) | 101 (depto 10) · 201 (20) · 301 (30) · 401 (40) · 901 (90) |
| Ramos (`PCATIVI`) | 1 HOSPITAL · 2 CLINICA · 3 FARMACIA · 4 HOME CARE · 11 ORGAO PUBLICO FEDERAL · 12 ORGAO PUBLICO ESTADUAL · 13 ORGAO PUBLICO MUNICIPAL · 20 ORGAO PUBLICO AUTARQUIA (fora da lista `base.ramosPublicos`: prova o prefixo) |
| RCA (`PCUSUARI`) | 10 CARLOS LIMA · 11 MARIA SOUZA |
| Planos (`PCPLPAG`) | 1 A VISTA (0 dias) · 30 30 DIAS (30) · 35 28/35/42 DIAS (35) |
| Cobranças (`PCCOB`) | BK BOLETO · PIX PIX · DESD DESDOBRADO · CANC CANCELADO |
| Filiais (`PCFILIAL`, `CC_FILIAL_CREDORA`) | 1 BENENUTRI MATRIZ (DF) · 2 BENENUTRI GOIAS (GO). `CC_FILIAL_CREDORA.CODIGO` = `CODFILIAL`; o elenco grava só `CODIGO`, `UF` e `ATIVA` (e pula se a tabela da 003 ainda não existe) (razão social, CNPJ, banco e representante entram pelo smoke da 003 com `ccJurFilialCredoraSalvar`) |
| Feriados (`CC_FERIADO`) | nacionais de 2026 e 2027 + 30/11/2026 (DF, Dia do Evangélico) |
| Parâmetros | padrões de 03, sem valor próprio da `ESTETICA`, gravados pela **mesma fusão** do `setup-backend.mjs` (`lib/parametros/*` presentes, com `vigencias` e `carteiras`, 01 §9); modelos idem (`semearModelos()`) |
| Modelos | todos de `lib/modelos/*`; os de efeito legal nascem **não validados** (os smokes validam como Júlia quando precisam enviar) |

### 2.3 Regras de código e documento

| Faixa de `CODCLI` | Dona | Documento |
|---|---|---|
| 1001–1099 | 001 | CNPJ `AB.CD0.000/0001-AB` para o código `ABCD` (ex.: 2003 → `20.030.000/0001-20`); pessoa física: CPF `AB0.CD0.000-AB`. Exceção fixa: 1001 = `12.345.678/0001-90` |
| 2001–2099 | 002 | idem |
| 3001–3099 | 003 | idem |
| 4001–4099 | 004 | idem |
| 5001–5099 | 005 | idem |
| 6001–6099 | 006 | idem |
| 7001–7099 | 007 | idem |

Dígito verificador não é conferido pelo sistema. `NUMTRANSVENDA` = `CODCLI × 100 + n`; `DUPLIC` = `NUMTRANSVENDA`. Cada nota é criada pelo ajudante `nota({ codcli, n, emissao, numnota?, itens: [{ codprod, valor }], parcelas: [{ prest, valor, venc, pago?, pagoEm?, codcob? }] })`, que grava `PCNFSAID`, `PCMOV`, `PCMOVCOMPLE` e `PCPREST` coerentes (é o que dá BU por item); `numnota` omitido = `NUMTRANSVENDA`. O seed de um módulo: (a) usa só a sua faixa; (b) grava Winthor pelos ajudantes e as **suas** tabelas `CC_`; (c) nunca grava tabela de outra dona — estado de outro módulo se alcança chamando a SF dele ou rodando `ccRotina` no smoke.

**Seed em partes e pipeline do banco (DT-38).** `seed/NNN-<slug>.mjs` exporta `winthor()` (notas e títulos, pelos ajudantes) e, se precisar: `ATRIBUICAO` (agente e analista dos clientes da **sua** faixa que não estão na linha "Atribuição" de §2.5, no formato da lista do elenco; aplicada no passo 7), `dominio()` e, só se precisar do estado da rotina numa data anterior ao `RELOGIO`, `INICIO` (`dia(-n)`) e `passado()`. O `dominio()` grava (fechamento v2): (a) estado de domínio pelas SFs públicas, da própria spec ou de outra dona, com `como()`; (b) direto nas **próprias** tabelas `CC_`, só o que nenhuma SF grava: carga que não aponta cliente nem card (fontes e material da 007, regras iniciais da 005), estado histórico (decisões antigas, fotos), inclusive apagar ou trocar linha da própria tabela que a rotina gravou nos passos 8–9 (fotos da 006); (c) mudança no Winthor simulado da **própria** faixa (ajudantes ou `UPDATE` em `PC*` da faixa), que a leitura do passo 11 lê. O seed nunca grava `CC_CLIENTE` (nasce na leitura), nunca grava tabela de outra dona, nunca atribui no `dominio()` (atribuição é do passo 7, para o card nascer no passo 8 com o responsável) e nunca chama `rodarCron` dentro de `dominio()`. `seed.mjs` e `smoke/base.mjs` montam todo banco por este pipeline, na ordem:

| # | Passo | Relógio |
|---|---|---|
| 1 | DDL de todos os módulos presentes | — |
| 2 | `000-elenco` (usuários, equipe, BUs, ramos, filiais, feriados, parâmetros e modelos pela fusão do setup) | — |
| 3 | **semear os quadros**: `semearQuadro(QUADROS)` de cada `lib/quadros/NNN-*.mjs` presente, na ordem das specs — a mesma função que o `add-0N0` chama na publicação (o runtime do simulador só carrega `definitions` e não roda `isEntrypoint()`) | — |
| 4 | `fixarRelogio(T0)`; T0 = o menor `INICIO` dos seeds declarados, ou `RELOGIO` se nenhum exporta | T0 |
| 5 | `winthor()` de cada seed declarado (datas por `dia(n)` do `RELOGIO`) | T0 |
| 6 | `rodarCron('ccRotina')` até a leitura ficar `OK` (rodada de leitura só roda o passo `SINC`) — cria `CC_CLIENTE` e as posições | T0 |
| 7 | `atribuir()` do elenco sobre a coluna Agente de §2.4, a linha "Atribuição" de §2.5 e a `ATRIBUICAO` de cada seed declarado: agente por `ccBaseClienteAtribuir` como Gustavo; analista por `ccEscBaseClienteAnalista` com o `membroId` de Gustavo (`ccBaseClienteAtribuir` só grava agente); cliente ausente de `CC_CLIENTE` (seed não declarado) é pulado | T0 |
| 8 | `rodarCron('ccRotina')` até o processamento terminar (todos os passos `OK`, sem `pendentes`): cards nascem já com o agente como responsável | T0 |
| 9 | `passado()` dos seeds que o exportam, na ordem das specs; depois, se T0 < `RELOGIO`, `fixarRelogio(RELOGIO)` + `rodarCron` até leitura e processamento terminarem | T0 → `RELOGIO` |
| 10 | `dominio()` de cada seed, na ordem das specs; `comRelogio(dia(n), …)` só carimba datas das SFs (nunca roda a rotina) | `RELOGIO` |
| 11 | `ccBaseSincronizacaoPedir` como Gustavo + `rodarCron('ccRotina')` até leitura e processamento terminarem: a rotina vê o que o `dominio()` gravou (promessa vencida quebra, processo leva o caso a `juridico`, card do crédito substituído vai a `encerrada`). O banco é entregue ao smoke neste estado | `RELOGIO` |

Consequências: atribuição vai no passo 7 (§2.4, §2.5 ou `ATRIBUICAO` do seed); contatos e estado de domínio, no `dominio()` (depois da leitura); estado que depende da posição numa data passada (ex.: 3013 em `protesto`) vai em `passado()`, com `INICIO`; nenhum seed volta o relógio para antes da última leitura. O teste que precisa ver a rotina "antes" de um evento parte do estado do passo 11.

### 2.4 Clientes da 001 (posição, visibilidade, BU, setor)

| CODCLI | Nome | Ramo / tipo | UF | Agente | Limite | Títulos (valor · vencimento · BU) |
|---|---|---|---|---|---|---|
| 1001 | HOSPITAL SAO LUCAS LTDA | 1 · PJ | DF | Ana | 10.000 | 1.000 · `dia(-12)` · 60% Nutrição / 40% Enfermagem — 500 · `dia(-3)` · Nutrição — 2.000 e 300 (duas parcelas) · `dia(5)` · Enfermagem — 800 · `dia(20)` · Medicamento — 700 · `dia(-30)` pago em `dia(-28)` — 1.200 cancelado |
| 1002 | CLINICA VIDA ME | 2 · PJ | DF | Ana | 5.000 | 2.500 · `dia(-8)` · Nutrição |
| 1003 | FARMACIA NOVA LTDA | 3 · PJ | GO | — | 3.000 | 1.000 · `dia(10)` · Medicamento |
| 1004 | LABORATORIO CENTRAL SA | 2 · PJ | DF | Bruno | 8.000 | 3.000 · `dia(-45)` · Enfermagem |
| 1005 | CASA DE REPOUSO BEM VIVER | 4 · PJ | DF | Bruno | 2.000 | 600 · `dia(0)` · Nutrição |
| 1006 | DROGARIA POPULAR LTDA | 3 · PJ | GO | Carlos | 6.000 | 4.000 · `dia(-20)` · Medicamento |
| 1007 | SECRETARIA MUNICIPAL DE SAUDE DE ANAPOLIS | 13 · PJ (público) | GO | Carlos | 0 | 12.000 · `dia(-60)` · Nutrição (carteira `PUBLICA`) |
| 1008 | HOME CARE ALFA LTDA | 4 · PJ | DF | Sérgio | 4.000 | 900 · `dia(3)` · Enfermagem |
| 1009 | ESTETICA BELLA LTDA | 2 · PJ | DF | — | 3.000 | 1.500 · `dia(-2)` · Estética (carteira `ESTETICA`) |
| 1010 | CLINICA DERMA LTDA | 2 · PJ | DF | Ana | 5.000 | 2.200 · `dia(-15)` · 50% Estética / 50% Nutrição (duas carteiras) |
| 1011 | CLIENTE SEM MOVIMENTO LTDA | 1 · PJ | DF | — | 0 | nenhum |
| 1012 | JOAO PEREIRA DA SILVA | 2 · **PF** | DF | Bruno | 1.000 | 400 · `dia(-6)` · Nutrição · um título 300 `dia(-9)` com cobrança `DESD` (some com `base.cobrancasExcluidas = 'DESD'`) |

### 2.5 Clientes dos outros módulos (códigos e situação fixos; valores exatos no seed da dona)

| CODCLI | Nome | Dona | Situação que produz |
|---|---|---|---|
| 2001 | CLINICA AURORA LTDA | 002 | 5.000 vence em `dia(5)` → `prev_d5` |
| 2002 | HOSPITAL BOA ESPERANCA | 002 | 8.000 vence em `dia(1)` → `prev_d1` |
| 2003 | FARMACIA CENTRAL LTDA | 002 | 3.000 vence hoje → `venc_d0` |
| 2004 | CLINICA SAO JOSE | 002 | 4.000 · atraso 2 → `pag_nao_ident` |
| 2005 | HOSPITAL SANTA CLARA | 002 | 12.000 · atraso 4 → `cob_ativa`, bloqueio de pedidos devido |
| 2006 | DROGARIA MODELO | 002 | 6.000 · atraso 7 → `notif_formal`, fila de e-mail a aprovar |
| 2007 | CLINICA HORIZONTE | 002 | 9.000 · atraso 10 → `protesto`, bloqueio total devido |
| 2008 | LAR ESPERANCA | 002 | 7.000 · atraso 20 → `neg_pos_protesto`; promessa de `dia(-6)` sem pagamento → quebrada |
| 2009 | HOSPITAL REGIONAL NORTE | 002 | 15.000 · atraso 30 → `extrajudicial` |
| 2010 | DISTRIBUIDORA VITAL | 002 | 20.000 · atraso 47 e 10.000 · atraso 17 → `Pronto para o Jurídico`; encargos título a título |
| 2011 | CLINICA BEM ESTAR | 002 | 10.000 · atraso 25, acordo vigente (entrada paga, 4 parcelas, próxima em `dia(5)`) → `acordo` |
| 2012 | ESTETICA LUMINA | 002 | 2.500 · atraso 5 em Estética **e** 1.000 · atraso 12 em Nutrição → um caso em cada quadro |
| 2013 | CLINICA RENASCER | 002 | 3.000 · atraso 15 protestado; o smoke paga e roda a rotina → `regularizado` + anuência |
| 2014 | ANA BEATRIZ RAMOS | 002 | **PF** · 800 · atraso 9 → baixa proposta (Gerente) |
| 3001 | COMERCIAL ATLAS LTDA | 003 | demonstrativo de referência: 18.000 · `dia(-38)` e 12.000 · `dia(-30)` → total **31.087,25** (fórmula em 03 §6); dossiê em montagem |
| 3002 | HOSPITAL VALE VERDE | 003 | processo em `citacao` com autos, andamentos e custos (um pago, um a pagar antigo) |
| 3003 | CLINICA NOVA ERA | 003 | processo em `acordo` com acordo judicial de 5 parcelas e honorários |
| 3004 | FUNDO MUNICIPAL DE SAUDE DE LUZIANIA | 003 | órgão (ramo 13): dossiê público |
| 3005–3012, 3014–3020 | (nomes no seed da 003) | 003 | carteira de teste da spec 003 (processos por fase, desvios, indicadores, carga com 5 processos); lista e situações na seção Testes da spec 003 |
| 3013 | IOTA FARMA LTDA | 003 | 20.000 · `dia(-52)` e 13.000 · `dia(-40)` → total **34.388,25**; sem processo |
| — | ANTIGA FARMACIA LTDA | 003 | processo da carga sem cliente (vínculo manual) |
| 4001 | CLINICA ALFA LTDA | 004 | cliente novo, solicitação de 40.000 (Supervisor) |
| 4002 | HOSPITAL BETA SA | 004 | recorrente pontual, 300.000 (Gerente) |
| 4003 | REDE GAMA SAUDE | 004 | 1.500.000 (Comitê regional; exige balanço) |
| 4004 | GRUPO DELTA HOSPITALAR | 004 | 3.000.000 (Comitê executivo); mesmo grupo econômico de 4003 |
| 4005 | CLINICA EPSILON | 004 | crédito vencido ontem com 3 compras → reanálise |
| 4006 | FARMACIA ZETA | 004 | crédito vigente, 100 dias sem compra → obsoleto |
| 4007 | HOSPITAL ETA | 004 | limite 100.000, utilizado 95.000; pedido de 20.000 (excesso 15% → Gerente) |
| 4008 | MARIA APARECIDA SOUZA | 004 | **PF**, solicitação de 8.000 |
| 4009 | ESTETICA PRIME | 004 | solicitação de 60.000 no quadro `concessao-estetica` |
| 4010 | CLINICA THETA | 004 | atraso 20 dias com pedido retido → Comitê de crédito; criticidade crítica |
| 5001 | SECRETARIA DE ESTADO DE SAUDE DO DF | 005 | ramo 12; contrato vigente; NF sem protocolo → `nf_protocolar`; solicitação aprovada (P1) |
| 5002 | FUNDO MUNICIPAL DE SAUDE DE GOIANIA | 005 | ramo 13; NF com liquidação vencida; passos `L1` e `L2` feitos |
| 5003 | HOSPITAL UNIVERSITARIO FEDERAL | 005 | ramo 11; NF com pagamento vencido acima de 2 meses → `M2` devido |
| 5004 | FUNDO MUNICIPAL DE SAUDE DE TRINDADE | 005 | ramo 13; NF de pequeno valor; todas pagas (uma com atraso) → `regularizado` |
| 5005 | AUTARQUIA DE SAUDE DE FORMOSA | 005 | ramo 20 (público pelo prefixo); solicitação com base `EDITAL` → pré-aprovada; valor 1.200.000 → Diretoria |
| 6001–6010 | CARTEIRA 01 … CARTEIRA 10 | 006 | um cliente por faixa de aging e por movimento de roll rate (melhora, piora, cura, entrada), em 3 BUs e 2 agentes; fotos de 2 meses anteriores gravadas pelo seed da 006 |
| 7001 | ALFA DISTRIBUIDORA LTDA | 007 | eventos nas categorias do privado, montados no smoke pelas SFs das donas (contatos, promessa, acordo, e-mail, solicitação, pedido); processo fica no 7003 e Setor público é afirmado no 5002 |
| 7002 | BETA SEM HISTORICO LTDA | 007 | um título de 4.000 a vencer em `dia(60)` (entra na leitura, não abre cobrança): nenhum evento |
| 7003 | GAMA EM JUIZO LTDA | 007 | com processo (visão do Jurídico) |

Atribuição (passo 7 de §2.3): 2001–2007 Ana · 2008–2014 Bruno · 3001–3003 Ana · 3013 Ana · 3005–3012 e 3017–3020 Bruno · 3014 Carlos · 3015 e 3016 sem agente · 3004 e 5001–5005 Carlos · 4001–4010 analista Rita (agente Bruno) · 6001–6005 Ana · 6006–6010 Carlos · 7001–7003 Ana. Clientes a mais de cada spec (ex.: 2015–2058 da 002) entram pela `ATRIBUICAO` do seed dela. Fontes de apoio (41, das quais 21 a revisar) e materiais (7) são seed da 007.

## 3. Convenção de testes

| Item | Regra |
|---|---|
| Backend | `backend/simulator/smoke/NNN-<slug>.mjs`, um por módulo; `npm test` = `sim:check` (todo SQL roda) + todos os smokes |
| Banco | cada smoke começa de banco novo pelo pipeline de §2.3, com o seed do módulo e os de quem ele depende, declarados no topo do arquivo (nenhum seed de clientes de outra spec sem declarar) |
| Título | `teste('C-003: …')` ou `teste('RN-015: …')` — começa pelo id do cenário ou da regra da spec; um teste por linha da seção Testes da spec |
| Identidade | `como('ana', async () => { … })` define o usuário da sessão; rotina por `rodarCron('ccRotina')` |
| As duas situações (05 §1, 01 §4 DT-34) | toda escrita que mexe em card e toda leitura JS chamada aninhada são exercitadas com `SIM_SESSAO_ANINHADA=0` e `=1` (`nasDuasSessoes(fn)` de `smoke/base.mjs`); o resultado tem de ser igual |
| Orçamento | `execucoes(fn)` conta SFs executadas (aninhadas inclusive); cada módulo afirma: abrir tela (ou bloco) ≤ 6, clique de escrita ≤ 20 (`ccJurDossieEnviar` ≤ 30), rodada da rotina ≤ 150 (01 §10) |
| Módulo ausente | SF de outro módulo com id 0 → `pular('depende de 00N')`, nunca falha |
| Fluxos entre módulos | `smoke/900-fluxos.mjs` (integrador): cobrança → dossiê → Jurídico (privada e pública); NF pública → quadro `cobranca-publica`; concessão pública (pré-aprovada → aprovada); baixa com parecer; visibilidade por cargo nos 8 quadros; **datas da NF → card do `cobranca-publica` no clique** (`ccPubNfDatasSalvar` como o agente do órgão, com `nasDuasSessoes`: card na fase nova, nota "Etapa do órgão: …", `FASE_DEVIDA` gravada e ≤ 20 nas duas hipóteses de sessão; DT-34, DT-35); **decisão pública com a fotografia do órgão** (`ccPubAnaliseSalvar` → `ccCredDecisaoRegistrar` na `PUBLICA`: `CC_DECISAO.RATING_PUB` e `LIMITE_MOTOR` = `EXPOSICAO`, `CC_CREDITO.ANALISE_ORGAO_ID`; motor mudado depois da análise → "O motor mudou…"; DT-36). Os dois últimos vieram de `pedidos/01-correcoes-v2.md` §3 item 5 |
| Frontend | `frontend/tests/NNN-<slug>.test.mjs` (`node --test`) para regra pura de tela: `nomeDaFase`, dias úteis, máscaras, simulação de acordo |
| D-05 | 002 e 004 rodam os mesmos testes de fluxo para `PRIVADA`, `ESTETICA` e `PUBLICA` trocando só a carteira (o que não se aplica à carteira é afirmado como recusa) |

## 4. O que o simulador precisa emular

| De | O quê |
|---|---|
| Plataforma | `{{param}}` por substituição de texto; `:VAR_USER`; SF por id (`executeServerFunctionMitra`) com injeção do mapa de ids; `runQueryMitra`; `runDmlMitra` só em cron; `sendEmailMitra` gravando em `SIM_EMAIL` (o teste lê); `uploadFilePublicMitra` devolvendo endereço falso; cron disparado à mão; contador de execuções; perfil único (tudo liberado) |
| Sessão | usuário do login; chamada aninhada com `userId = 0` (padrão) ou com a sessão (`SIM_SESSAO_ANINHADA=1`); cron sempre sem sessão |
| Lib do quadro | DDL `KB_*` e as SFs `kb*` reais da lib instalada (como no SGC 2), com os ganchos apontando para `ccPodeMover`/`ccPodeExcluir`; "em nome de" só sem sessão; cobrança de obrigatórios e de condição de entrada em todo movimento |
| Winthor | tabelas `PC*` de 02 no mesmo SQLite; `jdbcId` do Winthor resolve para elas; funções Oracle usadas em `winthor-sql.mjs`: `NVL`, `TO_DATE`, `TO_CHAR`, `TRUNC`, `SYSDATE` (= `CC_AGORA`) |
| Relógio | §1 |

## 5. Armadilhas MySQL × SQLite (achadas pelos validadores) e a regra

| Armadilha | Regra |
|---|---|
| `UPDATE … SET A = x, B = CASE WHEN A <> …`: MySQL avalia da esquerda para a direita e já enxerga o `A` novo; SQLite enxerga o antigo | coluna calculada a partir do valor antigo vem **antes**, na lista do `SET`, da coluna que ela compara; regra: nunca citar, numa expressão do `SET`, coluna já atribuída à esquerda dela (melhor ainda, não depender da ordem) |
| `UPDATE … JOIN` (não existe no SQLite) | `UPDATE … WHERE … IN (SELECT …)` ou subconsulta escalar |
| `UPDATE`/`DELETE` com subconsulta na mesma tabela (erro 1093 no MySQL) | embrulhar em tabela derivada que o MySQL materialize (`SELECT DISTINCT …` ou com agregado); derivada simples pode ser fundida (`derived_merge`) e o 1093 volta |
| `JSON_TABLE` (recusado pela proteção de parâmetros e ausente no SQLite) | listas alinhadas + `NUMEROS_20` (01 §5) |
| `WITH RECURSIVE` | não usar: hierarquia por `CC_MEMBRO.CAMINHO` |
| `NOW()`, `CURDATE()`, `CURRENT_TIMESTAMP` | proibidos: `HOJE_SQL` / `AGORA_SQL` |
| `DATEDIFF`, `DATE_FORMAT`, `DATE_ADD`, `GREATEST`, `LEAST`, `FIND_IN_SET`, `SUBSTRING_INDEX`, `CONVERT_TZ`, `GROUP_CONCAT … SEPARATOR`, `TIMESTAMPDIFF`, `CHAR_LENGTH`, `CAST(… AS SIGNED|CHAR|DECIMAL(p,s))`, `FORMAT(x, 2, 'pt_BR')`, `HEX(…)` (comparar texto sensível a maiúscula e acento no MySQL) | permitidos (o simulador tem a emulação); função fora desta lista entra primeiro na emulação |
| `DATE_ADD` no simulador: só `INTERVAL <n> SECOND|MINUTE|HOUR|DAY` (sem `MONTH`) e sem vírgula dentro da expressão do valor | mês por aritmética (`SOMAR_MESES` da 004); expressão com vírgula montada com `CASE`/`SUBSTRING` fora do `INTERVAL` |
| Parâmetro numérico `{{x}}` sem aspas (vira injeção se a plataforma substituir texto, S-16) | sempre `CAST('{{x}}' AS SIGNED)` / `CAST('{{x}}' AS DECIMAL(p,s))` (01 §5); na SQL do Winthor (Oracle) `CAST('{{x}}' AS INTEGER)`; dinheiro `DECIMAL(15,2)`; número opcional vai como `0`, nunca `''` (erro em INSERT/UPDATE estrito); exceção `LIMIT/OFFSET` (linha abaixo, depende da S-16: SQL chamada direto pela tela não passa por JS) |
| `INSERT IGNORE`, `ON DUPLICATE KEY UPDATE` | permitidos; exigem a `UNIQUE KEY` declarada no DDL dos dois lados |
| `ROW_NUMBER() OVER` | evitar (S-06); se usar, só em leitura |
| `JSON_EXTRACT` | sempre `JSON_UNQUOTE(JSON_EXTRACT(col, '$.chave'))`; chave de campo sem ponto nem espaço |
| Comparação de texto: MySQL ignora maiúsculas e acentos (colação), SQLite não | busca sempre em coluna normalizada (`NOME_BUSCA`, `BUSCA`) com o termo normalizado pela JS ou pela tela. Exceção aceita (O-07 da B3): processo da carga sem cliente é buscado por `UPPER(NOME_DEVEDOR)`; com acento, casa no MySQL (`ai_ci`) e não no simulador |
| `BOOLEAN`: `TRUE`/`FALSE` × 1/0 | comparar com `= TRUE` / `= FALSE`; nunca somar booleano |
| Divisão inteira (SQLite trunca `1/2`) | multiplicar por `1.0` ou `CAST(… AS DECIMAL)` |
| `LIMIT {{limite}} OFFSET {{offset}}` | sempre numérico, nunca vazio; padrão 20 / 0. Única exceção ao `CAST` de número: o MySQL só aceita literal aqui (depende da proteção de parâmetros da plataforma, S-16) |
| `CONCAT` com `NULL` (MySQL devolve `NULL`) | `COALESCE` em cada parte |
| Oracle no Winthor: `NVL`, `TO_DATE`, `REGEXP_REPLACE` | só dentro de `winthor-sql.mjs` / `winthor-nf.mjs`; `REGEXP_REPLACE` não é emulado — limpar documento na JS |
| Datas `VARCHAR` | comparar só no formato `AAAA-MM-DD` (ordem de texto = ordem de data); aritmética por `DATEDIFF`/`DATE_ADD` |
