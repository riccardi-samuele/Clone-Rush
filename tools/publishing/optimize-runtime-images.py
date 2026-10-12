"""Compress only decorative runtime art for the CrazyGames 20 MB mobile cap."""
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1])
names = ['sky-background', 'sky-background-portrait', 'logo', 'hero',
         'transition', 'decor-sheet']
for name in names:
    png = root/'assets/candy-sky-v1'/f'{name}.png'
    webp = png.with_suffix('.webp')
    Image.open(png).save(webp, 'WEBP', quality=92, method=4)
    png.unlink()

for path in root.rglob('*'):
    if path.suffix not in {'.html', '.js', '.css', '.json', '.webmanifest'}:
        continue
    body = path.read_text()
    for name in names:
        body = body.replace(f'assets/candy-sky-v1/{name}.png',
                            f'assets/candy-sky-v1/{name}.webp')
    path.write_text(body)
