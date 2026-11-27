import { useEffect, useRef, useState } from 'react'
import { carregarAnotacaoDaAula, guardarAnotacaoDaAula, LIMITE_DA_ANOTACAO } from '../lib/anotacoes'
import './AnotacoesDaAula.css'

type Estado = 'carregando' | 'pronto' | 'salvando' | 'salvo' | 'erro' | 'falha-ao-carregar'

const MENSAGENS: Record<Estado, string> = {
  carregando: 'Carregando…',
  pronto: 'Só você vê estas anotações.',
  salvando: 'Salvando…',
  salvo: 'Salvo. Só você vê estas anotações.',
  erro: 'Não foi possível salvar. Tente de novo em instantes.',
  'falha-ao-carregar': 'Não foi possível carregar as suas anotações.',
}

/** Bloco de anotações pessoais da aula, com salvamento automático. Só a própria pessoa lê. */
export function AnotacoesDaAula({ aulaId, usuarioId }: { aulaId: number; usuarioId: string }) {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<Estado>('carregando')
  const alterado = useRef(false)

  useEffect(() => {
    let ativo = true
    carregarAnotacaoDaAula(aulaId).then(
      (t) => {
        if (!ativo) return
        setTexto(t)
        setEstado('pronto')
      },
      () => {
        if (ativo) setEstado('falha-ao-carregar')
      },
    )
    return () => {
      ativo = false
    }
  }, [aulaId])

  useEffect(() => {
    if (!alterado.current) return
    const espera = setTimeout(() => {
      setEstado('salvando')
      guardarAnotacaoDaAula(usuarioId, aulaId, texto).then(
        () => setEstado('salvo'),
        () => setEstado('erro'),
      )
    }, 900)
    return () => clearTimeout(espera)
  }, [texto, aulaId, usuarioId])

  return (
    <section className="cartao aula-cartao" aria-labelledby="aula-anotacoes">
      <h2 id="aula-anotacoes">Anotações</h2>
      <div className="campo">
        <label className="sr-only" htmlFor="anotacoes-texto">
          Suas anotações desta aula
        </label>
        <textarea
          id="anotacoes-texto"
          rows={6}
          maxLength={LIMITE_DA_ANOTACAO}
          value={texto}
          disabled={estado === 'carregando' || estado === 'falha-ao-carregar'}
          placeholder="Escreva aqui o que quiser lembrar desta aula."
          onChange={(e) => {
            alterado.current = true
            setTexto(e.target.value)
          }}
        />
      </div>
      <p className={`campo-dica anotacoes-estado${estado === 'erro' ? ' anotacoes-erro' : ''}`} role="status">
        {MENSAGENS[estado]}
      </p>
    </section>
  )
}
