# Crédito e Cobrança

Sistema de crédito e cobrança da Benenutri na plataforma Mitra. Substitui o "Painel Crédito e Cobrança"
do gestor: a posição dos clientes vem do Winthor (leitura direta por JDBC, sem importar planilha), a equipe
enxerga a carteira pela hierarquia, e cada processo anda num quadro (concessão de crédito, cobrança e
Jurídico) com regra, alçada e auditoria no servidor. O sistema não escreve no Winthor: bloqueios e limites
saem como listas e pendências para aplicar no ERP. Mensagens só por e-mail.

Frontend React 19 + TypeScript + Vite + Tailwind 4 (design system Benenutri); backend em tabelas e Server
Functions da plataforma, provisionado pelos scripts de `backend/`. Contrato entre os módulos em
`docs/contrato/`; especificação de cada módulo em `docs/specs/NNN-slug/` (spec, plan, tasks). Regras de
trabalho e o que nunca executar daqui: `CLAUDE.md`.

## Os 7 módulos

Carteiras: **Privado**, **Estética** e **Público**. As três usam as mesmas telas e Server Functions,
parametrizadas pela carteira (D-05); o Jurídico atende as três.

| Spec | Módulo | Telas principais |
|---|---|---|
| 001 | Base: clientes e posição do Winthor, equipe, parâmetros, rotina | Clientes, Contatos, Equipe, Planos, Sincronização, Parâmetros, Auditoria |
| 002 | Cobrança das três carteiras | Minha agenda, quadro de cobrança, acordo, baixa, E-mails da régua, Lista de bloqueio, Projeção, Visão da cobrança, Regras |
| 003 | Jurídico | Quadro/lista de processos, acordos judiciais, custos, alertas, carga inicial |
| 004 | Concessão e gestão de crédito | Esteira (quadro), nova solicitação, pedidos acima do limite, Gestão, Saúde das análises, Semáforo |
| 005 | Setor público | Notas fiscais públicas (etapas e prazos), regras por ente, comunicação com o órgão, certidões |
| 006 | Painel consolidado | Painel (visão geral, cobrança, crédito, aging e PDD, equipe) |
| 007 | Histórico do cliente e apoio | Histórico do cliente com PDF, Fontes e links, Material de apoio, Regras em vigor |

## Rodar localmente (simulador)

Nada aqui fala com a plataforma: o simulador roda as **mesmas** definitions sobre SQLite, com o Winthor
imitado (tabelas `PC*`) e o relógio fixo em **19/11/2026 10:00** (Brasília).

```bash
cd backend && npm install
cd backend && npm run sim:seed     # monta (ou refaz) o banco do simulador
cd backend && npm run sim          # simulador em http://localhost:3115

cd frontend && npm install
cd frontend && npm run dev         # app em http://localhost:5185 (sem VITE_MITRA_AUTH_URL entra no simulador)
```

Nunca preencha `VITE_MITRA_AUTH_URL` para trabalhar local: com ele, toda Server Function chamada do
`localhost` bate no banco de produção (não existe staging). Cron à mão:
`POST http://localhost:3115/sim/cron?nome=ccRotina`.

### Quem entra no simulador

Login `<nome>@benenutri.local`, senha `mitra123`. Cada perfil abre na tela do dia dele.

| Login | Perfil | Abre em |
|---|---|---|
| `diana` | Diretoria (nível 5) | Painel |
| `gustavo` | Gerente (nível 3) | Painel |
| `sergio`, `silvia` | Supervisores (nível 2), cada um com a sua equipe | Minha agenda |
| `ana`, `bruno`, `carlos` | Agentes de cobrança | Minha agenda |
| `nara` | Agente com a marca Administrador (parâmetros, modelos, equipe) | Minha agenda |
| `rita` | Analista de crédito | Análise de crédito |
| `julia` | Jurídico | Minha agenda (pareceres) e Jurídico |
| `otavio` | Agente inativo (entrada recusada) | — |
| `visitante` | Usuário sem vínculo na equipe ("Seu acesso ainda não foi liberado") | — |

## Testar

```bash
cd backend && npm test                                # regra pura + sim:check (a SQL roda?) + sim:smoke (o fluxo?)
cd frontend && npm test && npm run build && npm run lint
```

Cada cenário (C-NNN) e regra (RN-NNN) das specs tem um teste com o id no título, em
`backend/simulator/smoke/NNN-*.mjs`, `backend/tests/` ou `frontend/tests/`.

## Subir para o Mitra

Nada de `backend/` roda da máquina local: o `mitra-sdk` é um cliente HTTP e aplicaria DDL e SFs em
produção sem gerar migration. Os scripts são commitados aqui e executados **no sandbox da plataforma**.
Ordem completa (a mesma do `CLAUDE.md`, "Como subir para o Mitra"):

1. `npm test` verde aqui; um commit; push.
2. No sandbox: `node setup-backend.mjs` → `node add-001-kanban.mjs` → `node add-002-jdbc-winthor.mjs` →
   `add-010` a `add-070` **duas vezes** (a 2ª passada injeta os ids) → `node add-001-kanban.mjs` de novo →
   `node add-090-perfil-acesso.mjs` → `node sync-server-function-map.mjs`.
3. **Confirmação no sandbox, antes de liberar aos usuários:** `node sandbox/t002-confirmar.mjs` (S-01 a
   S-16: identidade em chamada aninhada, `{{x}}` como parâmetro, erro 1093, perfil, JDBC, cron, e-mail,
   upload, colunas do Winthor). Precisa de `T002_BUSINESS_TOKEN` e `T002_EMAIL` no `.env` do sandbox
   (chaves em `backend/.env.example`). Item que falhar: não libere; aplique o plano B da linha
   (`docs/contrato/01-convencoes.md` §15), suba de novo o que mudou e rode o roteiro outra vez.
4. Liberado: cadastre a equipe (tela Equipe) e divulgue o endereço. De volta aqui, `git pull` (migrations
   e mapa de ids).

## O que depende do gestor

As pendências estão em `docs/contrato/00-indice.md` §4 (P-01 a P-50). Nenhuma impede a subida: cada uma
segue com um padrão adotado e muda por parâmetro ou cadastro quando o gestor responder. As que mais pesam:

- **P-01** bloqueio total em D+10 (o texto do artefato dizia D+20);
- **P-03 / P-30** Estética com os mesmos valores do Privado;
- **P-24** nenhuma etapa da régua nasce com e-mail automático (todas manuais ou com aprovação);
- **P-32 / P-33** endereços oficiais das fontes, timbre do PDF e arquivos do Material de apoio;
- **P-49 / P-50** alçada da baixa em partes e distribuição de processos entre advogados;
- indicadores sem regra definida (eficiência, índice de recebimento, tempo médio de atendimento,
  classificação qualitativa, cobertura da carteira): voltam quando o gestor definir a conta.
