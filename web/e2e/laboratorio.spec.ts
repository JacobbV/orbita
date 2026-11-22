import { expect, test, type Page } from '@playwright/test'
import { criarConta, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Laboratório com o Python de verdade (Pyodide) no navegador. Dados inventados.

let exercicioId = 0
const aluno = emailDeTeste('laboratorio')

async function escreverCodigo(page: Page, codigo: string) {
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  // insertText não passa pelo fechamento automático de parênteses do editor.
  await page.keyboard.insertText(codigo)
}

test.describe.serial('Laboratório de código: Python no navegador', () => {
  test.setTimeout(120_000)

  test.beforeAll(async () => {
    const algV = await oferta('1º INFO V', 'ALG')
    const id = await criarConta(aluno, 'Cometa Exemplo Fictício', { ofertaId: algV, quemEVoce: 'Cometa Exemplo Fictício, 1º INFO V, tarde' })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    const aula = (
      await rest<Array<{ id: number }>>(
        'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.2&unidades.numero=eq.1&unidades.disciplinas.sigla=eq.ALG',
      )
    )[0]?.id
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: algV, aula_id: aula }),
    })
    // Exercício de outra execução na mesma aula sai antes (o título se repete).
    await rest(`exercicios?aula_id=eq.${aula}&titulo=like.${encodeURIComponent('Soma de dois números*')}`, { method: 'DELETE' })
    const [exercicio] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({
        aula_id: aula,
        titulo: 'Soma de dois números',
        enunciado: 'Leia dois números inteiros, um por linha, e mostre a soma.',
        codigo_inicial: '# Escreva o seu código aqui\n',
        dificuldade: 1,
      }),
    })
    exercicioId = exercicio?.id ?? 0
    await rest('testes', {
      method: 'POST',
      body: JSON.stringify([
        { exercicio_id: exercicioId, tipo: 'visivel', entrada: '1\n2', saida_esperada: '3', ordem: 1 },
        { exercicio_id: exercicioId, tipo: 'oculto', entrada: '5\n5', saida_esperada: '10', ordem: 2 },
        { exercicio_id: exercicioId, tipo: 'secreto', entrada: '-4\n4', saida_esperada: '0', ordem: 3 },
      ]),
    })
  })

  test('aluno abre o exercício pela ponte e acerta os testes', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await page.getByRole('link', { name: 'Exercício: Soma de dois números · +20 XP' }).click()
    await expect(page).toHaveURL(new RegExp(`/exercicio/${exercicioId}$`))
    await expect(page.getByText('Leia dois números inteiros')).toBeVisible()

    // Código errado: o visível passa por acaso? Não: imprime a diferença.
    await escreverCodigo(page, 'a = int(input("Primeiro: "))\nb = int(input("Segundo: "))\nprint(a - b)')
    await page.getByRole('button', { name: '✓ Testar' }).click()
    await expect(page.getByRole('heading', { name: '0 de 2 testes certos' })).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('Resposta escondida')).toBeVisible()

    // Código certo, com perguntas no input(): nos testes as perguntas não contam.
    await escreverCodigo(page, 'a = int(input("Primeiro: "))\nb = int(input("Segundo: "))\nprint(a + b)')
    await page.getByRole('button', { name: '✓ Testar' }).click()
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible()

    // Rodar mostra as perguntas e as respostas digitadas, como no terminal.
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.locator('.exercicio-console pre').first()).toHaveText('Primeiro: 1\nSegundo: 2\n3')
    expect(erros).toEqual([])
  })

  test('erro do Python aparece de forma curta e laço infinito é parado', async ({ page }) => {
    await entrar(page, aluno)
    await page.goto(`exercicio/${exercicioId}`)
    await escreverCodigo(page, 'x = 1\nprint(y)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.locator('.exercicio-erro')).toContainText("NameError: name 'y' is not defined", { timeout: 60_000 })
    await expect(page.locator('.exercicio-erro')).toContainText('line 2')

    await escreverCodigo(page, 'while True:\n    pass')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.locator('.exercicio-erro')).toContainText('foi parado', { timeout: 30_000 })

    // Depois de parar, o Python volta a funcionar.
    await escreverCodigo(page, 'print("de volta")')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.locator('.exercicio-console pre').first()).toHaveText('de volta', { timeout: 60_000 })
  })
})
