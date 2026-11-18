// Leitura da planilha do escritório na tela (RN-027, RN-028; E §2.1–2.7), saída no formato "processo interpretado"
// do plan: o servidor revalida, recalcula a chave e refaz o vínculo (ccJurCargaPrevia / ccJurCargaAplicar).
// A data do andamento vai crua ('dd/mm', 'dd/mm/aaaa' ou ''); vencimento de parcela e prazo vão em ISO.
// ponytail: colunas por posição, como no artefato (P-39); conferir com a planilha real antes da carga de verdade.

import { normalizarNome, semelhanca } from './nomes.ts';

export interface Celula { v: string | number | null | undefined; cor?: string }
export type Matrizes = Record<string, Celula[][]>;

export interface Andamento { data: string; autor: string; periodo: string; texto: string }
export interface Parcela { numero: number; valor: number; vencimento: string; situacao: 'PAGA' | 'ABERTA' | 'A_CONFIRMAR' }
export interface AcordoLido { valor: number; entrada: number; nParcelas: number; honorarios: number; situacaoTexto: string; parcelas: Parcela[] }

export interface ProcessoInterpretado {
  chave: string;
  nomeDevedor: string;
  codcli: string;
  documento: string;
  clienteId: number;
  carteira: 'PRIVADA' | 'ESTETICA' | 'PUBLICA';
  setor: 'PRIVADO' | 'PUBLICO';
  linha: '' | 'GALDERMA';
  uf: string;
  valor: number;
  autos: string;
  tribunal: string;
  faseChave: string;
  status: string;
  substabelecer: 0 | 1;
  motivo: string;
  divergencia: string;
  andamentos: Andamento[];
  custos: never[];
  acordo: AcordoLido | null;
  /** Só da tela: abas em que o processo apareceu e o prazo lido (o servidor ignora). */
  abas: string[];
  prazo: string;
}

export interface ResumoAba { aba: string; linhas: number; resultado: string }

/* ── ajudantes (E §2.2) ── */

