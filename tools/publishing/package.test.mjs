import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

for (const site of ['crazygames', 'gamepix']) test(`${site} upload archive contract`, async () => {
  const dir = `release/${site}`;
  const manifest = JSON.parse(await readFile(`${dir}/manifest.json`, 'utf8'));
  const listing = execFileSync('unzip', ['-Z1', `${dir}/${manifest.archive}`], { encoding: 'utf8' }).trim().split('\n');
  assert.ok(listing.includes('index.html'));
  assert.ok(listing.includes('data/levels.json'));
  assert.equal(manifest.ads, false); assert.equal(manifest.sdk, false);
  assert.ok(manifest.files <= 1500 && manifest.bytes <= 20_000_000);
  assert.ok((await stat(`${dir}/${manifest.archive}`)).size > 0);
  await stat(`${dir}/submission.md`);
  for (const art of ['clone-rush-landscape.png', 'clone-rush-portrait.png', 'clone-rush-square.png', 'clone-rush-icon-512.png'])
    await stat(`${dir}/artwork/${art}`);
  if (site === 'crazygames') {
    for (const [name, width, height] of [['landscape',1920,1080], ['portrait',800,1200], ['square',800,800]]) {
      const png = await readFile(`${dir}/artwork/clone-rush-${name}.png`);
      assert.equal(png.readUInt32BE(16), width);
      assert.equal(png.readUInt32BE(20), height);
    }
    const previews = JSON.parse(await readFile('artwork/publishing/promos/manifest.json', 'utf8'));
    for (const [name, width, height] of [['landscape', 1920, 1080], ['portrait', 1080, 1620]]) {
      const file = `clone-rush-zoom-${name}.mp4`;
      const evidence = previews.find(p => p.file === file);
      assert.ok(evidence.durationSeconds >= 15 && evidence.durationSeconds <= 20);
      assert.equal(evidence.width, width); assert.equal(evidence.height, height);
      assert.equal(evidence.audio, false);
      assert.ok(evidence.firstFrameMeanError <= 5);
      const video = await readFile(`${dir}/previews/${file}`);
      assert.ok(video.length < 50_000_000);
      assert.equal(createHash('sha256').update(video).digest('hex'), evidence.sha256);
    }
    assert.deepEqual((await readdir(`${dir}/previews`)).sort(),
      ['clone-rush-zoom-landscape.mp4', 'clone-rush-zoom-portrait.mp4']);
  }
});
