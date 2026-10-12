import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import config from '../../vite.config.js';

test('dev and preview serve phones on the LAN on the documented port', async () => {
  assert.equal(config.server.host, '0.0.0.0');
  assert.equal(config.server.port, 5175);
  assert.equal(config.server.strictPort, true);
  assert.equal(config.preview.host, '0.0.0.0');
  const pkg = JSON.parse(await readFile('package.json'));
  assert.ok(!pkg.scripts.dev.includes('127.0.0.1'));
});

test('favicon, Apple icon and manifest reference shipped square PNGs', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /rel="icon"[^>]+favicon-32\.png/);
  assert.match(html, /rel="apple-touch-icon"[^>]+apple-touch-icon\.png/);
  assert.match(html, /rel="manifest"[^>]+site\.webmanifest/);
  const manifest = JSON.parse(await readFile('public/site.webmanifest'));
  assert.equal(manifest.name, 'Clone Rush');
  assert.ok(!manifest.orientation, 'Both orientations must be supported');
  for (const [name, size] of [['favicon-16.png', 16], ['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    const png = await readFile(`public/assets/candy-sky-v1/icons/${name}`);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
