// Aba "Contratos" do Fluxo da NF pública (T-207, PA-13 — sem opção em escolhas.md: listagem padrão do design
// system). Contratos dos créditos públicos vigentes com o alerta de vigência e de saldo (RN-037). Abrir = lista + total.

import { useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Code, Dash, EmptyState, Field, Pagination, Panel, RowMeta, RowTitle, SearchInput, SelectMenu, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { termoBusca } from '@/lib/setor-publico/formato';
import { brl, n, pct, pl, useDados, useEspera, vazio } from './dados';

const POR_PAGINA = 20;
const ALERTA: Record<string, string> = { VIGENCIA: 'Vigência perto do fim', SALDO: 'Saldo baixo', VIGENCIA_SALDO: 'Vigência e saldo' };

export default function ContratosAba() {
  const [soAlerta, setSoAlerta] = useState('0');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const termo = useEspera(termoBusca(busca));
  const filtro = { soAlerta: Number(soAlerta), busca: termo };
  const d = useDados(async () => {
    const [lista, total] = await Promise.all([
      linhas('ccPubContratoListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      linhas('ccPubContratoTotal', filtro),
    ]);
    return { lista, total: total[0] ?? {} };
  }, JSON.stringify({ ...filtro, pagina }));
  const lista = d.dados?.lista ?? [];
  const total = n(d.dados?.total.TOTAL);

  return (
    <Panel>
      <Toolbar>
        <Field label="Buscar"><SearchInput placeholder="Órgão ou contrato" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} /></Field>
        <Field label="Mostrar">
          <SelectMenu label="Mostrar" value={soAlerta} onChange={(v) => { setSoAlerta(v); setPagina(1); }}
            options={[{ value: '0', label: 'Todos os contratos' }, { value: '1', label: 'Só em alerta' }]} />
        </Field>
        {d.dados ? <RowMeta>{total} {pl(total, 'contrato', 'contratos')} · {n(d.dados.total.EM_ALERTA)} em alerta de vigência ou de saldo</RowMeta> : null}
      </Toolbar>
      {d.erro ? <Toolbar><Alert tone="error">{d.erro}</Alert></Toolbar> : null}
      {!lista.length ? (
        <EmptyState title={d.carregando ? 'Carregando os contratos…' : 'Nenhum contrato'} hint={d.carregando ? undefined : 'Aparecem aqui os créditos públicos vigentes com base "Saldo de contrato ativo".'} />
      ) : (
        <Table>
          <thead>
            <tr><Th>Órgão</Th><Th>Contrato</Th><Th>Vigência</Th><Th numeric>Saldo</Th><Th numeric>Valor da contratação</Th><Th>Rating</Th><Th>Alerta</Th></tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <Tr key={c.CREDITO_ID}>
                <Td><RowTitle>{c.CLIENTE_NOME}</RowTitle><RowMeta><Code prefix="#">{c.CODCLI}</Code></RowMeta></Td>
                <Td>{c.CONTRATO || <Dash />}</Td>
                <Td>{c.VIGENCIA_FIM ? <>{fmtData(c.VIGENCIA_FIM)}<RowMeta>{n(c.DIAS_VIGENCIA) < 0 ? `vencida há ${-n(c.DIAS_VIGENCIA)} dias` : `${n(c.DIAS_VIGENCIA)} dias`}</RowMeta></> : <Dash />}</Td>
                <Td numeric>{brl(c.SALDO_CONTRATO) || <Dash />}<RowMeta>{pct(c.SALDO_PCT)} do valor</RowMeta></Td>
                <Td numeric>{vazio(c.VALOR_CONTRATACAO) ? <Dash /> : brl(c.VALOR_CONTRATACAO)}</Td>
                <Td>{c.RATING_PUB || <Dash />}</Td>
                <Td>{c.ALERTA ? <Status tone="attention">{ALERTA[c.ALERTA] ?? c.ALERTA}</Status> : <Status tone="live">Sem alerta</Status>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {total > POR_PAGINA ? (
        <Pagination page={pagina} lastPage={Math.ceil(total / POR_PAGINA)} total={total} unit="contratos" busy={d.carregando}
          onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
      ) : null}
    </Panel>
  );
}
