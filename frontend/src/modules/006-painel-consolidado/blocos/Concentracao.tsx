/**
 * painel-concentracao A — Quatro recortes e top 10 (T-056). Com `base = 'LIMITE'` serve à concentração da carteira
 * de limites no bloco de crédito (PA-25, sem mockup): só cliente e grupo, e a lista de quem passa do teto.
 * ccPainelConcentracao; HHI e faixa vêm do servidor (parâmetros `painel.hhi*`).
 */
import {
  Alert, Bar, BarChart, CartesianGrid, ChartTooltip, ChartTooltipContent, CorpoPainel, Dash, Esqueleto,
  GradeGraficos, GradeKpi, Grafico, GraficoOuTabela, Kpi, LabelList, Nota, Panel, PanelHeader, RowMeta, RowTitle,
  Secao, Status, Table, Td, Th, Tr, XAxis, YAxis,
} from '@/components/page';
import { moedaCurta, moedaInteira, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { estadoDoBloco, mesBarra } from '@/lib/painel-consolidado/visao';
import { chaveDe, lerConcentracao, useCarga, type Linha, type PropsBloco } from '../dados';
import { AvisoDoBloco } from '../pecas';

const FAIXA = { PULVERIZADA: 'pulverizada', MODERADA: 'moderada', ALTA: 'alta' } as Record<string, string>;
const faixaTexto = (v: unknown) => FAIXA[String(v).toUpperCase()] ?? String(v ?? '').toLowerCase();

interface Recorte { hhi: number; hhiFaixa: string; quantidade: number; linhas: Linha[] }

export function Concentracao({ f, base }: PropsBloco & { base: 'VENCIDO' | 'LIMITE' }) {
  const c = useCarga(chaveDe(`conc-${base}`, f), () => lerConcentracao(f, base));
  const limite = base === 'LIMITE';
  const medida = limite ? 'do limite' : 'do vencido';
  const cabecalho = limite
    ? { titulo: 'Concentração de limites', hint: 'Participação de cada cliente e grupo econômico no limite total dos clientes que você vê, na posição de hoje.' }
    : { titulo: 'Concentração da inadimplência', hint: `Em quem, em que grupo, em que região e em que BU o saldo vencido de ${mesBarra(f.mes)} está concentrado.` };
  if (c.carregando) return <Esqueleto altura="alta" />;
  if (c.erro || !c.dados) return <Secao {...cabecalho}><Alert tone="error">{c.erro}</Alert></Secao>;
  const d = c.dados;
  const estado = estadoDoBloco({ origem: String(d.origem), mes: f.mes, vazio: Number(d.clientes) === 0 });
  if (estado) {
    return (
      <Secao {...cabecalho}>
        <AvisoDoBloco estado={limite && estado.tipo === 'VAZIO' ? { tipo: 'VAZIO', texto: 'Nenhum limite no recorte.' } : estado} />
      </Secao>
    );
  }

  const cliente = d.porCliente as Recorte;
  const grupo = d.porGrupo as Recorte;
  const top10 = (d.top10 || []) as Linha[];
  const total = Number(d.total) || 0;
  const recortes: { titulo: string; r: Recorte; meta?: (l: Linha) => string }[] = [
    { titulo: 'Por cliente', r: cliente },
    { titulo: 'Por grupo econômico', r: grupo },
    ...(limite ? [] : [{ titulo: 'Por região', r: d.porRegiao as Recorte }, ...(d.porBu ? [{ titulo: 'Por BU', r: d.porBu as Recorte }] : [])]),
  ];
  const grupo1 = grupo.linhas.find((l) => String(l.chave).startsWith('G:'));
  const ultimo10 = top10[top10.length - 1];

  return (
    <Secao {...cabecalho}>
      <GradeKpi>
        <Kpi rotulo={limite ? 'Maior cliente' : 'Maior devedor'} valor={top10[0] ? rotuloPct(Number(top10[0].pct)) : <Dash />}
          hint={top10[0] ? `${top10[0].rotulo} · ${moedaCurta(Number(top10[0].valor))}` : undefined} />
        <Kpi rotulo="Maior grupo econômico" valor={grupo1 ? rotuloPct(Number(grupo1.pct)) : <Dash />}
          hint={grupo1 ? `${grupo1.rotulo} · ${moedaCurta(Number(grupo1.valor))}` : 'nenhum cliente com grupo'} />
        <Kpi rotulo={`${top10.length} maiores`} valor={ultimo10 ? rotuloPct(Number(ultimo10.pctAcum)) : <Dash />}
          hint={`${moedaCurta(top10.reduce((s, l) => s + Number(l.valor), 0))} de ${moedaCurta(total)} ${limite ? 'de limite' : 'vencidos'}`} />
        <Kpi rotulo="Índice de concentração por cliente" valor={rotuloNum(Number(cliente.hhi), 1)} hint={faixaTexto(cliente.hhiFaixa)} />
      </GradeKpi>

      <GradeGraficos>
        {recortes.map(({ titulo, r }) => {
          const cinco = r.linhas.slice(0, 5);
          const resto = r.quantidade - cinco.length;
          const dados = [
            ...cinco.map((l) => ({ rotulo: String(l.rotulo), pct: Number(l.pct), valor: Number(l.valor) })),
            ...(resto > 0 ? [{
              rotulo: `Demais ${resto}`, pct: Math.max(0, Math.round((100 - cinco.reduce((s, l) => s + Number(l.pct), 0)) * 100) / 100),
              valor: Math.max(0, total - cinco.reduce((s, l) => s + Number(l.valor), 0)),
            }] : []),
          ];
          return (
            <GraficoOuTabela
              key={titulo}
              titulo={titulo}
              hint={`% ${medida} · índice de concentração ${rotuloNum(Number(r.hhi), 1)} (${faixaTexto(r.hhiFaixa)})`}
              grafico={(
                <Grafico config={{ pct: { label: `% ${medida}`, color: 'var(--data-seq-3)' } }}>
                  <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 52 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="rotulo" width={150} tickLine={false} axisLine={false}
                      tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pct" fill="var(--color-pct)" radius={4}>
                      <LabelList dataKey="pct" position="right" fontSize={11} fill="var(--foreground)" formatter={(v: unknown) => rotuloPct(Number(v))} />
                    </Bar>
                  </BarChart>
                </Grafico>
              )}
              tabela={(
                <Table>
                  <thead><tr><Th>{titulo.replace('Por ', '').replace(/^./, (x) => x.toUpperCase())}</Th><Th numeric>{limite ? 'Limite' : 'Vencido'}</Th><Th numeric>% {medida}</Th></tr></thead>
                  <tbody>
                    {dados.map((l) => <Tr key={l.rotulo}><Td><RowTitle>{l.rotulo}</RowTitle></Td><Td numeric>{moedaInteira(l.valor)}</Td><Td numeric>{rotuloPct(l.pct)}</Td></Tr>)}
                  </tbody>
                </Table>
              )}
            />
          );
        })}
      </GradeGraficos>

      <Panel>
        <PanelHeader title={`${top10.length} maiores ${limite ? 'limites' : 'devedores'}`} hint={`${rotuloNum(Number(d.clientes))} clientes com ${limite ? 'limite' : 'saldo vencido'}`} />
        <Table>
          <thead><tr><Th numeric>#</Th><Th>Cliente</Th><Th numeric>{limite ? 'Limite' : 'Vencido'}</Th><Th numeric>% {medida}</Th><Th numeric>% acumulado</Th></tr></thead>
          <tbody>
            {top10.map((l, i) => (
              <Tr key={String(l.chave)}>
                <Td numeric>{i + 1}</Td>
                <Td><RowTitle>{l.rotulo}</RowTitle><RowMeta>código {l.chave}</RowMeta></Td>
                <Td numeric>{moedaInteira(Number(l.valor))}</Td>
                <Td numeric>{rotuloPct(Number(l.pct))}</Td>
                <Td numeric>{rotuloPct(Number(l.pctAcum))}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      {limite ? <AcimaDoTeto itens={(d.acimaDoMaximo || []) as Linha[]} /> : null}
    </Secao>
  );
}

function AcimaDoTeto({ itens }: { itens: Linha[] }) {
  return (
    <Panel>
      <PanelHeader title="Acima do teto de concentração" hint="Clientes e grupos com participação no limite total acima do teto da política" />
      {itens.length ? (
        <Table>
          <thead><tr><Th>Cliente ou grupo</Th><Th>Tipo</Th><Th numeric>Limite</Th><Th numeric>% do limite</Th></tr></thead>
          <tbody>
            {itens.map((l) => (
              <Tr key={`${l.tipo}${l.chave}`}>
                <Td><RowTitle>{l.rotulo}</RowTitle></Td>
                <Td><Status tone="attention">{l.tipo === 'GRUPO' ? 'Grupo econômico' : 'Cliente'}</Status></Td>
                <Td numeric>{moedaInteira(Number(l.valor))}</Td>
                <Td numeric>{rotuloPct(Number(l.pct))}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : <CorpoPainel><Nota>Ninguém acima do teto no recorte.</Nota></CorpoPainel>}
    </Panel>
  );
}
