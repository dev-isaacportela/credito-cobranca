# Spec: Base — clientes e posição do Winthor, equipe, parâmetros e serviços comuns

**ID:** 001-base · **Status:** em revisão (corrigida contra o contrato técnico em 14/11/2026; ajustada às respostas do arquiteto em 16/11/2026) · **Data:** 2026-11-14

> Escopo: a fundação que todos os módulos usam. Acesso e perfis, clientes e
> posição financeira lidos do Winthor (por cliente, por BU e por carteira),
> equipe e hierarquia, quem enxerga o quê, catálogo único de parâmetros da
> Política (com valor por carteira e vigência), BUs e departamentos, feriados e
> dias úteis, ficha de contatos, modelos de mensagem, envio de e-mail, anexos,
> auditoria e a rotina que, depois de cada leitura, aciona os outros módulos em
> ordem. Régua, cobrança, crédito, jurídico, setor público e painel são as
> specs 002 a 007; aqui nasce só o que elas consomem.
>
> Origem: o artefato do gestor estudado em `docs/estudo-artefato/`. O artefato é
> referência de regra, não de implementação.
>
> Vocabulário desta revisão: **carteira** é Privada, Estética ou Pública (a que
> um saldo pertence); os clientes de um agente são a **atribuição** dele.
> "Segmento" deixou de existir: virou carteira.

## Problema

No artefato, a posição de cada cliente (vencido, dias de atraso, a vencer)
entra por planilha exportada do Winthor e importada à mão; se ninguém importa,
a régua cobra quem já pagou. Os quase 100 números da Política estão
espalhados, metade editável e metade fixa no código, e a tela aceita uma régua
fora de ordem. A equipe é uma lista de nomes sem efeito: quem não está
cadastrado não sofre restrição nenhuma, e qualquer pessoa vê os clientes de
todo mundo. Contatos, anexos e auditoria são pedaços de um registro só, que é
sobrescrito inteiro a cada gravação: duas pessoas editando o mesmo cliente
perdem dados. Sem uma base comum, cada módulo refaria isso do seu jeito.

## Resultado esperado

A posição nasce sozinha do Winthor e se atualiza a cada 15 minutos; cada
pessoa entra com o próprio login e vê exatamente os clientes que lhe cabem pela
hierarquia; e todo número da Política está num só lugar, com o padrão, quem
mudou e quando.

## Usuários

| Perfil | O que precisa fazer nesta base | Frequência |
|---|---|---|
| Agente de cobrança | Buscar e abrir os clientes atribuídos a ele, ver títulos ao vivo, manter a ficha de contatos, enviar e-mail, anexar documento | diária |
| Supervisor | O mesmo, sobre os seus clientes e os da equipe abaixo dele; redistribuir clientes entre os agentes da equipe; informar grupo econômico e esfera; pedir uma leitura do Winthor | diária |
| Gerente financeiro | Ver todos os clientes; atribuir clientes sem agente; consultar a auditoria; administrar como o Administrador | diária |
| Diretoria | Ver todos os clientes e a auditoria | semanal |
| Jurídico | Entrar no sistema; ver, só para leitura, os clientes com processo ativo no Jurídico (marcados pela spec 003); validar modelo de mensagem com efeito legal | diária |
| Administrador (Núcleo Financeiro) | Cadastrar a equipe, editar parâmetros, BUs e departamentos, feriados e modelos de mensagem, acompanhar a leitura do Winthor | semanal |
| Analista de crédito | Entrar no sistema; ver os clientes em que é o analista (definido pela spec 004) | diária |

**Perfil = cargo + marca de Administrador.** Cargos: Agente de cobrança,
Supervisor, Gerente financeiro, Diretoria, Jurídico, Analista de crédito.
Administrador não é um nível da hierarquia: é uma marca que se soma ao cargo
de qualquer pessoa. A mesma pessoa pode ser agente e analista (P-04).
**Quem administra** (equipe, parâmetros, BUs e departamentos, feriados,
modelos de mensagem, leituras do Winthor, auditoria e os quadros): Gerente,
Diretoria e quem tem a marca de Administrador (D-06). Só quem tem a marca
pode dar ou tirar a marca de alguém.

**Visibilidade dos clientes** (vale para toda tela de toda spec que lista
cliente):

- Agente e analista: os clientes em que ele é o agente de cobrança ou o analista de crédito.
- Supervisor: os seus e os dos subordinados diretos e indiretos.
- Gerente, Diretoria e Administrador: todos, inclusive os sem agente.
- Jurídico: os clientes com processo ativo no Jurídico, só para leitura (nesta base, nenhum até a spec 003 marcar).

## Cenários

Datas relativas a "hoje" (fuso de Brasília). Onde o dia da semana importa, hoje
é quinta-feira, 19/11/2026. Equipe de exemplo usada nos cenários: **Diana**
(Diretoria, topo) → **Gustavo** (Gerente) → **Sérgio** (Supervisor) → **Ana**
e **Bruno** (Agentes) e **Rita** (Analista); Gustavo → **Silvia** (Supervisor)
→ **Carlos** (Agente); Gustavo → **Júlia** (Jurídico) e **Nara** (Agente +
Administrador); **Otávio** (Agente, inativo, era da equipe de Sérgio).
Atribuição: Ana 1001, 1002 e 1010; Bruno 1004, 1005 e 1012 (pessoa física);
Sérgio 1008; Carlos 1006 e 1007; sem agente 1009. BUs: Nutrição, Enfermagem e
Medicamento (carteira Privada) e Estética (carteira Estética).

**C-001 — Posição calculada a partir dos títulos**
- **Dado que** o cliente 1001 tem no Winthor limite de R$ 10.000,00 e os títulos: R$ 1.000,00 vencido há 12 dias; R$ 500,00 vencido há 3 dias; R$ 2.000,00 e R$ 300,00 vencendo daqui a 5 dias; R$ 800,00 vencendo daqui a 20 dias; R$ 700,00 vencido há 30 dias e pago há 28; R$ 1.200,00 cancelado — de 5 vendas distintas nos últimos 90 dias, todas com 30 dias de prazo, a última há 10 dias
- **Quando** a leitura do Winthor roda
- **Então** a posição do 1001 mostra vencido R$ 1.500,00, a vencer R$ 3.100,00, 12 dias de atraso, próximo vencimento daqui a 5 dias no valor de R$ 2.300,00, 5 títulos em aberto (2 vencidos), utilizado R$ 4.600,00, disponível R$ 5.400,00, última compra há 10 dias, 5 compras (R$ 5.300,00) nos últimos 90 dias, compra média mensal de R$ 1.766,67, prazo médio de 30 dias e pontualidade de 0% (o único pagamento do período foi com atraso), com a data e a hora da leitura

**C-002 — Recebimento entra uma vez só**
- **Dado que** o título de R$ 700,00 do 1001 venceu há 30 dias e foi pago há 28
- **Quando** a leitura roda duas vezes seguidas, depois o título de R$ 500,00 é pago no Winthor e a leitura roda de novo, e por fim a baixa do de R$ 700,00 é estornada no Winthor e a leitura roda mais uma vez
- **Então** depois das duas primeiras leituras existe 1 recebimento (R$ 700,00, pago com 2 dias de atraso); depois da terceira existem 2 e o vencido cai para R$ 1.000,00; depois da quarta o recebimento de R$ 700,00 fica marcado como estornado, deixa de contar, e o vencido volta a R$ 1.700,00 com 30 dias de atraso

**C-003 — Cliente novo e cliente alterado no Winthor**
- **Dado que** o sistema tem os 11 clientes de exemplo, já lidos; no Winthor passa a existir o 1013 (com título a vencer) que o sistema não conhece, o RCA do 1004 mudou de 10 para 11, e o 1011 não tem título nem venda há 2 anos
- **Quando** a leitura roda
- **Então** o sistema passa a ter 12 clientes: o 1013 aparece sem agente; o 1004 mostra o RCA 11 e continua com o agente Bruno; o 1011 não entra

**C-004 — Quem quitou sai zerado sozinho**
- **Dado que** o 1002 tem R$ 2.500,00 vencido há 8 dias e nenhum outro título em aberto
- **Quando** o título é pago no Winthor e a leitura seguinte roda
- **Então** o 1002 mostra vencido R$ 0,00, a vencer R$ 0,00, 0 dias de atraso e nenhum próximo vencimento, no total, na BU e na carteira, sem ninguém fazer nada

**C-005 — Winthor fora do ar durante a leitura (erro)**
- **Dado que** a última leitura bem-sucedida mostrou o 1001 com R$ 1.500,00 vencido
- **Quando** a leitura seguinte não consegue ler o Winthor
- **Então** a leitura fica registrada como erro, com a mensagem; o 1001 continua com R$ 1.500,00 e com a data da leitura anterior; nenhuma rotina dos outros módulos roda sobre a leitura com erro; e, quando a última leitura bem-sucedida tem mais de 30 minutos (2 vezes o intervalo de 15), toda tela que mostra posição avisa que ela está desatualizada e de quando é

**C-006 — Intervalo, pedido manual e leitura travada**
- **Dado que** o intervalo é de 15 minutos e o sistema verifica a cada 5
- **Quando** a última leitura começou há 10 minutos; depois, há 16 minutos; depois Sérgio pede "ler agora" com a última há 10 minutos; depois pede de novo com um pedido ainda pendente; Ana (agente) tenta pedir; e, por fim, uma leitura está "em andamento" há 40 minutos
- **Então** com 10 minutos não lê; com 16 lê; o pedido manual é atendido na verificação seguinte (no máximo 5 minutos) mesmo com 10 minutos; o segundo pedido é recusado porque já há um pendente; o de Ana é recusado; e a leitura parada há 40 minutos (mais de 2 vezes o intervalo) é dada como falha e uma nova roda. Leitura grande que não termina numa verificação continua na seguinte, do ponto em que parou

**C-007 — Ficha do cliente com títulos ao vivo**
- **Dado que** Ana abre a ficha do 1001
- **Quando** a ficha carrega
- **Então** mostra o cadastro e a posição da última leitura, com a data (CNPJ 12.345.678/0001-90, limite R$ 10.000,00, plano "28/35/42 DIAS", RCA "CARLOS LIMA"), a posição por BU e por carteira, a ficha de contatos e, lidos do Winthor naquele momento, os 5 títulos em aberto com o atraso (12 e 3 dias nos vencidos) e a BU de cada um
- **E quando** o Winthor não responde
- **Então** a parte de títulos mostra "Não foi possível consultar o Winthor agora." e nenhum título, e o cadastro e a posição da última leitura continuam visíveis com a data
- **E quando** Ana tenta abrir a ficha do 1006 (de Carlos)
- **Então** o sistema responde "Cliente não encontrado.", como se o cliente não existisse

