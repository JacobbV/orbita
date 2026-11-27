import { expect, test } from '@playwright/test'
import { criarProfessor, emailDeTeste, entrar, registrarErros } from './apoio.ts'

// Aba Exercícios do painel do professor. Dados inventados.

const professor = emailDeTeste('professor-visao-exercicios')

test.describe.serial('Aba Exercícios do painel', () => {
  test.beforeAll(async () => {
    await criarProfessor(professor, 'Professor Fictício')
  })

  test('mostra os exercícios por disciplina, unidade e aula', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor')
    await page.getByRole('navigation', { name: 'Seções do painel' }).getByRole('link', { name: 'Exercícios' }).click()
    await expect(page.getByRole('heading', { name: 'Exercícios' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ALG' })).toHaveAttribute('aria-pressed', 'true')
    // As aulas de Algoritmos aparecem, cada uma com o atalho para criar ou editar exercícios.
    await expect(page.getByRole('link', { name: /exercícios da aula/ }).first()).toBeVisible()
    await page.getByRole('button', { name: 'WEB' }).click()
    await expect(page.getByRole('button', { name: 'WEB' })).toHaveAttribute('aria-pressed', 'true')
    expect(erros).toEqual([])
  })
})
