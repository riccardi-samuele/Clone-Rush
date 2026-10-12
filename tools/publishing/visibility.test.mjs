import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { installVisibilityPause } from '../../src/game/VisibilityPause.js';

function target() {
  const listeners = new Map();
  return { hidden: false, addEventListener(event, fn) { listeners.set(event, fn); },
    removeEventListener(event) { listeners.delete(event); },
    dispatch(event) { listeners.get(event)?.(); }, listeners };
}

test('hiding the tab pauses gameplay and audio; returning leaves gameplay paused', () => {
  const page = target(), host = target(), events = new EventEmitter();
  const calls = [];
  const scene = { status: 'playing', inputController: { clear: () => calls.push('clear') },
    hud: { togglePause() { scene.status = 'paused'; calls.push('pause'); } } };
  const game = { events, scene: { getScenes: () => [scene] }, sound: {
    pauseAll: () => calls.push('mute'), resumeAll: () => calls.push('unmute') } };
  installVisibilityPause(game, page, host);
  page.hidden = true; page.dispatch('visibilitychange'); page.dispatch('visibilitychange');
  assert.deepEqual(calls, ['clear', 'pause', 'mute']);
  page.hidden = false; page.dispatch('visibilitychange');
  assert.deepEqual(calls, ['clear', 'pause', 'mute', 'clear', 'unmute']);
  assert.equal(scene.status, 'paused');
  events.emit('destroy'); assert.equal(page.listeners.size, 0); assert.equal(host.listeners.size, 0);
});

test('hiding during a level transition still pauses the next playable frame', () => {
  const page = target(), host = target(), events = new EventEmitter();
  const scene = { status: 'playing', transitioning: true, inputController: { clear() {} },
    hud: { togglePause(force) { if (!force && scene.transitioning) return; scene.status = 'paused'; } } };
  const game = { events, scene: { getScenes: () => [scene] }, sound: { pauseAll() {}, resumeAll() {} } };
  installVisibilityPause(game, page, host);
  page.hidden = true; page.dispatch('visibilitychange');
  assert.equal(scene.status, 'paused');
});

test('a foreground touch resumes an iOS-interrupted audio context', async () => {
  const page = target(), host = target(), events = new EventEmitter();
  const calls = [];
  const context = { state: 'running', resume() {
    calls.push('context-resume'); this.state = 'running'; return Promise.resolve();
  } };
  const game = { events, scene: { getScenes: () => [] }, sound: {
    context, pauseAll: () => calls.push('pause'), resumeAll: () => calls.push('resume-all'),
  } };
  installVisibilityPause(game, page, host);
  page.hidden = true; page.dispatch('visibilitychange');
  context.state = 'interrupted';
  page.dispatch('touchend');
  assert.deepEqual(calls, ['pause']);
  page.hidden = false; page.dispatch('visibilitychange');
  assert.deepEqual(calls, ['pause', 'resume-all']);
  context.state = 'suspended';
  page.dispatch('touchend');
  assert.deepEqual(calls, ['pause', 'resume-all', 'context-resume']);
  page.dispatch('click');
  assert.equal(calls.filter(call => call === 'context-resume').length, 1);
  events.emit('destroy');
  assert.equal(page.listeners.size, 0);
});
