#!/usr/bin/env python3
"""Turns a raw portrait photo into assets/players/<id>.webp: background removed, face scaled to the
same size and position as every other portrait, 600x600.
Usage: python3 tools/make-portrait.py <photo> <player-id>
Needs: pip install rembg onnxruntime opencv-python-headless pillow numpy"""
import sys
import cv2
import numpy as np
from PIL import Image
from rembg import remove, new_session

FACE_W = 0.56   # face width as a share of the frame (the existing portraits average 0.56)
HEAD_GAP = 0.06  # gap above the top of the hair, as a share of the frame height
SIZE = 600

def face_box(im):
    rgb = Image.new('RGB', im.size, (128, 128, 128))
    rgb.paste(im, mask=im.split()[3])
    gray = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2GRAY)
    det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    f = det.detectMultiScale(gray, 1.1, 5, minSize=(int(im.width * 0.15),) * 2)
    if not len(f):
        return None
    return max(f, key=lambda r: r[2])

def main(src, pid):
    im = Image.open(src).convert('RGB')
    cut = remove(im, session=new_session('u2net')).convert('RGBA')
    box = face_box(cut)
    if box is None:
        s = min(cut.size)
        crop = cut.crop((0, 0, s, s))
        print('no face found, plain square crop')
    else:
        x, y, w, h = [int(v) for v in box]
        side = w / FACE_W
        left = x + w / 2 - side / 2
        alpha = np.array(cut)[:, :, 3]
        rows = np.where((alpha > 128).sum(1) > 3)[0]
        hair = rows[0] if len(rows) else y
        top = hair - HEAD_GAP * side
        canvas = Image.new('RGBA', (int(side), int(side)), (0, 0, 0, 0))
        canvas.paste(cut, (int(-left), int(-top)))
        crop = canvas
    out = crop.resize((SIZE, SIZE), Image.LANCZOS)
    path = 'assets/players/%s.webp' % pid
    out.save(path, 'WEBP', quality=85, method=6, exact=True)
    print('saved', path)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
