// Semelhança de nomes (E §2.4), cópia da do servidor (backend/lib/juridico/carga.mjs, D-09): a tela usa para fundir
// o mesmo processo entre abas da planilha; o servidor, para sugerir cliente. Os dois testes usam os mesmos casos.

const PARADAS = ['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'LTDA', 'EIRELI', 'ME', 'EPP', 'SA', 'S', 'A', 'EM', 'LTD', 'CIA', 'O'];

const semAcento = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Maiúsculas, sem acento, só [A-Z0-9 ] e espaços simples. */
export function normalizarNome(s: unknown): string {
  return semAcento(s).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Palavras do nome: sem parênteses, sem código inicial, sem stopwords nem números. */
export function tokensDoNome(nome: unknown): string[] {
  const t = semAcento(nome).toUpperCase().replace(/\([^)]*\)/g, ' ').replace(/^\s*\d+\s*-?\s*/, '').replace(/[^A-Z0-9 ]+/g, ' ');
  return t.split(/\s+/).filter((w) => w && !PARADAS.includes(w) && !/^\d+$/.test(w));
}

/** No máximo um erro de digitação (troca, transposição, inserção). */
export function quaseIgual(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a.length === b.length) {
    const dif: number[] = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) dif.push(i);
    if (dif.length === 1) return true;
    return dif.length === 2 && dif[1] === dif[0] + 1 && a[dif[0]] === b[dif[1]] && a[dif[1]] === b[dif[0]];
  }
  if (Math.abs(a.length - b.length) !== 1) return false;
  const [curta, longa] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < longa.length; i += 1) if (longa.slice(0, i) + longa.slice(i + 1) === curta) return true;
  return false;
}

/** Em [0, 1]: a menor lista contida na maior = 1; senão acertos ÷ palavras distintas. */
export function semelhanca(a: unknown, b: unknown): number {
  const A = tokensDoNome(a);
  const B = tokensDoNome(b);
  if (!A.length || !B.length) return 0;
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  const hit = s.filter((w) => l.some((x) => quaseIgual(x, w))).length;
  if (s.length >= 2 && hit === s.length) return 1;
  return hit / new Set([...A, ...B]).size;
}
