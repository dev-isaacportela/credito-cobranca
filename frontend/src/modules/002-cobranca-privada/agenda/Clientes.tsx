// Aba "Clientes" da agenda (T-075, PA-09): o processo de cobrança cliente a cliente, por ccCobCasoListar.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, Code, Dash, EmptyState, Field, Pagination, RowMeta, RowTitle, SelectMenu, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { brl, caminhoDoCard, num, useDados } from '../comum';

const LIMITE = 20;
const FILTROS = [{ value: '', label: 'Todos em cobrança' }, { value: 'ATRASADO', label: 'Com passo atrasado' }, { value: 'SEM_CONTATO', label: 'Sem contato recente' },
  { value: 'PROMESSA', label: 'Com promessa' }, { value: 'ACORDO', label: 'Em acordo' }];

export function Clientes({ carteira, agenteId }: { carteira: string; agenteId: number }) {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const entrada = { carteira, agenteId, buId: -1, filtro };
  const chave = JSON.stringify(entrada);
  const total = useDados(() => linha('ccCobCasoTotal', entrada), chave);
  const lista = useDados(() => linhas('ccCobCasoListar', { ...entrada, limite: LIMITE, offset: (pagina - 1) * LIMITE }), `${chave}:${pagina}`);
  const n = num(total.dados?.TOTAL);

  return (
    <>
      <Toolbar>
        <Field label="Mostrar"><SelectMenu label="Filtro de clientes" value={filtro} options={FILTROS} onChange={(f) => { setFiltro(f); setPagina(1); }} /></Field>
      </Toolbar>
      {lista.erro || total.erro ? <Alert tone="error">{lista.erro || total.erro}</Alert> : null}
      {(lista.dados ?? []).length ? (
        <Table>
          <thead><tr><Th>Cliente</Th><Th>Etapa</Th><Th numeric>Em atraso</Th><Th>Último contato</Th><Th>Promessa</Th><Th>Acordo</Th><Th>Próximo passo</Th><Th /></tr></thead>
          <tbody>
            {(lista.dados ?? []).map((c) => (
              <Tr key={c.COBRANCA_ID}>
                <Td><RowTitle>{c.CLIENTE_NOME}</RowTitle> <Code>{c.CODCLI}</Code></Td>
                <Td>{c.FASE_NOME}</Td>
                <Td numeric>{num(c.VENCIDO) > 0 ? <>{brl(c.VENCIDO)}<RowMeta>{num(c.DIAS_ATRASO)} dias</RowMeta></> : <Dash />}</Td>
                <Td>{c.ULT_CONTATO ? fmtData(c.ULT_CONTATO) : <Dash />}</Td>
                <Td>{c.PROMESSA_DATA ? <>{brl(c.PROMESSA_VALOR)} para {fmtData(c.PROMESSA_DATA)}<RowMeta>{String(c.PROMESSA_SITUACAO).toLowerCase()}</RowMeta></> : <Dash />}</Td>
                <Td>{c.ACORDO_SITUACAO ? <>{num(c.PARCELAS_PAGAS)} de {num(c.N_PARCELAS)} pagas<RowMeta>{String(c.ACORDO_SITUACAO).toLowerCase()}</RowMeta></> : <Dash />}</Td>
                <Td>{c.PROX_ACAO ? <>{c.PROX_ACAO}<RowMeta>{fmtData(c.PROX_ACAO_DATA)}</RowMeta></> : <Dash />}</Td>
                <Td>{c.CARD_ID ? <Button size="sm" variant="ghost" onClick={() => navigate(caminhoDoCard({ carteira: c.CARTEIRA, cardId: c.CARD_ID }))}>Abrir</Button> : null}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : lista.carregando ? null : <EmptyState title="Nenhum cliente em cobrança com este filtro." />}
      <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(n / LIMITE))} total={n} unit="clientes" busy={lista.carregando}
        onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
    </>
  );
}
