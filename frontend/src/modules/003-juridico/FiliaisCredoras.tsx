// Cadastro das filiais credoras (T-223, RF-034): tabela e diálogo. A filial é a notificante dos documentos (razão
// social, CNPJ, endereço, banco e quem assina). Gravar é de quem administra; os demais veem, com o botão desabilitado.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { podeAdministrar, type MembroSessao } from '@/lib/base/menu';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, Button, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, EmptyState, GradeCampos, Input, LabelledField, Marcar, PageHeader, Panel, Pilha, RowMeta,
  RowTitle, Status, Table, Td, Th, Tr,
} from '@/components/page';
import { useDados, useGravar, type Linha } from './comum';

const VAZIA = { codigo: '', razaoSocial: '', cnpj: '', endereco: '', cidadeUf: '', uf: '', banco: '', representante: '', representanteCargo: '', ativa: true };
type Form = typeof VAZIA;
const CAMPOS: [keyof Form, string, boolean?][] = [
  ['codigo', 'Código (filial do Winthor)', true], ['razaoSocial', 'Razão social', true], ['cnpj', 'CNPJ', true], ['endereco', 'Endereço'],
  ['cidadeUf', 'Cidade/UF'], ['uf', 'UF'], ['banco', 'Dados para pagamento (banco, agência, conta, PIX)'], ['representante', 'Quem assina'],
  ['representanteCargo', 'Cargo de quem assina'],
];

export default function FiliaisCredoras() {
  const membro = useOutletContext<MembroSessao>();
  const adm = podeAdministrar(membro);
  const lista = useDados(() => linhas('ccJurFilialCredoraListar', { ativa: -1 }), 'filiais');
  const [form, setForm] = useState<Form | null>(null);
  const [novo, setNovo] = useState(false);
  const { gravar, gravando, erro, ok, limpar } = useGravar();
  const sem = adm ? undefined : 'Só o Gerente financeiro (ou acima) ou quem administra altera as filiais.';

  const editar = (f: Linha | null) => {
    limpar();
    setNovo(!f);
    setForm(f ? {
      codigo: f.CODIGO, razaoSocial: f.RAZAO_SOCIAL ?? '', cnpj: f.CNPJ ?? '', endereco: f.ENDERECO ?? '', cidadeUf: f.CIDADE_UF ?? '', uf: f.UF ?? '',
      banco: f.BANCO ?? '', representante: f.REPRESENTANTE ?? '', representanteCargo: f.REPRESENTANTE_CARGO ?? '', ativa: !!Number(f.ATIVA),
    } : VAZIA);
  };

  async function salvar() {
    if (!form) return;
    const r = await gravar('ccJurFilialCredoraSalvar', { ...form, cnpj: form.cnpj.replace(/\D/g, ''), ativa: form.ativa ? 1 : 0 }, 'Filial salva.');
    if (r) { setForm(null); lista.recarregar(); }
  }

  return (
    <Pilha>
      <PageHeader module="Jurídico" title="Filiais credoras" description="Quem notifica e cobra em juízo: razão social, CNPJ, endereço, banco e quem assina."
        actions={<Button variant="primary" disabled={!adm} title={sem} onClick={() => editar(null)}>Nova filial</Button>} />
      {lista.erro ? <Alert tone="error">{lista.erro}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      <Panel>
        {!lista.dados?.length ? <EmptyState title={lista.carregando ? 'Carregando…' : 'Nenhuma filial cadastrada.'} /> : (
          <Table>
            <thead><tr><Th>Filial</Th><Th>CNPJ</Th><Th>Endereço</Th><Th>Quem assina</Th><Th>Situação</Th><Th /></tr></thead>
            <tbody>
              {lista.dados.map((f) => (
                <Tr key={f.ID}>
                  <Td><RowTitle>{`${f.CODIGO} · ${f.RAZAO_SOCIAL || 'sem razão social'}`}</RowTitle><RowMeta>{f.CIDADE_UF || '—'}</RowMeta></Td>
                  <Td>{f.CNPJ || <Dash />}</Td>
                  <Td>{f.ENDERECO || <Dash />}</Td>
                  <Td>{f.REPRESENTANTE ? `${f.REPRESENTANTE} · ${f.REPRESENTANTE_CARGO}` : <Dash />}</Td>
                  <Td><Status tone={Number(f.ATIVA) ? 'live' : 'off'}>{Number(f.ATIVA) ? 'Ativa' : 'Inativa'}</Status></Td>
                  <Td numeric><Button size="sm" variant="ghost" disabled={!adm} title={sem} onClick={() => editar(f)}>Editar</Button></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{novo ? 'Nova filial credora' : `Filial ${form?.codigo}`}</DialogTitle>
            <DialogDescription>Razão social e CNPJ são exigidos para emitir notificação e demonstrativo.</DialogDescription>
          </DialogHeader>
          {form ? (
            <DialogBody>
              <GradeCampos>
                {CAMPOS.map(([k, rotulo, obrigatorio]) => (
                  <LabelledField key={k} label={rotulo} obrigatorio={obrigatorio}>
                    <Input value={String(form[k])} disabled={k === 'codigo' && !novo} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  </LabelledField>
                ))}
              </GradeCampos>
              <Marcar checked={form.ativa} onChange={(ativa) => setForm({ ...form, ativa })}>Ativa</Marcar>
              {erro ? <Alert tone="error">{erro}</Alert> : null}
            </DialogBody>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
            <Button variant="primary" disabled={gravando || !adm} onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Pilha>
  );
}
