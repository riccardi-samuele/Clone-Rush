"""Render the approved silent cover zoom previews for portal upload."""

import hashlib
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUTPUT = ROOT / "artwork/publishing/promos"
OUTPUT.mkdir(parents=True, exist_ok=True)

FPS = 30
DURATION = 16
FRAMES = FPS * DURATION
manifest = []


def smoothstep(progress):
    return f"({progress})*({progress})*(3-2*({progress}))"

for name, width, height, initial_zoom, vertical_focus in (
    ("landscape", 1920, 1080, 1.16, 0.10),
    ("portrait", 1080, 1620, 1.20, 0.10),
):
    cover = ROOT / f"artwork/publishing/covers/exports/clone-rush-{name}.png"
    target = OUTPUT / f"clone-rush-zoom-{name}.mp4"
    # Open on the exact cover. A short smooth push-in leads into the approved
    # long zoom-out, with full-frame imagery and no cuts throughout.
    approach = smoothstep("max(0,min(1,(on-12)/36))")
    retreat = smoothstep(f"max(0,min(1,(on-48)/{FRAMES - 72}))")
    zoom = f"1+{initial_zoom - 1:.2f}*({approach})*(1-({retreat}))"
    filter_graph = (
        f"scale={width * 2}:{height * 2}:flags=lanczos,"
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
    frames = imageio_ffmpeg.read_frames(str(target), pix_fmt="rgb24")
    try:
        metadata = next(frames)
        first_frame = next(frames)
    finally:
        frames.close()
    reference = subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-i", str(cover),
         "-vf", f"scale={width}:{height}:flags=lanczos", "-frames:v", "1",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True,
    ).stdout
    mean_error = sum(abs(a - b) for a, b in zip(first_frame, reference)) / len(reference)
    probe = subprocess.run([FFMPEG, "-hide_banner", "-i", str(target)],
                           capture_output=True, text=True).stderr
    if (tuple(metadata["size"]) != (width, height)
            or abs(metadata["duration"] - DURATION) > .05
            or mean_error > 5 or "Audio:" in probe
            or target.stat().st_size > 50_000_000):
        raise RuntimeError(f"Invalid preview: {target}, {metadata}, cover error {mean_error}")
    manifest.append({
        "file": target.name, "width": width, "height": height,
        "durationSeconds": metadata["duration"], "fps": metadata["fps"],
        "audio": False, "bytes": target.stat().st_size,
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "coverSha256": hashlib.sha256(cover.read_bytes()).hexdigest(),
        "firstFrameMeanError": round(mean_error, 4),
    })
    print(target, target.stat().st_size)

(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
