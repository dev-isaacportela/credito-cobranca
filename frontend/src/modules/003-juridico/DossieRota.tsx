// Rota do dossiê (T-214): /juridico/dossie/:processoId — para onde o "Montar dossiê" da cobrança leva. Em montagem,
// as pendências (mesmo componente da fase `dossie` do card); fora dela, a ficha de leitura.

import { useParams } from 'react-router-dom';
import {
  Alert, Nota, Pilha,
} from '@/components/page';
import { BlocosDoProcesso } from './card/BlocosDoProcesso';
import { DossiePendencias } from './DossiePendencias';
import { CabecalhoDoProcesso } from './FichaLeitura';
import { useFichaPorId } from './ficha';

export default function DossieRota() {
  const { processoId } = useParams();
  const ficha = useFichaPorId(Number(processoId) || 0);
  const f = ficha.dados;
  const montando = f && f.processo.FASE_CHAVE === 'dossie' && !f.processo.DOSSIE_ENVIADO_EM && !f.processo.ENCERRADO_EM;
  return (
    <Pilha>
      <CabecalhoDoProcesso ficha={f} titulo="Dossiê" />
      {ficha.erro ? <Alert tone="error">{ficha.erro}</Alert> : null}
      {!f ? (!ficha.erro ? <Nota>Carregando…</Nota> : null)
        : montando ? <DossiePendencias ficha={f} onAlterado={ficha.recarregar} />
          : <BlocosDoProcesso ficha={f} leitura onAlterado={ficha.recarregar} />}
    </Pilha>
  );
}
