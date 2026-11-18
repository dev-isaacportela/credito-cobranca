# Relatório E — Módulo Jurídico, PDFs, importação, custos, desvios, consolidado e bootstrap

Fonte: `js-E.js` (849 linhas lidas por inteiro). Tudo abaixo é extraído do código; o que é inferência está marcado. Funções usadas mas **definidas fora deste trecho** (não vistas): `encargos(p)`, `setorP`, `naCobranca`, `cobEtapaDe`, `nomeCobEtapa`, `foiProtestado`, `hojeISO`, `addDias`, `somaUteis`, `fmtDia`, `fmtC`, `pctF`, `brl`, `num`, `strip`, `write`, `auditar`, `meuMembro`, `REGRAS`, `BUS`, `buTag/buClasse`, `ASSETS`, `readOnly`, `localMode`, `db`, `carregaXLSX`, `carregarJsPDF`, `TIMBRE/LOGO_VERDE`, `resumoAgenda`, `gerarPdfHistorico`, `render`, `shell`, etc.

Convenção: "hoje" = `hojeISO()` (data ISO `YYYY-MM-DD`). "ativo" = `etapa !== "encerrado"`.

---

## 1. Entidades e campos

### 1.1 Processo jurídico (`items.juridico`, coleção `juridico`, doc id = `j.id`)

| Campo | Tipo inferido | Significado / origem |
|---|---|---|
| `id` | string | Chave. Ver regra de geração em 2.7 (planilha), `"p"+idCliente(30)+"-"+Date.now base36` (dossiê vindo da cobrança), `"m"+Date.now base36` (cadastro manual) |
| `cliente` | string | Nome do devedor (obrigatório ao salvar) |
| `clienteId` | string? | id da proposta/cliente da cobrança (`items.propostas`); só preenchido pelo fluxo "dossiê da cobrança". Preservado na reimportação |
| `cod` | string | Código do cliente no Winthor (ERP) |
| `documento` | string | CNPJ/CPF (vem do cliente da cobrança) |
| `endereco` | string | Endereço de cobrança |
| `contatos` | string | Texto livre (financeiro nome · contato · telefone, ou da aba Extrajudicial) |
| `valor` | number (R$) | Valor em cobrança (principal/ação). Base de todas as somas |
| `valorAtualizado` | number? | Valor com encargos na data do envio do dossiê (`encargos(p).tot` arredondado 2 casas); usado na notificação quando origem é processo sem cliente vinculado |
| `filial` | string | Filial credora: `BNDF, BNGO, BNRS, BNEXDF, BNEXTO` (lista fixa `FILIAIS_JUR`; aceita outras digitadas) |
| `setor` | `"privado"|"publico"` | Define checklist do dossiê |
| `bu` | string | Unidade de negócio (`BUS` + livre). Se vazio, herda da cobrança (`jurBUde`) |
| `marca` | string | `"Galderma"` ou vazio (inferido do texto do segmento) |
| `segmento` | string | Texto original da coluna Segmento da planilha |
| `autos` | string | Nº dos autos (padrão CNJ `NNNNNNN-DD.AAAA.J.TR.OOOO`). Existe ⇒ processo "ajuizado/em andamento"; não existe ⇒ "a ajuizar" |
| `tribunal` | string | TJGO, TJDFT, TJRS... |
| `resp` | string | Responsável no Jurídico (advogado/escritório); no cartão vira avatar com iniciais |
| `etapa` | enum | Uma das 11 etapas (seção 5). Default `recebido` |
| `etapaManual` | bool | true se usuário mudou etapa à mão/arrasto; evita que reimportação sobrescreva (ver 2.8) |
| `status` | string | "Situação atual" / último andamento (texto) |
| `situacao` | string | Texto bruto da planilha (coluna de situação) — só na importação |
| `prazo` | date ISO | Próximo prazo |
| `prazoTxt` | string | Prazo em texto livre da planilha quando não é data; zerado se `prazo` editado |
| `hist` | array<Andamento> | Histórico (1.2) |
| `dossie` | objeto | `{itens:{[docId]:{st:"pend|ok|na", obs}}, abertoEm, enviadoEm, enviadoPor}` |
| `anexos` | array | `{id (blob), nome, item (docId ou "outro"), em, tam}` — arquivos do dossiê (upload via `ASSETS`, servidos em `/_blob/{id}`, limite 20 MB, PDF/PNG/JPG) |
| `acordo` | objeto | Ver 1.3 |
| `custos` | array<Custo> | Ver 1.4 |
| `recuperado` | number|null | Valor recuperado informado manualmente; null/"" = usar cálculo automático |
| `substabelecer` | bool | Procuração pendente de substabelecimento |
| `alertas` | array<string> | Divergências detectadas na importação ("Conferir planilha") |
| `respostaExtra` | string | Resposta à notificação extrajudicial (da aba Extrajudicial) |
| `abas` | array<string> | Abas da planilha em que o caso apareceu |
| `origem` | `"planilha"|"cobranca"|"painel"` | De onde nasceu |
| `obs` | string | Observações para o Jurídico (dossiê) |
| `importadoEm`, `criadoEm`, `atualizadoEm` | ISO datetime | Auditoria |
| `exemplo` | bool | Registro fictício de demonstração (filtrado por "Ocultar exemplos" `fState.semEx`) |

### 1.2 Andamento (`hist[]`)
| Campo | Significado |
|---|---|
| `em` | ISO datetime (itens criados no painel) |
| `per` | rótulo de período vindo da planilha (ex.: "mar/26", "Status", "Extrajudicial", "Específicos") — itens da planilha não têm `em` |
| `txt` | texto do andamento |
| `por` | autor (membro da equipe ou nome entre colchetes da planilha) |
| `origem` | `"planilha"` ou `"painel"` |

Exibição: últimos 60, ordem invertida; data = `fmtDia(em)` ou `per`. Itens `origem:"painel"` são preservados na reimportação; os `"planilha"` são substituídos.

### 1.3 Acordo (`j.acordo`)
| Campo | Tipo | Significado |
|---|---|---|
| `valor` | number | Valor total do acordo |
| `honorarios` | number | Honorários (10% do valor ao criar pelo painel; da planilha vem da coluna) |
| `honorariosPagos` | bool | Planilha: célula de honorários pintada na cor "quitado" |
| `situacao` | string | Texto da planilha ou `"EM ANDAMENTO"` |
| `aprovadoPor` | string | Alçada: nome/cargo; **obrigatório acima de R$ 50.000 (Gerente)** |
| `parcelas[]` | array | `{n, valor, venc (ISO), pago (bool)}`; `n=0` = Entrada, 1..N = parcelas |

Resumo derivado `jurAcordo(j)` (null se não há parcelas): `n`=total de parcelas; `pagas`; `aberto`=Σ valor das não pagas; `vencidas`=nº não pagas com `venc < hoje`; `prox`=menor vencimento em aberto; `quitado`= nenhuma em aberto.

### 1.4 Custo (`j.custos[]`)
| Campo | Tipo | Significado |
|---|---|---|
| `id` | string | `Date.now().toString(36)` |
| `tipo` | enum | Um dos 12 tipos (4.1) |
| `data` | date ISO | Data do custo |
| `valor` | number >0 | Obrigatório > 0 |
| `obs` | string | Observação |
| `pago` | bool | Pago / a pagar (se anexar comprovante ⇒ pago) |
| `guia` | `{id,nome,em,tam}`? | Anexo da guia (blob) |
| `comprovante` | `{id,nome,em,tam}`? | Anexo do comprovante |
| `em`, `por` | ISO / nome | Auditoria |
| `exemplo` | bool | Fictício |

### 1.5 Itens do dossiê (checklist) — `JUR_DOCS` (17 itens)
`o`=1 obrigatório, 0="se houver"; `s`=setor (`ambos`/`privado`/`publico`); `auto`=gerado pelo painel.

