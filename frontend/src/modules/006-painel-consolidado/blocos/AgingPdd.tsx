/**
 * painel-aging-pdd B — Mapa de calor (T-053): parte da carteira de cada recorte (total, carteira, BU) em cada
 * faixa de atraso, pela rampa sequencial (magnitude), com o valor em cada célula e a visão de tabela; PDD por
 * faixa em tabela e barras. Só ccPainelPosicao (a mesma resposta do cabeçalho).
 */
import {
  Alert, Bar, BarChart, CartesianGrid, ChartTooltip, ChartTooltipContent, Dash, Delta, Esqueleto, Grade,
  GradeKpi, Grafico, GraficoOuTabela, Kpi, LabelList, Legenda, MapaDeCalor, Nota, Panel, PanelHeader, RowMeta,
  RowTitle, Secao, Table, Td, Th, Tr, TrGrupo, TrTotal, XAxis, YAxis,
} from '@/components/page';
import { deltaMoeda, moedaCurta, moedaInteira, pct, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { FAIXAS } from '@/lib/painel-consolidado/rollRate';
import { estadoDoBloco } from '@/lib/painel-consolidado/visao';
import { chaveDe, lerPosicao, useCarga, type Linha, type PropsBloco } from '../dados';
import { AvisoDoBloco } from '../pecas';

const VENCIDAS = FAIXAS.slice(1);
const CURTAS = ['1 a 30', '31 a 60', '61 a 90', '91 a 180', 'Acima de 180'];

interface Recorte {
  rotulo: string;
  total: number;
  aVencer: number;
  vencido: number;
  vencido90: number;
  pdd: number;
  clientesAtraso: number;
  /** Saldo das 5 faixas vencidas. */
  faixas: number[];
}

const recorteDe = (l: Linha, rotulo: string, faixasComAVencer: boolean): Recorte => {
  const fx = ((l.faixas || []) as Linha[]).map((x) => Number(x.saldo) || 0);
  return {
    rotulo, total: Number(l.total) || 0, aVencer: Number(l.aVencer) || 0, vencido: Number(l.vencido) || 0, vencido90: Number(l.vencido90) || 0,
    pdd: Number(l.pdd) || 0, clientesAtraso: Number(l.clientesAtraso) || 0, faixas: faixasComAVencer ? fx.slice(1) : fx,
  };
};

export function AgingPdd({ f }: PropsBloco) {
  const c = useCarga(chaveDe('aging', f), () => lerPosicao(f));
  if (c.carregando) return <Esqueleto altura="alta" />;
  if (c.erro || !c.dados) return <Alert tone="error">{c.erro}</Alert>;
  const p = c.dados;
  const metas = (p.metas || {}) as Linha;
  const estado = estadoDoBloco({ origem: String(p.origem), mes: f.mes, vazio: Number(p.clientes) === 0 && p.origem !== 'MANUAL' });
  const ant = p.anterior as Linha | null;
  const dv = deltaMoeda(ant ? Number(p.vencido) - Number(ant.vencido) : null);
  const semValor = estado !== null;

  const total = recorteDe(p, 'Total', true);
  const carteiras = ((p.porCarteira || []) as Linha[]).map((l) => recorteDe(l, String(l.rotulo), false));
  const bus = ((p.porBu || []) as Linha[]).filter((l) => Number(l.total) > 0).map((l) => recorteDe(l, String(l.rotulo), false));
  const todos = [total, ...carteiras, ...bus];
  const maximo = Math.max(0, ...todos.flatMap((r) => r.faixas.map((s) => pct(s, r.total) ?? 0)));
  const linhaMapa = (r: Recorte) => ({
    rotulo: r.rotulo,
    celulas: r.faixas.map((s) => ({ valor: r.total > 0 ? pct(s, r.total) : null, texto: rotuloPct(pct(s, r.total)), sub: moedaCurta(s) })),
    extras: [moedaCurta(r.vencido), rotuloPct(pct(r.vencido, r.total)), moedaCurta(r.vencido90), moedaCurta(r.pdd)],
  });

  const pddFaixas = ((p.faixas || []) as Linha[]).map((x, i) => ({ rotulo: FAIXAS[i], saldo: Number(x.saldo) || 0, pdd: Number(x.pdd) || 0 }));
  const pddTotal = Number(p.pdd) || 0;
  const pddAcima90 = pddFaixas.slice(4).reduce((s, x) => s + x.pdd, 0);
  const participacao = pddFaixas.map((x) => ({ ...x, part: pct(x.pdd, pddTotal) }));
  const temFaixas = p.origem !== 'MANUAL' && !semValor;

  return (
    <Secao titulo="Aging e PDD" hint="Carteira por faixa de atraso, por carteira e por BU, com o vencido acima de 90 dias e a provisão para perdas de cada faixa.">
      <GradeKpi>
        <Kpi rotulo="Saldo vencido" valor={semValor ? <Dash /> : moedaCurta(Number(p.vencido))}
          delta={semValor || dv.valor === null ? undefined : <Delta valor={dv.valor} sufixo={dv.sufixo} inverso />}
          hint={semValor ? undefined : `${rotuloPct(p.inadPct as number | null)} da carteira · ${rotuloNum(Number(p.clientesAtraso))} clientes em atraso`} />
        <Kpi rotulo="Vencido acima de 90 dias" valor={semValor ? <Dash /> : moedaCurta(Number(p.vencido90))}
          hint={`${semValor ? '' : `${rotuloPct(p.vencido90Pct as number | null)} da carteira · `}meta até ${rotuloPct(Number(metas['meta.vencido90Pct']), 0)}`} />
        <Kpi rotulo="PDD" valor={semValor ? <Dash /> : moedaCurta(pddTotal)}
          hint={`${semValor ? '' : `${rotuloPct(pct(pddTotal, Number(p.total)))} da carteira · `}meta até ${rotuloPct(Number(metas['meta.pddPct']), 0)}`} />
        <Kpi rotulo="Cobertura do vencido" valor={semValor ? <Dash /> : rotuloPct(pct(pddTotal, Number(p.vencido)))} hint="PDD ÷ saldo vencido" />
      </GradeKpi>

      {estado ? <AvisoDoBloco estado={estado} /> : null}
      {p.origem === 'MANUAL' ? <Nota>Fechamento manual: só os totais da empresa, sem faixas, carteiras nem BUs.</Nota> : null}

      {temFaixas ? (
        <>
          <GraficoOuTabela
            titulo="Onde o vencido se acumula"
            hint="Parte da carteira de cada recorte em cada faixa de atraso; embaixo, o saldo"
            largura="total"
            alturaLivre
            tabela={(
              <Table>
                <thead>
                  <tr>
                    <Th>Recorte</Th><Th numeric>A vencer</Th>{CURTAS.map((x) => <Th key={x} numeric>{x}</Th>)}
                    <Th numeric>Total vencido</Th><Th numeric>Índice</Th><Th numeric>Acima de 90</Th><Th numeric>PDD</Th>
                  </tr>
                </thead>
                <tbody>
                  <LinhaRecorte r={total} />
                  {carteiras.length ? <TrGrupo colunas={11}>Por carteira</TrGrupo> : null}
                  {carteiras.map((r) => <LinhaRecorte key={r.rotulo} r={r} />)}
                  {bus.length ? <TrGrupo colunas={11}>Por BU · a BU é do item da nota: um cliente pode aparecer em mais de uma</TrGrupo> : null}
                  {bus.map((r) => <LinhaRecorte key={`bu${r.rotulo}`} r={r} />)}
                </tbody>
              </Table>
            )}
            grafico={(
              <>
                <MapaDeCalor
                  colunas={CURTAS}
                  extras={['Vencido', 'Índice', 'Acima de 90', 'PDD']}
                  maximo={maximo}
                  linhas={[
                    linhaMapa(total),
                    ...(carteiras.length ? [{ grupo: 'Por carteira' }, ...carteiras.map(linhaMapa)] : []),
                    ...(bus.length ? [{ grupo: 'Por BU' }, ...bus.map(linhaMapa)] : []),
                  ]}
                />
                <Legenda itens={[1, 2, 3, 4].map((i) => ({
                  rotulo: i === 1 ? `Até ${rotuloPct(maximo / 4, 1)} da carteira do recorte` : i === 4 ? `Acima de ${rotuloPct((maximo * 3) / 4, 1)}` : `${rotuloPct((maximo * (i - 1)) / 4, 1)} a ${rotuloPct((maximo * i) / 4, 1)}`,
                  cor: `var(--data-seq-${i})`,
                }))} />
              </>
            )}
          />
          <Grade>
            <Panel>
              <PanelHeader title="Provisão para perdas (PDD) por faixa" hint="Saldo da faixa × percentual em vigor" />
              <Table>
                <thead>
                  <tr><Th>Faixa</Th><Th numeric>Saldo</Th><Th numeric>% da faixa</Th><Th numeric>Provisão</Th><Th numeric>Participação no PDD</Th></tr>
                </thead>
                <tbody>
                  {participacao.map((x) => (
                    <Tr key={x.rotulo}>
                      <Td>{x.rotulo}</Td>
                      <Td numeric>{moedaInteira(x.saldo)}</Td>
                      <Td numeric>{x.saldo > 0 ? rotuloPct(pct(x.pdd, x.saldo), 1) : <Dash />}</Td>
                      <Td numeric>{moedaInteira(x.pdd)}</Td>
                      <Td numeric>{rotuloPct(x.part)}</Td>
                    </Tr>
                  ))}
                  <TrTotal>
                    <Td>Total</Td><Td numeric>{moedaInteira(Number(p.total))}</Td><Td numeric><Dash /></Td>
                    <Td numeric>{moedaInteira(pddTotal)}</Td><Td numeric>{pddTotal > 0 ? rotuloPct(100) : <Dash />}</Td>
                  </TrTotal>
                </tbody>
              </Table>
            </Panel>
            <GraficoOuTabela
              titulo="De onde vem o PDD"
              hint="Participação de cada faixa na provisão"
              grafico={(
                <Grafico config={{ part: { label: 'Participação no PDD', color: corBarra } }}>
                  <BarChart data={participacao} layout="vertical" margin={{ left: 8, right: 48 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="rotulo" width={112} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="part" fill="var(--color-part)" radius={4}>
                      <LabelList dataKey="part" position="right" fontSize={11} fill="var(--foreground)" formatter={(v: unknown) => rotuloPct(v as number | null)} />
                    </Bar>
                  </BarChart>
                </Grafico>
              )}
              tabela={(
                <Table>
                  <thead><tr><Th>Faixa</Th><Th numeric>Participação no PDD</Th></tr></thead>
                  <tbody>{participacao.map((x) => <Tr key={x.rotulo}><Td>{x.rotulo}</Td><Td numeric>{rotuloPct(x.part)}</Td></Tr>)}</tbody>
                </Table>
              )}
              rodape={<Nota>{rotuloPct(pct(pddAcima90, pddTotal))} da provisão está no vencido acima de 90 dias, que é {rotuloPct(p.vencido90Pct as number | null)} da carteira.</Nota>}
            />
          </Grade>
          <Nota>Percentuais de PDD em vigor na data da posição (parâmetros, com valor próprio por carteira quando houver); mês fechado usa os da data da foto.</Nota>
        </>
      ) : null}
    </Secao>
  );
}

const corBarra = 'var(--data-seq-3)';

function LinhaRecorte({ r }: { r: Recorte }) {
  const Linha = r.rotulo === 'Total' ? TrTotal : Tr;
  return (
    <Linha>
      <Td><RowTitle>{r.rotulo}</RowTitle><RowMeta>{rotuloNum(r.clientesAtraso)} clientes em atraso</RowMeta></Td>
      <Td numeric>{moedaInteira(r.aVencer)}</Td>
      {r.faixas.map((s, i) => <Td key={VENCIDAS[i]} numeric>{moedaInteira(s)}</Td>)}
      <Td numeric>{moedaInteira(r.vencido)}</Td>
      <Td numeric>{rotuloPct(pct(r.vencido, r.total))}</Td>
      <Td numeric>{moedaInteira(r.vencido90)}<RowMeta>{rotuloPct(pct(r.vencido90, r.vencido), 1)} do vencido</RowMeta></Td>
      <Td numeric>{moedaInteira(r.pdd)}<RowMeta>{rotuloPct(pct(r.pdd, r.total))} da carteira</RowMeta></Td>
    </Linha>
  );
}
