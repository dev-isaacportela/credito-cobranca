// /publico/regras-ente — Regras de pagamento por ente (regras-ente B, "Cartões por ente", T-208): um cartão por regra
// com o prazo em destaque, a base legal por extenso, o link e "Marcar como Verificado"; nova regra, editar,
// inativar; cartão do pequeno valor. O "Em uso" do mockup não tem leitura no contrato (plan): não é construído.
// Abrir = regras + parâmetro do pequeno valor + total de NFs com regra a confirmar (3 leituras).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { podeAdministrar } from '@/lib/base/menu';
import {
  Alert, Button, Card, CardTitle, Dash, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Ficha, Field, Grade, Input, ItemFicha, LabelledField, Linha as LinhaUi, MetaDot,
  NumeroGrande, PageHeader, Pilha, RowMeta, RowTitle, SelectMenu, Stat, Status, Textarea, TextLink,
} from '@/components/page';
import { ESFERA } from '@/lib/setor-publico/formato';
import { brl, executar, n, NF_FILTRO, pl, useDados, useMembro, type Linha } from './dados';

const ESFERAS = [{ value: '', label: 'Sem esfera (qualquer)' }, { value: 'FEDERAL', label: 'Federal' }, { value: 'ESTADUAL', label: 'Estadual' }, { value: 'MUNICIPAL', label: 'Municipal' }];
const CONTAGENS = [{ value: 'UTEIS', label: 'Dias úteis' }, { value: 'CORRIDOS', label: 'Dias corridos' }];
type Form = { regraId: number; nome: string; esfera: string; uf: string; liqDias: string; pagDias: string; contagem: string; baseLegal: string; link: string };

