import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const tiledRoot = resolve("public/assets/maps/tiled");
const propsPath = resolve(tiledRoot, "tilesets/airport-props.tsj");
const npcsPath = resolve(tiledRoot, "tilesets/airport-npcs.tsj");
const hallPath = resolve(tiledRoot, "regions/departure-hall.tmj");

const props = JSON.parse(await readFile(propsPath, "utf8"));
props.tiles = props.tiles.filter((tile) => ![80, 81, 82, 83].includes(tile.id));
props.tiles = props.tiles.filter((tile) => ![84, 85, 86, 87].includes(tile.id));
props.tiles = props.tiles.filter((tile) => tile.id < 88 || tile.id > 115);
for (let frame = 1; frame <= 4; frame += 1) {
  props.tiles.push({
    id: 79 + frame,
    image: `../../../props/airport-long-kiosk-v1/long-kiosk-${frame}.png`,
    imagewidth: 128,
    imageheight: 128,
    ...(frame === 1
      ? {
          animation: [80, 81, 82, 83].map((tileid) => ({ duration: 900, tileid })),
          properties: [{ name: "texture", type: "string", value: "airport-long-kiosk" }]
        }
      : {})
  });
}
props.tiles.sort((left, right) => left.id - right.id);
props.tilecount = Math.max(props.tilecount ?? 0, 84);
for (let frame = 1; frame <= 4; frame += 1) {
  props.tiles.push({
    id: 83 + frame,
    image: `../../../props/airport-self-order-kiosk-v1/self-order-kiosk-${frame}.png`,
    imagewidth: 128,
    imageheight: 128,
    ...(frame === 1
      ? {
          animation: [84, 85, 86, 87].map((tileid) => ({ duration: 900, tileid })),
          properties: [
            { name: "texture", type: "string", value: "airport-self-order-kiosk" }
          ]
        }
      : {})
  });
}
props.tiles.sort((left, right) => left.id - right.id);
props.tilecount = Math.max(props.tilecount ?? 0, 88);
const animatedPropBundles = [
  {
    startId: 88,
    folder: "airport-restroom-animated-v1",
    prefix: "restroom-frame",
    texture: "airport-restroom-animated",
    width: 256,
    height: 128,
    duration: 700
  },
  {
    startId: 92,
    folder: "airport-water-dispenser-animated-v1",
    prefix: "water-dispenser",
    texture: "airport-water-dispenser-animated",
    width: 128,
    height: 128,
    duration: 420
  },
  {
    startId: 96,
    folder: "airport-planter-animated-v2/north",
    prefix: "planter-north",
    texture: "airport-planter-animated-north",
    width: 128,
    height: 128,
    duration: 650
  },
  {
    startId: 100,
    folder: "airport-vending-machine-v1",
    prefix: "vending-machine",
    texture: "airport-vending-machine",
    width: 128,
    height: 128,
    duration: 650
  },
  {
    startId: 104,
    folder: "airport-planter-animated-v2/south",
    prefix: "planter-south",
    texture: "airport-planter-animated-south",
    width: 128,
    height: 128,
    duration: 650
  },
  {
    startId: 108,
    folder: "airport-planter-animated-v2/west",
    prefix: "planter-west",
    texture: "airport-planter-animated-west",
    width: 128,
    height: 128,
    duration: 650
  },
  {
    startId: 112,
    folder: "airport-planter-animated-v2/east",
    prefix: "planter-east",
    texture: "airport-planter-animated-east",
    width: 128,
    height: 128,
    duration: 650
  }
];
for (const bundle of animatedPropBundles) {
  for (let index = 0; index < 4; index += 1) {
    props.tiles.push({
      id: bundle.startId + index,
      image: `../../../props/${bundle.folder}/${bundle.prefix}-${index + 1}.png`,
      imagewidth: bundle.width,
      imageheight: bundle.height,
      ...(index === 0
        ? {
            animation: Array.from({ length: 4 }, (_, frame) => ({
              duration: bundle.duration,
              tileid: bundle.startId + frame
            })),
            properties: [{ name: "texture", type: "string", value: bundle.texture }]
          }
        : {})
    });
  }
}
props.tiles.sort((left, right) => left.id - right.id);
props.tilecount = Math.max(props.tilecount ?? 0, 116);

