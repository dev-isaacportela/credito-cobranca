/**
 * painel-credito A — Gráficos e quadros (T-059): decisões do mês e exposição por faixa de risco em dois gráficos,
 * quadros por carteira e por BU; sem mockup (PA-25): concentração de limites (o layout da concentração A, com
 * `base = LIMITE`) e o rodapé com PMR e prazo médio. ccPainelCredito e ccPainelConcentracao (LIMITE).
 * Decisões não têm BU (D-01, D-09): o filtro de BU não as altera.
 */
import { useNavigate } from 'react-router-dom';
import {
  Alert, Bar, BarChart, CartesianGrid, Cell, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  corDeSerie, CorpoPainel, Dash, Esqueleto, GradeGraficos, GradeKpi, Grafico, GraficoOuTabela, Kpi, LabelList,
  Legenda, Nota, Numeros, Panel, PanelHeader, RowMeta, RowTitle, Secao, Table, Td, TextLink, Th, Tr, TrTotal,
  XAxis, YAxis,
} from '@/components/page';
import { moedaCurta, moedaInteira, pct, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { mesBarra } from '@/lib/painel-consolidado/visao';
import { chaveDe, lerCredito, useCarga, type Linha, type PropsBloco } from '../dados';
import { Concentracao } from './Concentracao';

const n = (v: unknown) => Number(v) || 0;
const NOME = { PRIVADA: 'Privada', ESTETICA: 'Estética', PUBLICA: 'Pública' } as Record<string, string>;
const COR_GRUPO = { PRIVADO: corDeSerie(0), PUBLICO: corDeSerie(2), SEM: 'var(--ink-muted)' } as Record<string, string>;

export function Credito(props: PropsBloco) {
  const { f } = props;
  const navigate = useNavigate();
  const c = useCarga(chaveDe('credito', f), () => lerCredito(f));
  const cabecalho = { titulo: 'Crédito', hint: `O que foi decidido em ${mesBarra(f.mes)}, onde está a exposição por faixa de risco e o quadro de cada carteira e de cada BU.` };
  if (c.carregando) return <Esqueleto altura="alta" />;
  if (c.erro || !c.dados) return <Secao {...cabecalho}><Alert tone="error">{c.erro}</Alert></Secao>;
  const d = c.dados;
  const cart = (d.porCarteira || []) as Linha[];
  const s = (k: string) => cart.reduce((a, x) => a + n(x[k]), 0);
  const aprovadas = s('aprovadas');
  const recusadas = s('recusadas');
  const valorDecidido = s('valorAprovado') + s('valorRecusado');
  const emAnalise = (d.emAnalise || {}) as Linha;
  const rating = ((d.porRating || []) as Linha[]).map((r): Linha => ({ ...r, rotulo: r.grupo === 'SEM' ? 'Sem rating' : String(r.rating), saldo: n(r.saldo) }));
  const utilizado = n(d.utilizado);
  const porBu = (d.porBu || []) as Linha[];
  const vencidoBu = porBu.reduce((a, b) => a + n(b.vencido), 0);
  const avisoBu = f.buId >= 0 ? ' · o filtro de BU não se aplica às decisões' : '';

  return (
    <Secao {...cabecalho}>
      <GradeKpi>
        <Kpi rotulo="Deferido no mês" valor={rotuloNum(aprovadas)} hint={`${moedaCurta(s('valorAprovado'))} solicitados · ${moedaCurta(s('concedido'))} concedidos`} />
        <Kpi rotulo="Negado no mês" valor={rotuloNum(recusadas)} hint={moedaCurta(s('valorRecusado'))} />
        <Kpi rotulo="Em análise" valor={rotuloNum(n(emAnalise.qtd))} hint={`${moedaCurta(n(emAnalise.valor))} · ${rotuloNum(n(emAnalise.foraDoPrazo))} fora do prazo`} />
        <Kpi rotulo="% deferido" valor={valorDecidido ? rotuloPct(pct(s('valorAprovado'), valorDecidido)) : <Dash />}
          hint={`do valor decidido · aprovação de ${rotuloPct(pct(aprovadas, aprovadas + recusadas))} das solicitações`} />
      </GradeKpi>

      <GradeGraficos>
        <GraficoOuTabela
          titulo="Crédito analisado: deferido × negado"
          hint={`R$ mil · por carteira · ${mesBarra(f.mes)}${avisoBu}`}
          semGrafico={valorDecidido ? undefined : 'Nenhuma decisão no mês.'}
          grafico={(
            <Grafico config={{ valorAprovado: { label: 'Deferido', color: corDeSerie(0) }, valorRecusado: { label: 'Negado', color: corDeSerie(1) } }}>
              <BarChart data={cart.map((x) => ({ ...x, rotulo: NOME[String(x.carteira)] }))} margin={{ top: 18, right: 8, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => rotuloNum(v / 1000)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="valorAprovado" fill="var(--color-valorAprovado)" radius={4} />
                <Bar dataKey="valorRecusado" fill="var(--color-valorRecusado)" radius={4} />
              </BarChart>
            </Grafico>
          )}
          tabela={(
            <Table>
              <thead><tr><Th>Carteira</Th><Th numeric>Deferido</Th><Th numeric>Negado</Th><Th numeric>% deferido</Th></tr></thead>
              <tbody>
                {cart.map((x) => (
                  <Tr key={String(x.carteira)}>
                    <Td>{NOME[String(x.carteira)]}</Td>
                    <Td numeric>{n(x.aprovadas)} · {moedaInteira(n(x.valorAprovado))}</Td>
                    <Td numeric>{n(x.recusadas)} · {moedaInteira(n(x.valorRecusado))}</Td>
                    <Td numeric>{rotuloPct(pct(n(x.valorAprovado), n(x.valorAprovado) + n(x.valorRecusado)))}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        />
        <GraficoOuTabela
          titulo="Exposição por faixa de risco"
          hint={`saldo utilizado, R$ mil · soma ${moedaCurta(utilizado)} · rating atual`}
          semGrafico={rating.length ? undefined : 'Nenhum saldo no recorte.'}
          grafico={(
            <Grafico config={{ saldo: { label: 'Saldo utilizado', color: corDeSerie(0) } }}>
              <BarChart data={rating} margin={{ top: 18, right: 8, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} interval={0} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => rotuloNum(v / 1000)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="saldo" radius={4}>
                  {rating.map((r, i) => <Cell key={i} fill={COR_GRUPO[String(r.grupo)]} />)}
                  <LabelList dataKey="saldo" position="top" fontSize={10} fill="var(--foreground)" formatter={(v: unknown) => rotuloNum(Number(v) / 1000)} />
                </Bar>
              </BarChart>
            </Grafico>
          )}
          rodape={<Legenda itens={[
            { rotulo: 'Privada e Estética (AA a E)', cor: COR_GRUPO.PRIVADO },
            { rotulo: 'Pública (P1 a P4)', cor: COR_GRUPO.PUBLICO },
            { rotulo: 'Sem rating', cor: COR_GRUPO.SEM },
          ]} />}
          tabela={(
            <Table>
              <thead><tr><Th>Faixa</Th><Th numeric>Saldo utilizado</Th><Th numeric>% da exposição</Th></tr></thead>
              <tbody>
                {rating.map((r, i) => (
                  <Tr key={i}>
                    <Td><RowTitle>{r.rotulo}</RowTitle><RowMeta>{r.grupo === 'PUBLICO' ? 'escala P1 a P4' : r.grupo === 'PRIVADO' ? 'escala AA a E' : 'sem rating'} · {n(r.clientes)} clientes</RowMeta></Td>
                    <Td numeric>{moedaInteira(r.saldo)}</Td><Td numeric>{rotuloPct(pct(r.saldo, utilizado))}</Td>
                  </Tr>
                ))}
                <TrTotal><Td>Total</Td><Td numeric>{moedaInteira(utilizado)}</Td><Td numeric>{utilizado ? rotuloPct(100) : <Dash />}</Td></TrTotal>
              </tbody>
            </Table>
          )}
        />
      </GradeGraficos>

      <Panel>
        <PanelHeader title="Por carteira" hint={`A linha abre a análise de crédito da carteira${avisoBu}`} />
        <Table>
          <thead>
            <tr>
              <Th>Carteira</Th><Th numeric>Em análise</Th><Th numeric>Deferido</Th><Th numeric>Negado</Th><Th numeric>Aprovação</Th><Th numeric>Concedido</Th>
              <Th numeric>Exposição</Th><Th numeric>Saldo vencido</Th><Th numeric>Inadimplência</Th><Th numeric>Críticos</Th><Th numeric>Pedidos retidos</Th>
            </tr>
          </thead>
          <tbody>
            {cart.map((x) => (
              <Tr key={String(x.carteira)}>
                <Td>
                  <RowTitle>{NOME[String(x.carteira)]}</RowTitle>
                  <RowMeta><TextLink onClick={() => navigate(`/credito/${String(x.carteira).toLowerCase()}`)}>Abrir análise</TextLink></RowMeta>
                </Td>
                <Td numeric>{rotuloNum(n(x.emAnalise))}<RowMeta>{rotuloNum(n(x.foraDoPrazo))} fora do prazo</RowMeta></Td>
                <Td numeric>{rotuloNum(n(x.aprovadas))}<RowMeta>{moedaInteira(n(x.valorAprovado))}</RowMeta></Td>
                <Td numeric>{rotuloNum(n(x.recusadas))}<RowMeta>{moedaInteira(n(x.valorRecusado))}</RowMeta></Td>
                <Td numeric>{rotuloPct(pct(n(x.aprovadas), n(x.aprovadas) + n(x.recusadas)))}</Td>
                <Td numeric>{moedaInteira(n(x.concedido))}</Td>
                <Td numeric>{moedaInteira(n(x.utilizado))}</Td>
                <Td numeric>{moedaInteira(n(x.vencido))}</Td>
                <Td numeric>{rotuloPct(pct(n(x.vencido), n(x.utilizado)))}</Td>
                <Td numeric>{rotuloNum(n(x.criticos))}</Td>
                <Td numeric>{rotuloNum(n(x.pedidosRetidos))}</Td>
              </Tr>
            ))}
            {cart.length > 1 ? (
              <TrTotal>
                <Td>Total</Td><Td numeric>{rotuloNum(s('emAnalise'))}</Td><Td numeric>{rotuloNum(aprovadas)}</Td><Td numeric>{rotuloNum(recusadas)}</Td>
                <Td numeric>{rotuloPct(pct(aprovadas, aprovadas + recusadas))}</Td><Td numeric>{moedaInteira(s('concedido'))}</Td>
                <Td numeric>{moedaInteira(s('utilizado'))}</Td><Td numeric>{moedaInteira(s('vencido'))}</Td>
                <Td numeric>{rotuloPct(pct(s('vencido'), s('utilizado')))}</Td><Td numeric>{rotuloNum(s('criticos'))}</Td><Td numeric>{rotuloNum(s('pedidosRetidos'))}</Td>
              </TrTotal>
            ) : null}
          </tbody>
        </Table>
      </Panel>

      <Panel>
        <PanelHeader title="Por BU" hint="Exposição e inadimplência; decisões de crédito não têm BU (a solicitação é do cliente na carteira)" />
        {porBu.length ? (
          <Table>
            <thead><tr><Th>BU</Th><Th numeric>Clientes</Th><Th numeric>Exposição</Th><Th numeric>Saldo vencido</Th><Th numeric>Representatividade na inadimplência</Th><Th numeric>Inadimplência</Th><Th numeric>Críticos</Th></tr></thead>
            <tbody>
              {porBu.map((b) => (
                <Tr key={n(b.buId)}>
                  <Td><RowTitle>{b.nome}</RowTitle></Td><Td numeric>{rotuloNum(n(b.clientes))}</Td><Td numeric>{moedaInteira(n(b.utilizado))}</Td>
                  <Td numeric>{moedaInteira(n(b.vencido))}</Td><Td numeric>{rotuloPct(pct(n(b.vencido), vencidoBu))}</Td>
                  <Td numeric>{rotuloPct(pct(n(b.vencido), n(b.utilizado)))}</Td><Td numeric>{rotuloNum(n(b.criticos))}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : <CorpoPainel><Nota>Nenhum cliente no recorte.</Nota></CorpoPainel>}
      </Panel>

      <Concentracao {...props} base="LIMITE" />

      <Panel>
        <PanelHeader title="Prazo de recebimento" hint="Informativos, sem meta" />
        <CorpoPainel>
          <Numeros itens={[
            { rotulo: 'Prazo médio de recebimento', valor: d.pmrDias === null ? '—' : `${rotuloNum(n(d.pmrDias), 1)} dias` },
            { rotulo: 'Prazo médio simples', valor: d.prazoMedioDias === null ? '—' : `${rotuloNum(n(d.prazoMedioDias), 1)} dias` },
            { rotulo: 'Limite total', valor: moedaCurta(n(d.limite)) },
            { rotulo: 'Uso do limite', valor: rotuloPct(d.usoPct as number | null) },
            { rotulo: 'Créditos vencendo em 30 dias', valor: rotuloNum(n(d.vencendo)) },
          ]} />
          <Nota>Prazo médio de recebimento ponderado pelo saldo utilizado; o simples é a média dos prazos dos clientes com saldo.</Nota>
        </CorpoPainel>
      </Panel>
    </Secao>
  );
}
