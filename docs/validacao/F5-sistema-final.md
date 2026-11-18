# F5 — Validação final do sistema inteiro

**Validador:** independente (Opus 5.5, fase 5); só leu, executou e navegou. Único arquivo escrito no repositório: este.
**Data:** 17/11/2026 (relógio do simulador: 19/11/2026 10:00).
**Pergunta:** o sistema entregue faz o que o artefato "Painel Crédito e Cobrança" do gestor pedia, e funciona de ponta a ponta para quem vai usá-lo?
**Base lida:** artefato original (leitura isolada, via ferramenta Artifact), `docs/estudo-artefato/00-visao-geral.md` e `D-telas-fichas-eventos.md`, `docs/arquitetura.md` (§7 D-01..D-10), `docs/execucao.md`, as 7 `spec.md` (seções "Fora de escopo"), `docs/opcoes-tela/escolhas.md`, `docs/contrato/00-indice.md` (P-01..P-50, S-01..S-16), relatórios `docs/validacao/B*.md`, `CLAUDE.md`, `README.md`, `AGENTS.md`, `backend/sandbox/t002-confirmar.mjs`.

## Resumo

| | Quantidade |
|---|---|
| BLOQUEIA | **0** |
| CORRIGIR | **5** |
| OBSERVAÇÃO | **9** |
| Tropeços de uso anotados na navegação | **17** |
| Itens do artefato na tabela de cobertura | 64: **49 cobertos**, **12 mudaram** por decisão (D-xx, decisão de 11/11 ou escolha de tela) ou pendência (P-xx), **3 parciais** e **0 faltando sem decisão** |

**Testes (rodados por mim):**
- `cd backend && npm test`: regra **94/94**; `sim:check` **119 SQL executadas, 0 falharam** (269 puladas por serem escrita/JS; 37 leituras sem linha no banco do check); smoke **405 ok / 0 pulados / 0 falhas** (000 a 007 + `900-fluxos`). Exit 0.
- `cd frontend && npm test` **76/76**; `npm run build` limpo (aviso de pacote principal de 1,2 MB); `npm run lint` limpo. Rodados de novo depois de o orquestrador instalar o SheetJS no meio desta validação: 76/76, build e lint limpos.

**Navegação real** (simulador 3115 + Vite 5185, banco refeito com `npm run sim:seed`, navegador embutido): os 7 fluxos pedidos foram percorridos e **todos chegaram ao fim**, com uma exceção de uso (C-02). Console sem erro nem aviso em toda a sessão. Claro e escuro conferidos; 375 px sem rolagem horizontal em duas telas. Servidores desligados no fim.

**Veredito:** o sistema cobre o artefato, com as mudanças que as decisões do usuário e do gestor explicam. De ponta a ponta ele funciona para quem vai usá-lo: agente, supervisor, analista, gerente, Jurídico, administração e a carteira Pública. Nada bloqueia a subida. Antes de subir, corrija o roteiro de publicação (C-01). Os outros quatro itens (C-02 a C-05) podem ir na mesma leva ou logo depois.

---

## Cobertura do artefato

Legenda: **OK** = existe e foi conferido (na tela, no teste ou nos dois); **Mudou** = está diferente por decisão ou pendência registrada; **Parcial** = existe com corte registrado na spec.

### Estrutura e navegação

| # | Do artefato | Onde está no sistema | Situação |
|---|---|---|---|
| 1 | Carteiras Privado, Estética, Público e Jurídico, cada uma com Análise de crédito e Cobrança | Abas Privado, Estética e Público em `/credito/:carteira` e `/cobranca/:carteira` (004 e 002, D-05: uma família de telas e SFs parametrizada pela carteira); Jurídico em `/juridico` (003) | OK (D-05) |
| 2 | Filtros globais Mês e BU, e "Limpar filtros" | Painel: Mês, BU e Carteira (006); Visão da cobrança: BU, agente e período (002); filtros por tela, sem filtro global único | Parcial: o filtro de mês fica por tela; a 006 tira o filtro por agente e por ramo, que seguem a visibilidade de quem abre |
| 3 | "+ Nova solicitação" (análise ou pedido excedente) | "Nova solicitação" na Esteira, assistente em 3 passos (004 `NovaSolicitacao.tsx`). Conferido com a Rita | OK |
| 4 | "Ocultar exemplos" | Não existe: não há dados de exemplo (resíduo de protótipo, estudo §5 item 10) | Mudou (P-02: sem migração) |
| 5 | Importação do Winthor por CSV/Excel com prévia e recebimentos sem duplicar | Leitura direta por JDBC, sincronizada pela `ccRotina` (001), tela **Sincronização**; recebimentos com chave natural em `CC_RECEBIMENTO` | Mudou (decisão de 11/11: tempo real por JDBC) |

