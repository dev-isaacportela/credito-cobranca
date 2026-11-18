// Lançar custo (RF-020, RN-013): o mesmo diálogo no card e na aba Custos. Guia e comprovante sobem pelos anexos do
// card do processo (o servidor confere que o anexo é daquele card); com comprovante o custo nasce pago.

import { useState } from 'react';
import { useKanban } from '@benenutri/mitra-kanban';
import { validarArquivo } from '@/lib/base/arquivos';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  GradeCampos, Input, LabelledField, Marcar, SelectMenu, Textarea,
} from '@/components/page';
import { erroDe, hojeLocal, TIPOS_CUSTO, useGravar, GRUPOS_CUSTO } from '../comum';

const OPCOES_TIPO = TIPOS_CUSTO.map((t) => ({ value: t.codigo, label: `${t.rotulo} · ${GRUPOS_CUSTO[t.grupo]}` }));

export function CustoDialog({ aberto, processoId, cardId, onFechar, onFeito }: {
  aberto: boolean; processoId: number; cardId: number; onFechar: () => void; onFeito: (texto: string) => Promise<void> | void;
}) {
  const kb = useKanban();
  const { gravar, gravando, erro, limpar } = useGravar();
  const [c, setC] = useState({ tipo: 'CUSTAS_INICIAIS', data: '', valor: '', obs: '', pago: false });
  const [arquivos, setArquivos] = useState<{ guia?: File; comprovante?: File }>({});
  const [aviso, setAviso] = useState('');

  async function subir(f?: File): Promise<number> {
    if (!f) return 0;
    if (!kb.enviarArquivo) throw new Error('O envio de arquivo não está disponível: lance sem anexo e anexe pela aba Anexos do card.');
    const url = await kb.enviarArquivo(f);
    const r = await kb.anexoRegistrar({ cardId, tipo: 'arquivo', nome: f.name, url, tamanho: f.size });
    if (!r.ok || !r.id) throw new Error(r.error ?? 'Não foi possível registrar o anexo no card.');
    return r.id;
  }

  async function lancar() {
    setAviso('');
    let guia = 0;
    let comprovante = 0;
    try {
      guia = await subir(arquivos.guia);
      comprovante = await subir(arquivos.comprovante);
    } catch (e) {
      return setAviso(erroDe(e));
    }
    const r = await gravar('ccJurCustoLancar', {
      processoId, tipo: c.tipo, data: c.data, valor: Number(c.valor.replace(',', '.')) || 0, obs: c.obs, pago: c.pago ? 1 : 0,
      guiaKbAnexoId: guia, comprovanteKbAnexoId: comprovante,
    });
    if (r) {
      setC({ tipo: c.tipo, data: '', valor: '', obs: '', pago: false });
      setArquivos({});
      await onFeito(r.pago ? 'Custo lançado como pago.' : 'Custo lançado a pagar.');
    }
  }

  const escolher = (k: 'guia' | 'comprovante') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const recusa = f ? validarArquivo({ nome: f.name, tamanho: f.size }) : '';
    setAviso(recusa ?? '');
    setArquivos((a) => ({ ...a, [k]: recusa ? undefined : f }));
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) { limpar(); setAviso(''); onFechar(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar custo</DialogTitle>
          <DialogDescription>Valor maior que zero e tipo do catálogo. Com comprovante, o custo fica pago.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <GradeCampos>
            <LabelledField label="Tipo" obrigatorio>
              <SelectMenu label="Tipo" value={c.tipo} options={OPCOES_TIPO} onChange={(tipo) => setC({ ...c, tipo })} />
            </LabelledField>
            <LabelledField label="Data" hint="Vazio: hoje.">
              <Input type="date" value={c.data} max={hojeLocal()} onChange={(e) => setC({ ...c, data: e.target.value })} />
            </LabelledField>
            <LabelledField label="Valor (R$)" obrigatorio>
              <Input inputMode="decimal" value={c.valor} onChange={(e) => setC({ ...c, valor: e.target.value })} placeholder="0,00" />
            </LabelledField>
            <LabelledField label="Guia (opcional)">
              <Input type="file" onChange={escolher('guia')} />
            </LabelledField>
            <LabelledField label="Comprovante (opcional)">
              <Input type="file" onChange={escolher('comprovante')} />
            </LabelledField>
          </GradeCampos>
          <Marcar checked={c.pago || !!arquivos.comprovante} disabled={!!arquivos.comprovante} onChange={(pago) => setC({ ...c, pago })}>Já pago</Marcar>
          <LabelledField label="Observação">
            <Textarea value={c.obs} onChange={(e) => setC({ ...c, obs: e.target.value })} rows={2} />
          </LabelledField>
          {aviso ? <Alert tone="warn">{aviso}</Alert> : null}
          {erro ? <Alert tone="error">{erro}</Alert> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" disabled={gravando} onClick={lancar}>Lançar custo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
