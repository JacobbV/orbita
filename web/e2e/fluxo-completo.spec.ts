import { expect, test, type Browser, type Page } from '@playwright/test'
import { criarProfessor, emailDeTeste, entrar, linkDoEmail, oferta, registrarErros, rest } from './apoio.ts'

// Fluxo principal da Fase 1, do jeito que acontece na sala:
// cadastro → confirmação do e-mail → recusa com motivo → novo pedido →
// aprovação → aula liberada com link → aluno abre → professor bloqueia.

const TURMA = '3º INFO V'
const DISCIPLINA = 'Desenvolvimento de Aplicações Web'
const aluno = { nome: 'Nebulosa Fictícia da Silva', email: emailDeTeste('aluno') }
const professor = { nome: 'Professor Fictício', email: emailDeTeste('professor') }

let ofertaId = 0

async function novaAba(browser: Browser, email?: string): Promise<{ page: Page; erros: string[] }> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const erros = registrarErros(page)
  if (email) await entrar(page, email)
  return { page, erros }
}

/** Linha da aula na ponte do aluno, pelo número exato ("I.2" não confunde com "II.2"). */
function aulaNaPonte(page: Page, numero: string) {
  return page.locator('li.ponte-aula', { has: page.locator('.ponte-aula-numero', { hasText: new RegExp(`^${numero.replace('.', '\\.')}$`) }) })
}

