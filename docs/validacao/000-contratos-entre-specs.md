# Validação 000 — Contratos entre as 7 specs

**Fase:** 0b · **Data:** 2026-11-14 · **Validador:** agente independente (só leu; não corrigiu nada)

**Lido:** `docs/constitution.md`, `docs/arquitetura.md`, `docs/execucao.md` (regras 1–8),
`docs/estudo-artefato/00-visao-geral.md` §8, os 7 `plan.md` inteiros, e das specs o
que foi preciso para tirar dúvida (001 Regras, Pendências e Anexos A/B; 002 RN-004,
009, 012–017, 024, 026–028, 030; 003 RN-003, 004, 007, 022, 026, 030; 004 RN-008, 027,
035; 005 RN-007, 026, 030, 032; 006 RN-001, 012, 015, 017 e NC-1..3; `tasks.md` T-001..T-003
de cada uma). Skill `benenutri:mitra-escopo` e `references/plataforma-mitra.md` lidas.
Conferido também `p-57803/backend/add-001-crm-functions.mjs` (identidade em SF JAVASCRIPT).

**Como citar:** `002/plan §Pedidos 001-F` = `docs/specs/002-cobranca-privada/plan.md`, seção
"Pedidos a outras specs", linha 001-F.

## Resumo

| | Qtde |
|---|---|
| Pedidos entre specs | **88** (001: 7 · 002: 15 · 003: 12 · 004: 13 · 005: 18 · 006: 12 · 007: 11) + 5 pedidos de emenda à arquitetura |
| ATENDIDO | **24** |
| ATENDIDO COM NOME DIFERENTE | **27** |
| LACUNA | **37** |
| Bloqueios (BLOQUEIA o backend) | **19** — 001: 7 · 002: 5 · 003: 2 · 004: 2 · 005: 1 · 006: 1 · 007: 1 |

Os cinco achados mais graves:

1. **Parâmetros sem contrato.** A 001 fecha um catálogo de 114 chaves em camelCase sem
   prefixo (`regLig`, `alcProp1`); a 002 usa `cob.regLig`, a 003 `JUR_ACORDO_ALCADA_VALOR`,
   a 004 `alcSupValor`, a 005 `pubAlcadaSupervisor`. Cerca de 200 chaves são semeadas fora do
   catálogo, cerca de 40 repetem com outro nome uma chave que a 001 já tem, e
   `ccParametroSalvar` recusa chave fora do catálogo (§2.4).
2. **`ccEmailEnviar` não encaixa.** A 001 monta destinatário, assunto e corpo sozinha a
   partir do código do modelo; a 002 (fila da régua) e a 005 (régua pública) mandam
   `para`, `assunto` e `corpo` prontos. E a 001 recusa modelo com efeito legal sem validação
   enquanto manda **não publicar** `ccModeloValidar` (NC-9): notificação formal, protesto,
   extrajudicial, ofício e a notificação da 003 nunca saem (§4.8).
3. **A posição do cliente não tem o que 4 specs supõem.** Faltam em `CC_POSICAO_CLIENTE`:
   `VENCIDO_VALOR_DIAS` (encargos da 002), saldo por faixa `V_1_30…V_180` (aging e PDD da
   006), `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS` e o carimbo de mudança
   (motor e rotina da 004). E a leitura da 001 calcula e zera a posição de cliente público,
   que a 005 quer gravar pelos prazos legais da NF (§1 004-1, 005 P-7, 006-1).
4. **Cobrança → Jurídico descrito ao contrário, e encargos de dois jeitos.** Na 002 o
   gerente encaminha e "o dossiê nasce a partir do encaminhamento" (RN-030, D-009); na 003 o
   dossiê é montado antes e o envio é que move a cobrança, chamando
   `ccCobrancaEnviarJuridico` e `ccEncargosCalcular`, que **não existem** na 002 (encargos só
   na tela, D-010). Os números da 003 (31.132,08 e 34.461,14) aplicam os dias do título mais
   antigo sobre o total; a RN-015 da 002 manda título a título (§4.1, §4.2).
5. **Esteira e cobrança públicas sem dono.** A 004 recusa `SETOR='PUBLICO'` em todas as SFs,
   inclusive criar; a 005 supõe criar a solicitação "pela SF da 004", etapas `PENTRADA…`,
   `PRE_APROVADA` em `CC_DECISAO` e `CC_CREDITO.RATING_PUBLICO`, que a 004 não tem. Na
   cobrança, a 005 quer gravar etapas públicas em `CC_COBRANCA` por uma SF que a 002 não
   oferece (§1 005 P-10, P-15, P-17).

Outros que pedem atenção antes da B1: nome de SF duplicado (`ccPainelAgentes`, 002 × 006);
a 007 não tem SF SQL de gravação (business não grava por JAVASCRIPT); numeração de arquivos
da 001 (`add-002-clientes`…) colide com a costura por módulo da execucao regra 2; sete
seeds com sete equipes e códigos de cliente que se sobrepõem; três relógios de teste.

---

## 1. Matriz de pedidos

Veredito: **A** = ATENDIDO · **N** = ATENDIDO COM NOME DIFERENTE (quem muda entre parênteses)
· **L** = LACUNA (o dono não oferece, ou oferece algo incompatível).

### 1.1 Pedidos da 001-base (`001/plan §Pedidos a outras specs e à arquitetura`)

Aqui o "dono" é quem consome: a 001 pede que os outros usem o contrato dela.

| # | Para | Pedido | Veredito | Evidência |
|---|---|---|---|---|
| 001-1 | 002–006 | Valores só por `ccParametroValores(segmento, data)`; chave nova = pedido à 001 para entrar no catálogo | **L** | Ninguém segue: 002 semeia `cob.*` em `add-002-cobranca.mjs` e pede helper `parametrosEfetivos` (002 §Parâmetros, 001-I); 003 semeia 37 `JUR_*` em `add-003-tabelas.mjs` (P-2); 004 "insere se a chave não existe" (§Parâmetros); 005 lê `CHAVE LIKE 'pub%'` direto (§Parâmetros); 006 pede "trecho SQL canônico" (§Pedidos) |
| 001-2 | 002, 003, 005 | E-mail só por `ccEmailEnviar` com `origem`/`referencia`; modelos entregues como lista para o seed da 001 (`semearModelos()`) | **L** | 002 e 005 chamam com outra assinatura (ver 001-F, 005 P-4); 002, 003 e 005 semeiam os próprios modelos (002 §Modelos; 003 T-003; 005 §Simulador) |
| 001-3 | 002, 005 | Dias úteis por `ccDiasUteisSomar`/`ccDiaUtilVerificar` ou injetando `lib/dias-uteis.mjs` | **N** (002, 003, 005 mudam) | 002 pede `ehUtil/proxUtil/somaUteis` (001-H); 003 chama `ccDiaUtilSomar` (P-3); 005 pede `ehUtil/proxUtil/somaUteis` (P-1). Nomes da 001: `ehDiaUtil`, `somarDiasUteis`, `motivoNaoUtil`, `ccDiasUteisSomar` |
| 001-4 | 002 | P-01: bloqueio total nasce em `regNeg = 10` | **N** (decidir) | 002 cria chave separada `cob.regBloqTotal` (§Parâmetros) que não existe no catálogo da 001 |
| 001-5 | 003 | Jurídico: compor `OR EXISTS (processo do cliente)` sobre `CTE_VISIBILIDADE` | **A** | 003 RN-030 e §Contratos ("trecho `VIS` da 001") |
| 001-6 | 004 | Compras por validade e faturamento mensal: pedir à 001; cliente fora do universo entra por pedido | **A** | 004 pede (§Pedidos 001 item 1) e digita o faturamento (D-005); prospecto fica em P-09 |
| 001-7 | 006 | Recebimentos com `ESTORNADO = FALSE`; recuperação = `DIAS_ATRASO_PAGAMENTO > 0` | **L** | 006 usa `DATA_PAGAMENTO > VENCIMENTO` e **não filtra estornado** (§Leituras, §Regras transversais "Gerada, recuperado") |

À arquitetura (não contam nos 88): incluir `CC_PARAMETRO_DEF` e `CONTATOS_REVISADO_EM/POR`
(§4); ler "Perfil Mitra" como perfil de negócio (§5); tela "Prazos de pagamento" sem dono (§1).

### 1.2 Pedidos da 002-cobranca-privada (`002/plan §Pedidos a outras specs`)

| # | Para | Pedido | Veredito | O que o dono oferece |
|---|---|---|---|---|
| 001-A | 001 | `CC_POSICAO_CLIENTE` com `VENCIDO`, `A_VENCER`, `DIAS_ATRASO`, `VENC_MAIS_ANTIGO`, `PROX_VENC`, `PROX_VENC_VALOR`, `DATA_SINC`, **`VENCIDO_VALOR_DIAS`** | **L** | Tudo existe menos `VENCIDO_VALOR_DIAS` (001 §Modelo de dados); `DATA_SINC` chama-se `SINCRONIZADO_EM` |
| 001-B | 001 | `CC_RECEBIMENTO` com `DT_VENC`, `DT_PAGTO`, `VALOR_PAGO`, índice (`CLIENTE_ID`, `DT_PAGTO`) | **N** (002 muda) | `VENCIMENTO`, `DATA_PAGAMENTO`, `VALOR_PAGO`; índices separados em `CLIENTE_ID` e `DATA_PAGAMENTO`; falta filtrar `ESTORNADO` |
| 001-C | 001 | Cron da leitura nos minutos 0/15/30/45; régua 5 min depois | **L** | Cron `0 */5 * * * *` que decide por `syncIntervaloMin` contado do último `INICIO` (001 D-002) — sem minuto fixo; ver §5 "cron" (cadência real de 20 min) |
| 001-D | 001 | Aceitar seed das chaves `cob.*` e das metas; editor genérico mostra `cob.*` só para leitura | **L** | Catálogo fechado (`CC_PARAMETRO_DEF`, 114 chaves, 001 D-009); sem conceito de "só leitura"; as chaves da régua já existem sem prefixo |
| 001-E | 001 | `CC_MODELO_MENSAGEM` com `CODIGO`, `ASSUNTO`, `CORPO`, `EFEITO_LEGAL`, `VALIDADO_POR/EM`, `TEXTO_WHATSAPP` se houver; seed de 11 `COB_*` | **N** (002 muda) | Colunas existem + `VALIDADO_VERSAO`, `CAMPOS_EXTRAS`; sem `TEXTO_WHATSAPP` (`CANAL = EMAIL`); seed pelo `semearModelos()` da 001; campos do Anexo B têm outros nomes (§2.2) |
| 001-F | 001 | `ccEmailEnviar({ modeloCodigo, clienteId, para, assunto, corpo, anexoIds })` → `{ ok, emailEnviadoId, error }` | **L** | `ccEmailEnviar(codigo, clienteId, contatoId, extras, origem, referencia)` → `{ ok, error?, emailId, resultado }`; não aceita `para`/`assunto`/`corpo`/`anexoIds` (001 §add-005-comunicacao) |
| 001-G | 001 | `ccAuditoriaRegistrar` (SQL) | **N** (002 muda) | `ccAuditoriaRegistrarGravar(area, entidade, entidadeId, clienteId, campo, antes, depois, agora)` e helper `auditar()` em `lib/escritas.mjs` |
| 001-H | 001 | `backend/lib/dias-uteis.mjs` **e** `frontend/src/lib/dias-uteis.ts`: `ehUtil`, `proxUtil`, `somaUteis`, `motivoNaoUtil` | **N** (002 muda) + lacuna parcial | `ehDiaUtil`, `somarDiasUteis`, `motivoNaoUtil`; `proxUtil` não existe; sem cópia no frontend (001 D-012) |
| 001-I | 001 | Helper `parametrosEfetivos(segmento, prefixo)`; `ccParametroGravar(chave, segmento, valor, vigenciaInicio)` | **N** (002 muda) | `ccParametroValores(segmento, data)` (SF SQL, sem prefixo); `ccParametroGravar(chave, segmento, valor, herdar, vigenciaInicio, agora)` com guarda ADMIN |
| 001-J | 001 | `membroDaSessao()` e fragmento `CARTEIRA_VISIVEL` | **N** (002 muda) | `membroDaSessao()` em `lib/escritas.mjs`; `CTE_VISIBILIDADE`, `clienteVisivel(alias)`, `membroVisivel(coluna)` em `lib/visibilidade.mjs`. A T-003 da 002 não deve criar esse arquivo |
| 001-K | 001 | `CC_CONTATO_CLIENTE` com `PREFERIDO`; `CC_ANEXO` aceita `ENTIDADE='COBRANCA'` | **N** (002 muda) | Coluna é `PRINCIPAL` (um por ficha, 001 RN-021); `ENTIDADE` é livre (guarda: membro ativo) |
| 003-A | 003 | Dossiê nasce de `CC_COBRANCA` com `ETAPA_MANUAL='JURIDICO'`; a 003 não escreve em `CC_COBRANCA` | **L** | A 003 faz o contrário: dossiê antes, e `ccDossieEnviar` grava a etapa chamando `ccCobrancaEnviarJuridico` (003 §Fluxo 3, P-9) |
| 005-A | 005 | `CC_CONTATO_COBRANCA` e `ccContatoRegistrar` servem ao público | **A** | 005 P-13 pede o mesmo |
| 006-A | 006 | PDD, roll rate e movimento leem `CC_COBRANCA`, `CC_BAIXA`, `CC_ACORDO` | **A** | 006 §Leituras |
| 007-A | 007 | P-7 atendido (`CLIENTE_ID` indexado, `ETAPA_NOME`, autor e data) | **A** | 007 P-7 |

