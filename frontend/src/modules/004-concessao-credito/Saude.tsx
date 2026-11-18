// Saúde das análises, opção A (três alturas): números, dois gráficos (por agente e por rating na
// concessão) e a lista de clientes. Abrir: ccCredSaudeResumo × 3 + ccCredSaudeListar + total = 5.

import { useState } from 'react';
import type { Carteira } from '@/lib/base/carteira';
import { linha, linhas } from '@/lib/mitra-api';
import {
  Alert, BarrasPainel, Field, GradeGraficos, GradeKpi, Kpi, Pagination, Panel, PanelHeader, RowMeta, RowTitle,
  SelectMenu, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { inteiro, lerTodas, n, pct, useLeitura, type Linha } from './dados';
import { Rating, Reais, Saude as SaudeStatus, Txt } from './pecas';

const POR_PAGINA = 20;
const SERIES = [{ chave: 'SAUDAVEL', rotulo: 'Saudável' }, { chave: 'ATENCAO', rotulo: 'Em atenção' }, { chave: 'RISCO', rotulo: 'Risco' }];

export default function Saude({ carteira }: { carteira: Carteira }) {
  const resumo = useLeitura(() => lerTodas([
    ['ccCredSaudeResumo', { carteira, agrupar: '' }],
    ['ccCredSaudeResumo', { carteira, agrupar: 'ANALISTA' }],
    ['ccCredSaudeResumo', { carteira, agrupar: 'RATING' }],
  ]), [carteira]);
  const [total, porAnalista, porRating] = resumo.dados?.listas ?? [];
  const t = total?.[0];
  const aprovadas = n(t?.SAUDAVEL) + n(t?.ATENCAO) + n(t?.RISCO);
  const [saude, setSaude] = useState('');
  const [pagina, setPagina] = useState(1);
  const filtro = { carteira, saude, busca: '' };
  const qtd = useLeitura(() => linha('ccCredSaudeTotal', filtro), [carteira, saude]);
  const lista = useLeitura(() => linhas('ccCredSaudeListar', { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }), [carteira, saude, pagina]);
  const totalLista = n(qtd.dados?.TOTAL);
  const comNome = (ls: Linha[] | undefined) => (ls ?? []).map((l) => ({ ...l, NOME: l.GRUPO_NOME || 'Sem rating' }));

  return (
    <>
      {resumo.erro || resumo.dados?.erro || lista.erro ? <Alert tone="error">{resumo.erro || resumo.dados?.erro || lista.erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Análises aprovadas" valor={inteiro(aprovadas)} hint="créditos vigentes" />
        <Kpi rotulo="Saudáveis" valor={inteiro(t?.SAUDAVEL)} hint={`índice de saúde ${pct(t?.INDICE, 0) || '—'}`} />
        <Kpi rotulo="Em atenção" valor={inteiro(t?.ATENCAO)} hint="atraso curto, uso alto ou validade vencida" />
        <Kpi rotulo="Apresentaram risco" valor={inteiro(t?.RISCO)} hint="atraso acima do limite de risco" />
      </GradeKpi>
      <GradeGraficos>
        <BarrasPainel titulo="Saúde por agente" hint="análises aprovadas de cada analista" linhas={comNome(porAnalista)} categoria="NOME" series={SERIES} empilhar vazio="Sem créditos vigentes." />
        <BarrasPainel titulo="Saúde por rating na concessão" hint="rating congelado no dia da decisão" linhas={comNome(porRating)} categoria="NOME" series={SERIES} empilhar vazio="Sem créditos vigentes." />
      </GradeGraficos>
      <Panel>
        <PanelHeader title="Indicadores por agente" />
        <Table>
          <thead><tr><Th>Agente</Th><Th numeric>Aprovadas</Th><Th numeric>Saudáveis</Th><Th numeric>Em atenção</Th><Th numeric>Risco</Th><Th numeric>Índice de saúde</Th></tr></thead>
          <tbody>
            {(porAnalista ?? []).map((l) => (
              <Tr key={l.GRUPO}>
                <Td><RowTitle>{l.GRUPO_NOME}</RowTitle></Td>
                <Td numeric>{inteiro(n(l.SAUDAVEL) + n(l.ATENCAO) + n(l.RISCO))}</Td>
                <Td numeric>{inteiro(l.SAUDAVEL)}</Td>
                <Td numeric>{inteiro(l.ATENCAO)}</Td>
                <Td numeric>{inteiro(l.RISCO)}</Td>
                <Td numeric>{pct(l.INDICE, 0)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Panel>
        <PanelHeader title="Análises por situação" hint="Saudável: sem atraso, uso abaixo do limite de atenção e validade em dia." />
        <Toolbar>
          <Field label="Situação">
            <SelectMenu label="Situação" value={saude} onChange={(v) => { setSaude(v); setPagina(1); }}
              options={[{ value: '', label: 'Todas' }, { value: 'RISCO', label: 'Risco' }, { value: 'ATENCAO', label: 'Em atenção' }, { value: 'SAUDAVEL', label: 'Saudável' }]} />
          </Field>
        </Toolbar>
        <Table>
          <thead><tr><Th>Situação</Th><Th>Cliente</Th><Th>Agente</Th><Th>Rating na concessão</Th><Th>Aprovado por</Th><Th numeric>Dias de atraso</Th><Th numeric>Vencido</Th><Th numeric>Uso</Th><Th>Sinais</Th></tr></thead>
          <tbody>
            {(lista.dados ?? []).map((l) => (
              <Tr key={l.CLIENTE_ID}>
                <Td><SaudeStatus s={l.SAUDE} /></Td>
                <Td><RowTitle>{l.CLIENTE_NOME}</RowTitle><RowMeta>CODCLI {l.CODCLI}</RowMeta></Td>
                <Td><Txt v={l.ANALISTA_NOME} /></Td>
                <Td><Rating r={l.RATING_CONCESSAO} /></Td>
                <Td><Txt v={l.APROVADO_POR_NOME} /></Td>
                <Td numeric><Txt v={n(l.DIAS_ATRASO) ? inteiro(l.DIAS_ATRASO) : ''} /></Td>
                <Td numeric><Reais v={l.VENCIDO} /></Td>
                <Td numeric><Txt v={n(l.LIMITE) ? pct((n(l.UTILIZADO) / n(l.LIMITE)) * 100, 0) : ''} /></Td>
                <Td><Txt v={l.SAUDE_SINAIS} /></Td>
              </Tr>
            ))}
            {!(lista.dados ?? []).length ? <Tr><Td colSpan={9}><RowMeta>Nenhuma análise nesta situação.</RowMeta></Td></Tr> : null}
          </tbody>
        </Table>
        <Pagination page={pagina} lastPage={Math.max(1, Math.ceil(totalLista / POR_PAGINA))} total={totalLista} unit={totalLista === 1 ? 'análise' : 'análises'}
          onPrevious={() => setPagina((p) => p - 1)} onNext={() => setPagina((p) => p + 1)} />
      </Panel>
    </>
  );
}

