// Um bloco por agente, agrupado por supervisor (visão gerencial C, T-077, D-014): os números do agente contra a meta.

import {
  Card, CardTitle, Dash, Grade, Panel, PanelHeader, RowMeta, Status, Table, Td, Tr,
} from '@/components/page';
import type { Grupo } from '@/lib/cobranca-privada/gerencial';
import { brl, num, pct, type Linha } from '../comum';

/** Contra a meta: inadimplência melhora caindo (até a meta); promessas, subindo. */
const tomMeta = (valor: number, meta: number, ateMeta: boolean) => (!meta ? 'off' : (ateMeta ? valor <= meta : valor >= meta) ? 'live' : 'attention');

export function BlocosPorSupervisor({ grupos, k }: { grupos: Grupo[]; k: Linha | null }) {
  const vencidoTotal = num(k?.VENCIDO);
  const metaInad = num(k?.META_INAD);
  const metaProm = num(k?.META_PROMESSA);
  return grupos.map((g) => (
    <Panel key={g.supervisorId}>
      <PanelHeader title={g.supervisorNome ? `Equipe de ${g.supervisorNome}` : 'Sem supervisor'}
        hint={`${g.clientesAtraso} clientes em atraso · ${brl(g.vencido)} vencidos · ${brl(g.recuperado)} recuperados · ${g.acoesAtrasadas} ações atrasadas`} />
      <Card>
        <Grade>
          {(g.agentes as Linha[]).map((a) => (
            <Card key={a.AGENTE_ID}>
              <CardTitle>{a.AGENTE_NOME}</CardTitle>
              <RowMeta>
                {vencidoTotal > 0 ? `${pct((num(a.VENCIDO) / vencidoTotal) * 100)} do vencido da carteira · ` : ''}
                {brl(a.VENCIDO)} vencidos · {num(a.CLIENTES_ATRASO)} clientes em atraso
              </RowMeta>
              <Table>
                <tbody>
                  <Tr><Td>Índice de inadimplência</Td><Td numeric><Status tone={tomMeta(num(a.INAD_PCT), metaInad, true)}>{pct(a.INAD_PCT)}{metaInad ? ` · meta até ${pct(metaInad)}` : ''}</Status></Td></Tr>
                  <Tr><Td>Promessas cumpridas</Td><Td numeric>{num(a.PROMESSAS) ? <Status tone={tomMeta(num(a.PROMESSAS_CUMPRIDAS_PCT), metaProm, false)}>{pct(a.PROMESSAS_CUMPRIDAS_PCT)}{metaProm ? ` · meta ${pct(metaProm)}` : ''}</Status> : <Dash />}</Td></Tr>
                  <Tr><Td>Contatos no período</Td><Td numeric>{num(a.CONTATOS)}</Td></Tr>
                  <Tr><Td>Promessas no período</Td><Td numeric>{num(a.PROMESSAS)}</Td></Tr>
                  <Tr><Td>Recuperado no período</Td><Td numeric>{num(a.RECUPERADO) > 0 ? brl(a.RECUPERADO) : <Dash />}</Td></Tr>
                  <Tr><Td>Ações da régua atrasadas</Td><Td numeric>{num(a.ACOES_ATRASADAS) ? <Status tone="attention">{num(a.ACOES_ATRASADAS)}</Status> : 0}</Td></Tr>
                </tbody>
              </Table>
            </Card>
          ))}
        </Grade>
      </Card>
    </Panel>
  ));
}
