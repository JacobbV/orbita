import { expect, type Page } from '@playwright/test'
import { supabaseLocal } from './supabase-local.ts'

// Ferramentas dos testes de ponta a ponta. Todas as contas e nomes são
// inventados, com um sufixo por execução para não colidir com testes anteriores.

export const SENHA = 'senha-forte-123'
export const RODADA = `${Date.now() % 1_000_000}`

export function emailDeTeste(apelido: string): string {
  return `${apelido}.e2e${RODADA}@academico.ifpb.edu.br`
}

/** Chamada à API REST do Supabase com a chave de serviço (só nos testes, nunca no site). */
export async function rest<T = unknown>(caminho: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceKey } = supabaseLocal()
  const resposta = await fetch(`${url}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  })
  const texto = await resposta.text()
  if (!resposta.ok) throw new Error(`REST ${caminho}: ${resposta.status} ${texto}`)
  return (texto ? JSON.parse(texto) : null) as T
}

/** Cria uma conta já confirmada. Com turma e "Quem é você", o banco cria o pedido pendente. */
export async function criarConta(
  email: string,
  nome: string,
  pedido?: { ofertaId: number; quemEVoce: string },
): Promise<string> {
  const { url, serviceKey } = supabaseLocal()
  const resposta = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: SENHA,
      email_confirm: true,
      user_metadata: {
        nome,
        ...(pedido ? { turma_disciplina_id: String(pedido.ofertaId), quem_e_voce: pedido.quemEVoce } : {}),
      },
    }),
  })
  const corpo = (await resposta.json()) as { id?: string; msg?: string }
  if (!resposta.ok || !corpo.id) throw new Error(`Conta ${email}: ${JSON.stringify(corpo)}`)
  return corpo.id
}

/** Conta de professor: o papel só muda por fora do site, como no script tornar-professor.sql. */
export async function criarProfessor(email: string, nome: string): Promise<void> {
  const id = await criarConta(email, nome)
  await rest(`perfis?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ papel: 'professor' }) })
}

export async function oferta(turma: string, sigla: string): Promise<number> {
  const linhas = await rest<Array<{ id: number }>>(
    `turma_disciplinas?select=id,turmas!inner(nome),disciplinas!inner(sigla)` +
      `&turmas.nome=eq.${encodeURIComponent(turma)}&disciplinas.sigla=eq.${sigla}`,
  )
  const id = linhas[0]?.id
  if (!id) throw new Error(`Oferta ${turma} ${sigla} não encontrada.`)
  return id
}

/** Link de confirmação ou de recuperação que chegou no Mailpit (e-mail local). */
export async function linkDoEmail(para: string, assunto: RegExp): Promise<string> {
  const { mailpitUrl } = supabaseLocal()
  for (let i = 0; i < 40; i++) {
    const busca = (await (
      await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${para}`)}`)
    ).json()) as { messages?: Array<{ ID: string; Subject: string }> }
    const mensagem = busca.messages?.find((m) => assunto.test(m.Subject))
    if (mensagem) {
      const completa = (await (await fetch(`${mailpitUrl}/api/v1/message/${mensagem.ID}`)).json()) as {
        HTML?: string
        Text?: string
      }
      const link = (completa.HTML ?? completa.Text ?? '')
        .match(/https?:\/\/[^"'\s<>]+/g)
        ?.find((u) => u.includes('/auth/v1/verify'))
      if (link) return link.replace(/&amp;/g, '&')
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`O e-mail "${assunto}" não chegou para ${para}.`)
}

export async function entrar(page: Page, email: string): Promise<void> {
  await page.goto('entrar')
  await page.getByLabel('E-mail acadêmico').fill(email)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).not.toHaveURL(/\/entrar$/)
}

/** Guarda os erros de JavaScript da página para conferir no fim do teste. */
/** Envia um arquivo de slides para a aula (como o painel faz) e devolve o id do material. */
export async function enviarSlidesDeTeste(aulaId: number, html: string): Promise<number> {
  const { url, serviceKey } = supabaseLocal()
  const caminho = `aulas/${aulaId}/slides-e2e.html`
  const resposta = await fetch(`${url}/storage/v1/object/materiais/${caminho}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'text/html', 'x-upsert': 'true' },
    body: html,
  })
  if (!resposta.ok) throw new Error(`Storage: ${resposta.status} ${await resposta.text()}`)
  await rest(`materiais?aula_id=eq.${aulaId}&tipo=eq.slide`, { method: 'DELETE' })
  const [material] = await rest<Array<{ id: number }>>('materiais', {
    method: 'POST',
    body: JSON.stringify({ aula_id: aulaId, tipo: 'slide', titulo: 'Slides da aula', caminho_storage: caminho, ordem: 0 }),
  })
  return material?.id ?? 0
}

export function registrarErros(page: Page): string[] {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  return erros
}
