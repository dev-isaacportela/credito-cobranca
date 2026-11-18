// Seed da 002-cobranca (plan, seção Simulador): clientes 2001 a 2061 no Winthor simulado, atribuição de
// 2015–2061 e, no domínio, o estado que só as SFs da 002 produzem (bloqueio, negociação, protesto, baixa,
// contatos, promessas, acordos e o caso público de 2043). Nada grava em tabela de outra dona.

import { cliente, nota, dia, chamarComo, bancoDoSeed } from './000-elenco.mjs';
import { comRelogio } from '../relogio.mjs';

const BU = { N: 101, E: 201, M: 301, S: 401 };

/** Uma nota de parcela única por título: `titulos` = [[valor, venc, bu ('N'), pago?, pagoEm?], …]. */
function titulos(codcli, lista) {
  lista.forEach(([valor, venc, bu = 'N', pago, pagoEm], i) => nota({
    codcli, n: i + 1, emissao: dia(-400 + i), itens: [{ codprod: BU[bu], valor }],
    parcelas: [{ prest: 1, valor, venc, ...(pago ? { pago, pagoEm } : {}) }],
  }));
}

const CLIENTES = [
  // 2001–2014 (06 §2.5)
  [2001, 'CLINICA AURORA LTDA', [[5000, 5]]],
  [2002, 'HOSPITAL BOA ESPERANCA', [[8000, 1]]],
  [2003, 'FARMACIA CENTRAL LTDA', [[3000, 0]]],
  [2004, 'CLINICA SAO JOSE', [[4000, -2]]],
  [2005, 'HOSPITAL SANTA CLARA', [[12000, -4]]],
  [2006, 'DROGARIA MODELO', [[6000, -7]]],
  [2007, 'CLINICA HORIZONTE', [[9000, -10]]],
  [2008, 'LAR ESPERANCA', [[7000, -20]]],
  [2009, 'HOSPITAL REGIONAL NORTE', [[15000, -30]]],
  [2010, 'DISTRIBUIDORA VITAL', [[20000, -47], [10000, -17]]],
  [2011, 'CLINICA BEM ESTAR', [[10000, -25]]],
  [2012, 'ESTETICA LUMINA', [[2500, -5, 'S'], [1000, -12]]],
  [2013, 'CLINICA RENASCER', [[3000, -15]]],
  [2014, 'ANA BEATRIZ RAMOS', [[800, -9]], { tipo: 'F' }],
  // 2015–2061 (plan, "Clientes a mais")
  [2015, 'HOSPITAL AURORA', [[3200, -5]]],
  [2016, 'CLINICA BOA VISTA', [[8000, 3]]],
  [2017, 'FARMACIA SAO BENTO', [[4500, 1]]],
  [2018, 'LABORATORIO DELTA', [[2000, 0]]],
  [2019, 'CASA ESPERANCA', [[6000, -8]]],
  [2020, 'ESTETICA HARMONIA', [[1500, -5, 'S']]],
  [2021, 'DISTRIBUIDORA OMEGA', [[15000, -12]]],
  [2022, 'HOSPITAL SUL', [[10000, -30]]],
  [2023, 'CLINICA NORTE', [[22000, -47]]],
  [2024, 'REDE VIDA', [[10000, -15]]],
  [2025, 'MERCADO LESTE', [[20000, -8]]],
  [2026, 'HOSPITAL LESTE', [[60000, -22]]],
  [2027, 'REDE GRANDE', [[60000, -25]]],
  [2028, 'FARMACIA OESTE', [[7000, -25]]],
  [2029, 'FARMACIA NORTE', [[7000, -25]]],
  [2030, 'CLINICA ANTIGA', [[8000, -200]]],
  [2031, 'DISTRIBUIDORA FALIDA', [[50000, -300]]],
  [2032, 'CLINICA QUITA', [[5000, -25]]],
  [2033, 'LABORATORIO VITA', [[900, -3]]],
  [2034, 'HOSPITAL PROMESSA', [[5000, -6]]],
  [2035, 'CLINICA MISTA', [[3000, -15], [2000, -20, 'N', true, -14]]],
  [2036, 'ENF A', [[10000, -20, 'E']]],
  [2037, 'ENF B', [[30000, 40, 'E']]],
  [2038, 'ENF C', [[5000, -95, 'E'], [5000, 40, 'E']]],
  [2039, 'PROJ P', [[10000, 20], [7000, -200, 'N', true, -200], [3000, -150, 'N', true, -120]]],
  [2040, 'PROJ Q', [[4000, 20], [500, -3], [9000, -200, 'N', true, -200], [1000, -150, 'N', true, -120]]],
  [2041, 'PROJ R', [[1000, 20]]],
  [2042, 'CLINICA PARCELAS', [[3000, -25]]],
  [2043, 'SECRETARIA MUNICIPAL DE SAUDE DE CATALAO', [[50000, -40]], { ramo: 13, uf: 'GO', municipio: 'CATALAO' }],
  [2044, 'DESTINATARIO A', [[300, -2]]],
  [2045, 'DESTINATARIO B', [[300, -2]]],
  [2046, 'CONV A', [[4000, -20, 'M', true, -2]]],
  [2047, 'CONV B', [[6000, -10, 'M']]],
  [2048, 'SECRETARIA MUNICIPAL DE SAUDE DE ITUMBIARA', [[30000, -40]], { ramo: 13, uf: 'GO', municipio: 'ITUMBIARA' }],
  [2049, 'CLINICA CARTORIO', [[4000, -12]]],
  [2050, 'ESTETICA AURA', [[700, -3, 'S']]],
  [2052, 'CLINICA ANUENCIA', [[3000, -15]]],
  [2053, 'CLINICA CANCELA', [[5000, -12]]],
  [2054, 'HOSPITAL APROVA', [[6500, -8]]],
  [2056, 'CLINICA BAIXADA', [[6000, -200]]],
  [2057, 'CASA SERENA', [[6000, -8]]],
  [2058, 'DISTRIBUIDORA PRAZO', [[15000, -12]]],
  [2059, 'NO PRAZO A', [[1000, -5]]],
  [2060, 'NO PRAZO B', [[1000, -5]]],
  [2061, 'NO PRAZO C', [[1000, -5]]],
];

