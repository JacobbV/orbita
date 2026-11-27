import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, enviarSlidesDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Menu do sistema com a bolinha de perfil e a ponte com "Continuar aula". Dados inventados.

const aluno = emailDeTeste('menu-ponte')
const professor = emailDeTeste('professor-menu')
let aulaId = 0
let ofertaId = 0

test.describe.serial('Menu do sistema e ponte', () => {
  test.beforeAll(async () => {
    ofertaId = await oferta('1º INFO M', 'ALG')
    const id = await criarConta(aluno, 'Vega Menu Fictícia', { ofertaId, quemEVoce: 'Vega Menu Fictícia, 1º INFO M, manhã' })
    await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
    const aulas = await rest<Array<{ id: number }>>(
      'aulas?select=id,unidade:unidades!inner(numero,disciplina:disciplinas!inner(sigla))&numero=eq.1&unidade.numero=eq.3&unidade.disciplina.sigla=eq.ALG',
    )
    aulaId = aulas[0]?.id ?? 0
    expect(aulaId).toBeGreaterThan(0)
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ turma_disciplina_id: ofertaId, aula_id: aulaId }),
    })
    await enviarSlidesDeTeste(aulaId, '<!doctype html><html><body><section><h1>Slide de teste</h1></section></body></html>')
  })

  test.afterAll(async () => {
    await rest(`liberacoes?turma_disciplina_id=eq.${ofertaId}&aula_id=eq.${aulaId}`, { method: 'DELETE' })
  })

  test('depois de entrar, o topo mostra os menus do sistema e a bolinha de perfil', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    const menu = page.getByRole('navigation', { name: 'Menu do sistema' })
    await expect(menu.getByRole('link', { name: 'Ponte' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Hangar' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Medalhas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Como funciona' })).toHaveCount(0)

    // Clicar no logo volta à página inicial, com os menus públicos.
    await page.getByRole('link', { name: 'Órbita, página inicial' }).click()
    await expect(page.getByRole('link', { name: 'Como funciona' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Minha área' })).toBeVisible()

    await page.getByRole('link', { name: 'Minha área' }).click()
    await page.getByRole('button', { name: /Menu da conta de/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    expect(erros).toEqual([])
  })

  test('a ponte mostra Começar aula, depois Continuar aula, e os dias seguidos', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto('ponte')
    await expect(page.getByRole('link', { name: 'Começar aula' })).toHaveAttribute('href', new RegExp(`/aula/${aulaId}$`))
    await expect(page.getByRole('heading', { name: 'Atividades abertas' })).toBeVisible()
    // Espera o banco confirmar a abertura antes de sair da aula (sair antes cancelaria o pedido).
    const aberturaGravada = page.waitForResponse((r) => r.url().includes('registrar_aula_aberta') && r.ok())
    await page.getByRole('link', { name: 'Começar aula' }).click()
    await expect(page).toHaveURL(new RegExp(`/aula/${aulaId}$`))
    await aberturaGravada

    // Abrir a aula grava a última aula aberta e o dia de estudo.
    await expect(async () => {
      await page.goto('ponte')
      await expect(page.getByRole('link', { name: 'Continuar aula' })).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Continuar aula' })).toHaveAttribute('href', new RegExp(`/aula/${aulaId}$`))
    await expect(page.getByText('dia seguido estudando')).toBeVisible()
    expect(erros).toEqual([])
  })
})
