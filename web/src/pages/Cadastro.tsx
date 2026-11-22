import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Campo } from '../components/Campo'
import { CampoSenha } from '../components/CampoSenha'
import { Carregando } from '../components/Carregando'
import { disciplinasDasOfertas, listarOfertas, nomeTurno, rotuloTurma, type Oferta } from '../lib/api'
import { normalizeEmail } from '../lib/email'
import { mensagemDeErro } from '../lib/erros'
import { supabase, urlDoSite } from '../lib/supabase'
import {
  QUEM_E_VOCE_MAX,
  SENHA_MINIMA,
  temErros,
  validarCadastro,
  type DadosCadastro,
  type ErrosDoFormulario,
} from '../lib/validacao'

const VAZIO: DadosCadastro = { nome: '', email: '', disciplinaId: '', ofertaId: '', quemEVoce: '', senha: '' }

export function Cadastro() {
  const { sessao, carregando } = useAuth()
  const [ofertas, setOfertas] = useState<Oferta[] | null>(null)
  const [erroOfertas, setErroOfertas] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosCadastro>(VAZIO)
  const [erros, setErros] = useState<ErrosDoFormulario<DadosCadastro>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)

  useEffect(() => {
    listarOfertas()
      .then(setOfertas)
      .catch((e: unknown) => setErroOfertas(mensagemDeErro(e)))
  }, [])

  const disciplinas = useMemo(() => disciplinasDasOfertas(ofertas ?? []), [ofertas])
  const turmasDaDisciplina = useMemo(
    () => (ofertas ?? []).filter((o) => String(o.disciplina.id) === dados.disciplinaId),
    [ofertas, dados.disciplinaId],
  )

  if (carregando) return <Carregando />
  if (sessao && !enviadoPara) return <Navigate to="/aguardando" replace />

  const mudar = <K extends keyof DadosCadastro>(campo: K, valor: DadosCadastro[K]) => {
    setDados((d) => ({ ...d, [campo]: valor, ...(campo === 'disciplinaId' ? { ofertaId: '' } : {}) }))
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    setErroGeral(null)
    const novosErros = validarCadastro(dados)
    setErros(novosErros)
    if (temErros(novosErros)) {
      // Leva o foco ao primeiro campo com problema.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setEnviando(true)
    try {
      const email = normalizeEmail(dados.email)
      const { data, error } = await supabase().auth.signUp({
        email,
        password: dados.senha,
        options: {
          emailRedirectTo: urlDoSite('entrar'),
          // O banco cria o perfil (sempre como aluno) e o pedido com estes dados.
          data: {
            nome: dados.nome.trim(),
            turma_disciplina_id: dados.ofertaId,
            quem_e_voce: dados.quemEVoce.trim(),
          },
        },
      })
      if (error) throw error
      if (data.session) return // confirmação de e-mail desligada: o redirecionamento acontece sozinho
      setEnviadoPara(email)
    } catch (e) {
      setErroGeral(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  if (enviadoPara) {
    return (
      <div className="acesso container">
        <section className="cartao acesso-cartao" aria-labelledby="cadastro-ok">
          <p className="pixel acesso-selo">Pedido enviado</p>
          <h1 id="cadastro-ok">Confirme o seu e-mail</h1>
          <p className="acesso-intro">
            Enviamos um link para <strong>{enviadoPara}</strong>. Abra o link para confirmar a conta (olhe também o
            spam). Depois, entre com a sua senha para acompanhar o pedido.
          </p>
          <p className="acesso-intro">
            Quando o professor aprovar, as aulas da sua turma aparecem na sua área. Enquanto isso, você vê a parte
            pública do site.
          </p>
          <div className="acesso-links">
            <Link to="/entrar">Ir para o login</Link>
            <Link to="/">Voltar ao início</Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="acesso container">
      <section className="cartao acesso-cartao acesso-largo" aria-labelledby="cadastro-titulo">
        <p className="pixel acesso-selo">Novo tripulante</p>
        <h1 id="cadastro-titulo">Criar conta</h1>
        <p className="acesso-intro">O professor confere se você é da turma e aprova o seu acesso.</p>

        <form className="formulario" onSubmit={enviar} noValidate>
          <Aviso tipo="atencao" titulo="Só funciona com e-mail acadêmico">
            Use o seu e-mail que termina em <strong>@academico.ifpb.edu.br</strong>. Cadastros com outros e-mails
            (Gmail, Hotmail etc.) são recusados.
          </Aviso>

          {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}

          <div className="formulario-duas-colunas">
            <Campo rotulo="Nome completo" erro={erros.nome}>
              {(p) => (
                <input
                  {...p}
                  value={dados.nome}
                  onChange={(e) => mudar('nome', e.target.value)}
                  autoComplete="name"
                  placeholder="Como aparece na chamada"
                  maxLength={120}
                  required
                />
              )}
            </Campo>

            <Campo rotulo="E-mail acadêmico" erro={erros.email}>
              {(p) => (
                <input
                  {...p}
                  type="email"
                  inputMode="email"
                  value={dados.email}
                  onChange={(e) => mudar('email', e.target.value)}
                  autoComplete="email"
                  placeholder="matricula@academico.ifpb.edu.br"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              )}
            </Campo>
          </div>

          <div className="formulario-duas-colunas">
            <Campo rotulo="Disciplina" erro={erros.disciplinaId ?? erroOfertas ?? undefined}>
              {(p) => (
                <select
                  {...p}
                  value={dados.disciplinaId}
                  onChange={(e) => mudar('disciplinaId', e.target.value)}
                  disabled={!ofertas}
                  required
                >
                  <option value="">{ofertas ? 'Escolha a disciplina' : 'Carregando…'}</option>
                  {disciplinas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              )}
            </Campo>

            <Campo
              rotulo="Turma"
              erro={erros.ofertaId}
              {...(!dados.disciplinaId ? { dica: 'Escolha a disciplina primeiro.' } : {})}
            >
              {(p) => (
                <select
                  {...p}
                  value={dados.ofertaId}
                  onChange={(e) => mudar('ofertaId', e.target.value)}
                  disabled={!dados.disciplinaId}
                  required
                >
                  <option value="">Escolha a sua turma</option>
                  {turmasDaDisciplina.map((o) => (
                    <option key={o.id} value={o.id}>
                      {rotuloTurma(o.turma)} ({nomeTurno(o.turma.turno)})
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>

          <Campo
            rotulo="Quem é você"
            erro={erros.quemEVoce}
            dica="Escreva o seu nome completo, a sua turma e o seu turno (manhã ou tarde). O professor lê isso para aprovar."
          >
            {(p) => (
              <textarea
                {...p}
                value={dados.quemEVoce}
                onChange={(e) => mudar('quemEVoce', e.target.value)}
                placeholder="Ex.: Ana Exemplo da Silva, 1º INFO M, manhã"
                maxLength={QUEM_E_VOCE_MAX}
                required
              />
            )}
          </Campo>

          <CampoSenha
            rotulo="Senha"
            valor={dados.senha}
            onChange={(v) => mudar('senha', v)}
            erro={erros.senha}
            dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}
            autoComplete="new-password"
          />

          <button type="submit" className="botao botao-primario botao-largo" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar pedido de acesso'}
          </button>
        </form>

        <p className="acesso-rodape">Guardamos só nome, e-mail acadêmico e turma. Nada de foto.</p>
        <div className="acesso-links">
          <Link to="/entrar">Já tenho conta: entrar</Link>
        </div>
      </section>
    </div>
  )
}
