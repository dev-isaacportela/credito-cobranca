// Regra de tela da 004 (spec "Testes", linhas "regra de tela"; tasks T-301 a T-304).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  motivoTipoCliente, fmtIndice, zonaFlex, grupoDaFila, estadoSinal, podeMoverConcessao, podeMoverPedido, rotuloFase,
  chaveDaFase, ehVolta, motivoNaoDecide, motivoNaoLibera, faixasDoFarol, chaveDaFicha,
} from '../src/lib/concessao-credito/regras.ts';

test('C-001: sugestão recorrente de cliente com crédito vigente mostra "crédito ativo na carteira"', () => {
  assert.deepEqual(motivoTipoCliente({ TIPO_CLIENTE: 'RECORRENTE', TEM_CREDITO_VIGENTE: 1 }),
    { tipo: 'RECORRENTE', rotulo: 'Recorrente', motivo: 'crédito ativo na carteira' });
  // O motivo da SQL vence a derivação.
  assert.equal(motivoTipoCliente({ TIPO_CLIENTE: 'RECORRENTE', TEM_CREDITO_VIGENTE: 1, MOTIVO: 'crédito ativo na carteira' }).motivo, 'crédito ativo na carteira');
});

test('RN-001: recorrente sem crédito vigente, inativo e novo', () => {
  assert.equal(motivoTipoCliente({ TIPO_CLIENTE: 'RECORRENTE', TEM_CREDITO_VIGENTE: 0 }).motivo, 'já tem solicitação registrada');
  assert.equal(motivoTipoCliente({ TIPO_CLIENTE: 'INATIVO', TEM_CREDITO_VIGENTE: 0 }).motivo, 'cadastro obsoleto');
  assert.equal(motivoTipoCliente({ TIPO_CLIENTE: 'NOVO' }).rotulo, 'Novo');
  assert.equal(motivoTipoCliente(null).motivo, 'sem solicitação anterior');
});

test('C-024: zonas do mostrador (105.000 flexível; 125.000 acima do teto)', () => {
  assert.equal(zonaFlex(105000, 100000, 20000), 'flexivel');
  assert.equal(zonaFlex(125000, 100000, 20000), 'acima');
  assert.equal(zonaFlex(100000, 100000, 20000), 'dentro');
  assert.equal(zonaFlex(120000, 100000, 20000), 'flexivel');
  assert.equal(zonaFlex(100001, 100000, 0), 'acima');
});

test('RN-013: índices na ficha — 0.8 → "0,80"; 3.5 → "3,5×"', () => {
  assert.equal(fmtIndice(0.8), '0,80');
  assert.equal(fmtIndice(3.5, 'multiplo'), '3,5×');
  assert.equal(fmtIndice(null), '');
  assert.equal(fmtIndice(''), '');
});

// Estrutura com as fases da carteira Privada (backend/lib/quadros/004), na ordem do quadro.
const NOMES = ['1 · Solicitação recebida', '2 · Documentação e análise cadastral', '3 · Análise de crédito', '4 · Comitê / Alçada',
  '5 · Formalização', '6 · Liberação', 'Gestão de crédito', 'Reanálise', 'Cadastro obsoleto', 'Recusadas', 'Encerradas (crédito substituído)'];
const TIPOS = ['comum', 'comum', 'comum', 'comum', 'comum', 'comum', 'comum', 'comum', 'cancelado', 'cancelado', 'sucesso'];
const fases = NOMES.map((nome, i) => ({ id: i + 1, nome, ordem: i, tipo: TIPOS[i], ativo: true }));
const estrutura = { fases };
const f = (ch) => fases.find((x) => chaveDaFase(x) === ch);
const em = (ch) => ({ faseId: f(ch).id });

