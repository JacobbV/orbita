import { expect, test, type Page } from '@playwright/test'
import { criarConta, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// O aluno faz a prova: lista na ponte, cronômetro, colar desligado, saída da aba
// registrada, entrega, encerramento por saídas e por tempo. Dados inventados.

const aluno = emailDeTeste('prova-aluno')
const RODADA = `${Date.now() % 100_000}`
const TITULO_A = `Prova A ${RODADA}`
const TITULO_B = `Prova B ${RODADA}`
const TITULO_C = `Prova C ${RODADA}`
let alunoId = ''
let ofertaId = 0
const provas: Record<string, number> = {}

async function criarProva(chave: string, titulo: string, opcoes: { abreEmMs: number; fechaEmMs: number; saidas: number | null }) {
  const agora = Date.now()
  const [prova] = await rest<Array<{ id: number }>>('provas', {
    method: 'POST',
    body: JSON.stringify({
      turma_disciplina_id: ofertaId,
      titulo,
      instrucoes: 'Sem consulta. Use só o editor do site.',
      abre_em: new Date(agora + opcoes.abreEmMs).toISOString(),
      fecha_em: new Date(agora + opcoes.fechaEmMs).toISOString(),
      duracao_min: 30,
      saidas_para_encerrar: opcoes.saidas,
    }),
  })
  const [ex] = await rest<Array<{ id: number }>>('exercicios', {
    method: 'POST',
    body: JSON.stringify({
      aula_id: null,
      titulo: `Dobro ${titulo}`,
      enunciado: 'Leia um número inteiro e mostre o dobro dele.',
      linguagem: 'python',
      codigo_inicial: 'n = int(input())\n',
    }),
  })
  await rest('testes', {
    method: 'POST',
    body: JSON.stringify([
      { exercicio_id: ex!.id, tipo: 'visivel', entrada: '4', saida_esperada: '8', ordem: 0 },
      { exercicio_id: ex!.id, tipo: 'oculto', entrada: '-3', saida_esperada: '-6', ordem: 1 },
    ]),
  })
  await rest('prova_questoes', { method: 'POST', body: JSON.stringify({ prova_id: prova!.id, exercicio_id: ex!.id, peso: 1, ordem: 0 }) })
  provas[chave] = prova!.id
}

async function escrever(page: Page, rotulo: string, codigo: string) {
  const editor = page.locator(`.cm-content[aria-label="${rotulo}"]`)
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(codigo)
}

/** Faz de conta que o aluno saiu da aba: o foco some e a janela perde o foco. */
async function sairDaAba(page: Page) {
  await page.evaluate(() => {
    document.hasFocus = () => false
    window.dispatchEvent(new Event('blur'))
  })
}

async function voltarParaAba(page: Page) {
  await page.evaluate(() => {
    document.hasFocus = () => true
    window.dispatchEvent(new Event('focus'))
  })
}

test.describe.serial('Aluno faz a prova', () => {
  test.setTimeout(120_000)

  test.beforeAll(async () => {
    ofertaId = await oferta('1º INFO V', 'ALG')
    alunoId = await criarConta(aluno, 'Aurora Exemplo Fictícia', { ofertaId, quemEVoce: 'Aurora Exemplo Fictícia, 1º INFO V, tarde' })
    await rest(`matriculas?aluno_id=eq.${alunoId}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProva('A', TITULO_A, { abreEmMs: -3_600_000, fechaEmMs: 3_600_000, saidas: null })
    await criarProva('B', TITULO_B, { abreEmMs: -3_600_000, fechaEmMs: 3_600_000, saidas: 1 })
  })

  test('faz a prova, salva a resposta, tem o colar barrado e a saída registrada, e entrega', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    const item = page.locator('.provas-ponte-item', { hasText: TITULO_A })
    await expect(item).toContainText('Aberta agora')
    await item.getByRole('link', { name: /Fazer a prova/ }).click()

    await expect(page.getByRole('heading', { name: TITULO_A })).toBeVisible()
    await expect(page.getByText('Sem consulta. Use só o editor do site.')).toBeVisible()
    await expect(page.getByText(/Ele não consegue impedir a saída/)).toBeVisible()
    await page.getByRole('button', { name: 'Começar a prova' }).click()

    await expect(page.getByText('Prova em andamento')).toBeVisible()
    await expect(page.getByRole('timer')).toHaveText(/^\d{2}:\d{2}$/)
    await expect(page.getByText('Leia um número inteiro e mostre o dobro dele.')).toBeVisible()

    // Colar no editor fica barrado, com aviso.
    await page.locator('.cm-content[aria-label="Editor de código da questão 1"]').click()
    await page.evaluate(() => {
      const dados = new DataTransfer()
      dados.setData('text/plain', 'print("colado")')
      document.querySelector('.cm-content')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dados, bubbles: true, cancelable: true }))
    })
    await expect(page.getByText('Colar está desligado na prova. Digite o código.')).toBeVisible()
    await expect(page.locator('.cm-content')).not.toContainText('colado')

    await escrever(page, 'Editor de código da questão 1', 'n = int(input())\nprint(n * 2)')
    await page.getByRole('button', { name: '✓ Testar e salvar resposta' }).click()
    await expect(page.getByText('Resposta salva: 2 de 2 testes certos.')).toBeVisible({ timeout: 60_000 })

    // Saída da aba: registra, avisa e depois registra a volta.
    await sairDaAba(page)
    await expect(page.getByText('Você saiu da prova 1 vez. O professor vê isso.')).toBeVisible()
    await voltarParaAba(page)
    await expect
      .poll(async () => (await rest<Array<{ voltou_em: string | null }>>('prova_saidas?select=voltou_em&order=id.desc&limit=1'))[0]?.voltou_em ?? null)
      .not.toBeNull()

    await page.getByRole('button', { name: 'Entregar a prova' }).click()
    await expect(page.getByText(/Questão sem resposta salva vale zero/)).toBeVisible()
    await page.getByRole('button', { name: 'Sim, entregar' }).click()
    await expect(page.getByText('Prova entregue.')).toBeVisible()
    await expect(page.getByText('A nota aparece aqui quando o professor publicar.')).toBeVisible()
    expect(erros).toEqual([])

    const [resposta] = await rest<Array<{ codigo: string; testes_certos: number; testes_total: number }>>(
      `prova_respostas?select=codigo,testes_certos,testes_total&tentativa_id=in.(${(
        await rest<Array<{ id: number }>>(`prova_tentativas?select=id&prova_id=eq.${provas.A}&aluno_id=eq.${alunoId}`)
      )
        .map((t) => t.id)
        .join(',')})`,
    )
    expect(resposta).toMatchObject({ testes_certos: 2, testes_total: 2 })
    expect(resposta!.codigo).toContain('print(n * 2)')

    // Voltar à prova entregue mostra o encerramento e não deixa começar de novo.
    await page.goto(`prova/${provas.A}`)
    await expect(page.getByText('Prova entregue.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Começar|Continuar/ })).toHaveCount(0)
  })

  test('a prova encerra na primeira saída quando o professor pediu', async ({ page }) => {
    await entrar(page, aluno)
    await page.goto(`prova/${provas.B}`)
    await expect(page.getByText(/Encerra na 1ª saída da aba/)).toBeVisible()
    await page.getByRole('button', { name: 'Começar a prova' }).click()
    await expect(page.getByText('Prova em andamento')).toBeVisible()
    await sairDaAba(page)
    await expect(page.getByText('A prova foi encerrada porque você saiu da aba mais vezes do que o professor permitiu.')).toBeVisible()
  })

  test('quando o tempo acaba, a prova é entregue sozinha', async ({ page }) => {
    await entrar(page, aluno)
    // Criada aqui, e não no beforeAll, para o prazo curto contar a partir deste teste.
    await criarProva('C', TITULO_C, { abreEmMs: -3_600_000, fechaEmMs: 15_000, saidas: null })
    await page.goto(`prova/${provas.C}`)
    await page.getByRole('button', { name: 'Começar a prova' }).click()
    await expect(page.getByText('Prova em andamento')).toBeVisible()
    await expect(page.getByText('O tempo acabou e a prova foi entregue.')).toBeVisible({ timeout: 60_000 })
  })
})
