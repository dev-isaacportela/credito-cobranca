# Spec: Histórico do cliente e apoio (fontes, material, regras em vigor)

**ID:** 007-historico-apoio · **Status:** em revisão (corrigida contra o contrato técnico, fase 0c) · **Data:** 2026-11-14

> Escrito para quem usa e para quem paga. Sem stack, tabela, endpoint ou
> componente: isso é assunto do `plan.md`.

## Problema

Hoje, para saber "o que aconteceu com este cliente" a equipe abre solicitação,
cobrança, contatos, acordos, e-mails e processo, um a um, e monta a história de
cabeça. Quando o Jurídico, a gerência ou um comitê pedem um relato (ou quando o
caso vai para a Justiça), não existe um documento único, datado e com a cara da
Benenutri. Além disso, onde consultar cada informação da análise e da cobrança
(bureaus, certidões, legislação), os documentos padronizados da política e as
regras em vigor estão espalhados ou só na cabeça de quem os conhece, e uma regra
alterada na base não aparece em lugar nenhum para consulta.

## Resultado esperado

A pessoa busca o cliente e vê, numa única linha do tempo, tudo o que foi
registrado sobre ele, da solicitação de crédito à cobrança e ao processo;
filtra por assunto, imprime ou salva em PDF um documento com a identidade
Benenutri; e tem à mão as fontes de consulta, os documentos de apoio e as regras
de negócio vigentes, sempre atualizados e só para leitura.

## Usuários

| Perfil | O que precisa fazer | Frequência |
|---|---|---|
| Agente de cobrança | Ver o que já foi falado e combinado com o cliente antes de ligar; gerar o relato para um colega ou para o Jurídico | diária |
| Analista de crédito | Ver a história de compras, pedidos e cobrança antes de decidir limite | diária |
| Supervisor | Ver o histórico dos clientes da sua equipe para orientar e cobrar resultado | semanal |
| Gerente financeiro / Diretoria | Ver qualquer cliente; imprimir histórico para comitê ou reunião; manter fontes e links e os documentos de apoio | semanal |
| Jurídico | Consultar a história do cliente que tem processo e conferir o que o dossiê afirma; confirmar a revisão das fontes de legislação | por processo |
| Administrador | Manter fontes e links e os documentos de apoio | mensal |
| Todos | Consultar fontes, material de apoio e regras em vigor | ocasional |

## Cenários

Pessoas e clientes dos cenários são os do elenco único de testes do sistema:
Ana (agente, equipe do supervisor Sérgio), Carlos (agente, equipe da supervisora
Silvia), Gustavo (gerente), Diana (diretoria), Júlia (Jurídico), Rita (analista),
Nara (administradora). Clientes: Alfa Distribuidora (código 7001, da Ana), Beta
Sem Histórico (7002, da Ana), Gama em Juízo (7003, da Ana, com processo),
Drogaria Popular (1006, do Carlos), Home Care Alfa (1008, do Sérgio). "Hoje" dos
cenários é 19/11/2026.

**C-001 — Ver o histórico completo do cliente**
- **Dado que** a história do cliente Alfa tem 3 contatos de cobrança, 1 promessa de pagamento, 1 acordo proposto e aprovado com a entrada paga e 2 parcelas a vencer, 1 próxima ação agendada, 2 pagamentos recebidos, 1 e-mail enviado, 1 solicitação de crédito e 1 pedido acima do limite, além das mudanças de etapa e das notas dos cards
- **Quando** a agente Ana abre o histórico do cliente Alfa
- **Então** a linha do tempo mostra no topo os 3 registros futuros (a próxima ação e as 2 parcelas) marcados como "agendado", do mais próximo ao mais distante, e abaixo os passados do mais recente para o mais antigo, cada um com data e hora, categoria, título, texto e quem registrou; o total é a soma das contagens por categoria

**C-002 — Filtrar por categoria**
- **Dado que** o histórico do cliente Alfa está aberto e 5 registros são da categoria "Acordos e baixas" (proposta, aprovação, entrada paga e 2 parcelas a vencer)
- **Quando** a pessoa escolhe a categoria "Acordos e baixas"
- **Então** aparecem só os 5 registros, o total mostra 5, as demais categorias continuam mostrando as suas contagens (Recebimentos: 2), e o resumo do cliente não muda

**C-003 — Buscar o cliente por nome ou CNPJ**
- **Dado que** o supervisor Sérgio enxerga os clientes "Alfa Distribuidora" e "Home Care Alfa", e o CNPJ 70.010.000/0001-70 pertence só à Alfa Distribuidora
- **Quando** ele digita "alfa" e depois "70010000000170"
- **Então** "alfa" lista os 2 clientes para escolher; o CNPJ (com ou sem pontuação) resulta em 1 cliente, que é aberto automaticamente

**C-004 — Visibilidade pela hierarquia**
- **Dado que** Alfa é cliente da Ana (equipe do Sérgio) e Drogaria Popular é cliente do Carlos (equipe da Silvia), e Gustavo é gerente dos dois supervisores
- **Quando** Ana, Carlos, Sérgio, Silvia e Gustavo buscam e tentam abrir cada cliente
- **Então** Ana e Sérgio veem Alfa e não encontram Drogaria Popular; Carlos e Silvia veem Drogaria Popular e não encontram Alfa; Gustavo vê os dois; abrir um cliente fora da própria visão (mesmo por link direto) é recusado como "Cliente não encontrado", sem revelar que ele existe, e nunca aparece uma linha do tempo vazia no lugar da recusa

