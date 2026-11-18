# Pedidos ao arquiteto — 007-historico-apoio

Replanejamento da 007 contra o contrato (14/11/2026). Cada ponto traz onde está, o que falta ou
contradiz e a proposta. O `plan.md` da 007 segue com a proposta, marcada "pendente do arquiteto".
Nada do contrato foi alterado.

## A. Contradições e lacunas que mudam nome, entrada, saída ou guarda

| # | Ponto | Onde | Proposta |
|---|---|---|---|
| PA-01 | **Registro agendado não tem marca na saída.** A spec pede os futuros no topo, marcados "agendado" (RF-003, C-001), e a tela não pode comparar com "hoje" (06 §1: "a tela nunca envia hoje; data relativa vem da SF") | 04 §7 `ccHistEventoListar`, `ccHistExportar` | saída ganha `AGENDADO` (0/1), calculado na SQL com `HOJE_SQL`. A ordem passa a ser: agendados em data crescente, depois passados em data decrescente |
| PA-02 | **Mapa de fontes incompleto para o que a spec pede.** (a) "Próxima ação agendada" (RF-003) mora em `CC_COBRANCA.PROX_ACAO`/`PROX_ACAO_DATA`, e `CC_COBRANCA` não está na categoria Cobrança (02 já diz "Lê: 007"). (b) Mudança de fase do processo fica só em `KB_MOVIMENTO` do quadro `juridico` (02 `CC_PROCESSO_ANDAMENTO`: "mudança de fase não vira andamento"), e o mapa só cita `KB_MOVIMENTO` dos quadros de cobrança e de concessão: a etapa do processo sumiria do histórico. (c) `pedidos-limite` não é "quadro de concessão" ao pé da letra | 04 §7 (mapa) | Cobrança ← … + `CC_COBRANCA` (só a próxima ação de caso aberto com data ≥ hoje, como agendado). Jurídico ← … + `KB_MOVIMENTO` do quadro `juridico`. Crédito ← … + `KB_MOVIMENTO` de `pedidos-limite`. Comunicação ← `KB_LOG` só com `EVENTO = 'nota'`, dos cards do cliente nos 8 quadros |
| PA-03 | **`categoria` de um valor só.** A tela escolhida (`historico-cliente` C, "Por assunto, em abas") tem abas que somam categorias ("Cobrança e acordos" = Cobrança + Acordos e baixas + Recebimentos) | 04 §7 `ccHistEventoListar`, `ccHistExportar` | `categoria` aceita uma ou mais categorias separadas por vírgula (`FIND_IN_SET`; nenhum nome de categoria tem vírgula). `''` continua "todas as visíveis" |
| PA-04 | **`busca` em evento não tem como ser normalizada.** 04 §0 dá `busca` a toda listagem; 06 §5 exige coluna normalizada; evento é derivado (não há coluna) e a tela escolhida não busca dentro dos registros | 04 §0 × 06 §5 | `ccHistEventoListar` não tem `busca` |
| PA-05 | **`CC_FONTE_LINK` sem coluna de busca.** `ccHistFonteListar` é L+T (tem `busca`), a tela escolhida (`fontes-links` A) tem o campo, e a tabela não tem a coluna normalizada que `CC_MATERIAL` tem | 02 `CC_FONTE_LINK` × 06 §5 | coluna `BUSCA V(900) N ''` = título + responsável + uso sem acento, mantida por `ccHistFonteSalvar` (igual a `CC_MATERIAL.BUSCA`) |
| PA-06 | **Nome das gêmeas.** A regra é trocar `Listar` por `Total`, mas `ccHistClienteBuscar` não tem `Listar` no nome | 04 §7, 01 §1 | `ccHistClienteBuscarTotal`, `ccHistEventoTotal`, `ccHistFonteTotal`, `ccHistMaterialTotal` |
| PA-07 | **`N2`/`N3` e o Administrador.** Mesmo ponto do PA-01 (b) da 001: Nara é Agente (nível 1) + `ADMIN`. A spec da 007 sempre disse que o Administrador mantém fontes e material e vê tudo | 04 §7 (`ccHistFonteSalvar`, `ccHistMaterialSalvar`, `ccHistFonteRevisar`, categoria `Alteração auditada` só N2), 01 §7 | sigo a proposta da 001: "nível ≥ N **ou** `ADMIN`", pelo fragmento único de `guarda.mjs`. Para a 007: salvar fonte e material = nível ≥ 3 ou `ADMIN`; revisar fonte = cargo `JURIDICO`, nível ≥ 3 ou `ADMIN`; ver `Alteração auditada` = nível ≥ 2 ou `ADMIN`. A guarda de `CC_ANEXO` `MATERIAL` segue o PA-11 da 001 |
| PA-08 | **Jurídico: seis ou sete categorias.** 04 §7 diz "Jurídico vê as seis primeiras" (fica sem Recebimentos e sem Alteração auditada); 00 P-27 e 01 §7 só tiram a auditoria. E `ccBaseRecebimentoListar` (T) já mostra os pagamentos ao Jurídico para o mesmo cliente | 04 §7 × 00 §4 P-27 | vale P-27: o Jurídico vê tudo menos `Alteração auditada`, só de cliente com `NO_JURIDICO`. Não precisa de regra própria: o Jurídico tem nível 0 e cai fora pela regra "nível ≥ 2 ou `ADMIN`" |
| PA-09 | **`ccHistExportar` é `JS-L` mas grava.** A spec pede o rastro de cada emissão (RF-011, RN-008) e 01 §7 já reservou a área `Histórico` para a 007 | 04 §7 | `ccHistExportar` grava 1 linha por emissão: `auditar('Histórico', 'CLIENTE', clienteId, clienteId, [{ campo: '(emissão)', depois: categorias, período e quantidade }])`. Custo 2 execuções. Continua sem `ccEsc…` própria (a escrita é a da auditoria) |
| PA-10 | **`ccHistRegrasVigentes` chama `ccBaseParametroListar` aninhada, sem sessão.** Se a leitura da 001 juntar o fragmento `EU` (é `T`), devolve zero linha quando chamada por outra SF | 04 §7 ("Lê: `ccBaseParametroListar`") × 01 §4 | `ccBaseParametroListar` não depende de sessão (parâmetro não é dado de cliente), ou aceita `membroId`. Preciso também saber de que valor é a `VIGENCIA_INICIO` devolvida: proponho "do valor efetivo da carteira pedida". Se a resposta for "exige sessão": a tela chama `ccBaseParametroListar` direto (3 chamadas) e `ccHistRegrasVigentes` fica só com as etapas dos quadros |
| PA-11 | **Etapas e prazos saíram do catálogo de parâmetros** (03 §17: SLA virou `KB_FASE.SLA_HORAS`), e a consulta de regras do artefato mostrava os prazos de etapa | 04 §7 `ccHistRegrasVigentes` (saída) | a saída ganha `quadros[]`: por quadro, as fases de `CC_FASE` + `KB_FASE` (`chave`, `nome`, `slaHoras`, `final`, na ordem). Só leitura das tabelas que 02 já lista como lidas pelo domínio |
| PA-12 | **Rótulo do grupo de parâmetros.** `CC_PARAMETRO_DEF.GRUPO` é o código (`regua`, `enc`…); a tela escolhida (`regras-vigor` B) tem uma aba por grupo, com nome. A tela de parâmetros da 001 precisa do mesmo nome | 02 `CC_PARAMETRO_DEF`, 04 §1 `ccBaseParametroListar` | a 001 exporta a lista de grupos (código, nome, ordem) em `frontend/src/lib/base/` e a 007 importa. Sem resposta, a 007 mostra o código do grupo com a primeira letra maiúscula |
| PA-13 | **Hora da lib em UTC.** `KB_MOVIMENTO.QUANDO` e `KB_LOG.QUANDO` entram na mesma lista ordenada que as datas `CC_` em hora de Brasília (05 §1 regra 11 manda converter) | 01 §3, 05 §1 | a 001 exporta em `lib/tempo.mjs` o fragmento `KB_BRASILIA('<coluna>')` (o mesmo que 002 e 004 usam em `FASE_DESDE`), devolvendo `AAAA-MM-DDTHH:MM:SS`. Sem resposta, a 007 escreve o `CONVERT_TZ` no próprio fragmento |
| PA-14 | **`ccJurProcessoCriar` e `NO_JURIDICO`.** A linha da SF só lista `CC_PROCESSO` em "Escreve"; pela definição da coluna ("tem processo ativo"), criar processo com `clienteId` tem de marcar o cliente. O cliente 7003 do elenco ("com processo, visão do Jurídico") depende disso | 04 §3 × 02 `CC_CLIENTE.NO_JURIDICO` | `ccJurProcessoCriar` com `clienteId > 0` chama `ccEscBaseClienteJuridico` |
| PA-19 | **Resumo de 12 campos × saída de `ccHistResumo`.** As chaves listadas não cobrem os campos 10 a 12 do resumo (recuperado; contatos e promessas; documentos) nem a etapa de crédito de quem só tem solicitação | 04 §7 `ccHistResumo` | a saída ganha `recuperado` (Σ `VALOR_PAGO` com `DIAS_ATRASO_PAGAMENTO > 0`, sem estornados; `null` sem pagamento), `contatos`, `promessasAbertas`, `documentos` (`CC_ANEXO` do cliente + `KB_ANEXO` dos cards dele) e `total`; `credito` traz a etapa (fase do card da solicitação mais recente) mesmo sem crédito vigente |

