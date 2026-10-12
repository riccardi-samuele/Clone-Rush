// Real Web Audio decode/playback and real mouse/touch gestures, isolated saves.
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = process.env.AUDIO_BASE_URL || 'http://127.0.0.1:5175/';
const catalog = JSON.parse(await readFile('public/data/catalog.json', 'utf8'));
const report = { recordedAt: new Date().toISOString(), baseURL,
  method: 'Chromium Web Audio, normal RAF, actual mouse/touch unlock and jump. Original production modules; only scene references exposed. Isolated saves with music 35%, effects 40%.',
  cases: [], errors: [], failures: [] };
const check = (value, message) => { if (!value) report.failures.push(message); };
await mkdir('docs/audio/screens', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const [name, width, height, touch] of [['desktop', 1280, 800, false], ['phone', 390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    page.on('pageerror', e => report.errors.push(`${name}: ${e.message}`));
    page.on('response', r => { if (r.status() >= 400) report.errors.push(`${name}: ${r.status()} ${r.url()}`); });
    await page.addInitScript(() => localStorage.setItem('clone-rush:v1', JSON.stringify({
      version: 1, campaignVersion: 2, current: 1, completed: [], unlockedThrough: 1, soundVolume: 40, musicVolume: 35,
    })));
    for (const [pattern, before, after] of [
      ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
      ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
      ['**/src/scenes/LevelSelectScene.js*', 'this.view = new RoyalLevelSelect(this);', 'this.view = new RoyalLevelSelect(this); window.__select=this;'],
    ]) await page.route(pattern, async route => {
      const response = await route.fetch(), body = await response.text();
      assert.ok(body.includes(before), `Instrumentation anchor missing: ${pattern}`);
      await route.fulfill({ response, body: body.replace(before, after) });
    });
    await page.goto(baseURL);
    await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
    await page.evaluate(() => {
      window.__audio = window.__lobby.scene.registry.get('audio');
      window.__point = (object, scene, camera = scene.cameras.main) => {
        const canvas = scene.game.canvas, rect = canvas.getBoundingClientRect();
        const p = camera.matrix.transformPoint(object.x - camera.scrollX, object.y - camera.scrollY);
        return { x: rect.left + p.x * rect.width / canvas.width, y: rect.top + p.y * rect.height / canvas.height };
      };
      window.__plays = [];
      const sound = window.__audio.sound, original = sound.play.bind(sound);
      sound.play = (key, config) => {
        const result = original(key, config);
        window.__plays.push({ key, volume: config?.volume, result });
        return result;
      };
    });
    const click = async point => touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
    await click(await page.evaluate(() => window.__point(window.__lobby.start, window.__lobby.scene)));
    await page.waitForFunction(() => window.__select?.view.ready(), null, { timeout: 15000 });
    await page.waitForFunction(() => window.__audio.sound.context.state === 'running' && window.__audio.started, null, { timeout: 10000 });
    const start = await page.evaluate(() => {
      const a = window.__audio; a.start(); a.start();
      return { locked: a.sound.locked, context: a.sound.context.state, playing: a.music.isPlaying,
        volume: a.music.volume, loop: a.music.loop, loops: a.sound.sounds.filter(s => s.key === 'audio-52').length,
        cache: a.catalog.map(item => { const b = window.__lobby.scene.game.cache.audio.get(item.key);
          return { key: item.key, duration: b.duration, channels: b.numberOfChannels, sampleRate: b.sampleRate }; }) };
    });
    check(!start.locked && start.playing && start.loop && Math.abs(start.volume - .35) < 1e-6 && start.loops === 1, `${name}: gesture unlock/single music loop/saved volume`);
    check(start.cache.length === 6 && start.cache.every(b => b.duration > .1 && b.channels === 2), `${name}: six real decoded Phaser buffers`);
    const decoded = await page.evaluate(async audio => {
      const context = new OfflineAudioContext(2, 44100, 44100), output = [];
      for (const asset of audio) for (const path of asset.paths) {
        const response = await fetch(`/${path}`);
        if (!response.ok) throw Error(`Missing audio ${path}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        let peak = 0, square = 0, seam = 0;
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const samples = buffer.getChannelData(c);
          for (const sample of samples) { if (!Number.isFinite(sample)) throw Error(`Non-finite audio ${path}`); peak = Math.max(peak, Math.abs(sample)); square += sample * sample; }
          seam = Math.max(seam, Math.abs(samples[0] - samples.at(-1)));
        }
        output.push({ id: asset.id, path, duration: buffer.duration, channels: buffer.numberOfChannels,
          sampleRate: buffer.sampleRate, peakDb: 20 * Math.log10(peak),
          rmsDb: 10 * Math.log10(square / (buffer.length * buffer.numberOfChannels)), seam });
      }
      return output;
    }, catalog.audio);
    for (const d of decoded) check(d.channels === 2 && d.sampleRate === 44100 && d.peakDb < -1 && d.rmsDb > -33 && d.rmsDb < -12 && (d.id !== 52 || d.seam < .008), `${name}: decoded quality ${d.path}`);
    const playback = await page.evaluate(async () => {
      const a = window.__audio;
      const waitGain = async target => {
        const deadline = performance.now() + 3000;
        // AudioParam values update on the audio thread; use actual settled gain.
        while (Math.abs(a.music.volume - target) > 1e-6) {
          if (performance.now() > deadline) throw Error(`Music gain did not reach ${target}`);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      };
      const before = window.__plays.length;
      a.progress.musicVolume = 0; a.updateVolume();
      await waitGain(0);
      const mutedMusic = a.music.volume;
      // Mute before this sound has ever played: the 50ms dedup cannot mask a bug.
      a.progress.soundVolume = 0; a.play('Death Sound');
      const mutedEffects = window.__plays.length === before;
      a.progress.musicVolume = 35; a.progress.soundVolume = 40; a.updateVolume();
      await waitGain(.35);
      for (const item of a.catalog.filter(s => s.id !== 52)) a.play(item.name);
      const plays = window.__plays.slice(before);
      window.__looped = 0; a.music.on('looped', () => window.__looped++);
      a.music.setSeek(a.music.duration - .1);
      return { plays, mutedMusic, mutedEffects, restoredMusic: a.music.volume, restoredEffects: a.progress.soundVolume };
    });
    check(playback.plays.length === 5 && playback.plays.every(p => p.result === true && p.volume === .4), `${name}: five effects play with saved volume`);
    check(playback.mutedMusic === 0 && playback.mutedEffects && Math.abs(playback.restoredMusic - .35) < 1e-6 && playback.restoredEffects === 40, `${name}: independent mute/restore`);
    await page.waitForFunction(() => window.__looped > 0, null, { timeout: 5000 });
    const loop = await page.evaluate(() => ({ count: window.__looped, playing: window.__audio.music.isPlaying, seek: window.__audio.music.seek }));
    check(loop.playing && loop.count === 1 && loop.seek < 5, `${name}: actual end-to-start music playback`);
    await click(await page.evaluate(() => window.__point(window.__select.view.tiles[0].image, window.__select)));
    await page.waitForFunction(() => window.__play?.number === 1 && !window.__play.transitioning, null, { timeout: 15000 });
    await page.waitForFunction(() => window.__play.world.clones.some(c => c.groundFrames <= 2), null, { timeout: 5000 });
    await page.evaluate(() => { window.__plays.length = 0; });
    if (touch) await click(await page.evaluate(() => {
      const s = window.__play, b = s.inputController.buttons.find(b => b.action === 'up');
      return window.__point({ x: b.hit.x + b.hit.width / 2, y: b.hit.y + b.hit.height / 2 }, s, s.hud.camera);
    }));
    else { await page.keyboard.down('ArrowUp'); await page.keyboard.up('ArrowUp'); }
    await page.waitForFunction(() => window.__plays.some(p => p.key === 'audio-27' && p.result), null, { timeout: 5000 });
    const jump = await page.evaluate(() => ({ plays: window.__plays.slice(), saved: JSON.parse(localStorage.getItem('clone-rush:v1')) }));
    check(jump.saved.soundVolume === 40 && jump.saved.musicVolume === 35, `${name}: player volume save unchanged`);
    await page.screenshot({ path: `docs/audio/screens/game-${name}.png` });
    report.cases.push({ name, start, decoded, playback, loop, jump });
    console.log(JSON.stringify({ name, formatsDecoded: decoded.length, effectsPlayed: playback.plays.length, loop, failures: report.failures }));
    await page.close();
  }
} catch (error) { report.failures.push(error.stack); throw error; }
finally { await browser.close(); await writeFile('docs/audio/checks.json', JSON.stringify(report, null, 2) + '\n'); }
assert.deepEqual(report.errors, []);
assert.deepEqual(report.failures, []);
