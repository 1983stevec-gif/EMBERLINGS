# Cuts the painted header bar (17.webp). Live values (sound state, coins, name, avatar) are removed;
# the Home tab's painted "active" glow is replaced with a plain tab so the active tab can be highlighted live.
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(D + '17.webp')
bar = im[276:417].copy()                     # y 276..416 → bar row 0..140
Y = lambda y: y - 276
def inpaint(img, rects, r=6, b=3):
    mk = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in rects: mk[Y(y0):Y(y1), x0:x1] = 255
    o = cv2.inpaint(img, mk, r, cv2.INPAINT_TELEA); bl = cv2.GaussianBlur(o, (0, 0), b)
    return np.where(mk[..., None] > 0, bl, o)
# 1. plain Home tab: Packs tab frame with its picture removed, moved onto Home, then Home's picture copied back in
packs = bar[:, 1209:1333].copy()   # Friends tab: its picture sits fully inside the frame
# blank the Packs picture with the frame's own interior colour (inpainting picked up the bright cards)
y0, y1, x0, x1 = Y(299), Y(376), 26, 98
ring = np.concatenate([packs[y0:y1, x0 - 6:x0].reshape(-1, 3), packs[y0:y1, x1:x1 + 6].reshape(-1, 3)])
fill = np.median(ring, axis=0)
noise = np.random.default_rng(1).normal(0, 3, (y1 - y0, x1 - x0, 1))
packs[y0:y1, x0:x1] = np.clip(fill + noise, 0, 255).astype(np.uint8)
edge = packs[y0 - 3:y1 + 3, x0 - 3:x1 + 3]; packs[y0 - 3:y1 + 3, x0 - 3:x1 + 3] = cv2.GaussianBlur(edge, (0, 0), 1.2)
home_glyph = bar[Y(297):Y(373), 672:730].copy()
gl = cv2.cvtColor(home_glyph, cv2.COLOR_BGR2HSV)
mask = ((gl[..., 2] > 150) & (gl[..., 1] > 60)) | (gl[..., 2] > 200)
mask = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.0)[..., None]
bar[:Y(392), 641:759] = packs[:Y(392), 2:120]
region = bar[Y(297):Y(373), 672:730].astype(np.float32)
bar[Y(297):Y(373), 672:730] = (home_glyph * mask + region * (1 - mask)).astype(np.uint8)
# 2. live text areas
bar = inpaint(bar, [(1506, 322, 1594, 352), (1658, 320, 1712, 352), (1790, 320, 1876, 352)], r=6, b=2)
cv2.imwrite(os.path.join(OUT, 'header-bar.webp'), bar, [cv2.IMWRITE_WEBP_QUALITY, 92])
# 3. flame sprite for the burning animation (dark background made transparent)
fl = im[288:370, 210:276].astype(np.float32)
lum = fl.max(-1); a = np.clip((lum - 70) / 90, 0, 1)
rgba = np.dstack([fl, a * 255]).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, 'header-flame.png'), rgba)
print('ok', bar.shape)
