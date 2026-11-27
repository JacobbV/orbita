import { numeroRomano } from './ponte'
import { BUCKET_MATERIAIS } from './professor'
import { supabase } from './supabase'

// Abre os slides HTML de uma aula. O banco só entrega a linha do material e o
// arquivo para quem pode ver a aula (aluno aprovado com a aula liberada, ou o
// professor); aqui só se junta o que chegou.

export interface SlidesDaAula {
  id: number
  aulaId: number
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
    id: number
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

export async function carregarSlides(id: number, ehProfessor = false): Promise<SlidesDaAula> {
  if (!Number.isInteger(id) || id <= 0) throw new SlidesIndisponiveis()
  const { data, error } = await supabase()
    .from('materiais')
    .select(
      'id, tipo, caminho_storage, aula:aulas!inner(id, numero, titulo, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla)))',
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
    aulaId: aula.id,
    onde: `${aula.unidade.disciplina.sigla} · Unidade ${numeroRomano(aula.unidade.numero)} · Aula ${aula.numero}`,
    titulo: aula.titulo,
    html: protegerSlides(await arquivo.text(), { professor: ehProfessor }),
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
  // slide para no erro e os botões (Iniciar, Próximo) não respondem. Aproveita
  // para avisar a página em volta de qual slide está aberto (marcador de página).
  "['pushState','replaceState'].forEach(function(n){var o=history[n];" +
  'history[n]=function(a,b,u){' +
  "try{var m=/^#(\\d{1,3})$/.exec(String(u==null?'':u));if(m)parent.postMessage({orbita:'slide',n:+m[1]},'*')}catch(e){}" +
  'try{return o.apply(history,arguments)}catch(e){}}});' +
  'function parar(e){e.preventDefault();e.stopPropagation()}' +
  "['contextmenu','dragstart','copy','cut'].forEach(function(t){window.addEventListener(t,parar,true)});" +
  "window.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase();" +
  "if((e.ctrlKey||e.metaKey)&&(k==='s'||k==='p'||k==='u'))parar(e)},true);" +
  "window.addEventListener('beforeprint',function(){document.documentElement.style.display='none'});" +
  "window.addEventListener('afterprint',function(){document.documentElement.style.display=''});" +
  // A página em volta pede para ir a um slide ou mudar de slide (marcador, lápis ligado).
  // Os slides do professor ouvem as setas do teclado e Home; é com elas que a ordem chega.
  'function tecla(k){window.dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true,cancelable:true}))}' +
  "window.addEventListener('message',function(e){var d=e.data;if(e.source!==parent||!d||typeof d!=='object')return;" +
  "if(d.orbita==='ir'&&d.n>=1&&d.n<=999){tecla('Home');for(var i=1;i<d.n;i++)tecla('ArrowRight')}" +
  "else if(d.orbita==='mover'&&(d.d===1||d.d===-1))tecla(d.d===1?'ArrowRight':'ArrowLeft')});" +
  '})()</script>'

// Os slides trazem um botão "Editar" (tecla E) que só serve a quem prepara a
// aula. Para o aluno ele some, e a tecla E deixa de abrir a edição.
const SEM_EDITAR =
  '<style data-orbita-sem-editar>.edit-hotzone,.edit-toggle{display:none!important}</style>' +
  '<script data-orbita-sem-editar>(function(){' +
  "window.addEventListener('keydown',function(e){" +
  "if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key==='e'||e.key==='E'))e.stopImmediatePropagation()},true)" +
  '})()</script>'

/**
 * Coloca as barreiras no começo do slide, depois do <!doctype> (antes dele, o
 * navegador cairia no modo antigo de exibição e o slide mudaria de aparência).
 * Só o professor continua com o botão "Editar" do slide.
 */
export function protegerSlides(html: string, opcoes: { professor?: boolean } = {}): string {
  const extra = PROTECAO + (opcoes.professor ? '' : SEM_EDITAR)
  const ponto = /<head(?:\s[^>]*)?>/i.exec(html) ?? /<html(?:\s[^>]*)?>/i.exec(html) ?? /<!doctype[^>]*>/i.exec(html)
  if (!ponto) return extra + html
  const fim = ponto.index + ponto[0].length
  return html.slice(0, fim) + extra + html.slice(fim)
}
