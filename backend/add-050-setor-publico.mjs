// add-050 — Server Functions da 005-setor-publico (04 §5): 18 públicas e 10 internas. Só o que não existe no
// privado (D-05): NF pública, motor do órgão, regras por ente, comunicação com o órgão e certidões. A cobrança
// do órgão é a da 002 (ccCob… na carteira PUBLICA) e a concessão, a da 004 (ccCred…).
//
// NÃO EXECUTE DA MÁQUINA LOCAL: só no sandbox, com o .env real (a plataforma gera a migration ali).
// Publicação (DT-39, 01 §14): publique este arquivo e REPUBLIQUE o add-010 (ccPodeMover com o trecho de
// `concessao-publica`, ids) e o add-040 (id de ccPubMotorCalcular e o ramo público da decisão); depois o
// add-090 e o sync-server-function-map. No isEntrypoint() as 5 regras iniciais entram se a tabela estiver vazia.
//
// Nota ao integrador (T-028): ids locais 5001–5018 (públicas) e 5051–5060 (internas) em
// frontend/src/lib/server-functions.ts; CHECK_INPUT da 005 em simulator/config.mjs; Winthor lido: PCNFSAID,
// PCPREST, PCPEDC (lib/setor-publico/winthor-nf.mjs). Rotas e extensoes.ts: trilha frontend.
//
// Entradas das internas (forma A, 01 §5; `membroId` = quem age; `agora` vem da JS):
//   ccEscPubAnaliseInserir    solicitacaoId + colunas da análise (esfera … prazoContratoDias), membroId, agora
//   ccEscPubAnaliseAtualizar  idem (depois da decisão só contrato, saldo, vigência, prazo do contrato e regra; pré-aprovada também base, empenho e contrato vigente)
//   ccEscPubAnaliseMotor      solicitacaoId, nota, pontos, ratingPub, exposicao, decisaoSugerida, membroId, agora (quem grava vira proponente, B-01)
//   ccEscPubNfDatas           nfId, empenho, protocolo, atesto, liquidacao, op, filaPosicao, analiseId, regraId, pequenoValor, prazoContrato,
//                             liquidarAte, pagarAte, limite2m, m2Devido, etapaNf, proxPasso, proxPassoData, membroId, agora
//   ccEscPubNfAcaoInserir     nfId, passo, prazo, protocoloOrgao, emailEnviadoId, obs, membroId (FEITO_EM e NO_PRAZO pelo relógio da SQL, C-01)
//   ccEscPubNfPassoAtualizar  nfId, proxPasso, proxPassoData, membroId
//   ccEscPubRegraInserir      nome, esfera, uf, liqDias, pagDias, contagem, baseLegal, link, membroId, agora
//   ccEscPubRegraAtualizar    regraId, validar (0/1), nome, esfera, uf, liqDias, pagDias, contagem, baseLegal, link, ativo, membroId, agora
//   ccEscPubCertidaoInserir   tipo, cnpj, abrangencia, numero, emissao, validade, anexoId, membroId, agora
//   ccEscPubCertidaoAtualizar certidaoId + as mesmas colunas
// Leitura Oracle: só a rotina, por runQueryMitra com o SQL de lib/setor-publico/winthor-nf.mjs. `ccPubWinthorNf` (04 §5) não é
// publicada: ninguém a chama e, no perfil, leria NF de qualquer CODCLI do ERP (C-03 da B3; divergência anotada no plan).

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { js, injetarIds } from './lib/escritas.mjs';
import { q, txt } from './lib/texto-sql.mjs';
import { ATOR, NIVEL_MIN, clienteVisivelA, numerosComoParametro } from './lib/guarda.mjs';
import { EU, clienteVisivel } from './lib/visibilidade.mjs';
import { PARAM_NUM } from './lib/parametros.mjs';
import { HOJE_SQL, AGORA_SQL } from './lib/tempo.mjs';
import { FONTE as FONTE_DIAS } from './lib/dias-uteis.mjs';
import { MARCADOR_JDBC_WINTHOR, preencher } from './lib/winthor-sql.mjs';
import { FONTE as FONTE_MOTOR } from './lib/setor-publico/motor.mjs';
import {
  FONTE as FONTE_NF, REGRAS_INICIAIS, SITUACAO_NF_SQL, DIAS_ATRASO_NF_SQL, ACIMA_2M_SQL, ABERTA_NF_SQL,
} from './lib/setor-publico/nf.mjs';
import { SQL_NF_PUBLICA } from './lib/setor-publico/winthor-nf.mjs';
// Lista de autores com o id canônico ('3', nunca '3.0'): a mesma forma que a guarda da 004 compara (B-02).
import { PROPONENTE_ADD, SOMAR_MESES } from './lib/concessao-credito/sql.mjs';

/* ── texto que entra nos corpos JAVASCRIPT ── */

