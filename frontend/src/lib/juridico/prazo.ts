// Prazo do processo na tela (RN-021): vencido ou em até `vermelho` dias em vermelho, até `amarelo` em amarelo, depois
// neutro. Os limiares são os parâmetros `jur.prazoVermelhoDias` / `jur.prazoAmareloDias`; os dias vêm do servidor
// (`DIAS_PRAZO`, relógio único), a tela só decide o tom e o texto.

export type TomPrazo = 'alert' | 'attention' | 'off';

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** Tom (o `tone` do `Status`) e texto do prazo; `null` = sem prazo. */
export function tomDoPrazo(diasAtePrazo: number | null | undefined, vermelho = 3, amarelo = 7): { tom: TomPrazo; texto: string } {
  if (diasAtePrazo === null || diasAtePrazo === undefined || !Number.isFinite(Number(diasAtePrazo))) return { tom: 'off', texto: '' };
  const d = Math.trunc(Number(diasAtePrazo));
  const texto = d === 0 ? 'Prazo hoje' : d > 0 ? `em ${dias(d)}` : `vencido há ${dias(-d)}`;
  const tom: TomPrazo = d <= vermelho ? 'alert' : d <= amarelo ? 'attention' : 'off';
  return { tom, texto };
}
