/**
 * /contatos — opção `contatos` C "Agenda de contatos" (telas-04-contatos.html): uma linha por pessoa em
 * toda a carteira visível, busca por nome, telefone ou e-mail, e a ficha do cliente num diálogo (o mesmo
 * componente da aba Contatos da ficha). Clientes sem nenhum contato viram um aviso à parte.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { linha, linhas } from '@/lib/mitra-api';
import {
  Alert, CampoBusca, Code, CorpoPainel, Dash, EmptyState, Field, IconButton, MetaDot, PageHeader, Pagination,
  Panel, Pilha, RowMeta, RowTitle, SearchInput, SelectMenu, Stat, Status, Table, Td, TextLink, Th, Toolbar, Tr,
} from '@/components/page';
import { AREAS_CONTATO, SITUACAO_FICHA, opcoes, useDados, useEspera } from '../comum';
import { EditorFicha } from './FichaContatos';

type Linha = Record<string, unknown>;
const POR_PAGINA = 20;

/** Como `CC_CONTATO_CLIENTE.BUSCA` é gravada (normalizarTexto do backend): caixa alta, sem acento. */
const textoDeBusca = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

export default function Contatos() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [area, setArea] = useState('');
  const [situacaoFicha, setSituacaoFicha] = useState('');
  const [soPrincipais, setSoPrincipais] = useState('0');
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState('');
  const busca = textoDeBusca(useEspera(texto));

  const filtro = { area, soPrincipais: Number(soPrincipais), busca, situacaoFicha, clienteId: 0 };
  const dados = useDados(async () => {
    const [lista, total] = await Promise.all([
      linhas('ccBaseContatoListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
      linha('ccBaseContatoTotal', filtro),
    ]);
    return { lista, total };
  }, `${JSON.stringify(filtro)}|${pagina}`);

  // A ficha do diálogo é a lista fixa do cliente (clienteId > 0), lida só quando abre.
  const ficha = useDados(async () => (aberto ? linhas('ccBaseContatoListar', { area: '', soPrincipais: 0, busca: '', situacaoFicha: '', clienteId: Number(aberto.CLIENTE_ID), limite: 500, offset: 0 }) : null), String(aberto?.CLIENTE_ID ?? ''));

  const t = dados.dados?.total;
  const total = Number(t?.TOTAL ?? 0);
  const semContato = Number(t?.CLIENTES_SEM_CONTATO ?? 0);
  const filtrar = (f: () => void) => {
    f();
    setPagina(1);
  };
  const lista = dados.dados?.lista ?? [];

  return (
    <>
      <PageHeader
        module="Contatos"
        title="Contatos dos clientes"
        description="Todas as pessoas e canais das fichas dos clientes que você enxerga. A ficha vale pelo prazo da política a partir da última revisão."
        meta={t ? (
          <>
            <span><Stat>{total}</Stat> {total === 1 ? 'contato' : 'contatos'}</span><MetaDot />
            <span><Stat>{Number(t.CLIENTES_COM_FICHA)}</Stat> clientes com ficha</span><MetaDot />
            <span><Stat>{Number(t.FICHAS_VENCIDAS)}</Stat> {Number(t.FICHAS_VENCIDAS) === 1 ? 'ficha vencida' : 'fichas vencidas'}</span>
          </>
        ) : undefined}
      />
      <Pilha>
        {semContato ? (
          <Alert tone="warn">
            {semContato === 1 ? '1 cliente sem nenhum contato' : `${semContato} clientes sem nenhum contato`}. Sem e-mail na ficha, nenhum e-mail
            pode ser enviado a eles: veja a fila "Ficha de contatos a revisar" em Clientes.
          </Alert>
        ) : null}
        {aviso ? <Alert tone="success">{aviso}</Alert> : null}
        <Panel>
          <Toolbar>
            <CampoBusca><SearchInput value={texto} onChange={(e) => filtrar(() => setTexto(e.target.value))} placeholder="Buscar pessoa, telefone ou e-mail" aria-label="Buscar contato" /></CampoBusca>
            <Field label="Área"><SelectMenu label="Área" value={area} onChange={(v) => filtrar(() => setArea(v))} options={opcoes(AREAS_CONTATO, 'Todas as áreas')} /></Field>
            <Field label="Ficha do cliente"><SelectMenu
              label="Ficha do cliente" value={situacaoFicha} onChange={(v) => filtrar(() => setSituacaoFicha(v))}
              options={[{ value: '', label: 'Todas as fichas' }, { value: 'EM_DIA', label: 'Ficha em dia' }, { value: 'A_REVISAR', label: 'Ficha a revisar' }]}
            /></Field>
            <Field label="Só principais"><SelectMenu
              label="Só principais" value={soPrincipais} onChange={(v) => filtrar(() => setSoPrincipais(v))}
              options={[{ value: '0', label: 'Todos os contatos' }, { value: '1', label: 'Só os principais' }]}
            /></Field>
          </Toolbar>
          {dados.erro ? <CorpoPainel><Alert tone="error">{dados.erro}</Alert></CorpoPainel> : null}
          {lista.length === 0 ? (
            <EmptyState title={dados.carregando ? 'Carregando os contatos…' : 'Nenhum contato encontrado.'} hint={dados.carregando ? undefined : 'Limpe a busca ou os filtros; contato novo entra pela ficha do cliente.'} />
          ) : (
            <>
              <Table>
                <thead><tr><Th>Contato</Th><Th>Cliente</Th><Th>Telefone · WhatsApp</Th><Th>E-mail</Th><Th>Ficha do cliente</Th><Th /></tr></thead>
                <tbody>
                  {lista.map((c) => {
                    const s = SITUACAO_FICHA[String(c.SITUACAO_FICHA)] ?? SITUACAO_FICHA.NUNCA;
                    return (
                      <Tr key={String(c.ID)}>
                        <Td>
                          <RowTitle>{String(c.NOME)}</RowTitle>
                          <RowMeta>{[Number(c.PRINCIPAL) ? 'Principal' : '', c.AREA, c.FUNCAO].filter(Boolean).join(' · ') || 'Sem área'}</RowMeta>
                        </Td>
                        <Td>
                          <TextLink onClick={() => navigate(`/clientes/${c.CODCLI}`)}>{String(c.CLIENTE_NOME)}</TextLink>
                          <RowMeta><Code>{String(c.CODCLI)}</Code>{c.AGENTE_NOME ? ` · ${c.AGENTE_NOME}` : ''}</RowMeta>
                        </Td>
                        <Td>{[c.TELEFONE, c.WHATSAPP].filter(Boolean).join(' · ') || <Dash />}</Td>
                        <Td>{c.EMAIL ? String(c.EMAIL) : <Dash />}</Td>
                        <Td><Status tone={s.tom}>{s.texto}</Status></Td>
                        <Td numeric><IconButton label={`Abrir a ficha de contatos de ${c.CLIENTE_NOME}`} onClick={() => setAberto(c)}><Pencil /></IconButton></Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <Pagination
                page={pagina} lastPage={Math.max(1, Math.ceil(total / POR_PAGINA))} total={total} unit={total === 1 ? 'contato' : 'contatos'}
                busy={dados.carregando} onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)}
              />
            </>
          )}
        </Panel>
      </Pilha>
      {aberto && ficha.dados && !ficha.carregando ? (
        <EditorFicha
          cliente={{ ID: aberto.CLIENTE_ID, NOME: aberto.CLIENTE_NOME, CODCLI: aberto.CODCLI, SITUACAO_FICHA: aberto.SITUACAO_FICHA }}
          contatos={ficha.dados}
          onFechar={() => setAberto(null)}
          onSalvo={(t) => {
            setAberto(null);
            setAviso(t);
            dados.reler();
          }}
        />
      ) : null}
    </>
  );
}
