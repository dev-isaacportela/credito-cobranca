/**
 * /cadastros/planos — não desenhada (T-102): listagem padrão, só leitura. Os planos vêm do Winthor
 * na leitura (RF-045); aqui só se consulta código, descrição e prazo médio.
 */
import { useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, CampoBusca, Code, CorpoPainel, Dash, EmptyState, Field, PageHeader, Panel, RowTitle, SearchInput,
  SelectMenu, Stat, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { dias, useDados } from '../comum';

export default function Planos() {
  const [ativo, setAtivo] = useState('1');
  const [texto, setTexto] = useState('');
  const dados = useDados(() => linhas('ccBasePlanoListar', { ativo: Number(ativo) }), ativo);
  const t = texto.trim().toUpperCase();
  const lista = (dados.dados ?? []).filter((p) => !t || `${p.CODIGO} ${p.DESCRICAO}`.toUpperCase().includes(t));
  return (
    <>
      <PageHeader
        module="Cadastros"
        title="Planos de pagamento"
        description="Lidos do Winthor a cada leitura. Para mudar um plano, altere no Winthor."
        meta={dados.dados ? <span><Stat>{lista.length}</Stat> {lista.length === 1 ? 'plano' : 'planos'}</span> : undefined}
      />
      <Panel>
        <Toolbar>
          <CampoBusca><SearchInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por código ou descrição" aria-label="Buscar plano" /></CampoBusca>
          <Field label="Situação"><SelectMenu label="Situação" value={ativo} onChange={setAtivo} options={[{ value: '1', label: 'Ativos' }, { value: '0', label: 'Inativos' }, { value: '-1', label: 'Todos' }]} /></Field>
        </Toolbar>
        {dados.erro ? <CorpoPainel><Alert tone="error">{dados.erro}</Alert></CorpoPainel> : null}
        {lista.length === 0 ? (
          <EmptyState title={dados.carregando ? 'Carregando os planos…' : 'Nenhum plano encontrado.'} hint={dados.carregando ? undefined : 'Os planos chegam com a leitura do Winthor.'} />
        ) : (
          <Table>
            <thead><tr><Th>Código</Th><Th>Descrição</Th><Th numeric>Prazo médio</Th><Th>Situação</Th></tr></thead>
            <tbody>
              {lista.map((p) => (
                <Tr key={String(p.CODIGO)}>
                  <Td><Code>{String(p.CODIGO)}</Code></Td>
                  <Td><RowTitle>{String(p.DESCRICAO || p.CODIGO)}</RowTitle></Td>
                  <Td numeric>{Number(p.PRAZO_MEDIO) ? dias(p.PRAZO_MEDIO) : <Dash />}</Td>
                  <Td>{Number(p.ATIVO) ? <Status tone="live">Ativo</Status> : <Status tone="off">Inativo</Status>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
