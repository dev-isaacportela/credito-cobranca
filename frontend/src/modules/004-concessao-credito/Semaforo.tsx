// Semáforo de crédito, opção A (cinco abas): faixas, simulador, carteira por faixa, validação do farol e
// clientes por farol. Só Privado e Estética (E-4). "Registrar revisão" só para quem administra (a recusa
// de verdade é do servidor). Abrir: ccCredCalibracaoRevisaoListar + ccCredFarolCarteira + parâmetros farol = 3.

import { useState, type ChangeEvent } from 'react';
import type { Carteira } from '@/lib/base/carteira';
import { podeAdministrar } from '@/lib/base/menu';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import {
  Alert, BarrasPainel, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, EmptyState, Field, GradeKpi, Input, Kpi, LabelledField, PageHeader, Pagination, Panel,
  PanelHeader, Pilha, RowMeta, RowTitle, SelectMenu, Status, Table, Tabs, TabsList, TabsTrigger, Td, Textarea,
  Th, Toolbar, Tr,
} from '@/components/page';
import { faixasDoFarol } from '@/lib/concessao-credito/regras';
import { executar, inteiro, lerTodas, n, nivel2, pct, useLeitura, useMembro, type Linha } from './dados';
import { Pares, Rating, Reais, Txt } from './pecas';

const CARTEIRAS_MOTOR = [{ value: 'PRIVADA', label: 'Privado' }, { value: 'ESTETICA', label: 'Estética' }];
const ABAS = [
  { id: 'faixas', rotulo: 'Faixas do semáforo' }, { id: 'simulador', rotulo: 'Simulador de limite' }, { id: 'carteira', rotulo: 'Carteira por faixa' },
  { id: 'validacao', rotulo: 'Validação do farol' }, { id: 'clientes', rotulo: 'Clientes por farol' },
];
const data = (v: unknown) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '');

// Guarda da rota (o menu já exige N2): quem não lê o semáforo vê o aviso, sem chamar SF (a recusa de verdade é do servidor).
export default function Semaforo() {
  const membro = useMembro();
  if (!nivel2(membro)) {
    return (
      <>
        <PageHeader module="Crédito e Cobrança" title="Semáforo de crédito" />
        <Panel>
          <EmptyState title="Sem acesso ao semáforo de crédito." hint="A validação e a revisão do semáforo são do supervisor para cima." />
        </Panel>
      </>
    );
  }
  return <SemaforoN2 />;
}

