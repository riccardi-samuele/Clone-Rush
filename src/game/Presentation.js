import { createRoyalSprite } from './RoyalGameplay.js';

export function actorAnimation(catalog, type, name) {
  const actor = catalog.actors[type];
  if (!actor) return null;
  const sprite = catalog.sprites[actor.sprite];
  if (!sprite) return null;
  return sprite.animations.find((animation) => animation.name === name)
    ?? sprite.animations.find((animation) => animation.id === sprite.defaultAnimation)
    ?? sprite.animations[0];
}

export function createActorSprite(scene, catalog, type, x, y, name) {
  const animation = actorAnimation(catalog, type, name);
  if (!animation) throw new Error(`Missing visual data for actor ${type}`);
  const sprite = createRoyalSprite(scene, type, x, y, name, animation);
  if (!sprite) throw new Error(`Unsupported Candy Sky actor ${type}`);
  return sprite;
}
