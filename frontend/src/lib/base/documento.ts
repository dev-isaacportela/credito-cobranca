// CPF/CNPJ e busca de cliente (RF-011, C-008). Regra pura: testada em tests/001-base.test.mjs.

/** Só os dígitos: é como o documento fica gravado (`CC_CLIENTE.DOCUMENTO`). */
export function normalizarDocumento(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '');
}

/** 14 dígitos = CNPJ (12.345.678/0001-90); 11 = CPF (123.456.789-01); outro tamanho volta como veio. */
export function formatarDocumento(valor: unknown): string {
  const d = normalizarDocumento(valor);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return String(valor ?? '');
}

/**
 * O que a tela manda em `busca` (casa com `CC_CLIENTE.BUSCA`): documento ou código digitado com
 * pontuação vira só dígitos; texto vira caixa alta sem acento e com um espaço entre as palavras.
 */
export function montarBusca(texto: unknown): string {
  const bruto = String(texto ?? '').trim();
  if (bruto && /^[\d.\-/\s]+$/.test(bruto)) return normalizarDocumento(bruto);
  return bruto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
}
