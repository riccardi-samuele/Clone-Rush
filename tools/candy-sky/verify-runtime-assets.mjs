// Exercise every production scene and check the actual requests after cleanup.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ART_IMAGES } from '../../src/game/AssetManifest.js';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const requests = new Set(), errors = [], failed = [];
let releaseCatalog;
const report = { checkedAt: new Date().toISOString(), scenes: [], loading: {} };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {
    const path = new URL(r.url()).pathname.slice(1);
    if (/^(assets|data)\//.test(path)) requests.add(path);
  });
  page.on('response', r => { if (r.status() >= 400) failed.push([r.status(),r.url()]); });
  for (const [pattern, before, after] of [
    ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
    ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
  ]) await page.route(pattern, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(before,after) });
  });
  const gate = new Promise(resolve => { releaseCatalog = resolve; });
  await page.route('**/data/catalog.json', async route => { await gate; await route.continue(); });
  const navigation = page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded' });
  navigation.catch(() => {});
  await page.locator('#loading-screen').waitFor({ state: 'visible' });
  report.loading.animations = await page.locator('#loading-screen').evaluate(element => element.getAnimations({ subtree: true }).length);
  assert.equal(report.loading.animations, 0, 'Loading must remain static');
  await page.evaluate(() => {
    window.__loadingValues = [];
    const element = document.querySelector('[role="progressbar"]');
    const record = () => window.__loadingValues.push(Number(element.getAttribute('aria-valuenow')));
    record(); new MutationObserver(record).observe(element, { attributes: true, attributeFilter: ['aria-valuenow'] });
  });
  releaseCatalog();
  await navigation;
  console.log('Checking initial loading');
  await page.waitForFunction(() => window.__lobby?.ready() && !document.querySelector('#loading-screen'), null, { timeout: 90000 });
  report.loading.values = await page.evaluate(() => window.__loadingValues);
  assert.equal(report.loading.values.at(-1), 100);
  assert.ok(report.loading.values.every((v,i,a) => i === 0 || v >= a[i-1]));
  console.log('Checking production textures');
  const runtime = await page.evaluate(() => {
    const game = window.__lobby.scene.game;
    game.loop.sleep(); let clock = performance.now();
    const texturesUsed = new Set();
    const collect = scene => {
      for (const object of scene.children.list) if (object.texture) texturesUsed.add(object.texture.key);
    };
    const tick = count => {
      for (let i=0;i<count;i++) {
        for (const scene of game.scene.scenes) if (scene.tweens) scene.tweens.getDelta = () => 10;
        clock += 10; game.headlessStep(clock,10);
      }
    };
    collect(window.__lobby.scene);
    game.scene.start('LevelSelect'); tick(70); collect(game.scene.getScene('LevelSelect'));
    const scenes = ['Menu','LevelSelect'];
    for (const number of [...game.registry.get('levels').levels.map(l=>l.number),0]) {
      for (const key of ['Menu','LevelSelect','Play','Ending','LevelTransition']) game.scene.stop(key);
      const key = number ? 'Play' : 'Ending'; game.scene.start(key,{number}); tick(70);
      const scene = window.__play;
      if (!scene.sys.isActive() || scene.number !== number) throw Error(`Scene ${number} missing`);
      for (const clone of scene.world.clones) scene.world.emitDeath(clone);
      scene.hud.togglePause(); collect(scene); scene.hud.togglePause();
      scenes.push(number ? `Level ${number}` : 'Ending');
    }
    return { scenes, texturesUsed: [...texturesUsed].sort(), registered: game.textures.getTextureKeys().sort() };
  });
  report.scenes = runtime.scenes;
  report.registeredTextures = runtime.registered;
  report.drawnTextures = runtime.texturesUsed;
  for (const path of Object.values(ART_IMAGES)) assert.ok(requests.has(path), `Image not loaded: ${path}`);
  assert.deepEqual([...requests].filter(p => /media\/(?:1x|1\.5x|default)|assets\/images|roots\.png/.test(p)), []);
  assert.deepEqual(runtime.registered.filter(k => /^sprite-|^font-|^tiles-/.test(k)), []);
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  // Fail all automatic loader retries, then restore the network for the UI retry.
  console.log('Checking loading retry');
  const retry = await browser.newPage(); let rejectFirst = true;
  await retry.route('**/data/catalog.json', route => {
    if (rejectFirst) return route.abort('failed');
    return route.continue();
  });
  await retry.goto('http://127.0.0.1:5175/', { waitUntil:'domcontentloaded' });
  await retry.locator('#loading-retry').waitFor({ state:'visible', timeout:90000 });
  rejectFirst = false;
  await retry.locator('#loading-retry').click();
  await retry.locator('#loading-screen').waitFor({ state:'detached', timeout:90000 });
  report.loading.retry = true;
} finally {
  releaseCatalog?.();
  await browser.close();
  report.requests = [...requests].sort(); report.errors = errors; report.failedResponses = failed;
  report.publicRequests = requests.size;
  await writeFile('docs/cleanup/runtime-checks.json', JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({ scenes:report.scenes.length,publicRequests:requests.size,loading:report.loading,errors }));
