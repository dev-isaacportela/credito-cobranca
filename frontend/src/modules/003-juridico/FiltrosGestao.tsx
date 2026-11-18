// Filtros das abas de gestão (Visão gerencial, Custos): BU, carteira, linha e filial (ccJurIndicadores, ccJurAlertas).

import { linhas } from '@/lib/mitra-api';
import { Field, SelectMenu, Toolbar } from '@/components/page';
import { FILTRO_GESTAO, OPCOES_CARTEIRA, OPCOES_LINHA, useDados } from './comum';

export type FiltroGestao = typeof FILTRO_GESTAO;

export function FiltrosGestao({ filtro, onFiltro }: { filtro: FiltroGestao; onFiltro: (f: FiltroGestao) => void }) {
  const listas = useDados(() => Promise.all([linhas('ccBaseBuListar', { ativa: 1 }), linhas('ccJurFilialCredoraListar', { ativa: -1 })]), 'gestao');
  const [bus = [], filiais = []] = listas.dados ?? [];
  return (
    <Toolbar>
      <Field label="BU"><SelectMenu label="BU" value={String(filtro.buId)} onChange={(v) => onFiltro({ ...filtro, buId: Number(v) })}
        options={[{ value: '-1', label: 'Todas as BUs' }, ...bus.map((b) => ({ value: String(b.ID), label: b.NOME }))]} /></Field>
      <Field label="Carteira"><SelectMenu label="Carteira" value={filtro.carteira} options={OPCOES_CARTEIRA} onChange={(carteira) => onFiltro({ ...filtro, carteira })} /></Field>
      <Field label="Linha"><SelectMenu label="Linha" value={filtro.linha} options={OPCOES_LINHA} onChange={(linha) => onFiltro({ ...filtro, linha })} /></Field>
      <Field label="Filial"><SelectMenu label="Filial" value={filtro.filial} onChange={(filial) => onFiltro({ ...filtro, filial })}
        options={[{ value: '', label: 'Todas as filiais' }, ...filiais.map((x) => ({ value: String(x.CODIGO), label: `${x.CODIGO} · ${x.CIDADE_UF}` }))]} /></Field>
    </Toolbar>
  );
}