const constante = (nome, valor) => `const ${nome} = ${JSON.stringify(valor).replace(/\{\{/g, '\\u007b\\u007b')};`;
function inteiro(v) { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; }
function numero(v) { const n = Number(String(v ?? '').trim().replace(',', '.')); return Number.isFinite(n) ? n : NaN; }
function texto(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function ehData(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')); }
function br(d) { return d ? String(d).slice(0, 10).split('-').reverse().join('/') : ''; }
function brl(v) { const [i, c] = Math.abs(Number(v) || 0).toFixed(2).split('.'); return `R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`; }
function norm(v) { return String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
const UTIL = [q, inteiro, numero, texto, ehData, br, brl, norm].map(String).join('\n');

/** Feriados do calendário do órgão (RNF-004): nacionais + UF + município. */
function feriadosDoOrgao(todos, c) {
  const uf = String((c && c.UF) || '');
  const mun = norm(c && c.MUNICIPIO);
  return (todos || []).filter((f) => f.ABRANGENCIA === 'NACIONAL' || (f.ABRANGENCIA === 'UF' && f.UF === uf)
    || (f.ABRANGENCIA === 'MUNICIPIO' && f.UF === uf && norm(f.MUNICIPIO) === mun)).map((f) => String(f.DATA));
}

const SQL_CONTRATACOES = `SELECT AO.*, S.DECISAO_RESULTADO, S.DECIDIDA_EM, S.VALOR AS SOLICITACAO_VALOR FROM CC_ANALISE_ORGAO AO
JOIN CC_SOLICITACAO S ON S.ID = AO.SOLICITACAO_ID WHERE S.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA')`;

/** Tudo o que o cálculo da NF precisa, numa leitura de cada (01 §10: leituras por runQueryMitra não contam execução). */
async function contexto(filtroCliente = '') {
  const p = await parametros('PUBLICA');
  const vigencias = (await ler("SELECT VALOR, VIGENCIA_INICIO FROM CC_PARAMETRO WHERE CHAVE = 'pub.pequenoValor' AND CARTEIRA = ''"))
    .map((l) => ({ inicio: l.VIGENCIA_INICIO, valor: Number(l.VALOR) }));
  return {
    p, vigencias, hoje: hoje(),
    feriados: await ler('SELECT DATA, ABRANGENCIA, UF, MUNICIPIO FROM CC_FERIADO'),
    regras: await ler('SELECT * FROM CC_REGRA_PAGAMENTO_ENTE ORDER BY ID'),
    contratacoes: await ler(`${SQL_CONTRATACOES}${filtroCliente ? ` AND AO.CLIENTE_ID IN (${filtroCliente})` : ''} ORDER BY S.DECIDIDA_EM DESC, AO.ID DESC`),
  };
}

/** A contratação mais recente do órgão (RF-014). */
function contratacaoMaisRecente(ctx, clienteId) {
  return ctx.contratacoes.find((a) => inteiro(a.CLIENTE_ID) === inteiro(clienteId)) || null;
}

/** RN-019 a RN-028 numa NF: regra, prazos, marcas, etapa, régua e passo atual. `orgao` = linha de CC_CLIENTE. */
function calcularNf(nf, orgao, ctx, feitos) {
  const contratacao = nf.ANALISE_ID ? ctx.contratacoes.find((a) => inteiro(a.ID) === inteiro(nf.ANALISE_ID)) || null : null;
  const esfera = String(orgao.ESFERA || (contratacao && contratacao.ESFERA) || '');
  const regra = regraDaNf(ctx.regras, { esfera, uf: orgao.UF || '' }, contratacao ? contratacao.REGRA_ID : null);
  const fer = feriadosDoOrgao(ctx.feriados, orgao);
  const pz = prazosNf(nf, regra, contratacao, fer, limitePequenoValor(ctx.vigencias, nf.EMISSAO));
  const limite2m = mais2Meses(nf.EMISSAO);
  const base = { ...nf, LIQUIDAR_ATE: pz.liquidarAte, PAGAR_ATE: pz.pagarAte, LIMITE_2M: limite2m };
  const passos = reguaNf(base, ctx.p, fer, feitos || {}, ctx.hoje);
  const atual = passoAtual(passos, ctx.hoje);
  return {
    campos: {
      REGRA_ID: regra ? inteiro(regra.ID) : null, PEQUENO_VALOR: pz.pequenoValor, PRAZO_CONTRATO: pz.prazoContrato, LIQUIDAR_ATE: pz.liquidarAte,
      PAGAR_ATE: pz.pagarAte, LIMITE_2M: limite2m, M2_DEVIDO: somarDiasUteis(limite2m, 1, fer), ETAPA_NF: etapaNf(nf),
      PROX_PASSO: atual ? atual.passo : '', PROX_PASSO_DATA: atual ? atual.devido : null,
    },
    passos: passos.map((x) => ({ ...x, atual: !!atual && x.passo === atual.passo })), regra, feriados: fer, contratacao,
  };
}

/** Feitos por NF: { nfId: { PASSO: linha } }. */
async function feitosDe(nfIds) {
  const mapa = {};
  if (!nfIds.length) return mapa;
  for (const l of await ler(`SELECT * FROM CC_NF_ACAO WHERE NF_ID IN (${nfIds.map(inteiro).join(', ')})`)) {
    (mapa[inteiro(l.NF_ID)] ||= {})[l.PASSO] = l;
  }
  return mapa;
}

const ETAPA_NOME = { nf_protocolar: 'NF a protocolar', liquidacao_vencida: 'Liquidação vencida · cobrar atesto', pagamento_vencido: 'Pagamento vencido · ordem cronológica',
  oficio: 'Ofício / notificação formal', requerimento: 'Requerimento administrativo', regularizado: 'Pagos' };

/** Caso PUBLICA aberto do órgão com a fase do card (CAPA_ENVIADA, PROX_ACAO). */
async function casoDe(clienteId) {
  const [c] = await ler(`SELECT CB.ID, CB.CLIENTE_ID, CB.CAPA_ENVIADA, CB.PROX_ACAO, CB.PROX_ACAO_DATA, CB.JURIDICO_EM, F.CHAVE AS FASE_CHAVE, K.PRAZO AS CARD_PRAZO
FROM CC_COBRANCA CB LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE CB.CLIENTE_ID = ${inteiro(clienteId)} AND CB.CARTEIRA = 'PUBLICA' AND CB.ENCERRADO_EM IS NULL ORDER BY CB.ID DESC LIMIT 1`);
  return c || null;
}

/**
 * O que pedir à 002 para o órgão (05 §3.7): `abertas` = [{ nf (linha já recalculada), passos }]. Devolve null
 * quando nada mudou; senão { tipo: criar | mover | capa | encerrar, input } para ccCobCasoSincronizar.
 */
function planoDoOrgao(clienteId, abertas, caso, hojeData) {
  if (!abertas.length) return caso ? { tipo: 'encerrar', input: { clienteId, carteira: 'PUBLICA', faseChave: '', desfecho: 'REGULARIZADO', capaJson: '{}',
    nota: `Etapa do órgão: ${ETAPA_NOME.regularizado}` } } : null;
  const nfs = abertas.map((x) => x.nf);
  const soma = (xs) => Math.round(xs.reduce((s, nf) => s + Number(nf.SALDO_ABERTO || 0), 0) * 100) / 100;
  const acima = nfs.filter((nf) => situacaoNf(nf, hojeData).acima2m);
  const etiquetas = [];
  if (acima.length) etiquetas.push('Acima de 2 meses');
  if (nfs.some((nf) => ehVerdade(nf.PEQUENO_VALOR))) etiquetas.push('Pequeno valor');
  const prox = proximaAcaoOrgao(nfs);
  const capaJson = JSON.stringify({ acima_2m: soma(acima), etiquetas, nfs_abertas: nfs.length, proxima_acao: prox.texto, proxima_acao_data: prox.data,
    valor_aberto: soma(nfs) });
  const prazo = nfs.map((nf) => (nf.LIQUIDACAO ? nf.PAGAR_ATE : nf.LIQUIDAR_ATE)).filter(Boolean).sort()[0] || '';
  const fase = etapaOrgao(abertas, hojeData);
  const base = { clienteId, carteira: 'PUBLICA', desfecho: '', capaJson, prazo, proxAcao: prox.texto, proxAcaoData: prox.data, nota: '' };
  if (!caso) return { tipo: 'criar', input: { ...base, faseChave: fase } };
  const faseChave = caso.FASE_CHAVE === 'juridico' || caso.JURIDICO_EM ? '' : fase;
  const mudaFase = !!faseChave && faseChave !== caso.FASE_CHAVE;
  const mudaCapa = capaJson !== String(caso.CAPA_ENVIADA || '');
  const mudaProx = prox.texto !== String(caso.PROX_ACAO || '') || prox.data !== String(caso.PROX_ACAO_DATA || '');
  const mudaPrazo = prazo !== String(caso.CARD_PRAZO || '').slice(0, 10); // 05 §3.7 linha 2 (C-05 da B3)
  if (!mudaFase && !mudaCapa && !mudaProx && !mudaPrazo) return null;
  return { tipo: mudaFase ? 'mover' : 'capa', input: { ...base, faseChave, nota: mudaFase ? `Etapa do órgão: ${ETAPA_NOME[faseChave] || faseChave}` : '' } };
}

const SQL_NF = `SELECT N.*, C.CODCLI, C.NOME AS CLIENTE_NOME, C.ESFERA, C.UF, C.MUNICIPIO, C.NO_JURIDICO, C.AGENTE_ID, C.ANALISTA_ID,
  AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO
FROM CC_NF_PUBLICA N JOIN CC_CLIENTE C ON C.ID = N.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID`;

/** NF com o órgão e os caminhos; null se não existe ou está cancelada. */
async function nfPor(nfId) {
  const [nf] = await ler(`${SQL_NF} WHERE N.ID = ${inteiro(nfId)} AND N.CANCELADA = FALSE`);
  return nf || null;
}

/** Opera a NF (agente ou analista do órgão, ou acima; o Jurídico só lê). */
const operaNf = (m, nf) => !!nf && m.membroId > 0 && m.cargo !== 'JURIDICO' && visivel(m, nf);

/** NFs em aberto do órgão já recalculadas em memória (com os feitos), para etapa, capa e próxima ação. */
async function abertasDoOrgao(clienteId, orgao, ctx) {
  const nfs = await ler(`SELECT * FROM CC_NF_PUBLICA N WHERE N.CLIENTE_ID = ${inteiro(clienteId)} AND ${ABERTA_NF}`);
  const feitos = await feitosDe(nfs.map((n) => n.ID));
  return nfs.map((nf) => {
    const calc = calcularNf(nf, orgao, ctx, feitos[inteiro(nf.ID)]);
    return { nf: { ...nf, ...calc.campos }, passos: calc.passos };
  });
}

/** Campos da NF para os modelos PUB_* (01 §13, PA-10). Vazio vira "não informado" (o envio recusa campo vazio). */
function camposNf(nf, orgao, contratacao, hojeData) {
  const s = situacaoNf(nf, hojeData);
  const ou = (v) => (v === null || v === undefined || String(v).trim() === '' ? 'não informado' : String(v));
  return {
    ORGAO: ou(orgao.NOME || orgao.CLIENTE_NOME), NUMERO_NF: ou(nf.NUMNOTA), EMISSAO_NF: ou(br(nf.EMISSAO)), VALOR_NF: brl(nf.VALOR), EMPENHO: ou(nf.EMPENHO),
    CONTRATO: ou(contratacao && contratacao.CONTRATO), PROTOCOLO: ou(br(nf.PROTOCOLO)), DATA_LIQUIDAR_ATE: ou(br(nf.LIQUIDAR_ATE)),
    DATA_PAGAR_ATE: ou(br(nf.PAGAR_ATE)), DIAS_ATRASO_NF: String(s.diasAtraso),
  };
}

/** Destinatário pela função do contato (plan): ordenador nos ofícios e requerimento, fiscal na liquidação, senão o principal. */
async function destinatario(clienteId, codigo) {
  const funcao = ['PUB_OFICIO', 'PUB_REQUERIMENTO'].includes(codigo) ? 'ordenador de despesa' : codigo === 'PUB_LIQ' ? 'fiscal do contrato' : '';
  if (!funcao) return '';
  const contatos = await ler(`SELECT EMAIL, FUNCAO, SITUACAO FROM CC_CONTATO_CLIENTE WHERE CLIENTE_ID = ${inteiro(clienteId)} AND EMAIL <> '' ORDER BY PRINCIPAL DESC, ID`);
  const c = contatos.find((x) => x.SITUACAO !== 'NAO_USAR' && norm(x.FUNCAO) === norm(funcao));
  return c ? String(c.EMAIL) : '';
}

/* ── análise do órgão ── */

const SQL_SOL = `SELECT S.ID AS SOLICITACAO_ID, S.CLIENTE_ID, S.CARTEIRA, S.VALOR, S.DECISAO_RESULTADO, S.DECIDIDA_EM, S.ENCERRADA_EM, S.ANALISTA_ID,
  S.CARD_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, C.ESFERA AS CLIENTE_ESFERA, C.UF, C.MUNICIPIO, C.NO_JURIDICO, C.AGENTE_ID,
  AG.CAMINHO AS AGENTE_CAMINHO, AN.CAMINHO AS ANALISTA_CAMINHO, CS.CAMINHO AS CASO_CAMINHO, F.CHAVE AS FASE_CHAVE
FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_MEMBRO AN ON AN.ID = C.ANALISTA_ID
LEFT JOIN CC_MEMBRO CS ON CS.ID = COALESCE(S.ANALISTA_ID, S.CRIADO_POR)
LEFT JOIN KB_CARD K ON K.ID = S.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID`;

/** Solicitação pública com a análise (`ao`) e o histórico de pagamento do órgão. */
async function solicitacaoPublica(solicitacaoId) {
  const [s] = await ler(`${SQL_SOL} WHERE S.ID = ${inteiro(solicitacaoId)} AND S.CARTEIRA = 'PUBLICA'`);
  if (!s) return null;
  const [ao] = await ler(`SELECT * FROM CC_ANALISE_ORGAO WHERE SOLICITACAO_ID = ${inteiro(s.SOLICITACAO_ID)}`);
  const pagas = await ler(`SELECT * FROM CC_NF_PUBLICA WHERE CLIENTE_ID = ${inteiro(s.CLIENTE_ID)} AND PAGO_EM IS NOT NULL AND CANCELADA = FALSE`);
  return { s, ao: ao || null, historico: historicoPagamento(pagas) };
}

/** "Caso" da solicitação: analista (ou quem abriu) ou superior dele; sem a marca ADMIN (igual a CASO_SOL). */
const ehCaso = (m, caminho) => !!(m && m.membroId && m.caminho && caminho && String(caminho).startsWith(m.caminho));

/** Entradas do motor a partir da análise (atraso médio: o lançado à mão, senão o do histórico). */
function entradaMotor(ao, s, historico) {
  const manual = ehVerdade(ao.ATRASO_MEDIO_MANUAL);
  return {
    esfera: ao.ESFERA || s.CLIENTE_ESFERA || '', capag: ao.CAPAG || '', pessoalPct: ao.PESSOAL_PCT, cauc: ao.CAUC || '', fonteTipo: ao.FONTE_TIPO || '',
    perfilPag: ao.PERFIL_PAG || '', atrasoMedio: manual ? ao.ATRASO_MEDIO : historico.atrasoMedio, empenhoPrevio: ao.EMPENHO_PREVIO || '',
    contratoVigente: ao.CONTRATO_VIGENTE || '', base: ao.BASE || '', valorEstimado: Number(ao.VALOR_ESTIMADO || 0),
    saldoContrato: Number(ao.SALDO_CONTRATO || 0), vigenciaFim: ao.VIGENCIA_FIM || '', valorSolicitado: Number(s.VALOR || 0),
  };
}

/** Opções fechadas (RN-010) e colunas da análise: nome do input → coluna. */
const OPCOES = {
  esfera: ['', 'FEDERAL', 'ESTADUAL', 'MUNICIPAL'], capag: ['', 'A', 'B', 'C', 'D', 'ND', 'UNIAO'], capacidade: ['', 'ALTA', 'MEDIA', 'BAIXA'],
  cauc: ['', 'REGULAR', 'PENDENCIA'], fonteTipo: ['', 'SUS', 'VINCULADA', 'PROPRIOS'], perfilPag: ['', 'PONTUAL', 'EVENTUAIS', 'FREQUENTES'],
  empenhoPrevio: ['', 'SIM', 'NAO'], contratoVigente: ['', 'SIM', 'NAO'], base: ['', 'EDITAL', 'CONTRATO'],
};
const COLUNAS = {
  esfera: 'ESFERA', capag: 'CAPAG', capacidade: 'CAPACIDADE', pessoalPct: 'PESSOAL_PCT', cauc: 'CAUC', fonteTipo: 'FONTE_TIPO', fontePagadora: 'FONTE_PAGADORA',
  perfilPag: 'PERFIL_PAG', atrasoMedio: 'ATRASO_MEDIO', restosAPagar: 'RESTOS_A_PAGAR', empenhoPrevio: 'EMPENHO_PREVIO', contratoVigente: 'CONTRATO_VIGENTE',
  base: 'BASE', edital: 'EDITAL', valorEstimado: 'VALOR_ESTIMADO', contrato: 'CONTRATO', saldoContrato: 'SALDO_CONTRATO', vigenciaFim: 'VIGENCIA_FIM',
  regraId: 'REGRA_ID', prazoContratoDias: 'PRAZO_CONTRATO_DIAS',
};
/** PA-18: editáveis depois da decisão; na pré-aprovada, também a base e os dados de empenho e contrato. */
const DEPOIS_DECISAO = ['contrato', 'saldoContrato', 'vigenciaFim', 'prazoContratoDias', 'regraId'];
const DEPOIS_PRE = [...DEPOIS_DECISAO, 'base', 'empenhoPrevio', 'contratoVigente', 'valorEstimado', 'edital'];

/** Valores da análise depois da gravação: o que veio no input sobre o que está gravado. Devolve { v } ou { erro }. */
function mesclarAnalise(ao, e) {
  const atual = ao || {};
  const v = {};
  for (const [k, col] of Object.entries(COLUNAS)) v[k] = atual[col] === undefined ? null : atual[col];
  for (const k of ['esfera', 'capag', 'capacidade', 'cauc', 'fonteTipo', 'perfilPag', 'empenhoPrevio', 'contratoVigente', 'base', 'fontePagadora',
    'restosAPagar', 'edital', 'contrato']) v[k] = v[k] === null ? '' : String(v[k]);
  const veio = (k) => e[k] !== undefined && e[k] !== null;
  for (const k of Object.keys(OPCOES)) {
    if (!veio(k)) continue;
    const x = texto(e[k], 12).toUpperCase();
    if (!OPCOES[k].includes(x)) return { erro: `Opção inválida em ${k}: ${x}.` };
    v[k] = x;
  }
  for (const [k, max] of [['fontePagadora', 120], ['restosAPagar', 300], ['edital', 120], ['contrato', 120]]) if (veio(k)) v[k] = texto(e[k], max);
  if (veio('pessoalPct')) {
    const t = String(e.pessoalPct).trim();
    const n = numero(t);
    if (t !== '' && !(n >= 0 && n <= 100)) return { erro: 'Despesa com pessoal: de 0 a 100%.' };
    v.pessoalPct = t === '' ? null : n;
  }
  if (veio('atrasoMedio')) {
    const t = String(e.atrasoMedio).trim();
    if (t !== '' && !(inteiro(t) >= 0 && /^\d+$/.test(t))) return { erro: 'Atraso médio: informe dias inteiros.' };
    v.atrasoMedio = t === '' ? null : inteiro(t);
  }
  for (const k of ['valorEstimado', 'saldoContrato']) {
    if (!veio(k)) { v[k] = Number(v[k] || 0); continue; }
    const n = String(e[k]).trim() === '' ? 0 : numero(e[k]);
    if (!(n >= 0)) return { erro: `${k === 'valorEstimado' ? 'Valor estimado' : 'Saldo do contrato'}: não pode ser negativo.` };
    v[k] = Math.round(n * 100) / 100;
  }
  if (veio('vigenciaFim')) {
    const t = texto(e.vigenciaFim, 10);
    if (t && !ehData(t)) return { erro: 'Vigência: informe a data como AAAA-MM-DD.' };
    v.vigenciaFim = t || null;
  }
  if (veio('regraId')) v.regraId = inteiro(e.regraId) || null;
  if (veio('prazoContratoDias')) {
    const n = inteiro(e.prazoContratoDias);
    if (n < 0) return { erro: 'Prazo do contrato: dias corridos, zero ou mais.' };
    v.prazoContratoDias = n;
  }
  v.prazoContratoDias = inteiro(v.prazoContratoDias);
  v.regraId = v.regraId ? inteiro(v.regraId) : null;
  return { v };
}

/** O motor da solicitação (sem gravar) e a fotografia nova. */
function motorDe(sol, ao, p) {
  return motorOrgao(entradaMotor(ao, sol.s, sol.historico), p, hoje());
}

const FONTE_005 = [UTIL, FONTE_DIAS, FONTE_MOTOR, FONTE_NF, constante('SQL_CONTRATACOES', SQL_CONTRATACOES), constante('SQL_NF', SQL_NF),
  constante('SQL_SOL', SQL_SOL), constante('ABERTA_NF', ABERTA_NF_SQL('N')), constante('ETAPA_NOME', ETAPA_NOME), constante('OPCOES', OPCOES),
  constante('COLUNAS', COLUNAS), constante('DEPOIS_DECISAO', DEPOIS_DECISAO), constante('DEPOIS_PRE', DEPOIS_PRE),
  ...[feriadosDoOrgao, contexto, contratacaoMaisRecente, calcularNf, feitosDe, casoDe, planoDoOrgao, nfPor, abertasDoOrgao, camposNf, destinatario,
    solicitacaoPublica, entradaMotor, mesclarAnalise, motorDe].map(String),
  `const operaNf = ${operaNf};`, `const ehCaso = ${ehCaso};`].join('\n');


/* ── leituras JAVASCRIPT ── */

/** Vê a solicitação: caso, cliente visível, ou (só leitura) alçada lendo o card em `comite` (B-C3). */
const podeLer = (m, s, p) => ehCaso(m, s.CASO_CAMINHO) || visivel(m, s) || (s.FASE_CHAVE === 'comite' && m.nivel >= Number(p['alcada.nivelSupervisor']));

const corpoAnaliseObter = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const sol = await solicitacaoPublica(event.solicitacaoId);
  const p = await parametros('PUBLICA');
  if (!sol || !podeLer(m, sol.s, p)) return recusar('Solicitação não encontrada.');
  const ctx = await contexto(String(inteiro(sol.s.CLIENTE_ID)));
  const esfera = String((sol.ao && sol.ao.ESFERA) || sol.s.CLIENTE_ESFERA || '');
  const regra = regraDaNf(ctx.regras, { esfera, uf: sol.s.UF || '' }, sol.ao ? sol.ao.REGRA_ID : null);
  return {
    ok: true, analise: sol.ao, regra: regra || null, sugestoes: { atrasoMedio: sol.historico.atrasoMedio, esfera: sol.s.CLIENTE_ESFERA || '' },
    historico: sol.historico, motor: sol.ao ? motorDe(sol, sol.ao, p) : null,
  };
};

const corpoMotorCalcular = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const sol = await solicitacaoPublica(event.solicitacaoId);
  const p = await parametros('PUBLICA');
  const gravar = inteiro(event.gravar) === 1;
  if (!sol) return recusar('Solicitação não encontrada.');
  if (gravar ? !ehCaso(m, sol.s.CASO_CAMINHO) : !podeLer(m, sol.s, p)) return recusar('Solicitação não encontrada.');
  if (!sol.ao) return recusar('Preencha a análise do órgão.');
  const r = motorDe(sol, sol.ao, p);
  if (gravar) {
    // B-01 da B3 (DT-40): quem grava a fotografia que a decisão confere passa a ser proponente e não decide.
    await escrever('ccEscPubAnaliseMotor', { solicitacaoId: sol.s.SOLICITACAO_ID, nota: r.nota, pontos: pontosTexto(r.pontos), ratingPub: r.ratingPub,
      exposicao: r.exposicao, decisaoSugerida: r.decisaoSugerida, membroId: m.membroId, agora: agora() });
    const linhas = [];
    if (inteiro(sol.ao.NOTA) !== r.nota || sol.ao.RATING_PUB !== r.ratingPub || Number(sol.ao.EXPOSICAO) !== r.exposicao) {
      linhas.push({ campo: 'Motor do órgão', antes: `${sol.ao.NOTA ?? '—'} ${sol.ao.RATING_PUB || '—'} ${brl(sol.ao.EXPOSICAO)}`,
        depois: `${r.nota} ${r.ratingPub} ${brl(r.exposicao)}` });
    }
    const autores = String(sol.ao.PROPOSTA_POR || '');
    if (!autores.split(',').includes(String(m.membroId))) {
      linhas.push({ campo: 'PROPOSTA_POR', antes: autores, depois: autores ? `${autores},${m.membroId}` : String(m.membroId) });
    }
    if (linhas.length) await auditar('Setor público', 'ANALISE_ORGAO', sol.ao.ID, sol.s.CLIENTE_ID, linhas, m);
  }
  return { ok: true, ...r };
};

const corpoNfFicha = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const nf = await nfPor(event.nfId);
  if (!nf || !visivel(m, nf)) return recusar('Nota fiscal não encontrada.');
  const ctx = await contexto(String(inteiro(nf.CLIENTE_ID)));
  const feitos = await feitosDe([nf.ID]);
  const calc = calcularNf(nf, nf, ctx, feitos[inteiro(nf.ID)]);
  const atual = { ...nf, ...calc.campos };
  const s = situacaoNf(atual, ctx.hoje);
  const opera = operaNf(m, nf);
  return {
    ok: true, nf: { ...atual, SITUACAO: s.situacao, DIAS_ATRASO: s.diasAtraso, ACIMA_2M: s.acima2m ? 1 : 0 }, regra: calc.regra,
    passos: calc.passos.map((x) => ({ ...x, podeFeito: opera && x.podeFeito })),
    contratacoes: ctx.contratacoes.filter((a) => inteiro(a.CLIENTE_ID) === inteiro(nf.CLIENTE_ID)),
    pode: { lancarDatas: opera && !nf.PAGO_EM && !ehVerdade(nf.BAIXADA), marcarPasso: opera && !nf.PAGO_EM && !ehVerdade(nf.BAIXADA) },
  };
};

