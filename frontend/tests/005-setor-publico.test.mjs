// Regra de tela da 005 (spec "Testes", linhas "regra de tela"; tasks T-281 a T-284).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  textoSituacao, etiquetaRegra, documentoRecebivel, evidenciasExigidas, tiposSemCertidao, rotuloDecisao, passosTrilho,
  motivoAnaliseIncompleta, MOTIVO_ANALISE, diasAte, termoBusca,
} from '../src/lib/setor-publico/formato.ts';

test('RF-016: texto da situação com a data e os dias de atraso; etiqueta da regra', () => {
  assert.equal(textoSituacao({ SITUACAO: 'LIQUIDACAO_VENCIDA', LIQUIDAR_ATE: '2026-10-16' }), 'Liquidação vencida desde 16/10');
  assert.equal(textoSituacao({ SITUACAO: 'PAGA', DIAS_ATRASO: 26 }), 'Paga com 26 dias de atraso');
  assert.equal(textoSituacao({ SITUACAO: 'PAGA', DIAS_ATRASO: 0 }), 'Paga no prazo');
  assert.equal(textoSituacao({ SITUACAO: 'PAGAMENTO_VENCIDO', PAGAR_ATE: '2026-11-04' }), 'Pagamento vencido desde 04/11');
  assert.equal(textoSituacao({ SITUACAO: 'A_PROTOCOLAR' }), 'Protocolar a NF');
  assert.equal(etiquetaRegra({ REGRA_NOME: 'Distrito Federal', REGRA_SITUACAO: 'A_CONFIRMAR', PRAZO_CONTRATO: 1, PEQUENO_VALOR: 0 }),
    'Distrito Federal · a confirmar · prazo do contrato');
  assert.equal(etiquetaRegra({ REGRA_NOME: 'Municípios', REGRA_SITUACAO: 'A_CONFIRMAR', PEQUENO_VALOR: true }), 'Municípios · a confirmar · pequeno valor');
  assert.equal(etiquetaRegra({ REGRA_NOME: 'Federal', REGRA_SITUACAO: 'VERIFICADO', PEQUENO_VALOR: 0, PRAZO_CONTRATO: 0 }), 'Federal');
});

test('C-030 e RN-034: documento em que o recebível vencido travou', () => {
  const vencida = { SITUACAO: 'LIQUIDACAO_VENCIDA' };
  assert.equal(documentoRecebivel({ ...vencida, EMPENHO: '2026NE000812', LIQUIDACAO: null }), 'Aguardando liquidação'); // 1001
  assert.equal(documentoRecebivel({ SITUACAO: 'PAGAMENTO_VENCIDO', EMPENHO: 'NE 2204', LIQUIDACAO: '2026-10-20', OP: null }), 'Liquidada sem ordem de pagamento'); // 1002
  assert.equal(documentoRecebivel({ ...vencida, EMPENHO: '', LIQUIDACAO: null }), 'Sem empenho'); // 1003
  assert.equal(documentoRecebivel({ SITUACAO: 'PAGAMENTO_VENCIDO', EMPENHO: 'NE 1930', LIQUIDACAO: '2026-06-10', OP: '2026-07-15' }), 'Ordem de pagamento emitida'); // 1009
  assert.equal(documentoRecebivel({ SITUACAO: 'NO_PRAZO', EMPENHO: '' }), '', 'só NF vencida mostra o documento');
});

test('RN-017: evidências exigidas — 5 no edital, 6 no contrato', () => {
  assert.equal(evidenciasExigidas('EDITAL').length, 5);
  assert.equal(evidenciasExigidas('EDITAL')[0], 'Edital ou termo de referência');
  assert.equal(evidenciasExigidas('CONTRATO').length, 6);
  assert.deepEqual(evidenciasExigidas('CONTRATO').slice(0, 2), ['Contrato ou ata', 'Nota de empenho']);
});

