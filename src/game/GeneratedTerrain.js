import { drawCandyIslandStrip } from './CandyIslandStrip.js';

// Rendering and Matter share authored floating islands without moving actors.
export function floatingMap(level) {
  if (!Array.isArray(level.platforms)) throw new Error('Map requires native floating islands');
  return {
    platforms: level.platforms.map(platform => ({ height: 20, ...platform })),
    actors: level.actors.map(actor => ({ ...actor })),
  };
}

export function drawGeneratedTerrain(scene, model) {
  for (const platform of model.platforms) drawCandyIslandStrip(scene, platform);
}
