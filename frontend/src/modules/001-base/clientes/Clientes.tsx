/**
 * /clientes — opção `clientes-busca` C "Filas prontas" (docs/opcoes-tela/001-base/telas-03-clientes.html).
 * Quatro números da carteira, abas com as filas (Em atraso · Sem agente · Ficha a revisar · Todos) e,
 * para quem vê tudo, "Buscar no Winthor" (RF-012). Busca com espera de 400 ms; nada relê sozinho.
 */
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { linha, linhas, acao, comPadrao } from '@/lib/mitra-api';
import { fmtData, fmtDataHora, moeda } from '@/lib/formato';
import { montarBusca, formatarDocumento, normalizarDocumento } from '@/lib/base/documento';
import { destinosDaAtribuicao } from '@/lib/base/telas';
import {
  AbasDoPainel, Alert, Badge, Button, CampoBusca, Code, CorpoPainel, Dash, EmptyState, Field, GradeKpi, Kpi,
  PageHeader, Pagination, Panel, Pilha, RowMeta, RowTitle, SearchInput, SelectMenu, Status, Table, Tabs,
  TabsContent, TabsTrigger, Td, TextLink, Th, Toolbar, Tr,
} from '@/components/page';
import { SITUACAO_FICHA, cidade, dias, motivo, nivelDois, useDados, useEspera, useMembro, valorOuNada } from '../comum';

type Linha = Record<string, unknown>;
type Aba = 'atraso' | 'semagente' | 'ficha' | 'todos' | 'winthor';

const POR_PAGINA = 20;
const FILTRO_VAZIO = {
  busca: '', setor: '', carteira: '', agenteId: 0, analistaId: 0, buId: -1, uf: '', tipoPessoa: '', soVencidos: 0, situacaoFicha: '',
};
const DA_ABA: Record<Exclude<Aba, 'winthor'>, { filtro: Partial<typeof FILTRO_VAZIO>; ordem: string; total: string }> = {
  atraso: { filtro: { soVencidos: 1 }, ordem: 'DIAS_ATRASO', total: 'EM_ATRASO' },
  semagente: { filtro: { agenteId: -1 }, ordem: 'VENCIDO', total: 'SEM_AGENTE' },
  ficha: { filtro: { situacaoFicha: 'A_REVISAR' }, ordem: 'NOME', total: 'FICHA_A_REVISAR' },
  todos: { filtro: {}, ordem: 'NOME', total: 'TOTAL' },
};

const n = (v: unknown) => Number(v ?? 0);
const valor = (v: unknown) => (valorOuNada(v) === null ? <Dash /> : moeda(n(v)));

