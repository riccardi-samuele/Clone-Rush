// HTML remains visible while Phaser and the first asset batch are downloading.
export class LoadingScreen {
  constructor() {
    this.element = document.querySelector('#loading-screen');
    this.fill = document.querySelector('#loading-fill');
    this.art = this.fill.querySelector('svg');
    this.track = this.element.querySelector('[role="progressbar"]');
    this.label = document.querySelector('#loading-label');
    this.percent = document.querySelector('#loading-percent');
    this.target = 0;
  }

  progress(value) {
    if (this.failed) return;
    const target = Math.max(this.target, Math.min(1, value));
    this.target = target;
    const number = Math.min(this.done ? 100 : 99, Math.floor(target * 100));
    if (number === this.number) return;
    this.number = number;
    // Update only when loading advances, with no interpolation or frame loop.
    this.fill.style.transform = `translateX(${(number - 100)}%)`;
    this.art.style.transform = `translateX(${(100 - number)}%)`;
    this.percent.textContent = `${number}%`;
    this.track.setAttribute('aria-valuenow', String(number));
  }

  complete() {
    if (this.completion) return this.completion;
    this.completion = new Promise(resolve => { this.resolveCompletion = resolve; });
    this.done = true;
    this.label.textContent = 'Ready!';
    this.progress(1);
    // Paint 100% once, then reveal the already rendered lobby without a fade.
    // Input stays blocked until removal and the completion promise resolves.
    this.frame = requestAnimationFrame(() => {
      this.frame = requestAnimationFrame(() => this.dismiss());
    });
    return this.completion;
  }

  dismiss() {
    this.element.dataset.state = 'complete';
    this.element.remove();
    this.resolveCompletion?.();
  }

  error() {
    cancelAnimationFrame(this.frame);
    this.failed = true;
    this.element.dataset.state = 'error';
    this.label.textContent = 'Unable to load';
    const message = document.querySelector('#loading-error');
    message.textContent = 'Check your connection and try again.';
    message.hidden = false;
    const retry = document.querySelector('#loading-retry');
    retry.hidden = false;
    retry.addEventListener('click', () => window.location.reload(), { once: true });
  }
}
