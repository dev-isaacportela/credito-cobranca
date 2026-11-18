# Plan: Setor público — nota fiscal, motor do órgão, regras por ente, comunicação e certidões

**Spec:** [`spec.md`](spec.md) · **Data:** 2026-11-14 · refeito contra `docs/contrato/` (fase 0c)

> O COMO. Nenhum requisito novo nasce aqui. Nomes, colunas, parâmetros e
> assinaturas estão no contrato; este plano aponta a seção (`02 §005`, `04 §5`)
> e explica só o que o contrato não diz: algoritmo, ordem das escritas, casos de
> borda e como testar. As lacunas e contradições achadas no replanejamento
> (`docs/contrato/pedidos/005-setor-publico.md`, PA-nn) foram decididas pelo
> arquiteto em `docs/contrato/pedidos/00-respostas.md` (16/11/2026) e já estão
> no contrato; o plano cita o PA só como referência.

## Constitution Check

| Princípio | Toca? | Como atende |
|---|---|---|
| I. Spec antes de código | sim | `spec.md` corrigida; zero `[NEEDS CLARIFICATION]`: as pendências têm padrão adotado (P-05, P-09, P-14, P-22, P-23, P-06/P-11, P-29 e P-47, o pequeno valor) |
| II. A política é dado | sim | 15 chaves `pub.*` e 47 `pubMotor.*` (03 §15–16), declaradas em `lib/parametros/005-setor-publico.mjs`; alçada e encargos do órgão são valor da carteira `PUBLICA` (03 §7, §18), não desta spec; regras por ente são cadastro; SLA é do quadro |
| III. A regra roda no servidor | sim | Ordem das datas, antecedência do passo, modelo validado, permissão de regra e certidão e estado da análise valem na JS **e** na guarda da `ccEscPub…` (01 §5). Trava do órgão no quadro = trecho do gancho (04 §8). A tela não calcula prazo, régua nem motor: mostra o que a SF devolve (`passos[].podeFeito`, `motor`). Identidade por `quem()` |
| IV. Winthor é a fonte do financeiro | sim | NF, parcelas, saldo e pagamento lidos pela rotina (`runQueryMitra` com o SQL de `winthor-nf.mjs`); nada é escrito no Winthor. A posição do órgão é a da 001 (P-09): esta spec não grava posição |
| V. Toda escrita é auditada | sim | `auditar()` em toda JS-E, áreas `Setor público`, `Notas fiscais`, `Regras por ente`, `Certidões` (01 §7); teste RN-039. A mudança de etapa do órgão é auditada pela `ccCobCasoSincronizar` (002), com a nota "Etapa do órgão: <nome>" que a 005 manda na entrada `nota` (rotina e `ccPubNfDatasSalvar`; 05 §3.7) |
| VI. Testes obrigatórios | sim | Uma linha de teste por linha da seção Testes da spec (mapa abaixo); smoke sobre as SFs reais de 001, 002 e 004, sem dublê |
| VII. Migrations append-only | sim | DDL em `backend/schema/005-setor-publico.mjs`; nada em `backend/migrations/` |
| VIII. Simplicidade | sim | Sem tabela de passo pendente, sem leitura completa diária, sem cópia de regra na tela, sem tela própria para o que é de 002/004. Atalhos com teto marcados `ponytail:` (PA-01, PA-09, PA-20) |
| IX. Segurança | sim | Winthor pela conexão nomeada (`jdbcIdWinthor()`); nenhuma credencial; arquivo de certidão em endereço público com as mitigações de 01 §12 |

## Contexto técnico

- **Frontend:** React 19 · Vite 7 · Tailwind 4 · react-router 7 · `mitra-interactions-sdk` · `@benenutri/mitra-kanban`
- **Backend:** tabelas e SFs na plataforma Mitra, provisionadas por `backend/add-050-setor-publico.mjs` com `mitra-sdk`
- **Reuso (não reimplementar):** `lib/escritas.mjs`, `guarda.mjs`, `visibilidade.mjs`, `parametros.mjs`, `tempo.mjs`, `dias-uteis.mjs` (001); `ccEmailEnviar`, `ccBaseModelo*`, `ccBaseAnexoRegistrar`, `ccBaseParametro*` (001); `ccCobCasoSincronizar`, `ccCobContatoRegistrar` (002); `ccCred*` da carteira `PUBLICA` e `ccPodeMover` (004/001); card aberto, quadro e e-mail da lib
- **Dependência nova:** nenhuma

### Arquivos (costuras de 01 §14 — nenhum arquivo de outra spec é editado)

| Caminho | Conteúdo |
|---|---|
| `backend/add-050-setor-publico.mjs` | `definitions` das 28 SFs (18 públicas + 10 internas; `ccPubWinthorNf` de 04 §5 não é publicada, C-03 da B3); no `isEntrypoint()`, insere as 5 regras iniciais se a tabela estiver vazia (na publicação; no simulador o runtime não roda `isEntrypoint()` e quem insere é o `dominio()` do seed, com a mesma condição — DT-38). Sem `QUADROS` |
| `backend/schema/005-setor-publico.mjs` | DDL das 5 tabelas de 02 §005 |
| `backend/lib/setor-publico/motor.mjs` | `motorOrgao`, `fimMandato`, `capacidadeSugerida`, `podeAprovar` |
| `backend/lib/setor-publico/nf.mjs` | `regraDaNf`, `prazosNf`, `mais2Meses`, `etapaNf`, `situacaoNf`, `reguaNf`, `passoAtual`, `etapaOrgao`, `proximaAcaoOrgao`, `validarDatas`, `historicoPagamento`, `situacaoCertidao`, `alertaContrato`, `tipoMensagem`; fragmentos `SITUACAO_NF_SQL`, `DIAS_ATRASO_NF_SQL`; `REGRAS_INICIAIS` |
| `backend/lib/setor-publico/winthor-nf.mjs` | o SQL Oracle das NFs de órgão, lido só pela rotina (02 §Winthor; único lugar que muda com a S-12) |
| `backend/lib/parametros/005-setor-publico.mjs` | chaves de 03 §15–16 + `validarConjunto` |
| `backend/lib/modelos/005-setor-publico.mjs` | 7 modelos `PUB_*` (Anexo A da spec): `PUB_ANALISE`, `PUB_PROTOCOLO`, `PUB_LIQ`, `PUB_FILA`, `PUB_PAGAMENTO`, `PUB_OFICIO`, `PUB_REQUERIMENTO` (04 §5) |
| `backend/lib/quadros/005-setor-publico.mjs` | só `gancho('concessao-publica')` |
| `backend/simulator/seed/005-setor-publico.mjs` · `smoke/005-setor-publico.mjs` | seed (faixa 5001–5099) e testes |
| `frontend/src/modules/005-setor-publico/` | telas, rotas, menu, `extensoes.ts` |
| `frontend/src/lib/setor-publico/formato.ts` | regra pura de tela |
| `frontend/tests/005-setor-publico.test.mjs` | testes de tela |

Do integrador (a 005 entrega o conteúdo, não edita): bloco da 005 em `server-functions.ts` (ids locais 5000–5028), import de `extensoes.ts` e das rotas no `App`, `seed/005` e `smoke/005` nos orquestradores, `PCNFSAID`/`PCMOV`/`PCPREST`/`PCPEDC` no `schema-winthor.mjs`. **Publicação (DT-39, 01 §14):** depois do `add-050`, republicar o `add-010` (o `ccPodeMover` remonta com o trecho de `concessao-publica` e os ids) e o `add-040` (id de `ccPubMotorCalcular`, chamado pela 004).

## Modelo de dados

Colunas, tipos e índices: **02 §005**. O que o contrato não diz:

| Entidade (spec) | Tabela | Observação deste plano |
|---|---|---|
| Análise do órgão / Contratação | `CC_ANALISE_ORGAO` | "Contratação" = análise cuja solicitação tem `DECISAO_RESULTADO` `APROVADA` ou `PRE_APROVADA` (lido de `CC_SOLICITACAO`). `PRE_APROVADA` é conciliada pela rotina (PA-19). `PONTOS` = `capag:22;pessoal:10;cauc:10;fonte:15;historico:20;atraso:0;operacao:10`. `DECISAO_SUGERIDA` ∈ `INFORME_BASE`, `PRE_APROVAR`, `NAO_FORNECER`, `SEM_EMPENHO`, `SEM_CONTRATO`, `APROVAR`, `REDUZIR`, `DIRETORIA` (cabe em `V(20)`; o texto para a pessoa é da tela) |
| Nota fiscal pública | `CC_NF_PUBLICA` | Guarda o que depende de dado (marcos, prazos, etapa, regra aplicada); situação, dias de atraso e "acima de 2 meses" saem na leitura com `HOJE_SQL`. **PA-01:** `PROX_PASSO`, `PROX_PASSO_DATA`. **PA-07:** `CANCELADA`. `ANALISE_ID` nulo recebe a contratação mais recente do órgão quando ela passa a existir |
| Passo da régua feito | `CC_NF_ACAO` | Só o feito vira linha; `UQ (NF_ID, PASSO)` dá a idempotência |
| Regra de pagamento do ente | `CC_REGRA_PAGAMENTO_ENTE` | 5 linhas iniciais (`REGRAS_INICIAIS`), todas `A_CONFIRMAR`, sem link |
| Certidão da empresa | `CC_CERTIDAO` | Renovar = linha nova; vigente = maior `VALIDADE` por tipo + CNPJ + abrangência |

Lidas de outras donas (só `SELECT`): `CC_CLIENTE`, `CC_MEMBRO`, `CC_FERIADO`, `CC_PARAMETRO`, `CC_CONTATO_CLIENTE`, `CC_MODELO_MENSAGEM`, `CC_ANEXO`, `CC_POSICAO_CLIENTE_BU` (001); `CC_COBRANCA` + `CC_FASE` + `KB_CARD` (002/lib); `CC_SOLICITACAO`, `CC_DECISAO`, `CC_CREDITO` (004). Winthor: `PCNFSAID`, `PCPREST`, `PCPEDC` (02 §Winthor; a confirmar na S-12).

### Parâmetros

Chaves e padrões: **03 §15** (`pub.*`) e **§16** (`pubMotor.*`). Leitura: `parametros('PUBLICA')` em JS. `pub.pequenoValor` é o único com vigência: a rotina lê as linhas da chave em `CC_PARAMETRO` uma vez e resolve em memória pela data de **emissão** de cada NF (P-47). Semeadura das duas vigências: `vigencias` da definição (01 §9, PA-11). `validarConjunto`: as ordens de 03 §15–16 (`L1 < L2 < L3`, `G1 < … < G5`, cortes decrescentes, fatores entre 0 e 1).

