import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, basicSetup } from 'codemirror'
import { indentUnit } from '@codemirror/language'
import { useEffect, useRef } from 'react'

interface Props {
  valor: string
  aoMudar: (codigo: string) => void
  rotulo: string
}

/** Editor de código (CodeMirror 6) com cores do Python e números de linha. */
export function EditorCodigo({ valor, aoMudar, rotulo }: Props) {
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
        python(),
        oneDark,
        indentUnit.of('    '),
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
    // O editor nasce uma vez; mudanças de fora entram pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editor = view.current
    if (editor && editor.state.doc.toString() !== valor) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valor } })
    }
  }, [valor])

  return <div ref={caixa} className="editor-codigo" />
}
