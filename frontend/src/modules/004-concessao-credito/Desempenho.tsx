// Desempenho, opção A (três alturas), com os rótulos da RN-031: "decididas no prazo" (não passagens),
// tempo de decisão em dias, aprovação e pedidos; período 30/90/365 dias ou tudo. Abrir: ccCredDesempenho.

import { useState } from 'react';
import type { Carteira } from '@/lib/base/carteira';
import { acao } from '@/lib/mitra-api';
import {
  Alert, BarrasPainel, Field, GradeGraficos, GradeKpi, Kpi, Panel, PanelHeader, RowTitle, SelectMenu, Table, Td,
  Th, Toolbar, Tr,
} from '@/components/page';
import { rotuloFase } from '@/lib/concessao-credito/regras';
import { inteiro, n, pct, useLeitura, type Linha } from './dados';
import { Txt } from './pecas';
import { somarDias } from '@/lib/base/dias-uteis';
import { hojeDaSessao } from '@/lib/base/hoje';

const PERIODOS = [{ value: '30', label: 'Últimos 30 dias' }, { value: '90', label: 'Últimos 90 dias' }, { value: '365', label: 'Últimos 12 meses' }, { value: '', label: 'Tudo' }];

// O período conta a partir de hoje pelo relógio do servidor (`ccBaseSessao.hoje`).
const desde = (dias: string) => (dias ? somarDias(hojeDaSessao(), -Number(dias)) : '');
const dias = (v: unknown) => (v === null || v === undefined ? '' : `${n(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias`);
const horas = (v: unknown) => (v === null || v === undefined ? '' : `${n(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`);

export default function Desempenho({ carteira }: { carteira: Carteira }) {
  const [periodo, setPeriodo] = useState('90');
  const d = useLeitura(async () => {
    const r = await acao('ccCredDesempenho', { carteira, de: desde(periodo), ate: '' });
    if (r.ok === false) throw new Error(String(r.error ?? 'Falha ao ler.'));
    return r;
  }, [carteira, periodo]);
  const k = (d.dados?.kpis ?? {}) as Linha;
  const analistas = (d.dados?.analistas ?? []) as Linha[];
  const fases = ((d.dados?.fases ?? []) as Linha[]).map((f) => ({ ...f, NOME: rotuloFase(f.nome), MEDIA: n(f.mediaHoras) / 24, SLA: n(f.slaHoras) / 24 }));
  const responsaveis = (d.dados?.responsaveis ?? []) as Linha[];
  const fmtDias = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d`;

  return (
    <>
      {d.erro ? <Alert tone="error">{d.erro}</Alert> : null}
      <Panel>
        <Toolbar>
          <Field label="Período">
            <SelectMenu label="Período" value={periodo} onChange={setPeriodo} options={PERIODOS} />
          </Field>
        </Toolbar>
      </Panel>
      <GradeKpi>
        <Kpi rotulo="Decididas no prazo" valor={pct(k.slaPct, 0) || '—'} hint={`meta ${pct(k.metaSlaPct, 0)} · ${inteiro(k.noPrazo)} de ${inteiro(k.decididas)} decididas`} />
        <Kpi rotulo="Tempo médio de decisão" valor={dias(k.tempoMedio) || '—'} hint={`da solicitação à decisão · meta ${inteiro(k.metaTempoDias)} dias`} />
        <Kpi rotulo="Taxa de aprovação" valor={pct(k.aprovacaoPct, 0) || '—'} hint={`faixa da meta ${pct(k.metaAprovacaoMin, 0)} a ${pct(k.metaAprovacaoMax, 0)}`} />
        <Kpi rotulo="Pedidos decididos" valor={inteiro(k.pedidos)} hint={`tempo médio ${horas(k.pedidoTempoMedioHoras) || '—'} · ${inteiro(k.foraDoPrazo)} solicitações fora do prazo agora`} />
      </GradeKpi>
      <GradeGraficos>
        <BarrasPainel titulo="Decididas no prazo por analista" hint={`% das decididas no período · meta ${pct(k.metaSlaPct, 0)}`}
          linhas={analistas.map((a) => ({ ...a, NOME: a.nome }))} categoria="NOME" series={[{ chave: 'slaPct', rotulo: 'No prazo (%)', formato: (v) => pct(v, 0) }]}
          vazio="Nenhuma decisão no período." />
        <BarrasPainel titulo="Tempo médio por etapa × SLA" hint="saídas de etapa no período; etapa em curso não entra"
          linhas={fases} categoria="NOME" series={[{ chave: 'MEDIA', rotulo: 'Tempo médio', formato: fmtDias }, { chave: 'SLA', rotulo: 'SLA da etapa', formato: fmtDias }]}
          vazio="Nenhuma saída de etapa no período." />
      </GradeGraficos>
      <Panel>
        <PanelHeader title="Desempenho por analista" />
        <Table>
          <thead><tr><Th>Analista</Th><Th numeric>Decididas</Th><Th numeric>No prazo</Th><Th numeric>% no prazo</Th><Th numeric>Tempo médio</Th><Th numeric>Aprovação</Th><Th numeric>Fora do prazo agora</Th></tr></thead>
          <tbody>
            {analistas.map((a) => (
              <Tr key={a.analistaId}>
                <Td><RowTitle>{a.nome}</RowTitle></Td>
                <Td numeric>{inteiro(a.decididas)}</Td>
                <Td numeric>{inteiro(a.noPrazo)}</Td>
                <Td numeric><Txt v={pct(a.slaPct, 0)} /></Td>
                <Td numeric><Txt v={dias(a.tempoMedio)} /></Td>
                <Td numeric><Txt v={pct(a.aprovacaoPct, 0)} /></Td>
                <Td numeric>{inteiro(a.foraDoPrazo)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Panel>
        <PanelHeader title="Decisões por responsável" hint="As decididas no período, agrupadas por quem decidiu na alçada." />
        <Table>
          <thead><tr><Th>Responsável</Th><Th numeric>Decididas</Th><Th numeric>% no prazo</Th><Th numeric>Tempo médio</Th><Th numeric>Aprovação</Th></tr></thead>
          <tbody>
            {responsaveis.map((r) => (
              <Tr key={r.responsavelId}>
                <Td><RowTitle>{r.nome}</RowTitle></Td>
                <Td numeric>{inteiro(r.decididas)}</Td>
                <Td numeric><Txt v={pct(r.slaPct, 0)} /></Td>
                <Td numeric><Txt v={dias(r.tempoMedio)} /></Td>
                <Td numeric><Txt v={pct(r.aprovacaoPct, 0)} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