## B. Seed e testes

| # | Ponto | Onde | Proposta |
|---|---|---|---|
| PA-15 | **7002 "nenhum evento" precisa existir.** Cliente sem título fica fora do universo da leitura (01 §11) e nem entra em `CC_CLIENTE` | 06 §2.5 | o seed da 007 dá ao 7002 um título de 4.000 a vencer em `dia(60)` (entra na leitura, não abre cobrança, não gera evento). 7001 e 7003 ficam como no plano da 007 (§Simulador) |
| PA-16 | **Quem grava a atribuição 7001–7003 → Ana.** `CC_CLIENTE.AGENTE_ID` é da 001 e o cliente só nasce na primeira leitura | 06 §2.5 ("Atribuição") | o elenco (integrador) atribui depois da primeira leitura; o smoke da 007 confere e, se estiver vazio, atribui por `ccBaseClienteAtribuir` como Gustavo |
| PA-17 | **"Eventos em todas as categorias" para 7001.** 7001 é cliente privado: não tem nota fiscal de órgão nem, sem atravessar a esteira inteira, crédito aprovado ou processo. E o seed não pode gravar tabela de outra dona (06 §2.3 c) | 06 §2.5 | a história de 7001 é montada no smoke pelas SFs das donas (contatos, promessa, acordo, e-mail, solicitação, pedido); processo fica no 7003 (`ccJurProcessoCriar`) e Setor público é afirmado no 5002 da 005. O smoke da 007 declara os seeds `001` e `005` |
| PA-18 | **A 007 não tem parâmetro, modelo de mensagem nem quadro.** Não entrega `lib/parametros/007`, `lib/modelos/007` nem `lib/quadros/007` | 01 §9, §13, §14 | o `setup-backend.mjs` e a 001 aceitam a ausência dos três arquivos (senão a 007 entrega os três com lista vazia) |

