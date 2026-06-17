import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const tiledRoot = resolve(process.cwd(), "public/assets/maps/tiled");
const regionRoot = resolve(tiledRoot, "regions");
const propTileset = JSON.parse(
  readFileSync(resolve(tiledRoot, "tilesets/airport-props.tsj"), "utf8")
);
const npcTileset = JSON.parse(
  readFileSync(resolve(tiledRoot, "tilesets/airport-npcs.tsj"), "utf8")
);

const gidByTexture = new Map();
for (const [tileset, firstgid] of [
  [propTileset, 9],
  [npcTileset, 66]
]) {
  for (const tile of tileset.tiles) {
    const texture = tile.properties?.find((property) => property.name === "texture")?.value;
    if (texture) gidByTexture.set(texture, firstgid + tile.id);
  }
}

const property = (name, value, type = "string") => ({ name, type, value });
const object = (id, name, x, y, width, height, extra = {}) => ({
  height,
  id,
  name,
  opacity: 1,
  rotation: 0,
  type: "",
  visible: true,
  width,
  x,
  y,
  ...extra
});
const layer = (id, name, type, extra = {}) => ({
  id,
  name,
  opacity: 1,
  type,
  visible: true,
  x: 0,
  y: 0,
  ...extra
});

function makeProp(id, spec) {
  return object(id, spec.id, spec.x, spec.y, spec.width, spec.height, {
    gid: gidByTexture.get(spec.texture),
    properties: [
      property("texture", spec.texture),
      property("label", spec.label),
      property("interactionTitle", spec.label),
      property("interactionLines", JSON.stringify(spec.lines)),
      ...(spec.choices
        ? [property("interactionChoices", JSON.stringify(spec.choices))]
        : []),
      ...(spec.foreground ? [property("foreground", true, "bool")] : []),
      ...(spec.decorative ? [property("decorative", true, "bool")] : []),
      ...(spec.depthOffset ? [property("depthOffset", spec.depthOffset, "float")] : []),
      ...(spec.texture.startsWith("airport-digital-map-kiosk-")
        ? [
            property("visualEffect", "kioskPulse"),
            property("effectColor", "#56e7ff"),
            property("effectDurationMs", 1400, "int")
          ]
        : []),
      ...(spec.texture === "airport-long-kiosk"
        ? [
            property("displayHeight", spec.height, "float"),
            property("visualEffect", "kioskPulse"),
            property("effectColor", "#56e7ff"),
            property("effectDurationMs", 1500, "int")
          ]
        : [])
      ,
      ...(spec.texture === "airport-self-order-kiosk"
        ? [
            property("displayHeight", spec.height, "float"),
            property("visualEffect", "kioskPulse"),
            property("effectColor", "#ffd36b"),
            property("effectDurationMs", 1500, "int")
          ]
        : [])
    ]
  });
}

function makeNpc(id, spec) {
  return object(id, spec.id, spec.x, spec.y, 36, 36, {
    gid: gidByTexture.get(spec.texture),
    properties: [
      property("texture", spec.texture),
      property("label", spec.label),
      property("interactionTitle", spec.label),
      property("interactionLines", JSON.stringify(spec.lines)),
      property("movementType", spec.movementType ?? "idle"),
      property("facing", spec.facing ?? "down"),
      property("animationKey", spec.animationKey),
      property("speed", spec.speed ?? 0, "float"),
      property("foreground", true, "bool")
    ]
  });
}