## Contratos de backend

Assinaturas: **04 §5**. 18 públicas (com as duas `…Total`) + 10 internas (`ccPubWinthorNf` não é publicada: ver Divergências).

| SF (04 §5) | Atende | Cenário / regra que prova (smoke) |
|---|---|---|
| `ccPubAnaliseObter` | RF-004, RF-007, RF-029 | C-011, orçamento (card) |
| `ccPubAnaliseSalvar` | RF-004, RF-005, RF-006 | C-008, RF-004, RN-011, RN-039 |
| `ccPubMotorCalcular` | RF-005, RF-003 (`podeAprovar`) | C-003, C-004, C-005, C-008–C-012, RN-009–RN-016, RN-038 (`membroId`) |
| `ccPubNfListar` / `ccPubNfTotal` | RF-016, RF-017, RF-018, RF-035 | C-014, C-017, C-019, C-020, RF-017, RN-024 |
| `ccPubNfFicha` | RF-013, RF-014, RF-019, RF-021 | C-021, RN-027, RN-029 |
| `ccPubMensagemPreparar` | RF-022, RF-030 | C-020, RN-033 |
| `ccPubReguaCumprimento` | RF-021 | C-021 |
| `ccPubContratoListar` / `ccPubContratoTotal` | RF-036 | C-031, RN-037 |
| `ccPubResumo` | RF-018, RF-032, RF-036 | C-019, C-026, C-029, C-031 |
| `ccPubRegraEnteListar` | RF-028 | RN-035 |
| `ccPubCertidaoListar` | RF-031, RF-032 | C-029, RN-036 |
| `ccPubNfDatasSalvar` | RF-013, RF-014, RF-015 | C-018, RF-013, RF-014, RN-025, RN-038, RN-039 |
| `ccPubNfPassoRegistrar` | RF-021, RF-022 | C-021, C-024, RN-033 |
| `ccPubRegraEnteSalvar` | RF-028, RF-029 | C-027, RN-035 |
| `ccPubCertidaoSalvar` | RF-031 | RN-036 |
| `ccPubRotina` | RF-012, RF-015, RF-020, RF-023, RF-025, RF-026 | C-013, C-015, C-016, C-022, C-023, C-026, RN-026, RN-032 |
| `gancho('concessao-publica')` (trecho de `ccPodeMover`) | RF-003 | C-002, RN-003 |
| internas `ccEscPub…` (10) | B-01, C-01, C-02 da B3 (chamada direta) | exercitadas pelas públicas; `sim:check` roda cada SQL |

Cenários da carteira `PUBLICA` cuja função é de outra spec (ficam na spec 005 por decisão do replanejamento): C-001, C-005, RN-001, RN-007 → `ccCredSolicitacaoCriar`, `ccCredDecisaoRegistrar`, `ccCredSolicitacaoFicha`, quadro `concessao-publica` (004); C-003, C-004 → `ccCredDecisaoRegistrar` com o `podeAprovar` desta spec; C-012 → `ccCredCreditoListar`; C-025 → `ccCobBloqueioListar`, `ccCobEmailFilaListar`, `ccCobAcordoPropor`, `ccCobRotina` (002).

### O que o contrato não diz, por SF

**Leituras** (nenhuma é chamada aninhada pela 003: a sugestão do dossiê lê as tabelas da 005, DT-34)

- `ccPubAnaliseObter` — sem análise ainda: `analise: null`, `motor: null` e só as sugestões. Com análise, `motor` = a mesma saída de `ccPubMotorCalcular`, calculada pela lib na mesma execução, sem gravar (DT-42): o bloco do card abre com esta leitura só. `regra` = a que `regraDaNf` escolheria para o órgão (com `SITUACAO`, para o aviso "a confirmar"). `historico` (PA-04) = uma consulta agregada sobre as NFs pagas do órgão; `sugestoes.atrasoMedio` = `historico.atrasoMedio`; `sugestoes.esfera` = `CC_CLIENTE.ESFERA` (sem sugestão de perfil de pagamento: a spec não tem regra, PA-04). Cliente fora da visibilidade = "Solicitação não encontrada."
- `ccPubMotorCalcular` — entrada `membroId (0)`: chamada aninhada pela 004 (`ccCredMotorCalcular`, que repassa `gravar`, e `ccCredDecisaoRegistrar`, sem gravar); a visibilidade (guarda `caso`) vale sobre o membro de `quem()`, nunca por `EU` (DT-34). Exceção da decisão (04 §5, acabamento pós-v3, B-C3 da v3-B): com `gravar = 0` e o card da solicitação em `comite` (`FASE_DO_CARD`), aceita também quem tem `NIVEL ≥ alcada.nivelSupervisor` (sem a marca `ADMIN`) sem o cliente visível — é a leitura de quem decide na alçada fora do caso, aceito na Privada (04 §0); `gravar = 1` continua só `caso`. Sem execução a mais: a fase do card vem na mesma leitura da análise. Lê análise, valor da solicitação, esfera e `parametros('PUBLICA')`; atraso médio = o lançado à mão (`ATRASO_MEDIO_MANUAL`) ou o do histórico. `faltando[]` = critérios que caíram no valor de "não informado" e a base, se vazia. Saída com `podeAprovar`, `motivoNaoAprovar` e `travas` (PA-03). `gravar = 1` → `ccEscPubAnaliseMotor` grava a fotografia (`NOTA`, `PONTOS`, `RATING_PUB`, `EXPOSICAO`, `DECISAO_SUGERIDA`, `CALCULADO_EM`) que a decisão da 004 lê (DT-36); é o "Calcular" do bloco. Quem grava a fotografia é acrescentado a `PROPOSTA_POR` (`PROPONENTE_ADD`, na própria SQL da `ccEscPubAnaliseMotor`) e a JS audita; `ATUALIZADO_POR` não muda. Logo, quem recalcula não decide (B-01 da B3, decisão do orquestrador; DT-40): sem isso, o superior do analista forjava a fotografia por chamada direta e aprovava sozinho. Sem análise: `{ ok: false, error: 'Preencha a análise do órgão.' }`.
- `ccPubNfListar` — `EU` + `clienteVisivel('C')`. `SITUACAO` e `DIAS_ATRASO` por `SITUACAO_NF_SQL`/`DIAS_ATRASO_NF_SQL` (a mesma regra de `situacaoNf`, 005 RN-024; C-014 cruza as duas). `situacao = ''` = em aberto (não paga, não baixada, não cancelada). `PROXIMO_PASSO` = `PROX_PASSO` da NF, regravado no clique por `ccPubNfPassoRegistrar` (`ccEscPubNfPassoAtualizar`) e pela rotina. Ordem: vencidas primeiro, depois `PAGAR_ATE`. `busca`: a tela normaliza o termo (maiúsculas, sem acento) e a SQL compara com `C.NOME_BUSCA`, o número da NF e o empenho em maiúsculas (06 §5). Colunas do órgão e da regra e os somatórios da `…Total`: PA-14.
- `ccPubNfFicha` — `passos[]` = `reguaNf()` com `{ passo, acao, canal, devido, feitoEm, noPrazo, atrasado, atual, podeFeito, modelo }`; devolve também as contratações do órgão (para a troca) e `pode: { lancarDatas, marcarPasso }`.
- `ccPubMensagemPreparar` — `passo = ''` usa `tipoMensagem(nf, hoje)` (RN-033). Preenche os campos da NF aqui (os de 01 §13 mais os da PA-10) e deixa os comuns para `ccBaseModeloPrever`/`ccEmailEnviar`. `para` = contato do órgão com função "Ordenador de despesa" nos passos de ofício e requerimento, "Fiscal do contrato" nos de liquidação, senão o principal.
- `ccPubReguaCumprimento` — definição de `DEVIDOS` na PA-01.
- `ccPubContratoListar` — créditos com `VIGENTE_CHAVE` preenchido e `ANALISE_ORGAO_ID`. `ALERTA` ∈ `''`, `VIGENCIA`, `SALDO`, `VIGENCIA_SALDO`; percentual sobre `VALOR_ESTIMADO` (se 0, `CC_CREDITO.LIMITE`). Base `EDITAL` não entra (não há contrato).
- `ccPubResumo` — um `SELECT` com subconsultas, recortado por `EU`; a tela do painel (006) chama direto, nunca aninhada (DT-34). `buId`: PA-09. Funil (DT-33, 04 §5), sobre as NFs em aberto (não paga, não baixada, não cancelada) por `ETAPA_NF`: `ENTREGUE`/`PROTOCOLADA` → `SEM_ATESTO`; `ATESTADA` → `AGUARDANDO_LIQUIDACAO`; `LIQUIDADA`/`OP` → `LIQUIDADAS_SEM_PAGAMENTO`; `VALOR_PAGAMENTO_VENCIDO` pela `SITUACAO_NF_SQL`. `mes` (`AAAA-MM`; `''` = mês de `HOJE_SQL`) recorta só `RECEBIDO_MES`/`NFS_RECEBIDAS_MES` (NF não cancelada com `PAGO_EM` no mês).
- `ccPubCertidaoListar` — vigente por tipo + CNPJ + abrangência; `SITUACAO` por `HOJE_SQL` e `pub.certAlertaDias`; `ANEXO_URL` só sai com membro ativo. "Não cadastrada" é da tela (`tiposSemCertidao`). Histórico: PA-12.

**Escritas** (forma A de 01 §5; ordem sempre domínio → auditoria → outras SFs)