**C-005 — Cliente sem nenhum registro**
- **Dado que** o cliente Beta só tem um título a vencer daqui a 60 dias: sem solicitação, cobrança, contato nem pagamento
- **Quando** a agente Ana abre o histórico de Beta
- **Então** a tela mostra "Nenhum registro ainda" com total 0, e o resumo aparece com os campos sem dado como "—"

**C-006 — Resumo do cliente com 12 campos**
- **Dado que** o cliente Alfa tem solicitação de crédito na etapa "1 · Solicitação recebida", cobrança na etapa "Acordo em andamento", agente Ana com supervisor Sérgio, limite de R$ 80.000,00, R$ 12.500,00 vencidos há 37 dias, R$ 20.000,00 a vencer, R$ 3.000,00 pagos com atraso, 3 contatos e 1 promessa em aberto
- **Quando** o histórico de Alfa é aberto
- **Então** o resumo mostra os 12 campos (etapa de crédito; etapa de cobrança; agente e supervisor; criticidade, rating e score; limite; utilizado R$ 32.500,00; vencido e dias de atraso; a vencer; fonte pagadora; recuperado R$ 3.000,00; contatos e promessas; documentos) e o que o cliente não tem (por exemplo etapa de crédito, etapa de cobrança e recuperado do cliente Beta) aparece como "—"

**C-007 — Gerar o documento do histórico (PDF)**
- **Dado que** o histórico do cliente Alfa está aberto com o filtro "Acordos e baixas" (5 registros)
- **Quando** a pessoa clica em Gerar PDF, confere a prévia e manda salvar em PDF
- **Então** o navegador gera, em A4, o documento "Histórico - ALFA DISTRIBUIDORA LTDA" com a identidade Benenutri (logo e cabeçalho), título, nome do sistema, data e hora de emissão e quem emitiu, os 12 campos do resumo, a ficha de contatos com a observação de cada contato e **só os 5 registros** do filtro (os futuros marcados "agendado"), e rodapé com cliente, documento e "Página i de n"

**C-008 — removido** (o documento passa a ser gerado pela impressão do navegador, que usa as fontes do próprio computador; não há mais troca de caracteres especiais. Acentos, aspas curvas, travessão e símbolos saem como foram digitados.)

**C-009 — Imprimir o histórico**
- **Dado que** o histórico de Alfa está aberto com o filtro "Cobrança", com mais registros do que cabem numa página da tela
- **Quando** a pessoa clica em Imprimir
- **Então** a impressão traz o mesmo documento do C-007 (resumo, contatos e **todos** os registros do filtro, não só a página visível), sem menus e botões

**C-010 — Consultar fontes e links**
- **Dado que** a lista inicial de fontes foi carregada
- **Quando** qualquer perfil abre "Fontes e links"
- **Então** vê 41 fontes agrupadas (consultas cadastrais e de crédito; certidões da empresa; fluxo da NF e pagamento no setor público; setor público; legislação; fontes de dados do sistema), com título, responsável e uso; links abrem em nova aba; 21 fontes (as de legislação e de normas do fluxo da NF) trazem o selo "A revisar pelo Jurídico"

**C-011 — Gerente cadastra e altera fonte**
- **Dado que** a pessoa é Gerente, Diretoria ou Administrador
- **Quando** inclui "Receita Federal — Consulta de regularidade" com link https://exemplo.gov.br, edita o uso, muda a ordem dentro do grupo e depois a inativa
- **Então** a fonte aparece na lista na posição pedida, cada alteração é gravada com quem e quando, a inativação a retira da consulta dos demais perfis e quem pode cadastrar ainda a vê como inativa; um link sem http:// ou https:// é recusado

**C-012 — Quem não é Gerente, Diretoria ou Administrador não altera fontes nem material**
- **Dado que** a pessoa é Agente, Analista, Supervisor ou Jurídico
- **Quando** tenta incluir, editar ou inativar uma fonte ou um material
- **Então** o sistema recusa com mensagem de falta de permissão e nada é gravado

**C-013 — Jurídico confirma a revisão de uma fonte**
- **Dado que** a fonte "Lei 14.133/2021" tem o selo "A revisar pelo Jurídico"
- **Quando** a Júlia (Jurídico), ou um Gerente, Diretoria ou Administrador, marca como revisada
- **Então** o selo sai e passam a aparecer "Revisado por [pessoa] em [data]"; ao editar depois o título ou o link dessa fonte, o selo volta

**C-014 — Buscar e baixar material de apoio**
- **Dado que** existem materiais cadastrados, entre eles "Política de Crédito e Cobrança v5.2" com PDF anexado
- **Quando** a pessoa busca "politica" (sem acento e em minúscula) e clica no documento
- **Então** a lista mostra o material, o arquivo abre ou baixa, e uma busca sem correspondência mostra "Nenhum documento encontrado"

