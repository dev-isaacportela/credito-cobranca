// Regra de tela da 001 (plan.md "Testes", linhas "front"). Funções puras de src/lib/base/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { situacaoDaPosicao } from '../src/lib/base/posicao.ts';
import { normalizarDocumento, formatarDocumento, montarBusca } from '../src/lib/base/documento.ts';
import { montarEquipes } from '../src/lib/base/equipe.ts';
import { ehDiaUtil, somarDiasUteis, feriadosNacionais, mapaDeFeriados } from '../src/lib/base/dias-uteis.ts';
import { validarArquivo } from '../src/lib/base/arquivos.ts';
import { agruparPorDia, agruparPorItem } from '../src/lib/base/auditoria.ts';
import { menuDoMembro, telaInicial } from '../src/lib/base/menu.ts';
import { formatarParametro, GRUPOS_PARAMETRO, oQueMudou } from '../src/lib/base/parametros.ts';
import { registrarExtensao, extensoesDe } from '../src/lib/base/extensoes.ts';
import { modulo as base } from '../src/modules/001-base/index.ts';

test('C-005: posição desatualizada após 2 intervalos', () => {
  assert.equal(situacaoDaPosicao({ minutosDesde: 31, intervaloMin: 15 }), 'desatualizada');
  assert.equal(situacaoDaPosicao({ minutosDesde: 29, intervaloMin: 15 }), 'atual');
  assert.equal(situacaoDaPosicao({ minutosDesde: null, intervaloMin: 15 }), 'nunca');
});

test('C-008: documento e montagem da busca', () => {
  assert.equal(normalizarDocumento('12.345.678/0001-90'), '12345678000190');
  assert.equal(formatarDocumento('12345678000190'), '12.345.678/0001-90');
  assert.equal(formatarDocumento('12345678901'), '123.456.789-01');
  assert.equal(montarBusca('são lucas'), 'SAO LUCAS');
  assert.equal(montarBusca('12.345.678/0001-90'), '12345678000190');
  assert.equal(montarBusca('1001'), '1001');
});

test('C-011: equipes lado a lado', () => {
  // Elenco de 06 §2.1 como ccBaseMembroListar devolve; clientes = atribuição do banco da 001.
  const m = (ID, NOME, CARGO, NIVEL, SUPERIOR_ID, CLIENTES = 0, ATIVO = 1) => ({ ID, NOME, CARGO, NIVEL, SUPERIOR_ID, CLIENTES, ATIVO });
  const elenco = [
    m(1, 'Diana Rocha', 'DIRETORIA', 5, null), m(2, 'Gustavo Lima', 'GERENTE', 3, 1),
    m(3, 'Sérgio Nunes', 'SUPERVISOR', 2, 2, 1), m(4, 'Silvia Prado', 'SUPERVISOR', 2, 2),
    m(5, 'Ana Costa', 'AGENTE', 1, 3, 3), m(6, 'Bruno Dias', 'AGENTE', 1, 3, 3), m(7, 'Carlos Melo', 'AGENTE', 1, 4, 2),
    m(8, 'Júlia Farias', 'JURIDICO', 0, 2), m(9, 'Nara Admin', 'AGENTE', 1, 2), m(10, 'Otávio Reis', 'AGENTE', 1, 3, 0, 0),
    m(11, 'Rita Alves', 'ANALISTA', 1, 3),
  ];
  const { direcao, equipes, diretos } = montarEquipes(elenco);
  const nomes = (lista) => lista.map((p) => p.nome.split(' ')[0]);
  assert.deepEqual(nomes(direcao), ['Diana', 'Gustavo']);
  assert.deepEqual(equipes.map((e) => [e.supervisor.nome.split(' ')[0], nomes(e.membros), e.clientes]),
    [['Sérgio', ['Ana', 'Bruno', 'Rita', 'Otávio'], 7], ['Silvia', ['Carlos'], 2]]);
  assert.equal(equipes[0].membros.find((p) => p.nome.startsWith('Otávio')).inativo, true);
  assert.deepEqual(diretos.map((d) => [d.chefe.nome.split(' ')[0], nomes(d.membros)]), [['Gustavo', ['Júlia', 'Nara']]]);
});