const npcs = JSON.parse(await readFile(npcsPath, "utf8"));
const clerkAnimations = new Map([
  ["clerk-beauty-01", { frames: [1, 2, 3, 4], tileIds: [0, 9, 10, 11] }],
  ["clerk-liquor-food-01", { frames: [5, 6, 7, 8], tileIds: [1, 12, 13, 14] }],
  ["clerk-gift-01", { frames: [9, 10, 11, 12], tileIds: [2, 15, 16, 17] }]
]);
npcs.tiles = npcs.tiles.filter((tile) => tile.id < 9);
for (const tile of npcs.tiles) {
  const texture = tile.properties?.find((property) => property.name === "texture")?.value;
  const animation = clerkAnimations.get(texture);
  if (!animation) continue;
  tile.image =
    `../../../sprites/duty-free-clerks-animated-v2/clerk-work-${animation.frames[0]}.png`;
  tile.imagewidth = 128;
  tile.imageheight = 128;
  tile.animation = animation.tileIds.map((tileid) => ({ duration: 286, tileid }));
  for (let index = 1; index < animation.frames.length; index += 1) {
    npcs.tiles.push({
      id: animation.tileIds[index],
      image:
        `../../../sprites/duty-free-clerks-animated-v2/clerk-work-${animation.frames[index]}.png`,
      imagewidth: 128,
      imageheight: 128
    });
  }
}
npcs.tiles.sort((left, right) => left.id - right.id);
npcs.tilecount = 18;

const hall = JSON.parse(await readFile(hallPath, "utf8"));
const hallMap = hall.layers
  .find((layer) => layer.name === "Props")
  ?.objects.find((object) => object.name === "departure-hall-map");
if (!hallMap) throw new Error("departure-hall-map was not found");
const setProperty = (name, value, type = "string") => {
  hallMap.properties = (hallMap.properties ?? []).filter((property) => property.name !== name);
  hallMap.properties.push({ name, type, value });
};
hallMap.gid = 9 + 80;
hallMap.x = 296;
hallMap.width = 176;
hallMap.height = 76;
setProperty("texture", "airport-long-kiosk");
setProperty("displayHeight", 76, "float");
setProperty("visualEffect", "kioskPulse");
setProperty("effectColor", "#56e7ff");
setProperty("effectDurationMs", 1500, "int");

const collision = hall.layers
  .find((layer) => layer.name === "Collision")
  ?.objects.find((object) => object.name === "departure-hall-map-collision");
if (collision) {
  collision.x = 328;
  collision.y = 244;
  collision.width = 112;
  collision.height = 16;
}

