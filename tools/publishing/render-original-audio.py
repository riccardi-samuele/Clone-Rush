"""Render Clone Rush audio from oscillators and seeded noise only; no source samples."""
import hashlib
import json
import math
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RATE = 44100
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
RNG = np.random.default_rng(20261012)


def envelope(length, attack=0.01, release=0.08):
    env = np.ones(length, dtype=np.float32)
    a = min(length, int(attack * RATE))
    r = min(length, int(release * RATE))
    if a: env[:a] *= np.linspace(0, 1, a, endpoint=False)
    if r: env[-r:] *= np.linspace(1, 0, r, endpoint=True)
    return env


def tone(freq, seconds, *, shape='bell', attack=0.004, release=0.08):
    n = int(seconds * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    if shape == 'bell':
        wave = np.sin(2*np.pi*freq*t) + .25*np.sin(2*np.pi*freq*2.01*t)*np.exp(-9*t)
    elif shape == 'soft':
        wave = np.sin(2*np.pi*freq*t) + .13*np.sin(2*np.pi*freq*2*t)
    elif shape == 'bass':
        wave = np.sin(2*np.pi*freq*t) + .12*np.sin(2*np.pi*freq*3*t)
    else:
        wave = np.sin(2*np.pi*freq*t)
    return (wave * envelope(n, attack, release)).astype(np.float32)


def glide(f0, f1, seconds, decay=8):
    n = int(seconds * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    phase = 2*np.pi*np.cumsum(f0+(f1-f0)*t/seconds)/RATE
    return (np.sin(phase)*np.exp(-decay*t)*envelope(n, .002, .04)).astype(np.float32)


def midi(note):
    return 440 * 2 ** ((note-69)/12)


def add(stereo, mono, at, volume=.3, pan=0):
    begin = int(at*RATE)
    if begin >= len(stereo): return
    mono = mono[:len(stereo)-begin]
    stereo[begin:begin+len(mono), 0] += mono*volume*math.sqrt((1-pan)/2)
    stereo[begin:begin+len(mono), 1] += mono*volume*math.sqrt((1+pan)/2)


def effect(sound_id):
    lengths = {27:.34, 28:.59, 29:.62, 30:.39, 34:.72}
    out = np.zeros((int(lengths[sound_id]*RATE), 2), dtype=np.float32)
    if sound_id == 27:  # jump: airy upward pop
        add(out, glide(290, 740, .29, 5), 0, .8)
        add(out, tone(1175, .13), .07, .18, .4)
    elif sound_id == 28:  # death: descending soft thud
        add(out, glide(510, 115, .53, 5), 0, .8)
        noise = RNG.normal(0, 1, int(.18*RATE)).astype(np.float32)
        kernel = np.ones(36, dtype=np.float32)/36
        add(out, np.convolve(noise, kernel, mode='same')*envelope(len(noise), .001, .16), 0, .22)
    elif sound_id == 29:  # exit: resolving chime
        for i, note in enumerate([76, 81, 88]): add(out, tone(midi(note), .38, release=.3), i*.095, .38, (i-1)*.45)
    elif sound_id == 30:  # bounce: rubbery spring
        add(out, glide(195, 860, .34, 4), 0, .72)
        add(out, tone(980, .15), .15, .2, -.25)
    elif sound_id == 34:  # key: two sparkling notes
        for i, note in enumerate([91, 96, 103]): add(out, tone(midi(note), .38, release=.32), i*.09, .35, (i-1)*.45)
    return out


def music():
    bpm = 116
    beat = 60/bpm
    bars = 16
    seconds = bars*4*beat
    out = np.zeros((round(seconds*RATE), 2), dtype=np.float32)
    # An original 16-bar melody over bright, common pop harmony.
    chords = [[60,64,67], [57,60,64], [62,65,69], [55,59,62]]
    melody = [
        [72,76,79,76,74,72,76,79], [81,79,76,72,69,72,76,79],
        [77,74,72,69,74,77,81,77], [74,71,67,71,74,79,76,74],
        [76,79,84,79,76,72,74,76], [81,84,79,76,72,69,72,76],
        [77,81,84,81,77,74,72,74], [79,83,86,83,79,74,71,67],
        [72,79,76,84,79,76,74,72], [76,81,84,79,76,72,69,72],
        [74,77,81,86,81,77,74,72], [71,74,79,83,79,74,71,67],
        [84,79,76,72,76,79,84,88], [81,76,72,69,72,76,81,84],
        [86,81,77,74,77,81,86,89], [83,79,74,71,74,79,83,86],
    ]
    for bar in range(bars):
        start = bar*4*beat
        chord = chords[bar%4]
        for k in range(4):
            add(out, tone(midi(chord[0]-24), beat*.72, shape='bass', release=.17), start+k*beat, .22)
            for j, note in enumerate(chord):
                add(out, tone(midi(note), beat*.52, shape='soft', release=.2), start+k*beat+.035, .055, (j-1)*.5)
        for k, note in enumerate(melody[bar]):
            add(out, tone(midi(note), beat*.41, release=.12), start+k*beat/2, .20, (-1 if k%2 else 1)*.22)
        for k in range(8):
            add(out, tone(midi(chord[k%3]+12), beat*.16, release=.04), start+k*beat/2, .04, -.55 if k%2 else .55)
    # Crossfade at loop boundary; first and last samples are zero.
    edge = int(.055*RATE)
    out[:edge] *= np.linspace(0,1,edge,endpoint=False)[:,None]
    out[-edge:] *= np.linspace(1,0,edge,endpoint=True)[:,None]
    return out


def encode(samples, path, codec, peak_target=.72):
    path.parent.mkdir(parents=True, exist_ok=True)
    samples = samples.astype('<f4')
    peak = float(np.max(np.abs(samples)))
    samples *= peak_target/max(peak, .001)
    args = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le',
            '-ar', str(RATE), '-ac', '2', '-i', 'pipe:0', '-c:a', codec]
    args += ['-q:a', '4'] if codec == 'libvorbis' else ['-b:a', '128k']
    subprocess.run(args + [str(path)], input=samples.tobytes(), check=True)
    return {'path': str(path.relative_to(ROOT/'public')), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'bytes': path.stat().st_size, 'format': path.suffix[1:]}


catalog_path = ROOT/'public/data/catalog.json'
catalog = json.loads(catalog_path.read_text())
names = {27:'Jump Sound', 28:'Death Sound', 29:'Exit Sound', 30:'Bounce Sound', 34:'Exit Key Sound', 52:'Main Theme'}
report = {'version':'original-v2', 'source':'Independent oscillator and seeded-noise synthesis; no imported audio or melodies',
          'renderer':'tools/publishing/render-original-audio.py', 'sampleRate':RATE, 'seed':20261012, 'assets':[]}
for sound_id, name in names.items():
    samples = music() if sound_id == 52 else effect(sound_id)
    stem = f'{"music" if sound_id==52 else "sfx"}-sound-{sound_id}-original-v2'
    outputs = [encode(samples.copy(), ROOT/'public/assets/media'/f'{stem}.{fmt}', codec,
                      .46 if sound_id in (27, 30) else .72)
               for fmt, codec in [('ogg','libvorbis'), ('mp3','libmp3lame')]]
    entry = next(x for x in catalog['audio'] if x['id'] == sound_id)
    entry['paths'] = [x['path'] for x in outputs]
    report['assets'].append({'id': sound_id, 'name': name, 'durationSeconds': len(samples)/RATE, 'outputs': outputs})
catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False)+'\n')
(ROOT/'artwork/audio-original-v2.json').write_text(json.dumps(report, indent=2)+'\n')
print('Rendered six independent audio events:', sum(x['bytes'] for a in report['assets'] for x in a['outputs']), 'bytes')