- `ccPubAnaliseSalvar` — valida opções fechadas (RN-010). Capacidade: enquanto `CAPACIDADE_MANUAL = FALSE`, grava `capacidadeSugerida(capag)`; se o valor recebido difere do sugerido, grava o recebido e marca manual (RN-011). O que é editável depende do estado (PA-18); a guarda da `ccEscPubAnaliseAtualizar` relê `DECISAO_RESULTADO`. `ccEscPubAnaliseInserir`/`…Atualizar` gravam `ATUALIZADO_POR = membroId` e acrescentam `membroId` a `PROPOSTA_POR` na mesma instrução (lista sem repetição, a mesma expressão de `PROPONENTE_ADD` da 004): todos os autores da proposta na `PUBLICA`, que a decisão da 004 exclui (DT-40, fechamento v2; lista no acabamento pós-v3, O-3 da v3-B; a 005 não escreve em `CC_SOLICITACAO`). Depois grava o motor (`ccEscPubAnaliseMotor`: a fotografia `RATING_PUB`, `EXPOSICAO`, `CALCULADO_EM` que a decisão da 004 confere, DT-36) e devolve `{ ok, analiseId, motor }`. Mudança de regra, prazo do contrato ou valor estimado reflete nas NFs na rodada seguinte da rotina (não no clique). Custo: 1 + 2 + 1 = 4.
- `ccPubNfDatasSalvar` — recebe o estado inteiro do trilho (PA-25). `validarDatas()` devolve a primeira violação da RN-025 com o nome do campo. Recalcula a NF com a lib (prazos, etapa, pequeno valor, M2, passo atual) e grava tudo em **um** `ccEscPubNfDatas`; guarda: caso (agente ou analista do órgão, ou superior, por `clienteVisivelA`) e NF não paga. Em seguida recalcula a etapa, a capa e a próxima ação do órgão e chama `ccCobCasoSincronizar` só se algo mudou (comparação da rotina, passo 6), **como pessoa**: com `membroId` de quem clicou e a guarda `caso` da 002 (duas origens, DT-34), e com `nota` "Etapa do órgão: <nome da fase>" quando a fase muda (05 §3.7); sem `responsavelUserId` (a 002 reconcilia). Caso ausente ou encerrado → a 002 devolve `{ ok: true, pendente: true }` sem escrita e a rodada seguinte da rotina resolve. A 002 aceita a pessoa só na `PUBLICA` e só movendo entre fases da régua do `cobranca-publica` (acabamento pós-v3, A-C2): a 005 já cumpre, porque `etapaOrgao` só devolve fase da régua, manda `faseChave = ''` com o caso em `juridico`, encerra pelo `desfecho` e só põe `Acima de 2 meses`/`Pequeno valor` em `etiquetas`. A capa vai sempre completa no `capaJson`, também quando a fase muda, para o card aberto já mostrar o estado certo (PA-05, 01 §10). Sem `regraId` na entrada: a regra vem da contratação ou é automática (PA-24). `analiseId > 0` só aceita contratação do mesmo órgão (solicitação `APROVADA` ou `PRE_APROVADA`): senão "Contratação não encontrada para este órgão." (RF-014). Custo medido pelo contador (O-03 da B3): 2 sem mudança no caso; **15** com mudança de fase (16 com `SIM_SESSAO_ANINHADA=1`). A SQL recalcula `ETAPA_NF` pelas datas e `LIMITE_2M` pela emissão (`SOMAR_MESES`); os demais prazos vêm da JS e a rotina os reconcilia (O-01).
- `ccPubNfPassoRegistrar` — recusa passo que não se aplica à NF, passo já feito (devolve o registro existente, sem regravar) e passo com data devida depois de hoje + `pub.rpFeitoAntecedencia` dias úteis no calendário do órgão. Com `enviarEmail = 1`: **primeiro** `ccEmailEnviar` (`codigo` do passo, `assunto`/`corpo` finais, `origem '005-regua-publica'`, `referencia 'nf:<id>:<passo>'`); se ele recusar (modelo sem validação, sem e-mail cadastrado), nada é gravado. Depois `ccEscPubNfAcaoInserir` (com `EMAIL_ENVIADO_ID`), `ccEscPubNfPassoAtualizar` (`PROX_PASSO`, `PROX_PASSO_DATA` = o novo passo atual; guarda: caso visível, NF não paga), auditoria e `ccCobContatoRegistrar` com `origem = 'REGUA_PUB'`, `retorno = ''`, `feedback` = "<passo> feito" + ` · <obs>` quando houver, `nfId`, `emailEnviadoId` (0 sem e-mail) e `membroId` de quem clicou (canal: `E-mail` com envio; sem envio, pelo passo: e-mail → `E-mail`; ligação → `Telefone`; ofício e requerimento → `Ofício`; LAI → `Portal do órgão`; `G5` não gera contato). O contato vai sempre com `proxAcao`/`proxAcaoData` = o novo passo atual do órgão (`proximaAcaoOrgao` recalculado com o passo feito), com e-mail ou sem (PA-05). Devolve `{ ok, noPrazo, proximoPasso }`. Custo medido pelo contador (O-03 da B3): **10** sem e-mail, **16** com. `ccEscPubNfAcaoInserir` grava `FEITO_EM` (`AGORA_SQL`) e `NO_PRAZO` (`HOJE_SQL` ≤ prazo) pelo relógio da SQL e só aceita passo que se aplica à NF pelas colunas gravadas (o critério de `reguaNf`); o `PRAZO` vem da JS e a rotina o acerta pelo devido da régua, com auditoria (C-01 da B3).
- `ccPubRegraEnteSalvar` — `validar = 1` grava só `LINK` (se veio), `SITUACAO = 'VERIFICADO'` e `VALIDADO_*`; exige link não vazio; guarda `A.CARGO = 'JURIDICO' OR NIVEL_MIN(3)`. Sem `validar`: guarda `NIVEL_MIN(2)` (nível ou a marca `ADMIN`, D-06); mudou `LIQ_DIAS`, `PAG_DIAS`, `CONTAGEM`, `ESFERA` ou `UF` de regra `VERIFICADO` → volta a `A_CONFIRMAR` e limpa `VALIDADO_*` (a comparação é feita na própria SQL: o MySQL avalia o `SET` da esquerda para a direita com os valores já alterados, então `VALIDADO_POR`, `VALIDADO_EM` e `SITUACAO` vêm, nessa ordem, antes das colunas de prazo — 06 §5; o teste C-02 de `tests/005` confere a ordem de todo `UPDATE` da 005). As NFs que usam a regra são recalculadas na rodada seguinte.
- `ccPubCertidaoSalvar` — guarda `NIVEL_MIN(2)` (nível ou a marca `ADMIN`, D-06). `certidaoId = 0` insere (cadastro ou renovação); `> 0` corrige a linha. A tela faz três chamadas num cadastro com arquivo: salvar → `ccBaseAnexoRegistrar` (`CERTIDAO`, N2 — PA-06; id devolvido) → salvar de novo com `anexoId` (≈ 10 execuções).

### Gancho `concessao-publica`

`gancho('concessao-publica')` devolve o trecho da linha "`comite` (trecho da 005)" de 04 §8, sobre os apelidos `M`, `DE`, `PARA`: recusa quando `PARA.CHAVE = 'comite'` e não existe `CC_ANALISE_ORGAO` da solicitação do card (`CC_SOLICITACAO.CARD_ID = K.ID`, 01 §14) com `CAPACIDADE`, `PERFIL_PAG` e `RATING_PUB` preenchidos. Os itens 1 e 2 do checklist são condição de entrada da fase, dado do quadro da 004 (05 §4.3). Para outro slug devolve `''`. Espelho na tela: `podeMover` de `concessao-publica` em `extensoes.ts`, com a mesma frase (01 §14).

### Lib pura (`backend/lib/setor-publico/`)

Sem I/O; inlinada nas JS pelo preâmbulo; recebe `hoje`, parâmetros e feriados prontos. Dias úteis são os de `lib/dias-uteis.mjs` da 001 com os feriados nacional + UF + município do órgão. Pontos que o contrato não fixa:

- **`passoAtual(regua, hoje)`** (RN-028): entre os passos aplicáveis e não feitos, o vencido de data mais recente; sem vencido, o de data mais próxima. Empate de data: `L3`, `G4`, `M2` primeiro; depois o último na ordem `CONF, L1, L2, L3, G1, G2, G3, G4, M2, G5`.
- **`proximaAcaoOrgao(nfs)`**: o passo atual de data mais antiga entre as NFs em aberto; empate → NF de emissão mais antiga. Texto: `NF <número> · <ação do passo>`.
- **`etapaOrgao(nfs, hoje)`** (RN-030): a chave mais alta de 05 §3.2. `oficio` e `requerimento` pela **data devida** de `L3`/`G4` e de `M2`, feitos ou não (**PA-02**).
- **`reguaNf`**: passos `L*` só enquanto não liquidada; `G*` quando liquidada ou com pagar até vencido; `CONF` só protocolada sem atesto; `M2` = primeiro dia útil depois de `LIMITE_2M`.
- **`prazosNf`** (RN-021): pequeno valor só com contratação de `VALOR_ESTIMADO > 0` até o limite vigente na emissão; `VALOR_ESTIMADO = 0` (não informado) ou NF sem contratação não é pequeno valor.
- **`podeAprovar(analise, hoje)`** (RN-005): base `CONTRATO`, saldo > 0, vigência ≥ hoje; senão o motivo ("vigência", "saldo", "sem contrato").
- **`historicoPagamento(nfsPagas)`** (RN-012): médias inteiras arredondadas, dias corridos.

## Rotina — passo `PUBLICO` (`ccPubRotina`)

Contrato do passo: 01 §11. Efeitos: 05 §3.7. Algoritmo de cada rodada:

1. **Novas** — leitura Oracle (`runQueryMitra` com o SQL de `winthor-nf.mjs`, preenchido por `preencher()` da 001) com `aPartirDe` = maior `NUMTRANSVENDA` já gravado (0 na primeira carga) e `desde = pub.nfDataCorte`, página de 1.000. Traz NF de cliente de ramo público (os dois critérios de `base.ramosPublicos`/`base.ramoPublicoPrefixo`), não cancelada, com parcela em `PCPREST`; por NF: saldo em aberto, parcelas, parcelas pagas, último pagamento e o número do pedido do cliente (candidato a empenho). Cliente que não está em `CC_CLIENTE` é ignorado. Veio página cheia → `pendentes > 0` e a rodada seguinte continua do novo máximo (PA-20). O cursor só vale para órgão que já tem NF gravada: órgão sem nenhuma (que virou público depois, por troca de ramo ou de `base.ramosPublicos`) e, quando `pub.nfDataCorte` recua, todos são relidos do zero, paginando na própria rodada até a página vir incompleta (C-04 da B3). A data de corte já lida fica em `CC_ESTADO['pub.nfCorteLido']`; se o relógio da rodada acabar no meio da releitura, a chave não muda e a rodada seguinte relê de novo.
2. **Abertas** — a mesma leitura pela lista das NFs que o sistema tem em aberto, em lotes de 500: atualiza saldo e pagamento (paga = todas as parcelas pagas, na data da última) e marca a cancelada (PA-07).
3. **Gravar** — `runDmlMitra` em lotes de 500: insere as novas (`ON DUPLICATE KEY` pela `UQ`), atualiza só as que mudaram; NF sem contratação recebe a mais recente do órgão; concilia `CC_ANALISE_ORGAO.PRE_APROVADA` (PA-19).
4. **Recalcular** — para toda NF em aberto e toda NF com `CALCULADO_EM` nulo ou anterior a `ATUALIZADO_EM` (NF paga sem contratação não é relida a cada rodada, O-05): regra, prazos, pequeno valor, limite de 2 meses, M2, etapa da NF e passo atual. Em memória, com uma leitura de feriados, uma de regras, uma de contratações e uma de passos feitos; grava só a diferença. É isso que cobre a virada do dia (passo atual muda com o relógio) sem estado novo. Passo feito (`CC_NF_ACAO`) cujo `PRAZO` difere do devido pela régua é regravado com `NO_PRAZO` recalculado (`FEITO_EM` ≤ devido) e auditado, uma linha por passo, área `Notas fiscais` (C-01 da B3).
5. **Baixa** — caso `PUBLICA` encerrado como `BAIXADO`: NFs em aberto do órgão emitidas até a data do encerramento ficam `BAIXADA`.
6. **Órgãos** — para cada órgão com NF em aberto ou com caso aberto: fase (`etapaOrgao`), prazo (menor liquidar/pagar até), capa (`valor_aberto`, `nfs_abertas`, `acima_2m`, `proxima_acao`, `proxima_acao_data`, `etiquetas`), próxima ação; sem `responsavelUserId` (o responsável é a 002 que reconcilia, 05 §3.6 linha 13). `etiquetas` leva só as que a 005 controla, `Acima de 2 meses` e `Pequeno valor`; as demais do card são da 002 e a `ccCobCasoSincronizar` preserva (PA-08). O `capaJson` é montado com as chaves em ordem alfabética e comparado com `CC_COBRANCA.CAPA_ENVIADA` (texto recebido, sem reformatar); fase, prazo e próxima ação com `CC_COBRANCA`/`KB_CARD`. Chama `ccCobCasoSincronizar` só na diferença, com `nota` "Etapa do órgão: <nome da fase>" quando a fase muda (05 §3.7): caso em `juridico` → `faseChave = ''`; todas pagas e caso aberto → `desfecho = 'REGULARIZADO'`; sem caso aberto e sem NF em aberto → não chama.
7. **Orçamento** — reserva 13 execuções por órgão a sincronizar (o maior caso: mudança de fase com nota, 1 + 1 + mover 5 + capa 3 + próxima ação 1 + nota 2), contada também quando a chamada lança erro; para quando `execucoes + 13 > orcamentoExec` ou o relógio passa de `orcamentoMs`, devolvendo `pendentes` = órgãos restantes. Ordem dentro do passo: criar card → mover → encerrar → capa (01 §11).

Contas de execução (referência de 01 §10; medir na S-13):

| Operação | Conta |
|---|---|
| Rodada sem novidade | a rotina informa 1 (as leituras do Winthor por `runQueryMitra` não contam) |
| Órgão novo em cobrança | `ccCobCasoSincronizar` 1 + escritas da 002 ≈ 3 + `kbCardCriar` 6 ≈ 10 → cerca de 12 órgãos por rodada; 100 órgãos na implantação = 9 rodadas |
| `ccPubNfPassoRegistrar` | medido: **10** sem e-mail, **16** com (≤ 20, DT-29); a conta antiga (14/18) não batia com o contador |
| `ccPubNfDatasSalvar` | medido: **15** com mudança de fase (16 com `SIM_SESSAO_ANINHADA=1`), 2 sem mudança no caso (≤ 20, DT-29) |
| Abrir o card público | `kbCardDetalheSql` + ficha da dona (`ccCredSolicitacaoFicha` ou `ccCobCasoFicha`) + 1 leitura da 005 (`ccPubAnaliseObter`, que traz `motor`; ou `ccPubNfListar` do órgão na Régua da NF) = **3** (01 §10, DT-42); medido: 3 nos dois quadros |

## Superfície de interação

Opções escolhidas: `docs/opcoes-tela/escolhas.md`, seção 005 (mockup no `<template data-opcao>` do arquivo indicado). Tela não escreve classe solta: vocabulário do design system (`PageHeader`, `Panel`, `Toolbar`, `SelectMenu`, `Status`, `Table`, `Pagination`, `Kpi`, `Tabs`, `Dialog`, `Badge`, `Button`) e, onde o mockup pede algo que ele não tem, um componente do módulo feito só com primitivos e tokens (`componentes.tsx`).

| Tela / rota | Opção | Responsabilidade | Do design system / lib | Novo (módulo) |
|---|---|---|---|---|
| Motor do órgão — bloco no card de `concessao-publica` | `concessao-motor` **B** Resultado primeiro (`telas-01-concessao.html`) | Nota, rating, exposição e decisão em destaque; pontos por critério em barras; travas e ajustes; detalhe "dado informado e trilha da decisão" recolhido; botão "Calcular" (`ccPubMotorCalcular` com `gravar = 1`: regrava a fotografia que a decisão confere, DT-36); ao abrir, o motor vem de `ccPubAnaliseObter` | `Panel`, `Kpi`, `Status`, `Table` | `BarraPontos` |
| `/publico/notas-fiscais` aba **Etapas e prazos** | `nf-etapas-prazos` **A** Trilho horizontal (`telas-02-nf.html`) | As sete etapas com o prazo da regra Federal vigente e os três cartões de exceção (pequeno valor, prazo do contrato, mais de 2 meses); em telefone o trilho vira lista (RF-034) | `PageHeader`, `Tabs`, `Panel` | `Trilho` |
| `/publico/notas-fiscais` aba **Notas fiscais em tramitação** | `nf-tramitacao` **C** Trilho por nota | Uma linha por NF com o caminho, as datas lançadas, o ponto em que travou (`documentoRecebivel`), situação, regra e "Lançar datas"; filtro de situação, busca, paginação; aviso de regras a confirmar; cabeçalho com os somatórios | `Toolbar`, `SelectMenu`, `Status`, `Badge`, `Pagination` | `Trilho` (variante compacta) |
| Lançamento das datas — diálogo | `nf-datas` **B** Trilho editável | Datas lançadas sobre o trilho (`<input type="date">`), contratação, posição na fila, prazos calculados e situação devolvidos pela SF depois de salvar; a regra do ente só é exibida (não há escolha de regra por NF, PA-24) | `Dialog`, `SelectMenu`, `Button` | `Trilho` (variante editável) |
| `/publico/regras-ente` | `regras-ente` **B** Cartões por ente (`telas-04-apoio.html`) | Um cartão por regra com prazo, base legal, link, situação e "Marcar como Verificado"; nova regra, editar, inativar; cartão do pequeno valor (lê `pub.pequenoValor`; "Atualizar o limite" leva à tela de parâmetros da 001). O "Em uso" do mockup não tem leitura no contrato: não é construído | `PageHeader`, `Panel`, `Status`, `Dialog` | — |
| `/publico/comunicacao` | `comunicacao-orgao` **C** Editor com campos | Lista dos sete modelos (`ccBaseModeloListar`, `specDona '005'`), prévia preenchida com uma NF (`ccPubMensagemPreparar`), texto com os campos, salvar versão (`ccBaseModeloSalvar`), validar (`ccBaseModeloValidar`); aba Versões só com a versão atual (PA-23) | `Tabs`, `Panel`, `Status`, `Button` | — |
| `/publico/certidoes` | `certidoes` **B** Cartões de prazo | Cinco cartões com dias restantes e barra do prazo, do mais urgente ao mais folgado; faixa de alerta; cadastrar, renovar, arquivo (`enviarArquivo` da 001). "Histórico": PA-12 | `PageHeader`, `Panel`, `Status`, `Dialog` | `BarraPrazo` |
| `/publico/notas-fiscais` aba **Contratos** (terceira aba da página Fluxo da NF pública) | sem opção em `escolhas.md`: listagem padrão do design system (PA-13, aceito; o usuário confirma) | Listagem padrão: órgão, contrato, vigência, saldo, alerta; filtro "só em alerta" (`ccPubContratoListar` + `…Total` = 2 execuções ao abrir) | `Table`, `Status`, `Pagination` | — |

**Extensões nas telas de 002 e 004** (`extensoes.ts`, por `registrarExtensao()` — 05 §3.5 e §4.4; inclui o espelho `podeMover` de `concessao-publica`). Cada bloco carrega ao ficar visível, com **uma** leitura (01 §10, DT-42): abrir o card = `kbCardDetalheSql` + ficha da dona + 1 da 005 = 3. Em `analise`/`comite` a leitura é `ccPubAnaliseObter` (já traz `motor`; `ccPubMotorCalcular` só no "Calcular"); na Régua da NF é `ccPubNfListar({ clienteId })` (passo atual de cada NF; expandir os dez passos = `ccPubNfFicha`, ação da pessoa). Abas extras leem só quando abertas.

| Quadro | Extensão | Conteúdo | SFs |
|---|---|---|---|
| `concessao-publica` | `conteudoDaFase` em `analise` e `comite` | Ficha do órgão (formulário da análise, histórico de pagamento, evidências exigidas, aviso de regra a confirmar, "Pedir fluxo de pagamento ao órgão") + bloco do motor | `ccPubAnaliseObter` (ao abrir, com `motor`), `ccPubAnaliseSalvar`, `ccPubMotorCalcular` (`gravar = 1`, botão "Calcular"); `ccBaseModeloPrever` + `ccEmailEnviar` (modelo Análise, PA-22) |
| `concessao-publica` | `conteudoDaFase` em `gestao` | Contrato: saldo e vigência editáveis, com o alerta | `ccPubAnaliseObter`, `ccPubAnaliseSalvar` |
| `concessao-publica`, `cobranca-publica` | `abasExtras` "Notas fiscais" | NFs do órgão (o mesmo componente da lista, filtrado) | `ccPubNfListar`, `ccPubNfDatasSalvar` |
| `cobranca-publica` | `conteudoDaFase` "Régua da NF" | Por NF em aberto, o passo atual com "Feito" e "Enviar"; expandir mostra os dez passos | `ccPubNfListar`, `ccPubNfFicha`, `ccPubNfPassoRegistrar` |
| `cobranca-publica` | `abasExtras` "Regra do ente" | Regra aplicada a cada NF, com situação e base legal | `ccPubRegraEnteListar` |
| `cobranca-publica` | `acoesExtras` | "Lançar datas da NF", "Preparar mensagem ao órgão" | `ccPubNfDatasSalvar`, `ccPubMensagemPreparar` |

