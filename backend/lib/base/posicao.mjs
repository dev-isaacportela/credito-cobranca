// Posição do cliente a partir dos títulos do Winthor (plan 001, "Leitura do Winthor"; RN-001 a
// RN-006, RN-028 a RN-030). Pura: a mesma função serve a leitura (`ccBaseSincronizar`) e os títulos
// ao vivo (`ccBaseTitulosAbertos`, saída `linhas`). Entra nas SFs por `FONTE` (inclui dias úteis).
//
// titulos: [{ CODCLI, NUMTRANSVENDA, PREST, DUPLIC, CODFILIAL, NUMNOTA, VALOR, VPAGO, DTVENC, DTEMISSAO, DTPAG, DTCANCEL, CODCOB }]
// itens:   [{ NUMTRANSVENDA, CODEPTO, VALOR }]  valor dos itens da venda por departamento
// ctx: {
//   hoje, feriados (nacionais + UF de base.calendarioUf),
//   buDoDepto { codepto: buId|null }, carteiraDaBu { buId: 'PRIVADA'|'ESTETICA' }, nomeDaBu { buId: nome },
//   publicos [codcli…] (setor PUBLICO), cobrancasExcluidas ('DESD,CANC' ou lista),
//   vencimentoDiaNaoUtil { PRIVADA, ESTETICA, PUBLICA } (valor em vigor hoje em cada carteira),
//   cadastro { codcli: { LIMITE, COMPRAS_QTD, COMPRAS_VALOR, SOMA_VALOR_PRAZO, ULTIMA_COMPRA, PRAZO_PLANO } } (opcional),
//   comprasJanelaDias (90)
// }
// → { linhas: [uma por título], clientes: [{ CODCLI, total, porBu[], porCarteira[] }] } com colunas em CAIXA ALTA.

import { FONTE as FONTE_DIAS_UTEIS, mapaDeFeriados, proximoUtil, anteriorUtil, somarDiasUteis } from '../dias-uteis.mjs';

/** Diferença em dias corridos (b − a) entre duas datas AAAA-MM-DD. */
export function diasEntre(a, b) {
  const t = (d) => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  return Math.round((t(b) - t(a)) / 86400000);
}

/** Vencimento efetivo pela regra da carteira (D-03), só dentro da janela −400 a +90 dias de hoje. */
export function vencimentoEfetivo(venc, regra, hojeData, feriados) {
  const data = String(venc).slice(0, 10);
  if (!regra || regra === 'CORRIDO') return data;
  const distancia = diasEntre(hojeData, data);
  if (distancia < -400 || distancia > 90) return data;
  return regra === 'PROXIMO_UTIL' ? proximoUtil(data, feriados) : regra === 'UTIL_ANTERIOR' ? anteriorUtil(data, feriados) : data;
}

/** Saldo em centavos dividido nas partes pelo peso; a sobra do arredondamento vai para a última (RN-028). */
export function ratear(centavos, pesos) {
  const total = pesos.reduce((s, p) => s + p, 0);
  if (!(total > 0)) return [centavos];
  const partes = [];
  let usado = 0;
  pesos.forEach((p, i) => {
    const parte = i === pesos.length - 1 ? centavos - usado : Math.round((centavos * p) / total);
    usado += parte;
    partes.push(parte);
  });
  return partes;
}

export function saldosVazios() {
  return { A_VENCER: 0, V_1_30: 0, V_31_60: 0, V_61_90: 0, V_91_180: 0, V_180: 0, VENCIDO: 0, VDIAS: 0, DIAS_ATRASO: 0,
    VENC_MAIS_ANTIGO: null, PROX_VENC: null, PROX_VENC_VALOR: 0, A_VENCER_7DU: 0, TITULOS_ABERTOS: 0, TITULOS_VENCIDOS: 0,
    _abertos: new Set(), _vencidos: new Set() };
}

