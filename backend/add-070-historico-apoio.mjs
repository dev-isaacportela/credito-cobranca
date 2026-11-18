// add-070 — Server Functions da 007-historico-apoio (04 §7): 14 públicas e 5 internas. Histórico do cliente (só
// leitura, derivado das tabelas de 001 a 005; a única gravação é a auditoria da emissão), fontes e links,
// material de apoio e regras em vigor (leitura de ccBaseParametroListar e dos quadros).
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// Publicação (DT-39, 01 §14): publique este arquivo e REPUBLIQUE o add-010 (ids) e o add-001-kanban; depois o
// add-090 e o sync-server-function-map. Nenhuma outra spec chama SF da 007. No isEntrypoint() entra a carga
// inicial (41 fontes, 7 materiais) por INSERT IGNORE na chave GRUPO + TITULO: repetir não duplica.
//
// Ids locais (frontend/src/lib/server-functions.ts): públicas 7001–7014, internas 7051–7055.
//
// Entradas das internas (forma A, 01 §5; `membroId` = quem age; `agora` vem da JS; a guarda está na SQL):
//   ccEscHistFonteInserir      grupo, titulo, url, responsavel, uso, busca, ordem, ativo, revisarJuridico, membroId, agora
//   ccEscHistFonteAtualizar    fonteId + as mesmas (o selo volta na própria SQL quando título ou link mudam, RN-010)
//   ccEscHistFonteRevisar      fonteId, membroId, agora
//   ccEscHistMaterialInserir   grupo, titulo, descricao, tags, busca, vigenteDesde, ordem, ativo, membroId, agora
//   ccEscHistMaterialAtualizar materialId + as mesmas + anexoId (0 = mantém o arquivo; > 0 = anexo MATERIAL deste item)

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { js, injetarIds } from './lib/escritas.mjs';
import { ATOR, PODE_ADMINISTRAR, NIVEL_MIN, podeAdministrarEm } from './lib/guarda.mjs';
import { EU, clienteVisivel } from './lib/visibilidade.mjs';
import { CATEGORIAS, AUDITADA, TETO_EMISSAO, CID_SQL, EVENTOS_SQL, ORDEM_EVENTOS } from './lib/historico-apoio/eventos.mjs';
import { FONTE as FONTE_RESUMO } from './lib/historico-apoio/resumo.mjs';
import { FONTE as FONTE_REGRAS } from './lib/historico-apoio/regras.mjs';
import { FONTE as FONTE_TEXTO } from './lib/historico-apoio/texto.mjs';
import { cargaInicial } from './lib/historico-apoio/carga-inicial.mjs';

/* ── texto que entra nos corpos JAVASCRIPT ── */

