// Notas fiscais em tramitação (nf-tramitacao C, "Trilho por nota", T-205): uma linha por NF com o caminho, as
// datas lançadas, onde travou (RN-034), situação, regra e "Lançar datas". Na tela: busca, situação, acima de 2
// meses e agente (lista + total + membros = 3 leituras). Na aba "Notas fiscais" do card: só as do órgão.

import { useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, Button, EmptyState, Field, LinhaNf, Pagination, Panel, RowMeta, RowTitle, SearchInput, SelectMenu,
  Status, Toolbar, Trilho,
} from '@/components/page';
import { documentoRecebivel, ESFERA, etiquetaRegra, passosTrilho, termoBusca, textoSituacao, tomSituacao } from '@/lib/setor-publico/formato';
import { brl, n, NF_FILTRO, useDados, useEspera, useMembro, type Linha } from './dados';
import NfDatasDialog from './NfDatasDialog';

const POR_PAGINA = 20;
const SITUACOES = [
  { value: '', label: 'Situação: todas em aberto' }, { value: 'A_PROTOCOLAR', label: 'Protocolar a NF' }, { value: 'NO_PRAZO', label: 'No prazo' },
  { value: 'LIQUIDACAO_VENCIDA', label: 'Liquidação vencida' }, { value: 'PAGAMENTO_VENCIDO', label: 'Pagamento vencido' }, { value: 'PAGA', label: 'Pagas' },
];
const ACIMA = [{ value: '-1', label: 'Qualquer idade' }, { value: '1', label: 'Acima de 2 meses' }, { value: '0', label: 'Até 2 meses' }];

export default function NotasFiscaisLista({ clienteId = 0, onGravou }: { clienteId?: number; onGravou?: () => void }) {
  const membro = useMembro();
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [acima2m, setAcima2m] = useState('-1');
  const [agenteId, setAgenteId] = useState('0');
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState<Linha | null>(null);
  const termo = useEspera(termoBusca(busca));
  const filtro = { ...NF_FILTRO, clienteId, situacao, acima2m: Number(acima2m), agenteId: Number(agenteId), busca: termo };
  const chave = JSON.stringify({ ...filtro, pagina });

  const d = useDados(async () => {
    const [lista, total] = await Promise.all([
      linhas('ccPubNfListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      linhas('ccPubNfTotal', filtro),
    ]);
    return { lista, total: total[0] ?? {} };
  }, chave);
  const membros = useDados(() => (clienteId ? Promise.resolve([]) : linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 100, offset: 0 })), 'membros');

  const lista = d.dados?.lista ?? [];
  const t = d.dados?.total ?? {};
  const total = n(t.TOTAL);
  const filtrar = (f: (v: string) => void) => (v: string) => { f(v); setPagina(1); };
  const juridico = membro.cargo === 'JURIDICO';

  return (
    <Panel>
      <Toolbar>
        {clienteId ? null : (
          <Field label="Buscar"><SearchInput placeholder="Órgão, NF ou empenho" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} /></Field>
        )}
        <Field label="Situação"><SelectMenu label="Situação" value={situacao} onChange={filtrar(setSituacao)} options={SITUACOES} /></Field>
        {clienteId ? null : (
          <>
            <Field label="Emissão"><SelectMenu label="Emissão" value={acima2m} onChange={filtrar(setAcima2m)} options={ACIMA} /></Field>
            <Field label="Agente">
              <SelectMenu label="Agente" value={agenteId} onChange={filtrar(setAgenteId)}
                options={[{ value: '0', label: 'Todos os agentes' }, ...(membros.dados ?? []).filter((m) => m.CARGO !== 'JURIDICO').map((m) => ({ value: String(m.ID), label: String(m.NOME) }))]} />
            </Field>
          </>
        )}
      </Toolbar>
      {d.erro ? <Toolbar><Alert tone="error">{d.erro}</Alert></Toolbar> : null}
      {n(t.REGRA_A_CONFIRMAR) > 0 ? (
        <Toolbar>
          <Alert tone="warn">
            {n(t.REGRA_A_CONFIRMAR)} de {total} {total === 1 ? 'nota usa' : 'notas usam'} regra de pagamento a confirmar: os prazos são a referência até a Gerência Financeira validar a regra do ente.
          </Alert>
        </Toolbar>
      ) : null}
      {!lista.length ? (
        <EmptyState title={d.carregando ? 'Carregando as notas…' : 'Nenhuma nota com estes filtros'}
          hint={d.carregando ? undefined : 'As notas de órgão entram sozinhas na leitura do Winthor; mude a situação para ver as pagas.'} />
      ) : lista.map((nf) => {
        const doc = documentoRecebivel(nf);
        const fechada = nf.SITUACAO === 'PAGA' || Number(nf.BAIXADA) === 1;
        return (
          <LinhaNf
            key={nf.ID}
            esquerda={<>
              <RowTitle>NF {nf.NUMNOTA} · {brl(nf.VALOR)}</RowTitle>
              {!clienteId ? <RowMeta>{nf.CLIENTE_NOME}</RowMeta> : null}
              <RowMeta>{[ESFERA[nf.ESFERA] ?? 'Esfera não informada', nf.UF, nf.AGENTE_NOME].filter(Boolean).join(' · ')}</RowMeta>
              {n(nf.SALDO_ABERTO) && n(nf.SALDO_ABERTO) !== n(nf.VALOR) ? <RowMeta>saldo {brl(nf.SALDO_ABERTO)}</RowMeta> : null}
            </>}
            meio={<Trilho compacto passos={passosTrilho(nf)} />}
            direita={<>
              <Status tone={tomSituacao(nf)}>{textoSituacao(nf)}</Status>
              {Number(nf.ACIMA_2M) === 1 ? <RowMeta>mais de 2 meses da emissão</RowMeta> : null}
              {doc ? <RowMeta>Travou em: {doc}</RowMeta> : null}
              <RowMeta>{etiquetaRegra(nf) || 'Regra não calculada'}</RowMeta>
              <Button size="sm" onClick={() => setAberta(nf)} disabled={juridico || fechada}
                title={juridico ? 'O Jurídico consulta; quem lança as datas é o agente ou o analista do órgão.' : fechada ? 'NF paga ou baixada: as datas não mudam.' : undefined}>
                Lançar datas
              </Button>
            </>}
          />
        );
      })}
      {total > POR_PAGINA ? (
        <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(total / POR_PAGINA))} total={total} unit="notas" busy={d.carregando}
          onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
      ) : lista.length ? (
        <Toolbar>
          <RowMeta>
            {total} {total === 1 ? 'nota' : 'notas'} · {brl(t.VALOR) || 'R$ 0,00'} · {n(t.VENCIDAS)} com prazo vencido{n(t.VALOR_VENCIDO) ? ` (${brl(t.VALOR_VENCIDO)})` : ''} · {n(t.ACIMA_2M)} acima de 2 meses
          </RowMeta>
        </Toolbar>
      ) : null}
      {aberta ? (
        <NfDatasDialog nfId={Number(aberta.ID)} onFechar={() => setAberta(null)} onSalvo={() => { d.recarregar(); onGravou?.(); }} />
      ) : null}
    </Panel>
  );
}
