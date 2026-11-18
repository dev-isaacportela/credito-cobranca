/**
 * /admin/auditoria — opção `adm-auditoria` B "Linha do tempo" com o pedido "b+c" (telas-07-adm-operacao.html):
 * filtros em coluna (período, pessoa, cliente, área), registros como frases por dia e a alternância
 * "por item alterado" (`agruparPorDia` / `agruparPorItem` sobre a mesma página). Somente leitura (C-026).
 */
import { useState } from 'react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import { agruparPorDia, agruparPorItem } from '@/lib/base/auditoria';
import { diaDaSemana } from '@/lib/base/telas';
import {
  Alert, CabecalhoDia, Code, CorpoPainel, Dash, EmptyState, Evento, Faixa, Field, Forte, Grade, Input, Item,
  LabelledField, LinhaDoTempo, ListaItens, MetaDot, Nota, PageHeader, Pagination, Panel, Resto, RowMeta,
  SelectMenu, Stat, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Th, Tr,
} from '@/components/page';
import { motivo, useDados } from '../comum';

const POR_PAGINA = 50;
/** Áreas que as SFs gravam em CC_AUDITORIA.AREA (auditar() das sete specs). */
const AREAS = [
  'Acordos', 'Anexos', 'Atribuição', 'Baixas', 'Bloqueio', 'BUs', 'Calibração', 'Carga do Jurídico', 'Certidões', 'Clientes', 'Cobrança',
  'Contatos', 'Crédito', 'E-mail', 'Equipe', 'Fechamento', 'Feriados', 'Fontes', 'Histórico', 'Jurídico', 'Leitura do Winthor', 'Material',
  'Modelos', 'Notas fiscais', 'Parâmetros', 'Pedidos', 'Pendências do Winthor', 'Regras por ente', 'Setor público',
];
const titulo = (dia: string) => `${diaDaSemana(dia).replace(/^./, (c) => c.toUpperCase())}, ${fmtData(dia)}`;
const hora = (iso: unknown) => /[T ](\d{2}:\d{2})/.exec(String(iso ?? ''))?.[1] ?? '';

