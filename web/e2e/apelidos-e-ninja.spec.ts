import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Apelidos sorteados e Modo Ninja do professor. Dados inventados.

const aluno = emailDeTeste('apelido')
const professor = emailDeTeste('professor-ninja')
let ofertaAlgM = 0

test.describe.serial('Apelidos e Modo Ninja', () => {
  test.beforeAll(async () => {
    ofertaAlgM = await oferta('1º INFO M', 'ALG')
    const id = await criarConta(aluno, 'Câncer Exemplo Fictício', {
      ofertaId: ofertaAlgM,
      quemEVoce: 'Câncer Exemplo Fictício, 1º INFO M, manhã',
    })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício Ninja')
  })

  test('aluno sorteia o apelido na ponte e troca no Hangar', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    const cartao = page.getByRole('region', { name: 'Seu apelido na nave' })
    await expect(cartao).toContainText('Você ainda não tem apelido')
    await cartao.getByRole('button', { name: 'Sortear apelido' }).click()
    const sorteado = (await cartao.locator('.apelido-sugestao').textContent())?.trim() ?? ''
    expect(sorteado).toMatch(/^\S+ \S+$/)
    await cartao.getByRole('button', { name: 'Sortear de novo' }).click()
    await expect(cartao.locator('.apelido-sugestao')).not.toHaveText(sorteado)
    const escolhido = (await cartao.locator('.apelido-sugestao').textContent())?.trim() ?? ''
    await cartao.getByRole('button', { name: 'Usar este' }).click()

    // Com apelido, o cartão some e o apelido aparece no topo da ponte.
    await expect(page.locator('.ponte-apelido')).toHaveText(`Apelido: ${escolhido}`)
    await expect(page.getByRole('region', { name: 'Seu apelido na nave' })).toHaveCount(0)

    await page.getByRole('link', { name: /Hangar/ }).click()
    const noHangar = page.getByRole('region', { name: 'Seu apelido na nave' })
    await expect(noHangar).toContainText(escolhido)
    await noHangar.getByRole('button', { name: 'Sortear outro' }).click()
    await noHangar.getByRole('button', { name: `Manter ${escolhido}` }).click()
    await expect(noHangar).toContainText(escolhido)
    expect(erros).toEqual([])
  })

  test('professor vê o apelido na lista e sorteia ou apaga', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/xp/${ofertaAlgM}`)
    const linha = page.locator('.xp-turma-aluno', { hasText: 'Câncer Exemplo Fictício' })
    await expect(linha).toContainText('Apelido: ')
    const antes = await linha.locator('.xp-turma-apelido').textContent()
    await linha.getByRole('button', { name: /Sortear outro apelido/ }).click()
    await expect(page.getByText(/Novo apelido de Câncer Exemplo Fictício/)).toBeVisible()
    await expect(linha.locator('.xp-turma-apelido')).not.toHaveText(antes ?? '')
    await linha.getByRole('button', { name: /Apagar o apelido/ }).click()
    await expect(linha.locator('.xp-turma-apelido')).toHaveText('Sem apelido')
    expect(erros).toEqual([])
  })

  test('professor entra no Modo Ninja, monta o ninja e anda pela nave', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor')
    await page.getByRole('button', { name: 'Modo Ninja' }).click()
    await expect(page.getByRole('heading', { name: 'Ninja na nave' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Modo Ninja' })).toContainText('Nada é entregue')

    // Todas as turmas, com todas as aulas abertas.
    await page.getByRole('button', { name: /^1º INFO M/ }).click()
    await expect(page.getByRole('heading', { name: 'Algoritmos e Lógica de Programação' })).toBeVisible()
    await expect(page.locator('.ponte-aula-bloqueada')).toHaveCount(0)
    await page.getByRole('button', { name: /^3º INFO V/ }).click()
    await expect(page.getByRole('heading', { name: /Desenvolvimento de Aplicações Web/ })).toBeVisible()

    // Todas as medalhas acesas.
    await page.getByRole('link', { name: 'Todas as medalhas' }).click()
    await expect(page.getByRole('heading', { name: 'Todas as medalhas' })).toBeVisible()
    await expect(page.locator('.medalhas-item-falta')).toHaveCount(0)

    // Hangar do ninja: peças só do ninja e qualquer outra peça.
    await page.goto('hangar')
    await expect(page.getByRole('heading', { name: 'Monte o seu ninja' })).toBeVisible()
    await page.getByRole('tab', { name: 'Acessórios' }).click()
    await page.getByRole('button', { name: 'Corpo e mãos' }).click()
    await page.getByRole('button', { name: /Estrela ninja/ }).click()
    await page.getByRole('tab', { name: 'Cabelo', exact: true }).click()
    await expect(page.getByRole('button', { name: /Arrepiado/ })).toBeEnabled()
    await page.getByRole('button', { name: 'Salvar ninja' }).click()
    await expect(page.getByText('Ninja salvo!')).toBeVisible()

    // Sair do modo volta ao painel, com o boneco de professor.
    await page.getByRole('button', { name: 'Sair do modo Ninja' }).click()
    await expect(page.getByText('Painel do professor')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Modo Ninja' })).toHaveCount(0)
    await page.goto('hangar')
    await expect(page.getByRole('heading', { name: 'Monte o seu boneco' })).toBeVisible()
    expect(erros).toEqual([])
  })

  test('aluno não entra na ponte ninja', async ({ page }) => {
    await entrar(page, aluno)
    await page.goto('ninja')
    await expect(page.getByRole('heading', { name: 'Ninja na nave' })).toHaveCount(0)
  })
})
