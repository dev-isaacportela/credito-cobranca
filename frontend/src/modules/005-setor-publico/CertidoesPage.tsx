// /publico/certidoes — Certidões da empresa (certidoes B, "Cartões de prazo", T-210): um cartão por certidão vigente
// com os dias em destaque e a barra do prazo, do mais urgente ao mais folgado; os tipos sem certidão como "não
// cadastrada" (C-029); renovar guarda a anterior (histórico, PA-12). Arquivo pelo `enviarArquivo` da 001.
// Abrir = certidões (vigentes e anteriores) + total das NFs em aberto (2 leituras).

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { acao, linhas } from '@/lib/mitra-api';
import { fmtData } from '@/lib/formato';
import { enviarArquivo, validarArquivo } from '@/lib/base/arquivos';
import {
  Alert, Progresso, Button, Card, CardTitle, Dash, Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, Ficha, Field, Grade, Input, ItemFicha, LabelledField,
  Linha as LinhaUi, MetaDot, NumeroGrande, PageHeader, Pilha, RowMeta, SelectMenu, Stat, Status, Table, Td, Th,
  Tr,
} from '@/components/page';
import { diasAte, nomeCertidao, TIPOS_CERTIDAO, tiposSemCertidao } from '@/lib/setor-publico/formato';
import { brl, executar, hojeLocal, NF_FILTRO, pl, useDados, useMembro, type Linha } from './dados';

// ponytail: a barra mostra quanto de uma janela de 30 dias já passou; a situação (tom) é a do servidor.
const JANELA_DIAS = 30;
type Form = { certidaoId: number; tipo: string; cnpj: string; abrangencia: string; numero: string; emissao: string; validade: string };

