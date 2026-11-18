// add-060 — Server Functions da 006-painel-consolidado (04 §6): 15 públicas e 2 internas. O painel só lê as
// tabelas de 001–005 e escreve nas duas dele (CC_FOTO_AGING pela rotina, CC_FECHAMENTO pelo fechamento manual).
// Os resumos de 002/003/005 (ccCobAgendaResumo, ccJurResumo, ccPubResumo) a TELA chama direto (SQL com EU, DT-34):
// nenhuma SF daqui chama SF de outro módulo.
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// Publicação (DT-39, 01 §14): publique este arquivo e REPUBLIQUE o add-010 (id de ccPainelRotina no passo FOTO);
// depois o add-090 (ccPainelRotina fica FORA_DO_PERFIL) e o sync-server-function-map.
//
// Nota ao integrador (T-026): ids locais 6001–6015 (públicas) e 6051–6052 (internas) em
// frontend/src/lib/server-functions.ts; CHECK_INPUT da 006 em simulator/config.mjs; rota /painel e menu: frontend.
//
// Entradas das internas (forma A, 01 §5; `membroId` = quem age; `agora` é aceito e ignorado: a data é AGORA_SQL):
//   ccEscPainelFechamentoInserir   mes, total, vencido, vencido90, pdd, membroId, agora
//   ccEscPainelFechamentoAtualizar mes, total, vencido, vencido90, pdd, membroId, agora
// A guarda repete a RN-016 inteira: ATOR com PODE_ADMINISTRAR (D-06), valores ≥ 0, vencido ≤ carteira, > 90 ≤ vencido,
// PDD ≤ carteira, mês válido (01–12) e encerrado pelo relógio do servidor (AGORA_SQL) e sem foto. MES_SEGUINTE é calculado na SQL.

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { js, injetarIds } from './lib/escritas.mjs';
import { q } from './lib/texto-sql.mjs';
import { ATOR, PODE_ADMINISTRAR, NIVEL_MIN, clienteVisivelA, podeAdministrarEm, numerosComoParametro } from './lib/guarda.mjs';
import { EU, MEMBRO_A, clienteVisivel, membroVisivel } from './lib/visibilidade.mjs';
import { HOJE_SQL, AGORA_SQL } from './lib/tempo.mjs';
import { FONTE as FONTE_CALCULO } from './lib/painel-consolidado/calculo.mjs';
import {
  MES_REF, MES_CORRENTE, MES_INDICE, PDD_PCT, COLUNAS_FOTO, daFoto, aoVivo, linhasDoMes, visivelNoPainel, filtrosDoPainel, recorteDoCliente,
} from './lib/painel-consolidado/base.mjs';

/* ── texto que entra nos corpos JAVASCRIPT ── */

const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;
function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function numero(v) { const n = Number(String(v ?? '').trim().replace(',', '.')); return String(v ?? '').trim() === '' ? NaN : n; }
function r2(v) { return Math.round(Number(v || 0) * 100) / 100; }
function pct(a, b) { return Number(b) > 0 ? r2((Number(a) * 100) / Number(b)) : null; }
function preencher(t, mapa) { let s = t; for (const [k, v] of Object.entries(mapa)) s = s.split(k).join(String(v)); return s; }
function minutosEntre(a, b) { const ms = (t) => Date.parse(`${String(t).slice(0, 19)}-03:00`); return (ms(b) - ms(a)) / 60000; }
const UTIL = [q, inteiro, numero, r2, pct, preencher, minutosEntre].map(String).join('\n');

// Fragmentos com marcadores '#…#', trocados na JS por literais já validados (mês, data, ids).
const FX = ['A_VENCER', 'V_1_30', 'V_31_60', 'V_61_90', 'V_91_180', 'V_180'];
const TEMPLATES = [
  constante('T_FOTO', daFoto('#ONDE#')),
  constante('T_VIVO', aoVivo('#MES#', { data: '#DATA#', mesSeguinte: '#SEG#', sincId: '#SINC#', sincEm: '#SINCEM#' })),
  constante('T_PDD', PDD_PCT('#DATA#')),
  constante('T_MEMBRO_A', MEMBRO_A('#M#')),
  constante('T_VIS', visivelNoPainel('B', 'A')),
  constante('T_VIS_C', `(A.CARGO <> 'JURIDICO' AND ${clienteVisivelA('C', 'A')})`),
  constante('T_FILTROS', filtrosDoPainel('B', '#BU#', '#CART#')),
  constante('T_RECORTE', recorteDoCliente('#CLI#', '#CARTCOL#', '#BU#', '#CART#')),
  constante('COLUNAS_FOTO', COLUNAS_FOTO.join(', ')),
  constante('FX', FX),
].join('\n');

/* Funções do corpo (vão por toString; usam o preâmbulo, UTIL, FONTE_CALCULO e os TEMPLATES). */

/** Sessão + filtros do painel (04 §6). Jurídico, sem membro e inativo: recusa. */
async function abrir() {
  const m = await sessao();
  if (!m.membroId) return { erro: recusar(MSG.NAO_MEMBRO) };
  if (m.cargo === 'JURIDICO') return { erro: recusar('O painel consolidado não está disponível para o Jurídico.') };
  const corrente = hoje().slice(0, 7);
  const mesTxt = String(event.mes ?? '').trim();
  if (mesTxt && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mesTxt)) return { erro: recusar('Mês inválido: use AAAA-MM.') };
  const mes = mesTxt || corrente;
  const buTxt = String(event.buId ?? '').trim();
  const buId = buTxt === '' || inteiro(buTxt) < 0 ? -1 : inteiro(buTxt);
  const cart = String(event.carteira ?? '').trim().toUpperCase();
  const carteira = ['PRIVADA', 'ESTETICA', 'PUBLICA'].includes(cart) ? cart : '';
  return { m, f: { mes, buId, carteira, corrente, futuro: mes > corrente, consolidada: m.veTudo && buId < 0 && carteira === '' } };
}

const membroA = (m) => preencher(T_MEMBRO_A, { '#M#': inteiro(m.membroId) });
const filtros = (f) => preencher(T_FILTROS, { '#BU#': f.buId, '#CART#': q(f.carteira) });
const recorte = (f, cli, cartCol) => preencher(T_RECORTE, { '#CLI#': cli, '#CARTCOL#': cartCol, '#BU#': f.buId, '#CART#': q(f.carteira) });

/** Linhas: foto que atende `fotoOnde` e/ou ramo ao vivo do mês `mesVivo` (PDD na data `dataVivo`). */
function sqlLinhas(fotoOnde, mesVivo, dataVivo) {
  const partes = [];
  if (fotoOnde) partes.push(preencher(T_FOTO, { '#ONDE#': fotoOnde }));
  if (mesVivo) {
    partes.push(preencher(T_VIVO, { '#MES#': q(mesVivo), '#DATA#': q(dataVivo || hoje()), '#SEG#': q(mesSeguinte(mesVivo)), '#SINC#': '0', '#SINCEM#': "''" }));
  }
  return `(${partes.length ? partes.join('\nUNION ALL\n') : preencher(T_FOTO, { '#ONDE#': '1 = 0' })})`;
}

/**
 * Fonte do mês (RN-004): corrente = ao vivo; passado com foto = foto; senão `linhas` nulo. `data` = data dos
 * percentuais de PDD da fonte (a da foto, ou hoje).
 */
async function fonteDoMes(f) {
  if (f.futuro) return { origem: 'SEM', linhas: null };
  if (f.mes === f.corrente) return { origem: 'ATUAL', linhas: sqlLinhas('', f.mes, hoje()), data: hoje() };
  const [foto] = await ler(`SELECT COUNT(*) AS N, MAX(SINCRONIZACAO_EM) AS EM FROM CC_FOTO_AGING WHERE MES = ${q(f.mes)}`);
  if (!foto || !Number(foto.N)) return { origem: 'SEM', linhas: null };
  return { origem: 'FOTO', linhas: sqlLinhas(`F.MES = ${q(f.mes)}`, '', ''), data: String(foto.EM).slice(0, 10), em: foto.EM };
}

/** Somas da posição (total, por carteira ou por BU) com a PDD por faixa nos percentuais da `data`. */
function sqlAgregados(linhas, f, m, data, grupo, extra) {
  return `SELECT ${grupo ? `${grupo} AS CHAVE, ` : ''}COUNT(DISTINCT CASE WHEN B.A_VENCER + B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES,
  COUNT(DISTINCT CASE WHEN B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES_ATRASO,
  ${[...FX, 'VENCIDO', 'VDIAS', 'PDD'].map((c) => `COALESCE(SUM(B.${c}), 0) AS ${c}`).join(', ')},
  ${FX.map((c, i) => `COALESCE(SUM(B.${c} * PP.F${i}), 0) / 100 AS PDD${i}`).join(', ')}
FROM ${linhas} B ${membroA(m)}
LEFT JOIN ${preencher(T_PDD, { '#DATA#': q(data) })} PP ON PP.CARTEIRA = B.CARTEIRA
WHERE ${T_VIS} AND ${filtros(f)}${extra || ''}${grupo ? ` GROUP BY ${grupo}` : ''}`;
}

/** Linha de agregados → bloco de posição (somas; razões só onde o contrato pede). */
function posicaoDe(l, comFaixas6) {
  const v = (k) => r2(l ? l[k] : 0);
  const aVencer = v('A_VENCER');
  const vencido = v('VENCIDO');
  const total = r2(aVencer + vencido);
  const vencido90 = r2(v('V_91_180') + v('V_180'));
  const faixas = (comFaixas6 ? FX : FX.slice(1)).map((c) => ({ saldo: v(c), pdd: r2(v(`PDD${FX.indexOf(c)}`)) }));
  return {
    clientes: Number(l ? l.CLIENTES : 0) || 0, clientesAtraso: Number(l ? l.CLIENTES_ATRASO : 0) || 0, total, aVencer, vencido, vencido90,
    faixas, pdd: v('PDD'), inadPct: pct(vencido, total), vencido90Pct: pct(vencido90, total), atrasoMedioDias: vencido > 0 ? r2(v('VDIAS') / vencido) : null,
  };
}

