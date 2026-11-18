# Entrega — Crédito e Cobrança (18/11/2026)

O sistema que substitui o artefato "Painel Crédito e Cobrança" está construído, testado e validado no
simulador local. **Ainda não foi publicado no Mitra nem commitado.** Este documento diz o que existe, o que
ficou de fora ou parcial, o que depende do gestor e como subir.

## 1. O que foi construído

Sete módulos sobre a plataforma Mitra (tabelas + Server Functions) e um app React, com quadros da lib
`@benenutri/mitra-kanban`. Pela decisão D-05, privado, Estética e Injetáveis e setor público usam o mesmo
conjunto de telas e funções, separados por carteira.

| Módulo | O que faz |
|---|---|
| 001 Base | clientes e posição lidos do Winthor, contatos, equipe e hierarquia, parâmetros, BUs, feriados, modelos de mensagem, e-mail, anexos, auditoria, rotina de 5 min |
| 002 Cobrança | régua por fases, casos no quadro, contatos e promessas, acordos e baixas na alçada, bloqueio de pedidos, projeção, agenda, fila de e-mails com aprovação, envio ao Jurídico |
| 003 Jurídico | dossiê, processos no quadro, andamentos, custos, acordo judicial com parcelas, notificação extrajudicial, filiais credoras, carga inicial da planilha do escritório, alertas e visão gerencial |
| 004 Concessão de crédito | solicitações na esteira, motor de crédito, decisão na alçada ("quem propõe não decide"), crédito e pendência para o Winthor, pedidos acima do limite, saúde e risco da carteira, semáforo |
| 005 Setor público | fluxo da NF pública, motor do órgão (0–100, P1–P4), regras de pagamento por ente, comunicação com o órgão, certidões |
| 006 Painel | posição, aging, roll rate, PDD, inadimplência, concentração, crédito, agentes, planos, saúde, atenção, fechamento manual do mês |
| 007 Histórico e apoio | linha do tempo do cliente (39 tipos de evento), documento em PDF, fontes de consulta, material de apoio, regras em vigor |

**Números:** 55 tabelas, 277 parâmetros, 327 Server Functions (227 que a tela chama + 100 internas), 8 quadros
com 84 fases.

**Testes (conferidos em 17/11):**
- backend: 95 de regra, 119 SQL executadas sem falha, 406 testes de fluxo no simulador, nenhum pulado nem
  falho — inclusive 18 testes ponta a ponta entre módulos (cobrança → acordo → quebra → Jurídico →
  painel → histórico; concessão privada e pública até o crédito);
- frontend: 84 testes de regra de tela; `build` e `lint` limpos;
- navegador: os fluxos de agente, supervisão, analista, Jurídico, gerente, administração e setor público
  percorridos com os perfis do simulador, nos temas claro e escuro e em largura de celular.

**Validação:** cada módulo teve um validador independente e um corretor; depois, um validador do backend
inteiro e um do sistema inteiro contra o artefato original (`docs/validacao/`). Os bloqueios achados —
principalmente funções internas que confiavam em valor vindo da tela e uma instrução que o MySQL recusa —
foram todos corrigidos e ganharam teste.

## 2. Decisões que você tomou (arquitetura.md §7)

D-01 BU pelo departamento do produto · D-02 setor pelo ramo 11–15 · D-03 vencimento em dia não útil por
parâmetro · D-04 códigos de cobrança excluídos por parâmetro · D-05 público e Estética reaproveitam o
privado · D-06 administra quem é Gerente para cima ou tem a marca Administrador · D-07 supervisor vê todos
os cards do Jurídico · D-08 acordos aguardando aprovação em indicador próprio · D-09 ninguém se promove e a
marca não altera alçada · D-10 com o Winthor fora, a régua não roda com dado velho.

## 3. Cobertura do artefato original

Dos 64 itens do artefato: **49 cobertos, 12 mudados por decisão ou pendência, 3 parciais.**

- **Mudados:** leitura direta do Winthor em vez de importar planilha (só o Jurídico tem carga única de
  planilha); sem WhatsApp; nada escreve no ERP (a pendência do crédito é registrada para o Winthor); cards
  não se arrastam ("Mover para" no card aberto); "Ocultar exemplos" saiu; rating AA–H virou rating único;
  organograma em árvore trocado pela opção de tela escolhida; bloqueio total em D+10 (P-01); nenhum
  e-mail automático sem aprovação (P-24); deferido × negado por BU saiu (D-01); indicadores sem regra
  definida aguardam o gestor.
- **Parciais:** filtro de mês por tela, não global; o cronograma dia a dia da régua não entrou; os arquivos
  do material de apoio aguardam o gestor (P-33).

## 4. Ajustes pequenos que ficaram listados

Nenhum impede o uso; ficaram para depois da primeira subida:
- agenda: só o nome do cliente é clicável, não o card inteiro;
- concessão: "Prazo (meses)" precisa de definição do gestor; "Parecer do agente" fica na fase de análise;
  a capa do card parece editável;
