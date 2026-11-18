// Seed da 005-setor-publico (plan, seção Simulador): Winthor de 5001–5006 e, no domínio, o estado da 005.
// Datas pela tabela da spec (hoje = 2026-12-01) convertidas em dia(n) do RELOGIO do banco (DT-38). As tabelas
// da 005 (regras, certidões, marcos das NFs, passos feitos) entram direto; o resto pelas SFs de 001, 004 e 005.
// A decisão das solicitações do 5001 e do 5004 é da 004: se ela recusar (ramo público ainda não pronto), o seed
// segue sem a decisão e avisa; os testes que dependem da contratação pulam com 'depende de 004'.

import { cliente, nota, dia, chamarComo, bancoDoSeed, M, U } from './000-elenco.mjs';
import { comRelogio } from '../relogio.mjs';
import { REGRAS_INICIAIS } from '../../lib/setor-publico/nf.mjs';

const REFERENCIA = '2026-12-01';
/** dia(n) da data da spec (as datas da spec contam a partir de 2026-12-01). */
const d = (iso) => dia(Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${REFERENCIA}T00:00:00Z`)) / 86400000));

export const CNPJ_FILIAL_1 = '11.222.333/0001-81';

const ORGAOS = [
  [5001, 'SECRETARIA DE ESTADO DE SAUDE DO DF', 12, 'DF', 'BRASILIA'],
  [5002, 'FUNDO MUNICIPAL DE SAUDE DE GOIANIA', 13, 'GO', 'GOIANIA'],
  [5003, 'HOSPITAL UNIVERSITARIO FEDERAL', 11, 'GO', 'GOIANIA'],
  [5004, 'FUNDO MUNICIPAL DE SAUDE DE TRINDADE', 13, 'GO', 'TRINDADE'],
  [5005, 'AUTARQUIA DE SAUDE DE FORMOSA', 20, 'GO', 'FORMOSA'],
];

// [numnota, codcli, n, valor, emissão, protocolo, atesto, liquidação, OP, empenho, pago em]
export const NFS = [
  [1004, 5001, 1, 25000, '2026-10-30', '2026-10-30', '2026-11-06', '2026-11-12', '2026-11-26', '2026NE000431', null],
  [1005, 5001, 2, 15000, '2026-11-24', '2026-11-24', null, null, null, '2026NE000512', null],
  [1008, 5001, 3, 12000, '2026-11-27', null, null, null, null, '2026NE000533', null],
  [1001, 5002, 1, 80000, '2026-10-01', '2026-10-01', null, null, null, '2026NE000812', null],
  [1002, 5003, 1, 40000, '2026-09-28', '2026-09-29', '2026-10-15', '2026-10-20', null, '2026NE000201', null],
  [1009, 5003, 2, 20000, '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-10', '2026-07-15', '2026NE000077', null],
  [1003, 5004, 1, 30000, '2026-11-03', '2026-11-03', null, null, null, '', null],
  [1006, 5004, 2, 18000, '2026-09-01', '2026-09-01', '2026-09-04', '2026-09-08', '2026-09-14', '2026NE000150', '2026-09-15'],
  [1007, 5004, 3, 22000, '2026-07-03', '2026-07-03', '2026-07-06', '2026-07-08', '2026-08-05', '2026NE000098', '2026-08-10'],
];

export function winthor() {
  for (const [codcli, nome, ramo, uf, municipio] of ORGAOS) cliente({ codcli, nome, ramo, uf, municipio });
  cliente({ codcli: 5006, nome: 'CLINICA PARTICULAR TESTE LTDA', ramo: 2, uf: 'GO', municipio: 'GOIANIA' });
  for (const [numnota, codcli, n, valor, emissao, , , , , , pagoEm] of NFS) {
    nota({ codcli, n, numnota, emissao: d(emissao), itens: [{ codprod: 101, valor }],
      parcelas: [{ prest: 1, valor, venc: dia(Math.round((Date.parse(emissao) - Date.parse(REFERENCIA)) / 86400000) + 30),
        ...(pagoEm ? { pago: true, pagoEm: d(pagoEm) } : {}) }] });
  }
  nota({ codcli: 5004, n: 4, numnota: 1010, emissao: d('2026-10-05'), cancelEm: d('2026-10-06'), itens: [{ codprod: 101, valor: 5000 }],
    parcelas: [{ prest: 1, valor: 5000, venc: d('2026-11-04') }] });
  // 5005 só entra no cadastro com movimento na janela: uma NF de antes da data de corte da 005 (fora de CC_NF_PUBLICA).
  nota({ codcli: 5005, n: 1, numnota: 1011, emissao: d('2025-11-10'), itens: [{ codprod: 101, valor: 8000 }],
    parcelas: [{ prest: 1, valor: 8000, venc: d('2025-12-10'), pago: true, pagoEm: d('2025-12-10') }] });
  nota({ codcli: 5006, n: 1, numnota: 1099, emissao: d('2026-11-02'), itens: [{ codprod: 101, valor: 9000 }], parcelas: [{ prest: 1, valor: 9000, venc: d('2026-12-02') }] });
}

/* ── domínio (passo 10) ── */

/** Análise do C-008 (FMS Goiânia) — também a base do 5004 e do 5002 no smoke. */
export const ANALISE_C008 = {
  esfera: 'MUNICIPAL', capag: 'B', pessoalPct: 50, cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', empenhoPrevio: 'SIM', contratoVigente: 'SIM',
  base: 'CONTRATO',
};

export async function dominio() {
  const banco = bancoDoSeed();
  const { db, runner } = banco;
  const um = (sql, ...p) => db.prepare(sql).get(...p);
  const idDe = (codcli) => Number(um('SELECT ID FROM CC_CLIENTE WHERE CODCLI = ?', codcli).ID);
  const nfId = (numnota) => Number(um('SELECT ID FROM CC_NF_PUBLICA WHERE NUMNOTA = ?', numnota)?.ID || 0);
  const em = (iso, fn) => comRelogio(`${d(iso)}T10:00:00`, fn);
  const existe = (nome) => runner.existe(nome);

  // Regras iniciais: só com a tabela vazia (a mesma porta do isEntrypoint, O-6).
  if (!Number(um('SELECT COUNT(*) AS N FROM CC_REGRA_PAGAMENTO_ENTE').N)) {
    const ins = db.prepare(`INSERT INTO CC_REGRA_PAGAMENTO_ENTE (NOME, ESFERA, UF, LIQ_DIAS, PAG_DIAS, CONTAGEM, BASE_LEGAL, LINK, SITUACAO, ATIVO)
VALUES (?, ?, ?, ?, ?, ?, ?, '', 'A_CONFIRMAR', 1)`);
    for (const r of REGRAS_INICIAIS) ins.run(r.NOME, r.ESFERA, r.UF, r.LIQ_DIAS, r.PAG_DIAS, r.CONTAGEM, r.BASE_LEGAL);
  }

  // Certidões da filial 1.
  const cert = db.prepare(`INSERT INTO CC_CERTIDAO (TIPO, CNPJ, ABRANGENCIA, NUMERO, EMISSAO, VALIDADE, REGISTRADO_EM, REGISTRADO_POR)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const [tipo, abrangencia, validade] of [['CND_FEDERAL', '', '2026-12-10'], ['CRF_FGTS', '', '2026-11-28'], ['CNDT', '', '2026-12-20'],
    ['CND_ESTADUAL', 'GO', '2026-12-16']]) {
    cert.run(tipo, CNPJ_FILIAL_1, abrangencia, `${tipo}-2026`, d('2026-06-01'), d(validade), `${d('2026-06-01')}T10:00:00`, M.gustavo);
  }

  // Marcos das NFs (o recálculo é da rotina do passo 11).
  const marco = db.prepare(`UPDATE CC_NF_PUBLICA SET EMPENHO = ?, PROTOCOLO = ?, ATESTO = ?, LIQUIDACAO = ?, OP = ?, CALCULADO_EM = NULL,
  ATUALIZADO_EM = ?, ATUALIZADO_POR = ? WHERE NUMNOTA = ?`);
  for (const [numnota, , , , , protocolo, atesto, liquidacao, op, empenho] of NFS) {
    const x = (v) => (v ? d(v) : null);
    marco.run(empenho, x(protocolo), x(atesto), x(liquidacao), x(op), `${dia(0)}T09:00:00`, M.carlos, numnota);
  }
  const n1001 = nfId(1001);
  if (n1001) {
    const acao = db.prepare(`INSERT INTO CC_NF_ACAO (NF_ID, CLIENTE_ID, PASSO, PRAZO, FEITO_EM, FEITO_POR, NO_PRAZO, PROTOCOLO_ORGAO, OBS)
VALUES (?, ?, ?, ?, ?, ?, 1, '', ?)`);
    acao.run(n1001, idDe(5002), 'L1', d('2026-10-19'), `${d('2026-10-19')}T10:00:00`, M.carlos, 'E-mail ao fiscal do contrato.');
    acao.run(n1001, idDe(5002), 'L2', d('2026-10-23'), `${d('2026-10-23')}T10:00:00`, M.carlos, 'Ligação ao setor financeiro.');
  }

  // Esfera pelo ramo e um contato com e-mail por órgão (SFs da 001).
  if (existe('ccBaseParametroSalvar')) {
    await chamarComo('gustavo', 'ccBaseParametroSalvar', { itens: JSON.stringify([{ chave: 'base.ramosEsfera', valor: '11=FEDERAL,12=ESTADUAL,13=MUNICIPAL' }]) });
  }
  if (existe('ccBaseContatoSalvar')) {
    for (const [codcli] of ORGAOS) {
      await chamarComo('carlos', 'ccBaseContatoSalvar', { clienteId: idDe(codcli), nome: `Ordenador ${codcli}`, area: 'Financeiro', funcao: 'Ordenador de despesa',
        email: `ordenador${codcli}@orgao.test`, situacao: 'CONFIRMADO', principal: 1 });
    }
  }

  // Solicitações pelas SFs da 004 e análise pela 005 (pula sem as SFs).
  if (!['ccCredSolicitacaoCriar', 'kbCardMover', 'kbCardAtualizar', 'ccPubAnaliseSalvar'].every(existe)) return;
  const faseId = (chave) => Number(um("SELECT FASE_ID FROM CC_FASE WHERE QUADRO = 'concessao-publica' AND CHAVE = ?", chave).FASE_ID);
  const levar = (cardId, chave) => chamarComo(null, 'kbCardMover', { cardId, faseId: faseId(chave), ordem: 0, movidoPor: U.carlos, origem: 'sistema' });
  const abrir = (codcli, valor) => chamarComo('carlos', 'ccCredSolicitacaoCriar', { clienteId: idDe(codcli), carteira: 'PUBLICA', tipoCliente: 'NOVO', valor,
    prazoMeses: 12, justificativa: 'Fornecimento ao órgão por contrato.', rca: 'CARLOS LIMA', analistaId: M.carlos });
  const marcarItens = async (cardId) => {
    const k = um('SELECT VALORES_JSON, PRAZO FROM KB_CARD WHERE ID = ?', cardId);
    await chamarComo('carlos', 'kbCardAtualizar', { cardId, valoresJson: JSON.stringify({ ...JSON.parse(k.VALORES_JSON || '{}'), analise_1: '1', analise_2: '1' }),
      responsaveisIds: String(U.carlos), prazo: k.PRAZO || '' });
  };

  const contratadas = [
    [5001, 600000, 100000, { esfera: 'ESTADUAL', capag: 'A', pessoalPct: 40, cauc: 'REGULAR', fonteTipo: 'SUS', perfilPag: 'PONTUAL', empenhoPrevio: 'SIM',
      contratoVigente: 'SIM', base: 'CONTRATO', contrato: '052/2026', valorEstimado: 600000, saldoContrato: 100000, vigenciaFim: '2027-06-30', prazoContratoDias: 30 }],
    [5004, 50000, 40000, { ...ANALISE_C008, perfilPag: 'EVENTUAIS', contrato: '018/2026', valorEstimado: 50000, saldoContrato: 50000, vigenciaFim: '2027-01-15' }],
  ];
  await em('2026-10-20', async () => {
    for (const [codcli, valor, limite, analise] of contratadas) {
      const s = await abrir(codcli, valor);
      await levar(s.cardId, 'analise');
      await chamarComo('carlos', 'ccPubAnaliseSalvar', { solicitacaoId: s.id, ...analise, vigenciaFim: d(analise.vigenciaFim) });
      await marcarItens(s.cardId);
      await levar(s.cardId, 'comite');
      const r = await runner.executar('ccCredDecisaoRegistrar', { solicitacaoId: s.id, resultado: 'APROVADA', limiteAprovado: limite, planoCod: '30',
        forma: 'Boleto bancário', parecer: 'Contrato vigente com saldo; órgão pontual.' }, { userId: U.silvia });
      if (r && r.ok === false) banco.avisos.push(`005: decisão pública do ${codcli} recusada pela 004 (${r.error}); contratação ausente`);
    }
  });
  const s5002 = await em('2026-11-20', () => abrir(5002, 200000));
  await em('2026-11-21', () => levar(s5002.cardId, 'analise'));
}