| id | Texto | Obrig. | Setor |
|---|---|---|---|
| nf | Notas fiscais (DANFE e XML) das faturas em aberto | sim | ambos |
| entrega | Comprovantes de entrega assinados (canhoto, CT-e ou recibo) | sim | ambos |
| pedido | Pedido de compra, proposta comercial ou contrato com o cliente | sim | privado |
| contrato | Contrato administrativo ou ata de registro de preços | sim | publico |
| empenho | Nota de empenho e ordem de fornecimento | sim | publico |
| atesto | Protocolo da NF no órgão e atesto ou termo de recebimento | sim | publico |
| titulo | Boletos ou duplicatas e posição dos títulos no Winthor | sim | privado |
| protesto | Instrumento de protesto e comprovante de negativação | sim | privado |
| notif | Notificação extrajudicial (modelo padrão) e comprovante de recebimento | sim | privado |
| oficio | Ofícios de cobrança e requerimento administrativo protocolados | sim | publico |
| lai | Posição na ordem cronológica de pagamentos (resposta à LAI) | **não** | publico |
| certidoes | Certidões de regularidade da Benenutri na data do faturamento | sim | publico |
| demonst | Demonstrativo atualizado do débito (principal, multa, juros e correção) | sim | ambos (auto) |
| hist | Histórico de cobrança (régua, contatos, promessas e propostas) | sim | ambos (auto) |
| cadastro | Cadastro do devedor: cartão CNPJ/CPF, contrato social, sócios, endereço | sim | ambos |
| garantia | Garantias e confissões: aval, fiança ou termo de acordo anterior | **não** | ambos |
| alcada | Aprovação do encaminhamento ao Jurídico pela Gestão Financeira | sim | ambos |

Lista aplicável: `jurDocsDe(setor)` = itens `ambos` + os do setor (`publico` → só `publico`; qualquer outro → `privado`).
- Privado obrigatórios: nf, entrega, pedido, titulo, protesto, notif, demonst, hist, cadastro, alcada = **10**; opcional: garantia.
- Público obrigatórios: nf, entrega, contrato, empenho, atesto, oficio, certidoes, demonst, hist, cadastro, alcada = **11**; opcionais: lai, garantia.

Progresso `jurDossieProg`: `ok` = nº de obrigatórios com `st==="ok"` **ou** (`st==="na"` **e** `obs` não vazia); `tot`=nº de obrigatórios; `completo = ok===tot`.

**Sugestão automática ao abrir dossiê** (`dossieSugestao(p)`), itens pré-preenchidos:
- `demonst` ok "Gerado pelo painel"; `hist` ok "Histórico do cliente no painel".
- Privado e `foiProtestado(p)`: `protesto` ok "Título protestado pela régua".
- Se `p.notifExtra`: `notif` = pend, obs "Notificação gerada em dd/mm; anexar o comprovante de recebimento".
- Público: `contrato` ok se `p.pContrato||p.pEdital` (obs = valor); `empenho` ok se `p.empenho` ou alguma NF com `ne`; `atesto` pend se alguma NF tem `protocolo`.
- Se `p.documento && p.endereco`: `cadastro` pend "CNPJ e endereço no cadastro; anexar contrato social e QSA".

Ao anexar arquivo a um item (≠"outro"): item vira `ok`, obs = obs existente ou "Anexo: nome".

### 1.6 Outras estruturas
- `JURCFG` (config global do Jurídico, doc `config/juridico`): `{banco, email, tel, rep, cargo, empresas:{[filial]:{razao,cnpj,end,cidade}}}`.
- `EMP_NOTIF_PADRAO` (default da Notificante): razão "BENENUTRI COMERCIAL LTDA", CNPJ 20.720.905/0001-43, end. "Setor SAAN, Quadra 03, Lote 750/760, Zona Industrial, Brasília/DF, CEP 70.632-320", cidade "Brasília/DF". `empNotif(filial)` = padrão sobrescrito por `JURCFG.empresas[filial]`; filial default `BNDF`.
- Campos acrescentados na **proposta/cliente da cobrança** por este módulo: `jurId` (id do processo jurídico), `cobEtapa="juridico"`, `cobEntrou` (ISO), `cobHist[]` (`{etapa,em}`, últimos 40), `notifExtra` `{em (data), prazoAte (data+15d), valor (pri+mul+jur+cor), por}`.
- Campos de cliente da cobrança lidos: `cliente, documento, endereco, finNome, finContato, telefone, valorAtraso, diasAtraso, bu, codWinthor, titVenc[{tit,emi,venc,valor}]` (privado), `nfs[{nf,emissao,vencWinthor/_venc,valor,pago,ne,protocolo,_st}]` (público), `pContrato, pEdital, empenho, saldoAVencer, valorRecuperado, utilizado`.

---

## 2. Planilha do Jurídico e vínculo com clientes

### 2.1 Leitura
`jurLerArquivo(f)`: SheetJS (`carregaXLSX`) `X.read(arrayBuffer,{cellStyles:true})` (estilos necessários para a aba ACORDOS) → `jurParse`. Aceita `.xlsx` (input `#jurImpFile`). Cada aba é lida com `sheet_to_json(header:1, defval:"", raw:true)` (matriz de linhas; números permanecem numéricos). Abas localizadas por **regex no nome** (primeira que casar, case-insens.):

| Aba | Regex | Linha de cabeçalho | Ordem de processamento |
|---|---|---|---|
| Acompanhamento - Jurídico | `/acompanhamento.*j[uú]r/i` | 1ª linha cuja col A começa com `cod` | 1º |
| Acompanhar - Específicos | `/espec[ií]fic/i` | 1ª linha com col A começando `cod` | 2º |
| Acompanhamento - Extrajudicial | `/extrajud/i` | 1ª linha com col A começando `cliente` | 3º |
| Processos | `/^processos/i` | 1ª linha com col A começando `nome` | 4º |
| ACORDOS | `/acordo/i` | por linha: col A começando `cliente` | 5º |

Aba ausente = ignorada. Se o resultado for vazio: toast "Nenhum processo encontrado. Confira se é a planilha do Jurídico." O modelo de planilha (cabeçalhos originais) não é dado fora esses regex — ver dúvidas.

### 2.2 Helpers de parsing
| Helper | Regra |
|---|---|
| `S(v)` | `String`, colapsa espaços, trim |
| `val(v)` (moeda) | número → arredonda 2 casas. Texto: remove `R$`, pega 1º `\d[\d.,]*`; se tem vírgula: remove pontos, vírgula→ponto; senão se tem >1 ponto: remove pontos; arredonda 2 casas; sem match = 0 |
| `autosDe(v)` | regex `\d[\d.\-]{14,}\d` e precisa ter ≥2 pontos; retorna o trecho (nº CNJ) ou "" |
| `dg(v)` | só dígitos |
| `codDe(v)` | número→`String(round)`; texto remove `.0+` final |
| `filial(v)` | upper sem espaços; `EX\w*DF$` ou `BNEXDF`→BNEXDF; `EX\w*TO$`/`BNEXTO`→BNEXTO; termina em DF/GO/RS/TO→`BN`+UF; senão texto original |
| `seg(v)` | setor = `publico` se `/P[UÚ]BLICO/` senão `privado`; `Galderma` ⇒ marca "Galderma", bu "Estética"; `segmento` = texto original |
| `data(v)` | número 20000–80000 = serial Excel (epoch 1899-12-30) → ISO; texto `d/m/aaaa` → ISO; texto `d/m` (sem ano) → **ano corrente**; senão "" |
| `notas(t)` | Divide texto por `[Autor]`: base = antes do 1º colchete; cada `[Autor] dd/mm: texto` vira `{por:Autor, per:"dd/mm", txt}` (autor 2–30 chars; `dd/mm:` opcional) |
| `slug(n)` | tokens do nome (2.4) unidos por `-`, minúsculos, 40 chars, ou "sem-nome" |

### 2.3 Mapeamento de etapa por texto (`etapaDe`)
Primeira regra que casar (regex case-insens.) sobre o texto de status — **ordem importa**:

| # | Etapa | Regex (resumo) |
|---|---|---|
| 1 | encerrado | quitad, integralmente cumprid, extint |
| 2 | acordo | em acordo, acordo homologad |
| 3 | suspenso | arquivad, recuperação judicial, falência, massa falida, suspens |
| 4 | execucao | cumprimento de senten, penhora, sisbajud, renajud, infojud, rpv, precatório, levantamento, demonstrativo discriminado, execução |
| 5 | defesa | aguardando senten |
| 6 | sentenca | sentença, apelação, 2º grau, trânsito, recurso |
| 7 | citacao | citação, edital, endereço, ar devolvid, mandado, diligência, carta de cit, custas postais, locomo, intimad |
| 8 | defesa | embargo, contrarraz, conclus, decis, despacho, provas, audiência, julgamento, manifest, competência, redistribu, interlocut |
| 9 | custas | custas iniciais, enviado para protocolo, protocolo |
| 10 | inicial | inicial, confec, verificar, novo |
| — | "" | sem match |

