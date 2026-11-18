// Aba Alertas de desvios (T-219, opção A "Lista por severidade"): fichas por tipo com a contagem, tabela com
// severidade, desvio, cliente, detalhe e o que fazer; "Abrir processo" ou, para cliente sem dossiê, "Abrir dossiê"
// (ccJurDossieAbrir com a carteira do alerta — a pública abre o dossiê de 13 documentos).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acao } from '@/lib/mitra-api';
import {
  Alert, Button, EmptyState, Field, Linha as Junto, MetaDot, PageHeader, Panel, SelectMenu, Stat, Status, Table,
  Td, Th, Toolbar, Tr,
} from '@/components/page';
import { CARTEIRA_NOME, DESVIOS, erroDe, FILTRO_GESTAO, num, OPCOES_CARTEIRA, useDados, type Linha, type PropsAba } from './comum';

const SEVERIDADES = [{ value: '', label: 'Todas as severidades' }, { value: 'critico', label: 'Crítico' }, { value: 'atencao', label: 'Atenção' }];

export default function AlertasAba({ membro, abas }: PropsAba) {
  const navigate = useNavigate();
  const [carteira, setCarteira] = useState('');
  const [severidade, setSeveridade] = useState('');
  const [tipo, setTipo] = useState('');
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(0);
  const r = useDados(() => acao('ccJurAlertas', { ...FILTRO_GESTAO, carteira, tipo: '' }), carteira);
  const todas: Linha[] = r.dados?.ok ? r.dados.linhas ?? [] : [];
  const daSeveridade = todas.filter((l) => !severidade || l.gravidade === severidade);
  const lista = daSeveridade.filter((l) => !tipo || l.tipo === tipo);
  const conta = (t: string) => daSeveridade.filter((l) => l.tipo === t).length;
  // O Jurídico não monta dossiê (quem monta é a cobrança): o botão desabilita com o motivo.
  const montaDossie = membro.cargo !== 'JURIDICO';

  async function abrirDossie(a: Linha) {
    setErro('');
    setAbrindo(a.clienteId);
    try {
      const d = await acao('ccJurDossieAbrir', { clienteId: num(a.clienteId), carteira: a.carteira });
      if (d.ok === false) return setErro(String(d.error));
      navigate(`/juridico/dossie/${d.processoId}`);
    } catch (e) {
      setErro(erroDe(e));
    } finally {
      setAbrindo(0);
    }
  }

  return (
    <>
      <PageHeader module="Jurídico" title="Alertas de desvios" description="Calculados na hora a partir dos processos e da cobrança."
        meta={<><Stat>{todas.length}</Stat> alertas<MetaDot /><Stat>{num(r.dados?.criticos)}</Stat> críticos<MetaDot />
          <Stat>{todas.length - num(r.dados?.criticos)}</Stat> de atenção</>} />
      {abas}
      {r.erro || (r.dados && !r.dados.ok) ? <Alert tone="error">{r.erro || String(r.dados?.error)}</Alert> : null}
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Panel>
        <Toolbar>
          <Field label="Severidade"><SelectMenu label="Severidade" value={severidade} options={SEVERIDADES} onChange={setSeveridade} /></Field>
          <Field label="Carteira"><SelectMenu label="Carteira" value={carteira} options={OPCOES_CARTEIRA} onChange={setCarteira} /></Field>
        </Toolbar>
        <Toolbar>
          <Junto>
            <Button size="sm" variant={tipo ? 'secondary' : 'primary'} aria-pressed={!tipo} onClick={() => setTipo('')}>{`Todos ${daSeveridade.length}`}</Button>
            {DESVIOS.map((d) => (
              <Button key={d.tipo} size="sm" variant={tipo === d.tipo ? 'primary' : 'secondary'} aria-pressed={tipo === d.tipo}
                disabled={!conta(d.tipo)} onClick={() => setTipo(d.tipo)}>{`${d.curto} ${conta(d.tipo)}`}</Button>
            ))}
          </Junto>
        </Toolbar>
        {!lista.length ? <EmptyState title={r.carregando ? 'Carregando…' : 'Nenhum desvio com estes filtros.'} /> : (
          <Table>
            <thead><tr><Th>Severidade</Th><Th>Desvio</Th><Th>Cliente</Th><Th>Detalhe</Th><Th>O que fazer</Th><Th /></tr></thead>
            <tbody>
              {lista.map((a, i) => (
                <Tr key={`${a.tipo}:${a.processoId}:${a.clienteId}:${i}`}>
                  <Td><Status tone={a.gravidade === 'critico' ? 'alert' : 'attention'}>{a.gravidade === 'critico' ? 'Crítico' : 'Atenção'}</Status></Td>
                  <Td>{a.nome}</Td>
                  <Td>{a.cliente}{a.carteira ? ` · ${CARTEIRA_NOME[a.carteira] ?? a.carteira}` : ''}</Td>
                  <Td>{a.texto}</Td>
                  <Td>{a.acao}</Td>
                  <Td numeric>
                    {num(a.processoId) ? (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/juridico/processos/${a.processoId}`)}>Abrir processo</Button>
                    ) : (
                      <Button size="sm" disabled={!montaDossie || abrindo === a.clienteId} onClick={() => abrirDossie(a)}
                        title={montaDossie ? undefined : 'O dossiê é montado pela cobrança (agente, supervisor ou quem administra).'}>Abrir dossiê</Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