## C. Pendências do gestor sem número no índice

| Ponto | Padrão adotado na spec |
|---|---|
| Quem fornece os endereços oficiais das 41 fontes e a arte do papel timbrado | fonte sem endereço conhecido entra "sem link"; o documento sai com o logo e o cabeçalho do design system até a arte chegar |
| Quem fornece os arquivos do material de apoio | os 7 itens da carga inicial entram como "Arquivo pendente" |

Peço dois números no índice (P-31, P-32) para a spec citar.

## D. Para registro (leituras que adotei; a spec foi corrigida)

| Ponto | O que mudou |
|---|---|
| Categorias: a spec tinha 14 (do artefato); o contrato fecha 8 | RN-004 reescrita; ficha de contatos e anexo do cliente aparecem em `Alteração auditada` (áreas `Contatos` e `Anexos`), visível só a Supervisor ou acima |
| Quem mantém fontes e material: a spec dizia só Administrador; o contrato diz N3 | RN-009, C-011, C-012: Gerente, Diretoria e Administrador |
| "Segmento geral × privado": pelo D-05 o padrão é o valor da Privada | C-017, RN-014 reescritos em carteiras; a tela `regras-vigor` B fica com três colunas (Privada, Estética, Pública) em vez de quatro |
| "Tabelas de alçada" na saída de `ccHistRegrasVigentes`: li como o grupo `alcada.*` com os rótulos do catálogo. A 007 não remonta a combinação das chaves (isso é código da 002 e da 004) | sem mudança de contrato |
| "Observações" no documento do histórico: `CC_CLIENTE` não tem observação; o documento traz a `OBS` de cada contato da ficha | C-007, RF-008 |
| Documento do histórico gerado pela impressão do navegador (sem biblioteca de PDF): saem a troca de caracteres para Latin-1 e o botão que baixa direto | C-008, RF-009 e RN-007 removidos; C-007 e C-009 reescritos |
| Sem acesso = "Cliente não encontrado." (01 §8), não "acesso negado" | C-004, RN-002 |
| 02 marca "Lê: 007" em `CC_POSICAO_CLIENTE_BU`, `CC_DOSSIE_ITEM`, `CC_PROCESSO_CUSTO` e `CC_REGRA_PAGAMENTO_ENTE`; o mapa de 04 §7 não as usa e a 007 não as lê | sem ação |