### 2.4 Algoritmo de comparação de nomes (tolerante)
1. **Tokenização** `jurTk(nome)`: NFD sem acentos → MAIÚSCULAS → remove trechos entre parênteses → remove código numérico inicial (`^\s*\d+\s*-?\s*`) → troca não `[A-Z0-9 ]` por espaço → divide em palavras → remove stopwords `DE DA DO DAS DOS E LTDA EIRELI ME EPP SA S A EM LTD CIA O` e tokens só numéricos.
2. **Palavra "quase igual"** `jurQuase(a,b)`: iguais → true; se qualquer uma tem <4 letras → false; mesmo tamanho: diferem em exatamente 1 posição, **ou** em 2 posições adjacentes trocadas (transposição); tamanhos diferindo por 1: igual após remover 1 caractere (inserção/remoção). Máx. 1 erro de digitação.
3. **Similaridade** `jurSim(a,b)` ∈ [0,1]: A,B = tokens; se algum vazio → 0. `s` = menor lista, `l` = maior. `hit` = nº de palavras de `s` com algum `x` em `l` tal que `jurQuase(x,w)`. Se `s.length≥2` e `hit===s.length` → **1** (a menor está contida na maior). Senão `hit / |A ∪ B| (conjunto de tokens distintos)` (Jaccard aproximado).
4. **Limiares**: 
   - `achar` (dentro da importação, `R` = lista em construção): (a) se tem nº de autos: candidatos com mesmos 15 primeiros dígitos do autos, ordenados por `jurSim` desc; aceita o 1º se `jurSim≥0.34`; (b) se tem `cod`: primeiro com mesmo `cod` e `jurSim≥0.34`; (c) melhor `jurSim` global `≥0.6`.
   - `jurAcharExistente` (importação vs. dados já salvos): ignora pares em que ambos têm autos (não casa por nome); exige `cod` igual se ambos têm; aceita melhor `jurSim ≥ 0.9`. Primeiro tenta match exato por `id`.
   - `jurLinks` (processo ↔ cliente da cobrança): usa `clienteId` direto; senão melhor `jurSim` **≥0.6** entre `items.propostas` filtradas por `naCobranca(p) || +p.valorAtraso`. Resultado cacheado por `"tamJur|tamPropostas"` (`jurLinkCache`; invalidado ao salvar). Um processo → no máximo 1 cliente; `jurDeCliente(p)` escolhe o processo vinculado, preferindo não-encerrado se o melhor era encerrado.
   - Nota: o match por nome para cliente **não** usa CNPJ nem código; só nome (ver dúvidas).

### 2.5 Aba "Acompanhamento - Jurídico" (linhas de dados após o cabeçalho)
Colunas (índice, base 0): 0 = Cód.; 1 = Parte/Cliente; 2 = Valor; 3 = Filial; 4 = Segmento (público/Galderma); 5 = Situação/Nº dos autos; 6 = Tribunal; 7..(coluna "Status"−1) = colunas de acompanhamento por período (cabeçalho tipo "Acompanhamento mar/26"); coluna cujo cabeçalho começa com `status` = Status (com notas `[Autor] dd/mm: ...`); coluna cujo cabeçalho começa com `prazo` = Prazo.
- Ignora linhas com col A "aguardando documenta…" e linhas sem nome ou nome = "parte".
- `cliente` = nome sem prefixo `^\d+\s*-\s*`; `cod`; `valor=val(c2)`; `filial(c3)`; `seg(c4)`; `at=S(c5)`; `autos=autosDe(at)`; `sit = autos ? "" : at`; `tribunal=c6`.
- `hist`: para cada coluna de período, cada texto não vazio e **diferente do anterior** → `{per:rótulo, txt, origem:"planilha"}` (rótulo = cabeçalho sem "acompanhamento"; se vazio usa o da coluna anterior). `last` = último texto.
- Status: `notas(c_status)`; se `base` e ≠ `last` → hist `{per:"Status", txt:base}`; cada nota → hist `{per, txt, por}`.
- `status` final = texto da última nota, senão `base`, senão `last`, senão `sit`.
- `etapa = etapaDe(status) || etapaDe(base) || etapaDe(last) || etapaDe(sit) || (autos ? "defesa" : "inicial")`.
- `prazo = data(c_prazo)`; `prazoTxt` = "" se célula numérica; senão "" se parseou data; senão o texto bruto.
- `abas=["Acompanhamento - Jurídico"]`.

### 2.6 Demais abas
**Específicos** (cabeçalho col A `cod…`): col 0 cód.; 1 nome; 2 segmento; 3.. textos (3 pode conter autos); cabeçalho col 4 vira rótulo `per` do histórico. `status` = último texto das colunas ≥3 que não for nº de autos. Casa com `achar(nome,cod,autos)`. Se não achar: cria com `etapa = etapaDe(status) || "suspenso"`. Se achar: completa `autos` se faltava e `status` se faltava. Sempre empilha hist `{per, txt:status}` e `abas+="Acompanhar - Específicos"`.

**Extrajudicial** (cabeçalho col A `cliente…`): col 0 "Cód - Nome" (`^(\d+)\s*-?\s*(.*)$`); col 1 valor (se vazio e texto parece contato — `@|telefone|email|\d{4}-\d{4}` — vai para contatos); col 2 contato; col 3 resposta. Se `resp` vazio e `contato` começa com "quitad" → move para resposta. Casa com `achar(nome,cod,"")`. Se achou: completa `valor` (se 0), `contatos`, `respostaExtra`, e insere no início do hist `{per:"Extrajudicial", txt:"Notificação extrajudicial · resposta: <resp|sem registro>"}`. Se não: cria com etapa `encerrado` se resposta ~ "quitad", `inicial` se resposta começa com "judici", senão `recebido`; status "Quitado após notificação extrajudicial" / resposta / "Notificação extrajudicial enviada".

**Processos** (cabeçalho col A `nome…`): col 0 nome; 1 endereço (ignora "pendente"); 2 valor; 3 filial; 4 segmento; 5 situação (pode ter autos); 6 "protocolo" (texto contendo "substabelec" ⇒ `substabelecer=true`). Se casa: completa `endereco`, `filial`; se autos diverge (15 dígitos) do já existente ⇒ **alerta** "Nº dos autos diferente entre as abas: X (Processos) × Y (Acompanhamento)". Se não casa, cria: etapa = autos→`defesa`; "preju"→`encerrado`; "verific"→`recebido`; "acompanhar"→`defesa`; senão `inicial`. Status = autos→"Sem andamento registrado na aba de acompanhamento"; preju→"Baixado como prejuízo"; novo→"Novo caso a ajuizar"; senão a situação.

**ACORDOS**: usa estilo de célula (`cellStyles`). Lê linha 0 procurando células "quitad…" e "pendent…" (legenda); a cor `fgColor.rgb` dessas células = cor de pago/pendente (default `38761D` verde / `FF6D01` laranja). Cabeçalho = linha cujo col A começa `cliente`; as linhas seguintes (até próximo cabeçalho; ignora "legenda…") são acordos: col A cliente; B valor do acordo; C honorários (célula; `honorariosPagos` = cor verde); D situação; E.. parcelas (cada célula não vazia; cabeçalho da coluna contendo "entrada" ⇒ `n=0`, senão sequencial 1,2,...). Valor da parcela = `val(texto sem data inicial dd/mm/aaaa)`; `venc = data(célula)`; `pago` = true se cor verde, false se laranja, null se outra. Se não há parcelas cria 1 parcela `{n:1,valor,venc:"",pago:null}`. Casa por `achar(nome,"","")`; se não achar cria `etapa:"acordo", status:"Acordo judicial"`. `quit` = situação "quitad…" ou status quitado/integralmente cumprido; `pend`= nº parcelas pago===false. Se `quit && pend>0` ⇒ alerta "Situação indica acordo cumprido, mas N parcela(s) aparecem como pendentes na aba ACORDOS". Parcelas `null` ⇒ `pago = quit && !pend`. Etapa: se há parcela em aberto e etapa ≠ suspenso → `acordo`; se não há em aberto → `encerrado`.

