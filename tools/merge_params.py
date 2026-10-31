"""Merge data/params/<era>.json into data/era-params.json (the file the game loads)."""
import json, glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
out = {}
for f in sorted(glob.glob(os.path.join(HERE, '..', 'data', 'params', '*.json'))):
    out.update(json.load(open(f)))
json.dump(out, open(os.path.join(HERE, '..', 'data', 'era-params.json'), 'w'), indent=1)
print(sorted(out))
