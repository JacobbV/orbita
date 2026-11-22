import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Aviso } from '../components/Aviso'
import { Campo } from '../components/Campo'
import { normalizeEmail } from '../lib/email'
import { mensagemDeErro } from '../lib/erros'
import { supabase, urlDoSite } from '../lib/supabase'
import { validarEmail } from '../lib/validacao'

export function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [erroEmail, setErroEmail] = useState<string | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    setErroGeral(null)
    const problema = validarEmail(email)
    setErroEmail(problema)
    if (problema) return
    setEnviando(true)
    const { error } = await supabase().auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: urlDoSite('nova-senha'),
    })
    setEnviando(false)
    if (error) setErroGeral(mensagemDeErro(error))
    else setEnviado(true)
  }

  return (
    <div className="acesso container">
      <section className="cartao acesso-cartao" aria-labelledby="recuperar-titulo">
        <p className="pixel acesso-selo">Recuperar acesso</p>
        <h1 id="recuperar-titulo">Esqueci minha senha</h1>

        {enviado ? (
          <>
            <p className="acesso-intro">
              Se existir uma conta com <strong>{normalizeEmail(email)}</strong>, enviamos um link para criar uma
              senha nova. Abra o link neste ou em outro aparelho (olhe também o spam).
            </p>
            <div className="acesso-links">
              <Link to="/entrar">Voltar para o login</Link>
            </div>
          </>
        ) : (
          <>
            <p className="acesso-intro">Digite o seu e-mail acadêmico. Vamos enviar um link para criar uma senha nova.</p>
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
                    autoComplete="email"
                    placeholder="matricula@academico.ifpb.edu.br"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                )}
              </Campo>
              <button type="submit" className="botao botao-primario botao-largo" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar link'}
              </button>
            </form>
            <div className="acesso-links">
              <Link to="/entrar">Lembrei a senha: entrar</Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
