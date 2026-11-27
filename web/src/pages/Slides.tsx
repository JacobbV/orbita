import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, type To } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { PalcoDeSlides } from '../components/PalcoDeSlides'
import { mensagemDeErro } from '../lib/erros'
import { registrarAberturaEmSilencio } from '../lib/progresso'
import { carregarSlides, SlidesIndisponiveis, type SlidesDaAula } from '../lib/slides'
import './Slides.css'
import { useModoNinja } from '../ninja/ModoNinja'

/**
 * Slides HTML de uma aula, dentro de uma moldura isolada: os scripts do slide
 * rodam, mas não alcançam a página do Órbita nem a sessão de quem está vendo.
 */
export function Slides() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [slides, setSlides] = useState<SlidesDaAula | null>(null)
  const ehAluno = perfil?.papel === 'aluno'
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarSlides(Number(id))
      .then((s) => {
        if (!ativo) return
        setSlides(s)
        // Aluno ganha XP na primeira vez que abre a aula (o banco confere tudo).
        if (ehAluno) registrarAberturaEmSilencio(s.aulaId)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof SlidesIndisponiveis ? e.message : mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id, ehAluno])

  const ehProfessor = perfil?.papel === 'professor'
  const ninja = useModoNinja().ativo
  // "Ver como aluno": o professor vê a marca-d'água como o aluno veria (com um nome de exemplo).
  const comoAluno = ehProfessor && new URLSearchParams(location.search).get('comoAluno') === '1'
  const marca = comoAluno
    ? 'Nome do aluno · aluno@academico.ifpb.edu.br'
    : ehProfessor
      ? null
      : [perfil?.nome, perfil?.email].filter(Boolean).join(' · ')
  const voltar: To = ninja ? '/ninja' : perfil?.papel === 'professor' ? '/professor?aba=aulas' : '/ponte'
  // Quem chegou por dentro do site volta para a mesma tela (mesma turma e
  // disciplina no painel), como o botão Voltar do navegador ou do mouse.
  const veioDoSite = location.key !== 'default'
  function aoVoltar(e: MouseEvent<HTMLAnchorElement>) {
    if (!veioDoSite || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    void navigate(-1)
  }

  if (erro) {
    return (
      <div className="slides container">
        <Aviso tipo="erro" titulo="Não foi possível abrir os slides">
          {erro}
        </Aviso>
        <Link to={voltar} className="botao slides-voltar">
          Voltar
        </Link>
      </div>
    )
  }
  if (!slides) return <Carregando />

  return (
    <div className="slides container">
      <div className="slides-barra">
        <Link to={voltar} className="botao slides-voltar" onClick={aoVoltar}>
          <span aria-hidden="true">←</span> Voltar
        </Link>
        <div className="slides-nome">
          <p className="pixel slides-onde">{slides.onde}</p>
          <h1>{slides.titulo}</h1>
        </div>
      </div>
      <PalcoDeSlides
        html={slides.html}
        titulo={`Slides: ${slides.titulo}`}
        marca={marca}
        dica="Clique no slide e use as setas do teclado, ou deslize o dedo, para avançar e voltar. No celular, toque em Tela cheia e deite o aparelho."
      />
    </div>
  )
}
