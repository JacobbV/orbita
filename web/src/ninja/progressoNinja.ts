import { diasSeguidos, hojeEmFortaleza, type EstudoRecente } from '../lib/progresso'

// Progresso do Modo Ninja: última aula aberta, dias de estudo e apelido do
// ninja. Fica só no navegador do professor, nunca no banco, para não misturar
// com o estudo dos alunos (nem render XP). Cada conta tem a sua chave.

interface DadosDoNinja {
  ultimaAulaId: number | null
  dias: string[]
  apelido: string | null
}

const VAZIO: DadosDoNinja = { ultimaAulaId: null, dias: [], apelido: null }

const chave = (perfilId: string) => `orbita:ninja:${perfilId}`

function ler(perfilId: string): DadosDoNinja {
  try {
    const bruto = localStorage.getItem(chave(perfilId))
    if (!bruto) return { ...VAZIO }
    const d = JSON.parse(bruto) as Partial<DadosDoNinja>
    return {
      ultimaAulaId: typeof d.ultimaAulaId === 'number' ? d.ultimaAulaId : null,
      dias: Array.isArray(d.dias) ? d.dias.filter((x): x is string => typeof x === 'string') : [],
      apelido: typeof d.apelido === 'string' && d.apelido.trim() ? d.apelido : null,
    }
  } catch {
    return { ...VAZIO }
  }
}

function gravar(perfilId: string, d: DadosDoNinja) {
  try {
    localStorage.setItem(chave(perfilId), JSON.stringify(d))
  } catch {
    // Sem armazenamento (aba anônima): o ninja segue sem guardar o progresso.
  }
}

/** O ninja abriu uma aula: vira a aula de "Continuar aula" e conta o dia de hoje. */
export function registrarAulaDoNinja(perfilId: string, aulaId: number, agora: Date = new Date()) {
  const d = ler(perfilId)
  const hoje = hojeEmFortaleza(agora)
  // Guarda só o último ano de dias, o bastante para a sequência.
  const dias = [hoje, ...d.dias.filter((x) => x !== hoje)].slice(0, 400)
  gravar(perfilId, { ...d, ultimaAulaId: aulaId, dias })
}

/** Mesmo formato do estudo recente do aluno, para a ponte e o mapa do ninja. */
export function estudoDoNinja(perfilId: string, agora: Date = new Date()): EstudoRecente {
  const d = ler(perfilId)
  return { ...diasSeguidos(d.dias, hojeEmFortaleza(agora)), ultimaAulaId: d.ultimaAulaId }
}

export function apelidoDoNinja(perfilId: string): string | null {
  return ler(perfilId).apelido
}

export function guardarApelidoDoNinja(perfilId: string, apelido: string) {
  gravar(perfilId, { ...ler(perfilId), apelido })
}
