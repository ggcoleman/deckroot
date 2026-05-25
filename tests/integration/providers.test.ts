import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createFileCache, createMemoryCache } from "@/domain/shared/cache";
import { createRateLimiter } from "@/domain/shared/rate-limit";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("provider infrastructure", () => {
  it("stores, reuses, and expires cached JSON values", async () => {
    const cache = createMemoryCache();
    await cache.set("scryfall", "sol-ring", { name: "Sol Ring" }, 2);
    await expect(cache.get("scryfall", "sol-ring")).resolves.toEqual({ name: "Sol Ring" });
    await sleep(5);
    await expect(cache.get("scryfall", "sol-ring")).resolves.toBeNull();
  });

  it("keeps file cache writes inside the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "deckroot-cache-"));
    const escapedPath = join(dirname(root), "escape.json");
    await rm(escapedPath, { force: true });

    try {
      const cache = createFileCache(root);
      await cache.set("..", "escape", { ok: true }, 60_000);

      await expect(access(escapedPath)).rejects.toThrow();
      await expect(cache.get("..", "escape")).resolves.toEqual({ ok: true });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(escapedPath, { force: true });
    }
  });

  it("queues calls through the rate limiter", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ intervalMs: 100, maxConcurrent: 1 });
    const events: string[] = [];
    const first = limiter.schedule(async () => events.push("first"));
    const second = limiter.schedule(async () => events.push("second"));
    await vi.advanceTimersByTimeAsync(0);
    await first;
    expect(events).toEqual(["first"]);
    await vi.advanceTimersByTimeAsync(100);
    await second;
    expect(events).toEqual(["first", "second"]);
    vi.useRealTimers();
  });

  it("starts queued work up to max concurrency while respecting interval", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ intervalMs: 100, maxConcurrent: 2 });
    let running = 0;
    let maxSeen = 0;
    const releases: Array<() => void> = [];

    const makeWork = () =>
      new Promise<void>((resolve) => {
        running += 1;
        maxSeen = Math.max(maxSeen, running);
        releases.push(() => {
          running -= 1;
          resolve();
        });
      });

    const first = limiter.schedule(makeWork);
    const second = limiter.schedule(makeWork);

    await vi.advanceTimersByTimeAsync(0);
    expect(maxSeen).toBe(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(maxSeen).toBe(2);

    releases.forEach((release) => release());
    await Promise.all([first, second]);
    vi.useRealTimers();
  });
});