export default function CertidoesPage() {
  const membro = useMembro();
  const pode = membro.nivel >= 2 || membro.admin;
  const [form, setForm] = useState<Form | null>(null);
  const [historico, setHistorico] = useState('');
  const [aviso, setAviso] = useState('');
  const hoje = hojeLocal();

  const d = useDados(async () => {
    const [certidoes, total] = await Promise.all([
      linhas('ccPubCertidaoListar', { situacao: '', todas: 1 }),
      linhas('ccPubNfTotal', NF_FILTRO),
    ]);
    return { certidoes, total: total[0] ?? {} };
  }, 'certidoes');
  const todas = d.dados?.certidoes ?? [];
  const vigentes = todas.filter((c) => Number(c.VIGENTE) === 1).sort((a, b) => String(a.VALIDADE).localeCompare(String(b.VALIDADE)));
  const faltam = tiposSemCertidao(vigentes);
  const conta = (s: string) => vigentes.filter((c) => c.SITUACAO === s).length;
  const vencidas = vigentes.filter((c) => c.SITUACAO === 'VENCIDA');
  const cnpjPadrao = String(vigentes[0]?.CNPJ ?? '');
  const chave = (c: Linha) => `${c.TIPO}|${c.CNPJ}|${c.ABRANGENCIA}`;
  const novo = (tipo: string, base?: Linha): Form => ({
    certidaoId: 0, tipo, cnpj: String(base?.CNPJ ?? cnpjPadrao), abrangencia: String(base?.ABRANGENCIA ?? ''), numero: '', emissao: '', validade: '',
  });
  const semPermissao = pode ? undefined : 'Somente Supervisor ou acima cadastra e renova certidão.';

  return (
    <>
      <PageHeader
        module="Setor público"
        title="Certidões da empresa"
        description="Certidões de regularidade da Benenutri que o órgão exige para pagar. O sistema guarda e avisa antes de vencer; a emissão é no site de cada órgão."
        meta={d.dados ? (
          <>
            <span><Stat>{conta('VENCIDA')}</Stat> {pl(conta('VENCIDA'), 'vencida', 'vencidas')}</span><MetaDot />
            <span><Stat>{conta('VENCENDO')}</Stat> {pl(conta('VENCENDO'), 'vence', 'vencem')} em breve</span><MetaDot />
            <span><Stat>{faltam.length}</Stat> {pl(faltam.length, 'não cadastrada', 'não cadastradas')}</span><MetaDot />
            <span><Stat>{conta('VALIDA')}</Stat> {pl(conta('VALIDA'), 'válida', 'válidas')}</span>
          </>
        ) : undefined}
        actions={<Button variant="primary" disabled={!pode} title={semPermissao} onClick={() => setForm(novo(faltam[0]?.tipo ?? 'CND_FEDERAL'))}><Plus aria-hidden />Cadastrar certidão</Button>}
      />
      <Pilha>
        {d.erro ? <Alert tone="error">{d.erro}</Alert> : null}
        {aviso ? <Alert tone="success">{aviso}</Alert> : null}
        {vencidas.map((c) => (
          <Alert key={c.ID} tone="error">
            {nomeCertidao(c.TIPO)}{c.ABRANGENCIA ? ` (${c.ABRANGENCIA})` : ''} vencida desde {fmtData(c.VALIDADE)}. Com certidão vencida o órgão pode reter o pagamento das notas em
            tramitação{d.dados?.total.VALOR ? ` (${brl(d.dados.total.VALOR)} em aberto)` : ''}.
          </Alert>
        ))}
        <Grade colunas={3}>
          {vigentes.map((c) => {
            const dias = diasAte(c.VALIDADE, hoje);
            const qtd = (d: number) => `${d} ${d === 1 ? 'dia' : 'dias'}`;
            const vencida = c.SITUACAO === 'VENCIDA';
            const tom = vencida ? 'alert' : c.SITUACAO === 'VENCENDO' ? 'attention' : 'live';
            const anteriores = todas.filter((x) => Number(x.VIGENTE) !== 1 && chave(x) === chave(c));
            return (
              <Card key={c.ID}>
                <LinhaUi entre>
                  <CardTitle>{nomeCertidao(c.TIPO)}</CardTitle>
                  <Status tone={tom}>
                    {vencida ? `Vencida${dias < 0 ? ` há ${qtd(-dias)}` : ''}` : c.SITUACAO === 'VENCENDO' ? (dias <= 0 ? 'Vence hoje' : `Vence em ${qtd(dias)}`) : `Válida · ${qtd(dias)}`}
                  </Status>
                </LinhaUi>
                <NumeroGrande dica={`${Math.abs(dias) === 1 ? 'dia' : 'dias'} de ${vencida ? 'vencida' : 'validade'}`}>{Math.abs(dias)}</NumeroGrande>
                <Progresso rotulo="Prazo da certidão já decorrido" tom={tom} valor={vencida ? 100 : (1 - dias / JANELA_DIAS) * 100} total={100} />
                <Ficha>
                  <ItemFicha rotulo="Abrangência">{c.ABRANGENCIA || (['CND_ESTADUAL', 'CND_MUNICIPAL'].includes(String(c.TIPO)) ? <Dash /> : 'Federal')}</ItemFicha>
                  <ItemFicha rotulo="Validade">{fmtData(c.VALIDADE)}</ItemFicha>
                  <ItemFicha rotulo="CNPJ">{c.CNPJ}</ItemFicha>
                  <ItemFicha rotulo="Arquivo">{c.ANEXO_URL ? <a href={String(c.ANEXO_URL)} target="_blank" rel="noreferrer">{String(c.ANEXO_NOME || 'abrir')}</a> : <Dash />}</ItemFicha>
                </Ficha>
                <LinhaUi>
                  <Button size="sm" disabled={!pode} title={semPermissao} onClick={() => setForm(novo(String(c.TIPO), c))}>Renovar</Button>
                  <Button size="sm" variant="ghost" disabled={!anteriores.length} title={anteriores.length ? undefined : 'Sem certidão anterior deste tipo.'}
                    onClick={() => setHistorico(historico === chave(c) ? '' : chave(c))}>Histórico</Button>
                </LinhaUi>
                {historico === chave(c) ? (
                  <Table>
                    <thead><tr><Th>Validade</Th><Th>Registrada por</Th></tr></thead>
                    <tbody>
                      {anteriores.map((x) => (
                        <Tr key={x.ID}><Td>{fmtData(x.VALIDADE)}</Td><Td>{x.REGISTRADO_POR_NOME || <Dash />}<RowMeta>{fmtData(x.REGISTRADO_EM)}</RowMeta></Td></Tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}
              </Card>
            );
          })}
          {d.dados ? faltam.map((t) => (
            <Card key={t.tipo}>
              <LinhaUi entre>
                <CardTitle>{t.nome}</CardTitle>
                <Status tone="off">Não cadastrada</Status>
              </LinhaUi>
              <NumeroGrande dica="sem certidão cadastrada"><Dash /></NumeroGrande>
              <LinhaUi><Button size="sm" disabled={!pode} title={semPermissao} onClick={() => setForm(novo(t.tipo))}>Cadastrar</Button></LinhaUi>
            </Card>
          )) : null}
        </Grade>
      </Pilha>
      {form ? (
        <DialogoCertidao form={form} onFechar={() => setForm(null)} onSalvo={(t) => { setAviso(t); setForm(null); d.recarregar(); }} />
      ) : null}
    </>
  );
}

function DialogoCertidao({ form, onFechar, onSalvo }: { form: Form; onFechar: () => void; onSalvo: (texto: string) => void }) {
  const [f, setF] = useState(form);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const mudar = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v });
  const recusaArquivo = arquivo ? validarArquivo({ nome: arquivo.name, tamanho: arquivo.size }) : null;

  // Três chamadas com arquivo: salvar → registrar o anexo → salvar de novo com o anexo (plan).
  async function salvar() {
    setGravando(true);
    setErro('');
    const r = await executar('ccPubCertidaoSalvar', { ...f, anexoId: 0 });
    if (r.erro) { setGravando(false); return setErro(r.erro); }
    const certidaoId = Number(r.certidaoId);
    if (arquivo) {
      try {
        const url = await enviarArquivo(arquivo);
        const a = await acao('ccBaseAnexoRegistrar', {
          entidade: 'CERTIDAO', entidadeId: certidaoId, clienteId: 0, tipoDoc: nomeCertidao(f.tipo), nomeArquivo: arquivo.name, mime: arquivo.type,
          tamanhoBytes: arquivo.size, url,
        });
        if (a.ok === false) throw new Error(String(a.error ?? 'O arquivo não foi registrado.'));
        const r2 = await executar('ccPubCertidaoSalvar', { ...f, certidaoId, anexoId: Number(a.anexoId) });
        if (r2.erro) throw new Error(r2.erro);
      } catch (e) {
        setGravando(false);
        return setErro(`Certidão salva, mas o arquivo não: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setGravando(false);
    onSalvo(`${nomeCertidao(f.tipo)} salva com validade ${fmtData(f.validade)}.`);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar ou renovar certidão</DialogTitle>
          <DialogDescription>Renovar cria uma linha nova e guarda a anterior no histórico.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <Field label="Tipo"><SelectMenu label="Tipo" value={f.tipo} onChange={mudar('tipo')} options={TIPOS_CERTIDAO.map((t) => ({ value: t.tipo, label: t.nome }))} /></Field>
            <Grade colunas={2}>
              <LabelledField label="CNPJ" obrigatorio><Input value={f.cnpj} maxLength={18} onChange={(e) => mudar('cnpj')(e.target.value)} /></LabelledField>
              <LabelledField label="Abrangência" hint="UF ou município, nas certidões estadual e municipal"><Input value={f.abrangencia} maxLength={80} onChange={(e) => mudar('abrangencia')(e.target.value)} /></LabelledField>
              <LabelledField label="Número"><Input value={f.numero} maxLength={60} onChange={(e) => mudar('numero')(e.target.value)} /></LabelledField>
              <LabelledField label="Emissão"><Input type="date" value={f.emissao} onChange={(e) => mudar('emissao')(e.target.value)} /></LabelledField>
              <LabelledField label="Validade" obrigatorio><Input type="date" value={f.validade} onChange={(e) => mudar('validade')(e.target.value)} /></LabelledField>
              <LabelledField label="Arquivo" hint="PDF, PNG ou JPG, até 20 MB" hintTone={recusaArquivo ? 'error' : 'muted'}>
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
              </LabelledField>
            </Grade>
            {recusaArquivo ? <Alert tone="error">{recusaArquivo}</Alert> : null}
            {arquivo ? <Alert tone="warn">O arquivo fica em endereço público: quem tiver o link abre sem entrar no sistema.</Alert> : null}
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={gravando || !!recusaArquivo || !f.validade || !f.cnpj.trim()}>{gravando ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
