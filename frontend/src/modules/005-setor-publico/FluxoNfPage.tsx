// /publico/notas-fiscais — Fluxo da NF pública (T-204, T-205, T-207): abas "Etapas e prazos" (nf-etapas-prazos A,
// trilho horizontal), "Notas fiscais em tramitação" (nf-tramitacao C, trilho por nota) e "Contratos" (listagem
// padrão, PA-13). A aba fica na URL (?aba=). Cabeçalho: ccPubNfTotal das NFs em aberto (1 leitura).

import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { linhas } from '@/lib/mitra-api';
import {
  Alert, Card, CardTitle, CorpoPainel, Dash, Grade, MetaDot, PageHeader, Panel, Pilha, RowMeta, RowTitle, Stat,
  Tabs, TabsContent, TabsList, TabsTrigger, Trilho,
} from '@/components/page';
import { brl, n, NF_FILTRO, pl, useDados, type Linha } from './dados';
import NotasFiscaisLista from './NotasFiscaisLista';
import ContratosAba from './ContratosAba';

const ABAS = [
  { id: 'etapas', rotulo: 'Etapas e prazos' },
  { id: 'notas', rotulo: 'Notas fiscais em tramitação' },
  { id: 'contratos', rotulo: 'Contratos' },
];

export default function FluxoNfPage() {
  const [params, setParams] = useSearchParams();
  const aba = ABAS.some((a) => a.id === params.get('aba')) ? String(params.get('aba')) : 'etapas';
  const total = useDados(async () => (await linhas('ccPubNfTotal', NF_FILTRO))[0] ?? null, 'total');
  const t = total.dados;

  return (
    <>
      <PageHeader
        module="Setor público"
        title="Fluxo da NF pública"
        description="Do empenho ao pagamento: etapas, prazos legais e o acompanhamento de cada nota fiscal emitida para órgão público."
        meta={t ? (
          <>
            <span><Stat>{n(t.TOTAL)}</Stat> {pl(t.TOTAL, 'nota', 'notas')} em tramitação</span><MetaDot />
            <span><Stat>{brl(t.VALOR) || 'R$ 0,00'}</Stat> em aberto</span><MetaDot />
            <span><Stat>{n(t.ORGAOS)}</Stat> {pl(t.ORGAOS, 'órgão', 'órgãos')}</span><MetaDot />
            <span><Stat>{n(t.VENCIDAS)}</Stat> com prazo vencido</span>
          </>
        ) : undefined}
      />
      {total.erro ? <Alert tone="error">{total.erro}</Alert> : null}
      <Tabs value={aba} onValueChange={(a) => setParams({ aba: a })}>
        <TabsList variant="line" aria-label="Fluxo da NF pública">
          {ABAS.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.rotulo}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="etapas"><EtapasEPrazos /></TabsContent>
        <TabsContent value="notas"><NotasFiscaisLista onGravou={total.recarregar} /></TabsContent>
        <TabsContent value="contratos"><ContratosAba /></TabsContent>
      </Tabs>
    </>
  );
}

/** As sete etapas com o prazo da regra Federal vigente e as três exceções (RF-034: em telefone o trilho vira lista). */
function EtapasEPrazos() {
  const d = useDados(async () => {
    const [regras, pub] = await Promise.all([
      linhas('ccPubRegraEnteListar', { ativo: 1 }),
      linhas('ccBaseParametroListar', { grupo: 'pub', carteira: '', data: '' }),
    ]);
    return { federal: regras.find((r) => r.ESFERA === 'FEDERAL' && !r.UF) as Linha | undefined, pv: pub.find((p) => p.CHAVE === 'pub.pequenoValor') as Linha | undefined };
  }, 'etapas');
  const f = d.dados?.federal;
  const uteis = f?.CONTAGEM === 'CORRIDOS' ? 'dias corridos' : 'dias úteis';
  const liq = f ? `Até ${n(f.LIQ_DIAS)} ${uteis} do protocolo` : 'Prazo da regra do ente';
  const pag = f ? `Até ${n(f.PAG_DIAS)} ${uteis} da liquidação` : 'Prazo da regra do ente';
  const pv = d.dados?.pv;

  return (
    <Pilha>
      {d.erro ? <Alert tone="error">{d.erro}</Alert> : null}
      <Panel>
        <CorpoPainel>
          <Trilho passos={[
            { rotulo: 'Empenho', sub: 'Antes da entrega' },
            { rotulo: 'Entrega', sub: 'Canhoto assinado' },
            { rotulo: 'Recebimento', sub: 'Conferência do fiscal' },
            { rotulo: 'Protocolo da NF', sub: 'Marco inicial dos prazos' },
            { rotulo: 'Atesto e liquidação', sub: liq },
            { rotulo: 'Ordem cronológica', sub: 'Fila por fonte de recurso' },
            { rotulo: 'Pagamento', sub: pag },
          ]} />
          <Grade colunas={2}>
            <Resumo titulo="Protocolo da NF" texto="NF, comprovante de entrega e certidões protocolados no órgão." quem="Benenutri · IN SEGES/ME 77/2022" />
            <Resumo titulo="Atesto e liquidação" texto="O fiscal atesta e o financeiro liquida a despesa." quem="Fiscal e financeiro do órgão · Lei 4.320/64, art. 63" />
            <Resumo titulo="Ordem cronológica" texto="A NF liquidada entra na fila de pagamentos e recebe a ordem de pagamento." quem="Financeiro do órgão · Lei 14.133/2021, art. 141" />
            <Resumo titulo="Pagamento" texto="Paga a NF, a cobrança se encerra. Atraso acima de 2 meses da emissão abre o art. 137." quem="Tesouraria do órgão · Lei 14.133/2021, arts. 141 e 137" />
          </Grade>
          <RowMeta>
            {f ? `Prazos da regra Federal vigente (${n(f.LIQ_DIAS)} ${uteis} para liquidar + ${n(f.PAG_DIAS)} para pagar). ` : ''}
            Cada ente tem a sua regra, em Regras por ente; feriados nacionais, da UF e do município não contam.
          </RowMeta>
        </CorpoPainel>
      </Panel>
      <Grade colunas={3}>
        <Resumo titulo="Pequeno valor" destaque="Prazos pela metade nas regras em dias úteis"
          texto={<>Contratação estimada em até {pv ? brl(pv.VALOR_EFETIVO) : <Dash />} (Lei 14.133/2021, art. 75, II); a Gerência Financeira atualiza o limite todo janeiro.</>} />
        <Resumo titulo="Prazo do contrato" destaque="Prevalece sobre a regra do ente"
          texto="Quando o contrato fixa o pagamento em dias corridos do protocolo, vale o contrato; o prazo de liquidação continua o da regra." />
        <Resumo titulo="Mais de 2 meses" destaque="Requerimento administrativo"
          texto="Passados 2 meses da emissão sem pagamento, o Jurídico avalia o requerimento e o art. 137. Órgão não se bloqueia, não se negativa e não se protesta." />
      </Grade>
    </Pilha>
  );
}

function Resumo({ titulo, destaque, texto, quem }: { titulo: string; destaque?: string; texto: ReactNode; quem?: string }) {
  return (
    <Card>
      <CardTitle>{titulo}</CardTitle>
      <div>
        {destaque ? <RowTitle>{destaque}</RowTitle> : null}
        <RowMeta>{texto}</RowMeta>
        {quem ? <RowMeta>{quem}</RowMeta> : null}
      </div>
    </Card>
  );
}
