import Phaser from 'phaser';
import { InputController } from '../game/InputController.js';
import { RoyalLobby } from '../game/RoyalLobby.js';
import { goTo, reveal } from '../game/Transitions.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(data = {}) {
    this.leaving = false;
    this.selection = 0;
    this.progress = this.registry.get('progress');
    this.audio = this.registry.get('audio');
    this.inputController = new InputController(this);
    this.lobby = new RoyalLobby(this);
    this.updateSelection();
    reveal(this, data.transition);
  }

  update() {
    if (this.leaving || this.transitioning || this.cameras.main.fadeEffect.isRunning) return;
    const input = this.inputController.snapshot();
    if (input.pressed.has('up')) this.selection = Math.max(0, this.selection - 1);
    if (input.pressed.has('down')) this.selection = Math.min(2, this.selection + 1);
    if (input.pressed.has('confirm') && this.selection === 0) return this.startGame();
    if (input.pressed.has('left')) this.changeVolume(-5);
    if (input.pressed.has('right')) this.changeVolume(5);
    this.updateSelection();
  }

  updateSelection() {
    this.lobby.updateSelection();
  }

  changeVolume(amount) {
    if (!this.selection) return;
    const kind = this.selection === 1 ? 'sound' : 'music';
    this.progress.setVolume(kind, this.progress[`${kind}Volume`] + amount);
    this.audio.updateVolume();
  }

  startGame() {
    if (this.leaving || this.transitioning || this.cameras.main.fadeEffect.isRunning) return;
    this.audio.start();
    goTo(this, 'LevelSelect', { number: this.progress.current });
  }
}