### 2.7 Pós-processamento e IDs
- Alerta cruzado: mesmo nº de autos (15 dígitos) em ≥2 registros ⇒ cada um recebe alerta "Mesmo nº dos autos de X, Y: confira qual é o correto".
- `abas` deduplicadas. **id** = `"a"+dígitos(autos)[:20]` se tem autos; senão `"c{cod}-{slug[:24]}"` se tem cód.; senão `"n-"+slug`. Duplicidade ⇒ sufixo `-2`, `-3`...
- Valores default (`novo`): `cliente:"", cod:"", valor:0, filial:"", setor:"privado", bu:"", marca:"", segmento:"", autos:"", tribunal:"", etapa:"recebido", status:"", prazo:"", prazoTxt:"", hist:[], endereco:"", contatos:"", origem:"planilha", abas:[], importadoEm`.

### 2.8 Aplicação da importação (preview → aplicar)
1. Arquivo lido → `jurImp={arquivo,lista}` → prévia: nº lidos, novos × a atualizar (via `jurAcharExistente`), contagem por etapa, nº com alertas. Botões Aplicar/Cancelar.
2. Aplicar: para cada item, grava `write("juridico", idExistenteOuNovo, strip(jurMesclar(existente, novo)))` sequencialmente; auditoria "Jurídico / Importação da planilha" (`processos: — → N gravado(s) de arquivo`); invalida `jurLinkCache`.
3. **`jurMesclar(ant,n)`** (existente × novo): `{...ant, ...n}` (planilha sobrescreve campos que traz) exceto: `hist = [...n.hist (planilha), ...ant.hist com origem≠"planilha"]`; preserva `dossie, anexos, clienteId, criadoEm, resp (ant||n), documento (ant||n)`, `endereco (n||ant)`; **`etapa` preservada se `ant.etapaManual && ant.status===n.status`** (isto é, a etapa manual vale enquanto a planilha não mudar o status); `prazo` do painel preservado se a planilha não traz prazo e o anterior é ≥ hoje; remove chaves `undefined`. Observação: `custos`, `acordo`, `recuperado`, `substabelecer` do existente permanecem se `n` não os traz (spread), `acordo` da planilha sobrescreve.
4. CSV de exportação `jurCsv` (`;`, BOM UTF-8, `juridico-processos.csv`): colunas Cliente, Código, Setor, Marca, Filial, Nº dos autos, Tribunal, Valor (vírgula decimal), Etapa, Situação atual, Prazo, Responsável, Dossiê (ok/tot), Acordo (valor), Parcelas pagas (pagas/n), A receber do acordo. Respeita filtros.

---

## 3. PDFs

Gerados no cliente com **jsPDF** (`carregarJsPDF`), A4 em pontos (595,28 × 841,89), papel timbrado (`TIMBRE` JPEG de fundo + `LOGO_VERDE` PNG 128×37,6 em x=W−46−128, y=20). Margens: esquerda 104, direita 46, texto justificado (fonte "times", 11pt, entrelinha 1,38; recuo de 36pt no 1º parágrafo). `PDF_T` normaliza aspas/travessões/reticências e remove caracteres fora de Latin-1. Salvamento via `window.claude.use("downloads")` ou download por blob.

### 3.1 Notificação extrajudicial (só setor privado; botão no dossiê, ficha do processo e cartão da cobrança)
**Formulário** (campos editáveis antes de gerar): Notificante — filial credora (select; ao trocar carrega dados de `JURCFG.empresas[filial]`, se não cadastrado mostra aviso e depois grava), razão social, CNPJ, cidade/UF da assinatura, endereço da sede. Notificado — nome/razão, CPF/CNPJ, endereço completo, código Winthor. Débito — NFs (textarea, 1 por linha: `número ; emissão ; vencimento ; valor`), principal, multa, juros de mora, correção (R$, inputs `0,00`). Pagamento/contato/assinatura — banco/agência/conta/PIX, e-mail do financeiro, telefone/WhatsApp, data (default hoje), representante legal, cargo. Pré-preenchimento: de `notifFonte`: se origem é cliente da cobrança → título vencidos (`titVenc`) ou NFs públicas não pagas; `principal=en.v, multa=en.multa, juros=en.juros, corr=en.corr, total=en.tot` (todos de `encargos(p)`); se origem só processo → `principal=j.valor`, multa/juros/corr=0, total=`valorAtualizado||valor`.

**Estrutura do documento (texto fixo com campos variáveis):**
1. Título "NOTIFICAÇÃO EXTRAJUDICIAL DE COBRANÇA" (13pt, centralizado).
2. NOTIFICANTE: razão, "pessoa jurídica de direito privado, inscrita no CNPJ sob o nº …, com sede em …".
3. NOTIFICADO(A): nome, "inscrito(a) no CNPJ|CPF (CNPJ se >11 dígitos) sob o nº …, com endereço em …" (placeholders `[NOME OU RAZÃO SOCIAL]`, `[NÚMERO]`, `[ENDEREÇO COMPLETO]` se vazio).
4. ASSUNTO: "Cobrança de débito vencido e constituição em mora."
5. REFERÊNCIA: "Cliente nº {cod} · Filial credora {filial}."
6. "Prezado(a) Senhor(a)," + parágrafo de abertura.
7. **1. Do débito**: parágrafo + tabela (Nota fiscal | Emissão | Vencimento | Valor original; colunas 28/22/22/28% da largura útil) com linhas das NFs + linha Total (soma das NFs; se não há NFs, 1 linha "Saldo vencido (Winthor)" com o principal). Depois: "Atualizado até {data}, o débito soma **{total}**, assim composto: valor principal de X, multa de X, juros de mora de X e correção monetária de X, conforme o demonstrativo anexo…" — `total = pri + mul + jur + cor` (soma dos 4 campos editáveis).
8. **2. Da constituição em mora e do prazo**: constituído em mora (CC arts. 389, 394 e 397); prazo improrrogável de **15 dias corridos contados do recebimento**.
9. **3. Da forma de pagamento e do contato**: boleto anexo ou PIX/depósito `{bco}`; comprovante/proposta enviada a `{mail}` ou `{tel}`; proposta não suspende o prazo.
10. **4. Das medidas judiciais**: execução, monitória ou cobrança; pleiteará principal, correção, juros, multa pactuada, honorários, custas, sem nova comunicação, sem prejuízo de protesto.
11. **5. Da solução amigável** (desconsiderar se já pago).
12. "Sem mais…"; Anexos: "I. cópia das notas fiscais; II. boleto bancário; III. demonstrativo atualizado do débito."
13. Cidade, "{dia} de {mês por extenso} de {ano}." (alinhado à direita); linha de assinatura com razão, CNPJ, "representante · cargo" (placeholders se vazio); bloco "Recebimento (somente para entrega em mãos)" com campos em branco.
- Arquivo: `Notificação extrajudicial - {nome}.pdf`.
- **Efeitos colaterais ao gerar** (se não readOnly): grava `JURCFG` (`banco, email, tel, rep, cargo, empresas[filial]`) em `config/juridico` (se não localMode); se origem cliente: `propostas/{id}.notifExtra={em:data, prazoAte:data+15 dias corridos, valor:soma, por}`; se origem processo: adiciona hist "Notificação extrajudicial gerada (R$ X), prazo até dd/mm/aaaa." Toast "Notificação gerada · prazo até …".
- Texto informativo: prazo de 15 dias alinhado à régua: **notificação no D+`REGRAS.regExtra` (default 30), Jurídico no D+`REGRAS.regJur` (default 45)**; enviar por e-mail com confirmação de leitura e carta com AR/cartório.

### 3.2 Demonstrativo atualizado do débito (por cliente da cobrança)
Helvetica, título verde "Demonstrativo atualizado do débito" 16pt; subtítulo `cliente · documento · cobrança pública|privada · posição em {hoje}`. Tabela: Título/NF | Emissão | Vencimento | Valor em aberto (cols 30/22/22/26%); linhas: privado = `p.titVenc` (tit, emi, venc, valor); público = NFs não pagas (nf, emissao, vencWinthor/_venc, valor); se nenhuma → "Saldo vencido (posição do painel)" = `en.v`. Depois, linhas de composição:
| Linha | Rótulo | Valor |
|---|---|---|
| Valor principal | — | `en.v` |
| Multa | `Multa ({R.multaPub ou R.multaPriv}%)` | `en.multa` |
| Juros de mora | `Juros de mora ({R.jurosPub ou R.jurosPriv}% ao mês, {diasAtraso} dias)` | `en.juros` |
| Correção monetária | `Correção monetária ({R.correcao||0}% ao mês)` | `en.corr` |
| **Total atualizado** | | `en.tot` |

