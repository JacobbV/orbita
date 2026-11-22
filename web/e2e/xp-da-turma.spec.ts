import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, RODADA, registrarErros, rest } from './apoio.ts'

// XP da turma no painel, XP por participação e o professor da nave na ponte. Dados inventados.

const aluno = emailDeTeste('xp-turma')
const professor = emailDeTeste('professor-xp')
// Nome único: a turma acumula alunos de outras execuções.
const nome = `Órion Fictício ${RODADA}`

test.describe.serial('XP da turma', () => {
  test.beforeAll(async () => {
    const algM = await oferta('1º INFO M', 'ALG')
    const id = await criarConta(aluno, nome, { ofertaId: algM, quemEVoce: `${nome}, 1º INFO M, manhã` })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
  })

  test('professor dá XP por participação a um aluno da turma', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor?aba=turmas')
    await page.getByRole('link', { name: /XP da turma: ALG \(1º INFO M,/ }).click()
    await expect(page.getByRole('heading', { name: '1º INFO M · ALG' })).toBeVisible()
    await page.getByRole('button', { name: `Dar XP para ${nome}` }).click()
    await page.getByRole('button', { name: '+20' }).click()
    await page.getByLabel('Motivo').fill('Ajudou a turma no desafio')
    await page.getByRole('button', { name: 'Dar XP', exact: true }).click()
    await expect(page.getByText(`+20 XP para ${nome}.`)).toBeVisible()
    await expect(page.locator('.xp-turma-aluno', { hasText: nome })).toContainText('20 XP')
    expect(erros).toEqual([])
  })

  test('aluno vê o XP ganho e o professor da nave na ponte', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await expect(page.getByText('20 XP', { exact: true })).toBeVisible()
    const cartao = page.getByRole('complementary', { name: 'Seu professor' })
    await expect(cartao).toBeVisible()
    await expect(cartao.getByText('Comandante da nave')).toBeVisible()
    expect(erros).toEqual([])
  })
})
