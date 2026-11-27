import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { criarConta, criarProfessor, emailDeTeste, entrar, enviarApostilaDeTeste, enviarSlidesDeTeste, oferta, registrarErros, rest } from './apoio.ts'

// Todas as telas em larguras de celular pequeno até monitor ultrawide:
// sem rolagem horizontal, céu cobrindo a tela, alvos de toque com 44px ou
// mais e nenhum erro de JavaScript.

const LARGURAS: Array<[number, number]> = [
  [320, 568],
  [360, 800],
  [393, 852],
  [768, 1024],
  [1280, 800],
  [1920, 1080],
  [2560, 1440],
]

type Papel = 'visitante' | 'aluno' | 'professor'

/** Material de slides da aula I.1 de Algoritmos, criado no beforeAll. */
let slidesId = 0
/** Oferta de Algoritmos do 1º INFO M, para o XP da turma. */
let ofertaAlgM = 0
/** Aula I.1 de Algoritmos, para a tela de exercícios do painel. */
let aulaI1 = 0
/** Exercício de Soma na aula I.1, com uma entrega já corrigida. */
let exercicioLarguras = 0

interface Tela {
  nome: string
  caminho: string
  papel: Papel
  /** Deixa a tela no pior caso (erros à mostra, tudo aberto) antes de medir. */
  preparar?: (page: Page) => Promise<void>
}

