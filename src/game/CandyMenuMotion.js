import Phaser from 'phaser';

// Sample the original imagegen artwork. Only these small patches need a shader;
// the rest of each image keeps the regular batched image renderer.
const PATCH_HEADER = `
precision highp float;
uniform vec2 resolution;
uniform vec2 atlasSize;
uniform sampler2D iChannel0;
varying vec2 fragCoord;
vec4 art(vec2 pixel) { return texture2D(iChannel0, pixel / atlasSize); }
vec2 position(vec2 origin, vec2 size) {
  return origin + vec2(fragCoord.x / resolution.x, 1.0 - fragCoord.y / resolution.y) * size;
}
`;

const BLINK_FRAGMENT = `${PATCH_HEADER}
uniform float blink;
vec4 eye(vec2 p, vec2 center, vec4 original) {
  vec2 q = p - center;
  float edge = 1.0 - smoothstep(0.83, 1.0, length(q / vec2(36.0, 60.0)));
  if (edge <= 0.0) return original;
  // The face shading is reconstructed from the pink skin either side of the
  // eye. Compress the original eye, including its highlight, over that skin.
  vec4 skin = mix(art(vec2(center.x - 37.0, p.y)),
                  art(vec2(center.x + 37.0, p.y)), clamp(q.x / 74.0 + 0.5, 0.0, 1.0));
  vec2 squeezed = vec2(q.x, q.y / max(0.09, 1.0 - blink * 0.91));
  float lid = 1.0 - smoothstep(0.83, 1.0, length(squeezed / vec2(36.0, 60.0)));
  vec4 closed = skin;
  if (lid > 0.0) closed = mix(skin, art(center + squeezed), lid);
  return mix(original, closed, edge * smoothstep(0.0, 0.12, blink));
}
void main() {
  vec2 p = position(vec2(830.0, 185.0), vec2(200.0, 140.0));
  vec4 color = art(p);
  color = eye(p, vec2(882.0, 258.0), color);
  color = eye(p, vec2(971.0, 250.0), color);
  gl_FragColor = color;
}
`;

const PORTAL_FRAGMENT = `${PATCH_HEADER}
uniform float clock;
void main() {
  vec2 p = position(vec2(1510.0, 50.0), vec2(330.0, 340.0));
  vec2 center = vec2(1675.0, 223.0), axes = vec2(105.0, 130.0);
  vec2 q = (p - center) / axes;
  float angle = clock * 0.65;
  vec2 swirl = vec2(cos(angle) * q.x - sin(angle) * q.y,
                   sin(angle) * q.x + cos(angle) * q.y);
  float weight = 1.0 - smoothstep(0.72, 1.0, length(q));
  vec4 core = art(center + swirl * axes);
  core.rgb *= 1.0 + 0.045 * sin(clock * 2.3);
  // Composite only the interior over the original hero. Transparent halo pixels
  // outside it must not be drawn twice, which would reveal the patch rectangle.
  gl_FragColor = core * weight;
}
`;

class ArtworkPatch {
  constructor(scene, image, name, fragment, rect, uniforms) {
    this.image = image;
    this.rect = rect;
    const source = image.texture.getSourceImage();
    const shader = new Phaser.Display.BaseShader(name, fragment, undefined, {
      atlasSize: { type: '2f', value: { x: source.width, y: source.height } }, ...uniforms,
    });
    // Reuse the existing sampler without reuploading it or changing its mipmap
    // filter: the same texture is also used by regular images in other scenes.
    this.sprite = scene.add.shader(shader, 0, 0, rect[2], rect[3], [image.texture.key])
      .setDepth(image.depth + .1);
  }

  align() {
    const image = this.image, frame = image.frame, [x, y, width, height] = this.rect;
    const dx = (x - frame.cutX + width / 2 - image.width * image.originX) * image.scaleX;
    const dy = (y - frame.cutY + height / 2 - image.height * image.originY) * image.scaleY;
    const c = Math.cos(image.rotation), s = Math.sin(image.rotation);
    this.sprite.setPosition(image.x + dx * c - dy * s, image.y + dx * s + dy * c)
      .setDisplaySize(width * image.scaleX, height * image.scaleY).setRotation(image.rotation);
  }
}

