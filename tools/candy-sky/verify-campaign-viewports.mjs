import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = 'docs/campaign/candy-sky-v2';
const numbers = JSON.parse(await readFile('public/data/levels.json', 'utf8')).levels.map(l => l.number);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { method: 'Initial production scenes rendered on desktop and touch phone; complete art bounds checked against the world camera. Real touch events for movement and jump on level 18.', scenes: [], errors: [], touch: null };
try {
  for (const [format, viewport, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
    page.on('pageerror', e => report.errors.push({ format, message: e.message }));
    for (const [pattern, before, after] of [
      ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
      ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
    ]) await page.route(pattern, async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(before, after) }); });
    await page.goto('http://127.0.0.1:5175/');
    await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
    await page.evaluate(() => { window.__game = window.__lobby.scene.game; window.__game.loop.sleep(); window.__clock = performance.now(); });
    for (const number of [...numbers, 0]) {
      const result = await page.evaluate(number => {
        const game = window.__game;
        window.__tick = count => { for (let i = 0; i < count; i++) { for (const s of game.scene.scenes) if (s.tweens) s.tweens.getDelta = () => 10; window.__clock += 10; game.headlessStep(window.__clock, 10); } };
        for (const key of ['Menu', 'Play', 'Ending', 'LevelTransition']) game.scene.stop(key);
        game.scene.start(number ? 'Play' : 'Ending', { number }); window.__tick(60);
        game.step(window.__clock, 0);
        const s = window.__play, view = s.cameras.main.worldView;
        const visible = [];
        for (const child of s.children.list) if (child.visible && (child.depth === 0 || s.world.clones.some(c => c.sprite === child) || s.world.objects.some(o => o.sprite === child))) {
          if (!child.getBounds) continue;
          const b = child.getBounds();
          if (b.x < view.x - 1 || b.y < view.y - 1 || b.right > view.right + 1 || b.bottom > view.bottom + 1) visible.push({ texture: child.texture?.key, frame: child.frame?.name, bounds: { x: b.x, y: b.y, right: b.right, bottom: b.bottom } });
        }
        const hud = s.hud, camera = hud.camera;
        const inScreen = child => { const point = camera.matrix.transformPoint(child.x - camera.scrollX, child.y - camera.scrollY); return point.x >= 0 && point.x <= game.scale.width && point.y >= 0 && point.y <= game.scale.height; };
        return { number, clipped: visible, hudVisible: [hud.badge, hud.pauseBadge, hud.logo].every(inScreen), touchButtons: s.inputController.buttons.length, camera: { x: view.x, y: view.y, right: view.right, bottom: view.bottom } };
      }, number);
      report.scenes.push({ format, ...result });
      if ([18, 19, 23, 24, ...numbers.filter(n => n > 24)].includes(number)) await page.screenshot({ path: `${root}/screens/level-${number}-${format}-checked.png` });
    }
    if (mobile) {
      await page.evaluate(() => {
        window.__game.scene.stop('Ending'); window.__game.scene.start('Play', { number: 18 }); window.__tick(60); window.__game.step(window.__clock, 0);
      });
      const controls = await page.evaluate(() => {
        const s = window.__play;
        const camera = s.hud.camera;
        return { initial: { ...s.world.clones[0].body.position }, buttons: s.inputController.buttons.map(b => ({ action: b.action, ...camera.matrix.transformPoint(b.hit.x + b.hit.width / 2 - camera.scrollX, b.hit.y + b.hit.height / 2 - camera.scrollY) })) };
      });
      const cdp = await page.context().newCDPSession(page), right = controls.buttons.find(b => b.action === 'right'), up = controls.buttons.find(b => b.action === 'up');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x, y: right.y, id: 1 }] });
      await page.evaluate(() => { window.__tick(20); });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x, y: right.y, id: 1 }, { x: up.x, y: up.y, id: 2 }] });
      await page.evaluate(() => { window.__tick(3); });
      const after = await page.evaluate(() => ({ position: { ...window.__play.world.clones[0].body.position }, velocity: window.__play.world.clones[0].velocity(), actions: [...window.__play.inputController.touches.values()].map(t => t.action) }));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      report.touch = { moves: after.position.x > controls.initial.x + 20, jumpsDown: after.velocity.y > 200, ...after };
    }
    await page.close();
    console.log(JSON.stringify({ format, scenes: report.scenes.filter(s => s.format === format).length, clipped: report.scenes.filter(s => s.format === format && s.clipped.length).map(s => s.number), touch: report.touch }));
  }
} finally { await browser.close(); await writeFile(`${root}/viewport-checks.json`, JSON.stringify(report, null, 2) + '\n'); }
assert.equal(report.errors.length, 0);
for (const scene of report.scenes) { assert.equal(scene.clipped.length, 0, `${scene.format} level ${scene.number}: clipping`); assert.equal(scene.hudVisible, true); }
assert.equal(report.touch.moves, true, 'Touch movement'); assert.equal(report.touch.jumpsDown, true, 'Touch gravity jump');
