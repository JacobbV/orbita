import { expect, test, type Page } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// O professor cria um exercício pelo painel (com as saídas preenchidas pela
// solução, rodando o Python de verdade) e o aluno resolve. Dados inventados.

const aluno = emailDeTeste('exercicio-painel')
const professor = emailDeTeste('professor-exercicios')
const TITULO = 'Dobro de um número'
let aulaId = 0

async function escrever(page: Page, rotulo: string, codigo: string) {
  const editor = page.locator(`.cm-content[aria-label="${rotulo}"]`)
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(codigo)
}

test.describe.serial('Exercícios criados no painel', () => {
  test.setTimeout(120_000)

  test.beforeAll(async () => {
    const algV = await oferta('1º INFO V', 'ALG')
    const id = await criarConta(aluno, 'Nebulosa Exemplo Fictícia', { ofertaId: algV, quemEVoce: 'Nebulosa Exemplo Fictícia, 1º INFO V, tarde' })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
    aulaId =
      (
        await rest<Array<{ id: number }>>(
          'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.6&unidades.numero=eq.4&unidades.disciplinas.sigla=eq.ALG',
        )
      )[0]?.id ?? 0
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: algV, aula_id: aulaId }),
    })
    // Exercício de outra execução sai antes (o título se repete).
    await rest(`exercicios?aula_id=eq.${aulaId}&titulo=eq.${encodeURIComponent(TITULO)}`, { method: 'DELETE' })
  })

  test('professor cria o exercício e preenche as saídas com a solução', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/exercicios/${aulaId}`)
    await page.getByRole('button', { name: '+ Novo exercício' }).click()
    const form = page.getByRole('form', { name: 'Novo exercício' })
    await form.getByLabel('Título').fill(TITULO)
    await form.getByLabel('Enunciado').fill('Leia um número inteiro e mostre o dobro dele.')
    await form.getByLabel(/Médio/).check()
    await escrever(page, 'Código inicial', 'n = int(input())\n')
    await form.getByLabel('Entrada do teste 1').fill('4')
    await form.getByLabel('Entrada do teste 2').fill('-7')
    await form.getByRole('button', { name: '+ Adicionar teste' }).click()
    await form.getByLabel('Tipo do teste 3').selectOption('secreto')
    await form.getByLabel('Entrada do teste 3').fill('0')
    await form.getByText('Preencher as saídas com a sua solução').click()
    await escrever(page, 'Sua solução (não é salva)', 'n = int(input())\nprint(n * 2)')
    await form.getByRole('button', { name: '▶ Rodar a solução nos testes' }).click()
    await expect(form.getByText('3 saídas preenchidas. Confira e salve o exercício.')).toBeVisible({ timeout: 60_000 })
    await expect(form.getByLabel('Saída esperada do teste 2')).toHaveValue('-14')
    await form.getByRole('button', { name: 'Salvar exercício' }).click()
    await expect(page.getByText(`Exercício "${TITULO}" criado.`)).toBeVisible()
    await expect(page.locator('li', { hasText: TITULO })).toContainText('Médio · +35 XP · 1 visível, 1 oculto, 1 secreto')
    expect(erros).toEqual([])
  })

  test('aluno vê o exercício na aula liberada e acerta', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO}`) }).click()
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible()
    await escrever(page, 'Editor de código Python', 'n = int(input())\nprint(n * 2)')
    await page.getByRole('button', { name: '✓ Testar' }).click()
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible({ timeout: 60_000 })
    expect(erros).toEqual([])
  })
})
