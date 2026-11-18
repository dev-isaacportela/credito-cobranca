// Regras puras da 003 (RN-002, RN-005, RN-012, RN-015, RN-017 a RN-019, RN-024). Cada função entra no corpo
// das SFs JAVASCRIPT por `FONTE` (texto); as que usam `somarMeses` e `somarDiasUteis` contam com o preâmbulo
// (tempo.mjs) e o FONTE de dias-uteis.mjs, que a SF também cola.

import { somarMeses } from '../tempo.mjs';
import { somarDiasUteis } from '../dias-uteis.mjs';

export { somarMeses, somarDiasUteis };

/** RN-012: nº dos autos no padrão CNJ (20 dígitos). Devolve `{ ok, autos (formatado), ano }`; vazio = ok sem autos. */
export function validarAutos(autos) {
  const t = String(autos ?? '').trim();
  if (!t) return { ok: true, autos: '', ano: 0 };
  const formatado = /^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/.exec(t);
  const puro = /^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/.exec(t);
  const m = formatado || puro;
  if (!m) return { ok: false, autos: '', ano: 0 };
  return { ok: true, autos: `${m[1]}-${m[2]}.${m[3]}.${m[4]}.${m[5]}.${m[6]}`, ano: Number(m[3]) };
}

/** Item obrigatório cumprido (RN-002): OK, ou NA com motivo escrito. */
export function itemCumprido(item) {
  return item.SITUACAO === 'OK' || (item.SITUACAO === 'NA' && String(item.OBS || '').trim() !== '');
}

/**
 * Progresso do dossiê (RF-004): `itens` = linhas de CC_DOSSIE_ITEM; `catalogo` = documentos da carteira.
 * `faltam` = textos dos obrigatórios não cumpridos, sem a aprovação do encaminhamento (que é o envio).
 */
export function progressoDoDossie(itens, catalogo) {
  const obrigatorios = catalogo.filter((d) => d.obrigatorio);
  const porCodigo = new Map((itens || []).map((i) => [i.ITEM, i]));
  const ok = obrigatorios.filter((d) => porCodigo.has(d.codigo) && itemCumprido(porCodigo.get(d.codigo))).length;
  const faltam = obrigatorios.filter((d) => d.codigo !== 'alcada' && !(porCodigo.has(d.codigo) && itemCumprido(porCodigo.get(d.codigo)))).map((d) => d.texto);
  return { ok, total: obrigatorios.length, faltam, completo: faltam.length === 0 };
}

/** RN-017: entrada (parcela 0, se > 0) e N parcelas mensais; resto ÷ N truncado nos centavos, a última absorve a diferença. */
export function gerarParcelas(valor, entrada, n, primeiroVencimento) {
  const c = (v) => Math.round(v * 100) / 100;
  const resto = Math.max(0, c(Number(valor) - Number(entrada)));
  const qtd = Math.max(0, Math.trunc(Number(n)));
  const cada = qtd ? Math.floor((resto / qtd) * 100 + 1e-9) / 100 : 0;
  const parcelas = Number(entrada) > 0 ? [{ numero: 0, valor: c(Number(entrada)), vencimento: primeiroVencimento }] : [];
  for (let i = 1; i <= qtd; i += 1) {
    parcelas.push({ numero: i, valor: i === qtd ? c(resto - cada * (qtd - 1)) : cada, vencimento: somarMeses(primeiroVencimento, i) });
  }
  return parcelas;
}

/** RN-019: o acordo está dentro da política? `p` = parâmetros `jur.*`. Só para mensagem e prévia: quem decide é a guarda SQL. */
export function politicaDoAcordo(valor, entrada, n, p) {
  const motivos = [];
  if (Number(entrada) < Number(valor) * Number(p['jur.acordoEntradaMinPct']) / 100) motivos.push(`entrada abaixo de ${Number(p['jur.acordoEntradaMinPct'])}%`);
  if (Number(n) > Number(p['jur.acordoParcelasMax'])) motivos.push(`mais de ${Number(p['jur.acordoParcelasMax'])} parcelas`);
  if (Number(valor) > Number(p['jur.acordoAlcadaValor'])) motivos.push('acima do valor de alçada');
  return { fora: motivos.length > 0, motivos, situacao: motivos.length ? 'AGUARDANDO' : 'ANDAMENTO', nivel: motivos.length ? Number(p['jur.acordoAlcadaNivel']) : 0 };
}

/** RN-015: informado; senão parcelas pagas; senão o valor se encerrado como quitado; senão zero. */
export function recuperado(processo, parcelasPagas) {
  const informado = processo.RECUPERADO_INFORMADO;
  if (informado !== null && informado !== undefined && informado !== '') return Number(informado);
  if (Number(parcelasPagas) > 0) return Math.round(Number(parcelasPagas) * 100) / 100;
  if (processo.ENCERRADO_EM && processo.MOTIVO_ENCERRAMENTO === 'QUITADO') return Number(processo.VALOR);
  return 0;
}

