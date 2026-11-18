# Levantamento js-B.js (linhas 1046-1933 do JS) — Painel de Crédito e Cobrança

Convenções: `hoje` = `hojeISO()` (AAAA-MM-DD local). `p` = documento da coleção `propostas` (cliente/proposta). `n` = nota fiscal (item de `p.nfs[]`). "Corridos" = `addDias`. Funções usadas e **não definidas neste arquivo** estão listadas na seção 7.6 (precisam ser lidas em outro trecho).

O arquivo contém, além das 15 seções pedidas, o final do **renderConsol** (KPIs executivos), **renderCobHist** (histórico de contatos) e **renderCobGer** (indicadores gerenciais de cobrança, PDD, roll rate, acordos/baixas, concentração). Estão documentados na seção 8.

---

## 1. Entidades e campos

### 1.1 `propostas` (cliente/proposta) — campos tocados neste trecho

| Campo | Tipo inferido | Significado | L/E aqui |
|---|---|---|---|
| id | string | id do doc | L |
| cliente | string | razão social/nome | L |
| documento | string | CNPJ/CPF (comparado só com dígitos) | L |
| bu | string | Business Unit | L |
| grupo | string | grupo econômico | L |
| uf | string(2) | UF | L |
| esfera | "Federal"/"Estadual"/"Municipal" | esfera do órgão (público) | L |
| rating | "AA".."H" ou "" | classe de risco | L |
| analista | string | agente/analista | L |
| cobResp | string | agente de cobrança responsável | L |
| setor (via `setorP(p)`) | "privado"/"estetica"/"publico" | segmento (função externa) | L |
| valorAtraso | number | saldo vencido atual | **E** (import, normPub) |
| diasAtraso | int | maior atraso em dias corridos | **E** |
| saldoAVencer | number | saldo a vencer | **E** |
| proxVenc | AAAA-MM-DD | próximo vencimento | **E** |
| proxVencValor | number | valor do próximo vencimento | **E** |
| utilizado | number | exposição = atraso + a vencer | **E** |
| winEm | ISO datetime | última importação Winthor aplicada ao cliente | **E** |
| valorRecuperado | number | acumulado recuperado | **E** (soma recebimentos importados se `naCobranca(p)`; e NF paga em atraso) |
| valorBaixado | number | acumulado baixado como perda | L |
| cobRecLog | [{v,em,origem}] (máx 60) | log de recebimentos; origem "Winthor" ou "NF xxx" | **E** |
| winRec | [string] (máx 400) | chaves de recebimentos já importados (dedupe) | **E** |
| winFatK | [string] (máx 3000) | chaves de faturamento já importados (dedupe) | **E** |
| fatMes | {"AAAA-MM": number} | faturamento por mês de emissão | **E** |
| rca | string | RCA/executivo comercial | **E** |
| planoPag | string (id de plano) | plano de pagamento vinculado | **E** |
| prazoMedio | number/string (dias) | prazo médio do plano | **E** |
| titVenc | [{tit,venc,emi,valor}] (máx 150) | títulos vencidos em aberto (privado) | **E** |
| nfs | [NF] | notas fiscais do órgão público | **E** |
| _nfEtapa | "", nfprot, nfliq, nfpag, negociacao, acordo | etapa derivada (calculada por `normPub`; transitória, prefixo `_`) | **E** (dúvida: persiste?) |
| agLog | [{k,t,prazo,em,resp,v}] (máx 200) | log de ações da agenda concluídas | **E** |
| cobContatos | [Contato] | histórico de contatos de cobrança | L |
| cobParcelas | [{n,valor,venc,pago,pagoEm}] | parcelas do acordo | L |
| cobProxAcao / cobProxData | string / data | próxima ação agendada | L |
| cobHist | [{etapa,em,...}] | histórico de etapas de cobrança | L |
| cobEtapa | string | etapa de cobrança gravada | L |
| cobCheck | {etapaPrev:{0:bool,...}} | checklist da preventiva | L |
| cobBaixa | {status:"pendente",valor,motivo,prop} | baixa como perda pendente | L |
| cobBaixasLog | [{status:"aprovada",...}] | | L |
| pontualidade | number 0-100 | % recebido no prazo | L |
| prazoMedio | number | PMR | L |
| pRegraPag | string | id da regra de pagamento do órgão escolhida na análise | L |
| pEstimado / valor | number | valor estimado da contratação (pequeno valor) | L |
| pPrazoPag | int (dias corridos) | prazo de pagamento fixado no contrato | L |
| pContrato / pEdital | string | nº contrato/ata/edital | L |
| pubDocs | {nf,ne,liq,op,fila} | formato antigo de nota única | L (migração) |
| empenho | string | nº empenho | L |
| comitePlano / libPlano | string | plano aprovado (texto livre, ex. "28/35 dias") | L |
| exemplo | bool | registro de exemplo (não é zerado) | L |
| etapa (via `etapaOf`) | recusada, gestao, reanalise, obsoleto + ativas | etapa na esteira de crédito | L |

### 1.2 Nota fiscal pública (`p.nfs[i]`)

| Campo | Tipo | Significado |
|---|---|---|
| nf | string | nº da NF (match com título Winthor pela parte antes de `-` ou `/`, só dígitos) |
| ne | string | nº do empenho |
| valor | number | valor da NF |
| emissao | data | emissão |
| protocolo | data | protocolo no órgão (marco inicial do prazo de liquidação) |
| atesto | data | atesto do fiscal |
| liq | data | liquidação |
| op | data | ordem de pagamento emitida |
| pago | data | pagamento (se preenchida a NF é "paga") |
| fila | string/num | posição na ordem cronológica |
| regua | {idPasso: dataFeito} | ações da régua marcadas como feitas (ex. `{"L1":"2026-11-03"}`) |
| vencWinthor | data | vencimento do título no Winthor (só informativo; NFs criadas pela importação) |
| origem | "Winthor" / "migrado" | |
| em | ISO datetime | criação |

### 1.3 Contato de cobrança (`cobContatos[i]`) — lido
`data` (ou `em`) data; `canal` (CANAIS); `pessoa`; `retorno` (RETORNOS); `previsao` (data prometida); `valor` (prometido); `feedback` texto; `resp` agente.

### 1.4 Plano de pagamento (item de `config/planos.lista`)
`{id, cod, nome, dias:"28/35/42", uso:"Privado"|"Público"|"Ambos", obs, erp?:true}`.

### 1.5 Regra de pagamento do ente (`REGRAS_PAG` item)
`{id, nome, esfera:""|Federal|Estadual|Municipal, uf, liq:int, pag:int, un:"úteis"|"corridos", base:texto, link:url, st:"Verificado"|"A confirmar"}`.

### 1.6 Feriado local: `{d:"AAAA-MM-DD", n:"nome"}`.

### 1.7 Auditoria: `{em:ISO, area, ref, mud:[{c,a,d}] (máx 40), uid, quem}`.

### 1.8 Log de importação: `{em:ISO, arquivo, linhas, clientes, naoCad, recebido, zerados, quem}`.

### 1.9 REGRAS (parâmetros, lidos; coleção/doc definido fora)
`metaConv` (%), `metaProm` (%), `metaInad` (%), `prazoAlerta`, `prazoCrit` (dias), `pequenoValor` (R$), `rpConf, rpL1, rpL2, rpL3, rpG1, rpG2, rpG3, rpG4, rpG5` (dias úteis da régua pública), `PDD_KEYS[i]` (% de provisão por faixa).

---

## 2. Formato das importações

### 2.1 Importação de títulos Winthor (`#impArq`)

**Arquivos aceitos**: `.csv`/`.txt` ou planilha (qualquer outra extensão → XLSX via SheetJS 0.18.5 carregado de cdnjs; usa **apenas a 1ª aba**, `defval:""`, `cellDates:true`).

**Parse CSV** (`lerTabelaArquivo` e `impLer` têm código duplicado idêntico):
1. Lê como UTF-8; se contém U+FFFD, relê como `windows-1252`.
2. Remove BOM; quebra em `\r?\n`; descarta linhas em branco.
3. Separador: `;` se a 1ª linha tiver `;` >= nº de `,`; senão `,`.
4. Parser com aspas (`"` e `""` escape), trim em cada célula.
5. 1ª linha = cabeçalho; cada linha vira objeto `{cabeçalho:valor}`; células faltantes = "".
6. Arquivo sem linhas → mensagem "arquivo sem linhas". Erro → "Salve como CSV (ponto e vírgula) ou .xlsx".

**Campos e auto-mapeamento** (`IMP_CAMPOS`, ordem importa: cada coluna só pode ser atribuída a um campo; `IMP.cols.find(c=>regex.test(c) && !jáUsada)`). O usuário pode corrigir cada mapeamento em selects.