Regra de tela em `frontend/src/lib/setor-publico/formato.ts`: `textoSituacao`, `etiquetaRegra`, `documentoRecebivel`, `evidenciasExigidas`, `tiposSemCertidao`, `rotuloDecisao`. Abrir qualquer tela: no máximo 3 execuções (lista + total + uma de apoio). `ccPubReguaCumprimento` e `ccPubResumo` não têm tela aqui (PA-21).

## Fluxo

1. **Concessão.** A solicitação nasce e anda pela 004 (carteira `PUBLICA`). Na Análise, o bloco do órgão grava por `ccPubAnaliseSalvar`, que já devolve o motor e grava a fotografia em `CC_ANALISE_ORGAO` (`RATING_PUB`, `EXPOSICAO`, `CALCULADO_EM`; o "Calcular" também, DT-36). Levar à Classificação passa pela condição de entrada (itens 1 e 2) e pelo trecho do gancho. Na Classificação, a decisão é `ccCredDecisaoRegistrar`, que chama `ccPubMotorCalcular` **direto** (sem gravar, com `membroId`), respeita `podeAprovar`, confere o motor com a fotografia ("O motor mudou desde o último cálculo…") e trata como exceção ao motor só `limiteAprovado > EXPOSICAO`; a faixa é a de `alcada.conc*` da `PUBLICA`. A SQL da decisão copia `RATING_PUB` e `LIMITE_MOTOR` (= `EXPOSICAO`) em `CC_DECISAO` e grava `CC_CREDITO.ANALISE_ORGAO_ID` (04 §4).
2. **NF.** A cada leitura do Winthor, o passo `PUBLICO` traz e recalcula as NFs e reflete o órgão no quadro `cobranca-publica` pela 002.
3. **Datas.** O agente lança os marcos (`ccPubNfDatasSalvar`); a NF é recalculada na hora e o caso do órgão, se mudou, pela `ccCobCasoSincronizar` em nome de quem clicou (card movido com a nota "Etapa do órgão: …", DT-34).
4. **Régua.** O passo atual aparece na lista, no card e, como próxima ação do órgão, na agenda da 002. "Feito" e "Enviar" gravam o passo (`ccPubNfPassoRegistrar`), que registra o contato pela 002.
5. **Jurídico e baixa.** O `G5` só cria a ação; o envio é o dossiê da 003 e a baixa é da 002. A rotina não desfaz nenhum dos dois.

## Simulador

- **Relógio:** o smoke exporta `RELOGIO = '2026-12-01T10:00:00'` (06 §1). Datas do seed por `dia(n)` contado do `RELOGIO` (DT-38, entre-specs O-5); só feriado e vigência de parâmetro (`pub.pequenoValor`) são absolutos. As datas absolutas abaixo e nos cenários são as que `dia(n)` dá no banco da 005 (ex.: 2026-10-20 = `dia(-42)`). Sem `INICIO`/`passado()`.
- **Seed** (`seed/005-setor-publico.mjs`, faixa 5001–5099; exporta `winthor()` e `dominio()` — PA-16c):

| Parte | Registros |
|---|---|
| `winthor()` — clientes | 5001–5005 de 06 §2.5 (ramos 12, 13, 11, 13, 20; UF DF, GO, GO, GO, GO; municípios Brasília, Goiânia, Goiânia, Trindade, Formosa) + 5006 CLINICA PARTICULAR TESTE LTDA (ramo 2, privado) |
| `winthor()` — notas (`nota()`, uma parcela a 30 dias, produto 101; `numnota` — PA-16b) | 5001: 1004 (n 1), 1005 (n 2), 1008 (n 3) · 5002: 1001 (n 1) · 5003: 1002 (n 1), 1009 (n 2) · 5004: 1003 (n 1), 1006 (n 2, paga em 2026-09-15), 1007 (n 3, paga em 2026-08-10), 1010 (n 4, cancelada) · 5006: 1099 (n 1). Valores e emissões da tabela de NFs da spec |
| `dominio()` — tabelas da 005 (passo 10 do pipeline, depois da leitura e do processamento) | 5 `REGRAS_INICIAIS` (só se a tabela estiver vazia, como o `isEntrypoint()`: as duas portas não somam, O-6); certidões `CND_FEDERAL` 2026-12-10, `CRF_FGTS` 2026-11-28, `CNDT` 2026-12-20, `CND_ESTADUAL` GO 2026-12-16, CNPJ da filial 1 do elenco; marcos das NFs (empenho, protocolo, atesto, liquidação, ordem de pagamento da tabela da spec; 1003 sem empenho) com `CALCULADO_EM` nulo; `CC_NF_ACAO` da 1001: `L1` (2026-10-19) e `L2` (2026-10-23), no prazo |
| `dominio()` — pelas SFs de 001, 004 e 005 (pula se id 0) | `base.ramosEsfera = 11=FEDERAL,12=ESTADUAL,13=MUNICIPAL`; um contato com e-mail por órgão ("Ordenador de despesa"). A atribuição dos órgãos a Carlos já vem do passo 7 do pipeline (06 §2.3, §2.5). Com `comRelogio(dia(-42), …)` (2026-10-20), como Carlos: `ccCredSolicitacaoCriar` (`PUBLICA`, `analistaId` Carlos) do 5001 (R$ 600.000) e do 5004 (R$ 50.000), card a `analise`, `ccPubAnaliseSalvar` (grava a fotografia, DT-36) — 5001: estadual, CAPAG A, pessoal 40%, CAUC regular, SUS fundo a fundo, pontual, empenho e contrato, base contrato 052/2026, `VALOR_ESTIMADO` 600.000, saldo 100.000, vigência `dia(211)` (2027-06-30), prazo do contrato 30 dias → nota 95, P1, exposição 100.000; 5004: dados do C-008 com perfil "Atrasos eventuais", base contrato, `VALOR_ESTIMADO` 50.000, saldo 50.000, vigência `dia(45)` (2027-01-15) → nota 79, P2, exposição 40.000 —, itens `analise_1`/`analise_2` e card a `comite`; como Silvia: `ccCredDecisaoRegistrar` `APROVADA` com o limite igual à exposição (100.000 e 40.000: faixa Supervisor, sem exceção ao motor). Com `comRelogio(dia(-11), …)` (2026-11-20): solicitação do 5002 (R$ 200.000), levada à Análise em `dia(-10)` e deixada lá |

- **Depois do seed:** o passo 11 do pipeline (06 §2.3: `ccBaseSincronizacaoPedir` + `rodarCron` até leitura e processamento terminarem) liga as NFs às contratações e recalcula com os marcos. O seed não chama `rodarCron` (DT-38).
- **`CHECK_INPUT`:** `solicitacaoId`, `nfId`, `analiseId`, `clienteId`, `regraId`, `certidaoId`, `situacao`, `acima2m`, `soAlerta`, `ativo`, `buId`, `agenteId`, `de`, `ate`, `passo`, `busca`, `limite`, `offset`, `membroId`, `agora`, `aPartirDe`, `transacoes`, `desde`, `mes`.
- **Dialeto:** só funções da lista permitida de 06 §5 (`DATEDIFF`, `GREATEST`, `DATE_FORMAT`). Oracle só em `winthor-nf.mjs` (`NVL`, `TO_CHAR`, `TO_DATE`).

## Testes

`backend/simulator/smoke/005-setor-publico.mjs`, banco novo (DDL de todos + `000-elenco` + seed 005), dependências declaradas: 001, 002, 004 (003 opcional). O arquivo roda duas vezes, com `SIM_SESSAO_ANINHADA=0` e `=1` (06 §3). SF de módulo ausente → `pular()`. Para os testes não se atropelarem (validador C-5), a ordem é fixa em quatro blocos: **A** lib pura, sem banco · **B** leituras do estado do seed · **C** concessão pública · **D** escritas, na ordem da tabela. Variações que mudariam o seed (outro valor de contratação, feriado removido, regra inativa) são testadas na lib (bloco A), não no banco; escrita do bloco D que muda um dado do seed devolve o estado no fim do próprio teste (RF-013, RF-004, RN-029, RN-011). Toda escrita que mexe em card e toda leitura JS chamada aninhada (`ccPubMotorCalcular`) valem igual nas duas hipóteses de sessão (DT-34).

