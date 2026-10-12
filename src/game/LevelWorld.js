import Phaser from 'phaser';
import { Clone } from './Clone.js';
import { CLONE_TYPES, EXIT_TYPES } from './constants.js';
import { actorAnimation, createActorSprite } from './Presentation.js';
import { drawRoyalLevel, RoyalWorldEffects } from './RoyalGameplay.js';
import { floatingMap } from './GeneratedTerrain.js';
import { CandyHazards } from './CandyHazards.js';
import { islandCollisionPolygons, islandCeilingContactY } from './CandyIslandGeometry.js';
import { portalPresentation, FLOATING_PORTAL_ORIGINS } from './PortalPresentation.js';

const { Bodies, Body, Vertices } = Phaser.Physics.Matter.Matter;

export class LevelWorld {
  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.catalog = scene.registry.get('catalog');
    this.objects = [];
    this.clones = [];
    this.particles = [];
    this.visualTime = 0;
    this.masks = new Map();
    for (const pair of this.catalog.collisionPairs) {
      this.masks.set(pair.group1, (this.masks.get(pair.group1) ?? 0) | (1 << pair.group2));
      this.masks.set(pair.group2, (this.masks.get(pair.group2) ?? 0) | (1 << pair.group1));
    }
    this.floating = floatingMap(level);
    drawRoyalLevel(scene, this.floating);
    this.buildTerrain();
    for (const instance of this.floating.actors) {
      if (CLONE_TYPES.has(instance.type)) this.clones.push(new Clone(this, instance));
      else if ([5, 15, 32, 23, 9, 11, 13].includes(instance.type)) this.addObject(instance);
    }
    if (this.objects.some((object) => object.type === 32)) {
      this.objects.filter((object) => object.type === 5).forEach((object) => {
        object.locked = true;
        object.sprite.setTint(0x808080);
        this.scene.tweens.killTweensOf(object.sprite);
      });
    }
    this.hazards = new CandyHazards(this);
    this.effects = new RoyalWorldEffects(this);
  }

  filter(group) {
    return { category: 1 << group, mask: this.masks.get(group) ?? 0, group: 0 };
  }

  buildTerrain() {
    for (const p of this.floating.platforms) {
      const options = { isStatic: true, friction: .2, collisionFilter: this.filter(3) };
      const body = p.undersideSupport ? Body.create({ ...options,
        parts: islandCollisionPolygons(p).map(points => {
          const center = Vertices.centre(points);
          return Bodies.fromVertices(center.x, center.y, points, options, true, 0, 0);
        }),
      }) : Bodies.rectangle(p.x + p.width / 2, p.y + p.height / 2, p.width, p.height, options);
      for (const part of body.parts) part.plugin.entity = { type: 'terrain', platform: p };
      this.scene.matter.world.add(body);
    }
  }

  snapGravityClone(clone) {
    const platform = clone.gravitySupport;
    if (!platform?.undersideSupport || clone.groundFrames > 3) return;
    const velocity = clone.velocity();
    if (Math.abs(velocity.y) > 60) return;
    const target = islandCeilingContactY(platform, clone.body);
    const gap = clone.body.position.y - target;
    // Follow a receding cloud contour while walking. Never pull back a jump,
    // bridge a map gap or keep a clone suspended beyond the platform edge.
    if (!Number.isFinite(target) || gap < -.25 || gap > 4) return;
    Body.setPosition(clone.body, { x: clone.body.position.x, y: target + .02 });
    clone.setVelocity(velocity.x, 0);
    clone.groundFrames = 0;
  }

  createBody(entity, instance, animation) {
    const actor = this.catalog.actors[instance.type];
    const sx = instance.scaleX ?? 1;
    const sy = instance.scaleY ?? 1;
    const options = {
      isStatic: actor.bodyType !== 2,
      friction: actor.friction,
      frictionAir: 0,
      restitution: actor.restitution,
      collisionFilter: this.filter(actor.group),
      slop: 0.02,
    };
    const parts = animation.shapes.map((shape) => {
      const shapeOptions = { ...options, isSensor: shape.sensor,
        collisionFilter: this.filter(shape.group === -1000 ? actor.group : shape.group) };
      let part;
      if (shape.points) {
        let points = shape.points.map((point) => ({ x: instance.x + point.x * sx, y: instance.y + point.y * sy }));
        // The generated gravity cube has rounded upper corners. Square fixture
        // corners otherwise touch cloud lobes while its visible head hangs free.
        if (entity.type === 35 && !shape.sensor && points.length === 4) {
          points = Vertices.chamfer(points, 4, 8);
        }
        const center = Vertices.centre(points);
        part = Bodies.fromVertices(center.x, center.y, points, shapeOptions, true, 0.01, 0);
      } else part = Bodies.circle(instance.x + shape.x * sx, instance.y + shape.y * sy,
        shape.radius * Math.abs(sx), shapeOptions);
      part.plugin.entity = entity;
      return part;
    });
    if (!parts.length) return null;
    const body = parts.length === 1 ? parts[0] : Body.create({ ...options, parts });
    body.plugin.entity = entity;
    if (!body.isStatic) Body.setMass(body, actor.mass);
    if (actor.fixedRotation) Body.setInertia(body, Infinity);
    const center = { x: instance.x + animation.frameWidth * sx / 2,
      y: instance.y + animation.frameHeight * sy / 2 };
    if (instance.angle) Body.rotate(body, instance.angle * Math.PI / 180, center);
    this.scene.matter.world.add(body);
    return body;
  }

  addObject(instance) {
    const animation = actorAnimation(this.catalog, instance.type);
    const object = { type: instance.type, instance, collected: false, used: false, locked: false };
    object.sprite = createActorSprite(this.scene, this.catalog, instance.type, instance.x, instance.y);
    object.sprite.setOrigin(animation.originX / animation.frameWidth, animation.originY / animation.frameHeight)
      .setPosition(instance.x + animation.originX, instance.y + animation.originY)
      .setDisplaySize(animation.frameWidth * (instance.scaleX ?? 1), animation.frameHeight * (instance.scaleY ?? 1))
      .setAngle(instance.angle ?? 0).setDepth(10 + (instance.order ?? 0) * 0.01);
    const candyHazard = [9, 11, 13].includes(object.type);
    object.body = candyHazard ? null : this.createBody(object, instance, animation);
    if (candyHazard) object.sprite.setVisible(false);
    if (EXIT_TYPES.has(object.type)) {
      // Full transparent cell: aperture stays at the original sensor center.
      object.portalPresentation = portalPresentation(instance, this.level.platforms, animation);
      if (object.portalPresentation === 'floating') {
        const origin = FLOATING_PORTAL_ORIGINS[object.type];
        object.sprite.setTexture('gameplay-floating-portals-sheet', object.type === 15 ? 'unstable' : 'portal')
          .setOrigin(origin.x, origin.y);
      } else object.sprite.setOrigin(object.type === 15 ? 380 / 768 : 404 / 768, 520 / 1024);
      object.sprite.setDisplaySize(38, 50);
    }
    object.physicsAngle = object.body?.angle ?? 0;
    object.baseScaleX = object.sprite.scaleX;
    object.baseScaleY = object.sprite.scaleY;
    object.bodyScaleX = object.baseScaleX;
    object.bodyScaleY = object.baseScaleY;
    this.objects.push(object);
    if (EXIT_TYPES.has(object.type)) this.animateExit(object);
    if (object.type === 32) {
      this.scene.tweens.add({ targets: object.sprite, angle: object.sprite.angle + 360,
        duration: 3600, repeat: -1 });
      this.scene.tweens.add({ targets: object.sprite, alpha: 0.75,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return object;
  }

  animateExit(object) {
    this.scene.tweens.add({ targets: object.sprite,
      scaleX: object.baseScaleX * 0.98,
      scaleY: object.baseScaleY * 0.98,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  prepareStep() {
    this.hazards?.step();
    for (const object of this.objects) {
      if (!object.body || object.collected || object.used || object.locked || !EXIT_TYPES.has(object.type) && object.type !== 32) continue;
      if (EXIT_TYPES.has(object.type)) {
        object.physicsAngle += (object.type === 15 ? -1 : 1) * Math.PI / 2 * 0.01;
        Body.setAngle(object.body, object.physicsAngle);
      } else Body.setAngle(object.body, object.sprite.rotation);
      const actor = this.catalog.actors[object.type];
      // Match fixture scaling only for actors that enable it in their data.
      if (EXIT_TYPES.has(object.type) && actor.autoScale && actor.bodyType !== 0) {
        Body.scale(object.body, object.sprite.scaleX / object.bodyScaleX, object.sprite.scaleY / object.bodyScaleY);
        object.bodyScaleX = object.sprite.scaleX;
        object.bodyScaleY = object.sprite.scaleY;
      }
    }
    this.clones.forEach((clone) => {
      clone.previousPosition = { ...clone.body.position };
      clone.applyGravity();
    });
  }

  resolveContacts() {
    for (const pair of this.scene.matter.world.engine.pairs.list) {
      if (!pair.isActive) continue;
      const a = pair.bodyA.plugin.entity ?? pair.bodyA.parent.plugin.entity;
      const b = pair.bodyB.plugin.entity ?? pair.bodyB.parent.plugin.entity;
      const normal = pair.collision.normal;
      if (a instanceof Clone) a.contact(b, normal, pair.isSensor);
      if (b instanceof Clone) b.contact(a, { x: -normal.x, y: -normal.y }, pair.isSensor);
    }
  }

  collectKey(key) {
    if (key.collected) return;
    key.collected = true;
    this.scene.tweens.killTweensOf(key.sprite);
    key.body.collisionFilter.mask = 0;
    this.scene.audio.play('Exit Key Sound');
    const normalExits = this.objects.filter((object) => object.type === 5);
    normalExits.forEach((exit) => {
      const echo = createActorSprite(this.scene, this.catalog, 32, key.sprite.x - 10, key.sprite.y - 10).setDepth(100);
      this.scene.tweens.add({ targets: echo, x: exit.sprite.x - 10, y: exit.sprite.y - 10,
        duration: 500, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: echo, scaleX: 0, scaleY: 0, alpha: 0, duration: 800,
        ease: 'Quad.easeIn', onComplete: () => echo.destroy() });
    });
    this.scene.tweens.add({ targets: key.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 200,
      ease: 'Quad.easeIn', onComplete: () => key.sprite.setVisible(false) });
    if (this.objects.filter((object) => object.type === 32).every((object) => object.collected)) {
      normalExits.forEach((exit) => {
        exit.locked = false;
        exit.sprite.clearTint();
        this.animateExit(exit);
      });
    }
  }

  bounce(block) {
    this.scene.tweens.killTweensOf(block.sprite);
    block.sprite.setTint(0xffffff);
    this.scene.tweens.add({ targets: block.sprite, scaleY: block.baseScaleY * 0.7, duration: 100,
      ease: 'Expo.easeOut', onComplete: () => {
        block.sprite.clearTint();
        this.scene.tweens.add({ targets: block.sprite, scaleY: block.baseScaleY,
          duration: 100, ease: 'Expo.easeOut' });
      } });
  }

  emitDeath(clone) {
    const name = { 3: 'Normal', 17: 'Reverse', 19: 'Nojump', 25: 'Slide', 35: 'Gravity' }[clone.type];
    for (let index = 0; index < 10; index++) {
      const sprite = createActorSprite(this.scene, this.catalog, 21, clone.sprite.x - 3, clone.sprite.y - 3, name).setDepth(100);
      this.particles.push({ sprite, vx: Phaser.Math.FloatBetween(-200, 200),
        vy: Phaser.Math.FloatBetween(-300, -100), life: 1500 });
    }
  }

  render(delta, interpolation = 1) {
    this.visualTime += Math.min(delta, 50) / 1000;
    this.clones.forEach((clone) => clone.syncVisual(false, interpolation));
    this.effects?.update(delta);
    const seconds = delta / 1000;
    for (const particle of this.particles) {
      particle.vy += this.level.gravity.y * 10 * seconds;
      particle.sprite.x += particle.vx * seconds;
      particle.sprite.y += particle.vy * seconds;
      particle.life -= delta;
      if (particle.life <= 0) particle.sprite.destroy();
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }
}
