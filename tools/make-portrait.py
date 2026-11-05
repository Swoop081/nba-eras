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

FACE_W = 0.44   # face width as a share of the frame (median of the existing portraits by this detector)
FACE_TOP = 0.147  # top of the detected face box, as a share of the frame height; every head lines up here
HEAD_GAP = 0.04  # only used when no face is found
SIZE = 600

def face_box(im):
    rgb = Image.new('RGB', im.size, (128, 128, 128))
    rgb.paste(im, mask=im.split()[3])
    gray = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2GRAY)
    import os
    xml = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
    if not os.path.exists(xml):
        xml = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'haarcascade_frontalface_default.xml')
    det = cv2.CascadeClassifier(xml)
    f = det.detectMultiScale(gray, 1.1, 5, minSize=(int(im.width * 0.15),) * 2)
    if not len(f):
        return None
    return max(f, key=lambda r: r[2])

SESSION = None
def main(src, pid, outdir='assets/players'):
    global SESSION
    raw = Image.open(src)
    if raw.mode in ('RGBA', 'LA', 'P') and np.array(raw.convert('RGBA'))[:, :, 3].min() == 0 \
            and (np.array(raw.convert('RGBA'))[:, :, 3] == 0).mean() > 0.05:
        cut = raw.convert('RGBA')   # already cut out: keep its own transparency
    else:
        im = raw.convert('RGB')
        SESSION = SESSION or new_session('u2net')
        cut = remove(im, session=SESSION).convert('RGBA')
    box = face_box(cut)
    if box is None:
        alpha = np.array(cut)[:, :, 3]
        ys, xs = np.where(alpha > 128)
        side = max(int((xs.max() - xs.min()) * 1.1), 1)
        left = (xs.min() + xs.max()) / 2 - side / 2
        top = ys.min() - HEAD_GAP * side
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(cut, (int(-left), int(-top)))
        crop = canvas
        print('no face found, framed on the cut-out')
    else:
        x, y, w, h = [int(v) for v in box]
        side = w / FACE_W
        left = x + w / 2 - side / 2
        # faces line up on FACE_TOP; tall hair above the frame is simply cropped off
        # if the photo ends above the frame's bottom, zoom in a little (down to 75%) so no empty strip is left
        fit = (cut.height - y) / (1 - FACE_TOP)
        if fit < side:
            side = max(fit, side * 0.75)
            left = x + w / 2 - side / 2
        top = y - FACE_TOP * side
        canvas = Image.new('RGBA', (int(side), int(side)), (0, 0, 0, 0))
        canvas.paste(cut, (int(-left), int(-top)))
        crop = canvas
    out = crop.resize((SIZE, SIZE), Image.LANCZOS)
    path = '%s/%s.webp' % (outdir, pid)
    out.save(path, 'WEBP', quality=85, method=6, exact=True)
    print('saved', path)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], *(sys.argv[3:4]))
