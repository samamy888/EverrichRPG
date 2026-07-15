import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regions = path.join(root, "public", "assets", "maps", "tiled", "regions");

for (const regionId of ["security-check", "duty-free-entrance"]) {
  const mapPath = path.join(regions, `${regionId}.tmj`);
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const props = map.layers.find((layer) => layer.name === "Props");
  const collisions = map.layers.find((layer) => layer.name === "Collision");
  if (!props || !collisions) throw new Error(`${regionId} is missing object layers`);

  const removed = new Set(
    props.objects
      .filter((object) =>
        object.properties?.some(
          (entry) => entry.name === "texture" && entry.value.startsWith("airport-sign-pillar-")
        )
      )
      .map((object) => object.name)
  );
  props.objects = props.objects.filter((object) => !removed.has(object.name));
  collisions.objects = collisions.objects.filter((object) => {
    const owner = object.properties?.find((entry) => entry.name === "ownerId")?.value;
    return !removed.has(owner);
  });
  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`[remove-legacy-sign-pillars] ${regionId}: ${removed.size}`);
}