test('C-029: com as quatro certidões cadastradas, só a CND municipal fica "não cadastrada"', () => {
  const vigentes = ['CND_FEDERAL', 'CRF_FGTS', 'CNDT', 'CND_ESTADUAL'].map((TIPO) => ({ TIPO }));
  assert.deepEqual(tiposSemCertidao(vigentes).map((t) => t.tipo), ['CND_MUNICIPAL']);
  assert.equal(tiposSemCertidao([]).length, 5);
  assert.equal(diasAte('2026-12-10', '2026-12-01'), 9);
  assert.equal(diasAte('2026-11-28', '2026-12-01'), -3);
});

test('RN-016: decisão sugerida em palavras', () => {
  assert.equal(rotuloDecisao('APROVAR'), 'Aprovar');
  assert.equal(rotuloDecisao('SEM_EMPENHO'), 'Não entregar sem nota de empenho');
  assert.equal(rotuloDecisao('REDUZIR'), 'Reduzir à exposição máxima');
  assert.equal(rotuloDecisao('PRE_APROVAR'), 'Pré-aprovar até a assinatura do contrato');
});

test('C-014 e C-016: trilho da nota — onde travou e o que falta', () => {
  const estados = (nf) => passosTrilho(nf).map((p) => p.estado).join(',');
  // 1001: protocolada sem atesto, liquidação e pagamento vencidos.
  assert.equal(estados({ EMPENHO: 'NE 812', PROTOCOLO: '2026-10-01', LIQUIDAR_ATE: '2026-10-16', PAGAR_ATE: '2026-10-30', SITUACAO: 'LIQUIDACAO_VENCIDA', DIAS_ATRASO: 32 }),
    'feito,feito,atraso,,,atraso');
  assert.equal(passosTrilho({ EMPENHO: 'x', PROTOCOLO: '2026-10-01', LIQUIDAR_ATE: '2026-10-16', SITUACAO: 'LIQUIDACAO_VENCIDA' })[2].sub, 'até 16/10');
  // 1002: liquidada sem ordem de pagamento.
  assert.equal(estados({ EMPENHO: 'x', PROTOCOLO: '2026-09-29', ATESTO: '2026-10-15', LIQUIDACAO: '2026-10-20', PAGAR_ATE: '2026-11-04', SITUACAO: 'PAGAMENTO_VENCIDO', DIAS_ATRASO: 27 }),
    'feito,feito,feito,feito,agora,atraso');
  // 1004: ordem de pagamento emitida, pagamento vence hoje.
  assert.equal(estados({ EMPENHO: 'x', PROTOCOLO: 'a', ATESTO: 'b', LIQUIDACAO: 'c', OP: 'd', PAGAR_ATE: '2026-12-01', SITUACAO: 'NO_PRAZO', DIAS_ATRASO: 0 }),
    'feito,feito,feito,feito,feito,agora');
  // 1008: a protocolar.
  assert.equal(estados({ EMPENHO: 'x', PAGAR_ATE: '2026-12-28', SITUACAO: 'A_PROTOCOLAR' }), 'feito,agora,,,,');
  // 1003: sem empenho.
  assert.equal(passosTrilho({ EMPENHO: '', PROTOCOLO: '2026-11-03' })[0].sub, 'sem número');
});

test('RN-003: espelho do gancho de concessao-publica (capacidade, perfil e rating)', () => {
  assert.equal(motivoAnaliseIncompleta(null), MOTIVO_ANALISE);
  assert.equal(motivoAnaliseIncompleta({ CAPACIDADE: 'MEDIA', PERFIL_PAG: '', RATING_PUB: 'P1' }), MOTIVO_ANALISE);
  assert.equal(motivoAnaliseIncompleta({ CAPACIDADE: 'MEDIA', PERFIL_PAG: 'PONTUAL', RATING_PUB: 'P1' }), null);
  assert.equal(termoBusca('Goiânia  '), 'GOIANIA');
});