function SemaforoN2() {
  const membro = useMembro();
  const [carteira, setCarteira] = useState<Carteira>('PRIVADA');
  const [aba, setAba] = useState('faixas');
  const [revisar, setRevisar] = useState(false);
  const topo = useLeitura(() => lerTodas([
    ['ccCredCalibracaoRevisaoListar', {}],
    ['ccCredFarolCarteira', { carteira }],
  ]), [carteira]);
  const [revisoes = [], porFaixa = []] = topo.dados?.listas ?? [];
  const ultima = revisoes[0];
  const clientes = porFaixa.reduce((s, l) => s + n(l.CLIENTES), 0);
  const bons = porFaixa.filter((l) => l.RATING === 'AA' || l.RATING === 'A');
  const limiteTotal = porFaixa.reduce((s, l) => s + n(l.LIMITE), 0);
  const administra = podeAdministrar(membro);

  return (
    <>
      <PageHeader
        module="Crédito e Cobrança"
        title="Semáforo de crédito"
        description="Classificação de risco por score para clientes privados e da Estética. Limite sugerido = cálculo da política × percentual da faixa, com teto sobre o faturamento."
        actions={
          <Button variant="primary" onClick={() => setRevisar(true)} disabled={!administra}
            title={administra ? undefined : 'Só quem administra a política registra a revisão do semáforo.'}>
            Registrar revisão
          </Button>
        }
      />
      <Tabs value={aba} onValueChange={setAba}>
        <Pilha>
        {topo.erro || topo.dados?.erro ? <Alert tone="error">{topo.erro || topo.dados?.erro}</Alert> : null}
        {!ultima ? (
          <Alert tone="warn">Nenhuma revisão do semáforo registrada. Revise os cortes de score e os percentuais de cada faixa e registre a revisão com parecer.</Alert>
        ) : Number(ultima.VENCIDA) ? (
          <Alert tone="warn">
            Revisão do semáforo vencida (última em {data(ultima.REVISADO_EM)}, por {ultima.POR_NOME || '—'}; a próxima era em {data(ultima.PROXIMA)}).
            Revise os cortes de score e os percentuais de cada faixa e registre a revisão com parecer.
          </Alert>
        ) : (
          <RowMeta>Última revisão em {data(ultima.REVISADO_EM)} por {ultima.POR_NOME || '—'} · próxima até {data(ultima.PROXIMA)}.</RowMeta>
        )}
        <Panel>
          <Toolbar>
            <Field label="Carteira">
              <SelectMenu label="Carteira" value={carteira} onChange={(v) => setCarteira(v as Carteira)} options={CARTEIRAS_MOTOR} />
            </Field>
          </Toolbar>
        </Panel>
        <GradeKpi>
          <Kpi rotulo="Clientes no semáforo" valor={inteiro(clientes)} hint="com limite ativo" />
          <Kpi rotulo="Em AA e A" valor={inteiro(bons.reduce((s, l) => s + n(l.CLIENTES), 0))}
            hint={clientes ? `${pct((bons.reduce((s, l) => s + n(l.CLIENTES), 0) / clientes) * 100, 0)} dos clientes · ${limiteTotal ? pct((bons.reduce((s, l) => s + n(l.LIMITE), 0) / limiteTotal) * 100, 0) : '—'} da carteira` : 'sem clientes'} />
          <Kpi rotulo="Rebaixados por alerta" valor={inteiro(porFaixa.reduce((s, l) => s + n(l.REBAIXADOS), 0))} hint="faixa abaixo da que o score daria" />
          <Kpi rotulo="Limite na carteira" valor={moeda(limiteTotal)} hint={`${moeda(porFaixa.reduce((s, l) => s + n(l.VENCIDO), 0))} vencidos`} />
        </GradeKpi>
        <TabsList variant="line" aria-label="Assunto">
          {ABAS.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.rotulo}</TabsTrigger>)}
        </TabsList>
        {aba === 'faixas' ? <AbaFaixas carteira={carteira} /> : null}
        {aba === 'simulador' ? <AbaSimulador carteira={carteira} /> : null}
        {aba === 'carteira' ? <AbaCarteira porFaixa={porFaixa} /> : null}
        {aba === 'validacao' ? <AbaValidacao carteira={carteira} /> : null}
        {aba === 'clientes' ? <AbaClientes carteira={carteira} /> : null}
        {revisoes.length ? (
          <Panel>
            <PanelHeader title="Histórico de revisões" />
            <Table>
              <thead><tr><Th>Revisada em</Th><Th>Por</Th><Th>Parecer</Th><Th>Próxima</Th></tr></thead>
              <tbody>
                {revisoes.map((r) => (
                  <Tr key={r.ID}>
                    <Td>{data(r.REVISADO_EM)}</Td>
                    <Td><Txt v={r.POR_NOME} /></Td>
                    <Td>{r.PARECER}</Td>
                    <Td>{data(r.PROXIMA)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        ) : null}
        </Pilha>
      </Tabs>
      {revisar ? <DialogoRevisao onFechar={() => setRevisar(false)} onFeito={() => { setRevisar(false); topo.recarregar(); }} /> : null}
    </>
  );
}

function DialogoRevisao({ onFechar, onFeito }: { onFechar: () => void; onFeito: () => void }) {
  const [parecer, setParecer] = useState('');
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const gravar = async () => {
    setGravando(true);
    const e = await executar('ccCredCalibracaoRevisar', { parecer });
    setGravando(false);
    if (e) setErro(e);
    else onFeito();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar revisão do semáforo</DialogTitle>
          <DialogDescription>A leitura do farol de hoje fica guardada com o parecer. Mudança de corte ou percentual se faz nos parâmetros, com vigência.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <LabelledField label="Parecer" obrigatorio>
            <Textarea rows={5} value={parecer} onChange={(e) => setParecer(e.target.value)} />
          </LabelledField>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={gravar} disabled={gravando || !parecer.trim()}>Registrar revisão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AbaFaixas({ carteira }: { carteira: Carteira }) {
  const params = useLeitura(() => linhas('ccBaseParametroListar', { grupo: 'farol', carteira, data: '' }), [carteira]);
  const p = Object.fromEntries((params.dados ?? []).map((l) => [l.CHAVE, l.VALOR_EFETIVO]));
  const faixas = params.dados?.length ? faixasDoFarol(p) : [];
  return (
    <>
      {params.erro ? <Alert tone="error">{params.erro}</Alert> : null}
      <Panel>
        <PanelHeader title="Faixas do semáforo" hint="A faixa é a pior entre a do score final e a do atraso; cada alerta rebaixa uma faixa. E só se alcança por atraso ou rebaixamento." />
        <Table>
          <thead><tr><Th>Faixa</Th><Th>Score final</Th><Th>Atraso</Th><Th>Limite sugerido</Th><Th>Teto</Th><Th>Prazo máximo</Th><Th>Inadimplência esperada</Th></tr></thead>
          <tbody>
            {faixas.map((f) => (
              <Tr key={f.faixa}>
                <Td><Rating r={f.faixa} /></Td>
                <Td>{f.score}</Td>
                <Td>{f.atraso}</Td>
                <Td>{f.limite}</Td>
                <Td><Txt v={f.teto} /></Td>
                <Td><Txt v={f.prazo} /></Td>
                <Td><Txt v={f.inad} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}

const ALERTAS_SIM: [string, string][] = [['NEGATIVACAO', 'Negativação'], ['DADOS', 'Dados inconsistentes'], ['PEDIDO', 'Pedido fora da realidade'], ['PROTESTO', 'Protesto'], ['PROCESSO', 'Processo relevante']];

function AbaSimulador({ carteira }: { carteira: Carteira }) {
  const [f, setF] = useState({ scoreSerasa: '700', diasAtraso: '0', prazoMedio: '30', compraMedia: '20000', fatMensal: '200000' });
  const [alertas, setAlertas] = useState<string[]>([]);
  const [r, setR] = useState<Linha | null>(null);
  const [erro, setErro] = useState('');
  const campo = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const simular = async () => {
    setErro('');
    const entradas = {
      carteira, scoreSerasa: num(f.scoreSerasa), diasAtraso: num(f.diasAtraso) ?? 0, prazoMedio: num(f.prazoMedio) ?? 0, compraMedia: num(f.compraMedia) ?? 0,
      fatMensal: num(f.fatMensal), alertas: alertas.filter((a) => a !== 'PROTESTO' && a !== 'PROCESSO'),
      consultas: { protesto: alertas.includes('PROTESTO') ? 'COM' : 'SEM', processo: alertas.includes('PROCESSO') ? 'COM' : 'SEM' },
    };
    try {
      const res = await acao('ccCredMotorCalcular', { solicitacaoId: 0, gravar: 0, entradas: JSON.stringify(entradas) });
      if (res.ok === false) { setErro(String(res.error ?? 'O motor recusou.')); setR(null); } else setR(res);
    } catch (e) {
      setErro((e as Error).message);
    }
  };
  const d = (r?.detalhes ?? {}) as Linha;
  return (
    <>
      <Panel>
        <PanelHeader title="Simulador de limite" hint="Simulação: nada é gravado." />
        <Toolbar>
          <LabelledField label="Score Serasa (0 a 1000)"><Input inputMode="numeric" value={f.scoreSerasa} onChange={campo('scoreSerasa')} /></LabelledField>
          <LabelledField label="Dias de atraso"><Input inputMode="numeric" value={f.diasAtraso} onChange={campo('diasAtraso')} /></LabelledField>
          <LabelledField label="Prazo médio (dias)"><Input inputMode="numeric" value={f.prazoMedio} onChange={campo('prazoMedio')} /></LabelledField>
          <LabelledField label="Compra média mensal (R$)"><Input inputMode="decimal" value={f.compraMedia} onChange={campo('compraMedia')} /></LabelledField>
          <LabelledField label="Faturamento mensal (R$)"><Input inputMode="decimal" value={f.fatMensal} onChange={campo('fatMensal')} /></LabelledField>
        </Toolbar>
        <Toolbar>
          <Field label="Alertas para simular">
            <Toolbar>
              {ALERTAS_SIM.map(([k, rotulo]) => {
                const ligado = alertas.includes(k);
                return (
                  <Button key={k} size="sm" variant={ligado ? 'primary' : 'secondary'} aria-pressed={ligado}
                    onClick={() => setAlertas((a) => (ligado ? a.filter((x) => x !== k) : [...a, k]))}>{rotulo}</Button>
                );
              })}
            </Toolbar>
          </Field>
          <Button variant="primary" onClick={simular}>Simular</Button>
        </Toolbar>
      </Panel>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {r ? (
        <Panel>
          <PanelHeader title="Resultado" hint="Simulação: nada é gravado."><Rating r={r.rating} /></PanelHeader>
          <Pares itens={[
            ['Limite sugerido', <Reais v={r.limiteSugerido} zeroEhDado />],
            ['Resultado', <Txt v={r.resultado} />],
            ['Score final', <Txt v={r.score === null || r.score === undefined ? '' : inteiro(r.score)} />],
            ['Faixa pelo score', <Rating r={d.faixaScore} />],
            ['Faixa pelo atraso', <Rating r={d.faixaAtraso} />],
            ['Rebaixamento por alerta', d.rebaixado ? 'Sim' : 'Não'],
            ['Cálculo do limite', <Txt v={(d.limite as Linha | undefined)?.como} />],
            ['Alertas', <Txt v={((r.alertas ?? []) as string[]).join(' · ')} />],
          ]} />
          {((d.avisos ?? []) as string[]).map((a) => <Alert key={a} tone="info">{a}</Alert>)}
        </Panel>
      ) : null}
    </>
  );
}

function AbaCarteira({ porFaixa }: { porFaixa: Linha[] }) {
  return (
    <BarrasPainel titulo="Carteira por faixa" hint="clientes com limite ativo, pela faixa atual" largura="total"
      linhas={porFaixa.map((l) => ({ ...l, NOME: `${l.RATING} · ${inteiro(l.CLIENTES)} ${n(l.CLIENTES) === 1 ? 'cliente' : 'clientes'}` }))} categoria="NOME"
      series={[{ chave: 'LIMITE', rotulo: 'Limite', formato: (v) => moeda(v) }, { chave: 'UTILIZADO', rotulo: 'Utilizado', formato: (v) => moeda(v) }, { chave: 'VENCIDO', rotulo: 'Vencido', formato: (v) => moeda(v) }]}
      vazio="Nenhum cliente com limite ativo." />
  );
}

const TOM_LEITURA = (l: Linha): 'live' | 'attention' | 'alert' | 'off' => {
  const t = String(l.leitura ?? '').toLowerCase();
  if (t.startsWith('dentro')) return 'live';
  if (t.startsWith('fora') || t.startsWith('acima')) return 'alert';
  return 'off';
};

function AbaValidacao({ carteira }: { carteira: Carteira }) {
  const v = useLeitura(async () => {
    const r = await acao('ccCredFarolValidacao', { carteira });
    if (r.ok === false) throw new Error(String(r.error ?? 'Falha ao ler.'));
    return r;
  }, [carteira]);
  const leituras = (v.dados?.leituras ?? []) as Linha[];
  return (
    <>
      {v.erro ? <Alert tone="error">{v.erro}</Alert> : null}
      {v.dados?.aviso ? <Alert tone="warn">{String(v.dados.aviso)}</Alert> : null}
      <Panel>
        <PanelHeader title="Validação do farol" hint={`Índice de inadimplência por faixa nos últimos ${inteiro(v.dados?.mesesDeBase)} meses de foto. Se uma faixa melhor atrasa mais que a seguinte, ou passa do esperado, o corte precisa ser recalibrado.`} />
        <Table>
          <thead><tr><Th>Faixa</Th><Th numeric>Índice de inadimplência</Th><Th numeric>Esperado até</Th><Th>Leitura</Th></tr></thead>
          <tbody>
            {leituras.map((l) => (
              <Tr key={String(l.faixa)}>
                <Td><Rating r={l.faixa} /></Td>
                <Td numeric><Txt v={l.indice === null || l.indice === undefined ? '' : pct(l.indice)} /></Td>
                <Td numeric><Txt v={l.esperado === null || l.esperado === undefined ? '' : pct(l.esperado, 0)} /></Td>
                <Td><Status tone={TOM_LEITURA(l)}>{String(l.leitura ?? '')}</Status></Td>
              </Tr>
            ))}
            {!leituras.length ? <Tr><Td colSpan={4}><RowMeta>{v.dados?.semLeitura ? String(v.dados.semLeitura) : 'Sem foto mensal para ler.'}</RowMeta></Td></Tr> : null}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}

const POR_PAGINA = 20;

function AbaClientes({ carteira }: { carteira: Carteira }) {
  const [rating, setRating] = useState('');
  const [rebaixado, setRebaixado] = useState('-1');
  const [pagina, setPagina] = useState(1);
  const filtro = { carteira, rating, rebaixado: Number(rebaixado), busca: '' };
  const total = useLeitura(() => linha('ccCredFarolClienteTotal', filtro), [carteira, rating, rebaixado]);
  const lista = useLeitura(() => linhas('ccCredFarolClienteListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), [carteira, rating, rebaixado, pagina]);
  const t = n(total.dados?.TOTAL);
  return (
    <Panel>
      {lista.erro ? <Alert tone="error">{lista.erro}</Alert> : null}
      <Toolbar>
        <Field label="Faixa">
          <SelectMenu label="Faixa" value={rating} onChange={(x) => { setRating(x); setPagina(1); }}
            options={[{ value: '', label: 'Todas as faixas' }, ...['AA', 'A', 'B', 'C', 'D', 'E'].map((x) => ({ value: x, label: x }))]} />
        </Field>
        <Field label="Rebaixamento">
          <SelectMenu label="Rebaixamento" value={rebaixado} onChange={(x) => { setRebaixado(x); setPagina(1); }}
            options={[{ value: '-1', label: 'Todos' }, { value: '1', label: 'Rebaixados por alerta' }, { value: '0', label: 'Sem rebaixamento' }]} />
        </Field>
      </Toolbar>
      <Table>
        <thead><tr><Th>Cliente</Th><Th numeric>Score final</Th><Th>Farol</Th><Th>Rebaixado por</Th><Th numeric>Limite atual</Th><Th numeric>Sugerido pelo farol</Th><Th>Situação</Th><Th numeric>Saldo vencido</Th></tr></thead>
        <tbody>
          {(lista.dados ?? []).map((l) => (
            <Tr key={l.CLIENTE_ID}>
              <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>CODCLI {l.CODCLI}</RowMeta></Td>
              <Td numeric><Txt v={l.SCORE_FINAL === null || l.SCORE_FINAL === undefined ? '' : inteiro(l.SCORE_FINAL)} /></Td>
              <Td><Rating r={l.RATING_ATUAL} extra={Number(l.REBAIXADO) ? 'rebaixado' : undefined} /></Td>
              <Td><Txt v={Number(l.REBAIXADO) ? l.ALERTAS : ''} /></Td>
              <Td numeric><Reais v={l.LIMITE} /></Td>
              <Td numeric>{['D', 'E'].includes(String(l.RATING_ATUAL)) ? 'Sem crédito a prazo' : <Reais v={l.LIMITE_SUGERIDO} />}</Td>
              <Td>{Number(l.ACIMA_SUGERIDO) ? <Status tone="attention">{moeda(n(l.LIMITE) - n(l.LIMITE_SUGERIDO))} acima</Status> : <Status tone="off">Dentro do sugerido</Status>}</Td>
              <Td numeric><Reais v={l.VENCIDO} /></Td>
            </Tr>
          ))}
          {!(lista.dados ?? []).length ? <Tr><Td colSpan={8}><RowMeta>Nenhum cliente nesta faixa.</RowMeta></Td></Tr> : null}
        </tbody>
      </Table>
      <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(t / POR_PAGINA))} total={t} unit={t === 1 ? 'cliente' : 'clientes'}
        onPrevious={() => setPagina((x) => x - 1)} onNext={() => setPagina((x) => x + 1)} />
    </Panel>
  );
}