| chave | Rótulo | Regex (i) | Obrig. |
|---|---|---|---|
| cnpj | CNPJ/CPF do cliente | `cnpj\|cgc\|cpf\|documento` | **sim** |
| cliente | Nome do cliente | `^(cliente\|raz\|nome\|fantasia)` | não |
| titulo | Nº do título | `t[ií]tulo\|duplic\|n[ºo°]?\s*doc\|prest` | não |
| venc | Vencimento | `venc` | **sim** |
| valor | Valor do título | `^valor(?!.*pag)\|vl.?tit\|valor.?orig\|valor$` | **sim** |
| pagto | Data do pagamento | `pag(amento\|to)?.*(data\|dt)\|(data\|dt).*pag\|baixa` | não |
| pago | Valor pago | `(valor\|vl).*pag\|pago` | não |
| emissao | Emissão (faturamento) | `emiss` | não |
| plano | Código do plano de pagamento | `plano\|codplpag` | não |
| rca | RCA · executivo comercial | `rca\|codusur\|vendedor\|representante\|executivo` | não |

Nomes alternativos aceitos = os das regex acima. Atenção a colisões (ex.: coluna "Nº Documento" casa com `cnpj` por "documento" antes de `titulo`; "Data pagamento" pode casar `pago` se `pagto` não pegou antes — a ordem dos campos evita; "Vl. pago" casa com `pago`).

**Modelo CSV** (`impModelo`): cabeçalho `CNPJ;Cliente;Titulo;Emissao;Vencimento;Valor;Data pagamento;Valor pago`; 3 linhas de exemplo (datas dd/mm/aaaa, valor `15.000,00`, BOM UTF-8, CRLF). Existem outros modelos estáticos em `docs/modelo-importacao-titulos-winthor.csv` (que cita também código do plano e RCA).

**Parsing de valores**
- `impData(v)`: Date → ISO (`toISOString().slice(0,10)`, UTC); número 20000<v<80000 → serial Excel (`1899-12-30 + v dias`); texto `d/m/aa(aa)` com separador `/ . -` (ano de 2 dígitos → "20"+aa; **dia/mês** nessa ordem); texto `AAAA-MM-DD`; senão "".
- `impNum(v)`: número → ele mesmo; texto → remove `R$` e passa por `num()` (função externa, presumivelmente formato pt-BR `1.234,56`).

**Agregação por cliente** (`impAgrega`), por linha (nº da linha na mensagem de erro = índice+2):
1. `d = só dígitos de cnpj`; vazio → linha ignorada (contada em `erros`). Se 12–13 dígitos → padStart(14,"0"); se <11 → padStart(11,"0"). (11 ou 14 mantém; 12–13 vira 14; >14 mantém.)
2. Cliente do painel = `propostas` com `documento` (só dígitos) igual (se houver duplicados no painel, o último vence; documento do painel **não** é padStart-ado).
3. Por linha: `venc=impData`, `val=impNum(valor)`, `dtp=impData(pagto)` (se mapeado), `pg = pago mapeado ? impNum(pago) : (dtp ? val : 0)`, `aberto = max(0, val-pg)`, guarda `{tit,venc,val,dtp,pg,aberto,emi}`.
4. `plano` e `rca` = última linha não vazia do cliente.
5. Recebimento: se `pg>0 && dtp` → `rec.push({k:"<tit||venc>|<dtp>|<pg>", v:pg, em:dtp})`.
6. Se `aberto>0.004 && venc` (linhas sem vencimento ficam fora dos dois buckets):
   - `venc < hoje` (string): `atraso += aberto`; `dias = max(dias, round((hoje-venc)/86400000))` (dias corridos do título mais antigo).
   - senão: `aVencer += aberto`; `prox` = menor vencimento futuro (inclui hoje); `proxV` = soma dos abertos nesse vencimento (se empata soma; se aparece vencimento menor, reinicia com o valor).
7. `recNovo = rec.filter(chave ∉ p.winRec)` (**não deduplica dentro do mesmo arquivo**: linhas idênticas duplicadas contam duas vezes).

**Prévia** (`impPrevia`): bloqueia se faltar campo obrigatório. Mostra KPIs (clientes reconhecidos de N; atraso; a vencer; recebimentos novos — só de clientes reconhecidos), linhas ignoradas (sem CNPJ), tabela (cliente, títulos, "atraso atual → atraso do arquivo", dias, a vencer, próx. vencimento, recebido novo), lista (60) de CNPJs não cadastrados (não são alterados; "cadastre pela esteira"), aviso para órgãos públicos, checkbox `impZerar`. Botão "Aplicar em N cliente(s)" (desabilitado se 0; oculto em readOnly).

**Aplicação** (`impAplicar`), para cada cliente reconhecido, `write("propostas", id, novo)` com `novo = {...p, ...}`:
- `valorAtraso = atraso(2 casas)`, `diasAtraso = dias`, `saldoAVencer = aVencer`, `proxVenc = prox||""`, `proxVencValor`, `utilizado = atraso + aVencer`, `winEm = agora`.
- Se há `recNovo`: `cobRecLog += {v,em,origem:"Winthor"}` (últimos 60); `valorRecuperado += soma` **somente se `naCobranca(p)`** (senão o recebimento é logado mas não soma); `winRec += chaves` (últimos 400).
- `rca` se veio. `plano`: acha plano por `cod === x.plano` ou nome igual (case-insens.); se achou → `planoPag = pl.id`, `prazoMedio = pmPlano(pl) || p.prazoMedio || ""`.
- Faturamento: para cada linha com `emissao`, chave `"<tit>|<emi>|<val>"`; se nova, `fatMes[emi.slice(0,7)] += val` (2 casas) e chave vai a `winFatK` (últimos 3000). (Faturamento por mês = soma de valor de **títulos/parcelas** por mês de emissão, de todas as linhas do arquivo, pagas ou não.)
- Setor **público**: `mesclaNFs(p, rows)` → `nfs` (ver 3.6); `normPub(novo)` recalcula atraso/aVencer/proxVenc/utilizado **sobrescrevendo** o que foi calculado do vencimento do título (a importação do público só alimenta NFs; o atraso segue o fluxo da NF).
- Setor privado/estética: `titVenc` = títulos com `aberto>0.004 && venc<hoje` → `{tit,venc,emi,valor(2 casas)}` (máx 150).
- **Zerar** (`impZerar`, opcional): para cada proposta que não veio no arquivo, não é exemplo e tem atraso ou a vencer: grava `valorAtraso=0, diasAtraso=0, saldoAVencer=0, proxVenc="", proxVencValor=0, utilizado=0, winEm=agora`. (Não limpa `titVenc`/`nfs`.)
- Ao final: grava log em `importacoes/<ISO só dígitos>` (em modo local, vai para `IMPLOG` em memória; **o log só é lido da memória** — `renderImpLog` usa `IMPLOG`; carga do banco não está neste trecho), chama `auditar("Importação Winthor", arquivo, [{c:"clientes atualizados",d:n},{c:"recebimentos",d:brl(rec)}])`, toast, limpa estado e `render()`.

### 2.2 Importação da tabela de planos (`#wArqP`) — `wLerPlanos`

Colunas (por regex no cabeçalho, trim):
| Papel | Regex | Observação |
|---|---|---|
| cCod | `^(c[oó]d\|codplpag\|c[oó]digo\|plano)` | código Winthor |
| cDes | `descr\|nome` (exclui cCod) | descrição |
| cPm | `m[eé]dio\|numdias\|n[º°o]?\s*dias\|dias` (exclui cod, des) | prazo médio ERP |
| cPar | `^parcelas?$\|condi` (exclui cod, des, pm) | texto com parcelas |
| cPz[] | colunas `^(prazo\|prz\|parc(ela)?\|venc)\s*\.?\s*\d+$` ordenadas pelo número | Prazo1, Prazo2, Prazo3... |

Cálculo de `dias` por linha:
1. `dias = cPz.map(parseInt)` mantendo `!isNaN && >=0`.
2. Se >1 elemento: remove zeros exceto o 1º elemento; se tudo zero → `[0]`.
3. Se vazio e há `cPar`: `split(/[\/;,\s]+/)` → ints.
4. Se ainda vazio e há `cPm`: `[parseInt(pm)||0]`.
5. `dias` gravado como `"28/35/42"` (ou "0").

Plano gerado: `{id:"w"+(cod||nome sem \W), cod, nome (ou "Plano "+cod), dias, uso: /p[uú]blic|[oó]rg[aã]o|governo/i no nome ? "Público" : "Ambos", obs:"Winthor · código X · prazo médio no ERP N dias", erp:true}`. Linhas sem cod e sem nome são descartadas. **O prazo médio do ERP só vai na observação**; o prazo médio exibido é recalculado (`pmPlano`).

Modelo `modelo-planos-pagamento-winthor.csv`: `Codigo;Descricao;Prazo1;Prazo2;Prazo3;Prazo medio` com linhas `1;A VISTA;0;;;0`, `12;28 DIAS;28;;;28`, `35;28/35/42 DIAS;28;35;42;35`.

### 2.3 Importação cliente × plano (`#wArqC`) — `wLerClientes`
Colunas: documento (`cnpj|cgc|cpf|documento`), plano (`plano|codplpag|cond`, exclui a de documento). Saída `[{doc:só dígitos (sem padStart), cod:string}]`, descarta linhas sem doc ou cod. Modelo: `CNPJ;Cliente;Codigo plano`.

Prévia (`renderWinthorPlanos`): para planos mostra código, nome, dias, prazo médio e "atualiza <plano existente>" ou "novo" (até 200); para vínculos, "N reconhecidos no painel, M CNPJ não cadastrados". Checkbox "Substituir a tabela atual" (só se há planos).

