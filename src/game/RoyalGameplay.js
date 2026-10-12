import { smoothUiTexture } from './RenderQuality.js';
import { drawGeneratedTerrain } from './GeneratedTerrain.js';
export { GeneratedWorldEffects as RoyalWorldEffects } from './GeneratedWorldEffects.js';

const CLONES = { 3: 'normal', 17: 'reverse', 19: 'nojump', 25: 'slide', 35: 'gravity' };
const OBJECTS = { 5: 'portal', 15: 'unstable', 32: 'key', 9: 'spike', 11: 'spikes2', 13: 'spikes4', 23: 'bounce' };
const PARTICLE_COLORS = { Normal: 0xffffff, Reverse: 0xff818c, Nojump: 0x94ffbf, Slide: 0xffdd68, Gravity: 0xc59fff };

export function registerRoyalGameplayTextures(scene) {
  const data = scene.cache.json.get('gameplay-art-frames');
  for (const [key, frames] of Object.entries(data.frames)) {
    const texture = scene.textures.get(key);
    smoothUiTexture(scene, key);
    for (const [name, rect] of Object.entries(frames)) {
      if (!texture.has(name)) texture.add(name, 0, ...rect);
    }
  }
}

// The generated visuals use the original dimensions; Matter fixtures stay in LevelWorld.
export function createRoyalSprite(scene, type, x, y, name, animation) {
  let key;
  let frame;
  if (CLONES[type]) { key = 'gameplay-clones-sheet'; frame = CLONES[type]; }
  else if (OBJECTS[type]) { key = 'gameplay-objects-sheet'; frame = OBJECTS[type]; }
  else if (type === 21) { key = 'gameplay-clones-sheet'; frame = 'shard'; }
  else return null;
  if ([5, 15].includes(type)) key = 'gameplay-portals-sheet';
  const sprite = scene.add.sprite(x, y, key, frame).setOrigin(0)
    .setDisplaySize(animation.frameWidth, animation.frameHeight);
  sprite.royalRole = frame;
  if (type === 35) sprite.setFlipY(true);
  if (type === 21) sprite.setTint(PARTICLE_COLORS[name] ?? 0xffffff);
  return sprite;
}

export function animateRoyalClone(clone) {
  const sprite = clone.sprite;
  if (!sprite.royalRole || clone.state !== 'playing') return;
  const velocity = clone.velocity();
  const time = clone.world.visualTime + clone.body.id * 0.63;
  const grounded = clone.groundFrames < 3;
  const moving = Math.abs(velocity.x) > 12;
  const sway = Math.sin(time * (moving ? 14 : 2.6));
  const squash = grounded ? moving ? sway * 0.025 : sway * 0.008
    : Math.max(-0.055, Math.min(0.055, velocity.y / 6000));
  sprite.setDisplaySize(20 * (1 + squash), 20 * (1 - squash))
    .setAngle(grounded ? velocity.x / 150 * 3 + (moving ? sway : 0) : velocity.x / 150 * 4);
  if (grounded) sprite.y += (20 - sprite.displayHeight) * (clone.type === 35 ? -0.5 : 0.5);
}

export function drawRoyalLevel(scene, model) {
  scene.game.canvas.style.imageRendering = 'auto';
  scene.cameras.main.setBackgroundColor('#67c8ff');
  scene.background = scene.add.image(0, 0, 'gameplay-background').setDepth(-10000);
  drawGeneratedTerrain(scene, model);
}
