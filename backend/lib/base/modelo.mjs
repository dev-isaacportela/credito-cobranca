// Modelos de mensagem (01 §13, RN-022, RN-023). Puras: o mesmo `renderizar` serve a prévia
// (`ccBaseModeloPrever`) e o envio (`ccEmailEnviar`). Entram nas SFs por `FONTE`.

export const CAMPOS_COMUNS = [
  'CLIENTE', 'RAZAO_SOCIAL', 'CNPJ', 'CODIGO_CLIENTE', 'VALOR_VENCIDO', 'DIAS_ATRASO', 'VENCIMENTO_MAIS_ANTIGO',
  'VALOR_A_VENCER', 'PROXIMO_VENCIMENTO', 'VALOR_PROXIMO_VENCIMENTO', 'DATA_HOJE', 'AGENTE', 'TELEFONE_CONTATO',
  'EMAIL_CONTATO', 'ASSINATURA',
];

/** Campos `[CAMPO]` do texto, na ordem em que aparecem, sem repetir. */
export function camposDoTexto(texto) {
  const vistos = [];
  for (const m of String(texto ?? '').matchAll(/\[([A-Z][A-Z0-9_]*)\]/g)) if (!vistos.includes(m[1])) vistos.push(m[1]);
  return vistos;
}

/** Campos do texto que não são comuns nem extras declarados no modelo (`extras` = 'A,B' ou lista). */
export function camposDesconhecidos(texto, extras) {
  const declarados = (Array.isArray(extras) ? extras : String(extras ?? '').split(',')).map((c) => String(c).trim().replace(/^\[|\]$/g, ''));
  return camposDoTexto(texto).filter((c) => !CAMPOS_COMUNS.includes(c) && !declarados.includes(c));
}

/** 1500 → 'R$ 1.500,00'. */
export function formatarDinheiro(valor) {
  const n = Math.round(Number(valor || 0) * 100) / 100;
  const [inteiro, centavos] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

/** '2026-11-07' → '07/11/2026'; vazio → ''. */
export function formatarData(iso) {
  const t = String(iso ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}` : '';
}

/** CNPJ (14 dígitos) ou CPF (11) formatado; outro tamanho volta como veio. */
export function formatarDocumento(doc) {
  const d = String(doc ?? '').replace(/\D/g, '');
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return d;
}

/**
 * Valores dos campos comuns. `cliente` (CC_CLIENTE), `posicao` (CC_POSICAO_CLIENTE ou a da carteira),
 * `contato` (destinatário, pode faltar), `agente` (nome), `com` ({ 'com.telefone', 'com.email',
 * 'com.assinatura' } da carteira do cliente), `hoje`. Valor ausente fica `null` (vira "faltando").
 */
export function valoresComuns({ cliente, posicao, contato, agente, com, hoje }) {
  const c = cliente || {};
  const p = posicao || {};
  const data = (v) => (v ? formatarData(v) : null);
  const dinheiro = (v) => (v === null || v === undefined ? null : formatarDinheiro(v));
  return {
    CLIENTE: (contato && contato.NOME) || c.NOME || null,
    RAZAO_SOCIAL: c.NOME || null,
    CNPJ: c.DOCUMENTO ? formatarDocumento(c.DOCUMENTO) : null,
    CODIGO_CLIENTE: c.CODCLI === null || c.CODCLI === undefined ? null : String(c.CODCLI),
    VALOR_VENCIDO: dinheiro(p.VENCIDO),
    DIAS_ATRASO: p.DIAS_ATRASO === null || p.DIAS_ATRASO === undefined ? null : String(p.DIAS_ATRASO),
    VENCIMENTO_MAIS_ANTIGO: data(p.VENC_MAIS_ANTIGO),
    VALOR_A_VENCER: dinheiro(p.A_VENCER),
    PROXIMO_VENCIMENTO: data(p.PROX_VENC),
    VALOR_PROXIMO_VENCIMENTO: p.PROX_VENC ? dinheiro(p.PROX_VENC_VALOR) : null,
    DATA_HOJE: data(hoje),
    AGENTE: agente || null,
    TELEFONE_CONTATO: (com || {})['com.telefone'] || null,
    EMAIL_CONTATO: (com || {})['com.email'] || null,
    ASSINATURA: (com || {})['com.assinatura'] || null,
  };
}

/** Troca `[CAMPO]` pelos valores; campo sem valor fica no texto e entra em `faltando`. */
export function renderizar({ assunto, corpo }, valores) {
  const faltando = [];
  const trocar = (texto) => String(texto ?? '').replace(/\[([A-Z][A-Z0-9_]*)\]/g, (marca, campo) => {
    const v = (valores || {})[campo];
    if (v === null || v === undefined || String(v).trim() === '') {
      if (!faltando.includes(campo)) faltando.push(campo);
      return marca;
    }
    return String(v);
  });
  return { assunto: trocar(assunto), corpo: trocar(corpo), faltando };
}

export const FONTE = `const CAMPOS_COMUNS = ${JSON.stringify(CAMPOS_COMUNS)};
` + [camposDoTexto, camposDesconhecidos, formatarDinheiro, formatarData, formatarDocumento, valoresComuns, renderizar]
  .map(String).join('\n');