| Cenário / regra | Bloco | O que o `assert` verifica |
|---|---|---|
| C-001, RN-001 | B | `CC_FASE` de `concessao-publica` tem `entrada`, `analise`, `comite` com `KB_FASE.SLA_HORAS` 24, 192, 48; solicitação do 5002 com `PRAZO_DECISAO` 2026-12-01; card em `analise` com `FASE_DESDE` em 2026-11-21 → 240 h contra 192 h; `ccCredEsteiraResumo({ carteira: 'PUBLICA' })` traz a fase `analise` com 1 |
| C-002 | C | `kbCardMover` do card do 5002 para `comite` como Carlos: recusado com os itens desmarcados; com `analise_1` e `analise_2` = Sim, `ccPodeMover` devolve `PODE = 0` e o `MOTIVO` de 04 §8 |
| RN-003 | C | depois de `ccPubAnaliseSalvar` como Carlos com os dados do C-008 (base contrato, `VALOR_ESTIMADO` e saldo 200.000, vigência 2027-06-30): `ccPodeMover` → `PODE = 1`; o card vai para `comite` |
| C-008 | A + C | `motorOrgao` → 87, P1, 200000, `APROVAR`; `ccPubAnaliseSalvar` devolve `motor` igual, `pontos` 22/10/10/15/20/0/10, `podeAprovar` true; `CC_ANALISE_ORGAO` do 5002 com `RATING_PUB` P1, `EXPOSICAO` 200000 e `CALCULADO_EM` preenchido (a fotografia que a 004 confere, DT-36) |
| C-009, C-010 | A | `motorOrgao` → 70, P3, `travas.capagD`, 150000, `REDUZIR`; estadual 79, P2, 400000; municipal 84, P1, 500000 |
| C-011 | A + B | `ccPubAnaliseObter` da solicitação do 5004: `historico` 2, 1, 6, 20, 13 e `sugestoes.atrasoMedio` 13; `motorOrgao` sem perfil com atraso 13 → `pontos.atraso` 18, nota 85; `motor` da mesma leitura = `ccPubMotorCalcular` da solicitação (perfil "Atrasos eventuais" do seed: 79, P2, 40000), sem gravar (DT-42) |
| RN-007 | A | `alcadaConcessao()` da 004 (`lib/concessao-credito/regras.mjs`, importada pela regra de 01 §14) com os valores da carteira `PUBLICA` e exposição 2.000.000: 100000 Supervisor, 100000.01 Gerente, 1000000 Gerente, 1000000.01 Diretoria; 200000.01 com exposição 200000 → Comitê de crédito (sem a lib: `pular('depende de 004')`). Não escreve no banco: a solicitação do 5002 fica como o C-012 precisa (validador C-4); a faixa e a exceção no banco estão em C-003, C-005 e C-012 |
| C-012, RN-018 | C | `ccCredDecisaoRegistrar` (5002, `APROVADA`, 200000) como Gustavo → ok, `ALCADA_EXIGIDA` Gerente (faixa da `PUBLICA`; 200.000 = exposição, sem exceção); `ccCredCreditoListar({ carteira: 'PUBLICA' })`: `RATING_PUB` P1, `RATING_CONCESSAO` vazio; `CC_DECISAO.RATING_PUB` P1, `LIMITE_MOTOR` 200000 e `RATING` vazio; `CC_CREDITO.ANALISE_ORGAO_ID` = análise do 5002 (DT-36); depois de `rodarCron`, nenhuma linha de `CC_RISCO_CLIENTE` para o 5002 |
| C-005 | C | solicitação do 5003 (350.000, federal; análise como Carlos: CAPAG A, pessoal não informado, CAUC regular, SUS fundo a fundo, pontual, empenho e contrato, base contrato com `VALOR_ESTIMADO` e saldo 350.000, vigência 2027-06-30 → nota 95, P1, exposição 350.000; `LIMITE_PROPOSTO` 350.000 por Carlos): decisão como Silvia → erro `/Gerente/`; como Gustavo com `limiteAprovado` 350000.01 (acima da exposição: exceção ao motor) → erro `/Comitê de crédito/`; com 350000 → ok, `ALCADA_EXIGIDA` Gerente, `LIMITE_MOTOR` 350000. Decisão do 5004 (seed): responsável Silvia, `ALCADA_EXIGIDA` Supervisor, `RATING_PUB` P2, `LIMITE_MOTOR` 40000 |
| C-003 | C | solicitação do 5005 (edital 1.200.000, `VALOR_ESTIMADO` 1.200.000; análise salva como Carlos): `ccPubMotorCalcular` → 87, P1, exposição 1200000, `PRE_APROVAR`, `podeAprovar` false; `APROVADA` como Diana → erro `/contrato/`; `PRE_APROVADA` como Gustavo → erro `/Diretoria/` (faixa: 1.200.000 = exposição, sem exceção); como Diana → ok, `ALCADA_EXIGIDA` Diretoria, `CC_DECISAO.RATING_PUB` P1; card continua em `comite`; após `rodarCron`, `CC_ANALISE_ORGAO.PRE_APROVADA` verdadeiro |
| C-004, RN-005 | A | `podeAprovar`: saldo 80000 e vigência 2026-11-30 → false, motivo `/vigência/`; saldo 0 e vigência 2027-06-30 → false, `/saldo/`; vigência 2026-12-01 → true |
| C-031, RN-037 | A + C | último do bloco C (lê os contratos do 5003 e do 5002 aprovados no C-005 e no C-012; dependência declarada da sequência, validador C-4): `ccPubContratoListar({ soAlerta: 0 })` → 4 (5001, 5002, 5003, 5004); `soAlerta: 1` → 5001 (`SALDO`) e 5004 (`VIGENCIA`); `ccPubResumo.CONTRATOS_ALERTA` 2; `alertaContrato` nos limites (60 e 61 dias; 20 % e 19,99 %) |
| C-013 | B + D | B: `ccPubNfTotal({})` 7; `situacao 'PAGA'` 2; nenhuma linha da 1010 nem da 1099; nova rodada mantém 9 linhas. D (no fim): NF de 2 parcelas de 10.000 no 5005 com 1 paga → `SALDO_ABERTO` 10000, `PAGO_EM` nulo; com as 2 pagas → `PAGO_EM` = data da segunda |
| C-014 | B | NF 1001: `LIQUIDAR_ATE` 2026-10-16, `PAGAR_ATE` 2026-10-30, `SITUACAO` `LIQUIDACAO_VENCIDA`, `DIAS_ATRASO` 32; `ccPubNfFicha` dá a mesma situação (SQL = lib) |
| C-015, RN-022 | A + B | NF 1003: 2026-11-10 / 2026-11-17, `PEQUENO_VALOR` verdadeiro; `prazosNf` com contratação de 70.000 → 2026-11-17 / 2026-12-02; com prazo de contrato 30 → pagar até 2026-12-03 e liquidar até 2026-11-10 |
| C-016 | A + B | NF 1004: `PAGAR_ATE` 2026-12-01, `PRAZO_CONTRATO` verdadeiro; `prazosNf` sem o feriado do DF → 2026-11-30; NF 1005: `LIQUIDAR_ATE` 2026-12-09 |
| C-017 | B | `ccPubNfListar({ acima2m: 1 })` → 1002 e 1009; sem a 1001 |
| RF-017 | B | como Gustavo, `ccPubNfListar({})`: as 4 vencidas primeiro, em `PAGAR_ATE` crescente (1009, 1001, 1002, 1003), depois as 3 no prazo em `PAGAR_ATE` crescente, a 1004 primeiro; `busca '2026NE000812'` (empenho) → só a 1001; `busca 'GOIANIA'` → só a 1001 |
| RN-002, RN-031 | B | dado dos quadros semeados no passo 3 do pipeline, que os testes da 002 e da 004 não cobrem na `PUBLICA` (validador C-8): `concessao-publica` com os itens de 05 §4.2 (Pública: `entrada` 3, `analise` 5, `comite` 2, texto exato); `cobranca-publica` com `KB_FASE.SLA_HORAS` `nf_protocolar` 48, `liquidacao_vencida` 120, `pagamento_vencido` 240, `oficio` 240 e os itens de 05 §3.3 (Pública), texto exato |
| C-019, RN-026 | B | como Gustavo: `ccPubResumo` → 7, 222000, `A_PROTOCOLAR` 1, `LIQUIDACAO_VENCIDA` 2, `PAGAMENTO_VENCIDO` 2, `ACIMA_2M` 2, `VALOR_ACIMA_2M` 60000; funil (DT-33): `SEM_ATESTO` 4 e `VALOR_SEM_ATESTO` 137000 (1001, 1003, 1005, 1008), `AGUARDANDO_LIQUIDACAO` 0 e 0, `LIQUIDADAS_SEM_PAGAMENTO` 3 e `VALOR_LIQUIDADAS_SEM_PAGAMENTO` 85000 (1002, 1009, 1004), `VALOR_PAGAMENTO_VENCIDO` 60000, `RECEBIDO_MES` 0 e `NFS_RECEBIDAS_MES` 0; com `mes '2026-09'` → 18000 e 1 (a 1006); `ccPubNfTotal` → `ORGAOS` 4, `VENCIDAS` 4, `VALOR_VENCIDO` 170000; `TOTAL` como Carlos 7, Silvia 7, Ana 0. Capa do card do 5001: `valor_aberto` 52000, `nfs_abertas` 3, prazo 2026-12-01; linha de `CC_POSICAO_CLIENTE` do 5003 igual antes e depois do passo |
| C-020, RN-028 | A + B | `PROXIMO_PASSO`/data: 1001 `G3` 2026-11-24; 1002 `M2` 2026-11-30; 1009 `G5` 2026-10-30; 1003 `L3` 2026-11-25; 1005 `CONF` 2026-11-27. `ccCobAgendaListar({ carteira: 'PUBLICA' })` como Carlos: 4 linhas `PROX_ACAO` (5003, 5002, 5004, 5001 nessas datas), todas `ATRASADO`. `ccPubMensagemPreparar(1001, 'G4')` → `PUB_OFICIO`, corpo com "1001", "2026NE000812", "30/10/2026", `validado` false. `passoAtual` no empate `L3`/`G2` → `L3` |
| C-022, RN-030 | A + B | `ccCobQuadroResumo({ carteira: 'PUBLICA' })`: `nf_protocolar` 1, `oficio` 2, `requerimento` 1, demais 0; `ccPodeMover` do card do 5001 para `oficio` → `PODE = 0`, "A etapa do órgão acompanha as notas fiscais."; `etapaOrgao` com `L3` vencido e não feito → `oficio` (PA-02) |
| C-025 | B | `ccCobBloqueioListar` e `ccCobEmailFilaListar` com `carteira 'PUBLICA'` vazias; `ccCobQuadroResumo({ carteira: 'PRIVADA' })` sem o 5003; `ccCobSituacao(5003)`: `BLOQUEIO_DEVIDO` vazio; `ccCobAcordoPropor` no caso do 5003 → `ok: false` |
| C-029 | B | `ccPubCertidaoListar`: `CND_FEDERAL` `VENCENDO`, `CND_ESTADUAL` `VENCENDO`, `CRF_FGTS` `VENCIDA`, `CNDT` `VALIDA`; `ccPubResumo`: `CERTIDOES_VENCENDO` 2, `CERTIDOES_VENCIDAS` 1 |
| RN-024 | A + B | NF 1004: `ETAPA_NF` `OP`, `SITUACAO` `NO_PRAZO`; `situacaoNf` de NF sem protocolo com hoje 2027-01-31 → `A_PROTOCOLAR` |
| RN-027 | B | `ccPubNfFicha(1001).passos`: `CONF` 2026-10-06, `L1` 10-19 (feito), `L2` 10-23 (feito), `L3` 10-30, `G1` 11-03, `G2` 11-09, `G3` 11-24, `G4` 12-15, `M2` 12-02; ficha da 1002 sem `CONF` e sem `L*` |
| C-028, RN-019 | A + B | `REGRA_ID` gravado: 1004 Distrito Federal, 1001 e 1003 Municípios, 1002 Federal; `regraDaNf`: estadual GO → Estado de Goiás; sem esfera → Federal; contratação com Tocantins → Tocantins; DF inativa → Federal |
| RN-009–RN-016 | A (+ C na RN-011) | as linhas da spec, uma a uma, sobre `motorOrgao`, `fimMandato`, `capacidadeSugerida`. RN-011 também no banco, na solicitação do 5003 antes do C-005: `ccPubAnaliseSalvar` com CAPAG A → capacidade Alta; com capacidade Baixa → `CAPACIDADE_MANUAL` verdadeiro; com CAPAG B → continua Baixa (como Carlos, com os dados da análise do C-005; o teste termina regravando CAPAG A) |
| RN-020, RN-021, RN-023 | A + B | `prazosNf` e `mais2Meses` com as entradas da spec; NF 1002 no banco com `PAGAR_ATE` 2026-11-04 |
| RN-033 (tipo) | B | `ccPubMensagemPreparar` com `passo ''`: 1002 `PUB_REQUERIMENTO`; 1008 e 1005 `PUB_PROTOCOLO`; 1001 `PUB_LIQ`; 1004 `PUB_FILA` |
| C-018, RN-025 | D | `ccPubNfDatasSalvar(1005)`: atesto 2026-11-20 → erro `/protocolo/`; liquidação 2026-12-05 → `/hoje/`; ordem de pagamento sem liquidação → `/liquidação/`; atesto na 1008 → erro |
| RF-013 | D | como Carlos, com `nasDuasSessoes` (cada passada lança e devolve; termina no estado do seed): `ccPubNfDatasSalvar(1004)` com empenho, protocolo 2026-10-30 e atesto 2026-11-06, sem liquidação e sem ordem de pagamento → `LIQUIDAR_ATE` 2026-11-16, `SITUACAO` `LIQUIDACAO_VENCIDA`; no mesmo clique o card da SES-DF vai de `nf_protocolar` para `liquidacao_vencida`, movido em nome de Carlos, com `CC_COBRANCA.FASE_DEVIDA` `liquidacao_vencida` e a nota "Etapa do órgão: Liquidação vencida · cobrar atesto"; `execucoes()` = 15 (16 com `SIM_SESSAO_ANINHADA=1`). Relançar liquidação 2026-11-12 e ordem de pagamento 2026-11-26 → card de volta em `nf_protocolar`, com a nota "Etapa do órgão: NF a protocolar" |
| RF-004 | D | como Carlos, na análise do 5002 (decidida no C-012): `ccPubAnaliseSalvar` com `capag 'X'` → erro (opção fechada, RN-010); com `capag 'A'` → erro (decidida: só contrato, saldo, vigência, prazo do contrato e regra); com `saldoContrato` 190000 → ok, `SALDO_CONTRATO` 190000 e fotografia regravada; volta a 200000 (termina como estava) |
| RF-014 | D | depois da rodada do C-012, `ANALISE_ID` da 1001 = análise do 5002 (a contratação mais recente do órgão, ligada pela rotina); `ccPubNfDatasSalvar(1003, <estado atual do trilho>, analiseId = análise do 5001)` → erro `/Contratação/`, nada gravado; com `analiseId 0` mantém a contratação do 5004. A troca para outra contratação do mesmo órgão recalcula os prazos como a variante do C-015 (bloco A, contratação de 70.000) |
| RN-038 | D | como Ana, `ccPubNfDatasSalvar` numa NF do 5003 → "não encontrada"; como Carlos com `membroId` de Gustavo no input → `ATUALIZADO_POR` = Carlos; como `visitante` → "Você não faz parte da equipe…". DT-34: `ccPubMotorCalcular` (solicitação do 5002) por `como(null)` com `membroId` de Carlos devolve o mesmo que como Carlos; com `membroId` de Ana → "Solicitação não encontrada.". Decisor fora do caso (B-C3), com `nasDuasSessoes`: como Sérgio (nível 2, outra equipe), solicitação do 5005 (em `comite`, pré-aprovada no C-003) com `gravar = 0` → ok, nota 87, P1; com `gravar = 1` → "Solicitação não encontrada." e `CALCULADO_EM` igual; solicitação do 5002 (fora de `comite` depois do C-012) com `gravar = 0` → "Solicitação não encontrada." |
| C-021 | D | `ccPubNfPassoRegistrar(1001, 'L3')` → `noPrazo` false; `'M2'` → true; `'G4'` → erro `/antecedência/` e `passos.G4.podeFeito` false; `ccPubReguaCumprimento` de dezembro para Carlos: `FEITOS` 2, `NO_PRAZO` 1 (`DEVIDOS` 7 pela PA-01); `ccCobContatoListar({ nfId })` → 2, os dois com `ORIGEM` `REGUA_PUB`, `RETORNO` vazio, `FEEDBACK` começando por "L3 feito" e "M2 feito" e sem `EMAIL_ENVIADO_ID`; `execucoes()` de cada registro = 10; logo depois de cada registro, `ccPubNfListar` devolve `PROXIMO_PASSO` = o `proximoPasso` devolvido, sem rodar a rotina |
| RN-029 | D | `pub.rpFeitoAntecedencia` = 15 (`ccBaseParametroSalvar`, Gustavo) → `passos.G4.podeFeito` true; volta a 2 |
| RN-033 (envio) | D | `ccPubNfPassoRegistrar(1003, 'L1', enviarEmail 1)` com `PUB_LIQ` sem validação → ok; 1 e-mail em `SIM_EMAIL` |
| C-024 | D | `ccPubNfPassoRegistrar(1003, 'L3', enviarEmail 1)` → erro `/validação/` e nenhuma linha em `CC_NF_ACAO`; `ccBaseModeloValidar('PUB_OFICIO')` como Júlia; de novo → ok, `CC_EMAIL_ENVIADO` com `ORIGEM '005-regua-publica'` e `REFERENCIA 'nf:<id>:L3'`, `CC_NF_ACAO.EMAIL_ENVIADO_ID` preenchido; o contato do passo com `ORIGEM` `REGUA_PUB` e o mesmo `EMAIL_ENVIADO_ID`; `execucoes()` = 16 |
| C-027 | D | `ccPubNfFicha(1005).regra.SITUACAO` `A_CONFIRMAR`; `ccPubRegraEnteSalvar` (DF, `validar 1`) como Silvia → erro `/Gerente/`; como Gustavo sem link → `/link/`; com link → `VERIFICADO`, `VALIDADO_POR` Gustavo, `VALIDADO_EM` começa por 2026-12-01 |
| RN-035 | B + D | B: 5 regras, todas `A_CONFIRMAR`. D: como Ana, editar prazo → recusado; Gustavo valida Tocantins com link; Silvia muda `pagDias` → `A_CONFIRMAR` e `VALIDADO_POR` nulo |
| RN-036 | A + D | `ccPubCertidaoSalvar` (`CND_FEDERAL`, validade 2027-05-30) como Silvia → listada como `VALIDA`; 2 linhas do tipo na tabela; `situacaoCertidao` em hoje + 15 → `VENCENDO`, hoje + 16 → `VALIDA` |
| C-023 | D | `ccPubNfFicha(1009)`: `G5` devido 2026-10-30, atrasado; 5003 em `requerimento`. Com a 003: `ccJurDossieAbrir` + itens + `ccJurDossieEnviar` → card em `juridico`; nova rodada → continua `juridico`. Sem a 003: `pular('depende de 003')` na segunda metade |
| C-026 | D | parcela da 1003 paga em 2026-12-01 no Winthor; leitura + processamento → `SITUACAO` `PAGA`, `DIAS_ATRASO` 14; caso do 5004 com `DESFECHO` `REGULARIZADO` e card em `regularizado`; agenda de Carlos sem o 5004; `ccPubResumo({})`: `RECEBIDO_MES` sobe 30000 e `NFS_RECEBIDAS_MES` sobe 1 em relação a antes do pagamento |
| RN-032 | D | baixa do caso do 5002 pela 002 (`ccCobBaixaPropor` Silvia, `ccCobBaixaParecer` Júlia, `ccCobBaixaDecidir` Diana); nova rodada → NF 1001 `BAIXADA`, fora de `ccPubNfTotal({})`, e nenhum caso novo aberto para o 5002 |
| RN-039 | D (fim) | `CC_AUDITORIA` tem linha com `POR`, `CAMPO`, `ANTES`, `DEPOIS` nas áreas `Setor público` (análise), `Notas fiscais` (data e passo), `Regras por ente` (validação) e `Certidões` (renovação) |
| orçamento | B + D | `execucoes()`: abrir a lista de NFs ≤ 6; abrir o card de `concessao-publica` do 5002 = 3 e o de `cobranca-publica` do 5001 (`kbCardDetalheSql` + `ccCobCasoFicha` + `ccPubNfListar`) = 3 (DT-42); `ccPubNfDatasSalvar` com mudança de fase 15/16 (RF-013), `ccPubNfPassoRegistrar` 16 com e-mail (C-024) e 10 sem (C-021); rodada que cria um caso: o passo informa 14 e a leitura inteira fica ≤ 150 (C-04) |
| B-01 (B3) · RN-007 · DT-40 | C | como Silvia, direto: `ccEscPubAnaliseMotor` P1/10.000.000 → grava e a põe em `PROPOSTA_POR`; `ccEscCredDecisaoInserir` → 0 linha; `ccEscCredSolicitacaoDecisao` → `DECISAO_RESULTADO` vazio; pela SF, Silvia → /propôs/ e Gustavo → "O motor mudou"; Carlos recalcula e a fotografia volta. No 5005: Silvia "Calcular" (`gravar = 1`) → proponente, auditado, decisão recusada. Contrato ativo na guarda da decisão: smoke da 004, `RN-005 (B-01 da B3-005)` |
| C-01 (B3) | D | `ccEscPubNfAcaoInserir` direto como Carlos: `G1` na 1005 (não se aplica) → nada; `L3` na 1001 com prazo 2099 e `agora` 2026-10-01 → `FEITO_EM` de hoje; a rotina regrava `PRAZO` 2026-10-30 e `NO_PRAZO` 0 e audita |
| C-02 (B3) | A | nenhuma expressão de `SET` de `UPDATE` da 005 cita coluna atribuída antes; `ccEscPubRegraAtualizar` começa por `VALIDADO_POR`, `VALIDADO_EM`, `SITUACAO` |
| C-04 (B3) | D (fim) | 5006 vira público com NF de transação abaixo do cursor → entra com a 1099; recuo de `pub.nfDataCorte` para 2025-11-01 → a 1011 do 5005 entra paga; corte de volta → `pub.nfCorteLido` 2026-01-01 |
| C-05 (B3) | D (fim) | prazo do card do 5001 alterado à mão → o passo `PUBLICO` processa 1 órgão e reserva 13 a mais que a rodada quieta (a 002 ainda não regrava prazo sem capa: ver Divergências) |

