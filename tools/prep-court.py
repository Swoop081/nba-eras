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
def span(mask, fr):
    rows, cols = mask.sum(1), mask.sum(0)
    ry = np.where(rows > mask.shape[1] * fr)[0]
    cx = np.where(cols > mask.shape[0] * fr)[0]
    if len(ry) < 2 or len(cx) < 2: return None
    return cx.min(), ry.min(), cx.max(), ry.max()
wood = (a[..., 0] > 190) & (a[..., 2] > 100) & (a[..., 0] - a[..., 2] > 25)
cands = [span(a.min(2) > 225, 0.5), span(wood, 0.4)]
cands = [c for c in cands if c]
best = min(cands, key=lambda c: abs((c[2] - c[0]) / max(1, c[3] - c[1]) - 1.88))
x0, y0, x1, y1 = best
if len(sys.argv) > 4:
    x0, y0, x1, y1 = [int(v) for v in sys.argv[4].split(',')]
mid = (x0 + x1) // 2
if side == 'right':
    h = im.crop((mid, y0, x1 + 1, y1 + 1)).transpose(Image.ROTATE_270)
else:
    h = im.crop((x0, y0, mid, y1 + 1)).transpose(Image.ROTATE_90)
if h.width < 700:
    h = h.resize((h.width * 2, h.height * 2), Image.LANCZOS)
h.save('assets/courts/%s.webp' % team, quality=90)
print('saved', h.size)
