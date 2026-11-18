// Visão gerencial, opção A (abas por pergunta), só com os blocos da 004: carteira, concessão (funil),
// pedidos/flexibilização e risco da concessão. Concentração por grupo, carteira por BU e top 10 são da 006:
// no lugar deles, o link para o Painel. Na Pública não há flexibilização nem risco por rating (E-4).
// Abrir: ccCredCreditoResumo + ccCredSolicitacaoTotal × 2 + a aba aberta (Carteira: ccCredSaudeResumo).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Carteira } from '@/lib/base/carteira';
import { linha, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import {
  Alert, BarrasPainel, Field, Grade, GradeGraficos, GradeKpi, Kpi, Pagination, Panel, PanelHeader, RowMeta,
  RowTitle, SelectMenu, Status, Table, Tabs, TabsList, TabsTrigger, Td, TextLink, Th, Toolbar, Tr,
} from '@/components/page';
import { rotuloFase } from '@/lib/concessao-credito/regras';
import { inteiro, lerTodas, n, pct, temMotorProprio, useLeitura, type Linha } from './dados';
import { Pares, Rating, Reais, Txt } from './pecas';

const filtroSol = (carteira: Carteira, situacao: string) => ({ carteira, faseChave: '', analistaId: 0, situacao, tipoPessoa: '', de: '', ate: '', busca: '' });
const POR_PAGINA = 20;

export default function VisaoGerencial({ carteira }: { carteira: Carteira }) {
  const navigate = useNavigate();
  const [aba, setAba] = useState('carteira');
  const topo = useLeitura(() => lerTodas([
    ['ccCredCreditoResumo', { carteira }],
    ['ccCredSolicitacaoTotal', filtroSol(carteira, 'ABERTA')],
    ['ccCredSolicitacaoTotal', filtroSol(carteira, 'DECIDIDA')],
  ]), [carteira]);
  const [[cr] = [], [abertas] = [], [decididas] = []] = topo.dados?.listas ?? [];
  const decididasQtd = n(decididas?.APROVADAS) + n(decididas?.RECUSADAS);
  const abas = [
    { id: 'carteira', rotulo: 'Carteira' },
    { id: 'concessao', rotulo: 'Concessão' },
    ...(temMotorProprio(carteira) ? [{ id: 'pedidos', rotulo: 'Pedidos acima do limite' }, { id: 'risco', rotulo: 'Risco da concessão' }] : []),
  ];

  return (
    <>
      {topo.erro || topo.dados?.erro ? <Alert tone="error">{topo.erro || topo.dados?.erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Limite concedido" valor={moeda(n(cr?.LIMITE_TOTAL))} hint={`${inteiro(cr?.VIGENTES)} créditos vigentes`} />
        <Kpi rotulo="Uso da carteira" valor={n(cr?.LIMITE_TOTAL) ? pct((n(cr?.UTILIZADO_TOTAL) / n(cr?.LIMITE_TOTAL)) * 100, 0) : '—'} hint={`${moeda(n(cr?.UTILIZADO_TOTAL))} utilizados`} />
        <Kpi rotulo="Deferimento" valor={decididasQtd ? pct((n(decididas?.APROVADAS) / decididasQtd) * 100, 0) : '—'} hint={`${inteiro(decididas?.APROVADAS)} de ${inteiro(decididasQtd)} solicitações decididas`} />
        <Kpi rotulo="Em análise" valor={inteiro(abertas?.TOTAL)} hint={`${moeda(n(abertas?.VALOR))} solicitados · ${inteiro(abertas?.ATRASADAS)} fora do SLA`} />
      </GradeKpi>
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList aria-label="Pergunta">
          {abas.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.rotulo}</TabsTrigger>)}
        </TabsList>
        {aba === 'carteira' ? <AbaCarteira carteira={carteira} cr={cr} /> : null}
        {aba === 'concessao' ? <AbaConcessao carteira={carteira} decididas={decididas} abertas={abertas} /> : null}
        {aba === 'pedidos' ? <AbaPedidos carteira={carteira} /> : null}
        {aba === 'risco' ? <AbaRisco carteira={carteira} /> : null}
      </Tabs>
      <Alert tone="info">
        Concentração por grupo econômico, carteira por BU e os dez maiores limites estão no{' '}
        <TextLink onClick={() => navigate('/painel')}>Painel consolidado</TextLink>.
      </Alert>
    </>
  );
}

function AbaCarteira({ carteira, cr }: { carteira: Carteira; cr?: Linha }) {
  const saude = useLeitura(
    () => (temMotorProprio(carteira) ? linhas('ccCredSaudeResumo', { carteira, agrupar: '' }) : Promise.resolve([] as Linha[])),
    [carteira],
  );
  const t = saude.dados?.[0];
  const total = n(t?.SAUDAVEL) + n(t?.ATENCAO) + n(t?.RISCO);
  const comPct = (v: unknown) => `${inteiro(v)}${total ? ` (${pct((n(v) / total) * 100, 0)})` : ''}`;
  return (
    <>
      {saude.erro ? <Alert tone="error">{saude.erro}</Alert> : null}
      <GradeGraficos>
        {temMotorProprio(carteira) ? (
          <BarrasPainel titulo="Saúde da carteira" hint={`clientes aprovados por situação de risco · ${inteiro(total)} clientes`}
            linhas={[{ NOME: 'Saudável', QTD: t?.SAUDAVEL }, { NOME: 'Em atenção', QTD: t?.ATENCAO }, { NOME: 'Risco', QTD: t?.RISCO }].filter(() => total > 0)}
            categoria="NOME" series={[{ chave: 'QTD', rotulo: 'Clientes', formato: (v) => comPct(v) }]} vazio="Sem créditos vigentes." />
        ) : null}
        <Panel>
          <PanelHeader title="Créditos em gestão" hint="Validade, vencidos e reanálise da carteira." />
          <Pares itens={[
            ['Créditos vigentes', inteiro(cr?.VIGENTES)],
            ['Vencem em 30 dias', inteiro(cr?.VENCENDO_30D)],
            ['Validade vencida', inteiro(cr?.VENCIDOS)],
            ['Em reanálise', inteiro(cr?.EM_REANALISE)],
            ['Cadastro obsoleto', inteiro(cr?.OBSOLETOS)],
          ]} />
        </Panel>
      </GradeGraficos>
      {temMotorProprio(carteira) ? (
        <RowMeta>Em atenção: atraso curto, uso do limite alto ou validade vencida. Risco: atraso acima do limite de risco.</RowMeta>
      ) : null}
    </>
  );
}

function AbaConcessao({ carteira, decididas, abertas }: { carteira: Carteira; decididas?: Linha; abertas?: Linha }) {
  const funil = useLeitura(() => linhas('ccCredEsteiraResumo', { carteira }), [carteira]);
  const decididasQtd = n(decididas?.APROVADAS) + n(decididas?.RECUSADAS);
  return (
    <>
      {funil.erro ? <Alert tone="error">{funil.erro}</Alert> : null}
      <Grade>
        <Panel>
          <PanelHeader title="Solicitações analisadas" hint="Deferidas + negadas = decididas." />
          <Pares itens={[
            ['Decididas', `${inteiro(decididasQtd)} · ${moeda(n(decididas?.VALOR))} solicitados`],
            ['Deferidas', `${inteiro(decididas?.APROVADAS)}${decididasQtd ? ` · ${pct((n(decididas?.APROVADAS) / decididasQtd) * 100, 0)}` : ''}`],
            ['Negadas', `${inteiro(decididas?.RECUSADAS)}${decididasQtd ? ` · ${pct((n(decididas?.RECUSADAS) / decididasQtd) * 100, 0)}` : ''}`],
            ['Em análise', `${inteiro(abertas?.TOTAL)} · ${moeda(n(abertas?.VALOR))}`],
          ]} />
        </Panel>
        <Panel>
          <PanelHeader title="Funil da esteira" hint="Solicitações em cada etapa e valor solicitado." />
          <Table>
            <thead><tr><Th>Etapa</Th><Th numeric>Quantidade</Th><Th numeric>Valor</Th><Th numeric>Fora do SLA</Th></tr></thead>
            <tbody>
              {(funil.dados ?? []).map((f) => (
                <Tr key={f.FASE_CHAVE}>
                  <Td>{rotuloFase(f.FASE_NOME)}</Td>
                  <Td numeric>{inteiro(f.QTD)}</Td>
                  <Td numeric><Reais v={f.VALOR} /></Td>
                  <Td numeric><Txt v={n(f.ATRASADAS) ? inteiro(f.ATRASADAS) : ''} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </Grade>
    </>
  );
}

function AbaPedidos({ carteira }: { carteira: Carteira }) {
  // Período inteiro, na carteira da aba.
  const flex = useLeitura(() => linha('ccCredFlexResumo', { carteira, de: '', ate: '' }), [carteira]);
  const f = flex.dados;
  const naMetaTaxa = f?.TAXA_PCT !== null && f?.TAXA_PCT !== undefined && n(f.TAXA_PCT) <= n(f.META_TAXA_PCT);
  const naMetaConf = f?.DENTRO_REGRA_PCT !== null && f?.DENTRO_REGRA_PCT !== undefined && n(f.DENTRO_REGRA_PCT) >= n(f.META_CONF_PCT);
  return (
    <>
      {flex.erro ? <Alert tone="error">{flex.erro}</Alert> : null}
      <Panel>
        <PanelHeader title="Pedidos acima do limite e flexibilização" hint="Pedidos acima do limite aprovado, já decididos." />
        <Pares itens={[
          ['Decididos', inteiro(f?.PEDIDOS)],
          ['Liberados (flexibilizados)', inteiro(f?.FLEXIBILIZADOS)],
          ['Taxa de flexibilização', f?.TAXA_PCT === null || f?.TAXA_PCT === undefined ? <Txt v="" /> : (
            <>{pct(f.TAXA_PCT, 0)} <Status tone={naMetaTaxa ? 'live' : 'alert'}>{naMetaTaxa ? 'Na meta' : 'Fora da meta'}</Status> <RowMeta>liberados ÷ decididos · meta até {pct(f.META_TAXA_PCT, 0)}</RowMeta></>
          )],
          ['Dentro da regra', f?.DENTRO_REGRA_PCT === null || f?.DENTRO_REGRA_PCT === undefined ? <Txt v="" /> : (
            <>{pct(f.DENTRO_REGRA_PCT, 0)} <Status tone={naMetaConf ? 'live' : 'alert'}>{naMetaConf ? 'Na meta' : 'Fora da meta'}</Status> <RowMeta>liberações dentro do teto flexível · meta a partir de {pct(f.META_CONF_PCT, 0)}</RowMeta></>
          )],
        ]} />
      </Panel>
    </>
  );
}

const ROTULO_CLASSE: Record<string, string> = { NAO_PREVISTO: 'Não previsto', ACEITO: 'Aceito' };

function AbaRisco({ carteira }: { carteira: Carteira }) {
  const [classe, setClasse] = useState('');
  const [pagina, setPagina] = useState(1);
  const resumo = useLeitura(() => lerTodas([
    ['ccCredRiscoResumo', { carteira, agrupar: '' }],
    ['ccCredRiscoResumo', { carteira, agrupar: 'RATING' }],
  ]), [carteira]);
  const [geral = [], porRating = []] = resumo.dados?.listas ?? [];
  const filtro = { carteira, classe, busca: '' };
  const total = useLeitura(() => linha('ccCredRiscoTotal', filtro), [carteira, classe]);
  const lista = useLeitura(() => linhas('ccCredRiscoListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), [carteira, classe, pagina]);
  const t = n(total.dados?.TOTAL);
  const da = (c: string) => geral.find((g) => g.CLASSE === c);
  const ratings = Object.values(porRating.reduce<Record<string, Linha>>((acc, l) => {
    const r = (acc[l.GRUPO] ??= { NOME: l.GRUPO_NOME || 'Sem rating', NAO_PREVISTO: 0, ACEITO: 0 });
    r[l.CLASSE] = n(l.CLIENTES);
    return acc;
  }, {}));
  return (
    <>
      {resumo.erro || resumo.dados?.erro || lista.erro ? <Alert tone="error">{resumo.erro || resumo.dados?.erro || lista.erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Risco não previsto" valor={inteiro(da('NAO_PREVISTO')?.CLIENTES)} hint={`${moeda(n(da('NAO_PREVISTO')?.LIMITE))} concedidos · aprovado AA, A ou B e hoje C ou pior`} />
        <Kpi rotulo="Risco aceito" valor={inteiro(da('ACEITO')?.CLIENTES)} hint={`${moeda(n(da('ACEITO')?.LIMITE))} concedidos · aprovado já com C ou pior`} />
        <Kpi rotulo="Exposição em risco" valor={moeda(geral.reduce((s, g) => s + n(g.UTILIZADO), 0))} hint="utilizado desses clientes" />
        <Kpi rotulo="Vencido em risco" valor={moeda(geral.reduce((s, g) => s + n(g.VENCIDO), 0))} hint="saldo vencido desses clientes" />
      </GradeKpi>
      <BarrasPainel titulo="Clientes de risco por rating na concessão" hint="rating congelado no dia da decisão" linhas={ratings} categoria="NOME"
        series={[{ chave: 'NAO_PREVISTO', rotulo: 'Não previsto' }, { chave: 'ACEITO', rotulo: 'Aceito' }]} empilhar largura="total" vazio="Nenhum cliente de risco." />
      <Panel>
        <PanelHeader title="Clientes de risco" hint="Não previsto: aprovado com AA, A ou B e hoje em C ou pior. Aceito: aprovado já com C ou pior." />
        <Toolbar>
          <Field label="Classificação">
            <SelectMenu label="Classificação" value={classe} onChange={(v) => { setClasse(v); setPagina(1); }}
              options={[{ value: '', label: 'Todas' }, { value: 'NAO_PREVISTO', label: 'Não previsto' }, { value: 'ACEITO', label: 'Aceito' }]} />
          </Field>
        </Toolbar>
        <Table>
          <thead><tr><Th>Classificação</Th><Th>Cliente</Th><Th>Rating na concessão</Th><Th>Rating atual</Th><Th numeric>Limite</Th><Th numeric>Utilizado</Th><Th numeric>Vencido</Th><Th numeric>Dias de atraso</Th><Th>Sinais</Th></tr></thead>
          <tbody>
            {(lista.dados ?? []).map((l) => (
              <Tr key={l.CLIENTE_ID}>
                <Td><Status tone={l.CLASSE === 'NAO_PREVISTO' ? 'alert' : 'attention'}>{ROTULO_CLASSE[l.CLASSE] ?? l.CLASSE}</Status></Td>
                <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>CODCLI {l.CODCLI}</RowMeta></Td>
                <Td><Rating r={l.RATING_CONCESSAO} /></Td>
                <Td><Rating r={l.RATING_ATUAL} /></Td>
                <Td numeric><Reais v={l.LIMITE} /></Td>
                <Td numeric><Reais v={l.UTILIZADO} /></Td>
                <Td numeric><Reais v={l.VENCIDO} /></Td>
                <Td numeric><Txt v={n(l.DIAS_ATRASO) ? inteiro(l.DIAS_ATRASO) : ''} /></Td>
                <Td><Txt v={l.CRIT_MOTIVOS || l.ALERTAS} /></Td>
              </Tr>
            ))}
            {!(lista.dados ?? []).length ? <Tr><Td colSpan={9}><RowMeta>Nenhum cliente de risco nesta classificação.</RowMeta></Td></Tr> : null}
          </tbody>
        </Table>
        <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(t / POR_PAGINA))} total={t} unit={t === 1 ? 'cliente' : 'clientes'}
          onPrevious={() => setPagina((x) => x - 1)} onNext={() => setPagina((x) => x + 1)} />
      </Panel>
    </>
  );
}
