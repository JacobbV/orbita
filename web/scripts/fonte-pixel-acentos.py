"""Gera a fonte "Orbita Pixel Acentos", derivada da Press Start 2P (SIL OFL 1.1).

A Press Start 2P desenha as maiúsculas acentuadas (Á, É, Ó...) encolhidas, para
o acento caber em 8 pixels, e com text-transform: uppercase elas parecem
minúsculas. Esta fonte traz só essas letras, com a maiúscula inteira e o acento
por cima, desenhados pixel a pixel a partir da própria Press Start 2P. O site a
usa só para esses caracteres (unicode-range).

Uso (precisa de: pip install fonttools brotli):
  python3 scripts/fonte-pixel-acentos.py
"""

from pathlib import Path

from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / 'node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2'
DESTINO = RAIZ / 'src/styles/fontes/orbita-pixel-acentos.woff2'

PIXEL = 125  # a fonte usa uma grade de 8×8 em 1000 unidades
TOPO_MINUSCULA = 750  # altura do "a" minúsculo: acima disso fica o acento
TOPO_MAIUSCULA = 1000

# maiúscula acentuada → (maiúscula sem acento, minúscula acentuada de onde vem o acento, letra base minúscula)
LETRAS = {
    'À': ('A', 'à', 'a'), 'Á': ('A', 'á', 'a'), 'Â': ('A', 'â', 'a'), 'Ã': ('A', 'ã', 'a'), 'Ä': ('A', 'ä', 'a'),
    'È': ('E', 'è', 'e'), 'É': ('E', 'é', 'e'), 'Ê': ('E', 'ê', 'e'), 'Ë': ('E', 'ë', 'e'),
    'Ì': ('I', 'ì', 'ı'), 'Í': ('I', 'í', 'ı'), 'Î': ('I', 'î', 'ı'), 'Ï': ('I', 'ï', 'ı'),
    'Ò': ('O', 'ò', 'o'), 'Ó': ('O', 'ó', 'o'), 'Ô': ('O', 'ô', 'o'), 'Õ': ('O', 'õ', 'o'), 'Ö': ('O', 'ö', 'o'),
    'Ù': ('U', 'ù', 'u'), 'Ú': ('U', 'ú', 'u'), 'Û': ('U', 'û', 'u'), 'Ü': ('U', 'ü', 'u'),
    'Ñ': ('N', 'ñ', 'n'),
}


def pixels(fonte: TTFont, glifo: str) -> set[tuple[int, int]]:
    """Pixels acesos do glifo, como (coluna, linha) na grade de 125 unidades."""
    conjunto = fonte.getGlyphSet()
    acesos = set()
    for linha in range(-2, 12):
        for coluna in range(0, 8):
            caneta = PointInsidePen(conjunto, ((coluna + 0.5) * PIXEL, (linha + 0.5) * PIXEL))
            conjunto[glifo].draw(caneta)
            if caneta.getResult():
                acesos.add((coluna, linha))
    return acesos


def main() -> None:
    fonte = TTFont(ORIGEM)
    mapa = fonte.getBestCmap()
    glifos = fonte['glyf']
    nome = lambda letra: mapa[ord(letra)]  # noqa: E731

    for maiuscula, (base, acentuada, minuscula) in LETRAS.items():
        if ord(maiuscula) not in mapa or ord(acentuada) not in mapa:
            continue
        corpo = pixels(fonte, nome(base))
        sem_acento = pixels(fonte, nome(minuscula)) if ord(minuscula) in mapa else set()
        acento = {
            (c, l) for (c, l) in pixels(fonte, nome(acentuada)) - sem_acento if l * PIXEL >= TOPO_MINUSCULA
        }
        if not acento:
            continue
        menor = min(l for _, l in acento)
        # O acento vai logo acima da maiúscula inteira.
        deslocamento = TOPO_MAIUSCULA // PIXEL - menor
        todos = corpo | {(c, l + deslocamento) for (c, l) in acento}
        caneta = TTGlyphPen(None)
        for c, l in sorted(todos):
            x, y = c * PIXEL, l * PIXEL
            caneta.moveTo((x, y))
            caneta.lineTo((x, y + PIXEL))
            caneta.lineTo((x + PIXEL, y + PIXEL))
            caneta.lineTo((x + PIXEL, y))
            caneta.closePath()
        glifos[nome(maiuscula)] = caneta.glyph()

    opcoes = Options()
    opcoes.flavor = 'woff2'
    opcoes.name_IDs = ['*']
    opcoes.layout_features = []
    opcoes.hinting = False
    sub = Subsetter(opcoes)
    sub.populate(unicodes=[ord(m) for m in LETRAS if ord(m) in mapa])
    sub.subset(fonte)

    for registro in fonte['name'].names:
        if registro.nameID in (1, 4, 16):
            registro.string = 'Orbita Pixel Acentos'
        elif registro.nameID == 6:
            registro.string = 'OrbitaPixelAcentos-Regular'
    fonte['head'].yMax = max(fonte['head'].yMax, TOPO_MAIUSCULA + 3 * PIXEL)
    fonte.flavor = 'woff2'
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    fonte.save(DESTINO)
    print(f'Gerada: {DESTINO.relative_to(RAIZ)} ({DESTINO.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
