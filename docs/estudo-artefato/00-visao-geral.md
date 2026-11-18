# Estudo do artefato "Painel Crédito e Cobrança": visão geral

Fonte: artefato `claude.ai/artifact/BDYUFtGTGYVaVUkKqNwJXJ`, feito por um gestor do
Núcleo Financeiro (Grupo Benenutri). É uma página única com cerca de 4.200 linhas de
JavaScript e um banco compartilhado no estilo Firestore. Estudado em 11/11/2026.

Os relatórios detalhados desta pasta trazem todos os campos, checklists, textos e fórmulas:

| Arquivo | Cobre |
|---|---|
| `A-regras-parametros-etapas.md` | ~100 parâmetros (`REGRAS_PADRAO`), criticidade, alçadas, validade, esteiras de concessão e pedidos, aging/PDD, farol, motor público, perfis |
| `B-winthor-planos-nf-publica.md` | importação Winthor (colunas, dedupe, prévia), planos de pagamento, dias úteis e feriados, fluxo da NF pública, régua pública, conversão, agenda |
| `C-regua-emails-kanban.md` | régua privada e pública completas, 12 modelos de e-mail/WhatsApp, modos de envio, encargos, acordo, baixa, `probInad`, desempenho, arrastar e soltar |
| `D-telas-fichas-eventos.md` | mapa de todas as telas, colunas, filtros, fichas (proposta, pedido, nova solicitação) e o que cada botão grava |
| `E-juridico-consolidado.md` | Jurídico: 11 etapas, planilha, dossiê, PDFs (notificação e demonstrativo), custos, acordos, 13 desvios, 24 indicadores; consolidado |

---

## 1. O que é, em uma frase

Um sistema de **gestão do ciclo de crédito a recebíveis**: concede limite ao cliente,
monitora o uso, cobra quem atrasa (privado e órgão público, com réguas diferentes) e
acompanha o que vai para a Justiça. Tudo com indicadores, metas e trilha de auditoria.

Não é só um protótipo de tela. Tem regra de negócio de verdade, parametrizada e
amarrada à Política de Crédito e Cobrança "v5.2". Grava num banco compartilhado entre
os usuários, mas não sabemos se o que está lá é dado real ou só exemplo (pergunta 2).

## 2. Os módulos

| # | Módulo | O que faz | Tamanho |
|---|---|---|---|
| 1 | **Concessão de crédito** | Esteira Kanban da solicitação até o limite ativo. Privado: 6 etapas com SLA (total 12 dias). Público: 3 etapas (11 dias). Ficha com consultas obrigatórias, análise financeira, motor de crédito, comitê e alçada | grande |
| 2 | **Gestão de crédito** | Carteira de clientes com limite. Validade de 3 meses, depois Reanálise (2+ compras no período) ou Cadastro obsoleto (sem compras, ou 90 dias sem comprar). Flexibilização do limite por farol | médio |
| 3 | **Pedidos acima do limite** | Pedido retido → análise → alçada (pelo % do excesso) → liberado ou recusado. SLA em horas | pequeno |
| 4 | **Semáforo / motor de crédito** | 6 faixas de score; limite sugerido = compra média × prazo médio ÷ 30 × 1,2, com tetos. Alertas rebaixam uma faixa. Público: nota 0–100 (CAPAG, LRF, CAUC, fonte, histórico) e rating P1–P4 | médio |
| 5 | **Cobrança privada** | Kanban automático pelos dias de atraso: preventiva (D-5, D-1, D0) e régua (D+1, D+4, D+7, D+10, D+20, D+30, D+45). Contatos, promessas, acordos, baixa como perda, carta de anuência, lista de bloqueio para o ERP | grande |
| 6 | **Cobrança pública** | Régua por nota fiscal, em dias úteis, ancorada no prazo legal de liquidação e pagamento por ente (esfera/UF). Empenho → liquidação → OP → pagamento. Ofício, pedido pela LAI, art. 137 | grande |
| 7 | **Jurídico** | Kanban de 11 etapas (dossiê → ... → encerrado), checklist de 17 documentos, custos, acordos judiciais, 13 alertas de desvio, importação da planilha do escritório, PDFs | grande |
| 8 | **Painel consolidado** | Saúde da carteira, evolução no ano × metas, aging, PDD, roll rate, concentração, conversão, inadimplência por agente/BU, fechamento manual de meses antigos | grande |
| 9 | **Agenda do agente** | O que fazer hoje: ações da régua, promessas, parcelas, NF pública, prazos; próximos 7 dias úteis | médio |
| 10 | **Apoio** | Equipe (organograma e vínculo de login), contatos, histórico do cliente em PDF, planos de pagamento, regras por ente público, feriados, certidões, fontes e links, material de apoio, auditoria | médio |