const corpoMensagemPreparar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const nf = await nfPor(event.nfId);
  if (!nf || !visivel(m, nf)) return recusar('Nota fiscal não encontrada.');
  const ctx = await contexto(String(inteiro(nf.CLIENTE_ID)));
  const calc = calcularNf(nf, nf, ctx, (await feitosDe([nf.ID]))[inteiro(nf.ID)]);
  const atual = { ...nf, ...calc.campos };
  const passo = texto(event.passo, 5).toUpperCase();
  let codigo;
  if (passo) {
    const def = PASSOS.find((x) => x.passo === passo);
    if (!def || !def.modelo) return recusar('Este passo não tem mensagem.');
    codigo = def.modelo;
  } else codigo = tipoMensagem(atual, ctx.hoje);
  const contratacao = calc.contratacao || contratacaoMaisRecente(ctx, nf.CLIENTE_ID);
  const r = await escrever('ccBaseModeloPrever', { clienteId: nf.CLIENTE_ID, codigo, extras: JSON.stringify(camposNf(atual, nf, contratacao, ctx.hoje)),
    para: await destinatario(nf.CLIENTE_ID, codigo), membroId: m.membroId });
  if (!r || r.ok === false) return r || recusar('Não foi possível preparar a mensagem.');
  return { ok: true, codigo, assunto: r.assunto, corpo: r.corpo, para: r.para, validado: r.validado, faltando: r.faltando || [] };
};

/* ── escritas JAVASCRIPT ── */

const corpoAnaliseSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const sol = await solicitacaoPublica(event.solicitacaoId);
  if (!sol || !ehCaso(m, sol.s.CASO_CAMINHO)) return recusar('Solicitação não encontrada.');
  if (sol.s.ENCERRADA_EM) return recusar('A solicitação está encerrada.');
  const decisao = String(sol.s.DECISAO_RESULTADO || '');
  const mescla = mesclarAnalise(sol.ao, event);
  if (mescla.erro) return recusar(mescla.erro);
  const v = mescla.v;
  // RN-011: capacidade pela CAPAG até alguém escolher à mão.
  const sugerida = capacidadeSugerida(v.capag);
  const recebida = event.capacidade !== undefined && event.capacidade !== null ? texto(event.capacidade, 6).toUpperCase() : '';
  const manual = ehVerdade(sol.ao && sol.ao.CAPACIDADE_MANUAL) || (recebida !== '' && recebida !== sugerida);
  v.capacidade = manual ? (recebida || String((sol.ao && sol.ao.CAPACIDADE) || '')) : sugerida;
  v.capacidadeManual = manual ? 1 : 0;
  v.atrasoMedioManual = v.atrasoMedio === null ? 0 : 1;
  if (v.regraId) {
    const [r] = await ler(`SELECT ID FROM CC_REGRA_PAGAMENTO_ENTE WHERE ID = ${inteiro(v.regraId)} AND ATIVO = TRUE`);
    if (!r) return recusar('Regra de pagamento não encontrada ou inativa.');
  }
  const antes = sol.ao || {};
  const mudou = Object.entries(COLUNAS).filter(([k, col]) => String(antes[col] ?? '') !== String(v[k] ?? '')
    && !(Number.isFinite(Number(antes[col])) && antes[col] !== null && antes[col] !== '' && v[k] !== null && v[k] !== '' && Number(antes[col]) === Number(v[k])));
  if (decisao) {
    const livres = decisao === 'PRE_APROVADA' ? DEPOIS_PRE : DEPOIS_DECISAO;
    const presos = mudou.filter(([k]) => !livres.includes(k) && k !== 'capacidade');
    if (presos.length) return recusar('Solicitação decidida: só contrato, saldo, vigência, prazo do contrato e regra podem mudar.');
  }
  const agoraTxt = agora();
  const entrada = { solicitacaoId: sol.s.SOLICITACAO_ID, membroId: m.membroId, agora: agoraTxt, capacidadeManual: v.capacidadeManual,
    atrasoMedioManual: v.atrasoMedioManual };
  for (const k of Object.keys(COLUNAS)) entrada[k] = v[k] === null || v[k] === undefined ? '' : v[k];
  // Número vai como número (DT-45: CAST('' AS SIGNED) é erro em INSERT/UPDATE estrito no MySQL); 0 = sem regra / sem prazo.
  entrada.regraId = inteiro(v.regraId);
  entrada.prazoContratoDias = inteiro(v.prazoContratoDias);
  await escrever(sol.ao ? 'ccEscPubAnaliseAtualizar' : 'ccEscPubAnaliseInserir', entrada);
  const depois = await solicitacaoPublica(sol.s.SOLICITACAO_ID);
  if (!depois.ao || depois.ao.ATUALIZADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  const p = await parametros('PUBLICA');
  const r = motorDe(depois, depois.ao, p);
  await escrever('ccEscPubAnaliseMotor', { solicitacaoId: sol.s.SOLICITACAO_ID, nota: r.nota, pontos: pontosTexto(r.pontos), ratingPub: r.ratingPub,
    exposicao: r.exposicao, decisaoSugerida: r.decisaoSugerida, membroId: m.membroId, agora: agoraTxt });
  const linhas = mudou.map(([k, col]) => ({ campo: col, antes: antes[col] ?? '', depois: v[k] ?? '' }));
  if (!sol.ao) linhas.unshift({ campo: '(análise do órgão)', antes: '', depois: `solicitação ${sol.s.SOLICITACAO_ID}` });
  linhas.push({ campo: 'Motor do órgão', antes: `${antes.NOTA ?? '—'} ${antes.RATING_PUB || '—'}`, depois: `${r.nota} ${r.ratingPub} ${brl(r.exposicao)}` });
  await auditar('Setor público', 'ANALISE_ORGAO', depois.ao.ID, sol.s.CLIENTE_ID, linhas, m);
  return { ok: true, analiseId: inteiro(depois.ao.ID), motor: r };
};

const corpoNfDatasSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const nf = await nfPor(event.nfId);
  if (!operaNf(m, nf)) return recusar('Nota fiscal não encontrada.');
  if (nf.PAGO_EM) return recusar('A NF já está paga.');
  if (ehVerdade(nf.BAIXADA)) return recusar('A NF foi baixada como perda.');
  const hojeData = hoje();
  const d = { emissao: nf.EMISSAO };
  for (const k of ['protocolo', 'atesto', 'liquidacao', 'op']) d[k] = texto(event[k], 10);
  const erro = validarDatas(d, hojeData);
  if (erro) return recusar(erro);
  const empenho = texto(event.empenho, 40);
  const fila = inteiro(event.filaPosicao);
  if (fila < 0) return recusar('Posição na fila: zero ou mais.');
  const ctx = await contexto(String(inteiro(nf.CLIENTE_ID)));
  let analiseId = inteiro(nf.ANALISE_ID);
  if (inteiro(event.analiseId) > 0) {
    const c = ctx.contratacoes.find((a) => inteiro(a.ID) === inteiro(event.analiseId) && inteiro(a.CLIENTE_ID) === inteiro(nf.CLIENTE_ID));
    if (!c) return recusar('Contratação não encontrada para este órgão.');
    analiseId = inteiro(c.ID);
  }
  if (!analiseId) analiseId = inteiro((contratacaoMaisRecente(ctx, nf.CLIENTE_ID) || {}).ID);
  const novo = { ...nf, ANALISE_ID: analiseId || null, EMPENHO: empenho, PROTOCOLO: d.protocolo || null, ATESTO: d.atesto || null,
    LIQUIDACAO: d.liquidacao || null, OP: d.op || null, FILA_POSICAO: fila || null };
  const calc = calcularNf(novo, nf, ctx, (await feitosDe([nf.ID]))[inteiro(nf.ID)]);
  const cmp = calc.campos;
  const agoraTxt = agora();
  await escrever('ccEscPubNfDatas', {
    nfId: nf.ID, empenho, protocolo: d.protocolo, atesto: d.atesto, liquidacao: d.liquidacao, op: d.op, filaPosicao: fila, analiseId,
    regraId: inteiro(cmp.REGRA_ID), pequenoValor: cmp.PEQUENO_VALOR ? 1 : 0, prazoContrato: cmp.PRAZO_CONTRATO ? 1 : 0, liquidarAte: cmp.LIQUIDAR_ATE,
    pagarAte: cmp.PAGAR_ATE, limite2m: cmp.LIMITE_2M, m2Devido: cmp.M2_DEVIDO, etapaNf: cmp.ETAPA_NF, proxPasso: cmp.PROX_PASSO,
    proxPassoData: cmp.PROX_PASSO_DATA || '', membroId: m.membroId, agora: agoraTxt,
  });
  const gravada = await nfPor(nf.ID);
  if (!gravada || gravada.ATUALIZADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  const linhas = [['EMPENHO', 'Empenho'], ['PROTOCOLO', 'Protocolo'], ['ATESTO', 'Atesto'], ['LIQUIDACAO', 'Liquidação'], ['OP', 'Ordem de pagamento'],
    ['FILA_POSICAO', 'Posição na fila'], ['ANALISE_ID', 'Contratação']]
    .filter(([col]) => String(nf[col] ?? '') !== String(gravada[col] ?? '')).map(([col, campo]) => ({ campo, antes: nf[col] ?? '', depois: gravada[col] ?? '' }));
  if (linhas.length) await auditar('Notas fiscais', 'NF_PUBLICA', nf.ID, nf.CLIENTE_ID, linhas.map((l) => ({ ...l, campo: `NF ${nf.NUMNOTA} · ${l.campo}` })), m);
  // Caso do órgão: só se mudou, como pessoa (DT-34); caso ausente ou encerrado: a 002 devolve pendente e a rotina resolve.
  const abertas = await abertasDoOrgao(nf.CLIENTE_ID, nf, ctx);
  const plano = planoDoOrgao(inteiro(nf.CLIENTE_ID), abertas, await casoDe(nf.CLIENTE_ID), hojeData);
  let orgao = { sincronizado: false };
  if (plano && ['mover', 'capa'].includes(plano.tipo)) {
    const r = await escrever('ccCobCasoSincronizar', { ...plano.input, membroId: m.membroId });
    if (r && r.ok === false) return recusar(r.error);
    orgao = { sincronizado: true, fase: plano.input.faseChave, ...(r || {}) };
  }
  const s = situacaoNf(gravada, hojeData);
  return { ok: true, nf: { ...gravada, SITUACAO: s.situacao, DIAS_ATRASO: s.diasAtraso, ACIMA_2M: s.acima2m ? 1 : 0 }, orgao };
};

