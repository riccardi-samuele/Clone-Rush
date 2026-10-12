#!/usr/bin/env python3
"""Deterministic Candy Sky remixes. Requires NumPy and FFmpeg (or imageio-ffmpeg)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 44100
SEED = 20261012
IDS = {27: 'Jump Sound', 28: 'Death Sound', 29: 'Exit Sound', 30: 'Bounce Sound', 34: 'Exit Key Sound', 52: 'Main Theme'}

def codec():
    executable = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if not executable:
        try:
            import imageio_ffmpeg
            executable = imageio_ffmpeg.get_ffmpeg_exe()
        except ImportError:
            raise SystemExit('Install FFmpeg, set FFMPEG_BINARY, or install imageio-ffmpeg.')
    return executable

FF = codec()

def decode(path, filters=None):
    args = [FF, '-v', 'error', '-i', str(path)]
    if filters:
        args += ['-af', filters]
    args += ['-ar', str(SR), '-ac', '2', '-f', 'f32le', '-']
    data = subprocess.run(args, check=True, capture_output=True).stdout
    return np.frombuffer(data, dtype='<f4').reshape(-1, 2).astype(np.float64)

def db(value):
    return float(20 * np.log10(max(float(value), 1e-12)))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def stats(x):
    return {'sampleRate': SR, 'channels': 2, 'duration': len(x) / SR,
            'peakDb': db(np.max(np.abs(x))), 'rmsDb': db(np.sqrt(np.mean(x*x))),
            'loopBoundaryJump': float(np.max(np.abs(x[-1] - x[0])))}

def fades(x, attack=.003, release=.035):
    x = x.copy()
    a, b = min(int(attack * SR), len(x)//2), min(int(release * SR), len(x)//2)
    if a:
        x[:a] *= np.sin(np.linspace(0, np.pi/2, a))[:, None]**2
    if b:
        x[-b:] *= np.cos(np.linspace(0, np.pi/2, b))[:, None]**2
    return x

def stereo(mono, pan=0):
    return mono[:, None] * np.array([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)])

def note(frequency, duration, amplitude=1, pan=0, kind='bell'):
    t = np.arange(round(duration * SR)) / SR
    if kind == 'bell':
        y = np.sin(2*np.pi*frequency*t) * np.exp(-t/ .23)
        y += .30*np.sin(2*np.pi*frequency*2.001*t)*np.exp(-t/.10)
        y += .09*np.sin(2*np.pi*frequency*3.997*t)*np.exp(-t/.045)
    elif kind == 'wood':
        y = (np.sin(2*np.pi*frequency*t)+.22*np.sin(2*np.pi*frequency*2.01*t))*np.exp(-t/.105)
    else:
        y = (np.sin(2*np.pi*frequency*t)+.16*np.sin(2*np.pi*frequency*2*t))*np.exp(-t/.26)
    return fades(stereo(y*amplitude, pan), .004, .04)

def add(buffer, sample, time, wrap=False):
    start = int(round(time*SR))
    if wrap:
        start %= len(buffer)
        first = min(len(sample), len(buffer)-start)
        buffer[start:start+first] += sample[:first]
        if first < len(sample): buffer[:len(sample)-first] += sample[first:]
    elif 0 <= start < len(buffer):
        count = min(len(sample), len(buffer)-start)
        buffer[start:start+count] += sample[:count]

def sweep(start, end, duration, amplitude=1, pan=0, decay=.10):
    t = np.arange(round(duration*SR))/SR
    f = start+(end-start)*(1-np.exp(-t/max(.01,duration*.24)))
    phase = 2*np.pi*np.cumsum(f)/SR
    y = (np.sin(phase)+.13*np.sin(phase*2))*np.exp(-t/decay)
    return fades(stereo(amplitude*y,pan), .002, .025)

def colored_noise(duration, low, high, rng):
    count = round(duration*SR)
    y = rng.normal(size=count)
    bins = np.fft.rfftfreq(count,1/SR)
    weight = (1-np.exp(-(bins/max(low,1))**4))*np.exp(-(bins/high)**4)
    y = np.fft.irfft(np.fft.rfft(y)*weight, n=count)
    return y/max(np.max(abs(y)),1e-9)

def echo(x, delays, circular=False):
    out = x.copy()
    for delay, gain in delays:
        offset = round(delay*SR)
        if circular:
            out += np.roll(x[:, ::-1], offset, axis=0)*gain
        elif offset < len(x):
            out[offset:] += x[:-offset, ::-1]*gain
    return out

def master(x, peak_db, rms_db=None):
    if rms_db is not None:
        x = x * (10**(rms_db/20)/max(np.sqrt(np.mean(x*x)),1e-9))
        # Smooth saturation restrains rare transients without a hard clipped edge.
        ceiling = 10**(peak_db/20)
        x = ceiling*np.tanh(x/ceiling)
    peak = max(np.max(abs(x)),1e-9)
    return x * (10**(peak_db/20)/peak)

def effect(sound_id, original):
    rng = np.random.default_rng(SEED+sound_id)
    durations = {27:.32, 30:.43, 34:.69, 29:.95, 28:.56}
    out = np.zeros((round(durations[sound_id]*SR),2))
    # A quiet trace of the source preserves the action's identity under new layers.
    dry = original / max(np.max(abs(original)),1e-9)
    add(out, dry*.13, 0)
    if sound_id == 27:
        add(out,sweep(280,900,.18,.68,decay=.065),0)
        add(out,note(1046.50,.22,.13,.2,'wood'),.028)
    elif sound_id == 30:
        add(out,sweep(145,620,.25,.72,decay=.11),0)
        add(out,sweep(770,520,.22,.21,.2,decay=.07),.065)
        add(out,note(1174.66,.24,.14,-.15,'wood'),.11)
    elif sound_id == 34:
        for time,f,pan in [(0,783.991,-.35),(.055,987.767,0),(.11,1174.659,.35)]:
            add(out,note(f,.5,.38,pan),time)
    elif sound_id == 29:
        t = np.arange(len(out))/SR
        air = colored_noise(len(out)/SR,500,4800,rng)
        out += stereo(air*np.sin(np.pi*np.minimum(t/.6,1))**2*np.exp(-t/.28)*.15)
        for time,f,pan in [(0,391.995,-.25),(.07,587.33,.25),(.14,783.991,-.35),(.22,1174.659,.35)]:
            add(out,note(f,.65,.29,pan),time)
    else:
        add(out,sweep(470,120,.27,.65,decay=.09),0)
        add(out,note(196,.35,.17,0,'wood'),.035)
        t = np.arange(len(out))/SR
        out += stereo(colored_noise(len(out)/SR,180,1900,rng)*np.exp(-t/.06)*.09)
    out = echo(out,[(.045,.12),(.087,.065),(.139,.035)])
    return master(fades(out,.002,.07), {27:-11,30:-10,34:-12,29:-12,28:-12}[sound_id])

def dominant_note(sample, low, high):
    y = sample.mean(axis=1)
    size = 16384
    y = y[:size]
    if np.sqrt(np.mean(y*y)) < 1e-5: return None
    spectrum = abs(np.fft.rfft(y*np.hanning(len(y)),n=size))
    frequencies = np.fft.rfftfreq(size,1/SR)
    candidates = np.flatnonzero((frequencies>=low)&(frequencies<=high))
    peak = candidates[np.argmax(spectrum[candidates])]
    midi = round(69+12*np.log2(frequencies[peak]/440))
    return 440*2**((midi-69)/12)

def music(original, softened):
    # Original loop is 384 beats at 140 BPM (164.571428s). Preserve its tune.
    beat = 60/140
    count = len(softened)
    out = softened*.80
    rng = np.random.default_rng(SEED+52)
    for i in range(int(count/SR/beat)):
        start = round(i*beat*SR)
        sample = original[start:min(start+16384,count)]
        if len(sample) < 1024: continue
        if i % 2 == 0:
            frequency = dominant_note(sample,260,1250)
            if frequency:
                while frequency < 620: frequency *= 2
                while frequency > 1500: frequency /= 2
                add(out,note(frequency,.8,.016,(-.32 if i%4==0 else .32)),i*beat,True)
        if i%4 in (0,2):
            bass = dominant_note(sample,65,220)
            if bass: add(out,note(bass,.40,.008,0,'bass'),i*beat,True)
        if i%2 == 1:
            t = np.arange(round(.065*SR))/SR
            shaker = colored_noise(.065,4200,7800,rng)*np.exp(-t/.017)*.007
            add(out,fades(stereo(shaker,.3 if i%4==1 else -.3),.003,.02),(i+.5)*beat,True)
    out = echo(out,[(beat*.75,.055),(beat*1.5,.035)],True)
    out = master(out,-8.5,-24.5)
    # Overlap a tiny seam, then remove the overlapped head. Last and first
    # samples follow consecutive source positions; no appended silent padding.
    seam = round(.018*SR)
    weight = np.sin(np.linspace(0,np.pi/2,seam))[:,None]**2
    out[-seam:] = out[-seam:]*(1-weight)+out[:seam]*weight
    return out[seam:]

def encode(x, path, fmt):
    options = ['-c:a','libvorbis','-q:a','3'] if fmt=='ogg' else ['-c:a','libmp3lame','-b:a','96k','-write_xing','1']
    subprocess.run([FF,'-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0',
                    '-map_metadata','-1','-fflags','+bitexact','-flags:a','+bitexact',*options,str(path)], input=x.astype('<f4').tobytes(),check=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'public/assets/media')
    parser.add_argument('--manifest',type=Path,default=ROOT/'artwork/audio-remix.json')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    report={'version':'candy-v1','renderer':'Deterministic NumPy synthesis and source remix, offline FFmpeg encoding',
            'seed':SEED,'sampleRate':SR,'numpyVersion':np.__version__,'rendererSha256':digest(Path(__file__)),'sourceCredit':'Jumping Clones by Robert Alvarez (rob1221)',
            'ffmpegVersion':subprocess.run([FF,'-version'],capture_output=True,text=True,check=True).stdout.splitlines()[0],
            'music':{'bpm':140,'originalBeats':384,'seamOverlapSeconds':.018,'description':'Original tune with softened harmonics, quiet bell/wood accents, warm bass and airy stereo taps'},'assets':[]}
    for sound_id,name in IDS.items():
        stem=f'{"music" if sound_id==52 else "sfx"}-sound-{sound_id}'
        source=ROOT/'artwork/audio-source'/f'{stem}.ogg'
        original=decode(source)
        softened=decode(source,'highpass=f=45,lowpass=f=4400') if sound_id==52 else decode(source,'highpass=f=100,lowpass=f=2700')
        mixed=music(original,softened) if sound_id==52 else effect(sound_id,softened)
        item={'id':sound_id,'name':name,'source':{'path':str(source.relative_to(ROOT)),'sha256':digest(source),**stats(original)},'master':stats(mixed),'outputs':[]}
        for fmt in ['ogg','mp3']:
            target=args.output/f'{stem}-candy-v1.{fmt}';encode(mixed,target,fmt);decoded=decode(target)
            item['outputs'].append({'format':fmt,'path':f'assets/media/{target.name}','sha256':digest(target),'bytes':target.stat().st_size,**stats(decoded)})
        report['assets'].append(item)
        print(json.dumps({'id':sound_id,'name':name,'master':item['master'],'outputs':item['outputs']}),flush=True)
    args.manifest.parent.mkdir(parents=True,exist_ok=True);args.manifest.write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
