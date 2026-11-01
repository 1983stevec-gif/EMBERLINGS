# Battle Rules (27.webp, 1536 x 1024): the three inaccurate condition descriptions (Sleep, Paralysis,
# Confusion) and the selected-tab gold are painted out; correct text and the active tab are drawn live.
import cv2, numpy as np, sys, os
D, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(os.path.join(D, '27.webp')); bg = im.copy()
def inpaint(*boxes, r=5):
    global bg
    mask = np.zeros(bg.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes: mask[y0:y1, x0:x1] = 255
    bg = cv2.inpaint(bg, mask, r, cv2.INPAINT_TELEA)
inpaint((670, 906, 820, 946), (836, 906, 990, 930), (1022, 906, 1182, 946))
cv2.imwrite(os.path.join(OUT, 'rules.webp'), bg, [cv2.IMWRITE_WEBP_QUALITY, 88])
print('ok')
