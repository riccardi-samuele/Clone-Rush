"""Build silent CrazyGames preview montages from captured real gameplay."""

import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
report = json.loads((ROOT / 'release/crazygames/qa/marketing-v2/capture.json').read_text())
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
output = ROOT / 'artwork/publishing/previews/v2'
output.mkdir(parents=True, exist_ok=True)

# Start on the matching static cover; then show four actual levels at real speed.
# The first segment ends before its automatic level-change overlay appears.
segments = [(1, 2.8), (2, 4.0), (25, 4.0), (32, 4.0)]

for name, width, height in [('landscape', 1920, 1080), ('portrait', 1080, 1620)]:
    capture = next(item for item in report['captures'] if item['name'] == name)
    cover = ROOT / f'artwork/publishing/covers/v2/exports/clone-rush-{name}.png'
    target = output / f'clone-rush-{name}-preview.mp4'
    cmd = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
           '-loop', '1', '-framerate', '30', '-t', '1.5', '-i', str(cover)]
    for number, duration in segments:
        clip = next(item for item in capture['clips'] if item['level'] == number)
        start = clip['from'] + .15
        if start + duration > clip['to'] + .1:
            raise RuntimeError(f'Level {number} {name} capture too short')
        cmd.extend(['-ss', f'{start:.3f}', '-t', f'{duration:.3f}', '-i', capture['video']])
    filters = []
    for index in range(1 + len(segments)):
        filters.append(f'[{index}:v]fps=30,scale={width}:{height}:flags=lanczos,'
                       f'setsar=1,setpts=PTS-STARTPTS[v{index}]')
    inputs = ''.join(f'[v{index}]' for index in range(1 + len(segments)))
    filters.append(f'{inputs}concat=n={1 + len(segments)}:v=1:a=0[v]')
    cmd.extend(['-filter_complex', ';'.join(filters), '-map', '[v]', '-an',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25',
                '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)])
    subprocess.run(cmd, check=True)
    if target.stat().st_size > 50_000_000:
        raise RuntimeError(f'{target} exceeds 50 MB')
    print(target, target.stat().st_size)
