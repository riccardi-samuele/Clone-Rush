import { ROYAL_TEXT } from './RenderQuality.js';

export const CANDY_UI = 'candy-panels';
export const CANDY_ICONS = 'gameplay-hud-sheet';
const CANDY_INK = '#0742b9';

export function candyText(scene, text, size = 30) {
  return scene.add.text(0, 0, text, { ...ROYAL_TEXT, fontSize: `${size}px`, color: CANDY_INK,
    align: 'center' }).setOrigin(.5);
}
export function cover(image, x, y, width, height) {
  if (image.texture.key.startsWith('gameplay-background')) {
    image.setTexture(height > width ? 'gameplay-background-portrait' : 'gameplay-background');
  }
  const scale = Math.max(width / image.width, height / image.height);
  image.setPosition(x + width / 2, y + height / 2).setScale(scale);
}
export function screenLayout(scene, portraitHeight = 1250) {
  const { width, height } = scene.scale.gameSize;
  const portrait = height > width;
  const w = portrait ? 900 : 1672;
  const h = Math.max(portrait ? portraitHeight : 941, w * height / width);
  const zoom = Math.min(width / w, height / h);
  scene.cameras.main.setRoundPixels(false).setViewport(0, 0, width, height)
    .setZoom(zoom).centerOn(w / 2, h / 2);
  const bounds = { x: (w - width / zoom) / 2, y: (h - height / zoom) / 2,
    width: width / zoom, height: height / zoom };
  return { w, h, portrait, x: w / 2, bounds };
}
export function bindResize(scene, callback) {
  scene.scale.on('resize', callback);
  scene.events.once('shutdown', () => scene.scale.off('resize', callback));
}
export function fitTouchTarget(image, scene, camera = scene.cameras.main) {
  const cssZoom = camera.zoom * scene.game.canvas.getBoundingClientRect().width / scene.game.canvas.width;
  const width = Math.max(image.width, 44 / cssZoom / Math.abs(image.scaleX));
  const height = Math.max(image.height, 44 / cssZoom / Math.abs(image.scaleY));
  image.input.hitArea.setTo((image.width - width) / 2, (image.height - height) / 2, width, height);
}
export function candyButton(scene, frame, callback, depth = 5) {
  const image = scene.add.image(0, 0, CANDY_UI, frame).setDepth(depth)
    .setInteractive({ useHandCursor: true });
  const reset = () => image.clearTint();
  image.on('pointerover', () => image.setTint(0xe0f8ff));
  image.on('pointerout', reset);
  image.on('pointerup', reset);
  image.on('pointerdown', () => {
    if (scene.leaving || scene.transitioning || scene.cameras.main.fadeEffect.isRunning) return;
    scene.registry.get('audio')?.start();
    image.setTint(0xe4eaff);
    callback();
  });
  return image;
}