Tela (`frontend/tests/005-setor-publico.test.mjs`, `node --test` sobre `formato.ts`):

| Cenário / regra | O que o `assert` verifica |
|---|---|
| RF-016 | `textoSituacao({ SITUACAO: 'LIQUIDACAO_VENCIDA', LIQUIDAR_ATE: '2026-10-16' })` = "Liquidação vencida desde 16/10"; paga com 26 dias → "Paga com 26 dias de atraso"; `etiquetaRegra` → "Distrito Federal · a confirmar · prazo do contrato", "Municípios · a confirmar · pequeno valor", "Federal" |
| C-030, RN-034 | `documentoRecebivel` das NFs 1001, 1002, 1003, 1009 → os quatro textos da spec |
| RN-017 | `evidenciasExigidas('EDITAL')` 5 itens; `('CONTRATO')` 6 |
| C-029 | `tiposSemCertidao` com as quatro cadastradas → só `CND_MUNICIPAL` |

Os fluxos entre módulos (cobrança pública → dossiê → Jurídico; pré-aprovada → aprovada) ficam também em `smoke/900-fluxos.mjs`, do integrador.

## Sandbox (01 §15) — o que esta spec depende e o plano B já escrito

| # | Onde a 005 usa | Se falhar |
|---|---|---|
| S-01, S-14 | chamadas aninhadas a `ccCobCasoSincronizar`, `ccCobContatoRegistrar`, `ccEmailEnviar`, `ccPubMotorCalcular` com `membroId` | regra única DT-34 (01 §4): quem chama passa `membroId`, a chamada resolve por `quem()`; `ccCobCasoSincronizar` aceita pessoa (duas origens), então o clique de datas move o card nas duas hipóteses (RF-013 com `nasDuasSessoes`); plano C de 01 §4 |
| S-03, S-04 | `ccEscPub…` no perfil com guarda; conferência de linha afetada | guarda mantida; reler a linha |
| S-06 | `ON DUPLICATE KEY UPDATE` no upsert das NFs | `UPDATE` + `INSERT … WHERE NOT EXISTS` |
| S-07, S-09 | leitura Oracle por `runQueryMitra` e `runDmlMitra` na rotina em cron | passo em cron próprio (01 §11 plano B); se `runQueryMitra` com `jdbcId` não rodar em cron, publicar `ccPubWinthorNf` fora do perfil e chamá-la da rotina |
| S-10 | arquivo da certidão por `uploadFilePublicMitra` | certidão guarda um link |
| S-11 | e-mail ao órgão enviado por business | envio pela rotina a partir da fila da 002 (01 §13 plano B) |
| S-12 | `PCNFSAID.NUMNOTA/SERIE/VLTOTAL`, `PCPREST`, `PCPEDC.NUMPEDCLI` como empenho, ramos públicos | muda só `winthor-nf.mjs`; empenho segue manual |
| S-13 | custo de `kbCardCriar`/`Mover`/`Atualizar` | ajustar a reserva de 13 por órgão e as contas de 16 e 18 |