**C-015 — Anexar documento ao material**
- **Dado que** o material "Fluxo — cobrança privada" está sem arquivo
- **Quando** o Gerente anexa um PNG de 2 MB, e depois tenta anexar um arquivo EXE e um PDF de 25 MB
- **Então** o PNG é aceito e o item passa a baixável; o EXE e o PDF de 25 MB são recusados com a razão (tipo não aceito; acima de 20 MB) e o arquivo anterior permanece

**C-016 — Material sem arquivo**
- **Dado que** o material foi cadastrado e ainda não recebeu arquivo
- **Quando** qualquer perfil vê a lista
- **Então** o item aparece com "Arquivo pendente", sem ação de baixar

**C-017 — Consultar as regras em vigor por carteira**
- **Dado que** a correção monetária tem valor padrão de 0,4% ao mês e valor de 0,3% para a carteira Estética a partir de hoje, mais um valor de 0,9% para a Estética com vigência em 01/01/2099; e a multa tem valor padrão de 2% e valor próprio de 0% na carteira Pública
- **Quando** a pessoa abre as regras em vigor e compara as carteiras
- **Então** a correção mostra 0,4% na Privada, 0,3% em destaque na Estética ("próprio da carteira", com a data de início) e 0,4% esmaecido na Pública (segue o padrão); a multa mostra 2% na Privada e na Estética e 0% em destaque na Pública; o valor de 0,9% (vigência futura) não aparece; regra que a carteira não usa (os dias da régua na Pública) aparece como "—"

**C-018 — Regras são somente leitura**
- **Dado que** a pessoa abre a consulta de regras
- **Quando** procura editar um valor
- **Então** não há campo editável; a tela avisa que a edição é feita na área de parâmetros, e cada valor próprio de carteira indica a partir de quando vale

**C-019 — Histórico longo é paginado**
- **Dado que** o cliente Alfa tem 7 registros de "Acordos e baixas" e "Recebimentos" somados e a página tem 3
- **Quando** a pessoa navega pelas páginas
- **Então** as páginas trazem 3, 3 e 1 registros, sem repetir nem pular nenhum, e o total é 7

**C-020 — Etapas e prazos vêm dos quadros**
- **Dado que** o quadro de cobrança da carteira Privada tem a etapa "Em negociação" com prazo de 240 horas e o quadro de concessão da Privada tem a etapa "1 · Solicitação recebida" com prazo de 24 horas
- **Quando** a pessoa abre "Etapas e prazos" nas regras em vigor
- **Então** vê as etapas de cada quadro, na ordem do quadro, com o nome e o prazo que estão valendo (10 dias e 1 dia); se o gestor mudar o nome ou o prazo de uma etapa no quadro, a consulta mostra o valor novo sem nenhum outro cadastro

**C-021 — Jurídico só vê cliente com processo**
- **Dado que** o cliente Gama tem processo ativo com 2 andamentos e o cliente Alfa não tem processo
- **Quando** a Júlia (Jurídico) busca e abre os dois
- **Então** ela encontra e abre Gama, com o processo e os 2 andamentos na categoria "Jurídico", e não encontra Alfa; em Gama ela não vê a categoria "Alteração auditada"

