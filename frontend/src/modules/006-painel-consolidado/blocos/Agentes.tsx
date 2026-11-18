/**
 * painel-agentes B — Uma aba por pergunta (T-057): inadimplência por agente, por BU, conversão e agenda, cada aba
 * com dois gráficos e a tabela. 4 execuções: ccPainelAgentes, ccPainelPosicao (por BU, no cache), ccPainelSerie
 * (6 meses, dividida com o Movimento) e ccCobAgendaResumo (ate = 7º dia útil, RF-017; dividida com a Visão geral).
 * Agente e analista veem só a própria linha, sem gráfico de comparação (RN-015).
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Bar, BarChart, Button, CartesianGrid, ChartTooltip, ChartTooltipContent, corDeSerie, CorpoPainel,
  Dash, Esqueleto, GradeGraficos, Grafico, GraficoOuTabela, LabelList, Line, LineChart, Linha as LinhaUi, Nota, Panel,
  ReferenceLine, RolagemHorizontal, RowMeta, RowTitle, Secao, Table, Tabs, TabsContent, TabsList, TabsTrigger,
  Td, Th, Tr, TrTotal, XAxis, YAxis,
} from '@/components/page';
import { mesCurto, moedaInteira, pct, razoesDoMes, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { janelaMeses, mesBarra } from '@/lib/painel-consolidado/visao';
import {
  assentado, chaveDe, instalada, lerAgendaResumo, lerAgentes, lerPosicao, lerSerie6, primeiroErro, seteDiasUteis, useCarga, type Linha, type PropsBloco,
} from '../dados';

const n = (v: unknown) => Number(v) || 0;

/** Barras horizontais por nome, com a meta tracejada quando houver. */
function BarrasPorNome({ titulo, hint, dados, unidade, meta, tabela }: {
  titulo: string; hint: string; dados: { rotulo: string; valor: number | null }[]; unidade: 'pct' | 'num'; meta?: number; tabela: React.ReactNode;
}) {
  const fmt = (v: unknown) => (v === null || v === undefined ? '' : unidade === 'pct' ? rotuloPct(Number(v)) : rotuloNum(Number(v)));
  return (
    <GraficoOuTabela
      titulo={titulo}
      hint={hint}
      altura={dados.length > 6 ? 'alta' : 'padrao'}
      grafico={(
        <Grafico config={{ valor: { label: titulo, color: corDeSerie(0) } }}>
          <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 56 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 'auto']} tickFormatter={(v: number) => (unidade === 'pct' ? `${v}%` : String(v))} />
            <YAxis type="category" dataKey="rotulo" width={120} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {meta !== undefined && Number.isFinite(meta) ? <ReferenceLine x={meta} stroke="var(--foreground)" strokeDasharray="4 4" ifOverflow="extendDomain" /> : null}
            <Bar dataKey="valor" fill="var(--color-valor)" radius={4}>
              <LabelList dataKey="valor" position="right" fontSize={11} fill="var(--foreground)" formatter={fmt} />
            </Bar>
          </BarChart>
        </Grafico>
      )}
      tabela={tabela}
    />
  );
}

