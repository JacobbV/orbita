import { describe, expect, it } from 'vitest'
import type { Pedido, StatusPedido } from './api'
import { rotaInicial, situacoesPorOferta } from './rotas'

function pedido(id: number, ofertaId: number, disciplinaId: number, status: StatusPedido, tentativa: number): Pedido {
  return {
    id,
    status,
    tentativa,
    motivoRecusa: status === 'recusado' ? 'Motivo fictício' : null,
    quemEVoce: 'Tripulante Fictício, 1º INFO M, manhã',
    criadoEm: '2026-11-22T00:00:00Z',
    oferta: {
      id: ofertaId,
      turma: { id: ofertaId, nome: `Turma ${ofertaId}`, turno: 'manha', anoLetivo: 2026 },
      disciplina: { id: disciplinaId, sigla: `D${disciplinaId}`, nome: `Disciplina ${disciplinaId}` },
    },
  }
}

describe('rotaInicial', () => {
  it('manda o professor para o painel', () => {
    expect(rotaInicial({ papel: 'professor' }, [])).toBe('/professor')
  })
  it('manda o aluno aprovado em alguma disciplina para a ponte', () => {
    expect(rotaInicial({ papel: 'aluno' }, [{ status: 'pendente' }, { status: 'aprovado' }])).toBe('/ponte')
  })
  it('manda o aluno sem aprovação para "Aguardando aprovação"', () => {
    expect(rotaInicial({ papel: 'aluno' }, [{ status: 'pendente' }])).toBe('/aguardando')
    expect(rotaInicial({ papel: 'aluno' }, [{ status: 'recusado' }])).toBe('/aguardando')
    expect(rotaInicial({ papel: 'aluno' }, [])).toBe('/aguardando')
  })
  it('sem perfil, volta para o login', () => {
    expect(rotaInicial(null, [])).toBe('/entrar')
  })
})

describe('situacoesPorOferta', () => {
  it('recusado com tentativas sobrando pode pedir de novo', () => {
    const [s] = situacoesPorOferta([pedido(1, 10, 1, 'recusado', 1)])
    expect(s?.podeTentarDeNovo).toBe(true)
    expect(s?.tentativasUsadas).toBe(1)
  })

  it('depois de 3 tentativas na mesma turma não pode mais', () => {
    const [s] = situacoesPorOferta([
      pedido(1, 10, 1, 'recusado', 1),
      pedido(2, 10, 1, 'recusado', 2),
      pedido(3, 10, 1, 'recusado', 3),
    ])
    expect(s?.pedido.id).toBe(3)
    expect(s?.podeTentarDeNovo).toBe(false)
  })

  it('não oferece nova tentativa se a disciplina já tem pedido ativo em outra turma', () => {
    const situacoes = situacoesPorOferta([pedido(1, 10, 1, 'recusado', 1), pedido(2, 11, 1, 'pendente', 1)])
    expect(situacoes.find((s) => s.pedido.oferta.id === 10)?.podeTentarDeNovo).toBe(false)
  })

  it('mostra aprovados primeiro, depois pendentes e recusados', () => {
    const situacoes = situacoesPorOferta([
      pedido(1, 10, 1, 'recusado', 1),
      pedido(2, 11, 2, 'pendente', 1),
      pedido(3, 12, 3, 'aprovado', 1),
    ])
    expect(situacoes.map((s) => s.pedido.status)).toEqual(['aprovado', 'pendente', 'recusado'])
  })
})
