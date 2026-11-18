// Seed da 006-painel-consolidado (plan, seção Simulador; DT-38): clientes 6001–6010 ("CARTEIRA 01…10") no Winthor
// simulado e, no domínio, as fotos de setembro e outubro (a 006 é dona da tabela; a foto não tem SF de escrita além
// da rotina, PA-23), o Grupo Alfa, a baixa de 6005 pelas SFs da 002 e as mudanças no Winthor que a leitura do passo
// 11 vê (parcela de 6005 cancelada, pagamento de 6002 desfeito = estorno). Datas absolutas: as fotos são de meses
// fixos e o RELOGIO dos bancos da 006 é 2026-11-14T10:00:00. A atribuição (6001–6005 Ana, 6006–6010 Carlos) é do elenco.

import { cliente, nota, chamarComo, bancoDoSeed, M } from './000-elenco.mjs';

const BU = { N: 101, E: 201, S: 401 };
const BU_ID = { 101: 1, 201: 2, 401: 4 };

// [codcli, ramo, uf, plano, limite, notas]; nota = [emissão, produto, parcelas]; parcela = [valor, venc, pagoEm?]
export const CLIENTES = [
  [6001, 1, 'SP', '30', 20000, [['2026-10-25', BU.N, [[5000, '2026-11-10', '2026-11-10'], [10000, '2026-12-09']]], ['2026-11-01', BU.N, [[2000, '2026-11-02']]]]],
  [6002, 2, 'SP', '30', 10000, [['2026-08-06', BU.E, [[5000, '2026-09-05', '2026-11-03']]]]],
  [6003, 1, 'RJ', '30', 40000, [
    ...['06', '07', '08', '09', '10'].map((mm) => [`2026-${mm}-05`, BU.N, [[20000, `2026-${String(Number(mm) + 1).padStart(2, '0')}-05`, `2026-${String(Number(mm) + 1).padStart(2, '0')}-05`]]]),
    ['2026-11-05', BU.N, [[20000, '2026-12-05']]]]],
  [6004, 2, 'MG', '35', 10000, [['2026-09-05', BU.S, [[3000, '2026-10-05']]], ['2026-10-05', BU.S, [[1000, '2026-11-04']]], ['2026-10-15', BU.N, [[4000, '2026-12-05']]]]],
  [6005, 3, 'SP', '1', 5000, [['2026-09-15', BU.N, [[2000, '2026-10-15']]]]],
  [6006, 13, 'GO', '35', 80000, [['2026-06-15', BU.N, [[6000, '2026-07-15', '2026-10-20']]], ['2026-07-07', BU.N, [[8000, '2026-08-06']]], ['2026-10-20', BU.N, [[30000, '2026-12-19']]]]],
  [6007, 4, 'PR', '35', 5000, [['2026-04-08', BU.E, [[4000, '2026-05-08']]]]],
  [6008, 2, 'SP', '30', 6300, [['2026-11-03', BU.N, [[6000, '2026-12-03']]]]],
  [6009, 3, 'SP', '1', 5000, [['2026-09-10', BU.N, [[3000, '2026-10-10', '2026-11-05']]]]],
  [6010, 4, 'RJ', '35', 5000, [['2026-08-21', BU.E, [[2000, '2026-09-20', '2026-11-06']]], ['2026-09-26', BU.E, [[1000, '2026-10-26']]]]],
];

export function winthor() {
  for (const [codcli, ramo, uf, plano, limite, notas] of CLIENTES) {
    cliente({ codcli, nome: `CARTEIRA ${String(codcli - 6000).padStart(2, '0')}`, ramo, uf, plano, limite });
    notas.forEach(([emissao, codprod, parcelas], i) => {
      const valor = parcelas.reduce((s, [v]) => s + v, 0);
      nota({ codcli, n: i + 1, emissao, itens: [{ codprod, valor }],
        parcelas: parcelas.map(([v, venc, pagoEm], j) => ({ prest: j + 1, valor: v, venc, ...(pagoEm ? { pago: true, pagoEm } : {}) })) });
    });
  }
}