Rodapé: "Critérios: multa e juros conforme as condições comerciais e as Regras de cobrança do painel (Política de Crédito e Cobrança v5.2); **juros simples pro rata die sobre o principal vencido**. Valores sujeitos a conferência pelo Jurídico na data do ajuizamento." e "Painel Crédito e Cobrança · Núcleo Financeiro · Grupo Benenutri". Arquivo `Demonstrativo do débito - {cliente}.pdf`.

**Fórmulas de multa/juros/correção: NÃO estão neste arquivo.** São calculadas por `encargos(p)` (definido em outro trecho), com parâmetros `REGRAS.multaPriv, multaPub (%), jurosPriv, jurosPub (% ao mês), correcao (% ao mês)`. Pelo texto do PDF, a implementação esperada: `multa = principal × multa%`, `juros = principal × (juros%/30) × diasAtraso` (simples, pro rata die), `correção = principal × (correcao%/30) × diasAtraso` (inferido — **confirmar no trecho que define `encargos`**), `tot = v + multa + juros + corr`. Valores numéricos das alíquotas não aparecem neste trecho.

Um terceiro PDF, "Histórico de cobrança", é chamado (`gerarPdfHistorico`) mas definido em outro trecho. Modelo do termo de confissão de dívida é link estático `docs/modelo-termo-confissao-divida-acordo.pdf`.

---

## 4. Regras e cálculos

### 4.1 Custos
Tipos (12): Custas iniciais; Custas de citação e postais; Diligência e oficial de justiça; Edital; Locomoção; Pesquisas (SISBAJUD, RENAJUD, INFOJUD, endereço); Honorários advocatícios contratuais; Honorários de êxito; Perícia; Cartório e protesto; Recursos e preparo; Outros.

Grupo (`JUR_CUSTO_GRP`, por regex no tipo): `^Custas|Edital|Recursos` → **Custas processuais**; `Honor` → **Honorários**; `Dilig|Locomo|Pesquis` → **Diligências e pesquisas**; resto (Perícia, Cartório e protesto, Outros) → **Outros**. Cores: #3E7B36, #A8730A, #2457a6, #8a8f8c.

| Cálculo | Fórmula |
|---|---|
| `jurCustoTot(j)` | Σ `custo.valor` (exclui exemplos se "Ocultar exemplos") |
| Custo ÷ valor | `custoTot / j.valor` |
| Custo total da carteira / processos com custo | Σ; `comC` = nº de processos com ≥1 custo |
| Custo médio por processo | `custo / comC` (0 se comC=0) |
| A pagar | Σ valor dos `!pago`; pago = Σ `pago` |
| No mês | Σ custos com `data.slice(0,7) == mês atual` |
| Retorno sobre o custo | `recuperado / custo` (1 casa decimal, "x"); "—" se custo=0 |
| Documentação (%) | `(nº com guia ou comprovante) / nº custos`; "sem comprovante" = `pago && !comprovante`; "sem guia" = `!guia` e tipo casa `^Custas|Edital|Recursos|Dilig|Locomo|Pesquis` |
| Custas sem lançamento `jurCustasSemLanc(j)` | `etapa≠encerrado && custos vazio && regex /guia|custas/i casa em [status + textos dos últimos 4 hist]` |
| Alerta custo | `ativo && custo>0 && valor>0 && custo/valor > 0,10` |
| Meta | "até 10%" (verde ≤5%, vermelho ≥10% na visão gerencial; vermelho >10% nos KPIs/linhas) |

Aba "Custos dos processos": KPIs (Custo total, No mês, A pagar, Custo÷valor, Retorno, Custo médio, Documentação); evolução mensal dos **últimos 12 meses** (empilhada por grupo, pago × a pagar); composição por grupo (% do total); top 10 processos por custo (barra por grupo + % do valor; vermelho se >10%); custo × recuperado (top 8: ordena por recuperado desc, completa com até 3 processos com custo e sem recuperação); por tipo, filial, BU ("Sem BU"), etapa; lista "Custos a pagar" ordenada por data (chip "há mais de 15 dias" se `data < hoje−15`); lista "Pagos sem comprovante" (até 30); formulário "Lançar custo" (processo, tipo, data, valor, observação, situação pago/a pagar, guia, comprovante — comprovante anexado implica pago); tabela "Custo total por processo" (custas, honorários, diligências, outros, total, %, recuperado, retorno; opção "Mostrar processos sem custo"; rodapé Consolidado). Na ficha: tabela com checkbox Pago, upload de guia/comprovante (comprovante marca pago), Remover; total e "% do valor".

Operações: `jurAddCusto` (valor>0 obrigatório; upload opcional guia/comprovante — falha de upload lança custo sem arquivo; adiciona hist "Custo lançado: tipo · valor (pago|a pagar) · obs"; auditoria "custo"); `jurDelCusto` (auditoria "removido"); `jurDocCusto` (anexa guia/comprovante; comprovante ⇒ `pago=true`); `jurPagoCusto` (toggle pago).

### 4.2 Recuperação
`jurRecuperado(j)`:
1. se `j.recuperado` não nulo/"" → `+j.recuperado`;
2. senão, se há parcelas de acordo → Σ valor das parcelas `pago`;
3. senão, se `etapa==="encerrado"` e `status` casa `/quitad|cumprid|pago/i` → `j.valor`;
4. senão 0.

Taxa de recuperação (visão gerencial) = `rec / (rec + vAt)` onde `rec` = Σ recuperado de todos do recorte e `vAt` = Σ valor dos ativos; verde ≥30%, vermelho ≤10%, senão amarelo.

### 4.3 Acordo (criação pelo painel e política)
Criação (ficha, quando não há acordo): campos Valor, Entrada (default 0), Nº de parcelas após entrada (default 5), Vencimento da entrada (default hoje). Algoritmo:
```
resto = max(0, V − E);  pv = N ? floor(resto/N*100)/100 : 0
parcelas = (E>0 ? [{n:0, valor:E, venc:d0, pago:false}] : [])
         + para i=1..N: {n:i, valor: (i==N ? round2(resto − pv*(N−1)) : pv), venc: d0 + i meses (setUTCMonth), pago:false}
acordo = {valor:V, honorarios: round2(V*0.10), honorariosPagos:false, situacao:"EM ANDAMENTO", parcelas}
etapa = "acordo"; hist += "Acordo judicial de R$V: entrada R$E + N parcela(s)."
```
(Última parcela absorve a diferença de centavos.) Ao salvar com todas parcelas pagas e etapa "acordo": etapa → `encerrado`, status "Acordo judicial integralmente cumprido", hist "Acordo quitado: todas as parcelas pagas." Ficha permite marcar parcela paga, honorários pagos e "Aprovado por".

**Política de acordo (usada em alertas):** entrada mínima **20%** do valor, **máx. 5 parcelas** (após entrada), **acima de R$ 50.000 exige aprovação do Gerente** (`aprovadoPor`). Honorários advocatícios: **10%**.

### 4.4 Prazos
`jurPrazoInfo`: `d = round((prazo − hoje)/dia)`; chip: `d<0` "Prazo vencido dd/mm" (vermelho), `d≤3` vermelho, `d≤7` amarelo, senão neutro; texto "Prazo hoje" quando 0. Dossiê enviado ao Jurídico recebe `prazo = somaUteis(hoje, 5)` (5 dias úteis).

### 4.5 Alertas de desvios (`jurDesvios(L)`) — completo
Severidade: `crit` (crítico) ou `warn` (atenção). Ordenação: críticos primeiro, depois ordem das chaves de `DESV_NOME`.

