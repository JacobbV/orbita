import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useIrParaAreaInicial } from '../auth/useIrParaAreaInicial'
import { Aviso } from '../components/Aviso'
import { CampoSenha } from '../components/CampoSenha'
import { Carregando } from '../components/Carregando'
import { mensagemDeErro } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { SENHA_MINIMA, validarSenha } from '../lib/validacao'

/** Aberta pelo link do e-mail "redefinir senha". */
export function NovaSenha() {
  const { carregando, sessao } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroSenha, setErroSenha] = useState<string | undefined>()
  const [erroConfirmacao, setErroConfirmacao] = useState<string | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)

  // Depois de trocar a senha, leva para a área da pessoa.
  useIrParaAreaInicial(pronto)

  if (carregando) return <Carregando />

  if (!sessao) {
    return (
      <div className="acesso container">
        <section className="cartao acesso-cartao" aria-labelledby="nova-senha-titulo">
          <p className="pixel acesso-selo">Link inválido</p>
          <h1 id="nova-senha-titulo">Este link não funciona mais</h1>
          <p className="acesso-intro">O link expirou ou já foi usado. Peça outro e use o mais recente.</p>
          <div className="acesso-links">
            <Link to="/recuperar-senha">Pedir um link novo</Link>
            <Link to="/entrar">Entrar</Link>
          </div>
        </section>
      </div>
    )
  }

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    setErroGeral(null)
    const p1 = validarSenha(senha)
    const p2 = senha !== confirmacao ? 'As duas senhas precisam ser iguais.' : undefined
    setErroSenha(p1)
    setErroConfirmacao(p2)
    if (p1 || p2) return
    setEnviando(true)
    const { error } = await supabase().auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) setErroGeral(mensagemDeErro(error))
    else setPronto(true)
  }

  return (
    <div className="acesso container">
      <section className="cartao acesso-cartao" aria-labelledby="nova-senha-titulo">
        <p className="pixel acesso-selo">Recuperar acesso</p>
        <h1 id="nova-senha-titulo">Criar senha nova</h1>
        {pronto ? (
          <Aviso tipo="sucesso">Senha trocada. Abrindo a sua área…</Aviso>
        ) : (
          <form className="formulario" onSubmit={enviar} noValidate>
            {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
            <CampoSenha
              rotulo="Senha nova"
              valor={senha}
              onChange={setSenha}
              erro={erroSenha}
              dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}
              autoComplete="new-password"
            />
            <CampoSenha
              rotulo="Repita a senha nova"
              valor={confirmacao}
              onChange={setConfirmacao}
              erro={erroConfirmacao}
              autoComplete="new-password"
            />
            <button type="submit" className="botao botao-primario botao-largo" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar senha nova'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