/* ── fotos semeadas (plan, "Fotos semeadas"): calculadas dos mesmos títulos, na data da foto ── */

const PDD_PADRAO = [0.5, 3, 10, 30, 50, 100];
const FAIXAS = ['A_VENCER', 'V_1_30', 'V_31_60', 'V_61_90', 'V_91_180', 'V_180'];
const dias = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const GRUPO = { 6001: 'Grupo Alfa', 6002: 'Grupo Alfa' };

/** Linhas cliente × BU da foto do mês `mes`, tirada em `data`, com o movimento sobre a foto `anterior`. */
export function fotoDe(mes, data, anterior = []) {
  const fimDoMes = `${mes}-31`;
  const linhas = new Map();
  for (const [codcli, , uf, plano, limite, notas] of CLIENTES) {
    for (const [emissao, codprod, parcelas] of notas) {
      if (emissao > fimDoMes) continue;
      for (const [valor, venc, pagoEm] of parcelas) {
        const chave = `${codcli}/${BU_ID[codprod]}`;
        const l = linhas.get(chave) || { CODCLI: codcli, BU_ID: BU_ID[codprod], UF: uf, PLANO_COD: plano, LIMITE_CLIENTE: limite,
          ...Object.fromEntries(FAIXAS.map((f) => [f, 0])), VDIAS: 0, DIAS_ATRASO: 0, RECUPERADO: 0 };
        if (pagoEm && pagoEm.slice(0, 7) === mes && pagoEm > venc) l.RECUPERADO += valor;
        if (!pagoEm || pagoEm > data) {
          const d = dias(venc, data);
          const f = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : d <= 180 ? 4 : 5;
          l[FAIXAS[f]] += valor;
          if (d > 0) { l.VDIAS += valor * d; l.DIAS_ATRASO = Math.max(l.DIAS_ATRASO, d); }
        }
        linhas.set(chave, l);
      }
    }
  }
  const saida = [];
  for (const l of linhas.values()) {
    l.VENCIDO = FAIXAS.slice(1).reduce((s, f) => s + l[f], 0);
    const saldo = l.A_VENCER + l.VENCIDO;
    const ant = anterior.find((a) => a.CODCLI === l.CODCLI && a.BU_ID === l.BU_ID);
    if (!saldo && !(ant && ant.A_VENCER + ant.VENCIDO > 0) && !l.RECUPERADO) continue;
    l.FAIXA = !saldo ? -1 : !l.VENCIDO ? 0 : l.DIAS_ATRASO <= 30 ? 1 : l.DIAS_ATRASO <= 60 ? 2 : l.DIAS_ATRASO <= 90 ? 3 : l.DIAS_ATRASO <= 180 ? 4 : 5;
    l.PDD = Math.round(FAIXAS.reduce((s, f, i) => s + l[f] * PDD_PADRAO[i], 0)) / 100;
    l.VENCIDO_INICIAL = ant ? ant.VENCIDO : 0;
    l.GERADA = anterior.length ? Math.max(0, l.VENCIDO - l.VENCIDO_INICIAL + l.RECUPERADO) : 0;
    l.CARTEIRA = l.CODCLI === 6006 ? 'PUBLICA' : l.BU_ID === 4 ? 'ESTETICA' : 'PRIVADA';
    l.AGENTE = l.CODCLI <= 6005 ? M.ana : M.carlos;
    l.GRUPO = GRUPO[l.CODCLI] || '';
    l.SALDO = saldo;
    saida.push(l);
  }
  for (const l of saida) {
    const doCliente = saida.filter((x) => x.CODCLI === l.CODCLI);
    const maior = doCliente.reduce((a, b) => (b.SALDO > a.SALDO || (b.SALDO === a.SALDO && b.BU_ID < a.BU_ID) ? b : a));
    l.PRINCIPAL = maior === l && l.SALDO > 0;
    l.UTILIZADO_CLIENTE = doCliente.reduce((s, x) => s + x.SALDO, 0);
  }
  return saida;
}