**C-008 — Busca de cliente**
- **Dado que** o 1001 é "HOSPITAL SAO LUCAS LTDA", CNPJ 12.345.678/0001-90
- **Quando** Ana busca "são lucas", "12.345.678/0001-90", "12345678000190" e "1001"
- **Então** as quatro buscas trazem o 1001; a busca vazia de Ana traz 3 clientes, com total 3; a fila "em atraso" de Ana traz os 3; e a fila "sem agente" de Gustavo traz 2 (1003 e 1009)

**C-009 — Cada um vê os clientes que lhe cabem**
- **Dado que** a equipe e a atribuição de exemplo, depois da leitura que trouxe o 1003
- **Quando** cada pessoa abre a lista de clientes
- **Então** Ana vê 3, Bruno 3, Carlos 2, Silvia 2, Sérgio 7 (os 3 de Ana, os 3 de Bruno e o seu), Gustavo 11, Diana 11, Nara 11, Júlia 0 e Rita 0 — e a contagem de cada um bate com a lista

**C-010 — Acesso sem vínculo ou inativo (erro)**
- **Dado que** "visitante@benenutri.local" entra com login válido mas não está na equipe, e Otávio está inativo
- **Quando** cada um tenta usar o sistema
- **Então** a entrada mostra "Seu acesso ainda não foi liberado. Fale com o Administrador."; toda lista vem vazia e toda ação de gravação é recusada para os dois ("Você não faz parte da equipe de Crédito e Cobrança.")

**C-011 — Cadastro da equipe com erro**
- **Dado que** a equipe de exemplo
- **Quando** o Administrador tenta: cadastrar "Ána  COSTA" (já existe Ana Costa); cadastrar alguém sem superior; cadastrar um agente cujo superior é Ana (agente); mudar o superior de Gustavo para Sérgio (subordinado dele); cadastrar outra pessoa com o e-mail de Ana; e Nara, a única com a marca de Administrador, tira a própria marca
- **Então** as seis tentativas são recusadas, cada uma com o motivo: nome repetido; já existe o topo da hierarquia; o superior precisa ser Supervisor, Gerente ou Diretoria; a mudança criaria um ciclo; e-mail já usado; é preciso manter ao menos um Administrador

**C-012 — Troca do topo da hierarquia**
- **Dado que** Diana é o topo e Roberto (Diretoria) foi cadastrado reportando a Diana
- **Quando** o Administrador define Roberto como novo topo
- **Então** Roberto fica sem superior, Diana passa a reportar a Roberto, a hierarquia continua com um único topo, ninguém mais muda de superior e cada um continua vendo os mesmos clientes de antes

**C-013 — Inativar quem tem clientes ou equipe (erro)**
- **Dado que** Bruno tem 3 clientes e Sérgio tem 3 subordinados ativos (Ana, Bruno e Rita; Otávio está inativo)
- **Quando** o Administrador tenta inativar Bruno e Sérgio
- **Então** os dois são recusados, citando "3 clientes" e "3 subordinados ativos"; depois que os clientes de Bruno são redistribuídos, inativar Bruno é aceito

**C-014 — Redistribuição de clientes**
- **Dado que** a equipe e a atribuição de exemplo
- **Quando** Sérgio move 1004 e 1005 de Bruno para Ana; Sérgio tenta mover 1006 (de Carlos); Sérgio tenta mover 1001 para Carlos; Ana tenta mover 1002 para Bruno; Gustavo atribui o 1009 (sem agente) a Carlos
- **Então** Ana fica com 5 clientes e Bruno com 1, com 2 registros de auditoria (antes Bruno, depois Ana, por Sérgio); as tentativas sobre o 1006 e para Carlos são recusadas por estar fora da equipe de Sérgio; a de Ana é recusada porque agente não redistribui; Carlos fica com 3

**C-015 — Parâmetro com valor por carteira**
- **Dado que** "Dias de atraso — crítico a partir de" vale 30 no padrão
- **Quando** o Administrador define 45 para a carteira Estética
- **Então** o valor em vigor é 45 para a Estética (valor próprio) e 30 para a Privada e a Pública (o padrão); e, quando o valor da Estética é removido, ela volta a usar 30

**C-016 — Parâmetro com vigência**
- **Dado que** a "Versão da Política" vale 5.2
- **Quando** o Administrador cadastra 5.3 a partir de 01/01/2027 e, em seguida, corrige para 5.4 na mesma data
- **Então** o valor em vigor é 5.2 em 19/11/2026 e 5.4 em 02/01/2027; o histórico mostra 2 vigências (a original e a de 01/01/2027, que foi substituída e não duplicada); e a auditoria guarda as duas gravações

**C-017 — Edição de parâmetro recusada (erro)**
- **Dado que** os padrões em vigor
- **Quando** o Administrador tenta gravar: alerta de atraso 40 com crítico 30; rating de alerta E com crítico E; intervalo da leitura de 7 minutos; PDD da faixa de 1 a 30 dias em 120%; PDD de 31 a 60 dias em 2% (com 3% na faixa anterior); dias de atraso crítico vazio; e, só para a Estética, alerta de atraso 40 (com o crítico padrão em 30)
- **Então** as sete gravações são recusadas, cada uma com o motivo ("o alerta precisa ser mais brando que o crítico", "múltiplo de 5, de 5 a 120", "de 0 a 100", "as faixas não podem diminuir", "valor obrigatório"), e todos os parâmetros seguem com o valor anterior. Gravação de vários parâmetros de uma vez é aceita ou recusada inteira: alerta 40 junto com crítico 50 é aceito; alerta 40 junto com um intervalo de 7 minutos não grava nenhum dos dois

**C-018 — Auditoria do parâmetro e restaurar padrão**
- **Dado que** "Dias de atraso — crítico" está no padrão 30
- **Quando** Nara muda para 35 e depois usa "Restaurar padrão"; e muda "Uso do limite — alerta" de 90 para 85 e "Dias de atraso — alerta" de 1 para 2, e restaura o grupo "Criticidade do cliente"
- **Então** o parâmetro volta a 30, com dois registros de auditoria (30 → 35 e 35 → 30, por Nara, com data e hora); os dois do grupo voltam a 90 e 1, com mais quatro registros (duas mudanças e duas restaurações): seis no total

**C-019 — Administra quem é Gerente, Diretoria ou Administrador (erro)**
- **Dado que** Ana é agente, Sérgio é supervisor e Gustavo é gerente, nenhum dos três com a marca de Administrador; Nara é agente com a marca
- **Quando** Ana tenta mudar um parâmetro, cadastrar um membro, cadastrar um feriado, criar uma BU, ligar um departamento a uma BU e editar um modelo de mensagem; Sérgio tenta mudar um parâmetro; Gustavo faz as mesmas seis ações de Ana; Nara muda um parâmetro; Gustavo tenta dar a marca de Administrador a Bruno; e Nara dá a marca a Bruno
- **Então** as sete tentativas de Ana e Sérgio são recusadas pelo sistema com "Somente Gerente, Diretoria ou Administrador", mesmo que alguém consiga chegar à ação por fora da tela; as seis de Gustavo e a de Nara são aceitas; Gustavo não consegue dar a marca ("só quem tem a marca de Administrador"); Nara consegue

**C-020 — BU do item, setor pelo ramo e departamentos**
- **Dado que** o 1007 (Secretaria Municipal de Saúde) tem o ramo 13, "ORGAO PUBLICO MUNICIPAL", e deve R$ 12.000,00 de itens da BU Nutrição; o 1012 é pessoa física; e o 1008 ganha uma venda de R$ 200,00 de um item do departamento 90, que não está ligado a nenhuma BU
- **Quando** a leitura roda; depois o Administrador liga o departamento 90 à BU Enfermagem e a leitura roda de novo; e Sérgio informa o grupo econômico "REDE ALFA" para o 1008
- **Então** o 1007 é do setor público e o saldo dele está na carteira Pública, mesmo sendo de itens da Nutrição; o 1012 é do setor privado; os R$ 200,00 do 1008 aparecem como "Sem BU", na carteira Privada, e o departamento 90 entra na lista de departamentos sem BU; depois da ligação, os R$ 200,00 passam à Enfermagem; e a leitura não desfaz o grupo econômico informado. Tirando o código 13 da lista de ramos públicos, o 1007 continua público pelo nome do ramo; trocando também o prefixo, passa a privado na leitura seguinte

**C-021 — Dias úteis e feriados**
- **Dado que** os feriados nacionais de 2026 foram gerados e há um feriado cadastrado só para o DF em 30/11/2026 (Dia do Evangélico)
- **Quando** o sistema calcula datas
- **Então** 1 dia útil depois de 13/11/2026 (sexta) é 16/11/2026; 1 dia útil depois de 19/11/2026 é 23/11/2026 (20/11 é Consciência Negra); 17/02/2026 não é dia útil (Carnaval); 0 dias úteis a partir de 15/11/2026 (domingo) é 16/11/2026; 30/11/2026 não é útil no DF e é útil em GO; e gerar 2026 de novo continua com 13 feriados nacionais, sem duplicar

**C-022 — Ficha de contatos**
- **Dado que** o 1001 não tem ficha
- **Quando** Ana grava Marta (Financeiro, marta@hsl.com.br) e Recepção ((61) 3333-0000), sem marcar principal; depois tenta gravar um contato só com nome; depois um com e-mail "marta@"; depois marca Recepção como principal; e por fim tenta deixar o contato principal como "Não usar mais"
- **Então** as duas primeiras gravações são aceitas, Marta vira a principal e a ficha fica "em dia", com Ana e a data como responsáveis; os dois seguintes são recusados ("informe telefone, WhatsApp ou e-mail", "e-mail inválido"); ao marcar Recepção, Marta deixa de ser principal (sempre um só); a última é recusada ("o contato principal não pode estar como Não usar mais"); e, na lista de clientes, o 1002 (ficha revisada há 181 dias) aparece como "vencida" e o 1004 (nunca preenchida) como "nunca atualizada". Marcar a ficha do 1002 como "revisada sem alteração" a deixa "em dia" sem mudar a data de nenhum contato

**C-023 — Modelo de mensagem**
- **Dado que** existem dois modelos entregues por um módulo: "Aviso de vencido" (sem efeito legal) e "Notificação formal" (com efeito legal, nunca validado)
- **Quando** o Administrador edita o texto do aviso para "Prezado(a) [CLIENTE], o valor de [VALOR_VENCIDO] venceu em [VENCIMENTO_MAIS_ANTIGO]."; tenta gravar com o campo [XYZ]; Ana (agente) tenta validar a notificação; Júlia (Jurídico) valida; e o Administrador edita a notificação depois de validada
- **Então** o aviso vai da versão 1 à versão 2; [XYZ] é recusado citando o campo desconhecido; a notificação está "aguardando validação" e não pode ser enviada; a validação de Ana é recusada; depois da de Júlia a notificação pode ser enviada; e, editada, volta a "aguardando validação". Validação feita há mais de 12 meses também não vale