Aplicar (`wAplicar`):
- Planos: **substituir** (`L = planos importados`) ou **mesclar**: para cada importado procura `acharPlano`; se existe → `L[j] = {...L[j], ...x, id:L[j].id, uso:L[j].uso||x.uso}` (mantém o id e o uso atuais; sobrescreve cod, nome, dias, obs, erp); senão adiciona.
- `acharPlano(L,x)` casa se: (a) `y.cod && x.cod && y.cod===x.cod`; ou (b) nome normalizado igual (sem acento/pontuação/caixa); ou (c) `y` sem código **e** mesmas parcelas (`diasPlano` join "/") **e** mesmo "ser público/não público".
- Persistência: `config/planos = {lista:L, em:ISO, fonte:"Winthor"}` + auditoria "Prazos de pagamento"/"Integração Winthor" com diff {nomePlano: dias} antes→depois. Em modo local só em memória. Erro → aborta.
- Clientes: para cada vínculo cujo CNPJ está no painel: plano = `L.find(cod === x.cod)` ou `nome.toLowerCase()===x.cod.toLowerCase()`; se existe e difere do atual → `write(propostas, id, {...p, planoPag, prazoMedio: pmPlano(pl)||p.prazoMedio||""})`. Conta vinculados.

---

## 3. Regras e cálculos (pseudocódigo)

### 3.1 Dias úteis e feriados

```
pascoa(y): algoritmo gregoriano (Meeus/Jones/Butcher) → "AAAA-MM-DD"
feriadosAno(y) (cache por ano):
  fixos: 01-01 Confraternização Universal; 04-21 Tiradentes; 05-01 Dia do Trabalho;
         09-07 Independência; 10-12 Nossa Senhora Aparecida; 11-02 Finados;
         11-15 Proclamação da República; 11-20 Consciência Negra; 12-25 Natal
  móveis (Páscoa+offset): -48 Carnaval; -47 Carnaval; -2 Sexta-feira Santa; +60 Corpus Christi
feriadoDe(d) = nacional(d) ou FER_LOC[d] (feriados locais cadastrados, nome) ou ""
ehUtil(d)    = diaSemana(d às 12:00 local) ∉ {0 (dom), 6 (sáb)} E feriadoDe(d)=="" 
proxUtil(d)  = enquanto !ehUtil(d) (máx 15 iterações) d += 1 dia corrido   // se já é útil, retorna d
somaUteis(d,n) = repete n vezes: d += 1 dia; enquanto !ehUtil(d) d += 1     // n=0 retorna d SEM ajustar
```
- Feriados locais (estaduais/municipais): textarea, uma linha `dd/mm/aaaa nome` (regex `^(\d{1,2})/(\d{1,2})/(\d{4})\s*(.*)$`; nome vazio → "Feriado local"); linha inválida cancela o salvamento; ordenado por data; salvo em `config/feriados = {lista:[{d,n}]}` + auditoria "Feriados"/"locais" `[{c:"feriados", d:n}]`. Compartilhado com todos. O mesmo `FER_LOC` é carregado em outro ponto (não visível aqui).
- Snap automático de datas: listener global `change` (captura) nos inputs `ctPrev` ("Previsão de pagamento"), `cbPD` ("Próxima ação"), `acPrim` ("1ª parcela do acordo"). Se o valor não é útil → `value = proxUtil(valor)` + toast com o motivo (sábado/domingo/feriado (nome)). (Aviso: o texto "caía em..." e o toast usam a data já ajustada.) As parcelas do acordo seguintes também caem em dias úteis (conforme texto do aviso; cálculo está em outro trecho).
- Exibição "Próximos feriados": 6 próximos entre nacionais do ano e do ano seguinte + locais (rótulo "(local)").
- Observação: dias de **atraso** (`diasAtraso`) e todos os prazos de preventiva/régua privada (D-5, D+30…) são **corridos**; apenas prazos da agenda/NF pública/ofícios usam úteis.

### 3.2 Prazos da agenda (`prazoEtapaCob(p,e)`) — data prevista do passo da etapa e
```
d = hoje
se e ∈ {prev5, prev1, venc0} e p.proxVenc: d = proxVenc + (-5 | -1 | 0) dias corridos
senão se e ∈ REGUA_IDS (régua privada):
      lim = (e=="r1") ? 1 : reguaOrdem()[id==e].d (ou 1)
      d = hoje - (diasAtraso - lim)              // data em que o cliente cruzou o limite da etapa
senão (outras etapas): h = último cobHist com etapa==e; se existe d = somaUteis(h.em[0..10], 2)  // 2 dias úteis após entrada
retorna proxUtil(d)
```
`logAgenda(a, novo, itens)`: acrescenta a `novo.agLog` cada item `{...x, em:hoje, resp:(membro logado.nome || novo.cobResp || a.cobResp || ""), v:+a.valorAtraso||0}` (últimos 200). Item = `{k:"regua"|..., t:texto, prazo:data}`. **Concluído no prazo** = `em <= prazo`.

### 3.3 Cumprimento dos prazos (`renderPrazosAgenda`) — mês corrente
```
vCli(p) = (valorAtraso>0 ? valorAtraso : 0) || proxVencValor || saldoAVencer || 0
C  = agLog de todos os clientes cujo em[0..7]==mês atual, filtrados por agente (set; resp ou agenteDe(p))
EV = eventos (processoCob) de kind ∈ {acao, regua, prev, nf}
grp(lista,valor) = {n: nº itens, c: nº clientes distintos, v: soma sobre clientes do MÁXIMO valor por cliente}
ok   = grp(C com em<=prazo, v=+x.v||vCli(p))
fora = grp(C com em> prazo, idem)
atr  = grp(EV com d<hoje,  vCli)
ini  = grp(EV com hoje<=d<fimMes, vCli)      // fimMes = primeiro dia do mês seguinte (hoje.mês-01 + 40d → mês → "-01")
tot  = ok.n+fora.n+atr.n+ini.n
% de cada = n/tot ; noPrazo = ok.n/(ok.n+fora.n)
```
Exibe 4 KPIs + barra empilhada (No prazo / Fora / Atrasadas / A iniciar). Obs.: `EV` vem de `processoCob`, cujos eventos `prom` e `acordo` **não** entram neste cálculo (só acao/regua/prev/nf).

### 3.4 Evento da agenda — `processoCob(p)` (cálculo central)
```
v = valorAtraso; e = cobEtapaDe(p)
cts = cobContatos ordenados por (data||em) DESC; ult = cts[0]
diasSem = ult ? round((hoje - data(ult))/dia) : null
pagos = datas(cobRecLog.em[0..10]) ∪ datas(parcelas pagas: pagoEm||venc)
prom = primeiro contato (mais recente) com previsao
promSt: se prom:
   cumprida   se ∃ pago d com  data(prom) <= d <= previsao+3 (corridos)
   senão se previsao < hoje:  (previsao+3 < hoje ? "não cumprida" : "aguardando pagamento")
   senão "no prazo"
parc = cobParcelas; pag = nº pagas; prox = parcela não paga com venc, de menor venc
eventos ev (cada um {d,t,k}; k define a cor PC_COR):
 1. cobProxAcao && cobProxData → {d:cobProxData, t:cobProxAcao, k:"acao"}
 2. privado/estético (setor!="publico") e v>0: qb = nº de contatos com previsao cuja previsao+3<hoje e sem pagamento na janela;
      se qb>=2 e não há parcelas → {d:hoje, t:"N promessas quebradas: exigir acordo formal com entrada ou avançar a régua", k:"acao"}
 3. público: para cada passo "atual" da régua por NF (reguaPubCliente(p,true)) → {d:due, t:"NF <nf>: <passo>", k:"regua"}
 4. público: para cada NF não paga: d = (etapa=="entrega") ? hoje : (liqF ? z.liqAte : z.pagAte) ;
      t = "NF x: protocolar no órgão" | "liquidação prevista" | "pagamento previsto"   k:"nf"
 5. prom && v>0 && promSt ∈ {no prazo, aguardando pagamento} → {d:previsao, t:"Retorno: pagamento prometido [de R$]", k:"prom"}
 6. prom && v>0 && promSt=="não cumprida" → {d:previsao+3, t:"Promessa não cumprida: cobrar de novo", k:"prom"}
 7. prox (parcela do acordo) → {d:venc, t:"Parcela n do acordo · R$", k:"acordo"}
 8. setor=="privado" && v>0 && e ∈ REGUA_IDS:
      a=acaoRegua(p); se a && !a.feito → {d:prazoEtapaCob(p,e), t:a.acao, k:"regua"}
      nx = primeira etapa da régua com d > diasAtraso → {d:hoje+(nx.d-diasAtraso), t:"Entra em <etapa> (N dias)", k:"regua"}
 9. pv=prevStage(p) e checklist da etapa preventiva sem nenhum item marcado → {d:prazoEtapaCob(p,pv), t:"Lembrete D-5"|"Confirmação D-1"|"Aviso D+0", k:"prev"}
ajuste: todo ev com d não-útil → orig=d; d=proxUtil(d)
ordena ev por d; passo = ev[0]; atr = passo.d < hoje
retorno {p,e,v,dias,ult,diasSem,nCt,prom,promSt,parc,pag,prox,ev,passo,atr}
```
Obs.: cores `PC_COR = {nf:#147a7a, acao:#a8730a, prom:#2457a6, acordo:#8a3fa0, regua:#c25a17, prev:#4f9a3e}`. Itens 2 e 3: privado exclui público/estética ambíguo (item 2 usa `!="publico"`, item 8 usa `=="privado"`).

