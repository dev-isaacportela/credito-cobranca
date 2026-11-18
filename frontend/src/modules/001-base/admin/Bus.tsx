/**
 * /admin/bus — opção `adm-bus` A "BUs em tabela" (telas-06-adm-politica.html): BUs com carteira e
 * departamentos, painel dos departamentos (os sem BU primeiro, para ligar) e o bloco "Setor público"
 * (`base.ramosPublicos` e `base.ramoPublicoPrefixo`, gravados por ccBaseParametroSalvar). BU não se apaga.
 */
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { acao, linhas } from '@/lib/mitra-api';
import { podeAdministrar } from '@/lib/base/menu';
import {
  Alert, Badge, Button, Code, CorpoPainel, Dash, Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, EmptyState, Faixa, Field, Grade, IconButton, Input, LabelledField,
  Linha as LinhaUi, MetaDot, Nota, PageHeader, Panel, PanelHeader, Pilha, RowTitle, SelectMenu, Stat, Status,
  Table, Td, Th, Tr,
} from '@/components/page';
import { CARTEIRA_NOME, motivo, useDados, useMembro } from '../comum';

type Linha = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

export default function Bus() {
  const membro = useMembro();
  const pode = podeAdministrar(membro);
  const [todos, setTodos] = useState('1');
  const [editando, setEditando] = useState<Linha | null>(null);
  const [ramos, setRamos] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);

  const dados = useDados(async () => {
    const [bus, deptos, base] = await Promise.all([
      linhas('ccBaseBuListar', { ativa: -1 }),
      linhas('ccBaseBuDeptoListar', { semBu: 0 }),
      linhas('ccBaseParametroListar', { data: '', carteira: '', grupo: 'base' }),
    ]);
    return { bus, deptos, base };
  }, 'bus');

  const bus = dados.dados?.bus ?? [];
  const deptos = dados.dados?.deptos ?? [];
  const semBu = deptos.filter((d) => !d.BU_ID);
  const listados = todos === '1' ? semBu : deptos;
  const param = (chave: string) => dados.dados?.base.find((p) => p.CHAVE === chave);
  const ramosPublicos = String(param('base.ramosPublicos')?.VALOR_EFETIVO ?? '').split(',').map((r) => r.trim()).filter(Boolean);
  const prefixo = String(param('base.ramoPublicoPrefixo')?.VALOR_EFETIVO ?? '');
  const feito = (texto: string) => {
    setEditando(null);
    setRamos(false);
    setAviso({ tom: 'success', texto });
    dados.reler();
  };

  async function ligar(d: Linha, buId: string) {
    setAviso(null);
    try {
      const r = await acao('ccBaseBuDeptoSalvar', { codepto: n(d.CODEPTO), buId: Number(buId) });
      if (r.ok === false) return setAviso({ tom: 'error', texto: motivo(r) });
      const nome = bus.find((b) => String(b.ID) === buId)?.NOME ?? 'Sem BU';
      feito(`Departamento ${d.CODEPTO} ligado a ${nome}. Vale na próxima leitura completa do Winthor.`);
    } catch (e) {
      setAviso({ tom: 'error', texto: motivo(e) });
    }
  }

  const opcoesBu = [{ value: '0', label: 'Sem BU' }, ...bus.filter((b) => n(b.ATIVA)).map((b) => ({ value: String(b.ID), label: String(b.NOME) }))];

  return (
    <>
      <PageHeader
        module="Administração"
        title="BUs e segmentos"
        description="Departamento do Winthor → BU → carteira. É pela carteira que um parâmetro pode ter valor próprio."
        meta={dados.dados ? (
          <>
            <span><Stat>{bus.length}</Stat> BUs</span><MetaDot />
            <span><Stat>{deptos.length}</Stat> departamentos no Winthor</span><MetaDot />
            <span><Stat>{semBu.length}</Stat> sem BU</span>
          </>
        ) : undefined}
        actions={<Button variant="primary" onClick={() => setEditando({ ID: 0, CARTEIRA: 'PRIVADA', ATIVA: 1, ORDEM: (bus.length + 1) * 10 })} disabled={!pode}><Plus aria-hidden />Nova BU</Button>}
      />
      <Pilha>
        {!pode ? <Alert tone="info">Somente Gerente, Diretoria ou Administrador altera BUs e departamentos.</Alert> : null}
        {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          {bus.length === 0 ? <EmptyState title={dados.carregando ? 'Carregando as BUs…' : 'Nenhuma BU cadastrada.'} /> : (
            <Table>
              <thead><tr><Th>BU</Th><Th>Carteira</Th><Th>Departamentos do Winthor</Th><Th numeric>Ordem</Th><Th>Situação</Th><Th /></tr></thead>
              <tbody>
                {bus.map((b) => (
                  <Tr key={String(b.ID)}>
                    <Td><RowTitle>{String(b.NOME)}</RowTitle></Td>
                    <Td>{CARTEIRA_NOME[String(b.CARTEIRA)] ?? String(b.CARTEIRA)}</Td>
                    <Td>
                      {b.DEPTOS
                        ? String(b.DEPTOS).split(', ').map((d, i) => {
                            const [cod, ...nome] = d.split(' ');
                            return <span key={cod}>{i ? ' · ' : ''}<Code>{cod}</Code> {nome.join(' ')}</span>;
                          })
                        : <Dash />}
                    </Td>
                    <Td numeric>{n(b.ORDEM)}</Td>
                    <Td>{n(b.ATIVA) ? <Status tone="live">Ativa</Status> : <Status tone="off">Inativa</Status>}</Td>
                    <Td numeric><IconButton label={`Editar ${b.NOME}`} onClick={() => setEditando(b)} disabled={!pode}><Pencil /></IconButton></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Grade>
          <Panel>
            <PanelHeader title={todos === '1' ? 'Departamentos sem BU' : 'Departamentos do Winthor'} hint="Ligar ou trocar a BU vale na próxima leitura completa.">
              {semBu.length ? <Badge tone="attention">{semBu.length} sem BU</Badge> : null}
              <SelectMenu label="Mostrar" value={todos} onChange={setTodos} options={[{ value: '1', label: 'Só os sem BU' }, { value: '0', label: 'Todos' }]} />
            </PanelHeader>
            {listados.length === 0 ? <EmptyState title="Todo departamento tem BU." hint="Departamento novo do Winthor aparece aqui na leitura seguinte." /> : (
              <Table>
                <thead><tr><Th>Departamento do Winthor</Th><Th>BU</Th></tr></thead>
                <tbody>
                  {listados.map((d) => (
                    <Tr key={String(d.CODEPTO)}>
                      <Td><Code>{String(d.CODEPTO)}</Code> {String(d.DEPTO_NOME)}</Td>
                      <Td>
                        <SelectMenu label={`BU do departamento ${d.CODEPTO}`} value={String(n(d.BU_ID))} onChange={(v) => ligar(d, v)} options={opcoesBu} disabled={!pode} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Faixa embaixo><Nota>Saldo de departamento sem BU entra no total do cliente, mas não em nenhuma BU.</Nota></Faixa>
          </Panel>
          <Panel>
            <PanelHeader title="Setor público">
              <Button size="sm" onClick={() => setRamos(true)} disabled={!pode || !dados.dados}><Pencil aria-hidden />Editar ramos</Button>
            </PanelHeader>
            <CorpoPainel>
              <Nota>O cliente é do setor Público quando o ramo de atividade dele no Winthor está nesta lista ou o nome do ramo começa pelo prefixo, qualquer que seja a BU do que compra. Pessoa física segue o fluxo privado.</Nota>
              <LinhaUi>
                {ramosPublicos.length ? ramosPublicos.map((r) => <Badge key={r}>{r}</Badge>) : <Dash />}
              </LinhaUi>
              <Nota>Prefixo do nome do ramo: {prefixo ? `"${prefixo}"` : 'nenhum'}</Nota>
            </CorpoPainel>
          </Panel>
        </Grade>
        <Nota>BU não é apagada: com cliente ou departamento, só se inativa.</Nota>
      </Pilha>
      {editando ? <DialogoBu bu={editando} onFechar={() => setEditando(null)} onSalvo={feito} /> : null}
      {ramos ? <DialogoRamos ramos={ramosPublicos.join(',')} prefixo={prefixo} onFechar={() => setRamos(false)} onSalvo={feito} /> : null}
    </>
  );
}

function DialogoBu({ bu, onFechar, onSalvo }: { bu: Linha; onFechar: () => void; onSalvo: (t: string) => void }) {
  const [nome, setNome] = useState(String(bu.NOME ?? ''));
  const [carteira, setCarteira] = useState(String(bu.CARTEIRA ?? 'PRIVADA'));
  const [ordem, setOrdem] = useState(String(bu.ORDEM ?? '0'));
  const [ativa, setAtiva] = useState(String(n(bu.ATIVA)));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function salvar() {
    setOcupado(true);
    try {
      const r = await acao('ccBaseBuSalvar', { buId: n(bu.ID), nome: nome.trim(), carteira, ordem: Number(ordem) || 0, ativa: Number(ativa) });
      setOcupado(false);
      if (r.ok === false) return setErro(motivo(r));
      onSalvo(`BU ${nome.trim()} salva.`);
    } catch (e) {
      setOcupado(false);
      setErro(motivo(e));
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{n(bu.ID) ? 'Editar BU' : 'Nova BU'}</DialogTitle>
          <DialogDescription>Inativar não desfaz as ligações de departamento.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <LabelledField label="Nome" obrigatorio><Input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} /></LabelledField>
            <Field label="Carteira" obrigatorio>
              <SelectMenu label="Carteira" value={carteira} onChange={setCarteira} options={[{ value: 'PRIVADA', label: 'Privado' }, { value: 'ESTETICA', label: 'Estética' }]} />
            </Field>
            <LabelledField label="Ordem" hint="Ordem em que a BU aparece nas listas."><Input type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} /></LabelledField>
            <Field label="Situação">
              <SelectMenu label="Situação" value={ativa} onChange={setAtiva} options={[{ value: '1', label: 'Ativa' }, { value: '0', label: 'Inativa' }]} />
            </Field>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={ocupado || !nome.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoRamos({ ramos, prefixo, onFechar, onSalvo }: { ramos: string; prefixo: string; onFechar: () => void; onSalvo: (t: string) => void }) {
  const [lista, setLista] = useState(ramos);
  const [texto, setTexto] = useState(prefixo);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function salvar() {
    setOcupado(true);
    const itens = [
      { chave: 'base.ramosPublicos', carteira: '', valor: lista.split(',').map((r) => r.trim()).filter(Boolean).join(','), vigenciaInicio: '' },
      { chave: 'base.ramoPublicoPrefixo', carteira: '', valor: texto.trim().toUpperCase(), vigenciaInicio: '' },
    ];
    try {
      const r = await acao('ccBaseParametroSalvar', { itens: JSON.stringify(itens) });
      setOcupado(false);
      if (r.ok === false) return setErro(motivo(r));
      onSalvo('Ramos do setor público salvos. Valem na próxima leitura do Winthor.');
    } catch (e) {
      setOcupado(false);
      setErro(motivo(e));
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ramos do setor público</DialogTitle>
          <DialogDescription>O setor do cliente é recalculado na próxima leitura do Winthor.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <LabelledField label="Códigos de ramo" hint="Separados por vírgula, como no Winthor: 11,12,13.">
              <Input value={lista} onChange={(e) => setLista(e.target.value)} />
            </LabelledField>
            <LabelledField label="Prefixo do nome do ramo" hint="Ramo cujo nome começa assim também é público. Vazio desliga.">
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} />
            </LabelledField>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={ocupado}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
