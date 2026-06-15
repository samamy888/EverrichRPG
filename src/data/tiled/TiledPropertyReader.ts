import type { TiledProperty } from "./TiledTypes";

export class TiledPropertyReader {
  constructor(private readonly properties: TiledProperty[] | undefined) {}

  string(name: string): string | undefined {
    const value = this.value(name);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  requiredString(name: string): string {
    const value = this.string(name);
    if (!value) {
      throw new Error(`Tiled property "${name}" is required.`);
    }

    return value;
  }

  boolean(name: string): boolean {
    return this.value(name) === true;
  }

  number(name: string): number | undefined {
    const value = this.value(name);
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  }

  private value(name: string): TiledProperty["value"] | undefined {
    return this.properties?.find((property) => property.name === name)?.value;
  }
}