export function winthor() {
  for (const [codcli, nome, lista, extra = {}] of CLIENTES) {
    cliente({ codcli, nome, ramo: 2, limite: 10000, ...extra });
    titulos(codcli, lista.map(([v, d, bu, pago, pagoEm]) => [v, dia(d), bu, pago, pagoEm === undefined ? undefined : dia(pagoEm)]));
  }
}

const AGENTE = {
  ana: [2015, 2016, 2018, 2019, 2021, 2022, 2024, 2025, 2027, 2030, 2034, 2035, 2049, 2053, 2056, 2057, 2058],
  bruno: [2017, 2023, 2026, 2028, 2029, 2031, 2032, 2033, 2039, 2040, 2041, 2042, 2044, 2045, 2052, 2054],
  carlos: [2020, 2036, 2037, 2038, 2043, 2046, 2047, 2048, 2050],
  nara: [2059, 2060, 2061],
};
export const ATRIBUICAO = Object.entries(AGENTE).flatMap(([agente, cods]) => cods.map((codcli) => ({ codcli, agente })));

/* ── domínio (passo 10) ── */

const AGENTE_DE = (codcli) => (codcli <= 2007 ? 'ana' : codcli <= 2014 ? 'bruno'
  : Object.entries(AGENTE).find(([, cods]) => cods.includes(codcli))[0]);