const facilitiesPath = resolve(tiledRoot, "regions/airport-facilities.tmj");
const facilities = JSON.parse(await readFile(facilitiesPath, "utf8"));
const propsLayer = facilities.layers.find((layer) => layer.name === "Props");
const collisionLayer = facilities.layers.find((layer) => layer.name === "Collision");
if (!propsLayer || !collisionLayer) throw new Error("airport-facilities layers were not found");
const setObjectProperty = (object, name, value, type = "string") => {
  object.properties = (object.properties ?? []).filter((property) => property.name !== name);
  object.properties.push({ name, type, value });
};
const animatedFacilities = new Map([
  [
    "facilities-restroom",
    { texture: "airport-restroom-animated", gid: 9 + 88, width: 176, height: 88 }
  ],
  [
    "facilities-water",
    { texture: "airport-water-dispenser-animated", gid: 9 + 92, width: 48, height: 88 }
  ],
  [
    "facilities-planter",
    { texture: "airport-planter-animated-north", gid: 9 + 96, width: 96, height: 88 }
  ]
]);
for (const object of propsLayer.objects) {
  const animated = animatedFacilities.get(object.name);
  if (!animated) continue;
  const centerX = object.x + object.width / 2;
  object.gid = animated.gid;
  object.width = animated.width;
  object.height = animated.height;
  object.x = centerX - animated.width / 2;
  setObjectProperty(object, "texture", animated.texture);
  setObjectProperty(object, "displayHeight", animated.height, "float");
}
propsLayer.objects = propsLayer.objects.filter(
  (object) =>
    object.name !== "facilities-self-order-kiosk" &&
    object.name !== "facilities-vending-machine"
);
collisionLayer.objects = collisionLayer.objects.filter(
  (object) =>
    object.name !== "facilities-self-order-kiosk-collision" &&
    object.name !== "facilities-vending-machine-collision"
);
const nextObjectId = Math.max(
  ...facilities.layers.flatMap((layer) => (layer.objects ?? []).map((object) => object.id)),
  0
) + 1;
propsLayer.objects.push({
  gid: 9 + 84,
  height: 112,
  id: nextObjectId,
  name: "facilities-self-order-kiosk",
  opacity: 1,
  properties: [
    { name: "texture", type: "string", value: "airport-self-order-kiosk" },
    { name: "displayHeight", type: "float", value: 112 },
    { name: "label", type: "string", value: "自助點餐機" },
    { name: "interactionTitle", type: "string", value: "自助點餐機" },
    {
      name: "interactionLines",
      type: "string",
      value: JSON.stringify(["螢幕正在輪播餐點與付款方式。"])
    },
    {
      name: "interactionChoices",
      type: "string",
      value: JSON.stringify([
        {
          label: "查看餐點",
          responseLines: ["目前提供麵食、飯食、點心與飲品分類。"]
        },
        {
          label: "開始點餐",
          responseLines: ["完整點餐與付款功能將在餐飲系統階段開放。"]
        },
        { label: "離開", responseLines: ["你離開了點餐畫面。"] }
      ])
    },
    { name: "visualEffect", type: "string", value: "kioskPulse" },
    { name: "effectColor", type: "string", value: "#ffd36b" },
    { name: "effectDurationMs", type: "int", value: 1500 }
  ],
  rotation: 0,
  type: "",
  visible: true,
  width: 56,
  x: 64,
  y: 296
});
collisionLayer.objects.push({
  height: 16,
  id: nextObjectId + 1,
  name: "facilities-self-order-kiosk-collision",
  opacity: 1,
  properties: [
    { name: "ownerId", type: "string", value: "facilities-self-order-kiosk" }
  ],
  rotation: 0,
  type: "",
  visible: true,
  width: 24,
  x: 80,
  y: 280
});
propsLayer.objects.push({
  gid: 9 + 100,
  height: 96,
  id: nextObjectId + 2,
  name: "facilities-vending-machine",
  opacity: 1,
  properties: [
    { name: "texture", type: "string", value: "airport-vending-machine" },
    { name: "displayHeight", type: "float", value: 96 },
    { name: "label", type: "string", value: "自動販賣機" },
    { name: "interactionTitle", type: "string", value: "自動販賣機" },
    {
      name: "interactionLines",
      type: "string",
      value: JSON.stringify(["飲料與點心整齊排列，螢幕正播放著商品推薦。"])
    },
    {
      name: "interactionChoices",
      type: "string",
      value: JSON.stringify([
        {
          label: "看看飲料",
          responseLines: ["冰涼的飲料在燈箱下閃閃發亮。"]
        },
        {
          label: "看看點心",
          responseLines: ["有幾款適合帶上旅途的小包裝點心。"]
        },
        { label: "離開", responseLines: ["你離開了販賣機。"] }
      ])
    },
    { name: "visualEffect", type: "string", value: "kioskPulse" },
    { name: "effectColor", type: "string", value: "#56e7ff" },
    { name: "effectDurationMs", type: "int", value: 1600 }
  ],
  rotation: 0,
  type: "",
  visible: true,
  width: 64,
  x: 120,
  y: 296
});
collisionLayer.objects.push({
  height: 16,
  id: nextObjectId + 3,
  name: "facilities-vending-machine-collision",
  opacity: 1,
  properties: [
    { name: "ownerId", type: "string", value: "facilities-vending-machine" }
  ],
  rotation: 0,
  type: "",
  visible: true,
  width: 24,
  x: 140,
  y: 280
});
facilities.nextobjectid = Math.max(facilities.nextobjectid ?? 0, nextObjectId + 4);

const planterAnimations = new Map([
  ["airport-planter-south", { texture: "airport-planter-animated-south", gid: 9 + 104 }],
  ["airport-planter-west", { texture: "airport-planter-animated-west", gid: 9 + 108 }],
  ["airport-planter-east", { texture: "airport-planter-animated-east", gid: 9 + 112 }],
  ["airport-planter-north", { texture: "airport-planter-animated-north", gid: 9 + 96 }],
  ["airport-planter-animated", { texture: "airport-planter-animated-north", gid: 9 + 96 }]
]);
const updatePlanters = (map) => {
  for (const layer of map.layers) {
    for (const object of layer.objects ?? []) {
      const textureProperty = object.properties?.find(
        (property) => property.name === "texture"
      );
      const animation = planterAnimations.get(textureProperty?.value);
      if (!animation) continue;
      object.gid = animation.gid;
      setObjectProperty(object, "texture", animation.texture);
      setObjectProperty(object, "displayHeight", object.height, "float");
    }
  }
};
updatePlanters(hall);
updatePlanters(facilities);

for (const relativePath of [
  "regions/duty-free-central.tmj",
  "regions/duty-free-entrance.tmj"
]) {
  const path = resolve(tiledRoot, relativePath);
  const map = JSON.parse(await readFile(path, "utf8"));
  updatePlanters(map);
  await writeFile(path, `${JSON.stringify(map, null, 1)}\n`);
}

await writeFile(propsPath, `${JSON.stringify(props, null, 2)}\n`);
await writeFile(npcsPath, `${JSON.stringify(npcs, null, 2)}\n`);
await writeFile(hallPath, `${JSON.stringify(hall, null, 1)}\n`);
await writeFile(facilitiesPath, `${JSON.stringify(facilities, null, 1)}\n`);
console.log("[animated-assets] updated Tiled animations, kiosks, facilities, and vending machine");
