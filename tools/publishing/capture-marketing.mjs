import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'release/crazygames/qa/marketing-v2';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { source: 'http://127.0.0.1:5175/', captures: [], errors: [] };

async function enterLevel(page, number) {
  await page.evaluate(number => {
    const game = window.__marketingGame;
    for (const key of ['Menu', 'LevelSelect', 'Play', 'Ending', 'LevelTransition']) game.scene.stop(key);
    game.scene.start('Play', { number });
  }, number);
  await page.waitForFunction(number => {
    const scene = window.__marketingGame?.scene.getScene('Play');
    return scene?.scene.isActive() && scene.number === number && scene.status === 'playing'
      && !scene.transitioning;
  }, number, { timeout: 15000 });
  await page.waitForTimeout(300);
}

async function action(page, direction, milliseconds, jump = false) {
  const key = direction < 0 ? 'ArrowLeft' : 'ArrowRight';
  await page.keyboard.down(key);
  if (jump) await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(milliseconds);
  if (jump) await page.keyboard.up('ArrowUp');
  await page.keyboard.up(key);
}

try {
  for (const [name, width, height, touch] of [
    ['landscape', 1280, 720, false], ['portrait', 720, 1080, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch,
      isMobile: touch, recordVideo: { dir: out, size: { width, height } } });
    const started = Date.now();
    const page = await context.newPage();
    const video = page.video();
    page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
    page.on('response', response => {
      if (response.status() >= 400) report.errors.push(`${name}: ${response.status()} ${response.url()}`);
    });
    await page.route('**/src/main.js*', async route => {
      const response = await route.fetch();
      const body = await response.text();
      const anchor = 'const game = new Phaser.Game({';
      if (!body.includes(anchor)) throw Error('Marketing capture instrumentation anchor missing');
      await route.fulfill({ response, body: body.replace(anchor,
        'const game = window.__marketingGame = new Phaser.Game({') });
    });
    await page.goto(report.source);
    await page.waitForFunction(() => !document.querySelector('#loading-screen'), null, { timeout: 90000 });
    const clips = [];
    for (const number of [1, 2, 25, 32]) {
      await enterLevel(page, number);
      const from = (Date.now() - started) / 1000;
      if (number === 1) {
        await action(page, 1, 2700);
        await page.waitForTimeout(1300);
      } else if (number === 2) {
        await action(page, 1, 900);
        await action(page, 1, 1100, true);
        await action(page, 1, 1100);
        await page.waitForTimeout(800);
      } else if (number === 25) {
        await action(page, 1, 1200);
        await action(page, -1, 1100, true);
        await action(page, -1, 900);
        await page.waitForTimeout(800);
      } else {
        await action(page, 1, 700);
        await action(page, 1, 900, true);
        await action(page, -1, 900);
        await page.waitForTimeout(1400);
      }
      clips.push({ level: number, from, to: (Date.now() - started) / 1000 });
      await page.screenshot({ path: `${out}/${name}-level-${number}.png` });
    }
    await context.close();
    report.captures.push({ name, width, height, video: await video.path(), clips });
  }
} finally {
  await browser.close();
  await writeFile(`${out}/capture.json`, JSON.stringify(report, null, 2) + '\n');
}
if (report.errors.length) throw Error(report.errors.join('\n'));
console.log(JSON.stringify(report, null, 2));
