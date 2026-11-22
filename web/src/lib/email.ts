// Regra do projeto: só e-mail acadêmico do IFPB.
// O servidor (Supabase) confere de novo; esta checagem é só para ajudar o aluno.

export const DOMINIO_ACADEMICO = '@academico.ifpb.edu.br'

/** Tira espaços nas pontas e deixa minúsculo, como o servidor vai guardar. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * true se o e-mail termina em @academico.ifpb.edu.br e tem algo válido antes.
 * Não aceita subdomínios disfarçados (ex.: x@academico.ifpb.edu.br.site.com)
 * nem domínios parecidos (ex.: x@academico-ifpb.edu.br).
 */
export function isAcademicEmail(email: string): boolean {
  const limpo = normalizeEmail(email)
  if (!limpo.endsWith(DOMINIO_ACADEMICO)) return false
  const usuario = limpo.slice(0, -DOMINIO_ACADEMICO.length)
  // Parte antes do @: letras, números e . _ % + - ; sem @ extra e sem ponto nas pontas.
  return /^[a-z0-9._%+-]+$/.test(usuario) && !usuario.startsWith('.') && !usuario.endsWith('.')
}