const corpoNfPassoRegistrar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const nf = await nfPor(event.nfId);
  if (!operaNf(m, nf)) return recusar('Nota fiscal não encontrada.');
  if (nf.PAGO_EM || ehVerdade(nf.BAIXADA)) return recusar('A NF não está em tramitação.');
  const passo = texto(event.passo, 5).toUpperCase();
  const ctx = await contexto(String(inteiro(nf.CLIENTE_ID)));
  const feitos = (await feitosDe([nf.ID]))[inteiro(nf.ID)] || {};
  const calc = calcularNf(nf, nf, ctx, feitos);
  const alvo = calc.passos.find((x) => x.passo === passo);
  if (!alvo) return recusar('Este passo não se aplica a esta NF.');
  if (feitos[passo]) {
    return { ok: true, jaFeito: true, noPrazo: ehVerdade(feitos[passo].NO_PRAZO), proximoPasso: { passo: calc.campos.PROX_PASSO, data: calc.campos.PROX_PASSO_DATA || '' } };
  }
  if (!alvo.podeFeito) {
    return recusar(`O passo ${passo} vence em ${br(alvo.devido)}: só pode ser marcado com até ${inteiro(ctx.p['pub.rpFeitoAntecedencia'])} dias úteis de antecedência.`);
  }
  const hojeData = ctx.hoje;
  const noPrazo = hojeData <= alvo.devido;
  const obs = texto(event.obs, 500);
  let emailEnviadoId = 0;
  if (inteiro(event.enviarEmail) === 1) {
    if (!alvo.modelo) return recusar('Este passo não tem mensagem.');
    const atual = { ...nf, ...calc.campos };
    const contratacao = calc.contratacao || contratacaoMaisRecente(ctx, nf.CLIENTE_ID);
    const env = await escrever('ccEmailEnviar', {
      codigo: alvo.modelo, clienteId: nf.CLIENTE_ID, para: texto(event.para, 500) || await destinatario(nf.CLIENTE_ID, alvo.modelo),
      assunto: String(event.assunto ?? ''), corpo: String(event.corpo ?? ''), extras: JSON.stringify(camposNf(atual, nf, contratacao, hojeData)),
      origem: '005-regua-publica', referencia: `nf:${inteiro(nf.ID)}:${passo}`, membroId: m.membroId,
    });
    if (!env || env.ok === false) return recusar((env && env.error) || 'O e-mail não saiu.');
    emailEnviadoId = inteiro(env.emailId);
  }
  await escrever('ccEscPubNfAcaoInserir', { nfId: nf.ID, passo, prazo: alvo.devido, protocoloOrgao: texto(event.protocoloOrgao, 60), emailEnviadoId, obs,
    membroId: m.membroId });
  // FEITO_EM vem do relógio da SQL (C-01): a linha é desta chamada se é de quem clicou (o passo não existia, UQ NF + passo).
  const [acao] = await ler(`SELECT * FROM CC_NF_ACAO WHERE NF_ID = ${inteiro(nf.ID)} AND PASSO = ${q(passo)}`);
  if (!acao || inteiro(acao.FEITO_POR) !== m.membroId) return recusar(MSG.SEM_PERMISSAO);
  const depois = calcularNf(nf, nf, ctx, { ...feitos, [passo]: acao });
  await escrever('ccEscPubNfPassoAtualizar', { nfId: nf.ID, proxPasso: depois.campos.PROX_PASSO, proxPassoData: depois.campos.PROX_PASSO_DATA || '',
    membroId: m.membroId });
  await auditar('Notas fiscais', 'NF_PUBLICA', nf.ID, nf.CLIENTE_ID, [{ campo: `NF ${nf.NUMNOTA} · passo ${passo}`, antes: '',
    depois: `feito ${noPrazo ? 'no prazo' : 'fora do prazo'}${emailEnviadoId ? ` · e-mail ${emailEnviadoId}` : ''}${obs ? ` · ${obs}` : ''}` }], m);
  if (passo !== 'G5') {
    const abertas = await abertasDoOrgao(nf.CLIENTE_ID, nf, ctx);
    const prox = proximaAcaoOrgao(abertas.map((x) => x.nf));
    const r = await escrever('ccCobContatoRegistrar', {
      clienteId: nf.CLIENTE_ID, carteira: 'PUBLICA', origem: 'REGUA_PUB', retorno: '', canal: emailEnviadoId ? 'E-mail' : alvo.canal,
      feedback: `${passo} feito${obs ? ` · ${obs}` : ''}`, nfId: nf.ID, emailEnviadoId, proxAcao: prox.texto, proxAcaoData: prox.data, membroId: m.membroId,
    });
    if (r && r.ok === false) return recusar(`Passo registrado; o contato com o órgão não: ${r.error}`);
  }
  return { ok: true, noPrazo, emailEnviadoId, proximoPasso: { passo: depois.campos.PROX_PASSO, data: depois.campos.PROX_PASSO_DATA || '' } };
};

const corpoRegraEnteSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  const regraId = inteiro(event.regraId);
  const validar = inteiro(event.validar) === 1;
  const [antes] = regraId ? await ler(`SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE ID = ${regraId}`) : [];
  if (regraId && !antes) return recusar('Regra não encontrada.');
  const link = texto(event.link, 500);
  const agoraTxt = agora();
  if (validar) {
    if (!antes) return recusar('Regra não encontrada.');
    if (!(m.cargo === 'JURIDICO' || nivelMin(m, 3))) return recusar('A validação da regra cabe a Gerente, Diretoria, Jurídico ou Administrador.');
    if (!(link || antes.LINK)) return recusar('Informe o link da norma para validar a regra.');
    if (link && !/^https?:\/\/\S+$/.test(link)) return recusar('Link da norma inválido.');
    await escrever('ccEscPubRegraAtualizar', { regraId, validar: 1, nome: antes.NOME, esfera: antes.ESFERA, uf: antes.UF, liqDias: antes.LIQ_DIAS,
      pagDias: antes.PAG_DIAS, contagem: antes.CONTAGEM, baseLegal: antes.BASE_LEGAL, link: link || antes.LINK, ativo: ehVerdade(antes.ATIVO) ? 1 : 0,
      membroId: m.membroId, agora: agoraTxt });
    const [l] = await ler(`SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE ID = ${regraId}`);
    if (!l || l.SITUACAO !== 'VERIFICADO' || l.VALIDADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
    await auditar('Regras por ente', 'REGRA_PAGAMENTO_ENTE', regraId, null, [{ campo: 'Situação', antes: antes.SITUACAO, depois: `VERIFICADO · ${l.LINK}` }], m);
    return { ok: true, regraId, situacao: 'VERIFICADO' };
  }
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor ou acima cadastra e edita regra por ente.');
  const nome = texto(event.nome, 120);
  const esfera = texto(event.esfera, 10).toUpperCase();
  const uf = texto(event.uf, 2).toUpperCase();
  const liqDias = inteiro(event.liqDias);
  const pagDias = inteiro(event.pagDias);
  const contagem = texto(event.contagem, 8).toUpperCase() || 'UTEIS';
  const ativo = event.ativo === undefined || event.ativo === '' ? 1 : (inteiro(event.ativo) === 1 ? 1 : 0);
  if (!nome) return recusar('Informe o nome da regra.');
  if (!['', 'FEDERAL', 'ESTADUAL', 'MUNICIPAL'].includes(esfera)) return recusar('Esfera inválida.');
  if (uf && !/^[A-Z]{2}$/.test(uf)) return recusar('UF inválida.');
  if (!['UTEIS', 'CORRIDOS'].includes(contagem)) return recusar('Contagem: úteis ou corridos.');
  if (!(liqDias > 0) || !(pagDias > 0)) return recusar('Prazos de liquidação e pagamento: dias, maiores que zero.');
  if (link && !/^https?:\/\/\S+$/.test(link)) return recusar('Link da norma inválido.');
  const entrada = { nome, esfera, uf, liqDias, pagDias, contagem, baseLegal: texto(event.baseLegal, 300), link, ativo, membroId: m.membroId, agora: agoraTxt };
  if (!regraId) {
    await escrever('ccEscPubRegraInserir', entrada);
    const [nova] = await ler(`SELECT MAX(ID) AS ID FROM CC_REGRA_PAGAMENTO_ENTE WHERE ATUALIZADO_EM = ${q(agoraTxt)} AND ATUALIZADO_POR = ${m.membroId}`);
    if (!nova || !inteiro(nova.ID)) return recusar(MSG.SEM_PERMISSAO);
    await auditar('Regras por ente', 'REGRA_PAGAMENTO_ENTE', nova.ID, null, [{ campo: '(regra)', antes: '', depois: `${nome} · ${liqDias}+${pagDias} ${contagem}` }], m);
    return { ok: true, regraId: inteiro(nova.ID), situacao: 'A_CONFIRMAR' };
  }
  await escrever('ccEscPubRegraAtualizar', { ...entrada, regraId, validar: 0 });
  const [l] = await ler(`SELECT * FROM CC_REGRA_PAGAMENTO_ENTE WHERE ID = ${regraId}`);
  if (!l || l.ATUALIZADO_EM !== agoraTxt) return recusar(MSG.SEM_PERMISSAO);
  const linhas = [['NOME', 'Nome'], ['ESFERA', 'Esfera'], ['UF', 'UF'], ['LIQ_DIAS', 'Prazo de liquidação'], ['PAG_DIAS', 'Prazo de pagamento'],
    ['CONTAGEM', 'Contagem'], ['BASE_LEGAL', 'Base legal'], ['LINK', 'Link'], ['ATIVO', 'Ativa'], ['SITUACAO', 'Situação']]
    .filter(([col]) => String(antes[col] ?? '') !== String(l[col] ?? '')).map(([col, campo]) => ({ campo, antes: antes[col] ?? '', depois: l[col] ?? '' }));
  if (linhas.length) await auditar('Regras por ente', 'REGRA_PAGAMENTO_ENTE', regraId, null, linhas, m);
  return { ok: true, regraId, situacao: l.SITUACAO };
};

const TIPOS_CERTIDAO = ['CND_FEDERAL', 'CRF_FGTS', 'CNDT', 'CND_ESTADUAL', 'CND_MUNICIPAL'];

const corpoCertidaoSalvar = async () => {
  const m = await quem();
  if (!m.membroId) return recusar(MSG.NAO_MEMBRO);
  if (!nivelMin(m, 2)) return recusar('Somente Supervisor ou acima cadastra certidão.');
  const certidaoId = inteiro(event.certidaoId);
  const tipo = texto(event.tipo, 14).toUpperCase();
  const cnpj = texto(event.cnpj, 18);
  const validade = texto(event.validade, 10);
  const emissao = texto(event.emissao, 10);
  const anexoId = inteiro(event.anexoId);
  if (!TIPOS_CERTIDAO.includes(tipo)) return recusar('Tipo de certidão inválido.');
  if (!cnpj) return recusar('Informe o CNPJ.');
  if (!ehData(validade)) return recusar('Informe a validade como AAAA-MM-DD.');
  if (emissao && (!ehData(emissao) || emissao > validade)) return recusar('Emissão inválida ou depois da validade.');
  if (anexoId) {
    const [a] = await ler(`SELECT ID FROM CC_ANEXO WHERE ID = ${anexoId} AND ENTIDADE = 'CERTIDAO' AND REMOVIDO_EM IS NULL`);
    if (!a) return recusar('Arquivo da certidão não encontrado.');
  }
  const [antes] = certidaoId ? await ler(`SELECT * FROM CC_CERTIDAO WHERE ID = ${certidaoId}`) : [];
  if (certidaoId && !antes) return recusar('Certidão não encontrada.');
  const agoraTxt = agora();
  const entrada = { certidaoId, tipo, cnpj, abrangencia: texto(event.abrangencia, 80), numero: texto(event.numero, 60), emissao, validade, anexoId,
    membroId: m.membroId, agora: agoraTxt };
  await escrever(certidaoId ? 'ccEscPubCertidaoAtualizar' : 'ccEscPubCertidaoInserir', entrada);
  const [l] = await ler(`SELECT * FROM CC_CERTIDAO WHERE REGISTRADO_EM = ${q(agoraTxt)} AND REGISTRADO_POR = ${m.membroId} ORDER BY ID DESC LIMIT 1`);
  if (!l) return recusar(MSG.SEM_PERMISSAO);
  await auditar('Certidões', 'CERTIDAO', l.ID, null, [{ campo: `${tipo}${entrada.abrangencia ? ` ${entrada.abrangencia}` : ''}`,
    antes: antes ? `validade ${antes.VALIDADE}` : '', depois: `validade ${validade}${anexoId ? ` · arquivo ${anexoId}` : ''}` }], m);
  return { ok: true, certidaoId: inteiro(l.ID) };
};

/* ── rotina, passo PUBLICO (05 §3.7, plan "Rotina") ── */

// ponytail: reserva por órgão estimada pelos custos medidos (criar 4, mover 3, atualizar 3, nota 2); o contador real é o do ccRotina.
const RESERVA_ORGAO = 13;