**C-022 — Alteração auditada só para Supervisor ou acima**
- **Dado que** a ficha de contatos do cliente Alfa foi alterada (a alteração ficou na trilha de auditoria)
- **Quando** a agente Ana e o supervisor Sérgio abrem o histórico de Alfa
- **Então** Sérgio vê a categoria "Alteração auditada" com a alteração (campo, valor antes e depois, quem e quando); Ana não vê a categoria nem a sua contagem, e o total dela é o do Sérgio menos os registros dessa categoria

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | O sistema DEVE permitir buscar cliente por nome, código ou CPF/CNPJ (com ou sem pontuação) entre os clientes que a pessoa pode ver, abrindo direto quando houver um só resultado | C-003 | must |
| RF-002 | O sistema DEVE mostrar a linha do tempo única do cliente reunindo as 8 categorias de RN-004, com data/hora, categoria, título, texto (com o feedback, quando houver) e quem registrou | C-001 | must |
| RF-003 | O sistema DEVE ordenar registros futuros no topo, marcados "agendado", seguidos dos passados do mais recente ao mais antigo | C-001 | must |
| RF-004 | O sistema DEVE filtrar a linha do tempo por categoria e mostrar a contagem de cada uma | C-002 | must |
| RF-005 | O sistema DEVE paginar a linha do tempo e informar o total | C-019: 3/3/1 de 7 | must |
| RF-006 | O sistema DEVE mostrar o resumo de 12 campos do cliente, com "—" no que não existe | C-006, C-005 | must |
| RF-007 | O sistema DEVE restringir o histórico aos clientes que a pessoa pode ver pela hierarquia e recusar acesso aos demais | C-004, C-021 | must |
| RF-008 | O sistema DEVE gerar documento A4 com a identidade Benenutri, com cabeçalho, resumo, ficha de contatos, registros do filtro ativo e rodapé com paginação, que a pessoa salva em PDF ou imprime | C-007 | must |
| RF-009 | removido (ver C-008: sem troca de caracteres no documento) | — | — |
| RF-010 | O sistema DEVE imprimir o histórico completo do filtro ativo, sem menus | C-009 | must |
| RF-011 | O sistema DEVE registrar na auditoria cada emissão do documento (quem, quando, cliente, filtro) | C-007, C-009: 1 registro por emissão | should |
| RF-012 | O sistema DEVE permitir abrir o histórico de um cliente a partir de outras telas por link direto | C-004 (link) | should |
| RF-013 | O sistema DEVE listar fontes e links agrupados, com título, link, responsável e uso, para todos os perfis | C-010 | must |
| RF-014 | O sistema DEVE permitir a Gerente, Diretoria e Administrador incluir, editar, ordenar e inativar fontes, validando o link | C-011 | must |
| RF-015 | O sistema DEVE carregar a lista inicial de fontes do estudo e marcar como "A revisar pelo Jurídico" as de legislação e as normas do fluxo da NF | C-010: 41 e 21 | must |
| RF-016 | O sistema DEVE permitir ao Jurídico (e a quem cadastra fontes) registrar a revisão de uma fonte, e reabrir o selo quando título ou link mudarem | C-013 | must |
| RF-017 | O sistema DEVE listar material de apoio por grupo, com busca por título, descrição e marcadores | C-014 | must |
| RF-018 | O sistema DEVE permitir a Gerente, Diretoria e Administrador cadastrar, editar, inativar material e anexar o arquivo, validando tipo e tamanho | C-015 | must |
| RF-019 | O sistema DEVE sinalizar material sem arquivo como "Arquivo pendente" | C-016 | must |
| RF-020 | O sistema DEVE mostrar as regras de negócio vigentes comparando as carteiras (Privada, Estética, Pública), agrupadas por assunto, a partir dos parâmetros em vigor, e as etapas e prazos a partir dos quadros | C-017, C-020 | must |
| RF-021 | O sistema DEVE indicar, em cada regra, se o valor é próprio da carteira (com a data de início) ou se segue o padrão, e quando a regra não se aplica à carteira | C-017, C-018 | must |
| RF-022 | O sistema DEVE manter a consulta de regras estritamente de leitura | C-018 | must |
| RF-023 | O sistema DEVE auditar toda inclusão, edição e inativação de fonte e de material | C-011: 4 registros (inclusão, uso, ordem, inativação) | must |
| RF-024 | O sistema DEVE restringir escrita em fontes e material a Gerente, Diretoria e Administrador (revisão de fonte também ao Jurídico) | C-012 | must |
| RF-025 | O sistema DEVE mostrar a categoria "Alteração auditada" só a Supervisor, Gerente, Diretoria e Administrador | C-022, C-021 | must |

> `must` = sem isso a feature não entrega valor. `should` = entra se couber.

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | Abrir o histórico de um cliente com 500 registros responde em até 3 s | cronômetro no simulador com 500 registros |
| RNF-002 | O documento de um histórico com 500 registros abre na prévia em até 15 s e não trava a tela | cronômetro no navegador |
| RNF-003 | O histórico e o documento contêm dado pessoal de contato do cliente: só quem vê o cliente os acessa, e cada emissão deixa rastro | C-004, RF-011 |
| RNF-004 | Todas as telas funcionam em tema claro e escuro, sem cor literal | verificação manual |

## Entidades do domínio

- **Registro do histórico** — fato datado sobre um cliente (passado ou agendado), com categoria, título, texto, quem registrou e a origem. Não é criado nem editado aqui: nasce no módulo que o produz, e este módulo não guarda cópia. Pertence a um só cliente.
- **Categoria do histórico** — as 8 famílias de registro (RN-004), cada uma com nome e cor fixos.
- **Resumo do cliente** — 12 campos de situação atual, compostos de dados de outros módulos.
- **Fonte / link** — referência de consulta (bureau, certidão, norma, sistema interno), com grupo, link, responsável, uso e situação de revisão jurídica.
- **Material de apoio** — documento padronizado (política, fluxo, treinamento) com descrição, marcadores e um arquivo anexado.
- **Regra em vigor** — valor de um parâmetro que vale hoje para uma carteira, ou etapa e prazo de um quadro; nasce na área de parâmetros e na administração do quadro e aqui só é exibida.

## Regras de negócio

