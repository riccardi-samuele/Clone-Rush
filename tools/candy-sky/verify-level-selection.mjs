// Real selector clicks, including migration of the original save format.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const levelCount = JSON.parse(await readFile('public/data/levels.json','utf8')).levels.length;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { recordedAt: new Date().toISOString(), cases: [], errors: [] };
try {
  for (const [name, saved, numbers] of [
    ['legacy-15-completions', { version: 1, completed: Array.from({ length: 15 }, (_, i) => i + 1), current: 18, soundVolume: 35, musicVolume: 20 }, [18]],
    ['all-completed', { version: 1, campaignVersion: 2, unlockedThrough: 1, completed: Array.from({ length: levelCount }, (_, i) => i + 1), current: 1 }, Array.from({ length: levelCount }, (_, i) => i + 1)],
    ['fresh', null, [1]],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(saved => { if (saved) localStorage.setItem('clone-rush:v1', JSON.stringify(saved)); else localStorage.removeItem('clone-rush:v1'); }, saved);
    page.on('pageerror', e => report.errors.push(e.message));
    for (const [pattern, before, after] of [
      ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
      ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
      ['**/src/scenes/LevelSelectScene.js*', 'this.view = new RoyalLevelSelect(this);', 'this.view = new RoyalLevelSelect(this); window.__select=this;'],
    ]) await page.route(pattern, async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(before, after) }); });
    await page.goto('http://127.0.0.1:5175/');
    await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
    await page.evaluate(() => {
      window.__game = window.__lobby.scene.game; window.__game.loop.sleep(); window.__clock = performance.now();
      window.__tick = count => { for (let i = 0; i < count; i++) { for (const s of window.__game.scene.scenes) if (s.tweens) s.tweens.getDelta = () => 10; window.__clock += 10; window.__game.headlessStep(window.__clock, 10); } };
    });
    const checks = [];
    for (const number of numbers) {
      const tile = await page.evaluate(number => {
        for (const key of ['Menu', 'Play', 'Ending', 'LevelSelect']) window.__game.scene.stop(key);
        window.__game.scene.start('LevelSelect'); window.__tick(60); window.__game.step(window.__clock, 0);
        const scene = window.__select, tile = scene.view.tiles.find(t => t.number === number), camera = scene.cameras.main;
        if (!tile.image.visible) scene.view.changePage(Math.floor((number - 1) / 24) - scene.view.page);
        window.__game.step(window.__clock, 0);
        const point = camera.matrix.transformPoint(tile.image.x - camera.scrollX, tile.image.y - camera.scrollY);
        return { ...point, unlocked: tile.unlocked, interactive: Boolean(tile.image.input), current: scene.number, blocked: scene.view.tiles.filter(t => !t.unlocked).map(t => t.number) };
      }, number);
      assert.equal(tile.unlocked, true, `${name} level ${number}: locked`);
      await page.mouse.click(tile.x, tile.y);
      const entered = await page.evaluate(number => {
        window.__tick(130);
        return { number, entered: window.__play?.sys.isActive() && window.__play.number === number && !window.__play.transitioning, save: JSON.parse(localStorage.getItem('clone-rush:v1')) };
      }, number);
      assert.equal(entered.entered, true, `${name} level ${number}: click did not enter`);
      checks.push({ ...entered, blocked: tile.blocked });
    }
    report.cases.push({ name, checks });
    console.log(JSON.stringify({ name, entries: checks.length, allEntered: checks.every(c => c.entered), firstSave: checks[0].save }));
    await page.close();
  }
} finally { await browser.close(); await writeFile('docs/campaign/candy-sky-v2/selection-checks.json', JSON.stringify(report, null, 2) + '\n'); }
assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
