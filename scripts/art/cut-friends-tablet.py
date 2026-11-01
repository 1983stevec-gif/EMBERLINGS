# Portrait-tablet Friends screen (24.png, 1045 x 1506): background between the header and the menu, with the
# sample username, friend count and friend rows painted out; plus the three row buttons.
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(os.path.join(D, '24.png'))
TOP, BOT = 130, 1320
bg = im.copy()
def inpaint(x0, y0, x1, y1):
    mask = np.zeros(bg.shape[:2], np.uint8); mask[y0:y1, x0:x1] = 255
    return cv2.inpaint(bg, mask, 5, cv2.INPAINT_TELEA)
bg = inpaint(262, 338, 480, 394)      # sample username
bg = inpaint(338, 600, 368, 642)      # sample friend count
# Friend rows: fill with the panel texture just below them, row by row.
strip = bg[950:960, 52:996]
for y in range(651, 946): bg[y, 52:996] = strip[(y - 651) % strip.shape[0]]
cv2.imwrite(os.path.join(OUT, 'friends-tab.webp'), bg, [cv2.IMWRITE_WEBP_QUALITY, 88])  # full height; the page crops TOP..BOT
for name, (x0, x1) in {'trade': (402, 573), 'duel': (587, 779), 'coop': (793, 983)}.items():
    cv2.imwrite(os.path.join(OUT, f'friends-btn-{name}.webp'), im[680:767, x0:x1], [cv2.IMWRITE_WEBP_QUALITY, 92])
print('ok', bg.shape)