### Telas do menu

| # | Do artefato | Onde está no sistema | Situação |
|---|---|---|---|
| 6 | Painel consolidado (saúde, KPIs, evolução, movimento, planos, agentes, agenda, conversão, aging, concentração) | `/painel`, 5 abas, 13 blocos (006, `ccPainel*`). Conferido com Gustavo e Ana (visão restrita: "46 clientes · a sua carteira") | OK |
| 7 | Lançar fechamento de meses anteriores (carteira, vencido, >90 d, PDD) | Bloco Evolução, "Lançar fechamento" (006 `ccPainelFechamentoSalvar`); quem lança: Gerente ou acima (P-26) | OK |
| 8 | Visão gerencial do crédito (esteira, gestão, saúde, desempenho, regras) | Aba Visão gerencial de `/credito` (004); concentração, PMR e deferido × negado no Painel (DT-27) | OK |
| 9 | Gestão de crédito (carteira, pedidos acima do limite, validade, análises em risco) | Abas Gestão de crédito, Pedidos acima do limite e Saúde das análises (004) | OK |
| 10 | Minha agenda (ações do dia, promessas, acordos, preventiva, fichas, prazos de crédito; próximos 7 dias úteis) | `/agenda` (002), semana em colunas + abas Clientes, Aprovações e Indicadores (escolha B+C), feriado de 20/11 respeitado. Conferida com Ana, Silvia e Júlia | OK |
| 11 | Processo de cobrança cliente a cliente com filtros (passo atrasado, sem contato > 7 d, retorno prometido, em acordo) | Agenda, aba Clientes: Todos, Com passo atrasado, Sem contato recente, Com promessa, Em acordo | OK |
| 12 | Regras de cobrança (régua privada, régua pública por NF, mensagens, modo de envio, alçadas) | `/cobranca/regras` (002) e `/publico/notas-fiscais` aba Etapas e prazos (005) | Parcial: o cronograma dia a dia (D+2, D+5, D+15…) saiu (002 Fora de escopo); a tela mostra prazo e ação de cada etapa |
| 13 | Semáforo (faixas, simulador de limite, carteira por faixa, validação trimestral, clientes por farol) | `/semaforo` (004 `Semaforo.tsx`, nível ≥ 2): os cinco blocos, com calibração | OK |
| 14 | Regras de negócio em consulta + trilha de auditoria somente leitura | `/apoio/regras` "Regras em vigor" (007) e `/admin/auditoria` (001) | OK |
| 15 | Fluxo da NF pública (etapas e prazos, notas em tramitação, regra por ente, comunicação) | `/publico/notas-fiscais` (abas Etapas e prazos, Notas, Contratos), `/publico/regras-ente`, `/publico/comunicacao` (005). "Lançar datas" conferido: grava e move o card do órgão | OK |
| 16 | Prazos de pagamento (tabela de planos, prazo médio, clientes por plano, integração Winthor) | `/cadastros/planos` (001, só leitura, lido do Winthor) e bloco Planos do Painel (006) | Mudou (P-13; importação substituída pelo JDBC) |
| 17 | Jurídico: Kanban ou lista, acordos, custos, alertas, importar e exportar CSV | `/juridico` (003): Quadro/Lista, abas Acordos judiciais, Custos, Alertas de desvios, "Exportar CSV"; carga da planilha em `/juridico/carga` | OK; importação recorrente virou **carga única** (decisão de 11/11, item 9) |
| 18 | Equipe (organograma, indicadores por nível, cadastro) | `/equipe` "Equipes lado a lado" + Cadastro + Redistribuir (001); indicadores por nível no Painel (006 `painel-equipe`) | Mudou (escolha da tela: "sem organograma") |
| 19 | Contatos | `/contatos` (001), agenda de contatos | OK |
| 20 | Histórico do cliente com PDF | `/historico/:id` (007), linha do tempo com 39 origens, "Gerar PDF" e "Imprimir" pela impressão do navegador. Conferido: mostrou contato, promessa, e-mail, acordo e aprovação feitos na navegação | OK (timbre oficial aguarda arte, P-32) |
| 21 | Histórico de cobranças | `/cobranca/contatos` "Histórico de contatos" (002), com busca e "Abrir caso" | OK |
| 22 | E-mails da régua | `/cobranca/emails` (002), fila por situação, envio e aprovação em lote de 2 | OK |
| 23 | Fontes e links | `/apoio/fontes` (007) | OK (endereços oficiais pendentes, P-32) |
| 24 | Material de apoio | `/apoio/material` (007) | Parcial: os 7 itens entram como "Arquivo pendente" (P-33); treinamentos e documentos do Jurídico ficam para cadastro manual |
| 25 | Clientes bloqueados para novos pedidos | `/cobranca/bloqueio` "Lista de bloqueio para o Winthor" (002): a bloquear (pedidos e total), a liberar, bloqueados; "Registrar aplicado no ERP" | OK (o sistema não escreve no Winthor, decisão de 11/11) |
| 26 | Projeção de possível inadimplência | `/cobranca/projecao` (002) | OK |
| 27 | Quadro de cobrança Kanban, arrastar o cartão | Quadros da lib `@benenutri/mitra-kanban` por carteira; mover só por "Mover para" no card aberto | Mudou (arquitetura §8: sem arrastar e soltar) |
| 28 | Ficha da proposta, pedido excedente e cobrança (painel lateral) | Card aberto da lib com "Nesta fase", abas extras e ações (Registrar contato, Propor acordo, Propor baixa, Registrar bloqueio, Montar dossiê) | OK |
| 29 | Carta de anuência e baixa como perda | Ações do caso (002 `ccCobBaixa*`, evento ANUENCIA na agenda); baixa com parecer do Jurídico (P-36) | OK |

