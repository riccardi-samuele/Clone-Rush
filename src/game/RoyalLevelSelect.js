import Phaser from 'phaser';
import { goTo } from './Transitions.js';
import { CANDY_UI, CANDY_ICONS, candyText, cover, screenLayout, bindResize, candyButton, fitTouchTarget } from './CandySky.js';
import { CandyMenuMotion } from './CandyMenuMotion.js';
import { LEVELS_PER_PAGE, pageForLevel, levelPageRange } from './LevelPages.js';

export class RoyalLevelSelect {
  constructor(scene) {
    this.scene = scene;
    this.background = scene.add.image(0, 0, 'gameplay-background').setDepth(-10);
    this.logo = scene.add.image(0, 0, 'candy-logo', 'logo').setDepth(2);
    this.header = scene.add.image(0, 0, CANDY_UI, 'pill').setDepth(3);
    this.heading = candyText(scene, 'CHOOSE LEVEL', 43).setDepth(4);
    this.back = candyButton(scene, 'round', () => goTo(scene, 'Menu'));
    this.backIcon = scene.add.image(0, 0, CANDY_ICONS, 'back').setDepth(6);
    this.webgl = scene.game.renderer.type === Phaser.WEBGL;
    this.panel = (this.webgl
      ? scene.add.nineslice(0, 0, CANDY_UI, 'panel', 1000, 600, 70, 70, 60, 60)
      : scene.add.image(0, 0, CANDY_UI, 'panel')).setDepth(1).setAlpha(.83);
    this.plaque = scene.add.image(0, 0, CANDY_UI, 'pill').setDepth(3);
    this.count = candyText(scene, `${scene.progress.completed.size} / ${scene.progress.levelCount} COMPLETE`, 26).setDepth(4);
    this.page = pageForLevel(scene.number);
    this.paginated = scene.progress.levelCount > LEVELS_PER_PAGE;
    this.previousPage = candyButton(scene, 'round', () => this.changePage(-1));
    this.nextPage = candyButton(scene, 'round', () => this.changePage(1));
    this.previousIcon = scene.add.image(0, 0, CANDY_ICONS, 'left').setDepth(6);
    this.nextIcon = scene.add.image(0, 0, CANDY_ICONS, 'right').setDepth(6);
    this.pageLabel = candyText(scene, '', 26).setDepth(4);
    this.decor = [0, 1].map(i => ({
      island: scene.add.image(0, 0, 'gameplay-terrain-sheet', 'small').setDepth(2),
      clone: scene.add.image(0, 0, 'gameplay-clones-sheet', i ? 'normal' : 'reverse').setDepth(3),
    }));
    this.tiles = Array.from({ length: scene.progress.levelCount }, (_, index) => {
      const number = index + 1;
      const unlocked = scene.progress.isUnlocked(number);
      const completed = scene.progress.completed.has(number);
      const image = scene.add.image(0, 0, CANDY_UI, unlocked ? 'unlocked' : 'locked').setDepth(3);
      const label = candyText(scene, String(number), 50).setDepth(5);
      const symbol = scene.add.image(0, 0, CANDY_ICONS, completed ? 'check' : 'lock')
        .setVisible(completed || !unlocked).setDepth(5);
      if (unlocked) {
        image.setInteractive({ useHandCursor: true });
        image.on('pointerover', () => image.setTint(0xe1faff));
        image.on('pointerout', () => image.clearTint());
        image.on('pointerdown', () => {
          if (!this.ready()) return;
          scene.number = number;
          this.updateSelection();
          scene.enterLevel();
        });
      }
      return { number, image, label, symbol, unlocked, completed };
    });
    this.motion = new CandyMenuMotion(scene, { logo: this.logo, decor: this.decor });
    bindResize(scene, () => this.layout());
    this.layout();
  }

  ready() { return !this.scene.leaving && !this.scene.transitioning && !this.scene.cameras.main.fadeEffect.isRunning; }

  changePage(direction) {
    const target = this.page + direction;
    if (!this.ready() || target < 0 || target > pageForLevel(this.scene.progress.levelCount)) return;
    const { start, end } = levelPageRange(target, this.scene.progress.levelCount);
    this.scene.number = this.tiles.find(t => t.number >= start && t.number <= end && t.unlocked)?.number ?? start;
    this.page = target;
    this.layout();
  }

