# Portrait-tablet card battle (25.png, 1045 x 1505). Everything the game draws live is painted out:
# player names, the "Choose an Active" prompt, the opponent's card (replaced with an empty slot like ours),
# HP bars and numbers, pile counts, the centre panel text and buttons, and the hand (cards, count, prompt, scrollbar).
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(os.path.join(D, '25.png'))
bg = im.copy()
def inpaint(*boxes, r=7):
    global bg
    mask = np.zeros(bg.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes: mask[y0:y1, x0:x1] = 255
    bg = cv2.inpaint(bg, mask, r, cv2.INPAINT_TELEA)
# our empty Active slot without its prompt, used for both sides
inpaint((150, 400, 330, 500))
slot = bg[218:684, 80:398].copy()
bg[218:717, 654:968] = cv2.resize(slot, (968 - 654, 717 - 218), interpolation=cv2.INTER_AREA)
inpaint((160, 172, 330, 210), (725, 172, 875, 210))                    # names (icons are drawn live)
inpaint((84, 692, 392, 712), (664, 723, 960, 743))                     # HP bars
inpaint((145, 718, 340, 760), (725, 744, 900, 786))                    # HP / retreat rows
inpaint((140, 900, 345, 945), (712, 910, 912, 955))                    # deck / hand / discard counts
# Centre panel: rows filled with the plain navy at the panel edges; the Rules button is inpainted.
rng0 = np.random.default_rng(3)
for y in range(296, 682):
    l = np.median(im[y, 417:422], 0); r_ = np.median(im[y, 626:630], 0); t = np.linspace(0, 1, 628 - 418)[:, None]
    bg[y, 418:628] = np.clip(l * (1 - t) + r_ * t + rng0.normal(0, 1.4, (628 - 418, 3)), 0, 255).astype(np.uint8)
inpaint((440, 674, 606, 692), (452, 698, 594, 738), (474, 744, 572, 806), r=6)
# Hand panel: each row takes the panel colour from the clean strip left of the cards (arrows kept).
rows = {}
for y in range(990, 1446):
    src = bg[y, 26:46] if not 1345 <= y <= 1400 else None
    rows[y] = None if src is None else np.median(src, 0)
known = [y for y in rows if rows[y] is not None]
for y in rows:
    if rows[y] is None: a = max(k for k in known if k < y); b = min(k for k in known if k > y); t = (y - a) / (b - a); rows[y] = rows[a] * (1 - t) + rows[b] * t
rng = np.random.default_rng(7)
for y, c in rows.items():
    x1 = 1005 if 1345 <= y <= 1400 else 1020
    bg[y, 50:x1] = np.clip(c + rng.normal(0, 1.6, (x1 - 50, 3)), 0, 255).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, 'battle-tab.webp'), bg, [cv2.IMWRITE_WEBP_QUALITY, 88])
print('ok', bg.shape)
