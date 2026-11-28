import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, basicSetup } from 'codemirror'
import { indentUnit } from '@codemirror/language'
import { StateEffect, StateField, type Extension } from '@codemirror/state'
import { Decoration, type DecorationSet } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import type { Linguagem } from './linguagens'
import './EditorCodigo.css'

const CORES = { python: () => python(), javascript: () => javascript(), html: () => html() }

// Linha com erro: fundo vermelho fraco na linha que o erro apontou.
const marcarLinha = StateEffect.define<number | null>()
const decoracaoDoErro = Decoration.line({ class: 'editor-codigo-linha-erro' })
const linhaDoErro: Extension = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(atual, tr) {
    let deco = atual.map(tr.changes)
    for (const e of tr.effects) {
      if (!e.is(marcarLinha)) continue
      const n = e.value
      deco = n !== null && n >= 1 && n <= tr.state.doc.lines ? Decoration.set([decoracaoDoErro.range(tr.state.doc.line(n).from)]) : Decoration.none
    }
    // Mudou o código: a marca some, porque o erro pode já ter sido corrigido.
    return tr.docChanged ? Decoration.none : deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

interface Props {
  valor: string
  aoMudar: (codigo: string) => void
  rotulo: string
  /** Editor mais baixo, para trechos curtos (código inicial, solução). */
  baixo?: boolean
  linguagem?: Linguagem
  /** Modo prova: colar e soltar texto no editor ficam desligados. */
  bloquearColar?: boolean
  /** Chamado cada vez que um colar ou soltar foi barrado. */
  aoBloquearColar?: () => void
  /**
   * Linha (a partir de 1) onde o último erro aconteceu; fica marcada até o código mudar.
   * Um objeto novo a cada execução, para marcar de novo a mesma linha.
   */
  erroNaLinha?: { linha: number } | null
}

/** Editor de código (CodeMirror 6) com cores da linguagem e números de linha. */
export function EditorCodigo({ valor, aoMudar, rotulo, baixo = false, linguagem = 'python', bloquearColar = false, aoBloquearColar, erroNaLinha = null }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const aoMudarAtual = useRef(aoMudar)
  aoMudarAtual.current = aoMudar
  const aoBloquearAtual = useRef(aoBloquearColar)
  aoBloquearAtual.current = aoBloquearColar

  useEffect(() => {
    if (!caixa.current) return
    const editor = new EditorView({
      doc: valor,
      parent: caixa.current,
      extensions: [
        basicSetup,
        linhaDoErro,
        CORES[linguagem](),
        oneDark,
        indentUnit.of(linguagem === 'python' ? '    ' : '  '),
        EditorView.contentAttributes.of({ 'aria-label': rotulo }),
        ...(bloquearColar
          ? [
              EditorView.domEventHandlers({
                paste: (evento) => {
                  evento.preventDefault()
                  aoBloquearAtual.current?.()
                  return true
                },
                drop: (evento) => {
                  evento.preventDefault()
                  aoBloquearAtual.current?.()
                  return true
                },
              }),
            ]
          : []),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) aoMudarAtual.current(u.state.doc.toString())
        }),
      ],
    })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
    }
    // O editor nasce uma vez (a linguagem não muda); mudanças de fora entram pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editor = view.current
    if (editor && editor.state.doc.toString() !== valor) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valor } })
    }
  }, [valor])

  useEffect(() => {
    const editor = view.current
    if (!editor) return
    const pedida = erroNaLinha?.linha ?? null
    const n = pedida !== null && pedida >= 1 && pedida <= editor.state.doc.lines ? pedida : null
    editor.dispatch({
      effects: [
        marcarLinha.of(n),
        ...(n !== null ? [EditorView.scrollIntoView(editor.state.doc.line(n).from, { y: 'nearest' })] : []),
      ],
    })
  }, [erroNaLinha])

  return <div ref={caixa} className={`editor-codigo${baixo ? ' editor-codigo-baixo' : ''}`} />
}