function makeMap(spec) {
  let objectId = 1;
  const ground = Array(spec.width * spec.height).fill(5);
  const accent = Array(spec.width * spec.height).fill(0);

  for (const rect of spec.accents) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) {
        accent[y * spec.width + x] = rect.gid ?? 6;
      }
    }
  }

  const walls = spec.walls.map((entry) =>
    object(objectId++, entry.id, entry.x, entry.y, entry.width, entry.height, {
      properties: [property("texture", "wall-ivory-panel")]
    })
  );
  const props = spec.props.map((entry) => makeProp(objectId++, entry));
  const npcs = spec.npcs.map((entry) => makeNpc(objectId++, entry));
  const collisions = [...spec.props, ...spec.npcs].filter((entry) => entry.collision).map((entry) =>
    object(
      objectId++,
      `${entry.id}-collision`,
      entry.collision.x,
      entry.collision.y,
      entry.collision.width,
      entry.collision.height,
      { properties: [property("ownerId", entry.id)] }
    )
  );
  const portals = spec.portals.map((entry) =>
    object(objectId++, entry.id, entry.x, entry.y, entry.width, entry.height, {
      properties: [
        property("destinationRegionId", entry.destinationRegionId),
        property("destinationSpawnId", entry.destinationSpawnId),
        property("visualEffect", "portalFlow"),
        property("effectColor", "#fff2bc"),
        property("effectDurationMs", 1150, "int")
      ]
    })
  );
  const spawns = spec.spawns.map((entry) =>
    object(objectId++, entry.id, entry.x, entry.y, 0, 0, {
      point: true,
      properties: [property("facing", entry.facing)]
    })
  );

  return {
    compressionlevel: -1,
    height: spec.height,
    infinite: false,
    layers: [
      layer(1, "Ground", "tilelayer", {
        data: ground,
        height: spec.height,
        width: spec.width
      }),
      layer(2, "Accent", "tilelayer", {
        data: accent,
        height: spec.height,
        opacity: 0.65,
        width: spec.width
      }),
      layer(3, "Walls", "objectgroup", { draworder: "topdown", objects: walls }),
      layer(4, "Props", "objectgroup", { draworder: "topdown", objects: props }),
      layer(5, "NPCs", "objectgroup", { draworder: "topdown", objects: npcs }),
      layer(6, "Collision", "objectgroup", {
        draworder: "topdown",
        objects: collisions,
        visible: false
      }),
      layer(7, "Portals", "objectgroup", { draworder: "topdown", objects: portals }),
      layer(8, "Spawns", "objectgroup", { draworder: "topdown", objects: spawns })
    ],
    nextlayerid: 9,
    nextobjectid: objectId,
    orientation: "orthogonal",
    properties: [property("name", spec.name), property("regionId", spec.id)],
    renderorder: "right-down",
    tiledversion: "1.11.2",
    tileheight: 16,
    tilesets: [
      { firstgid: 1, source: "../tilesets/airport-floors.tsj" },
      { firstgid: 9, source: "../tilesets/airport-props.tsj" },
      { firstgid: 66, source: "../tilesets/airport-npcs.tsj" }
    ],
    tilewidth: 16,
    type: "map",
    version: "1.10",
    width: spec.width
  };
}

const p = (
  id,
  texture,
  label,
  lines,
  x,
  y,
  width,
  height,
  collision,
  foreground = false,
  decorative = false,
  depthOffset = 0,
  choices
) => ({
  id,
  texture,
  label,
  lines,
  x,
  y,
  width,
  height,
  collision,
  foreground,
  decorative,
  depthOffset,
  choices
});
const n = (
  id,
  texture,
  label,
  lines,
  animationKey,
  x,
  y,
  collision,
  movementType = "idle",
  facing = "down",
  speed = 0
) => ({
  id,
  texture,
  label,
  lines,
  animationKey,
  x,
  y,
  collision,
  movementType,
  facing,
  speed
});

