// Carteira como aba dentro das telas de Crédito e Cobrança (casca C, RF-042): a escolha fica
// guardada por tela no navegador (preferência, não dado).

import { useState } from 'react';

export type Carteira = 'PRIVADA' | 'ESTETICA' | 'PUBLICA';

export const CARTEIRAS: { codigo: Carteira; nome: string }[] = [
  { codigo: 'PRIVADA', nome: 'Privado' },
  { codigo: 'ESTETICA', nome: 'Estética' },
  { codigo: 'PUBLICA', nome: 'Público' },
];

const chave = (tela: string) => `cc-carteira:${tela}`;

function lida(tela: string, padrao: Carteira): Carteira {
  try {
    const valor = localStorage.getItem(chave(tela));
    return CARTEIRAS.some((c) => c.codigo === valor) ? (valor as Carteira) : padrao;
  } catch {
    return padrao;
  }
}

/** `const [carteira, setCarteira] = useCarteira('cobranca')`. */
export function useCarteira(tela: string, padrao: Carteira = 'PRIVADA'): [Carteira, (c: Carteira) => void] {
  const [carteira, setEstado] = useState(() => lida(tela, padrao));
  const escolher = (c: Carteira) => {
    setEstado(c);
    try {
      localStorage.setItem(chave(tela), c);
    } catch {
      // preferência não crítica
    }
  };
  return [carteira, escolher];
}
