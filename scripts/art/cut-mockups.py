# Cuts the interface art out of the supplied mockups. Dynamic text is removed (inpainted) so live values can be drawn on top.
import cv2, numpy as np, sys, os
from PIL import Image
D=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
def load(n): return cv2.imread(D+n)
def inpaint(img, rects, r=7):
    m=np.zeros(img.shape[:2],np.uint8)
    for (x0,y0,x1,y1) in rects: m[y0:y1,x0:x1]=255
    out=cv2.inpaint(img,m,r,cv2.INPAINT_TELEA)
    # soften streaks inside the filled areas
    blur=cv2.GaussianBlur(out,(0,0),5); out=np.where(m[...,None]>0,blur,out)
    return out
def save(img,name,q=88): cv2.imwrite(os.path.join(OUT,name),img,[cv2.IMWRITE_WEBP_QUALITY,q])
def key_logo(img,box,name,thr=18):
    x0,y0,x1,y1=box; c=img[y0:y1,x0:x1].astype(float); bg=np.median(np.concatenate([c[:3].reshape(-1,3),c[-3:].reshape(-1,3)]),0)
    a=np.clip((np.sqrt(((c-bg)**2).sum(-1))-thr)/55,0,1); rgb=np.clip(bg+(c-bg)/np.maximum(a[...,None],1e-3),0,255)
    rgba=np.dstack([rgb[...,::-1],a*255]).astype('uint8'); Image.fromarray(rgba,'RGBA').save(os.path.join(OUT,name))
# ---------- Home (4.webp, 1586x992)
h=load('4.webp')
save(inpaint(h,[(1246,26,1296,57),(1352,20,1512,62),(1150,165,1540,398),(108,768,300,796),(146,864,226,897)]),'home.webp')
# mobile pieces
save(h[75:552,0:1124],'home-hero.webp'); 
for i,(x0,x1) in enumerate([(33,413),(423,787),(798,1162),(1172,1553)]): save(h[562:732,x0:x1],f'home-tile{i}.webp')
save(h[815:912,400:1290],'home-journey.webp')
# ---------- Adventure HQ (5.webp, 1586x992)
m=load('5.webp')
save(inpaint(m,[(1482,18,1540,52),(1198,98,1490,166),(1203,408,1470,486),(1203,490,1492,522),(1013,844,1146,878),(244,928,414,964)]),'map.webp')
# ---------- Vault (6.webp, 1536x1024)
v=load('6.webp')
slots=[(47,217,522,587),(540,217,997,587),(1017,217,1489,587),(47,603,522,957),(540,603,997,957)]
base=v.copy()
# remove dynamic header values and the collect button area
base=inpaint(base,[(1376,24,1442,58),(704,128,912,190),(1022,150,1130,192),(1250,122,1480,198)])
# replace every slot with plain background (they are drawn live from clean frames)
for (x0,y0,x1,y1) in slots: base=inpaint(base,[(x0-4,y0-4,x1+4,y1+4)],r=9)
save(base,'vault.webp')
def clean_frame(box,inner,extra=[]):
    x0,y0,x1,y1=box; c=v[y0:y1,x0:x1].copy(); w=x1-x0; hh=y1-y0
    ix0,iy0,ix1,iy1=inner
    return inpaint(c,[(ix0,iy0,w-ix1,hh-iy1)]+extra,r=9)
# gold frame (available): keep border, corner flourishes, vines and rays-card icon; remove label, badge, text, select, button
gold=clean_frame(slots[0],(100,150,100,20),[(25,20,140,62),(320,15,452,52)])
save(gold,'slot-gold.webp')
# navy frame from slot 4: remove label, seal and all text
navy=clean_frame(slots[3],(95,15,95,15),[(25,20,140,58)])
save(navy,'slot-navy.webp')
save(v[232:382,152:412],'slot-icon-card.webp')   # card with flame, plus, rays
save(v[616:758,188:384],'slot-icon-lock.webp')   # lock seal
key_logo(v,(376,226,498,260),'badge-available.png',thr=30)
