import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regions = path.join(root, "public", "assets", "maps", "tiled", "regions");

const shops = [
  ["shop-beauty-01", "beauty"],
  ["shop-liquor-food-01", "liquor"],
  ["shop-gift-01", "gift"]
];

for (const [regionId, prefix] of shops) {
  const mapPath = path.join(regions, `${regionId}.tmj`);
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const merchandise = map.layers.find((layer) => layer.name === "Merchandise");
  if (!merchandise) throw new Error(`${regionId} is missing Merchandise`);

  const equipment = merchandise.objects.find(
    (object) => object.name === `${prefix}-checkout-equipment`
  );
  const items = merchandise.objects.find(
    (object) => object.name === `${prefix}-checkout-items`
  );
  if (!equipment || !items) throw new Error(`${regionId} is missing checkout overlays`);

  equipment.y = 100.8;
  items.y = 100;

  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`Aligned checkout overlays in ${regionId}`);
}