export default function Clientes() {
  const membro = useMembro();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('atraso');
  const [texto, setTexto] = useState('');
  const [buId, setBuId] = useState('-1');
  const [agenteId, setAgenteId] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const busca = montarBusca(useEspera(texto));

  // Ao abrir: posição lida, números da carteira, BUs e equipe (Promise.allSettled: um que falhe não derruba os outros).
  const abertura = useDados(async () => {
    const [status, total, bus, membros] = await Promise.allSettled([
      linha('ccBaseSincronizacaoStatus'),
      linha('ccBaseClienteTotal', FILTRO_VAZIO),
      linhas('ccBaseBuListar', { ativa: -1 }),
      linhas('ccBaseMembroListar', { cargo: '', ativo: 1, busca: '', limite: 500, offset: 0 }),
    ]);
    const ok = <T,>(r: PromiseSettledResult<T>, padrao: T) => (r.status === 'fulfilled' ? r.value : padrao);
    return { status: ok(status, null), total: ok(total, null), bus: ok(bus, []), membros: ok(membros, []) };
  }, 'abertura');

  const base = comPadrao({ busca, buId: Number(buId), agenteId: aba === 'semagente' ? 0 : Number(agenteId) }, FILTRO_VAZIO);
  const filtrado = busca !== '' || buId !== '-1' || (agenteId !== '' && aba !== 'semagente');
  const chave = JSON.stringify(base);
  // Contagem das abas: sem filtro é a mesma da abertura; com filtro, uma leitura a mais.
  const contagem = useDados(async () => (filtrado ? linha('ccBaseClienteTotal', base) : null), `${chave}|${filtrado}`);

  const lista = useDados(async () => {
    if (aba === 'winthor') return [];
    const { filtro, ordem } = DA_ABA[aba];
    return linhas('ccBaseClienteListar', { ...base, ...filtro, ordem, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA });
  }, `${chave}|${aba}|${pagina}`);

  const kpi = abertura.dados?.total;
  const totais = filtrado ? contagem.dados : kpi;
  const destinos = destinosDaAtribuicao(abertura.dados?.membros ?? [], membro.membroId, membro.veTudo);
  const opcoesAgente = [{ value: '', label: 'Todos os agentes' }, ...destinos.map((m) => ({ value: String(m.ID), label: String(m.NOME) }))];
  const opcoesBu = [
    { value: '-1', label: 'Todas as BUs' },
    ...(abertura.dados?.bus ?? []).map((b) => ({ value: String(b.ID), label: String(b.NOME) })),
    { value: '0', label: 'Sem BU' },
  ];
  const leitura = abertura.dados?.status?.ULTIMA_OK_EM;
  const totalDaAba = aba === 'winthor' ? 0 : n(totais?.[DA_ABA[aba].total]);
  const ultima = Math.max(1, Math.ceil(totalDaAba / POR_PAGINA));

  const trocarAba = (a: string) => {
    setAba(a as Aba);
    setPagina(1);
    setAviso(null);
  };
  const filtrar = (f: () => void) => {
    f();
    setPagina(1);
  };

  async function atribuir(cliente: Linha, destino: string) {
    setAviso(null);
    try {
      const r = await acao('ccBaseClienteAtribuir', { clienteIds: String(cliente.ID), agenteId: Number(destino) });
      if (r.ok === false) return setAviso({ tom: 'error', texto: motivo(r) });
      const nome = destinos.find((d) => String(d.ID) === destino)?.NOME;
      setAviso({ tom: 'success', texto: `${cliente.NOME} agora é de ${nome}.` });
      lista.reler();
      if (filtrado) contagem.reler();
      abertura.reler();
    } catch (e) {
      setAviso({ tom: 'error', texto: motivo(e) });
    }
  }

  const clienteCelula = (c: Linha) => (
    <Td>
      <TextLink onClick={() => navigate(`/clientes/${c.CODCLI}`)}>{String(c.NOME)}</TextLink>
      <RowMeta>
        <Code>{String(c.CODCLI)}</Code> · {cidade(c.MUNICIPIO, c.UF)}
        {c.SETOR === 'PUBLICO' ? ' · Público' : ''}
      </RowMeta>
    </Td>
  );
  const agenteCelula = (c: Linha) => <Td>{c.AGENTE_NOME ? String(c.AGENTE_NOME) : <Status tone="attention">Sem agente</Status>}</Td>;
  const fichaCelula = (c: Linha) => {
    const s = SITUACAO_FICHA[String(c.SITUACAO_FICHA)] ?? SITUACAO_FICHA.NUNCA;
    return <Td><Status tone={s.tom}>{s.texto}</Status></Td>;
  };
  const atrasoCelula = (c: Linha) => <Td numeric>{n(c.DIAS_ATRASO) ? dias(c.DIAS_ATRASO) : <Dash />}</Td>;
  const bus = (c: Linha) => <Td>{c.BUS_SALDO ? String(c.BUS_SALDO).split(', ').join(' · ') : <Dash />}</Td>;

  const linhasDaAba = lista.dados ?? [];
  const tabela = (cabecalho: string[], numericas: number[], linha: (c: Linha) => ReactNode) =>
    linhasDaAba.length === 0 ? (
      <EmptyState
        title={lista.carregando ? 'Carregando os clientes…' : 'Nenhum cliente nesta fila.'}
        hint={lista.carregando ? undefined : filtrado ? 'Limpe a busca ou os filtros para ver a fila inteira.' : 'Quando houver, o cliente aparece aqui.'}
      />
    ) : (
      <>
        <Table>
          <thead><tr>{cabecalho.map((t, i) => <Th key={t} numeric={numericas.includes(i)}>{t}</Th>)}</tr></thead>
          <tbody>{linhasDaAba.map((c) => <Tr key={String(c.ID)}>{linha(c)}</Tr>)}</tbody>
        </Table>
        <Pagination
          page={pagina} lastPage={ultima} total={totalDaAba} unit={totalDaAba === 1 ? 'cliente' : 'clientes'} busy={lista.carregando}
          onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)}
        />
      </>
    );

  const contador = (v: unknown, tom: 'neutral' | 'attention' = 'neutral') => (totais ? <Badge tone={n(v) ? tom : 'neutral'}>{n(v)}</Badge> : null);

  return (
    <>
      <PageHeader
        module="Clientes"
        title="Clientes"
        description={leitura ? `Posição lida do Winthor em ${fmtDataHora(String(leitura)).replace(' ', ' às ')}.` : 'A posição ainda não foi lida do Winthor.'}
      />
      <Pilha>
        {abertura.erro ? <Alert tone="error">{abertura.erro}</Alert> : null}
        <GradeKpi>
          <Kpi rotulo="Clientes na carteira" valor={kpi ? n(kpi.TOTAL) : <Dash />} hint={kpi ? `${n(kpi.EM_ATRASO)} em atraso` : undefined} />
          <Kpi rotulo="Vencido" valor={kpi ? valor(kpi.VENCIDO) : <Dash />} hint={kpi && n(kpi.MAIOR_ATRASO) ? `maior atraso: ${dias(kpi.MAIOR_ATRASO)}` : undefined} />
          <Kpi rotulo="A vencer" valor={kpi ? valor(kpi.A_VENCER) : <Dash />} />
          <Kpi rotulo="Sem agente" valor={kpi ? n(kpi.SEM_AGENTE) : <Dash />} hint={kpi ? `${n(kpi.FICHA_A_REVISAR)} com ficha de contatos a revisar` : undefined} />
        </GradeKpi>
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          <Tabs value={aba} onValueChange={trocarAba}>
            <AbasDoPainel>
              <TabsTrigger value="atraso">Em atraso {contador(totais?.EM_ATRASO)}</TabsTrigger>
              <TabsTrigger value="semagente">Sem agente {contador(totais?.SEM_AGENTE, 'attention')}</TabsTrigger>
              <TabsTrigger value="ficha">Ficha de contatos a revisar {contador(totais?.FICHA_A_REVISAR, 'attention')}</TabsTrigger>
              <TabsTrigger value="todos">Todos {contador(totais?.TOTAL)}</TabsTrigger>
              {membro.veTudo ? <TabsTrigger value="winthor">Buscar no Winthor</TabsTrigger> : null}
            </AbasDoPainel>
            {aba !== 'winthor' ? (
              <Toolbar>
                <CampoBusca><SearchInput
                  value={texto} onChange={(e) => filtrar(() => setTexto(e.target.value))}
                  placeholder="Buscar por nome, fantasia, CPF/CNPJ ou código do Winthor" aria-label="Buscar cliente"
                /></CampoBusca>
                <Field label="BU"><SelectMenu label="BU" value={buId} onChange={(v) => filtrar(() => setBuId(v))} options={opcoesBu} /></Field>
                <Field label="Agente"><SelectMenu
                  label="Agente" value={aba === 'semagente' ? '' : agenteId} onChange={(v) => filtrar(() => setAgenteId(v))}
                  options={opcoesAgente} disabled={aba === 'semagente'}
                /></Field>
              </Toolbar>
            ) : null}
            {lista.erro ? <CorpoPainel><Alert tone="error">{lista.erro}</Alert></CorpoPainel> : null}
            <TabsContent value="atraso">
              {tabela(['Cliente', 'Agente', 'Atraso', 'Vencido', 'A vencer', 'BUs com saldo'], [2, 3, 4], (c) => (
                <>{clienteCelula(c)}{agenteCelula(c)}{atrasoCelula(c)}<Td numeric>{valor(c.VENCIDO)}</Td><Td numeric>{valor(c.A_VENCER)}</Td>{bus(c)}</>
              ))}
            </TabsContent>
            <TabsContent value="semagente">
              {tabela(['Cliente', 'BUs com saldo', 'Vencido', 'A vencer', 'Atribuir a'], [2, 3], (c) => (
                <>
                  {clienteCelula(c)}{bus(c)}<Td numeric>{valor(c.VENCIDO)}</Td><Td numeric>{valor(c.A_VENCER)}</Td>
                  <Td>
                    <SelectMenu
                      label={`Escolher agente para ${c.NOME}`} placeholder="Escolher agente" value=""
                      options={destinos.map((m) => ({ value: String(m.ID), label: String(m.NOME) }))}
                      onChange={(v) => atribuir(c, v)} disabled={!nivelDois(membro) || !membro.veTudo}
                    />
                  </Td>
                </>
              ))}
            </TabsContent>
            <TabsContent value="ficha">
              {tabela(['Cliente', 'Agente', 'Ficha de contatos', 'Última revisão', 'Vencido'], [4], (c) => (
                <>
                  {clienteCelula(c)}{agenteCelula(c)}{fichaCelula(c)}
                  <Td>{c.CONTATOS_REVISADO_EM ? fmtData(String(c.CONTATOS_REVISADO_EM)) : <Dash />}</Td>
                  <Td numeric>{valor(c.VENCIDO)}</Td>
                </>
              ))}
            </TabsContent>
            <TabsContent value="todos">
              {tabela(['Cliente', 'Agente', 'Vencido', 'A vencer', 'Atraso', 'Ficha de contatos'], [2, 3, 4], (c) => (
                <>{clienteCelula(c)}{agenteCelula(c)}<Td numeric>{valor(c.VENCIDO)}</Td><Td numeric>{valor(c.A_VENCER)}</Td>{atrasoCelula(c)}{fichaCelula(c)}</>
              ))}
            </TabsContent>
            {membro.veTudo ? (
              <TabsContent value="winthor">
                <BuscaWinthor />
              </TabsContent>
            ) : null}
          </Tabs>
        </Panel>
      </Pilha>
    </>
  );
}

