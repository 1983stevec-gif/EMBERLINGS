import cv2, numpy as np, sys, os
D=sys.argv[1]; OUT=sys.argv[2]
def save(img,name,q=90): cv2.imwrite(os.path.join(OUT,name),img,[cv2.IMWRITE_WEBP_QUALITY,q])
def rowfill(img, rects, blur=3):
    out=img.copy().astype(float)
    for (x0,y0,x1,y1) in rects:
        L=out[y0:y1,max(0,x0-3):x0].mean(1); R=out[y0:y1,x1:x1+3].mean(1)
        t=np.linspace(0,1,x1-x0)[None,:,None]
        out[y0:y1,x0:x1]=L[:,None,:]*(1-t)+R[:,None,:]*t
        if blur:
            reg=out[max(0,y0-2):y1+2,x0:x1]; out[max(0,y0-2):y1+2,x0:x1]=cv2.GaussianBlur(reg,(0,0),blur)
    return np.clip(out,0,255).astype(np.uint8)
h=cv2.imread(D+'4.webp')
hh=rowfill(h,[(1146,163,1544,400)],blur=4)
m=np.zeros(h.shape[:2],np.uint8)
for (x0,y0,x1,y1) in [(1246,26,1296,57),(1352,20,1512,62),(108,768,300,796),(146,862,282,899)]: m[y0:y1,x0:x1]=255
hh=cv2.inpaint(hh,m,7,cv2.INPAINT_TELEA); save(hh,'home.webp')
v=cv2.imread(D+'6.webp')
s1=v[217:587,47:522].copy()   # gold (available)
s1=rowfill(s1,[(18,14,152,58),(318,6,460,50),(92,160,388,202),(140,202,340,250),(30,246,446,296),(30,294,446,344),(140,342,340,362)])
save(s1,'slot-gold.webp')
s4=v[603:957,47:522].copy()   # navy
s4=rowfill(s4,[(18,14,152,58),(138,10,338,184),(140,180,340,252),(66,250,409,306),(140,302,340,342)])
save(s4,'slot-navy.webp')

# ---------- Welcome / username (8.webp, 1672x941)
w=cv2.imread(D+'8.webp')
if w is not None:
    mask=np.zeros(w.shape[:2],np.uint8)
    for (x0,y0,x1,y1) in [(1508,24,1572,62)]: mask[y0:y1,x0:x1]=255
    ww=cv2.inpaint(w,mask,7,cv2.INPAINT_TELEA)
    ww=rowfill(ww,[(1022,468,1120,508)],blur=0)   # typed name inside the input box
    save(ww,'welcome.webp')
    save(w[88:941,0:920],'welcome-art.webp')

# Phone hero: remove the painted headline (the live text is drawn on top).
hero = cv2.imread(D + '4.webp')[75:552, 0:1124].copy()
mk = np.zeros(hero.shape[:2], np.uint8); mk[270 - 75:505 - 75, 30:620] = 255
hero = cv2.inpaint(hero, mk, 9, cv2.INPAINT_TELEA); hb = cv2.GaussianBlur(hero, (0, 0), 8); hero = np.where(mk[..., None] > 0, hb, hero)
save(hero, 'home-hero.webp', 88)

# ---------- Packs (10.webp, 1536x1024): coin value removed; pack wrappers cut for the phone layout.
pk = cv2.imread(D + '10.webp')
if pk is not None:
    mk = np.zeros(pk.shape[:2], np.uint8); mk[22:54, 1228:1292] = 255
    pp = cv2.inpaint(pk, mk, 7, cv2.INPAINT_TELEA)
    # painted Open buttons removed; the live buttons are drawn in the same places
    pp = rowfill(pp, [(318, 386, 526, 441), (752, 386, 972, 441), (1199, 386, 1410, 446), (316, 707, 528, 770), (752, 707, 972, 771), (1199, 707, 1410, 771), (1189, 839, 1394, 903)], blur=2)
    save(pp, 'packs.webp')
    for name, (x0, y0, x1, y1) in {'pack': (137, 172, 297, 457), 'star': (572, 172, 733, 457), 'crystal': (1018, 172, 1182, 457), 'mythic': (137, 512, 298, 778), 'legend': (572, 492, 735, 780), 'celestial': (1018, 492, 1183, 780), 'hacker': (158, 812, 310, 935)}.items():
        save(pk[y0:y1, x0:x1], f'pack-{name}.webp')

