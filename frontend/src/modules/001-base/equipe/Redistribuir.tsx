/**
 * /equipe/redistribuir — opção `equipe-redistribuicao` A "Selecionar e mover" (telas-05-equipe.html):
 * marca até 20 clientes, escolhe o destino entre os que a pessoa enxerga e move num clique
 * (ccBaseClienteAtribuir em lote, C-014). Cada cliente movido fica na auditoria.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acao, comPadrao, linha, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import { montarBusca } from '@/lib/base/documento';
import { alternarSelecao, destinosDaAtribuicao } from '@/lib/base/telas';
import {
  Alert, Button, CampoBusca, Code, CorpoPainel, Dash, EmptyState, Faixa, Field, Forte, Linha as LinhaUi, Marcar,
  MetaDot, Nota, PageHeader, Pagination, Panel, Pilha, RowMeta, RowTitle, SearchInput, SelectMenu, Stat, Status,
  Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { cidade, dias, motivo, nivelDois, useDados, useEspera, useMembro } from '../comum';

type Linha = Record<string, unknown>;
const POR_PAGINA = 20;
const LIMITE = 20;
const FILTRO_VAZIO = {
  busca: '', setor: '', carteira: '', agenteId: 0, analistaId: 0, buId: -1, uf: '', tipoPessoa: '', soVencidos: 0, situacaoFicha: '',
};
const n = (v: unknown) => Number(v ?? 0);

export default function Redistribuir() {
  const membro = useMembro();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [texto, setTexto] = useState('');
  const [agente, setAgente] = useState(params.get('agente') ?? '');
  const [buId, setBuId] = useState('-1');
  const [pagina, setPagina] = useState(1);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [nomes, setNomes] = useState<Record<number, Linha>>({});
  const [destino, setDestino] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const pode = nivelDois(membro);
  const busca = montarBusca(useEspera(texto));

  const apoio = useDados(async () => {
    const [membros, bus] = await Promise.all([
      linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 500, offset: 0 }),
      linhas('ccBaseBuListar', { ativa: -1 }),
    ]);
    return { membros, bus };
  }, 'apoio');

  const filtro = comPadrao({ busca, agenteId: Number(agente), buId: Number(buId) }, FILTRO_VAZIO);
  const dados = useDados(async () => {
    const [lista, total] = await Promise.all([
      linhas('ccBaseClienteListar', { ...filtro, ordem: 'NOME', limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      linha('ccBaseClienteTotal', filtro),
    ]);
    return { lista, total };
  }, `${JSON.stringify(filtro)}|${pagina}`);

  const destinos = destinosDaAtribuicao(apoio.dados?.membros ?? [], membro.membroId, membro.veTudo);
  const opcoesDestino = destinos.map((m) => ({ value: String(m.ID), label: String(m.NOME), hint: `${n(m.CLIENTES)} ${n(m.CLIENTES) === 1 ? 'cliente' : 'clientes'}` }));
  const opcoesAgente = [
    { value: '', label: 'Agente atual: todos' },
    ...(membro.veTudo ? [{ value: '-1', label: 'Sem agente' }] : []),
    ...destinos.map((m) => ({ value: String(m.ID), label: String(m.NOME) })),
  ];
  const opcoesBu = [{ value: '-1', label: 'Todas as BUs' }, ...(apoio.dados?.bus ?? []).map((b) => ({ value: String(b.ID), label: String(b.NOME) })), { value: '0', label: 'Sem BU' }];
  const t = dados.dados?.total;
  const total = n(t?.TOTAL);
  const lista = dados.dados?.lista ?? [];
  const origens = [...new Set(marcados.map((id) => String(nomes[id]?.AGENTE_NOME || 'sem agente')))];

  const filtrar = (f: () => void) => {
    f();
    setPagina(1);
  };
  const alternar = (c: Linha) => {
    setMarcados((m) => alternarSelecao(m, n(c.ID), LIMITE));
    setNomes((x) => ({ ...x, [n(c.ID)]: c }));
  };

  async function mover() {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await acao('ccBaseClienteAtribuir', { clienteIds: marcados.join(','), agenteId: Number(destino) });
      setOcupado(false);
      if (r.ok === false) return setAviso({ tom: 'error', texto: motivo(r) });
      const nome = destinos.find((d) => String(d.ID) === destino)?.NOME;
      setAviso({ tom: 'success', texto: `${n(r.alterados)} ${n(r.alterados) === 1 ? 'cliente movido' : 'clientes movidos'} para ${nome}. A mudança está na auditoria.` });
      setMarcados([]);
      setDestino('');
      dados.reler();
      apoio.reler();
    } catch (e) {
      setOcupado(false);
      setAviso({ tom: 'error', texto: motivo(e) });
    }
  }

  return (
    <>
      <PageHeader
        module="Equipe"
        title="Redistribuição de clientes"
        description="Cada cliente movido fica registrado na auditoria, com o agente de antes e o de depois."
        meta={t ? <><span><Stat>{total}</Stat> {total === 1 ? 'cliente' : 'clientes'}</span><MetaDot /><span><Stat>{n(t.SEM_AGENTE)}</Stat> sem agente</span></> : undefined}
        actions={<Button onClick={() => navigate('/equipe')}>Voltar para a equipe</Button>}
      />
      <Pilha>
        {!pode ? <Alert tone="info">Só Supervisor, Gerente, Diretoria ou Administrador redistribui clientes.</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          <Toolbar>
            <CampoBusca><SearchInput value={texto} onChange={(e) => filtrar(() => setTexto(e.target.value))} placeholder="Buscar cliente" aria-label="Buscar cliente" /></CampoBusca>
            <Field label="Agente atual"><SelectMenu label="Agente atual" value={agente} onChange={(v) => filtrar(() => setAgente(v))} options={opcoesAgente} /></Field>
            <Field label="BU"><SelectMenu label="BU" value={buId} onChange={(v) => filtrar(() => setBuId(v))} options={opcoesBu} /></Field>
          </Toolbar>
          {marcados.length ? (
            <Faixa destaque>
              <LinhaUi>
                <Forte>{marcados.length} {marcados.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}</Forte>
                <Nota>de {origens.join(', ')}{marcados.length >= LIMITE ? ` · limite de ${LIMITE} por vez` : ''}</Nota>
              </LinhaUi>
              <LinhaUi>
                <SelectMenu label="Mover para" value={destino} onChange={setDestino} options={opcoesDestino} placeholder="Mover para" />
                <Button variant="primary" onClick={mover} disabled={!pode || !destino || ocupado}>Mover clientes</Button>
                <Button variant="ghost" onClick={() => setMarcados([])}>Limpar seleção</Button>
              </LinhaUi>
            </Faixa>
          ) : null}
          {dados.erro ? <CorpoPainel><Alert tone="error">{dados.erro}</Alert></CorpoPainel> : null}
          {lista.length === 0 ? (
            <EmptyState title={dados.carregando ? 'Carregando os clientes…' : 'Nenhum cliente com esses filtros.'} />
          ) : (
            <>
              <Table>
                <thead><tr><Th aria-label="Selecionar" /><Th>Cliente</Th><Th>Agente atual</Th><Th>BUs com saldo</Th><Th numeric>Vencido</Th><Th numeric>Atraso</Th></tr></thead>
                <tbody>
                  {lista.map((c) => {
                    const marcado = marcados.includes(n(c.ID));
                    return (
                      <Tr key={String(c.ID)}>
                        <Td>
                          <Marcar
                            rotulo={`Selecionar ${c.NOME}`} checked={marcado} onChange={() => alternar(c)}
                            disabled={!pode || (!marcado && marcados.length >= LIMITE) || (!c.AGENTE_ID && !membro.veTudo)}
                          />
                        </Td>
                        <Td><RowTitle>{String(c.NOME)}</RowTitle><RowMeta><Code>{String(c.CODCLI)}</Code> · {cidade(c.MUNICIPIO, c.UF)}</RowMeta></Td>
                        <Td>{c.AGENTE_NOME ? String(c.AGENTE_NOME) : <Status tone="attention">Sem agente</Status>}</Td>
                        <Td>{c.BUS_SALDO ? String(c.BUS_SALDO).split(', ').join(' · ') : <Dash />}</Td>
                        <Td numeric>{n(c.VENCIDO) ? moeda(n(c.VENCIDO)) : <Dash />}</Td>
                        <Td numeric>{n(c.DIAS_ATRASO) ? dias(c.DIAS_ATRASO) : <Dash />}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <Pagination
                page={pagina} lastPage={Math.max(1, Math.ceil(total / POR_PAGINA))} total={total} unit={total === 1 ? 'cliente' : 'clientes'}
                busy={dados.carregando} onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)}
              />
            </>
          )}
        </Panel>
        <Nota>O destino só lista agentes, supervisores e gerentes ativos que você enxerga. Cliente sem agente só é atribuído por quem vê toda a carteira.</Nota>
      </Pilha>
    </>
  );
}