test('RN-004: espelho podeMoverConcessao — destinos do sistema, uma etapa por vez, volta depois da decisão', () => {
  assert.equal(podeMoverConcessao(em('entrada'), f('cadastral'), estrutura), null);
  assert.equal(podeMoverConcessao(em('entrada'), f('credito'), estrutura), 'Avance uma etapa por vez.');
  assert.equal(podeMoverConcessao(em('credito'), f('cadastral'), estrutura), null); // RN-005: volta antes da decisão
  assert.equal(podeMoverConcessao(em('comite'), f('formalizacao'), estrutura), 'A solicitação sai do Comitê pela decisão.');
  assert.equal(podeMoverConcessao(em('formalizacao'), f('liberacao'), estrutura), null);
  assert.equal(podeMoverConcessao(em('formalizacao'), f('comite'), estrutura), 'Solicitação decidida não volta.'); // RN-005
  assert.equal(podeMoverConcessao(em('liberacao'), f('gestao'), estrutura), 'O crédito entra em gestão quando o limite é aplicado.');
  assert.equal(podeMoverConcessao(em('credito'), f('recusada'), estrutura), 'Recuse pelo botão Recusar, com o motivo.');
  assert.equal(podeMoverConcessao(em('gestao'), f('reanalise'), estrutura), 'Encaminhamento é feito pelo sistema ou pela decisão de reanálise.');
  assert.equal(podeMoverConcessao(em('gestao'), f('liberacao'), estrutura), 'Encaminhamento é feito pelo sistema.');
  assert.equal(ehVolta(em('credito'), f('cadastral'), estrutura), true);
  assert.equal(ehVolta(em('credito'), f('comite'), estrutura), false);
  assert.equal(rotuloFase('4 · Comitê / Alçada'), 'Comitê / Alçada');
  // Fase renomeada: o espelho não conhece a chave e deixa o servidor decidir.
  assert.equal(podeMoverConcessao(em('entrada'), { id: 99, nome: 'Outra', ordem: 5, tipo: 'comum' }, estrutura), null);
});

test('RN-004: espelho podeMoverPedido', () => {
  const fp = ['Retido por limite', 'Análise do excesso', 'Aprovação da alçada', 'Liberado', 'Recusado']
    .map((nome, i) => ({ id: i + 1, nome, ordem: i, tipo: i < 3 ? 'comum' : i === 3 ? 'sucesso' : 'cancelado' }));
  const ep = { fases: fp };
  assert.equal(podeMoverPedido({ faseId: 3 }, fp[3], ep), 'O pedido é liberado ou recusado pela decisão da alçada.');
  assert.equal(podeMoverPedido({ faseId: 4 }, fp[2], ep), 'Pedido decidido não volta.');
  assert.equal(podeMoverPedido({ faseId: 1 }, fp[1], ep), null);
});

test('RN-004: grupoDaFila da gestão de crédito', () => {
  assert.equal(grupoDaFila({ SITUACAO: 'REANALISE' }, { vencido: true }), 'REANALISE');
  assert.equal(grupoDaFila({ SITUACAO: 'GESTAO' }, { vencido: true }), 'VENCIDO');
  assert.equal(grupoDaFila({ SITUACAO: 'GESTAO' }, { vencendo: true }), 'VENCE_15');
  assert.equal(grupoDaFila({ SITUACAO: 'GESTAO', LIMITE_DIVERGE: 1 }), 'DIVERGE');
  assert.equal(grupoDaFila({ SITUACAO: 'GESTAO', LIMITE_DIVERGE: 0 }), 'EM_DIA');
});

test('RN-032: estadoSinal com os cortes crit.*', () => {
  const p = { 'crit.atrasoAlerta': 1, 'crit.atrasoCritico': 30, 'crit.pontAlerta': 90, 'crit.pontCritico': 80, 'crit.scoreAlerta': 600,
    'crit.scoreCritico': 400, 'crit.usoAlerta': 90, 'crit.usoCritico': 100, 'crit.prazoAlerta': 60, 'crit.prazoCritico': 90,
    'crit.ratingAlerta': 'D', 'crit.ratingCritico': 'E' };
  assert.equal(estadoSinal('atraso', 41, p), 'critico');
  assert.equal(estadoSinal('atraso', 0, p), 'normal');
  assert.equal(estadoSinal('pontualidade', 86, p), 'alerta');
  assert.equal(estadoSinal('score', null, p), 'sem'); // score vazio × score 0
  assert.equal(estadoSinal('score', 0, p), 'critico');
  assert.equal(estadoSinal('uso', 100, p), 'critico');
  assert.equal(estadoSinal('prazo', 61, p), 'alerta');
  assert.equal(estadoSinal('rating', 'E', p), 'critico');
  assert.equal(estadoSinal('rating', 'D', p), 'alerta');
  assert.equal(estadoSinal('rating', '', p), 'sem');
  assert.equal(estadoSinal('rebaixado', 1, p, { rating: 'C' }), 'critico');
  assert.equal(estadoSinal('rebaixado', 1, p, { rating: 'B' }), 'alerta');
});

