const KEY = 'clone-rush:v1';

const boundedVolume = (value) => Number.isFinite(value)
  ? Math.max(0, Math.min(100, Math.round(value))) : 100;

export class ProgressStore {
  constructor(levelCount) {
    this.levelCount = levelCount;
    this.completed = new Set();
    this.current = 1;
    this.unlockedThrough = 1;
    this.soundVolume = 100;
    this.musicVolume = 100;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved?.version === 1) {
        this.completed = new Set((Array.isArray(saved.completed) ? saved.completed : [])
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= levelCount));
        this.current = Number.isInteger(saved.current)
          ? Math.max(1, Math.min(levelCount, saved.current)) : 1;
        // The original campaign unlocked a three-level window by completion
        // count. Keep those already available maps when migrating its saves.
        this.unlockedThrough = saved.campaignVersion === 2
          ? (Number.isInteger(saved.unlockedThrough)
            ? Math.max(1, Math.min(levelCount, saved.unlockedThrough)) : 1)
          : Math.min(levelCount, this.completed.size + 3);
        this.soundVolume = boundedVolume(saved.soundVolume);
        this.musicVolume = boundedVolume(saved.musicVolume);
        if (!this.isUnlocked(this.current)) this.current = 1;
      }
    } catch { /* A session remains playable when persistent storage is unavailable. */ }
  }

  isUnlocked(number) {
    return number >= 1 && number <= this.levelCount
      && (number <= this.unlockedThrough || this.completed.has(number) || this.completed.has(number - 1));
  }

  select(number) {
    if (!this.isUnlocked(number)) return false;
    this.current = number;
    this.save();
    return true;
  }

  complete(number) {
    this.completed.add(number);
    this.current = Math.min(number + 1, this.levelCount);
    this.save();
  }

  setVolume(kind, value) {
    if (kind === 'sound') this.soundVolume = boundedVolume(value);
    if (kind === 'music') this.musicVolume = boundedVolume(value);
    this.save();
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        version: 1, campaignVersion: 2, unlockedThrough: this.unlockedThrough,
        completed: [...this.completed].sort((a, b) => a - b),
        current: this.current, soundVolume: this.soundVolume, musicVolume: this.musicVolume,
      }));
    } catch { /* Keep the in-memory state if a write is refused. */ }
  }
}
