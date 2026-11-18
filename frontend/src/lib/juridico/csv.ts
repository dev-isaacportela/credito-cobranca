// Exportação da lista de processos (RF-019): 16 colunas na ordem do requisito, `;`, BOM UTF-8 (o Excel abre com
// acento), vírgula decimal sem milhar e aspas no campo que tem `;`, aspas ou quebra de linha.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export const COLUNAS_CSV = ['Cliente', 'Código', 'Carteira', 'Linha', 'Filial', 'Nº dos autos', 'Tribunal', 'Valor', 'Etapa', 'Situação atual',
  'Prazo', 'Responsável', 'Dossiê', 'Acordo', 'Parcelas pagas', 'A receber do acordo'];

const CARTEIRA: Record<string, string> = { PRIVADA: 'Privada', ESTETICA: 'Estética', PUBLICA: 'Pública' };

const decimal = (v: unknown) => (Number(v) || 0).toFixed(2).replace('.', ',');
const data = (iso: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const campo = (v: unknown) => {
  const t = String(v ?? '');
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Uma linha de `ccJurProcessoListar` → os 16 campos. */
export function camposDoProcesso(p: Linha): string[] {
  const temAcordo = Number(p.ACORDO_VALOR) > 0;
  return [
    p.NOME_DEVEDOR, p.CODCLI ?? '', CARTEIRA[p.CARTEIRA] ?? p.CARTEIRA ?? '', p.LINHA === 'GALDERMA' ? 'Galderma' : 'Demais', p.FILIAL ?? '',
    p.AUTOS ?? '', p.TRIBUNAL ?? '', decimal(p.VALOR), p.FASE_NOME ?? '', p.STATUS ?? '', data(p.PRAZO), p.RESPONSAVEL_NOME ?? '',
    Number(p.DOSSIE_TOTAL) > 0 ? `${Number(p.DOSSIE_OK)}/${Number(p.DOSSIE_TOTAL)}` : '',
    temAcordo ? decimal(p.ACORDO_VALOR) : '', temAcordo ? `${Number(p.PARCELAS_PAGAS)}/${Number(p.PARCELAS_TOTAL)}` : '',
    temAcordo ? decimal(p.ACORDO_A_RECEBER) : '',
  ].map((v) => String(v ?? ''));
}

/** O arquivo inteiro, com BOM e CRLF. */
export function montarCsv(linhas: Linha[]): string {
  return `\uFEFF${[COLUNAS_CSV, ...linhas.map(camposDoProcesso)].map((l) => l.map(campo).join(';')).join('\r\n')}\r\n`;
}
