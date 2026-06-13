import Phaser from "phaser";
import type {
  BoundaryData,
  Facing,
  FloorTexture,
  MapObjectData,
  MapObjectTexture,
  DialogueChoiceData,
  QuestDialogueStatus,
  NpcMovementType,
  PortalData,
  RectData,
  RegionData,
  RegionId,
  SpawnData,
  TileLayerData
} from "./prototypeRegions";

interface TiledProperty {
  name: string;
  value: boolean | number | string;
}

interface TiledObject {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  properties?: TiledProperty[];
}

interface TiledLayer {
  name: string;
  type: "tilelayer" | "objectgroup";
  width?: number;
  height?: number;
  opacity?: number;
  data?: number[];
  objects?: TiledObject[];
}

interface TiledTilesetReference {
  firstgid: number;
  source: string;
}

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTilesetReference[];
  properties?: TiledProperty[];
}

interface TiledTilesetTile {
  id: number;
  properties?: TiledProperty[];
}

interface TiledTileset {
  tiles?: TiledTilesetTile[];
}

const MAP_CACHE_PREFIX = "tiled-map-";
const TILESET_CACHE_KEYS = [
  "tiled-tileset-floors",
  "tiled-tileset-props",
  "tiled-tileset-npcs"
] as const;
const GID_MASK = 0x1fffffff;

export const TILED_REGION_IDS = [
  "duty-free-entrance",
  "security-check",
  "departure-hall",
  "information-core",
  "airport-facilities",
  "duty-free-central",
  "shop-beauty-01",
  "shop-liquor-food-01",
  "shop-gift-01"
] as const satisfies readonly RegionId[];

export function preloadTiledRegions(scene: Phaser.Scene): void {
  const base = "/assets/maps/tiled";
  scene.load.json(TILESET_CACHE_KEYS[0], `${base}/tilesets/airport-floors.tsj`);
  scene.load.json(TILESET_CACHE_KEYS[1], `${base}/tilesets/airport-props.tsj`);
  scene.load.json(TILESET_CACHE_KEYS[2], `${base}/tilesets/airport-npcs.tsj`);
  for (const regionId of TILED_REGION_IDS) {
    scene.load.json(`${MAP_CACHE_PREFIX}${regionId}`, `${base}/regions/${regionId}.tmj`);
  }
}

export function loadTiledRegion(scene: Phaser.Scene, regionId: RegionId): RegionData | null {
  const map = scene.cache.json.get(`${MAP_CACHE_PREFIX}${regionId}`) as TiledMap | undefined;
  if (!map) return null;

  const gidTextures = buildGidTextureMap(scene, map);
  const tileLayers = map.layers
    .filter((layer): layer is TiledLayer & Required<Pick<TiledLayer, "data" | "width" | "height">> =>
      layer.type === "tilelayer" &&
      Array.isArray(layer.data) &&
      typeof layer.width === "number" &&
      typeof layer.height === "number"
    )
    .map<TileLayerData>((layer) => ({
      name: layer.name,
      width: layer.width,
      height: layer.height,
      opacity: layer.opacity ?? 1,
      tiles: layer.data.map((rawGid) => gidTextures.get(rawGid & GID_MASK) as FloorTexture | null ?? null)
    }));

  const collisionByOwner = new Map<string, RectData>();
  for (const object of getObjects(map, "Collision")) {
    const ownerId = getString(object.properties, "ownerId");
    if (ownerId) collisionByOwner.set(ownerId, toRect(object));
  }

  const objects = [
    ...getObjects(map, "Props"),
    ...getObjects(map, "Merchandise"),
    ...getObjects(map, "NPCs")
  ].map<MapObjectData>((object) => {
    const texture = getRequiredString(object.properties, "texture") as MapObjectTexture;
    const decorative = getBoolean(object.properties, "decorative");
    const collision = collisionByOwner.get(object.name);
    if (!collision && !decorative) {
      throw new Error(`Tiled object "${object.name}" is missing collision data.`);
    }
    const label = getString(object.properties, "label");
    const interactionTitle = getString(object.properties, "interactionTitle");
    const interactionLines = getString(object.properties, "interactionLines");
    const interactionChoices = getString(object.properties, "interactionChoices");
    const interactionQuestLines = getString(object.properties, "interactionQuestLines");
    const foreground = getBoolean(object.properties, "foreground");
    const depthOffset = getNumber(object.properties, "depthOffset") ?? 0;
    const movementType = getString(object.properties, "movementType");
    const npcBehavior = movementType
      ? {
          movementType: parseMovementType(movementType),
          facing: parseFacing(getString(object.properties, "facing")),
          speed: getNumber(object.properties, "speed") ?? 52,
          animationKey: getString(object.properties, "animationKey") ?? ""
        }
      : undefined;

    return {
      id: object.name,
      texture,
      x: object.x + object.width / 2,
      baselineY: object.y,
      displayWidth: object.width,
      collision: collision ?? { x: object.x, y: object.y, width: 0, height: 0 },
      ...(label ? { label } : {}),
      ...(interactionTitle
        ? {
            interaction: {
              title: interactionTitle,
              lines: parseLines(interactionLines),
              ...(interactionChoices
                ? { choices: parseDialogueChoices(interactionChoices) }
                : {}),
              ...(interactionQuestLines
                ? { questLines: parseQuestDialogueLines(interactionQuestLines) }
                : {})
            }
          }
        : {}),
      ...(foreground ? { foreground: true } : {})
      ,
      ...(decorative ? { decorative: true } : {}),
      ...(depthOffset ? { depthOffset } : {}),
      ...(npcBehavior ? { npcBehavior } : {})
    };
  });

  const boundaries = getObjects(map, "Walls").map<BoundaryData>((object) => ({
    ...toRect(object),
    texture: getRequiredString(object.properties, "texture") as BoundaryData["texture"]
  }));

  const portals = getObjects(map, "Portals").map<PortalData>((object) => ({
    id: object.name,
    bounds: toRect(object),
    destinationRegionId: getRequiredString(
      object.properties,
      "destinationRegionId"
    ) as RegionId,
    destinationSpawnId: getRequiredString(object.properties, "destinationSpawnId")
  }));

  const spawns = getObjects(map, "Spawns").map<SpawnData>((object) => ({
    id: object.name,
    x: object.x,
    y: object.y,
    facing: getRequiredString(object.properties, "facing") as Facing
  }));

  const floorTexture =
    tileLayers.flatMap((layer) => layer.tiles).find((texture): texture is FloorTexture => !!texture) ??
    "floor-terrazzo";

  return {
    id: regionId,
    name: getString(map.properties, "name") ?? regionId,
    width: map.width * map.tilewidth,
    height: map.height * map.tileheight,
    floorTexture: floorTexture as RegionData["floorTexture"],
    spawns,
    portals,
    boundaries,
    objects,
    tileLayers
  };
}