const corpoRotina = async () => {
  const m = await quem();
  if (!m.rotina) return recusar('Só a rotina roda este passo.');
  const inicioMs = Date.now();
  const orcamentoExec = Math.max(2, inteiro(event.orcamentoExec) || 140);
  const orcamentoMs = Number(event.orcamentoMs) || 45000;
  const dml = (s) => sdk.runDmlMitra({ projectId, sql: s });
  const v = (x) => (x === null || x === undefined || x === '' ? 'NULL' : typeof x === 'number' ? String(x) : typeof x === 'boolean' ? (x ? 'TRUE' : 'FALSE') : q(x));
  const agoraTxt = agora();
  const jdbcId = Number('__JDBC_WINTHOR__');
  let gasto = 1;
  let pendentes = 0;
  let processados = 0;
  const erros = [];

  // 1–2. Winthor: novas pelo cursor e abertas pela lista (PA-20), por lotes de órgãos.
  const ctx = await contexto();
  const orgaos = await ler("SELECT ID, CODCLI, NOME, ESFERA, UF, MUNICIPIO FROM CC_CLIENTE WHERE SETOR = 'PUBLICO'");
  const porCodcli = new Map(orgaos.map((c) => [inteiro(c.CODCLI), c]));
  const porId = new Map(orgaos.map((c) => [inteiro(c.ID), c]));
  const gravadas = new Map((await ler('SELECT ID, CODFILIAL, NUMTRANSVENDA, CLIENTE_ID, SALDO_ABERTO, PAGO_EM, CANCELADA, VALOR, EMPENHO FROM CC_NF_PUBLICA'))
    .map((l) => [`${l.CODFILIAL}|${inteiro(l.NUMTRANSVENDA)}`, l]));
  const cursor = [...gravadas.values()].reduce((mx, l) => Math.max(mx, inteiro(l.NUMTRANSVENDA)), 0);
  const abertasW = [...gravadas.values()].filter((l) => !l.PAGO_EM && !ehVerdade(l.CANCELADA)).map((l) => inteiro(l.NUMTRANSVENDA));
  const LINHAS = 1000;
  const corte = String(ctx.p['pub.nfDataCorte']);
  const lidas = new Map();
  const lerW = async (codigos, aPartirDe, transacoes) => {
    const linhas = linhasDe(await sdk.runQueryMitra({ projectId, jdbcId, sql: preencher(SQL_WINTHOR_NF, { clientes: codigos.join(', '), aPartirDe, transacoes,
      desde: corte, linhas: LINHAS }) }));
    for (const l of linhas) lidas.set(`${String(l.CODFILIAL)}|${inteiro(l.NUMTRANSVENDA)}`, l);
    return linhas;
  };
  const lotes = (xs) => Array.from({ length: Math.ceil(xs.length / 500) }, (_, k) => xs.slice(k * 500, k * 500 + 500));
  // C-04 da B3: o cursor global só vale para quem já tem NF gravada e com a mesma data de corte. Órgão que vira público depois
  // (sem linha em CC_NF_PUBLICA) e o recuo de `pub.nfDataCorte` releem do zero, paginando na própria rodada.
  const [corteLido] = await ler("SELECT VALOR FROM CC_ESTADO WHERE CHAVE = 'pub.nfCorteLido'");
  const recuou = !corteLido || corte < String(corteLido.VALOR);
  const comNfGravada = new Set([...gravadas.values()].map((l) => inteiro(l.CLIENTE_ID)));
  const codigos = [...porCodcli.keys()];
  const reler = codigos.filter((c) => recuou || !comNfGravada.has(inteiro(porCodcli.get(c).ID)));
  for (const lote of lotes(codigos.filter((c) => comNfGravada.has(inteiro(porCodcli.get(c).ID))))) {
    for (const lista of abertasW.length ? lotes(abertasW) : [[0]]) {
      if ((await lerW(lote, cursor, lista.join(', '))).length >= LINHAS) pendentes += 1;
    }
  }
  let relido = true;
  for (const lote of lotes(reler)) {
    // ponytail: a releitura pagina até o fim dentro do orçamento de parede; se não couber, a próxima rodada relê do zero.
    for (let de = 0; ;) {
      if (Date.now() - inicioMs > orcamentoMs) { relido = false; pendentes += 1; break; }
      const linhas = await lerW(lote, de, '0');
      if (linhas.length < LINHAS) break;
      de = linhas.reduce((mx, l) => Math.max(mx, inteiro(l.NUMTRANSVENDA)), de);
    }
  }
  if (relido && (!corteLido || String(corteLido.VALOR) !== corte)) {
    await dml(corteLido ? `UPDATE CC_ESTADO SET VALOR = ${q(corte)}, ATUALIZADO_EM = ${q(agoraTxt)} WHERE CHAVE = 'pub.nfCorteLido'`
      : `INSERT INTO CC_ESTADO (CHAVE, VALOR, ATUALIZADO_EM) VALUES ('pub.nfCorteLido', ${q(corte)}, ${q(agoraTxt)})`);
  }
  // 3. Gravar: novas e as que mudaram (saldo, pagamento, cancelamento).
  const novas = [];
  for (const [chave, w] of lidas) {
    const c = porCodcli.get(inteiro(w.CODCLI));
    if (!c) continue;
    const pagas = inteiro(w.PARCELAS) > 0 && inteiro(w.PAGAS) === inteiro(w.PARCELAS);
    const pagoEm = pagas ? String(w.ULTIMO_PAGAMENTO || '').slice(0, 10) : null;
    const saldo = Math.round(Number(w.SALDO || 0) * 100) / 100;
    const cancelada = !!w.CANCELADA_EM;
    const g = gravadas.get(chave);
    if (!g) {
      if (cancelada) continue;
      novas.push(`(${[inteiro(c.ID), q(String(w.CODFILIAL)), inteiro(w.NUMTRANSVENDA), inteiro(w.NUMNOTA), q(texto(w.SERIE, 10)), q(String(w.EMISSAO).slice(0, 10)),
        Number(w.VALOR || 0), saldo, v(pagoEm), q(texto(w.EMPENHO, 40)), q(agoraTxt), q(agoraTxt)].join(', ')})`);
      continue;
    }
    const mudou = Number(g.SALDO_ABERTO) !== saldo || String(g.PAGO_EM || '') !== String(pagoEm || '') || ehVerdade(g.CANCELADA) !== cancelada
      || Number(g.VALOR) !== Number(w.VALOR || 0) || (!g.EMPENHO && texto(w.EMPENHO, 40));
    if (!mudou) continue;
    await dml(`UPDATE CC_NF_PUBLICA SET SALDO_ABERTO = ${saldo}, PAGO_EM = ${v(pagoEm)}, CANCELADA = ${cancelada ? 'TRUE' : 'FALSE'}, VALOR = ${Number(w.VALOR || 0)},
  EMPENHO = CASE WHEN EMPENHO = '' THEN ${q(texto(w.EMPENHO, 40))} ELSE EMPENHO END, WINTHOR_EM = ${q(agoraTxt)}, ATUALIZADO_EM = ${q(agoraTxt)}
WHERE ID = ${inteiro(g.ID)}`);
    processados += 1;
  }
  for (let i = 0; i < novas.length; i += 500) {
    await dml(`INSERT INTO CC_NF_PUBLICA (CLIENTE_ID, CODFILIAL, NUMTRANSVENDA, NUMNOTA, SERIE, EMISSAO, VALOR, SALDO_ABERTO, PAGO_EM, EMPENHO, WINTHOR_EM, ATUALIZADO_EM)
VALUES ${novas.slice(i, i + 500).join(',\n')}
ON DUPLICATE KEY UPDATE SALDO_ABERTO = VALUES(SALDO_ABERTO), PAGO_EM = VALUES(PAGO_EM), WINTHOR_EM = VALUES(WINTHOR_EM)`);
    processados += Math.min(500, novas.length - i);
  }
  // PA-19: PRE_APROVADA da análise conciliada com a decisão da 004.
  for (const a of await ler(`SELECT AO.ID, AO.PRE_APROVADA, S.DECISAO_RESULTADO FROM CC_ANALISE_ORGAO AO JOIN CC_SOLICITACAO S ON S.ID = AO.SOLICITACAO_ID`)) {
    const deve = a.DECISAO_RESULTADO === 'PRE_APROVADA';
    if (ehVerdade(a.PRE_APROVADA) !== deve) await dml(`UPDATE CC_ANALISE_ORGAO SET PRE_APROVADA = ${deve ? 'TRUE' : 'FALSE'} WHERE ID = ${inteiro(a.ID)}`);
  }
  // 5. Baixa (RN-032): caso encerrado BAIXADO → NFs em aberto do órgão emitidas até o encerramento.
  await dml(`UPDATE CC_NF_PUBLICA SET BAIXADA = TRUE, ATUALIZADO_EM = ${q(agoraTxt)}
WHERE PAGO_EM IS NULL AND BAIXADA = FALSE AND CANCELADA = FALSE AND EXISTS (SELECT 1 FROM CC_COBRANCA CB WHERE CB.CLIENTE_ID = CC_NF_PUBLICA.CLIENTE_ID
  AND CB.CARTEIRA = 'PUBLICA' AND CB.DESFECHO = 'BAIXADO' AND CC_NF_PUBLICA.EMISSAO <= SUBSTRING(CB.ENCERRADO_EM, 1, 10))`);
  // 4. Recalcular: toda NF em aberto e as que mudaram desde o último cálculo; grava só a diferença.
  const recalc = await ler(`SELECT N.* FROM CC_NF_PUBLICA N WHERE N.CANCELADA = FALSE AND N.BAIXADA = FALSE
  AND (N.PAGO_EM IS NULL OR N.CALCULADO_EM IS NULL OR N.CALCULADO_EM < N.ATUALIZADO_EM)`);
  const feitos = await feitosDe(recalc.map((n) => n.ID));
  const abertasPorOrgao = new Map();
  const acertos = [];
  const CAMPOS = ['ANALISE_ID', 'REGRA_ID', 'PEQUENO_VALOR', 'PRAZO_CONTRATO', 'LIQUIDAR_ATE', 'PAGAR_ATE', 'LIMITE_2M', 'M2_DEVIDO', 'ETAPA_NF', 'PROX_PASSO', 'PROX_PASSO_DATA'];
  for (const nf of recalc) {
    const orgao = porId.get(inteiro(nf.CLIENTE_ID));
    if (!orgao) continue;
    const base = { ...nf, ANALISE_ID: nf.ANALISE_ID || (contratacaoMaisRecente(ctx, nf.CLIENTE_ID) || {}).ID || null };
    const calc = calcularNf(base, orgao, ctx, feitos[inteiro(nf.ID)]);
    const novo = { ...calc.campos, ANALISE_ID: base.ANALISE_ID ? inteiro(base.ANALISE_ID) : null };
    if (nf.PAGO_EM) { novo.PROX_PASSO = ''; novo.PROX_PASSO_DATA = null; }
    const igual = (a, b) => (typeof b === 'boolean' ? ehVerdade(a) === b : String(a ?? '') === String(b ?? ''));
    const dif = CAMPOS.filter((k) => !igual(nf[k], novo[k]));
    if (dif.length || !nf.CALCULADO_EM || nf.CALCULADO_EM < (nf.ATUALIZADO_EM || '')) {
      await dml(`UPDATE CC_NF_PUBLICA SET ${CAMPOS.map((k) => `${k} = ${['PROX_PASSO', 'ETAPA_NF'].includes(k) ? q(novo[k] || '') : v(novo[k])}`).join(', ')}, CALCULADO_EM = ${q(agoraTxt)} WHERE ID = ${inteiro(nf.ID)}`);
      processados += 1;
    }
    // C-01 da B3: o prazo de passo feito é o devido pela régua (a interna aceita o que veio); NO_PRAZO segue o prazo.
    for (const x of calc.passos) {
      const a = (feitos[inteiro(nf.ID)] || {})[x.passo];
      if (!a || String(a.PRAZO) === x.devido) continue;
      const noPrazo = String(a.FEITO_EM).slice(0, 10) <= x.devido;
      await dml(`UPDATE CC_NF_ACAO SET PRAZO = ${q(x.devido)}, NO_PRAZO = ${noPrazo ? 'TRUE' : 'FALSE'} WHERE ID = ${inteiro(a.ID)}`);
      acertos.push({ entidadeId: nf.ID, clienteId: nf.CLIENTE_ID, campo: `NF ${nf.NUMNOTA} · passo ${x.passo}`,
        antes: `prazo ${a.PRAZO}${ehVerdade(a.NO_PRAZO) ? ' · no prazo' : ' · fora do prazo'}`, depois: `prazo ${x.devido}${noPrazo ? ' · no prazo' : ' · fora do prazo'}` });
    }
    if (!nf.PAGO_EM) {
      const lista = abertasPorOrgao.get(inteiro(nf.CLIENTE_ID)) || [];
      lista.push({ nf: { ...nf, ...novo }, passos: calc.passos });
      abertasPorOrgao.set(inteiro(nf.CLIENTE_ID), lista);
    }
  }
  if (acertos.length) { await auditarLinhas('Notas fiscais', 'NF_PUBLICA', acertos, m); gasto += 1; }
  // 6–7. Órgãos: fase, prazo, capa e próxima ação pela 002, só na diferença, dentro do orçamento (criar → mover → encerrar → capa).
  const casos = new Map((await ler(`SELECT CB.ID, CB.CLIENTE_ID, CB.CAPA_ENVIADA, CB.PROX_ACAO, CB.PROX_ACAO_DATA, CB.JURIDICO_EM, F.CHAVE AS FASE_CHAVE,
  K.PRAZO AS CARD_PRAZO
FROM CC_COBRANCA CB LEFT JOIN KB_CARD K ON K.ID = CB.CARD_ID LEFT JOIN CC_FASE F ON F.FASE_ID = K.FASE_ID
WHERE CB.CARTEIRA = 'PUBLICA' AND CB.ENCERRADO_EM IS NULL`)).map((c) => [inteiro(c.CLIENTE_ID), c]));
  // Caso sem NF nenhuma em CC_NF_PUBLICA não é da 005 (aberto à mão ou por outra porta): a rotina não o encerra.
  const comNf = new Set((await ler('SELECT DISTINCT CLIENTE_ID FROM CC_NF_PUBLICA')).map((l) => inteiro(l.CLIENTE_ID)));
  const ids = [...new Set([...abertasPorOrgao.keys(), ...[...casos.keys()].filter((id) => comNf.has(id))])].filter((id) => porId.has(id));
  const PRIORIDADE = { criar: 0, mover: 1, encerrar: 2, capa: 3 };
  const planos = ids.map((id) => planoDoOrgao(id, abertasPorOrgao.get(id) || [], casos.get(id) || null, ctx.hoje)).filter(Boolean)
    .sort((a, b) => PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo]);
  for (const plano of planos) {
    if (gasto + RESERVA_ORGAO > orcamentoExec || Date.now() - inicioMs > orcamentoMs) { pendentes += 1; continue; }
    gasto += RESERVA_ORGAO; // conta também a chamada que lança erro (O-03)
    try {
      const r = await escrever('ccCobCasoSincronizar', { ...plano.input, membroId: 0 });
      if (r && r.ok === false) erros.push(`${plano.input.clienteId}: ${r.error}`);
      else if (r && r.criado) {
        // A criação não grava a próxima ação: segunda chamada, só ela (2 execuções).
        await escrever('ccCobCasoSincronizar', { ...plano.input, faseChave: '', membroId: 0 });
      }
      processados += 1;
    } catch (e) {
      erros.push(`${plano.input.clienteId}: ${e && e.message ? e.message : e}`);
    }
  }
  if (erros.length) return { ok: false, error: `Órgãos com erro: ${erros.join(' · ')}`.slice(0, 900), pendentes, execucoes: gasto, processados };
  return { ok: true, pendentes, execucoes: gasto, processados };
};

