/**
 * painel-movimento B — Seis meses lado a lado (T-055): gerada × recuperado (mesma unidade, duas séries com legenda)
 * e o saldo vencido no fim de cada mês, mais um cartão por mês. ccPainelSerie (6 meses até o mês do filtro; a mesma
 * resposta serve a conversão da aba Cobrança) e ccPainelPosicao (metas, no cache).
 */
import {
  Alert, Bar, BarChart, CartesianGrid, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  corDeSerie, CorpoPainel, Dash, Esqueleto, Forte, Grade, GradeGraficos, Grafico, GraficoOuTabela, LabelList,
  Line, LineChart, Linha as LinhaUi, Nota, Panel, ParValor, Secao, Status, Table, Td, Th, Tr, XAxis, YAxis,
} from '@/components/page';
import { mesCurto, moedaCurta, moedaInteira, naMeta, pct, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { janelaMeses, mesBarra, somarMes } from '@/lib/painel-consolidado/visao';
import { assentado, chaveDe, lerPosicao, lerSerie6, primeiroErro, useCarga, type Linha, type PropsBloco } from '../dados';

const mil = (v: unknown) => (v === null || v === undefined ? '' : rotuloNum(Number(v) / 1000, 0));
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function Movimento({ f }: PropsBloco) {
  const c = useCarga(chaveDe('movimento', f), async () => {
    const rs = await Promise.allSettled([lerSerie6(f), lerPosicao(f)]);
    const [serie, posicao] = rs.map(assentado) as [Linha | null, Linha | null];
    return { serie, posicao, erro: primeiroErro(rs) };
  });
  if (c.carregando) return <Esqueleto />;
  if (c.erro || !c.dados) return <Alert tone="error">{c.erro}</Alert>;
  const { serie, posicao, erro } = c.dados;
  const metaRec = Number(((posicao?.metas || {}) as Linha)['meta.recuperacaoPct']);
  const porMes = new Map(((serie?.linhas || []) as Linha[]).map((l) => [String(l.MES), l]));
  const meses = janelaMeses(f.mes, 6);
  const dados = meses.map((mes) => {
    const l = porMes.get(mes);
    return {
      mes, rotulo: mesCurto(mes), gerada: num(l?.GERADA), recuperado: l && l.ORIGEM !== 'MANUAL' ? num(l.RECUPERADO) : null,
      inicial: num(l?.VENCIDO_INICIAL), vencido: num(l?.VENCIDO),
    };
  });
  const comBase = dados.some((d) => d.gerada !== null);
  const primeiro = meses[0];

  return (
    <Secao titulo="Movimento da inadimplência" hint={`Quanto de inadimplência nasceu, quanto foi recuperado e como o saldo vencido variou de ${mesBarra(primeiro)} a ${mesBarra(f.mes)}.`}>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <GradeGraficos>
        <GraficoOuTabela
          titulo="Gerada × recuperado"
          hint={`R$ mil · ${mesBarra(primeiro)} a ${mesBarra(f.mes)}`}
          semGrafico={comBase ? undefined : `Falta a foto de ${mesBarra(somarMes(primeiro, -1))} ou dos meses seguintes: sem fechamento anterior não há inadimplência gerada.`}
          grafico={(
            <Grafico config={{ gerada: { label: 'Inadimplência gerada', color: corDeSerie(1) }, recuperado: { label: 'Recuperado', color: corDeSerie(2) } }}>
              <BarChart data={dados} margin={{ top: 18, right: 8, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={mil} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="gerada" fill="var(--color-gerada)" radius={4}><LabelList dataKey="gerada" position="top" fontSize={10} fill="var(--foreground)" formatter={mil} /></Bar>
                <Bar dataKey="recuperado" fill="var(--color-recuperado)" radius={4}><LabelList dataKey="recuperado" position="top" fontSize={10} fill="var(--foreground)" formatter={mil} /></Bar>
              </BarChart>
            </Grafico>
          )}
          tabela={(
            <Table>
              <thead><tr><Th>Mês</Th><Th numeric>Gerada</Th><Th numeric>Recuperado</Th><Th numeric>Variação líquida</Th></tr></thead>
              <tbody>
                {dados.map((d) => (
                  <Tr key={d.mes}>
                    <Td>{mesBarra(d.mes)}</Td>
                    <Td numeric>{d.gerada === null ? <Dash /> : moedaInteira(d.gerada)}</Td>
                    <Td numeric>{d.recuperado === null ? <Dash /> : moedaInteira(d.recuperado)}</Td>
                    <Td numeric>{d.inicial === null || d.vencido === null ? <Dash /> : moedaInteira(d.vencido - d.inicial)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        />
        <GraficoOuTabela
          titulo="Saldo vencido no fim do mês"
          hint={`R$ mil · ${mesBarra(primeiro)} a ${mesBarra(f.mes)}`}
          semGrafico={dados.filter((d) => d.vencido !== null).length < 2 ? 'Menos de dois meses com foto ou posição: sem tendência para desenhar.' : undefined}
          grafico={(
            <Grafico config={{ vencido: { label: 'Saldo vencido', color: corDeSerie(0) } }}>
              <LineChart data={dados} margin={{ top: 18, right: 16, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={mil} domain={[0, 'auto']} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="vencido" stroke="var(--color-vencido)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}>
                  <LabelList dataKey="vencido" position="top" fontSize={10} fill="var(--foreground)" formatter={mil} />
                </Line>
              </LineChart>
            </Grafico>
          )}
          tabela={(
            <Table>
              <thead><tr><Th>Mês</Th><Th numeric>Vencido inicial</Th><Th numeric>Vencido final</Th></tr></thead>
              <tbody>
                {dados.map((d) => (
                  <Tr key={d.mes}>
                    <Td>{mesBarra(d.mes)}</Td>
                    <Td numeric>{d.inicial === null ? <Dash /> : moedaInteira(d.inicial)}</Td>
                    <Td numeric>{d.vencido === null ? <Dash /> : moedaInteira(d.vencido)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        />
      </GradeGraficos>

      <LinhaUi entre><Forte>Mês a mês</Forte><Nota>Do mais recente para o mais antigo</Nota></LinhaUi>
      <Grade colunas={3}>
        {[...meses].reverse().map((mes) => <CartaoMes key={mes} mes={mes} linha={porMes.get(mes) ?? null} corrente={f.corrente} metaRec={metaRec} />)}
      </Grade>
    </Secao>
  );
}

function CartaoMes({ mes, linha, corrente, metaRec }: { mes: string; linha: Linha | null; corrente: string; metaRec: number }) {
  const titulo = `${mesBarra(mes)}${mes === corrente ? ' · parcial' : ''}${linha?.ORIGEM === 'MANUAL' ? ' · fechamento manual' : ''}`;
  if (!linha) {
    return <Panel><CorpoPainel><Forte>{mesBarra(mes)}</Forte><Nota>Sem foto nem posição para o mês.</Nota></CorpoPainel></Panel>;
  }
  const ini = num(linha.VENCIDO_INICIAL);
  const ger = num(linha.GERADA);
  const rec = num(linha.RECUPERADO);
  const fim = num(linha.VENCIDO);
  const taxa = ger === null ? null : pct(rec, ger);
  const ok = naMeta(taxa, { min: metaRec });
  const ajustes = ini === null || ger === null || rec === null || fim === null ? null : ini + ger - rec - fim;
  const v = (x: number | null) => (x === null ? <Dash /> : moedaCurta(x));
  return (
    <Panel>
      <CorpoPainel>
        <LinhaUi entre>
          <Forte>{titulo}</Forte>
          {taxa === null ? <Status tone="off">sem base</Status> : <Status tone={ok ? 'live' : 'alert'}>{rotuloPct(taxa)} recuperado ÷ gerado</Status>}
        </LinhaUi>
        <ParValor rotulo={`Gerada${Number(linha.ESTIMADO) ? ' (estimada)' : ''}`} valor={v(ger)} />
        <ParValor rotulo="Recuperado" valor={v(rec)} />
        <ParValor rotulo="Baixas e ajustes" valor={v(ajustes)} />
        <ParValor rotulo="Variação líquida" valor={ini === null || fim === null ? <Dash /> : moedaCurta(fim - ini)} />
        <ParValor rotulo="Vencido no fim do mês" valor={v(fim)} />
        {linha.ENTRARAM === null ? null : (
          <Nota>{rotuloNum(Number(linha.ENTRARAM))} entraram em atraso · {rotuloNum(Number(linha.REGULARIZADOS))} regularizados · {rotuloNum(Number(linha.BAIXADOS))} baixados</Nota>
        )}
      </CorpoPainel>
    </Panel>
  );
}
