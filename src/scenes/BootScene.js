import Phaser from 'phaser';
import { ProgressStore } from '../game/ProgressStore.js';
import { AudioManager } from '../game/AudioManager.js';
import { ART_IMAGES } from '../game/AssetManifest.js';
import { prepareUiTexture } from '../game/RenderQuality.js';
import { LoadingScreen } from '../game/LoadingScreen.js';
import { registerRoyalGameplayTextures } from '../game/RoyalGameplay.js';
import { finishReveal } from '../game/Transitions.js';
import { loadUiImage } from '../game/UiImageFile.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.loading = new LoadingScreen();
    // HTML owns the loading visuals. Keep Phaser's loader/update loop running,
    // but don't clear and redraw a full WebGL surface beneath it every frame.
    this.bootClearBeforeRender = this.game.renderer.config.clearBeforeRender;
    this.game.renderer.config.clearBeforeRender = false;
    this.cameras.main.setVisible(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.restoreRendering());
    this.loadingStage = 'interface';
    this.fontReady = document.fonts.load('700 48px "Royal UI"').catch(() => []);
    this.cameras.main.setBackgroundColor('#67c8ff');
    this.load.json('catalog', 'data/catalog.json');
    this.load.json('levels', 'data/levels.json');
    this.load.json('gameplay-art-frames', 'assets/candy-sky-v1/frames.json');
    for (const [key, path] of Object.entries(ART_IMAGES)) loadUiImage(this, key, path);
    this.load.on('loaderror', () => this.showError());
    this.load.on('progress', (value) => {
      this.loading.progress(this.loadingStage === 'interface' ? value * 0.3 : 0.3 + value * 0.6);
    });
  }

  create() {
    const catalog = this.cache.json.get('catalog');
    const levels = this.cache.json.get('levels');
    if (!catalog || !levels || this.failed) return;
    this.registry.set('catalog', catalog);
    this.registry.set('levels', levels);
    this.registry.set('progress', new ProgressStore(levels.levels.length));
    this.registry.set('keyboardSupport', !(navigator.maxTouchPoints || 'ontouchstart' in window));

    for (const audio of catalog.audio) {
      if (audio.paths.length) this.load.audio(audio.key, audio.paths);
    }
    this.loadingStage = 'game';
    this.load.once('complete', () => this.finishLoading().catch(() => this.showError()));
    this.load.start();
  }

  async finishLoading() {
    if (this.failed) return;
    await this.fontReady;
    if (this.failed) return;
    const catalog = this.registry.get('catalog');
    const uiKeys = Object.keys(ART_IMAGES);
    for (const [index, key] of uiKeys.entries()) {
      prepareUiTexture(this.game, key);
      this.loading.progress(0.9 + (index + 1) / uiKeys.length * 0.08);
      // Let the browser paint between texture uploads instead of freezing the loader.
      await new Promise(requestAnimationFrame);
    }
    registerRoyalGameplayTextures(this);
    const gate = this.textures.get('gameplay-transition');
    const frame = gate.get();
    gate.add('left', 0, 0, 0, frame.width / 2, frame.height);
    gate.add('right', 0, frame.width / 2, 0, frame.width / 2, frame.height);
    this.registry.set('audio', new AudioManager(this.game, catalog, this.registry.get('progress')));
    const menu = this.scene.get('Menu');
    menu.sys.events.once('create', () => {
      this.loading.progress(0.99);
      // Dismiss HTML only after the complete lobby has reached the renderer.
      // The static HTML loader is removed only once the lobby is ready.
      this.game.events.once(Phaser.Core.Events.POST_RENDER, async () => {
        await this.loading.complete();
        if (menu.sys.isActive()) finishReveal(menu);
      });
    });
    this.restoreRendering();
    this.scene.start('Menu', { transition: 'boot' });
  }

  restoreRendering() {
    if (this.bootClearBeforeRender === undefined) return;
    this.game.renderer.config.clearBeforeRender = this.bootClearBeforeRender;
    this.bootClearBeforeRender = undefined;
    this.cameras.main?.setVisible(true);
  }

  showError() {
    if (this.failed) return;
    this.failed = true;
    this.loading.error();
  }
}
