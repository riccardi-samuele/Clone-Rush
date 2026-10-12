import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { LevelTransitionScene } from './scenes/LevelTransitionScene.js';
import { VIEW } from './game/constants.js';
import { installDisplayResolution } from './game/RenderQuality.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  title: 'Clone Rush',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#10102c',
  // Raster art and high-resolution glyphs already contain antialiased edges.
  // Avoid an extra multisample framebuffer, especially on mobile GPUs.
  render: { antialias: true, antialiasGL: false, pixelArt: false, roundPixels: false,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
  callbacks: { postBoot: installDisplayResolution },
  input: { activePointers: 4, keyboard: { capture: [37, 38, 39, 40, 32] } },
  physics: { default: 'matter', matter: {
    gravity: { x: 0, y: 0 }, enableSleeping: false, autoUpdate: false,
    positionIterations: 8, velocityIterations: 8,
  } },
  scene: [BootScene, MenuScene, LevelSelectScene, PlayScene, EndingScene, LevelTransitionScene],
});