### 1.3 Pedidos da 003-juridico (`003/plan §Pedidos a outras specs`)

| # | Para | Pedido | Veredito | O que o dono oferece |
|---|---|---|---|---|
| P-1 | 001 | `ccMembroAtual` (id, nome, cargo, nível, admin, ids visíveis); trecho `VIS`; flag `ADMIN` | **N** (003 muda) | `ccMembroEu` (SQL) / `membroDaSessao()`; `ccMembroVisiveis`; `CTE_VISIBILIDADE`; `CC_MEMBRO.ADMIN` |
| P-2 | 001 | `ccParametroVigente(chaves CSV, segmento)`; escrita de parâmetro chamável por JS; aceitar 37 `JUR_*` | **L** | `ccParametroValores(segmento, data)` e `ccParametroSalvar` existem; as 37 chaves não entram (catálogo fechado) e 6 duplicam chaves da 001 (§2.4) |
| P-3 | 001 | `ccDiaUtilSomar(data, dias, uf)` | **N** (003 muda) | `ccDiasUteisSomar(data, dias, uf, municipio)` |
| P-4 | 001 | `ccAuditoriaRegistrar` em lote (`campos` JSON) | **L** | `ccAuditoriaRegistrarGravar` grava um campo por execução |
| P-5 | 001 | `ccAnexoRegistrar` com `DOSSIE_ITEM` e `PROCESSO_CUSTO`, leitura condicionada à visibilidade do processo | **L** | `ENTIDADE` livre, PDF/PNG/JPG e 20 MB atendidos; mas a guarda fora de `CLIENTE` é só "membro ativo", e `ccAnexoRemoverGravar` exige "cliente visível" — o Jurídico não enxerga cliente nenhum (001 RN-012) |
| P-6 | 001 | `ccModeloMensagemObter(codigo)` com `CORPO, VERSAO, VALIDADO_POR, VALIDADO_EM`; código `JUR_NOTIF_EXTRAJUDICIAL` | **N** (003 muda) | `ccModeloObter(id)` (por id, não por código) e `ccModeloRenderizar(codigo, …)`; validade = `SITUACAO_VALIDACAO = 'VALIDO'` (versão + prazo), não `VALIDADO_EM` preenchido |
| P-7 | 001 | `ccClienteTitulosVencidos(clienteId)`; `ccClienteBuscar` por código e CNPJ; `CC_CLIENTE` com endereço | **L** | `ccClienteTitulos(codcli, 'ABERTOS', limite, offset)` e `ccClienteListar(busca, documento, codcli, …)` existem, mas com guarda "cliente visível" (Jurídico = nenhum); `CC_CLIENTE` não tem endereço (só ao vivo em `ccClienteFicha.winthor.ENDERECO`) |
| P-8 | 002 | `ccEncargosCalcular(clienteId, data)` | **L** | Não existe. Encargos só na tela: `encargos()` em `frontend/src/lib/cobranca.ts` (002 D-010) |
| P-9 | 002 | `ccCobrancaEnviarJuridico(clienteId, processoId)` idempotente; `ccCobrancaSituacao(clienteId)`; botão "Montar dossiê" no cartão | **L** | Existe `ccCobrancaEncaminharJuridico(clienteId, obs)` (exige gerente, sem `processoId`, sem idempotência declarada); `ccCobrancaSituacao` não existe (`ccCobrancaFicha` tem guarda de carteira); botão não previsto |
| P-10 | 002 | Mover o cartão para Jurídico sem processo abre o dossiê | **N** (002 muda a tela) | `ccCobrancaMover` devolve `abrir: 'JURIDICO'`, que hoje abre o encaminhamento da 002 (RN-024) |
| P-11 | 005 | Contrato/edital, empenho e protocolo por cliente para o dossiê público | **L** (adiada) | `ccNfPubListar(clienteId)` dá empenho e protocolo (005 P-14); contrato/edital só por `solicitacaoId` (`ccOrgaoAnaliseLer`) |
| P-12 | 001 | Perfil de acesso libera as 62 SFs e 8 tabelas da 003 | **L** | `add-009-perfil-acesso.mjs` libera só as SFs e tabelas da 001 |

À arquitetura: P-13 (`CC_NOTIFICACAO`, `CC_FILIAL_CREDORA`, faixa `add-003-*`).

### 1.4 Pedidos da 004-concessao-credito (`004/plan §Pedidos a outras specs`)

| # | Para | Pedido | Veredito | O que o dono oferece |
|---|---|---|---|---|
| 004-1 | 001 | Posição com `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS`, `COMPRAS_90D` e carimbo que só muda quando a linha muda | **L** | Só `COMPRAS_QTD`/`COMPRAS_VALOR` (janela `comprasJanelaDias`); `SINCRONIZADO_EM` e `SINCRONIZACAO_ID` mudam a cada leitura; `PLANO_PRAZO_MEDIO` em `CC_CLIENTE` é o prazo do plano, não o praticado |
| 004-2 | 001 | Cargo `ANALISTA`; fragmento de hierarquia (subordinados e superiores) em `backend/lib/hierarquia.mjs` | **N** (004 muda) | `ANALISTA` existe; fragmento em `backend/lib/visibilidade.mjs` (`membroVisivel`); "superiores de um membro" não é exportado |
| 004-3 | 001 | Valor efetivo por segmento (JS e SQL); registro "insere se não existe"; valor texto | **L** | Leitura atendida (`ccParametroValores`; tipo `RATING`/`TEXTO`); registro fora do catálogo não existe; 11 chaves com outro nome (§2.4) |
| 004-4 | 001 | `CC_ANEXO` com `ENTIDADE='SOLICITACAO'` e tipos; listar por entidade | **A** | `ccAnexoRegistrar` (`entidade`, `tipoDoc` livres), `ccAnexoListar(entidade, entidadeId)` |
| 004-5 | 001 | Escrita de auditoria chamável pelas JS | **A** | `auditar()` / `ccAuditoriaRegistrarGravar` |
| 004-6 | 001 | Listagem de planos de pagamento do Winthor; busca de cliente | **L** | Busca: `ccClienteListar`. Planos: nenhuma SF (001 §Pedidos "tela de planos não tem dono") |
| 004-7 | 001 | Situação da ficha de contatos | **A** | `SITUACAO_FICHA` em `ccClienteListar` e `ccContatoListar` |
| 004-8 | 001 | Mecanismo de gravação em lote da sincronização | **A** (padrão, não helper) | SF em cron fora do perfil gravando com `runDmlMitra` em lotes de 500 (001 §Fluxo 5) |
| 004-9 | 001 | `CC_CLIENTE.GRUPO_ECONOMICO` preenchido | **A** | Manual por `ccClienteClassificar` (NC-3 aberta) |
| 004-10 | 002 | Bloqueio pela régua legível | **A** | `CC_COBRANCA.BLOQUEIO_DEVIDO` / `BLOQUEIO_APLICADO` (002 D-008) |
| 004-11 | 002 | A 002 pode ler `CC_RISCO_CLIENTE` | **A** (oferta não usada) | 002 mantém `cob.prob*` |
| 004-12 | 005 | 005 estende `CC_SOLICITACAO`, usa HIST/CHECK/DECISAO/CREDITO/PENDENCIA; P1–P4 em `CC_ANALISE_ORGAO`, nunca em `RATING_*` | **L** | 005 pede `CC_CREDITO.RATING_PUBLICO` e `RESULTADO='PRE_APROVADA'` (P-16, P-17) e não usa `CC_PENDENCIA_WINTHOR` |
| 004-13 | 006 | 006 lê `CC_SOLICITACAO`, `CC_DECISAO`, `CC_CREDITO`, `CC_PEDIDO_RETIDO`, `CC_RISCO_CLIENTE` | **N** (006 muda) | 006 espera rating e criticidade em `CC_CREDITO` (§Pedidos 004); estão em `CC_RISCO_CLIENTE` |

À arquitetura: `CC_RISCO_CLIENTE`, `CC_PENDENCIA_WINTHOR`, `CC_CALIBRACAO_REVISAO`; HIST/CHECK/DECISAO servem ao pedido.

### 1.5 Pedidos da 005-setor-publico (`005/plan §Pedidos a outras specs`)

| # | Para | Pedido | Veredito | O que o dono oferece |
|---|---|---|---|---|
| P-1 | 001 | `dias-uteis.mjs` (`ehUtil`, `proxUtil`, `somaUteis`) nacional + UF + município; `CC_FERIADO` com `UF`, `MUNICIPIO` | **N** (005 muda) | `ehDiaUtil`, `somarDiasUteis`; `proxUtil` falta; `CC_FERIADO.UF/MUNICIPIO` existem |
| P-2 | 001 | `CC_CLIENTE.MUNICIPIO`, `UF`, `ESFERA`, `SETOR` | **A** | 001 §Modelo de dados |
| P-3 | 001 | `ccParametroVigente(chave, segmento, data)` e leitura por prefixo | **N** (005 muda) | `ccParametroValores(segmento, data)` devolve todas; sem filtro por prefixo |
| P-4 | 001 | Visibilidade, `ccAuditoriaRegistrar`, `ccEmailEnviar` devolvendo o id | **L** | Devolve `emailId`, mas a 005 chama com `para`, `assunto`, `corpo` (`ccReguaPubEnviar`), que a 001 não aceita |
| P-5 | 001 | Validação de modelo por versão, feita por cargo `JURIDICO`; 7 códigos `PUB_*` | **L** | Por versão: atendido (`VALIDADO_VERSAO`). Quem valida: NC-9 aberta, `ccModeloValidar` "não publicar" (001 §Pontos bloqueados) |
| P-6 | 001 | `CC_ANEXO` com `ANALISE_ORGAO`, `CERTIDAO` e 11 tipos | **A** | `entidade` e `tipoDoc` livres |
| P-7 | 001 | Leitura não calcula posição de `SETOR='PUBLICO'`; `ccPosicaoPublicaGravar(...)` | **L** | Leitura calcula todos e zera quem não veio (001 §Fluxo 5, RN-008); SF não existe |
| P-8 | 001 | T-001 confirma `PCNFSAID`/`PCPREST` e inclui no `schema-winthor.mjs` | **L** | T-001 e schema da 001 cobrem `PCCLIENT, PCPREST, PCPLPAG, PCUSUARI, PCATIVI, PCCOB`; `PCNFSAID` fora |
| P-9 | 001 | Funções de contato "Ordenador de despesa", "Fiscal", "Gestor do contrato"; perfil inclui a 005 | **L** | Funções são constante da tela com a lista do artefato; perfil só da 001 |
| P-10 | 002 | `ccCobrancaEtapaAutoGravar(clienteId, etapa)`; etapas `NFPROT, NFLIQ, NFPAG, OFICIO, REQUERIMENTO, PAGOS`; checklist público | **L** | Nada disso: `ccReguaInserirClientes` só insere privados; 14 etapas constantes em `regua.mjs` (002 D-015) |
| P-11 | 002 | Régua, bloqueio e fila ignoram `SETOR='PUBLICO'` | **A** (com ressalva) | `segmento ∈ '', PRIVADO, ESTETICA`; se a 005 passar a gravar linha pública em `CC_COBRANCA`, o filtro `''` precisa excluir explicitamente |
| P-12 | 002 | Minha agenda inclui `ccReguaPubAgenda` e `ccReguaPubCumprimento` | **L** | `ccAgendaMontar` não tem ponto de extensão; a 002 é construída antes |
| P-13 | 002 | Canais "Ofício", "Portal do órgão"; retorno "Aguardando liquidação (órgão)" | **A** | 002 §Pedidos 005-A |
| P-14 | 003 | Envio ao Jurídico de público grava `JURIDICO` pela P-10; dossiê público lê `ccNfPubListar` | **L** | 003 chama `ccCobrancaEnviarJuridico` (inexistente); dossiê público "fora de escopo agora" (003 P-11) |
| P-15 | 004 | Solicitação pública nasce em `PENTRADA`; etapas `PENTRADA/PANALISE/PAPROV`; mover da 004 recusa público | **L** | A 004 recusa `PUBLICO` em **todas** as SFs (D-013), inclusive `ccSolicitacaoCriar`; etapas P* não estão no domínio de `ETAPA` |
| P-16 | 004 | `ccSolicitacaoEtapaGravar`, `ccSolicitacaoCheckMarcar`, `ccDecisaoInserir` (`PRE_APROVADA`), `ccCreditoInserir` | **N** (005 muda) + lacuna | `ccEscSolicitacaoEtapa` + `ccEscHistAbrir/Fechar`, `ccEscCheckGravar`, `ccEscDecisaoInserir`, `ccEscCreditoInserir`; `PRE_APROVADA` não está em `CC_DECISAO.RESULTADO` |
| P-17 | 004 | `CC_CREDITO.RATING_PUBLICO`; criticidade e farol ignoram público; Monitoramento / Reavaliação | **L** | Sem a coluna; rotina, criticidade, farol e saúde não filtram setor (004 §Rotina) |
| P-18 | 006 | Consumir `ccNfPubKpis(hoje, buId)` e `ccCertidaoListar` | **N** (006 muda) | 006 chama `ccNfPublicaResumo(buId)`; não cita certidões |

