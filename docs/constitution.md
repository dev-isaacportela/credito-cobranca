# Constitution — Crédito e Cobrança

Princípios inegociáveis deste projeto. Toda `spec`, `plan` e `tasks` é checada
contra este documento. Violação exige justificativa registrada no `plan.md` da
feature (seção *Complexity Tracking*) — ou não passa.

**Versão:** 1.0.0 · **Ratificada:** 2026-11-14

A arquitetura comum (módulos, modelo de dados, perfis, Winthor) mora em
[`arquitetura.md`](arquitetura.md) e é normativa para todo `plan.md`. O sistema
visual é o design system Benenutri (skill `benenutri:design`), instalado em
`docs/design.md`; onde os dois se sobrepuserem, o `design.md` decide a
aparência e esta constitution decide o processo.

---

## I. Spec antes de código

Nenhuma feature vira código sem `docs/specs/NNN-slug/spec.md` aprovada.

| Artefato | Pergunta que responde | Proíbe |
|---|---|---|
| `spec.md` | O QUÊ e o PORQUÊ | qualquer menção a stack, tabela, componente |
| `plan.md` | O COMO técnico | requisito novo que não está na spec |
| `tasks.md` | Em que ORDEM | decisão de design não resolvida no plan |

Ambiguidade vira `[NEEDS CLARIFICATION: pergunta]` na spec e bloqueia o plan
daquele ponto. Nunca se resolve ambiguidade adivinhando.

## II. A política é dado, não código

Todo número da Política de Crédito e Cobrança (dias da régua, limiares de
criticidade, alçadas, PDD, encargos, metas, prazos) é **parâmetro** editável
pelo Administrador, com auditoria e valor padrão. Constante no código só para o
que é definição do sistema (ex.: nomes das faixas de aging). Parâmetro pode ter
valor por **segmento** (privado, estética, público) que sobrepõe o geral.

## III. A regra roda no servidor

Alçada, segregação de funções (quem propõe não aprova), visibilidade pela
hierarquia e gates de etapa são validados em Server Function. A tela pode
avisar antes; quem decide é o servidor. Identidade vem da sessão
(`:VAR_USER`), nunca de um campo enviado pela tela.

## IV. Winthor é a fonte do financeiro; o sistema é a fonte da gestão

Cliente, títulos, recebimentos, limite e plano vêm do Winthor (leitura por
JDBC). O sistema **não escreve** no Winthor: ações no ERP (bloqueio, limite)
saem como lista para o agente aplicar. Tudo o que é gestão (etapa, contato,
promessa, acordo, decisão, processo jurídico) nasce e vive no sistema.

## V. Toda escrita é auditada

Escrita de negócio grava quem, quando, o quê, valor antes e depois. Registro de
auditoria não se edita nem se apaga pelo sistema.

## VI. Testes são obrigatórios

Cada cenário e regra da spec tem teste automatizado (`backend/simulator/smoke.mjs`
para regra de negócio, `frontend/tests/` para regra de tela). Sem `npm test`
verde nos dois lados, não está pronto.

## VII. Migrations são append-only

`backend/migrations/` e `migrations.yaml` são gerados pela plataforma. Ninguém
cria, edita ou faz `git add` neles manualmente.

## VIII. Simplicidade é o default

Comece pela solução mais direta que funciona. Não entram sem necessidade escrita:
abstração com uma implementação, configuração para valor que nunca muda,
estrutura "para o futuro". Atalho com teto conhecido leva comentário `ponytail:`.

## IX. Segurança e credenciais

Credenciais (`MITRA_TOKEN`, `WINTHOR_*`) vêm de `.env`, nunca do código, do git
ou de documento. Nada de token em `VITE_*`. Commit sem assinatura de agente.

## Governança

Emenda exige o texto novo, a justificativa e bump de versão semântico. Todo
`plan.md` abre com *Constitution Check*.
