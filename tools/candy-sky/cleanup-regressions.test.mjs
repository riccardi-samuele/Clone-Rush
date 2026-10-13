import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const json = async path => JSON.parse(await readFile(path, 'utf8'));
async function files(root) {
  const result = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = `${root}/${item.name}`;
    result.push(...(item.isDirectory() ? await files(path) : [path]));
  }
  return result;
}
const fixtureFields = ['frameWidth', 'frameHeight', 'originX', 'originY', 'shapes'];
const actorFields = ['id', 'name', 'sprite', 'bodyType', 'autoScale', 'fixedRotation', 'friction', 'restitution', 'mass', 'group'];
export function physicsContract(catalog) {
  return {
    actors: [3, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 32, 35].map(id => {
      const actor = catalog.actors[id];
      const sprite = catalog.sprites[actor.sprite];
      const animation = sprite.animations.find(a => a.id === sprite.defaultAnimation) ?? sprite.animations[0];
      return { actor: Object.fromEntries(actorFields.map(k => [k, actor[k]])),
        fixture: Object.fromEntries(fixtureFields.map(k => [k, animation[k]])) };
    }),
    collisionPairs: catalog.collisionPairs,
  };
}
test('actor fixtures and physics properties match the pre-cleanup game', async () => {
  const baseline = await json('docs/cleanup/physics-contract.json');
  assert.deepEqual(physicsContract(await json('public/data/catalog.json')), baseline);
});
test('every production JavaScript module is reachable from the game or its worker', async () => {
  const visited = new Set();
  async function visit(path) {
    path = resolve(path);
    if (visited.has(path)) return;
    visited.add(path);
    const source = await readFile(path, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*|new URL\(\s*)['"](\.[^'"]+\.js)['"]/g))
      await visit(resolve(dirname(path), match[1]));
  }
  await visit('src/main.js');
  const orphans = (await files('src')).filter(p => p.endsWith('.js') && !visited.has(resolve(p)));
  assert.deepEqual(orphans, []);
});
test('boot does not load the retired pixel-art renderer, bitmap fonts or roots', async () => {
  const boot = await readFile('src/scenes/BootScene.js', 'utf8');
  for (const retired of ['load.spritesheet', 'load.bitmapFont', 'catalog.backgrounds', 'catalog.tilesets', 'candy-roots'])
    assert.equal(boot.includes(retired), false, retired);
});
test('public contains exactly the runtime assets and font license', async () => {
  const { ART_IMAGES } = await import('../../src/game/AssetManifest.js');
  const catalog = await json('public/data/catalog.json');
  const manifest = await json('public/site.webmanifest');
  const expected = new Set([
    ...Object.values(ART_IMAGES), 'assets/candy-sky-v1/frames.json',
    ...catalog.audio.flatMap(a => a.paths), ...manifest.icons.map(i => i.src.replace(/^(?:\.\/|\/)/, '')),
    'favicon.ico', 'assets/candy-sky-v1/icons/favicon-16.png', 'assets/candy-sky-v1/icons/favicon-32.png',
    'assets/candy-sky-v1/icons/apple-touch-icon.png', 'assets/fonts/Fredoka.ttf', 'assets/fonts/Fredoka-OFL.txt',
    'data/catalog.json', 'data/levels.json', 'site.webmanifest',
  ]);
  assert.deepEqual((await files('public')).map(p => relative('public', p)).sort(), [...expected].sort());
  const atlas = await json('public/assets/candy-sky-v1/frames.json');
  for (const key of Object.keys(atlas.frames)) assert.ok(ART_IMAGES[key], `Atlas without image: ${key}`);
});
test('active generated artwork retains exact bytes and provenance', async () => {
  const inventory = await json('artwork/inventory.json');
  for (const item of inventory) {
    const hash = createHash('sha256').update(await readFile(item.file)).digest('hex');
    assert.equal(hash, item.sha256, item.file);
  }
});

test('pre-cleanup Candy Sky maps preserve their geometry; the full campaign uses only native map fields', async () => {
  const data = await json('public/data/levels.json');
  const baseline = await json('docs/cleanup/map-contract.json');
  const actual = [...data.levels, data.ending].map(map => {
    for (const field of ['tileWidth', 'tileHeight', 'layers', 'terrain', 'settings', 'construction'])
      assert.equal(field in map, false, field);
    for (const actor of map.actors) for (const field of ['z', 'properties']) assert.equal(field in actor, false, field);
    const contract = { number: map.number, gravity: map.gravity, platforms: map.platforms, actors: map.actors };
    return { number: map.number, sha256: createHash('sha256').update(JSON.stringify(contract)).digest('hex') };
  });
  assert.deepEqual(actual.filter(map => baseline.some(b => b.number === map.number)), baseline);
});

test('the map authoring generator reproduces the shipped campaign without old backups', async () => {
  const work = await mkdtemp(`${tmpdir()}/clone-rush-generator-`);
  try {
    await mkdir(`${work}/public/data`, { recursive: true });
    await promisify(execFile)(process.execPath, [resolve('tools/candy-sky/create-campaign.mjs')], { cwd: work });
    assert.deepEqual(await json(`${work}/public/data/levels.json`), await json('public/data/levels.json'));
  } finally { await rm(work, { recursive: true, force: true }); }
});