**C-024 — Envio de e-mail**
- **Dado que** o 1001 tem Marta como contato principal e R$ 1.500,00 vencido há 12 dias
- **Quando** Ana envia o aviso do C-023 ao 1001; depois tenta enviar ao 1010 (sem contato com e-mail); tenta enviar um modelo que pede a data limite sem informá-la; e o serviço de e-mail falha num envio
- **Então** o primeiro sai para marta@hsl.com.br com "Prezado(a) Marta, o valor de R$ 1.500,00 venceu em [data de 12 dias atrás]." e fica registrado com o texto final, o modelo e a versão, quem enviou, quando e "enviado"; o segundo é recusado ("Sem e-mail cadastrado") e nada é enviado; o terceiro é recusado citando o campo que faltou; a falha fica registrada como "falhou", com o erro, e nunca como enviada

**C-025 — Anexo**
- **Dado que** Ana está na ficha do 1001
- **Quando** anexa um PDF de 5 MB; tenta anexar um PDF de 25 MB e um arquivo .exe; e remove o PDF anexado
- **Então** o PDF de 5 MB aparece na lista com tipo, nome, tamanho, quem e quando; os outros dois são recusados ("até 20 MB", "só PDF, PNG, JPG, XLSX ou DOCX"); a remoção pede confirmação, o anexo some da lista e a remoção fica na auditoria

**C-026 — Consulta da auditoria**
- **Dado que** aconteceram, além da atribuição inicial dos clientes de exemplo, as 2 redistribuições de Sérgio (C-014) e as 6 gravações de parâmetro de Nara (C-018)
- **Quando** Gustavo filtra a auditoria por pessoa "Sérgio", por área "Parâmetros" e por cliente 1004
- **Então** vêm 2, 6 e 2 registros (no 1004, a atribuição inicial a Bruno e a mudança para Ana), cada um com área, o que mudou, antes, depois, quem e quando; não existe na tela nem no sistema forma de editar ou apagar um registro; e Ana (agente) não acessa a auditoria

**C-027 — Navegação conforme o perfil**
- **Dado que** Ana é agente e Nara é agente e Administrador
- **Quando** cada uma entra
- **Então** as duas veem o menu por função: a operação dos módulos entregues (Crédito, Cobrança, Jurídico, Painel, Minha agenda) e os cadastros (Clientes, Contatos, Equipe, Planos de pagamento); a carteira (Privado, Estética, Público) é escolhida dentro das telas de Crédito e de Cobrança, não no menu; Nara (pela marca) e Gustavo (gerente, sem a marca) veem a administração (Parâmetros, BUs e segmentos, Feriados, Modelos de mensagem, Sincronização, Auditoria); Ana não vê nenhum item de administração

**C-028 — Posição por BU, por carteira e por faixa de atraso**
- **Dado que** o título de R$ 1.000,00 do 1001 (vencido há 12 dias) é de uma venda com 60% de itens da Nutrição e 40% da Enfermagem; o de R$ 500,00 é da Nutrição; os de R$ 2.000,00 e R$ 300,00, da Enfermagem; o de R$ 800,00, do Medicamento; o 1010 deve R$ 2.200,00 há 15 dias, de uma venda meio Estética, meio Nutrição; e o 1004 deve R$ 3.000,00 há 45 dias
- **Quando** a leitura roda
- **Então** o 1001 mostra, por BU: Nutrição com R$ 1.100,00 vencido; Enfermagem com R$ 400,00 vencido e R$ 2.300,00 a vencer; Medicamento com R$ 800,00 a vencer — somando o total do cliente, todo na carteira Privada e na faixa de 1 a 30 dias; o 1010 tem R$ 1.100,00 na carteira Estética e R$ 1.100,00 na Privada; e o 1004 tem os R$ 3.000,00 na faixa de 31 a 60 dias

**C-029 — Vencimento em dia não útil**
- **Dado que** hoje é quinta-feira, 19/11/2026; o título de R$ 1.000,00 do 1001 venceu no sábado, 07/11/2026; o de R$ 12.000,00 do 1007 (carteira Pública) venceu no domingo, 20/09/2026; e a regra padrão é "dia corrido"
- **Quando** a leitura roda com o padrão; depois o Administrador troca a regra, só da carteira Pública, para "dia útil anterior" e a leitura roda de novo; e depois troca a regra padrão para "próximo dia útil" e a leitura roda mais uma vez
- **Então** no padrão o 1001 tem 12 dias de atraso e o 1007 tem 60 (faixa de 31 a 60 dias); com "dia útil anterior" na Pública, o 1007 passa a 62 dias (vencimento em 18/09, faixa de 61 a 90) e o 1001 continua com 12; com "próximo dia útil" no padrão, o 1001 passa a 10 dias (vencimento em 09/11)

**C-030 — Tipo de cobrança que não é dívida**
- **Dado que** o 1012 tem R$ 400,00 vencido há 6 dias e R$ 300,00 vencido há 9 dias, este com o tipo de cobrança "DESD", e a lista de cobranças excluídas está vazia
- **Quando** a leitura roda; depois o Administrador põe "DESD" na lista e a leitura roda de novo
- **Então** antes, o 1012 tem R$ 700,00 vencido e 9 dias de atraso; depois, R$ 400,00 e 6 dias, e a ficha ao vivo mostra 1 título em aberto

**C-031 — Depois da leitura, as rotinas dos módulos em ordem**
- **Dado que** uma leitura acabou de terminar bem
- **Quando** o sistema faz a verificação seguinte; a rotina de um módulo falha; e outra não termina o que tinha para fazer
- **Então** as rotinas rodam em ordem (acessos aos quadros, régua de cobrança, crédito, setor público, foto mensal), cada uma sobre a leitura concluída e nunca na mesma verificação da leitura; a que falhou fica registrada com o erro, não impede as seguintes e é repetida na próxima verificação; a que não terminou continua de onde parou; a de módulo ainda não instalado é pulada; e duas verificações em menos de 4 minutos não rodam juntas

**C-032 — Planos de pagamento e faturamento mensal**
- **Dado que** hoje é 19/11/2026; o Winthor tem os planos "A VISTA" (0 dia), "30 DIAS" (30) e "28/35/42 DIAS" (35); e as 5 vendas do 1001 saíram em 20/09 (R$ 700,00, Nutrição), 08/10 (R$ 1.000,00, 60% Nutrição e 40% Enfermagem), 17/10 (R$ 500,00, Nutrição), 25/10 (R$ 2.300,00, Enfermagem) e 09/11 (R$ 800,00, Medicamento)
- **Quando** a leitura roda; e depois o plano "30 DIAS" some do Winthor e a leitura roda de novo
- **Então** a lista de planos mostra os 3, com o prazo médio de cada um; o faturamento do 1001 é R$ 700,00 da Nutrição em setembro; R$ 1.100,00 da Nutrição e R$ 2.700,00 da Enfermagem em outubro; e R$ 800,00 do Medicamento em novembro; a venda cancelada não entra; e, depois, "30 DIAS" deixa de aparecer entre os planos ativos

**C-033 — Acesso aos quadros acompanha o cargo**
- **Dado que** existem um quadro de cobrança e um do Jurídico e a equipe de exemplo
- **Quando** a rotina de acessos roda; depois Bruno é promovido a Supervisor e Carlos é inativado (já sem clientes), e a rotina roda de novo
- **Então** no de cobrança, Ana, Bruno e Carlos enxergam só os cartões em que são responsáveis, Sérgio e Silvia enxergam todos e Júlia só consulta; no do Jurídico, Sérgio, Silvia e Júlia enxergam todos; Gustavo, Diana e Nara administram os dois; depois, Bruno passa a enxergar todos e Carlos perde o acesso. Ninguém consegue excluir um cartão ("Casos não são excluídos; encerre pela etapa final."), e quem não é da equipe não move cartão nenhum

**C-034 — Conferência da equipe e dos campos do Winthor**
- **Dado que** o Administrador cadastrou Paulo (Agente) com um e-mail que ainda não tem login, e há 2 clientes sem agente
- **Quando** Gustavo abre a conferência da equipe; e o Administrador pede a conferência dos campos do Winthor
- **Então** a conferência mostra 1 membro sem usuário (Paulo), nenhum membro sem superior além do topo, nenhum ciclo e 2 clientes sem agente; a conferência do Winthor lista, tabela por tabela, os campos que o sistema lê e marca o que não existir; e Ana (agente) não consegue pedir nenhuma das duas

## Requisitos funcionais

