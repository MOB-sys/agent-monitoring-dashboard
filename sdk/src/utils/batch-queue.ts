export type FlushCallback<T> = (items: T[]) => Promise<void>;

export class BatchQueue<T> {
  private queue: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxSize: number;
  private readonly intervalMs: number;
  private readonly onFlush: FlushCallback<T>;

  constructor(options: {
    maxSize: number;
    intervalMs: number;
    onFlush: FlushCallback<T>;
  }) {
    this.maxSize = options.maxSize;
    this.intervalMs = options.intervalMs;
    this.onFlush = options.onFlush;
  }

  push(item: T): void {
    this.queue.push(item);
    if (this.queue.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.intervalMs);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;

    const items = this.queue.splice(0);
    try {
      await this.onFlush(items);
    } catch (err) {
      // Re-queue on failure (put at front)
      this.queue.unshift(...items);
    }
  }

  get size(): number {
    return this.queue.length;
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
