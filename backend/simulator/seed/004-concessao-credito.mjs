// Seed da 004-concessao-credito (plan, seção Simulador): Winthor de 4001–4099, atribuição dos baldes e, no
// domínio, o estado da 004. Histórico (créditos, decisões, pedidos decididos, fotos, revisão) entra direto
// nas tabelas da 004; o que está aberto nasce pelas SFs. A conciliação da rotina do passo 11 cria os cards
// que faltam e leva cada um à fase devida. Nada grava em tabela de outra dona.

import { cliente, nota, dia, chamarComo, bancoDoSeed, M, U } from './000-elenco.mjs';
import { comRelogio } from '../relogio.mjs';
import { somarMeses } from '../../lib/tempo.mjs';

const PROD = { P: 101, S: 401 };

/**
 * Compras de `valor` (produto `prod`) emitidas em `datas` (dias relativos), vencendo 30 dias depois e pagas no
 * vencimento quando já venceram; `aberto` = [valor, vencimento] de um título a mais em aberto (atraso ou uso).
 */
function compras(codcli, { valor = 20000, prod = 'P', datas = [-120, -90, -60, -25], aberto = null, pagar = true, tarde = null } = {}) {
  datas.forEach((d, i) => {
    const venc = d + 30;
    const pago = pagar && venc <= 0;
    nota({ codcli, n: i + 1, emissao: dia(d), itens: [{ codprod: PROD[prod], valor }],
      parcelas: [{ prest: 1, valor, venc: dia(venc), ...(pago ? { pago: true, pagoEm: dia(venc) } : {}) }] });
  });
  if (tarde) {
    const [valor3, venc, pagoEm] = tarde;
    nota({ codcli, n: 51, emissao: dia(venc - 30), itens: [{ codprod: PROD[prod], valor: valor3 }],
      parcelas: [{ prest: 1, valor: valor3, venc: dia(venc), pago: true, pagoEm: dia(pagoEm) }] });
  }
  if (aberto) {
    const [valor2, venc] = aberto;
    nota({ codcli, n: 50, emissao: dia(venc - 30), itens: [{ codprod: PROD[prod], valor: valor2 }], parcelas: [{ prest: 1, valor: valor2, venc: dia(venc) }] });
  }
}

