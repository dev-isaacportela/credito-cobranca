// Material de apoio (T-209, opção A "Lista por grupo"): tabela única separada por grupo, busca por título,
// descrição e marcadores (RN-013), "Arquivo pendente" (RF-019), baixar; cadastrar, editar, inativar e anexar
// para Gerente, Diretoria e Administrador (RF-018). Anexar (plan "Material e arquivo"): material salvo →
// enviarArquivo → ccBaseAnexoRegistrar → ccHistMaterialSalvar (devolve anteriorAnexoId) → ccBaseAnexoRemover.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { enviarArquivo, validarArquivo } from '@/lib/base/arquivos';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';
import { normalizar } from '@/lib/historico-apoio/texto';
import {
  Acoes, Alert, Button, CampoBusca, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, EmptyState, Field, GradeCampos, IconButton, Input, LabelledField, Marcar, MetaDot,
  Nota, PageHeader, Pagination, Panel, Pilha, RowMeta, RowTitle, SearchInput, SelectMenu, Stat, Status, Table,
  Td, Textarea, Th, Toolbar, Tr, TrGrupo,
} from '@/components/page';
import { executar, type Linha, useDados, useEspera } from './dados';

const LIMITE = 100;

const tamanho = (bytes: unknown) => {
  const b = Number(bytes) || 0;
  if (!b) return '';
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
};
const tipo = (nome: unknown) => String(nome ?? '').split('.').pop()?.toUpperCase() ?? '';

/** Entrada de ccHistMaterialSalvar a partir da linha da listagem (números como número; 0 = sem arquivo novo). */
const entradaDa = (m: Linha) => ({
  materialId: Number(m.ID) || 0, grupo: String(m.GRUPO ?? ''), titulo: String(m.TITULO ?? ''), descricao: String(m.DESCRICAO ?? ''),
  tags: String(m.TAGS ?? ''), vigenteDesde: String(m.VIGENTE_DESDE ?? '').slice(0, 10), ordem: Number(m.ORDEM) || 0, ativo: Number(m.ATIVO) ? 1 : 0, anexoId: 0,
});

