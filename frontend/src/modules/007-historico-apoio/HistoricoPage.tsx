// Histórico do cliente (T-206, opção C "Por assunto, em abas"): busca, 4 números, resumo de 12 campos
// recolhível, abas e pílulas com contagem, registros por dia ("Agendado" primeiro), paginação de 20.
// Ao abrir: ccHistResumo + ccHistEventoListar (2 execuções); trocar aba, pílula ou página relê só a lista
// e o total vem das contagens do resumo (D-004). Sem acesso: "Cliente não encontrado." e nenhuma lista.

import { type ReactNode, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { acao, linhas } from '@/lib/mitra-api';
import { moeda } from '@/lib/formato';
import { formatarDocumento } from '@/lib/base/documento';
import type { MembroSessao } from '@/lib/base/menu';
import { ABAS, categoriasDaAba, corDaCategoria, filtroDeCategoria, totalDaAba } from '@/lib/historico-apoio/categorias';
import { agruparPorDia, camposDoResumo, horaDoEvento } from '@/lib/historico-apoio/documento';
import { formatarTexto, partesDoTexto, termoDeBusca } from '@/lib/historico-apoio/texto';
import {
  AbasDoPainel, Alert, Button, CampoBusca, Categoria, Code, Contagem, CorpoPainel, Dash, CabecalhoDia, EmptyState,
  Expandir, Ficha, GradeKpi, ItemDaLinha, ItemFicha, Kpi, MetaDot, Nota, PageHeader, Pagination, Panel, Pilha,
  Pilula, Pilulas, Recolhivel, RowMeta, SearchInput, Status, Table, Tabs, TabsTrigger, Td, TextLink,
  TextoDoRegistro, Th, TituloDoRegistro, Toolbar, Tr,
} from '@/components/page';
import { type Linha, useDados, useEspera } from './dados';

const POR_PAGINA = 20;
const MODULO = 'Histórico e apoio';

export default function HistoricoPage() {
  const { clienteId } = useParams();
  const id = Number(clienteId) || 0;
  const membro = useOutletContext<MembroSessao>();
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');
  const busca = termoDeBusca(useEspera(termo));
  const ativa = busca.length >= 2;
  // C-003: um resultado só abre direto.
  const resultado = useDados(() => (ativa ? linhas('ccHistClienteBuscar', { busca, limite: POR_PAGINA, offset: 0 }) : Promise.resolve([] as Linha[]))
    .then((rows) => {
      if (rows.length === 1) { setTermo(''); navigate(`/historico/${rows[0].ID}`); }
      return rows;
    }), busca);
  const achados = ativa && !resultado.carregando ? resultado.dados ?? [] : [];

  const campoBusca = (
    <CampoBusca><SearchInput value={termo} onChange={(e) => setTermo(e.target.value)} aria-label="Buscar cliente"
      placeholder={id ? 'Trocar de cliente: nome ou CPF/CNPJ' : 'Nome, código ou CPF/CNPJ'} /></CampoBusca>
  );
  const lista = ativa ? (
    <Resultados linhas={achados} carregando={resultado.carregando} erro={resultado.erro}
      onAbrir={(x) => { setTermo(''); navigate(`/historico/${x}`); }} />
  ) : null;

  if (!id) {
    return (
      <>
        <PageHeader module={MODULO} title="Histórico do cliente"
          description="Tudo o que foi registrado sobre o cliente, da solicitação de crédito à cobrança e ao processo, numa linha do tempo." />
        <Panel>
          <Toolbar>{campoBusca}</Toolbar>
          {lista ?? <EmptyState title="Busque o cliente" hint="Digite ao menos 2 letras do nome, o código ou o CPF/CNPJ (com ou sem pontuação). Um resultado só abre direto." />}
        </Panel>
      </>
    );
  }
  return <HistoricoDoCliente key={id} id={id} membro={membro} campoBusca={campoBusca} resultados={lista} />;
}

function Resultados({ linhas: rows, carregando, erro, onAbrir }: { linhas: Linha[]; carregando: boolean; erro: string; onAbrir: (id: number) => void }) {
  if (erro) return <Alert tone="error">{erro}</Alert>;
  if (carregando) return <EmptyState title="Buscando…" />;
  if (!rows.length) return <EmptyState title="Nenhum cliente encontrado" hint="Confira o nome ou o documento. Só aparecem os clientes que você pode ver." />;
  return (
    <>
    <Table>
      <thead><tr><Th>Cliente</Th><Th>Documento</Th><Th>Agente</Th><Th numeric>Vencido</Th></tr></thead>
      <tbody>
        {rows.map((c) => (
          <Tr key={c.ID}>
            <Td><TextLink onClick={() => onAbrir(Number(c.ID))}>{c.NOME}</TextLink><RowMeta>código {c.CODCLI}{c.UF ? ` · ${c.UF}` : ''}</RowMeta></Td>
            <Td><Code>{formatarDocumento(c.DOCUMENTO)}</Code></Td>
            <Td>{c.AGENTE_NOME || <Dash />}</Td>
            <Td numeric>{Number(c.VENCIDO) > 0 ? moeda(c.VENCIDO) : <Dash />}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
    {rows.length >= POR_PAGINA ? <Toolbar><Nota>Mostrando os {POR_PAGINA} primeiros: refine a busca.</Nota></Toolbar> : null}
    </>
  );
}

function HistoricoDoCliente({ id, membro, campoBusca, resultados }: { id: number; membro: MembroSessao; campoBusca: ReactNode; resultados: ReactNode }) {
  const navigate = useNavigate();
  const veAuditada = membro.nivel >= 2 || membro.admin;
  const [aba, setAba] = useState('tudo');
  const [pilula, setPilula] = useState('');
  const [pagina, setPagina] = useState(1);
  const cats = pilula ? [pilula] : categoriasDaAba(aba, veAuditada);
  const categoria = filtroDeCategoria(cats);

  const resumo = useDados(() => acao('ccHistResumo', { clienteId: id }), `resumo:${id}`);
  const eventos = useDados(
    () => linhas('ccHistEventoListar', { clienteId: id, categoria, de: '', ate: '', limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
    `${id}:${categoria}:${pagina}`,
  );

  const r = resumo.dados;
  if (resumo.erro || r?.ok === false) {
    return (
      <>
        <PageHeader module={MODULO} title="Histórico do cliente" actions={campoBusca} />
        <Pilha>
          {resultados}
          <Alert tone="error">{resumo.erro || String(r?.error ?? 'Cliente não encontrado.')}</Alert>
        </Pilha>
      </>
    );
  }
  if (!r) return <PageHeader module={MODULO} title="Histórico do cliente" description="Carregando o cliente…" actions={campoBusca} />;

  const c = r.cliente as Linha;
  const p = r.posicao as Linha | null;
  const contagens = (r.contagens ?? {}) as Record<string, number>;
  const total = cats.length ? cats.reduce((s, x) => s + (Number(contagens[x]) || 0), 0) : Number(r.total) || 0;
  const risco = r.risco as Linha | null;
  const documento = (cat: string) => navigate(`/historico/${id}/documento${cat ? `?categoria=${encodeURIComponent(cat)}` : ''}`);
  const trocarAba = (a: string) => { setAba(a); setPilula(''); setPagina(1); };
  const abaAtual = ABAS.find((a) => a.id === aba)!;
  const visiveis = categoriasDaAba(aba, veAuditada);
  const pct = p && Number(p.LIMITE) > 0 ? Math.round((Number(p.UTILIZADO) / Number(p.LIMITE)) * 100) : null;

  return (
    <>
      <PageHeader module={MODULO} title={c.NOME}
        description={<><Code>{formatarDocumento(c.DOCUMENTO)}</Code> · código {c.CODCLI}{c.MUNICIPIO || c.UF ? ` · ${[c.MUNICIPIO, c.UF].filter(Boolean).join('/')}` : ''}
          {c.AGENTE_NOME ? ` · agente ${c.AGENTE_NOME}` : ''}{c.SUPERVISOR_NOME ? `, supervisor ${c.SUPERVISOR_NOME}` : ''}</>}
        actions={<>{campoBusca}<Button onClick={() => documento(categoria)}>Imprimir</Button><Button variant="primary" onClick={() => documento(categoria)}>Gerar PDF</Button></>} />
      <Pilha>
        {resultados}
        <GradeKpi>
          <Kpi rotulo="Limite" valor={p?.LIMITE != null ? moeda(p.LIMITE) : <Dash />} hint={p ? `utilizado ${moeda(p.UTILIZADO)}${pct !== null ? ` (${pct}%)` : ''}` : undefined} />
          <Kpi rotulo="Vencido" valor={p ? moeda(p.VENCIDO) : <Dash />} hint={p && Number(p.DIAS_ATRASO) > 0 ? `há ${p.DIAS_ATRASO} dias` : undefined} />
          <Kpi rotulo="A vencer" valor={p ? moeda(p.A_VENCER) : <Dash />} hint={r.credito?.etapa ? `crédito em ${r.credito.etapa}` : undefined} />
          <Kpi rotulo="Recuperado" valor={r.recuperado != null ? moeda(r.recuperado) : <Dash />}
            hint={`${r.contatos} ${r.contatos === 1 ? 'contato' : 'contatos'} · ${r.promessasAbertas} ${r.promessasAbertas === 1 ? 'promessa' : 'promessas'} em aberto`} />
        </GradeKpi>
        <Panel>
          <Recolhivel moldura="linha" titulo="Resumo completo" dica={['12 campos', risco?.CRITICIDADE, r.ratingPub ?? risco?.RATING_ATUAL].filter(Boolean).join(' · ')}>
            <CorpoPainel>
              <Ficha>{camposDoResumo(r).map((f) => <ItemFicha key={f.rotulo} rotulo={f.rotulo}>{f.valor ?? <Dash />}</ItemFicha>)}</Ficha>
            </CorpoPainel>
          </Recolhivel>
        </Panel>
        <Panel>
          <Tabs value={aba} onValueChange={trocarAba}>
            <AbasDoPainel>
              {ABAS.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.rotulo} <Contagem>{totalDaAba(contagens, a.id)}</Contagem></TabsTrigger>)}
            </AbasDoPainel>
          </Tabs>
          {aba !== 'tudo' ? (
            <Pilulas rotulo={`Categorias de ${abaAtual.rotulo.toLowerCase()}`}>
              {visiveis.length > 1 ? (
                <Pilula ativa={!pilula} onClick={() => { setPilula(''); setPagina(1); }}>Todas <Contagem>{totalDaAba(contagens, aba)}</Contagem></Pilula>
              ) : null}
              {visiveis.map((cat) => (
                <Pilula key={cat} ativa={pilula === cat || (visiveis.length === 1)} disabled={!contagens[cat]} title={contagens[cat] ? undefined : 'Sem registros'}
                  onClick={() => { setPilula(visiveis.length === 1 ? '' : cat); setPagina(1); }}>
                  <Categoria nome={cat} cor={corDaCategoria(cat)} /> <Contagem>{contagens[cat] ?? 0}</Contagem>
                </Pilula>
              ))}
            </Pilulas>
          ) : null}
          {eventos.erro ? <Alert tone="error">{eventos.erro}</Alert> : null}
          {total === 0 ? (
            <EmptyState title="Nenhum registro ainda" hint={cats.length ? 'Nada registrado nesta categoria para o cliente.' : 'Os registros aparecem aqui conforme a equipe trabalha o cliente.'} />
          ) : (
            agruparPorDia(eventos.dados ?? []).map((g) => (
              <section key={g.chave}>
                <CabecalhoDia dica={`${g.eventos.length} ${g.eventos.length === 1 ? 'registro' : 'registros'}`} agendado={g.chave === 'agendado'}>{g.rotulo}</CabecalhoDia>
                {g.eventos.map((e) => <Registro key={`${e.ORIGEM}:${e.ORIGEM_ID}`} e={e} />)}
              </section>
            ))
          )}
          {total > 0 ? (
            <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(total / POR_PAGINA))} total={total} unit={total === 1 ? 'registro' : 'registros'}
              busy={eventos.carregando} onPrevious={() => setPagina((x) => x - 1)} onNext={() => setPagina((x) => x + 1)} />
          ) : null}
        </Panel>
        <Nota>
          {total} {total === 1 ? 'registro' : 'registros'} no filtro<MetaDot />O documento (Gerar PDF ou Imprimir) traz todos os registros do filtro, não só esta página.
        </Nota>
      </Pilha>
    </>
  );
}

function Registro({ e }: { e: Linha }) {
  const { principal, expandir } = partesDoTexto(e.TEXTO);
  const agendado = Number(e.AGENDADO) === 1;
  return (
    <ItemDaLinha hora={horaDoEvento(e) || <Dash />} categoria={<Categoria nome={e.CATEGORIA} cor={corDaCategoria(e.CATEGORIA)} />}>
      <TituloDoRegistro>{formatarTexto(e.TITULO)}</TituloDoRegistro>
      {principal ? <TextoDoRegistro>{formatarTexto(principal)}</TextoDoRegistro> : null}
      {expandir ? <Expandir rotulo={e.ORIGEM === 'EMAIL' ? 'Ver o e-mail completo' : 'Ver mais'}>{formatarTexto(expandir)}</Expandir> : null}
      <Nota>{agendado ? <Status tone="attention">agendado</Status> : null}{agendado && e.AUTOR_NOME ? ' ' : null}{e.AUTOR_NOME ? `por ${e.AUTOR_NOME}` : null}</Nota>
    </ItemDaLinha>
  );
}