### 1.6 Pedidos da 006-painel-consolidado (`006/plan §Pedidos a outras specs`, na ordem da tabela)

| # | Para | Pedido | Veredito | O que o dono oferece |
|---|---|---|---|---|
| 006-1 | 001 | Posição com saldo por faixa (`V_1_30`…`V_180`) por título | **L** | Não existe; a posição é agregada por cliente (001 D-003) |
| 006-2 | 001 | `CC_RECEBIMENTO` (`CLIENTE_ID`, `DATA_PAGAMENTO`, `VENCIMENTO`, `VALOR_PAGO`), histórico desde janeiro do ano anterior | **A** (ressalva) | Nomes iguais. Primeira carga lê só `hoje − 365` (001 D-005) |
| 006-3 | 001 | `CC_SINCRONIZACAO` com `INICIO` e `SITUACAO` | **A** | Situações: `SOLICITADA/EM_ANDAMENTO/OK/ERRO` |
| 006-4 | 001 | `CC_FATURAMENTO_MES` e `CC_PLANO` sincronizados | **L** | Não existem (001/spec §Fora de escopo: "ficam com a spec que precisar, pedindo à base") |
| 006-5 | 001 | `CC_MEMBRO.ADMIN/ATIVO`; `CC_CLIENTE.GRUPO_ECONOMICO, UF, CODPLPAG` | **N** (006 muda) | `PLANO_COD` (não `CODPLPAG`); demais iguais |
| 006-6 | 001 | Parâmetros `meta*`, `pdd0..5`, `saudeDiasRisco`, `saudeUsoAtencao`, `hhiModerado`, `hhiAlto`, `painelSincAtrasoMin` | **L** | `meta*` (10) e `pdd0..5` no catálogo; as 5 últimas não; `saudeDiasRisco` colide com `saudeRiscoDias` da 004 |
| 006-7 | 001 | Trecho SQL canônico do valor efetivo; auditoria por id | **N** (006 muda) | SF `ccParametroValores` (o trecho não é exportado); `ccAuditoriaRegistrarGravar` |
| 006-8 | 002 | Contato com data e membro; promessa `ABERTA/CUMPRIDA/QUEBRADA`; baixa com data de aprovação; acordo com data da quebra; próxima ação | **N** (um dos dois muda) | `CC_CONTATO_COBRANCA.DATA/AGENTE_ID`; `CC_PROMESSA.SITUACAO` = `ABERTA/CUMPRIDA/VENCIDA`; `CC_BAIXA.DECIDIDO_EM`; `CC_ACORDO.ENCERRADO_EM` + `SITUACAO='QUEBRADO'`; `CC_COBRANCA.PROX_ACAO_DATA` |
| 006-9 | 002 | `ccAgendaResumo(buId, carteira)` | **L** | Não existe (`ccAgendaMontar` é por pessoa) |
| 006-10 | 003 | `CC_PROCESSO` com situação ativa; `ccJuridicoResumo(buId)` | **L** | Sem coluna `SITUACAO` (ativo = `ETAPA <> 'ENCERRADO'`); o mais próximo é `ccProcessoKpis` + `ccJuridicoAlertas` + `ccCustoResumo` |
| 006-11 | 004 | `CC_SOLICITACAO` com prazo do SLA, data e resultado da decisão; `CC_CREDITO` com rating e criticidade atuais; `CC_PEDIDO_RETIDO` | **L** | Sem prazo (SLA só na tela, 004 D-014); decisão em `CC_DECISAO.EM/RESULTADO`; rating e criticidade em `CC_RISCO_CLIENTE` |
| 006-12 | 005 | Rating P1–P4 por cliente; `ccNfPublicaResumo(buId)` | **N** (um dos dois muda) | `CC_ANALISE_ORGAO.RATING_PUB`; `ccNfPubKpis(hoje, buId)` |

### 1.7 Pedidos da 007-historico-apoio (`007/plan §Pedidos a outras specs`)

| # | Para | Pedido | Veredito | O que o dono oferece |
|---|---|---|---|---|
| P-1 | 001 | Catálogo (`ROTULO`, `GRUPO`, `UNIDADE`, `ORDEM`); `ccParametroVigente(chave, segmento)` | **N** (007 muda) | `CC_PARAMETRO_DEF` + `ccParametroListar(grupo, segmento, busca, data)`, que já devolve valor geral, do segmento, em vigor, origem e vigência |
| P-2 | 001 | `CC_AUDITORIA.CLIENTE_ID`; `ccAuditoriaRegistrar(..., clienteId)` | **N** (007 muda) | `ccAuditoriaRegistrarGravar`; coluna de autor é `POR`/`POR_NOME` (007 RN-008 testa `USUARIO`) |
| P-3 | 001 | `CC_ANEXO.CLIENTE_ID` indexado | **A** | Coluna existe; índice declarado é só (`ENTIDADE`, `ENTIDADE_ID`) — pedir o índice |
| P-4 | 001 | `ccAnexoRegistrar` com `ENTIDADE='MATERIAL'`, URL legível por todos, tipos e 20 MB | **A** | Entidade livre; guarda "membro ativo" |
| P-5 | 001 | Helper de visibilidade como SF ou módulo; flag `ADMIN` | **N** (007 muda) | `ccMembroVisiveis` e `lib/visibilidade.mjs` |
| P-6 | 001 | `CC_EMAIL_ENVIADO.CLIENTE_ID` indexado; recebimento com vencimento e pagamento | **A** | 001 §Modelo de dados |
| P-7 | 002 | `CLIENTE_ID`, data, autor e texto nas tabelas da cobrança; etapa legível | **A** | 002 §Pedidos 007-A; `ETAPA_NOME` no histórico |
| P-8 | 003 | `CLIENTE_ID` em `CC_PROCESSO`; data e autor em andamentos | **A** | 003 "Pedidos recebidos" (andamento e custo por junção) |
| P-9 | 004 | `CLIENTE_ID` em HIST/CHECK/DECISAO/PEDIDO; `CC_CREDITO` com limite, utilizado, rating, farol, score, fonte pagadora | **N** (007 muda) | HIST/CHECK/DECISAO são genéricas por `ENTIDADE`+`ENTIDADE_ID`, sem `CLIENTE_ID`; rating e score em `CC_RISCO_CLIENTE`; fonte pagadora em `CC_SOLICITACAO.FP_NOME`; utilizado na posição |
| P-10 | 005 | `CLIENTE_ID` e marcos com data em `CC_NF_PUBLICA`/`CC_NF_ACAO` | **A** | 005 §Pedidos, última linha |
| P-11 | 001–005 | Cada dona confirma as colunas do mapa de fontes | **L** | 002, 003 e 005 responderam; 001 e 004 não |

---

## 2. Colisões

### 2.1 Nomes de Server Function

| Achado | Onde | Gravidade |
|---|---|---|
| **`ccPainelAgentes` definida duas vezes**, com entradas e saídas diferentes | 002 §Contratos Leitura (`segmento, buId, mes`) × 006 §Contratos (`mes, buId, carteira`) | BLOQUEIA — o mapa de ids é por nome |
| Família `ccPainel*` dividida entre duas specs | 002: `ccPainelKpis/Agentes/Bu/Aging/TopDevedores` · 006: `ccPainelPosicao/RollRate/Serie/SerieCredito/Credito/Agentes/Planos/Saude/Equipe` | corrigir junto: 002 vira `ccCobrancaPainel*` |
| Domínio `Contato` para duas tabelas | 001: `ccContatoListar`, `ccContatoFichaSalvar`, `ccContatoInserirGravar` (ficha) · 002: `ccContatoRegistrar`, `ccContatoInserir`, `ccContatoHistorico` (cobrança). `ccContatoInserir` × `ccContatoInserirGravar` | observação; a arquitetura §2 usa `ccContatoRegistrar` para a cobrança |
| Sufixo de total fora do padrão | 007: `ccFonteListarTotal`, `ccMaterialListarTotal`, `ccHistoricoClienteBuscarTotal`, `ccHistoricoEventosTotal` (arquitetura §2: `…Listar` / `…Total`) | observação |
| Três convenções para a SQL de gravação interna | 001 e 006: `…Gravar` · 002, 003, 005: `…Inserir`/`…Gravar`/`…Excluir` · 004: prefixo `ccEsc…` | observação (emenda §7) |
| Nomes genéricos sem domínio | 004: `ccEtapasDefinicao`, `ccChecklistListar/Marcar`, `ccPendenciaListar/Aplicar`; 003: `ccCustoListar`, `ccAndamentoListar` | observação |

Não há outro nome exato repetido (conferido por extração de todos os `cc…` dos 7 plans).

### 2.2 Mesma tabela ou coluna com definição diferente

| Tabela · coluna | Dono | Quem supõe outra coisa |
|---|---|---|
| `CC_POSICAO_CLIENTE` | 001 | 002: `VENCIDO_VALOR_DIAS`, `DATA_SINC` · 004: `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS`, `COMPRAS_90D` · 006: `V_1_30…V_180` · 005 quer **escrever** nela (P-7) |
| `CC_RECEBIMENTO` | 001 (`VENCIMENTO`, `DATA_PAGAMENTO`, `ESTORNADO`) | 002: `DT_VENC`, `DT_PAGTO` |
| `CC_CONTATO_CLIENTE.PRINCIPAL` | 001 | 002 e arquitetura §4: `PREFERIDO` |
| `CC_CLIENTE.PLANO_COD`, `DOCUMENTO` | 001 | 006: `CODPLPAG`; 002/007 saída `CNPJ` |
| `CC_SOLICITACAO.ETAPA` | 004 (`ENTRADA…RECUSADA`) | 005: `PENTRADA`, `PANALISE`, `PAPROV`, Monitoramento |
| `CC_DECISAO.RESULTADO` | 004 | 005: `PRE_APROVADA` |
| `CC_CREDITO` | 004 (`RATING_CONCESSAO`) | 005: `RATING_PUBLICO` e, no teste C-012, `RATING`; 006 e 007: rating atual, criticidade, score, utilizado |
| `CC_COBRANCA.ETAPA` | 002 (14 códigos) | 005: 6 etapas públicas |
| `CC_ACAO_REGUA` | 002 (`UNIQUE (CLIENTE_ID, ETAPA, DATA_REF, ITEM)`, item 1..3) | 005: checklist público da RN-031 |
| `CC_PROMESSA.SITUACAO` | 002 (`VENCIDA`) | 006 e arquitetura §4: `QUEBRADA` |
| `CC_PROCESSO` | 003 (sem `SITUACAO`) | 006 e arquitetura §4: `SITUACAO` |
| `CC_ANALISE_ORGAO.RATING_PUB` | 005 | 006: `RATING` |
| `CC_AUDITORIA` | 001 (`POR`, áreas `Clientes`, `Carteira`, `Parâmetros`…) | 007: coluna `USUARIO`, área `HISTORICO`, `ENTIDADE='CC_CONTATO_CLIENTE'` |
| Autor da linha | 001–006: `CC_MEMBRO.ID` | 007: e-mail em `ATUALIZADO_POR VARCHAR(120)` |
| `CC_FOTO_AGING` | 006: larga, uma linha por cliente e mês (D-001) | arquitetura §4: (mês, cliente, faixa, valor) — desvio justificado |
| Campos de modelo `[CAMPO]` | 001 Anexo B: `[CLIENTE]`, `[PROXIMO_VENCIMENTO]`, `[VENCIMENTO_MAIS_ANTIGO]`, `[TELEFONE_CONTATO]`, `[EMAIL_CONTATO]` | 002 §Modelos: `[NOME_CONTATO]`, `[DATA_VENCIMENTO]`, `[DATA_VENCIMENTO_ORIGINAL]`, `[TELEFONE_COBRANCA]`, `[EMAIL_COBRANCA]` — `ccModeloSalvar` recusa campo desconhecido (001 RN-022) |

