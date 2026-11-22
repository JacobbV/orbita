// Vitrine da página inicial. Na etapa do banco, estes dados passam a vir do Supabase.

export interface DisciplinaVitrine {
  sigla: string
  ano: string
  nome: string
  resumo: string
  detalhe: string
  cor: 'ciano' | 'nebulosa' | 'estrela'
}

export const DISCIPLINAS_VITRINE: DisciplinaVitrine[] = [
  {
    sigla: 'ALG',
    ano: '1º ano · INFO',
    nome: 'Algoritmos e Lógica de Programação',
    resumo: 'Python do zero: entrada e saída, decisões, laços, listas, matrizes e funções.',
    detalhe: '4 unidades · 24 aulas',
    cor: 'ciano',
  },
  {
    sigla: 'FUND',
    ano: '1º ano · INFO',
    nome: 'Fundamentos do Computador',
    resumo: 'Hardware, sistemas numéricos, redes e topologias.',
    detalhe: '4 unidades · aulas em breve',
    cor: 'nebulosa',
  },
  {
    sigla: 'WEB',
    ano: '3º ano · INFO',
    nome: 'Desenvolvimento de Aplicações Web',
    resumo: 'HTML, CSS moderno, JavaScript, back-end e publicação.',
    detalhe: '4 unidades · 24 aulas',
    cor: 'estrela',
  },
]
