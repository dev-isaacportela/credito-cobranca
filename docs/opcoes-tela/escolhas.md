# Opções de tela escolhidas

Lidas dos artefatos em 14/11/2026 (coleção `escolhas`). O mockup de cada opção está em
`docs/opcoes-tela/<módulo>/telas*.html`, no `<template data-opcao>` da tela. Gerado por `_casca/escolhas.mjs`.

Pela decisão D-05, o que foi escolhido em 002 e 004 vale para as carteiras privada, Estética e pública.

## 001-base

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Login | `login` | **A** | Manchete e contexto |  | `telas-01-acesso.html` |
| Navegação e carteiras | `casca` | **C** | Menu por função |  | `telas-02-casca.html` |
| Busca de clientes | `clientes-busca` | **C** | Filas prontas |  | `telas-03-clientes.html` |
| Ficha do cliente | `cliente-ficha` | **B** | Cabeçalho fixo e abas |  | `telas-03-clientes.html` |
| Fichas de contato | `contatos` | **C** | Agenda de contatos |  | `telas-04-contatos.html` |
| Equipe · Organograma | `equipe-organograma` | **C** | Equipes lado a lado | sem organogranama | `telas-05-equipe.html` |
| Equipe · Cadastro da equipe | `equipe-cadastro` | **A** | Tabela e diálogo |  | `telas-05-equipe.html` |
| Redistribuição de clientes | `equipe-redistribuicao` | **A** | Selecionar e mover |  | `telas-05-equipe.html` |
| Parâmetros da política | `adm-parametros` | **A** | Grupo em grade |  | `telas-06-adm-politica.html` |
| BUs e segmentos | `adm-bus` | **A** | BUs em tabela |  | `telas-06-adm-politica.html` |
| Feriados | `adm-feriados` | **C** | Por abrangência |  | `telas-06-adm-politica.html` |
| Modelos de mensagem | `adm-modelos` | **B** | Editor com prévia |  | `telas-07-adm-operacao.html` |
| Sincronização com o Winthor | `adm-sincronizacao` | **B** | Linha do tempo | a+b | `telas-07-adm-operacao.html` |
| Trilha de auditoria | `adm-auditoria` | **B** | Linha do tempo | b+c | `telas-07-adm-operacao.html` |

## 002-cobranca-privada

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Cobrança · Quadro de cobrança | `cobranca-quadro` | **B** | Capa com a situação |  | `telas-01-cobranca.html` |
| Cobrança · Card do cliente em cobrança | `cobranca-card` | **A** | Tudo em Nesta fase |  | `telas-01-cobranca.html` |
| Cobrança · E-mails da régua | `cobranca-emails` | **C** | Abas por situação |  | `telas-02-cobranca-abas.html` |
| Cobrança · Histórico de contatos | `cobranca-historico` | **B** | Linha do tempo por dia |  | `telas-02-cobranca-abas.html` |
| Registrar contato | `registrar-contato` | **B** | Formulário com contexto |  | `telas-03-cliente.html` |
| Acordo de pagamento | `acordo-pagamento` | **C** | Cenários lado a lado |  | `telas-03-cliente.html` |
| Baixa como perda | `baixa-perda` | **B** | Trilha e decisão |  | `telas-03-cliente.html` |
| Lista de bloqueio para o Winthor | `lista-bloqueio` | **A** | Abas por situação |  | `telas-04-listas.html` |
| Projeção de possível inadimplência | `projecao-inadimplencia` | **A** | Ranking por valor |  | `telas-04-listas.html` |
| Minha agenda | `minha-agenda` | **B** | Semana em colunas | b + c | `telas-05-geral.html` |
| Regras de cobrança | `regras-cobranca` | **B** | Abas por assunto |  | `telas-05-geral.html` |
| Cobrança · Visão gerencial (novas opções) | `cobranca-visao-gerencial-2` | **C** | Um bloco por agente |  | `telas-06-visao-gerencial-novas.html` |

## 003-juridico

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Jurídico · Visão gerencial | `juridico-visao-gerencial` | **C** | Abas por pergunta |  | `telas-01-visao-gerencial.html` |
| Jurídico · Processos | `juridico-processos` | **B** | Capa completa por fase |  | `telas-02-processos.html` |
| Jurídico · Card do processo | `juridico-card-processo` | **B** | Tudo em Nesta fase |  | `telas-03-card-processo.html` |
| Jurídico · Acordos judiciais | `juridico-acordos` | **A** | Tabela de acordos |  | `telas-04-acordos.html` |
| Jurídico · Custos dos processos | `juridico-custos` | **A** | Painel de números |  | `telas-05-custos.html` |
| Jurídico · Alertas de desvios | `juridico-alertas` | **A** | Lista por severidade |  | `telas-06-alertas.html` |
| Dossiê para envio ao Jurídico | `juridico-dossie` | **B** | Pendências primeiro |  | `telas-07-dossie.html` |
| Prévia da notificação e do demonstrativo | `juridico-previa-documentos` | **C** | Conferência em passos |  | `telas-08-documentos.html` |
| Carga inicial da planilha do escritório | `juridico-carga-inicial` | **C** | Passo a passo |  | `telas-09-carga-inicial.html` |