Mesmo número calculado em dois lugares (risco de divergir):

| Número | Onde |
|---|---|
| Foto mensal por cliente | `CC_CALIBRACAO` (004, no dia 1º pelo relógio) × `CC_FOTO_AGING` (006, na primeira leitura OK do mês novo) |
| Saúde (saudável / atenção / risco) | `CC_RISCO_CLIENTE.SAUDE` (004 RN-029, `saudeRiscoDias`) × `ccPainelSaude` (006 RN-012, `saudeDiasRisco`) |
| Pontualidade | 002 calcula de `CC_RECEBIMENTO` (`cob.pontualidadeMeses`) × 004 espera `PONTUALIDADE_PCT` na posição |
| Aging | 002 `ccPainelAging` (só tem dado por cliente) × 006 `ccPainelPosicao` (NC-1: por título ou por cliente) |
| Concentração (HHI) | 002 RN-026 com 1.500 e 2.500 fixos × 006 `hhiModerado`/`hhiAlto` |
| Lista "aplicar no Winthor" | 002: diferença `BLOQUEIO_DEVIDO` × `BLOQUEIO_APLICADO` · 004: `CC_PENDENCIA_WINTHOR` (`BLOQUEAR_LIMITE` se sobrepõe ao bloqueio total) |

### 2.3 Tabela ou arquivo tocado por quem não é o dono

| O quê | Quem | Regra ferida |
|---|---|---|
| `CC_POSICAO_CLIENTE` gravada pela 005 (P-7) e `CC_COBRANCA` gravada pela 005 (P-10) e pela 003 (P-9) | 005, 003 | arquitetura §4 — só vale se for pela SF do dono, que ainda não existe |
| Linhas de `CC_PARAMETRO` e `CC_MODELO_MENSAGEM` semeadas direto | 002 (`add-002-cobranca.mjs`), 003 (`add-003-tabelas.mjs`), 004, 005, 006 (seed) | 001 §Pedidos (catálogo e `semearModelos()`) |
| `CC_MEMBRO`, `CC_CLIENTE`, `INT_USER` semeados com equipe própria | 002–007 (§Simulador de cada um) | 001 RN-011 (um topo, nome e e-mail únicos) |
| `backend/lib/escritas.mjs` recebe as `ccEsc*` | 004 §Escritas SQL internas | execucao regra 1 (dois agentes, mesmo arquivo) |
| `backend/lib/visibilidade.mjs` criado "se a 001 não tiver" | 002 T-003 | idem |
| DDL em `backend/setup-backend.mjs` | 001, 006, 007 | execucao regra 2 (`schema/NNN-<slug>.mjs`) |
| `simulator/seed.mjs` e `simulator/smoke.mjs` únicos | todas | execucao regra 2 (`seed/NNN`, `smoke/NNN`) |
| `add-002-clientes.mjs` … `add-006-auditoria.mjs`, `add-009-perfil-acesso.mjs` | 001 | execucao regra 2: `add-NNN` é o número do módulo; `add-002`…`add-006` são das specs 002–006 |
| `CC_FATURAMENTO_MES`, `CC_PLANO` atribuídas à 001 | 006 §Leituras | a 001 não as tem |

### 2.4 Parâmetros (`CC_PARAMETRO.CHAVE`)

Três padrões de nome: **001** camelCase sem prefixo (Anexo A, 114 chaves, catálogo em
`CC_PARAMETRO_DEF`); **002** `cob.` + camelCase (cerca de 36 chaves); **003** `JUR_` + CAIXA_ALTA
(37 chaves); **004**, **005** e **006** camelCase com ou sem prefixo de módulo (004: 97 chaves,
28 já no catálogo; 005: 69, 10 já no catálogo; 006: 5 fora do catálogo). Fora do catálogo, pelo
nome: 36 + 37 + 69 + 59 + 5 ≈ 206. `ccParametroSalvar` lê tipo, mínimo e máximo do catálogo (001 §Fluxo
"Parâmetro"): chave fora dele não é gravável pela SF, não aparece em `ccParametroListar`
nem nas "regras em vigor" da 007.

Mesma regra, dois nomes:

| Conceito | 001 (Anexo A) | Outra spec |
|---|---|---|
| Dias da régua privada | `regLig`, `regNotif`, `regNeg`, `regProp`, `regExtra`, `regJur`, `regJurMax` | 002: `cob.regLig` … `cob.regJurMax` |
| Aviso preventivo | `prevAviso1` (5), `prevAviso2` (1) | 002: `cob.prevInicio` (5); D-1 fixo no código |
| Bloqueio total (P-01) | `regNeg` (10) | 002: `cob.regBloqTotal` (10) |
| Quebra de acordo | `quebraDias` | 002: `cob.quebraDias` |
| Tolerância da promessa | `promTolerDias` | 002: `cob.promessaTolerancia` |
| Carta de anuência | `anuenciaDiasUteis` | 002: `cob.anuenciaPrazoUteis` |
| Alçada da baixa | `alcBaixa1`, `alcBaixa2` | 002: `cob.alcBaixa1`, `cob.alcBaixa2` (+ `cob.alcBaixaNivel1..3`, novas) |
| Encargos | `multaPriv`, `jurosPriv`, `multaPub`, `jurosPub`, `correcao` | 002: `cob.multa`, `cob.juros`, `cob.correcao` |
| Contato e assinatura | `comTelefone`, `comEmail`, `comAssinatura` | 002: `cob.contatoTelefone`, `cob.contatoEmail`, `cob.assinatura` · 003: `JUR_NOTIF_TELEFONE`, `JUR_NOTIF_EMAIL` |
| Acordo judicial e notificação | `jurEntradaPct`, `jurMaxParcelas`, `jurAlcAcordo`, `jurHonorariosPct`, `jurCustoMetaPct`, `notifPrazoDias` | 003: `JUR_ACORDO_ENTRADA_MIN_PCT`, `JUR_ACORDO_PARCELAS_MAX`, `JUR_ACORDO_ALCADA_VALOR`, `JUR_HONORARIOS_PCT`, `JUR_CUSTO_META_PCT`, `JUR_NOTIF_PRAZO_DIAS` |
| Alçada da concessão privada | `alcProp1`, `alcProp2`, `alcProp3` | 004: `alcSupValor`, `alcGerValor`, `alcRegionalValor` |
| Alçada da concessão pública | `alcPub1`, `alcPub2` | 005: `pubAlcadaSupervisor`, `pubAlcadaGerente` |
| Pedido acima do limite | `alcExcPct1`, `alcExcValor1`, `alcExcPct2`, `alcExcPct3`, `excAtrasoComite` | 004: `pedSupPct`, `pedSupValor`, `pedGerPct`, `pedDirPct`, `pedAtrasoComiteDias` |
| Validade do crédito | `validadeMeses`, `comprasRecorrentes` | 004: `credValidadeMeses`, `credComprasRecorrentes` |
| Descasamento da fonte pagadora | `fonteDescasDias` | 004: `fpDescasamentoDias` |
| Saúde: dias para risco | (não existe) | 004: `saudeRiscoDias` · 006: `saudeDiasRisco` |
| Calibração | `calibMinMeses` (12 meses de dados) | 004: `calibMeses` (3) — nome parecido, sentido diferente |
| Pequeno valor | `pequenoValor`, 2 vigências, semeado pela 001 | 005 semeia de novo em `add-005-publico-tabelas.mjs` |
| Metas | `metaInad` … (vigência `2000-01-01`) | 002 semeia `metaInad/metaConv/metaProm`; 006 semeia todas com vigência `2026-01-01` |

