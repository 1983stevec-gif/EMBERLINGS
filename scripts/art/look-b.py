"""Look pack B art: makes the battle scenes and card backs the game ships from a licensed card-art pack.
Usage: python -I scripts/art/look-b.py <backgrounds folder> <card backs folder> [scene ...]
Only the finished WebP files are kept in the repo; the pack itself is never committed.
The scenes are cut to sit behind the painted frames of public/art/ui/battle.webp and battle-tab.webp."""
import os, sys
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT, UI = os.path.join(ROOT, 'public/art/battle-bg'), os.path.join(ROOT, 'public/art/ui')
# island: source picture, top of the desktop slice (0-1), brightness, storm tint
SCENES = {
    'meadows': ('Sky_Isles_Sunset_Isle_Twilight', .1, .62, False),
    'crystalwood': ('Enchanted_Grove_Moonwell_Night', .12, .95, False),
    'peaks': ('Battlefield_Night_Watchfires_Night', .2, .95, False),
    'thunder': ('Volcanic_Hellscape_Lava_River_Twilight', .05, .66, True),
    'shadow': ('Haunted_Graveyard_Fog_Lane_Night', .28, .95, False),
}
BACKS = {'compass': 'compass_steel', 'lattice': 'lattice_azure', 'orbit': 'orbit_violet', 'rosette': 'rosette_gold'}
# The painted boards: the part the scene covers, panels that stay dark (card spots keep their contrast), feather.
BOARDS = {
    'wide': dict(art='battle', box=(170, 100, 1490, 610), area=(225, 140, 1425, 548), feather=34, dim=1.0, panel=.12,
                 panels=[(296, 210, 573, 425), (252, 444, 616, 518), (712, 224, 960, 540), (1145, 190, 1357, 455), (1091, 486, 1412, 544)]),
    'tab': dict(art='battle-tab', box=(60, 150, 985, 955), area=(72, 166, 972, 944), feather=8, dim=.62, panel=0,
                panels=[(408, 130, 640, 960)]),
}


def scene(src, name):
    file, top, light, storm = SCENES[name]
    im = Image.open(os.path.join(src, file + '.png')).convert('RGB')
    if storm:  # a violet thunder sky instead of lava
        h, s, v = im.convert('HSV').split()
        h = h.point(lambda p: (185 - int(p * .55)) % 256)
        im = Image.merge('HSV', (h, s.point(lambda p: int(p * .72)), v)).convert('RGB')
    return ImageEnhance.Brightness(im).enhance(light), top


def fit(im, w, h, top):
    k = max(w / im.width, h / im.height)
    r = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x, y = (r.width - w) // 2, min(r.height - h, round(r.height * top))
    return r.crop((x, y, x + w, y + h)).filter(ImageFilter.GaussianBlur(.7))


def layer(im, top, b):
    base = Image.open(os.path.join(UI, b['art'] + '.webp')).convert('RGB')
    x0, y0, x1, y1 = b['box']
    a = np.asarray(base).astype(int)
    keep = ((a[..., 0] - a[..., 2] > 14) & (a.max(2) > 45)) | (a.min(2) > 105)  # gold frames and white icons stay on top
    keep = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2.2))
    area = Image.new('L', base.size, 0)
    ImageDraw.Draw(area).rectangle(b['area'], fill=255)
    area = area.filter(ImageFilter.GaussianBlur(b['feather']))
    pan = Image.new('L', base.size, 255)
    d = ImageDraw.Draw(pan)
    for p in b['panels']:
        d.rounded_rectangle(p, 10, fill=int(255 * b['panel']))
    alpha = ImageChops.multiply(ImageChops.multiply(area, pan.filter(ImageFilter.GaussianBlur(3))), ImageChops.invert(keep))
    alpha = alpha.point(lambda p: int(p * b['dim'])).crop(b['box'])
    out = fit(im, x1 - x0, y1 - y0, top).convert('RGBA')
    out.putalpha(alpha)
    return out


def word(im, text, size, gap):
    """The game's name at the foot of the card, like the drawn backs, in a light shade of the card's own color."""
    font = ImageFont.truetype(os.environ.get('LOOK_FONT', 'C:/Windows/Fonts/georgiab.ttf'), size)
    rgb = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    color = tuple(int(c * 255 / max(rgb) * .55 + 255 * .4) for c in rgb)
    d = ImageDraw.Draw(im)
    x = (im.width - sum(font.getlength(c) + gap for c in text) + gap) / 2
    for c in text:
        d.text((x, 880), c, font=font, fill=color, anchor='lm', stroke_width=2, stroke_fill=(8, 8, 14))
        x += font.getlength(c) + gap


def back(src, file):
    im = Image.open(os.path.join(src, f'card_back_{file}.png')).convert('RGB')
    w, h = 630, 960
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)  # 5:7, so the empty bands above and below the pattern grow
    e, b = 40, 66
    grow = (h - im.height) // 2
    y = h - b - grow
    out = Image.new('RGB', (w, h))
    out.paste(im.crop((0, 0, w, e)), (0, 0))
    out.paste(im.crop((0, e, w, b)).resize((w, b - e + grow)), (0, e))
    out.paste(im.crop((0, b, w, im.height - b)), (0, b + grow))
    out.paste(im.crop((0, im.height - b, w, im.height - e)).resize((w, h - e - y)), (0, y))
    out.paste(im.crop((0, im.height - e, w, im.height)), (0, h - e))
    word(out, 'EMBERLINGS', 34, 11)
    return out


if __name__ == '__main__':
    bgs, backs = sys.argv[1:3]
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'public/art/card-backs'), exist_ok=True)
    for n in sys.argv[3:] or SCENES:
        im, top = scene(bgs, n)
        for k, b in BOARDS.items():
            layer(im, top, b).save(os.path.join(OUT, f'{n}-{k}.webp'), quality=72, alpha_quality=80, method=6)
        im.resize((800, 450), Image.LANCZOS).save(os.path.join(OUT, f'{n}.webp'), quality=62, method=6)
    for n, f in BACKS.items():
        back(backs, f).save(os.path.join(ROOT, f'public/art/card-backs/{n}.webp'), quality=80, method=6)