/** `const nome = valor;` sem `{{` literal no corpo (a plataforma não deve ver parâmetro em JS). */
const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;
function q(v) { return `'${String(v ?? '').replace(/\\/g, '').replace(/'/g, "''")}'`; }
function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function texto(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
/** 0/1 com padrão (entrada ausente ou vazia = padrão). */
function flag(v, padrao) { return v === undefined || v === null || v === '' ? padrao : (inteiro(v) === 1 ? 1 : 0); }

const UTIL = [FONTE_TEXTO, ...[q, inteiro, texto, flag].map(String)].join('\n');
/** Só o resumo e a emissão levam a união das 39 origens (B4 O-03). */
const HISTORICO = [FONTE_RESUMO, constante('CATEGORIAS', CATEGORIAS), constante('AUDITADA', AUDITADA), constante('TETO_EMISSAO', TETO_EMISSAO),
  constante('EVENTOS_JS', EVENTOS_SQL('__CID__')), constante('ORDEM_EVENTOS', ORDEM_EVENTOS)].join('\n');

/** Corpo de SF JAVASCRIPT: preâmbulo + UTIL + o que a função usa + a função. */
const sf = (fn, extra = '') => js(`${UTIL}\n${extra}\nreturn await (${fn})();`);

/**
 * Número da entrada em SQL (B4 C-01): entre aspas e convertido, nada da entrada vira fragmento de consulta.
 * Exceção: `LIMIT {{limite}} OFFSET {{offset}}` (o MySQL só aceita literal ali; padrão de 06 §5, S-16).
 */
const N = (nome) => `CAST('{{${nome}}}' AS SIGNED)`;

/* ── leituras SQL ── */

// Cliente: o mesmo recorte de visibilidade da 001 (Jurídico só com NO_JURIDICO, RN-017); a tela manda a busca
// já normalizada (só dígitos para documento; CAIXA ALTA sem acento para nome).
const FILTRO_BUSCA_CLIENTE = `${clienteVisivel('C')}
  AND ('{{busca}}' = '' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%') OR C.DOCUMENTO LIKE CONCAT('{{busca}}', '%')
       OR CAST(C.CODCLI AS CHAR) = '{{busca}}')`;
const SQL_CLIENTE_BUSCAR = `SELECT C.ID, C.CODCLI, C.NOME, C.DOCUMENTO, C.SETOR, C.UF, COALESCE(AG.NOME, '') AS AGENTE_NOME,
  COALESCE(P.VENCIDO, 0) AS VENCIDO
FROM CC_CLIENTE C
${EU}
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = C.ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID
WHERE ${FILTRO_BUSCA_CLIENTE}
ORDER BY C.NOME, C.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_CLIENTE_BUSCAR_TOTAL = `SELECT COUNT(*) AS TOTAL
FROM CC_CLIENTE C
${EU}
WHERE ${FILTRO_BUSCA_CLIENTE}`;

// Linha do tempo: toda origem é do mesmo {{clienteId}}, e a consulta de fora só devolve linha se esse cliente
// for visível a quem chama (sem acesso = zero linha, 01 §8). `Alteração auditada` só com nível 2 ou ADMIN.
const FROM_EVENTOS = `FROM ${EVENTOS_SQL(CID_SQL)}
JOIN CC_CLIENTE C ON C.ID = ${CID_SQL}
${EU}
WHERE ${clienteVisivel('C')}
  AND (E.CATEGORIA <> '${AUDITADA}' OR ${NIVEL_MIN(2, 'EU')})
  AND ('{{categoria}}' = '' OR FIND_IN_SET(E.CATEGORIA, '{{categoria}}') > 0)
  AND ('{{de}}' = '' OR SUBSTRING(E.EM, 1, 10) >= '{{de}}')
  AND ('{{ate}}' = '' OR SUBSTRING(E.EM, 1, 10) <= '{{ate}}')`;
const SQL_EVENTO_LISTAR = `SELECT E.EM, E.AGENDADO, E.CATEGORIA, E.TITULO, E.TEXTO, E.AUTOR_NOME, E.ORIGEM, E.ORIGEM_ID, E.CARD_ID
${FROM_EVENTOS}
ORDER BY ${ORDEM_EVENTOS}
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_EVENTO_TOTAL = `SELECT COUNT(*) AS TOTAL
${FROM_EVENTOS}`;

// Fontes e material: inativo só aparece para quem administra (D-06), qualquer que seja o filtro (RN-009).
const ATIVO_VISIVEL = (t) => `(CASE WHEN ${podeAdministrarEm('EU')} THEN ${N('ativo')} ELSE 1 END) IN (-1, CASE WHEN ${t}.ATIVO = TRUE THEN 1 ELSE 0 END)`;
const FROM_FONTE = `FROM CC_FONTE_LINK F
${EU}
WHERE ('{{busca}}' = '' OR F.BUSCA LIKE CONCAT('%', '{{busca}}', '%'))
  AND ('{{grupo}}' = '' OR F.GRUPO = '{{grupo}}')
  AND (${N('revisar')} = -1 OR F.REVISAR_JURIDICO = (${N('revisar')} = 1))
  AND ${ATIVO_VISIVEL('F')}`;
const SQL_FONTE_LISTAR = `SELECT F.ID, F.GRUPO, F.TITULO, F.URL, F.RESPONSAVEL, F.USO, F.ORDEM, F.ATIVO, F.REVISAR_JURIDICO,
  F.REVISADO_EM, F.REVISADO_POR, COALESCE(RV.NOME, '') AS REVISADO_POR_NOME, F.ATUALIZADO_EM, F.ATUALIZADO_POR
${FROM_FONTE.replace(`${EU}\n`, `${EU}\nLEFT JOIN CC_MEMBRO RV ON RV.ID = F.REVISADO_POR\n`)}
ORDER BY (SELECT MIN(X.ID) FROM CC_FONTE_LINK X WHERE X.GRUPO = F.GRUPO), F.ORDEM, F.TITULO, F.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_FONTE_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN F.REVISAR_JURIDICO = TRUE THEN 1 ELSE 0 END), 0) AS A_REVISAR,
  COUNT(DISTINCT F.GRUPO) AS GRUPOS
${FROM_FONTE}`;

const FROM_MATERIAL = `FROM CC_MATERIAL MT
${EU}
LEFT JOIN CC_ANEXO AX ON AX.ID = MT.ANEXO_ID AND AX.ENTIDADE = 'MATERIAL' AND AX.ENTIDADE_ID = MT.ID AND AX.REMOVIDO_EM IS NULL
WHERE ('{{busca}}' = '' OR MT.BUSCA LIKE CONCAT('%', '{{busca}}', '%'))
  AND ('{{grupo}}' = '' OR MT.GRUPO = '{{grupo}}')
  AND ${ATIVO_VISIVEL('MT')}`;
const SQL_MATERIAL_LISTAR = `SELECT MT.ID, MT.GRUPO, MT.TITULO, MT.DESCRICAO, MT.TAGS, MT.ANEXO_ID, MT.VIGENTE_DESDE, MT.ORDEM, MT.ATIVO,
  MT.ATUALIZADO_EM, MT.ATUALIZADO_POR, AX.URL AS ANEXO_URL, AX.NOME_ARQUIVO AS ANEXO_NOME, AX.MIME AS ANEXO_MIME,
  AX.TAMANHO_BYTES AS ANEXO_TAMANHO
${FROM_MATERIAL}
ORDER BY (SELECT MIN(X.ID) FROM CC_MATERIAL X WHERE X.GRUPO = MT.GRUPO), MT.ORDEM, MT.TITULO, MT.ID
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_MATERIAL_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN AX.ID IS NULL THEN 1 ELSE 0 END), 0) AS PENDENTES
${FROM_MATERIAL}`;

/* ── escritas internas (guarda na SQL: ATOR + PODE_ADMINISTRAR; revisar: Jurídico ou PODE_ADMINISTRAR) ── */

const LINK_OK = "('{{url}}' = '' OR '{{url}}' LIKE 'http://_%' OR '{{url}}' LIKE 'https://_%')";
// RN-010: o selo volta quando título ou link mudam (ou a entrada pede), na própria SQL; estas colunas vêm ANTES de
// TITULO e URL na lista do SET (06 §5: o MySQL já enxerga o valor novo da coluna que veio antes). HEX compara byte a
// byte: no MySQL (`ai_ci`) `/Lei` e `/lei` seriam iguais e o selo não voltaria (B4 O-01).
const SELO_VOLTA = `(HEX(TITULO) <> HEX('{{titulo}}') OR HEX(COALESCE(URL, '')) <> HEX('{{url}}') OR ${N('revisarJuridico')} = 1)`;
const QUEM = ATOR(N('membroId'), PODE_ADMINISTRAR);
const INTERNAS = {
  ccEscHistFonteInserir: `INSERT INTO CC_FONTE_LINK (GRUPO, TITULO, URL, RESPONSAVEL, USO, BUSCA, ORDEM, ATIVO, REVISAR_JURIDICO, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT '{{grupo}}', '{{titulo}}', NULLIF('{{url}}', ''), '{{responsavel}}', '{{uso}}', '{{busca}}', ${N('ordem')}, (${N('ativo')} = 1),
  (${N('revisarJuridico')} = 1), '{{agora}}', ${N('membroId')}
FROM DUAL
WHERE '{{grupo}}' <> '' AND '{{titulo}}' <> '' AND ${LINK_OK}
  AND NOT EXISTS (SELECT 1 FROM CC_FONTE_LINK X WHERE X.GRUPO = '{{grupo}}' AND X.TITULO = '{{titulo}}')
  AND ${QUEM}`,
  ccEscHistFonteAtualizar: `UPDATE CC_FONTE_LINK SET
  REVISAR_JURIDICO = CASE WHEN ${SELO_VOLTA} THEN TRUE ELSE REVISAR_JURIDICO END,
  REVISADO_EM = CASE WHEN ${SELO_VOLTA} THEN NULL ELSE REVISADO_EM END,
  REVISADO_POR = CASE WHEN ${SELO_VOLTA} THEN NULL ELSE REVISADO_POR END,
  GRUPO = '{{grupo}}', TITULO = '{{titulo}}', URL = NULLIF('{{url}}', ''), RESPONSAVEL = '{{responsavel}}', USO = '{{uso}}', BUSCA = '{{busca}}',
  ORDEM = ${N('ordem')}, ATIVO = (${N('ativo')} = 1), ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = ${N('membroId')}
WHERE ID = ${N('fonteId')} AND '{{grupo}}' <> '' AND '{{titulo}}' <> '' AND ${LINK_OK}
  AND ${QUEM}`,
  ccEscHistFonteRevisar: `UPDATE CC_FONTE_LINK SET REVISAR_JURIDICO = FALSE, REVISADO_EM = '{{agora}}', REVISADO_POR = ${N('membroId')}
WHERE ID = ${N('fonteId')} AND REVISAR_JURIDICO = TRUE
  AND ${ATOR(N('membroId'), `(A.CARGO = 'JURIDICO' OR ${PODE_ADMINISTRAR})`)}`,
  ccEscHistMaterialInserir: `INSERT INTO CC_MATERIAL (GRUPO, TITULO, DESCRICAO, TAGS, BUSCA, VIGENTE_DESDE, ORDEM, ATIVO, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT '{{grupo}}', '{{titulo}}', '{{descricao}}', '{{tags}}', '{{busca}}', NULLIF('{{vigenteDesde}}', ''), ${N('ordem')}, (${N('ativo')} = 1), '{{agora}}',
  ${N('membroId')}
FROM DUAL
WHERE '{{grupo}}' <> '' AND '{{titulo}}' <> ''
  AND NOT EXISTS (SELECT 1 FROM CC_MATERIAL X WHERE X.GRUPO = '{{grupo}}' AND X.TITULO = '{{titulo}}')
  AND ${QUEM}`,
  // O arquivo só troca por anexo MATERIAL deste item, não removido (RN-012); a recusa de tipo e tamanho é da 001.
  ccEscHistMaterialAtualizar: `UPDATE CC_MATERIAL SET GRUPO = '{{grupo}}', TITULO = '{{titulo}}', DESCRICAO = '{{descricao}}', TAGS = '{{tags}}',
  BUSCA = '{{busca}}', ANEXO_ID = CASE WHEN ${N('anexoId')} > 0 THEN ${N('anexoId')} ELSE ANEXO_ID END, VIGENTE_DESDE = NULLIF('{{vigenteDesde}}', ''),
  ORDEM = ${N('ordem')}, ATIVO = (${N('ativo')} = 1), ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = ${N('membroId')}
WHERE ID = ${N('materialId')} AND '{{grupo}}' <> '' AND '{{titulo}}' <> ''
  AND (${N('anexoId')} = 0 OR EXISTS (SELECT 1 FROM CC_ANEXO AX WHERE AX.ID = ${N('anexoId')} AND AX.ENTIDADE = 'MATERIAL'
       AND AX.ENTIDADE_ID = ${N('materialId')} AND AX.REMOVIDO_EM IS NULL))
  AND ${QUEM}`,
};

/* ── corpos JAVASCRIPT ── */

/** RF-006 · RN-005: resumo de 12 campos e contagens. 1 execução. */
const corpoResumo = async () => {
  const m = await sessao();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await clienteDoHistorico(event.clienteId);
  if (!c || !visivel(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  return { ok: true, ...(await resumoDo(c, m)) };
};

/** RF-008, RF-010, RF-011: documento com o filtro ativo (até o teto) e 1 linha de auditoria por emissão. 2 execuções. */
const corpoExportar = async () => {
  const m = await sessao();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const c = await clienteDoHistorico(event.clienteId);
  if (!c || !visivel(m, c)) return recusar(MSG.CLIENTE_NAO_ENCONTRADO);
  const pedidas = String(event.categoria ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (pedidas.some((x) => !CATEGORIAS.includes(x))) return recusar('Categoria desconhecida.');
  const de = texto(event.de, 10);
  const ate = texto(event.ate, 10);
  if (!dataValida(de) || !dataValida(ate)) return recusar('Período inválido.');
  // RN-016: abaixo do nível 2 (sem ADMIN) a categoria auditada não entra, nem pedida.
  const usar = (pedidas.length ? pedidas : CATEGORIAS).filter((x) => x !== AUDITADA || nivelMin(m, 2));
  const id = inteiro(c.ID);
  const filtro = [`E.CATEGORIA IN (${usar.length ? usar.map(q).join(', ') : "''"})`,
    de ? `SUBSTRING(E.EM, 1, 10) >= ${q(de)}` : '', ate ? `SUBSTRING(E.EM, 1, 10) <= ${q(ate)}` : ''].filter(Boolean).join(' AND ');
  const uniao = EVENTOS_JS.split('__CID__').join(String(id));
  // O ambiente só reduz o teto do contrato (B4 O-02).
  const teto = inteiro(process.env.CC_HIST_TETO) > 0 ? Math.min(inteiro(process.env.CC_HIST_TETO), TETO_EMISSAO) : TETO_EMISSAO;
  const eventos = await ler(`SELECT E.EM, E.AGENDADO, E.CATEGORIA, E.TITULO, E.TEXTO, E.AUTOR_NOME, E.ORIGEM, E.ORIGEM_ID, E.CARD_ID
FROM ${uniao} WHERE ${filtro} ORDER BY ${ORDEM_EVENTOS} LIMIT ${teto}`);
  const [t] = await ler(`SELECT COUNT(*) AS TOTAL FROM ${uniao} WHERE ${filtro}`);
  const total = inteiro(t && t.TOTAL);
  const resumo = await resumoDo(c, m);
  const contatos = await ler(`SELECT ID, NOME, AREA, FUNCAO, TELEFONE, WHATSAPP, EMAIL, SITUACAO, OBS, PRINCIPAL FROM CC_CONTATO_CLIENTE
WHERE CLIENTE_ID = ${id} AND SITUACAO <> 'NAO_USAR' ORDER BY PRINCIPAL DESC, NOME, ID LIMIT 500`);
  const emitidoEm = agora();
  const periodo = de || ate ? `${de ? `de ${de}` : ''}${de && ate ? ' ' : ''}${ate ? `até ${ate}` : ''}` : 'todo';
  await auditar('Histórico', 'CLIENTE', id, id, [{ campo: '(emissão)', antes: '',
    depois: `Categorias: ${pedidas.length ? usar.join(', ') : 'todas'}; período: ${periodo}; ${eventos.length} de ${total} registros` }], m);
  return { ok: true, emitidoEm, emitidoPor: m.nome, cliente: resumo.cliente, resumo, contatos, eventos, total, cortado: total > eventos.length };
};

/** RF-014, RF-023, RF-024: inclui, edita, ordena e inativa fonte. 3 execuções. */
const corpoFonteSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const fonteId = inteiro(event.fonteId);
  const novo = {
    GRUPO: texto(event.grupo, 80), TITULO: texto(event.titulo, 200), URL: String(event.url ?? '').trim(), RESPONSAVEL: texto(event.responsavel, 120),
    USO: texto(event.uso, 300), ORDEM: inteiro(event.ordem), ATIVO: flag(event.ativo, 1),
  };
  const revisarJuridico = flag(event.revisarJuridico, 0);
  if (!novo.GRUPO) return recusar('Informe o grupo.');
  if (!novo.TITULO) return recusar('Informe o título.');
  if (novo.URL.length > 500 || !linkValido(novo.URL)) return recusar('O link precisa começar com http:// ou https://.');
  const [repetida] = await ler(`SELECT ID FROM CC_FONTE_LINK WHERE GRUPO = ${q(novo.GRUPO)} AND TITULO = ${q(novo.TITULO)} AND ID <> ${fonteId}`);
  if (repetida) return recusar('Já existe uma fonte com este título neste grupo.');
  const agoraTxt = agora();
  const entrada = {
    grupo: novo.GRUPO, titulo: novo.TITULO, url: novo.URL, responsavel: novo.RESPONSAVEL, uso: novo.USO,
    busca: normalizarTexto(`${novo.TITULO} ${novo.RESPONSAVEL} ${novo.USO}`).slice(0, 900), ordem: novo.ORDEM, ativo: novo.ATIVO, revisarJuridico,
    membroId: m.membroId, agora: agoraTxt,
  };
  if (!fonteId) {
    await escrever('ccEscHistFonteInserir', entrada);
    const [l] = await ler(`SELECT ID FROM CC_FONTE_LINK WHERE GRUPO = ${q(novo.GRUPO)} AND TITULO = ${q(novo.TITULO)}
  AND ATUALIZADO_EM = ${q(agoraTxt)} AND ATUALIZADO_POR = ${inteiro(m.membroId)}`);
    if (!l) return recusar(MSG.SEM_PERMISSAO);
    await auditar('Fontes', 'FONTE_LINK', l.ID, null, [{ campo: '(criação)', antes: '',
      depois: `${novo.GRUPO} · ${novo.TITULO}${novo.URL ? ` · ${novo.URL}` : ''}${revisarJuridico ? ' · a revisar pelo Jurídico' : ''}` }], m);
    return { ok: true, fonteId: inteiro(l.ID), alterado: true };
  }
  const [atual] = await ler(`SELECT * FROM CC_FONTE_LINK WHERE ID = ${fonteId}`);
  if (!atual) return recusar('Fonte não encontrada.');
  const antes = {
    GRUPO: atual.GRUPO, TITULO: atual.TITULO, URL: atual.URL || '', RESPONSAVEL: atual.RESPONSAVEL, USO: atual.USO, ORDEM: inteiro(atual.ORDEM),
    ATIVO: ehVerdade(atual.ATIVO) ? 1 : 0,
  };
  const mudou = Object.keys(novo).filter((k) => String(antes[k]) !== String(novo[k]));
  const seloVolta = !ehVerdade(atual.REVISAR_JURIDICO) && (mudou.includes('TITULO') || mudou.includes('URL') || revisarJuridico === 1);
  if (!mudou.length && !seloVolta) return { ok: true, fonteId, alterado: false };
  await escrever('ccEscHistFonteAtualizar', { ...entrada, fonteId });
  const [rel] = await ler(`SELECT TITULO, ATUALIZADO_EM, ATUALIZADO_POR FROM CC_FONTE_LINK WHERE ID = ${fonteId}`);
  if (!rel || rel.ATUALIZADO_EM !== agoraTxt || inteiro(rel.ATUALIZADO_POR) !== inteiro(m.membroId) || rel.TITULO !== novo.TITULO) {
    return recusar(MSG.SEM_PERMISSAO);
  }
  const simNao = (v) => (v ? 'Sim' : 'Não');
  const campos = mudou.map((k) => (k === 'ATIVO' ? { campo: k, antes: simNao(antes.ATIVO), depois: simNao(novo.ATIVO) } : { campo: k, antes: antes[k], depois: novo[k] }));
  if (seloVolta) campos.push({ campo: 'REVISAR_JURIDICO', antes: 'Não', depois: 'Sim' });
  await auditar('Fontes', 'FONTE_LINK', fonteId, null, campos, m);
  return { ok: true, fonteId, alterado: true };
};

/** RF-016: revisão do Jurídico (ou de quem administra) tira o selo. 3 execuções. */
const corpoFonteRevisar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (m.cargo !== 'JURIDICO' && !podeAdministrar(m)) return recusar('Somente o Jurídico, Gerente, Diretoria ou Administrador registra a revisão.');
  const fonteId = inteiro(event.fonteId);
  const [f] = await ler(`SELECT ID, REVISAR_JURIDICO FROM CC_FONTE_LINK WHERE ID = ${fonteId}`);
  if (!f) return recusar('Fonte não encontrada.');
  if (!ehVerdade(f.REVISAR_JURIDICO)) return recusar('Esta fonte já está revisada.');
  const agoraTxt = agora();
  await escrever('ccEscHistFonteRevisar', { fonteId, membroId: m.membroId, agora: agoraTxt });
  const [rel] = await ler(`SELECT REVISAR_JURIDICO FROM CC_FONTE_LINK WHERE ID = ${fonteId}`);
  if (!rel || ehVerdade(rel.REVISAR_JURIDICO)) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Fontes', 'FONTE_LINK', fonteId, null, [{ campo: 'REVISAR_JURIDICO', antes: 'Sim', depois: 'Não' }], m);
  return { ok: true, fonteId, revisadoEm: agoraTxt, revisadoPor: m.nome };
};

/** RF-018, RF-023, RF-024: cadastra, edita, inativa e liga o arquivo (já registrado por ccBaseAnexoRegistrar). 3 execuções. */
const corpoMaterialSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar(MSG.NAO_ADMINISTRA);
  const materialId = inteiro(event.materialId);
  const anexoId = inteiro(event.anexoId);
  const novo = {
    GRUPO: texto(event.grupo, 80), TITULO: texto(event.titulo, 200), DESCRICAO: texto(event.descricao, 500), TAGS: texto(event.tags, 200),
    VIGENTE_DESDE: texto(event.vigenteDesde, 10), ORDEM: inteiro(event.ordem), ATIVO: flag(event.ativo, 1),
  };
  if (!novo.GRUPO) return recusar('Informe o grupo.');
  if (!novo.TITULO) return recusar('Informe o título.');
  if (!dataValida(novo.VIGENTE_DESDE)) return recusar('Data de vigência inválida.');
  const [repetido] = await ler(`SELECT ID FROM CC_MATERIAL WHERE GRUPO = ${q(novo.GRUPO)} AND TITULO = ${q(novo.TITULO)} AND ID <> ${materialId}`);
  if (repetido) return recusar('Já existe um documento com este título neste grupo.');
  const agoraTxt = agora();
  const entrada = {
    grupo: novo.GRUPO, titulo: novo.TITULO, descricao: novo.DESCRICAO, tags: novo.TAGS, vigenteDesde: novo.VIGENTE_DESDE, ordem: novo.ORDEM,
    ativo: novo.ATIVO, busca: normalizarTexto(`${novo.TITULO} ${novo.DESCRICAO} ${novo.TAGS}`).slice(0, 900), membroId: m.membroId, agora: agoraTxt,
  };
  if (!materialId) {
    if (anexoId) return recusar('Salve o documento antes de anexar o arquivo.');
    await escrever('ccEscHistMaterialInserir', entrada);
    const [l] = await ler(`SELECT ID FROM CC_MATERIAL WHERE GRUPO = ${q(novo.GRUPO)} AND TITULO = ${q(novo.TITULO)}
  AND ATUALIZADO_EM = ${q(agoraTxt)} AND ATUALIZADO_POR = ${inteiro(m.membroId)}`);
    if (!l) return recusar(MSG.SEM_PERMISSAO);
    await auditar('Material', 'MATERIAL', l.ID, null, [{ campo: '(criação)', antes: '', depois: `${novo.GRUPO} · ${novo.TITULO}` }], m);
    return { ok: true, materialId: inteiro(l.ID), alterado: true };
  }
  const [atual] = await ler(`SELECT MT.*, AX.NOME_ARQUIVO AS ANEXO_NOME FROM CC_MATERIAL MT
LEFT JOIN CC_ANEXO AX ON AX.ID = MT.ANEXO_ID WHERE MT.ID = ${materialId}`);
  if (!atual) return recusar('Documento não encontrado.');
  let arquivo = null;
  if (anexoId && anexoId !== inteiro(atual.ANEXO_ID)) {
    [arquivo] = await ler(`SELECT ID, NOME_ARQUIVO FROM CC_ANEXO WHERE ID = ${anexoId} AND ENTIDADE = 'MATERIAL' AND ENTIDADE_ID = ${materialId}
  AND REMOVIDO_EM IS NULL`);
    if (!arquivo) return recusar('O arquivo não foi registrado para este documento.');
  }
  const antes = {
    GRUPO: atual.GRUPO, TITULO: atual.TITULO, DESCRICAO: atual.DESCRICAO, TAGS: atual.TAGS, VIGENTE_DESDE: atual.VIGENTE_DESDE || '',
    ORDEM: inteiro(atual.ORDEM), ATIVO: ehVerdade(atual.ATIVO) ? 1 : 0,
  };
  const mudou = Object.keys(novo).filter((k) => String(antes[k]) !== String(novo[k]));
  if (!mudou.length && !arquivo) return { ok: true, materialId, alterado: false };
  await escrever('ccEscHistMaterialAtualizar', { ...entrada, materialId, anexoId: arquivo ? anexoId : 0 });
  const [rel] = await ler(`SELECT TITULO, ANEXO_ID, ATUALIZADO_EM, ATUALIZADO_POR FROM CC_MATERIAL WHERE ID = ${materialId}`);
  if (!rel || rel.ATUALIZADO_EM !== agoraTxt || inteiro(rel.ATUALIZADO_POR) !== inteiro(m.membroId) || rel.TITULO !== novo.TITULO
    || (arquivo && inteiro(rel.ANEXO_ID) !== anexoId)) return recusar(MSG.SEM_PERMISSAO);
  const simNao = (v) => (v ? 'Sim' : 'Não');
  const campos = mudou.map((k) => (k === 'ATIVO' ? { campo: k, antes: simNao(antes.ATIVO), depois: simNao(novo.ATIVO) } : { campo: k, antes: antes[k], depois: novo[k] }));
  if (arquivo) campos.push({ campo: 'ARQUIVO', antes: atual.ANEXO_NOME || '', depois: arquivo.NOME_ARQUIVO });
  await auditar('Material', 'MATERIAL', materialId, null, campos, m);
  return { ok: true, materialId, alterado: true, anteriorAnexoId: arquivo && atual.ANEXO_ID ? inteiro(atual.ANEXO_ID) : 0 };
};

/** RF-020 a RF-022: parâmetros em vigor por carteira (leitura da 001, aninhada e sem sessão) e etapas dos quadros. ≤ 4 execuções. */
const corpoRegrasVigentes = async () => {
  const m = await sessao();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const carteira = texto(event.carteira, 10).toUpperCase();
  if (carteira && !CARTEIRAS.includes(carteira)) return recusar('Carteira inválida.');
  const leituras = {};
  for (const cart of carteira ? [carteira] : CARTEIRAS) {
    leituras[cart] = linhasDe(await escrever('ccBaseParametroListar', { grupo: '', carteira: cart === 'PRIVADA' ? '' : cart, data: '' }));
  }
  const regras = montarRegras(leituras);
  const fases = await ler(`SELECT CF.QUADRO, KB.NOME AS QUADRO_NOME, CF.CHAVE, KF.NOME, KF.SLA_HORAS, CF.FINAL, CF.ORDEM
FROM CC_FASE CF
JOIN KB_FASE KF ON KF.ID = CF.FASE_ID
LEFT JOIN KB_BOARD KB ON KB.ID = CF.BOARD_ID
ORDER BY CF.BOARD_ID, CF.ORDEM, CF.ID`);
  const quadros = [];
  for (const f of fases) {
    let qd = quadros.find((x) => x.quadro === f.QUADRO);
    if (!qd) quadros.push(qd = { quadro: f.QUADRO, nome: f.QUADRO_NOME || f.QUADRO, fases: [] });
    qd.fases.push({ chave: f.CHAVE, nome: f.NOME, slaHoras: inteiro(f.SLA_HORAS), final: ehVerdade(f.FINAL) });
  }
  const versao = regras.find((r) => r.chave === 'com.politicaVersao');
  return { ok: true, versao: versao ? versao.padrao.valor : null, regras, quadros };
};

/* ── definitions ── */

const sql = (name, code) => ({ name, type: 'SQL', code });
const jsDef = (name, code) => ({ name, type: 'JAVASCRIPT', code });

export const definitions = [
  // ── Histórico (só leitura; a emissão grava a auditoria) ──
  sql('ccHistClienteBuscar', SQL_CLIENTE_BUSCAR),
  sql('ccHistClienteBuscarTotal', SQL_CLIENTE_BUSCAR_TOTAL),
  jsDef('ccHistResumo', sf(corpoResumo, HISTORICO)),
  sql('ccHistEventoListar', SQL_EVENTO_LISTAR),
  sql('ccHistEventoTotal', SQL_EVENTO_TOTAL),
  jsDef('ccHistExportar', sf(corpoExportar, HISTORICO)),
  // ── Fontes e material ──
  sql('ccHistFonteListar', SQL_FONTE_LISTAR),
  sql('ccHistFonteTotal', SQL_FONTE_TOTAL),
  jsDef('ccHistFonteSalvar', sf(corpoFonteSalvar)),
  jsDef('ccHistFonteRevisar', sf(corpoFonteRevisar)),
  sql('ccHistMaterialListar', SQL_MATERIAL_LISTAR),
  sql('ccHistMaterialTotal', SQL_MATERIAL_TOTAL),
  jsDef('ccHistMaterialSalvar', sf(corpoMaterialSalvar)),
  // ── Regras em vigor ──
  jsDef('ccHistRegrasVigentes', sf(corpoRegrasVigentes, FONTE_REGRAS)),
  // ── Internas ──
  ...Object.entries(INTERNAS).map(([nome, code]) => sql(nome, code)),
];

/* ── publicação (só no sandbox) ── */

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntrypoint()) {
  if (!process.env.MITRA_BASE_URL) throw new Error('MITRA_BASE_URL ausente: este script roda no sandbox do Mitra, com o .env real.');
  const sdk = await import('mitra-sdk');
  sdk.configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  const { agora } = await import('./lib/tempo.mjs');
  // Carga inicial (T-020) só com a tabela vazia (B5 C-04): republicar não desfaz o que o gestor editou.
  const linhas = (r) => r?.result?.rows ?? r?.rows ?? (Array.isArray(r?.result) ? r.result : []);
  await cargaInicial({ consultar: async (q) => linhas(await sdk.runQueryMitra({ projectId, sql: q })), executar: (q) => sdk.runDmlMitra({ projectId, sql: q }) }, agora());
  const lerMapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const publicar = async (def, mapa) => {
    const code = def.type === 'JAVASCRIPT' ? injetarIds(def.code, mapa) : def.code;
    const dados = { name: def.name, type: def.type, code, description: `Crédito e Cobrança · 007-historico-apoio · ${def.name}` };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 007.`);
  console.log('Republique o add-010 e o add-001-kanban; depois o add-090 e o sync-server-function-map.');
}