- **RN-001** — A linha do tempo mostra primeiro os registros futuros (do mais próximo ao mais distante), depois os passados do mais recente ao mais antigo; em empate de data e hora a ordem é sempre a mesma: por tipo de registro e, no mesmo tipo, o lançado por último primeiro.
- **RN-002** — A pessoa só abre o histórico de cliente que pode ver: agente e analista, os seus; supervisor, os seus e os de seus subordinados diretos e indiretos; gerente, diretoria e administrador, todos. Fora disso o acesso é recusado como cliente não encontrado.
- **RN-003** — O histórico é somente leitura. O que aparece é o que os outros módulos registraram; nada se edita ou apaga aqui, e um fato corrigido na origem aparece corrigido.
- **RN-004** — Categorias fixas (8): Cobrança (ações da régua, contatos, promessas, mudanças de etapa e próxima ação agendada); Acordos e baixas (acordos, parcelas e baixa como perda); Crédito (solicitações, decisões, crédito liberado, pedidos acima do limite e mudanças de etapa); Jurídico (dossiê, processo, andamentos, acordo judicial e notificação extrajudicial); Setor público (marcos e passos da nota fiscal de órgão); Comunicação (e-mails enviados e notas dos cards); Recebimentos (pagamentos vindos do Winthor); Alteração auditada (o que mudou em cadastros e decisões, com valor antes e depois).
- **RN-005** — O resumo tem 12 campos fixos: etapa de crédito; etapa de cobrança; agente e supervisor; criticidade, rating e score (rating de AA a E no privado; de P1 a P4 no órgão público); limite; utilizado; vencido e dias de atraso; a vencer; fonte pagadora; recuperado (soma do que foi pago com atraso); contatos e promessas; documentos. Campo sem dado mostra "—", nunca zero inventado.
- **RN-006** — O documento (PDF ou impressão) respeita o filtro de categoria ativo e traz todos os registros do filtro. O nome sugerido do arquivo é "Histórico - {nome do cliente}", sem os caracteres `\ / : * ? " < > |`.
- **RN-007** — removida (ver C-008).
- **RN-008** — Toda emissão do documento do histórico é registrada (quem, quando, cliente, categorias do filtro).
- **RN-009** — Só Gerente, Diretoria e Administrador escrevem em fontes e material. O Jurídico também pode registrar a revisão de uma fonte. Os demais perfis veem apenas itens ativos.
- **RN-010** — Fonte da lista inicial de legislação e de normas do fluxo da NF nasce "A revisar pelo Jurídico", porque datas, números de norma e valores ali citados (inclusive os de 2026) mudam; o selo só sai por revisão registrada e volta se título ou link forem alterados.
- **RN-011** — Link de fonte é opcional (fonte sem endereço conhecido aparece como "sem link"); quando informado, começa com http:// ou https://.
- **RN-012** — O arquivo do material segue os tipos e o limite de 20 MB do anexo geral do sistema; um novo arquivo substitui o anterior no item.
- **RN-013** — A busca de material, a de fontes e a de cliente ignoram maiúsculas e acentos; a de cliente por CPF/CNPJ ignora pontuação.
- **RN-014** — A regra em vigor de uma carteira é o valor próprio da carteira, se houver; senão o padrão (que é o da carteira Privada). Vale o de vigência mais recente que já começou; vigência futura não aparece.
- **RN-015** — O registro de e-mail enviado mostra destinatário, assunto e resultado do envio; o corpo completo fica disponível ao expandir.
- **RN-016** — A categoria "Alteração auditada" aparece só para Supervisor, Gerente, Diretoria e Administrador. Para os demais ela não entra na lista, nas contagens nem no documento.
- **RN-017** — O Jurídico vê o histórico só de cliente com processo ativo, e sem a categoria "Alteração auditada" (pendência P-27, padrão adotado).
- **RN-018** — O documento traz no máximo os 2.000 registros mais recentes do filtro; passando disso, avisa no próprio documento quantos ficaram de fora.
- **RN-019** — Pagamento estornado no Winthor não aparece no histórico nem soma no "recuperado".

## Testes

Cenários e regras com evidência automática. Dados de referência (relógio em
19/11/2026 10:00):

