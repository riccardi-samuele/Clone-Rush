import Phaser from 'phaser';

const PORTAL_ENTRY_MS = 640;
export const PORTAL_CLOSE_DELAY_MS = PORTAL_ENTRY_MS - 80;
export const PORTAL_CLOSE_MS = 200;
export const PORTAL_TRANSITION_DELAY_MS = PORTAL_CLOSE_DELAY_MS + PORTAL_CLOSE_MS + 80;

const DECOR = 'gameplay-decor-sheet';
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

// One sequence per clone allows several clones to enter the same portal together.
export class PortalEntryAnimation {
  constructor(scene, clone, portal) {
    this.clone = clone;
    this.portal = portal;
    this.elapsed = 0;
    this.energy = 0;
    this.finished = false;
    this.start = { x: clone.sprite.x, y: clone.sprite.y, angle: clone.sprite.angle,
      width: clone.sprite.displayWidth, height: clone.sprite.displayHeight };
    this.target = { x: portal.object.sprite.x, y: portal.object.sprite.y };
    this.direction = portal.object.type === 15 ? -1 : 1;
    const dx = this.target.x - this.start.x, dy = this.target.y - this.start.y;
    const distance = Math.hypot(dx, dy);
    const normal = { x: distance ? -dy / distance : 1, y: distance ? dx / distance : 0 };
    const bend = (Math.min(10, distance * .4) + 2) * this.direction;
    this.control = { x: (this.start.x + this.target.x) / 2 + normal.x * bend,
      y: (this.start.y + this.target.y) / 2 + normal.y * bend };
    this.mask = scene.game.renderer.type === Phaser.WEBGL ? portal.core.createBitmapMask() : null;
    const tint = portal.object.type === 15 ? 0xe488ff : 0x5bdcff;
    this.glow = scene.add.image(this.target.x, this.target.y, DECOR, 'glow')
      .setDepth(portal.object.sprite.depth - .025).setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.sparks = Array.from({ length: 8 }, (_, i) => scene.add.image(this.target.x,
      this.target.y, DECOR, 'spark').setDepth(portal.object.sprite.depth + .02)
      .setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
  }

  update(delta) {
    if (this.finished) return;
    this.elapsed = Math.min(PORTAL_ENTRY_MS, this.elapsed + delta);
    const t = this.elapsed / PORTAL_ENTRY_MS;
    const u = smooth(0, 1, t), v = 1 - u;
    const curl = Math.sin(Math.PI * t) * (1 - u) * 3;
    const phase = this.direction * t * Math.PI * 2;
    const sprite = this.clone.sprite;
    sprite.setPosition(v * v * this.start.x + 2 * v * u * this.control.x + u * u * this.target.x
      + Math.sin(phase) * curl,
    v * v * this.start.y + 2 * v * u * this.control.y + u * u * this.target.y
      + (Math.cos(phase) - 1) * curl);
    const scale = Math.pow(Math.max(.02, 1 - smooth(.18, 1, t)), 1.2);
    const stretch = Math.sin(Math.PI * t) * .16;
    sprite.setDisplaySize(this.start.width * scale * (1 + stretch),
      this.start.height * scale * (1 - stretch * .6))
      .setAngle(this.start.angle + this.direction * (90 * smooth(.05, .45, t) + 180 * smooth(.45, 1, t)))
      .setAlpha(1 - smooth(.72, 1, t));
    if (t >= .28) sprite.setDepth(this.portal.object.sprite.depth - .005);
    if (t >= .48 && this.mask && !sprite.mask) sprite.setMask(this.mask);
    this.energy = Math.min(1, Math.sin(Math.PI * t) * .75
      + Math.exp(-Math.pow((t - .82) / .12, 2)) * .4);
    this.glow.setDisplaySize(44 + this.energy * 16, 44 + this.energy * 16)
      .setAlpha(this.energy * .32);
    this.sparks.forEach((spark, i) => {
      const life = clamp((t - .08 - i * .035) / .65);
      const angle = i * Math.PI / 4 + this.direction * life * Math.PI * 1.5;
      const radius = (18 + i % 3 * 2) * Math.pow(1 - life, 1.3);
      spark.setPosition(this.target.x + Math.cos(angle) * radius,
        this.target.y + Math.sin(angle) * radius)
        .setDisplaySize(1.8 - life * 1.4, 1.8 - life * 1.4)
        .setAlpha(Math.sin(life * Math.PI) * .85);
    });
    if (t === 1) {
      sprite.setVisible(false);
      this.finished = true;
      this.destroy();
    }
  }

  destroy() {
    if (this.clone.sprite.scene) this.clone.sprite.clearMask();
    this.mask?.destroy();
    this.mask = null;
    if (this.glow.scene) this.glow.destroy();
    for (const spark of this.sparks) if (spark.scene) spark.destroy();
  }
}
