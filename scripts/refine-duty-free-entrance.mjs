import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(root, "public/assets/maps/tiled/regions/duty-free-entrance.tmj");
const tilesetPath = path.join(root, "public/assets/maps/tiled/tilesets/airport-props.tsj");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const tileset = JSON.parse(fs.readFileSync(tilesetPath, "utf8"));
const props = map.layers.find((layer) => layer.name === "Props");
const collisions = map.layers.find((layer) => layer.name === "Collision");
const propFirstgid = map.tilesets.find((entry) => entry.source.endsWith("airport-props.tsj"))?.firstgid;
if (!props || !collisions || propFirstgid === undefined) throw new Error("Missing entrance layers or prop tileset");

const property = (name, value, type = "string") => ({ name, type, value });
const textureGid = (texture) => {
  const tile = tileset.tiles.find((entry) =>
    entry.properties?.some((candidate) => candidate.name === "texture" && candidate.value === texture)
  );
  if (!tile) throw new Error(`Missing texture ${texture}`);
  return propFirstgid + tile.id;
};
const managed = new Set([
  "departure-floor-guide",
  "departure-floor-guide-collision",
  "entrance-overhead-wayfinding",
  "entrance-queue-left",
  "entrance-queue-right",
  "entrance-queue-left-collision",
  "entrance-queue-right-collision"
]);
props.objects = props.objects.filter((object) => !managed.has(object.name));
collisions.objects = collisions.objects.filter((object) => !managed.has(object.name));
let nextId = Math.max(...map.layers.flatMap((layer) => layer.objects?.map((object) => object.id) ?? []), 0) + 1;

const serviceCounter = props.objects.find((object) => object.name === "entrance-service-counter");
const serviceCollision = collisions.objects.find(
  (object) => object.name === "entrance-service-counter-collision"
);
if (!serviceCounter || !serviceCollision) throw new Error("Missing entrance service counter");
serviceCounter.gid = textureGid("airport-information-counter-v2");
serviceCounter.x = 240;
serviceCounter.y = 320;
serviceCounter.width = 160;
serviceCounter.height = 58;
for (const entry of serviceCounter.properties ?? []) {
  if (entry.name === "texture") entry.value = "airport-information-counter-v2";
}
serviceCollision.x = 240;
serviceCollision.y = 288;
serviceCollision.width = 160;
serviceCollision.height = 32;

props.objects.push({
  gid: textureGid("airport-overhead-wayfinding"),
  height: 64,
  id: nextId++,
  name: "entrance-overhead-wayfinding",
  opacity: 1,
  rotation: 0,
  type: "",
  visible: true,
  width: 192,
  x: 224,
  y: 112,
  properties: [
    property("texture", "airport-overhead-wayfinding"),
    property("decorative", true, "bool"),
    property("foreground", true, "bool"),
    property("grounding", "suspended")
  ]
});

for (const [side, x, collisionX] of [["left", 176, 184], ["right", 388, 396]]) {
  const name = `entrance-queue-${side}`;
  props.objects.push({
    gid: textureGid("airport-queue-barriers"),
    height: 40,
    id: nextId++,
    name,
    opacity: 1,
    rotation: 0,
    type: "",
    visible: true,
    width: 76,
    x,
    y: 336,
    properties: [
      property("texture", "airport-queue-barriers"),
      property("label", "入口排隊動線"),
      property("interactionTitle", "入口排隊動線"),
      property("interactionLines", JSON.stringify(["請沿著中央通道依序前進。"]))
    ]
  });
  collisions.objects.push({
    height: 16,
    id: nextId++,
    name: `${name}-collision`,
    opacity: 1,
    rotation: 0,
    type: "",
    visible: true,
    width: 60,
    x: collisionX,
    y: 320,
    properties: [property("ownerId", name)]
  });
}

map.nextobjectid = nextId;
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log("[refine-duty-free-entrance] canonical counter, overhead sign and queue group updated");
