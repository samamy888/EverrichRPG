import type {
  BoundaryData,
  DialogueChoiceData,
  Facing,
  FloorTexture,
  MapObjectData,
  MapObjectTexture,
  NpcMovementType,
  PortalData,
  QuestDialogueStatus,
  RectData,
  RegionData,
  RegionId,
  SpawnData,
  TileLayerData,
  VisualEffectData,
  VisualEffectStyle,
} from "../prototypeRegions";
import { TiledPropertyReader } from "./TiledPropertyReader";
import type {
  TiledLayer,
  TiledMap,
  TiledObject,
  TiledTilesetCollection,
} from "./TiledTypes";

const GID_MASK = 0x1fffffff;
const OBJECT_LAYER_NAMES = ["Props", "Merchandise", "NPCs"] as const;

export class TiledRegionParser {
  parse(
    regionId: RegionId,
    map: TiledMap,
    tilesets: TiledTilesetCollection,
  ): RegionData {
    const tileLayers = this.parseTileLayers(map, tilesets);
    const collisionByOwner = this.buildCollisionIndex(map);
    const objects = OBJECT_LAYER_NAMES.flatMap((layerName) =>
      this.getObjects(map, layerName),
    ).map((object) => this.parseMapObject(object, collisionByOwner));

    const boundaries = this.getObjects(map, "Walls").map<BoundaryData>(
      (object) => ({
        ...this.toRect(object),
        texture: new TiledPropertyReader(
          object.properties,
        ).requiredString("texture") as BoundaryData["texture"],
      }),
    );
    const portals = this.getObjects(map, "Portals").map((object) =>
      this.parsePortal(object),
    );
    const spawns = this.getObjects(map, "Spawns").map((object) =>
      this.parseSpawn(object),
    );
    const floorTexture =
      tileLayers
        .flatMap((layer) => layer.tiles)
        .find((texture): texture is FloorTexture => !!texture) ??
      "floor-terrazzo";

    return {
      id: regionId,
      name:
        new TiledPropertyReader(map.properties).string("name") ?? regionId,
      width: map.width * map.tilewidth,
      height: map.height * map.tileheight,
      floorTexture: floorTexture as RegionData["floorTexture"],
      spawns,
      portals,
      boundaries,
      objects,
      tileLayers,
    };
  }

  private parseTileLayers(
    map: TiledMap,
    tilesets: TiledTilesetCollection,
  ): TileLayerData[] {
    const gidTextures = this.buildGidTextureMap(map, tilesets);
    return map.layers
      .filter(
        (
          layer,
        ): layer is TiledLayer &
          Required<Pick<TiledLayer, "data" | "width" | "height">> =>
          layer.type === "tilelayer" &&
          Array.isArray(layer.data) &&
          typeof layer.width === "number" &&
          typeof layer.height === "number",
      )
      .map((layer) => ({
        name: layer.name,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity ?? 1,
        tiles: layer.data.map(
          (rawGid) =>
            (gidTextures.get(rawGid & GID_MASK) as FloorTexture | undefined) ??
            null,
        ),
      }));
  }

  private buildGidTextureMap(
    map: TiledMap,
    tilesets: TiledTilesetCollection,
  ): Map<number, string> {
    const result = new Map<number, string>();
    for (const reference of map.tilesets) {
      const tileset = tilesets.get(reference.source);
      for (const tile of tileset?.tiles ?? []) {
        const texture = new TiledPropertyReader(tile.properties).string("texture");
        if (texture) {
          result.set(reference.firstgid + tile.id, texture);
        }
      }
    }

    return result;
  }

  private buildCollisionIndex(map: TiledMap): Map<string, RectData> {
    const result = new Map<string, RectData>();
    for (const object of this.getObjects(map, "Collision")) {
      const ownerId = new TiledPropertyReader(object.properties).string("ownerId");
      if (ownerId) {
        result.set(ownerId, this.toRect(object));
      }
    }

    return result;
  }