- "Nada pendente" aparece com o checklist ainda sem resposta; falta confirmação visível depois de
  "Registrar" em alguns diálogos;
- acordo judicial não mostra as parcelas antes de salvar, e o prazo fica no card depois de encerrar;
- números de variação sem rótulo no painel; "Acima de 180dias" sem espaço;
- na visão gerencial, o Sérgio vê o título "Equipe de Gustavo";
- a Júlia (Jurídico) vê no menu "Minha agenda", "Regras de cobrança" e "Notas fiscais públicas";
- no gráfico de saúde da concessão a série "Risco" sai em verde (cor da paleta de dados);
- o pacote principal do app tem 1,2 MB (o build só avisa).

## 5. Pendências do gestor (contrato 00 §4)

P-01 a P-50 — cada uma já tem um padrão adotado; trocar depois é mudar parâmetro, dado do quadro ou um
arquivo isolado. As que mais pesam para começar a usar:

| # | Pergunta | Padrão adotado |
|---|---|---|
| P-05 | Colunas do Winthor (títulos, limite, plano, NF, empenho, ramos) | nomes do contrato 02 — conferir no sandbox (S-12) |
| P-12 / P-17 / P-46 | Quem são o Diretor financeiro, o Comitê de crédito e o Comitê regional | Diretoria nível 5; Comitê nível 5; regional nível 3 |
| P-23 | Regras de pagamento por ente | nascem "a confirmar"; Jurídico ou Gerente valida |
| P-32 / P-33 | Endereços das 41 fontes, arte do papel timbrado, arquivos do material de apoio | sem link / logo do design / "Arquivo pendente" |
| P-34 | Encargos conferidos contra os contratos | os do artefato (correção 0,4% a.m.) |
| P-39 / P-41 | Planilha real do escritório e dados das filiais credoras | colunas por posição, prévia obrigatória; o Gerente cadastra as filiais |
| P-49 | Baixa em partes: alçada por baixa ou pelo acumulado | por baixa, uma pendente por caso, com parecer do Jurídico |
| P-50 | Com mais de um advogado, quem recebe o processo | o primeiro membro do Jurídico, trocável depois |

A lista completa, com onde cada padrão se troca, está em `docs/contrato/00-indice.md` §4.

## 6. Como subir para o Mitra

O Mitra não tem staging: tudo que roda contra a plataforma bate em produção. Por isso nada foi executado
daqui. A ordem completa e as regras estão no `CLAUDE.md` ("Como subir para o Mitra").

1. Aqui: `npm test` verde nos dois lados (já está), **um** commit sem assinatura de agente e push.
2. Criar o projeto na plataforma e trocar o nome da pasta (`credito-cobranca` → `p-NNNNN`) e o registro no
   `mitra-hub/server.mjs`.
3. No chat do projeto no Mitra, colar o prompt abaixo.
4. Antes de liberar aos usuários: rodar o roteiro de confirmação (S-01 a S-16) no sandbox; item que
   falhar não libera — aplicar o plano B, subir de novo e repetir.
5. Aqui, `git pull` (migrations e mapa de ids gerados pela plataforma).

### Prompt para o sandbox

```text
Sincronize o repositório deste projeto com a branch principal e rode, dentro de backend/, nesta ordem:

node setup-backend.mjs
node add-001-kanban.mjs
node add-002-jdbc-winthor.mjs
for f in add-010-*.mjs add-020-*.mjs add-030-*.mjs add-040-*.mjs add-050-*.mjs add-060-*.mjs add-070-*.mjs; do node "$f"; done
for f in add-010-*.mjs add-020-*.mjs add-030-*.mjs add-040-*.mjs add-050-*.mjs add-060-*.mjs add-070-*.mjs; do node "$f"; done
node add-001-kanban.mjs
node add-090-perfil-acesso.mjs
node sync-server-function-map.mjs

A segunda passada dos add-0N0 é obrigatória (injeta os ids de todas as funções). A conexão JDBC
"WinThor" precisa existir com esse nome. Depois, com o usuário topo logado no app, preencha
T002_BUSINESS_TOKEN e T002_EMAIL no .env do sandbox e rode:

node sandbox/t002-confirmar.mjs

Me devolva a saída inteira (as linhas S-nn · resultado · plano B), as migrations geradas e o mapa de ids.
Não cadastre equipe além do topo nem divulgue o endereço do app antes de todas as linhas S-nn passarem.
```

## 7. Onde está cada coisa

- `README.md` — como rodar, testar e publicar; perfis do simulador.
- `CLAUDE.md` — regras que quebram produção, estrutura, publicação.
- `docs/arquitetura.md` — decisões; `docs/contrato/` — contrato entre os módulos; `docs/specs/` — spec,
  plano e tarefas de cada módulo; `docs/validacao/` — todos os relatórios; `docs/execucao.md` — diário.
- Simulador: `cd backend && npm run sim` (porta 3115) e `cd frontend && npm run dev` (porta 5185); também
  pelo mitra-hub (projeto "Crédito e Cobrança").