/** Última leitura do Winthor com sucesso e se passou da tolerância (RN-021), pelo relógio do servidor. */
async function estadoDaLeitura(p) {
  const [l] = await ler("SELECT INICIO, FIM FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK' ORDER BY ID DESC LIMIT 1");
  const em = l ? String(l.FIM || l.INICIO) : null;
  return { em, atrasada: !!em && minutosEntre(em, agora()) > Number(p['painel.sincAtrasoMin'] || 30) };
}

/** Mês anterior ao corrente sem foto nem fechamento manual, se o sistema já existia antes do mês corrente (C-006). */
async function fotoPendenteDe(corrente) {
  const ant = mesAnterior(corrente);
  const [l] = await ler(`SELECT
  CASE WHEN EXISTS (SELECT 1 FROM CC_FOTO_AGING WHERE MES = ${q(ant)}) THEN 1 ELSE 0 END AS FOTO,
  CASE WHEN EXISTS (SELECT 1 FROM CC_FECHAMENTO WHERE MES = ${q(ant)}) THEN 1 ELSE 0 END AS MANUAL,
  CASE WHEN EXISTS (SELECT 1 FROM CC_FOTO_AGING WHERE MES < ${q(corrente)})
    OR EXISTS (SELECT 1 FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK' AND INICIO < ${q(`${corrente}-01`)}) THEN 1 ELSE 0 END AS ANTES`);
  return l && !Number(l.FOTO) && !Number(l.MANUAL) && Number(l.ANTES) ? ant : null;
}

/** Limites de hoje dos clientes visíveis (base LIMITE da concentração, RN-022). Sem BU; carteira = tem posição nela. */
async function linhasDeLimite(m, f) {
  return ler(`SELECT C.ID AS CLIENTE_ID, C.CODCLI, C.NOME, C.GRUPO_ECONOMICO, C.UF, 0 AS BU_ID, P.LIMITE AS VALOR
FROM CC_POSICAO_CLIENTE P JOIN CC_CLIENTE C ON C.ID = P.CLIENTE_ID ${membroA(m)}
WHERE P.LIMITE > 0 AND ${T_VIS_C}
  AND (${q(f.carteira)} = '' OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PB WHERE PB.CLIENTE_ID = C.ID AND PB.CARTEIRA = ${q(f.carteira)}))`);
}

/** Concentração (RN-014, RN-018, RN-022) a partir de linhas { CLIENTE_ID, CODCLI, NOME, GRUPO_ECONOMICO, UF, BU_ID, VALOR }. */
function concentrar(rows, p, nomesBu, comBu, teto) {
  const faixa = (i) => faixaHhi(i, p['painel.hhiModerado'], p['painel.hhiAlto']);
  const recorteDe = (itens, corte = 10) => {
    const linhas = ranking(itens);
    const i = hhi(linhas.map((l) => l.valor));
    return { hhi: i, hhiFaixa: faixa(i), quantidade: linhas.length, linhas: corte ? linhas.slice(0, corte) : linhas };
  };
  const cli = recorteDe(rows.map((r) => ({ chave: String(r.CODCLI), rotulo: r.NOME, valor: r.VALOR })), 0);
  const grp = recorteDe(rows.map((r) => ({
    chave: r.GRUPO_ECONOMICO ? `G:${r.GRUPO_ECONOMICO}` : `C:${r.CODCLI}`, rotulo: r.GRUPO_ECONOMICO || r.NOME, valor: r.VALOR })), 0);
  const total = r2(rows.reduce((s, r) => s + Number(r.VALOR || 0), 0));
  const acimaDoMaximo = teto === null ? [] : [
    ...cli.linhas.filter((l) => l.pct > teto).map((l) => ({ tipo: 'CLIENTE', chave: l.chave, rotulo: l.rotulo, valor: l.valor, pct: l.pct })),
    ...grp.linhas.filter((l) => l.chave.startsWith('G:') && l.pct > teto).map((l) => ({ tipo: 'GRUPO', chave: l.chave.slice(2), rotulo: l.rotulo, valor: l.valor, pct: l.pct })),
  ];
  return {
    total, clientes: cli.quantidade,
    porCliente: { ...cli, linhas: cli.linhas.slice(0, 10) },
    porGrupo: { ...grp, linhas: grp.linhas.slice(0, 10) },
    porRegiao: recorteDe(rows.map((r) => ({ chave: regiaoDaUf(r.UF), rotulo: regiaoDaUf(r.UF), valor: r.VALOR }))),
    porBu: comBu ? recorteDe(rows.map((r) => ({ chave: String(r.BU_ID), rotulo: nomesBu.get(Number(r.BU_ID)) || 'Sem BU', valor: r.VALOR }))) : null,
    top10: cli.linhas.slice(0, 10),
    acimaDoMaximo,
  };
}

async function nomesDasBus() {
  return new Map((await ler('SELECT ID, NOME FROM CC_BU')).map((b) => [Number(b.ID), b.NOME]));
}

const FUNCOES = [abrir, sqlLinhas, fonteDoMes, sqlAgregados, posicaoDe, estadoDaLeitura, fotoPendenteDe, linhasDeLimite, concentrar, nomesDasBus]
  .map(String).join('\n');
const FUNCOES_CONST = `const membroA = ${membroA};\nconst filtros = ${filtros};\nconst recorte = ${recorte};`;

/** Corpo de SF JAVASCRIPT: preâmbulo + UTIL + cálculo + templates + funções + a função. */
const sf = (fn) => js([UTIL, FONTE_CALCULO, TEMPLATES, FUNCOES_CONST, FUNCOES, `return await (${fn})();`].join('\n'));

/* ── leituras JAVASCRIPT ── */

const corpoPosicao = async () => {
  const a = await abrir();
  if (a.erro) return a.erro;
  const { m, f } = a;
  const p = await parametros('');
  const metas = Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith('meta.')));
  const sincronizacao = await estadoDaLeitura(p);
  const fotoPendente = await fotoPendenteDe(f.corrente);
  const zero = posicaoDe(null, true);
  const vazio = { ok: true, mes: f.mes, origem: 'SEM', posicaoEm: null, ...zero, anterior: null, porCarteira: [], porBu: [], metas, sincronizacao, fotoPendente };
  const fonte = await fonteDoMes(f);
  if (!fonte.linhas) {
    const [manual] = !f.futuro && f.consolidada ? await ler(`SELECT * FROM CC_FECHAMENTO WHERE MES = ${q(f.mes)}`) : [];
    if (!manual) return vazio;
    const total = r2(manual.TOTAL);
    const vencido = r2(manual.VENCIDO);
    const vencido90 = r2(manual.VENCIDO_90);
    return { ...vazio, origem: 'MANUAL', posicaoEm: manual.ATUALIZADO_EM || manual.LANCADO_EM, total, aVencer: r2(total - vencido), vencido, vencido90,
      pdd: r2(manual.PDD), inadPct: pct(vencido, total), vencido90Pct: pct(vencido90, total) };
  }
  const agenteId = inteiro(event.agenteId);
  const extra = agenteId > 0 ? ` AND B.AGENTE_ID = ${agenteId}` : '';
  const [tot] = await ler(sqlAgregados(fonte.linhas, f, m, fonte.data, '', extra));
  const porCarteira = (await ler(sqlAgregados(fonte.linhas, f, m, fonte.data, 'B.CARTEIRA', extra)))
    .map((l) => ({ chave: l.CHAVE, rotulo: { PRIVADA: 'Privada', ESTETICA: 'Estética', PUBLICA: 'Pública' }[l.CHAVE] || l.CHAVE, ...posicaoDe(l, false) }))
    .sort((x, y) => ['PRIVADA', 'ESTETICA', 'PUBLICA'].indexOf(x.chave) - ['PRIVADA', 'ESTETICA', 'PUBLICA'].indexOf(y.chave));
  const nomes = await nomesDasBus();
  const porBu = (await ler(sqlAgregados(fonte.linhas, f, m, fonte.data, 'B.BU_ID', extra)))
    .map((l) => ({ chave: Number(l.CHAVE), rotulo: nomes.get(Number(l.CHAVE)) || 'Sem BU', ...posicaoDe(l, false) }))
    .sort((x, y) => x.chave - y.chave);
  // Fechamento anterior: a foto com MES_SEGUINTE = mês, no mesmo recorte; sem ela, o manual na visão consolidada.
  const [ant] = await ler(`SELECT COUNT(*) AS N, COALESCE(SUM(B.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(B.A_VENCER + B.VENCIDO), 0) AS TOTAL
FROM ${sqlLinhas(`F.MES_SEGUINTE = ${q(f.mes)}`, '', '')} B ${membroA(m)} WHERE ${T_VIS} AND ${filtros(f)}${extra}`);
  let anterior = null;
  if (ant && Number(ant.N)) anterior = { mes: mesAnterior(f.mes), vencido: r2(ant.VENCIDO), inadPct: pct(ant.VENCIDO, ant.TOTAL) };
  else if (f.consolidada) {
    const [man] = await ler(`SELECT VENCIDO, TOTAL FROM CC_FECHAMENTO WHERE MES = ${q(mesAnterior(f.mes))}`);
    if (man) anterior = { mes: mesAnterior(f.mes), vencido: r2(man.VENCIDO), inadPct: pct(man.VENCIDO, man.TOTAL), manual: true };
  }
  return {
    ...vazio, origem: fonte.origem, posicaoEm: fonte.origem === 'FOTO' ? fonte.em : sincronizacao.em,
    ...posicaoDe(tot, true), anterior, porCarteira, porBu,
  };
};