function buildGidTextureMap(scene: Phaser.Scene, map: TiledMap): Map<number, string> {
  const result = new Map<number, string>();
  map.tilesets.forEach((reference, index) => {
    const cacheKey = TILESET_CACHE_KEYS[index];
    if (!cacheKey) return;
    const tileset = scene.cache.json.get(cacheKey) as TiledTileset | undefined;
    for (const tile of tileset?.tiles ?? []) {
      const texture = getString(tile.properties, "texture");
      if (texture) result.set(reference.firstgid + tile.id, texture);
    }
  });
  return result;
}

function getObjects(map: TiledMap, layerName: string): TiledObject[] {
  return map.layers.find((layer) => layer.name === layerName && layer.type === "objectgroup")
    ?.objects ?? [];
}

function getString(properties: TiledProperty[] | undefined, name: string): string | undefined {
  const value = properties?.find((property) => property.name === name)?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getRequiredString(properties: TiledProperty[] | undefined, name: string): string {
  const value = getString(properties, name);
  if (!value) throw new Error(`Tiled property "${name}" is required.`);
  return value;
}

function getBoolean(properties: TiledProperty[] | undefined, name: string): boolean {
  return properties?.find((property) => property.name === name)?.value === true;
}

function getNumber(properties: TiledProperty[] | undefined, name: string): number | undefined {
  const value = properties?.find((property) => property.name === name)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseMovementType(value: string): NpcMovementType {
  return value === "idle" || value === "patrol" ? value : "wander";
}

function parseFacing(value: string | undefined): Facing {
  return value === "up" || value === "left" || value === "right" ? value : "down";
}

function parseLines(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((line) => typeof line === "string")) return parsed;
  } catch {
    return [value];
  }
  return [value];
}

function parseDialogueChoices(value: string): DialogueChoiceData[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((choice) => {
      if (
        typeof choice !== "object" ||
        choice === null ||
        !("label" in choice) ||
        typeof choice.label !== "string" ||
        !("responseLines" in choice) ||
        !Array.isArray(choice.responseLines) ||
        !choice.responseLines.every((line: unknown) => typeof line === "string")
      ) {
        return [];
      }
      return [{ label: choice.label, responseLines: choice.responseLines }];
    });
  } catch {
    return [];
  }
}

function parseQuestDialogueLines(
  value: string
): Partial<Record<QuestDialogueStatus, string[]>> {
  const statuses: QuestDialogueStatus[] = ["available", "active", "ready", "completed"];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      statuses.flatMap((status) => {
        const lines = (parsed as Record<string, unknown>)[status];
        return Array.isArray(lines) && lines.every((line) => typeof line === "string")
          ? [[status, lines]]
          : [];
      })
    );
  } catch {
    return {};
  }
}

function toRect(object: TiledObject): RectData {
  return { x: object.x, y: object.y, width: object.width, height: object.height };
}
