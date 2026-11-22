import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useIrParaAreaInicial } from '../auth/useIrParaAreaInicial'
import { Aviso } from '../components/Aviso'
import { Campo } from '../components/Campo'
import { CampoSenha } from '../components/CampoSenha'
import { Carregando } from '../components/Carregando'
import { normalizeEmail } from '../lib/email'
import { mensagemDeErro } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { validarEmail } from '../lib/validacao'

export function Entrar() {
  const { carregando, sessao } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroEmail, setErroEmail] = useState<string | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Quem já entrou (ou acabou de confirmar o e-mail pelo link) vai direto para a sua área.
  useIrParaAreaInicial()

  if (carregando || sessao) return <Carregando texto="Abrindo a sua área…" />

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    setErroGeral(null)
    const problema = validarEmail(email)
    setErroEmail(problema)
    if (problema || !senha) {
      if (!senha) setErroGeral('Digite a sua senha.')
      return
    }
    setEnviando(true)
    const { error } = await supabase().auth.signInWithPassword({ email: normalizeEmail(email), password: senha })
    setEnviando(false)
    if (error) setErroGeral(mensagemDeErro(error))
    // Deu certo: a sessão muda e o useIrParaAreaInicial faz o resto.
  }

  return (
    <div className="acesso container">
      <section className="cartao acesso-cartao" aria-labelledby="entrar-titulo">
        <p className="pixel acesso-selo">Bem-vindo a bordo</p>
        <h1 id="entrar-titulo">Entrar</h1>
        <p className="acesso-intro">Use o e-mail acadêmico e a senha que você criou no cadastro.</p>

        <form className="formulario" onSubmit={enviar} noValidate>
          {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}

          <Campo rotulo="E-mail acadêmico" erro={erroEmail}>
            {(p) => (
              <input
                {...p}
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="matricula@academico.ifpb.edu.br"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            )}
          </Campo>

          <CampoSenha rotulo="Senha" valor={senha} onChange={setSenha} autoComplete="current-password" />

          <button type="submit" className="botao botao-primario botao-largo" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="acesso-links">
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
          <Link to="/cadastro">Criar conta</Link>
        </div>
      </section>
    </div>
  )
}