const S = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Moeda: número arredonda; texto tira "R$", pega o 1º número; vírgula = decimal. "R$ 7.250,30" → 7250.3. */
export function valorDe(v: unknown): number {
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  const m = /\d[\d.,]*/.exec(S(v).replace(/R\$/gi, ''));
  if (!m) return 0;
  let t = m[0];
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Nº dos autos (padrão CNJ, com pontos) dentro do texto, ou ''. */
export function autosDe(v: unknown): string {
  const m = /\d[\d.-]{14,}\d/.exec(S(v));
  return m && (m[0].match(/\./g) || []).length >= 2 ? m[0] : '';
}

const quinze = (autos: string) => autos.replace(/\D/g, '').slice(0, 15);

function codDe(v: unknown): string {
  if (typeof v === 'number') return String(Math.round(v));
  return S(v).replace(/\.0+$/, '').replace(/\D/g, '');
}

/** UF da sigla da filial do escritório: BNEXDF/BNDF → DF, BNGO → GO, …; sem UF reconhecível, ''. */
export function ufDaFilial(v: unknown): string {
  const t = S(v).toUpperCase().replace(/\s+/g, '');
  const m = /(DF|GO|RS|TO|MG|SP|RJ|PR|SC|BA|MT|MS)$/.exec(t);
  return m ? m[1] : '';
}

/** Data: número 20000–80000 = serial do Excel (base 1899-12-30); texto d/m/aaaa → ISO; senão ''. */
export function dataDe(v: unknown): string {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  }
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(S(v));
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

/** Status com notas `[Autor] dd/mm: texto`: o texto antes do 1º colchete e as notas. */
export function notasDe(t: unknown): { base: string; notas: Andamento[] } {
  const texto = S(t);
  const i = texto.search(/\[[^\]]{2,30}\]/);
  if (i < 0) return { base: texto, notas: [] };
  const notas: Andamento[] = [];
  const re = /\[([^\]]{2,30})\]\s*(?:(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*:)?\s*([^[]*)/g;
  for (const m of texto.slice(i).matchAll(re)) {
    const txt = S(m[3]);
    if (txt) notas.push({ data: m[2] ?? '', autor: S(m[1]), periodo: m[2] ?? '', texto: txt });
  }
  return { base: S(texto.slice(0, i)), notas };
}

/** Etapa sugerida pelo texto da situação (E §2.3; a ordem importa). '' = sem regra. */
export function etapaDe(texto: unknown): string {
  const t = S(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!t) return '';
  const regras: [string, RegExp][] = [
    ['encerrado', /quitad|integralmente cumprid|extint/],
    ['acordo', /em acordo|acordo homologad/],
    ['suspenso', /arquivad|recuperacao judicial|falencia|massa falida|suspens/],
    ['execucao', /cumprimento de senten|penhora|sisbajud|renajud|infojud|\brpv\b|precatorio|levantamento|demonstrativo discriminado|execucao/],
    ['defesa', /aguardando senten/],
    ['sentenca', /sentenca|apelacao|2o grau|2º grau|transito|recurso/],
    ['citacao', /citacao|edital|endereco|ar devolvid|mandado|diligencia|carta de cit|custas postais|locomo|intimad/],
    ['defesa', /embargo|contrarraz|conclus|decis|despacho|provas|audiencia|julgamento|manifest|competencia|redistribu|interlocut/],
    ['custas', /custas iniciais|enviado para protocolo|protocolo/],
    ['peticao', /inicial|confec|verificar|novo/],
  ];
  return regras.find(([, re]) => re.test(t))?.[0] ?? '';
}

/** RN-028: a cor da célula só sugere a situação. Cor da legenda "quitado" → paga, "pendente" → aberta, outra → a confirmar. */
export function situacaoPorCor(cor: unknown, legenda: { pago: string; pendente: string }): Parcela['situacao'] {
  const c = String(cor ?? '').toUpperCase().replace(/^#|^FF(?=[0-9A-F]{6}$)/, '');
  if (c && c === legenda.pago.toUpperCase()) return 'PAGA';
  if (c && c === legenda.pendente.toUpperCase()) return 'ABERTA';
  return 'A_CONFIRMAR';
}

/** Chave da carga (RN-029), como o servidor a recalcula: dígitos dos autos; senão código + nome; senão nome. */
export function chaveDe(p: Pick<ProcessoInterpretado, 'autos' | 'codcli' | 'nomeDevedor'>): string {
  const autos = p.autos.replace(/\D/g, '');
  if (autos.length >= 15) return autos.slice(0, 80);
  const nome = normalizarNome(p.nomeDevedor);
  return (p.codcli ? `${p.codcli}|${nome}` : nome).slice(0, 80);
}

/* ── leitura ── */

const ABAS: { chave: 'jur' | 'esp' | 'ext' | 'proc' | 'acordo'; nome: string; re: RegExp }[] = [
  { chave: 'jur', nome: 'Acompanhamento - Jurídico', re: /acompanhamento.*j[uú]r/i },
  { chave: 'esp', nome: 'Acompanhar - Específicos', re: /espec[ií]fic/i },
  { chave: 'ext', nome: 'Acompanhamento - Extrajudicial', re: /extrajud/i },
  { chave: 'proc', nome: 'Processos', re: /^processos/i },
  { chave: 'acordo', nome: 'ACORDOS', re: /acordo/i },
];

function segmento(v: unknown): Pick<ProcessoInterpretado, 'carteira' | 'setor' | 'linha'> {
  const t = S(v);
  if (/p[uú]blico/i.test(t)) return { carteira: 'PUBLICA', setor: 'PUBLICO', linha: '' };
  if (/galderma/i.test(t)) return { carteira: 'ESTETICA', setor: 'PRIVADO', linha: 'GALDERMA' };
  return { carteira: 'PRIVADA', setor: 'PRIVADO', linha: '' };
}

function novo(nome: string, aba: string): ProcessoInterpretado {
  return {
    chave: '', nomeDevedor: nome, codcli: '', documento: '', clienteId: 0, carteira: 'PRIVADA', setor: 'PRIVADO', linha: '', uf: '', valor: 0,
    autos: '', tribunal: '', faseChave: 'recebido', status: '', substabelecer: 0, motivo: '', divergencia: '', andamentos: [], custos: [],
    acordo: null, abas: [aba], prazo: '',
  };
}

const motivoDe = (fase: string, status: string) => (fase !== 'encerrado' ? '' : /quitad/i.test(status) ? 'QUITADO' : 'OUTRO');

/** As 5 abas → processos interpretados (fundidos entre abas) e o resumo por aba. */
export function interpretar(matrizes: Matrizes): { processos: ProcessoInterpretado[]; abas: ResumoAba[] } {
  const lista: ProcessoInterpretado[] = [];
  const resumo: ResumoAba[] = [];
  const achar = (nome: string, cod: string, autos: string) => {
    const porSim = (xs: ProcessoInterpretado[], min: number) =>
      xs.map((x) => ({ x, s: semelhanca(nome, x.nomeDevedor) })).filter((c) => c.s >= min).sort((a, b) => b.s - a.s)[0]?.x;
    if (autos) {
      const achado = porSim(lista.filter((x) => x.autos && quinze(x.autos) === quinze(autos)), 0.34);
      if (achado) return achado;
    }
    if (cod) {
      const achado = porSim(lista.filter((x) => x.codcli === cod), 0.34);
      if (achado) return achado;
    }
    return porSim(lista, 0.6);
  };
  const nomeDaAba = (re: RegExp) => Object.keys(matrizes).find((n) => re.test(n));
  const cabecalho = (m: Celula[][], prefixo: RegExp) => m.findIndex((l) => prefixo.test(S(l?.[0]?.v).normalize('NFD').replace(/[̀-ͯ]/g, '')));

  for (const aba of ABAS) {
    const nome = nomeDaAba(aba.re);
    if (!nome) continue;
    const m = matrizes[nome] ?? [];
    const cont = { linhas: 0, novos: 0, completa: 0, ignoradas: 0, acordos: 0, parcelas: 0 };

    if (aba.chave === 'jur') {
      const h = cabecalho(m, /^cod/i);
      if (h < 0) { resumo.push({ aba: aba.nome, linhas: 0, resultado: 'cabeçalho não encontrado' }); continue; }
      const cab = (m[h] ?? []).map((c) => S(c?.v));
      const iStatus = cab.findIndex((c) => /^status/i.test(c));
      const iPrazo = cab.findIndex((c) => /^prazo/i.test(c));
      const fimPeriodos = iStatus > 7 ? iStatus : cab.length;
      for (const l of m.slice(h + 1)) {
        const parte = S(l?.[1]?.v);
        if (/^aguardando documenta/i.test(S(l?.[0]?.v)) || !parte || /^parte$/i.test(parte)) { if (parte || S(l?.[0]?.v)) cont.ignoradas += 1; continue; }
        cont.linhas += 1;
        const p = novo(parte.replace(/^\d+\s*-\s*/, ''), aba.nome);
        p.codcli = codDe(l[0]?.v);
        p.valor = valorDe(l[2]?.v);
        p.uf = ufDaFilial(l[3]?.v);
        Object.assign(p, segmento(l[4]?.v));
        const at = S(l[5]?.v);
        p.autos = autosDe(at);
        const sit = p.autos ? '' : at;
        p.tribunal = S(l[6]?.v);
        let rotulo = '';
        let last = '';
        for (let c = 7; c < fimPeriodos; c += 1) {
          rotulo = S(cab[c]).replace(/acompanhamento/i, '').trim() || rotulo;
          const txt = S(l[c]?.v);
          if (txt && txt !== last) { p.andamentos.push({ data: '', autor: '', periodo: rotulo, texto: txt }); last = txt; }
        }
        const { base, notas } = iStatus >= 0 ? notasDe(l[iStatus]?.v) : { base: '', notas: [] };
        if (base && base !== last) p.andamentos.push({ data: '', autor: '', periodo: 'Status', texto: base });
        p.andamentos.push(...notas);
        p.status = notas[notas.length - 1]?.texto || base || last || sit;
        p.faseChave = etapaDe(p.status) || etapaDe(base) || etapaDe(last) || etapaDe(sit) || (p.autos ? 'defesa' : 'peticao');
        p.prazo = iPrazo >= 0 ? dataDe(l[iPrazo]?.v) : '';
        lista.push(p);
        cont.novos += 1;
      }
      resumo.push({ aba: aba.nome, linhas: cont.linhas, resultado: `${cont.novos} processo(s)` });
      continue;
    }

    if (aba.chave === 'esp') {
      const h = cabecalho(m, /^cod/i);
      const rotulo = h >= 0 ? S(m[h]?.[4]?.v) : '';
      for (const l of h >= 0 ? m.slice(h + 1) : []) {
        const nomeL = S(l?.[1]?.v);
        if (!nomeL) continue;
        cont.linhas += 1;
        const textos = l.slice(3).map((c) => S(c?.v)).filter(Boolean);
        const autos = autosDe(textos[0]);
        const status = [...textos].reverse().find((t) => !autosDe(t)) ?? '';
        const cod = codDe(l[0]?.v);
        let p = achar(nomeL, cod, autos);
        if (p) { cont.completa += 1; p.autos ||= autos; p.status ||= status; p.abas.push(aba.nome); }
        else {
          p = novo(nomeL, aba.nome);
          Object.assign(p, segmento(l[2]?.v), { codcli: cod, autos, status, faseChave: etapaDe(status) || 'suspenso' });
          lista.push(p);
          cont.novos += 1;
        }
        if (status) p.andamentos.push({ data: '', autor: '', periodo: rotulo, texto: status });
      }
    }

    if (aba.chave === 'ext') {
      const h = cabecalho(m, /^cliente/i);
      for (const l of h >= 0 ? m.slice(h + 1) : []) {
        const bruto = S(l?.[0]?.v);
        if (!bruto) continue;
        cont.linhas += 1;
        const [, cod = '', nomeL = bruto] = /^(\d+)\s*-?\s*(.*)$/.exec(bruto) ?? [];
        let contato = S(l[2]?.v);
        let resp = S(l[3]?.v);
        if (!resp && /^quitad/i.test(contato)) { resp = contato; contato = ''; }
        const texto = `Notificação extrajudicial · resposta: ${resp || 'sem registro'}`;
        let p = achar(nomeL, cod, '');
        if (p) {
          cont.completa += 1;
          if (!p.valor) p.valor = valorDe(l[1]?.v);
          p.andamentos.unshift({ data: '', autor: '', periodo: 'Extrajudicial', texto });
          p.abas.push(aba.nome);
        } else if (S(nomeL)) {
          p = novo(S(nomeL), aba.nome);
          const fase = /quitad/i.test(resp) ? 'encerrado' : /^judici/i.test(resp) ? 'peticao' : 'recebido';
          const status = /quitad/i.test(resp) ? 'Quitado após notificação extrajudicial' : resp || 'Notificação extrajudicial enviada';
          Object.assign(p, { codcli: codDe(cod), valor: valorDe(l[1]?.v), faseChave: fase, status, motivo: motivoDe(fase, status) });
          p.andamentos.push({ data: '', autor: '', periodo: 'Extrajudicial', texto });
          lista.push(p);
          cont.novos += 1;
        } else cont.ignoradas += 1;
      }
    }

    if (aba.chave === 'proc') {
      const h = cabecalho(m, /^nome/i);
      for (const l of h >= 0 ? m.slice(h + 1) : []) {
        const nomeL = S(l?.[0]?.v);
        if (!nomeL) continue;
        cont.linhas += 1;
        const sit = S(l[5]?.v);
        const autos = autosDe(sit);
        const subst = /substabelec/i.test(S(l[6]?.v)) ? 1 : 0;
        let p = achar(nomeL, '', autos);
        if (p) {
          cont.completa += 1;
          if (!p.uf) p.uf = ufDaFilial(l[3]?.v);
          if (subst) p.substabelecer = 1;
          if (autos && p.autos && quinze(autos) !== quinze(p.autos)) {
            p.divergencia = `Nº dos autos diferente entre as abas: ${autos} (Processos) × ${p.autos} (${p.abas[0]}).`;
          } else if (autos && !p.autos) p.autos = autos;
          p.abas.push(aba.nome);
        } else {
          p = novo(nomeL, aba.nome);
          const preju = /preju/i.test(sit);
          const fase = autos ? 'defesa' : preju ? 'encerrado' : /verific/i.test(sit) ? 'recebido' : /acompanhar/i.test(sit) ? 'defesa'
            : etapaDe(sit) || 'peticao';
          const status = autos ? 'Sem andamento registrado na aba de acompanhamento' : preju ? 'Baixado como prejuízo'
            : /novo/i.test(sit) ? 'Novo caso a ajuizar' : sit;
          Object.assign(p, segmento(l[4]?.v), { valor: valorDe(l[2]?.v), uf: ufDaFilial(l[3]?.v), autos, substabelecer: subst, faseChave: fase, status,
            motivo: preju ? 'BAIXA_PERDA' : motivoDe(fase, status) });
          lista.push(p);
          cont.novos += 1;
        }
      }
      resumo.push({ aba: aba.nome, linhas: cont.linhas, resultado: `${cont.novos} novo(s) · completa ${cont.completa}` });
      continue;
    }

    if (aba.chave === 'acordo') {
      const legenda = { pago: '38761D', pendente: 'FF6D01' };
      for (const c of m[0] ?? []) {
        const cor = String(c?.cor ?? '').toUpperCase().replace(/^#|^FF(?=[0-9A-F]{6}$)/, '');
        if (/quitad/i.test(S(c?.v)) && cor) legenda.pago = cor;
        if (/pendent/i.test(S(c?.v)) && cor) legenda.pendente = cor;
      }
      let cab: string[] | null = null;
      for (const l of m) {
        const a = S(l?.[0]?.v);
        if (/^cliente/i.test(a)) { cab = l.map((c) => S(c?.v)); continue; }
        if (!cab || !a || /^legenda/i.test(a)) continue;
        cont.linhas += 1;
        const situacaoTexto = S(l[3]?.v);
        let n = 0;
        const parcelas: Parcela[] = [];
        for (let c = 4; c < l.length; c += 1) {
          const cel = l[c];
          if (S(cel?.v) === '') continue;
          const numero = /entrada/i.test(cab[c] ?? '') ? 0 : (n += 1);
          const texto = S(cel?.v);
          const vencimento = dataDe(cel?.v);
          const valor = typeof cel?.v === 'number' && !vencimento ? valorDe(cel.v) : valorDe(texto.replace(/^\s*\d{1,2}\/\d{1,2}\/\d{4}/, ''));
          parcelas.push({ numero, valor, vencimento, situacao: situacaoPorCor(cel?.cor, legenda) });
        }
        const valor = valorDe(l[1]?.v);
        const acordo: AcordoLido = {
          valor, entrada: parcelas.find((x) => x.numero === 0)?.valor ?? 0, nParcelas: parcelas.filter((x) => x.numero > 0).length,
          honorarios: valorDe(l[2]?.v), situacaoTexto, parcelas,
        };
        let p = achar(a, '', '');
        if (p) { cont.completa += 1; p.abas.push(aba.nome); }
        else { p = novo(a, aba.nome); Object.assign(p, { valor, faseChave: 'acordo', status: 'Acordo judicial' }); lista.push(p); cont.novos += 1; }
        p.acordo = acordo;
        const emAberto = parcelas.some((x) => x.situacao !== 'PAGA');
        if (emAberto && p.faseChave !== 'suspenso' && p.faseChave !== 'encerrado') p.faseChave = 'acordo';
        if (!emAberto && parcelas.length) { p.faseChave = 'encerrado'; p.motivo = 'OUTRO'; }
        cont.acordos += 1;
        cont.parcelas += parcelas.length;
      }
      resumo.push({ aba: aba.nome, linhas: cont.linhas, resultado: `${cont.acordos} acordo(s), ${cont.parcelas} parcela(s)` });
      continue;
    }

    resumo.push({ aba: aba.nome, linhas: cont.linhas, resultado: `${cont.novos} novo(s) · completa ${cont.completa}${cont.ignoradas ? ` · ${cont.ignoradas} ignorada(s)` : ''}` });
  }

  // Mesmo nº dos autos em dois processos (E §2.7): aviso nos dois.
  for (const p of lista) {
    const iguais = lista.filter((x) => x !== p && p.autos && x.autos && quinze(x.autos) === quinze(p.autos));
    if (iguais.length) p.divergencia ||= `Mesmo nº dos autos de ${iguais.map((x) => x.nomeDevedor).join(', ')}: confira qual é o correto.`;
  }
  for (const p of lista) {
    p.motivo = p.motivo || motivoDe(p.faseChave, p.status);
    p.andamentos = p.andamentos.slice(-20);
    p.chave = chaveDe(p);
  }
  return { processos: lista, abas: resumo };
}

/** O que vai ao servidor: o processo interpretado sem os campos só da tela. */
export function paraServidor(p: ProcessoInterpretado, clienteId = 0) {
  const { abas: _abas, prazo: _prazo, ...resto } = p;
  void _abas; void _prazo;
  return { ...resto, clienteId };
}