### 3.5 Quadro semanal / tabela da agenda (`renderProcessoAgenda`)
- Universo: propostas com etapa ≠ "recusada", `naCobranca(p)`, etapa de cobrança ∉ `FINAIS_COB`, e (se filtro de pessoa) agente ∈ set (`eq:<nome>` → `subordinados(nome)`; senão o próprio).
- Semana: 7 dias úteis a partir de `proxUtil(hoje)`; colunas "Ações atrasadas" (ev.d<hoje) + 7 dias (rótulo "Hoje"/"Amanhã"/"seg 12"); cada célula lista até 8 eventos (ordenados por valor vencido desc) + "+N".
- Filtro `agProcF`: `atr` (passo atrasado), `sem` (v>0 e (diasSem nulo ou >7)), `prom` (tem promessa e promSt≠cumprida), `acordo` (tem parcelas). Ordena por data do passo asc (sem passo vai pro fim) e depois valor desc; mostra 80.
- Texto-resumo: nº clientes em cobrança, nº com passo atrasado, nº "sem contato há mais de 7 dias" (v>0 e diasSem>7 ou nulo).
- Coluna "prazo": `atrasado Nd` (vermelho), `hoje`, `amanhã`, ou data.

### 3.6 Dashboard da agenda (`renderDashAgenda`) — KPIs e fórmulas
Universo `cs` = propostas não recusadas do agente; `L` = processos.
| KPI | Fórmula | Limiar "ok" |
|---|---|---|
| Carteira vencida em cobrança | soma `v` dos processos com v>0 | — |
| Conversão da cobrança | `rec/cob×100` de `conversaoMes(cs, mês atual)` | >= REGRAS.metaConv |
| Recebido no mês | soma `rec` | — |
| Promessas cumpridas | `prOk/pr×100` | >= metaProm |
| Contatos nos últimos 7 dias | nº contatos com data ∈ [hoje-6, hoje]; sub: `ct7/5` por dia útil | alerta se 0 |
| Cobertura da carteira | % de processos com v>0 e `diasSem<=7` | >= 80 |
| Próximos passos em dia | % de L com `passo && !atr` | >= 80 |
| Acordos em dia | acs = L com `parc && pag<parc`; ok = `!acordoQuebrado(p) && !(prox.venc<hoje)`; `ok/acs` | >= 90 |
Gráficos: contatos por dia (14 dias, fins de semana mais claros), carteira por etapa (top 8), faixas de atraso do vencido: 1–30, 31–60, 61–90, 91–180, >180 dias; comparativo de agentes (se >=2 agentes): carteira vencida, contatos 7d, cobertura, passos em dia, conversão (ok>=metaConv), promessas `ok/pr`.

### 3.7 Resumo da agenda no consolidado (`resumoAgenda`, `renderResumoAgenda`)
```
lim = somaUteis(hoje, 7)
it  = itensAgenda(...) (externo), com filtro de agente (agenteDe(p) ou p.analista)
L   = processos de cobrança (mesmo filtro do 3.5)
Q.atr  = grp(itens com pz.o<0 ; valor = vCli se item de cobrança)
Q.hoje = grp(itens com pz.o==0)
Q.prox = grp(eventos {acao,regua,prev} com hoje < d <= lim)
Q.ok / Q.fora = agLog do mês (em<=prazo / em>prazo)
vAtr/qAtr = soma/contagem de valorAtraso>0 (propostas não recusadas, filtro de agente, BU e ramo)
vAv/qAv   = soma de (proxVencValor||saldoAVencer) das propostas com proxVenc ∈ [hoje, lim] (a vencer em 7 dias ÚTEIS)
% no prazo = ok/(ok+fora) ; semCt = processos com v>0 e (diasSem nulo ou >7)
```
Tabela por agente: nomes = equipe com cargo ∈ {Agente de cobrança, Jurídico, Supervisor} + "Sem agente"; linhas só se há algo (total/ok/fora/prox/vAtr/vAv); clicar abre a agenda do agente (`data-agp`).

### 3.8 Conversão da cobrança (`conversaoMes(cs, m)`)
```
por proposta p (agente = agenteDe(p)):
  cts  = cobContatos com (data||em)[0..7]==m
  recs = cobRecLog com em[0..7]==m ;  rv = soma recs.v
  emAberto = valorAtraso>0 && diasAtraso>0
  trabalhado = cts.length>0 || rv>0 || (m==mês atual && emAberto && naCobranca(p))
  se não trabalhado: ignora
  agente.cli += p ; .ct += cts.length ; .rec += rv ; se emAberto: .aberto += valorAtraso   // saldo de HOJE, mesmo para meses passados
  promessas: cada contato com previsao no mês m e previsao <= hoje:
        pr++ ; lim = previsao+3 ; se ∃ pago d (cobRecLog.em ou parcelas pagas pagoEm||venc) com data(contato) <= d <= lim → prOk++
por agente: cobrado = rec + aberto ; conv = rec / (rec + aberto) (null se 0)
ordenar por cobrado desc
```
- Cores: conv >= meta (metaConv/100) = ok; >= 0,6×meta = atenção; senão ruim. Promessas: `prOk/pr >= metaProm/100`.
- KPIs totais: Cobrado = rec+aberto, Recebido, Conversão, Promessas cumpridas.
- Evolução: 6 meses terminando em `mesRef`, com a mesma função (aviso na tela: cobrado de meses passados usa saldo aberto de hoje — é uma aproximação).
- Filtros: agente e ramo (`noAgente`, `noRamo`).

### 3.9 Inadimplência por agente (`renderInadAgente`)
```
cs = carteira (não recusadas, BU, filtros agente/ramo)
agrupa por agenteDe(p) ;  R[agente] = agingDe(cs_do_agente) = {T, V, v90, q, idx, f[faixas], ...}  (externo)
mantém agentes com T>0, ordena por V desc ; tot = agingDe(cs)
meta = REGRAS.metaInad/100
KPIs: saldo vencido (tot.V, tot.q clientes); índice (tot.idx; "acima/dentro" da meta); vencido > 90 dias (tot.v90 e % de V);
      "maior índice": agente com maior idx entre os com V>0 e cargo != Jurídico e nome sem /jur[ií]dico/
barra: v<=meta → ok; v<=2×meta → atenção; senão ruim; marcador tracejado na meta; escala mx = max(1,5×meta, maiores idx, 0,01)
colunas: Total (T), Vencido (V), índice, >90 (v90), clientes em atraso (q), % do vencido total (V/tot.V)
```
A definição exata de `idx` dentro de `agingDe` está fora do trecho (nas demais seções é `V/(V+A)`).

### 3.10 Consolidado planos × faturamento × inadimplência (`renderPlanosConsol`)
```
meses = 6 meses terminando em mesRef
agrupa por plano (planoDe(p)); chave "_sem" se sem plano:
  cli = Set(ids); venc = Σ valorAtraso; av = Σ saldoAVencer; q = nº com valorAtraso>0; fat[m] = Σ fatMes[m]
tabela: prazo médio | clientes | faturado no mês(mesRef) | média 6 meses = Σ6meses/6 (divisão sempre por 6)
        | saldo vencido | clientes em atraso | inadimplência = venc/(venc+av) | "vencido ÷ faturado no mês" = venc/fat[mesRef]
total idem. Aviso se nenhum mês tem faturamento: "importe do Winthor com a coluna Emissão".
```
Quadro 2: faturado por mês × plano, últimos 6 meses.

### 3.11 Prazos de pagamento (planos) — `renderPrazos`, `planoDe`
```
diasPlano(pl) = split(pl.dias, /[\/;,\s]+/) → ints (válidos)
pmPlano(pl)   = round(média simples das parcelas) ; vazio → 0
planoDe(p) (resolução em cascata → {pl, est:false|true}):
  1. p.planoPag existe na tabela → vínculo explícito (est=false)
  2. p.comitePlano||p.libPlano (texto): se casa /vista|antecip/ → plano com pm==0; senão plano cujo diasPlano.join("/") == números do texto ("28/35 dias"→"28/35") ou nome igual (case-insens.)  (est=false)
  3. setor público → plano id "pub" ou 1º plano uso=="Público" (est=true)
  4. p.prazoMedio numérico: se EXATAMENTE 1 plano não-Público com pm igual → (est=true)
  5. senão {pl:null}   → "Sem plano definido"
```
Tela: universo = propostas com etapa "gestao" ou `naCobranca(p)`, + filtros BU/agente/ramo. KPIs: nº de planos; **prazo médio da carteira** = `Σ(pm × (valorAtraso+saldoAVencer)) / Σ(valorAtraso+saldoAVencer)`, onde pm = prazo médio do plano ou, se sem plano, `p.prazoMedio`; clientes vinculados (`planoPag` preenchido) × estimados; sem plano. Tabela editável (cód, nome, parcelas, nº parcelas, prazo médio, uso, obs, clientes por plano, remover), botões "+ Plano", "Salvar tabela" (handlers fora deste trecho; `lerPlanos` monta a lista: id existente ou `"pl"+Date.now(base36)+i`, descarta linhas sem nome, dias vazio → "0"). Quadro por plano: prazo médio, clientes, a vencer, vencido, inadimplência = venc/(venc+av). Nota: farol de crédito — prazo médio > `REGRAS.prazoAlerta` alerta, > `prazoCrit` crítico.