const TELAS: Tela[] = [
  { nome: 'Início', caminho: '', papel: 'visitante' },
  { nome: 'Créditos', caminho: 'creditos', papel: 'visitante' },
  {
    nome: 'Cadastro com erros',
    caminho: 'cadastro',
    papel: 'visitante',
    preparar: async (page) => {
      await page.getByRole('button', { name: 'Enviar pedido de acesso' }).click()
      await expect(page.getByText(/A senha precisa ter/)).toBeVisible()
    },
  },
  { nome: 'Entrar', caminho: 'entrar', papel: 'visitante' },
  { nome: 'Esqueci minha senha', caminho: 'recuperar-senha', papel: 'visitante' },
  { nome: 'Página inexistente', caminho: 'nao-existe', papel: 'visitante' },
  {
    nome: 'Aguardando',
    caminho: 'aguardando',
    papel: 'aluno',
    preparar: async (page) => {
      await page.getByRole('button', { name: /Pedir de novo/ }).click()
    },
  },
  {
    nome: 'Ponte com tudo aberto',
    caminho: 'ponte',
    papel: 'aluno',
    preparar: async (page) => {
      await expect(page.getByText('Última aula liberada')).toBeVisible()
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
    },
  },
  {
    nome: 'Medalhas',
    caminho: 'medalhas',
    papel: 'aluno',
    preparar: async (page) => {
      await expect(page.getByRole('heading', { name: 'Suas medalhas' })).toBeVisible()
    },
  },
  {
    nome: 'Slides da aula',
    get caminho() {
      return `slides/${slidesId}`
    },
    papel: 'aluno',
    preparar: async (page) => {
      await expect(page.frameLocator('iframe.slides-moldura').getByRole('heading', { name: 'Slide de teste' })).toBeVisible()
    },
  },
  {
    nome: 'Página da aula',
    get caminho() {
      return `aula/${aulaI1}`
    },
    papel: 'aluno',
    preparar: async (page) => {
      await expect(page.getByRole('heading', { name: 'Nesta aula' })).toBeVisible()
      await expect(page.frameLocator('iframe[title^="Apostila"]').getByRole('heading', { name: 'Apostila de teste' })).toBeVisible()
    },
  },
  {
    nome: 'Painel: pedidos',
    caminho: 'professor?aba=pedidos',
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: /^Recusados/ }).click()
    },
  },
  {
    nome: 'Painel: aulas com edição aberta',
    caminho: 'professor?aba=aulas',
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: 'Editar aula I.1', exact: true }).click()
      await page.getByRole('button', { name: 'Remover aula' }).click()
      await page.getByRole('button', { name: 'Remover unidade II', exact: true }).click()
      await page.getByRole('button', { name: 'Remover slides' }).click()
      await page.getByText('Enviar vários slides de uma vez').click()
      await page.getByLabel('Arquivos de slides').setInputFiles([
        { name: 'ALG_U1_A1_com_um_nome_de_arquivo_bem_comprido_para_quebrar.html', mimeType: 'text/html', buffer: Buffer.from('<p>a</p>') },
        { name: 'capa.html', mimeType: 'text/html', buffer: Buffer.from('<p>b</p>') },
      ])
    },
  },
  {
    nome: 'Painel: turmas',
    caminho: 'professor?aba=turmas',
    papel: 'professor',
    preparar: async (page) => {
      await expect(page.getByRole('heading', { name: '1º INFO M' })).toBeVisible()
    },
  },
  {
    nome: 'Painel: XP da turma',
    get caminho() {
      return `professor/xp/${ofertaAlgM}`
    },
    papel: 'professor',
    preparar: async (page) => {
      await expect(page.getByRole('heading', { name: 'Dar XP por participação' })).toBeVisible()
    },
  },
  {
    nome: 'Painel: relatório da turma',
    get caminho() {
      return `professor/relatorio/${ofertaAlgM}`
    },
    papel: 'professor',
    preparar: async (page) => {
      await expect(page.getByText('Notas da turma', { exact: true })).toBeVisible()
      const nota = page.locator('.relatorio-nota').first()
      if (await nota.count()) {
        await nota.click()
        await page.getByRole('button', { name: /^Ver código da entrega/ }).first().click()
      }
    },
  },
  {
    nome: 'Modo Ninja: ponte',
    caminho: 'professor',
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: 'Modo Ninja' }).click()
      await expect(page.getByRole('heading', { name: 'Ninja na nave' })).toBeVisible()
      await expect(page.locator('.ponte-disciplina').first()).toBeVisible()
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
    },
  },
  {
    nome: 'Modo Ninja: Hangar',
    caminho: 'professor',
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: 'Modo Ninja' }).click()
      await page.getByRole('link', { name: /Hangar/ }).click()
      await expect(page.getByRole('heading', { name: 'Monte o seu ninja' })).toBeVisible()
    },
  },
  {
    nome: 'Hangar do aluno com apelido',
    caminho: 'hangar',
    papel: 'aluno',
    preparar: async (page) => {
      await page.getByRole('button', { name: 'Sortear apelido' }).click()
      await expect(page.getByRole('button', { name: 'Usar este' })).toBeVisible()
    },
  },
  {
    nome: 'Painel: entregas com código aberto',
    caminho: 'professor?aba=entregas',
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: /1º INFO M · .* · ALG/ }).click()
      await page.getByRole('button', { name: /^Abrir a entrega de / }).first().click()
      await expect(page.getByRole('button', { name: 'Devolver para refazer' })).toBeVisible()
      await page.getByRole('button', { name: 'Devolver para refazer' }).click()
    },
  },
  {
    nome: 'Painel: tripulação com perfil aberto',
    get caminho() {
      return `professor/tripulacao/${ofertaAlgM}`
    },
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: /^Perfil de / }).first().click()
      await expect(page.getByText('Últimas entregas')).toBeVisible()
    },
  },
  {
    nome: 'Exercício com terminal e entrega corrigida',
    get caminho() {
      return `exercicio/${exercicioLarguras}`
    },
    papel: 'aluno',
    preparar: async (page) => {
      await expect(page.getByText('Nota do professor: 6,5')).toBeVisible()
    },
  },
  {
    nome: 'Painel: exercícios com formulário aberto',
    get caminho() {
      return `professor/exercicios/${aulaI1}`
    },
    papel: 'professor',
    preparar: async (page) => {
      await page.getByRole('button', { name: '+ Novo exercício' }).click()
      await page.getByRole('button', { name: 'Salvar exercício' }).click()
      await page.getByText('Preencher as saídas com a sua solução').click()
    },
  },
  {
    nome: 'Painel: provas',
    caminho: 'professor?aba=provas',
    papel: 'professor',
    preparar: async (page) => {
      await expect(page.getByRole('heading', { name: 'Provas' })).toBeVisible()
    },
  },
  {
    nome: 'Painel: montar prova',
    caminho: 'professor/prova/nova',
    papel: 'professor',
    preparar: async (page) => {
      await page.getByLabel('Turma e disciplina').selectOption({ index: 1 })
      await page.getByRole('button', { name: 'Salvar prova' }).click()
      await page.getByRole('button', { name: '+ Criar questão só desta prova' }).click()
      await expect(page.getByRole('button', { name: 'Salvar questão' })).toBeVisible()
    },
  },
]

