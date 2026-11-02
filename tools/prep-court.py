#!/usr/bin/env python3
"""Turn a top-down full-court image into the half court the live game uses.
usage: prep-court.py picture.png team-id [left|right]
Finds the wood floor, takes the chosen half (default right), rotates it so the baseline is at the bottom,
and writes assets/courts/<team-id>.webp."""
import sys
import numpy as np
from PIL import Image
src, team = sys.argv[1], sys.argv[2]
side = sys.argv[3] if len(sys.argv) > 3 else 'right'
im = Image.open(src).convert('RGB')
a = np.array(im).astype(int)
m = (a[..., 0] > 150) & (a[..., 1] > 110) & (a[..., 2] < 190) & (a[..., 0] - a[..., 2] > 35)
cols, rows = m.sum(0), m.sum(1)
xs = np.where(cols > rows.max() * 0.3)[0]
ys = np.where(rows > cols.max() * 0.3)[0]
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
mid = (x0 + x1) // 2
if side == 'right':
    h = im.crop((mid, y0, x1 + 1, y1 + 1)).transpose(Image.ROTATE_270)
else:
    h = im.crop((x0, y0, mid, y1 + 1)).transpose(Image.ROTATE_90)
if h.width < 700:
    h = h.resize((h.width * 2, h.height * 2), Image.LANCZOS)
h.save('assets/courts/%s.webp' % team, quality=90)
print('saved', h.size)