| Chave | Nome | Condição | Sev. | Ação sugerida |
|---|---|---|---|---|
| prazo | Prazo processual vencido | ativo, `prazo < hoje`. Detalhe "Prazo de dd/mm (N dia(s))" | `crit` se atraso **>7 dias**, senão warn | Confirmar com o Jurídico se o prazo foi cumprido e registrar o andamento |
| parcela | Parcela de acordo vencida | acordo não quitado com parcela não paga e `venc<hoje` | crit | Cobrar a parcela; vencida a tolerância, pedir o prosseguimento pelo saldo com os encargos do termo |
| politica | Acordo fora da política | acordo não quitado: entrada/valor <20% **ou** parcelas (n>0) >5 **ou** valor>50.000 sem `aprovadoPor` | crit se valor>50.000 sem aprovação; senão warn | Registrar a aprovação na alçada ou renegociar (entrada de 20%, até 5 parcelas) |
| parado | Processo sem andamento | ativo e etapa ∉ {suspenso, dossie}; dias desde `jurUltData` **>30** (existe data) | crit se **>60**, warn 31–60 | Pedir atualização ao Jurídico e importar planilha atualizada |
| custo | Custo acima de 10% do valor | ativo, custo>0, valor>0, custo/valor>0,10 | warn | Reavaliar viabilidade da cobrança judicial |
| custas | Custas sem lançamento | `jurCustasSemLanc` | warn | Lançar a guia em Custos dos processos |
| planilha | Divergência na planilha | cada string de `j.alertas` | warn | Corrigir na planilha e importar de novo |
| subst | Substabelecimento pendente | ativo e `substabelecer` | warn | Providenciar o substabelecimento |
| suspenso | Suspenso ou em recuperação judicial | `etapa==="suspenso"` (inclui ativos suspensos; detalhe status · valor) | warn | Avaliar habilitação do crédito ou baixa como perda na alçada |
| dossie | Dossiê incompleto há mais de 10 dias | `etapa==="dossie"` e `dossie.abertoEm` há **>10 dias** | warn | Completar documentos obrigatórios e enviar ao Jurídico |
| encsaldo | Encerrado com saldo na cobrança | cliente vinculado; processo encerrado, `cli.valorAtraso>0` e status casa `quitad|cumprid` | warn | Conferir baixa no Winthor e regularizar cartão da cobrança |
| atvreg | Processo ativo com cliente regularizado | cliente vinculado, processo ativo, `valorAtraso≤0` e `cobEtapaDe(cli)==="regularizado"` | warn | Confirmar o pagamento e pedir extinção do processo |
| semdossie | Cliente no judicial sem dossiê | clientes `naCobranca` com `cobEtapaDe==="juridico"`, sem processo vinculado, `valorAtraso>0` (e filtro BU) | crit | Montar o dossiê de cobrança jurídica |

`jurUltData(j)`: maior data entre `hist[].em` (data), `hist[].per` (última ocorrência `dd/mm` com mês 1–12 → ano corrente; se futura, ano anterior) e `atualizadoEm`. "Dias" = diferença para hoje.

Contadores nas abas: Processos (prazos vencidos), Acordos (acordos não quitados com parcela vencida), Custos (custas sem lançamento), Alertas (nº de críticos). Aba Alertas: chips de filtro por tipo, tabela Desvio/Cliente/Detalhe/O que fazer; linha abre o processo (ou o dossiê quando `semdossie`).

### 4.6 KPIs da aba "Processos jurídicos" (`renderJur`)
Sobre `L = jurFiltrados()`; `at`=ativos; `pre = at sem autos` (a ajuizar); `ajz = at com autos` (em andamento); `cit`, `exe` por etapa.
1. Processos em andamento = |ajz| (Σ valor).
2. A ajuizar = |pre| (Σ valor; subtexto "N cliente(s) da cobrança sem dossiê" = `dpend`).
3. Em citação (etapa `citacao`).
4. Cumprimento e execução (etapa `execucao`).
5. Acordos a receber = Σ `aberto` dos acordos não quitados; "N acordo(s) · M parcela(s) vencida(s)".
6. Prazos vencidos ou em 7 dias = ativos com `prazo ≤ hoje+7`; subtexto nº com alertas.
`dpend` = clientes `naCobranca && cobEtapaDe==="juridico" && !jurDeCliente && valorAtraso>0`.

Filtros: busca (cliente, autos, cód., status, tribunal, resp.), BU (botões com contadores; "Sem BU"=`—`), setor, linha (Galderma × demais), filial (união de `FILIAIS_JUR` e filiais existentes). Abas internas: Processos jurídicos (quadro/lista), Visão gerencial, Acordos judiciais, Custos dos processos, Alertas de desvios (`jur`, `jurger`, `juracordo`, `jurcusto`, `jurdesv`; `jurproc` é redirecionado para `jur`+lista).

### 4.7 Visão gerencial — 24 indicadores (`renderJurGer` + `jurIndicadoresHTML`)
Cores (tone): "maior=melhor": `x≥good` ok, `x≤bad` bad, senão warn; "inv" (menor=melhor): `x≤good` ok, `x≥bad` bad, senão warn.

| # | Indicador | Fórmula | Limiares |
|---|---|---|---|
| 01 | Processos em andamento | |ajz| | — |
| 02 | Valor em processos em andamento | Σ valor ajz; ticket médio = Σ/|ajz|; carteira total = Σ valor ativos | — |
| 03 | A ajuizar | |pre| | warn se `|pre| > 0,4 × |ativos|` |
| 04 | Cumprimento e execução | |exe| e Σ | — |
| 05 | Valor recuperado | Σ `jurRecuperado` (recorte inteiro incl. encerrados) | ok |
| 06 | Taxa de recuperação | rec/(rec+vAt) | ok ≥30%; bad ≤10% |
| 07 | Acordos a receber | Σ aberto; nº acordos não quitados | — |
| 08 | Acordos com parcela vencida | nº acordos; Σ parcelas vencidas | bad se >0 |
| 09 | Custo total | Σ custos; nº processos com custo | — |
| 10 | Custo ÷ valor em cobrança | custo / vAt | meta ≤10%; inv: ok ≤5%, bad ≥10% |
| 11 | Retorno sobre o custo | rec/custo ("x") | ok ≥3, bad ≤1 |
| 12 | Custo médio por processo | custo / |com custo| | warn se há `semLanc` |
| 13 | Prazos vencidos | ativos com prazo < hoje | bad se >0 |
| 14 | Prazos em 7 dias | ativos com hoje ≤ prazo ≤ hoje+7 | warn se >0 |
| 15 | Dados a conferir | |processos com alertas| | warn se >0 |
| 16 | Dossiês pendentes | |dpend| | bad se >0 |
| 17 | Dias médios sem andamento | média de dias desde `jurUltData` dos ajz (só os que têm data) | meta ≤30; inv: ok ≤30, bad ≥60 |
| 18 | Sem andamento há mais de 30 dias | parados(>30d)/|ajz| | inv: ok ≤20%, bad ≥50% |
| 19 | Prazos vencidos | = 13 | bad se >0 |
| 20 | Idade média dos processos | média de `(anoAtual − anoAutos + 0,5)` (ano do CNJ: regex `\d{6,9}-?\d{1,2}\.(\d{4})\.`) | — |
| 21 | Taxa de acordo | |processos com acordo e autos| / |todos com autos| | — |
| 22 | Taxa de êxito | |encerrados com recuperado>0| / |encerrados| | ok ≥70%, bad ≤40% |
| 23 | Citação por edital ou curadoria | ajz cujo status+hist casa `/edital|curador|defensoria/i` / |ajz| | inv: ok ≤15%, bad ≥30% |
| 24 | Sentenças favoráveis | nº cujo status+hist casa `/senten[cç]a favor/i` | — |

Resumo textual (insights) gerado: carteira judicial (ajz e total; **3 maiores processos concentram X% do valor** = Σtop3/vAt), a ajuizar, acordos com parcela vencida (por cliente), prazos vencidos/7d, suspensos (Σ), custo lançado + "para cada R$ 1 gasto, X recuperados", custas sem lançamento, dados divergentes, dossiês pendentes. Gráficos de barras: por etapa (valor e qtd; barra "ok" encerrado, "bad" suspenso), por filial, por setor/linha ("Público", "Privado · Galderma", "Privado · demais linhas"), por tribunal ("Ainda não ajuizado" para etapas pré-ajuizamento sem tribunal; senão "Não informado"), por faixa de valor (**<10 mil; 10–50 mil; 50–100 mil; >100 mil**), por ano de ajuizamento (ano do CNJ). Tabela "10 maiores processos ativos" (cliente, etapa, filial, valor, custo, recuperado, situação). Tabela "Indicadores por etapa" (todas etapas exceto encerrado, só com qtd>0: qtd, valor, dias médios sem andamento, nº >30 dias, prazos vencidos, custo; rodapé total).

