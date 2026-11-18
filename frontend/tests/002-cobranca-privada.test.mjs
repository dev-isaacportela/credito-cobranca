// Regra de tela da 002 (plan.md "Testes", linhas "tela" e "puro"). Funções puras de src/lib/cobranca-privada/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nomeDaFase } from '../src/lib/cobranca-privada/fases.ts';
import { motivoDeDestino } from '../src/lib/cobranca-privada/mover.ts';
import { semanaUteis, diasDaSemana, semanasDoMes, periodoDaVisao, andarPeriodo, rotuloDoPeriodo, cabecalhoDoDia, eventosPorDia, limitePromessa, agruparPorDia, abaDoBloqueio, abasDoAcordo } from '../src/lib/cobranca-privada/agenda.ts';
import { cenariosAcordo, simularParcelas } from '../src/lib/cobranca-privada/acordo.ts';
import { corChance, situacaoFila, emLotes, retornosDa } from '../src/lib/cobranca-privada/listas.ts';
import { agruparPorSupervisor, resumoGerencial } from '../src/lib/cobranca-privada/gerencial.ts';
import { modulo } from '../src/modules/002-cobranca-privada/index.ts';

const FERIADO_20 = ['2026-11-20'];
const fase = (chave, final = false) => ({ chave, final });

test('C-004: nomeDaFase com regua.lig = 6 na Estética', () => {
  assert.equal(nomeDaFase('cob_ativa', { 'regua.lig': 6 }), 'D+6 · Cobrança ativa');
  assert.equal(nomeDaFase('cob_ativa'), 'D+4 · Cobrança ativa');
  assert.equal(nomeDaFase('prev_d5', { 'regua.prevAviso1': 5 }), 'D-5 · Lembrete');
  assert.equal(nomeDaFase('negociacao'), 'Em negociação');
});

test('RN-001: nomeDaFase das fases da régua pelos parâmetros', () => {
  const p = { 'regua.confPag': 2, 'regua.lig': 6, 'regua.notif': 7, 'regua.neg': 10, 'regua.prop': 20, 'regua.extra': 30 };
  assert.deepEqual(['venc_d0', 'pag_nao_ident', 'cob_ativa', 'notif_formal', 'protesto', 'neg_pos_protesto', 'extrajudicial'].map((c) => nomeDaFase(c, p)),
    ['D+0 · Vencimento', 'D+2 · Pagamento não identificado', 'D+6 · Cobrança ativa', 'D+7 · Notificação formal', 'D+10 · Protesto em cartório',
      'D+20 · Negociação pós-protesto', 'D+30 · Extrajudicial']);
});

test('C-007: motivoDeDestino libera da negociação só a fase devida e recusa com acordo em aberto', () => {
  const ficha = { caso: { faseDevida: 'protesto', juridicoEm: null, encerradoEm: null, desfecho: '' }, posicao: { VENCIDO: 9000 }, acordo: null, pode: { registrarContato: true } };
  const de = fase('negociacao');
  assert.equal(motivoDeDestino(ficha, de, fase('protesto')), null);
  assert.match(motivoDeDestino(ficha, de, fase('extrajudicial')), /etapa devida/);
  assert.equal(motivoDeDestino(ficha, de, fase('acordo')), 'O card vai para Acordo quando o acordo é aprovado.');
  assert.equal(motivoDeDestino(ficha, de, fase('juridico')), 'Envie o dossiê pelo quadro Jurídico.');
  assert.match(motivoDeDestino(ficha, de, fase('regularizado', true)), /encerrado pelo sistema/);
  const comAcordo = { ...ficha, acordo: { SITUACAO: 'PROPOSTO' } };
  assert.equal(motivoDeDestino(comAcordo, de, fase('protesto')), 'Há acordo em aberto neste caso.');
  // C-006: entre fases da régua só a devida; régua → negociação exige saldo vencido e quem opera o caso.
  assert.equal(motivoDeDestino(ficha, fase('protesto'), fase('extrajudicial')), 'A régua move o card pelos dias de atraso.');
  assert.equal(motivoDeDestino(ficha, fase('protesto'), fase('negociacao')), null);
  assert.equal(motivoDeDestino({ ...ficha, posicao: { VENCIDO: 0 } }, fase('protesto'), fase('negociacao')), 'Só cliente com saldo vencido entra em negociação.');
  assert.equal(motivoDeDestino({ ...ficha, pode: { registrarContato: false } }, fase('protesto'), fase('negociacao')), 'Só quem opera o caso move o card.');
  assert.equal(motivoDeDestino(ficha, fase('acordo'), fase('negociacao')), 'A régua move o card pelos dias de atraso.');
  assert.equal(motivoDeDestino(ficha, fase('oficio'), fase('requerimento'), false), 'A etapa do órgão acompanha as notas fiscais.');
});

