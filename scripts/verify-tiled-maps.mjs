import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "public/assets/maps/tiled");
const regionIds = [
  "duty-free-entrance",
  "duty-free-central",
  "shop-beauty-01",
  "shop-liquor-food-01",
  "shop-gift-01"
];
const requiredLayers = [
  "Ground",
  "Accent",
  "Walls",
  "Props",
  "NPCs",
  "Collision",
  "Portals",
  "Spawns"
];
const maps = new Map();
const directionalPropTextures = [
  "airport-planter-south",
  "airport-planter-west",
  "airport-planter-east",
  "airport-planter-north",
  "airport-water-dispenser-south",
  "airport-water-dispenser-west",
  "airport-water-dispenser-east",
  "airport-water-dispenser-north",
  "airport-restroom-entrance-south",
  "airport-restroom-entrance-west",
  "airport-restroom-entrance-east",
  "airport-restroom-entrance-north",
  "airport-escalator-south",
  "airport-escalator-west",
  "airport-escalator-east",
  "airport-escalator-north"
];
const projectNativePropTextures = [
  "checkout-counter-base",
  "checkout-equipment-pos",
  "checkout-items-beauty",
  "checkout-items-liquor-food",
  "checkout-items-gift",
  "beauty-display-base",
  "beauty-products-perfume",
  "beauty-products-skincare",
  "beauty-products-cosmetics",
  "beauty-products-gift-set",
  "liquor-products-whisky",
  "liquor-products-chocolate",
  "food-products-pineapple-cake",
  "liquor-products-mini-tasting",
  "gift-products-keychains",
  "gift-products-neck-pillows",
  "gift-products-postcards",
  "gift-products-organizers"
];
const legacyDirectionalPropTextures = [
  "dutyfree-curved-storefront-south",
  "dutyfree-curved-storefront-west",
  "dutyfree-curved-storefront-east",
  "dutyfree-curved-storefront-north",
  "dutyfree-luxury-storefront-south",
  "dutyfree-luxury-storefront-west",
  "dutyfree-luxury-storefront-east",
  "dutyfree-luxury-storefront-north",
  "dutyfree-display-island-south",
  "dutyfree-display-island-west",
  "dutyfree-display-island-east",
  "dutyfree-display-island-north",
  "dutyfree-display-shelf-south",
  "dutyfree-display-shelf-west",
  "dutyfree-display-shelf-east",
  "dutyfree-display-shelf-north",
  "dutyfree-service-counter-south",
  "dutyfree-service-counter-west",
  "dutyfree-service-counter-east",
  "dutyfree-service-counter-north",
  "dutyfree-shop-doorway-south",
  "dutyfree-shop-doorway-west",
  "dutyfree-shop-doorway-east",
  "dutyfree-shop-doorway-north",
  "airport-digital-map-kiosk-south",
  "airport-digital-map-kiosk-west",
  "airport-digital-map-kiosk-east",
  "airport-digital-map-kiosk-north",
  "airport-sign-pillar-south",
  "airport-sign-pillar-west",
  "airport-sign-pillar-east",
  "airport-sign-pillar-north"
];
const expectedOrientedObjects = {
  "traveler-info-sign": "airport-sign-pillar-east",
  "shopping-guide-sign": "airport-sign-pillar-west",
  "entrance-service-counter": "dutyfree-service-counter-north",
  "entrance-planter": "airport-planter-west",
  "liquor-food-doorway": "dutyfree-curved-storefront-east",
  "gift-doorway": "dutyfree-luxury-storefront-west",
  "left-display-shelf": "dutyfree-display-island-east",
  "right-display-shelf": "dutyfree-display-island-west",
  "central-digital-map": "airport-digital-map-kiosk-east",
  "right-planter": "airport-planter-west",
  "beauty-directory": "airport-digital-map-kiosk-west",
};

function fail(message) {
  console.error(`[tiled:verify] ${message}`);
  process.exit(1);
}

function containsPoint(rect, point) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

for (const file of [
  "EverrichRPG.tiled-project",
  "tilesets/airport-floors.tsj",
  "tilesets/airport-props.tsj",
  "tilesets/airport-npcs.tsj"
]) {
  if (!existsSync(resolve(root, file))) fail(`Missing ${file}`);
}

