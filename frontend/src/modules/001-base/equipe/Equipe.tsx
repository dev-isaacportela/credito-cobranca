/**
 * /equipe — aba Organograma na opção `equipe-organograma` C "Equipes lado a lado" (sem desenho de árvore:
 * faixa da direção, uma coluna por supervisor e "Direto com…", `montarEquipes`) e aba Cadastro na opção
 * `equipe-cadastro` A "Tabela e diálogo" (telas-05-equipe.html). Aviso do topo por ccBaseEquipeConferir;
 * a marca Administrador só habilitada para quem tem a marca; troca de topo com confirmação.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { acao, linhas } from '@/lib/mitra-api';
import { montarEquipes } from '@/lib/base/equipe';
import { podeAdministrar } from '@/lib/base/menu';
import {
  AbasDoPainel, Alert, Badge, Board, BoardCard, BoardColumn, Button, CampoBusca, Dash, Dialog, DialogBody,
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyState, Faixa, Field, Forte,
  IconButton, Input, LabelledField, Linha as LinhaUi, Marcar, MetaDot, Nota, PageHeader, Panel, Pessoa, Pilha,
  RowMeta, RowTitle, SearchInput, SelectMenu, Stat, Status, Table, Tabs, TabsContent, TabsTrigger, Td, Th,
  Toolbar, Tr,
} from '@/components/page';
import { CARGOS, OPCOES_CARGO, motivo, nivelDois, useDados, useMembro } from '../comum';

type Linha = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);
const clientes = (q: number) => (q ? `${q} ${q === 1 ? 'cliente' : 'clientes'}` : 'sem carteira');

export default function Equipe() {
  const membro = useMembro();
  const navigate = useNavigate();
  const admin = podeAdministrar(membro);
  const [aba, setAba] = useState('organograma');
  const [editando, setEditando] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState('');

  const dados = useDados(async () => {
    const [lista, conferencia] = await Promise.allSettled([
      linhas('ccBaseMembroListar', { cargo: '', ativo: -1, busca: '', limite: 500, offset: 0 }),
      admin ? acao('ccBaseEquipeConferir') : Promise.resolve(null),
    ]);
    if (lista.status === 'rejected') throw lista.reason;
    return { membros: lista.value, conferencia: conferencia.status === 'fulfilled' ? conferencia.value : null };
  }, 'equipe');

  const membros = dados.dados?.membros ?? [];
  const ativos = membros.filter((m) => n(m.ATIVO)).length;
  const c = dados.dados?.conferencia;
  const pendencias = c && c.ok !== false
    ? [
        ...(c.semUsuario ?? []).map((p: Linha) => `${p.nome} ainda não tem login com o e-mail cadastrado`),
        ...(c.semSuperior ?? []).map((p: Linha) => `${p.nome} está sem superior ativo que chefia`),
        ...(c.ciclos ?? []).length ? ['há um ciclo na hierarquia'] : [],
      ]
    : [];

  return (
    <>
      <PageHeader
        module="Equipe"
        title="Equipe"
        description="A hierarquia define a carteira que cada um enxerga: o agente vê a própria; o supervisor, a sua e a da equipe; gerente e diretoria, todas."
        meta={dados.dados ? <><span><Stat>{ativos}</Stat> {ativos === 1 ? 'ativo' : 'ativos'}</span><MetaDot /><span><Stat>{membros.length - ativos}</Stat> {membros.length - ativos === 1 ? 'inativo' : 'inativos'}</span></> : undefined}
        actions={<Button onClick={() => navigate('/equipe/redistribuir')} disabled={!nivelDois(membro)}>Redistribuir clientes</Button>}
      />
      <Pilha>
        {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
        {pendencias.length ? <Alert tone="warn">Conferência da equipe: {pendencias.join('; ')}.</Alert> : null}
        {c && n(c.clientesSemAgente) ? <Alert tone="warn">{clientes(n(c.clientesSemAgente))} sem agente: não aparecem em nenhuma equipe até serem atribuídos.</Alert> : null}
        {aviso ? <Alert tone="success">{aviso}</Alert> : null}
        <Panel>
          <Tabs value={aba} onValueChange={setAba}>
            <AbasDoPainel>
              <TabsTrigger value="organograma">Organograma</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro da equipe</TabsTrigger>
            </AbasDoPainel>
            <TabsContent value="organograma">
              {membros.length ? <Organograma membros={membros} /> : <EmptyState title={dados.carregando ? 'Carregando a equipe…' : 'Ninguém na equipe ainda.'} />}
            </TabsContent>
            <TabsContent value="cadastro">
              <Cadastro membros={membros} admin={admin} onEditar={setEditando} />
            </TabsContent>
          </Tabs>
        </Panel>
      </Pilha>
      {editando ? (
        <DialogoMembro
          editado={editando}
          membros={membros}
          onFechar={() => setEditando(null)}
          onSalvo={(t) => {
            setEditando(null);
            setAviso(t);
            dados.reler();
          }}
        />
      ) : null}
    </>
  );
}

function Organograma({ membros }: { membros: Linha[] }) {
  const { direcao, equipes, diretos } = montarEquipes(membros);
  const cartao = (p: { id: number; nome: string; cargo: string; clientes: number; inativo: boolean }) => (
    <BoardCard key={p.id}>
      <Pessoa nome={p.nome}>
        {p.inativo ? <Status tone="off">Inativo</Status> : `${CARGOS[p.cargo] ?? p.cargo} · ${clientes(p.clientes)}`}
      </Pessoa>
    </BoardCard>
  );
  return (
    <>
      <Faixa>
        <LinhaUi>
          <Forte>Direção</Forte>
          {direcao.map((p, i) => (
            <LinhaUi key={p.id}>
              {i ? <span aria-hidden>›</span> : null}
              <Pessoa nome={p.nome}>{CARGOS[p.cargo] ?? p.cargo}{i === 0 ? ' · topo' : ''}{p.inativo ? ' · inativo' : ''}</Pessoa>
            </LinhaUi>
          ))}
        </LinhaUi>
      </Faixa>
      <Board>
        {equipes.map((e) => (
          <BoardColumn key={e.supervisor.id} title={`Equipe de ${e.supervisor.nome}`} count={e.clientes}>
            {cartao(e.supervisor)}
            {e.membros.map(cartao)}
          </BoardColumn>
        ))}
        {diretos.map((d) => (
          <BoardColumn key={d.chefe.id} title={`Direto com ${d.chefe.nome}`} count={d.membros.reduce((s, p) => s + p.clientes, 0)}>
            {d.membros.map(cartao)}
          </BoardColumn>
        ))}
      </Board>
      <Faixa embaixo><Nota>O número no alto de cada coluna é a soma dos clientes da equipe.</Nota></Faixa>
    </>
  );
}

function Cadastro({ membros, admin, onEditar }: { membros: Linha[]; admin: boolean; onEditar: (m: Linha) => void }) {
  const [texto, setTexto] = useState('');
  const [cargo, setCargo] = useState('');
  const [situacao, setSituacao] = useState('');
  const t = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const visiveis = membros.filter((m) =>
    (!t || `${m.NOME} ${m.USER_EMAIL}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(t))
    && (!cargo || m.CARGO === cargo) && (!situacao || String(n(m.ATIVO)) === situacao));
  return (
    <>
      <Toolbar>
        <CampoBusca><SearchInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar membro" /></CampoBusca>
        <Field label="Cargo"><SelectMenu label="Cargo" value={cargo} onChange={setCargo} options={[{ value: '', label: 'Todos os cargos' }, ...OPCOES_CARGO]} /></Field>
        <Field label="Situação"><SelectMenu label="Situação" value={situacao} onChange={setSituacao} options={[{ value: '', label: 'Ativos e inativos' }, { value: '1', label: 'Ativos' }, { value: '0', label: 'Inativos' }]} /></Field>
        <Button onClick={() => onEditar({ ID: 0, ATIVO: 1, CARGO: 'AGENTE' })} disabled={!admin} title={admin ? undefined : 'Somente Gerente, Diretoria ou Administrador'}>
          <Plus aria-hidden />Novo membro
        </Button>
      </Toolbar>
      {visiveis.length === 0 ? <EmptyState title="Ninguém com esses filtros." /> : (
        <Table>
          <thead><tr><Th>Pessoa</Th><Th>Cargo</Th><Th>Reporta a</Th><Th>Login</Th><Th numeric>Clientes</Th><Th>Situação</Th><Th /></tr></thead>
          <tbody>
            {visiveis.map((m) => (
              <Tr key={String(m.ID)}>
                <Td><RowTitle>{String(m.NOME)}</RowTitle><RowMeta>{String(m.USER_EMAIL)}{n(m.ADMIN) ? ' · Administrador' : ''}</RowMeta></Td>
                <Td>{CARGOS[String(m.CARGO)] ?? String(m.CARGO)}</Td>
                <Td>{m.SUPERIOR_NOME ? String(m.SUPERIOR_NOME) : 'Topo da hierarquia'}</Td>
                <Td>{n(m.TEM_USUARIO) ? <Status tone="live">Vinculado</Status> : <Status tone="off">Nunca entrou</Status>}</Td>
                <Td numeric>{n(m.CLIENTES) || <Dash />}</Td>
                <Td>{n(m.ATIVO) ? <Status tone="live">Ativo</Status> : <Status tone="off">Inativo</Status>}</Td>
                <Td numeric><IconButton label={`Editar ${m.NOME}`} onClick={() => onEditar(m)} disabled={!admin}><Pencil /></IconButton></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

const TOPO = '0';

function DialogoMembro({ editado, membros, onFechar, onSalvo }: { editado: Linha; membros: Linha[]; onFechar: () => void; onSalvo: (t: string) => void }) {
  const membro = useMembro();
  const navigate = useNavigate();
  const novo = !n(editado.ID);
  const [nome, setNome] = useState(String(editado.NOME ?? ''));
  const [email, setEmail] = useState(String(editado.USER_EMAIL ?? ''));
  const [cargo, setCargo] = useState(String(editado.CARGO ?? 'AGENTE'));
  const [superior, setSuperior] = useState(editado.SUPERIOR_ID ? String(editado.SUPERIOR_ID) : novo ? '' : TOPO);
  const [ativo, setAtivo] = useState(String(n(editado.ATIVO)));
  const [adminMarca, setAdminMarca] = useState(Boolean(n(editado.ADMIN)));
  const [confirmandoTopo, setConfirmandoTopo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const topoAtual = membros.find((m) => !m.SUPERIOR_ID && n(m.ATIVO));
  const eraTopo = !novo && !editado.SUPERIOR_ID;
  const trocaDeTopo = superior === TOPO && !eraTopo;
  const opcoesSuperior = [
    ...(cargo === 'DIRETORIA' || eraTopo ? [{ value: TOPO, label: 'Topo da hierarquia', hint: eraTopo ? 'É o topo hoje' : 'Só Diretoria: troca o topo' }] : []),
    ...membros
      .filter((m) => n(m.ATIVO) && ['SUPERVISOR', 'GERENTE', 'DIRETORIA'].includes(String(m.CARGO)) && n(m.ID) !== n(editado.ID))
      .map((m) => ({ value: String(m.ID), label: String(m.NOME), hint: CARGOS[String(m.CARGO)] })),
  ];

  async function salvar() {
    if (trocaDeTopo && !confirmandoTopo) return setConfirmandoTopo(true);
    setOcupado(true);
    setErro('');
    try {
      const r = await acao('ccBaseMembroSalvar', {
        membroId: n(editado.ID), nome: nome.trim(), userEmail: email.trim(), cargo, superiorId: superior === TOPO || superior === '' ? 0 : Number(superior),
        admin: adminMarca ? 1 : 0, ativo: Number(ativo),
      });
      setOcupado(false);
      if (r.ok === false) {
        setConfirmandoTopo(false);
        return setErro(motivo(r));
      }
      onSalvo(novo ? `${nome.trim()} entrou na equipe.` : `${nome.trim()} atualizado.`);
    } catch (e) {
      setOcupado(false);
      setErro(motivo(e));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{novo ? 'Novo membro' : 'Editar membro'}</DialogTitle>
          <DialogDescription>O vínculo com o login é o e-mail: a pessoa entra com ele e passa a ver a carteira que lhe cabe. Ninguém é apagado: quem sai é inativado.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {confirmandoTopo ? (
              <Alert tone="warn">
                {nome} passa a ser o topo da hierarquia{topoAtual ? ` e ${topoAtual.NOME} passa a reportar a ${nome}` : ''}. Ninguém mais muda de superior
                e cada um continua vendo os mesmos clientes. Confirme para gravar.
              </Alert>
            ) : null}
            <LabelledField label="Nome" obrigatorio>
              <Input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
            </LabelledField>
            <LabelledField label="E-mail de login" obrigatorio>
              <Input type="email" value={email} maxLength={160} onChange={(e) => setEmail(e.target.value)} placeholder="nome@benenutri.com.br" />
            </LabelledField>
            <Field label="Cargo" obrigatorio>
              <SelectMenu label="Cargo" value={cargo} onChange={(v) => { setCargo(v); setConfirmandoTopo(false); }} options={OPCOES_CARGO} />
            </Field>
            <Field label="Reporta a" obrigatorio>
              <SelectMenu label="Reporta a" value={superior} onChange={(v) => { setSuperior(v); setConfirmandoTopo(false); }} options={opcoesSuperior} placeholder="Escolher superior" />
            </Field>
            <Field label="Situação">
              <SelectMenu label="Situação" value={ativo} onChange={setAtivo} options={[{ value: '1', label: 'Ativo' }, { value: '0', label: 'Inativo' }]} disabled={novo} />
            </Field>
            <Field label="Permissão" hint={membro.admin ? undefined : 'Só quem tem a marca de Administrador pode marcá-la ou desmarcá-la.'}>
              <Marcar checked={adminMarca} onChange={setAdminMarca} disabled={!membro.admin}>
                Administrador (parâmetros, equipe, BUs, feriados e modelos) {adminMarca ? <Badge tone="accent">marca</Badge> : null}
              </Marcar>
            </Field>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          {!novo && n(editado.CLIENTES) ? (
            <Button onClick={() => navigate(`/equipe/redistribuir?agente=${editado.ID}`)} disabled={!nivelDois(membro)}>Redistribuir clientes</Button>
          ) : null}
          <Button variant="primary" onClick={salvar} disabled={ocupado || !nome.trim() || !email.trim() || superior === ''}>
            {confirmandoTopo ? 'Confirmar troca do topo' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
