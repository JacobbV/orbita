import { isAcademicEmail } from './email'

// Regras dos formulários. O banco confere tudo de novo; aqui é só para ajudar o aluno.

export const SENHA_MINIMA = 8
export const QUEM_E_VOCE_MIN = 10
export const QUEM_E_VOCE_MAX = 500

export interface DadosCadastro {
  nome: string
  email: string
  disciplinaId: string
  ofertaId: string
  quemEVoce: string
  senha: string
}

export type ErrosDoFormulario<T> = Partial<Record<keyof T, string>>

export function validarNome(nome: string): string | undefined {
  const limpo = nome.trim()
  if (limpo.length < 2) return 'Escreva o seu nome completo.'
  if (limpo.length > 120) return 'Nome muito longo (máximo de 120 caracteres).'
  return undefined
}

export function validarEmail(email: string): string | undefined {
  if (!email.trim()) return 'Escreva o seu e-mail acadêmico.'
  if (!isAcademicEmail(email)) return 'Use o e-mail que termina em @academico.ifpb.edu.br.'
  return undefined
}

export function validarSenha(senha: string): string | undefined {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  return undefined
}

export function validarQuemEVoce(texto: string): string | undefined {
  const limpo = texto.trim()
  if (limpo.length < QUEM_E_VOCE_MIN)
    return 'Conte quem você é: nome completo, turma e turno (manhã ou tarde).'
  if (limpo.length > QUEM_E_VOCE_MAX) return `Texto muito longo (máximo de ${QUEM_E_VOCE_MAX} caracteres).`
  return undefined
}

export function validarCadastro(d: DadosCadastro): ErrosDoFormulario<DadosCadastro> {
  const erros: ErrosDoFormulario<DadosCadastro> = {}
  const nome = validarNome(d.nome)
  if (nome) erros.nome = nome
  const email = validarEmail(d.email)
  if (email) erros.email = email
  if (!d.disciplinaId) erros.disciplinaId = 'Escolha a disciplina.'
  if (!d.ofertaId) erros.ofertaId = 'Escolha a sua turma.'
  const quem = validarQuemEVoce(d.quemEVoce)
  if (quem) erros.quemEVoce = quem
  const senha = validarSenha(d.senha)
  if (senha) erros.senha = senha
  return erros
}

export function temErros<T>(erros: ErrosDoFormulario<T>): boolean {
  return Object.values(erros).some(Boolean)
}
