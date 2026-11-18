// Aba Custos dos processos (T-218, opção A "Painel de números"): 7 números, o aviso das custas sem lançamento, os
// gráficos com visão de tabela (evolução de 12 meses por grupo, composição, maiores, custo × recuperado, cortes por
// tipo, filial, BU e etapa), a tabela por processo e "Lançar custo". Tudo de ccJurIndicadores.custos (uma leitura).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acao, linhas } from '@/lib/mitra-api';
import {
  Alert, BarrasPainel, Button, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, EmptyState, GradeGraficos, GradeKpi, Item, Kpi, ListaItens, MetaDot, PageHeader, Panel,
  PanelHeader, Resto, RowMeta, RowTitle, SearchInput, Stat, Status, Table, Td, Th, Tr,
} from '@/components/page';
import { brl, ehJur, FILTRO_GESTAO, GRUPOS_CUSTO, nomeCurto, normalizarBusca, num, pct, rotuloCusto, FILTRO_PROCESSO, useDados, useEspera, useLimiares, type Linha, type PropsAba } from './comum';
import { CustoDialog } from './card/CustoDialog';
import { FiltrosGestao } from './FiltrosGestao';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const reais = (v: number) => brl(v);
const FAIXA: Record<string, { tom: 'live' | 'attention' | 'alert'; texto: string }> = {
  bom: { tom: 'live', texto: 'Bom' }, atencao: { tom: 'attention', texto: 'Atenção' }, ruim: { tom: 'alert', texto: 'Ruim' },
};

