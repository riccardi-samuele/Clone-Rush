// Natural browser playback: real RAF, keyboard input, selection, physics,
// portal animation and level transition. No clock or update replacement.
import { chromium } from 'playwright';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = 'docs/campaign/candy-sky-v2';
await mkdir(`${root}/media`, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { recordedAt: new Date().toISOString(), method: 'Real browser RAF, keyboard input and production UI flow. Only scene references exposed. No frozen physics, manual clocks, input substitution or terminal overrides.', errors: [], phases: [] };
let context, page, video;
try {
  context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: `${root}/media`, size: { width: 1280, height: 800 } } });
  page = await context.newPage(); video = page.video();
  await page.addInitScript(() => localStorage.setItem('clone-rush:v1', JSON.stringify({ version: 1, campaignVersion: 2, unlockedThrough: 1, completed: Array.from({ length: 17 }, (_, i) => i + 1), current: 18 })));
  page.on('pageerror', e => report.errors.push(e.message));
  for (const [pattern, before, after] of [
    ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
    ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
    ['**/src/scenes/LevelSelectScene.js*', 'this.view = new RoyalLevelSelect(this);', 'this.view = new RoyalLevelSelect(this); window.__select=this;'],
  ]) await page.route(pattern, async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(before, after) }); });
  await page.goto('http://127.0.0.1:5175/?maps=18-r3');
  await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__select?.sys.isActive() && window.__select.view.ready(), null, { timeout: 30000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__play?.number === 18 && window.__play.sys.isActive() && !window.__play.transitioning, null, { timeout: 30000 });
  const snapshot = async phase => {
    const state = await page.evaluate(() => ({ number: window.__play.number, status: window.__play.status, platforms: window.__play.level.platforms.length, keys: window.__play.world.objects.filter(o => o.type === 32).map(o => o.collected), clone: { x: window.__play.world.clones[0].body.position.x, y: window.__play.world.clones[0].body.position.y, ground: window.__play.world.clones[0].groundFrames } }));
    if (state.number === 18) {
      state.renderedContact = await page.evaluate(async () => {
        const s = window.__play, sprite = s.world.clones[0].sprite, scale = 4, width = 480 * scale, height = 320 * scale;
        const textures = [s.children.list.filter(c => c.depth === 0), [sprite]].map(entries => {
          const rt = s.add.renderTexture(0, 0, width, height).setOrigin(0).setVisible(false);
          rt.camera.setOrigin(0, 0).setZoom(scale); rt.draw(entries); return rt;
        });
        // Both GPU draws happen in this turn, before normal RAF can move the
        // clone. Only the immutable pixel snapshots are awaited afterward.
        const images = await Promise.all(textures.map(rt => new Promise(resolve => rt.snapshot(resolve))));
        const pixels = await Promise.all(images.map(async image => {
          await image.decode(); const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, width, height).data;
        }));
        textures.forEach(rt => rt.destroy());
        const [terrain, actor] = pixels, bounds = sprite.getBounds(); let gap = Infinity;
        for (let x = Math.max(0, Math.floor(bounds.x * scale)); x < Math.min(width, Math.ceil(bounds.right * scale)); x++) {
          let top = null;
          for (let y = Math.max(0, Math.floor(bounds.y * scale)); y < Math.min(height, Math.ceil(sprite.y * scale)); y++) {
            if (actor[(y * width + x) * 4 + 3] >= 128) { top = y; break; }
          }
          if (top === null) continue;
          for (let dy = -12 * scale; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = top + dy;
            if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
            if (terrain[(yy * width + xx) * 4 + 3] >= 128) gap = Math.min(gap, Math.max(0, Math.hypot(dx, dy) - 1) / scale);
          }
        }
        return { gap, samplingPixelsPerWorldUnit: scale, actualAnimatedSprite: true };
      });
      assert.ok(state.renderedContact.gap <= .5, `${phase}: actual animated sprite floats ${state.renderedContact.gap} units`);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    report.phases.push({ phase, ...state });
    return state;
  };
  await snapshot('enter-via-selector');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__play.world.clones[0].body.position.x >= 230, null, { polling: 'raf', timeout: 20000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => Math.abs(window.__play.world.clones[0].velocity().x) < 1, null, { polling: 'raf', timeout: 10000 });
  const missed = await snapshot('walk-without-jumping');
  assert.equal(missed.status, 'playing'); assert.ok(missed.clone.ground <= 2); assert.deepEqual(missed.keys, [false]);
  await page.screenshot({ path: `${root}/screens/level-18-live-before-key.png` });
  const contactClip = await page.evaluate(() => {
    const s = window.__play, sprite = s.world.clones[0].sprite, camera = s.cameras.main;
    const point = camera.matrix.transformPoint(sprite.x - camera.scrollX, sprite.y - camera.scrollY);
    return { x: Math.max(0, Math.round(point.x - 200)), y: Math.max(0, Math.round(point.y - 100)), width: 400, height: 200 };
  });
  await page.screenshot({ path: `${root}/screens/level-18-live-contact-detail.png`, clip: contactClip });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => window.__play.world.objects.some(o => o.type === 32 && o.collected), null, { polling: 'raf', timeout: 10000 });
  await page.waitForFunction(() => window.__play.world.clones[0].groundFrames <= 2 && Math.abs(window.__play.world.clones[0].velocity().y) < 1, null, { polling: 'raf', timeout: 10000 });
  const retried = await snapshot('retry-standing-under-key'); assert.deepEqual(retried.keys, [true]);
  await page.screenshot({ path: `${root}/screens/level-18-live-key-collected.png` });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__play?.number === 19 && window.__play.sys.isActive() && !window.__play.transitioning, null, { polling: 'raf', timeout: 30000 });
  await page.keyboard.up('ArrowRight');
  await snapshot('advanced-to-19');
  await page.screenshot({ path: `${root}/screens/level-18-live-advanced.png` });
  report.completed = true;
} finally {
  await context?.close();
  if (video) { const path = await video.path(); await rename(path, `${root}/media/level-18-live.webm`); report.video = 'media/level-18-live.webm'; }
  await browser.close();
  await writeFile(`${root}/level-18-live-check.json`, JSON.stringify(report, null, 2) + '\n');
}
assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
console.log(JSON.stringify(report));
