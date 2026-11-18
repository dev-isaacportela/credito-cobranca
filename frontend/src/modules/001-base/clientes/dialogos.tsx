/**
 * Diálogos da ficha do cliente (T-092, não desenhados; design.md §9.5): trocar agente (a mesma
 * atribuição da lista), grupo econômico e esfera (RF-029), enviar e-mail com prévia (RF-036, RF-037)
 * e anexar (RF-039, `validarArquivo` antes do envio). A recusa do servidor aparece no próprio diálogo.
 */
import { useState } from 'react';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { enviarArquivo, validarArquivo } from '@/lib/base/arquivos';
import { camposExtras } from '@/lib/base/telas';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogoLargo,
  DialogTitle, Field, Forte, Grade, Input, LabelledField, Nota, Pilha, Previa, SelectMenu,
} from '@/components/page';
import { executar, motivo, useDados } from '../comum';

type Linha = Record<string, unknown>;

function Rodape({ ocupado, rotulo, onConfirmar, onFechar, desabilitado, perigo }: {
  ocupado: boolean; rotulo: string; onConfirmar: () => void; onFechar: () => void; desabilitado?: boolean; perigo?: boolean;
}) {
  return (
    <DialogFooter>
      <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
      <Button variant={perigo ? 'danger' : 'primary'} onClick={onConfirmar} disabled={ocupado || desabilitado}>{rotulo}</Button>
    </DialogFooter>
  );
}


export function DialogoAgente({ cliente, destinos, onFechar, onFeito }: {
  cliente: Linha; destinos: Linha[]; onFechar: () => void; onFeito: (texto: string) => void;
}) {
  const [agente, setAgente] = useState(String(cliente.AGENTE_ID ?? ''));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const opcoes = destinos.map((m) => ({ value: String(m.ID), label: String(m.NOME) }));

  async function salvar() {
    setOcupado(true);
    const falha = await executar(() => acao('ccBaseClienteAtribuir', { clienteIds: String(cliente.ID), agenteId: Number(agente) }));
    setOcupado(false);
    if (falha) return setErro(falha);
    onFeito(`Agente trocado para ${opcoes.find((o) => o.value === agente)?.label}.`);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar agente</DialogTitle>
          <DialogDescription>Fica registrado na auditoria, com o agente de antes e o de depois.</DialogDescription>
        </DialogHeader>
        <DialogBody><Pilha>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <Field label="Novo agente" obrigatorio>
            <SelectMenu label="Novo agente" value={agente} onChange={setAgente} options={opcoes} placeholder="Escolher agente" />
          </Field>
        </Pilha></DialogBody>
        <Rodape ocupado={ocupado} rotulo="Trocar agente" onConfirmar={salvar} onFechar={onFechar} desabilitado={!agente || agente === String(cliente.AGENTE_ID ?? '')} />
      </DialogContent>
    </Dialog>
  );
}

const ESFERAS = [
  { value: '', label: 'Não informada' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'FEDERAL', label: 'Federal' },
];

