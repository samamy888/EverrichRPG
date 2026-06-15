import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const regionRoot = resolve("public/assets/maps/tiled/regions");
const mapFiles = (await readdir(regionRoot)).filter((file) => file.endsWith(".tmj"));
let kioskCount = 0;
let portalCount = 0;

const setProperty = (properties, name, value, type) => {
  const next = properties.filter((property) => property.name !== name);
  next.push({ name, type, value });
  return next;
};

for (const file of mapFiles) {
  const path = resolve(regionRoot, file);
  const map = JSON.parse(await readFile(path, "utf8"));
  const props = map.layers.find((layer) => layer.name === "Props")?.objects ?? [];
  const portals = map.layers.find((layer) => layer.name === "Portals")?.objects ?? [];

  for (const object of props) {
    const texture = object.properties?.find((property) => property.name === "texture")?.value;
    if (typeof texture !== "string" || !texture.startsWith("airport-digital-map-kiosk-")) {
      continue;
    }
    object.properties = setProperty(object.properties ?? [], "visualEffect", "kioskPulse", "string");
    object.properties = setProperty(object.properties, "effectColor", "#56e7ff", "string");
    object.properties = setProperty(object.properties, "effectDurationMs", 1400, "int");
    kioskCount += 1;
  }

  for (const portal of portals) {
    portal.properties = setProperty(
      portal.properties ?? [],
      "visualEffect",
      "portalFlow",
      "string"
    );
    portal.properties = setProperty(portal.properties, "effectColor", "#fff2bc", "string");
    portal.properties = setProperty(portal.properties, "effectDurationMs", 1150, "int");
    portalCount += 1;
  }

  await writeFile(path, `${JSON.stringify(map, null, 1)}\n`);
}

console.log(`[environment-effects] updated ${kioskCount} kiosks and ${portalCount} portals`);
