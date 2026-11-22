import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, oferta, registrarErros, rest } from './apoio.ts'

// Relatório do professor: notas, tentativas, código e planilha. Dados inventados.

const aluno = emailDeTeste('relatorio')
const professor = emailDeTeste('professor-relatorio')
const NOME = `Órion Relatório ${Date.now() % 100000}`
const TITULO = 'Contagem de vogais'
let ofertaId = 0

test.describe.serial('Relatório da turma', () => {
  test.beforeAll(async () => {
    ofertaId = await oferta('3º INFO M', 'WEB')
    const alunoId = await criarConta(aluno, NOME, { ofertaId, quemEVoce: `${NOME}, 3º INFO M, manhã` })
    await rest(`matriculas?aluno_id=eq.${alunoId}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
    await criarProfessor(professor, 'Professor Fictício')
    const aula =
      (
        await rest<Array<{ id: number }>>(
          'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.3&unidades.numero=eq.2&unidades.disciplinas.sigla=eq.WEB',
        )
      )[0]?.id ?? 0
    await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ turma_disciplina_id: ofertaId, aula_id: aula }),
    })
    await rest(`exercicios?aula_id=eq.${aula}&titulo=eq.${encodeURIComponent(TITULO)}`, { method: 'DELETE' })
    const [ex] = await rest<Array<{ id: number }>>('exercicios', {
      method: 'POST',
      body: JSON.stringify({ aula_id: aula, titulo: TITULO, enunciado: 'Conte as vogais.', linguagem: 'javascript' }),
    })
    await rest('entregas', {
      method: 'POST',
      body: JSON.stringify([
        { exercicio_id: ex?.id, aluno_id: alunoId, codigo: 'console.log(1)', testes_certos: 1, testes_total: 2, nota: 5, tentativa: 1, situacao: 'confirmada' },
        { exercicio_id: ex?.id, aluno_id: alunoId, codigo: 'console.log("certo")', testes_certos: 2, testes_total: 2, nota: 10, tentativa: 2, situacao: 'confirmada' },
      ]),
    })
  })

  test('professor vê a nota, as tentativas, o código e baixa a planilha', async ({ page }) => {
    const erros = registrarErros(page)
    await entrar(page, professor)
    await page.goto('professor?aba=turmas')
    await page.getByRole('link', { name: /^Relatório.*\(3º INFO M, / }).click()
    await expect(page.getByRole('heading', { level: 1, name: '3º INFO M · WEB' })).toBeVisible()
    const nota = page.getByRole('button', { name: `${NOME}, ${TITULO}: nota 10,0, acertou tudo, 2 tentativas` })
    await expect(nota).toBeVisible()
    await nota.click()
    const detalhe = page.getByRole('region', { name: `${NOME} · ${TITULO}` })
    await expect(detalhe).toContainText('Entrega 2')
    await expect(detalhe).toContainText('2 de 2 testes · nota 10,0')
    await detalhe.getByRole('button', { name: 'Ver código da entrega 2' }).click()
    await expect(detalhe.getByLabel('Código da entrega 2')).toHaveText('console.log("certo")')

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar planilha (CSV)' }).click()])
    expect(download.suggestedFilename()).toBe('relatorio-WEB-3-INFO-M.csv')
    const csv = await readFile((await download.path()) as string, 'utf8')
    expect(csv).toContain(`${NOME};`)
    expect(csv).toContain(`U2 A3: ${TITULO}`)
    expect(erros).toEqual([])
  })
})
