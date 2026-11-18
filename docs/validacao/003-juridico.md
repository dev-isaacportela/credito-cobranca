# Validação: 003-juridico

Validador independente. Data: 2026-11-14. Só leitura: nada foi corrigido nas specs.

Lido por inteiro: `docs/specs/003-juridico/{spec,plan,tasks}.md`, as três peças da 001 e da 002 (para os contratos
entre specs), constitution, arquitetura, execucao, templates, relatórios 00, A, B, C e E do estudo e a skill
`mitra-escopo`. Do relatório D li a navegação (§1.7) e as dúvidas (§5); o D avisa que o formulário do processo não
está nos arquivos dele, e o relatório E cobre essa parte.

Resumo: 4 BLOQUEIA, 7 CORRIGIR, 8 OBSERVAÇÃO.

## 1. Checklist do Fluxo A e do template

| Item | Situação | Nota |
|---|---|---|
| Spec sem stack, tabela, SF ou componente | Passa | Limpa. |
| Todo RF com critério de aceite | Passa | 40 RF. |
| Cenário de erro | Passa | Recusas de etapa, de aprovação e de carga. |
| Fora de escopo | Passa | Histórico em PDF, termo de confissão, painel consolidado e sugestões do dossiê público. |
| Testes: linha por C-00N e RN-00N com números | Passa na forma, falha no conteúdo | 24 cenários e 32 regras, 57 linhas com números; cinco linhas trazem valor que o seed do plan não produz (B-1). |
| Plan: Constitution Check | Falha | Complexity Tracking vazio, embora o R-002 reconheça que a guarda é só de cargo (B-4). |
| Plan: contratos de SF | Passa | 62 SFs (17 SQL de leitura + 7 JS de leitura + 20 JS de escrita + 18 SQL de escrita), prefixo `cc`. |
| Plan: listagem com LIMIT/OFFSET e `…Total` | Passa | Listagens paginadas com `…Total`. |
| Plan: seção Simulador | Passa na forma | Seed detalhado, mas colide com o da 001 (B-2). |
| Plan: mapa de testes | Passa com ressalva | 57 linhas; a ordem em estado compartilhado se contradiz (C-3). |
| Tasks: uma task por teste | Passa | T-080 a T-136 = 57. |
| Tasks: rastreabilidade RF → task → teste | Passa com ressalva | RF-019 (exportar CSV) e RNF-006 só têm verificação manual (C-6). O pré-requisito "8 pendências respondidas" conflita com a regra 4 de `execucao.md` (O-6). |

### Contas refeitas