/* ── leituras SQL ── */

const CLI_NF = `JOIN CC_CLIENTE C ON C.ID = N.CLIENTE_ID ${EU}`;
const FILTRO_NF = `N.CANCELADA = FALSE AND ${clienteVisivel('C')}
  AND ({{clienteId}} = 0 OR N.CLIENTE_ID = {{clienteId}}) AND ({{analiseId}} = 0 OR N.ANALISE_ID = {{analiseId}})
  AND ({{agenteId}} = 0 OR C.AGENTE_ID = {{agenteId}})
  AND (('{{situacao}}' = '' AND ${ABERTA_NF_SQL('N')}) OR ('{{situacao}}' = 'PAGA' AND N.PAGO_EM IS NOT NULL)
    OR ('{{situacao}}' NOT IN ('', 'PAGA') AND ${ABERTA_NF_SQL('N')} AND ${SITUACAO_NF_SQL('N')} = '{{situacao}}'))
  AND ({{acima2m}} = -1 OR ${ACIMA_2M_SQL('N')} = {{acima2m}})
  AND ('{{de}}' = '' OR N.EMISSAO >= '{{de}}') AND ('{{ate}}' = '' OR N.EMISSAO <= '{{ate}}')
  AND ('{{busca}}' = '' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%') OR CAST(N.NUMNOTA AS CHAR) = '{{busca}}'
    OR UPPER(N.EMPENHO) LIKE CONCAT('%', '{{busca}}', '%'))`;
const VENCIDA = (n = 'N') => `(${SITUACAO_NF_SQL(n)} IN ('LIQUIDACAO_VENCIDA', 'PAGAMENTO_VENCIDO'))`;

const SQL_NF_LISTAR = `SELECT N.*, ${SITUACAO_NF_SQL('N')} AS SITUACAO, ${DIAS_ATRASO_NF_SQL('N')} AS DIAS_ATRASO, ${ACIMA_2M_SQL('N')} AS ACIMA_2M,
  N.PROX_PASSO AS PROXIMO_PASSO, N.PROX_PASSO_DATA AS PROXIMO_PASSO_DATA, C.CODCLI, C.NOME AS CLIENTE_NOME, COALESCE(C.ESFERA, '') AS ESFERA, C.UF,
  COALESCE(AG.NOME, '') AS AGENTE_NOME, COALESCE(R.NOME, '') AS REGRA_NOME, COALESCE(R.SITUACAO, '') AS REGRA_SITUACAO
FROM CC_NF_PUBLICA N ${CLI_NF}
LEFT JOIN CC_MEMBRO AG ON AG.ID = C.AGENTE_ID LEFT JOIN CC_REGRA_PAGAMENTO_ENTE R ON R.ID = N.REGRA_ID
WHERE ${FILTRO_NF}
ORDER BY CASE WHEN ${VENCIDA('N')} THEN 0 ELSE 1 END, N.PAGAR_ATE, N.ID
LIMIT {{limite}} OFFSET {{offset}}`;

const SQL_NF_TOTAL = `SELECT COUNT(*) AS TOTAL, COALESCE(SUM(N.SALDO_ABERTO), 0) AS VALOR, COUNT(DISTINCT N.CLIENTE_ID) AS ORGAOS,
  SUM(CASE WHEN ${ABERTA_NF_SQL('N')} AND ${VENCIDA('N')} THEN 1 ELSE 0 END) AS VENCIDAS,
  COALESCE(SUM(CASE WHEN ${ABERTA_NF_SQL('N')} AND ${VENCIDA('N')} THEN N.SALDO_ABERTO ELSE 0 END), 0) AS VALOR_VENCIDO,
  SUM(${ACIMA_2M_SQL('N')}) AS ACIMA_2M,
  SUM(CASE WHEN R.SITUACAO = 'A_CONFIRMAR' THEN 1 ELSE 0 END) AS REGRA_A_CONFIRMAR
FROM CC_NF_PUBLICA N ${CLI_NF} LEFT JOIN CC_REGRA_PAGAMENTO_ENTE R ON R.ID = N.REGRA_ID
WHERE ${FILTRO_NF}`;

const SQL_CUMPRIMENTO = `SELECT X.AGENTE_ID, COALESCE(MB.NOME, '') AS AGENTE_NOME, SUM(X.DEVIDO) AS DEVIDOS, SUM(X.FEITO) AS FEITOS, SUM(X.NO_PRAZO) AS NO_PRAZO,
  CASE WHEN SUM(X.DEVIDO) > 0 THEN ROUND(SUM(X.NO_PRAZO) * 100.0 / SUM(X.DEVIDO), 1) ELSE 0 END AS PCT
FROM (
  SELECT A.FEITO_POR AS AGENTE_ID, A.CLIENTE_ID, 1 AS DEVIDO, 1 AS FEITO, CASE WHEN A.NO_PRAZO = TRUE THEN 1 ELSE 0 END AS NO_PRAZO
  FROM CC_NF_ACAO A
  WHERE ('{{de}}' = '' OR SUBSTRING(A.FEITO_EM, 1, 10) >= '{{de}}') AND ('{{ate}}' = '' OR SUBSTRING(A.FEITO_EM, 1, 10) <= '{{ate}}')
  UNION ALL
  SELECT CX.AGENTE_ID, N.CLIENTE_ID, 1, 0, 0
  FROM CC_NF_PUBLICA N JOIN CC_CLIENTE CX ON CX.ID = N.CLIENTE_ID
  WHERE ${ABERTA_NF_SQL('N')} AND N.PROX_PASSO <> '' AND N.PROX_PASSO_DATA < ${HOJE_SQL}
    AND ('{{ate}}' = '' OR N.PROX_PASSO_DATA <= '{{ate}}')
) X JOIN CC_CLIENTE C ON C.ID = X.CLIENTE_ID ${EU}
LEFT JOIN CC_MEMBRO MB ON MB.ID = X.AGENTE_ID
WHERE ${clienteVisivel('C')} AND ({{agenteId}} = 0 OR X.AGENTE_ID = {{agenteId}})
GROUP BY X.AGENTE_ID, MB.NOME ORDER BY MB.NOME`;

/** Contratos dos créditos públicos vigentes com base contrato (RN-037). */
const VALOR_CONTRATACAO = '(CASE WHEN AO.VALOR_ESTIMADO > 0 THEN AO.VALOR_ESTIMADO ELSE CR.LIMITE END)';
const ALERTA_VIG = `(AO.VIGENCIA_FIM IS NOT NULL AND DATEDIFF(AO.VIGENCIA_FIM, ${HOJE_SQL}) <= ${PARAM_NUM('pub.contratoVigDias')})`;
const ALERTA_SALDO = `(${VALOR_CONTRATACAO} > 0 AND AO.SALDO_CONTRATO * 100 < ${PARAM_NUM('pub.contratoSaldoPct')} * ${VALOR_CONTRATACAO})`;
const ALERTA_CONTRATO = `(CASE WHEN ${ALERTA_VIG} AND ${ALERTA_SALDO} THEN 'VIGENCIA_SALDO' WHEN ${ALERTA_VIG} THEN 'VIGENCIA' WHEN ${ALERTA_SALDO} THEN 'SALDO' ELSE '' END)`;
const DE_CONTRATOS = `FROM CC_CREDITO CR JOIN CC_ANALISE_ORGAO AO ON AO.ID = CR.ANALISE_ORGAO_ID JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID ${EU}
WHERE CR.VIGENTE_CHAVE IS NOT NULL AND AO.BASE = 'CONTRATO' AND ${clienteVisivel('C')}
  AND ({{soAlerta}} = 0 OR ${ALERTA_CONTRATO} <> '')
  AND ('{{busca}}' = '' OR C.NOME_BUSCA LIKE CONCAT('%', '{{busca}}', '%') OR UPPER(AO.CONTRATO) LIKE CONCAT('%', '{{busca}}', '%'))`;
const SQL_CONTRATO_LISTAR = `SELECT CR.ID AS CREDITO_ID, AO.ID AS ANALISE_ID, C.ID AS CLIENTE_ID, C.CODCLI, C.NOME AS CLIENTE_NOME, AO.CONTRATO, AO.VIGENCIA_FIM,
  AO.SALDO_CONTRATO, ${VALOR_CONTRATACAO} AS VALOR_CONTRATACAO, CR.LIMITE, AO.RATING_PUB,
  CASE WHEN ${VALOR_CONTRATACAO} > 0 THEN ROUND(AO.SALDO_CONTRATO * 100.0 / ${VALOR_CONTRATACAO}, 1) ELSE 0 END AS SALDO_PCT,
  CASE WHEN AO.VIGENCIA_FIM IS NULL THEN NULL ELSE DATEDIFF(AO.VIGENCIA_FIM, ${HOJE_SQL}) END AS DIAS_VIGENCIA, ${ALERTA_CONTRATO} AS ALERTA
${DE_CONTRATOS}
ORDER BY CASE WHEN ${ALERTA_CONTRATO} <> '' THEN 0 ELSE 1 END, AO.VIGENCIA_FIM, C.NOME
LIMIT {{limite}} OFFSET {{offset}}`;
const SQL_CONTRATO_TOTAL = `SELECT COUNT(*) AS TOTAL, SUM(CASE WHEN ${ALERTA_CONTRATO} <> '' THEN 1 ELSE 0 END) AS EM_ALERTA ${DE_CONTRATOS}`;

/** Certidão vigente: a de maior validade por tipo + CNPJ + abrangência (empate: a última registrada). */
const VIGENTE_CERT = (x = 'X') => `NOT EXISTS (SELECT 1 FROM CC_CERTIDAO Y WHERE Y.TIPO = ${x}.TIPO AND Y.CNPJ = ${x}.CNPJ AND Y.ABRANGENCIA = ${x}.ABRANGENCIA
      AND (Y.VALIDADE > ${x}.VALIDADE OR (Y.VALIDADE = ${x}.VALIDADE AND Y.ID > ${x}.ID)))`;
const SITUACAO_CERT = (x = 'X') => `(CASE WHEN ${x}.VALIDADE < ${HOJE_SQL} THEN 'VENCIDA'
    WHEN DATEDIFF(${x}.VALIDADE, ${HOJE_SQL}) <= ${PARAM_NUM('pub.certAlertaDias')} THEN 'VENCENDO' ELSE 'VALIDA' END)`;

const SQL_CERTIDAO_LISTAR = `SELECT X.*, ${SITUACAO_CERT('X')} AS SITUACAO, CASE WHEN ${VIGENTE_CERT('X')} THEN 1 ELSE 0 END AS VIGENTE,
  COALESCE(AX.URL, '') AS ANEXO_URL, COALESCE(AX.NOME_ARQUIVO, '') AS ANEXO_NOME, COALESCE(MR.NOME, '') AS REGISTRADO_POR_NOME
FROM CC_CERTIDAO X ${EU}
LEFT JOIN CC_ANEXO AX ON AX.ID = X.ANEXO_ID AND AX.REMOVIDO_EM IS NULL LEFT JOIN CC_MEMBRO MR ON MR.ID = X.REGISTRADO_POR
WHERE ({{todas}} = 1 OR ${VIGENTE_CERT('X')}) AND ('{{situacao}}' = '' OR ${SITUACAO_CERT('X')} = '{{situacao}}')
ORDER BY X.TIPO, X.ABRANGENCIA, X.VALIDADE DESC, X.ID DESC LIMIT 500`;

const SQL_REGRA_LISTAR = `SELECT R.*, COALESCE(MV.NOME, '') AS VALIDADO_POR_NOME
FROM CC_REGRA_PAGAMENTO_ENTE R ${EU} LEFT JOIN CC_MEMBRO MV ON MV.ID = R.VALIDADO_POR
WHERE ({{ativo}} = -1 OR R.ATIVO = ({{ativo}} = 1)) ORDER BY R.ID LIMIT 500`;

/** Resumo para o painel (DT-33, PA-09): um SELECT, recortado por EU. */
const NF_DO_RESUMO = (cond) => `FROM CC_NF_PUBLICA N JOIN CC_CLIENTE C ON C.ID = N.CLIENTE_ID
    WHERE N.CANCELADA = FALSE AND ${clienteVisivel('C')} AND ${cond}
      AND ({{buId}} < 0 OR EXISTS (SELECT 1 FROM CC_POSICAO_CLIENTE_BU PB WHERE PB.CLIENTE_ID = C.ID AND PB.BU_ID = {{buId}}
        AND PB.VENCIDO + PB.A_VENCER > 0))`;
const AB = ABERTA_NF_SQL('N');
const CONTA = (cond) => `(SELECT COUNT(*) ${NF_DO_RESUMO(cond)})`;
const SOMA = (cond) => `(SELECT COALESCE(SUM(N.SALDO_ABERTO), 0) ${NF_DO_RESUMO(cond)})`;
const MES_RESUMO = `(CASE WHEN '{{mes}}' = '' THEN SUBSTRING(${HOJE_SQL}, 1, 7) ELSE '{{mes}}' END)`;
const CERT_VIGENTE_SIT = (sit) => `(SELECT COUNT(*) FROM CC_CERTIDAO X WHERE ${VIGENTE_CERT('X')} AND ${SITUACAO_CERT('X')} = '${sit}')`;
const RATING_VIGENTE = (r) => `(SELECT COUNT(*) FROM CC_CREDITO CR JOIN CC_ANALISE_ORGAO AO ON AO.ID = CR.ANALISE_ORGAO_ID JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID
    WHERE CR.VIGENTE_CHAVE IS NOT NULL AND AO.RATING_PUB = '${r}' AND ${clienteVisivel('C')})`;