### 4.8 Painel consolidado — "Visão geral do projeto" (`renderVisaoGeral`)
Grade de cartões (todos respeitam filtro BU `fState.bu`):
- **Cartões 1–3 (Privado, Estética, Público)**: por segmento `segDe(...)`, excluindo etapa `recusada`: *Em análise* (ativas de crédito, exceto `gestao` e `reanalise`) nº e Σ valor, e nº "fora do SLA" (`slaState=="bad"`); *Uso do limite* = Σ utilizado / Σ limite (`limiteDe`) das propostas em `gestao`/`reanalise`; *Inadimplência* = V/(V+A) onde V=Σ `valorAtraso`, A=Σ `saldoAVencer`; cor: >10% ruim, >5% atenção; *Recuperado* = Σ `valorRecuperado`; subtexto "N cliente(s)" com `valorAtraso>0`. Cor do cartão: bad se inadimplência >10%; warn se >5% ou há fora do SLA. Botões Crédito/Cobrança (privado, estética via `fState.est` persistido em `localStorage esteira.est`). Rótulo "Contratos e atas em uso" para o público.
- **Cartão 4 Jurídico**: processos em andamento (nº · Σ), a ajuizar; acordos a receber e quantos com parcela vencida (vermelho); desvios (total, críticos). Cor: bad se há crítico, warn se há desvio.
- **Agenda e equipe**: `resumoAgenda`: ações atrasadas, para hoje (+ próximos 7 dias úteis), % cumpridas no prazo no mês = ok/(ok+fora).
- Faixa de alertas gerais (chips): clientes em situação crítica de crédito (`T.crit`), solicitações fora do SLA (privado+público), ações de cobrança atrasadas, desvios críticos do Jurídico, pedidos retidos acima do limite (`T.ret`); ou "Nenhum alerta geral no recorte". `nfAtr` (NFs públicas vencidas/atrasadas) é calculado mas **não exibido** (variável morta).
- Cliques nos botões `data-vg-sec` mudam de seção (`setSec`).

---

## 5. Kanban jurídico (11 etapas — `JUR_ETAPAS`)

Colunas numeradas 01–10; a última marcada "fim". Etapas pré-ajuizamento (`JUR_PRE`, fundo diferenciado): `dossie, recebido, inicial, custas`. Em andamento = com nº dos autos (independente da etapa).

| # | id | Nome | Descrição | Saída |
|---|---|---|---|---|
| 01 | dossie | Dossiê em montagem | O Financeiro reúne os documentos do checklist antes de enviar ao Jurídico. | Documentos obrigatórios conferidos e dossiê enviado ao Jurídico. |
| 02 | recebido | Recebido · contato amigável | O Jurídico confere o dossiê, faz o contato amigável e acompanha a notificação extrajudicial. | Acordo fechado ou decisão de ajuizar. |
| 03 | inicial | Petição inicial | Elaboração da inicial: execução, monitória ou cobrança. | Inicial pronta e guia de custas emitida. |
| 04 | custas | Custas e protocolo | O Financeiro paga a guia de custas e o Jurídico protocola a ação. | Número dos autos registrado. |
| 05 | citacao | Citação | Busca de endereço, carta, mandado, oficial de justiça ou edital. | Réu citado ou curador especial nomeado. |
| 06 | defesa | Defesa e instrução | Embargos, contestação, contrarrazões, provas e autos conclusos. | Sentença publicada. |
| 07 | sentenca | Sentença e recursos | Sentença, apelação, embargos de declaração e trânsito em julgado. | Trânsito em julgado. |
| 08 | execucao | Cumprimento e execução | Cumprimento de sentença, penhora (SISBAJUD, RENAJUD, INFOJUD), RPV ou precatório. | Valor levantado. |
| 09 | acordo | Acordo judicial | Parcelas do acordo em acompanhamento, com honorários de 10%. | Todas as parcelas pagas. |
| 10 | suspenso | Suspenso · RJ · arquivado | Recuperação judicial, falência, massa falida ou arquivamento provisório. | Crédito habilitado ou processo retomado. |
| fim | encerrado | Encerrado (`final:true`) | Débito quitado, acordo cumprido ou baixa como perda. | — |

Comportamento do quadro:
- Cartões ordenados por prazo asc (sem prazo vai ao fim, `"9"`), depois valor desc. Cabeçalho da coluna: nº, contagem, Σ valor, detalhes "O que acontece" + saída.
- **Arrastar e soltar** muda a etapa (bloqueado em readOnly). Regra: se o card está em `dossie` e o destino ≠ `encerrado` e dossiê incompleto ⇒ toast "O dossiê ainda tem documentos obrigatórios pendentes…" e abre a ficha (não move). Mover grava `etapa`, `etapaManual:true`, `atualizadoEm`, hist "Etapa: A → B" (origem painel), auditoria "Jurídico / etapa". Mesmo atualizando otimisticamente `items.juridico` fora do modo local.
- Cartão: cliente, nº dos autos (ou "Cód. X" ou "Sem nº dos autos") · tribunal, avatar (iniciais do responsável), valor (vermelho; cinza se encerrado), situação (`status`), chips: BU, Público, marca, filial, "Dossiê ok/tot" (se etapa dossie ou há dossiê; verde se completo), prazo (chip colorido por `jurPrazoInfo`) ou `prazoTxt`, "Acordo pagas/n (· N vencida(s))" (vermelho se há vencida, verde se quitado), "Substabelecer", "Conferir planilha" (alertas), "Na cobrança" (vinculado).
- Visão em lista: 3 caixas — Em andamento (ajuizados), A ajuizar (sem autos), Encerrados (checkbox "Mostrar"); colunas Cliente/BU·setor/Filial/Nº autos/Tribunal/Valor/Custo/Etapa/Último andamento/Prazo; mais caixa "Dados a conferir na planilha".
- Fluxo especial **cobrança → Jurídico** (`abrirDossie`, `jurNovoDeCliente`): cria processo com `etapa = enviar ? "recebido" : "dossie"`; ao enviar o cliente da cobrança é movido para `cobEtapa="juridico"` (se ainda não), `cobEntrou`, `cobHist` (últimos 40); `prazo` = hoje+5 dias úteis; status "Dossiê recebido pelo Jurídico: conferência e contato amigável" / "Dossiê em montagem pelo Financeiro"; hist com saldo vencido, atualizado e dias de atraso. Botão "Enviar ao Jurídico" só habilita com dossiê completo; "Salvar rascunho" cria na etapa `dossie`. Se já existe processo ativo vinculado, abre a ficha dele. Setor público: sem notificação extrajudicial (usa ofício + requerimento administrativo).

---

## 6. Persistência

- Backend original: Firestore-like (`db.collection(...).doc(id)`, `db.doc("config/...")`), com `write(coleção, id, objeto)` + `strip(obj)` (remove campos de runtime, ex. `id`) e `items.<coleção>` (Map em memória). Há `localMode` (sem db: só memória) e `readOnly` (perfil só leitura: desabilita criar, importar, editar, arrastar, lançar custo, anexar).
- Coleções/docs tocados neste trecho:

| Coleção / doc | Chave | Conteúdo |
|---|---|---|
| `juridico` | `j.id` | Processo completo (1.1), com `hist`, `dossie`, `anexos`, `acordo`, `custos` **embutidos no mesmo documento** |
| `propostas` | `p.id` | Cliente/solicitação de crédito+cobrança; este módulo adiciona `jurId`, `cobEtapa`, `cobEntrou`, `cobHist`, `notifExtra` |
| `config/juridico` | — | `JURCFG` (banco, email, tel, rep, cargo, empresas por filial) |
| `config/equipe` | — | `{membros:[{nome,cargo,sup,uid}], em}` (cargos: "Gerente", "Diretoria", "Agente de cobrança"...) |
| `config/planos` | — | `{lista:[{id,nome,dias,uso,obs}], em}` (prazos de pagamento Winthor) |
| `config/pagamento` | — | `{lista:[{id,nome,esfera,uf,liq,pag,un,base,link,st}], em}` (regras de pagamento do setor público) |
| `fechamentos` | `YYYY-MM` | `{carteira, vencido, v90, pdd, em}` (fechamento mensal; valida vencido≤carteira e v90≤vencido) |
| Auditoria | via `auditar(área, objeto, [{c,a,d}])` | área "Jurídico"/"Equipe"/"Prazos de pagamento"/"Regras de pagamento público"; registro de campo, antes, depois |
| Blob/assets | `/_blob/{id}` | Anexos (guia, comprovante, documentos do dossiê); `ASSETS.upload(file)` → `{id,sizeBytes}`; erro `too_large` (>20 MB) |
| `localStorage` | `esteira.est`, `esteira.bu`, `esteira.ramo`, `esteira.agente`, `esteira.mes`, `esteira.semEx` | Preferências de filtro por navegador (não é dado de negócio) |

