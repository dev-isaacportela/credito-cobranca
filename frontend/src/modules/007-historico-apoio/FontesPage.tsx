// Fontes e links (T-208, opção A "Lista agrupada"): seis grupos que abrem e fecham, busca, grupo, revisão e
// inativas; selo "A revisar pelo Jurídico" com a revisão registrada (RF-016); incluir, editar, ordenar e
// inativar para Gerente, Diretoria e Administrador (RF-014, RF-024). Sem permissão o botão desabilita.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';
import { normalizar } from '@/lib/historico-apoio/texto';
import {
  Acoes, Alert, Button, CampoBusca, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, EmptyState, Field, GradeCampos, IconButton, Input, LabelledField, LinkExterno,
  Marcar, MetaDot, PageHeader, Pagination, Panel, Pilha, Recolhivel, RowMeta, RowTitle, SearchInput, SelectMenu,
  Stat, Status, Table, Td, Textarea, Th, Toolbar, Tr,
} from '@/components/page';
import { executar, type Linha, useDados, useEspera } from './dados';

const LIMITE = 100;
const REVISAO = [
  { value: '-1', label: 'Revisão: todas' },
  { value: '1', label: 'A revisar pelo Jurídico' },
  { value: '0', label: 'Revisadas ou sem revisão' },
];

const host = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

/** Entrada de ccHistFonteSalvar a partir da linha da listagem (números como número). */
const entradaDa = (f: Linha) => ({
  fonteId: Number(f.ID) || 0, grupo: String(f.GRUPO ?? ''), titulo: String(f.TITULO ?? ''), url: String(f.URL ?? ''),
  responsavel: String(f.RESPONSAVEL ?? ''), uso: String(f.USO ?? ''), ordem: Number(f.ORDEM) || 0, ativo: Number(f.ATIVO) ? 1 : 0, revisarJuridico: 0,
});

