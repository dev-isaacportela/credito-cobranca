/**
 * Ficha de contatos do cliente (T-093): um componente só, usado na aba Contatos da ficha do cliente e
 * no diálogo de /contatos (opção `contatos` C). Edição, principal (sempre um só, RN-021), situação e
 * "Revisada sem alteração" (RF-034). A regra é do servidor: a tela só mostra a recusa.
 */
import { useState } from 'react';
import { acao } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import {
  Alert, Bloco, Button, Code, Dash, Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader,
  DialogoLargo, DialogTitle, EmptyState, Faixa, Field, Forte, GradeCampos, Input, LabelledField,
  Linha as LinhaUi, Marcar, Pilha, RowMeta, RowTitle, SelectMenu, Status, Table, Td, Th, Tr,
} from '@/components/page';
import { Plus } from 'lucide-react';
import { AREAS_CONTATO, FUNCOES_CONTATO, SITUACAO_FICHA, SITUACOES_CONTATO, motivo, opcoes } from '../comum';

type Linha = Record<string, unknown>;

const CAMPOS = ['NOME', 'AREA', 'FUNCAO', 'TELEFONE', 'WHATSAPP', 'EMAIL', 'SITUACAO', 'OBS'] as const;
type Rascunho = Record<(typeof CAMPOS)[number], string> & { ID: number; PRINCIPAL: boolean; chave: string };

const rascunho = (c: Linha, i: number): Rascunho => ({
  ...(Object.fromEntries(CAMPOS.map((k) => [k, String(c[k] ?? '')])) as Record<(typeof CAMPOS)[number], string>),
  SITUACAO: String(c.SITUACAO ?? 'PENDENTE'),
  ID: Number(c.ID ?? 0),
  PRINCIPAL: Boolean(Number(c.PRINCIPAL ?? 0)),
  chave: c.ID ? `c${c.ID}` : `novo${i}`,
});
const mudou = (a: Rascunho, b?: Rascunho) => !b || CAMPOS.some((k) => a[k].trim() !== b[k].trim()) || a.PRINCIPAL !== b.PRINCIPAL;

/** Situação da ficha + quando foi revisada (cabeçalho da aba e do diálogo). */
export function SituacaoDaFicha({ cliente }: { cliente: Linha }) {
  const s = SITUACAO_FICHA[String(cliente.SITUACAO_FICHA)] ?? SITUACAO_FICHA.NUNCA;
  return (
    <span>
      <Status tone={s.tom}>Ficha {s.texto.toLowerCase()}</Status>
      {cliente.CONTATOS_REVISADO_EM ? <> · revisada em {fmtData(String(cliente.CONTATOS_REVISADO_EM))}</> : null}
    </span>
  );
}

