/**
 * painel-visao-saude C — Saúde em três colunas (T-050). Seis execuções (RNF-001): ccPainelPosicao (no cache do
 * cabeçalho), ccPainelSaude, ccPainelAtencao e os três resumos dos módulos donos chamados direto (DT-34):
 * ccCobAgendaResumo (ate = 7º dia útil), ccJurResumo, ccPubResumo. Sob demanda: ccCredSaudeListar/Total.
 */
import * as React from 'react';
import {
  Alert, Badge, CorpoPainel, Dash, Delta, Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, EmptyState, Esqueleto, Grade, GradeKpi, ItemLista, Kpi, Linha as LinhaUi, ListaItens, Nota, NumeroGrande,
  Pagination, Panel, PanelHeader, RodapeLista, RowMeta, RowTitle, Secao, Status, Table, Td, TextLink, Th, Tr,
} from '@/components/page';
import { deltaMoeda, moedaCurta, moedaInteira, pct, rotuloNum, rotuloPct } from '@/lib/painel-consolidado/calculo';
import { atencaoDosResumos, estadoDoBloco, juntarSinais, mesBarra, textoDoSinal, type Sinal } from '@/lib/painel-consolidado/visao';
import {
  assentado, chaveDe, instalada, lerAgendaResumo, lerAtencao, lerJurResumo, lerLinhas, lerPosicao, lerPubResumo, lerSaude,
  primeiroErro, pubSeAplica, useCarga, type Linha, type PropsBloco,
} from '../dados';
import { AvisoDoBloco } from '../pecas';

const NIVEIS = {
  SAUDAVEL: { rotulo: 'Saudável', tom: 'live', criterio: 'Em dia, dentro do limite e com crédito válido.' },
  ATENCAO: { rotulo: 'Em atenção', tom: 'attention', criterio: 'Atraso curto, limite quase todo usado ou crédito com validade vencida.' },
  RISCO: { rotulo: 'Risco', tom: 'alert', criterio: 'Atraso acima do que a política tolera.' },
} as const;