Chaves do Anexo A que nenhuma outra spec usa (busca nos `plan`, `spec` e `tasks` das 002–007):
`regConfPag`, `prevAviso2`, `posProtestoDias`, `inadDias`, `contratoVigDias`,
`contratoSaldoPct`, `revAtraso`, `revUso`, `baixoRiscoScore`, `baixoRiscoRating`,
`flexMetaTaxa`, `flexMetaConf`, `inadIdxAlerta`, `multaPub`, `jurosPub`, `politicaVersao`,
`calibMinMeses`. A RN-016 da 001 valida algumas delas (ex.: "ligação de confirmação ≥ 2 e
antes do bloqueio") sem que a régua da 002 as leia.

Dois editores e duas validações para a mesma régua: `ccParametroSalvar` com a RN-016 (001) e
`ccReguaParametrosSalvar` com a RN-028 (002) — e as regras divergem (§4.7).

---

## 3. Tabelas novas fora da arquitetura §4

| Tabela | Quem cria | Recomendação | Motivo |
|---|---|---|---|
| `CC_PARAMETRO_DEF` | 001 (D-009) | **Aceitar**, dono 001 | Catálogo (rótulo, grupo, tipo, padrão, mín/máx) não cabe em `CC_PARAMETRO`, que tem uma linha por vigência. A 007 depende dele. Condição: virar catálogo composto por módulo (B-001-1) |
| `CC_RISCO_CLIENTE` | 004 (D-003) | **Aceitar**, dono 004 | Uma linha por cliente lida por seis quadros, pela 006 e pela 007; não cabe em `CC_CREDITO` porque cliente só com solicitação ativa também tem risco. Condição: só `SETOR='PRIVADO'` |
| `CC_PENDENCIA_WINTHOR` | 004 (D-008) | **Aceitar**, dono 004 | É a lista que a constitution IV pede ("ações no ERP saem como lista"). Não fundir com o bloqueio da 002 (lá é estado devido × aplicado); mostrar as duas numa tela só é decisão de frontend |
| `CC_CALIBRACAO_REVISAO` | 004 (D-008) | **Aceitar**, dono 004 | Quatro linhas por ano com parecer e leitura; `CC_AUDITORIA.DEPOIS` é `VARCHAR(1000)` e não comporta o `LEITURA_JSON` |
| `CC_NOTIFICACAO` | 003 (D-007) | **Aceitar**, dono 003, com o nome `CC_NOTIFICACAO_EXTRAJUDICIAL` | Nasce antes do processo (não pode ser andamento) e guarda valores da emissão. O nome curto sugere aviso do sistema |
| `CC_FILIAL_CREDORA` | 003 (D-008) | **Aceitar**, dono 003 | Cinco linhas com razão social e CNPJ; parâmetro com vigência não serve a cadastro. A 005 (`CC_CERTIDAO.CNPJ`) pode ler, sem depender dela para funcionar |
| `CC_FATURAMENTO_MES` | pedida pela 006 à 001 | **Aceitar**, dono 001 | Faturamento mensal por cliente vem do Winthor e não se junta em SQL com tabela do projeto (arquitetura §3); serve também ao motor da 004, que hoje digita o faturamento |
| `CC_PLANO` | pedida pela 006 à 001 | **Fundir** (não criar) | A 001 já grava `PLANO_COD`, `PLANO_NOME`, `PLANO_PRAZO_MEDIO` em `CC_CLIENTE`; o painel agrupa por eles. A lista completa de planos que a 004 precisa é leitura ao vivo (`ccPlanoListar` sobre `PCPLPAG`) |

Colunas e usos além do §4, a registrar: `CC_CLIENTE.CONTATOS_REVISADO_EM/POR` (001);
`CC_SOLICITACAO_HIST`, `CC_SOLICITACAO_CHECK` e `CC_DECISAO` genéricas por `ENTIDADE`
(solicitação e pedido, 004 D-002); bloqueio e encaminhamento ao Jurídico como colunas de
`CC_COBRANCA` (002 D-008, D-009); pendências da carga como colunas de `CC_PROCESSO` (003 D-009).
Tabelas que os plans decidiram **não** criar e está certo: `CC_CARGA_PENDENCIA` (003),
`CC_HISTORICO` e `CC_GRUPO` (007).

---

## 4. Contradições de regra

### 4.1 Encargos sobre o vencido

| Fonte | Diz |
|---|---|
| 002/spec RN-015 | Título a título: multa 2% uma vez; juros simples 1% a.m. pro rata pelos dias **de cada título**; correção composta 0,4% a.m. pelos mesmos dias |
| 002/plan D-010 | Cálculo é "de exibição", feito na tela com `VENCIDO` e Σ(saldo × dias) |
| 003/spec RN-026 e RN-004 | "Usa o cálculo de encargos da cobrança (002)"; o envio grava `VALOR_ATUALIZADO` e a notificação extrajudicial sai com esse total |
| 003/plan §Testes C-003, C-018, C-019 | 30.000 + 600 + 380 + 152,08 = 31.132,08 (títulos de 18.000 há 38 dias e 12.000 há 30 dias); 33.000 + 660 + 572 + 229,14 = 34.461,14 (20.000 há 52 dias e 13.000 há 40 dias) |

Os números da 003 aplicam os dias do título **mais antigo** sobre o principal inteiro. Pela
RN-015 da 002 os mesmos casos dão juros de 348,00 e 520,00, e totais perto de 31.087,25 e
34.388,25 (conta deste validador, a conferir). E um valor que entra em documento com efeito
legal não pode ser calculado só na tela (constitution III). Chaves: `cob.multa/juros/correcao`
(002, por segmento) × `multaPriv/jurosPriv/multaPub/jurosPub/correcao` (001).

### 4.2 Envio ao Jurídico

| Fonte | Diz |
|---|---|
| 002/spec RN-030, plan D-009 | Gerente ou acima encaminha pelo cartão; "o dossiê e o processo nascem na 003 a partir desse encaminhamento"; a 003 só lê o estado |
| 003/spec RN-004, RN-007; plan §Fluxo 1–3 | O dossiê é montado antes (etapa `DOSSIE`, "rascunho não mexe no caso de cobrança"); o **envio** do dossiê completo é que leva a cobrança à etapa Jurídico |
| Alçada | 002: "gerente financeiro ou acima", fixo · 003: parâmetro `JUR_ENVIO_NIVEL_MIN` (teste RN-004 envia com Supervisor) |
| 003 P-10 × 002 RN-024 | Arrastar para "Cobrança judicial": abre o dossiê (003) × pede o encaminhamento (002) |

### 4.3 Alçadas

- **Faixa "Diretor financeiro".** Arquitetura §5 tem níveis 1, 2, 3 e 5. A 004 cria nível 4
  (`nivelDiretorFinanceiro`, `nivelComiteCredito`, spec RN-027): nenhum cargo tem nível 4, só
  a Diretoria alcança. A baixa da 002 tem a mesma faixa com outra chave e "⛔ provisório 5"
  (`cob.alcBaixaNivel2`). O catálogo da 001 descreve `alcBaixa2` como "Diretor financeiro
  (acima: Diretoria/Comitê)". O estudo §8.2 só diz Gerente até R$ 10 mil e Diretoria acima
  de R$ 100 mil. Um parâmetro só resolve as duas specs.
- **Comitê regional com nível 3** (004 R-006): decisão de até R$ 2 milhões por um Gerente.
  Está como parâmetro e como risco; fica para o gestor.
- **Valores coincidem** entre specs (50 mil / 500 mil / 2 milhões no privado; 100 mil /
  1 milhão no público; 20%, 5 parcelas e 50 mil nos acordos). O problema é só o nome das chaves.

### 4.4 Visibilidade

| Ponto | 001 | 002 | 003 | 004 | 006 | 007 | Estudo §8.2 |
|---|---|---|---|---|---|---|---|
| Mecanismo | CTE recursiva única (`lib/visibilidade.mjs`, D-006) | `CARTEIRA_VISIVEL` (pede à 001) | `VIS` (pede à 001) | fragmento da 001 por `ANALISTA_ID` | joins fixos de 4 níveis (D-006) | helper em JS, em memória (D-003) | "a SF filtra pelo usuário logado" |
| Jurídico | nenhum cliente (RN-012) | só os encaminhados, leitura (RN-027) | todos os processos (RN-030) | — | não acessa (RN-015) | só clientes com processo e 6 categorias (D-009) | módulo Jurídico + cobrança dos enviados, só leitura |
| Analista | como agente (NC-8) | — | não acessa | o que analisa (RN-035; P-01 aberta) | excluído (NC-3) | — | "esteira de concessão" |
| Auditoria | só Gerente, Diretoria, Admin (`ccAuditoriaListar`) | — | — | — | — | Supervisor também vê "Alteração auditada" (D-010) | — |

Quatro implementações da mesma regra; a da 006 parte da premissa de que "`:VAR_USER` só é
garantido em SF SQL" e de que `WITH RECURSIVE` pode não passar. O p-57803 usa `:VAR_USER`
dentro de `runQueryMitra` em SF JAVASCRIPT (`usuarioSessao()`,
`add-001-crm-functions.mjs:232`), e a 001 já tem plano B para a recursão (coluna `CAMINHO`).
A execucao regra 4 (P-04) diz "uma pessoa pode ser analista e agente": a 003 e a 006 tiram o
analista de tudo.

### 4.5 Segmento e carteira do cliente

- 001/spec RN-018: **Público se o setor do cliente é público**; senão o segmento da BU; sem BU, Privado.
- 006/spec RN-017 e plan §Regras transversais: pelo **segmento da BU**; o seed cria a BU
  "Governo (PUBLICO)", que a 001 não semeia. Na 001 o órgão público de exemplo (1007) está
  na BU Nutrição com `SETOR='PUBLICO'`.
- A própria arquitetura §4 tem as duas fontes: `CC_CLIENTE.SETOR` e `CC_BU.SEGMENTO = 'PUBLICO'`.

### 4.6 Posição, aging e "hoje"

- **Posição do cliente público.** 001: vencido pelo vencimento do título, para todo
  cliente, zerando quem não veio na leitura. 005/spec RN-026: vencido pelo "pagar até" legal
  da NF. As duas rotinas gravam a mesma linha no mesmo minuto (`0 */15` da 005 e tick de
  5 min da 001). E se a 005 gravar só vencido, a vencer e dias (assinatura do P-7), as faixas
  de aging do público na 006 ficam sem definição.
- **Aging por título ou por cliente.** 006 NC-1 aberta (PDD 10.270 × 10.340 na massa); a 002
  já entrega aging por cliente (`ccPainelAging`); a 001 não tem dado por faixa.
- **"Hoje".** 001: `hojeSaoPaulo()` em `lib/tempo.mjs`, UTC−3 fixo, sem relógio injetável.
  002: `hoje` calculado na JS e passado às SQL; teste C-011 preso a datas de novembro/2026
  com o relógio real. 003: `hoje` vindo **da tela** nas leituras + `CC_HOJE` (D-005). 004:
  `CC_AGORA` em `lib/datas.mjs` (D-010). 005: `hoje` da tela + `CC_HOJE` (D-001, D-004).
  006: "hoje" = data da última leitura OK (D-004). Três variáveis de ambiente, três libs.
- **Cadência.** Arquitetura §3: "cron a cada 15 min (parâmetro)". 001: cron de 5 min que
  decide pelo parâmetro. 002: minutos fixos 5/20/35/50. 004 e 005: `0 */15` fixo (005 D-012).

### 4.7 Régua privada

- **Ordem dos dias.** 001/spec RN-016: os seis dias são inteiros ≥ 2 e **estritamente
  crescentes** na ordem fixa ("o artefato aceitava uma régua fora de ordem"). 002/plan D-003 e
  RN-028: aceita dias em qualquer ordem, só diferentes, e **reordena** as colunas
  (`ordemRegua()`), como o artefato.
- **Etapas que a 001 parametriza e a 002 não lê:** `regConfPag` (ligação de confirmação em
  D+2), `prevAviso2`, `posProtestoDias`. Na 002 o D-1 é "— (1 dia)" no código (constitution II).
- **P-01.** Valores coincidem (10) e seguem a execucao regra 4; divergem as chaves
  (`regNeg` × `cob.regBloqTotal`).

### 4.8 Modelos com efeito legal (P-06)

| Fonte | Diz |
|---|---|
| 001/spec RN-022 | Só envia com validação da versão atual, com menos de 12 meses |
| 001/plan §Pontos bloqueados NC-9 | `ccModeloValidar` e `ccModeloValidacaoGravar` "**não publicar**" até a resposta |
| 002/plan §Modelos, R-007 | Bloquear sem validação é condição "ligada só com a resposta"; até lá o supervisor aprova o texto |
| 003/plan D-019 | Notificação bloqueada até o Jurídico validar |
| 005/plan P-5 | Validação feita por cargo `JURIDICO` |
| execucao regra 4 | "P-06: modelos e encargos entram como 'não validado' até o Jurídico validar" |
| estudo §8.6 | Quem valida: Jurídico, antes de entrar no ar e uma vez por ano |

Somando: nenhum modelo legal pode ser validado e nenhum pode ser enviado. A 002 conta com
enviá-los com aprovação do supervisor; a 001 não deixa.

### 4.9 Contra a constitution, a arquitetura e o estudo §8

| Regra | Achado |
|---|---|
| Constitution III (regra no servidor) | SF SQL de gravação é chamável direto por business e pula alçada e segregação: 001 registra (Complexity Tracking, R-007) e 006 resolve na SQL (D-011); **003** reconhece (R-002) mas deixa o Complexity Tracking vazio; **002** (`ccAcordoSituacaoGravar`, `ccBaixaDecisaoGravar`), **004** (`ccEscDecisaoInserir`, `ccEscCreditoInserir`) e **005** (`ccOrgaoAnaliseInserir`, `ccNfPubDatasGravar`) não tratam |
| Constitution III | Leituras que recebem `hoje` da tela (003 D-005, 005 D-001): quem chama escolhe a data dos alertas e da situação da NF |
| Constitution II | Números da política no código: D-1 da preventiva e HHI 1.500/2.500 (002); cadência do cron (005 D-012, aceitável). `JUR_CARGA_CONCLUIDA` (003) é estado guardado como parâmetro |
| Constitution VIII | `jspdf` entra pela 007, mas a 003 ("já vem da 007") é construída antes (ordem 3 × 7) |
| Arquitetura §2 | Listagem sem `…Total` irmã: 002 D-013, 003 `ccJuridicoAlertas`, 007 (todas em JS) — justificadas, menos as de fontes e material da 007. Leitura em SQL: a 007 faz tudo em JAVASCRIPT |
| Arquitetura §3 | Leitura ao vivo em SF JAVASCRIPT, não em SF SQL com `jdbcId` (001 D-001) — desvio justificado, dependente da T-002 |
| Arquitetura §1 | 002 ↔ 005 (agenda inclui a régua pública) e 003 ↔ 005 (dossiê público) são dependências em sentido contrário à ordem de construção |
| Estudo §8.3 item 4 | 006 C-020 lista `P3` na mesma dimensão `RATING` que AA–E. Os campos são separados na origem; a mistura é só de apresentação |
| Estudo §8.2 | "Administrador: … planos": a tela de planos de pagamento continua sem dono (001 §Pedidos) |
| Estudo §8.1 item 5 | `TEXTO_WHATSAPP` pedido pela 002 "se houver": não há, e está certo (só e-mail) |

Conferidos e **sem** contradição: dias úteis (002 RN-007 e 001 RN-019 dão 23/11/2026 para
13/11 + 5 com o feriado de 20/11); dias de atraso pelo título mais antigo (001, 002, 006);
utilizado = vencido + a vencer; segregação descrita igual em 002, 003, 004 e 005; rating
único AA–E com duas fotografias (004 × §8.3); Estética por parâmetro de segmento (§8.4);
carga única do Jurídico (§8.1 item 9); regras por ente todas "A confirmar" (§8.6).

---

## 5. Riscos de plataforma que atravessam specs

| Suposição | Quem depende | Plano B previsto | Observação do validador |
|---|---|---|---|
| **Identidade em SF JAVASCRIPT** | todas as escritas de 001, 002, 003, 004, 005, 007 (`membroDaSessao()`); a 007 inteira (leituras em JS) | 002 R-001: validação passa para SQL e a JS só orquestra · 006 R-006: a SQL decide, a JS explica · 001 D-008 e 003 D-006: guarda de permissão repetida na SQL · **004, 005, 007: nenhum** | Padrão provado no p-57803 (`runQueryMitra` com `:VAR_USER` na JS). O `membroDaSessao()` da 001 usa outro caminho (chamar `ccMembroEu` por id): a T-002 da 001 não testa isso; a T-001 da 002 testa. Sem teste: `:VAR_USER` em SF chamada por cron |
| **SQL recursivo (`WITH RECURSIVE`)** | 001 (dona), 002, 003, 004, 005 herdam; 007 não usa (recursão em JS); 006 evita | 001 R-004: coluna `CAMINHO` com a mesma interface · 006: joins fixos | Um fragmento só, um plano B só: a 006 não precisa do dela |
| **Outras funções do MySQL 8** | `ROW_NUMBER` (002, 003, 006), `JSON_TABLE` (003 D-013, e o lote de auditoria se for aceito), `ON DUPLICATE KEY`, `FIND_IN_SET`, `INSERT IGNORE` | 003 R-003: lote ≤ 50 e shim no simulador · 006 R-002: `SELECT` de prova · **sem plano B se o MySQL for < 8** para `JSON_TABLE` e `ROW_NUMBER` | Incluir `SELECT VERSION()` e uma prova de cada função na T-002 da 001 |
| **Cron** | 001 `ccSincronizarWinthor` (5 min) · 002 `ccReguaProcessar` (`0 5,20,35,50`) · 004 `ccCreditoRotina` (`0 */15`) · 005 `ccNfPubSincronizar` (`0 */15`) · 006 `ccFotoAgingGravar` (SQL, horária) | 006 R-001: JS em cron chamando a SQL · 001 R-002: cadastro em rodada horária separada · 002 R-006 e 004 R-005: execução assíncrona / incremental | (a) A regra da 001 "último `INICIO` ≥ intervalo" com tick de 5 min dá cadência real de **20 min**: a leitura das 00:00 grava `INICIO` segundos depois, às 00:15 faltam segundos, roda às 00:20. (b) Nenhum plan coordena a ordem: a régua das 00:05 pode rodar sobre posição velha; 004 e 005 rodam no mesmo minuto da leitura; 005 e 001 gravam a mesma linha de posição. (c) Não testado: cron gravando com `runDmlMitra` é o padrão do `consultas-winthor`, mas cron chamando SF SQL por id (002) e cron em SF SQL (006) não |
| **E-mail (`sendEmailMitra`)** | 001 (dona), 002 (fila, anuência), 005 (régua pública) | 001 R-005: sem `reply-to`, o corpo leva o e-mail de contato · 002 R-004: sem anexo, o corpo leva o link · **sem plano B se business não puder enviar** | A T-002 da 001 testa business, HTML e `replyTo`. Falta decidir o remetente |
| **Armazenamento de anexo** | 001 (dona), 002 (anuência), 003 (dossiê, guia e comprovante), 004 (termo assinado é gate; documentos da RN-012), 005 (certidões, evidências), 007 (material) | 001 R-006: nome aleatório e URL só em `ccAnexoListar`, se só houver URL pública | **Nenhum plan diz como o arquivo sai do navegador.** `ccAnexoRegistrar` recebe a `url` pronta; a referência da plataforma só lista `uploadFilePublicMitra` no `mitra-sdk` (token dev). A T-002 da 001 investiga ("API de arquivo para business"); se não houver, seis specs ficam sem anexo e não há plano B (ex.: SF JS recebendo o arquivo e subindo — limitado pelo tamanho do input) |
| **JDBC de dentro de SF JAVASCRIPT** | 001 `ccClienteFicha`, `ccClienteTitulos`, `ccWinthorClienteBuscar` (business) e `ccSincronizarWinthor` (cron) · 005 `ccNfPubSincronizar` (cron) · 003 pelas SFs da 001 | 001 R-003: SF SQL Oracle no perfil com a visibilidade checada pela tela — fere a constitution III e pede decisão do usuário · 005 R-001: isolar a consulta | Em cron é padrão provado (`consultas-winthor/add-004-fotos.mjs`). Para business não é. Teto de 2.000 linhas por leitura (001 §Fluxo 4) vale também para a 005 |
| **Teto de 300 SF/min** | todas | 001 R-010 · 002 D-011, D-012, D-013, D-018 · 003 D-013, P-4 · 004 R-002, R-004 · 005 D-002, R-002 · 006 D-007 | (a) Ninguém conta as chamadas aninhadas: cada JS da 001 gasta `ccMembroEu` + `…Gravar` + uma auditoria por campo. O lote de 20 e-mails da 002 ("N + 4 = 24") custa perto de 84, porque cada `ccEmailEnviar` são 4 execuções. (b) Auditoria campo a campo: o envio do dossiê (003) grava cerca de 6 campos. (c) Crons somados por ciclo: 002 = 14; 005 grava por SF SQL por NF e por órgão |
| **SF interna fora do perfil** | 001 (Complexity Tracking), 003 R-002, 004 ("nunca chamadas pela tela"), 002, 005 | 001: guarda de permissão na SQL · 003: "confirmar com a 001 se a plataforma permite SF só-interna" | Se a JS de um business puder chamar SQL fora do perfil dele, o problema de alçada some para todos. Vale um teste na T-002 |
| **Timeout de 60 s** | 001 leitura completa (R-002), 002 régua (R-006), 004 rotina (R-005), 003 indicadores em memória (R-005), 007 exportar 5.000 eventos | cada um prevê medir | — |

---

## 6. Lista de correções, por spec dona

Severidade: **BLOQUEIA** o backend · **CORRIGIR** · **OBSERVAÇÃO**. Uma frase por item:
arquivo, seção, o que mudar.

### 001-base

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-001-1 | BLOQUEIA | `plan.md` §Modelo de dados (`CC_PARAMETRO_DEF`), §Bibliotecas (`parametros.mjs`), §Pedidos; `spec.md` Anexo A | Trocar o catálogo fechado de 114 chaves por catálogo composto (um arquivo de chaves por módulo, fundido no setup), fixar a convenção de nome do Anexo A e fazer `ccParametroSalvar`/`ccParametroRestaurar` aceitarem qualquer chave do catálogo composto |
| B-001-2 | BLOQUEIA | `plan.md` §Contratos `add-005-comunicacao` (`ccEmailEnviar`), §Pontos bloqueados NC-9 | Aceitar `assunto` e `corpo` finais opcionais e definir o padrão para modelo legal enquanto a NC-9 está aberta (publicar `ccModeloValidar` para Jurídico e Administrador, como diz o estudo §8.6) |
| B-001-3 | BLOQUEIA | `plan.md` §Modelo de dados (`CC_POSICAO_CLIENTE`), §Bibliotecas (`SQL_POSICAO_PAGINA`) | Acrescentar `VENCIDO_VALOR_DIAS`, `V_1_30`…`V_180`, `PONTUALIDADE_PCT`, `COMPRA_MEDIA_MENSAL`, `PRAZO_MEDIO_DIAS` e um `ALTERADO_EM` que só muda quando a linha muda |
| B-001-4 | BLOQUEIA | `plan.md` §Fluxo passo 5; `spec.md` RN-008 | Decidir a posição de `SETOR='PUBLICO'`: a leitura não calcula nem zera vencido e dias desses clientes e nasce `ccPosicaoPublicaGravar` (005 P-7), ou o público segue o vencimento do título e a 005 muda |
| B-001-5 | BLOQUEIA | `plan.md` §Modelo de dados, §Winthor; `tasks.md` T-001, T-004 | Criar `CC_FATURAMENTO_MES` na leitura, `ccPlanoListar` ao vivo sobre `PCPLPAG` e incluir `PCNFSAID` na descoberta e no `schema-winthor.mjs` |
| B-001-6 | BLOQUEIA | `plan.md` §Contratos (nomes de arquivo), §Simulador | Renumerar `add-002-clientes`…`add-006-auditoria` e `add-009` para a costura da execucao regra 2 (`add-001-<parte>.mjs`, DDL em `schema/001-base.mjs`, `simulator/seed/001-base.mjs`, `simulator/smoke/001-base.mjs`) |
| B-001-7 | BLOQUEIA | `plan.md` §Bibliotecas (`visibilidade.mjs`); `spec.md` RN-012 | Dar ao Jurídico leitura dos clientes encaminhados dentro do próprio `clienteVisivel()` (por coluna do cliente gravada no encaminhamento, para não depender de tabela de spec posterior): hoje `ccClienteTitulos`, `ccClienteListar` e `ccAnexo*` devolvem nada ao Jurídico e a 003 precisa deles |
| C-001-1 | CORRIGIR | `plan.md` §Fluxo passo 2, D-002 | Corrigir a decisão de rodar (cadência real de 20 min) e publicar para as outras rotinas o gatilho "há leitura OK mais nova" em vez de minuto fixo |
| C-001-2 | CORRIGIR | `plan.md` §Contratos `add-006-auditoria` | `ccAuditoriaRegistrarGravar` aceitar lote de campos numa execução (003 P-4) |
| C-001-3 | CORRIGIR | `plan.md` §`add-009-perfil-acesso` | Liberar SFs e tabelas de todos os módulos a partir do mapa completo, com `FORA_DO_PERFIL` somando as SFs em cron das 002, 004, 005 e 006 |
| C-001-4 | CORRIGIR | `plan.md` §Bibliotecas (`dias-uteis.mjs`), D-012 | Exportar `proxUtil` (citado no NC-5 do próprio plan) e dizer quem cria a cópia de tela `frontend/src/lib/dias-uteis.ts`, que 002 e 005 supõem existir |
| C-001-5 | CORRIGIR | `plan.md` §Bibliotecas | Exportar o trecho SQL do valor efetivo do parâmetro e o de "superiores de um membro" (006-7, 004-2) |
| C-001-6 | CORRIGIR | `plan.md` §Bibliotecas (`tempo.mjs`) | Aceitar relógio injetável e ser a única fonte de "hoje" e "agora" para todos os módulos |
| C-001-7 | CORRIGIR | `plan.md` §Modelo de dados (`CC_CLIENTE`) | Guardar `ENDERECO` ou declarar que endereço é só ao vivo (003 P-7) |
| C-001-8 | CORRIGIR | `plan.md` §Simulador (seed) | Publicar a equipe e as faixas de código de cliente como contrato do seed (emenda §7): hoje cada spec redefine a equipe |
| C-001-9 | CORRIGIR | `plan.md` §Modelo de dados (`CC_RECEBIMENTO`), D-005 | Índice (`CLIENTE_ID`, `DATA_PAGAMENTO`) e primeira carga desde janeiro do ano anterior (006-2) |
| C-001-10 | CORRIGIR | `tasks.md` T-002 | Acrescentar à descoberta: upload de arquivo por business, `:VAR_USER` em SF chamada por SF e por cron, JS chamando SQL fora do perfil, `JSON_TABLE` e `ROW_NUMBER` |
| O-001-1 | OBSERVAÇÃO | `spec.md` Anexo A | 17 chaves sem consumidor (§2.4): tirar ou atribuir à spec dona |
| O-001-2 | OBSERVAÇÃO | `plan.md` §`add-005-comunicacao` | `ccContato*` da ficha confunde com `ccContato*` da cobrança; `ccModeloObter` só por `id` (003 quer por código); funções de contato do público (005 P-9) |
| O-001-3 | OBSERVAÇÃO | `plan.md` §Testes C-015 | Assert "114 linhas" quebra quando os outros módulos registrarem chaves |

### 002-cobranca-privada

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-002-1 | BLOQUEIA | `plan.md` §Parâmetros | Trocar as chaves `cob.*` pelos nomes do catálogo (§2.4) e registrar as novas no arquivo de chaves do módulo, sem seed próprio em `add-002-cobranca.mjs` |
| B-002-2 | BLOQUEIA | `plan.md` §Contratos, D-010 | Criar `ccEncargosCalcular(clienteId, data)` no servidor, com a RN-015 título a título (003 P-8) |
| B-002-3 | BLOQUEIA | `plan.md` §Contratos Escrita, D-009; `spec.md` RN-030, RN-024 | Fechar com a 003 um contrato único do envio ao Jurídico: nome, parâmetros (`clienteId`, `processoId`, `obs`), idempotência, alçada por parâmetro, quem dispara (cartão ou envio do dossiê) e uma leitura `ccCobrancaSituacao` |
| B-002-4 | BLOQUEIA | `plan.md` §Contratos Leitura | Renomear `ccPainelKpis/Agentes/Bu/Aging/TopDevedores` para `ccCobrancaPainel*`: `ccPainelAgentes` existe na 006 com outra assinatura |
| B-002-5 | BLOQUEIA | `plan.md` §Modelo de dados (etapas, `CC_COBRANCA`), §Contratos | Decidir e contratar a cobrança pública (005 P-10): `ccCobrancaEtapaAutoGravar`, etapas e checklist públicos, e filtro explícito de setor em quadro, bloqueio, fila e painel — ou declarar que o quadro público não mora em `CC_COBRANCA` |
| C-002-1 | CORRIGIR | `plan.md` §Pedidos 001-F, §Fluxo 10, D-018 | Usar a assinatura real de `ccEmailEnviar` e recontar as execuções do lote (perto de 84 para 20 itens, não 24) |
| C-002-2 | CORRIGIR | `plan.md` §Modelos | Usar os campos do Anexo B da 001 ou declará-los como extras, e entregar os 11 modelos pelo `semearModelos()` |
| C-002-3 | CORRIGIR | `plan.md` §Pedidos 001-A, B, G, H, I, J, K; `tasks.md` T-003 | Nomes reais: `SINCRONIZADO_EM`, `VENCIMENTO`, `DATA_PAGAMENTO`, `ccAuditoriaRegistrarGravar`/`auditar()`, `somarDiasUteis`, `ccParametroValores`, `CTE_VISIBILIDADE`, `PRINCIPAL`; não criar `lib/visibilidade.mjs` |
| C-002-4 | CORRIGIR | `spec.md` RN-028; `plan.md` D-003, `ccReguaParametrosSalvar` | Escolher entre régua estritamente crescente (001 RN-016) e régua reordenável, e deixar um só editor e uma só validação |
| C-002-5 | CORRIGIR | `plan.md` §Contratos Régua (cron) | Disparar por "leitura OK mais nova que a última rodada" em vez de `0 5,20,35,50` |
| C-002-6 | CORRIGIR | `plan.md` §Modelo de dados (`CC_PROMESSA`) | Unificar `VENCIDA` × `QUEBRADA` (arquitetura §4, 006-8) |
| C-002-7 | CORRIGIR | `plan.md` §Contratos Leitura | Criar `ccAgendaResumo(buId, carteira)` (006-9) e dizer como os itens da régua pública entram na agenda (005 P-12) |
| C-002-8 | CORRIGIR | `plan.md` §Complexity Tracking | Registrar que `ccAcordoSituacaoGravar`, `ccBaixaDecisaoGravar` e `ccCobrancaEtapaGravar` chamadas direto pulam alçada e segregação, ou repetir a guarda na SQL |
| C-002-9 | CORRIGIR | `plan.md` §Simulador | Equipe da 001, clientes numa faixa que não colida com a 003 (2001–2005) e relógio injetável no C-011 |
| C-002-10 | CORRIGIR | `plan.md` §Contexto técnico, §Simulador | DDL em `schema/002-cobranca-privada.mjs`, seed e smoke por módulo (execucao regra 2) |
| C-002-11 | CORRIGIR | `plan.md` §Códigos de etapa, RN-026 | D-1 da preventiva e limiares de concentração como parâmetro (`prevAviso2`, `hhiModerado`, `hhiAlto`) |
| O-002-1 | OBSERVAÇÃO | `plan.md` §Pedidos 001-E | `TEXTO_WHATSAPP` está fora (estudo §8.1 item 5) |

### 003-juridico

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-003-1 | BLOQUEIA | `plan.md` §Parâmetros; `tasks.md` T-003 | Trocar as `JUR_*` pela convenção do catálogo; 6 já existem na 001 (`jurEntradaPct`…`notifPrazoDias`), contato é `comEmail`/`comTelefone`, e `JUR_CARGA_CONCLUIDA` é estado, não parâmetro |
| B-003-2 | BLOQUEIA | `spec.md` §Testes C-003, C-018, C-019; `plan.md` §Testes | Recalcular 31.132,08 e 34.461,14 pela regra de encargos que for fechada com a 002 (hoje usam os dias do título mais antigo sobre o total) |
| C-003-1 | CORRIGIR | `plan.md` §Contratos, §Pedidos P-1, 2, 3, 6, 7, 9 | Nomes reais: `ccMembroEu`/`membroDaSessao()`, `ccParametroValores`, `ccDiasUteisSomar`, `auditar()`, `ccModeloObter`/`SITUACAO_VALIDACAO`, `ccClienteTitulos(codcli, 'ABERTOS')`, `ccClienteListar`, e o nome que sair de B-002-3 |
| C-003-2 | CORRIGIR | `plan.md` §Contratos Leitura | Criar `ccJuridicoResumo(buId)` (006-10) e dizer à 006 que ativo é `ETAPA <> 'ENCERRADO'` |
| C-003-3 | CORRIGIR | `plan.md` §Testes RN-025 | Validar o modelo pela regra da 001 (versão e prazo), não por `VALIDADO_EM` preenchido |
| C-003-4 | CORRIGIR | `plan.md` §Simulador | Clientes 1001–1014 e 2001–2005 colidem com 001 e 002; equipe própria (Gabriel, Juliana, Paulo, Alice) e `CC_HOJE` saem em favor do contrato do seed |
| C-003-5 | CORRIGIR | `plan.md` §Complexity Tracking | Registrar o R-002 (gates pulados por SQL direta) |
| C-003-6 | CORRIGIR | `plan.md` §Contexto técnico, §Superfície | `jspdf` e o papel timbrado "da 007" não existem quando a 003 é construída: a 003 introduz a lib de PDF e a 007 reusa |
| C-003-7 | CORRIGIR | `plan.md` §Simulador (Config) | `add-003-tabelas.mjs` → `schema/003-juridico.mjs`; seed e smoke por módulo |
| C-003-8 | CORRIGIR | `plan.md` D-005 | Leituras de alerta e indicador com `hoje` do servidor, não da tela |
| C-003-9 | CORRIGIR | `plan.md` §Pedidos P-11 | Fechar com a 005 o dossiê público (005 P-14): as duas são construídas em paralelo na B3 |
| O-003-1 | OBSERVAÇÃO | `plan.md` §Modelo de dados | `CC_NOTIFICACAO` → `CC_NOTIFICACAO_EXTRAJUDICIAL` |

### 004-concessao-credito

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-004-1 | BLOQUEIA | `plan.md` §Contratos (cabeçalho), D-013, §Modelo de dados, §Rotina | Decidir a esteira pública com a 005: quem cria a solicitação (hoje todas as SFs recusam `PUBLICO`), etapas `PENTRADA/PANALISE/PAPROV`, `RESULTADO='PRE_APROVADA'`, onde fica o P1–P4, e filtro de setor privado na rotina, criticidade, farol e saúde |
| B-004-2 | BLOQUEIA | `plan.md` §Parâmetros | Alinhar 11 chaves ao catálogo (§2.4), registrar as 58 novas, e unificar `saudeRiscoDias` com a 006 |
| C-004-1 | CORRIGIR | `plan.md` §Escritas SQL internas | Tirar as `ccEsc*` de `backend/lib/escritas.mjs` (arquivo da 001) e publicar para a 005 os nomes reais das quatro que ela chama |
| C-004-2 | CORRIGIR | `plan.md` §Complexity Tracking | Registrar ou guardar na SQL: `ccEscDecisaoInserir` e `ccEscCreditoInserir` chamadas direto pulam alçada e segregação |
| C-004-3 | CORRIGIR | `plan.md` §Pedidos 001 itens 1 e 2, D-007 | `COMPRAS_90D` é `COMPRAS_QTD` (janela `comprasJanelaDias`); a lib é `visibilidade.mjs` |
| C-004-4 | CORRIGIR | `plan.md` §Modelo de dados (`CC_SOLICITACAO`), D-014 | A 006 precisa em SQL do prazo do SLA e da data e resultado da decisão |
| C-004-5 | CORRIGIR | `plan.md` §Parâmetros (Alçada pedido); `spec.md` RN-027 | Nível 4 não existe na arquitetura §5; usar uma chave só com a baixa da 002 |
| C-004-6 | CORRIGIR | `plan.md` §Modelo de dados | `CLIENTE_ID` indexado em `CC_SOLICITACAO_HIST`, `CC_SOLICITACAO_CHECK` e `CC_DECISAO` (007 P-9) |
| C-004-7 | CORRIGIR | `plan.md` §Rotina, RN-034 | Alinhar a foto da calibração com a foto da 006 (mesmo gatilho) e o cron com a leitura da 001 |
| C-004-8 | CORRIGIR | `plan.md` §Simulador | Ana e Bruno são `AGENTE` na 001 e `ANALISTA` aqui; `CC_AGORA` passa a ser o relógio único; seed e smoke por módulo |
| O-004-1 | OBSERVAÇÃO | `plan.md` §Parâmetros | `calibMeses` (3) × `calibMinMeses` (12, 001): nomes parecidos, sentidos diferentes |

### 005-setor-publico

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-005-1 | BLOQUEIA | `plan.md` §Parâmetros; `tasks.md` T-003 | `pubAlcadaSupervisor/Gerente` são `alcPub1/alcPub2`; `pequenoValor` já é semeado pela 001; registrar as novas no arquivo de chaves do módulo e ler por `ccParametroValores`, não por `CHAVE LIKE 'pub%'` |
| C-005-1 | CORRIGIR | `plan.md` §Pedidos P-1, 3, 4, 16, 18; lib `publico.mjs` | Nomes reais: `ehDiaUtil`, `somarDiasUteis`, `ccParametroValores`, `ccAuditoriaRegistrarGravar`, `ccEsc*` da 004, e um nome só com a 006 para o resumo das NFs |
| C-005-2 | CORRIGIR | `plan.md` §Contratos (`ccReguaPubEnviar`) | Adaptar à assinatura final de `ccEmailEnviar` (B-001-2) |
| C-005-3 | CORRIGIR | `plan.md` §Testes "Dependência" | Tirar os stubs das 001, 002 e 004 no smoke: a 005 é construída depois delas, e a 006 (D-008) proíbe dublê |
| C-005-4 | CORRIGIR | `plan.md` §Testes C-012 | `CC_CREDITO.RATING` não existe (004: `RATING_CONCESSAO`) |
| C-005-5 | CORRIGIR | `plan.md` §Fluxo 3, §Contratos (`ccNfPubSincronizar`) | Contar execuções por ciclo (grava por SF SQL por NF e por órgão) e alinhar o gatilho com a leitura da 001 |
| C-005-6 | CORRIGIR | `plan.md` §Complexity Tracking | Registrar ou guardar: `ccOrgaoAnaliseInserir`, `ccNfPubDatasGravar`, `ccRegraEnteAtualizar` chamadas direto |
| C-005-7 | CORRIGIR | `plan.md` §Simulador | Equipe própria (Carla, Diego, Elisa, Helena…) e `CC_HOJE` saem; DDL em `schema/005-setor-publico.mjs` |
| C-005-8 | CORRIGIR | `plan.md` D-001 | Situação da NF com `hoje` do servidor |
| O-005-1 | OBSERVAÇÃO | `plan.md` §Superfície | `frontend/src/lib/publico.js` → `.ts` no padrão do módulo |

### 006-painel-consolidado

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-006-1 | BLOQUEIA | `plan.md` §Constitution Check II, §Simulador (Parâmetros), §Pedidos 001 | Registrar `hhiModerado`, `hhiAlto`, `painelSincAtrasoMin`, `saudeUsoAtencao` e unificar `saudeDiasRisco` com `saudeRiscoDias` da 004 |
| C-006-1 | CORRIGIR | `plan.md` §Regras transversais (Visibilidade), D-006 | Usar o fragmento único da 001 em vez de joins fixos; a premissa sobre `:VAR_USER` não se sustenta (p-57803) e o analista não pode sumir (001 RN-012) |
| C-006-2 | CORRIGIR | `spec.md` RN-017; `plan.md` §Regras transversais (Carteira), §Simulador (BUs) | Carteira Público pelo setor do cliente (001 RN-018), não pela BU "Governo" |
| C-006-3 | CORRIGIR | `plan.md` §Leituras de outras specs, §Contratos | Nomes reais: `PLANO_COD`, `CC_PROMESSA.SITUACAO`, `ETAPA <> 'ENCERRADO'`, `RATING_PUB`, rating e criticidade em `CC_RISCO_CLIENTE`; filtrar `ESTORNADO = FALSE`; nomes finais das três SFs-resumo |
| C-006-4 | CORRIGIR | `plan.md` §Contratos (`ccPainelSaude`); `spec.md` RN-012 | Dizer se a saúde do painel é a mesma da 004 (ler `CC_RISCO_CLIENTE.SAUDE`) ou outra regra com outro nome |
| C-006-5 | CORRIGIR | `plan.md` §Contexto técnico, §Superfície | DDL em `schema/006-painel-consolidado.mjs` (não em `setup-backend.mjs`); telas em `src/modules/006-…` |
| C-006-6 | CORRIGIR | `plan.md` §Contratos (`ccPainelPosicao`) | Definir as faixas de aging do cliente público (depende de B-001-4) |
| O-006-1 | OBSERVAÇÃO | `plan.md` §Testes C-020 | `P3` e AA–E na mesma dimensão `RATING`: separar em duas |

### 007-historico-apoio

| # | Sev. | Arquivo · seção | O que mudar |
|---|---|---|---|
| B-007-1 | BLOQUEIA | `plan.md` §Contratos; `tasks.md` T-009, T-010 | `ccFonteSalvar`, `ccFonteRevisar` e `ccMaterialSalvar` são JAVASCRIPT sem SF SQL de gravação e business não grava por JS: acrescentar as SQL de gravação com guarda de Administrador e Jurídico |
| C-007-1 | CORRIGIR | `plan.md` §Pedidos P-1, P-2, P-5; `ccRegrasVigentes` | `ccParametroListar` da 001 já devolve tudo o que as "regras em vigor" mostram; usar `ccAuditoriaRegistrarGravar` e `ccMembroVisiveis` |
| C-007-2 | CORRIGIR | `plan.md` §Contratos | Listagens de fontes e material em SQL com `…Total` (arquitetura §2) |
| C-007-3 | CORRIGIR | `plan.md` §Modelo de dados | `ATUALIZADO_POR`/`REVISADO_POR` com `CC_MEMBRO.ID`, como as outras specs |
| C-007-4 | CORRIGIR | `plan.md` §Mapa de fontes, §Testes RN-008 | `CC_AUDITORIA` filtra por `AREA = 'Contatos'`, o autor é `POR`, e a área `HISTORICO` entra no registro de áreas |
| C-007-5 | CORRIGIR | `plan.md` D-009, D-010 | Alinhar com a regra única de visibilidade do Jurídico (§4.4) e com quem vê auditoria |
| C-007-6 | CORRIGIR | `plan.md` §Mapa de fontes, §Pedidos P-9 | Crédito: histórico por `ENTIDADE`+`ENTIDADE_ID`; rating e score de `CC_RISCO_CLIENTE`; fonte pagadora de `CC_SOLICITACAO.FP_NOME` |
| C-007-7 | CORRIGIR | `plan.md` §Simulador | Clientes 1001–1004 colidem com a 001; equipe da 001; seed e smoke por módulo |
| O-007-1 | OBSERVAÇÃO | `plan.md` §Superfície | `frontend/src/lib/historico.js` → `.ts`; a lib de PDF nasce na 003 (C-003-6) |

---

## 7. Emenda proposta à `arquitetura.md` (1.0.0 → 1.1.0)

### §4 — Tabelas por dono (lista atualizada)

| Dono | Tabelas |
|---|---|
| 001-base | `CC_CLIENTE` (+ `CONTATOS_REVISADO_EM/POR`), `CC_POSICAO_CLIENTE` (+ faixas, `VENCIDO_VALOR_DIAS`, pontualidade, compra média, prazo médio, `ALTERADO_EM`), `CC_RECEBIMENTO`, `CC_SINCRONIZACAO`, `CC_BU`, `CC_MEMBRO`, `CC_PARAMETRO`, **`CC_PARAMETRO_DEF`**, `CC_FERIADO`, `CC_CONTATO_CLIENTE`, `CC_MODELO_MENSAGEM`, `CC_EMAIL_ENVIADO`, `CC_ANEXO`, `CC_AUDITORIA`, **`CC_FATURAMENTO_MES`** |
| 002-cobranca-privada | `CC_COBRANCA` (inclui bloqueio devido/aplicado e encaminhamento ao Jurídico), `CC_COBRANCA_HIST`, `CC_ACAO_REGUA`, `CC_CONTATO_COBRANCA`, `CC_PROMESSA`, `CC_ACORDO`, `CC_ACORDO_PARCELA`, `CC_BAIXA`, `CC_EMAIL_FILA` |
| 003-juridico | `CC_PROCESSO`, `CC_PROCESSO_ANDAMENTO`, `CC_PROCESSO_CUSTO`, `CC_DOSSIE_ITEM`, `CC_ACORDO_JUDICIAL`, `CC_ACORDO_JUDICIAL_PARCELA`, **`CC_NOTIFICACAO_EXTRAJUDICIAL`**, **`CC_FILIAL_CREDORA`** |
| 004-concessao-credito | `CC_SOLICITACAO`, `CC_SOLICITACAO_HIST`, `CC_SOLICITACAO_CHECK`, `CC_DECISAO` (as três servem solicitação e pedido, por `ENTIDADE`), `CC_CREDITO`, `CC_PEDIDO_RETIDO`, `CC_CALIBRACAO`, **`CC_RISCO_CLIENTE`**, **`CC_PENDENCIA_WINTHOR`**, **`CC_CALIBRACAO_REVISAO`** |
| 005-setor-publico | `CC_ANALISE_ORGAO`, `CC_NF_PUBLICA`, `CC_NF_ACAO`, `CC_REGRA_PAGAMENTO_ENTE`, `CC_CERTIDAO` |
| 006-painel-consolidado | `CC_FOTO_AGING` (uma linha por cliente e mês, faixas em colunas), `CC_FECHAMENTO` |
| 007-historico-apoio | `CC_FONTE_LINK`, `CC_MATERIAL` |

Não criar `CC_PLANO` (plano fica em `CC_CLIENTE`; lista completa ao vivo).

### §2 — Convenções que faltaram

1. **Parâmetros.** Chave em camelCase, sem ponto e sem CAIXA_ALTA, com prefixo curto do
   módulo só quando a chave nasce fora da 001 (`jur…`, `pub…`, `cred…`). Cada módulo declara
   as suas em `backend/lib/parametros/NNN-<slug>.mjs` (chave, grupo, rótulo, tipo, unidade,
   padrão, mín, máx, por segmento); o setup funde tudo em `CC_PARAMETRO_DEF`. Ninguém insere
   em `CC_PARAMETRO` por fora. Uma regra, uma chave: antes de criar, procurar no Anexo A da
   001. Leitura por `ccParametroValores`; edição por `ccParametroSalvar`, com validação
   cruzada declarada pelo módulo dono da chave.
2. **Arquivos por módulo** (execucao regra 2 vira norma): `backend/add-NNN-<parte>.mjs` com
   NNN = número da spec; DDL em `backend/schema/NNN-<slug>.mjs`; libs em
   `backend/lib/<slug>/`; `simulator/seed/NNN-<slug>.mjs`; `simulator/smoke/NNN-<slug>.mjs`;
   frontend em `src/modules/NNN-<slug>/`, `src/lib/<slug>/` (TypeScript),
   `tests/NNN-<slug>.test.mjs`. `backend/lib/escritas.mjs`, `visibilidade.mjs`, `tempo.mjs`
   e `dias-uteis.mjs` são da 001 e só ela os edita.
3. **Nomes de SF.** `cc` + Domínio + Ação; o domínio é único no projeto e tem dono
   (registrar: `Painel` é da 006; a visão gerencial da 002 é `CobrancaPainel`). Listagem
   `…Listar` + `…Total`. SQL de gravação interna termina em `…Gravar` e repete a guarda de
   quem pode (cargo, nível e, quando há, "diferente de quem propôs"); o que não couber na
   SQL vai para o Complexity Tracking do plan.
4. **Tempo.** `backend/lib/tempo.mjs` (001) é a única fonte de "hoje" e "agora" (Brasília),
   com relógio injetável por `CC_AGORA` só no simulador. SF não recebe `hoje` da tela.
5. **Rotinas.** A leitura do Winthor é a única rotina por relógio. As demais (régua, rotina
   de crédito, NF pública, foto) rodam em cron curto e decidem por "existe leitura OK mais
   nova que a minha última rodada" (`CC_SINCRONIZACAO.ID`). Toda SF em cron entra em
   `FORA_DO_PERFIL`.
6. **Visibilidade.** Um fragmento (`CTE_VISIBILIDADE` + `clienteVisivel()`), com as regras:
   agente e analista pelo `AGENTE_ID`/`ANALISTA_ID`; supervisor pela equipe; gerente,
   diretoria e administrador, tudo; Jurídico lê os clientes encaminhados ao Jurídico e todo
   o módulo Jurídico. Nenhuma spec reimplementa.
7. **Segmento do cliente.** Vale a RN-018 da 001 (setor público prevalece sobre a BU).
   `CC_BU.SEGMENTO` fica com `PRIVADO` e `ESTETICA`.
8. **Seed.** A equipe é a do seed da 001 (Diana, Gustavo, Sérgio, Silvia, Ana, Bruno,
   Carlos, Júlia, Nara, Otávio) e cada módulo acrescenta só quem falta (ex.: um analista).
   Códigos de cliente por faixa: 001 = 1xxx, 002 = 2xxx, 003 = 3xxx, 004 = 4xxx, 005 = 5xxx,
   006 = 6xxx, 007 = 7xxx. O smoke de um módulo parte do seed da 001 + o dele.
9. **Registros de domínio** (uma tabela no documento, um dono por valor):
   `CC_ANEXO.ENTIDADE` (`CLIENTE`, `COBRANCA`, `DOSSIE_ITEM`, `PROCESSO_CUSTO`, `SOLICITACAO`,
   `ANALISE_ORGAO`, `CERTIDAO`, `MATERIAL`), `CC_AUDITORIA.AREA`, `CC_EMAIL_ENVIADO.ORIGEM`,
   prefixo de `CC_MODELO_MENSAGEM.CODIGO` (`COB_`, `JUR_`, `PUB_`) e os campos comuns do
   Anexo B da 001.
10. **Autor.** Coluna de autor guarda `CC_MEMBRO.ID` (nulo = rotina).

### §5 — Perfis

- Nível 4 não tem cargo. Ou entra o cargo "Diretor financeiro" (nível 4), ou as faixas que o
  citam (baixa de R$ 10 mil a R$ 100 mil; pedido com excesso de até 50%) exigem nível 5.
- "Perfil Mitra" é perfil de negócio (cargo + `ADMIN`); na plataforma há um perfil técnico só.

### §6 — Pendências novas

| # | Pendência | Afeta |
|---|---|---|
| P-07 | Envio ao Jurídico: o gerente encaminha e o dossiê vem depois, ou o dossiê completo é a condição do envio? | 002, 003 |
| P-08 | Encargos: título a título ou pelos dias do título mais antigo? | 002, 003 |
| P-09 | Posição do órgão público: vencimento do título ou "pagar até" legal da NF? | 001, 005, 006 |
| P-10 | Aging e PDD por título ou por cliente (NC-1 da 006) | 001, 002, 006 |
| P-11 | Quem valida modelo com efeito legal, e se pode enviar antes (NC-9 da 001; P-06) | 001, 002, 003, 005 |
| P-12 | Faixa "Diretor financeiro" (nível 4) | 002, 004 |
| P-13 | Tela de planos de pagamento: quem é o dono | 001, 004 |