- **Alfa (7001, da Ana):** limite 80.000,00; títulos de 12.500,00 vencido há 37 dias, 20.000,00 a vencer em 15 dias, 3.000,00 pago com 10 dias de atraso e 2.000,00 pago antes do vencimento. A história é montada pelas operações dos próprios módulos: 1 contato na ficha (Helena Prado); 3 contatos de cobrança, o último com promessa de 12.500,00; próxima ação para o dia útil seguinte; 1 e-mail; acordo de 12.500,00 (entrada de 2.500,00 paga hoje, 2 parcelas de 5.000,00 a vencer) proposto pela Ana e aprovado pelo Sérgio; 1 solicitação de crédito de 100.000,00 aberta pelo Sérgio (supervisor da Ana) com a Rita como analista; depois, 1 pedido 771204 de 60.000,00 acima do limite, aberto pela Rita; 1 nota escrita no card da cobrança.
- **Beta (7002, da Ana):** um título de 4.000,00 a vencer em 60 dias; nada mais.
- **Gama (7003, da Ana):** um título de 9.000,00 vencido há 90 dias; processo registrado pela Júlia com 2 andamentos.
- **De outros módulos:** Drogaria Popular (1006, do Carlos), Home Care Alfa (1008, do Sérgio), órgão 5001 (rating P1) e órgão 5002 (nota fiscal com 2 passos da régua feitos).

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001 | Para Ana, Alfa: os 3 primeiros registros são agendados, em ordem crescente de data (parcela 1 e próxima ação no mesmo instante, nesta ordem, depois parcela 2 — a aprovação do acordo leva a próxima ação ao vencimento da parcela 1 e o empate se desfaz pela origem, RN-001; divergência aceita na validação B4-007); os demais em ordem decrescente; contagem por tipo: 3 contatos, 1 promessa, 1 próxima ação, 1 proposta e 1 aprovação de acordo, 3 parcelas (1 paga, 2 a vencer), 2 recebimentos, 1 e-mail, 1 solicitação, 1 pedido; há pelo menos 1 mudança de etapa e 1 nota de card; total = soma das contagens por categoria; nenhum registro de "Alteração auditada". Na tela: valores e datas do texto saem em formato brasileiro (12500 → R$ 12.500,00; 2026-11-24 → 24/11/2026) | regra de negócio + regra de tela |
| C-002 | Filtro "Acordos e baixas" devolve 5 registros e total 5, com os 2 agendados no topo; contagens: Acordos e baixas 5, Recebimentos 2, e Cobrança, Crédito e Comunicação maiores que zero; resumo idêntico com e sem filtro | regra de negócio |
| C-003 | Para Sérgio: busca "alfa" devolve 2 clientes (7001 e 1008); "70.010.000/0001-70" e "70010000000170" devolvem 1 cada, o mesmo (7001); "ALFA" e "álfa" equivalem a "alfa". Para Ana, "alfa" devolve só 7001 | regra de negócio + regra de tela |
| C-004 | 7001: Ana e Sérgio abrem; Carlos e Silvia recebem "Cliente não encontrado"; Gustavo abre. 1006: Carlos e Silvia abrem; Ana e Sérgio recebem "Cliente não encontrado" e a busca de Ana por "drogaria" devolve 0; Gustavo abre. A recusa vale para o resumo, para a lista, para o total e para o documento | regra de negócio |
| C-005 | 7002 para Ana: total 0, lista vazia, resumo com os 12 campos presentes; etapa de crédito, etapa de cobrança, fonte pagadora e recuperado vazios; a vencer 4000.00 | regra de negócio |
| C-006 | Resumo de 7001: etapa de crédito "1 · Solicitação recebida", etapa de cobrança "Acordo em andamento" (carteira Privada), agente Ana Costa, supervisor Sérgio Nunes, limite 80000.00, utilizado 32500.00, vencido 12500.00 e 37 dias, a vencer 20000.00, recuperado 3000.00, 3 contatos e 1 promessa em aberto; rating, score e criticidade iguais aos que o módulo de crédito calculou | regra de negócio |
| C-007 | Emissão de 7001 com filtro "Acordos e baixas": 5 registros, 1 contato na ficha (Helena Prado), emitido por Ana na hora do relógio; a auditoria ganha 1 linha de emissão com "Acordos e baixas"; nome do documento "Histórico - ALFA DISTRIBUIDORA LTDA"; rodapé montado com o nome do cliente, o documento 70.010.000/0001-70 e a numeração "Página i de n" | regra de negócio + regra de tela |
| C-009 | Com página de 5 na tela, a emissão de 7001 com filtro "Cobrança" devolve todos os registros da categoria (mais de 5, igual ao total da categoria) e grava 1 linha de auditoria de emissão | regra de negócio |
| C-010 | Listagem de fontes para Ana devolve 41 itens ativos em 6 grupos (6, 3, 9, 5, 12 e 6); 21 marcados para revisão (12 de Legislação e 9 de Fluxo da NF) | regra de negócio |
| C-011 | Gustavo inclui fonte (https) → total 42; edita o uso → auditoria ganha 1 linha com antes/depois; muda a ordem para o início do grupo → ela passa a ser a primeira do grupo; inativa → Ana vê 41, Gustavo vê 42 com a fonte inativa; "ftp://x" e "exemplo.gov.br" são recusadas e a mensagem cita "http"; título repetido no mesmo grupo é recusado | regra de negócio |
| C-012 | Ana, Rita, Sérgio e Júlia recebem erro de permissão ao salvar fonte e ao salvar material; contagem de fontes e de materiais inalterada (41 e 7); Gustavo e Diana conseguem | regra de negócio |
| C-013 | Júlia revisa "Lei 14.133/2021" → selo some, revisado por Júlia e data preenchidos, 20 pendentes; Gustavo edita o link → selo volta; Ana tenta revisar → negado | regra de negócio |
| C-014 | Busca "politica" devolve a "Política de Crédito e Cobrança v5.2"; "fluxo" devolve os 6 itens de fluxo; "zzz" devolve 0; total acompanha o filtro; inativar um material → 6 para Ana e 7 para Gustavo | regra de negócio |
| C-015 | Registrar PNG de 2 MB para o material e ligar ao item → item com arquivo e endereço; EXE → o registro do anexo recusa pelo tipo; PDF de 25 MB → recusa pelo tamanho; nas duas recusas nada é gravado e o item continua apontando o PNG; ligar ao item um anexo que não é de material é recusado | regra de negócio |
| C-016 | Material recém-cadastrado devolve "sem arquivo"; o conjunto inicial tem 7 itens, todos sem arquivo | regra de negócio |
| C-017 | Com correção monetária padrão 0,4, Estética 0,3 desde hoje e 0,9 desde 2099-01-01: a consulta devolve padrão 0,4, Estética 0,3 marcada como própria com a data de hoje, Pública 0,4 marcada como herdada; multa: padrão 2, Estética herdada, Pública 0 própria; nenhum valor 0,9; os dias da régua vêm marcados como "não se aplica" na Pública. Na tela: célula própria em destaque, herdada esmaecida, não aplicável "—" | regra de negócio + regra de tela |
| C-018 | O módulo não tem operação de escrita sobre parâmetros; cada valor próprio de carteira traz a vigência de início; a tela das regras não tem campo editável | regra de negócio + verificação manual |
| C-019 | 7001 com as categorias "Acordos e baixas" e "Recebimentos" e página de 3: deslocamentos 0/3/6 devolvem 3, 3 e 1 registros; a união dos 3 lotes tem 7 registros distintos; total 7 | regra de negócio |
| C-020 | A consulta devolve o quadro de cobrança da Privada com a etapa "Em negociação" e 240 h, e o de concessão da Privada com "1 · Solicitação recebida" e 24 h, na ordem do quadro; depois de renomear a etapa no quadro, a consulta devolve o nome novo. Na tela: 240 h aparece como "10 dias" e 24 h como "1 dia" | regra de negócio + regra de tela |
| C-021 | Júlia: busca "gama" devolve 7003 e "alfa" devolve 0; abrir 7001 → "Cliente não encontrado"; 7003 traz 1 registro de processo e 2 andamentos na categoria "Jurídico" e nenhuma contagem de "Alteração auditada" | regra de negócio |
| C-022 | 7001: Sérgio tem contagem de "Alteração auditada" maior que zero, com a alteração da ficha de contatos (campo, antes, depois, por Ana); Ana não tem a categoria; total de Ana = total de Sérgio − contagem da categoria; pedir a categoria como Ana devolve 0 registros | regra de negócio |
| RN-001 | O contato com promessa e a promessa têm o mesmo instante: o contato sai antes da promessa, e duas leituras seguidas dão a mesma ordem; agendados em ordem crescente. Na tela: o grupo "Agendado" é o primeiro e os dias seguem em ordem decrescente | regra de negócio + regra de tela |
| RN-002 | Mesma massa de C-004; mais: Diana e Nara abrem 7001 e 1006; Rita (analista da solicitação de Alfa) abre 7001 e não abre 1006; usuário sem vínculo na equipe não abre nenhum | regra de negócio |
| RN-003 | O módulo não expõe nenhuma operação de escrita sobre registros do histórico: as operações de histórico são só leituras, e a única gravação é a linha de auditoria da emissão | regra de negócio |
| RN-004 | A lista de categorias tem exatamente 8 entradas com os nomes de RN-004, cada uma com cor distinta; todo registro devolvido tem uma dessas 8 categorias; as abas da tela cobrem as 8 sem repetir | regra de tela + regra de negócio |
| RN-005 | Resumo de 7002: 12 campos presentes, com etapa de crédito, etapa de cobrança, fonte pagadora e recuperado vazios (a tela mostra "—"); órgão 5001 para Carlos: rating P1 | regra de negócio |
| RN-006 | Nome do documento para o cliente `Alfa / Norte: "A"?` = `Histórico - Alfa Norte A`; o rodapé de um cliente com aspas no nome continua válido | regra de tela |
| RN-008 | Duas emissões de 7001 (uma sem filtro, uma com "Cobrança") geram 2 linhas de auditoria da área do histórico, com Ana como autora e as categorias; as duas aparecem para Sérgio em "Alteração auditada" | regra de negócio |
| RN-009 | Ana vê só fontes e materiais ativos mesmo pedindo os inativos; Gustavo vê os inativos; Júlia não consegue editar título (só revisar); Nara (administradora) consegue salvar | regra de negócio |
| RN-010 | Após edição do título de fonte já revisada, ela volta a ficar marcada para revisão e sem data de revisão; editar só o uso não devolve o selo | regra de negócio |
| RN-011 | `https://a.gov.br/x` e `http://a.gov.br` aceitas; `a.gov.br` e `javascript:alert(1)` recusadas; fonte com link vazio aceita em qualquer grupo | regra de negócio |
| RN-012 | Segundo arquivo ligado ao mesmo item substitui o primeiro: o item aponta para o novo arquivo e a lista devolve o nome novo | regra de negócio |
| RN-013 | `  ÁÇÃO Ltda ` e `acao ltda` dão o mesmo termo de busca; `70.010.000/0001-70` vira `70010000000170`; busca de fonte por "licitacoes" acha "TCU: Licitações e Contratos" | regra de tela + regra de negócio |
| RN-014 | Mesma massa de C-017; mais: gravar novo padrão 0,5 para a correção monetária com vigência hoje → a consulta devolve 0,5 no padrão e na Pública, e a Estética continua 0,3 | regra de negócio |
| RN-015 | Registro de e-mail de 7001 tem como título o assunto e, no texto, o destinatário e o resultado ("Enviado") antes do corpo. Na tela: só a primeira parte aparece; o corpo fica atrás de "Ver o e-mail completo" | regra de negócio + regra de tela |
| RN-016 | Mesma massa de C-022; mais: Rita (analista) não tem a categoria; Nara (administradora) tem; a emissão feita por Ana não traz registros dessa categoria | regra de negócio |
| RN-017 | Mesma massa de C-021; mais: depois de encerrado o processo de Gama, Júlia deixa de encontrá-lo | regra de negócio |
| RN-018 | Emissão com teto de 3 registros para 7001 (teto reduzido só no teste): devolve os 3 mais recentes, informa o total real e que houve corte. Na tela: o aviso "mostrando 3 de N registros" entra no documento | regra de negócio + regra de tela |
| RN-019 | Desfeito no Winthor o pagamento de 3.000,00 de Alfa e refeita a leitura: Recebimentos cai de 2 para 1 e o recuperado fica vazio | regra de negócio |
| Órgão público | Órgão 5002 para Carlos: a categoria "Setor público" tem 2 passos da régua da nota fiscal e pelo menos o marco de emissão da nota (cobre a categoria que o cliente privado não tem); cancelada a nota no Winthor e refeita a leitura, ela e os seus passos saem do histórico | regra de negócio |