test('C-022: semanaUteis pula o feriado (os 7 dias úteis dos números da agenda)', () => {
  const semana = semanaUteis('2026-11-19', FERIADO_20);
  assert.deepEqual(semana, ['2026-11-19', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-30']);
});

test('C-022: calendário da agenda — semana de segunda a domingo, mês em semanas inteiras, navegação', () => {
  assert.deepEqual(diasDaSemana('2026-11-19'), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  assert.deepEqual(diasDaSemana('2026-11-22')[0], '2026-11-16'); // domingo fecha a semana, não abre
  const mes = semanasDoMes('2026-11-19'); // 1/11/2026 é domingo
  assert.equal(mes.length, 6);
  assert.deepEqual([mes[0][0], mes[0][6], mes[5][6]], ['2026-10-26', '2026-11-01', '2026-12-06']);
  assert.equal(semanasDoMes('2027-02-10').length, 4); // fevereiro de 2027 começa na segunda e tem 28 dias
  assert.deepEqual(periodoDaVisao('semana', '2026-11-19'), { de: '2026-11-16', ate: '2026-11-22' });
  assert.deepEqual(periodoDaVisao('mes', '2026-11-19'), { de: '2026-10-26', ate: '2026-12-06' });
  assert.equal(andarPeriodo('semana', '2026-12-28', 1), '2027-01-04');
  assert.equal(andarPeriodo('mes', '2026-12-15', 1), '2027-01-01');
  assert.equal(andarPeriodo('mes', '2026-01-31', -1), '2025-12-01');
  assert.equal(rotuloDoPeriodo('semana', '2026-11-19'), '16/11 a 22/11/2026');
  assert.equal(rotuloDoPeriodo('mes', '2026-11-19'), 'Novembro de 2026');
  assert.deepEqual(cabecalhoDoDia('2026-11-20', FERIADO_20), { semana: 'sex', data: '20/11', numero: 20, naoUtil: 'Feriado' });
  assert.equal(cabecalhoDoDia('2026-11-21', FERIADO_20).naoUtil, 'sábado');
  assert.equal(cabecalhoDoDia('2026-11-19', FERIADO_20).naoUtil, '');
  const por = eventosPorDia([{ DATA: '2026-11-19 10:00', ID: 1 }, { DATA: '2026-11-17', ID: 2 }, { DATA: '2026-11-19', ID: 3 }, { DATA: '' }]);
  assert.deepEqual([...por.keys()], ['2026-11-19', '2026-11-17']);
  assert.deepEqual(por.get('2026-11-19').map((e) => e.ID), [1, 3]);
});

test('RN-007: limitePromessa em dias úteis; 0 = sem limite', () => {
  assert.equal(limitePromessa('2026-11-13', 5, FERIADO_20), '2026-11-23');
  assert.equal(limitePromessa('2026-11-13', 0, FERIADO_20), '');
});

test('RN-016: corChance 40 forte, 39 e 15 média, 14 baixa', () => {
  assert.deepEqual([40, 39, 15, 14].map((p) => corChance(p).faixa), ['FORTE', 'MEDIA', 'MEDIA', 'BAIXA']);
  assert.equal(corChance(30, 30, 10).faixa, 'FORTE');
});

test('RN-021: situacaoFila igual ao SITUACAO_TELA e lotes de 2', () => {
  assert.equal(situacaoFila({ SITUACAO: 'ENVIADO', PARA: 'a@b', MODO: 'APROVAR' }).situacao, 'ENVIADO');
  assert.equal(situacaoFila({ SITUACAO: 'PENDENTE', PARA: '', MODO: 'APROVAR' }).situacao, 'SEM_EMAIL');
  assert.equal(situacaoFila({ SITUACAO: 'PENDENTE', PARA: 'a@b', MODO: 'APROVAR' }).situacao, 'APROVAR');
  assert.equal(situacaoFila({ SITUACAO: 'PENDENTE', PARA: 'a@b', MODO: 'MANUAL' }).situacao, 'ENVIAR');
  assert.deepEqual(emLotes([1, 2, 3]), [[1, 2], [3]]);
});

test('gerencial: agruparPorSupervisor, resumoGerencial, agruparPorDia, cenariosAcordo e simularParcelas', () => {
  const ag = (AGENTE_ID, SUPERVISOR_ID, SUPERVISOR_NOME, CLIENTES_ATRASO, VENCIDO, RECUPERADO, ACOES_ATRASADAS) =>
    ({ AGENTE_ID, SUPERVISOR_ID, SUPERVISOR_NOME, CLIENTES_ATRASO, VENCIDO, RECUPERADO, ACOES_ATRASADAS });
  const grupos = agruparPorSupervisor([ag(5, 3, 'Sérgio', 2, 1000.1, 50, 1), ag(6, 3, 'Sérgio', 1, 500.2, 0, 0),
    ag(7, 4, 'Silvia', 3, 300, 10, 2), ag(9, 4, 'Silvia', 0, 0, 0, 0)]);
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos.map((g) => [g.supervisorNome, g.agentes.length, g.clientesAtraso, g.vencido, g.recuperado, g.acoesAtrasadas]),
    [['Sérgio', 2, 3, 1500.3, 50, 1], ['Silvia', 2, 3, 300, 10, 2]]);

  const frase = resumoGerencial({ VENCIDO: 1000, CLIENTES_VENCIDOS: 2, INAD_PCT: 7.8, META_INAD: 10, PROMESSAS: 4, PROMESSAS_CUMPRIDAS_PCT: 50, META_PROMESSA: 70, ACOES_PENDENTES: 3, ACOES_ATRASADAS: 1 }, 'privada');
  assert.match(frase, /R\$\s1\.000,00 vencidos em 2 clientes: 7,8% da carteira, dentro da meta de 10%/);
  assert.match(frase, /50%, abaixo da meta de 70%/);
  assert.match(frase, /3 ações da régua pendentes, 1 atrasadas/);

  const dias = agruparPorDia([{ ID: 3, DATA: '2026-11-19' }, { ID: 2, DATA: '2026-11-19' }, { ID: 1, DATA: '2026-11-16' }]);
  assert.deepEqual(dias.map((d) => [d.dia, d.contatos.length]), [['2026-11-19', 2], ['2026-11-16', 1]]);

  const cen = cenariosAcordo(10000, { 'cob.acordoEntradaMinPct': 20, 'cob.acordoMaxParcelas': 5, 'cob.acordoParcelasPadrao': 3, 'cob.acordoValorGerente': 50000 });
  assert.deepEqual(cen.map((c) => [c.chave, c.entrada, c.n, c.dentroDoPadrao, c.nivel]),
    [['curto', 2000, 3, true, 2], ['padrao', 2000, 5, true, 2], ['alongado', 1000, 10, false, 3]]);
  assert.equal(cenariosAcordo(60000, {})[0].dentroDoPadrao, false);

  // RN-010: 3.333,33 / 3.333,33 / 3.333,34 em dias úteis; a entrada vira a parcela 0.
  const parcelas = simularParcelas(10000, 0, 3, '', '2026-11-21', 30, FERIADO_20);
  assert.deepEqual(parcelas.map((p) => [p.venc, p.valor]), [['2026-11-23', 3333.33], ['2026-12-21', 3333.33], ['2027-01-20', 3333.34]]);
  const comEntrada = simularParcelas(10000, 2000, 4, '2026-11-20', '2026-12-01', 30, FERIADO_20);
  assert.deepEqual([comEntrada.length, comEntrada[0].n, comEntrada[0].venc, comEntrada[1].valor], [5, 0, '2026-11-23', 2000]);
});

test('T-062: rotas e menu do módulo da cobrança', () => {
  assert.equal(modulo.spec, '002-cobranca-privada');
  assert.equal(modulo.rotas.length, 11);
  const juridico = { userId: 1, membroId: 8, nome: 'Júlia', cargo: 'JURIDICO', nivel: 0, admin: false, veTudo: false };
  const visiveis = modulo.menu.filter((i) => !i.pode || i.pode(juridico)).map((i) => i.caminho);
  assert.ok(visiveis.includes('/agenda'));
  assert.ok(!visiveis.includes('/cobranca/privada'));
});

test('F5 tropeço 2: o evento do ERP abre a aba da Lista de bloqueio onde o cliente está', () => {
  assert.equal(abaDoBloqueio('Bloqueio total'), 'BLOQUEAR_TOTAL');
  assert.equal(abaDoBloqueio('Bloquear novos pedidos'), 'BLOQUEAR_PEDIDOS');
  assert.equal(abaDoBloqueio('Liberar no ERP'), 'LIBERAR');
});

test('F5 C-02 · DT-35: decisor de outra equipe vê só o acompanhamento do acordo', () => {
  assert.deepEqual(abasDoAcordo(true), ['acompanhamento']);
  assert.deepEqual(abasDoAcordo(false), ['proposta', 'acompanhamento']);
});

test('F5 tropeço 6: retorno do órgão só na carteira Pública', () => {
  const r = ['Pagou', 'Aguardando liquidação (órgão)'];
  assert.deepEqual(retornosDa('PRIVADA', r), ['Pagou']);
  assert.deepEqual(retornosDa('PUBLICA', r), r);
});
