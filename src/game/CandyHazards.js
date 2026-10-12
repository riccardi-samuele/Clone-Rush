import Phaser from 'phaser';

const { Bodies, Body } = Phaser.Physics.Matter.Matter;
const smooth = t => t * t * (3 - 2 * t);

// The trap clock advances with the fixed physics step, including its fixtures.
// Pausing therefore freezes both the visual extension and the danger zone.
export class CandyHazards {
  constructor(world) {
    this.clock = 0;
    this.teeth = [];
    for (const object of world.objects.filter(o => [9, 11, 13].includes(o.type))) {
      const { instance } = object;
      const width = object.type === 13 ? 80 : object.type === 11 ? 40 : 20;
      const angle = (instance.angle ?? 0) * Math.PI / 180;
      const normal = { x: Math.sin(angle), y: -Math.cos(angle) };
      const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
      const filter = world.filter(world.catalog.actors[object.type].group);
      for (let i = 0; i < width / 20; i++) {
        const offset = (i + .5) * 20 - width / 2;
        const base = { x: instance.x + width / 2 + tangent.x * offset - normal.x * 10,
          y: instance.y + 10 + tangent.y * offset - normal.y * 10 };
        const points = [
          { x: base.x - tangent.x * 5, y: base.y - tangent.y * 5 },
          { x: base.x + normal.x * 11, y: base.y + normal.y * 11 },
          { x: base.x + tangent.x * 5, y: base.y + tangent.y * 5 },
        ];
        const body = Bodies.fromVertices(base.x + normal.x * 11 / 3, base.y + normal.y * 11 / 3,
          points, { isStatic: true, isSensor: true, collisionFilter: filter }, true, .01, 0);
        body.plugin.entity = object;
        world.scene.matter.world.add(body);
        const sprite = world.scene.add.image(base.x, base.y, 'gameplay-objects-sheet', 'spike')
          .setOrigin(.5, 1).setDisplaySize(10, 11).setRotation(angle).setDepth(12);
        const socket = world.scene.add.image(base.x, base.y, 'gameplay-objects-sheet', 'spike-socket')
          .setOrigin(.5, .5).setDisplaySize(12, 2.4).setRotation(angle).setDepth(13);
        // A shallow mounting collar reaches the scalloped underside of the island.
        if (normal.y > .5) socket.setPosition(base.x, base.y - 3).setDisplaySize(12, 8);
        this.teeth.push({ body, sprite, socket, base, normal, extension: 1, mask: filter.mask,
          phase: (Math.round(instance.x / 80) + Math.round(instance.y / 80)) * .31 });
      }
    }
  }

  step() {
    this.clock += .01;
    for (const tooth of this.teeth) {
      const t = (this.clock + tooth.phase) % 4.4;
      const warning = t >= 3.6 && t < 4.1;
      const extension = t < 2.3 ? 1 : t < 2.6 ? 1 - smooth((t - 2.3) / .3)
        : t < 4.1 ? 0 : smooth((t - 4.1) / .3);
      const physical = Math.max(.02, extension), old = Math.max(.02, tooth.extension);
      if (Math.abs(physical - old) > .00001) {
        const sideways = Math.abs(tooth.normal.x) > .5;
        Body.scale(tooth.body, sideways ? physical / old : 1, sideways ? 1 : physical / old);
        Body.setPosition(tooth.body, { x: tooth.base.x + tooth.normal.x * 11 * physical / 3,
          y: tooth.base.y + tooth.normal.y * 11 * physical / 3 });
      }
      tooth.body.collisionFilter.mask = extension > .12 ? tooth.mask : 0;
      tooth.sprite.setDisplaySize(10, 11 * physical).setVisible(extension > .02);
      if (warning && Math.sin(t * 40) > 0) tooth.socket.setTint(0xff77b6);
      else tooth.socket.clearTint();
      tooth.extension = extension;
    }
  }
}
