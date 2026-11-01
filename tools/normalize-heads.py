#!/usr/bin/env python3
"""Gives every portrait the same head size: finds the face, scales so the face is FACE_W of the frame and
puts it at the same spot. Tall hair simply gets cropped. Writes assets/players/<id>.webp (360x360) next to the png.
Usage: python3 tools/normalize-heads.py [dir]   (needs opencv-python-headless pillow numpy)"""
import glob, os, sys
import cv2, numpy as np
from PIL import Image
D = sys.argv[1] if len(sys.argv) > 1 else 'assets/players'
FACE_W, CX, CY, SIZE = 0.40, 0.5, 0.38, 360
det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')

def face(im):
    bg = Image.new('RGB', im.size, (128, 128, 128)); bg.paste(im, mask=im.split()[3])
    g = cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2GRAY)
    for c, n in ((det, 5), (alt, 3), (det, 3)):
        f = c.detectMultiScale(g, 1.05, n, minSize=(int(im.height * 0.12),) * 2)
        if len(f):
            cx = im.width / 2
            return max(f, key=lambda r: r[2] - abs(r[0] + r[2] / 2 - cx) * 0.1)
    return None

ok = bad = 0; miss = []
for f in sorted(glob.glob(D + '/*.png') + glob.glob(D + '/*.jpg')):
    im = Image.open(f).convert('RGBA')
    b = face(im)
    if b is None:
        miss.append(os.path.basename(f)); bad += 1
        s = min(im.size); l = (im.width - s) // 2
        crop = im.crop((l, 0, l + s, s)).resize((SIZE, SIZE), Image.LANCZOS)
    else:
        x, y, w, h = [float(v) for v in b]
        side = w / FACE_W
        left = x + w / 2 - CX * side; top = y + h / 2 - CY * side
        canvas = Image.new('RGBA', (int(side), int(side)), (0, 0, 0, 0))
        canvas.paste(im, (int(round(-left)), int(round(-top))))
        crop = canvas.resize((SIZE, SIZE), Image.LANCZOS); ok += 1
    crop.save(os.path.splitext(f)[0] + '.webp', 'WEBP', quality=82, method=6)
print(ok, 'normalised;', bad, 'no face:', miss)
