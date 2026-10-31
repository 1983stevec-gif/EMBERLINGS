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