export function VisaoSaude({ f }: PropsBloco) {
  const c = useCarga(chaveDe('visao', f), async () => {
    const rs = await Promise.allSettled([lerPosicao(f), lerSaude(f), lerAtencao(f), lerAgendaResumo(f), lerJurResumo(f), lerPubResumo(f)]);
    const [posicao, saude, atencao, agenda, jur, pub] = rs.map(assentado) as [Linha | null, Linha | null, Linha[] | null, Linha[] | null, Linha | null, Linha | null];
    return { posicao, saude, atencao, agenda, jur, pub, erro: primeiroErro(rs.slice(0, 3)), erroResumos: primeiroErro(rs.slice(3)) };
  });
  if (c.carregando) return <Esqueleto altura="alta" />;
  if (c.erro || !c.dados) return <Alert tone="error">{c.erro}</Alert>;
  const { posicao: p, saude, atencao, agenda, jur, pub, erro, erroResumos } = c.dados;
  if (!p) return <Alert tone="error">{erro}</Alert>;

  const vazio = Number(p.clientes) === 0 && p.origem !== 'MANUAL';
  const estado = estadoDoBloco({ origem: String(p.origem), mes: f.mes, vazio });
  const ant = p.anterior as Linha | null;
  const metas = (p.metas || {}) as Linha;
  const dv = deltaMoeda(ant ? Number(p.vencido) - Number(ant.vencido) : null);
  const dIndice = ant && p.inadPct !== null && ant.inadPct !== null ? Number(p.inadPct) - Number(ant.inadPct) : null;
  const semValor = estado !== null;

  const sinais = juntarSinais((atencao || []) as Sinal[], atencaoDosResumos(agenda, jur, pub));
  const ausentes = [
    !instalada('ccCobAgendaResumo') && 'cobrança',
    !instalada('ccJurResumo') && 'jurídico',
    !instalada('ccPubResumo') && 'setor público',
  ].filter(Boolean);

  return (
    <Secao titulo="Visão geral e saúde da carteira" hint="Como está a carteira que você enxerga e o que pede ação agora.">
      <GradeKpi>
        <Kpi
          rotulo="Carteira"
          valor={semValor ? <Dash /> : moedaCurta(Number(p.total))}
          hint={semValor ? undefined : `${rotuloNum(Number(p.clientes))} clientes com saldo · a vencer ${moedaCurta(Number(p.aVencer))}`}
        />
        <Kpi
          rotulo="Saldo vencido"
          valor={semValor ? <Dash /> : moedaCurta(Number(p.vencido))}
          delta={semValor || dv.valor === null ? undefined : <Delta valor={dv.valor} sufixo={dv.sufixo} inverso />}
          hint={semValor ? undefined : `${moedaCurta(Number(p.vencido90))} acima de 90 dias (${rotuloPct(pct(Number(p.vencido90), Number(p.total)))})`}
        />
        <Kpi
          rotulo="Índice de inadimplência"
          valor={semValor ? <Dash /> : rotuloPct(p.inadPct as number | null)}
          delta={semValor || dIndice === null ? undefined : <Delta valor={dIndice} sufixo=" p.p." inverso />}
          hint={`meta até ${rotuloPct(Number(metas['meta.inadPct']), 0)}${ant ? ` · ${mesBarra(String(ant.mes))} ${rotuloPct(ant.inadPct as number | null)}` : ''}`}
        />
        <Kpi
          rotulo="PDD"
          valor={semValor ? <Dash /> : moedaCurta(Number(p.pdd))}
          hint={semValor ? undefined : `${rotuloPct(pct(Number(p.pdd), Number(p.total)))} da carteira · cobre ${rotuloPct(pct(Number(p.pdd), Number(p.vencido)))} do vencido`}
        />
      </GradeKpi>

      {estado ? <AvisoDoBloco estado={estado} /> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}

      {saude ? <Saude saude={saude} carteira={f.carteira} buId={f.buId} /> : null}

      <Panel>
        <PanelHeader title="Pontos de atenção" hint="Sinais com quantidade no recorte, na posição de hoje">
          <Badge tone={sinais.some((s) => s.gravidade === 'ALTA') ? 'alert' : sinais.length ? 'attention' : 'neutral'}>{sinais.length}</Badge>
        </PanelHeader>
        <CorpoPainel>
          {sinais.length ? (
            <LinhaUi>
              {sinais.map((s) => (
                <Badge key={s.tipo} tone={s.gravidade === 'ALTA' ? 'alert' : s.gravidade === 'MEDIA' ? 'attention' : 'neutral'}>{textoDoSinal(s)}</Badge>
              ))}
            </LinhaUi>
          ) : <Nota>Nenhum ponto de atenção no recorte.</Nota>}
          {ausentes.length ? <Nota>Módulo não instalado: {ausentes.join(', ')} — os sinais dele não entram.</Nota> : null}
          {!pubSeAplica(f) ? <Nota>Notas públicas e certidões não entram com a carteira {f.carteira === 'ESTETICA' ? 'Estética' : 'Privada'}.</Nota> : null}
          {erroResumos ? <Alert tone="error">{erroResumos}</Alert> : null}
        </CorpoPainel>
      </Panel>
    </Secao>
  );
}

