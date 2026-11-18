/**
 * /entrar — opção `login` A "Manchete e contexto" (docs/opcoes-tela/001-base/telas-01-acesso.html).
 * O cartão guarda o acesso inteiro numa máquina de cinco passos (design.md §10.1). Sem
 * VITE_MITRA_AUTH_URL quem autentica é o simulador: os passos que só a conta Mitra cumpre continuam
 * navegáveis e recusam no envio. `bloqueio` é o estado do cartão para quem autenticou mas não está
 * na equipe (ccBaseSessao com `membro: null`) ou quando a sessão não pôde ser conferida.
 */
import { useState } from 'react';
import {
  emailLoginMitra,
  emailResendCodeMitra,
  emailSignupMitra,
  emailVerifyCodeMitra,
  loginWithGoogleMitra,
  loginWithMicrosoftMitra,
  resetPasswordMitra,
  sendPasswordResetCodeMitra,
  validatePasswordResetCodeMitra,
} from 'mitra-interactions-sdk';
import { MODO_LOCAL, loginLocally, saveSession } from '@/lib/mitra-auth';
import {
  Alert,
  Button,
  CampoCodigo,
  CartaoAcesso,
  FormAcesso,
  Input,
  LabelledField,
  ReguaAcesso,
  RodapeAcesso,
  TelaAcesso,
  TextLink,
} from '@/components/page';

const AUTH_URL = import.meta.env.VITE_MITRA_AUTH_URL;
const OPCOES = { authUrl: AUTH_URL, projectId: Number(import.meta.env.VITE_MITRA_PROJECT_ID), create: true };
const SO_COM_CONTA_MITRA = 'Este passo precisa da conta Mitra real. No ambiente local, entre com e-mail e senha (mitra123).';

type Passo = 'entrar' | 'criar' | 'confirmar' | 'recuperar' | 'codigo' | 'nova-senha';

const TITULOS: Record<Passo, string> = {
  entrar: 'Entrar',
  criar: 'Criar conta',
  confirmar: 'Confirme seu e-mail',
  recuperar: 'Recuperar senha',
  codigo: 'Confirme seu e-mail',
  'nova-senha': 'Nova senha',
};