| Linha | Entrada | Esperado na spec | Refeito | Veredito |
|---|---|---|---|---|
| C-003, C-018, C-019, RN-026 (cliente 1006) | Títulos de 18.000 (vencimento 12/10/2026, 38 dias) e 12.000 (vencimento 20/10/2026, 30 dias), data-base 19/11/2026 | Juros 380,00; correção 152,08; total 31.132,08 | Só fecha aplicando 38 dias ao total de 30.000 (fórmula do artefato). Título a título (RN-015 da 002): juros 228 + 120 = 348,00; correção 91,25 + 48,00 = 139,25; total 30.000 + 600 + 348 + 139,25 = **31.087,25** | **Errado para o seed** (B-1) |
| C-018 documento (cliente 1010) | Títulos de 20.000 (vencimento 28/09/2026, 52 dias) e 13.000 (vencimento 10/10/2026, 40 dias) | Juros 572,00; correção 229,14; total 34.461,14; rótulo "Juros de mora (1% ao mês, 52 dias)" | Título a título: juros 346,67 + 173,33 = 520,00; correção 138,87 + 69,38 = 208,25; total 33.000 + 660 + 520 + 208,25 = **34.388,25**; o rótulo com um só número de dias não descreve dois títulos | **Errado para o seed** (B-1) |
| C-003 e RN-005 | Envio do dossiê em 19/11/2026 com prazo de 5 dias úteis; com 3; envio em 13/11 com 5 | 27/11; 25/11; 23/11 | 20/11 é feriado: 23, 24, 25, 26, 27; com 3 para em 25; de 13/11: 16, 17, 18, 19, 23 | Certo |
| C-010 | Carteira por etapa | 5 processos de 320.000; 4 de 175.000; 3 de 42.000; BNGO 3; público 1 | Somas conferem com o seed | Certo |
| C-012 | Processo da Alfa com custo de 1.500 e lançamento de mais 2.600 | Custo 4.100,00; razão 10,25%; antes 3,75% | 1.500 ÷ 40.000 = 3,75%; 4.100 ÷ 40.000 = 10,25% | Certo |
| C-013 | Acordo da Eta: entrada de 6.000 em 19/11/2026 e 5 parcelas | 6 parcelas (0 a 5); 5 × 4.800,00 de 19/12/2026 a 19/04/2027; honorários 3.000,00 | 6.000 + 5 × 4.800 = 30.000; 10% = 3.000; cinco meses de 19/12 a 19/04 | Certo |
| C-016 | Alertas de desvio | 13 alertas, 4 críticos | Contei 13 e 4 no seed | Certo |
| C-017 | Indicadores | Ticket 64.000; (6) 30.000 ÷ 525.000 = 5,71%; (10) 4.500 ÷ 495.000 = 0,91%; (11) 6,67; (12) 2.250; (17) (10+7+50+171+2) ÷ 5 = 48; (18) 2 ÷ 5 = 40%; (20) 3,7; (21) 2 ÷ 8 = 25%; (22) 2 ÷ 3; (23) 1 ÷ 5; três maiores = 290 ÷ 495 = 58,6% | Todos conferem | Certo |
| RN-017 | Acordo de 1.000,00 com entrada de 200,00 e 3 parcelas; entrada em 31/01/2027 | 266,66; 266,66; 266,68; parcelas em 28/02 e 31/03/2027 | 800 ÷ 3 com resto de 0,02 na última; fevereiro de 2027 tem 28 dias | Certo |
| RN-024 | Notificação emitida em 19/11/2026 com prazo de 15 dias; com 10 | 04/12/2026; 29/11/2026 | 19/11 + 15 dias corridos = 04/12; + 10 = 29/11 | Certo |
| RN-027 | Data de planilha 46350 | 24/11/2026 | 46350 − 25569 = 20.781 dias desde 01/01/1970 = 24/11/2026 | Certo |

## 2. Cobertura contra o artefato

Coberto com os mesmos números do artefato: 17 documentos do dossiê, 11 etapas, 12 tipos de custo, 13 desvios e 24
indicadores com os mesmos limiares.

Defeitos do artefato corrigidos: vínculo por nome virou vínculo por código; etapa lida da cor da célula virou coluna;
busca por texto livre virou busca por campo.

Defeitos conhecidos copiados sem virar pergunta:

- RN-016 (taxa de recuperação) mistura universos diferentes no numerador e no denominador (E §7.11) (C-7).
- Indicador 21 herda a mesma base ambígua.
- RN-010 da spec diz "andamento sem data conta a data da carga"; o plan infere a data de "dd/mm" com o ano corrente
  ou o anterior (E §7.4). Spec e plan divergem (C-5).

Não explícito na spec (o artefato tem): resposta extra da notificação, contatos e endereço no processo, anexo do
tipo "outro" (O-7).

Fora de escopo declarado e aceitável: histórico em PDF (007), termo de confissão, painel consolidado (006),
sugestões do dossiê público (005).

## 3. Conformidade

- **Constitution II e III (regra no servidor, segregação)**: D-006 só filtra cargo. Um membro Jurídico (nível 0)
  chamando direto `ccAcordoJudicialGravar` aprova o acordo que ele mesmo propôs, e `ccProcessoGravar` envia o
  dossiê sem o nível 3 exigido pela RN-004. O R-002 reconhece e o Complexity Tracking está vazio (B-4).
- **Constitution I (política como parâmetro)**: 37 chaves `JUR_*` contra o grupo 11 da 001, que já tem seis
  parâmetros do Jurídico com outros nomes (C-2). `JUR_CARGA_CONCLUIDA` é estado, não política (O-2).
- **execucao.md regra 2**: `add-003-tabelas/leitura/escrita/carga.mjs` e `seed.mjs`/`smoke.mjs` comuns, em vez de
  um `add-003-juridico.mjs`, `schema/003`, `simulator/seed/003` e `simulator/smoke/003` (C-4).
- **execucao.md regra 4**: as tasks pedem as 8 pendências respondidas antes de começar; a regra diz que pendência
  não bloqueia (O-6).
