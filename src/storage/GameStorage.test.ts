import { describe, expect, it } from "vitest";
import { GameStorage } from "./GameStorage";
import type { StorageAdapter } from "./StorageAdapter";

class MemoryStorageAdapter implements StorageAdapter {
  private readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

interface VersionedSave {
  version: 1;
  name: string;
}

const isVersionedSave = (value: unknown): value is VersionedSave =>
  typeof value === "object" &&
  value !== null &&
  "version" in value &&
  value.version === 1 &&
  "name" in value &&
  typeof value.name === "string";

describe("GameStorage", () => {
  it("writes and reads strings and JSON values", () => {
    const storage = new GameStorage(new MemoryStorageAdapter());

    storage.writeString("setting", "enabled");
    storage.writeJson("save", { version: 1, name: "traveler" });

    expect(storage.readString("setting")).toBe("enabled");
    expect(
      storage.readJson<VersionedSave>(
        "save",
        () => ({ version: 1, name: "fallback" }),
        isVersionedSave,
      ),
    ).toEqual({ version: 1, name: "traveler" });
  });

  it("uses a fresh fallback for missing, invalid, or outdated data", () => {
    const adapter = new MemoryStorageAdapter();
    const storage = new GameStorage(adapter);
    const fallback = () => ({ version: 1 as const, name: "fallback" });

    adapter.set("broken", "{");
    adapter.set("outdated", JSON.stringify({ version: 0, name: "old" }));

    expect(storage.readJson("missing", fallback, isVersionedSave)).toEqual(
      fallback(),
    );
    expect(storage.readJson("broken", fallback, isVersionedSave)).toEqual(
      fallback(),
    );
    expect(storage.readJson("outdated", fallback, isVersionedSave)).toEqual(
      fallback(),
    );
  });

  it("removes stored values", () => {
    const storage = new GameStorage(new MemoryStorageAdapter());
    storage.writeString("temporary", "value");

    storage.remove("temporary");

    expect(storage.readString("temporary")).toBeNull();
  });
});
