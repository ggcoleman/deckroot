import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type ProviderCache = {
  get<T>(provider: string, key: string): Promise<T | null>;
  set<T>(provider: string, key: string, value: T, ttlMs: number): Promise<void>;
};

type Entry = { expiresAt: number; value: unknown };
const safeKey = (value: string) => {
  const sanitized = value.replace(/[\\/]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "_");
  return sanitized.replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "_";
};

export function createMemoryCache(now: () => number = () => Date.now()): ProviderCache {
  const entries = new Map<string, Entry>();
  const id = (provider: string, key: string) => `${provider}:${key}`;
  return {
    async get<T>(provider: string, key: string) {
      const entry = entries.get(id(provider, key));
      if (!entry || entry.expiresAt <= now()) return null;
      return entry.value as T;
    },
    async set<T>(provider: string, key: string, value: T, ttlMs: number) {
      entries.set(id(provider, key), { expiresAt: now() + ttlMs, value });
    }
  };
}

export function createFileCache(rootDir: string, now: () => number = () => Date.now()): ProviderCache {
  return {
    async get<T>(provider: string, key: string) {
      const filePath = join(rootDir, safeKey(provider), `${safeKey(key)}.json`);
      try {
        const entry = JSON.parse(await readFile(filePath, "utf8")) as Entry;
        if (entry.expiresAt <= now()) return null;
        return entry.value as T;
      } catch {
        return null;
      }
    },
    async set<T>(provider: string, key: string, value: T, ttlMs: number) {
      const filePath = join(rootDir, safeKey(provider), `${safeKey(key)}.json`);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify({ expiresAt: now() + ttlMs, value }, null, 2));
    }
  };
}
