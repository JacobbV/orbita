import { expect, test, type Page } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, entregarConfirmando, oferta, registrarErros, responderNoTerminal, rest } from './apoio.ts'

// Ajuda nos exercícios com o Python de verdade: diferença da saída, dicas
// liberadas aos poucos e erros em português com a linha marcada. Dados inventados.

let exercicioId = 0
const aluno = emailDeTeste('ajuda')
const professor = emailDeTeste('ajuda-prof')
const TITULO = 'Soma com ajuda'
const LARGURAS = [360, 393, 768, 1280, 1920, 2560]

async function escreverCodigo(page: Page, codigo: string) {
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(codigo)
}

async function prints(page: Page, nome: string) {
  const pasta = process.env.PRINTS_DIR
  if (!pasta) return
  for (const largura of LARGURAS) {
    await page.setViewportSize({ width: largura, height: 900 })
    // Do topo: o menu fixo não fica por cima do conteúdo na foto da página inteira.
    await page.evaluate(() => window.scrollTo(0, 0))
    // Nada de rolagem horizontal em nenhuma largura.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `${pasta}/${nome}-${largura}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1280, height: 720 })
}

test.describe.serial('Ajuda nos exercícios', () => {
  test.setTimeout(180_000)

  test.beforeAll(async () => {
    const algV = await oferta('1º INFO V', 'ALG')
    const id = await criarConta(aluno, 'Nebulosa Ajuda Fictícia', { ofertaId: algV, quemEVoce: 'Nebulosa Ajuda Fictícia, 1º INFO V, tarde' })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Ajuda Fictício')
    const aula = (
      await rest<Array<{ id: number }>>(
        'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.3&unidades.numero=eq.1&unidades.disciplinas.sigla=eq.ALG',
      )
    )[0]?.id
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: algV, aula_id: aula }),
    })
    await rest(`exercicios?aula_id=eq.${aula}&titulo=eq.${encodeURIComponent(TITULO)}`, { method: 'DELETE' })
    const [exercicio] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({
        aula_id: aula,
        titulo: TITULO,
        enunciado: 'Leia dois números inteiros, um por linha, e mostre a soma.',
        codigo_inicial: '',
        dificuldade: 1,
        dicas: ['O input() devolve texto: use int() para virar número.', 'A soma usa o sinal +.'],
      }),
    })
    exercicioId = exercicio?.id ?? 0
    await rest('testes', {
      method: 'POST',
      body: JSON.stringify([
        { exercicio_id: exercicioId, tipo: 'visivel', entrada: '1\n2', saida_esperada: '3', ordem: 1 },
        { exercicio_id: exercicioId, tipo: 'oculto', entrada: '5\n5', saida_esperada: '10', ordem: 2 },
      ]),
    })
  })

  test('aluno vê a diferença da saída e libera a dica depois de 2 tentativas erradas', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto(`exercicio/${exercicioId}`)
    const dicas = page.getByRole('region', { name: 'Dicas' })
    await expect(dicas).toContainText('Dica 1: libera depois de mais 2 tentativas erradas.')
    await expect(dicas).not.toContainText('use int()')

    await escreverCodigo(page, 'a = int(input())\nb = int(input())\nprint("Resultado:", a * b)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['1', '2'])
    await expect(page.getByRole('heading', { name: '0 de 2 testes certos' })).toBeVisible({ timeout: 60_000 })
    const visivel = page.locator('.exercicio-teste-errado').first()
    await expect(visivel).toContainText('O que está diferente')
    await expect(visivel).toContainText('Onde era 3, o seu programa mostrou 2.')
    // O oculto nunca mostra a resposta nem a diferença.
    await expect(page.locator('.exercicio-teste-errado').nth(1)).not.toContainText('Onde era')
    await expect(dicas).toContainText('Dica 1: libera depois de mais 1 tentativa errada.')

    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['1', '2'])
    await dicas.getByRole('button', { name: '💡 Abrir a dica 1' }).click()
    await expect(dicas).toContainText('O input() devolve texto: use int() para virar número.')
    await expect(dicas).not.toContainText('A soma usa o sinal +.')
    await prints(page, 'diferenca-e-dica')

    // Recarregou a página: a dica aberta continua aberta.
    await page.reload()
    await expect(page.getByRole('region', { name: 'Dicas' })).toContainText('use int() para virar número')
    expect(erros).toEqual([])
  })

  test('erro do Python em português, com a linha marcada no editor', async ({ page }) => {
    await entrar(page, aluno)
    await page.goto(`exercicio/${exercicioId}`)
    await escreverCodigo(page, 'a = 1\nb = 2\nprint(a + c)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    const terminal = page.getByRole('region', { name: 'Terminal' })
    await expect(terminal).toContainText('Erro na linha 3 (NameError):', { timeout: 60_000 })
    await expect(terminal).toContainText('O nome “c” não existe.')
    await expect(terminal).toContainText("NameError: name 'c' is not defined")
    await expect(page.locator('.cm-line').nth(2)).toHaveClass(/editor-codigo-linha-erro/)
    await expect(page.locator('.editor-codigo-linha-erro')).toHaveCount(1)
    await prints(page, 'erro-em-portugues')

    // Mexeu no código: a marca sai.
    await page.locator('.cm-content').click()
    await page.keyboard.press('End')
    await page.keyboard.type(' ')
    await expect(page.locator('.editor-codigo-linha-erro')).toHaveCount(0)

    await escreverCodigo(page, 'print("oi"')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(terminal).toContainText('Faltou fechar o (.', { timeout: 60_000 })
    await expect(page.locator('.cm-line').first()).toHaveClass(/editor-codigo-linha-erro/)
  })

  test('professor escreve as dicas no painel', async ({ page }) => {
    await entrar(page, professor)
    await page.goto(`professor/exercicios/${(await rest<Array<{ aula_id: number }>>(`exercicios?id=eq.${exercicioId}&select=aula_id`))[0]?.aula_id}`)
    await page.getByRole('button', { name: `Editar ${TITULO}` }).click()
    const form = page.getByRole('form', { name: `Editar: ${TITULO}` })
    await expect(form.getByLabel(/^Dica 1 /)).toHaveValue('O input() devolve texto: use int() para virar número.')
    await form.getByLabel(/^Dica 3 /).fill('Mostre só o resultado com print(a + b).')
    await prints(page, 'painel-dicas')
    await form.getByRole('button', { name: 'Salvar exercício' }).click()
    await expect(page.getByText(`Exercício "${TITULO}" salvo.`)).toBeVisible()
    const [salvo] = await rest<Array<{ dicas: string[] }>>(`exercicios?id=eq.${exercicioId}&select=dicas`)
    expect(salvo?.dicas).toEqual([
      'O input() devolve texto: use int() para virar número.',
      'A soma usa o sinal +.',
      'Mostre só o resultado com print(a + b).',
    ])
  })

  test('Modo Ninja: dicas abertas, diferença e erro em português, sem XP', async ({ page }) => {
    const xpAntes = (await rest<unknown[]>('xp_eventos?select=id')).length
    await entrar(page, professor)
    await page.goto('professor')
    await page.getByRole('button', { name: 'Modo Ninja' }).click()
    await expect(page.getByRole('heading', { name: 'Ninja na nave' })).toBeVisible()
    await page.goto(`exercicio/${exercicioId}`)
    const dicas = page.getByRole('region', { name: 'Dicas' })
    await expect(dicas).toContainText('A soma usa o sinal +.')
    await expect(dicas).toContainText('Mostre só o resultado com print(a + b).')

    await escreverCodigo(page, 'a = int(input())\nb = int(input())\nprint(a - b)')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await responderNoTerminal(page, ['1', '2'])
    await expect(page.locator('.exercicio-teste-errado').first()).toContainText('Onde era 3, o seu programa mostrou -1.', { timeout: 60_000 })

    await escreverCodigo(page, 'print(int(input()) + int(input())')
    await page.getByRole('button', { name: '▶ Rodar' }).click()
    await expect(page.getByRole('region', { name: 'Terminal' })).toContainText('Faltou fechar o (.', { timeout: 60_000 })

    await escreverCodigo(page, 'print(int(input()) + int(input()))')
    await entregarConfirmando(page)
    await expect(page.getByText(/Entrega de treino: 2 de 2 testes certos/)).toBeVisible({ timeout: 60_000 })
    expect((await rest<unknown[]>('xp_eventos?select=id')).length).toBe(xpAntes)
  })
})