| ID | Requisito | Critério de aceite | Prioridade |
|---|---|---|---|
| RF-001 | O sistema DEVE ler o Winthor sozinho a cada N minutos (parâmetro, padrão 15) e gravar a posição de cada cliente | Com intervalo 15, duas leituras automáticas ficam entre 15 e 20 minutos uma da outra; mudar o parâmetro para 30 vale na leitura seguinte, sem reinstalar nada (C-006) | must |
| RF-002 | A posição DEVE ter: vencido, a vencer, dias de atraso, vencimento mais antigo em aberto, próximo vencimento e seu valor, nº de títulos em aberto e vencidos, limite, utilizado, disponível, última compra, nº e valor das compras no período (parâmetro, padrão 90 dias), compra média mensal, prazo médio, pontualidade e a data e hora da leitura | Os números do C-001 batem centavo a centavo | must |
| RF-003 | O sistema DEVE guardar cada pagamento lido do Winthor uma única vez, com título, parcela, vencimento, data e valor pagos e dias de atraso no pagamento, e marcar como estornado o pagamento que o Winthor desfez | C-002: duas leituras seguidas mantêm 1 recebimento; o estorno marca e tira da conta | must |
| RF-004 | O sistema DEVE criar e atualizar o cliente a partir do Winthor (código, CPF/CNPJ, nome, fantasia, PF/PJ, UF, município, endereço, telefone, e-mail, ramo de atividade, RCA, plano de pagamento, bloqueio no Winthor) para todo cliente com título em aberto ou movimento nos últimos N meses (parâmetro, padrão 12) | C-003: 1013 entra, 1011 não, RCA do 1004 atualizado | must |
| RF-005 | Uma leitura que falha DEVE ficar registrada com a mensagem de erro e NÃO DEVE deixar cliente com posição pela metade: cada cliente fica com a posição inteira da leitura anterior ou inteira da nova, sempre com a data; ninguém é zerado por leitura que falhou | C-005 | must |
| RF-006 | Toda tela que mostra posição DEVE mostrar a data e hora da leitura e avisar quando a última leitura bem-sucedida tem mais de 2 vezes o intervalo | C-005: 31 minutos com intervalo 15 avisa; 29 não | must |
| RF-007 | Supervisor ou acima e o Administrador DEVEM poder pedir "ler agora"; o Administrador e a gerência DEVEM acompanhar as leituras (início, fim, situação, clientes lidos, novos, recebimentos novos e estornados, erro) | C-006; a lista mostra as leituras da mais recente para a mais antiga | must |
| RF-008 | Nunca DEVEM rodar duas leituras ao mesmo tempo; leitura "em andamento" parada há mais de 2 vezes o intervalo (30 minutos no padrão) é dada como falha | C-006 | must |
| RF-009 | A ficha do cliente DEVE mostrar o cadastro e a posição da última leitura (total, por BU e por carteira), os títulos em aberto lidos do Winthor naquele momento, os pagamentos dos últimos 90 dias, o agente, o analista, o grupo econômico e a ficha de contatos | C-007 | must |
| RF-010 | Quando o Winthor não responde, a parte de títulos da ficha NÃO DEVE mostrar dado antigo | C-007: mensagem e nenhum título | must |
| RF-011 | O sistema DEVE buscar cliente por nome ou fantasia (sem diferença de acento e maiúscula), CPF/CNPJ com ou sem pontuação e código do Winthor, com filtros de setor, carteira, BU, agente, "sem agente", UF, tipo de pessoa, "só em atraso" e situação da ficha de contatos, paginado com total | C-008 | must |
| RF-012 | Gerente, Diretoria e Administrador DEVEM poder buscar no Winthor, pelo código ou pelo CPF/CNPJ, um cliente que ainda não está no sistema e ver o cadastro dele | Busca pelo 1011 traz o cliente com a marca "fora do sistema"; a ficha abre sem posição | should |
| RF-013 | Gerente, Diretoria e Administrador DEVEM poder cadastrar membro da equipe com nome, e-mail de login, cargo, superior, marca de Administrador e situação (ativo/inativo); só quem tem a marca de Administrador a dá ou tira | Cadastro aceito aparece na equipe do superior; C-019 | must |
| RF-014 | A hierarquia DEVE ter um único topo; todos os demais membros ativos têm superior ativo de cargo Supervisor, Gerente ou Diretoria; sem ciclo; nome e e-mail únicos | C-011: seis recusas com seis motivos (inclui manter ao menos um Administrador, RN-011) | must |
| RF-015 | Gerente, Diretoria e Administrador DEVEM poder trocar o topo por um membro de Diretoria, numa única operação | C-012 | should |
| RF-016 | Membro NÃO DEVE ser apagado, só inativado; a inativação é recusada enquanto ele tiver cliente atribuído ou subordinado ativo | C-013 | must |
| RF-017 | O sistema DEVE mostrar a equipe a todos os perfis, com a direção no topo e uma coluna por supervisor com os agentes e o total de clientes de cada um | Equipe de exemplo: direção com Diana e Gustavo; equipe de Sérgio com Ana, Bruno, Rita e Otávio (inativo); equipe de Silvia com Carlos; Júlia e Nara direto com Gustavo | must |
| RF-018 | Quem entra sem ser membro ativo da equipe DEVE ser recusado em toda leitura e gravação | C-010 | must |
| RF-019 | Toda lista, contagem, ficha e ação sobre cliente DEVE respeitar a visibilidade pela hierarquia, decidida pelo sistema e não pela tela | C-009; C-007 (Ana não abre o 1006) | must |
| RF-020 | Supervisor, Gerente, Diretoria e Administrador DEVEM poder atribuir e redistribuir clientes, um a um ou em lote de até 20, só entre clientes e membros dentro do que enxergam | C-014 | must |
| RF-021 | O sistema DEVE listar os clientes sem agente para quem pode atribuí-los | 2 (1003, 1009); cliente novo da leitura entra sem agente: 3 (C-003) | must |
| RF-022 | O sistema DEVE manter um catálogo único de parâmetros, em que cada módulo registra os seus, com rótulo, unidade, padrão, limites e quem usa, já carregado com os padrões; a base registra os do Anexo A | Os 38 parâmetros da base, em 4 grupos, com os padrões do Anexo A; parâmetro de outro módulo instalado aparece no mesmo catálogo, sem chave repetida | must |
| RF-023 | Gerente, Diretoria e Administrador DEVEM poder gravar o valor padrão ou o valor próprio de uma carteira (Estética ou Pública), com data de início de vigência, um ou vários parâmetros de uma vez | C-015, C-016, C-017 | must |
| RF-024 | O valor em vigor DEVE ser: o da carteira, se ela tiver valor próprio, senão o padrão (que é o valor da carteira Privada); em cada um, o de vigência mais recente até a data consultada | C-015, C-016 | must |
| RF-025 | O sistema DEVE recusar gravação de parâmetro que quebre as validações da RN-016, citando o motivo, sem gravar nada do lote | C-017 | must |
| RF-026 | O sistema DEVE oferecer "Restaurar padrão" por parâmetro e por grupo | C-018 | must |
| RF-027 | O sistema DEVE mostrar o histórico de vigências de cada parâmetro e quem gravou cada uma | C-016: 2 vigências | should |
| RF-028 | Gerente, Diretoria e Administrador DEVEM cadastrar BUs com nome e carteira (Privada ou Estética); nascem Nutrição, Enfermagem e Medicamento (Privada) e Estética (Estética) | BU nova aparece no filtro de clientes; BU nunca é apagada, só inativada | must |
| RF-029 | Supervisor ou acima DEVE poder informar o grupo econômico do cliente e, quando o ramo não a define, a esfera do órgão público (municipal, estadual, federal); a leitura do Winthor NÃO DEVE desfazer o que foi informado | C-020 | must |
| RF-030 | O sistema DEVE derivar do Winthor, a cada leitura, a BU de cada título (pelo departamento dos itens da venda) e o setor do cliente (pelo ramo de atividade); pessoa física segue o setor privado | C-020, C-028 | must |
| RF-031 | Gerente, Diretoria e Administrador DEVEM cadastrar feriados com data, nome e abrangência (nacional, estadual com UF, municipal com UF e município) e gerar os nacionais de um ano | C-021: 13 nacionais em 2026 | must |
| RF-032 | O sistema DEVE responder, para uma localidade: se uma data é dia útil (e por quê não é), e qual a data N dias úteis depois | C-021 | must |
| RF-033 | O sistema DEVE manter a ficha de contatos do cliente: nome, área, função, telefone, WhatsApp, e-mail, situação, observação, principal, atualizado por e em; e listar os contatos de todos os clientes que a pessoa enxerga, com busca por nome, telefone e e-mail | C-022 | must |
| RF-034 | O sistema DEVE mostrar a situação da ficha (em dia, vencida, nunca atualizada) pelo prazo do parâmetro de validade (padrão 180 dias), e permitir "revisada sem alteração" | C-022; revisar sem alterar renova a data | must |
| RF-035 | Gerente, Diretoria e Administrador DEVEM poder editar o assunto e o corpo dos modelos de mensagem que cada módulo entrega; o sistema guarda código, nome, marca de efeito legal, versão e validação (por quem, em que data, de qual versão). Modelo com efeito legal é validado pelo Jurídico ou por Gerente para cima (P-06) | C-023 | must |
| RF-036 | O sistema DEVE mostrar a pré-visualização do modelo com os dados de um cliente escolhido | Pré-visualização do aviso do C-023 com o 1001 mostra o texto do C-024 | should |
| RF-037 | O sistema DEVE enviar e-mail a partir de um modelo para o contato principal do cliente (ou outro contato da ficha escolhido, ou um endereço informado por quem pede), e registrar todo envio com o texto final e o resultado | C-024 | must |
| RF-038 | A ficha do cliente DEVE listar os e-mails enviados a ele, do mais recente ao mais antigo | Depois do C-024, a ficha do 1001 lista 1 e-mail | must |
| RF-039 | O sistema DEVE anexar arquivo a um cliente (e, a pedido das specs 005 e 007, a uma certidão da empresa e a um material de apoio), com tipo de documento, e listar, abrir e remover com confirmação | C-025 | must |
| RF-040 | Toda gravação desta base DEVE gerar registro de auditoria com área, o que mudou, antes, depois, quem e quando | C-014, C-018: um registro por campo mudado | must |
| RF-041 | Gerente, Diretoria e Administrador DEVEM consultar a auditoria por área, pessoa, cliente e período, paginada; nenhum perfil edita ou apaga registro | C-026 | must |
| RF-042 | O sistema DEVE ter entrada pelo login e menu por função (operação, cadastros, administração), com a carteira escolhida dentro das telas de Crédito e de Cobrança, e a administração visível só para quem pode usá-la | C-027; itens das specs ainda não entregues não aparecem | must |
| RF-043 | O sistema DEVE gravar a posição também por cliente × BU e por cliente × carteira, com o saldo separado em a vencer e nas faixas de atraso de 1 a 30, 31 a 60, 61 a 90, 91 a 180 e acima de 180 dias, calculadas título a título | C-028 | must |
| RF-044 | Gerente, Diretoria e Administrador DEVEM ligar cada departamento do Winthor a uma BU; departamento novo aparece sozinho numa lista "sem BU" | C-020: o departamento 90 aparece sem BU e, ligado, passa a contar na BU na leitura seguinte | must |
| RF-045 | O sistema DEVE listar os planos de pagamento do Winthor (código, descrição, prazo médio), só para leitura (P-13) | C-032 | must |
| RF-046 | O sistema DEVE guardar o faturamento mensal de cada cliente por BU, lido do Winthor, desde janeiro do ano anterior | C-032 | must |
| RF-047 | Depois de cada leitura concluída, o sistema DEVE acionar em ordem as rotinas dos módulos instalados; falha de uma não impede as outras | C-031 | must |
| RF-048 | O acesso de cada pessoa aos quadros DEVE acompanhar o cargo sem ação manual, em até uma verificação | C-033 | must |
| RF-049 | Gerente, Diretoria e Administrador DEVEM ter uma conferência da equipe: membros sem usuário, sem superior, ciclos e clientes sem agente | C-034 | should |
| RF-050 | Gerente, Diretoria e Administrador DEVEM poder conferir se os campos que o sistema lê existem no Winthor | C-034 | should |

## Requisitos não-funcionais

| ID | Requisito | Como se mede |
|---|---|---|
| RNF-001 | Uma leitura completa do Winthor, com o volume real, termina dentro do intervalo entre leituras | Tempo e volume medidos no ambiente da plataforma e registrados |
| RNF-002 | A lista de clientes responde em até 2 s com 20.000 clientes | Cronômetro com massa de teste de 20.000 clientes |
| RNF-003 | Os títulos ao vivo da ficha respondem em até 3 s | Cronômetro contra o Winthor real |
| RNF-004 | Nenhuma tela faz leitura repetida sozinha em menos de 60 s | Inspeção das chamadas feitas por cada tela aberta |
| RNF-005 | O sistema não grava nada no Winthor | Nenhuma operação de escrita apontada para o Winthor existe no sistema |
| RNF-006 | Abrir uma tela custa no máximo 6 chamadas ao servidor; uma ação de gravação, no máximo 12; uma verificação da rotina, no máximo 150 | Contagem automática das chamadas nos testes |

