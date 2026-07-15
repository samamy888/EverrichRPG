import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const regionsDir = resolve(process.cwd(), "public/assets/maps/tiled/regions");

function textureProperty(entry) {
  return entry.properties?.find((property) => property.name === "texture")?.value;
}

for (const fileName of readdirSync(regionsDir).filter((name) => name.endsWith(".tmj"))) {
  const mapPath = resolve(regionsDir, fileName);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const textureGids = new Map();
  let nextFirstgid = 1;

  for (const reference of map.tilesets) {
    const tilesetPath = resolve(dirname(mapPath), reference.source);
    const tileset = JSON.parse(readFileSync(tilesetPath, "utf8"));
    const maxTileId = Math.max(...(tileset.tiles ?? []).map((tile) => tile.id), -1);
    reference.firstgid = nextFirstgid;
    for (const tile of tileset.tiles ?? []) {
      const texture = textureProperty(tile);
      if (typeof texture === "string") {
        textureGids.set(texture, reference.firstgid + tile.id);
      }
    }
    nextFirstgid += maxTileId + 1;
  }

  for (const layer of map.layers.filter((candidate) => candidate.type === "objectgroup")) {
    for (const object of layer.objects ?? []) {
      const texture = textureProperty(object);
      const gid = textureGids.get(texture);
      if (typeof object.gid === "number" && typeof gid === "number") object.gid = gid;
    }
  }

  const indent = fileName === "duty-free-central.tmj" ? 1 : 2;
  writeFileSync(mapPath, `${JSON.stringify(map, null, indent)}\n`, "utf8");
  console.log(`[tiled:normalize-firstgids] ${fileName}`);
}
