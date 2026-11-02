#!/usr/bin/env python3
"""Re-cut every team floor so the baseline out-of-bounds strip (the designed border behind the basket) is included.
Finds each existing half-court crop inside the original full-court pictures, then extends it past the baseline.
usage: court-oob.py sources_dir out_dir [oob_feet]"""
import sys, glob, os
import numpy as np, cv2
from PIL import Image
src_dir, out_dir = sys.argv[1], sys.argv[2]
OOB = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
srcs = {}
for f in glob.glob(os.path.join(src_dir, '*image.*')):
    im = Image.open(f).convert('RGB')
    if im.width >= 1200 and im.width / im.height > 1.4: srcs[f] = im
small = {f: cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY) for f, im in srcs.items()}
os.makedirs(out_dir, exist_ok=True)
for crop in sorted(glob.glob('assets/courts/*.webp')):
    team = os.path.basename(crop)[:-5]
    E = Image.open(crop).convert('RGB')
    best = None
    for side, inv in (('right', Image.ROTATE_90), ('left', Image.ROTATE_270)):
        T = np.array(E.transpose(inv))
        Tg = cv2.cvtColor(T, cv2.COLOR_RGB2GRAY)
        for f, g in small.items():
            sc = 0.25
            if Tg.shape[0] >= g.shape[0] or Tg.shape[1] >= g.shape[1]: continue
            r = cv2.matchTemplate(cv2.resize(g, None, fx=sc, fy=sc), cv2.resize(Tg, None, fx=sc, fy=sc), cv2.TM_CCOEFF_NORMED)
            _, v, _, loc = cv2.minMaxLoc(r)
            if not best or v > best[0]: best = (v, f, side, inv, Tg, loc)
    v, f, side, inv, Tg, loc = best
    g = small[f]; x, y = int(loc[0] / 0.25), int(loc[1] / 0.25)
    # refine at full resolution
    x0, y0 = max(0, x - 8), max(0, y - 8)
    reg = g[y0:y + Tg.shape[0] + 9, x0:x + Tg.shape[1] + 9]
    r = cv2.matchTemplate(reg, Tg, cv2.TM_CCOEFF_NORMED)
    _, v2, _, l2 = cv2.minMaxLoc(r)
    x, y = x0 + l2[0], y0 + l2[1]
    w, h = Tg.shape[1], Tg.shape[0]
    ppf = w / 47.0  # pixels per foot along the court
    ext = int(round(OOB * ppf)); im = srcs[f]
    # the whole floor: sidelines to sidelines, both baselines extended by the out-of-bounds strip, turned upright
    if side == 'right': cx0, cx1 = x - w, x + w
    else: cx0, cx1 = x, x + 2 * w
    box = (max(0, cx0 - ext), y, min(im.width, cx1 + ext), y + h)
    out = im.crop(box).transpose(Image.ROTATE_90)
    k = 800 / out.width
    out = out.resize((800, int(out.height * k)), Image.LANCZOS)
    out.save(os.path.join(out_dir, team + '.webp'), quality=85)
    print(team, round(v2, 3), box[0] - (cx0 - ext), im.width - cx1 - ext, out.size)
