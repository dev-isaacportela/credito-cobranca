// Lançamento das datas de uma NF (nf-datas B, "Trilho editável", T-206): as datas sobre o próprio caminho da nota,
// a contratação, a posição na fila e os prazos que o servidor devolve depois de salvar. A regra do ente só é
// exibida (PA-24). Abrir = ccPubNfFicha; salvar = ccPubNfDatasSalvar com o estado inteiro do trilho (PA-25).

import { useState } from 'react';
import { acao } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import {
  Alert, Button, CorpoPainel, Dash, Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader,
  DialogoLargo, DialogTitle, Ficha, Field, Grade, Input, ItemFicha, LabelledField, Pilha, RowMeta, SelectMenu,
  Status, Trilho,
} from '@/components/page';
import { ESFERA, passosTrilho, textoSituacao, tomSituacao } from '@/lib/setor-publico/formato';
import { brl, executar, n, useDados, type Linha } from './dados';

type Campos = { empenho: string; protocolo: string; atesto: string; liquidacao: string; op: string; filaPosicao: string; analiseId: string };
const ORDEM: (keyof Campos)[] = ['protocolo', 'atesto', 'liquidacao', 'op'];
const EXIGE: Record<string, string> = { atesto: 'Exige o protocolo', liquidacao: 'Exige o atesto', op: 'Exige a liquidação' };

