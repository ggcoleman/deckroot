export type RateLimiterOptions = { intervalMs: number; maxConcurrent: number };
export type RateLimiter = { schedule<T>(work: () => Promise<T>): Promise<T> };

type QueueItem<T> = {
  work: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const queue: QueueItem<unknown>[] = [];
  let running = 0;
  let lastStart = 0;
  let hasStarted = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const pump = () => {
    if (timer || running >= options.maxConcurrent || queue.length === 0) return;
    const delay = hasStarted ? Math.max(0, options.intervalMs - (Date.now() - lastStart)) : 0;

    timer = setTimeout(() => {
      timer = null;
      const item = queue.shift();
      if (!item) return;

      running += 1;
      hasStarted = true;
      lastStart = Date.now();
      item.work()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          running -= 1;
          pump();
        });
      pump();
    }, delay);
  };

  return {
    schedule<T>(work: () => Promise<T>) {
      return new Promise<T>((resolve, reject) => {
        queue.push({ work, resolve: resolve as (value: unknown) => void, reject });
        pump();
      });
    }
  };
}