export default function CustosAba({ membro, abas }: PropsAba) {
  const navigate = useNavigate();
  const jur = ehJur(membro);
  const [filtro, setFiltro] = useState(FILTRO_GESTAO);
  const [escolher, setEscolher] = useState(false);
  const [lancarEm, setLancarEm] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState('');
  const chave = JSON.stringify(filtro);
  const ind = useDados(() => acao('ccJurIndicadores', { de: '', ate: '', ...filtro }), chave);
  const custas = useDados(() => acao('ccJurAlertas', { ...filtro, tipo: 'custas' }), `custas:${chave}`);
  const r: Linha = ind.dados?.ok ? ind.dados : {};
  const c: Linha = r.custos ?? {};
  const n: Linha = c.numeros ?? {};
  const i = (k: string): Linha => (r.indicadores ?? []).find((x: Linha) => x.chave === k) ?? {};
  const semLancamento: Linha[] = custas.dados?.ok ? custas.dados.linhas ?? [] : [];
  const processos: Linha[] = c.porProcesso ?? [];
  const faixa = FAIXA[i('10').faixa];
  const lim = useLimiares();

  return (
    <>
      <PageHeader module="Jurídico" title="Custos dos processos" description="Custas, honorários, diligências e outros custos lançados nos processos."
        actions={<Button variant="primary" disabled={!jur} title={jur ? undefined : 'Só o Jurídico lança custo.'} onClick={() => setEscolher(true)}>Lançar custo</Button>}
        meta={<><Stat>{processos.length}</Stat> processos com custo<MetaDot /><Stat>{n.custasSemLancamento ?? 0}</Stat> em custas sem lançamento</>} />
      {abas}
      <FiltrosGestao filtro={filtro} onFiltro={setFiltro} />
      {ind.erro || (ind.dados && !ind.dados.ok) ? <Alert tone="error">{ind.erro || String(ind.dados?.error)}</Alert> : null}
      {aviso ? <Alert tone="success">{aviso}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Custo total" valor={brl(n.total) || <Dash />} hint={`${processos.length} processo(s) com custo`} />
        <Kpi rotulo="No mês" valor={brl(n.mes) || <Dash />} />
        <Kpi rotulo="A pagar" valor={brl(n.aPagar) || <Dash />}
          hint={`${num(n.aPagarAntigo) ? `${num(n.aPagarAntigo)} antigo(s) · ` : ''}pago: ${brl(num(n.total) - num(n.aPagar))}`} />
        <Kpi rotulo="Custo ÷ valor" valor={pct(n.custoValorPct)} delta={faixa ? <Status tone={faixa.tom}>{faixa.texto}</Status> : null} hint={`meta até ${lim.meta}% do valor em cobrança`} />
        <Kpi rotulo="Retorno sobre o custo" valor={`${num(n.retorno).toLocaleString('pt-BR')} vezes`} hint={`${brl(i('05').valor) || 'R$ 0,00'} recuperados`} />
        <Kpi rotulo="Custo médio" valor={brl(n.medio) || <Dash />} hint="por processo com custo" />
        <Kpi rotulo="Documentação" valor={pct(n.documentacaoPct)} hint={`${num(n.semGuia)} sem guia · ${num(n.semComprovante)} pago(s) sem comprovante`} />
      </GradeKpi>
      {semLancamento.length ? (
        <Alert tone="warn">
          {`Custas sem lançamento: ${semLancamento.map((a) => a.cliente).join(', ')} — em Custas e protocolo sem custo de custas processuais. Lance a guia.`}
        </Alert>
      ) : null}
      <GradeGraficos>
        <BarrasPainel titulo="Evolução dos últimos 12 meses" hint="R$ por mês, empilhado por grupo" largura="total" empilhar categoria="MES" vazio="Sem custo nos últimos 12 meses."
          linhas={(c.porMesGrupo ?? []).map((m: Linha) => ({ ...m, MES: `${MESES[Number(String(m.mes).slice(5, 7)) - 1]}/${String(m.mes).slice(2, 4)}` }))}
          series={Object.entries(GRUPOS_CUSTO).map(([chave, rotulo]) => ({ chave, rotulo, formato: reais }))} />
        <BarrasPainel titulo="Composição por grupo" hint="R$ lançados" categoria="rotulo" vazio="Nenhum custo lançado."
          linhas={(c.porGrupo ?? []).map((g: Linha) => ({ ...g, rotulo: GRUPOS_CUSTO[g.rotulo] ?? g.rotulo }))} series={[{ chave: 'valor', rotulo: 'Custo', formato: reais }]} />
        <BarrasPainel titulo="Maiores processos por custo" hint="custo e % do valor em cobrança" categoria="cliente" vazio="Nenhum custo lançado."
          linhas={c.maiores ?? []} series={[{ chave: 'custo', rotulo: 'Custo', formato: reais }]} />
        <BarrasPainel titulo="Custo × recuperado" hint="por processo, em R$" categoria="cliente" vazio="Nenhum processo com custo ou recuperado."
          linhas={c.custoRecuperado ?? []} series={[{ chave: 'recuperado', rotulo: 'Recuperado', formato: reais }, { chave: 'custo', rotulo: 'Custo', formato: reais }]} />
        <BarrasPainel titulo="Por tipo, filial, BU e etapa" hint="R$ lançados" categoria="rotulo" vazio="Nenhum custo lançado."
          linhas={[
            ...(c.porTipo ?? []).map((x: Linha) => ({ ...x, rotulo: rotuloCusto(x.rotulo) })),
            ...(c.porFilial ?? []).map((x: Linha) => ({ ...x, rotulo: `Filial ${x.rotulo}` })),
            ...(c.porBu ?? []).map((x: Linha) => ({ ...x, rotulo: `BU ${x.rotulo}` })),
            ...(c.porEtapa ?? []).map((x: Linha) => ({ ...x, rotulo: nomeCurto(x.rotulo) })),
          ]} series={[{ chave: 'valor', rotulo: 'Custo', formato: reais }]} />
      </GradeGraficos>
      <Panel>
        <PanelHeader title="Custo total por processo" hint="% do valor em cobrança e o recuperado" />
        {!processos.length ? <EmptyState title={ind.carregando ? 'Carregando…' : 'Nenhum processo com custo.'} /> : (
          <Table>
            <thead><tr><Th>Processo</Th><Th numeric>Total</Th><Th numeric>% do valor</Th><Th numeric>Recuperado</Th><Th /></tr></thead>
            <tbody>
              {processos.map((p) => (
                <Tr key={p.processoId}>
                  <Td><RowTitle>{p.cliente}</RowTitle><RowMeta>{`${brl(p.valor)} em cobrança`}</RowMeta></Td>
                  <Td numeric>{brl(p.custo)}</Td>
                  <Td numeric>{pct(p.pct)}</Td>
                  <Td numeric>{num(p.recuperado) ? brl(p.recuperado) : <Dash />}</Td>
                  <Td numeric>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/juridico/processos/${p.processoId}`)}>Abrir</Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <EscolherProcesso aberto={escolher} onFechar={() => setEscolher(false)} onEscolher={(p) => { setEscolher(false); setLancarEm(p); }} />
      {lancarEm ? (
        <CustoDialog aberto processoId={num(lancarEm.ID)} cardId={num(lancarEm.CARD_ID)} onFechar={() => setLancarEm(null)}
          onFeito={(texto) => { setLancarEm(null); setAviso(`${texto} (${lancarEm.NOME_DEVEDOR})`); ind.recarregar(); custas.recarregar(); }} />
      ) : null}
    </>
  );
}

/** Escolha do processo para "Lançar custo" (busca por cliente ou autos, só ativos). */
function EscolherProcesso({ aberto, onFechar, onEscolher }: { aberto: boolean; onFechar: () => void; onEscolher: (p: Linha) => void }) {
  const [texto, setTexto] = useState('');
  const busca = useEspera(texto);
  const lista = useDados(async () => (aberto ? linhas('ccJurProcessoListar', { ...FILTRO_PROCESSO, busca: normalizarBusca(busca), limite: 8, offset: 0 }) : []),
    `${aberto}:${busca}`);
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar custo</DialogTitle>
          <DialogDescription>Escolha o processo.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <SearchInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cliente ou número dos autos" aria-label="Buscar processo" />
          {lista.erro ? <Alert tone="error">{lista.erro}</Alert> : null}
          <ListaItens>
            {(lista.dados ?? []).filter((p) => !p.ENCERRADO_EM).map((p) => (
              <Item key={p.ID}>
                <Resto><RowTitle>{p.NOME_DEVEDOR}</RowTitle><RowMeta>{`${nomeCurto(p.FASE_CHAVE)} · ${p.AUTOS || 'sem autos'}`}</RowMeta></Resto>
                <Button size="sm" onClick={() => onEscolher(p)}>Escolher</Button>
              </Item>
            ))}
          </ListaItens>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