**Planos padrão** (`PLANOS_PADRAO`, usados enquanto `PLANOS_TAB` vazio):
| id | nome | dias | uso | obs |
|---|---|---|---|---|
| av | À vista / antecipado | 0 | Ambos | Clientes sem limite aprovado, farol vermelho ou bloqueados. |
| d7 | 7 dias | 7 | Privado | |
| d14 | 14 dias | 14 | Privado | |
| d21 | 21 dias | 21 | Privado | |
| d28 | 28 dias | 28 | Privado | Plano padrão para clientes novos aprovados. |
| d28_35 | 28/35 dias | 28/35 | Privado | |
| d28_35_42 | 28/35/42 dias | 28/35/42 | Privado | |
| d30_60 | 30/60 dias | 30/60 | Privado | |
| d30_60_90 | 30/60/90 dias | 30/60/90 | Privado | Somente farol verde e alçada do Gerente. |
| pub | Público · prazo legal da NF | 30 | Público | Prazo de referência; o vencimento real segue o fluxo da NF. |

### 3.12 Fluxo da NF pública

**Regras de pagamento padrão** (`REGRAS_PAG_PADRAO`; todas `liq:10, pag:10, un:"úteis"`):
| id | nome | esfera | UF | situação | base resumida |
|---|---|---|---|---|---|
| fed | Federal | Federal | — | Verificado | Lei 14.133/2021 art. 141; IN SEGES/ME 77/2022 arts. 5º, 7º, 11: 10 dias úteis p/ liquidar (do recebimento da NF) + 10 p/ pagar (da liquidação); metade em pequeno valor (art. 75, II) |
| df | Distrito Federal | Estadual | DF | A confirmar | Decreto DF 44.330/2023; pagamento não fixado: vale o contrato; prazos = referência federal |
| go | Estado de Goiás | Estadual | GO | A confirmar | Decreto GO 9.561/2019 (ordem cronológica por fonte; Cadin estadual) e 10.240/2023 |
| to | Estado do Tocantins | Estadual | TO | A confirmar | IN TCE/TO 1/2023 |
| mun | Municípios (regra local) | Municipal | — | A confirmar | decreto próprio; Atricon Res. 03/2022 |
Cada uma tem `link` (TCU, legjur, netcpa, sintse/TSE, gurupi.to.gov.br, atricon). `regrasPag()` = `REGRAS_PAG` (persistida em outro ponto), removendo qualquer regra id `l8666` ou nome casando `/8\.?666/` (Lei 8.666 revogada); se vazia usa o padrão.

**Escolha da regra** (`regraPagDe(p)`):
1. `p.pRegraPag` (id) se existir; senão
2. esfera e UF iguais (regra com uf); 3. esfera igual e regra sem UF; 4. sem esfera mas com UF: regra cuja `esfera` preenchida e `uf` igual; 5. UF=="DF" → regra "df"; 6. regra "fed"; 7. primeira da lista.
(Texto na tela: prazo do contrato → regra da análise → esfera+UF → federal.)

**Prazos da NF** (`prazosNF(p,n)`):
```
r = regraPagDe(p)
vc = p.pEstimado || p.valor || 0
PEQ_VALOR = REGRAS.pequenoValor; se vazio/0 ou 62725.59 (valor antigo) → 65492.11
pv (pequeno valor) = vc>0 && vc<=PEQ_VALOR && r.un=="úteis"      // art. 75, II: prazos pela metade
f = pv ? 0.5 : 1 ; base = n.protocolo || n.emissao || ""
soma(d,k) = !d ? "" : (r.un=="úteis" ? somaUteis(d, ceil(k×f)) : proxUtil(addDias(d, ceil(k×f))))
liqAte = r.liq ? soma(base, r.liq) : ""
pagAte = soma(n.liq || liqAte || base, r.pag)          // conta da liquidação REAL se houver; senão da prevista
se p.pPrazoPag>0 && base:  pagAte = proxUtil(addDias(base, p.pPrazoPag))   // contrato: dias CORRIDOS do protocolo (ou emissão); liqAte não muda
lim2m = n.emissao ? emissao + 2 meses (setMonth(+2), via Date T12:00 → toISOString) : ""
retorna {r, pv, liqAte, pagAte, lim2m, contrato: pPrazoPag>0}
```
(10 úteis → 5 úteis em pequeno valor.)

**Etapas da NF** (`NF_ETAPAS`, na ordem; `etapaNF(n)` retorna a primeira verdadeira de cima para baixo: pago > op > liq > atesto > protocolo > entrega):
| id | Nome | Gatilho |
|---|---|---|
| entrega | Entregue, NF não protocolada | sem protocolo |
| protocolo | NF protocolada · aguardando atesto | `n.protocolo` |
| atesto | Atestada · aguardando liquidação | `n.atesto` |
| liq | Liquidada · na ordem cronológica | `n.liq` |
| op | Ordem de pagamento emitida | `n.op` |
| pago | Paga | `n.pago` |

**Status** (`statusNF(p,n)` → `{e,z,t,c,venc,m2}`):
```
pago: at = pago > pagAte ; t = at ? "Paga com N dia(s) de atraso" : "Paga no prazo"; c = at ? r-mid : r-ok; venc=false; m2=false
senão:
  m2 = lim2m && hoje > lim2m ; venc=false ; t="No prazo"; c=r-ok
  e=="entrega"                                      → t="Protocolar a NF", c=r-mid
  e ∈ {protocolo,atesto} && liqAte && hoje>liqAte   → venc=true, t="Liquidação vencida desde dd/mm", c=r-bad
  senão pagAte && hoje>pagAte                        → venc=true, t="Pagamento vencido desde dd/mm", c=r-bad
  se m2 → t += " · mais de 2 meses da emissão", c=r-bad
```
(Observação: `m2` independe de `venc`; "Pagamento vencido" também vale para estágios liq/op; "entrega" nunca fica "vencida" mesmo com prazo estourado.)

**Integração com cobrança** (`normPub(p)`) — só setor público; calcula campos de saldo do cliente a partir das NFs **não pagas**:
```
sem nfs → _nfEtapa=""
rk = {"":0, nfprot:1, nfliq:2, nfpag:3, negociacao:4, acordo:5}
para cada NF não paga: s=statusNF; v=valor; pa=s.z.pagAte; e=""
  se pa && hoje>pa:          atraso += v ; dias = max(dias, hoje-pa em dias corridos) ; e="nfpag"
  senão:                     aVencer += v ; se pa: prox = menor pa (proxV soma valores desse pa)
        se s.e ∈{protocolo,atesto} && liqAte && hoje>liqAte → e="nfliq"
        senão se s.e=="entrega" → e="nfprot"
  para cada passo da régua da NF (reguaNF) com esc && due<=hoje && rk[esc]>rk[e] → e=esc
  etapaCliente = maior rk entre as NFs
grava: valorAtraso=atraso, diasAtraso=dias, saldoAVencer=aVencer, proxVenc=prox, proxVencValor=proxV, utilizado=atraso+aVencer, _nfEtapa
```
Ou seja, **atraso do público = NF com `hoje > pagAte`** (liquidação vencida mas pagAte futuro conta como "a vencer", com etapa `nfliq`). Chamada em toda gravação de NF, na régua e na importação.

**Histórico do órgão** (`histOrgao(p)`) sobre NFs pagas: `n` (qtd), `liq` = média de dias (protocolo→liq), `pag` = média (liq→pago), `atr` = média de `max(0, pago - pagAte)` (0 se sem pagAte) e `noPrazo` = qtd com atraso 0. Médias arredondadas.

**Mescla de NFs da importação** (`mesclaNFs(p, rows)`): para cada linha com `titulo`: `base = só dígitos de tit.split(/[-\/]/)[0]`; vazio → ignora. Procura NF existente com `dígitos(nf)==base`: se existe: se linha paga (`pg>0 && dtp`) e NF sem `pago` → `n.pago = dtp` (up++); se NF sem valor e linha tem val → `n.valor=val` (up++). Se não existe e `aberto>0.004`: cria `{nf:tit antes de -//, ne:"", valor:val, emissao:"", protocolo:"", vencWinthor:venc, origem:"Winthor", em:ISO}` (nov++). Linhas pagas de NF inexistente são ignoradas. (Várias parcelas/títulos de uma NF "102345-1/-2/-3" criam apenas **uma** NF com o valor da primeira parcela encontrada em aberto, pois as demais acham a NF recém-criada e só atualizam `pago`/`valor`.) Observação: a NF pode receber `pago` mesmo com apenas uma parcela paga (limitação).

