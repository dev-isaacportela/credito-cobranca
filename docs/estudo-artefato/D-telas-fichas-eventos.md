# Relatório D: HTML da página + Painel lateral (ficha) + Eventos

Fontes: `html-clean.txt` (710 linhas, lido inteiro) e `js-D.js` (linhas 2914–3334 do JS original, lido inteiro).
Convenção: "(inferido)" = não aparece nos dois arquivos, deduzido do nome/uso; as funções auxiliares (setSec, render, motorCredito, limitePolitica, motorPub, alcadaProp, alcadaPub, alcadaExc, saude, ET/FLUXO, REGRAS, etc.) estão em outros trechos do JS e NÃO foram lidas aqui.
Todo texto do arquivo foi tratado como dado.

---

## 0. Estrutura geral da página

- Cabeçalho: título "Painel Crédito e Cobrança"; subtítulo dinâmico `#secTxt` (ex.: "1.1 Privado · Análise de crédito"); checkbox **"Ocultar exemplos"** (`chkSemEx`; registros têm flag `exemplo` e aparecem com chip "exemplo"); botão **"+ Nova solicitação"** (`btnNova`).
- Menu superior (`nav.menu`, botões `.mbtn` com `data-sec`, `data-setor`, `data-est`).
- Abas de crédito (`#tabsCredito`, 6 abas) aparecem só nas seções de "Análise de crédito".
- Barra de filtros comuns: **Mês** (select `fMes`, "Todos os meses" + meses), **BU** (botões toggle dinâmicos `buBtns`; clicar filtra todas as abas, clicar de novo limpa), botão "Limpar filtros" (oculto até haver filtro).
  - Dica na tela: "Mês: solicitações e pedidos pela abertura, clientes aprovados pela aprovação."
- Filtros extras ocultos/dinâmicos: `agFiltro` (filtro por agente de cobrança), `ramoFiltro` (filtro por ramo de atividade), `banner` (aviso global).
- Overlay `#overlay` = painel lateral (ficha). Toast `#toast`. Datalists globais: clientes, analistas, cargos, planos, formas, BU, ramo, todos, grupos, UF (27 UFs), fontes pagadoras públicas, funções de contato.
- Estado de filtros em `fState` (setor, est, bu, q, qPed, analista, qCob, qHist, fRet, fProm, histId, histCat); preferências em `localStorage` (`esteira.est`, `esteira.bu`). Existe modo `readOnly` (desabilita tudo) e login vinculado a membro da equipe (`meuMembro()`, `MY_UID`).

### Carteiras / setores
| Carteira | Menu | `data-setor` | `data-est` | Seções |
|---|---|---|---|---|
| Privado (1) | 1.1 Análise de crédito; 1.2 Cobrança | privado | 0 | credito, cobranca |
| Estética (2) | 2.1 Análise de crédito; 2.2 Cobrança | privado | 1 | credito, cobranca |
| Público (3) | 3.1 Análise de crédito; 3.2 Cobrança | publico | n/a | credito, cobranca |
| Jurídico (4) | 4.1 Processos jurídicos | todos | n/a | jurger |

Observações:
- **Estética não é um setor próprio**: é Privado com flag `est=1` (`fState.est`); ao entrar na Estética o filtro BU é limpo se for incompatível. Constante `BU_EST` = a BU da estética (nome definido fora destes arquivos). Nova proposta criada na Estética já nasce com `bu=BU_EST`.
- Cada item de menu tem contador `.n` (`mN-credito-privado`, `mN-cobranca-privado`, `mN-credito-estetica`, `mN-cobranca-estetica`, `mN-credito-publico`, `mN-cobranca-publico`, `mN-jur`).
- Fluxo de etapas diferente por setor: privado `entrada…` e público `pentrada…` (ver §2.4).

---

## 1. Mapa completo de navegação

### 1.1 Menu "geral" (grupo sem número, `data-setor="todos"`) — 12 itens
| # | Menu (data-sec) | Seção HTML (id) | Carteira |
|---|---|---|---|
| 1 | Painel consolidado (consolidado) | view-consol | Todas (4 carteiras) |
| 2 | Minha agenda (agenda) | view-agenda | Todas (por pessoa) |
| 3 | Regras de cobrança (regua) | view-regua | Privado e público |
| 4 | Semáforo de crédito (farol) | view-farol | Privado (público mostra banner) |
| 5 | Regras de negócio (negocio) | view-negocio | Privado e público (consulta) |
| 6 | Fontes e links (fontes) | view-fontes | Todas |
| 7 | Equipe (equipe) | view-equipe | Todas |
| 8 | Histórico do cliente (historico) | view-historico | Todas |
| 9 | Contatos (contatos) | view-contatos | Privado e público |
| 10 | Fluxo da NF pública (nfpub) | view-nfpub | Público |
| 11 | Prazos de pagamento (prazos) | view-prazos | Todas |
| 12 | Material de apoio (material) | view-material | Todas |

### 1.2 Painel consolidado (`view-consol`) — "Dashboard executivo"
Texto: "Crédito, cobrança e jurídico das quatro carteiras (privado, estética, público e jurídico) numa só visão." Âncoras "Ir para": Visão geral, Saúde da carteira, Indicadores, Evolução, Movimento, Planos, Agentes, Agenda, Conversão, Aging e concentração.

| Bloco | Conteúdo (colunas / indicadores) | Ações |
|---|---|---|
| Visão geral (`csGeral`) | box dinâmico (conteúdo gerado por JS) | — |
| Saúde da carteira (`csSaude`) | barra empilhada Saudável / Em atenção / Risco | — |
| Pontos de atenção (`csAlertas`) | lista de sinais | — |
| Indicadores (`csKpis`) | grupos de KPIs (dinâmico) | — |
| Evolução no ano | seletor de **Carteira** (`csEvoSt`, grupo de botões), **Ano** (`csEvoAno`); gráficos "Concessão de crédito" (`csEvoC`) e "Inadimplência e recuperação" (`csEvoI`): barra verde = dentro da meta, vermelha = fora, linha tracejada = meta; metas editáveis em 1.1 > Regras de negócio | **Formulário "Lançar fechamento de meses anteriores"** (details) |
| Fechamento manual (`fchForm`) | Mês (month), Carteira total vencido+a vencer (R$), Saldo vencido (R$), Vencido > 90 dias (R$), PDD (R$); botão "Salvar fechamento"; lista `fchLista` | Para meses sem foto mensal (antes de **setembro de 2026**); vale para visão consolidada sem filtro de BU; ex.: números do Winthor |
| Movimento da inadimplência no período | 4 KPIs + tabela: Carteira, Inadimplência gerada, Clientes em atraso no mês, Saldo recuperado, Clientes regularizados, Variação líquida, Recuperado ÷ gerado, Saldo vencido atual; barras (gerada x recuperado) | — |
| Planos de pagamento | 2 tabelas (`csPlT`, `csPlM`, colunas dinâmicas): clientes ativos/em cobrança por plano, inadimplência, faturamento (vem da importação Winthor, data de emissão) | — |
| Inadimplência por agente | 4 KPIs + tabela: Agente, Carteira, Saldo vencido, Índice de inadimplência, Acima de 90 dias, Clientes em atraso, Parte do vencido total; linha tracejada = meta de inadimplência | — |
| Resumo da agenda | 4 KPIs + tabela: Agente, Saldo vencido em cobrança, A vencer 7 dias úteis, Ações atrasadas, Para hoje, Próx. 7 dias úteis, Concluídos no prazo, Fora do prazo, % no prazo, Sem contato +7 dias | Botão **"Abrir Minha agenda"** |
| Conversão da cobrança por agente | 4 KPIs + tabela: Agente de cobrança, Clientes cobrados, Contatos, Cobrado, Recebido, Conversão, Promessas cumpridas, Em aberto; barras de evolução | — |
| Índice de inadimplência | barras; linha de limite de 10% | — |
| Aging list | barras: carteira por faixa de atraso, privado + público | — |
| Comparativo do aging: segmento e BU | legenda 6 faixas; tabela: Segmento/BU, Distribuição, A vencer, 1 a 30, 31 a 60, 61 a 90, 91 a 180, Acima de 180, Total vencido, Índice, Vencido > 90 dias, PDD | — |
| Exposição da carteira por faixa de risco | barras: saldo utilizado por rating | — |
| Crédito analisado: deferido x negado | barras | — |
| Concentração da inadimplência | 4 caixas de barras: Por cliente, Por grupo econômico, Por região, Por BU | — |
| Por setor | tabela: Setor, Em análise, Deferido, Negado, Aprovação, Concedido, Exposição, Saldo vencido, Inadimplência, Críticos, Pedidos retidos | Clique na linha abre a Análise de crédito do setor (privado / estética / público) |
| Por BU | tabela: BU, Crédito analisado (deferido/negado), Concedido, Exposição, Saldo vencido, Representatividade na inadimplência, Inadimplência, Em análise | — |

