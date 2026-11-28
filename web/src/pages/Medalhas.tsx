import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { Medalha } from '../components/Medalha'
import { mensagemDeErro } from '../lib/erros'
import { carregarMedalhas, type MedalhaDoAluno } from '../lib/medalhas'
import { useModoNinja } from '../ninja/ModoNinja'
import './Medalhas.css'

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Todas as medalhas: as ganhas, com a data, e as que faltam, com como ganhar. */
export function Medalhas() {
  const { perfil } = useAuth()
  const ninja = useModoNinja()
  const [medalhas, setMedalhas] = useState<MedalhaDoAluno[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    carregarMedalhas(perfil.id)
      .then((m) => {
        // O ninja tem todas acesas, para o professor ver cada desenho.
        if (ativo) setMedalhas(ninja.ativo ? m.map((x) => ({ ...x, ganhaEm: x.ganhaEm ?? 'ninja' })) : m)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [perfil, ninja.ativo])

  const voltar = ninja.ativo ? (
    <Link to="/ninja" className="botao">
      Voltar à ponte ninja
    </Link>
  ) : (
    <Link to={perfil?.papel === 'professor' ? '/professor' : '/ponte'} className="botao">
      {perfil?.papel === 'professor' ? 'Voltar ao painel' : 'Voltar à ponte'}
    </Link>
  )

  if (erro) {
    return (
      <div className="medalhas container">
        <Aviso tipo="erro" titulo="Não foi possível abrir as medalhas">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!medalhas) return <Carregando />

  const ganhas = medalhas.filter((m) => m.ganhaEm).length
  return (
    <div className="medalhas container">
      <header className="cartao medalhas-topo">
        <div>
          <p className="pixel medalhas-selo">Medalhas</p>
          <h1>{ninja.ativo ? 'Todas as medalhas' : 'Suas medalhas'}</h1>
          <p className="medalhas-contagem">
            {ganhas} de {medalhas.length} {medalhas.length === 1 ? 'medalha ganha' : 'medalhas ganhas'}
          </p>
        </div>
        {voltar}
      </header>

      <ul className="medalhas-lista" role="list">
        {medalhas.map((m) => (
          <li key={m.codigo} className={`cartao medalhas-item${m.ganhaEm ? '' : ' medalhas-item-falta'}`}>
            <Medalha codigo={m.codigo} apagada={!m.ganhaEm} tamanho={72} />
            <div>
              <h2>{m.nome}</h2>
              {m.ganhaEm ? (
                <>
                  <p>{m.descricao}</p>
                  <p className="medalhas-quando">
                    {m.ganhaEm === 'ninja' ? 'Acesa no Modo Ninja' : `Ganha em ${formatoData.format(new Date(m.ganhaEm))}`}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className="medalhas-falta">Como ganhar: </span>
                    {m.descricao}
                  </p>
                  {m.progresso ? (
                    <div className="medalhas-progresso">
                      <progress
                        value={m.progresso.atual}
                        max={m.progresso.meta}
                        aria-label={`Progresso em ${m.nome}`}
                      />
                      <span className="medalhas-quando">
                        {m.progresso.atual} de {m.progresso.meta}
                      </span>
                    </div>
                  ) : (
                    <p className="medalhas-quando">Ainda falta</p>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
