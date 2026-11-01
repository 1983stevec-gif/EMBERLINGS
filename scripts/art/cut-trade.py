# Friend Trading (28.webp) and Trade Room (29.webp), 1536 x 1024. Live parts are painted out:
# 28: duplicate logo, friend count, the sample friend row, the trading-table caption.
# 29: duplicate logo, title subtitle, player names, avatars, "No card selected", the Waiting and Accept buttons.
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
def paint(name, boxes, circles=(), rowfill=()):
    im = cv2.imread(os.path.join(D, name)); bg = im.copy()
    for (x0, y0, x1, y1) in rowfill:              # fill each row with the colour just left/right of the box
        for y in range(y0, y1):
            l = np.median(im[y, x0 - 6:x0 - 1], 0); r = np.median(im[y, x1 + 1:x1 + 6], 0); t = np.linspace(0, 1, x1 - x0)[:, None]
            bg[y, x0:x1] = (l * (1 - t) + r * t).astype(np.uint8)
    mask = np.zeros(bg.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes: mask[y0:y1, x0:x1] = 255
    for cx, cy, r in circles: cv2.circle(mask, (cx, cy), r, 255, -1)
    return cv2.inpaint(bg, mask, 6, cv2.INPAINT_TELEA)
a = paint('28.webp', [(52, 8, 282, 58), (86, 368, 170, 396), (640, 706, 1470, 780)], rowfill=[(74, 420, 578, 547)])
cv2.imwrite(os.path.join(OUT, 'trading.webp'), a, [cv2.IMWRITE_WEBP_QUALITY, 88])
b = paint('29.webp', [(62, 10, 262, 60), (552, 112, 990, 142), (380, 264, 610, 302), (1015, 264, 1190, 302), (395, 650, 560, 678), (985, 650, 1150, 678), (885, 684, 1243, 745), (485, 823, 786, 881)], circles=[(308, 300, 50), (948, 300, 50)])
cv2.imwrite(os.path.join(OUT, 'trade-room.webp'), b, [cv2.IMWRITE_WEBP_QUALITY, 88])
print('ok')
