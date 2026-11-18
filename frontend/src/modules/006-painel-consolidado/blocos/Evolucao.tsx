/**
 * painel-evolucao A — Dois gráficos com seletor (T-052): concessão e inadimplência mês a mês contra a meta, um
 * indicador por vez em cada gráfico (sem dois eixos Y, §12.3). Exceção D-07: a barra é pintada pelo estado do mês
 * (dentro/fora da meta), com o valor escrito, legenda dos dois estados e a meta tracejada; mês manual e parcial
 * marcados no eixo. Mês sem dado = sem barra e `Dash` na tabela (§12.4). Ano = o do mês do filtro.
 * Fechamento manual recolhido logo abaixo, só para quem administra (RN-016, D-06).
 */
import * as React from 'react';
import { Pencil } from 'lucide-react';
import {
  Alert, Bar, BarChart, Button, CartesianGrid, Cell, ChartTooltip, ChartTooltipContent, corDeSerie, CorpoPainel,
  Dash, Esqueleto, Grade, GradeCampos, GradeGraficos, Grafico, GraficoOuTabela, IconButton, Input, LabelledField,
  LabelList, Legenda, Linha as LinhaUi, Nota, Numeros, Pagination, Recolhivel, ReferenceLine, RowMeta, RowTitle, Secao,
  Segmentos, Status, Table, Td, Th, Tr, XAxis, YAxis,
} from '@/components/page';
import { acao } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  mesCurto, metaDe, moedaInteira, naMeta, pct, razoesDoMes, resumoDaSerie, ROTULOS_MENSAIS, rotuloDoValor, rotuloMeta, rotuloMesDaSerie, rotuloNum, rotuloPct,
  type ChaveMensal,
} from '@/lib/painel-consolidado/calculo';
import { mesBarra, mesesDoAno, somarMes } from '@/lib/painel-consolidado/visao';
import {
  assentado, chaveDe, lerPosicao, lerSerieCreditoDoAno, lerSerieDoAno, lerLinhas, limparCache, primeiroErro, useCarga, type Linha, type PropsBloco,
} from '../dados';

const CONCESSAO: ChaveMensal[] = ['tempoAnalise', 'sla', 'aprovacao', 'concedido'];
const INADIMPLENCIA: ChaveMensal[] = ['inadimplencia', 'vencido90', 'pdd', 'recuperacao', 'conversao', 'promessas'];

interface MesDaSerie {
  mes: string;
  origem: string;
  origemCredito: string;
  razoes: ReturnType<typeof razoesDoMes>;
}

export function Evolucao({ f, cargo }: PropsBloco) {
  const [versao, setVersao] = React.useState(0);
  const c = useCarga(chaveDe('evolucao', f, versao), async () => {
    const rs = await Promise.allSettled([lerSerieDoAno(f), lerSerieCreditoDoAno(f), lerPosicao(f)]);
    const [serie, credito, posicao] = rs.map(assentado) as [Linha | null, Linha[] | null, Linha | null];
    return { serie, credito, posicao, erro: primeiroErro(rs) };
  });
  const recarregar = () => {
    limparCache();
    setVersao((v) => v + 1);
  };

  const ano = f.mes.slice(0, 4);
  const fechamento = cargo.fechamento ? (
    <Recolhivel moldura="painel" preguicoso titulo="Lançar fechamento de meses anteriores" dica="para meses sem foto mensal; vale para a empresa inteira">
      <FechamentoManual corrente={f.corrente} onSalvo={recarregar} />
    </Recolhivel>
  ) : null;

  const cabecalho = {
    titulo: 'Evolução no ano × meta',
    hint: `Mês a mês em ${ano}, com a fonte de cada mês: posição de hoje (parcial), foto do fechamento ou fechamento manual.`,
  };
  // Mesma árvore (Secao › … › fechamento) carregando ou não: recarregar depois de salvar não desmonta o formulário.
  if (c.carregando || c.erro || !c.dados) {
    return <Secao {...cabecalho}>{c.erro ? <Alert tone="error">{c.erro}</Alert> : null}{c.erro ? null : <Esqueleto />}{fechamento}</Secao>;
  }
  const { serie, credito, posicao, erro } = c.dados;
  const metas = (posicao?.metas || {}) as Linha;
  const porMes = new Map(((serie?.linhas || []) as Linha[]).map((l) => [String(l.MES), l]));
  const porMesCredito = new Map((credito || []).map((l) => [String(l.MES), l]));
  const meses: MesDaSerie[] = mesesDoAno(f.mes).map((mes) => {
    const s = porMes.get(mes) ?? null;
    const cr = porMesCredito.get(mes) ?? null;
    return {
      mes,
      origem: s ? String(s.ORIGEM) : '',
      origemCredito: mes > f.mes ? '' : mes === f.corrente ? 'ATUAL' : cr ? 'FOTO' : '',
      razoes: razoesDoMes(s, cr),
    };
  });

  return (
    <Secao {...cabecalho}>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <GradeGraficos>
        <GraficoDaSerie titulo="Concessão de crédito" chaves={CONCESSAO} meses={meses} metas={metas} ate={f.mes} ano={ano} credito buId={f.buId} />
        <GraficoDaSerie titulo="Inadimplência e recuperação" chaves={INADIMPLENCIA} meses={meses} metas={metas} ate={f.mes} ano={ano} />
      </GradeGraficos>
      {fechamento}
    </Secao>
  );
}