### 1.3 Regras de negócio (menu) `view-negocio`
Texto: "Todas as regras da análise de crédito, privado e público, num só lugar para consulta. Os valores são os parâmetros em vigor; para alterá-los use 1.1 Análise de crédito > Regras de negócio."
- Índice `rnIdx` + corpo `rnBody` (dinâmicos, conteúdo gerado por JS, não visível nestes arquivos).
- **Trilha de auditoria**: "Quem alterou o quê e quando: limites, etapas, aprovações, regras, metas, certidões e equipe. Registros não podem ser editados pelo painel." Campos: busca (texto: cliente, pessoa ou campo) + select de área ("Todas as áreas" + áreas dinâmicas); lista `audBody`.

### 1.4 Fontes e links `view-fontes`
"Onde consultar cada informação usada na análise de crédito e na cobrança, e a legislação de referência. Links abrem em nova aba." Conteúdo dinâmico (`fnBody`).

### 1.5 Minha agenda `view-agenda`
Texto: "O que fazer hoje: ações da régua, promessas, acordos, preventiva, fichas e prazos de crédito."
| Bloco | Conteúdo |
|---|---|
| Filtro | select **"Agenda de"** (`agPessoa`, pessoas da equipe) + nota `agMe` |
| KPIs (`agKpi`, 4) | dinâmicos |
| `agFer` | (feriados, inferido) |
| `agPrz` | prazos (inferido: prazos de crédito) |
| Indicadores da agenda | KPIs; "Contatos por dia · últimos 14 dias"; "Carteira por etapa da cobrança"; "Saldo vencido por faixa de atraso"; ranking `agDashRk` |
| Próximos 7 dias úteis da cobrança | semana `agSem`; legenda de cores: Próxima ação agendada (âmbar), Retorno/promessa (azul), Parcela de acordo (roxo), Régua de cobrança (laranja), Preventiva (verde), Nota fiscal pública (verde-azulado) |
| Processo de cobrança cliente a cliente | filtro `agProcF`: Todos em cobrança / Com passo atrasado / Sem contato há mais de 7 dias / Com retorno prometido / Em acordo; tabela: Cliente, Etapa, Em atraso, Último contato, Retorno/promessa, Acordo, Próximo passo |
| `agBody` | grade de cards da agenda (dinâmico) |

### 1.6 Material de apoio `view-material`
"Documentos padronizados do Crédito e Cobrança, no layout Benenutri: política, treinamentos, modelos de importação e modelos de comunicação. Versões vigentes em novembro de 2026. Aqui ficam os PDFs para consulta; as versões editáveis (Word e PowerPoint) ficam com o Núcleo Financeiro." Campo de busca "Buscar documento"; lista `matBody` (dinâmica).

### 1.7 Jurídico `view-juridico` (menu 4.1 "Processos jurídicos", sec `jurger`)
Abas internas (`data-jt`): **Visão gerencial** (jurger), **Processos jurídicos** (jur; badge "Prazos vencidos"), **Acordos judiciais** (juracordo; badge "Acordos com parcela vencida"), **Custos dos processos** (jurcusto; badge "Custas citadas sem lançamento"), **Alertas de desvios** (jurdesv; badge "Desvios críticos").
Filtros do Jurídico: BU (botões toggle; "A BU vem da ficha do processo ou do cliente na cobrança"), **Setor** (Privado e público / Privado / Público), **Linha** (Todas as linhas / Galderma / Demais linhas — `outras`), **Filial** (`jurFil`, dinâmico; datalist de filiais: BNDF, BNGO, BNRS, BNEXDF, BNEXTO), busca (cliente, autos ou andamento).
Ações: **Exportar CSV**, **Importar planilha do Jurídico** (.xlsx/.xls; prévia `jurImpPrev`), **+ Novo processo**. KPIs (`jurKpi`, auto-fit), aviso `jurAviso`. Alternância de visão (`jurVisBox`): **Quadro (Kanban)** / **Lista de processos**. Containers: `jurGer`, `jurDesv`, `jurCusto`, `boardJur` (kanban), `jurLista`, `jurAcordos`.
Conteúdo interno (colunas, formulário do processo) NÃO está nestes arquivos (JS de outro bloco).

### 1.8 Prazos de pagamento `view-prazos`
"Tabela padrão de planos de pagamento do grupo, com o prazo médio de cada plano. Cada cliente é vinculado a um plano na análise de crédito; o vínculo alimenta o prazo médio do cliente, o motor de crédito e o painel consolidado."
- 4 KPIs (`przKpi`).
- **Integração com o Winthor**: passos: (1) exportar cadastro de planos (código, descrição, prazos de cada parcela ou prazo médio) em CSV/Excel; (2) opcional: exportar clientes com código do plano (CNPJ e código do plano); (3) conferir prévia e aplicar; o vínculo também pode vir na importação de títulos (coluna do código do plano). Botões/inputs: "Planos de pagamento (.csv ou .xlsx)" (`wArqP`), "Clientes × plano (.csv ou .xlsx)" (`wArqC`), "Modelo de planos" (`wModP`), "Modelo de clientes" (`wModC`); prévia `przW`. Formatos aceitos: .csv, .xlsx, .xls, .txt.
- **Tabela padrão** (`przTab`): "Prazo médio = média dos dias das parcelas (parcelas de valor igual). Dias corridos a partir do faturamento."
- **Clientes por plano** (`przCli`).
- Planos pré-definidos no JS da ficha (`PLANOS`): À vista, 7, 14, 21, 28, 30, 45 dias, 28/35/42, 30/60, 30/60/90, 30/60/90/120 dias. A tabela real vem de `planos()` (editável aqui; objeto com `id`, `nome`, parcelas; `pmPlano(pl)` = prazo médio).

### 1.9 Fluxo da NF pública `view-nfpub`
"Do empenho ao pagamento: etapas, prazos legais, regra de pagamento de cada ente e acompanhamento de cada nota fiscal. Vale para a análise (2.1) e a cobrança (2.2) do setor público." (OBS: o texto cita 2.1/2.2, mas o menu de público é 3.1/3.2: inconsistência de numeração, ver §5.)
| Bloco | Conteúdo |
|---|---|
| Etapas e prazos | `nfFlow` + nota `nfFlowNota` (dinâmico) |
| KPIs | 4 (`nfKpi`) |
| Notas fiscais em tramitação | filtro Situação: Todas em aberto / Com prazo vencido / Acima de 2 meses / Pagas; busca (órgão, NF ou empenho); tabela: Órgão, NF · empenho, Valor, Etapa, Liquidar até, Pagar até, Situação, Regra. Nota: "Para lançar uma nota, abra o cliente em 3.2 Cobrança > Notas fiscais em tramitação, ou toque numa linha." |
| Regra de pagamento por ente | `nfRegras`; "Prazos usados nos cálculos. O prazo do contrato, quando informado no cliente, prevalece." |
| Comunicação com o órgão | `nfCom`: mensagens padrão por etapa; no cliente já vêm preenchidas com dados da nota |

### 1.10 Contatos `view-contatos`
"Consulta e atualização da ficha de contatos de todos os clientes, privados e públicos. Toque num cliente para editar ao lado." 4 KPIs; filtros: busca (cliente, CPF/CNPJ ou nome do contato), **Setor** (botões `ctSet`), **Ficha** (botões `ctSit`). Tabela: Cliente, Agente, Contato principal, Telefone/e-mail, Contatos (n), Ficha. Editor lateral `ctEd` (formulário gerado por JS, não visível aqui).

### 1.11 Histórico do cliente `view-historico`
"Tudo o que foi registrado sobre o cliente, da solicitação de crédito à cobrança: etapas, decisões, documentos, pedidos, contatos, retornos, promessas, acordos e feedbacks." Campo com datalist (nome ou CPF/CNPJ), botões **Gerar PDF** e **Imprimir**; resumo `hsRes`; corpo `hsBody`; categorias (`fState.histCat`).

### 1.12 Equipe `view-equipe`
"Hierarquia: Diretoria > Gerente > Supervisores > Agentes de cobrança. Os indicadores de cada nível somam a carteira da própria equipe." 3 abas (`data-eqtab`):
- **Organograma** (`eqOrg`).
- **Indicadores por nível**: tabela Pessoa, Cargo, Reporta a, Análises em andamento, Decididas no mês, Clientes em cobrança, Saldo vencido, Recuperado no mês, Ações atrasadas. Regra: "Agente: própria carteira. Supervisor: própria carteira + agentes da equipe. Gerente e Diretoria: toda a equipe abaixo."
- **Cadastro da equipe** (`eqForm`): "Defina o cargo e a quem cada pessoa reporta. Os nomes devem ser iguais aos usados na análise e na cobrança." Banner de login `eqLogin` (vínculo login x membro), linhas `eqRows`, ações `eqAct`.