test('C-021: dias úteis na tela', () => {
  const nacionais = feriadosNacionais(2026).map((f) => f.data);
  const df = mapaDeFeriados([...nacionais, '2026-11-30']);
  const go = mapaDeFeriados(nacionais);
  assert.equal(somarDiasUteis('2026-11-13', 1, df), '2026-11-16');
  assert.equal(somarDiasUteis('2026-11-19', 1, df), '2026-11-23');
  assert.equal(ehDiaUtil('2026-02-17', df), false);
  assert.equal(somarDiasUteis('2026-11-15', 0, df), '2026-11-16');
  assert.deepEqual([ehDiaUtil('2026-11-30', df), ehDiaUtil('2026-11-30', go)], [false, true]);
});

test('C-025: arquivo barrado antes do envio', () => {
  const MB = 1024 * 1024;
  assert.match(validarArquivo({ nome: 'grande.pdf', tamanho: 25 * MB }), /até 20 MB/);
  assert.match(validarArquivo({ nome: 'programa.exe', tamanho: MB }), /só PDF, PNG, JPG, XLSX ou DOCX/);
  assert.equal(validarArquivo({ nome: 'contrato.pdf', tamanho: 5 * MB }), null);
});

test('C-026: auditoria por dia e por item', () => {
  const r = (ID, EM, ENTIDADE, ENTIDADE_ID, CAMPO, ANTES, DEPOIS, POR_NOME) => ({ ID, EM, AREA: '', ENTIDADE, ENTIDADE_ID, CAMPO, ANTES, DEPOIS, POR_NOME });
  // Como ccBaseAuditoriaListar devolve: mais recente primeiro.
  const registros = [
    r(8, '2026-11-20 09:06:00', 'PARAMETRO', 0, 'crit.atrasoAlerta', '2', '1 (a partir de 2026-11-20)', 'Nara Admin'),
    r(7, '2026-11-20 09:05:00', 'PARAMETRO', 0, 'crit.atrasoCritico', '85', '90 (a partir de 2026-11-20)', 'Nara Admin'),
    r(6, '2026-11-20 09:04:00', 'PARAMETRO', 0, 'crit.atrasoAlerta', '1', '2 (a partir de 2026-11-20)', 'Nara Admin'),
    r(5, '2026-11-20 09:03:00', 'PARAMETRO', 0, 'crit.atrasoCritico', '90', '85 (a partir de 2026-11-20)', 'Nara Admin'),
    r(4, '2026-11-20 09:02:00', 'PARAMETRO', 0, 'crit.atrasoGrave', '35', '30 (a partir de 2026-11-20)', 'Nara Admin'),
    r(3, '2026-11-20 09:01:00', 'PARAMETRO', 0, 'crit.atrasoGrave', '30', '35 (a partir de 2026-11-20)', 'Nara Admin'),
    r(2, '2026-11-19 10:01:00', 'CLIENTE', 5, 'Agente', 'Bruno Dias', 'Ana Costa', 'Sérgio Nunes'),
    r(1, '2026-11-19 10:00:00', 'CLIENTE', 4, 'Agente', 'Bruno Dias', 'Ana Costa', 'Sérgio Nunes'),
  ];
  const dias = agruparPorDia(registros);
  assert.deepEqual(dias.map((d) => [d.dia, d.registros.length]), [['2026-11-20', 6], ['2026-11-19', 2]]);
  assert.equal(dias[1].registros[1].frase, 'Sérgio Nunes alterou Agente de Bruno Dias para Ana Costa.');
  const itens = agruparPorItem(registros);
  assert.equal(itens.length, 5);
  assert.deepEqual(itens.map((i) => i.registros.length).sort(), [1, 1, 2, 2, 2]);
  const critico = itens.find((i) => i.item === 'crit.atrasoCritico');
  assert.deepEqual(critico.registros.map((x) => x.ID), [5, 7]);
});