Carteiras no menu: **1 Privado, 2 Estética, 3 Público, 4 Jurídico**. Estética não é setor
próprio: é o privado filtrado por uma BU.

## 3. Modelo de dados do artefato (e o que muda no Mitra)

O artefato guarda **um documento por cliente** em `propostas`, e a mesma linha é
solicitação, cliente em gestão e caso de cobrança. Tudo fica embutido em arrays dentro
desse documento: histórico, checklist, contatos, parcelas do acordo, baixas, NFs e anexos.

| Coleção / doc | Conteúdo |
|---|---|
| `propostas` | cliente + solicitação + cobrança (~120 campos, prefixo `cob*` para cobrança) |
| `pedidos` | pedidos retidos por limite |
| `juridico` | processo com andamentos, dossiê, acordo e custos embutidos |
| `aging` | foto mensal da carteira (`YYYY-MM`) |
| `fechamentos` | fechamento manual de meses sem foto |
| `auditoria`, `importacoes`, `calibracao` | trilha, log de importação, calibração do farol |
| `config/*` | regras, equipe, planos, pagamento (por ente), feriados, e-mails, certidões, jurídico |

No MySQL isso vira tabelas normalizadas. Primeira proposta, a validar no plan:
`cliente`, `solicitacao_credito`, `pedido_retido`, `titulo` (vindo do Winthor),
`contato_cobranca`, `acordo` + `acordo_parcela`, `baixa`, `nf_publica`, `processo_juridico`
+ `andamento` + `custo` + `dossie_item`, `anexo`, `parametro`, `membro_equipe`,
`plano_pagamento`, `regra_pagamento_ente`, `feriado`, `foto_aging`, `fechamento`, `auditoria`.

## 4. Números da política que estão no código (padrões editáveis)

- **Régua privada (dias corridos):** D+4 cobrança ativa e bloqueio de novos pedidos ·
  D+7 notificação formal · D+10 protesto, negativação e bloqueio total · D+20 negociação ·
  D+30 extrajudicial · D+45 Jurídico · D+60 prazo máximo para ajuizar. Acordo quebra
  com 5 dias de atraso na parcela.
- **Régua pública (dias úteis por NF):** confirmação em 3 dias · liquidação vencida
  D+1/D+5/D+10 · pagamento vencido D+1/D+5 (LAI)/D+15/D+30 (ofício)/D+90 (Jurídico
  avalia). Pequeno valor (R$ 65.492,11) corta os prazos pela metade. Sem bloqueio nem protesto.
- **Criticidade (alerta / crítico):** atraso ≥1 / ≥30 dias · pontualidade <90% / <80% ·
  Serasa <600 / <400 · uso do limite ≥90% / ≥100% · prazo médio >60 / >90 dias ·
  rating D / E. 3 alertas juntos viram crítico.
- **Alçada da concessão privada:** até R$ 50 mil Supervisor, até 500 mil Gerente,
  até 2 mi Comitê regional, acima disso Comitê executivo. **Pública:** até 100 mil, até 1 mi, Diretoria.
- **Alçada do pedido excedente:** até 10% e R$ 20 mil Supervisor, até 25% Gerente, até 50%
  Diretor financeiro, acima disso ou atraso >15 dias Comitê. Esses valores estão **fixos no código**.
- **Baixa como perda:** até R$ 10 mil Gerente financeiro, até 100 mil Diretor financeiro, acima Diretoria/Comitê.
- **PDD por faixa:** a vencer 0,5% · 1–30 3% · 31–60 10% · 61–90 30% · 91–180 50% · >180 100%.
- **Encargos:** privado 2% de multa + 1% a.m.; público 0% + 0,5% a.m.; correção 0,4% a.m.
- **Metas:** análise ≤9 dias · SLA ≥85% · aprovação 60–85% · inadimplência ≤5% ·
  vencido >90 d ≤2% · PDD ≤3% · recuperado/gerado ≥80% · conversão ≥60% · promessas cumpridas ≥70%.
- **Jurídico:** acordo com entrada de 20%, no máximo 5 parcelas, alçada acima de R$ 50 mil,
  honorários de 10%; custo do processo com meta de até 10% do valor.

## 5. O que é protótipo e precisa ser refeito do jeito certo