export default function MaterialPage() {
  const membro = useOutletContext<MembroSessao>();
  const adm = podeAdministrar(membro);
  const [termo, setTermo] = useState('');
  const busca = normalizar(useEspera(termo));
  const [grupo, setGrupo] = useState('');
  const [inativos, setInativos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [ocupado, setOcupado] = useState(0);

  const filtro = { busca, grupo, ativo: inativos ? -1 : 1 };
  const chave = JSON.stringify(filtro);
  const lista = useDados(() => linhas('ccHistMaterialListar', { ...filtro, limite: LIMITE, offset: (pagina - 1) * LIMITE }).then((rows) => {
    setGrupos((g) => [...g, ...rows.map((r) => String(r.GRUPO)).filter((x, i, a) => !g.includes(x) && a.indexOf(x) === i)]);
    return rows;
  }), `${chave}:${pagina}`);
  const total = useDados(() => linha('ccHistMaterialTotal', filtro), chave);
  const t = total.dados;
  const n = Number(t?.TOTAL) || 0;
  const rows = lista.dados ?? [];
  const mudar = (f: () => void) => { f(); setPagina(1); };
  const recarregar = () => { lista.recarregar(); total.recarregar(); };

  async function ativar(m: Linha, ativo: number) {
    setOcupado(Number(m.ID));
    const r = await executar(() => acao('ccHistMaterialSalvar', { ...entradaDa(m), ativo }));
    setOcupado(0);
    setAviso(r.ok ? { tom: 'success', texto: `“${m.TITULO}” ${ativo ? 'reativado' : 'inativado: some da consulta dos demais perfis'}.` } : { tom: 'error', texto: r.erro });
    if (r.ok) recarregar();
  }

  const porGrupo = grupos.map((g) => ({ g, itens: rows.filter((r) => r.GRUPO === g) })).filter((x) => x.itens.length);
  return (
    <>
      <PageHeader module="Histórico e apoio" title="Material de apoio"
        description="Documentos padronizados do Crédito e Cobrança, no layout Benenutri, para consulta. As versões editáveis ficam com o Núcleo Financeiro."
        meta={t ? <><Stat>{n}</Stat> {n === 1 ? 'documento' : 'documentos'}<MetaDot /><Stat>{Number(t.PENDENTES) || 0}</Stat> com arquivo pendente</> : undefined}
        actions={<Button disabled={!adm} title={adm ? undefined : 'Só Gerente, Diretoria ou Administrador cadastra documento'} onClick={() => setEditando({})}><Plus aria-hidden />Novo documento</Button>} />
      <Pilha>
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          <Toolbar>
            <CampoBusca><Field label="Buscar"><SearchInput value={termo} onChange={(e) => mudar(() => setTermo(e.target.value))} placeholder="Título, descrição ou marcador" /></Field></CampoBusca>
            <Field label="Grupo"><SelectMenu label="Grupo" value={grupo} onChange={(v) => mudar(() => setGrupo(v))}
              options={[{ value: '', label: 'Todos os grupos' }, ...grupos.map((g) => ({ value: g, label: g }))]} /></Field>
            <Marcar checked={inativos} disabled={!adm} onChange={(v) => mudar(() => setInativos(v))}>Mostrar inativos</Marcar>
          </Toolbar>
          {lista.erro || total.erro ? <Alert tone="error">{lista.erro || total.erro}</Alert> : null}
          {porGrupo.length ? (
            <Table>
              <thead><tr><Th>Documento</Th><Th>Marcadores</Th><Th>Arquivo</Th><Th>Vigente desde</Th><Th aria-label="Ações" /></tr></thead>
              <tbody>
                {porGrupo.flatMap(({ g, itens }) => {
                  const pendentes = itens.filter((m) => !m.ANEXO_URL).length;
                  return [
                    <TrGrupo key={`g:${g}`} colunas={5}>
                      {g} <Nota>{itens.length} {itens.length === 1 ? 'documento' : 'documentos'}{pendentes ? ` · ${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}` : ''}</Nota>
                    </TrGrupo>,
                    ...itens.map((m) => (
                      <Tr key={m.ID}>
                        <Td>
                          <RowTitle>{m.TITULO}</RowTitle>
                          {m.DESCRICAO ? <RowMeta>{m.DESCRICAO}</RowMeta> : null}
                          {Number(m.ATIVO) ? null : <Status tone="off">Inativo</Status>}
                        </Td>
                        <Td>{m.TAGS || <Dash />}</Td>
                        <Td>{m.ANEXO_URL ? <>{tipo(m.ANEXO_NOME)} · {tamanho(m.ANEXO_TAMANHO)}<RowMeta>{m.ANEXO_NOME}</RowMeta></> : <Status tone="attention">Arquivo pendente</Status>}</Td>
                        <Td>{m.VIGENTE_DESDE ? fmtData(m.VIGENTE_DESDE) : <Dash />}</Td>
                        <Td>
                          <Acoes>
                            {m.ANEXO_URL ? (
                              <Button size="sm" asChild><a href={String(m.ANEXO_URL)} target="_blank" rel="noopener noreferrer" download={m.ANEXO_NOME}>Baixar</a></Button>
                            ) : (
                              <Button size="sm" disabled={!adm} onClick={() => setEditando(m)}>Anexar</Button>
                            )}
                            <IconButton label="Editar" disabled={!adm} onClick={() => setEditando(m)}><Pencil aria-hidden /></IconButton>
                            {Number(m.ATIVO) ? (
                              <IconButton label="Inativar" tone="danger" disabled={!adm || ocupado === Number(m.ID)} onClick={() => ativar(m, 0)}><X aria-hidden /></IconButton>
                            ) : (
                              <IconButton label="Reativar" disabled={!adm || ocupado === Number(m.ID)} onClick={() => ativar(m, 1)}><RotateCcw aria-hidden /></IconButton>
                            )}
                          </Acoes>
                        </Td>
                      </Tr>
                    )),
                  ];
                })}
              </tbody>
            </Table>
          ) : lista.carregando ? null : <EmptyState title="Nenhum documento encontrado" hint="Limpe a busca ou escolha outro grupo." />}
          {n > LIMITE ? (
            <Pagination page={pagina} lastPage={Math.ceil(n / LIMITE)} total={n} unit="documentos" busy={lista.carregando}
              onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
          ) : null}
        </Panel>
      </Pilha>
      {editando ? (
        <DialogoMaterial material={editando} grupos={grupos} linhas={rows} onFechar={() => setEditando(null)}
          onSalvo={(texto) => { setEditando(null); setAviso({ tom: 'success', texto }); recarregar(); }} />
      ) : null}
    </>
  );
}

function DialogoMaterial({ material, grupos, linhas: rows, onFechar, onSalvo }: {
  material: Linha; grupos: string[]; linhas: Linha[]; onFechar: () => void; onSalvo: (texto: string) => void;
}) {
  const novo = !material.ID;
  const proxima = (g: string) => Math.max(0, ...rows.filter((r) => r.GRUPO === g).map((r) => Number(r.ORDEM) || 0)) + 1;
  const inicio = novo ? { ...entradaDa({ GRUPO: grupos[0] ?? '', ATIVO: 1 }), ordem: proxima(grupos[0] ?? '') } : entradaDa(material);
  const [m, setM] = useState(inicio);
  const [ordem, setOrdem] = useState(String(inicio.ordem));
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState('');
  const muda = (campo: keyof typeof m, valor: string | number) => setM({ ...m, [campo]: valor });

  function escolher(f: File | null) {
    setArquivo(null);
    setErro('');
    if (!f) return;
    const recusa = validarArquivo({ nome: f.name, tamanho: f.size });
    if (recusa) return setErro(`Arquivo recusado: ${f.name}. ${recusa} O arquivo anterior permanece.`);
    setArquivo(f);
  }

  async function salvar() {
    setErro('');
    const campos = { ...m, ordem: Math.trunc(Number(ordem)) || 0 };
    // (1) o documento salvo (o anexo precisa do id)
    setOcupado('Salvando o documento…');
    const salvo = await executar(() => acao('ccHistMaterialSalvar', { ...campos, anexoId: 0 }));
    if (!salvo.ok) { setOcupado(''); return setErro(salvo.erro); }
    const materialId = Number(salvo.r.materialId) || campos.materialId;
    setM((x) => ({ ...x, materialId })); // repetir o clique depois de uma recusa do arquivo edita, não inclui de novo
    if (!arquivo) { setOcupado(''); return onSalvo(novo && !campos.materialId ? `Documento “${m.titulo}” incluído como “Arquivo pendente”.` : `Documento “${m.titulo}” salvo.`); }
    // (2) envio, (3) registro do anexo, (4) ligação ao item, (5) remoção do anterior (falha aqui é ignorada)
    setOcupado('Enviando o arquivo…');
    const ligado = await executar(async () => {
      const url = await enviarArquivo(arquivo);
      const reg = await acao('ccBaseAnexoRegistrar', {
        entidade: 'MATERIAL', entidadeId: materialId, clienteId: 0, tipoDoc: 'Material de apoio', nomeArquivo: arquivo.name,
        mime: arquivo.type, tamanhoBytes: arquivo.size, url,
      });
      if (reg?.ok === false) return reg;
      return acao('ccHistMaterialSalvar', { ...campos, materialId, anexoId: Number(reg.anexoId) || 0 });
    });
    setOcupado('');
    if (!ligado.ok) return setErro(`${novo ? 'O documento foi incluído, mas o arquivo não entrou: ' : ''}${ligado.erro} O arquivo anterior permanece.`);
    const anterior = Number(ligado.r.anteriorAnexoId) || 0;
    if (anterior) await executar(() => acao('ccBaseAnexoRemover', { anexoId: anterior }));
    onSalvo(`Documento “${m.titulo}” salvo com o arquivo ${arquivo.name}.`);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && !ocupado && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{novo ? 'Novo documento' : 'Editar documento'}</DialogTitle>
          <DialogDescription>A {novo ? 'inclusão' : 'alteração'} fica registrada na auditoria.</DialogDescription>
        </DialogHeader>
        <DialogBody><Pilha>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <GradeCampos>
            <LabelledField label="Grupo" obrigatorio hint="Escolha um grupo da lista ou digite um novo.">
              <Input list="ha-grupos-material" value={m.grupo} onChange={(e) => muda('grupo', e.target.value)} />
            </LabelledField>
            <LabelledField label="Título" obrigatorio><Input value={m.titulo} onChange={(e) => muda('titulo', e.target.value)} /></LabelledField>
            <LabelledField label="Marcadores" hint="Separados por vírgula."><Input value={m.tags} onChange={(e) => muda('tags', e.target.value)} /></LabelledField>
            <LabelledField label="Vigente desde"><Input type="date" value={m.vigenteDesde} onChange={(e) => muda('vigenteDesde', e.target.value)} /></LabelledField>
            <LabelledField label="Ordem no grupo" hint="Menor aparece primeiro."><Input type="number" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} /></LabelledField>
            <Field label="Situação"><Marcar checked={m.ativo === 1} onChange={(v) => muda('ativo', v ? 1 : 0)}>Ativo (aparece para todos os perfis)</Marcar></Field>
          </GradeCampos>
          <LabelledField label="Descrição"><Textarea value={m.descricao} onChange={(e) => muda('descricao', e.target.value)} /></LabelledField>
          <LabelledField label="Arquivo" hint={`PDF, PNG, JPG, XLSX ou DOCX, até 20 MB. Um novo arquivo substitui o anterior${material.ANEXO_NOME ? ` (${material.ANEXO_NOME})` : ''}. O arquivo fica em endereço público. Sem arquivo, o documento fica como “Arquivo pendente”.`}>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" onChange={(e) => escolher(e.target.files?.[0] ?? null)} />
          </LabelledField>
          {ocupado ? <Nota>{ocupado}</Nota> : null}
          <datalist id="ha-grupos-material">{grupos.map((g) => <option key={g} value={g} />)}</datalist>
        </Pilha></DialogBody>
        <DialogFooter>
          <Button variant="ghost" disabled={Boolean(ocupado)} onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" disabled={Boolean(ocupado) || !m.grupo.trim() || !m.titulo.trim()} onClick={salvar}>Salvar documento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
