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
  [/turmas_nome_ano_letivo_key/i, 'Já existe uma turma com esse nome nesse ano letivo.'],
  [/unidades_numero_check/i, 'Uma disciplina pode ter no máximo 20 unidades.'],
  [/aulas_numero_check/i, 'Uma unidade pode ter no máximo 60 aulas.'],
  [/materiais_url_check/i, 'O link precisa começar com https:// e não pode ter espaços.'],
  [/ano_letivo_check/i, 'Use um ano entre 2020 e 2100.'],
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
  'Só o professor pode fazer isso.',
  'Só o professor decide pedidos.',
  'Pedido não encontrado ou já decidido.',
  'Unidade não encontrada.',
  'Aula não encontrada.',
  'Escolha de 1 a 100 XP.',
  'Escreva o motivo do XP.',
  'Aluno não encontrado entre os aprovados.',
  'Escreva o título do exercício (até 160 letras).',
  'Escreva o enunciado do exercício.',
  'Escolha a dificuldade.',
  'O código inicial passou do limite de 20 mil letras.',
  'Coloque de 1 a 30 testes.',
  'Confira os testes: cada um precisa do tipo e da saída esperada.',
  'Coloque pelo menos um teste visível ou oculto: é com eles que o aluno confere o código.',
  'Exercício não encontrado.',
  'Este exercício já tem entregas de alunos e não pode ser removido.',
  'Este exercício ainda não foi liberado para a sua turma.',
  'Só o aluno entrega exercícios.',
  'Escreva o código antes de entregar (até 20 mil caracteres).',
  'Resultado dos testes inválido.',
  'Entrega não encontrada.',
  'Você já entregou este exercício. Só dá para entregar de novo se o professor devolver.',
  'A nota vai de 0 a 10.',
  'O comentário pode ter até 2 mil caracteres.',
  'Esta entrega já foi devolvida.',
  'Entre na sua conta para sortear um apelido.',
  'Entre na sua conta para escolher um apelido.',
  'Esse apelido não está na lista. Use o botão Sortear.',
  'Alguém acabou de pegar esse apelido. Sorteie outro.',
  'Só o professor pode trocar o apelido de um aluno.',
  'Só o professor pode apagar o apelido de um aluno.',
  'Todos os apelidos da lista já estão em uso. Avise o professor.',
  'O Modo Ninja é só do professor.',
  'Conta não encontrada.',
  'Comece a prova primeiro.',
  'A prova já foi entregue.',
  'A prova ainda não abriu.',
  'O horário da prova já fechou.',
  'Só o aluno faz a prova.',
  'Prova não encontrada.',
  'Questão não encontrada.',
  'Escreva o título da prova (até 160 letras).',
  'O horário de fechar precisa ser depois do horário de abrir.',
  'A duração vai de 5 a 600 minutos.',
  'Coloque de 1 a 30 questões na prova.',
  'A mesma questão aparece duas vezes na prova.',
  'Algum aluno já começou a prova: as questões e os pesos não podem mudar.',
  'Esta prova já tem alunos que começaram e não pode ser removida.',
  'Este exercício está numa prova e não pode ser removido.',
  'Resposta não encontrada.',
  'O peso de cada questão vai de 0,1 a 100.',
  'Escolha encerrar na 1ª, 2ª ou 3ª saída, ou só avisar.',
  'As instruções passaram do limite de 5 mil letras.',
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
