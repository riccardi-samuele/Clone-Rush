import Phaser from 'phaser';
import { LevelWorld } from '../game/LevelWorld.js';
import { InputController } from '../game/InputController.js';
import { STEP_MS } from '../game/constants.js';
import { goTo, reveal } from '../game/Transitions.js';
import { RoyalPlayHUD } from '../game/RoyalPlayHUD.js';
import { ROYAL_TEXT } from '../game/RenderQuality.js';
import { PORTAL_TRANSITION_DELAY_MS } from '../game/PortalEntryAnimation.js';

export class PlayScene extends Phaser.Scene {
  constructor(key = 'Play') { super(key); }

  create(data = {}) {
    this.leaving = false;
    this.transitioning = false;
    this.input.enabled = true;
    this.status = 'playing';
    this.accumulator = 0;
    this.tutorial = null;
    this.number = data.number ?? 1;
    this.level = this.scene.key === 'Ending' ? this.registry.get('levels').ending
      : this.registry.get('levels').levels.find((level) => level.number === this.number);
    this.audio = this.registry.get('audio');
    this.progress = this.registry.get('progress');
    this.inputController = new InputController(this);
    this.world = new LevelWorld(this, this.level);
    this.matter.world.autoUpdate = false;
    this.matter.world.setGravity(0, 0);
    this.hud = new RoyalPlayHUD(this);
    if (this.scene.key !== 'Ending' && (this.level.tutorial || this.number === 1)) this.addTutorial();
    reveal(this, data.transition);
    this.events.once('shutdown', () => { this.world = null; });
  }

  addTutorial() {
    if (this.tutorial || this.number === 18) return;
    const keys = this.registry.get('keyboardSupport');
    const controls = keys
      ? 'A D / ← →  MOVE     W / ↑  JUMP\nGuide every clone to a portal'
      : 'Move and jump with the buttons below\nGuide every clone to a portal';
    const message = this.number === 1 ? controls : (this.level.tutorial || controls);
    this.tutorial = this.add.text(240, -12, message, {
      ...ROYAL_TEXT, fontSize: '10px', align: 'center', color: '#0742b9',
      stroke: '#e8faff', strokeThickness: 2, lineSpacing: 3,
    }).setOrigin(.5, 0).setAlpha(0).setDepth(400);
    this.tweens.add({ targets: this.tutorial, alpha: 1, duration: 250, delay: 200 });
    this.tweens.add({ targets: this.tutorial, alpha: 0, duration: 250, delay: 4200 });
  }

  update(_time, delta) {
    if (!this.world) return;
    this.hud.gravityTutorial?.update();
    if (this.number === 1 && this.scene.key !== 'Ending') this.addTutorial();
    if (this.status === 'paused' && !this.leaving) {
      if (this.inputController.pressed.has('confirm')) this.hud.togglePause();
      else if (this.inputController.pressed.has('reset')) this.restart();
      else if (this.inputController.pressed.has('back')) goTo(this, 'LevelSelect');
    }
    if (this.leaving || this.transitioning || this.status !== 'playing' || this.cameras.main.fadeEffect.isRunning) {
      this.inputController.pressed.clear();
      this.accumulator = 0;
      this.world.render(Math.min(delta, 200));
      return;
    }
    this.accumulator += Math.min(delta, 200);
    while (this.accumulator >= STEP_MS && this.status === 'playing' && !this.leaving) {
      const input = this.inputController.snapshot();
      if (input.pressed.has('reset')) { this.restart(); break; }
      if (input.pressed.has('back')) { goTo(this, 'LevelSelect'); break; }
      this.world.prepareStep();
      this.matter.world.step(STEP_MS);
      this.world.resolveContacts();
      if (this.status === 'playing') this.world.clones.forEach((clone) => clone.step(input));
      this.accumulator -= STEP_MS;
    }
    this.world.render(Math.min(delta, 200), Math.min(1, this.accumulator / STEP_MS));
  }

  restart() { goTo(this, this.scene.key, { number: this.number }); }

  die(clone) {
    if (this.status !== 'playing') return;
    this.status = 'dead';
    this.cameras.main.shake(200, 0.01);
    this.world.emitDeath(clone);
    this.audio.play('Death Sound');
    clone.state = 'dead';
    clone.sprite.setVisible(false);
    this.world.clones.forEach((other) => {
      other.sprite.setTint(0x808080);
    });
    this.restart();
  }

  checkComplete() {
    if (!this.world.clones.every((clone) => clone.state === 'exiting') || this.status !== 'playing') return;
    this.status = 'complete';
    if (this.scene.key !== 'Ending') this.progress.complete(this.number);
    const advance = () => {
      if (!this.world || this.leaving || this.status !== 'complete') return;
      // A slow render frame must not cut off an unfinished absorption or closure.
      if (this.world.effects?.hasActivePortalSequence()) {
        this.time.delayedCall(40, advance);
        return;
      }
      if (this.scene.key === 'Ending') goTo(this, 'Menu');
      else this.number === this.progress.levelCount
        ? goTo(this, 'Ending', {}, 'candy')
        : goTo(this, 'Play', { number: this.number + 1 }, 'candy');
    };
    this.time.delayedCall(PORTAL_TRANSITION_DELAY_MS, advance);
  }
}