/** Busca exata no Winthor por código ou CPF/CNPJ (RF-012): cliente fora do sistema abre a ficha ao vivo. */
function BuscaWinthor() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<{ ocupado?: boolean; erro?: string; achado?: Linha } | null>(null);

  async function buscar() {
    const digitos = normalizarDocumento(texto);
    if (!digitos) return setEstado({ erro: 'Informe o código do Winthor ou o CPF/CNPJ.' });
    setEstado({ ocupado: true });
    const input = digitos.length >= 11 ? { clienteId: 0, codcli: 0, documento: digitos } : { clienteId: 0, codcli: Number(digitos), documento: '' };
    try {
      const r = await acao('ccBaseClienteFicha', input);
      if (r.ok === false) return setEstado({ erro: motivo(r) });
      if (r.erroWinthor) return setEstado({ erro: String(r.erroWinthor) });
      const c = r.cliente
        ? { codcli: r.cliente.CODCLI, nome: r.cliente.NOME, documento: r.cliente.DOCUMENTO, uf: r.cliente.UF, municipio: r.cliente.MUNICIPIO, naCarteira: true }
        : { ...r.winthor, naCarteira: false };
      setEstado({ achado: c });
    } catch (e) {
      setEstado({ erro: motivo(e) });
    }
  }

  const c = estado?.achado;
  return (
    <>
      <Toolbar>
        <CampoBusca><SearchInput
          value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscar()}
          placeholder="Código do Winthor ou CPF/CNPJ" aria-label="Código do Winthor ou CPF/CNPJ"
        /></CampoBusca>
        <Button variant="primary" onClick={buscar} disabled={estado?.ocupado}>Buscar no Winthor</Button>
      </Toolbar>
      <CorpoPainel>
        <Alert tone="info">
          Entra sozinho na carteira quem tem título em aberto ou movimento nos últimos 12 meses. Aqui a busca vai direto ao
          Winthor, pelo código exato ou pelo CPF/CNPJ.
        </Alert>
        {estado?.erro ? <Alert tone="error">{estado.erro}</Alert> : null}
      </CorpoPainel>
      {c ? (
        <Table>
          <thead><tr><Th>Cliente no Winthor</Th><Th>Situação</Th><Th /></tr></thead>
          <tbody>
            <Tr>
              <Td>
                <RowTitle>{String(c.nome)}</RowTitle>
                <RowMeta><Code>{String(c.codcli)}</Code> · {formatarDocumento(c.documento)} · {cidade(c.municipio, c.uf)}</RowMeta>
              </Td>
              <Td>{c.naCarteira ? <Status tone="live">Na carteira</Status> : <Status tone="off">Fora da carteira</Status>}</Td>
              <Td numeric><Button size="sm" onClick={() => navigate(`/clientes/${c.codcli}`)}>{c.naCarteira ? 'Abrir ficha' : 'Abrir ficha ao vivo'}</Button></Td>
            </Tr>
          </tbody>
        </Table>
      ) : null}
    </>
  );
}