const corpoSerie = async () => {
  const a = await abrir();
  if (a.erro) return a.erro;
  const { m, f } = a;
  const ateTxt = String(event.ate ?? '').trim();
  if (ateTxt && !/^\d{4}-(0[1-9]|1[0-2])$/.test(ateTxt)) return recusar('Mês final inválido: use AAAA-MM.');
  const n = Math.min(24, Math.max(1, inteiro(event.meses) || 12));
  const ate = (ateTxt || f.corrente) > f.corrente ? f.corrente : (ateTxt || f.corrente);
  const de = somarMes(ate, 1 - n);
  const comVivo = ate === f.corrente;
  const linhas = sqlLinhas(`F.MES >= ${q(de)} AND F.MES <= ${q(ate)}${comVivo ? ` AND F.MES <> ${q(f.corrente)}` : ''}`, comVivo ? f.corrente : '', hoje());
  const agregados = await ler(`SELECT X.MES, COUNT(*) AS LINHAS, SUM(X.TOTAL) AS TOTAL, SUM(X.VENCIDO) AS VENCIDO, SUM(X.V90) AS VENCIDO_90, SUM(X.PDD) AS PDD,
  SUM(X.INI) AS VENCIDO_INICIAL, SUM(X.GERADA) AS GERADA, SUM(X.REC) AS RECUPERADO, SUM(X.BAIX) AS BAIXADO,
  SUM(CASE WHEN X.INI = 0 AND X.VENCIDO > 0 THEN 1 ELSE 0 END) AS ENTRARAM,
  SUM(CASE WHEN X.INI > 0 AND X.VENCIDO = 0 AND X.BAIX = 0 THEN 1 ELSE 0 END) AS REGULARIZADOS,
  SUM(CASE WHEN X.BAIX > 0 THEN 1 ELSE 0 END) AS BAIXADOS
FROM (SELECT B.MES, B.CLIENTE_ID, SUM(B.A_VENCER + B.VENCIDO) AS TOTAL, SUM(B.VENCIDO) AS VENCIDO, SUM(B.V_91_180 + B.V_180) AS V90, SUM(B.PDD) AS PDD,
    SUM(B.VENCIDO_INICIAL) AS INI, SUM(B.GERADA) AS GERADA, SUM(B.RECUPERADO) AS REC, SUM(B.BAIXADO) AS BAIX
  FROM ${linhas} B ${membroA(m)} WHERE ${T_VIS} AND ${filtros(f)} GROUP BY B.MES, B.CLIENTE_ID) X
GROUP BY X.MES`);
  const porMes = new Map(agregados.map((l) => [l.MES, l]));
  const fotos = new Map((await ler(`SELECT MES, MAX(SINCRONIZACAO_EM) AS EM FROM CC_FOTO_AGING WHERE MES >= ${q(mesAnterior(de))} AND MES <= ${q(ate)} GROUP BY MES`))
    .map((l) => [l.MES, l.EM]));
  const manuais = f.consolidada
    ? new Map((await ler(`SELECT * FROM CC_FECHAMENTO WHERE MES >= ${q(mesAnterior(de))} AND MES <= ${q(ate)}`)).map((l) => [l.MES, l])) : new Map();
  const promessas = new Map((await ler(`SELECT SUBSTRING(PR.DATA_PROMETIDA, 1, 7) AS MES, COUNT(*) AS N,
  SUM(CASE WHEN PR.SITUACAO = 'CUMPRIDA' THEN 1 ELSE 0 END) AS CUMPRIDAS, SUM(CASE WHEN PR.SITUACAO = 'QUEBRADA' THEN 1 ELSE 0 END) AS QUEBRADAS
FROM CC_PROMESSA PR JOIN CC_CLIENTE C ON C.ID = PR.CLIENTE_ID ${membroA(m)} LEFT JOIN CC_COBRANCA CB ON CB.ID = PR.COBRANCA_ID
WHERE PR.DATA_PROMETIDA >= ${q(`${de}-01`)} AND PR.DATA_PROMETIDA <= ${q(`${ate}-31`)} AND ${T_VIS_C} AND ${recorte(f, 'C.ID', "COALESCE(CB.CARTEIRA, '')")}
GROUP BY SUBSTRING(PR.DATA_PROMETIDA, 1, 7)`)).map((l) => [l.MES, l]));
  const saida = [];
  for (let mes = de; mes <= ate; mes = mesSeguinte(mes)) {
    const pr = promessas.get(mes);
    const prom = { PROMESSAS: Number(pr ? pr.N : 0), PROMESSAS_CUMPRIDAS: Number(pr ? pr.CUMPRIDAS : 0), PROMESSAS_QUEBRADAS: Number(pr ? pr.QUEBRADAS : 0) };
    const ant = mesAnterior(mes);
    if (mes === f.corrente || fotos.has(mes)) {
      const l = porMes.get(mes) || {};
      const v = (k) => r2(l[k]);
      const temBase = fotos.has(ant);
      const manualAnt = !temBase ? manuais.get(ant) : null;
      const linha = {
        MES: mes, TOTAL: v('TOTAL'), VENCIDO: v('VENCIDO'), VENCIDO_90: v('VENCIDO_90'), PDD: v('PDD'),
        VENCIDO_INICIAL: temBase ? v('VENCIDO_INICIAL') : null, GERADA: temBase ? v('GERADA') : null, RECUPERADO: v('RECUPERADO'), BAIXADO: v('BAIXADO'),
        ENTRARAM: temBase ? Number(l.ENTRARAM || 0) : null, REGULARIZADOS: temBase ? Number(l.REGULARIZADOS || 0) : null, BAIXADOS: Number(l.BAIXADOS || 0),
        ...prom, ESTIMADO: 0, FOTO_EM: mes === f.corrente ? null : fotos.get(mes), ORIGEM: mes === f.corrente ? 'ATUAL' : 'FOTO',
      };
      if (manualAnt) Object.assign(linha, { VENCIDO_INICIAL: r2(manualAnt.VENCIDO), GERADA: geradaEstimada(linha.VENCIDO, manualAnt.VENCIDO, linha.RECUPERADO), ESTIMADO: 1 });
      saida.push(linha);
    } else if (manuais.has(mes)) {
      const x = manuais.get(mes);
      saida.push({ MES: mes, TOTAL: r2(x.TOTAL), VENCIDO: r2(x.VENCIDO), VENCIDO_90: r2(x.VENCIDO_90), PDD: r2(x.PDD), VENCIDO_INICIAL: null, GERADA: null,
        RECUPERADO: null, BAIXADO: null, ENTRARAM: null, REGULARIZADOS: null, BAIXADOS: null, ...prom, ESTIMADO: 0, FOTO_EM: null, ORIGEM: 'MANUAL' });
    }
  }
  return { ok: true, de, ate, linhas: saida };
};

