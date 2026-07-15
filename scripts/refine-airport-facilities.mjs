import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(root, "public/assets/maps/tiled/regions/airport-facilities.tmj");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const props = map.layers.find((layer) => layer.name === "Props");
const collisions = map.layers.find((layer) => layer.name === "Collision");
if (!props || !collisions) throw new Error("airport-facilities is missing Props or Collision");

const layout = {
  "facilities-restroom": { x: 48, y: 112, collision: [56, 88, 160, 24] },
  "facilities-water": { x: 232, y: 112, collision: [248, 96, 24, 16] },
  "facilities-emergency-cabinet": { x: 296, y: 112, collision: [312, 96, 16, 16] },
  "facilities-escalator": { x: 368, y: 128, collision: [384, 96, 80, 32] },
  "facilities-cleaning-trolley": { x: 112, y: 192, collision: [128, 176, 32, 16] },
  "facilities-planter": { x: 176, y: 224, collision: [216, 208, 16, 16] },
  "facilities-charging-pedestal": { x: 280, y: 224, collision: [296, 208, 16, 16] },
  "facilities-moving-walkway": { x: 336, y: 224, collision: [368, 208, 80, 16] },
  "facilities-self-order-kiosk": { x: 40, y: 304, collision: [60, 288, 32, 16] },
  "facilities-vending-machine": { x: 120, y: 304, collision: [140, 288, 24, 16] },
  "facilities-recycling-station": { x: 200, y: 304, collision: [208, 288, 64, 16] },
  "facilities-waiting-seats": { x: 304, y: 304, collision: [312, 288, 152, 16] }
};

for (const object of props.objects) {
  const placement = layout[object.name];
  if (!placement) continue;
  object.x = placement.x;
  object.y = placement.y;
}
for (const collision of collisions.objects) {
  const ownerId = collision.properties?.find((property) => property.name === "ownerId")?.value;
  const placement = layout[ownerId];
  if (!placement) continue;
  [collision.x, collision.y, collision.width, collision.height] = placement.collision;
}

fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log("[refine-airport-facilities] grouped facility layout updated");