export function TabelaContatos({ contatos }: { contatos: Linha[] }) {
  if (!contatos.length) return <EmptyState title="Nenhum contato na ficha." hint="Sem e-mail na ficha, nenhum e-mail pode ser enviado ao cliente. Use Editar ficha para incluir." />;
  return (
    <Table>
      <thead><tr><Th>Contato</Th><Th>Área · função</Th><Th>Telefone</Th><Th>WhatsApp</Th><Th>E-mail</Th><Th>Situação</Th><Th>Atualizado</Th></tr></thead>
      <tbody>
        {contatos.map((c) => (
          <Tr key={String(c.ID)}>
            <Td>
              <RowTitle>{String(c.NOME)}</RowTitle>
              {Number(c.PRINCIPAL) ? <RowMeta>Contato principal</RowMeta> : null}
            </Td>
            <Td>{[c.AREA, c.FUNCAO].filter(Boolean).join(' · ') || <Dash />}</Td>
            <Td>{c.TELEFONE ? String(c.TELEFONE) : <Dash />}</Td>
            <Td>{c.WHATSAPP ? String(c.WHATSAPP) : <Dash />}</Td>
            <Td>{c.EMAIL ? String(c.EMAIL) : <Dash />}</Td>
            <Td>
              <Status tone={c.SITUACAO === 'CONFIRMADO' ? 'live' : c.SITUACAO === 'PENDENTE' ? 'attention' : 'off'}>
                {SITUACOES_CONTATO[String(c.SITUACAO)] ?? String(c.SITUACAO)}
              </Status>
            </Td>
            <Td>{c.ATUALIZADO_EM ? fmtDataHora(String(c.ATUALIZADO_EM)) : <Dash />}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Diálogo da ficha: edita todos os contatos do cliente e grava só o que mudou. */
export function EditorFicha({ cliente, contatos, onFechar, onSalvo }: {
  cliente: Linha; contatos: Linha[]; onFechar: () => void; onSalvo: (texto: string) => void;
}) {
  const originais = contatos.map(rascunho);
  const [lista, setLista] = useState<Rascunho[]>(originais);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const alterar = (chave: string, campo: keyof Rascunho, valor: string | boolean) =>
    setLista((l) => l.map((c) => (c.chave === chave ? { ...c, [campo]: valor } : campo === 'PRINCIPAL' && valor ? { ...c, PRINCIPAL: false } : c)));
  const adicionar = () => setLista((l) => [...l, rascunho({ SITUACAO: 'PENDENTE', PRINCIPAL: l.length === 0 ? 1 : 0 }, l.length)]);

  async function salvar() {
    // O novo principal vai por último: o servidor só tira a marca do anterior quando outro a recebe.
    const pendentes = lista.filter((c) => mudou(c, originais.find((o) => o.chave === c.chave))).sort((a, b) => Number(a.PRINCIPAL) - Number(b.PRINCIPAL));
    if (!pendentes.length) return revisar();
    setOcupado(true);
    setErro('');
    for (const c of pendentes) {
      try {
        const r = await acao('ccBaseContatoSalvar', {
          contatoId: c.ID, clienteId: Number(cliente.ID), nome: c.NOME, area: c.AREA, funcao: c.FUNCAO, telefone: c.TELEFONE,
          whatsapp: c.WHATSAPP, email: c.EMAIL, situacao: c.SITUACAO, obs: c.OBS, principal: c.PRINCIPAL ? 1 : 0,
        });
        if (r.ok === false) {
          setOcupado(false);
          return setErro(`${c.NOME || 'Contato sem nome'}: ${motivo(r)}`);
        }
      } catch (e) {
        setOcupado(false);
        return setErro(motivo(e));
      }
    }
    setOcupado(false);
    onSalvo(`Ficha de contatos de ${cliente.NOME} salva.`);
  }

  async function revisar() {
    setOcupado(true);
    setErro('');
    try {
      const r = await acao('ccBaseContatosRevisar', { clienteId: Number(cliente.ID) });
      setOcupado(false);
      if (r.ok === false) return setErro(motivo(r));
      onSalvo(`Ficha de ${cliente.NOME} marcada como revisada, sem alteração.`);
    } catch (e) {
      setOcupado(false);
      setErro(motivo(e));
    }
  }

  const alterada = lista.some((c) => mudou(c, originais.find((o) => o.chave === c.chave)));
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogoLargo>
        <DialogHeader>
          <DialogTitle>Ficha de contatos · {String(cliente.NOME ?? cliente.CLIENTE_NOME)}</DialogTitle>
          <DialogDescription>
            <Code>{String(cliente.CODCLI)}</Code> · <SituacaoDaFicha cliente={cliente} />
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {lista.length === 0 ? <Alert tone="warn">Cliente sem nenhum contato: sem e-mail na ficha, nenhum e-mail pode ser enviado a ele.</Alert> : null}
            {lista.map((c, i) => (
              <Bloco key={c.chave}>
                <LinhaUi>
                  <Forte>{c.ID ? `Contato ${i + 1}` : 'Contato novo'}</Forte>
                  <Marcar checked={c.PRINCIPAL} onChange={(v) => alterar(c.chave, 'PRINCIPAL', v)}>Principal</Marcar>
                </LinhaUi>
                <GradeCampos>
                  <LabelledField label="Nome" obrigatorio>
                    <Input value={c.NOME} maxLength={120} onChange={(e) => alterar(c.chave, 'NOME', e.target.value)} />
                  </LabelledField>
                  <Field label="Área">
                    <SelectMenu label="Área" value={c.AREA} onChange={(v) => alterar(c.chave, 'AREA', v)} options={opcoes(AREAS_CONTATO, 'Sem área')} />
                  </Field>
                  <Field label="Função">
                    <SelectMenu label="Função" value={c.FUNCAO} onChange={(v) => alterar(c.chave, 'FUNCAO', v)} options={opcoes(FUNCOES_CONTATO, 'Sem função')} />
                  </Field>
                  <Field label="Situação">
                    <SelectMenu
                      label="Situação" value={c.SITUACAO} onChange={(v) => alterar(c.chave, 'SITUACAO', v)}
                      options={Object.entries(SITUACOES_CONTATO).map(([value, label]) => ({ value, label }))}
                    />
                  </Field>
                  <LabelledField label="Telefone">
                    <Input value={c.TELEFONE} maxLength={40} onChange={(e) => alterar(c.chave, 'TELEFONE', e.target.value)} />
                  </LabelledField>
                  <LabelledField label="WhatsApp">
                    <Input value={c.WHATSAPP} maxLength={40} onChange={(e) => alterar(c.chave, 'WHATSAPP', e.target.value)} />
                  </LabelledField>
                  <LabelledField label="E-mail">
                    <Input type="email" value={c.EMAIL} maxLength={160} placeholder="nome@dominio.com.br" onChange={(e) => alterar(c.chave, 'EMAIL', e.target.value)} />
                  </LabelledField>
                  <LabelledField label="Observação">
                    <Input value={c.OBS} maxLength={500} onChange={(e) => alterar(c.chave, 'OBS', e.target.value)} />
                  </LabelledField>
                </GradeCampos>
              </Bloco>
            ))}
            <LinhaUi>
              <Button variant="ghost" size="sm" onClick={adicionar}><Plus aria-hidden />Adicionar contato</Button>
            </LinhaUi>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button onClick={revisar} disabled={ocupado || alterada || lista.length === 0}>Revisada sem alteração</Button>
          <Button variant="primary" onClick={salvar} disabled={ocupado || !alterada}>Salvar ficha</Button>
        </DialogFooter>
      </DialogoLargo>
    </Dialog>
  );
}

/** Faixa da aba Contatos: situação da ficha e as duas ações. */
export function FaixaDaFicha({ cliente, onEditar }: { cliente: Linha; onEditar: () => void }) {
  return (
    <Faixa>
      <SituacaoDaFicha cliente={cliente} />
      <Button size="sm" onClick={onEditar}>Editar ficha</Button>
    </Faixa>
  );
}