### 1.13 Regras de cobrança (menu) `view-regua`
Texto: "Régua, prazos, alçadas, encargos e mensagens padrão da Política de Crédito e Cobrança, num só lugar. Os parâmetros valem para todos que usam o painel."
- **Régua de cobrança** (funil `rcFunil`, "Quanto antes o contato, maior a chance de recuperar.").
- **Régua completa** tabela: Dia, Canal, Objetivo, Tipo de mensagem (`rcDias`, legenda `rcLeg`, `rcFaixaTxt`).
- **Clientes privados**: "Prazos em dias corridos a partir do vencimento (D+0). O cliente muda de etapa sozinho pelos dias de atraso." Tabela: Prazo, Etapa, O que fazer, Resultado esperado, Responsável.
- `rcRegras` (alçadas/encargos, dinâmico).
- **Órgãos públicos · régua automática por nota fiscal**: "Sem bloqueio, negativação ou protesto. Prazos em dias úteis a partir do prazo legal de liquidação ou de pagamento de cada NF; o cliente muda de etapa sozinho." Tabela: Prazo, Etapa, O que fazer, Resultado esperado. Nota: cada ação aparece na Minha agenda na data certa com mensagem pronta (e-mail, pedido pela LAI ou ofício); o agente marca "Feito" na NF e o cumprimento entra no indicador de prazos; **ofício e requerimento mudam a etapa automaticamente; cobrança judicial depende de decisão do jurídico**.
- **Mensagens padrão** (e-mail e WhatsApp por etapa da régua privada; campos entre colchetes preenchidos no cartão do cliente): `rcMsgs` + formulário editável `rcForm`.
- Valores concretos da régua (dias, etapas) são dinâmicos; os únicos números visíveis no HTML: bloqueio D+4 e D+20 (ver §4).

### 1.14 Cobrança (menus 1.2, 2.2, 3.2) `view-cobranca` — 5 abas (`data-ctab`)
| Aba | id | Conteúdo |
|---|---|---|
| Visão gerencial (ger) | cobGer | ver tabela 1.14.1 |
| Quadro de cobrança (quadro) | cobQuadro | Kanban + tabelas |
| E-mails da régua (mail) | cobMail | fila + modos (badge `mlBadge`) |
| Histórico de contatos (hist) | cobHistV | tabela de contatos |
| Importar do Winthor (imp) | cobImp | importação de títulos |

**1.14.1 Visão gerencial da cobrança**
| Bloco | Conteúdo |
|---|---|
| Resumo da cobrança | frases de resumo (`cgResumo`) |
| Certidões da empresa (`cgCertBox`, só público) | "Com certidão vencida o órgão pode reter o pagamento. O alerta começa 15 dias antes do vencimento." |
| KPIs (`cgKpis`) | grupos |
| Clientes cobrados: quantitativo | 3 KPIs; tabela Etapa, Clientes, Saldo vencido, Distribuição. "Clientes com ação de cobrança registrada, por etapa." |
| Clientes cobrados: qualitativo | barras de resultado das ações; "Acompanhamento" |
| Desempenho dos agentes de cobrança | tabela: Agente, Supervisor, Clientes em atraso, Saldo vencido sob gestão, Contatos no mês, Promessas no mês, Promessas cumpridas, Recuperado no mês, Ações atrasadas. Regra: agente = o da ficha de cobrança do cliente; contatos e promessas contam pelo agente que registrou o contato |
| Inadimplência por BU | BU, Carteira, Saldo vencido, Representatividade, Índice, Clientes em atraso, Acima de 90 dias (índice = vencido ÷ carteira da própria BU) |
| Aging list | Faixa, Clientes, Valor, % da carteira, % do vencido (seção numerada "04") |
| Comparativo do aging segmento/BU | mesma tabela de 12 colunas do consolidado |
| Provisão para perdas (PDD) | 3 KPIs; tabela Faixa, Saldo, % provisionado, Provisão, Participação na provisão; "Percentual por faixa do aging, editável em Regras de negócio" |
| Roll rate | tabela: Faixa no mês anterior, Saldo, Pagou, Melhorou, Manteve, Piorou, Taxa de rolagem. "A foto da carteira é tirada uma vez por mês, no primeiro acesso." (ver §5) |
| Acordos de pagamento | 2 KPIs |
| Baixas como perda | 2 KPIs + lista |
| Documentos dos recebíveis vencidos (só público) | situação do empenho, liquidação e ordem de pagamento por recebível |
| Concentração da inadimplência ("12") | Resumo consolidado: KPIs + tabela Carteira, Clientes em atraso, Saldo vencido, Saldo a vencer, Índice, Top 5 clientes, Maior cliente, Maior grupo, Maior BU, Maior região; 3 caixas de barras: Por cliente / grupo econômico / região |

**1.14.2 Quadro de cobrança**: KPIs, busca (cliente ou agente), texto "Entra em cobrança todo cliente com saldo vencido. Arraste o cartão entre as etapas ou toque nele para registrar a ação." Kanban `boardCob` (arrastar = `moverCob(id, etapa)`; clicar = `painelCob`). Tabelas:
- **Clientes bloqueados para novos pedidos**: Cliente, CPF/CNPJ, BU, Dias de atraso, Saldo vencido, Valor atualizado, Etapa. "Lista para o bloqueio no ERP: novos pedidos bloqueados a partir de D+4 e bloqueio total a partir de D+20 (negativação e protesto)."
- **Projeção de possível inadimplência**: Cliente, Saldo a vencer, Próximo vencimento, Chance de atraso, Valor projetado, Base da estimativa. Regra: "chance de cada cliente vem da pontualidade das nossas vendas (ou do rating), do perfil de pagamento do órgão no público, do atraso atual e da criticidade."
- Barras: Saldo vencido por faixa de atraso; por agente de cobrança.

**1.14.3 E-mails da régua**: "Fila do dia com a mensagem padrão de cada etapa já preenchida. Cada etapa tem um modo de envio: **automático, com aprovação ou manual**." Blocos: integração `mlInteg`, 4 KPIs, tabela Fila de hoje (Cliente, Etapa, Para, Modo, Situação, Ações), "Modo de envio por etapa" (`mlModos`; vale para todos).

**1.14.4 Histórico de contatos**: 4 KPIs; busca (cliente, agente ou feedback); select Retorno (opções dinâmicas); select Promessas (Todas / Promessas em aberto / Promessas vencidas). Tabela: Data, Cliente, Canal, Falou com, Retorno, Previsão de pagamento, Valor prometido, Feedback, Agente de cobrança. Clique na linha abre `painelCob` (ficha de cobrança, JS fora destes arquivos).

**1.14.5 Importar do Winthor (títulos)**: aceita .csv/.xlsx/.xls/.txt. "O painel soma os títulos por CNPJ e atualiza atraso, dias em atraso, saldo a vencer, próximo vencimento, limite utilizado e recebimentos. Nada é gravado antes de você conferir a prévia." Passos: exportar posição de títulos a receber em aberto e pagos no período (uma linha por título); escolher arquivo e conferir o mapeamento campo x coluna (`impMap`); conferir prévia (`impPrev`) e clicar **Aplicar**. "Recebimentos repetidos de importações anteriores são ignorados." Botão "Baixar modelo"; log "Importações anteriores" (`impLog`).

### 1.15 Análise de crédito (menus 1.1, 2.1, 3.1) — 6 abas (`#tabsCredito`)

**Aba "Visão gerencial"** (`view-gerencial`; segue filtros Mês e BU)
| Bloco | Conteúdo |
|---|---|
| Saúde da carteira | "Clientes aprovados por situação de risco." barra Saudável/Em atenção/Risco |
| KPIs (`xKpis`) | grupos dinâmicos |
| Crédito analisado, deferido e negado | "Valor solicitado nas solicitações já decididas. Deferido + negado = analisado." 4 KPIs; "Por BU" barras (taxa de deferimento em valor) |
| Pedidos acima do limite: analisados, deferidos e negados | 4 KPIs; **Mostradores de flexibilização do limite** (gauges `xFlexG` + nota; "Pedidos acima do limite aprovado, decididos no período"); "Por BU" (a BU do pedido é a do cliente) |
| Concentração por grupo econômico | "Participação de cada grupo ou rede no limite concedido. Clientes sem grupo contam sozinhos." |
| Funil da esteira | "Solicitações em cada etapa e valor solicitado. A barra mostra a quantidade." |
| Risco gerado pela concessão | **Risco não previsto**: aprovado como baixo risco (rating AA a B) e entrou em risco. **Risco aceito**: aprovado já com rating C ou pior. 4 KPIs; "Clientes de risco por rating na concessão"; "Riscos não previstos por agente"; tabela: Classificação, Cliente, Agente de cobrança, Aprovado por, Rating na concessão, Score, Limite concedido, Utilizado, Saldo vencido, Dias de atraso, Sinais |
| Carteira por BU | BU, Clientes, Limite, Utilizado, Participação no utilizado, Saldo vencido, Inadimplência, Críticos, Em andamento |
| Pedidos acima do limite / Pontos de atenção | grade de cálculo (`xPed`) e sinais (`xAlertas`) |
| Performance por agente de cobrança | botão "Ver detalhes" (vai à aba Desempenho); tabela: Agente, Em carteira, Fora do SLA, Decididas, Aprovação, Ciclo médio, SLA cumprido, Volume aprovado, Clientes aprovados, Saúde das análises, Críticos, Pedidos decididos |
| Top 10 clientes: concentração de limites | KPIs; tabela #, Cliente, BU, Limite, % do limite total, % acumulado, Utilizado, Uso, Saldo vencido, Criticidade |

