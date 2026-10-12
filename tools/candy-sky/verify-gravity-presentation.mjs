// Presentation checks run on production scenes, with isolated storage and a fixed clock.
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = 'docs/campaign/candy-sky-v2';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { recordedAt: new Date().toISOString(), method: 'Production scenes at fixed 10ms steps; desktop and touch phone. Orientation, cue association, pause, lifecycle and introductory HUD verified independently of physics witnesses.', scenes: [], errors: [] };
try {
  const formats = [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }], ['phone-small', { width: 320, height: 568 }], ['phone-landscape', { width: 667, height: 375 }], ['phone-density', { width: 390, height: 844 }]];
  for (const [format, viewport] of formats.filter(([format]) => !process.env.GRAVITY_FORMAT || format === process.env.GRAVITY_FORMAT)) {
    const page = await browser.newPage({ viewport, hasTouch: format.startsWith('phone'), isMobile: format.startsWith('phone'), deviceScaleFactor: format === 'phone-density' ? 2 : 1 });
    page.on('pageerror', e => report.errors.push(e.message));
    for (const [pattern, before, after] of [
      ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
      ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
    ]) await page.route(pattern, async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(before, after) }); });
    await page.goto('http://127.0.0.1:5175/');
    await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
    await page.evaluate(() => {
      window.__game = window.__lobby.scene.game; window.__game.loop.sleep(); window.__clock = performance.now();
      window.__tick = count => { for (let i = 0; i < count; i++) {
        for (const s of window.__game.scene.scenes) if (s.tweens) s.tweens.getDelta = () => 10;
        window.__clock += 10; window.__game.headlessStep(window.__clock, 10);
      } };
      window.__start = number => {
        for (const key of ['Menu', 'Play', 'Ending', 'LevelTransition']) window.__game.scene.stop(key);
        window.__game.scene.start(number ? 'Play' : 'Ending', { number }); window.__tick(100);
        window.__game.step(window.__clock, 0); return window.__play;
      };
    });
    for (const number of ['desktop', 'phone'].includes(format) ? [18, 1, 19, 20, 21, 23, 24, 0] : [18]) {
      const result = await page.evaluate(number => {
        const s = window.__start(number), purple = s.world.clones.filter(c => c.type === 35), cues = s.world.effects.gravityCues;
        const result = { number, purpleCount: purple.length,
          purpleUpsideDown: purple.every(c => c.sprite.flipY),
          othersUpright: s.world.clones.filter(c => c.type !== 35).every(c => !c.sprite.flipY),
          badgeCount: cues?.clones.length ?? -1,
          undersideCount: s.world.floating.platforms.filter(p => p.undersideSupport).length,
          surfaceCount: cues?.surfaces.length ?? -1,
          follows: cues?.clones.every(({ clone, badge }) => badge.visible && Math.abs(badge.x - clone.sprite.x - 17) < .001 && Math.abs(badge.y - clone.sprite.y - 4) < .001) ?? false,
        };
        if (number === 18 && s.hud.gravityTutorial) {
          const tutorial = s.hud.gravityTutorial, camera = s.hud.camera;
          const text = [tutorial.title, tutorial.description, tutorial.instructions].map(t => t.text).join(' ');
          const fitsScreen = tutorial.items.every(item => {
            const b = item.getBounds(), points = [[b.x, b.y], [b.right, b.bottom]].map(([x, y]) => camera.matrix.transformPoint(x - camera.scrollX, y - camera.scrollY));
            return points.every(p => p.x >= 0 && p.y >= 0 && p.x <= s.scale.width && p.y <= s.scale.height) && !(item.cameraFilter & camera.id);
          });
          const panel = tutorial.panel.getBounds();
          result.tutorial = { explicitDirections: /INVERTED GRAVITY/.test(text) && /falls UP/.test(text) && /Jump pushes DOWN/.test(text), fitsScreen,
            clearOfHeader: panel.y >= Math.max(...[s.hud.logo, s.hud.badge, s.hud.pauseBadge].map(item => item.getBounds().bottom)) + 4,
            textFitsPanel: [tutorial.title, tutorial.description, tutorial.instructions].every(t => { const b = t.getBounds(); return b.x >= panel.x && b.right <= panel.right && b.y >= panel.y && b.bottom <= panel.bottom; }),
            readable: [tutorial.title, tutorial.description, tutorial.instructions].every(t => parseFloat(t.style.fontSize) * camera.zoom / s.scale.displayScale.x >= 11),
          };
          window.__tick(1000);
          result.tutorial.persistsUntilAction = tutorial.items.every(item => item.visible);
          const beforePause = cues.clones.map(({ badge }) => [badge.x, badge.y, badge.alpha]);
          s.hud.togglePause(); window.__tick(100);
          result.paused = tutorial.items.every(item => !item.visible) && cues.clones.every(({ badge }, i) => [badge.x, badge.y, badge.alpha].every((v, j) => v === beforePause[i][j]));
          s.hud.togglePause(); window.__tick(1);
          result.tutorial.resumes = tutorial.items.every(item => item.visible);
          for (const key of s.world.objects.filter(o => o.type === 32)) s.world.collectKey(key);
          window.__tick(1);
          result.tutorial.dismissedAfterKey = tutorial.items.every(item => !item.visible);
          window.__start(18);
          result.tutorial.returnsOnRestart = window.__play.hud.gravityTutorial.items.every(item => item.visible);
        }
        return result;
      }, number);
      report.scenes.push({ format, ...result });
      assert.equal(result.purpleUpsideDown, true, `${format} ${number}: purple must be upside down`);
      assert.equal(result.othersUpright, true, `${format} ${number}: other clones remain upright`);
      assert.equal(result.badgeCount, result.purpleCount, `${format} ${number}: one upward badge per purple clone`);
      assert.equal(result.surfaceCount, result.undersideCount, `${format} ${number}: mark each walkable underside`);
      assert.equal(result.follows, true, `${format} ${number}: badges follow their clones`);
      if (number === 18) {
        assert.ok(result.tutorial, `${format}: level 18 tutorial exists`);
        for (const [key, value] of Object.entries(result.tutorial)) assert.equal(value, true, `${format}: tutorial ${key}`);
        assert.equal(result.paused, true, `${format}: pause freezes cues and hides instructions`);
        await page.screenshot({ path: `${root}/screens/level-18-gravity-${format}.png` });
      }
      const lifecycle = await page.evaluate(() => {
        const cues = window.__play.world.effects.gravityCues;
        for (const { clone } of cues.clones) clone.state = 'exiting';
        cues.update(); const exitingHidden = cues.clones.every(({ badge }) => !badge.visible);
        for (const { clone } of cues.clones) clone.state = 'dead';
        cues.update(); return exitingHidden && cues.clones.every(({ badge }) => !badge.visible);
      });
      assert.equal(lifecycle, true, `${format} ${number}: hide badges during death and portal absorption`);
    }
    if (format === 'phone') {
      await page.evaluate(() => window.__start(18));
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForFunction(() => window.__game.scale.width > window.__game.scale.height);
      report.resize = await page.evaluate(() => {
        window.__tick(1); window.__game.step(window.__clock, 0);
        const s = window.__play, card = s.hud.gravityTutorial, camera = s.hud.camera;
        const panel = card.panel.getBounds();
        return { remainsVisible: card.items.every(item => item.visible),
          fits: card.items.every(item => { const b = item.getBounds(); return [[b.x, b.y], [b.right, b.bottom]].every(([x, y]) => { const p = camera.matrix.transformPoint(x - camera.scrollX, y - camera.scrollY); return p.x >= 0 && p.y >= 0 && p.x <= s.scale.width && p.y <= s.scale.height; }); }),
          readable: [card.title, card.description, card.instructions].every(t => parseFloat(t.style.fontSize) * camera.zoom / s.scale.displayScale.x >= 11),
          textFitsPanel: [card.title, card.description, card.instructions].every(t => { const b = t.getBounds(); return b.x >= panel.x && b.right <= panel.right && b.y >= panel.y && b.bottom <= panel.bottom; }),
        };
      });
      for (const [key, value] of Object.entries(report.resize)) assert.equal(value, true, `Portrait-to-landscape resize: ${key}`);
    }
    await page.close();
  }
} finally {
  await browser.close(); await writeFile(`${root}/gravity-presentation-checks.json`, JSON.stringify(report, null, 2) + '\n');
}
assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
console.log(JSON.stringify(report));
