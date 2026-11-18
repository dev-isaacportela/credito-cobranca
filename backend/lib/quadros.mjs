// Quadros da lib (05 §1, 01 §14): semeadura pelo `QUADROS` de cada `lib/quadros/NNN-*.mjs`,
// chamada de SF `kb*` de dentro do preâmbulo e montagem dos ganchos `ccPodeMover`/`ccPodeExcluir`.

import { fileURLToPath } from 'node:url';
import { chaveDeRotulo } from '@benenutri/mitra-kanban/motor';
import { importarPresentes } from './parametros.mjs';
import { txt } from './texto-sql.mjs';

/** Os 8 quadros do contrato (05). O gancho de cada arquivo é perguntado por estes e pelos que ele declara. */
export const SLUGS_DO_CONTRATO = [
  'cobranca-privada', 'cobranca-estetica', 'cobranca-publica',
  'concessao-privada', 'concessao-estetica', 'concessao-publica', 'pedidos-limite', 'juridico',
];

export const MOTIVO_NAO_EXCLUI = 'Casos não são excluídos; encerre pela etapa final.';

/** Junção canônica "fase atual de um caso": `X` tem CARD_ID. Dá F.CHAVE, K.FASE_DESDE (UTC), K.CONCLUIDO_EM. */
export const FASE_DO_CARD = (x = 'X') => `JOIN KB_CARD K ON K.ID = ${x}.CARD_ID JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID`;

/**
 * Chama uma SF da lib por id de dentro de uma JAVASCRIPT (vai no preâmbulo; usa CC_IDS, projectId,
 * executeServerFunctionMitra). Devolve o `output` já lido; falha da plataforma lança.
 */
export async function chamarKb(nome, input) {
  const serverFunctionId = Number(CC_IDS[nome]) || 0;
  if (!serverFunctionId) throw new Error(`Função da lib não publicada: ${nome}`);
  const resposta = await sdk.executeServerFunctionMitra({ projectId, serverFunctionId, input: input || {} });
  const r = resposta?.result ?? resposta;
  if (r?.executionStatus === 'FAILED') throw new Error(`Falha em ${nome}: ${r.error || 'sem detalhe'}`);
  let saida = r?.output ?? r;
  if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { /* texto puro */ } }
  return saida;
}

/* ── semeadura (05 §1 regra 1) ── */

const json = (v) => (v === null || v === undefined ? 'NULL' : txt(JSON.stringify(v)));
const bool = (v) => (v ? 'TRUE' : 'FALSE');
const ativo = (v) => v === true || Number(v) === 1;

/** Regras `$fase` da condição escritas com a CHAVE da fase passam a levar o id (o motor compara ids). */
function condicaoComIds(condicao, idDaFase) {
  if (!condicao) return null;
  const trocar = (v) => (Array.isArray(v) ? v.map(trocar) : (idDaFase[v] !== undefined ? String(idDaFase[v]) : v));
  return {
    ...condicao,
    regras: (condicao.regras || []).map((r) => {
      if (r.campo !== '$fase') return r;
      const valor = typeof r.valor === 'string' && r.valor.includes(',') ? r.valor.split(',').map((s) => s.trim()) : r.valor;
      return { ...r, valor: trocar(valor) };
    }),
  };
}

/**
 * Cria o que falta de cada quadro, pelo slug e pela chave: quadro, fases, campos, etiquetas e
 * automações. Nunca sobrescreve nome, cor, SLA ou ordem existentes; fase ou campo excluído
 * (linha apagada ou inativa) volta. Grava CC_FASE (QUADRO, BOARD_ID, CHAVE, FASE_ID, ORDEM, FINAL).
 * `exec` = { consultar(sql) → linhas, executar(sql) }. Datas da lib em UTC (`quandoUtc`).
 */
