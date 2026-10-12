import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { AudioManager } from '../../src/game/AudioManager.js';
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const names = new Map([[27,'Jump Sound'],[28,'Death Sound'],[29,'Exit Sound'],[30,'Bounce Sound'],[34,'Exit Key Sound'],[52,'Main Theme']]);
test('all six sound events use the Candy Sky remix, with both browser formats', async () => {
  const catalog = await json('public/data/catalog.json');
  const remix = await json('artwork/audio-remix.json');
  assert.equal(await hash('tools/candy-sky/remix-audio.py'), remix.rendererSha256);
  assert.deepEqual(remix.assets.map(a => a.id).sort((a,b) => a-b), [...names.keys()]);
  assert.equal(catalog.audio.length, 6);
  for (const asset of remix.assets) {
    const entry = catalog.audio.find(a => a.id === asset.id);
    assert.equal(entry.name, names.get(asset.id)); assert.equal(entry.key, `audio-${asset.id}`);
    assert.deepEqual(new Set(asset.outputs.map(o => o.format)), new Set(['ogg','mp3']));
    assert.deepEqual(new Set(entry.paths), new Set(asset.outputs.map(o => o.path)));
    assert.equal(await hash(asset.source.path), asset.source.sha256);
    for (const output of asset.outputs) {
      assert.match(output.path, /-candy-v1\.(ogg|mp3)$/);
      assert.equal(await hash(`public/${output.path}`), output.sha256);
      assert.notEqual(output.sha256, asset.source.sha256);
    }
  }
});
test('decoded mixes have headroom, stereo output, short effects and matching encodings', async () => {
  const { assets } = await json('artwork/audio-remix.json');
  for (const asset of assets) {
    const [a,b] = asset.outputs;
    assert.ok(Math.abs(a.duration-b.duration) < .04, `Encoding lengths: ${asset.name}`);
    for (const output of asset.outputs) {
      assert.equal(output.sampleRate, 44100); assert.equal(output.channels, 2);
      assert.ok(output.peakDb < -1, `Clipping risk: ${asset.name}`);
      assert.ok(output.rmsDb > -33 && output.rmsDb < -12, `Audible mix: ${asset.name}`);
      if (asset.id !== 52) assert.ok(output.duration >= .12 && output.duration <= 1.2);
      else { assert.ok(output.duration > 30); assert.ok(output.loopBoundaryJump < .008, 'Music boundary click'); }
    }
  }
});
function rig({ locked=false, soundVolume=100, musicVolume=100 }={}) {
  const sound = new EventEmitter(), events = new EventEmitter();
  sound.locked=locked; sound.adds=[]; sound.plays=[];
  sound.add = (key, config) => {
    const music={ key, ...config, playing:false, play(){this.playing=true;}, setVolume(v){this.volume=v;}, destroy(){this.destroyed=true;} };
    sound.adds.push(music); return music;
  };
  sound.play=(key, config) => sound.plays.push({key,...config});
  const progress={soundVolume,musicVolume};
  const catalog={audio:[...names].map(([id,name])=>({id,name,key:`audio-${id}`}))};
  return {sound,events,progress,manager:new AudioManager({sound,events},catalog,progress)};
}
test('audio unlock starts one music loop and preserves saved volume', () => {
  const r=rig({locked:true,musicVolume:35});r.manager.start();assert.equal(r.sound.adds.length,0);
  r.sound.locked=false;r.sound.emit('unlocked');r.manager.start();
  assert.equal(r.sound.adds.length,1);assert.equal(r.manager.music.volume,.35);
  assert.equal(r.manager.music.loop,true);assert.equal(r.manager.music.playing,true);
  r.events.emit('destroy');assert.equal(r.manager.music.destroyed,true);
});
test('music and effects can be muted independently and restored', () => {
  const r=rig();r.manager.start();r.progress.musicVolume=0;r.manager.updateVolume();
  assert.equal(r.manager.music.volume,0);r.progress.soundVolume=0;r.manager.play('Jump Sound');
  assert.equal(r.sound.plays.length,0);r.progress.soundVolume=40;r.manager.play('Jump Sound');
  assert.deepEqual(r.sound.plays,[{key:'audio-27',volume:.4}]);
  r.progress.musicVolume=60;r.manager.updateVolume();assert.equal(r.manager.music.volume,.6);
});
test('simultaneous clone effects are deduplicated without swallowing different events', () => {
  const r=rig();r.manager.play('Jump Sound');r.manager.play('Jump Sound');r.manager.play('Exit Key Sound');
  assert.deepEqual(r.sound.plays.map(p=>p.key),['audio-27','audio-34']);
});