export function Entrar({
  onLogin,
  bloqueio,
  onSair,
  onTentarDeNovo,
}: {
  onLogin: () => void;
  bloqueio?: 'sem-acesso' | 'erro';
  onSair?: () => void;
  onTentarDeNovo?: () => void;
}) {
  const [passo, setPasso] = useState<Passo>('entrar');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');

  const ir = (p: Passo) => {
    setPasso(p);
    setErro('');
    setSucesso('');
    setCodigo('');
  };

  /** Roda uma etapa: trava o cartão, mostra a recusa no aviso. */
  async function etapa(fn: () => Promise<void>, soComContaMitra = false) {
    if (soComContaMitra && MODO_LOCAL) {
      setSucesso('');
      setErro(SO_COM_CONTA_MITRA);
      return;
    }
    setOcupado(true);
    setErro('');
    try {
      await fn();
    } catch (e) {
      setErro((e instanceof Error && e.message) || 'Não foi possível concluir. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  const entrou = (resposta: unknown) => {
    saveSession(resposta as Record<string, unknown>);
    onLogin();
  };

  const entrarComEmail = () =>
    etapa(async () => {
      if (!email.trim() || !senha.trim()) throw new Error('Preencha o e-mail e a senha.');
      if (MODO_LOCAL) {
        await loginLocally(email.trim(), senha.trim());
        onLogin();
        return;
      }
      entrou(await emailLoginMitra({ ...OPCOES, email: email.trim(), password: senha.trim() }));
    });

  const sso = (provedor: 'google' | 'microsoft') =>
    etapa(async () => entrou(await (provedor === 'google' ? loginWithGoogleMitra : loginWithMicrosoftMitra)(OPCOES)), true);

  const criarConta = () =>
    etapa(async () => {
      if (!nome.trim() || !email.trim() || !senha.trim()) throw new Error('Preencha nome, e-mail e senha.');
      await emailSignupMitra({ ...OPCOES, name: nome.trim(), email: email.trim(), password: senha.trim() });
      ir('confirmar');
    }, true);

  const confirmarEmail = () =>
    etapa(async () => {
      if (codigo.length < 6) throw new Error('Digite o código de 6 dígitos.');
      entrou(await emailVerifyCodeMitra({ ...OPCOES, email: email.trim(), code: codigo, password: senha.trim() }));
    }, true);

  const pedirCodigo = () =>
    etapa(async () => {
      if (!email.trim()) throw new Error('Preencha o e-mail.');
      await sendPasswordResetCodeMitra({ authUrl: AUTH_URL, email: email.trim() });
      ir('codigo');
    }, true);

  const validarCodigo = () =>
    etapa(async () => {
      if (codigo.length < 6) throw new Error('Digite o código de 6 dígitos.');
      await validatePasswordResetCodeMitra({ authUrl: AUTH_URL, email: email.trim(), code: codigo });
      setPasso('nova-senha');
    }, true);

  const redefinir = () =>
    etapa(async () => {
      if (!novaSenha.trim()) throw new Error('Preencha a nova senha.');
      if (novaSenha !== confirmacao) throw new Error('As senhas não coincidem.');
      await resetPasswordMitra({ authUrl: AUTH_URL, email: email.trim(), code: codigo, newPassword: novaSenha.trim() });
      ir('entrar');
      setSenha('');
      setSucesso('Senha redefinida. Entre com a nova senha.');
    }, true);

  /** Só dígitos, sem `maxLength` (§10.1); reescreve o campo porque o mesmo estado não re-renderiza. */
  const digitarCodigo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 6);
    e.target.value = digitos;
    setCodigo(digitos);
  };

  const campoEmail = (
    <LabelledField label="E-mail">
      <Input type="email" autoComplete="email" placeholder={MODO_LOCAL ? 'ana@benenutri.local' : 'seu@benenutri.com.br'}
        value={email} onChange={(e) => setEmail(e.target.value)} disabled={ocupado} />
    </LabelledField>
  );

  const aviso = (
    <>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      {sucesso && !erro ? <Alert tone="success">{sucesso}</Alert> : null}
    </>
  );

  const tela = (cartao: React.ReactNode) => (
    <TelaAcesso
      manchete="A carteira em dia, do pedido de crédito ao recebimento."
      rotulo="Crédito e Cobrança"
      contexto="Posição de cada cliente lida do Winthor a cada 15 minutos, régua de cobrança, concessão de crédito e Jurídico num só lugar, para o Núcleo Financeiro e a gestão."
    >
      {cartao}
    </TelaAcesso>
  );

  if (bloqueio) {
    return tela(
      <CartaoAcesso
        titulo={bloqueio === 'erro' ? 'Não foi possível conferir o acesso' : 'Acesso não liberado'}
        aviso={
          bloqueio === 'erro' ? (
            <Alert tone="error">Não foi possível verificar seu acesso agora. Tente de novo em instantes.</Alert>
          ) : (
            <Alert tone="warn"><b>Seu acesso ainda não foi liberado.</b> Fale com o Administrador.</Alert>
          )
        }
      >
        <FormAcesso onEnviar={() => onSair?.()}>
          {bloqueio === 'erro' ? <Button variant="primary" onClick={onTentarDeNovo}>Tentar de novo</Button> : null}
          <Button type="submit">Sair e entrar com outra conta</Button>
        </FormAcesso>
      </CartaoAcesso>,
    );
  }

  const subtitulo =
    passo === 'confirmar' || passo === 'codigo' ? `Enviamos um código para ${email}.`
      : passo === 'recuperar' ? 'Digite seu e-mail para receber um código.'
        : passo === 'nova-senha' ? 'Escolha uma nova senha para a sua conta.'
          : passo === 'criar' ? 'Preencha os dados para criar a sua conta.'
            : MODO_LOCAL ? 'Ambiente local: entre com o e-mail do elenco e a senha mitra123.' : 'Escolha como deseja acessar.';

  return tela(
    <CartaoAcesso titulo={TITULOS[passo]} subtitulo={subtitulo} aviso={aviso}>
      {passo === 'entrar' || passo === 'criar' ? (
        <FormAcesso onEnviar={passo === 'criar' ? criarConta : entrarComEmail}>
          <Button onClick={() => sso('google')} disabled={ocupado}>
            <svg viewBox="0 0 48 48" aria-hidden>
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
              <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
              <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
            </svg>
            Continuar com Google
          </Button>
          <Button onClick={() => sso('microsoft')} disabled={ocupado}>
            <svg viewBox="0 0 23 23" aria-hidden>
              <path fill="#F25022" d="M1 1h10v10H1z" />
              <path fill="#7FBA00" d="M12 1h10v10H12z" />
              <path fill="#00A4EF" d="M1 12h10v10H1z" />
              <path fill="#FFB900" d="M12 12h10v10H12z" />
            </svg>
            Continuar com Microsoft
          </Button>
          <ReguaAcesso>{passo === 'criar' ? 'ou crie com e-mail' : 'ou entre com e-mail'}</ReguaAcesso>
          {passo === 'criar' ? (
            <LabelledField label="Nome">
              <Input autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} disabled={ocupado} />
            </LabelledField>
          ) : null}
          {campoEmail}
          <LabelledField label="Senha">
            <Input type="password" autoComplete={passo === 'criar' ? 'new-password' : 'current-password'}
              value={senha} onChange={(e) => setSenha(e.target.value)} disabled={ocupado} />
          </LabelledField>
          <Button type="submit" variant="primary" disabled={ocupado}>
            {ocupado ? 'Aguarde…' : passo === 'criar' ? 'Criar conta' : 'Entrar'}
          </Button>
          <RodapeAcesso>
            {passo === 'entrar' ? (
              <>
                <TextLink onClick={() => ir('recuperar')} disabled={ocupado}>Esqueci minha senha</TextLink>
                <span>Primeiro acesso? <TextLink onClick={() => ir('criar')} disabled={ocupado}>Criar conta</TextLink></span>
              </>
            ) : (
              <TextLink onClick={() => ir('entrar')} disabled={ocupado}>Já tenho conta</TextLink>
            )}
          </RodapeAcesso>
        </FormAcesso>
      ) : passo === 'confirmar' || passo === 'codigo' ? (
        <FormAcesso onEnviar={passo === 'confirmar' ? confirmarEmail : validarCodigo}>
          <LabelledField label="Código de verificação">
            <CampoCodigo value={codigo} onChange={digitarCodigo} autoFocus />
          </LabelledField>
          <Button type="submit" variant="primary" disabled={ocupado}>Confirmar</Button>
          <RodapeAcesso>
            <TextLink disabled={ocupado}
              onClick={() => (passo === 'confirmar'
                ? etapa(async () => { await emailResendCodeMitra({ ...OPCOES, email: email.trim() }); }, true)
                : pedirCodigo())}>
              Reenviar código
            </TextLink>
            <TextLink onClick={() => ir('entrar')} disabled={ocupado}>Voltar</TextLink>
          </RodapeAcesso>
        </FormAcesso>
      ) : passo === 'recuperar' ? (
        <FormAcesso onEnviar={pedirCodigo}>
          {campoEmail}
          <Button type="submit" variant="primary" disabled={ocupado}>Enviar código</Button>
          <RodapeAcesso>
            <TextLink onClick={() => ir('entrar')} disabled={ocupado}>Voltar</TextLink>
          </RodapeAcesso>
        </FormAcesso>
      ) : (
        <FormAcesso onEnviar={redefinir}>
          <LabelledField label="Nova senha">
            <Input type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} disabled={ocupado} />
          </LabelledField>
          <LabelledField label="Confirmar senha">
            <Input type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} disabled={ocupado} />
          </LabelledField>
          <Button type="submit" variant="primary" disabled={ocupado}>Redefinir senha</Button>
          <RodapeAcesso>
            <TextLink onClick={() => ir('entrar')} disabled={ocupado}>Voltar</TextLink>
          </RodapeAcesso>
        </FormAcesso>
      )}
    </CartaoAcesso>,
  );
}