  layout() {
    const { w, h, portrait, x, bounds } = screenLayout(this.scene, 1420);
    cover(this.background, bounds.x, bounds.y, bounds.width, bounds.height);
    const logoWidth = portrait ? 440 : 465;
    this.logo.setPosition(x, h * (portrait ? .105 : .12))
      .setDisplaySize(logoWidth, portrait ? logoWidth * this.logo.height / this.logo.width : 195);
    const cssZoom = this.scene.cameras.main.zoom / this.scene.scale.displayScale.x;
    const compactPortrait = portrait && Math.min(135, (h * .53 - 5 * 19) / 6) * cssZoom < 44;
    const headerY = h * (compactPortrait ? .24 : .263);
    this.header.setPosition(x, headerY).setDisplaySize(portrait ? 540 : 620, 108);
    this.heading.setPosition(x, headerY).setFontSize(51);
    this.back.setPosition(portrait ? 85 : 84, portrait ? 95 : 79).setDisplaySize(120, 112);
    fitTouchTarget(this.back, this.scene);
    this.backIcon.setPosition(this.back.x, this.back.y).setDisplaySize(60, 51);
    const short = this.scene.scale.height / this.scene.scale.displayScale.x < 500;
    this.columns = portrait ? compactPortrait ? 5 : 4 : short ? 8 : 6;
    const range = levelPageRange(this.page, this.tiles.length);
    const maxRows = Math.ceil(Math.min(LEVELS_PER_PAGE, this.tiles.length) / this.columns);
    const rows = Math.ceil((range.end - range.start + 1) / this.columns);
    const gap = portrait ? 19 : 18, rowGap = portrait ? 19 : 10;
    this.tileSize = portrait ? Math.max(44 / cssZoom, Math.min(135, (h * .53 - (maxRows - 1) * gap) / maxRows)) : Math.max(124, 44 / cssZoom);
    const tileHeight = portrait ? this.tileSize : Math.max(110, 44 / cssZoom);
    const gridWidth = this.columns * this.tileSize + (this.columns - 1) * gap;
    const gridHeight = rows * tileHeight + (rows - 1) * rowGap;
    const gridY = h * (portrait ? .568 : .57);
    const top = gridY - gridHeight / 2 + tileHeight / 2;
    const left = (w - gridWidth) / 2 + this.tileSize / 2;
    this.panel.setPosition(x, gridY);
    if (this.webgl) this.panel.setSize(gridWidth + 80, gridHeight + 92);
    else this.panel.setDisplaySize(gridWidth + 80, gridHeight + 92);
    for (const tile of this.tiles) {
      const visible = tile.number >= range.start && tile.number <= range.end;
      const index = tile.number - range.start;
      tile.image.setVisible(visible); tile.label.setVisible(visible);
      tile.symbol.setVisible(visible && (tile.completed || !tile.unlocked));
      if (tile.image.input) tile.image.input.enabled = visible && tile.unlocked;
      const px = left + index % this.columns * (this.tileSize + gap);
      const py = top + Math.floor(index / this.columns) * (tileHeight + rowGap);
      tile.image.setPosition(px, py).setDisplaySize(this.tileSize, tileHeight);
      tile.label.setPosition(px, py - this.tileSize * .07).setFontSize(this.tileSize * .40);
      tile.symbol.setPosition(px, py + this.tileSize * .29).setDisplaySize(this.tileSize * .22, this.tileSize * .22);
    }
    this.plaque.setPosition(x, h * .89).setDisplaySize(385, 83);
    this.count.setPosition(x, h * .89).setFontSize(Math.max(29, 12 / cssZoom));
    for (const [button, icon, direction] of [[this.previousPage, this.previousIcon, -1], [this.nextPage, this.nextIcon, 1]]) {
      const enabled = this.paginated && this.page + direction >= 0 && this.page + direction <= pageForLevel(this.tiles.length);
      button.setVisible(this.paginated).setPosition(x + direction * 350, h * .89).setDisplaySize(140, 130).setAlpha(enabled ? 1 : .4);
      fitTouchTarget(button, this.scene); button.input.enabled = enabled;
      icon.setVisible(this.paginated).setPosition(button.x, button.y).setDisplaySize(62, 52).setAlpha(enabled ? 1 : .4);
    }
    this.pageLabel.setVisible(this.paginated).setPosition(x, h * .955).setFontSize(Math.max(26, 12 / cssZoom))
      .setText(`PAGE ${this.page + 1} / ${pageForLevel(this.tiles.length) + 1}`);
    for (const [index, item] of this.decor.entries()) {
      const dx = portrait ? w * (index ? .89 : .11) : w * (index ? .885 : .115);
      const dy = portrait ? h * .94 : h * .80;
      const dw = portrait ? 145 : 345;
      item.island.setPosition(dx, dy).setOrigin(.5, .25).setDisplaySize(dw, dw * .68);
      item.clone.setPosition(dx, dy - dw * .12).setDisplaySize(dw * .24, dw * .24);
    }
    this.updateSelection();
    this.motion.layout();
  }

  updateSelection() {
    if (pageForLevel(this.scene.number) !== this.page) {
      this.page = pageForLevel(this.scene.number);
      this.layout();
      return;
    }
    for (const tile of this.tiles) {
      const selected = tile.number === this.scene.number && tile.unlocked;
      tile.image.setFrame(selected ? 'selected' : tile.unlocked ? 'unlocked' : 'locked');
      tile.label.setColor(tile.unlocked ? '#ffffff' : '#0742b9')
        .setStroke(tile.unlocked ? '#0988d0' : '#e3f5ff', tile.unlocked ? 2 : 0);
      tile.symbol.setTint(tile.completed ? 0xffffff : 0xffffff);
    }
  }
}
