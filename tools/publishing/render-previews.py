"""Make muted CrazyGames previews from real Playwright gameplay video."""
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
report_path = ROOT/'release/crazygames/qa/video-report.json'
if not report_path.exists():
    report_path = ROOT/'release/crazygames/qa/report.json'
report = json.loads(report_path.read_text())
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
out = ROOT/'release/crazygames/previews'
out.mkdir(parents=True, exist_ok=True)
for name, width, height in [('landscape',1920,1080), ('portrait',1080,1620)]:
    capture = next(item for item in report['cases'] if item['name'] == name)
    cover = ROOT/f'artwork/publishing/covers/exports/clone-rush-{name}.png'
    target = out/f'clone-rush-{name}-preview.mp4'
    # Start a fraction after gameplay begins to avoid the tail of the level transition.
    start = capture['gameplayStartSeconds'] + .5
    filters = (f'[0:v]fps=30,scale={width}:{height}:flags=lanczos,setsar=1,setpts=PTS-STARTPTS[c];'
               f'[1:v]fps=30,scale={width}:{height}:flags=lanczos,setsar=1,setpts=PTS-STARTPTS[g];'
               '[c][g]concat=n=2:v=1:a=0[v]')
    cmd = [ffmpeg,'-hide_banner','-loglevel','error','-y',
           '-loop','1','-framerate','30','-t','1.5','-i',str(cover),
           '-ss',str(start),'-t','16','-i',capture['video'],
           '-filter_complex',filters,'-map','[v]','-an','-c:v','libx264',
           '-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(target)]
    subprocess.run(cmd,check=True)
    if target.stat().st_size > 50_000_000:
        raise RuntimeError(f'{target} exceeds 50 MB')
    print(target, target.stat().st_size)
