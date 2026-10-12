import Phaser from 'phaser';
import { ROYAL_TEXT } from '../game/RenderQuality.js';

// This scene remains above both levels, so the scene swap never exposes a frame.
export class LevelTransitionScene extends Phaser.Scene {
  constructor() { super('LevelTransition'); }

  create({ sourceKey, targetKey, targetData = {} }) {
    this.sourceKey = sourceKey;
    this.targetKey = targetKey;
    this.targetData = targetData;
    this.phase = 'closing';
    this.motion = { closed: 0 };
    this.target = null;
    this.targetReady = null;
    this.left = this.add.image(0, 0, 'gameplay-transition', 'left').setOrigin(0);
    this.right = this.add.image(0, 0, 'gameplay-transition', 'right').setOrigin(0);
    this.caption = this.add.container(0, 0).setAlpha(0);
    this.plate = this.add.image(0, 0, 'candy-panels', 'pill');
    this.title = this.add.text(0, 0, targetKey === 'Ending' ? 'FINALE' : `LEVEL ${targetData.number}`, {
      ...ROYAL_TEXT, fontSize: '36px', color: '#0742b9',
    }).setOrigin(.5);
    this.caption.add([this.plate, this.title]);
    this.blocker = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive();
    this.blocker.on('pointerdown', (_pointer, _x, _y, event) => event.stopPropagation());
    this.resize = () => this.layout();
    this.scale.on('resize', this.resize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.resize);
      if (this.targetReady) this.scene.get(targetKey).events.off(Phaser.Scenes.Events.CREATE, this.targetReady);
      if (this.target?.sys.isActive()) this.unlockTarget();
    });
    this.layout();
    this.scene.bringToTop();
    this.tweens.add({
      targets: this.motion, closed: 1, duration: 340, ease: 'Cubic.easeInOut',
      onUpdate: () => this.layoutDoors(), onComplete: () => this.swapLevel(),
    });
  }

  swapLevel() {
    this.phase = 'covered';
    this.layoutDoors();
    this.targetReady = () => {
      this.target = this.scene.get(this.targetKey);
      this.scene.bringToTop();
      this.phase = 'label';
      this.tweens.add({
        targets: this.caption, alpha: 1, duration: 130, ease: 'Quad.easeOut',
        onComplete: () => {
          this.phase = 'holding';
          this.time.delayedCall(300, () => this.openDoors());
        },
      });
    };
    this.scene.get(this.targetKey).events.once(Phaser.Scenes.Events.CREATE, this.targetReady);
    this.scene.stop(this.sourceKey);
    this.scene.launch(this.targetKey, { ...this.targetData, transition: 'candy' });
  }

  openDoors() {
    this.phase = 'opening';
    this.tweens.add({ targets: this.caption, alpha: 0, duration: 130, ease: 'Quad.easeIn' });
    this.tweens.add({
      targets: this.motion, closed: 0, duration: 400, ease: 'Cubic.easeInOut',
      onUpdate: () => this.layoutDoors(),
      onComplete: () => {
        this.unlockTarget();
        this.scene.stop();
      },
    });
  }

  unlockTarget() {
    if (!this.target) return;
    this.target.transitioning = false;
    this.target.input.enabled = true;
    this.target.accumulator = 0;
    this.target.inputController?.clear({ keyboard: false });
    this.target = null;
  }

  layout() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height).setZoom(1).setScroll(0, 0);
    const density = this.scale.displayScale.x;
    const plateWidth = Math.min(width * .78, 440 * density);
    this.plate.setDisplaySize(plateWidth, plateWidth * .30);
    this.title.setScale(plateWidth / 400);
    this.caption.setPosition(width / 2, height / 2);
    this.blocker.setSize(width, height);
    this.layoutDoors();
  }

  layoutDoors() {
    const { width, height } = this.scale.gameSize;
    // One backing pixel of overlap prevents a seam on fractional display sizes.
    const travel = width / 2 + 1;
    const frame = this.left.frame;
    // Cover the viewport uniformly; the camera clips the excess instead of
    // stretching the cloud and candy artwork on tall or wide screens.
    const scale = Math.max(travel / frame.width, height / frame.height);
    const leafWidth = frame.width * scale;
    const y = (height - frame.height * scale) / 2;
    this.left.setScale(scale).setPosition(-leafWidth + travel * this.motion.closed, y);
    this.right.setScale(scale).setPosition(width - travel * this.motion.closed, y);
  }
}