const SQL_RESUMO = `SELECT ${CONTA(AB)} AS NFS_ABERTAS, ${SOMA(AB)} AS VALOR_ABERTO,
  ${CONTA(`${AB} AND ${SITUACAO_NF_SQL('N')} = 'A_PROTOCOLAR'`)} AS A_PROTOCOLAR,
  ${CONTA(`${AB} AND ${SITUACAO_NF_SQL('N')} = 'LIQUIDACAO_VENCIDA'`)} AS LIQUIDACAO_VENCIDA,
  ${CONTA(`${AB} AND ${SITUACAO_NF_SQL('N')} = 'PAGAMENTO_VENCIDO'`)} AS PAGAMENTO_VENCIDO,
  ${CONTA(`${AB} AND ${ACIMA_2M_SQL('N')} = 1`)} AS ACIMA_2M, ${SOMA(`${AB} AND ${ACIMA_2M_SQL('N')} = 1`)} AS VALOR_ACIMA_2M,
  ${CERT_VIGENTE_SIT('VENCENDO')} AS CERTIDOES_VENCENDO, ${CERT_VIGENTE_SIT('VENCIDA')} AS CERTIDOES_VENCIDAS,
  (SELECT COUNT(*) FROM CC_CREDITO CR JOIN CC_ANALISE_ORGAO AO ON AO.ID = CR.ANALISE_ORGAO_ID JOIN CC_CLIENTE C ON C.ID = CR.CLIENTE_ID
    WHERE CR.VIGENTE_CHAVE IS NOT NULL AND AO.BASE = 'CONTRATO' AND ${clienteVisivel('C')} AND ${ALERTA_CONTRATO} <> '') AS CONTRATOS_ALERTA,
  ${RATING_VIGENTE('P1')} AS P1, ${RATING_VIGENTE('P2')} AS P2, ${RATING_VIGENTE('P3')} AS P3, ${RATING_VIGENTE('P4')} AS P4,
  ${CONTA(`${AB} AND N.ETAPA_NF IN ('ENTREGUE', 'PROTOCOLADA')`)} AS SEM_ATESTO, ${SOMA(`${AB} AND N.ETAPA_NF IN ('ENTREGUE', 'PROTOCOLADA')`)} AS VALOR_SEM_ATESTO,
  ${CONTA(`${AB} AND N.ETAPA_NF = 'ATESTADA'`)} AS AGUARDANDO_LIQUIDACAO, ${SOMA(`${AB} AND N.ETAPA_NF = 'ATESTADA'`)} AS VALOR_AGUARDANDO_LIQUIDACAO,
  ${CONTA(`${AB} AND N.ETAPA_NF IN ('LIQUIDADA', 'OP')`)} AS LIQUIDADAS_SEM_PAGAMENTO,
  ${SOMA(`${AB} AND N.ETAPA_NF IN ('LIQUIDADA', 'OP')`)} AS VALOR_LIQUIDADAS_SEM_PAGAMENTO,
  ${SOMA(`${AB} AND ${SITUACAO_NF_SQL('N')} = 'PAGAMENTO_VENCIDO'`)} AS VALOR_PAGAMENTO_VENCIDO,
  (SELECT COALESCE(SUM(N.VALOR), 0) ${NF_DO_RESUMO(`N.PAGO_EM IS NOT NULL AND SUBSTRING(N.PAGO_EM, 1, 7) = ${MES_RESUMO}`)}) AS RECEBIDO_MES,
  ${CONTA(`N.PAGO_EM IS NOT NULL AND SUBSTRING(N.PAGO_EM, 1, 7) = ${MES_RESUMO}`)} AS NFS_RECEBIDAS_MES
FROM (SELECT 1 AS UM) U1 ${EU}`;

/* ── internas (forma A, 01 §5) ── */

/** "Caso" da solicitação para o ator A: analista (ou quem abriu) ou superior; sem a marca ADMIN. */
const CASO_SOL = (s) => `EXISTS (SELECT 1 FROM CC_MEMBRO CS WHERE CS.ID = COALESCE(${s}.ANALISTA_ID, ${s}.CRIADO_POR)
    AND A.CAMINHO <> '' AND CS.CAMINHO LIKE CONCAT(A.CAMINHO, '%'))`;
const OPCAO = (param, opcoes) => `'{{${param}}}' IN (${opcoes.map((o) => `'${o}'`).join(', ')})`;
const OPCOES_OK = Object.entries(OPCOES).filter(([k]) => k !== 'capacidade').map(([k, o]) => OPCAO(k, o)).join(' AND ');
const NUM_OU_NULO = (k) => `CAST(NULLIF('{{${k}}}', '') AS DECIMAL(15,2))`;
const DATA_OU_NULO = (k) => `NULLIF('{{${k}}}', '')`;
const SOL_DA_AO = 'CC_SOLICITACAO S WHERE S.ID = CC_ANALISE_ORGAO.SOLICITACAO_ID';
/** Coluna livre (sem decisão), livre depois da decisão, ou livre na pré-aprovada (PA-18). */
const SET_ANALISE = (col, valor, quando) => `${col} = CASE WHEN ${quando} THEN ${valor} ELSE ${col} END`;
const SEM_DECISAO = `(SELECT S.DECISAO_RESULTADO FROM ${SOL_DA_AO}) = ''`;
const PRE_OU_SEM = `(SELECT S.DECISAO_RESULTADO FROM ${SOL_DA_AO}) IN ('', 'PRE_APROVADA')`;
const ANALISE_SOL_OK = `EXISTS (SELECT 1 FROM CC_SOLICITACAO S WHERE S.ID = CC_ANALISE_ORGAO.SOLICITACAO_ID AND S.CARTEIRA = 'PUBLICA' AND S.ENCERRADA_EM IS NULL
    AND ${ATOR('{{membroId}}', CASO_SOL('S'))})`;
const NF_OPERA = (n) => `EXISTS (SELECT 1 FROM CC_CLIENTE C WHERE C.ID = ${n}.CLIENTE_ID AND ${ATOR('{{membroId}}', `A.CARGO <> 'JURIDICO' AND ${clienteVisivelA('C', 'A')}`)})`;
const D = (k) => `'{{${k}}}'`;
/** Regra verificada cujo prazo, contagem, esfera ou UF muda volta a confirmar (RN-035). */
const REGRA_VOLTA = `SITUACAO = 'VERIFICADO' AND (LIQ_DIAS <> {{liqDias}} OR PAG_DIAS <> {{pagDias}} OR CONTAGEM <> '{{contagem}}' OR ESFERA <> '{{esfera}}'
      OR UF <> '{{uf}}')`;
/** Certidão: tipo da lista, emissão até a validade e arquivo (se veio) de certidão não removido (O-02 da B3). */
const CERTIDAO_OK = `${OPCAO('tipo', TIPOS_CERTIDAO)} AND '{{cnpj}}' <> '' AND '{{validade}}' <> '' AND ('{{emissao}}' = '' OR '{{emissao}}' <= '{{validade}}')
  AND ({{anexoId}} + 0 = 0 OR EXISTS (SELECT 1 FROM CC_ANEXO AX WHERE AX.ID = {{anexoId}} AND AX.ENTIDADE = 'CERTIDAO' AND AX.REMOVIDO_EM IS NULL))`;

