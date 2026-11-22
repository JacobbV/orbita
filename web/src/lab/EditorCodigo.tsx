import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, basicSetup } from 'codemirror'
import { indentUnit } from '@codemirror/language'
import { useEffect, useRef } from 'react'
import type { Linguagem } from './linguagens'
import './EditorCodigo.css'

const CORES = { python: () => python(), javascript: () => javascript(), html: () => html() }

interface Props {
  valor: string
  aoMudar: (codigo: string) => void
  rotulo: string
  /** Editor mais baixo, para trechos curtos (código inicial, solução). */
  baixo?: boolean
  linguagem?: Linguagem
}

/** Editor de código (CodeMirror 6) com cores da linguagem e números de linha. */
export function EditorCodigo({ valor, aoMudar, rotulo, baixo = false, linguagem = 'python' }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const aoMudarAtual = useRef(aoMudar)
  aoMudarAtual.current = aoMudar

  useEffect(() => {
    if (!caixa.current) return
    const editor = new EditorView({
      doc: valor,
      parent: caixa.current,
      extensions: [
        basicSetup,
        CORES[linguagem](),
        oneDark,
        indentUnit.of(linguagem === 'python' ? '    ' : '  '),
        EditorView.contentAttributes.of({ 'aria-label': rotulo }),
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

  return <div ref={caixa} className={`editor-codigo${baixo ? ' editor-codigo-baixo' : ''}`} />
}
