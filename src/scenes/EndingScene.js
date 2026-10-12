import { PlayScene } from './PlayScene.js';
import { ROYAL_TEXT } from '../game/RenderQuality.js';

export class EndingScene extends PlayScene {
  constructor() { super('Ending'); }

  create(data) {
    super.create(data);
    const text = this.add.text(240, 52, 'Thanks for Playing', {
      ...ROYAL_TEXT, fontSize: '24px', color: '#0742b9', stroke: '#e8faff', strokeThickness: 2,
    })
      .setOrigin(0.5, 0).setDepth(400).setAlpha(0);
    this.tweens.add({ targets: text, alpha: 1, duration: 600, delay: 600 });
  }
}
