import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Hangar (montar o boneco) e "Ver como aluno" do professor. Dados inventados.

const aluno = emailDeTeste('hangar')
const professor = emailDeTeste('professor-hangar')

test.describe.serial('Hangar e Ver como aluno', () => {
  test.beforeAll(async () => {
    const algM = await oferta('1º INFO M', 'ALG')
    const id = await criarConta(aluno, 'Andrômeda Exemplo Fictícia', { ofertaId: algM, quemEVoce: 'Andrômeda Exemplo Fictícia, 1º INFO M, manhã' })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
  })

  test('aluno monta o boneco no Hangar e ele fica salvo', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await page.getByRole('main').getByRole('link', { name: /Hangar/ }).click()
    await expect(page.getByRole('heading', { name: 'Monte o seu tripulante' })).toBeVisible()

    // Com 0 XP, a jaqueta de piloto (uniforme, 250 XP) fica trancada; o arrepiado é da loja.
    await page.getByRole('tab', { name: 'Roupa' }).click()
    await expect(page.getByRole('button', { name: /Jaqueta de piloto/ })).toBeDisabled()
    await page.getByRole('tab', { name: 'Cabelo', exact: true }).click()
    await expect(page.getByRole('button', { name: /Arrepiado/ })).toContainText('40')
    await page.getByRole('button', { name: /Cacheado/ }).click()
    await page.getByRole('tab', { name: 'Roupa' }).click()
    await expect(page.getByRole('button', { name: /Cardigã/ })).toHaveCount(0)
    await page.getByRole('button', { name: /Moletom roxo/ }).click()
    // Hangar novo: base, farda do IF e cor livre do cabelo.
    await page.getByRole('tab', { name: 'Corpo' }).click()
    await page.getByRole('button', { name: /Feminino/ }).click()
    await page.getByRole('tab', { name: 'Roupa' }).click()
    await page.getByRole('button', { name: 'Parte de baixo' }).click()
    await page.getByRole('button', { name: /Calça jeans preta/ }).click()
    await page.getByRole('tab', { name: 'Cabelo', exact: true }).click()
    await page.getByLabel('Escolher minha cor').fill('#22aa88')
    await page.getByRole('button', { name: 'Salvar boneco' }).click()
    await expect(page.getByText('Boneco salvo!')).toBeVisible()

    await page.reload()
    await page.getByRole('tab', { name: 'Roupa' }).click()
    await expect(page.getByRole('button', { name: /Moletom roxo/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Parte de baixo' }).click()
    await expect(page.getByRole('button', { name: /Calça jeans preta/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('tab', { name: 'Cabelo', exact: true }).click()
    await expect(page.getByLabel('Escolher minha cor')).toHaveValue('#22aa88')

    // Montar o boneco dá a medalha Estilista Espacial.
    await page.goto('medalhas')
    await expect(page.locator('li', { hasText: 'Estilista Espacial' })).toContainText('Ganha em')
    expect(erros).toEqual([])
  })

  test('professor monta o boneco de nerd e vê a ponte de uma turma como aluno', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor')
    await page.getByRole('main').getByRole('link', { name: /Hangar/ }).click()
    await expect(page.getByRole('heading', { name: 'Monte o seu boneco' })).toBeVisible()
    await page.getByRole('tab', { name: 'Acessórios' }).click()
    await page.getByRole('button', { name: 'Corpo e mãos' }).click()
    await page.getByRole('button', { name: /Notebook com adesivos/ }).click()
    await page.getByRole('button', { name: 'Salvar boneco' }).click()
    await expect(page.getByText('Boneco salvo!')).toBeVisible()

    await page.goto('professor?aba=turmas')
    await page.getByRole('link', { name: /Ver como aluno: ALG \(1º INFO M,/ }).click()
    await expect(page.getByText('Vendo como aluno')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Algoritmos e Lógica de Programação' })).toBeVisible()
    expect(erros).toEqual([])
  })
})