test('C-027: menu por perfil', () => {
  const membro = (nome, cargo, nivel, admin = false) => ({ userId: 1, membroId: 1, nome, cargo, nivel, admin, veTudo: admin || nivel >= 3 });
  const ana = membro('Ana Costa', 'AGENTE', 1);
  const sergio = membro('Sérgio Nunes', 'SUPERVISOR', 2);
  const nara = membro('Nara Admin', 'AGENTE', 1, true);
  const gustavo = membro('Gustavo Lima', 'GERENTE', 3);
  const julia = membro('Júlia Farias', 'JURIDICO', 0);
  const cobranca = { spec: '002-cobranca-privada', rotas: [], menu: [
    { grupo: 'OPERACAO', rotulo: 'Cobrança', caminho: '/cobranca/privada', icone: 'wallet', ordem: 40, pode: (m) => m.cargo !== 'JURIDICO' },
    { grupo: 'OPERACAO', rotulo: 'Minha agenda', caminho: '/agenda', icone: 'calendar-check', ordem: 20 },
  ] };
  const naoEntregue = { spec: '003-juridico', rotas: [], menu: [{ grupo: 'OPERACAO', rotulo: 'Jurídico', caminho: '/juridico', icone: 'scale', ordem: 50 }] };
  const ADMIN = ['Parâmetros', 'BUs e segmentos', 'Feriados', 'Modelos de mensagem', 'Sincronização', 'Auditoria'];
  const CADASTROS = ['Clientes', 'Contatos', 'Equipe', 'Planos de pagamento'];
  const rotulos = (m, mods) => Object.fromEntries(menuDoMembro(m, mods).map((g) => [g.grupo, g.itens.map((i) => i.rotulo)]));

  // Só a base entregue.
  assert.deepEqual(rotulos(ana, [base]), { CADASTROS });
  assert.deepEqual(rotulos(sergio, [base]), { CADASTROS });
  assert.deepEqual(rotulos(nara, [base]), { CADASTROS, ADMINISTRACAO: ADMIN });
  assert.deepEqual(rotulos(gustavo, [base]), { CADASTROS, ADMINISTRACAO: ADMIN });

  // Com um módulo de operação entregue (o 003 fica fora da lista: nenhum item dele).
  const entregues = [base, cobranca];
  assert.deepEqual(rotulos(ana, entregues), { OPERACAO: ['Minha agenda', 'Cobrança'], CADASTROS });
  assert.deepEqual(rotulos(gustavo, entregues), { OPERACAO: ['Minha agenda', 'Cobrança'], CADASTROS, ADMINISTRACAO: ADMIN });
  assert.equal(JSON.stringify(menuDoMembro(nara, entregues)).includes('Jurídico'), false);
  assert.ok(rotulos(gustavo, [...entregues, naoEntregue]).OPERACAO.includes('Jurídico'));
  // Item com `pode` falso para o membro some.
  assert.deepEqual(rotulos(julia, entregues).OPERACAO, ['Minha agenda']);
  // Só os três grupos, nessa ordem.
  assert.deepEqual(menuDoMembro(nara, entregues).map((g) => g.grupo), ['OPERACAO', 'CADASTROS', 'ADMINISTRACAO']);
});