## Respostas do arquiteto (`docs/contrato/pedidos/00-respostas.md`, 16/11/2026)

Os 25 pedidos foram aceitos e estão no contrato. Com alteração, já aplicada neste plano: **PA-04** (`historico` aceito; `sugestoes.perfilPag` sai), **PA-05** (teto 20, DT-29: o contato vai com a próxima ação e a mudança de fase leva a capa; contas refeitas na correção v2 pelos custos da 002: 16 nas datas, 18/14 no passo), **PA-24** (`regraId` sai da entrada de `ccPubNfDatasSalvar`). PA-15 virou P-47. PA-17 a PA-25: aceitos como estavam no plano; PA-13 depende da confirmação do usuário.

## Decisões

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-001 | Prazos gravados; situação e dias de atraso na leitura | gravar a situação e regravar todo dia | prazo muda com dado; situação muda com o relógio |
| D-002 | Só o passo atual é gravado na NF; os demais são calculados | uma linha por passo pendente | 10 linhas por NF regravadas a cada mudança de data; o passo atual basta para lista, agenda e capa |
| D-003 | Motor, prazos e régua numa lib pura do backend; a tela não tem cópia | duplicar em `frontend/src/lib` | uma fonte da regra, no servidor; a tela mostra `podeFeito`, `passos[]` e `motor` |
| D-004 | A rotina recalcula todas as NFs em aberto em memória a cada rodada e grava a diferença | rodada completa diária + incremental | centenas de NFs cabem numa rodada; dispensa estado de "rodada do dia" |
| D-005 | Cursor da leitura = maior `NUMTRANSVENDA` já gravado, para órgão com NF gravada; releitura do zero para órgão sem NF e no recuo da data de corte (só `pub.nfCorteLido` em `CC_ESTADO`) | cursor por órgão em `CC_ESTADO` | o cursor global perdia NF de órgão que vira público e o recuo do corte (C-04 da B3); uma chave basta |
| D-006 | A 005 compara antes de chamar a 002 | chamar `ccCobCasoSincronizar` para todo órgão toda rodada | uma execução por órgão por rodada estoura o teto com 150 órgãos |
| D-007 | E-mail antes de gravar o passo | gravar e depois enviar | envio recusado não deixa passo "feito" |
| D-008 | Regras iniciais inseridas no provisionamento, todas a confirmar | herdar "Verificado" para a Federal | quem valida é a Gerência ou o Jurídico, com o link (P-23) |
| D-009 | Evidências exigidas como lista de tela | marcar pelo tipo do anexo | anexo do card não tem tipo |
| D-010 | Variações de cenário testadas na lib | alterar e restaurar o seed no banco | os testes deixam de depender da ordem (validador C-5) |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Colunas do Winthor para NF, parcelas e empenho (S-12) | leitura das NFs não sai | SQL isolado em `winthor-nf.mjs`; empenho manual |
| Implantação com muitos órgãos | cerca de 12 cards novos por rodada | script do sandbox que chama `ccRotina` em laço na implantação (mesma saída do PA-19 da 002) |
| 003 construída em paralelo (fase B3) | C-023 incompleto no smoke da 005 | `pular('depende de 003')`; o fluxo inteiro está em `900-fluxos` |
| SQL da situação divergir da lib | lista e ficha discordam | C-014 e RN-024 comparam as duas |
| Arquivo de certidão em endereço público (01 §12) | baixo: certidão é documento público | nome com uuid; URL só para membro ativo |
| Seed da 005 carregado em banco de outro `RELOGIO` (006, 007) | datas seguem o relógio por `dia(n)`, mas os feriados são absolutos: prazos e situações mudam | nenhum assert de outra spec depende de data da 005 (DT-38; 006 e 007) |

## Complexity Tracking

| Princípio violado | Por que é necessário | Por que a alternativa simples não serve |
|---|---|---|
| III (parcial) — `ccEscPub…` chamada direto pula a validação de conteúdo e a auditoria da JS (limite de 01 §5) | a plataforma não tem SF só-interna (S-03) nem transação | a guarda de permissão, estado e visibilidade está na SQL e toda linha grava autor e data; se a S-03 permitir, as `ccEscPub…` saem do perfil |
| V (parcial) — operação de várias escritas pode parar no meio (passo gravado, contato não) | uma instrução por SF | ordem fixa domínio → auditoria → outras SFs; escritas idempotentes; a rotina reconcilia caso e próxima ação |

## Divergências com o contrato (correção da B3, 17/11/2026)

| # | O que | Contrato | Como ficou |
|---|---|---|---|
| 1 | "Calcular" (`ccPubMotorCalcular` com `gravar = 1`) | 02 `CC_ANALISE_ORGAO.PROPOSTA_POR` e 04 §5: o "Calcular" não mexe em `PROPOSTA_POR` | torna proponente (B-01, decisão do orquestrador). A decisão pública da 004 também exige na SQL contrato ativo (`BASE = 'CONTRATO'`, saldo > 0, vigência ≥ `HOJE_SQL`) para `APROVADA` |
| 2 | `ccPubWinthorNf` | 04 §5 lista a SF ("só a rotina") | não publicada (C-03): ninguém a chama e, no perfil, leria NF de qualquer `CODCLI` do ERP, sem visibilidade. Mesmo critério da base: `ccBaseWinthorTitulos` existe porque uma SF da casa a chama |
| 3 | `CC_ESTADO['pub.nfCorteLido']` | 02 lista as chaves de `CC_ESTADO` | chave nova, escrita só pela rotina (C-04) |
| 4 | Custos de `ccPubNfDatasSalvar` e `ccPubNfPassoRegistrar` | 04 §5: 16, 14 e 18 | medidos: 15 (16 com sessão aninhada), 10 e 16 |
| 5 | Prazo do card do órgão (C-05) | 05 §3.7 linha 2: comparar o prazo | a 005 compara e pede; a 002 (`ccCobCasoSincronizar`) só regrava `KB_CARD.PRAZO` junto com a capa. Até a 002 aplicar o prazo sozinho, o card fica com o prazo antigo e a rotina repete o pedido (13 de reserva) a cada rodada |
| 6 | Prazo do card = menor prazo pendente entre as NFs (`PAGAR_ATE` da liquidada, senão `LIQUIDAR_ATE`) | 05 §3.4 fala no "liquidar até" | o "liquidar até" de NF já liquidada não é prazo |
| 7 | RN-002 · RN-031 | texto exato dos itens | o teste confere contagem e SLA; os textos são dados da 002 e da 004, e conferi-los contra a mesma constante seria tautológico |
| 8 | Rotina e caso público sem NF na 005 | 05 §3.7 linha 4 | a rotina não encerra caso de órgão sem nenhuma linha em `CC_NF_PUBLICA` (não é dela); hoje só a 005 cria caso `PUBLICA` |
| 9 | Marca `ADMIN` e NF | 04 §5: "caso" | "caso" = `clienteVisivelA`, que inclui quem vê tudo (marca `ADMIN`): Nara (agente, nível 1, marca) lança datas e passos de órgão de outra equipe. Coerente com a 002 (O-07) |