export async function semearQuadro(exec, quadros, { quandoUtc = new Date().toISOString().slice(0, 19) } = {}) {
  const lista = Array.isArray(quadros) ? quadros : [quadros];
  const resultado = [];
  for (const q of lista) {
    let [board] = await exec.consultar(`SELECT ID FROM KB_BOARD WHERE SLUG = ${txt(q.slug)}`);
    if (!board) {
      await exec.executar(`INSERT INTO KB_BOARD (NOME, SLUG, DESCRICAO, ADMINS_IDS, CONFIG_JSON, ACESSO_JSON, ATIVO, CRIADO_POR, CRIADO_EM, ATUALIZADO_EM)
VALUES (${txt(q.nome)}, ${txt(q.slug)}, ${txt(q.descricao || null)}, '', ${json(q.config || null)}, '{"padrao":"restrito"}', TRUE, NULL, ${txt(quandoUtc)}, ${txt(quandoUtc)})`);
      [board] = await exec.consultar(`SELECT ID FROM KB_BOARD WHERE SLUG = ${txt(q.slug)}`);
    }
    const boardId = Number(board.ID);

    // Fases: as que existem ficam como estão (o gestor pode ter mudado); as que faltam nascem.
    const idDaFase = {};
    const novas = [];
    const ccFase = new Map((await exec.consultar(`SELECT CHAVE, FASE_ID FROM CC_FASE WHERE QUADRO = ${txt(q.slug)}`)).map((l) => [l.CHAVE, Number(l.FASE_ID)]));
    const kbFases = new Map((await exec.consultar(`SELECT ID, ATIVO FROM KB_FASE WHERE BOARD_ID = ${boardId}`)).map((l) => [Number(l.ID), l]));
    for (const [i, f] of (q.fases || []).entries()) {
      const existente = ccFase.get(f.chave);
      if (existente && kbFases.has(existente)) {
        if (!ativo(kbFases.get(existente).ATIVO)) await exec.executar(`UPDATE KB_FASE SET ATIVO = TRUE WHERE ID = ${existente}`);
        idDaFase[f.chave] = existente;
        continue;
      }
      await exec.executar(`INSERT INTO KB_FASE (BOARD_ID, NOME, COR, DESCRICAO, ORDEM, TIPO, SLA_HORAS, CONDICAO_JSON, CAPA_JSON, ATIVO)
VALUES (${boardId}, ${txt(f.nome)}, ${txt(f.cor || null)}, ${txt(f.descricao || null)}, ${i + 1}, ${txt(f.tipo || 'comum')}, ${Number(f.slaHoras || 0)},
  NULL, ${f.capa && f.capa.length ? json(f.capa) : 'NULL'}, TRUE)`);
      const [nova] = await exec.consultar(`SELECT MAX(ID) AS ID FROM KB_FASE WHERE BOARD_ID = ${boardId}`);
      idDaFase[f.chave] = Number(nova.ID);
      novas.push(f);
    }
    for (const f of novas) {
      if (f.condicao) await exec.executar(`UPDATE KB_FASE SET CONDICAO_JSON = ${json(condicaoComIds(f.condicao, idDaFase))} WHERE ID = ${idDaFase[f.chave]}`);
    }
    for (const [i, f] of (q.fases || []).entries()) {
      await exec.executar(`INSERT INTO CC_FASE (QUADRO, BOARD_ID, CHAVE, FASE_ID, ORDEM, FINAL)
VALUES (${txt(q.slug)}, ${boardId}, ${txt(f.chave)}, ${idDaFase[f.chave]}, ${i + 1}, ${bool((f.tipo || 'comum') !== 'comum')})
ON DUPLICATE KEY UPDATE BOARD_ID = VALUES(BOARD_ID), FASE_ID = VALUES(FASE_ID), ORDEM = VALUES(ORDEM), FINAL = VALUES(FINAL)`);
    }

    // Campos (da fase e sem fase) e o campo reservado de etiquetas.
    const campos = [
      ...(q.fases || []).flatMap((f) => (f.campos || []).map((c) => ({ ...c, faseId: idDaFase[f.chave] }))),
      ...(q.campos || []).map((c) => ({ ...c, faseId: null })),
    ];
    if ((q.etiquetas || []).length) {
      campos.push({ chave: 'etiquetas', label: 'Etiquetas', tipo: 'selecao_multipla', noCard: true, faseId: null, config: { opcoes: [] }, etiquetas: q.etiquetas });
    }
    const kbCampos = new Map((await exec.consultar(`SELECT ID, CHAVE, ATIVO, CONFIG_JSON FROM KB_CAMPO WHERE BOARD_ID = ${boardId}`)).map((l) => [l.CHAVE, l]));
    const idDoCampo = {};
    for (const [i, c] of campos.entries()) {
      const opcoesDasEtiquetas = (c.etiquetas || []).map((e) => ({ valor: chaveDeRotulo(e.rotulo), rotulo: e.rotulo, cor: e.cor }));
      const existente = kbCampos.get(c.chave);
      if (existente) {
        idDoCampo[c.chave] = Number(existente.ID);
        if (!ativo(existente.ATIVO)) await exec.executar(`UPDATE KB_CAMPO SET ATIVO = TRUE WHERE ID = ${existente.ID}`);
        if (opcoesDasEtiquetas.length) {
          const config = existente.CONFIG_JSON ? JSON.parse(existente.CONFIG_JSON) : {};
          const atuais = config.opcoes || [];
          const faltam = opcoesDasEtiquetas.filter((o) => !atuais.some((a) => String(a.valor) === o.valor));
          if (faltam.length) await exec.executar(`UPDATE KB_CAMPO SET CONFIG_JSON = ${json({ ...config, opcoes: [...atuais, ...faltam] })} WHERE ID = ${existente.ID}`);
        }
        continue;
      }
      const config = opcoesDasEtiquetas.length ? { ...(c.config || {}), opcoes: opcoesDasEtiquetas } : (c.config || null);
      await exec.executar(`INSERT INTO KB_CAMPO (BOARD_ID, FASE_ID, CHAVE, LABEL, TIPO, OBRIGATORIO, NO_CARD, EDITAVEL_DEPOIS, ORDEM, CONFIG_JSON, CONDICAO_JSON, ATIVO)
VALUES (${boardId}, ${c.faseId ?? 'NULL'}, ${txt(c.chave)}, ${txt(c.label)}, ${txt(c.tipo)}, FALSE, ${bool(c.noCard)}, ${bool(c.editavelDepois)}, ${i + 1},
  ${config && Object.keys(config).length ? json(config) : 'NULL'}, ${c.condicao ? json(condicaoComIds(c.condicao, idDaFase)) : 'NULL'}, TRUE)`);
      const [novo] = await exec.consultar(`SELECT ID FROM KB_CAMPO WHERE BOARD_ID = ${boardId} AND CHAVE = ${txt(c.chave)}`);
      idDoCampo[c.chave] = Number(novo.ID);
    }

    // Automações: pelo nome (o gestor edita na aba Automações; nada é sobrescrito).
    const nomes = new Set((await exec.consultar(`SELECT NOME FROM KB_AUTOMACAO WHERE BOARD_ID = ${boardId}`)).map((l) => l.NOME));
    for (const [i, a] of (q.automacoes || []).entries()) {
      const tecnico = `${a.gatilho}${a.faseChave ? ` → ${a.faseChave}` : ''}: ${a.acao}`;
      const nome = a.nome || tecnico;
      // Já instalada com o nome técnico de antes (F5 C-04): não duplica.
      if (nomes.has(nome) || nomes.has(tecnico)) continue;
      const gatilho = { evento: a.gatilho, ...(a.faseChave ? { faseId: idDaFase[a.faseChave] } : {}) };
      await exec.executar(`INSERT INTO KB_AUTOMACAO (BOARD_ID, NOME, GATILHO_JSON, CONDICAO_JSON, ACOES_JSON, ORDEM, ATIVO, CRIADO_EM)
VALUES (${boardId}, ${txt(nome)}, ${json(gatilho)}, NULL, ${json([{ tipo: a.acao, ...(a.config || {}) }])}, ${i + 1}, TRUE, ${txt(quandoUtc)})`);
    }
    resultado.push({ slug: q.slug, boardId, fases: idDaFase, campos: idDoCampo });
  }
  return resultado;
}

