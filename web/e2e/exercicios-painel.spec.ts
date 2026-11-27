import { expect, test, type Page } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, entregarConfirmando, oferta, registrarErros, responderNoTerminal, rest } from './apoio.ts'

// O professor cria um exercício pelo painel (com as saídas preenchidas pela
// solução, rodando o Python de verdade) e o aluno resolve. Dados inventados.

const aluno = emailDeTeste('exercicio-painel')
const aluno2 = emailDeTeste('exercicio-painel-2')
const professor = emailDeTeste('professor-exercicios')
const TITULO = 'Dobro de um número'
let aulaId = 0
let aluno2Id = ''

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
    aluno2Id = await criarConta(aluno2, 'Quasar Exemplo Fictício', { ofertaId: algV, quemEVoce: 'Quasar Exemplo Fictício, 1º INFO V, tarde' })
    await rest(`matriculas?aluno_id=eq.${aluno2Id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
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
    await expect(page.locator('li', { hasText: TITULO })).toContainText('Python · Médio · +35 XP · 1 visível, 1 oculto, 1 secreto')
    expect(erros).toEqual([])
  })

  test('aluno vê o exercício na aula liberada e acerta', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO}`) }).click()
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible()
    await escrever(page, 'Editor de código Python', 'n = int(input())\nprint(n * 2)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['3'])
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible({ timeout: 60_000 })
    await entregarConfirmando(page)
    await expect(page.getByText('Entrega 1 enviada: 2 de 2 testes certos. +35 XP, a confirmar pelo professor.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Suas entregas' })).toContainText('a confirmar pelo professor')
    expect(erros).toEqual([])
  })

  test('outro aluno acerta os testes abertos com um código que falha no secreto', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno2)
    await page.goto('ponte')
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO}`) }).click()
    await escrever(page, 'Editor de código Python', 'n = int(input())\nprint(n * 2 if n != 0 else 1)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['3'])
    await expect(page.getByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeVisible({ timeout: 60_000 })
    await entregarConfirmando(page)
    await expect(page.getByText(/Entrega 1 enviada: 2 de 2 testes certos/)).toBeVisible()
    expect(erros).toEqual([])
  })

  test('professor reconfere: uma confirma, a outra não confere e perde o XP', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/exercicios/${aulaId}`)
    const item = page.locator('li', { hasText: TITULO })
    await expect(item).toContainText('2 entregas · 2 a confirmar')
    await item.getByRole('button', { name: `Reconferir as entregas de ${TITULO}` }).click()
    const painel = page.getByRole('region', { name: `Reconferência de ${TITULO}` })
    await expect(painel.getByText('Pronto: 1 confirmada e 1 sem conferir.')).toBeVisible({ timeout: 60_000 })
    await expect(painel).toContainText('Nebulosa Exemplo Fictícia (entrega 1): Confere: 2 de 2 testes e o secreto.')
    await expect(painel).toContainText('Quasar Exemplo Fictício (entrega 1): Errou o teste secreto.')
    await expect(item).not.toContainText('a confirmar')
    const xp = await rest<Array<{ situacao: string }>>(`xp_eventos?aluno_id=eq.${aluno2Id}&motivo=eq.exercicio&select=situacao`)
    expect(xp.map((x) => x.situacao)).toEqual(['retirado'])
    expect(erros).toEqual([])
  })

  test('o aluno vê que a entrega não conferiu', async ({ page }) => {
    await entrar(page, aluno2)
    await page.goto('ponte')
    await page.getByRole('link', { name: new RegExp(`Exercício: ${TITULO}`) }).click()
    await expect(page.getByRole('region', { name: 'Suas entregas' })).toContainText('não conferiu na reconferência')
  })
})