- **SQL que o SQLite não roda**: `JSON_TABLE` em 6 SFs depende de MySQL 8.0.4 ou superior (a conferir na T-002 da
  001) e de adaptação no simulador, prevista no R-003 mas ainda inexistente no kit (O-1).
- **Código de produção com gancho de teste**: `CC_HOJE` fixa a data em 19/11/2026 (O-3).
- **300 SF/min e 60 s**: a carga reenvia a planilha inteira a cada lote (O-5); D-003 processa em memória e o plan da
  001 cita teto de 2.000 linhas por leitura (O-4).
- **CRUD REST 403 e `{{param}}`**: sem violação.

## 4. Viabilidade do backend

- **Valores esperados que o seed não produz**: ver a tabela de contas. Ou o cálculo é por título (e os números da
  spec estão errados), ou é pelo total com o maior atraso (e a RN-015 da 002 está errada). Hoje as duas specs dizem
  coisas diferentes e o teste falha de um jeito ou de outro (B-1).
- **SFs que não existem**: `ccEncargosCalcular`, `ccCobrancaEnviarJuridico` e `ccCobrancaSituacao` são pedidas à 002
  (P-8 e P-9) e a 002 não as tem; o fluxo de encaminhamento da 002 (RN-030) é o inverso do desta spec (B-3).
- **Nomes pedidos à 001 que divergem do plan da 001**: `ccMembroAtual` (é `ccMembroEu`), `VIS` (é
  `CTE_VISIBILIDADE`), `ccParametroVigente` (é `ccParametroValores`), `ccDiaUtilSomar` (é `ccDiasUteisSomar`),
  `ccAuditoriaRegistrar` em lote (é `ccAuditoriaRegistrarGravar`), `ccModeloMensagemObter(codigo)` (é
  `ccModeloObter(id)`), `ccClienteTitulosVencidos` (é `ccClienteTitulos(codcli, 'ABERTOS', …)`), `ccClienteBuscar`
  (é `ccClienteListar`) e a coluna `CC_CLIENTE.ENDERECO`, que não existe (C-1).
- **Seed incompatível com o da 001**: reusa os códigos 1001 a 1014 com outros nomes; o CNPJ 12.345.678/0001-90 é
  do cliente 1001 na 001 e do 3002 aqui; a carteira da Ana é outra; a equipe é Gabriel, Juliana, Paulo e Alice
  contra Gustavo, Júlia e os demais; data fixa por `CC_HOJE` contra datas relativas na 001 (B-2).
- **Ordem dos testes**: com estado compartilhado na ordem dos cenários, o C-009 encerra o processo P01 antes do
  C-012 (que exige P01 ativo para o alerta de custo passar de 1 para 2) e do C-024 (total 13 vira 12) (C-3).
- **Notificação**: bloqueada até a validação do modelo (D-019), que depende da NC-9 da 001; sem a guarda
  provisória recomendada lá, RF de notificação não tem como ser exercitado fora do teste.
- **Carga da planilha**: colunas por posição (D-016) sem o arquivo real em mãos; T-040 já condiciona.

## 5. Achados

