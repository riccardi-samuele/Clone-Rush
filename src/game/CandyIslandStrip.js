import { prepareUiTexture } from './RenderQuality.js';
import { ISLAND_PROFILE as PROFILE, islandStripLayout } from './CandyIslandGeometry.js';

const SOURCE = 'gameplay-islands-sheet';
const LEFT = 'candy-island-left';
const RIGHT = 'candy-island-right';
const MIDDLE = 'candy-island-repeat';

// Source-pixel coordinates in the approved long island. The two central
// boundaries have matching candy phases and similar cloud silhouettes.

function prepareStrip(scene) {
  const textures = scene.textures;
  if (textures.exists(LEFT)) return;
  const source = textures.get(SOURCE).getSourceImage();
  const { x, y, end, height, left, right, feather } = PROFILE;
  for (const [key, start, width, fadeAtEnd] of [
    [LEFT, x, left - x + feather, true],
    [RIGHT, right - feather, end - right + feather, false],
  ]) {
    const texture = textures.createCanvas(key, width, height);
    const ctx = texture.context;
    ctx.drawImage(source, start, y, width, height, 0, 0, width, height);
    // Blend only the join, without resampling any of the source details.
    const gradient = ctx.createLinearGradient(fadeAtEnd ? width - feather : 0, 0,
      fadeAtEnd ? width : feather, 0);
    gradient.addColorStop(0, fadeAtEnd ? '#fff' : 'transparent');
    gradient.addColorStop(1, fadeAtEnd ? 'transparent' : '#fff');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gradient;
    // destination-in affects the whole canvas; the gradient's opaque outer
    // stop must cover the rest of the cap as well as its feathered join.
    ctx.fillRect(0, 0, width, height);
    texture.refresh();
    prepareUiTexture(scene.game, key);
  }
  const atlas = textures.get(SOURCE);
  if (!atlas.has(MIDDLE)) atlas.add(MIDDLE, 0, left, y, right - left, height);
}

export function drawCandyIslandStrip(scene, platform) {
  prepareStrip(scene);
  const { height, feather } = PROFILE;
  // One uniform scale for both axes, independent of platform length.
  const { scale, width, leftWidth, rightWidth, start, top } = islandStripLayout(platform);
  if (!platform.undersideSupport && width <= leftWidth + rightWidth + 4) {
    // The compact silhouette keeps its aspect ratio too; it is never flattened.
    const frame = scene.textures.getFrame(SOURCE, 'small');
    scene.add.image(platform.x + platform.width / 2, platform.y, SOURCE, 'small')
      .setOrigin(.5, 100 / frame.height).setScale(width / frame.width).setDepth(0);
    return;
  }
  const middleWidth = width - leftWidth - rightWidth;
  // TileSprite changes the visible length, not the size of the tile artwork.
  if (middleWidth > 0) {
    // Keep its internal canvas in integer source pixels, then uniformly scale
    // the object. Fractional internal sizes would invalidate Phaser's canvas
    // cache every frame. Rounding up gives <1 source pixel of hidden overlap.
    scene.add.tileSprite(start + leftWidth, top, Math.ceil(middleWidth / scale), height, SOURCE, MIDDLE)
      .setOrigin(0).setScale(scale).setDepth(0);
  }
  // Short supports overlap the caps instead of reducing their depth.
  scene.add.image(start, top, LEFT).setOrigin(0).setScale(scale).setDepth(0);
  scene.add.image(start + width - rightWidth - feather * scale, top, RIGHT)
    .setOrigin(0).setScale(scale).setDepth(0);
}