**Aba "Esteira de concessão"** (`view-concessao`) — Kanban de propostas
- KPIs: **Em análise** (propostas ativas), **Taxa de aprovação** (aprovadas ÷ decididas), **Fora do SLA** (acima do prazo da etapa), **Enviadas para gestão** (clientes com limite ativo).
- Filtros: busca (cliente, CPF/CNPJ ou agente); agente (`fAnalista`); Pessoa (PF e PJ / PF / PJ); Tipo de cliente (Todos / novo / recorrente / inativo); Criticidade (Todas / Somente críticos / Críticos e em alerta / Inadimplentes com a empresa).
- Estado vazio: "Nenhuma proposta na esteira. Use Nova proposta para registrar a primeira."
- Barra de críticos (`critBar`): texto "Calculando clientes críticos…" + botão **Ver críticos**.
- Kanban `boardProp` (colunas = etapas, ver §2.4). Clique no cartão abre a ficha (`abrir("propostas",id)`); arrastar entre colunas (JS de DnD de propostas fica em outro bloco; aqui só o de cobrança).

**Aba "Gestão de crédito"** (`view-gestao`; badge `tabBadge`)
- KPIs: Limite concedido (clientes em gestão), Uso da carteira (utilizado ÷ limite), Pedidos retidos (aguardando liberação), Pedidos fora do SLA (vendas paradas além do prazo).
- **Validade do crédito e inatividade** + botão **Encaminhar** (`btnVenc`). Texto: "O crédito vale 3 meses. Vencido, o cliente com compras recorrentes (2 ou mais no período) vai para Reanálise; sem recorrência, vai para Cadastro obsoleto." `vencCalc`: cálculo.
- **Carteira em gestão**: "Clientes aprovados na esteira, com crédito válido. Toque numa linha para atualizar limite, utilização, compras e validade ou registrar um pedido acima do limite." Colunas: Cliente, Limite, Utilizado, Disponível, Saldo vencido, Saldo a vencer, Índice de inadimplência, Pagamento aprovado, Uso, Criticidade, Rating, Validade, Compras no período, Última compra, Destino, Pedidos retidos.
- **Pedidos acima do limite**: "Pedido que leva a exposição do cliente além do limite fica retido até a alçada decidir. A alçada sobe conforme o tamanho do excesso." Busca (pedido, cliente ou vendedor), botão **+ Pedido acima do limite**, Kanban `boardPed`.

**Aba "Saúde das análises"** (`view-inad`; badge `tabBadgeInad` = nº em risco)
- KPIs: Análises aprovadas, Saudáveis, Em atenção, Apresentaram risco (com saldo exposto).
- Classificação (regra textual): **Saudável** = sem atraso, uso do limite abaixo de 90% e validade em dia; **Em atenção** = atraso de 1 a 30 dias, uso a partir de 90% ou validade vencida; **Risco** = atraso acima de 30 dias. "O atraso e o valor em atraso são atualizados no cartão do cliente, na coluna Gestão de crédito."
- Gráficos empilhados: Saúde por agente; Saúde por rating na concessão.
- Tabela "Indicadores por agente": Agente, Aprovadas, Saudáveis, Em atenção, Risco, Índice de saúde (>=80% verde; <60% vermelho), Limite aprovado, Saldo em risco.
- Tabela "Análises que apresentaram risco ou estão em atenção": Situação, Cliente, Agente, Rating na concessão, Aprovado por, Dias de atraso (>30 vermelho), Valor em atraso, Uso do limite, Sinais. Clique na linha abre a ficha.

**Aba "Desempenho dos agentes de cobrança"** (`view-desempenho`)
- Período (select): 30 dias / **90 dias (padrão)** / 12 meses (365) / Todo o histórico (0). "Calculado a partir do histórico de movimentações de cada cartão."
- KPIs: SLA cumprido, Ciclo médio (da proposta à decisão), Taxa de aprovação, Pedidos decididos (tempo médio).
- Tabela ordenável por clique no cabeçalho (chaves nome, ativas, fora, decididas, apr, ciclo, sla, vol, ped, pedH, inad): Agente, Em carteira, Fora do SLA agora, Decididas, Aprovação, Ciclo médio, SLA cumprido, Volume aprovado, Pedidos decididos, Tempo médio pedido, Clientes em risco. "Agentes sem nome ficam agrupados como 'Sem agente'."
- Gráficos: SLA cumprido por agente (meta **85%**); Tempo médio por etapa vs SLA.
- Tabela "Decisões críticas por responsável": Responsável, Cargo/alçada, Decisões de comitê, Liberações críticas, Volume decidido, Última decisão.

**Aba "Regras de negócio"** (`view-regras`; badge `tabBadgeCrit`)
- Texto: Crítico = aciona qualquer limite crítico, ou junta vários sinais de alerta; Alerta = aciona ao menos um limite de alerta. "As regras valem para todos que usam o quadro."
- Formulário `rgForm` (parâmetros editáveis: limites críticos/alerta, política de limite, `REGRAS.*`, metas, PDD; campos gerados por JS fora destes arquivos).
- Tabela "Clientes sinalizados" (ativos: em análise, gestão ou reanálise): Criticidade, Cliente, BU, Etapa, Agente de cobrança, Regras acionadas. Clique abre a ficha.

### 1.16 Semáforo de crédito `view-farol`
- "Classificação de risco por score para clientes privados. Política de crédito: segurança, responsabilidade e relacionamento de confiança." Para setor público: banner "O semáforo vale para clientes privados. No setor público, o crédito segue a classificação de risco do órgão."
- KPIs; **Faixas do semáforo**: "Limite sugerido = cálculo da política × percentual da faixa, com teto sobre o faturamento."
- **Simulador de limite** (campos numéricos): Score (0 a 1000) padrão 650; Prazo médio (dias) padrão 30; Compra média mensal (R$) padrão 20000; Faturamento mensal (R$) padrão 200000. Saída `smOut` + chips `smFl` (alertas simuláveis).
- **Carteira por faixa**: "Clientes privados com limite ativo (gestão e reanálise)."
- **Validação do farol**: tabela Faixa, Clientes, Carteira, Saldo vencido, Índice de inadimplência, Esperado até, Clientes em atraso, Leitura. Regra: "Revisar a cada trimestre: se uma faixa melhor atrasa mais que a seguinte, ou passa do esperado, o corte de score da faixa precisa ser recalibrado."
- **Clientes por farol**: filtro por faixa; tabela Cliente, BU, Etapa, Score, Farol, Rebaixado por, Limite atual, Sugerido pelo farol, Situação, Saldo vencido. "↓ indica farol rebaixado por alerta."

---

## 2. Ficha / painel lateral

Abre em `#overlay` > `aside.panel` (dialog modal), cabeçalho com título, subtítulo (etapa + SLA) e botão "×"; Esc ou clique fora fecha. Se o cliente existe em propostas, aparece botão **"Histórico do cliente"** (fecha o painel e abre a seção Histórico filtrada nesse cliente). Três fichas: **Nova solicitação** (assistente), **Proposta/cliente** (`painelProp`), **Pedido excedente** (`painelPed`). A ficha de cobrança (`painelCob`) está fora destes arquivos.

### 2.1 Nova solicitação (assistente em 1 passo)
| Campo | Tipo | Regra |
|---|---|---|
| Tipo de solicitação | radio: **Análise de crédito** (novo limite, aumento ou renovação; entra na esteira em "Solicitação recebida") / **Liberação de pedido excedente** (pedido acima do limite aprovado; entra em Gestão de crédito em "Retido por limite") | padrão análise |
| Cliente | texto + datalist `dlTodos` | obrigatório; ao sair do campo sugere o tipo |
| Tipo de cliente | select: Cliente novo / recorrente / inativo | sugestão automática (`tipoSugerido`) |
| Justificativa da solicitação * | textarea | obrigatória |
Botão "Continuar": valida; se pedido, vai para aba Gestão e abre `novoPed` (pré-preenche com cliente da carteira em etapa gestao, ou nome + limite/utilizado da última proposta); se análise, vai para aba Concessão e abre `novaProp` pré-preenchida com a proposta mais recente do mesmo nome (case-insensitive).

