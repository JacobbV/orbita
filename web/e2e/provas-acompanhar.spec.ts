import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// O professor acompanha a prova: quem está fazendo, saídas da aba, respostas,
// segunda chamada, reconferência (com teste secreto) e publicação das notas.
// Dados inventados; as tentativas são gravadas direto no banco.

const professor = emailDeTeste('professor-acompanhar')
const RODADA = `${Date.now() % 100_000}`
const TITULO = `Prova acompanhada ${RODADA}`
const NOMES = { entregou: `Estrela Exemplo ${RODADA}`, fazendo: `Pulsar Exemplo ${RODADA}`, parado: `Aurora Exemplo ${RODADA}` }
let provaId = 0
const ids: Record<string, string> = {}
let tentativaFazendo = 0

test.describe.serial('Acompanhar a prova', () => {
  test.setTimeout(150_000)

  test.beforeAll(async () => {
    await criarProfessor(professor, 'Professor Fictício Acompanhar')
    const o = await oferta('1º INFO V', 'ALG')
    for (const [chave, nome] of Object.entries(NOMES)) {
      const id = await criarConta(emailDeTeste(`acomp-${chave}`), nome, { ofertaId: o, quemEVoce: `${nome}, 1º INFO V, tarde` })
      await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
      ids[chave] = id
    }
    const agora = Date.now()
    const [prova] = await rest<Array<{ id: number }>>('provas', {
      method: 'POST',
      body: JSON.stringify({
        turma_disciplina_id: o,
        titulo: TITULO,
        abre_em: new Date(agora - 3_600_000).toISOString(),
        fecha_em: new Date(agora + 3_600_000).toISOString(),
        duracao_min: 30,
        saidas_para_encerrar: null,
      }),
    })
    provaId = prova!.id
    const [ex] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({ aula_id: null, titulo: 'Dobro acompanhado', enunciado: 'Mostre o dobro.', linguagem: 'python', codigo_inicial: '' }),
    })
    await rest('testes', {
      method: 'POST',
      body: JSON.stringify([
        { exercicio_id: ex!.id, tipo: 'visivel', entrada: '4', saida_esperada: '8', ordem: 0 },
        { exercicio_id: ex!.id, tipo: 'oculto', entrada: '-3', saida_esperada: '-6', ordem: 1 },
        { exercicio_id: ex!.id, tipo: 'secreto', entrada: '100', saida_esperada: '200', ordem: 2 },
      ]),
    })
    const [questao] = await rest<Array<{ id: number }>>('prova_questoes', {
      method: 'POST',
      body: JSON.stringify({ prova_id: provaId, exercicio_id: ex!.id, peso: 1, ordem: 0 }),
    })
    // Quem entregou: acertou os dois testes à vista, e o secreto também passa.
    const [entregue] = await rest<Array<{ id: number }>>('prova_tentativas', {
      method: 'POST',
      body: JSON.stringify({
        prova_id: provaId,
        aluno_id: ids.entregou,
        comecou_em: new Date(agora - 1_200_000).toISOString(),
        termina_em: new Date(agora + 600_000).toISOString(),
        entregue_em: new Date(agora - 300_000).toISOString(),
        encerrada_por: 'aluno',
        saidas: 1,
      }),
    })
    await rest('prova_saidas', {
      method: 'POST',
      body: JSON.stringify({ tentativa_id: entregue!.id, saiu_em: new Date(agora - 900_000).toISOString(), voltou_em: new Date(agora - 840_000).toISOString() }),
    })
    await rest('prova_respostas', {
      method: 'POST',
      body: JSON.stringify({
        tentativa_id: entregue!.id,
        questao_id: questao!.id,
        codigo: 'n = int(input())\nprint(n * 2)',
        testes_certos: 2,
        testes_total: 2,
        nota: 10,
      }),
    })
    const [fazendo] = await rest<Array<{ id: number }>>('prova_tentativas', {
      method: 'POST',
      body: JSON.stringify({ prova_id: provaId, aluno_id: ids.fazendo, termina_em: new Date(agora + 1_200_000).toISOString() }),
    })
    tentativaFazendo = fazendo!.id
  })

  test('mostra quem está fazendo, as saídas e o código', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto(`professor/prova/${provaId}/acompanhar`)
    await expect(page.getByRole('heading', { name: TITULO })).toBeVisible()
    await expect(page.locator('.provas-resumo')).toContainText('1 fazendo agora')
    await expect(page.locator('.provas-resumo')).toContainText('1 entregaram')
    await expect(page.locator('.provas-resumo')).toContainText(/\d+ não começaram/)
    await expect(page.locator('.provas-aluno', { hasText: NOMES.fazendo })).toContainText('Fazendo agora')
    await expect(page.locator('.provas-aluno', { hasText: NOMES.parado })).toContainText('Não começou')
    const linha = page.locator('.provas-aluno', { hasText: NOMES.entregou })
    await expect(linha).toContainText('1 saída da aba')

    await expect(page.getByRole('button', { name: 'Publicar notas' })).toBeDisabled()
    await expect(page.getByText('Ainda tem 1 aluno fazendo a prova.')).toBeVisible()

    await linha.getByRole('button', { name: `Ver respostas de ${NOMES.entregou}` }).click()
    await expect(linha).toContainText('1 min 0 s fora')
    await expect(linha).toContainText('A confirmar')
    await expect(linha.locator('.provas-codigo')).toContainText('print(n * 2)')
    expect(erros).toEqual([])
  })

  test('libera segunda chamada para quem não fez', async ({ page }) => {
    await entrar(page, professor)
    await page.goto(`professor/prova/${provaId}/acompanhar`)
    const linha = page.locator('.provas-aluno', { hasText: NOMES.parado })
    await linha.getByRole('button', { name: `Segunda chamada de ${NOMES.parado}` }).click()
    await linha.getByRole('button', { name: 'Liberar segunda chamada' }).click()
    await expect(linha.getByText('2ª chamada')).toBeVisible()
    const guardadas = await rest<unknown[]>(`prova_segunda_chamada?prova_id=eq.${provaId}&aluno_id=eq.${ids.parado}`)
    expect(guardadas).toHaveLength(1)
  })

  test('reconfere com o teste secreto e publica as notas', async ({ page }) => {
    // O aluno que estava fazendo entrega (sem respostas: vale zero).
    await rest(`prova_tentativas?id=eq.${tentativaFazendo}`, {
      method: 'PATCH',
      body: JSON.stringify({ entregue_em: new Date().toISOString(), encerrada_por: 'aluno' }),
    })
    await entrar(page, professor)
    await page.goto(`professor/prova/${provaId}/acompanhar`)
    await expect(page.getByRole('button', { name: 'Publicar notas' })).toBeDisabled()
    await expect(page.getByText(/Reconfira antes: 1 resposta ainda está a confirmar/)).toBeVisible()

    await page.getByRole('button', { name: 'Reconferir respostas (1)' }).click()
    await expect(page.getByText('Pronto: 1 confirmada e 0 sem conferir.')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(/Confere: 2 de 2 testes e o secreto/)).toBeVisible()
    await page.getByRole('button', { name: 'Fechar' }).click()

    await expect(page.locator('.provas-aluno', { hasText: NOMES.entregou })).toContainText('nota 10')
    await page.getByRole('button', { name: 'Publicar notas' }).click()
    await expect(page.getByText(/alunos? ainda não (fez|fizeram) a prova/)).toBeVisible()
    await page.getByRole('button', { name: 'Sim, publicar' }).click()
    await expect(page.getByText('Notas publicadas. Cada aluno vê só a própria nota.')).toBeVisible()
    const [p] = await rest<Array<{ notas_publicadas_em: string | null }>>(`provas?select=notas_publicadas_em&id=eq.${provaId}`)
    expect(p?.notas_publicadas_em).not.toBeNull()

    const [arquivo] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar planilha (CSV)' }).click()])
    expect(arquivo.suggestedFilename()).toMatch(/^prova-ALG-1-INFO-V-.*\.csv$/)
    const csv = readFileSync(await arquivo.path(), 'utf8')
    expect(csv).toContain(`${NOMES.entregou};;Entregue;O aluno entregou;1;Não;10,0;0;10,0`)
    expect(csv).toContain(`${NOMES.parado};;Não começou;;;Sim`)
  })

  test('o aluno vê a própria nota depois da publicação', async ({ page }) => {
    await entrar(page, emailDeTeste('acomp-entregou'))
    await page.goto('ponte')
    const item = page.locator('.provas-ponte-item', { hasText: TITULO })
    await expect(item).toContainText('Entregue')
    await expect(item).toContainText('nota 10')
  })
})
