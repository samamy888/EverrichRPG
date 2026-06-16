export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class BrowserStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return this.storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.storage()?.setItem(key, value);
    } catch {
      return;
    }
  }

  remove(key: string): void {
    try {
      this.storage()?.removeItem(key);
    } catch {
      return;
    }
  }

  private storage(): Storage | null {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  }
}
