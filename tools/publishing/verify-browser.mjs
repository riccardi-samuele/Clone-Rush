import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.PORTAL_BASE_URL || 'http://127.0.0.1:5197/web/';
const out = 'release/crazygames/qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = { baseURL, cases: [], errors: [] };

async function play(page) {
  await page.waitForFunction(() => !document.querySelector('#loading-screen'), null, { timeout: 90000 });
  await page.waitForFunction(() => window.__previewGame?.scene.getScene('Menu')?.scene.isActive(), null, { timeout: 10000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const scene = window.__previewGame?.scene.getScene('LevelSelect');
    return scene?.scene.isActive() && scene.view?.ready();
  }, null, { timeout: 20000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const scene = window.__previewGame?.scene.getScene('Play');
    return scene?.scene.isActive() && !scene.transitioning && scene.status === 'playing';
  }, null, { timeout: 20000 });
  const { width, height } = page.viewportSize();
  await page.screenshot({ path: `${out}/preview-${width}x${height}-game-start.png` });
}

try {
  if (process.env.PORTAL_VIDEO_ONLY !== '1') for (const [name, width, height, touch] of [
    ['crazy-907x510', 907, 510, false], ['crazy-821x462', 821, 462, false],
    ['crazy-800x450', 800, 450, false], ['gamepix-640x480', 640, 480, false],
    ['phone-390x844', 390, 844, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${name}: ${response.status()} ${response.url()}`); });
    await page.goto(baseURL);
    await page.waitForFunction(() => !document.querySelector('#loading-screen'), null, { timeout: 90000 });
    await page.screenshot({ path: `${out}/${name}-lobby.png` });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${name}-levels.png` });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/${name}-game.png` });
    report.cases.push({ name, width, height, touch, loaded: true });
    await context.close();
  }
  if (process.env.PORTAL_QA_ONLY !== '1') for (const [name, width, height, touch] of [
    ['landscape', 1280, 720, false], ['portrait', 720, 1080, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch,
      isMobile: touch, recordVideo: { dir: out, size: { width, height } } });
    const createdAt = Date.now();
    const page = await context.newPage();
    const video = page.video();
    page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
    await page.route('**/src/main.js*', async route => {
      const response = await route.fetch();
      const body = await response.text();
      const anchor = 'const game = new Phaser.Game({';
      if (!body.includes(anchor)) throw Error('Preview instrumentation anchor missing');
      await route.fulfill({ response, body: body.replace(anchor, 'const game = window.__previewGame = new Phaser.Game({') });
    });
    await page.goto('http://127.0.0.1:5175/');
    await play(page);
    const gameplayAt = Date.now();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1800);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(1400);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(1700);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(1300);
    }
    await page.waitForTimeout(3500);
    await context.close();
    report.cases.push({ name, video: await video.path(), gameplayStartSeconds: (gameplayAt-createdAt)/1000 });
  }
} finally {
  await browser.close();
  const reportName = process.env.PORTAL_VIDEO_ONLY === '1' ? 'video-report.json'
    : process.env.PORTAL_QA_ONLY === '1' ? 'qa-report.json' : 'report.json';
  await writeFile(`${out}/${reportName}`, JSON.stringify(report, null, 2)+'\n');
}
if (report.errors.length) throw Error(report.errors.join('\n'));
console.log(JSON.stringify(report, null, 2));