export default function RegrasEntePage() {
  const membro = useMembro();
  const navigate = useNavigate();
  const podeEditar = membro.nivel >= 2 || membro.admin;
  const podeValidar = membro.cargo === 'JURIDICO' || membro.nivel >= 3 || membro.admin;
  const [form, setForm] = useState<Form | null>(null);
  const [validando, setValidando] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);

  const d = useDados(async () => {
    const [regras, pub, total] = await Promise.all([
      linhas('ccPubRegraEnteListar', { ativo: -1 }),
      linhas('ccBaseParametroListar', { grupo: 'pub', carteira: '', data: '' }),
      linhas('ccPubNfTotal', NF_FILTRO),
    ]);
    return { regras, pv: pub.find((p) => p.CHAVE === 'pub.pequenoValor') as Linha | undefined, total: total[0] ?? {} };
  }, 'regras');
  const regras = d.dados?.regras ?? [];
  const ativas = regras.filter((r) => Number(r.ATIVO) === 1);
  const aConfirmar = ativas.filter((r) => r.SITUACAO !== 'VERIFICADO');

  async function gravar(input: Record<string, unknown>, sucesso: string) {
    const r = await executar('ccPubRegraEnteSalvar', input);
    if (r.erro) return r.erro;
    setAviso({ tom: 'success', texto: sucesso });
    d.recarregar();
    return '';
  }
  const inativar = async (r: Linha) => {
    const e = await gravar({ ...entradaDe(r), regraId: Number(r.ID), ativo: Number(r.ATIVO) === 1 ? 0 : 1, validar: 0 },
      Number(r.ATIVO) === 1 ? `Regra "${r.NOME}" inativada: não é mais escolhida para as notas.` : `Regra "${r.NOME}" reativada.`);
    if (e) setAviso({ tom: 'error', texto: e });
  };

  return (
    <>
      <PageHeader
        module="Setor público"
        title="Regras de pagamento por ente"
        description="Prazos legais de liquidação e de pagamento usados no cálculo de cada nota. O prazo do contrato, quando informado, prevalece."
        meta={d.dados ? (
          <>
            <span><Stat>{ativas.length}</Stat> {pl(ativas.length, 'regra ativa', 'regras ativas')}</span><MetaDot />
            <span><Stat>{ativas.length - aConfirmar.length}</Stat> {pl(ativas.length - aConfirmar.length, 'verificada', 'verificadas')}</span><MetaDot />
            <span><Stat>{aConfirmar.length}</Stat> a confirmar</span><MetaDot />
            <span><Stat>{n(d.dados.total.REGRA_A_CONFIRMAR)}</Stat> {pl(d.dados.total.REGRA_A_CONFIRMAR, 'nota em aberto calculada', 'notas em aberto calculadas')} com regra a confirmar</span>
          </>
        ) : undefined}
        actions={
          <Button variant="primary" disabled={!podeEditar} title={podeEditar ? undefined : 'Somente Supervisor ou acima cadastra regra por ente.'}
            onClick={() => setForm({ regraId: 0, nome: '', esfera: '', uf: '', liqDias: '10', pagDias: '10', contagem: 'UTEIS', baseLegal: '', link: '' })}>
            <Plus aria-hidden />Nova regra
          </Button>
        }
      />
      <Pilha>
        {d.erro ? <Alert tone="error">{d.erro}</Alert> : null}
        {aviso ? <Alert tone={aviso.tom}>{aviso.texto}</Alert> : null}
        {aConfirmar.length ? (
          <Alert tone="warn">
            {aConfirmar.length === 1 ? 'Uma regra ainda está' : `${aConfirmar.length} regras ainda estão`} a confirmar. A nota e a análise que usam essas regras mostram o aviso.
            Só Gerente, Diretoria, Jurídico ou Administrador marca como Verificado, e só com o link da norma. Mudar prazo, contagem, esfera ou UF devolve a regra para A confirmar.
          </Alert>
        ) : null}
        <Grade colunas={3}>
          {regras.map((r) => {
            const ativa = Number(r.ATIVO) === 1;
            const verificada = r.SITUACAO === 'VERIFICADO';
            return (
              <Card key={r.ID}>
                <LinhaUi entre>
                  <CardTitle>{r.NOME}</CardTitle>
                  {!ativa ? <Status tone="off">Inativa</Status> : verificada ? <Status tone="live">Verificado</Status> : <Status tone="attention">A confirmar</Status>}
                </LinhaUi>
                <NumeroGrande dica={`dias ${r.CONTAGEM === 'CORRIDOS' ? 'corridos' : 'úteis'} · liquidar + pagar`}>{`${n(r.LIQ_DIAS)} + ${n(r.PAG_DIAS)}`}</NumeroGrande>
                <Ficha>
                  <ItemFicha rotulo="Esfera · UF">{[ESFERA[r.ESFERA] ?? 'Qualquer esfera', r.UF].filter(Boolean).join(' · ')}</ItemFicha>
                </Ficha>
                <div>
                  <RowMeta>Base legal</RowMeta>
                  <RowTitle>{r.BASE_LEGAL || <Dash />}</RowTitle>
                  {r.LINK ? <RowMeta><a href={String(r.LINK)} target="_blank" rel="noreferrer">{String(r.LINK)}</a></RowMeta> : <RowMeta>sem link da norma</RowMeta>}
                </div>
                {verificada && r.VALIDADO_EM ? <RowMeta>Validado por {r.VALIDADO_POR_NOME || 'alguém da equipe'} em {fmtData(r.VALIDADO_EM)}</RowMeta> : null}
                <LinhaUi>
                  {!verificada && ativa ? (
                    <Button size="sm" disabled={!podeValidar} onClick={() => setValidando(r)}
                      title={podeValidar ? 'Exige o link da norma.' : 'A validação cabe a Gerente, Diretoria, Jurídico ou Administrador.'}>Marcar como Verificado</Button>
                  ) : null}
                  <Button size="sm" disabled={!podeEditar} title={podeEditar ? undefined : 'Somente Supervisor ou acima edita.'}
                    onClick={() => setForm({ regraId: Number(r.ID), ...textoDe(r) })}>Editar</Button>
                  <Button size="sm" variant="ghost" disabled={!podeEditar} title={podeEditar ? undefined : 'Somente Supervisor ou acima inativa.'}
                    onClick={() => inativar(r)}>{ativa ? 'Inativar' : 'Reativar'}</Button>
                </LinhaUi>
              </Card>
            );
          })}
          <Card>
            <RowMeta>Contratação de pequeno valor</RowMeta>
            <RowTitle>Até {d.dados?.pv ? brl(d.dados.pv.VALOR_EFETIVO) : <Dash />} · prazos pela metade nas regras em dias úteis</RowTitle>
            <RowMeta>
              Lei 14.133/2021, art. 75, II{d.dados?.pv?.VIGENCIA_INICIO ? `, vigente desde ${fmtData(d.dados.pv.VIGENCIA_INICIO)}` : ''}. A Gerência Financeira atualiza todo janeiro;
              vale o limite em vigor na emissão da nota.
            </RowMeta>
            <LinhaUi>
              <TextLink onClick={() => navigate('/admin/parametros')} disabled={!podeAdministrar(membro)}
                title={podeAdministrar(membro) ? 'Abre os parâmetros do grupo do setor público.' : 'Só quem administra altera parâmetros.'}>Atualizar o limite</TextLink>
            </LinhaUi>
          </Card>
        </Grade>
        {!regras.length && !d.carregando ? <Alert tone="info">Nenhuma regra cadastrada: as notas usam a referência federal de 10 + 10 dias úteis.</Alert> : null}
      </Pilha>
      {form ? <DialogoRegra form={form} onFechar={() => setForm(null)} gravar={gravar} /> : null}
      {validando ? <DialogoValidar regra={validando} onFechar={() => setValidando(null)} gravar={gravar} /> : null}
    </>
  );
}

