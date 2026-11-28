import { expect, test } from '@playwright/test'
import { RODADA, criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Lojinha: boas-vindas, moedas dadas pelo professor, compra na Loja do Hangar,
// troca de XP e devolução da compra. Dados inventados.

const aluno = emailDeTeste('loja')
const professor = emailDeTeste('professor-loja')
// O número da rodada deixa o nome único no banco local (os testes podem rodar várias vezes).
const NOME = `Cassiopeia Loja ${RODADA}`

test.describe.serial('Lojinha', () => {
  test.beforeAll(async () => {
    const algM = await oferta('1º INFO M', 'ALG')
    const id = await criarConta(aluno, NOME, { ofertaId: algM, quemEVoce: `${NOME}, 1º INFO M, manhã` })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício Loja')
  })

  test('aluno aprovado ganha as boas-vindas e vê as moedas na ponte', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    const atalho = page.getByRole('link', { name: '5 moedas. Abrir a Loja' })
    await expect(atalho).toBeVisible()
    await atalho.click()
    await expect(page.getByRole('heading', { name: 'Loja da nave' })).toBeVisible()
    await expect(page.getByText('Boas-vindas à nave')).toBeVisible()
    // Peça de 15 com 5 moedas: mostra quanto falta.
    await page.getByRole('button', { name: /^Coque/ }).click()
    await expect(page.getByText('Faltam 10 moedas. Continue estudando!')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar boneco' })).toBeDisabled()
    expect(erros).toEqual([])
  })

  test('professor dá moedas na aba Loja do painel', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor?aba=loja')
    await expect(page.getByRole('heading', { name: 'Moedas da turma' })).toBeVisible()
    await page.getByLabel('Turma').selectOption({ label: '1º INFO M · ALG' })
    await page.getByLabel('Aluno').selectOption({ label: NOME })
    await page.getByLabel('Quantas moedas').fill('10')
    await page.getByRole('button', { name: 'Dar moedas' }).click()
    await expect(page.getByText(`+10 para ${NOME}. Saldo: 15.`)).toBeVisible()
    expect(erros).toEqual([])
  })

  test('aluno compra uma peça, usa no boneco e o professor devolve a compra', async ({ browser }) => {
    const paginaAluno = await browser.newPage()
    const erros = registrarErros(paginaAluno)
    await entrar(paginaAluno, aluno)
    await paginaAluno.goto('hangar?aba=loja')
    await paginaAluno.getByRole('button', { name: /^Coque/ }).click()
    await paginaAluno.getByRole('button', { name: 'Comprar por 15 moedas' }).click()
    await expect(paginaAluno.getByText('Comprar Coque por 15 moedas? Sobram 0.')).toBeVisible()
    await paginaAluno.getByRole('button', { name: 'Sim, comprar' }).click()
    await expect(paginaAluno.getByText(/Coque agora é sua!/)).toBeVisible()
    await paginaAluno.getByRole('button', { name: 'Salvar boneco' }).click()
    await expect(paginaAluno.getByText('Boneco salvo!')).toBeVisible()
    await expect(paginaAluno.locator('.hangar-saldo')).toContainText('0 moedas')

    const paginaProfessor = await browser.newPage()
    await entrar(paginaProfessor, professor)
    await paginaProfessor.goto('professor?aba=loja')
    const compra = paginaProfessor.locator('li', { hasText: `${NOME} comprou Coque por 15` })
    await compra.getByRole('button', { name: 'Devolver' }).click()
    await compra.getByRole('button', { name: 'Sim, devolver' }).click()
    await expect(compra).toContainText('Devolvida')

    await paginaAluno.reload()
    await expect(paginaAluno.locator('.hangar-saldo')).toContainText('15 moedas')
    expect(erros).toEqual([])
  })

  test('aluno troca XP por moedas com confirmação', async ({ page }) => {
    // 120 XP dados pelo professor (pela API) para poder trocar.
    const [perfil] = await rest<{ id: string }[]>(`perfis?email=eq.${encodeURIComponent(aluno)}&select=id`)
    const [prof] = await rest<{ id: string }[]>(`perfis?email=eq.${encodeURIComponent(professor)}&select=id`)
    await rest('xp_eventos', {
      method: 'POST',
      body: JSON.stringify({ aluno_id: perfil!.id, quantidade: 120, motivo: 'professor', descricao: 'Participação', dado_por: prof!.id }),
    })
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('hangar?aba=loja')
    await page.getByLabel('Quantas moedas').fill('2')
    await page.getByRole('button', { name: 'Trocar 100 XP' }).click()
    await expect(page.getByText('Trocar 100 XP por 2 moedas? Você fica com 20 XP e volta de patente.')).toBeVisible()
    await page.getByRole('button', { name: 'Sim, trocar' }).click()
    await expect(page.getByText('Pronto: +2 moedas. Agora você tem 20 XP.')).toBeVisible()
    await expect(page.locator('.hangar-saldo')).toContainText('17 moedas')
    expect(erros).toEqual([])
  })
})
