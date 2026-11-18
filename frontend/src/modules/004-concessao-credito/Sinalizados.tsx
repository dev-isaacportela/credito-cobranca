// Clientes sinalizados, opção C (matriz cliente × sinal): uma coluna por sinal da criticidade com o valor
// medido; o estado da célula sai de `estadoSinal` com os cortes `crit.*` da carteira (PA-07).
// Abrir: ccCredCriticidadeListar + total + ccBaseParametroListar (crit) = 3.

import { useEffect, useState, type ReactNode } from 'react';
import type { Carteira } from '@/lib/base/carteira';
import { linha, linhas } from '@/lib/mitra-api';
import {
  Alert, Dash, Field, LabelledField, Pagination, Panel, PanelHeader, RowMeta, RowTitle, SearchInput, SelectMenu, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { estadoSinal, rotuloFase, type EstadoSinal, type Sinal } from '@/lib/concessao-credito/regras';
import { inteiro, n, pct, useLeitura } from './dados';
import { Criticidade } from './pecas';

const POR_PAGINA = 20;
const TOM: Record<EstadoSinal, 'alert' | 'attention' | 'off'> = { critico: 'alert', alerta: 'attention', normal: 'off', sem: 'off' };

function Celula({ estado, children }: { estado: EstadoSinal; children: ReactNode }) {
  if (estado === 'sem') return <Dash />;
  return <Status tone={TOM[estado]}>{children}</Status>;
}

export default function Sinalizados({ carteira }: { carteira: Carteira }) {
  const [criticidade, setCriticidade] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const filtro = { carteira, criticidade, busca: buscaAplicada };
  const params = useLeitura(() => linhas('ccBaseParametroListar', { grupo: 'crit', carteira, data: '' }), [carteira]);
  const total = useLeitura(() => linha('ccCredCriticidadeTotal', filtro), [carteira, criticidade, buscaAplicada]);
  const lista = useLeitura(() => linhas('ccCredCriticidadeListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), [carteira, criticidade, buscaAplicada, pagina]);
  const p = Object.fromEntries((params.dados ?? []).map((l) => [l.CHAVE, l.VALOR_EFETIVO]));
  const t = n(total.dados?.TOTAL);
  const est = (s: Sinal, v: unknown, rating?: string) => estadoSinal(s, v, p, { rating });

  // Busca com espera de 400 ms.
  useEffect(() => {
    const t = setTimeout(() => { setBuscaAplicada(busca.trim()); setPagina(1); }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  return (
    <>
      {lista.erro || params.erro ? <Alert tone="error">{lista.erro || params.erro}</Alert> : null}
      <Panel>
        <PanelHeader title="Clientes × sinais" hint={`${inteiro(t)} clientes sinalizados · cada coluna é um sinal da criticidade, com o valor medido`} />
        <Toolbar>
          <LabelledField label="Buscar">
            <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente ou código" />
          </LabelledField>
          <Field label="Criticidade">
            <SelectMenu label="Criticidade" value={criticidade} onChange={(v) => { setCriticidade(v); setPagina(1); }}
              options={[{ value: '', label: 'Todas' }, { value: 'CRITICO', label: 'Crítico' }, { value: 'ALERTA', label: 'Alerta' }]} />
          </Field>
        </Toolbar>
        <Table>
          <thead>
            <tr><Th>Cliente</Th><Th>Criticidade</Th><Th numeric>Atraso</Th><Th numeric>Pontualidade</Th><Th numeric>Score Serasa</Th><Th numeric>Uso do limite</Th>
              <Th numeric>Prazo médio</Th><Th>Rating atual</Th><Th>Faixa rebaixada</Th></tr>
          </thead>
          <tbody>
            {(lista.dados ?? []).map((l) => {
              const uso = n(l.LIMITE) ? Math.round((n(l.UTILIZADO) / n(l.LIMITE)) * 100) : null;
              return (
                <Tr key={l.CLIENTE_ID}>
                  <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>CODCLI {l.CODCLI}{l.FASE_NOME ? ` · ${rotuloFase(l.FASE_NOME)}` : ''}</RowMeta></Td>
                  <Td><Criticidade c={l.CRITICIDADE} /><RowMeta>{l.CRIT_MOTIVOS}</RowMeta></Td>
                  <Td numeric><Celula estado={est('atraso', l.DIAS_ATRASO)}>{inteiro(l.DIAS_ATRASO)} dias</Celula></Td>
                  <Td numeric><Celula estado={est('pontualidade', l.PONTUALIDADE_PCT)}>{pct(l.PONTUALIDADE_PCT, 0)}</Celula></Td>
                  <Td numeric><Celula estado={est('score', l.SCORE_SERASA)}>{inteiro(l.SCORE_SERASA)}</Celula></Td>
                  <Td numeric><Celula estado={est('uso', uso)}>{pct(uso, 0)}</Celula></Td>
                  <Td numeric><Celula estado={est('prazo', l.PRAZO_MEDIO_DIAS)}>{inteiro(l.PRAZO_MEDIO_DIAS)} dias</Celula></Td>
                  <Td><Celula estado={est('rating', l.RATING_ATUAL)}>{l.RATING_ATUAL}</Celula></Td>
                  <Td>{Number(l.REBAIXADO) ? <Celula estado={est('rebaixado', 1, String(l.RATING_ATUAL))}>{l.ALERTAS || 'Sim'}</Celula> : <Dash />}</Td>
                </Tr>
              );
            })}
            {!(lista.dados ?? []).length ? <Tr><Td colSpan={9}><RowMeta>Nenhum cliente sinalizado com esses filtros.</RowMeta></Td></Tr> : null}
          </tbody>
        </Table>
        <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(t / POR_PAGINA))} total={t} unit={t === 1 ? 'cliente' : 'clientes'}
          onPrevious={() => setPagina((x) => x - 1)} onNext={() => setPagina((x) => x + 1)} />
      </Panel>
      <Alert tone="info">
        Vermelho: limite crítico acionado; âmbar: limite de alerta; cinza: medido e dentro do normal; travessão: dado que não existe.
        Crítico aciona qualquer limite crítico ou junta sinais de alerta; os limites são parâmetros da política.
      </Alert>
    </>
  );
}