## Entidades do domínio

- **Cliente** — quem compra da Benenutri, identificado pelo código do
  Winthor. Cadastro e setor vêm do Winthor; agente de cobrança, grupo
  econômico e esfera são do sistema.
- **Título** — parcela a receber de uma venda, no Winthor. Não é copiado:
  é lido ao vivo na ficha e resumido na posição.
- **Posição** — o resumo financeiro na última leitura: uma por cliente, uma
  por cliente × BU e uma por cliente × carteira; sempre com a data da leitura.
- **Recebimento** — um pagamento de título lido do Winthor. Uma vez só; pode
  ser estornado.
- **Faturamento mensal** — o que o cliente comprou em cada mês, por BU.
- **Plano de pagamento** — condição de prazo do Winthor.
- **Leitura do Winthor** — cada rodada da sincronização, com início, fim,
  situação e contagens. Depois dela vêm as **rotinas dos módulos**.
- **Membro da equipe** — pessoa com login, cargo, superior e marca de
  Administrador. Forma a hierarquia, que define a visibilidade.
- **Atribuição** — os clientes de que um membro é o agente de cobrança.
- **BU** — unidade de negócio. É do item comprado, não do cliente: cada
  **departamento** do Winthor é ligado a uma BU. Um cliente pode ter saldo em
  várias BUs.
- **Carteira** — Privada, Estética ou Pública. A BU diz se o saldo é da
  Privada ou da Estética; o saldo de cliente do setor público é sempre da
  Pública. É por carteira que um parâmetro pode ter valor próprio.
- **Setor** — privado ou público, do cliente, pelo ramo de atividade.
- **Parâmetro** — número ou texto da Política, com padrão, valor por carteira
  e vigências, registrado no catálogo pelo módulo dono.
- **Feriado** — data não útil de uma abrangência (nacional, estadual,
  municipal).
- **Contato do cliente** — pessoa ou canal do cliente para cobrança e
  comunicação. A **ficha de contatos** é o conjunto deles, com data de revisão.
- **Modelo de mensagem** — texto com campos, versionado, entregue pelo módulo
  que o usa.
- **E-mail enviado** — o registro de cada envio, com o texto final.
- **Anexo** — arquivo ligado a um cliente, a uma certidão ou a um material.
  Documento de um caso (cobrança, crédito, processo) fica no cartão do quadro.
- **Registro de auditoria** — o que mudou, antes, depois, quem e quando.
  Gerado, nunca digitado.

## Regras de negócio

**Posição e Winthor**

- **RN-001** — Título em aberto é o que não tem data de pagamento e tem saldo
  (valor menos valor pago) maior que zero. Título cancelado, estornado ou
  baixado por desdobramento não é dívida e não entra em nenhuma conta (como o
  Winthor marca cada caso é conferido na instalação, P-05). Também fica fora o
  título cujo tipo de cobrança está na lista de cobranças excluídas (parâmetro;
  padrão vazia, P-16).
- **RN-002** — Vencido é o título em aberto com vencimento anterior a hoje.
  Título que vence hoje é "a vencer" (e é o próximo vencimento). Vencimento em
  dia não útil segue o parâmetro (P-15): "dia corrido" (padrão) conta do
  vencimento; "próximo dia útil" e "dia útil anterior" trocam o vencimento pela
  data útil correspondente. O parâmetro aceita valor por carteira.
- **RN-003** — Dias de atraso = dias corridos entre o vencimento (já ajustado
  pela RN-002) do título vencido **mais antigo** ainda em aberto e hoje. Sem
  título vencido, 0. (O artefato guardava o maior atraso digitado ou importado;
  aqui ele é sempre calculado dos títulos.)
- **RN-004** — Próximo vencimento = a menor data de vencimento, de hoje em
  diante, entre os títulos em aberto; o valor dele é a soma dos títulos em
  aberto nessa data.
- **RN-005** — Utilizado = vencido + a vencer. Disponível = limite − utilizado,
  e pode ser negativo (limite excedido). Pedido ainda não faturado não entra.
- **RN-006** — Compras no período = vendas faturadas distintas (cada venda conta
  uma vez, qualquer que seja o número de parcelas) emitidas nos últimos N dias
  (parâmetro, padrão 90), e a soma dos seus títulos; título cancelado não
  conta. Última compra = data da última venda segundo o Winthor.
- **RN-007** — Um pagamento é identificado pelo título, pela parcela e pela data
  do pagamento: lido de novo, não duplica. Pagamento que some do Winthor depois
  de lido é marcado como estornado e deixa de contar. Dias de atraso no
  pagamento = data do pagamento − vencimento (0 se pago até o vencimento).
- **RN-008** — Cliente que deixou de ter título em aberto tem a posição zerada
  na leitura seguinte (total, por BU e por carteira). Ninguém precisa "zerar"
  ninguém.
- **RN-009** — Se a leitura do Winthor falha, ninguém é zerado, nenhum cliente
  fica com posição pela metade e as rotinas dos módulos não rodam sobre ela.
  Posição é sempre mostrada com a data da leitura que a produziu.
- **RN-010** — A leitura atualiza só o que vem do Winthor (cadastro, setor,
  posição). Agente, grupo econômico, esfera informada à mão e ficha de contatos
  são do sistema e a leitura nunca os altera.

**Equipe, acesso e visibilidade**

- **RN-011** — Hierarquia: exatamente um topo ativo; todo outro membro ativo tem
  um superior ativo de cargo Supervisor, Gerente ou Diretoria; nenhum membro é
  superior de si mesmo direta ou indiretamente; nome único sem diferença de
  maiúscula, acento e espaços repetidos; e-mail de login único. Não se exige um
  Gerente na equipe (o artefato exigia): basta o topo. O último membro ativo
  com a marca de Administrador não a perde nem é inativado (sem ninguém com a
  marca, ninguém mais poderia concedê-la).
- **RN-012** — Visibilidade: agente e analista veem os clientes de que são o
  agente ou o analista; supervisor, os seus e os de todos os subordinados
  diretos e indiretos; gerente, diretoria e administrador, todos (inclusive os
  sem agente); jurídico, só os clientes com processo ativo, para leitura.
  Cliente ainda atribuído a um membro inativo continua visível para quem está
  acima dele. Cliente que a pessoa não enxerga é respondido como inexistente.
- **RN-013** — A identidade é o login. Quem não é membro ativo não lê nem grava
  nada; o sistema nunca aceita "quem sou eu" informado pela tela.
- **RN-014** — Redistribuir: só Supervisor, Gerente, Diretoria ou Administrador;
  o cliente precisa estar no que o ator enxerga; o destino precisa ser membro
  ativo de cargo Agente, Supervisor ou Gerente e estar no que o ator enxerga
  (ele mesmo ou abaixo dele); cliente sem agente só é atribuído, e cliente só
  fica sem agente, por quem vê tudo. Até 20 clientes por vez. Cada cliente
  movido gera um registro de auditoria.

**Parâmetros**

- **RN-015** — Valor em vigor de um parâmetro numa data, para uma carteira: a
  vigência mais recente até a data com valor próprio da carteira; se a carteira
  não tem valor (ou o valor foi removido), a vigência mais recente até a data
  no padrão. O padrão é o valor da carteira Privada. Gravar na mesma data de
  início de uma vigência existente substitui aquela vigência; data nova cria
  vigência nova; o histórico não se perde.
- **RN-016** — Validações ao gravar (sobre o conjunto em vigor da carteira
  depois de aplicado o lote inteiro, combinando valores da carteira e do
  padrão; ou grava tudo, ou nada):
  - valor obrigatório e do tipo do parâmetro (inteiro, decimal, percentual de 0
    a 100, valor em reais ≥ 0, rating AA/A/B/C/D/E, texto, lista, opção, data),
    dentro do mínimo e do máximo do catálogo; vazio nunca vira 0;
  - criticidade: o alerta é estritamente mais brando que o crítico (atraso,
    uso do limite e prazo médio: alerta < crítico; pontualidade e score:
    alerta > crítico; rating de alerta melhor que o crítico);
  - PDD: de 0 a 100 e sem diminuir da faixa "a vencer" até "acima de 180 dias";
  - leitura do Winthor: intervalo múltiplo de 5, de 5 a 120 minutos; janela de
    1 a 36 meses; compras de 30 a 365 dias; pontualidade de 1 a 36 meses;
  - setor público: a lista de ramos e o prefixo do nome do ramo não podem
    ficar vazios ao mesmo tempo;
  - comunicação: telefone e assinatura não vazios, e-mail válido;
  - as regras dos grupos dos outros módulos (régua, alçadas, limites, metas)
    são declaradas pela spec dona de cada grupo e conferidas neste mesmo ponto.
- **RN-017** — Restaurar padrão grava o padrão do catálogo como nova vigência a
  partir de hoje: o histórico continua mostrando o que valeu antes.

**Carteira, BU, feriados e dias úteis**

- **RN-018** — Setor do cliente: público se o código do ramo de atividade está
  na lista de ramos públicos (parâmetro, padrão 11 a 15) **ou** o nome do ramo
  começa pelo prefixo de órgão público (parâmetro, padrão "ORGAO PUBLICO");
  senão, privado. Pessoa física é tipo de pessoa, não setor. Carteira de um
  saldo: Pública se o cliente é do setor público, qualquer que seja a BU;
  senão, a carteira da BU (Estética ou Privada); saldo sem BU, Privada.
- **RN-019** — Dia útil numa localidade (UF e município): não é sábado, nem
  domingo, nem feriado nacional, nem feriado da UF, nem feriado do município.
  N dias úteis depois de uma data: avança dia a dia contando só os úteis; com
  N = 0, a própria data se for útil, senão o próximo dia útil (o artefato
  devolvia a data sem ajustar). A localidade padrão da empresa é um parâmetro
  (padrão DF).
- **RN-020** — Feriados nacionais gerados por ano: 01/01, 21/04, 01/05, 07/09,
  12/10, 02/11, 15/11, 20/11, 25/12, Carnaval (segunda e terça, 48 e 47 dias
  antes da Páscoa), Sexta-feira Santa (2 antes) e Corpus Christi (60 depois) —
  13 por ano. Gerar de novo não duplica; o Administrador pode remover um
  gerado (ex.: se a empresa trabalha no Carnaval).

**Contatos, modelos e e-mail**

