import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLab, levels } from './puzzle-lab.mjs';

const data = JSON.parse(await readFile('public/data/levels.json', 'utf8'));
const solutions = JSON.parse(await readFile('docs/campaign/candy-sky-v2/solutions.json', 'utf8'));

test('retired tile maps fail explicitly instead of silently synthesizing geometry', () => {
  const legacy = structuredClone(levels[0]);
  delete legacy.platforms;
  assert.throws(() => createLab(1, legacy), /native floating islands/);
});

for (const [number, approach] of [[19, 110], [20, 110], [23, 150]]) {
  test(`level ${number}: a missed gravity jump cannot strand the player on a spare ceiling`, () => {
    const lab = createLab(number);
    const result = lab.run([[1, approach, false], [0, 250, false]]);
    assert.equal(result.status, 'dead', `Missed jump left a live team trapped: ${JSON.stringify(result.clones)}`);
  });
}

for (const jumpAt of [0, 20, 40, 60, 80, 100, 120, 160]) {
  test(`level 18: a downward jump at ${jumpAt * 10}ms returns to a safe support`, () => {
    const lab = createLab(18);
    const result = lab.run([[1, jumpAt, false], [0, 100, true], [0, 100, false]]);
    assert.equal(result.status, 'playing');
    assert.ok(result.clones[0].ground <= 2, 'The gravity introduction must allow another jump');
    assert.ok(Math.abs(result.clones[0].v.y) < .01);
  });
}

test('level 18: walking without jumping leaves a recoverable route', () => {
  const lab = createLab(18);
  const result = lab.run([[1, 110, false], [0, 250, false]]);
  assert.equal(result.status, 'playing');
  assert.ok(result.clones[0].ground <= 2);
});

test('level 18: ceiling adhesion never cancels a downward jump', () => {
  const lab = createLab(18);
  lab.run([[0, 100, false]]);
  const start = lab.state().clones[0].y;
  lab.step(0, true);
  assert.ok(lab.state().clones[0].v.y > 300);
  const falling = lab.run([[0, 20, false]]);
  assert.ok(falling.clones[0].y > start + 40);
  assert.ok(falling.clones[0].ground > 3);
  const returned = lab.run([[0, 100, false]]);
  assert.equal(returned.status, 'playing');
  assert.ok(returned.clones[0].ground <= 2);
});

for (const direction of [-1, 1]) {
  test(`level 18: walking off the ${direction < 0 ? 'left' : 'right'} edge cannot leave an invisible support`, () => {
    assert.equal(createLab(18).run([[direction, 330, false], [0, 200, false]]).status, 'dead');
  });
}

for (const number of [18, 19, 20, 21, 23, 24]) {
  test(`level ${number}: ten fixed-step replays produce identical complete traces`, () => {
    const actions = solutions.levels.find(s => s.number === number).actions;
    const expected = createLab(number).run(actions, true);
    assert.equal(expected.status, 'complete');
    for (let repeat = 0; repeat < 9; repeat++) assert.deepEqual(createLab(number).run(actions, true), expected);
  });
}

for (const level of [...levels, data.ending]) {
  const number = level.number ?? 0;
  test(`level ${number || 'ending'}: safe initial spawn and finite bodies`, () => {
    const lab = createLab(number, level);
    const result = lab.run([[0, 200, false]]);
    assert.equal(result.status, 'playing');
    for (const clone of result.clones) {
      assert.ok(Number.isFinite(clone.x) && Number.isFinite(clone.y));
      assert.ok(clone.ground <= 2, `Clone ${clone.type} has no stable starting support`);
      assert.ok(Math.abs(clone.v.y) < .01);
    }
  });
  test(`level ${number || 'ending'}: the whole team can finish`, () => {
    const candidate = number ? solutions.levels.find(s => s.number === number) : solutions.ending;
    const actions = candidate.actions.map(action => [...action]);
    actions.at(-1)[1] += 30;
    assert.equal(createLab(number, level).run(actions).status, 'complete');
  });
}