const INTERNAS = {
  ccEscPubAnaliseInserir: `INSERT INTO CC_ANALISE_ORGAO (SOLICITACAO_ID, CLIENTE_ID, ESFERA, CAPAG, CAPACIDADE, CAPACIDADE_MANUAL, PESSOAL_PCT, CAUC, FONTE_TIPO,
  FONTE_PAGADORA, PERFIL_PAG, ATRASO_MEDIO, ATRASO_MEDIO_MANUAL, RESTOS_A_PAGAR, EMPENHO_PREVIO, CONTRATO_VIGENTE, BASE, EDITAL, VALOR_ESTIMADO, CONTRATO,
  SALDO_CONTRATO, VIGENCIA_FIM, REGRA_ID, PRAZO_CONTRATO_DIAS, ATUALIZADO_EM, ATUALIZADO_POR, PROPOSTA_POR)
SELECT S.ID, S.CLIENTE_ID, '{{esfera}}', '{{capag}}', '{{capacidade}}', ({{capacidadeManual}} = 1), ${NUM_OU_NULO('pessoalPct')}, '{{cauc}}', '{{fonteTipo}}',
  '{{fontePagadora}}', '{{perfilPag}}', CAST(NULLIF('{{atrasoMedio}}', '') AS SIGNED), ({{atrasoMedioManual}} = 1), '{{restosAPagar}}', '{{empenhoPrevio}}',
  '{{contratoVigente}}', '{{base}}', '{{edital}}', ${NUM_OU_NULO('valorEstimado')}, '{{contrato}}', ${NUM_OU_NULO('saldoContrato')}, ${DATA_OU_NULO('vigenciaFim')},
  NULLIF({{regraId}} + 0, 0), {{prazoContratoDias}} + 0, '{{agora}}', {{membroId}}, ${PROPONENTE_ADD("''")}
FROM CC_SOLICITACAO S
WHERE S.ID = {{solicitacaoId}} AND S.CARTEIRA = 'PUBLICA' AND S.ENCERRADA_EM IS NULL AND S.DECISAO_RESULTADO = ''
  AND NOT EXISTS (SELECT 1 FROM CC_ANALISE_ORGAO X WHERE X.SOLICITACAO_ID = S.ID)
  AND ${OPCOES_OK} AND ${OPCAO('capacidade', OPCOES.capacidade)}
  AND ${ATOR('{{membroId}}', CASO_SOL('S'))}`,
  ccEscPubAnaliseAtualizar: `UPDATE CC_ANALISE_ORGAO SET PROPOSTA_POR = ${PROPONENTE_ADD('PROPOSTA_POR')},
  ${[['ESFERA', D('esfera')], ['CAPAG', D('capag')], ['CAPACIDADE', D('capacidade')], ['CAPACIDADE_MANUAL', '({{capacidadeManual}} = 1)'],
    ['PESSOAL_PCT', NUM_OU_NULO('pessoalPct')], ['CAUC', D('cauc')], ['FONTE_TIPO', D('fonteTipo')], ['FONTE_PAGADORA', D('fontePagadora')],
    ['PERFIL_PAG', D('perfilPag')], ['ATRASO_MEDIO', "CAST(NULLIF('{{atrasoMedio}}', '') AS SIGNED)"], ['ATRASO_MEDIO_MANUAL', '({{atrasoMedioManual}} = 1)'],
    ['RESTOS_A_PAGAR', D('restosAPagar')]].map(([c, x]) => SET_ANALISE(c, x, SEM_DECISAO)).join(',\n  ')},
  ${[['EMPENHO_PREVIO', D('empenhoPrevio')], ['CONTRATO_VIGENTE', D('contratoVigente')], ['BASE', D('base')], ['EDITAL', D('edital')],
    ['VALOR_ESTIMADO', NUM_OU_NULO('valorEstimado')]].map(([c, x]) => SET_ANALISE(c, x, PRE_OU_SEM)).join(',\n  ')},
  CONTRATO = '{{contrato}}', SALDO_CONTRATO = ${NUM_OU_NULO('saldoContrato')}, VIGENCIA_FIM = ${DATA_OU_NULO('vigenciaFim')}, REGRA_ID = NULLIF({{regraId}} + 0, 0),
  PRAZO_CONTRATO_DIAS = {{prazoContratoDias}} + 0, ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = {{membroId}}
WHERE SOLICITACAO_ID = {{solicitacaoId}} AND ${OPCOES_OK} AND ${OPCAO('capacidade', OPCOES.capacidade)} AND {{prazoContratoDias}} + 0 >= 0
  AND ${ANALISE_SOL_OK}`,
  // B-01 da B3 (DT-40): quem grava a fotografia entra em PROPOSTA_POR na mesma instrução e a decisão o exclui.
  ccEscPubAnaliseMotor: `UPDATE CC_ANALISE_ORGAO SET PROPOSTA_POR = ${PROPONENTE_ADD('PROPOSTA_POR')}, NOTA = {{nota}}, PONTOS = '{{pontos}}',
  RATING_PUB = '{{ratingPub}}', EXPOSICAO = {{exposicao}}, DECISAO_SUGERIDA = '{{decisaoSugerida}}', CALCULADO_EM = '{{agora}}'
WHERE SOLICITACAO_ID = {{solicitacaoId}} AND '{{ratingPub}}' IN ('P1', 'P2', 'P3', 'P4') AND {{nota}} BETWEEN 0 AND 100 AND {{exposicao}} >= 0
  AND ${ANALISE_SOL_OK}`,
  ccEscPubNfDatas: `UPDATE CC_NF_PUBLICA SET EMPENHO = '{{empenho}}', PROTOCOLO = ${DATA_OU_NULO('protocolo')}, ATESTO = ${DATA_OU_NULO('atesto')},
  LIQUIDACAO = ${DATA_OU_NULO('liquidacao')}, OP = ${DATA_OU_NULO('op')}, FILA_POSICAO = NULLIF({{filaPosicao}} + 0, 0), ANALISE_ID = NULLIF({{analiseId}} + 0, 0),
  REGRA_ID = NULLIF({{regraId}} + 0, 0), PEQUENO_VALOR = ({{pequenoValor}} = 1), PRAZO_CONTRATO = ({{prazoContrato}} = 1), LIQUIDAR_ATE = ${DATA_OU_NULO('liquidarAte')},
  PAGAR_ATE = ${DATA_OU_NULO('pagarAte')}, LIMITE_2M = ${SOMAR_MESES('EMISSAO', 2)}, M2_DEVIDO = ${DATA_OU_NULO('m2Devido')},
  ETAPA_NF = CASE WHEN '{{op}}' <> '' THEN 'OP' WHEN '{{liquidacao}}' <> '' THEN 'LIQUIDADA' WHEN '{{atesto}}' <> '' THEN 'ATESTADA'
    WHEN '{{protocolo}}' <> '' THEN 'PROTOCOLADA' ELSE 'ENTREGUE' END,
  PROX_PASSO = '{{proxPasso}}', PROX_PASSO_DATA = ${DATA_OU_NULO('proxPassoData')}, CALCULADO_EM = '{{agora}}', ATUALIZADO_EM = '{{agora}}',
  ATUALIZADO_POR = {{membroId}}
WHERE ID = {{nfId}} AND PAGO_EM IS NULL AND BAIXADA = FALSE AND CANCELADA = FALSE AND {{filaPosicao}} + 0 >= 0
  AND ('{{protocolo}}' = '' OR ('{{protocolo}}' >= EMISSAO AND '{{protocolo}}' <= ${HOJE_SQL}))
  AND ('{{atesto}}' = '' OR ('{{protocolo}}' <> '' AND '{{atesto}}' >= '{{protocolo}}' AND '{{atesto}}' <= ${HOJE_SQL}))
  AND ('{{liquidacao}}' = '' OR ('{{atesto}}' <> '' AND '{{liquidacao}}' >= '{{atesto}}' AND '{{liquidacao}}' <= ${HOJE_SQL}))
  AND ('{{op}}' = '' OR ('{{liquidacao}}' <> '' AND '{{op}}' >= '{{liquidacao}}' AND '{{op}}' <= ${HOJE_SQL}))
  AND ({{analiseId}} + 0 = 0 OR EXISTS (SELECT 1 FROM CC_ANALISE_ORGAO AO JOIN CC_SOLICITACAO S ON S.ID = AO.SOLICITACAO_ID
    WHERE AO.ID = {{analiseId}} AND AO.CLIENTE_ID = CC_NF_PUBLICA.CLIENTE_ID AND S.DECISAO_RESULTADO IN ('APROVADA', 'PRE_APROVADA')))
  AND ${NF_OPERA('CC_NF_PUBLICA')}`,
  ccEscPubNfAcaoInserir: `INSERT INTO CC_NF_ACAO (NF_ID, CLIENTE_ID, PASSO, PRAZO, FEITO_EM, FEITO_POR, NO_PRAZO, PROTOCOLO_ORGAO, EMAIL_ENVIADO_ID, OBS)
SELECT N.ID, N.CLIENTE_ID, '{{passo}}', '{{prazo}}', ${AGORA_SQL}, {{membroId}}, (${HOJE_SQL} <= '{{prazo}}'), '{{protocoloOrgao}}',
  NULLIF({{emailEnviadoId}} + 0, 0), '{{obs}}'
FROM CC_NF_PUBLICA N
WHERE N.ID = {{nfId}} AND N.PAGO_EM IS NULL AND N.BAIXADA = FALSE AND N.CANCELADA = FALSE AND '{{prazo}}' <> ''
  AND (('{{passo}}' = 'CONF' AND N.PROTOCOLO IS NOT NULL AND N.ATESTO IS NULL)
    OR ('{{passo}}' IN ('L1', 'L2', 'L3') AND N.LIQUIDACAO IS NULL AND N.LIQUIDAR_ATE IS NOT NULL)
    OR ('{{passo}}' IN ('G1', 'G2', 'G3', 'G4', 'G5') AND N.PAGAR_ATE IS NOT NULL AND (N.LIQUIDACAO IS NOT NULL OR ${HOJE_SQL} > N.PAGAR_ATE))
    OR ('{{passo}}' = 'M2' AND N.LIMITE_2M IS NOT NULL))
  AND NOT EXISTS (SELECT 1 FROM CC_NF_ACAO X WHERE X.NF_ID = N.ID AND X.PASSO = '{{passo}}')
  AND ({{emailEnviadoId}} + 0 = 0 OR EXISTS (SELECT 1 FROM CC_EMAIL_ENVIADO E WHERE E.ID = {{emailEnviadoId}} AND E.CLIENTE_ID = N.CLIENTE_ID))
  AND ${NF_OPERA('N')}`,
  ccEscPubNfPassoAtualizar: `UPDATE CC_NF_PUBLICA SET PROX_PASSO = '{{proxPasso}}', PROX_PASSO_DATA = ${DATA_OU_NULO('proxPassoData')}
WHERE ID = {{nfId}} AND PAGO_EM IS NULL AND BAIXADA = FALSE AND CANCELADA = FALSE
  AND '{{proxPasso}}' IN ('', 'CONF', 'L1', 'L2', 'L3', 'G1', 'G2', 'G3', 'G4', 'G5', 'M2') AND ${NF_OPERA('CC_NF_PUBLICA')}`,
  ccEscPubRegraInserir: `INSERT INTO CC_REGRA_PAGAMENTO_ENTE (NOME, ESFERA, UF, LIQ_DIAS, PAG_DIAS, CONTAGEM, BASE_LEGAL, LINK, SITUACAO, ATIVO, ATUALIZADO_EM, ATUALIZADO_POR)
SELECT '{{nome}}', '{{esfera}}', '{{uf}}', {{liqDias}}, {{pagDias}}, '{{contagem}}', '{{baseLegal}}', '{{link}}', 'A_CONFIRMAR', ({{ativo}} = 1), '{{agora}}', {{membroId}}
FROM DUAL
WHERE '{{nome}}' <> '' AND '{{esfera}}' IN ('', 'FEDERAL', 'ESTADUAL', 'MUNICIPAL') AND '{{contagem}}' IN ('UTEIS', 'CORRIDOS')
  AND {{liqDias}} > 0 AND {{pagDias}} > 0 AND ${ATOR('{{membroId}}', NIVEL_MIN(2))}`,
  // 06 §5 (C-02 da B3): o MySQL aplica o SET da esquerda para a direita com os valores já alterados. VALIDADO_* leem SITUACAO,
  // e os três leem os prazos: vêm antes deles, nessa ordem. Teste: tests/005 "C-02".
  ccEscPubRegraAtualizar: `UPDATE CC_REGRA_PAGAMENTO_ENTE SET
  VALIDADO_POR = CASE WHEN {{validar}} = 1 THEN {{membroId}} WHEN ${REGRA_VOLTA} THEN NULL ELSE VALIDADO_POR END,
  VALIDADO_EM = CASE WHEN {{validar}} = 1 THEN '{{agora}}' WHEN ${REGRA_VOLTA} THEN NULL ELSE VALIDADO_EM END,
  SITUACAO = CASE WHEN {{validar}} = 1 THEN 'VERIFICADO' WHEN ${REGRA_VOLTA} THEN 'A_CONFIRMAR' ELSE SITUACAO END,
  NOME = CASE WHEN {{validar}} = 1 THEN NOME ELSE '{{nome}}' END, ESFERA = CASE WHEN {{validar}} = 1 THEN ESFERA ELSE '{{esfera}}' END,
  UF = CASE WHEN {{validar}} = 1 THEN UF ELSE '{{uf}}' END, LIQ_DIAS = CASE WHEN {{validar}} = 1 THEN LIQ_DIAS ELSE {{liqDias}} END,
  PAG_DIAS = CASE WHEN {{validar}} = 1 THEN PAG_DIAS ELSE {{pagDias}} END, CONTAGEM = CASE WHEN {{validar}} = 1 THEN CONTAGEM ELSE '{{contagem}}' END,
  BASE_LEGAL = CASE WHEN {{validar}} = 1 THEN BASE_LEGAL ELSE '{{baseLegal}}' END, LINK = CASE WHEN '{{link}}' <> '' THEN '{{link}}' ELSE LINK END,
  ATIVO = CASE WHEN {{validar}} = 1 THEN ATIVO ELSE ({{ativo}} = 1) END, ATUALIZADO_EM = '{{agora}}', ATUALIZADO_POR = {{membroId}}
WHERE ID = {{regraId}} AND '{{esfera}}' IN ('', 'FEDERAL', 'ESTADUAL', 'MUNICIPAL') AND '{{contagem}}' IN ('UTEIS', 'CORRIDOS') AND {{liqDias}} > 0 AND {{pagDias}} > 0
  AND (({{validar}} = 1 AND (LINK <> '' OR '{{link}}' <> '') AND ${ATOR('{{membroId}}', `(A.CARGO = 'JURIDICO' OR ${NIVEL_MIN(3)})`)})
    OR ({{validar}} = 0 AND ${ATOR('{{membroId}}', NIVEL_MIN(2))}))`,
  ccEscPubCertidaoInserir: `INSERT INTO CC_CERTIDAO (TIPO, CNPJ, ABRANGENCIA, NUMERO, EMISSAO, VALIDADE, ANEXO_ID, REGISTRADO_EM, REGISTRADO_POR)
SELECT '{{tipo}}', '{{cnpj}}', '{{abrangencia}}', '{{numero}}', ${DATA_OU_NULO('emissao')}, '{{validade}}', NULLIF({{anexoId}} + 0, 0), '{{agora}}', {{membroId}}
FROM DUAL
WHERE ${CERTIDAO_OK} AND ${ATOR('{{membroId}}', NIVEL_MIN(2))}`,
  ccEscPubCertidaoAtualizar: `UPDATE CC_CERTIDAO SET TIPO = '{{tipo}}', CNPJ = '{{cnpj}}', ABRANGENCIA = '{{abrangencia}}', NUMERO = '{{numero}}',
  EMISSAO = ${DATA_OU_NULO('emissao')}, VALIDADE = '{{validade}}', ANEXO_ID = NULLIF({{anexoId}} + 0, 0), REGISTRADO_EM = '{{agora}}', REGISTRADO_POR = {{membroId}}
WHERE ID = {{certidaoId}} AND ${CERTIDAO_OK} AND ${ATOR('{{membroId}}', NIVEL_MIN(2))}`,
};

/* ── definitions ── */

// Números como parâmetro (DT-45): todo {{x}} fora de aspas vira CAST; DECIMAIS = os valores em dinheiro desta spec.
const DECIMAIS = ['exposicao'];
const sql = (name, code, extra = {}) => ({ name, type: 'SQL', code: numerosComoParametro(code, DECIMAIS), ...extra });
const jsDef = (name, code, extra = {}) => ({ name, type: 'JAVASCRIPT', code, ...extra });
/** Corpo de SF JAVASCRIPT: preâmbulo + fontes da 005 + a função. */
const sf = (fn) => js([FONTE_005, String(preencher), constante('SQL_WINTHOR_NF', SQL_NF_PUBLICA), `const podeLer = ${podeLer};`, constante('TIPOS_CERTIDAO', TIPOS_CERTIDAO),
  `const RESERVA_ORGAO = ${RESERVA_ORGAO};`, `return await (${fn})();`].join('\n'));

export const definitions = [
  // ── Leituras ──
  jsDef('ccPubAnaliseObter', sf(corpoAnaliseObter)),
  jsDef('ccPubMotorCalcular', sf(corpoMotorCalcular)),
  sql('ccPubNfListar', SQL_NF_LISTAR),
  sql('ccPubNfTotal', SQL_NF_TOTAL),
  jsDef('ccPubNfFicha', sf(corpoNfFicha)),
  jsDef('ccPubMensagemPreparar', sf(corpoMensagemPreparar)),
  sql('ccPubReguaCumprimento', SQL_CUMPRIMENTO),
  sql('ccPubContratoListar', SQL_CONTRATO_LISTAR),
  sql('ccPubContratoTotal', SQL_CONTRATO_TOTAL),
  sql('ccPubResumo', SQL_RESUMO),
  sql('ccPubRegraEnteListar', SQL_REGRA_LISTAR),
  sql('ccPubCertidaoListar', SQL_CERTIDAO_LISTAR),
  // ── Escritas ──
  jsDef('ccPubAnaliseSalvar', sf(corpoAnaliseSalvar)),
  jsDef('ccPubNfDatasSalvar', sf(corpoNfDatasSalvar)),
  jsDef('ccPubNfPassoRegistrar', sf(corpoNfPassoRegistrar)),
  jsDef('ccPubRegraEnteSalvar', sf(corpoRegraEnteSalvar)),
  jsDef('ccPubCertidaoSalvar', sf(corpoCertidaoSalvar)),
  jsDef('ccPubRotina', sf(corpoRotina)),
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
  const linhasDe = (r) => r?.result?.rows ?? r?.rows ?? (Array.isArray(r?.result) ? r.result : []);
  // DT-38: as regras iniciais entram só com a tabela vazia (o seed do simulador faz o mesmo).
  const [qtd] = linhasDe(await sdk.runQueryMitra({ projectId, sql: 'SELECT COUNT(*) AS N FROM CC_REGRA_PAGAMENTO_ENTE' }));
  if (!Number(qtd?.N)) {
    await sdk.runDmlMitra({ projectId, sql: `INSERT INTO CC_REGRA_PAGAMENTO_ENTE (NOME, ESFERA, UF, LIQ_DIAS, PAG_DIAS, CONTAGEM, BASE_LEGAL, LINK, SITUACAO, ATIVO)
VALUES ${REGRAS_INICIAIS.map((r) => `(${[txt(r.NOME), txt(r.ESFERA), txt(r.UF), r.LIQ_DIAS, r.PAG_DIAS, txt(r.CONTAGEM), txt(r.BASE_LEGAL), "''", "'A_CONFIRMAR'", 'TRUE'].join(', ')})`).join(',\n')}` });
  }
  const { jdbcIdWinthor } = await import('./add-002-jdbc-winthor.mjs');
  const jdbc = await jdbcIdWinthor(projectId);
  const lerMapa = async () => Object.fromEntries(((await sdk.listServerFunctionsMitra({ projectId })).result ?? []).map((f) => [f.name, f.id]));
  const publicar = async (def, mapa) => {
    const code = def.type === 'JAVASCRIPT' ? injetarIds(def.code, mapa).split(MARCADOR_JDBC_WINTHOR).join(String(jdbc)) : def.code;
    const dados = { name: def.name, type: def.type, code, description: `Crédito e Cobrança · 005-setor-publico · ${def.name}`,
      ...(def.jdbcId === MARCADOR_JDBC_WINTHOR ? { jdbcId: jdbc } : {}) };
    if (mapa[def.name]) await sdk.updateServerFunctionMitra({ projectId, serverFunctionId: mapa[def.name], ...dados });
    else await sdk.createServerFunctionMitra({ projectId, ...dados });
  };
  let mapa = await lerMapa();
  for (const def of definitions) await publicar(def, mapa);
  mapa = await lerMapa();
  for (const def of definitions.filter((d) => d.type === 'JAVASCRIPT')) await publicar(def, mapa);
  console.log(`Pronto: ${definitions.length} server functions da 005.`);
  console.log('Republique o add-010 (ccPodeMover com o trecho de concessao-publica), o add-040 (ramo público da decisão), o add-001-kanban, o add-090 e o sync-server-function-map.');
}

