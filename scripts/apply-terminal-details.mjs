import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "public/assets/maps/tiled");
const tilesetPath = resolve(root, "tilesets/airport-props.tsj");
const regionRoot = resolve(root, "regions");
const tileset = JSON.parse(readFileSync(tilesetPath, "utf8"));
const oldNpcFirstGid = 66;

const staticAssets = [
  {
    texture: "airport-luggage-carts-side",
    image: "../../../props/airport-directional-v2/luggage-carts-side.png"
  },
  "airport-cleaning-trolley",
  "airport-queue-barrier-v2",
  "airport-recycling-station",
  "airport-gate-pedestal",
  "airport-lamp-column"
].map((asset) =>
  typeof asset === "string"
    ? {
        texture: asset,
        image: `../../../props/airport-terminal-details-v1/${asset}/prop.png`
      }
    : asset
);

const animatedAssets = [
  {
    texture: "airport-ad-column",
    folder: "airport-ad-column-v1",
    prefix: "ad-column",
    duration: 800
  },
  {
    texture: "airport-atrium-lamp",
    folder: "airport-atrium-lamp-v1",
    prefix: "atrium-lamp",
    duration: 650
  },
  {
    texture: "airport-moving-walkway",
    folder: "airport-moving-walkway-v1",
    prefix: "moving-walkway",
    duration: 260
  },
  {
    texture: "airport-escalator-animated-south",
    folder: "airport-escalator-animated-south-v1",
    prefix: "escalator-south",
    duration: 300
  }
];

