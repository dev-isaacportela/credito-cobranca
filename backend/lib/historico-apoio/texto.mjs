// Texto da 007: forma de busca (a mesma de CC_CLIENTE.NOME_BUSCA, RN-013) e link de fonte (RN-011). Puras;
// entram nas SFs JAVASCRIPT por `FONTE`.

import { normalizarTexto } from '../base/setor.mjs';

/** Sem acento, CAIXA ALTA, espaços colapsados (`BUSCA` de CC_FONTE_LINK e CC_MATERIAL). */
export const normalizar = normalizarTexto;

/** Link vazio (fonte "sem link") ou começando por http:// ou https:// (RN-011). */
export function linkValido(url) {
  const u = String(url ?? '').trim();
  return u === '' || /^https?:\/\/\S+$/i.test(u);
}

/** Data `AAAA-MM-DD` válida (ou vazia, quando `vazia` = true). */
export function dataValida(v, vazia = true) {
  const t = String(v ?? '').trim();
  if (t === '') return vazia;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(`${t}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

export const FONTE = [normalizarTexto, linkValido, dataValida].map(String).join('\n');
