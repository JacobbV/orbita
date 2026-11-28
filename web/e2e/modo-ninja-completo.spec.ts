import { expect, test, type Page } from '@playwright/test'
import { criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// O Modo Ninja tem tudo o que o aluno tem: mapa, resumo da ponte, apelido, entrega
// e prova de treino. Nada disso pode ir para o banco. Dados inventados.

const professor = emailDeTeste('ninja-completo')
const RODADA = `${Date.now() % 100_000}`
const TITULO = `Prova ninja ${RODADA}`
let professorId = ''
let provaId = 0

async function escrever(page: Page, rotulo: string, codigo: string) {
  const editor = page.locator(`.cm-content[aria-label="${rotulo}"]`)
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(codigo)
}

async function contar(tabela: string): Promise<number> {
  return (await rest<unknown[]>(`${tabela}?select=id`)).length
}

test.describe.serial('Modo Ninja completo', () => {
  test.setTimeout(120_000)

  test.beforeAll(async () => {
    await criarProfessor(professor, 'Professor Fictício Completo')
    const [p] = await rest<Array<{ id: string }>>(`perfis?select=id&email=eq.${encodeURIComponent(professor)}`)
    professorId = p!.id
    const ofertaId = await oferta('1º INFO M', 'ALG')
    const agora = Date.now()
    // Prova que só abre amanhã: o ninja treina mesmo assim.
    const [prova] = await rest<Array<{ id: number }>>('provas', {
      method: 'POST',
      body: JSON.stringify({
        turma_disciplina_id: ofertaId,
        titulo: TITULO,
        instrucoes: 'Sem consulta.',
        abre_em: new Date(agora + 86_400_000).toISOString(),
        fecha_em: new Date(agora + 90_000_000).toISOString(),
        duracao_min: 30,
        saidas_para_encerrar: null,
      }),
    })
    const [ex] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({
        aula_id: null,
        titulo: `Dobro ${TITULO}`,
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
    provaId = prova!.id
  })

  test('ponte, mapa, apelido e prova de treino, sem gravar nada', async ({ page }) => {
    const erros = registrarErros(page)
    const antes = { tentativas: await contar('prova_tentativas'), respostas: await contar('prova_respostas'), xp: await contar('xp_eventos') }

    await entrar(page, professor)
    await page.goto('professor')
    await page.getByRole('button', { name: 'Modo Ninja' }).click()
    await expect(page.getByRole('heading', { name: 'Ninja na nave' })).toBeVisible()
    await page.getByRole('button', { name: /^1º INFO M/ }).click()

    // O mesmo resumo da ponte do aluno.
    await expect(page.getByRole('region', { name: 'Resumo dos estudos' })).toBeVisible()
    await expect(page.getByText('XP não conta')).toBeVisible()

    // Apelido do ninja: sorteado, guardado só no navegador; o do professor não muda.
    const apelido = page.getByRole('region', { name: 'Apelido do ninja' })
    await apelido.getByRole('button', { name: 'Sortear apelido' }).click()
    const sorteado = (await apelido.locator('.apelido-sugestao').textContent())?.trim() ?? ''
    await apelido.getByRole('button', { name: 'Usar este' }).click()
    await expect(page.locator('.ponte-apelido')).toHaveText(`Apelido: ${sorteado}`)
    const [perfil] = await rest<Array<{ apelido: string | null }>>(`perfis?select=apelido&id=eq.${professorId}`)
    expect(perfil!.apelido).toBeNull()

    // Mapa da galáxia pelo menu, com tudo aberto.
    await page.getByRole('navigation', { name: 'Menu do sistema' }).getByRole('link', { name: 'Mapa' }).click()
    await expect(page.getByRole('heading', { name: 'Mapa da galáxia' })).toBeVisible()
    await expect(page.locator('.mapa-aula-bloqueada')).toHaveCount(0)

    // Prova de treino, antes do horário de abrir.
    await page.goto('ninja')
    await page.getByRole('button', { name: /^1º INFO M/ }).click()
    await page.getByRole('link', { name: `Treinar: ${TITULO}` }).click()
    await expect(page.getByText('Prova de treino do Modo Ninja')).toBeVisible()
    await page.getByRole('button', { name: 'Começar o treino' }).click()
    await escrever(page, 'Editor de código da questão 1', 'n = int(input())\nprint(n * 2)')
    await page.getByRole('button', { name: '✓ Testar e salvar resposta' }).click()
    await expect(page.getByText('Resposta salva: 2 de 2 testes certos.')).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Entregar a prova' }).click()
    await page.getByRole('button', { name: 'Sim, entregar' }).click()
    await expect(page.getByText(/Nota do treino: 10/)).toBeVisible()

    expect(await contar('prova_tentativas')).toBe(antes.tentativas)
    expect(await contar('prova_respostas')).toBe(antes.respostas)
    expect(await contar('xp_eventos')).toBe(antes.xp)
    expect(provaId).toBeGreaterThan(0)
    expect(erros).toEqual([])
  })
})
