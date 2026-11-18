/**
 * /admin/feriados — opção `adm-feriados` C "Por abrangência" (telas-06-adm-politica.html): conferidor
 * de dia útil no topo (roda na tela, `lib/base/dias-uteis.ts` com os feriados de ccBaseFeriadoListar) e
 * três colunas, nacionais (com "Gerar ano"), estaduais e municipais; incluir e remover (C-021).
 */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { acao, linha, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { podeAdministrar } from '@/lib/base/menu';
import { conferirDiaUtil, diaDaSemana, feriadosDaLocalidade } from '@/lib/base/telas';
import {
  Alert, Badge, Button, CorpoPainel, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, EmptyState, Faixa, Field, Grade, GradeCampos, IconButton, Input, Item,
  LabelledField, ListaItens, MetaDot, Nota, PageHeader, Panel, PanelHeader, Pilha, Resto, RowMeta, SelectMenu,
  Stat,
} from '@/components/page';
import { cidade, executar, useDados, useMembro } from '../comum';
import { Confirmar } from '../clientes/dialogos';

type Linha = Record<string, unknown>;
const ABRANGENCIAS = [
  { codigo: 'NACIONAL', titulo: 'Nacionais' },
  { codigo: 'UF', titulo: 'Estaduais' },
  { codigo: 'MUNICIPIO', titulo: 'Municipais' },
];
const curto = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)} · ${diaDaSemana(data).slice(0, 3)}`;

export default function Feriados() {
  const membro = useMembro();
  const pode = podeAdministrar(membro);
  const [ano, setAno] = useState(0);
  const [novo, setNovo] = useState(false);
  const [removendo, setRemovendo] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [data, setData] = useState('');
  const [n, setN] = useState('1');
  const [local, setLocal] = useState('');

  // O ano de hoje vem do servidor (ano 0 = ano de hoje, relógio único): o seletor parte dele.
  const base = useDados(async () => {
    const [atuais, uf, status] = await Promise.all([
      linhas('ccBaseFeriadoListar', { ano: 0 }),
      linhas('ccBaseParametroListar', { data: '', carteira: '', grupo: 'base' }),
      linha('ccBaseSincronizacaoStatus').catch(() => null),
    ]);
    const calendarioUf = String(uf.find((p) => p.CHAVE === 'base.calendarioUf')?.VALOR_EFETIVO ?? 'DF');
    const ano = Number(String(atuais[0]?.DATA ?? status?.ULTIMA_OK_EM ?? status?.INICIO ?? '').slice(0, 4)) || 0;
    return { atuais, calendarioUf, ano };
  }, 'base');
  const anoDeHoje = base.dados?.ano ?? 0;
  const anoVisto = ano || anoDeHoje;
  const dados = useDados(async () => (ano ? linhas('ccBaseFeriadoListar', { ano }) : base.dados?.atuais ?? []), `${ano}|${base.carregando}`);
  const feriados = dados.dados ?? [];
  const calendarioUf = base.dados?.calendarioUf ?? '';

  const locais = [
    { value: '', label: `${calendarioUf || 'UF'} · calendário da empresa` },
    ...[...new Set(feriados.filter((f) => f.ABRANGENCIA !== 'NACIONAL').map((f) => `${f.UF}|${f.ABRANGENCIA === 'MUNICIPIO' ? f.MUNICIPIO : ''}`))]
      .filter((l) => l !== `${calendarioUf}|`)
      .map((l) => {
        const [uf, mun] = l.split('|');
        return { value: l, label: mun ? cidade(mun, uf) : uf };
      }),
  ];
  const [ufLocal, munLocal] = (local || `${calendarioUf}|`).split('|');
  const conferido = data ? conferirDiaUtil(data, Math.trunc(Number(n) || 0), feriadosDaLocalidade(feriados, ufLocal, munLocal)) : null;
  const anos = anoDeHoje ? [anoDeHoje - 1, anoDeHoje, anoDeHoje + 1] : [];
  const nacionais = feriados.filter((f) => f.ABRANGENCIA === 'NACIONAL').length;

  const feito = (texto: string) => {
    setNovo(false);
    setRemovendo(null);
    setAviso({ tom: 'success', texto });
    dados.reler();
  };

  async function gerar() {
    setAviso(null);
    const falha = await executar(async () => {
      const r = await acao('ccBaseFeriadoSalvar', { feriadoId: 0, data: '', nome: '', abrangencia: '', uf: '', municipio: '', remover: 0, gerarAno: Number(anoVisto) });
      if (r.ok !== false) feito(`Nacionais de ${anoVisto}: ${Number(r.inseridos ?? 0)} incluídos (os que já existiam ficaram como estavam).`);
      return r;
    });
    if (falha) setAviso({ tom: 'error', texto: falha });
  }

  return (
    <>
      <PageHeader
        module="Administração"
        title="Feriados"
        description="Dia útil não é sábado, domingo, feriado nacional, da UF nem do município do cliente."
        meta={dados.dados ? <><span><Stat>{feriados.length}</Stat> feriados em {anoVisto}</span><MetaDot /><span>calendário da empresa: <Stat>{calendarioUf}</Stat></span></> : undefined}
        actions={
          <>
            <SelectMenu label="Ano" value={String(anoVisto)} onChange={(v) => setAno(Number(v))} options={anos.map((a) => ({ value: String(a), label: String(a) }))} />
            <Button variant="primary" onClick={() => setNovo(true)} disabled={!pode}><Plus aria-hidden />Novo feriado</Button>
          </>
        }
      />
      <Pilha>
        {!pode ? <Alert tone="info">Somente Gerente, Diretoria ou Administrador altera feriados.</Alert> : null}
        {dados.erro ? <Alert tone="error">{dados.erro}</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        <Panel>
          <PanelHeader title="Conferir dia útil" hint={`Com os feriados de ${anoVisto} desta tela.`} />
          <CorpoPainel>
            <GradeCampos>
              <LabelledField label="A partir de"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></LabelledField>
              <LabelledField label="Dias úteis depois" hint="0 = o próprio dia, ou o próximo útil."><Input type="number" min={0} value={n} onChange={(e) => setN(e.target.value)} /></LabelledField>
              <Field label="Localidade"><SelectMenu label="Localidade" value={local} onChange={setLocal} options={locais} /></Field>
            </GradeCampos>
            {conferido ? (
              <Alert tone="success">
                {fmtData(conferido.resultado)}, {conferido.semana}.{conferido.pulados.length ? ` Pulou: ${conferido.pulados.join('; ')}.` : ''}
              </Alert>
            ) : <Nota>Informe a data para ver o dia útil.</Nota>}
          </CorpoPainel>
        </Panel>
        <Grade colunas={3}>
          {ABRANGENCIAS.map(({ codigo, titulo }) => {
            const lista = feriados.filter((f) => f.ABRANGENCIA === codigo);
            return (
              <Panel key={codigo}>
                <PanelHeader title={titulo}>
                  <Badge>{lista.length}</Badge>
                  {codigo === 'NACIONAL' ? <Button size="sm" onClick={gerar} disabled={!pode || !anoVisto}>Gerar {anoVisto || ''}</Button> : null}
                </PanelHeader>
                {lista.length === 0 ? (
                  <EmptyState title={dados.carregando ? 'Carregando…' : `Nenhum feriado ${titulo.toLowerCase().replace(/is$/, 'l')} em ${anoVisto}.`} hint={codigo === 'NACIONAL' && !dados.carregando ? 'Use "Gerar" para incluir os 13 nacionais do ano.' : undefined} />
                ) : (
                  <ListaItens>
                    {lista.map((f) => (
                      <Item key={String(f.ID)}>
                        <RowMeta>{curto(String(f.DATA))}</RowMeta>
                        <Resto>
                          {String(f.NOME)}
                          {codigo !== 'NACIONAL' ? <RowMeta>{codigo === 'MUNICIPIO' ? cidade(f.MUNICIPIO, f.UF) : String(f.UF)}</RowMeta> : null}
                        </Resto>
                        <IconButton label={`Remover ${f.NOME}`} tone="danger" onClick={() => setRemovendo(f)} disabled={!pode}><Trash2 /></IconButton>
                      </Item>
                    ))}
                  </ListaItens>
                )}
                {codigo === 'NACIONAL' && nacionais > 0 && nacionais < 13 ? <Faixa embaixo><Nota>Faltam nacionais neste ano: "Gerar" completa sem duplicar.</Nota></Faixa> : null}
              </Panel>
            );
          })}
        </Grade>
      </Pilha>
      {novo ? <DialogoFeriado calendarioUf={calendarioUf} onFechar={() => setNovo(false)} onSalvo={feito} /> : null}
      {removendo ? (
        <Confirmar
          titulo="Remover feriado"
          texto={`${fmtData(String(removendo.DATA))} · ${removendo.NOME} deixa de contar como dia não útil. A remoção fica na auditoria.`}
          rotulo="Remover"
          onFechar={() => setRemovendo(null)}
          onConfirmar={async () => {
            const falha = await executar(() => acao('ccBaseFeriadoSalvar', { feriadoId: Number(removendo.ID), data: '', nome: '', abrangencia: '', uf: '', municipio: '', remover: 1, gerarAno: 0 }));
            if (!falha) feito(`${removendo.NOME} removido.`);
            return falha;
          }}
        />
      ) : null}
    </>
  );
}

function DialogoFeriado({ calendarioUf, onFechar, onSalvo }: { calendarioUf: string; onFechar: () => void; onSalvo: (t: string) => void }) {
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [abrangencia, setAbrangencia] = useState('UF');
  const [uf, setUf] = useState(calendarioUf);
  const [municipio, setMunicipio] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function salvar() {
    setOcupado(true);
    const falha = await executar(() => acao('ccBaseFeriadoSalvar', { feriadoId: 0, data, nome: nome.trim(), abrangencia, uf: uf.trim(), municipio: municipio.trim(), remover: 0, gerarAno: 0 }));
    setOcupado(false);
    if (falha) return setErro(falha);
    onSalvo(`${nome.trim()} (${fmtData(data)}) incluído.`);
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo feriado</DialogTitle>
          <DialogDescription>Vale para quem é da localidade: nacional para todos, estadual para a UF, municipal para o município.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <LabelledField label="Data" obrigatorio><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></LabelledField>
            <LabelledField label="Nome" obrigatorio><Input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} /></LabelledField>
            <Field label="Abrangência" obrigatorio>
              <SelectMenu label="Abrangência" value={abrangencia} onChange={setAbrangencia} options={[{ value: 'NACIONAL', label: 'Nacional' }, { value: 'UF', label: 'Estadual (UF)' }, { value: 'MUNICIPIO', label: 'Municipal' }]} />
            </Field>
            {abrangencia !== 'NACIONAL' ? (
              <LabelledField label="UF" obrigatorio><Input value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} /></LabelledField>
            ) : null}
            {abrangencia === 'MUNICIPIO' ? (
              <LabelledField label="Município" obrigatorio hint="Como no cadastro do cliente no Winthor."><Input value={municipio} maxLength={80} onChange={(e) => setMunicipio(e.target.value)} /></LabelledField>
            ) : null}
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={ocupado || !data || !nome.trim()}>Incluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