export function Agentes({ f, cargo }: PropsBloco) {
  const navigate = useNavigate();
  const c = useCarga(chaveDe('agentes', f), async () => {
    const rs = await Promise.allSettled([lerAgentes(f), lerPosicao(f), lerSerie6(f), lerAgendaResumo(f)]);
    const [agentes, posicao, serie, agenda] = rs.map(assentado) as [Linha[] | null, Linha | null, Linha | null, Linha[] | null];
    return { agentes: agentes || [], posicao, serie, agenda, erro: primeiroErro(rs.slice(0, 3)), erroAgenda: primeiroErro(rs.slice(3)) };
  });
  const [aba, setAba] = React.useState('ag');
  if (c.carregando) return <Esqueleto altura="alta" />;
  if (c.erro || !c.dados) return <Alert tone="error">{c.erro}</Alert>;
  const { agentes, posicao, serie, agenda, erro, erroAgenda } = c.dados;
  const metas = (posicao?.metas || {}) as Linha;
  const vencidoTotal = agentes.reduce((s, a) => s + n(a.VENCIDO), 0);
  const comparar = cargo.comparacao && agentes.length > 1;
  const soma = (k: string) => agentes.reduce((s, a) => s + n(a[k]), 0);
  const nome = (a: Linha) => String(a.AGENTE_NOME || 'Sem agente');
  const pessoa = (a: Linha) => <><RowTitle>{nome(a)}</RowTitle>{a.SUPERIOR_NOME ? <RowMeta>reporta a {a.SUPERIOR_NOME}</RowMeta> : null}</>;
  const atrasadasTotal = (agenda || []).reduce((s, a) => s + n(a.ATRASADAS), 0);

  // Por BU: da posição (cliente × BU), só BUs com saldo.
  const bus = ((posicao?.porBu || []) as Linha[]).filter((b) => n(b.total) > 0);
  const vencidoBus = bus.reduce((s, b) => s + n(b.vencido), 0);

  // Conversão total dos 6 meses (RF-018).
  const porMes = new Map(((serie?.linhas || []) as Linha[]).map((l) => [String(l.MES), l]));
  const conv6 = janelaMeses(f.mes, 6).map((mes) => ({ mes, rotulo: mesCurto(mes), valor: razoesDoMes(porMes.get(mes) ?? null, null).conversao }));

  // Agenda: junta o resumo da agenda (por agente) com vencido e ações no prazo de ccPainelAgentes.
  const ids = [...new Set([...agentes.map((a) => n(a.AGENTE_ID)), ...(agenda || []).map((a) => n(a.AGENTE_ID))])];
  const agendaLinhas = ids.map((id) => {
    const a = agentes.find((x) => n(x.AGENTE_ID) === id) ?? {};
    const g = (agenda || []).find((x) => n(x.AGENTE_ID) === id) ?? {};
    return { id, nome: String(a.AGENTE_NOME || g.AGENTE_NOME || 'Sem agente'), superior: a.SUPERIOR_NOME, a, g };
  }).filter((l) => l.id > 0 || n(l.a.VENCIDO) > 0);

  return (
    <Secao titulo="Agentes, BU, conversão e agenda" hint="Inadimplência por agente e por BU, conversão da cobrança por agente e resumo da agenda de cada um. Agentes pelo saldo vencido, do maior para o menor.">
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Panel>
        <Tabs value={aba} onValueChange={setAba}>
          <CorpoPainel>
            <RolagemHorizontal>
              <TabsList>
                <TabsTrigger value="ag">Inadimplência por agente</TabsTrigger>
                <TabsTrigger value="bu">Inadimplência por BU</TabsTrigger>
                <TabsTrigger value="cv">Conversão</TabsTrigger>
                <TabsTrigger value="agd">Agenda {atrasadasTotal ? <Badge tone="attention">{atrasadasTotal} atrasadas</Badge> : null}</TabsTrigger>
              </TabsList>
            </RolagemHorizontal>

          </CorpoPainel>

          <TabsContent value="ag">
            {comparar ? (
              <CorpoPainel>
                <GradeGraficos>
                  <BarrasPorNome titulo="Índice de inadimplência" hint={`% da carteira de cada agente · traço = meta de ${rotuloPct(n(metas['meta.inadPct']), 0)}`} unidade="pct"
                    meta={n(metas['meta.inadPct'])} dados={agentes.map((a) => ({ rotulo: nome(a), valor: pct(n(a.VENCIDO), n(a.TOTAL)) }))}
                    tabela={<TabelaSimples cab={['Agente', 'Índice']} linhas={agentes.map((a) => [nome(a), rotuloPct(pct(n(a.VENCIDO), n(a.TOTAL)))])} />} />
                  <BarrasPorNome titulo="Parte do vencido total" hint={`% de ${moedaInteira(vencidoTotal)} vencidos`} unidade="pct"
                    dados={agentes.map((a) => ({ rotulo: nome(a), valor: pct(n(a.VENCIDO), vencidoTotal) }))}
                    tabela={<TabelaSimples cab={['Agente', 'Parte do vencido']} linhas={agentes.map((a) => [nome(a), rotuloPct(pct(n(a.VENCIDO), vencidoTotal))])} />} />
                </GradeGraficos>
              </CorpoPainel>
            ) : null}
            <Table>
              <thead><tr><Th>Agente</Th><Th numeric>Carteira</Th><Th numeric>Saldo vencido</Th><Th numeric>Índice</Th><Th numeric>Acima de 90 dias</Th><Th numeric>Clientes em atraso</Th><Th numeric>Parte do vencido total</Th></tr></thead>
              <tbody>
                {agentes.map((a) => (
                  <Tr key={n(a.AGENTE_ID)}>
                    <Td>{pessoa(a)}</Td><Td numeric>{moedaInteira(n(a.TOTAL))}</Td><Td numeric>{moedaInteira(n(a.VENCIDO))}</Td>
                    <Td numeric>{rotuloPct(pct(n(a.VENCIDO), n(a.TOTAL)))}</Td><Td numeric>{moedaInteira(n(a.VENCIDO_90))}</Td>
                    <Td numeric>{rotuloNum(n(a.CLIENTES_ATRASO))}</Td><Td numeric>{rotuloPct(pct(n(a.VENCIDO), vencidoTotal))}</Td>
                  </Tr>
                ))}
                {agentes.length > 1 ? (
                  <TrTotal>
                    <Td>Total</Td><Td numeric>{moedaInteira(soma('TOTAL'))}</Td><Td numeric>{moedaInteira(vencidoTotal)}</Td>
                    <Td numeric>{rotuloPct(pct(vencidoTotal, soma('TOTAL')))}</Td><Td numeric>{moedaInteira(soma('VENCIDO_90'))}</Td>
                    <Td numeric>{rotuloNum(soma('CLIENTES_ATRASO'))}</Td><Td numeric>{vencidoTotal ? rotuloPct(100) : <Dash />}</Td>
                  </TrTotal>
                ) : null}
              </tbody>
            </Table>
            {!agentes.length ? <CorpoPainel><Nota>Nenhum cliente no recorte.</Nota></CorpoPainel> : null}
          </TabsContent>

          <TabsContent value="bu">
            <CorpoPainel>
              {cargo.comparacao && bus.length > 1 ? (
                <GradeGraficos>
                  <BarrasPorNome titulo="Índice de inadimplência" hint={`% da carteira de cada BU · traço = meta de ${rotuloPct(n(metas['meta.inadPct']), 0)}`} unidade="pct"
                    meta={n(metas['meta.inadPct'])} dados={bus.map((b) => ({ rotulo: String(b.rotulo), valor: pct(n(b.vencido), n(b.total)) }))}
                    tabela={<TabelaSimples cab={['BU', 'Índice']} linhas={bus.map((b) => [String(b.rotulo), rotuloPct(pct(n(b.vencido), n(b.total)))])} />} />
                  <BarrasPorNome titulo="Representatividade no vencido" hint={`% de ${moedaInteira(vencidoBus)} vencidos`} unidade="pct"
                    dados={bus.map((b) => ({ rotulo: String(b.rotulo), valor: pct(n(b.vencido), vencidoBus) }))}
                    tabela={<TabelaSimples cab={['BU', 'Representatividade']} linhas={bus.map((b) => [String(b.rotulo), rotuloPct(pct(n(b.vencido), vencidoBus))])} />} />
                </GradeGraficos>
              ) : null}
            </CorpoPainel>
            <Table>
              <thead><tr><Th>BU</Th><Th numeric>Carteira</Th><Th numeric>Saldo vencido</Th><Th numeric>Representatividade no vencido</Th><Th numeric>Índice</Th><Th numeric>Clientes em atraso</Th><Th numeric>Acima de 90 dias</Th></tr></thead>
              <tbody>
                {bus.map((b) => (
                  <Tr key={n(b.chave)}>
                    <Td><RowTitle>{b.rotulo}</RowTitle></Td><Td numeric>{moedaInteira(n(b.total))}</Td><Td numeric>{moedaInteira(n(b.vencido))}</Td>
                    <Td numeric>{rotuloPct(pct(n(b.vencido), vencidoBus))}</Td><Td numeric>{rotuloPct(pct(n(b.vencido), n(b.total)))}</Td>
                    <Td numeric>{rotuloNum(n(b.clientesAtraso))}</Td><Td numeric>{moedaInteira(n(b.vencido90))}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <CorpoPainel><Nota>A BU é do item da nota: a posição é por cliente × BU, e um cliente pode contar em mais de uma.</Nota></CorpoPainel>
          </TabsContent>

          <TabsContent value="cv">
            <CorpoPainel>
              {comparar ? (
                <GradeGraficos>
                  <BarrasPorNome titulo="Conversão por agente" hint={`recebido ÷ cobrado no mês · traço = meta de ${rotuloPct(n(metas['meta.conversaoPct']), 0)}`} unidade="pct"
                    meta={n(metas['meta.conversaoPct'])} dados={agentes.map((a) => ({ rotulo: nome(a), valor: pct(n(a.RECUPERADO), n(a.COBRADO)) }))}
                    tabela={<TabelaSimples cab={['Agente', 'Conversão']} linhas={agentes.map((a) => [nome(a), rotuloPct(pct(n(a.RECUPERADO), n(a.COBRADO)))])} />} />
                  <ConversaoSeisMeses dados={conv6} meta={n(metas['meta.conversaoPct'])} ate={f.mes} parcial={f.mes === f.corrente} />
                </GradeGraficos>
              ) : <ConversaoSeisMeses dados={conv6} meta={n(metas['meta.conversaoPct'])} ate={f.mes} parcial={f.mes === f.corrente} />}
            </CorpoPainel>
            <Table>
              <thead><tr><Th>Agente de cobrança</Th><Th numeric>Clientes cobrados</Th><Th numeric>Contatos</Th><Th numeric>Cobrado</Th><Th numeric>Recebido</Th><Th numeric>Conversão</Th><Th numeric>Promessas</Th><Th numeric>Promessas cumpridas</Th></tr></thead>
              <tbody>
                {agentes.map((a) => {
                  const avaliadas = n(a.PROMESSAS_CUMPRIDAS) + n(a.PROMESSAS_QUEBRADAS);
                  return (
                    <Tr key={n(a.AGENTE_ID)}>
                      <Td>{pessoa(a)}</Td><Td numeric>{rotuloNum(n(a.CLIENTES_COBRADOS))}</Td><Td numeric>{rotuloNum(n(a.CONTATOS))}</Td>
                      <Td numeric>{moedaInteira(n(a.COBRADO))}</Td><Td numeric>{moedaInteira(n(a.RECUPERADO))}</Td>
                      <Td numeric>{rotuloPct(pct(n(a.RECUPERADO), n(a.COBRADO)))}</Td><Td numeric>{rotuloNum(n(a.PROMESSAS))}</Td>
                      <Td numeric>{avaliadas ? `${n(a.PROMESSAS_CUMPRIDAS)} de ${avaliadas} · ${rotuloPct(pct(n(a.PROMESSAS_CUMPRIDAS), avaliadas))}` : <Dash />}</Td>
                    </Tr>
                  );
                })}
                {agentes.length > 1 ? (
                  <TrTotal>
                    <Td>Total</Td><Td numeric>{rotuloNum(soma('CLIENTES_COBRADOS'))}</Td><Td numeric>{rotuloNum(soma('CONTATOS'))}</Td>
                    <Td numeric>{moedaInteira(soma('COBRADO'))}</Td><Td numeric>{moedaInteira(soma('RECUPERADO'))}</Td>
                    <Td numeric>{rotuloPct(pct(soma('RECUPERADO'), soma('COBRADO')))}</Td><Td numeric>{rotuloNum(soma('PROMESSAS'))}</Td>
                    <Td numeric>{soma('PROMESSAS_CUMPRIDAS') + soma('PROMESSAS_QUEBRADAS') ? `${soma('PROMESSAS_CUMPRIDAS')} de ${soma('PROMESSAS_CUMPRIDAS') + soma('PROMESSAS_QUEBRADAS')}` : <Dash />}</Td>
                  </TrTotal>
                ) : null}
              </tbody>
            </Table>
          </TabsContent>

          <TabsContent value="agd">
            <CorpoPainel>
              {comparar && agenda ? (
                <GradeGraficos>
                  <BarrasPorNome titulo="Atrasados na agenda" hint="quantidade por agente" unidade="num"
                    dados={agendaLinhas.map((l) => ({ rotulo: l.nome, valor: n(l.g.ATRASADAS) }))}
                    tabela={<TabelaSimples cab={['Agente', 'Atrasados na agenda']} linhas={agendaLinhas.map((l) => [l.nome, rotuloNum(n(l.g.ATRASADAS))])} />} />
                  <BarrasPorNome titulo="Concluídas no prazo" hint="% das ações concluídas no mês" unidade="pct"
                    dados={agendaLinhas.map((l) => ({ rotulo: l.nome, valor: pct(n(l.a.ACOES_NO_PRAZO), n(l.a.ACOES)) }))}
                    tabela={<TabelaSimples cab={['Agente', '% no prazo']} linhas={agendaLinhas.map((l) => [l.nome, rotuloPct(pct(n(l.a.ACOES_NO_PRAZO), n(l.a.ACOES)))])} />} />
                </GradeGraficos>
              ) : null}
            </CorpoPainel>
            {!instalada('ccCobAgendaResumo') ? <CorpoPainel><Nota>Módulo não instalado: a agenda é da cobrança.</Nota></CorpoPainel> : erroAgenda ? <CorpoPainel><Alert tone="error">{erroAgenda}</Alert></CorpoPainel> : (
              <Table>
                <thead>
                  <tr>
                    <Th>Agente</Th><Th numeric>Vencido em cobrança</Th><Th numeric>A vencer em 7 dias úteis</Th><Th numeric>Atrasados na agenda</Th><Th numeric>Para hoje</Th>
                    <Th numeric>Próximos 7 dias úteis</Th><Th numeric>Concluídas no prazo</Th><Th numeric>Fora do prazo</Th><Th numeric>% no prazo</Th><Th numeric>Sem contato</Th>
                  </tr>
                </thead>
                <tbody>
                  {agendaLinhas.map((l) => (
                    <Tr key={l.id}>
                      <Td><RowTitle>{l.nome}</RowTitle>{l.superior ? <RowMeta>reporta a {l.superior}</RowMeta> : null}</Td>
                      <Td numeric>{moedaInteira(n(l.a.VENCIDO))}</Td><Td numeric>{moedaInteira(n(l.g.A_VENCER_7DU))}</Td>
                      <Td numeric>{rotuloNum(n(l.g.ATRASADAS))}</Td><Td numeric>{rotuloNum(n(l.g.PARA_HOJE))}</Td><Td numeric>{rotuloNum(n(l.g.PROXIMOS))}</Td>
                      <Td numeric>{rotuloNum(n(l.a.ACOES_NO_PRAZO))}</Td><Td numeric>{rotuloNum(n(l.a.ACOES) - n(l.a.ACOES_NO_PRAZO))}</Td>
                      <Td numeric>{rotuloPct(pct(n(l.a.ACOES_NO_PRAZO), n(l.a.ACOES)))}</Td><Td numeric>{rotuloNum(n(l.g.SEM_CONTATO))}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <CorpoPainel>
              <LinhaUi entre>
                <Nota>Calculado pela agenda da cobrança, com os filtros do painel; próximos até {mesBarraDia(seteDiasUteis(f.hoje))} (7 dias úteis).</Nota>
                <Button size="sm" onClick={() => navigate('/agenda')}>Abrir Minha agenda</Button>
              </LinhaUi>
            </CorpoPainel>
          </TabsContent>
        </Tabs>
      </Panel>
    </Secao>
  );
}

const mesBarraDia = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function ConversaoSeisMeses({ dados, meta, ate, parcial }: { dados: { mes: string; rotulo: string; valor: number | null }[]; meta: number; ate: string; parcial: boolean }) {
  const comValor = dados.filter((d) => d.valor !== null).length;
  return (
    <GraficoOuTabela
      titulo="Conversão total, seis meses"
      hint={`% até ${mesBarra(ate)}${parcial ? ' (parcial)' : ''} · traço = meta de ${rotuloPct(meta, 0)}`}
      semGrafico={comValor < 2 ? 'Menos de dois meses com fechamento anterior: sem tendência para desenhar.' : undefined}
      grafico={(
        <Grafico config={{ valor: { label: 'Conversão', color: corDeSerie(0) } }}>
          <LineChart data={dados} margin={{ top: 18, right: 16, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 'auto']} tickFormatter={(v: number) => `${v}%`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={meta} stroke="var(--foreground)" strokeDasharray="4 4" ifOverflow="extendDomain" />
            <Line dataKey="valor" stroke="var(--color-valor)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}>
              <LabelList dataKey="valor" position="top" fontSize={10} fill="var(--foreground)" formatter={(v: unknown) => (v === null || v === undefined ? '' : rotuloNum(Number(v), 1))} />
            </Line>
          </LineChart>
        </Grafico>
      )}
      tabela={<TabelaSimples cab={['Mês', 'Conversão']} linhas={dados.map((d) => [mesBarra(d.mes), rotuloPct(d.valor)])} />}
    />
  );
}

function TabelaSimples({ cab, linhas }: { cab: [string, string]; linhas: [string, string][] }) {
  return (
    <Table>
      <thead><tr><Th>{cab[0]}</Th><Th numeric>{cab[1]}</Th></tr></thead>
      <tbody>{linhas.map(([a, b]) => <Tr key={a}><Td>{a}</Td><Td numeric>{b === '—' ? <Dash /> : b}</Td></Tr>)}</tbody>
    </Table>
  );
}