const propTileset = JSON.parse(readFileSync(resolve(root, "tilesets/airport-props.tsj"), "utf8"));
const propTilesetTextures = new Set(
  propTileset.tiles.map((tile) => tile.properties.find((property) => property.name === "texture")?.value)
);
for (const texture of projectNativePropTextures) {
  if (!propTilesetTextures.has(texture)) fail(`airport-props.tsj is missing ${texture}`);
}
for (const texture of directionalPropTextures) {
  if (!propTilesetTextures.has(texture)) fail(`airport-props.tsj is missing ${texture}`);
  const fileName = texture.replace("airport-", "");
  const assetPath = resolve(root, "../../props/airport-directional-v1", `${fileName}.png`);
  if (!existsSync(assetPath)) fail(`Missing directional prop asset ${fileName}.png`);
}
for (const texture of legacyDirectionalPropTextures) {
  if (!propTilesetTextures.has(texture)) fail(`airport-props.tsj is missing ${texture}`);
  const assetPath = resolve(root, "../../props/legacy-directional-v1", `${texture}.png`);
  if (!existsSync(assetPath)) fail(`Missing legacy directional prop asset ${texture}.png`);
}

for (const regionId of regionIds) {
  const path = resolve(root, "regions", `${regionId}.tmj`);
  if (!existsSync(path)) fail(`Missing map ${regionId}`);
  const map = JSON.parse(readFileSync(path, "utf8"));
  maps.set(regionId, map);
  if (map.tilewidth !== 16 || map.tileheight !== 16) fail(`${regionId} must use 16x16 tiles`);
  for (const layerName of requiredLayers) {
    if (!map.layers.some((layer) => layer.name === layerName)) {
      fail(`${regionId} is missing layer ${layerName}`);
    }
  }
  const layerByName = new Map(map.layers.map((layer) => [layer.name, layer]));
  for (const layerName of ["Ground", "Walls", "Props", "NPCs", "Portals", "Spawns"]) {
    const layer = layerByName.get(layerName);
    if (layer.opacity === 0) fail(`${regionId}/${layerName} opacity must not be 0`);
    if (layer.visible === false) fail(`${regionId}/${layerName} must be visible`);
  }
  const accent = layerByName.get("Accent");
  if (accent.opacity === 0) fail(`${regionId}/Accent opacity must not be 0`);
  const collisionLayer = layerByName.get("Collision");
  if (collisionLayer.opacity === 0) fail(`${regionId}/Collision opacity must not be 0`);
  if (collisionLayer.visible !== false) fail(`${regionId}/Collision must be hidden by default`);

  const objectNames = new Set();
  for (const layer of map.layers.filter((candidate) => candidate.type === "objectgroup")) {
    for (const object of layer.objects) {
      if (!object.name) fail(`${regionId}/${layer.name} contains an unnamed object`);
      if (objectNames.has(object.name)) fail(`${regionId} has duplicate object name ${object.name}`);
      objectNames.add(object.name);
    }
  }
  const ground = map.layers.find((layer) => layer.name === "Ground");
  if (ground.data.length !== map.width * map.height) fail(`${regionId} Ground size is invalid`);
  if (map.layers.find((layer) => layer.name === "Spawns").objects.length === 0) {
    fail(`${regionId} needs at least one spawn`);
  }
  const spawns = map.layers.find((layer) => layer.name === "Spawns").objects;
  const blockers = [
    ...map.layers.find((layer) => layer.name === "Walls").objects,
    ...map.layers.find((layer) => layer.name === "Collision").objects
  ];
  for (const spawn of spawns) {
    const blocker = blockers.find((candidate) => containsPoint(candidate, spawn));
    if (blocker) {
      fail(`${regionId}/${spawn.name} overlaps blocker ${blocker.name}`);
    }
  }
}

for (const [regionId, map] of maps) {
  const portals = map.layers.find((layer) => layer.name === "Portals").objects;
  for (const portal of portals) {
    const properties = Object.fromEntries(portal.properties.map((property) => [property.name, property.value]));
    const destination = maps.get(properties.destinationRegionId);
    if (!destination) fail(`${regionId}/${portal.name} has unknown destination`);
    const spawns = destination.layers.find((layer) => layer.name === "Spawns").objects;
    if (!spawns.some((spawn) => spawn.name === properties.destinationSpawnId)) {
      fail(`${regionId}/${portal.name} has unknown destination spawn`);
    }
  }
  const props = map.layers.find((layer) => layer.name === "Props").objects;
  for (const object of props) {
    const expectedTexture = expectedOrientedObjects[object.name];
    if (!expectedTexture) continue;
    const actualTexture = object.properties.find((property) => property.name === "texture")?.value;
    if (actualTexture !== expectedTexture) {
      fail(`${regionId}/${object.name} should face the aisle with ${expectedTexture}`);
    }
  }
  const npcs = map.layers.find((layer) => layer.name === "NPCs").objects;
  for (const npc of npcs) {
    const properties = Object.fromEntries(
      npc.properties.map((property) => [property.name, property.value])
    );
    if (!["idle", "wander", "patrol"].includes(properties.movementType)) {
      fail(`${regionId}/${npc.name} has invalid movementType`);
    }
    if (!["up", "down", "left", "right"].includes(properties.facing)) {
      fail(`${regionId}/${npc.name} has invalid facing`);
    }
    if (typeof properties.speed !== "number" || properties.speed < 0) {
      fail(`${regionId}/${npc.name} has invalid speed`);
    }
    if (typeof properties.animationKey !== "string" || properties.animationKey.length === 0) {
      fail(`${regionId}/${npc.name} is missing animationKey`);
    }
  }
}

