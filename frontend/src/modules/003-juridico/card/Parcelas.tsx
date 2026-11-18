// Parcelas de um acordo judicial (RF-026, RN-020): situação explícita, "Marcar paga" com a data; ao pagar a última
// em aberto o acordo fica quitado e a tela encerra o processo com "acordo cumprido" (D-08 do plan: dois toques).

import { useState } from 'react';
import { fmtData } from '@/lib/formato';
import { Alert, Button, Dash, Input, LabelledField, Status, Table, Td, Th, Tr } from '@/components/page';
import { brl, useGravar, type Linha } from '../comum';

const SITUACAO: Record<string, { texto: string; tom: 'live' | 'off' | 'attention' | 'alert' }> = {
  PAGA: { texto: 'Paga', tom: 'live' }, ABERTA: { texto: 'Aberta', tom: 'off' }, A_CONFIRMAR: { texto: 'A confirmar', tom: 'attention' },
};

export function Parcelas({ parcelas, acordo, pode, hoje, onAlterado }: {
  parcelas: Linha[]; acordo: Linha; pode: boolean; hoje: string; onAlterado: (r: { quitado: boolean }) => Promise<void> | void;
}) {
  const { gravar, gravando, erro, ok } = useGravar();
  const [pagoEm, setPagoEm] = useState('');
  const total = parcelas.filter((p) => Number(p.NUMERO) > 0).length;
  const podePagar = pode && acordo.SITUACAO === 'ANDAMENTO';
  const motivo = !pode ? 'Sem permissão: só o Jurídico registra parcela.' : acordo.SITUACAO === 'AGUARDANDO'
    ? 'O acordo aguarda aprovação: a parcela só é paga com o acordo em andamento.' : 'Acordo quitado ou recusado: parcelas só leitura.';

  async function marcar(p: Linha, situacao: 'PAGA' | 'ABERTA') {
    const r = await gravar('ccJurAcordoParcelaSituacao', { parcelaId: Number(p.ID), situacao, pagoEm: situacao === 'PAGA' ? pagoEm : '' },
      situacao === 'PAGA' ? 'Parcela paga.' : 'Parcela aberta.');
    if (r) await onAlterado({ quitado: !!r.quitado });
  }

  return (
    <>
      {podePagar ? (
        <LabelledField label="Data do pagamento" hint="Vazio: hoje. Vale para a próxima parcela marcada; não pode ser futura.">
          <Input type="date" value={pagoEm} max={hoje} onChange={(e) => setPagoEm(e.target.value)} />
        </LabelledField>
      ) : null}
      <Table>
        <thead><tr><Th>Parcela</Th><Th>Vencimento</Th><Th numeric>Valor</Th><Th>Situação</Th><Th>Pago em</Th><Th /></tr></thead>
        <tbody>
          {parcelas.map((p) => {
            const s = Number(p.VENCIDA) ? { texto: 'Vencida', tom: 'alert' as const } : SITUACAO[p.SITUACAO] ?? SITUACAO.ABERTA;
            return (
              <Tr key={p.ID}>
                <Td>{Number(p.NUMERO) === 0 ? 'Entrada' : `${p.NUMERO} de ${total}`}</Td>
                <Td>{fmtData(p.VENCIMENTO)}</Td>
                <Td numeric>{brl(p.VALOR)}</Td>
                <Td><Status tone={s.tom}>{s.texto}{p.ORIGEM_SITUACAO === 'COR_PLANILHA' ? ' · cor da planilha' : ''}</Status></Td>
                <Td>{p.PAGO_EM ? fmtData(p.PAGO_EM) : <Dash />}</Td>
                <Td numeric>
                  {p.SITUACAO !== 'PAGA' ? (
                    <Button size="sm" disabled={!podePagar || gravando} title={podePagar ? undefined : motivo} onClick={() => marcar(p, 'PAGA')}>Marcar paga</Button>
                  ) : null}
                  {p.SITUACAO === 'A_CONFIRMAR' ? (
                    <Button size="sm" variant="ghost" disabled={!pode || gravando} onClick={() => marcar(p, 'ABERTA')}>Manter aberta</Button>
                  ) : null}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
    </>
  );
}
