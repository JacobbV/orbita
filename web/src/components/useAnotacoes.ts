import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { carregarAnotacoes, guardarAnotacoes } from '../lib/anotacoes'
import { mensagemDeErro } from '../lib/erros'
import {
  CORES_DO_LAPIS,
  ESPESSURAS,
  LIMITE_DE_TEXTO,
  MAX_TRACOS_POR_SLIDE,
  tamanhoDosRabiscos,
  type RabiscosPorSlide,
  type Traco,
} from '../lib/rabiscos'

export type Ferramenta = 'nada' | 'lapis' | 'marca-texto' | 'borracha'
export type EstadoDoSalvamento = 'parado' | 'salvando' | 'salvo' | 'erro'

/** Tempo sem rabiscar antes de guardar no banco. */
const ESPERA_PARA_SALVAR_MS = 1500

/**
 * Marcador de página e rabiscos de uma pessoa nos slides. Os rabiscos são
 * guardados sozinhos, um instante depois do último traço; o marcador vai na hora.
 */
export function useAnotacoes(materialId: number | null, usuarioId: string | null, moldura: RefObject<HTMLIFrameElement | null>) {
  const ativo = materialId !== null && usuarioId !== null
  const [carregado, setCarregado] = useState(false)
  const [marcador, setMarcador] = useState<number | null>(null)
  const [rabiscos, setRabiscos] = useState<RabiscosPorSlide>({})
  const [slideAtual, setSlideAtual] = useState<number | null>(null)
  const [ferramenta, setFerramenta] = useState<Ferramenta>('nada')
  const [cor, setCor] = useState<string>(CORES_DO_LAPIS[1].valor)
  const [espessura, setEspessura] = useState<number>(ESPESSURAS[1].valor)
  const [salvamento, setSalvamento] = useState<EstadoDoSalvamento>('parado')
  const [aviso, setAviso] = useState<string | null>(null)
  /** Slide onde a pessoa parou da outra vez, oferecido uma vez ao abrir. */
  const [retomar, setRetomar] = useState<number | null>(null)
  const ofereceu = useRef(false)
  const sujo = useRef(false)
  // O que já se sabe, para decidir fora da renderização se oferece "continuar de onde parou".
  const sabido = useRef<{ marcador: number | null; slide: number | null; carregado: boolean }>({
    marcador: null,
    slide: null,
    carregado: false,
  })
  const ultimos = useRef<RabiscosPorSlide>({})

  /** Oferece uma vez, quando já se sabe o marcador e o slide aberto. */
  const talvezOferecer = useCallback(() => {
    const { marcador: m, slide, carregado: pronto } = sabido.current
    if (ofereceu.current || !pronto || slide === null) return
    ofereceu.current = true
    if (m !== null && m !== slide) setRetomar(m)
  }, [])

  // Carrega o que já foi guardado.
  useEffect(() => {
    if (!ativo) return
    let vivo = true
    carregarAnotacoes(materialId)
      .then((a) => {
        if (!vivo) return
        ultimos.current = a.rabiscos
        sabido.current = { ...sabido.current, marcador: a.marcador, carregado: true }
        setMarcador(a.marcador)
        setRabiscos(a.rabiscos)
        setCarregado(true)
        talvezOferecer()
      })
      .catch(() => {
        // Marcador e rabiscos são um extra: sem eles, os slides abrem do mesmo jeito.
      })
    return () => {
      vivo = false
    }
  }, [ativo, materialId, talvezOferecer])

  // Descobre qual slide está aberto: o slide avisa (mensagem da moldura isolada).
  useEffect(() => {
    if (!ativo) return
    const aoReceber = (e: MessageEvent) => {
      if (e.source !== moldura.current?.contentWindow) return
      const d = e.data as { orbita?: unknown; n?: unknown } | null
      if (d?.orbita !== 'slide' || typeof d.n !== 'number' || !Number.isInteger(d.n) || d.n < 1 || d.n > 999) return
      sabido.current = { ...sabido.current, slide: d.n }
      setSlideAtual(d.n)
      // Ao abrir, se a pessoa tinha parado em outro slide, oferece continuar de lá.
      talvezOferecer()
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [ativo, moldura, talvezOferecer])

  const irPara = useCallback(
    (n: number) => moldura.current?.contentWindow?.postMessage({ orbita: 'ir', n }, '*'),
    [moldura],
  )
  const mover = useCallback(
    (d: 1 | -1) => moldura.current?.contentWindow?.postMessage({ orbita: 'mover', d }, '*'),
    [moldura],
  )

  const guardar = useCallback(async () => {
    if (!ativo || !sujo.current) return
    sujo.current = false
    setSalvamento('salvando')
    try {
      await guardarAnotacoes(usuarioId, materialId, { rabiscos: ultimos.current })
      setSalvamento((s) => (sujo.current ? s : 'salvo'))
    } catch (e) {
      sujo.current = true
      setSalvamento('erro')
      setAviso(`Não deu para guardar os rabiscos: ${mensagemDeErro(e)}`)
    }
  }, [ativo, usuarioId, materialId])

  // Guarda um instante depois do último traço, e ao sair da página.
  useEffect(() => {
    if (!sujo.current) return
    const espera = setTimeout(() => void guardar(), ESPERA_PARA_SALVAR_MS)
    return () => clearTimeout(espera)
  }, [rabiscos, guardar])
  useEffect(() => {
    const aoSair = () => void guardar()
    window.addEventListener('pagehide', aoSair)
    return () => {
      window.removeEventListener('pagehide', aoSair)
      void guardar()
    }
  }, [guardar])

  /** Troca os traços de um slide. Recusa quando passa do limite do que cabe guardar. */
  const mudarTracos = useCallback((slide: number, tracos: Traco[]) => {
    const novo = { ...ultimos.current }
    if (tracos.length === 0) delete novo[String(slide)]
    else novo[String(slide)] = tracos
    const antes = ultimos.current[String(slide)]?.length ?? 0
    if (tracos.length > antes && (tracos.length > MAX_TRACOS_POR_SLIDE || tamanhoDosRabiscos(novo) > LIMITE_DE_TEXTO)) {
      setAviso('Já tem rabisco demais neste slide. Apague alguns ou limpe o slide para continuar.')
      return false
    }
    setAviso(null)
    sujo.current = true
    setSalvamento('parado')
    ultimos.current = novo
    setRabiscos(novo)
    return true
  }, [])

  const alternarMarcador = useCallback(async () => {
    if (!ativo || slideAtual === null) return
    const novo = marcador === slideAtual ? null : slideAtual
    const antes = marcador
    sabido.current = { ...sabido.current, marcador: novo }
    setMarcador(novo)
    setRetomar(null)
    setAviso(null)
    try {
      await guardarAnotacoes(usuarioId, materialId, { marcador: novo })
    } catch (e) {
      sabido.current = { ...sabido.current, marcador: antes }
      setMarcador(antes)
      setAviso(`Não deu para guardar o marcador: ${mensagemDeErro(e)}`)
    }
  }, [ativo, slideAtual, marcador, usuarioId, materialId])

  return {
    ativo,
    carregado,
    marcador,
    rabiscos,
    slideAtual,
    ferramenta,
    cor,
    espessura,
    salvamento,
    aviso,
    retomar,
    setFerramenta,
    setCor,
    setEspessura,
    setAviso,
    dispensarRetomar: () => setRetomar(null),
    irPara,
    mover,
    mudarTracos,
    alternarMarcador,
  }
}

export type Anotacoes = ReturnType<typeof useAnotacoes>
