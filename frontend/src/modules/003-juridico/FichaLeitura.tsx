// Ficha de leitura do processo (T-216, RF-016): para quem não abre o card (agente fora do próprio dossiê, links da
// lista e dos alertas). Os mesmos blocos do card, sem ações. Sem acesso: "Processo não encontrado.", sem dado nenhum.

import { useParams } from 'react-router-dom';
import {
  Alert, Button, Code, Nota, PageHeader, Pilha,
} from '@/components/page';
import { fmtData } from '@/lib/formato';
import { brl, CARTEIRA_NOME, nomeCurto } from './comum';
import { useFichaPorId, type Ficha } from './ficha';
import { BlocosDoProcesso } from './card/BlocosDoProcesso';

export function CabecalhoDoProcesso({ ficha, titulo }: { ficha?: Ficha; titulo: string }) {
  const pr = ficha?.processo;
  return (
    <PageHeader module="Jurídico" title={pr ? `${titulo} · ${pr.NOME_DEVEDOR}` : titulo}
      description={pr ? `${CARTEIRA_NOME[pr.CARTEIRA] ?? pr.CARTEIRA} · ${nomeCurto(pr.FASE_CHAVE)} · ${brl(pr.VALOR)}` : undefined}
      actions={<Button variant="secondary" onClick={() => window.history.back()}>Voltar</Button>}
      meta={pr ? (
        <>
          {pr.AUTOS ? <Code prefix="autos ">{pr.AUTOS}</Code> : <Code>sem autos</Code>}
          {pr.DOSSIE_ENVIADO_EM ? <Code prefix="enviado em ">{fmtData(pr.DOSSIE_ENVIADO_EM)}</Code> : null}
        </>
      ) : null} />
  );
}

export default function FichaLeitura() {
  const { id } = useParams();
  const ficha = useFichaPorId(Number(id) || 0);
  return (
    <Pilha>
      <CabecalhoDoProcesso ficha={ficha.dados} titulo="Processo" />
      {ficha.erro ? <Alert tone="error">{ficha.erro}</Alert> : null}
      {ficha.dados ? <BlocosDoProcesso ficha={ficha.dados} leitura onAlterado={ficha.recarregar} /> : !ficha.erro ? <Nota>Carregando…</Nota> : null}
    </Pilha>
  );
}