/** RN-005: data do envio + N dias úteis (feriados nacionais e da UF da filial credora). */
export function prazoInicial(data, n, feriados) {
  return somarDiasUteis(data, n, feriados);
}

/** "15 (quinze)": número de 0 a 999 por extenso, para o prazo da notificação. */
export function porExtenso(n) {
  const u = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze',
    'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate99 = (x) => (x < 20 ? u[x] : d[Math.floor(x / 10)] + (x % 10 ? ` e ${u[x % 10]}` : ''));
  const num = Math.trunc(Number(n));
  let texto;
  if (num === 100) texto = 'cem';
  else if (num < 100) texto = ate99(num);
  else texto = c[Math.floor(num / 100)] + (num % 100 ? ` e ${ate99(num % 100)}` : '');
  return `${num} (${texto})`;
}

/** "19 de novembro de 2026". */
export function dataPorExtenso(iso) {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [a, m, dd] = String(iso).slice(0, 10).split('-').map(Number);
  return `${dd} de ${meses[m - 1]} de ${a}`;
}

/** "R$ 31.087,25". */
export function brl(v) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  const [i, c] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`;
}

/** "19/11/2026". */
export function dataBr(iso) {
  const [a, m, d] = String(iso || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
}

/** "20.720.905/0001-43" ou "123.456.789-01" a partir dos dígitos. */
export function documentoFormatado(doc) {
  const s = String(doc || '').replace(/\D/g, '');
  if (s.length === 14) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
  if (s.length === 11) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
  return s;
}

/**
 * RN-024: o documento da notificação. `corpo` = as 5 cláusulas do modelo já renderizadas; a tabela dos títulos
 * entra logo depois do título da cláusula 1. `d` = { filial, cliente, encargos, data }.
 */
export function montarNotificacao(corpo, d) {
  const f = d.filial;
  const c = d.cliente;
  const doc = String(c.DOCUMENTO || '').replace(/\D/g, '');
  const rotuloDoc = doc.length > 11 ? 'CNPJ' : 'CPF';
  const titulos = (d.encargos.linhas || []).map((l) => `${l.TITULO}${l.PARCELA ? `-${l.PARCELA}` : ''} | ${dataBr(l.VENCIMENTO)} | ${brl(l.SALDO)}`);
  const tabela = ['Título | Vencimento | Valor original', ...(titulos.length ? titulos : [`Saldo vencido (Winthor) | — | ${brl(d.encargos.principal)}`]),
    `Total | | ${brl(d.encargos.principal)}`].join('\n');
  const linhas = String(corpo).split('\n');
  const i = linhas.findIndex((l) => /^1\.\s*Do débito/i.test(l.trim()));
  if (i >= 0) linhas.splice(i + 1, 0, tabela);
  return [
    'NOTIFICAÇÃO EXTRAJUDICIAL DE COBRANÇA', '',
    `NOTIFICANTE: ${f.RAZAO_SOCIAL}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${documentoFormatado(f.CNPJ)}, com sede em ${f.ENDERECO || '[ENDEREÇO DA SEDE]'}.`,
    `NOTIFICADO(A): ${c.NOME}, inscrito(a) no ${rotuloDoc} sob o nº ${documentoFormatado(doc) || '[NÚMERO]'}, com endereço em ${c.ENDERECO || '[ENDEREÇO COMPLETO]'}.`,
    'ASSUNTO: Cobrança de débito vencido e constituição em mora.',
    `REFERÊNCIA: Cliente nº ${c.CODCLI} · Filial credora ${f.CODIGO}.`, '',
    linhas.join('\n'), '',
    'Anexos: I. cópia das notas fiscais; II. boleto bancário; III. demonstrativo atualizado do débito.', '',
    `${f.CIDADE_UF || '[CIDADE/UF]'}, ${dataPorExtenso(d.data)}.`, '',
    '______________________________________',
    `${f.RAZAO_SOCIAL} · CNPJ ${documentoFormatado(f.CNPJ)}`,
    `${f.REPRESENTANTE || '[REPRESENTANTE]'} · ${f.REPRESENTANTE_CARGO || '[CARGO]'}`, '',
    'Recebimento (somente para entrega em mãos): Nome: ____________ Documento: ____________ Data: ___/___/______ Assinatura: ____________',
  ].join('\n');
}

export const FONTE = [validarAutos, itemCumprido, progressoDoDossie, gerarParcelas, politicaDoAcordo, recuperado, prazoInicial, porExtenso,
  dataPorExtenso, brl, dataBr, documentoFormatado, montarNotificacao].map(String).join('\n');