const centralPortals = maps
  .get("duty-free-central")
  .layers.find((layer) => layer.name === "Portals")
  .objects.map((portal) => portal.name);
for (const portalId of ["to-beauty-corridor", "to-liquor-food", "to-gift"]) {
  if (!centralPortals.includes(portalId)) fail(`duty-free-central is missing ${portalId}`);
}

const centralPortalObjects = maps
  .get("duty-free-central")
  .layers.find((layer) => layer.name === "Portals")
  .objects;
const expectedSideEntrances = {
  "to-liquor-food": { x: 192, y: 208, width: 48, height: 80 },
  "to-gift": { x: 528, y: 208, width: 48, height: 80 }
};
for (const [portalId, expectedBounds] of Object.entries(expectedSideEntrances)) {
  const portal = centralPortalObjects.find((candidate) => candidate.name === portalId);
  if (
    !portal ||
    portal.x !== expectedBounds.x ||
    portal.y !== expectedBounds.y ||
    portal.width !== expectedBounds.width ||
    portal.height !== expectedBounds.height
  ) {
    fail(`duty-free-central/${portalId} is not aligned to its side-facing entrance`);
  }
}

const entranceStart = maps
  .get("duty-free-entrance")
  .layers.find((layer) => layer.name === "Spawns")
  .objects.find((spawn) => spawn.name === "start");
if (!entranceStart || entranceStart.x !== 320 || entranceStart.y !== 352) {
  fail("duty-free-entrance/start must remain at the safe centered starting position");
}

const expectedShopObjects = {
  "shop-beauty-01": [
    "beauty-checkout-counter",
    "beauty-checkout-equipment",
    "beauty-checkout-items",
    "beauty-left-island-top",
    "beauty-right-island-top",
    "beauty-left-island-bottom",
    "beauty-right-island-bottom",
    "beauty-left-island-top-merchandise",
    "beauty-right-island-top-merchandise",
    "beauty-left-island-bottom-merchandise",
    "beauty-right-island-bottom-merchandise"
  ],
  "shop-liquor-food-01": [
    "liquor-checkout-counter",
    "liquor-checkout-equipment",
    "liquor-checkout-items",
    "liquor-left-island-top",
    "liquor-right-island-top",
    "liquor-left-island-bottom",
    "liquor-right-island-bottom",
    "liquor-left-island-top-merchandise",
    "liquor-right-island-top-merchandise",
    "liquor-left-island-bottom-merchandise",
    "liquor-right-island-bottom-merchandise"
  ],
  "shop-gift-01": [
    "gift-checkout-counter",
    "gift-checkout-equipment",
    "gift-checkout-items",
    "gift-left-island-top",
    "gift-right-island-top",
    "gift-left-island-bottom",
    "gift-right-island-bottom",
    "gift-left-island-top-merchandise",
    "gift-right-island-top-merchandise",
    "gift-left-island-bottom-merchandise",
    "gift-right-island-bottom-merchandise"
  ]
};

const expectedShopVisuals = {
  "shop-beauty-01": {
    checkoutId: "beauty-checkout-counter",
    checkoutTexture: "checkout-counter-base",
    checkoutEquipment: ["beauty-checkout-equipment", "checkout-equipment-pos"],
    checkoutItems: ["beauty-checkout-items", "checkout-items-beauty"],
    merchandise: [
      ["beauty-left-island-top-merchandise", "beauty-products-perfume"],
      ["beauty-right-island-top-merchandise", "beauty-products-skincare"],
      ["beauty-left-island-bottom-merchandise", "beauty-products-cosmetics"],
      ["beauty-right-island-bottom-merchandise", "beauty-products-gift-set"]
    ]
  },
  "shop-liquor-food-01": {
    checkoutId: "liquor-checkout-counter",
    checkoutTexture: "checkout-counter-base",
    checkoutEquipment: ["liquor-checkout-equipment", "checkout-equipment-pos"],
    checkoutItems: ["liquor-checkout-items", "checkout-items-liquor-food"],
    merchandise: [
      ["liquor-left-island-top-merchandise", "liquor-products-whisky"],
      ["liquor-right-island-top-merchandise", "liquor-products-chocolate"],
      ["liquor-left-island-bottom-merchandise", "food-products-pineapple-cake"],
      ["liquor-right-island-bottom-merchandise", "liquor-products-mini-tasting"]
    ]
  },
  "shop-gift-01": {
    checkoutId: "gift-checkout-counter",
    checkoutTexture: "checkout-counter-base",
    checkoutEquipment: ["gift-checkout-equipment", "checkout-equipment-pos"],
    checkoutItems: ["gift-checkout-items", "checkout-items-gift"],
    merchandise: [
      ["gift-left-island-top-merchandise", "gift-products-keychains"],
      ["gift-right-island-top-merchandise", "gift-products-neck-pillows"],
      ["gift-left-island-bottom-merchandise", "gift-products-postcards"],
      ["gift-right-island-bottom-merchandise", "gift-products-organizers"]
    ]
  }
};

