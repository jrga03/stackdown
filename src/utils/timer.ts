export class Timer {
  private elapsed = 0;

  update(deltaMs: number): void {
    this.elapsed += deltaMs;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  reset(): void {
    this.elapsed = 0;
  }
}
