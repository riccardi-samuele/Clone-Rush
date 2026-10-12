// Check the rendered island itself, not just the rectangular Matter fixture.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const baseline = process.env.CONTACT_BASELINE === '1';
const report = { checkedAt: new Date().toISOString(), baseline, method: 'Production terrain rendered into a transparent RenderTexture. Actual Clone gravity, contacts and movement replayed at 10ms in a separate Matter engine on each production island fixture, in both directions. Visible avatar alpha checked against visible terrain alpha, maximum gap .5 world units at 4px/unit sampling. Separate fixture test; portal and UI behavior covered by integration and live browser checks.', levels: [], errors: [] };
report.sourceHashes = Object.fromEntries(await Promise.all(['src/game/CandyIslandGeometry.js', 'src/game/LevelWorld.js', 'src/game/candy-island-contour.json', 'src/game/CandyIslandStrip.js', 'public/assets/candy-sky-v1/island-profiles-v3.png'].map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
try {
  const page = await browser.newPage({ viewport: { width: 1786, height: 1122 } });
  page.on('pageerror', e => report.errors.push(e.message));
  for (const [pattern, before, after] of [
    ['**/src/game/RoyalLobby.js*', 'this.scene = scene;', 'this.scene = scene; window.__lobby=this;'],
    ['**/src/scenes/PlayScene.js*', 'this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__play=this;'],
  ]) await page.route(pattern, async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(before, after) }); });
  if (baseline) {
    // Reproduce the previous production fixtures without changing workspace
    // files or loosening assertions. Scene, pixels and keyboard code are real.
    await page.route('**/src/game/LevelWorld.js*', async route => {
      const response = await route.fetch(); let body = await response.text();
      body = body.replace(/const body = p\.undersideSupport \? Body\.create\([\s\S]*?\}\) : Bodies\.rectangle\([^;]+;/,
        'const body = Bodies.rectangle(p.x + p.width / 2, p.y + p.height / 2, p.width, p.height, options);');
      body = body.replace(/if \(entity\.type === 35[\s\S]*?points = Vertices\.chamfer\(points, 4, 8\);\s*\}/, '');
      assert.ok(!body.includes('points = Vertices.chamfer') && !body.includes('const body = p.undersideSupport'), 'Baseline fixture replacement');
      await route.fulfill({ response, body });
    });
    await page.route('**/src/game/Clone.js*', async route => {
      const response = await route.fetch(); const body = (await response.text()).replace("if (this.type === 35 && !input.pressed.has('up')) this.world.snapGravityClone(this);", '');
      await route.fulfill({ response, body });
    });
  }
  await page.goto('http://127.0.0.1:5175/');
  await page.waitForFunction(() => window.__lobby?.ready(), null, { timeout: 90000 });
  await page.evaluate(() => { window.__game = window.__lobby.scene.game; window.__game.loop.sleep(); window.__clock = performance.now(); });
  for (const number of [18, 19, 20, 21, 23, 24, 0]) {
    const result = await page.evaluate(async number => {
      const game = window.__game;
      const tick = count => { for (let i = 0; i < count; i++) { for (const s of game.scene.scenes) if (s.tweens) s.tweens.getDelta = () => 10; window.__clock += 10; game.headlessStep(window.__clock, 10); } };
      for (const key of ['Menu', 'Play', 'Ending', 'LevelTransition']) game.scene.stop(key);
      game.scene.start(number ? 'Play' : 'Ending', { number }); tick(150); game.step(window.__clock, 0);
      const scene = window.__play, terrain = scene.children.list.filter(c => c.depth === 0);
      const resolution = 4, renderWidth = 480 * resolution, renderHeight = 320 * resolution;
      const rt = scene.add.renderTexture(0, 0, renderWidth, renderHeight).setOrigin(0).setVisible(false);
      rt.camera.setOrigin(0, 0).setZoom(resolution);
      rt.draw(terrain);
      const img = await new Promise(resolve => rt.snapshot(resolve));
      await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = renderWidth; canvas.height = renderHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, renderWidth, renderHeight).data;
      rt.destroy();
      // RenderTexture snapshots leave the main framebuffer dirty until the
      // next normal render. Capture the scene only after restoring that frame.
      game.step(window.__clock, 0);
      const { default: Phaser } = await import('/node_modules/.vite/deps/phaser.js');
      const { Engine, Composite, Bodies, Body } = Phaser.Physics.Matter.Matter;
      const template = scene.world.clones.find(c => c.type === 35);
      const frame = template.sprite.frame;
      const actor = document.createElement('canvas'); actor.width = 20 * resolution; actor.height = 20 * resolution;
      const actorContext = actor.getContext('2d');
      if (template.sprite.flipY) { actorContext.translate(0, actor.height); actorContext.scale(1, -1); }
      actorContext.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, actor.width, actor.height);
      const avatar = actor.getContext('2d').getImageData(0, 0, actor.width, actor.height).data;
      const head = Array.from({ length: actor.width }, (_, x) => {
        for (let y = 0; y < 8 * resolution; y++) if (avatar[(y * actor.width + x) * 4 + 3] >= 128) return y;
        return null;
      });
      const gapAt = (body, offset = template.visualOffset) => {
        const originX = body.position.x + offset.x - 10, originY = body.position.y + offset.y - 10;
        let distance = Infinity;
        for (let ax = 0; ax < actor.width; ax++) {
          if (head[ax] === null) continue;
          const px = Math.floor(originX * resolution + ax), py = Math.floor(originY * resolution + head[ax]);
          for (let dy = -10 * resolution; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = px + dx, y = py + dy;
            if (x < 0 || x >= renderWidth || y < 0 || y >= renderHeight) continue;
            if (pixels[(y * renderWidth + x) * 4 + 3] >= 128) distance = Math.min(distance, Math.max(0, Math.hypot(dx, dy) - 1) / resolution);
          }
        }
        return distance;
      };
      const platforms = scene.world.floating.platforms.filter(p => p.undersideSupport).map(p => {
        const support = scene.matter.world.engine.world.bodies.find(b => b.plugin.entity?.type === 'terrain' && Math.abs(b.bounds.min.x - p.x) < .01 && Math.abs(b.bounds.min.y - p.y) < .01);
        const engine = Engine.create({ gravity: { x: 0, y: 0 }, positionIterations: 8, velocityIterations: 8 });
        Composite.add(engine.world, support);
        const local = template.body.vertices.map(v => ({ x: v.x - template.body.position.x, y: v.y - template.body.position.y }));
        const probe = Bodies.fromVertices(p.x + 15, p.y + 50, local, { friction: template.body.friction, frictionAir: 0, slop: .02, inertia: Infinity }, true, 0, 0);
        Composite.add(engine.world, probe);
        const avatarClone = Object.create(template);
        Object.assign(avatarClone, { body: probe, groundFrames: 100, jumpFrames: 0, state: 'playing', gravitySupport: null,
          sprite: scene.add.sprite(0, 0, template.sprite.texture.key, template.sprite.frame.name).setOrigin(.5).setDisplaySize(20, 20).setFlipY(template.sprite.flipY) });
        avatarClone.sprite.royalRole = template.sprite.royalRole;
        probe.plugin.entity = avatarClone;
        Body.setMass(probe, template.body.mass);
        const physicsTick = direction => {
          avatarClone.applyGravity(); Engine.update(engine, 10);
          for (const pair of engine.pairs.list) if (pair.isActive) {
            const normal = pair.collision.normal;
            if (pair.bodyA.parent === probe) avatarClone.contact(pair.bodyB.plugin.entity, normal, pair.isSensor);
            if (pair.bodyB.parent === probe) avatarClone.contact(pair.bodyA.plugin.entity, { x: -normal.x, y: -normal.y }, pair.isSensor);
          }
          avatarClone.step({ direction, pressed: new Set() });
        };
        let maxGap = 0, samples = 0, worst = null, lostSupportFrames = 0;
        const traversals = [];
        const check = () => {
          const gap = gapAt(probe); samples++;
          if (avatarClone.groundFrames > 3) lostSupportFrames++;
          if (gap > maxGap) { maxGap = gap; worst = { ...probe.position }; }
        };
        for (const direction of [1, -1]) {
          Body.setPosition(probe, { x: direction > 0 ? p.x + 15 : p.x + p.width - 15, y: p.y + 50 });
          Body.setVelocity(probe, { x: 0, y: 0 }); avatarClone.groundFrames = 100; avatarClone.gravitySupport = null;
          for (let i = 0; i < 100; i++) physicsTick(0);
          check();
          for (let i = 0; i < Math.ceil(p.width / 1.5) + 100; i++) {
            physicsTick(direction);
            if (probe.position.x < p.x + 10 || probe.position.x > p.x + p.width - 10) break;
            check();
          }
          traversals.push({ direction, reachedOppositeEnd: direction > 0 ? probe.position.x >= p.x + p.width - 10 : probe.position.x <= p.x + 10 });
        }
        avatarClone.sprite.destroy();
        Composite.clear(engine.world, false); Engine.clear(engine);
        return { x: p.x, y: p.y, width: p.width, samples, maxVisualGap: maxGap, worst, lostSupportFrames, traversals };
      });
      const clones = scene.world.clones.filter(c => c.type === 35).map(c => ({ x: c.body.position.x, y: c.body.position.y, supported: c.groundFrames <= 2 }));
      return { number, platforms, clones, cloneGaps: scene.world.clones.filter(c => c.type === 35).map(c => gapAt(c.body)) };
    }, number);
    report.levels.push(result);
    console.log(JSON.stringify(result));
    if (number === 18) await page.screenshot({ path: `docs/campaign/candy-sky-v2/screens/level-18-contact-${baseline ? 'before' : 'checked'}.png` });
  }
} finally {
  await browser.close();
  await writeFile(`docs/campaign/candy-sky-v2/underside-contact-${baseline ? 'before' : 'checks'}.json`, JSON.stringify(report, null, 2) + '\n');
}
assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
for (const level of report.levels) for (const p of level.platforms) assert.ok(p.maxVisualGap <= .5, `Level ${level.number}: rendered cube floats ${p.maxVisualGap} units from island at ${JSON.stringify(p.worst)}`);
for (const level of report.levels) for (const p of level.platforms) {
  assert.equal(p.lostSupportFrames, 0, `Level ${level.number}: lost ceiling support while walking`);
  for (const traversal of p.traversals) assert.equal(traversal.reachedOppositeEnd, true, `Level ${level.number}: blocked walking direction ${traversal.direction}`);
}
for (const level of report.levels) for (const clone of level.clones) assert.equal(clone.supported, true, `Level ${level.number}: unsupported gravity clone`);

for (const level of report.levels) for (const gap of level.cloneGaps) assert.ok(gap <= .5, `Level ${level.number}: initial cube floats ${gap} units`);
