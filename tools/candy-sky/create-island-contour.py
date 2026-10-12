"""Extract collision metadata from the approved art; never modify the image."""
import hashlib, json
from pathlib import Path
from PIL import Image
source = Path('public/assets/candy-sky-v1/island-profiles-v3.png')
im = Image.open(source).convert('RGBA')
profile = dict(x=20, y=700, end=1516, height=324, walk=66, left=312, right=1176, feather=24)
contour = []
for x in range(profile['x'], profile['end']):
    opaque = [y for y in range(profile['height']) if im.getpixel((x, profile['y'] + y))[3] >= 128]
    contour.append(max(opaque) + 1 if opaque else profile['walk'])
Path('src/game/candy-island-contour.json').write_text(json.dumps(dict(source=str(source), sha256=hashlib.sha256(source.read_bytes()).hexdigest(), profile=profile, bottom=contour), separators=(',', ':')) + '\n')
