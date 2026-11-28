import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest, sortearApelidoDe } from './apoio.ts'

// Ranking opcional por apelido. Dados inventados.

const alunoA = emailDeTeste('rank-a')
const alunoB = emailDeTeste('rank-b')
const alunoOutraTurma = emailDeTeste('rank-c')
const professor = emailDeTeste('rank-prof')
const NOME_A = 'Mira Ranking Fictícia'
const NOME_B = 'Dorado Ranking Fictício'
const NOME_C = 'Lupus Ranking Fictício'
// Apelidos sorteados na hora (ninguém repete).
let APELIDO_A = ''
let APELIDO_B = ''
let APELIDO_C = ''
let turmaM = 0
let idC = ''
let idB = ''

async function criarAprovado(email: string, nome: string, turma: string, sigla: string): Promise<{ id: string; apelido: string }> {
  const o = await oferta(turma, sigla)
  const id = await criarConta(email, nome, { ofertaId: o, quemEVoce: `${nome}, ${turma}, manhã` })
  await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
  return { id, apelido: await sortearApelidoDe(email) }
}

test.describe.serial('Ranking opcional', () => {
  test.beforeAll(async () => {
    const a = await criarAprovado(alunoA, NOME_A, '1º INFO M', 'ALG')
    const b = await criarAprovado(alunoB, NOME_B, '1º INFO M', 'ALG')
    const c = await criarAprovado(alunoOutraTurma, NOME_C, '3º INFO M', 'WEB')
    APELIDO_A = a.apelido
    ;[idB, APELIDO_B] = [b.id, b.apelido]
    ;[idC, APELIDO_C] = [c.id, c.apelido]
    await criarProfessor(professor, 'Professor Fictício Ranking')
    turmaM = (await rest<Array<{ id: number }>>(`turmas?nome=eq.${encodeURIComponent('1º INFO M')}&select=id`))[0]?.id ?? 0
    // XP confirmado dado pelo professor ao aluno B (o professor é quem dá; aqui direto no banco).
    const prof = (await rest<Array<{ id: string }>>(`perfis?email=eq.${encodeURIComponent(professor)}&select=id`))[0]?.id
    await rest('xp_eventos', {
      method: 'POST',
      body: JSON.stringify({ aluno_id: idB, quantidade: 40, motivo: 'professor', descricao: 'Participação', dado_por: prof, situacao: 'confirmado' }),
    })
  })

  test('ninguém entra sozinho: o aluno vê o convite e escolhe entrar', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, alunoA)
    await page.goto('ranking')
    await expect(page.getByText(/Você não está no ranking/)).toBeVisible()
    await page.getByRole('button', { name: 'Entrar no ranking' }).click()
    await expect(page.getByText(/Você está no ranking/)).toBeVisible()
    const lista = page.getByRole('list', { name: 'Ranking semana' })
    await expect(lista).toContainText(APELIDO_A)
    await expect(lista).toContainText('(você)')
    expect(erros).toEqual([])
  })

  test('o colega só vê o apelido e nunca vê o nome nem quem é de outra turma', async ({ page }) => {
    const erros = registrarErros(page)
    // B (mesma turma) e C (outra turma) entraram no ranking; só B pode aparecer para A.
    await rest('ranking_participantes', { method: 'POST', body: JSON.stringify([{ aluno_id: idB }, { aluno_id: idC }]) })
    await entrar(page, alunoA)
    await page.goto('ranking')
    const lista = page.getByRole('list', { name: 'Ranking semana' })
    await expect(lista).toContainText(APELIDO_B)
    await expect(lista.locator('li').first()).toContainText(APELIDO_B)
    await expect(lista).toContainText('40 XP')
    await expect(page.locator('body')).not.toContainText(NOME_B)
    await expect(page.locator('body')).not.toContainText(NOME_C)
    await expect(page.locator('body')).not.toContainText(APELIDO_C)
    await page.getByRole('button', { name: 'Geral' }).click()
    await expect(page.getByRole('list', { name: 'Ranking geral' })).toContainText(APELIDO_B)
    expect(erros).toEqual([])
  })

  test('o aluno sai do ranking e some para os colegas', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, alunoA)
    await page.goto('ranking')
    await page.getByRole('button', { name: 'Sair do ranking' }).click()
    await page.getByRole('button', { name: 'Sim, sair do ranking' }).click()
    await expect(page.getByText(/Você não está no ranking/)).toBeVisible()
    await expect(page.getByRole('list', { name: 'Ranking semana' })).not.toContainText(APELIDO_A)
    expect(erros).toEqual([])
  })

  test('o professor vê o nome real, tira um aluno e o ranking o esconde', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/ranking/${turmaM}`)
    const lista = page.getByRole('list', { name: 'Participantes do ranking' })
    await expect(lista).toContainText(NOME_B)
    await expect(lista).toContainText(APELIDO_B)
    await page.getByRole('button', { name: /Tirar do ranking.*Dorado/ }).click()
    await expect(page.getByText(/saiu do ranking/)).toBeVisible()
    await expect(lista).not.toContainText(NOME_B)
    expect(erros).toEqual([])
  })

  test('o professor, mesmo no Modo Ninja, não aparece nem entra', async ({ page }) => {
    await entrar(page, professor)
    await page.goto('ranking')
    await expect(page.getByRole('heading', { name: 'Ranking da tripulação' })).toHaveCount(0)
  })
})
