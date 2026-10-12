// Replay the authored solutions in an isolated production Phaser scene.
// Only this browser disables terminal transitions and progress writes.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'docs/campaign/candy-sky-v2';
const solutions = JSON.parse(await readFile(`${root}/solutions.json`, 'utf8'));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = { campaign: 'candy-sky-v2', method: 'Production PlayScene, LevelWorld, Matter and key tweens at 10ms in an isolated browser. Terminal transitions, audio and save writes disabled in this browser only. Constructive feasibility witnesses; not optimal times or human difficulty ratings.', levels: [], issues: [] };
results.sourceHashes = Object.fromEntries(await Promise.all(['public/data/levels.json', 'src/game/GeneratedTerrain.js', 'src/game/ProgressStore.js', 'src/scenes/PlayScene.js'].map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
results.recordedAt = new Date().toISOString();
await mkdir(`${root}/screens`, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => results.issues.push(e.message));
  await page.route('**/src/game/RoyalLobby.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('this.scene = scene;', 'this.scene = scene; window.__mapLobby=this;') });
  });
  await page.route('**/src/scenes/PlayScene.js*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('this.world = new LevelWorld(this, this.level);', 'this.world = new LevelWorld(this, this.level); window.__mapScene=this;').replace('update(_time, delta) {', 'update(_time, delta) { this.world?.render(Math.min(delta, 200)); return;');
    await route.fulfill({ response, body });
  });
  await page.goto('http://127.0.0.1:5175/');
  await page.locator('#loading-screen').waitFor({ state: 'detached', timeout: 90000 });
  await page.waitForFunction(() => window.__mapLobby?.ready(), null, { timeout: 60000 });
  for (const candidate of [...solutions.levels, solutions.ending]) {
    const number = candidate.number;
    await page.evaluate(number => {
      const s = window.__mapScene?.sys.isActive() ? window.__mapScene : window.__mapLobby.scene;
      s.scene.start(number === 0 ? 'Ending' : 'Play', { number, transition: 'boot' });
    }, number);
    await page.waitForFunction(number => window.__mapScene?.number === number && window.__mapScene?.sys.isActive(), number);
    await page.waitForTimeout(750);
    // Capture the readable tutorial plateau, independently of screenshot FPS.
    await page.evaluate(() => {
      const s = window.__mapScene;
      // The isolated replay freezes PlayScene.update. Settle the actors before
      // photographing the entry state, as the production entrance does.
      for (let i = 0; i < 20; i++) {
        s.world.prepareStep(); s.matter.world.step(10); s.world.resolveContacts();
        s.world.clones.forEach(c => c.step({ direction: 0, pressed: new Set() }));
      }
      if (s.tutorial) { s.tweens.killTweensOf(s.tutorial); s.tutorial.setAlpha(1); }
      s.world.render(0);
    });
    const screen = `screens/${number === 0 ? 'ending' : `level-${String(number).padStart(2, '0')}`}.png`;
    await page.screenshot({ path: `${root}/${screen}` });
    const actions = candidate.actions.map(a => [...a]);
    // A short terminal buffer tolerates the independent render clock's key phase.
    actions.at(-1)[1] += 30;
    const replay = await page.evaluate(actions => {
      const s = window.__mapScene, w = s.world, events = []; let step = 0;
      s.tweens.pauseAll(); s.tweens.getDelta = () => 10; s.status = 'playing'; s.audio = { play() {} }; w.effects.enterPortal = () => true;
      s.die = c => { s.status = 'dead'; c.state = 'dead'; };
      s.checkComplete = () => { if (w.clones.every(c => c.state === 'exiting')) s.status = 'complete'; };
      const collect = w.collectKey.bind(w);
      w.collectKey = k => { if (!k.collected) events.push({ step, event: 'key', id: k.instance.instance }); return collect(k); };
      w.clones.forEach((c, i) => { const enter = c.enterExit.bind(c); c.enterExit = e => { events.push({ step, event: 'exit', clone: i, portal: e.instance.instance }); enter(e); }; });
      const frames = [];
      for (const [direction, duration, jump] of actions) {
        for (let i = 0; i < duration && s.status === 'playing'; i++) {
          s.tweens.tick(); w.prepareStep(); s.matter.world.step(10); w.resolveContacts();
          if (s.status === 'playing') w.clones.forEach(c => c.step({ direction, pressed: new Set(jump && i === 0 ? ['up'] : []) }));
          step++;
          if (step % 10 === 0) frames.push({ step, clones: w.clones.map(c => ({ state: c.state, x: c.body.position.x, y: c.body.position.y })) });
        }
        if (s.status !== 'playing') break;
      }
      return { status: s.status, step, events, frames };
    }, actions);
    let maxPositionDifference = 0;
    for (let i = 0; i < Math.min(replay.frames.length, candidate.replay.frames.length); i++) for (let j = 0; j < replay.frames[i].clones.length; j++) {
      const a = replay.frames[i].clones[j], b = candidate.replay.frames[i].clones[j];
      maxPositionDifference = Math.max(maxPositionDifference, Math.hypot(a.x - b.x, a.y - b.y));
    }
    results.levels.push({ number, mapHash: candidate.mapHash, screen, actions, maxPositionDifference, ...replay });
    console.log(JSON.stringify({ number, status: replay.status, step: replay.step, maxPositionDifference }));
  }
} finally {
  await browser.close();
  await writeFile(`${root}/phaser-replays.json`, JSON.stringify(results, null, 2) + '\n');
}