### Indicadores

| # | Do artefato | Onde | Situação |
|---|---|---|---|
| 30 | Carteira total, saldo vencido, vencido > 90 d, PDD, índice de inadimplência | Painel, Visão geral e Aging e PDD (006) | OK |
| 31 | Inadimplência gerada, saldo recuperado, recuperado ÷ gerado | Painel, bloco Movimento (006); recuperado = pagamento depois do vencimento (P-31) | OK |
| 32 | Conversão (recebido ÷ cobrado), promessas cumpridas | Painel, bloco Agentes; Visão da cobrança (002) | OK |
| 33 | Roll rate | Painel, aba Cobrança (006 `ccPainelRollRate`), foto mensal pela rotina | OK |
| 34 | % no prazo, contatos sem retorno > 7 dias | Agenda, aba Indicadores e KPI "Sem contato recente"; RN-033 da 002 | OK |
| 35 | Em análise, taxa de aprovação, fora do SLA, enviadas para gestão | Esteira (004), faixa de KPIs. Conferido | OK |
| 36 | SLA cumprido (meta 85%), ciclo médio | Desempenho (004), `meta.slaPct` = 85 | OK |
| 37 | Limite concedido, uso da carteira, pedidos retidos, pedidos fora do SLA | Gestão de crédito (004) | OK |
| 38 | Saúde das análises, risco não previsto, risco aceito | Saúde das análises (004 `ccCredRisco*`); Painel, bloco Saúde | OK (não roda na Pública, E-4) |
| 39 | Concentração por cliente, grupo, região, BU e setor | Painel, bloco Concentração (006, com HHI) | OK ("setor" virou carteira, D-05) |
| 40 | Prazo médio do cliente, índice de saúde por agente, PDD por faixa | Motor (004), Saúde das análises, Painel Aging e PDD | OK |
| 41 | Indicadores sem regra (eficiência, índice de recebimento, tempo médio de atendimento, classificação qualitativa, cobertura da carteira) | Não construídos; voltam quando o gestor definir a conta (002 Fora de escopo) | Mudou (aguardam o gestor) |
| 42 | Crédito deferido × negado **por BU** | Não existe; a solicitação é do cliente na carteira (006 Fora de escopo) | Mudou (D-01: a BU é do item, não do cliente) |

