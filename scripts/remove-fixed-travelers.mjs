import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/assets/maps/tiled/regions",
);

function propertyValue(object, name) {
  return object.properties?.find((property) => property.name === name)?.value;
}

function isTraveler(object) {
  const texture = propertyValue(object, "texture");
  const animationKey = propertyValue(object, "animationKey");
  return (
    texture === "traveler-male-npc" ||
    texture === "traveler-female-npc" ||
    animationKey === "traveler-male" ||
    animationKey === "traveler-female"
  );
}

for (const fileName of await readdir(root)) {
  if (!fileName.endsWith(".tmj")) {
    continue;
  }

  const filePath = path.join(root, fileName);
  const map = JSON.parse(await readFile(filePath, "utf8"));
  const npcLayer = map.layers.find(
    (layer) => layer.type === "objectgroup" && layer.name === "NPCs",
  );
  const collisionLayer = map.layers.find(
    (layer) => layer.type === "objectgroup" && layer.name === "Collision",
  );
  const travelerIds = new Set(
    (npcLayer?.objects ?? []).filter(isTraveler).map((object) => object.name),
  );

  if (travelerIds.size === 0) {
    continue;
  }

  npcLayer.objects = npcLayer.objects.filter(
    (object) => !travelerIds.has(object.name),
  );
  if (collisionLayer) {
    collisionLayer.objects = collisionLayer.objects.filter(
      (object) => !travelerIds.has(propertyValue(object, "ownerId")),
    );
  }

  await writeFile(filePath, `${JSON.stringify(map, null, 1)}\n`, "utf8");
  console.log(`${fileName}: removed ${travelerIds.size} fixed travelers`);
}