- **RN-021** — Ficha de contatos: cada contato tem telefone, WhatsApp ou e-mail;
  e-mail no formato nome@domínio.ext; exatamente um principal (o primeiro
  contato gravado vira principal; marcar outro desmarca o anterior), e o
  principal não pode estar como "Não usar mais". Contato não é apagado: quem
  sai fica "Não usar mais". Situação da ficha: "nunca atualizada" se nunca foi
  gravada ou revisada; "vencida" se a última revisão tem mais dias que o
  parâmetro de validade (180); senão "em dia". Gravar um contato ou marcar
  "revisada sem alteração" renova a revisão com quem e quando; o contato que
  não mudou mantém a própria data de atualização.
- **RN-022** — Modelo: só aceita os campos da lista comum (Anexo B) e os campos
  extras declarados no próprio modelo; campo desconhecido recusa a gravação.
  Toda edição de assunto ou corpo sobe a versão. Modelo com efeito legal só
  pode ser enviado se a validação registrada for da versão atual e tiver menos
  de N meses (parâmetro, padrão 12). Valida quem é do Jurídico ou tem nível de
  Gerente para cima (parâmetro; padrão provisório, P-06). Todo modelo com
  efeito legal nasce "não validado".
- **RN-023** — E-mail: o destinatário é o endereço informado por quem pede; sem
  ele, o contato escolhido; sem ele, o contato principal com e-mail; sem ele, o
  primeiro contato com e-mail; sem nenhum, o envio é recusado e nada sai. Todo
  campo do texto precisa ter valor, senão o envio é recusado citando o campo.
  Todo envio tentado é registrado com o texto final, o modelo, a versão, quem
  e quando, e o resultado informado pelo serviço de e-mail ("enviado" ou
  "falhou" com o erro) — nunca "enviado" sem confirmação. Só envia quem
  enxerga o cliente. Todo e-mail sai com a mesma identidade visual da empresa.

**Anexos e auditoria**

- **RN-024** — Anexo: PDF, PNG, JPG, XLSX ou DOCX, até 20 MB, com tipo de
  documento. Só anexa quem enxerga o cliente; remove quem anexou ou Supervisor
  para cima. Remover tira da lista e grava a auditoria; o arquivo não é
  destruído.
- **RN-025** — Registro de auditoria não se edita nem se apaga pelo sistema.
  Leitura automática do Winthor não gera um registro por posição: tem o
  próprio registro de leituras (RF-007).
- **RN-026** — "Hoje" é a data de Brasília. Às 23h30 de 14/11/2026 em Brasília
  (02h30 de 15/11 em UTC), hoje ainda é 14/11/2026.
- **RN-027** — Parâmetro é exibido na sua unidade: reais com 2 casas
  (R$ 65.492,11), percentual com até 2 casas (0,5%), dias e quantidades
  inteiros (D+4, 180 dias), fator com 1 casa (1,2).

**BU do título, faixas, rotinas e quadros**

- **RN-028** — BU de um título: o saldo é repartido entre as BUs na proporção
  do valor dos itens da venda que o gerou (cada item pertence ao departamento
  do produto, e cada departamento a uma BU). Item de departamento sem BU e
  título sem venda (lançamento avulso) ficam em "Sem BU". A sobra do
  arredondamento vai para a última parte.
- **RN-029** — Faixa de atraso é de cada título, não do cliente: um cliente com
  um título vencido há 12 dias e outro há 45 tem saldo em duas faixas. A soma
  das faixas é o vencido; vencido + a vencer é o saldo total.
- **RN-030** — Compra média mensal = valor das compras do período ÷ (dias do
  período ÷ 30). Prazo médio = média, ponderada pelo valor, dos dias entre a
  emissão e o vencimento dos títulos emitidos no período; sem título, o prazo
  do plano. Pontualidade = parte do valor pago nos últimos N meses (parâmetro,
  padrão 12) que foi paga até o vencimento, sem estornados; sem pagamento no
  período, não há pontualidade (não é 0%).
- **RN-031** — Rotinas depois da leitura: ordem fixa (acessos, régua, crédito,
  setor público, foto mensal); só sobre leitura concluída e nunca na mesma
  verificação dela; repetir uma rotina não duplica nada; a que falha não
  impede as seguintes e é repetida; cada uma roda completa ao menos uma vez
  por dia, mesmo sem posição nova.
- **RN-032** — Quadros: o acesso segue o cargo (agente e analista veem os
  cartões em que são responsáveis; supervisor, gerente e diretoria, todos os
  de cobrança, de crédito e do Jurídico (mover à mão no do Jurídico continua
  só do Jurídico); o Jurídico consulta os de cobrança e trabalha no seu; Gerente, Diretoria e o Administrador administram todos). Nenhum caso é excluído. Quem não é
  da equipe não move cartão.

## Testes