const corpoCredito = async () => {
  const a = await abrir();
  if (a.erro) return a.erro;
  const { m, f } = a;
  const hojeData = hoje();
  const MA = membroA(m);
  const fonte = await fonteDoMes(f);
  const CART = ['PRIVADA', 'ESTETICA', 'PUBLICA'];
  const porChave = (rows) => new Map(rows.map((l) => [String(l.CHAVE), l]));
  let tot = null;
  let porCart = new Map();
  let porBuRows = [];
  let ratings = [];
  if (fonte.linhas) {
    const DE = `FROM ${fonte.linhas} B ${MA} LEFT JOIN CC_RISCO_CLIENTE R ON R.CLIENTE_ID = B.CLIENTE_ID WHERE ${T_VIS} AND ${filtros(f)}`;
    const SOMAS = `COALESCE(SUM(B.A_VENCER + B.VENCIDO), 0) AS UTILIZADO, COALESCE(SUM(B.VENCIDO), 0) AS VENCIDO,
  COUNT(DISTINCT CASE WHEN B.A_VENCER + B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES,
  COUNT(DISTINCT CASE WHEN B.A_VENCER + B.VENCIDO > 0 AND R.CRITICIDADE = 'CRITICO' THEN B.CLIENTE_ID END) AS CRITICOS`;
    [tot] = await ler(`SELECT COUNT(*) AS CLIENTES, COALESCE(SUM(X.L), 0) AS LIMITE, COALESCE(SUM(X.U), 0) AS UTILIZADO, COALESCE(SUM(X.V), 0) AS VENCIDO,
  COALESCE(SUM(X.U * X.PRAZO), 0) AS PMR_NUM, COALESCE(SUM(X.PRAZO), 0) AS PRAZO_SOMA
FROM (SELECT B.CLIENTE_ID, MAX(B.LIMITE_CLIENTE) AS L, SUM(B.A_VENCER + B.VENCIDO) AS U, SUM(B.VENCIDO) AS V, MAX(COALESCE(PC.PRAZO_MEDIO_DIAS, 0)) AS PRAZO
  FROM ${fonte.linhas} B ${MA} LEFT JOIN CC_POSICAO_CLIENTE PC ON PC.CLIENTE_ID = B.CLIENTE_ID
  WHERE ${T_VIS} AND ${filtros(f)} GROUP BY B.CLIENTE_ID HAVING SUM(B.A_VENCER + B.VENCIDO) > 0) X`);
    porCart = porChave(await ler(`SELECT B.CARTEIRA AS CHAVE, ${SOMAS} ${DE} GROUP BY B.CARTEIRA`));
    porBuRows = await ler(`SELECT B.BU_ID AS CHAVE, ${SOMAS} ${DE} GROUP BY B.BU_ID`);
    // "Sem rating" é uma linha só (pública e privada juntas, clientes distintos).
    ratings = await ler(`SELECT MAX(X.PUB) AS PUB, X.RATING, COALESCE(SUM(X.S), 0) AS SALDO, COUNT(DISTINCT X.CLIENTE_ID) AS CLIENTES FROM (
  SELECT B.CLIENTE_ID, CASE WHEN B.CARTEIRA = 'PUBLICA' THEN 1 ELSE 0 END AS PUB, B.A_VENCER + B.VENCIDO AS S,
    CASE WHEN B.CARTEIRA = 'PUBLICA' THEN COALESCE(
      (SELECT AO.RATING_PUB FROM CC_CREDITO CR JOIN CC_ANALISE_ORGAO AO ON AO.ID = CR.ANALISE_ORGAO_ID WHERE CR.VIGENTE_CHAVE = B.CLIENTE_ID),
      (SELECT AO2.RATING_PUB FROM CC_ANALISE_ORGAO AO2 JOIN CC_SOLICITACAO S2 ON S2.ID = AO2.SOLICITACAO_ID WHERE AO2.CLIENTE_ID = B.CLIENTE_ID
         AND S2.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA') ORDER BY S2.DECIDIDA_EM DESC, AO2.ID DESC LIMIT 1), '')
    ELSE COALESCE(R.RATING_ATUAL, '') END AS RATING
  ${DE} AND B.A_VENCER + B.VENCIDO > 0) X
GROUP BY CASE WHEN X.RATING = '' THEN -1 ELSE X.PUB END, X.RATING`);
  }
  // Decisões do mês (pela data da decisão) e em análise hoje, por carteira; o filtro de BU não se aplica (D-09).
  const decisoes = porChave(await ler(`SELECT S.CARTEIRA AS CHAVE,
  ${[['APROVADAS', "IN ('APROVADA', 'PRE_APROVADA')", '1'], ['RECUSADAS', "= 'RECUSADA'", '1'], ['VALOR_APROVADO', "IN ('APROVADA', 'PRE_APROVADA')", 'S.VALOR'],
    ['VALOR_RECUSADO', "= 'RECUSADA'", 'S.VALOR'], ['CONCEDIDO', "IN ('APROVADA', 'PRE_APROVADA')", 'COALESCE(D.LIMITE_APROVADO, 0)']]
    .map(([nome, cond, valor]) => `COALESCE(SUM(CASE WHEN S.DECIDIDA_EM IS NOT NULL AND SUBSTRING(S.DECIDIDA_EM, 1, 7) = ${q(f.mes)} AND S.DECISAO_RESULTADO ${cond} THEN ${valor} ELSE 0 END), 0) AS ${nome}`).join(',\n  ')},
  COALESCE(SUM(CASE WHEN S.DECISAO_RESULTADO = '' AND S.ENCERRADA_EM IS NULL THEN 1 ELSE 0 END), 0) AS EM_ANALISE,
  COALESCE(SUM(CASE WHEN S.DECISAO_RESULTADO = '' AND S.ENCERRADA_EM IS NULL THEN S.VALOR ELSE 0 END), 0) AS EM_ANALISE_VALOR,
  COALESCE(SUM(CASE WHEN S.DECISAO_RESULTADO = '' AND S.ENCERRADA_EM IS NULL AND S.PRAZO_DECISAO < ${q(hojeData)} THEN 1 ELSE 0 END), 0) AS FORA_DO_PRAZO
FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${MA} LEFT JOIN CC_DECISAO D ON D.ID = S.DECISAO_ID
WHERE ${T_VIS_C} AND (${q(f.carteira)} = '' OR S.CARTEIRA = ${q(f.carteira)})
GROUP BY S.CARTEIRA`));
  const retidos = porChave(await ler(`SELECT X.CHAVE, COUNT(*) AS N, COALESCE(SUM(X.VALOR), 0) AS VALOR FROM (
  SELECT COALESCE(CR.CARTEIRA, CASE WHEN C.SETOR = 'PUBLICO' THEN 'PUBLICA' ELSE 'PRIVADA' END) AS CHAVE, PR.VALOR
  FROM CC_PEDIDO_RETIDO PR JOIN CC_CLIENTE C ON C.ID = PR.CLIENTE_ID ${MA} LEFT JOIN CC_CREDITO CR ON CR.ID = PR.CREDITO_ID
  WHERE PR.DECISAO_RESULTADO = '' AND ${T_VIS_C}) X GROUP BY X.CHAVE`));
  const [venc] = await ler(`SELECT COUNT(*) AS N FROM CC_CREDITO CR JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID ${MA}
WHERE CR.VIGENTE_CHAVE IS NOT NULL AND CR.FIM_VALIDADE >= ${q(hojeData)} AND DATEDIFF(CR.FIM_VALIDADE, ${q(hojeData)}) <= 30 AND ${T_VIS_C}
  AND (${q(f.carteira)} = '' OR CR.CARTEIRA = ${q(f.carteira)})`);
  const num = (mapa, chave, col) => r2(mapa.get(chave) ? mapa.get(chave)[col] : 0);
  const porCarteira = CART.filter((c) => !f.carteira || c === f.carteira).map((c) => ({
    carteira: c, emAnalise: num(decisoes, c, 'EM_ANALISE'), foraDoPrazo: num(decisoes, c, 'FORA_DO_PRAZO'), aprovadas: num(decisoes, c, 'APROVADAS'),
    recusadas: num(decisoes, c, 'RECUSADAS'), valorAprovado: num(decisoes, c, 'VALOR_APROVADO'), valorRecusado: num(decisoes, c, 'VALOR_RECUSADO'),
    concedido: num(decisoes, c, 'CONCEDIDO'), utilizado: num(porCart, c, 'UTILIZADO'), vencido: num(porCart, c, 'VENCIDO'),
    criticos: num(porCart, c, 'CRITICOS'), pedidosRetidos: num(retidos, c, 'N'),
  }));
  const soma = (k) => r2(porCarteira.reduce((s, x) => s + x[k], 0));
  const nomes = await nomesDasBus();
  const limite = r2(tot ? tot.LIMITE : 0);
  const utilizado = r2(tot ? tot.UTILIZADO : 0);
  const clientes = Number(tot ? tot.CLIENTES : 0) || 0;
  return {
    ok: true, mes: f.mes, origem: fonte.origem, limite, utilizado, usoPct: pct(utilizado, limite),
    emAnalise: { qtd: soma('emAnalise'), valor: r2(CART.reduce((s, c) => s + (!f.carteira || c === f.carteira ? num(decisoes, c, 'EM_ANALISE_VALOR') : 0), 0)), foraDoPrazo: soma('foraDoPrazo') },
    porCarteira,
    porRating: ratings.map((l) => ({ grupo: !l.RATING ? 'SEM' : (Number(l.PUB) ? 'PUBLICO' : 'PRIVADO'), rating: l.RATING || '', saldo: r2(l.SALDO), clientes: Number(l.CLIENTES) }))
      .sort((x, y) => ['PRIVADO', 'PUBLICO', 'SEM'].indexOf(x.grupo) - ['PRIVADO', 'PUBLICO', 'SEM'].indexOf(y.grupo) || x.rating.localeCompare(y.rating)),
    porBu: porBuRows.map((l) => ({ buId: Number(l.CHAVE), nome: nomes.get(Number(l.CHAVE)) || 'Sem BU', clientes: Number(l.CLIENTES), utilizado: r2(l.UTILIZADO),
      vencido: r2(l.VENCIDO), criticos: Number(l.CRITICOS) })).sort((x, y) => x.buId - y.buId),
    pmrDias: utilizado > 0 ? r2((tot ? tot.PMR_NUM : 0) / utilizado) : null,
    prazoMedioDias: clientes ? r2((tot ? tot.PRAZO_SOMA : 0) / clientes) : null,
    vencendo: Number(venc ? venc.N : 0), pedidosRetidos: soma('pedidosRetidos'),
  };
};

const corpoConcentracao = async () => {
  const a = await abrir();
  if (a.erro) return a.erro;
  const { m, f } = a;
  const base = String(event.base || 'VENCIDO').toUpperCase() === 'LIMITE' ? 'LIMITE' : 'VENCIDO';
  const p = await parametros('');
  let rows = [];
  let origem = 'ATUAL';
  if (base === 'LIMITE') rows = await linhasDeLimite(m, f);
  else {
    const fonte = await fonteDoMes(f);
    origem = fonte.origem;
    if (fonte.linhas) {
      rows = await ler(`SELECT B.CLIENTE_ID, C.CODCLI, C.NOME, B.GRUPO_ECONOMICO, B.UF, B.BU_ID, SUM(B.VENCIDO) AS VALOR
FROM ${fonte.linhas} B ${membroA(m)} JOIN CC_CLIENTE C ON C.ID = B.CLIENTE_ID
WHERE ${T_VIS} AND ${filtros(f)} AND B.VENCIDO > 0 GROUP BY B.CLIENTE_ID, C.CODCLI, C.NOME, B.GRUPO_ECONOMICO, B.UF, B.BU_ID`);
    }
  }
  const teto = base === 'LIMITE' ? Number(p['limite.concMax']) : null;
  return { ok: true, base, mes: f.mes, origem, ...concentrar(rows, p, await nomesDasBus(), base === 'VENCIDO', teto) };
};