- Cada cenário C-00N (menos o C-008, removido) e cada regra RN-00N (menos a RN-007, removida) tem pelo menos uma linha.
- Toda linha tem entrada e resultado concretos. Onde o número depende do que os outros módulos lançam sozinhos (mudança de etapa pela rotina, nota automática do card), a evidência é "pelo menos 1" e o total é conferido pela soma das contagens.
- **Verificação manual:**
  - [ ] C-007 — salvar o PDF pela prévia e conferir logo, cabeçalho, quebra de página e rodapé "Página i de n" no Chrome e no Edge
  - [ ] C-009 — pré-visualização de impressão sem menus
  - [ ] C-010 — links abrem em nova aba
  - [ ] C-018 — nenhuma célula das regras é editável
  - [ ] RNF-004 — todas as telas em tema claro e escuro
  - [ ] RNF-001/002 — tempos com 500 registros

## Fora de escopo

- [ ] Editar parâmetros e regras: é da 001 (área de parâmetros); aqui só se consulta.
- [ ] Editar etapas e prazos dos quadros: é da administração de cada quadro; aqui só se consulta.
- [ ] Criar, editar ou apagar qualquer registro do histórico, ou guardar cópia dele: cada fato nasce no módulo que o produz (001 a 005) e é lido de lá.
- [ ] Telas operacionais (quadros, fichas, agenda): nas specs 001 a 005.
- [ ] Trilha de auditoria completa (quem alterou o quê, em todas as áreas): é a tela "Trilha de auditoria" da 001; aqui entram só as alterações ligadas a um cliente, como categoria do histórico.
- [ ] Tela de planos de pagamento ("Prazos de pagamento" do artefato): é da 001, só leitura (P-13).
- [ ] Tabelas descritivas e checklists da página "Regras em vigor" do artefato: o checklist de cada etapa é visto no próprio card do quadro; a consulta mostra valores de parâmetros e etapas com prazo.
- [ ] Os outros documentos do artefato (7 treinamentos e 3 documentos do Jurídico): não entram na carga inicial, que traz só os 7 itens de título conhecido (política, fluxo geral e 5 fluxos); quem mantém o material os cadastra pela tela.
- [ ] Modelos de importação do Winthor em CSV: saem, porque o Winthor é lido direto.
- [ ] Versões editáveis dos documentos (Word/PowerPoint): ficam com o Núcleo Financeiro.
- [ ] Atalhos de "modelos de comunicação" do artefato para outras telas: cada tela já é acessada pelo menu.
- [ ] Verificação automática de links quebrados e de vigência de normas: a revisão é humana (Jurídico).
- [ ] Envio e remoção de anexos do cliente: são da 001; o histórico mostra a alteração na trilha auditada.
- [ ] Custos do processo, itens do dossiê e parcelas de acordo judicial como registros do histórico: ficam na ficha do processo (003).
- [ ] Baixar o PDF sem passar pela janela de impressão do navegador, e a troca de caracteres especiais do artefato (C-008, RF-009, RN-007): saem com a decisão de gerar o documento pela impressão do navegador.
- [ ] As 14 categorias do artefato: viram as 8 do contrato técnico (ficha de contatos e documento do cliente aparecem em "Alteração auditada"; pedido acima do limite, em "Crédito"; contato e promessa, em "Cobrança"; recuperação, em "Recebimentos"; nota fiscal, em "Setor público"; processo, em "Jurídico").
- [ ] Valor "geral" separado do "privado" nas regras: pelo modelo de carteiras, o padrão é o valor da Privada; Estética e Pública só guardam o que for diferente.
- [ ] Migração de histórico do artefato: não há (P-02).

