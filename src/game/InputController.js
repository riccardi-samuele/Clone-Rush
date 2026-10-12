import { CANDY_ICONS } from './CandySky.js';

const KEY_ACTIONS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyR: 'reset', Escape: 'back', KeyB: 'back', Enter: 'confirm', Space: 'confirm',
};

function keyboardHub(game) {
  let hub = game.registry.get('keyboardHub');
  if (hub) return hub;
  hub = { keys: new Map(), listeners: new Set(), priority: 'right' };
  const down = (event) => {
    game.registry.set('keyboardSupport', true);
    if (event.code === 'Escape' && document.fullscreenElement) return;
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    const alreadyHeld = hub.keys.has(event.code);
    hub.keys.set(event.code, action);
    if (event.repeat || alreadyHeld) return;
    if (action === 'left' || action === 'right') hub.priority = action;
    hub.listeners.forEach((listener) => listener(action));
    game.registry.get('audio')?.start();
  };
  const up = (event) => hub.keys.delete(event.code);
  const blur = () => hub.keys.clear();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  game.events.once('destroy', () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  });
  game.registry.set('keyboardHub', hub);
  return hub;
}

export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.hub = keyboardHub(scene.game);
    this.keyboard = this.hub.keys;
    this.touches = new Map();
    this.ignoredPointers = new Set();
    this.pressed = new Set();
    this.priority = this.hub.priority;
    this.buttons = [];
    this.onDown = (action) => this.press(action);
    this.onPointerUp = (pointer) => this.releasePointer(pointer.id);
    this.onBlur = () => this.clear();
    this.onResize = () => this.clear({ keyboard: false });
    this.hub.listeners.add(this.onDown);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);
    scene.game.events.on('blur', this.onBlur);
    scene.game.events.on('hidden', this.onBlur);
    scene.scale.on('resize', this.onResize);
    scene.events.once('shutdown', () => this.destroy());
  }

  press(action) {
    this.pressed.add(action);
    if (action === 'left' || action === 'right') {
      this.priority = action;
      this.hub.priority = action;
    }
  }

  held(action) {
    return [...this.keyboard.values()].includes(action)
      || [...this.touches.values()].some((entry) => entry.action === action);
  }

  snapshot() {
    this.refreshTouches();
    const state = {
      left: this.held('left'), right: this.held('right'), up: this.held('up'),
      down: this.held('down'), direction: 0, pressed: new Set(this.pressed),
    };
    state.direction = state.left && state.right ? (this.priority === 'left' ? -1 : 1)
      : state.left ? -1 : state.right ? 1 : 0;
    this.pressed.clear();
    return state;
  }

  addButton(action, x, y, options = {}) {
    const width = options.width ?? (['left', 'right', 'up'].includes(action) ? 80 : 40);
    const height = options.height ?? 40;
    const frame = { left: 'left', right: 'right', up: 'jump', reset: 'restart', back: 'back' }[action];
    const sprite = this.scene.add.image(x, y, CANDY_ICONS, frame).setOrigin(0)
      .setDisplaySize(width, height).setDepth(500).setAlpha(0.85);
    const hit = this.scene.add.zone(x, y, width, height).setOrigin(0).setDepth(502).setInteractive({ useHandCursor: true });
    const button = { sprite, hit, action };
    this.buttons.push(button);
    const activate = (pointer) => {
      if (this.scene.leaving || this.scene.transitioning || !this.scene.input.enabled
        || !hit.visible || this.ignoredPointers.has(pointer.id)) return;
      const previous = this.touches.get(pointer.id);
      if (previous?.button === button) return;
      if (previous) this.setButtonVisual(previous.button, false);
      this.touches.set(pointer.id, { action, button });
      this.press(action);
      this.setButtonVisual(button, true);
      this.scene.registry.get('audio')?.start();
    };
    button.activate = activate;
    hit.on('pointerdown', activate);
    hit.on('pointerover', (pointer) => {
      if (pointer.isDown) activate(pointer);
      else sprite.setAlpha(0.85);
    });
    hit.on('pointerout', (pointer) => {
      if (this.touches.get(pointer.id)?.button === button) this.releasePointer(pointer.id);
      else this.setButtonVisual(button, false);
    });
    return sprite;
  }

  refreshTouches() {
    for (const pointer of this.scene.input.manager.pointers) {
      if (!this.scene.input.enabled || !pointer.isDown || this.touches.has(pointer.id)
        || this.ignoredPointers.has(pointer.id)) continue;
      const point = pointer.positionToCamera(this.scene.hud?.camera ?? this.scene.cameras.main);
      const button = this.buttons.find((entry) => ['left', 'right', 'up'].includes(entry.action)
        && entry.hit.visible && entry.hit.input?.enabled
        && entry.hit.getBounds().contains(point.x, point.y));
      if (button) button.activate(pointer);
    }
  }

  setButtonVisual(button, active) {
    if (!button.sprite.active) return;
    button.sprite.setAlpha(active ? 1 : 0.85);
    if (active) button.sprite.setTint(0xffffff);
    else button.sprite.clearTint();
  }

  releasePointer(id) {
    this.ignoredPointers.delete(id);
    const touch = this.touches.get(id);
    if (!touch) return;
    this.touches.delete(id);
    const stillHeld = [...this.touches.values()].some((entry) => entry.button === touch.button);
    this.setButtonVisual(touch.button, stillHeld);
  }

  clear({ keyboard = true } = {}) {
    // A finger still down during pause, rotation or focus loss must lift
    // before it can press a control at its new position.
    for (const pointer of this.scene.input.manager.pointers) {
      if (pointer.isDown) this.ignoredPointers.add(pointer.id);
    }
    if (keyboard) this.keyboard.clear();
    this.touches.clear();
    this.pressed.clear();
    this.buttons.forEach((button) => this.setButtonVisual(button, false));
  }

  destroy() {
    this.clear({ keyboard: false });
    this.hub.listeners.delete(this.onDown);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);
    this.scene.game.events.off('blur', this.onBlur);
    this.scene.game.events.off('hidden', this.onBlur);
    this.scene.scale.off('resize', this.onResize);
  }
}
