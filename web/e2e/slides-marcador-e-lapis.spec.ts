import { expect, test, type Page } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, enviarSlidesDeTeste, oferta, registrarErros, rest } from './apoio.ts'

// Slides da aula: sem o botão "Editar" para o aluno, marcador de página e lápis.
// O arquivo de slides de teste tem a mesma estrutura dos slides reais (botão
// Editar no canto, tecla E, setas, Home e endereço #número do slide).

const aluno = emailDeTeste('marcador')
const professor = emailDeTeste('professor-marcador')
let materialId = 0
let alunoId = ''
let professorId = ''

const SLIDES =
  '<!doctype html><html lang="pt-BR"><head><title>Slides de teste</title><style>' +
  '*{margin:0}html,body{width:100%;height:100%;overflow:hidden}' +
  '.slide{position:absolute;inset:0;display:none;font:64px sans-serif;padding:40px}.slide.active{display:block}' +
  '.edit-hotzone{position:fixed;top:0;left:0;width:80px;height:80px;z-index:10000;cursor:pointer}' +
  '.edit-toggle{position:fixed;top:10px;left:10px;opacity:0;pointer-events:none;z-index:10001}' +
  '.edit-toggle.show,.edit-toggle.active{opacity:1;pointer-events:auto}' +
  '</style></head><body>' +
  [1, 2, 3, 4, 5].map((n) => `<section class="slide" id="s${n}">Slide número ${n}</section>`).join('') +
  '<div class="edit-hotzone"></div><button class="edit-toggle" id="editToggle">✏️ Editar</button>' +
  '<script>(function(){' +
  "var slides=[].slice.call(document.querySelectorAll('.slide')),cur=0;" +
  "function show(n){cur=Math.max(0,Math.min(slides.length-1,n));slides.forEach(function(s,k){s.classList.toggle('active',k===cur)});history.replaceState(null,'','#'+(cur+1))}" +
  "show((parseInt(location.hash.slice(1))||1)-1);" +
  "var hot=document.querySelector('.edit-hotzone'),tog=document.getElementById('editToggle');" +
  "function toggleEdit(){var on=document.body.classList.toggle('editing');tog.classList.toggle('active',on)}" +
  "addEventListener('keydown',function(e){" +
  "if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='Home')show(0);" +
  "else if(e.key==='e'||e.key==='E')toggleEdit()});" +
  "hot.addEventListener('mouseenter',function(){tog.classList.add('show')});hot.addEventListener('click',toggleEdit);tog.addEventListener('click',toggleEdit);" +
  '})()</script></body></html>'

async function slideAtivo(page: Page): Promise<string> {
  return (await page.frameLocator('iframe.slides-moldura').locator('.slide.active').textContent()) ?? ''
}

async function rabiscosGuardados(usuarioId: string): Promise<Record<string, unknown[]>> {
  const [linha] = await rest<Array<{ rabiscos: Record<string, unknown[]> }>>(
    `slides_do_usuario?select=rabiscos&usuario_id=eq.${usuarioId}&material_id=eq.${materialId}`,
  )
  return linha?.rabiscos ?? {}
}

/** Risca uma linha na camada de rabiscos, de um ponto a outro (em fração da largura e da altura). */
async function riscar(page: Page, de: [number, number], ate: [number, number]) {
  const caixa = await page.getByTestId('camada-de-rabiscos').boundingBox()
  if (!caixa) throw new Error('A camada de rabiscos não apareceu.')
  const ponto = ([fx, fy]: [number, number]) => [caixa.x + caixa.width * fx, caixa.y + caixa.height * fy] as const
  const [x0, y0] = ponto(de)
  const [x1, y1] = ponto(ate)
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8)
  await page.mouse.up()
}

