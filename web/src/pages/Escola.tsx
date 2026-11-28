import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { ALTURA_MAPA, LARGURA_MAPA, TILE, desenharAndar, type Andar, type Sala } from '../arte/escola'
import { desenharPlacas } from '../arte/escola-placas'
import { coresDoMini, miniBonecoPixels } from '../arte/escola-boneco'
import type { Escolhas } from '../arte/avatar'
import { carregarAvatar, carregarAvatarNinja } from '../lib/avatar'
import {
  INICIO,
  acaoDaSala,
  andar as andarPasso,
  aulasLiberadas,
  caminho,
  escadaNoPonto,
  exerciciosLiberados,
  salaDoJogador,
  tileDoPonto,
  usarEscada,
  type Jogador,
} from '../lib/escola'
import { listarOfertas } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { carregarPonte, carregarPonteNinja, type DisciplinaDaPonte } from '../lib/ponte'
import { useModoNinja } from '../ninja/ModoNinja'
import './Escola.css'

const LARGURA = LARGURA_MAPA * TILE
const ALTURA = ALTURA_MAPA * TILE
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
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!perfilId) return
    let ativo = true
    const papel = perfil?.papel === 'professor' ? 'professor' : 'aluno'
    ;(ninja ? carregarAvatarNinja(perfilId) : carregarAvatar(perfilId, papel)).then(
      (a) => ativo && setAvatar(a),
      (e: unknown) => ativo && setErro(mensagemDeErro(e)),
    )
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
  return <Mapa escolhas={avatar} disciplinas={disciplinas ?? []} />
}

function Mapa({ escolhas, disciplinas }: { escolhas: Escolhas; disciplinas: DisciplinaDaPonte[] }) {
  const palco = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const jogador = useRef<Jogador>({ ...INICIO })
  const teclas = useRef(new Set<string>())
  const rota = useRef<[number, number][]>([])
  const naEscada = useRef(false)
  const escala = useRef(2)
  const [sala, setSala] = useState<Sala | null>(null)
  const [andarAtual, setAndarAtual] = useState<Andar>('terreo')

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
      const h = Math.max(280, Math.min(window.innerHeight - 220, Math.round(w * 0.75)))
      cv.width = w
      cv.height = h
      // Escala inteira, para o pixel ficar nítido: cerca de 11 tiles no celular e 26 no monitor grande.
      escala.current = Math.max(2, Math.floor(w / 400))
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(caixa)
    window.addEventListener('resize', medir)

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
      if (dx !== 0 || dy !== 0) {
        rota.current = []
        const novo = andarPasso(j, dx, dy, dt)
        andando = novo.x !== j.x || novo.y !== j.y
        j = novo
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
      const spr = quadros[`${j.direcao}${quadro}`]
      if (spr) {
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
    const rotaNova = caminho(j.andar, tileDoPonto(j.x, j.y), alvo)
    if (rotaNova) rota.current = rotaNova
  }, [])

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
          Toque no chão para andar, ou use as setas e as teclas W, A, S, D. Entre numa sala acesa para abrir o que ela guarda. As escadas levam ao outro andar.
        </p>
      </header>

      <div className="escola-palco" ref={palco}>
        <canvas ref={tela} className="escola-tela" onPointerDown={tocar} role="img" aria-label={`Mapa da escola, ${andarAtual === 'terreo' ? 'térreo' : 'andar de cima'}`} />
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
      </div>

      <PainelDaSala sala={sala} disciplinas={disciplinas} />
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
