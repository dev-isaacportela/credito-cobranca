// Aba Visão gerencial (T-220, opção C "Abas por pergunta"): 4 números sempre à vista, o resumo, 4 abas de indicadores
// (Carteira, Recuperação e acordos, Custos, Prazos e andamento) com os gráficos da carteira, e os indicadores por etapa.
// Uma leitura de ccJurIndicadores (RF-030, RF-031); faixa e valores vêm do servidor.

import { useState } from 'react';
import { acao } from '@/lib/mitra-api';
import {
  AbasDoPainel, Alert, BarrasPainel, Button, Dash, GradeGraficos, GradeKpi, Kpi, Nota, PageHeader, Panel,
  PanelHeader, Status, Table, Tabs, TabsContent, TabsTrigger, Td, Th, Tr,
} from '@/components/page';
import { baixar, brl, FILTRO_GESTAO, hojeLocal, mil, nomeCurto, num, pct, useDados, type Linha, type PropsAba } from './comum';
import { FiltrosGestao } from './FiltrosGestao';

const GRUPOS = [
  { id: 'carteira', rotulo: 'Carteira', chaves: ['01', '02', '03', '04', '20'] },
  { id: 'recuperacao', rotulo: 'Recuperação e acordos', chaves: ['05', '06', '07', '08', '21', '22', '24'] },
  { id: 'custos', rotulo: 'Custos', chaves: ['09', '10', '11', '12'] },
  { id: 'prazos', rotulo: 'Prazos e andamento', chaves: ['13', '14', '15', '16', '17', '18', '19', '23'] },
];
const MOEDA = ['02', '05', '07', '09', '12'];
const PCT = ['06', '10', '18', '21', '22', '23'];
const FAIXA: Record<string, { tom: 'live' | 'attention' | 'alert'; texto: string }> = {
  bom: { tom: 'live', texto: 'Bom' }, atencao: { tom: 'attention', texto: 'Atenção' }, ruim: { tom: 'alert', texto: 'Ruim' },
};
const mostrar = (i: Linha) => (MOEDA.includes(i.chave) ? brl(i.valor) : PCT.includes(i.chave) ? pct(i.valor)
  : i.chave === '11' ? `${num(i.valor).toLocaleString('pt-BR')} vezes` : i.chave === '20' ? `${num(i.valor).toLocaleString('pt-BR')} anos`
    : num(i.valor).toLocaleString('pt-BR'));
/** A coluna "Leitura": os extras que o servidor manda junto do indicador. */
const leitura = (i: Linha) => [
  i.ticket !== undefined && `ticket médio ${brl(i.ticket)}`, i.carteira !== undefined && `carteira ativa ${brl(i.carteira)}`,
  i.total !== undefined && brl(i.total), i.quantidade !== undefined && `${i.quantidade} acordo(s)`, i.parcelas !== undefined && `${i.parcelas} parcela(s)`,
  i.processos !== undefined && `${i.processos} processo(s) com custo`,
].filter(Boolean).join(' · ');

