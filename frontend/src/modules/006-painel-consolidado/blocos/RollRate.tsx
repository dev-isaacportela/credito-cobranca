/**
 * painel-roll-rate B — Barras de destino (T-054): uma barra de 100% por faixa no fechamento anterior, repartida em
 * pagou / melhorou / manteve / piorou (cor de série, com legenda), e a tabela em reais logo abaixo. ccPainelRollRate;
 * a matriz vira destinos em `destinosRollRate()` (testada). Sem foto anterior, sem gráfico (§9.7).
 */
import {
  Alert, Bar, BarChart, CartesianGrid, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  corDeSerie, Dash, Esqueleto, GradeKpi, Grafico, Kpi, Nota, PainelGrafico, Panel, PanelHeader, Secao, Table, Td,
  Th, Tr, TrTotal, XAxis, YAxis,
} from '@/components/page';
import { fmtDataHora } from '@/lib/formato';
import { moedaCurta, moedaInteira, pct, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { destinosRollRate } from '@/lib/painel-consolidado/rollRate';
import { mesBarra, somarMes } from '@/lib/painel-consolidado/visao';
import { chaveDe, lerRollRate, useCarga, type PropsBloco } from '../dados';
import { AvisoDoBloco } from '../pecas';

// Identidade dos quatro destinos, na ordem do contrato (§12.2); "manteve" é o neutro.
const CONFIG = {
  pagou: { label: 'Pagou', color: corDeSerie(2) },
  melhorou: { label: 'Melhorou', color: corDeSerie(0) },
  manteve: { label: 'Manteve', color: 'var(--ink-muted)' },
  piorou: { label: 'Piorou', color: corDeSerie(1) },
};

export function RollRate({ f }: PropsBloco) {
  const c = useCarga(chaveDe('rollrate', f), () => lerRollRate(f));
  const anterior = somarMes(f.mes, -1);
  if (c.carregando) return <Esqueleto />;
  const cabecalho = { titulo: 'Roll rate', hint: `Para onde foi, em ${mesBarra(f.mes)}, o saldo que estava em cada faixa de atraso no fechamento de ${mesBarra(anterior)}.` };
  if (c.erro) return <Secao {...cabecalho}><Alert tone="error">{c.erro}</Alert></Secao>;
  const matriz = c.dados || [];
  if (!matriz.length) {
    return (
      <Secao {...cabecalho}>
        <AvisoDoBloco estado={{ tipo: 'SEM_DADO', texto: `Falta a foto de ${mesBarra(anterior)} no seu recorte.` }} hint="O roll rate compara a foto do fechamento anterior com o mês escolhido." />
      </Secao>
    );
  }
  const { faixas, total } = destinosRollRate(matriz);
  const baseEm = matriz.find((l) => l.BASE_EM)?.BASE_EM;
  const maior = faixas.filter((x) => x.taxa !== null).sort((a, b) => Number(b.taxa) - Number(a.taxa))[0];
  const dados = faixas.filter((x) => x.saldo > 0).map((x) => ({ rotulo: x.rotulo, pagou: x.pagou, melhorou: x.melhorou, manteve: x.manteve, piorou: x.piorou }));
  const celula = (v: number) => (v > 0 ? moedaInteira(v) : <Dash />);

  return (
    <Secao {...cabecalho}>
      <GradeKpi>
        <Kpi rotulo={`Saldo no fechamento de ${mesBarra(anterior)}`} valor={moedaCurta(total.saldo)} hint="clientes de a vencer até 91 a 180 dias" />
        <Kpi rotulo="Pagou" valor={moedaCurta(total.pagou)} hint={`${rotuloPct(pct(total.pagou, total.saldo))} da base · era vencido e ficou sem vencido`} />
        <Kpi rotulo="Piorou" valor={moedaCurta(total.piorou)} hint={`${rotuloPct(pct(total.piorou, total.saldo))} da base · faixa maior ou baixa como perda`} />
        <Kpi rotulo="Maior taxa de rolagem" valor={maior ? rotuloPct(maior.taxa) : <Dash />} hint={maior ? `faixa ${maior.rotulo.toLowerCase()}` : undefined} />
      </GradeKpi>
      <PainelGrafico
        titulo="Destino do saldo de cada faixa"
        hint={`100% = saldo da faixa em ${mesBarra(anterior)}${baseEm ? ` · foto tirada em ${fmtDataHora(String(baseEm))}` : ''} · os números estão na tabela abaixo`}
        largura="total"
      >
        <Grafico config={CONFIG}>
          <BarChart data={dados} layout="vertical" stackOffset="expand" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
            <YAxis type="category" dataKey="rotulo" width={104} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {(Object.keys(CONFIG) as (keyof typeof CONFIG)[]).map((k) => <Bar key={k} dataKey={k} stackId="d" fill={`var(--color-${k})`} />)}
          </BarChart>
        </Grafico>
      </PainelGrafico>
      <Panel>
        <PanelHeader title={`Roll rate de ${mesBarra(anterior)} para ${mesBarra(f.mes)}`} hint="Os mesmos números do gráfico, em reais" />
        <Table>
          <thead>
            <tr>
              <Th>Faixa em {mesBarra(anterior)}</Th><Th numeric>Saldo</Th><Th numeric>Pagou</Th><Th numeric>Melhorou</Th>
              <Th numeric>Manteve</Th><Th numeric>Piorou</Th><Th numeric>Taxa de rolagem</Th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((x) => (
              <Tr key={x.faixa}>
                <Td>{x.rotulo}</Td><Td numeric>{celula(x.saldo)}</Td><Td numeric>{celula(x.pagou)}</Td><Td numeric>{celula(x.melhorou)}</Td>
                <Td numeric>{celula(x.manteve)}</Td><Td numeric>{celula(x.piorou)}</Td><Td numeric>{x.taxa === null ? <Dash /> : rotuloPct(x.taxa)}</Td>
              </Tr>
            ))}
            <TrTotal>
              <Td>Total</Td><Td numeric>{moedaInteira(total.saldo)}</Td><Td numeric>{moedaInteira(total.pagou)}</Td><Td numeric>{moedaInteira(total.melhorou)}</Td>
              <Td numeric>{moedaInteira(total.manteve)}</Td><Td numeric>{moedaInteira(total.piorou)}</Td><Td numeric>{rotuloPct(total.taxa)}</Td>
            </TrTotal>
          </tbody>
        </Table>
      </Panel>
      <Nota>
        Pagou: era vencido e ficou sem vencido. Melhorou: foi para uma faixa menor, ainda vencido. Manteve: mesma faixa (a vencer que continua
        em dia). Piorou: foi para uma faixa maior ou teve baixa como perda. Taxa de rolagem = saldo que piorou ÷ saldo da faixa.
      </Nota>
    </Secao>
  );
}