const sessoes: Partial<Record<Papel, Awaited<ReturnType<BrowserContext['storageState']>>>> = {}

async function guardarSessao(browser: Browser, papel: Papel, email: string) {
  const ctx = await browser.newContext()
  await entrar(await ctx.newPage(), email)
  sessoes[papel] = await ctx.storageState()
  await ctx.close()
}

test.beforeAll(async ({ browser }) => {
  // Aluno aprovado em Algoritmos (1º INFO M) com a aula I.1 liberada e recusado em Fundamentos.
  const algM = await oferta('1º INFO M', 'ALG')
  ofertaAlgM = algM
  const fundM = await oferta('1º INFO M', 'FUND')
  const aluno = emailDeTeste('larguras')
  const id = await criarConta(aluno, 'Plutão Exemplo de Oliveira Fictício', {
    ofertaId: algM,
    quemEVoce: 'Plutão Exemplo de Oliveira Fictício, 1º INFO M, manhã',
  })
  await rest(`matriculas?aluno_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) })
  await rest('matriculas', {
    method: 'POST',
    body: JSON.stringify({
      aluno_id: id,
      turma_disciplina_id: fundM,
      disciplina_id: (await rest<Array<{ disciplina_id: number }>>(`turma_disciplinas?id=eq.${fundM}&select=disciplina_id`))[0]?.disciplina_id,
      status: 'recusado',
      motivo_recusa: 'Motivo de teste um pouco mais longo, para conferir a quebra de linha no cartão.',
      quem_e_voce: 'Plutão Exemplo de Oliveira Fictício, 1º INFO M, manhã',
      tentativa: 1,
    }),
  })
  const aula = (
    await rest<Array<{ id: number }>>(
      'aulas?select=id,unidades!inner(numero,disciplinas!inner(sigla))&numero=eq.1&unidades.numero=eq.1&unidades.disciplinas.sigla=eq.ALG',
    )
  )[0]?.id
  await rest('liberacoes?on_conflict=turma_disciplina_id,aula_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ turma_disciplina_id: algM, aula_id: aula }),
  })
  aulaI1 = aula ?? 0

  // Um exercício com uma entrega do aluno, para as telas de exercício, entregas e tripulação.
  const TITULO_EXERCICIO = 'Soma de dois números para as larguras'
  await rest(`exercicios?aula_id=eq.${aulaI1}&titulo=eq.${encodeURIComponent(TITULO_EXERCICIO)}`, { method: 'DELETE' })
  const [exercicio] = await rest<Array<{ id: number }>>('exercicios', {
    method: 'POST',
    body: JSON.stringify({
      aula_id: aulaI1,
      titulo: TITULO_EXERCICIO,
      enunciado: 'Leia dois números inteiros, um por linha, e mostre a soma deles na tela.',
      codigo_inicial: 'a = int(input())\n',
    }),
  })
  exercicioLarguras = exercicio?.id ?? 0
  await rest('testes', {
    method: 'POST',
    body: JSON.stringify([
      { exercicio_id: exercicioLarguras, tipo: 'visivel', entrada: '1\n2', saida_esperada: '3', ordem: 1 },
      { exercicio_id: exercicioLarguras, tipo: 'oculto', entrada: '5\n5', saida_esperada: '10', ordem: 2 },
    ]),
  })
  await rest('entregas', {
    method: 'POST',
    body: JSON.stringify({
      exercicio_id: exercicioLarguras,
      aluno_id: id,
      codigo: 'a = int(input())\nb = int(input())\nprint(a + b)  # uma linha de código bem comprida para conferir a quebra no painel do professor',
      testes_certos: 1,
      testes_total: 2,
      nota: 5,
      tentativa: 1,
      comentario: 'Faltou testar com números negativos.',
      nota_professor: 6.5,
      corrigida_em: new Date().toISOString(),
    }),
  })

  slidesId = await enviarSlidesDeTeste(
    aula ?? 0,
    '<!doctype html><html lang="pt-BR"><body style="margin:0;font-family:sans-serif">' +
      '<h1 style="padding:24px">Slide de teste</h1><div style="width:1600px;height:40px;background:#22d3ee"></div></body></html>',
  )

  await enviarApostilaDeTeste(
    aula ?? 0,
    '<!doctype html><html lang="pt-BR"><body style="margin:0;font-family:sans-serif">' +
      '<h1 style="padding:24px">Apostila de teste</h1><div style="width:1600px;height:40px;background:#22d3ee"></div></body></html>',
  )
  await rest(`aulas?id=eq.${aula ?? 0}`, {
    method: 'PATCH',
    body: JSON.stringify({ topicos: ['O que é um algoritmo', 'Entrada, processamento e saída'] }),
  })

  const professor = emailDeTeste('professor-larguras')
  await criarProfessor(professor, 'Professor Fictício')
  await guardarSessao(browser, 'aluno', aluno)
  await guardarSessao(browser, 'professor', professor)
})

for (const [largura, altura] of LARGURAS) {
  test.describe(`${largura}×${altura}`, () => {
    for (const tela of TELAS) {
      test(tela.nome, async ({ browser }) => {
        const sessao = sessoes[tela.papel]
        const ctx = await browser.newContext({
          viewport: { width: largura, height: altura },
          ...(sessao ? { storageState: sessao } : {}),
        })
        const page = await ctx.newPage()
        const erros = registrarErros(page)
        await page.goto(tela.caminho, { waitUntil: 'networkidle' })
        await tela.preparar?.(page)

        const medida = await page.evaluate(() => {
          const raiz = document.documentElement
          const ceu = document.querySelector('.ceu-estrelas')?.getBoundingClientRect()
          const alvos = [...document.querySelectorAll('a, button, input:not([type=checkbox]):not([type=radio]), select, textarea, summary, label.painel-caixa, label.exercicios-opcao')]
          const pequenos = alvos
            .filter((el) => {
              const r = el.getBoundingClientRect()
              return r.width > 0 && r.height < 44 && !el.classList.contains('pular-link')
            })
            .map((el) => `${(el.textContent || el.tagName).trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().height)}px)`)
          return {
            rolagemHorizontal: raiz.scrollWidth > raiz.clientWidth,
            ceu: ceu ? [Math.round(ceu.width), Math.round(ceu.height)] : null,
            tela: [innerWidth, innerHeight],
            pequenos,
          }
        })

        expect(medida.rolagemHorizontal, 'sem rolagem horizontal').toBe(false)
        expect(medida.ceu, 'o céu cobre a tela').toEqual(medida.tela)
        expect(medida.pequenos, 'alvos de toque com 44px ou mais').toEqual([])
        expect(erros, 'sem erros de JavaScript').toEqual([])
        await ctx.close()
      })
    }
  })
}
