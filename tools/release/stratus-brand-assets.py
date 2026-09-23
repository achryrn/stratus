import argparse, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('-RuntimeDir', default='_dist/bin/floorp')
args = ap.parse_args()
out = os.path.join(args.RuntimeDir, 'browser', 'chrome', 'browser', 'content', 'branding')
FONT = r'C:/Windows/Fonts/arialbd.ttf'

def mark(size, bg=(14, 7, 8, 255)):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([2, 2, size - 3, size - 3], radius=int(size * 0.035), fill=bg)
    txt = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(txt)
    f = ImageFont.truetype(FONT, int(size * 0.56))
    bbox = td.textbbox((0, 0), 'S', font=f)
    w = bbox[2] - bbox[0]; h = bbox[3] - bbox[1]
    x = (size - w) // 2; y = (size - h) // 2 - bbox[1]
    td.text((x, y), 'S', font=f, fill=(255, 30, 0, 255))
    glow = txt.filter(ImageFilter.GaussianBlur(size / 40))
    layer = Image.alpha_composite(im, glow)
    return Image.alpha_composite(layer, txt)

for s in [16, 32, 48, 64, 128]:
    mark(s).save(os.path.join(out, 'icon%d.png' % s))
mark(192).save(os.path.join(out, 'about-logo.png'))
mark(384).save(os.path.join(out, 'about-logo@2x.png'))
mark(192, (10, 4, 4, 255)).save(os.path.join(out, 'about-logo-private.png'))
mark(384, (10, 4, 4, 255)).save(os.path.join(out, 'about-logo-private@2x.png'))
mark(256).save(os.path.join(out, 'document.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
mark(256, (255, 255, 255, 0)).save(os.path.join(out, 'floorp-pb-toolbar-icon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])

im = Image.new('RGBA', (300, 236), (12, 7, 8, 255))
im.alpha_composite(mark(160), (70, 38))
im.save(os.path.join(out, 'about.png'))

bg = Image.new('RGBA', (1280, 640), (10, 6, 7, 255))
glow = Image.new('RGBA', (1280, 640), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([900, -200, 1600, 500], fill=(255, 30, 0, 60))
gd.ellipse([-150, -150, 450, 450], fill=(0, 200, 255, 45))
gd.ellipse([600, 380, 1200, 900], fill=(176, 76, 255, 40))
glow = glow.filter(ImageFilter.GaussianBlur(90))
bg = Image.alpha_composite(bg, glow)
bg.alpha_composite(mark(240), (520, 200))
bg.save(os.path.join(out, 'floorp-background.png'))

wordmark = ('<?xml version="1.0" encoding="UTF-8"?>\n'

            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1390 490">\n'

            '  <text x="695" y="300" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="180" font-weight="700" letter-spacing="14" fill="#ffffff">STRATUS</text>\n'

            '  <rect x="300" y="356" width="790" height="14" rx="7" fill="#ff1e00"/>\n</svg>\n')
open(os.path.join(out, 'firefox-wordmark.svg'), 'w').write(wordmark)
open(os.path.join(out, 'about-wordmark.svg'), 'w').write(wordmark)
logo_svg = ('<?xml version="1.0" encoding="UTF-8"?>\n'

            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n'

            '  <rect x="18" y="18" width="988" height="988" rx="60" fill="#0e0708"/>\n'

            '  <text x="512" y="720" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="590" font-weight="700" fill="#ff1e00">S</text>\n</svg>\n')
open(os.path.join(out, 'about-logo.svg'), 'w').write(logo_svg)
print('Stratus brand assets written to', out)