export async function dominio() {
  const { db } = bancoDoSeed();
  const um = (sql, ...p) => db.prepare(sql).get(...p);
  const idDe = (codcli) => Number(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
  const caso = (codcli, carteira = 'PRIVADA') => um(`SELECT CB.ID, CB.CARD_ID FROM CC_COBRANCA CB JOIN CC_CLIENTE C ON C.ID = CB.CLIENTE_ID
WHERE C.CODCLI = ? AND CB.CARTEIRA = ? AND CB.ENCERRADO_EM IS NULL`, codcli, carteira);
  const faseId = (quadro, chave) => Number(um('SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ? AND CHAVE = ?', quadro, chave).FASE_ID);
  const em = (n, fn) => comRelogio(`${dia(n)}T10:00:00`, fn);

  // Ficha de contatos (RN-017): principal com e-mail, salvo 2004 (sem e-mail), 2044 (dois) e 2045 (só não principal com e-mail).
  for (const [codcli] of CLIENTES) {
    if ([2004, 2045].includes(codcli)) continue;
    const email = codcli === 2006 ? 'financeiro@drogariamodelo.test' : `financeiro${codcli}@cliente.test`;
    await chamarComo(AGENTE_DE(codcli), 'ccBaseContatoSalvar', { clienteId: idDe(codcli), nome: `Financeiro ${codcli}`, area: 'Financeiro',
      email: codcli === 2044 ? 'contato1@destinatarioa.test' : email, situacao: 'CONFIRMADO', principal: 1 });
  }
  await chamarComo('bruno', 'ccBaseContatoSalvar', { clienteId: idDe(2044), nome: 'Pagamentos', email: 'pagamentos@destinatarioa.test', situacao: 'CONFIRMADO', principal: 1 });
  await chamarComo('bruno', 'ccBaseContatoSalvar', { clienteId: idDe(2045), nome: 'Recepção', telefone: '(61) 3333-2045', situacao: 'CONFIRMADO', principal: 1 });
  await chamarComo('bruno', 'ccBaseContatoSalvar', { clienteId: idDe(2045), nome: 'Contas', email: 'contas@destinatariob.test', situacao: 'CONFIRMADO', principal: 0 });

  // Bloqueio de pedidos registrado como aplicado (C-003, C-017, C-020).
  for (const codcli of [2019, 2057]) await chamarComo('ana', 'ccCobBloqueioAplicar', { cobrancaId: caso(codcli).ID, aplicado: 'PEDIDOS' });

  // Negociação desde dia(-11) (C-007, RN-029).
  for (const codcli of [2021, 2058]) {
    await em(-11, () => chamarComo('ana', 'kbCardMover', { cardId: caso(codcli).CARD_ID, faseId: faseId('cobranca-privada', 'negociacao'), ordem: 0 }));
  }

  // Protesto pelo botão (C-017, RN-025).
  for (const codcli of [2013, 2052]) await chamarComo('bruno', 'ccCobAcaoRegistrar', { cobrancaId: caso(codcli).ID, itens: '1,3' });

  // Baixas: 2014 proposta (RN-013, RN-027); 2056 aprovada em dia(-10) (RN-003, RN-004).
  const motivo = 'Valor menor que o custo da cobrança judicial';
  await chamarComo('bruno', 'ccCobBaixaPropor', { cobrancaId: caso(2014).ID, valor: 800, motivo, docRegua: 1 });
  await em(-10, async () => {
    const { baixaId } = await chamarComo('ana', 'ccCobBaixaPropor', { cobrancaId: caso(2056).ID, valor: 6000, motivo: 'Esgotadas as vias de cobrança', docRegua: 1 });
    await chamarComo('julia', 'ccCobBaixaParecer', { baixaId, resultado: 'FAVORAVEL', texto: 'Sem bens localizáveis.' });
    await chamarComo('gustavo', 'ccCobBaixaDecidir', { baixaId, aprovar: 1, texto: 'Aprovada.' });
  });

  // Contatos e promessas (RN-008 em 2008; C-011 em 2035).
  const contato = (login, codcli, n, previsao, valor) => em(n, () => chamarComo(login, 'ccCobContatoRegistrar', {
    clienteId: idDe(codcli), carteira: 'PRIVADA', canal: 'Telefone', retorno: 'Promessa de pagamento', previsao: dia(previsao), valor,
    feedback: `Cliente prometeu pagar em ${dia(previsao)}.`,
  }));
  await contato('bruno', 2008, -8, -6, 7000);
  await contato('ana', 2035, -20, -16, 2000);
  await contato('ana', 2035, -13, -10, 3000);
  await contato('ana', 2035, -10, -9, 3000);

  // Acordos de Bruno aprovados por Sérgio, entrada paga (C-015, RN-003, RN-011, RN-025).
  const acordo = async (codcli, n, valor, entrada, nParcelas, primeiro) => em(n, async () => {
    const { acordoId } = await chamarComo('bruno', 'ccCobAcordoPropor', { cobrancaId: caso(codcli).ID, debito: valor, valor, entrada, entradaData: dia(n),
      nParcelas, primeiroVenc: dia(primeiro), intervaloDias: 30 });
    await chamarComo('sergio', 'ccCobAcordoDecidir', { acordoId, aprovar: 1 });
    const { ID } = um('SELECT ID FROM CC_ACORDO_PARCELA WHERE ACORDO_ID = ? AND N = 0', acordoId);
    await chamarComo('bruno', 'ccCobAcordoParcelaPagar', { parcelaId: ID, pagoEm: dia(n) });
  });
  await acordo(2011, -3, 10000, 2000, 4, 5);
  await acordo(2028, -36, 7000, 1400, 4, -6);
  await acordo(2029, -35, 7000, 1400, 4, -5);
  await acordo(2032, -3, 5000, 1000, 2, 5);
  await acordo(2042, -3, 3000, 600, 2, 5);

  // Caso público de 2043 aberto pela rotina da 005 (C-028, C-029).
  await chamarComo(null, 'ccCobCasoSincronizar', { clienteId: idDe(2043), carteira: 'PUBLICA', faseChave: 'liquidacao_vencida', capaJson: '{}',
    nota: 'Etapa do órgão: Liquidação vencida' });
}