### Regras de negócio

| # | Do artefato | Onde | Situação |
|---|---|---|---|
| 43 | Validade do crédito 3 meses → Reanálise (2+ compras) ou Cadastro obsoleto | 004, rotina e parâmetros `cred.*` | OK |
| 44 | Classificação Saudável / Em atenção / Risco | 004 RN de saúde; Painel mostra os três grupos | OK |
| 45 | Crítico e Alerta (limites e soma de sinais) | 004 "Clientes sinalizados", parâmetros `crit.*` | OK |
| 46 | Risco não previsto (AA–B depois em risco) e risco aceito (C ou pior) | 004 `ccCredRiscoResumo` sobre o rating congelado na concessão | OK |
| 47 | Rating AA–H "Res. 2.682" digitado | Rating único AA–E calculado pelo motor, com ajuste justificado | Mudou (estudo §8.3; 004 Fora de escopo) |
| 48 | Régua privada: novos pedidos bloqueados em D+4; bloqueio total em D+20 (texto) | D+4 pedidos; **bloqueio total em D+10** (`regua.bloqTotal`) | Mudou (P-01 em aberto; padrão do parâmetro do artefato) |
| 49 | Régua pública sem bloqueio nem protesto, dias úteis, ofício e requerimento mudam a etapa, judicial depende do Jurídico | 005 (régua por NF, `CC_NF_ACAO`) + 002 (caso público), E-1 a E-3 | OK |
| 50 | Certidões: alerta 15 dias antes | `/publico/certidoes` (005) e Pontos de atenção do Painel ("3 certidões vencendo ou vencidas") | OK |
| 51 | Prazo médio = média das parcelas de valor igual, dias corridos | Planos (001) e motor (004) | OK |
| 52 | Limite sugerido = política × % da faixa, teto sobre o faturamento | Motor da 004. Conferido: "compra média × 30 ÷ 30 × 1,2; faixa AA 100% a 120%, teto 30% do faturamento" | OK |
| 53 | Alçadas sobem com o excesso; pedido retido até decidir; crítico vai à diretoria/comitê | 004 (`alcada.*`, pedidos acima do limite), quem propõe não decide (DT-40) | OK |
| 54 | Modo de envio automático, com aprovação ou manual por etapa | Os três existem em `cob.emailModo.*`; **nenhuma etapa nasce automática** | Mudou (P-24) |
| 55 | Metas, PDD por faixa e limite de inadimplência de 10% editáveis | `/admin/parametros` grupos Metas e Provisão (`meta.inadIndiceAlerta` = 10). Edição conferida com a Nara | OK |
| 56 | Encargos (2% + 1% a.m. privado; 0% + 0,5% público; correção 0,4%) | `enc.*` por carteira, `ccCobEncargosCalcular` título a título | OK (P-08, P-34) |
| 57 | Jurídico: acordo com entrada de 20%, até 5 parcelas, alçada acima de R$ 50 mil, honorários 10% | `jur.acordo*`. Conferido com a Júlia: R$ 15 mil, entrada R$ 3 mil, 4 parcelas, honorários R$ 1.500, "em andamento" | OK |

### Fluxos e perfis

| # | Do artefato | Onde | Situação |
|---|---|---|---|
| 58 | Concessão: solicitação → análise → decisão → gestão → validade → reanálise ou obsoleto | Quadros `concessao-<carteira>`. Percorrido: Rita, fases 1 a 4 com consultas, motor e parecer; Gustavo aprova e nasce a pendência do Winthor | OK |
| 59 | Cobrança: títulos → caso → régua → mensagens → bloqueio no ERP | Rotina + quadros `cobranca-<carteira>`. Percorrido: Ana registra contato e promessa, envia o e-mail, propõe acordo; Sérgio aprova | OK |
| 60 | NF pública: empenho → liquidação → pagamento, "Feito" pelo agente | 005; "Lançar datas" conferido; passo da régua por NF na agenda | OK |
| 61 | Perfis Diretoria, Gerente, Supervisor, Agente; visibilidade pela hierarquia; comitê e alçadas | `CC_MEMBRO.CAMINHO`; mais os perfis Analista, Jurídico e a marca Administrador (D-06, D-09) | OK |
| 62 | Trilha de auditoria não editável | `CC_AUDITORIA` (001), toda escrita auditada; tela só leitura | OK |
| — | WhatsApp | Fora: só e-mail | Mudou (decisão de 11/11) |
| — | Escrever no ERP (bloqueio, limite) | Fora: listas e pendências para aplicar à mão | Mudou (decisão de 11/11) |