**Salvar NF** (`salvar(nfs,msg)` em `refreshNF`): grava `{...p, nfs}`; para cada NF que passou a ter `pago` (comparando com anterior por `nf`+`emissao`): se `pago > pagAte`, registra recuperação (`cobRecLog += {v:valor, em:pago, origem:"NF x"}`; `valorRecuperado += valor`; pagamentos no prazo **não** contam como recuperação). Depois `normPub` e `write`.

Ações na ficha: lançar NF (exige nº e valor; `ne` pré-preenchido de `pubDocs.ne||empenho`; emissão default hoje); salvar datas (protocolo, atesto, liq, op, pago + `fila`); remover (confirmação em 2 cliques); migrar NF antiga (`pubDocs`) → `{nf:d.nf, ne, valor:valorAtraso, liq:d.liq, op:d.op, fila, origem:"migrado"}`.

### 3.13 Régua automática do público (por NF)

`reguaPubPassos()` — 10 passos (dias = parâmetro `REGRAS.<chave>`, dias **úteis** relativos à âncora):
| id | Fase | Dias (parâmetro) | Âncora | Ação | Canal | Mensagem | Escala etapa cliente |
|---|---|---|---|---|---|---|---|
| conf | pre | rpConf | `n.protocolo` (somente se protocolo, ainda em fase de liquidação e **sem atesto**) | Confirmar recebimento da NF e o atesto com o fiscal | Ligação / e-mail | — | — |
| L1 | liq | rpL1 | `liqAte` | E-mail ao fiscal e financeiro: liquidação vencida | E-mail | liq | — |
| L2 | liq | rpL2 | liqAte | Ligação ao fiscal do contrato: pendências e previsão de atesto | Ligação | — | — |
| L3 | liq | rpL3 | liqAte | Ofício ao ordenador de despesa pedindo a liquidação | Ofício | oficio | **negociacao** |
| G1 | pag | rpG1 | `pagAte` | E-mail cobrando o pagamento vencido | E-mail | pag | — |
| G2 | pag | rpG2 | pagAte | Pedido de posição na ordem cronológica (LAI) | E-mail / protocolo | fila | — |
| G3 | pag | rpG3 | pagAte | Ligação ao setor financeiro / ordenador de despesa | Ligação | — | — |
| G4 | pag | rpG4 | pagAte | Ofício formal de cobrança ao ordenador de despesa | Ofício | oficio | **negociacao** |
| M2 | m2 | 0 | `lim2m` (emissão + 2 meses) | Atraso acima de 2 meses: jurídico avalia requerimento e art. 137 | Jurídico | m2 | **acordo** |
| G5 | pag | rpG5 | pagAte | Avaliar cobrança judicial com o jurídico | Jurídico | — | — |
Os valores padrão de `rpConf..rpG5` não estão neste trecho.

`reguaNF(p,n)` (NF não paga; `liqF = etapa ∈ {entrega,protocolo,atesto}`):
```
pre: due = (n.protocolo && liqF && !n.atesto) ? somaUteis(n.protocolo, d) : ""
liq: due = (liqF && z.liqAte) ? somaUteis(z.liqAte, d) : ""
m2 : due = z.lim2m || ""
pag: due = (z.pagAte && (!liqF || hoje > z.pagAte)) ? somaUteis(z.pagAte, d) : ""
item = {...passo, due, feito: n.regua[id] || "", venc: !feito && due<=hoje}   (passos sem due são omitidos; ordenados por due)
```
Importante: `somaUteis(x,0)` não ajusta para dia útil (when d=0 a data é a própria `liqAte`/`pagAte`, já útil). O passo M2 aparece a partir da emissão (due futuro) mesmo antes de qualquer atraso.
`reguaPubCliente(p, atuais)`: junta passos de todas as NFs não pagas; com `atuais=true` mantém só os não feitos que são futuros (`due>hoje`) **ou** o último vencido de cada NF (evita inundar a agenda).
UI por NF: linhas verdes (feito, "feito em dd/mm"), "late" (último vencido), "skip" (vencido superado por outro vencido posterior); link `mailto:` com assunto/corpo (se há contato com e-mail; prefere `pref`); botão "Feito" só se `due <= hoje+2` dias corridos e não feito; grava `nfs[i].regua[id]=hoje`, `logAgenda(... {k:"regua", t:"NF x: passo", prazo:due})`, `normPub`, `write`. (Isso alimenta "concluídos no prazo/fora" — ok se `em<=due`.)

**Mensagens** (`msgNF(p,n,tipo)` → `{a:assunto, b:corpo}`): tipos `analise, protocolo, liq, fila, pag, oficio, m2`; usam contato preferencial (`fichaCtc(p)`), assinatura = membro logado ou `cobResp` ou "[agente de cobrança]" + "Núcleo Financeiro · Grupo Benenutri", placeholders `[nº]`, `[data]`, `[órgão]`; menções legais: Lei 14.133/2021 art. 141 (ordem cronológica), Lei 12.527/2011 (LAI), art. 137 (atraso > 2 meses: suspensão/extinção; minuta marcada "validar com o jurídico antes do envio"); ofício e m2 pedem resposta em 10 dias úteis. `NF_COM` = lista (id, título) de 7 modelos: oficio, analise ("Na análise de crédito: pedir o fluxo de pagamento do órgão"), protocolo, liq, fila, pag, m2.
`tipoMsgNF(s)`: `m2` → "m2"; etapa entrega → "protocolo"; protocolo/atesto → (venc ? "liq" : "protocolo"); liq/op → (venc ? "pag" : "fila").

**Tela "Fluxo da NF pública"** (`renderNFPub`):
- Fluxo informativo em 7 passos: 1 Empenho (antes da entrega; sem empenho não há despesa), 2 Entrega (canhoto), 3 Recebimento (fiscal confere; parcela incontroversa art. 143), 4 Protocolo da NF (NF + comprovante + certidões; marco inicial), 5 Atesto e liquidação (Lei 4.320 art. 63; até `fed.liq` dias úteis), 6 Ordem cronológica (fila por fonte e categoria, art. 141; publicação mensal), 7 Pagamento (até `fed.pag` dias úteis da liquidação; pequeno valor art. 75, II: pela metade; atraso > 2 meses: art. 137).
- KPIs: NFs em tramitação (não pagas; valor, nº notas, nº órgãos), com prazo vencido (`s.venc`), acima de 2 meses (`s.m2`), aguardando liquidação (etapa protocolo/atesto).
- Lista filtrável (`nfFiltro`: ""=em tramitação, `venc`, `2m`, `pagas`; busca por cliente, nº NF, empenho), ordenada por vencidas primeiro e `pagAte` asc; colunas cliente/esfera·UF/agente, NF/empenho, valor, etapa, liquidar até, pagar até, chip de situação, regra aplicada (+ "pequeno valor"/"prazo do contrato").
- Tabela editável de regras (nome, esfera, UF, liq, pag, contagem úteis/corridos, base, situação); botões "+ Regra" e "Salvar regras" (handlers fora do trecho); `lerRegrasPag` monta a lista (id existente ou `"r"+Date.now+i`; `liq/pag = parseInt || 0`; descarta sem nome; UF maiúscula).
- Atualiza o texto "Contratação de pequeno valor ... até R$ X (Decreto 12.807/2025, vigente em 2026; atualizado todo ano)".

---

## 4. Enumerações completas

