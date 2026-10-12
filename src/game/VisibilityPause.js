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
  page.addEventListener('visibilitychange', onVisibility);
  host.addEventListener('pagehide', hide);
  host.addEventListener('pageshow', onVisibility);
  game.events.once('destroy', () => {
    page.removeEventListener('visibilitychange', onVisibility);
    host.removeEventListener('pagehide', hide);
    host.removeEventListener('pageshow', onVisibility);
  });
  if (page.hidden) hide();
}
