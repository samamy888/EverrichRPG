import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tilesetPath = path.join(root, "public/assets/maps/tiled/tilesets/airport-floors.tsj");
const tileset = JSON.parse(fs.readFileSync(tilesetPath, "utf8"));
const floors = ["terrazzo", "ivory", "carpet-blue"];
tileset.tiles = tileset.tiles.filter(
  (tile) => !tile.properties?.some((property) => /^floor-(terrazzo|ivory|carpet-blue)-v[1-4]$/.test(property.value))
);
let nextId = Math.max(...tileset.tiles.map((tile) => tile.id)) + 1;
for (const floor of floors) {
  for (let variant = 1; variant <= 4; variant += 1) {
    const texture = `floor-${floor}-v${variant}`;
    tileset.tiles.push({
      id: nextId++,
      image: `images/${texture}.png`,
      imagewidth: 16,
      imageheight: 16,
      properties: [{ name: "texture", type: "string", value: texture }]
    });
  }
}
tileset.tilecount = Math.max(...tileset.tiles.map((tile) => tile.id)) + 1;
fs.writeFileSync(tilesetPath, `${JSON.stringify(tileset, null, 2)}\n`);
console.log(`[apply-floor-variants] ${tileset.tilecount} floor tiles`);