**Canais de contato** (`CANAIS`): Telefone, WhatsApp, E-mail, Visita, Ofício, Portal do órgão.
**Retornos** (`RETORNOS`) → classe de cor: Promessa de pagamento (r-mid); Pagou (r-ok); Pediu negociação / parcelamento (r-mid); Contestou o débito (r-bad); Sem retorno / não atendeu (r-none); Recusou pagar (r-bad); Aguardando liquidação (órgão) (r-mid).
**Status de promessa**: em `processoCob`: `cumprida`, `não cumprida`, `aguardando pagamento` (previsão passou mas dentro da tolerância de 3 dias), `no prazo`; em `promessaStatus` (histórico): `cumprida` (valorAtraso<=0), `vencida` (previsao<hoje), `aberta`.
**Etapas de cobrança citadas** (ids; definição completa fora do trecho): `vencido`, `r1`, `r5`, `r15`, `rneg`, `r30`, `rext`, `amigavel`, `nfprot`, `nfliq`, `nfpag`, `negociacao`, `acordo`, `juridico`, `baixado`, `regularizado`, `prev5`, `prev1`, `venc0`; `REGUA_IDS` e `FINAIS_COB` externos.
**Etapas derivadas do público**: `nfprot` (NF a protocolar), `nfliq` (liquidação vencida), `nfpag` (pagamento vencido), `negociacao` (via ofício L3/G4), `acordo` (via M2 / art. 137).
**Etapas da esteira de crédito citadas**: gestao, reanalise, obsoleto, recusada, ATIVAS_PROP, ATIVAS_PED.
**Segmentos**: privado, estetica, publico. **Uso do plano**: Privado, Público, Ambos. **Esfera**: Federal, Estadual, Municipal (ou Qualquer = ""). **Contagem**: úteis, corridos. **Situação da regra**: Verificado, A confirmar.
**Cargos da equipe citados**: Agente de cobrança, Jurídico, Supervisor.
**Origem de recuperação**: "Winthor", "NF <nº>". **Origem NF**: "Winthor", "migrado".
**Ratings**: AA, A, B (baixo), C, D (médio), E, F, G, H (alto), "" (sem rating).
**Categorias de alerta**: crit, inad, alerta.
**Faixas de aging** (FX_AG em outro ponto; usadas no trecho): A vencer; 1–30; 31–60; 61–90; 91–180; >180. Faixas da conversão/agenda: 1–30, 31–60, 61–90, 91–180, >180.
**Áreas de auditoria / rótulos de campo** (`AUD_ROT`): limite→Limite, valor→Valor, etapa→Etapa, analista→Agente, cobResp→Agente de cobrança, comiteResp→Aprovador, libResp→Liberado por, excJust→Justificativa da exceção, ramo→Ramo, fonte→Fonte pagadora, prazo→Prazo, obs→Observação. Áreas vistas: "Importação Winthor", "Prazos de pagamento", "Feriados", "Certidões".
**Material de apoio** (`MATERIAL`, conteúdo estático): grupos Políticas (Política v5.2 PDF), Fluxos de processo (BPMN: PDF + 5 PNG: crédito privado, crédito público, cobrança privada, cobrança judicial, cobrança pública), Treinamentos (7 PDFs), Modelos de importação Winthor (3 CSV), Jurídico (3 PDFs + atalho para seção `jurger`), Modelos de comunicação (atalhos `regua`, `nfpub`, `negocio`, `fontes`). Cada item: `{t,d,tags[],pdf|img|arq|sec,nome}`; busca por título+descrição+tags; download via `window.claude.use("downloads")` com fallback `window.open`. Arquivos em `docs/...` (assets estáticos). Descrições citam parâmetros de negócio: régua privada D-5 a D+60, notificação extrajudicial D+30 (prazo de 15 dias corridos, arts. 389/394/397 CC), dossiê ao Jurídico D+45, contato amigável em 5 dias úteis, custos jurídicos com limite de 10%, multa limitada a 2% para consumidor final.

---

## 5. Fluxos e transições

| Evento | Automático/Manual | Efeito |
|---|---|---|
| Importação Winthor aplicada | Manual (usuário aplica) | atualiza saldos/aging/recebimentos/faturamento/plano/RCA; público: NFs |
| Sábado/domingo/feriado em datas de agenda | Automático | data movida para o próximo dia útil |
| Etapa do cliente público (`_nfEtapa`) | Automático por NF (`normPub`) | nfprot → nfliq → nfpag; ofícios (L3/G4) escalam para negociacao; M2 para acordo (quando `due<=hoje`; é "ação devida", não precisa estar "feito") |
| Marcar passo da régua pública "Feito" | Manual | grava `nfs[i].regua[id]=hoje`, log da agenda |
| Datas da NF (protocolo/atesto/liq/op/pago) | Manual | muda a etapa da NF e recalcula prazos/atraso do cliente |
| NF paga com atraso | Automático ao salvar | conta como recuperação (valorRecuperado/cobRecLog) |
| Preventiva/régua privada | Automático por dias de atraso (`diasAtraso` vs `reguaOrdem()`) | cria eventos; ação feita marca em outro ponto |
| Promessa não paga em 3 dias | Automático | vira "não cumprida" e cria evento "cobrar de novo" |
| ≥2 promessas quebradas e sem acordo | Automático | evento "exigir acordo formal" |
| Itens da agenda concluídos | Manual (`logAgenda`) | alimentam concluídos no prazo/fora |
| Zerar cliente ausente do arquivo | Manual (checkbox) | zera saldos |

---

## 6. Persistência (coleções/docs e formato)

| Local | Uso neste trecho | Formato |
|---|---|---|
| `auditoria/<AAAAMMDDHHMMSSmmm>-<5 chars aleatórios>` | `auditar(area, ref, mud)` | `{em, area, ref, mud:[{c,a,d}]≤40, uid:MY_UID, quem}`; só grava se `!localMode && db && !readOnly` (senão só memória `AUD`, unshift). Erro de gravação é engolido. Leitura (`AUD`) é carregada fora do trecho; tela mostra últimos 300 filtrados por área e busca textual (JSON inteiro). |
| `importacoes/<ISO só dígitos>` | log da importação Winthor | `{em, arquivo, linhas, clientes, naoCad, recebido, zerados, quem}` (tela exibe 30 últimos de `IMPLOG`) |
| `config/planos` | tabela de planos (integração Winthor; "Salvar tabela" em outro trecho) | `{lista:[plano], em:ISO, fonte:"Winthor"}` |
| `config/feriados` | feriados locais | `{lista:[{d,n}]}` |
| `config/certidoes` | validades de certidões (bloco oculto) | `{<chave>: "AAAA-MM-DD"}` + auditoria "Certidões" |
| `propostas/<id>` (via `write(...)`) | clientes: saldos, nfs, recebimentos, planos, agLog | documento inteiro regravado (`{...strip(p), ...}`); `strip` remove campos transitórios (provável `_nfEtapa`) |
| `juridico` | lido (consolidado) | itens com `etapa`, `autos`, `valor`, `exemplo` |
| `SNAPS` (foto mensal da carteira, fora do trecho) | roll rate | mês → `{c:{[propostaId]:[faixa,valor]}, em}` |
| `REGRAS` / `REGRAS_PAG` / `FER_LOC` / `PLANOS_TAB` / `CERTS` | variáveis globais carregadas de `config/*` fora do trecho | |
Modo `localMode` (simulação/sem banco): tudo em memória, toasts distintos ("atualizados" vs "salvos para todos"). `readOnly` desabilita escrita.

---

## 7. Dúvidas, ambiguidades e pontos de protótipo

### 7.1 Importação
1. Duplicidade de linhas **dentro do mesmo arquivo** conta duas vezes recebimento e faturamento (só deduplica contra o histórico `winRec`/`winFatK`).
2. Chave de recebimento `titulo|dataPagto|valorPago` usa `venc` quando não há título; a chave de faturamento usa `tit|emissao|valor`. Se `titulo` vazio, linhas diferentes com mesma emissão/valor colapsam.
3. `winRec` e `winFatK` truncados (400/3000) → após truncar, um arquivo reimportado pode recontar.
4. Recebimento só soma em `valorRecuperado` se o cliente está `naCobranca`; senão apenas log.
5. `impData` assume dia/mês/ano; datas americanas ou texto livre viram "" (linha sem vencimento fica fora de atraso e a vencer sem aviso).
6. Padding de CNPJ de 12-13 dígitos (perdeu zeros à esquerda) só em `impAgrega`, não no documento do painel nem em `wLerClientes`.
7. Sem tratamento de títulos de valor negativo (abatimentos/créditos) — `aberto = max(0, val-pg)`.
8. Cliente com múltiplas linhas não pagas e pagamento parcial: `pg` por linha. Se `pago` mapeado mas vazio, `pg=0` mesmo que `pagto` preenchida.
9. A importação sobrescreve `valorAtraso/saldoAVencer` pelo arquivo; no público é recalculado por `normPub` (os saldos vêm das NFs, não dos títulos).
10. `impZerar` não limpa `titVenc`, NFs nem `proxVenc` de públicos.
11. Dependência de CDN (SheetJS); em produção Mitra deve ser empacotado ou feito no backend.
12. Download de modelos via `window.claude.use("downloads")` (API da plataforma de artefatos) — ponto de protótipo; substituir por download normal.
13. Importação processada 100% no cliente (N gravações sequenciais de `propostas`); em sistema real deve ser Server Function transacional/em lote.

### 7.2 Regras de negócio
1. Feriados nacionais: lista fixa; inclui Carnaval (seg/ter) e Corpus Christi como não úteis (pontos facultativos), 20/11 desde 2024 (antes não era feriado nacional — afeta datas passadas/futuras de 2023 e antes); não há Quarta de Cinzas/meio-período.
2. `somaUteis(d,0)` não corrige data não útil; `proxUtil` limita 15 iterações.
3. Tolerância de promessa fixa em **3 dias corridos** (hard-coded), regra de "2 promessas quebradas" hard-coded.
4. "Média 6 meses" no consolidado de planos divide sempre por 6, mesmo com menos meses de dados.
5. Conversão histórica usa saldo aberto de hoje (aproximação reconhecida na tela).
6. `agingDe`, `idx` e `PDD_KEYS` definidos fora; o índice de inadimplência pode ser `V/(V+A)`.
7. `lim2m` usa `Date.setMonth(+2)` (estouro de fim de mês: 31/12 + 2m → 03/03) e `toISOString` (UTC) em data local T12:00 — possível diferença de 1 dia; usar aritmética de calendário no sistema novo.
8. `pequenoValor`: valor de referência 65.492,11 (Decreto 12.807/2025) com migração do antigo 62.725,59; compara com `pEstimado||valor`; deve ser parâmetro anual.
9. Para pequeno valor com contagem em corridos o código não aplica metade (`pv` exige "úteis").
10. NF "entrega" sem protocolo usa `emissao` como base (prazo de liquidação a partir da emissão) e nunca é "vencida".
11. `normPub`: liquidação vencida conta como "a vencer" (não entra em `valorAtraso`) — decisão de negócio a confirmar; vencimento do título Winthor é ignorado.
12. Passo M2 (>2 meses) está ancorado na emissão e **não** é cancelado por pagamento parcial; NF de atesto/OP não afeta M2.
13. Em `reguaNF`, passos "pag" só aparecem se `!liqF` (liquidada) ou já vencido o prazo de pagamento; assim NFs liquidadas mostram a régua de pagamento desde a liquidação.
14. Quatro regras estaduais/DF/mun. estão "A confirmar" e com prazos = federal (placeholder).
15. Inconsistências de setor: evento "promessas quebradas" usa `setorP != "publico"`; régua privada exige `=="privado"`; estética pode ficar fora da régua.
16. `prazoEtapaCob` para etapas não-régua usa "2 dias úteis após a entrada" (hard-coded).
17. `renderResumoAgenda` "A vencer em 7 dias úteis" mistura calendário e `somaUteis`.
18. Mês de filtro (`fState.mes`) vs. mês atual: vários blocos usam sempre o mês corrente (`hoje.slice(0,7)`) para agenda/prazos.

