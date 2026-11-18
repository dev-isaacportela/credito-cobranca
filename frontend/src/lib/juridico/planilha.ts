// Leitura do .xlsx no navegador (D-06): SheetJS com `cellStyles` (a cor da célula, RN-028). O arquivo não sai do
// navegador. A dependência `xlsx` (SheetJS CE 0.20.3, tarball de cdn.sheetjs.com) é do integrador: ele instala e liga
// o carregador uma vez com `ligarLeitorXlsx(() => import('xlsx'))`; até lá a tela diz que a leitura não está instalada.

import type { Celula, Matrizes } from './carga.ts';

/** O pedaço do SheetJS que a leitura usa. */
export interface SheetJs {
  read: (dados: ArrayBuffer, opcoes: { type: 'array'; cellStyles: boolean }) => {
    SheetNames: string[];
    Sheets: Record<string, Record<string, { v?: unknown; s?: { fgColor?: { rgb?: string } } } | string>>;
  };
  utils: {
    decode_range: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell: (c: { r: number; c: number }) => string;
  };
}

let carregar: (() => Promise<SheetJs | { default: SheetJs }>) | null = null;

/** O integrador liga o SheetJS por `import()` (só a tela da carga baixa o pacote). */
export function ligarLeitorXlsx(f: () => Promise<SheetJs | { default: SheetJs }>) {
  carregar = f;
}

export const leitorInstalado = () => carregar !== null;

/** Abas do arquivo como matrizes `{ v, cor }`. */
export async function lerPlanilha(arquivo: File): Promise<Matrizes> {
  if (!carregar) throw new Error('A leitura de planilha (.xlsx) ainda não está instalada neste ambiente.');
  const mod = await carregar();
  const X = 'default' in mod && mod.default ? mod.default : (mod as SheetJs);
  const wb = X.read(await arquivo.arrayBuffer(), { type: 'array', cellStyles: true });
  const saida: Matrizes = {};
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome];
    const ref = typeof ws['!ref'] === 'string' ? ws['!ref'] : '';
    if (!ref) { saida[nome] = []; continue; }
    const r = X.utils.decode_range(ref);
    const linhas: Celula[][] = [];
    for (let i = r.s.r; i <= r.e.r; i += 1) {
      const linha: Celula[] = [];
      for (let j = 0; j <= r.e.c; j += 1) {
        const cel = ws[X.utils.encode_cell({ r: i, c: j })];
        const c = typeof cel === 'object' ? cel : undefined;
        linha.push({ v: (c?.v as Celula['v']) ?? '', cor: c?.s?.fgColor?.rgb ?? '' });
      }
      linhas.push(linha);
    }
    saida[nome] = linhas;
  }
  return saida;
}