/* ── ganchos (04 §8, 01 §14) ── */

const PASTA = fileURLToPath(new URL('./quadros/', import.meta.url));

/** Importa os `lib/quadros/NNN-*.mjs` presentes, em ordem de nome (004 antes de 005). */
export const carregarArquivosDeQuadros = (pasta = PASTA) => importarPresentes(pasta);

/** `[{ slug, clausulas }]`: o texto de todos os `gancho(slug)` não vazios, concatenado na ordem dos arquivos. */
export function trechosDosGanchos(modulos) {
  const slugs = [...new Set([...SLUGS_DO_CONTRATO, ...modulos.flatMap((m) => (m.QUADROS || []).map((q) => q.slug))])];
  const trechos = [];
  for (const slug of slugs) {
    const partes = modulos.map((m) => (typeof m.gancho === 'function' ? String(m.gancho(slug) || '').trim() : '')).filter(Boolean);
    if (partes.length) trechos.push({ slug, clausulas: partes.join('\n') });
  }
  return trechos;
}

/** SQL de `ccPodeMover` (01 §14): sem vínculo recusa; depois o CASE do quadro; senão pode. */
export function montarPodeMover(trechos) {
  const quadros = trechos.map((t) => `      WHEN PARA.QUADRO = '${t.slug}' THEN (CASE\n${t.clausulas}\n        ELSE '' END)`).join('\n');
  return `SELECT CASE WHEN X.MOTIVO = '' THEN 1 ELSE 0 END AS PODE, X.MOTIVO FROM (
  SELECT CASE WHEN M.ID IS NULL THEN 'Usuário sem vínculo na equipe.'
${quadros ? `${quadros}\n` : ''}      ELSE '' END AS MOTIVO
  FROM (SELECT 1 AS U) U1
  LEFT JOIN KB_CARD K ON K.ID = {{cardId}}
  LEFT JOIN CC_FASE DE ON DE.FASE_ID = K.FASE_ID
  LEFT JOIN CC_FASE PARA ON PARA.FASE_ID = {{faseId}}
  LEFT JOIN CC_MEMBRO M ON M.USER_ID = {{usuarioId}} AND M.ATIVO = TRUE) X`;
}

/** SQL de `ccPodeExcluir`: nenhum caso é excluído (05 §1 regra 12). */
export const SQL_PODE_EXCLUIR = `SELECT 0 AS PODE, '${MOTIVO_NAO_EXCLUI}' AS MOTIVO`;