/** Soma uma parte (centavos) no acumulador; valores em centavos até `fecharSaldos`. */
export function somarParte(acc, parte) {
  acc._abertos.add(parte.titulo);
  if (parte.dias > 0) {
    const faixa = parte.dias <= 30 ? 'V_1_30' : parte.dias <= 60 ? 'V_31_60' : parte.dias <= 90 ? 'V_61_90' : parte.dias <= 180 ? 'V_91_180' : 'V_180';
    acc[faixa] += parte.centavos;
    acc.VENCIDO += parte.centavos;
    acc.VDIAS += parte.centavos * parte.dias;
    acc._vencidos.add(parte.titulo);
    if (parte.dias > acc.DIAS_ATRASO) acc.DIAS_ATRASO = parte.dias;
    if (!acc.VENC_MAIS_ANTIGO || parte.efetivo < acc.VENC_MAIS_ANTIGO) acc.VENC_MAIS_ANTIGO = parte.efetivo;
    return;
  }
  acc.A_VENCER += parte.centavos;
  if (parte.ate7du) acc.A_VENCER_7DU += parte.centavos;
  if (!acc.PROX_VENC || parte.efetivo < acc.PROX_VENC) { acc.PROX_VENC = parte.efetivo; acc.PROX_VENC_VALOR = parte.centavos; }
  else if (parte.efetivo === acc.PROX_VENC) acc.PROX_VENC_VALOR += parte.centavos;
}

export function fecharSaldos(acc) {
  const r = (c) => Math.round(c) / 100;
  const { _abertos, _vencidos, ...s } = acc;
  for (const k of ['A_VENCER', 'V_1_30', 'V_31_60', 'V_61_90', 'V_91_180', 'V_180', 'VENCIDO', 'VDIAS', 'PROX_VENC_VALOR', 'A_VENCER_7DU']) s[k] = r(s[k]);
  s.TITULOS_ABERTOS = _abertos.size;
  s.TITULOS_VENCIDOS = _vencidos.size;
  return s;
}

