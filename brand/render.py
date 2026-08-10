"""Gera todos os arquivos de icone do Jesus' Corner.

A CRUZ e' a mesma do logo original — nada foi redesenhado. Ela e' extraida do
PNG existente por luminancia: os dois fundos antigos tinham canal minimo baixo
(ardosia 36, laranja 40) e o branco tem 255, entao uma rampa em min(R,G,B)
separa os tres preservando a suavidade das bordas do pincel.

O que mudou foi o fundo (agora --brand-deep #9D4300, a cor do wordmark) e o
enquadramento, que corrige tres defeitos do arquivo antigo:

  1. A marca ocupava 46% do canvas — o icone aparecia menor que os vizinhos na
     tela inicial. Agora o tile sangra ate a borda.
  2. O PNG tinha canal alpha. O iOS nao aceita alpha em icone de app e pinta o
     transparente de preto. A saida de iOS e' opaca.
  3. Nao havia versao maskable. O Android recorta num circulo de 80% do lado e
     cortaria a arte.

Limitacao: a maior fonte disponivel tem a marca com 234px, entao os tamanhos
grandes sao interpolados. Trocar SRC por um SVG ou PNG de 1024+ resolve.

Rodar: python3 render.py   (dentro de brand/)
"""
from PIL import Image, ImageDraw
import numpy as np

SRC  = '../public/icons/icon-512.png'
BASE = 1024                      # resolucao de trabalho
RADIUS_RATIO = 0.2237            # mesmo raio da mascara do iOS

DEEP  = (157, 67, 0)             # --brand-deep — fundo principal
BK    = (18, 18, 18)             # --bk — variante escura
OLT   = (255, 240, 230)          # --olt — variante clara
CREAM = (255, 247, 240)          # cruz sobre fundos escuros/quentes

# A cruz ocupa este tanto do lado do tile. 0.72 mantem respiro nos cantos sem
# deixar o simbolo pequeno demais a 32px.
CROSS_SCALE = 0.72


def _cross_alpha():
    """Mascara da cruz de pincel, em BASE x BASE, ja recortada no bbox dela."""
    src = Image.open(SRC).convert('RGBA')
    m = src.crop(src.getchannel('A').getbbox()).resize((BASE, BASE), Image.LANCZOS)
    a = np.array(m).astype(float)
    cross = np.clip((a[..., :3].min(axis=2) - 110) / 95.0, 0, 1) * (a[..., 3] / 255.0)
    im = Image.fromarray((cross * 255).astype('uint8'), 'L')
    return im.crop(im.getbbox())


CROSS = _cross_alpha()


def build(size, bg, cross_color, rounded=True, scale=CROSS_SCALE, opaque=False):
    S = size * 2                                   # supersampling
    canvas = Image.new('RGB', (S, S), bg)
    n = max(1, int(round(S * scale)))
    c = CROSS.resize((n, n), Image.LANCZOS)
    layer = Image.new('L', (S, S), 0)
    layer.paste(c, ((S - n) // 2, (S - n) // 2))
    canvas.paste(Image.new('RGB', (S, S), cross_color), (0, 0), layer)

    img = canvas.convert('RGBA')
    if rounded and not opaque:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, S - 1, S - 1], radius=int(RADIUS_RATIO * S), fill=255)
        img.putalpha(mask)
    out = img.resize((size, size), Image.LANCZOS)
    return out.convert('RGB') if opaque else out


if __name__ == '__main__':
    made = []

    def save(img, name):
        img.save(name); made.append(name)

    # ---- principal: fundo laranja profundo --------------------------------
    for n, name in ((512, 'icon-512.png'), (192, 'icon-192.png'),
                    (48, 'favicon-48.png'), (32, 'favicon-32.png')):
        save(build(n, DEEP, CREAM), name)

    # iOS: quadrado, opaco, sem cantos (o sistema aplica a mascara dele)
    save(build(1024, DEEP, CREAM, rounded=False, opaque=True), 'icon-ios-1024.png')

    # Maskable: o Android recorta num circulo de 80% do lado. O fundo sangra e
    # so a cruz precisa caber — 0.52 a mantem inteira dentro do circulo.
    save(build(512, DEEP, CREAM, rounded=False, scale=0.52, opaque=True),
         'icon-maskable-512.png')

    # ---- variantes --------------------------------------------------------
    save(build(512, BK, (255, 255, 255)), 'icon-dark-512.png')
    save(build(512, OLT, DEEP), 'icon-light-512.png')

    for f in made:
        im = Image.open(f)
        print(f'{f:24} {im.size[0]}x{im.size[1]}  {im.mode}')
