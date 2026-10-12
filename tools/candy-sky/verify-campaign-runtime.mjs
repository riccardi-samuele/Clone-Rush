// Integration checks requested by the user: real scene updates, keyboard hub,
// portal animations, clocks, pause, restart, death and level transitions.
// Only expose scenes and advance tween clocks deterministically in this browser.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'docs/campaign/candy-sky-v2';
const solutions = JSON.parse(await readFile(`${root}/solutions.json`, 'utf8'));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { recordedAt: new Date().toISOString(), method: 'Unmodified production scene update and terminal logic, real keyboard events and input hub. Isolated browser storage. Full game/scene clocks advanced at 10ms, tween clock fixed to 10ms. No replacement of die/checkComplete/portal effects/transitions.', levels: [], errors: [] };
report.sourceHashes = Object.fromEntries(await Promise.all(['public/data/levels.json', 'src/game/ProgressStore.js', 'src/scenes/PlayScene.js', 'src/game/Clone.js', 'src/game/LevelWorld.js'].map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => report.errors.push(e.message));
  for (const [pattern, before, after] of [
    ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
    ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
  ]) await page.route(pattern, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(before, after) });
  });
  await page.goto('http://127.0.0.1:5175/');
  await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
  await page.evaluate(() => {
    window.__game = window.__lobby.scene.game;
    window.__game.loop.sleep();
    window.__clock = performance.now();
  });
  for (const candidate of [...solutions.levels, solutions.ending].filter(c => !process.env.CAMPAIGN_LEVEL || String(c.number) === process.env.CAMPAIGN_LEVEL)) {
    const result = await page.evaluate(candidate => {
      const game = window.__game, number = candidate.number, key = number ? 'Play' : 'Ending';
      const tick = (count = 1) => {
        for (let i = 0; i < count; i++) {
          for (const scene of game.scene.scenes) if (scene.tweens) scene.tweens.getDelta = () => 10;
          window.__clock += 10; game.headlessStep(window.__clock, 10);
        }
      };
      const press = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
      const release = () => { for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyR']) press(code, false); };
      const start = () => {
        release();
        for (const name of ['LevelTransition', 'Play', 'Ending', 'Menu', 'LevelSelect']) game.scene.stop(name);
        game.scene.start(key, { number }); tick(60);
        return window.__play;
      };
      let s = start();
      const ready = s.sys.isActive() && !s.transitioning && s.status === 'playing';
      tick(200);
      const spawn = s.world.clones.every(c => c.state === 'playing' && c.groundFrames <= 2 && Number.isFinite(c.body.position.y));
      const beforePause = s.world.clones.map(c => ({ ...c.body.position }));
      const exits = s.world.objects.filter(o => [5, 15].includes(o.type));
      const portalPresentationCorrect = exits.every(o => {
        const floor = s.world.floating.platforms.some(p => o.instance.x + 20 >= p.x && o.instance.x + 20 <= p.x + p.width && Math.abs(p.y - o.instance.y - 40) <= 1);
        return o.portalPresentation === (floor ? 'grounded' : 'floating')
          && o.sprite.texture.key === (floor ? 'gameplay-portals-sheet' : 'gameplay-floating-portals-sheet')
          && o.sprite.frame.name === (o.type === 15 ? 'unstable' : 'portal');
      });
      const portalCentersUnchanged = exits.every(o => Math.hypot(o.sprite.x - o.body.position.x, o.sprite.y - o.body.position.y) < .001);
      const portalAperturesCentered = exits.filter(o => o.portalPresentation === 'floating').every(o => {
        const sprite = o.sprite, frame = sprite.frame;
        window.__portalApertures ??= {};
        let aperture = window.__portalApertures[frame.name];
        if (!aperture) {
          const canvas = document.createElement('canvas'); canvas.width = frame.cutWidth; canvas.height = frame.cutHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const alpha = (x, y) => pixels[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3];
          let x = canvas.width / 2, y = canvas.height / 2;
          for (let i = 0; i < 3; i++) {
            let left = Math.floor(x), right = Math.floor(x);
            while (left > 0 && alpha(left, y) < 128) left--;
            while (right < canvas.width - 1 && alpha(right, y) < 128) right++;
            x = (left + right) / 2;
            let top = Math.floor(y), bottom = Math.floor(y);
            while (top > 0 && alpha(x, top) < 128) top--;
            while (bottom < canvas.height - 1 && alpha(x, bottom) < 128) bottom++;
            y = (top + bottom) / 2;
          }
          aperture = window.__portalApertures[frame.name] = { x, y, transparent: alpha(x, y) < 8 };
        }
        return aperture.transparent && Math.hypot((sprite.originX * frame.width - aperture.x) * sprite.scaleX,
          (sprite.originY * frame.height - aperture.y) * sprite.scaleY) <= .1;
      });
      const portalMarkersLockCorrect = s.world.effects.portals.every(p => !p.object.locked || (p.orbit ?? []).every(spark => spark.tintTopLeft === 0x808080 && spark.alpha <= .2));
      const beforeOrbit = s.world.effects.portals.flatMap(p => (p.orbit ?? []).map(s => ({ x: s.x, y: s.y })));
      const hazardClock = s.world.hazards.clock;
      s.hud.togglePause(); press('ArrowRight', true); press('ArrowUp', true); tick(100); release();
      const paused = s.status === 'paused' && s.world.hazards.clock === hazardClock && s.world.clones.every((c, i) => Math.hypot(c.body.position.x - beforePause[i].x, c.body.position.y - beforePause[i].y) < 1e-7);
      const portalOrbitPaused = s.world.effects.portals.flatMap(p => p.orbit ?? []).every((spark, i) => spark.x === beforeOrbit[i].x && spark.y === beforeOrbit[i].y);
      s.hud.togglePause();
      press('KeyR', true); tick(); press('KeyR', false); tick(120);
      const restarted = window.__play !== null && window.__play.number === number && window.__play.status === 'playing' && !window.__play.transitioning && !window.__play.leaving;
      s = window.__play;
      const oldWorld = s.world;
      s.matter.body.setPosition(s.world.clones[0].body, { x: 600, y: 200 }); tick(120);
      const deathRestarted = window.__play.world !== oldWorld && window.__play.number === number && window.__play.status === 'playing' && !window.__play.transitioning;
      s = start();
      const world = s.world, events = [];
      const collect = world.collectKey.bind(world);
      world.collectKey = k => { if (!k.collected) events.push({ event: 'key', id: k.instance.instance }); return collect(k); };
      let previousDirection = 0, usedTicks = 0;
      outer: for (const [direction, duration, jump] of candidate.actions) {
        if (direction !== previousDirection) {
          if (previousDirection) press(previousDirection > 0 ? 'ArrowRight' : 'ArrowLeft', false);
          if (direction) press(direction > 0 ? 'ArrowRight' : 'ArrowLeft', true);
          previousDirection = direction;
        }
        if (jump) { press('ArrowUp', true); press('ArrowUp', false); }
        for (let i = 0; i < duration; i++) {
          tick(); usedTicks++;
          if (s.status !== 'playing') break outer;
        }
      }
      tick(5); release();
      const completed = s.status === 'complete' && world.clones.every(c => c.state === 'exiting');
      const entryCount = world.effects.entries.length;
      const keyCount = world.objects.filter(o => o.type === 32 && o.collected).length;
      tick(300);
      const target = number === 0 ? game.scene.getScene('Menu') : window.__play;
      const targetCorrect = number === 0 ? target.scene.key === 'Menu' && target.sys.isActive()
        : target.scene.key === (number === s.progress.levelCount ? 'Ending' : 'Play') && (number === s.progress.levelCount || target.number === number + 1);
      const advanced = completed && targetCorrect && target.sys.isActive() && !target.transitioning && !target.leaving;
      const portalAnimationFinished = world.effects.entries.length === 0;
      const floatingPortalCount = world.effects.portals.filter(p => p.object.portalPresentation === 'floating').length;
      const floatingPortalMarkers = world.effects.portals.every(p => (p.orbit?.length ?? 0) === (p.object.portalPresentation === 'floating' ? 2 : 0));
      const portalMarkersClosed = world.effects.portals.every(p => p.object.type !== 15 || !p.object.used || (p.orbit ?? []).every(spark => !spark.visible));
      const portalMarkersUnlockCorrect = world.effects.portals.every(p => p.object.locked || (p.orbit ?? []).every(spark => spark.tintTopLeft === (p.object.type === 15 ? 0xf194ff : 0x5bdcff)));
      const saved = number === 0 || game.registry.get('progress').completed.has(number);
      let missedGravityJumpRestarted = null;
      let gravityIntroRecovered = null;
      if ([19, 20, 23].includes(number)) {
        s = start();
        const missedWorld = s.world;
        press('ArrowRight', true); tick(number === 23 ? 150 : 110); release(); tick(250);
        missedGravityJumpRestarted = window.__play.world !== missedWorld && window.__play.number === number && window.__play.status === 'playing' && !window.__play.transitioning;
      }
      if (number === 18) {
        s = start(); const recoveryWorld = s.world;
        press('ArrowRight', true); tick(110); release(); tick(250);
        const stayedSupported = s.world === recoveryWorld && s.status === 'playing' && s.world.clones[0].groundFrames <= 2;
        press('ArrowUp', true); press('ArrowUp', false); tick(100);
        const collectedOnRetry = s.world === recoveryWorld && s.world.objects.filter(o => o.type === 32).every(o => o.collected);
        press('ArrowRight', true); tick(120); release();
        gravityIntroRecovered = stayedSupported && collectedOnRetry && s.status === 'complete';
        tick(300);
      }
      return { number, ready, spawn, paused, restarted, deathRestarted, completed, entryCount, portalAnimationFinished, advanced, saved, missedGravityJumpRestarted, gravityIntroRecovered, portalPresentationCorrect, portalCentersUnchanged, portalAperturesCentered, floatingPortalCount, floatingPortalMarkers, portalOrbitPaused, portalMarkersClosed, portalMarkersLockCorrect, portalMarkersUnlockCorrect, keyCount, usedTicks, events };
    }, candidate);
    report.levels.push(result);
    console.log(JSON.stringify(result));
  }
} finally {
  await browser.close();
  await writeFile(`${root}/runtime-checks.json`, JSON.stringify(report, null, 2) + '\n');
}
assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
for (const result of report.levels) for (const key of ['ready', 'spawn', 'paused', 'restarted', 'deathRestarted', 'completed', 'portalAnimationFinished', 'advanced', 'saved', 'portalPresentationCorrect', 'portalCentersUnchanged', 'portalAperturesCentered', 'floatingPortalMarkers', 'portalOrbitPaused', 'portalMarkersClosed', 'portalMarkersLockCorrect', 'portalMarkersUnlockCorrect']) assert.equal(result[key], true, `Level ${result.number}: ${key}`);
for (const result of report.levels.filter(r => [19, 20, 23].includes(r.number))) assert.equal(result.missedGravityJumpRestarted, true, `Level ${result.number}: missed jump restart`);
if (report.levels.some(r => r.number === 18)) assert.equal(report.levels.find(r => r.number === 18).gravityIntroRecovered, true, 'Level 18: retry after missing the key');
