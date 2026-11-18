/**
 * painel-equipe A — Tabela em árvore (T-061): cada pessoa soma a própria carteira e a de toda a equipe abaixo
 * (RN-019), com recuo por nível. ccPainelEquipe (N2) e ccCobAgendaResumo (ações atrasadas somadas pela árvore na
 * tela, `somarAcoesNaArvore`). Só renderizado para supervisor ou acima e para quem tem a marca ADMIN.
 */
import {
  Alert, Dash, Esqueleto, MetaDot, Nota, Panel, PanelHeader, PessoaNaArvore, Secao, Stat, Table, Td, Th, Tr,
} from '@/components/page';
import { moedaInteira, rotuloNum } from '@/lib/painel-consolidado/calculo';
import { somarAcoesNaArvore } from '@/lib/painel-consolidado/equipe';
import { assentado, chaveDe, instalada, lerAgendaResumo, lerEquipe, primeiroErro, useCarga, type Linha, type PropsBloco } from '../dados';
import { AvisoDoBloco } from '../pecas';

const CARGO: Record<string, string> = {
  DIRETORIA: 'Diretoria', GERENTE: 'Gerente', SUPERVISOR: 'Supervisor', AGENTE: 'Agente de cobrança', ANALISTA: 'Analista de crédito',
};
const n = (v: unknown) => Number(v) || 0;

export function Equipe({ f }: PropsBloco) {
  const c = useCarga(chaveDe('equipe', f), async () => {
    const rs = await Promise.allSettled([lerEquipe(f), lerAgendaResumo(f)]);
    const [equipe, agenda] = rs.map(assentado) as [Linha[] | null, Linha[] | null];
    return { equipe: equipe || [], agenda, erro: primeiroErro(rs) };
  });
  const cabecalho = { titulo: 'Indicadores por nível da equipe', hint: 'Crédito e cobrança de cada pessoa, somando a própria carteira e a de toda a equipe abaixo dela.' };
  if (c.carregando) return <Esqueleto />;
  if (c.erro || !c.dados) return <Secao {...cabecalho}><Alert tone="error">{c.erro}</Alert></Secao>;
  const { equipe, agenda, erro } = c.dados;
  if (!equipe.length) return <Secao {...cabecalho}><AvisoDoBloco estado={{ tipo: 'VAZIO', texto: 'Ninguém na sua árvore.' }} /></Secao>;
  const acoes = somarAcoesNaArvore(equipe, agenda);
  const raiz = Math.min(...equipe.map((l) => n(l.PROFUNDIDADE)));
  const semAgenda = !instalada('ccCobAgendaResumo') || agenda === null;

  return (
    <Secao {...cabecalho}>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Panel>
        <PanelHeader title="Equipe" hint={<><Stat>{equipe.length}</Stat> pessoas na sua visão <MetaDot /> na ordem da hierarquia; o recuo mostra quem reporta a quem</>} />
        <Table>
          <thead>
            <tr>
              <Th>Pessoa</Th><Th>Cargo</Th><Th>Reporta a</Th><Th numeric>Análises em andamento</Th><Th numeric>Decididas no mês</Th>
              <Th numeric>Clientes em atraso</Th><Th numeric>Saldo vencido</Th><Th numeric>Recuperado no mês</Th><Th numeric>Atrasados na agenda</Th>
            </tr>
          </thead>
          <tbody>
            {equipe.map((l) => (
              <Tr key={n(l.MEMBRO_ID)}>
                <Td><PessoaNaArvore nome={String(l.NOME)} nivel={n(l.PROFUNDIDADE) - raiz} /></Td>
                <Td>{CARGO[String(l.CARGO)] ?? String(l.CARGO)}</Td>
                <Td>{l.SUPERIOR_NOME || <Dash />}</Td>
                <Td numeric>{rotuloNum(n(l.ANALISES_ANDAMENTO))}</Td>
                <Td numeric>{rotuloNum(n(l.DECIDIDAS))}</Td>
                <Td numeric>{rotuloNum(n(l.CLIENTES_ATRASO))}</Td>
                <Td numeric>{moedaInteira(n(l.VENCIDO))}</Td>
                <Td numeric>{moedaInteira(n(l.RECUPERADO))}</Td>
                <Td numeric>{semAgenda ? <Dash /> : rotuloNum(acoes.get(n(l.MEMBRO_ID)) ?? 0)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Nota>
        Análises contam pelo analista e clientes pelo agente. A linha de quem tem equipe é a soma da equipe abaixo; a do gerente e a da
        diretoria, a empresa inteira.{semAgenda ? ' Atrasados na agenda: módulo de cobrança não instalado.' : ''}
      </Nota>
    </Secao>
  );
}
