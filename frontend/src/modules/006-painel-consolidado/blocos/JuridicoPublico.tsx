/**
 * painel-juridico-publico B — Funil de cada carteira (T-060): etapas por valor (barra), quantidade ao lado, com o
 * `mes` do filtro; os números são dos módulos donos (ccJurResumo, ccPubResumo; DT-34), as etapas saem de
 * `funilJuridicoPublico()`. D-08: acordos judiciais aguardando aprovação num indicador próprio, fora do "a receber"
 * (ccJurAcordoTotal). Módulo ausente = "módulo não instalado", e o outro carrega.
 */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, BarrasEtapas, Button, Dash, Esqueleto, GradeGraficos, GraficoOuTabela, Linha as LinhaUi, Nota, Numeros, Secao,
  Status, Table, Td, Th, Tr,
} from '@/components/page';
import { moedaCurta, moedaInteira, rotuloNum } from '@/lib/painel-consolidado/calculo';
import { estadoDoBloco, funilJuridicoPublico, mesBarra, type Etapa } from '@/lib/painel-consolidado/visao';
import {
  assentado, chaveDe, instalada, lerAcordosJudiciais, lerJurResumo, lerPubResumo, primeiroErro, pubSeAplica, useCarga, type Linha, type PropsBloco,
} from '../dados';
import { AvisoDoBloco } from '../pecas';

const n = (v: unknown) => Number(v) || 0;
const plural = (q: number, um: string, varios: string) => `${rotuloNum(q)} ${q === 1 ? um : varios}`;

export function JuridicoPublico({ f }: PropsBloco) {
  const navigate = useNavigate();
  const c = useCarga(chaveDe('jurpub', f), async () => {
    const rs = await Promise.allSettled([lerJurResumo(f), lerPubResumo(f), lerAcordosJudiciais(f)]);
    const [jur, pub, acordos] = rs.map(assentado) as [Linha | null, Linha | null, Linha | null];
    return { jur, pub, acordos, erroJur: primeiroErro([rs[0], rs[2]]), erroPub: primeiroErro([rs[1]]) };
  });
  const cabecalho = {
    titulo: 'Jurídico e setor público',
    hint: `O resumo das duas carteiras que têm módulo próprio, em ${mesBarra(f.mes)} e com os filtros do painel. O trabalho é feito nos módulos; aqui só os números.`,
  };
  if (c.carregando) return <Esqueleto />;
  if (c.erro || !c.dados) return <Secao {...cabecalho}><Alert tone="error">{c.erro}</Alert></Secao>;
  const { jur, pub, acordos, erroJur, erroPub } = c.dados;
  const funil = funilJuridicoPublico(jur, pub);

  const jurEstado = estadoDoBloco({ instalado: instalada('ccJurResumo'), erro: erroJur });
  const pubEstado = !pubSeAplica(f)
    ? { tipo: 'VAZIO' as const, texto: 'O filtro de carteira não se aplica: o setor público é a carteira Pública.' }
    : estadoDoBloco({ instalado: instalada('ccPubResumo'), erro: erroPub });

  return (
    <Secao {...cabecalho}>
      <GradeGraficos>
        {jurEstado || !funil.juridico ? <AvisoDoBloco estado={jurEstado ?? { tipo: 'NAO_INSTALADO', texto: 'Módulo não instalado.' }} hint="Jurídico" /> : (
          <Funil
            titulo="Jurídico"
            hint={`Do ajuizamento à recuperação · R$ e quantidade por etapa${f.buId >= 0 ? ' · clientes com saldo na BU' : ''}`}
            etapas={funil.juridico.etapas}
            rodape={(
              <>
                <Numeros itens={[
                  ...funil.juridico.etapas.filter((e) => !e.noGrafico).map((e) => ({ rotulo: e.rotulo, valor: moedaCurta(e.valor) })),
                  ...(acordos ? [{ rotulo: 'Acordos aguardando aprovação', valor: `${rotuloNum(n(acordos.AGUARDANDO))} · ${moedaCurta(n(acordos.VALOR_AGUARDANDO))}` }] : []),
                ]} />
                <Status tone={funil.juridico.criticos ? 'alert' : funil.juridico.desvios ? 'attention' : 'off'}>
                  {plural(funil.juridico.desvios, 'desvio de prazo', 'desvios de prazo')} · {plural(funil.juridico.criticos, 'crítico', 'críticos')}
                </Status>
                {acordos ? <Nota>Acordos aguardando aprovação não somam no "a receber" (posição de hoje{f.buId >= 0 ? '; o filtro de BU não se aplica' : ''}).</Nota> : null}
              </>
            )}
          />
        )}
        {pubEstado || !funil.publico ? <AvisoDoBloco estado={pubEstado ?? { tipo: 'NAO_INSTALADO', texto: 'Módulo não instalado.' }} hint="Setor público" /> : (
          <Funil
            titulo="Setor público"
            hint={`Do empenho ao pagamento · R$ e notas por etapa${f.buId >= 0 ? ' · órgãos com saldo na BU' : ''}`}
            etapas={funil.publico.etapas}
            rodape={(
              <>
                <Numeros itens={funil.publico.etapas.filter((e) => !e.noGrafico).map((e) => ({ rotulo: e.rotulo, valor: moedaCurta(e.valor) }))} />
                <Status tone={funil.publico.pagamentoVencido ? 'alert' : 'off'}>{plural(funil.publico.pagamentoVencido, 'nota com pagamento vencido', 'notas com pagamento vencido')}</Status>
              </>
            )}
          />
        )}
      </GradeGraficos>
      <LinhaUi entre>
        <Nota>Cada barra é uma etapa da carteira; a largura é o valor em relação à maior etapa do mesmo gráfico.</Nota>
        <LinhaUi>
          <Button size="sm" onClick={() => navigate('/juridico')}>Abrir Jurídico</Button>
          <Button size="sm" onClick={() => navigate('/publico/notas-fiscais')}>Abrir notas públicas</Button>
        </LinhaUi>
      </LinhaUi>
    </Secao>
  );
}

function Funil({ titulo, hint, etapas, rodape }: { titulo: string; hint: string; etapas: Etapa[]; rodape: ReactNode }) {
  const dados = etapas.filter((e) => e.noGrafico).map((e) => ({
    rotulo: e.rotulo, valor: e.valor, texto: `${e.quantidade === null ? '' : `${rotuloNum(e.quantidade)} · `}${moedaCurta(e.valor)}`,
  }));
  return (
    <GraficoOuTabela
      titulo={titulo}
      hint={hint}
      alturaLivre
      alinhado
      grafico={<BarrasEtapas rotulo={titulo} itens={dados} />}
      rodape={rodape}
      tabela={(
        <Table>
          <thead><tr><Th>Etapa</Th><Th numeric>Quantidade</Th><Th numeric>Valor</Th></tr></thead>
          <tbody>
            {etapas.map((e) => (
              <Tr key={e.chave}>
                <Td>{e.rotulo}</Td>
                <Td numeric>{e.quantidade === null ? <Dash /> : rotuloNum(e.quantidade)}</Td>
                <Td numeric>{moedaInteira(e.valor)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    />
  );
}
