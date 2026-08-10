"""Instala os icones gerados por render.py em todos os ambientes do app.

Rodar depois de render.py, de dentro de brand/:
    python3 install.py

Cobre: public/icons (web/PWA/emails/favicon), iOS (AppIcon + splash) e
Android TWA (launcher, adaptive, notificacao, splash).
"""
import os, shutil
from PIL import Image
import numpy as np
import render as R

ROOT = '..'
DEEP  = R.DEEP
CREAM = R.CREAM
done = []

def out(path, img, **kw):
    p = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, **kw)
    done.append(path)

def copy(src, path):
    p = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    shutil.copyfile(src, p)
    done.append(path)


# ── 1. Web / PWA ───────────────────────────────────────────────────────────
# Todo o resto do app (header, sidebar, auth, splash React, emails, favicon)
# aponta pra estes dois arquivos, entao trocar aqui atualiza tudo de uma vez.
copy('icon-192.png',           'public/icons/icon-192.png')
copy('icon-512.png',           'public/icons/icon-512.png')
copy('icon-maskable-512.png',  'public/icons/icon-maskable-512.png')
copy('favicon-32.png',         'public/icons/favicon-32.png')
copy('favicon-48.png',         'public/icons/favicon-48.png')

# ── 2. iOS ─────────────────────────────────────────────────────────────────
copy('icon-ios-1024.png',
     'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')

# Splash: mantem fundo branco e o mesmo tamanho/posicao do logo antigo
# (159px num canvas de 2732), so troca a arte.
tile = R.build(512, DEEP, CREAM)
for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    S = 2732
    sp = Image.new('RGB', (S, S), (255, 255, 255))
    n = 160
    t = tile.resize((n, n), Image.LANCZOS)
    sp.paste(t, ((S - n) // 2, (S - n) // 2), t)
    out(f'ios/App/App/Assets.xcassets/Splash.imageset/{name}', sp)

# ── 3. Android TWA ─────────────────────────────────────────────────────────
RES = 'android-twa/app/src/main/res'

# Launcher legado (pre-Android 8): o tile inteiro, com cantos arredondados.
for dpi, n in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
    out(f'{RES}/mipmap-{dpi}/ic_launcher.png', R.build(n, DEEP, CREAM))

# Adaptive icon (Android 8+): ic_maskable vira a CAMADA DE FRENTE — so a cruz,
# em transparente. O fundo passa a ser uma cor solida no XML. A estrutura
# antiga (fundo branco + o icone inteiro com padding) deixava uma borda branca
# em volta e nao permitia o efeito de parallax do sistema.
# A area segura da camada de frente e' 66/108 do lado; 0.52 fica dentro dela.
for dpi, n in (('mdpi', 82), ('hdpi', 123), ('xhdpi', 164), ('xxhdpi', 246), ('xxxhdpi', 328)):
    fg = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    c = R.CROSS.resize((int(n * 0.52),) * 2, Image.LANCZOS)
    layer = Image.new('L', (n, n), 0)
    layer.paste(c, ((n - c.size[0]) // 2, (n - c.size[1]) // 2))
    fg.paste(Image.new('RGB', (n, n), CREAM), (0, 0), layer)
    fg.putalpha(layer)
    out(f'{RES}/mipmap-{dpi}/ic_maskable.png', fg)

# Notificacao: o Android exige silhueta BRANCA em fundo transparente e aplica
# o tint dele. O arquivo antigo era o logo colorido, que o sistema renderiza
# como um borrao branco solido.
for dpi, n in (('mdpi', 24), ('hdpi', 36), ('xhdpi', 48), ('xxhdpi', 72), ('xxxhdpi', 96)):
    ic = Image.new('RGBA', (n, n), (255, 255, 255, 0))
    c = R.CROSS.resize((int(n * 0.86),) * 2, Image.LANCZOS)
    layer = Image.new('L', (n, n), 0)
    layer.paste(c, ((n - c.size[0]) // 2, (n - c.size[1]) // 2))
    ic.putalpha(layer)
    out(f'{RES}/drawable-{dpi}/ic_notification_icon.png', ic)

# Splash Android: fundo branco, logo a 46% do lado (mesma proporcao de antes).
for dpi, S in (('mdpi', 300), ('hdpi', 450), ('xhdpi', 600), ('xxhdpi', 900), ('xxxhdpi', 1200)):
    sp = Image.new('RGB', (S, S), (255, 255, 255))
    n = int(S * 0.46)
    t = tile.resize((n, n), Image.LANCZOS)
    sp.paste(t, ((S - n) // 2, (S - n) // 2), t)
    out(f'{RES}/drawable-{dpi}/splash.png', sp)

print(f'{len(done)} arquivos escritos:')
for p in done:
    print('  ', p)
