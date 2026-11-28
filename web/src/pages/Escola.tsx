import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { ALTURA_MAPA, LARGURA_MAPA, TILE, desenharAndar, salasDo, type Andar, type Sala } from '../arte/escola'
import { corDaSala, desenharPlacas, nomeNoMapa } from '../arte/escola-placas'
import { coresDoMini, miniBonecoPixels } from '../arte/escola-boneco'
import type { Escolhas } from '../arte/avatar'
import { carregarAvatar, carregarAvatarNinja } from '../lib/avatar'
import {
  INICIO,
  acaoDaSala,
  andar as andarPasso,
  assentoPerto,
  assentosDo,
  aulasLiberadas,
  avisosDoQuadro,
  caminho,
  escadaNoPonto,
  exerciciosLiberados,
  salaDoJogador,
  sentar,
  sinaisDoQuadro,
  tileDoPonto,
  usarEscada,
  type Jogador,
} from '../lib/escola'
import { listarOfertas } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { carregarPonte, carregarPonteNinja, type DisciplinaDaPonte } from '../lib/ponte'
import { dataHora, minhasProvas, type ProvaDoAluno } from '../lib/provas'
import { useModoNinja } from '../ninja/ModoNinja'
import './Escola.css'

const LARGURA = LARGURA_MAPA * TILE
const ALTURA = ALTURA_MAPA * TILE
const TECLAS_SENTAR = new Set(['e', 'E', 'Enter', ' '])
const TECLAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
}

function pintarAndar(andar: Andar): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = LARGURA
  cv.height = ALTURA
  const ctx = cv.getContext('2d')
  if (ctx) {
    desenharAndar(andar, (x, y, w, h, cor) => {
      ctx.fillStyle = cor
      ctx.fillRect(x, y, w, h)
    })
    desenharPlacas(ctx, andar)
  }
  return cv
}

/** Os 12 quadros do mini-boneco (4 direções × parado e dois passos), já desenhados. */
function pintarQuadros(escolhas: Escolhas): Record<string, HTMLCanvasElement> {
  const cores = coresDoMini(escolhas)
  const saida: Record<string, HTMLCanvasElement> = {}
  for (const d of ['baixo', 'cima', 'esquerda', 'direita'] as const) {
    for (const q of [0, 1, 2] as const) {
      const px = miniBonecoPixels(cores, d, q)
      const cv = document.createElement('canvas')
      cv.width = px[0]?.length ?? 14
      cv.height = px.length
      const ctx = cv.getContext('2d')
      px.forEach((linha, y) => linha.forEach((cor, x) => {
        if (cor && ctx) {
          ctx.fillStyle = cor
          ctx.fillRect(x, y, 1, 1)
        }
      }))
      saida[`${d}${q}`] = cv
    }
  }
  return saida
}

/** Escola virtual (degrau 1): o Bloco 1 do IF em dois andares, com o mini-boneco do aluno. */
export function Escola() {
  const { perfil } = useAuth()
  const ninja = useModoNinja().ativo
  const perfilId = perfil?.id
  const [avatar, setAvatar] = useState<Escolhas | null>(null)
  const [disciplinas, setDisciplinas] = useState<DisciplinaDaPonte[] | null>(null)
  const [provas, setProvas] = useState<ProvaDoAluno[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!perfilId) return
    let ativo = true
    const papel = perfil?.papel === 'professor' ? 'professor' : 'aluno'
    ;(ninja ? carregarAvatarNinja(perfilId) : carregarAvatar(perfilId, papel)).then(
      (a) => ativo && setAvatar(a),
      (e: unknown) => ativo && setErro(mensagemDeErro(e)),
    )
    // As provas do quadro são as do aluno; no Modo Ninja o quadro mostra só os exercícios.
    if (!ninja) minhasProvas().then((p) => ativo && setProvas(p), () => {})
    const dados = ninja ? listarOfertas().then(carregarPonteNinja) : carregarPonte().then((d) => d.disciplinas)
    dados.then(
      (d) => ativo && setDisciplinas(d),
      () => ativo && setDisciplinas([]),
    )
    return () => {
      ativo = false
    }
  }, [perfilId, perfil?.papel, ninja])

  if (erro) {
    return (
      <div className="escola container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a escola">
          {erro}
        </Aviso>
      </div>
    )
  }
  if (!avatar) return <Carregando />
  return <Mapa escolhas={avatar} disciplinas={disciplinas ?? []} provas={provas} />
}