export default function FontesPage() {
  const membro = useOutletContext<MembroSessao>();
  const adm = podeAdministrar(membro);
  const podeRevisar = adm || membro.cargo === 'JURIDICO';
  const [termo, setTermo] = useState('');
  const busca = normalizar(useEspera(termo));
  const [grupo, setGrupo] = useState('');
  const [revisar, setRevisar] = useState('-1');
  const [inativas, setInativas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [ocupado, setOcupado] = useState(0);

  const filtro = { busca, grupo, revisar: Number(revisar), ativo: inativas ? -1 : 1 };
  const chave = JSON.stringify(filtro);
  const lista = useDados(() => linhas('ccHistFonteListar', { ...filtro, limite: LIMITE, offset: (pagina - 1) * LIMITE }).then((rows) => {
    // Os grupos na ordem da carga; o filtro não apaga os que já apareceram (seletor e diálogo).
    setGrupos((g) => [...g, ...rows.map((r) => String(r.GRUPO)).filter((x, i, a) => !g.includes(x) && a.indexOf(x) === i)]);
    return rows;
  }), `${chave}:${pagina}`);
  const total = useDados(() => linha('ccHistFonteTotal', filtro), chave);
  const t = total.dados;
  const n = Number(t?.TOTAL) || 0;
  const rows = lista.dados ?? [];
  const mudar = (f: () => void) => { f(); setPagina(1); };
  const recarregar = () => { lista.recarregar(); total.recarregar(); };

  async function salvarLinha(f: Linha, extra: Partial<ReturnType<typeof entradaDa>>, feito: string) {
    setOcupado(Number(f.ID));
    const r = await executar(() => acao('ccHistFonteSalvar', { ...entradaDa(f), ...extra }));
    setOcupado(0);
    setAviso(r.ok ? { tom: 'success', texto: feito } : { tom: 'error', texto: r.erro });
    if (r.ok) recarregar();
  }

  async function revisarFonte(f: Linha) {
    setOcupado(Number(f.ID));
    const r = await executar(() => acao('ccHistFonteRevisar', { fonteId: Number(f.ID) }));
    setOcupado(0);
    setAviso(r.ok ? { tom: 'success', texto: `Revisão de “${f.TITULO}” registrada.` } : { tom: 'error', texto: r.erro });
    if (r.ok) recarregar();
  }

  const porGrupo = grupos.map((g) => ({ g, fontes: rows.filter((r) => r.GRUPO === g) })).filter((x) => x.fontes.length);
  return (
    <>
      <PageHeader module="Histórico e apoio" title="Fontes e links"
        description="Onde consultar cada informação usada na análise de crédito e na cobrança, e a legislação de referência. Links abrem em nova aba."
        meta={t ? <><Stat>{n}</Stat> {n === 1 ? 'fonte' : 'fontes'}<MetaDot /><Stat>{Number(t.GRUPOS) || 0}</Stat> grupos<MetaDot /><Stat>{Number(t.A_REVISAR) || 0}</Stat> a revisar pelo Jurídico</> : undefined}
        actions={<Button disabled={!adm} title={adm ? undefined : 'Só Gerente, Diretoria ou Administrador cadastra fonte'} onClick={() => setEditando({})}><Plus aria-hidden />Nova fonte</Button>} />
      <Pilha>
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          <Toolbar>
            <CampoBusca><Field label="Buscar"><SearchInput value={termo} onChange={(e) => mudar(() => setTermo(e.target.value))} placeholder="Título, responsável ou uso" /></Field></CampoBusca>
            <Field label="Grupo"><SelectMenu label="Grupo" value={grupo} onChange={(v) => mudar(() => setGrupo(v))}
              options={[{ value: '', label: 'Todos os grupos' }, ...grupos.map((g) => ({ value: g, label: g }))]} /></Field>
            <Field label="Revisão"><SelectMenu label="Revisão" value={revisar} onChange={(v) => mudar(() => setRevisar(v))} options={REVISAO} /></Field>
            <Marcar checked={inativas} disabled={!adm} onChange={(v) => mudar(() => setInativas(v))}>Mostrar inativas</Marcar>
          </Toolbar>
          {lista.erro || total.erro ? <Alert tone="error">{lista.erro || total.erro}</Alert> : null}
          {porGrupo.length ? porGrupo.map(({ g, fontes }) => {
            const aRevisar = fontes.filter((f) => Number(f.REVISAR_JURIDICO)).length;
            return (
              <Recolhivel key={g} titulo={g} aberto moldura="linha" dica={`${fontes.length} ${fontes.length === 1 ? 'fonte' : 'fontes'}${aRevisar ? ` · ${aRevisar} a revisar` : ''}`}>
                <Table>
                  <thead><tr><Th>Fonte</Th><Th>Responsável</Th><Th>Uso</Th><Th>Revisão do Jurídico</Th><Th aria-label="Ações" /></tr></thead>
                  <tbody>
                    {fontes.map((f) => (
                      <Tr key={f.ID}>
                        <Td>
                          {f.URL ? <LinkExterno href={String(f.URL)}>{f.TITULO}</LinkExterno> : <RowTitle>{f.TITULO}</RowTitle>}
                          <RowMeta>{f.URL ? host(String(f.URL)) : 'Sem link'}</RowMeta>
                          {Number(f.ATIVO) ? null : <Status tone="off">Inativa</Status>}
                        </Td>
                        <Td>{f.RESPONSAVEL || <Dash />}</Td>
                        <Td>{f.USO || <Dash />}</Td>
                        <Td>
                          {Number(f.REVISAR_JURIDICO) ? <Status tone="attention">A revisar pelo Jurídico</Status>
                            : f.REVISADO_EM ? <><Status tone="live">Revisada</Status><RowMeta>{f.REVISADO_POR_NOME || '—'}, {fmtData(f.REVISADO_EM)}</RowMeta></> : <Dash />}
                        </Td>
                        <Td>
                          <Acoes>
                            {Number(f.REVISAR_JURIDICO) ? (
                              <IconButton label="Marcar como revisada" disabled={!podeRevisar || ocupado === Number(f.ID)} onClick={() => revisarFonte(f)}><Check aria-hidden /></IconButton>
                            ) : null}
                            <IconButton label="Editar" disabled={!adm} onClick={() => setEditando(f)}><Pencil aria-hidden /></IconButton>
                            {Number(f.ATIVO) ? (
                              <IconButton label="Inativar" tone="danger" disabled={!adm || ocupado === Number(f.ID)} onClick={() => salvarLinha(f, { ativo: 0 }, `“${f.TITULO}” inativada: some da consulta dos demais perfis.`)}><X aria-hidden /></IconButton>
                            ) : (
                              <IconButton label="Reativar" disabled={!adm || ocupado === Number(f.ID)} onClick={() => salvarLinha(f, { ativo: 1 }, `“${f.TITULO}” reativada.`)}><RotateCcw aria-hidden /></IconButton>
                            )}
                          </Acoes>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Recolhivel>
            );
          }) : lista.carregando ? null : <EmptyState title="Nenhuma fonte encontrada" hint="Limpe a busca ou escolha outro grupo." />}
          {n > LIMITE ? (
            <Pagination page={pagina} lastPage={Math.ceil(n / LIMITE)} total={n} unit="fontes" busy={lista.carregando}
              onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
          ) : null}
        </Panel>
      </Pilha>
      {editando ? (
        <DialogoFonte fonte={editando} grupos={grupos} linhas={rows} onFechar={() => setEditando(null)}
          onSalvo={(texto) => { setEditando(null); setAviso({ tom: 'success', texto }); recarregar(); }} />
      ) : null}
    </>
  );
}

function DialogoFonte({ fonte, grupos, linhas: rows, onFechar, onSalvo }: {
  fonte: Linha; grupos: string[]; linhas: Linha[]; onFechar: () => void; onSalvo: (texto: string) => void;
}) {
  const nova = !fonte.ID;
  const proxima = (g: string) => Math.max(0, ...rows.filter((r) => r.GRUPO === g).map((r) => Number(r.ORDEM) || 0)) + 1;
  const inicio = nova ? { ...entradaDa({ GRUPO: grupos[0] ?? '', ATIVO: 1 }), ordem: proxima(grupos[0] ?? '') } : entradaDa(fonte);
  const [f, setF] = useState(inicio);
  const [ordem, setOrdem] = useState(String(inicio.ordem));
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const muda = (campo: keyof typeof f, valor: string | number) => setF({ ...f, [campo]: valor });

  async function salvar() {
    setOcupado(true);
    const r = await executar(() => acao('ccHistFonteSalvar', { ...f, ordem: Math.trunc(Number(ordem)) || 0 }));
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    onSalvo(nova ? `Fonte “${f.titulo}” incluída.` : r.r.alterado === false ? 'Nada mudou na fonte.' : `Fonte “${f.titulo}” salva.`);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nova ? 'Nova fonte' : 'Editar fonte'}</DialogTitle>
          <DialogDescription>A {nova ? 'inclusão' : 'alteração'} fica registrada na auditoria. Mudar o título ou o link devolve o selo “A revisar pelo Jurídico”.</DialogDescription>
        </DialogHeader>
        <DialogBody><Pilha>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <GradeCampos>
            <LabelledField label="Grupo" obrigatorio hint="Escolha um grupo da lista ou digite um novo.">
              <Input list="ha-grupos-fonte" value={f.grupo} onChange={(e) => muda('grupo', e.target.value)} />
            </LabelledField>
            <LabelledField label="Título" obrigatorio><Input value={f.titulo} onChange={(e) => muda('titulo', e.target.value)} /></LabelledField>
            <LabelledField label="Link" hint="Começa com http:// ou https://. Fonte sem endereço conhecido fica sem link.">
              <Input type="url" value={f.url} placeholder="https://" onChange={(e) => muda('url', e.target.value.trim())} />
            </LabelledField>
            <LabelledField label="Responsável"><Input value={f.responsavel} onChange={(e) => muda('responsavel', e.target.value)} /></LabelledField>
            <LabelledField label="Ordem no grupo" hint="Menor aparece primeiro."><Input type="number" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} /></LabelledField>
            <Field label="Situação">
              <Marcar checked={f.ativo === 1} onChange={(v) => muda('ativo', v ? 1 : 0)}>Ativa (aparece para todos os perfis)</Marcar>
            </Field>
          </GradeCampos>
          <LabelledField label="Uso"><Textarea value={f.uso} onChange={(e) => muda('uso', e.target.value)} /></LabelledField>
          <Marcar checked={f.revisarJuridico === 1} onChange={(v) => muda('revisarJuridico', v ? 1 : 0)}>
            {nova ? 'Marcar “A revisar pelo Jurídico” (legislação e normas)' : 'Pedir nova revisão do Jurídico'}
          </Marcar>
          <datalist id="ha-grupos-fonte">{grupos.map((g) => <option key={g} value={g} />)}</datalist>
        </Pilha></DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" disabled={ocupado || !f.grupo.trim() || !f.titulo.trim()} onClick={salvar}>Salvar fonte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