| Cenário / regra | Evidência automática exigida | Camada |
|---|---|---|
| C-001 · RN-001 · RN-003 · RN-004 · RN-005 · RN-006 · RN-030 | 1001 com os 7 títulos do cenário (incluindo o cancelado), limite 10.000 → vencido 1.500,00; a vencer 3.100,00; dias 12; vencimento mais antigo = hoje−12; próximo = hoje+5 com 2.300,00; títulos em aberto 5, vencidos 2; utilizado 4.600,00; disponível 5.400,00; compras 5 / 5.300,00; última compra hoje−10; compra média 1.766,67; prazo médio 30; pontualidade 0,00; 1005 (sem pagamento no período) sem pontualidade | regra de negócio |
| RN-002 | 1005 com um único título de 600,00 vencendo hoje → vencido 0,00; dias 0; a vencer 600,00; próximo = hoje com 600,00 | regra de negócio |
| C-002 · RN-007 | Duas leituras → 1 recebimento de 700,00 com 2 dias de atraso; 500,00 pago → 2 recebimentos e vencido 1.000,00; estorno do 700,00 → recebimento estornado fora da lista, vencido 1.700,00, dias 30 | regra de negócio |
| C-003 · RN-010 | Antes: 11 clientes; 1013 novo no Winthor + leitura → 12; 1013 sem agente; 1004 com RCA 11 e agente Bruno; 1011 ausente; sem agente 2 → 3 | regra de negócio |
| C-004 · RN-008 | 1002 de 2.500,00 / 8 dias → depois do pagamento e da leitura: 0,00 / 0 / a vencer 0,00 / próximo vencimento vazio, no total, na BU Nutrição e na carteira Privada | regra de negócio |
| C-005 · RN-009 | Winthor indisponível → leitura "erro" com mensagem não vazia; 1001 continua 1.500,00 e com a data da leitura anterior; nenhuma rotina de módulo registrada para essa leitura | regra de negócio |
| C-005 · RF-006 | Última leitura ok há 31 min, intervalo 15 → "desatualizada"; há 29 min → "atual"; nenhuma → "nunca lida" | regra de tela |
| C-006 · RF-008 | Intervalo 15: última há 10 min → não lê; há 16 → lê; pedido de Sérgio com 10 min → lê; segundo pedido com um pendente → recusado; pedido de Ana → recusado; "em andamento" há 40 min → marcada como falha e nova leitura feita; leitura interrompida por falta de tempo → continua do ponto em que parou e termina com os mesmos números; a lista de leituras vem da mais recente para a mais antiga; intervalo mudado para 30 → há 16 min não lê, há 31 lê (RF-001) | regra de negócio |
| C-007 · RF-010 | Ana, 1001 → CNPJ 12345678000190, limite 10.000, plano "28/35/42 DIAS", RCA "CARLOS LIMA", 3 linhas por BU e 1 por carteira, 5 títulos com atraso 12 e 3 nos vencidos e a BU de cada um; Winthor indisponível → "Não foi possível consultar o Winthor agora." e 0 títulos, com a posição mantida; Ana, 1006 → "Cliente não encontrado."; outro módulo pedindo os títulos do 1001 em nome de Ana → os mesmos 5; em nome de Silvia → "Cliente não encontrado." | regra de negócio |
| RF-012 | Gustavo busca o 1011 pelo código ou pelo CNPJ 10.110.000/0001-10 → cadastro do Winthor ("CLIENTE SEM MOVIMENTO LTDA") com a marca "fora do sistema" e sem posição; Sérgio e Ana → "Cliente não encontrado." | regra de negócio |
| C-008 | "SAO LUCAS", "12345678000190" e "1001" → 1001 nas três; busca vazia de Ana → 3 linhas, total 3; "só em atraso" de Ana → 3; "sem agente" de Gustavo → 2; totais de Gustavo: 11 clientes, vencido 27.400,00, a vencer 5.600,00, 8 em atraso, maior atraso 60 | regra de negócio |
| C-008 | "12.345.678/0001-90" → "12345678000190"; "12345678000190" → "12.345.678/0001-90"; "12345678901" → "123.456.789-01"; "são lucas" → "SAO LUCAS" | regra de tela |
| C-009 · RN-012 | Lista e total: Ana 3, Bruno 3, Carlos 2, Silvia 2, Sérgio 7, Gustavo 11, Diana 11, Nara 11, Júlia 0, Rita 0; a mesma conta feita pela regra em memória dá o mesmo resultado para os 11 clientes × 10 pessoas | regra de negócio |
| C-010 · RN-013 | Visitante e Otávio: "quem sou eu" vazio; lista de clientes 0; gravação recusada com "não faz parte da equipe"; gravação tentada por fora da tela não altera nada | regra de negócio |
| C-011 · RN-011 | Seis tentativas recusadas com "nome", "topo", "Supervisor, Gerente ou Diretoria", "ciclo", "e-mail", "ao menos um Administrador"; a equipe segue com 11 membros | regra de negócio |
| C-011 · RF-017 | Lista plana da equipe de exemplo → direção [Diana, Gustavo]; equipe de Sérgio [Ana, Bruno, Rita, Otávio inativo] com 7 clientes; equipe de Silvia [Carlos] com 2; diretos de Gustavo [Júlia, Nara] | regra de tela |
| C-012 | Troca de topo para Roberto → Roberto sem superior, Diana com superior Roberto, 1 membro sem superior; os demais com o mesmo superior de antes; contagens do C-009 inalteradas | regra de negócio |
| C-013 | Inativar Bruno → recusado com "3 clientes"; Sérgio → "3 subordinados"; depois de redistribuir → Bruno inativado | regra de negócio |
| C-014 · RN-014 | Ana 5, Bruno 1, 2 auditorias (Bruno → Ana, por Sérgio); 1006 e destino Carlos → recusados; Ana → recusada; Gustavo atribui 1009 → Carlos 3; Sérgio tentando deixar o 1004 sem agente → recusado; 21 clientes numa chamada → recusado | regra de negócio |
| C-015 · RN-015 | Estética 45 com valor próprio; Privada 30 e Pública 30 pelo padrão; valor da Estética removido → 30 | regra de negócio |
| C-016 · RN-015 | Valor em 2026-11-19 = 5.2; em 2027-01-02 = 5.4; histórico com 2 vigências; 2 registros de auditoria | regra de negócio |
| C-017 · RN-016 | As 7 gravações do cenário recusadas com o motivo; mais: lista de ramos públicos e prefixo vazios juntos → recusado; lote "alerta 40 + crítico 50" aceito nas duas ordens; lote "alerta 40 + intervalo 7" não grava nenhum; depois das recusas, o valor em vigor de cada um é o anterior; os 38 parâmetros da base no padrão do Anexo A | regra de negócio |
| C-018 · RN-017 | crítico 30 → 35 → restaurar → 30, com 2 auditorias (por Nara); grupo Criticidade restaurado → 90 e 1, mais 4 auditorias (6 no total); histórico do crítico com 2 vigências (a original e a de hoje com 30: a de 35, do mesmo dia, foi substituída e fica só na auditoria) | regra de negócio |
| C-019 | Ana: parâmetro, membro, feriado, BU, departamento e modelo → 6 recusas com "Gerente, Diretoria ou Administrador"; Sérgio: parâmetro → recusa; Gustavo (gerente, sem a marca): as 6 aceitas; Nara (agente com a marca): parâmetro aceito; gravação tentada por fora da tela não altera nada; Gustavo dando a marca a Bruno → recusado com "só quem tem a marca"; Nara dando a marca → aceito | regra de negócio |
| C-020 · RN-018 | 1007 público e com 12.000,00 na carteira Pública, BU Nutrição; 1012 privado, pessoa física; 200,00 do 1008 em "Sem BU" na Privada e departamento 90 na lista sem BU; depois de ligado → 200,00 na Enfermagem; grupo "REDE ALFA" mantido após a leitura; lista de ramos "11,12" → 1007 ainda público (prefixo); lista "11,12" e prefixo "XYZ" → 1007 privado, saldo na carteira Privada; BU nova aparece na lista e, inativada, continua nela como inativa; Silvia (supervisora de outra equipe) informando o grupo do 1008 → "Cliente não encontrado." | regra de negócio |
| C-021 · RN-019 · RN-020 | 13/11/2026 + 1 útil = 16/11; 19/11 + 1 = 23/11; 17/02/2026 não útil ("Carnaval"); 15/11/2026 + 0 = 16/11; 30/11/2026 não útil no DF e útil em GO; gerar 2026 duas vezes → 13 nacionais, incluindo 16/02, 17/02, 03/04 e 04/06; feriado removido some da conta | regra de negócio |
| C-021 · RN-019 | Os mesmos casos de dia útil, pela regra de tela, dão o mesmo resultado | regra de tela |
| C-022 · RN-021 | Ficha do 1001 gravada → 2 contatos, Marta principal, situação "em dia", revisada por Ana; recusas com "telefone, WhatsApp ou e-mail" e "e-mail inválido"; Recepção principal → Marta não; principal "Não usar mais" → recusado; 1002 "vencida" e 1004 "nunca" na lista; "revisada sem alteração" no 1002 → "em dia" e a data do contato inalterada; lista de contatos de Ana com busca "marta" → 1 | regra de negócio |
| C-023 · RN-022 | Aviso versão 1 → 2; [XYZ] recusado citando "XYZ"; notificação: envio recusado sem validação; Ana valida → recusada; Júlia valida → envio aceito; editada → versão 2, envio recusado de novo; validação datada de 13 meses atrás → envio recusado | regra de negócio |
| C-024 · RN-023 | Envio ao 1001 → 1 registro "enviado" para marta@hsl.com.br com corpo "Prezado(a) Marta, o valor de R$ 1.500,00 venceu em dd/mm/aaaa." (hoje−12); 1010 → recusado com "Sem e-mail cadastrado", 0 envios ao serviço; modelo com data limite sem valor → recusado citando o campo; falha do serviço → registro "falhou" com o erro; Ana envia ao 1006 → recusado; pré-visualização = corpo enviado; ficha do 1001 lista os e-mails, o mais recente primeiro | regra de negócio |
| C-025 · RN-024 | PDF 5 MB → listado; 25 MB → "20 MB"; .exe → "PDF, PNG, JPG, XLSX ou DOCX"; remoção por Ana → lista vazia e 1 auditoria; Bruno tentando remover anexo de cliente que não é dele → recusado | regra de negócio |
| C-025 | Arquivo de 25 MB e arquivo .exe são barrados antes do envio, com as mesmas mensagens | regra de tela |
| C-026 · RN-025 | Filtros: Sérgio → 2; Parâmetros → 6; cliente 1004 → 2 (atribuição inicial e redistribuição); Ana → nada; nenhuma função do sistema altera ou apaga registro de auditoria | regra de negócio |
| C-026 | 8 registros (2 redistribuições num dia, 6 gravações de parâmetro no dia seguinte) → 2 grupos por dia com a frase de cada registro; os mesmos 8 → 5 grupos por item alterado (2 clientes e 3 parâmetros), cada um com a sua sequência | regra de tela |
| C-027 · RF-042 | Ana: cadastros + operação dos módulos entregues, nenhum item de administração; Nara: + os 6 de administração; Gustavo: + os 6 de administração; item de módulo não entregue não aparece; item que o módulo esconde do perfil não aparece; só os grupos Operação, Cadastros e Administração | regra de tela |
| C-028 · RN-028 · RN-029 | 1001 por BU: Nutrição vencido 1.100,00; Enfermagem vencido 400,00 e a vencer 2.300,00; Medicamento a vencer 800,00; carteira Privada 1.500,00 / 3.100,00; faixa 1–30 = 1.500,00; 1010: Estética 1.100,00 e Privada 1.100,00; 1004: faixa 31–60 = 3.000,00; rateio de 100,00 em três partes iguais → 33,33 + 33,33 + 33,34 | regra de negócio |
| C-029 · RN-002 | Padrão: 1001 com 12 dias, 1007 com 60 dias e 12.000,00 na faixa 31–60; "dia útil anterior" só na Pública → 1007 com 62 dias, vencimento 2026-09-18, faixa 61–90, 1001 com 12; "próximo dia útil" no padrão → 1001 com 10 dias, vencimento 2026-11-09 | regra de negócio |
| C-030 · RN-001 | 1012: lista vazia → 700,00 e 9 dias; lista "DESD" → 400,00 e 6 dias; títulos ao vivo: 2 → 1 | regra de negócio |
| C-031 · RN-031 | Leitura ok → verificação seguinte roda acessos; rotina substituída por uma que falha → registrada com erro, a seguinte roda, e a que falhou roda de novo na próxima verificação; rotina com pendência → continua; módulo não instalado → pulado sem erro; segunda verificação em menos de 4 min → não roda nada; verificação de leitura não roda rotina de módulo; uma verificação gasta no máximo 150 chamadas | regra de negócio |
| C-032 | 3 planos com prazos 0, 30 e 35; faturamento do 1001: 2026-09 Nutrição 700,00; 2026-10 Nutrição 1.100,00 e Enfermagem 2.700,00; 2026-11 Medicamento 800,00; plano removido do Winthor → fora dos ativos | regra de negócio |
| C-033 · RN-032 | Quadros de teste semeados antes da primeira verificação; no de cobrança: Ana, Bruno, Carlos e Rita restritos, Sérgio e Silvia membros, Júlia leitora; no do Jurídico: Sérgio, Silvia e Júlia membros; Gustavo, Diana e Nara administradores de todos; Bruno promovido → membro; Carlos inativado → sem acesso; excluir cartão → recusado com "Casos não são excluídos"; visitante movendo cartão → recusado com "Usuário sem vínculo na equipe." | regra de negócio |
| C-034 | Conferência da equipe por Gustavo → 1 sem usuário (Paulo), 0 sem superior, 0 ciclos, 2 clientes sem agente; por Ana → recusada; conferência do Winthor por Nara → tabelas e campos listados; por Ana → recusada | regra de negócio |
| RN-026 | 2026-11-15T02:30Z → hoje "2026-11-14"; 2026-11-15T03:00Z → "2026-11-15"; 30/11 + 3 meses = 28/02 | regra de negócio |
| RN-027 | 65492.11 em reais → "R$ 65.492,11"; 0.5 % → "0,5%"; 4 dias da régua → "D+4"; 1.2 fator → "1,2" | regra de tela |
| RNF-006 | Abrir a ficha do cliente ≤ 6 chamadas; redistribuir 20 clientes ≤ 12; gravar 20 parâmetros ≤ 12; enviar um e-mail ≤ 12 | regra de negócio |

Verificação manual:

- [ ] C-007 — ficha do 1001 com dados de teste e, no ambiente da plataforma, contra o Winthor real (RNF-003)
- [ ] C-027 — menu de Ana, Nara e Gustavo; itens de outras specs ainda não entregues não aparecem
- [ ] RF-017 — equipes lado a lado legíveis com a equipe de exemplo e em celular
- [ ] C-025 — PDF anexado abre; imagem anexada abre; o aviso de endereço público aparece
- [ ] C-024 — e-mail real chega na caixa de teste com o texto certo e a identidade visual da empresa
- [ ] C-005 — aviso de posição desatualizada visível em Clientes, na ficha e em Sincronização
- [ ] RNF-001 — tempo de uma leitura completa com o volume real registrado
- [ ] Tema claro e escuro sem cor quebrada nas telas da base

## Fora de escopo