const corpoSaude = async () => {
  const a = await abrir();
  if (a.erro) return a.erro;
  const { m, f } = a;
  const p = await parametros('');
  // Universo e carteira como a concessão (ccCredSaudeResumo): risco com saúde e crédito vigente; sem regra própria (RN-012).
  const DE = `FROM CC_RISCO_CLIENTE R JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID ${membroA(m)}
JOIN CC_CREDITO CR ON CR.ID = R.CREDITO_ID
LEFT JOIN CC_SOLICITACAO S ON S.ID = R.SOLICITACAO_ID
LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = R.CLIENTE_ID
WHERE ${T_VIS_C} AND CR.VIGENTE_CHAVE IS NOT NULL AND R.SAUDE <> '' AND C.SETOR <> 'PUBLICO'
  AND ${recorte(f, 'C.ID', "COALESCE(S.CARTEIRA, '')")}`;
  const por = new Map((await ler(`SELECT R.SAUDE AS NIVEL, COUNT(*) AS CLIENTES, COALESCE(SUM(P.UTILIZADO), 0) AS SALDO ${DE} GROUP BY R.SAUDE`))
    .map((l) => [l.NIVEL, l]));
  const niveis = [];
  for (const nivel of ['SAUDAVEL', 'ATENCAO', 'RISCO']) {
    const maiores = await ler(`SELECT C.ID, C.NOME, R.SAUDE_SINAIS, COALESCE(P.UTILIZADO, 0) AS SALDO ${DE} AND R.SAUDE = ${q(nivel)}
ORDER BY COALESCE(P.UTILIZADO, 0) DESC, C.ID LIMIT 4`);
    const l = por.get(nivel);
    niveis.push({ nivel, clientes: Number(l ? l.CLIENTES : 0), saldo: r2(l ? l.SALDO : 0),
      maiores: maiores.map((x) => ({ clienteId: Number(x.ID), nome: x.NOME, sinais: x.SAUDE_SINAIS || '', saldo: r2(x.SALDO) })) });
  }
  const total = niveis.reduce((s, x) => s + x.clientes, 0);
  const indice = total ? r2((niveis[0].clientes * 100) / total) : null;
  const faixa = indice === null ? null : indice >= Number(p['saude.indiceVerde']) ? 'VERDE' : indice < Number(p['saude.indiceVermelho']) ? 'VERMELHO' : 'AMARELO';
  return { ok: true, indice, faixa, niveis };
};

const corpoAtencao = async () => {
  const a = await abrir();
  if (a.erro) return a.erro;
  const { m } = a;
  const f = { ...a.f, mes: a.f.corrente, futuro: false };
  const p = await parametros('');
  const hojeData = hoje();
  const MA = membroA(m);
  const brl = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pctBr = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); // vírgula decimal no texto
  const itens = [];
  const add = (tipo, texto, quantidade, valor, gravidade) => {
    if (Number(quantidade) > 0) itens.push({ tipo, texto, quantidade: Number(quantidade), valor: valor === null ? null : r2(valor), gravidade });
  };
  // Posição de hoje no recorte (RN-002) contra o alerta da política.
  const fonte = await fonteDoMes(f);
  const pos = posicaoDe((await ler(sqlAgregados(fonte.linhas, f, m, fonte.data, '', '')))[0], true);
  if (pos.inadPct !== null && pos.inadPct > Number(p['meta.inadIndiceAlerta'])) {
    add('INAD_ACIMA_ALERTA', `Inadimplência de ${pctBr(pos.inadPct)}% acima do alerta de ${pctBr(p['meta.inadIndiceAlerta'])}%`, pos.clientesAtraso, pos.vencido, 'ALTA');
  }
  // Concentração de limites acima do teto (RN-022).
  const conc = concentrar(await linhasDeLimite(m, f), p, new Map(), false, Number(p['limite.concMax']));
  add('CONCENTRACAO', `Clientes e grupos acima de ${pctBr(p['limite.concMax'])}% dos limites`, conc.acimaDoMaximo.length,
    conc.acimaDoMaximo.filter((x) => x.tipo === 'CLIENTE').reduce((s, x) => s + x.valor, 0), 'MEDIA');
  // Contagens registro a registro nas tabelas dos donos (só o que eles gravaram).
  const CART_CLIENTE = "COALESCE((SELECT CRV.CARTEIRA FROM CC_CREDITO CRV WHERE CRV.VIGENTE_CHAVE = C.ID), CASE WHEN C.SETOR = 'PUBLICO' THEN 'PUBLICA' ELSE 'PRIVADA' END)";
  const conta = (tipo, valor, de, onde, cart) => `SELECT '${tipo}' AS TIPO, COUNT(*) AS QTD, COALESCE(SUM(${valor}), 0) AS VALOR ${de} ${MA}
WHERE ${T_VIS_C} AND ${onde} AND ${recorte(f, 'C.ID', cart)}`;
  const contagens = await ler([
    conta('LIMITE_VENCIDO', 'CR.LIMITE', 'FROM CC_CREDITO CR JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID',
      `CR.VIGENTE_CHAVE IS NOT NULL AND CR.FIM_VALIDADE < ${q(hojeData)}`, 'CR.CARTEIRA'),
    conta('CLIENTE_CRITICO', 'COALESCE(P.UTILIZADO, 0)', 'FROM CC_RISCO_CLIENTE R JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = C.ID',
      "R.CRITICIDADE = 'CRITICO'", CART_CLIENTE),
    conta('CLIENTE_EM_RISCO', 'COALESCE(P.UTILIZADO, 0)', 'FROM CC_RISCO_CLIENTE R JOIN CC_CLIENTE C ON C.ID = R.CLIENTE_ID LEFT JOIN CC_POSICAO_CLIENTE P ON P.CLIENTE_ID = C.ID',
      "R.SAUDE = 'RISCO'", CART_CLIENTE),
    conta('BLOQUEIO_NAO_APLICADO', 'COALESCE(PX.VENCIDO, 0)', `FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
  LEFT JOIN CC_POSICAO_CLIENTE_CARTEIRA PX ON PX.CLIENTE_ID = CB.CLIENTE_ID AND PX.CARTEIRA = CB.CARTEIRA`,
      'CB.ENCERRADO_EM IS NULL AND CB.BLOQUEIO_DEVIDO <> CB.BLOQUEIO_APLICADO', 'CB.CARTEIRA'),
    conta('ACORDO_QUEBRADO', 'AC.VALOR', 'FROM CC_ACORDO AC JOIN CC_CLIENTE C ON C.ID = AC.CLIENTE_ID',
      `AC.SITUACAO = 'QUEBRADO' AND SUBSTRING(AC.ENCERRADO_EM, 1, 7) = ${q(f.corrente)}`, 'AC.CARTEIRA'),
    conta('BAIXA_PENDENTE', 'BX.VALOR', 'FROM CC_BAIXA BX JOIN CC_COBRANCA CB ON CB.ID = BX.COBRANCA_ID JOIN CC_CLIENTE C ON C.ID = BX.CLIENTE_ID',
      "BX.SITUACAO = 'PENDENTE'", 'CB.CARTEIRA'),
    conta('SOLICITACAO_FORA_PRAZO', 'S.VALOR', 'FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID',
      `S.DECISAO_RESULTADO = '' AND S.ENCERRADA_EM IS NULL AND S.PRAZO_DECISAO < ${q(hojeData)}`, 'S.CARTEIRA'),
    conta('PEDIDO_RETIDO', 'PR.VALOR', 'FROM CC_PEDIDO_RETIDO PR JOIN CC_CLIENTE C ON C.ID = PR.CLIENTE_ID LEFT JOIN CC_CREDITO CR ON CR.ID = PR.CREDITO_ID',
      "PR.DECISAO_RESULTADO = ''", "COALESCE(CR.CARTEIRA, CASE WHEN C.SETOR = 'PUBLICO' THEN 'PUBLICA' ELSE 'PRIVADA' END)"),
  ].join('\nUNION ALL\n'));
  const TEXTOS = {
    LIMITE_VENCIDO: ['Limites com validade vencida', 'MEDIA'], CLIENTE_CRITICO: ['Clientes críticos', 'ALTA'], CLIENTE_EM_RISCO: ['Clientes em risco', 'MEDIA'],
    BLOQUEIO_NAO_APLICADO: ['Bloqueios devidos e não aplicados', 'ALTA'], ACORDO_QUEBRADO: ['Acordos quebrados no mês', 'MEDIA'],
    BAIXA_PENDENTE: ['Baixas aguardando decisão', 'MEDIA'], SOLICITACAO_FORA_PRAZO: ['Solicitações de crédito fora do prazo', 'MEDIA'],
    PEDIDO_RETIDO: ['Pedidos retidos aguardando decisão', 'ALTA'],
  };
  for (const l of contagens) add(l.TIPO, `${TEXTOS[l.TIPO][0]}: ${Number(l.QTD)} · ${brl(l.VALOR)}`, l.QTD, l.VALOR, TEXTOS[l.TIPO][1]);
  // Foto mensal e leitura do Winthor (C-006, RN-021).
  const pendente = await fotoPendenteDe(f.corrente);
  if (pendente) add('FOTO_PENDENTE', `Foto de ${pendente.slice(5)}/${pendente.slice(0, 4)} pendente`, 1, null, 'MEDIA');
  const leitura = await estadoDaLeitura(p);
  if (leitura.atrasada) add('LEITURA_ATRASADA', `Dados do Winthor desatualizados desde ${String(leitura.em).slice(11, 16)}`, 1, null, 'ALTA');
  const ordem = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
  return itens.sort((x, y) => ordem[x.gravidade] - ordem[y.gravidade]);
};

/* ── escrita: fechamento manual (forma A) ── */

const corpoFechamentoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!podeAdministrar(m)) return recusar('Sem permissão: só Gerente, Diretoria ou Administrador lançam o fechamento manual.');
  const mes = String(event.mes ?? '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return recusar('Informe o mês como AAAA-MM.');
  if (mes >= hoje().slice(0, 7)) return recusar('O mês ainda não fechou: só se lança mês anterior ao corrente.');
  const [foto] = await ler(`SELECT COUNT(*) AS N FROM CC_FOTO_AGING WHERE MES = ${q(mes)}`);
  if (Number(foto.N)) return recusar('Este mês já tem a foto do fechamento; a foto prevalece.');
  const v = { total: numero(event.total), vencido: numero(event.vencido), vencido90: numero(event.vencido90), pdd: numero(event.pdd) };
  if (Object.values(v).some((x) => !Number.isFinite(x) || x < 0)) return recusar('Informe carteira, vencido, vencido acima de 90 dias e PDD, todos maiores ou iguais a zero.');
  if (v.vencido > v.total) return recusar('O vencido não pode ser maior que a carteira.');
  if (v.vencido90 > v.vencido) return recusar('O vencido acima de 90 dias não pode ser maior que o vencido.');
  if (v.pdd > v.total) return recusar('A PDD não pode ser maior que a carteira.');
  const valores = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, r2(x).toFixed(2)]));
  const [antes] = await ler(`SELECT * FROM CC_FECHAMENTO WHERE MES = ${q(mes)}`);
  await escrever(antes ? 'ccEscPainelFechamentoAtualizar' : 'ccEscPainelFechamentoInserir', { mes, ...valores, membroId: m.membroId, agora: agora() });
  const [depois] = await ler(`SELECT * FROM CC_FECHAMENTO WHERE MES = ${q(mes)}`);
  const COLS = [['total', 'TOTAL', 'Carteira'], ['vencido', 'VENCIDO', 'Vencido'], ['vencido90', 'VENCIDO_90', 'Vencido acima de 90 dias'], ['pdd', 'PDD', 'PDD']];
  if (!depois || COLS.some(([k, c]) => r2(depois[c]).toFixed(2) !== valores[k])) return recusar(MSG.SEM_PERMISSAO);
  const campos = antes
    ? COLS.filter(([k, c]) => r2(antes[c]).toFixed(2) !== valores[k]).map(([k, c, nome]) => ({ campo: nome, antes: r2(antes[c]).toFixed(2), depois: valores[k] }))
    : [{ campo: '(criação)', antes: '', depois: `${mes}: carteira ${valores.total}; vencido ${valores.vencido}; acima de 90 dias ${valores.vencido90}; PDD ${valores.pdd}` }];
  if (campos.length) await auditar('Fechamento', 'FECHAMENTO', depois.ID, null, campos, m);
  return { ok: true, id: Number(depois.ID), mes };
};

/* ── rotina, passo FOTO (01 §11, RN-005) ── */

const corpoRotina = async () => {
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina agendada tira a foto do mês.');
  const fim = (processados) => ({ ok: true, pendentes: 0, execucoes: 1, processados });
  const id = inteiro(event.sincronizacaoId);
  const [l] = id ? await ler(`SELECT ID, SITUACAO, INICIO FROM CC_SINCRONIZACAO WHERE ID = ${id}`) : [];
  if (!l || l.SITUACAO !== 'OK' || !l.INICIO) return fim(0);
  const mesLeitura = String(l.INICIO).slice(0, 7);
  const mes = mesAnterior(mesLeitura);
  // Uma vez por mês; e só se o sistema já lia o Winthor antes deste mês (sem foto retroativa da implantação).
  const [c] = await ler(`SELECT CASE WHEN EXISTS (SELECT 1 FROM CC_FOTO_AGING WHERE MES = ${q(mes)}) THEN 1 ELSE 0 END AS FOTO,
  CASE WHEN EXISTS (SELECT 1 FROM CC_SINCRONIZACAO WHERE SITUACAO = 'OK' AND INICIO < ${q(`${mesLeitura}-01`)}) THEN 1 ELSE 0 END AS ANTES`);
  if (Number(c.FOTO) || !Number(c.ANTES)) return fim(0);
  const vivo = preencher(T_VIVO, { '#MES#': q(mes), '#DATA#': q(String(l.INICIO).slice(0, 10)), '#SEG#': q(mesLeitura), '#SINC#': id, '#SINCEM#': q(l.INICIO) });
  // Uma instrução: grava tudo ou nada; a UNIQUE (MES, CLIENTE_ID, BU_ID) cobre repetição (D-05 do plan).
  await sdk.runDmlMitra({ projectId, sql: `INSERT IGNORE INTO CC_FOTO_AGING (${COLUNAS_FOTO}) SELECT ${COLUNAS_FOTO} FROM (${vivo}) V` });
  const [n] = await ler(`SELECT COUNT(*) AS N FROM CC_FOTO_AGING WHERE MES = ${q(mes)}`);
  return fim(Number(n.N));
};

/* ── leituras SQL (EU; Jurídico não vê linha) ── */

const VIS = visivelNoPainel('B', 'EU');
const VIS_C = `EU.CARGO <> 'JURIDICO' AND ${clienteVisivel('C')}`;
const LINHAS = linhasDoMes(MES_REF);
const CARTEIRA_OK = (col) => `('{{carteira}}' = '' OR ${col} = '{{carteira}}')`;

// Roll rate (RN-010): origem = foto do fechamento anterior (faixa 0 a 4); destino = linhas do mês por cliente × BU.
// FAIXA_PARA −1 = sem saldo; 6 = baixado no mês e sem vencido. '' = maior mês com foto (04 §6).
const MES_RR = "(CASE WHEN '{{mes}}' = '' THEN (SELECT MAX(FM.MES) FROM CC_FOTO_AGING FM) ELSE '{{mes}}' END)";
const SQL_ROLL_RATE = `SELECT X.FAIXA_DE, X.FAIXA_PARA, COUNT(*) AS CLIENTES, COALESCE(SUM(X.VALOR), 0) AS VALOR, MAX(X.BASE_EM) AS BASE_EM
FROM (SELECT O.FAIXA AS FAIXA_DE, O.A_VENCER + O.VENCIDO AS VALOR, O.SINCRONIZACAO_EM AS BASE_EM,
    CASE WHEN COALESCE(D.BAIXADO, 0) > 0 AND COALESCE(D.VENCIDO, 0) = 0 THEN 6 WHEN D.CLIENTE_ID IS NULL THEN -1 ELSE D.FAIXA END AS FAIXA_PARA
  FROM CC_FOTO_AGING O
  ${EU}
  LEFT JOIN ${linhasDoMes(MES_RR)} D ON D.CLIENTE_ID = O.CLIENTE_ID AND D.BU_ID = O.BU_ID
  WHERE O.MES_SEGUINTE = ${MES_RR} AND O.FAIXA >= 0 AND O.FAIXA <= 4 AND EU.CARGO <> 'JURIDICO' AND ${membroVisivel('O.AGENTE_ID', 'EU')}
    AND ${filtrosDoPainel('O')}) X
GROUP BY X.FAIXA_DE, X.FAIXA_PARA
ORDER BY X.FAIXA_DE, X.FAIXA_PARA`;

// Crédito por mês (RN-020): abertas pela criação; decididas pela decisão (PRE_APROVADA = decidida e aprovada).
const MESES_N = "(CASE WHEN CAST('{{meses}}' AS SIGNED) > 24 THEN 24 WHEN CAST('{{meses}}' AS SIGNED) >= 1 THEN CAST('{{meses}}' AS SIGNED) ELSE 12 END)";
const ATE_REF = `(CASE WHEN '{{ate}}' = '' OR '{{ate}}' > ${MES_CORRENTE} THEN ${MES_CORRENTE} ELSE '{{ate}}' END)`;
const APROVADA = "S.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA')";
const SQL_SERIE_CREDITO = `SELECT E.MES, SUM(E.ABERTA) AS SOLICITACOES, SUM(E.DECIDIDA) AS DECIDIDAS, SUM(E.APROVADA) AS APROVADAS, SUM(E.RECUSADA) AS RECUSADAS,
  COALESCE(SUM(E.VALOR_APROVADO), 0) AS VALOR_APROVADO, COALESCE(SUM(E.VALOR_RECUSADO), 0) AS VALOR_RECUSADO, COALESCE(SUM(E.LIMITE), 0) AS LIMITE_CONCEDIDO,
  ROUND(SUM(E.DIAS) * 1.0 / NULLIF(SUM(E.DECIDIDA), 0), 2) AS TEMPO_MEDIO_DIAS, SUM(E.NO_PRAZO) AS NO_PRAZO
FROM (SELECT SUBSTRING(S.CRIADO_EM, 1, 7) AS MES, 1 AS ABERTA, 0 AS DECIDIDA, 0 AS APROVADA, 0 AS RECUSADA, 0 AS VALOR_APROVADO, 0 AS VALOR_RECUSADO,
    0 AS LIMITE, 0 AS DIAS, 0 AS NO_PRAZO
  FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${EU}
  WHERE ${VIS_C} AND ${CARTEIRA_OK('S.CARTEIRA')}
  UNION ALL
  SELECT SUBSTRING(S.DECIDIDA_EM, 1, 7), 0, 1, CASE WHEN ${APROVADA} THEN 1 ELSE 0 END, CASE WHEN S.DECISAO_RESULTADO = 'RECUSADA' THEN 1 ELSE 0 END,
    CASE WHEN ${APROVADA} THEN S.VALOR ELSE 0 END, CASE WHEN S.DECISAO_RESULTADO = 'RECUSADA' THEN S.VALOR ELSE 0 END,
    CASE WHEN ${APROVADA} THEN COALESCE(D.LIMITE_APROVADO, 0) ELSE 0 END,
    DATEDIFF(SUBSTRING(S.DECIDIDA_EM, 1, 10), SUBSTRING(S.CRIADO_EM, 1, 10)),
    CASE WHEN S.PRAZO_DECISAO IS NOT NULL AND SUBSTRING(S.DECIDIDA_EM, 1, 10) <= S.PRAZO_DECISAO THEN 1 ELSE 0 END
  FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID ${EU} LEFT JOIN CC_DECISAO D ON D.ID = S.DECISAO_ID
  WHERE ${VIS_C} AND ${CARTEIRA_OK('S.CARTEIRA')} AND S.DECIDIDA_EM IS NOT NULL AND S.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA', 'RECUSADA')) E
WHERE ${MES_INDICE('E.MES')} <= ${MES_INDICE(ATE_REF)} AND ${MES_INDICE('E.MES')} > ${MES_INDICE(ATE_REF)} - ${MESES_N}
GROUP BY E.MES
ORDER BY E.MES`;

