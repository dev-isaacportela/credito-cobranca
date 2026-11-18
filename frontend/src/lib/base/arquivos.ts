// Anexos (RN-024, 01 §12): a tela confere formato e tamanho antes de enviar (com as mesmas frases de
// ccBaseAnexoRegistrar) e sobe o arquivo pelo SDK; a SF só registra o endereço. O endereço é
// público: o nome vai embaralhado e a tela avisa "arquivo em endereço público".
// `enviarArquivo` também é o que se passa ao `criarKanbanApi` (anexos do card).

import { uploadFilePublicMitra } from 'mitra-interactions-sdk';

const FORMATOS = ['pdf', 'png', 'jpg', 'jpeg', 'xlsx', 'docx'];
export const TAMANHO_MAXIMO = 20 * 1024 * 1024;

/** Motivo da recusa, ou null quando o arquivo pode subir. */
export function validarArquivo({ nome, tamanho }: { nome: string; tamanho: number }): string | null {
  const extensao = String(nome).split('.').pop()?.toLowerCase() ?? '';
  if (!String(nome).includes('.') || !FORMATOS.includes(extensao)) return 'Formato não aceito: só PDF, PNG, JPG, XLSX ou DOCX.';
  if (!(tamanho > 0) || tamanho > TAMANHO_MAXIMO) return 'O arquivo precisa ter até 20 MB.';
  return null;
}

/** Sobe como `<uuid>-<nome>` e devolve o endereço público. Lança com a frase da recusa. */
export async function enviarArquivo(arquivo: File): Promise<string> {
  const recusa = validarArquivo({ nome: arquivo.name, tamanho: arquivo.size });
  if (recusa) throw new Error(recusa);
  const renomeado = new File([arquivo], `${crypto.randomUUID()}-${arquivo.name}`, { type: arquivo.type });
  const resposta = await uploadFilePublicMitra({ file: renomeado });
  const url = resposta?.result?.publicUrl;
  if (!url) throw new Error(`O envio de ${arquivo.name} não devolveu o endereço do arquivo.`);
  return url;
}