const textoDe = (r: Linha) => ({
  nome: String(r.NOME ?? ''), esfera: String(r.ESFERA ?? ''), uf: String(r.UF ?? ''), liqDias: String(r.LIQ_DIAS ?? ''), pagDias: String(r.PAG_DIAS ?? ''),
  contagem: String(r.CONTAGEM || 'UTEIS'), baseLegal: String(r.BASE_LEGAL ?? ''), link: String(r.LINK ?? ''),
});
const entradaDe = (r: Linha) => {
  const t = textoDe(r);
  return { ...t, liqDias: Number(t.liqDias) || 0, pagDias: Number(t.pagDias) || 0 };
};

type Gravar = (input: Record<string, unknown>, sucesso: string) => Promise<string>;

function DialogoRegra({ form, onFechar, gravar }: { form: Form; onFechar: () => void; gravar: Gravar }) {
  const [f, setF] = useState(form);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const mudar = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v });
  const salvar = async () => {
    setGravando(true);
    const e = await gravar({ ...f, uf: f.uf.trim().toUpperCase(), liqDias: Number(f.liqDias) || 0, pagDias: Number(f.pagDias) || 0, ativo: 1, validar: 0 },
      f.regraId ? `Regra "${f.nome}" salva.` : `Regra "${f.nome}" cadastrada a confirmar.`);
    setGravando(false);
    if (e) return setErro(e);
    onFechar();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f.regraId ? 'Editar regra' : 'Nova regra'}</DialogTitle>
          <DialogDescription>Mudar prazo, contagem, esfera ou UF de uma regra verificada a devolve para A confirmar. As notas são recalculadas na próxima rodada.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <LabelledField label="Nome" obrigatorio><Input value={f.nome} maxLength={120} onChange={(e) => mudar('nome')(e.target.value)} /></LabelledField>
            <Grade colunas={2}>
              <Field label="Esfera"><SelectMenu label="Esfera" value={f.esfera} onChange={mudar('esfera')} options={ESFERAS} /></Field>
              <LabelledField label="UF" hint="Vazio = todas"><Input value={f.uf} maxLength={2} onChange={(e) => mudar('uf')(e.target.value)} /></LabelledField>
              <LabelledField label="Liquidar em (dias)" obrigatorio><Input type="number" min={1} value={f.liqDias} onChange={(e) => mudar('liqDias')(e.target.value)} /></LabelledField>
              <LabelledField label="Pagar em (dias)" obrigatorio><Input type="number" min={1} value={f.pagDias} onChange={(e) => mudar('pagDias')(e.target.value)} /></LabelledField>
              <Field label="Contagem"><SelectMenu label="Contagem" value={f.contagem} onChange={mudar('contagem')} options={CONTAGENS} /></Field>
              <LabelledField label="Link da norma" hint="https://…"><Input value={f.link} maxLength={500} onChange={(e) => mudar('link')(e.target.value)} /></LabelledField>
            </Grade>
            <LabelledField label="Base legal"><Textarea rows={3} maxLength={300} value={f.baseLegal} onChange={(e) => mudar('baseLegal')(e.target.value)} /></LabelledField>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={gravando || !f.nome.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoValidar({ regra, onFechar, gravar }: { regra: Linha; onFechar: () => void; gravar: Gravar }) {
  const [link, setLink] = useState(String(regra.LINK ?? ''));
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const validar = async () => {
    setGravando(true);
    const e = await gravar({ ...entradaDe(regra), regraId: Number(regra.ID), link: link.trim(), ativo: 1, validar: 1 }, `Regra "${regra.NOME}" marcada como Verificado.`);
    setGravando(false);
    if (e) return setErro(e);
    onFechar();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar "{String(regra.NOME)}" como Verificado</DialogTitle>
          <DialogDescription>Fica registrado quem validou e quando. A validação exige o link da norma.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <LabelledField label="Link da norma" obrigatorio hint="Endereço público da lei, decreto ou instrução (https://…)">
              <Input value={link} maxLength={500} onChange={(e) => setLink(e.target.value)} />
            </LabelledField>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={validar} disabled={gravando}>Marcar como Verificado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
