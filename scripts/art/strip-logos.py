# Removes the painted EMBERLINGS logo from the page art so the animated logo can sit in its place.
# Run after cut-mockups*.py. Boxes are in mockup pixels; the Vault keeps its "MAGICAL ADVENTURE" line.
import cv2, numpy as np, sys, os
OUT = sys.argv[1]
JOBS = {'home.webp': [(58, 6, 404, 74)], 'vault.webp': [(54, 8, 364, 50), (54, 48, 112, 72)], 'welcome.webp': [(80, 8, 392, 76)], 'packs.webp': [(212, 14, 446, 58)]}
for name, boxes in JOBS.items():
    path = os.path.join(OUT, name); img = cv2.imread(path)
    if img is None: continue
    m = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in boxes: m[y0:y1, x0:x1] = 255
    out = cv2.inpaint(img, m, 9, cv2.INPAINT_TELEA)
    blur = cv2.GaussianBlur(out, (0, 0), 6); out = np.where(m[..., None] > 0, blur, out)
    cv2.imwrite(path, out, [cv2.IMWRITE_WEBP_QUALITY, 90])

# Adventure HQ header is a plain dark band: fill each row with the band colour beside the logo.
path = os.path.join(OUT, 'map.webp'); img = cv2.imread(path)
if img is not None:
    x0, y0, x1, y1 = 36, 4, 334, 61
    band = np.median(img[y0:y1, 340:470], axis=1)
    img[y0:y1, x0:x1] = band[:, None, :]
    edge = img[y0 - 2:y1 + 2, x0 - 6:x1 + 6]; img[y0 - 2:y1 + 2, x0 - 6:x1 + 6] = cv2.GaussianBlur(edge, (0, 0), 1.2)
    cv2.imwrite(path, img, [cv2.IMWRITE_WEBP_QUALITY, 90])
