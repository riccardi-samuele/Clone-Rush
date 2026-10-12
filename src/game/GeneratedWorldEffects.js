import Phaser from 'phaser';
import { PortalEntryAnimation, PORTAL_CLOSE_DELAY_MS, PORTAL_CLOSE_MS } from './PortalEntryAnimation.js';
import { GravityWorldCues } from './GravityPresentation.js';

const DECOR = 'gameplay-decor-sheet';

// Decorative effects animate approved imagegen sprites; gravity cues use native graphics.
export class GeneratedWorldEffects {
  constructor(world) {
    this.world = world;
    this.scene = world.scene;
    const scene = this.scene;
    this.gravityCues = new GravityWorldCues(world);
    const spark = scene.textures.getFrame(DECOR, 'spark');
    this.cloneMagic = world.clones.map(clone => ({ clone,
      emitter: scene.add.particles(0, 0, DECOR, {
        frame: 'spark', frequency: 350, lifespan: 650,
        x: { min: -11, max: 11 }, y: { min: -11, max: 11 }, speed: { min: 1, max: 4 },
        scale: { start: 2 / spark.width, end: .3 / spark.width },
        alpha: { start: .65, end: 0 }, quantity: 1, blendMode: 'ADD',
      }).startFollow(clone.sprite).setDepth(101),
    }));
    this.actorLights = [...world.clones.map(clone => clone.sprite),
      ...world.objects.filter(object => [5, 15, 32].includes(object.type)).map(object => object.sprite)]
      .map(sprite => ({ sprite, light: scene.add.image(sprite.x, sprite.y, DECOR, 'glow')
        .setDepth(sprite.depth - .02).setBlendMode(Phaser.BlendModes.ADD) }));
    this.portals = world.objects.filter(object => [5, 15].includes(object.type)).map(object => {
      const sprite = object.sprite;
      const core = scene.add.image(sprite.x, sprite.y, 'gameplay-objects-sheet',
        object.type === 15 ? 'unstable-core' : 'portal-core').setDepth(sprite.depth - .01);
      const orbit = object.portalPresentation === 'floating' ? Array.from({ length: 2 }, () =>
        scene.add.image(sprite.x, sprite.y, DECOR, 'spark').setDepth(sprite.depth + .015)
          .setBlendMode(Phaser.BlendModes.ADD)) : [];
      return { object, core, orbit, energy: 0, rotation: 0, closeClock: null };
    });
    this.entries = [];
    scene.events.once('shutdown', () => {
      for (const entry of this.entries) entry.destroy();
      this.entries.length = 0;
    });
    this.magic = world.objects.filter(object => [5, 15, 32].includes(object.type)).map(object => ({
      object, emitter: scene.add.particles(0, 0, DECOR, {
        frame: 'spark', frequency: 210, lifespan: 1200,
        x: { min: -17, max: 17 }, y: { min: -17, max: 17 }, speed: { min: 1, max: 5 },
        scale: { start: 2.2 / spark.width, end: .4 / spark.width },
        alpha: { start: .7, end: 0 }, quantity: 1, blendMode: 'ADD',
        tint: object.type === 15 ? 0xf194ff : 0xffffff,
      }).startFollow(object.sprite).setDepth(30),
    }));
  }


  enterPortal(clone, exit) {
    const portal = this.portals.find(record => record.object === exit);
    if (!portal) return false;
    this.entries.push(new PortalEntryAnimation(this.scene, clone, portal));
    if (exit.type === 15) {
      portal.closeClock = 0;
      portal.closeScale = { x: exit.sprite.scaleX, y: exit.sprite.scaleY };
    }
    return true;
  }

  hasActivePortalSequence() {
    return this.entries.length > 0 || this.portals.some(portal => portal.closeClock !== null
      && portal.closeClock < PORTAL_CLOSE_DELAY_MS + PORTAL_CLOSE_MS);
  }

  update(delta = 0) {
    this.gravityCues.update();
    const time = this.world.visualTime;
    const entryDelta = this.scene.status === 'paused' ? 0 : delta;
    for (const portal of this.portals) portal.energy = 0;
    for (const entry of this.entries) {
      entry.update(entryDelta);
      entry.portal.energy = Math.min(1, entry.portal.energy + entry.energy);
    }
    this.entries = this.entries.filter(entry => !entry.finished);
    for (const { sprite, light } of this.actorLights) {
      light.setPosition(sprite.x, sprite.y).setDisplaySize(sprite.displayWidth * 1.7, sprite.displayHeight * 1.7)
        .setDepth(sprite.depth - .02).setVisible(sprite.visible && sprite.displayWidth > .01)
        .setAlpha(sprite.alpha * .20);
    }
    for (const { clone, emitter } of this.cloneMagic) emitter.emitting = clone.state === 'playing';
    for (const portal of this.portals) {
      const { object, core, energy } = portal;
      const sprite = object.sprite;
      if (portal.closeClock !== null) {
        portal.closeClock += entryDelta;
        const t = Math.max(0, Math.min(1, (portal.closeClock - PORTAL_CLOSE_DELAY_MS) / PORTAL_CLOSE_MS));
        sprite.setScale(portal.closeScale.x * (1 - t * t), portal.closeScale.y * (1 - t * t));
        if (t === 1) sprite.setVisible(false);
      }
      portal.rotation += entryDelta / 1000 * (object.type === 15 ? -1 : 1) * (.8 + energy * 7);
      const size = 25 * (1 + energy * .10) * sprite.scaleX / object.baseScaleX;
      core.setPosition(sprite.x, sprite.y).setDisplaySize(size, size)
        .setRotation(portal.rotation).setTint(sprite.tintTopLeft)
        .setVisible(sprite.visible && sprite.displayWidth > .01).setAlpha(sprite.alpha * (object.locked ? .35 : 1));
      if (this.scene.status !== 'paused') {
        const scale = sprite.scaleX / object.baseScaleX;
        portal.orbit.forEach((spark, index) => {
          const angle = portal.rotation + index * Math.PI;
          spark.setPosition(sprite.x + Math.cos(angle) * 17 * scale,
            sprite.y + Math.sin(angle) * 17 * scale)
            .setDisplaySize(1.8 * scale, 1.8 * scale)
            .setTint(object.locked ? 0x808080 : object.type === 15 ? 0xf194ff : 0x5bdcff)
            .setAlpha(sprite.alpha * (object.locked ? .2 : .85))
            .setVisible(sprite.visible && scale > .01);
        });
      }
    }
    for (const { object, emitter } of this.magic) emitter.emitting = !object.collected && !object.used && !object.locked;
  }
}