## 004-concessao-credito

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Crédito · Visão gerencial | `credito-visao-gerencial` | **A** | Abas por pergunta |  | `telas-01-credito-visao-esteira.html` |
| Crédito · Esteira de concessão | `credito-esteira` | **B** | Só em andamento, capa completa |  | `telas-01-credito-visao-esteira.html` |
| Crédito · Gestão de crédito | `credito-gestao` | **B** | Fila do que vence |  | `telas-02-credito-gestao-pedidos.html` |
| Crédito · Pedidos acima do limite | `pedidos-limite` | **A** | Medidor na capa |  | `telas-02-credito-gestao-pedidos.html` |
| Crédito · Saúde das análises | `credito-saude` | **A** | Painel em três alturas |  | `telas-03-credito-saude-desempenho.html` |
| Crédito · Desempenho | `credito-desempenho` | **A** | Painel em três alturas |  | `telas-03-credito-saude-desempenho.html` |
| Crédito · Clientes sinalizados | `credito-sinalizados` | **C** | Matriz cliente × sinal |  | `telas-03-credito-saude-desempenho.html` |
| Nova solicitação | `nova-solicitacao` | **B** | Assistente em três passos |  | `telas-04-solicitacao.html` |
| Card da solicitação de crédito | `card-solicitacao` | **B** | Tudo dentro de Nesta fase |  | `telas-04-solicitacao.html` |
| Motor de crédito e rating | `card-motor` | **C** | Dados e resultado lado a lado |  | `telas-04-solicitacao.html` |
| Decisão do comitê / alçada | `card-decisao` | **C** | Conferir, decidir, aplicar |  | `telas-04-solicitacao.html` |
| Semáforo de crédito | `semaforo` | **A** | Cinco abas |  | `telas-05-semaforo.html` |

## 005-setor-publico

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Motor do órgão | `concessao-motor` | **B** | Resultado primeiro |  | `telas-01-concessao.html` |
| Fluxo da NF pública · Etapas e prazos | `nf-etapas-prazos` | **A** | Trilho horizontal |  | `telas-02-nf.html` |
| Fluxo da NF pública · Notas fiscais em tramitação | `nf-tramitacao` | **C** | Trilho por nota |  | `telas-02-nf.html` |
| Lançamento das datas de uma NF | `nf-datas` | **B** | Trilho editável |  | `telas-02-nf.html` |
| Regras de pagamento por ente | `regras-ente` | **B** | Cartões por ente |  | `telas-04-apoio.html` |
| Comunicação com o órgão | `comunicacao-orgao` | **C** | Editor com campos |  | `telas-04-apoio.html` |
| Certidões da empresa | `certidoes` | **B** | Cartões de prazo |  | `telas-04-apoio.html` |

## 006-painel-consolidado

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Painel · Organização geral | `painel-organizacao` | **B** | Abas por assunto |  | `telas-01-organizacao.html` |
| Painel · Visão geral e saúde | `painel-visao-saude` | **C** | Saúde em três colunas |  | `telas-02-resumo.html` |
| Painel · Indicadores executivos | `painel-indicadores` | **B** | Três grupos lado a lado |  | `telas-02-resumo.html` |
| Painel · Evolução no ano e fechamento manual | `painel-evolucao` | **A** | Dois gráficos com seletor |  | `telas-02-resumo.html` |
| Painel · Aging e PDD | `painel-aging-pdd` | **B** | Mapa de calor |  | `telas-03-carteira-risco.html` |
| Painel · Roll rate | `painel-roll-rate` | **B** | Barras de destino |  | `telas-03-carteira-risco.html` |
| Painel · Movimento da inadimplência | `painel-movimento` | **B** | Seis meses lado a lado |  | `telas-03-carteira-risco.html` |
| Painel · Concentração | `painel-concentracao` | **A** | Quatro recortes e top 10 |  | `telas-03-carteira-risco.html` |
| Painel · Agentes, BU, conversão e agenda | `painel-agentes` | **B** | Uma aba por pergunta |  | `telas-04-cobranca-credito.html` |
| Painel · Planos de pagamento | `painel-planos` | **C** | Um cartão por plano |  | `telas-04-cobranca-credito.html` |
| Painel · Crédito | `painel-credito` | **A** | Gráficos e quadros |  | `telas-04-cobranca-credito.html` |
| Painel · Jurídico e setor público | `painel-juridico-publico` | **B** | Funil de cada carteira |  | `telas-05-outras-equipe.html` |
| Painel · Indicadores por nível da equipe | `painel-equipe` | **A** | Tabela em árvore |  | `telas-05-outras-equipe.html` |

## 007-historico-apoio

| Tela | Id | Opção | Nome da opção | Observação do usuário | Arquivo |
|---|---|---|---|---|---|
| Histórico do cliente | `historico-cliente` | **C** | Por assunto, em abas |  | `telas-01-historico.html` |
| Histórico · Prévia do PDF | `historico-pdf` | **A** | Relato corrido |  | `telas-01-historico.html` |
| Fontes e links | `fontes-links` | **A** | Lista agrupada |  | `telas-02-fontes.html` |
| Material de apoio | `material-apoio` | **A** | Lista por grupo |  | `telas-03-material.html` |
| Regras de negócio em vigor | `regras-vigor` | **B** | Comparar segmentos |  | `telas-04-regras.html` |
