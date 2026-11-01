# Cuts the four "selected tab" header bars (18-21.webp) and removes their live values
# (sound state, coins, username) so the game can draw them.
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
for src, name in [('18.webp', 'home'), ('19.webp', 'packs'), ('20.webp', 'inventory'), ('21.webp', 'friends')]:
    bar = cv2.imread(D + src)[246:422].copy()
    mk = np.zeros(bar.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in [(1496, 300, 1594, 334), (1662, 298, 1724, 336), (1806, 300, 1898, 334)]: mk[y0 - 246:y1 - 246, x0:x1] = 255
    o = cv2.inpaint(bar, mk, 6, cv2.INPAINT_TELEA); bl = cv2.GaussianBlur(o, (0, 0), 2); bar = np.where(mk[..., None] > 0, bl, o)
    cv2.imwrite(os.path.join(OUT, f'header-{name}.webp'), bar, [cv2.IMWRITE_WEBP_QUALITY, 92])
print('ok')
