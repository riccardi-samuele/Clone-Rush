// The last camera paints above the sky, world and UI. Fading it once avoids
// a rectangular world-only veil and avoids compounding several camera fades.
function fadeCamera(scene) { return scene.hud?.camera ?? scene.cameras.main; }

export function finishReveal(scene) {
  scene.transitioning = false;
  scene.input.enabled = true;
  scene.accumulator = 0;
  scene.inputController?.clear({ keyboard: false });
}

export function reveal(scene, mode = 'fade') {
  if (mode === 'candy' || mode === 'boot') {
    scene.transitioning = true;
    scene.input.enabled = false;
  } else {
    scene.transitioning = true;
    scene.input.enabled = false;
    const camera = fadeCamera(scene);
    camera.once('camerafadeincomplete', () => finishReveal(scene));
    camera.fadeIn(500, 103, 200, 255);
  }
}

export function goTo(scene, key, data = {}, mode = 'fade') {
  if (scene.leaving || scene.transitioning) return;
  scene.leaving = true;
  scene.input.enabled = false;
  scene.inputController?.clear({ keyboard: false });
  if (mode === 'candy') {
    scene.input.enabled = false;
    scene.scene.launch('LevelTransition', { sourceKey: scene.scene.key, targetKey: key, targetData: data });
  } else {
    const camera = fadeCamera(scene);
    camera.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
    camera.fadeOut(500, 103, 200, 255);
  }
}