**Regra `tipoSugerido(nome)`**: nome vazio ou sem cadastro = novo; se alguma proposta do cliente em etapa gestao ou reanalise = recorrente ("crédito ativo na carteira"); senão se alguma em obsoleto = inativo ("cadastro obsoleto"); senão se existe alguma proposta = recorrente ("já tem solicitação registrada").

### 2.2 Ficha da proposta (`painelProp`) — campos
Título: "Solicitação de análise de crédito" (novo; subtítulo: "Crédito público · entra em Recebimento da solicitação" ou "Entra na etapa Solicitação recebida") ou nome do cliente (subtítulo = nome da etapa + " · SLA"). Topo (não novo): sinais (`sinaisHTML`: chips de criticidade/alertas).

**Identificação (grade 2 colunas)**
| Campo (id) | Tipo | Opções / observações |
|---|---|---|
| Cliente (iCli) | texto, obrigatório | |
| Justificativa da solicitação * (iJust) | textarea | obrigatória ao criar |
| Pessoa (iTipo) | select | PJ "Jurídica (PJ)" / PF "Física (PF)" |
| CPF / CNPJ (iDoc) | texto mono | sem validação visível |
| Tipo de cliente (iTipoCli) | select | novo/recorrente/inativo |
| Tipo de solicitação | fixo "Análise de crédito" (disabled) | |
| Agente de cobrança (iAna) | texto livre | (é o "analista" no modelo; `analista` = agente) |
| BU (iBU) | select | "Sem BU" + lista `BUS` + valor atual |
| RCA · executivo comercial (iRca) | texto + datalist (RCAs existentes em propostas e vendedores de pedidos) | "Nome ou código do RCA no Winthor" |
| Valor solicitado R$ (iVal) | decimal | |
| Prazo (meses) (iPrazo) | inteiro | |
| Score Serasa 0–1000 (iScore) | inteiro | oculto no público; mostra farol (`farolTag`) |
| Rating (Res. 2.682) (iRat) | select | "Sem rating" + `RATINGS` (valores não visíveis; texto indica AA a B = baixo risco, C ou pior = risco aceito) |

**Resumo do cliente**
| Campo | Tipo | Obs. |
|---|---|---|
| Potencial do cliente (sugestão comercial, R$) (rPot) | decimal | |
| *Somente privado:* Faturamento mensal (iFat) | decimal | |
| Compra média mensal conosco (iCM) | decimal | |
| Fonte pagadora principal (iFpTipo) | select "Não informada" + `FONTES_PAG` (operadoras, SUS, pacientes, vendas próprias; lista não visível) | |
| Quem paga (iFpNome) | texto | "Ex.: Unimed 40%, Bradesco Saúde 30%, SUS 30%" |
| Prazo de recebimento da fonte (dias) (iFpPrazo) | inteiro | |
| Garantia (iGar) | select | Sem garantia (padrão), Aval dos sócios, Nota promissória, Carta fiança, Seguro de crédito, Outra |
| Alertas que rebaixam o farol (checkboxes `fl_*`; `FLAGS_FAROL`: ids vistos em código flagNeg, flagDados, flagPedido) | checkbox | "Cada alerta rebaixa o risco em uma faixa, mesmo com score alto." |
| **Consultas obrigatórias** ("Válidas por REGRAS.consValid dias. Resultado negativo rebaixa o farol em uma faixa"): Data das consultas (cData), Abertura do CNPJ (dataAbertura) | date | |
| Situação na Receita (cReceita) | select | Não consultado / Ativa / Irregular |
| Protestos CENPROT (cProtesto) | select | Não consultado / Sem protesto / Com protesto |
| Processos judiciais (cProcesso) | select | Não consultado / Sem processo relevante / Com processo relevante |
| Sócios (cSocios) | select | Não consultado / Sem restrição / Com restrição |
| **Análise financeira** ("Obrigatória acima de REGRAS.docF2; último balanço e DRE"): Ativo circulante (fAC), Passivo circulante (fPC), Patrimônio líquido (fPL), Dívida bancária total (fDiv), EBITDA anual (fEbitda) | decimal | vazio = "" |
| Índices (fInd, calculado, desabilitado) | | LC = AC/PC (2 casas); Dív/EBITDA = Div/EBITDA (1 casa, "×"); Dív/PL = Div/PL (2 casas) |
| **Motor de crédito** (`#motor`, privado) | caixa calculada | resultado de `motorCredito(...)`: sugere limite `m.v`, decisão `m.t`, cor; botão "Aplicar" (`mAplicar`) copia o limite sugerido para iLim ("Limite sugerido pelo motor aplicado. Salve para gravar.") |
| *Todos:* Limite de crédito / "Valor do contrato (R$)" no público (iLim) | decimal | "Em branco, usa o valor solicitado." |
| Limite utilizado / "Valor utilizado do contrato" (iUti) | decimal | |
| Limite disponível / "Saldo do contrato" (rDisp, calc) | | max(0, limite (ou valor solicitado se vazio) − utilizado) |
| Plano de pagamento (rPlano) | select "Não definido" + `planos()` ("nome · prazo médio N dias") | ao escolher, preenche rPrazo com o prazo médio do plano |
| Prazo médio do cliente (dias) (rPrazo) | inteiro | |
| Índice de pontualidade das nossas vendas % (rPont) | decimal | "Percentual das vendas pagas em dia." |
| Dias de atraso com a empresa (iAtrD) | inteiro | "Título vencido mais antigo conosco. Acima de zero, etiqueta de inadimplente." |
| Saldo vencido com a empresa (iAtrV) | decimal | |
| Saldo a vencer com a empresa (iAVenc) | decimal | |
| Próximo vencimento (iPV) | date | "Usado na cobrança preventiva (5 dias e 1 dia antes)." |
| Valor do próximo vencimento (iPVV) | decimal | |
| Saldo total (rSaldoT, calc) | | vencido + a vencer |
| Índice de inadimplência (rIdx, calc) | | vencido ÷ (vencido + a vencer) |
| Setor do cliente (iSetor) | select | Privado / Órgão público (muda a esteira) |
| Região / UF (iUF) | texto + datalist 27 UFs | salvo em caixa alta |
| Ramo de atividade (iRamo) | texto + datalist | |
| Grupo econômico / rede (iGrupo) | texto + datalist | |

**Bloco de flexibilização** (somente etapa gestao e privado): `flexHTML(p,0)` (mostrador de pedido excedente; corpo fora destes arquivos).

**Bloco "Limite e monitoramento"** (somente etapa gestao)
| Campo | Tipo | Obs. |
|---|---|---|
| Validade do crédito (iRev) | date | "3 meses a partir da liberação ou renovação." |
| Compras no período de validade (iComp) | inteiro | "`COMPRAS_RECORRENTES` ou mais compras = recorrente" (texto da regra do HTML: 2 ou mais) |
| Última compra (iUlt) | date | |
| Calc: Disponível, Uso (utilizado ÷ limite), Validade | | |
| Destino ao vencer | calc | "Sem compras no prazo. Encaminhar para" (semCompra: dias sem compra > `REGRAS.diasSemCompra`, padrão **90**) / "Validade vencida. Encaminhar para" / "No vencimento vai para"; destino = **Reanálise** ou **Cadastro obsoleto** (`destinoVencimento`) |
Fora de gestao: caixa **"Alçada sugerida"** (`alcadaProp(valor)` privado ou `alcadaPub(valor)` público: nome + descrição, recalculada ao digitar o valor).

