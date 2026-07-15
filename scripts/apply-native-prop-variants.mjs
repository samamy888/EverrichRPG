import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tilesetPath = path.join(root, "public/assets/maps/tiled/tilesets/airport-props.tsj");
const tileset = JSON.parse(fs.readFileSync(tilesetPath, "utf8"));

const animated = [
  ["airport-self-order-kiosk", "airport-self-order-kiosk-v2", "self-order-kiosk", 144, 224],
  ["airport-water-dispenser-animated", "airport-water-dispenser-animated-v2", "water-dispenser", 112, 176],
  ["airport-planter-animated-north", "airport-planter-animated-native-v3/north", "planter-north", 192, 176],
  ["airport-planter-animated-west", "airport-planter-animated-native-v3/west", "planter-west", 124, 200],
  ["airport-planter-animated-east", "airport-planter-animated-native-v3/east", "planter-east", 124, 200],
  ["airport-vending-machine", "airport-vending-machine-v2", "vending-machine", 128, 192],
  ["airport-ad-column", "airport-ad-column-v2", "ad-column", 128, 224],
  ["airport-atrium-lamp", "airport-atrium-lamp-v2", "atrium-lamp", 128, 192],
  ["airport-escalator-animated-south", "airport-escalator-animated-south-v2", "escalator-south", 224, 256]
];

const statics = [
  ["airport-waiting-seats-horizontal", "airport-directional-v3/waiting-seats-horizontal.png", 352, 144],
  ["airport-recycling-station", "airport-facilities-v3/recycling-station.png", 160, 128],
  ["airport-cleaning-trolley", "airport-terminal-details-native-v2/airport-cleaning-trolley/prop.png", 128, 144]
];

const textureOf = (tile) => tile.properties?.find((property) => property.name === "texture")?.value;
const tileById = new Map(tileset.tiles.map((tile) => [tile.id, tile]));

for (const [texture, folder, prefix, width, height] of animated) {
  const base = tileset.tiles.find((tile) => textureOf(tile) === texture);
  if (!base?.animation || base.animation.length !== 4) {
    throw new Error(`Expected four animation frames for ${texture}`);
  }
  for (const [index, animationFrame] of base.animation.entries()) {
    const tile = tileById.get(animationFrame.tileid);
    if (!tile) throw new Error(`Missing tile ${animationFrame.tileid} for ${texture}`);
    tile.image = `../../../props/${folder}/${prefix}-${index + 1}.png`;
    tile.imagewidth = width;
    tile.imageheight = height;
  }
}

for (const [texture, assetPath, width, height] of statics) {
  const tile = tileset.tiles.find((candidate) => textureOf(candidate) === texture);
  if (!tile) throw new Error(`Missing static tile for ${texture}`);
  tile.image = `../../../props/${assetPath}`;
  tile.imagewidth = width;
  tile.imageheight = height;
}

fs.writeFileSync(tilesetPath, `${JSON.stringify(tileset, null, 2)}\n`);
console.log("[apply-native-prop-variants] airport-props.tsj updated");
