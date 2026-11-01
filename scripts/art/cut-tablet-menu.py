# Tablet menu tiles (23.webp): the five pictures, plus one empty label bar (labels are drawn live so the
# selected tile can take the gold style shown on Home in the design).
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(D + '23.webp')
TILES = {'home': (22, 405), 'packs': (423, 800), 'inventory': (822, 1188), 'map': (1210, 1586), 'friends': (1606, 1986)}
for name, (x0, x1) in TILES.items():
    pic = im[24:331, x0 + 8:x1 - 8]
    cv2.imwrite(os.path.join(OUT, f'tab-{name}.webp'), pic, [cv2.IMWRITE_WEBP_QUALITY, 90])
bar = im[333:396, 431:793].copy()
y0, y1, xa, xb = 8, 54, 60, 302
L = bar[y0:y1, xa - 4:xa].mean(1); R = bar[y0:y1, xb:xb + 4].mean(1); t = np.linspace(0, 1, xb - xa)[None, :, None]
bar[y0:y1, xa:xb] = (L[:, None, :] * (1 - t) + R[:, None, :] * t).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, 'tab-bar.webp'), bar, [cv2.IMWRITE_WEBP_QUALITY, 92])
print('ok')