function Mapa({ escolhas, disciplinas, provas }: { escolhas: Escolhas; disciplinas: DisciplinaDaPonte[]; provas: ProvaDoAluno[] }) {
  const palco = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const jogador = useRef<Jogador>({ ...INICIO })
  const teclas = useRef(new Set<string>())
  const rota = useRef<[number, number][]>([])
  const naEscada = useRef(false)
  const escala = useRef(2)
  const [sala, setSala] = useState<Sala | null>(null)
  const [andarAtual, setAndarAtual] = useState<Andar>('terreo')
  const [telaCheia, setTelaCheia] = useState(false)
  const [sentado, setSentado] = useState(false)
  const [quadroAberto, setQuadroAberto] = useState(false)
  const sentarAoChegar = useRef<string | null>(null)

  const andares = useMemo(() => ({ terreo: pintarAndar('terreo'), superior: pintarAndar('superior') }), [])
  const quadros = useMemo(() => pintarQuadros(escolhas), [escolhas])

  useEffect(() => {
    const cv = tela.current
    const caixa = palco.current
    if (!cv || !caixa) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let quadro = 0
    let passoTempo = 0
    let ultimo = performance.now()
    let anterior = ''

    const medir = () => {
      const w = Math.max(240, caixa.clientWidth)
      const cheia = document.fullscreenElement === caixa
      const h = cheia ? Math.max(280, caixa.clientHeight) : Math.max(280, Math.min(window.innerHeight - 220, Math.round(w * 0.75)))
      cv.width = w
      cv.height = h
      // Escala inteira, para o pixel ficar nítido: cerca de 11 tiles no celular e 26 no monitor grande.
      escala.current = Math.max(2, Math.floor(w / 400))
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(caixa)
    window.addEventListener('resize', medir)
    document.addEventListener('fullscreenchange', medir)

    let raf = 0
    const ciclo = (agora: number) => {
      const dt = (agora - ultimo) / 1000
      ultimo = agora
      let j = jogador.current
      let dx = 0
      let dy = 0
      for (const t of teclas.current) {
        const v = TECLAS[t]
        if (v) {
          dx += v[0]
          dy += v[1]
        }
      }
      let andando = false
      if (j.sentado && (dx !== 0 || dy !== 0)) {
        j = { andar: j.andar, x: j.x, y: j.y, direcao: j.direcao }
        setSentado(false)
      }
      if (dx !== 0 || dy !== 0) {
        rota.current = []
        const novo = andarPasso(j, dx, dy, dt)
        andando = novo.x !== j.x || novo.y !== j.y
        j = novo
      } else if (j.sentado) {
        // parado na cadeira
      } else if (rota.current.length > 0) {
        const alvo = rota.current[0]
        if (alvo) {
          const ax = alvo[0] * TILE + TILE / 2
          const ay = alvo[1] * TILE + TILE - 3
          const ddx = ax - j.x
          const ddy = ay - j.y
          if (Math.hypot(ddx, ddy) < 2) rota.current.shift()
          else {
            const novo = andarPasso(j, ddx, ddy, dt)
            andando = novo.x !== j.x || novo.y !== j.y
            // Preso numa quina: pula para o próximo ponto.
            if (!andando) rota.current.shift()
            j = novo
          }
        }
      }
      if (!j.sentado && rota.current.length === 0 && sentarAoChegar.current) {
        const alvo = assentosDo(j.andar).find((x) => x.id === sentarAoChegar.current)
        sentarAoChegar.current = null
        if (alvo && Math.hypot(alvo.x - j.x, alvo.y - j.y) < 20) {
          j = sentar(j, alvo)
          setSentado(true)
        }
      }
      // Escada: vale só ao pisar nela vindo de fora.
      const escada = escadaNoPonto(j)
      if (escada && !naEscada.current) {
        j = usarEscada(j, escada)
        rota.current = []
        naEscada.current = true
        setAndarAtual(j.andar)
      } else if (!escada) naEscada.current = false
      jogador.current = j
      passoTempo += andando ? dt : 0
      quadro = andando ? 1 + (Math.floor(passoTempo / 0.16) % 2) : 0

      const s = salaDoJogador(j)
      const id = s?.id ?? ''
      if (id !== anterior) {
        anterior = id
        setSala(s ?? null)
      }

      // câmera
      const e = escala.current
      const w = cv.width
      const h = cv.height
      let camX = j.x * e - w / 2
      let camY = (j.y - 8) * e - h / 2
      camX = Math.max(0, Math.min(LARGURA * e - w, camX))
      camY = Math.max(0, Math.min(ALTURA * e - h, camY))
      if (LARGURA * e < w) camX = -(w - LARGURA * e) / 2
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = '#0B0E1F'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(andares[j.andar], -camX, -camY, LARGURA * e, ALTURA * e)
      // Nomes das salas: flutuam por cima da parede de cima, sem tapar os móveis.
      ctx.font = `${Math.round(4.5 * e)}px 'Orbita Pixel Acentos', 'Press Start 2P', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const sl of salasDo(j.andar)) {
        if (!sl.ativa) continue
        const nome = nomeNoMapa(sl.nome)
        const lx = Math.round((sl.x + sl.w / 2) * TILE * e - camX)
        const ly = Math.round(((sl.y - 1) * TILE + 9) * e - camY)
        if (lx < -200 || lx > w + 200 || ly < -20 || ly > h + 20) continue
        const tw = ctx.measureText(nome).width + 4 * e
        ctx.fillStyle = 'rgba(11,14,31,0.82)'
        ctx.fillRect(Math.round(lx - tw / 2), ly - 5 * e, Math.round(tw), 10 * e)
        ctx.fillStyle = corDaSala(sl.tipo)
        ctx.fillRect(Math.round(lx - tw / 2), ly + 5 * e - Math.max(1, e / 2), Math.round(tw), Math.max(1, e / 2))
        ctx.fillStyle = '#E5E7F5'
        ctx.fillText(nome, lx, ly)
      }
      // Sinal de aviso: sobe e desce ao lado do quadro; tocar nele abre o quadro de avisos.
      const balanco = Math.sin(agora / 300) * 2
      for (const sinal of sinaisDoQuadro(j.andar)) {
        const bx = Math.round(sinal.x * e - camX)
        const by = Math.round((sinal.y + balanco) * e - camY)
        ctx.fillStyle = '#FBBF24'
        ctx.beginPath()
        ctx.moveTo(bx, by - 5 * e)
        ctx.lineTo(bx + 5 * e, by + 4 * e)
        ctx.lineTo(bx - 5 * e, by + 4 * e)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#0B0E1F'
        ctx.fillRect(bx - e / 2, by - 2 * e, e, 3 * e)
        ctx.fillRect(bx - e / 2, by + 2 * e, e, e)
      }
      const spr = quadros[`${j.direcao}${quadro}`]
      if (spr && j.sentado) {
        // sentado: só o corpo de cima aparece, as pernas ficam atrás da mesa
        const sx = Math.round(j.x * e - camX)
        const sy = Math.round(j.y * e - camY)
        const corte = spr.height - 6
        ctx.drawImage(spr, 0, 0, spr.width, corte, sx - (spr.width / 2) * e, sy - (spr.height - 1) * e + 3 * e, spr.width * e, corte * e)
      } else if (spr) {
        const sx = Math.round(j.x * e - camX)
        const sy = Math.round(j.y * e - camY)
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fillRect(sx - 5 * e, sy - 1 * e, 10 * e, 2 * e)
        ctx.drawImage(spr, sx - (spr.width / 2) * e, sy - (spr.height - 1) * e, spr.width * e, spr.height * e)
      }
      raf = requestAnimationFrame(ciclo)
    }
    raf = requestAnimationFrame(ciclo)

    const baixo = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return
      if (TECLAS_SENTAR.has(ev.key)) {
        const j = jogador.current
        if (j.sentado) {
          jogador.current = { andar: j.andar, x: j.x, y: j.y, direcao: j.direcao }
          setSentado(false)
        } else {
          const lugar = assentoPerto(j.andar, j.x, j.y)
          if (lugar) {
            jogador.current = sentar(j, lugar)
            rota.current = []
            setSentado(true)
          }
        }
        ev.preventDefault()
        return
      }
      if (TECLAS[ev.key]) {
        teclas.current.add(ev.key)
        ev.preventDefault()
      }
    }
    const cima = (ev: KeyboardEvent) => teclas.current.delete(ev.key)
    window.addEventListener('keydown', baixo)
    window.addEventListener('keyup', cima)
    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      window.removeEventListener('resize', medir)
      document.removeEventListener('fullscreenchange', medir)
      window.removeEventListener('keydown', baixo)
      window.removeEventListener('keyup', cima)
    }
  }, [andares, quadros])

  const tocar = useCallback((ev: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = tela.current
    if (!cv) return
    const r = cv.getBoundingClientRect()
    const e = escala.current
    const j = jogador.current
    const px = ((ev.clientX - r.left) * (cv.width / r.width))
    const py = ((ev.clientY - r.top) * (cv.height / r.height))
    let camX = j.x * e - cv.width / 2
    let camY = (j.y - 8) * e - cv.height / 2
    camX = Math.max(0, Math.min(LARGURA * e - cv.width, camX))
    camY = Math.max(0, Math.min(ALTURA * e - cv.height, camY))
    if (LARGURA * e < cv.width) camX = -(cv.width - LARGURA * e) / 2
    const alvo: [number, number] = [Math.floor((px + camX) / e / TILE), Math.floor((py + camY) / e / TILE)]
    const mx = (px + camX) / e
    const my = (py + camY) / e
    if (sinaisDoQuadro(j.andar).some((sn) => Math.hypot(sn.x - mx, sn.y - my) < 12)) {
      setQuadroAberto(true)
      return
    }
    const cadeira = assentoPerto(j.andar, mx, my, 12)
    if (j.sentado) jogador.current = { andar: j.andar, x: j.x, y: j.y, direcao: j.direcao }
    setSentado(false)
    const base = jogador.current
    const destino: [number, number] = cadeira ? tileDoPonto(cadeira.x, cadeira.y) : alvo
    const rotaNova = caminho(base.andar, tileDoPonto(base.x, base.y), destino)
    if (rotaNova) {
      rota.current = rotaNova
      sentarAoChegar.current = cadeira?.id ?? null
    }
  }, [])

  const alternarTelaCheia = () => {
    const caixa = palco.current
    if (!caixa) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void caixa.requestFullscreen?.()
  }
  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === palco.current)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])
  const levantarOuSentar = () => {
    const j = jogador.current
    if (j.sentado) {
      jogador.current = { andar: j.andar, x: j.x, y: j.y, direcao: j.direcao }
      setSentado(false)
      return
    }
    const lugar = assentoPerto(j.andar, j.x, j.y)
    if (lugar) {
      jogador.current = sentar(j, lugar)
      rota.current = []
      setSentado(true)
    }
  }

  const mover = (dx: number, dy: number, ligar: boolean) => {
    const chave = dx < 0 ? 'ArrowLeft' : dx > 0 ? 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown'
    if (ligar) teclas.current.add(chave)
    else teclas.current.delete(chave)
  }

  return (
    <div className="escola container">
      <header className="escola-topo">
        <p className="pixel escola-selo">Escola virtual · Bloco 1</p>
        <h1>{andarAtual === 'terreo' ? 'Térreo' : 'Andar de cima'}</h1>
        <p className="escola-explica">
          Toque no chão para andar, ou use as setas e as teclas W, A, S, D. Toque numa cadeira (ou aperte E perto dela) para sentar. Entre numa sala acesa para abrir o que ela guarda. As escadas levam ao outro andar.
        </p>
      </header>

      <div className="escola-palco" ref={palco}>
        <canvas ref={tela} className="escola-tela" onPointerDown={tocar} role="img" aria-label={`Mapa da escola, ${andarAtual === 'terreo' ? 'térreo' : 'andar de cima'}`} />
        <div className="escola-ferramentas">
          <button type="button" className="escola-botao" onClick={levantarOuSentar} aria-pressed={sentado}>
            {sentado ? 'Levantar' : 'Sentar'}
          </button>
          <button type="button" className="escola-botao" onClick={alternarTelaCheia} aria-pressed={telaCheia}>
            {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
        </div>
        <div className="escola-direcional" aria-label="Botões para andar">
          {([['↑', 0, -1], ['←', -1, 0], ['↓', 0, 1], ['→', 1, 0]] as const).map(([seta, dx, dy]) => (
            <button
              key={seta}
              type="button"
              className="escola-seta"
              aria-label={`Andar para ${seta}`}
              data-seta={seta}
              onPointerDown={() => mover(dx, dy, true)}
              onPointerUp={() => mover(dx, dy, false)}
              onPointerLeave={() => mover(dx, dy, false)}
              onPointerCancel={() => mover(dx, dy, false)}
            >
              {seta}
            </button>
          ))}
        </div>
        {quadroAberto && <QuadroDeAvisos disciplinas={disciplinas} provas={provas} aoFechar={() => setQuadroAberto(false)} />}
        <PainelDaSala sala={sala} disciplinas={disciplinas} />
      </div>
    </div>
  )
}

function PainelDaSala({ sala, disciplinas }: { sala: Sala | null; disciplinas: DisciplinaDaPonte[] }) {
  if (!sala) {
    return (
      <section className="escola-painel cartao" aria-live="polite">
        <h2>No corredor</h2>
        <p>Entre numa sala acesa para ver o que ela guarda. As salas escuras estão fechadas.</p>
      </section>
    )
  }
  const acao = acaoDaSala(sala)
  return (
    <section className="escola-painel cartao" aria-live="polite">
      <p className="pixel escola-selo">{sala.nome}</p>
      <h2>{acao.tipo === 'nada' ? sala.nome : acao.titulo}</h2>
      {acao.tipo === 'nada' && <p>{acao.texto}</p>}
      {acao.tipo === 'link' && (
        <Link className="botao botao-primario" to={acao.para}>
          {acao.rotulo}
        </Link>
      )}
      {acao.tipo === 'aulas' && <ListaDeAulas disciplinas={disciplinas} />}
      {acao.tipo === 'exercicios' && <ListaDeExercicios disciplinas={disciplinas} />}
    </section>
  )
}

function ListaDeAulas({ disciplinas }: { disciplinas: DisciplinaDaPonte[] }) {
  const grupos = disciplinas.map((d) => ({ d, aulas: aulasLiberadas(d) })).filter((g) => g.aulas.length > 0)
  if (grupos.length === 0) return <p>Nenhuma aula liberada ainda. O professor libera uma a uma.</p>
  return (
    <>
      {grupos.map(({ d, aulas }) => (
        <div key={d.oferta.id} className="escola-grupo">
          <h3>{d.oferta.disciplina.sigla} · {d.oferta.turma.nome}</h3>
          <ul>
            {aulas.map((a) => (
              <li key={a.id}>
                <Link to={`/aula/${a.id}`}>
                  <span className="escola-rotulo">{a.rotulo}</span> {a.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function ListaDeExercicios({ disciplinas }: { disciplinas: DisciplinaDaPonte[] }) {
  const grupos = disciplinas.map((d) => ({ d, itens: exerciciosLiberados(d) })).filter((g) => g.itens.length > 0)
  if (grupos.length === 0) return <p>Nenhum exercício liberado ainda.</p>
  return (
    <>
      {grupos.map(({ d, itens }) => (
        <div key={d.oferta.id} className="escola-grupo">
          <h3>{d.oferta.disciplina.sigla} · {d.oferta.turma.nome}</h3>
          <ul>
            {itens.map((e) => (
              <li key={e.id}>
                <Link to={`/exercicio/${e.id}`}>
                  <span className="escola-rotulo">{e.rotulo}</span> {e.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function QuadroDeAvisos({ disciplinas, provas, aoFechar }: { disciplinas: DisciplinaDaPonte[]; provas: ProvaDoAluno[]; aoFechar: () => void }) {
  const { provas: marcadas, atividades } = avisosDoQuadro(disciplinas, provas)
  return (
    <section className="escola-quadro cartao" aria-label="Quadro de avisos">
      <div className="escola-quadro-topo">
        <h2>Quadro de avisos</h2>
        <button type="button" className="escola-botao" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      <h3>Provas marcadas</h3>
      {marcadas.length === 0 ? (
        <p>Nenhuma prova marcada.</p>
      ) : (
        <ul>
          {marcadas.map((p) => (
            <li key={p.id}>
              <Link to={`/prova/${p.id}`}>
                <span className="escola-rotulo">{p.estado === 'antes' ? `Abre ${dataHora(p.abreEm)}` : p.estado === 'aberta' ? 'Aberta agora' : 'Em andamento'}</span> {p.titulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h3>Exercícios para fazer</h3>
      {atividades.length === 0 ? (
        <p>Tudo em dia: nenhum exercício pendente.</p>
      ) : (
        <ul>
          {atividades.map((a) => (
            <li key={a.exercicio.id}>
              <Link to={`/exercicio/${a.exercicio.id}`}>
                <span className="escola-rotulo">{a.devolvida ? 'Devolvido, refaça' : a.rotuloDaAula}</span> {a.exercicio.titulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
