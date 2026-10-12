import Phaser from 'phaser';
import { BODY_HZ, PHYSICS, STEP_MS, HAZARD_TYPES, EXIT_TYPES, VIEW } from './constants.js';
import { actorAnimation, createActorSprite } from './Presentation.js';
import { animateRoyalClone } from './RoyalGameplay.js';

const { Body } = Phaser.Physics.Matter.Matter;

export class Clone {
  constructor(world, instance) {
    this.world = world;
    this.scene = world.scene;
    this.type = instance.type;
    this.state = 'playing';
    this.groundFrames = 0;
    this.jumpFrames = 0;
    this.facing = 1;
    this.sliding = false;
    this.bouncing = false;
    const animation = actorAnimation(world.catalog, this.type, 'Idle');
    this.sprite = createActorSprite(this.scene, world.catalog, this.type, instance.x, instance.y, 'Idle')
      .setOrigin(0.5).setPosition(instance.x + 10, instance.y + 10).setDepth(100);
    this.body = world.createBody(this, instance, animation);
    this.visualOffset = { x: this.sprite.x - this.body.position.x, y: this.sprite.y - this.body.position.y };
    this.previousPosition = { ...this.body.position };
  }

  velocity() {
    const velocity = Body.getVelocity(this.body);
    return { x: velocity.x * BODY_HZ, y: velocity.y * BODY_HZ };
  }

  setVelocity(x, y) { Body.setVelocity(this.body, { x: x / BODY_HZ, y: y / BODY_HZ }); }

  applyGravity() {
    if (this.state !== 'playing') return;
    const velocity = this.velocity();
    const gravity = this.type === 35 ? -PHYSICS.reverseGravityImpulse
      : this.world.level.gravity.y * 10 * STEP_MS / 1000;
    velocity.y += gravity;
    if (this.type !== 35) velocity.x += this.world.level.gravity.x * 10 * STEP_MS / 1000;
    this.setVelocity(velocity.x, velocity.y);
  }

  contact(other, normal, sensor) {
    if (this.state !== 'playing' || this.scene.status !== 'playing' || !other) return;
    if (other instanceof Clone && other.state !== 'playing') return;
    if (EXIT_TYPES.has(other.type)) {
      if (!other.locked && !other.used) this.enterExit(other);
      return;
    }
    if (HAZARD_TYPES.has(other.type)) { this.scene.die(this); return; }
    if (other.type === 32) this.world.collectKey(other);
    if (!sensor && this.groundFrames !== 10000) {
      const support = this.type === 35 ? normal.y > 0.5 : normal.y < -0.5;
      if (support) {
        this.groundFrames = 0;
        if (this.type === 35) this.gravitySupport = other.platform ?? null;
        if (this.type !== 35) {
          this.bouncing = other.type === 23;
          if (this.bouncing) { this.world.bounce(other); this.jump(); }
        }
      }
    }
  }

  step(input) {
    if (this.state !== 'playing') return;
    if (this.body.position.y + this.visualOffset.y - 10 > VIEW.height ||
      (this.body.position.y < -45 || this.body.position.x < -45 || this.body.position.x > VIEW.width + 45)) {
      this.scene.die(this);
      return;
    }
    let velocity = this.velocity();
    let direction = input.direction;
    if (this.type === 17) direction *= -1;
    if (this.type === 25 && this.sliding) velocity.x = this.facing * PHYSICS.speed;
    if (direction) {
      this.facing = direction;
      if (this.type === 25) { this.sliding = true; velocity.x = direction * PHYSICS.speed; }
      else velocity.x = Phaser.Math.Clamp(velocity.x + direction * PHYSICS.acceleration, -PHYSICS.speed, PHYSICS.speed);
    } else if (this.type !== 25) {
      velocity.x *= 0.9;
      if (Math.abs(velocity.x) < 10) velocity.x = 0;
    }
    this.setVelocity(velocity.x, velocity.y);
    if (this.type === 35 && !input.pressed.has('up')) this.world.snapGravityClone(this);
    if (input.pressed.has('up')) this.jumpFrames = PHYSICS.jumpBufferFrames;
    if (this.jumpFrames > 0) this.jump();
    this.groundFrames++;
    this.jumpFrames--;
  }

  jump() {
    if (this.groundFrames > PHYSICS.coyoteFrames || this.type === 19 && !this.bouncing) return;
    const velocity = this.velocity();
    this.setVelocity(velocity.x, this.bouncing ? -PHYSICS.bounce : this.type === 35 ? PHYSICS.jump : -PHYSICS.jump);
    this.scene.audio.play(this.bouncing ? 'Bounce Sound' : 'Jump Sound');
    this.groundFrames = 9999;
    this.jumpFrames = 0;
  }

  enterExit(exit) {
    if (this.state !== 'playing' || exit.locked || exit.used) return;
    this.state = 'exiting';
    if (exit.type === 15) {
      exit.used = true;
      this.scene.tweens.killTweensOf(exit.sprite);
    }
    this.syncVisual(true);
    this.setVelocity(0, 0);
    this.body.parts.forEach((part) => { part.isSensor = true; part.collisionFilter.mask = 0; });
    Body.setStatic(this.body, true);
    this.scene.audio.play('Exit Sound');
    this.world.effects.enterPortal(this, exit);
    this.scene.checkComplete();
  }

  syncVisual(force = false, interpolation = 1) {
    if (this.state !== 'playing' && !force) return;
    this.sprite.setPosition(
      this.previousPosition.x + (this.body.position.x - this.previousPosition.x) * interpolation + this.visualOffset.x,
      this.previousPosition.y + (this.body.position.y - this.previousPosition.y) * interpolation + this.visualOffset.y);
    animateRoyalClone(this);
  }
}