export default function Auditoria() {
  const [vista, setVista] = useState('dia');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [pessoa, setPessoa] = useState('0');
  const [area, setArea] = useState('');
  const [codcli, setCodcli] = useState('');
  const [cliente, setCliente] = useState<{ id: number; nome: string } | null>(null);
  const [erroCliente, setErroCliente] = useState('');
  const [pagina, setPagina] = useState(1);

  const equipe = useDados(() => linhas('ccBaseMembroListar', { cargo: '', ativo: -1, busca: '', limite: 500, offset: 0 }), 'equipe');
  const filtro = { area, entidade: '', entidadeId: 0, clienteId: cliente?.id ?? 0, membroId: Number(pessoa), de, ate };
  const dados = useDados(async () => {
    const [registros, total] = await Promise.all([
      linhas('ccBaseAuditoriaListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      linha('ccBaseAuditoriaTotal', filtro),
    ]);
    return { registros, total: Number(total?.TOTAL ?? 0) };
  }, `${JSON.stringify(filtro)}|${pagina}`);

  const filtrar = (f: () => void) => {
    f();
    setPagina(1);
  };
  // O filtro do contrato é o id do cliente: o código digitado vira id pela ficha (só com o cliente visível).
  async function escolherCliente() {
    setErroCliente('');
    const cod = Number(codcli.replace(/\D/g, ''));
    if (!cod) return filtrar(() => setCliente(null));
    try {
      const r = await acao('ccBaseClienteFicha', { clienteId: 0, codcli: cod, documento: '' });
      if (r.ok === false || !r.cliente) return setErroCliente(r.ok === false ? motivo(r) : 'Cliente fora do sistema: não tem auditoria.');
      filtrar(() => setCliente({ id: Number(r.cliente.ID), nome: String(r.cliente.NOME) }));
    } catch (e) {
      setErroCliente(motivo(e));
    }
  }

  const registros = dados.dados?.registros ?? [];
  const total = dados.dados?.total ?? 0;
  const vazio = registros.length === 0;

  return (
    <>
      <PageHeader
        module="Administração"
        title="Trilha de auditoria"
        description="Quem alterou o quê e quando. Os registros são gerados pelo sistema e não podem ser editados nem apagados."
        meta={dados.dados ? (
          <>
            <span><Stat>{total}</Stat> {total === 1 ? 'registro' : 'registros'} no filtro</span>
            {de || ate ? <><MetaDot /><span>{de ? fmtData(de) : 'início'} a {ate ? fmtData(ate) : 'hoje'}</span></> : null}
          </>
        ) : undefined}
      />
      <Grade colunas="estreita">
        <Panel>
          <CorpoPainel>
            <LabelledField label="De"><Input type="date" value={de} onChange={(e) => filtrar(() => setDe(e.target.value))} /></LabelledField>
            <LabelledField label="Até"><Input type="date" value={ate} onChange={(e) => filtrar(() => setAte(e.target.value))} /></LabelledField>
            <Field label="Pessoa">
              <SelectMenu
                label="Pessoa" value={pessoa} onChange={(v) => filtrar(() => setPessoa(v))}
                options={[{ value: '0', label: 'Todas as pessoas' }, ...(equipe.dados ?? []).map((m) => ({ value: String(m.ID), label: String(m.NOME) }))]}
              />
            </Field>
            <LabelledField
              label="Cliente (código do Winthor)"
              hint={erroCliente || (cliente ? cliente.nome : 'Enter para filtrar; vazio = todos.')}
              hintTone={erroCliente ? 'error' : 'muted'}
            >
              <Input inputMode="numeric" value={codcli} onChange={(e) => setCodcli(e.target.value)} onBlur={escolherCliente} onKeyDown={(e) => e.key === 'Enter' && escolherCliente()} />
            </LabelledField>
            <Forte>Área</Forte>
          </CorpoPainel>
          <ListaItens>
            <Item ativo={area === ''} onClick={() => filtrar(() => setArea(''))}><Resto>Todas</Resto></Item>
            {AREAS.map((a) => <Item key={a} ativo={area === a} onClick={() => filtrar(() => setArea(a))}><Resto>{a}</Resto></Item>)}
          </ListaItens>
        </Panel>
        <Panel>
          <Tabs value={vista} onValueChange={setVista}>
            <Faixa>
              <TabsList>
                <TabsTrigger value="dia">Por dia</TabsTrigger>
                <TabsTrigger value="item">Por item alterado</TabsTrigger>
              </TabsList>
              <Nota>{vista === 'dia' ? 'Linha do tempo do mais recente para o mais antigo.' : 'Cada item com a sua sequência de mudanças, desta página.'}</Nota>
            </Faixa>
            {dados.erro ? <CorpoPainel><Alert tone="error">{dados.erro}</Alert></CorpoPainel> : null}
            {vazio ? (
              <EmptyState
                title={dados.carregando ? 'Carregando os registros…' : 'Nenhum registro com esses filtros.'}
                hint={dados.carregando ? undefined : 'Quem administra vê toda a trilha; Supervisor vê a de um cliente da equipe.'}
              />
            ) : null}
            <TabsContent value="dia">
              {agruparPorDia(registros).map(({ dia, registros: doDia }) => (
                <div key={dia}>
                  <CabecalhoDia>{titulo(dia)} · {doDia.length} {doDia.length === 1 ? 'registro' : 'registros'}</CabecalhoDia>
                  <CorpoPainel>
                    <LinhaDoTempo>
                      {doDia.map((r) => (
                        <Evento key={String(r.ID)} meta={[hora(r.EM), r.AREA, r.CLIENTE_ID ? `cliente ${r.CLIENTE_ID}` : ''].filter(Boolean).join(' · ')}>
                          {r.frase}
                        </Evento>
                      ))}
                    </LinhaDoTempo>
                  </CorpoPainel>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="item">
              {agruparPorItem(registros).map((g) => {
                const ultimo = g.registros[g.registros.length - 1];
                return (
                  <div key={g.item}>
                    <Faixa>
                      <Forte>{g.item}</Forte>
                      <Nota>{g.registros.length} {g.registros.length === 1 ? 'mudança' : 'mudanças'} · última em {fmtDataHora(String(ultimo.EM))}</Nota>
                    </Faixa>
                    <Table>
                      <thead><tr><Th>Quando</Th><Th>O que mudou</Th><Th>Área</Th><Th>Quem</Th></tr></thead>
                      <tbody>
                        {g.registros.map((r) => (
                          <Tr key={String(r.ID)}>
                            <Td>{fmtDataHora(String(r.EM))}</Td>
                            <Td>
                              <Code>{String(r.CAMPO)}</Code>
                              <RowMeta>{r.ANTES ? String(r.ANTES) : '—'} → {r.DEPOIS ? String(r.DEPOIS) : '—'}</RowMeta>
                            </Td>
                            <Td>{String(r.AREA ?? '') || <Dash />}</Td>
                            <Td>{r.POR_NOME ? String(r.POR_NOME) : 'Rotina'}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                );
              })}
            </TabsContent>
            {!vazio ? (
              <Pagination
                page={pagina} lastPage={Math.max(1, Math.ceil(total / POR_PAGINA))} total={total} unit={total === 1 ? 'registro' : 'registros'}
                busy={dados.carregando} onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)}
              />
            ) : null}
          </Tabs>
        </Panel>
      </Grade>
    </>
  );
}
