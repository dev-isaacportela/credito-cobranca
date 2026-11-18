// Regra de tela da 003 (plan "Testes", linhas "tela"; tasks T-250 a T-254). Funções puras de src/lib/juridico/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tomDoPrazo } from '../src/lib/juridico/prazo.ts';
import { montarCsv, COLUNAS_CSV } from '../src/lib/juridico/csv.ts';
import { semelhanca } from '../src/lib/juridico/nomes.ts';
import { interpretar, situacaoPorCor, valorDe, dataDe, etapaDe, notasDe, paraServidor } from '../src/lib/juridico/carga.ts';
import { motivoDeDestino } from '../src/lib/juridico/mover.ts';
import { modulo } from '../src/modules/003-juridico/index.ts';

test('RN-021: tom e texto do prazo para 0, 3, 4, 7, 8 e −2 dias', () => {
  assert.deepEqual(tomDoPrazo(0, 3, 7), { tom: 'alert', texto: 'Prazo hoje' });
  assert.deepEqual(tomDoPrazo(3, 3, 7), { tom: 'alert', texto: 'em 3 dias' });
  assert.deepEqual(tomDoPrazo(4, 3, 7), { tom: 'attention', texto: 'em 4 dias' });
  assert.deepEqual(tomDoPrazo(7, 3, 7), { tom: 'attention', texto: 'em 7 dias' });
  assert.deepEqual(tomDoPrazo(8, 3, 7), { tom: 'off', texto: 'em 8 dias' });
  assert.deepEqual(tomDoPrazo(-2, 3, 7), { tom: 'alert', texto: 'vencido há 2 dias' });
  assert.deepEqual(tomDoPrazo(null), { tom: 'off', texto: '' });
  assert.equal(tomDoPrazo(2, 3, 7).texto, 'em 2 dias'); // C-011: prazo 21/11 visto em 19/11
});

// Matrizes de teste no formato da leitura (planilha.ts): { v, cor }.
const c = (v, cor = '') => ({ v, cor });
const linha = (...vs) => vs.map((v) => (v && typeof v === 'object' ? v : c(v)));
const PLANILHA = {
  'Acompanhamento - Jurídico': [
    linha('Planilha do escritório'),
    linha('Cód.', 'Parte', 'Valor', 'Filial', 'Segmento', 'Situação', 'Tribunal', 'Acompanhamento out/26', 'Status', 'Prazo'),
    linha('3017', 'Nu Hospitalar', 'R$ 8.000,00', 'BNDF', 'Privado', '0801234-55.2025.8.07.0001', 'TJDFT', 'Petição protocolada',
      '[Marcos] 05/11: AR devolvido, pesquisar endereço', 46350),
    linha('3020', 'Rô Medicamentos', 'R$ 7.250,30', 'BNDF', 'Privado', '', '', '', 'Verificar', ''),
    linha('', 'Xi Distribuidra', 4000, 'BNEXDF', 'Privado', '', '', '', 'Novo', ''),
    linha('Aguardando documentação', 'Fulano', 100, '', '', '', '', '', '', ''),
  ],
  Processos: [
    linha('Nome', 'Endereço', 'Valor', 'Filial', 'Segmento', 'Situação', 'Protocolo'),
    linha('Nu Hospitalar Ltda', 'Rua A', 8000, 'BNDF', 'Privado', '0801234-56.2025.8.07.0001', 'substabelecer'),
    linha('Antiga Farmácia Ltda', '', 3000, 'BNDF', 'Privado', 'Quitado', ''),
  ],
  ACORDOS: [
    linha(c('Quitado', 'FF38761D'), c('Pendente', 'FFFF6D01')),
    linha('Cliente', 'Valor', 'Honorários', 'Situação', 'Entrada', 'Parcela 1', 'Parcela 2'),
    linha('Pi Clínica Médica', 12000, 1200, 'Acordo homologado', c('10/09/2026 4.000,00', 'FF38761D'), c('10/10/2026 4.000,00', 'FFFF6D01'),
      c('10/11/2026 4.000,00', 'FFFFFF00')),
  ],
};

