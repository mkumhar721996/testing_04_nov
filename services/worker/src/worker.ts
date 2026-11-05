export type Job = () => Promise<void> | void;

export class Worker {
  private readonly queue: Job[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly intervalMs = 1000) {}

  enqueue(job: Job): void {
    this.queue.push(job);
  }

  get pending(): number {
    return this.queue.length;
  }

  /** Runs every queued job once, in order. Returns the number processed. */
  async drain(): Promise<number> {
    let processed = 0;
    for (let job = this.queue.shift(); job; job = this.queue.shift()) {
      await job();
      processed++;
    }
    return processed;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.drain(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
