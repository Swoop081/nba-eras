#!/usr/bin/env python3
"""Cut a special-edition full-court picture (city edition, Cup, ...) into the same upright full-floor image the live game uses.
usage: city-court.py picture.png out.webp x0,y0,x1,y1 [oob_feet]
The box is the playing surface (the white boundary lines), roughly; each edge is snapped to the nearest strong line."""
import sys
import numpy as np
from PIL import Image
src, out, box = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')]
OOB = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
im = Image.open(src).convert('RGB')
g = np.array(im.convert('L')).astype(float)
sc = im.width / 2000.0
x0, y0, x1, y1 = [int(round(v * sc)) for v in box]
def snap(profile, at, r):
    d = np.abs(np.diff(profile))
    lo, hi = max(1, at - r), min(len(d) - 1, at + r)
    return lo + int(np.argmax(d[lo:hi]))
r = int(12 * sc)
colm = g[y0 + (y1 - y0) // 4: y1 - (y1 - y0) // 4].mean(0); rowm = g[:, x0 + (x1 - x0) // 4: x1 - (x1 - x0) // 4].mean(1)
x0, x1 = snap(colm, x0, r), snap(colm, x1, r)
y0, y1 = snap(rowm, y0, r), snap(rowm, y1, r)
w = x1 - x0
ext = int(round(OOB * w / 94.0))
crop = im.crop((max(0, x0 - ext), y0, min(im.width, x1 + ext), y1 + 1)).transpose(Image.ROTATE_90)
k = 800 / crop.width
crop.resize((800, int(crop.height * k)), Image.LANCZOS).save(out, quality=85)
print(out, (x0, y0, x1, y1), 'aspect', round(w / (y1 - y0), 3), crop.size)