// Por agente (RN-011, RF-015/018): somas das linhas do mês pelo agente da linha (mês passado: o da foto); contatos,
// promessas e ações pelo membro que os registrou, no mês. Cliente sem agente = linha 0 (só quem vê tudo).
const NO_MES = (col) => `SUBSTRING(${col}, 1, 7) = ${MES_REF}`;
// Registro (contato, promessa, ação) só de cliente visível a quem abre (RN-015): o `EU` repete dentro da derivada.
const SO_VISIVEL = (clienteCol) => `JOIN CC_CLIENTE CV ON CV.ID = ${clienteCol} ${EU} AND ${clienteVisivel('CV')}`;
const SQL_AGENTES = `SELECT G.AGENTE_ID, COALESCE(AG.NOME, 'Sem agente') AS AGENTE_NOME, COALESCE(SP.NOME, '') AS SUPERIOR_NOME,
  G.CLIENTES, G.CLIENTES_ATRASO, G.TOTAL, G.VENCIDO, G.VENCIDO_90, G.COBRADO, G.RECUPERADO, G.CLIENTES_COBRADOS,
  COALESCE(KC.N, 0) AS CONTATOS, COALESCE(PR.N, 0) AS PROMESSAS, COALESCE(PR.CUMPRIDAS, 0) AS PROMESSAS_CUMPRIDAS,
  COALESCE(PR.QUEBRADAS, 0) AS PROMESSAS_QUEBRADAS, COALESCE(AC.N, 0) AS ACOES, COALESCE(AC.NO_PRAZO, 0) AS ACOES_NO_PRAZO
FROM (SELECT COALESCE(B.AGENTE_ID, 0) AS AGENTE_ID,
    COUNT(DISTINCT CASE WHEN B.A_VENCER + B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES,
    COUNT(DISTINCT CASE WHEN B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES_ATRASO,
    COALESCE(SUM(B.A_VENCER + B.VENCIDO), 0) AS TOTAL, COALESCE(SUM(B.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(B.V_91_180 + B.V_180), 0) AS VENCIDO_90,
    COALESCE(SUM(B.VENCIDO_INICIAL + B.GERADA), 0) AS COBRADO, COALESCE(SUM(B.RECUPERADO), 0) AS RECUPERADO,
    COUNT(DISTINCT CASE WHEN B.VENCIDO_INICIAL + B.GERADA > 0 THEN B.CLIENTE_ID END) AS CLIENTES_COBRADOS
  FROM ${LINHAS} B ${EU}
  WHERE ${VIS} AND ${filtrosDoPainel('B')}
  GROUP BY COALESCE(B.AGENTE_ID, 0)) G
LEFT JOIN CC_MEMBRO AG ON AG.ID = G.AGENTE_ID
LEFT JOIN CC_MEMBRO SP ON SP.ID = AG.SUPERIOR_ID
LEFT JOIN (SELECT K.AGENTE_ID, COUNT(*) AS N FROM CC_CONTATO_COBRANCA K LEFT JOIN CC_COBRANCA CB ON CB.ID = K.COBRANCA_ID ${SO_VISIVEL('K.CLIENTE_ID')}
  WHERE ${NO_MES('K.DATA')} AND ${recorteDoCliente('K.CLIENTE_ID', "COALESCE(CB.CARTEIRA, '')")} GROUP BY K.AGENTE_ID) KC ON KC.AGENTE_ID = G.AGENTE_ID
LEFT JOIN (SELECT P.AGENTE_ID, COUNT(*) AS N, SUM(CASE WHEN P.SITUACAO = 'CUMPRIDA' THEN 1 ELSE 0 END) AS CUMPRIDAS,
    SUM(CASE WHEN P.SITUACAO = 'QUEBRADA' THEN 1 ELSE 0 END) AS QUEBRADAS
  FROM CC_PROMESSA P LEFT JOIN CC_COBRANCA CB ON CB.ID = P.COBRANCA_ID ${SO_VISIVEL('P.CLIENTE_ID')}
  WHERE ${NO_MES('P.DATA_PROMETIDA')} AND ${recorteDoCliente('P.CLIENTE_ID', "COALESCE(CB.CARTEIRA, '')")} GROUP BY P.AGENTE_ID) PR ON PR.AGENTE_ID = G.AGENTE_ID
LEFT JOIN (SELECT Y.MEMBRO_ID, COUNT(*) AS N, SUM(Y.NO_PRAZO) AS NO_PRAZO FROM (
    SELECT AR.FEITA_POR AS MEMBRO_ID, CASE WHEN AR.NO_PRAZO = TRUE THEN 1 ELSE 0 END AS NO_PRAZO
    FROM CC_ACAO_REGUA AR JOIN CC_COBRANCA CB ON CB.ID = AR.COBRANCA_ID ${SO_VISIVEL('AR.CLIENTE_ID')}
    WHERE ${NO_MES('AR.FEITA_EM')} AND ${recorteDoCliente('AR.CLIENTE_ID', 'CB.CARTEIRA')}
    UNION ALL
    SELECT NA.FEITO_POR, CASE WHEN NA.NO_PRAZO = TRUE THEN 1 ELSE 0 END
    FROM CC_NF_ACAO NA ${SO_VISIVEL('NA.CLIENTE_ID')} WHERE ${NO_MES('NA.FEITO_EM')} AND ${recorteDoCliente('NA.CLIENTE_ID', "'PUBLICA'")}) Y
  GROUP BY Y.MEMBRO_ID) AC ON AC.MEMBRO_ID = G.AGENTE_ID
ORDER BY G.VENCIDO DESC, G.AGENTE_ID`;

// Planos (RF-014): somas das linhas pelo plano da linha + faturamento dos 6 meses até o mês, da mesma linha cliente × BU.
// ponytail: faturamento de cliente × BU sem linha no mês fica de fora (só conta quem tem saldo ou movimento no mês).
const IDX_REF = MES_INDICE(MES_REF);
const SQL_PLANOS = `SELECT G.PLANO_COD, COALESCE(PL.DESCRICAO, '') AS DESCRICAO, COALESCE(PL.PRAZO_MEDIO, 0) AS PRAZO_MEDIO,
  G.CLIENTES, G.CLIENTES_ATRASO, G.TOTAL, G.A_VENCER, G.VENCIDO, ROUND(G.VDIAS * 1.0 / NULLIF(G.VENCIDO, 0), 2) AS ATRASO_MEDIO_DIAS,
  ${[0, 1, 2, 3, 4, 5].map((i) => `G.FAT_M${i}`).join(', ')}
FROM (SELECT B.PLANO_COD,
    COUNT(DISTINCT CASE WHEN B.A_VENCER + B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES,
    COUNT(DISTINCT CASE WHEN B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES_ATRASO,
    COALESCE(SUM(B.A_VENCER + B.VENCIDO), 0) AS TOTAL, COALESCE(SUM(B.A_VENCER), 0) AS A_VENCER, COALESCE(SUM(B.VENCIDO), 0) AS VENCIDO,
    COALESCE(SUM(B.VDIAS), 0) AS VDIAS,
    ${[0, 1, 2, 3, 4, 5].map((i) => `COALESCE(SUM(FT.M${i}), 0) AS FAT_M${i}`).join(', ')}
  FROM ${LINHAS} B ${EU}
  LEFT JOIN (SELECT FM.CLIENTE_ID, FM.BU_ID,
      ${[0, 1, 2, 3, 4, 5].map((i) => `SUM(CASE WHEN ${MES_INDICE('FM.MES')} = ${IDX_REF} - ${i} THEN FM.VALOR ELSE 0 END) AS M${i}`).join(', ')}
    FROM CC_FATURAMENTO_MES FM
    WHERE FM.MES <= ${MES_REF} AND FM.MES >= CONCAT(CAST(CAST(SUBSTRING(${MES_REF}, 1, 4) AS SIGNED) - 1 AS CHAR), SUBSTRING(${MES_REF}, 5, 3))
      AND ${MES_INDICE('FM.MES')} >= ${IDX_REF} - 5
    GROUP BY FM.CLIENTE_ID, FM.BU_ID) FT ON FT.CLIENTE_ID = B.CLIENTE_ID AND FT.BU_ID = B.BU_ID
  WHERE ${VIS} AND ${filtrosDoPainel('B')}
  GROUP BY B.PLANO_COD) G
LEFT JOIN CC_PLANO_PAGAMENTO PL ON PL.CODIGO = G.PLANO_COD
ORDER BY G.TOTAL DESC, G.PLANO_COD`;

