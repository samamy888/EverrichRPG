import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const config = JSON.parse(
  readFileSync(
    resolve(root, "game/content/exploration/hidden-collectibles.json"),
    "utf8"
  )
);
const ids = new Set();

for (const collectible of config.collectibles) {
  if (ids.has(collectible.id)) throw new Error(`Duplicate collectible: ${collectible.id}`);
  ids.add(collectible.id);
  const map = JSON.parse(
    readFileSync(
      resolve(root, `public/assets/maps/tiled/regions/${collectible.regionId}.tmj`),
      "utf8"
    )
  );
  const objectNames = map.layers
    .filter((layer) => layer.type === "objectgroup")
    .flatMap((layer) => layer.objects ?? [])
    .map((object) => object.name);
  if (!objectNames.includes(collectible.objectId)) {
    throw new Error(
      `${collectible.id} references missing object ${collectible.objectId} in ${collectible.regionId}`
    );
  }
}

console.log(`[exploration:verify] OK (${config.collectibles.length} hidden collectibles)`);
