// Portal appearance follows geometry, not campaign numbering or clone type.
export function portalPresentation(instance, platforms, animation) {
  const centerX = instance.x + animation.frameWidth * (instance.scaleX ?? 1) / 2;
  const footY = instance.y + animation.frameHeight * (instance.scaleY ?? 1);
  const supported = platforms.some(platform => centerX >= platform.x
    && centerX <= platform.x + platform.width && Math.abs(platform.y - footY) <= 1);
  return supported ? 'grounded' : 'floating';
}

// Measured aperture centers in the unmodified 768×1024 imagegen atlas cells.
export const FLOATING_PORTAL_ORIGINS = Object.freeze({
  5: Object.freeze({ x: 398 / 768, y: 487.5 / 1024 }),
  15: Object.freeze({ x: 375 / 768, y: 487.5 / 1024 }),
});
