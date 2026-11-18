// As cinco abas da carteira na visão gerencial (T-078): faixa de atraso, etapa da régua, BU, ações/acordos/baixas e
// concentração. Cada aba pede o seu dado na primeira vez que é aberta; a faixa e as ações usam o que a tela já leu.

import { useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import {
  Alert, Code, Dash, EmptyState, Grade, GradeKpi, Kpi, Panel, PanelHeader, RowTitle, Table, Tabs, TabsContent,
  TabsList, TabsTrigger, Td, Th, Tr,
} from '@/components/page';
import { brl, num, pct, RETORNOS, useDados, type Linha } from '../comum';

type Recorte = { carteira: string; buId: number; agenteId: number; de: string; ate: string };
const CONT = ['PROMESSA', 'PAGOU', 'NEGOCIACAO', 'CONTESTOU', 'SEM_RETORNO', 'RECUSOU', 'AGUARDANDO'];

export function AbasDaCarteira({ recorte, k, aging }: { recorte: Recorte; k: Linha | null; aging: Linha[] }) {
  const [aba, setAba] = useState('faixa');
  const [vistas, setVistas] = useState(['faixa']);
  const trocar = (a: string) => { setAba(a); setVistas((v) => (v.includes(a) ? v : [...v, a])); };
  return (
    <Panel>
      <PanelHeader title="A carteira que a equipe cobra" hint="O mesmo vencido, por faixa de atraso, etapa da régua e BU, e o que saiu das ações." />
      <Tabs value={aba} onValueChange={trocar}>
        <TabsList>
          <TabsTrigger value="faixa">Por faixa de atraso</TabsTrigger>
          <TabsTrigger value="etapa">Por etapa da régua</TabsTrigger>
          <TabsTrigger value="bu">Por BU</TabsTrigger>
          <TabsTrigger value="acoes">Ações, acordos e baixas</TabsTrigger>
          <TabsTrigger value="concentracao">Concentração</TabsTrigger>
        </TabsList>
        <TabsContent value="faixa"><Faixa k={k} aging={aging} /></TabsContent>
        <TabsContent value="etapa">{vistas.includes('etapa') ? <Etapa recorte={recorte} /> : null}</TabsContent>
        <TabsContent value="bu">{vistas.includes('bu') ? <PorBu recorte={recorte} /> : null}</TabsContent>
        <TabsContent value="acoes"><Acoes k={k} /></TabsContent>
        <TabsContent value="concentracao">{vistas.includes('concentracao') ? <Concentracao recorte={recorte} /> : null}</TabsContent>
      </Tabs>
    </Panel>
  );
}

function Faixa({ k, aging }: { k: Linha | null; aging: Linha[] }) {
  return (
    <>
      {k ? (
        <GradeKpi>
          <Kpi rotulo="Acima de 90 dias" valor={num(k.ACIMA_90) > 0 ? brl(k.ACIMA_90) : <Dash />} hint={`${num(k.ACIMA_90_CLIENTES)} clientes`} />
          <Kpi rotulo="Vencem em até 5 dias" valor={num(k.VENCE_5D) > 0 ? brl(k.VENCE_5D) : <Dash />} hint={`${num(k.VENCE_5D_CLIENTES)} clientes`} />
          <Kpi rotulo="Clientes bloqueados" valor={num(k.BLOQUEADOS)} hint={`${brl(k.BLOQUEADOS_VALOR)} · ${num(k.BLOQUEIO_TOTAL)} com bloqueio total`} />
          <Kpi rotulo="Dias médios de atraso" valor={num(k.DIAS_MEDIO) || <Dash />} />
        </GradeKpi>
      ) : null}
      <Table>
        <thead><tr><Th>Faixa</Th><Th numeric>Clientes</Th><Th numeric>Valor</Th><Th numeric>% da carteira</Th><Th numeric>% do vencido</Th><Th numeric>PDD</Th></tr></thead>
        <tbody>
          {aging.map((a) => (
            <Tr key={a.ORDEM}>
              <Td><RowTitle>{a.FAIXA}</RowTitle></Td>
              <Td numeric>{num(a.CLIENTES)}</Td>
              <Td numeric>{num(a.VALOR) > 0 ? brl(a.VALOR) : <Dash />}</Td>
              <Td numeric>{pct(a.PCT_CARTEIRA)}</Td>
              <Td numeric>{num(a.ORDEM) === 0 ? <Dash /> : pct(a.PCT_VENCIDO)}</Td>
              <Td numeric>{num(a.PDD) > 0 ? brl(a.PDD) : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function Etapa({ recorte }: { recorte: Recorte }) {
  const d = useDados(() => linhas('ccCobQuadroResumo', { carteira: recorte.carteira, agenteId: recorte.agenteId, buId: recorte.buId }), JSON.stringify(recorte));
  const total = (d.dados ?? []).reduce((s, f) => s + num(f.VENCIDO), 0);
  if (d.erro) return <Alert tone="error">{d.erro}</Alert>;
  return (
    <Table>
      <thead><tr><Th>Etapa</Th><Th numeric>Clientes</Th><Th numeric>Saldo vencido</Th><Th numeric>Distribuição do saldo</Th></tr></thead>
      <tbody>
        {(d.dados ?? []).filter((f) => num(f.CASOS) > 0).map((f) => (
          <Tr key={f.FASE_CHAVE}>
            <Td><RowTitle>{f.FASE_NOME}</RowTitle></Td>
            <Td numeric>{num(f.CASOS)}</Td>
            <Td numeric>{num(f.VENCIDO) > 0 ? brl(f.VENCIDO) : <Dash />}</Td>
            <Td numeric>{total > 0 ? pct((num(f.VENCIDO) / total) * 100) : <Dash />}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

function PorBu({ recorte }: { recorte: Recorte }) {
  const d = useDados(() => linhas('ccCobPainelBu', { carteira: recorte.carteira, buId: recorte.buId, agenteId: recorte.agenteId }), JSON.stringify(recorte));
  if (d.erro) return <Alert tone="error">{d.erro}</Alert>;
  if (!(d.dados ?? []).length) return d.carregando ? null : <EmptyState title="Nenhuma BU com saldo neste recorte." />;
  return (
    <>
      <Table>
        <thead><tr><Th>BU</Th><Th numeric>Saldo vencido</Th><Th numeric>A vencer</Th><Th numeric>Participação</Th><Th numeric>Índice</Th><Th numeric>Clientes em atraso</Th><Th numeric>Acima de 90 dias</Th></tr></thead>
        <tbody>
          {(d.dados ?? []).map((b) => (
            <Tr key={b.BU_ID}>
              <Td><RowTitle>{b.BU_NOME}</RowTitle></Td>
              <Td numeric>{num(b.VENCIDO) > 0 ? brl(b.VENCIDO) : <Dash />}</Td>
              <Td numeric>{num(b.A_VENCER) > 0 ? brl(b.A_VENCER) : <Dash />}</Td>
              <Td numeric>{pct(b.PARTICIPACAO_PCT)}</Td>
              <Td numeric>{pct(b.INAD_PCT)}</Td>
              <Td numeric>{num(b.CLIENTES_ATRASO)}</Td>
              <Td numeric>{num(b.ACIMA_90) > 0 ? brl(b.ACIMA_90) : <Dash />}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Alert tone="info">Índice = vencido ÷ carteira da própria BU. Participação = parte da BU no vencido da carteira.</Alert>
    </>
  );
}

function Acoes({ k }: { k: Linha | null }) {
  if (!k) return null;
  const contatos = num(k.CONTATOS);
  return (
    <Grade>
      <Panel>
        <PanelHeader title="Resultado das ações" hint={`${contatos} contatos no período`} />
        <Table>
          <tbody>
            {CONT.map((c, i) => (
              <Tr key={c}><Td>{RETORNOS[i]}</Td><Td numeric>{num(k[`CONT_${c}`])}{contatos ? ` · ${pct((num(k[`CONT_${c}`]) / contatos) * 100)}` : ''}</Td></Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Panel>
        <PanelHeader title="Acordos de pagamento" />
        <Table>
          <tbody>
            <Tr><Td>Acordos ativos</Td><Td numeric>{num(k.ACORDOS_ATIVOS)} · {brl(k.ACORDOS_ATIVOS_VALOR)}</Td></Tr>
            <Tr><Td>Em dia</Td><Td numeric>{num(k.ACORDOS_EM_DIA)}</Td></Tr>
            <Tr><Td>Com parcela vencida</Td><Td numeric>{num(k.ACORDOS_PARCELA_VENCIDA)}</Td></Tr>
            <Tr><Td>Quebrados no período</Td><Td numeric>{num(k.ACORDOS_QUEBRADOS)} · {brl(k.ACORDOS_QUEBRADOS_VALOR)}</Td></Tr>
            <Tr><Td>Parcelas nos próximos 30 dias</Td><Td numeric>{num(k.PARCELAS_30D)} · {brl(k.PARCELAS_30D_VALOR)}</Td></Tr>
          </tbody>
        </Table>
        <PanelHeader title="Baixas como perda" />
        <Table>
          <tbody>
            <Tr><Td>Pendentes: gerente financeiro</Td><Td numeric>{num(k.BAIXAS_PEND_GERENTE)} · {brl(k.BAIXAS_PEND_GERENTE_VALOR)}</Td></Tr>
            <Tr><Td>Pendentes: Diretoria</Td><Td numeric>{num(k.BAIXAS_PEND_ACIMA)} · {brl(k.BAIXAS_PEND_ACIMA_VALOR)}</Td></Tr>
            <Tr><Td>Aguardando parecer do Jurídico</Td><Td numeric>{num(k.BAIXAS_SEM_PARECER)}</Td></Tr>
            <Tr><Td>Baixado no período</Td><Td numeric>{num(k.BAIXADO_PERIODO) > 0 ? `${brl(k.BAIXADO_PERIODO)} · ${num(k.BAIXADO_CLIENTES)} clientes` : <Dash />}</Td></Tr>
          </tbody>
        </Table>
      </Panel>
    </Grade>
  );
}

function Concentracao({ recorte }: { recorte: Recorte }) {
  const d = useDados(async () => {
    const top = await linhas('ccCobPainelTopDevedores', { carteira: recorte.carteira, buId: recorte.buId, agenteId: recorte.agenteId, limite: 10 });
    // As duas linhas de concentração são da 006 (D-013): sem a SF publicada, não aparecem.
    const r = await acao('ccPainelConcentracao', { base: 'VENCIDO', mes: '', carteira: recorte.carteira, buId: recorte.buId }).catch(() => null);
    const porCliente = r && r.ok !== false ? r.porCliente : null;
    const ate80 = porCliente ? (porCliente.linhas ?? []).findIndex((l: Linha) => num(l.pctAcum) >= 80) + 1 : 0;
    return { top, da006: porCliente ? { ate80, hhi: num(porCliente.hhi), faixa: String(porCliente.hhiFaixa ?? '') } : null };
  }, JSON.stringify(recorte));
  if (d.erro) return <Alert tone="error">{d.erro}</Alert>;
  const top = d.dados?.top ?? [];
  if (!top.length) return d.carregando ? null : <EmptyState title="Nenhum devedor neste recorte." />;
  const soma = (n: number) => top.slice(0, n).reduce((s, l) => s + num(l.PARTICIPACAO_PCT), 0);
  const c = d.dados?.da006;
  return (
    <>
      <GradeKpi>
        <Kpi rotulo="Maior devedor" valor={pct(top[0].PARTICIPACAO_PCT)} hint={`${top[0].CLIENTE_NOME} · ${brl(top[0].VENCIDO)}`} />
        <Kpi rotulo="5 maiores" valor={pct(soma(5))} hint="do vencido" />
        <Kpi rotulo="10 maiores" valor={pct(soma(10))} hint="do vencido" />
        {c ? <Kpi rotulo="Somam 80% do vencido" valor={c.ate80 || <Dash />} hint={`índice de concentração ${c.hhi.toLocaleString('pt-BR')}${c.faixa ? ` · ${c.faixa}` : ''}`} /> : null}
      </GradeKpi>
      <Table>
        <thead><tr><Th>Cliente</Th><Th>Grupo econômico</Th><Th numeric>Vencido</Th><Th numeric>Participação</Th></tr></thead>
        <tbody>
          {top.map((l) => (
            <Tr key={l.CLIENTE_ID}>
              <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle> <Code>{l.CODCLI}</Code></Td>
              <Td>{l.GRUPO_ECONOMICO || <Dash />}</Td>
              <Td numeric>{brl(l.VENCIDO)}</Td>
              <Td numeric>{pct(l.PARTICIPACAO_PCT)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
