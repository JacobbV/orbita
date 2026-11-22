// Traduz os erros do Supabase para mensagens simples em português.

interface ErroComMensagem {
  message?: string
  code?: string
  status?: number
}

const MAPA: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme o seu e-mail antes de entrar. Procure o link na sua caixa de entrada (e no spam).'],
  [/user already registered/i, 'Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.'],
  [/password should be at least|weak password|password is too short/i, 'A senha precisa ter pelo menos 8 caracteres.'],
  [/same.*password|should be different from the old/i, 'A nova senha precisa ser diferente da anterior.'],
  [/rate limit|too many requests|security purposes/i, 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
  [/database error saving new user/i, 'Não foi possível criar a conta. Confira se o e-mail é @academico.ifpb.edu.br, se escolheu a turma e se preencheu "Quem é você".'],
  [/signups not allowed|signup is disabled/i, 'O cadastro está fechado no momento. Fale com o professor.'],
  [/failed to fetch|network|load failed/i, 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
  [/auth session missing|invalid.*(token|jwt)|expired/i, 'O link expirou ou já foi usado. Peça um novo.'],
]

// Mensagens das funções do banco (já em português) passam direto.
const MENSAGENS_DO_BANCO = [
  'Você já tem um pedido em aberto ou aprovado nesta disciplina.',
  'Você já fez 3 pedidos para esta turma. Fale com o professor.',
  'Conte quem você é: nome completo, turma e turno.',
  'Turma ou disciplina não encontrada.',
  'Só alunos fazem pedido de acesso.',
  'Entre na sua conta primeiro.',
  'Use o seu e-mail @academico.ifpb.edu.br.',
]

export function mensagemDeErro(erro: unknown): string {
  const e = (erro ?? {}) as ErroComMensagem
  const msg = typeof e.message === 'string' ? e.message : String(erro ?? '')
  const doBanco = MENSAGENS_DO_BANCO.find((m) => msg.includes(m))
  if (doBanco) return doBanco
  for (const [padrao, texto] of MAPA) {
    if (padrao.test(msg)) return texto
  }
  return 'Algo deu errado. Tente de novo em instantes.'
}
