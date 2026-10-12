import Phaser from 'phaser';
import { InputController } from '../game/InputController.js';
import { RoyalLevelSelect } from '../game/RoyalLevelSelect.js';
import { goTo, reveal } from '../game/Transitions.js';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    this.leaving = false;
    this.progress = this.registry.get('progress');
    this.number = this.progress.current;
    this.inputController = new InputController(this);
    this.view = new RoyalLevelSelect(this);
    reveal(this);
  }

  update() {
    if (this.leaving || this.transitioning || this.cameras.main.fadeEffect.isRunning) return;
    const input = this.inputController.snapshot();
    if (input.pressed.has('back')) return goTo(this, 'Menu');
    if (input.pressed.has('confirm')) return this.enterLevel();
    let candidate = this.number;
    if (input.pressed.has('left')) candidate--;
    if (input.pressed.has('right')) candidate++;
    if (input.pressed.has('up') && candidate > this.view.columns) candidate -= this.view.columns;
    if (input.pressed.has('down')) candidate += this.view.columns;
    if (candidate !== this.number && this.progress.isUnlocked(candidate)) {
      this.number = candidate;
      this.moveSelector();
    }
  }

  moveSelector() {
    this.view.updateSelection();
  }

  enterLevel() {
    if (this.leaving || this.transitioning || this.cameras.main.fadeEffect.isRunning) return;
    if (!this.progress.select(this.number)) return;
    this.registry.get('audio').start();
    goTo(this, 'Play', { number: this.number });
  }
}