for (const [shopId, objectIds] of Object.entries(expectedShopObjects)) {
  const shopMap = maps.get(shopId);
  if (shopMap.width !== 30 || shopMap.height !== 20) {
    fail(`${shopId} must use the one-screen 30x20 interior layout`);
  }
  const merchandiseLayer = shopMap.layers.find((layer) => layer.name === "Merchandise");
  if (!merchandiseLayer) fail(`${shopId} is missing the Merchandise layer`);
  const props = [
    ...shopMap.layers.find((layer) => layer.name === "Props").objects,
    ...(merchandiseLayer?.objects ?? [])
  ].map((object) => object.name);
  for (const objectId of objectIds) {
    if (!props.includes(objectId)) fail(`${shopId} is missing product display ${objectId}`);
  }
  const visualSpec = expectedShopVisuals[shopId];
  if (visualSpec) {
    const checkoutCounter = shopMap.layers
      .find((layer) => layer.name === "Props")
      .objects.find((object) => object.name === visualSpec.checkoutId);
    const texture = checkoutCounter?.properties?.find(
      (property) => property.name === "texture"
    )?.value;
    if (
      !checkoutCounter ||
      texture !== visualSpec.checkoutTexture ||
      checkoutCounter.width !== 192
    ) {
      fail(`${shopId} checkout counter must use the shared compact 192px base`);
    }
    const shopProps = [
      ...shopMap.layers.find((layer) => layer.name === "Props").objects,
      ...shopMap.layers.find((layer) => layer.name === "Merchandise").objects
    ];
    for (const [objectId, textureName] of [
      visualSpec.checkoutEquipment,
      visualSpec.checkoutItems
    ]) {
      const object = shopProps.find((candidate) => candidate.name === objectId);
      const properties = new Map(
        object?.properties?.map((property) => [property.name, property.value]) ?? []
      );
      if (
        !object ||
        properties.get("texture") !== textureName ||
        properties.get("decorative") !== true
      ) {
        fail(`${objectId} must be a decorative checkout overlay using ${textureName}`);
      }
      const isEquipment = objectId.endsWith("-checkout-equipment");
      const expectedCenterX = isEquipment ? 260 : 184;
      const expectedY = isEquipment ? 52.8 : 52;
      const expectedDepthOffset = isEquipment ? 54 : 55;
      if (
        object.x + object.width / 2 !== expectedCenterX ||
        Math.abs(object.y - expectedY) > 0.01 ||
        properties.get("depthOffset") !== expectedDepthOffset
      ) {
        fail(`${objectId} must stay aligned above the shared checkout counter surface`);
      }
    }
    for (const [objectId, textureName] of visualSpec.merchandise) {
      const object = shopProps.find((candidate) => candidate.name === objectId);
      const properties = new Map(
        object?.properties?.map((property) => [property.name, property.value]) ?? []
      );
      if (
        !object ||
        properties.get("texture") !== textureName ||
        properties.get("decorative") !== true
      ) {
        fail(`${objectId} must be a decorative merchandise overlay using ${textureName}`);
      }
    }
  }
}

for (const shopId of Object.keys(expectedShopObjects)) {
  const npcs = maps
    .get(shopId)
    .layers.find((layer) => layer.name === "NPCs")
    .objects;
  if (npcs.length !== 1) fail(`${shopId} must contain exactly one clerk NPC`);
  const portal = maps
    .get(shopId)
    .layers.find((layer) => layer.name === "Portals")
    .objects.find((candidate) => candidate.name === "to-central");
  if (
    !portal ||
    portal.x !== 208 ||
    portal.y !== 288 ||
    portal.width !== 64 ||
    portal.height !== 32
  ) {
    fail(`${shopId}/to-central must align with the compact interior exit`);
  }
}

console.log(`[tiled:verify] OK (${regionIds.length} maps)`);