const maps = [
  {
    id: "duty-free-entrance",
    name: "三樓出境入口",
    width: 40,
    height: 26,
    accents: [{ x: 17, y: 0, width: 6, height: 26 }],
    walls: [
      { id: "wall-top-left", x: 0, y: 0, width: 288, height: 32 },
      { id: "wall-top-right", x: 352, y: 0, width: 288, height: 32 },
      { id: "wall-bottom", x: 0, y: 384, width: 640, height: 32 },
      { id: "wall-left", x: 0, y: 0, width: 32, height: 416 },
      { id: "wall-right", x: 608, y: 0, width: 32, height: 416 }
    ],
    props: [
      p(
        "departure-floor-guide",
        "airport-sign-pillar-east",
        "三樓出境大廳",
        ["前方依序是安全檢查與中央出境大廳。"],
        112,
        256,
        26,
        100,
        { x: 120, y: 240, width: 16, height: 16 }
      ),
      p(
        "entrance-service-counter",
        "dutyfree-service-counter-north",
        "出境服務台",
        ["沿著中央米色動線即可前往安檢。"],
        270.5,
        320,
        99,
        60,
        { x: 272, y: 288, width: 96, height: 32 },
        true
      ),
      p(
        "entrance-planter",
        "airport-planter-west",
        "大廳植栽",
        ["翠綠植栽讓出境入口多了一點放鬆感。"],
        480,
        264,
        64,
        80,
        { x: 488, y: 288, width: 48, height: 32 }
      )
    ],
    npcs: [
      n(
        "departure-traveler",
        "traveler-female-npc",
        "準備出境的旅客",
        ["我正在確認隨身行李，接著就要前往安檢。"],
        "traveler-female",
        160,
        288,
        { x: 168, y: 269, width: 20, height: 20 },
        "idle",
        "right"
      )
    ],
    portals: [
      {
        id: "to-security",
        x: 288,
        y: 16,
        width: 64,
        height: 32,
        destinationRegionId: "security-check",
        destinationSpawnId: "from-entrance"
      }
    ],
    spawns: [
      { id: "start", x: 320, y: 352, facing: "up" },
      { id: "from-security", x: 320, y: 80, facing: "down" }
    ]
  },
  {
    id: "security-check",
    name: "安全檢查區",
    width: 40,
    height: 26,
    accents: [
      { x: 15, y: 0, width: 10, height: 26 },
      { x: 10, y: 8, width: 20, height: 2, gid: 3 }
    ],
    walls: [
      { id: "wall-top-left", x: 0, y: 0, width: 288, height: 32 },
      { id: "wall-top-right", x: 352, y: 0, width: 288, height: 32 },
      { id: "wall-bottom-left", x: 0, y: 384, width: 288, height: 32 },
      { id: "wall-bottom-right", x: 352, y: 384, width: 288, height: 32 },
      { id: "wall-left", x: 0, y: 0, width: 32, height: 416 },
      { id: "wall-right", x: 608, y: 0, width: 32, height: 416 }
    ],
    props: [
      p(
        "security-left-counter",
        "dutyfree-service-counter-east",
        "安檢通道 A",
        ["請先準備登機證與隨身行李。"],
        112,
        208,
        90,
        54,
        { x: 112, y: 176, width: 80, height: 32 }
      ),
      p(
        "security-right-counter",
        "dutyfree-service-counter-west",
        "安檢通道 B",
        ["液體與電子設備請依現場指示放置。"],
        438,
        208,
        90,
        54,
        { x: 448, y: 176, width: 80, height: 32 }
      ),
      p(
        "security-guide-sign",
        "airport-sign-pillar-east",
        "安全檢查",
        ["沿中央通道通過安檢，即可抵達出境大廳。"],
        80,
        112,
        26,
        100,
        { x: 88, y: 96, width: 16, height: 16 }
      ),
      p(
        "security-left-queue",
        "airport-queue-barriers",
        "安檢排隊動線",
        ["請沿著護欄依序前進。"],
        40,
        320,
        152,
        80,
        { x: 48, y: 280, width: 136, height: 24 }
      ),
      p(
        "security-right-queue",
        "airport-queue-barriers",
        "安檢排隊動線",
        ["另一側通道也已開放。"],
        448,
        320,
        152,
        80,
        { x: 456, y: 280, width: 136, height: 24 }
      )
    ],
    npcs: [
      n(
        "security-waiting-traveler",
        "traveler-male-npc",
        "排隊旅客",
        ["隊伍移動得很快，別忘了把證件準備好。"],
        "traveler-male",
        302,
        272,
        { x: 310, y: 253, width: 20, height: 20 },
        "idle",
        "up"
      )
    ],
    portals: [
      {
        id: "to-entrance",
        x: 288,
        y: 368,
        width: 64,
        height: 32,
        destinationRegionId: "duty-free-entrance",
        destinationSpawnId: "from-security"
      },
      {
        id: "to-departure-hall",
        x: 288,
        y: 16,
        width: 64,
        height: 32,
        destinationRegionId: "departure-hall",
        destinationSpawnId: "from-security"
      }
    ],
    spawns: [
      { id: "from-entrance", x: 320, y: 352, facing: "up" },
      { id: "from-departure-hall", x: 320, y: 64, facing: "down" }
    ]
  },
  {
    id: "departure-hall",
    name: "中央出境大廳",
    width: 48,
    height: 30,
    accents: [
      { x: 20, y: 0, width: 8, height: 30 },
      { x: 0, y: 12, width: 48, height: 6 }
    ],
    walls: [
      { id: "wall-top-left", x: 0, y: 0, width: 336, height: 32 },
      { id: "wall-top-right", x: 432, y: 0, width: 336, height: 32 },
      { id: "wall-bottom-left", x: 0, y: 448, width: 336, height: 32 },
      { id: "wall-bottom-right", x: 432, y: 448, width: 336, height: 32 },
      { id: "wall-left-top", x: 0, y: 0, width: 32, height: 192 },
      { id: "wall-left-bottom", x: 0, y: 288, width: 32, height: 192 },
      { id: "wall-right-top", x: 736, y: 0, width: 32, height: 192 },
      { id: "wall-right-bottom", x: 736, y: 288, width: 32, height: 192 }
    ],
    props: [
      p(
        "departure-hall-floor-wayfinding",
        "airport-floor-wayfinding",
        "",
        [],
        296,
        390,
        176,
        41,
        undefined,
        false,
        true,
        -392
      ),
      p(
        "departure-hall-map",
        "airport-long-kiosk",
        "第三航廈導覽",
        ["請選擇想查詢的方向。"],
        296,
        260,
        176,
        76,
        { x: 328, y: 244, width: 112, height: 16 },
        false,
        false,
        0,
        [
          {
            label: "免稅商店街",
            responseLines: ["沿中央走道繼續往北，即可抵達三間免稅店。"]
          },
          {
            label: "服務設施",
            responseLines: ["右側通往洗手間、飲水機、候機座椅與手扶梯。"]
          },
          {
            label: "先不用",
            responseLines: ["祝你旅途愉快。"]
          }
        ]
      ),
      p(
        "departure-hall-left-planter",
        "airport-planter-east",
        "大廳植栽",
        ["寬闊的大廳裡，用植栽區分主要動線。"],
        160,
        336,
        62,
        100,
        { x: 184, y: 320, width: 16, height: 16 }
      ),
      p(
        "departure-hall-right-planter",
        "airport-planter-west",
        "大廳植栽",
        ["這裡能聽見旅客腳步與遠方廣播聲。"],
        546,
        336,
        62,
        100,
        { x: 568, y: 320, width: 16, height: 16 }
      )
    ],
    npcs: [
      n(
        "hall-wandering-traveler",
        "traveler-female-npc",
        "尋找方向的旅客",
        ["我先去服務中心確認方向。"],
        "traveler-female",
        254,
        272,
        { x: 262, y: 253, width: 20, height: 20 },
        "wander",
        "left",
        34
      ),
      n(
        "hall-shopping-traveler",
        "traveler-male-npc",
        "準備購物的旅客",
        ["通過大廳後就是免稅商店街了。"],
        "traveler-male",
        478,
        240,
        { x: 486, y: 221, width: 20, height: 20 },
        "wander",
        "right",
        32
      )
    ],
    portals: [
      {
        id: "to-security",
        x: 336,
        y: 432,
        width: 96,
        height: 32,
        destinationRegionId: "security-check",
        destinationSpawnId: "from-departure-hall"
      },
      {
        id: "to-duty-free",
        x: 336,
        y: 16,
        width: 96,
        height: 32,
        destinationRegionId: "duty-free-central",
        destinationSpawnId: "from-departure-hall"
      },
      {
        id: "to-information",
        x: 16,
        y: 192,
        width: 32,
        height: 96,
        destinationRegionId: "information-core",
        destinationSpawnId: "from-departure-hall"
      },
      {
        id: "to-facilities",
        x: 720,
        y: 192,
        width: 32,
        height: 96,
        destinationRegionId: "airport-facilities",
        destinationSpawnId: "from-departure-hall"
      }
    ],
    spawns: [
      { id: "from-security", x: 384, y: 416, facing: "up" },
      { id: "from-duty-free", x: 384, y: 64, facing: "down" },
      { id: "from-information", x: 64, y: 240, facing: "right" },
      { id: "from-facilities", x: 704, y: 240, facing: "left" }
    ]
  },
  {
    id: "information-core",
    name: "旅客服務中心",
    width: 32,
    height: 22,
    accents: [{ x: 0, y: 8, width: 32, height: 6 }],
    walls: [
      { id: "wall-top", x: 0, y: 0, width: 512, height: 32 },
      { id: "wall-bottom", x: 0, y: 320, width: 512, height: 32 },
      { id: "wall-left", x: 0, y: 0, width: 32, height: 352 },
      { id: "wall-right-top", x: 480, y: 0, width: 32, height: 128 },
      { id: "wall-right-bottom", x: 480, y: 224, width: 32, height: 128 }
    ],
    props: [
      p(
        "information-counter",
        "dutyfree-service-counter-south",
        "旅客服務中心",
        ["可以查詢設施與免稅商店的位置。", "目前尚未開放航班功能。"],
        160,
        128,
        176,
        64,
        { x: 176, y: 96, width: 160, height: 32 },
        true
      ),
      p(
        "information-map-kiosk",
        "airport-digital-map-kiosk-east",
        "航廈地圖",
        ["中央大廳位於東側，北側通往免稅商店街。"],
        64,
        256,
        96,
        72,
        { x: 96, y: 240, width: 32, height: 16 }
      )
    ],
    npcs: [
      n(
        "information-visitor",
        "traveler-male-npc",
        "查看地圖的旅客",
        ["原來免稅店就在中央大廳北邊。"],
        "traveler-male",
        368,
        256,
        { x: 376, y: 237, width: 20, height: 20 },
        "idle",
        "left"
      )
    ],
    portals: [
      {
        id: "to-departure-hall",
        x: 464,
        y: 128,
        width: 32,
        height: 96,
        destinationRegionId: "departure-hall",
        destinationSpawnId: "from-information"
      }
    ],
    spawns: [{ id: "from-departure-hall", x: 448, y: 176, facing: "left" }]
  },
  {
    id: "airport-facilities",
    name: "機場設施區",
    width: 32,
    height: 22,
    accents: [{ x: 0, y: 8, width: 32, height: 6 }],
    walls: [
      { id: "wall-top", x: 0, y: 0, width: 512, height: 32 },
      { id: "wall-bottom", x: 0, y: 320, width: 512, height: 32 },
      { id: "wall-right", x: 480, y: 0, width: 32, height: 352 },
      { id: "wall-left-top", x: 0, y: 0, width: 32, height: 128 },
      { id: "wall-left-bottom", x: 0, y: 224, width: 32, height: 128 }
    ],
    props: [
      p(
        "facilities-restroom",
        "airport-restroom-entrance-south",
        "洗手間",
        ["洗手間入口嵌在北側牆面。"],
        64,
        80,
        176,
        68,
        { x: 72, y: 64, width: 160, height: 24 },
        true
      ),
      p(
        "facilities-water",
        "airport-water-dispenser-south",
        "飲水機",
        ["補充水分後再繼續旅程吧。"],
        248,
        80,
        48,
        72,
        { x: 264, y: 64, width: 16, height: 16 }
      ),
      p(
        "facilities-self-order-kiosk",
        "airport-self-order-kiosk",
        "自助點餐機",
        ["螢幕正在輪播餐點與付款方式。"],
        64,
        280,
        56,
        112,
        { x: 80, y: 264, width: 24, height: 16 },
        false,
        false,
        0,
        [
          {
            label: "查看餐點",
            responseLines: ["目前提供麵食、飯食、點心與飲品分類。"]
          },
          {
            label: "開始點餐",
            responseLines: ["完整點餐與付款功能將在餐飲系統階段開放。"]
          },
          { label: "離開", responseLines: ["你離開了點餐畫面。"] }
        ]
      ),
      p(
        "facilities-escalator",
        "airport-escalator-south",
        "手扶梯",
        ["其他樓層尚未開放。"],
        368,
        96,
        112,
        96,
        { x: 384, y: 80, width: 80, height: 32 }
      ),
      p(
        "facilities-planter",
        "airport-planter-north",
        "休息區植栽",
        ["設施區比中央大廳安靜一些。"],
        176,
        296,
        96,
        88,
        { x: 216, y: 280, width: 16, height: 16 }
      ),
      p(
        "facilities-waiting-seats",
        "airport-waiting-seats-horizontal",
        "候機座椅",
        ["座椅旁設有簡易充電位置。"],
        304,
        304,
        176,
        72,
        { x: 312, y: 288, width: 152, height: 16 }
      )
    ],
    npcs: [],
    portals: [
      {
        id: "to-departure-hall",
        x: 16,
        y: 128,
        width: 32,
        height: 96,
        destinationRegionId: "departure-hall",
        destinationSpawnId: "from-facilities"
      }
    ],
    spawns: [{ id: "from-departure-hall", x: 64, y: 176, facing: "right" }]
  }
];

