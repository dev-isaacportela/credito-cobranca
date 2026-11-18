// Bloco do motor do órgão (concessao-motor B, "Resultado primeiro", T-211): nota, rating, exposição e decisão em
// números grandes; pontos por critério em barras; travas e base; o dado informado e a trilha da decisão recolhidos.
// O motor vem pronto do servidor (ccPubAnaliseObter ou ccPubMotorCalcular): a tela não calcula nada (D-003).

import { useState, type ReactNode } from 'react';
import { fmtData } from '@/lib/formato';
import {
  Alert, BarraPontos, Button, CorpoPainel, Dash, EscalaRating, Ficha, Grade, ItemFicha, Kpi, Panel, PanelHeader,
  Pilha, RowMeta, Status, Table, Td, Th, Tr,
} from '@/components/page';
import { rot, rotuloDecisao } from '@/lib/setor-publico/formato';
import { brl, n, vazio, type Linha } from './dados';

// ponytail: máximos padrão da RN-010 (pubMotor.*); se um parâmetro subir o máximo, a barra satura em 100%.
const ESCALA = [
  { rating: 'P4', texto: '0 a 39', peso: 40 }, { rating: 'P3', texto: '40 a 59', peso: 20 }, { rating: 'P2', texto: '60 a 79', peso: 20 },
  { rating: 'P1', texto: '80 a 100', peso: 21 },
];

