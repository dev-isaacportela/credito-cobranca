// Aba "Títulos do Winthor" do card (T-065, RF-018): os títulos abertos ao vivo e, a pedido, o valor atualizado com
// multa, juros e correção (ccCobEncargosCalcular). Os encargos ficam guardados por caso enquanto a tela está aberta (PA-14).

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { acao } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, Dash, EmptyState, GradeKpi, Kpi, PanelHeader, Status, Table, Td, Th, Tr,
} from '@/components/page';
import { brl, erroDe, num, useDados, type Linha } from '../comum';
import { useFicha } from '../ficha';

const encargosPorCaso = new Map<number, Linha>();

export function AbaTitulos(ctx: ExtensaoContexto) {
  const { ficha } = useFicha(ctx.card.id);
  const clienteId = ficha?.cliente.id ?? 0;
  const carteira = ficha?.caso.carteira ?? '';
  const casoId = ficha?.caso.id ?? 0;
  const titulos = useDados(async () => (clienteId ? acao('ccBaseTitulosAbertos', { clienteId, carteira, soVencidos: 0, membroId: 0 }) : null), `${clienteId}:${carteira}`);
  const [encargos, setEncargos] = useState<Linha | null>(() => encargosPorCaso.get(casoId) ?? null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');

  if (!ficha) return <Alert tone="info">Carregando a situação do caso…</Alert>;
  const r = titulos.dados;
  const lista: Linha[] = r?.linhas ?? [];
  const enc = encargos ?? encargosPorCaso.get(casoId) ?? null;

  async function calcular() {
    setCalculando(true);
    setErro('');
    try {
      const e = await acao('ccCobEncargosCalcular', { clienteId, carteira, data: '', titulos: '', membroId: 0 });
      if (e.ok === false) setErro(String(e.error));
      else { encargosPorCaso.set(casoId, e); setEncargos(e); }
    } catch (x) {
      setErro(erroDe(x));
    } finally {
      setCalculando(false);
    }
  }

  return (
    <>
      <PanelHeader title="Títulos em aberto" hint="Lido do Winthor agora. O sistema não altera títulos.">
        <Button size="sm" onClick={calcular} disabled={calculando || !lista.length}>{enc ? 'Recalcular valor atualizado' : 'Calcular valor atualizado'}</Button>
      </PanelHeader>
      {titulos.erro || r?.ok === false ? <Alert tone="error">{titulos.erro || r?.error}</Alert> : null}
      {r?.erroWinthor || enc?.erroWinthor ? <Alert tone="warn">{r?.erroWinthor || enc?.erroWinthor}</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {enc && !enc.erroWinthor ? (
        <GradeKpi>
          <Kpi rotulo="Valor atualizado" valor={brl(enc.total)} hint={`principal ${brl(enc.principal)} em ${fmtData(enc.data)}`} />
          <Kpi rotulo="Multa" valor={brl(enc.multa)} />
          <Kpi rotulo="Juros" valor={brl(enc.juros)} />
          <Kpi rotulo="Correção" valor={brl(enc.correcao)} />
        </GradeKpi>
      ) : null}
      {lista.length ? (
        <Table>
          <thead><tr><Th>Título</Th><Th>Emissão</Th><Th>Vencimento</Th><Th numeric>Dias de atraso</Th><Th numeric>Saldo</Th><Th numeric>Atualizado</Th><Th>Situação</Th></tr></thead>
          <tbody>
            {lista.map((t) => {
              const e = enc?.linhas?.find((l: Linha) => String(l.TITULO) === String(t.TITULO) && String(l.PARCELA) === String(t.PARCELA));
              const vencido = num(t.DIAS_ATRASO) > 0;
              return (
                <Tr key={t.CHAVE}>
                  <Td>{t.NUMNOTA ? `NF ${t.NUMNOTA}` : t.TITULO}{t.PARCELA ? `/${t.PARCELA}` : ''}</Td>
                  <Td>{fmtData(t.EMISSAO)}</Td>
                  <Td>{fmtData(t.VENCIMENTO)}</Td>
                  <Td numeric>{vencido ? num(t.DIAS_ATRASO) : <Dash />}</Td>
                  <Td numeric>{brl(t.SALDO)}</Td>
                  <Td numeric>{e ? brl(e.TOTAL) : <Dash />}</Td>
                  <Td><Status tone={vencido ? 'alert' : 'off'}>{vencido ? 'Vencido' : 'A vencer'}</Status></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      ) : titulos.carregando ? null : <EmptyState title="Nenhum título em aberto nesta carteira." />}
    </>
  );
}
