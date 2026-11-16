/**
 * Holds callers until `parties` have arrived or the timeout passes. It turns
 * "two buyers at the same moment" into a deterministic event instead of luck.
 */
export class ConcurrencyBarrier {
  private waiting: (() => void)[] = [];

  constructor(
    private readonly parties: number,
    private readonly timeoutMs: number,
  ) {}

  arrive(): Promise<void> {
    return new Promise((resolve) => {
      this.waiting.push(resolve);
      if (this.waiting.length >= this.parties) {
        this.releaseAll();
        return;
      }
      setTimeout(() => this.releaseAll(), this.timeoutMs);
    });
  }

  private releaseAll(): void {
    const released = this.waiting;
    this.waiting = [];
    released.forEach((resolve) => resolve());
  }
}