test('RN-027 (leitura): etapa pelo texto, autor do andamento, valor, data serial e fusão entre abas', () => {
  assert.equal(etapaDe('AR devolvido, pesquisar endereço'), 'citacao');
  assert.equal(etapaDe('Acordo homologado'), 'acordo');
  assert.equal(etapaDe('Quitado'), 'encerrado');
  assert.equal(etapaDe('Novo'), 'peticao');
  assert.equal(etapaDe('Verificar'), 'peticao');
  assert.equal(valorDe('R$ 7.250,30'), 7250.3);
  assert.equal(dataDe(46350), '2026-11-24');
  assert.deepEqual(notasDe('[Marcos] 05/11: AR devolvido, pesquisar endereço').notas,
    [{ data: '05/11', autor: 'Marcos', periodo: '05/11', texto: 'AR devolvido, pesquisar endereço' }]);

  const { processos, abas } = interpretar(PLANILHA);
  const nomes = processos.map((p) => p.nomeDevedor);
  assert.deepEqual(nomes, ['Nu Hospitalar', 'Rô Medicamentos', 'Xi Distribuidra', 'Antiga Farmácia Ltda', 'Pi Clínica Médica']);
  const nu = processos[0];
  assert.equal(nu.faseChave, 'citacao');
  assert.equal(nu.status, 'AR devolvido, pesquisar endereço');
  assert.equal(nu.andamentos.at(-1).autor, 'Marcos');
  assert.equal(nu.andamentos.at(-1).data, '05/11', 'a data do andamento vai crua');
  assert.equal(nu.prazo, '2026-11-24');
  assert.equal(nu.uf, 'DF');
  assert.equal(nu.codcli, '3017');
  assert.deepEqual(nu.abas, ['Acompanhamento - Jurídico', 'Processos'], 'a mesma linha em duas abas vira um processo só');
  assert.equal(nu.substabelecer, 1);
  assert.match(nu.divergencia, /Nº dos autos diferente entre as abas/);
  assert.equal(nu.chave, '08012345520258070001');
  assert.equal(processos[1].valor, 7250.3);
  assert.equal(processos[1].faseChave, 'peticao');
  assert.equal(processos[2].faseChave, 'peticao');
  assert.equal(processos[2].uf, 'DF');
  assert.equal(processos[3].faseChave, 'encerrado');
  const pi = processos[4];
  assert.equal(pi.faseChave, 'acordo');
  assert.deepEqual(pi.acordo.parcelas.map((p) => [p.numero, p.valor, p.vencimento]), [[0, 4000, '2026-09-10'], [1, 4000, '2026-10-10'], [2, 4000, '2026-11-10']]);
  assert.equal(pi.acordo.entrada, 4000);
  assert.equal(pi.acordo.nParcelas, 2);
  assert.equal(abas.length, 3);
  const enviado = paraServidor(nu, 16);
  assert.equal(enviado.clienteId, 16);
  assert.ok(!('abas' in enviado) && !('prazo' in enviado));
});

test('RN-027 (leitura): semelhança com os mesmos casos do servidor', () => {
  assert.equal(semelhanca('Xi Distribuidra', 'XI DISTRIBUIDORA LTDA'), 1);
  assert.ok(semelhanca('Hospital Santa Maria', 'Hospital Santa Maria Ltda') >= 0.6);
  assert.ok(semelhanca('Hospital Santa Maria', 'Hospital Santa Maria do Sul Ltda') >= 0.6);
  assert.ok(semelhanca('Nu Hospitalar', 'Pi Clínica Médica') < 0.34);
  assert.equal(semelhanca('', 'Qualquer'), 0);
});

test('RN-028: a cor da célula só sugere a situação da parcela', () => {
  const legenda = { pago: '38761D', pendente: 'FF6D01' };
  assert.equal(situacaoPorCor('38761D', legenda), 'PAGA');
  assert.equal(situacaoPorCor('FF6D01', legenda), 'ABERTA');
  assert.equal(situacaoPorCor('FFFF00', legenda), 'A_CONFIRMAR');
  assert.equal(situacaoPorCor('FF38761D', legenda), 'PAGA', 'ARGB do SheetJS');
  assert.equal(situacaoPorCor('', legenda), 'A_CONFIRMAR');
  const pi = interpretar(PLANILHA).processos.at(-1);
  assert.deepEqual(pi.acordo.parcelas.map((p) => p.situacao), ['PAGA', 'ABERTA', 'A_CONFIRMAR']);
});

test('RF-019: CSV com 16 colunas, ";", vírgula decimal e aspas em campo com ";"', () => {
  const csv = montarCsv([{
    NOME_DEVEDOR: 'Hospital Vale Verde', CODCLI: 3002, CARTEIRA: 'PRIVADA', LINHA: '', FILIAL: '1', AUTOS: '0712345-11.2024.8.07.0001',
    TRIBUNAL: 'TJDFT', VALOR: 40000, FASE_NOME: '05 · Citação', STATUS: 'Citação; edital deferido', PRAZO: '2026-11-10', RESPONSAVEL_NOME: 'Júlia',
    DOSSIE_OK: 0, DOSSIE_TOTAL: 0, ACORDO_VALOR: 0, PARCELAS_PAGAS: 0, PARCELAS_TOTAL: 0, ACORDO_A_RECEBER: 0,
  }]);
  assert.ok(csv.startsWith('﻿'), 'BOM');
  const [cab, l1] = csv.slice(1).split('\r\n');
  assert.equal(COLUNAS_CSV.length, 16);
  assert.equal(cab.split(';').length, 16);
  assert.equal(cab, COLUNAS_CSV.join(';'));
  assert.match(l1, /;40000,00;/);
  assert.match(l1, /;"Citação; edital deferido";/);
  assert.match(l1, /;10\/11\/2026;Júlia;/);
  assert.match(l1, /^Hospital Vale Verde;3002;Privada;Demais;1;/);
});

