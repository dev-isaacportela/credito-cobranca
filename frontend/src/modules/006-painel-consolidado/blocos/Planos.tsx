/**
 * painel-planos C — Um cartão por plano (T-058): inadimplência contra a meta (medidor), o faturamento dos seis meses
 * até o mês do filtro e os números do plano; "Ver como tabela" logo abaixo. ccPainelPlanos e ccPainelPosicao (metas).
 */
import {
  Alert, Bar, BarChart, ChartTooltip, ChartTooltipContent, corDeSerie, CorpoPainel, Dash, Esqueleto, Forte,
  Grade, Linha as LinhaUi, Medidor, MiniGrafico, Nota, NumeroGrande, Panel, ParValor, Pilha, Recolhivel, RowMeta, RowTitle,
  Secao, Table, Td, Th, Tr, TrTotal, XAxis,
} from '@/components/page';
import { mesCurto, moedaCurta, moedaInteira, pct, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { janelaMeses, mesBarra } from '@/lib/painel-consolidado/visao';
import { assentado, chaveDe, lerPlanos, lerPosicao, primeiroErro, useCarga, type Linha, type PropsBloco } from '../dados';
import { AvisoDoBloco } from '../pecas';

const n = (v: unknown) => Number(v) || 0;
const FAT = [5, 4, 3, 2, 1, 0].map((i) => `FAT_M${i}`);

export function Planos({ f }: PropsBloco) {
  const c = useCarga(chaveDe('planos', f), async () => {
    const rs = await Promise.allSettled([lerPlanos(f), lerPosicao(f)]);
    const [planos, posicao] = rs.map(assentado) as [Linha[] | null, Linha | null];
    return { planos: planos || [], posicao, erro: primeiroErro(rs) };
  });
  const meses = janelaMeses(f.mes, 6);
  const cabecalho = { titulo: 'Planos de pagamento', hint: 'Faturamento e inadimplência de cada plano de pagamento: quem compra em prazo mais longo atrasa mais?' };
  if (c.carregando) return <Esqueleto />;
  if (c.erro || !c.dados) return <Secao {...cabecalho}><Alert tone="error">{c.erro}</Alert></Secao>;
  const { planos, posicao, erro } = c.dados;
  const meta = n(((posicao?.metas || {}) as Linha)['meta.inadPct']);
  const nomeDo = (p: Linha) => String(p.DESCRICAO || p.PLANO_COD || 'Sem plano');
  const media = (p: Linha) => FAT.reduce((s, k) => s + n(p[k]), 0) / 6;
  const soma = (k: string) => planos.reduce((s, p) => s + n(p[k]), 0);
  if (!planos.length) return <Secao {...cabecalho}><AvisoDoBloco estado={{ tipo: 'VAZIO', texto: 'Nenhum cliente no recorte.' }} /></Secao>;

  return (
    <Secao {...cabecalho}>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Grade colunas={3}>
        {planos.map((p) => {
          const inad = pct(n(p.VENCIDO), n(p.TOTAL));
          const fat = meses.map((mes, i) => ({ rotulo: mesCurto(mes), valor: n(p[FAT[i]]) }));
          return (
            <Panel key={String(p.PLANO_COD)}>
              <CorpoPainel>
                <LinhaUi entre><Forte>{nomeDo(p)}</Forte><Nota>prazo médio {rotuloNum(n(p.PRAZO_MEDIO))} dias · {rotuloNum(n(p.CLIENTES))} clientes</Nota></LinhaUi>
                <LinhaUi entre><span><NumeroGrande>{rotuloPct(inad)}</NumeroGrande> de inadimplência</span><Nota>meta até {rotuloPct(meta, 0)}</Nota></LinhaUi>
                <Medidor valor={inad} meta={{ max: meta }} rotulo={`Inadimplência ${rotuloPct(inad)}, meta até ${rotuloPct(meta, 0)}`} />
                <Nota>Faturado de {mesBarra(meses[0])} a {mesBarra(f.mes)}</Nota>
                <MiniGrafico config={{ valor: { label: 'Faturado', color: corDeSerie(0) } }}>
                  <BarChart data={fat} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="valor" fill="var(--color-valor)" radius={3} />
                  </BarChart>
                </MiniGrafico>
                <ParValor rotulo={`Faturado em ${mesBarra(f.mes)}`} valor={moedaCurta(n(p.FAT_M0))} />
                <ParValor rotulo="Média de 6 meses" valor={moedaCurta(media(p))} />
                <ParValor rotulo="Saldo vencido" valor={`${moedaCurta(n(p.VENCIDO))} · ${rotuloNum(n(p.CLIENTES_ATRASO))} em atraso`} />
                <ParValor rotulo="Vencido ÷ faturado no mês" valor={n(p.FAT_M0) ? rotuloPct(pct(n(p.VENCIDO), n(p.FAT_M0))) : <Dash />} />
              </CorpoPainel>
            </Panel>
          );
        })}
      </Grade>
      <Nota>Em cada cartão, as colunas são o faturado mês a mês{f.mes === f.corrente ? ` (${mesBarra(f.mes)} parcial)` : ''}; no medidor, a barra é a inadimplência do plano e o traço é a meta.</Nota>
      <Recolhivel moldura="painel" preguicoso titulo="Ver como tabela">
        <Pilha>
          <Table>
            <thead>
              <tr><Th>Plano de pagamento</Th><Th numeric>Clientes</Th><Th numeric>Faturado no mês</Th><Th numeric>Média de 6 meses</Th><Th numeric>Saldo vencido</Th><Th numeric>Inadimplência</Th><Th numeric>Vencido ÷ faturado</Th></tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <Tr key={String(p.PLANO_COD)}>
                  <Td><RowTitle>{nomeDo(p)}</RowTitle><RowMeta>prazo médio de {rotuloNum(n(p.PRAZO_MEDIO))} dias</RowMeta></Td>
                  <Td numeric>{rotuloNum(n(p.CLIENTES))}<RowMeta>{rotuloNum(n(p.CLIENTES_ATRASO))} em atraso</RowMeta></Td>
                  <Td numeric>{moedaInteira(n(p.FAT_M0))}</Td><Td numeric>{moedaInteira(media(p))}</Td><Td numeric>{moedaInteira(n(p.VENCIDO))}</Td>
                  <Td numeric>{rotuloPct(pct(n(p.VENCIDO), n(p.TOTAL)))}</Td><Td numeric>{n(p.FAT_M0) ? rotuloPct(pct(n(p.VENCIDO), n(p.FAT_M0))) : <Dash />}</Td>
                </Tr>
              ))}
              <TrTotal>
                <Td>Total</Td><Td numeric>{rotuloNum(soma('CLIENTES'))}</Td><Td numeric>{moedaInteira(soma('FAT_M0'))}</Td>
                <Td numeric>{moedaInteira(planos.reduce((s, p) => s + media(p), 0))}</Td><Td numeric>{moedaInteira(soma('VENCIDO'))}</Td>
                <Td numeric>{rotuloPct(pct(soma('VENCIDO'), soma('TOTAL')))}</Td><Td numeric>{soma('FAT_M0') ? rotuloPct(pct(soma('VENCIDO'), soma('FAT_M0'))) : <Dash />}</Td>
              </TrTotal>
            </tbody>
          </Table>
          <Table>
            <thead><tr><Th>Plano</Th>{meses.map((m) => <Th key={m} numeric>{mesCurto(m)}</Th>)}<Th numeric>Média</Th></tr></thead>
            <tbody>
              {planos.map((p) => (
                <Tr key={String(p.PLANO_COD)}>
                  <Td><RowTitle>{nomeDo(p)}</RowTitle></Td>
                  {FAT.map((k) => <Td key={k} numeric>{moedaInteira(n(p[k]))}</Td>)}
                  <Td numeric>{moedaInteira(media(p))}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Pilha>
      </Recolhivel>
    </Secao>
  );
}
