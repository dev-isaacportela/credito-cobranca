// Texto do histórico: busca normalizada (RN-013) e os marcadores que a SQL escreve no TEXTO (D-003):
// `{R$:12500.00}` valor, `{D:2026-11-24}` data, `{+}` separa o resumo do que só aparece ao expandir (RN-015).

import { fmtData, moeda } from '../formato.ts';
import { montarBusca } from '../base/documento.ts';
import { nomeDaFase } from '../cobranca-privada/fases.ts';

/** Sem acento, CAIXA ALTA, espaços colapsados — a forma de `BUSCA` no servidor. */
export const normalizar = (texto: unknown) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** O que vai em `busca` (cliente): documento ou código com pontuação vira só dígitos; texto, `normalizar`. */
export const termoDeBusca = (texto: unknown) => montarBusca(texto);

/* Códigos que a auditoria e a régua gravam no texto (F5 C-04): chave de fase, carteira, situação, cargo, origem. */
const FASES = ['prev_d5', 'prev_d1', 'venc_d0', 'pag_nao_ident', 'cob_ativa', 'notif_formal', 'protesto', 'neg_pos_protesto', 'extrajudicial',
  'juridico', 'negociacao', 'acordo', 'regularizado', 'pago_no_prazo', 'baixado'];
const CODIGOS: Record<string, string> = {
  ...Object.fromEntries(FASES.map((f) => [f, nomeDaFase(f).split(' · ').pop() as string])),
  PRIVADA: 'Privado', ESTETICA: 'Estética', PUBLICA: 'Público',
  PROPOSTO: 'Proposto', ATIVO: 'Ativo', QUITADO: 'Quitado', QUEBRADO: 'Quebrado', CANCELADO: 'Cancelado', RECUSADO: 'Recusado',
  PENDENTE: 'Pendente', APROVADA: 'Aprovada', RECUSADA: 'Recusada', AGUARDANDO: 'Aguardando', ABERTA: 'Aberta', CUMPRIDA: 'Cumprida',
  QUEBRADA: 'Quebrada', VERIFICADO: 'Verificado', GESTAO: 'Em gestão', REANALISE: 'Em reanálise', FAVORAVEL: 'Favorável',
  DESFAVORAVEL: 'Desfavorável', PEDIDOS: 'Novos pedidos bloqueados', TOTAL: 'Bloqueio total',
  AGENTE: 'Agente', SUPERVISOR: 'Supervisor', GERENTE: 'Gerente', DIRETORIA: 'Diretoria', ANALISTA: 'Analista', JURIDICO: 'Jurídico',
  ENVIADO: 'enviado', FALHOU: 'falhou', BOTAO: 'registrada no card', EMAIL: 'e-mail enviado', EMAIL_REGUA: 'e-mail da régua', BLOQUEIO: 'bloqueio registrado',
  REVISAR_JURIDICO: 'Revisar no Jurídico', 'jur.cargaConcluida': 'Carga do Jurídico concluída', FERIADO: 'Feriado',
};
// Só troca o trecho que é inteiro um código, entre separadores: "DISTRIBUIDORA TOTAL LTDA" fica como está.
const SEPARADORES = /(^De | para |^Antes: |E-mail |Itens de | · |: |; )/;

/** Modelo de e-mail da régua: `COB_<FASE>` (ou `COB_ATIVA`), com a versão opcional. */
const modeloDaRegua = (_: string, resto: string, versao?: string) => {
  const fase = FASES.find((x) => x === resto.toLowerCase() || x === `cob_${resto.toLowerCase()}`);
  return fase ? `modelo "${CODIGOS[fase]}"${versao ? ` (versão ${versao})` : ''}` : _;
};

/** Rótulo de negócio no lugar do código técnico ("E-mail cob_ativa" → "E-mail Cobrança ativa"). */
export const legivel = (texto: unknown) =>
  String(texto ?? '').split(SEPARADORES).map((parte) => CODIGOS[parte] ?? parte).join('')
    .replace(/\bCOB_([A-Z0-9_]+)(?: v(\d+))?/g, modeloDaRegua);

/** Troca os marcadores pelo formato brasileiro (o `{+}` fica: quem corta é `partesDoTexto`) e os códigos pelos rótulos. */
export function formatarTexto(texto: unknown): string {
  const [principal, ...resto] = String(texto ?? '').split('{+}');
  return [legivel(principal), ...resto].join('{+}')
    .replace(/\{R\$:([^}]*)\}/g, (_, v) => moeda(v).replace(/\s/g, ' ') || v)
    .replace(/\{D:([^}]*)\}/g, (_, v) => fmtData(v));
}

/** `principal` sempre à vista; `expandir` atrás de "Ver mais" (corpo do e-mail). */
export function partesDoTexto(texto: unknown): { principal: string; expandir: string } {
  const [principal, ...resto] = String(texto ?? '').split('{+}');
  return { principal: principal.trim(), expandir: resto.join('{+}').trim() };
}
