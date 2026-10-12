import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import contour from '../../src/game/candy-island-contour.json' with { type: 'json' };
import { islandStripLayout, islandUndersideAt, islandCollisionPolygons } from '../../src/game/CandyIslandGeometry.js';

test('island collision metadata matches the actual approved PNG', async () => {
  assert.equal(createHash('sha256').update(await readFile(contour.source)).digest('hex'), contour.sha256);
});

test('longer gravity islands repeat artwork without stretching it', () => {
  const short = { x: 40, y: 100, width: 140, height: 20, undersideSupport: true };
  const long = { ...short, width: 400 };
  assert.equal(islandStripLayout(short).scale, islandStripLayout(long).scale);
  assert.equal(islandStripLayout(short).leftWidth, islandStripLayout(long).leftWidth);
  const period = (contour.profile.right - contour.profile.left) * islandStripLayout(long).scale;
  assert.ok(Math.abs(islandUndersideAt(long, 100) - islandUndersideAt(long, 100 + period)) < 1e-9);
});

test('every gravity island has a finite continuous collision profile with a flat upper surface', async () => {
  const maps = JSON.parse(await readFile('public/data/levels.json', 'utf8'));
  for (const map of [...maps.levels, maps.ending]) for (const p of map.platforms.filter(p => p.undersideSupport)) {
    const polygons = islandCollisionPolygons(p);
    assert.equal(polygons[0][0].x, p.x);
    assert.equal(polygons.at(-1)[1].x, p.x + p.width);
    for (const [i, polygon] of polygons.entries()) {
      assert.equal(polygon[0].y, p.y); assert.equal(polygon[1].y, p.y);
      for (const v of polygon) assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
      assert.ok(polygon[2].y > p.y && polygon[3].y > p.y);
      if (i) { assert.deepEqual(polygon[0], polygons[i - 1][1]); assert.deepEqual(polygon[3], polygons[i - 1][2]); }
    }
  }
});
