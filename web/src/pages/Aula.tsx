import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, type To } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { PalcoDeSlides } from '../components/PalcoDeSlides'
import { AulaIndisponivel, carregarAudio, carregarAula, type DadosDaAula } from '../lib/aula'
import { mensagemDeErro } from '../lib/erros'
import { XP_POR_DIFICULDADE } from '../lib/laboratorio'
import { anunciarConquista, registrarAberturaEmSilencio, registrarAudioOuvido } from '../lib/progresso'
import { useModoNinja } from '../ninja/ModoNinja'
import './Aula.css'

/** Página de uma aula: slides, "Nesta aula", exercícios, apostila e áudio. */
export function Aula() {
  const { aulaId } = useParams()
  const { perfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [aula, setAula] = useState<DadosDaAula | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const ehProfessor = perfil?.papel === 'professor'
  const ehAluno = perfil?.papel === 'aluno'
  const ninja = useModoNinja().ativo
  const comoAluno = ehProfessor && new URLSearchParams(location.search).get('comoAluno') === '1'

  useEffect(() => {
    let ativo = true
    carregarAula(Number(aulaId), ehProfessor, comoAluno)
      .then((a) => {
        if (!ativo) return
        setAula(a)
        // Aluno ganha XP na primeira vez que abre a aula (o banco confere tudo).
        if (ehAluno) registrarAberturaEmSilencio(a.id)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof AulaIndisponivel ? e.message : mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [aulaId, ehProfessor, ehAluno, comoAluno])

  const marca = comoAluno
    ? 'Nome do aluno · aluno@academico.ifpb.edu.br'
    : ehProfessor
      ? null
      : [perfil?.nome, perfil?.email].filter(Boolean).join(' · ')
  const voltar: To = ninja ? '/ninja' : ehProfessor ? '/professor?aba=aulas' : '/ponte'
  const veioDoSite = location.key !== 'default'
  function aoVoltar(e: MouseEvent<HTMLAnchorElement>) {
    if (!veioDoSite || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    void navigate(-1)
  }

  if (erro) {
    return (
      <div className="aula container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a aula">
          {erro}
        </Aviso>
        <Link to={voltar} className="botao aula-voltar">
          Voltar
        </Link>
      </div>
    )
  }
  if (!aula) return <Carregando />

  return (
    <div className="aula container">
      <header className="aula-topo">
        <Link to={voltar} className="botao aula-voltar" onClick={aoVoltar}>
          <span aria-hidden="true">←</span> Voltar
        </Link>
        <div className="aula-nome">
          <p className="pixel aula-onde">{aula.onde}</p>
          <h1>{aula.titulo}</h1>
        </div>
      </header>

      <div className="aula-principal">
        <section className="aula-slides" aria-label="Slides">
          {aula.slides ? (
            <PalcoDeSlides
              html={aula.slides}
              titulo={`Slides: ${aula.titulo}`}
              marca={marca}
              materialId={aula.slidesId}
              dica="Clique no slide e use as setas do teclado, ou deslize o dedo, para avançar e voltar. No celular, toque em Tela cheia e deite o aparelho."
            />
          ) : (
            <p className="cartao aula-vazio">Os slides desta aula ainda não foram enviados.</p>
          )}
        </section>

        <aside className="aula-lateral" aria-label="Sobre a aula">
          <section className="cartao aula-cartao" aria-labelledby="aula-nesta">
            <h2 id="aula-nesta">Nesta aula</h2>
            {aula.topicos.length > 0 ? (
              <ul className="aula-topicos" role="list">
                {aula.topicos.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="aula-vazio-texto">O professor ainda não listou os tópicos.</p>
            )}
          </section>
          <section className="cartao aula-cartao" aria-labelledby="aula-exercicios">
            <h2 id="aula-exercicios">Exercícios</h2>
            {aula.exercicios.length > 0 ? (
              <ul className="aula-exercicios" role="list">
                {aula.exercicios.map((e) => (
                  <li key={e.id}>
                    <Link to={`/exercicio/${e.id}`} className="botao aula-exercicio">
                      <span>{e.titulo}</span>
                      <span className="aula-exercicio-xp">+{XP_POR_DIFICULDADE[e.dificuldade as 1 | 2 | 3] ?? 20} XP</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="aula-vazio-texto">Esta aula não tem exercícios.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="aula-apostila" aria-labelledby="aula-apostila-titulo">
        <h2 id="aula-apostila-titulo">Apostila</h2>
        {aula.apostila ? (
          <PalcoDeSlides
            html={aula.apostila}
            titulo={`Apostila: ${aula.titulo}`}
            marca={marca}
            rotuloTelaCheia="Ler em tela cheia"
            proporcao="texto"
          />
        ) : (
          <p className="cartao aula-vazio">A apostila desta aula ainda não foi enviada.</p>
        )}
      </section>

      {aula.audio ? <AudioDaAula aulaId={aula.id} caminho={aula.audio} daXp={ehAluno && !comoAluno} /> : null}
    </div>
  )
}

function AudioDaAula({ aulaId, caminho, daXp }: { aulaId: number; caminho: string; daXp: boolean }) {
  const [endereco, setEndereco] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (endereco) URL.revokeObjectURL(endereco)
    }
  }, [endereco])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      setEndereco(await carregarAudio(caminho))
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <section className="cartao aula-audio" aria-labelledby="aula-audio-titulo">
      <h2 id="aula-audio-titulo">Áudio da aula</h2>
      <p className="campo-dica">{daXp ? 'Ouça até o fim e ganhe +10 XP (uma vez por aula).' : 'Áudio da aula.'}</p>
      {endereco ? (
        <audio
          className="aula-player"
          controls
          controlsList="nodownload"
          src={endereco}
          onContextMenu={(e) => e.preventDefault()}
          onEnded={() => {
            if (daXp) registrarAudioOuvido(aulaId).then(anunciarConquista, () => {})
          }}
        >
          Seu navegador não toca este áudio.
        </audio>
      ) : (
        <button type="button" className="botao botao-primario" onClick={carregar} disabled={carregando}>
          {carregando ? 'Carregando…' : 'Carregar o áudio'}
        </button>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </section>
  )
}