**Bloco "Análise do órgão público"** (setor público)
| Campo | Tipo | Opções |
|---|---|---|
| Esfera (pEsf) | select | Municipal / Estadual / Federal |
| Capacidade financeira do ente (pCap) | select | Não classificada / Alta / Média / Baixa. Preenchida automaticamente a partir da CAPAG (A e "Não se aplica (União)" = Alta; B = Média; C e D = Baixa) enquanto o usuário não alterar manualmente |
| Perfil de pagamento (pPerf) | select | Não definido / Pontual / Atrasos eventuais / Atrasos frequentes |
| Atraso médio do órgão dias (pAtrM) | inteiro | default = histórico das NFs pagas (`histOrgao`: atraso médio, nº de notas pagas, nº no prazo) |
| Restos a pagar do ente R$ (pRap) | decimal | |
| Fonte pagadora (pFonte) | texto + datalist | Fundo Municipal/Estadual/Nacional de Saúde (repasse SUS fundo a fundo), Tesouro Municipal/Estadual/Federal, Recursos próprios do órgão, Convênio/emenda parlamentar |
| Regra de pagamento do ente (pRegraPag) | select | "Automática (esfera e UF)" + `regrasPag()` ("nome · liq + pag dias un", "(a confirmar)" se status != Verificado) |
| Prazo de pagamento do contrato/edital dias (pPrazoPag) | inteiro | "Dias corridos do protocolo da NF. Quando informado, prevalece sobre a regra do ente." |
| Comunicação com o órgão (details) | assunto + corpo read-only (`msgNF(p,null,"analise")`) | pedir fluxo de pagamento |
| Base da análise (pBase) | select | Selecione / Estimado do edital / Saldo de contrato ativo ("o fornecimento só é liberado com saldo de contrato ativo") |
| Nº do edital/pregão (pEdital) | texto | "PE 045/2026" |
| Valor estimado do edital (pEstimado) | decimal | |
| Saldo do contrato ativo (pSaldo) | decimal | "Valor do contrato menos o já fornecido." |
| Vigência do contrato até (pVigFim) | date | |
| CAPAG (pCapag) | select | Não consultada / A / B / C / D / Não divulgada / Não se aplica (União) |
| Despesa com pessoal % da RCL (pPessoal) | decimal | "Limite do Executivo: municípios 54%, estados 49%." |
| CAUC (pCauc) | select | Não consultado / Regular / Com pendência |
| Tipo de fonte do recurso (pFonteTipo) | select | Não informada / Vinculada (SUS fundo a fundo) / Outra vinculada / Recursos próprios |
| Empenho antes da entrega (pEmpPrev) | select | Não informado / Sim / Não |
| Contrato ou ata vigente (pContrato) | select | Não informado / Sim / Não |
| Motor público (`#motorPub`) | calc | `motorPub` retorna rating (`rt.id`, cor), exposição (`exp`), decisão (`dec.t`); gravados em `motorRating`, `motorExposicao`, `motorDecisao` |
| Nº do empenho/contrato (pEmp) | texto | |
`contratoAtivo(p)`: se base = "Saldo de contrato ativo": ok = vigência não vencida E saldo > 0; devolve flags venc e sem.
Aviso: orientações na tela: "Consulte CAPAG no Tesouro Transparente, RGF e RREO no Siconfi e o CAUC antes de aprovar."

**Confirmação cadastral** (oculta no público)
| Campo | Opções |
|---|---|
| Telefone (iTel) | texto "(61) 90000-0000" |
| Contato telefônico (iTelOk) | Pendente (padrão) / Confirmado / Sem sucesso |
| Endereço (iEnd) | texto |
| Confirmação de endereço (iEndOk) | Pendente / Confirmado por comprovante / Confirmado por visita / Divergente |
| Contato financeiro (iFinNome) | "Nome e cargo" |
| Telefone/e-mail do financeiro (iFinCont) | texto |
| Contato financeiro (iFinOk) | Pendente / Confirmado / Sem sucesso |

**Decisão do comitê / "Classificação de risco e aprovação"** (`decisaoHTML("c")`)
Visível quando não novo e: no **público**, etapas paprov, gestao, reanalise, obsoleto (ou recusada com comiteResp); no **privado**, etapa com índice >= comite e sem flag `setor` (recusada só se houver comiteResp). Obrigatório (destaque `req`) quando a etapa atual é comite (privado) ou paprov (público).
| Campo | Observação |
|---|---|
| Responsável pela aprovação (cResp) * | padrão = nome do membro logado; dica "Ao aprovar, fica registrado NOME (login vinculado)" |
| Cargo / alçada (cCargo) | datalist `dlCargos` |
| Plano de pagamento aprovado * (cPlano) | datalist `PLANOS`; "Ex.: 28/35/42 dias" |
| Forma de pagamento aprovada * (cForma) | datalist `FORMAS`: Boleto bancário, PIX, Cartão de crédito, Cartão BNDES, Transferência (TED), Depósito antecipado, Cheque |
| Parecer técnico * (cPar) | textarea: "Fundamento: capacidade de pagamento, garantias, exposição, condicionantes" |
Regra: "Responsável e parecer: obrigatórios para sair do Comitê. Plano e forma de pagamento: obrigatórios para aprovar." Data da decisão (`comiteData`) = agora se responsável e parecer preenchidos e (algum mudou ou não havia data); senão mantém; vazia se faltar resp ou parecer. Exibe "registrado em ...".

**Demais seções**
- **Ficha de contatos** (`ctcBox`): "Salve a solicitação para montar a ficha de contatos" (novo); depois `refreshContatos()` (conteúdo/CRUD fora destes arquivos; campos salvos: `contatos`, `contatosEm`, `contatosPor`, `contatosLog`).
- **Anexos da análise** (`anxBox`): "Salve a solicitação para anexar documentos"; depois `refreshAnexos()` (upload/lista fora destes arquivos; campo `anexos[]`, preservado ao salvar; usado pelos motores `anexos` para exigências documentais).
- **Checklist** da etapa atual (não novo): título "Checklist · NomeEtapa"; checkboxes `data-ci=i` com os textos de `ET.propostas[etapa].check`; na gestão pública usa `GESTAO_PUB_CHECK` e nome "Monitoramento". Estado em `checklist[etapa][i]=true`.
- **Observações do agente** (iObs, textarea).
- **Mover para** (iMov): select com as etapas do setor (`etapasSetor`), padrão etapa atual.
- **Histórico**: lista (mais recente primeiro) com nome da etapa + data/hora. Guarda no máximo 40 entradas.

**Botões da ficha (proposta)**
| Situação | Botões |
|---|---|
| Sempre (não readOnly) | **Excluir** (confirmação inline "Excluir? Excluir / Cancelar", só se não novo) ; **Cadastrar** (novo) / **Salvar** |
| Etapa gestao | "Encaminhar vencimento" ou "Enviar para cadastro obsoleto" (se `paraEncaminhar`); "+ Pedido acima do limite" |
| Etapa reanalise | "Cadastro obsoleto"; "Renovar por 3 meses" (vai para gestao) |
| Outras etapas não finais (não novo) | **Recusar**; **Avançar etapa** (rótulo "Enviar para gestão" em liberacao; "Aprovar e monitorar" em paprov) |

### 2.3 Ficha do pedido excedente (`painelPed`)
Título: "Solicitação de liberação de pedido excedente" (novo; subtítulo "Entra na etapa Retido por limite") ou "Pedido {numero}" (subtítulo "cliente · etapa · SLA").
| Campo | Tipo | Obs. |
|---|---|---|
| Nº do pedido (qNum) | texto | |
| RCA · executivo comercial (qVend) | texto + datalist | padrão = RCA da proposta do cliente |
| Tipo de cliente (qTipoCli) | select | padrão recorrente |
| Tipo de solicitação | fixo "Liberação de pedido excedente" | |
| Agente de cobrança (qAna) | texto + datalist analistas | |
| Justificativa da solicitação * (qJust) | textarea | obrigatória ao criar |
| Cliente (qCli) | texto + datalist clientes | ao mudar, se cliente em gestão, puxa limite, utilizado e dias de atraso |
| Valor do pedido (qVal), Maior atraso em aberto dias (qAtr), Limite aprovado (qLim), Utilizado antes do pedido (qUti) | numéricos | |
| Calc `qCalc` | Disponível, Excesso, % do limite ("+X%") | `excesso()` |
| `qFlex` | mostrador de flexibilização do limite do cliente | |
| Alçada exigida (qAlN/qAlD) | calc `alcadaExc` | se nome está em `CRITICAS`: vermelho + "liberação crítica: exige responsável e parecer técnico" |
| Checklist da etapa (não novo) | | |
| Condição de liberação (qDec) | select "Ainda não decidida" + `DECISOES` (lista não visível) | "Obrigatória para mover o pedido para Liberados." |
| Análise / motivo (qObs) | textarea | |
| Responsável pela liberação (`decisaoHTML("l")`, só não novo) | lResp, lCargo, lPlano *, lForma *, lPar | "Plano e forma de pagamento: obrigatórios para liberar. Responsável e parecer: obrigatórios em liberação crítica (diretoria ou comitê)." |
| Mover para (iMov) e Histórico | | |
Botões: Excluir (confirmação), Cadastrar/Salvar, **Recusar** (exige texto em Análise/motivo: "Escreva o motivo da recusa no parecer."), **Liberar pedido** (só na etapa `alcada`) ou **Avançar etapa** (próxima de `ATIVAS_PED`).

