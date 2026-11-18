// Dias úteis (01 §3, RN-019, RN-020). Funções puras sobre datas `AAAA-MM-DD`.
//
// `feriados` = datas de CC_FERIADO já filtradas pela localidade (nacional + UF + município):
// lista de 'AAAA-MM-DD' ou de objetos { data | DATA, nome | NOME }. Cópia de tela em
// frontend/src/lib/base/dias-uteis.ts, testada com os mesmos casos.
// Para usar dentro de SF JAVASCRIPT, cole `FONTE` no corpo (as funções se chamam entre si).

export function mapaDeFeriados(feriados) {
  if (feriados instanceof Map) return feriados;
  const mapa = new Map();
  for (const f of feriados || []) {
    if (typeof f === 'string') mapa.set(f.slice(0, 10), 'Feriado');
    else if (f) mapa.set(String(f.data ?? f.DATA).slice(0, 10), String(f.nome ?? f.NOME ?? 'Feriado'));
  }
  return mapa;
}

export function somarDias(data, n) {
  const [a, m, d] = String(data).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + Number(n))).toISOString().slice(0, 10);
}

/** '' quando é útil; senão 'sábado', 'domingo' (minúscula: entra no meio da frase, "Próxima ação em sábado") ou o nome do feriado. */
export function motivoNaoUtil(data, feriados) {
  const dia = String(data).slice(0, 10);
  const [a, m, d] = dia.split('-').map(Number);
  const semana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  if (semana === 6) return 'sábado';
  if (semana === 0) return 'domingo';
  return mapaDeFeriados(feriados).get(dia) || '';
}

export function ehDiaUtil(data, feriados) {
  return motivoNaoUtil(data, feriados) === '';
}

/** A própria data se for útil; senão o próximo dia útil. */
export function proximoUtil(data, feriados) {
  const mapa = mapaDeFeriados(feriados);
  let dia = String(data).slice(0, 10);
  while (!ehDiaUtil(dia, mapa)) dia = somarDias(dia, 1);
  return dia;
}

/** A própria data se for útil; senão o dia útil anterior. */
export function anteriorUtil(data, feriados) {
  const mapa = mapaDeFeriados(feriados);
  let dia = String(data).slice(0, 10);
  while (!ehDiaUtil(dia, mapa)) dia = somarDias(dia, -1);
  return dia;
}

/** N dias úteis depois (N < 0: antes). N = 0 ajusta para o próximo útil (RN-019). */
export function somarDiasUteis(data, n, feriados) {
  const mapa = mapaDeFeriados(feriados);
  const passos = Math.trunc(Number(n));
  if (passos === 0) return proximoUtil(data, mapa);
  const sentido = passos > 0 ? 1 : -1;
  let dia = String(data).slice(0, 10);
  for (let falta = Math.abs(passos); falta > 0;) {
    dia = somarDias(dia, sentido);
    if (ehDiaUtil(dia, mapa)) falta -= 1;
  }
  return dia;
}

/** Dias úteis depois de `a` até `b`, inclusive (negativo se `b` vem antes). */
export function diasUteisEntre(a, b, feriados) {
  const mapa = mapaDeFeriados(feriados);
  const inicio = String(a).slice(0, 10);
  const fim = String(b).slice(0, 10);
  if (inicio === fim) return 0;
  const sentido = fim > inicio ? 1 : -1;
  let conta = 0;
  for (let dia = inicio; dia !== fim;) {
    dia = somarDias(dia, sentido);
    if (ehDiaUtil(dia, mapa)) conta += sentido;
  }
  return conta;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Os 13 feriados nacionais do ano (RN-020), em ordem de data. */
export function feriadosNacionais(ano) {
  const p = pascoa(ano);
  const fixos = [
    ['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência do Brasil'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'], ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'], ['12-25', 'Natal'],
  ].map(([md, nome]) => ({ data: `${ano}-${md}`, nome }));
  const moveis = [
    { data: somarDias(p, -48), nome: 'Carnaval' },
    { data: somarDias(p, -47), nome: 'Carnaval' },
    { data: somarDias(p, -2), nome: 'Sexta-feira Santa' },
    { data: somarDias(p, 60), nome: 'Corpus Christi' },
  ];
  return [...fixos, ...moveis].sort((x, y) => (x.data < y.data ? -1 : 1));
}

/** Texto das funções acima, para colar no corpo de uma SF JAVASCRIPT. */
export const FONTE = [
  mapaDeFeriados, somarDias, motivoNaoUtil, ehDiaUtil, proximoUtil, anteriorUtil,
  somarDiasUteis, diasUteisEntre, pascoa, feriadosNacionais,
].map(String).join('\n');