export function calcularPosicao(titulos, itens, ctx) {
  const hojeData = String(ctx.hoje).slice(0, 10);
  const feriados = mapaDeFeriados(ctx.feriados || []);
  const limite7du = somarDiasUteis(hojeData, 7, feriados);
  const excluidas = new Set((Array.isArray(ctx.cobrancasExcluidas) ? ctx.cobrancasExcluidas : String(ctx.cobrancasExcluidas || '').split(','))
    .map((c) => String(c).trim().toUpperCase()).filter(Boolean));
  const publicos = new Set((ctx.publicos || []).map(Number));
  const buDoDepto = ctx.buDoDepto || {};
  const carteiraDaBu = ctx.carteiraDaBu || {};
  const regraDa = (carteira) => (ctx.vencimentoDiaNaoUtil || {})[carteira] || 'CORRIDO';
  const vazio = (v) => v === null || v === undefined || String(v).trim() === '';

  // Valor dos itens por venda × BU (departamento sem BU = BU 0).
  const pesosPorVenda = new Map();
  for (const item of itens || []) {
    const bu = Number(buDoDepto[item.CODEPTO] ?? 0) || 0;
    const venda = String(item.NUMTRANSVENDA);
    if (!pesosPorVenda.has(venda)) pesosPorVenda.set(venda, new Map());
    const porBu = pesosPorVenda.get(venda);
    porBu.set(bu, (porBu.get(bu) || 0) + Number(item.VALOR || 0));
  }

  const clientes = new Map();
  const cliente = (codcli) => {
    const k = Number(codcli);
    if (!clientes.has(k)) clientes.set(k, { CODCLI: k, total: saldosVazios(), porBu: new Map(), porCarteira: new Map() });
    return clientes.get(k);
  };
  for (const codcli of Object.keys(ctx.cadastro || {})) cliente(codcli);

  const linhas = [];
  for (const t of titulos || []) {
    const c = cliente(t.CODCLI);
    const saldo = Number(t.VALOR || 0) - Number(t.VPAGO || 0);
    // 1. Fora: pago, sem saldo, cancelado, tipo de cobrança excluído.
    if (!vazio(t.DTPAG) || saldo <= 0.004 || !vazio(t.DTCANCEL) || excluidas.has(String(t.CODCOB || '').trim().toUpperCase())) continue;
    // 2. Partes por BU, na proporção do valor dos itens da venda.
    const porBu = pesosPorVenda.get(String(t.NUMTRANSVENDA));
    const bus = porBu ? [...porBu.keys()].filter((bu) => porBu.get(bu) > 0).sort((a, b) => a - b) : [];
    const listaBus = bus.length ? bus : [0];
    const centavos = ratear(Math.round(saldo * 100), bus.length ? bus.map((bu) => porBu.get(bu)) : [1]);
    const chave = `${t.NUMTRANSVENDA}|${t.PREST}`;
    let maior = null;
    listaBus.forEach((bu, i) => {
      // 3. Carteira da parte; 4. vencimento efetivo pela regra da carteira; 5. dias e faixa.
      const carteira = publicos.has(Number(t.CODCLI)) ? 'PUBLICA' : (bu === 0 ? 'PRIVADA' : (carteiraDaBu[bu] || 'PRIVADA'));
      const efetivo = vencimentoEfetivo(t.DTVENC, regraDa(carteira), hojeData, feriados);
      const dias = diasEntre(efetivo, hojeData);
      const parte = { titulo: chave, bu, carteira, efetivo, dias, centavos: centavos[i], ate7du: efetivo >= hojeData && efetivo <= limite7du };
      if (!maior || parte.centavos > maior.centavos) maior = parte;
      // 6. Agrega por cliente, por cliente × BU e por cliente × carteira.
      somarParte(c.total, parte);
      if (!c.porBu.has(bu)) c.porBu.set(bu, { BU_ID: bu, CARTEIRA: carteira, ...saldosVazios() });
      somarParte(c.porBu.get(bu), parte);
      if (!c.porCarteira.has(carteira)) c.porCarteira.set(carteira, { CARTEIRA: carteira, ...saldosVazios(), _bus: new Map() });
      const pc = c.porCarteira.get(carteira);
      somarParte(pc, parte);
      pc._bus.set(bu, (pc._bus.get(bu) || 0) + parte.centavos);
    });
    linhas.push({
      CHAVE: chave, CODCLI: Number(t.CODCLI), TITULO: String(t.DUPLIC ?? t.NUMTRANSVENDA), PARCELA: String(t.PREST ?? ''),
      FILIAL: String(t.CODFILIAL ?? ''), NUMNOTA: t.NUMNOTA ?? null, EMISSAO: t.DTEMISSAO ? String(t.DTEMISSAO).slice(0, 10) : null,
      VENCIMENTO: String(t.DTVENC).slice(0, 10), VENCIMENTO_EFETIVO: maior.efetivo, VALOR: Number(t.VALOR || 0),
      SALDO: Math.round(saldo * 100) / 100, DIAS_ATRASO: Math.max(0, maior.dias), BU_ID: maior.bu, CARTEIRA: maior.carteira,
      CODCOB: t.CODCOB ?? '',
    });
  }

  const nomeDaBu = ctx.nomeDaBu || {};
  const janela = Number(ctx.comprasJanelaDias || 90);
  const saida = [...clientes.values()].sort((a, b) => a.CODCLI - b.CODCLI).map((c) => {
    const total = fecharSaldos(c.total);
    const cad = (ctx.cadastro || {})[c.CODCLI];
    if (cad) {
      const comprasValor = Number(cad.COMPRAS_VALOR || 0);
      total.LIMITE = Number(cad.LIMITE || 0);
      total.UTILIZADO = Math.round((total.VENCIDO + total.A_VENCER) * 100) / 100;
      total.DISPONIVEL = Math.round((total.LIMITE - total.UTILIZADO) * 100) / 100;
      total.ULTIMA_COMPRA = cad.ULTIMA_COMPRA ? String(cad.ULTIMA_COMPRA).slice(0, 10) : null;
      total.COMPRAS_QTD = Number(cad.COMPRAS_QTD || 0);
      total.COMPRAS_VALOR = Math.round(comprasValor * 100) / 100;
      total.COMPRA_MEDIA_MENSAL = Math.round((comprasValor / (janela / 30)) * 100) / 100;
      total.PRAZO_MEDIO_DIAS = comprasValor > 0 ? Math.round(Number(cad.SOMA_VALOR_PRAZO || 0) / comprasValor) : Number(cad.PRAZO_PLANO || 0);
    }
    const porCarteira = [...c.porCarteira.values()].map(({ _bus, ...pc }) => {
      const soma = [..._bus.values()].reduce((s, v) => s + v, 0);
      const composicao = [..._bus.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
        .map(([bu, v]) => `${bu === 0 ? 'Sem BU' : (nomeDaBu[bu] || `BU ${bu}`)} ${Math.round((v / soma) * 100)}%`).join(' · ');
      return { ...fecharSaldos(pc), COMPOSICAO_BU: composicao };
    });
    return { CODCLI: c.CODCLI, total, porBu: [...c.porBu.values()].map(fecharSaldos), porCarteira };
  });
  return { linhas, clientes: saida };
}

/** Texto para colar no corpo de uma SF JAVASCRIPT (dias úteis inclusos). */
export const FONTE = [FONTE_DIAS_UTEIS, ...[diasEntre, vencimentoEfetivo, ratear, saldosVazios, somarParte, fecharSaldos, calcularPosicao].map(String)].join('\n');
