"""Trail art: makes one wide scene per island (three places, one after the other) from a licensed landscape pack.
Usage: python -I scripts/art/trail.py <landscape pack zip or folder> [island ...]
Only the finished WebP files are kept in the repo; the pack itself is never committed.
The same picture is used for the trail, the "Now entering" banner and the loading screen."""
import io, os, sys, zipfile
from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public/art/trail')
# island: the places from the first quest to the Guardian, left to right
SCENES = {
    'meadows': ('EnchantedWilds_02b_02', 'EnchantedWilds_03a_02', 'EnchantedWilds_04a_02'),
    'crystalwood': ('EnchantedWilds_01b_05', 'EnchantedWilds_03b_03', 'HollowUnderdeep_05a_00'),
    'peaks': ('FrostreachHighlands_03a_00', 'FrostreachHighlands_01b_05', 'FrostreachHighlands_01a_00'),
    'thunder': ('RuinedSanctums_05a_03', 'CelestialVaults_04b_01', 'ArcaneSpires_05a_05'),
    'shadow': ('HollowUnderdeep_04b_03', 'ArcaneSpires_05a_00', 'CelestialVaults_03b_05'),
}
SIZE, FADE, TOP, HEIGHT = 512, 120, 24, 460   # each place, how far neighbors blend, the slice that is kept
WIDTH = SIZE * 3 - FADE * 2
SCALE = .9


def load(pack, name):
    rel = f'Landscapes/{name.split("_")[0]}/{name}.png'
    if os.path.isdir(pack):
        return Image.open(os.path.join(pack, rel)).convert('RGB')
    with zipfile.ZipFile(pack) as z:
        return Image.open(io.BytesIO(z.read(rel))).convert('RGB')


def strip(pack, names):
    out = Image.new('RGB', (WIDTH, SIZE))
    for i, name in enumerate(names):
        mask = Image.new('L', (SIZE, SIZE), 255)
        if i:
            mask.paste(Image.linear_gradient('L').rotate(90).resize((FADE, SIZE)), (0, 0))
        out.paste(load(pack, name), (i * (SIZE - FADE), 0), mask)
    out = out.crop((0, TOP, WIDTH, TOP + HEIGHT)).filter(ImageFilter.GaussianBlur(.8))  # softer, like the painted boards
    out = out.resize((round(WIDTH * SCALE), round(HEIGHT * SCALE)), Image.LANCZOS)
    return ImageEnhance.Brightness(out).enhance(.94)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for island, names in SCENES.items():
        if len(sys.argv) > 2 and island not in sys.argv[2:]:
            continue
        file = os.path.join(OUT, island + '.webp')
        strip(sys.argv[1], names).save(file, quality=66, method=6)
        print(island, os.path.getsize(file) // 1024, 'KB')