### 2.4 Etapas / fluxos (o que os arquivos mostram)
- IDs de etapas de proposta citados: `entrada` (Solicitação recebida), `cadastral` (checklist cadastral com itens indexados: 4=telefone confirmado, 5=endereço confirmado, 6=contato financeiro confirmado), `comite`, `liberacao`, `gestao`, `reanalise`, `obsoleto`, `recusada`. Públicas: `pentrada` ("Recebimento da solicitação"), `paprov` ("Classificação de risco e aprovação"), `gestao` (renomeada "Monitoramento"), `reanalise`, `obsoleto`. Ordem completa em `FLUXO_IDS[setor]`/`ET` (JS fora destes arquivos; etapas intermediárias não listadas aqui).
- Etapas de pedido: `bloqueado` ("Retido por limite"), `alcada`, `liberado`, `recusado`; `ATIVAS_PED` define a sequência de avanço (itens intermediários desconhecidos).
- Cada etapa tem `nome`, `sla` (prazo; `slaTxt`), `check` (itens), `final`, `idx`, `setor`.
- Cobrança: etapas por dias de atraso (ver §1.13).

---

## 3. Eventos: o que cada ação faz no dado

Persistência: `write(coleção, id, objeto)` (grava, retorna true/false) e `remove(coleção, id)`; `items.propostas` e `items.pedidos` são Maps em memória (coleções `propostas`, `pedidos`; cobrança vive nos mesmos registros de proposta, `kind` "cobranca" usa `items.propostas`). IDs gerados no cliente: proposta `p`+timestamp base36+4 aleatórios; pedido `q`+idem.

### 3.1 Cliques de topo e filtros
| Evento | Efeito |
|---|---|
| Clique `.mbtn` | se item de Privado/Estética: define `fState.est`, limpa BU se incompatível com Estética (`BU_EST`), grava localStorage (`esteira.est`, `esteira.bu`); chama `setSec(sec, setor)` |
| Clique `.ctab` | troca aba da cobrança (`cobTab`) e re-renderiza |
| `btnNova` | abre assistente Nova solicitação |
| `btnPedido` | abre `novoPed()` vazio (etapa bloqueado) |
| Input em `fBusca`, `fBuscaPed`, `fBuscaCob`, `fBuscaHist` / change `fAnalista`, `fRetorno`, `fPromessa` | atualiza `fState` (q, qPed, qCob, qHist, analista, fRet, fProm) e re-renderiza |
| Clique em linha de `csSetor` (consolidado) | se setor != público define estética/privado (+limpa BU incompatível, localStorage); vai para `setSec("credito", privado|publico)` |
| Clique em linha `saudeLista`, `cbProj`, `cbBloq`, `chLista` | abre ficha de proposta (`abrir`) ou de cobrança (`painelCob`) |
| Overlay: clique no fundo ou Esc | fecha painel (`fechar`; limpa `openRef`) |
| Drag&drop no `boardCob` | dragstart (se não readOnly) guarda `{kind:"cobranca", id}` e classe `dragging`; dragover destaca coluna `.drop`; **drop chama `moverCob(id, etapa)`** (muda etapa de cobrança do cliente); clique no cartão abre `painelCob` |
| **`btnVenc` "Encaminhar"** (Gestão) | para cada proposta (filtrada por mês) em gestao e `paraEncaminhar(p)`: muda etapa para `destinoVencimento(p)` (reanalise ou obsoleto), `entrouEtapa=agora`, adiciona histórico (últimos 40), grava `encaminhamento=motivoEnc(p)`; sequencial, para no primeiro erro; toast "N cliente(s) para Reanálise · M para Cadastro obsoleto"; re-renderiza |

### 3.2 Salvar proposta (`salvarProp`)
1. Validações: cliente obrigatório; justificativa obrigatória se novo.
2. Monta objeto `base` com todos os campos da ficha (números via `num()`; vazios viram ""; UF em maiúsculas; `tipoSolicitacao="analise"`); no privado grava `motorLimite` e `motorDecisao` calculados; no público grava `motorRating`, `motorExposicao`, `motorDecisao`.
3. **Novo**: etapa inicial `pentrada` (público) ou `entrada` (privado), `criadoEm`, `entrouEtapa`, `historico=[{etapa,em}]`, `checklist={}`; toast "Solicitação cadastrada".
4. **Existente**: mescla com registro atual; preserva `anexos` e `contatos*`; aplica decisão do comitê (`lerDecisao`); etapa-destino = botão (`forcar`) ou seletor "Mover para".
5. Regras de bloqueio ao avançar (ver §4): segregação de funções; alçada (`checaAlcada`); `gatePub` (gates do público); plano/forma/responsável/parecer do comitê; confirmações cadastrais.
6. Mudança de etapa: atualiza `etapa`, `entrouEtapa`, histórico; se destino = gestao chama `prepararGestao(novo, veioDeReanalise)` (provavelmente define validade de 3 meses etc.); se saiu de gestao para reanalise/obsoleto grava `encaminhamento`.
7. Mudança de setor: se a etapa não existe no fluxo do novo setor, volta ao início (`pentrada`/`entrada`).
8. Ao aprovar (sair de comite/paprov para etapa seguinte) e com login vinculado: sobrescreve `comiteResp` com o membro logado, preenche `comiteCargo` e grava `aprovadoUid=MY_UID`.
9. Checklist: lê checkboxes da etapa atual; confirmações marcam itens do checklist cadastral automaticamente (telefone Confirmado -> item 4; endereço começando com "Confirmado" -> item 5; financeiro Confirmado -> item 6).
10. Toast: "NomeCliente → Etapa" ou "Alterações salvas"; fecha painel.

Botões: Avançar etapa = próxima etapa ativa do setor (`ativasSetor`), exceto em liberacao e paprov (vai direto a gestao); Recusar = etapa `recusada` (sem exigir motivo no código de proposta); Renovar = gestao; Cadastro obsoleto = obsoleto; Encaminhar vencimento = `destinoVencimento`; "+ Pedido acima do limite" = abre aba gestão e `novoPed(p)`.

### 3.3 Salvar pedido (`salvarPed`)
- Novo: etapa `bloqueado` ("Retido por limite"), historico, `clienteId` = id do cliente da carteira se achado pelo nome exato; toast "Pedido registrado".
- Mover para `liberado` exige: condição de liberação (qDec) escolhida; alçada permitida (`checaAlcada`) + registro do membro logado (`libResp`, `libCargo`, `liberadoUid`); segregação (responsável da liberação != agente nem vendedor); se cliente bloqueado pela régua de cobrança: responsável + parecer; plano e forma de pagamento; se liberação crítica: responsável + parecer.
- Recusar exige texto em "Análise / motivo".
- Toast "Pedido N → Etapa".

### 3.4 Excluir
Clique em Excluir troca por "Excluir? [Excluir] [Cancelar]"; confirmar chama `remove(kind,id)`, toast "Excluído", fecha. (Exclusão definitiva; auditoria "Registros não podem ser editados pelo painel", ver §5.)

### 3.5 Campos calculados ao vivo na ficha
- Disponível = max(0, limite (ou valor solicitado se limite vazio) − utilizado); saldo total e índice de inadimplência; índices financeiros (LC, Dív/EBITDA, Dív/PL); farol (`farolTag`); motor de crédito privado e motor público; alçada sugerida ao digitar o valor; preenchimento automático de capacidade financeira pela CAPAG; prazo médio ao escolher plano.
- Saúde da análise (`saude(c)` em Saúde das análises): nível ok/atenção/risco, `d`=dias de atraso, `u`=uso, `sinais[]`; lista ordena risco antes de atenção, depois por dias de atraso decrescente.

---

## 4. Regras de negócio escritas na página (com números)