- [ ] Régua, quadro e ações de cobrança, promessas, acordos, fila de e-mails da régua, lista de bloqueio, agenda — spec 002
- [ ] Jurídico, dossiê, processos e a marcação do cliente com processo ativo — spec 003
- [ ] Concessão, gestão de crédito, farol, rating, pedidos acima do limite, cálculo da criticidade do cliente e a indicação do analista do cliente — spec 004
- [ ] Setor público: NF, régua pública, regras por ente, certidões — spec 005
- [ ] Painel, aging consolidado, PDD, metas, foto mensal, planos × faturamento — spec 006
- [ ] Histórico do cliente em linha do tempo e PDF, fontes, material de apoio, consulta das regras — spec 007
- [ ] **Conteúdo e cadastro** dos modelos de mensagem — cada spec entrega os seus (nome, texto inicial, marca de efeito legal, campos extras); aqui só a edição do texto, a validação e o envio. A base não tem modelo próprio
- [ ] Parâmetros dos outros módulos (régua, encargos, alçadas, limites, metas, Jurídico, setor público) — cada spec registra e valida os seus no catálogo único; a tela e a gravação são desta base
- [ ] Fases, cartões e regras de movimento de cada quadro — spec dona do quadro; daqui saem só o acesso por cargo e a regra de que caso não se exclui
- [ ] Documento de um caso (cobrança, solicitação, processo, dossiê) — é anexo do cartão do quadro, na spec dona
- [ ] Envio programado ou automático de e-mail — a base envia quando alguém (ou outra spec) pede; quando enviar é decisão da spec 002
- [ ] WhatsApp — decisão de 11/11/2026: primeiro só e-mail
- [ ] Qualquer gravação no Winthor (bloqueio, limite, cadastro) — decisão de 11/11/2026
- [ ] Editar no sistema dado que vem do Winthor (nome, CNPJ, limite, plano, RCA, setor) — a fonte é o Winthor
- [ ] Classificar à mão a BU ou o setor do cliente — removido: a BU é do item (D-01) e o setor vem do ramo (D-02)
- [ ] Importação de planilha do Winthor — acabou com a leitura direta
- [ ] Pedidos liberados e ainda não faturados no "utilizado" (RN-005) — o artefato não considerava
- [ ] Créditos do cliente (devolução, adiantamento) abatendo a posição — o artefato não considerava
- [ ] Posição do órgão público pelo prazo legal da nota fiscal — a base usa o vencimento do título (P-09); a visão por prazo legal é da spec 005
- [ ] Migração dos dados do artefato (P-02) — equipe, parâmetros e feriados nascem dos padrões
- [ ] Destruir arquivo anexado — a remoção é lógica (RN-024)
- [ ] Atribuição automática de agente a cliente novo — fica na lista "sem agente" (RF-021)
- [ ] Grupo econômico vindo do Winthor — é informado no sistema (RF-029)
- [ ] Registro de tentativas de login de quem não é da equipe — a conferência da equipe (RF-049) mostra o inverso: membro sem usuário

## Pendências

Nenhuma bloqueia a construção. As perguntas ao gestor seguem com o padrão adotado
(números P-NN do contrato técnico); trocar o padrão depois é mudar um parâmetro.

| # | Pergunta | Padrão adotado | Afeta |
|---|---|---|---|
| P-03 | Quais parâmetros da Estética têm valor diferente do privado? | nenhum; a tela já aceita valor por carteira | RF-023 |
| P-04 | A mesma pessoa pode ser agente e analista? | sim; o analista vê os clientes em que é analista | RN-012 |
| P-05 | Campos do Winthor para títulos, limite, plano e ramos públicos | os nomes usuais do Winthor, conferidos na instalação (RF-050) | RF-002, RF-004 |
| P-06 / P-11 | Quem valida modelo com efeito legal? | Jurídico ou Gerente para cima; sem validação em dia não envia | RN-022 |
| P-13 | Quem é dono da tela de planos de pagamento? | esta base, só leitura | RF-045 |
| P-14 | Códigos de ramo público e esfera por ramo | 11 a 15 e o prefixo "ORGAO PUBLICO"; esfera informada à mão | RN-018, RF-029 |
| P-15 | Vencimento em dia não útil conta como? | dia corrido | RN-002 |
| P-16 | Quais tipos de cobrança ficam fora da dívida? | nenhum | RN-001 |
| P-25 | Arquivo anexado fica em endereço público | aceito, com nome embaralhado e aviso na tela | RN-024 |

Resolvidas pelo arquiteto do contrato técnico em 16/11/2026
(`docs/contrato/pedidos/00-respostas.md`): administra quem é Gerente, Diretoria
ou tem a marca de Administrador, e só quem tem a marca a dá a outro (D-06; C-019,
C-027, C-033); a busca de cliente fora do sistema (RF-012), a lista de contatos
de todos os clientes (RF-033), a lista de leituras (RF-007), gerar os feriados
do ano e restaurar padrão numa chamada só ficam como estão.

Resolvidas pelas decisões do gestor de 14/11/2026 (eram NC-1 a NC-9): a BU vem
do departamento do item (NC-1 → D-01); o setor vem do ramo (NC-2 → D-02); o
grupo econômico é informado no sistema (NC-3); cliente novo fica sem agente
(NC-4); vencimento em dia não útil e tipos de cobrança viraram parâmetro
(NC-5 → P-15, NC-6 → P-16); Estética (NC-7 → P-03); analista (NC-8 → P-04);
validação de modelo (NC-9 → P-06).

## Checklist de revisão

- [x] Nenhuma menção a tecnologia, tabela ou componente
- [x] Todo RF tem critério de aceite verificável
- [x] Seção "Fora de escopo" preenchida
- [x] Cenários cobrem caminhos de erro (C-005, C-007, C-010, C-011, C-013, C-017, C-019, C-022, C-024, C-025, C-031)
- [x] Seção "Testes" preenchida: todo C-00N e toda RN-00N com evidência concreta
- [x] Zero `[NEEDS CLARIFICATION]` em aberto — as 9 viraram decisão ou pendência com padrão

---

## Anexo A — Parâmetros que a base registra no catálogo

O catálogo é único e cada módulo registra os seus. A base registra 38, em 4
grupos. Os demais grupos do artefato (régua, encargos, alçadas, limite, metas,
Jurídico, régua pública) passaram para a spec dona de cada um; "Contato depois
do protesto" saiu porque nenhuma spec usa. "Cart." = aceita valor por carteira.
"Vig." = guarda histórico por data de início.

**1. Leitura do Winthor e calendário** (`base`)

| Código | Parâmetro | Padrão | Unidade | Cart. | Vig. |
|---|---|---|---|---|---|
| base.syncIntervaloMin | Intervalo da leitura do Winthor | 15 | minutos (5 a 120, múltiplo de 5) | — | — |
| base.syncJanelaMeses | Cliente entra com movimento nos últimos | 12 | meses | — | — |
| base.comprasJanelaDias | Período das "compras no período" da posição | 90 | dias | — | — |
| base.pontualidadeMeses | Período da pontualidade | 12 | meses | — | — |
| base.calendarioUf | UF do calendário da empresa (dias úteis) | DF | UF | — | — |
| base.fichaValidadeDias | Validade da ficha de contatos | 180 | dias | — | — |
| base.ramosPublicos | Ramos de atividade que são órgão público | 11,12,13,14,15 | lista de códigos | — | — |
| base.ramoPublicoPrefixo | Nome de ramo que indica órgão público | ORGAO PUBLICO | texto | — | — |
| base.ramosEsfera | Esfera de cada ramo público | (vazio) | pares código=esfera | — | — |
| base.vencimentoDiaNaoUtil | Vencimento em dia não útil | dia corrido | dia corrido, próximo dia útil ou dia útil anterior | sim | sim |
| base.cobrancasExcluidas | Tipos de cobrança que não são dívida | (vazio) | lista de códigos | — | — |
| base.rotinaUsuarioEmail | Usuário em nome de quem a rotina age quando o caso não tem responsável | (vazio = primeiro Administrador) | e-mail | — | — |

**2. Comunicação** (`com`)

| Código | Parâmetro | Padrão | Cart. | Vig. |
|---|---|---|---|---|
| com.telefone | Telefone de contato da cobrança | (61) 3033-3116 | sim | — |
| com.email | E-mail de contato da cobrança | cobranca@benenutri.com | sim | — |
| com.assinatura | Assinatura das mensagens | Equipe de Crédito e Cobrança – Grupo Benenutri | sim | — |
| com.politicaVersao | Versão da Política de Crédito e Cobrança | 5.2 | — | sim |
| com.modeloRevalidarMeses | Validade da validação de modelo com efeito legal | 12 meses | — | — |
| com.modeloValidaNivel | Nível mínimo para validar modelo com efeito legal (além do Jurídico) | 3 (Gerente) | — | — |

**3. Criticidade do cliente** (`crit`; aceita valor por carteira; quem calcula é a spec 004)

| Código | Parâmetro | Padrão | Unidade |
|---|---|---|---|
| crit.atrasoAlerta | Dias de atraso — alerta a partir de | 1 | dias |
| crit.atrasoCritico | Dias de atraso — crítico a partir de | 30 | dias |
| crit.pontAlerta | Pontualidade — alerta abaixo de | 90 | % |
| crit.pontCritico | Pontualidade — crítico abaixo de | 80 | % |
| crit.scoreAlerta | Score Serasa — alerta abaixo de | 600 | pontos |
| crit.scoreCritico | Score Serasa — crítico abaixo de | 400 | pontos |
| crit.usoAlerta | Uso do limite — alerta a partir de | 90 | % |
| crit.usoCritico | Uso do limite — crítico a partir de | 100 | % |
| crit.prazoAlerta | Prazo médio — alerta acima de | 60 | dias |
| crit.prazoCritico | Prazo médio — crítico acima de | 90 | dias |
| crit.ratingAlerta | Rating — alerta a partir de | D | rating |
| crit.ratingCritico | Rating — crítico a partir de | E | rating |
| crit.alertasParaCritico | Alertas simultâneos que viram crítico | 3 | nº |
| crit.inadDias | Inadimplente a partir de | 1 | dias |

**4. PDD — provisão por faixa de atraso** (`pdd`; por carteira e com vigência; quem calcula são as specs 002 e 006)

| Código | Faixa | Padrão |
|---|---|---|
| pdd.f0 | a vencer | 0,5% |
| pdd.f1 | 1 a 30 dias | 3% |
| pdd.f2 | 31 a 60 dias | 10% |
| pdd.f3 | 61 a 90 dias | 30% |
| pdd.f4 | 91 a 180 dias | 50% |
| pdd.f5 | acima de 180 dias | 100% |

## Anexo B — Campos comuns dos modelos de mensagem

| Campo | Valor |
|---|---|
| [CLIENTE] | nome do contato destinatário; sem ele, a razão social |
| [RAZAO_SOCIAL] | razão social do Winthor |
| [CNPJ] | CPF/CNPJ formatado |
| [CODIGO_CLIENTE] | código do Winthor |
| [VALOR_VENCIDO] | vencido da posição, em reais |
| [DIAS_ATRASO] | dias de atraso da posição |
| [VENCIMENTO_MAIS_ANTIGO] | vencimento do título vencido mais antigo (o artefato aproximava por hoje − dias de atraso) |
| [VALOR_A_VENCER] | a vencer da posição |
| [PROXIMO_VENCIMENTO] | data do próximo vencimento |
| [VALOR_PROXIMO_VENCIMENTO] | valor do próximo vencimento |
| [DATA_HOJE] | hoje (RN-026) |
| [AGENTE] | nome do agente de cobrança do cliente |
| [TELEFONE_CONTATO] / [EMAIL_CONTATO] / [ASSINATURA] | parâmetros do grupo Comunicação, na carteira do cliente |

Quando quem pede o envio informa a carteira, os valores de saldo vêm da posição
do cliente naquela carteira. Cada modelo pode declarar campos extras (ex.:
[DATA_LIMITE], [VALOR_ATUALIZADO], [NUMERO_NF]); quem pede o envio informa o
valor deles. Não há texto de WhatsApp no modelo.
