#!/usr/bin/env python3
"""Fetches a Wikipedia photo for every real head coach in data/coaches-2026.json, centres the face the same way
as the player portraits and writes assets/coaches/<id>.webp (360x360).  Runs in GitHub Actions.
Needs: pip install opencv-python-headless pillow numpy"""
import io, json, os, re, sys, unicodedata, urllib.parse, urllib.request
import cv2, numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'nba-eras-private/1.0 (personal project)'}
FACE_W, CX, CY, SIZE = 0.40, 0.5, 0.40, 360
det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()

def slug(n):
    s = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def image_for(title):
    for t in (title, title + ' (basketball)', title + ' (basketball coach)', title + ' (coach)'):
        try:
            j = json.loads(get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(t.replace(' ', '_'))))
        except Exception:
            continue
        if j.get('type') == 'disambiguation':
            continue
        src = (j.get('originalimage') or j.get('thumbnail') or {}).get('source')
        if src:
            return src
    return None

def crop(im):
    g = cv2.cvtColor(np.array(im.convert('RGB')), cv2.COLOR_RGB2GRAY)
    f = det.detectMultiScale(g, 1.05, 4, minSize=(int(im.height * 0.08),) * 2)
    if len(f):
        x, y, w, h = [float(v) for v in max(f, key=lambda r: r[2])]
        side = w / FACE_W
        left, top = x + w / 2 - CX * side, y + h / 2 - CY * side
        canvas = Image.new('RGB', (int(side), int(side)), (40, 44, 52))
        canvas.paste(im.convert('RGB'), (int(round(-left)), int(round(-top))))
        return canvas.resize((SIZE, SIZE), Image.LANCZOS), True
    s = min(im.size)
    return im.convert('RGB').crop(((im.width - s) // 2, 0, (im.width + s) // 2, s)).resize((SIZE, SIZE), Image.LANCZOS), False

def main():
    d = json.load(open(os.path.join(ROOT, 'data', 'coaches-2026.json')))
    out = os.path.join(ROOT, 'assets', 'coaches'); os.makedirs(out, exist_ok=True)
    for tid, row in d['hc'].items():
        name, wiki = row[0], row[1]; path = os.path.join(out, slug(name) + '.webp')
        if os.path.exists(path): continue
        src = image_for(wiki)
        if not src: print('no image:', name); continue
        try:
            im = Image.open(io.BytesIO(get(src)))
            c, face = crop(im); c.save(path, 'WEBP', quality=82, method=6)
            print('ok' if face else 'ok (no face found)', name)
        except Exception as e:
            print('failed:', name, e)

main()