function pngSize(path) {
  const buffer = readFileSync(path);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

tileset.tiles = tileset.tiles.filter((tile) => {
  const texture = tile.properties?.find((property) => property.name === "texture")?.value;
  return !staticAssets.some((asset) => asset.texture === texture) &&
    !animatedAssets.some((asset) => asset.texture === texture) &&
    !animatedAssets.some((asset) => tile.image?.includes(`/${asset.folder}/`));
});

let nextTileId = Math.max(...tileset.tiles.map((tile) => tile.id)) + 1;
const firstTileIdByTexture = new Map();

for (const asset of staticAssets) {
  const absoluteImage = resolve(root, "tilesets", asset.image);
  const size = pngSize(absoluteImage);
  firstTileIdByTexture.set(asset.texture, nextTileId);
  tileset.tiles.push({
    id: nextTileId++,
    image: asset.image,
    imagewidth: size.width,
    imageheight: size.height,
    properties: [{ name: "texture", type: "string", value: asset.texture }]
  });
}

for (const asset of animatedAssets) {
  const firstId = nextTileId;
  firstTileIdByTexture.set(asset.texture, firstId);
  for (let frame = 1; frame <= 4; frame += 1) {
    const image = `../../../props/${asset.folder}/${asset.prefix}-${frame}.png`;
    tileset.tiles.push({
      id: nextTileId,
      image,
      imagewidth: 128,
      imageheight: 128,
      ...(frame === 1
        ? {
            animation: Array.from({ length: 4 }, (_, index) => ({
              duration: asset.duration,
              tileid: firstId + index
            })),
            properties: [
              { name: "texture", type: "string", value: asset.texture }
            ]
          }
        : {})
    });
    nextTileId += 1;
  }
}

tileset.tiles.sort((left, right) => left.id - right.id);
tileset.tilecount = nextTileId;
writeFileSync(tilesetPath, `${JSON.stringify(tileset, null, 2)}\n`);

const gid = (texture) => 9 + firstTileIdByTexture.get(texture);
const property = (name, value, type = "string") => ({ name, type, value });

function object(id, spec) {
  return {
    gid: gid(spec.texture),
    height: spec.height,
    id,
    name: spec.name,
    opacity: 1,
    properties: [
      property("texture", spec.texture),
      property("label", spec.label),
      property("interactionTitle", spec.label),
      property("interactionLines", JSON.stringify(spec.lines)),
      ...(spec.displayHeight
        ? [property("displayHeight", spec.displayHeight, "float")]
        : []),
      ...(spec.wallAttachment
        ? [property("wallAttachment", spec.wallAttachment)]
        : []),
      ...(spec.decorative ? [property("decorative", true, "bool")] : [])
    ],
    rotation: 0,
    type: "",
    visible: true,
    width: spec.width,
    x: spec.x,
    y: spec.y
  };
}

function collision(id, ownerId, x, y, width, height) {
  return {
    height,
    id,
    name: `${ownerId}-collision`,
    opacity: 1,
    properties: [property("ownerId", ownerId)],
    rotation: 0,
    type: "",
    visible: true,
    width,
    x,
    y
  };
}

const placements = {
  "departure-hall.tmj": [
    {
      name: "departure-ad-column-left",
      texture: "airport-ad-column",
      label: "航廈數位廣告",
      lines: ["螢幕播放著抽象的旅遊影像。"],
      x: 72,
      y: 224,
      width: 64,
      height: 112,
      displayHeight: 112,
      collision: [92, 208, 24, 16]
    },
    {
      name: "departure-ad-column-right",
      texture: "airport-ad-column",
      label: "航廈數位廣告",
      lines: ["流動的光影讓大廳更有現代感。"],
      x: 632,
      y: 224,
      width: 64,
      height: 112,
      displayHeight: 112,
      collision: [652, 208, 24, 16]
    },
    {
      name: "departure-atrium-lamp-left",
      texture: "airport-atrium-lamp",
      label: "航廈燈柱",
      lines: ["環形燈光緩緩流動。"],
      x: 216,
      y: 144,
      width: 64,
      height: 96,
      displayHeight: 96,
      collision: [240, 128, 16, 16]
    },
    {
      name: "departure-atrium-lamp-right",
      texture: "airport-atrium-lamp",
      label: "航廈燈柱",
      lines: ["冷白色燈光映著玻璃屋頂。"],
      x: 488,
      y: 144,
      width: 64,
      height: 96,
      displayHeight: 96,
      collision: [512, 128, 16, 16]
    },
    {
      name: "departure-waiting-bench",
      texture: "airport-waiting-seats-horizontal",
      label: "候機座椅",
      lines: ["可以在這裡稍作休息。"],
      x: 80,
      y: 384,
      width: 176,
      height: 72,
      collision: [92, 360, 152, 16]
    },
    {
      name: "departure-luggage-carts",
      texture: "airport-luggage-carts-side",
      label: "行李推車",
      lines: ["推車整齊地疊放在一起。"],
      x: 592,
      y: 400,
      width: 80,
      height: 80,
      collision: [612, 384, 40, 16]
    }
  ],
  "airport-facilities.tmj": [
    {
      name: "facilities-moving-walkway",
      texture: "airport-moving-walkway",
      label: "電動步道",
      lines: ["步道持續向前運轉。"],
      x: 304,
      y: 288,
      width: 144,
      height: 48,
      displayHeight: 48,
      collision: [336, 272, 80, 16]
    },
    {
      name: "facilities-recycling-station",
      texture: "airport-recycling-station",
      label: "分類回收站",
      lines: ["不同顏色代表不同回收分類。"],
      x: 192,
      y: 320,
      width: 80,
      height: 64,
      collision: [200, 304, 64, 16]
    },
    {
      name: "facilities-charging-pedestal",
      texture: "airport-charging-station-front",
      label: "充電站",
      lines: ["旅客可以在這裡替裝置充電。"],
      x: 240,
      y: 296,
      width: 48,
      height: 80,
      collision: [256, 280, 16, 16]
    },
    {
      name: "facilities-cleaning-trolley",
      wallAttachment: "north",
      texture: "airport-cleaning-trolley",
      label: "清潔推車",
      lines: ["清潔用品收納得很整齊。"],
      x: 376,
      y: 96,
      width: 64,
      height: 72,
      collision: [392, 80, 32, 16]
    },
    {
      name: "facilities-emergency-cabinet",
      wallAttachment: "north",
      texture: "airport-emergency-cabinet-front",
      label: "緊急設備",
      lines: ["僅供緊急狀況使用。"],
      x: 304,
      y: 96,
      width: 48,
      height: 72,
      collision: [320, 80, 16, 16]
    }
  ]
};

for (const filename of Object.keys(placements)) {
  const mapPath = resolve(regionRoot, filename);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const npcReference = map.tilesets.find((reference) =>
    reference.source.endsWith("airport-npcs.tsj")
  );
  const propReference = map.tilesets.find((reference) =>
    reference.source.endsWith("airport-props.tsj")
  );
  if (npcReference) {
    const previousFirstGid = npcReference.firstgid;
    const newNpcFirstGid = propReference.firstgid + tileset.tilecount;
    npcReference.firstgid = newNpcFirstGid;
    for (const layer of map.layers) {
      for (const entry of layer.objects ?? []) {
        const texture = entry.properties?.find(
          (item) => item.name === "texture"
        )?.value;
        if (
          entry.gid &&
          (texture?.startsWith("clerk-") || texture?.startsWith("traveler-"))
        ) {
          entry.gid = newNpcFirstGid + (entry.gid - previousFirstGid);
        }
      }
    }
  }

  const props = map.layers.find((layer) => layer.name === "Props");
  const collisions = map.layers.find((layer) => layer.name === "Collision");
  const names = new Set(placements[filename].map((entry) => entry.name));
  props.objects = props.objects.filter((entry) => !names.has(entry.name));
  for (const entry of props.objects) {
    if (entry.name !== "facilities-escalator") continue;
    entry.gid = gid("airport-escalator-animated-south");
    entry.x = 368;
    entry.y = 96;
    entry.width = 112;
    entry.height = 128;
    entry.properties = entry.properties ?? [];
    entry.properties = entry.properties.filter(
      (item) =>
        item.name !== "texture" &&
        item.name !== "displayHeight" &&
        item.name !== "wallAttachment"
    );
    entry.properties.unshift(
      property("texture", "airport-escalator-animated-south"),
      property("displayHeight", 128, "float"),
      property("wallAttachment", "north")
    );
  }
  for (const entry of collisions.objects) {
    const ownerId = entry.properties?.find((item) => item.name === "ownerId")?.value;
    if (ownerId !== "facilities-escalator") continue;
    entry.x = 384;
    entry.y = 80;
    entry.width = 80;
    entry.height = 32;
  }
  collisions.objects = collisions.objects.filter(
    (entry) => !names.has(entry.properties?.find((item) => item.name === "ownerId")?.value)
  );

  let nextObjectId = Math.max(
    map.nextobjectid ?? 1,
    ...map.layers.flatMap((layer) => (layer.objects ?? []).map((entry) => entry.id + 1))
  );
  for (const placement of placements[filename]) {
    props.objects.push(object(nextObjectId++, placement));
    if (placement.collision) {
      collisions.objects.push(
        collision(nextObjectId++, placement.name, ...placement.collision)
      );
    }
  }
  map.nextobjectid = nextObjectId;
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
}

for (const filename of [
  "duty-free-entrance.tmj",
  "security-check.tmj",
  "information-core.tmj",
  "duty-free-central.tmj",
  "shop-beauty-01.tmj",
  "shop-liquor-food-01.tmj",
  "shop-gift-01.tmj"
]) {
  const mapPath = resolve(regionRoot, filename);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const npcReference = map.tilesets.find((reference) =>
    reference.source.endsWith("airport-npcs.tsj")
  );
  const propReference = map.tilesets.find((reference) =>
    reference.source.endsWith("airport-props.tsj")
  );
  if (!npcReference || !propReference) continue;
  const newNpcFirstGid = propReference.firstgid + tileset.tilecount;
  if (npcReference.firstgid === newNpcFirstGid) continue;
  const previousFirstGid = npcReference.firstgid;
  npcReference.firstgid = newNpcFirstGid;
  for (const layer of map.layers) {
    for (const entry of layer.objects ?? []) {
      const texture = entry.properties?.find(
        (item) => item.name === "texture"
      )?.value;
      if (
        entry.gid &&
        (texture?.startsWith("clerk-") || texture?.startsWith("traveler-"))
      ) {
        entry.gid = newNpcFirstGid + (entry.gid - previousFirstGid);
      }
    }
  }
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
}

console.log(
  `[terminal-details] added ${staticAssets.length} props and ${animatedAssets.length} animations with per-map tileset ranges`
);
