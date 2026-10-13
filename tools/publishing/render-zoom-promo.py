"""Render short, silent cover zoom-outs for off-platform promotion."""

import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUTPUT = ROOT / "artwork/publishing/promos"
OUTPUT.mkdir(parents=True, exist_ok=True)

FPS = 30
DURATION = 7
FRAMES = FPS * DURATION

for name, width, height, initial_zoom, vertical_focus in (
    ("landscape", 1920, 1080, 1.16, 0.10),
    ("portrait", 1080, 1620, 1.20, 0.10),
):
    cover = ROOT / f"artwork/publishing/covers/exports/clone-rush-{name}.png"
    target = OUTPUT / f"clone-rush-zoom-{name}.mp4"
    # A full-bleed camera zoom-out: no inset image, bars, or blurred backdrop.
    progress = f"max(0,min(1,(on-24)/{FRAMES - 48}))"
    eased = f"({progress})*({progress})*(3-2*({progress}))"
    zoom = f"1+{initial_zoom - 1:.2f}*(1-({eased}))"
    filter_graph = (
        f"scale={width}:{height}:flags=lanczos,"
        f"zoompan=z='{zoom}':x='(iw-iw/zoom)/2':"
        f"y='(ih-ih/zoom)*{vertical_focus}':"
        f"d=1:s={width}x{height}:fps={FPS},format=yuv420p"
    )
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y",
         "-loop", "1", "-framerate", str(FPS), "-i", str(cover),
         "-vf", filter_graph, "-frames:v", str(FRAMES), "-an",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
         "-movflags", "+faststart", str(target)],
        check=True,
    )
    poster = OUTPUT / f"clone-rush-zoom-{name}-poster.jpg"
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y",
         "-i", str(target), "-frames:v", "1", "-q:v", "3", str(poster)],
        check=True,
    )
    print(target, target.stat().st_size)
