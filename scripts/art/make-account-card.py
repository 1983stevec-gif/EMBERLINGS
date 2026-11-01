# Repaints the Save Backup home card's caption as "Login & Password", keeping the card art.
import sys
from PIL import Image, ImageDraw, ImageFont
src = 'public/art/ui/home-card-backup.webp'; out = 'public/art/ui/home-card-account.webp'
im = Image.open(src).convert('RGB'); px = im.load()
# Clear the old caption row by row with the bar colour just right of the text.
for y in range(197, 260):
    ref = sorted((px[x, y] for x in range(306, 318)), key=sum)[6]
    for x in range(18, 306): px[x, y] = ref
d = ImageDraw.Draw(im)
title = ImageFont.truetype('/usr/share/fonts/truetype/crosextra/Caladea-Bold.ttf', 27)
sub = ImageFont.truetype('/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf', 19)
d.text((27, 222), 'Login & Password', font=title, fill=(250, 246, 236), anchor='ls')
d.text((28, 250), 'Cloud save on any device', font=sub, fill=(186, 204, 252), anchor='ls')
im.save(out, 'WEBP', quality=92)
