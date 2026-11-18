// Regra das telas da 001 (T-090 a T-102): src/lib/base/telas.ts. Id do cenário no título.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emLotes, alternarSelecao, destinosDaAtribuicao, celula, itensParaSalvar, faixaDoDia, contarLeituras, proximaLeitura, duracao,
  feriadosDaLocalidade, conferirDiaUtil, camposDoTexto, camposDesconhecidos, camposExtras, tamanhoLegivel,
} from '../src/lib/base/telas.ts';
import { feriadosNacionais } from '../src/lib/base/dias-uteis.ts';

// Elenco de 06 §2.1 como ccBaseMembroListar devolve (ATIVO 1/0).
const m = (ID, NOME, CARGO, SUPERIOR_ID, ATIVO = 1) => ({ ID, NOME, CARGO, SUPERIOR_ID, ATIVO });
const elenco = [
  m(1, 'Diana', 'DIRETORIA', null), m(2, 'Gustavo', 'GERENTE', 1), m(3, 'Sérgio', 'SUPERVISOR', 2), m(4, 'Silvia', 'SUPERVISOR', 2),
  m(5, 'Ana', 'AGENTE', 3), m(6, 'Bruno', 'AGENTE', 3), m(7, 'Carlos', 'AGENTE', 4), m(8, 'Júlia', 'JURIDICO', 2),
  m(9, 'Nara', 'AGENTE', 2), m(10, 'Otávio', 'AGENTE', 3, 0), m(11, 'Rita', 'ANALISTA', 3),
];
const nomes = (l) => l.map((x) => x.NOME);

test('C-014: destinos da redistribuição e no máximo 20 por vez', () => {
  // Sérgio (supervisor) só move para si e para a equipe dele, ativos e de cargo que carrega carteira.
  assert.deepEqual(nomes(destinosDaAtribuicao(elenco, 3, false)), ['Sérgio', 'Ana', 'Bruno']);
  // Gustavo vê tudo: Agentes, Supervisores e Gerente ativos (sem Diretoria, Jurídico, Analista nem inativo).
  assert.deepEqual(nomes(destinosDaAtribuicao(elenco, 2, true)), ['Gustavo', 'Sérgio', 'Silvia', 'Ana', 'Bruno', 'Carlos', 'Nara']);
  const vinte = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.deepEqual(alternarSelecao(vinte, 21), vinte);
  assert.deepEqual(alternarSelecao(vinte, 5).length, 19);
  assert.deepEqual(alternarSelecao([4], 5), [4, 5]);
  assert.deepEqual(emLotes(Array.from({ length: 45 }, (_, i) => i)).map((l) => l.length), [20, 20, 5]);
});

test('C-015: salvar grupo manda só o que mudou; vazio restaura ou volta a herdar', () => {
  const originais = {
    [celula('crit.atrasoCritico', '')]: '30', [celula('crit.atrasoCritico', 'ESTETICA')]: '',
    [celula('crit.atrasoAlerta', '')]: '1', [celula('crit.atrasoAlerta', 'PUBLICA')]: '3',
  };
  const editados = {
    [celula('crit.atrasoCritico', 'ESTETICA')]: '45', [celula('crit.atrasoAlerta', '')]: ' 1 ', [celula('crit.atrasoAlerta', 'PUBLICA')]: '',
  };
  assert.deepEqual(itensParaSalvar(originais, editados, '2027-01-01'), [
    { chave: 'crit.atrasoCritico', carteira: 'ESTETICA', valor: '45', vigenciaInicio: '2027-01-01' },
    { chave: 'crit.atrasoAlerta', carteira: 'PUBLICA', valor: null, vigenciaInicio: '2027-01-01' },
  ]);
  // C-018: Valor apagado na linha padrão = restaurar o padrão do catálogo (valor nulo).
  assert.deepEqual(itensParaSalvar({ [celula('crit.atrasoCritico', '')]: '35' }, { [celula('crit.atrasoCritico', '')]: '' }, ''), [
    { chave: 'crit.atrasoCritico', carteira: '', valor: null, vigenciaInicio: '' },
  ]);
});