for (const spec of maps) {
  writeFileSync(
    resolve(regionRoot, `${spec.id}.tmj`),
    `${JSON.stringify(makeMap(spec), null, 1)}\n`
  );
}

const centralPath = resolve(regionRoot, "duty-free-central.tmj");
const central = JSON.parse(readFileSync(centralPath, "utf8"));
const centralPortal = central.layers
  .find((entry) => entry.name === "Portals")
  .objects.find(
    (entry) => entry.name === "to-entrance" || entry.name === "to-departure-hall"
  );
if (!centralPortal) {
  throw new Error("duty-free-central is missing its departure hall portal");
}
centralPortal.name = "to-departure-hall";
centralPortal.properties.find((entry) => entry.name === "destinationRegionId").value =
  "departure-hall";
centralPortal.properties.find((entry) => entry.name === "destinationSpawnId").value =
  "from-duty-free";
const centralSpawn = central.layers
  .find((entry) => entry.name === "Spawns")
  .objects.find(
    (entry) => entry.name === "from-entrance" || entry.name === "from-departure-hall"
  );
if (!centralSpawn) {
  throw new Error("duty-free-central is missing its departure hall spawn");
}
centralSpawn.name = "from-departure-hall";
writeFileSync(centralPath, `${JSON.stringify(central, null, 1)}\n`);

console.log(`[departure-maps] generated ${maps.length} maps and updated duty-free-central`);
