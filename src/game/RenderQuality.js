// Keep backing pixels separate from CSS pixels, including touch coordinate mapping.
export function installDisplayResolution(game) {
  let previous = '';
  const resize = () => {
    const bounds = game.canvas.parentElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const density = Math.max(1, Math.min(window.devicePixelRatio || 1, 2,
      Math.sqrt(6_000_000 / (bounds.width * bounds.height))));
    const key = `${bounds.width}:${bounds.height}:${density}`;
    if (key === previous) return;
    previous = key;
    game.scale.zoom = 1 / density;
    game.scale.resize(Math.round(bounds.width * density), Math.round(bounds.height * density));
    game.canvas.style.width = `${bounds.width}px`;
    game.canvas.style.height = `${bounds.height}px`;
    game.scale.refresh();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(game.canvas.parentElement);
  window.addEventListener('resize', resize);
  game.events.once('destroy', () => {
    observer.disconnect();
    window.removeEventListener('resize', resize);
  });
  resize();
}

export const ROYAL_TEXT = Object.freeze({
  fontFamily: 'Royal UI, sans-serif', fontStyle: 'bold', resolution: 3,
});

// Padding to powers of two enables trilinear minification in WebGL 1 as well.
// Source artwork and atlas coordinates remain unchanged; only GPU sampling changes.
export function addUiTexture(game, key, image) {
  const width = image.width;
  const height = image.height;
  const canvas = document.createElement('canvas');
  canvas.width = 2 ** Math.ceil(Math.log2(width));
  canvas.height = 2 ** Math.ceil(Math.log2(height));
  canvas.getContext('2d').drawImage(image, 0, 0);
  if (game.textures.exists(key)) game.textures.remove(key);
  const texture = game.textures.addCanvas(key, canvas);
  texture.get().setSize(width, height);
  texture.royalMipmapped = true;
  return texture;
}

export function prepareUiTexture(game, key) {
  const original = game.textures.get(key);
  if (original.royalMipmapped) return;
  return addUiTexture(game, key, original.getSourceImage());
}

export function smoothUiTexture(scene, key) {
  const texture = scene.textures.get(key);
  // setFilter would overwrite the mipmap minification filter with ordinary LINEAR.
  if (!texture.royalMipmapped) texture.setFilter(0);
}
