// Trecho da 005 no gancho ccPodeMover (04 §8, 01 §14): só `concessao-publica`, depois do trecho da 004.
// Entrar na Classificação (`comite`) exige a análise do órgão com capacidade, perfil de pagamento e rating
// (RN-003); os itens 1 e 2 do checklist são condição de entrada da fase, no quadro da 004 (05 §4.3).
// A 005 não tem QUADROS.

export const MOTIVO_ANALISE = 'Análise do órgão incompleta: capacidade financeira, perfil de pagamento e rating.';

export function gancho(slug) {
  if (slug !== 'concessao-publica') return '';
  return `        WHEN PARA.CHAVE = 'comite' AND NOT EXISTS (SELECT 1 FROM CC_SOLICITACAO S5 JOIN CC_ANALISE_ORGAO AO5 ON AO5.SOLICITACAO_ID = S5.ID
          WHERE S5.CARD_ID = K.ID AND AO5.CAPACIDADE <> '' AND AO5.PERFIL_PAG <> '' AND AO5.RATING_PUB <> '') THEN '${MOTIVO_ANALISE}'`;
}
