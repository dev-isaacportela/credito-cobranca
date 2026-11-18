// Aba "Contatos e promessas" do card (T-065): as promessas do caso (da ficha) e os contatos do cliente na carteira.

import { useState } from 'react';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { Alert, Dash, EmptyState, Pagination, RowMeta, RowTitle, Status, Table, Td, Th, Tr } from '@/components/page';
import { brl, num, useDados, type Linha } from '../comum';
import { useFicha } from '../ficha';

const LIMITE = 10;
const TOM_PROMESSA: Record<string, 'live' | 'off' | 'attention' | 'alert'> = { ABERTA: 'attention', CUMPRIDA: 'live', QUEBRADA: 'alert' };

export function AbaContatos(ctx: ExtensaoContexto) {
  const { ficha } = useFicha(ctx.card.id);
  const [pagina, setPagina] = useState(1);
  const clienteId = ficha?.cliente.id ?? 0;
  const filtro = { clienteId, cobrancaId: 0, nfId: 0, agenteId: 0, carteira: ficha?.caso.carteira ?? '', retorno: '', promessa: '', de: '', ate: '', busca: '' };
  const dados = useDados(async () => (clienteId ? Promise.all([
    linhas('ccCobContatoListar', { ...filtro, limite: LIMITE, offset: (pagina - 1) * LIMITE }),
    linha('ccCobContatoTotal', filtro),
  ]) : null), `${clienteId}:${pagina}`);

  if (!ficha) return <Alert tone="info">Carregando a situação do caso…</Alert>;
  const [lista, total] = dados.dados ?? [[], null];
  const totalN = num(total?.TOTAL);

  return (
    <>
      {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
      {ficha.promessas.length ? (
        <Table>
          <thead><tr><Th>Promessa</Th><Th numeric>Valor</Th><Th>Situação</Th></tr></thead>
          <tbody>
            {ficha.promessas.map((p: Linha) => (
              <Tr key={p.ID}>
                <Td><RowTitle>Para {fmtData(p.DATA_PROMETIDA)}</RowTitle><RowMeta>contato de {fmtData(p.DATA_CONTATO)}</RowMeta></Td>
                <Td numeric>{num(p.VALOR) > 0 ? brl(p.VALOR) : <Dash />}</Td>
                <Td><Status tone={TOM_PROMESSA[p.SITUACAO] ?? 'off'}>{String(p.SITUACAO).toLowerCase()}</Status></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      {lista.length ? (
        <>
          <Table>
            <thead><tr><Th>Data</Th><Th>Canal</Th><Th>Retorno</Th><Th>Feedback</Th><Th>Agente</Th></tr></thead>
            <tbody>
              {lista.map((c: Linha) => (
                <Tr key={c.ID}>
                  <Td>{fmtData(c.DATA)}</Td>
                  <Td><RowTitle>{c.CANAL}</RowTitle>{c.FALOU_COM ? <RowMeta>{c.FALOU_COM}</RowMeta> : null}</Td>
                  <Td>{c.RETORNO || <Dash />}{c.PREVISAO ? <RowMeta>{brl(c.VALOR)} para {fmtData(c.PREVISAO)}</RowMeta> : null}</Td>
                  <Td>{c.FEEDBACK}</Td>
                  <Td>{c.AGENTE_NOME || <Dash />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(totalN / LIMITE))} total={totalN} unit="contatos" busy={dados.carregando}
            onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
        </>
      ) : dados.carregando ? null : <EmptyState title="Nenhum contato registrado nesta carteira." hint="Registre o primeiro pelo botão Registrar contato." />}
    </>
  );
}