test('RN-027: parâmetro na sua unidade', () => {
  assert.equal(formatarParametro({ CHAVE: 'cob.valorMinimo', TIPO: 'MOEDA', UNIDADE: 'R$' }, 65492.11), 'R$ 65.492,11');
  assert.equal(formatarParametro({ CHAVE: 'enc.jurosMes', TIPO: 'PERCENTUAL', UNIDADE: '%' }, 0.5), '0,5%');
  assert.equal(formatarParametro({ CHAVE: 'regua.cobAviso1', TIPO: 'INTEIRO', UNIDADE: 'd' }, 4), 'D+4');
  assert.equal(formatarParametro({ CHAVE: 'limite.fator', TIPO: 'DECIMAL', UNIDADE: 'fator' }, 1.2), '1,2');
  assert.equal(formatarParametro({ CHAVE: 'base.fichaValidadeDias', TIPO: 'INTEIRO', UNIDADE: 'd' }, 180), '180 dias');
  assert.equal(formatarParametro({ CHAVE: 'base.fichaValidadeDias', TIPO: 'INTEIRO', UNIDADE: 'd' }, null), '');
  assert.equal(GRUPOS_PARAMETRO.length, 19);
  assert.deepEqual(oQueMudou({ 'crit.a': '30', 'crit.b': '1' }, { 'crit.a': '35', 'crit.b': ' 1 ' }), [{ chave: 'crit.a', valor: '35' }]);
});

test('Extensões: registros do mesmo quadro combinados', () => {
  const aba = (id) => ({ id, rotulo: id, render: () => id });
  const acao = (texto) => () => texto;
  registrarExtensao('teste-cobranca', {
    abasExtras: [aba('dona')], acoesExtras: [acao('acao-dona')],
    conteudoDaFase: () => 'bloco-dona', podeMover: () => null,
  });
  registrarExtensao('teste-cobranca', {
    abasExtras: [aba('publico')], acoesExtras: [acao('acao-publico')],
    conteudoDaFase: () => null, podeMover: () => 'Falta a nota do órgão.',
  });
  registrarExtensao('teste-cobranca', { conteudoDaFase: () => 'bloco-terceiro', podeMover: () => 'Outro motivo.' });

  const ext = extensoesDe('teste-cobranca');
  assert.deepEqual(ext.abasExtras.map((a) => a.id), ['dona', 'publico']);
  assert.deepEqual(ext.acoesExtras.map((f) => f()), ['acao-dona', 'acao-publico']);
  const blocos = ext.conteudoDaFase({}).props.children.map((filho) => filho.props.children);
  assert.deepEqual(blocos, ['bloco-dona', 'bloco-terceiro']);
  assert.equal(ext.podeMover({}, {}, {}), 'Falta a nota do órgão.');

  // Registrar de novo com o mesmo dono (o Vite reexecutando um extensoes.tsx) substitui: nada em dobro no card.
  registrarExtensao('teste-hmr', { abasExtras: [aba('historico'), aba('posicao')] }, '004');
  registrarExtensao('teste-hmr', { abasExtras: [aba('orgao')] }, '005');
  registrarExtensao('teste-hmr', { abasExtras: [aba('historico'), aba('posicao')] }, '004');
  assert.deepEqual(extensoesDe('teste-hmr').abasExtras.map((a) => a.id), ['historico', 'posicao', 'orgao']);

  const vazio = extensoesDe('sem-registro');
  assert.deepEqual([vazio.abasExtras, vazio.acoesExtras], [[], []]);
  assert.equal(vazio.conteudoDaFase({}), null);
  assert.equal(vazio.podeMover({}, {}, {}), null);
});

test('F5 tropeço 1: cada cargo abre na tela do dia (se está no menu dele)', () => {
  const menu = [{ itens: [{ caminho: '/painel' }, { caminho: '/agenda' }, { caminho: '/credito' }] }];
  const m = (cargo) => ({ cargo, nivel: 1, admin: false });
  assert.equal(telaInicial(m('AGENTE'), menu), '/agenda');
  assert.equal(telaInicial(m('SUPERVISOR'), menu), '/agenda');
  assert.equal(telaInicial(m('ANALISTA'), menu), '/credito');
  assert.equal(telaInicial(m('GERENTE'), menu), '/painel');
  assert.equal(telaInicial(m('AGENTE'), [{ itens: [{ caminho: '/painel' }] }]), '/painel');
  assert.equal(telaInicial(m('AGENTE'), []), '/clientes');
});