**Do artefato não falta nada que não tenha decisão registrada.** Os três parciais (filtro global de mês, cronograma dia a dia da régua, arquivos do material de apoio) e os indicadores sem regra estão escritos nas specs como corte ou pendência do gestor.

---

## BLOQUEIA

Nenhum.

## CORRIGIR

- **C-01 · O roteiro de publicação não manda rodar a confirmação do sandbox** (`CLAUDE.md`, "Como subir para o Mitra"; `README.md`; `backend/sandbox/t002-confirmar.mjs`). Nem o `CLAUDE.md` nem o `README.md` citam o `t002-confirmar.mjs` (S-01 a S-16), a variável `T002_BUSINESS_TOKEN`, que ele exige e que também falta no `backend/.env.example`, nem o momento de rodá-lo. Quem seguir o roteiro publica sem confirmar o que sustenta a segurança (identidade em chamada aninhada, `{{x}}` ligado como parâmetro, erro 1093, perfil). O momento também se contradiz: `contrato/00-indice.md` §5 diz que a T-002 "fecha antes de publicar", e o cabeçalho do roteiro diz "roda depois da publicação COMPLETA". A ordem dos `add-*.mjs` no `CLAUDE.md` bate com o `PUBLISH_ORDER` de `simulator/config.mjs`.
- **C-02 · Supervisor de outra equipe recebe o acordo para decidir e cai num beco** (`add-020-cobranca-privada.mjs:340` evento `ACORDO_DECIDIR` sem `enxerga`; tela `modules/002-cobranca-privada/Acordo.tsx`, que lê `ccCobCasoFicha`). Reprodução: a Ana propõe um acordo de R$ 12 mil para o 2005, da equipe do Sérgio. A Silvia vê o acordo em Minha agenda, aba Aprovações, e clica em "Ver e decidir". A tela mostra "Cliente não encontrado." (a SF 2002 devolve `ok:false`). A correção C-02 da B2 tirou a visibilidade da decisão e da agenda (04 §0), mas a tela continua exigindo-a. O mesmo deve valer para `BAIXA_DECIDIR` (não conferido na tela). Ou a tela abre a decisão sem a ficha, ou a agenda volta a filtrar.
- **C-03 · O card da concessão não atualiza "Para avançar" nem "Documentos exigidos" depois de marcar o checklist** (card aberto da `concessao-*`, extensão da 004). Com os 13 itens da fase 2 marcados "Sim", o bloco continuou com "Confirmação por telefone / endereço / contato pendentes" e "0 de 6 atendidos". O certo (5 de 6) só aparece ao fechar e reabrir o card. O analista é levado a achar que falta algo ou a reabrir o card a cada passo.
- **C-04 · Texto técnico na tela** (lib e telas da 002/007). Ao mover a solicitação aparece "Movido. card_movido → comite: enviar_email: 1 ação(ões) executada(s)". A fila de e-mails mostra o código do modelo ("2005 · COB_ATIVA"). O histórico do cliente mostra "Cobrança: E-mail cob_ativa", "PRIVADA · cob_ativa" e "Acordos: Situação De PROPOSTO para ATIVO". Troque pelos rótulos de negócio.
- **C-05 · O README não descreve o sistema como ele está** (`README.md`). Faltam: como rodar o frontend (`npm install`, `npm run dev` na 5185, `npm test`, `build`, `lint`); a lista dos 7 módulos e das carteiras; os perfis do elenco (quem é agente, supervisor, analista, Jurídico, marca Administrador); e o passo de confirmação no sandbox (C-01). O `CLAUDE.md` está correto quanto à estrutura e à ordem, mas também não traz o C-01.

## OBSERVAÇÃO