export function DialogoClassificar({ cliente, onFechar, onFeito }: { cliente: Linha; onFechar: () => void; onFeito: () => void }) {
  const [grupo, setGrupo] = useState(String(cliente.GRUPO_ECONOMICO ?? ''));
  const [esfera, setEsfera] = useState(String(cliente.ESFERA ?? ''));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const publico = cliente.SETOR === 'PUBLICO';

  async function salvar() {
    setOcupado(true);
    const falha = await executar(() => acao('ccBaseClienteClassificar', { clienteId: Number(cliente.ID), grupoEconomico: grupo.trim(), esfera: publico ? esfera : '' }));
    setOcupado(false);
    if (falha) return setErro(falha);
    onFeito();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grupo econômico e esfera</DialogTitle>
          <DialogDescription>Dados informados aqui; a leitura do Winthor não os desfaz.</DialogDescription>
        </DialogHeader>
        <DialogBody><Pilha>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <LabelledField label="Grupo econômico" hint="Vazio limpa o grupo.">
            <Input value={grupo} maxLength={120} onChange={(e) => setGrupo(e.target.value)} placeholder="Ex.: REDE ALFA" />
          </LabelledField>
          <Field label="Esfera do órgão" hint={publico ? 'Quando o ramo do Winthor não define a esfera.' : 'Só para cliente do setor público.'}>
            <SelectMenu label="Esfera do órgão" value={publico ? esfera : ''} onChange={setEsfera} options={ESFERAS} disabled={!publico} />
          </Field>
        </Pilha></DialogBody>
        <Rodape ocupado={ocupado} rotulo="Salvar" onConfirmar={salvar} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}

/** Campo extra de data vai como dd/mm/aaaa, o formato dos campos comuns no texto. */
const ehData = (campo: string) => campo.startsWith('DATA');

export function DialogoEmail({ cliente, contatos, onFechar, onEnviado }: {
  cliente: Linha; contatos: Linha[]; onFechar: () => void; onEnviado: (texto: string) => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [contatoId, setContatoId] = useState('0');
  const [para, setPara] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const modelos = useDados(() => linhas('ccBaseModeloListar', { specDona: '', codigo: '' }), 'modelos');
  const modelo = (modelos.dados ?? []).find((m) => m.CODIGO === codigo);
  const campos = camposExtras(modelo?.CAMPOS_EXTRAS);
  const valoresExtras = Object.fromEntries(campos.map((c) => [c, ehData(c) && extras[c] ? fmtData(extras[c]) : extras[c] ?? '']));
  const pedido = { codigo, clienteId: Number(cliente.ID), contatoId: Number(contatoId), para: para.trim(), extras: JSON.stringify(valoresExtras) };

  // A prévia é o mesmo preenchimento do envio (RF-036): relê quando o pedido muda, nunca sozinha.
  const previa = useDados(async () => (codigo ? acao('ccBaseModeloPrever', pedido) : null), JSON.stringify(pedido));
  const p = previa.dados;
  const pronto = p && p.ok !== false && p.validado && !(p.faltando ?? []).length && p.para;

  async function enviar() {
    setOcupado(true);
    setErro('');
    const falha = await executar(() => acao('ccEmailEnviar', { ...pedido, origem: '001-manual' }));
    setOcupado(false);
    if (falha) return setErro(falha);
    onEnviado(`E-mail "${p?.assunto}" enviado para ${p?.para}.`);
  }

  const comEmail = contatos.filter((c) => String(c.EMAIL ?? '').trim() && c.SITUACAO !== 'NAO_USAR');
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogoLargo>
        <DialogHeader>
          <DialogTitle>Enviar e-mail</DialogTitle>
          <DialogDescription>O texto é preenchido com os dados de {String(cliente.NOME)} na hora do envio, e o envio fica registrado na ficha.</DialogDescription>
        </DialogHeader>
        <DialogBody><Pilha>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          {modelos.erro ? <Alert tone="error">{modelos.erro}</Alert> : null}
          <Grade>
            <Pilha>
              <Field label="Modelo" obrigatorio>
                <SelectMenu
                  label="Modelo" value={codigo} onChange={setCodigo} placeholder="Escolher modelo"
                  options={(modelos.dados ?? []).map((m) => ({ value: String(m.CODIGO), label: `${m.CODIGO} · ${m.NOME}` }))}
                />
              </Field>
              <Field label="Contato">
                <SelectMenu
                  label="Contato" value={contatoId} onChange={setContatoId}
                  options={[{ value: '0', label: 'Contato principal' }, ...comEmail.map((c) => ({ value: String(c.ID), label: String(c.NOME), hint: String(c.EMAIL) }))]}
                />
              </Field>
              <LabelledField label="Outro endereço" hint="Preenchido, vale no lugar do contato. Vários: separe por vírgula.">
                <Input type="email" value={para} onChange={(e) => setPara(e.target.value)} placeholder="nome@dominio.com.br" />
              </LabelledField>
              {campos.map((c) => (
                <LabelledField key={c} label={`Valor de [${c}]`} obrigatorio>
                  <Input type={ehData(c) ? 'date' : 'text'} value={extras[c] ?? ''} onChange={(e) => setExtras({ ...extras, [c]: e.target.value })} />
                </LabelledField>
              ))}
            </Pilha>
            <Pilha>
              {!codigo ? (
                <Nota>Escolha o modelo para ver como o cliente recebe.</Nota>
              ) : p && p.ok === false ? (
                <Alert tone="error">{motivo(p)}</Alert>
              ) : p ? (
                <>
                  <Nota>Para: {p.para ? String(p.para) : 'sem e-mail cadastrado'}</Nota>
                  <Previa>
                    <Forte>{String(p.assunto ?? '')}</Forte>
                    {String(p.corpo ?? '')}
                  </Previa>
                  {!p.validado ? <Alert tone="warn">Modelo aguardando validação: com efeito legal, só pode ser enviado depois de validado.</Alert> : null}
                  {(p.faltando ?? []).length ? <Alert tone="warn">Faltam campos no texto: {(p.faltando as string[]).join(', ')}.</Alert> : null}
                  {!p.para ? <Alert tone="warn">Sem e-mail cadastrado para este cliente: informe um contato com e-mail ou outro endereço.</Alert> : null}
                </>
              ) : (
                <Nota>Preparando a prévia…</Nota>
              )}
            </Pilha>
          </Grade>
        </Pilha></DialogBody>
        <Rodape ocupado={ocupado || previa.carregando} rotulo="Enviar e-mail" onConfirmar={enviar} onFechar={onFechar} desabilitado={!pronto} />
      </DialogoLargo>
    </Dialog>
  );
}

export function DialogoAnexar({ cliente, onFechar, onAnexado }: { cliente: Linha; onFechar: () => void; onAnexado: (texto: string) => void }) {
  const [tipo, setTipo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const recusa = arquivo ? validarArquivo({ nome: arquivo.name, tamanho: arquivo.size }) : null;

  async function anexar() {
    if (!arquivo) return;
    setOcupado(true);
    setErro('');
    const falha = await executar(async () => {
      const url = await enviarArquivo(arquivo);
      return acao('ccBaseAnexoRegistrar', {
        entidade: 'CLIENTE', entidadeId: Number(cliente.ID), clienteId: Number(cliente.ID), tipoDoc: tipo.trim(),
        nomeArquivo: arquivo.name, mime: arquivo.type, tamanhoBytes: arquivo.size, url,
      });
    });
    setOcupado(false);
    if (falha) return setErro(falha);
    onAnexado(`${arquivo.name} anexado.`);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar</DialogTitle>
          <DialogDescription>PDF, PNG, JPG, XLSX ou DOCX, até 20 MB.</DialogDescription>
        </DialogHeader>
        <DialogBody><Pilha>
          <Alert tone="warn">O arquivo fica em endereço público: quem tiver o link abre sem entrar no sistema.</Alert>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          <LabelledField label="Tipo de documento" obrigatorio>
            <Input value={tipo} maxLength={40} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: Contrato social" />
          </LabelledField>
          <LabelledField label="Arquivo" obrigatorio hint={recusa ?? undefined} hintTone={recusa ? 'error' : 'muted'}>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </LabelledField>
        </Pilha></DialogBody>
        <Rodape ocupado={ocupado} rotulo={ocupado ? 'Enviando…' : 'Anexar'} onConfirmar={anexar} onFechar={onFechar} desabilitado={!arquivo || !!recusa || !tipo.trim()} />
      </DialogContent>
    </Dialog>
  );
}

/** Confirmação de ação que não se desfaz pela tela (remover anexo). */
export function Confirmar({ titulo, texto, rotulo, onFechar, onConfirmar }: {
  titulo: string; texto: string; rotulo: string; onFechar: () => void; onConfirmar: () => Promise<string>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function confirmar() {
    setOcupado(true);
    const falha = await onConfirmar();
    setOcupado(false);
    if (falha) setErro(falha);
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>
        {erro ? <DialogBody><Pilha><Alert tone="error">{erro}</Alert></Pilha></DialogBody> : null}
        <Rodape ocupado={ocupado} rotulo={rotulo} onConfirmar={confirmar} onFechar={onFechar} perigo />
      </DialogContent>
    </Dialog>
  );
}

