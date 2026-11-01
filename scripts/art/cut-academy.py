# Attack Academy / training centre (26.webp, 1536 x 1024). Painted out for live text: centre title and
# subtitle, the sessions/passes line, the chosen Mythling (portrait, name, level), training steps 1-2,
# and the card grid (cards are drawn live from the player's collection).
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(os.path.join(D, '26.webp')); bg = im.copy()
def inpaint(*boxes, r=6):
    global bg
    mask = np.zeros(bg.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes: mask[y0:y1, x0:x1] = 255
    bg = cv2.inpaint(bg, mask, r, cv2.INPAINT_TELEA)
inpaint((72, 66, 516, 134), (78, 133, 574, 162), (82, 222, 470, 246))           # title, subtitle, passes line
# name and level line (the ring above is kept out of the mask)
mask = np.zeros(bg.shape[:2], np.uint8); mask[500:578, 1186:1360] = 255; cv2.circle(mask, (1269, 421), 93, 0, -1)
bg = cv2.inpaint(bg, mask, 6, cv2.INPAINT_TELEA)
inpaint((1180, 598, 1384, 660), (1186, 668, 1390, 732))                         # steps 1 and 2 text
# portrait: fill the circle's inside with dark navy (the live portrait covers it)
cv2.circle(bg, (1269, 421), 83, (40, 26, 15), -1)
# card grid: rows filled between the clean background at both sides
rng = np.random.default_rng(5)
for y in range(304, 950):
    l = np.median(im[y, 58:68], 0); r_ = np.median(im[y, 1032:1044], 0); t = np.linspace(0, 1, 1032 - 68)[:, None]
    bg[y, 68:1032] = np.clip(l * (1 - t) + r_ * t + rng.normal(0, 1.3, (1032 - 68, 3)), 0, 255).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, 'academy.webp'), bg, [cv2.IMWRITE_WEBP_QUALITY, 88])
print('ok', bg.shape)