  private parseMapObject(
    object: TiledObject,
    collisionByOwner: ReadonlyMap<string, RectData>,
  ): MapObjectData {
    const properties = new TiledPropertyReader(object.properties);
    const decorative = properties.boolean("decorative");
    const collision = collisionByOwner.get(object.name);
    if (!collision && !decorative) {
      throw new Error(`Tiled object "${object.name}" is missing collision data.`);
    }

    const interactionTitle = properties.string("interactionTitle");
    const interactionLines = properties.string("interactionLines");
    const interactionChoices = properties.string("interactionChoices");
    const interactionQuestLines = properties.string("interactionQuestLines");
    const movementType = properties.string("movementType");
    const displayHeight = properties.number("displayHeight");
    const depthOffset = properties.number("depthOffset") ?? 0;
    const wallAttachment = this.parseWallAttachment(
      properties.string("wallAttachment"),
    );
    const visualEffect = this.parseVisualEffect(properties);
    const npcBehavior = movementType
      ? {
          movementType: this.parseMovementType(movementType),
          facing: this.parseFacing(properties.string("facing")),
          speed: properties.number("speed") ?? 52,
          animationKey: properties.string("animationKey") ?? "",
        }
      : undefined;

    return {
      id: object.name,
      texture: properties.requiredString("texture") as MapObjectTexture,
      x: object.x + object.width / 2,
      baselineY: object.y,
      displayWidth: object.width,
      ...(displayHeight ? { displayHeight } : {}),
      collision: collision ?? {
        x: object.x,
        y: object.y,
        width: 0,
        height: 0,
      },
      ...(properties.string("label")
        ? { label: properties.requiredString("label") }
        : {}),
      ...(interactionTitle
        ? {
            interaction: {
              title: interactionTitle,
              lines: this.parseLines(interactionLines),
              ...(interactionChoices
                ? { choices: this.parseDialogueChoices(interactionChoices) }
                : {}),
              ...(interactionQuestLines
                ? {
                    questLines:
                      this.parseQuestDialogueLines(interactionQuestLines),
                  }
                : {}),
            },
          }
        : {}),
      ...(properties.boolean("foreground") ? { foreground: true } : {}),
      ...(decorative ? { decorative: true } : {}),
      ...(depthOffset ? { depthOffset } : {}),
      ...(wallAttachment ? { wallAttachment } : {}),
      ...(npcBehavior ? { npcBehavior } : {}),
      ...(visualEffect ? { visualEffect } : {}),
    };
  }

  private parseWallAttachment(
    value: string | undefined,
  ): MapObjectData["wallAttachment"] {
    if (value === "north" || value === "west" || value === "east") {
      return value;
    }
    return undefined;
  }

  private parsePortal(object: TiledObject): PortalData {
    const properties = new TiledPropertyReader(object.properties);
    const visualEffect = this.parseVisualEffect(properties);
    return {
      id: object.name,
      bounds: this.toRect(object),
      destinationRegionId:
        properties.requiredString("destinationRegionId") as RegionId,
      destinationSpawnId: properties.requiredString("destinationSpawnId"),
      ...(visualEffect ? { visualEffect } : {}),
    };
  }

  private parseSpawn(object: TiledObject): SpawnData {
    return {
      id: object.name,
      x: object.x,
      y: object.y,
      facing: new TiledPropertyReader(
        object.properties,
      ).requiredString("facing") as Facing,
    };
  }

  private parseVisualEffect(
    properties: TiledPropertyReader,
  ): VisualEffectData | undefined {
    const style = properties.string("visualEffect");
    if (style !== "kioskPulse" && style !== "portalFlow") {
      return undefined;
    }

    const parsedColor = Number.parseInt(
      (properties.string("effectColor") ?? "#56e7ff").replace(/^#/, ""),
      16,
    );
    return {
      style: style as VisualEffectStyle,
      color: Number.isFinite(parsedColor) ? parsedColor : 0x56e7ff,
      durationMs: Math.max(
        500,
        properties.number("effectDurationMs") ?? 1400,
      ),
    };
  }

  private parseMovementType(value: string): NpcMovementType {
    return value === "idle" || value === "patrol" ? value : "wander";
  }

  private parseFacing(value: string | undefined): Facing {
    return value === "up" || value === "left" || value === "right"
      ? value
      : "down";
  }

  private parseLines(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((line) => typeof line === "string")
      ) {
        return parsed;
      }
    } catch {
      return [value];
    }

    return [value];
  }

  private parseDialogueChoices(value: string): DialogueChoiceData[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.flatMap((choice) => {
        if (
          typeof choice !== "object" ||
          choice === null ||
          !("label" in choice) ||
          typeof choice.label !== "string" ||
          !("responseLines" in choice) ||
          !Array.isArray(choice.responseLines) ||
          !choice.responseLines.every(
            (line: unknown) => typeof line === "string",
          )
        ) {
          return [];
        }

        return [{ label: choice.label, responseLines: choice.responseLines }];
      });
    } catch {
      return [];
    }
  }

  private parseQuestDialogueLines(
    value: string,
  ): Partial<Record<QuestDialogueStatus, string[]>> {
    const statuses: QuestDialogueStatus[] = [
      "available",
      "active",
      "ready",
      "completed",
    ];
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        return {};
      }

      return Object.fromEntries(
        statuses.flatMap((status) => {
          const lines = (parsed as Record<string, unknown>)[status];
          return Array.isArray(lines) &&
            lines.every((line) => typeof line === "string")
            ? [[status, lines]]
            : [];
        }),
      );
    } catch {
      return {};
    }
  }

  private getObjects(map: TiledMap, layerName: string): TiledObject[] {
    return (
      map.layers.find(
        (layer) => layer.name === layerName && layer.type === "objectgroup",
      )?.objects ?? []
    );
  }

  private toRect(object: TiledObject): RectData {
    return {
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
    };
  }
}