- **O-01 · Datas relativas no simulador usam a data do navegador.** Prazos do card e da lib dizem "24/11 · em 7 dias", "19/11 · em 2 dias", "15/11 · há 2 dias"; o andamento diz "último há 5 dia(s)" para 14/11. A conta parte de 17/11 (máquina) e o sistema está em 19/11. O resultado é um "Prazo vencido" em card que entrou na fase hoje. Só acontece no simulador; já anotado no diário.
- **O-02 · Campos da capa aparecem como caixas editáveis** no card de concessão: Valor, Rating, Validade, Limite sugerido e Alçada no "Formulário inicial", sem `readOnly`. Uma tentativa sintética de gravar "AA" no Rating não persistiu (`KB_CARD.VALORES_JSON` não mudou), mas não confirmei se o gancho recusa a edição feita de verdade. É o valor que quem decide lê. Confirmar que a capa é só leitura para o usuário.
- **O-03 · Pacote principal de 1,2 MB** (aviso do Vite). O xlsx (500 kB) já vai num pedaço separado, carregado sob demanda.
- **O-04 · O frontend mudou durante esta validação.** O orquestrador instalou `xlsx` (tarball `cdn.sheetjs.com`, URL no `package.json`) e ligou `ligarLeitorXlsx` no `App.tsx`. Testes, build e lint reconferidos depois: verdes. A carga do Jurídico foi conferida com uma planilha de teste (`scratchpad/final/teste-carga.xlsx`): 5 abas lidas, 2 processos, etapas sugeridas, o 2005 vinculado "Pelo código" e o 9999 "não encontrado; sem nome parecido". Não apliquei a carga.
- **O-05 · Card de domínio sem `ORIGEM_CHAVE`.** O card 238 da solicitação criada na navegação tem `ORIGEM_CHAVE` nulo; a arquitetura §8.2 fala em `cc:<entidade>:<id>`. A divergência foi aceita na B2 e o vínculo funciona por `CARD_ID`. Fica o registro para o contrato.
- **O-06 · `sim:check` com 37 leituras sem linha** no banco do check. Não é falha (os smokes cobrem), mas o check não prova o retorno dessas SQL.
- **O-07 · Prévia do acordo × gravação.** A prévia mostrou a parcela 5 em 26/03/2027; o acordo gravado ficou com 29/03/2027 (o servidor ajusta para dia útil). A tela não avisa a diferença.
- **O-08 · Git sem nenhum commit.** `.claude/launch.json` iria no primeiro commit (inócuo). `backend/migrations/` não existe (intocado). Não há `.env` em lugar nenhum; o `.gitignore` cobre `.env`, `.env.*` (exceto `.env.example`), `dist/`, `node_modules/`, `backend/simulator/data/` e `uploads/`; os dois `.env.example` só têm chaves vazias.
- **O-09 · Visão da cobrança do Sérgio mostra "Equipe de Gustavo Lima"** com só o Sérgio, zerado, acima da equipe dele. Para o supervisor, o bloco do superior não informa nada.

---

## Tropeços de uso

Anotados na navegação, com o perfil que tropeçou.

