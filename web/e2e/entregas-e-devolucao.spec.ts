import { expect, test, type Page } from '@playwright/test'
import {
  criarConta,
  criarProfessor,
  emailDeTeste,
  entrar,
  entregarConfirmando,
  oferta,
  registrarErros,
  responderNoTerminal,
  rest,
} from './apoio.ts'

// Entrega única, correção e devolução: o aluno entrega, o professor abre o
// código, roda os testes, dá nota e comentário e devolve; o aluno refaz.
// Dados inventados. JavaScript, para não depender do carregamento do Python.

const aluno = emailDeTeste('entrega-unica')
const professor = emailDeTeste('professor-entrega-unica')
const NOME = `Lira Entrega ${Date.now() % 100000}`
const TITULO = 'Dobro para a entrega única'
let ofertaId = 0
let exercicioId = 0

async function escrever(page: Page, codigo: string) {
  const editor = page.locator('.cm-content[aria-label="Editor de código JavaScript"]')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(codigo)
}

test.describe.serial('Entrega única, correção e devolução', () => {
  test.setTimeout(120_000)

  test.beforeAll(async () => {
    ofertaId = await oferta('1º INFO V', 'ALG')
    const id = await criarConta(aluno, NOME, { ofertaId, quemEVoce: `${NOME}, 1º INFO V, tarde` })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
    const aula =
      (
        await rest<Array<{ id: number }>>(
          'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.4&unidades.numero=eq.3&unidades.disciplinas.sigla=eq.ALG',
        )
      )[0]?.id ?? 0
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: ofertaId, aula_id: aula }),
    })
    await rest(`exercicios?aula_id=eq.${aula}&titulo=eq.${encodeURIComponent(TITULO)}`, { method: 'DELETE' })
    const [exercicio] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({ aula_id: aula, titulo: TITULO, enunciado: 'Leia um número e mostre o dobro.', linguagem: 'javascript' }),
    })
    exercicioId = exercicio?.id ?? 0
    await rest('testes', {
      method: 'POST',
      body: JSON.stringify([
        { exercicio_id: exercicioId, tipo: 'visivel', entrada: '4', saida_esperada: '8', ordem: 1 },
        { exercicio_id: exercicioId, tipo: 'oculto', entrada: '5', saida_esperada: '10', ordem: 2 },
        { exercicio_id: exercicioId, tipo: 'secreto', entrada: '-3', saida_esperada: '-6', ordem: 3 },
      ]),
    })
  })

  test('o aluno entrega uma vez, com confirmação, e não consegue entregar de novo', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto(`exercicio/${exercicioId}`)
    await escrever(page, 'const n = Number(prompt("Número: "))\nconsole.log(n * 2)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['4'])
    await expect(page.locator('.terminal-saida').first()).toHaveText('Número: 4\n8')
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible()

    // A pergunta aparece e dá para desistir.
    await page.getByRole('button', { name: 'Entregar', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toContainText('não dá para desfazer nem mudar')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)

    await entregarConfirmando(page)
    await expect(page.getByText(/Entrega 1 enviada: 2 de 2 testes certos/)).toBeVisible()
    await page.reload()
    await expect(page.getByText('Você já entregou este exercício')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entregar', exact: true })).toHaveCount(0)
    expect(erros).toEqual([])
  })

  test('o professor abre o código, roda os testes, corrige e devolve', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor?aba=entregas')
    await page.getByRole('button', { name: /1º INFO V · \d{4} · ALG/ }).click()
    const exercicio = page.getByRole('region', { name: `Exercício ${TITULO}` })
    await expect(exercicio).toContainText(/\d+ de \d+ entregaram/)
    await exercicio.getByRole('button', { name: `Abrir a entrega de ${NOME}` }).click()
    const detalhe = page.getByRole('region', { name: `Entrega de ${NOME}` })
    await expect(detalhe.getByLabel(`Código de ${NOME}`)).toContainText('console.log(n * 2)')

    await detalhe.getByRole('button', { name: '▶ Rodar os testes' }).click()
    await expect(detalhe.getByText('3 de 3 testes certos (inclui os secretos)')).toBeVisible({ timeout: 30_000 })

    await detalhe.getByLabel('Nota (0 a 10)').fill('9,5')
    await detalhe.getByLabel('Comentário para o aluno').fill('Muito bem! Teste também números negativos.')
    await detalhe.getByRole('button', { name: 'Salvar correção' }).click()
    await expect(detalhe.getByText(/Correção salva/)).toBeVisible()

    await detalhe.getByRole('button', { name: 'Devolver para refazer' }).click()
    await detalhe.getByRole('button', { name: 'Sim, devolver' }).click()
    await expect(detalhe.getByText(new RegExp(`Devolvida para ${NOME}`))).toBeVisible()
    await expect(exercicio.getByText(NOME).locator('xpath=ancestor::li')).toContainText('devolvida para refazer')
    expect(erros).toEqual([])
  })

  test('o aluno vê o comentário e a devolução, e entrega de novo', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await expect(page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO}.*devolvida`) })).toBeVisible()
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO}`) }).click()
    await expect(page.getByText('O professor devolveu a sua entrega para você refazer')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Suas entregas' })).toContainText('Nota do professor: 9,5')
    await expect(page.getByRole('region', { name: 'Suas entregas' })).toContainText('Muito bem! Teste também números negativos.')

    await escrever(page, 'const n = Number(prompt("Número: "))\nconsole.log(n * 2) // refeito')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['4'])
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible()
    await entregarConfirmando(page)
    await expect(page.getByText(/Entrega 2 enviada: 2 de 2 testes certos/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entregar', exact: true })).toHaveCount(0)
    expect(erros).toEqual([])
  })

  test('o professor vê o aluno na tripulação, com a entrega no perfil', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/tripulacao/${ofertaId}`)
    await page.getByRole('button', { name: `Perfil de ${NOME}` }).click()
    const perfil = page.getByRole('region', { name: `Perfil de ${NOME}` })
    await expect(perfil.getByText('Últimas entregas')).toBeVisible()
    await expect(perfil).toContainText(TITULO)
    expect(erros).toEqual([])
  })
})