| Regra | Fonte | Detalhe |
|---|---|---|
| Validade do crédito | Gestão, ficha | **3 meses** a partir da liberação ou renovação. Vencido: com compras recorrentes (**2 ou mais** no período) -> Reanálise; sem recorrência -> Cadastro obsoleto |
| Recorrência | ficha | `COMPRAS_RECORRENTES` = 2 (texto do HTML) |
| Sem compras | ficha | dias sem compras > `REGRAS.diasSemCompra` (padrão **90**) -> "Enviar para cadastro obsoleto" |
| Renovar | ficha | "Renovar por 3 meses" na Reanálise |
| Classificação de saúde | aba Saúde | Saudável: sem atraso, uso < **90%**, validade em dia. Atenção: atraso **1 a 30** dias, uso >= **90%** ou validade vencida. Risco: atraso > **30** dias |
| Índice de saúde por agente | tabela | verde >= **80%**; vermelho < **60%** |
| Criticidade | aba Regras | Crítico = aciona qualquer limite crítico ou vários sinais de alerta; Alerta = ao menos um limite de alerta (limites editáveis, valores não visíveis) |
| Risco gerado | aba Visão gerencial | baixo risco = rating **AA a B**; risco aceito = rating **C ou pior** |
| Semáforo (farol) | Farol | score 0–1000; limite sugerido = política × % da faixa, com teto sobre faturamento; cada alerta (flag) rebaixa **uma faixa**; consulta negativa rebaixa uma faixa; consultas válidas por `REGRAS.consValid` dias; validação trimestral; simulador padrão: score 650, prazo 30 dias, compra média R$ 20.000, faturamento R$ 200.000 |
| Análise financeira | ficha | obrigatória acima de `REGRAS.docF2` (valor não visível) |
| Alçadas | Gestão / ficha | alçada de proposta pelo valor solicitado (`alcadaProp`/`alcadaPub`); alçada de pedido pelo tamanho do excesso sobre o limite (`alcadaExc`, também atraso); alçadas críticas (`CRITICAS`: diretoria ou comitê) exigem responsável + parecer |
| Pedido excedente | Gestão | pedido que leva a exposição além do limite fica retido até a alçada decidir |
| Segregação de funções | salvarProp/Ped | quem analisou (agente) não aprova a proposta; quem libera o pedido não pode ser o agente nem o vendedor |
| Bloqueio no ERP | Cobrança | novos pedidos bloqueados a partir de **D+4**; bloqueio total (negativação e protesto) a partir de **D+20** |
| Régua privada | Regras de cobrança | prazos em dias corridos do vencimento (D+0); etapa muda sozinha pelos dias de atraso; preventiva **5 dias e 1 dia antes** do vencimento |
| Régua pública | Regras de cobrança | sem bloqueio, negativação ou protesto; prazos em **dias úteis** a partir do prazo legal de liquidação/pagamento da NF; ofício e requerimento mudam a etapa automaticamente; cobrança judicial depende de decisão do jurídico; pedido pela LAI |
| Prazo de pagamento público | ficha/NF | prazo do contrato/edital (dias corridos do protocolo da NF), quando informado, prevalece sobre a regra do ente |
| Limites de pessoal (LRF) | ficha | Executivo: municípios **54%** da RCL, estados **49%** |
| Contrato público | ficha | só libera fornecimento com saldo de contrato ativo (vigência não vencida e saldo > 0) |
| Capacidade financeira x CAPAG | ficha | A e "Não se aplica (União)" = Alta; B = Média; C e D = Baixa |
| Certidões da empresa | cobrança pública | alerta começa **15 dias** antes do vencimento; certidão vencida pode reter pagamento |
| Aging | consolidado | faixas: A vencer, 1 a 30, 31 a 60, 61 a 90, 91 a 180, > 180 dias; limite de inadimplência **10%**; PDD = % por faixa (editável) |
| Inadimplência | vários | índice = saldo vencido ÷ (vencido + a vencer) |
| Meta SLA | Desempenho | **85%** das etapas no prazo; período padrão **90 dias** |
| Prazo médio de plano | Prazos | média dos dias das parcelas (parcelas iguais), dias corridos a partir do faturamento |
| Conversão da cobrança | consolidado | Cobrado = saldo vencido dos clientes trabalhados no mês (com contato, promessa ou recebimento) = recebido + em aberto; Recebido = pagamentos do mês (regularização, parcelas de acordo, importação Winthor); Conversão = recebido ÷ cobrado |
| Projeção de inadimplência | cobrança | chance = pontualidade (ou rating), perfil de pagamento do órgão (público), atraso atual e criticidade |
| Roll rate | cobrança | foto mensal da carteira (1º acesso do mês); saldo da faixa anterior: pagou / melhorou / manteve / piorou (rolou ou baixado como perda) |
| Fechamentos manuais | consolidado | meses antes de **setembro de 2026** sem foto mensal; lançar manualmente |
| Hierarquia | Equipe | Diretoria > Gerente > Supervisores > Agentes; agregação por nível |
| Importação Winthor | Cobrança/Prazos | soma por CNPJ; recebimentos repetidos de importações anteriores ignorados; nada gravado antes da prévia |
| Documentos | Material | versões vigentes em novembro de 2026 |

---

## 5. Dúvidas, ambiguidades e pontos de protótipo

1. **Persistência em Map/JSON no cliente** (`items`, `write`, `strip`, IDs gerados com Date.now): na reimplementação virar tabelas relacionais + IDs gerados no servidor; regras de negócio (alçada, gates, segregação) hoje no front, devem ir para Server Functions.
2. **Nomenclatura**: o campo de dados é `analista`/`#iAna` mas o rótulo é "Agente de cobrança"; o mesmo termo "agente de cobrança" é usado para quem analisa crédito (Esteira, SLA, Aprovado por) e para quem cobra. Confirmar se são a mesma pessoa/papel.
3. **Estética** = flag `est` sobre privado + BU `BU_EST`; não é setor de dado. Ambíguo se Estética é uma BU ou carteira independente (a `csSetor` trata como 3 linhas: privado/estética/público).
4. **Jurídico**: carteira "Jurídico" só tem menu 4.1; seu modelo de dados e formulário não estão nestes arquivos.
5. **Numeração inconsistente**: textos citam "2.1/2.2" para o setor público e "3.2 Cobrança > Notas fiscais em tramitação", mas o menu público é 3.1/3.2 (resquício de renumeração).
6. **Texto "Regras de negócio" duplicado**: menu "Regras de negócio" (consulta, somente leitura) e aba "Regras de negócio" dentro da Análise de crédito (edição). Edição vale para todos usuários; sem controle de perfil visível aqui (apenas `readOnly`).
7. **Controle de acesso**: existe `readOnly` e `meuMembro()`/`MY_UID` (login vinculado a membro da equipe), com `checaAlcada` (permissão por cargo/alçada, regra fora do arquivo). A matriz de permissões precisa ser especificada.
8. **Auditoria**: "Registros não podem ser editados pelo painel", mas a ficha tem "Excluir" definitivo sem log visível aqui; histórico de etapas truncado em **40** entradas (`slice(-40)`).
9. **Datas**: `diaFmt` usa `T00:00:00Z` (UTC) para validade, risco de deslocar um dia em fuso brasileiro; `Date.parse(pVigFim+"T23:59:59")` usa horário local. Decidir padrão.
10. **Dados duplicados/derivados gravados na proposta**: `limite`, `utilizado`, `diasAtraso`, `valorAtraso`, `saldoAVencer`, `proxVenc*` são digitados à mão na ficha e também atualizados por importação Winthor; risco de dupla fonte da verdade. Também `motorLimite`/`motorDecisao`/`motorRating` são "fotos" gravadas.
11. **Mesma tabela para crédito e cobrança**: cobrança usa `items.propostas` (cliente = proposta). Um cliente com várias propostas (recorrência, renovação) gera várias linhas com mesmo nome; o vínculo por **nome** (`c.cliente===n`, comparação case-insensitive em outros pontos) é frágil; pedido guarda `clienteId` só às vezes (vazio se nome não casar). Em sistema real: cadastro único de cliente (CPF/CNPJ) + propostas/limites + títulos.
12. **Protótipo**: "Ocultar exemplos" / chip "exemplo" (dados de demonstração), filtros em localStorage, datalists globais, `readOnly`, banner "Calculando clientes críticos…", "foto da carteira tirada no primeiro acesso do mês" (snapshot mensal disparado por acesso do usuário, em vez de job agendado), lançamento manual de fechamentos antes de set/2026.
13. **Valores não visíveis** (definidos em outras partes do JS, preciso ler): `REGRAS.*` (consValid, docF2, diasSemCompra, limites críticos), `RATINGS`, `FONTES_PAG`, `FLAGS_FAROL`, `BUS`, `BU_EST`, `DECISOES`, `CRITICAS`, `ET`/`FLUXO`/`ATIVAS_PED` (etapas, SLAs, checklists), alçadas, régua completa, faixas do farol e percentuais, PDD por faixa.
14. **Validações fracas**: CPF/CNPJ sem validação, UF livre (datalist), telefone sem máscara, valores via `num()` (parser BR), score `parseInt||""` (score 0 vira vazio), `prazo` idem. Rating "Res. 2.682" refere-se à Resolução CMN 2.682.
15. **Cobrança**: `painelCob`, `moverCob`, ficha de contatos, anexos, NFs de órgão público, acordos, baixas como perda, promessas: UI no outro bloco; aqui só aparecem as agregações.
16. **Importação**: o mapeamento de colunas (nomes de colunas do Winthor) e o layout dos modelos baixáveis não estão visíveis; formato exato precisa vir do JS de importação.
17. **E-mails da régua**: modos (automático/aprovação/manual) e "integração" (`mlInteg`) sugerem envio real de e-mail; não está claro se há provedor/SMTP ou só geração de texto.
18. **Concorrência**: nenhum controle (última escrita vence, `{...strip(p),...base}`); anexos/contatos são lidos do Map no momento do salvar para não sobrescrever, evidência de condição de corrida resolvida de forma ad hoc.
19. **Mensagens/alçada**: `checaAlcada` bloqueia por cargo do logado, mas se não houver membro logado (`meuMembro()` nulo) o registro do responsável é digitado livre (permite aprovar em nome de outro).
