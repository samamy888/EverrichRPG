import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(root, "public/assets/maps/tiled/regions/information-core.tmj");
const propsPath = path.join(root, "public/assets/maps/tiled/tilesets/airport-props.tsj");
const floorsPath = path.join(root, "public/assets/maps/tiled/tilesets/airport-floors.tsj");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const propsTileset = JSON.parse(fs.readFileSync(propsPath, "utf8"));
const floorsTileset = JSON.parse(fs.readFileSync(floorsPath, "utf8"));

const property = (name, value, type = "string") => ({ name, type, value });
const textureOf = (tile) => tile.properties?.find((entry) => entry.name === "texture")?.value;
const firstgidFor = (source) => map.tilesets.find((entry) => entry.source.endsWith(source))?.firstgid;
const floorFirstgid = firstgidFor("airport-floors.tsj");
const propFirstgid = firstgidFor("airport-props.tsj");
if (floorFirstgid === undefined || propFirstgid === undefined) throw new Error("Missing floor or prop tileset");

const floorGid = (texture) => {
  const tile = floorsTileset.tiles.find((entry) => textureOf(entry) === texture);
  if (!tile) throw new Error(`Missing floor texture: ${texture}`);
  return floorFirstgid + tile.id;
};
const floorVariantGids = (texture) => {
  const variants = floorsTileset.tiles
    .filter((entry) => textureOf(entry)?.startsWith(`${texture}-v`))
    .sort((left, right) => left.id - right.id)
    .map((entry) => floorFirstgid + entry.id);
  if (variants.length !== 4) throw new Error(`Expected four variants for ${texture}`);
  return variants;
};
const propGid = (texture) => {
  const tile = propsTileset.tiles.find((entry) => textureOf(entry) === texture);
  if (!tile) throw new Error(`Missing prop texture: ${texture}`);
  return propFirstgid + tile.id;
};

const ground = map.layers.find((layer) => layer.name === "Ground");
const accent = map.layers.find((layer) => layer.name === "Accent");
if (!ground || !accent) throw new Error("Missing Ground or Accent layer");
const terrazzoGids = floorVariantGids("floor-terrazzo");
ground.data = Array.from({ length: map.width * map.height }, (_, index) => {
  const x = index % map.width;
  const y = Math.floor(index / map.width);
  return terrazzoGids[(x * 3 + y * 5 + (x >> 2)) % terrazzoGids.length];
});
accent.data = Array(map.width * map.height).fill(0);
accent.opacity = 0.48;
const zones = [
  { x: 7, y: 3, width: 18, height: 6, texture: "floor-ivory" },
  { x: 13, y: 9, width: 6, height: 11, texture: "floor-ivory" },
  { x: 3, y: 13, width: 7, height: 6, texture: "floor-carpet-blue" },
  { x: 17, y: 13, width: 11, height: 6, texture: "floor-ivory" },
  { x: 28, y: 8, width: 2, height: 6, texture: "floor-ivory" }
];
for (const zone of zones) {
  const gids = floorVariantGids(zone.texture);
  for (let y = zone.y; y < zone.y + zone.height; y += 1) {
    for (let x = zone.x; x < zone.x + zone.width; x += 1) {
      accent.data[y * map.width + x] = gids[(x + y * 3) % gids.length];
    }
  }
}

const props = map.layers.find((layer) => layer.name === "Props");
const collisions = map.layers.find((layer) => layer.name === "Collision");
if (!props || !collisions) throw new Error("Missing Props or Collision layer");
const managedNames = new Set([
  "information-planter",
  "information-waiting-bench",
  "information-planter-collision",
  "information-waiting-bench-collision"
]);
props.objects = props.objects.filter((object) => !managedNames.has(object.name));
collisions.objects = collisions.objects.filter((object) => !managedNames.has(object.name));
let nextId = Math.max(...map.layers.flatMap((layer) => layer.objects?.map((object) => object.id) ?? []), 0) + 1;

const addProp = ({ name, texture, label, lines, x, y, width, height, collision }) => {
  props.objects.push({
    height,
    id: nextId++,
    name,
    opacity: 1,
    rotation: 0,
    type: "",
    visible: true,
    width,
    x,
    y,
    gid: propGid(texture),
    properties: [
      property("texture", texture),
      property("label", label),
      property("interactionTitle", label),
      property("interactionLines", JSON.stringify(lines))
    ]
  });
  collisions.objects.push({
    ...collision,
    id: nextId++,
    name: `${name}-collision`,
    opacity: 1,
    rotation: 0,
    type: "",
    visible: true,
    properties: [property("ownerId", name)]
  });
};

addProp({
  name: "information-planter",
  texture: "airport-planter-animated-north",
  label: "服務中心植栽",
  lines: ["植栽把服務櫃台與主要通道自然地分開。"],
  x: 40,
  y: 176,
  width: 96,
  height: 88,
  collision: { x: 56, y: 144, width: 64, height: 32 }
});
addProp({
  name: "information-waiting-bench",
  texture: "airport-waiting-seats-horizontal",
  label: "等候座椅",
  lines: ["這裡可以稍坐片刻，再確認下一段動線。"],
  x: 280,
  y: 304,
  width: 176,
  height: 72,
  collision: { x: 296, y: 272, width: 144, height: 32 }
});

map.nextobjectid = nextId;
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log("[refine-information-core] floor zones and anchor props updated");