test('RN-007: quem propõe não decide — o botão desabilita com o motivo', () => {
  const ficha = (s, extra = {}) => ({ solicitacao: { FASE_CHAVE: 'comite', DECISAO_RESULTADO: '', ANALISTA_ID: 7, PROPOSTA_POR: '7,9', ...s },
    alcada: { nivel: 3, rotulo: 'Gerente' }, pode: { decidir: true }, ...extra });
  assert.equal(motivoNaoDecide(ficha({}), { membroId: 7, nivel: 4 }), 'O analista da solicitação não decide (quem propõe não decide).');
  assert.equal(motivoNaoDecide(ficha({}), { membroId: 9, nivel: 4 }), 'Quem propôs não decide esta solicitação.');
  assert.equal(motivoNaoDecide(ficha({}), { membroId: 2, nivel: 2 }), 'A decisão exige Gerente.');
  assert.equal(motivoNaoDecide(ficha({}), { membroId: 2, nivel: 3 }), null);
  assert.equal(motivoNaoDecide(ficha({ FASE_CHAVE: 'credito' }), { membroId: 2, nivel: 3 }), 'A decisão é registrada com a solicitação na fase de decisão (Comitê).');
  const pedido = { pedido: { ANALISTA_ID: 7, CRIADO_POR: 8, RECOMENDADO_POR: '9', NIVEL_EXIGIDO: 2, ALCADA_EXIGIDA: 'Supervisor', DECISAO_RESULTADO: '' }, pode: { decidir: true } };
  assert.equal(motivoNaoLibera(pedido, { membroId: 9, nivel: 3 }), 'Quem lançou, analisou ou recomendou o pedido não o libera.');
  assert.equal(motivoNaoLibera(pedido, { membroId: 2, nivel: 1 }), 'A liberação exige Supervisor.');
  assert.equal(motivoNaoLibera(pedido, { membroId: 2, nivel: 2 }), null);
});

test('RN-017: régua das faixas do semáforo com os cortes farol.* (AA 800–1000, A 600–799 … D 0–199, E só rebaixamento)', () => {
  const p = {
    'farol.scoreAA': 800, 'farol.scoreA': 600, 'farol.scoreB': 400, 'farol.scoreC': 200,
    'farol.atrasoA': 5, 'farol.atrasoB': 15, 'farol.atrasoC': 30, 'farol.atrasoD': 45, 'farol.dInad': 20,
    'farol.aaFmin': 100, 'farol.aaFmax': 120, 'farol.aaTeto': 30, 'farol.aaPrazo': 60, 'farol.aaInad': 1,
    'farol.aFmin': 100, 'farol.aFmax': 100, 'farol.aTeto': 25, 'farol.aPrazo': 45, 'farol.aInad': 2,
    'farol.bFmin': 70, 'farol.bFmax': 90, 'farol.bTeto': 20, 'farol.bPrazo': 42, 'farol.bInad': 5,
    'farol.cFmin': 0, 'farol.cFmax': 50, 'farol.cTeto': 15, 'farol.cPrazo': 35, 'farol.cInad': 10,
  };
  const f = faixasDoFarol(p);
  assert.deepEqual(f.map((x) => x.faixa), ['AA', 'A', 'B', 'C', 'D', 'E']);
  assert.equal(f[0].score, '800 a 1000');
  assert.equal(f[0].limite, '100% a 120% do cálculo');
  assert.equal(f[1].score, '600 a 799');
  assert.equal(f[1].limite, '100% do cálculo');
  assert.equal(f[1].atraso, 'até 5 dias');
  assert.equal(f[3].limite, 'até 50% do cálculo');
  assert.equal(f[4].score, '0 a 199');
  assert.equal(f[5].atraso, 'acima de 45 dias');
});

test('F5 C-03: marcar o checklist relê a ficha do card (mesma hora de alteração)', () => {
  const card = { id: 7, faseId: 2, atualizadoEm: '2026-11-19 13:00:00', valores: { cadastral_1: '' } };
  const antes = chaveDaFicha('ccCredSolicitacaoFicha', card, 0);
  assert.notEqual(chaveDaFicha('ccCredSolicitacaoFicha', { ...card, valores: { cadastral_1: '1' } }, 0), antes);
  assert.equal(chaveDaFicha('ccCredSolicitacaoFicha', { ...card }, 0), antes);
  assert.notEqual(chaveDaFicha('ccCredSolicitacaoFicha', card, 1), antes);
});
