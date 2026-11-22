import { expect, test, type Page } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Laboratório de JavaScript e de HTML e CSS, de verdade no navegador. Dados inventados.

const aluno = emailDeTeste('lab-web')
const professor = emailDeTeste('professor-lab-web')
const TITULO_JS = 'Média de duas notas'
const TITULO_HTML = 'Cartão de apresentação'
let aulaId = 0

async function escrever(page: Page, rotulo: string, codigo: string) {
  const editor = page.locator(`.cm-content[aria-label="${rotulo}"]`)
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(codigo)
}

test.describe.serial('Laboratório: JavaScript e HTML e CSS', () => {
  test.setTimeout(120_000)

  test.beforeAll(async () => {
    const algM = await oferta('1º INFO M', 'ALG')
    const id = await criarConta(aluno, 'Aurora Exemplo Fictícia', { ofertaId: algM, quemEVoce: 'Aurora Exemplo Fictícia, 1º INFO M, manhã' })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
    aulaId =
      (
        await rest<Array<{ id: number }>>(
          'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.5&unidades.numero=eq.4&unidades.disciplinas.sigla=eq.ALG',
        )
      )[0]?.id ?? 0
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: algM, aula_id: aulaId }),
    })
    for (const t of [TITULO_JS, TITULO_HTML]) {
      await rest(`exercicios?aula_id=eq.${aulaId}&titulo=eq.${encodeURIComponent(t)}`, { method: 'DELETE' })
    }
    const [js] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({ aula_id: aulaId, titulo: TITULO_JS, enunciado: 'Leia duas notas e mostre a média.', linguagem: 'javascript', dificuldade: 1 }),
    })
    await rest('testes', {
      method: 'POST',
      body: JSON.stringify([
        { exercicio_id: js?.id, tipo: 'visivel', entrada: '6\n8', saida_esperada: '7', ordem: 1 },
        { exercicio_id: js?.id, tipo: 'oculto', entrada: '10\n5', saida_esperada: '7.5', ordem: 2 },
      ]),
    })
  })

  test('aluno roda e testa JavaScript', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO_JS}`) }).click()
    await expect(page.getByText('main.js')).toBeVisible()
    await escrever(page, 'Editor de código JavaScript', 'const a = Number(prompt("Nota 1: "))\nconst b = Number(prompt("Nota 2: "))\nconsole.log((a + b) / 2)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.locator('.exercicio-console pre').first()).toHaveText('Nota 1: 6\nNota 2: 8\n7')
    await page.getByRole('button', { name: '✓ Testar' }).click()
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible()

    // Erro com a linha do código e laço infinito parado.
    await escrever(page, 'Editor de código JavaScript', 'console.log(notas)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.getByText('ReferenceError na linha 1: notas is not defined')).toBeVisible()
    await escrever(page, 'Editor de código JavaScript', 'while (true) {}')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.getByText(/foi parado/)).toBeVisible({ timeout: 15_000 })
    expect(erros).toEqual([])
  })

  test('professor cria exercício de HTML e CSS preenchendo com a solução', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/exercicios/${aulaId}`)
    await page.getByRole('button', { name: '+ Novo exercício' }).click()
    const form = page.getByRole('form', { name: 'Novo exercício' })
    await form.getByLabel('Título').fill(TITULO_HTML)
    await form.getByLabel('Enunciado').fill('Faça um título h1 com o seu apelido, em vermelho, e uma lista com 3 hobbies.')
    await form.getByLabel('Linguagem').selectOption('html')
    await form.getByLabel('Entrada do teste 1').fill('h1 | color')
    await form.getByLabel('Entrada do teste 2').fill('contar li')
    await form.getByText('Preencher as saídas com a sua solução').click()
    await escrever(
      page,
      'Sua solução (não é salva)',
      '<style>h1 { color: red; }</style>\n<h1>Nave</h1>\n<ul><li>ler</li><li>correr</li><li>jogar</li></ul>',
    )
    await form.getByRole('button', { name: '▶ Rodar a solução nos testes' }).click()
    await expect(form.getByText('2 saídas preenchidas. Confira e salve o exercício.')).toBeVisible()
    await expect(form.getByLabel('Saída esperada do teste 1')).toHaveValue('rgb(255, 0, 0)')
    await expect(form.getByLabel('Saída esperada do teste 2')).toHaveValue('3')
    await form.getByRole('button', { name: 'Salvar exercício' }).click()
    await expect(page.getByText(`Exercício "${TITULO_HTML}" criado.`)).toBeVisible()
    await expect(page.locator('li', { hasText: TITULO_HTML })).toContainText('HTML e CSS · Fácil')
    expect(erros).toEqual([])
  })

  test('aluno vê a prévia, testa e entrega HTML e CSS', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO_HTML}`) }).click()
    await expect(page.getByText('index.html')).toBeVisible()
    await escrever(page, 'Editor de código HTML e CSS', '<h1 style="color: #ff0000">Cometa</h1>\n<ul><li>a</li><li>b</li></ul>')
    const previa = page.frameLocator('iframe[title="Prévia da sua página"]')
    await expect(previa.locator('h1')).toHaveText('Cometa')
    await page.getByRole('button', { name: '✓ Testar' }).click()
    await expect(page.getByRole('heading', { name: '1 de 2 testes certos' })).toBeVisible()
    await escrever(page, 'Editor de código HTML e CSS', '<h1 style="color: #ff0000">Cometa</h1>\n<ul><li>a</li><li>b</li><li>c</li></ul>')
    await page.getByRole('button', { name: '✓ Testar' }).click()
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible()
    await page.getByRole('button', { name: 'Entregar' }).click()
    await expect(page.getByText(/Entrega 1 enviada: 2 de 2 testes certos/)).toBeVisible()
    expect(erros).toEqual([])
  })
})
