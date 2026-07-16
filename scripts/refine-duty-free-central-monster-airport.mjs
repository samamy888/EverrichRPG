import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(root, "public/assets/maps/tiled/regions/duty-free-central.tmj");
const tilesetPath = path.join(root, "public/assets/maps/tiled/tilesets/airport-props.tsj");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const tileset = JSON.parse(fs.readFileSync(tilesetPath, "utf8"));

const props = map.layers.find((layer) => layer.name === "Props");
const collisions = map.layers.find((layer) => layer.name === "Collision");
const propFirstgid = map.tilesets.find((entry) => entry.source.endsWith("airport-props.tsj"))?.firstgid;
const floorFirstgid = map.tilesets.find((entry) => entry.source.endsWith("airport-floors.tsj"))?.firstgid;
if (!props || !collisions || propFirstgid === undefined || floorFirstgid === undefined) {
  throw new Error("duty-free-central is missing Props, Collision, or airport-props.tsj");
}

const property = (name, value, type = "string") => ({ name, type, value });
const tileFor = (texture) => {
  const tile = tileset.tiles.find((entry) =>
    entry.properties?.some((candidate) => candidate.name === "texture" && candidate.value === texture)
  );
  if (!tile) throw new Error(`Missing texture ${texture}`);
  return tile;
};

let nextId = Math.max(...map.layers.flatMap((layer) => layer.objects?.map((object) => object.id) ?? []), 0) + 1;

const prop = ({ name, texture, x, y, width, height, label, decorative = false, foreground = false }) => {
  const tile = tileFor(texture);
  return {
    gid: propFirstgid + tile.id,
    height: height ?? tile.imageheight,
    id: nextId++,
    name,
    opacity: 1,
    properties: [
      property("texture", texture),
      property("label", label),
      property("artFamily", "monster-airport-v1"),
      ...(decorative ? [property("decorative", true, "bool")] : []),
      ...(foreground ? [property("foreground", true, "bool")] : [])
    ],
    rotation: 0,
    type: "",
    visible: true,
    width: width ?? tile.imagewidth,
    x,
    y
  };
};

const collision = (ownerId, x, y, width, height) => ({
  height,
  id: nextId++,
  name: `${ownerId}-collision`,
  opacity: 1,
  properties: [property("ownerId", ownerId)],
  rotation: 0,
  type: "",
  visible: true,
  width,
  x,
  y
});

const shelfSpecs = [
  ["perfume-shelf", "香氛", 64, 176],
  ["liquor-shelf", "酒類", 564, 176],
  ["cosmetics-shelf", "美妝", 144, 304],
  ["snacks-shelf", "伴手禮", 484, 304],
  ["fashion-shelf", "時尚", 64, 432],
  ["travel-shelf", "旅行用品", 564, 432]
];

const newProps = [
  prop({
    name: "cashier-counter",
    texture: "dutyfree-service-counter-south",
    x: 330,
    y: 160,
    width: 108,
    height: 60,
    label: "中央結帳櫃台"
  }),
  ...shelfSpecs.map(([name, label, x, y]) =>
    prop({
      name,
      texture: "dutyfree-display-shelf-south",
      x,
      y,
      width: 140,
      height: 73,
      label
    })
  ),
  prop({
    name: "left-information-pillar",
    texture: "airport-sign-pillar-south",
    x: 288,
    y: 288,
    width: 28,
    height: 77,
    label: "免稅店導覽"
  }),
  prop({
    name: "right-information-pillar",
    texture: "airport-sign-pillar-south",
    x: 452,
    y: 288,
    width: 28,
    height: 77,
    label: "登機門方向"
  }),
  prop({
    name: "left-planter",
    texture: "planter",
    x: 260,
    y: 416,
    width: 42,
    height: 66,
    label: "室內植栽"
  }),
  prop({
    name: "right-planter",
    texture: "planter",
    x: 466,
    y: 416,
    width: 42,
    height: 66,
    label: "室內植栽"
  }),
];

const newCollisions = [
  collision("cashier-counter", 320, 144, 128, 16),
  ...shelfSpecs.map(([name, , x, y]) => collision(name, x + 6, y - 24, 128, 24)),
  collision("left-information-pillar", 294, 272, 16, 16),
  collision("right-information-pillar", 458, 272, 16, 16),
  collision("left-planter", 272, 400, 16, 16),
  collision("right-planter", 478, 400, 16, 16)
];

props.objects = newProps;
collisions.objects = newCollisions;

const walls = map.layers.find((layer) => layer.name === "Walls");
if (!walls) throw new Error("duty-free-central is missing Walls");
const wall = (name, texture, x, y, width, height) => ({
  height,
  id: nextId++,
  name,
  opacity: 1,
  properties: [property("texture", texture)],
  rotation: 0,
  type: "",
  visible: true,
  width,
  x,
  y
});
walls.objects = [
  wall("wall-top-left", "monster-airport-wall-down", 0, 0, 336, 16),
  wall("wall-top-right", "monster-airport-wall-down", 432, 0, 336, 16),
  wall("wall-bottom-left", "monster-airport-wall-up", 0, 464, 336, 16),
  wall("wall-bottom-right", "monster-airport-wall-up", 432, 464, 336, 16),
  wall("wall-left-upper", "monster-airport-wall-right", 0, 0, 16, 192),
  wall("wall-left-lower", "monster-airport-wall-right", 0, 288, 16, 192),
  wall("wall-right-upper", "monster-airport-wall-left", 752, 0, 16, 192),
  wall("wall-right-lower", "monster-airport-wall-left", 752, 288, 16, 192)
];

const ground = map.layers.find((layer) => layer.name === "Ground");
const accent = map.layers.find((layer) => layer.name === "Accent");
if (!ground || !accent) throw new Error("duty-free-central is missing Ground or Accent");
const floorBlueGid = floorFirstgid + 1;
const floorCreamGid = floorFirstgid;
ground.data = Array(map.width * map.height).fill(floorBlueGid);
accent.data = Array.from({ length: map.width * map.height }, (_, index) => {
  const x = index % map.width;
  const y = Math.floor(index / map.width);
  const centralGuide = x >= 21 && x <= 26;
  const sideExitGuide = y >= 12 && y <= 17 && (x <= 5 || x >= 42);
  return centralGuide || sideExitGuide ? floorCreamGid : 0;
});
accent.opacity = 0.42;

const portalByName = new Map(
  map.layers.find((layer) => layer.name === "Portals").objects.map((object) => [object.name, object])
);
Object.assign(portalByName.get("to-liquor-food"), { x: 0, y: 208, width: 64, height: 80 });
Object.assign(portalByName.get("to-gift"), { x: 704, y: 208, width: 64, height: 80 });

const spawnByName = new Map(
  map.layers.find((layer) => layer.name === "Spawns").objects.map((object) => [object.name, object])
);
Object.assign(spawnByName.get("from-liquor-food"), { x: 96, y: 240 });
Object.assign(spawnByName.get("from-gift"), { x: 672, y: 240 });

const setMapProperty = (name, value) => {
  const existing = map.properties?.find((entry) => entry.name === name);
  if (existing) existing.value = value;
  else (map.properties ??= []).push(property(name, value));
};
setMapProperty("artDirection", "monster-airport-v1");
setMapProperty("layoutIntent", "front-facing retail zones with a clear north-south main aisle");
setMapProperty("exitStyle", "open boundary corridor with floor threshold; no door prop");

map.nextobjectid = nextId;
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
console.log("[monster-airport] duty-free-central recomposed with front-facing modular retail zones");
