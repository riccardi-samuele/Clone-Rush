import { CANDY_UI, CANDY_ICONS, candyText, cover, screenLayout, bindResize, candyButton, fitTouchTarget } from './CandySky.js';
import { CandyMenuMotion } from './CandyMenuMotion.js';

export class RoyalLobby {
  constructor(scene) {
    this.scene = scene;
    this.background = scene.add.image(0, 0, 'gameplay-background').setDepth(-10);
    this.logo = scene.add.image(0, 0, 'candy-logo', 'logo').setDepth(2);
    this.hero = scene.add.image(0, 0, 'candy-hero', 'hero').setDepth(2);
    this.start = candyButton(scene, 'play', () => scene.startGame());
    this.sliders = ['sound', 'music'].map((kind, index) => {
      const panel = scene.add.image(0, 0, CANDY_UI, 'pill').setDepth(3);
      const icon = scene.add.image(0, 0, CANDY_ICONS, kind).setDepth(4);
      const label = candyText(scene, kind.toUpperCase(), 25).setDepth(4);
      const track = scene.add.image(0, 0, CANDY_UI, 'slider-track').setOrigin(0, .5).setDepth(4);
      const fill = scene.add.image(0, 0, CANDY_UI, 'slider-fill').setOrigin(0, .5).setDepth(5);
      const thumb = scene.add.image(0, 0, CANDY_ICONS, 'thumb').setDepth(6);
      const hit = scene.add.zone(0, 0, 1, 1).setOrigin(0, .5).setDepth(7)
        .setInteractive({ useHandCursor: true });
      const item = { kind, panel, icon, label, track, fill, thumb, hit, index };
      const change = pointer => {
        if (!this.ready()) return;
        scene.selection = index + 1;
        scene.audio.start();
        const point = pointer.positionToCamera(scene.cameras.main);
        scene.progress.setVolume(kind, (point.x - item.fill.x) / item.fill.displayWidth * 100);
        scene.audio.updateVolume();
        this.updateSelection();
      };
      hit.on('pointerdown', pointer => { this.dragging = item; change(pointer); });
      item.change = change;
      return item;
    });
    this.move = pointer => { if (pointer.isDown) this.dragging?.change(pointer); };
    this.release = () => { this.dragging = null; };
    scene.input.on('pointermove', this.move);
    scene.input.on('pointerup', this.release);
    scene.input.on('gameout', this.release);
    scene.events.once('shutdown', () => {
      scene.input.off('pointermove', this.move);
      scene.input.off('pointerup', this.release);
      scene.input.off('gameout', this.release);
    });
    this.motion = new CandyMenuMotion(scene, { logo: this.logo, hero: this.hero, play: this.start });
    bindResize(scene, () => this.layout());
    this.layout();
  }

  ready() { return !this.scene.leaving && !this.scene.transitioning && !this.scene.cameras.main.fadeEffect.isRunning; }

  layout() {
    const { h, portrait, x, bounds } = screenLayout(this.scene, 1390);
    cover(this.background, bounds.x, bounds.y, bounds.width, bounds.height);
    const center = h / 2;
    const logoWidth = portrait ? 720 : 780;
    this.logo.setPosition(x, center - (portrait ? 360 : 252))
      .setDisplaySize(logoWidth, logoWidth * this.logo.height / this.logo.width);
    this.start.setPosition(x, center - (portrait ? 45 : 3)).setDisplaySize(portrait ? 510 : 475, 160);
    fitTouchTarget(this.start, this.scene);
    const cssZoom = this.scene.cameras.main.zoom / this.scene.scale.displayScale.x;
    const heroWidth = portrait ? 860 : 1120;
    this.hero.setPosition(x, center + (portrait ? 205 : 156))
      .setDisplaySize(heroWidth, heroWidth * this.hero.height / this.hero.width);
    for (const item of this.sliders) {
      const px = portrait ? x : x + (item.index ? 193 : -193);
      const preferredY = portrait ? center + 425 + item.index * Math.max(105, 44 / cssZoom + 12) : center + 398;
      const hitHeight = Math.max(85, 44 / cssZoom);
      const py = Math.min(preferredY, bounds.y + bounds.height - hitHeight / 2 - 12 / cssZoom);
      item.panel.setPosition(px, py).setDisplaySize(365, 85);
      item.icon.setPosition(px - 137, py).setDisplaySize(38, 38);
      item.label.setPosition(px - 60, py).setFontSize(25);
      item.track.setPosition(px + 30, py).setDisplaySize(136, 26);
      item.fill.setPosition(px + 45, py).setDisplaySize(106, 12);
      item.thumb.setDisplaySize(29, 29);
      item.hit.setPosition(px + 19, py).setSize(158, hitHeight);
    }
    this.updateSelection();
    this.motion.layout();
  }

  updateSelection() {
    this.start.setAlpha(this.scene.selection === 0 ? 1 : .93);
    for (const item of this.sliders) {
      const value = this.scene.progress[`${item.kind}Volume`] / 100;
      item.fill.setCrop(0, 0, item.fill.width * value, item.fill.height);
      item.thumb.setPosition(item.fill.x + item.fill.displayWidth * value, item.track.y);
      item.panel.setTint(this.scene.selection === item.index + 1 ? 0xdff6ff : 0xffffff);
    }
  }
}
