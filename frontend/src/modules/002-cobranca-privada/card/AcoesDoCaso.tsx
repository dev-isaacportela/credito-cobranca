// Ações extras do card (05 §3.5, T-066): as dez da cobrança, na coluna de "Mover para". O que a carteira ou a
// situação não comporta não aparece (sem fase de negociação não há acordo; sem baixa pendente não há parecer);
// o que falta de permissão desabilita, com o motivo no `title` (`pode` da ficha; quem decide é a guarda do servidor).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExtensaoContexto } from '@benenutri/mitra-kanban';
import { acao } from '@/lib/mitra-api';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, LabelledField, SelectMenu,
} from '@/components/page';
import { erroDe } from '../comum';
import { CARTEIRAS_COM_REGUA } from '@/lib/cobranca-privada/fases';
import { recarregarFicha, useFicha } from '../ficha';

type Dialogo = '' | 'proxAcao' | 'bloqueio' | 'anuencia';
const SEM_PERMISSAO = 'Sem permissão para esta ação neste caso.';

export function AcoesDoCaso(ctx: ExtensaoContexto) {
  const navigate = useNavigate();
  const { ficha } = useFicha(ctx.card.id);
  const [dialogo, setDialogo] = useState<Dialogo>('');
  const [campos, setCampos] = useState({ proxAcao: '', proxAcaoData: '', aplicado: '', enviarEmail: '1' });
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  if (!ficha) return null;

  const { caso, pode } = ficha;
  const base = `/cobranca/caso/${caso.id}`;
  const comRegua = CARTEIRAS_COM_REGUA.includes(caso.carteira);
  const acordoProposto = ficha.acordo?.SITUACAO === 'PROPOSTO';
  const baixa = ficha.baixa?.SITUACAO === 'PENDENTE' ? ficha.baixa : null;
  const travado = ctx.travado || gravando;
  const botao = (rotulo: string, pode: boolean, onClick: () => void) => (
    <Button key={rotulo} size="sm" disabled={!pode || travado} title={pode ? undefined : SEM_PERMISSAO} onClick={onClick}>{rotulo}</Button>
  );
  const abrir = (d: Dialogo) => { setErro(''); setDialogo(d); };

  async function gravar(nome: Parameters<typeof acao>[0], input: Record<string, unknown>, ok: string) {
    setGravando(true);
    setErro('');
    try {
      const r = await acao(nome, input);
      if (r.ok === false) return setErro(String(r.error ?? 'Não foi possível gravar.'));
      setDialogo('');
      ctx.avisar('success', r.aviso ? `${ok} ${r.aviso}` : ok);
      await recarregarFicha(ctx.card.id);
      await ctx.recarregar();
    } catch (e) {
      setErro(erroDe(e));
    } finally {
      setGravando(false);
    }
  }

  async function montarDossie() {
    setGravando(true);
    try {
      const r = await acao('ccJurDossieAbrir', { clienteId: ficha!.cliente.id, carteira: caso.carteira });
      if (r.ok === false) ctx.avisar('error', String(r.error ?? 'Não foi possível abrir o dossiê.'));
      else ctx.avisar('success', 'Dossiê aberto no quadro Jurídico: complete os itens e envie por lá.');
      await ctx.recarregar();
    } catch (e) {
      ctx.avisar('error', erroDe(e));
    } finally {
      setGravando(false);
    }
  }

  return (
    <>
      {botao('Registrar contato', pode.registrarContato, () => navigate(`${base}/contato`))}
      {botao('Definir próxima ação', pode.operar, () => { setCampos({ ...campos, proxAcao: caso.proxAcao ?? '', proxAcaoData: caso.proxAcaoData ?? '' }); abrir('proxAcao'); })}
      {caso.carteira !== 'PUBLICA' ? botao('Propor acordo', pode.proporAcordo, () => navigate(`${base}/acordo`)) : null}
      {acordoProposto ? botao('Decidir acordo', pode.decidirAcordo, () => navigate(`${base}/acordo`)) : null}
      {baixa ? null : botao('Propor baixa', pode.proporBaixa, () => navigate(`${base}/baixa`))}
      {baixa && !baixa.PARECER_EM ? botao('Parecer da baixa', pode.parecerBaixa, () => navigate(`${base}/baixa`)) : null}
      {baixa?.PARECER_EM ? botao('Decidir baixa', pode.decidirBaixa, () => navigate(`${base}/baixa`)) : null}
      {comRegua && ficha.bloqueio.devido !== ficha.bloqueio.aplicado
        ? botao('Registrar bloqueio', pode.registrarBloqueio, () => { setCampos({ ...campos, aplicado: ficha.bloqueio.devido }); abrir('bloqueio'); }) : null}
      {caso.desfecho === 'REGULARIZADO' && caso.protestado && !caso.anuenciaEm ? botao('Carta de anuência', pode.registrarAnuencia, () => abrir('anuencia')) : null}
      {caso.juridicoEm ? null : botao('Montar dossiê', pode.montarDossie, montarDossie)}

      <Dialog open={dialogo !== ''} onOpenChange={(aberto) => !aberto && setDialogo('')}>
        <DialogContent>
          {dialogo === 'proxAcao' ? (
            <>
              <DialogHeader><DialogTitle>Próxima ação</DialogTitle><DialogDescription>Aparece na agenda de quem cobra o cliente, na data escolhida.</DialogDescription></DialogHeader>
              <DialogBody>
                <LabelledField label="O que fazer"><Input value={campos.proxAcao} maxLength={200} onChange={(e) => setCampos({ ...campos, proxAcao: e.target.value })} /></LabelledField>
                <LabelledField label="Data" hint="Dia não útil vai para o próximo útil."><Input type="date" value={campos.proxAcaoData} onChange={(e) => setCampos({ ...campos, proxAcaoData: e.target.value })} /></LabelledField>
                {erro ? <Alert tone="error">{erro}</Alert> : null}
              </DialogBody>
              <DialogFooter>
                <Button onClick={() => setDialogo('')}>Cancelar</Button>
                <Button variant="primary" disabled={travado} onClick={() => gravar('ccCobProxAcaoDefinir', { cobrancaId: caso.id, proxAcao: campos.proxAcao.trim(), proxAcaoData: campos.proxAcaoData }, 'Próxima ação definida.')}>Salvar</Button>
              </DialogFooter>
            </>
          ) : null}
          {dialogo === 'bloqueio' ? (
            <>
              <DialogHeader><DialogTitle>Registrar o aplicado no ERP</DialogTitle><DialogDescription>O sistema não escreve no Winthor: aplique lá e registre aqui o que ficou.</DialogDescription></DialogHeader>
              <DialogBody>
                <Field label="No Winthor agora">
                  <SelectMenu label="Bloqueio aplicado" value={campos.aplicado} onChange={(aplicado) => setCampos({ ...campos, aplicado })}
                    options={[{ value: '', label: 'Sem bloqueio (liberado)' }, { value: 'PEDIDOS', label: 'Novos pedidos bloqueados' }, { value: 'TOTAL', label: 'Bloqueio total do crédito' }]} />
                </Field>
                {erro ? <Alert tone="error">{erro}</Alert> : null}
              </DialogBody>
              <DialogFooter>
                <Button onClick={() => setDialogo('')}>Cancelar</Button>
                <Button variant="primary" disabled={travado} onClick={() => gravar('ccCobBloqueioAplicar', { cobrancaId: caso.id, aplicado: campos.aplicado }, 'Bloqueio registrado.')}>Registrar</Button>
              </DialogFooter>
            </>
          ) : null}
          {dialogo === 'anuencia' ? (
            <>
              <DialogHeader><DialogTitle>Carta de anuência</DialogTitle><DialogDescription>Anexe a carta ao card antes de enviar: o e-mail leva os anexos posteriores ao encerramento.</DialogDescription></DialogHeader>
              <DialogBody>
                <Field label="Como foi entregue">
                  <SelectMenu label="Envio da carta" value={campos.enviarEmail} onChange={(enviarEmail) => setCampos({ ...campos, enviarEmail })}
                    options={[{ value: '1', label: 'Enviar por e-mail agora' }, { value: '0', label: 'Já entregue por outro meio' }]} />
                </Field>
                <Alert tone="info">O anexo fica em endereço público: quem tiver o link abre o arquivo.</Alert>
                {erro ? <Alert tone="error">{erro}</Alert> : null}
              </DialogBody>
              <DialogFooter>
                <Button onClick={() => setDialogo('')}>Cancelar</Button>
                <Button variant="primary" disabled={travado} onClick={() => gravar('ccCobAnuenciaRegistrar', { cobrancaId: caso.id, enviarEmail: Number(campos.enviarEmail), contatoId: 0 }, 'Anuência registrada.')}>Registrar</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
