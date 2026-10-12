export function installVisibilityPause(game, page = document, host = window) {
  let suspended = false;
  const hide = () => {
    if (suspended) return;
    suspended = true;
    for (const scene of game.scene.getScenes(true)) {
      scene.inputController?.clear();
      if (scene.status === 'playing') scene.hud?.togglePause(true);
    }
    game.sound.pauseAll();
  };
  const show = () => {
    if (!suspended || page.hidden) return;
    for (const scene of game.scene.getScenes(true)) {
      scene.inputController?.clear();
      if (scene.status === 'playing') scene.hud?.togglePause(true);
    }
    suspended = false;
    game.sound.resumeAll();
  };
  const onVisibility = () => page.hidden ? hide() : show();
  // WebKit may leave WebAudio suspended after returning from the background.
  // resume() must run directly inside the next user gesture on iOS.
  const resumeAudioOnGesture = () => {
    if (page.hidden) return;
    const context = game.sound.context;
    if (context?.state !== 'suspended' && context?.state !== 'interrupted') return;
    context.resume().catch(() => {});
  };
  page.addEventListener('visibilitychange', onVisibility);
  page.addEventListener('touchend', resumeAudioOnGesture);
  page.addEventListener('click', resumeAudioOnGesture);
  host.addEventListener('pagehide', hide);
  host.addEventListener('pageshow', onVisibility);
  game.events.once('destroy', () => {
    page.removeEventListener('visibilitychange', onVisibility);
    page.removeEventListener('touchend', resumeAudioOnGesture);
    page.removeEventListener('click', resumeAudioOnGesture);
    host.removeEventListener('pagehide', hide);
    host.removeEventListener('pageshow', onVisibility);
  });
  if (page.hidden) hide();
}