function GraficoDaSerie({
  titulo, chaves, meses, metas, ate, ano, credito, buId,
}: { titulo: string; chaves: ChaveMensal[]; meses: MesDaSerie[]; metas: Linha; ate: string; ano: string; credito?: boolean; buId?: number }) {
  const [chave, setChave] = React.useState<ChaveMensal>(chaves[credito ? 1 : 0]);
  const def = ROTULOS_MENSAIS[chave];
  const meta = metaDe(chave, metas);
  const origemDe = (m: MesDaSerie) => (credito ? m.origemCredito : m.origem);
  const pontos = meses.map((m) => ({ mes: m.mes, valor: m.mes <= ate ? m.razoes[chave] : null, origem: origemDe(m) }));
  const resumo = resumoDaSerie(pontos, meta);
  const dados = pontos.map((p) => ({
    mes: p.mes, rotulo: mesCurto(p.mes), sub: p.origem === 'MANUAL' ? 'manual' : p.origem === 'ATUAL' ? 'parcial' : '',
    valor: p.valor, ok: naMeta(p.valor, meta),
  }));
  const cor = (ok: boolean | null) => (ok === null ? corDeSerie(0) : ok ? 'var(--primary)' : 'var(--destructive)');
  const linhasMeta = [meta?.min, meta?.max].filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));
  const tabelaMeses = meses.filter((m) => m.mes <= ate);

  return (
    <GraficoOuTabela
      titulo={titulo}
      hint={`${def.rotulo} · ${rotuloMeta(meta, def.unidade)} · ${ano}${credito && buId !== undefined && buId >= 0 ? ' · o filtro de BU não se aplica' : ''}`}
      altura="alta"
      topo={(
        <>
          <Segmentos rotulo="Indicador" valor={chave} onChange={setChave} opcoes={chaves.map((k) => ({ value: k, label: ROTULOS_MENSAIS[k].rotulo }))} />
          <LinhaUi entre>
            <Numeros itens={[
              { rotulo: 'Último valor', valor: rotuloDoValor(resumo.ultimo, def.unidade) },
              { rotulo: 'Média no ano', valor: rotuloDoValor(resumo.media, def.unidade) },
              { rotulo: 'Meses na meta', valor: resumo.naMeta === null ? '—' : `${resumo.naMeta} de ${resumo.meses}` },
            ]} />
            {resumo.ultimoNaMeta === null ? <Status tone="off">Sem meta</Status> : <Status tone={resumo.ultimoNaMeta ? 'live' : 'alert'}>{resumo.ultimoNaMeta ? 'Na meta' : 'Fora da meta'}</Status>}
          </LinhaUi>
        </>
      )}
      grafico={(
        <Grafico config={{ valor: { label: def.rotulo, color: corDeSerie(0) } }}>
          <BarChart data={dados} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} interval={0} height={34}
              tick={(t: { x?: number | string; y?: number | string; index?: number }) => <TickMes x={Number(t.x)} y={Number(t.y)} rotulo={dados[Number(t.index)]?.rotulo} sub={dados[Number(t.index)]?.sub} />} />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => (def.unidade === 'pct' ? `${v}%` : def.unidade === 'moeda' ? rotuloNum(v / 1000, 0) : String(v))} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {linhasMeta.map((v) => <ReferenceLine key={v} y={v} stroke="var(--foreground)" strokeDasharray="4 4" ifOverflow="extendDomain" />)}
            <Bar dataKey="valor" radius={4}>
              {dados.map((d) => <Cell key={d.mes} fill={cor(d.ok)} />)}
              <LabelList dataKey="valor" position="top" fontSize={10} fill="var(--foreground)"
                formatter={(v: unknown) => (v === null || v === undefined ? '' : def.unidade === 'moeda' ? rotuloNum(Number(v) / 1000, 0) : rotuloNum(Number(v), 1))} />
            </Bar>
          </BarChart>
        </Grafico>
      )}
      rodape={meta ? (
        <Legenda itens={[
          { rotulo: 'Mês dentro da meta', cor: 'var(--primary)' },
          { rotulo: 'Mês fora da meta', cor: 'var(--destructive)' },
          { rotulo: 'Meta', cor: 'var(--foreground)', tracejada: true },
        ]} />
      ) : <Nota>{def.unidade === 'moeda' ? 'R$ mil no eixo e nas barras; ' : ''}informativo, sem meta.</Nota>}
      tabela={(
        <Table>
          <thead>
            <tr><Th>Mês</Th>{chaves.map((k) => <Th key={k} numeric>{ROTULOS_MENSAIS[k].rotulo}</Th>)}</tr>
          </thead>
          <tbody>
            {tabelaMeses.map((m) => (
              <Tr key={m.mes}>
                <Td>{rotuloMesDaSerie(m.mes, origemDe(m))}</Td>
                {chaves.map((k) => {
                  const v = m.razoes[k];
                  const ok = naMeta(v, metaDe(k, metas));
                  const texto = rotuloDoValor(v, ROTULOS_MENSAIS[k].unidade);
                  return <Td key={k} numeric>{v === null ? <Dash /> : ok === null ? texto : <Status tone={ok ? 'live' : 'alert'}>{texto}</Status>}</Td>;
                })}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    />
  );
}

/** Rótulo do mês no eixo, com a fonte embaixo (manual / parcial) — a marca é texto, não cor (D-07). */
function TickMes({ x, y, rotulo, sub }: { x: number; y: number; rotulo?: string; sub?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{rotulo}</text>
      {sub ? <text dy={25} textAnchor="middle" fontSize={9.5} fill="var(--muted-foreground)">{sub}</text> : null}
    </g>
  );
}

/* ── Fechamento manual (RF-012, RN-016) ── */

const VAZIO = { mes: '', total: '', vencido: '', vencido90: '', pdd: '' };
/** Número como número; campo vazio vai `null` e o servidor recusa com a mensagem dele. */
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const POR_PAGINA = 6;

function FechamentoManual({ corrente, onSalvo }: { corrente: string; onSalvo: () => void }) {
  const [form, setForm] = React.useState(VAZIO);
  const [msg, setMsg] = React.useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [pagina, setPagina] = React.useState(1);
  const [versao, setVersao] = React.useState(0);
  const lista = useCarga(`fechamentos|${pagina}|${versao}`, async () => {
    const [linhas, total] = await Promise.all([
      lerLinhas('ccPainelFechamentoListar', { busca: '', limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      lerLinhas('ccPainelFechamentoTotal', { busca: '' }),
    ]);
    return { linhas: linhas || [], total: Number(total?.[0]?.TOTAL) || 0 };
  });

  const campo = (k: keyof typeof VAZIO) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((x) => ({ ...x, [k]: e.target.value })),
  });

  const salvar = async () => {
    setSalvando(true);
    setMsg(null);
    try {
      const r = await acao('ccPainelFechamentoSalvar', { mes: form.mes, total: num(form.total), vencido: num(form.vencido), vencido90: num(form.vencido90), pdd: num(form.pdd) });
      if (r.ok === false) {
        setMsg({ tom: 'error', texto: String(r.error || 'Não foi possível salvar.') });
      } else {
        setMsg({ tom: 'success', texto: `Fechamento de ${mesBarra(form.mes)} salvo; a evolução já usa o número.` });
        setForm(VAZIO);
        setVersao((v) => v + 1);
        onSalvo();
      }
    } catch (e) {
      setMsg({ tom: 'error', texto: e instanceof Error ? e.message : 'Não foi possível salvar.' });
    } finally {
      setSalvando(false);
    }
  };

  const corrigir = (l: Linha) => {
    setForm({ mes: String(l.MES), total: String(Number(l.TOTAL)), vencido: String(Number(l.VENCIDO)), vencido90: String(Number(l.VENCIDO_90)), pdd: String(Number(l.PDD)) });
    setMsg(null);
  };

  return (
    <Grade>
      <CorpoPainel>
        <GradeCampos>
          <LabelledField label="Mês" obrigatorio><Input type="month" max={somarMes(corrente, -1)} {...campo('mes')} /></LabelledField>
          <LabelledField label="Carteira (vencido + a vencer)" obrigatorio><Input type="number" min={0} step="0.01" inputMode="decimal" {...campo('total')} /></LabelledField>
          <LabelledField label="Saldo vencido" obrigatorio><Input type="number" min={0} step="0.01" inputMode="decimal" {...campo('vencido')} /></LabelledField>
          <LabelledField label="Vencido acima de 90 dias" obrigatorio><Input type="number" min={0} step="0.01" inputMode="decimal" {...campo('vencido90')} /></LabelledField>
          <LabelledField label="PDD" obrigatorio><Input type="number" min={0} step="0.01" inputMode="decimal" {...campo('pdd')} /></LabelledField>
        </GradeCampos>
        <Nota>
          Só para mês anterior ao corrente e sem foto. O vencido não passa da carteira, nem o vencido acima de 90 dias passa do vencido.
          O número vale para a empresa inteira: não aparece com filtro de BU, de carteira nem na visão de um agente. Lançar de novo o
          mesmo mês corrige; cada lançamento e correção fica na auditoria.
        </Nota>
        <div><Button variant="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar fechamento'}</Button></div>
        {msg ? <Alert tone={msg.tom}>{msg.texto}</Alert> : null}
      </CorpoPainel>
      <div>
        {lista.erro ? <CorpoPainel><Alert tone="error">{lista.erro}</Alert></CorpoPainel> : null}
        <Table>
          <thead>
            <tr><Th>Mês</Th><Th numeric>Carteira</Th><Th numeric>Vencido</Th><Th numeric>Acima de 90</Th><Th numeric>PDD</Th><Th numeric>Inadimplência</Th><Th aria-label="Ações" /></tr>
          </thead>
          <tbody>
            {(lista.dados?.linhas || []).map((l) => (
              <Tr key={l.ID}>
                <Td>
                  <RowTitle>{mesBarra(String(l.MES))}</RowTitle>
                  <RowMeta>{l.LANCADO_POR_NOME} · {fmtData(String(l.LANCADO_EM))}{l.ATUALIZADO_EM ? ' · corrigido' : ''}{Number(l.TEM_FOTO) ? ' · a foto prevalece' : ''}</RowMeta>
                </Td>
                <Td numeric>{moedaInteira(Number(l.TOTAL))}</Td>
                <Td numeric>{moedaInteira(Number(l.VENCIDO))}</Td>
                <Td numeric>{moedaInteira(Number(l.VENCIDO_90))}</Td>
                <Td numeric>{moedaInteira(Number(l.PDD))}</Td>
                <Td numeric>{rotuloPct(pct(Number(l.VENCIDO), Number(l.TOTAL)))}</Td>
                <Td><IconButton label={`Corrigir fechamento de ${mesBarra(String(l.MES))}`} onClick={() => corrigir(l)} disabled={Number(l.TEM_FOTO) === 1}><Pencil /></IconButton></Td>
              </Tr>
            ))}
            {!lista.carregando && !lista.dados?.linhas.length ? (
              <Tr><Td colSpan={7}><Nota>Nenhum fechamento manual lançado.</Nota></Td></Tr>
            ) : null}
          </tbody>
        </Table>
        <Pagination
          page={pagina}
          lastPage={Math.max(1, Math.ceil((lista.dados?.total || 0) / POR_PAGINA))}
          total={lista.dados?.total || 0}
          unit="fechamentos"
          busy={lista.carregando}
          onPrevious={() => setPagina((x) => x - 1)}
          onNext={() => setPagina((x) => x + 1)}
        />
      </div>
    </Grade>
  );
}