## Pendências

Nenhuma bloqueia: cada uma segue pelo padrão adotado, e trocar o padrão depois é
mudar dado ou cadastro. Numeração do índice do contrato técnico.

| # | Pergunta ao gestor | Padrão adotado |
|---|---|---|
| P-27 | O que o Jurídico vê do histórico do cliente? | Só cliente com processo ativo, sem a categoria "Alteração auditada" (RN-017) |
| P-02 | O histórico que existe no artefato migra? | Não. O histórico começa na implantação; do Winthor vêm os pagamentos desde janeiro do ano anterior |
| P-25 | Arquivo em endereço público | Aceito para o material de apoio, que não é documento sensível |
| P-32 | Quem fornece os endereços oficiais das 41 fontes e a arte do papel timbrado? | Fonte sem endereço conhecido entra "sem link" até alguém preencher; o documento sai com logo e cabeçalho do sistema até a arte chegar |
| P-33 | Quem fornece os arquivos do material de apoio (política v5.2, fluxos)? | Os 7 itens entram como "Arquivo pendente" e quem mantém o material anexa pela tela |

Resolvida pelo contrato: quem vê "Alteração auditada" (Supervisor ou acima — RN-016).

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida
- [x] Cenários cobrem pelo menos um caminho de erro
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta
- [x] Zero `[NEEDS CLARIFICATION]` em aberto (as 5 viraram pendências com padrão adotado ou foram resolvidas pelo contrato)