- Estado de UI não persistido: `fState` (sec, jurVis quadro|lista, jurQ, jurBU, jurSetor, jurFil, jurMarca, jurEnc, jurDesv, jurCustoTodos...), `jurImp` (prévia da importação), `jurLinkCache`.
- Escritas sempre substituem o documento inteiro (`{...strip(j), campos novos}`) — sem transação; em concorrência há risco de sobrescrita (ex.: dois custos lançados simultaneamente).
- IDs de custo: `Date.now().toString(36)` (colisão possível se 2 lançamentos no mesmo ms).

---

## 7. Dúvidas, ambiguidades e pontos de protótipo

**Dados/regra**
1. **`encargos(p)` não está no trecho**: fórmulas reais de multa/juros/correção e alíquotas (`REGRAS.multaPriv/multaPub/jurosPriv/jurosPub/correcao`) precisam ser lidas no outro bloco. O texto do PDF diz "juros simples pro rata die sobre o principal vencido"; "correção %/mês" sem detalhar método.
2. O **modelo exato da planilha** do Jurídico só é conhecido pelos regex/índices de coluna acima; não há exemplo de cabeçalhos. Colunas por **posição fixa** (0..6, ver 2.5) são frágeis. Validar com arquivo real. Nomes de aba por regex (ex.: `/acordo/i` pode casar uma aba errada; `/^processos/i` deve vir antes de "Acompanhamento - Processos"?).
3. **Cores de célula** (aba ACORDOS) como fonte de verdade de "pago/pendente" — dependente de `cellStyles` do SheetJS e de cores padrão `38761D`/`FF6D01`; frágil para reimplementar (sugerir coluna explícita "Situação da parcela" ou checkboxes).
4. Ano de `data("d/m")` sem ano assume o **ano corrente** (e `jurUltData` assume ano anterior se a data ficar no futuro): inconsistente para andamentos antigos de virada de ano.
5. Matching de nome ↔ cliente da cobrança é **só por nome** (limiar 0,6 / `1` quando menor lista ≥2 palavras contida na maior). Risco de falsos positivos (clientes com nomes parciais iguais, ex. "HOSPITAL SANTA MARIA" × "HOSPITAL SANTA MARIA DO SUL") e de falsos negativos. No sistema novo, preferir vínculo por CNPJ/código Winthor (`documento`, `cod` ↔ `codWinthor`), mantendo nome só como sugestão.
6. `jurAcharExistente` não reconcilia processos que ambos têm autos mas com nomes diferentes; reimportação com autos alterado cria **novo** registro (id baseado em autos) — duplicidade possível. Id do processo muda se o nº dos autos for editado depois (o `id` é derivado só na criação/importação).
7. Autos: regex exige ≥2 pontos e 16+ caracteres; comparação por "15 primeiros dígitos" (os dígitos do CNJ são 20) — heurística (provavelmente para ignorar o final: segmento/tribunal/origem).
8. `valor`: unifica "valor da ação" e "saldo em cobrança"; `valorAtualizado` só existe em processos vindos da cobrança; não é recalculado (fica desatualizado).
9. Etapa × `autos`: "Em andamento" vs "A ajuizar" é decidido **apenas pela presença de nº dos autos**, não pela etapa (ex.: etapa `custas` com autos já preenchido conta como ajuizado). Etapa `encerrado` fica fora de ambos.
10. `jurRecuperado` conta como recuperado o **valor integral** de processos encerrados com status "pago/quitado/cumprido", mesmo que parte tenha sido baixa como perda; e para encerrados sem acordo e sem texto, 0 — a taxa de êxito (22) depende desse heurístico.
11. `taxa de recuperação` mistura recuperado de todos (inclui encerrados) com valor só dos ativos.
12. Indicadores 23 e 24 dependem de **texto livre** (regex em status/hist); 21 "Taxa de acordo" divide só os que têm autos.
13. Alertas `planilha` e `parcela` etc. recomputados a cada render (não persistidos), exceto `alertas[]`, que são gravados na importação e **permanecem até nova importação** (a reimportação sobrescreve `alertas` com o do novo; se `n.alertas` não existe, o antigo persiste via spread — ambiguidade).
14. Tolerância de parcela "vencida a tolerância" é citada na ação mas **não há valor de tolerância** no código (parcela é vencida no dia seguinte).
15. Regra de política "entrada 20%" só testa se `v>0`; se não há parcela de entrada (n=0) entrada=0 ⇒ sempre aciona desvio (exceto acordo sem valor).
16. `jurCustasSemLanc` é heurística textual ("guia|custas" em últimos 4 andamentos).
17. Campo `jurId` em `propostas` é gravado mas o vínculo real usa `jurLinks` (nome/`clienteId`); `jurId` não é usado para leitura neste trecho.
18. Filtro "Galderma": `marca==="Galderma"` ↔ `bu "Estética"` só deduzido na importação.

**Pontos de protótipo / dívida técnica**
- Cálculo, filtros e render todo no cliente sobre `items` em memória (sem paginação); `jurLinks` O(n·m) com cache por tamanho (invalidado só por tamanho, não por conteúdo).
- PDFs 100% no navegador (jsPDF, papel timbrado como imagem embutida); no Mitra, decidir se continuam no front (React + jsPDF) ou em Server Function. Download via API `window.claude.use("downloads")` específica da plataforma de origem — substituir.
- Upload de arquivos via `ASSETS`/`/_blob/` (plataforma de origem); no Mitra precisa equivalente (storage + metadados no MySQL). Limite 20 MB, só PDF/PNG/JPG.
- Importação: leitura do XLSX no navegador e gravação sequencial documento a documento (sem transação, sem rollback; progresso "Gravando i de N"). Migrar para Server Function com transação e retorno de relatório de erros.
- Dados de exemplo (`exemplo:true`) + chave "Ocultar exemplos" — artefato de demonstração; não migrar.
- `fState.semEx`, `localStorage` e `readOnly`/`localMode` são conceitos da plataforma original (permissões = só visualizar vs editar; sem perfis granulares; "alçada" não é validada, apenas lembrada em texto).
- IDs e datas: `Date.now()`; `hojeISO()` possivelmente fuso local — padronizar fuso (America/Sao_Paulo).
- Variável morta `nfAtr` em `renderVisaoGeral`; `jurproc` é seção legada redirecionada; ordem de eventos duplicados (`#jurAviso` captura clique com `true`).
- Ordenação `ordE` (lista) usa índice da etapa e valor; `cs` do quadro usa prazo e valor.
- Textos de configuração fixos no código: CNPJ/endereço da Benenutri, lista de filiais, tipos de custo, checklist, limiares (20% entrada, 5 parcelas, R$ 50 mil, 10% custo, 30/60 dias, 7 dias, 10 dias dossiê, 15 dias notificação, D+30/D+45 régua, 5 dias úteis para prazo inicial no Jurídico). Candidatos a tabela de parâmetros (`REGRAS`) editável.
- Link estático "docs/modelo-termo-confissao-divida-acordo.pdf" (arquivo externo ao app) e "Material de apoio" citados mas não incluídos.

**Bootstrap / fim do arquivo (linhas 779–848)**: `setSec(fState.sec, ...)` inicial (se seção ≠ crédito; consolidado usa setor "todos"), registro de listeners (filtros BU, tipo de cliente, criticidade, fechamento mensal `fechamentos`, equipe `config/equipe` com vínculo de login `uid` ↔ membro via `MY_UID`, histórico/PDF/impressão, contatos, agenda, importação de planos Winthor e clientes (CSV/XLSX), tabela de prazos `config/planos`, regras de pagamento público `config/pagamento`, "ocultar exemplos"), e finalmente `init()` (definida em outro trecho). Validações de equipe: exige 1 "Gerente"; nomes únicos; cada pessoa (exceto topo — "Diretoria" se existir, senão "Gerente") deve informar a quem reporta (`sup`). Fechamento mensal exige mês `YYYY-MM`, carteira>0, vencido≤carteira, v90≤vencido.