1. **Toda validação roda no navegador.** Alçada, segregação de funções ("quem analisa não
   aprova") e gates de etapa precisam ir para Server Function. Usuário sem vínculo na equipe
   hoje não sofre restrição nenhuma.
2. **Não há perfis.** Só "pode editar" ou "só lê". O Mitra exige perfis: agente, supervisor,
   gerente, diretoria, jurídico e financeiro.
3. **Gravação sem transação e documento inteiro sobrescrito.** Duas pessoas editando o mesmo
   cliente perdem dados. No Mitra, cada ação é uma SF de escrita pontual.
4. **Foto mensal do aging é tirada quando alguém abre o app** no mês. Isso precisa virar rotina agendada.
5. **E-mail e WhatsApp:** o "envio automático" não existe; hoje é copiar e colar (`mailto`).
6. **Importações** (Winthor, planos, planilha do Jurídico) são lidas no navegador e gravadas
   uma a uma. O Winthor costuma rodar em Oracle, e o SGC (p-45547) já usa JDBC Oracle: dá
   para avaliar leitura direta em vez de planilha.
7. **Vínculo Jurídico ↔ cliente é feito por nome**, com tolerância a erro de digitação.
   O certo é vincular por CNPJ ou código Winthor.
8. **Status de parcela pela cor da célula** na planilha do Jurídico.
9. **Dezenas de limiares fixos no código** que deveriam ser parâmetros (a lista está no relatório A, §8.2).
10. **Resíduos:** lista `PRODUTOS` de protótipo bancário, dados de exemplo, "12 indicadores" que são 10.
11. **PDFs e anexos** usam APIs da plataforma de origem (`downloads`, `/_blob`). No Mitra é preciso
    um equivalente: jsPDF no front e storage de arquivos.

## 6. Perguntas para o gestor (bloqueiam a spec)

1. **Bloqueio total é em D+10 ou D+20?** O texto da tela diz D+20 (negativação e protesto),
   mas o parâmetro padrão manda protestar e bloquear em D+10, e a negociação começa em D+20.
2. **Os dados que estão no artefato são reais e precisam migrar?** O banco compartilhado já tem
   clientes, propostas e processos.
3. **Winthor:** continua por planilha exportada ou vamos ler direto do banco? Quais telas do
   Winthor alimentam títulos, planos e NFs?
4. **O sistema escreve no Winthor** (bloqueio de pedido, limite) ou continua manual, com a lista de bloqueio?
5. **Envio de e-mail e WhatsApp:** é para enviar de verdade? Por qual conta e canal?
6. **Perfis:** quem pode mover etapa, aprovar, editar regras, lançar baixa e importar?
7. **Rating:** no privado, quem atribui AA–H e com base em quê? No público o motor dá P1–P4,
   um domínio diferente que o código mistura.
8. **Estética:** é uma BU (filtro) ou uma carteira com regras próprias?
9. **Jurídico:** a planilha do escritório continua existindo (importação recorrente) ou o
   sistema passa a ser a fonte?
10. **Legislação e valores** citados (Decreto 12.807/2025, regras por ente marcadas
    "a confirmar"): quem valida?
11. **Por onde começar?** É grande demais para uma entrega só.

## 7. Proposta inicial de fatiamento (substituída pelo §8.5)

| Spec | Fatia | Depende de |
|---|---|---|
| 001 | Base: clientes, equipe/perfis, parâmetros, importação de títulos Winthor, auditoria | — |
| 002 | Concessão privada + gestão de crédito (validade, reanálise, obsoleto) + pedidos acima do limite | 001 |
| 003 | Cobrança privada: régua, Kanban, contatos, promessas, acordos, baixa, agenda | 001 |
| 004 | Painel consolidado: aging, PDD, roll rate, metas, foto mensal | 001–003 |
| 005 | Público: concessão + NF + régua por dias úteis + regras por ente | 001 |
| 006 | Jurídico | 003 |
| 007 | Farol/motor de crédito e calibração, e-mails automáticos, PDFs | 002, 003 |

Sugestão de MVP: **001 + 003** (cobrança privada), porque é onde está o dinheiro vencido e
a régua já está bem definida. A concessão (002) entra em seguida.

---

## 8. Decisões e sugestões (11/11/2026)

### 8.1 Respostas do gestor

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Bloqueio total em D+10 ou D+20 | **em aberto** |
| 2 | Dados do artefato migram? | **em aberto** |
| 3 | Winthor | **Tempo real por JDBC.** O Mitra já tem a conexão Oracle do Winthor no SGC (JDBC `3`). Acaba a tela de importação |
| 4 | Escrever no Winthor | **Manual por enquanto.** O sistema gera a lista de bloqueio e o agente aplica no Winthor |
| 5 | Canal de mensagem | **Inicialmente e-mail.** WhatsApp fica para depois |
| 6 | Perfis | sugestão no §8.2 |
| 7 | Rating | sugestão no §8.3 |
| 8 | Estética | **É uma BU, mas é trabalhada de forma diferente das demais** (§8.4) |
| 9 | Jurídico | **O sistema passa a ser a fonte.** Não há importação recorrente da planilha; no máximo uma carga inicial |
| 10 | Legislação | sugestão no §8.6 |
| 11 | MVP | sugestão no §8.5 |

**Consequência técnica do "tempo real" (proposta):** o Mitra não consegue juntar, num
mesmo SQL, uma tabela do Winthor com uma do projeto (contatos, etapa, agente). Proposta:
- **Ao vivo:** a ficha do cliente e a lista de títulos consultam o Winthor direto por JDBC, sempre atualizados.
- **Sincronizado a cada 15 min (cron):** uma SF copia a posição consolidada por cliente
  (vencido, a vencer, dias de atraso, próximo vencimento, limite, utilizado, recebimentos)
  para o MySQL do projeto. Kanban, agenda, painel e aging leem essa cópia.
  Assim respeitamos o teto de 300 SF/min e não carregamos o Oracle a cada tela aberta.
- A régua avança sozinha a cada sincronização; quem pagou sai da cobrança no ciclo seguinte.

### 8.2 Sugestão de perfis

| Perfil | Enxerga | Pode | Não pode |
|---|---|---|---|
| **Agente de cobrança** | a própria carteira | registrar contato, promessa e próxima ação; marcar ação da régua como feita; enviar e-mail manual; propor acordo e baixa | aprovar o que propôs, editar regras, ver carteira de outro agente |
| **Supervisor** | a própria carteira e a dos agentes que reportam a ele | tudo do agente + aprovar e-mails "com aprovação", aprovar acordo na sua alçada, redistribuir clientes entre agentes | editar regras |
| **Gerente financeiro** | toda a carteira | tudo do supervisor + alçada de Gerente, baixa até R$ 10 mil, enviar ao Jurídico | aprovar o que ele mesmo propôs |
| **Diretoria** | tudo | alçadas de Diretoria e Comitê, baixa acima de R$ 100 mil | — (perfil de decisão, não de operação) |
| **Jurídico** | o módulo Jurídico e, só para leitura, a cobrança dos clientes enviados | tudo no Jurídico: etapas, andamentos, custos, acordos judiciais | mexer na régua da cobrança |
| **Administrador (Núcleo Financeiro)** | tudo | parâmetros da régua e da política, equipe, modelos de e-mail, planos, feriados, regras por ente | — (perfil que se soma a um cargo, não um nível da hierarquia) |
| Analista de crédito (fase 3) | esteira de concessão | analisar e propor limite | aprovar a própria análise |

Regras que valem para todos e ficam no servidor (SF), nunca só na tela:
1. **Visibilidade pela hierarquia:** a SF filtra pelo usuário logado (`:VAR_USER` → membro → subordinados).
2. **Alçada:** o nível do cargo precisa ser maior ou igual ao nível exigido pelo valor. A SF recusa caso contrário.
3. **Segregação:** quem propõe (acordo, baixa, crédito) não aprova. A SF compara o propositor com o aprovador.
4. **Auditoria:** toda escrita grava quem, quando, o valor antes e o valor depois.

Pergunta derivada: **o analista de crédito e o agente de cobrança são a mesma pessoa?**
No artefato são o mesmo campo.

### 8.3 Sugestão para o rating

Hoje existem duas escalas que se sobrepõem. O **farol** tem 6 faixas, AA a E, calculadas
pelo score. O **rating "Res. 2.682"** tem 9 níveis, AA a H, e é digitado à mão. A
Resolução 2.682 é uma norma do Banco Central para instituições financeiras e já foi
substituída pela Res. CMN 4.966, então a Benenutri não tem obrigação de segui-la.

Proposta, um rating só e calculado:
1. **Rating = faixa do farol (AA, A, B, C, D, E)**, calculado pelo motor que já existe no artefato:
   - score final = 60% Serasa + 40% comportamento conosco;
   - a faixa é a pior entre a do score e a dos dias de atraso;
   - cada alerta (negativação, protesto, Receita irregular, CNPJ novo etc.) rebaixa uma faixa.
2. **O analista pode ajustar**, com justificativa obrigatória e aprovação de quem está acima. Fica na auditoria.
3. **Duas fotografias:** o *rating na concessão* fica congelado no dia da aprovação; o *rating
   atual* é recalculado a cada sincronização com o Winthor. "Risco não previsto" = aprovado
   em AA, A ou B e hoje em C ou pior; "risco aceito" = aprovado já em C ou pior.
4. **Público fica à parte:** P1 a P4, em outro campo, sem misturar com AA–E. O artefato mistura
   as duas escalas e erra a criticidade dos órgãos públicos.

Sem o AA–H acaba o campo manual que ninguém sabe preencher, e rating e farol deixam de se contradizer.

### 8.4 Estética

No artefato, a Estética é só um filtro: privado com BU = Estética, linha Galderma no Jurídico.
As regras são as mesmas do privado. Há inclusive um defeito: clientes da Estética podem ficar
fora da régua privada, porque o código compara o segmento com "privado".

Proposta: a BU tem um **segmento**, e os parâmetros podem ter um **valor por segmento**
que sobrepõe o geral (régua, encargos, alçadas, modelos de e-mail, equipe). A Estética passa a
diferir só nos parâmetros, sem código separado.

**Pergunta ao gestor:** o que muda na Estética? Prazos da régua, equipe própria, encargos,
plano de pagamento, aprovação, mensagens?

### 8.5 Sugestão de MVP e fases

**MVP: cobrança privada, incluindo a Estética.**

É onde está o dinheiro vencido, a régua já está madura no artefato e, com o Winthor ao vivo,
a carteira nasce pronta, sem depender da esteira de concessão.

Entra no MVP:
1. Leitura do Winthor por JDBC: clientes, títulos em aberto e pagos, limite e plano (§8.1).
2. Equipe, perfis (§8.2) e vínculo cliente → agente.
3. Régua automática: preventiva D-5, D-1 e D0, depois D+1, D+4, D+7, D+10, D+20, D+30 e D+45,
   com Kanban, checklist de cada ação e parâmetros editáveis (por segmento).
4. Contatos, promessas de pagamento, próxima ação, acordo com parcelas e quebra de acordo.
5. Minha agenda: o que fazer hoje e nos próximos 7 dias úteis, com feriados.
6. E-mails da régua: fila do dia, modelos editáveis, modo manual ou com aprovação, envio pelo e-mail da plataforma.
7. Lista de bloqueio para aplicar no Winthor (novos pedidos e bloqueio total).
8. Painel da cobrança: saldo vencido, aging, inadimplência por agente e por BU, promessas cumpridas, conversão.
9. Auditoria.

Fica fora do MVP: concessão e esteira, pedidos acima do limite, farol, setor público, Jurídico,
PDD, roll rate e evolução anual, baixa como perda, PDFs, WhatsApp, envio 100% automático,
escrita no Winthor.

| Fase | Entrega | Por que nessa ordem |
|---|---|---|
| **1 · MVP** | Cobrança privada + Estética | maior retorno, menor dependência |
| 2 | Jurídico (dossiê enviado pela cobrança em D+45, processos, custos, acordos, PDFs de notificação e demonstrativo) | continuação natural da régua; o sistema passa a ser a fonte |
| 3 | Concessão, gestão de crédito, pedidos acima do limite, farol e rating (§8.3) | exige o motor e as alçadas; aproveita os perfis da fase 1 |
| 4 | Setor público (NF, régua em dias úteis, regras por ente, motor público) | regras legais ainda "a confirmar" (§8.6) |
| 5 | Consolidado completo: PDD, roll rate, metas, evolução, baixa como perda, histórico em PDF | depende do histórico acumulado nas fases anteriores |

### 8.6 Sugestão para validar legislação e valores

| O quê | Quem valida | Como fica no sistema |
|---|---|---|
| Textos com efeito legal: notificação formal, aviso de protesto, notificação extrajudicial, multa e juros | **Jurídico**, uma vez antes de entrar no ar e depois uma vez por ano | modelos editáveis só pelo Administrador, com versão e data de validação |
| Multa de 2%, juros de 1% a.m. e correção (privado) | **Jurídico + Gerência Financeira**, conferindo com os contratos e condições de venda | parâmetro com auditoria |
| Regras de pagamento por ente (prazos de liquidação e pagamento por esfera e UF) | **Gerência Financeira**, com o link da norma de cada ente | cada regra tem situação (Verificado / A confirmar), quem validou e quando; "A confirmar" aparece com aviso na NF |
| Valores corrigidos por decreto todo ano (ex.: pequeno valor da Lei 14.133, art. 75 II) | **Gerência Financeira**, todo janeiro | parâmetro com vigência (valor + data de início), não constante no código |
| Citações de lei nas telas de apoio (Fontes, Regras) | **Jurídico** | texto de conteúdo, fora do código |

No MVP só a primeira e a segunda linha bloqueiam: modelos de notificação e protesto, e
multa e juros. O resto é do setor público (fase 4).