### 7.3 Protótipo/UI
- Código duplicado (parser CSV 2×), HTML gerado por string, IDs de DOM acoplados; renderizações recalculadas a cada `render()`.
- `Math.random()` como fallback de chave em `grp`.
- Ids de plano `"pl"+Date.now()`; id de auditoria com aleatório curto.
- `_nfEtapa` gravada junto do documento (possivelmente).
- `exemplo:true` marca dados de demonstração.
- Termos de material de apoio apontam para PDFs/PNGs estáticos (`docs/`), que precisam virar arquivos do sistema.
- Bloco de certidões está oculto (`box.hidden=true` sempre), mas o cálculo `certAlertas()` ainda gera alertas.

### 7.4 Segurança/qualidade
- Escrita de auditoria silenciosa em erro (`catch{}`).
- `write()` regrava documento inteiro (concorrência: último vence) — usar atualização parcial/versão no MySQL.
- Dados de importação não validados (CNPJ sem dígito verificador).

### 7.5 Seleção por agente
`agenteDe("propostas", p)` (externo) define o agente; em `processoCob`/`logAgenda` o responsável do log é o membro logado, não o `cobResp`.

### 7.6 Funções/variáveis usadas e definidas fora deste trecho (ler para completar a spec)
`$`, `esc`, `num`, `brl`, `pctF`, `fmtC`, `fmtDia`, `diaFmt`, `mesFmt`, `hojeISO`, `addDias`, `mesDe`, `toast`, `handleErr`, `write`, `strip`, `render`, `db`, `localMode`, `readOnly`, `MY_UID`, `meuMembro`, `membro`, `equipe`, `subordinados`, `agenteAtivo`, `agentesDoFiltro`, `agenteDe`, `noAgente`, `noRamo`, `noBU`, `noSetor`, `noMesSo`, `setorP`, `segDe`, `buDe`, `etapaOf`, `normEtapa`, `naCobranca`, `cobEtapaDe`, `cobEtapas`, `nomeCobEtapa`, `FINAIS_COB`, `REGUA_IDS`, `reguaOrdem`, `acaoRegua`, `prevStage`, `acordoQuebrado`, `acordoInfo`, `proxAtrasada`, `bloqueado`, `anuenciaPendente`, `agingDe`, `agingCmp`, `linhasBU`, `linhasEsfera`, `FX_AG`, `PDD_KEYS`, `pddDe`, `faixaAtual`, `SNAPS`, `eventosInad`, `probInad`, `inadInterno`, `criticidade`, `saude`, `limiteDe`, `decisao`, `slaState`, `etapasSetor`, `itensAgenda`, `fichaCtc`, `REGRAS`, `REGRAS_PAG`, `PLANOS_TAB`, `FER_LOC`, `CERTS`, `CERT_LISTA`, `certStatus`, `certAlertas`, `recebivelStatus`, `alcadaBaixa`, `jurAcordo`, `jurRecuperado`, `jurCustoTot`, `jurDesvios`, `jurBUde`, `BUS`, `BU_CORES`, `REG_UF`, `FUNCOES_CTC`, `fState`, `openRef`, `items.propostas/pedidos/juridico`, `barList`, `buTag`, `renderEvolucao`, `renderVisaoGeral`, `setSec`.

---

## 8. Conteúdo adicional do arquivo (fora das 15 seções)

### 8.1 `renderConsol` — indicadores executivos
- Universos: `mesBU` (filtra mês e BU), `cartAll` (BU, etapa ≠ recusada), por segmento via `segDe`.
- Por segmento (`calc`): em análise (ATIVAS_PROP sem gestao/reanalise), deferidos (gestao, reanalise, obsoleto), negados (recusada), `apr = def/(def+neg)`, tempo médio de decisão (dias), crédito concedido = Σ `limiteDe` dos deferidos, exposição = Σ `utilizado` (gestao/reanalise), `V=Σvalor atraso`, `A=Σsaldo a vencer`, `idx=V/(V+A)`, projeção = Σ(saldoAVencer × `probInad(p).pr`), recuperado = Σ valorRecuperado, `idxRec = rec/(rec+V+baixado)`, críticos, inadimplentes internos, pedidos retidos.
- KPIs: SLA = decisões dentro de Σ SLA das etapas não finais (exceto reanálise) ÷ decisões; índice de revisão = revisados/(revisados + vencidos pendentes em gestão); PMR = Σ(prazoMedio × saldo)/Σ saldo (somente clientes com prazoMedio); Write-off; tempo médio de atraso (TMA) = Σ(diasAtraso × valorAtraso)/V; % clientes inadimplentes; concentração top 5; exposição alto risco (ratings E–H); projeção de inadimplência = (V + proj)/(V+A). Tons: inadimplência verde ≤5%, vermelho ≥10%; PMR ≤45 / ≥60; TMA ≤30 / ≥90; SLA ≥85% / ≤60%; revisão ≥90%/≤60%; recuperação ≥50%/≤20%; top 5 ≤50%/≥80%.
- Movimento do período: `eventosInad` eventos `g` (gerada) e `r` (recuperada) por mês; variação líquida = g − r; recuperado ÷ gerado; 6 meses.
- Blocos: inadimplência por setor/BU, aging (A vencer, 1–30, 31–60, 61–90, 91–180, >180), risco por rating (Baixo AA–B; Médio C–D; Alto E–H; sem rating), deferido×negado, concentração (cliente, grupo, região via `REG_UF`, BU), saúde (`saude(c).nivel` ok/atencao/risco), alertas (críticos, vencidos, >90 dias, SLA, pedidos retidos, preventiva pendente, validade vencida, régua pendente, bloqueados, acordos quebrados, baixas pendentes, cartas de anuência, certidões), seção Jurídico (processos em andamento, acordos a receber, recuperado vs custo, desvios).

### 8.2 `renderCobHist`
Lista dos contatos (300), filtros por retorno, promessa (aberta/vencida só no último contato) e busca; KPIs: contatos no mês, promessas em aberto (somatório `valor`), promessas vencidas, sem retorno no mês.

### 8.3 `renderCobGer` — indicadores de cobrança (numerados 01–11)
Inadimplência (V/T), carteira vencida, a vencer, PMR, recuperação de crédito (`rec/(rec+V+wo)`), eficiência (clientes `cobEtapa=="regularizado"` sem atraso ÷ clientes já cobrados), índice de recebimento (média ponderada de `pontualidade/100`; fallback A/T), TMA, write-off (`wo/(T+wo)`), renegociação (clientes com acordo ÷ cobrados). Quadros: clientes por etapa da cobrança (valor = vencido ou, na preventiva, `proxVencValor||saldoAVencer`), classificação qualitativa (Pagou/regularizado; acordo/negociação; contatado sem solução; sem contato iniciado; escalado ao jurídico; preventiva; baixado como perda — `semCont` = etapa "vencido", ou nfprot/nfliq/nfpag sem contatos, ou r1 sem contatos e ação da régua não feita), acompanhamento (próxima ação em dia/atrasada/sem ação/sem responsável), certidões (bloco oculto), **PDD** (`Σ faixa[i] × REGRAS[PDD_KEYS[i]]%`; % da carteira e cobertura do vencido), **roll rate** (foto mensal anterior em `SNAPS`: para cada cliente com faixa anterior 0–4, compara com `faixaAtual(p)` (6 se baixado): pago, melhorou, manteve, piorou; taxa de piora = piorou/base), acordos (ativos, quebrados, em dia, parcelas em 30 dias) e baixas (pendentes por alçada, total baixado), documentos dos recebíveis (público; `recebivelStatus`: sem empenho, aguardando liquidação, liquidado sem OP, OP emitida), resumo textual gerado por frases, resumo consolidado privado/público, concentração (maior devedor, top 5/10, nº clientes com 80% do vencido, HHI = Σ(share%)²; ≥2500 concentrada, ≥1500 moderada), tabela por agente (`cobResp`: clientes, vencido, contatos no mês, promessas, % cumpridas, recuperado, próximas ações atrasadas), por BU, aging, top clientes/grupos/UF.
