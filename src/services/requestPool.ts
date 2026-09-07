/** Bound simultaneous app-server requests, without limiting saved accounts. */
export class RequestPool {
  private active = 0;
  private waiting: (() => void)[] = [];

  constructor(private readonly concurrency = 3) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>(resolve => this.waiting.push(resolve));
    } else {
      this.active++;
    }
    try { return await operation(); }
    finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
