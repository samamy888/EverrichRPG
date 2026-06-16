import {
  BrowserStorageAdapter,
  type StorageAdapter,
} from "./StorageAdapter";

export class GameStorage {
  constructor(private readonly adapter: StorageAdapter) {}

  readString(key: string): string | null {
    return this.adapter.get(key);
  }

  writeString(key: string, value: string): void {
    this.adapter.set(key, value);
  }

  readJson<T>(
    key: string,
    fallback: () => T,
    isValid: (value: unknown) => value is T,
  ): T {
    const raw = this.adapter.get(key);
    if (!raw) {
      return fallback();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : fallback();
    } catch {
      return fallback();
    }
  }

  writeJson<T>(key: string, value: T): void {
    this.adapter.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.adapter.remove(key);
  }
}

export const gameStorage = new GameStorage(new BrowserStorageAdapter());
