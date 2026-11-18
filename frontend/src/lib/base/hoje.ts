// "Hoje" do sistema (01 §3, relógio único): o `hoje` que `ccBaseSessao` devolve, guardado pela casca ao ler a
// sessão. Tela não usa a data do navegador; dentro de componente, o mesmo valor está em `membro.hoje`.

let hojeDoServidor = '';

/** A casca chama ao ler a sessão. */
export function definirHoje(hoje: string): void {
  hojeDoServidor = hoje;
}

/** AAAA-MM-DD pelo relógio do servidor ('' antes da sessão ser lida — nenhuma tela abre antes). */
export function hojeDaSessao(): string {
  return hojeDoServidor;
}
