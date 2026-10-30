#!/usr/bin/env python3
"""Turns every player portrait in assets/players (png/jpg) into a 360x360 webp so the app loads fast.
Run from the repo root after adding portraits:  python3 tools/compress-portraits.py"""
import glob, os
from PIL import Image
total0 = total1 = 0
for f in sorted(glob.glob('assets/players/*.png') + glob.glob('assets/players/*.jpg')):
    before = os.path.getsize(f)
    im = Image.open(f).convert('RGBA')
    if im.width > 360:
        im = im.resize((360, 360), Image.LANCZOS)
    out = os.path.splitext(f)[0] + '.webp'
    im.save(out, 'WEBP', quality=82, method=6)
    os.remove(f)
    total0 += before; total1 += os.path.getsize(out)
print('%.1f MB -> %.1f MB' % (total0 / 1e6, total1 / 1e6))
