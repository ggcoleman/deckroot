import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";

export type ProviderCache = {
  get<T>(provider: string, key: string): Promise<T | null>;
  set<T>(provider: string, key: string, value: T, ttlMs: number): Promise<void>;
};

type Entry = { expiresAt: number; value: unknown };
const safeKey = (value: string) => {
  const sanitized = value.replace(/[\\/]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "_");
  return sanitized.replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "_";
};

const isInsideRoot = (root: string, target: string) => {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
};

const assertRealPathInsideRoot = async (rootDir: string, targetPath: string) => {
  const realRoot = await realpath(
    /* turbopackIgnore: true */
    rootDir,
  );
  const realTarget = await realpath(
    /* turbopackIgnore: true */
    targetPath,
  );
  if (!isInsideRoot(realRoot, realTarget)) {
    throw new Error(`Cache path escapes root: ${targetPath}`);
  }
};

const assertNotSymlink = async (targetPath: string) => {
  try {
    const stats = await lstat(
      /* turbopackIgnore: true */
      targetPath,
    );
    if (stats.isSymbolicLink()) {
      throw new Error(`Cache path cannot be a symlink: ${targetPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
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
      const providerDir = join(
        /* turbopackIgnore: true */
        rootDir,
        safeKey(provider),
      );
      const filePath = join(
        /* turbopackIgnore: true */
        providerDir,
        `${safeKey(key)}.json`,
      );
      try {
        await assertNotSymlink(providerDir);
        await assertRealPathInsideRoot(rootDir, providerDir);
        await assertNotSymlink(filePath);
        await assertRealPathInsideRoot(rootDir, filePath);
        const entry = JSON.parse(await readFile(
          /* turbopackIgnore: true */
          filePath,
          "utf8",
        )) as Entry;
        if (entry.expiresAt <= now()) return null;
        return entry.value as T;
      } catch {
        return null;
      }
    },
    async set<T>(provider: string, key: string, value: T, ttlMs: number) {
      await mkdir(
        /* turbopackIgnore: true */
        rootDir,
        { recursive: true },
      );
      const providerDir = join(
        /* turbopackIgnore: true */
        rootDir,
        safeKey(provider),
      );
      const filePath = join(
        /* turbopackIgnore: true */
        providerDir,
        `${safeKey(key)}.json`,
      );

      await assertNotSymlink(providerDir);
      await mkdir(
        /* turbopackIgnore: true */
        providerDir,
        { recursive: true },
      );
      await assertRealPathInsideRoot(rootDir, providerDir);
      await assertNotSymlink(filePath);
      await assertRealPathInsideRoot(rootDir, dirname(filePath));
      await writeFile(
        /* turbopackIgnore: true */
        filePath,
        JSON.stringify({ expiresAt: now() + ttlMs, value }, null, 2),
      );
    }
  };
}
