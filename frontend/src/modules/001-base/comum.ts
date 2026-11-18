// Peças comuns às telas da 001: rótulos de definição do sistema e a espera de 400 ms da busca.

import { useEffect, useEffectEvent, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MembroSessao } from '@/lib/base/menu';

export const useMembro = () => useOutletContext<MembroSessao>();

/** Pode redistribuir, classificar e pedir leitura: Supervisor para cima ou a marca (NIVEL_MIN(2), 01 §5). */
export const nivelDois = (m: MembroSessao) => m.nivel >= 2 || m.admin;

/**
 * Lê quando `chave` muda (ou em `reler()`), e só então: nenhuma tela relê sozinha (RNF-004).
 * Durante a leitura os dados anteriores continuam na tela (`carregando` desabilita a paginação).
 */
export function useDados<T>(carregar: () => Promise<T>, chave: string) {
  const [estado, setEstado] = useState<{ chave: string; dados?: T; erro?: string } | null>(null);
  const [versao, setVersao] = useState(0);
  const buscar = useEffectEvent(() => carregar());
  const k = `${chave}#${versao}`;
  useEffect(() => {
    let vivo = true;
    buscar().then(
      (dados) => { if (vivo) setEstado({ chave: k, dados }); },
      (e) => { if (vivo) setEstado((antes) => ({ chave: k, dados: antes?.dados, erro: motivo(e) })); },
    );
    return () => { vivo = false; };
  }, [k]);
  return { dados: estado?.dados, erro: estado?.erro, carregando: estado?.chave !== k, reler: () => setVersao((v) => v + 1) };
}

/** Valor que só muda 400 ms depois da última digitação (busca, plan.md "Superfície"). */
export function useEspera<T>(valor: T, ms = 400): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

export const CARGOS: Record<string, string> = {
  AGENTE: 'Agente', ANALISTA: 'Analista', SUPERVISOR: 'Supervisor', GERENTE: 'Gerente', DIRETORIA: 'Diretoria', JURIDICO: 'Jurídico',
};
export const OPCOES_CARGO = Object.entries(CARGOS).map(([value, label]) => ({ value, label }));

export const SETORES: Record<string, string> = { PRIVADO: 'Privado', PUBLICO: 'Público' };
export const CARTEIRA_NOME: Record<string, string> = { PRIVADA: 'Privado', ESTETICA: 'Estética', PUBLICA: 'Público', '': 'Privado' };

/** Situação da ficha de contatos (SITUACAO_FICHA de 04 §1) como Status. */
export const SITUACAO_FICHA: Record<string, { texto: string; tom: 'live' | 'attention' | 'alert' }> = {
  EM_DIA: { texto: 'Em dia', tom: 'live' },
  VENCIDA: { texto: 'Vencida', tom: 'attention' },
  NUNCA: { texto: 'Nunca atualizada', tom: 'alert' },
};

/** Constantes de add-010 (definição do sistema): áreas, funções e situações do contato. */
export const AREAS_CONTATO = ['Financeiro', 'Diretoria / gabinete', 'Compras / licitações', 'Gestão do contrato', 'Jurídico', 'Recepção / geral', 'Outro'];
export const FUNCOES_CONTATO = ['Contas a pagar', 'Tesoureiro(a)', 'Gerente financeiro', 'Sócio(a)', 'Diretor(a)', 'Secretário(a)', 'Ordenador de despesa',
  'Fiscal do contrato', 'Gestor do contrato', 'Comprador(a)', 'Pregoeiro(a)', 'Advogado(a)', 'Recepcionista'];
export const SITUACOES_CONTATO: Record<string, string> = { CONFIRMADO: 'Confirmado', PENDENTE: 'Pendente', SEM_SUCESSO: 'Sem sucesso', NAO_USAR: 'Não usar mais' };

export const opcoes = (lista: string[], vazio?: string) => [
  ...(vazio ? [{ value: '', label: vazio }] : []),
  ...lista.map((v) => ({ value: v, label: v })),
];

/** "Brasília/DF" a partir de MUNICIPIO e UF (o Winthor grava em caixa alta). */
export function cidade(municipio: unknown, uf: unknown): string {
  const m = String(municipio ?? '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, e, l) => e + l.toUpperCase());
  return [m, String(uf ?? '')].filter(Boolean).join('/');
}

/** Número ou null (para `Dash`): zero e vazio não são valor afirmado. */
export const valorOuNada = (v: unknown) => (Number(v) ? Number(v) : null);

/** "12 dias" / "1 dia". */
export const dias = (n: unknown) => `${Number(n)} ${Number(n) === 1 ? 'dia' : 'dias'}`;

/** Executa a JS e devolve o motivo da recusa, ou '' quando deu certo. */
export async function executar(fn: () => Promise<Record<string, unknown>>): Promise<string> {
  try {
    const r = await fn();
    return r.ok === false ? motivo(r) : '';
  } catch (e) {
    return motivo(e);
  }
}

/** Mensagem da recusa de uma JS (`{ ok: false, error }`) ou do transporte. */
export const motivo = (r: unknown, padrao = 'Não foi possível concluir agora.') =>
  String((r as { error?: string })?.error ?? (r instanceof Error ? r.message : '') ?? '') || padrao;