test.describe.serial('Fluxo completo: cadastro, aprovação e aula liberada', () => {
  test.beforeAll(async () => {
    ofertaId = await oferta(TURMA, 'WEB')
    // A turma começa sem aulas liberadas, mesmo que outra execução tenha deixado alguma.
    await rest(`liberacoes?turma_disciplina_id=eq.${ofertaId}`, { method: 'DELETE' })
    await criarProfessor(professor.email, professor.nome)
  })

  test('aluno se cadastra, confirma o e-mail e aguarda a aprovação', async ({ page }) => {
    const erros = registrarErros(page)
    await page.goto('cadastro')
    await expect(page.getByText('Só funciona com e-mail acadêmico')).toBeVisible()
    await page.getByLabel('Nome completo').fill(aluno.nome)
    await page.getByLabel('E-mail acadêmico').fill(aluno.email)
    await page.getByLabel('Disciplina').selectOption({ label: DISCIPLINA })
    await page.getByLabel('Turma').selectOption({ label: `${TURMA} · 2026 (tarde)` })
    await page.getByLabel('Quem é você').fill(`${aluno.nome}, ${TURMA}, tarde`)
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Enviar pedido de acesso' }).click()
    await expect(page.getByText('Confirme o seu e-mail')).toBeVisible()

    // Antes de confirmar, o login avisa.
    await page.goto('entrar')
    await page.getByLabel('E-mail acadêmico').fill(aluno.email)
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('Confirme o seu e-mail')

    // O link do e-mail confirma a conta e abre a tela de espera.
    await page.goto(await linkDoEmail(aluno.email, /confirm/i))
    await expect(page).toHaveURL(/\/orbita\/aguardando/)
    await expect(page.getByText('Aguardando', { exact: true })).toBeVisible()
    expect(erros).toEqual([])
  })

  test('professor recusa com motivo e o aluno pede de novo', async ({ browser }) => {
    const prof = await novaAba(browser, professor.email)
    await expect(prof.page).toHaveURL(/\/orbita\/professor/)
    const cartao = prof.page.locator('li', { hasText: aluno.nome })
    await expect(cartao.getByText(`${aluno.nome}, ${TURMA}, tarde`)).toBeVisible()
    await cartao.getByRole('button', { name: 'Recusar' }).click()
    await cartao.getByLabel('Motivo da recusa (opcional)').fill('Confira a turma e o turno.')
    await cartao.getByRole('button', { name: 'Confirmar recusa' }).click()
    await expect(prof.page.getByText(`Pedido de ${aluno.nome} recusado.`)).toBeVisible()

    const estudante = await novaAba(browser, aluno.email)
    await expect(estudante.page).toHaveURL(/\/orbita\/aguardando/)
    await expect(estudante.page.getByText('Confira a turma e o turno.')).toBeVisible()
    await estudante.page.getByRole('button', { name: /Pedir de novo/ }).click()
    const novoPedido = estudante.page.locator('form.pedido-form')
    await novoPedido.getByLabel('Quem é você').fill(`${aluno.nome}, ${TURMA}, turno da tarde`)
    await novoPedido.getByRole('button', { name: 'Enviar novo pedido' }).click()
    await expect(estudante.page.getByText('Aguardando', { exact: true })).toBeVisible()
    expect([...prof.erros, ...estudante.erros]).toEqual([])
  })

  test('professor aprova, libera uma aula com link e o aluno vê só ela', async ({ browser }) => {
    const prof = await novaAba(browser, professor.email)
    const cartao = prof.page.locator('li', { hasText: aluno.nome })
    await expect(cartao.getByText('Tentativa 2 de 3')).toBeVisible()
    await cartao.getByRole('button', { name: 'Aprovar' }).click()
    await expect(prof.page.getByText(`Pedido de ${aluno.nome} aprovado.`)).toBeVisible()

    await prof.page.getByRole('link', { name: 'Aulas', exact: true }).click()
    await prof.page.getByLabel('Turma e disciplina').selectOption(String(ofertaId))
    // Link na I.1 (liberada) e na I.2 (que continua bloqueada).
    for (const [numero, url] of [
      ['I.1', 'https://exemplo.org/e2e-web-1'],
      ['I.2', 'https://exemplo.org/e2e-web-2-bloqueada'],
    ] as const) {
      await prof.page.getByRole('button', { name: `Editar aula ${numero}`, exact: true }).click()
      await prof.page.getByLabel('Link da aula (Drive, slides)').fill(url)
      await prof.page.getByRole('button', { name: 'Salvar aula' }).click()
      await expect(prof.page.getByText(`Aula ${numero} salva.`)).toBeVisible()
    }
    await prof.page.getByRole('button', { name: 'Liberar aula I.1', exact: true }).click()
    await expect(prof.page.getByText(`Aula I.1 liberada para ${TURMA}.`)).toBeVisible()

    const estudante = await novaAba(browser, aluno.email)
    await expect(estudante.page).toHaveURL(/\/orbita\/ponte/)
    await expect(estudante.page.getByText(`${TURMA} · tarde · 2026`)).toBeVisible()
    await expect(estudante.page.getByText(/1 de 24 aulas liberadas/)).toBeVisible()
    const liberada = aulaNaPonte(estudante.page, 'I.1')
    await expect(liberada.getByRole('link', { name: /Material da aula/ })).toHaveAttribute('href', 'https://exemplo.org/e2e-web-1')
    const bloqueada = aulaNaPonte(estudante.page, 'I.2')
    await expect(bloqueada.getByText('Bloqueada')).toBeVisible()
    await expect(bloqueada.getByRole('link')).toHaveCount(0)
    // O link da aula bloqueada nem chega ao navegador.
    expect(await estudante.page.content()).not.toContain('e2e-web-2-bloqueada')
    expect([...prof.erros, ...estudante.erros]).toEqual([])
  })

  test('professor bloqueia a aula e o link some para o aluno', async ({ browser }) => {
    const prof = await novaAba(browser, professor.email)
    await prof.page.goto(`professor?aba=aulas&oferta=${ofertaId}`)
    await prof.page.getByRole('button', { name: 'Bloquear aula I.1', exact: true }).click()
    await expect(prof.page.getByText(`Aula I.1 bloqueada para ${TURMA}.`)).toBeVisible()

    const estudante = await novaAba(browser, aluno.email)
    await expect(estudante.page.getByText(/ainda não liberou nenhuma aula/)).toBeVisible()
    await expect(estudante.page.getByRole('link', { name: /Material da aula/ })).toHaveCount(0)
  })

  test('aluno não abre o painel e visitante vai para o login', async ({ browser }) => {
    const estudante = await novaAba(browser, aluno.email)
    await estudante.page.goto('professor')
    await expect(estudante.page).not.toHaveURL(/\/professor/)

    const visitante = await novaAba(browser)
    await visitante.page.goto('ponte')
    await expect(visitante.page).toHaveURL(/\/orbita\/entrar/)
  })
})