export default function NfDatasDialog({ nfId, onFechar, onSalvo }: { nfId: number; onFechar: () => void; onSalvo: () => void }) {
  const ficha = useDados(() => acao('ccPubNfFicha', { nfId }), `ficha:${nfId}`);
  const f = ficha.dados?.ok === false ? null : (ficha.dados as Linha | undefined);
  const erroLeitura = ficha.erro || (ficha.dados?.ok === false ? String(ficha.dados.error) : '');
  const [campos, setCampos] = useState<Campos | null>(null);
  const [salva, setSalva] = useState<Linha | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [gravando, setGravando] = useState(false);

  const nf = (salva ?? f?.nf ?? {}) as Linha;
  const atuais: Campos = campos ?? {
    empenho: String(nf.EMPENHO ?? ''), protocolo: String(nf.PROTOCOLO ?? ''), atesto: String(nf.ATESTO ?? ''), liquidacao: String(nf.LIQUIDACAO ?? ''),
    op: String(nf.OP ?? ''), filaPosicao: nf.FILA_POSICAO ? String(nf.FILA_POSICAO) : '', analiseId: nf.ANALISE_ID ? String(nf.ANALISE_ID) : '0',
  };
  const mudar = (k: keyof Campos) => (v: string) => { setCampos({ ...atuais, [k]: v }); setAviso(''); };
  const pode = !!f?.pode?.lancarDatas;
  const regra = (f?.regra ?? null) as Linha | null;
  const contratacoes = (f?.contratacoes ?? []) as Linha[];
  const travado = !pode || gravando;
  const anterior = (k: keyof Campos) => { const i = ORDEM.indexOf(k); return i > 0 ? atuais[ORDEM[i - 1]] : 'ok'; };
  const data = (k: keyof Campos) => (
    <Input type="date" aria-label={k} value={atuais[k]} disabled={travado || !anterior(k)} title={!anterior(k) ? EXIGE[k] : undefined}
      onChange={(e) => mudar(k)(e.target.value)} />
  );

  async function salvar() {
    setGravando(true);
    setErro('');
    const r = await executar('ccPubNfDatasSalvar', {
      nfId, empenho: atuais.empenho.trim(), protocolo: atuais.protocolo, atesto: atuais.atesto, liquidacao: atuais.liquidacao, op: atuais.op,
      filaPosicao: Number(atuais.filaPosicao) || 0, analiseId: Number(atuais.analiseId) || 0,
    });
    setGravando(false);
    if (r.erro) return setErro(r.erro);
    setSalva(r.nf as Linha);
    setCampos(null);
    setAviso(r.orgao?.sincronizado ? 'Datas salvas; o card do órgão foi atualizado com a nova etapa.' : 'Datas salvas e prazos recalculados.');
    onSalvo();
  }

  const passos = passosTrilho(nf);
  const sub = (i: number) => passos[i].sub;
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogoLargo>
        <DialogHeader>
          <DialogTitle>{nf.NUMNOTA ? `NF ${nf.NUMNOTA} · ${nf.CLIENTE_NOME ?? ''}` : 'Datas da nota fiscal'}</DialogTitle>
          <DialogDescription>
            {nf.NUMNOTA ? [brl(nf.VALOR), `emitida em ${fmtData(nf.EMISSAO)}`, ESFERA[nf.ESFERA] ?? 'esfera não informada', nf.UF].filter(Boolean).join(' · ') : 'Carregando a nota…'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erroLeitura ? <Alert tone="error">{erroLeitura}</Alert> : null}
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {aviso ? <Alert tone="success">{aviso}</Alert> : null}
            {f && !pode ? <Alert tone="info">Só o agente ou o analista do órgão (ou o superior) lança datas, e só em NF não paga.</Alert> : null}
            {regra?.SITUACAO === 'A_CONFIRMAR' ? (
              <Alert tone="warn">A regra "{regra.NOME}" está a confirmar: os prazos são a referência até a Gerência Financeira validar.</Alert>
            ) : null}
            <Trilho passos={[
              { rotulo: 'Empenho', estado: passos[0].estado, campo: <Input aria-label="Nº do empenho" value={atuais.empenho} maxLength={40} disabled={travado} onChange={(e) => mudar('empenho')(e.target.value)} />, sub: 'antes da entrega' },
              { rotulo: 'Protocolo', estado: passos[1].estado, campo: data('protocolo'), sub: 'marco dos prazos' },
              { rotulo: 'Atesto', estado: passos[2].estado, campo: data('atesto'), sub: nf.LIQUIDAR_ATE ? `liquidar até ${fmtData(nf.LIQUIDAR_ATE)}` : sub(2) },
              { rotulo: 'Liquidação', estado: passos[3].estado, campo: data('liquidacao'), sub: regra ? `${n(regra.LIQ_DIAS)} dias ${regra.CONTAGEM === 'CORRIDOS' ? 'corridos' : 'úteis'} do protocolo` : sub(3) },
              { rotulo: 'Ordem de pagamento', estado: passos[4].estado, campo: data('op'), sub: 'fila por fonte de recurso' },
              { rotulo: 'Pagamento', estado: passos[5].estado, campo: <Input aria-label="Pagamento" value={nf.PAGO_EM ? fmtData(nf.PAGO_EM) : 'Winthor'} disabled />, sub: nf.PAGAR_ATE ? `pagar até ${fmtData(nf.PAGAR_ATE)}` : '' },
            ]} />
            <Grade colunas={2}>
              <Field label="Contratação" hint="Define regra, pequeno valor e prazo do contrato; sem escolha, vale a mais recente do órgão.">
                <SelectMenu label="Contratação" value={atuais.analiseId} onChange={mudar('analiseId')} disabled={travado}
                  options={[{ value: '0', label: contratacoes.length ? 'Manter a contratação da nota' : 'Sem contratação aprovada' },
                    ...contratacoes.map((c) => ({ value: String(c.ID), label: c.CONTRATO ? `Contrato ${c.CONTRATO}` : c.EDITAL ? `Edital ${c.EDITAL}` : `Análise ${c.ID}`,
                      hint: [c.DECISAO_RESULTADO === 'PRE_APROVADA' ? 'pré-aprovada' : 'aprovada', brl(c.VALOR_ESTIMADO)].filter(Boolean).join(' · ') }))]} />
              </Field>
              <LabelledField label="Posição na ordem cronológica" hint="Informada pelo órgão (LAI); vazio = sem posição.">
                <Input type="number" min={0} value={atuais.filaPosicao} disabled={travado} onChange={(e) => mudar('filaPosicao')(e.target.value)} />
              </LabelledField>
            </Grade>
            <CorpoPainel>
              <RowMeta>Prazos calculados</RowMeta>
              <Ficha>
                <ItemFicha rotulo="Regra aplicada">{regra ? `${regra.NOME} · ${n(regra.LIQ_DIAS)} + ${n(regra.PAG_DIAS)} ${regra.CONTAGEM === 'CORRIDOS' ? 'dias corridos' : 'dias úteis'}` : <Dash />}</ItemFicha>
                <ItemFicha rotulo="Marco inicial">{nf.PROTOCOLO ? `Protocolo · ${fmtData(nf.PROTOCOLO)}` : nf.EMISSAO ? `Emissão · ${fmtData(nf.EMISSAO)}` : <Dash />}</ItemFicha>
                <ItemFicha rotulo="Liquidar até">{fmtData(nf.LIQUIDAR_ATE) || <Dash />}</ItemFicha>
                <ItemFicha rotulo="Pagar até">{fmtData(nf.PAGAR_ATE) || <Dash />}</ItemFicha>
                <ItemFicha rotulo="Limite de 2 meses">{fmtData(nf.LIMITE_2M) || <Dash />}</ItemFicha>
                <ItemFicha rotulo="Situação">{nf.SITUACAO ? <Status tone={tomSituacao(nf)}>{textoSituacao(nf)}</Status> : <Dash />}</ItemFicha>
              </Ficha>
              <RowMeta>
                Ordem obrigatória: emissão, protocolo, atesto, liquidação, ordem de pagamento. Nenhuma data depois de hoje; cada uma exige a anterior.
                O pagamento vem do Winthor. Os prazos mostrados são os gravados; salvar recalcula.
              </RowMeta>
            </CorpoPainel>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>{salva ? 'Fechar' : 'Cancelar'}</Button>
          <Button variant="primary" onClick={salvar} disabled={travado || !f || !campos}>{gravando ? 'Salvando…' : 'Salvar datas'}</Button>
        </DialogFooter>
      </DialogoLargo>
    </Dialog>
  );
}