export default function VisaoGerencial({ abas }: PropsAba) {
  const [filtro, setFiltro] = useState(FILTRO_GESTAO);
  const [grupo, setGrupo] = useState('carteira');
  const ind = useDados(() => acao('ccJurIndicadores', { de: '', ate: '', ...filtro }), JSON.stringify(filtro));
  const r: Linha = ind.dados?.ok ? ind.dados : {};
  const lista: Linha[] = r.indicadores ?? [];
  const i = (k: string): Linha => lista.find((x) => x.chave === k) ?? {};
  const faixa = (k: string) => (FAIXA[i(k).faixa] ? <Status tone={FAIXA[i(k).faixa].tom}>{FAIXA[i(k).faixa].texto}</Status> : null);
  const etapas: Linha[] = r.porEtapa ?? [];
  const cortes: Linha = r.cortes ?? {};

  function exportar() {
    const linhasCsv = [['Nº', 'Indicador', 'Valor', 'Leitura', 'Situação'], ...lista.map((x) => [x.chave, x.nome, mostrar(x), leitura(x), FAIXA[x.faixa]?.texto ?? ''])];
    baixar(`indicadores-juridico-${hojeLocal()}.csv`, `\uFEFF${linhasCsv.map((l) => l.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(';')).join('\r\n')}\r\n`);
  }

  return (
    <>
      <PageHeader module="Jurídico" title="Visão gerencial" description="Quatro números sempre à vista; cada aba responde a uma pergunta."
        actions={<Button variant="secondary" disabled={!lista.length} onClick={exportar}>Exportar indicadores</Button>} />
      {abas}
      <FiltrosGestao filtro={filtro} onFiltro={setFiltro} />
      {ind.erro || (ind.dados && !ind.dados.ok) ? <Alert tone="error">{ind.erro || String(ind.dados?.error)}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Em andamento" valor={`${num(i('01').valor)} · ${mil(i('02').valor)}`} hint={`carteira ativa ${brl(i('02').carteira) || 'R$ 0,00'} · ${num(i('03').valor)} a ajuizar`} />
        <Kpi rotulo="Taxa de recuperação" valor={pct(i('06').valor)} delta={faixa('06')} hint={`${brl(i('05').valor) || 'R$ 0,00'} recuperados`} />
        <Kpi rotulo="Custo ÷ valor" valor={pct(i('10').valor)} delta={faixa('10')} hint={`${brl(i('09').valor) || 'R$ 0,00'} · retorno de ${num(i('11').valor).toLocaleString('pt-BR')} vezes`} />
        <Kpi rotulo="Prazos vencidos" valor={num(i('13').valor)} delta={faixa('13')} hint={`mais ${num(i('14').valor)} nos próximos 7 dias`} />
      </GradeKpi>
      {r.resumo ? <Alert tone="info">{r.resumo}</Alert> : null}

      <Panel>
        <Tabs value={grupo} onValueChange={setGrupo}>
          <AbasDoPainel>
            {GRUPOS.map((g) => <TabsTrigger key={g.id} value={g.id}>{`${g.rotulo} ${g.chaves.length}`}</TabsTrigger>)}
          </AbasDoPainel>
          {GRUPOS.map((g) => (
            <TabsContent key={g.id} value={g.id}>
              <Table>
                <thead><tr><Th>Nº</Th><Th>Indicador</Th><Th numeric>Valor</Th><Th>Leitura</Th><Th>Situação</Th></tr></thead>
                <tbody>
                  {g.chaves.map((k) => (
                    <Tr key={k}>
                      <Td>{k}</Td>
                      <Td>{i(k).nome ?? <Dash />}</Td>
                      <Td numeric>{i(k).nome ? mostrar(i(k)) : <Dash />}</Td>
                      <Td>{leitura(i(k)) || <Dash />}</Td>
                      <Td>{faixa(k) ?? <Dash />}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </Panel>

      {grupo === 'carteira' ? (
        <GradeGraficos>
          <BarrasPainel titulo="Por etapa" hint="valor em R$; a quantidade está nos indicadores por etapa" categoria="etapa" vazio="Nenhum processo ativo."
            linhas={etapas.map((e) => ({ ...e, etapa: nomeCurto(e.faseChave) }))} series={[{ chave: 'valor', rotulo: 'Valor', formato: (v) => brl(v) }]} />
          <BarrasPainel titulo="Filial, setor e linha" hint="valor dos ativos em R$" categoria="rotulo" vazio="Nenhum processo ativo."
            linhas={[...(cortes.filial ?? []).map((x: Linha) => ({ ...x, rotulo: `Filial ${x.rotulo}` })), ...(cortes.carteiraLinha ?? [])]}
            series={[{ chave: 'valor', rotulo: 'Valor', formato: (v) => brl(v) }]} />
          <BarrasPainel titulo="Tribunal e faixa de valor" hint="quantidade de processos" categoria="rotulo" vazio="Nenhum processo ativo."
            linhas={[...(cortes.tribunal ?? []), ...(cortes.faixa ?? [])]} series={[{ chave: 'qtd', rotulo: 'Processos' }]} />
          <BarrasPainel titulo="Ano dos autos" hint="quantidade de processos ajuizados" categoria="rotulo" vazio="Nenhum processo ajuizado."
            linhas={cortes.ano ?? []} series={[{ chave: 'qtd', rotulo: 'Processos' }]} />
        </GradeGraficos>
      ) : null}

      <Panel>
        <PanelHeader title="Indicadores por etapa" hint="processos ativos" />
        {!etapas.length ? <Nota>{ind.carregando ? 'Carregando…' : 'Nenhum processo ativo.'}</Nota> : (
          <Table>
            <thead>
              <tr><Th>Etapa</Th><Th numeric>Qtd.</Th><Th numeric>Valor</Th><Th numeric>Dias sem andamento</Th><Th numeric>Parados +30 d</Th><Th numeric>Prazos vencidos</Th><Th numeric>Custo</Th></tr>
            </thead>
            <tbody>
              {etapas.map((e) => (
                <Tr key={e.faseChave}>
                  <Td>{e.nome}</Td>
                  <Td numeric>{e.qtd}</Td>
                  <Td numeric>{brl(e.valor)}</Td>
                  <Td numeric>{e.diasMedios}</Td>
                  <Td numeric>{num(e.parados30) || <Dash />}</Td>
                  <Td numeric>{num(e.prazosVencidos) || <Dash />}</Td>
                  <Td numeric>{num(e.custo) ? brl(e.custo) : <Dash />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