test.describe.serial('Slides: Editar, marcador de página e lápis', () => {
  test.beforeAll(async () => {
    const ofertaId = await oferta('1º INFO V', 'ALG')
    alunoId = await criarConta(aluno, 'Íris Marcador', { ofertaId, quemEVoce: 'Íris Marcador, 1º INFO V, tarde' })
    await rest(`matriculas?aluno_id=eq.${alunoId}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
    professorId = (await rest<Array<{ id: string }>>(`perfis?select=id&email=eq.${encodeURIComponent(professor)}`))[0]?.id ?? ''
    const aula =
      (
        await rest<Array<{ id: number }>>(
          'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.1&unidades.numero=eq.1&unidades.disciplinas.sigla=eq.ALG',
        )
      )[0]?.id ?? 0
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: ofertaId, aula_id: aula }),
    })
    materialId = await enviarSlidesDeTeste(aula, SLIDES)
  })

  test('o aluno não vê o botão Editar, e a tecla E não abre a edição', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto(`slides/${materialId}`)
    const moldura = page.frameLocator('iframe.slides-moldura')
    await expect(moldura.locator('#s1')).toBeVisible()
    // O botão e a zona que o mostra somem para o aluno.
    await expect(moldura.locator('.edit-hotzone')).toBeHidden()
    await expect(moldura.locator('#editToggle')).toBeHidden()
    await page.locator('iframe.slides-moldura').focus()
    await page.keyboard.press('e')
    await expect(moldura.locator('body')).not.toHaveClass(/editing/)
    // As setas continuam funcionando.
    await page.keyboard.press('ArrowRight')
    await expect(moldura.locator('#s2')).toBeVisible()
    expect(erros).toEqual([])
  })

  test('o professor continua com o botão Editar', async ({ page }) => {
    await entrar(page, professor)
    await page.goto(`slides/${materialId}`)
    const moldura = page.frameLocator('iframe.slides-moldura')
    await expect(moldura.locator('#s1')).toBeVisible()
    await moldura.locator('.edit-hotzone').hover({ force: true })
    await expect(moldura.locator('#editToggle')).toBeVisible()
    await page.locator('iframe.slides-moldura').focus()
    await page.keyboard.press('e')
    await expect(moldura.locator('body')).toHaveClass(/editing/)
  })

  test('marcador de página: marca, sai, volta e continua de onde parou', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto(`slides/${materialId}`)
    await expect(page.frameLocator('iframe.slides-moldura').locator('#s1')).toBeVisible()
    await page.locator('iframe.slides-moldura').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Slide 3', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Marcar onde parei' }).click()
    await expect(page.getByRole('button', { name: 'Parei aqui' })).toBeVisible()
    await expect(page.getByTestId('fita-do-marcador')).toBeVisible()
    await expect
      .poll(async () => (await rest<Array<{ marcador: number }>>(`slides_do_usuario?select=marcador&usuario_id=eq.${alunoId}`))[0]?.marcador)
      .toBe(3)

    // Outra visita (como no dia seguinte): oferece continuar.
    await page.goto(`slides/${materialId}`)
    await expect(page.getByText('Você parou no slide 3.')).toBeVisible()
    expect(await slideAtivo(page)).toContain('número 1')
    await page.getByRole('button', { name: 'Continuar do slide 3' }).click()
    await expect(page.frameLocator('iframe.slides-moldura').locator('#s3')).toBeVisible()
    await expect(page.getByTestId('fita-do-marcador')).toBeVisible()
    await expect(page.getByText('Você parou no slide 3.')).toBeHidden()
    expect(erros).toEqual([])
  })

  test('lápis: rabisca, guarda sozinho, volta no mesmo lugar e a borracha apaga', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, aluno)
    await page.goto(`slides/${materialId}`)
    await expect(page.frameLocator('iframe.slides-moldura').locator('#s1')).toBeVisible()
    await page.getByRole('button', { name: 'Ficar aqui' }).click()
    await page.locator('iframe.slides-moldura').focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Slide 2', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Lápis' }).click()
    await page.getByRole('button', { name: 'Azul' }).click()
    await page.getByRole('button', { name: 'Grosso' }).click()
    await riscar(page, [0.2, 0.3], [0.7, 0.4])
    await page.getByRole('button', { name: 'Marca-texto' }).click()
    await page.getByRole('button', { name: 'Amarelo' }).click()
    await riscar(page, [0.2, 0.6], [0.8, 0.6])
    await expect(page.getByText(/Rabiscos guardados/)).toBeVisible()

    const guardados = await rabiscosGuardados(alunoId)
    expect(Object.keys(guardados)).toEqual(['2'])
    expect(guardados['2']).toMatchObject([
      { c: '#2563eb', w: 16, t: 'l' },
      { c: '#facc15', w: 16, t: 'm' },
    ])

    // Os rabiscos voltam em outra visita, no slide em que foram feitos.
    await page.goto(`slides/${materialId}`)
    await expect(page.frameLocator('iframe.slides-moldura').locator('#s1')).toBeVisible()
    await page.getByRole('button', { name: 'Ficar aqui' }).click({ trial: true }).catch(() => {})
    const tem = async () =>
      page.getByTestId('camada-de-rabiscos').evaluate((c: HTMLCanvasElement) => {
        const dados = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        for (let i = 3; i < dados.length; i += 4) if (dados[i]! > 0) return true
        return false
      })
    expect(await tem()).toBe(false)
    await page.locator('iframe.slides-moldura').focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(tem).toBe(true)

    // Borracha: passa por cima do traço azul e ele sai.
    await page.getByRole('button', { name: 'Borracha' }).click()
    await riscar(page, [0.45, 0.2], [0.45, 0.5])
    await expect(page.getByText(/Rabiscos guardados/)).toBeVisible()
    await expect.poll(async () => ((await rabiscosGuardados(alunoId))['2'] ?? []).length).toBe(1)

    // Limpar tela pede confirmação e esvazia o slide.
    await page.getByRole('button', { name: 'Limpar tela' }).click()
    await page.getByRole('button', { name: 'Sim, limpar o slide' }).click()
    await expect.poll(async () => Object.keys(await rabiscosGuardados(alunoId))).toEqual([])
    expect(erros).toEqual([])
  })

  test('os rabiscos e o marcador são pessoais: o professor não vê os do aluno', async ({ page }) => {
    await entrar(page, professor)
    await page.goto(`slides/${materialId}`)
    await expect(page.frameLocator('iframe.slides-moldura').locator('#s1')).toBeVisible()
    await expect(page.getByText('Você parou no slide')).toBeHidden()
    await page.getByRole('button', { name: 'Marcar onde parei' }).click()
    await expect(page.getByRole('button', { name: 'Parei aqui' })).toBeVisible()
    const linhas = await rest<Array<{ usuario_id: string; marcador: number }>>(
      `slides_do_usuario?select=usuario_id,marcador&material_id=eq.${materialId}&order=usuario_id`,
    )
    expect(linhas.map((l) => l.usuario_id).sort()).toEqual([alunoId, professorId].sort())
  })
})
