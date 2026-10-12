import Phaser from 'phaser';
import { addUiTexture } from './RenderQuality.js';

const preparations = new WeakMap();
const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

class UiPreparation {
  constructor(loader) {
    this.loader = loader;
    this.sceneEvents = loader.scene.events;
    this.gameEvents = loader.scene.game.events;
    this.jobs = new Map();
    this.nextId = 0;
    this.insertions = Promise.resolve();
    this.worker = new Worker(new URL('./UiImagePreparation.worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      const job = this.jobs.get(data.id);
      if (!job) { data.bitmap?.close(); return; }
      this.jobs.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data);
    };
    this.worker.onerror = event => {
      event.preventDefault();
      this.dispose(new Error('UI image worker unavailable'));
    };
    this.onComplete = () => this.dispose();
    this.onShutdown = () => this.dispose(new DOMException('Loading stopped', 'AbortError'));
    loader.once('complete', this.onComplete);
    this.sceneEvents.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    this.sceneEvents.once(Phaser.Scenes.Events.DESTROY, this.onShutdown);
    this.gameEvents.once(Phaser.Core.Events.DESTROY, this.onShutdown);
  }

  prepare(blob) {
    if (this.stopped) return Promise.reject(this.stopError);
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.jobs.set(id, { resolve, reject });
      this.worker.postMessage({ id, blob });
    });
  }

  insert(callback) {
    // A decoded image can arrive while another is uploading. Never upload the
    // entire ready batch in one task; allow a paint before each insertion.
    const result = this.insertions.then(async () => {
      await nextPaint();
      if (this.stopped) throw this.stopError;
      callback();
    });
    this.insertions = result.catch(() => {});
    return result;
  }

  dispose(error = new DOMException('Loading finished', 'AbortError')) {
    if (this.stopped) return;
    this.stopped = true;
    this.stopError = error;
    this.worker.terminate();
    for (const job of this.jobs.values()) job.reject(error);
    this.jobs.clear();
    this.loader.off('complete', this.onComplete);
    this.sceneEvents.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    this.sceneEvents.off(Phaser.Scenes.Events.DESTROY, this.onShutdown);
    this.gameEvents.off(Phaser.Core.Events.DESTROY, this.onShutdown);
    preparations.delete(this.loader);
  }
}

// Upload an already prepared bitmap once. Browsers without worker canvas support
// retain the normal ImageFile decode path and the existing canvas preparation.
class UiImageFile extends Phaser.Loader.FileTypes.ImageFile {
  onProcess() {
    if (!this.preparation) { super.onProcess(); return; }
    this.state = Phaser.Loader.FILE_PROCESSING;
    this.preparation.prepare(this.xhrLoader.response).then(async prepared => {
      this.data = prepared.bitmap;
      this.uiSize = prepared;
      await this.preparation.insert(() => super.onProcessComplete());
    }).catch(error => {
      this.uiSize?.bitmap.close();
      this.uiSize = null;
      if (error.name !== 'AbortError') super.onProcess();
    });
  }

  addToCache() {
    const game = this.loader.scene.game;
    if (!this.uiSize) { addUiTexture(game, this.key, this.data); return; }
    const texture = game.textures.addImage(this.key, this.data);
    texture.get().setSize(this.uiSize.width, this.uiSize.height);
    texture.royalMipmapped = true;
    const bitmap = this.data;
    // Keep the source available for island joins, shaders and WebGL recovery.
    game.events.once(Phaser.Core.Events.DESTROY, () => bitmap.close());
  }
}

export function loadUiImage(scene, key, url) {
  const file = new UiImageFile(scene.load, key, url);
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
      && typeof createImageBitmap === 'function') {
    try {
      if (!preparations.has(scene.load)) preparations.set(scene.load, new UiPreparation(scene.load));
      file.preparation = preparations.get(scene.load);
    } catch { /* Worker creation can be blocked; use Phaser's image loader. */ }
  }
  scene.load.addFile(file);
}
