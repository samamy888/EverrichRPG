import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tiledRoot = path.join(root, "public/assets/maps/tiled");
const regionsRoot = path.join(tiledRoot, "regions");
const floorsPath = path.join(tiledRoot, "tilesets/airport-floors.tsj");
const floors = JSON.parse(fs.readFileSync(floorsPath, "utf8"));
const textureOf = (tile) => tile.properties?.find((property) => property.name === "texture")?.value;
const families = ["terrazzo", "ivory", "carpet-blue"];
const familyByTileId = new Map();
const variantsByFamily = new Map();
for (const family of families) {
  const variants = floors.tiles
    .filter((tile) => textureOf(tile)?.startsWith(`floor-${family}-v`))
    .sort((left, right) => left.id - right.id)
    .map((tile) => tile.id);
  if (variants.length !== 4) throw new Error(`Expected four floor-${family} variants`);
  variantsByFamily.set(family, variants);
  for (const tile of floors.tiles) {
    const texture = textureOf(tile);
    if (texture === `floor-${family}` || texture?.startsWith(`floor-${family}-v`)) {
      familyByTileId.set(tile.id, family);
    }
  }
}

for (const fileName of fs.readdirSync(regionsRoot).filter((name) => name.endsWith(".tmj"))) {
  const mapPath = path.join(regionsRoot, fileName);
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const reference = map.tilesets.find((entry) => entry.source.endsWith("airport-floors.tsj"));
  if (!reference) continue;
  const seed = [...fileName].reduce((total, character) => total + character.charCodeAt(0), 0);
  for (const layer of map.layers.filter((candidate) => candidate.type === "tilelayer")) {
    layer.data = layer.data.map((rawGid, index) => {
      if (!rawGid) return rawGid;
      const flags = rawGid & ~0x1fffffff;
      const gid = rawGid & 0x1fffffff;
      const tileId = gid - reference.firstgid;
      const family = familyByTileId.get(tileId);
      if (!family) return rawGid;
      const x = index % layer.width;
      const y = Math.floor(index / layer.width);
      const variants = variantsByFamily.get(family);
      const variantTileId = variants[(seed + x * 3 + y * 5 + (x >> 2)) % variants.length];
      return flags | (reference.firstgid + variantTileId);
    });
  }
  const indent = fileName === "duty-free-central.tmj" ? 1 : 2;
  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, indent)}\n`);
  console.log(`[distribute-floor-variants] ${fileName}`);
}
