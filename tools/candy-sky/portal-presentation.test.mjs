import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const module = await import('../../src/game/PortalPresentation.js').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const presentation = (instance, platforms) => {
  assert.equal(typeof module.portalPresentation, 'function', 'portal placement must select a distinct suspended appearance');
  return module.portalPresentation(instance, platforms, { frameWidth: 40, frameHeight: 40 });
};
const exit = { type: 5, x: 100, y: 100 };
const floor = { x: 80, y: 140, width: 100, height: 20 };

test('grounded portals keep their pedestal artwork', () => assert.equal(presentation(exit, [floor]), 'grounded'));
test('unsupported portals select the floating ring', () => assert.equal(presentation(exit, []), 'floating'));
test('a ceiling above a portal is not floor support', () => assert.equal(presentation(exit, [{ ...floor, y: 80, undersideSupport: true }]), 'floating'));
test('a nearby island outside the foot center does not support a portal', () => assert.equal(presentation(exit, [{ ...floor, x: 121 }]), 'floating'));
test('an edge directly under the center supports a grounded portal', () => assert.equal(presentation(exit, [{ ...floor, x: 120 }]), 'grounded'));
test('scaled portal foot and center determine support', () => assert.equal(presentation({ ...exit, scaleX: 2, scaleY: 2 }, [{ ...floor, x: 140, y: 180 }]), 'grounded'));
test('portal geometry requires authored islands', () => assert.throws(() => presentation(exit, null), TypeError));
test('a distant lower floor does not give a suspended portal a pedestal', () => assert.equal(presentation(exit, [{ ...floor, y: 300 }]), 'floating'));
test('both normal and single-use suspended portals select floating appearance', () => assert.equal(presentation({ ...exit, type: 15 }, []), 'floating'));
test('all current suspended portals are recognized from geometry', async () => {
  const data = JSON.parse(await readFile('public/data/levels.json', 'utf8'));
  const suspended = [];
  for (const level of [...data.levels, data.ending]) for (const actor of level.actors.filter(a => [5, 15].includes(a.type))) {
    if (presentation(actor, level.platforms) === 'floating') suspended.push([level.number ?? 0, actor.instance, actor.type]);
  }
  assert.deepEqual(suspended, [[18, 3, 5], [19, 4, 5], [20, 4, 5], [21, 7, 5], [23, 8, 15], [23, 10, 5], [24, 7, 5], [28, 7, 15], [28, 8, 5], [30, 9, 5], [31, 9, 5], [32, 12, 5], [0, 5, 5]]);
});
