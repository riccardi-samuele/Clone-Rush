import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore } from '../../src/game/ProgressStore.js';

function storage(saved = null) {
  let raw = saved ? JSON.stringify(saved) : null;
  globalThis.localStorage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  return () => JSON.parse(raw);
}

test('legacy progress keeps level 18 accessible after 15 completions', () => {
  storage({ version: 1, completed: Array.from({ length: 15 }, (_, i) => i + 1), current: 18, soundVolume: 35, musicVolume: 20 });
  const progress = new ProgressStore(24);
  assert.equal(progress.isUnlocked(18), true);
  assert.equal(progress.current, 18);
  assert.equal(progress.soundVolume, 35);
  assert.equal(progress.musicVolume, 20);
  assert.equal(progress.isUnlocked(19), false);
});

test('legacy unlocks survive save and reload', () => {
  const saved = storage({ version: 1, completed: [1, 2, 3], current: 6 });
  const progress = new ProgressStore(24);
  assert.equal(progress.select(6), true);
  assert.equal(saved().campaignVersion, 2);
  assert.equal(new ProgressStore(24).isUnlocked(6), true);
  assert.equal(new ProgressStore(24).isUnlocked(7), false);
});

test('fresh campaign starts at level 1 and unlocks its successor', () => {
  storage();
  const progress = new ProgressStore(24);
  assert.equal(progress.isUnlocked(1), true);
  assert.equal(progress.isUnlocked(2), false);
  progress.complete(1);
  const restored = new ProgressStore(24);
  assert.equal(restored.isUnlocked(2), true);
  assert.equal(restored.isUnlocked(3), false);
});

test('versioned Candy Sky save does not expand its unlocked window on reload', () => {
  storage({ version: 1, campaignVersion: 2, unlockedThrough: 1, completed: [1, 2], current: 3 });
  const progress = new ProgressStore(24);
  assert.equal(progress.current, 3);
  assert.equal(progress.isUnlocked(3), true);
  assert.equal(progress.isUnlocked(4), false);
});

test('out-of-order legacy completion stays accessible without unlocking every earlier map', () => {
  storage({ version: 1, completed: [24], current: 24 });
  const progress = new ProgressStore(24);
  assert.equal(progress.current, 24);
  assert.equal(progress.isUnlocked(24), true);
  assert.equal(progress.isUnlocked(10), false);
});
