import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const regionRoot = resolve(process.cwd(), "public/assets/maps/tiled/regions");
const mapFiles = readdirSync(regionRoot).filter((fileName) => fileName.endsWith(".tmj"));

for (const fileName of mapFiles) {
  const mapPath = resolve(regionRoot, fileName);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const walls = map.layers.find((layer) => layer.name === "Walls");

  for (const wall of walls?.objects ?? []) {
    const texture = wall.properties?.find((entry) => entry.name === "texture");
    if (texture) texture.value = "wall-ivory-panel";
  }

  writeFileSync(mapPath, `${JSON.stringify(map, null, 1)}\n`);
}

console.log(`[ivory-walls] updated ${mapFiles.length} maps`);
