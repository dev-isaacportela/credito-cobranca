/**
 * /admin/parametros — opção `adm-parametros` A "Grupo em grade" (telas-06-adm-politica.html), com as
 * colunas de D-05: Padrão do catálogo · Valor (Privada, a linha padrão) · Estética · Pública. "Salvar
 * grupo" manda só o que mudou, em lotes de 20; Valor vazio restaura o padrão, carteira vazia volta a
 * herdar. Motivos da recusa no topo do grupo; histórico de vigências por parâmetro (C-015 a C-018).
 */
import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData, fmtDataHora } from '@/lib/formato';
import { GRUPOS_PARAMETRO, formatarParametro } from '@/lib/base/parametros';
import { podeAdministrar } from '@/lib/base/menu';
import { celula, emLotes, itensParaSalvar, type CarteiraParametro } from '@/lib/base/telas';
import {
  Alert, Badge, Button, CampoBusca, CorpoPainel, Dash, Dialog, DialogBody, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, EmptyState, Faixa, Field, Grade, IconButton, Input, InputCurto, Item, LabelledField,
  Linha as LinhaUi, ListaItens, MetaDot, Nota, PageHeader, Panel, PanelHeader, Pilha, Resto, RowMeta, RowTitle,
  SearchInput, SelectMenu, Stat, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';
import { CARTEIRA_NOME, motivo, useDados, useMembro } from '../comum';

type Linha = Record<string, unknown>;
const COLUNAS: { carteira: CarteiraParametro; rotulo: string }[] = [
  { carteira: '', rotulo: 'Valor' },
  { carteira: 'ESTETICA', rotulo: 'Estética' },
  { carteira: 'PUBLICA', rotulo: 'Pública' },
];
const TEXTUAIS = ['TEXTO', 'LISTA', 'RATING'];
const semAcento = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Parametros() {
  const membro = useMembro();
  const pode = podeAdministrar(membro);
  const [grupo, setGrupo] = useState('base');
  const [texto, setTexto] = useState('');
  const [editados, setEditados] = useState<Record<string, string>>({});
  const [vigencia, setVigencia] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error' | 'info'; texto: string; motivos?: string[] } | null>(null);
  const [historico, setHistorico] = useState<Linha | null>(null);

  // Duas leituras ao abrir: a da Estética e a da Pública trazem, cada uma, o padrão e o valor próprio da carteira.
  const dados = useDados(async (): Promise<Linha[]> => {
    const [est, pub] = await Promise.all([
      linhas('ccBaseParametroListar', { data: '', carteira: 'ESTETICA', grupo: '' }),
      linhas('ccBaseParametroListar', { data: '', carteira: 'PUBLICA', grupo: '' }),
    ]);
    const daPublica = new Map(pub.map((p) => [String(p.CHAVE), p]));
    return est.map((p) => ({ ...p, VALOR_ESTETICA: p.VALOR_CARTEIRA, VALOR_PUBLICA: daPublica.get(String(p.CHAVE))?.VALOR_CARTEIRA ?? null }));
  }, 'parametros');

  const todos = dados.dados ?? [];
  const original = (p: Linha, carteira: CarteiraParametro) =>
    String((carteira === '' ? p.VALOR_PADRAO : carteira === 'ESTETICA' ? p.VALOR_ESTETICA : p.VALOR_PUBLICA) ?? '');
  const originais = Object.fromEntries(todos.flatMap((p) => COLUNAS.map(({ carteira }) => [celula(String(p.CHAVE), carteira), original(p, carteira)])));
  const busca = semAcento(texto.trim());
  const casa = (p: Linha) => !busca || semAcento(`${p.ROTULO} ${p.CHAVE} ${p.DESCRICAO}`).includes(busca);
  const doGrupo = (g: string) => todos.filter((p) => p.GRUPO === g);
  const grupos = GRUPOS_PARAMETRO.filter((g) => doGrupo(g.codigo).some(casa));
  const linhasDoGrupo = doGrupo(grupo).filter(casa);
  const mudancas = itensParaSalvar(originais, editados, vigencia);
  const grupoDe = new Map(todos.map((p) => [String(p.CHAVE), String(p.GRUPO)]));
  const mudancasDe = (g: string) => mudancas.filter((m) => grupoDe.get(m.chave) === g).length;
  const comVigencia = doGrupo(grupo).some((p) => Number(p.COM_VIGENCIA));
  const nomeGrupo = GRUPOS_PARAMETRO.find((g) => g.codigo === grupo)?.nome ?? grupo;
  const foraDoPadrao = todos.filter((p) => String(p.VALOR_PADRAO ?? '') !== String(p.PADRAO ?? '')).length;

  const valor = (p: Linha, carteira: CarteiraParametro) => editados[celula(String(p.CHAVE), carteira)] ?? original(p, carteira);
  const editar = (p: Linha, carteira: CarteiraParametro, v: string) => setEditados((e) => ({ ...e, [celula(String(p.CHAVE), carteira)]: v }));

  function restaurarGrupo() {
    setEditados((e) => ({ ...e, ...Object.fromEntries(doGrupo(grupo).map((p) => [celula(String(p.CHAVE), ''), ''])) }));
    setAviso({ tom: 'info', texto: `A coluna Valor de "${nomeGrupo}" voltou ao padrão na grade. Salve o grupo para gravar.` });
  }

  async function salvar() {
    // A data vale só para parâmetro com vigência; o resto vale a partir de hoje ('' = hoje no servidor).
    const temVigencia = new Set(doGrupo(grupo).filter((p) => Number(p.COM_VIGENCIA)).map((p) => String(p.CHAVE)));
    const doGrupoAtual = mudancas
      .filter((m) => grupoDe.get(m.chave) === grupo)
      .map((m) => ({ ...m, vigenciaInicio: temVigencia.has(m.chave) ? vigencia : '' }));
    setOcupado(true);
    setAviso(null);
    let gravados = 0;
    for (const lote of emLotes(doGrupoAtual, 20)) {
      try {
        const r = await acao('ccBaseParametroSalvar', { itens: JSON.stringify(lote) });
        if (r.ok === false) {
          setOcupado(false);
          const parcial = gravados ? ` ${gravados} já tinham sido gravados antes deste lote.` : ' Nada foi gravado.';
          return setAviso({ tom: 'error', texto: `${motivo(r)}${parcial}`, motivos: Array.isArray(r.faltam) && r.faltam.length > 1 ? r.faltam : undefined });
        }
        gravados += lote.length;
      } catch (e) {
        setOcupado(false);
        return setAviso({ tom: 'error', texto: motivo(e) });
      }
    }
    setOcupado(false);
    setEditados((e) => Object.fromEntries(Object.entries(e).filter(([k]) => grupoDe.get(k.split('@')[0]) !== grupo)));
    setAviso({ tom: 'success', texto: `"${nomeGrupo}": ${gravados} ${gravados === 1 ? 'valor gravado' : 'valores gravados'}${vigencia ? `, a partir de ${fmtData(vigencia)}` : ''}.` });
    dados.reler();
  }

  const campo = (p: Linha, carteira: CarteiraParametro) => {
    if (carteira && !Number(p.POR_CARTEIRA)) return <Dash />;
    const v = valor(p, carteira);
    const rotulo = `${p.ROTULO} · ${carteira ? CARTEIRA_NOME[carteira] : 'valor'}`;
    const vazio = carteira ? 'usa o Valor' : 'padrão';
    if (p.TIPO === 'OPCAO') {
      const opcoes = String(p.OPCOES ?? '').split(',').filter(Boolean).map((o) => ({ value: o, label: o }));
      return <SelectMenu label={rotulo} value={v} onChange={(x) => editar(p, carteira, x)} options={[{ value: '', label: vazio }, ...opcoes]} disabled={!pode} />;
    }
    if (p.TIPO === 'DATA') return <Input type="date" aria-label={rotulo} value={v.slice(0, 10)} onChange={(e) => editar(p, carteira, e.target.value)} disabled={!pode} />;
    if (TEXTUAIS.includes(String(p.TIPO))) return <Input aria-label={rotulo} value={v} placeholder={vazio} onChange={(e) => editar(p, carteira, e.target.value)} disabled={!pode} />;
    return <InputCurto inputMode="decimal" aria-label={rotulo} value={v} placeholder={vazio} onChange={(e) => editar(p, carteira, e.target.value)} disabled={!pode} />;
  };

  return (
    <>
      <PageHeader
        module="Administração"
        title="Parâmetros da política"
        description="Todo número da Política num só lugar, com o padrão, quem mudou e quando. Estética ou Pública vazia usa o Valor."
        meta={dados.dados ? (
          <>
            <span><Stat>{todos.length}</Stat> parâmetros</span><MetaDot />
            <span><Stat>{GRUPOS_PARAMETRO.filter((g) => doGrupo(g.codigo).length).length}</Stat> grupos</span><MetaDot />
            <span><Stat>{foraDoPadrao}</Stat> fora do padrão</span>
          </>
        ) : undefined}
      />
      <Pilha>
        {!pode ? <Alert tone="info">Somente Gerente, Diretoria ou Administrador altera parâmetros.</Alert> : null}
        {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
        <Grade colunas="estreita">
          <Panel>
            <Toolbar>
              <CampoBusca><SearchInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar parâmetro" aria-label="Buscar parâmetro" /></CampoBusca>
            </Toolbar>
            <ListaItens>
              {grupos.map((g) => (
                <Item key={g.codigo} ativo={g.codigo === grupo} onClick={() => setGrupo(g.codigo)}>
                  <Resto>{g.nome}</Resto>
                  {mudancasDe(g.codigo) ? <Badge tone="accent">{mudancasDe(g.codigo)} alterado{mudancasDe(g.codigo) > 1 ? 's' : ''}</Badge> : null}
                  <RowMeta>{doGrupo(g.codigo).length}</RowMeta>
                </Item>
              ))}
            </ListaItens>
          </Panel>
          <Panel>
            <PanelHeader title={nomeGrupo} hint={`${doGrupo(grupo).length} parâmetros${comVigencia ? ' · com vigência' : ' · valem a partir de hoje'}`}>
              <Button onClick={restaurarGrupo} disabled={!pode || ocupado}>Restaurar padrão do grupo</Button>
              <Button variant="primary" onClick={salvar} disabled={!pode || ocupado || !mudancasDe(grupo)}>Salvar grupo</Button>
            </PanelHeader>
            <Faixa>
              <LabelledField label="Vale a partir de" hint={comVigencia ? 'Vazio = hoje. Não pode ser antes de hoje.' : 'Este grupo não tem vigência: vale a partir de hoje.'}>
                <Input type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} disabled={!pode || !comVigencia} />
              </LabelledField>
            </Faixa>
            {aviso ? (
              <CorpoPainel>
                <Alert tone={aviso.tom}>
                  {aviso.texto}
                  {aviso.motivos ? <> Todos os motivos: {aviso.motivos.join(' · ')}</> : null}
                </Alert>
              </CorpoPainel>
            ) : null}
            {linhasDoGrupo.length === 0 ? (
              <EmptyState title={dados.carregando ? 'Carregando os parâmetros…' : 'Nenhum parâmetro com essa busca neste grupo.'} />
            ) : (
              <Table>
                <thead><tr><Th>Parâmetro</Th><Th numeric>Padrão</Th>{COLUNAS.map((c) => <Th key={c.rotulo} numeric>{c.rotulo}</Th>)}<Th /></tr></thead>
                <tbody>
                  {linhasDoGrupo.map((p) => (
                    <Tr key={String(p.CHAVE)}>
                      <Td>
                        <RowTitle>{String(p.ROTULO)}</RowTitle>
                        <RowMeta>
                          {[p.DESCRICAO, p.USADO_POR ? `usado por ${p.USADO_POR}` : ''].filter(Boolean).join(' · ')}
                          {Number(p.COM_VIGENCIA) && String(p.VIGENCIA_INICIO ?? '') > '2000-01-01' ? ` · vale desde ${fmtData(String(p.VIGENCIA_INICIO))}` : ''}
                        </RowMeta>
                      </Td>
                      <Td numeric>{formatarParametro(p, p.PADRAO) || <Dash />}</Td>
                      {COLUNAS.map((c) => <Td key={c.rotulo} numeric>{campo(p, c.carteira)}</Td>)}
                      <Td numeric>
                        <LinhaUi>
                          <IconButton label={`Restaurar o padrão de ${p.ROTULO}`} onClick={() => editar(p, '', '')} disabled={!pode}><RotateCcw /></IconButton>
                          <IconButton label={`Histórico de vigências de ${p.ROTULO}`} onClick={() => setHistorico(p)}><History /></IconButton>
                        </LinhaUi>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Faixa embaixo><Nota>Valor vazio volta ao padrão do catálogo; Estética ou Pública vazia volta a usar o Valor. A gravação que quebra uma regra é recusada inteira.</Nota></Faixa>
          </Panel>
        </Grade>
      </Pilha>
      {historico ? <Historico parametro={historico} onFechar={() => setHistorico(null)} /> : null}
    </>
  );
}

function Historico({ parametro, onFechar }: { parametro: Linha; onFechar: () => void }) {
  const [carteira, setCarteira] = useState('');
  const dados = useDados(() => linhas('ccBaseParametroHistorico', { chave: String(parametro.CHAVE), carteira }), carteira);
  const lista = dados.dados ?? [];
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de vigências</DialogTitle>
          <DialogDescription>{String(parametro.ROTULO)} · {String(parametro.CHAVE)}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {Number(parametro.POR_CARTEIRA) ? (
              <Field label="Carteira">
                <SelectMenu label="Carteira" value={carteira} onChange={setCarteira} options={[{ value: '', label: 'Valor (Privada e padrão)' }, { value: 'ESTETICA', label: 'Estética' }, { value: 'PUBLICA', label: 'Pública' }]} />
              </Field>
            ) : null}
            {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
            {lista.length === 0 ? (
              <EmptyState title={dados.carregando ? 'Carregando…' : 'Nenhum valor gravado nesta carteira.'} hint={dados.carregando ? undefined : 'Sem valor próprio, a carteira usa o Valor.'} />
            ) : (
              <Table>
                <thead><tr><Th>Vale desde</Th><Th numeric>Valor</Th><Th>Gravado</Th></tr></thead>
                <tbody>
                  {lista.map((h, i) => (
                    <Tr key={i}>
                      <Td>{fmtData(String(h.VIGENCIA_INICIO))}</Td>
                      <Td numeric>{h.VALOR === null ? 'usa o Valor' : formatarParametro(parametro, h.VALOR) || <Dash />}</Td>
                      <Td>{h.ATUALIZADO_EM ? fmtDataHora(String(h.ATUALIZADO_EM)) : <Dash />}<RowMeta>{h.ATUALIZADO_POR_NOME ? String(h.ATUALIZADO_POR_NOME) : 'carga inicial'}</RowMeta></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Pilha>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
