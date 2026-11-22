import { numeroRomano } from './ponte'
import { BUCKET_MATERIAIS } from './professor'
import { supabase } from './supabase'

// Abre os slides HTML de uma aula. O banco só entrega a linha do material e o
// arquivo para quem pode ver a aula (aluno aprovado com a aula liberada, ou o
// professor); aqui só se junta o que chegou.

export interface SlidesDaAula {
  id: number
  /** "ALG · Unidade IV · Aula 1" */
  onde: string
  titulo: string
  html: string
}

interface MaterialDoBanco {
  id: number
  tipo: string
  caminho_storage: string | null
  aula: {
    numero: number
    titulo: string
    unidade: { numero: number; disciplina: { sigla: string } }
  }
}

export class SlidesIndisponiveis extends Error {
  constructor() {
    super('Estes slides não existem ou ainda não foram liberados para a sua turma.')
  }
}

export async function carregarSlides(id: number): Promise<SlidesDaAula> {
  if (!Number.isInteger(id) || id <= 0) throw new SlidesIndisponiveis()
  const { data, error } = await supabase()
    .from('materiais')
    .select(
      'id, tipo, caminho_storage, aula:aulas!inner(numero, titulo, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla)))',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  const material = data as unknown as MaterialDoBanco | null
  if (!material || material.tipo !== 'slide' || !material.caminho_storage) throw new SlidesIndisponiveis()

  const { data: arquivo, error: erroArquivo } = await supabase().storage.from(BUCKET_MATERIAIS).download(material.caminho_storage)
  if (erroArquivo || !arquivo) throw new SlidesIndisponiveis()

  const { aula } = material
  return {
    id: material.id,
    onde: `${aula.unidade.disciplina.sigla} · Unidade ${numeroRomano(aula.unidade.numero)} · Aula ${aula.numero}`,
    titulo: aula.titulo,
    html: protegerSlides(await arquivo.text()),
  }
}

// Ajuste para a moldura isolada e barreiras contra salvar o slide pelo navegador: sem menu do botão direito,
// sem arrastar, sem selecionar, sem Ctrl+S / Ctrl+P / Ctrl+U e com a
// impressão em branco. Não impede print de tela nem foto do celular.
const PROTECAO =
  '<style data-orbita-protecao>' +
  'html,body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
  'img,video,svg,canvas{-webkit-user-drag:none}' +
  'input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}' +
  '@media print{html,body{display:none!important}}' +
  '</style>' +
  '<script data-orbita-protecao>(function(){' +
  // Na moldura isolada, o endereço do slide é "about:srcdoc" e o navegador recusa
  // history.replaceState/pushState com #número do slide. Sem isto, o script do
  // slide para no erro e os botões (Iniciar, Próximo) não respondem.
  "['pushState','replaceState'].forEach(function(n){var o=history[n];" +
  'history[n]=function(){try{return o.apply(history,arguments)}catch(e){}}});' +
  'function parar(e){e.preventDefault();e.stopPropagation()}' +
  "['contextmenu','dragstart','copy','cut'].forEach(function(t){window.addEventListener(t,parar,true)});" +
  "window.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase();" +
  "if((e.ctrlKey||e.metaKey)&&(k==='s'||k==='p'||k==='u'))parar(e)},true);" +
  "window.addEventListener('beforeprint',function(){document.documentElement.style.display='none'});" +
  "window.addEventListener('afterprint',function(){document.documentElement.style.display=''});" +
  '})()</script>'

/**
 * Coloca as barreiras no começo do slide, depois do <!doctype> (antes dele, o
 * navegador cairia no modo antigo de exibição e o slide mudaria de aparência).
 */
export function protegerSlides(html: string): string {
  const ponto = /<head(?:\s[^>]*)?>/i.exec(html) ?? /<html(?:\s[^>]*)?>/i.exec(html) ?? /<!doctype[^>]*>/i.exec(html)
  if (!ponto) return PROTECAO + html
  const fim = ponto.index + ponto[0].length
  return html.slice(0, fim) + PROTECAO + html.slice(fim)
}