// [codcli, nome, cliente(), compras()]
const CLIENTES = [
  [4001, 'CLINICA ALFA LTDA', {}, {}],
  [4002, 'HOSPITAL BETA SA', { limite: 300000 }, { valor: 60000 }],
  [4003, 'REDE GAMA SAUDE', { limite: 1500000 }, { valor: 200000 }],
  [4004, 'GRUPO DELTA HOSPITALAR', { limite: 3000000 }, { valor: 300000 }],
  [4005, 'CLINICA EPSILON', { limite: 100000 }, { datas: [-80, -50, -20] }],
  [4006, 'FARMACIA ZETA', { limite: 100000 }, { datas: [-160, -130, -100] }],
  [4007, 'HOSPITAL ETA', { limite: 100000 }, { datas: [-120, -90], aberto: [95000, 10] }],
  [4008, 'MARIA APARECIDA SOUZA', { tipo: 'F', limite: 8000 }, { valor: 2000 }],
  [4009, 'ESTETICA PRIME', { limite: 60000 }, { prod: 'S', valor: 15000 }],
  [4010, 'CLINICA THETA', { limite: 50000 }, { datas: [-120, -90], aberto: [45000, -20] }],
  [4011, 'CLINICA IOTA', { limite: 30000 }, {}],
  [4012, 'FARMACIA KAPPA', { limite: 0 }, { datas: [-400, -370] }],
  [4013, 'CLINICA LAMBDA', { limite: 50000 }, { datas: [-120, -90], aberto: [10000, -12] }],
  [4014, 'CLINICA MI', { limite: 30000 }, {}],
  [4015, 'CLINICA NI', { limite: 100000 }, { datas: [-120, -90, -60], valor: 19000, tarde: [3000, -70, -60] }], // pontualidade 95%
  [4016, 'CLINICA XI', {}, { datas: [-25] }],
  [4017, 'HOSPITAL PI', { limite: 100000 }, { datas: [-120, -90], aberto: [90000, 10] }],
  [4018, 'CLINICA K2', { limite: 50000 }, { datas: [-60] }],
  [4019, 'CLINICA K4', { limite: 50000 }, { datas: [-73, -43, -13] }],
  // Carlos, Privada: 5 créditos de 100.000 (C-030, RF-024, RF-032, C-041)
  [4020, 'HOSPITAL SAUDAVEL', { limite: 100000 }, { pagar: false, datas: [-25] }],
  [4021, 'CLINICA ATRASO DOZE', { limite: 100000 }, { pagar: false, datas: [-25], aberto: [5000, -12] }],
  [4022, 'HOSPITAL USO ALTO', { limite: 100000 }, { pagar: false, datas: [-25], aberto: [75000, 20] }],
  [4023, 'CLINICA RISCO', { limite: 100000 }, { pagar: false, datas: [-25], aberto: [5000, -31] }],
  [4024, 'HOSPITAL RENOVA', { limite: 100000 }, { datas: [-60, -25] }],
  // Carlos, Privada: desempenho (C-031)
  ...[4025, 4026, 4027, 4028, 4029, 4066].map((c) => [c, `CLINICA DESEMPENHO ${c}`, {}, {}]),
  // Ana, Privada: sinalizados (C-032) e fora do SLA (C-025)
  [4030, 'CLINICA TRES SINAIS', { limite: 100000 }, { datas: [-120, -90, -60], valor: 10000, aberto: [92000, -5] }],
  [4031, 'HOSPITAL ATRASO', { limite: 100000 }, { datas: [-120, -90], aberto: [10000, -35] }],
  [4032, 'CLINICA ALERTA', { limite: 100000 }, {}],
  [4033, 'CLINICA SEM SINAL', { limite: 100000 }, {}],
  [4034, 'CLINICA ESPERA', { limite: 20000 }, { datas: [-60], aberto: [5000, 10] }],
  // Carlos, Estética: revisão (C-040)
  [4035, 'ESTETICA ATRASO', { limite: 50000 }, { prod: 'S', datas: [-60, -25], valor: 5000, aberto: [5000, -15] }],
  [4036, 'ESTETICA USO', { limite: 50000 }, { prod: 'S', datas: [-60], valor: 5000, aberto: [45000, 20] }],
  [4037, 'ESTETICA NEGATIVADA', { limite: 50000 }, { prod: 'S', datas: [-60, -25], valor: 5000 }],
  [4038, 'ESTETICA VALIDADE', { limite: 50000 }, { prod: 'S', datas: [-60, -25], valor: 5000 }],
  [4039, 'ESTETICA TRANQUILA', { limite: 50000 }, { prod: 'S', datas: [-60, -25], valor: 5000 }],
  // Pública: Carlos (RF-039) e Ana (C-034 …)
  ...[4040, 4041, 4042, 4043, 4044, 4045, 4046, 4047].map((c) => [c, `SECRETARIA MUNICIPAL DE SAUDE ${c}`, { ramo: 13, uf: 'GO', municipio: `MUNICIPIO ${c}` }, {}]),
  [4048, 'SECRETARIA MUNICIPAL DE SAUDE DE CATALAO', { ramo: 13, uf: 'GO', municipio: 'CATALAO' }, {}],
  [4049, 'SECRETARIA MUNICIPAL DE SAUDE DE IPAMERI', { ramo: 13, uf: 'GO', municipio: 'IPAMERI' }, {}],
  // Fotos de 2026-10 (C-028)
  ...[4060, 4061, 4062].map((c) => [c, `HOSPITAL FOTO ${c}`, {}, {}]),
  // Estética de Rita e Ana (C-033)
  [4064, 'ESTETICA AURORA', {}, { prod: 'S', valor: 10000 }],
  [4065, 'ESTETICA BRISA', {}, { prod: 'S', valor: 10000 }],
  // Genéricos dos testes de fluxo (4097–4099: órgãos)
  ...Array.from({ length: 27 }, (_, i) => [4070 + i, `CLINICA GENERICA ${4070 + i}`, { limite: 0 }, {}]),
  ...[4097, 4098, 4099].map((c) => [c, `SECRETARIA MUNICIPAL DE SAUDE GENERICA ${c}`, { ramo: 13, uf: 'GO', municipio: `GENERICA ${c}` }, {}]),
];

