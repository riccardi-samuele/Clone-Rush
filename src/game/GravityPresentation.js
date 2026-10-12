import Phaser from 'phaser';
import { islandUndersideAt } from './CandyIslandGeometry.js';
import { CANDY_UI, candyText } from './CandySky.js';

const VIOLET = 0x9356ef;

function upArrow(graphics, x, y, size = 1) {
  graphics.lineBetween(x, y + 3 * size, x, y - 3 * size);
  graphics.lineBetween(x - 2.5 * size, y - .5 * size, x, y - 3 * size);
  graphics.lineBetween(x + 2.5 * size, y - .5 * size, x, y - 3 * size);
}

// These are direction and contact cues; the island art and physics stay separate.
export class GravityWorldCues {
  constructor(world) {
    this.world = world;
    const scene = world.scene;
    this.surfaces = (world.floating?.platforms ?? []).filter(p => p.undersideSupport).map(platform => {
      const graphic = scene.add.graphics().setDepth(1);
      const points = [];
      for (let x = platform.x + 5; x <= platform.x + platform.width - 5; x += 2) {
        points.push({ x, y: islandUndersideAt(platform, x) + .4 });
      }
      graphic.lineStyle(2.6, VIOLET, .22).strokePoints(points, false, false);
      graphic.lineStyle(.75, 0xdcbcff, .95).strokePoints(points, false, false);
      graphic.lineStyle(1, VIOLET, .7);
      for (let x = platform.x + 26; x < platform.x + platform.width - 12; x += 42) {
        upArrow(graphic, x, islandUndersideAt(platform, x) + 6, .65);
      }
      return { platform, graphic, points };
    });
    this.clones = world.clones.filter(clone => clone.type === 35).map(clone => {
      const badge = scene.add.graphics().setDepth(103);
      badge.fillStyle(0x6335b9, .95).fillCircle(0, 0, 4.8);
      badge.lineStyle(.7, 0xf6eaff, 1).strokeCircle(0, 0, 4.8);
      badge.lineStyle(1.1, 0xffffff, 1); upArrow(badge, 0, 0, .85);
      return { clone, badge };
    });
    this.update();
  }

  update() {
    if (this.world.scene.status === 'paused') return;
    for (const { clone, badge } of this.clones) {
      badge.setVisible(clone.state === 'playing' && clone.sprite.visible)
        .setPosition(clone.sprite.x + 17, clone.sprite.y + 4);
    }
  }
}

// Lives in the HUD camera so the explanation remains readable on phones.
export class GravityTutorial {
  constructor(scene) {
    this.scene = scene;
    this.panel = scene.game.renderer.type === Phaser.WEBGL
      ? scene.add.nineslice(0, 0, CANDY_UI, 'panel', 760, 180, 90, 90, 65, 65)
      : scene.add.image(0, 0, CANDY_UI, 'panel').setDisplaySize(760, 180);
    this.panel.setDepth(602);
    this.title = candyText(scene, 'INVERTED GRAVITY', 32).setColor('#7135c3').setDepth(603);
    this.description = candyText(scene, 'Purple falls UP. Jump pushes DOWN.', 27).setDepth(603);
    this.instructions = candyText(scene, 'Collect the key, then reach the portal.', 25).setDepth(603);
    this.items = [this.panel, this.title, this.description, this.instructions];
  }

  layout(bounds, portrait, cssZoom) {
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + (portrait ? 440 : 235);
    this.panel.setPosition(x, y);
    this.title.setFontSize(Math.max(32, 14 / cssZoom)).setPosition(x, y - 54);
    this.description.setFontSize(Math.max(27, 12 / cssZoom)).setPosition(x, y - 2);
    this.instructions.setFontSize(Math.max(25, 12 / cssZoom)).setPosition(x, y + 45);
  }

  update() {
    const scene = this.scene;
    const visible = scene.status === 'playing' && !scene.leaving && !scene.transitioning
      && scene.world.objects.some(object => object.type === 32 && !object.collected);
    this.items.forEach(item => item.setVisible(visible));
  }
}
