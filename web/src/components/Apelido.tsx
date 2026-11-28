import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { escolherApelido, sortearApelido } from '../lib/apelidos'
import { mensagemDeErro } from '../lib/erros'
import './Apelido.css'

/**
 * Sorteio do apelido. Não há campo para digitar: o apelido sai de uma lista
 * aprovada (nome + adjetivo), então ninguém escreve nada ofensivo.
 */
export function EscolherApelido({
  titulo = 'Seu apelido na nave',
  ninja,
}: {
  titulo?: string
  /** Modo Ninja: o apelido do ninja fica só no navegador e não ocupa a lista da nave. */
  ninja?: { atual: string | null; aoUsar: (apelido: string) => void }
}) {
  const { perfil, recarregarPerfil } = useAuth()
  const atual = ninja ? ninja.atual : (perfil?.apelido ?? null)
  const [sugestao, setSugestao] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  async function sortear() {
    setOcupado(true)
    setErro(null)
    setSalvo(false)
    try {
      setSugestao(await sortearApelido(sugestao ?? atual))
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  async function usar() {
    if (!sugestao) return
    setOcupado(true)
    setErro(null)
    try {
      if (ninja) {
        ninja.aoUsar(sugestao)
      } else {
        await escolherApelido(sugestao)
        await recarregarPerfil()
      }
      setSugestao(null)
      setSalvo(true)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="cartao apelido" aria-label={titulo}>
      <p className="pixel apelido-selo">{titulo}</p>
      {sugestao ? (
        <>
          <p className="apelido-texto">O sorteio deu:</p>
          <p className="pixel apelido-nome apelido-sugestao" aria-live="polite">
            {sugestao}
          </p>
          <div className="apelido-acoes">
            <button type="button" className="botao botao-primario" onClick={usar} disabled={ocupado}>
              Usar este
            </button>
            <button type="button" className="botao" onClick={sortear} disabled={ocupado}>
              Sortear de novo
            </button>
            {atual && (
              <button type="button" className="botao" onClick={() => setSugestao(null)} disabled={ocupado}>
                Manter {atual}
              </button>
            )}
          </div>
        </>
      ) : atual ? (
        <>
          <p className="pixel apelido-nome">{atual}</p>
          <div className="apelido-acoes">
            <button type="button" className="botao" onClick={sortear} disabled={ocupado}>
              {ocupado ? 'Sorteando…' : 'Sortear outro'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="apelido-texto">
            {ninja
              ? 'O ninja ainda não tem apelido. Sorteie como os alunos sorteiam: ele fica só no Modo Ninja e não muda o seu apelido de professor.'
              : 'Você ainda não tem apelido. Ele sai de uma lista da nave, com milhares de combinações, e ninguém tem um igual.'}
          </p>
          <div className="apelido-acoes">
            <button type="button" className="botao botao-primario" onClick={sortear} disabled={ocupado}>
              {ocupado ? 'Sorteando…' : 'Sortear apelido'}
            </button>
          </div>
        </>
      )}
      <p role="status" className={`apelido-status${erro ? ' apelido-erro' : ''}`}>
        {erro ?? (salvo ? 'Apelido salvo!' : '')}
      </p>
    </section>
  )
}