export async function dominio() {
  const { db } = bancoDoSeed();
  const um = (sql, ...p) => db.prepare(sql).get(...p);
  const idDe = (codcli) => Number(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);

  // (1) As fotos que a rotina tirou nos passos 8–9 saem; entram setembro e outubro.
  db.prepare('DELETE FROM CC_FOTO_AGING').run();
  const setembro = fotoDe('2026-09', '2026-10-01');
  const outubro = fotoDe('2026-10', '2026-11-01', setembro);
  const inserir = db.prepare(`INSERT INTO CC_FOTO_AGING (MES, MES_SEGUINTE, CLIENTE_ID, BU_ID, CARTEIRA, AGENTE_ID, GRUPO_ECONOMICO, UF, PLANO_COD, EM_JURIDICO,
  A_VENCER, V_1_30, V_31_60, V_61_90, V_91_180, V_180, VENCIDO, VDIAS, DIAS_ATRASO, FAIXA, PDD, VENCIDO_INICIAL, GERADA, RECUPERADO, BAIXADO,
  PRINCIPAL, LIMITE, UTILIZADO, SINCRONIZACAO_ID, SINCRONIZACAO_EM)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?)`);
  for (const [mes, seguinte, em, linhas] of [['2026-09', '2026-10', '2026-10-01T00:15:00', setembro], ['2026-10', '2026-11', '2026-11-01T00:15:00', outubro]]) {
    for (const l of linhas) {
      inserir.run(mes, seguinte, idDe(l.CODCLI), l.BU_ID, l.CARTEIRA, l.AGENTE, l.GRUPO, l.UF, l.PLANO_COD, ...FAIXAS.map((f) => l[f]), l.VENCIDO, l.VDIAS,
        l.DIAS_ATRASO, l.FAIXA, l.PDD, l.VENCIDO_INICIAL, l.GERADA, l.RECUPERADO, l.PRINCIPAL ? 1 : 0, l.PRINCIPAL ? l.LIMITE_CLIENTE : 0,
        l.PRINCIPAL ? l.UTILIZADO_CLIENTE : 0, em);
    }
  }

  // (2) Grupo Alfa (RN-014, C-018, C-025).
  for (const codcli of [6001, 6002]) await chamarComo('gustavo', 'ccBaseClienteClassificar', { clienteId: idDe(codcli), grupoEconomico: 'Grupo Alfa' });

  // (3) Baixa de 6005 (C-011, C-012): Sérgio propõe, Júlia dá parecer, Gustavo aprova — SFs da 002; sem a 002, pula.
  const caso = um(`SELECT CB.ID FROM CC_COBRANCA CB WHERE CB.CLIENTE_ID = ? AND CB.CARTEIRA = 'PRIVADA' AND CB.ENCERRADO_EM IS NULL`, idDe(6005));
  if (caso && bancoDoSeed().runner.existe('ccCobBaixaPropor')) {
    const { baixaId } = await chamarComo('sergio', 'ccCobBaixaPropor', { cobrancaId: caso.ID, valor: 2000, motivo: 'Esgotadas as vias de cobrança', docRegua: 1 });
    await chamarComo('julia', 'ccCobBaixaParecer', { baixaId, resultado: 'FAVORAVEL', texto: 'Sem bens localizáveis.' });
    await chamarComo('gustavo', 'ccCobBaixaDecidir', { baixaId, aprovar: 1, texto: 'Aprovada.' });
  }

  // (4) Winthor simulado: a parcela baixada de 6005 é cancelada; o pagamento de 6002 é desfeito (a leitura grava o estorno).
  db.prepare("UPDATE PCPREST SET DTCANCEL = '2026-11-14' WHERE CODCLI = 6005").run();
  db.prepare('UPDATE PCPREST SET VPAGO = 0, DTPAG = NULL WHERE CODCLI = 6002').run();
}