| Id | Severidade | Arquivo e seção | Achado | Correção |
|---|---|---|---|---|
| B-1 | BLOQUEIA | spec.md C-003, C-018, C-019, RN-026 e Testes; plan.md seed de títulos (1006 e 1010) | Encargos esperados (31.132,08 e 34.461,14) só fecham com o maior atraso sobre o total; com dois vencimentos, título a título dá 31.087,25 e 34.388,25. | Decidir a fórmula com a 002 e então igualar os vencimentos no seed ou refazer números e rótulo. |
| B-2 | BLOQUEIA | plan.md seção Simulador | Seed reusa códigos, CNPJ, carteira e equipe da 001 com outros dados e fixa a data. | Faixa de códigos própria (3000 em diante), equipe da 001 e a mesma convenção de data. |
| B-3 | BLOQUEIA | plan.md P-8, P-9 e contratos consumidos da 002; spec.md RN-004 | Três SFs da 002 não existem e o fluxo de encaminhamento é o inverso do da 002. | Fechar o contrato com a 002 (ordem do artefato) antes das tasks de envio do dossiê. |
| B-4 | BLOQUEIA | plan.md D-006, R-002, Complexity Tracking | SQL de aprovação e de envio só confere cargo: Jurídico aprova o próprio acordo e envia dossiê sem nível 3. | Guarda de nível e de segregação com `:VAR_USER` na própria SQL e registro no Complexity Tracking. |
| C-1 | CORRIGIR | plan.md "Depende da 001" | Oito nomes de SF e uma coluna divergem do plan da 001. | Usar os nomes da 001 e pedir `ENDERECO` formalmente (001 C-8). |
| C-2 | CORRIGIR | plan.md parâmetros `JUR_*` | 37 chaves contra seis já existentes no grupo 11 da 001. | Uma fonte só: reusar as seis e registrar as demais no catálogo. |
| C-3 | CORRIGIR | plan.md mapa de testes; tasks.md T-080 a T-136 | Ordem em estado compartilhado contradiz C-009, C-012 e C-024. | Banco novo por teste, menos nas dependências declaradas (C-008 após C-002, C-015 após C-013, RN-008 após C-009). |
| C-4 | CORRIGIR | plan.md estrutura de arquivos | Quatro `add-003-*` e seed e smoke comuns contrariam a regra 2. | Um `add-003-juridico.mjs` e arquivos por módulo em `schema/`, `seed/` e `smoke/`. |
| C-5 | CORRIGIR | spec.md RN-010; plan.md carga | Spec usa a data da carga; plan infere a data de "dd/mm". | Escolher uma regra e escrever a mesma nos dois. |
| C-6 | CORRIGIR | plan.md mapa de testes, RF-019 | Exportação em CSV é regra de tela e só tem verificação manual. | Teste em `frontend/tests/` para a montagem do CSV. |
| C-7 | CORRIGIR | spec.md RN-016 e indicador 21 | Taxa de recuperação copiada com o defeito conhecido (E §7.11). | Definir numerador e denominador no mesmo universo ou levar ao gestor como pergunta. |
| O-1 | OBSERVAÇÃO | plan.md R-003 | `JSON_TABLE` depende da versão do MySQL e de adaptação no simulador. | Conferir a versão na T-002 da 001; alternativa: uma SF por linha em lote pequeno. |
| O-2 | OBSERVAÇÃO | plan.md `JUR_CARGA_CONCLUIDA` | Estado guardado como parâmetro de política. | Guardar em tabela da carga. |
| O-3 | OBSERVAÇÃO | plan.md `CC_HOJE` | Gancho de teste em código de produção. | Aceitar só no simulador. |
| O-4 | OBSERVAÇÃO | plan.md D-003 | Processamento em memória contra o teto de 2.000 linhas por leitura. | Declarar o volume máximo esperado. |
| O-5 | OBSERVAÇÃO | plan.md carga em lotes | Planilha inteira reenviada a cada lote. | Enviar só o lote. |
| O-6 | OBSERVAÇÃO | tasks.md pré-requisitos | Exige as 8 pendências respondidas, contra a regra 4. | Trocar por "padrões provisórios do plan aceitos". |
| O-7 | OBSERVAÇÃO | spec.md RFs do processo | Resposta extra, contatos, endereço e anexo "outro" não explícitos. | Incluir ou declarar fora. |
| O-8 | OBSERVAÇÃO | plan.md D-021 | Encerrar como baixa sem baixa aprovada na 002. | Ao menos alerta e registro na auditoria. |

## 6. Perguntas ao gestor

| Pergunta | Padrão provisório do plan | Seguro para construir agora? | Recomendação |
|---|---|---|---|
| Quem é o responsável do processo | Membro com cargo JURIDICO (D-014) | Sim | Manter. |
| Fonte dos processos | Só a planilha do Jurídico (D-015) | Sim | Manter. |
| Layout da planilha | Colunas por posição (D-016) | Só com o arquivo real | Construir a carga por último (T-040 já condiciona). |
| Campo Linha | Independente da BU (D-017) | Sim | Manter. |
| Filial do processo | Escolhida no dossiê (D-018) | Sim | Manter. |
| Notificação formal | Bloqueada até validar o modelo (D-019) | Sim, mas depende da NC-9 da 001 | Liberar a validação provisória na 001 (001 B-1). |
| Acordo fora da política | Exige aprovação (D-020) | Sim, conservador | Manter, com a guarda na SQL (B-4). |
| Encerrar como baixa | Sem exigir baixa aprovada (D-021) | Aceitável como provisório | Gerar alerta e registro de auditoria (O-8). |