export class CandyMenuMotion {
  constructor(scene, { logo, hero, play, decor = [] }) {
    this.scene = scene;
    this.logo = logo;
    this.hero = hero;
    this.play = play;
    this.decor = decor;
    this.clock = 0;
    this.nextBlink = 1.6;
    this.blinkStart = -1;
    this.blink = 0;
    this.hover = 0;
    this.hovered = false;
    this.preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = this.preference.matches;
    this.onPreference = event => { this.reduced = event.matches; this.update(0); };
    this.preference.addEventListener('change', this.onPreference);
    if (scene.game.renderer.type === Phaser.WEBGL) {
      this.eyes = new ArtworkPatch(scene, logo, 'candy-logo-blink', BLINK_FRAGMENT,
        [830, 185, 200, 140], { blink: { type: '1f', value: 0 } });
      if (hero) this.portal = new ArtworkPatch(scene, hero, 'candy-lobby-portal', PORTAL_FRAGMENT,
        [1510, 50, 330, 340], { clock: { type: '1f', value: 0 } });
    }
    this.sparkles = hero ? Array.from({ length: 6 }, () =>
      scene.add.image(0, 0, 'gameplay-decor-sheet', 'spark').setDepth(hero.depth + .2)
        .setBlendMode(Phaser.BlendModes.ADD)) : [];
    this.onOver = () => { this.hovered = true; };
    this.onOut = () => { this.hovered = false; };
    play?.on('pointerover', this.onOver).on('pointerout', this.onOut);
    this.onUpdate = (_time, delta) => this.update(delta);
    scene.events.on('update', this.onUpdate);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.onUpdate);
      this.preference.removeEventListener('change', this.onPreference);
      play?.off('pointerover', this.onOver).off('pointerout', this.onOut);
    });
  }

  layout() {
    this.homes = new Map([this.logo, this.hero, this.play,
      ...this.decor.flatMap(item => [item.island, item.clone])].filter(Boolean)
      .map(image => [image, { x: image.x, y: image.y, width: image.displayWidth,
        height: image.displayHeight, rotation: this.homes?.get(image)?.rotation ?? image.rotation }]));
    this.update(0);
  }

  float(image, offset, angle = 0, size = 1) {
    if (!image) return;
    const home = this.homes.get(image);
    image.setPosition(home.x, home.y + offset).setRotation(home.rotation + angle)
      .setDisplaySize(home.width * size, home.height * size);
  }

  update(delta) {
    if (!this.homes) return;
    const dt = Math.min(delta, 50) / 1000;
    if (!this.reduced) this.clock += dt;
    const t = this.clock, active = this.reduced ? 0 : 1;
    this.float(this.logo, Math.sin(t * 1.05) * 4 * active, Math.sin(t * .8) * .004 * active);
    this.float(this.hero, Math.sin(t * 1.35) * 6 * active);
    this.hover += ((this.hovered ? 1 : 0) - this.hover) * (1 - Math.exp(-dt * 12));
    this.float(this.play, 0, 0, 1 + active * (.009 * Math.sin(t * 1.75) + .022 * this.hover));
    this.decor.forEach((item, index) => {
      const offset = Math.sin(t * 1.15 + index * 2.1) * 7 * active;
      this.float(item.island, offset);
      this.float(item.clone, offset);
    });
    if (t >= this.nextBlink) {
      this.blinkStart = t;
      this.nextBlink = t + 2.8 + Math.random() * 2.6;
    }
    const age = t - this.blinkStart;
    this.blink = active && age >= 0 && age < .22
      ? age < .065 ? Math.sin(age / .065 * Math.PI / 2)
        : age < .105 ? 1 : Math.cos((age - .105) / .115 * Math.PI / 2) : 0;
    if (this.eyes) {
      this.eyes.align();
      this.eyes.sprite.setVisible(this.blink > 0).setUniform('blink.value', this.blink);
    }
    if (this.portal) {
      this.portal.align();
      this.portal.sprite.setVisible(!this.reduced).setUniform('clock.value', t);
    }
    if (!this.hero) return;
    const frame = this.hero.frame, sx = this.hero.scaleX, sy = this.hero.scaleY;
    const px = this.hero.x + (1675 - frame.cutX - this.hero.width / 2) * sx;
    const py = this.hero.y + (223 - frame.cutY - this.hero.height / 2) * sy;
    this.sparkles.forEach((spark, index) => {
      const phase = t * .6 + index * Math.PI / 3;
      const alpha = Math.pow(Math.max(0, Math.sin(t * 1.7 + index * 1.3)), 2) * .65;
      const size = (11 + index % 3 * 4) * sx;
      spark.setVisible(!this.reduced).setPosition(px + Math.cos(phase) * 160 * sx,
        py + Math.sin(phase) * 180 * sy).setDisplaySize(size, size).setAlpha(alpha).setRotation(phase);
    });
  }
}
