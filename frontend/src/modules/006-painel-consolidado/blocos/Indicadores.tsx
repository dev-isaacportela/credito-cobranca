/**
 * painel-indicadores B — Três grupos lado a lado (T-051): concessão, carteira e cobrança, quatro indicadores
 * cada, com valor, estado e medidor. ccPainelPosicao (cache), ccPainelSerie e ccPainelSerieCredito (janela do ano,
 * a mesma da Evolução) e ccPainelCredito.
 */
import {
  Alert, Esqueleto, Forte, Grade, ItemBloco, Linha as LinhaUi, ListaItens, Medidor, MetaDot, Nota, NumeroGrande, Panel,
  PanelHeader, Secao, Stat, Status,
} from '@/components/page';
import {
  indicadoresExecutivos, moedaCurta, rotuloDoValor, rotuloMeta, rotuloNum, rotuloPct, type GrupoIndicador, type Indicador,
} from '@/lib/painel-consolidado/calculo';
import { mesBarra } from '@/lib/painel-consolidado/visao';
import {
  assentado, chaveDe, lerCredito, lerPosicao, lerSerieCreditoDoAno, lerSerieDoAno, primeiroErro, useCarga, type Linha, type PropsBloco,
} from '../dados';

const GRUPOS: { grupo: GrupoIndicador; titulo: string }[] = [
  { grupo: 'CONCESSAO', titulo: 'Concessão de crédito' },
  { grupo: 'CARTEIRA', titulo: 'Carteira e risco' },
  { grupo: 'COBRANCA', titulo: 'Cobrança' },
];

const TOM = { NA_META: ['live', 'Na meta'], FORA: ['alert', 'Fora da meta'], SEM_META: ['off', 'Sem meta'], SEM_VALOR: ['off', 'Sem dado'] } as const;

const valorDoIndicador = (i: Pick<Indicador, 'valor' | 'unidade'>) => rotuloDoValor(i.valor, i.unidade);

/** "3,25 p.p. acima da meta", "1,2 dia abaixo do teto", "dentro da faixa". */
function distancia(i: Indicador): string {
  if (i.valor === null || !i.meta) return i.hint ?? '';
  const u = i.unidade === 'dias' ? ' dias' : ' p.p.';
  const f = (v: number) => `${rotuloNum(Math.abs(v), 2)}${u}`;
  const { min, max } = i.meta;
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return i.valor < min ? `${f(i.valor - min)} abaixo da faixa` : i.valor > max ? `${f(i.valor - max)} acima da faixa` : 'dentro da faixa';
  }
  if (max !== null && max !== undefined) return i.valor > max ? `${f(i.valor - max)} acima da meta` : `${f(max - i.valor)} abaixo do teto`;
  return i.valor < Number(min) ? `${f(Number(min) - i.valor)} abaixo da meta` : `${f(i.valor - Number(min))} acima da meta`;
}

export function Indicadores({ f }: PropsBloco) {
  const c = useCarga(chaveDe('indicadores', f), async () => {
    const rs = await Promise.allSettled([lerPosicao(f), lerSerieDoAno(f), lerSerieCreditoDoAno(f), lerCredito(f)]);
    const [posicao, serie, serieCredito, credito] = rs.map(assentado) as [Linha | null, Linha | null, Linha[] | null, Linha | null];
    return { posicao, serie, serieCredito, credito, erro: primeiroErro(rs) };
  });
  if (c.carregando) return <Esqueleto />;
  if (c.erro || !c.dados?.posicao) return <Alert tone="error">{c.erro ?? c.dados?.erro}</Alert>;
  const { posicao, serie, serieCredito, credito, erro } = c.dados;
  const linhaSerie = ((serie?.linhas || []) as Linha[]).find((l) => l.MES === f.mes) ?? null;
  const linhaCredito = (serieCredito || []).find((l) => l.MES === f.mes) ?? null;
  const lista = indicadoresExecutivos({ posicao, serie: linhaSerie, serieCredito: linhaCredito, credito });
  const conta = (e: string) => lista.filter((i) => i.estado === e).length;

  return (
    <Secao
      titulo="Indicadores executivos"
      hint={<>
        <Stat>{conta('NA_META')}</Stat> na meta <MetaDot /> <Stat>{conta('FORA')}</Stat> fora da meta <MetaDot /> <Stat>{conta('SEM_META')}</Stat> sem meta
        {posicao.origem === 'SEM' ? <> <MetaDot /> sem foto de {mesBarra(f.mes)}</> : null}
      </>}
    >
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Grade colunas={3}>
        {GRUPOS.map(({ grupo, titulo }) => {
          const itens = lista.filter((i) => i.grupo === grupo);
          const na = itens.filter((i) => i.estado === 'NA_META').length;
          const fora = itens.filter((i) => i.estado === 'FORA').length;
          return (
            <Panel key={grupo}>
              <PanelHeader
                title={titulo}
                hint={`${na} na meta · ${fora} fora${grupo === 'CONCESSAO' && f.buId >= 0 ? ' · o filtro de BU não se aplica às decisões' : ''}`}
              />
              <ListaItens>
                {itens.map((i) => (
                  <ItemBloco key={i.chave}>
                    <LinhaUi entre><Forte>{i.rotulo}</Forte><Status tone={TOM[i.estado][0]}>{TOM[i.estado][1]}</Status></LinhaUi>
                    <LinhaUi entre><NumeroGrande>{valorDoIndicador(i)}</NumeroGrande><Nota>{rotuloMeta(i.meta, i.unidade)}</Nota></LinhaUi>
                    {i.chave === 'exposicao' ? (
                      <>
                        <Medidor valor={i.uso ?? null} escala={100} rotulo={`Uso do limite ${rotuloPct(i.uso ?? null)}`} />
                        <Nota>{rotuloPct(i.uso ?? null)} de {moedaCurta(i.limite ?? null)} de limite</Nota>
                      </>
                    ) : i.meta && i.valor !== null ? (
                      <>
                        <Medidor valor={i.valor} meta={i.meta} rotulo={`${i.rotulo}: ${valorDoIndicador(i)}, ${rotuloMeta(i.meta, i.unidade)}`} />
                        <Nota>{distancia(i)}</Nota>
                      </>
                    ) : <Nota>{i.hint ?? (i.valor === null ? 'sem dado no mês' : '')}</Nota>}
                  </ItemBloco>
                ))}
              </ListaItens>
            </Panel>
          );
        })}
      </Grade>
      <Nota>No medidor, a barra é o valor e o traço escuro é a meta; na taxa de aprovação, a moldura marca a faixa. As metas são parâmetros da política.</Nota>
    </Secao>
  );
}