# ---------- My Card Binder (11.webp, 1586x992): spine, sleeve, tabs, vines and footer ornament
bd = cv2.imread(D + '11.webp')
if bd is not None:
    save(bd[195:876, 26:106], 'binder-spine.webp')
    save(bd[648:848, 142:350], 'binder-sleeve.webp')
    for name, (y0, y1) in {'fire': (276, 346), 'water': (350, 420), 'nature': (424, 494), 'moon': (498, 568), 'all': (571, 642)}.items():
        save(bd[y0:y1, 1503:1562], f'binder-tab-{name}.webp')
    save(bd[182:272, 1508:1586], 'binder-vine-top.webp')
    foot = bd[870:992, 0:1586].copy()
    mk = np.zeros(foot.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in [(122, 20, 280, 50), (586, 14, 1000, 66), (606, 64, 980, 92), (1336, 22, 1470, 50)]: mk[y0:y1, x0:x1] = 255
    foot = cv2.inpaint(foot, mk, 7, cv2.INPAINT_TELEA); fb = cv2.GaussianBlur(foot, (0, 0), 4); foot = np.where(mk[..., None] > 0, fb, foot)
    save(foot, 'binder-footer.webp')
    save(bd[646:870, 1510:1586], 'binder-vine-side.webp')
    for name, (x0, y0, x1, y1) in {'search': (90, 149, 115, 174), 'funnel': (833, 150, 857, 172), 'book': (1338, 95, 1370, 121), 'chevron': (576, 152, 596, 170)}.items():
        save(bd[y0:y1, x0:x1], f'binder-icon-{name}.webp', 95)

# ---------- Mutation Vault (12.webp, 1587x991): live values, the painted selection and the chooser tiles removed
mv = cv2.imread(D + '12.webp')
if mv is not None:
    out = mv.copy()
    def inp(img, rects, r=7, b=4):
        mk = np.zeros(img.shape[:2], np.uint8)
        for (x0, y0, x1, y1) in rects: mk[y0:y1, x0:x1] = 255
        o = cv2.inpaint(img, mk, r, cv2.INPAINT_TELEA); bl = cv2.GaussianBlur(o, (0, 0), b)
        return np.where(mk[..., None] > 0, bl, o)
    # left panel: name, level, mutation pill, preview label, column head, values, price, button text, need-more line
    out = inp(out, [(196, 166, 430, 234), (198, 238, 338, 268), (340, 503, 500, 529), (522, 559, 612, 582), (393, 592, 442, 625), (543, 592, 592, 625), (398, 638, 434, 668), (548, 638, 588, 668), (376, 682, 508, 716), (340, 768, 506, 792), (200, 870, 292, 896)])
    out = rowfill(out, [(262, 730, 584, 758)], blur=2)
    # mutation cards: the live "Damage · Vault/sec" line
    cards = [(687, 214, 920, 457), (932, 214, 1165, 457), (1177, 214, 1407, 457), (687, 473, 920, 721), (933, 473, 1165, 721), (1178, 473, 1407, 721)]
    for (x0, y0, x1, y1) in cards:
        ly = 397 if y0 < 400 else 660
        out = inp(out, [(x0 + 12, ly, x1 - 10, ly + 24)], b=3)
    # Spark: remove SELECTED badge, then borrow Flame's plain frame
    out = inp(out, [(838, 213, 922, 247)], r=9)
    (sx0, sy0, sx1, sy1), (fx0, fy0, fx1, fy1) = cards[0], cards[1]
    pad = 9
    src = mv[fy0 - pad:fy1 + pad, fx0 - pad:fx1 + pad]
    ring = np.zeros(src.shape[:2], bool); ring[:2 * pad + 3, :] = ring[-(2 * pad + 3):, :] = True; ring[:, :2 * pad + 3] = ring[:, -(2 * pad + 3):] = True
    dst = out[sy0 - pad:sy1 + pad, sx0 - pad:sx1 + pad]
    h = min(dst.shape[0], src.shape[0]); w = min(dst.shape[1], src.shape[1])
    dst[:h, :w][ring[:h, :w]] = src[:h, :w][ring[:h, :w]]
    # chooser tiles
    out = inp(out, [(452, 832, 1428, 968)], r=12, b=10)
    save(out, 'mutation.webp')

# ---------- Fusion Lab (13.webp, 1586x992): live counts, button text, hint lines and the inventory row removed
fl = cv2.imread(D + '13.webp')
if fl is not None:
    def inp2(img, rects, r=7, b=4):
        mk = np.zeros(img.shape[:2], np.uint8)
        for (x0, y0, x1, y1) in rects: mk[y0:y1, x0:x1] = 255
        o = cv2.inpaint(img, mk, r, cv2.INPAINT_TELEA); bl = cv2.GaussianBlur(o, (0, 0), b)
        return np.where(mk[..., None] > 0, bl, o)
    f = inp2(fl, [(300, 198, 446, 228), (1142, 408, 1372, 434), (544, 536, 740, 563), (560, 940, 1020, 966)])
    f = rowfill(f, [(1158, 356, 1404, 392)], blur=2)
    f = inp2(f, [(168, 566, 1428, 914)], r=12, b=10)
    save(f, 'fusion.webp')

# ---------- Friends (14.webp, 1586x992): username, typed name, error box and friend count removed
fr = cv2.imread(D + '14.webp')
if fr is not None:
    def inp3(img, rects, r=7, b=4):
        mk = np.zeros(img.shape[:2], np.uint8)
        for (x0, y0, x1, y1) in rects: mk[y0:y1, x0:x1] = 255
        o = cv2.inpaint(img, mk, r, cv2.INPAINT_TELEA); bl = cv2.GaussianBlur(o, (0, 0), b)
        return np.where(mk[..., None] > 0, bl, o)
    g = inp3(fr, [(238, 230, 445, 276), (132, 454, 320, 494), (1036, 347, 1054, 369)], b=3)
    g = rowfill(g, [(116, 582, 716, 682)], blur=2)
    save(g, 'friends.webp')

# ---------- Home cards (15.webp, 1536x1024): eleven feature cards and the heading, cut as drawn
hc = cv2.imread(D + '15.webp')
if hc is not None:
    XS = [(21, 389), (397, 765), (773, 1141), (1148, 1516)]; YS = [(138, 410), (417, 695), (702, 980)]
    names = ['decks', 'rules', 'packs', 'inventory', 'index', 'training', 'fusion', 'vault', 'mutation', 'trading', 'backup']
    for i, n in enumerate(names):
        (x0, x1), (y0, y1) = XS[i % 4], YS[i // 4]
        save(hc[y0:y1, x0:x1], f'home-card-{n}.webp', 90)
    save(hc[52:128, 205:1335], 'home-cards-title.webp', 90)

# ---------- Card battle (22.webp, 1672x941): arena and frames kept; every live value, card and text removed
bt = cv2.imread(D + '22.webp')
if bt is not None:
    def inp4(img, rects, r=9, b=6):
        mk = np.zeros(img.shape[:2], np.uint8)
        for (x0, y0, x1, y1) in rects: mk[y0:y1, x0:x1] = 255
        o = cv2.inpaint(img, mk, r, cv2.INPAINT_TELEA); bl = cv2.GaussianBlur(o, (0, 0), b)
        return np.where(mk[..., None] > 0, bl, o)
    t = inp4(bt, [
        (168, 70, 264, 108), (688, 68, 990, 110), (1426, 68, 1500, 108),            # concede, score, timer
        (805, 131, 870, 149), (600, 152, 1072, 186), (630, 186, 1048, 206),          # quest text, title, coin line
        (392, 158, 482, 182), (330, 300, 515, 352),                                  # my name, choose-an-active text
        (360, 526, 512, 551), (1180, 548, 1340, 575),                                # pile counts
        (1140, 154, 1362, 182), (1148, 193, 1352, 452), (1150, 452, 1350, 486),      # opponent name, card, HP
        (734, 238, 942, 532),                                                        # centre panel contents
        (150, 606, 1522, 884), (198, 898, 470, 924),                                 # hand tray contents, discard text
    ])
    # panel interiors: plain navy (vertical gradient sampled just inside each frame) instead of blurred ghosts
    rng = np.random.default_rng(3)
    for (x0, y0, x1, y1) in [(734, 238, 942, 532), (150, 606, 1522, 884), (1148, 193, 1352, 452)]:
        top = np.median(bt[y0 - 4:y0, x0:x1].reshape(-1, 3), axis=0); bot = np.median(bt[y1:y1 + 4, x0:x1].reshape(-1, 3), axis=0)
        if (x0, y0) == (1148, 193):
            top = np.median(bt[150:160, 1100:1400].reshape(-1, 3), axis=0); bot = np.median(bt[470:480, 1100:1400].reshape(-1, 3), axis=0)
        k = np.linspace(0, 1, y1 - y0)[:, None, None]
        g = top * (1 - k) + bot * k + rng.normal(0, 2.2, (y1 - y0, x1 - x0, 1))
        t[y0:y1, x0:x1] = np.clip(np.broadcast_to(g, (y1 - y0, x1 - x0, 3)), 0, 255).astype(np.uint8)
        e = t[y0 - 3:y1 + 3, x0 - 3:x1 + 3]; t[y0 - 3:y1 + 3, x0 - 3:x1 + 3] = cv2.GaussianBlur(e, (0, 0), 1.5)
    save(t, 'battle.webp', 90)