function Saude({ saude, carteira, buId }: { saude: Linha; carteira: string; buId: number }) {
  const niveis = (saude.niveis || []) as Linha[];
  const totalSaldo = niveis.reduce((s, n) => s + Number(n.saldo || 0), 0);
  const [aberto, setAberto] = React.useState<string | null>(null);
  return (
    <>
      <LinhaUi entre>
        <Nota>Classificação da concessão de crédito, só clientes com crédito aprovado (órgão público não entra).</Nota>
        <Nota>
          Índice de saúde {rotuloPct(saude.indice as number | null)}
          {saude.faixa ? ` · faixa ${String(saude.faixa).toLowerCase()}` : ''}
        </Nota>
      </LinhaUi>
      <Grade colunas={3}>
        {niveis.map((n) => {
          const def = NIVEIS[n.nivel as keyof typeof NIVEIS];
          const maiores = (n.maiores || []) as Linha[];
          return (
            <Panel key={n.nivel}>
              <PanelHeader title={def.rotulo} hint={`${rotuloPct(pct(Number(n.saldo), totalSaldo))} do saldo classificado`}>
                <Status tone={def.tom}>{def.rotulo}</Status>
              </PanelHeader>
              <CorpoPainel>
                <div><NumeroGrande>{rotuloNum(Number(n.clientes))}</NumeroGrande> {Number(n.clientes) === 1 ? 'cliente' : 'clientes'} · <b>{moedaCurta(Number(n.saldo))}</b></div>
                <Nota>{def.criterio}</Nota>
              </CorpoPainel>
              <ListaItens>
                {maiores.map((m) => <ItemLista key={m.clienteId} titulo={m.nome} meta={m.sinais || 'sem sinal'} valor={moedaCurta(Number(m.saldo))} />)}
              </ListaItens>
              {Number(n.clientes) > 0 ? (
                <RodapeLista>
                  <TextLink onClick={() => setAberto(String(n.nivel))}>{Number(n.clientes) === 1 ? 'Ver o cliente' : `Ver os ${rotuloNum(Number(n.clientes))} clientes`}</TextLink>
                </RodapeLista>
              ) : null}
            </Panel>
          );
        })}
      </Grade>
      {aberto ? <ClientesDoNivel nivel={aberto} carteira={carteira} buId={buId} onFechar={() => setAberto(null)} /> : null}
    </>
  );
}

const POR_PAGINA = 20;

function ClientesDoNivel({ nivel, carteira, buId, onFechar }: { nivel: string; carteira: string; buId: number; onFechar: () => void }) {
  const [pagina, setPagina] = React.useState(1);
  const def = NIVEIS[nivel as keyof typeof NIVEIS];
  const c = useCarga(`saude|${nivel}|${carteira}|${pagina}`, async () => {
    const [lista, total] = await Promise.all([
      lerLinhas('ccCredSaudeListar', { carteira, saude: nivel, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      lerLinhas('ccCredSaudeTotal', { carteira, saude: nivel }),
    ]);
    return { lista, total: Number(total?.[0]?.TOTAL) || 0 };
  });
  const naoInstalado = !instalada('ccCredSaudeListar');
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clientes {def.rotulo === 'Risco' ? 'em risco' : def.rotulo.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Lista da concessão de crédito{carteira ? ` na carteira ${carteira.toLowerCase()}` : ''}.{buId >= 0 ? ' O filtro de BU não se aplica a esta lista.' : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {naoInstalado ? <EmptyState title="Módulo não instalado." /> : c.carregando ? <Esqueleto altura="baixa" /> : c.erro ? <Alert tone="error">{c.erro}</Alert> : (
            <>
              <Table>
                <thead>
                  <tr><Th>Cliente</Th><Th>Sinais</Th><Th numeric>Vencido</Th><Th numeric>Utilizado</Th><Th numeric>Atraso</Th></tr>
                </thead>
                <tbody>
                  {(c.dados?.lista || []).map((l) => (
                    <Tr key={l.CLIENTE_ID}>
                      <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>{l.CODCLI} · {l.ANALISTA_NOME || 'sem analista'}</RowMeta></Td>
                      <Td>{l.SAUDE_SINAIS || <Dash />}</Td>
                      <Td numeric>{moedaInteira(Number(l.VENCIDO))}</Td>
                      <Td numeric>{moedaInteira(Number(l.UTILIZADO))}<RowMeta>de {moedaInteira(Number(l.LIMITE))}</RowMeta></Td>
                      <Td numeric>{Number(l.DIAS_ATRASO) > 0 ? `${l.DIAS_ATRASO} dias` : <Dash />}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={pagina}
                lastPage={Math.max(1, Math.ceil((c.dados?.total || 0) / POR_PAGINA))}
                total={c.dados?.total || 0}
                unit="clientes"
                onPrevious={() => setPagina((x) => x - 1)}
                onNext={() => setPagina((x) => x + 1)}
              />
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