export function winthor() {
  for (const [codcli, nome, extra, cfg] of CLIENTES) {
    cliente({ codcli, nome, ramo: 2, ...extra });
    if (cfg) compras(codcli, cfg);
  }
}

const faixa = (de, ate) => Array.from({ length: ate - de + 1 }, (_, i) => de + i);
const BALDES = [
  ['bruno', 'rita', [...faixa(4011, 4019), ...faixa(4070, 4099), 4064]],
  ['carlos', 'carlos', [...faixa(4020, 4029), 4066, ...faixa(4035, 4047), 4060, 4061, 4062]],
  ['ana', 'ana', [...faixa(4030, 4034), 4048, 4049, 4065]],
];
export const ATRIBUICAO = BALDES.flatMap(([agente, analista, cods]) => cods.map((codcli) => ({ codcli, agente, analista })));

/* ── domínio (passo 10) ── */

const PLANO = { PLANO_COD: '30', PLANO_DESCR: '30 DIAS', FORMA: 'Boleto bancário' };

export async function dominio() {
  const { db } = bancoDoSeed();
  const um = (sql, ...p) => db.prepare(sql).get(...p);
  const idDe = (codcli) => Number(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
  const em = (n, fn) => comRelogio(`${dia(n)}T10:00:00`, fn);
  const inserir = (tabela, linha) => {
    const cols = Object.keys(linha);
    return Number(db.prepare(`INSERT INTO ${tabela} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .run(...cols.map((c) => (typeof linha[c] === 'boolean' ? Number(linha[c]) : linha[c]))).lastInsertRowid);
  };
  const DADOS = { CONS_RECEITA: 'ATIVA', CONS_PROTESTO: 'SEM', CONS_PROCESSO: 'SEM', CONS_SOCIOS: 'SEM', FP_TIPO: 'RECURSOS_PROPRIOS' };

  /** Solicitação decidida (e o crédito dela, se aprovada) gravada como histórico. */
  const historico = ({ codcli, carteira = 'PRIVADA', analista, decisor = 'gustavo', limite = 100000, criada, decidida, inicio, meses = 3,
    resultado = 'APROVADA', situacao = 'GESTAO', serasa = 850, rating = 'AA', motorLimite = limite, extra = {} }) => {
    const clienteId = idDe(codcli);
    const solId = inserir('CC_SOLICITACAO', {
      CLIENTE_ID: clienteId, CARTEIRA: carteira, TIPO_CLIENTE: 'RECORRENTE', VALOR: limite, PRAZO_MESES: meses, JUSTIFICATIVA: 'Histórico',
      ANALISTA_ID: M[analista], CRIADO_EM: `${dia(criada)}T09:00:00`, CRIADO_POR: M[analista], PRAZO_DECISAO: dia(criada + 9),
      DECIDIDA_EM: `${dia(decidida)}T15:00:00`, DECISAO_RESULTADO: resultado, CONS_DATA: dia(decidida - 1),
      ...(carteira === 'PUBLICA' ? {} : { ...DADOS, SCORE_SERASA: serasa, RATING_MOTOR: rating, MOTOR_LIMITE: motorLimite, MOTOR_RESULTADO: 'APROVAR',
        MOTOR_EM: `${dia(decidida - 1)}T10:00:00` }),
      LIMITE_PROPOSTO: limite, PARECER_ANALISTA: 'Histórico.', PROPOSTA_POR: String(M[analista]),
      ...(resultado === 'RECUSADA' ? { ENCERRADA_EM: `${dia(decidida)}T15:00:00`, MOTIVO_RECUSA: 'Capacidade de pagamento insuficiente' } : {}),
      ...extra,
    });
    const decisaoId = inserir('CC_DECISAO', {
      ENTIDADE: 'SOLICITACAO', ENTIDADE_ID: solId, CLIENTE_ID: clienteId, RESULTADO: resultado, RESPONSAVEL_ID: M[decisor], CARGO_ALCADA: 'Gerente',
      ALCADA_EXIGIDA: 'Gerente', NIVEL_EXIGIDO: 3, VALOR_ALCADA: limite, LIMITE_APROVADO: resultado === 'APROVADA' ? limite : 0, LIMITE_MOTOR: motorLimite,
      RATING: carteira === 'PUBLICA' ? '' : rating, ...PLANO, PARECER: 'Histórico.', EM: `${dia(decidida)}T15:00:00`,
    });
    db.prepare('UPDATE CC_SOLICITACAO SET DECISAO_ID = ? WHERE ID = ?').run(decisaoId, solId);
    if (resultado !== 'APROVADA' || inicio === undefined) return { solId, decisaoId };
    const fim = somarMeses(dia(inicio), meses);
    const creditoId = inserir('CC_CREDITO', {
      CLIENTE_ID: clienteId, SOLICITACAO_ID: solId, DECISAO_ID: decisaoId, CARTEIRA: carteira, ANALISTA_ID: M[analista], LIMITE: limite, ...PLANO,
      RATING_CONCESSAO: carteira === 'PUBLICA' ? '' : rating, TIPO_CLIENTE: 'RECORRENTE', INICIO_VALIDADE: dia(inicio), FIM_VALIDADE: fim,
      SITUACAO: situacao, SITUACAO_EM: `${dia(inicio)}T10:00:00`, MOTIVO_ENCAMINHAMENTO: situacao === 'OBSOLETO' ? 'Cadastro obsoleto: sem compras' : '',
      VIGENTE_CHAVE: ['GESTAO', 'REANALISE'].includes(situacao) ? clienteId : null,
    });
    return { solId, decisaoId, creditoId };
  };

  // 06 §2.5 e baldes de Rita (Privada)
  historico({ codcli: 4005, analista: 'rita', limite: 40000, criada: -100, decidida: -95, inicio: -93 }); // vence ontem, 3 compras → reanálise
  historico({ codcli: 4006, analista: 'rita', criada: -60, decidida: -55, inicio: -50, meses: 6 }); // 100 dias sem compra → obsoleto
  historico({ codcli: 4007, analista: 'rita', criada: -40, decidida: -35, inicio: -30 });
  historico({ codcli: 4010, analista: 'rita', limite: 50000, criada: -40, decidida: -35, inicio: -30 });
  historico({ codcli: 4011, analista: 'rita', limite: 30000, criada: -30, decidida: -25, inicio: -20 });
  historico({ codcli: 4012, analista: 'rita', limite: 20000, criada: -400, decidida: -395, inicio: -390, situacao: 'OBSOLETO' });
  historico({ codcli: 4013, analista: 'rita', limite: 50000, criada: -40, decidida: -35, inicio: -30 });
  historico({ codcli: 4014, analista: 'rita', limite: 29000, criada: -30, decidida: -25, inicio: -20 });
  historico({ codcli: 4015, analista: 'rita', limite: 100000, criada: -30, decidida: -25, inicio: -20, serasa: 750 });
  historico({ codcli: 4017, analista: 'rita', limite: 100000, criada: -40, decidida: -35, inicio: -30 });
  historico({ codcli: 4018, analista: 'rita', limite: 50000, criada: -100, decidida: -95, inicio: -93 }); // vencido, 1 compra → obsoleto
  historico({ codcli: 4019, analista: 'rita', limite: 50000, criada: -40, decidida: -35, inicio: -30 });

  // Carlos, Privada: 5 créditos de 100.000 decididos há mais de 90 dias e renovados (4024 vencido → reanálise)
  const RATING_CARLOS = { 4020: 'AA', 4021: 'B', 4022: 'AA', 4023: 'D', 4024: 'AA' };
  for (const codcli of [4020, 4021, 4022, 4023, 4024]) {
    historico({ codcli, analista: 'carlos', criada: -130, decidida: -125, inicio: codcli === 4024 ? -93 : -60, serasa: 850, rating: RATING_CARLOS[codcli],
      motorLimite: codcli === 4023 ? 50000 : 100000 });
  }
  // C-031: decididas em 5/7/9/14/25 dias (4 aprovadas, 1 recusada) e uma aberta há 12 dias
  [[4025, 5, 'APROVADA'], [4026, 7, 'APROVADA'], [4027, 9, 'APROVADA'], [4028, 14, 'RECUSADA'], [4029, 25, 'APROVADA']].forEach(([codcli, dias, resultado]) => {
    historico({ codcli, analista: 'carlos', limite: 30000, criada: -30 - dias, decidida: -30, resultado });
  });
  // Pedidos decididos sobre 4020–4023 (C-041): 3 liberados (2 dentro da regra), 1 recusado
  [[4020, 'LIBERADO', true], [4021, 'LIBERADO', true], [4022, 'LIBERADO', false], [4023, 'RECUSADO', false]].forEach(([codcli, resultado, dentro], i) => {
    const pedidoId = inserir('CC_PEDIDO_RETIDO', {
      CLIENTE_ID: idDe(codcli), NUMERO_PEDIDO: `P-${codcli}`, VALOR: 20000, LIMITE_NA_DATA: 100000, UTILIZADO_NA_DATA: 90000, EXCESSO: 10000, EXCESSO_PCT: 10,
      ALCADA_EXIGIDA: 'Supervisor', NIVEL_EXIGIDO: 2, ANALISTA_ID: M.carlos, CRIADO_EM: `${dia(-20 + i)}T09:00:00`, CRIADO_POR: M.carlos,
      DECIDIDO_EM: `${dia(-20 + i)}T15:00:00`, DECISAO_RESULTADO: resultado, FLEXIBILIZADO: resultado === 'LIBERADO', DENTRO_REGRA: dentro,
      MOTIVO_RECUSA: resultado === 'RECUSADO' ? 'Atraso relevante' : '', RECOMENDACAO: 'Histórico.', RECOMENDADO_POR: String(M.carlos),
    });
    inserir('CC_DECISAO', { ENTIDADE: 'PEDIDO', ENTIDADE_ID: pedidoId, CLIENTE_ID: idDe(codcli), RESULTADO: resultado, RESPONSAVEL_ID: M.sergio,
      CARGO_ALCADA: 'Supervisor', ALCADA_EXIGIDA: 'Supervisor', NIVEL_EXIGIDO: 2, VALOR_ALCADA: 10000, LIMITE_MOTOR: 100000, ...PLANO,
      CONDICAO: resultado === 'LIBERADO' ? 'Entrada de 10%' : '', PARECER: 'Histórico.', EM: `${dia(-20 + i)}T15:00:00` });
  });
  // Fotos de 2026-10 (C-028): AA, A e B
  [[4060, 'AA', 1000000, 5000], [4061, 'A', 2000000, 100000], [4062, 'B', 1000000, 30000]].forEach(([codcli, faixa, limite, vencido]) => {
    inserir('CC_CALIBRACAO', { MES: '2026-10', CLIENTE_ID: idDe(codcli), CARTEIRA: 'PRIVADA', FAIXA: faixa, DIAS_ATRASO: 10, VENCIDO: vencido,
      A_VENCER: limite - vencido, LIMITE: limite, UTILIZADO: limite, EM: '2026-11-01T03:00:00' });
  });
  // Revisão do semáforo de 10/08/2026 (C-029)
  inserir('CC_CALIBRACAO_REVISAO', { REVISADO_EM: '2026-08-10', PARECER: 'Faixas conferidas.', POR_ID: M.gustavo, EM: '2026-08-10T10:00:00' });

  // Ana, Privada: sinalizados (C-032)
  historico({ codcli: 4030, analista: 'ana', criada: -40, decidida: -35, inicio: -30, serasa: 550, rating: 'B' });
  historico({ codcli: 4031, analista: 'ana', criada: -40, decidida: -35, inicio: -30 });
  historico({ codcli: 4032, analista: 'ana', criada: -40, decidida: -35, inicio: -30, serasa: 580, rating: 'B' });
  historico({ codcli: 4033, analista: 'ana', criada: -40, decidida: -35, inicio: -30 });

  // Carlos, Estética (C-040): atraso, uso, negativação, validade em 10 dias e um sem gatilho
  for (const codcli of [4035, 4036, 4037, 4038, 4039]) {
    historico({ codcli, carteira: 'ESTETICA', analista: 'carlos', limite: 50000, criada: -100, decidida: -95, inicio: codcli === 4038 ? -82 : -40,
      extra: codcli === 4037 ? { FLAG_NEGATIVACAO: 1 } : {} });
  }

  // Carlos, Pública (RF-039): 3 aprovadas com crédito, 1 recusada
  for (const codcli of [4040, 4041, 4042]) historico({ codcli, carteira: 'PUBLICA', analista: 'carlos', limite: 200000, criada: -60, decidida: -50, inicio: -45 });
  historico({ codcli: 4043, carteira: 'PUBLICA', analista: 'carlos', limite: 200000, criada: -60, decidida: -50, resultado: 'RECUSADA' });

  // Grupo econômico de 4003 e 4004 (06 §2.5)
  for (const codcli of [4003, 4004]) await chamarComo('gustavo', 'ccBaseClienteClassificar', { clienteId: idDe(codcli), grupoEconomico: 'GRUPO GAMA DELTA' });

  // Solicitações abertas, pelas SFs (o card nasce em `entrada`)
  const abrir = (login, codcli, carteira, valor, n = 0, tipoCliente = 'NOVO') => em(n, () => chamarComo(login, 'ccCredSolicitacaoCriar', {
    clienteId: idDe(codcli), carteira, tipoCliente, valor, prazoMeses: 3, justificativa: 'Abertura de crédito para compras recorrentes.', rca: 'CARLOS LIMA',
    analistaId: M[login] }));
  await abrir('rita', 4001, 'PRIVADA', 40000);
  await abrir('rita', 4002, 'PRIVADA', 300000);
  await abrir('rita', 4003, 'PRIVADA', 1500000);
  await abrir('rita', 4004, 'PRIVADA', 3000000);
  await abrir('rita', 4008, 'PRIVADA', 8000);
  await abrir('rita', 4009, 'ESTETICA', 60000);
  await abrir('rita', 4064, 'ESTETICA', 20000);
  await abrir('ana', 4065, 'ESTETICA', 20000);
  const s4034 = await abrir('ana', 4034, 'PRIVADA', 20000, -4);
  // Carlos, Pública: 3 abertas (uma atrasada em `analise`)
  for (const [codcli, n] of [[4044, 0], [4045, 0], [4046, -12]]) await abrir('carlos', codcli, 'PUBLICA', 150000, n);
  const s4066 = await abrir('carlos', 4066, 'PRIVADA', 30000, -12);

  // Cards levados à fase (sem sessão, como a rotina): 4034 em `cadastral` há 4 dias; 4046 em `analise` há 11 dias; 4066 em `cadastral`
  const faseId = (quadro, chave) => Number(um('SELECT FASE_ID FROM CC_FASE WHERE QUADRO = ? AND CHAVE = ?', quadro, chave).FASE_ID);
  const mover = (cardId, quadro, chave, n) => em(n, () => chamarComo(null, 'kbCardMover', { cardId, faseId: faseId(quadro, chave), ordem: 0, movidoPor: U.gustavo, origem: 'sistema' }));
  await mover(s4034.cardId, 'concessao-privada', 'cadastral', -4);
  await mover(s4066.cardId, 'concessao-privada', 'cadastral', -11);
  const s4046 = um('SELECT CARD_ID FROM CC_SOLICITACAO S JOIN CC_CLIENTE C ON C.ID = S.CLIENTE_ID WHERE C.CODCLI = 4046');
  await mover(Number(s4046.CARD_ID), 'concessao-publica', 'analise', -11);

  // Pedidos abertos: 4007 (20.000 → Gerente), 4010 (atraso → Comitê), 4034 há 3 horas em `retido`
  await chamarComo('rita', 'ccCredPedidoCriar', { clienteId: idDe(4007), numeroPedido: '700701', valor: 20000, rca: 'CARLOS LIMA', justificativa: 'Pedido grande.' });
  await chamarComo('rita', 'ccCredPedidoCriar', { clienteId: idDe(4010), numeroPedido: '701001', valor: 10000, rca: 'CARLOS LIMA', justificativa: 'Pedido do mês.' });
  await comRelogio(`${dia(0)}T07:00:00`, () => chamarComo('ana', 'ccCredPedidoCriar', { clienteId: idDe(4034), numeroPedido: '703401', valor: 20000,
    rca: 'CARLOS LIMA', justificativa: 'Pedido do mês.' }));
}
