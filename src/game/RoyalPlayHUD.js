import Phaser from 'phaser';
import { VIEW } from './constants.js';
import { goTo } from './Transitions.js';
import { CANDY_UI, CANDY_ICONS, candyText, candyButton, bindResize, cover } from './CandySky.js';
import { GravityTutorial } from './GravityPresentation.js';

export class RoyalPlayHUD {
  constructor(scene) {
    this.scene = scene;
    const worldObjects = new Set(scene.children.list);
    this.badge = scene.add.image(0, 0, CANDY_UI, 'pill').setDepth(600);
    this.number = candyText(scene, scene.scene.key === 'Ending' ? 'FINALE'
      : `LEVEL ${scene.number} / ${scene.progress.levelCount}`, 12).setDepth(601);
    this.logo = scene.add.image(0, 0, 'candy-logo', 'logo').setDepth(600);
    this.pauseBadge = candyButton(scene, 'pill', () => this.togglePause(), 600);
    this.pauseLabel = candyText(scene, 'PAUSE', 12).setDepth(601);
    this.pause = scene.add.image(0, 0, CANDY_ICONS, 'pause').setDepth(601);
    this.mobile = Boolean(navigator.maxTouchPoints || 'ontouchstart' in window);
    this.touchPlates = [];
    if (this.mobile) {
      for (const action of ['left', 'right', 'up']) {
        scene.inputController.addButton(action, 0, 0, { width: 58, height: 58 });
        this.touchPlates.push(scene.add.image(0, 0, CANDY_UI, 'round').setOrigin(0).setDepth(499));
      }
    }
    this.shade = scene.add.rectangle(0, 0, 1, 1, 0x8bd5f9, .66).setDepth(1000).setInteractive();
    this.panel = scene.game.renderer.type === Phaser.WEBGL
      ? scene.add.nineslice(0, 0, CANDY_UI, 'panel', 600, 420, 90, 90, 65, 65).setScale(.5)
      : scene.add.image(0, 0, CANDY_UI, 'panel').setDisplaySize(300, 210);
    this.panel.setDepth(1001);
    this.title = candyText(scene, 'PAUSED', 28).setDepth(1003);
    this.actions = ['resume', 'restart', 'back'].map((frame, index) => {
      const callback = [() => this.togglePause(), () => scene.restart(), () => goTo(scene, 'LevelSelect')][index];
      return { plate: candyButton(scene, 'round', callback, 1004),
        icon: scene.add.image(0, 0, CANDY_ICONS, frame).setDepth(1005) };
    });
    this.labels = ['Resume', 'Restart', 'Levels'].map(text => candyText(scene, text, 13).setDepth(1005));
    this.pausedItems = [this.shade, this.panel, this.title,
      ...this.actions.flatMap(action => [action.plate, action.icon]), ...this.labels];
    this.pausedItems.forEach(item => item.setVisible(false));
    this.gravityTutorial = scene.scene.key !== 'Ending' && scene.number === 18
      ? new GravityTutorial(scene) : null;
    // The world has a cropped viewport; sky and controls occupy the full screen.
    this.camera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'candy-ui');
    this.backdropCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'candy-sky');
    Phaser.Utils.Array.MoveTo(scene.cameras.cameras, this.backdropCamera, 0);
    this.camera.ignore([...worldObjects]);
    const uiObjects = scene.children.list.filter(object => !worldObjects.has(object));
    scene.cameras.main.ignore([...uiObjects, scene.background]);
    this.backdropCamera.ignore(scene.children.list.filter(object => object !== scene.background));
    this.filterNewObject = object => {
      this.camera.ignore(object);
      this.backdropCamera.ignore(object);
    };
    scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.filterNewObject);
    scene.events.once('shutdown', () => scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.filterNewObject));
    bindResize(scene, () => this.layout());
    this.layout();
  }

  togglePause() {
    const scene = this.scene;
    if (!['playing', 'paused'].includes(scene.status) || scene.leaving || scene.transitioning) return;
    const paused = scene.status !== 'paused';
    scene.status = paused ? 'paused' : 'playing';
    scene.accumulator = 0;
    scene.inputController.clear();
    this.pausedItems.forEach(item => item.setVisible(paused));
    this.touchPlates.forEach(item => item.setVisible(!paused));
    scene.inputController.buttons.forEach(button => {
      button.sprite.setVisible(!paused);
      button.hit.setVisible(!paused);
    });
  }

  layout() {
    const scene = this.scene;
    const { width, height } = scene.scale.gameSize;
    const density = scene.scale.displayScale.x;
    const portrait = height > width;
    const w = portrait ? 900 : 1672, h = Math.max(portrait ? 1420 : 941, w * height / width);
    const uiZoom = Math.min(width / w, height / h), cssZoom = uiZoom / density;
    const cx = w / 2, cy = h / 2;
    const bounds = { x: cx - width / uiZoom / 2, y: cy - height / uiZoom / 2,
      width: width / uiZoom, height: height / uiZoom };
    for (const camera of [this.camera, this.backdropCamera]) {
      camera.setRoundPixels(false).setViewport(0, 0, width, height).setZoom(uiZoom).centerOn(cx, cy);
    }
    cover(scene.background, bounds.x, bounds.y, bounds.width, bounds.height);
    const short = height / density < 500;
    const topPixels = (portrait ? 130 : short ? 67 : 125) * density;
    const bottomPixels = (this.mobile ? short ? 66 : 86 : 22) * density;
    const availableHeight = Math.max(80 * density, height - topPixels - bottomPixels);
    // Include complete island profiles, portal glows and the entry particles.
    const worldWidth = VIEW.width + 56, worldHeight = VIEW.height + 64;
    const zoom = Math.min(width * (portrait ? .96 : .92) / worldWidth, availableHeight / worldHeight);
    const playWidth = worldWidth * zoom, playHeight = worldHeight * zoom;
    scene.cameras.main.setBackgroundColor('rgba(0,0,0,0)').setRoundPixels(false)
      .setViewport((width - playWidth) / 2, topPixels + (availableHeight - playHeight) / 2, playWidth, playHeight)
      .setZoom(zoom).centerOn(VIEW.width / 2, VIEW.height / 2 + 4);
    const badgeWidth = portrait ? 350 : 310, badgeHeight = portrait ? 112 : 85;
    const headerY = bounds.y + (portrait ? 220 : 58);
    this.badge.setPosition(bounds.x + 28 + badgeWidth / 2, headerY).setDisplaySize(badgeWidth, badgeHeight);
    this.number.setPosition(this.badge.x, headerY).setFontSize(portrait ? 37 : 38).setScale(1);
    this.logo.setPosition(cx, bounds.y + (portrait ? 85 : 70)).setDisplaySize(portrait ? 260 : 275, portrait ? 121 : 128);
    this.pauseBadge.setPosition(bounds.x + bounds.width - 28 - badgeWidth / 2, headerY).setDisplaySize(badgeWidth, badgeHeight);
    this.pause.setPosition(this.pauseBadge.x - badgeWidth * .27, headerY).setDisplaySize(38, 41);
    this.pauseLabel.setPosition(this.pauseBadge.x + badgeWidth * .10, headerY).setFontSize(38).setScale(1);
    const hitHeight = Math.max(badgeHeight, 44 / cssZoom);
    this.pauseBadge.input.hitArea.setTo(0, (this.pauseBadge.height - hitHeight / this.pauseBadge.scaleY) / 2,
      this.pauseBadge.width, hitHeight / this.pauseBadge.scaleY);
    this.shade.setPosition(cx, cy).setSize(bounds.width, bounds.height);
    this.panel.setPosition(cx, cy).setScale(1);
    this.title.setPosition(cx, cy - 120).setFontSize(Math.max(52, 20 / cssZoom));
    const actionSize = Math.max(106, 44 / cssZoom);
    const actionSpacing = Math.max(155, actionSize + 24);
    this.actions.forEach((action, i) => {
      action.plate.setPosition(cx + (i - 1) * actionSpacing, cy + 14).setDisplaySize(actionSize, actionSize);
      action.icon.setPosition(action.plate.x, action.plate.y).setDisplaySize(57, 57);
    });
    this.labels.forEach((label, i) => label.setPosition(cx + (i - 1) * actionSpacing, cy + 14 + actionSize / 2 + 28)
      .setFontSize(Math.max(25, 12 / cssZoom)).setScale(1));
    const touchSize = Math.max(100, 52 / cssZoom);
    scene.inputController.buttons.forEach((button, index) => {
      const bx = button.action === 'left' ? bounds.x + 28 : button.action === 'right' ? bounds.x + 46 + touchSize : bounds.x + bounds.width - touchSize - 28;
      const by = bounds.y + bounds.height - touchSize - 24;
      button.hit.setPosition(bx, by).setSize(touchSize, touchSize);
      button.sprite.setPosition(bx + touchSize * .17, by + touchSize * .17).setDisplaySize(touchSize * .66, touchSize * .66);
      this.touchPlates[index].setPosition(bx, by).setDisplaySize(touchSize, touchSize);
    });
    this.gravityTutorial?.layout(bounds, portrait, cssZoom);
  }
}
