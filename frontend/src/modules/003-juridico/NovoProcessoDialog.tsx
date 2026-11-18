// Novo processo (T-215, RF-015): diálogo sobre o quadro. Cliente pela busca (código, CNPJ/CPF ou nome), carteira,
// filial, valor, linha, autos, tribunal, responsável e etapa inicial (nem dossiê nem encerrado). O servidor cria o
// card na etapa pedida.

import { useState } from 'react';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, Button, Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogoLargo, DialogTitle,
  GradeCampos, Input, LabelledField, Nota, SelectMenu, Textarea,
} from '@/components/page';
import { BuscaCliente } from './BuscaCliente';
import { FASES, OPCOES_CARTEIRA, useDados, useGravar, type Linha } from './comum';

const ETAPAS = FASES.filter((f) => !['dossie', 'encerrado'].includes(f.chave)).map((f) => ({ value: f.chave, label: f.nome }));
const VAZIO = { carteira: '', filial: '', linha: 'DEMAIS', valor: '', autos: '', tribunal: '', responsavelId: '', prazo: '', prazoDescricao: '', faseChave: 'recebido', status: '', obs: '' };

export function NovoProcessoDialog({ aberto, onFechar, onCriado }: { aberto: boolean; onFechar: () => void; onCriado: (r: Linha) => void }) {
  const [cliente, setCliente] = useState<Linha | null>(null);
  const [f, setF] = useState(VAZIO);
  const { gravar, gravando, erro, limpar } = useGravar();
  const membros = useDados(async () => (aberto ? linhas('ccBaseMembroListar', { cargo: 'JURIDICO', ativo: 1, busca: '', limite: 50, offset: 0 }) : []), `m:${aberto}`);
  const filiais = useDados(async () => (aberto ? linhas('ccJurFilialCredoraListar', { ativa: 1 }) : []), `f:${aberto}`);

  async function criar() {
    const r = await gravar('ccJurProcessoCriar', {
      clienteId: Number(cliente?.ID ?? 0), nomeDevedor: '', documento: '', ...f, responsavelId: Number(f.responsavelId) || 0,
      valor: Number(f.valor.replace(/\./g, '').replace(',', '.')) || 0,
    });
    if (r) { setCliente(null); setF(VAZIO); onCriado(r); }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) { limpar(); onFechar(); } }}>
      <DialogoLargo>
        <DialogHeader>
          <DialogTitle>Novo processo</DialogTitle>
          <DialogDescription>Processo sem cliente da base só entra pela carga inicial. Citação em diante exige o número dos autos.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {cliente ? (
            <Alert tone="info">
              {`${cliente.NOME} · cód. ${cliente.CODCLI} · ${cliente.DOCUMENTO}`}{' '}
              <Button size="sm" variant="ghost" onClick={() => setCliente(null)}>Trocar</Button>
            </Alert>
          ) : (
            <LabelledField label="Cliente" obrigatorio>
              <BuscaCliente onEscolher={(c) => { setCliente(c); setF({ ...f, carteira: c.SETOR === 'PUBLICO' ? 'PUBLICA' : f.carteira }); }} />
            </LabelledField>
          )}
          <GradeCampos>
            <LabelledField label="Carteira" hint="Vazio: pelo setor do cliente.">
              <SelectMenu label="Carteira" value={f.carteira} options={OPCOES_CARTEIRA.map((o) => (o.value ? o : { ...o, label: 'Pelo setor do cliente' }))}
                onChange={(carteira) => setF({ ...f, carteira })} />
            </LabelledField>
            <LabelledField label="Etapa inicial" obrigatorio>
              <SelectMenu label="Etapa inicial" value={f.faseChave} options={ETAPAS} onChange={(faseChave) => setF({ ...f, faseChave })} />
            </LabelledField>
            <LabelledField label="Filial credora">
              <SelectMenu label="Filial credora" value={f.filial} onChange={(filial) => setF({ ...f, filial })}
                options={[{ value: '', label: 'Sem filial' }, ...(filiais.dados ?? []).map((x) => ({ value: String(x.CODIGO), label: `${x.CODIGO} · ${x.CIDADE_UF}` }))]} />
            </LabelledField>
            <LabelledField label="Linha">
              <SelectMenu label="Linha" value={f.linha} options={[{ value: 'DEMAIS', label: 'Demais linhas' }, { value: 'GALDERMA', label: 'Galderma' }]}
                onChange={(linha) => setF({ ...f, linha })} />
            </LabelledField>
            <LabelledField label="Valor (R$)" obrigatorio>
              <Input inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
            </LabelledField>
            <LabelledField label="Responsável">
              <SelectMenu label="Responsável" value={f.responsavelId} onChange={(responsavelId) => setF({ ...f, responsavelId })}
                options={[{ value: '', label: 'Sem responsável' }, ...(membros.dados ?? []).map((m) => ({ value: String(m.ID), label: m.NOME }))]} />
            </LabelledField>
            <LabelledField label="Número dos autos" hint="NNNNNNN-DD.AAAA.J.TR.OOOO">
              <Input value={f.autos} onChange={(e) => setF({ ...f, autos: e.target.value })} />
            </LabelledField>
            <LabelledField label="Tribunal">
              <Input value={f.tribunal} onChange={(e) => setF({ ...f, tribunal: e.target.value })} />
            </LabelledField>
            <LabelledField label="Prazo">
              <Input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} />
            </LabelledField>
            <LabelledField label="O que vence no prazo">
              <Input value={f.prazoDescricao} onChange={(e) => setF({ ...f, prazoDescricao: e.target.value })} />
            </LabelledField>
          </GradeCampos>
          <LabelledField label="Situação atual">
            <Textarea rows={2} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} />
          </LabelledField>
          <LabelledField label="Observações">
            <Textarea rows={2} value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
          </LabelledField>
          {erro ? <Alert tone="error">{erro}</Alert> : null}
          {!cliente ? <Nota>Escolha o cliente para criar.</Nota> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" disabled={gravando || !cliente} onClick={criar}>Criar processo</Button>
        </DialogFooter>
      </DialogoLargo>
    </Dialog>
  );
}