test('C-006: faixa do dia, próxima leitura e duração', () => {
  const leituras = [
    { ID: 4, SITUACAO: 'OK', INICIO: '2026-11-19T10:00:02', FIM: '2026-11-19T10:01:31' },
    { ID: 3, SITUACAO: 'ERRO', INICIO: '2026-11-19T09:15:02' },
    { ID: 2, SITUACAO: 'OK', INICIO: '2026-11-19T09:16:40' },
    { ID: 1, SITUACAO: 'SOLICITADA', INICIO: null, SOLICITADA_EM: '2026-11-19T08:03:00' },
  ];
  const faixa = faixaDoDia(leituras, 15);
  assert.equal(faixa.length, 96);
  assert.deepEqual([faixa[40].tom, faixa[40].leituraId], ['ok', 4]);
  assert.deepEqual([faixa[37].tom, faixa[37].leituraId], ['erro', 3]); // o erro não some atrás do acerto da mesma janela
  assert.equal(faixa[32].tom, 'andamento');
  assert.equal(faixa[0].tom, 'vazio');
  assert.equal(faixa[40].titulo, '10:00–10:15: leitura concluída');
  assert.deepEqual(contarLeituras(leituras), { total: 4, ok: 2, erro: 1 });
  assert.equal(proximaLeitura('2026-11-19T10:46:00', 15), '11:01');
  assert.equal(proximaLeitura(null, 15), '');
  assert.equal(duracao('2026-11-19T10:00:02', '2026-11-19T10:01:31'), '1 min 29 s');
  assert.equal(duracao('2026-11-19T09:15:02', null), '');
});

test('C-021: conferidor de dia útil por localidade', () => {
  const linha = (DATA, NOME, ABRANGENCIA, UF = '', MUNICIPIO = '') => ({ DATA, NOME, ABRANGENCIA, UF, MUNICIPIO });
  const feriados = [
    ...feriadosNacionais(2026).map((f) => linha(f.data, f.nome, 'NACIONAL')),
    linha('2026-11-30', 'Dia do Evangélico', 'UF', 'DF'),
    linha('2026-10-24', 'Aniversário de Goiânia', 'MUNICIPIO', 'GO', 'GOIANIA'),
  ];
  const df = feriadosDaLocalidade(feriados, 'DF');
  assert.equal(df.length, 14);
  assert.equal(feriadosDaLocalidade(feriados, 'GO', 'Goiania').length, 14);
  const r = conferirDiaUtil('2026-11-19', 1, df);
  assert.deepEqual([r.resultado, r.semana], ['2026-11-23', 'segunda-feira']);
  assert.equal(r.pulados.length, 3);
  assert.match(r.pulados[0], /^20\/11 .*Consciência Negra$/);
  assert.deepEqual(r.pulados.slice(1), ['21/11 sábado', '22/11 domingo']);
  assert.equal(conferirDiaUtil('2026-11-27', 1, df).resultado, '2026-12-01'); // 30/11 é feriado no DF
  assert.equal(conferirDiaUtil('2026-11-27', 1, feriadosDaLocalidade(feriados, 'GO')).resultado, '2026-11-30');
  assert.equal(conferirDiaUtil('2026-11-15', 0, df).resultado, '2026-11-16');
});

test('C-023: campos do modelo na tela', () => {
  const texto = 'Prezado(a) [CLIENTE], o valor de [VALOR_VENCIDO] venceu em [VENCIMENTO_MAIS_ANTIGO]. [CLIENTE] [XYZ] até [DATA_LIMITE].';
  assert.deepEqual(camposDoTexto(texto), ['CLIENTE', 'VALOR_VENCIDO', 'VENCIMENTO_MAIS_ANTIGO', 'XYZ', 'DATA_LIMITE']);
  assert.deepEqual(camposExtras('DATA_LIMITE, [PROTOCOLO]'), ['DATA_LIMITE', 'PROTOCOLO']);
  assert.deepEqual(camposDesconhecidos(texto, 'DATA_LIMITE'), ['XYZ']);
  assert.deepEqual(camposDesconhecidos(texto, ''), ['XYZ', 'DATA_LIMITE']);
});

test('C-025: tamanho do anexo na lista', () => {
  assert.equal(tamanhoLegivel(5 * 1024 * 1024), '5,0 MB');
  assert.equal(tamanhoLegivel(2048), '2 KB');
  assert.equal(tamanhoLegivel(0), '');
});