const JULIA = { cargo: 'JURIDICO', nivel: 1, admin: false };
const ANA = { cargo: 'AGENTE', nivel: 1, admin: false };
const SERGIO = { cargo: 'SUPERVISOR', nivel: 2, admin: false };
const NARA = { cargo: 'AGENTE', nivel: 1, admin: true };
const ATLAS = { ORIGEM: 'COBRANCA', DOSSIE_ENVIADO_EM: null, ENCERRADO_EM: null, AUTOS: '' };

test('gancho: motivoDeDestino espelha as 7 regras, na ordem e com as frases de 04 §8', () => {
  // (1) nunca volta ao dossiê; (2) encerrado não volta.
  assert.equal(motivoDeDestino(JULIA, { ...ATLAS, DOSSIE_ENVIADO_EM: '2026-11-19' }, 'recebido', 'dossie'), 'Processo não volta para o dossiê.');
  assert.equal(motivoDeDestino(JULIA, { ENCERRADO_EM: '2026-10-15', AUTOS: 'x' }, 'encerrado', 'execucao'), 'Processo encerrado não volta.');
  // (3) Encerrado só pela ação; com ENCERRADO_EM gravado o destino passa (o mover aninhado do encerramento).
  assert.equal(motivoDeDestino(JULIA, { AUTOS: '1' }, 'citacao', 'encerrado'), 'Encerre pelo botão Encerrar processo, com o motivo.');
  assert.equal(motivoDeDestino(ANA, { ENCERRADO_EM: '2026-11-19' }, 'dossie', 'encerrado'), null);
  // (4) dossiê → recebido só pelo envio; Supervisor com o dossiê enviado passa (destino controlado, DT-35).
  assert.equal(motivoDeDestino(JULIA, ATLAS, 'dossie', 'recebido'), 'Envie o dossiê para sair desta etapa.');
  assert.equal(motivoDeDestino(SERGIO, { ...ATLAS, DOSSIE_ENVIADO_EM: '2026-11-19' }, 'dossie', 'recebido'), null);
  // (5) movimento livre só do Jurídico ou de quem administra (D-07): Ana e Sérgio recusados, Nara (ADMIN) passa.
  assert.equal(motivoDeDestino(ANA, ATLAS, 'dossie', 'peticao'), 'Só o Jurídico move processos.');
  assert.equal(motivoDeDestino(SERGIO, ATLAS, 'dossie', 'peticao'), 'Só o Jurídico move processos.');
  assert.equal(motivoDeDestino(SERGIO, { AUTOS: '' }, 'recebido', 'peticao'), 'Só o Jurídico move processos.');
  assert.equal(motivoDeDestino(NARA, { AUTOS: '' }, 'recebido', 'peticao'), null);
  // (6) Júlia: dossiê não enviado não vai a Petição (C-009 Atlas).
  assert.equal(motivoDeDestino(JULIA, ATLAS, 'dossie', 'peticao'), 'Envie o dossiê para sair desta etapa.');
  // Processo manual ou da carga nasce em dossiê e sai livre para o Jurídico.
  assert.equal(motivoDeDestino(JULIA, { ORIGEM: 'MANUAL', AUTOS: '' }, 'dossie', 'peticao'), null);
  // (7) citação, defesa, sentença e execução exigem os autos (C-009 Delta).
  assert.equal(motivoDeDestino(JULIA, { ORIGEM: 'MANUAL', AUTOS: '' }, 'custas', 'citacao'), 'Informe o número dos autos.');
  assert.equal(motivoDeDestino(JULIA, { ORIGEM: 'MANUAL', AUTOS: '0709999-10.2026.8.07.0001' }, 'custas', 'citacao'), null);
  assert.equal(motivoDeDestino(JULIA, { ORIGEM: 'MANUAL', AUTOS: '' }, 'recebido', 'acordo'), null);
});

test('C-022: menu do Jurídico some para o Analista; carga e filiais em Administração', () => {
  const juridico = modulo.menu.find((i) => i.caminho === '/juridico');
  assert.equal(juridico.grupo, 'OPERACAO');
  assert.equal(juridico.pode({ cargo: 'ANALISTA', nivel: 1, admin: false }), false);
  assert.equal(juridico.pode({ cargo: 'AGENTE', nivel: 1, admin: false }), true);
  const carga = modulo.menu.find((i) => i.caminho === '/juridico/carga');
  assert.equal(carga.pode({ cargo: 'SUPERVISOR', nivel: 2, admin: false }), false);
  assert.equal(carga.pode(JULIA), true);
  assert.ok(modulo.rotas.some((r) => r.caminho === '/juridico/dossie/:processoId'));
});
