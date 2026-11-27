import { expect, test } from '@playwright/test'
import { criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// O professor monta uma prova no painel: uma questão vinda das aulas e outra
// criada só para a prova. Depois edita e remove. Dados inventados.

const professor = emailDeTeste('professor-provas')
const TITULO_PROVA = `Prova de laços ${Date.now() % 100_000}`
const TITULO_AULA = 'Soma de dois números (prova e2e)'
const TITULO_SO_DA_PROVA = 'Maior de três (só da prova)'
let ofertaId = 0
let exercicioId = 0

test.describe.serial('Provas no painel do professor', () => {
  test.setTimeout(90_000)

  test.beforeAll(async () => {
    await criarProfessor(professor, 'Professor Fictício das Provas')
    ofertaId = await oferta('3º INFO M', 'WEB')
    const aulaId =
      (
        await rest<Array<{ id: number }>>(
          'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.1&unidades.numero=eq.1&unidades.disciplinas.sigla=eq.WEB',
        )
      )[0]?.id ?? 0
    const existentes = await rest<Array<{ id: number }>>(`exercicios?select=id&aula_id=eq.${aulaId}&titulo=eq.${encodeURIComponent(TITULO_AULA)}`)
    exercicioId = existentes[0]?.id ?? 0
    if (existentes.length === 0) {
      const [ex] = await rest<Array<{ id: number }>>('exercicios', {
        method: 'POST',
        body: JSON.stringify({ aula_id: aulaId, titulo: TITULO_AULA, enunciado: 'Leia dois números e mostre a soma.', linguagem: 'python' }),
      })
      exercicioId = ex!.id
      await rest('testes', {
        method: 'POST',
        body: JSON.stringify([
          { exercicio_id: ex!.id, tipo: 'visivel', entrada: '1\n2', saida_esperada: '3', ordem: 0 },
          { exercicio_id: ex!.id, tipo: 'oculto', entrada: '5\n5', saida_esperada: '10', ordem: 1 },
        ]),
      })
    }
  })

  test('professor monta a prova com uma questão das aulas e uma só da prova', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor?aba=provas')
    await page.getByRole('link', { name: '+ Nova prova' }).click()
    await expect(page.getByRole('heading', { name: 'Montar a prova' })).toBeVisible()

    const form = page.getByRole('form', { name: 'Dados da prova' })
    await form.getByLabel('Turma e disciplina').selectOption(String(ofertaId))
    await form.getByLabel('Título').fill(TITULO_PROVA)
    await form.getByLabel('Duração (minutos)').fill('50')
    await form.getByLabel('Se o aluno sair da aba').selectOption('2')

    // Salvar sem questões avisa antes de enviar.
    await page.getByRole('button', { name: 'Salvar prova' }).click()
    await expect(page.getByText('Coloque pelo menos uma questão.')).toBeVisible()

    await page.getByLabel('Usar um exercício das aulas').selectOption(String(exercicioId))
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    await expect(page.locator('.provas-questao', { hasText: TITULO_AULA })).toContainText('Unidade I · Aula 1')

    await page.getByRole('button', { name: '+ Criar questão só desta prova' }).click()
    const nova = page.getByRole('form', { name: 'Nova questão só desta prova' })
    await expect(nova.getByText('Dificuldade')).toHaveCount(0)
    await nova.getByLabel('Título').fill(TITULO_SO_DA_PROVA)
    await nova.getByLabel('Enunciado').fill('Leia três números e mostre o maior.')
    await nova.getByLabel('Entrada do teste 1').fill('1\n9\n4')
    await nova.getByLabel('Saída esperada do teste 1').fill('9')
    await nova.getByLabel('Entrada do teste 2').fill('7\n2\n3')
    await nova.getByLabel('Saída esperada do teste 2').fill('7')
    await nova.getByRole('button', { name: 'Salvar questão' }).click()
    await expect(page.locator('.provas-questao', { hasText: TITULO_SO_DA_PROVA })).toContainText('Só desta prova')

    await page.getByLabel('Peso').nth(1).fill('2,5')
    await page.getByRole('button', { name: `Subir ${TITULO_SO_DA_PROVA}` }).click()
    await expect(page.locator('.provas-questao').first()).toContainText(TITULO_SO_DA_PROVA)

    await page.getByRole('button', { name: 'Salvar prova' }).click()
    await expect(page).toHaveURL(/\/professor\?aba=provas$/)
    const item = page.locator('.provas-item', { hasText: TITULO_PROVA })
    await expect(item).toContainText('2 questões')
    expect(erros).toEqual([])

    const [prova] = await rest<Array<{ id: number; duracao_min: number; saidas_para_encerrar: number }>>(
      `provas?select=id,duracao_min,saidas_para_encerrar&titulo=eq.${encodeURIComponent(TITULO_PROVA)}`,
    )
    expect(prova).toMatchObject({ duracao_min: 50, saidas_para_encerrar: 2 })
    const questoes = await rest<Array<{ peso: number; ordem: number; exercicios: { titulo: string; aula_id: number | null } }>>(
      `prova_questoes?select=peso,ordem,exercicios(titulo,aula_id)&prova_id=eq.${prova!.id}&order=ordem`,
    )
    expect(questoes.map((q) => [q.exercicios.titulo, Number(q.peso), q.exercicios.aula_id === null])).toEqual([
      [TITULO_SO_DA_PROVA, 2.5, true],
      [TITULO_AULA, 1, false],
    ])
  })

  test('professor edita e depois remove a prova', async ({ page }) => {
    await entrar(page, professor)
    await page.goto('professor?aba=provas')
    const item = page.locator('.provas-item', { hasText: TITULO_PROVA })
    await item.getByRole('link', { name: `Editar ${TITULO_PROVA}` }).click()
    await expect(page.getByRole('heading', { name: TITULO_PROVA })).toBeVisible()
    await expect(page.getByLabel('Turma e disciplina')).toBeDisabled()
    await page.getByRole('button', { name: `Tirar ${TITULO_AULA} da prova` }).click()
    await page.getByRole('button', { name: 'Salvar prova' }).click()
    await expect(item).toContainText('1 questão')

    await item.getByRole('button', { name: `Remover ${TITULO_PROVA}` }).click()
    await item.getByRole('button', { name: /Sim, remover/ }).click()
    await expect(item).toHaveCount(0)
    const restantes = await rest<unknown[]>(`exercicios?select=id&titulo=eq.${encodeURIComponent(TITULO_SO_DA_PROVA)}&aula_id=is.null`)
    expect(restantes).toEqual([])
  })
})