// Equipe por nível (RN-019): cada linha soma a pessoa e quem está abaixo (CAMINHO); clientes pelo agente da linha,
// análises pelo analista, contatos pelo agente. N2 = nível 2 ou a marca ADMIN (D-06).
const SQL_EQUIPE = `SELECT M.ID AS MEMBRO_ID, M.NOME, M.CARGO, M.SUPERIOR_ID, COALESCE(SP.NOME, '') AS SUPERIOR_NOME,
  LENGTH(M.CAMINHO) - LENGTH(REPLACE(M.CAMINHO, '/', '')) - 1 AS PROFUNDIDADE,
  COALESCE(SUM(X.ANALISES), 0) AS ANALISES_ANDAMENTO, COALESCE(SUM(X.DECIDIDAS), 0) AS DECIDIDAS,
  ROUND(COALESCE(SUM(X.DIAS), 0) * 1.0 / NULLIF(SUM(X.DECIDIDAS), 0), 2) AS TEMPO_MEDIO_DIAS,
  COALESCE(SUM(X.CLIENTES_ATRASO), 0) AS CLIENTES_ATRASO, COALESCE(SUM(X.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(X.RECUPERADO), 0) AS RECUPERADO,
  COALESCE(SUM(X.CONTATOS), 0) AS CONTATOS
FROM CC_MEMBRO M
${EU}
LEFT JOIN CC_MEMBRO SP ON SP.ID = M.SUPERIOR_ID
LEFT JOIN (SELECT S.CAMINHO, Y.* FROM (
    SELECT B.AGENTE_ID AS MEMBRO_ID, COUNT(DISTINCT CASE WHEN B.VENCIDO > 0 THEN B.CLIENTE_ID END) AS CLIENTES_ATRASO,
      COALESCE(SUM(B.VENCIDO), 0) AS VENCIDO, COALESCE(SUM(B.RECUPERADO), 0) AS RECUPERADO, 0 AS ANALISES, 0 AS DECIDIDAS, 0 AS DIAS, 0 AS CONTATOS
    FROM ${LINHAS} B WHERE B.AGENTE_ID IS NOT NULL AND ${filtrosDoPainel('B')} GROUP BY B.AGENTE_ID
    UNION ALL
    SELECT S1.ANALISTA_ID, 0, 0, 0,
      SUM(CASE WHEN S1.DECISAO_RESULTADO = '' AND S1.ENCERRADA_EM IS NULL THEN 1 ELSE 0 END),
      SUM(CASE WHEN ${NO_MES('S1.DECIDIDA_EM')} AND S1.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA', 'RECUSADA') THEN 1 ELSE 0 END),
      SUM(CASE WHEN ${NO_MES('S1.DECIDIDA_EM')} AND S1.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA', 'RECUSADA')
        THEN DATEDIFF(SUBSTRING(S1.DECIDIDA_EM, 1, 10), SUBSTRING(S1.CRIADO_EM, 1, 10)) ELSE 0 END), 0
    FROM CC_SOLICITACAO S1 WHERE S1.ANALISTA_ID IS NOT NULL AND ${CARTEIRA_OK('S1.CARTEIRA')} GROUP BY S1.ANALISTA_ID
    UNION ALL
    SELECT K.AGENTE_ID, 0, 0, 0, 0, 0, 0, COUNT(*) FROM CC_CONTATO_COBRANCA K LEFT JOIN CC_COBRANCA CB ON CB.ID = K.COBRANCA_ID ${SO_VISIVEL('K.CLIENTE_ID')}
    WHERE ${NO_MES('K.DATA')} AND ${recorteDoCliente('K.CLIENTE_ID', "COALESCE(CB.CARTEIRA, '')")} GROUP BY K.AGENTE_ID) Y
  JOIN CC_MEMBRO S ON S.ID = Y.MEMBRO_ID) X ON M.CAMINHO <> '' AND X.CAMINHO LIKE CONCAT(M.CAMINHO, '%')
WHERE M.ATIVO = TRUE AND M.CARGO <> 'JURIDICO' AND EU.CARGO <> 'JURIDICO' AND ${NIVEL_MIN(2, 'EU')}
  AND (EU.VE_TUDO = 1 OR (EU.CAMINHO <> '' AND M.CAMINHO LIKE CONCAT(EU.CAMINHO, '%')))
GROUP BY M.ID, M.NOME, M.CARGO, M.SUPERIOR_ID, SP.NOME, M.CAMINHO
ORDER BY M.CAMINHO`;

// Fechamentos manuais (ADM, D-06) com a marca de foto (a foto prevalece).
const FILTRO_FECHAMENTO = `${podeAdministrarEm('EU')} AND ('{{busca}}' = '' OR F.MES LIKE CONCAT('%', '{{busca}}', '%'))`;
const SQL_FECHAMENTO_LISTAR = `SELECT F.ID, F.MES, F.MES_SEGUINTE, F.TOTAL, F.VENCIDO, F.VENCIDO_90, F.PDD, F.LANCADO_POR, COALESCE(ML.NOME, '') AS LANCADO_POR_NOME,
  F.LANCADO_EM, F.ATUALIZADO_POR, COALESCE(MA.NOME, '') AS ATUALIZADO_POR_NOME, F.ATUALIZADO_EM,
  CASE WHEN EXISTS (SELECT 1 FROM CC_FOTO_AGING FA WHERE FA.MES = F.MES) THEN 1 ELSE 0 END AS TEM_FOTO
FROM CC_FECHAMENTO F
${EU}
LEFT JOIN CC_MEMBRO ML ON ML.ID = F.LANCADO_POR
LEFT JOIN CC_MEMBRO MA ON MA.ID = F.ATUALIZADO_POR
WHERE ${FILTRO_FECHAMENTO}
ORDER BY F.MES DESC
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_FECHAMENTO_TOTAL = `SELECT COUNT(*) AS TOTAL FROM CC_FECHAMENTO F ${EU} WHERE ${FILTRO_FECHAMENTO}`;

/* ── internas (RN-016 inteira na guarda) ── */

// Mês seguinte na própria SQL (sem confiar em valor da entrada); sem DATE_ADD de mês, que o simulador não emula.
const MES_SEGUINTE_SQL = `(CASE WHEN SUBSTRING('{{mes}}', 6, 2) = '12' THEN CONCAT(CAST(CAST(SUBSTRING('{{mes}}', 1, 4) AS SIGNED) + 1 AS CHAR), '-01')
  ELSE CONCAT(SUBSTRING('{{mes}}', 1, 5), SUBSTRING(CONCAT('0', CAST(CAST(SUBSTRING('{{mes}}', 6, 2) AS SIGNED) + 1 AS CHAR)), -2)) END)`;
const GUARDA_FECHAMENTO = `${ATOR('{{membroId}}', PODE_ADMINISTRAR)}
  AND '{{mes}}' LIKE '____-__' AND SUBSTRING('{{mes}}', 6, 2) BETWEEN '01' AND '12' AND '{{mes}}' < SUBSTRING(${AGORA_SQL}, 1, 7)
  AND NOT EXISTS (SELECT 1 FROM CC_FOTO_AGING FA WHERE FA.MES = '{{mes}}')
  AND {{total}} >= 0 AND {{vencido}} >= 0 AND {{vencido90}} >= 0 AND {{pdd}} >= 0
  AND {{vencido}} <= {{total}} AND {{vencido90}} <= {{vencido}} AND {{pdd}} <= {{total}}`;
const INTERNAS = {
  ccEscPainelFechamentoInserir: `INSERT INTO CC_FECHAMENTO (MES, MES_SEGUINTE, TOTAL, VENCIDO, VENCIDO_90, PDD, LANCADO_POR, LANCADO_EM)
SELECT '{{mes}}', ${MES_SEGUINTE_SQL}, {{total}}, {{vencido}}, {{vencido90}}, {{pdd}}, {{membroId}}, ${AGORA_SQL} FROM DUAL
WHERE ${GUARDA_FECHAMENTO} AND NOT EXISTS (SELECT 1 FROM CC_FECHAMENTO FX WHERE FX.MES = '{{mes}}')`,
  ccEscPainelFechamentoAtualizar: `UPDATE CC_FECHAMENTO SET TOTAL = {{total}}, VENCIDO = {{vencido}}, VENCIDO_90 = {{vencido90}}, PDD = {{pdd}},
  ATUALIZADO_POR = {{membroId}}, ATUALIZADO_EM = ${AGORA_SQL}
WHERE MES = '{{mes}}' AND ${GUARDA_FECHAMENTO}`,
};

/* ── definitions ── */

// Números como parâmetro (DT-45): todo {{x}} fora de aspas vira CAST; DECIMAIS = os valores em dinheiro desta spec.
const DECIMAIS = ['total', 'vencido', 'vencido90', 'pdd'];
const sql = (name, code) => ({ name, type: 'SQL', code: numerosComoParametro(code, DECIMAIS) });
const jsDef = (name, code) => ({ name, type: 'JAVASCRIPT', code });

export const definitions = [
  // ── Leituras ──
  jsDef('ccPainelPosicao', sf(corpoPosicao)),
  sql('ccPainelRollRate', SQL_ROLL_RATE),
  jsDef('ccPainelSerie', sf(corpoSerie)),
  sql('ccPainelSerieCredito', SQL_SERIE_CREDITO),
  jsDef('ccPainelCredito', sf(corpoCredito)),
  jsDef('ccPainelConcentracao', sf(corpoConcentracao)),
  sql('ccPainelAgentes', SQL_AGENTES),
  sql('ccPainelPlanos', SQL_PLANOS),
  jsDef('ccPainelSaude', sf(corpoSaude)),
  sql('ccPainelEquipe', SQL_EQUIPE),
  jsDef('ccPainelAtencao', sf(corpoAtencao)),
  sql('ccPainelFechamentoListar', SQL_FECHAMENTO_LISTAR),
  sql('ccPainelFechamentoTotal', SQL_FECHAMENTO_TOTAL),
  // ── Escrita ──
  jsDef('ccPainelFechamentoSalvar', sf(corpoFechamentoSalvar)),
  // ── Rotina ──
  jsDef('ccPainelRotina', sf(corpoRotina)),
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
  const lerMapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const publicar = async (def, mapa) => {
    const code = def.type === 'JAVASCRIPT' ? injetarIds(def.code, mapa) : def.code;
    const dados = { name: def.name, type: def.type, code, description: `Crédito e Cobrança · 006-painel-consolidado · ${def.name}` };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 006.`);
  console.log('Republique o add-010 (id de ccPainelRotina no passo FOTO), o add-090 (ccPainelRotina fora do perfil) e o sync-server-function-map.');
}