export default function MotorOrgao({ motor, analise, calculadoEm, acoes }: { motor: Linha; analise: Linha; calculadoEm?: string; acoes?: ReactNode }) {
  const [detalhe, setDetalhe] = useState(false);
  const p = (motor.pontos ?? {}) as Linha;
  const t = (motor.travas ?? {}) as Linha;
  const faltando = (motor.faltando ?? []) as string[];
  const travou = !!(t.capagD || t.pessoalAcima);
  const base = String(analise.BASE ?? '');
  const valorBase = base === 'EDITAL' ? analise.VALOR_ESTIMADO : base === 'CONTRATO' ? analise.SALDO_CONTRATO : null;
  const historico = n(p.historico) + n(p.atraso);
  const criterios: [string, number, number, string][] = [
    ['CAPAG', n(p.capag), 30, rot('CAPAG', analise.CAPAG) || 'não consultada'],
    ['Despesa com pessoal', n(p.pessoal), 15, vazio(analise.PESSOAL_PCT) ? 'não informada' : `${n(analise.PESSOAL_PCT).toLocaleString('pt-BR')}% da RCL`],
    ['CAUC', n(p.cauc), 10, rot('CAUC', analise.CAUC) || 'não consultado'],
    ['Fonte do recurso', n(p.fonte), 15, [rot('FONTE_TIPO', analise.FONTE_TIPO) || 'não informada', analise.FONTE_PAGADORA].filter(Boolean).join(' · ')],
    ['Histórico de pagamento', historico, 20, rot('PERFIL_PAG', analise.PERFIL_PAG) || (vazio(analise.ATRASO_MEDIO) ? 'pelo atraso médio das NFs pagas' : `atraso médio de ${n(analise.ATRASO_MEDIO)} dias`)],
    ['Empenho prévio e contrato vigente', n(p.operacao), 10, `Empenho: ${rot('SIM_NAO', analise.EMPENHO_PREVIO) || '—'} · Contrato: ${rot('SIM_NAO', analise.CONTRATO_VIGENTE) || '—'}`],
  ];
  const travas: [boolean, string, string][] = [
    [!!t.capagD, 'CAPAG D limita o rating a P3', `CAPAG ${rot('CAPAG', analise.CAPAG) || 'não consultada'}`],
    [!!t.pessoalAcima, 'Pessoal acima do limite limita o rating a P3', vazio(analise.PESSOAL_PCT) ? 'não informada' : `${n(analise.PESSOAL_PCT).toLocaleString('pt-BR')}% da RCL`],
    [!!t.fimMandato, 'Fim de mandato (LRF, art. 42): menos 5 pontos', rot('ESFERA', analise.ESFERA) || 'esfera não informada'],
    [!!t.atrasoTeto, 'Atraso médio acima de 90 dias limita o histórico a 4 pontos', vazio(analise.ATRASO_MEDIO) ? 'atraso das NFs pagas' : `${n(analise.ATRASO_MEDIO)} dias`],
  ];
  const trilha: [boolean, string][] = [
    [!!base, 'Base da análise informada'],
    [base !== 'EDITAL', 'Base não é edital (não é pré-aprovação)'],
    [!!motor.podeAprovar, motor.podeAprovar ? 'Contrato com saldo e dentro da vigência' : String(motor.motivoNaoAprovar)],
    [analise.EMPENHO_PREVIO !== 'NAO', `Empenho prévio: ${rot('SIM_NAO', analise.EMPENHO_PREVIO) || 'não informado'} (sem empenho, sem entrega)`],
    [analise.CONTRATO_VIGENTE !== 'NAO', `Contrato vigente: ${rot('SIM_NAO', analise.CONTRATO_VIGENTE) || 'não informado'}`],
    [true, `Rating ${motor.ratingPub}: ${rotuloDecisao(motor.decisaoSugerida).toLowerCase()}`],
  ];

  return (
    <Panel>
      <PanelHeader title="Motor do órgão" hint={calculadoEm ? `Fotografia gravada em ${fmtData(calculadoEm)} ${String(calculadoEm).slice(11, 16)}; abaixo, o cálculo com os dados de agora.` : 'Ainda sem fotografia gravada: use Calcular.'}>
        {acoes}
      </PanelHeader>
      <CorpoPainel>
        <Grade colunas={2}>
          <Kpi rotulo="Nota do órgão" valor={n(motor.nota)} hint="de 100 · seis critérios" />
          <Kpi rotulo="Rating público" valor={String(motor.ratingPub)} hint={travou ? 'limitado a P3 pela trava' : `faixa ${ESCALA.find((e) => e.rating === motor.ratingPub)?.texto ?? ''} · sem travas`} />
          <Kpi rotulo="Exposição máxima" valor={brl(motor.exposicao) || 'R$ 0,00'} hint={valorBase !== null ? `fator do ${motor.ratingPub} sobre ${brl(valorBase) || 'R$ 0,00'}` : 'sobre o valor solicitado'} />
          <Kpi rotulo="Decisão sugerida" valor={rotuloDecisao(motor.decisaoSugerida)} />
        </Grade>
        {motor.podeAprovar ? <Status tone="live">Aprovação possível: contrato ativo com saldo e vigência.</Status>
          : <Alert tone="warn">Aprovar não será aceito: {String(motor.motivoNaoAprovar)}</Alert>}
        {faltando.length ? <Alert tone="warn">Valem os pontos de "não informado" em: {faltando.join(', ')}.</Alert> : null}
        <Pilha>
          <Panel>
            <CorpoPainel>
              <RowMeta>Pontos por critério</RowMeta>
              {criterios.map(([r, v, max]) => <BarraPontos key={r} rotulo={r} valor={v} maximo={max} />)}
              <EscalaRating rating={String(motor.ratingPub)} faixas={ESCALA} />
            </CorpoPainel>
          </Panel>
          <Panel>
            <Table>
              <tbody>
                {travas.map(([aplica, texto, dado]) => (
                  <Tr key={texto}>
                    <Td>{texto}<RowMeta>{dado}</RowMeta></Td>
                    <Td><Status tone={aplica ? 'attention' : 'off'}>{aplica ? 'Aplicada' : 'Não se aplica'}</Status></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <CorpoPainel>
              <Ficha>
                <ItemFicha rotulo="Base da análise">{rot('BASE', base) || 'não informada'}</ItemFicha>
                <ItemFicha rotulo={base === 'EDITAL' ? 'Estimado do edital' : 'Saldo do contrato'}>{brl(valorBase) || <Dash />}</ItemFicha>
                <ItemFicha rotulo="Vigência">{analise.VIGENCIA_FIM ? fmtData(analise.VIGENCIA_FIM) : <Dash />}</ItemFicha>
                <ItemFicha rotulo="Exposição máxima">{brl(motor.exposicao) || 'R$ 0,00'}</ItemFicha>
              </Ficha>
            </CorpoPainel>
          </Panel>
        </Pilha>
        <Button variant="ghost" size="sm" onClick={() => setDetalhe(!detalhe)} aria-expanded={detalhe}>
          {detalhe ? 'Esconder' : 'Ver'} o dado informado em cada critério e a trilha da decisão
        </Button>
        {detalhe ? (
          <Pilha>
            <Table>
              <thead><tr><Th>Critério</Th><Th>Dado informado</Th><Th numeric>Pontos</Th></tr></thead>
              <tbody>
                {criterios.map(([r, v, max, dado]) => <Tr key={r}><Td>{r}</Td><Td>{dado}</Td><Td numeric>{v} de {max}</Td></Tr>)}
              </tbody>
            </Table>
            <Table>
              <thead><tr><Th>Como a decisão foi sugerida</Th></tr></thead>
              <tbody>
                {trilha.map(([ok, texto]) => <Tr key={texto}><Td><Status tone={ok ? 'live' : 'alert'}>{texto}</Status></Td></Tr>)}
              </tbody>
            </Table>
          </Pilha>
        ) : null}
      </CorpoPainel>
    </Panel>
  );
}
