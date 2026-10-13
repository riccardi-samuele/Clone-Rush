// Actual browser touch events and production scenes/physics at a fixed 10ms.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = process.env.MOBILE_BASE_URL || 'http://127.0.0.1:5175/';
const root = 'docs/mobile';
await mkdir(`${root}/screens`, { recursive: true });
const report = { recordedAt: new Date().toISOString(), baseURL,
  method: 'Chromium phone emulation, actual single/multi-touch events, production scenes and physics at fixed 10ms. Isolated fresh saves; only scene references exposed.', cases: [], errors: [], failures: [] };
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const check = (condition, message) => { if (!condition) report.failures.push(message); };
try {
  for (const [name, width, height, dpr] of [['portrait', 390, 844, 2], ['landscape', 844, 390, 2], ['small', 320, 568, 3], ['small-landscape', 568, 320, 2], ['compact', 320, 460, 2]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
    page.on('pageerror', e => report.errors.push({ name, error: e.message }));
    for (const [pattern, before, after] of [
      ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
      ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
      ['**/src/scenes/LevelSelectScene.js*', 'this.view = new RoyalLevelSelect(this);', 'this.view = new RoyalLevelSelect(this); window.__select=this;'],
    ]) await page.route(pattern, async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(before, after) }); });
    await page.goto(baseURL);
    await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
    // Include notch/home-indicator space before measuring every menu.
    await page.evaluate(() => { for (const [k, v] of Object.entries({ top: 20, right: 12, bottom: 22, left: 12 })) document.documentElement.style.setProperty(`--safe-${k}`, `${v}px`); });
    await page.waitForFunction(() => window.__lobby.scene.game.canvas.getBoundingClientRect().width === innerWidth - 24);
    await page.evaluate(() => {
      window.__game = window.__lobby.scene.game; window.__game.loop.sleep(); window.__clock = performance.now();
      window.__tick = count => { for (let i = 0; i < count; i++) {
        for (const s of window.__game.scene.scenes) if (s.tweens) s.tweens.getDelta = () => 10;
        window.__clock += 10; window.__game.headlessStep(window.__clock, 10);
      } window.__game.step(window.__clock, 0); };
      window.__point = (object, scene, camera = scene.cameras.main) => {
        const canvas = window.__game.canvas, rect = canvas.getBoundingClientRect();
        const p = camera.matrix.transformPoint(object.x - camera.scrollX, object.y - camera.scrollY);
        return { x: rect.left + p.x * rect.width / canvas.width, y: rect.top + p.y * rect.height / canvas.height };
      };
      window.__target = (object, camera) => {
        const cssScale = camera.zoom * window.__game.canvas.getBoundingClientRect().width / window.__game.canvas.width;
        return { width: object.input.hitArea.width * Math.abs(object.scaleX) * cssScale,
          height: object.input.hitArea.height * Math.abs(object.scaleY) * cssScale };
      };
    });
    const tick = async count => page.evaluate(count => window.__tick(count), count);
    const tap = async point => { await page.touchscreen.tap(point.x, point.y); await tick(130); };
    const sliders = await page.evaluate(() => window.__lobby.sliders.map(item => {
      const p = window.__point(item.hit, window.__lobby.scene), t = window.__target(item.hit, window.__lobby.scene.cameras.main);
      return { ...t, top: p.y - t.height / 2, bottom: p.y + t.height / 2 };
    }));
    sliders.forEach(t => check(Math.min(t.width, t.height) >= 43.9 && t.top >= 20 && t.bottom <= height - 22, `${name}: slider target clipped ${JSON.stringify(t)}`));
    await page.screenshot({ path: `${root}/screens/lobby-${name}.png` });
    await tap(await page.evaluate(() => window.__point(window.__lobby.start, window.__lobby.scene)));
    check(await page.evaluate(() => window.__select?.view.ready()), `${name}: touch Play opens selection`);
    const tiles = await page.evaluate(() => window.__select.view.tiles.filter(t => t.unlocked).map(t => window.__target(t.image, window.__select.cameras.main)));
    // Locked tiles aren't interactive; check the first unlocked tile only.
    const firstTarget = tiles[0];
    check(Math.min(firstTarget.width, firstTarget.height) >= 43.9, `${name}: selector target ${JSON.stringify(firstTarget)}`);
    await page.screenshot({ path: `${root}/screens/levels-${name}.png` });
    await tap(await page.evaluate(() => window.__point(window.__select.view.tiles[0].image, window.__select)));
    check(await page.evaluate(() => window.__play?.number === 1 && !window.__play.transitioning), `${name}: touch enters level 1`);
    const getControls = async () => page.evaluate(() => {
      const s = window.__play;
      return Object.fromEntries(s.inputController.buttons.map(b => [b.action, {
        ...window.__point({ x: b.hit.x + b.hit.width / 2, y: b.hit.y + b.hit.height / 2 }, s, s.hud.camera),
        target: window.__target(b.hit, s.hud.camera) }]));
    });
    let controls = await getControls();
    for (const [action, p] of Object.entries(controls)) {
      check(Math.min(p.target.width, p.target.height) >= 71.9, `${name}: ${action} target`);
      check(p.x - p.target.width / 2 >= 0 && p.x + p.target.width / 2 <= width
        && p.y - p.target.height / 2 >= 0 && p.y + p.target.height / 2 <= height,
      `${name}: ${action} stays inside the available screen`);
    }
    const horizontalControls = Object.values(controls).sort((a, b) => a.x - b.x);
    for (let i = 1; i < horizontalControls.length; i++) {
      const left = horizontalControls[i - 1], right = horizontalControls[i];
      check(right.x - right.target.width / 2 - (left.x + left.target.width / 2) >= 11.9,
        `${name}: movement targets have at least 12 CSS pixels between them`);
    }
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type, actions) => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: actions.map((a, i) => ({ x: controls[a].x, y: controls[a].y, id: i + 1 })) });
      // Flush the browser's DOM input queue before deterministic physics ticks.
      // The game loop remains asleep; RAF here does not advance the world.
      await page.evaluate(() => new Promise(requestAnimationFrame));
    };
    const initialX = await page.evaluate(() => window.__play.world.clones[0].body.position.x);
    await touch('touchStart', ['right']); await tick(15);
    await touch('touchStart', ['right', 'up']); await tick(3);
    const moved = await page.evaluate(() => ({ x: window.__play.world.clones[0].body.position.x,
      vy: window.__play.world.clones[0].velocity().y, actions: [...window.__play.inputController.touches.values()].map(t => t.action) }));
    check(moved.x > initialX + 10 && moved.vy < -200 && moved.actions.includes('right') && moved.actions.includes('up'), `${name}: simultaneous move and jump`);
    await touch('touchCancel', []); await tick(60);
    const cancelled = await page.evaluate(() => ({ touches: [...window.__play.inputController.touches.values()].map(t => t.action), velocity: window.__play.world.clones[0].velocity(),
      pointers: window.__play.input.manager.pointers.map(p => ({ id: p.id, down: p.isDown, active: p.active, x: p.x, y: p.y })), status: window.__play.status }));
    check(cancelled.touches.length === 0 && Math.abs(cancelled.velocity.x) < 1, `${name}: touch cancellation releases movement ${JSON.stringify(cancelled)}`);
    const pause = async () => tap(await page.evaluate(() => window.__point(window.__play.hud.pauseBadge, window.__play, window.__play.hud.camera)));
    const action = async index => tap(await page.evaluate(i => window.__point(window.__play.hud.actions[i].plate, window.__play, window.__play.hud.camera), index));
    await pause();
    const paused = await page.evaluate(() => ({ status: window.__play.status, targets: window.__play.hud.actions.map(a => window.__target(a.plate, window.__play.hud.camera)), hidden: window.__play.inputController.buttons.every(b => !b.hit.visible && !b.sprite.visible) }));
    check(paused.status === 'paused' && paused.hidden, `${name}: pause hides controls`);
    for (const t of paused.targets) check(Math.min(t.width, t.height) >= 43.9, `${name}: pause target ${JSON.stringify(t)}`);
    await page.screenshot({ path: `${root}/screens/pause-${name}.png` });
    await action(0);
    check(await page.evaluate(() => window.__play.status === 'playing'), `${name}: touch resumes`);
    await touch('touchStart', ['right']); await tick(3);
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await tick(1);
    check(await page.evaluate(() => window.__play.inputController.touches.size === 0), `${name}: focus loss clears held touch`);
    await touch('touchEnd', []); await touch('touchStart', ['right']); await tick(1);
    await page.setViewportSize({ width: height, height: width });
    await page.waitForFunction(() => window.__game.canvas.getBoundingClientRect().width === innerWidth - 24);
    await tick(1);
    check(await page.evaluate(() => window.__play.inputController.touches.size === 0), `${name}: rotating clears held touch`);
    await touch('touchCancel', []);
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => window.__game.canvas.getBoundingClientRect().width === innerWidth - 24);
    await tick(1);
    await page.evaluate(() => { for (const [k, v] of Object.entries({ top: 20, right: 12, bottom: 22, left: 12 })) document.documentElement.style.setProperty(`--safe-${k}`, `${v}px`); });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const safe = await page.evaluate(() => { const b = document.querySelector('#game').getBoundingClientRect(); return { x: b.x, y: b.y, right: innerWidth - b.right, bottom: innerHeight - b.bottom }; });
    check(safe.x === 12 && safe.y === 20 && safe.right === 12 && safe.bottom === 22, `${name}: safe areas ${JSON.stringify(safe)}`);
    await tick(2);
    await page.screenshot({ path: `${root}/screens/game-${name}.png` });
    await pause(); await action(1);
    check(await page.evaluate(() => window.__play.number === 1 && window.__play.status === 'playing' && !window.__play.transitioning), `${name}: touch restart`);
    controls = await getControls();
    await touch('touchStart', ['right']); await tick(400); await touch('touchEnd', []); await tick(160);
    const completed = await page.evaluate(() => ({ number: window.__play.number, completed: window.__play.progress.completed.has(1), playing: !window.__play.transitioning }));
    check(completed.number === 2 && completed.completed && completed.playing, `${name}: complete level 1 and advance by touch ${JSON.stringify(completed)}`);
    await pause(); await action(2);
    check(await page.evaluate(() => window.__select?.sys.isActive() && window.__select.view.ready()), `${name}: touch returns to levels`);
    report.cases.push({ name, width, height, dpr, controls, moved, cancelled, paused, safe, completed });
    console.log(JSON.stringify({ name, completed, failures: report.failures.filter(f => f.startsWith(`${name}:`)) }));
    await page.close();
  }
} finally { await browser.close(); await writeFile(`${root}/checks.json`, JSON.stringify(report, null, 2) + '\n'); }
assert.deepEqual(report.errors, []);
assert.deepEqual(report.failures, []);
