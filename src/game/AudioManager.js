export class AudioManager {
  constructor(game, catalog, progress) {
    this.sound = game.sound;
    this.progress = progress;
    this.catalog = catalog.audio;
    this.recent = new Map();
    this.music = null;
    this.started = false;
    this.onUnlock = () => this.start();
    this.sound.on('unlocked', this.onUnlock);
    game.events.once('destroy', () => {
      this.sound.off('unlocked', this.onUnlock);
      this.music?.destroy();
    });
  }

  start() {
    if (this.sound.locked || this.started) return;
    const track = this.catalog.find((sound) => sound.id === 52);
    if (!track) return;
    this.music = this.sound.add(track.key, { loop: true, volume: this.progress.musicVolume / 100 });
    this.music.play();
    this.started = true;
  }

  play(name) {
    if (!this.progress.soundVolume || this.sound.locked) return;
    const now = performance.now();
    if (now - (this.recent.get(name) ?? -Infinity) < 50) return;
    const asset = this.catalog.find((sound) => sound.name === name);
    if (asset) {
      this.recent.set(name, now);
      this.sound.play(asset.key, { volume: this.progress.soundVolume / 100 });
    }
  }

  updateVolume() {
    if (this.music) this.music.setVolume(this.progress.musicVolume / 100);
  }
}