1. **Ana, Rita, Silvia, Sérgio (entrada):** todos caem no Painel. Para o agente, a tela do dia é Minha agenda; o fluxo pedido ("entra, vê a agenda") exige um clique a mais todo dia.
2. **Ana (agenda):** no evento "Bloqueio total" da CLINICA NOVA ERA, o clique leva à Lista de bloqueio na aba "A bloquear: novos pedidos", onde o cliente não está (ele está em "total"). Também só o nome do cliente é clicável, não o evento inteiro.
3. **Ana (agenda × visão):** "Ações atrasadas" vale 6 na agenda dela e 2 para ela na Visão da cobrança. Os dois números têm o mesmo nome e contam coisas diferentes.
4. **Silvia (agenda):** os KPIs "Para hoje", "Promessas vencidas" e "Sem contato" mostram "—" enquanto a coluna Hoje tem 10 itens (são aprovações). Parece vazio.
5. **Silvia (decisão de acordo):** "Ver e decidir" leva a "Cliente não encontrado." (C-02).
6. **Ana (registrar contato):** o Retorno oferece "Aguardando liquidação (órgão)" para cliente privado.
7. **Ana (e-mails da régua):** "Ver" abre a prévia só com "Fechar", sem "Enviar"; é preciso fechar e procurar o botão na linha. "Enviar" manda o e-mail ao cliente num clique, sem confirmação. O retorno diz "1 e-mail(s) enviado(s)". A linha mostra o código do modelo (C-04).
8. **Ana (acordo):** a data da última parcela muda entre a prévia e o gravado (O-07).
9. **Rita (nova solicitação):** a busca mostra o CNPJ sem máscara ("40050000000140"). O campo "Prazo (meses)" não explica de quê (validade? prazo de pagamento?).
10. **Rita (card da solicitação):** "Para avançar" e "Documentos exigidos" não se atualizam (C-03). A fase de análise traz o item "Parecer do agente" (é do analista). O resultado do motor mostra "Fotografado em 2026-11-19 10:00" em formato ISO.
11. **Rita (mover):** a mensagem técnica da automação aparece no card (C-04).
12. **Rita (fase 1):** "Para avançar" diz "Nada pendente" com os três itens do checklist sem resposta. Por regra, o checklist não trava, mas a frase confunde.
13. **Júlia (andamento):** "Registrar" fecha o diálogo sem confirmação visível. O campo "Data *" é marcado obrigatório e diz "Vazio: hoje".
14. **Júlia (acordo judicial):** o diálogo não mostra as parcelas antes de gravar (aparecem só depois). O prazo "Retorno da proposta de acordo" continua no card depois de o acordo ser fechado.
15. **Nara (parâmetros):** "Salvar grupo" não dá retorno visível; só o contador "fora do padrão" muda.
16. **Gustavo e Ana (painel):** números de variação sem rótulo ("R$ 1,48 mi" seguido de "1,5 mi"; "R$ 510,9 mil" com "500,9 mil"). Plural fixo: "1 pedidos retidos", "1 clientes em risco", "1 processos com prazo vencendo". "Acima de 180dias" sem espaço.
17. **Gustavo (histórico do cliente):** códigos internos na linha do tempo (C-04). No simulador, Modelos de mensagem abre no "TESTE_AVISO" do seed (só no simulador).

Nada disso impediu terminar os fluxos. Os itens 2, 5, 7 e 10 são os que mais custam no dia a dia.

---

## Pronto para subir?

| Item do checklist (`CLAUDE.md`, "Antes de dizer que terminou") | Situação |
|---|---|
| `npm test` verde em `backend/` (tests + check + smoke) e em `frontend/` | Sim: 94/94; 119 SQL e 0 falha; 405/0/0; frontend 76/76 |
| Todo cenário citado no título de um teste | Conferido pelas validações B1–B5 e reconfirmado pela contagem dos smokes; não refiz o cruzamento cenário a cenário |
| `npm run build` e `npm run lint` limpos em `frontend/` | Sim (com o aviso de tamanho, O-03) |
| `backend/migrations/` intocado | Sim (a pasta não existe) |
| `.env` fora do commit | Sim; `.gitignore` correto; nenhum `.env` presente |
| Divergência entre contrato e plano anotada | Sim: D-010..D-016 nos plans e `contrato/pedidos/02-pos-construcao-respostas.md` |
| Ordem de publicação do `CLAUDE.md` × `add-*.mjs` | Bate: `add-001`, `add-002`, `add-010`…`add-070` em duas passadas, `add-001` de novo, `add-090`, `sync-server-function-map`; igual ao `PUBLISH_ORDER` do simulador |
| Roteiro `sandbox/t002-confirmar.mjs` | Existe e está completo para S-01..S-16, mas **não aparece no roteiro de publicação** e o momento de rodar se contradiz (C-01) |
| README e CLAUDE.md descrevem o sistema de hoje | `CLAUDE.md` sim, menos o C-01; `README.md` incompleto (C-05) |
| Repositório | Sem nenhum commit ainda; o fluxo do `CLAUDE.md` (merge do `origin/main`, um commit, push) ainda não foi feito |

**Conclusão:** pode subir depois de corrigir o C-01 (pôr no `CLAUDE.md`, no `README.md` e no `.env.example` quando e como rodar o `t002-confirmar.mjs` e o que fazer se um S-nn falhar). C-02 a C-05 não impedem a publicação. Pendências do gestor que seguem com padrão adotado: P-01 (bloqueio total D+10), P-03/P-30 (Estética igual ao privado), P-24 (nenhum e-mail automático), P-32/P-33 (links, arte e arquivos do material), P-49 e P-50.
